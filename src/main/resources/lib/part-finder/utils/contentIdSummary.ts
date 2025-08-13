import { getRepoAndIdString, getIdAndPathString } from "/lib/part-finder/utils/repoIdAndPath";

export const listContentIdsAndUsagePaths = (currentItem): string[] => {
  const contentIds: string[] = [];
  currentItem.contents.forEach((content) => {
    if (content.hasMultiUsage) {
      contentIds.push(
        ...content.multiUsage
          .filter((usage) => !usage.hideSelector)
          .map((usage) => getIdAndPathString(content.id, usage.path)),
      );
    } else {
      contentIds.push(getRepoAndIdString(content.repo, content.id));
    }
  });
  return contentIds;
};
