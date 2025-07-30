import { getParamsForCleanup } from "/lib/part-finder/stages/cleanup/params";
import { Results } from "/lib/part-finder/utils/results";
import { Operation } from "/lib/part-finder/utils/plannedOperations";
import { createCleanupEditor } from "/lib/part-finder/stages/cleanup/editor";
import { runEditor } from "/lib/part-finder/utils/editors";
import { PARAM, PARAM_VAL, PREFIX } from "/lib/part-finder/utils/params";
import { listContentIdsAndUsagePaths } from "/lib/part-finder/utils/contentIdSummary";
import { getToolUrl } from "/lib/xp/admin";
import { getAppKey, PAGE_TITLE } from "/admin/tools/part-finder/part-finder";

// TODO: parameterize the Request, and type the model
export const runCleanupAndGetSummary = (req: XP.Request) => {
  const {
    controlHashes,
    componentPathsPerId,
    plannedOperations,
    sourceKey,
    newKey,
    componentType,
    repoIds,
    newAppKey,
    newComponentKey,
    sortParam,
    displayArchiveParam,
    displayUnusedParam,
  } = getParamsForCleanup(req);

  const results = new Results(sourceKey, newKey, componentType, plannedOperations, Operation.Cleanup);

  const cleanupEditor = createCleanupEditor(controlHashes, results, componentPathsPerId);

  runEditor(cleanupEditor, repoIds, componentPathsPerId, results);

  const taskSummary = `${sourceKey} → ${newKey}`;
  const appKey = getAppKey(newComponentKey);
  const type = componentType.toUpperCase();

  const currentItem = {
    url: `/admin/tool/com.enonic.app.contentstudio/main/part-finder?${PARAM.key}=${newAppKey}%3A${newComponentKey}&${PARAM.type}=${type}`,
    key: newKey,
    type: componentType,
    contents: results.buildContentResult(),
    headings: [
      {
        text: "Display name",
        name: "displayName",
        url: "#",
      },
      {
        text: "Content type",
        name: "type",
        url: "#",
      },
      {
        text: "Path",
        name: "_path",
        url: "#",
      },
    ],
  };

  const allIds = JSON.stringify(listContentIdsAndUsagePaths(currentItem));

  return {
    title: `${PAGE_TITLE} - POST-CLEANUP SUMMARY: ${taskSummary}`,
    displayName: PAGE_TITLE,
    currentItemKey: newKey,
    currentAppKey: appKey,
    displayReplacer: "",
    displaySummaryAndUndo: true,
    oldItemKey: `${sourceKey}`,
    newItemToolUrl: `${getToolUrl("no.item.partfinder", "part-finder")}?${PARAM.key}=${newAppKey}%3A${newComponentKey}&${PARAM.type}=${type}&${PARAM.replace}=${PARAM_VAL.true}${sortParam}${displayArchiveParam}${displayUnusedParam}`,
    currentItem,
    allIds,
    PARAM,
    PARAM_VAL,
    PREFIX,
  };
};
