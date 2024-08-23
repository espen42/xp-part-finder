import { render } from "/lib/tineikt/freemarker";
import { getToolUrl } from "/lib/xp/admin";
import { query } from "/lib/xp/content";
import { list as listApps, type Application } from "/lib/xp/app";
import { list as listRepos } from "/lib/xp/repo";
import {
  listComponents,
  getComponent,
  type LayoutDescriptor,
  type PageDescriptor,
  type PartDescriptor,
  type ComponentDescriptorType,
} from "/lib/xp/schema";
import { find, flatMap, notNullOrUndefined, runAsAdmin, startsWith, stringAfterLast } from "/lib/part-finder/utils";
import type { ComponentItem, ComponentList, Link, ToolbarParams } from "./part-finder.freemarker";
import type { ComponentViewParams } from "/admin/components/component-view/component-view.freemarker";

const view = resolve("part-finder.ftl");
const componentView = resolve("../../components/component-view/component-view.ftl");

export function all(req: XP.Request): XP.Response {
  const currentItemType = parseComponentType(req.params.type);
  const currentItemKey = req.params.key;
  const appKey = req.params.appKey;

  const cmsRepoIds = getCMSRepoIds();

  // If in Turbo Frame, only render the component view
  if (req.headers["turbo-frame"] === "content-view" && currentItemKey && currentItemType) {
    const component = getComponent({
      type: currentItemType,
      key: currentItemKey,
    }) as Component;

    if (component) {
      return {
        body: render<ComponentViewParams>(componentView, {
          currentItem: getComponentUsagesInRepo(component, cmsRepoIds),
        }),
      };
    }
  }

  const installedApps = runAsAdmin(() => listApps());

  const allParts = listComponentsInApplication(installedApps, "PART");
  const allLayouts = listComponentsInApplication(installedApps, "LAYOUT");
  const allPages = listComponentsInApplication(installedApps, "PAGE");

  const parts = allParts.map((component) => getComponentUsagesInRepo(component, cmsRepoIds));
  const layouts = allLayouts.map((component) => getComponentUsagesInRepo(component, cmsRepoIds));
  const pages = allPages.map((component) => getComponentUsagesInRepo(component, cmsRepoIds));

  const allItems = parts.concat(layouts).concat(pages);

  const currentItem = find(allItems, (item) => item.key === currentItemKey) ?? allItems[0];

  const appKeysWithUsedComponents = allItems.reduce<string[]>((res, item) => {
    const appName = item.key.split(":")[0];
    if (res.indexOf(appName) === -1) {
      return res.concat([appName]);
    }

    return res;
  }, []);

  const filters = appKeysWithUsedComponents
    .map((appKey) => find(installedApps, (app) => app.key === appKey))
    .filter(notNullOrUndefined)
    .map<Link>((app) => ({
      text: app.displayName ?? "",
      url: `${getToolUrl("no.item.partfinder", "part-finder")}?appKey=${app.key}`,
      current: app.key === appKey,
    }));

  return {
    body: render<ComponentList & ComponentViewParams & ToolbarParams>(view, {
      currentItemKey: currentItemKey ?? currentItem.key,
      currentItem,
      filters: [
        {
          text: "No filter",
          url: getToolUrl("no.item.partfinder", "part-finder"),
          current: appKey === undefined,
        },
      ].concat(filters),
      itemLists: [
        {
          title: "Parts",
          items: parts.filter((part) => appKey === undefined || startsWith(part.key, appKey)),
        },
        {
          title: "Layouts",
          items: layouts.filter((layout) => appKey === undefined || startsWith(layout.key, appKey)),
        },
        {
          title: "Pages",
          items: pages.filter((page) => appKey === undefined || startsWith(page.key, appKey)),
        },
      ].filter((list) => list.items.length > 0),
    }),
  };
}

function getCMSRepoIds(): string[] {
  return runAsAdmin(() =>
    listRepos()
      .map((repo) => repo.id)
      .filter((repoId) => startsWith(repoId, "com.enonic.cms")),
  );
}

function listComponentsInApplication(installedApps: Application[], type: ComponentDescriptorType): PartDescriptor[] {
  return runAsAdmin(() =>
    flatMap(installedApps, (app) =>
      listComponents({
        application: app.key,
        type,
      }),
    ),
  );
}

function getComponentUsagesInRepo(component: Component, repositories: string[]): ComponentItem {
  return repositories
    .map((repository) => getComponentUsages(component, repository))
    .reduce<ComponentItem>(
      (usages, componentUsage) => {
        return {
          url: componentUsage.url,
          total: usages.total + componentUsage.total,
          key: usages.key,
          displayName: usages.displayName,
          contents: usages.contents.concat(componentUsage.contents),
        };
      },
      {
        url: "",
        total: 0,
        key: component.key,
        displayName: component.displayName,
        contents: [],
      },
    );
}

function getComponentUsages(component: Component, repository: string): ComponentItem {
  const res = runAsAdmin(
    () =>
      query({
        query: `components.${component.type}.descriptor = '${component.key}'`,
        count: 100,
      }),
    {
      repository,
    },
  );

  const repo = stringAfterLast(repository, ".");

  return {
    total: res.total,
    key: component.key,
    displayName: component.displayName,
    url: `${getToolUrl("no.item.partfinder", "part-finder")}?type=${component.type}&key=${component.key}`,
    contents: res.hits.map((hit) => ({
      url: `${getToolUrl("com.enonic.app.contentstudio", "main")}/${repo}/edit/${hit._id}`,
      displayName: hit.displayName,
      path: hit._path,
    })),
  };
}

type Component = PartDescriptor | LayoutDescriptor | PageDescriptor;

function parseComponentType(str: string = ""): ComponentDescriptorType | undefined {
  const uppercasedStr = str.toUpperCase();

  if (uppercasedStr === "PAGE" || uppercasedStr === "LAYOUT" || uppercasedStr === "PART") {
    return uppercasedStr;
  }

  return undefined;
}
