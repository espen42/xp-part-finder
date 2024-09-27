export type ComponentList = {
  itemLists: ItemList[];
  currentItemKey?: string;
  currentAppKey?: string;
};

export type ItemList = {
  title: string;
  items: ComponentItem[];
};

export type ComponentItem = {
  key: string;
  type: string;
  displayName: string;
  total: number;
  url: string;
  contents: Usage[];
};

export type Usage = {
  url: string;
  displayName: string;
  path: string;
  id: string;
};
