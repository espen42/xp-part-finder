import { flatMap, objectKeys, runAsAdmin, startsWith, stringAfterLast } from "/lib/part-finder/utils";
import { getToolUrl } from "/lib/xp/admin";
import { list as listRepos } from "/lib/xp/repo";
import type { Application } from "/lib/xp/app";
import {
  ComponentDescriptorType,
  type LayoutDescriptor,
  listComponents,
  type PageDescriptor,
  PartDescriptor,
} from "/lib/xp/schema";
import { ComponentItem, UsagePathSubvalue } from "/admin/tools/part-finder/part-finder.freemarker";
import { query } from "/lib/xp/content";
import { LAYOUT_KEY, PAGE_KEY, PART_KEY, PartFinderQueryParams } from "./part-finder";

export type Component = PartDescriptor | LayoutDescriptor | PageDescriptor;

function getPartFinderUrl(params: PartFinderQueryParams): string {
  const queryParams = objectKeys(params)
    .filter((key) => !!key)
    .map((key: string) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  return `${getToolUrl("no.item.partfinder", "part-finder")}?${queryParams}`;
}

export function getCMSRepoIds(): string[] {
  return runAsAdmin(() =>
    listRepos()
      .map((repo) => repo.id)
      .filter((repoId) => startsWith(repoId, "com.enonic.cms")),
  );
}

export function listComponentsInApplication(
  installedApps: Application[],
  type: ComponentDescriptorType,
): PartDescriptor[] {
  return runAsAdmin(() =>
    flatMap(installedApps, (app) =>
      listComponents({
        application: app.key,
        type,
      }),
    ),
  );
}

export function getComponentUsagesInRepo(
  component: Component,
  repositories: string[],
  params: Partial<PartFinderQueryParams>,
): ComponentItem {
  const currentItem = repositories
    .map((repository) => getComponentUsages(component, repository, params))
    .reduce<ComponentItem>(
      (usages, componentUsage) => {
        return {
          url: componentUsage.url,
          total: usages.total + componentUsage.total,
          key: usages.key,
          type: usages.type.toLowerCase(),
          displayName: usages.displayName,
          contents: usages.contents.concat(componentUsage.contents),
        };
      },
      {
        url: "",
        total: 0,
        key: component.key,
        type: component.type.toLowerCase(),
        displayName: component.displayName,
        contents: [],
      },
    );

  if (currentItem?.contents && currentItem.contents.length) {
    currentItem.contents.forEach((content) => {
      if (content?.usagePaths) {
        const relevantUsages = content?.usagePaths[currentItem.key] || [];
        content.multiUsage = relevantUsages.map((item) => ({
          ...item,
          getvalue: JSON.stringify(item.targetSubValue),
        }));
        if (relevantUsages.length > 0) {
          content.hasMultiUsage = true;
        }
      }
    });
  }

  return currentItem;
}

const makeFlatSearchable = (object, key = "", result = {}) => {
  if (object === null || typeof object === "string" || typeof object === "number" || typeof object === "boolean") {
    if (key === "") {
      return object;
    }
    result[key] = object;
  } else if (Array.isArray(object)) {
    const prefix = key === "" ? key : key + ".";
    object.forEach((item, i) => {
      makeFlatSearchable(item, `${prefix}${i}`, result);
    });
  } else if (typeof object === "object") {
    const prefix = key === "" ? key : key + ".";
    Object.keys(object).forEach((key) => {
      makeFlatSearchable(object[key], `${prefix}${key}`, result);
    });
  } else if (object === undefined) {
    // ignore undefiend
  } else {
    throw Error("Can't handle " + typeof object + " value below key '" + key + "': " + JSON.stringify(object));
  }

  return result;
};

const pushUsagePath = (component, usagePaths, subPath) => {
  if (subPath) {
    const subPathToSearch =
      typeof subPath === "string" && subPath.indexOf("=") !== -1 ? subPath.slice(0, subPath.indexOf("=")) : subPath;

    const flatComponent = makeFlatSearchable(component);
    usagePaths.push({
      path: component.path,
      targetSubValue: flatComponent[subPathToSearch],
    });
  } else {
    usagePaths.push({
      path: component.path,
    });
  }
};

function getUsagePaths(
  hit: { page?; _path: string },
  targetTypeUpperCase: string,
  targetDescriptor: string,
  subPath: string | undefined,
): UsagePathSubvalue[] | null {
  const usagePaths: UsagePathSubvalue[] = [];
  const targetType = targetTypeUpperCase.toLowerCase();

  switch (targetTypeUpperCase) {
    case LAYOUT_KEY:
      Object.keys(hit?.page?.regions || {}).forEach((rkey) => {
        const region = (hit?.page?.regions || {})[rkey] || { components: [] };
        region.components.forEach((component) => {
          if (component.descriptor === targetDescriptor && component.type === targetType) {
            pushUsagePath(component, usagePaths, subPath);
          }
        });
      });
      return usagePaths;

    case PAGE_KEY:
      return null;

    case PART_KEY:
      // Find parts directly in page-level regions
      Object.keys(hit?.page?.regions || {}).forEach((regionName) => {
        const region = (hit?.page?.regions || {})[regionName] || { components: [] };
        region.components.forEach((component) => {
          if (component.descriptor === targetDescriptor && component.type === targetType) {
            pushUsagePath(component, usagePaths, subPath);

            // Find parts directly in layout-level regions:
          } else if (component.type === LAYOUT_KEY.toLowerCase() && component.regions) {
            Object.keys(component.regions).forEach((subRegionName) => {
              const subRegion = component.regions[subRegionName] || { components: [] };
              subRegion.components.forEach((subComponent) => {
                if (subComponent.descriptor === targetDescriptor && subComponent.type === targetType) {
                  pushUsagePath(subComponent, usagePaths, subPath);
                }
              });
            });
          }
        });
      });
      return usagePaths;
  }

  return [];
}

function getComponentUsages(
  component: Component,
  repository: string,
  params: Partial<PartFinderQueryParams>,
): ComponentItem {
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
    type: component.type.toLowerCase(),
    displayName: component.displayName,
    url: getPartFinderUrl({
      key: component.key,
      type: component.type,
      replace: params.replace,
      getvalue: params.getvalue,
    }),
    contents: res.hits.map((hit) => ({
      url: `${getToolUrl("com.enonic.app.contentstudio", "main")}/${repo}/edit/${hit._id}`,
      displayName: hit.displayName,
      repo,
      path: hit._path,
      id: hit._id,
      usagePaths: {
        [component.key]: getUsagePaths(hit, component.type, component.key, params.getvalue),
      },
      multiUsage: [],
      hasMultiUsage: false,
    })),
  };
}
