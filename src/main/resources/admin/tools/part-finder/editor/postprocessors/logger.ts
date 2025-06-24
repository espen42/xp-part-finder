import { ContentItem } from "/admin/tools/part-finder/editor/editor";
import { contentRegionMutators } from "/admin/tools/part-finder/editor/regionEditing";

export const logger = (contentItem: ContentItem) => {
  log.info("contentItem logger: " + JSON.stringify(contentItem));

  contentRegionMutators.addComponent(contentItem, {}, "/main/4");

  return contentItem;
};
