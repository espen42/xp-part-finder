import type { ComponentItem } from "/admin/tools/part-finder/part-finder.freemarker";

export type ComponentViewParams = {
  currentItem?: ComponentItem;
  getvalue?: string;
  displayReplacer: boolean;
  displaySummaryAndUndo: boolean;
};
