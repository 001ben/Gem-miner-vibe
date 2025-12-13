import { state } from '../state.js';
import { Bodies, Composite, world } from '../physics.js';

const mapWidth = 1200;
const wallThickness = 100;
const walls = [];
const gates = [];

export function createMap() {
    Composite.remove(world, walls);
    Composite.remove(world, gates);
    walls.length = 0;
    gates.length = 0;

    const minY = -3000;
    const maxY = 600;
    const totalHeight = maxY - minY;
    const centerY = minY + totalHeight / 2;

    const wallOptions = { isStatic: true, label: 'wall', render: { fillStyle: '#444' } };

    // Outer Walls
    const left = Bodies.rectangle(-mapWidth/2 - wallThickness/2, centerY, wallThickness, totalHeight, wallOptions);
    const right = Bodies.rectangle(mapWidth/2 + wallThickness/2, centerY, wallThickness, totalHeight, wallOptions);
    const top = Bodies.rectangle(0, minY - wallThickness/2, mapWidth + 2*wallThickness, wallThickness, wallOptions);
    const bottom = Bodies.rectangle(0, maxY + wallThickness/2, mapWidth + 2*wallThickness, wallThickness, wallOptions);

    walls.push(left, right, top, bottom);

    // Gates
    if (state.areaLevel < 2) {
        const gate1 = Bodies.rectangle(0, -600, mapWidth, 60, {
            isStatic: true, label: 'gate', render: { fillStyle: '#e74c3c' }
        });
        gates.push(gate1);
    }

    if (state.areaLevel < 3) {
        const gate2 = Bodies.rectangle(0, -1800, mapWidth, 60, {
            isStatic: true, label: 'gate', render: { fillStyle: '#e74c3c' }
        });
        gates.push(gate2);
    }

    Composite.add(world, [...walls, ...gates]);
}
