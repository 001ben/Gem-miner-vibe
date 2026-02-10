const { chromium } = require('playwright');

(async () => {
  console.log("Starting Local Playtest Verification...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const url = "http://localhost:8081/";
  console.log(`Navigating to local server: ${url}`);
  
  await page.goto(url);

  // Wait for scripts to load
  await page.waitForFunction(() => window.botController !== undefined, { timeout: 10000 });
  console.log("Game and Bot Controller loaded.");

  // Start simulation
  await page.evaluate(() => window.botController.start());
  console.log("Bot started. Simulating until $40 collected...");

  const startTime = Date.now();
  let currentMoney = 0;
  
  // Timeout after 60 seconds
  while (Date.now() - startTime < 60000) {
    const metrics = await page.evaluate(() => window.telemetry.getMetrics());
    if (metrics.money > currentMoney) {
      currentMoney = metrics.money;
      console.log(`Current Money: $${currentMoney}`);
    }
    if (currentMoney >= 40) {
        console.log("SUCCESS: Reached $40 target!");
        break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  const final = await page.evaluate(() => window.telemetry.getMetrics());
  console.log(`Final Collection Total: $${final.money}`);

  await browser.close();
  process.exit(final.money >= 40 ? 0 : 1);
})();
