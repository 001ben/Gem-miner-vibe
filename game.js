// Game state
let money = 0;
let dozerLevel = 1;
let plowLevel = 1;
let collectorLevel = 1;
let areaLevel = 1;

const costs = {
    dozer: 100,
    plow: 100,
    collector: 150,
    area: 500
};

// Physics aliases
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Vector = Matter.Vector,
      Body = Matter.Body;

// Init physics
const engine = Engine.create();
const world = engine.world;

// Disable gravity for top-down view
engine.gravity.y = 0;

// Render
const render = Render.create({
    element: document.getElementById('game-container'),
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: '#333'
    }
});

// Walls
const walls = [];
const wallThickness = 50;
let width = window.innerWidth;
let height = window.innerHeight;

function createWalls() {
    Composite.remove(world, walls);
    walls.length = 0;

    const areaWidth = Math.min(width - 100, 800 + (areaLevel - 1) * 400);
    const areaHeight = Math.min(height - 100, 600 + (areaLevel - 1) * 300);

    const centerX = width / 2;
    const centerY = height / 2;

    const top = Bodies.rectangle(centerX, centerY - areaHeight/2 - wallThickness/2, areaWidth + 2*wallThickness, wallThickness, { isStatic: true, render: { fillStyle: '#555' } });
    const bottom = Bodies.rectangle(centerX, centerY + areaHeight/2 + wallThickness/2, areaWidth + 2*wallThickness, wallThickness, { isStatic: true, render: { fillStyle: '#555' } });
    const left = Bodies.rectangle(centerX - areaWidth/2 - wallThickness/2, centerY, wallThickness, areaHeight, { isStatic: true, render: { fillStyle: '#555' } });
    const right = Bodies.rectangle(centerX + areaWidth/2 + wallThickness/2, centerY, wallThickness, areaHeight, { isStatic: true, render: { fillStyle: '#555' } });

    walls.push(top, bottom, left, right);
    Composite.add(world, walls);
}

// Bulldozer
let bulldozer;

function createBulldozer() {
    let pos = { x: width/2, y: height/2 };
    let angle = 0; // Facing up (Constructed at angle 0 facing up)

    if (bulldozer) {
        pos = { x: bulldozer.position.x, y: bulldozer.position.y };
        angle = bulldozer.angle;
        Composite.remove(world, bulldozer);
    }

    // Body size
    const bodySize = 40 + (dozerLevel * 5); // Base size

    // Plow size
    // Plow width should be wider than body generally
    const plowWidth = bodySize * 1.2 + (plowLevel * 10);
    const plowHeight = 15 + (plowLevel * 2);

    // Parts creation
    // We position them relative to (0,0).
    // Body centered at (0, 0)
    // Plow in front (Up is -y in screen, but let's define local coordinates)
    // Let's say forward is +y in local coords for simplicity of construction, then we rotate.
    // Actually standard matter rects are centered.

    // Main Chassis
    const chassis = Bodies.rectangle(0, 0, bodySize, bodySize, {
        render: {
            sprite: {
                texture: 'assets/bulldozer.svg',
                xScale: bodySize / 64,
                yScale: bodySize / 64
            }
        }
    });

    // Plow
    // Positioned in front. If 'front' is Up (negative Y on screen), relative to chassis.
    // Distance from center = bodySize/2 + plowHeight/2
    const plowOffset = -(bodySize/2 + plowHeight/2 - 5); // Overlap slightly
    const plow = Bodies.rectangle(0, plowOffset, plowWidth, plowHeight, {
        render: {
            fillStyle: '#e67e22',
            strokeStyle: '#d35400',
            lineWidth: 2
        }
    });

    bulldozer = Body.create({
        parts: [chassis, plow],
        frictionAir: 0.15, // Higher friction for slower movement/stopping
        restitution: 0.0,  // No bounce
        label: 'bulldozer'
    });

    Body.setPosition(bulldozer, pos);
    Body.setAngle(bulldozer, angle);
    Composite.add(world, bulldozer);
}

// Collector
let collector;

function createCollector() {
    if (collector) Composite.remove(world, collector);

    const size = 60 + (collectorLevel * 20);
    const areaHeight = Math.min(height - 100, 600 + (areaLevel - 1) * 300);
    const centerY = height / 2;
    const collectorY = centerY - areaHeight/2 + 60;

    collector = Bodies.circle(width/2, collectorY, size/2, {
        isStatic: true,
        isSensor: true,
        render: {
            sprite: {
                texture: 'assets/collector.svg',
                xScale: size / 64,
                yScale: size / 64
            },
            opacity: 0.7
        },
        label: 'collector'
    });
    Composite.add(world, collector);
}

// Gems
const gems = [];
const gemColors = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00'];
const gemSprites = {
    '#00FFFF': 'assets/gem_cyan.svg',
    '#FF00FF': 'assets/gem_magenta.svg',
    '#FFFF00': 'assets/gem_yellow.svg',
    '#00FF00': 'assets/gem_green.svg'
};

function spawnGem() {
    const areaWidth = Math.min(width - 100, 800 + (areaLevel - 1) * 400);
    const areaHeight = Math.min(height - 100, 600 + (areaLevel - 1) * 300);

    const x = (width/2 - areaWidth/2 + 50) + Math.random() * (areaWidth - 100);
    const y = (height/2 - areaHeight/2 + 100) + Math.random() * (areaHeight - 200);

    const radius = 10 + Math.random() * 10;
    const color = gemColors[Math.floor(Math.random() * gemColors.length)];
    const spritePath = gemSprites[color];

    const gem = Bodies.circle(x, y, radius, {
        restitution: 0.5,
        friction: 0.0,
        frictionAir: 0.02,
        render: {
            sprite: {
                texture: spritePath,
                xScale: (radius * 2) / 32,
                yScale: (radius * 2) / 32
            }
        },
        label: 'gem'
    });

    gem.value = Math.floor(radius);

    gems.push(gem);
    Composite.add(world, gem);
}

// Input handling
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// Swipe / Virtual Joystick
const joystick = { active: false, x: 0, y: 0, originX: 0, originY: 0 };
const gameContainer = document.getElementById('game-container');

gameContainer.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    joystick.active = true;
    joystick.originX = touch.clientX;
    joystick.originY = touch.clientY;
    joystick.x = 0;
    joystick.y = 0;
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

    joystick.x = (Math.cos(angle) * clampedDist) / maxDist;
    joystick.y = (Math.sin(angle) * clampedDist) / maxDist;
}, { passive: false });

gameContainer.addEventListener('touchend', e => {
    e.preventDefault();
    joystick.active = false;
    joystick.x = 0;
    joystick.y = 0;
}, { passive: false });

// Mouse drag for testing on desktop
gameContainer.addEventListener('mousedown', e => {
    if (e.target.closest('#game-ui')) return; // Ignore if clicking UI
    joystick.active = true;
    joystick.originX = e.clientX;
    joystick.originY = e.clientY;
    joystick.x = 0;
    joystick.y = 0;
});
window.addEventListener('mousemove', e => {
    if (!joystick.active) return;
    const dx = e.clientX - joystick.originX;
    const dy = e.clientY - joystick.originY;
    const maxDist = 50;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    joystick.x = (Math.cos(angle) * clampedDist) / maxDist;
    joystick.y = (Math.sin(angle) * clampedDist) / maxDist;
});
window.addEventListener('mouseup', () => {
    joystick.active = false;
    joystick.x = 0;
    joystick.y = 0;
});


Events.on(engine, 'beforeUpdate', () => {
    if (!bulldozer) return;

    // Car/Tank controls
    // Forward/Back moves in direction of facing
    // Left/Right rotates body

    let throttle = 0;
    let turn = 0;

    // Keyboard
    // Up/W is Gas (Forward), Down/S is Brake/Reverse
    if (keys['ArrowUp'] || keys['KeyW']) throttle += 1;
    if (keys['ArrowDown'] || keys['KeyS']) throttle -= 1;
    if (keys['ArrowLeft'] || keys['KeyA']) turn -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) turn += 1;

    // Joystick override
    if (joystick.active) {
        // Joystick Up (Negative Y) -> Gas (Positive Throttle)
        // Joystick Down (Positive Y) -> Reverse (Negative Throttle)
        if (Math.abs(joystick.y) > 0.1) throttle = -joystick.y;
        if (Math.abs(joystick.x) > 0.1) turn = joystick.x;
    }

    // Tuning
    const speed = 0.002 * (1 + dozerLevel * 0.1); // Acceleration force
    const turnSpeed = 0.03; // Angular velocity change

    // Apply rotation
    if (turn !== 0) {
        Body.setAngularVelocity(bulldozer, turn * turnSpeed);
    }

    // Apply drive force
    if (throttle !== 0) {
        // Force vector based on body angle
        // Body angle - PI/2 is "up" relative to body if body sprite faces up
        // But our sprite faces up. Matter body angle 0 usually means right?
        // Let's check.
        // If we setAngle(0), sprite is drawn 0 rotation.
        // If sprite is upright, it points Up.
        // But Matter 0 is Right (1, 0).
        // If sprite is drawn upright in SVG, and we render it, it usually aligns with 0 rotation?
        // Wait, normally Render.sprite rotates the image by body.angle.
        // If the SVG content points UP, and body.angle is 0.
        // Usually 0 rad is East.
        // So we might need to offset.
        // Earlier code: Body.setAngle(bulldozer, angle + Math.PI/2);
        // This implies visual Up needs +90deg to match movement angle.

        // Let's assume Forward is -90deg (Up).
        // So force vector should be calculated from (angle - PI/2).

        const forceMagnitude = throttle * speed;
        // Direction vector
        const angle = bulldozer.angle - Math.PI/2;
        const force = {
            x: Math.cos(angle) * forceMagnitude,
            y: Math.sin(angle) * forceMagnitude
        };

        Body.applyForce(bulldozer, bulldozer.position, force);
    }
});

// Collision handling
Events.on(engine, 'collisionStart', event => {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        // Check labels. Since bulldozer is multipart, collision might be with parts.
        // Parent label is usually inherited or we check body.parent.label

        const labelA = bodyA.parent.label || bodyA.label;
        const labelB = bodyB.parent.label || bodyB.label;

        let gemBody = null;
        let collectorBody = null;

        if (labelA === 'gem') gemBody = bodyA.parent; // gem is single part but let's be safe
        if (labelB === 'gem') gemBody = bodyB.parent;

        if (labelA === 'collector') collectorBody = bodyA.parent;
        if (labelB === 'collector') collectorBody = bodyB.parent;

        if (gemBody && collectorBody) {
            collectGem(gemBody);
        }
    }
});

function collectGem(gem) {
    money += gem.value;
    updateUI();
    Composite.remove(world, gem);
    const index = gems.indexOf(gem);
    if (index > -1) gems.splice(index, 1);
}

// UI & Logic
function updateUI() {
    document.getElementById('money').innerText = money;
    document.getElementById('cost-dozer').innerText = costs.dozer;
    document.getElementById('cost-plow').innerText = costs.plow;
    document.getElementById('cost-collector').innerText = costs.collector;
    document.getElementById('cost-area').innerText = costs.area;

    document.getElementById('btn-upgrade-dozer').disabled = money < costs.dozer;
    document.getElementById('btn-upgrade-plow').disabled = money < costs.plow;
    document.getElementById('btn-upgrade-collector').disabled = money < costs.collector;
    document.getElementById('btn-unlock-area').disabled = money < costs.area;
}

window.toggleShop = function() {
    const shop = document.getElementById('shop-modal');
    shop.classList.toggle('hidden');
    // Maybe pause game?
    // engine.enabled = shop.classList.contains('hidden');
}

window.upgradeDozer = function() {
    if (money >= costs.dozer) {
        money -= costs.dozer;
        dozerLevel++;
        costs.dozer = Math.floor(costs.dozer * 1.5);
        createBulldozer();
        updateUI();
    }
};

window.upgradePlow = function() {
    if (money >= costs.plow) {
        money -= costs.plow;
        plowLevel++;
        costs.plow = Math.floor(costs.plow * 1.5);
        createBulldozer();
        updateUI();
    }
};

window.upgradeCollector = function() {
    if (money >= costs.collector) {
        money -= costs.collector;
        collectorLevel++;
        costs.collector = Math.floor(costs.collector * 1.5);
        createCollector();
        updateUI();
    }
};

window.unlockArea = function() {
    if (money >= costs.area) {
        money -= costs.area;
        areaLevel++;
        costs.area = Math.floor(costs.area * 2.0);
        createWalls();
        createCollector();
        createBulldozer();
        updateUI();
    }
};


// Start
createWalls();
createBulldozer();
createCollector();

// Spawn gems
setInterval(() => {
    if (gems.length < 50) {
        spawnGem();
    }
}, 1000);

updateUI();
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Handle resize
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    render.canvas.width = width;
    render.canvas.height = height;
    createWalls();
});
