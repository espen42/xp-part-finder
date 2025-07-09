import { ContentItem } from "/lib/part-finder/editor";

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
   * Tracks an insertion where some component is being moved one down in the region, from one path to another.
   * Invariant: THIS APPROACH DEPENDS ON INSERTIONS HAPPENING IN REVERSE COMPONENT ORDER: bottom -> up
   */
  trackInsertion = (currentPath: string, newPath: string) => {

    const trackedToCurrentPath = Object.keys(this.paths).filter(
      (originalPath) => this.paths[originalPath] === currentPath,
    );
    if (trackedToCurrentPath.length > 1) {
      throw Error(
        `Unexpected state - it seems more than one component has been tracked to path ${JSON.stringify(currentPath)}. Those components has these original paths: ${JSON.stringify(trackedToCurrentPath)}`,
      );
    }
    if (trackedToCurrentPath.length) {
      this.paths[trackedToCurrentPath[0]] = newPath;
    } else {
      this.paths[`new::${currentPath}`] = newPath;
    }
  };

  toString = () =>
    Object.keys(this.paths)
      .filter((path) => this.paths[path] !== path)
      .map((path) => `${path} --> ${this.paths[path]}`)
      .join("\n\t\t");
}
