const isCI = process.env.CI === 'true';

module.exports = {
  launch: {
    // dumpio: true,
    headless: true,
    // devtools: true,
    // slowMo: 20,
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
  },
};
