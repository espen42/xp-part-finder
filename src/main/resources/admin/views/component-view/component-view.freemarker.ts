export type ComponentView = {
  key: string;
  contents: Usage[];
};

export type ComponentViewParams = {
  currentItem?: ComponentView;
};

export type Usage = {
  url: string;
  displayName: string;
  path: string;
};
