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
          },
          {
            displayName: "BlocksView",
            key: "no.item.starter:blocks-view",
            total: 1,
            url: "#",
            contents: [
              {
                url: "#",
                displayName: "Article",
                path: "/testing/_templates/article",
              },
            ],
          },
          {
            displayName: "BlocksView",
            key: "no.item.starter:blocks-view",
            total: 1,
            url: "#",
            contents: [
              {
                url: "#",
                displayName: "Article",
                path: "/testing/_templates/article",
              },
            ],
          },
          {
            displayName: "BlocksView",
            key: "no.item.starter:blocks-view",
            total: 2,
            url: "#",
            contents: [
              {
                url: "#",
                displayName: "Article",
                path: "/testing/_templates/article",
              },
            ],
          },
          {
            displayName: "BlocksView",
            key: "no.item.starter:blocks-view",
            total: 3,
            url: "#",
            contents: [
              {
                url: "#",
                displayName: "Article",
                path: "/testing/_templates/article",
              },
            ],
          },
        ],
      },
      {
        title: "Layouts",
        items: [
          {
            displayName: "1 Column Layout",
            key: "no.item.starter:layout-1-col",
            total: 1,
            url: "#",
            contents: [
              {
                url: "#",
                displayName: "Article",
                path: "/testing/_templates/article",
              },
            ],
          },
          {
            displayName: "2 Column Layout",
            key: "no.item.starter:layout-2-col",
            total: 0,
            url: "#",
            contents: [
              {
                url: "#",
                displayName: "Article",
                path: "/testing/_templates/article",
              },
            ],
          },
        ],
      },
    ],
  },
};
