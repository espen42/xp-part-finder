import { findIndex } from "/lib/part-finder/utils";
import { NodeIndexConfig } from "/lib/xp/node";
import { Component } from "@enonic-types/lib-content";
import { ContentItem } from "/admin/tools/part-finder/editor/editor";

export interface ContentitemMutatingPostprocessorFunc {
  (
    currentContentItem: ContentItem,
    changedComponentPaths: string[],
    targetComponentType: string,
    newAppKeyDashed: string,
    newComponentKey: string,
  ): ContentItem;
}

export interface ComponentMutatingPostprocessorFunc {
  (component: Component, currentComponentConfig: NodeIndexConfig, descriptor: string): void;
}

const getConfigAndDescriptor = (component: Component): { config: NodeIndexConfig; descriptor: string } => {
  const nestedComp = component[component.type];
  const descriptors = nestedComp.descriptor.replace(/\./g, "-").split(":");
  const config = nestedComp.config[descriptors[0]][descriptors[1]];
  return {
    config: config || {},
    descriptor: nestedComp.descriptor,
  };
};

export const postprocessAndMutateComponent = (
  contentItem: ContentItem,
  componentPath: string,
  mutateComponent: ComponentMutatingPostprocessorFunc,
) => {
  const index = findIndex<Component>(contentItem.components || [], (comp) => comp.path === componentPath);
  if (index === -1) {
    throw Error(
      `Postprocessing component with path '${componentPath}', but no matching path was found in the cloned content item`,
    );
  }

  const component = contentItem.components[index];
  const { config, descriptor } = getConfigAndDescriptor(contentItem.components[index]);

  // Do the postprocessing with the function provided by the caller (see the postprocessor modules: cardFullwidth.ts, logger.ts, etc.):
  mutateComponent(component, config, descriptor);
};

// Offer a utility function to the postprocessor modules, to inject a modified configuration object into the component, mutating it
export const replaceComponentConfig = (component: Component, newConfig: NodeIndexConfig) => {
  const { config } = getConfigAndDescriptor(component);

  const originalKeys = Object.keys(config);
  const processedKeys = Object.keys(newConfig);

  processedKeys.forEach((key) => {
    config[key] = newConfig[key];
  });
  originalKeys
    .filter((key) => processedKeys.indexOf(key) === -1)
    .forEach((key) => {
      delete config[key];
    });
};
