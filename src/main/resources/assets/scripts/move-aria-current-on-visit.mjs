class MoveAriaCurrentOnVisit extends HTMLElement {
  allLinkEls = [];

  connectedCallback() {
    this.allLinkEls = this.querySelectorAll("a[href]");
    document.addEventListener("turbo:visit", (event) => {
      if (event.detail.url) {
        this.updateAriaSelected(event.detail.url);
      }
    });
  }

  updateAriaSelected(newURL) {
    this.allLinkEls.forEach((el) => {
      if (el.href === newURL) {
        el.setAttribute("aria-current", "page");
      } else {
        el.removeAttribute("aria-current");
      }
    });
  }
}

if (!window.customElements.get("move-aria-current-on-visit")) {
  window.customElements.define("move-aria-current-on-visit", MoveAriaCurrentOnVisit);
}
