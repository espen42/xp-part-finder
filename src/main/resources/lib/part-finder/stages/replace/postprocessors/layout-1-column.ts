import {
  ComponentConfig,
  ContentitemMutatingPostprocessorFunc,
  postprocessAndMutateComponent,
} from "/lib/part-finder/stages/replace/postprocessors";

type LayoutSelection = "one" | "two" | "three";
type BgColor = "" | "gray" | "white" | "primaryLighter";
type Distribution = "1-1" | "1-2" | "2-1" | "1-1-compressed";

type MovedConfig = {
  distribution?: Distribution;
};

type Layout1ColumnsConfig = {
  layout?: {
    _selected?: LayoutSelection;
  } & Record<
    LayoutSelection,
    {
      isFlex?: boolean;
      addPadding?: boolean;
      backgroundLeft?: BgColor;
      backgroundRight?: BgColor;
    } & MovedConfig
  >;
  marginTop?: boolean;
  marginBottom?: boolean;
} & MovedConfig;

const verifyAndGetConfig = (currentComponentConfig?: ComponentConfig<Layout1ColumnsConfig>): Layout1ColumnsConfig => {
  if (currentComponentConfig?.layout?._selected !== "one") {
    throw Error(
      `Can only convert to layout 'layout-1-column' when the selected number of columns (layout._selected) is "one". Found value: ${JSON.stringify(currentComponentConfig?.layout?._selected)}`,
    );
  }

  const oneColumnConfig = currentComponentConfig.layout.one;

  return oneColumnConfig;
};

export const layout1Column: ContentitemMutatingPostprocessorFunc = (
  contentItem,
  changedPath,
  targetComponentType,
  newAppKeyDashed,
  newComponentKey,
) => {
  postprocessAndMutateComponent(
    contentItem,
    changedPath,
    (component, currentComponentConfig: ComponentConfig<Layout1ColumnsConfig>) => {
      const twoColumnConfig = verifyAndGetConfig(currentComponentConfig);

      for (const key in twoColumnConfig) {
        currentComponentConfig[key] = twoColumnConfig[key];
      }
      delete currentComponentConfig.layout;

      component[targetComponentType].config[newAppKeyDashed][newComponentKey] = currentComponentConfig;
    },
  );
};
