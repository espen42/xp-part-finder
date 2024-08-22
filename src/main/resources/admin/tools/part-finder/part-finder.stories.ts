import id from "./part-finder.ftl";
import { navigation } from "../../components/navigation/navigation.stories";
import type { Meta, StoryObj } from "@itemconsulting/xp-storybook-utils";

export default {
  title: "Admin/Part Finder",
  parameters: {
    layout: "fullscreen",
    server: { id },
  },
} satisfies Meta;

export const partFinder: StoryObj = {
  args: {
    filters: [
      {
        text: "No filter",
        url: "#",
      },
      {
        text: "MyApp",
        url: "#",
      },
    ],
    itemLists: navigation.args?.itemLists,
    currentItem: navigation.args?.itemLists?.[0].items[0],
    currentItemKey: navigation.args?.itemLists?.[0].items[0].key,
  },
};
