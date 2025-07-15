[#-- @ftlvariable name="currentItem" type="Object" --]
[#-- @ftlvariable name="currentItem.key" type="String" --]
[#-- @ftlvariable name="currentItem.type" type="String" --]
[#-- @ftlvariable name="currentItem.headings" type="java.util.ArrayList" --]
[#-- @ftlvariable name="currentItem.contents" type="java.util.ArrayList" --]
<turbo-frame id="content-view">
  [#if displayReplacer != '' || displaySummaryAndUndo]
    <form action="./part-finder?key=${currentItem.key}&type=${currentItem.type}" method="post">
    [#if displaySummaryAndUndo]
      <input type="hidden" name="review" value="true"></input>
    [/#if]
  [/#if]

  <table class="table">
    [#if displaySummaryAndUndo]
      <caption class="label-big">
        <h2>${currentItem.type} replacement - STEP 1</h2>
        <div class="inline-pre">From key: <pre>${oldItemKey}</pre></div>
        <div class="inline-pre">To key: <a href="${newItemToolUrl}" target="_blank"><pre>${currentItem.key}</pre></a></div><br/>
        <p><strong>REVIEW THE CHANGES AND PROCEED TO STEP 2:</strong></p><br/>
      </caption>

      <div class="usage">
        <h3>Usage:</h3><br/>
        <p><span class="okay-check" style="position: relative">✓</span>Wherever components have changed (or actually: a changed component has been added), a copy of the old component has been kept right below it in the same region.</p>
        <p>
          <ol>
            <li>Use the links below to review all the changes, and use the radio buttons in the right column to:
              <ul>
                <li>mark <span style="color: darkgreen">the changes you want to keep, with <strong>✓</strong></span> (this will delete the unchanged original in the next step), or</li>
                <li>mark <span style="color: darkred">the changes you want to reject, with ❌</span> (this will delete the changed new component in the next step).</li>
              </ul>
            </li>
            <li>Then, use the submit button to perform the batch-delete step according to your markings.</li>
          </ol>
        </p><br/>

        <p>❌<br />Any content items where any part of the process failed (see <span style="color: darkred"> error messages</span>) are left unchanged.</p><br/>
        <p>Note: the <strong>component paths</strong> in the <em>left</em> column in the table are the ones that were targeted for change, and the final paths after step 2. The component paths in the <em>right</em> column may be temporarily different in step (if component copies were inserted). But those are the changed-component paths that need to be checked.</p><br/>
        </div>

    [#else]
      <caption class="label-big">${currentItem.type}: ${currentItem.key}</caption>
    [/#if]

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
        [#if displayReplacer != '' || displaySummaryAndUndo]
          <th class="part-selectall-col" scope="col">

            [#if displayReplacer != '']
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
              [#if getconfig??]
                <span class="getconfig">
                    (${getconfig})
                  </span>
              [/#if]

            [#else]
              <div class="review-radio-row">
                <span class="part-accept">
                  <input type="radio"
                       id="_select_accept_all_"
                       name="_select_review_all_"
                       value="accept-all"
                  />
                  <label for="_select_accept_all_">
                    <strong>✓</strong> Accept&nbsp;all
                  </label>
                </span>
                <span class="part-undo">
                  <label for="_select_undo_all_"
                         class="part-undo-label">Undo all ❌
                  </label>
                  <input type="radio"
                         id="_select_undo_all_"
                         name="_select_review_all_"
                         value="undo-all"
                  />
                </span>
              </div>

            [/#if]
          </th>
        [/#if]
      </tr>
    </thead>



    <tbody>
      [#list currentItem.contents as content]
        <tr>

          [#-- table column 1, multi-path option --]
        [#if content.hasMultiUsage]
          <td class="name-column">
            [#if displaySummaryAndUndo]
              <div>${content.displayName}<br /><span class="repo-name">Repo: ${content.repo}</span></div>
              [#if (content.id?? && content.controlHash??)]
                <input type="hidden" name="contenthash__${content.id}" value="${content.controlHash}">
              [/#if]
              <ul class="multi-usage-selectors">
                [#list content.multiUsage as usage]
                  [#if usage.error??]
                    <li title="Failed: path ${usage.path} on content ${content.displayName}. Error message: ${usage.error}">
                    ❌ <strong>Failed</strong>
                  [#else]
                    <li title="Ok: changed path ${usage.path} on content ${content.displayName}">
                    <span class="okay-check">✓</span> <span class="multi-usage-label">${usage.path}</span>
                  [/#if]
                  </li>
                [/#list]
              </ul>

            [#else]
              <div>${content.displayName}<br /><span class="repo-name">Repo: ${content.repo}</span></div>
            [/#if]
          </td>

        [#-- table column 1, single-path option --]
        [#else]
          [#if displaySummaryAndUndo]
            [#if content.error??]
              <td  class="name-column" title="Failed: content ${content.displayName}. Error message: ${content.error}">
              ❌<strong>Failed</strong>
            [#else]
              <td  class="name-column" title="Ok: changed content ${content.displayName}">
              <span class="okay-check">✓</span> <span class="summary-name">${content.displayName}</span>
            [/#if]

          [#else]
            <td class="name-column">
            ${content.displayName}<br /><span class="repo-name">Repo: ${content.repo}</span>
          [/#if]
          </td>
        [/#if]

          [#-- table column 2 --]
          <td class="type-column">${content.type}</td>

          [#-- table column 3 --]
          <td class="path-column">
            <a href="${content.url}" target="_blank" title="Open (Content Studio)">${content.path}</a>
            <a class="preview-link" href="/admin/site/preview/${content.repo}/draft${content.path}" target="_blank" title="Preview (draft)">🔍</a>
          </td>


          [#if displayReplacer != '' || displaySummaryAndUndo]

          [#-- table column 4, multi-path option --]
            [#if content.hasMultiUsage]
              <td>
                <div>
                  [#if displayReplacer != '']
                    Usages:
                  [/#if]
                </div>
                <ul class="multi-usage-selectors">
                  [#list content.multiUsage as usage]
                    [#if displaySummaryAndUndo]
                      [#if usage.error??]
                        <li title="Failed: path ${usage.path} on content ${content.displayName}. Error message: ${usage.error}">
                        <p>Component path:<br/>${usage.path}</p><br/>
                        <p>Error message:<br/><span class="usage-error">${usage.error}</span></p>
                      [#else]
                        <li title="Ok: changed path ${usage.path} on content ${content.displayName}">
                      [/#if]

                    [#else]
                      <li>
                    [/#if]

                    [#if displaySummaryAndUndo]
                      [#if !usage.error??]
                        <div class="review-radio-row">
                          <span class="part-accept">
                            <input type="radio"
                                   id="delete-old--${content.id}__${usage.oldPath}"
                                   name="radio--${content.id}__${usage.path}"
                                   value="delete-old--${content.id}__${usage.oldPath}"
                                   class="part-select-radio"
                            />
                            <label for="delete-old--${content.id}__${usage.oldPath}">
                              <strong>✓</strong>&nbsp;&nbsp;${usage.newPath}
                            </label>
                          </span>
                          <span class="part-undo">
                            <label for="delete-new--${content.id}__${usage.newPath}"
                                   class="part-undo-label">❌
                            </label>
                            <input type="radio"
                                   id="delete-new--${content.id}__${usage.newPath}"
                                   name="radio--${content.id}__${usage.path}"
                                   value="delete-new--${content.id}__${usage.newPath}"
                                   class="part-select-radio"
                            />
                          </span>
                        </div>
                      [/#if]
                    [#else]
                      [#if !(usage.hideSelector?? && usage.hideSelector)]
                        <input type="checkbox"
                               id="select-item--${content.id}__${usage.path}"
                               name="select-item--${content.id}__${usage.path}"
                               value="${content.id}__${usage.path}"
                               class="part-select-check"
                        />
                      [/#if]
                      <label for="select-item--${content.id}__${usage.path}" class="part-select-label[#if displaySummaryAndUndo && usage.error??] part-error[/#if]">${usage.path}[#if getconfig?? && usage.getconfig??] <span class="getconfig">(${usage.getconfig})</span>[/#if]</label>
                    [/#if]
                    </li>
                  [/#list]
                </ul>
              </td>

            [#-- table column 4, single-path option --]
            [#else]
              [#if displaySummaryAndUndo]
                [#if content.error??]
                  <td title="Failed: content ${content.displayName}. Error message: ${content.error}">
                  <p>Content error</p><br/>
                  <p>Error message:<br/><span class="usage-error">${content.error}</span></p>
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
    </tbody>
  </table>


      [#if displayReplacer != '']
        <label for="new_part_ref"
               class="new-part-label inline-pre"
        >
          Replace ${currentItem.type}
          <pre style="cursor:pointer;display:inline"
               onclick="document.getElementById('new_part_ref').value='${currentItem.key}'"
          >${currentItem.key}</pre>
           with:
        </label>
        <input type="text"
               placeholder="Format: full.app.key:part-name" id="new_part_ref"
               name="new_part_ref"
               id="new_part_ref"
               class="new-part-textfield"
               value=${displayReplacer?replace("^true$", "", "ir")}
        >

        <label for="postprocessors" class="new-part-label inline-pre">
          Run postprocessors (comma-separated, eg. <pre>logconfig,throwerror</pre>)<br/>Available names: see src/main/resources/admin/tools/part-finder/editor/postprocessors/index.ts
        </label>
        <input type="text"
               placeholder="Postprocessor name(s)" id="postprocessors"
               name="postprocessors"
               id="postprocessors"
               class="new-part-textfield"
        >

        <input type="submit"
               id="btn_change_part"
               value="Replace ${currentItem.type} ⚠"
               class="new-part-button"
               disabled
        />
        <p id="btn-info"><strong>Caution!</strong> This will change content data, and may break page displays.<br />Some changes (especially when errors are marked) can't be easily reversed by a new rename or the undo function on the next page.</br><strong>Stay safe and backup</strong> all the targeted content before changing, eg. with Data Toolbox</p>
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


      [#if displayReplacer != '' || displaySummaryAndUndo]
    </form>

  <script>
    window._pf_ = {}
    var pf=window._pf_;

    pf.selectAllElem = document.getElementById("_select_change_all_");
    pf.acceptAllElem = document.getElementById("_select_accept_all_");
    pf.undoAllElem = document.getElementById("_select_undo_all_");
    pf.targetPartNameElem = document.getElementById("new_part_ref");

    pf.allIds=[#if allIds??    ]${allIds}
    [#else                     ][]
    [/#if]
    pf.selectedIds=[];
    pf.acceptIds=[]
    pf.undoIds=[]

    [#--
      Enable or disable the "Replace part" or "Undo" button.
      Conditions: at least one element selected, part name text field has a value matching the pattern of component names
    --]
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

    pf.allIds.forEach(id => {

      [#--
        For each select-item checkbox, add an event listener for checking/unchecking events:
      --]
      const checkbox = document.getElementById("select-item--" + id)
      if (checkbox) {
        checkbox.addEventListener("change", function() {

          [#-- Toggle the corresponding id in the selectedIds array --]
          const elem = document.getElementById("select-item--" + id);
          const isSelected = pf.selectedIds.indexOf(id) !== -1
          if (elem.checked && !isSelected) {
            pf.selectedIds.push(id);
          } else if (!elem.checked && isSelected) {
            pf.selectedIds = pf.selectedIds.filter(_id => _id !== id )
          }

          [#-- Use the selectedIds array to check if all items are selected - and according to that, toggle the select-all checkbox. --]
          pf.selectAllElem.checked = (pf.selectedIds.length === pf.allIds.length)
          pf.checkSelection();
        })
      }
    })

    [#--
      For the radio buttons, add event listeners for checking/unchecking events:
      These are used in the summary/undo mode to mark items for deletion or acceptance.
      The  arrays 'acceptIds' and 'undoIds' are used to keep track of which items are selected for deletion or acceptance.
    --]
    pf.reviewRadioRows = document.querySelectorAll("td .review-radio-row")
    pf.selectionInRow = {}
    if (pf.reviewRadioRows) {
      pf.reviewRadioRows.forEach(radioRow => {
        [#--
          "Change"-event listener for radio buttons only respond to selection: getting focus, not losing it.
          So the event listener must be on the common container level for all radiobuttons in a group and wait for a common event to bubble up.
          Then parse the event.
        --]
        radioRow.addEventListener("change", e=> {
          const rowName = e.target.name

          const previousSelection = pf.selectionInRow[rowName]
          if (previousSelection) {
            if (previousSelection.startsWith("delete-old--")) {
              pf.acceptIds = pf.acceptIds.filter(id => id !== previousSelection)
            } else if (previousSelection.startsWith("delete-new--")) {
              pf.undoIds = pf.undoIds.filter(id => id !== previousSelection)
            }
          }

          const newSelection = e.target.value
          if (newSelection) {
            pf.selectionInRow[rowName] = newSelection
            if (newSelection.startsWith("delete-old--")) {
              pf.acceptIds.push(newSelection)
            } else if (newSelection.startsWith("delete-new--")) {
              pf.undoIds.push(newSelection)
            }
          }

          pf.acceptAllElem.checked = (pf.acceptIds.length === pf.reviewRadioRows.length)
          pf.undoAllElem.checked = (pf.undoIds.length === pf.reviewRadioRows.length)

        })
      })
    }

    if (pf.acceptAllElem) {
      pf.acceptAllElem.addEventListener("change", function() {
          pf.undoAllElem.checked = false
          pf.selectionInRow = {}
          pf.undoIds = []
          pf.acceptIds = []
          pf.reviewRadioRows.forEach(row => {
            const undo = row.querySelector(".part-undo input[type='radio']")
            undo.checked = false

            const accept = row.querySelector(".part-accept input[type='radio']")
            accept.checked = true

            pf.selectionInRow[accept.name] = accept.value
            pf.acceptIds.push(accept.value)
          })

      })
    }

    if (pf.undoAllElem) {
      pf.undoAllElem.addEventListener("change", function() {
          pf.acceptAllElem.checked = false
          pf.acceptIds = []
          pf.undoIds = []
          pf.reviewRadioRows.forEach(row => {
            const accept = row.querySelector(".part-accept input[type='radio']")
            accept.checked = false

            const undo = row.querySelector(".part-undo input[type='radio']")
            undo.checked = true

            pf.selectionInRow[undo.name] = undo.value
            pf.undoIds.push(undo.value)
          })
      })
    }


    if (pf.selectAllElem) {
      [#--  For the select-all checkbox, add an event listener for checking/unchecking it --]
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
    }

    [#if displayReplacer != '']
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
