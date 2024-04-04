import { render } from "/lib/tineikt/freemarker";
import { Content, query } from "/lib/xp/content";
import { run } from "/lib/xp/context";
import { listComponents, type LayoutDescriptor, type PageDescriptor, type PartDescriptor } from "/lib/xp/schema";

const view = resolve("rodeo.ftl");

export function all() {
  const allParts = listComponents({
    application: "no.seeds.fiskeridir",
    type: "PART",
  });

  const allLayouts = listComponents({
    application: "no.seeds.fiskeridir",
    type: "LAYOUT",
  });

  const allPages = listComponents({
    application: "no.seeds.fiskeridir",
    type: "PAGE",
  });

  log.info(JSON.stringify(allPages, null, 2));

  return {
    body: render<FreemarkerParams>(view, {
      parts: allParts.map((component) => getComponentUsages(component)),
      layouts: allLayouts.map((component) => getComponentUsages(component)),
      pages: allPages.map((component) => getComponentUsages(component)),
    }),
  };
}

function getComponentUsages(component: Component): Usages {
  const res = run(
    {
      branch: "draft",
      repository: "com.enonic.cms.default",
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
    contents: res.hits,
  };
}

type Component = PartDescriptor | LayoutDescriptor | PageDescriptor;

type FreemarkerParams = {
  parts: Usages[];
  layouts: Usages[];
  pages: Usages[];
};

type Usages = {
  key: string;
  total: number;
  count: number;
  contents: Content<unknown>[];
};
