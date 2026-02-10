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

    // New Scaling Logic: Match the visual scaling of BulldozerRenderer
    // Visual Scale = 1.0 + (state.dozerLevel - 1) * 0.15
    const visualScale = 1.0 + (state.dozerLevel - 1) * 0.15;

    // Chassis Size
    // Base 45 approximates Level 1 of previous formula (40 + 5)
    const bodySize = 45 * visualScale;

    // Plow Dimensions
    // Base Width Logic: 26 + (Lvl * 14) * 1.5. Lvl 1 ~ 60.
    // We multiply by visualScale to ensure the plow grows with the chassis size visually
    const basePlowWidth = (26 + (state.plowLevel * 14)) * 1.5;
    const plowWidth = basePlowWidth * visualScale;

    // Height also scales
    const plowHeight = 22 * visualScale;

    // Plow Offset
    // Matches the renderer's local zOffset of -4.2 scaled by the global scale 10.0 => -42.0 base world units.
    const plowOffset = -42 * visualScale;

    const chassis = Bodies.rectangle(0, 0, bodySize, bodySize, { label: 'chassis' });
    const plow = Bodies.rectangle(0, plowOffset, plowWidth, plowHeight, { label: 'plow' });

    let parts = [chassis, plow];

    // Wing Logic
    if (state.plowLevel >= 3) {
        // Wings also scale with plow level to look proportional
        const scaleFactor = 1.0 + (state.plowLevel - 3) * 0.1;

        // Apply BOTH scale factors (Plow Level scaling + Dozer Visual scaling)
        const wingLength = 40 * scaleFactor * visualScale;
        const wingWidth = 15 * scaleFactor * visualScale;
        const wingAngle = Math.PI / 8; // 22.5 degrees flare

        // Left Wing
        // Attach point: x = -plowWidth/2
        // Angle: Pointing Up (-PI/2) and slightly Left (-wingAngle)
        const angleLeft = -Math.PI/2 - wingAngle;
        
        // Calculate Center Position
        // Overlap by 10 units scaled to ensure visual/physical continuity
        const overlap = 10 * visualScale;
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
