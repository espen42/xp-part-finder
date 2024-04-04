<!DOCTYPE html>
<html>
	<head>
		<meta charset="UTF-8">
		<title>Rodeo!</title>
	</head>
	<body>
    <h1>Component Rodeo!</h1>

    <h2>Parts</h2>

		[#list parts as part]
      <details>
        <summary>${part.key} (${part.total})</summary>
        <ul>
          [#list part.contents as cont]
            <li>${cont._path}</li>
          [/#list]
        </ul>
      </details>
    [/#list]

    <h2>Layouts</h2>

    [#list layouts as layout]
      <details>
        <summary>${layout.key} (${layout.total})</summary>
        <ul>
            [#list layout.contents as cont]
              <li>${cont._path}</li>
            [/#list]
        </ul>
      </details>
    [/#list]

    <h2>Pages</h2>
    [#list pages as page]
      <details>
        <summary>${page.key} (${page.total})</summary>
        <ul>
          [#list page.contents as cont]
            <li>${cont._path}</li>
          [/#list]
        </ul>
      </details>
    [/#list]
	</body>
</html>
