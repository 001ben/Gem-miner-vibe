// Heuristic Bot for Gem Miner
// Uses the telemetry sensors to navigate the dozer.

(function() {
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
        if (!sensors) return;

        // Decision Engine: Gem vs Collector
        // If we have no gems, stop.
        if (sensors.nearestGems.length === 0) {
            window.agentInput.set(0, 0);
            return;
        }

        // Logic: If we are "behind" the nearest gem relative to the collector, push it.
        // For this simple heuristic, we'll just alternate: 
        // 1. If not near a gem, go to nearest gem.
        // 2. If we are touching/very near a gem, head toward the collector.
        
        const nearestGem = sensors.nearestGems[0];
        const collector = sensors.collector;

        let targetVector = nearestGem.vector;
        let throttlePower = BOT_CONFIG.throttlePower;

        // If we are very close to a gem (< 40px), and we know where the collector is,
        // switch target to the collector to "push" the gem toward it.
        if (nearestGem.distance < 40 && collector) {
            targetVector = collector.vector;
            // Full power when pushing!
            throttlePower = 1.0; 
        }

        const angleToTarget = getAngleTo(targetVector);
        
        let throttle = 0;
        let turn = 0;

        // Steering logic
        if (Math.abs(angleToTarget) > BOT_CONFIG.turnPrecision) {
            turn = angleToTarget > 0 ? 1 : -1;
        }

        // Throttle logic (slow down for sharp turns)
        if (Math.abs(angleToTarget) < Math.PI / 2) {
            throttle = throttlePower;
            if (Math.abs(angleToTarget) > Math.PI / 4) {
                throttle *= 0.5;
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
})();
