import { getToolUrl } from "/lib/xp/admin";
import { queryAllRepos } from "/lib/part-finder/nodes";
import type { ComponentView, Usage } from "./component-view.freemarker";

export function getComponentUsagesInRepo(
  component: { key: string; type: string },
  repositories: string[],
): ComponentView {
  const contents = queryAllRepos<{ displayName: string }>(repositories, {
    count: 1000,
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
  }));

  contents.sort(sortByPath);

  return {
    key: component.key,
    contents,
  };
}

function sortByPath(a: Usage, b: Usage): number {
  return a.path.localeCompare(b.path);
}
