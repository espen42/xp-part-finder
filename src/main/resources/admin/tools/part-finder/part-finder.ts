import { list as listApps, type Application } from "/lib/xp/app";
import { hasRole as hasAuthRole } from "/lib/xp/auth";
import { listComponents, type ComponentDescriptorType, type ComponentDescriptor } from "/lib/xp/schema";
import { render } from "/lib/tineikt/freemarker";
import { assertIsDefined, getPartFinderUrl, notNullOrUndefined, runAsAdmin } from "/lib/part-finder/utils/utils";
import { getComponentNavLinkList } from "../../views/navigation/navigation";
import { getComponentUsagesInRepo } from "../../views/component-view/component-view";
import type { ComponentViewParams } from "../../views/component-view/component-view.freemarker";
import type { Header, Link } from "../../views/header/header.freemarker";
import type { SortDirection } from "@enonic-types/core";
import { ComponentItem, ComponentList } from "/admin/tools/part-finder/part-finder.freemarker";
import { processMultiUsage } from "/admin/tools/part-finder/usagePaths";
import {
  getDisplayArchiveParam,
  getDisplayReplacerParam,
  getDisplayUnusedParam,
  getParamBool,
  getRepoParam,
  getSortParam,
  PartFinderQueryParams,
  PARAM_VAL,
  PARAM,
  PREFIX,
} from "/lib/part-finder/utils/params";
import { getCMSRepoIds } from "/lib/part-finder/utils/repoIds";
import { listContentIdsAndUsagePaths } from "/lib/part-finder/utils/contentIdSummary";
import { runReplaceAndGetSummary } from "/lib/part-finder/stages/replace/post";
import { runCleanupAndGetSummary } from "/lib/part-finder/stages/cleanup/post";

export const PAGE_TITLE = "Part finder";

const VIEW = resolve("part-finder.ftl");
const COMPONENT_VIEW = resolve("../../views/component-view/component-view.ftl");

export function getAppKey(key: string): string {
  return key.split(":")[0];
}

export function wrapInHtml({ markup, title }: { markup: string; title: string }): string {
  return `<!DOCTYPE html><html lang="en"><head><title>${title}</title></head><body>${markup}</body></html>`;
}

function parseComponentType(str: string = ""): ComponentDescriptorType | undefined {
  const uppercasedStr = str.toUpperCase();

  if (uppercasedStr === PARAM_VAL.PAGE || uppercasedStr === PARAM_VAL.LAYOUT || uppercasedStr === PARAM_VAL.PART) {
    return uppercasedStr;
  }

  return undefined;
}

const getConfigRequest = (req: XP.Request<PartFinderQueryParams>): undefined | string => {
  const getConfigParam = (req.params[PARAM.getConfig] || "").trim();
  return getConfigParam === PARAM_VAL.undefined || getConfigParam === PARAM_VAL.false || getConfigParam === ""
    ? undefined
    : getConfigParam;
};

const parseTargetConfig = (getConfigString: string): string => {
  let targetValue;
  try {
    targetValue = JSON.parse(getConfigString.substring(getConfigString.indexOf("=") + 1));
  } catch (e1: unknown) {
    if (e1 instanceof Error) {
      log.info(e1.message);
    } else {
      log.warning(e1);
    }

    try {
      targetValue = getConfigString.substring(getConfigString.indexOf("=") + 1);
      if (targetValue === PARAM_VAL.undefined) {
        targetValue = undefined;
      }
    } catch (e2: unknown) {
      if (e2 instanceof Error) {
        log.warning(e2.message);
      } else {
        log.warning(e1);
      }

      throw Error(`Couldn't parse requested ${PARAM.getConfig}: '${getConfigString}'`);
    }
  }

  return targetValue;
};

// The request parameter "getconfig" can be just a path to a value on the component data (eg. "config.layout._selected"),
// but it can also have a "=" and a target value after (eg. 'config.layout._selected="two"'). If it does, this is used
// to remove the checkbox selector on usage items (component paths) where the value does NOT match whatever comes after the "="
// (eg. the URI parameter '...&getconfig=layout._selected="two"' will display all usages, but only a checkbox next to the
// items whose values is the string "two".
const filterSelectorsByMatchingGetConfig = (currentItem: ComponentItem | undefined, getConfigString) => {
  if (currentItem && getConfigString && getConfigString.indexOf("=") !== -1) {
    const targetValue = parseTargetConfig(getConfigString);

    currentItem.contents = currentItem.contents.map((contentItem) => ({
      ...contentItem,
      multiUsage: contentItem.multiUsage.map((usage) => {
        if (usage.targetSubValue !== targetValue) {
          usage.hideSelector = true;
        }
        return usage;
      }),
    }));
  }
};

export function get(req: XP.Request<PartFinderQueryParams>): XP.Response {
  const currentItemType = parseComponentType(req.params[PARAM.type]);
  const currentItemKey = req.params[PARAM.key];
  const installedApps = listAppsWithComponents();

  if (installedApps.length === 0) {
    return {
      status: 404,
      body: "<h1>No installed applications found</h1>",
    };
  }

  if (!currentItemKey) {
    const firstComponent = getFirstComponent(installedApps[0]);

    assertIsDefined(firstComponent);

    return {
      redirect: getPartFinderUrl({
        [PARAM.key]: firstComponent.key,
        [PARAM.type]: firstComponent.type,
        [PARAM.repo]: req.params[PARAM.repo] || "",
      }),
    };
  }

  const getConfigParam = getConfigRequest(req);
  const displayReplacer = getDisplayReplacerParam(req);
  const repoParam = getRepoParam(req);
  const displayArchives = getDisplayArchiveParam(req);
  const sortParam = getSortParam(req);
  const displayUnused = getDisplayUnusedParam(req);

  const currentAppKey = getAppKey(currentItemKey);
  const cmsRepoIds = getCMSRepoIds(repoParam);
  const currentItem = currentItemType
    ? getComponentUsagesInRepo(
        {
          key: currentItemKey,
          type: currentItemType,
        },
        cmsRepoIds,
        {
          field: req.params[PARAM.sort] ?? "_path",
          direction: parseSortDirection(req.params[PARAM.dir]),
        },
        getConfigParam,
        displayReplacer,
        repoParam,
        displayArchives,
      )
    : undefined;

  if (!currentItem) {
    return {
      status: 404,
      body: "<h1>Component not found</h1>",
    };
  }

  processMultiUsage(currentItem);

  filterSelectorsByMatchingGetConfig(currentItem as unknown as ComponentItem, getConfigParam);

  // If in Turbo Frame, only render the component view
  if (req.headers["turbo-frame"] === "content-view") {
    const model: ComponentViewParams = {
      currentItem,
      displayReplacer:
        currentItemType === PARAM_VAL.PART || currentItemType === PARAM_VAL.LAYOUT ? displayReplacer : PARAM_VAL.false,
      displaySummaryAndUndo: false,
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
  }

  const { active, noSchema, unused } = getComponentNavLinkList(
    cmsRepoIds,
    currentAppKey,
    displayReplacer,
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
            [PARAM.replace]: displayReplacer,
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
    displayReplacer,
    displaySummaryAndUndo: false,
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
    body: render<ComponentList & ComponentViewParams & Header>(VIEW, model),
  };
}

function listAppsWithComponents(): Application[] {
  return runAsAdmin(() => listApps()).filter((app) => notNullOrUndefined(getFirstComponent(app)));
}

function getFirstComponent(app: Application): ComponentDescriptor | undefined {
  return (
    listComponents({
      type: PARAM_VAL.PART,
      application: app.key,
    })[0] ??
    listComponents({
      type: PARAM_VAL.LAYOUT,
      application: app.key,
    })[0] ??
    listComponents({
      type: PARAM_VAL.PAGE,
      application: app.key,
    })[0]
  );
}

function parseSortDirection(str: string = ""): SortDirection | undefined {
  const uppercasedStr = str.toUpperCase();

  if (uppercasedStr === "ASC" || uppercasedStr === "DESC") {
    return uppercasedStr;
  }

  return undefined;
}

//------------------------------- POST handler for the part mover stages -------------------------------

// TODO: parameterize the Request
export function post(req: XP.Request): XP.Response {
  if (!hasAuthRole("system.admin")) {
    return {
      status: 403,
      body: "FORBIDDEN",
    };
  }

  const isCleanupStage = getParamBool(req, PARAM.cleanup);
  const model = !isCleanupStage ? runReplaceAndGetSummary(req) : runCleanupAndGetSummary(req);

  return {
    // TODO: Should use dedicated views for the different stages, diffierent from the main part finder view (which should in turn be split into replace=true view and the old regular "finder" view).

    // TODO: Type the render (parameterized, see the render for .get above) to enforce the model attributes
    body: render(COMPONENT_VIEW, model),
  };
}
