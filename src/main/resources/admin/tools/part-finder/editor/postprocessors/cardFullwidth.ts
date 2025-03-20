import { postprocessComponent } from "./index";

export const cardFullwidth = (contentItem, changedPaths) => {
  changedPaths.forEach((path) => {
    postprocessComponent(contentItem, path, (component, config) => {
      if (!component.descriptor.endsWith("banner-with-image-hw")) {
        log.warning("Invalid component: " + JSON.stringify(component));
        throw Error(
          `Postprocessor 'cardFullwidth' is written for component(s) of type 'banner-with-image-hw'. Found: '${component.descriptor}'`,
        );
      }

      config = config || {};

      if (config.video) {
        log.warning("Invalid component: " + JSON.stringify(component));
        throw Error(`Not implemented yet: postprocessor 'cardFullwidth' shouldn't be used with video`);
      }

      config.linkOrButtons = config.linkOrButtons || {};
      const correctLinkOrButtons = config.linkOrButtons;

      const oldLinkType = config?.linkType || {};
      correctLinkOrButtons._selected = correctLinkOrButtons._selected || oldLinkType._selected;

      const correctButtonSelection = correctLinkOrButtons._selected;

      const oldLinkTypeConfig = oldLinkType[oldLinkType._selected] || {};

      correctLinkOrButtons[correctButtonSelection] = correctLinkOrButtons[correctButtonSelection] || {};
      const correctButtonConfig = correctLinkOrButtons[correctButtonSelection];

      if (correctButtonSelection === "internalLink" || correctButtonSelection === "externalLink") {
        switch (correctButtonSelection) {
          case "internalLink":
            correctButtonConfig.id = correctButtonConfig.id || oldLinkTypeConfig.internalLink;
            break;
          case "externalLink":
            correctButtonConfig.url = correctButtonConfig.url || oldLinkTypeConfig.externalLink;
            break;
        }
        correctButtonConfig.text = correctButtonConfig.text || config.linkText;
        correctButtonConfig.newTab = correctButtonConfig.newTab || config.newTab;

        // TODO: Keep this disabled until the undo functionality can reverse postprocessing, or the part-mover adds duplicates instead of rewriting existing instances:
        //
        delete config.linkType;
        delete config.linkText;
        delete config.newTab;
      }

      config.highlightErrors = true;
    });
  });

  return contentItem;
};
