[#-- @ftlvariable name="displayName" type="String" --]
[#-- @ftlvariable name="filters" type="java.util.ArrayList" --]
[#-- @ftlvariable name="itemLists" type="java.util.ArrayList" --]
[#-- @ftlvariable name="currentItemKey" type="String" --]
[#-- @ftlvariable name="currentItem" type="Object" --]
[#import "../../views/navigation/navigation.ftl" as Navigation]

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="view-transition" content="same-origin" />

    <link rel="icon" href="[@assetUrl path='images/icon.svg'/]">
    <link rel=”mask-icon” href=”[@assetUrl path='images/icon.svg'/]” color=”#000000">
    <link rel="stylesheet" href="[@assetUrl path='styles/bundle.css'/]" />

    <script type="module" src="[@assetUrl path='hotwired__turbo/8.0.4/dist/turbo.es2017-esm.js'/]"></script>
    <script type="module" src="[@assetUrl path='scripts/move-aria-current-on-visit.mjs'/]"></script>

		<title>${displayName}</title>
	</head>
	<body>
    <div class="part-finder">
      <div class="layout--header theme-brand1">
        [#include "../../views/header/header.ftl"]
      </div>

      <div class="layout--nav">
        [@Navigation.render itemLists=itemLists currentItemKey=currentItemKey /]
      </div>

      <div class="layout--content">
        [#if currentItem?has_content]
          [#include "../../views/component-view/component-view.ftl"]
        [/#if]
      </div>
    </div>
	</body>
</html>
