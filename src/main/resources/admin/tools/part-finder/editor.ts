import { getUser as getAuthUser } from "/lib/xp/auth";
import { Results } from "/admin/tools/part-finder/results";
import { find, findIndex } from "/lib/part-finder/utils";
import { LAYOUT_KEY } from "/admin/tools/part-finder/part-finder";

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

const replaceChangedComponentsInClone = (componentPath, changedComponents, clonedContentItem) => {
  const newComponent = changedComponents[componentPath];

  const index = findIndex<{ path: string }>(clonedContentItem.components || [], (comp) => comp.path === componentPath);
  if (index === -1) {
    throw Error(
      `Replacement component with path '${componentPath}', but no matching path was found in the cloned content item`,
    );
  }
  // Replace component in the same place
  clonedContentItem.components[index] = newComponent;
};

const changeOrCopyIndexConfig = (
  currentOrigConfig,
  newIndexConfigs,
  origIndexConfigs,
  preserveSomeComponentPaths,
  configSearchPattern,
  configReplacePattern,
  configReplaceTarget,
) => {
  if ((currentOrigConfig?.path || "").match(configSearchPattern)) {
    const newPath = currentOrigConfig.path.replace(configReplacePattern, configReplaceTarget);

    const alreadyPresent = find<{ path: string }>(origIndexConfigs, (config) => config.path === newPath);
    if (!alreadyPresent) {
      // Spread avoids mutation
      const newConfig = {
        ...currentOrigConfig,
        path: newPath,
      };
      newIndexConfigs.push(newConfig);
    }

    if (preserveSomeComponentPaths) {
      // To preserve (copy, not overwrite), keep the original
      newIndexConfigs.push(currentOrigConfig);
    }
  } else {
    // If no match, keep the original:
    newIndexConfigs.push(currentOrigConfig);
  }
};

const componentMatchesTarget = (component, targetComponentType, oldDescriptor, targetComponentPath) =>
  component.type === targetComponentType &&
  (component[targetComponentType] || {}).descriptor === oldDescriptor &&
  component.path === targetComponentPath;

// By now, established a match: component type, descriptor and path matches the target.
// So deep-clone the component data to avoid mutation, and add the clone to the collection of data to store later,
// with path as key
const cloneAndMarkForStorage = (
  component,
  targetComponentType,
  oldAppKeyDashed,
  oldComponentKey,
  newAppKey,
  newAppKeyDashed,
  newComponentKey,
  changedComponents,

  // TODO: REMOVE THIS ARG WHEN layoutDefault MIGRATION IS DONE:
  migrateSelectedLayoutConfig,
) => {
  const componentClone = {
    ...component,
    [targetComponentType]: {
      ...component[targetComponentType],
      descriptor: `${newAppKey}:${newComponentKey}`,
      config: {
        ...component[targetComponentType].config,
        [newAppKeyDashed]: {
          ...component[targetComponentType].config[oldAppKeyDashed],
          [newComponentKey]: component[targetComponentType].config[oldAppKeyDashed][oldComponentKey],
        },
      },
    },
  };

  if (oldAppKeyDashed !== newAppKeyDashed) {
    delete componentClone[targetComponentType].config[oldAppKeyDashed];
  }
  if (oldComponentKey !== newComponentKey) {
    delete componentClone[targetComponentType].config[newAppKeyDashed][oldComponentKey];
  }

  // TODO: REMOVE WHEN layoutDefault MIGRATION IS DONE - FROM HERE...
  const layoutConfig = {
    ...(((componentClone[targetComponentType].config || {})[newAppKeyDashed] || {})[newComponentKey] || {}),
  };
  if (
    migrateSelectedLayoutConfig &&
    Object.keys(layoutConfig).length &&
    layoutConfig.layout?._selected &&
    layoutConfig.layout[layoutConfig.layout._selected]
  ) {
    log.info(
      `    Also migrating ${targetComponentType}'s config.layout['${layoutConfig.layout._selected}'] down to .config`,
    );
    for (const key in layoutConfig.layout[layoutConfig.layout._selected]) {
      layoutConfig[key] = layoutConfig.layout[layoutConfig.layout._selected][key];
    }
    delete layoutConfig.layout[layoutConfig.layout._selected];
    delete layoutConfig.layout._selected;

    componentClone[targetComponentType].config[newAppKeyDashed][newComponentKey] = layoutConfig;
  }
  // TODO: ...TO HERE.

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
    let lastTargetedComponentPath: string | null = null;

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
                  (component[targetComponentType] || {}).descriptor === oldDescriptor &&
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
          lastTargetedComponentPath = verifyAndGetCompPath(component);

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
              component.type === LAYOUT_KEY.toLowerCase(),
            );
          }

          lastTargetedComponentPath = null;
        }
      });

      verifyAllChangesWereMade(changedComponents, componentPathsPerId[id]);

      const origIndexConfigs = contentItem?._indexConfig?.configs || [];
      for (const currentOrigConfig of origIndexConfigs) {
        lastTargetedComponentPath = currentOrigConfig.path + " (config path)";

        changeOrCopyIndexConfig(
          currentOrigConfig,
          newIndexConfigs,
          origIndexConfigs,
          preserveSomeComponentPaths,
          configSearchPattern,
          configReplacePattern,
          configReplaceTarget,
        );
      }

      lastTargetedComponentPath = null;
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
        lastTargetedComponentPath = componentPath;

        replaceChangedComponentsInClone(componentPath, changedComponents, clonedContentItem);
        results.reportSuccess(contentItem, componentPath);
      }

      return clonedContentItem;
    } catch (e) {
      results.markError(contentItem, lastTargetedComponentPath, e);

      return contentItem;
    }
  };

  return editor;
};
