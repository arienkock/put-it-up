import { Board } from "./board.js";
const ITEM_TEST_COUNT = 100;

test("a new board has zero stickies", () => {
  const board = new Board("Test Board");
  expect(board.getItems()).toEqual({});
  expect(board.getBoardId()).toEqual("Test Board");
});

test("a board can hold items", () => {
  const board = new Board();
  for (let i = 0; i < ITEM_TEST_COUNT; i++) {
    const boundingRectangle = {
      left: 0 + i * 100,
      top: 0 + i * 100,
      right: 100 + i * 100,
      bottom: 100 + i * 100,
    };
    const item = new TestItem();
    const id = board.hold(item, boundingRectangle);
    expect(id).toBeTruthy();
    const subsetExpected = expect.objectContaining({ item, boundingRectangle });
    expect(Object.entries(board.getItems()).length).toBe(i + 1);
    expect(board.getItems()).toEqual(
      expect.objectContaining({
        [id]: subsetExpected,
      })
    );
    expect(board.getItem(id)).toEqual(subsetExpected);
  }
});

test("items can be moved", () => {
  const board = new Board();
  const firstBoundingRectangle = {
    left: 0,
    top: 0,
    right: 100,
    bottom: 100,
  };
  const item = new TestItem();
  const id = board.hold(item, firstBoundingRectangle);
  const newPosition = {
    left: 100,
    top: 100,
    right: 200,
    bottom: 200,
  };
  board.moveItem(id, newPosition);
  expect(board.getItem(id).boundingRectangle).toEqual(newPosition);
});

class TestItem {}
