import { state } from '../state.js';
import { Bodies, Composite, Body, world, CATEGORIES } from '../physics.js';
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
    const plowHeight = 22; // Thicker than original (10) but not "weird" (30). Compromise.

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
        label: 'bulldozer',
        collisionFilter: {
            category: CATEGORIES.DOZER,
            // Collides with Default, Gems, Walls. NOT Conveyors.
            mask: CATEGORIES.DEFAULT | CATEGORIES.GEM | CATEGORIES.WALL
        }
    });

    // Explicitly set density to ensure it overrides part defaults
    Body.setDensity(bulldozer, 0.001 * Math.pow(1.5, state.dozerLevel));

    Body.setPosition(bulldozer, pos);
    Body.setAngle(bulldozer, angle);

    // Store relative offsets for manual rigidity enforcement
    bulldozer.parts.forEach(part => {
        if (part === bulldozer) return; // Skip self
        // Calculate relative position in unrotated body space
        // pos = body.pos + rotate(offset)
        // offset = rotateBack(part.pos - body.pos)
        const dx = part.position.x - bulldozer.position.x;
        const dy = part.position.y - bulldozer.position.y;

        // Rotate back by -body.angle
        const c = Math.cos(-bulldozer.angle);
        const s = Math.sin(-bulldozer.angle);

        part.oOffset = {
            x: dx * c - dy * s,
            y: dx * s + dy * c
        };
        part.oAngle = part.angle - bulldozer.angle;
    });

    Composite.add(world, bulldozer);
}

export function enforceBulldozerRigidity() {
    if (!bulldozer) return;

    const body = bulldozer;
    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);

    body.parts.forEach(part => {
        if (part === body) return;
        if (!part.oOffset) return;

        // Desired position
        // pos = body.pos + rotate(offset)
        const ox = part.oOffset.x;
        const oy = part.oOffset.y;

        const rotatedX = ox * c - oy * s;
        const rotatedY = ox * s + oy * c;

        const desiredX = body.position.x + rotatedX;
        const desiredY = body.position.y + rotatedY;
        const desiredAngle = body.angle + part.oAngle;

        // Force position (snap)
        // We use Body.setPosition/Angle which updates physics properties
        // This fights the drift
        Body.setPosition(part, { x: desiredX, y: desiredY });
        Body.setAngle(part, desiredAngle);

        // Also sync velocity to prevent fighting?
        // Body.setVelocity(part, body.velocity);
        // Body.setAngularVelocity(part, body.angularVelocity);
    });
}
