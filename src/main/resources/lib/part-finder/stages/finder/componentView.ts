import { ComponentView, ComponentViewParams } from "/admin/views/component-view/component-view.freemarker";
import { PARAM, PARAM_VAL, PREFIX } from "/lib/part-finder/utils/params";
import { listContentIdsAndUsagePaths } from "/lib/part-finder/utils/contentIdSummary";
import { render } from "/lib/tineikt/freemarker";
import { PAGE_TITLE, wrapInHtml } from "/lib/part-finder/stages/finder/get";

const COMPONENT_VIEW = resolve("../../../admin/views/component-view/component-view.ftl");

export const renderComponentView = (
  currentItem: ComponentView,
  currentItemType,
  getConfigParam,
  repoParam,
  displayReplaceSelectors,
): XP.Response => {
  const model: ComponentViewParams = {
    currentItem,
    displayReplaceSelectors:
      currentItemType === PARAM_VAL.PART || currentItemType === PARAM_VAL.LAYOUT
        ? displayReplaceSelectors
        : PARAM_VAL.false,

    allIds: JSON.stringify(listContentIdsAndUsagePaths(currentItem)),
    PARAM,
    PARAM_VAL,
    PREFIX,
  };
  if (getConfigParam) {
    model.configQuery = getConfigParam;
  }
  if (repoParam) {
    model.repoParam = repoParam;
  }

  return {
    body: wrapInHtml({
      markup: render<ComponentViewParams>(COMPONENT_VIEW, model),
      title: `${PAGE_TITLE} - ${currentItem.key}`,
    }),
  };
};
