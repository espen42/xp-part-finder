import type { ContentUsage, MultiUsageInstance } from "/admin/tools/part-finder/part-finder.freemarker";
import { getToolUrl } from "/lib/xp/admin";

type EditorResult = {
  id: string;
  url: string;
  displayName: string;
  path: string;
  // Absence of error value signifies a successful operation:
  error?: string;
  componentPath: string[] | string | null;
};

const setHasMultiUsage = (currentContent, wantedValue: boolean) => {
  if (currentContent.hasMultiUsage === !wantedValue) {
    log.warning(
      "Mix-up on a content result, tried setting .hasMultiUsage to " +
        JSON.stringify(wantedValue) +
        " but it has already been set to " +
        JSON.stringify(currentContent.hasMultiUsage) +
        ". currentContent=" +
        JSON.stringify(currentContent),
    );
    throw Error("Parameter error");
  }
  currentContent.hasMultiUsage = wantedValue;
};

const insertAndGetSummaryContent = (contents: ContentUsage[], result: EditorResult): ContentUsage => {
  let currentContent: ContentUsage = contents.filter((content) => content.id === result.id)[0];

  if (!currentContent) {
    currentContent = {
      id: result.id,
      url: result.url,
      displayName: result.displayName,
      path: result.path,
      multiUsage: [],
    };
    contents.push(currentContent);
  }

  return currentContent;
};

const setMultiUsage = (currentContent: ContentUsage, result: EditorResult) => {
  if ("string" === typeof result.componentPath) {
    const usage: MultiUsageInstance = {
      path: result.componentPath,
    };
    if (result.error) {
      usage.error = result.error;
    }

    currentContent.multiUsage.push(usage);

    setHasMultiUsage(currentContent, true);
  } else if (Array.isArray(result.componentPath)) {
    const usages: MultiUsageInstance[] = result.componentPath.map((usagePath) => {
      const usage: { path: string; error?: string } = {
        path: usagePath,
      };
      if (result.error) {
        usage.error = result.error;
      }
      return usage;
    });

    currentContent.multiUsage.push(...usages);
    setHasMultiUsage(currentContent, true);
  } else if (result.componentPath === null) {
    if (result.error) {
      currentContent.error = result.error;
    }

    setHasMultiUsage(currentContent, false);
  }
};

export class Results {
  results: EditorResult[];
  sourceKey: string;
  newKey: string;
  repoName: string;
  targetComponentType: string;

  constructor(sourceKey: string, newKey: string, targetComponentType: string) {
    this.results = [];
    this.repoName = ".setRepoContext hasn't run yet";
    this.sourceKey = sourceKey;
    this.newKey = newKey;
    this.targetComponentType = targetComponentType;
  }

  setRepoContext(repoName: string) {
    this.repoName = repoName;
  }

  reportSuccess(contentItem, componentPath) {
    this.results.push({
      id: contentItem?._id,
      url: contentItem
        ? `${getToolUrl("com.enonic.app.contentstudio", "main")}/${this.repoName}/edit/${contentItem?._id}`
        : "",
      displayName: contentItem?.displayName || "",
      path: contentItem?._path || "",
      componentPath: componentPath || null,
    });

    log.info(
      `OK: Replacing ${this.targetComponentType} key on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
        componentPath !== null ? ", path: " + JSON.stringify(componentPath) : ""
      }), from '${this.sourceKey}' to '${this.newKey}'`,
    );
  }

  // On errors, log them, and since nothing should be changed in the data (atomic change: the original contentitem should
  // be returned), overwrite previous success results.
  markError(contentItem, componentPath: string | null, error: unknown, knownId?: string) {
    this.results = [
      {
        id: contentItem?._id || knownId || "",
        url: contentItem
          ? `${getToolUrl("com.enonic.app.contentstudio", "main")}/${this.repoName}/edit/${contentItem?._id}`
          : "",
        displayName: contentItem?.displayName || "",
        path: contentItem?._path || "",
        componentPath: componentPath,
        error: error instanceof Error ? error.message : "string" === typeof error ? error : "Unknown error, see log",
      },
    ];

    log.warning(
      `Error trying to replace ${this.targetComponentType} key on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
        componentPath !== null ? ", path: " + JSON.stringify(componentPath) : ""
      }), from '${this.sourceKey}}' to '${this.newKey}':`,
    );

    log.error(error);
  }

  buildContentResult(): ContentUsage[] {
    const contents: ContentUsage[] = [];

    this.results.forEach((result) => {
      const currentContent = insertAndGetSummaryContent(contents, result);
      setMultiUsage(currentContent, result);
    });

    contents.forEach((currentContent) => {
      if (currentContent.multiUsage.length === 1) {
        currentContent.hasMultiUsage = false;
        if (!currentContent.error && currentContent.multiUsage[0].error) {
          currentContent.error = currentContent.multiUsage[0].error;
        }
        currentContent.multiUsage = [];
      }
    });

    return contents;
  }
}
