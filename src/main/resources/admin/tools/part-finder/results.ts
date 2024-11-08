import { EditorResult } from "/admin/tools/part-finder/editor";
import type { ContentUsage, MultiUsageInstance } from "/admin/tools/part-finder/part-finder.freemarker";
import { getToolUrl } from "/lib/xp/admin";
import { Content } from "/lib/xp/content";

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

export const buildContentResult = (editorResults: EditorResult[]): ContentUsage[] => {
  const contents: ContentUsage[] = [];

  editorResults.forEach((result) => {
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
};

export interface PushResultFunc {
  (contentItem: Content | null | undefined, componentPath?: string | null, error?: unknown, knownId?: string): void;
}
export const createPushResultFunc =
  (
    results: EditorResult[],
    repoName: string,
    sourceKey: string,
    newKey: string,
    targetComponentType: string,
  ): PushResultFunc =>
  (contentItem, componentPath?, error?, knownId?) => {
    const result: EditorResult = {
      id: contentItem?._id || knownId || "",
      url: contentItem
        ? `${getToolUrl("com.enonic.app.contentstudio", "main")}/${repoName}/edit/${contentItem?._id}`
        : "",
      displayName: contentItem?.displayName || "",
      path: contentItem?._path || "",
      componentPath: componentPath || null,
    };

    // Absence of error signifies a successful operation.
    if (error) {
      log.warning(
        `Error trying to replace ${targetComponentType} key on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
          componentPath !== null ? ", path: " + JSON.stringify(componentPath) : ""
        }), from '${sourceKey}}' to '${newKey}':`,
      );
      log.error(error);

      result.error =
        error instanceof Error ? error.message : "string" === typeof error ? error : "Unknown error, see log";
    } else {
      log.info(
        `OK: Replaced ${targetComponentType} key on content item '${contentItem?.displayName || ""}' (id ${contentItem?._id}${
          componentPath !== null ? ", path: " + JSON.stringify(componentPath) : ""
        }), from '${sourceKey}' to '${newKey}'`,
      );
    }

    results.push(result);
  };
