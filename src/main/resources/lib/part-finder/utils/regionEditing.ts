import { Component } from "@enonic-types/lib-content";
import { ContentItem } from "/lib/part-finder/stages";
import { PathChangeTracker } from "/lib/part-finder/utils/pathChangeTracker";
import {
  SortedArrayDescending,
  sortComponentsByPathDesc,
  sortComponentsByPathAsc,
  SortedArrayAscending,
} from "/lib/part-finder/utils/sorting";
import clone from "../../../../../../node_modules/just-clone";
import { findIndex } from "/lib/part-finder/utils/utils";

const getRootAndIndex = (path: string): [string, number] => {
  const splitPath = path.replace(/^\//, "").split("/");
  const parentPath = splitPath.slice(0, -1).join("/");
  if (!(parentPath || "").trim()) {
    throw Error(`Invalid path: ${path} - missing parent path.`);
  }

  let index: undefined | number = undefined;
  try {
    index = parseInt(splitPath[splitPath.length - 1], 10);
    if (index == null || isNaN(index)) {
      throw Error(`Invalid or missing numeral index in path: ${path}`);
    }
  } catch (e) {
    log.warning(e);
    throw Error(`Failed to parse a numeral last index from path ${JSON.stringify(path)}`);
  }

  return [`/${parentPath}/`.replace(/\/+/g, "/"), index];
};

const verifyContentItem = (contentItem: ContentItem) => {
  // Verify that the content item has a components array and that it contains a page component at the root path.
  if (!contentItem.components || !Array.isArray(contentItem.components) || contentItem.components.length === 0) {
    throw new Error("Content item does not have a components array");
  }
  if (
    contentItem.components.filter((component: Component) => {
      if (!component.path) {
        log.warning("A component in the content item is missing a path: " + JSON.stringify(contentItem));
        throw Error("Invalid content item: a component is missing a path");
      }
      return component.path === "/" && component.type === "page";
    }).length === 0
  ) {
    throw new Error("Content item does not have a page component at the root path");
  }
};

const verifyNewComponent = (newComponent: Component) => {
  // Verify that the component to be added is of a valid type and has a path and a descriptor.
  if (
    !(
      ["part", "layout", "page"].indexOf(newComponent?.type) > -1 &&
      newComponent.path &&
      newComponent[newComponent.type]?.descriptor
    )
  ) {
    throw new Error(`Invalid component to add: ${JSON.stringify(newComponent)} (${typeof newComponent})`);
  }

  // Verify that `addAtPath` is a valid component path (if missing, get it from component path). Expected form: eg. `/main/1`, `/main/2/myRegion/3`, etc.
  if (!newComponent.path.match(/^(\/[A-Za-z0-9][A-Za-z0-9_-]*\/\d+){1,2}$/)) {
    throw new Error(
      `Invalid path value for adding new component: ${JSON.stringify(newComponent.path)} (${typeof newComponent.path})`,
    );
  }
};

type PreppedIterationParams = {
  targetRegionPath: string;
  targetPathIndex: number;
  hasDone: boolean;
  belowInSameRegion: Component[];
  inTargetRegionPattern: RegExp;
};

const prepareForIteration = (targetComponentPath: string, operationErrorLabel: string): PreppedIterationParams => {
  // eslint-disable-next-line prefer-const
  let [targetRegionPath, targetPathIndex] = getRootAndIndex(targetComponentPath as string);

  if (targetRegionPath === "/") {
    throw new Error(`Can't ${operationErrorLabel} a component at the root path '/'.`);
  }

  return {
    targetRegionPath,
    targetPathIndex,
    hasDone: false,
    belowInSameRegion: [],
    inTargetRegionPattern: new RegExp(`^(${targetRegionPath})(\\d+)`),
  };
};

// When a component has been added, we need to update the paths of all components below it in the same region - in DESCENDING order to avoid path collisions.
// This function level enforces that.
const updateAndTrackComponentsBelowAdded = (
  targetComponentPath: string,
  belowInSameRegion: SortedArrayDescending<Component>,
  targetPathIndex: number,
  inTargetRegionPattern: RegExp,
  pathTracker: PathChangeTracker,
) => {
  // Change the others below the updated one first to make room then insert the new component, before inserting it.
  updateAndTrackComponents(
    belowInSameRegion,
    targetPathIndex,
    inTargetRegionPattern,
    pathTracker,
    (pathIndex) => pathIndex + 1,
  );

  pathTracker.trackInsertion(targetComponentPath);
};

// When we know the components below the deleted component in the same region, their paths must be updated in ASCENDING order to avoid path collisions.
// This function level enforces that.
const updateAndTrackComponentsBelowDeleted = (
  targetComponentPath: string,
  belowInSameRegion: SortedArrayAscending<Component>,
  targetPathIndex: number,
  inTargetRegionPattern: RegExp,
  pathTracker: PathChangeTracker,
) => {
  // Delete first to make room, then change the others below.
  pathTracker.trackDelete(targetComponentPath);

  updateAndTrackComponents(belowInSameRegion, targetPathIndex, inTargetRegionPattern, pathTracker, (pathIndex) => {
    const newPathIndex = pathIndex - 1;
    if (newPathIndex < 0) {
      throw Error(
        `Unexpected state (newPathIndex = ${newPathIndex}}) - trying to update a component path as if an earlier component was deleted before index 0, which should be impossible.`,
      );
    }
    return newPathIndex;
  });
};

/**
 * Common for updating paths of components below deleted and added components.
 * Each component in the array should be components below the deleted or added one, in the same region. For each:
 * uses a regex pattern (MUST have two groups) on the component's path, to isolate the relevant region's path and index in that region,
 * uses the index to verify the current component is actually below the inserted or deleted one (which is 'targetPathIndex'),
 * then gets the new index from a parameter function and updates the component's path,
 * and tracks the path change in the pathTracker.
 * It's the caller's responsibility to ensure the components are sorted in the correct order (DESCENDING for added, ASCENDING for deleted).
 */
const updateAndTrackComponents = (
  belowInSameRegion: Component[],
  targetPathIndex: number,
  inTargetRegionPattern: RegExp,
  pathTracker: PathChangeTracker,
  getNewPathIndex: (currentIndex: number) => number,
) => {
  for (const component of belowInSameRegion) {
    const pathMatch = (component.path as string).match(inTargetRegionPattern);
    const [, regionPath, pathIndexStr] = pathMatch || [];
    const pathIndex = parseInt(pathIndexStr, 10);
    if (pathIndex != null && !isNaN(pathIndex) && targetPathIndex != null && pathIndex >= targetPathIndex) {
      const previousPath = component.path as string;
      const newPathIndex = getNewPathIndex(pathIndex);
      const replacePattern = new RegExp(`^${regionPath}${pathIndex}`);
      component.path = (component.path as string).replace(replacePattern, `${regionPath}${newPathIndex}`);
      pathTracker.trackPathChange(previousPath, component.path);
    }
  }
};

// Enforces that components are handled in descending order, the algorithm depends on that.
const insertComponent = (
  sortedComponentsDesc: SortedArrayDescending<Component>,
  newComponent: Component,
  pathTracker: PathChangeTracker,
): string | null => {
  // eslint-disable-next-line prefer-const
  let { targetRegionPath, targetPathIndex, hasDone, belowInSameRegion, inTargetRegionPattern } = prepareForIteration(
    newComponent.path as string,
    "add",
  );

  let highestPathIndexSeen = -1;
  let newComponentIndex = -1;

  // Iterate through components to find the insertion point, as defined by `addAtPath`.
  for (let i = 0; i < sortedComponentsDesc.length; i++) {
    const currentComponent = sortedComponentsDesc[i];
    if (currentComponent.path === newComponent.path) {
      belowInSameRegion.push(currentComponent);
      sortedComponentsDesc.splice(i, 0, newComponent); // Insert the new component (that already has the specified path)
      hasDone = true;
      newComponentIndex = i;

      break;
    } else {
      const isInTargetRegion = (currentComponent.path as string).match(inTargetRegionPattern);
      if (isInTargetRegion) {
        belowInSameRegion.push(currentComponent);

        const [, pathIndex] = getRootAndIndex(currentComponent.path as string);
        if (pathIndex !== null && pathIndex > highestPathIndexSeen) {
          highestPathIndexSeen = pathIndex;
          newComponentIndex = i;
        }
      }
    }
  }

  // If the component hasn't been added by now, there was no match found.
  // If highestPathIndexSeen is above -1, then the same path as the target path has at least been seen, so we can insert the new component at the end of the region.
  if (!hasDone) {
    if (highestPathIndexSeen >= 0) {
      highestPathIndexSeen++;
      newComponentIndex++;
      newComponent.path = `${targetRegionPath}${highestPathIndexSeen + 1}`;
      targetPathIndex = highestPathIndexSeen + 1;

      sortedComponentsDesc.splice(newComponentIndex, 0, newComponent);
      hasDone = true;
    } else {
      throw new Error(`No matching region found for path: ${newComponent.path}`);
      // TODO: or just add the component at the end of the components array? What happens if a component is in data, but doesn't match any existing region path from the schema?
    }
  }

  // If the component was added, we need to update the paths of all components in the same region that have a path index greater than the new component's index.
  if (hasDone) {
    const belowInSameRegionDesc = sortComponentsByPathDesc(belowInSameRegion);
    updateAndTrackComponentsBelowAdded(
      newComponent.path as string,
      belowInSameRegionDesc,
      targetPathIndex,
      inTargetRegionPattern,
      pathTracker,
    );

    return newComponent.path as string;
  }

  return null;
};

// Enforces that components are handled in descending order, the algorithm depends on that.
const deleteComponent = (
  sortedComponentsDesc: SortedArrayDescending<Component>,
  targetComponentPath: string,
  pathTracker: PathChangeTracker,
) => {
  // eslint-disable-next-line prefer-const
  let { /*targetRegionPath,*/ targetPathIndex, hasDone, belowInSameRegion, inTargetRegionPattern } =
    prepareForIteration(targetComponentPath, "delete");

  // Iterate through components to find the delete point, as defined by `targetComponentPath`.
  // Components below it in the same region will have their paths updated, so we track of them with 'belowInSameRegion'.
  // Since the components are sorted in descending path order,
  // we can just splice the component out of the array and stop iterating once it's found.
  for (let i = 0; i < sortedComponentsDesc.length; i++) {
    const currentComponent = sortedComponentsDesc[i];
    if (currentComponent.path === targetComponentPath) {
      sortedComponentsDesc.splice(i, 1); // Delete the target component
      hasDone = true;

      break;
    } else {
      const isInTargetRegion = (currentComponent.path as string).match(inTargetRegionPattern);
      if (isInTargetRegion) {
        belowInSameRegion.push(currentComponent);
      }
    }
  }

  // If the component was deleted, we need to decrement the paths of all components in the same region that have a path index greater than the new component's index.
  if (hasDone) {
    const belowInSameRegionAsc = sortComponentsByPathAsc(belowInSameRegion);
    updateAndTrackComponentsBelowDeleted(
      targetComponentPath,
      belowInSameRegionAsc,
      targetPathIndex,
      inTargetRegionPattern,
      pathTracker,
    );
  } else {
    // If the component hasn't been added by now, there was no match found. There should have been.
    throw new Error(`No matching region found for path: ${targetComponentPath}`);
  }
};

const getVerifiedSortedComponents = (contentItem: ContentItem): SortedArrayDescending<Component> => {
  // After this, we know every old and new component has a path, hence the "as string"'s below
  verifyContentItem(contentItem);
  return sortComponentsByPathDesc(contentItem.components);
};

const getChildComponentClones = (
  contentItem: ContentItem,
  targetComponentType: string,
  targetComponentPath: string,
): { childComponentPattern?: RegExp; childComponentClones?: Component[] } => {
  if (targetComponentType === "layout") {
    const childComponentPattern = new RegExp(`^${targetComponentPath}/`); // RegEx ending with a slash, so it matches all children of the componentToAdd but not componentToAdd itself
    const childComponentClones = contentItem.components
      .filter((comp) => (comp.path || "").match(childComponentPattern))
      .map(clone);

    return { childComponentClones, childComponentPattern };
  }

  return {};
};

const copyLayoutChildComponents = (
  childComponentClones,
  childComponentPattern,
  newComponentPath,
  pathTracker,
  sortedComponentsDesc,
) => {
  if (childComponentClones && childComponentPattern && newComponentPath) {
    const replacement = `${newComponentPath}/`;
    childComponentClones.forEach((childComp) => {
      childComp.path = (childComp.path || "").replace(childComponentPattern, replacement);
      pathTracker.trackInsertion(childComp.path);
      sortedComponentsDesc.push(childComp);
    });
  }
};

const deleteLayoutChildComponents = (
  contentItem: ContentItem,
  targetPath: string,
  pathTracker: PathChangeTracker,
  sortedComponentsDesc: SortedArrayDescending<Component>,
) => {
  const targetedComponentType = sortedComponentsDesc.filter((comp) => comp.path === targetPath)[0]?.type;

  if (targetedComponentType) {
    const { childComponentClones } = getChildComponentClones(contentItem, targetedComponentType, targetPath);

    // If the deleted component had children, we need to remove them as well.
    if (childComponentClones && childComponentClones.length > 0) {
      const componentPathsToRemove = childComponentClones.map((comp) => comp.path as string);
      const indicesToRemove = componentPathsToRemove.map((path) =>
        findIndex(sortedComponentsDesc, (comp) => comp.path === path),
      );
      indicesToRemove.forEach((index) => {
        sortedComponentsDesc.splice(index, 1);
      });
      componentPathsToRemove.forEach(pathTracker.trackDelete);
    }
  }
};

/** Updates the contentItem's components when adding a new component to a region.
 * Specifically, add the component data to the .components array, and update the path of the new component and all components below it in the same region.
 */
export const addComponent = (
  contentItem: ContentItem,
  componentToAdd: Component,
  pathTracker: PathChangeTracker,
  overrideAddAtPath?: string,
) => {
  // contentItem will be mutated, but in order to enable easy component duplication (just pass the old component object
  // as componentToAdd), componentToAdd shouldn't be mutated. So, spread it:
  const newComponent: Component = {
    ...componentToAdd,
    path: overrideAddAtPath || componentToAdd.path,
  } as Component;
  verifyNewComponent(newComponent);

  // In order to avoid path collisions on insertion/deletion and path tracking, this ensures component are sorted by their path attribute in descending order
  const sortedComponentsDesc = getVerifiedSortedComponents(contentItem);

  const { childComponentClones, childComponentPattern } = getChildComponentClones(
    contentItem,
    newComponent.type,
    newComponent.path as string,
  );

  const insertedComponentPath = insertComponent(sortedComponentsDesc, newComponent, pathTracker);

  copyLayoutChildComponents(
    childComponentClones,
    childComponentPattern,
    insertedComponentPath,
    pathTracker,
    sortedComponentsDesc,
  );

  contentItem.components = sortComponentsByPathAsc(sortedComponentsDesc);
};

export const removeComponent = (contentItem: ContentItem, targetPath: string, pathTracker: PathChangeTracker) => {
  // In order to avoid path collisions on insertion/deletion and path tracking, this ensures components are sorted by their path attribute in descending order
  const sortedComponentsDesc = getVerifiedSortedComponents(contentItem);

  deleteLayoutChildComponents(contentItem, targetPath, pathTracker, sortedComponentsDesc);

  deleteComponent(sortedComponentsDesc, targetPath, pathTracker);

  contentItem.components = sortComponentsByPathAsc(sortedComponentsDesc);
};
