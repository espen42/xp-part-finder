import { Results } from "/lib/part-finder/utils/results";
import { find } from "/lib/part-finder/utils/utils";

import { Component } from "@enonic-types/lib-content";
import { contentRegionMutators } from "/lib/part-finder/utils/regionEditing";
import { ContentItem, EditorFunc, IndexConfigEntry } from "/lib/part-finder/editors";
import { ContentitemMutatingPostprocessorFunc, POSTPROCESSORS } from "/lib/part-finder/editors/replace/postprocessors";
import clone from "../../../../../../../node_modules/just-clone";
import { SIGNATURE_MARKER_KEY } from "/admin/tools/part-finder/part-finder";
import { sortComponentPathsAsc, sortComponentPathsDesc, SortedArrayDescending } from "/lib/part-finder/utils/sorting";
import { getLastAttemptTracker, LastAttemptTracker } from "/lib/part-finder/utils/lastAttemptTracker";
import { prepareEditorResources } from "/lib/part-finder/utils/editorUtils";
import { PREFIX_NEWCOMPONENT } from "/lib/part-finder/utils/pathChangeTracker";

type ComponentPostProcessor = {
  label: string;
  func: ContentitemMutatingPostprocessorFunc;
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

/**
 * Processes the components in descending order, meaning from the bottom of the region and up.
 * This is to avoid path collisions when adding new components.
 *
 * @param clonedContentItem - The content item being processed.
 * @param targetComponentPaths - Component paths to insert, sorted in descending order.
 * @param newComponents - New components to be added, keyed by their paths.
 * @param targetComponentType - The type of the target component.
 * @param newAppKeyDashed - The new app key with dashes instead of dots.
 * @param newComponentKey - The new component key.
 * @param postProcessors - Post-processor functions to run on each component.
 * @param lastAttempted - Tracker for the last attempted component path, in case of errors.
 * @param results - Report success or errors and summarize in the end.
 */
const addComponentsToContentItem = (
  clonedContentItem: ContentItem,
  targetComponentPaths: SortedArrayDescending<string>,
  newComponents: { [path: string]: Component },
  lastAttempted: LastAttemptTracker,
  results: Results,
) => {

  // Let the actual processing begin: one component after another
  // (sorted in "reverse order" by path to avoid path collisions: so 'descending' means from the bottom and up in the region)
  targetComponentPaths.forEach((targetComponentPath) => {
    lastAttempted.componentPath = targetComponentPath;

    // Duplicate for safer undo: inject the new/changed component before the original
    contentRegionMutators.addComponent(
      clonedContentItem,
      newComponents[targetComponentPath],
      results.pathTrackers[clonedContentItem._path],
    );
  });
};

const createReplacementComponents = (
  clonedContentItem: ContentItem,
  targetComponentPaths: string[],
  targetComponentType: string,
  oldDescriptor: string,
  oldAppKeyDashed: string,
  oldComponentKey: string,
  newAppKey: string,
  newAppKeyDashed: string,
  newComponentKey: string,
  configSearchPattern: RegExp,
  configReplacePattern: RegExp,
  configReplaceTarget: string,
  lastAttempted: LastAttemptTracker,
): { [path: string]: Component } => {
  //  // if none are specifically targeted: all available component paths where type and descriptor match
  //  if (targetComponentPaths == null) {
  //    targetComponentPaths = components.map(
  //              (component) =>
  //                component.type === targetComponentType &&
  //                (component[targetComponentType] || {}).descriptor === oldDescriptor &&
  //                component?.path,
  //            )
  //            .filter((path) => !!path) as string[]
  //  }
  //
  const components = clonedContentItem.components || [];
  const newComponents: { [path: string]: Component } = {};
  components.forEach((component: Component) => {
    for (const targetComponentPath of targetComponentPaths) {
      lastAttempted.componentPath = verifyAndGetCompPath(component);

      if (componentMatchesTarget(component, targetComponentType, oldDescriptor, targetComponentPath)) {
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

      lastAttempted.componentPath = null;
    }
  });

  verifyAllChangesWereMade(newComponents, targetComponentPaths);

  const origIndexConfigs: IndexConfigEntry[] = clonedContentItem?._indexConfig?.configs || [];

  const newIndexConfigs: IndexConfigEntry[] = [];

  for (const currentIndexConfig of origIndexConfigs) {
    lastAttempted.componentPath = currentIndexConfig.path + " (config path)";

    addIndexConfig(
      currentIndexConfig,
      newIndexConfigs,
      origIndexConfigs,
      configSearchPattern,
      configReplacePattern,
      configReplaceTarget,
    );
  }

  lastAttempted.componentPath = null;

  if (newIndexConfigs.length) {
    if (!clonedContentItem._indexConfig) {
      throw Error(
        `Content item ${clonedContentItem._path} has no _indexConfig, but index configs were found: ${JSON.stringify(newIndexConfigs)}`,
      );
    }
    clonedContentItem._indexConfig.configs = newIndexConfigs;
  }

  return newComponents;
};

const postprocess = (
  clonedContentItem: ContentItem,
  requestedPostprocessors: string[] | string | undefined,
  targetComponentPaths: string[],
  targetComponentType: string,
  newAppKeyDashed: string,
  newComponentKey: string,
  lastAttempted: LastAttemptTracker,
  results: Results,
) => {
  const postProcessors = preparePostprocessors(requestedPostprocessors);

  const pathTracker = results.pathTrackers[clonedContentItem._path];

  targetComponentPaths.forEach((oldTargetPath) => {
    const trackedComponentPath = pathTracker.paths[`${PREFIX_NEWCOMPONENT}${oldTargetPath}` || oldTargetPath];

    lastAttempted.componentPath = trackedComponentPath;

    runPostprocessors(
      clonedContentItem,
      postProcessors,
      trackedComponentPath,
      targetComponentType,
      newAppKeyDashed,
      newComponentKey,
    );

    results.reportSuccess(clonedContentItem, trackedComponentPath, oldTargetPath);
  });
};

export function createReplaceEditor(
  oldAppKey: string,
  oldComponentKey: string,
  newAppKey: string,
  newComponentKey: string,
  targetComponentType: string,
  results: Results,
  componentPathsPerId: Record<string, string[] | null>,
  requestedPostprocessors?: string[] | string,
): EditorFunc {
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
  const editor: EditorFunc = (contentItem) => {
    /*
    Example component structure in a content: {
    "type": "layout",
    "path": "/main/0",
    "layout": {s
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


    // For tracing and reporting errors
    const lastAttempted = getLastAttemptTracker();

    try {
      const { targetComponentPaths, clonedContentItem } = prepareEditorResources(
        contentItem,
        componentPathsPerId,
        sortComponentPathsAsc,
        results,
      );

      const newComponents = createReplacementComponents(
        clonedContentItem,
        targetComponentPaths,
        targetComponentType,
        oldDescriptor,
        oldAppKeyDashed,
        oldComponentKey,
        newAppKey,
        newAppKeyDashed,
        newComponentKey,
        configSearchPattern,
        configReplacePattern,
        configReplaceTarget,
        lastAttempted,
      );

      const pathsSortedDesc: SortedArrayDescending<string> = sortComponentPathsDesc(Object.keys(newComponents));

      addComponentsToContentItem(clonedContentItem, pathsSortedDesc, newComponents, lastAttempted, results);

      postprocess(
        clonedContentItem,
        requestedPostprocessors,
        targetComponentPaths,
        targetComponentType,
        newAppKeyDashed,
        newComponentKey,
        lastAttempted,
        results,
      );

      results.hashContentItem(clonedContentItem);

      // Changes have been made, so mark the content item for a "modifier" signature.
      clonedContentItem[SIGNATURE_MARKER_KEY] = true;

      // Return the CLONED and changed content item. This writes the changes.
      return clonedContentItem;

    } catch (e) {
      // Mark and log any error on this content item, and return the original one. This keeps the original and wipes any changes.
      results.markError(contentItem, lastAttempted.componentPath, e);
      return contentItem;
    }
  };

  return editor;
}
