import { ContentItem } from "/admin/tools/part-finder/editor/editor";

export const logContent = (contentItem: ContentItem) => {
  log.info("\n\n\n##############################\n\ncontentItem logger: " + JSON.stringify(contentItem) + "\n\n\n");

  return contentItem;
};
