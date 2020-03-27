import { BoardMemory } from "./board-memory";
import { Board } from "./board";
import { EventLog } from "./event-log";

test("processEvent works", () => {
  const b = new Board();
  const bm = new BoardMemory(b, null);
  b.putSticky({ text: "hello" });
  bm.processEvent({
    method: "moveSticky",
    args: ["1", { x: 100, y: 100 }]
  });
  expect(b.getStickyLocation(1)).toEqual({ x: 100, y: 100 });
});

test("rewind to right place", () => {
  const b = new Board();
  const el = new EventLog();
  const bm = new BoardMemory(b, el);
  jest.spyOn(bm, "rewindTo");
  jest.spyOn(el, "receiveEvent");
  bm.receiveEvent({
    sequence: 1,
    timestamp: 1,
    method: "putSticky",
    args: [{ text: "hello" }]
  });
  expect(bm.rewindTo).toHaveBeenLastCalledWith(0);
  bm.receiveEvent({
    sequence: 1,
    timestamp: 2,
    method: "moveSticky",
    args: ["1", { x: 100, y: 100 }]
  });
  expect(el.receiveEvent).toHaveBeenCalled();
  expect(bm.rewindTo).toHaveBeenLastCalledWith(1);
  bm.receiveEvent({
    sequence: 2,
    timestamp: 2,
    method: "moveSticky",
    args: ["1", { x: 200, y: 200 }]
  });
  expect(bm.rewindTo).toHaveBeenLastCalledWith(2);
  expect(b.getStickyLocation(1)).toEqual({ x: 200, y: 200 });
});

test("rewind to 0", () => {
  const b = new Board();
  const el = new EventLog();
  const bm = new BoardMemory(b, el);
  jest.spyOn(bm, "rewindTo");
  jest.spyOn(el, "receiveEvent");
  bm.receiveEvent({
    sequence: 1,
    timestamp: 1,
    method: "putSticky",
    args: [{ text: "hello" }]
  });
  bm.receiveEvent({
    sequence: 1,
    timestamp: 2,
    method: "moveSticky",
    args: ["1", { x: 100, y: 100 }]
  });
  bm.rewindTo(0);
  expect(b.getState()).toEqual({ stickies: {}, idGen: 0 });
});

test("rewind to fix out of order", () => {
  const b = new Board();
  const el = new EventLog();
  const bm = new BoardMemory(b, el);
  jest.spyOn(bm, "rewindTo");
  jest.spyOn(el, "receiveEvent");
  bm.receiveEvent({
    sequence: 1,
    timestamp: 1,
    method: "putSticky",
    args: [{ text: "hello" }]
  });
  expect(bm.rewindTo).toHaveBeenLastCalledWith(0);
  expect(b.getSticky(1).text).toBe("hello");
  for (let i = 2; i < 10; i++) {
    bm.receiveEvent({
      sequence: i,
      timestamp: i,
      method: "updateText",
      args: ["1", "hello3"]
    });
  }
  expect(b.getSticky(1).text).toBe("hello3");
  bm.receiveEvent({
    sequence: 4,
    timestamp: 5,
    method: "updateText",
    args: ["1", "hello2"]
  });
  expect(bm.rewindTo).toHaveBeenLastCalledWith(4);
  expect(b.getSticky(1).text).toBe("hello3");
  expect(el.data.length).toBe(10);
});
