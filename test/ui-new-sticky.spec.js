import http from "http";
import nodeStatic from "node-static";
import pti from "puppeteer-to-istanbul";

describe("Board UI", () => {
  let server;
  beforeAll(() =>
    Promise.all([
      page.coverage.startJSCoverage(),
      page.coverage.startCSSCoverage(),
      new Promise((resolve, reject) => {
        const fileServer = new nodeStatic.Server("./");
        server = http
          .createServer(function (request, response) {
            request
              .addListener("end", function () {
                fileServer.serve(request, response);
              })
              .resume();
          })
          .listen(0, "127.0.0.1", (err) => (err ? reject(err) : resolve()));
      }),
    ])
  );
  afterAll(() =>
    Promise.all([
      Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage(),
      ]).then(([jsCoverage, cssCoverage]) => {
        pti.write([...jsCoverage, ...cssCoverage]);
      }),
      new Promise((resolve) => {
        server.close(() => resolve);
      }),
    ])
  );
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
  function pageWithEmptyLocalBoard() {
    return `http://127.0.0.1:${server.address().port}/test/pages/index.html`;
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
      let app = document.querySelector(".app");
      app.scrollLeft = 300;
      app.scrollTop = 0;
      document.body.scrollTop = 944;
      document.body.scrollLeft = 642;
    });
  }
});

expect.extend({
  toBeInTheVicinityOf(received, expected, tolerance) {
    return {
      message: () =>
        `${Math.abs(received.x - expected.x)} should be less than ${tolerance}
${Math.abs(received.y - expected.y)} should be less than ${tolerance}`,
      pass:
        Math.abs(received.x - expected.x) <= tolerance &&
        Math.abs(received.y - expected.y) <= tolerance,
    };
  },
});