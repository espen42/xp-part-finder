import { Node, ModifiedNode } from "@enonic-types/lib-node";
import { Content, Component } from "@enonic-types/lib-content";
import { NodeConfigEntry } from "@enonic-types/lib-node";
import { Results } from "/lib/part-finder/utils/results";

export type EditorFunc = (
  contentItem: Node<ContentItem>,
  componentPathsPerId: Record<string, string[] | null>,
  results: Results,
) => ModifiedNode<ContentItem>;

export type ContentItem = Content & {
  components: Component[];
  _indexConfig?: {
    configs: IndexConfigEntry[];
  };
};

export type IndexConfigEntry = {
  path: string;
  config: NodeConfigEntry;
};
