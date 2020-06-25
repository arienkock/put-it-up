const { Sticky, Colors } = require("../src/sticky.js");

describe("Sticky", () => {
  it("a sticky has text", () => {
    const sticky = new Sticky();
    expect(sticky.text()).toBe("");
    sticky.text("Test");
    expect(sticky.text()).toBe("Test");
  });

  it("a sticky has color and a set of valid colors", () => {
    const sticky = new Sticky();
    expect(sticky.color()).toBe(Colors.default);
    sticky.color(Colors.blue);
    expect(sticky.color()).toBe(Colors.blue);
  });

  it("colors are valid HTML colors", () => {
    const colorValues = Object.values(Colors);
    expect(colorValues.length).toBeTruthy();
    colorValues.forEach((color) => {
      document.body.style.backgroundColor = "rgba(0, 0, 0, 0)";
      expect(window.getComputedStyle(document.body).backgroundColor).toBe(
        "rgba(0, 0, 0, 0)"
      );
      expect(color).toBeTruthy();
      document.body.style.backgroundColor = color;
      expect(window.getComputedStyle(document.body).backgroundColor).toBe(
        color
      );
    });
  });
});
