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

        // Vector to gem and vector from gem to collector
        const toGem = nearestGem.vector;
        const toCollector = collector ? collector.vector : { x: 0, y: 500 }; // Default south if no collector
        
        // 1. Calculate the ideal "Push Vector"
        // We want to be at a position P such that P -> Gem -> Collector is a straight line.
        const gemToCollector = Vector.sub(toCollector, toGem);
        const gemToCollectorUnit = Vector.div(gemToCollector, Vector.magnitude(gemToCollector));
        
        // Target point is slightly behind the gem (relative to collector)
        const approachOffset = 80; // Distance to stay behind gem
        const behindGemPoint = Vector.sub(toGem, Vector.mult(gemToCollectorUnit, approachOffset));
        
        let targetVector;
        let throttlePower = BOT_CONFIG.throttlePower;

        // 2. State Machine: Approach vs Push
        // If we are already behind the gem (dot product check), push through.
        // Otherwise, navigate to the behindGemPoint.
        
        const dozerToGemUnit = Vector.div(toGem, Vector.magnitude(toGem));
        const pushAlignment = (dozerToGemUnit.x * gemToCollectorUnit.x + dozerToGemUnit.y * gemToCollectorUnit.y);

        if (pushAlignment > 0.85 && nearestGem.distance < approachOffset + 20) {
            // WE ARE LINED UP: Drive toward collector
            targetVector = toCollector;
            throttlePower = 1.0;
        } else {
            // NEED TO REPOSITION: Drive to the point behind the gem
            targetVector = behindGemPoint;
            
            // If the point is very close, just face the gem
            if (Vector.magnitude(behindGemPoint) < 20) {
                targetVector = toGem;
            }
        }

        const angleToTarget = getAngleTo(targetVector);
        
        let throttle = 0;
        let turn = 0;

        // Anti-stuck: If throttled but not moving
        const isStuck = metrics.durationSeconds > 2 && metrics.averageSpeed < 0.5;

        if (isStuck) {
            throttle = -0.6;
            turn = 1.0; // Hard turn out
        } else {
            // Steering logic: Proportional turning
            if (Math.abs(angleToTarget) > BOT_CONFIG.turnPrecision) {
                turn = Math.max(-1, Math.min(1, angleToTarget * 2));
            }

            // Throttle logic
            if (Math.abs(angleToTarget) < Math.PI / 2) {
                throttle = throttlePower;
                // Slow down for tight turns to avoid orbiting
                if (Math.abs(angleToTarget) > Math.PI / 4) {
                    throttle *= 0.3;
                }
            } else {
                // If target is behind us, back up and turn
                throttle = -0.3;
                turn = angleToTarget > 0 ? 1 : -1;
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
