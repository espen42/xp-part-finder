import { run, type ContextParams } from "/lib/xp/context";

export function notNullOrUndefined<T>(val: T | null | undefined): val is T {
  return val !== null && val !== undefined;
}

export function find<A>(arr: A[], predicate: (value: A) => boolean): A | undefined {
  for (const key in arr) {
    if (predicate(arr[key])) {
      return arr[key];
    }
  }
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
      //repository,
      principals: ["role:system.admin"],
      ...params,
    },
    callback,
  );
}
