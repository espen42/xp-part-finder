import { ContentItem } from "/admin/tools/part-finder/editor/editor";
import { postprocessAndMutateComponent } from "/admin/tools/part-finder/editor/postprocessors/index";

export const logComponent = (contentItem: ContentItem, changedPaths) => {
  changedPaths.forEach((componentPath) => {
    postprocessAndMutateComponent(contentItem, componentPath, (component) => {
      log.info(
        "\n\n\n##############################\n\nComponent logger - " +
          componentPath +
          ": " +
          JSON.stringify(component) +
          "\n\n\n",
      );
    });
  });

  return contentItem;
};
