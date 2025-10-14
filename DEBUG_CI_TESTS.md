# Debugging CI Test Failures

## Common Issues and Solutions

### 1. Check the Actual Test Failure
To see which tests are failing in GitHub Actions:
1. Go to the PR page on GitHub
2. Click on "Details" next to the failing check
3. Expand the "Run tests" step to see the actual error messages

### 2. Run Tests Locally in CI Mode
To reproduce CI failures locally:
```bash
# Run tests in CI mode (same as GitHub Actions)
CI=true npm test

# Run with verbose output
CI=true npm test -- --verbose

# Run a specific test file
CI=true npm test -- test/board.spec.js

# Run with coverage
CI=true npm test -- --coverage
```

### 3. Common Puppeteer CI Issues

#### Issue: Browser Launch Failures
**Symptoms:** "Failed to launch browser process"
**Solution:** The jest-puppeteer.config.js now conditionally applies CI flags

#### Issue: Timeout Errors
**Symptoms:** Tests timeout in CI but pass locally
**Solution:** Increase timeout in jest.config.js (currently 60000ms)

#### Issue: Headless Mode Differences
**Symptoms:** Tests pass with `headless: false` but fail with `headless: true`
**Solution:** Some UI tests may behave differently in headless mode. Check timing/waits.

### 4. Test-Specific Issues

#### New Unit Tests (Board.spec.js)
If the new unit tests are failing, they don't depend on Puppeteer, so check:
- Import statements are correct
- LocalDatastore class is properly exported
- Board class is properly exported

#### UI Tests (ui.spec.js)
If UI tests are failing:
- Check `thingsSettleDown()` calls - timing may differ in CI
- Verify selectors haven't changed
- Check if HTTP server starts correctly

### 5. Debugging Steps

1. **Add debug output to workflow:**
```yaml
- name: Run tests
  run: npm test -- --verbose --no-coverage
  env:
    CI: true
    DEBUG: 'puppeteer:*'  # Enable Puppeteer debug logs
```

2. **Check Node/npm versions:**
```bash
node --version
npm --version
```

3. **Verify dependencies install correctly:**
```bash
npm ci
npm ls puppeteer
npm ls jest
```

4. **Test Puppeteer directly:**
```javascript
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('Browser launched successfully');
  await browser.close();
})();
```

### 6. Quick Fixes to Try

#### Option A: Simplify Puppeteer Config
Edit `jest-puppeteer.config.js`:
```javascript
module.exports = {
  launch: {
    headless: true,
    args: ['--no-sandbox'],
  },
};
```

#### Option B: Skip Problematic Tests Temporarily
Add `.skip` to failing tests to isolate the issue:
```javascript
it.skip("problematic test", async () => {
  // test code
});
```

#### Option C: Increase Timeouts
Edit `jest.config.js`:
```javascript
testTimeout: 120000, // 2 minutes
```

### 7. Get Help

If issues persist, please provide:
1. The full error message from GitHub Actions
2. Which specific test is failing
3. Any error stack traces
4. Output of `npm ls` showing dependency versions
