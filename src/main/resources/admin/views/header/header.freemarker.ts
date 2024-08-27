export type Header = {
  title: string;
  displayName: string;
  currentAppKey: string;
  filters: Link[];
};

export type Link = {
  text: string;
  url: string;
};
