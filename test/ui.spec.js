const pti = require("puppeteer-to-istanbul");

describe("Board UI", () => {
  beforeEach(async () => {
    await page.goto("about:blank");
    return Promise.all([
      page.coverage.startJSCoverage(),
      page.coverage.startCSSCoverage(),
    ]);
  });
  afterEach(() =>
    Promise.all([
      page.coverage.stopJSCoverage(),
      page.coverage.stopCSSCoverage(),
    ])
      .then(([jsCoverage, cssCoverage]) => {
        pti.write([...jsCoverage, ...cssCoverage]);
      })
      .then(() => page.keyboard.up("Shift"))
  );

  it("creates new sticky close to mouse position when a click happens after 'n' is pressed", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await page.waitFor(".board");
    await press("n");
    await createNewAndCheckExpectations();
  });

  it("creates sticky can be canceled with Escape key", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await page.waitFor(".board");
    await press("n");
    expect(await cursorOnBoard()).toBe("crosshair");
    await page.keyboard.press("Escape");
    expect(await cursorOnBoard()).toBe("auto");
    await page.click(".board");
    expect(await (await page.$$(".sticky")).length).toBe(0);
  });

  it("can create new sticky from menu button", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await page.waitFor(".board");
    expect(await (await page.$$(".sticky")).length).toBe(0);
    await page.click(".board-action-menu .new-sticky");
    await thingsSettleDown(0);
    expect(await (await page.$$(".sticky")).length).toBe(0);
    await createNewAndCheckExpectations();
  });

  async function createNewAndCheckExpectations() {
    expect(await cursorOnBoard()).toBe("crosshair");
    const clickLocation = await locationInsideBoard();
    const stickyLocation = await clickToCreateSticky(clickLocation);
    expect(stickyLocation).toBeInTheVicinityOf(
      clickLocation,
      await withinGridUnit()
    );
  }

  it("can delete selected stickies with a menu button", async () => {
    await testStickyDeletion(() => page.click(".board-action-menu .delete"));
  });

  it("can delete selected stickies with the delete key", async () => {
    await testStickyDeletion(() => page.keyboard.press("Delete"));
  });

  async function testStickyDeletion(deleteAction) {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.waitFor(".board");
    await deleteAction();
    await thingsSettleDown();
    expect(await (await page.$$(".sticky")).length).toBe(4);
    clickStickyOutsideOfText(1);
    page.keyboard.down("Shift");
    await page.click(".sticky-2 .sticky");
    await deleteAction();
    await thingsSettleDown();
    expect(await (await page.$$(".sticky-1, .sticky-2")).length).toBe(0);
    expect(await (await page.$$(".sticky")).length).toBe(2);
  }

  it("creates new sticky close to mouse when zoomed", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await press("o");
    await thingsSettleDown(0);
    await scrollBoardIntoView();
    await press("n");
    await thingsSettleDown(0);
    const clickLocation = await locationInsideBoard();
    const stickyLocation = await clickToCreateSticky(clickLocation);
    expect(stickyLocation).toBeInTheVicinityOf(
      clickLocation,
      await withinGridUnit()
    );
  }, 999999);

  it("moves with drag and drop", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await expect(page).toMatchElement(".sticky-1 .sticky");
    const dragDestination = { x: 205, y: 355 };
    await dragAndDrop(".sticky-1 .sticky", ".board", page, {
      x: 10,
      y: 140,
      height: 0,
      width: 0,
    });
    await thingsSettleDown(5);
    const sticky = await expect(page).toMatchElement(".sticky-1 .sticky");
    const stickyLocation = await sticky.boundingBox();
    expect(stickyLocation).toBeInTheVicinityOf(
      dragDestination,
      await withinGridUnit()
    );
  });

  it("moves sticky with arrow keys when selected", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    const sticky = await expect(page).toMatchElement(".sticky-1 .sticky");
    const stickyStartLocation = await sticky.boundingBox();
    await page.mouse.click(
      stickyStartLocation.x + 3,
      stickyStartLocation.y + 3
    );
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await thingsSettleDown(11);
    const expectedDestination = {
      x: stickyStartLocation.x + 25,
      y: stickyStartLocation.y + 25,
    };
    // TIMING
    const stickyEndLocation = await sticky.boundingBox();
    expect(stickyEndLocation).toBeInTheVicinityOf(expectedDestination, 2);
  });

  it("text is updated by activating the text input and typing", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.waitFor(".sticky-1 .sticky .text-input");
    await page.click(".sticky-1 .sticky .text-input");
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.type(".sticky-1 .sticky .text-input", "Testing");
    const textOnBoard = await page.evaluate(() => board.getSticky(1).text);
    expect(textOnBoard).toBe("Testing");
  });

  it("text editing can be completed with Escape", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.waitFor(".sticky-1 .sticky .text-input");
    await page.click(".sticky-1 .sticky .text-input");
    await page.keyboard.press("End");
    await press("x");
    await page.keyboard.press("Enter");
    await press("y");
    await page.click(".sticky-1 .sticky .text-input");
    await page.keyboard.press("End");
    await press("z");
    await page.keyboard.press("Escape");
    await press("0");
    const textOnBoard = await page.evaluate(() => board.getSticky(1).text);
    expect(textOnBoard).toBe("Onexz");
  });

  it("text resizes as you type", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.waitFor(".sticky-1 .sticky .text-input");
    await page.click(".sticky-1 .sticky .text-input");
    const fontSizeBefore = await getComputedFontSize(".sticky-1 .text-input");
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.type(".sticky-1 .sticky .text-input", "Testing");
    const fontSizeAfter = await getComputedFontSize(".sticky-1 .text-input");
    expect(fontSizeBefore).toBeGreaterThan(fontSizeAfter);
    expect(await numTextAreaRows(".sticky-1 .text-input")).toBe(1);
    await page.type(".sticky-1 .sticky .text-input", " sizing");
    expect(await numTextAreaRows(".sticky-1 .text-input")).toBe(2);
    await page.type(
      ".sticky-1 .sticky .text-input",
      " more more more more more more more more more more more more more"
    );
    expect(await numTextAreaRows(".sticky-1 .text-input")).toBe(6);
  });

  it("colors can be selected by pressing the c-key", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await press("n");
    await page.click(".board");
    const firstColor = await getComputedColor(".sticky-1 .sticky");
    await press("c");
    await press("n");
    await page.click(".board");
    const secondColor = await getComputedColor(".sticky-2 .sticky");
    expect(firstColor).not.toBe(secondColor);
  });

  it("colors cycle backwards with Shift+c", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await press("n");
    await page.click(".board");
    const firstColor = await getComputedColor(".sticky-1 .sticky");
    await press("c");
    await press("c");
    await press("C");
    await press("C");
    await press("n");
    await page.click(".board");
    const secondColor = await getComputedColor(".sticky-2 .sticky");
    expect(firstColor).toBe(secondColor);
  });

  it("cycles through zoom levels with the o-key", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    const boardBox = await (await page.waitFor(".board")).boundingBox();
    const stickyBox = await (await page.waitFor(".sticky")).boundingBox();
    await press("o");
    await thingsSettleDown();
    const boardBoxAfter = await (await page.waitFor(".board")).boundingBox();
    const stickyBoxAfter = await (await page.waitFor(".sticky")).boundingBox();
    // TIMING
    expect(boardBoxAfter.width).toBeLessThan(boardBox.width);
    expect(boardBoxAfter.height).toBeLessThan(boardBox.height);
    expect(stickyBoxAfter.width).toBeLessThan(stickyBox.width);
    expect(stickyBoxAfter.height).toBeLessThan(stickyBox.height);
  });

  it("manages selection with shift clicks and selections can be moved together", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await thingsSettleDown();
    await page.click(".sticky-1 .sticky");
    expect(await isStickySelected(1)).toBe(true);
    await thingsSettleDown();
    const s2bb = await stickyBoundingBox(1);
    await page.mouse.click(s2bb.x - 10, s2bb.y - 10);
    // await jestPuppeteer.debug();
    expect(await isStickySelected(1)).toBe(false);
    await page.keyboard.down("Shift");
    await page.click(".sticky-2 .sticky");
    await thingsSettleDown(7);
    await page.click(".sticky-3 .sticky");
    await thingsSettleDown(8);
    await page.click(".sticky-4 .sticky");
    expect(await isStickySelected(1)).toBe(false);
    expect(await isStickySelected(2)).toBe(true);
    expect(await isStickySelected(3)).toBe(true);
    expect(await isStickySelected(4)).toBe(true);
    await page.click(".sticky-2 .sticky");
    expect(await isStickySelected(1)).toBe(false);
    expect(await isStickySelected(2)).toBe(false);
    expect(await isStickySelected(3)).toBe(true);
    expect(await isStickySelected(4)).toBe(true);
    await page.keyboard.press("ArrowDown");
    await thingsSettleDown(12);
    expect(await stickyBoundingBox(1)).toBeInTheVicinityOf(
      { x: 201, y: 201 },
      0
    );
    expect(await stickyBoundingBox(2)).toBeInTheVicinityOf(
      { x: 301, y: 201 },
      0
    );
    await thingsSettleDown(12);
    expect(await stickyBoundingBox(3)).toBeInTheVicinityOf(
      { x: 401, y: 226 },
      0
    );
    expect(await stickyBoundingBox(4)).toBeInTheVicinityOf(
      { x: 501, y: 226 },
      0
    );
    await dragAndDrop(".sticky-3 .sticky", ".board", page, {
      x: 300,
      y: 500,
      height: 0,
      width: 0,
    });
    await thingsSettleDown(14);
    expect(await stickyBoundingBox(1)).toBeInTheVicinityOf(
      { x: 201, y: 201 },
      0
    );
    expect(await stickyBoundingBox(2)).toBeInTheVicinityOf(
      { x: 301, y: 201 },
      0
    );
    expect(await stickyBoundingBox(3)).toBeInTheVicinityOf(
      { x: 701, y: 726 },
      0
    );
    expect(await stickyBoundingBox(4)).toBeInTheVicinityOf(
      { x: 801, y: 726 },
      0
    );
  });

  it("has a menu item to change colors", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await press("n");
    const boardBox = await (await page.waitFor(".board")).boundingBox();
    await page.mouse.click(boardBox.x + 50, boardBox.y + 50);
    let firstColor = await getComputedColor(".sticky-1 .sticky");
    await setSelected(1, false);
    await page.click(".board-action-menu .change-color");
    await thingsSettleDown();
    await press("n");
    await page.mouse.click(boardBox.x + 150, boardBox.y + 50);
    let secondColor = await getComputedColor(".sticky-2 .sticky");
    expect(firstColor).not.toBe(secondColor);
    await clickStickyOutsideOfText(1);
    expect(await isStickySelected(1)).toBe(true);
    expect(await isStickySelected(2)).toBe(false);
    await page.click(".board-action-menu .change-color");
    await thingsSettleDown();
    firstColor = await getComputedColor(".sticky-1 .sticky");
    expect(firstColor).toBe(secondColor);
    await setSelected(2, true);
    let colorBeforeSelectionColorChange = firstColor;
    await page.click(".board-action-menu .change-color");
    await thingsSettleDown();
    firstColor = await getComputedColor(".sticky-1 .sticky");
    secondColor = await getComputedColor(".sticky-2 .sticky");
    expect(firstColor).not.toBe(colorBeforeSelectionColorChange);
    expect(secondColor).not.toBe(colorBeforeSelectionColorChange);
    expect(firstColor).toBe(secondColor);
  });

  it("doesn't allow stickies out of bounds", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await clickStickyOutsideOfText(1);
    await repeat(10, () => page.keyboard.press("ArrowLeft"));
    await repeat(10, () => page.keyboard.press("ArrowUp"));
    await thingsSettleDown();
    expect(await stickyBoundingBox(1)).toBeInTheVicinityOf({ x: 1, y: 1 }, 0);
    await repeat(60, () => page.keyboard.press("ArrowDown"));
    await repeat(95, () => page.keyboard.press("ArrowRight"));
    await thingsSettleDown();
    expect(await stickyBoundingBox(1)).toBeInTheVicinityOf(
      { x: 2301, y: 1251 },
      0
    );
  });

  it("tab order based on positioning", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await scrollBoardIntoView();
    for (let y = 0; y < 3; y++) {
      for (let x = 1; x < 4; x++) {
        await press("n");
        await page.mouse.click(x * 50, 150 + y * 50);
        await thingsSettleDown();
      }
    }
    for (let y = 0; y < 3; y++) {
      for (let x = 1; x < 4; x++) {
        await press("n");
        await page.mouse.click((4 - x) * 50 + 300, 150 + (3 - y) * 50);
        await thingsSettleDown();
      }
    }
    const classNames = await page.evaluate(() => {
      return [...document.querySelectorAll(".board .sticky-container")].map(
        (el) => el.className
      );
    });
    // console.log(classNames);
    expect(classNames).toEqual([
      "sticky-1 sticky-container animate-move",
      "sticky-2 sticky-container animate-move",
      "sticky-3 sticky-container animate-move",
      "sticky-4 sticky-container animate-move",
      "sticky-5 sticky-container animate-move",
      "sticky-6 sticky-container animate-move",
      "sticky-18 sticky-container animate-move selected",
      "sticky-17 sticky-container animate-move",
      "sticky-16 sticky-container animate-move",
      "sticky-7 sticky-container animate-move",
      "sticky-8 sticky-container animate-move",
      "sticky-9 sticky-container animate-move",
      "sticky-15 sticky-container animate-move",
      "sticky-14 sticky-container animate-move",
      "sticky-13 sticky-container animate-move",
      "sticky-12 sticky-container animate-move",
      "sticky-11 sticky-container animate-move",
      "sticky-10 sticky-container animate-move",
    ]);
    const selectedZIndex = await page.evaluate(() => {
      return document.querySelector(".sticky-container.selected").style.zIndex;
    });
    expect(selectedZIndex).toBe("1");
  });

  it("can get more space by growing board size", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.click(".board-action-menu .board-size");
    await page.click(".grow-arrows .left");
    await page.click(".board-action-menu .board-size");
    // test bounds/snapping
    await setSelected(1);
    await repeat(15, () => page.keyboard.press("ArrowLeft"));
    const stickyAfterMove = await page.evaluate(
      () => board.getSticky(1).location
    );
    expect(stickyAfterMove).toBeInTheVicinityOf({ x: -100, y: 200 }, 0);
  });
});

function pageWithEmptyLocalBoard() {
  return `http://127.0.0.1:${
    httpServer.address().port
  }/test/pages/empty-scrollable.html`;
}

function pageWithBasicContentOnALocalBoard() {
  return `http://127.0.0.1:${
    httpServer.address().port
  }/test/pages/starter-content.html`;
}

expect.extend({
  toBeInTheVicinityOf(received, expected, tolerance) {
    return {
      message: () =>
        `Difference between ${received.x} and ${expected.x} (${Math.abs(
          received.x - expected.x
        )}) should be less than ${tolerance}
Difference between ${received.y} and ${expected.y} (${Math.abs(
          received.y - expected.y
        )}) should be less than ${tolerance}`,
      pass:
        Math.abs(received.x - expected.x) <= tolerance &&
        Math.abs(received.y - expected.y) <= tolerance,
    };
  },
});

async function repeat(times, action) {
  for (let i = 0; i < times; i++) {
    await action();
  }
}

async function setSelected(id, selected) {
  if (selected === (await isStickySelected(id))) {
    return;
  }
  page.keyboard.down("Shift");
  await clickStickyOutsideOfText(id);
  page.keyboard.up("Shift");
}

async function clickStickyOutsideOfText(id) {
  const stickyBox = await (
    await page.waitFor(`.sticky-${id} .sticky`)
  ).boundingBox();
  return page.mouse.click(stickyBox.x + stickyBox.width / 2, stickyBox.y + 2);
}
async function clickToCreateSticky(clickLocation) {
  await page.mouse.click(clickLocation.x, clickLocation.y);
  await thingsSettleDown();
  let stickyBox = await (await page.waitFor(".sticky")).boundingBox();
  return {
    x: stickyBox.x + stickyBox.width / 2,
    y: stickyBox.y + stickyBox.height / 2,
  };
}
async function locationInsideBoard() {
  let box = await (await page.$(".board")).boundingBox();
  return {
    x: box.x + 200,
    y: box.y + 200,
  };
}
async function withinGridUnit() {
  return page.evaluate(() => board.getGridUnit());
}
function press(letter) {
  return page.type(".board", letter);
}
async function thingsSettleDown(
  expectedScheduledTasksCount,
  expectedNumErrors
) {
  const errMsg = await page.evaluate(
    (expectedScheduledTasksCount, expectedNumErrors) =>
      waitForThingsToSettleDown(expectedScheduledTasksCount, expectedNumErrors),
    expectedScheduledTasksCount,
    expectedNumErrors
  );
  if (errMsg !== undefined) {
    throw new Error(errMsg);
  }
}
async function scrollBoardIntoView() {
  return page.evaluate(() => {
    document
      .querySelectorAll(".app, .board-container, .board")
      .forEach((el) => el.scrollIntoView({ block: "start", inline: "start" }));
  });
}

async function dragAndDrop(
  sourceSelector,
  destinationSelector,
  page,
  destinationBox
) {
  const sourceElement = await page.waitFor(sourceSelector);
  const sourceBox = await sourceElement.boundingBox();

  await page.evaluate(
    (ss, ds, sb, db) => {
      const source = document.querySelector(ss);
      const destination = document.querySelector(ds);

      const sourceX = sb.x + sb.width / 2;
      const sourceY = sb.y + sb.height / 2;
      const destinationX = db.x + db.width / 2;
      const destinationY = db.y + db.height / 2;

      source.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          screenX: sourceX,
          screenY: sourceY,
          clientX: sourceX,
          clientY: sourceY,
        })
      );

      const dragStartEvent = new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      });
      source.dispatchEvent(dragStartEvent);

      destination.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY,
        })
      );

      destination.dispatchEvent(
        new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY,
        })
      );

      destination.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY,
          dataTransfer: dragStartEvent.dataTransfer,
        })
      );

      source.dispatchEvent(
        new DragEvent("dragend", {
          bubbles: true,
          cancelable: true,
          screenX: destinationX,
          screenY: destinationY,
          clientX: destinationX,
          clientY: destinationY,
        })
      );
    },
    sourceSelector,
    destinationSelector,
    sourceBox,
    destinationBox
  );
}

async function getComputedFontSize(selector) {
  const fontSize = await page.evaluate(
    (selector) =>
      window
        .getComputedStyle(document.querySelector(selector))
        .getPropertyValue("font-size"),
    selector
  );
  const fontSizeNum = +fontSize.substr(0, fontSize.length - 2);
  return fontSizeNum;
}

async function getComputedColor(selector) {
  await page.waitFor(selector);
  return page.evaluate(
    (selector) =>
      window
        .getComputedStyle(document.querySelector(selector))
        .getPropertyValue("background-color"),
    selector
  );
}

async function numTextAreaRows(selector) {
  return page.evaluate(
    (selector) => +document.querySelector(selector).getAttribute("rows"),
    selector
  );
}

async function isStickySelected(id) {
  await thingsSettleDown();
  return page.evaluate(
    (id) =>
      document.querySelector(`.sticky-${id}`).classList.contains("selected"),
    id
  );
}

async function stickyBoundingBox(id) {
  const sticky = await page.waitFor(`.sticky-${id}`);
  return sticky.boundingBox();
}

async function cursorOnBoard() {
  return page.evaluate(() =>
    window
      .getComputedStyle(document.querySelector(".board"))
      .getPropertyValue("cursor")
  );
}
