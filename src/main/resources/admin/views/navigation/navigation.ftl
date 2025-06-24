[#-- @ftlvariable name="itemLists" type="java.util.ArrayList" --]
[#-- @ftlvariable name="noSchemaItems" type="java.util.ArrayList" --]
[#-- @ftlvariable name="hasNoschema" type="boolean" --]
[#-- @ftlvariable name="itemList.title" type="String" --]
[#-- @ftlvariable name="itemList.items" type="String" --]
[#-- @ftlvariable name="item.url" type="String" --]
[#-- @ftlvariable name="item.docCount" type="Integer" --]
[#-- @ftlvariable name="item.key" type="String" --]
[#-- @ftlvariable name="noSchemaList.title" type="String" --]
[#-- @ftlvariable name="noSchemaList.items" type="String" --]
[#-- @ftlvariable name="noSchema.url" type="String" --]
[#-- @ftlvariable name="noSchema.docCount" type="Integer" --]
[#-- @ftlvariable name="noSchema.key" type="String" --]
[#-- @ftlvariable name="unusedItems" type="java.util.ArrayList" --]
[#-- @ftlvariable name="hasUnused" type="boolean" --]
[#-- @ftlvariable name="unusedList.title" type="String" --]
[#-- @ftlvariable name="unusedList.items" type="String" --]
[#-- @ftlvariable name="unused.url" type="String" --]
[#-- @ftlvariable name="unused.docCount" type="Integer" --]
[#-- @ftlvariable name="unused.key" type="String" --]

[#macro render itemLists hasNoschema noSchemaItems unusedItems hasUnused currentItemKey=""]
  <move-aria-current-on-visit class="navigation">
    [#list itemLists as itemList]
      [#local labelId=itemList.title?lower_case]
      <div class="label-big" id="${labelId}">${itemList.title}</div>
      <nav aria-labelledby="${labelId}">
        [#list itemList.items as item]
          <a
            class="component-link"
            data-turbo-frame="content-view"
            data-turbo-action="advance"
            [#if item.docCount > 0]href="${item.url}"[/#if]
            [#if item.key == currentItemKey]aria-current="page"[/#if]
          >
            <b>${item.key?keep_after(":")}</b><span>&nbsp;(${item.docCount})</span>
          </a>
        [/#list]
      </nav>
    [/#list]

    [#if hasUnused]
      <div class="unused">
        <h2>Unused components</h2>
        <p>Below are components found as scheme in the app/code, but not used in the <em>checked</em> repo(s) (so be careful if the <pre>repo</pre> URI parameter is set and filters away others).<br/><br/>Delete from the code?</p>

        [#list unusedItems as itemList]
          [#local unusedId="unused_${itemList.title?lower_case}"]
          <div class="label-big" id="${unusedId}">Unused ${itemList.title}:</div>
          <nav aria-labelledby="${unusedId}">
            [#list itemList.items as item]
              <p
                class="component-link"
                [#--data-turbo-frame="content-view"
                data-turbo-action="advance"--]
                [#if item.docCount > 0]href="${item.url}"[/#if]
                [#if item.key == currentItemKey]aria-current="page"[/#if]
              >
                <b>${item.key?keep_after(":")}</b><span>&nbsp;(${item.docCount})</span>
              </p>
            [/#list]
          </nav>
        [/#list]
      </div>
    [/#if]

    [#if hasNoschema]
      <div class="no-schema">
        <h2>Missing schema ⚠️</h2>
        <p>Below are components found in content data, but without a matching type in the schema (ie. components that aren't supported by code from this app).<br/><br/>Could happen as a result of changes in code without updating/converting/deleting references in content yet. Should probably be checked for deprecated data:</p>

        [#list noSchemaItems as itemList]
          [#local noSchemaId="noschema_${itemList.title?lower_case}"]
          <div class="label-big" id="${noSchemaId}">Missing schema ${itemList.title}:</div>
          <nav aria-labelledby="${noSchemaId}">
            [#list itemList.items as item]
              <a
                class="component-link"
                data-turbo-frame="content-view"
                data-turbo-action="advance"
                [#if item.docCount > 0]href="${item.url}"[/#if]
                [#if item.key == currentItemKey]aria-current="page"[/#if]
              >
                <b>${item.key?keep_after(":")}</b><span>&nbsp;(${item.docCount})</span>
              </a>
            [/#list]
          </nav>
        [/#list]
      </div>
    [/#if]
  </move-aria-current-on-visit>
[/#macro]
