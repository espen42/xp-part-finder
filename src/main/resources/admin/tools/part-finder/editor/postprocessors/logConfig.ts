import { ContentItem } from "/admin/tools/part-finder/editor/editor";
import { postprocessAndMutateComponent } from "/admin/tools/part-finder/editor/postprocessors/index";

export const logConfig = (contentItem: ContentItem, changedPaths) => {
  changedPaths.forEach((componentPath) => {
    postprocessAndMutateComponent(contentItem, componentPath, (_, currentComponentConfig) => {
      log.info(
        "\n\n\n##############################\n\nConfig logger - " +
          componentPath +
          ": " +
          JSON.stringify(currentComponentConfig) +
          "\n\n\n",
      );
    });
  });

  return contentItem;
};
