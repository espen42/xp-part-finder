import {
  multiRepoConnect,
  type Aggregations,
  type DateBucket,
  type NumericBucket,
  Bucket,
  NodeMultiRepoQueryResult,
} from "/lib/xp/node";
import { getPartFinderUrl, startsWith } from "/lib/part-finder/utils/utils";
import { listComponents } from "/lib/xp/schema";

import type { ComponentNavLink, ComponentNavLinkList } from "./navigation.freemarker";
import { LAYOUT_KEY, PAGE_KEY, PART_KEY } from "/admin/tools/part-finder/part-finder";
import { AggregationsToAggregationResults, LayoutDescriptor, PageDescriptor, PartDescriptor } from "@enonic-types/core";
import {SORT_FUNCS} from "/lib/part-finder/utils/sorting";
import {UriParams} from "/lib/part-finder/utils/params";


type CompTypeAggregation = {
  terms: {
    field: string;
    size: number;
  };
};
type CompTypeAggregations = {
  layout: CompTypeAggregation;
  part: CompTypeAggregation;
  page: CompTypeAggregation;
};
type QueryResult = NodeMultiRepoQueryResult<AggregationsToAggregationResults<CompTypeAggregations>>;
type AppComponentCollection = {
  part: ComponentList;
  layout: ComponentList;
  page: ComponentList;
};

const NOSCHEMA_PREFIX = "noschema::";
const NOSCHEMA_TYPES = {
  part: NOSCHEMA_PREFIX + "part",
  layout: NOSCHEMA_PREFIX + "layout",
  page: NOSCHEMA_PREFIX + "page",
};
const UNUSED_PREFIX = "unused::";
const UNUSED_TYPES = {
  part: UNUSED_PREFIX + "part",
  layout: UNUSED_PREFIX + "layout",
  page: UNUSED_PREFIX + "page",
};
type CompType = keyof typeof NOSCHEMA_TYPES;
type NoschemaType = (typeof NOSCHEMA_TYPES)[CompType];
type UnusedType = (typeof UNUSED_TYPES)[CompType];

const AGGREGATIONS = {
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

const listCompsInCurrentApp = (currentAppKey, compType): ComponentList => {
  return listComponents({ application: currentAppKey, type: compType }).map((comp) => comp.key);
};

type ComponentList = PartDescriptor[] | LayoutDescriptor[] | PageDescriptor[];

// Both aggregationsFromData and caseSensitiveKeysInApp are objects with keys as component types (part, layout, page).
// Below each of the component type keys, in both, are arrays containing component names, in different formats.
// - caseSensitiveKeysInApp[componentType]: an array of strings representing the case-sensitive keys for each component type found coded in the app.
// - In aggregationsFromData[componentType].buckets: an array of "bucket" objects where each has a "key" and a "docCount" property.
// A component can be detected as unsed in two ways:
// - If it is found in caseSensitiveKeysInApp[componentType] but not in aggregationsFromData[componentType].buckets, or
// - If it has a docCount of 0 in aggregationsFromData[componentType].buckets.
// For each unused component found, a log message is printed.
const collectUnusedComponents = (aggregationsFromData, caseSensitiveKeysInApp: AppComponentCollection) => {
  // Go through part, layout, and page component types in the app...
  Object.keys(caseSensitiveKeysInApp).forEach((componentType: string) => {
    // ...and every component name in that component type...
    caseSensitiveKeysInApp[componentType].forEach((caseSensitiveKey: string) => {
      // Look for that component name in the data
      const found = (aggregationsFromData[componentType].buckets || []).filter(
        (bucket: Bucket) =>
          bucket.key === caseSensitiveKey || bucket.key.toLowerCase() === caseSensitiveKey.toLowerCase(),
      );
      // If not found, log it as unused and add data aggregation, under ['unused::']
      if (!found.length) {
        // Make sure the proper unused array exists in the aggregation
        aggregationsFromData[UNUSED_TYPES[componentType]] = aggregationsFromData[UNUSED_TYPES[componentType]] || {
          buckets: [],
        };
        aggregationsFromData[UNUSED_TYPES[componentType]].buckets.push({
          key: caseSensitiveKey,
          docCount: 0,
        });
      }
    });

    // Then, look for components in the data that have a docCount of 0 (the query probably won't find this, but to be certain)...
    const unused = (aggregationsFromData[componentType].buckets || []).filter(
      (bucket: Bucket) => bucket.docCount === 0,
    );
    // ...and for each of those, log it as unused and move it to ['unused::'] in the data aggregation
    unused.forEach((unusedBucket: Bucket) => {
      // Make sure the proper unused array exists in the aggregation
      aggregationsFromData[UNUSED_TYPES[componentType]] = aggregationsFromData[UNUSED_TYPES[componentType]] || {
        buckets: [],
      };
      aggregationsFromData[UNUSED_TYPES[componentType]].buckets.push(unusedBucket);
      aggregationsFromData[componentType].buckets = aggregationsFromData[componentType].buckets.filter(
        (b: Bucket) => b.key !== unusedBucket.key,
      );
    });
  });
};

/* Looks for component keys among schema definitions with identical name but different letter casing, and corrects
   the keys found in data (aggregatedResult) to case-sensitive names from the registered schema.
   If two or more matches are found, throws an error.
   If no match is found among the schema for a component key found in the data, it's likely a component is saved and used
   in content but deprecated: no longer available from apps. Should be deleted, so they are listed as "no-schema" items.
 */
const handleUppercasedAndNoSchemaKeys = (
  aggregatedResultFromData: QueryResult,
  currentAppKey,
  appFilter,
  displayUnused,
) => {
  const caseSensitiveKeysInApp = {
    part: listCompsInCurrentApp(currentAppKey, PART_KEY),
    layout: listCompsInCurrentApp(currentAppKey, LAYOUT_KEY),
    page: listCompsInCurrentApp(currentAppKey, PAGE_KEY),
  };

  const processedResultKeys = {};
  let resultKey;

  Object.keys(aggregatedResultFromData.aggregations).forEach((componentType: string) => {
    processedResultKeys[componentType] = {};

    aggregatedResultFromData.aggregations[componentType].buckets = aggregatedResultFromData.aggregations[
      componentType
    ].buckets
      .filter(appFilter)
      .map((bucket: Bucket & { deprecated?: boolean }) => {
        resultKey = bucket.key.toLowerCase();
        for (const caseSensitiveKey of caseSensitiveKeysInApp[componentType]) {
          if (caseSensitiveKey.toLowerCase() === resultKey) {
            if (processedResultKeys[componentType][resultKey]) {
              throw Error(
                `Ambivalent data: tried correcting ${componentType} key '${resultKey}' for case-sensitivity. But it matches more than one case-sensitive key: '${processedResultKeys[componentType][resultKey]}' and '${caseSensitiveKey}'.`,
              );
            }
            processedResultKeys[componentType][resultKey] = caseSensitiveKey;

            if (caseSensitiveKey !== resultKey) {
              bucket.key = caseSensitiveKey;
              log.debug(
                `Verified and corrected ${componentType} key for case-sensitivity: '${resultKey}' --> '${caseSensitiveKey}'`,
              );
            }
          }
        }
        if (!processedResultKeys[componentType][resultKey]) {
          log.debug(
            `A ${componentType} key '${resultKey}' was found among stored data (aggregatedResult) but not among the schema for app '${currentAppKey}'. Most likely it's deprecated. Moving to separate list.`,
          );
          const deprCompType = NOSCHEMA_TYPES[componentType];
          aggregatedResultFromData.aggregations[deprCompType] = aggregatedResultFromData.aggregations[deprCompType] || {
            buckets: [],
          };
          aggregatedResultFromData.aggregations[deprCompType].buckets.push({
            ...bucket,
          });
          return null;
        }

        return bucket;
      })
      .filter((bucket) => !!bucket);
  });
  if (displayUnused) {
    collectUnusedComponents(aggregatedResultFromData.aggregations, caseSensitiveKeysInApp);
  }
};

type ComponentNavLinkLists = {
  active: ComponentNavLinkList[];
  noSchema: ComponentNavLinkList[];
  unused: ComponentNavLinkList[];
};

export function getComponentNavLinkList(
  repoIds: string[],
  currentAppKey: string,
  displayReplacer: string,
  getconfigParam: string | undefined,
  repoParam: string,
  displayArchives: string,
  sortParam: keyof typeof SORT_FUNCS | "",
  displayUnused: string,
): ComponentNavLinkLists {
  const connection = multiRepoConnect({
    sources: repoIds.map((repoId) => ({
      repoId,
      branch: "draft",
      principals: ["role:system.admin"],
    })),
  });

  const res: QueryResult = connection.query<typeof AGGREGATIONS>({
    count: 0,
    aggregations: AGGREGATIONS,
  });

  const appKeyColon = currentAppKey + ":";
  const appFilter = (bucket: DateBucket | NumericBucket) => startsWith(bucket.key, appKeyColon);

  handleUppercasedAndNoSchemaKeys(res, currentAppKey, appFilter, displayUnused);

  const getDecoratedUrl = (params: UriParams): string => {
    if (displayReplacer) {
      params.replace = displayReplacer;
    }
    if (displayArchives) {
      params.archive = displayArchives;
    }
    if (getconfigParam) {
      params.getconfig = getconfigParam;
    }
    if (repoParam) {
      params.repo = repoParam;
    }
    if (sortParam && SORT_FUNCS[sortParam]) {
      params.sort = sortParam;
    }
    if (displayUnused) {
      params.unused = displayUnused;
    }

    const url = getPartFinderUrl(params);

    return url;
  };

  const getItemList = (
    title: "Parts" | "Layouts" | "Pages",
    aggregationKey: CompType | NoschemaType | UnusedType,
    compTypeKey: "PART" | "LAYOUT" | "PAGE",
  ): ComponentNavLinkList => {
    const itemList = {
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

    itemList.items.sort(SORT_FUNCS[sortParam] || SORT_FUNCS.alphaasc);

    return itemList;
  };

  const resultingItemLists: ComponentNavLinkLists = {
    active: [
      getItemList("Parts", "part", PART_KEY),
      getItemList("Layouts", "layout", LAYOUT_KEY),
      getItemList("Pages", "page", PAGE_KEY),
    ],
    noSchema: [
      getItemList("Parts", NOSCHEMA_TYPES.part, PART_KEY),
      getItemList("Layouts", NOSCHEMA_TYPES.layout, LAYOUT_KEY),
      getItemList("Pages", NOSCHEMA_TYPES.page, PAGE_KEY),
    ],
    unused: displayUnused
      ? [
          getItemList("Parts", UNUSED_TYPES.part, PART_KEY),
          getItemList("Layouts", UNUSED_TYPES.layout, LAYOUT_KEY),
          getItemList("Pages", UNUSED_TYPES.page, PAGE_KEY),
        ]
      : [],
  };

  resultingItemLists.active = resultingItemLists.active.filter((list) => list.items.length > 0);
  resultingItemLists.noSchema = resultingItemLists.noSchema.filter((list) => list.items.length > 0);
  resultingItemLists.unused = resultingItemLists.unused.filter((list) => list.items.length > 0);

  if (
    resultingItemLists.noSchema &&
    resultingItemLists.noSchema.length &&
    resultingItemLists.noSchema[0].items.length
  ) {
    log.warning(
      `No-schema: component(s) found among stored data (aggregatedResult) but missing from the app '${currentAppKey}'. Deprecated? Investigate: ${JSON.stringify(resultingItemLists.noSchema)}`,
    );
  }

  if (resultingItemLists.unused && resultingItemLists.unused.length && resultingItemLists.unused[0].items.length) {
    log.warning(
      `Unused component(s) detected: defined in the app '${currentAppKey}' but not found among stored data (aggregatedResult). Investigate: ${JSON.stringify(resultingItemLists.unused)}`,
    );
  }

  return resultingItemLists;
}
