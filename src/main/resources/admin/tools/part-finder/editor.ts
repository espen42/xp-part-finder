import { getUser as getAuthUser } from "/lib/xp/auth";
import { Results } from "/admin/tools/part-finder/results";
import { findIndex } from "/lib/part-finder/utils";

// If a content has multiple usages of a component, and not all of those components are targeted for change here, then
// the indexConfig of that component should be copied instead of renamed, in order to retain the
// information for the component instances that still use the old one.
const detectCompPathPreservation = (contentItem, targetKey, targetComponentType, targetComponentPaths) => {
  const untargetedPaths =
    !targetComponentPaths || !targetComponentPaths.length || !targetComponentPaths[0]
      ? []
      : contentItem.components
          .map((component) => {
            if (
              component != null &&
              component.type === targetComponentType &&
              (component[targetComponentType] || {}).descriptor === targetKey &&
              targetComponentPaths.indexOf(component.path) === -1
            ) {
              return component.path;
            }
            return null;
          })
          .filter((componentPath) => componentPath);

  log.info(
    untargetedPaths.length > 0
      ? `Changing ${targetComponentType}(s) ('${targetKey}') on content ${contentItem._path} but leaving it unchanged on path(s): ${JSON.stringify(untargetedPaths)}`
      : `Changing all ${targetComponentType}(s) ('${targetKey}') on content ${contentItem._path}`,
  );

  return untargetedPaths.length > 0;
};

// Deep spread: new object, avoid mutation
const cloneAndMoveComp = (
  component,
  oldComponentType,
  oldAppKeyDashed,
  oldComponentKey,
  newAppKey,
  newAppKeyDashed,
  newComponentKey,
) => {
  const componentClone = {
    ...component,
    [oldComponentType]: {
      ...component[oldComponentType],
      descriptor: `${newAppKey}:${newComponentKey}`,
      config: {
        ...component[oldComponentType].config,
        [newAppKeyDashed]: {
          ...component[oldComponentType].config[oldAppKeyDashed],
          [newComponentKey]: component[oldComponentType].config[oldAppKeyDashed][oldComponentKey],
        },
      },
    },
  };
  if (oldAppKeyDashed !== newAppKeyDashed) {
    delete componentClone[oldComponentType].config[oldAppKeyDashed];
  }
  if (oldComponentKey !== newComponentKey) {
    delete componentClone[oldComponentType].config[newAppKeyDashed][oldComponentKey];
  }

  return componentClone;
};

const verifyAllChangesWereMade = (changedComponents, requestedComponentPaths) => {
  const changesMade = Object.keys(changedComponents).length;

  if (
    !changesMade ||
    // If null, no specific paths were requested and all matched components should have been changed
    (requestedComponentPaths !== null && requestedComponentPaths.length > changesMade)
  ) {
    log.warning(
      `Missing change request(s): ${JSON.stringify(
        (requestedComponentPaths || []).filter((path) => !!changedComponents[path]),
      )}`,
    );
    throw Error("Not all requested changes were made.");
  }
};

const verifyAndGetCompPath = (component): string => {
  if (!component?.path) {
    log.warning("Component without path: " + JSON.stringify(component));
    throw Error("Couldn't resolve path in a component");
  }
  return component?.path;
};

const changeOrCopyIndexConfig = (
  config,
  newIndexConfigs,
  preserveSomeComponentPaths,
  configSearchPattern,
  configReplacePattern,
  configReplaceTarget,
) => {
  if ((config?.path || "").match(configSearchPattern)) {
    const newPath = config.path.replace(configReplacePattern, configReplaceTarget);

    // To preserve, keep the original (copy, not overwrite)
    if (preserveSomeComponentPaths) {
      newIndexConfigs.push(config);
    }

    // TODO: Only add newConfig if a corresponding config is not already present!
    const newConfig = {
      // Spread avoids mutation
      ...config,
      path: newPath,
    };
    newIndexConfigs.push(newConfig);
  } else {
    newIndexConfigs.push(config);
  }
};

const componentMatchesTarget = (component, targetComponentType, oldDescriptor, targetComponentPath) =>
  component.type === targetComponentType &&
  component[targetComponentType].descriptor === oldDescriptor &&
  component.path === targetComponentPath;

const cloneAndMarkForStorage = (
  // By now, established a match: component type, descriptor and path matches the target.
  // So clone the component data (to avoid mutation) and add the clone to the collection of data to store later,
  // with path as key:
  component,
  targetComponentType,
  oldAppKeyDashed,
  oldComponentKey,
  newAppKey,
  newAppKeyDashed,
  newComponentKey,
  changedComponents,
) => {
  const componentClone = cloneAndMoveComp(
    component,
    targetComponentType,
    oldAppKeyDashed,
    oldComponentKey,
    newAppKey,
    newAppKeyDashed,
    newComponentKey,
  );

  changedComponents[component.path] = componentClone;
};

export const createEditorFunc = (
  oldAppKey: string,
  oldComponentKey: string,
  newAppKey: string,
  newComponentKey: string,
  targetComponentType: string,
  results: Results,
  componentPathsPerId: Record<string, string[] | null>,
) => {
  const oldAppKeyDashed = oldAppKey.replace(/\./g, "-");
  const newAppKeyDashed = newAppKey.replace(/\./g, "-");

  const oldDescriptor = `${oldAppKey}:${oldComponentKey}`;
  const pathPatternString =
    "components\\." + targetComponentType + "\\.config\\." + oldAppKeyDashed + "\\." + oldComponentKey;

  // Looks for "components.<componentType>.config.<oldAppKeyDashed>.<oldComponentKey>" or "components.<componentType>.config.<oldAppKeyDashed>.<oldComponentKey>.<something more whatever>"
  // but not "components.<componentType>.config.<oldAppKeyDashed>.<key that starts with oldComponentKey but continues before the dot or end>" or "components.<componentType>.config.<oldAppKeyDashed>.<oldComponentKey>.." etc:
  const configSearchPattern = new RegExp("^" + pathPatternString + "($|\\.(?!\\.|$))");
  const configReplacePattern = new RegExp("^(" + pathPatternString + "\\b)");
  const configReplaceTarget =
    "components." + targetComponentType + ".config." + newAppKeyDashed + "." + newComponentKey;

  const user = getAuthUser();
  if (!user?.key) {
    throw Error("Couldn't resolve user.key: " + JSON.stringify(user));
  }

  // IMPORTANT!
  // Take care to avoid indirect mutation of 'contentItem'! Don't mutate subobjects and arrays that are read from below
  // the 'contentItem' object ( eg. contentItem?._indexConfig?.configs[i].config ).
  //
  // The goal is an atomic data update so we avoid storing half-baked data: the updated data
  // is not inserted into contentItem until right before it's returned at the end, so that all operations are successful
  // before any data is actually changed - .
  //
  // 1. Read out data from below contentItem,
  // 2. write to / perform operations on new and intermediate objects/arrays,
  // 3. only when everything's completed successfully the intermediate objects/arrays overwrite data in contentItem.
  //
  // On errors, report the error and return the original contentItem unchanged.
  const editor = (contentItem) => {
    /*
    Example component structure in a content: {
    "type": "layout",
    "path": "/main/0",
    "layout": {
      "descriptor": "no.posten.website:layoutDefault",
      "config": {
        "no-posten-website": {
          "layoutDefault": {
            "layout": {
              "two": {
                "distribution": "2-1",
                "isFlex": false
              },
              "_selected": "two"
            },
            "marginTop": true,
            "marginBottom": false
          } */

    const changedComponents: { [path: string]: { path: string } } = {};
    const newIndexConfigs: object[] = [];
    let currentComponentPath: string | null = null;

    const id = contentItem?._id;

    try {
      // List either selected paths to target, or if none are specifically targeted: all available component paths
      const targetComponentPaths =
        componentPathsPerId[id] !== null
          ? componentPathsPerId[id]
          : (contentItem?.components || [])
              .map(
                (component) =>
                  component.type === targetComponentType &&
                  component[targetComponentType].descriptor === oldDescriptor &&
                  component?.path,
              )
              .filter((path) => !!path);

      const preserveSomeComponentPaths = detectCompPathPreservation(
        contentItem,
        oldDescriptor,
        targetComponentType,
        targetComponentPaths,
      );

      contentItem.components.forEach((component) => {
        for (const targetComponentPath of targetComponentPaths) {
          currentComponentPath = verifyAndGetCompPath(component);

          if (componentMatchesTarget(component, targetComponentType, oldDescriptor, targetComponentPath)) {
            cloneAndMarkForStorage(
              component,
              targetComponentType,
              oldAppKeyDashed,
              oldComponentKey,
              newAppKey,
              newAppKeyDashed,
              newComponentKey,
              changedComponents,
            );
          }

          currentComponentPath = null;
        }
      });

      verifyAllChangesWereMade(changedComponents, componentPathsPerId[id]);

      for (const config of contentItem?._indexConfig?.configs || []) {
        currentComponentPath = config.path + " (config path)";

        changeOrCopyIndexConfig(
          config,
          newIndexConfigs,
          preserveSomeComponentPaths,
          configSearchPattern,
          configReplacePattern,
          configReplaceTarget,
        );
      }
      currentComponentPath = null;

      // Deep-clone the current content item, inject the updated data into it
      // (overwriting existing keys), and return the clone:
      const clonedContentItem = {
        ...contentItem,
        components: [...contentItem.components],
        _indexConfig: { ...contentItem._indexConfig },
      };

      if (newIndexConfigs.length) {
        clonedContentItem._indexConfig.configs = newIndexConfigs;
      }

      for (const componentPath in changedComponents) {
        currentComponentPath = componentPath;
        const newComponent = changedComponents[componentPath];

        const index = findIndex<{ path: string }>(
          clonedContentItem.components || [],
          (comp) => comp.path === componentPath,
        );
        if (index === -1) {
          throw Error(
            "Replacement component with path '" + componentPath + "', but no matching path was found in newContentItem",
          );
        }
        // Replace component in the same place
        clonedContentItem.components[index] = newComponent;

        results.reportSuccess(contentItem, componentPath);
      }

      return clonedContentItem;
    } catch (e) {
      results.markError(contentItem, currentComponentPath, e);

      return contentItem;
    }
  };

  return editor;
};
