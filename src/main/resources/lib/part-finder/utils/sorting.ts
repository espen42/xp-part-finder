import { ComponentNavLink } from "/admin/views/navigation/navigation.freemarker";
import { EditorResult } from "/lib/part-finder/utils/results";
import { Component } from "@enonic-types/lib-content";

export const SORT_FUNCS: Record<
  "alphaasc" | "alphadesc" | "countasc" | "countdesc",
  (a: ComponentNavLink, b: ComponentNavLink) => number
> = {
  alphaasc: (a, b) => a.key.localeCompare(b.key),
  alphadesc: (a, b) => b.key.localeCompare(a.key),
  countasc: (a, b) => a.docCount - b.docCount,
  countdesc: (a, b) => b.docCount - a.docCount,
};

// Use branding / opaque type, to make TS enforce already-sorted and sort direction for algorithms that require pre-sorted arrays (such as the pathChangeTracker).
declare const ascending: unique symbol;
declare const descending: unique symbol;
export type SortedArrayAscending<T> = T[] & { readonly [ascending]: void };
export type SortedArrayDescending<T> = T[] & { readonly [descending]: void };
type SortFunc<T> = (a: T, b: T) => number;

const sortComponentPaths: SortFunc<string> = (pathA, pathB) => {
  if (pathA === pathB) {
    return 0;
  }

  const splitPathA: string[] = pathA.replace(/^\//, "").split("/");
  const splitPathB: string[] = pathB.replace(/^\//, "").split("/");

  for (let i = 0; i < Math.min(splitPathA.length, splitPathB.length); i += 2) {
    const regionA = splitPathA[i];
    const regionB = splitPathB[i];
    if (regionA !== regionB) {
      return regionA.localeCompare(regionB);
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
      return indexA - indexB;
    }
  }

  // If we reach here, the paths are equal up to the length of the shorter path. Then the longer path is considered a component inside the component with the shorter path, and should be sorted after it.
  if (splitPathA.length !== splitPathB.length) {
    return splitPathA.length - splitPathB.length;
  }

  // If we reach here, the paths should have been equal - but we've checked and they're not. Throw an error.
  throw new Error(
    `Unexpected state, can't sort paths - component paths appear equal, but aren't: ${JSON.stringify(pathA)} vs ${pathB}`,
  );
};

// Get a component path sorter function, ascending path order by default, descending if specified.
const getComponentPathSorterFunc = (descending: boolean = false): SortFunc<string> =>
  descending ? (pathA: string, pathB: string): number => sortComponentPaths(pathB, pathA) : sortComponentPaths;

export const sortComponentPathsAsc = (paths: string[]): SortedArrayAscending<string> => {
  const sorterFunc = getComponentPathSorterFunc();
  return [...paths].sort(sorterFunc) as SortedArrayAscending<string>;
};
export const sortComponentPathsDesc = (paths: string[]): SortedArrayDescending<string> => {
  const sorterFunc = getComponentPathSorterFunc(true);
  return [...paths].sort(sorterFunc) as SortedArrayDescending<string>;
};

export const sortByPathAttributeAsc = (
  arrayOfObjects: Component[],
  pathAttributeName: keyof Component,
): SortedArrayAscending<Component> => {
  const sorterFunc = getComponentPathSorterFunc();
  return [...arrayOfObjects].sort((a, b) =>
    sorterFunc(a[pathAttributeName] || "", b[pathAttributeName] || ""),
  ) as SortedArrayAscending<Component>;
};
export const sortByPathAttributeDesc = (
  arrayOfObjects: Component[],
  pathAttributeName: keyof Component,
): SortedArrayDescending<Component> => {
  const sorterFunc = getComponentPathSorterFunc();
  return [...arrayOfObjects].sort(
    (b, a) => sorterFunc(a[pathAttributeName] || "", b[pathAttributeName] || ""), // Flipping the order for descending sort (instead of an extra, redundant function wrap layer)
  ) as SortedArrayDescending<Component>;
};

export const sortResultsByPathAsc = (results: EditorResult[]): SortedArrayAscending<EditorResult> => {
  const sorterFunc = getComponentPathSorterFunc();
  return [...results].sort((a: EditorResult, b: EditorResult) => {
    if (a.id !== b.id) {
      return a.id.localeCompare(b.id);
    }

    const aSortedComponentPaths = Array.isArray(a.componentPath)
      ? (a.componentPath as string[]).sort(sorterFunc)
      : [a.componentPath];
    const bSortedComponentPaths = Array.isArray(b.componentPath)
      ? (b.componentPath as string[]).sort(sorterFunc)
      : [b.componentPath];

    return sorterFunc(aSortedComponentPaths[0] || "", bSortedComponentPaths[0] || "");
  }) as SortedArrayAscending<EditorResult>;
};
