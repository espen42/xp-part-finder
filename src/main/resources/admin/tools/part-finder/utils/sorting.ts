import {ComponentNavLink} from "/admin/views/navigation/navigation.freemarker";

export const SORT_FUNCS: Record<
  "alphaasc" | "alphadesc" | "countasc" | "countdesc",
  (a: ComponentNavLink, b: ComponentNavLink) => number
> = {
  alphaasc: (a, b) => a.key.localeCompare(b.key),
  alphadesc: (a, b) => b.key.localeCompare(a.key),
  countasc: (a, b) => a.docCount - b.docCount,
  countdesc: (a, b) => b.docCount - a.docCount,
};
