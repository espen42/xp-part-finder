import { render } from "/lib/tineikt/freemarker";
import { list as listApps, type Application } from "/lib/xp/app";
import { list as listRepos } from "/lib/xp/repo";
import { listComponents, type ComponentDescriptorType, type ComponentDescriptor } from "/lib/xp/schema";
import { assertIsDefined, getPartFinderUrl, notNullOrUndefined, runAsAdmin, startsWith } from "/lib/part-finder/utils";
import { getComponentNavLinkList } from "../../views/navigation/navigation";
import { getComponentUsagesInRepo } from "../../views/component-view/component-view";
import type { ComponentList } from "./part-finder.freemarker";
import type { ComponentViewParams } from "../../views/component-view/component-view.freemarker";
import type { Header, Link } from "../../views/header/header.freemarker";

type PartFinderQueryParams = {
  key: string;
  type: ComponentDescriptorType;
};

const PAGE_TITLE = "Part finder";
const view = resolve("part-finder.ftl");
const componentView = resolve("../../views/component-view/component-view.ftl");

export function get(req: XP.Request<PartFinderQueryParams>): XP.Response {
  const currentItemType = parseComponentType(req.params.type);
  const currentItemKey = req.params.key;
  const installedApps = listAppsWithComponents();

  if (installedApps.length === 0) {
    return {
      status: 404,
      body: "<h1>No installed applications found</h1>",
    };
  }

  if (!currentItemKey) {
    const firstComponent = getFirstComponent(installedApps[0]);

    assertIsDefined(firstComponent);

    return {
      redirect: getPartFinderUrl({
        key: firstComponent.key,
        type: firstComponent.type,
      }),
    };
  }

  const currentAppKey = getAppKey(currentItemKey);
  const cmsRepoIds = getCMSRepoIds();
  const currentItem = currentItemType
    ? getComponentUsagesInRepo(
        {
          key: currentItemKey,
          type: currentItemType,
        },
        cmsRepoIds,
      )
    : undefined;

  if (!currentItem) {
    return {
      status: 404,
      body: "<h1>Component not found</h1>",
    };
  }

  // If in Turbo Frame, only render the component view
  if (req.headers["turbo-frame"] === "content-view") {
    return {
      body: wrapInHtml({
        markup: render<ComponentViewParams>(componentView, {
          currentItem,
        }),
        title: `${PAGE_TITLE} - ${currentItem.key}`,
      }),
    };
  }

  const itemLists = getComponentNavLinkList(cmsRepoIds, currentAppKey);

  const filters = installedApps.map<Link>((app) => {
    const firstComponent = getFirstComponent(app);

    return {
      text: app.key,
      url: firstComponent
        ? getPartFinderUrl({
            key: firstComponent.key,
            type: firstComponent.type,
          })
        : "",
    };
  });

  return {
    body: render<ComponentList & ComponentViewParams & Header>(view, {
      title: `${PAGE_TITLE} - ${currentItem?.key}`,
      displayName: PAGE_TITLE,
      filters,
      currentItemKey,
      currentAppKey,
      currentItem,
      itemLists,
    }),
  };
}

function listAppsWithComponents(): Application[] {
  return runAsAdmin(() => listApps()).filter((app) => notNullOrUndefined(getFirstComponent(app)));
}

function getFirstComponent(app: Application): ComponentDescriptor | undefined {
  return (
    listComponents({
      type: "PART",
      application: app.key,
    })[0] ??
    listComponents({
      type: "LAYOUT",
      application: app.key,
    })[0] ??
    listComponents({
      type: "PAGE",
      application: app.key,
    })[0]
  );
}

function getAppKey(key: string): string {
  return key.split(":")[0];
}

function wrapInHtml({ markup, title }: { markup: string; title: string }): string {
  return `<!DOCTYPE html><html lang="en"><head><title>${title}</title></head><body>${markup}</body></html>`;
}

function getCMSRepoIds(): string[] {
  return runAsAdmin(() =>
    listRepos()
      .map((repo) => repo.id)
      .filter((repoId) => startsWith(repoId, "com.enonic.cms")),
  );
}

function parseComponentType(str: string = ""): ComponentDescriptorType | undefined {
  const uppercasedStr = str.toUpperCase();

  if (uppercasedStr === "PAGE" || uppercasedStr === "LAYOUT" || uppercasedStr === "PART") {
    return uppercasedStr;
  }

  return undefined;
}
