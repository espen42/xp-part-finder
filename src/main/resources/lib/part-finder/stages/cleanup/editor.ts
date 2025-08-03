import { Results } from "/lib/part-finder/utils/results";
import { ContentItem, EditorFunc } from "/lib/part-finder/stages";
import { sortComponentPathsDesc, SortedArrayDescending } from "/lib/part-finder/utils/sorting";
import { hashContentItem } from "/lib/part-finder/utils/contentHashing";
import { getLastAttemptTracker, LastAttemptTracker } from "/lib/part-finder/utils/lastAttemptTracker";
import { contentRegionMutators } from "/lib/part-finder/utils/regionEditing";
import { prepareEditorResources } from "/lib/part-finder/utils/editors";
import { SIGNATURE_MARKER_KEY } from "/lib/part-finder/utils/aliasUser";
import { Operation } from "/lib/part-finder/utils/plannedOperations";

const verifyUnchangedContent = (contentItem: ContentItem, controlHashes: Record<string, string>) => {
  const contentHash = hashContentItem(contentItem);
  if (contentHash !== controlHashes[contentItem._id]) {
    throw Error(
      `Control hash mismatch (${JSON.stringify(contentHash)} != ${JSON.stringify(controlHashes[contentItem._id])}). This suggests that the content has been changed (has someone edited it in the meantime?) between the 'replace' stage (step 1) and the cleanup stage (step 2). Investigate and handle manually: THE CONTENT IS LEFT IN THE INTERMEDIATE STATE - POSSIBLE DUPLICATE COMPONENTS!`,
    );
  }
};

/**
 * Processes the components in descending order, meaning from the bottom of the region and up.
 * This is to avoid path collisions when adding new components.
 *
 * @param clonedContentItem - The content item being processed.
 * @param targetComponentPaths - Component paths to delete, sorted in descending order - avoids path collisions (since components that follow below the deleted component in the same region must have their paths updated)
 * @param lastAttempted - Tracker for the last attempted component path, in case of errors.
 * @param results - Report success or errors and summarize in the end.
 */
const removeComponentsFromContentItem = (
  clonedContentItem: ContentItem,
  targetComponentPaths: SortedArrayDescending<string>,
  lastAttempted: LastAttemptTracker,
  results: Results,
) => {
  const plannedOperations = results.plannedOperationsPerId[clonedContentItem._id];

  targetComponentPaths.forEach((targetPath: string) => {
    lastAttempted.componentPath = targetPath;

    const pathPattern = new RegExp(`(.+)\/(\\d+)$`);
    const pathMatch = targetPath.match(pathPattern);
    if (!pathMatch) {
      throw Error(`Unexpected state - targetPath appears to be malformed or missing: ${JSON.stringify(targetPath)}`);
    }

    contentRegionMutators.removeComponent(clonedContentItem, targetPath, results.pathTrackers[clonedContentItem._path]);

    const pathRoot = pathMatch[1];
    const pathIndex = parseInt(pathMatch[2], 10);
    let remainingPath;

    const plannedOperation = plannedOperations[targetPath];
    if (plannedOperation === Operation.Accept) {
      // The change was accepted and the deleted target was the original. So the remaining path (the component that was not deleted) is the one before the deleted one.
      remainingPath = `${pathRoot}/${pathIndex - 1}`;
    } else if (plannedOperation === Operation.Undo) {
      remainingPath = `${pathRoot}/${pathIndex + 1}`;
    } else {
      throw new Error(
        "Unexpected state - planned operation should have been Accept or Undo. Instead: " +
          JSON.stringify(plannedOperation),
      );
    }

    results.reportSuccess(clonedContentItem, targetPath, remainingPath);
  });
};

export function createCleanupEditor(
  controlHashes: Record<string, string>,
  results: Results,
  componentPathsPerId: Record<string, string[] | null>,
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
    const lastAttempted = getLastAttemptTracker();

    try {
      verifyUnchangedContent(contentItem, controlHashes);

      const { targetComponentPaths, clonedContentItem } = prepareEditorResources(
        contentItem,
        componentPathsPerId,
        sortComponentPathsDesc,
        results,
      );

      removeComponentsFromContentItem(clonedContentItem, targetComponentPaths, lastAttempted, results);

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
