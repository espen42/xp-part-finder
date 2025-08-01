import { Application, list as listApps } from "/lib/xp/app";
import { assertIsDefined, getPartFinderUrl, notNullOrUndefined, runAsAdmin } from "/lib/part-finder/utils/utils";
import { ComponentDescriptor, listComponents } from "/lib/xp/schema";
import { PARAM, PARAM_VAL, PartFinderQueryParams } from "/lib/part-finder/utils/params";
import type { SortDirection } from "@enonic-types/core";
import { ComponentItem } from "/admin/tools/part-finder/part-finder.freemarker";
import { getComponentUsagesInRepo } from "/admin/views/component-view/component-view";
import { processMultiUsage } from "/admin/tools/part-finder/usagePaths";
import { renderNavLinks } from "/lib/part-finder/stages/finder/navLinks";
import { renderComponentView } from "/lib/part-finder/stages/finder/componentView";
import { getCommonFinderParams } from "/lib/part-finder/stages/finder/params";

export const PAGE_TITLE = "Part finder";

export function getAppKey(key: string): string {
  return key.split(":")[0];
}

export function wrapInHtml({ markup, title }: { markup: string; title: string }): string {
  return `<!DOCTYPE html><html lang="en"><head><title>${title}</title></head><body>${markup}</body></html>`;
}

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

function listAppsWithComponents(): Application[] {
  return runAsAdmin(() => listApps()).filter((app) => notNullOrUndefined(getFirstComponent(app)));
}

export function getFirstComponent(app: Application): ComponentDescriptor | undefined {
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

export function findAndPresentComponentUsages(req: XP.Request<PartFinderQueryParams>): XP.Response {
  const installedApps = listAppsWithComponents();

  if (installedApps.length === 0) {
    return {
      status: 404,
      body: "<h1>No installed applications found</h1>",
    };
  }
  const {
    getConfigParam,
    displayReplaceSelectors,
    repoParam,
    displayArchives,
    cmsRepoIds,
    currentItemType,
    currentItemKey,
  } = getCommonFinderParams(req);

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
        displayReplaceSelectors,
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
  return req.headers["turbo-frame"] === "content-view"
    ? renderComponentView(currentItem, currentItemType, getConfigParam, repoParam, displayReplaceSelectors)
    : renderNavLinks(
        req,
        currentItem,
        currentItemKey,
        repoParam,
        cmsRepoIds,
        installedApps,
        displayArchives,
        getConfigParam,
        displayReplaceSelectors,
      );
}
