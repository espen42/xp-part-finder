import {ContentItem} from "/admin/tools/part-finder/editor/editor";

export const logger = (contentItem: ContentItem) => {
  log.info("contentItem logger: " + JSON.stringify(contentItem));
  return contentItem;
};
