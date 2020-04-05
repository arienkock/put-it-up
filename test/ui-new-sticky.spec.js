import http from "http";
import nodeStatic from "node-static";
import pti from "puppeteer-to-istanbul";

describe("new sticky added", () => {
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
  afterAll(async () => {
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
    ]);
  });

  it("new sticky added", async () => {
    await page.goto(pageWithEmptyLocalBoard());
    await pressN();
    const clickLocation = await locationInsideBoard();
    const stickyLocation = await clickToCreateSticky(clickLocation);
    expect(stickyLocation).toBeInTheVicinityOf(
      clickLocation,
      await withinHalfOfStickySize()
    );
  });

  async function clickToCreateSticky(clickLocation) {
    await startWatchingForSettling();
    await page.mouse.click(clickLocation.x, clickLocation.y);
    // let state = await page.evaluate(() => board.getState());
    // return Object.values(state.stickies)[0];
    await nextSettling();
    let stickyBox = await (await page.$(".sticky")).boundingBox();
    return {
      x: stickyBox.x + stickyBox.width / 2,
      y: stickyBox.y + stickyBox.height / 2,
    };
  }
  async function locationInsideBoard() {
    let box = await (await page.$(".board")).boundingBox();
    return { x: box.x + 210, y: box.y + 210 };
  }
  async function withinHalfOfStickySize() {
    return page.evaluate(() => board.getGridUnit());
  }
  function pressN() {
    return page.type(".board", "n");
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
});

expect.extend({
  toBeInTheVicinityOf(received, expected, tolerance) {
    console.log(...arguments);
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
