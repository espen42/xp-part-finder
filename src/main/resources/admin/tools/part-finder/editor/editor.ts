import { getUser as getAuthUser } from "/lib/xp/auth";
import { Results } from "/admin/tools/part-finder/editor/utils/results";
import { find } from "/lib/part-finder/utils";
import clone from "../../../../../../../node_modules/just-clone";
import { ContentitemMutatingPostprocessorFunc, POSTPROCESSORS } from "/admin/tools/part-finder/editor/postprocessors";

import { Node, ModifiedNode, NodeConfigEntry } from "@enonic-types/lib-node";
import { Content, Component } from "@enonic-types/lib-content";
import {
  sortComponentPathsDescending,
  contentRegionMutators,
} from "/admin/tools/part-finder/editor/utils/regionEditing";

type ComponentPostProcessor = {
  label: string;
  func: ContentitemMutatingPostprocessorFunc;
};

type IndexConfigEntry = {
  path: string;
  config: NodeConfigEntry;
};

export type ContentItem = Content & {
  components: Component[];
  _indexConfig?: {
    configs: IndexConfigEntry[];
  };
};

const verifyAllChangesWereMade = (newComponents, requestedComponentPaths) => {
  const changesMade = Object.keys(newComponents).length;

  if (
    !changesMade ||
    // If null, no specific paths were requested and all matched components should have been changed
    (requestedComponentPaths !== null && requestedComponentPaths.length > changesMade)
  ) {
    log.warning(
      `Missing change request(s): ${JSON.stringify(
        (requestedComponentPaths || []).filter((path) => !!newComponents[path]),
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

const addIndexConfig = (
  currentOrigConfig: IndexConfigEntry,
  newIndexConfigs: IndexConfigEntry[],
  origIndexConfigs: IndexConfigEntry[],
  configSearchPattern: RegExp,
  configReplacePattern: RegExp,
  configReplaceTarget: string,
) => {
  if ((currentOrigConfig?.path || "").match(configSearchPattern)) {
    const newPath = currentOrigConfig.path.replace(configReplacePattern, configReplaceTarget);
    const alreadyPresent = find<{ path: string }>(origIndexConfigs, (config) => config.path === newPath);
    if (!alreadyPresent) {
      // avoid mutation
      const newConfig = clone(currentOrigConfig);
      newConfig.path = newPath;
      newIndexConfigs.push(newConfig);
    }

    // Duplicating, so keep the original either way
    newIndexConfigs.push(currentOrigConfig);
  }
};

const componentMatchesTarget = (
  component: Component,
  targetComponentType: string,
  oldDescriptor: string,
  targetComponentPath: string,
) =>
  component.type === targetComponentType &&
  (component[targetComponentType] || {}).descriptor === oldDescriptor &&
  component.path === targetComponentPath;

const preparePostprocessors = (requestedPostprocessors): ComponentPostProcessor[] => {
  let postProcessors: ComponentPostProcessor[] = [];
  if (requestedPostprocessors) {
    if (!Array.isArray(requestedPostprocessors)) {
      requestedPostprocessors = [requestedPostprocessors];
    }
    postProcessors = requestedPostprocessors.map((processorLabel): ComponentPostProcessor => {
      const processorFunc: ContentitemMutatingPostprocessorFunc = POSTPROCESSORS[processorLabel];
      if (!processorFunc) {
        throw Error(`Postprocessor not found: '${processorLabel}'`);
      }

      return {
        label: processorLabel,
        func: processorFunc,
      };
    });
  }
  return postProcessors;
};

const runPostprocessors = (
  clonedContentItem: ContentItem,
  postProcessors: ComponentPostProcessor[],
  targetComponentPath: string,
  targetComponentType: string,
  newAppKeyDashed: string,
  newComponentKey: string,
) => {
  postProcessors.forEach((processor) => {
    const { label, func } = processor;
    try {
      func(clonedContentItem, targetComponentPath, targetComponentType, newAppKeyDashed, newComponentKey);
    } catch (e) {
      log.warning(
        `Error while trying to apply postprocessor function '${label}' to the following data/arguments: ${JSON.stringify(
          {
            clonedContentItem,
            targetComponentPath,
            targetComponentType,
            newAppKeyDashed,
            newComponentKey,
          },
        )}`,
      );
      throw e;
    }
  });
};

const replaceComponentDescriptor = (
  componentClone: Component,
  targetComponentType,
  oldAppKeyDashed,
  oldComponentKey,
  newAppKey,
  newAppKeyDashed,
  newComponentKey,
) => {
  const componentConfig = componentClone[targetComponentType].config || {};
  const componentConfigOldData = componentConfig[oldAppKeyDashed] || {};

  componentClone[targetComponentType].descriptor = `${newAppKey}:${newComponentKey}`;
  componentClone[targetComponentType].config[newAppKeyDashed] = {
    ...componentConfigOldData,
    [newComponentKey]: componentConfigOldData[oldComponentKey],
  };

  if (oldAppKeyDashed !== newAppKeyDashed) {
    delete componentClone[targetComponentType].config[oldAppKeyDashed];
  }
  if (oldComponentKey !== newComponentKey) {
    delete componentClone[targetComponentType].config[newAppKeyDashed][oldComponentKey];
  }
};

export function createEditorFunc(
  oldAppKey: string,
  oldComponentKey: string,
  newAppKey: string,
  newComponentKey: string,
  targetComponentType: string,
  results: Results,
  componentPathsPerId: Record<string, string[] | null>,
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
  // before any data is actually changed - or vise versa, no data is changed in the contentItem if anything goes wrong.
  // (But the batch will keep running for other content items - results are gathered and presented at the end)
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

    const newIndexConfigs: IndexConfigEntry[] = [];

    // For tracing and reporting errors
    let lastAttemptedComponentPath: string | null = null;

    const contentId = contentItem?._id || "###MISSING###";

    try {
      results.initPathChangeTracker(contentItem);
      const components = contentItem?.components || [];

      // List either selected paths to target, or if none are specifically targeted: all available component paths
      const targetComponentPaths: string[] =
        componentPathsPerId[contentId] !== null
          ? componentPathsPerId[contentId]
          : (components
              .map(
                (component) =>
                  component.type === targetComponentType &&
                  (component[targetComponentType] || {}).descriptor === oldDescriptor &&
                  component?.path,
              )
              .filter((path) => !!path) as string[]);

      const newComponents: { [path: string]: Component } = {};
      components.forEach((component: Component) => {
        for (const targetComponentPath of targetComponentPaths) {
          lastAttemptedComponentPath = verifyAndGetCompPath(component);

          if (componentMatchesTarget(component, targetComponentType, oldDescriptor, targetComponentPath)) {
            if (!component.path) {
              throw Error("Component without path: " + JSON.stringify(component));
            }

            // By now, established a match: type, descriptor and path of the current component matches the target. Deep-clone
            // the component data to avoid mutation, and add the clone to the collection of data to store later, with path as key
            const componentClone = clone(component);
            replaceComponentDescriptor(
              componentClone,
              targetComponentType,
              oldAppKeyDashed,
              oldComponentKey,
              newAppKey,
              newAppKeyDashed,
              newComponentKey,
            );
            newComponents[componentClone.path as string] = componentClone;
          }

          lastAttemptedComponentPath = null;
        }
      });

      verifyAllChangesWereMade(newComponents, componentPathsPerId[contentId]);

      const origIndexConfigs: IndexConfigEntry[] = contentItem?._indexConfig?.configs || [];
      for (const currentIndexConfig of origIndexConfigs) {
        lastAttemptedComponentPath = currentIndexConfig.path + " (config path)";

        addIndexConfig(
          currentIndexConfig,
          newIndexConfigs,
          origIndexConfigs,
          configSearchPattern,
          configReplacePattern,
          configReplaceTarget,
        );
      }

      lastAttemptedComponentPath = null;

      // Preparation: Deep-clone the current content item, inject the updated data into it
      // (overwriting existing keys), and return the clone:
      const clonedContentItem = clone(contentItem);
      if (newIndexConfigs.length) {
        clonedContentItem._indexConfig.configs = newIndexConfigs;
      }

      const postProcessors = preparePostprocessors(requestedPostprocessors);

      const pathsSortedDesc = Object.keys(newComponents);
      pathsSortedDesc.sort(sortComponentPathsDescending);

      // Let the actual processing begin: one component after another (in reverse order), by target path:
      pathsSortedDesc.forEach((targetComponentPath) => {
        lastAttemptedComponentPath = targetComponentPath;

        // Duplicate for safer undo: inject the new/changed component before the original
        contentRegionMutators.addComponent(
          clonedContentItem,
          newComponents[targetComponentPath],
          results.pathTrackers[contentItem._path],
        );

        runPostprocessors(
          clonedContentItem,
          postProcessors,
          targetComponentPath,
          targetComponentType,
          newAppKeyDashed,
          newComponentKey,
        );

        results.reportSuccess(clonedContentItem, targetComponentPath);
      });

      // Sign the change and return the CLONED and changed content item. This writes the changes.
      clonedContentItem.modifier = `user:${user.key} (${app.name})`;
      return clonedContentItem;
    } catch (e) {
      // Mark and log any error on this content item, and return the original one. This keeps the original and wipes any changes.
      results.markError(contentItem, lastAttemptedComponentPath, e);
      return contentItem;
    }
  };

  return editor;
}
