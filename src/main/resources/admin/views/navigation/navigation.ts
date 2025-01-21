import { multiRepoConnect, type Aggregations, type DateBucket, type NumericBucket } from "/lib/xp/node";
import { getPartFinderUrl, startsWith } from "/lib/part-finder/utils";
import type { ComponentNavLink, ComponentNavLinkList } from "./navigation.freemarker";

export function getComponentNavLinkList(repoIds: string[], currentAppKey: string): ComponentNavLinkList[] {
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

  const appFilter = (bucket: DateBucket | NumericBucket) => startsWith(bucket.key, currentAppKey);

  return [
    {
      title: "Parts",
      items: res.aggregations.part.buckets.filter(appFilter).map<ComponentNavLink>((bucket) => ({
        docCount: bucket.docCount,
        key: bucket.key,
        url: getPartFinderUrl({
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
        url: getPartFinderUrl({
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
        url: getPartFinderUrl({
          key: bucket.key,
          type: "PAGE",
        }),
      })),
    },
  ].filter((list) => list.items.length > 0);
}
