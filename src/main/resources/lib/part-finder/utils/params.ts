import { SORT_FUNCS } from "/lib/part-finder/utils/sorting";
import type { ComponentDescriptorType } from "/lib/xp/schema";

export type UriParams = {
  key: string;
  type: ComponentDescriptorType;
  repo?: string;
  replace?: string;
  getconfig?: string;
  archive?: string;
  sort?: SortParam;
  unused?: string;
};

export type PartFinderQueryParams = {
  key: string;
  type: ComponentDescriptorType;
  new_part_ref?: string;
  postprocessors?: string;
  sort?: string;
  dir?: string;
  replace?: string;
  getconfig?: string;
  repo?: string;
  archive?: string;
  unused?: string;
  review?: string;
};

export const PARAM = {
  replace: "replace",
  getconfig: "getconfig",
  archive: "archive",
  sort: "sort",
  key: "key",
  unused: "unused",
  repo: "repo",
  type: "type",
  new_part_ref: "new_part_ref",
  postprocessors: "postprocessors",
  dir: "dir",
  review: "review",
} as const satisfies Record<keyof PartFinderQueryParams, string>;

export const PREFIX = {
  contentHash: "contenthash__",
  radioButtonGroup: "radio--",
  deleteOld: "delete-old--",
  deleteNew: "delete-new--",
  selectItem: "select-item--",
} as const satisfies Record<string, "contenthash__" | "radio--" | "delete-old--" | "delete-new--" | "select-item--">;

const ComponentKey = {
  PART: "PART",
  LAYOUT: "LAYOUT",
  PAGE: "PAGE",
} as const satisfies Record<string, ComponentDescriptorType>;

export const SortKey = {
  alphaAsc: "alphaasc",
  alphaDesc: "alphadesc",
  countAsc: "countasc",
  countDesc: "countdesc",
} as const satisfies Record<string, "alphaasc" | "alphadesc" | "countasc" | "countdesc">;

export type SortParam = (typeof SortKey)[keyof typeof SortKey];

export const PARAM_VAL = {
  undefined: "undefined",
  false: "false",
  true: "true",
  ...ComponentKey,
  ...SortKey,
};

const RX_IS_UNDEFINED = new RegExp(`^${PARAM_VAL.undefined}$`, "i");
const RX_IS_FALSE = new RegExp(`^${PARAM_VAL.false}$`, "i");
const RX_STARTSWITH_CONTENTHASH = new RegExp(`^${PREFIX.contentHash}`);

/**
 * Returns a URI-parameter string for the given param and value.
 * Starts with '&', so ASSUMES that at least one URI param has been added before it, hence 'ADDuriParam'.
 * May be conditional, if a boolean is added; without a boolean, the param is always added.
 */
export const addUriParam = (param: string, value: string | undefined, condition?: boolean): string =>
  condition === true || condition === undefined ? `&${param}=${encodeURIComponent((value || "").trim())}` : "";

export const trimString = (str: string | undefined) => ((str || "") + "").trim();

export const getParamString = (
  req: XP.Request<PartFinderQueryParams>,
  paramName: (typeof PARAM)[keyof typeof PARAM],
): string => (req.params[paramName] + "").trim().toLowerCase().replace(RX_IS_UNDEFINED, "");

export const getParamBool = (
  req: XP.Request<PartFinderQueryParams>,
  paramName: (typeof PARAM)[keyof typeof PARAM],
): string => getParamString(req, paramName).replace(RX_IS_FALSE, "");

export const getDisplayReplacerParam = (req: XP.Request<PartFinderQueryParams>) => getParamBool(req, PARAM.replace);

export const getRepoParam = (req: XP.Request<PartFinderQueryParams>) => getParamString(req, PARAM.repo);

export const getDisplayArchiveParam = (req: XP.Request<PartFinderQueryParams>) => getParamBool(req, PARAM.archive);

export const getControlHashesParam = (req: XP.Request<PartFinderQueryParams>): Record<string, string> => {
  const contentHashKeys = Object.keys(req.params).filter((param) => param.match(RX_STARTSWITH_CONTENTHASH));
  const controlHashes = {};
  contentHashKeys.forEach((key) => {
    const controlHash = req.params[key];
    const contentId = key.replace(RX_STARTSWITH_CONTENTHASH, "");
    controlHashes[contentId] = controlHash;
  });
  return controlHashes;
};

export const getSortParam = (req: XP.Request<PartFinderQueryParams>): SortParam | "" => {
  const paramValue = getParamBool(req, PARAM.sort);
  return SORT_FUNCS[paramValue] ? (paramValue as SortParam) : "";
};

export const getDisplayUnusedParam = (req) => getParamBool(req, PARAM.unused);
