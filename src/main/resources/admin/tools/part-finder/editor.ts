import { getUser as getAuthUser } from "/lib/xp/auth";
import { getToolUrl } from "/lib/xp/admin";


export type EditorResult = {
  id: string;
  url: string;
  displayName: string;
  path: string;
  // Absence of error value signifies a successful operation.
  error?: string;
  componentPath: string[] | string | null;
};

export const createEditorFunc = (
  repoName: string,
  oldAppKey: string,
  oldComponentKey: string,
  newAppKey: string,
  newComponentKey: string,
  componentType: string,
  results: EditorResult[],
  componentPathsPerId: Record<string, string[] | null>,
) => {
  const oldAppKeyDashed = oldAppKey.replace(/\./g, "-");
  const newAppKeyDashed = newAppKey.replace(/\./g, "-");

  const pathPatternString =
    "components\\." + componentType + "\\.config\\." + oldAppKeyDashed + "\\." + oldComponentKey;

  // Looks for "components.<componentType>.config.<oldAppKeyDashed>.<oldComponentKey>" or "components.<componentType>.config.<oldAppKeyDashed>.<oldComponentKey>.<something more whatever>"
  // but not "components.<componentType>.config.<oldAppKeyDashed>.<key that starts with oldComponentKey but continues before the dot or end>" or "components.<componentType>.config.<oldAppKeyDashed>.<oldComponentKey>.." etc:
  const configSearchPattern = new RegExp("^" + pathPatternString + "($|\\.(?!\\.|$))");
  const configReplacePattern = new RegExp("^(" + pathPatternString + "\\b)");
  const configReplaceTarget = "components." + componentType + ".config." + newAppKeyDashed + "." + newComponentKey;

  const user = getAuthUser();
  if (!user?.key) {
    throw Error("Couldn't resolve user.key: " + JSON.stringify(user));
  }

  const editor = (contentItem) => {
    const id = contentItem?._id;
    const componentPaths = componentPathsPerId[id] === null ? [null] : componentPathsPerId[id];

    for (let p = 0; p < componentPaths.length; p++) {
      const targetComponentPath = componentPaths[p];

      try {
        contentItem._indexConfig.configs = contentItem._indexConfig.configs.map((config) => {
          if ((config.path || "").match(configSearchPattern)) {

            const newPath = config.path.replace(configReplacePattern, configReplaceTarget);
            config.path = newPath;
          }
          return config;
        });

        contentItem.components = contentItem.components.map((component) => {
          /*
          Example component: {
            "type": "layout",
            "path": "/main/0",
            "layout": {
              "descriptor": "no.posten.website:layoutDefault",
              "config": {
                "no-posten-website": {
                  "layoutDefault": {
                    "layout": {
                      "two": {
                        "distribution": "2-1",
                        "isFlex": false
                      },
                      "_selected": "two"
                    },
                    "marginTop": true,
                    "marginBottom": false
                  }

           */

          // Abort the edit if the component:
          // - doesn't match the target component type
          // - doesn't match the target component descriptor
          // - doesn't match the target component path, if there is a target component path
          if (
            component.type !== componentType ||
            component[componentType].descriptor !== `${oldAppKey}:${oldComponentKey}` ||
            (targetComponentPath !== null && targetComponentPath !== component.path)
          ) {
            return component;
          }

          const newComponent = {
            ...component,
            [componentType]: {
              ...component[componentType],
              descriptor: `${newAppKey}:${newComponentKey}`,
              config: {
                ...component[componentType].config,
                [newAppKeyDashed]: {
                  ...component[componentType].config[oldAppKeyDashed],
                  [newComponentKey]: component[componentType].config[oldAppKeyDashed][oldComponentKey],
                },
              },
            },
          };

          if (oldAppKeyDashed !== newAppKeyDashed) {
            delete newComponent[componentType].config[oldAppKeyDashed];
          }
          if (oldComponentKey !== newComponentKey) {
            delete newComponent[componentType].config[newAppKeyDashed][oldComponentKey];
          }

          log.info(
            `OK: Replaced ${componentType} on content item '${contentItem?.displayName || ""}' (id ${id}${
              targetComponentPath !== null ? ", path: " + JSON.stringify(targetComponentPath) : ""
            }), from '${oldAppKey}:${oldComponentKey}' to '${newAppKey}:${newComponentKey}'`,
          );

          return newComponent;
        });

        results.push({
          id,
          url: `${getToolUrl("com.enonic.app.contentstudio", "main")}/${repoName}/edit/${id}`,
          displayName: contentItem?.displayName || "",
          path: contentItem?._path || "",
          componentPath: targetComponentPath,
        });
      } catch (e) {
        log.warning(
          `Error trying to replace ${componentType} on content item '${contentItem?.displayName || ""}' (id ${id}${
            targetComponentPath !== null ? ", path: " + JSON.stringify(targetComponentPath) : ""
          }), from '${oldAppKey}:${oldComponentKey}' to '${newAppKey}:${newComponentKey}'`,
        );
        log.error(e);
        results.push({
          id,
          url: `${getToolUrl("com.enonic.app.contentstudio", "main")}/${repoName}/edit/${id}`,
          displayName: contentItem?.displayName || "",
          path: contentItem?._path || "",
          error: e instanceof Error ? e.message : "Unknown error, see log",
          componentPath: targetComponentPath,
        });
      }
    }

    return contentItem;
  };

  return editor;
};
