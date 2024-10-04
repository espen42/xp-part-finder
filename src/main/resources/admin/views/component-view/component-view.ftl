[#-- @ftlvariable name="currentItem" type="Object" --]
[#-- @ftlvariable name="currentItem.key" type="String" --]
[#-- @ftlvariable name="currentItem.contents" type="java.util.ArrayList" --]
<turbo-frame id="content-view">
  [#if displayReplacer || displaySummaryAndUndo]
    <form action="./part-finder?key=${currentItem.key}&type=${currentItem.type}" method="post">
  [/#if]

  <table class="table">
    <caption class="label-big">${currentItem.type}: ${currentItem.key}</caption>

    <tr>
      <th scope="col">Display name</th>
      <th scope="col">Path</th>

      [#if displayReplacer || displaySummaryAndUndo]
        <th class="part-selectall-col" scope="col">
          [#if displayReplacer]Replace part[#else]Undo[/#if]
          <br/>
            <input type="checkbox"
                   id="_select_change_all_"
                   name="_select_change_all_"
                   value="change-all"
                   class="part-selectall-check part-select-check"
            />
            <label for="_select_change_all_" class="part-selectall-label">
              (select all)
            </label>
        </th>
      [/#if]
    </tr>

    [#list currentItem.contents as content]
      <tr>
        <td>${content.displayName}</td>
        <td><a href="${content.url}" target="[#if displaySummaryAndUndo]_blank[#else]_top[/#if]">${content.path}</a></td>

        [#if displayReplacer || displaySummaryAndUndo]
          <td>
              [#if displayReplacer || (displaySummaryAndUndo && content.okay)]
                <input type="checkbox"
                       id="select-item--${content.id}"
                       name="select-item--${content.id}"
                       value="${content.id}"
                       class="part-select-check"
                />
                <label for="select-item--${content.id}" class="part-select-label" />
              [#elseif content.error]
                <div class="item-error" title="${content.error}">❌</div>
              [/#if]
          </td>
        [/#if]

      </tr>
    [/#list]
  </table>

  [#if displayReplacer]
    <label for="new_part_ref" class="new-part-label">Replace part '${currentItem.key}' with:</label>
    <input type="text"
           placeholder="Format: full.app.key:part-name" id="new_part_ref"
           name="new_part_ref"
           id="new_part_ref"
           class="new-part-textfield"
    >

    <input type="submit"
           id="btn_change_part"
           value="⚠ Replace part"
           class="new-part-button"
           title="CAREFUL! This will change content data, may break page display and cause deep errors."
           disabled
    />
  [#elseif displaySummaryAndUndo]
    <div class="new-part-label">
      <p><strong>If you navigate away, you lose this list and the oportunity to undo.</strong></p>
      <p>So before moving on, check the links above to verify that the change didn't break anything.</p>
      <p>To undo: select parts above to revert the new '${currentItem.key}' back to the old '${oldItemKey}'</p>
    </div>

    <input type="hidden" name="new_part_ref" id="new_part_ref" value="${oldItemKey}"/>

    <input type="submit"
           id="btn_change_part"
           value="🔙 Undo"
           class="new-part-button"
           title="Revert the selected items"
           disabled
    />
  [/#if]


  [#if displayReplacer || displaySummaryAndUndo]
    </form>

    <script>
      window._pf_ = {}
      var pf=window._pf_;
      pf.allIdsList="[#list currentItem.contents as content]${content.id},[/#list]";

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
