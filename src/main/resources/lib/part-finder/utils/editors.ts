import clone from "../../../../../../node_modules/just-clone";
import { ContentItem, EditorFunc } from "/lib/part-finder/stages";
import { Results } from "/lib/part-finder/utils/results";
import { get as getContent } from "/lib/xp/content";
import { connect as nodeConnect } from "/lib/xp/node";
import { run as runInContext } from "/lib/xp/context";
import { getAliasOrUserKey, SIGNATURE_MARKER_KEY } from "/lib/part-finder/utils/aliasUser";
import { stringAfterLast } from "/lib/part-finder/utils/utils";
import { Node, ModifiedNode } from "@enonic-types/lib-node";
import { Content } from "@enonic-types/core";

const TARGET_BRANCH = "draft";
const PRINCIPAL_ADMIN = "role:system.admin";

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
    (componentPathsPerId[contentId] || []).filter((path) => !!((path || "") + "").trim()),
  );

  return {
    clonedContentItem,
    targetComponentPaths,
  };
};

export const runEditor = (
  editorFunc: EditorFunc,
  repoIds: string[],
  componentPathsPerId: Record<string, string[] | null>,
  results: Results,
) => {
  const aliasOrUserKey = getAliasOrUserKey();

  repoIds.forEach((targetRepo) => {
    const repoName = stringAfterLast(targetRepo, ".");
    results.setRepoContext(repoName);

    const repo = nodeConnect({
      repoId: targetRepo,
      branch: TARGET_BRANCH,
    });

    runInContext(
      {
        repository: targetRepo,
        branch: TARGET_BRANCH,
        principals: [PRINCIPAL_ADMIN],
      },
      () => {
        let item: Content | null;

        Object.keys(componentPathsPerId).forEach((key) => {
          item = null;
          try {
            item = getContent({ key });
            if (item) {
              repo.modify({
                key,
                editor: (contentItem: Node<ContentItem>) => {
                  const modifiedContentItem = editorFunc(contentItem);

                  // If the content item has been changed, sign the modified content item with the alias user or current user.
                  if (modifiedContentItem[SIGNATURE_MARKER_KEY]) {
                    delete modifiedContentItem[SIGNATURE_MARKER_KEY];
                    modifiedContentItem.modifier = aliasOrUserKey;
                  }
                  return modifiedContentItem;
                },
              });
            }
          } catch (e) {
            results.markError(item, null, e, key);
          }
        });
      },
    );
  });
};
