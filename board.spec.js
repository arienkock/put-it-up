import { Board } from "./board";

test("snapping", () => {
  const b = new Board();
  b.putSticky({ text: "hey" }, { x: 28, y: 28 });
  expect(b.getStickyLocation(1)).toEqual({ x: 25, y: 25 });
  b.putSticky({ text: "hey" }, { x: 45, y: 45 });
  expect(b.getStickyLocation(2)).toEqual({ x: 50, y: 50 });
});

test("expect throwing behavior", () => {
    const b = new Board();
    expect(() => b.moveSticky(1, {x: 0, y: 0})).toThrow("No such sticky id=1")
    expect(() => b.updateText(2, "sdsda")).toThrow("No such sticky id=2")
})
