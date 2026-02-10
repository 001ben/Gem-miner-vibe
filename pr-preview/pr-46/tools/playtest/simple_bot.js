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

        // Decision Engine: Gem vs Collector
        if (sensors.nearestGems.length === 0) {
            window.agentInput.set(0, 0);
            return;
        }

        const nearestGem = sensors.nearestGems[0];
        const collector = sensors.collector;

        let targetVector = nearestGem.vector;
        let throttlePower = BOT_CONFIG.throttlePower;

        // LOGIC REFINEMENT: 
        // 1. If we are near a gem, check if the gem is "between" us and the collector.
        // 2. If it is, target the collector to push it through.
        // 3. If not, we need to "flank" the gem to get behind it.
        
        if (nearestGem.distance < 80 && collector) {
            // Vector from dozer to collector
            const toCollector = collector.vector;
            // Vector from dozer to gem
            const toGem = nearestGem.vector;
            
            // Dot product to see if gem is in same general direction as collector
            const dot = (toCollector.x * toGem.x + toCollector.y * toGem.y) / 
                        (Vector.magnitude(toCollector) * Vector.magnitude(toGem));
            
            // If dot product is high (> 0.8), gem is roughly between us and collector
            if (dot > 0.8) {
                targetVector = toCollector;
                throttlePower = 1.0;
            } else {
                // FLANKING: We need to get behind the gem.
                // Target a point slightly "behind" the gem relative to the collector
                const gemToCollector = Vector.sub(collector.vector, nearestGem.vector);
                const gemToCollectorUnit = Vector.div(gemToCollector, Vector.magnitude(gemToCollector));
                
                // Point behind gem = gemPosition - (unitVector * offset)
                // Since everything is relative to dozer, target = toGem - (unit * 60)
                const flankPoint = Vector.sub(toGem, Vector.mult(gemToCollectorUnit, 60));
                targetVector = flankPoint;
            }
        }

        const angleToTarget = getAngleTo(targetVector);
        
        let throttle = 0;
        let turn = 0;

        // Steering logic
        if (Math.abs(angleToTarget) > BOT_CONFIG.turnPrecision) {
            turn = angleToTarget > 0 ? 1 : -1;
        }

        // Throttle logic
        if (Math.abs(angleToTarget) < Math.PI / 2) {
            throttle = throttlePower;
            if (Math.abs(angleToTarget) > Math.PI / 4) {
                throttle *= 0.4;
            }
        } else {
            // If target is behind us, slow turn in place (back up slightly)
            throttle = -0.2;
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
