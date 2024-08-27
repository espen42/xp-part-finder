[#-- @ftlvariable name="displayName" type="String" --]
[#-- @ftlvariable name="currentAppKey" type="String" --]
[#-- @ftlvariable name="filters" type="java.util.ArrayList" --]

<header class="header">
  <h1 data-turbo-permanent="true">${displayName}</h1>

  <div class="header--toolbar">
    <div class="header--nav-label" id="header-nav-label">Pick application</div>
    <nav class="header--filters" aria-labelledby="header-nav-label">
      [#list filters as filter]
        <a
          class="pill"
          href="${filter.url}"
          [#if filter.text == currentAppKey]aria-current="true"[/#if]>

          ${filter.text}
        </a>
      [/#list]
    </nav>
  </div>
</header>
