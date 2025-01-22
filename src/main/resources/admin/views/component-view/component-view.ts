import { getToolUrl } from "/lib/xp/admin";
import { queryAllRepos } from "/lib/part-finder/nodes";
import { getPartFinderUrl } from "/lib/part-finder/utils";
import type { AriaSortDirection, ComponentView, Heading } from "./component-view.freemarker";
import type { Content, SortDirection, SortDsl } from "@enonic-types/core";

const TABLE_HEADINGS: Omit<Heading, "url">[] = [
  {
    text: "Display name",
    name: "displayName",
  },
  {
    text: "Type",
    name: "type",
  },
  {
    text: "Path",
    name: "_path",
  },
] as const;

const ARIA_SORT_DIRECTION: Record<SortDirection, AriaSortDirection> = {
  ASC: "ascending",
  DESC: "descending",
} as const;

export function getComponentUsagesInRepo(
  component: { key: string; type: string },
  repositories: string[],
  sort: Partial<SortDsl>,
): ComponentView {
  const contents = queryAllRepos<Content>(repositories, {
    count: 1000,
    sort: {
      field: sort.field ?? "_path",
      direction: sort.direction ?? "ASC",
    },
    filters: {
      hasValue: {
        field: `components.${component.type}.descriptor`,
        values: [component.key],
      },
    },
  }).map((content) => ({
    url: `${getToolUrl("com.enonic.app.contentstudio", "main")}/${content.repoId}/edit/${content._id}`,
    displayName: content.displayName ?? content._name,
    path: content._path,
    type: content.type,
  }));

  return {
    key: component.key,
    contents,
    headings: TABLE_HEADINGS.map((heading) => ({
      ...heading,
      url: getPartFinderUrl({
        key: component.key,
        type: component.type,
        sort: heading.name,
        dir:
          heading.name === sort.field
            ? // if current, use opposite direction
              sort.direction == "ASC"
              ? "DESC"
              : "ASC"
            : (sort.direction ?? "ASC"),
      }),
      sortDirection: sort.field === heading.name ? ARIA_SORT_DIRECTION[sort.direction ?? "ASC"] : undefined,
    })),
  };
}
