import { PARAM, PARAM_VAL, PREFIX } from "/lib/part-finder/utils/params";

export type ComponentView = {
  key: string;
  type: string;
  contents: Usage[];
  headings: Heading[];
};

export type AriaSortDirection = "ascending" | "descending";

export type Heading = {
  text: string;
  name: string;
  url: string;
  sortDirection?: AriaSortDirection;
};

export type ComponentViewParams = {
  currentItem?: ComponentView;
  configQuery?: string;
  repoParam?: string;
  displayReplaceSelectors?: string;
  allIds?: string;
  oldItemKey?: string;
  newItemToolUrl?: string;
  PARAM: typeof PARAM;
  PARAM_VAL: typeof PARAM_VAL;
  PREFIX: typeof PREFIX;
};

export type Usage = {
  url: string;
  displayName: string;
  type: string;
  path: string;
};
