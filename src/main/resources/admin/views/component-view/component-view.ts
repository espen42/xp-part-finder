import { getToolUrl } from "/lib/xp/admin";
import { queryAllRepos } from "/lib/part-finder/nodes";
import { getPartFinderUrl } from "/lib/part-finder/utils/utils";
import type { AriaSortDirection, ComponentView, Heading, Usage } from "./component-view.freemarker";
import type { Content, SortDirection, SortDsl } from "@enonic-types/core";
import { getUsagePaths } from "/admin/tools/part-finder/usagePaths";
import { PARAM } from "/lib/part-finder/utils/params";
import type { ComponentDescriptorType } from "/lib/xp/schema";

const TABLE_HEADINGS: Omit<Heading, "url">[] = [
  {
    text: "Display name",
    name: "displayName",
  },
  {
    text: "Content type",
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
  component: { key: string; type: ComponentDescriptorType },
  repositories: string[],
  sort: Partial<SortDsl>,
  getconfigParam: string | undefined,
  replaceParam: string,
  repoParam: string | undefined,
  archiveParam: string,
): ComponentView {
  const displayArchive = !!archiveParam;
  const contents: Usage[] = queryAllRepos<Content>(repositories, {
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
  })
    .filter((content) => displayArchive || !content._path.startsWith("/archive/"))
    .map((content) => {
      const repo = content.repoId.replace(/^com\.enonic\.cms\./, "");
      return {
        url: `${getToolUrl("com.enonic.app.contentstudio", "main")}/${repo}/edit/${content._id}`,
        displayName: content.displayName ?? content._name,
        path: content._path.replace(/^\/content/, ""),
        type: content.type,
        repo,
        id: content._id,
        usagePaths: {
          [component.key]: getUsagePaths(content, component.type, component.key, getconfigParam),
        },
        multiUsage: [],
        hasMultiUsage: false,
      };
    });

  return {
    key: component.key,
    type: component.type,
    contents,
    headings: TABLE_HEADINGS.map((heading) => ({
      ...heading,
      url: getPartFinderUrl({
        [PARAM.key]: component.key,
        [PARAM.type]: component.type,
        [PARAM.replace]: replaceParam + "",
        [PARAM.archive]: archiveParam + "",
        [PARAM.getConfig]: getconfigParam || "",
        [PARAM.repo]: repoParam || "",
        [PARAM.sort]: heading.name,
        [PARAM.dir]:
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
