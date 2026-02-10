// Heuristic Bot for Gem Miner
// Uses the telemetry sensors to navigate the dozer.

console.log("simple_bot.js: Script started loading...");

(function() {
    console.log("simple_bot.js: IIFE executing...");
    const BOT_CONFIG = {
        targetThreshold: 50,
        turnPrecision: 0.1,
        throttlePower: 0.8
    };

    let botInterval = null;

    function getAngleTo(vector) {
        const dozer = window.bulldozer;
        if (!dozer) return 0;

        // targetAngle is absolute world angle of the vector
        const targetAngle = Math.atan2(vector.y, vector.x);
        
        // currentHeading is absolute world angle the dozer is facing
        // In input.js, force is applied at (angle - PI/2)
        const currentHeading = dozer.angle - Math.PI/2; 
        
        let delta = targetAngle - currentHeading;

        while (delta <= -Math.PI) delta += 2 * Math.PI;
        while (delta > Math.PI) delta -= 2 * Math.PI;

        return delta;
    }

    function tick() {
        if (!window.telemetry || !window.bulldozer) return;

        const sensors = window.telemetry.getSensors();
        const metrics = window.telemetry.getMetrics();
        if (!sensors || !metrics) return;

        // Anti-stuck logic: If speed is very low but throttle is high, we might be stuck
        const isStuck = metrics.averageSpeed < 0.2 && metrics.durationSeconds > 5;
        
        if (sensors.nearestGems.length === 0) {
            window.agentInput.set(0, 0);
            return;
        }

        const nearestGem = sensors.nearestGems[0];
        const collector = sensors.collector;

        let targetVector = nearestGem.vector;
        let throttlePower = BOT_CONFIG.throttlePower;

        // Pushing Logic: If near gem, target the collector
        if (nearestGem.distance < 60 && collector) {
            targetVector = collector.vector;
            throttlePower = 1.0; 
        }

        const angleToTarget = getAngleTo(targetVector);
        
        let throttle = 0;
        let turn = 0;

        // If stuck, reverse and turn sharply to reposition
        if (isStuck) {
            throttle = -0.5;
            turn = 1.0;
        } else {
            // Steering logic
            if (Math.abs(angleToTarget) > BOT_CONFIG.turnPrecision) {
                turn = angleToTarget > 0 ? 1 : -1;
            }

            // Throttle logic
            if (Math.abs(angleToTarget) < Math.PI / 2) {
                throttle = throttlePower;
                // Slower for tight turns
                if (Math.abs(angleToTarget) > Math.PI / 4) {
                    throttle *= 0.4;
                }
            } else {
                // If target is behind us, slow turn in place
                throttle = -0.2;
            }
        }

        window.agentInput.set(throttle, turn);
    }

    window.botController = {
        start: () => {
            if (botInterval) return;
            console.log("Bot Controller: Starting...");
            botInterval = setInterval(tick, 100);
        },
        stop: () => {
            console.log("Bot Controller: Stopping...");
            clearInterval(botInterval);
            botInterval = null;
            window.agentInput.reset();
        },
        isActive: () => !!botInterval
    };
    console.log("simple_bot.js: window.botController assigned.", window.botController);
})();
