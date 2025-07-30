/**
 *  Hash the important parts of a content item to detect changes.
 *
 *  Why? For prod-safety.
 *
 * Part-mover changes are essentially two steps:
 * 1: Replace, ie. REWRITE the content item: for each selected component in the content item, duplicate the component, change the component descriptor, and possibly post-process the component data, and
 * 2: Review, ie. DELETE one of the components: for each duplicated-and-changed component in the content item, delete either:
 *     - the "new" component (the changed one, on the same path as the original: an UNDO operation), or
 *     - the "old" one (the duplicate, an unchanged copy on the component path one after the changed one (accept changes) or the duplicated and new one (undo).
 *
 * But there's an opportunity to review the changes in between these two steps, some time may pass - and in the meantime, another user may have changed the content item.
 * If the second step deletes components after someone else has changed some of them, this may cause an unforeseen data state.
 * So before performing the second step, we need to verify that the content item is still in the same state as it was after the first step.
 */

import * as xxh from "../../../../../../node_modules/xxhashjs/build/xxhash.js";
import { ContentItem } from "/lib/part-finder/stages";

// Any huge number as long as it's fixed between both runs.
// This one is larger than 32-bit space but still within the bit space that will be accurately interpreted and represented
// by any JS environment (which is 53 bits, not fully 64).
const SEED = 0x1dc87f6bae9123;

// In a few places in the contentitem data, the order of items in sub-arrays are not a relevant difference that should affect the hash.
// Here, sort the items here to ensure normalization
const SORT_ARRAYS_BELOW_THESE_KEYS = ["._indexConfig.configs"];

// Ensures it's the actual data that matters, not the order of keys of objects (the order of array items, however, does matter).
// Return a determinstically normalized version of the object, with sorted keys.
const normalize = (obj, currentKey: string) => {
  const sortArr = SORT_ARRAYS_BELOW_THESE_KEYS.indexOf(currentKey) > -1;

  if (obj == null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Map) {
    const entries = Array.from(obj.entries())
      .sort(([k1], [k2]) => (k1 < k2 ? -1 : k1 > k2 ? 1 : 0))
      .map(([k, v]) => [k, normalize(v, currentKey + "." + k)]);
    return Object.fromEntries(entries);
  }

  if (Array.isArray(obj)) {
    if (sortArr) {
      obj.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return obj.map((item, i) => normalize(item, currentKey + "." + i));
  }

  if (obj instanceof Set) {
    const arr = Array.from(obj);
    if (sortArr) {
      arr.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return arr.map((item, i) => normalize(item, currentKey + "." + i));
  }

  // Check for Enonic XP proxy objects using their Java class signatures
  const objectType = Object.prototype.toString.call(obj);
  if (objectType.startsWith("[object com.enonic.xp.")) {
    try {
      return normalize(JSON.parse(obj.toString()), currentKey);
    } catch (e) {
      log.debug(e);
      return obj.toString();
    }
  }

  // Regular object
  const sortedKeys = Object.keys(obj);
  sortedKeys.sort();
  const result = {};
  for (const key of sortedKeys) {
    result[key] = normalize(obj[key], currentKey + "." + key);
  }
  return result;
};

const getHash = (map): string => {
  const norMap = normalize(map, "");
  return xxh.h64(JSON.stringify(norMap), SEED).toString(16); // 16-char hex
};

export const hashContentItem = (contentItem: ContentItem): string => {
  if (!contentItem || typeof contentItem !== "object" || Array.isArray(contentItem)) {
    throw Error("Invalid/unexpected contentItem for hashing: " + typeof contentItem);
  }

  // Create a hash of the important aspects of the content item
  const { type, data, components, _indexConfig, x, page } = contentItem;
  return getHash({ type, data, components, _indexConfig, x, page });
};
