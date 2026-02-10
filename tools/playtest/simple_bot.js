// Heuristic Bot for Gem Miner
// Uses the telemetry sensors to navigate the dozer.

console.log("simple_bot.js: Script started loading...");

(function() {
    console.log("simple_bot.js: IIFE executing...");
    
    // Matter.js Vector helper (local alias if window.Matter is loaded)
    const Vector = window.Matter ? window.Matter.Vector : {
        sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
        add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
        mult: (v, s) => ({ x: v.x * s, y: v.y * s }),
        div: (v, s) => ({ x: v.x / s, y: v.y / s }),
        magnitude: (v) => Math.sqrt(v.x * v.x + v.y * v.y)
    };

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

        if (sensors.nearestGems.length === 0) {
            window.agentInput.set(0, 0);
            return;
        }

        const nearestGem = sensors.nearestGems[0];
        const collector = sensors.collector;

        const toGem = nearestGem.vector;
        const toCollector = collector ? collector.vector : { x: 0, y: 500 }; 
        
        const gemToCollector = Vector.sub(toCollector, toGem);
        const gemToCollectorUnit = Vector.div(gemToCollector, Vector.magnitude(gemToCollector));
        
        const approachOffset = 80; 
        const behindGemPoint = Vector.sub(toGem, Vector.mult(gemToCollectorUnit, approachOffset));
        
        let targetVector;
        let mode = "APPROACH";
        let throttlePower = BOT_CONFIG.throttlePower;

        const dozerToGemUnit = Vector.div(toGem, Vector.magnitude(toGem));
        const pushAlignment = (dozerToGemUnit.x * gemToCollectorUnit.x + dozerToGemUnit.y * gemToCollectorUnit.y);

        if (pushAlignment > 0.85 && nearestGem.distance < approachOffset + 20) {
            targetVector = toCollector;
            throttlePower = 1.0;
            mode = "PUSH";
        } else {
            targetVector = behindGemPoint;
            if (Vector.magnitude(behindGemPoint) < 20) {
                targetVector = toGem;
            }
        }

        const angleToTarget = getAngleTo(targetVector);
        
        let throttle = 0;
        let turn = 0;

        const isStuck = metrics.durationSeconds > 2 && metrics.averageSpeed < 0.5;

        if (isStuck) {
            throttle = -0.6;
            turn = 1.0;
            mode = "STUCK_RECOVERY";
        } else {
            if (Math.abs(angleToTarget) > BOT_CONFIG.turnPrecision) {
                turn = Math.max(-1, Math.min(1, angleToTarget * 2));
            }

            if (Math.abs(angleToTarget) < Math.PI / 2) {
                throttle = throttlePower;
                if (Math.abs(angleToTarget) > Math.PI / 4) {
                    throttle *= 0.3;
                }
            } else {
                throttle = -0.3;
                turn = angleToTarget > 0 ? 1 : -1;
            }
        }

        // Log bot state every second (roughly)
        if (state.session.frameCounter % 60 === 0) {
            console.log(`[Bot] Mode: ${mode} | Target: ${mode === "PUSH" ? "Collector" : "Gem"} | Dist: ${nearestGem.distance.toFixed(1)} | Align: ${pushAlignment.toFixed(2)} | Turn: ${turn.toFixed(2)}`);
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
