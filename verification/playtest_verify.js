const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log("Starting Playtest Verification...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Use the live PR preview URL to verify the actual build
  const url = "https://001ben.github.io/Gem-miner-vibe/pr-preview/pr-46/";
  console.log(`Navigating to: ${url}`);
  
  await page.goto(url);

  // Wait for the game to initialize
  await page.waitForFunction(() => window.botController !== undefined, { timeout: 30000 });
  console.log("Game initialized and Bot Controller detected.");

  // Start the bot
  await page.evaluate(() => window.botController.start());
  console.log("Bot started. Running simulation for 30 seconds...");

  // Monitor money for 30 seconds
  const startTime = Date.now();
  let maxMoney = 0;
  
  while (Date.now() - startTime < 30000) {
    const metrics = await page.evaluate(() => window.telemetry.getMetrics());
    if (metrics.money > maxMoney) {
      maxMoney = metrics.money;
      console.log(`Current Money: $${maxMoney} (Gems: ${metrics.gemCollectionCount})`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  const finalMetrics = await page.evaluate(() => window.telemetry.getMetrics());
  console.log("--- Playtest Results ---");
  console.log(`Final Money: $${finalMetrics.money}`);
  console.log(`Gems Collected: ${finalMetrics.gemCollectionCount}`);
  console.log(`Distance Traveled: ${finalMetrics.distanceTraveled}px`);
  console.log(`Collisions: ${finalMetrics.collisionCount}`);

  if (finalMetrics.money > 0) {
    console.log("SUCCESS: Bot successfully collected money!");
  } else {
    console.log("FAILURE: Bot failed to collect any money in 30 seconds.");
    process.exit(1);
  }

  await browser.close();
})();
