import { Board } from "../scripts/board/board.js";
import { LocalDatastore } from "../scripts/local-datastore.js";

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
