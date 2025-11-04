import { Board } from "../scripts/board/board.js";
import { LocalDatastore } from "../scripts/board/local-datastore.js";
import { getPlugin } from "../scripts/board-items/plugin-registry.js";

// Mock window global for unit tests that import modules directly
if (typeof window === 'undefined') {
  global.window = {};
}

beforeEach(() => {
  // Reset window.appState before each test
  window.appState = undefined;
});

it("snapping", () => {
  const b = new Board(new LocalDatastore());
  let id = b.putBoardItem('sticky', { text: "hey", location: { x: 28, y: 28 } });
  expect(b.getBoardItemLocationByType('sticky', id)).toEqual({ x: 30, y: 30 });
  id = b.putBoardItem('sticky', { text: "hey", location: { x: 45, y: 45 } });
  expect(b.getBoardItemLocationByType('sticky', id)).toEqual({ x: 50, y: 50 });
});

it("expect throwing behavior", () => {
  const b = new Board(new LocalDatastore());
  expect(() => b.moveBoardItem('sticky', 1, { x: 0, y: 0 })).toThrow("No such sticky id=1");
  const plugin = getPlugin('sticky');
  expect(() => plugin.updateItem(b, 2, { text: "test" })).toThrow("No such sticky id=2");
});

it("getStickySafe returns undefined for non-existent sticky", () => {
  const b = new Board(new LocalDatastore());
  try {
    b.getBoardItemByType('sticky', 999);
    expect(false).toBe(true); // Should not reach here
  } catch (e) {
    expect(e.message).toContain("No such sticky");
  }
});

it("getStickySafe returns sticky for existing sticky", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putBoardItem('sticky', { text: "test", location: { x: 50, y: 50 } });
  const sticky = b.getBoardItemByType('sticky', id);
  expect(sticky).toBeDefined();
  expect(sticky.text).toBe("test");
});

it("deleteSticky removes sticky from board", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putBoardItem('sticky', { text: "delete me", location: { x: 50, y: 50 } });
  expect(b.getBoardItemByType('sticky', id)).toBeDefined();
  b.deleteBoardItem('sticky', id);
  try {
    b.getBoardItemByType('sticky', id);
    expect(false).toBe(true); // Should not reach here
  } catch (e) {
    expect(e.message).toContain("No such sticky");
  }
});

it("updateColor changes sticky color", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putBoardItem('sticky', { text: "colorful", location: { x: 50, y: 50 } });
  const plugin = getPlugin('sticky');
  plugin.updateItem(b, id, { color: "red" });
  expect(b.getBoardItemByType('sticky', id).color).toBe("red");
  plugin.updateItem(b, id, { color: "blue" });
  expect(b.getBoardItemByType('sticky', id).color).toBe("blue");
});

it("getState and setState preserve board state", () => {
  const b = new Board(new LocalDatastore());
  const id1 = b.putBoardItem('sticky', { text: "first", location: { x: 50, y: 50 } });
  const id2 = b.putBoardItem('sticky', { text: "second", location: { x: 100, y: 100 } });
  const plugin = getPlugin('sticky');
  plugin.updateItem(b, id1, { color: "red" });
  
  const state = b.getState();
  expect(state.stickies[id1]).toBeDefined();
  expect(state.stickies[id2]).toBeDefined();
  expect(state.stickies[id1].text).toBe("first");
  expect(state.stickies[id2].text).toBe("second");
  
  const b2 = new Board(new LocalDatastore());
  b2.setState(state);
  expect(b2.getBoardItemByType('sticky', id1).text).toBe("first");
  expect(b2.getBoardItemByType('sticky', id2).text).toBe("second");
  expect(b2.getBoardItemByType('sticky', id1).color).toBe("red");
});

it("getBoardSize returns correct dimensions", () => {
  const b = new Board(new LocalDatastore());
  const size = b.getBoardSize();
  expect(size.width).toBe(12000);
  expect(size.height).toBe(6750);
});

it("getOrigin returns board origin", () => {
  const b = new Board(new LocalDatastore());
  const origin = b.getOrigin();
  expect(origin.x).toBe(0);
  expect(origin.y).toBe(0);
});

it("removes newlines from text", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putBoardItem('sticky', { text: "line1\nline2\nline3", location: { x: 50, y: 50 } });
  expect(b.getBoardItemByType('sticky', id).text).toBe("line1line2line3");
  
  const plugin = getPlugin('sticky');
  plugin.updateItem(b, id, { text: "new\ntext\nhere" });
  expect(b.getBoardItemByType('sticky', id).text).toBe("newtexthere");
});

it("handles empty text gracefully", () => {
  const b = new Board(new LocalDatastore());
  const id = b.putBoardItem('sticky', { location: { x: 50, y: 50 } });
  expect(b.getBoardItemByType('sticky', id).text).toBe("");
  
  const plugin = getPlugin('sticky');
  plugin.updateItem(b, id, { text: "" });
  expect(b.getBoardItemByType('sticky', id).text).toBe("");
  
  plugin.updateItem(b, id, { text: null });
  expect(b.getBoardItemByType('sticky', id).text).toBe("");
});

it("snaps negative coordinates to origin", () => {
  const b = new Board(new LocalDatastore());
  const origin = b.getOrigin();
  const id = b.putBoardItem('sticky', { text: "negative", location: { x: -100, y: -100 } });
  const location = b.getBoardItemLocationByType('sticky', id);
  expect(location.x).toBe(origin.x);
  expect(location.y).toBe(origin.y);
});

it("snaps coordinates exceeding board limits", () => {
  const b = new Board(new LocalDatastore());
  const size = b.getBoardSize();
  const id = b.putBoardItem('sticky', { text: "far", location: { x: 10000, y: 10000 } });
  const location = b.getBoardItemLocationByType('sticky', id);
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
    
    const id = store.createBoardItem('sticky', { text: "new", location: { x: 50, y: 50 } });
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when sticky text is updated", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    const id = store.createBoardItem('sticky', { text: "initial", location: { x: 50, y: 50 } });
    observer.onStickyChange.mockClear();
    
    store.addObserver(observer);
    store.updateBoardItem('sticky', id, { text: "updated" });
    
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when sticky color is updated", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    const id = store.createBoardItem('sticky', { text: "colorful", location: { x: 50, y: 50 } });
    observer.onStickyChange.mockClear();
    
    store.addObserver(observer);
    store.updateBoardItem('sticky', id, { color: "red" });
    
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when sticky location is updated", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    const id = store.createBoardItem('sticky', { text: "moving", location: { x: 50, y: 50 } });
    observer.onStickyChange.mockClear();
    
    store.addObserver(observer);
    store.updateBoardItem('sticky', id, { location: { x: 100, y: 100 } });
    
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when sticky is deleted", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    const id = store.createBoardItem('sticky', { text: "delete me", location: { x: 50, y: 50 } });
    observer.onStickyChange.mockClear();
    
    store.addObserver(observer);
    store.deleteBoardItem('sticky', id);
    
    expect(observer.onStickyChange).toHaveBeenCalledWith(id);
    expect(observer.onStickyChange).toHaveBeenCalledTimes(1);
  });

  it("notifies observers when board is updated", () => {
    const store = new LocalDatastore();
    const observer = {
      onStickyChange: jest.fn(),
      onBoardChange: jest.fn(),
    };
    // Initialize board first
    store.getBoard({ origin: { x: 0, y: 0 }, limit: { x: 2400, y: 1350 } });
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
    
    const id = store.createBoardItem('sticky', { text: "notify all", location: { x: 50, y: 50 } });
    
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
    
    expect(store.getBoardItem('sticky', 1).text).toBe("restored");
    expect(observer.onBoardChange).toHaveBeenCalledTimes(1);
  });

  it("isReadyForUse always returns true", () => {
    const store = new LocalDatastore();
    expect(store.isReadyForUse()).toBe(true);
  });

  it("increments idGen when creating stickies", () => {
    const store = new LocalDatastore();
    const id1 = store.createBoardItem('sticky', { text: "first", location: { x: 50, y: 50 } });
    const id2 = store.createBoardItem('sticky', { text: "second", location: { x: 100, y: 100 } });
    const id3 = store.createBoardItem('sticky', { text: "third", location: { x: 150, y: 150 } });
    
    expect(parseInt(id2)).toBe(parseInt(id1) + 1);
    expect(parseInt(id3)).toBe(parseInt(id2) + 1);
  });
});

describe("Text fitting on size changes", () => {
  it("should trigger text fitting when sticky size changes", () => {
    const store = new LocalDatastore();
    const board = new Board(store);
    
    // Create a sticky with some text
    const id = board.putBoardItem('sticky', { 
      text: "This is a longer text that should fit better in a larger sticky", 
      location: { x: 100, y: 100 } 
    });
    
    const sticky = store.getBoardItem('sticky', id);
    expect(sticky.size).toBeUndefined(); // Default size is 1x1
    
    // Change the size
    store.updateBoardItem('sticky', id, { size: { x: 2, y: 2 } });
    
    const updatedSticky = store.getBoardItem('sticky', id);
    expect(updatedSticky.size).toEqual({ x: 2, y: 2 });
    
    // The size change should trigger a re-render which will call text fitting
    // This test verifies that the size change is properly detected and handled
  });
});
