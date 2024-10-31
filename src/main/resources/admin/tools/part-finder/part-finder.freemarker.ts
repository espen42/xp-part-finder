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
  contents: ContentUsage[];
};

export type ContentUsage = {
  url: string;
  displayName: string;
  path: string;
  id: string;
  error?: string;
  usagePaths?: UsagePaths;
  hasMultiUsage?: boolean;
  multiUsage: MultiUsageInstance[];
};

export type MultiUsageInstance = {
  path: string;
  error?: string;
};

type UsagePaths = Record<string, string[] | null>;
