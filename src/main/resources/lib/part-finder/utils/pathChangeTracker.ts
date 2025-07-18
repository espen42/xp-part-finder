import {ContentItem} from "/lib/part-finder/editors";
import {Component} from "@enonic-types/lib-content";

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
        `Unexpected state - it seems more than one component has been tracked to path ${JSON.stringify(previousPath)}. Those components has these original paths: ${JSON.stringify(trackedToCurrentPath)}`,
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
    this.paths[`new::${newPath}`] = newPath;
  };


  /**
   * Tracks a deletion, where one component is being removed from a region, pulling all components in the same region up
   * - and therefore decrementing the path index of the components below (but not other components).
   * Invariants: THIS APPROACH DEPENDS ON:
   * - COMPONENT ARRAY MUST BE SORTED BY PATH, ASCENDING: top -> down in the region.
   * - DELETION MUST HAPPEN IN FORWARD COMPONENT ORDER: top -> down in the region
   */
  trackDelete = (
    sortedComponents: Component[],
    inTargetRegionPattern: RegExp,
    pathTargetIndex: number | null,
    newComponentIndex: number,
  ) => {
    for (let i = 0; i < sortedComponents.length; i++) {
      const currentComponent = sortedComponents[i] as { path: string };

      // Uses the two regex groups in the inSameRegionPattern to not only check if the component is in the same region,
      // but also to get the region's path and the component's index within the region
      const targetRegionMatch = currentComponent.path.match(inTargetRegionPattern);
      if (targetRegionMatch) {
        const regionPath = targetRegionMatch[1]; // eg. "/main/2/leftRegion/"
        const currentPathIndex = parseInt(targetRegionMatch[2], 10); // eg. 3

        if (currentPathIndex != null && pathTargetIndex !== null && currentPathIndex >= pathTargetIndex) {
          if (i === newComponentIndex) {
            this.trackSingleDelete(currentComponent.path);
          } else {
            if (currentPathIndex < 1) {
              throw Error(
                `Unexpected state (currentPathIndex = ${currentPathIndex}}) - trying to update a component path as if an earlier component was deleted before index 0, which should be impossible.`,
              );
            }
            const newPath = currentComponent.path.replace(
              `${regionPath}${currentPathIndex}`,
              `${regionPath}${currentPathIndex - 1}`,
            );
            this.trackSingleDelete(currentComponent.path, newPath);
            currentComponent.path = newPath;
          }
        }
      }
    }
  };

  trackSingleDelete = (currentPath: string, newPath?: string) => {
    const trackedToCurrentPath = Object.keys(this.paths).filter(
      (originalPath) => this.paths[originalPath] === currentPath,
    );
    if (trackedToCurrentPath.length > 1) {
      throw Error(
        `Unexpected state - it seems more than one component has been tracked to path ${JSON.stringify(currentPath)}. Those components has these original paths: ${JSON.stringify(trackedToCurrentPath)}`,
      );
    }
    if (trackedToCurrentPath.length) {
      this.paths[trackedToCurrentPath[0]] = newPath || "--deleted--";
    }
  };

  toString = () =>
    Object.keys(this.paths)
      .filter((path) => this.paths[path] !== path)
      .map((path) => `${path} --> ${this.paths[path]}`)
      .join("\n\t\t");
}
