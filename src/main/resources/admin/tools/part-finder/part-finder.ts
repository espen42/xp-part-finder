import { getToolUrl } from "/lib/xp/admin";
import { list as listApps, type Application } from "/lib/xp/app";
import { Content, get as getContent } from "/lib/xp/content";
import { connect as nodeConnect } from "/lib/xp/node";
import { run as runInContext } from "/lib/xp/context";
import { hasRole as hasAuthRole } from "/lib/xp/auth";
import { list as listRepos } from "/lib/xp/repo";
import { listComponents, type ComponentDescriptorType, type ComponentDescriptor } from "/lib/xp/schema";

import { render } from "/lib/tineikt/freemarker";

import {
  stringAfterLast,
  assertIsDefined,
  getPartFinderUrl,
  notNullOrUndefined,
  runAsAdmin,
  startsWith,
} from "/lib/part-finder/utils";
import { getComponentNavLinkList } from "../../views/navigation/navigation";
import { getComponentUsagesInRepo } from "../../views/component-view/component-view";
import type { ComponentViewParams } from "../../views/component-view/component-view.freemarker";
import type { Header, Link } from "../../views/header/header.freemarker";
import type { SortDirection } from "@enonic-types/core";
import { createEditorFunc } from "/admin/tools/part-finder/editor";

import { Results } from "/admin/tools/part-finder/results";
import { ComponentItem, ComponentList } from "/admin/tools/part-finder/part-finder.freemarker";
import { processMultiUsage } from "/admin/tools/part-finder/usagePaths";

export type PartFinderQueryParams = {
  key: string;
  type: ComponentDescriptorType;
  sort?: string;
  dir?: string;
  replace?: string;
  getvalue?: string;
  repo?: string;
};

export const PART_KEY = "PART";
export const LAYOUT_KEY = "LAYOUT";
export const PAGE_KEY = "PAGE";

const PAGE_TITLE = "Part finder";

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

  if (uppercasedStr === PAGE_KEY || uppercasedStr === LAYOUT_KEY || uppercasedStr === PART_KEY) {
    return uppercasedStr;
  }

  return undefined;
}

const getValueRequest = (req): undefined | string => {
  const getValueParam = (req.params.getvalue || "").trim();
  return getValueParam === "undefined" || getValueParam === "false" || getValueParam === "" ? undefined : getValueParam;
};
// The request parameter "getvalue" can be just a path to a value on the component data (eg. "config.layout._selected"),
// but it can also have a "=" and a target value after (eg. 'config.layout._selected="two"'). If it does, this is used
// to remove the checkbox selector on usage items (component paths) where the value does NOT match whatever comes after the "="
// (eg. the URI parameter '...&getvalue=config.layout._selected="two"' will display all usages, but only a checkbox next to the
// items whose values is the string "two".
const filterSelectorsByMatchingGetvalue = (currentItem: ComponentItem | undefined, getValueString) => {
  if (currentItem && getValueString && getValueString.indexOf("=") !== -1) {
    const targetValue = JSON.parse(getValueString.substring(getValueString.indexOf("=") + 1));

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

  const getValueParam = getValueRequest(req);
  const displayReplacer = !!(req.params.replace + "")
    .trim()
    .toLowerCase()
    .replace(/^undefined$/, "")
    .replace(/^false$/, "");

  const currentAppKey = getAppKey(currentItemKey);
  const cmsRepoIds = getCMSRepoIds(req.params.repo);
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
        getValueParam,
        displayReplacer,
      )
    : undefined;

  if (!currentItem) {
    return {
      status: 404,
      body: "<h1>Component not found</h1>",
    };
  }

  processMultiUsage(currentItem);

  filterSelectorsByMatchingGetvalue(currentItem as unknown as ComponentItem, getValueParam);

  // If in Turbo Frame, only render the component view
  if (req.headers["turbo-frame"] === "content-view") {
    const model: ComponentViewParams = {
      currentItem,
      displayReplacer: displayReplacer && (currentItemType === PART_KEY || currentItemType === LAYOUT_KEY),
      displaySummaryAndUndo: false,
    };
    if (getValueParam) {
      model.getvalue = getValueParam;
    }

    return {
      body: wrapInHtml({
        markup: render<ComponentViewParams>(COMPONENT_VIEW, model),
        title: `${PAGE_TITLE} - ${currentItem.key}`,
      }),
    };
  }

  const { active, noSchema } = getComponentNavLinkList(cmsRepoIds, currentAppKey, displayReplacer, getValueParam);

  const filters = installedApps.map<Link>((app) => {
    const firstComponent = getFirstComponent(app);

    return {
      text: app.key,
      url: firstComponent
        ? getPartFinderUrl({
            key: firstComponent.key,
            type: firstComponent.type,
            repo: req.params.repo || "",
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
    hasNoschema: Object.keys(noSchema || {}).length > 0,
  };

  if (getValueParam) {
    model.getvalue = getValueParam;
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

function getCMSRepoIds(repoParam: string | undefined | null): string[] {
  repoParam = (repoParam || "").trim().replace(/^undefined$/, "");
  if (startsWith(repoParam, "com.enonic.cms.")) {
    repoParam = repoParam.replace(/^com\.enonic\.cms\./, "");
  }

  return runAsAdmin(() =>
    listRepos()
      .map((repo) => repo.id)
      .filter((repoId) => startsWith(repoId, "com.enonic.cms."))
      .filter((repoId) => !repoParam || repoId === "com.enonic.cms." + repoParam),
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

const parseComponentPathsPerId = (targetIds) => {
  let i: number, id: string, path: string | null;
  const componentPathsPerId: Record<string, string[] | null> = {};

  for (i = 0; i < targetIds.length; i++) {
    id = targetIds[i];
    path = null;

    // If one of the targetIds have "__" in it, it signifies that this target is a multi-component-in-one-page one
    // (which has id before "__" and path after), aka multi-path-usage (ie. an id should only replace this and that
    // component path, and keep the same component on other paths).
    // And in that case, all the targets by that id should be multi's. And vice versa. Check that, throw error if mix-up.
    // If no mix-up, register the path or lack of path for that ID, for the editor func to handle.
    if (id.indexOf("__") !== -1) {
      id = targetIds[i].split("__")[0];
      path = targetIds[i].replace(/^.*?__/, "");

      if (componentPathsPerId[id] === null) {
        throw Error(
          `Parameter error: componentPathsPerId[${JSON.stringify(id)}] is already null instead of an array, can't add ${JSON.stringify(path)}`,
        );
      }

      componentPathsPerId[id] = componentPathsPerId[id] || [];
      // @ts-expect-error TS2531
      componentPathsPerId[id].push(path);
    } else {
      if (Array.isArray(componentPathsPerId[id])) {
        throw Error(
          `Parameter error: componentPathsPerId[${JSON.stringify(id)}'] is already an array, can't set it to null`,
        );
      }
      componentPathsPerId[id] = null;
    }
  }

  return componentPathsPerId;
};

export function post(req: XP.Request): XP.Response {
  if (!hasAuthRole("system.admin")) {
    return {
      status: 403,
      body: "FORBIDDEN",
    };
  }

  const sourceKey = (req.params.key || "").trim();
  const newKey = (req.params.new_part_ref || "").trim();
  const componentType = ((req.params.type || "") + "").trim().toLowerCase();

  const targetBranch = "draft";

  // const undo: boolean = !!req.params.undo;

  const targetIds: string[] = Object.keys(req.params)
    .filter((k) => k.startsWith("select-item--"))
    .map((k) => req.params[k] || "");

  const args: { [key: string]: string } = {
    key: sourceKey,
    new_part_ref: newKey,
    type: componentType,
  };

  const missingArgs = Object.keys(args)
    .filter((key) => !args[key])
    .map((key) => key);
  if (missingArgs.length > 0) {
    return {
      status: 400,
      body: "BAD REQUEST. Missing POST parameters: " + JSON.stringify(missingArgs),
    };
  }

  let componentPathsPerId;
  try {
    componentPathsPerId = parseComponentPathsPerId(targetIds);
  } catch (e) {
    log.error(e);
    return {
      status: 400,
      body: "BAD REQUEST. Parameter error",
    };
  }

  const [oldAppKey, oldComponentKey] = sourceKey.split(":");
  const [newAppKey, newComponentKey] = newKey.split(":");

  const results = new Results(sourceKey, newKey, componentType);

  const repoIds = getCMSRepoIds(req.params.repo);
  repoIds.forEach((targetRepo) => {
    const repoName = stringAfterLast(targetRepo, ".");
    results.setRepoContext(repoName);

    const repo = nodeConnect({
      repoId: targetRepo,
      branch: targetBranch,
    });

    runInContext(
      {
        repository: targetRepo,
        branch: targetBranch,
        principals: ["role:system.admin"],
      },
      () => {
        let item: Content | null;

        const editor = createEditorFunc(
          oldAppKey,
          oldComponentKey,
          newAppKey,
          newComponentKey,
          componentType,
          results,
          componentPathsPerId,
        );

        Object.keys(componentPathsPerId).forEach((id) => {
          item = null;

          try {
            item = getContent({
              key: id,
            });

            if (item) {
              repo.modify({
                key: id,
                editor: editor,
              });
            }
          } catch (e) {
            results.markError(item, null, e, id);
          }
        });
      },
    );
  });

  const taskSummary = `${sourceKey} → ${newKey}`;
  const appKey = getAppKey(newComponentKey);
  const type = componentType.toUpperCase();

  const model = {
    title: `${PAGE_TITLE} - REPLACEMENT SUMMARY: ${taskSummary}`,
    displayName: PAGE_TITLE,
    filters: [],
    itemLists: [],
    currentItemKey: newKey,
    currentAppKey: appKey,
    displayReplacer: false,
    displaySummaryAndUndo: true,
    oldItemKey: `${sourceKey}`,
    newItemToolUrl: `${getToolUrl("no.item.partfinder", "part-finder")}?key=${newAppKey}%3A${newComponentKey}&type=${type}&replace=true`,
    currentItem: {
      url: `/admin/tool/com.enonic.app.contentstudio/main/part-finder?key=${newAppKey}%3A${newComponentKey}&type=${type}`,
      total: targetIds.length,
      key: newKey,
      type: componentType,
      displayName: "",
      contents: results.buildContentResult(),
    },
  };

  return {
    body: render(COMPONENT_VIEW, model),
  };
}
