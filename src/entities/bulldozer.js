import { state } from '../core/state.js';
import { Bodies, Composite, Body, world, CATEGORIES } from '../core/physics.js';
import { removeBodyMesh } from '../core/graphics.js';

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
    const plowWidth = bodySize * 1.2 + (state.plowLevel * 40);
    const plowHeight = 22; // Thicker than original (10) but not "weird" (30). Compromise.

    const chassis = Bodies.rectangle(0, 0, bodySize, bodySize, { label: 'chassis' });
    const plowOffset = -(bodySize/2 + plowHeight/2 + 15);
    const plow = Bodies.rectangle(0, plowOffset, plowWidth, plowHeight, { label: 'plow' });

    let parts = [chassis, plow];

    // ... [Wing logic stays same]
    if (state.plowLevel >= 3) {
        const wingLength = 40;
        const wingWidth = 15;
        const wingAngle = Math.PI / 8; // 22.5 degrees flare

        // Left Wing
        // Attach point: x = -plowWidth/2
        // Angle: Pointing Up (-PI/2) and slightly Left (-wingAngle)
        const angleLeft = -Math.PI/2 - wingAngle;
        
        // Calculate Center Position
        const lx = (-plowWidth / 2) + (wingLength / 2) * Math.cos(angleLeft);
        const ly = plowOffset + (wingLength / 2) * Math.sin(angleLeft);

        const leftWing = Bodies.rectangle(lx, ly, wingLength, wingWidth, {
            label: 'plow_wing',
            angle: angleLeft
        });
        
        // Right Wing
        // Angle: Pointing Up (-PI/2) and slightly Right (+wingAngle)
        const angleRight = -Math.PI/2 + wingAngle;
        
        const rx = (plowWidth / 2) + (wingLength / 2) * Math.cos(angleRight);
        const ry = plowOffset + (wingLength / 2) * Math.sin(angleRight);

        const rightWing = Bodies.rectangle(rx, ry, wingLength, wingWidth, {
            label: 'plow_wing',
            angle: angleRight
        });
        parts.push(leftWing, rightWing);
    }

    // Create a new parent body and set its parts
    // This is the canonical way to ensure rigidity in Matter.js
    bulldozer = Body.create({
        label: 'bulldozer',
        frictionAir: 0.15,
        restitution: 0.0,
        collisionFilter: {
            category: CATEGORIES.DOZER,
            mask: CATEGORIES.DEFAULT | CATEGORIES.GEM | CATEGORIES.WALL
        }
    });

    Body.setParts(bulldozer, parts);

    // Phase 3: Geometric Offset Correction
    // Store offsets for ALL parts relative to the CoM
    bulldozer.parts.forEach(part => {
        if (part === bulldozer) return;
        part.oOffset = {
            x: part.position.x - bulldozer.position.x,
            y: part.position.y - bulldozer.position.y
        };
        part.oAngle = part.angle - bulldozer.angle;
    });

    // Also explicitly store chassisOffset for the specialized renderer
    const chassisPart = bulldozer.parts.find(p => p.label === 'chassis');
    if (chassisPart) {
        bulldozer.chassisOffset = chassisPart.oOffset;
    }

    Body.setDensity(bulldozer, 0.001 * Math.pow(1.5, state.dozerLevel));
    Body.setPosition(bulldozer, pos);
    Body.setAngle(bulldozer, angle);

    Composite.add(world, bulldozer);
}