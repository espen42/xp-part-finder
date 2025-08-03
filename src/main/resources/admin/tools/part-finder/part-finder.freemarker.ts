import { ComponentNavLinkList } from "/admin/views/navigation/navigation.freemarker";
import { Operation } from "/lib/part-finder/utils/plannedOperations";

export type ComponentList = {
  itemLists: ComponentNavLinkList[];
  noSchemaItems: ComponentNavLinkList[];
  unusedItems: ComponentNavLinkList[];
  hasNoschema: boolean;
  hasUnused: boolean;
  currentItemKey?: string;
  currentAppKey?: string;
};

export type ComponentItem = {
  key: string;
  url: string;
  type: string;
  displayName: string;
  total: number;
  contents: ContentUsage[];
};

/** Presentation item: corresponds to one content item.
 * Has a post-editing data control hash string and a list of usages of the component type in question
 * - or a presentable error if the process failed at any point for that content item. */
export type ContentUsage = {
  url: string;
  displayName: string;
  type: string;
  repo: string;
  path: string;
  id: string;
  controlHash: string | null;
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
  oldPath?: string;
  newPath?: string;
  operation?: Operation | string;
};

type UsagePaths = Record<string, UsagePathSubvalue[] | null>;

export type UsagePathSubvalue = {
  path: string;
  targetSubValue?: SubValue;
};

type SubValue = string | number | boolean | null;
