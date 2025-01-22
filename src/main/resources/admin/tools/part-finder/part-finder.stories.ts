import id from "./part-finder.ftl";
import { navigation } from "../../views/navigation/navigation.stories";
import { header } from "../../views/header/header.stories";
import { componentView } from "../../views/component-view/component-view.stories";
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
    title: "Part finder - Part name",
    displayName: header.args?.displayName,
    currentAppKey: header.args?.currentAppKey,
    filters: header.args?.filters,
    itemLists: navigation.args?.itemLists,
    currentItem: componentView.args?.currentItem,
    currentItemKey: componentView.args?.currentItem?.key,
  },
};
