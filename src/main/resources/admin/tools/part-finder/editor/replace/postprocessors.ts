import { findIndex } from "/lib/part-finder/utils";
import { NodeIndexConfig } from "/lib/xp/node";
import { Component } from "@enonic-types/lib-content";
import { ContentItem } from "/admin/tools/part-finder/editor";
import { cardFullwidth } from "/admin/tools/part-finder/editor/replace/postprocessors/cardFullwidth";
import { layoutNColumns } from "/admin/tools/part-finder/editor/replace/postprocessors/layout-n-columns";
import { throwerror } from "/admin/tools/part-finder/editor/replace/postprocessors/throwerror";
import { logContent } from "/admin/tools/part-finder/editor/replace/postprocessors/logContent";
import { logConfig } from "/admin/tools/part-finder/editor/replace/postprocessors/logConfig";
import { logComponent } from "/admin/tools/part-finder/editor/replace/postprocessors/logComponent";

// Available postprocessors:
// key in this object:  processor names, available to refer to from URL parameter on POST when changing/replacing component names. Eg: ...?postprocess=logger
// value:               postprocessor function, must have the signature ((contentItem, changedComponentPaths?) -> contentItem)
export const POSTPROCESSORS: { [callableName: string]: ContentitemMutatingPostprocessorFunc } = {
  // Utilities
  logContent,
  "log-content": logContent,
  logcontent: logContent,

  logComponent,
  "log-component": logComponent,
  logcomponent: logComponent,

  logConfig,
  "log-config": logConfig,
  logconfig: logConfig,

  throwerror,

  //---- Component-specific postprocessors ----
  cardfullwidth: cardFullwidth,
  "card-fullwidth": cardFullwidth,
  fullwidthcard: cardFullwidth,

  layoutcolumns: layoutNColumns,
  layoutncolumns: layoutNColumns,
  "layout-n-columns": layoutNColumns,
};

export interface ContentitemMutatingPostprocessorFunc {
  (
    currentContentItem: ContentItem,
    changedComponentPath: string,
    targetComponentType: string,
    newAppKeyDashed: string,
    newComponentKey: string,
  ): void;
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
  mutateComponentFunc: ComponentMutatingPostprocessorFunc,
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
  mutateComponentFunc(component, config, descriptor);
};

export const postprocessAndMutateChangedComponents = (
  contentItem: ContentItem,
  changedPaths: string[],
  mutateComponentFunc: ComponentMutatingPostprocessorFunc,
) => {
  changedPaths.forEach((path) => postprocessAndMutateComponent(contentItem, path, mutateComponentFunc));
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
