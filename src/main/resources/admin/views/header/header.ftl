[#-- @ftlvariable name="displayName" type="String" --]
[#-- @ftlvariable name="currentAppKey" type="String" --]
[#-- @ftlvariable name="repoParam" type="String" --]
[#-- @ftlvariable name="filters" type="java.util.ArrayList" --]

<header class="header">
  <h1 data-turbo-permanent="true">${displayName}</h1>

  [#if filters?size > 1]
    <div class="header--toolbar">
      <div class="header--nav-label" id="header-nav-label">Select application</div>
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

      [#if repoParam??]
        <div class="repofilter">
          <span class="icon">🔎</span>
          Project (repo) filter is active: <span class="repo-qualifier">com.enonic.cms.</span><strong>${repoParam}</strong><br />
          Edit/remove the URI parameter: <pre>...&repo=${repoParam}</pre>
        </div>
      [/#if]
    </div>
  [/#if]
</header>
