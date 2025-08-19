import clone from "../../../../../../node_modules/just-clone";
import { ContentItem, EditorFunc } from "/lib/part-finder/stages";
import { Results } from "/lib/part-finder/utils/results";
import { get as getContent } from "/lib/xp/content";
import { connect as nodeConnect } from "/lib/xp/node";
import { run as runInContext } from "/lib/xp/context";
import { getAliasOrUserKey, SIGNATURE_MARKER_KEY } from "/lib/part-finder/utils/aliasUser";
import { Node, ModifiedNode } from "@enonic-types/lib-node";
import { Content } from "@enonic-types/core";
import { Operation } from "/lib/part-finder/utils/plannedOperations";
import { stringAfterLast } from "/lib/part-finder/utils/utils";

interface SleeperBean {
  sleep(millis: number): void;
}
const sleeper = __.newBean("no.item.sleeper.Sleeper") as SleeperBean;

const TARGET_BRANCH = "draft";
const PRINCIPAL_ADMIN = "role:system.admin";

const BATCHSIZE = 10;
const BATCH_DELAY = 100; // .1 second

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
  componentPathsPerIdPerRepo: Record<string, Record<string, string[] | null>>, // Map: repo -> contentId -> component paths array
  sourceKey: string,
  newKey: string,
  componentType: string,
  plannedOperations: Record<string, Operation>, // Map: repo::contentId -> Operation
  mainOperation: Operation,
): Record<string, Results> => {
  const aliasOrUserKey = getAliasOrUserKey();

  const resultsFromRepos: Record<string, Results> = {}; // Map: repoName -> Results container

  let counter = -1;

  repoIds.forEach((targetRepo) => {
    // Remove the "com.enonic.cms." prefix
    const repoName = stringAfterLast(targetRepo, ".");

    const results = new Results(repoName, sourceKey, newKey, componentType, plannedOperations, mainOperation);

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
        const componentPathsPerId = componentPathsPerIdPerRepo[targetRepo] || {};

        Object.keys(componentPathsPerId).forEach((contentId) => {
          resultsFromRepos[targetRepo] = results;

          item = null;
          try {
            if (counter % BATCHSIZE === 0) {
              try {
                log.info("Processing: " + counter);
                sleeper.sleep(BATCH_DELAY);
              } catch (e) {
                log.warning("Batch delay interrupted: " + e);
              }
            }
            counter++;

            item = getContent({ key: contentId });
            if (item) {
              repo.modify({
                key: contentId,
                editor: (contentItem: Node<ContentItem>) => {
                  const modifiedContentItem = editorFunc(contentItem, componentPathsPerId, results);

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
            results.markError(item, null, e, { id: contentId });
          }
        });
      },
    );
  });

  return resultsFromRepos;
};
