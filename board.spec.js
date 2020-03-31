import { Board, ObservableBoard } from "./board";

test("snapping", () => {
  const b = new Board();
  let id = b.putSticky({ text: "hey", location: { x: 28, y: 28 } });
  expect(b.getStickyLocation(id)).toEqual({ x: 25, y: 25 });
  id = b.putSticky({ text: "hey", location: { x: 45, y: 45 }});
  expect(b.getStickyLocation(id)).toEqual({ x: 50, y: 50 });
});

test("expect throwing behavior", () => {
    const b = new Board();
    expect(() => b.moveSticky(1, {x: 0, y: 0})).toThrow("No such sticky id=1")
    expect(() => b.updateText(2, "sdsda")).toThrow("No such sticky id=2")
})

test("observable board proxies calls", () => {
    const b = new Board()
    const ob = new ObservableBoard(b)
    ob.getState()
})