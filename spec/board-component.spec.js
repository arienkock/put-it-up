const { Board } = require("../src/board.js");
const { ReactUIAdapter } = require("../src/react-ui.js");
const {
  itemContainerComponent,
  createBoardComponent,
} = require("../src/components.js");

beforeEach(() => {
  document.body.innerHTML = '<div class="app"></div>';
});

describe("UI components and adapter", () => {
  it("render boardComponent", () => {
    const board = new Board("uyhjkiuyg");
    const boardComponent = createBoardComponent(board);
    const ui = new ReactUIAdapter();
    ui.render(boardComponent, ".app");
    const boardIsOnPage = !!document.querySelector(".board");
    expect(boardIsOnPage).toBe(true);
  });

  it("render itemContainerComponent", () => {
    const ui = new ReactUIAdapter();
    ui.render(itemContainerComponent, ".app");
    const itemContainerIsOnPage = !!document.querySelector(".item-container");
    expect(itemContainerIsOnPage).toBe(true);
  });

  it("board with items contains same number of ItemContainers", () => {
    const board = new Board("uyhjkiuyg");
    const boardComponent = createBoardComponent(board);
    const ui = new ReactUIAdapter();
    ui.render(boardComponent, ".app");
    function check() {
      const numberOfItems = Object.entries(board.getItems()).length;
      const numItemContainers = document.querySelectorAll(".item-container")
        .length;
      expect(numItemContainers).toBe(numberOfItems);
    }
    check();
    board.add({}, { left: 0, top: 0, right: 100, bottom: 100 });
    check();
    board.add({}, { left: 0, top: 0, right: 100, bottom: 100 });
    check();
  });

  it("all item containers have a unique key prop", () => {
    const board = new Board("uyhjkiuyg");
    const boardComponent = createBoardComponent(board);
    board.add({}, { left: 0, top: 0, right: 100, bottom: 100 });
    board.add({}, { left: 0, top: 0, right: 100, bottom: 100 });
    const h = (tag, props, children) => [tag, props, children];
    const comp = boardComponent(h, () => null);
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
    checkChildrenForKeys(comp.render());
  });
});
