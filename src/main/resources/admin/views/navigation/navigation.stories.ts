import id from "./navigation.ftl";
import type { Meta, StoryObj } from "@itemconsulting/xp-storybook-utils";
import type { ComponentList } from "../../tools/part-finder/part-finder.freemarker";

export default {
  title: "Components/Navigation",
  parameters: {
    server: {
      id,
      params: {
        template: `
          [#import "/admin/views/navigation/navigation.ftl" as Navigation]
          [@Navigation.render itemLists=itemLists /]
        `,
      },
    },
  },
} satisfies Meta;

export const navigation: StoryObj<ComponentList> = {
  args: {
    currentItemKey: "no.item.starter:article-header",
    itemLists: [
      {
        title: "Parts",
        items: [
          {
            key: "no.item.starter:article-header",
            docCount: 3,
            url: "#",
          },
          {
            key: "no.item.starter:blocks-view",
            docCount: 1,
            url: "#",
          },
          {
            key: "no.item.starter:blocks-view",
            docCount: 1,
            url: "#",
          },
          {
            key: "no.item.starter:blocks-view",
            docCount: 2,
            url: "#",
          },
          {
            key: "no.item.starter:blocks-view",
            docCount: 3,
            url: "#",
          },
        ],
      },
      {
        title: "Layouts",
        items: [
          {
            key: "no.item.starter:layout-1-col",
            docCount: 1,
            url: "#",
          },
          {
            key: "no.item.starter:layout-2-col",
            docCount: 0,
            url: "#",
          },
        ],
      },
    ],
  },
};
