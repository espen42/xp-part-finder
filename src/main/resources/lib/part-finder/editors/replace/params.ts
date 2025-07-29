import {
  getDisplayArchiveParam,
  getDisplayUnusedParam,
  getParamString,
  getRepoParam,
  getSortParam,
  trimString,
  PREFIX,
  PartFinderQueryParams,
  PARAM,
  PARAM_VAL,
  addUriParam,
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

const RX_STARTSWITH_SELECTITEM = new RegExp(`^${PREFIX.selectItem}`);

export const getParamsForReplacing = (req: XP.Request<PartFinderQueryParams>): ParamsForReplacementProcessing => {
  const componentType = getParamString(req, PARAM.type);
  const sourceKey = trimString(req.params.key);
  const newKey = trimString(req.params.new_part_ref);
  const selectorIds: string[] = Object.keys(req.params)
    .filter((k) => k.match(RX_STARTSWITH_SELECTITEM))
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

  return {
    requestedPostprocessors: trimString(req.params.postprocessors)
      .split(/\s*,\s*/g)
      .filter((processorName) => processorName.trim())
      .filter((processorName) => processorName !== PARAM_VAL.undefined),
    componentPathsPerId: parseComponentPathsPerId(targetIds),
    plannedOperations,
    oldAppKey,
    oldComponentKey,
    componentType,

    // Common:
    sourceKey,
    newKey,
    newAppKey,
    newComponentKey,
    repoIds: getCMSRepoIds(getRepoParam(req)),
    sortParam: addUriParam(PARAM.sort, req.params.sort, !!getSortParam(req)),
    displayArchiveParam: addUriParam(PARAM.archive, PARAM_VAL.true, !!getDisplayArchiveParam(req)),
    displayUnusedParam: addUriParam(PARAM.unused, PARAM_VAL.true, !!getDisplayUnusedParam(req)),
  };
};
