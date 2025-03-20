import { UsagePathSubvalue } from "/admin/tools/part-finder/part-finder.freemarker";

export function processMultiUsage(currentItem) {
  if (currentItem?.contents && currentItem.contents.length) {
    currentItem.contents.forEach((content) => {
      if (content?.usagePaths) {
        const relevantUsages = content?.usagePaths[currentItem.key] || [];
        content.multiUsage = relevantUsages.map((item) => ({
          ...item,
          getconfig: JSON.stringify(item.targetSubValue),
        }));
        if (relevantUsages.length > 0) {
          content.hasMultiUsage = true;
        }
        delete content.usagePaths;
      }
    });
  }
}

const makeFlatSearchable = (object, getconfigParam, key = "", result = {}) => {
  if (object === null || typeof object === "string" || typeof object === "number" || typeof object === "boolean") {
    if (key === "") {
      return object;
    }
    result[key] = object;
  } else if (key === getconfigParam) {
    result[key] = object;
  } else if (Array.isArray(object)) {
    const prefix = key === "" ? key : key + ".";
    object.forEach((item, i) => {
      makeFlatSearchable(item, getconfigParam, `${prefix}${i}`, result);
    });
  } else if (typeof object === "object") {
    const prefix = key === "" ? key : key + ".";
    Object.keys(object).forEach((key) => {
      makeFlatSearchable(object[key], getconfigParam, `${prefix}${key}`, result);
    });
  } else if (object === undefined) {
    // ignore undefined
  } else {
    throw Error("Can't handle " + typeof object + " value below key '" + key + "': " + JSON.stringify(object));
  }

  return result;
};

const pushUsagePath = (componentPath: string, usagePaths: UsagePathSubvalue[], componentConfig, getconfigParam) => {
  if (getconfigParam) {
    const subPathToSearch =
      typeof getconfigParam === "string" && getconfigParam.indexOf("=") !== -1
        ? getconfigParam.slice(0, getconfigParam.indexOf("="))
        : getconfigParam;

    if (subPathToSearch === "*") {
      usagePaths.push({
        path: componentPath,
        targetSubValue: componentConfig,
      });
    } else {
      const flatComponent = makeFlatSearchable(componentConfig, getconfigParam);
      usagePaths.push({
        path: componentPath,
        targetSubValue: flatComponent[subPathToSearch],
      });
    }
  } else {
    usagePaths.push({
      path: componentPath,
    });
  }
};

export function getUsagePaths(
  content: { components?; _path: string },
  targetTypeUpperCase: string,
  targetDescriptor: string,
  getconfigParam: string | undefined,
): UsagePathSubvalue[] | null {
  const usagePaths: UsagePathSubvalue[] = [];
  const targetType = targetTypeUpperCase.toLowerCase();

  if (content?.components && typeof content.components === "object" && !Array.isArray(content.components)) {
    content.components = [content.components];
  }
  (content?.components || []).forEach((component) => {
    /** Example component object:
     *        {
     *         "type": "layout",
     *         "path": "/main/0",
     *         "layout": {                                            <-- target type points to componentData
     *           "descriptor": "no.posten.website:layoutDefault",
     *           "config": {
     *             "no-posten-website": {
     *               "layoutDefault": {                               <-- componentConfig pointed to by componentData.config then keys from the descriptor but split at the colon
     *                 ...
     *                 ...
     */

    const componentData = (component || {})[targetType] || {};
    const componentDescriptor = componentData.descriptor;

    if (component?.type === targetType && componentDescriptor === targetDescriptor) {
      const configSubkeys = componentDescriptor.replace(/\./g, "-").split(":");
      const componentConfig = ((componentData.config || {})[configSubkeys[0]] || {})[configSubkeys[1]];

      pushUsagePath(component.path, usagePaths, componentConfig, getconfigParam);
    }
  });

  return usagePaths;
}
