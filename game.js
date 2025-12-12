// Game state
let money = 0;
let dozerLevel = 1;
let collectorLevel = 1;
let areaLevel = 1;

const costs = {
    dozer: 100,
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
    // Remove existing walls
    Composite.remove(world, walls);
    walls.length = 0;

    // Outer boundaries based on areaLevel
    // Level 1: Small box. Level 2: Wider. Level 3: Full screen (or larger)

    // For simplicity, let's just make the play area grow
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
    if (bulldozer) Composite.remove(world, bulldozer);

    const size = 40 + (dozerLevel * 10);
    bulldozer = Bodies.rectangle(width/2, height/2, size, size, {
        restitution: 0.1,
        frictionAir: 0.1,
        render: { fillStyle: '#F4A460' },
        label: 'bulldozer'
    });
    Composite.add(world, bulldozer);
}

// Collector
let collector;

function createCollector() {
    if (collector) Composite.remove(world, collector);

    const size = 60 + (collectorLevel * 20);
    // Position collector at the bottom center of the area
    // We need to find the bottom wall's position or just a fixed spot
    // Let's put it at the top center for now, acting as a "pit"

    const areaHeight = Math.min(height - 100, 600 + (areaLevel - 1) * 300);
    const centerY = height / 2;
    const collectorY = centerY - areaHeight/2 + 60; // Near top wall

    collector = Bodies.circle(width/2, collectorY, size/2, {
        isStatic: true,
        isSensor: true, // Things pass through, but events fire
        render: {
            fillStyle: '#FF4444',
            opacity: 0.7
        },
        label: 'collector'
    });
    Composite.add(world, collector);
}

// Gems
const gems = [];
const gemColors = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00'];

function spawnGem() {
    const areaWidth = Math.min(width - 100, 800 + (areaLevel - 1) * 400);
    const areaHeight = Math.min(height - 100, 600 + (areaLevel - 1) * 300);

    const x = (width/2 - areaWidth/2 + 50) + Math.random() * (areaWidth - 100);
    const y = (height/2 - areaHeight/2 + 100) + Math.random() * (areaHeight - 200);

    const radius = 10 + Math.random() * 10;
    const color = gemColors[Math.floor(Math.random() * gemColors.length)];

    const gem = Bodies.circle(x, y, radius, {
        restitution: 0.5,
        friction: 0.0,
        frictionAir: 0.02,
        render: { fillStyle: color },
        label: 'gem'
    });

    // Assign value based on size
    gem.value = Math.floor(radius);

    gems.push(gem);
    Composite.add(world, gem);
}

// Input handling
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

Events.on(engine, 'beforeUpdate', () => {
    if (!bulldozer) return;

    const speed = 3;
    const forceMagnitude = 0.005 * dozerLevel; // Stronger push as we level up? Or just move body

    // Using velocity directly for arcade feel, or force for physics feel.
    // Let's use force for "heavy machinery" feel but cap velocity

    const force = { x: 0, y: 0 };
    if (keys['ArrowUp'] || keys['KeyW']) force.y -= forceMagnitude;
    if (keys['ArrowDown'] || keys['KeyS']) force.y += forceMagnitude;
    if (keys['ArrowLeft'] || keys['KeyA']) force.x -= forceMagnitude;
    if (keys['ArrowRight'] || keys['KeyD']) force.x += forceMagnitude;

    Body.applyForce(bulldozer, bulldozer.position, force);
});

// Collision handling
Events.on(engine, 'collisionStart', event => {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        let gemBody = null;
        let collectorBody = null;

        if (bodyA.label === 'gem') gemBody = bodyA;
        if (bodyB.label === 'gem') gemBody = bodyB;

        if (bodyA.label === 'collector') collectorBody = bodyA;
        if (bodyB.label === 'collector') collectorBody = bodyB;

        if (gemBody && collectorBody) {
            // Gem collected
            collectGem(gemBody);
        }
    }
});

function collectGem(gem) {
    money += gem.value;
    updateUI();

    // Remove from world and array
    Composite.remove(world, gem);
    const index = gems.indexOf(gem);
    if (index > -1) gems.splice(index, 1);
}

// UI & Logic
function updateUI() {
    document.getElementById('money').innerText = money;
    document.getElementById('cost-dozer').innerText = costs.dozer;
    document.getElementById('cost-collector').innerText = costs.collector;
    document.getElementById('cost-area').innerText = costs.area;

    document.getElementById('btn-upgrade-dozer').disabled = money < costs.dozer;
    document.getElementById('btn-upgrade-collector').disabled = money < costs.collector;
    document.getElementById('btn-unlock-area').disabled = money < costs.area;
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
        createWalls(); // Rebuild walls
        createCollector(); // Re-center collector if needed
        createBulldozer(); // Reset dozer pos so it doesn't get stuck in new walls? Actually center is safe.
        updateUI();
    }
};


// Start
createWalls();
createBulldozer();
createCollector();

// Spawn gems periodically
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
