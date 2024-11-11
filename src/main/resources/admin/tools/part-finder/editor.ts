export const createEditorFunc = () => {
  const editor = (contentItem) => {
    log.info("in: " + JSON.stringify(contentItem, null, 2));
    contentItem.displayName = `${new Date().toISOString()}`;

    contentItem.page = {
      type: "page",
      path: "/",
      descriptor: "no.posten.website:hpage",
      config: {
        chatbot: true,
      },
      regions: {
        main: {
          components: [
            {
              path: "/main/0",
              type: "part",
              descriptor: "no.posten.reactcommon:accordion",
              config: {
                accordion: [
                  {
                    text: "T",
                    content: "<p>Cont</p>\n",
                    isExpanded: false,
                  },
                  {
                    text: "T2",
                    content: "<p>Con2</p>\n",
                    isExpanded: false,
                  },
                ],
              },
            },
          ],
          name: "main",
        },
      },
    };

    log.info("out: " + JSON.stringify(contentItem, null, 2));
    return contentItem;
  };

  return editor;
};
