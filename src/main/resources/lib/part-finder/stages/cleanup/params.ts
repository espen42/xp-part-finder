import { getControlHashesParam, PREFIX, PartFinderQueryParams, getCommonParams } from "/lib/part-finder/utils/params";
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
  const plannedOperations = {};

  const radiobuttonIds: string[] = Object.keys(req.params)
    .filter((k) => k.match(RX_STARTSWITH_RADIOBUTTONGROUP))
    .map((k) => req.params[k] || "");

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
  } = getCommonParams(req, [...deleteOldIds, ...deleteNewIds]);

  return {
    controlHashes: getControlHashesParam(req),
    plannedOperations,
    componentPathsPerId,
    newAppKey,
    newComponentKey,
    componentType,
    sourceKey,
    newKey,
    repoIds,
    sortParam,
    displayArchiveParam,
    displayUnusedParam,
  };
};
