import { Board } from "./board";
import { ReactUIAdapter } from "./react-ui";
import { ItemContainerComponent, BoardComponent } from "./components";

beforeEach(() => {
  document.body.innerHTML = '<div class="app"></div>';
});

test("render BoardComponent", () => {
  const board = new Board("uyhjkiuyg");
  const boardComponent = new BoardComponent(board);
  const ui = new ReactUIAdapter();
  ui.render(boardComponent, ".app");
  const boardIsOnPage = !!document.querySelector(".board");
  expect(boardIsOnPage).toBe(true);
});

test("render ItemContainerComponent", () => {
  const itemContainerComponent = new ItemContainerComponent();
  const ui = new ReactUIAdapter();
  ui.render(itemContainerComponent, ".app");
  const itemContainerIsOnPage = !!document.querySelector(".item-container");
  expect(itemContainerIsOnPage).toBe(true);
});

test("board with items contains same number of ItemContainers", () => {
  const board = new Board("uyhjkiuyg");
  const numberOfItems = Object.entries(board.getItems()).length;
  const numItemContainers = document.querySelectorAll(".item-container").length;
  expect(numItemContainers).toBe(numberOfItems);
});
