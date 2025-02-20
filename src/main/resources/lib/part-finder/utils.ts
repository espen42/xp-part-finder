import { run, type ContextParams } from "/lib/xp/context";
import { getToolUrl } from "/lib/xp/admin";

export function notNullOrUndefined<T>(val: T | null | undefined): val is T {
  return val !== null && val !== undefined;
}

export function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(`${value} is not defined`);
  }
}

export function find<T, S extends T>(arr: T[], predicate: (value: T) => value is S): S | undefined;
export function find<T>(arr: T[], predicate: (value: T) => boolean): T | undefined;
export function find<T>(arr: T[], predicate: (value: T) => boolean): T | undefined {
  for (const key in arr) {
    if (predicate(arr[key])) {
      return arr[key];
    }
  }
}

export function findIndex<A>(arr: A[], predicate: (value: A) => boolean): number {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) {
      return i;
    }
  }
  return -1;
}

export function unique(arr: string[]): string[] {
  return arr.filter((value, index, all) => all.indexOf(value) === index);
}

export function objectKeys<Obj extends object>(obj: Obj): (keyof Obj)[] {
  return Object.keys(obj) as (keyof Obj)[];
}

export function startsWith(str: string, searchString: string): boolean {
  return str.substring(0, searchString.length) === searchString;
}

export function flatMap<A, B>(arr: A[], f: (val: A) => B[]): B[] {
  return arr.reduce<B[]>((res, val) => res.concat(f(val)), []);
}

export function stringAfterLast(str: string, delimiter: string): string {
  return str.substring(str.lastIndexOf(delimiter) + 1);
}

export function runAsAdmin<T>(callback: () => T, params: ContextParams = {}): T {
  return run(
    {
      branch: "draft",
      principals: ["role:system.admin"],
      ...params,
    },
    callback,
  );
}

export const hasStringValue = (value) => value != null && (value + "").trim();

export function getPartFinderUrl(params: Record<string, string>): string {
  const queryParams = objectKeys(params)
    .filter((key) => hasStringValue(key) && hasStringValue(params[key]))
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  return `${getToolUrl("no.item.partfinder", "part-finder")}?${queryParams}`;
}
