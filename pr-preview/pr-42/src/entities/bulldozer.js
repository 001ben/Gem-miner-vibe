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
    // Adjusted Scaling: Increase plow width growth to +8 (was +5 implicitly in previous logic, now explicit)
    // Previous: bodySize * 1.2 + (Lvl * 40)? No, wait.
    // Old logic: 45 + (Lvl * 5).
    // Current logic (above): bodySize * 1.2 + (Lvl * 40). That seems huge already?
    // Let's re-read the plan: "Increase width scaling to +8 per level".
    // If we use the formula `Base + (Level * 8) * Scale`.

    // Let's stick to the visual "Massive" look.
    // Width = Base (60) + (Level * 8 * 2).
    const plowWidth = (60 + (state.plowLevel * 16)) * 1.5;
    const plowHeight = 22;

    const chassis = Bodies.rectangle(0, 0, bodySize, bodySize, { label: 'chassis' });
    const plowOffset = -(bodySize/2 + plowHeight/2 + 15);
    const plow = Bodies.rectangle(0, plowOffset, plowWidth, plowHeight, { label: 'plow' });

    let parts = [chassis, plow];

    // Wing Logic
    if (state.plowLevel >= 3) {
        // Wings also scale with plow level to look proportional
        const scaleFactor = 1.0 + (state.plowLevel - 3) * 0.1;
        const wingLength = 40 * scaleFactor;
        const wingWidth = 15 * scaleFactor;
        const wingAngle = Math.PI / 8; // 22.5 degrees flare

        // Left Wing
        // Attach point: x = -plowWidth/2
        // Angle: Pointing Up (-PI/2) and slightly Left (-wingAngle)
        const angleLeft = -Math.PI/2 - wingAngle;
        
        // Calculate Center Position
        // Overlap by 10 units to ensure visual/physical continuity and seal the gap
        const overlap = 10;
        const lx = (-plowWidth / 2 + overlap) + (wingLength / 2) * Math.cos(angleLeft);
        const ly = plowOffset + (wingLength / 2) * Math.sin(angleLeft);

        const leftWing = Bodies.rectangle(lx, ly, wingLength, wingWidth, {
            label: 'plow_wing',
            angle: angleLeft
        });
        
        // Right Wing
        // Angle: Pointing Up (-PI/2) and slightly Right (+wingAngle)
        const angleRight = -Math.PI/2 + wingAngle;
        
        const rx = (plowWidth / 2 - overlap) + (wingLength / 2) * Math.cos(angleRight);
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
        frictionAir: 0.02,
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

    // Refactored Physics Scaling:
    // Use Linear Density scaling instead of Exponential to prevent "Mass Explosion"
    // Base Density 0.002 + small increment per level for "heaviness" feel without ruining physics.
    const density = 0.002 + (state.dozerLevel * 0.0001);
    Body.setDensity(bulldozer, density);

    Body.setPosition(bulldozer, pos);
    Body.setAngle(bulldozer, angle);

    Composite.add(world, bulldozer);
}
