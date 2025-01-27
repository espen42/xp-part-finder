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

[#macro render itemLists hasNoschema noSchemaItems currentItemKey=""]
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
            [#if item.key == currentItemKey]aria-current="page"[/#if]>

            <b>${item.key?keep_after(":")}</b><span>&nbsp;(${item.docCount})</span>
          </a>
        [/#list]
      </nav>
    [/#list]

    [#if hasNoschema]
      <div class="no-schema">
        <h2>⚠️ Missing schema:</h2>
        <p>Components found in content data, but without a matching type in the schema that comes from the app.<br/><br/>Could happen as a result of changes in code without updating/converting/deleting references in content yet. Should probably be checked for deprecated data:</p>

        [#list noSchemaItems as itemList]
          [#local noSchemaId="noschema_${itemList.title?lower_case}"]
          <div class="label-big" id="${noSchemaId}">${itemList.title}</div>
          <nav aria-labelledby="${noSchemaId}">
            [#list itemList.items as item]
              <a
                class="component-link"
                data-turbo-frame="content-view"
                data-turbo-action="advance"
                [#if item.docCount > 0]href="${item.url}"[/#if]
                [#if item.key == currentItemKey]aria-current="page"[/#if]>

                <b>${item.key?keep_after(":")}</b><span>&nbsp;(${item.docCount})</span>
              </a>
            [/#list]
          </nav>
        [/#list]
      </div>
    [/#if]
  </move-aria-current-on-visit>
[/#macro]
