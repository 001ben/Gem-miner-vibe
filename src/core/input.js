import { state } from './state.js';
import { Body, Events, engine } from './physics.js';
import { getBulldozer } from '../entities/bulldozer.js';

export const keys = {};

const joystick = { active: false, x: 0, y: 0, originX: 0, originY: 0, isReversing: false, knob: null };

export function initInput() {
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    initJoystick();

    // Setup update loop for input
    Events.on(engine, 'beforeUpdate', () => {
        const bulldozer = getBulldozer();
        if (!bulldozer) return;

        // Car/Tank controls
        let throttle = 0;
        let turn = 0;

        // Keyboard
        if (keys['ArrowUp'] || keys['KeyW']) throttle += 1;
        if (keys['ArrowDown'] || keys['KeyS']) throttle -= 1;
        if (keys['ArrowLeft'] || keys['KeyA']) turn -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) turn += 1;

        // Increase base speed impact significantly per level
        // Power calculation for "juicier" upgrades: Force needs to scale faster than Mass
        // Mass scales by 1.5x, so Force must scale by ~2.0x to get ~33% speed increase per level
        // Increased base from 0.003 to 0.004 to help overcome increased friction/mass of thicker plow
        const turnSpeed = 0.04;

        if (joystick.active) {
            const targetAngle = Math.atan2(joystick.y, joystick.x);
            const magnitude = Math.sqrt(joystick.x*joystick.x + joystick.y*joystick.y);

            if (magnitude > 0.1) {
                const currentHeading = bulldozer.angle - Math.PI/2;
                let delta = targetAngle - currentHeading;
                while (delta <= -Math.PI) delta += 2*Math.PI;
                while (delta > Math.PI) delta -= 2*Math.PI;

                const absDelta = Math.abs(delta);
                const reverseThreshold = 3 * Math.PI / 4; // ~135 degrees
                const forwardThreshold = Math.PI / 2;     // 90 degrees

                if (!joystick.isReversing) {
                    if (absDelta > reverseThreshold) {
                         joystick.isReversing = true;
                    }
                } else {
                    if (absDelta < forwardThreshold) {
                         joystick.isReversing = false;
                    }
                }

                if (joystick.isReversing) {
                    // Reverse logic
                    throttle = -magnitude;
                    // Steer rear towards targetAngle (Front towards opposite)
                    let revDelta = (targetAngle + Math.PI) - currentHeading;
                    while (revDelta <= -Math.PI) revDelta += 2*Math.PI;
                    while (revDelta > Math.PI) revDelta -= 2*Math.PI;

                    turn = Math.max(-1, Math.min(1, revDelta * 2));

                    if (joystick.knob) joystick.knob.style.backgroundColor = 'rgba(255, 50, 50, 0.8)';
                } else {
                    // Forward logic
                    const turnFactor = Math.max(-1, Math.min(1, delta * 2));
                    turn = turnFactor;
                    throttle = magnitude;

                    if (joystick.knob) joystick.knob.style.backgroundColor = 'rgba(255, 152, 0, 0.8)';
                }
            }
        }

        // Use Angular Velocity for stable steering
        if (turn !== 0) {
            Body.setAngularVelocity(bulldozer, turn * turnSpeed);
        } else {
            // Dampen angular velocity when not steering
            Body.setAngularVelocity(bulldozer, bulldozer.angularVelocity * 0.9);
        }

        // Lateral Friction (Skid Damping)
        // With low frictionAir (0.02), we need to manually dampen lateral velocity
        // to prevent the bulldozer from drifting sideways like a hovercraft.
        const velocity = bulldozer.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        if (speed > 0.1) {
            // Calculate "Right" vector relative to bulldozer heading
            // Heading is (angle - PI/2).
            // Right is Heading + 90 deg = (angle - PI/2 + PI/2) = angle.
            // So Right vector is just (cos(angle), sin(angle)).
            const right = { x: Math.cos(bulldozer.angle), y: Math.sin(bulldozer.angle) };

            // Project velocity onto Right vector (Lateral Velocity)
            const lateralSpeed = velocity.x * right.x + velocity.y * right.y;

            // Apply opposing force to cancel lateral velocity
            // High damping factor for "snappy" turns
            // Apply opposing force to cancel lateral velocity
            // We use direct velocity modification for stability (avoiding force integrator oscillation)
            const lateralFriction = 0.15; // Dampen 15% of lateral speed per frame

            Body.setVelocity(bulldozer, {
                x: velocity.x - right.x * lateralSpeed * lateralFriction,
                y: velocity.y - right.y * lateralSpeed * lateralFriction
            });
        }

        // Apply drive force
        if (throttle !== 0) {
            // Refactored Physics Scaling (Iteration 2):
            // Problem: Pure `Mass * DesiredAccel` negates the weight of the plow completely.
            // We want the engine to be powerful, but a massive plow SHOULD reduce acceleration slightly
            // unless the engine is upgraded to match.

            // Solution: Calculate force based on the *Chassis* mass (which scales with engine level)
            // plus a partial factor of the total mass.
            // Or simpler: Use Total Mass but reduce Desired Accel.

            // Base Accel reduced to 0.0015 (slower start to feel weight)
            // Growth: +10% per level (1.1^Level)
            const baseAccel = 0.0015 * Math.pow(1.1, state.dozerLevel);

            // Load Factor: If the plow is massive (high mass), it should drag.
            // But since Mass is in the Force equation, physics handles F=ma.
            // If we provide F = m * a_desired, we get exactly a_desired.
            // To make "Load" matter, we shouldn't fully compensate for mass.

            // Let's use a "Power Rating" instead of Desired Accel.
            // Force = Power * Throttle.
            // Power scales with Engine Level.
            // Mass scales with Plow Level + Engine Level (Chassis).
            // This naturally means higher mass = lower accel if Power is constant.

            // Power Calculation Refactor: "Engine vs Plow"
            // Max Speed should increase with Engine Level (base Force increases).
            // Acceleration should depend on the difference between Engine and Plow levels.

            // 1. Calculate Base Power based on Engine Level
            // Tuning Iteration 3: "Weight & Inertia"
            // Previous formula was too aggressive (instant start/stop).
            // We removed Mass Compensation to let Mass actually reduce acceleration (F=ma).
            // We lowered frictionAir to 0.05 (in bulldozer.js), so we need less force for top speed,
            // but more time to get there.

            // Base Power: Lower base, Slower growth (1.20)
            // Lvl 1: ~0.002. Lvl 20: ~0.076.
            // Old was: Lvl 1 ~0.02. Lvl 20: ~4.0.
            let power = 0.002 * Math.pow(1.20, state.dozerLevel);

            // 2. Adjust for "Load" (Engine vs Plow difference)
            // Difference = Engine - Plow.
            const levelDiff = state.dozerLevel - state.plowLevel;
            const clampedDiff = Math.max(-2, Math.min(2, levelDiff));
            const loadFactor = 1.0 + (clampedDiff * 0.1);

            // Apply Load Factor
            power *= loadFactor;

            const forceMagnitude = throttle * power;

            const angle = bulldozer.angle - Math.PI/2;
            const force = {
                x: Math.cos(angle) * forceMagnitude,
                y: Math.sin(angle) * forceMagnitude
            };

            Body.applyForce(bulldozer, bulldozer.position, force);
        }
    });
}

function initJoystick() {
    const gameContainer = document.getElementById('game-container');
    const joystickZone = document.getElementById('joystick-zone');
    const joystickBase = document.getElementById('joystick-base');
    const joystickKnob = document.getElementById('joystick-knob');

    joystick.knob = joystickKnob;

    function showJoystick(x, y) {
        joystickZone.style.display = 'block';
        joystickBase.style.left = x + 'px';
        joystickBase.style.top = y + 'px';
        joystickKnob.style.transform = `translate(-50%, -50%) translate(0px, 0px)`;
        // Reset color
        joystickKnob.style.backgroundColor = 'rgba(255, 152, 0, 0.8)';
    }

    function updateJoystickVisual(dx, dy) {
        joystickKnob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
    }

    function hideJoystick() {
        joystickZone.style.display = 'none';
        // Reset color
        joystickKnob.style.backgroundColor = 'rgba(255, 152, 0, 0.8)';
    }

    gameContainer.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        joystick.active = true;
        joystick.originX = touch.clientX;
        joystick.originY = touch.clientY;
        joystick.x = 0;
        joystick.y = 0;
        joystick.isReversing = false;
        showJoystick(joystick.originX, joystick.originY);
    }, { passive: false });

    gameContainer.addEventListener('touchmove', e => {
        e.preventDefault();
        if (!joystick.active) return;
        const touch = e.touches[0];
        const dx = touch.clientX - joystick.originX;
        const dy = touch.clientY - joystick.originY;

        // Normalize and clamp
        const maxDist = 50;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);

        const moveX = Math.cos(angle) * clampedDist;
        const moveY = Math.sin(angle) * clampedDist;

        joystick.x = moveX / maxDist; // Normalized
        joystick.y = moveY / maxDist;

        updateJoystickVisual(moveX, moveY);
    }, { passive: false });

    gameContainer.addEventListener('touchend', e => {
        e.preventDefault();
        joystick.active = false;
        joystick.x = 0;
        joystick.y = 0;
        joystick.isReversing = false;
        hideJoystick();
    }, { passive: false });

    // Mouse drag for testing
    gameContainer.addEventListener('mousedown', e => {
        // Allow interacting with UI inputs
        if (e.target.tagName === 'INPUT' || e.target.closest('button')) return;
        if (e.target.closest('#game-ui')) return;
        joystick.active = true;
        joystick.originX = e.clientX;
        joystick.originY = e.clientY;
        joystick.x = 0;
        joystick.y = 0;
        joystick.isReversing = false;
        showJoystick(joystick.originX, joystick.originY);
    });
    window.addEventListener('mousemove', e => {
        if (!joystick.active) return;
        const dx = e.clientX - joystick.originX;
        const dy = e.clientY - joystick.originY;
        const maxDist = 50;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);

        const moveX = Math.cos(angle) * clampedDist;
        const moveY = Math.sin(angle) * clampedDist;

        joystick.x = moveX / maxDist;
        joystick.y = moveY / maxDist;

        updateJoystickVisual(moveX, moveY);
    });
    window.addEventListener('mouseup', () => {
        joystick.active = false;
        joystick.x = 0;
        joystick.y = 0;
        joystick.isReversing = false;
        hideJoystick();
    });
}
