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
} satisfies Meta;

const componentArticleHeader: ComponentViewParams["currentItem"] = {
  displayName: "Article Header",
  key: "no.item.starter:article-header",
  total: 3,
  url: "#",
  contents: [
    {
      url: "#",
      displayName: "Article",
      path: "/testing/_templates/article",
    },
  ],
};

export const componentView: StoryObj<ComponentViewParams> = {
  args: {
    currentItem: componentArticleHeader,
  },
};
