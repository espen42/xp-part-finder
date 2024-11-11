/* Recursive */
const editComponentTree = (
  component,
  newDescriptor,
  targetDescriptor,
  targetComponentType,
  targetComponentPath,
  contentItem,
) => {
  const newComponent = {
    ...component,
  };

  if (
    component?.descriptor === targetDescriptor &&
    component.type === targetComponentType &&
    (targetComponentPath === null || component.path === targetComponentPath)
  ) {
    log.info(
      `Replacing ${targetComponentType} on content item '${contentItem._path || ""}' (id ${contentItem._id}${
        targetComponentPath !== null ? ", path: " + JSON.stringify(targetComponentPath) : ""
      }), from '${targetDescriptor}' to '${newDescriptor}'`,
    );

    newComponent.descriptor = newDescriptor;
  }

  if (component?.regions) {
    const newRegions = {};
    Object.keys(component.regions).forEach((regionName) => {
      const region = component.regions[regionName];
      newRegions[regionName] = {
        ...region,
        components: (region.components || []).map((componentInRegion) => {

          return editComponentTree(
            componentInRegion,
            newDescriptor,
            targetDescriptor,
            targetComponentType,
            targetComponentPath,
            contentItem,
          );
        }),
      };
    });
    newComponent.regions = newRegions;
  }
  return newComponent;
};

export const createEditorFunc = (
  targetDescriptor: string,
  newDescriptor: string,
  targetComponentType: string,
  componentPathsPerId: Record<string, string[] | null>,
) => {

  const editor = (contentItem) => {
    contentItem.displayName = "Modified";

    const id = contentItem?._id;
    const targetComponentPaths = componentPathsPerId[id] === null
      ? [null]
      : componentPathsPerId[id];

    for (const targetComponentPath of targetComponentPaths) {

      try {
        contentItem.page = editComponentTree(
          contentItem.page,
          newDescriptor,
          targetDescriptor,
          targetComponentType,
          targetComponentPath,
          contentItem,
        );

      } catch (e) {
        log.error(e);
      }
    }

    log.info(JSON.stringify(contentItem, null, 2));
    return contentItem;
  };

  return editor;
};
