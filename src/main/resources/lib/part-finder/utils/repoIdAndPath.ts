const DELIMITER_REPO_AND_ID = "::";
const DELIMITER_ID_AND_PATH = "__";

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

export const splitRepoFromIdAndPath = (repoIdAndPath: string, errorLabel?: string): string[] =>
  splitInTwo(repoIdAndPath, DELIMITER_REPO_AND_ID, errorLabel || "repo/id/path value");

export const splitIdFromPath = (idAndPath: string, errorLabel?: string) =>
  splitInTwo(idAndPath, DELIMITER_ID_AND_PATH, errorLabel || "id/path value", false);

export const getRepoAndIdString = (repoName: string, contentId: string): string =>
  `${repoName}${DELIMITER_REPO_AND_ID}${contentId}`;
export const getRepoIdAndPathString = (repoName: string, contentId: string, path: string): string =>
  `${getRepoAndIdString(repoName, contentId)}${DELIMITER_ID_AND_PATH}${path}`;
export const getIdAndPathString = (contentId: string, path: string): string =>
  `${contentId}${DELIMITER_ID_AND_PATH}${path}`;
