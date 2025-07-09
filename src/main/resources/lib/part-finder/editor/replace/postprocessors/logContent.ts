import { ContentitemMutatingPostprocessorFunc } from "/lib/part-finder/editor/replace/postprocessors";

export const logContent: ContentitemMutatingPostprocessorFunc = (contentItem) => {
  log.info("\n\n\n##############################\n\ncontentItem logger: " + JSON.stringify(contentItem) + "\n\n\n");
};
