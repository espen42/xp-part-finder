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
  getconfig?: string;
  repoParam?: string;
  displayReplacer?: string;
  displaySummaryAndUndo?: boolean;
  allIds?: string;
};

export type Usage = {
  url: string;
  displayName: string;
  type: string;
  path: string;
};
