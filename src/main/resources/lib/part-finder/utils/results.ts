import type { ContentUsage, MultiUsageInstance } from "/admin/tools/part-finder/part-finder.freemarker";
import { getToolUrl } from "/lib/xp/admin";
import { PathChangeTracker, PREFIX_TRACKED_NEWCOMPONENT } from "/lib/part-finder/utils/pathChangeTracker";
import { ContentItem } from "/lib/part-finder/stages";
import { SortedArrayAscending, sortResultsByPathAsc } from "/lib/part-finder/utils/sorting";
import { hashContentItem } from "/lib/part-finder/utils/contentHashing";
import { Operation, parsePlannedOperationsPerId } from "/lib/part-finder/utils/plannedOperations";
import { PARAM_VAL } from "/lib/part-finder/utils/params";

export const buildContentResult = (resultsFromRepos: Record<string, Results>): ContentUsage[] => {
  const contentResult: ContentUsage[] = [];

  Object.keys(resultsFromRepos).forEach((repoName) => {
    const resultsFromRepo = resultsFromRepos[repoName];

    // Sort the results back into ascending componentpath order (less weird presentation)
    const sortedResults = sortResultsByPathAsc(resultsFromRepo.results);

    // summarize the results for output
    const contents = summarizeResultsIntoContents(
      sortedResults,
      resultsFromRepo.contentHashes,
      resultsFromRepo.pathTrackers,
    );

    // Aggregate the usages into one ContentUsage, which corresponds to one contentItem with usage of components in it, and results for each of those (or an error for the whole contentItem).
    contentResult.push(
      ...Object.keys(contents).map((contentId) => {
        const currentContent = contents[contentId];
        if (currentContent.multiUsage.length === 0) {
          currentContent.hasMultiUsage = false;
        } else if (!currentContent.error) {
          const errorUsages = currentContent.multiUsage.filter((usage) => !!usage?.error);
          if (errorUsages.length > 0) {
            currentContent.error = currentContent.multiUsage[0].error;
            currentContent.multiUsage = [currentContent.multiUsage[0]];
          }
        }

        return currentContent;
      }),
    );
  });

  return contentResult;
};

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
const summarizeResultsIntoContents = (
  results: SortedArrayAscending<EditorResult>,
  controlHashes: Record<string, string | null>,
  pathTrackers: Record<string, PathChangeTracker>,
): Record<string, ContentUsage> => {
  const contents: Record<string, ContentUsage> = {};

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

    setMultiUsage(currentContent, result, pathTracker);
  });

  return contents;
};

const getUsage = (result: EditorResult, overrideComponentPath?: string): MultiUsageInstance => {
  const usage: MultiUsageInstance = {
    path: overrideComponentPath || (result.componentPath as string),
    operation: result.operation,
  };
  if (result.error) {
    usage.error = result.error;
  }
  return usage;
};

const newPathPattern = new RegExp(`^${PREFIX_TRACKED_NEWCOMPONENT}`);

const trackAddedPath = (usage: MultiUsageInstance, pathTracker: PathChangeTracker): void => {
  if (!usage.error) {
    const prefixedPathAtAdditionTime = pathTracker.getOriginalPath(usage.path);
    if (prefixedPathAtAdditionTime === null || !prefixedPathAtAdditionTime.match(newPathPattern)) {
      throw Error(
        `Unexpected state - trying to retrace a replaced component path ${JSON.stringify(usage.path)}, but it's not (unambiguously) in the tracker with a key that starts with ${PREFIX_TRACKED_NEWCOMPONENT}: ${JSON.stringify(pathTracker.paths, null, 2)}`,
      );
    }
    const pathAtAdditionTime = prefixedPathAtAdditionTime.replace(newPathPattern, "");
    usage.oldPath = pathTracker.paths[pathAtAdditionTime]; // Tracked path of the original component
    usage.newPath = usage.path; // Changed component
    usage.path = pathAtAdditionTime; // The path of the original at the time of the addition - now displayed in the GUI
  }
};

const trackCleanupPathAndOperation = (usage: MultiUsageInstance, pathTracker: PathChangeTracker): void => {
  usage.path = pathTracker.paths[usage.path];

  usage.operation =
    usage.operation === Operation.Accept
      ? PARAM_VAL.accept
      : usage.operation === Operation.Undo
        ? PARAM_VAL.undo
        : undefined;
  if (!usage.operation) {
    throw Error("Couldn't determine which operation was attempted on the component: " + JSON.stringify(usage));
  }
};

enum ComponentPathType {
  String = "String",
  Array = "Array",
  Null = "Null",
}
const getComponenPathType = (result: EditorResult) => {
  if ("string" === typeof result.componentPath) {
    return ComponentPathType.String;
  } else if (result.componentPath == null) {
    return ComponentPathType.Null;
  } else if (Array.isArray(result.componentPath && typeof result.componentPath[0] === "string")) {
    return ComponentPathType.Array;
  }

  throw Error(
    `Unexpected type '${typeof result.componentPath}' of result.componentPath. Result: ${JSON.stringify(result, null, 2)}`,
  );
};

const setMultiUsage = (currentContent: ContentUsage, result: EditorResult, pathTracker: PathChangeTracker) => {
  const trackingFunction = result.operation === Operation.Add ? trackAddedPath : trackCleanupPathAndOperation;

  switch (getComponenPathType(result)) {
    case ComponentPathType.String:
      const usage: MultiUsageInstance = getUsage(result);
      trackingFunction(usage, pathTracker);
      currentContent.multiUsage.push(usage);
      setHasMultiUsage(currentContent, true);

      break;

    case ComponentPathType.Array:
      const usages: MultiUsageInstance[] = (result.componentPath as string[]).map((componentPath) => {
        const usage = getUsage(result, componentPath);
        trackingFunction(usage, pathTracker);
        return usage;
      });

      currentContent.multiUsage.push(...usages);
      setHasMultiUsage(currentContent, true);

      break;

    case ComponentPathType.Null:
      if (result.error) {
        currentContent.error = result.error;
      }

      setHasMultiUsage(currentContent, true);
      break;
  }
};

export class Results {
  results: EditorResult[];
  sourceKey: string;
  newKey: string;
  repo: string;
  targetComponentType: string;
  mainOperation: Operation;
  plannedOperationsPerId: Record<string, Record<string, Operation>>; // Nested map: contentItemId -> componentPath -> operation enum (Add, Undo, or Accept)

  // If a component is added or deleted, other components in the same region will be pushed up or down, so their paths will change.
  // his keeps track of that throughout the batch: for each contentItem (the toplevel key) by mapping originalPath -> newPath of changed components:
  pathTrackers: Record<string, PathChangeTracker>;

  // Maps a contentItem-path to a hash of its post-change content, to verify that the content item was not changed in the meantime before the review. See contentHashing.ts.
  contentHashes: Record<string, string | null>;

  constructor(
    repo: string,
    sourceKey: string,
    newKey: string,
    targetComponentType: string,
    plannedOperations: Record<string, Operation>,
    mainOperation: Operation,
  ) {
    this.results = [];
    this.repo = repo;
    this.sourceKey = sourceKey;
    this.newKey = newKey;
    this.targetComponentType = targetComponentType;
    this.pathTrackers = {};
    this.contentHashes = {};
    this.plannedOperationsPerId = parsePlannedOperationsPerId(plannedOperations, repo);
    this.mainOperation = mainOperation;
  }

  initPathChangeTracker(contentItem: ContentItem) {
    this.pathTrackers[contentItem._path] = new PathChangeTracker(contentItem);
  }

  reportSuccess(contentItem: ContentItem, targetedComponentPath: string, newPath: string) {
    const operation = this.plannedOperationsPerId[contentItem._id]?.[targetedComponentPath];

    if (!operation) {
      throw Error(
        `Unexpected state - the operation on component '${targetedComponentPath}' (on content '${contentItem._path}') wasn't among the planned operaions: ${JSON.stringify(this.plannedOperationsPerId)}`,
      );
    }

    const result = new EditorResult(this.repo, contentItem?._id, contentItem, operation, newPath);
    this.results.push(result);

    log.info(
      `OK: ${operation} operation succeeded on ${this.targetComponentType} component, on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
        newPath !== null ? ", path: " + JSON.stringify(newPath) : ""
      }), from '${this.sourceKey}' to '${this.newKey}'`,
    );
  }

  // On errors, log them, and since nothing should be changed in the data for that contentItem (atomic change: the original contentitem should
  // be returned), overwrite previous success results for that contentItem.
  markError(contentItem, componentPath: string | null, error: unknown, knownId?: string) {
    const newError =
      error instanceof Error ? error.message : "string" === typeof error ? error : "Unknown error, see log";
    this.results = this.results.filter((result) => result.id !== contentItem._id);
    this.results.push(
      new EditorResult(
        this.repo,
        contentItem?._id || knownId || "",
        contentItem,
        this.mainOperation,
        componentPath,
        newError,
      ),
    );

    log.warning(
      `Failed: ${this.mainOperation} operation on '${this.targetComponentType}' component, on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
        componentPath !== null ? ", path: " + JSON.stringify(componentPath) : ""
      }), from '${this.sourceKey}}' to '${this.newKey}':`,
    );

    log.error(error);
  }

  getPlannedOperationsForContentItem = (contentItemId: string): Record<string, Operation> => {
    const plannedOperations = this.plannedOperationsPerId[contentItemId];
    if (!plannedOperations) {
      throw Error(`Unexpected state - no planned operations found for content item with id ${contentItemId}`);
    }
    return plannedOperations;
  };

  hashContentItem = (contentItem: ContentItem): void => {
    this.contentHashes[contentItem._id] = hashContentItem(contentItem);
  };

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
