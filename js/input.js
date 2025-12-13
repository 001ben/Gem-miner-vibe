import { state } from './state.js';
import { Body, Events, engine } from './physics.js';
import { getBulldozer } from './entities/bulldozer.js';

export const keys = {};

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
        const baseSpeed = 0.003 * (1 + state.dozerLevel * 0.25);
        const turnSpeed = 0.04;

        if (joystick.active) {
            const targetAngle = Math.atan2(joystick.y, joystick.x);
            const magnitude = Math.sqrt(joystick.x*joystick.x + joystick.y*joystick.y);

            if (magnitude > 0.1) {
                const currentHeading = bulldozer.angle - Math.PI/2;
                let delta = targetAngle - currentHeading;
                while (delta <= -Math.PI) delta += 2*Math.PI;
                while (delta > Math.PI) delta -= 2*Math.PI;

                const turnFactor = Math.max(-1, Math.min(1, delta * 2));
                turn = turnFactor;
                throttle = magnitude;
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

const joystick = { active: false, x: 0, y: 0, originX: 0, originY: 0 };

function initJoystick() {
    const gameContainer = document.getElementById('game-container');
    const joystickZone = document.getElementById('joystick-zone');
    const joystickBase = document.getElementById('joystick-base');
    const joystickKnob = document.getElementById('joystick-knob');

    function showJoystick(x, y) {
        joystickZone.style.display = 'block';
        joystickBase.style.left = x + 'px';
        joystickBase.style.top = y + 'px';
        joystickKnob.style.transform = `translate(-50%, -50%) translate(0px, 0px)`;
    }

    function updateJoystickVisual(dx, dy) {
        joystickKnob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
    }

    function hideJoystick() {
        joystickZone.style.display = 'none';
    }

    gameContainer.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        joystick.active = true;
        joystick.originX = touch.clientX;
        joystick.originY = touch.clientY;
        joystick.x = 0;
        joystick.y = 0;
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
        hideJoystick();
    }, { passive: false });

    // Mouse drag for testing
    gameContainer.addEventListener('mousedown', e => {
        if (e.target.closest('#game-ui')) return;
        joystick.active = true;
        joystick.originX = e.clientX;
        joystick.originY = e.clientY;
        joystick.x = 0;
        joystick.y = 0;
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
        hideJoystick();
    });
}
