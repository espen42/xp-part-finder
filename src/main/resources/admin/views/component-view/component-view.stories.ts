import id from "./component-view.ftl";
import type { Meta, StoryObj } from "@itemconsulting/xp-storybook-utils";
import { ComponentViewParams } from "./component-view.freemarker";

export default {
  title: "Components/Component View",
  parameters: {
    server: {
      id,
    },
  },
} satisfies Meta<ComponentViewParams>;

const componentArticleHeader: ComponentViewParams["currentItem"] = {
  key: "no.item.starter:article-header",
  headings: [
    {
      text: "Display name",
      name: "displayName",
      url: "#",
    },
    {
      text: "Type",
      name: "type",
      url: "#",
    },
    {
      text: "Path",
      name: "_path",
      sortDirection: "ascending",
      url: "#",
    },
  ],
  contents: [
    {
      url: "#",
      displayName: "Article",
      path: "/testing/_templates/article",
      type: "portal:page",
    },
  ],
};

export const componentView: StoryObj<ComponentViewParams> = {
  args: {
    currentItem: componentArticleHeader,
  },
};
