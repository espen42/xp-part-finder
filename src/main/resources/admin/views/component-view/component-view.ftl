[#-- @ftlvariable name="currentItem" type="Object" --]
[#-- @ftlvariable name="currentItem.key" type="String" --]
[#-- @ftlvariable name="currentItem.contents" type="java.util.ArrayList" --]
<turbo-frame id="content-view">

  [#if currentItem.type == "PART"]
    <form action="./part-finder?key=${currentItem.key}&type=PART" method="post">
  [/#if]

    <table class="table">
      <caption class="label-big">${currentItem.type}: ${currentItem.key}</caption>

      <tr>
        <th scope="col">Display name</th>
        <th scope="col">Path</th>

        [#if currentItem.type == "PART"]
          <th class="part-selectall-col" scope="col">
            Replace part
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
          <td><a href="${content.url}" target="_top">${content.path}</a></td>

          [#if currentItem.type == "PART"]
            <td>
                <input type="checkbox"
                       id="select-change--${content.id}"
                       name="select-change--${content.id}"
                       value="${content.id}"
                       class="part-select-check"
                />
                <label for="select-change--${content.id}" class="part-select-label" />
            </td>
          [/#if]

        </tr>
      [/#list]
    </table>


    [#if currentItem.type == "PART"]
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
             title="UNSAFE! Changes content data, may break page display and cause deep errors."
      />
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

      // Enable or disable the "Replace part" button.
      // Conditions: at least one element selected, part name text field has a value matching the pattern of component names
      pf.checkSelection = function() {
        if (pf.timeoutId) window.clearTimeout(pf.timeoutId)
        pf.timeoutId = window.setTimeout(() => {
          if (
            pf.selectedIds.length &&
            (pf.targetPartNameElem.value || '')
              .trim()
              .match(/^[a-zA-Z\._]+\:[a-zA-Z][a-zA-Z0-9\-_]*$/)
          ) {
            console.log("Enable the button")
          } else {
            console.log("Disable the button")
          }
        }, 300)
      }

      // Check or uncheck a single select-checkbox
      pf.allIds.forEach(id => {
        document.getElementById("select-change--" + id).addEventListener("change", function() {
          const elem = document.getElementById("select-change--" + id);
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
          document.getElementById("select-change--" + id).checked = (pf.selectedIds.indexOf(id) !== -1);
        });
        pf.checkSelection();
      })

      pf.targetPartNameElem.addEventListener("keydown", function(event) {
        if (event.key==="Enter") {
          event.preventDefault();
          pf.targetPartNameElem.blur()
        }
        pf.checkSelection();
      })

      pf.checkSelection();
    </script>
  [/#if]
</turbo-frame>
