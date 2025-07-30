import {
  ContentitemMutatingPostprocessorFunc,
  postprocessAndMutateComponent,
} from "/lib/part-finder/stages/replace/postprocessors";

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
