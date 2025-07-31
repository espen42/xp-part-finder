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
  [#if displayReplacer != '' || displaySummaryAndUndo]
    <form action="./part-finder?${PARAM.key}=${currentItem.key}&${PARAM.type}=${currentItem.type}" method="post">
    [#if displaySummaryAndUndo]
      [#-- If the displaySummaryAndUndo mode is active, add a hidden input to trigger the cleanup stage on the next post request --]
      <input type="hidden" name="${PARAM.cleanup}" value="${PARAM_VAL.true}"></input>
    [/#if]
  [/#if]

  <table class="table">
    [#if displaySummaryAndUndo]
      <caption class="label-big">
        <h2>Summary: ${currentItem.type} replacement - STEP 1</h2>
        <div class="inline-pre">From key: <pre>${oldItemKey}</pre></div>
        <div class="inline-pre">To key: <a href="${newItemToolUrl}" target="_blank"><pre>${currentItem.key}</pre></a></div><br/>
      </caption>

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
              [#if configQuery??]
                <span class="get-config">
                    (${configQuery})
                  </span>
              [/#if]

            [#else]
              <div id="review-all" class="review-radio-row">
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
                <input type="hidden" name="${PREFIX.contentHash}${content.id}" value="${content.controlHash}">
              [/#if]
              <ul class="multi-usage-selectors">
                [#list content.multiUsage as usage]
                  [#if usage.error??]
                    <li title="Failed: path ${usage.path} on content ${content.displayName}. Error message: ${usage.error}">
                    ❌ <strong>Failed</strong>
                  [#else]
                    <li title="Ok so far - content '${content.displayName}' is changed:&#10;&#13;original component path was '${usage.path}'.&#10;&#13;Temporary paths to review: the updated version of the component is at '${usage.newPath}', and an unchanged copy of the original is at '${usage.oldPath}'">
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
                <ul class="multi-usage-selectors[#if displaySummaryAndUndo] radio-rows[/#if]">
                  [#list content.multiUsage as usage]
                    [#if displaySummaryAndUndo]
                      [#if usage.error??]
                        <li title="Failed: path ${usage.path} on content ${content.displayName}. Error message: ${usage.error}">
                        <p>Component path:<br/>${usage.path}</p><br/>
                        <p>Error message:<br/><span class="usage-error">${usage.error}</span></p>
                      [#else]
                        <li title="'Accept' keeps the new version of the component (${usage.newPath}) and deletes the copy of the original (${usage.oldPath}).&#10;&#13;'Undo' deletes the new version and keeps the original.">
                      [/#if]

                    [#else]
                      <li>
                    [/#if]

                    [#if displaySummaryAndUndo]
                      [#if !usage.error??]
                        <div class="review-radio-row">
                          <span class="part-accept">
                            <input type="radio"
                                   id="${PREFIX.deleteOld}${content.id}__${usage.oldPath}"
                                   name="${PREFIX.radioButtonGroup}${content.id}__${usage.path}"
                                   value="${PREFIX.deleteOld}${content.id}__${usage.oldPath}"
                                   class="part-select-radio"
                            />
                            <label for="${PREFIX.deleteOld}${content.id}__${usage.oldPath}">
                              <strong>✓</strong>&nbsp;&nbsp;${usage.newPath}
                            </label>
                          </span>
                          <span class="part-undo">
                            <label for="${PREFIX.deleteNew}${content.id}__${usage.newPath}"
                                   class="part-undo-label">❌
                            </label>
                            <input type="radio"
                                   id="${PREFIX.deleteNew}${content.id}__${usage.newPath}"
                                   name="${PREFIX.radioButtonGroup}${content.id}__${usage.path}"
                                   value="${PREFIX.deleteNew}${content.id}__${usage.newPath}"
                                   class="part-select-radio"
                            />
                          </span>
                        </div>
                      [/#if]
                    [#else]
                      [#if !(usage.hideSelector?? && usage.hideSelector)]
                        <input type="checkbox"
                               id="${PREFIX.selectItem}${content.id}__${usage.path}"
                               name="${PREFIX.selectItem}${content.id}__${usage.path}"
                               value="${content.id}__${usage.path}"
                               class="part-select-check"
                        />
                      [/#if]
                      <label for="${PREFIX.selectItem}${content.id}__${usage.path}"
                             class="part-select-label[#if displaySummaryAndUndo && usage.error??] part-error[/#if]"
                      >${usage.path
                         }[#if configQuery?? && usage.compConfig??] <span class="get-config">(${usage.compConfig})</span>[/#if]
                      </label>
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
                     id="${PREFIX.selectItem}${content.id}"
                     name="${PREFIX.selectItem}${content.id}"
                     value="${content.id}"
                     class="part-select-check"
              />
              <label for="${PREFIX.selectItem}${content.id}" class="part-select-label" />
              </td>
            [/#if]
          [/#if]
        </tr>
      [/#list]
    </tbody>
  </table>


      [#if displayReplacer != '']
        <label for="${PARAM.newPartName}"
               class="new-part-label inline-pre"
        >
          Replace ${currentItem.type}
          <pre style="cursor:pointer;display:inline"
               onclick="document.getElementById('${PARAM.newPartName}').value='${currentItem.key}'"
          >${currentItem.key}</pre>
           with:
        </label>
        <input type="text"
               placeholder="Format: full.app.key:part-name" id="${PARAM.newPartName}"
               name="${PARAM.newPartName}"
               id="${PARAM.newPartName}"
               class="new-part-textfield"
               value=${displayReplacer?replace("^true$", "", "ir")}
        >

        <label for="${PARAM.postprocessors}" class="new-part-label inline-pre">
          Run postprocessors (comma-separated, eg. <pre>logconfig,throwerror</pre>)<br/>Available names: see src/main/resources/admin/tools/part-finder/editor/postprocessors/index.ts
        </label>
        <input type="text"
               placeholder="Postprocessor name(s)"
               name="${PARAM.postprocessors}"
               id="${PARAM.postprocessors}"
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
        <div id="all-info">
          <div class="new-part-label">
            <h3>Intermediate state!</h3><br/>
            <p>
              <span class="okay-check"
                    style="position: relative;display: inline-block !important; margin-right: 8px">✓</span>Wherever
              components have changed, a copy of the
              old component has been kept right below it in the same region (or: an updated component has been inserted
              before the old one).
            </p><br/>

            <p>Before proceeding, <strong>use the links and check the new components</strong>. The links open in a new
              tab.</p>
            <p>Navigating away (or closing this tab) will wipe this list and the opportunity to undo!</p>
          </div>

          <input type="hidden" name="${PARAM.newPartName}" id="${PARAM.newPartName}" value="${oldItemKey}"/>

          <input type="submit"
                 id="btn_execute_review"
                 value="🪠&nbsp;Step 2: cleanup"
                 class="new-part-button"
                 disabled
          />
          <br/><br/>

          <div id="usage">
            <h3>Usage:</h3><br/>
            <p>
            <ol>
              <li>Use the links in the table to review all the changes, and mark the with the radio buttons:</li>
              <ul>
                <li>Mark <span style="color: darkgreen">the changes you want to keep, with <strong>✓</strong></span>. This
                  will delete the unchanged original in the next step, or
                </li>
                <li>Mark <span style="color: darkred">the changes you want to reject, with ❌</span>. This will delete the
                  changed new component in the next step.
                </li>
              </ul>
              <li>The "Step 2: cleanup" button performs the batch-delete step according to your markings. For each
                changed ${currentItem.type} marked as accepted, delete the original so only the change remains.
                And vise versa, for each marked for undo, delete the new one so only the original remains. Any content
                items where any part of the process failed (see <span style="color: darkred"> error messages</span>) are
                left unchanged.</p><br/></li>
            </ol>
            <br/>
            <div id="unmarked-info"><strong><span id="unmarked-counter">0</span> currently unmarked ${currentItem.type}(s)</strong>
              will be
              left in this incomplete state: with both the updated ${currentItem.type} and the original copy!
            </div>
            </p>
            <br/>

            <p>
            <h3>Understanding the component paths</h3><br/>
            <ul>
              <li>The component paths in the <em>Display name</em> column in the table, are the ones that were
                targeted for change. After step 2, that's what the paths will be again.
              </li>
              <li>The right column however, says what the component paths are <em>now</em>, in this intermediate state.
                Those may be different paths, if any component copies were inserted.
              </li>
              <li>
                The paths on the right are the ones you should check now, before hitting "Step 2: cleanup".
              </li>
            </ul>
            </p>
            <br/>
          </div>
        </div>
      [/#if]

      [#if displayReplacer != '' || displaySummaryAndUndo]
    </form>

    <script>
      window._pf_ = {}
      var pf=window._pf_;

      pf.allIds=[#if allIds??    ]${allIds}
      [#else                     ][]
      [/#if];

      pf.selectAllElem = document.getElementById("_select_change_all_");
      pf.acceptAllElem = document.getElementById("_select_accept_all_");
      pf.undoAllElem = document.getElementById("_select_undo_all_");
      pf.targetPartNameElem = document.getElementById("${PARAM.newPartName}");

      [#--
        For the radio buttons, add event listeners for checking/unchecking events:
        These are used in the summary/undo mode to mark items for deletion or acceptance.
        The  arrays 'acceptIds' and 'undoIds' are used to keep track of which items are selected for deletion or acceptance.
      --]
      pf.reviewRadioRows = document.querySelectorAll("td .review-radio-row")
      pf.selectedIds=[];
      pf.acceptIds=[]
      pf.undoIds = []

      if (!pf.reviewRadioRows || pf.reviewRadioRows.length < 1) {
        document.getElementById("review-all") && (document.getElementById("review-all").style.visibility = "hidden")
        document.getElementById("all-info") && (document.getElementById("all-info").style.visibility = "hidden")
      }

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

      pf.updateReviewGui = function() {
        const markedCount = pf.acceptIds.length + pf.undoIds.length
        const unmarkedCount =  pf.reviewRadioRows.length - markedCount

        const unmarkedCounterElem = document.getElementById("unmarked-counter")
        if (unmarkedCounterElem) {
          unmarkedCounterElem.innerHTML = "" + unmarkedCount
        }

        const submitButtonElement = document.getElementById("btn_execute_review")
        if (submitButtonElement) {
          submitButtonElement.disabled = (unmarkedCount > 0)
        }

        const unmarkedInfoElem = document.getElementById("unmarked-info")
        if (unmarkedInfoElem) {
          unmarkedInfoElem.style.display = (unmarkedCount > 0 && markedCount > 0) ? "block" : "none"
        }
      }

      [#--  For each select-item checkbox, add an event listener for checking/unchecking events --]

      pf.allIds.forEach(id => {

        [#--
          For each select-item checkbox, add an event listener for checking/unchecking events:
        --]
        const checkbox = document.getElementById("${PREFIX.selectItem}" + id)
        if (checkbox) {
          checkbox.addEventListener("change", function() {

            [#-- Toggle the corresponding id in the selectedIds array --]
            const elem = document.getElementById("${PREFIX.selectItem}" + id);
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
              if (previousSelection.startsWith("${PREFIX.deleteOld}")) {
                pf.acceptIds = pf.acceptIds.filter(id => id !== previousSelection)
              } else if (previousSelection.startsWith("${PREFIX.deleteNew}")) {
                pf.undoIds = pf.undoIds.filter(id => id !== previousSelection)
              }
            }

            const newSelection = e.target.value
            if (newSelection) {
              pf.selectionInRow[rowName] = newSelection
              if (newSelection.startsWith("${PREFIX.deleteOld}")) {
                pf.acceptIds.push(newSelection)
              } else if (newSelection.startsWith("${PREFIX.deleteNew}")) {
                pf.undoIds.push(newSelection)
              }
            }

            pf.acceptAllElem.checked = (pf.acceptIds.length === pf.reviewRadioRows.length)
            pf.undoAllElem.checked = (pf.undoIds.length === pf.reviewRadioRows.length)

            pf.updateReviewGui();
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

            pf.updateReviewGui();
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

            pf.updateReviewGui();
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
            document.getElementById("${PREFIX.selectItem}" + id).checked = (pf.selectedIds.indexOf(id) !== -1);
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
      pf.updateReviewGui();
    </script>
  [/#if]
</turbo-frame>
