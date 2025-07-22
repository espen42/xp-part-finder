import type { ContentUsage, MultiUsageInstance, Operation } from "/admin/tools/part-finder/part-finder.freemarker";
import { getToolUrl } from "/lib/xp/admin";
import {PathChangeTracker, PREFIX_NEWCOMPONENT} from "/lib/part-finder/utils/pathChangeTracker";
import { ContentItem } from "/lib/part-finder/editors";
import { SortedArrayAscending, sortResultsByPathAsc } from "/lib/part-finder/utils/sorting";
import { hashContentItem } from "/lib/part-finder/utils/contentHashing";

export class EditorResult {
  id: string;
  url: string;
  displayName: string;
  type: string;
  path: string;
  repo: string;
  operation: Operation;
  componentPath: string[] | string | null;
  // Absence of error value signifies a successful operation:
  error?: string;

  constructor(
    repoName: string,
    contentId: string,
    contentItem: ContentItem,
    operation: Operation,
    componentPath?: string[] | string | null,
    error?: string,
  ) {
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
    this.operation = operation;
  }

  toString(): string {
    return this.error
      ? `Error:\n\t\t${this.error}\n\t\t${JSON.stringify({ ...JSON.parse(JSON.stringify(this)), error: undefined })}`
      : `Success:\n\t\t${JSON.stringify(this)}`;
  }
}

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

/**
 * Accumulates different EditorResults (which corresponds to one component change each)
 * into the ContentUsage (which corresponds to one content item) they belong in.
 * Creates and registers a new ContentUsage in the 'contents' map if it doesn't exist yet.
 */
const summarizeResults = (
  results: SortedArrayAscending<EditorResult>,
  contents: Record<string, ContentUsage>,
  controlHashes: Record<string, string | null>,
  pathTrackers: Record<string, PathChangeTracker>,
): void => {
  results.forEach((result) => {
    const controlHash = controlHashes[result.id];
    const pathTracker = pathTrackers[result.path];
    let currentContent: ContentUsage = contents[result.id];

    if (!currentContent) {
      currentContent = {
        id: result.id,
        url: result.url,
        displayName: result.displayName,
        type: result.type,
        repo: result.repo,
        path: (result.path || "").replace(/^\/content/, ""),
        multiUsage: [],
        controlHash,
      };
      contents[result.id] = currentContent;
    }

    setMultiUsageAddition(currentContent, result, pathTracker);
  });
};

const getUsage = (componentPath: string, error?: string): MultiUsageInstance => {
  const usage: MultiUsageInstance = {
    path: componentPath,
  };
  if (error) {
    usage.error = error;
  }
  return usage;
};

const newPathPattern = new RegExp(`^${PREFIX_NEWCOMPONENT}`);
const trackAddedPath = (usage: MultiUsageInstance, pathTracker: PathChangeTracker): void => {
  if (!usage.error) {
    const pathsAtAdditionTime = Object.keys(pathTracker.paths)
      .filter((pathAtAdditionTime) => pathTracker.paths[pathAtAdditionTime]===usage.path)

    if (pathsAtAdditionTime.length > 1 || !(pathsAtAdditionTime[0] || "").match(newPathPattern)) {
      throw Error(`Unexpected state - trying to retrace an added component path ${JSON.stringify(usage.path)}, but it's not (unambiguously) in the tracker with a key that starts with ${PREFIX_NEWCOMPONENT}: ${JSON.stringify(pathTracker.paths, null, 2)}`);
    }
    const pathAtAdditionTime = pathsAtAdditionTime[0].replace(newPathPattern, "");
    usage.oldPath = pathTracker.paths[pathAtAdditionTime]; // Tracked path of the original component
    usage.newPath = usage.path // Changed component
    usage.path = pathAtAdditionTime // The path of the original at the time of the addition - now displayed in the GUI
  }
};

const setMultiUsageAddition = (currentContent: ContentUsage, result: EditorResult, pathTracker: PathChangeTracker) => {
  if ("string" === typeof result.componentPath) {
    const usage: MultiUsageInstance = getUsage(result.componentPath, result.error);
    trackAddedPath(usage, pathTracker);

    currentContent.multiUsage.push(usage);
    setHasMultiUsage(currentContent, true);
  } else if (Array.isArray(result.componentPath)) {
    const usages: MultiUsageInstance[] = result.componentPath.map((componentPath) => {
      const usage = getUsage(componentPath, result.error);
      trackAddedPath(usage, pathTracker);
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

  // Maps a contentItem-path to a hash of its post-change content, to verify that the content item was not changed in the meantime before the review. See contentHashing.ts.
  contentHashes: Record<string, string | null>;

  constructor(sourceKey: string, newKey: string, targetComponentType: string) {
    this.results = [];
    this.repoName = ".setRepoContext hasn't run yet";
    this.sourceKey = sourceKey;
    this.newKey = newKey;
    this.targetComponentType = targetComponentType;
    this.pathTrackers = {};
    this.contentHashes = {};
  }

  setRepoContext(repoName: string) {
    this.repoName = repoName;
  }

  initPathChangeTracker(contentItem: ContentItem) {
    this.pathTrackers[contentItem._path] = new PathChangeTracker(contentItem);
  }

  reportSuccess(contentItem, componentPath, operation: Operation) {
    this.results.push(new EditorResult(this.repoName, contentItem?._id, contentItem, operation, componentPath));
                                                                                                                        log.info(
      `OK: ${operation} operation succeeded ${this.targetComponentType} on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
        componentPath !== null ? ", path: " + JSON.stringify(componentPath) : ""
      }), from '${this.sourceKey}' to '${this.newKey}'`,
    );
  }

  // On errors, log them, and since nothing should be changed in the data for that contentItem (atomic change: the original contentitem should
  // be returned), overwrite previous success results for that contentItem.
  markError(contentItem, componentPath: string | null, operation: Operation, error: unknown, knownId?: string) {
    const newError =
      error instanceof Error ? error.message : "string" === typeof error ? error : "Unknown error, see log";
    this.results = this.results.filter((result) => result.id !== contentItem._id);
    this.results.push(
      new EditorResult(
        this.repoName,
        contentItem?._id || knownId || "",
        contentItem,
        operation,
        componentPath,
        newError,
      ),
    );

    log.warning(
      `Failed: ${operation} operation ${this.targetComponentType} on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
        componentPath !== null ? ", path: " + JSON.stringify(componentPath) : ""
      }), from '${this.sourceKey}}' to '${this.newKey}':`,
    );

    log.error(error);
  }

  finalizeContentItem = (contentItem: ContentItem): void => {
    this.contentHashes[contentItem._id] = hashContentItem(contentItem);
  };

  buildContentResult(): ContentUsage[] {
    const contents: Record<string, ContentUsage> = {};

    // Sort the results back into ascending componentpath order (less weird presentation)
    const sortedResults = sortResultsByPathAsc(this.results);

    // summarize the results for output
    summarizeResults(sortedResults, contents, this.contentHashes, this.pathTrackers);

    const contentResult: ContentUsage[] = Object.keys(contents).map((contentId) => {
      const currentContent = contents[contentId];
      if (currentContent.multiUsage.length === 0) {
        currentContent.hasMultiUsage = false;
        if (!currentContent.error && currentContent.multiUsage[0].error) {
          currentContent.error = currentContent.multiUsage[0].error;
        }
        currentContent.multiUsage = [];
      }
      return currentContent;
    });

    return contentResult;
  }

  toString(): string {
    return `
    TargetComponentType: ${this.targetComponentType}
    SourceKey: ${this.sourceKey}
    NewKey: ${this.newKey}
    Results:\n\t${this.results.map((res) => `${res}`).join("\n\t")}
    pathTrackers:\n\t${Object.keys(this.pathTrackers)
      .map((contentItemPath) => `${contentItemPath}:\n\t\t${this.pathTrackers[contentItemPath]}`)
      .join("\n\t")}`;
  }
}
