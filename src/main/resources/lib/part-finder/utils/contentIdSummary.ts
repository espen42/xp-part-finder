export const listContentIdsAndUsagePaths = (currentItem): string[] => {
  const contentIds: string[] = [];
  currentItem.contents.forEach((content) => {
    if (content.hasMultiUsage) {
      contentIds.push(
        ...content.multiUsage.filter((usage) => !usage.hideSelector).map((usage) => `${content.id}__${usage.path}`),
      );
    } else {
      contentIds.push(content.id);
    }
  });
  return contentIds;
};
