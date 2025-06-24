import { Component } from "@enonic-types/lib-content";

const getRootAndIndex = (path: string): [string, number] => {
  const splitPath = path.replace(/^\//, "").split("/");
  const parentPath = splitPath.slice(0, -1).join("/");
  const index = parseInt(splitPath[splitPath.length - 1], 10);
  return [`/${parentPath}/`, index];
};

const getIndexInRegion = (component: Component, regionRoot: string): number =>
  parseInt((component.path || "").replace(regionRoot, "").split("/")[0], 10);

export const contentRegionMutators = {
  addComponent: (contentItem, component, addAtPath) => {
    if (!addAtPath.match(/^(\/\w+\/\d+){1,2}$/)) {
      throw new Error(`Invalid addAtPath: ${addAtPath}`);
    }
    if (!contentItem.components || !Array.isArray(contentItem.components) || contentItem.components.length === 0) {
      throw new Error("Content item does not have a components array");
    }
    if (
      contentItem.components.filter((component: Component) => component.path === "/" && component.type === "page")
        .length === 0
    ) {
      throw new Error("Content item does not have a page component at the root path");
    }

    const [regionPath, pathTargetIndex] = getRootAndIndex(addAtPath);

    const inSameRegionPattern = new RegExp(`^${regionPath}\\d+`);

    const componentsInSameRegion = contentItem.components.filter((component: Component) =>
      (component.path || "").match(inSameRegionPattern),
    );
    const componentsNotInSameRegion = contentItem.components.filter(
      (component: Component) => !(component.path || "").match(inSameRegionPattern),
    );
    const componentsBeforeInsertionInRegion = componentsInSameRegion.filter((component: Component) => {
      const index = getIndexInRegion(component, regionPath);
      return index < pathTargetIndex;
    });
    const componentsAfterInsertionInRegion = componentsInSameRegion
      .filter((component: Component) => {
        const index = getIndexInRegion(component, regionPath);
        return index >= pathTargetIndex;
      })
      .map((component: Component) => {
        const index = getIndexInRegion(component, regionPath);
        return {
          ...component,
          path: `${regionPath}${index + 1}`,
        };
      });


    const reMergedComponents = [
      ...componentsNotInSameRegion,
      ...componentsBeforeInsertionInRegion,
      {
        ...{
          path: addAtPath,
          type: "##########################################################################################################",
        },
      },
      ...componentsAfterInsertionInRegion,
    ];
  },
};
