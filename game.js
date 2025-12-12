// Game state
let money = 0;
let dozerLevel = 1;
let plowLevel = 1;
let collectorLevel = 1;
let areaLevel = 1; // 1: Zone 1, 2: Zone 1+2, 3: Zone 1+2+3

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
        background: '#333',
        hasBounds: true
    }
});

// Map Configuration
const mapWidth = 1200;
const wallThickness = 100;
const walls = [];
const gates = [];

function createMap() {
    Composite.remove(world, walls);
    Composite.remove(world, gates);
    walls.length = 0;
    gates.length = 0;

    // Define boundaries
    // Zone 1: Y 600 to -600 (Center 0)
    // Zone 2: Y -600 to -1800
    // Zone 3: Y -1800 to -3000
    // Total Y: 600 to -3000

    const minY = -3000;
    const maxY = 600;
    const totalHeight = maxY - minY;
    const centerY = minY + totalHeight / 2;

    // Outer Walls
    const left = Bodies.rectangle(-mapWidth/2 - wallThickness/2, centerY, wallThickness, totalHeight, { isStatic: true, render: { fillStyle: '#444' } });
    const right = Bodies.rectangle(mapWidth/2 + wallThickness/2, centerY, wallThickness, totalHeight, { isStatic: true, render: { fillStyle: '#444' } });
    const top = Bodies.rectangle(0, minY - wallThickness/2, mapWidth + 2*wallThickness, wallThickness, { isStatic: true, render: { fillStyle: '#444' } });
    const bottom = Bodies.rectangle(0, maxY + wallThickness/2, mapWidth + 2*wallThickness, wallThickness, { isStatic: true, render: { fillStyle: '#444' } });

    walls.push(left, right, top, bottom);

    // Gates
    // Gate 1 at -600
    if (areaLevel < 2) {
        const gate1 = Bodies.rectangle(0, -600, mapWidth, 60, {
            isStatic: true,
            label: 'gate',
            render: { fillStyle: '#e74c3c', opacity: 0.9 }
        });
        gates.push(gate1);
    }

    // Gate 2 at -1800
    if (areaLevel < 3) {
        const gate2 = Bodies.rectangle(0, -1800, mapWidth, 60, {
            isStatic: true,
            label: 'gate',
            render: { fillStyle: '#e74c3c', opacity: 0.9 }
        });
        gates.push(gate2);
    }

    Composite.add(world, [...walls, ...gates]);
}

// Bulldozer
let bulldozer;

function createBulldozer() {
    let pos = { x: 0, y: 0 };
    let angle = 0; // Facing up (Constructed at angle 0 facing up)

    if (bulldozer) {
        pos = { x: bulldozer.position.x, y: bulldozer.position.y };
        angle = bulldozer.angle;
        Composite.remove(world, bulldozer);
    }

    // Body size
    const bodySize = 40 + (dozerLevel * 5); // Base size

    // Plow size
    const plowWidth = bodySize * 1.2 + (plowLevel * 10);
    const plowHeight = 15 + (plowLevel * 2);

    // Parts creation
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
    // Position at fixed location in Zone 1
    const collectorY = 400;

    collector = Bodies.circle(0, collectorY, size/2, {
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

function initGems() {
    // Clear existing
    for (const g of gems) Composite.remove(world, g);
    gems.length = 0;

    // Zone 1: Cyan/Magenta, Value 10-25
    spawnZoneGems(40, -500, 500, -500, 500, 10, 25, ['#00FFFF', '#FF00FF']);

    // Zone 2: Yellow, Value 30-60
    spawnZoneGems(40, -500, 500, -1700, -700, 30, 60, ['#FFFF00']);

    // Zone 3: Green, Value 70-120
    spawnZoneGems(40, -500, 500, -2900, -1900, 70, 120, ['#00FF00']);
}

function spawnZoneGems(count, xMin, xMax, yMin, yMax, valMin, valMax, colors) {
    for(let i=0; i<count; i++) {
        const x = xMin + Math.random() * (xMax - xMin);
        const y = yMin + Math.random() * (yMax - yMin);

        const color = colors[Math.floor(Math.random() * colors.length)];
        const spritePath = gemSprites[color];

        const radius = 10 + Math.random() * 8 + (valMin/10); // Slight size increase with value

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

        gem.value = Math.floor(valMin + Math.random() * (valMax - valMin));
        gems.push(gem);
        Composite.add(world, gem);
    }
}


// Input handling
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// Swipe / Virtual Joystick
const joystick = { active: false, x: 0, y: 0, originX: 0, originY: 0 };
const gameContainer = document.getElementById('game-container');
const joystickZone = document.getElementById('joystick-zone');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');

function showJoystick(x, y) {
    joystickZone.style.display = 'block';
    joystickBase.style.left = x + 'px';
    joystickBase.style.top = y + 'px';
    joystickKnob.style.transform = `translate(-50%, -50%) translate(0px, 0px)`;
}

function updateJoystickVisual(dx, dy) {
    joystickKnob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
}

function hideJoystick() {
    joystickZone.style.display = 'none';
}

gameContainer.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.touches[0];
    joystick.active = true;
    joystick.originX = touch.clientX;
    joystick.originY = touch.clientY;
    joystick.x = 0;
    joystick.y = 0;
    showJoystick(joystick.originX, joystick.originY);
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

    const moveX = Math.cos(angle) * clampedDist;
    const moveY = Math.sin(angle) * clampedDist;

    joystick.x = moveX / maxDist; // Normalized
    joystick.y = moveY / maxDist;

    updateJoystickVisual(moveX, moveY);
}, { passive: false });

gameContainer.addEventListener('touchend', e => {
    e.preventDefault();
    joystick.active = false;
    joystick.x = 0;
    joystick.y = 0;
    hideJoystick();
}, { passive: false });

// Mouse drag for testing on desktop
gameContainer.addEventListener('mousedown', e => {
    if (e.target.closest('#game-ui')) return; // Ignore if clicking UI
    joystick.active = true;
    joystick.originX = e.clientX;
    joystick.originY = e.clientY;
    joystick.x = 0;
    joystick.y = 0;
    showJoystick(joystick.originX, joystick.originY);
});
window.addEventListener('mousemove', e => {
    if (!joystick.active) return;
    const dx = e.clientX - joystick.originX;
    const dy = e.clientY - joystick.originY;
    const maxDist = 50;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);

    const moveX = Math.cos(angle) * clampedDist;
    const moveY = Math.sin(angle) * clampedDist;

    joystick.x = moveX / maxDist;
    joystick.y = moveY / maxDist;

    updateJoystickVisual(moveX, moveY);
});
window.addEventListener('mouseup', () => {
    joystick.active = false;
    joystick.x = 0;
    joystick.y = 0;
    hideJoystick();
});


Events.on(engine, 'beforeUpdate', () => {
    if (!bulldozer) return;

    // Car/Tank controls
    let throttle = 0;
    let turn = 0;

    // Keyboard
    if (keys['ArrowUp'] || keys['KeyW']) throttle += 1;
    if (keys['ArrowDown'] || keys['KeyS']) throttle -= 1;
    if (keys['ArrowLeft'] || keys['KeyA']) turn -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) turn += 1;

    // Tuning
    const baseSpeed = 0.002 * (1 + dozerLevel * 0.1);
    const turnSpeed = 0.03;

    // Joystick override
    if (joystick.active) {
        const targetAngle = Math.atan2(joystick.y, joystick.x);
        const magnitude = Math.sqrt(joystick.x*joystick.x + joystick.y*joystick.y);

        if (magnitude > 0.1) {
            const currentHeading = bulldozer.angle - Math.PI/2;
            let delta = targetAngle - currentHeading;
            while (delta <= -Math.PI) delta += 2*Math.PI;
            while (delta > Math.PI) delta -= 2*Math.PI;

            const turnFactor = Math.max(-1, Math.min(1, delta * 2));
            turn = turnFactor;
            throttle = magnitude;
        }
    }

    // Apply rotation
    if (turn !== 0) {
        Body.setAngularVelocity(bulldozer, turn * turnSpeed);
    }

    // Apply drive force
    if (throttle !== 0) {
        const forceMagnitude = throttle * baseSpeed;
        const angle = bulldozer.angle - Math.PI/2;
        const force = {
            x: Math.cos(angle) * forceMagnitude,
            y: Math.sin(angle) * forceMagnitude
        };

        Body.applyForce(bulldozer, bulldozer.position, force);
    }

    // Camera Follow
    const w = window.innerWidth;
    const h = window.innerHeight;
    render.bounds.min.x = bulldozer.position.x - w/2;
    render.bounds.max.x = bulldozer.position.x + w/2;
    render.bounds.min.y = bulldozer.position.y - h/2;
    render.bounds.max.y = bulldozer.position.y + h/2;
});

// Collision handling
Events.on(engine, 'collisionStart', event => {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        const labelA = bodyA.parent.label || bodyA.label;
        const labelB = bodyB.parent.label || bodyB.label;

        let gemBody = null;
        let collectorBody = null;

        if (labelA === 'gem') gemBody = bodyA.parent;
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

    // Update Area button text/state
    const btnArea = document.getElementById('btn-unlock-area');
    const costArea = document.getElementById('cost-area');

    if (areaLevel >= 3) {
        btnArea.innerText = "Max Level";
        btnArea.disabled = true;
        costArea.innerText = "-";
    } else {
        btnArea.innerText = "Unlock Gate";
        costArea.innerText = costs.area;
        btnArea.disabled = money < costs.area;
    }

    document.getElementById('btn-upgrade-dozer').disabled = money < costs.dozer;
    document.getElementById('btn-upgrade-plow').disabled = money < costs.plow;
    document.getElementById('btn-upgrade-collector').disabled = money < costs.collector;

    const speedVal = Math.round(100 * (1 + dozerLevel * 0.1));
    const speedEl = document.getElementById('stats-speed');
    if (speedEl) speedEl.innerText = `Speed: ${speedVal}%`;
}

window.toggleShop = function() {
    const shop = document.getElementById('shop-modal');
    shop.classList.toggle('hidden');
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
    if (money >= costs.area && areaLevel < 3) {
        money -= costs.area;
        areaLevel++;

        if (areaLevel === 2) costs.area = 2000;
        else costs.area = 999999;

        createMap();
        updateUI();
    }
};


// Start
createMap();
createBulldozer();
createCollector();
initGems();

updateUI();
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Handle resize (only render resize needed)
window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
});
