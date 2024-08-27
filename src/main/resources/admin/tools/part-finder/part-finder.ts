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
import {
  find,
  flatMap,
  notNullOrUndefined,
  objectKeys,
  runAsAdmin,
  startsWith,
  stringAfterLast,
  unique,
} from "/lib/part-finder/utils";
import type { ComponentItem, ComponentList } from "./part-finder.freemarker";
import type { ComponentViewParams } from "/admin/views/component-view/component-view.freemarker";
import type { Header, Link } from "/admin/views/header/header.freemarker";

type Component = PartDescriptor | LayoutDescriptor | PageDescriptor;

type PartFinderQueryParams = {
  key: string;
  type: string;
};

const view = resolve("part-finder.ftl");
const componentView = resolve("../../views/component-view/component-view.ftl");

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

  return {
    body: render<ComponentList & ComponentViewParams & Header>(view, {
      displayName: "Part finder",
      filters,
      currentItemKey: componentKey,
      currentAppKey,
      currentItem,
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
    }),
  };
}

function getAppKey(key: string): string {
  return key.split(":")[0];
}

function getPartFinderUrl(params: PartFinderQueryParams): string {
  const queryParams = objectKeys(params)
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  return `${getToolUrl("no.item.partfinder", "part-finder")}?${queryParams}`;
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
        count: 1000,
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
    url: getPartFinderUrl({
      key: component.key,
      type: component.type,
    }),
    contents: res.hits.map((hit) => ({
      url: `${getToolUrl("com.enonic.app.contentstudio", "main")}/${repo}/edit/${hit._id}`,
      displayName: hit.displayName,
      path: hit._path,
    })),
  };
}

function parseComponentType(str: string = ""): ComponentDescriptorType | undefined {
  const uppercasedStr = str.toUpperCase();

  if (uppercasedStr === "PAGE" || uppercasedStr === "LAYOUT" || uppercasedStr === "PART") {
    return uppercasedStr;
  }

  return undefined;
}
