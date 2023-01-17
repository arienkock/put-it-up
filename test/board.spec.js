import { Board } from "../scripts/board/board.js";
import { LocalDatastore } from "../scripts/board/local-datastore.js";

describe("Board", () => {
  it("snapping", () => {
    const b = new Board(new LocalDatastore());
    let id = b.putSticky({ text: "hey", location: { x: 28, y: 28 } });
    expect(b.getStickyLocation(id)).toEqual({ x: 25, y: 25 });
    id = b.putSticky({ text: "hey", location: { x: 45, y: 45 } });
    expect(b.getStickyLocation(id)).toEqual({ x: 50, y: 50 });
  });

  it("expect throwing behavior", () => {
    const b = new Board(new LocalDatastore());
    expect(() => b.moveSticky(1, { x: 0, y: 0 })).toThrowError("No such sticky id=1");
    expect(() => b.updateText(2, "test")).toThrowError("No such sticky id=2");
  });

  it("removes newlines", () => {
    const b = new Board(new LocalDatastore());
    let id = b.putSticky({ text: "hey\n there", location: { x: 0, y: 0 } });
    expect(b.getSticky(id)).toEqual(jasmine.objectContaining({ text: "hey there" }));
    b.updateText(id, "hey there\n joe")
    expect(b.getSticky(id)).toEqual(jasmine.objectContaining({ text: "hey there joe" }));
  })

  it("sets default text", () => {
    const b = new Board(new LocalDatastore());
    let id = b.putSticky({ location: { x: 0, y: 0 } });
    expect(b.getSticky(id)).toEqual({
      "location": {
        "x": 0,
        "y": 0,
      },
      "text": "",
    });
    b.updateText(id, undefined)
    expect(b.getSticky(id)).toEqual({
      "location": {
        "x": 0,
        "y": 0,
      },
      "text": "",
    });
  })

  it("resizes", () => {
    const b = new Board(new LocalDatastore());
    [
      ["top", {
        "height": 1450,
        "width": 2400
      }],
      ["bottom", {
        "height": 1550,
        "width": 2400,
      }],
      ["left", {
        "height": 1550,
        "width": 2500
      }],
      ["right", {
        "height": 1550,
        "width": 2600
      }]
    ].forEach(([side, size]) => {
      b.changeSize(true, side)
      expect(b.getBoardSize()).toEqual(size)
    })
    let id1 = b.putSticky({ location: { x: -1000, y: -1000 } });
    let id2 = b.putSticky({ location: { x: 3000, y: -1000 } });
    let id3 = b.putSticky({ location: { x: 3000, y: 2000 } });
    let id4 = b.putSticky({ location: { x: -1000, y: 2000 } });
    expect(b.getStickyLocation(id1)).toEqual({ x: -100, y: -100 });
    expect(b.getStickyLocation(id2)).toEqual({ x: 2400, y: -100 });
    expect(b.getStickyLocation(id3)).toEqual({ x: 2400, y: 1350 });
    expect(b.getStickyLocation(id4)).toEqual({ x: -100, y: 1350 });
    [
      ["top", {
        "height": 1450,
        "width": 2600
      }],
      ["bottom", {
        "height": 1350,
        "width": 2600,
      }],
      ["left", {
        "height": 1350,
        "width": 2500
      }],
      ["right", {
        "height": 1350,
        "width": 2400
      }]
    ].forEach(([side, size]) => {
      b.changeSize(false, side)
      expect(b.getBoardSize()).toEqual(size)
    })
    expect(b.getStickyLocation(id1)).toEqual({ x: 0, y: 0 });
    expect(b.getStickyLocation(id2)).toEqual({ x: 2300, y: 0 });
    expect(b.getStickyLocation(id3)).toEqual({ x: 2300, y: 1250 });
    expect(b.getStickyLocation(id4)).toEqual({ x: 0, y: 1250 });
  })
})
