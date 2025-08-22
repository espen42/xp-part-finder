import {
  ComponentConfig,
  ContentitemMutatingPostprocessorFunc,
  postprocessAndMutateComponent,
} from "/lib/part-finder/stages/replace/postprocessors";

type LayoutSelection = "one" | "two" | "three";
type ColumnSelection = "default" | "boxes";
type BgColor = "" | "gray" | "white" | "primaryLighter";

type Layout3ColumnsConfig = {
  layout?: {
    _selected?: LayoutSelection;
  } & Record<
    LayoutSelection,
    {
      columnLayout: {
        _selected?: ColumnSelection;
        default?: unknown;
        boxes?: {
          fullColumn?: boolean;
          backgroundLeft?: BgColor;
          backgroundRight?: BgColor;
          backgroundMiddle?: BgColor;
        };
      };
    }
  >;
  marginTop?: boolean;
  marginBottom?: boolean;
};

const verifyAndGetColumnLayoutConfig = (
  currentComponentConfig?: ComponentConfig<Layout3ColumnsConfig>,
): {
  _selected?: ColumnSelection;
  default?: unknown;
  boxes?: { fullColumn?: boolean; backgroundLeft?: BgColor; backgroundRight?: BgColor; backgroundMiddle?: BgColor };
} => {
  if (currentComponentConfig?.layout?._selected !== "three") {
    throw Error(
      `Can only convert to layout 'layout-3-columns' when the selected number of columns (layout._selected) is "three"). Found value: ${JSON.stringify(currentComponentConfig?.layout?._selected)}`,
    );
  }

  const threeColumnConfig = currentComponentConfig.layout.three;
  if (threeColumnConfig?.columnLayout?._selected === "boxes") {
    const boxesConfig = threeColumnConfig.columnLayout.boxes || {};
    if (boxesConfig.backgroundLeft || boxesConfig.backgroundMiddle || boxesConfig.backgroundRight) {
      throw Error(
        `Layout 'layout-3-columns' shouldn't have background color set. Handle manually. ${JSON.stringify({ backgroundLeft: boxesConfig.backgroundLeft, backgrounMiddle: boxesConfig.backgroundMiddle, backgroundRight: boxesConfig.backgroundRight })}`,
      );
    }
  } else {
    threeColumnConfig.columnLayout.boxes = {};
  }

  return threeColumnConfig.columnLayout;
};

export const layout3Columns: ContentitemMutatingPostprocessorFunc = (
  contentItem,
  changedPath,
  targetComponentType,
  newAppKeyDashed,
  newComponentKey,
) => {
  postprocessAndMutateComponent(
    contentItem,
    changedPath,
    (component, currentComponentConfig: ComponentConfig<Layout3ColumnsConfig>) => {
      const columnLayoutConfig = verifyAndGetColumnLayoutConfig(currentComponentConfig);

      for (const key in columnLayoutConfig) {
        currentComponentConfig[key] = columnLayoutConfig[key];
      }
      delete currentComponentConfig.layout;

      component[targetComponentType].config[newAppKeyDashed][newComponentKey] = currentComponentConfig;
    },
  );
};
