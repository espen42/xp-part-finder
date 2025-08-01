[#-- @ftlvariable name="currentItem" type="Object" --]
[#-- @ftlvariable name="currentItem.key" type="String" --]
[#-- @ftlvariable name="currentItem.type" type="String" --]
[#-- @ftlvariable name="currentItem.headings" type="java.util.ArrayList" --]
[#-- @ftlvariable name="currentItem.contents" type="java.util.ArrayList" --]
[#-- @ftlvariable name="configQuery" type="String" --]
[#-- @ftlvariable name="PARAM" type="Object" --]
[#-- @ftlvariable name="PARAM_VAL" type="Object" --]
[#-- @ftlvariable name="PREFIX" type="Object" --]
<turbo-frame id="content-view">
  <table class="table">
    <caption class="label-big">${currentItem.type}: ${currentItem.key}</caption>

    [#-- table header --]
    <thead>
      <tr>
        [#list currentItem.headings as heading]
          <th
            scope="col"
            [#if heading.sortDirection?has_content]aria-sort="${heading.sortDirection}"[/#if]>

            <a
              class="sort-link"
              href="${heading.url}">

              ${heading.text}
            </a>

            <span aria-hidden="true"></span>
          </th>
        [/#list]
      </tr>
    </thead>



    <tbody>
      [#list currentItem.contents as content]
        <tr>
          [#-- table column 1, multi-path option --]
        [#if content.hasMultiUsage]
          <td class="name-column">
            <div>${content.displayName}<br /><span class="repo-name">Repo: ${content.repo}</span></div>
          </td>

        [#-- table column 1, single-path option --]
        [#else]
          <td class="name-column">
            ${content.displayName}<br /><span class="repo-name">Repo: ${content.repo}</span>
          </td>
        [/#if]

          [#-- table column 2 --]
          <td class="type-column">${content.type}</td>

          [#-- table column 3 --]
          <td class="path-column">
            <a href="${content.url}" target="_blank" title="Open (Content Studio)">${content.path}</a>
            <a class="preview-link" href="/admin/site/preview/${content.repo}/draft${content.path}" target="_blank" title="Preview (draft)">🔍</a>
          </td>
        </tr>
      [/#list]
    </tbody>
  </table>
</turbo-frame>
