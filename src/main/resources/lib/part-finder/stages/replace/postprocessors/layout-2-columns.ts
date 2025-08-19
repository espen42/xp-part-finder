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

const verifyAndGetConfig = (currentComponentConfig?: ComponentConfig<LayoutNColumnsConfig>): LayoutNColumnsConfig => {
  if (currentComponentConfig?.layout?._selected !== "two") {
    throw Error(
      `Can only convert to layout 'layout-2-columns' when the selected number of columns is 2 (layout._selected = "two"). Found value: ${JSON.stringify(currentComponentConfig?.layout?._selected)}`,
    );
  }

  const twoColumnConfig = currentComponentConfig.layout.two;

  if (twoColumnConfig.backgroundLeft || twoColumnConfig.backgroundRight) {
    throw Error(
      `Layout 'layout-2-columns' shouldn't have background color set. Handle manually. ${JSON.stringify({ backgroundLeft: twoColumnConfig.backgroundLeft, backgroundRight: twoColumnConfig.backgroundRight })}`,
    );
  }
  const distributionConfig = twoColumnConfig.distribution || "";
  if (["1-1", "1-2", "2-1"].indexOf(distributionConfig) === -1) {
    throw Error(
      `Layout 'layout-2-columns' should only use distribution setting "1-1", "1-2" or "2-1". Handle manually. ${JSON.stringify(distributionConfig)}`,
    );
  }
  const isFlex = twoColumnConfig.isFlex;
  if (isFlex) {
    throw Error(
      `Flex columns (equal height) is not implemented in layout-2-columns yet. Handle manually. ${JSON.stringify({ isFlex })}`,
    );
  }

  return twoColumnConfig;
};

export const layout2Columns: ContentitemMutatingPostprocessorFunc = (
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
      const twoColumnConfig = verifyAndGetConfig(currentComponentConfig);

      for (const key in twoColumnConfig) {
        currentComponentConfig[key] = twoColumnConfig[key];
      }
      delete currentComponentConfig.layout;

      component[targetComponentType].config[newAppKeyDashed][newComponentKey] = currentComponentConfig;

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
