import { Sticky, Colors } from "./sticky";

test("a sticky has text", () => {
  const sticky = new Sticky();
  expect(sticky.text()).toBe("");
  sticky.text("Test");
  expect(sticky.text()).toBe("Test");
});

test("a sticky has color and a set of valid colors", () => {
  const sticky = new Sticky();
  expect(sticky.color()).toBe(Colors.default);
  sticky.color("blue");
  expect(sticky.color()).toBe(Colors.blue);
  sticky.color("unknown");
  expect(sticky.color()).toBe(Colors.blue);
});

test("colors are valid HTML colors", () => {
  Object.values(Colors).forEach((color) => {
    document.body.style.backgroundColor = "";
    expect(window.getComputedStyle(document.body).backgroundColor).toBe("");
    document.body.style.backgroundColor = color;
    expect(window.getComputedStyle(document.body).backgroundColor).not.toBe("");
  });
});
