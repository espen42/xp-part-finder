export type ComponentView = {
  key: string;
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
};

export type Usage = {
  url: string;
  displayName: string;
  type: string;
  path: string;
};
