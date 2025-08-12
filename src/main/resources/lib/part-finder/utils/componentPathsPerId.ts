export const fullyQualify = (repoKey) => `com.enonic.cms.${repoKey || ""}`;

const splitInTwo = (
  str: string | undefined | null,
  delimiter: string,
  errorLabel,
  exactlyTwo: boolean = true,
): [string, string] => {
  const arr = (str || "").split(delimiter);
  const [first, second] = arr;

  if (
    !Array.isArray(arr) ||
    (first || "").length < 2 ||
    (exactlyTwo && arr.length !== 2) ||
    (exactlyTwo && (second || "").length < 2)
  ) {
    throw Error(
      `Parameter error: ${errorLabel} is not a valid [repo]::[contentId]__[path] format: ${JSON.stringify(str)}`,
    );
  }

  return [first, second];
};

export const parseComponentPathsPerIdPerRepo = (targetIds): Record<string, Record<string, string[] | null>> => {
  let i: number, repoName: string, idAndPath: string;
  const componentPathsPerIdPerRepo: Record<string, Record<string, string[] | null>> = {};

  for (i = 0; i < targetIds.length; i++) {
    const errorLabel = `targetIds[${i}]`;
    [repoName, idAndPath] = splitInTwo(targetIds[i], "::", errorLabel);

    const fullyQualifiedRepoName = fullyQualify(repoName);
    componentPathsPerIdPerRepo[fullyQualifiedRepoName] = componentPathsPerIdPerRepo[fullyQualifiedRepoName] || {};

    const componentPathsPerId: Record<string, string[] | null> = componentPathsPerIdPerRepo[fullyQualifiedRepoName];

    // If one of the targetIds have "__" in it, it signifies that this target is a multi-component-in-one-page one
    // (which has id before "__" and path after), aka multi-path-usage (ie. an id should only replace this and that
    // component path, and keep the same component on other paths).
    // And in that case, all the targets by that id should be multi's. And vice versa. Check that, throw error if mix-up.
    // If no mix-up, register the path or lack of path for that ID, for the editor func to handle.

    const [id, path] = splitInTwo(idAndPath, "__", errorLabel, false);
    if (path) {
      if (componentPathsPerId[id] === null) {
        throw Error(
          `Parameter error: componentPathsPerIdPerRepo[repo=][id=${JSON.stringify(id)}] is already null instead of an array, can't add ${JSON.stringify(path)}`,
        );
      }

      componentPathsPerId[id] = componentPathsPerId[id] || [];
      componentPathsPerId[id].push(path);
    } else {
      if (Array.isArray(componentPathsPerId[id])) {
        throw Error(
          `Parameter error: componentPathsPerId[${JSON.stringify(id)}'] is already an array, can't set it to null`,
        );
      }
      componentPathsPerId[id] = null;
    }
  }

  return componentPathsPerIdPerRepo;
};
