/**
 * Postprocessor for converting the 'banner-with-image-hw' component (lib-common, so it exists in both posten and bring) into 'cardFullwidth' component in the react-app.
 */
import { NodeIndexConfig } from "/lib/xp/node";
import {
  ContentitemMutatingPostprocessorFunc,
  postprocessAndMutateComponent,
  replaceComponentConfig,
} from "/lib/part-finder/editors/replace/postprocessors";

type CommonConfig = {
  // Text content
  header?: string;
  title?: string;
  description?: string;

  imagePos?: "" | "img-right"; // "" = left (default)

  // Image selector
  image?: {
    _id?: string;
    _path?: string;
    _name?: string;
    displayName?: string;
  };
};

type BannerWithImageHw_Unique = {
  // Items with video should trigger an error, so the specifics aren't interesting here:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  video?: any;

  // Background color options
  backgroundColor?:
    | "p-ctabox__item--bg-light"
    | "p-ctabox__item--bg-gray"
    | "p-ctabox__item--bg-dark"
    | "p-ctabox__item--bg-darker";

  // From menu-link mixin
  linkText: string;
  linkType?: BannerWithImage_MenuLink;
  newTab: boolean;
};

type CardFullwidth_Unique = {
  // Card background color
  backgroundColor?: "p-ctabox__item--bg-light" | "p-ctabox__item--bg-gray" | "p-ctabox__item--bg-white";

  // Image settings
  isIllustration: boolean;

  // From link-or-cta-group mixin
  linkOrButtons: CardFullwidth_LinkOrCTA;

  // Debugging option
  highlightErrors: boolean;

  // No video support in cardFullwidth
  video?: never;

  linkText?: never;
  linkType?: never;
  newTab?: never;
};

type BannerWithImageHwConfig = NodeIndexConfig & CommonConfig & BannerWithImageHw_Unique;
type CardFullwidthConfig = NodeIndexConfig & CommonConfig & CardFullwidth_Unique;

type BannerWithImage_MenuLink = {
  _selected?: "internalLink" | "externalLink";
  internalLink?: {
    internalLink: string;
  };
  externalLink?: {
    externalLink: string;
  };
};

type CardFullwidth_LinkOrCTA = {
  _selected?: "internalLink" | "externalLink" | "ctaGroup";
  internalLink: {
    id?: string;
    text: string;
    newTab?: boolean;
  };
  externalLink: {
    url?: string;
    text: string;
    newTab?: boolean;
  };
  // Also this, for reference (won't come from the old component, so ignored here):
  // ctaGroup: {
  //   ctaButtons: {
  //     // From link-internal
  //     id?: string;
  //     // From common-fields-cta
  //     text: string;
  //     newTab?: boolean;
  //   }[];  // 1-2 buttons
  // };
};
const convertLinks = (
  linkType: BannerWithImage_MenuLink | undefined,
  linkText: string,
  newTab: boolean,
): CardFullwidth_LinkOrCTA => {
  const output = {} as CardFullwidth_LinkOrCTA;

  const _selected = linkType?._selected;
  if (_selected) {
    output._selected = _selected;
    output[_selected] = {} as CardFullwidth_LinkOrCTA[typeof _selected];
    if (_selected === "externalLink") {
      output[_selected].url = linkType?.[_selected]?.externalLink;
    } else {
      output[_selected].id = linkType?.[_selected]?.internalLink;
    }
    output[_selected].text = linkText;
    output[_selected].newTab = newTab;
  }

  return output;
};

export const cardFullwidth: ContentitemMutatingPostprocessorFunc = (contentItem, changedPath) => {
  postprocessAndMutateComponent(contentItem, changedPath, (component, currentComponentConfig) => {
    const bannerWithImageHwConfig: BannerWithImageHwConfig = currentComponentConfig as BannerWithImageHwConfig;

    if (bannerWithImageHwConfig.video) {
      log.warning("Invalid component: " + JSON.stringify(component));
      throw Error(`Can't convert 'banner-with-image-hw': 'cardFullwidth' can't be used with video`);
    }
    if (
      bannerWithImageHwConfig.backgroundColor === "p-ctabox__item--bg-darker" ||
      bannerWithImageHwConfig.backgroundColor === "p-ctabox__item--bg-dark"
    ) {
      log.warning("Invalid component: " + JSON.stringify(component));
      throw Error(
        `Can't convert 'banner-with-image-hw': 'cardFullwidth' can't use 'p-ctabox__item--bg-dark' or 'p-ctabox__item--bg-darker' as backgroundcolor. Use a different card type (card-focus?).`,
      );
    }

    const cardFullWidthConfig: CardFullwidthConfig = {
      ...bannerWithImageHwConfig,
      backgroundColor: bannerWithImageHwConfig.backgroundColor,
      linkOrButtons: convertLinks(
        bannerWithImageHwConfig?.linkType,
        bannerWithImageHwConfig?.linkText,
        bannerWithImageHwConfig?.newTab,
      ),

      isIllustration: false,
      highlightErrors: true,

      linkText: undefined,
      linkType: undefined,
      newTab: undefined,
    };
    delete cardFullWidthConfig.linkText;
    delete cardFullWidthConfig.linkType;
    delete cardFullWidthConfig.newTab;

    replaceComponentConfig(component, cardFullWidthConfig);
  });
};
