[#-- @ftlvariable name="currentItem" type="Object" --]
[#-- @ftlvariable name="currentItem.key" type="String" --]
[#-- @ftlvariable name="currentItem.contents" type="java.util.ArrayList" --]
<turbo-frame id="content-view">
  <table class="table">
    <caption class="label-big">${currentItem.key}</caption>

    <tr>
      <th scope="col">Display name</th>
      <th scope="col">Path</th>
    </tr>

    [#list currentItem.contents as content]
      <tr>
        <td>${content.displayName}</td>
        <td><a href="${content.url}" target="_top">${content.path}</a></td>
      </tr>
    [/#list]
  </table>
</turbo-frame>
