import {
  trimString,
  PREFIX,
  PartFinderQueryParams,
  PARAM,
  PARAM_VAL,
  getCommonParams,
} from "/lib/part-finder/utils/params";

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
  const plannedOperations = {};

  const selectorIds: string[] = Object.keys(req.params)
    .filter((k) => k.match(RX_STARTSWITH_SELECTITEM))
    .map((k) => req.params[k] || "");

  const targetIds = registerOperationAndGetIds(selectorIds, Operation.Add, plannedOperations);

  const {
    componentType,
    sourceKey,
    newKey,
    newAppKey,
    newComponentKey,
    repoIds,
    sortParam,
    displayArchiveParam,
    displayUnusedParam,
    componentPathsPerId,
  } = getCommonParams(req, targetIds);
  const [oldAppKey, oldComponentKey] = sourceKey.split(":");

  return {
    requestedPostprocessors: trimString(req.params[PARAM.postprocessors])
      .split(/\s*,\s*/g)
      .filter((processorName) => processorName.trim())
      .filter((processorName) => processorName !== PARAM_VAL.undefined),

    componentPathsPerId,
    plannedOperations,
    oldAppKey,
    oldComponentKey,
    componentType,
    sourceKey,
    newKey,
    newAppKey,
    newComponentKey,
    repoIds,
    sortParam,
    displayArchiveParam,
    displayUnusedParam,
  };
};
