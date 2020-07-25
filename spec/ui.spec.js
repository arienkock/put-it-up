const { ReactUIAdapter } = require("../src/react-ui");

describe("ui", () => {
  fit("wrapped components cause an in place update", () => {
    const ui = new ReactUIAdapter();
    const childSetup = jasmine.createSpy();
    const child = ui.c(({ h }) => ({
      setup: childSetup,
      render: () => h("div", null, "hello"),
    }));
    let parentRerender;
    const parent = ui.c(({ h, rerender }) => {
      parentRerender = rerender;
      return {
        render: () => h("div", null, h(child)),
      };
    });
    ui.mount(parent, ".app");
    parentRerender();
    expect(childSetup).toHaveBeenCalledTimes(1);
  });
});
