[#-- @ftlvariable name="currentItem" type="Object" --]
[#-- @ftlvariable name="currentItem.key" type="String" --]
[#-- @ftlvariable name="currentItem.contents" type="java.util.ArrayList" --]
<turbo-frame id="content-view">

  <form action="part-finder">
    <table class="table">
      <caption class="label-big">${currentItem.type}: ${currentItem.key}</caption>

      <tr>
        <th scope="col">Display name</th>
        <th scope="col">Path</th>
        [#if currentItem.type == "PART"]
          <th scope="col" style="position:relative;">
            Replace part
            <br/>
              <input type="checkbox"
                     id="_select_change_all_"
                     name="_select_change_all_"
                     value="change-all"
                     style="cursor:pointer;height:15px;width:15px;position:absolute;bottom:12px;"
              />
              <label for="_select_change_all_"
                     style="cursor:pointer;font-weight:normal;margin-left:22px"
              >
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
                       style="cursor:pointer;height:15px;width:15px"
                />
                <label for="select-change--${content.id}"
                       style="cursor:pointer;font-weight:normal;"
                >
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </label>
            </td>
          [/#if]
        </tr>
      [/#list]
    </table>


    [#if currentItem.type == "PART"]
      <br /><br />
      <label for="new_part_ref">Replace part '${currentItem.key}' with:</label>
      <br/>
      <input type="text"
             placeholder="Format: full.app.key:part-name" id="new_part_ref"
             name="new_part_ref" id="new_part_ref"
             style="padding:10px 15px; width:400px;max-width:100%"
      >
      <br />
      <br/>
      <input type="button"
             id="btn_change_part"
             value="⚠ Change part name ⚠"
             style="padding:7px 20px;background-color:#0b3c49;color:white;font-weight:bold;border:0;cursor:not-allowed"
             title="This will change content data and may break page display. DON'T, unless you know what you're doing."
      />
    </form>

    <script>
      window._pf_ = {}
      window._pf_.submitBtnElem = document.getElementById("btn_change_part");
      window._pf_.selectAllElem = document.getElementById("_select_change_all_");
      window._pf_.targetPartNameElem = document.getElementById("new_part_ref");

      window._pf_.allIdsList="[#list currentItem.contents as content]${content.id},[/#list]";
      window._pf_.allIds=window._pf_.allIdsList.substring(0, window._pf_.allIdsList.length - 1).split(",").filter(id => !!id)
      window._pf_.selectedIds=[];

      // Check or uncheck a single select-checkbox
      window._pf_.allIds.forEach(id => {
        document.getElementById("select-change--" + id).addEventListener("change", function() {
          const elem = document.getElementById("select-change--" + id);
          const isSelected = window._pf_.selectedIds.indexOf(id) !== -1
          if (elem.checked && !isSelected) {
            window._pf_.selectedIds.push(id);
          } else if (!elem.checked && isSelected) {
            window._pf_.selectedIds = window._pf_.selectedIds.filter(_id => _id !== id )
          }

          window._pf_.selectAllElem.checked =  (window._pf_.selectedIds.length === window._pf_.allIds.length)
        })
      })

      // Check or uncheck the select-all checkbox
      window._pf_.selectAllElem.addEventListener("change", function() {
        if (window._pf_.selectAllElem.checked) {
          window._pf_.selectedIds = window._pf_.allIds.map(id => id)
        } else {
          window._pf_.selectedIds = []
        }

        window._pf_.allIds.forEach(id => {
          document.getElementById("select-change--" + id).checked = (window._pf_.selectedIds.indexOf(id) !== -1);
        })
      })

      window._pf_.submitBtnElem.addEventListener("click", function() {
        const targetName = window._pf_.targetPartNameElem.value
        alert("Change to " + targetName + " in: " + JSON.stringify(window._pf_.selectedIds, null, 2))
      });

    </script>
  [/#if]
</turbo-frame>
