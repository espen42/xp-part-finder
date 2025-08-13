import { splitIdFromPath, splitRepoFromIdAndPath } from "/lib/part-finder/utils/repoIdAndPath";

export enum Operation {
  Add = "rewrite-and-add-new",
  Cleanup = "accept-or-undo",
  Undo = "undo-so-delete-new",
  Accept = "accept-so-delete-old",
}

export const registerOperationAndGetIds = (
  targetIds: string[],
  reviewOperation: Operation,
  plannedOperations: Record<string, Operation>,
  filterOnPrefix?: RegExp,
): string[] => {
  const cleanedIds = filterOnPrefix
    ? targetIds.filter((value) => value.match(filterOnPrefix)).map((value) => value.replace(filterOnPrefix, ""))
    : targetIds;

  cleanedIds.forEach((id) => {
    if (plannedOperations[id]) {
      throw Error(
        `Unexpected state - trying to register operation (id '${id}' --> '${reviewOperation}'), but that id is previously registered as '${plannedOperations[id]}'. Each ID should be handled only once.`,
      );
    }
    plannedOperations[id] = reviewOperation;
  });
  return cleanedIds;
};

export const parsePlannedOperationsPerId = (
  incomingPlannedOperations: Record<string, Operation>,
  currentRepo: string,
): Record<string, Record<string, Operation>> => {
  const plannedOperationsPerId: Record<string, Record<string, Operation>> = {};
  const errorLabel = "incoming planned-operation parameter";
  Object.keys(incomingPlannedOperations).forEach((repoIdAndPath) => {
    const [incomingRepo, contentItemId__componentPath] = splitRepoFromIdAndPath(repoIdAndPath, errorLabel);
    if (incomingRepo !== currentRepo) {
      return;
    }

    const [contentItemId, componentPath] = splitIdFromPath(contentItemId__componentPath, errorLabel);
    plannedOperationsPerId[contentItemId] = {
      ...(plannedOperationsPerId[contentItemId] || {}),
      [componentPath]: incomingPlannedOperations[repoIdAndPath],
    };
  });

  return plannedOperationsPerId;
};
