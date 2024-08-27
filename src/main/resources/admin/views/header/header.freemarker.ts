export type Header = {
  displayName: string;
  currentAppKey: string;
  filters: Link[];
};

export type Link = {
  text: string;
  url: string;
};
