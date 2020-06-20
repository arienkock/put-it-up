/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
module.exports = {
  mutator: "javascript",
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  coverageAnalysis: "perTest",
  testFramework: "jasmine",
  testRunner: "jasmine",
  jasmineConfigFile: "spec/support/jasmine.json",
  transpilers: [],
  coverageAnalysis: "off",
};
