const Matter = require('matter-js');
const state = { dozerLevel: 5, plowLevel: 5, collectorLevel: 2 };

const engine = Matter.Engine.create();
engine.positionIterations = 20;
engine.velocityIterations = 20;
const world = engine.world;
engine.gravity.y = 0;

const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;

const CATEGORIES = { DEFAULT: 0x0001, DOZER: 0x0002, GEM: 0x0004, CONVEYOR: 0x0008, WALL: 0x0010 };

// ---------------------------------------------------------
// REPRO 2: WING RIGIDITY (LOWER DENSITY)
// ---------------------------------------------------------
console.log("\n--- Starting Wing Rigidity Test (Lower Density) ---");

const bodySize = 40 + (state.dozerLevel * 5);
const plowWidth = bodySize * 1.2 + (state.plowLevel * 40);
const plowHeight = 10;

// Cap density at 0.005 (5x default) instead of 0.008?
// Or even 0.002.
const targetDensity = 0.002;

const chassis = Bodies.rectangle(0, 0, bodySize, bodySize, { label: 'chassis', density: targetDensity });
const plowOffset = -(bodySize/2 + plowHeight/2 - 5);
const plow = Bodies.rectangle(0, plowOffset, plowWidth, plowHeight, { label: 'plow', density: targetDensity });

const wingLength = 30;
const wingWidth = 10;
const angleLeft = -3 * Math.PI / 4;
const startXLeft = -plowWidth / 2;
const startYLeft = plowOffset;
const lx = startXLeft + (wingLength/2) * Math.cos(angleLeft);
const ly = startYLeft + (wingLength/2) * Math.sin(angleLeft);
const leftWing = Bodies.rectangle(lx, ly, wingLength, wingWidth, { label: 'plow', angle: angleLeft, density: targetDensity });

const parts = [chassis, plow, leftWing];
const bulldozer = Body.create({
    parts: parts,
    label: 'bulldozer',
    collisionFilter: { category: CATEGORIES.DOZER, mask: CATEGORIES.DEFAULT | CATEGORIES.GEM | CATEGORIES.WALL }
});

Composite.add(world, bulldozer);

const wall = Bodies.rectangle(-100, plowOffset - 20, 50, 200, { isStatic: true, label: 'wall', collisionFilter: { category: CATEGORIES.WALL, mask: CATEGORIES.DOZER } });
Composite.add(world, wall);

Body.setPosition(bulldozer, { x: 0, y: 0 });
const pushForce = { x: -0.5, y: 0 };
// Adjust force to match lower mass for same accel?
// Old mass ~55. New mass ~15?
// F = 0.5. a = 0.5/15 = 0.033.
// Old a = 0.5/55 = 0.01.
// So this is 3x violent collision.
// Let's reduce force to keep 'a' similar? No, let's keep Force high to stress test.

console.log(`Dozer Mass: ${bulldozer.mass.toFixed(2)}`);
const initWingPos = { x: leftWing.position.x - bulldozer.position.x, y: leftWing.position.y - bulldozer.position.y };

for (let i = 0; i < 60; i++) {
    Body.applyForce(bulldozer, bulldozer.position, pushForce);
    Matter.Engine.update(engine, 1000/60);
    const currentRelX = leftWing.position.x - bulldozer.position.x;
    const currentRelY = leftWing.position.y - bulldozer.position.y;
    const drift = Math.sqrt(Math.pow(currentRelX - initWingPos.x, 2) + Math.pow(currentRelY - initWingPos.y, 2));
    if (i % 10 === 0) console.log(`Tick ${i}: Drift = ${drift.toFixed(5)}`);
}
