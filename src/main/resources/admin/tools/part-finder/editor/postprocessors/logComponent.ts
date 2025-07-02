import {
  ContentitemMutatingPostprocessorFunc,
  postprocessAndMutateComponent,
} from "/admin/tools/part-finder/editor/postprocessors/index";

export const logComponent: ContentitemMutatingPostprocessorFunc = (contentItem, componentPath) => {
  postprocessAndMutateComponent(contentItem, componentPath, (component) => {
    log.info(
      "\n\n\n##############################\n\nComponent logger - " +
        componentPath +
        ": " +
        JSON.stringify(component) +
        "\n\n\n",
    );
  });
};
