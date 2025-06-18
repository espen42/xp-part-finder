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

export const postprocessAndMutateComponent = (
  contentItem: ContentItem,
  componentPath: string,
  postprocessorFunc: ComponentMutatingPostprocessorFunc,
) => {
  const index = findIndex<Component>(contentItem.components || [], (comp) => comp.path === componentPath);
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
