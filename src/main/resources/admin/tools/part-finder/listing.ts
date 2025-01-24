import { UsagePathSubvalue } from "/admin/tools/part-finder/part-finder.freemarker";

export function processMultiUsage(currentItem) {
  if (currentItem?.contents && currentItem.contents.length) {
    currentItem.contents.forEach((content) => {
      if (content?.usagePaths) {
        const relevantUsages = content?.usagePaths[currentItem.key] || [];
        content.multiUsage = relevantUsages.map((item) => ({
          ...item,
          getvalue: JSON.stringify(item.targetSubValue),
        }));
        if (relevantUsages.length > 0) {
          content.hasMultiUsage = true;
        }
        delete content.usagePaths;
      }
    });
  }
}

const makeFlatSearchable = (object, key = "", result = {}) => {
  if (object === null || typeof object === "string" || typeof object === "number" || typeof object === "boolean") {
    if (key === "") {
      return object;
    }
    result[key] = object;
  } else if (Array.isArray(object)) {
    const prefix = key === "" ? key : key + ".";
    object.forEach((item, i) => {
      makeFlatSearchable(item, `${prefix}${i}`, result);
    });
  } else if (typeof object === "object") {
    const prefix = key === "" ? key : key + ".";
    Object.keys(object).forEach((key) => {
      makeFlatSearchable(object[key], `${prefix}${key}`, result);
    });
  } else if (object === undefined) {
    // ignore undefiend
  } else {
    throw Error("Can't handle " + typeof object + " value below key '" + key + "': " + JSON.stringify(object));
  }

  return result;
};

const pushUsagePath = (componentPath: string, usagePaths: UsagePathSubvalue[], componentConfig, getvalueParam) => {
  if (getvalueParam) {
    const subPathToSearch =
      typeof getvalueParam === "string" && getvalueParam.indexOf("=") !== -1
        ? getvalueParam.slice(0, getvalueParam.indexOf("="))
        : getvalueParam;

    const flatComponent = makeFlatSearchable(componentConfig);
    usagePaths.push({
      path: componentPath,
      targetSubValue: flatComponent[subPathToSearch],
    });
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
  getvalueParam: string | undefined,
): UsagePathSubvalue[] | null {
  const usagePaths: UsagePathSubvalue[] = [];
  const targetType = targetTypeUpperCase.toLowerCase();

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
      const splitDescriptor = componentDescriptor.split(":");
      const componentConfig = ((componentData.config || {})[splitDescriptor[0]] || {})[splitDescriptor[1]];
      pushUsagePath(component.path, usagePaths, componentConfig, getvalueParam);
    }
  });
  return usagePaths;
}
