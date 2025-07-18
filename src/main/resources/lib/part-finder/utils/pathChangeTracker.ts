import { ContentItem } from "/lib/part-finder/editors";
import { Component } from "@enonic-types/lib-content";

export const init = (contentItem: ContentItem): Record<string, string> => {
  const pathChanges: Record<string, string> = {};
  (contentItem.components || []).forEach((component, i) => {
    if (!component.path) {
      log.warning(`A component in a contentitem is missing a path: ${JSON.stringify(contentItem)}`);
      throw Error(`Unexpected state - .components[${i}] in contentitem ${contentItem._path}) is missing a path.`);
    }
    pathChanges[component.path] = component.path;
  });
  return pathChanges;
};

/**
 * As paths of components are bumped inside a region, we need to track what their new paths have become in relation to their original path. Used for user feedback at the end of the batch, as well as undo and batch-accept functionality.
 */
export class PathChangeTracker {
  // Maps original path -> updated path
  paths: Record<string, string> = {};

  constructor(contentItem: ContentItem) {
    this.paths = init(contentItem);
  }

  /**
   * Tracks an insertion: one component was inserted into a region, pushing all components in the same region down,
   * and therefore incrementing the path index of the components below (but not other components).
   *
   * Invariants: to avoid path collisions when there are multiple items below the inserted one, this MUST HAPPEN IN REVERSE
   * COMPONENT ORDER: bottom -> up in the region.
   */
  trackInsertion = (
    previousPath: string,
    newPath: string
  ) => {
    const trackedToCurrentPath = Object.keys(this.paths).filter(
      (originalPath) => this.paths[originalPath] === previousPath,
    );
    if (trackedToCurrentPath.length > 1) {
      throw Error(
        `Unexpected state - it seems more than one component has been tracked to path ${JSON.stringify(previousPath)}. Those components has these original paths: ${JSON.stringify(trackedToCurrentPath)}`,
      );
    }
    if (trackedToCurrentPath.length) {
      this.paths[trackedToCurrentPath[0]] = newPath;
    } else {
      this.paths[`new::${previousPath}`] = newPath;
    }
  };
    }
  };

  toString = () =>
    Object.keys(this.paths)
      .filter((path) => this.paths[path] !== path)
      .map((path) => `${path} --> ${this.paths[path]}`)
      .join("\n\t\t");
}
