import {Component} from "@enonic-types/lib-content";
import {ContentItem} from "/admin/tools/part-finder/editor/editor";

const getRootAndIndex = (path: string): [string, number | null] => {
  const splitPath = path.replace(/^\//, "").split("/");
  const parentPath = splitPath.slice(0, -1).join("/");
  let index: undefined | number = undefined;
  try {
    index = parseInt(splitPath[splitPath.length - 1], 10);
  } catch (e) {
    log.warning(`Failed to parse a numeral last index from path: ${path}: ${e}`);
  }
  return [
    `/${parentPath}/`.replace(/\/+/g, '/'),
    (undefined === index || isNaN(index)
        ? null
        : index
    )
  ];
};

const verifyInputs = (contentItem, newComponent) => {

  // Verify that the content item has a components array and that it contains a page component at the root path.
  if (!contentItem.components || !Array.isArray(contentItem.components) || contentItem.components.length === 0) {
    throw new Error("Content item does not have a components array");
  }
  if (
    contentItem.components.filter((component: Component) => component.path === "/" && component.type === "page")
      .length === 0
  ) {
    throw new Error("Content item does not have a page component at the root path");
  }

  // Verify that the component to be added is of a valid type and has a path and a descriptor.
  if (!(
    ['part', 'layout', 'page'].indexOf(newComponent?.type) > -1 &&
    newComponent.path &&
    newComponent[newComponent.type]?.descriptor)
  ) {
    throw new Error(
      `Invalid component to add: ${JSON.stringify(newComponent)} (${typeof newComponent})`,
    );
  }

  // Verify that `addAtPath` is a valid component path (if missing, get it from component path). Expected form: eg. `/main/1`, `/main/2/myRegion/3`, etc.
  if (!newComponent.path.match(/^(\/\w+\/\d+){1,2}$/)) {
    throw new Error(`Invalid path value for adding new component: ${JSON.stringify(newComponent.path)} (${typeof newComponent.path})`);
  }
}

export const contentRegionMutators = {
  addComponent: (contentItem: ContentItem, componentToAdd: Component, overrideAddAtPath?: string) => {
    // contentItem will be mutated, but in order to enable easy component duplication (just pass the old component object
    // as componentToAdd), componentToAdd shouldn't be mutated. So spread to avoid mutating:
    const newComponent: Component = {
      ...componentToAdd,
      path: (overrideAddAtPath || componentToAdd.path)
    } as Component

    verifyInputs(contentItem, newComponent);

    const [regionPath, pathTargetIndex] = getRootAndIndex(newComponent.path || "");

    if (regionPath === "/") {
      throw new Error("Cannot add a component at the root path '/'. Please specify a region path.");
    }

    const inSameRegionPattern = new RegExp(`^${regionPath}\\d+`);

    let hasAdded = false
    let highestPathIndexSeen = -1
    let newComponentIndex = -1

    // Iterate through components to find the insertion point, as defined by `addAtPath`.
    for (let i = 0; i < (contentItem.components || []).length; i++) {
      const currentComponent = contentItem.components[i];
      if (currentComponent.path === newComponent.path) {
        contentItem.components.splice(i, 0, newComponent) // Insert the new component (that already has the specified path
        hasAdded = true;
        newComponentIndex = i;
        break;

      } else {
        const isInSameRegion = (currentComponent.path || "").match(inSameRegionPattern);
        if (isInSameRegion) {
          const [, pathIndex] = getRootAndIndex(currentComponent.path || "");
          if (pathIndex!==null && pathIndex > highestPathIndexSeen) {

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
        highestPathIndexSeen++
        newComponentIndex++;
        newComponent.path = `${regionPath}${highestPathIndexSeen}`;
        contentItem.components.splice(newComponentIndex, 0, newComponent);
        hasAdded=true
      } else {
        throw new Error(`No matching region found for path: ${newComponent.path}`);
        // TODO: or just add the component at the end of the components array? What happens if a component is in data, but doesn't match any existing region path from the schema?
      }
    }

    // If the component was added, we need to update the paths of all components in the same region that have a path index greater than the new component's index.
    if (hasAdded) {
      for (let i = 0; i < (contentItem.components || []).length; i++) {
        const currentComponent = contentItem.components[i];

        const isInSameRegion = (currentComponent.path || "").match(inSameRegionPattern);
        if (isInSameRegion) {
          const [path, pathIndex] = getRootAndIndex(currentComponent.path || "");
          if (pathIndex !== null && pathTargetIndex!==null && pathIndex >= pathTargetIndex && i !== newComponentIndex) {
            currentComponent.path = `${path}${pathIndex + 1}`;
          }
        }
      }
    }

  },
};
