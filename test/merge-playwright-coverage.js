/**
 * Global teardown script to merge Playwright CDP coverage with Jest's coverage
 * This runs after all tests complete and merges browser coverage with Node.js coverage
 */

const path = require("path");
const fs = require("fs");
const libReport = require("istanbul-lib-report");
const reports = require("istanbul-reports");

module.exports = async function globalTeardown() {
  // Only run if coverage was enabled
  const hasCoverageFlag = process.argv.includes("--coverage") || 
                         process.argv.some(arg => arg.startsWith("--coverage"));
  if (!hasCoverageFlag) {
    return;
  }

  const workspaceRoot = process.cwd();
  const coverageDir = path.join(workspaceRoot, "coverage");
  const playwrightCoverageDir = path.join(coverageDir, "playwright-cdp");
  const jestCoverageFile = path.join(coverageDir, "coverage-final.json");

  // If Jest coverage file doesn't exist, there's nothing to merge
  if (!fs.existsSync(jestCoverageFile)) {
    return;
  }

  // If Playwright coverage directory doesn't exist, nothing to merge
  if (!fs.existsSync(playwrightCoverageDir)) {
    return;
  }

  // Read Jest's coverage
  let jestCoverage = {};
  try {
    const jestCoverageContent = fs.readFileSync(jestCoverageFile, "utf8");
    jestCoverage = JSON.parse(jestCoverageContent);
  } catch (error) {
    console.warn("[Coverage] Failed to read Jest coverage file:", error.message);
    return;
  }

  // Read all Playwright coverage files
  const playwrightCoverageFiles = fs
    .readdirSync(playwrightCoverageDir)
    .filter((file) => file.startsWith("coverage-worker-") && file.endsWith(".json"))
    .map((file) => path.join(playwrightCoverageDir, file));

  if (playwrightCoverageFiles.length === 0) {
    return;
  }

  // Merge all Playwright coverage files
  const playwrightCoverage = {};
  for (const file of playwrightCoverageFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const coverage = JSON.parse(content);
      
      // Merge into playwrightCoverage
      for (const [filePath, fileCoverage] of Object.entries(coverage)) {
        if (!playwrightCoverage[filePath]) {
          playwrightCoverage[filePath] = fileCoverage;
        } else {
          // Merge coverage data
          mergeCoverageData(playwrightCoverage[filePath], fileCoverage);
        }
      }
    } catch (error) {
      console.warn(`[Coverage] Failed to read Playwright coverage file ${file}:`, error.message);
    }
  }

  // Merge Playwright coverage with Jest coverage
  for (const [filePath, fileCoverage] of Object.entries(playwrightCoverage)) {
    if (!jestCoverage[filePath]) {
      // New file covered by Playwright
      jestCoverage[filePath] = fileCoverage;
    } else {
      // Merge coverage data
      mergeCoverageData(jestCoverage[filePath], fileCoverage);
    }
  }

  // Write merged coverage back to Jest's coverage file
  try {
    fs.writeFileSync(jestCoverageFile, JSON.stringify(jestCoverage, null, 2));
  } catch (error) {
    console.warn("[Coverage] Failed to write merged coverage:", error.message);
    return;
  }

  // Regenerate HTML report with merged coverage
  try {
    const libCoverage = require("istanbul-lib-coverage");
    const coverageMap = libCoverage.createCoverageMap(jestCoverage);
    const config = libReport.createContext({
      dir: coverageDir,
      coverageMap: coverageMap,
      defaultSummarizer: "nested",
    });

    // Generate HTML report
    const htmlReport = reports.create("html", {
      verbose: false,
    });
    htmlReport.execute(config);

    console.log("[Coverage] Regenerated HTML report with merged Playwright coverage");
  } catch (error) {
    console.warn("[Coverage] Failed to regenerate HTML report:", error.message);
  }
};

/**
 * Merge two Istanbul coverage objects
 * Takes the maximum coverage counts to avoid double counting
 */
function mergeCoverageData(existing, newCoverage) {
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

