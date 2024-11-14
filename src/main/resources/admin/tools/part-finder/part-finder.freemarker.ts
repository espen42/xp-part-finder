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
  targetSubValue?: SubValue;
  hideSelector?: boolean;
};

type UsagePaths = Record<string, UsagePathSubvalue[] | null>;

export type UsagePathSubvalue = {
  path: string;
  targetSubValue?: SubValue;
};

type SubValue = string | number | boolean | null;
