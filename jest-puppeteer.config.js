const isCI = process.env.CI === 'true';

module.exports = {
  launch: {
    // dumpio: true,
    headless: true,
    // devtools: true,
    // slowMo: 20,
    args: isCI ? [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ] : [],
  },
};
