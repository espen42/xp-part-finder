import { findIndex } from "/lib/part-finder/utils";

export const postprocessComponent = (contentItem, componentPath, postprocessorFunc) => {
  const index = findIndex<{ path: string }>(contentItem.components || [], (comp) => comp.path === componentPath);
  if (index === -1) {
    throw Error(
      `Postprocessing component with path '${componentPath}', but no matching path was found in the cloned content item`,
    );
  }

  const component = contentItem.components[index];
  const nestedComp = component[component.type];
  const descriptors = nestedComp.descriptor.replace(/\./g, "-").split(":");
  const config = nestedComp.config[descriptors[0]][descriptors[1]];

  postprocessorFunc(component, config, nestedComp.descriptor);
};
