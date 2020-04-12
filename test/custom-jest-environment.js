const http = require("http");
const nodeStatic = require("node-static");

const PuppeteerEnvironment = require("jest-environment-puppeteer");

class CustomEnvironment extends PuppeteerEnvironment {
  constructor(config, ...args) {
    super(config, ...args);
  }
  async setup() {
    return Promise.all([
      super.setup(),
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
    return super.teardown();
  }
}

module.exports = CustomEnvironment;
