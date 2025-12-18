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
        const baseSpeed = 0.004 * Math.pow(2.0, state.dozerLevel);
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

        if (turn !== 0) {
            Body.setAngle(bulldozer, bulldozer.angle + turn * turnSpeed);
            // Ensure angular velocity is zeroed out to prevent physics interference
            Body.setAngularVelocity(bulldozer, 0);
        }

        // Apply drive force
        if (throttle !== 0) {
            const forceMagnitude = throttle * baseSpeed;
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
