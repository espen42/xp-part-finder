import { Component } from "@enonic-types/lib-content";
import { ContentItem } from "/lib/part-finder/editors";
import { PathChangeTracker } from "/lib/part-finder/utils/pathChangeTracker";
import {SortedArrayDescending, sortByPathAttributeDesc, sortByPathAttributeAsc} from "/lib/part-finder/utils/sorting";

const getRootAndIndex = (path: string): [string, number | null] => {
  const splitPath = path.replace(/^\//, "").split("/");
  const parentPath = splitPath.slice(0, -1).join("/");
  let index: undefined | number = undefined;
  try {
    index = parseInt(splitPath[splitPath.length - 1], 10);
  } catch (e) {
    log.warning(e)
    throw Error(`Failed to parse a numeral last index from path ${JSON.stringify(path)}`);
  }
  return [`/${parentPath}/`.replace(/\/+/g, "/"), undefined === index || isNaN(index) ? null : index];
};

const verifyInputs = (contentItem, newComponent) => {
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
  if (!newComponent.path.match(/^(\/\w+\/\d+){1,2}$/)) {
    throw new Error(
      `Invalid path value for adding new component: ${JSON.stringify(newComponent.path)} (${typeof newComponent.path})`,
    );
  }
};

export const contentRegionMutators = {

  /** Updates the contentItem's components when adding a new component to a region.
   * Specifically, add the component data to the .components array, and update the path of the new component and all components below it in the same region.
   */
  addComponent: (
    contentItem: ContentItem,
    componentToAdd: Component,
    pathTracker: PathChangeTracker,
    overrideAddAtPath?: string,
  ) => {
    // contentItem will be mutated, but in order to enable easy component duplication (just pass the old component object
    // as componentToAdd), componentToAdd shouldn't be mutated. So spread to avoid mutating:
    const newComponent: Component = {
      ...componentToAdd,
      path: overrideAddAtPath || componentToAdd.path,
    } as Component;

    // After this, we know every old and new component has a path, hence the "as string"'s below
    verifyInputs(contentItem, newComponent);

    // eslint-disable-next-line prefer-const
    let [regionPath, pathTargetIndex] = getRootAndIndex(newComponent.path as string);

    if (regionPath === "/") {
      throw new Error("Cannot add a component at the root path '/'. Please specify a region path.");
    }

    const inTargetRegionPattern = new RegExp(`^(${regionPath})(\\d+)`);

    let hasAdded = false;
    let highestPathIndexSeen = -1;
    let newComponentIndex = -1;

    const sortedComponentsDesc: SortedArrayDescending<Component> = sortByPathAttributeDesc(
        contentItem.components || [],
        "path",
      );
    const belowInSameRegion: Component[] = []

    // Iterate through components to find the insertion point, as defined by `addAtPath`.
    for (let i = 0; i < sortedComponentsDesc.length; i++) {
      const currentComponent = sortedComponentsDesc[i];
      if (currentComponent.path === newComponent.path) {
        belowInSameRegion.push(currentComponent)
        sortedComponentsDesc.splice(i, 0, newComponent); // Insert the new component (that already has the specified path)
        hasAdded = true;
        newComponentIndex = i;
        break;
      } else {
        const isInTargetRegion = (currentComponent.path as string).match(inTargetRegionPattern);
        if (isInTargetRegion) {
          belowInSameRegion.push(currentComponent)

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
    if (!hasAdded) {
      if (highestPathIndexSeen >= 0) {
        highestPathIndexSeen++;
        newComponentIndex++;
        newComponent.path = `${regionPath}${highestPathIndexSeen + 1}`;
        pathTargetIndex = highestPathIndexSeen + 1;

        sortedComponentsDesc.splice(newComponentIndex, 0, newComponent);
        hasAdded = true;
      } else {
        throw new Error(`No matching region found for path: ${newComponent.path}`);
        // TODO: or just add the component at the end of the components array? What happens if a component is in data, but doesn't match any existing region path from the schema?
      }
    }

    // If the component was added, we need to update the paths of all components in the same region that have a path index greater than the new component's index.
    if (hasAdded) {
      for (const component of belowInSameRegion) {
        const [regionPath, pathIndex] = getRootAndIndex(component.path as string);

        if (pathIndex !== null && pathTargetIndex != null && pathIndex >= pathTargetIndex) {
          const previousPath = component.path as string
          component.path = (component.path as string).replace(
            `${regionPath}${pathIndex}`,
            `${regionPath}${pathIndex + 1}`,
          );
          pathTracker.trackInsertion(previousPath, component.path);
        }
      }
      pathTracker.trackInsertion(newComponent.path as string, newComponent.path as string);
    }
    contentItem.components = sortByPathAttributeAsc(sortedComponentsDesc, "path");
  },
};
