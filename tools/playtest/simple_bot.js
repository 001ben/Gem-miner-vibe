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
        
        // REFINEMENT: Dynamic approach distance based on wall proximity
        // Map bounds approx: -600 to 600 X, -3000 to 500 Y (based on map.js)
        const dozerPos = window.bulldozer.position;
        const distToWallX = 600 - Math.abs(dozerPos.x);
        const distToWallY = Math.min(Math.abs(dozerPos.y - 500), Math.abs(dozerPos.y + 3000));
        const nearWall = distToWallX < 100 || distToWallY < 100;

        // If near wall, use tighter approach to avoid backing into it
        const approachOffset = nearWall ? 50 : 100; 
        const behindGemPoint = Vector.sub(toGem, Vector.mult(gemToCollectorUnit, approachOffset));
        
        let targetVector;
        let mode = "APPROACH";
        let throttlePower = BOT_CONFIG.throttlePower;

        const dozerToGemUnit = Vector.div(toGem, Vector.magnitude(toGem));
        const pushAlignment = (dozerToGemUnit.x * gemToCollectorUnit.x + dozerToGemUnit.y * gemToCollectorUnit.y);

        // STUCK LOGIC: If we've been in same mode with low speed
        if (!window.botStuckTimer) window.botStuckTimer = 0;
        if (parseFloat(metrics.averageSpeed) < 0.3) {
            window.botStuckTimer++;
        } else {
            window.botStuckTimer = 0;
        }

        const isStuck = window.botStuckTimer > 30; // ~3 seconds of no movement

        if (isStuck) {
            targetVector = { x: -toGem.x, y: -toGem.y }; // Target opposite of gem to back away
            throttlePower = -0.6;
            mode = "STUCK_RECOVERY";
        } else if (pushAlignment > 0.85 && nearestGem.distance < approachOffset + 20) {
            targetVector = toCollector;
            throttlePower = 1.0;
            mode = "PUSH";
        } else {
            targetVector = behindGemPoint;
            // If the flank point is unreachable or we are over it, target the gem but slow
            if (Vector.magnitude(behindGemPoint) < 30) {
                targetVector = toGem;
                throttlePower *= 0.5;
            }
        }

        const angleToTarget = getAngleTo(targetVector);
        let throttle = 0;
        let turn = 0;

        // Steering: More aggressive turn if far off
        turn = Math.max(-1, Math.min(1, angleToTarget * 2.5));

        if (Math.abs(angleToTarget) < Math.PI / 2) {
            throttle = throttlePower;
            if (Math.abs(angleToTarget) > Math.PI / 4) {
                throttle *= 0.3; // Brake hard for turns
            }
        } else {
            // Target is behind us
            throttle = -0.4;
            turn = -turn; // Reverse steering
        }

        // Log bot state every 10 ticks (~1 second)
        if (!window.botLogCounter) window.botLogCounter = 0;
        window.botLogCounter++;
        
        if (window.botLogCounter % 10 === 0) {
            console.log(`[Bot] Mode: ${mode} | Target: ${mode === "PUSH" ? "Collector" : "Gem"} | Dist: ${nearestGem.distance.toFixed(1)} | Align: ${pushAlignment.toFixed(2)} | StuckTimer: ${window.botStuckTimer}`);
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
