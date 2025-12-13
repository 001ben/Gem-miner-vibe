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
    const plowWidth = bodySize * 1.2 + (state.plowLevel * 15);
    const plowHeight = 15;

    const chassis = Bodies.rectangle(0, 0, bodySize, bodySize, { label: 'chassis' });
    const plowOffset = -(bodySize/2 + plowHeight/2 - 5);
    const plow = Bodies.rectangle(0, plowOffset, plowWidth, plowHeight, { label: 'plow' });

    bulldozer = Body.create({
        parts: [chassis, plow],
        frictionAir: 0.15,
        restitution: 0.0,
        label: 'bulldozer'
    });

    Body.setPosition(bulldozer, pos);
    Body.setAngle(bulldozer, angle);
    Composite.add(world, bulldozer);
}
