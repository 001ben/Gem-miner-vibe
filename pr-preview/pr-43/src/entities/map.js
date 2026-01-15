import { state } from '../core/state.js';
import { Bodies, Composite, world, CATEGORIES } from '../core/physics.js';

const zoneWidth = 1200; // Main corridor width (-600 to 600)
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
    const shopTopY = -400; // Top of the shop area

    const wallOptions = {
        isStatic: true,
        label: 'wall',
        render: { fillStyle: '#444' },
        collisionFilter: {
            category: CATEGORIES.WALL,
            mask: CATEGORIES.DEFAULT | CATEGORIES.DOZER | CATEGORIES.GEM
        }
    };

    // 1. Right Wall (Full length)
    // From maxY to minY. Center X = 600 + 50.
    const totalHeight = maxY - minY;
    const centerY = minY + totalHeight / 2;
    const right = Bodies.rectangle(zoneWidth/2 + wallThickness/2, centerY, wallThickness, totalHeight, wallOptions);
    walls.push(right);

    // 2. Bottom Wall (Covers Main + Shop)
    // Main: -600 to 600. Shop: -1200 to -600.
    // Total X range: -1200 to 600. Center: -300. Width: 1800.
    const bottom = Bodies.rectangle(-300, maxY + wallThickness/2, 1800 + 2*wallThickness, wallThickness, wallOptions);
    walls.push(bottom);

    // 3. Top Wall (Main Corridor only)
    // X range: -600 to 600.
    const top = Bodies.rectangle(0, minY - wallThickness/2, zoneWidth + 2*wallThickness, wallThickness, wallOptions);
    walls.push(top);

    // 4. Left Wall (Upper - Zone 2 & 3)
    // From shopTopY (-400) to minY (-3000).
    // X = -600 - 50.
    const upperLeftH = shopTopY - minY;
    const upperLeftY = minY + upperLeftH / 2;
    const leftUpper = Bodies.rectangle(-zoneWidth/2 - wallThickness/2, upperLeftY, wallThickness, upperLeftH, wallOptions);
    walls.push(leftUpper);

    // 5. Shop Outer Wall (Left)
    // From maxY (600) to shopTopY (-400).
    // X = -1200 - 50.
    const shopH = maxY - shopTopY;
    const shopY = shopTopY + shopH / 2;
    const shopLeft = Bodies.rectangle(-1200 - wallThickness/2, shopY, wallThickness, shopH, wallOptions);
    walls.push(shopLeft);

    // 6. Shop Top Cap
    // Horizontal wall blocking the top of the shop.
    // X range: -1200 to -600. Center: -900. Width: 600.
    const shopTop = Bodies.rectangle(-900, shopTopY - wallThickness/2, 600, wallThickness, wallOptions);
    walls.push(shopTop);

    // Gates
    const gateOptions = {
        isStatic: true,
        label: 'gate',
        render: { fillStyle: '#e74c3c' },
        collisionFilter: {
            category: CATEGORIES.WALL,
            mask: CATEGORIES.DEFAULT | CATEGORIES.DOZER | CATEGORIES.GEM
        }
    };

    if (state.areaLevel < 2) {
        // Gate 1 at Y = -600. Covers Main Corridor (-600 to 600).
        const gate1 = Bodies.rectangle(0, -600, zoneWidth, 60, gateOptions);
        gates.push(gate1);
    }

    if (state.areaLevel < 3) {
        // Gate 2 at Y = -1800.
        const gate2 = Bodies.rectangle(0, -1800, zoneWidth, 60, gateOptions);
        gates.push(gate2);
    }

    Composite.add(world, [...walls, ...gates]);
}
