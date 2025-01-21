export type ComponentNavLinkList = {
  title: string;
  items: ComponentNavLink[];
};

export type ComponentNavLink = {
  key: string;
  url: string;
  docCount: number;
};
