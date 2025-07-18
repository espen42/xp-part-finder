import { Results } from "/lib/part-finder/utils/results";
import { findIndex } from "/lib/part-finder/utils/utils";

import { Component } from "@enonic-types/lib-content";
import { contentRegionMutators } from "/lib/part-finder/utils/regionEditing";
import { ContentItem, EditorFunc, IndexConfigEntry } from "/lib/part-finder/editors";
import { sortComponentPaths } from "/lib/part-finder/utils/sorting";
import clone from "../../../../../../../node_modules/just-clone";
import { SIGNATURE_MARKER_KEY } from "/admin/tools/part-finder/part-finder";
import {hashContentItem} from "/lib/part-finder/utils/contentHashing";
import * as path from "node:path";


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

const componentMatchesTarget = (
  component: Component,
  targetComponentType: string,
  oldDescriptor: string,
  targetComponentPath: string,
) =>
  component.type === targetComponentType &&
  (component[targetComponentType] || {}).descriptor === oldDescriptor &&
  component.path === targetComponentPath;




export function createCleanupEditor(
  controlHashes: Record<string, string>,
  results: Results,
  componentPathsPerId: Record<string, string[] | null>
): EditorFunc {

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
    let lastAttemptedComponentPath: string | null = null;
    const contentId = contentItem?._id || "###MISSING###";

    try {

      // Preparation: Deep-clone the current content item, inject the updated data into it
      // (overwriting existing keys), and return the clone:
      const clonedContentItem = clone(contentItem);

      const controlHash = hashContentItem(clonedContentItem);
      if (controlHash !== controlHashes[contentId]) {
        throw Error(`Control hash mismatch (${JSON.stringify(controlHash)} != ${JSON.stringify(controlHashes[contentId])}). This suggests that the content has been changed (has someone edited it in the meantime?) after the component rewrite in step 1, before before step 2. Investigate and handle manually: THE CONTENT IS LEFT IN THE INTERMEDIATE STATE - POSSIBLE DUPLICATE COMPONENTS!`);
      }

      const components = (clonedContentItem?.components || []);

      const targetComponentPaths: string[] = (componentPathsPerId[contentId] || []).filter(path => !!(((path || "") + "").trim()))
      targetComponentPaths.sort(sortComponentPaths)
                                                                                                                        log.info(`targetComponentPaths for ${targetComponentPaths}: ${JSON.stringify(targetComponentPaths, null, 2)}`);

      targetComponentPaths.forEach((targetPath:string) => {
        lastAttemptedComponentPath = targetPath;
        const targetIndex = findIndex(clonedContentItem.components, comp=> comp.path === targetPath)
        if (targetIndex === -1) {
          throw Error(`Couldn't find component to delete on path ${targetPath}`)
        } else {
         clonedContentItem.components.splice(targetIndex, 1);
         lastAttemptedComponentPath = null;
        }
      })


      components.forEach((component: Component) => {


      verifyAllChangesWereMade(newComponents, componentPathsPerId[contentId]);

      const origIndexConfigs: IndexConfigEntry[] = clonedContentItem?._indexConfig?.configs || [];
      for (const currentIndexConfig of origIndexConfigs) {
        lastAttemptedComponentPath = currentIndexConfig.path + " (config path)";


        FIKS ET ELLER ANNET HER
      }

      lastAttemptedComponentPath = null;

      if (newIndexConfigs.length) {
        clonedContentItem._indexConfig.configs = newIndexConfigs;
      }

      const pathsSortedDesc = Object.keys(newComponents);
      pathsSortedDesc.sort(sortComponentPaths);

      // Let the actual processing begin: one component after another (in reverse order), by target path:
      pathsSortedDesc.forEach((targetComponentPath) => {
        lastAttemptedComponentPath = targetComponentPath;

        // Duplicate for safer undo: inject the new/changed component before the original
        contentRegionMutators.addComponent(
          clonedContentItem,
          newComponents[targetComponentPath],
          results.pathTrackers[clonedContentItem._path],
        );


        results.reportSuccess(clonedContentItem, targetComponentPath, "ADD");
      });

      results.finalizeContentItem(clonedContentItem);

      // Changes have been made, so mark the content item for a "modifier" signature.
      clonedContentItem[SIGNATURE_MARKER_KEY] = true;

      // Return the CLONED and changed content item. This writes the changes.
      return clonedContentItem;
    } catch (e) {
      // Mark and log any error on this content item, and return the original one. This keeps the original and wipes any changes.
      results.markError(contentItem, lastAttemptedComponentPath, "ADD", e);
      return contentItem;
    }
  };

  return editor;
}
