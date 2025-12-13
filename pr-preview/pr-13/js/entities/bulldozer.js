import { state } from '../state.js';
import { Bodies, Composite, Body, world } from '../physics.js';
import { removeBodyMesh } from '../graphics.js';

let bulldozer;

export function getBulldozer() {
    return bulldozer;
}

export function createBulldozer() {
    let pos = { x: 0, y: 0 };
    let angle = 0;

    if (bulldozer) {
        pos = { x: bulldozer.position.x, y: bulldozer.position.y };
        angle = bulldozer.angle;
        // Remove meshes associated with old bulldozer parts
        bulldozer.parts.forEach(p => {
            removeBodyMesh(p.id);
        });
        Composite.remove(world, bulldozer);
    }

    const bodySize = 40 + (state.dozerLevel * 5);
    // Linear growth is fine, user complained about levels 3-4 stopping growth.
    // At Level 1: 40 + 5*1 = 45. Plow: 45*1.2 + 40 = 54 + 40 = 94.
    // Level 2: 94 + 40 = 134.
    // Level 3: 174.
    // Level 4: 214.
    // It should grow.
    // However, maybe visual scaling is capped? No.
    // Let's verify startXLeft uses this.
    const plowWidth = bodySize * 1.2 + (state.plowLevel * 40);
    const plowHeight = 10;

    const chassis = Bodies.rectangle(0, 0, bodySize, bodySize, { label: 'chassis' });
    const plowOffset = -(bodySize/2 + plowHeight/2 - 5);
    const plow = Bodies.rectangle(0, plowOffset, plowWidth, plowHeight, { label: 'plow' });

    let parts = [chassis, plow];

    if (state.plowLevel >= 3) {
        const wingLength = 30;
        const wingWidth = 10;
        // Angles: -135 deg for left (Up-Left), -45 deg for right (Up-Right)
        // This makes them flare outwards like a funnel.
        const angleLeft = -3 * Math.PI / 4;
        const angleRight = -Math.PI / 4;

        // Position adjustment:
        // We want the "start" of the wing to be at the corner of the plow.
        // Bodies.rectangle centers the body.
        // So center x = startX + (L/2 * cos(angle))
        // center y = startY + (L/2 * sin(angle))

        const startXLeft = -plowWidth / 2;
        const startYLeft = plowOffset;

        const lx = startXLeft + (wingLength/2) * Math.cos(angleLeft);
        const ly = startYLeft + (wingLength/2) * Math.sin(angleLeft);

        const leftWing = Bodies.rectangle(lx, ly, wingLength, wingWidth, {
            label: 'plow', // Same label as plow so graphics renders it similarly? Or new label?
            angle: angleLeft
        });

        const startXRight = plowWidth / 2;
        const startYRight = plowOffset;

        const rx = startXRight + (wingLength/2) * Math.cos(angleRight);
        const ry = startYRight + (wingLength/2) * Math.sin(angleRight);

        const rightWing = Bodies.rectangle(rx, ry, wingLength, wingWidth, {
            label: 'plow',
            angle: angleRight
        });

        parts.push(leftWing, rightWing);
    }

    bulldozer = Body.create({
        parts: parts,
        frictionAir: 0.15,
        restitution: 0.0,
        label: 'bulldozer'
    });

    Body.setPosition(bulldozer, pos);
    Body.setAngle(bulldozer, angle);
    Composite.add(world, bulldozer);
}
