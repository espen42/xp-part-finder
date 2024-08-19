import { render } from "/lib/tineikt/freemarker";
import { getToolUrl } from "/lib/xp/admin";
import { query, type Content } from "/lib/xp/content";
import { list as listApps } from "/lib/xp/app";
import { run } from "/lib/xp/context";
import { list as listRepos } from "/lib/xp/repo";
import { listComponents, type LayoutDescriptor, type PageDescriptor, type PartDescriptor } from "/lib/xp/schema";

const view = resolve("rodeo.ftl");

export function all(): XP.Response {
  const cmsRepos = listRepos()
    .map((repo) => repo.id)
    .filter((repoId) => startsWith(repoId, "com.enonic.cms"));

  const allParts = flatMap(listApps(), (app) =>
    listComponents({
      application: app.key,
      type: "PART",
    })
  );

  const allLayouts = flatMap(listApps(), (app) =>
    listComponents({
      application: app.key,
      type: "LAYOUT",
    })
  );

  const allPages = flatMap(listApps(), (app) =>
    listComponents({
      application: app.key,
      type: "PAGE",
    })
  );

  const parts = allParts.map((component) => getComponentUsagesInRepo(component, cmsRepos));
  const layouts = allLayouts.map((component) => getComponentUsagesInRepo(component, cmsRepos));
  const pages = allPages.map((component) => getComponentUsagesInRepo(component, cmsRepos));

  return {
    body: render<FreemarkerParams>(view, {
      contentStudioUrl: getToolUrl("com.enonic.app.contentstudio", "main"),
      parts,
      layouts,
      pages,
    }),
  };
}

function getComponentUsagesInRepo(component: Component, repositories: string[]): Usages {
  return repositories
    .map((repository) => getComponentUsages(component, repository))
    .reduce<Usages>(
      (usages, componentUsage) => {
        return {
          total: usages.total + componentUsage.total,
          count: usages.count + componentUsage.total,
          key: usages.key,
          contents: usages.contents.concat(componentUsage.contents),
        };
      },
      {
        total: 0,
        count: 0,
        key: component.key,
        contents: [],
      }
    );
}

function getComponentUsages(component: Component, repository: string): Usages {
  const res = run(
    {
      branch: "draft",
      repository,
      principals: ["role:system.admin"],
    },
    () =>
      query({
        query: `components.${component.type}.descriptor = '${component.key}'`,
        count: 100,
      })
  );

  return {
    total: res.total,
    count: res.count,
    key: component.key,
    contents: res.hits.map((hit) => ({
      ...hit,
      repo: stringAfterLast(repository, "."),
    })),
  };
}

type Component = PartDescriptor | LayoutDescriptor | PageDescriptor;

type FreemarkerParams = {
  contentStudioUrl: string;
  parts: Usages[];
  layouts: Usages[];
  pages: Usages[];
};

type Usages = {
  key: string;
  total: number;
  count: number;
  contents: (Content<unknown> & { repo: string })[];
};

function startsWith(str: string, searchString: string): boolean {
  return str.substring(0, searchString.length) === searchString;
}

function flatMap<A, B>(arr: A[], f: (val: A) => B[]): B[] {
  return arr.reduce<B[]>((res, val) => res.concat(f(val)), []);
}

function stringAfterLast(str: string, delimiter: string): string {
  return str.substring(str.lastIndexOf(delimiter) + 1);
}
