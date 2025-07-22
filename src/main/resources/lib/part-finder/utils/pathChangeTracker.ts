import {ContentItem} from "/lib/part-finder/editors";

export const PREFIX_NEWCOMPONENT = "::new::";

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
   * Tracks that the path of a component has been changed: looks in the values of this.paths map for the previous path,
   * and updates the value to the new path
   * (keeping the key, since that points to the ORIGINAL path - which may not be the same as the previous path, if a component has had its path updated more than once).
   */
  trackPathChange = (
    previousPath: string,
    newPath: string
  ) => {
    const trackedToCurrentPath = Object.keys(this.paths).filter(
      (originalPath) => this.paths[originalPath] === previousPath,
    );
    if (trackedToCurrentPath.length > 1) {
      throw Error(
        `Unexpected state - it seems more than one component has been tracked to path ${JSON.stringify(previousPath)}: ${JSON.stringify(this.paths, null, 2)}`,
      );
    }
    if (trackedToCurrentPath.length) {
      this.paths[trackedToCurrentPath[0]] = newPath;
    } else if (!this.paths[previousPath]) {
      this.paths[previousPath] = newPath;
    }
  };

  /**
   * Tracks an insertion: one component was inserted into a region.
   */
  trackInsertion = (
    newPath: string
  ) => {
    // Before trackInsertion was called, all components below it in the same region (but no other components) should have
    // been pushed down (ie. updated with an incremented path), so that there should no longer be any component
    // tracked to the path of the inserted component.
    Object.keys(this.paths).forEach(
      (originalPath) => {
        if (this.paths[originalPath] === newPath) {
          throw Error(
            `Unexpected state, something's wrong with the tracked paths - a component at path ${JSON.stringify(originalPath)} is already tracked to newPath ${JSON.stringify(newPath)}: can't track component insertion.`
          );
        }
      }
    );
    this.paths[`${PREFIX_NEWCOMPONENT}${newPath}`] = newPath;
  };



  trackDelete = (
    targetPath: string,
  ) => {
    let wasDeleted = false;
    Object.keys(this.paths).forEach((originalPath) => {
      if (this.paths[originalPath] === targetPath) {
        this.paths[originalPath] = "--deleted--";
        wasDeleted = true;
      }
    });
    if (!wasDeleted) {
      throw Error(`Unexpected state - trying to track a deletion of a component tracked to path ${JSON.stringify(targetPath)}, but no component is tracked to that path. Current paths: ${JSON.stringify(this.paths)}`);
    }
  };

  toString = () =>
    Object.keys(this.paths)
      .filter((path) => this.paths[path] !== path)
      //.map((path) => `${path} --> ${this.paths[path]}`)
      .join("\n\t\t");
}
