import { multiRepoConnect, type Aggregations, type DateBucket, type NumericBucket, Bucket } from "/lib/xp/node";
import { getPartFinderUrl, startsWith } from "/lib/part-finder/utils";
import { listComponents } from "/lib/xp/schema";

import type { ComponentNavLink, ComponentNavLinkList } from "./navigation.freemarker";
import { LAYOUT_KEY, PAGE_KEY, PART_KEY } from "/admin/tools/part-finder/part-finder";

const listCompsInCurrentApp = (currentAppKey, compType) => {
  return listComponents({ application: currentAppKey, type: compType }).map((comp) => comp.key);
};

const caseSensitiveKeyWorkaround = (aggregatedResult, currentAppKey, appFilter) => {
  const caseSensitiveCompKeys = {
    part: listCompsInCurrentApp(currentAppKey, PART_KEY),
    layout: listCompsInCurrentApp(currentAppKey, LAYOUT_KEY),
    page: listCompsInCurrentApp(currentAppKey, PAGE_KEY),
  };
  const processedResultKeys = {};
  let resultKey;

  Object.keys(aggregatedResult.aggregations).forEach((compType: string) => {
    processedResultKeys[compType] = {};

    aggregatedResult.aggregations[compType].buckets = aggregatedResult.aggregations[compType].buckets
      .filter(appFilter)
      .map((bucket: Bucket & { deprecated?: boolean }) => {
        resultKey = bucket.key.toLowerCase();
        for (const caseSensitiveKey of caseSensitiveCompKeys[compType]) {
          if (caseSensitiveKey.toLowerCase() === resultKey) {
            if (processedResultKeys[compType][resultKey]) {
              throw Error(
                `Ambivalent data: tried correcting ${compType} key '${resultKey}' for case-sensitivity. But it matches more than one case-sensitive key: '${processedResultKeys[compType][resultKey]}' and '${caseSensitiveKey}'.`,
              );
            }
            processedResultKeys[compType][resultKey] = caseSensitiveKey;

            if (caseSensitiveKey !== resultKey) {
              bucket.key = caseSensitiveKey;
              log.info(
                `Verified and corrected ${compType} key for case-sensitivity: '${resultKey}' --> '${caseSensitiveKey}'`,
              );
            }
          }
        }
        if (!processedResultKeys[compType][resultKey]) {
          log.warning(
            `A ${compType} key '${resultKey}' was found among stored data (aggregatedResult) but not among the schema for app '${currentAppKey}'. Most likely it's deprecated. Moving to separate list.`,
          );
          const deprCompType = "deprecated__" + compType;
          aggregatedResult.aggregations[deprCompType] = aggregatedResult.aggregations[deprCompType] || { buckets: [] };
          aggregatedResult.aggregations[deprCompType].buckets.push({
            ...bucket,
          });
          return null;
        }

        return bucket;
      })
      .filter((bucket) => !!bucket);
  });
};

export function getComponentNavLinkList(
  repoIds: string[],
  currentAppKey: string,
  displayReplacer: boolean,
  getvalueParam: string | undefined,
): ComponentNavLinkList[] {
  const aggregations = {
    part: {
      terms: {
        field: `components.part.descriptor`,
        size: 1000,
      },
    },
    layout: {
      terms: {
        field: `components.layout.descriptor`,
        size: 1000,
      },
    },
    page: {
      terms: {
        field: `components.page.descriptor`,
        size: 1000,
      },
    },
  } satisfies Aggregations;

  const connection = multiRepoConnect({
    sources: repoIds.map((repoId) => ({
      repoId,
      branch: "draft",
      principals: ["role:system.admin"],
    })),
  });

  const res = connection.query<typeof aggregations>({
    count: 0,
    aggregations,
  });

  const appKeyColon = currentAppKey + ":";
  const appFilter = (bucket: DateBucket | NumericBucket) => startsWith(bucket.key, appKeyColon);

  caseSensitiveKeyWorkaround(res, currentAppKey, appFilter);

  const getDecoratedUrl = (params: { key: string; type: string; replace?: string; getvalue?: string }): string => {
    if (displayReplacer) {
      params.replace = "true";
    }
    if (getvalueParam) {
      params.getvalue = getvalueParam;
    }
    const url = getPartFinderUrl(params);

    return url;
  };

  return [
    {
      title: "Parts",
      items: res.aggregations.part.buckets.filter(appFilter).map<ComponentNavLink>((bucket) => ({
        docCount: bucket.docCount,
        key: bucket.key,
        url: getDecoratedUrl({
          key: bucket.key,
          type: "PART",
        }),
      })),
    },
    {
      title: "Layouts",
      items: res.aggregations.layout.buckets.filter(appFilter).map<ComponentNavLink>((bucket) => ({
        docCount: bucket.docCount,
        key: bucket.key,
        url: getDecoratedUrl({
          key: bucket.key,
          type: "LAYOUT",
        }),
      })),
    },
    {
      title: "Pages",
      items: res.aggregations.page.buckets.filter(appFilter).map<ComponentNavLink>((bucket) => ({
        docCount: bucket.docCount,
        key: bucket.key,
        url: getDecoratedUrl({
          key: bucket.key,
          type: "PAGE",
        }),
      })),
    },
  ].filter((list) => list.items.length > 0);
}
