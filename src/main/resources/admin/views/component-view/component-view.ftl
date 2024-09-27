[#-- @ftlvariable name="currentItem" type="Object" --]
[#-- @ftlvariable name="currentItem.key" type="String" --]
[#-- @ftlvariable name="currentItem.contents" type="java.util.ArrayList" --]
<turbo-frame id="content-view">

  <form action="part-finder">
    <table class="table">
      <caption class="label-big">${currentItem.key}</caption>

      <tr>
        <th scope="col">Display name</th>
        <th scope="col">Path</th>
        <th scope="col" style="position:relative;">
          Select to change part
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
      </tr>

      [#list currentItem.contents as content]
        <tr>
          <td>${content.displayName}</td>
          <td><a href="${content.url}" target="_top">${content.path}</a></td>
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
        </tr>
      [/#list]
    </table>

    <br /><br /><label for="new_part_ref">Change part from ${currentItem.key} to:</label><br/>
    <input type="text"
           placeholder="Format: full.app.key:part-name" id="new_part_ref"
           name="new_part_ref" id="new_part_ref"
           style="padding:10px 15px; width:400px;max-width:100%"
    >

    <br /><br/><input type="button"
                      id="btn_change_part"
                      value="⚠ Change part name ⚠"
                      style="padding:7px 20px;background-color:#0b3c49;color:white;font-weight:bold;border:0;cursor:not-allowed"
                      title="This will change content data and may break page display. DON'T, unless you know what you're doing."
    />
  </form>

  <script>
    const submitBtnElem = document.getElementById("btn_change_part");
    const selectAllElem = document.getElementById("_select_change_all_");

    const allIdsList="[#list currentItem.contents as content]${content.id},[/#list]";
    const allIds=allIdsList.substring(0, allIdsList.length - 1).split(",")
    let selectedIds=[];

    // Check or uncheck a single select-checkbox
    allIds.forEach(id => {
      document.getElementById("select-change--" + id).addEventListener("change", function() {
        const elem = document.getElementById("select-change--" + id);
        const isSelected = selectedIds.indexOf(id) !== -1
        if (elem.checked && !isSelected) {
          selectedIds.push(id);
        } else if (!elem.checked && isSelected) {
          selectedIds = selectedIds.filter(_id => _id !== id )
        }

        selectAllElem.checked =  (selectedIds.length === allIds.length)
      })
    })

    // Check or uncheck the select-all checkbox
    selectAllElem.addEventListener("change", function() {
      if (selectAllElem.checked) {
        selectedIds = allIds.map(id => id)
      } else {
        selectedIds = []
      }

      allIds.forEach(id => {
        document.getElementById("select-change--" + id).checked = selectedIds.indexOf(id) !== -1;
      })
    })

    submitBtnElem.addEventListener("click", function() {
      const targetName = document.getElementById("new_part_ref").value
      alert(targetName)
    });

  </script>
</turbo-frame>
