import { connect, multiRepoConnect, type Node, type QueryNodeParams } from "/lib/xp/node";
import { notNullOrUndefined } from "/lib/part-finder/utils";

export function queryAllRepos<NodeData = Record<string, unknown>>(
  repositories: string[],
  queryParams: QueryNodeParams,
): Node<NodeData & { repoId: string }>[] {
  const connection = multiRepoConnect({
    sources: repositories.map((repoId) => ({
      repoId,
      branch: "draft",
      principals: ["role:system.admin"],
    })),
  });

  return connection
    .query(queryParams)
    .hits.map(({ id, repoId }) => {
      const content = connect({
        branch: "draft",
        repoId,
        principals: ["role:system.admin"],
      }).get<NodeData>(id);

      if (!content) {
        return null;
      } else {
        return { ...content, repoId };
      }
    })
    .filter(notNullOrUndefined);
}
