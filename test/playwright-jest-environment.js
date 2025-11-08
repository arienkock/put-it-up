const http = require("http");
const nodeStatic = require("node-static");
const { chromium } = require("playwright");
const { TestEnvironment } = require("jest-environment-node");

class PlaywrightJestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();
    
    // Set up HTTP server
    await new Promise((resolve, reject) => {
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
    });

    // Set up Playwright browser
    this.global.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });
    
    this.global.context = await this.global.browser.newContext();
    this.global.page = await this.global.context.newPage();
    
    // Set timeouts - shorter for actions, longer for navigation to real pages
    this.global.page.setDefaultTimeout(10000); // 5 seconds for actions (click, fill, etc.)
    this.global.page.setDefaultNavigationTimeout(10000); // 10 seconds for navigation to real HTTP pages
  }

  async teardown() {
    // Close context before browser (proper order)
    if (this.global.context) {
      await this.global.context.close().catch(() => {
        // Ignore errors during context cleanup
      });
    }
    
    // Close browser after context
    if (this.global.browser) {
      await this.global.browser.close().catch(() => {
        // Ignore errors during browser cleanup
      });
    }
    
    // Close HTTP server with proper callback handling
    if (this.global.httpServer) {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(), 100);
        this.global.httpServer.close(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    
    await super.teardown();
  }
}

module.exports = PlaywrightJestEnvironment;
