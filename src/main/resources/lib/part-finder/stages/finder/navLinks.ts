import { getComponentNavLinkList } from "/admin/views/navigation/navigation";
import { Header, Link } from "/admin/views/header/header.freemarker";
import { getPartFinderUrl } from "/lib/part-finder/utils/utils";
import {
  getDisplayUnusedParam,
  getSortParam,
  PARAM,
  PARAM_VAL,
  PartFinderQueryParams,
  PREFIX,
} from "/lib/part-finder/utils/params";
import { ComponentList } from "/admin/tools/part-finder/part-finder.freemarker";
import { ComponentView, ComponentViewParams } from "/admin/views/component-view/component-view.freemarker";
import { listContentIdsAndUsagePaths } from "/lib/part-finder/utils/contentIdSummary";
import { render } from "/lib/tineikt/freemarker";
import { getAppKey, getFirstComponent, PAGE_TITLE } from "/lib/part-finder/stages/finder/get";
import { Application } from "/lib/xp/app";

const NAVLINKS_VIEW = resolve("../../../admin/tools/part-finder/part-finder.ftl");

export const renderNavLinks = (
  req: XP.Request<PartFinderQueryParams>,
  currentItem: ComponentView,
  currentItemKey: string,
  repoParam: string,
  cmsRepoIds: string[],
  installedApps: Application[],
  displayArchives: string,
  getConfigParam: string | undefined,
  displayReplaceSelectors: string,
): XP.Response => {
  const sortParam = getSortParam(req);
  const displayUnused = getDisplayUnusedParam(req);

  const currentAppKey = getAppKey(currentItemKey);

  const { active, noSchema, unused } = getComponentNavLinkList(
    cmsRepoIds,
    currentAppKey,
    displayReplaceSelectors,
    getConfigParam,
    repoParam,
    displayArchives,
    sortParam,
    displayUnused,
  );

  const filters = installedApps.map<Link>((app) => {
    const firstComponent = getFirstComponent(app);

    return {
      text: app.key,
      url: firstComponent
        ? getPartFinderUrl({
            [PARAM.key]: firstComponent.key,
            [PARAM.type]: firstComponent.type,
            [PARAM.repo]: repoParam,
            [PARAM.getConfig]: getConfigParam || "",
            [PARAM.replace]: displayReplaceSelectors,
            [PARAM.archive]: displayArchives,
            [PARAM.sort]: sortParam,
            [PARAM.unused]: displayUnused,
          })
        : "",
    };
  });

  const model: ComponentList & ComponentViewParams & Header = {
    title: `${PAGE_TITLE} - ${currentItem?.key}`,
    displayName: PAGE_TITLE,
    filters,
    currentItemKey,
    currentAppKey,
    currentItem,
    displayReplaceSelectors,
    itemLists: active,
    noSchemaItems: noSchema,
    hasNoschema: (noSchema || []).length > 0,
    unusedItems: unused,
    hasUnused: unused.length > 0,
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
    body: render<ComponentList & ComponentViewParams & Header>(NAVLINKS_VIEW, model),
  };
};
