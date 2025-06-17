import {getUser as getAuthUser} from "/lib/xp/auth";
import {Results} from "/admin/tools/part-finder/results";
import {find, findIndex} from "/lib/part-finder/utils";
import clone from "../../../../../../../node_modules/just-clone";

import {logger} from "./postprocessors/logger";
import {throwerror} from "./postprocessors/throwerror";
import {cardFullwidth} from "./postprocessors/cardFullwidth";
import {layoutNColumns} from "./postprocessors/layout-n-columns";
import {
  ContentitemMutatingPostprocessorFunc,
} from "/admin/tools/part-finder/editor/postprocessors";

import {Node, ModifiedNode, NodeConfigEntry} from '@enonic-types/lib-node'
import {Content, Component} from '@enonic-types/lib-content';


type RequestedProcessor = {
  label: string,
  func: ContentitemMutatingPostprocessorFunc
}

type IndexConfigEntry = {
  path: string;
  config: NodeConfigEntry
}

export type ContentItem = Content & {
  components: Component[];
  _indexConfig?: {
    configs: IndexConfigEntry[];
  };
};


// Available postprocessors:
// key in this object:  processor names, available to refer to from URL parameter, eg: ...?postprocess=logger
// value:               postprocessor function, must have the signature ((contentItem, changedComponentPaths?) -> contentItem)
const POSTPROCESSORS: { [callableName: string]: ContentitemMutatingPostprocessorFunc } = {
  logger,
  throwerror,
  cardfullwidth: cardFullwidth,
  "card-fullwidth": cardFullwidth,
  fullwidthcard: cardFullwidth,
  layoutcolumns: layoutNColumns,
  layoutncolumns: layoutNColumns,
  "layout-n-columns": layoutNColumns,
};

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
  currentOrigConfig: IndexConfigEntry,
  newIndexConfigs: IndexConfigEntry[],
  origIndexConfigs: IndexConfigEntry[],
  preserveSomeComponentPaths: boolean,
  configSearchPattern: RegExp,
  configReplacePattern: RegExp,
  configReplaceTarget: string,
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

const componentMatchesTarget = (
  component: Component,
  targetComponentType: string,
  oldDescriptor: string,
  targetComponentPath: string
) => (
  component.type === targetComponentType &&
  (component[targetComponentType] || {}).descriptor === oldDescriptor &&
  component.path === targetComponentPath
)

// By now, established a match: component type, descriptor and path matches the target.
// So deep-clone the component data to avoid mutation, and add the clone to the collection of data to store later,
// with path as key
const cloneAndMarkForStorage = (
  component: Component,
  targetComponentType,
  oldAppKeyDashed,
  oldComponentKey,
  newAppKey,
  newAppKeyDashed,
  newComponentKey,
  changedComponents
) => {
  if (!component.path) {
    throw Error("Component without path: " + JSON.stringify(component));
  }

  const componentConfig = component[targetComponentType].config || {};
  const componentConfigOldData = componentConfig[oldAppKeyDashed] || {};
  const componentClone = {
    ...component,
    [targetComponentType]: {
      ...component[targetComponentType],
      descriptor: `${newAppKey}:${newComponentKey}`,
      config: {
        ...componentConfig,
        [newAppKeyDashed]: {
          ...componentConfigOldData,
          [newComponentKey]: componentConfigOldData[oldComponentKey],
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
  changedComponents[component.path] = componentClone;
};

export function createEditorFunc<D = any>(
  oldAppKey: string,
  oldComponentKey: string,
  newAppKey: string,
  newComponentKey: string,
  targetComponentType: string,
  results: Results,
  componentPathsPerId: Record<string, string[] | null>,
  duplicate: boolean,
  requestedPostprocessors?: string[] | string,
): (contentItem: Node<ContentItem>) => ModifiedNode<ContentItem> {
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
  const editor = (contentItem: Node<ContentItem>): ModifiedNode<ContentItem> => {
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
    const newIndexConfigs: IndexConfigEntry[] = [];
    let lastTargetedComponentPath: string | null = null;

    const id = contentItem?._id || "###MISSING###";

    try {
      const components = contentItem?.components || [];

      // List either selected paths to target, or if none are specifically targeted: all available component paths
      const targetComponentPaths: string[]  =
        componentPathsPerId[id] !== null
          ? componentPathsPerId[id]
          : components
            .map(
              (component) =>
                component.type === targetComponentType &&
                (component[targetComponentType] || {}).descriptor === oldDescriptor &&
                component?.path,
            )
            .filter((path) => !!path) as string[];

      const preserveSomeComponentPaths = duplicate || detectCompPathPreservation(
        contentItem,
        oldDescriptor,
        targetComponentType,
        targetComponentPaths,
      );

      components.forEach((component: Component) => {
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
              changedComponents
            );
          }

          lastTargetedComponentPath = null;
        }
      });

      verifyAllChangesWereMade(changedComponents, componentPathsPerId[id]);

      const origIndexConfigs: IndexConfigEntry[] = contentItem?._indexConfig?.configs || [];
      for (const currentIndexConfig of origIndexConfigs) {
        lastTargetedComponentPath = currentIndexConfig.path + " (config path)";

        changeOrCopyIndexConfig(
          currentIndexConfig,
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
      const clonedContentItem = clone(contentItem);
      if (newIndexConfigs.length) {
        clonedContentItem._indexConfig.configs = newIndexConfigs;
      }

      const changedComponentPaths: string[] = [];
      for (const componentPath in changedComponents) {
        changedComponentPaths.push(componentPath);
        lastTargetedComponentPath = componentPath;

        replaceChangedComponentsInClone(componentPath, changedComponents, clonedContentItem);
        results.reportSuccess(clonedContentItem, componentPath);
      }

      if (!requestedPostprocessors) {
        return clonedContentItem;
      } else {
        if (!Array.isArray(requestedPostprocessors)) {
          requestedPostprocessors = [requestedPostprocessors];
        }
        const requestedPostProcessors: RequestedProcessor[] = requestedPostprocessors.map((processorLabel) => {
          const processorFunc = POSTPROCESSORS[processorLabel];
          if (!processorFunc) {
            throw Error(`Postprocessor not found: '${processorLabel}'`);
          }

          return {
            label: processorLabel,
            func: processorFunc,
          };
        });

        requestedPostProcessors.forEach(processor => {
          const {label, func} = processor;
          try {
            func(clonedContentItem, changedComponentPaths, targetComponentType, newAppKeyDashed, newComponentKey)
          } catch (e) {
            log.warning(`Error while trying to apply postprocessor '${label}' to the following data/arguments: ${JSON.stringify({
              clonedContentItem,
              changedComponentPaths,
              targetComponentType,
              newAppKeyDashed,
              newComponentKey
            })}`);
            throw e
          }
        });

        return clonedContentItem;
      }
    } catch (e) {
      results.markError(contentItem, lastTargetedComponentPath, e);

      return contentItem;
    }
  };

  return editor;
};
