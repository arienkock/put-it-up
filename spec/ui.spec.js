const { ReactUIAdapter } = require("../src/react-ui");

describe("ui", () => {
  it("wrapped components cause an in place update", () => {
    const ui = new ReactUIAdapter();
    const childSetup = jasmine.createSpy();
    const child = ui.c(function ({ h }) {
      this.setup = childSetup;
      this.render = () => h("div", null, "hello");
    });
    let parentRerender;
    const parent = ui.c(function ({ h, rerender }) {
      parentRerender = rerender;
      this.render = () => h("div", null, h(child));
    });
    ui.mount(ui.h(parent), document.querySelector(".app"));
    parentRerender();
    expect(childSetup).toHaveBeenCalledTimes(1);
  });
});
