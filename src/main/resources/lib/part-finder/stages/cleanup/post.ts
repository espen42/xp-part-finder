import { getParamsForCleanup } from "/lib/part-finder/stages/cleanup/params";
import { Operation } from "/lib/part-finder/utils/plannedOperations";
import { createCleanupEditor } from "/lib/part-finder/stages/cleanup/editor";
import { runEditor } from "/lib/part-finder/utils/editors";
import { PARAM, PARAM_VAL, PREFIX } from "/lib/part-finder/utils/params";
import { listContentIdsAndUsagePaths } from "/lib/part-finder/utils/contentIdSummary";
import { getToolUrl } from "/lib/xp/admin";
import { ComponentViewParams } from "/admin/views/component-view/component-view.freemarker";
import { render } from "/lib/tineikt/freemarker";
import { buildContentResult } from "/lib/part-finder/utils/results";

const CLEANUP_SUMMARY_VIEW = resolve("../../../admin/views/cleanup-summary/cleanup-summary.ftl");

export const runCleanupAndSummarize = (req: XP.Request): XP.Response => {
  const {
    controlHashes,
    componentPathsPerIdPerRepo,
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

  const cleanupEditor = createCleanupEditor(controlHashes);

  const resultsFromRepos = runEditor(
    cleanupEditor,
    repoIds,
    componentPathsPerIdPerRepo,
    sourceKey,
    newKey,
    componentType,
    plannedOperations,
    Operation.Cleanup,
  );

  const type = componentType.toUpperCase();

  const currentItem = {
    url: `/admin/tool/com.enonic.app.contentstudio/main/part-finder?${PARAM.key}=${newAppKey}%3A${newComponentKey}&${PARAM.type}=${type}`,
    key: newKey,
    type: componentType,
    contents: buildContentResult(resultsFromRepos),
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

  const model: ComponentViewParams = {
    displayReplaceSelectors: "",
    oldItemKey: `${sourceKey}`,
    newItemToolUrl: `${getToolUrl("no.item.partfinder", "part-finder")}?${PARAM.key}=${newAppKey}%3A${newComponentKey}&${PARAM.type}=${type}&${PARAM.replace}=${PARAM_VAL.true}${sortParam}${displayArchiveParam}${displayUnusedParam}`,
    currentItem,
    allIds,
    PARAM,
    PARAM_VAL,
    PREFIX,
  };

  return {
    body: render<ComponentViewParams>(CLEANUP_SUMMARY_VIEW, model),
  };
};
