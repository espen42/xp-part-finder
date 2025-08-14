import {
  ComponentConfig,
  ContentitemMutatingPostprocessorFunc,
  postprocessAndMutateComponent,
} from "/lib/part-finder/stages/replace/postprocessors";

type Selection = "one" | "two" | "three";
type BgColor = "" | "gray" | "white" | "primaryLighter";
type Distribution = "1-1" | "1-2" | "2-1" | "1-1-compressed";
type LayoutNColumnsConfig = {
  layout?: {
    _selected?: Selection;
  } & Record<
    Selection,
    {
      distribution?: Distribution;
      isFlex?: boolean;
      addPadding?: boolean;
      backgroundLeft?: BgColor;
      backgroundRight?: BgColor;
    }
  >;
  marginTop?: boolean;
  marginBottom?: boolean;
  distribution?: Distribution;
  isFlex?: boolean;
  addPadding?: boolean;
};

export const layoutNColumns: ContentitemMutatingPostprocessorFunc = (
  contentItem,
  changedPath,
  targetComponentType,
  newAppKeyDashed,
  newComponentKey,
) => {
  postprocessAndMutateComponent(
    contentItem,
    changedPath,
    (component, currentComponentConfig: ComponentConfig<LayoutNColumnsConfig>) => {
      log.info(
        `    Also migrating ${targetComponentType}'s config.layout['${layoutConfig.layout._selected}'] down to .config`,
      );

      if (
        Object.keys(currentComponentConfig).length &&
        currentComponentConfig.layout?._selected &&
        currentComponentConfig.layout[currentComponentConfig.layout._selected]
      ) {
        for (const key in currentComponentConfig.layout[currentComponentConfig.layout._selected]) {
          currentComponentConfig[key] = currentComponentConfig.layout[currentComponentConfig.layout._selected][key];
        }
        delete currentComponentConfig.layout;

        component[targetComponentType].config[newAppKeyDashed][newComponentKey] = currentComponentConfig;

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
    },
  );
};
