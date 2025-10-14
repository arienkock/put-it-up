import { Board } from "../scripts/board/board.js";
import { LocalDatastore } from "../scripts/board/local-datastore.js";

it("snapping", () => {
  const b = new Board(new LocalDatastore());
  let id = b.putSticky({ text: "hey", location: { x: 28, y: 28 } });
  expect(b.getStickyLocation(id)).toEqual({ x: 25, y: 25 });
  id = b.putSticky({ text: "hey", location: { x: 45, y: 45 } });
  expect(b.getStickyLocation(id)).toEqual({ x: 50, y: 50 });
});

it("expect throwing behavior", () => {
  const b = new Board(new LocalDatastore());
  expect(() => b.moveSticky(1, { x: 0, y: 0 })).toThrow("No such sticky id=1");
  expect(() => b.updateText(2, "test")).toThrow("No such sticky id=2");
});

it("getStickySafe returns undefined for non-existent sticky", () => {
  const b = new Board(new LocalDatastore());
  expect(b.getStickySafe(999)).toBeUndefined();
});

it("getStickySafe returns sticky for existing sticky", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putSticky({ text: "test", location: { x: 50, y: 50 } });
  const sticky = b.getStickySafe(id);
  expect(sticky).toBeDefined();
  expect(sticky.text).toBe("test");
});

it("deleteSticky removes sticky from board", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putSticky({ text: "delete me", location: { x: 50, y: 50 } });
  expect(b.getStickySafe(id)).toBeDefined();
  b.deleteSticky(id);
  expect(b.getStickySafe(id)).toBeUndefined();
});

it("updateColor changes sticky color", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putSticky({ text: "colorful", location: { x: 50, y: 50 } });
  b.updateColor(id, "red");
  expect(b.getSticky(id).color).toBe("red");
  b.updateColor(id, "blue");
  expect(b.getSticky(id).color).toBe("blue");
});

it("getState and setState preserve board state", () => {
  const b = new Board(new LocalDatastore());
  const id1 = b.putSticky({ text: "first", location: { x: 50, y: 50 } });
  const id2 = b.putSticky({ text: "second", location: { x: 100, y: 100 } });
  b.updateColor(id1, "red");
  
  const state = b.getState();
  expect(state.stickies[id1]).toBeDefined();
  expect(state.stickies[id2]).toBeDefined();
  expect(state.stickies[id1].text).toBe("first");
  expect(state.stickies[id2].text).toBe("second");
  
  const b2 = new Board(new LocalDatastore());
  b2.setState(state);
  expect(b2.getSticky(id1).text).toBe("first");
  expect(b2.getSticky(id2).text).toBe("second");
  expect(b2.getSticky(id1).color).toBe("red");
});

it("getBoardSize returns correct dimensions", () => {
  const b = new Board(new LocalDatastore());
  const size = b.getBoardSize();
  expect(size.width).toBe(2400);
  expect(size.height).toBe(1350);
});

it("getOrigin returns board origin", () => {
  const b = new Board(new LocalDatastore());
  const origin = b.getOrigin();
  expect(origin.x).toBe(0);
  expect(origin.y).toBe(0);
});

it("changeSize increases board dimensions when growing", () => {
  const b = new Board(new LocalDatastore());
  const originalSize = b.getBoardSize();
  
  b.changeSize(true, "right");
  expect(b.getBoardSize().width).toBe(originalSize.width + 100);
  
  b.changeSize(true, "bottom");
  expect(b.getBoardSize().height).toBe(originalSize.height + 100);
});

it("changeSize modifies origin when growing top/left", () => {
  const b = new Board(new LocalDatastore());
  const originalOrigin = b.getOrigin();
  
  b.changeSize(true, "left");
  expect(b.getOrigin().x).toBe(originalOrigin.x - 100);
  
  b.changeSize(true, "top");
  expect(b.getOrigin().y).toBe(originalOrigin.y - 100);
});

it("removes newlines from text", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putSticky({ text: "line1\nline2\nline3", location: { x: 50, y: 50 } });
  expect(b.getSticky(id).text).toBe("line1line2line3");
  
  b.updateText(id, "new\ntext\nhere");
  expect(b.getSticky(id).text).toBe("newtexthere");
});

it("handles empty text gracefully", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putSticky({ location: { x: 50, y: 50 } });
  expect(b.getSticky(id).text).toBe("");
  
  b.updateText(id, "");
  expect(b.getSticky(id).text).toBe("");
  
  b.updateText(id, null);
  expect(b.getSticky(id).text).toBe("");
});

it("snaps negative coordinates to origin", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putSticky({ text: "negative", location: { x: -100, y: -100 } });
  const location = b.getStickyLocation(id);
  expect(location.x).toBeGreaterThanOrEqual(0);
  expect(location.y).toBeGreaterThanOrEqual(0);
});

it("snaps coordinates exceeding board limits", () => {
  const b = new Board(new LocalDatastore());
  const size = b.getBoardSize();
  const id = b.putSticky({ text: "far", location: { x: 10000, y: 10000 } });
  const location = b.getStickyLocation(id);
  expect(location.x).toBeLessThanOrEqual(size.width);
  expect(location.y).toBeLessThanOrEqual(size.height);
});

describe("LocalDatastore", () => {
  it("notifies observers when sticky is created", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    store.addObserver(observer);
    
    const id = store.createSticky({ text: "new", location: { x: 50, y: 50 } });
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when sticky text is updated", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    const id = store.createSticky({ text: "initial", location: { x: 50, y: 50 } });
    observer.onStickyChange.mockClear();
    
    store.addObserver(observer);
    store.updateText(id, "updated");
    
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when sticky color is updated", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    const id = store.createSticky({ text: "colorful", location: { x: 50, y: 50 } });
    observer.onStickyChange.mockClear();
    
    store.addObserver(observer);
    store.updateColor(id, "red");
    
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when sticky location is updated", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    const id = store.createSticky({ text: "moving", location: { x: 50, y: 50 } });
    observer.onStickyChange.mockClear();
    
    store.addObserver(observer);
    store.setLocation(id, { x: 100, y: 100 });
    
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when sticky is deleted", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    const id = store.createSticky({ text: "delete me", location: { x: 50, y: 50 } });
    observer.onStickyChange.mockClear();
    
    store.addObserver(observer);
    store.deleteSticky(id);
    
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when board is updated", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    store.addObserver(observer);
    
    store.updateBoard({ origin: { x: 10, y: 10 }, limit: { x: 2500, y: 1450 } });
    
    expect(observer.onBoardChange).toHaveBeenCalledTimes(1);
  });

  it("notifies multiple observers", () => {
    const store = new LocalDatastore();
    const observer1 = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    const observer2 = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    
    store.addObserver(observer1);
    store.addObserver(observer2);
    
    const id = store.createSticky({ text: "notify all", location: { x: 50, y: 50 } });
    
    expect(observer1.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer2.onStickyChange).toHaveBeenCalledWith(id);
  });

  it("getBoard returns default values when board is undefined", () => {
    const store = new LocalDatastore();
    const defaultBoard = { origin: { x: 0, y: 0 }, limit: { x: 2400, y: 1350 } };
    const board = store.getBoard(defaultBoard);
    
    expect(board.origin).toEqual({ x: 0, y: 0 });
    expect(board.limit).toEqual({ x: 2400, y: 1350 });
  });

  it("getBoard returns a clone of board data", () => {
    const store = new LocalDatastore();
    const defaultBoard = { origin: { x: 0, y: 0 }, limit: { x: 2400, y: 1350 } };
    const board1 = store.getBoard(defaultBoard);
    const board2 = store.getBoard(defaultBoard);
    
    board1.origin.x = 100;
    expect(board2.origin.x).toBe(0);
  });

  it("getState returns a clone of state data", () => {
    const store = new LocalDatastore();
    const id = store.createSticky({ text: "test", location: { x: 50, y: 50 } });
    const state1 = store.getState();
    const state2 = store.getState();
    
    state1.stickies[id].text = "modified";
    expect(state2.stickies[id].text).toBe("test");
  });

  it("setState restores state and notifies observers", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    store.addObserver(observer);
    
    const state = {
      stickies: {
        1: { text: "restored", location: { x: 50, y: 50 } },
      },
      idGen: 1,
    };
    
    store.setState(state);
    
    expect(store.getSticky(1).text).toBe("restored");
    expect(observer.onBoardChange).toHaveBeenCalledTimes(1);
  });

  it("isReadyForUse always returns true", () => {
    const store = new LocalDatastore();
    expect(store.isReadyForUse()).toBe(true);
  });

  it("increments idGen when creating stickies", () => {
    const store = new LocalDatastore();
    const id1 = store.createSticky({ text: "first", location: { x: 50, y: 50 } });
    const id2 = store.createSticky({ text: "second", location: { x: 100, y: 100 } });
    const id3 = store.createSticky({ text: "third", location: { x: 150, y: 150 } });
    
    expect(id2).toBe(id1 + 1);
    expect(id3).toBe(id2 + 1);
  });
});
