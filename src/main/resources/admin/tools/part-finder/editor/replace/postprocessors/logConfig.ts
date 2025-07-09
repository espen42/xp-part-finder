import {
  ContentitemMutatingPostprocessorFunc,
  postprocessAndMutateComponent,
} from "/admin/tools/part-finder/editor/replace/postprocessors";

export const logConfig: ContentitemMutatingPostprocessorFunc = (contentItem, componentPath) => {
  postprocessAndMutateComponent(contentItem, componentPath, (_, currentComponentConfig) => {
    log.info(
      "\n\n\n##############################\n\nConfig logger - " +
        componentPath +
        ": " +
        JSON.stringify(currentComponentConfig) +
        "\n\n\n",
    );
  });
};
