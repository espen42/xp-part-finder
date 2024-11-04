import { EditorResult } from "/admin/tools/part-finder/editor";
import type { ContentUsage, MultiUsageInstance } from "/admin/tools/part-finder/part-finder.freemarker";

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
    const usage: { path: string; error?: string } = {
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
      if (!currentContent.error) {
        currentContent.error = currentContent.multiUsage[0].error || false;
      }
      currentContent.multiUsage = [];
    }
  });

  return contents;
};
