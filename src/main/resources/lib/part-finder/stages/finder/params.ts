import {
  getDisplayArchiveParam,
  getDisplayReplacerParam,
  getRepoParam,
  PARAM,
  PARAM_VAL,
  PartFinderQueryParams,
} from "/lib/part-finder/utils/params";
import { getCMSRepoIds } from "/lib/part-finder/utils/repoIds";
import type { ComponentDescriptorType } from "/lib/xp/schema";

const getConfigRequest = (req: XP.Request<PartFinderQueryParams>): undefined | string => {
  if (typeof (req.params[PARAM.getConfig] || "") !== "string") {
    throw Error(`The URI parameter ${PARAM.getConfig} must be a string value. Got ${typeof req.params[PARAM.getConfig]} instead: req.params[${JSON.stringify(PARAM.getConfig)}] = ${JSON.stringify(req.params[PARAM.getConfig])}`);
  }

  const getConfigParam = (req.params[PARAM.getConfig] || "").trim();
  return getConfigParam === PARAM_VAL.undefined || getConfigParam === PARAM_VAL.false || getConfigParam === ""
    ? undefined
    : getConfigParam;
};

function parseComponentType(str: string = ""): ComponentDescriptorType | undefined {
  const uppercasedStr = str.toUpperCase();

  if (uppercasedStr === PARAM_VAL.PAGE || uppercasedStr === PARAM_VAL.LAYOUT || uppercasedStr === PARAM_VAL.PART) {
    return uppercasedStr;
  }

  return undefined;
}

export const getCommonFinderParams = (
  req: XP.Request<PartFinderQueryParams>,
): {
  getConfigParam: string | undefined;
  displayReplaceSelectors: string;
  repoParam: string;
  displayArchives: string;
  cmsRepoIds: string[];
  currentItemType: ComponentDescriptorType | undefined;
  currentItemKey: string | undefined;
} => {
  const displayReplaceSelectors = getDisplayReplacerParam(req);
  const repoParam = getRepoParam(req);
  const cmsRepoIds = getCMSRepoIds(repoParam);

  return {
    getConfigParam: getConfigRequest(req),
    displayReplaceSelectors,
    repoParam,
    displayArchives: getDisplayArchiveParam(req),
    cmsRepoIds,
    currentItemType: parseComponentType(req.params[PARAM.type]),
    currentItemKey: req.params[PARAM.key],
  };
};
