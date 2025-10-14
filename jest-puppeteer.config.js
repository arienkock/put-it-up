module.exports = {
  launch: {
    // dumpio: true,
    // headless: false,
    // devtools: true,
    // slowMo: 20,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  },
};
