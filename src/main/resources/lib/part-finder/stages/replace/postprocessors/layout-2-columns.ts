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

type Layout2ColumnsConfig = {
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

const verifyAndGetConfig = (currentComponentConfig?: ComponentConfig<Layout2ColumnsConfig>): Layout2ColumnsConfig => {
  if (currentComponentConfig?.layout?._selected !== "two") {
    throw Error(
      `Can only convert to layout 'layout-2-columns' when the selected number of columns(layout._selected) is "two". Found value: ${JSON.stringify(currentComponentConfig?.layout?._selected)}`,
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
      `'layout-2-columns' should only use distribution setting "1-1", "1-2" or "2-1". Handle manually. ${JSON.stringify(distributionConfig)}`,
    );
  }
  if (twoColumnConfig.addPadding) {
    throw Error(
      `The "Add padding inside columns" option (addPadding) has been removed in 'layout-2-columns'. If this really is needed, handle it manually with the child components instead.`,
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
    (component, currentComponentConfig: ComponentConfig<Layout2ColumnsConfig>) => {
      const twoColumnConfig = verifyAndGetConfig(currentComponentConfig);

      for (const key in twoColumnConfig) {
        currentComponentConfig[key] = twoColumnConfig[key];
      }
      delete currentComponentConfig.layout;

      component[targetComponentType].config[newAppKeyDashed][newComponentKey] = currentComponentConfig;
    },
  );
};
