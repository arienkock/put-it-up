describe("Board UI", () => {
  beforeEach(() => page.goto("about:blank"));

  it("creates new sticky close to mouse position when a click happens after 'n' is pressed", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await press("n");
    const clickLocation = await locationInsideBoard();
    const stickyLocation = await clickToCreateSticky(clickLocation);
    expect(stickyLocation).toBeInTheVicinityOf(
      clickLocation,
      await withinGridUnit()
    );
  });

  it("creates new sticky close to mouse when zoomed", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await press("o");
    await boardTransitionFinish();
    await scrollBoardIntoView();
    await press("n");
    const clickLocation = await locationInsideBoard();
    // await jestPuppeteer.debug();
    const stickyLocation = await clickToCreateSticky(clickLocation);
    expect(stickyLocation).toBeInTheVicinityOf(
      clickLocation,
      await withinGridUnit()
    );
  });

  it("moves with drag and drop", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await expect(page).toMatchElement(".sticky-1 .sticky");
    const dragDestination = { x: 10, y: 140 };
    await startWatchingForSettling();
    await dragAndDrop(".sticky-1 .sticky", ".board", page, {
      x: 10,
      y: 140,
      height: 0,
      width: 0,
    });
    await nextSettling();
    const sticky = await expect(page).toMatchElement(".sticky-1 .sticky");
    const stickyLocation = await sticky.boundingBox();
    // await jestPuppeteer.debug();
    page.screenshot({ path: "./test.png" });
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
      stickyStartLocation.x + 1,
      stickyStartLocation.y + 1
    );
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await startWatchingForSettling();
    await page.keyboard.press("ArrowLeft");
    await nextSettling();
    const expectedDestination = {
      x: stickyStartLocation.x + 25,
      y: stickyStartLocation.y + 25,
    };
    const stickyEndLocation = await sticky.boundingBox();
    expect(stickyEndLocation).toBeInTheVicinityOf(expectedDestination, 2);
  });

  it("text is updated by activating the text input and typing", async () => {
    await page.goto(pageWithBasicContentOnALocalBoard());
    await page.waitFor(".sticky-1 .sticky .textInput");
    await page.click(".sticky-1 .sticky .textInput");
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await page.type(".sticky-1 .sticky .textInput", "Test");
    const textOnBoard = await page.evaluate(() => board.getSticky(1).text);
    expect(textOnBoard).toBe("Test");
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
});

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
  await startWatchingForSettling();
  await page.mouse.click(clickLocation.x, clickLocation.y);
  await nextSettling();
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
function nextSettling() {
  return page.evaluate(() => settlingPromise);
}
function startWatchingForSettling() {
  return page.evaluate(() => watchForSettle());
}
function boardTransitionFinish() {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        document
          .querySelector(".board")
          .addEventListener("transitionend", () => {
            resolve();
          });
      })
  );
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
