import type { ContentUsage, MultiUsageInstance } from "/admin/tools/part-finder/part-finder.freemarker";
import { getToolUrl } from "/lib/xp/admin";
import { PathChangeTracker } from "/admin/tools/part-finder/editor/utils/pathChangeTracker";
import { ContentItem } from "/admin/tools/part-finder/editor/editor";

class EditorResult {
  id: string;
  url: string;
  displayName: string;
  type: string;
  path: string;
  repo: string;
  // Absence of error value signifies a successful operation:
  error?: string;
  componentPath: string[] | string | null;

  constructor(repoName: string, contentId: string, contentItem: ContentItem, componentPath?: string[] | string | null, error?: string) {
      this.id = contentId;
      this.url = contentItem
        ? `${getToolUrl("com.enonic.app.contentstudio", "main")}/${repoName}/edit/${contentItem?._id}`
        : "";
      this.displayName = contentItem?.displayName || "";
      this.type = contentItem.type;
      this.repo = repoName;
      this.path = contentItem?._path || "";
      this.componentPath = componentPath || null;
      this.error = error;
  }

  toString(): string {
    return this.error
      ? `Error (${this.error}): ${JSON.stringify({path: this.path, componentPath: this.componentPath})}`
      : `Success: ${JSON.stringify({path: this.path, componentPath: this.componentPath})}`
  }
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
      type: result.type,
      repo: result.repo,
      path: (result.path || "").replace(/^\/content/, ""),
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

    setHasMultiUsage(currentContent, true);
  }
};

export class Results {
  results: EditorResult[];
  sourceKey: string;
  newKey: string;
  repoName: string;
  targetComponentType: string;

  // If a component is added or deleted, other components in the same region will be pushed up or down, so their paths will change.
  // his keeps track of that throughout the batch: for each contentItem (the toplevel key) by mapping originalPath -> newPath of changed components:
  pathTrackers: Record<string, PathChangeTracker>;

  constructor(sourceKey: string, newKey: string, targetComponentType: string) {
    this.results = [];
    this.repoName = ".setRepoContext hasn't run yet";
    this.sourceKey = sourceKey;
    this.newKey = newKey;
    this.targetComponentType = targetComponentType;
    this.pathTrackers = {};
  }

  setRepoContext(repoName: string) {
    this.repoName = repoName;
  }

  initPathChangeTracker(contentItem: ContentItem) {
    this.pathTrackers[contentItem._path] = new PathChangeTracker(contentItem);
  }

  reportSuccess(contentItem, componentPath) {
    this.results.push(
      new EditorResult(this.repoName, contentItem?._id, contentItem, componentPath)
    )

    log.info(
      `OK: Adding ${this.targetComponentType} on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
        componentPath !== null ? ", path: " + JSON.stringify(componentPath) : ""
      }), from '${this.sourceKey}' to '${this.newKey}'`,
    );
  }

  // On errors, log them, and since nothing should be changed in the data for that contentItem (atomic change: the original contentitem should
  // be returned), overwrite previous success results for that contentItem.
  markError(contentItem, componentPath: string | null, error: unknown, knownId?: string) {
    const newError = error instanceof Error ? error.message : "string" === typeof error ? error : "Unknown error, see log"
    this.results = this.results.filter( result => result.id !== contentItem._id )
    this.results.push(new EditorResult(this.repoName, contentItem?._id || knownId || "", contentItem, componentPath, newError))

    log.warning(
      `Error trying to add ${this.targetComponentType} on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
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
      if (currentContent.multiUsage.length === 0) {
        currentContent.hasMultiUsage = false;
        if (!currentContent.error && currentContent.multiUsage[0].error) {
          currentContent.error = currentContent.multiUsage[0].error;
        }
        currentContent.multiUsage = [];
      }
    });

    return contents;
  }

  toString(): string {
    return `
    TargetComponentType: ${this.targetComponentType}
    SourceKey: ${this.sourceKey}
    NewKey: ${this.newKey}
    Results:\n\t${this.results.map(res => `${res}`).join("\n\t")}
    pathTrackers:\n\t${Object.keys(this.pathTrackers).map(contentItemPath => `${contentItemPath}:\n\t\t${this.pathTrackers[contentItemPath]}`).join("\n\t")}`
  }
}
