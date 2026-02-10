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
  console.log("\n--- Playtest Efficiency Report ---");
  console.log(`Duration: ${final.durationSeconds}s (${final.frameCounter} frames)`);
  console.log(`Final Money: $${final.money}`);
  console.log(`Gems Collected: ${final.gemCollectionCount}`);
  console.log(`Efficiency: ${(final.gemCollectionCount / (final.durationSeconds / 60)).toFixed(2)} gems/min`);
  
  console.log("\n--- Collection Timeline ---");
  if (final.collectionLog.length > 0) {
      final.collectionLog.forEach(event => {
          console.log(`[Frame ${String(event.frame).padStart(5)}] Collected $${event.gemValue} -> Total: $${event.money}`);
      });
  } else {
      console.log("No gems collected during this run.");
  }
  
  console.log("\n--- Physics Metrics ---");
  console.log(`Collisions: ${final.collisionCount}`);
  console.log(`Avg Speed: ${final.averageSpeed} px/s`);
  console.log(`Dist Traveled: ${final.distanceTraveled} px`);
  console.log("----------------------------------\n");

  await browser.close();
  process.exit(final.money >= 40 ? 0 : 1);
})();
