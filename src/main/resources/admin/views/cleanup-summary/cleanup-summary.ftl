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
      <caption class="label-big">
        <h2>STEP 2 summary: cleanup after ${currentItem.type} replacement</h2>
        <div class="inline-pre">From key:
          <pre>${oldItemKey}</pre>
        </div>
        <div class="inline-pre">To key: <a href="${newItemToolUrl}" target="_blank">
            <pre>${currentItem.key}</pre>
          </a></div>
        <br/>
      </caption>

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
            </th>
          [/#list]

          <th scope="col" class="type-column">
            Result
          </th>
        </tr>
      </thead>

      <tbody>
      [#list currentItem.contents as content]
        <tr>
          [#-- table column 1, multi-path option --]
          [#if content.hasMultiUsage]
            <td class="name-column">
              <div>${content.displayName}<br/><span class="repo-name">Repo: ${content.repo}</span></div>

              <ul class="multi-usage-selectors">
                [#list content.multiUsage as usage]
                  [#if usage.error??]
                  <li
                    title="Failed: path '${usage.path}', content '${content.displayName}' is left in the intermediate state!&#10;&#13;Error message: ${usage.error}">
                    ❌ <strong>Failed</strong>
                  [#else]
                    <li title="Ok - content '${content.displayName}' is changed.&#10;&#13;Successful '${usage.operation}' operation, result is on component path '${usage.path}'">
                    <span class="done-icon[#if usage.operation == PARAM_VAL.accept] okay-check">✓[#else]">✗[/#if]</span> <span class="multi-usage-label">${usage.path}</span>
                  [/#if]
                  </li>
                [/#list]
              </ul>
            </td>

          [#-- table column 1, single-path option --]
          [#else]
            [#if content.error??]
            <td class="name-column" title="Failed: content '${content.displayName}' is left in the intermediate state!&#10;&#13;Error message: ${content.error}">
              ❌ <strong>Failed</strong>
            [#else]
              <td class="name-column" title="Ok: changed content '${content.displayName}'">
              <span class="done-icon okay-check">✓</span> <span class="summary-name">${content.displayName}</span>
            [/#if]
            </td>
          [/#if]

          [#-- table column 2 --]
          <td class="type-column">${content.type}</td>

          [#-- table column 3 --]
          <td class="path-column">
            <a href="${content.url}" target="_blank" title="Open (Content Studio)">${content.path}</a>
            <a class="preview-link" href="/admin/site/preview/${content.repo}/draft${content.path}" target="_blank"
               title="Preview (draft)">🔍</a>
          </td>

          [#-- table column 4, multi-path option --]
          [#if content.hasMultiUsage]
            <td>
              <ul class="multi-usage-selectors radio-rows">
                [#list content.multiUsage as usage]
                  [#if usage.error??]
                    <li
                      title="Failed on path '${usage.path}'.&#10;&#13;Content '${content.displayName}' is left in the intermediate state - handle manually!&#10;&#13;Error message: ${usage.error}"
                    >
                      <p>Component error</p>
                      <p>This content is left in the intermediate state! <strong>Handle manually!</strong></p>
                      <p>Component path:<br/>${usage.path}</p><br/>
                      <p>
                        Error message:<br/>
                        <span class="usage-error">${usage.error}</span>
                      </p>
                  [#else]
                    <li
                      title="OK: Successful '${usage.operation}' operation, result is on component path '${usage.path}'."
                    >
                      [#if usage.operation == PARAM_VAL.accept]
                        <span class="done-icon okay-check">✓</span> <span class="multi-usage-label">Change accepted
                      [#else]
                        <span class="done-icon">✗</span> <span class="multi-usage-label">Reverted to original
                      [/#if]</span>
                  [/#if]
                  </li>
                [/#list]
              </ul>
            </td>

          [#-- table column 4, single-path option --]
          [#else]
            [#if content.error??]
            <td title="Failed.&#10;&#13;Content '${content.displayName}' is left in the intermediate state - handle manually!&#10;&#13;Error message: ${content.error}">
              <p>Content error</p>
              <p>This content is left in the intermediate state! <strong>Handle manually!</strong></p><br/>
              <p>Error message:<br/><span class="usage-error">${content.error}</span></p>
            [#else]
              <td title="OK: changed content '${content.displayName}'">
            [/#if]
            </td>
          [/#if]
        </tr>
      [/#list]
      </tbody>
    </table>
</turbo-frame>
