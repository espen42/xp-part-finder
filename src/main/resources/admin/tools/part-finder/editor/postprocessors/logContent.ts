import { ContentitemMutatingPostprocessorFunc } from "/admin/tools/part-finder/editor/postprocessors/index";

export const logContent: ContentitemMutatingPostprocessorFunc = (contentItem) => {
  log.info("\n\n\n##############################\n\ncontentItem logger: " + JSON.stringify(contentItem) + "\n\n\n");
};
