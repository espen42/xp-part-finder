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
import type { ComponentItem } from "/admin/tools/part-finder/part-finder.freemarker";
import { query } from "/lib/xp/content";
import {
  LAYOUT_KEY,
  PAGE_KEY,
  PART_KEY,
  PartFinderQueryParams
} from "./part-finder";

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
        if (relevantUsages.length > 1) {
          content.hasMultiUsage = true;
          content.multiUsage = relevantUsages;
        }
      }
    });
  }

  return currentItem;
}

function getUsagePaths(hit, type: string, key: string): string[] | null {
  const usagePaths = [];
  const targetType = type.toLowerCase();
  const regionType = LAYOUT_KEY.toLowerCase();

  switch (type) {
    case LAYOUT_KEY:
      Object.keys(hit?.page?.regions || {}).forEach((rkey) => {
        const region = (hit?.page?.regions || {})[rkey] || { components: [] };
        region.components.forEach((component) => {
          if (component.descriptor === key && component.type === targetType) {
            // @ts-expect-error @typescript-eslint/ban-ts-comment
            usagePaths.push(component.path);
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
          if (component.descriptor === key && component.type === targetType) {
            // @ts-expect-error @typescript-eslint/ban-ts-comment
            usagePaths.push(component.path);

            // Find parts directly in layout-level regions:
          } else if (component.type === regionType && component.regions) {
            Object.keys(component.regions).forEach((subRegionName) => {
              const subRegion = component.regions[subRegionName] || { components: [] };
              subRegion.components.forEach((subComponent) => {
                if (subComponent.descriptor === key && subComponent.type === targetType) {
                  // @ts-expect-error @typescript-eslint/ban-ts-comment
                  usagePaths.push(subComponent.path);
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
    }),
    contents: res.hits.map((hit) => ({
      url: `${getToolUrl("com.enonic.app.contentstudio", "main")}/${repo}/edit/${hit._id}`,
      displayName: hit.displayName,
      path: hit._path,
      id: hit._id,
      usagePaths: {
        [component.key]: getUsagePaths(hit, component.type, component.key),
      },
      multiUsage: [],
      hasMultiUsage: false,
    })),
  };
}
