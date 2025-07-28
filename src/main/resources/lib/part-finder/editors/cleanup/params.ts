import {
  getControlHashesParam,
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

const PREFIX_RADIOBUTTONGROUP = /^radio--/;
const PREFIX_DELETE_OLD = /^delete-old--/;
const PREFIX_DELETE_NEW = /^delete-new--/;

export const getParamsForCleanup = (req): ParamsForCleanupProcessing => {

  const componentType = getParamString(req, "type");
  const sourceKey = trimString(req.params.key);
  const newKey = trimString(req.params.new_part_ref);

  const radiobuttonIds: string[] = Object.keys(req.params)
    .filter((k) => k.match(PREFIX_RADIOBUTTONGROUP))
    .map((k) => req.params[k] || "");

  const plannedOperations = {};
  const deleteOldIds = registerOperationAndGetIds(
    radiobuttonIds,
    Operation.Accept,
    plannedOperations,
    PREFIX_DELETE_OLD,
  );
  const deleteNewIds = registerOperationAndGetIds(radiobuttonIds, Operation.Undo, plannedOperations, PREFIX_DELETE_NEW);

  const [newAppKey, newComponentKey] = newKey.split(":");

  const repoParam = getRepoParam(req);
  const sort = getSortParam(req);

  return {
    controlHashes: getControlHashesParam(req),
    componentPathsPerId: parseComponentPathsPerId([...deleteOldIds, ...deleteNewIds]),
    plannedOperations,
    sourceKey,
    newKey,
    componentType,
    repoIds: getCMSRepoIds(repoParam),
    newAppKey,
    newComponentKey,
    sortParam: sort ? `&sort=${req.params.sort}` : "",
    displayArchiveParam: getDisplayArchiveParam(req) ? "&archive=true" : "",
    displayUnusedParam: getDisplayUnusedParam(req) ? "&unused=true" : "",
  };
};
