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
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.waitFor(".board");
    await page.click(".board-action-menu .delete");
    expect(await (await page.$$(".sticky")).length).toBe(4);
    await page.click(".sticky-1 .sticky");
    page.keyboard.down("Shift");
    await page.click(".sticky-2 .sticky");
    await page.click(".board-action-menu .delete");
    await thingsSettleDown();
    expect(await (await page.$$(".sticky-1, .sticky-2")).length).toBe(0);
    expect(await (await page.$$(".sticky")).length).toBe(2);
  });

  it.only("can delete selected stickies with the delete key", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.waitFor(".board");
    await page.keyboard.press("Delete");
    expect(await (await page.$$(".sticky")).length).toBe(4);
    await page.click(".sticky-1 .sticky");
    page.keyboard.down("Shift");
    await page.click(".sticky-2 .sticky");
    await page.keyboard.press("Delete");
    await thingsSettleDown();
    expect(await (await page.$$(".sticky-1, .sticky-2")).length).toBe(0);
    expect(await (await page.$$(".sticky")).length).toBe(2);
  });

  it("creates new sticky close to mouse when zoomed", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await press("o");
    await thingsSettleDown(0);
    await scrollBoardIntoView();
    await press("n");
    const clickLocation = await locationInsideBoard();
    const stickyLocation = await clickToCreateSticky(clickLocation);
    expect(stickyLocation).toBeInTheVicinityOf(
      clickLocation,
      await withinGridUnit()
    );
  });

  it("moves with drag and drop", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await expect(page).toMatchElement(".sticky-1 .sticky");
    const dragDestination = { x: 205, y: 155 };
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

  it("text resizes as you type", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.waitFor(".sticky-1 .sticky .text-input");
    await page.click(".sticky-1 .sticky .text-input");
    const fontSizeBefore = await getComputedFontSize(".sticky-1 .text-input");
    await page.type(".sticky-1 .sticky .text-input", "Testing");
    const fontSizeAfter = await getComputedFontSize(".sticky-1 .text-input");
    expect(fontSizeBefore).toBeGreaterThan(fontSizeAfter);
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

  it("cycles through zoom levels with the o-key", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    const boardBox = await (await page.waitFor(".board")).boundingBox();
    const stickyBox = await (await page.waitFor(".sticky")).boundingBox();
    await press("o");
    await thingsSettleDown();
    const boardBoxAfter = await (await page.waitFor(".board")).boundingBox();
    const stickyBoxAfter = await (await page.waitFor(".sticky")).boundingBox();
    expect(boardBoxAfter.width).toBeLessThan(boardBox.width);
    expect(boardBoxAfter.height).toBeLessThan(boardBox.height);
    expect(stickyBoxAfter.width).toBeLessThan(stickyBox.width);
    expect(stickyBoxAfter.height).toBeLessThan(stickyBox.height);
  });

  it("manages selection with shift clicks and selections can be moved together", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.click(".sticky-1 .sticky");
    expect(await isStickySelected(1)).toBe(true);
    await page.click(".board");
    await thingsSettleDown();
    expect(await isStickySelected(1)).toBe(false);
    await page.keyboard.down("Shift");
    await page.click(".sticky-2 .sticky");
    await page.click(".sticky-3 .sticky");
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
    expect(await stickyBoundingBox(1)).toBeInTheVicinityOf({ x: 200, y: 0 }, 0);
    expect(await stickyBoundingBox(2)).toBeInTheVicinityOf({ x: 300, y: 0 }, 0);
    expect(await stickyBoundingBox(3)).toBeInTheVicinityOf(
      { x: 400, y: 25 },
      0
    );
    expect(await stickyBoundingBox(4)).toBeInTheVicinityOf(
      { x: 500, y: 25 },
      0
    );
    await dragAndDrop(".sticky-3 .sticky", ".board", page, {
      x: 300,
      y: 500,
      height: 0,
      width: 0,
    });
    await thingsSettleDown(14);
    expect(await stickyBoundingBox(1)).toBeInTheVicinityOf({ x: 200, y: 0 }, 0);
    expect(await stickyBoundingBox(2)).toBeInTheVicinityOf({ x: 300, y: 0 }, 0);
    expect(await stickyBoundingBox(3)).toBeInTheVicinityOf(
      { x: 700, y: 525 },
      0
    );
    expect(await stickyBoundingBox(4)).toBeInTheVicinityOf(
      { x: 800, y: 525 },
      0
    );
  }, 9999999);
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

async function clickToCreateSticky(clickLocation) {
  await page.mouse.click(clickLocation.x, clickLocation.y);
  await thingsSettleDown();
  let stickyBox = await (await page.$(".sticky")).boundingBox();
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
function scrollBoardIntoView() {
  return page.evaluate(() => {
    document.body.scrollLeft = 1020;
    document.body.scrollTop = 650;
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
  return page.evaluate(
    (selector) =>
      window
        .getComputedStyle(document.querySelector(selector))
        .getPropertyValue("background-color"),
    selector
  );
}

function isStickySelected(id) {
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
