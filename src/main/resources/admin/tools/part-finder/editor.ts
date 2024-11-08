import { getUser as getAuthUser } from "/lib/xp/auth";
import {
  LAYOUT_KEY
} from "/admin/tools/part-finder/part-finder";
import { PushResultFunc } from "/admin/tools/part-finder/results";

export type EditorResult = {
  id: string;
  url: string;
  displayName: string;
  path: string;
  // Absence of error value signifies a successful operation.
  error?: string;
  componentPath: string[] | string | null;
};

const editComponentTree = (
  component,
  newDescriptor,
  targetDescriptor,
  targetComponentType,
  targetComponentPath,
  contentItem,
  replacement,
) => {
  const newComponent = {
    ...component,
  };

  if (
    component?.descriptor === targetDescriptor &&
    component.type === targetComponentType &&
    (targetComponentPath === null || component.path === targetComponentPath)
  ) {
    log.info(
      `Replacing ${targetComponentType} on content item '${contentItem._path || ""}' (id ${contentItem._id}${
        targetComponentPath !== null ? ", path: " + JSON.stringify(targetComponentPath) : ""
      }), from '${targetDescriptor}' to '${newDescriptor}'`,
    );
    newComponent.descriptor = newDescriptor;
    replacement.count++;

    // TODO: REMOVE WHEN layoutDefault MIGRATION IS DONE - FROM HERE...
    if (
      /*migrateSelectedLayout && */
      component.type === LAYOUT_KEY.toLowerCase() &&
      component.regions &&
      component.config?.layout?._selected &&
      component.config.layout[component.config.layout._selected]
    ) {
      log.info(
        `    Also migrating ${targetComponentType}'s config.layout[${component.config.layout._selected}] down to .config`,
      );
      newComponent.config = {
        ...component.config,
        ...component.config.layout[component.config.layout._selected],
      };
      replacement.count++;
    }
    // TODO: ...TO HERE.
  }

  if (component?.regions) {
    const newRegions = {};
    Object.keys(component.regions).forEach((regionName) => {
      const region = component.regions[regionName];
      newRegions[regionName] = {
        ...region,
        components: (region.components || []).map((componentInRegion) => {

          return editComponentTree(
            componentInRegion,
            newDescriptor,
            targetDescriptor,
            targetComponentType,
            targetComponentPath,
            contentItem,
            replacement,
          );
        }),
      };
    });
    newComponent.regions = newRegions;
  }
  return newComponent;
};

export const createEditorFunc = (
  targetDescriptor: string,
  newDescriptor: string,
  pushResult: PushResultFunc,
  targetComponentType: string,
  componentPathsPerId: Record<string, string[] | null>,
) => {
  const user = getAuthUser();
  if (!user?.key) {
    throw Error("Couldn't resolve user.key: " + JSON.stringify(user));
  }

  const editor = (contentItem) => {
    const id = contentItem?._id;
    const targetComponentPaths = componentPathsPerId[id] === null ? [null] : componentPathsPerId[id];

    for (let p = 0; p < targetComponentPaths.length; p++) {
      const targetComponentPath = targetComponentPaths[p];

      try {

        const replacement = {
          count: 0,
        };

        const newPage = editComponentTree(
          contentItem.page,
          newDescriptor,
          targetDescriptor,
          targetComponentType,
          targetComponentPath,
          contentItem,
          replacement,
        );

        if (replacement.count > 0) {
          contentItem.page = newPage;
          pushResult(contentItem, targetComponentPath);
        }
      } catch (e) {
        pushResult(contentItem, targetComponentPath, e);
      }
    }

    return contentItem;
  };

  return editor;
};
