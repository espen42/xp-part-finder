export type ComponentList = {
  itemLists: ItemList[];
  currentItemKey?: string;
};

export type ItemList = {
  title: string;
  items: ComponentItem[];
};

export type ComponentItem = {
  key: string;
  displayName: string;
  total: number;
  url: string;
  contents: Usage[];
};

export type Usage = {
  url: string;
  displayName: string;
  path: string;
};

export type ToolbarParams = {
  filters: Link[];
};

export type Link = {
  text: string;
  url: string;
  current: boolean;
};
