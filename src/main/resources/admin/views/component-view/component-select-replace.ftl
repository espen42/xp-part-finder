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
  <form action="./part-finder?${PARAM.key}=${currentItem.key}&${PARAM.type}=${currentItem.type}" method="post">

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

        [#-- Extra replace-routine column --]
        <th class="part-selectall-col" scope="col">

          Replace ${currentItem.type}
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
          [#if configQuery??]
            <span class="get-config">
                    (${configQuery})
                  </span>
          [/#if]
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
            </td>

          [#-- table column 1, single-path option --]
          [#else]
            <td class="name-column">
              ${content.displayName}<br/><span class="repo-name">Repo: ${content.repo}</span>
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
                <div>
                  Usages:
                </div>
                <ul class="multi-usage-selectors">
                  [#list content.multiUsage as usage]
                    <li>
                      [#if !(usage.hideSelector?? && usage.hideSelector)]
                        <input type="checkbox"
                               id="${PREFIX.selectItem}${content.repo}::${content.id}__${usage.path}"
                               name="${PREFIX.selectItem}${content.repo}::${content.id}__${usage.path}"
                               value="${content.repo}::${content.id}__${usage.path}"
                               class="part-select-check"
                        />
                      [/#if]
                      <label for="${PREFIX.selectItem}${content.repo}::${content.id}__${usage.path}"
                             class="part-select-label"
                      >${usage.path
                        }[#if configQuery?? && usage.compConfig??] <span class="get-config">
                          (${usage.compConfig})</span>[/#if]
                      </label>
                    </li>
                  [/#list]
                </ul>
              </td>

            [#-- table column 4, single-path option --]
            [#else]
              <td>
                <input type="checkbox"
                       id="${PREFIX.selectItem}${content.repo}::${content.id}"
                       name="${PREFIX.selectItem}${content.repo}::${content.id}"
                       value="${content.repo}::${content.id}"
                       class="part-select-check"
                />
                <label for="${PREFIX.selectItem}${content.repo}::${content.id}" class="part-select-label"/>
              </td>
            [/#if]
        </tr>
      [/#list]
      </tbody>
    </table>

    <label for="${PARAM.newPartName}"
           class="new-part-label inline-pre"
    >
      Replace ${currentItem.type}
      <pre style="cursor:pointer;display:inline"
           onclick="pf.copyPartName()"
      >${currentItem.key}</pre>
      with:
    </label>
    <input type="text"
           placeholder="Format: full.app.key:part-name" id="${PARAM.newPartName}"
           name="${PARAM.newPartName}"
           id="${PARAM.newPartName}"
           class="new-part-textfield"
           value="${displayReplaceSelectors?replace("^true$", "", "ir")}"
    >

    <label for="${PARAM.postprocessors}" class="new-part-label inline-pre">
      Run postprocessors (comma-separated, eg.
      <pre>logconfig,throwerror</pre>
      )<br/>Available names: see src/main/resources/admin/tools/part-finder/editor/postprocessors/index.ts
    </label>
    <input type="text"
           placeholder="Postprocessor name(s)"
           name="${PARAM.postprocessors}"
           id="${PARAM.postprocessors}"
           class="new-part-textfield"
    >
    <input type="submit"
           id="btn_change_part"
           value="Run process ⚠"
           class="new-part-button"
           disabled
    />
    <p id="btn-info"><strong>Caution!</strong> This will change content data, and may break page displays.<br/>Some
      changes (especially when errors are marked) can't be easily reversed by a new rename or the undo function on the
      next page.</br><strong>Stay safe and backup</strong> all the targeted content before changing, eg. with Data
      Toolbox</p>
  </form>

  <script>
    window._pf_ = {}
    var pf = window._pf_;

    pf.allIds = [#if allIds??    ]${allIds}
      [#else                     ]${"[]"}
    [/#if];

    pf.selectAllElem = document.getElementById("_select_change_all_");
    pf.targetPartNameElem = document.getElementById("${PARAM.newPartName}");

    [#--
      For the radio buttons, add event listeners for checking/unchecking events:
      These are used in the summary/undo mode to mark items for deletion or acceptance.
    --]
    pf.selectedIds = [];
    pf.btn = document.getElementById("btn_change_part")

    [#--
      Enable or disable the "Replace part" button.
      Conditions: at least one element selected, part name text field has a value matching the pattern of component names
    --]
    pf.checkSelection = function () {
      console.log("CheckSelection...")
      if (pf.timeoutId) {
        window.clearTimeout(pf.timeoutId)
      }
      pf.timeoutId = window.setTimeout(() => {
        pf.btn.disabled = !(
          pf.selectedIds.length &&
          (pf.targetPartNameElem.value || '')
            .trim()
            .match(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z_]+)*\:[a-zA-Z][a-zA-Z0-9\-_]*$/)
        )

        const info = document.getElementById("btn-info")
        info.style.display = pf.btn.disabled ? "none" : "block"
      }, 100)
    }

    pf.copyPartName = function() {
      pf.targetPartNameElem.value='${currentItem.key}';
      pf.checkSelection();
    }

    [#--  For each select-item checkbox, add an event listener for checking/unchecking events --]

    pf.allIds.forEach(id => {

      [#--
        For each select-item checkbox, add an event listener for checking/unchecking events:
      --]
      const checkbox = document.getElementById("${PREFIX.selectItem}" + id)
      if (checkbox) {
        checkbox.addEventListener("change", function () {

          [#-- Toggle the corresponding id in the selectedIds array --]
          const elem = document.getElementById("${PREFIX.selectItem}" + id);
          const isSelected = pf.selectedIds.indexOf(id) !== -1
          if (elem.checked && !isSelected) {
            pf.selectedIds.push(id);
          } else if (!elem.checked && isSelected) {
            pf.selectedIds = pf.selectedIds.filter(_id => _id !== id)
          }

          [#-- Use the selectedIds array to check if all items are selected - and according to that, toggle the select-all checkbox. --]
          pf.selectAllElem.checked = (pf.selectedIds.length === pf.allIds.length)
          pf.checkSelection();
        })
      }
    })

    if (pf.selectAllElem) {
      [#--  For the select-all checkbox, add an event listener for checking/unchecking it --]
      pf.selectAllElem.addEventListener("change", function () {
        if (pf.selectAllElem.checked) {
          pf.selectedIds = pf.allIds.map(id => id)
        } else {
          pf.selectedIds = []
        }

        pf.allIds.forEach(id => {
          document.getElementById("${PREFIX.selectItem}" + id).checked = (pf.selectedIds.indexOf(id) !== -1);
        });

        pf.checkSelection();
      })
    }


    pf.targetPartNameElem.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        pf.targetPartNameElem.blur()
      }
      pf.checkSelection();
    })


    pf.checkSelection();
  </script>

</turbo-frame>
