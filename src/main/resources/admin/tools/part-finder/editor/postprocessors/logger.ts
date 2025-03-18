export const logger = (contentItem) => {
  log.info("contentItem logger: " + JSON.stringify(contentItem));
  return contentItem;
};
