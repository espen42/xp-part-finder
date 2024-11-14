[#-- @ftlvariable name="currentItem" type="Object" --]
[#-- @ftlvariable name="currentItem.key" type="String" --]
[#-- @ftlvariable name="currentItem.contents" type="java.util.ArrayList" --]
<turbo-frame id="content-view">
  [#if displayReplacer || displaySummaryAndUndo]
    <form action="./part-finder?key=${currentItem.key}&type=${currentItem.type}" method="post">
  [/#if]

  <table class="table">
    [#if displaySummaryAndUndo]
      <caption class="label-big">
        Summary - ${currentItem.type} key replacement<br/>
        <div class="inline-pre">From: <pre>${oldItemKey}</pre></div>
        <div class="inline-pre">To: <a href="${newItemToolUrl}" target="_blank"><pre>${currentItem.key}</pre></a></div>
      </caption>
    [#else]
      <caption class="label-big">${currentItem.type}: ${currentItem.key}</caption>
    [/#if]

    [#-- header --]
    <tr>
      <th scope="col">Display name</th>
      <th scope="col">Path</th>

      [#if displayReplacer || displaySummaryAndUndo]
        <th class="part-selectall-col" scope="col">
          [#if displayReplacer]Replace ${currentItem.type}[#else]Undo[/#if]
          <br/>
            <div class="select-all-container">
              <input type="checkbox"
                     id="_select_change_all_"
                     name="_select_change_all_"
                     value="change-all"
                     class="part-selectall-check part-select-check"
              />
              <label for="_select_change_all_" class="part-selectall-label">
                Select all
              </label>
            </div>
          [#if getvalue??]
            <span class="getvalue">
                  (${getvalue})
                </span>
          [/#if]
        </th>
      [/#if]
    </tr>

    [#list currentItem.contents as content]
      <tr>

        [#-- column 1, multi-path option --]
        [#if content.hasMultiUsage]
          <td>
            [#if displaySummaryAndUndo]
              <div>${content.displayName}</div>
              <ul class="multi-usage-selectors">
                [#list content.multiUsage as usage]
                  [#if usage.error??]
                    <li title="Failed: path ${usage.path} on content ${content.displayName}. Error message: ${usage.error}">
                    ❌ <span class="multi-usage-label">${usage.path}</span>
                  [#else]
                    <li title="Ok: changed path ${usage.path} on content ${content.displayName}">
                    <span class="okay-check">✓</span> <span class="multi-usage-label">${usage.path}</span>
                  [/#if]
                  </li>
                [/#list]
              </ul>

            [#else]
              <div>${content.displayName}</div>
            [/#if]
          </td>

        [#-- column 1, single-path option --]
        [#else]
          [#if displaySummaryAndUndo]
            [#if content.error??]
              <td title="Failed: content ${content.displayName}. Error message: ${content.error}">
              ❌ ${content.displayName}
            [#else]
              <td title="Ok: changed content ${content.displayName}">
              <span class="okay-check">✓</span> <span class="summary-name">${content.displayName}</span>
            [/#if]

          [#else]
            <td>
              ${content.displayName}
          [/#if]
          </td>
        [/#if]

        [#-- column 2 --]
        <td>
          <a href="${content.url}" target="_blank">${content.path}</a>
        </td>

        [#if displayReplacer || displaySummaryAndUndo]

          [#-- column 3, multi-path option --]
          [#if content.hasMultiUsage]
            <td>
              <div>
                [#if displayReplacer]
                  Usages:
                [#else]
                  Undo:
                [/#if]
              </div>
              <ul class="multi-usage-selectors">
                [#list content.multiUsage as usage]
                  [#if displaySummaryAndUndo]
                    [#if usage.error??]
                      <li title="Failed: path ${usage.path} on content ${content.displayName}. Error message: ${usage.error}">
                    [#else]
                      <li title="Ok: changed path ${usage.path} on content ${content.displayName}">
                    [/#if]

                  [#else]
                    <li>
                  [/#if]
                      [#if !(usage.hideSelector?? && usage.hideSelector)]
                        <input type="checkbox"
                             id="select-item--${content.id}__${usage.path}"
                             name="select-item--${content.id}__${usage.path}"
                             value="${content.id}__${usage.path}"
                             class="part-select-check"
                        />
                      [/#if]
                  <label for="select-item--${content.id}__${usage.path}" class="part-select-label[#if displaySummaryAndUndo && usage.error??] part-error[/#if]">${usage.path}[#if getvalue?? && usage.getvalue??] <span class="getvalue">(${usage.getvalue})</span>[/#if]</label>
                  </li>
                [/#list]
              </ul>
            </td>

          [#-- column 3, single-path option --]
          [#else]
            [#if displaySummaryAndUndo]
              [#if content.error??]
                <td title="Failed: content ${content.displayName}. Error message: ${content.error}">
              [#else]
                <td title="Ok: changed content ${content.displayName}">
              [/#if]

            [#else]
              <td>
            [/#if]
                <input type="checkbox"
                       id="select-item--${content.id}"
                       name="select-item--${content.id}"
                       value="${content.id}"
                       class="part-select-check"
                />
                <label for="select-item--${content.id}" class="part-select-label" />
              </td>
          [/#if]
        [/#if]
      </tr>
    [/#list]
  </table>

  [#if displayReplacer]
    <label for="new_part_ref" class="new-part-label inline-pre">Replace ${currentItem.type} <pre>${currentItem.key}</pre> with:</label>
    <input type="text"
           placeholder="Format: full.app.key:part-name" id="new_part_ref"
           name="new_part_ref"
           id="new_part_ref"
           class="new-part-textfield"
    >

    <input type="submit"
           id="btn_change_part"
           value="Replace ${currentItem.type} ⚠"
           class="new-part-button"
           disabled
    />
    <p id="btn-info"><strong>Caution!</strong> This will change content data, and may break page displays.<br />Some changes (especially when replacing layouts) can't be reversed by the undo function on the next page.</br><strong>Stay safe and backup</strong> all the targeted content before changing, eg. with Data Toolbox</p>
  [#elseif displaySummaryAndUndo]
    <div class="new-part-label">
      <p><strong>Check the links above to verify the content.</strong></p>
      <p>Navigating away will wipe this list and the opportunity to undo!</p>
      <p>The links open in a new tab, though.</p>
    </div>

    <input type="hidden" name="new_part_ref" id="new_part_ref" value="${oldItemKey}"/>

    <input type="submit"
           id="btn_change_part"
           value="Undo ↺"
           class="new-part-button"
           disabled
    />
    <div id="btn-info" class="inline-pre">Revert the new <pre>${currentItem.key}</pre> back to the old <pre>${oldItemKey}</pre> on selected ${currentItem.type}s.</div>
  [/#if]


  [#if displayReplacer || displaySummaryAndUndo]
    </form>

    <script>
      window._pf_ = {}
      var pf=window._pf_;

      // A bit ugly, but works for removing whitespace from output:
      pf.allIdsList="[#list
        currentItem.contents as content
          ][#if content.hasMultiUsage
            ][#list content.multiUsage as usage
              ][#if !(usage.hideSelector?? && usage.hideSelector)]${content.id}__${usage.path},[/#if
            ][/#list]
          [#else
            ]${content.id},[/#if
          ][/#list
        ]";

      pf.selectAllElem = document.getElementById("_select_change_all_");
      pf.targetPartNameElem = document.getElementById("new_part_ref");
      pf.allIds=pf.allIdsList
        .substring(0, pf.allIdsList.length - 1)
        .split(",")
        .filter(id => !!id)
      pf.selectedIds=[];

      // Enable or disable the "Replace part" or "Undo" button.
      // Conditions: at least one element selected, part name text field has a value matching the pattern of component names
      pf.checkSelection = function() {
        console.log("CheckSelection...")
        if (pf.timeoutId) {
          window.clearTimeout(pf.timeoutId)
        }
        pf.timeoutId = window.setTimeout(() => {
          const btn = document.getElementById("btn_change_part")
          if (
            pf.selectedIds.length &&
            (pf.targetPartNameElem.value || '')
              .trim()
              .match(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z_]+)*\:[a-zA-Z][a-zA-Z0-9\-_]*$/)
          ) {
            btn.disabled = false;
          } else {
            btn.disabled = true;
          }

          const info = document.getElementById("btn-info")
          info.style.display = btn.disabled ? "none" : "block"
        }, 100)
      }

      // Check or uncheck a single select-checkbox
      pf.allIds.forEach(id => {
        document.getElementById("select-item--" + id).addEventListener("change", function() {
          const elem = document.getElementById("select-item--" + id);
          const isSelected = pf.selectedIds.indexOf(id) !== -1
          if (elem.checked && !isSelected) {
            pf.selectedIds.push(id);
          } else if (!elem.checked && isSelected) {
            pf.selectedIds = pf.selectedIds.filter(_id => _id !== id )
          }

          pf.selectAllElem.checked =  (pf.selectedIds.length === pf.allIds.length)
          pf.checkSelection();
        })
      })

      // Check or uncheck the select-all checkbox
      pf.selectAllElem.addEventListener("change", function() {
        if (pf.selectAllElem.checked) {
          pf.selectedIds = pf.allIds.map(id => id)
        } else {
          pf.selectedIds = []
        }

        pf.allIds.forEach(id => {
          document.getElementById("select-item--" + id).checked = (pf.selectedIds.indexOf(id) !== -1);
        });
        pf.checkSelection();
      })

      [#if displayReplacer]
        pf.targetPartNameElem.addEventListener("keydown", function(event) {
          if (event.key==="Enter") {
            event.preventDefault();
            pf.targetPartNameElem.blur()
          }
          pf.checkSelection();
        })
      [/#if]

      pf.checkSelection();
    </script>
  [/#if]
</turbo-frame>
