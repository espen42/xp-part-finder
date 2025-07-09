import {ComponentNavLink} from "/admin/views/navigation/navigation.freemarker";

export const SORT_FUNCS: Record<
  "alphaasc" | "alphadesc" | "countasc" | "countdesc",
  (a: ComponentNavLink, b: ComponentNavLink) => number
> = {
  alphaasc: (a, b) => a.key.localeCompare(b.key),
  alphadesc: (a, b) => b.key.localeCompare(a.key),
  countasc: (a, b) => a.docCount - b.docCount,
  countdesc: (a, b) => b.docCount - a.docCount,
};


export const sortComponentPaths = (pathA: string, pathB: string, descending: boolean = true): number => {
  if (pathA === pathB) {
    return 0;
  }

  const splitPathA: string[] = pathA.replace(/^\//, "").split("/");
  const splitPathB: string[] = pathB.replace(/^\//, "").split("/");

  for (let i = 0; i < Math.min(splitPathA.length, splitPathB.length); i += 2) {
    const regionA = splitPathA[i];
    const regionB = splitPathB[i];
    if (regionA !== regionB) {
      return descending ? regionB.localeCompare(regionA) : regionA.localeCompare(regionB);
    }

    const indexA = parseInt(splitPathA[i + 1], 10);
    const indexB = parseInt(splitPathB[i + 1], 10);

    if (indexA == null || isNaN(indexA)) {
      throw Error("Invalid path: " + pathA);
    }
    if (indexB == null || isNaN(indexB)) {
      throw Error("Invalid path: " + pathB);
    }
    if (indexA !== indexB) {
      return descending ? indexB - indexA : indexA - indexB;
    }
  }

  // If we reach here, the paths are equal up to the length of the shorter path. Then the longer path is considered a component inside the component with the shorter path, and should be sorted after it.
  if (splitPathA.length !== splitPathB.length) {
    return descending ? splitPathB.length - splitPathA.length : splitPathA.length - splitPathB.length;
  }

  // If we reach here, the paths should have been equal - but we've checked and they're not. Throw an error to indicate that something is wrong.
  throw new Error(
    `Unexpected state, can't sort paths - component paths appear equal, but aren't: ${JSON.stringify(pathA)} vs ${pathB}`,
  );
};
