const http = require("http");
const nodeStatic = require("node-static");
const pti = require("puppeteer-to-istanbul");

const PuppeteerEnvironment = require("jest-environment-puppeteer");

class CustomEnvironment extends PuppeteerEnvironment {
  constructor(config, ...args) {
    super(config, ...args);
  }
  async setup() {
    await super.setup();
    return Promise.all([
      this.global.page.coverage.startJSCoverage(),
      this.global.page.coverage.startCSSCoverage(),
      new Promise((resolve, reject) => {
        const fileServer = new nodeStatic.Server("./");
        this.global.httpServer = http
          .createServer(function (request, response) {
            request
              .addListener("end", function () {
                fileServer.serve(request, response);
              })
              .resume();
          })
          .unref()
          .listen(0, "127.0.0.1", (err) => (err ? reject(err) : resolve()));
      }),
    ]);
  }

  async teardown() {
    await Promise.all([
      Promise.all([
        this.global.page.coverage.stopJSCoverage(),
        this.global.page.coverage.stopCSSCoverage(),
      ]).then(([jsCoverage, cssCoverage]) => {
        pti.write([...jsCoverage, ...cssCoverage]);
      }),
      new Promise((resolve) => {
        this.global.httpServer.close(() => resolve());
      }),
    ]);
    return super.teardown();
  }
}

module.exports = CustomEnvironment;
