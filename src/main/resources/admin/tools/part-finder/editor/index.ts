import { Node, ModifiedNode } from "@enonic-types/lib-node";
import { Content, Component } from "@enonic-types/lib-content";
import { NodeConfigEntry } from "@enonic-types/lib-node";

export type EditorFunc = (contentItem: Node<ContentItem>) => ModifiedNode<ContentItem>;

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
