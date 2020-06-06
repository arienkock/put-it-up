test("a sticky has text", () => {
  const sticky = new Sticky();
  expect(sticky.text()).toBe("");
  sticky.text("Test");
  expect(sticky.text()).toBe("Test");
});

class Sticky {
  constructor() {
    this._text = "";
  }
  text(t) {
    if (arguments.length === 0) {
      return this._text;
    } else {
      this._text = t;
    }
  }
}
