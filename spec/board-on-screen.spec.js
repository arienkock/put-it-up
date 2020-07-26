const { boardComponent } = require("../src/board-component");
const { createRoot } = require("../src/root-component");
const { Board } = require("../src/board");
const { Sticky } = require("../src/sticky");

describe("board component", () => {
  it("is full screen", () => {
    const board = new Board("test_id")
    const { h, rerender } = createFakeUI();
    const vElement = boardComponent(h, rerender).render({board});
    const boardStyles = vElement.props.styles;
    expect(boardStyles).toEqual({
      width: "100vw",
      height: "100vh",
    });
  });
});

describe("root component", () => {
  it("contains an empty board component", () => {
    const rootComponent = initComponent(createRoot, new Board("test_id"));
    const vElement = rootComponent.render();
    expandComponents(vElement);
    expect(findByClassName("board", vElement)).toBeTruthy();
    expect(findByClassName("sticky", vElement)).toBeFalsy();
  });
  it("contains a empty board with stickies", () => {
    const board = new Board("test_id");
    const rootComponent = initComponent(createRoot, board);
    let vElement = rootComponent.render();
    board.add({ item: new Sticky() });
    expandComponents(vElement);
    vElement = rootComponent.render();
    expandComponents(vElement);
    expect(findByClassName("item-container", vElement)).toBeTruthy();
  });
});

function expandComponents(vElement) {
  let result = vElement;
  if (typeof vElement.tag.render === "function") {
    result = vElement.tag.render(vElement.props);
  }
  result.children = result.children && result.children.map(expandComponents);
  return result;
}

function findByClassName(cn, vElement) {
  if (
    vElement.props &&
    vElement.props.className &&
    vElement.props.className.includes(cn)
  ) {
    return vElement;
  }
  if (vElement.children) {
    for (const child of vElement.children) {
      const result = findByClassName(cn, child);
      if (result) {
        return result;
      }
    }
  }
}

function initComponent(createComponent, ...constructorArgs) {
  const { h, rerender } = createFakeUI();
  const component = createComponent(...constructorArgs)(h, rerender);
  return component;
}

// TODO: put fake ui in its own module and test it with same tests as ReactUIAdapter

function createFakeUI() {
  const rerender = jasmine.createSpy();
  function h(tag, props, children) {
    if (!children instanceof Array) {
      children = [children];
    }
    if (typeof tag === "function") {
      const compFunction = tag;
      tag = compFunction(h, rerender);
    }
    return { tag, props, children };
  }
  return {
    h,
    rerender,
  };
}
