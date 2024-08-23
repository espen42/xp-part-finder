class MoveAriaCurrentOnClick extends HTMLElement {
  allLinkEls = [];

  connectedCallback() {
    this.allLinkEls = this.querySelectorAll("a[href]");

    this.allLinkEls.forEach((el) => {
      el.addEventListener("click", (event) => {
        this.updateAriaSelected(event.currentTarget);
      });
    });
  }

  updateAriaSelected(newSelected) {
    this.allLinkEls.forEach((el) => el.removeAttribute("aria-current"));
    newSelected.setAttribute("aria-current", "page");
  }
}

if (!window.customElements.get("move-aria-current-on-click")) {
  window.customElements.define("move-aria-current-on-click", MoveAriaCurrentOnClick);
}
