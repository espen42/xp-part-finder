[#macro render itemLists currentItemKey=""]
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
            [#if item.total > 0]href="${item.url}"[/#if]
            [#if item.key == currentItemKey]aria-current="page"[/#if]>

            <b>${item.key?keep_after(":")}</b><span>&nbsp;(${item.total})</span>
          </a>
        [/#list]
      </nav>
    [/#list]
  </move-aria-current-on-visit>
[/#macro]
