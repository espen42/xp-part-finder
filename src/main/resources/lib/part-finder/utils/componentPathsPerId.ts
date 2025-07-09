export const parseComponentPathsPerId = (targetIds) => {
  let i: number, id: string, path: string | null;
  const componentPathsPerId: Record<string, string[] | null> = {};

  for (i = 0; i < targetIds.length; i++) {
    id = targetIds[i];
    path = null;

    // If one of the targetIds have "__" in it, it signifies that this target is a multi-component-in-one-page one
    // (which has id before "__" and path after), aka multi-path-usage (ie. an id should only replace this and that
    // component path, and keep the same component on other paths).
    // And in that case, all the targets by that id should be multi's. And vice versa. Check that, throw error if mix-up.
    // If no mix-up, register the path or lack of path for that ID, for the editor func to handle.
    if (id.indexOf("__") !== -1) {
      id = targetIds[i].split("__")[0];
      path = targetIds[i].replace(/^.*?__/, "");

      if (componentPathsPerId[id] === null) {
        throw Error(
          `Parameter error: componentPathsPerId[${JSON.stringify(id)}] is already null instead of an array, can't add ${JSON.stringify(path)}`,
        );
      }

      componentPathsPerId[id] = componentPathsPerId[id] || [];
      // @ts-expect-error TS2531
      componentPathsPerId[id].push(path);
    } else {
      if (Array.isArray(componentPathsPerId[id])) {
        throw Error(
          `Parameter error: componentPathsPerId[${JSON.stringify(id)}'] is already an array, can't set it to null`,
        );
      }
      componentPathsPerId[id] = null;
    }
  }

  return componentPathsPerId;
};
