import { findIndex } from "/lib/part-finder/utils";
import {NodeIndexConfig, NodePropertiesOnModify, NodePropertiesOnRead} from "/lib/xp/node";
import {Content, Component} from "@enonic-types/core";


/*export type ComponentConfig = {
  [propName: string]: any;
} & NodeIndexConfig
export interface Component {
  type: string;   // specify type strings
  path: string;
}
export type ContentItem = {
  components: Component[];
} & NodePropertiesOnModify; */

export interface ContentitemMutatingPostprocessorFunc {
  (
    currentContentItem: Content,
    changedComponentPaths: string[],
    targetComponentType: string,
    newAppKeyDashed: string,
    newComponentKey: string
  ): Content
}

export interface ComponentMutatingPostprocessorFunc {
  (
    component: Component,
    currentComponentConfig: NodeIndexConfig,
    descriptor: string
  ): void;
}



export const postprocessAndMutateComponent = (
  contentItem: Content,
  componentPath: string,
  postprocessorFunc: ComponentMutatingPostprocessorFunc
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

