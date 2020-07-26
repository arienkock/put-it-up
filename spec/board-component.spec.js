const { Board } = require("../src/board.js");
const { ReactUIAdapter } = require("../src/react-ui.js");
const {
  itemContainerComponent,
  boardComponent,
} = require("../src/board-component.js");

beforeEach(() => {
  document.body.innerHTML = '<div class="app"></div>';
});

describe("UI components and adapter", () => {
  it("render boardComponent", () => {
    const board = new Board("uyhjkiuyg");
    const ui = new ReactUIAdapter();
    const boardC = ui.c(boardComponent);
    const rootComponent = ui.c(({ h }) => ({
      render() {
        return h(boardC, { board });
      },
    }));
    ui.mount(rootComponent, ".app");
    const boardIsOnPage = !!document.querySelector(".board");
    expect(boardIsOnPage).toBe(true);
  });

  it("render itemContainerComponent", () => {
    const ui = new ReactUIAdapter();
    ui.mount(ui.c(itemContainerComponent), ".app");
    const itemContainerIsOnPage = !!document.querySelector(".item-container");
    expect(itemContainerIsOnPage).toBe(true);
  });

  it("board with items contains same number of ItemContainers", () => {
    const ui = new ReactUIAdapter();
    const board = new Board("uyhjkiuyg");
    const boardC = ui.c(boardComponent);
    const rootComponent = ui.c(({ h }) => ({
      render() {
        return h(boardC, { board }, []);
      },
    }));
    ui.mount(rootComponent, ".app");
    function check() {
      const numberOfItems = Object.entries(board.items()).length;
      const numItemContainers = document.querySelectorAll(".item-container")
        .length;
      expect(numItemContainers).toBe(numberOfItems);
    }
    check();
    board.add({});
    check();
    board.add({});
    check();
  });

  it("all item containers have a unique key prop", () => {
    const board = new Board("uyhjkiuyg");
    board.add({});
    board.add({});
    const h = (tag, props, children) => [tag, props, children];
    const comp = boardComponent({ h, c: () => null, rerender: () => null });
    function checkChildrenForKeys([tag, props, children]) {
      if (children) {
        if (children instanceof Array) {
          const keys = children.map(([_tag, { key }, _children]) => key);
          expect(new Set(keys).size === keys.length).toBe(true);
          children.forEach(checkChildrenForKeys);
        } else {
          checkChildrenForKeys(children);
        }
      }
    }
    checkChildrenForKeys(comp.render({ board }));
  });
});
