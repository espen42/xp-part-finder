import {
  getControlHashesParam,
  getDisplayArchiveParam,
  getDisplayUnusedParam,
  getParamString,
  getRepoParam,
  getSortParam,
  trimString,
  PREFIX,
  PARAM,
  PARAM_VAL,
  addUriParam,
  PartFinderQueryParams,
} from "/lib/part-finder/utils/params";
import { parseComponentPathsPerId } from "/lib/part-finder/utils/componentPathsPerId";
import { getCMSRepoIds } from "/lib/part-finder/utils/repoIds";
import { Operation, registerOperationAndGetIds } from "/lib/part-finder/utils/plannedOperations";

type ParamsForCleanupProcessing = {
  controlHashes: Record<string, string>;
  componentPathsPerId: Record<string, string[] | null>;
  plannedOperations: Record<string, Operation>;
  sourceKey: string;
  newKey: string;
  componentType: string;
  repoIds: string[];
  newComponentKey: string;
  newAppKey: string;
  sortParam: string;
  displayArchiveParam: string;
  displayUnusedParam: string;
};

const RX_STARTSWITH_RADIOBUTTONGROUP = new RegExp(`^${PREFIX.radioButtonGroup}`);
const RX_STARTSWITH_DELETE_OLD = new RegExp(`^${PREFIX.deleteOld}`);
const RX_STARTSWITH_DELETE_NEW = new RegExp(`^${PREFIX.deleteNew}`);

export const getParamsForCleanup = (req: XP.Request<PartFinderQueryParams>): ParamsForCleanupProcessing => {
  const componentType = getParamString(req, PARAM.type);
  const sourceKey = trimString(req.params.key);
  const newKey = trimString(req.params.new_part_ref);

  const radiobuttonIds: string[] = Object.keys(req.params)
    .filter((k) => k.match(RX_STARTSWITH_RADIOBUTTONGROUP))
    .map((k) => req.params[k] || "");

  const plannedOperations = {};
  const deleteOldIds = registerOperationAndGetIds(
    radiobuttonIds,
    Operation.Accept,
    plannedOperations,
    RX_STARTSWITH_DELETE_OLD,
  );
  const deleteNewIds = registerOperationAndGetIds(
    radiobuttonIds,
    Operation.Undo,
    plannedOperations,
    RX_STARTSWITH_DELETE_NEW,
  );

  const [newAppKey, newComponentKey] = newKey.split(":");

  return {
    controlHashes: getControlHashesParam(req),
    componentPathsPerId: parseComponentPathsPerId([...deleteOldIds, ...deleteNewIds]),
    plannedOperations,

    // Common:
    sourceKey,
    newKey,
    componentType,
    newAppKey,
    newComponentKey,
    repoIds: getCMSRepoIds(getRepoParam(req)),
    sortParam: addUriParam(PARAM.sort, req.params.sort, !!getSortParam(req)),
    displayArchiveParam: addUriParam(PARAM.archive, PARAM_VAL.true, !!getDisplayArchiveParam(req)),
    displayUnusedParam: addUriParam(PARAM.unused, PARAM_VAL.true, !!getDisplayUnusedParam(req)),
  };
};
