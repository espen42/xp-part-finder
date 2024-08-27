import id from "./part-finder.ftl";
import { navigation } from "../../views/navigation/navigation.stories";
import { header } from "../../views/header/header.stories";
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
    displayName: header.args?.displayName,
    currentAppKey: header.args?.currentAppKey,
    filters: header.args?.filters,
    itemLists: navigation.args?.itemLists,
    currentItem: navigation.args?.itemLists?.[0].items[0],
    currentItemKey: navigation.args?.itemLists?.[0].items[0].key,
  },
};
