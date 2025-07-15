import { getToolUrl } from "/lib/xp/admin";
import { list as listApps, type Application } from "/lib/xp/app";
import { Content, get as getContent } from "/lib/xp/content";
import { connect as nodeConnect } from "/lib/xp/node";
import { run as runInContext } from "/lib/xp/context";
import { hasRole as hasAuthRole } from "/lib/xp/auth";
import { listComponents, type ComponentDescriptorType, type ComponentDescriptor } from "/lib/xp/schema";

import { Node } from "@enonic-types/lib-node";
import { getAliasOrUserKey } from "/lib/part-finder/utils/aliasUser";

import { render } from "/lib/tineikt/freemarker";

import {
  stringAfterLast,
  assertIsDefined,
  getPartFinderUrl,
  notNullOrUndefined,
  runAsAdmin,
} from "/lib/part-finder/utils/utils";
import { getComponentNavLinkList } from "../../views/navigation/navigation";
import { getComponentUsagesInRepo } from "../../views/component-view/component-view";
import type { ComponentViewParams } from "../../views/component-view/component-view.freemarker";
import type { Header, Link } from "../../views/header/header.freemarker";
import type { SortDirection } from "@enonic-types/core";
import { createReplaceEditor } from "/lib/part-finder/editor/replace/editor";

import { Results } from "/lib/part-finder/utils/results";
import { ComponentItem, ComponentList, Operation } from "/admin/tools/part-finder/part-finder.freemarker";
import { processMultiUsage } from "/admin/tools/part-finder/usagePaths";
import { ContentItem, EditorFunc } from "/lib/part-finder/editor";
import {
  getDisplayArchiveParam,
  getDisplayReplacerParam,
  getDisplayUnusedParam,
  getParamBool,
  //getParamBool,
  getRepoParam,
  getSortParam,
} from "/lib/part-finder/utils/params";
import { getParamsForReplacing } from "/lib/part-finder/editor/replace/params";
import { getCMSRepoIds } from "/lib/part-finder/utils/repoIds";
import { listContentIdsAndUsagePaths } from "/lib/part-finder/utils/contentIdSummary";

export type PartFinderQueryParams = {
  key: string;
  type: ComponentDescriptorType;
  sort?: string;
  dir?: string;
  replace?: string;
  getconfig?: string;
  repo?: string;
};

export const PART_KEY = "PART";
export const LAYOUT_KEY = "LAYOUT";
export const PAGE_KEY = "PAGE";

const PAGE_TITLE = "Part finder";
const TARGET_BRANCH = "draft";
const PRINCIPAL_ADMIN = "role:system.admin";

const VIEW = resolve("part-finder.ftl");
const COMPONENT_VIEW = resolve("../../views/component-view/component-view.ftl");

export const SIGNATURE_MARKER_KEY = "/\\$@:__ This contentitem was changed so sign it __:@/\\";

export function getAppKey(key: string): string {
  return key.split(":")[0];
}

export function wrapInHtml({ markup, title }: { markup: string; title: string }): string {
  return `<!DOCTYPE html><html lang="en"><head><title>${title}</title></head><body>${markup}</body></html>`;
}

function parseComponentType(str: string = ""): ComponentDescriptorType | undefined {
  const uppercasedStr = str.toUpperCase();

  if (uppercasedStr === PAGE_KEY || uppercasedStr === LAYOUT_KEY || uppercasedStr === PART_KEY) {
    return uppercasedStr;
  }

  return undefined;
}

const getConfigRequest = (req): undefined | string => {
  const getConfigParam = (req.params.getconfig || "").trim();
  return getConfigParam === "undefined" || getConfigParam === "false" || getConfigParam === ""
    ? undefined
    : getConfigParam;
};

const parseTargetConfig = (getConfigString) => {
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
      if (targetValue === "undefined") {
        targetValue = undefined;
      }
      log.info(`Fallback: handling URI parameter getconfig target as raw string instead of JSON: '${targetValue}'`);
    } catch (e2: unknown) {
      if (e2 instanceof Error) {
        log.warning(e2.message);
      } else {
        log.warning(e1);
      }

      throw Error(`Couldn't parse requested getconfig: '${getConfigString}'`);
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
  const currentItemType = parseComponentType(req.params.type);
  const currentItemKey = req.params.key;
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
        key: firstComponent.key,
        type: firstComponent.type,
        repo: req.params.repo || "",
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
          field: req.params.sort ?? "_path",
          direction: parseSortDirection(req.params.dir),
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
      displayReplacer: currentItemType === PART_KEY || currentItemType === LAYOUT_KEY ? displayReplacer : "false",
      displaySummaryAndUndo: false,
    };
    if (getConfigParam) {
      model.getconfig = getConfigParam;
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
            key: firstComponent.key,
            type: firstComponent.type,
            repo: repoParam,
            getconfig: getConfigParam || "",
            replace: displayReplacer,
            archive: displayArchives,
            sort: sortParam,
            unused: displayUnused,
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
  };

  if (getConfigParam) {
    model.getconfig = getConfigParam;
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
      type: PART_KEY,
      application: app.key,
    })[0] ??
    listComponents({
      type: LAYOUT_KEY,
      application: app.key,
    })[0] ??
    listComponents({
      type: PAGE_KEY,
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

//-------------------------------

const runEditor = (
  editorFunc: EditorFunc,
  repoIds: string[],
  componentPathsPerId: Record<string, string[] | null>,
  operation: Operation,
  results: Results,
) => {
  const aliasOrUserKey = getAliasOrUserKey();

  repoIds.forEach((targetRepo) => {
    const repoName = stringAfterLast(targetRepo, ".");
    results.setRepoContext(repoName);

    const repo = nodeConnect({
      repoId: targetRepo,
      branch: TARGET_BRANCH,
    });

    runInContext(
      {
        repository: targetRepo,
        branch: TARGET_BRANCH,
        principals: [PRINCIPAL_ADMIN],
      },
      () => {
        let item: Content | null;

        Object.keys(componentPathsPerId).forEach((key) => {
          item = null;
          try {
            item = getContent({ key });
            if (item) {
              repo.modify({
                key,
                editor: (contentItem: Node<ContentItem>) => {
                  const modifiedContentItem = editorFunc(contentItem);

                  // If the content item has been changed, sign the modified content item with the alias user or current user.
                  if (modifiedContentItem[SIGNATURE_MARKER_KEY]) {
                    delete modifiedContentItem[SIGNATURE_MARKER_KEY];
                    modifiedContentItem.modifier = aliasOrUserKey;
                  }
                  return modifiedContentItem;
                },
              });
            }
          } catch (e) {
            results.markError(item, null, operation, e, key);
          }
        });
      },
    );
  });
};

export function post(req: XP.Request): XP.Response {
  if (!hasAuthRole("system.admin")) {
    return {
      status: 403,
      body: "FORBIDDEN",
    };
  }

  let model;

  const isReview = getParamBool(req, "review");
  if (!isReview) {
    const {
      oldAppKey,
      oldComponentKey,
      newAppKey,
      newComponentKey,
      componentPathsPerId,
      requestedPostprocessors,
      sortParam,
      sourceKey,
      newKey,
      componentType,
      repoIds,
      displayArchiveParam,
      displayUnusedParam,
    } = getParamsForReplacing(req);

    const results = new Results(sourceKey, newKey, componentType);

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

    runEditor(replaceEditor, repoIds, componentPathsPerId, "ADD", results);

    const taskSummary = `${sourceKey} → ${newKey}`;
    const appKey = getAppKey(newComponentKey);
    const type = componentType.toUpperCase();

    const currentItem = {
      url: `/admin/tool/com.enonic.app.contentstudio/main/part-finder?key=${newAppKey}%3A${newComponentKey}&type=${type}`,
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

    model = {
      title: `${PAGE_TITLE} - REPLACEMENT SUMMARY: ${taskSummary}`,
      displayName: PAGE_TITLE,
      currentItemKey: newKey,
      currentAppKey: appKey,
      displayReplacer: "",
      displaySummaryAndUndo: true,
      oldItemKey: `${sourceKey}`,
      newItemToolUrl: `${getToolUrl("no.item.partfinder", "part-finder")}?key=${newAppKey}%3A${newComponentKey}&type=${type}&replace=true${sortParam}${displayArchiveParam}${displayUnusedParam}`,
      currentItem,
      allIds,
    };
  } else {
    throw Error("Nope");
  }

  return {
    // TODO: Should make dedicated view for this, diffierent from the main part finder view (which should in turn be split into replace=true view and the old regular "finder" view).
    body: render(COMPONENT_VIEW, model),
  };
}
