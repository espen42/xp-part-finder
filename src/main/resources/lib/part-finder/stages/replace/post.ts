import { getParamsForReplacing } from "/lib/part-finder/stages/replace/params";
import { Results } from "/lib/part-finder/utils/results";
import { Operation } from "/lib/part-finder/utils/plannedOperations";
import { createReplaceEditor } from "/lib/part-finder/stages/replace/editor";
import { PARAM, PARAM_VAL, PREFIX } from "/lib/part-finder/utils/params";
import { listContentIdsAndUsagePaths } from "/lib/part-finder/utils/contentIdSummary";
import { getToolUrl } from "/lib/xp/admin";
import { runEditor } from "/lib/part-finder/utils/editors";
import { ComponentViewParams } from "/admin/views/component-view/component-view.freemarker";
import { render } from "/lib/tineikt/freemarker";

const REPLACE_REVIEW_VIEW = resolve("../../../admin/views/replacement-review/replacement-review.ftl");

export const runReplaceAndSummarize = (req: XP.Request): XP.Response => {
  const {
    oldAppKey,
    oldComponentKey,
    newAppKey,
    newComponentKey,
    componentPathsPerId,
    plannedOperations,
    requestedPostprocessors,
    sortParam,
    sourceKey,
    newKey,
    componentType,
    repoIds,
    displayArchiveParam,
    displayUnusedParam,
  } = getParamsForReplacing(req);

  const results = new Results(sourceKey, newKey, componentType, plannedOperations, Operation.Add);

  const replaceEditor = createReplaceEditor(
    oldAppKey,
    oldComponentKey,
    newAppKey,
    newComponentKey,
    componentType,
    results,
    componentPathsPerId,
    requestedPostprocessors,
  );

  runEditor(replaceEditor, repoIds, componentPathsPerId, results);

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
    body: render<ComponentViewParams>(REPLACE_REVIEW_VIEW, model),
  };
};
