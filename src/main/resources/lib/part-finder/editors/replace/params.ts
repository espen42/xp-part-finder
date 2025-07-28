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

import { Operation, registerOperationAndGetIds } from "/lib/part-finder/utils/plannedOperations";

type ParamsForReplacementProcessing = {
  requestedPostprocessors: string[];
  componentPathsPerId: Record<string, string[] | null>;
  plannedOperations: Record<string, Operation>;
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

const PREFIX_SELECTORS = /^select-item--/;

export const getParamsForReplacing = (req): ParamsForReplacementProcessing => {

  const componentType = getParamString(req, "type");
  const sourceKey = trimString(req.params.key);
  const newKey = trimString(req.params.new_part_ref);
  const selectorIds: string[] = Object.keys(req.params)
    .filter((k) => k.match(PREFIX_SELECTORS))
    .map((k) => req.params[k] || "");

  const plannedOperations = {};
  const targetIds = registerOperationAndGetIds(selectorIds, Operation.Add, plannedOperations);

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
    plannedOperations,
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
