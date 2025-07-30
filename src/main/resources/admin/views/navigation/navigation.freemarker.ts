import { PARAM } from "/lib/part-finder/utils/params";

export type ComponentNavLinkList = {
  title: string;
  items: ComponentNavLink[];
};

export type ComponentNavLink = {
  [PARAM.key]: string;
  url: string;
  [PARAM.replace]?: string;
  [PARAM.getConfig]?: string;
  docCount: number;
};
