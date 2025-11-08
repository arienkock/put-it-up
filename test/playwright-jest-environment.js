const http = require("http");
const nodeStatic = require("node-static");
const { chromium } = require("playwright");
const { TestEnvironment } = require("jest-environment-node");
const path = require("path");
const fs = require("fs");
const v8toIstanbul = require("v8-to-istanbul");

class PlaywrightJestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    this.coverageData = [];
    this.workspaceRoot = config.rootDir || process.cwd();
    
    // Check if coverage is enabled - Jest worker processes don't get the full config
    // So we check multiple ways and also check at teardown time
    // We'll enable coverage collection if any indicator suggests coverage mode
    const hasCoverageFlag = process.argv.some(arg => arg && arg.includes("--coverage"));
    const hasCoverageEnv = process.env.npm_config_coverage === "true" || process.env.JEST_COVERAGE;
    const jestCollectCoverage = config.collectCoverage === true;
    
    // Check if coverage directory exists (indicates coverage mode is active)
    const coverageDir = path.join(this.workspaceRoot, "coverage");
    const coverageDirExists = fs.existsSync(coverageDir);
    
    // Default to enabled if coverage directory exists or any flag is set
    // We'll verify at teardown if coverage was actually collected
    this.coverageEnabled = hasCoverageFlag || hasCoverageEnv || jestCollectCoverage || coverageDirExists;
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
    
    // Always start coverage collection - if we're not in coverage mode, it won't hurt
    // and if we are, we need it. We'll handle the case where it wasn't needed at teardown.
    try {
      await this.global.page.coverage.startJSCoverage({
        resetOnNavigation: false,
        reportAnonymousScripts: true, // Enable to capture inline scripts and ES modules
      });
      this.coverageEnabled = true;
      console.error("[Coverage] Started Playwright CDP coverage collection (reportAnonymousScripts: true)");
    } catch (error) {
      // If coverage can't be started, that's okay - we're probably not in coverage mode
      this.coverageEnabled = false;
      console.error("[Coverage] Failed to start coverage:", error.message);
    }
  }

  async teardown() {
    // Always try to collect coverage if page exists - we'll check if coverage was actually enabled
    // by seeing if coverage data exists. This handles the case where coverage mode detection
    // failed in constructor but coverage is actually enabled.
    if (this.global.page) {
      try {
        // Check if coverage was started (it will throw if not started)
        const coverage = await this.global.page.coverage.stopJSCoverage();
        this.coverageData = coverage;
        this.coverageEnabled = true; // Mark as enabled since we got data
        
        console.error(`[Coverage] Collected ${coverage.length} coverage entries from Playwright`);
        
        // Log sample URLs to debug
        if (coverage.length > 0) {
          console.error(`[Coverage] Sample entries (first 3):`);
          coverage.slice(0, 3).forEach((entry, i) => {
            console.error(`[Coverage]   ${i + 1}. URL: ${entry.url || '(no URL)'}, sourceLength: ${entry.source ? entry.source.length : 0}, hasSourceURL: ${!!entry.sourceURL}`);
            if (entry.source && entry.source.length > 0) {
              const firstLine = entry.source.split('\n')[0];
              console.error(`[Coverage]      First line: ${firstLine.substring(0, 100)}`);
            }
          });
        } else {
          console.error(`[Coverage] No coverage entries collected - this may indicate scripts weren't loaded or executed`);
        }
        
        await this.writeCoverageData();
      } catch (error) {
        // Coverage wasn't started, which is fine if we're not in coverage mode
        // Only log if we thought coverage should be enabled
        if (this.coverageEnabled) {
          console.error("[Coverage] Failed to collect coverage (may not have been started):", error.message);
        }
      }
    }
    
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

  async writeCoverageData() {
    const debugFile = path.join(this.workspaceRoot, 'coverage-debug.log');
    
    if (!this.coverageData || this.coverageData.length === 0) {
      console.error("[Coverage] No coverage data collected");
      fs.appendFileSync(debugFile, `[${new Date().toISOString()}] No coverage data collected\n`);
      return;
    }

    console.error(`[Coverage] Processing ${this.coverageData.length} coverage entries`);
    fs.appendFileSync(debugFile, `[${new Date().toISOString()}] Processing ${this.coverageData.length} coverage entries\n`);

    const coverageDir = path.join(this.workspaceRoot, "coverage");
    const tempCoverageDir = path.join(coverageDir, "playwright-cdp");
    
    // Ensure directories exist
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true });
    }
    if (!fs.existsSync(tempCoverageDir)) {
      fs.mkdirSync(tempCoverageDir, { recursive: true });
    }

    const istanbulCoverage = {};
    const scriptsPattern = /\/scripts\//;
    
    let processedCount = 0;
    const skippedReasons = {
      noUrl: 0,
      notInScripts: 0,
      fileNotFound: 0,
      readError: 0,
      conversionError: 0,
    };

    for (const entry of this.coverageData) {
      // Handle entries with URLs and anonymous scripts (ES modules)
      let filePath = entry.url || entry.sourceURL;
      
      // If no URL but we have source, try to extract file path from source map or source content
      if (!filePath && entry.source) {
        // Try to find import statements that might indicate the file
        // For now, skip anonymous scripts without URLs - we'd need source map support
        skippedReasons.noUrl++;
        continue;
      }
      
      if (!filePath) {
        skippedReasons.noUrl++;
        continue;
      }

      if (!scriptsPattern.test(filePath)) {
        skippedReasons.notInScripts++;
        continue;
      }

      // Convert URL to file path (filePath already set above from entry.url || entry.sourceURL)
      
      // Remove protocol and host if present, and handle query parameters
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        try {
          const url = new URL(filePath);
          filePath = url.pathname;
          // ES modules may have query parameters like ?t=123456, which we ignore
        } catch (error) {
          console.warn(`[Coverage] Failed to parse URL: ${filePath}`, error.message);
          skippedReasons.fileNotFound++;
          continue;
        }
      }
      
      // Remove leading slash
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }

      // Resolve to absolute path
      const absolutePath = path.resolve(this.workspaceRoot, filePath);
      
      // Skip if file doesn't exist or is not in scripts directory
      if (!fs.existsSync(absolutePath)) {
        skippedReasons.fileNotFound++;
        if (processedCount < 5) {
          console.log(`[Coverage] File not found: ${absolutePath} (from URL: ${entry.url})`);
        }
        continue;
      }
      
      if (!absolutePath.includes(path.join(this.workspaceRoot, 'scripts'))) {
        skippedReasons.notInScripts++;
        continue;
      }

      // Read source code
      let source;
      try {
        source = fs.readFileSync(absolutePath, 'utf8');
      } catch (error) {
        skippedReasons.readError++;
        console.warn(`[Coverage] Failed to read file ${absolutePath}:`, error.message);
        continue;
      }

      // Convert v8 coverage to Istanbul format
      try {
        // Use absolute path for the converter
        const converter = v8toIstanbul(absolutePath, 0, {
          source: source,
        });
        
        await converter.load();
        converter.applyCoverage(entry.functions);
        
        const istanbulData = converter.toIstanbul();
        
        // Merge with existing coverage (use absolute paths as keys, like Jest does)
        for (const [file, coverage] of Object.entries(istanbulData)) {
          // Normalize the file path to absolute
          const normalizedFile = path.isAbsolute(file) ? file : path.resolve(this.workspaceRoot, file);
          
          if (!istanbulCoverage[normalizedFile]) {
            istanbulCoverage[normalizedFile] = coverage;
            processedCount++;
            if (processedCount <= 5) {
              console.error(`[Coverage] Processed: ${path.relative(this.workspaceRoot, normalizedFile)}`);
              fs.appendFileSync(debugFile, `[${new Date().toISOString()}] Processed: ${path.relative(this.workspaceRoot, normalizedFile)}\n`);
            }
          } else {
            // Merge coverage data
            const existing = istanbulCoverage[normalizedFile];
            const newCoverage = coverage;
            
            // Merge statement coverage
            if (newCoverage.statementMap && existing.statementMap) {
              Object.assign(existing.statementMap, newCoverage.statementMap);
            }
            if (newCoverage.s && existing.s) {
              // Merge statement counts - if either has coverage, ensure it's at least 1
              for (const [key, value] of Object.entries(newCoverage.s)) {
                const existingValue = existing.s[key] || 0;
                if (value > 0 || existingValue > 0) {
                  existing.s[key] = Math.max(1, existingValue, value);
                }
              }
            }
            
            // Merge function coverage
            if (newCoverage.fnMap && existing.fnMap) {
              Object.assign(existing.fnMap, newCoverage.fnMap);
            }
            if (newCoverage.f && existing.f) {
              for (const [key, value] of Object.entries(newCoverage.f)) {
                const existingValue = existing.f[key] || 0;
                if (value > 0 || existingValue > 0) {
                  existing.f[key] = Math.max(1, existingValue, value);
                }
              }
            }
            
            // Merge branch coverage
            if (newCoverage.branchMap && existing.branchMap) {
              Object.assign(existing.branchMap, newCoverage.branchMap);
            }
            if (newCoverage.b && existing.b) {
              for (const [key, value] of Object.entries(newCoverage.b)) {
                if (Array.isArray(value) && Array.isArray(existing.b[key])) {
                  existing.b[key] = value.map((v, i) => {
                    const existingVal = existing.b[key][i] || 0;
                    if (v > 0 || existingVal > 0) {
                      return Math.max(1, existingVal, v);
                    }
                    return existingVal;
                  });
                } else if (!existing.b[key] && value) {
                  existing.b[key] = value;
                }
              }
            }
          }
        }
      } catch (error) {
        skippedReasons.conversionError++;
        console.warn(`[Coverage] Failed to convert coverage for ${absolutePath}:`, error.message);
        if (error.stack) {
          console.warn(`[Coverage] Conversion error stack:`, error.stack);
        }
        continue;
      }
    }

    // Log summary
    const totalSkipped = Object.values(skippedReasons).reduce((sum, count) => sum + count, 0);
    console.error(`[Coverage] Summary: ${processedCount} files processed, ${totalSkipped} skipped`);
    fs.appendFileSync(debugFile, `[${new Date().toISOString()}] Summary: ${processedCount} files processed, ${totalSkipped} skipped\n`);
    if (skippedReasons.noUrl > 0) {
      console.log(`[Coverage]   - ${skippedReasons.noUrl} entries with no URL`);
    }
    if (skippedReasons.notInScripts > 0) {
      console.log(`[Coverage]   - ${skippedReasons.notInScripts} entries not in scripts/ directory`);
    }
    if (skippedReasons.fileNotFound > 0) {
      console.log(`[Coverage]   - ${skippedReasons.fileNotFound} files not found on filesystem`);
    }
    if (skippedReasons.readError > 0) {
      console.log(`[Coverage]   - ${skippedReasons.readError} files failed to read`);
    }
    if (skippedReasons.conversionError > 0) {
      console.log(`[Coverage]   - ${skippedReasons.conversionError} files failed conversion`);
    }

    // Write Istanbul coverage to a file that can be merged with Jest's coverage
    if (Object.keys(istanbulCoverage).length > 0) {
      // Use a unique filename per test worker to avoid conflicts
      const workerId = process.env.JEST_WORKER_ID || '0';
      const coverageFile = path.join(tempCoverageDir, `coverage-worker-${workerId}.json`);
      fs.writeFileSync(coverageFile, JSON.stringify(istanbulCoverage, null, 2));
      console.error(`[Coverage] Wrote coverage file: ${coverageFile} (${Object.keys(istanbulCoverage).length} files)`);
      fs.appendFileSync(debugFile, `[${new Date().toISOString()}] Wrote coverage file: ${coverageFile} (${Object.keys(istanbulCoverage).length} files)\n`);
    } else {
      console.error("[Coverage] No coverage data to write after processing");
      fs.appendFileSync(debugFile, `[${new Date().toISOString()}] No coverage data to write after processing\n`);
    }
  }
}

module.exports = PlaywrightJestEnvironment;
