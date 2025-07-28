import clone from "../../../../../../node_modules/just-clone";
import { ContentItem } from "/lib/part-finder/editors";
import { Results } from "/lib/part-finder/utils/results";
import { ModifiedNode } from "@enonic-types/lib-node";

export const prepareEditorResources = (
  contentItem: ContentItem,
  componentPathsPerId: Record<string, string[] | null>,
  stringSortFunc: (paths: string[]) => string[],
  results: Results,
): { clonedContentItem: ModifiedNode<ContentItem>; targetComponentPaths } => {
  const contentId = contentItem?._id || "###MISSING###";

  // Deep-clone the current content item, allowing a return to the original data if anything failed
  // (or rather, not write the changes to the contentItem until everything has completed successfully)
  const clonedContentItem = clone(contentItem) as ModifiedNode<ContentItem>;

  results.initPathChangeTracker(clonedContentItem);
  const targetComponentPaths = stringSortFunc(
    (componentPathsPerId[contentId] || [])
      .filter(
        (path) => !!((path || "") + "").trim()
      )
  );

  return {
    clonedContentItem,
    targetComponentPaths,
  };
};
