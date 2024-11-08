import { render } from "/lib/tineikt/freemarker";
import { getToolUrl } from "/lib/xp/admin";

import { Content, get as getContent, modify as modifyContent } from "/lib/xp/content";
import { run as runInContext } from "/lib/xp/context";
import { hasRole as hasAuthRole } from "/lib/xp/auth";
import { list as listApps } from "/lib/xp/app";
import { getComponent, type ComponentDescriptorType } from "/lib/xp/schema";
import { find, notNullOrUndefined, runAsAdmin, startsWith, stringAfterLast, unique } from "/lib/part-finder/utils";
import type { ComponentList } from "./part-finder.freemarker";
import type { ComponentViewParams } from "/admin/views/component-view/component-view.freemarker";
import type { Header, Link } from "/admin/views/header/header.freemarker";
import { createEditorFunc, EditorResult } from "/admin/tools/part-finder/editor";
import {
  Component,
  getCMSRepoIds,
  getComponentUsagesInRepo,
  listComponentsInApplication,
} from "/admin/tools/part-finder/listing";
import { buildContentResult, createPushResultFunc } from "/admin/tools/part-finder/results";

export type PartFinderQueryParams = {
  key: string;
  type: string;
  replace?: string;
  getvalue?: string;
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

export function get(req: XP.Request<PartFinderQueryParams>): XP.Response {
  const currentItemType = parseComponentType(req.params.type);
  const componentKey = req.params.key;

  const cmsRepoIds = getCMSRepoIds();

  // If in Turbo Frame, only render the component view
  if (req.headers["turbo-frame"] === "content-view" && componentKey && currentItemType) {
    const component = getComponent({
      type: currentItemType,
      key: componentKey,
    }) as Component;

    if (component) {
      const currentItem = getComponentUsagesInRepo(component, cmsRepoIds, req.params);

      return {
        body: wrapInHtml({
          markup: render<ComponentViewParams>(COMPONENT_VIEW, {
            currentItem,
            getvalue: req.params.getvalue || undefined,
            displayReplacer: !!req.params.replace && (currentItemType === PART_KEY || currentItemType === LAYOUT_KEY),
            displaySummaryAndUndo: false,
          }),
          title: `${PAGE_TITLE} - ${component.displayName}`,
        }),
      };
    }
  }

  const installedApps = runAsAdmin(() => listApps());

  const allParts = listComponentsInApplication(installedApps, PART_KEY);
  const allLayouts = listComponentsInApplication(installedApps, LAYOUT_KEY);
  const allPages = listComponentsInApplication(installedApps, PAGE_KEY);

  const parts = allParts.map((component) => {
    return getComponentUsagesInRepo(component, cmsRepoIds, req.params);
  });
  const layouts = allLayouts.map((component) => {
    return getComponentUsagesInRepo(component, cmsRepoIds, req.params);
  });
  const pages = allPages.map((component) => {
    return getComponentUsagesInRepo(component, cmsRepoIds, req.params);
  });

  const allItems = parts.concat(layouts).concat(pages);

  if (!componentKey) {
    return {
      redirect: allItems[0].url,
    };
  }

  const currentItem = find(allItems, (item) => item.key === componentKey);

  const appKeysWithUsedComponents = unique(allItems.map((item) => getAppKey(item.key)));

  const filters = appKeysWithUsedComponents
    .map((appKey) => find(installedApps, (app) => app.key === appKey))
    .filter(notNullOrUndefined)
    .map<Link>((app) => ({
      text: app.key ?? "",
      url: find(allItems, (component) => startsWith(component.key, app.key))?.url ?? "",
    }));

  if (appKeysWithUsedComponents.length === 0) {
    return {
      status: 404,
      body: "<h1>No installed applications found</h1>",
    };
  }

  const currentAppKey = getAppKey(componentKey);

  const model = {
    title: `${PAGE_TITLE} - ${currentItem?.displayName}`,
    displayName: PAGE_TITLE,
    filters,
    currentItemKey: componentKey,
    currentAppKey,
    currentItem,
    displayReplacer: !!req.params.replace,
    displaySummaryAndUndo: false,
    itemLists: [
      {
        title: "Parts",
        items: parts.filter((part) => startsWith(part.key, currentAppKey)),
      },
      {
        title: "Layouts",
        items: layouts.filter((layout) => startsWith(layout.key, currentAppKey)),
      },
      {
        title: "Pages",
        items: pages.filter((page) => startsWith(page.key, currentAppKey)),
      },
    ].filter((list) => list.items.length > 0),
  };

  return {
    body: render<ComponentList & ComponentViewParams & Header>(VIEW, model),
  };
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

  const [newAppKey, newComponentKey] = newKey.split(":");

  const editorResults: EditorResult[] = [];

  const repoIds = getCMSRepoIds();
  repoIds.forEach((targetRepo) => {
    const repoName = stringAfterLast(targetRepo, ".");

    runInContext(
      {
        repository: targetRepo,
        branch: targetBranch,
        principals: ["role:system.admin"],
      },
      () => {
        let item: Content | null;

        const pushResult = createPushResultFunc(editorResults, repoName, sourceKey, newKey, componentType);
        const editor = createEditorFunc(sourceKey, newKey, pushResult, componentType, componentPathsPerId);

        Object.keys(componentPathsPerId).forEach((id) => {
          item = null;

          try {
            item = getContent({
              key: id,
            });

            if (item) {
              modifyContent({
                key: id,
                editor: editor,
              });
            }
          } catch (e) {
            pushResult(item, componentPathsPerId[id], e, id);
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
      contents: buildContentResult(editorResults),
    },
  };

  return {
    body: render(COMPONENT_VIEW, model),
  };
}
