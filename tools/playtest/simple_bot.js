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
        // Telemetry vector is relative to dozer position
        // Dozer heading is (angle - PI/2)
        // Vector angle is atan2(y, x)
        const targetAngle = Math.atan2(vector.y, vector.x);
        
        // We need the relative angle to the dozer's front (heading)
        // Matter.js dozer.angle is 0 when pointing Down (positive Y)
        // Subtract PI/2 because our model is rotated
        const dozer = window.bulldozer;
        if (!dozer) return 0;

        const currentHeading = dozer.angle + Math.PI/2; 
        let delta = targetAngle - currentHeading;

        while (delta <= -Math.PI) delta += 2 * Math.PI;
        while (delta > Math.PI) delta -= 2 * Math.PI;

        return delta;
    }

    function tick() {
        if (!window.telemetry || !window.bulldozer) return;

        const sensors = window.telemetry.getSensors();
        if (!sensors) return;

        // Priority 1: Nearest Gem
        const target = sensors.nearestGems[0];
        if (!target) {
            window.agentInput.set(0, 0);
            return;
        }

        const angleToTarget = getAngleTo(target.vector);
        
        let throttle = 0;
        let turn = 0;

        // Steering logic
        if (Math.abs(angleToTarget) > BOT_CONFIG.turnPrecision) {
            turn = angleToTarget > 0 ? 1 : -1;
        }

        // Throttle logic (slow down as we get closer or if we need to turn sharply)
        if (Math.abs(angleToTarget) < Math.PI / 2) {
            throttle = BOT_CONFIG.throttlePower;
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
