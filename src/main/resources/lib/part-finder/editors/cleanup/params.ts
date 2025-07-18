import {
  getControlHashesParam,
  getDisplayArchiveParam,
  getDisplayUnusedParam,
  getParamString,
  getRepoParam,
  getSortParam,
  trimString,
} from "/lib/part-finder/utils/params";
import {parseComponentPathsPerId} from "/lib/part-finder/utils/componentPathsPerId";
import {getCMSRepoIds} from "/lib/part-finder/utils/repoIds";

type ParamsForCleanupProcessing = {
  controlHashes: Record<string, string>,
  componentPathsPerId: Record<string, string[] | null>,
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

export const getParamsForCleanup = (req): ParamsForCleanupProcessing => {

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

  //const [oldAppKey, oldComponentKey] = sourceKey.split(":");
  const [newAppKey, newComponentKey] = newKey.split(":");

  const repoParam = getRepoParam(req);
  const sort = getSortParam(req);

  return {
    controlHashes: getControlHashesParam(req),
    componentPathsPerId: parseComponentPathsPerId(targetIds),
    sourceKey,
    newKey,
    componentType,
    repoIds: getCMSRepoIds(repoParam),
    newAppKey,
    newComponentKey,
    sortParam: sort ? `&sort=${req.params.sort}` : "",
    displayArchiveParam: getDisplayArchiveParam(req) ? "&archive=true" : "",
    displayUnusedParam: getDisplayUnusedParam(req) ? "&unused=true" : "",
    //oldAppKey,


    //oldComponentKey,


    //,




  };
};
