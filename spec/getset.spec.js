const getset = require("../src/getset");

describe("getset", () => {
  it("remembers the value", () => {
    const num = getset(1);
    expect(num()).toBe(1);
    num(2);
    expect(num()).toBe(2);
  });
  it("can be chained", () => {
    const num = getset(1);
    expect(num()).toBe(1);
    const num2 = num.then((n) => n * 2);
    expect(num()).toBe(1);
    expect(num2()).toBe(undefined);
    num(2);
    expect(num()).toBe(2);
    expect(num2()).toBe(4);
  });
  it("can be chained without initial value", () => {
    const num = getset();
    expect(num()).toBe(undefined);
    const num2 = num.then((n) => n * 2);
    expect(num()).toBe(undefined);
    expect(num2()).toBe(undefined);
    num(2);
    expect(num()).toBe(2);
    expect(num2()).toBe(4);
  });
});
