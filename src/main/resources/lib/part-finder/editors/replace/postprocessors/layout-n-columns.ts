import {
  ContentitemMutatingPostprocessorFunc,
  postprocessAndMutateComponent,
} from "/lib/part-finder/editors/replace/postprocessors";

export const layoutNColumns: ContentitemMutatingPostprocessorFunc = (
  contentItem,
  changedPath,
  targetComponentType,
  newAppKeyDashed,
  newComponentKey,
) => {
  postprocessAndMutateComponent(contentItem, changedPath, (component) => {
    const layoutConfig = {
      ...(((component[targetComponentType].config || {})[newAppKeyDashed] || {})[newComponentKey] || {}),
    };

    if (
      Object.keys(layoutConfig).length &&
      layoutConfig.layout?._selected &&
      layoutConfig.layout[layoutConfig.layout._selected]
    ) {
      log.info(
        `    Also migrating ${targetComponentType}'s config.layout['${layoutConfig.layout._selected}'] down to .config`,
      );
      for (const key in layoutConfig.layout[layoutConfig.layout._selected]) {
        layoutConfig[key] = layoutConfig.layout[layoutConfig.layout._selected][key];
      }
      delete layoutConfig.layout[layoutConfig.layout._selected];
      delete layoutConfig.layout._selected;

      component[targetComponentType].config[newAppKeyDashed][newComponentKey] = layoutConfig;
    }

    /*
   const config = currentComponentConfig || {};

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
     //delete config.linkType;
     //delete config.linkText;
     //delete config.newTab;
   }

   config.highlightErrors = true; */
  });
};
