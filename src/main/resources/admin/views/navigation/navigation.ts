import { multiRepoConnect, type Aggregations, type DateBucket, type NumericBucket, Bucket } from "/lib/xp/node";
import { getPartFinderUrl, startsWith } from "/lib/part-finder/utils";
import { listComponents } from "/lib/xp/schema";

import type { ComponentNavLink, ComponentNavLinkList } from "./navigation.freemarker";
import { LAYOUT_KEY, PAGE_KEY, PART_KEY } from "/admin/tools/part-finder/part-finder";

const NOSCHEMA_PREFIX = "noschema::";
const NOSCHEMA_TYPES = {
  part: NOSCHEMA_PREFIX + "part",
  layout: NOSCHEMA_PREFIX + "layout",
  page: NOSCHEMA_PREFIX + "page",
};
type CompType = keyof typeof NOSCHEMA_TYPES;
type NoschemaType = (typeof NOSCHEMA_TYPES)[CompType];

const listCompsInCurrentApp = (currentAppKey, compType) => {
  return listComponents({ application: currentAppKey, type: compType }).map((comp) => comp.key);
};

/* Looks for component keys among schema definitions with identical name but different letter casing, and corrects
   the keys found in data (aggregatedResult) to case-sensitive names from the registered schema.
   If two or more matches are found, throws an error.
   If no match is found among the schema for a component key found in the data, it's likely a component is saved and used
   in content but deprecated: no longer available from apps. Should be deleted, so they are listed as "no-schema" items.
 */
const handleUppercasedAndNoSchemaKeys = (aggregatedResult, currentAppKey, appFilter) => {
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
          const deprCompType = NOSCHEMA_TYPES[compType];
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
  repoParam: string,
): {
  active: ComponentNavLinkList[];
  noSchema: ComponentNavLinkList[];
} {
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

  handleUppercasedAndNoSchemaKeys(res, currentAppKey, appFilter);

  const getDecoratedUrl = (params: {
    key: string;
    type: string;
    repo?: string;
    replace?: string;
    getvalue?: string;
  }): string => {
    if (displayReplacer) {
      params.replace = "true";
    }
    if (getvalueParam) {
      params.getvalue = getvalueParam;
    }
    if (repoParam) {
      params.repo = repoParam;
    }

    const url = getPartFinderUrl(params);

    return url;
  };

  const getItemList = (
    title: "Parts" | "Layouts" | "Pages",
    aggregationKey: CompType | NoschemaType,
    compTypeKey: "PART" | "LAYOUT" | "PAGE",
  ) => {
    return {
      title,
      items: ((res.aggregations[aggregationKey] || {}).buckets || [])
        .filter(appFilter)
        .map<ComponentNavLink>((bucket) => ({
          docCount: bucket.docCount,
          key: bucket.key,
          url: getDecoratedUrl({
            key: bucket.key,
            type: compTypeKey,
          }),
        })),
    };
  };

  return {
    active: [
      getItemList("Parts", "part", PART_KEY),
      getItemList("Layouts", "layout", LAYOUT_KEY),
      getItemList("Pages", "page", PAGE_KEY),
    ].filter((list) => list.items.length > 0),
    noSchema: [
      getItemList("Parts", NOSCHEMA_TYPES.part, PART_KEY),
      getItemList("Layouts", NOSCHEMA_TYPES.layout, LAYOUT_KEY),
      getItemList("Pages", NOSCHEMA_TYPES.page, PAGE_KEY),
    ].filter((list) => list.items.length > 0),
  };
}
