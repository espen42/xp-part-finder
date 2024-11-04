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

const detectCompPathsToPreserve = (contentItem, targetKey, targetComponentType, targetComponentPaths) => {
  // If a content has multiple usages of a component, and not all of those components are targeted for change here, then
  // the indexConfig of that component should be copied instead of renamed, in order to retain the
  // information for the component instances that still use the old one.
  const untargetedPaths =
    !targetComponentPaths || !targetComponentPaths.length || !targetComponentPaths[0]
      ? []
      : contentItem.components
          .map((component) => {
            if (
              component != null &&
              component.type === targetComponentType &&
              (component[targetComponentType] || {}).descriptor === targetKey &&
              targetComponentPaths.indexOf(component.path) === -1
            ) {
              return component.path;
            }
            return null;
          })
          .filter((componentPath) => componentPath);

  const preserveSomeComponentPaths = untargetedPaths.length > 0;

  if (preserveSomeComponentPaths) {
    log.info(
      "Changing " +
        targetComponentType +
        "(s) ('" +
        targetKey +
        "') " +
        "on content " +
        contentItem._path +
        " but leaving it unchanged on path(s): " +
        JSON.stringify(untargetedPaths),
    );
  } else {
    log.info("Changing all " + targetComponentType + "(s) ('" + targetKey + "') " + "on content " + contentItem._path);
  }

  return preserveSomeComponentPaths;
};

export const createEditorFunc = (
  repoName: string,
  oldAppKey: string,
  oldComponentKey: string,
  newAppKey: string,
  newComponentKey: string,
  targetComponentType: string,
  results: EditorResult[],
  componentPathsPerId: Record<string, string[] | null>,
) => {
  const oldAppKeyDashed = oldAppKey.replace(/\./g, "-");
  const newAppKeyDashed = newAppKey.replace(/\./g, "-");

  const targetKey = `${oldAppKey}:${oldComponentKey}`;
  const pathPatternString =
    "components\\." + targetComponentType + "\\.config\\." + oldAppKeyDashed + "\\." + oldComponentKey;

  // Looks for "components.<componentType>.config.<oldAppKeyDashed>.<oldComponentKey>" or "components.<componentType>.config.<oldAppKeyDashed>.<oldComponentKey>.<something more whatever>"
  // but not "components.<componentType>.config.<oldAppKeyDashed>.<key that starts with oldComponentKey but continues before the dot or end>" or "components.<componentType>.config.<oldAppKeyDashed>.<oldComponentKey>.." etc:
  const configSearchPattern = new RegExp("^" + pathPatternString + "($|\\.(?!\\.|$))");
  const configReplacePattern = new RegExp("^(" + pathPatternString + "\\b)");
  const configReplaceTarget =
    "components." + targetComponentType + ".config." + newAppKeyDashed + "." + newComponentKey;

  const user = getAuthUser();
  if (!user?.key) {
    throw Error("Couldn't resolve user.key: " + JSON.stringify(user));
  }

  const editor = (contentItem) => {
    const id = contentItem?._id;
    const targetComponentPaths = componentPathsPerId[id] === null ? [null] : componentPathsPerId[id];


    const preserveSomeComponentPaths = detectCompPathsToPreserve(
      contentItem,
      targetKey,
      targetComponentType,
      targetComponentPaths,
    );


    for (let p = 0; p < targetComponentPaths.length; p++) {
      const targetComponentPath = targetComponentPaths[p];

      try {
        for (let i = 0; i < (contentItem?._indexConfig?.configs || []).length; i++) {
          const config = contentItem?._indexConfig?.configs[i];

          if ((config.path || "").match(configSearchPattern)) {
            const newPath = config.path.replace(configReplacePattern, configReplaceTarget);

            if (preserveSomeComponentPaths) {
              const newConfig = {
                ...config,
                path: newPath,
              };
              contentItem?._indexConfig?.configs.push(newConfig);
            } else {
              config.path = newPath;
            }
          }
        }
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

          // Skip the edit if the component:
          // - doesn't match the target component type
          // - doesn't match the target component descriptor
          // - doesn't match the target component path, if there is a target component path
          if (
            component.type !== targetComponentType ||
            component[targetComponentType].descriptor !== targetKey ||
            (targetComponentPath !== null && component.path !== targetComponentPath)
          ) {
            return component;
          }

          const newComponent = {
            ...component,
            [targetComponentType]: {
              ...component[targetComponentType],
              descriptor: `${newAppKey}:${newComponentKey}`,
              config: {
                ...component[targetComponentType].config,
                [newAppKeyDashed]: {
                  ...component[targetComponentType].config[oldAppKeyDashed],
                  [newComponentKey]: component[targetComponentType].config[oldAppKeyDashed][oldComponentKey],
                },
              },
            },
          };

          if (oldAppKeyDashed !== newAppKeyDashed) {
            delete newComponent[targetComponentType].config[oldAppKeyDashed];
          }
          if (oldComponentKey !== newComponentKey) {
            delete newComponent[targetComponentType].config[newAppKeyDashed][oldComponentKey];
          }

          log.info(
            `OK: Replaced ${targetComponentType} on content item '${contentItem?.displayName || ""}' (id ${id}${
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
          `Error trying to replace ${targetComponentType} on content item '${contentItem?.displayName || ""}' (id ${id}${
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
