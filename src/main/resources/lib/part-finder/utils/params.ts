import { SORT_FUNCS } from "/lib/part-finder/utils/sorting";
import type { ComponentDescriptorType } from "/lib/xp/schema";
import { getCMSRepoIds } from "/lib/part-finder/utils/repoIds";
import { parseComponentPathsPerId } from "/lib/part-finder/utils/componentPathsPerId";

// TODO: Before which stage/screen(s) does the server receive these for handling and rendering?
// Finder? Replace? Cleanup? All of them? Some common, some not?
// Sort out and rename to clarify.
export type UriParams = {
  [PARAM.key]: string;
  [PARAM.type]: ComponentDescriptorType;
  [PARAM.repo]?: string;
  [PARAM.replace]?: string;
  [PARAM.getConfig]?: string;
  [PARAM.archive]?: string;
  [PARAM.sort]?: SortParam;
  [PARAM.unused]?: string;
};

export type PartFinderQueryParams = {
  [PARAM.key]: string;
  [PARAM.type]: ComponentDescriptorType;
  [PARAM.newPartName]?: string;
  [PARAM.postprocessors]?: string;
  [PARAM.sort]?: string;
  [PARAM.dir]?: string;
  [PARAM.replace]?: string;
  [PARAM.getConfig]?: string;
  [PARAM.repo]?: string;
  [PARAM.archive]?: string;
  [PARAM.unused]?: string;
  [PARAM.cleanup]?: string;
};

export const PARAM = {
  replace: "replace",
  getConfig: "getconfig",
  archive: "archive",
  sort: "sort",
  key: "key",
  unused: "unused",
  repo: "repo",
  type: "type",
  newPartName: "newpartname",
  postprocessors: "postprocessors",
  dir: "dir",
  cleanup: "cleanup",
} as const satisfies Record<
  string,
  | "replace"
  | "getconfig"
  | "archive"
  | "sort"
  | "key"
  | "unused"
  | "repo"
  | "type"
  | "newpartname"
  | "postprocessors"
  | "dir"
  | "cleanup"
>;

export const PREFIX = {
  contentHash: "contenthash--",
  radioButtonGroup: "radio--",
  deleteOld: "delete-old--",
  deleteNew: "delete-new--",
  selectItem: "select-item--",
} as const satisfies Record<string, "contenthash--" | "radio--" | "delete-old--" | "delete-new--" | "select-item--">;

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

export const getCommonParams = (
  req: XP.Request<PartFinderQueryParams>,
  targetIds: string[],
): {
  repoIds: string[];
  sortParam: string;
  displayArchiveParam: string;
  displayUnusedParam: string;
  componentType: string;
  sourceKey: string;
  newKey: string;
  newAppKey: string;
  newComponentKey: string;
  componentPathsPerId: Record<string, string[] | null>;
} => {
  const sourceKey = trimString(req.params[PARAM.key]);
  const newKey = trimString(req.params[PARAM.newPartName]);
  const componentType = getParamString(req, PARAM.type);

  const requiredArgs: { [key: string]: string } = {
    [PARAM.key]: sourceKey,
    [PARAM.newPartName]: newKey,
    [PARAM.type]: componentType,
  };
  const missingArgs = Object.keys(requiredArgs)
    .filter((key) => !requiredArgs[key])
    .map((key) => key);
  if (missingArgs.length > 0) {
    throw Error("Missing POST parameters: " + JSON.stringify(missingArgs));
  }

  const [newAppKey, newComponentKey] = newKey.split(":");

  return {
    newKey,
    newAppKey,
    newComponentKey,
    componentPathsPerId: parseComponentPathsPerId(targetIds),
    componentType: getParamString(req, PARAM.type),
    sourceKey: trimString(req.params[PARAM.key]),
    repoIds: getCMSRepoIds(getRepoParam(req)),
    sortParam: addUriParam(PARAM.sort, req.params[PARAM.sort], !!getSortParam(req)),
    displayArchiveParam: addUriParam(PARAM.archive, PARAM_VAL.true, !!getDisplayArchiveParam(req)),
    displayUnusedParam: addUriParam(PARAM.unused, PARAM_VAL.true, !!getDisplayUnusedParam(req)),
  };
};
