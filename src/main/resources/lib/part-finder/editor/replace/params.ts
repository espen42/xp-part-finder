import {
  getDisplayArchiveParam,
  getDisplayUnusedParam,
  getParamString,
  getRepoParam,
  getSortParam,
  trimString,
} from "/lib/part-finder/utils/params";
import { parseComponentPathsPerId } from "/lib/part-finder/utils/componentPathsPerId";
import { getCMSRepoIds } from "/lib/part-finder/utils/repoIds";

type ParamsForReplacementProcessing = {
  requestedPostprocessors: string[];
  componentPathsPerId: Record<string, string[] | null>;
  oldAppKey: string;
  oldComponentKey: string;
  newAppKey: string;
  newComponentKey: string;
  sourceKey: string;
  newKey: string;
  componentType: string;
  sortParam: string;
  displayArchiveParam: string;
  displayUnusedParam: string;
  repoIds: string[];
};

export const getParamsForReplacing = (req): ParamsForReplacementProcessing => {

  const componentType = getParamString(req, "type");
  const sourceKey = trimString(req.params.key);
  const newKey = trimString(req.params.new_part_ref);
  const targetIds: string[] = Object.keys(req.params)
    .filter((k) => k.startsWith("select-item--"))
    .map((k) => req.params[k] || "");

  const requiredArgs: { [key: string]: string } = {
    key: sourceKey,
    new_part_ref: newKey,
    type: componentType,
  };
  const missingArgs = Object.keys(requiredArgs)
    .filter((key) => !requiredArgs[key])
    .map((key) => key);

  if (missingArgs.length > 0) {
    throw Error("Missing POST parameters: " + JSON.stringify(missingArgs));
  }

  const [oldAppKey, oldComponentKey] = sourceKey.split(":");
  const [newAppKey, newComponentKey] = newKey.split(":");

  const repoParam = getRepoParam(req);
  const sort = getSortParam(req);

  return {
    requestedPostprocessors: trimString(req.params.postprocessors)
      .split(/\s*,\s*/g)
      .filter((processorName) => processorName.trim())
      .filter((processorName) => processorName !== "undefined"),
    componentPathsPerId: parseComponentPathsPerId(targetIds),
    oldAppKey,
    oldComponentKey,
    newAppKey,
    newComponentKey,
    sourceKey,
    newKey,
    componentType,
    sortParam: sort ? `&sort=${req.params.sort}` : "",
    displayArchiveParam: getDisplayArchiveParam(req) ? "&archive=true" : "",
    displayUnusedParam: getDisplayUnusedParam(req) ? "&unused=true" : "",
    repoIds: getCMSRepoIds(repoParam),
  };
};
