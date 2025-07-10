import { SORT_FUNCS } from "/lib/part-finder/utils/sorting";

export type UriParams = {
  key: string;
  type: string;
  repo?: string;
  replace?: string;
  getconfig?: string;
  archive?: string;
  sort?: keyof typeof SORT_FUNCS;
  unused?: string;
};

export const trimString = (str) => ((str || "") + "").trim();

export const getParamString = (req, paramName: string): string =>
  (req.params[paramName] + "")
    .trim()
    .toLowerCase()
    .replace(/^undefined$/, "");

export const getParamBool = (req, paramName: string): string => getParamString(req, paramName).replace(/^false$/, "");

export const getDisplayReplacerParam = (req) => getParamBool(req, "replace");

export const getRepoParam = (req) => getParamString(req, "repo");

export const getDisplayArchiveParam = (req) => getParamBool(req, "archive");

export const getSortParam = (req): keyof typeof SORT_FUNCS | "" => {
  const paramValue = getParamBool(req, "sort");
  return SORT_FUNCS[paramValue] ? (paramValue as keyof typeof SORT_FUNCS) : "";
};

export const getDisplayUnusedParam = (req) => getParamBool(req, "unused");
