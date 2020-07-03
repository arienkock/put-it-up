const { Board } = require("../src/board.js");

const ITEM_TEST_COUNT = 100;
class TestItem {}

describe("Board basics", () => {
  it("a new board has zero stickies and no name", () => {
    const board = new Board("Test Board");
    expect(board.items()).toEqual({});
    expect(board.boardId).toEqual("Test Board");
    expect(board.getName()).toEqual("");
  });

  it("an empty board has zero height and width", () => {
    const board = new Board("Test Board");
    expect(board.getSize()).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
  });

  it("a board has dimensions that span the items", () => {
    const board = new Board("Test Board");
    board.add({
      item: {},
      boundingRectangle: { left: -100, top: -200, right: -50, bottom: -150 },
    });
    board.add({
      item: {},
      boundingRectangle: { left: 150, top: 50, right: 200, bottom: 100 },
    });
    expect(board.getSize()).toEqual({
      left: -100,
      top: -200,
      right: 200,
      bottom: 100,
    });
  });

  it("a board can hold items", () => {
    const board = new Board();
    for (let i = 0; i < ITEM_TEST_COUNT; i++) {
      const boundingRectangle = {
        left: 0 + i * 100,
        top: 0 + i * 100,
        right: 100 + i * 100,
        bottom: 100 + i * 100,
      };
      const item = new TestItem();
      const id = board.add({ item, boundingRectangle });
      expect(id).toBe(i + 1);
      const subsetExpected = jasmine.objectContaining({
        item,
        boundingRectangle,
      });
      expect(Object.entries(board.items()).length).toBe(i + 1);
      expect(board.items()).toEqual(
        jasmine.objectContaining({
          [id]: subsetExpected,
        })
      );
      expect(board.get(id)).toEqual(subsetExpected);
    }
  });

  it("items can be removed", () => {
    const board = new Board();
    const item = new TestItem();
    const id = board.add(item, {
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
    });
    board.remove(id);
    expect(board.get(id)).toBe(undefined);
  });
  it("items can be moved", () => {
    const board = new Board();
    const firstBoundingRectangle = {
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
    };
    const item = new TestItem();
    const id = board.add(item, firstBoundingRectangle);
    const newPosition = {
      left: 100,
      top: 100,
      right: 200,
      bottom: 200,
    };
    board.move(id, newPosition);
    expect(board.get(id).boundingRectangle).toEqual(newPosition);
  });
});
