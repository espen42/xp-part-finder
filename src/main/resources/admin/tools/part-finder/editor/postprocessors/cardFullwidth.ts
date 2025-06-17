import {ContentitemMutatingPostprocessorFunc, postprocessAndMutateComponent} from "./index";
import {ContentItem} from "/admin/tools/part-finder/editor/editor";

export const cardFullwidth: ContentitemMutatingPostprocessorFunc = (
  contentItem: ContentItem,
  changedPaths: string[],
) => {
  changedPaths.forEach((path) => {
    postprocessAndMutateComponent(contentItem, path, (component, currentComponentConfig) => {
      if (currentComponentConfig.video) {
        log.warning("Invalid component: " + JSON.stringify(component));
        throw Error(`Not implemented yet: postprocessor 'cardFullwidth' shouldn't be used with video`);
      }

      currentComponentConfig.linkOrButtons = currentComponentConfig.linkOrButtons || {};
      const correctLinkOrButtons = currentComponentConfig.linkOrButtons;

      const oldLinkType = currentComponentConfig?.linkType || {};
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
        correctButtonConfig.text = correctButtonConfig.text || currentComponentConfig.linkText;
        correctButtonConfig.newTab = correctButtonConfig.newTab || currentComponentConfig.newTab;

        // TODO: Keep this disabled until the undo functionality can reverse postprocessing, or the part-mover adds duplicates instead of rewriting existing instances:
        //
        //delete config.linkType;
        //delete config.linkText;
        //delete config.newTab;
      }

      currentComponentConfig.highlightErrors = true;
    });
  });

  return contentItem;
};
