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
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Vector = Matter.Vector,
      Body = Matter.Body;

// Init physics
const engine = Engine.create();
const world = engine.world;
engine.gravity.y = 0; // Top down

// Three.js Globals
let scene, camera, renderer;
const bodyMeshMap = new Map();
const particles = [];

// Init Three.js
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    // Fog for depth
    scene.fog = new THREE.Fog(0x222222, 500, 2000);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(50, aspect, 10, 5000);
    // Initial position, updated later
    camera.position.set(0, 1000, 800);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(200, 1000, 500);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 3000;
    const d = 1500;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Ground
    const planeGeo = new THREE.PlaneGeometry(10000, 10000);
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    scene.add(plane);
}

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
    if (areaLevel < 2) {
        const gate1 = Bodies.rectangle(0, -600, mapWidth, 60, {
            isStatic: true, label: 'gate', render: { fillStyle: '#e74c3c' }
        });
        gates.push(gate1);
    }

    if (areaLevel < 3) {
        const gate2 = Bodies.rectangle(0, -1800, mapWidth, 60, {
            isStatic: true, label: 'gate', render: { fillStyle: '#e74c3c' }
        });
        gates.push(gate2);
    }

    Composite.add(world, [...walls, ...gates]);
}

// Bulldozer
let bulldozer;

function createBulldozer() {
    let pos = { x: 0, y: 0 };
    let angle = 0;

    if (bulldozer) {
        pos = { x: bulldozer.position.x, y: bulldozer.position.y };
        angle = bulldozer.angle;
        // Remove meshes associated with old bulldozer parts
        bulldozer.parts.forEach(p => {
            const mesh = bodyMeshMap.get(p.id);
            if (mesh) {
                scene.remove(mesh);
                bodyMeshMap.delete(p.id);
            }
        });
        Composite.remove(world, bulldozer);
    }

    const bodySize = 40 + (dozerLevel * 5);
    const plowWidth = bodySize * 1.2 + (plowLevel * 10);
    const plowHeight = 15 + (plowLevel * 2);

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

// Collector
let collector;

function createCollector() {
    if (collector) {
         // Remove mesh
         const mesh = bodyMeshMap.get(collector.id);
         if(mesh) {
             scene.remove(mesh);
             bodyMeshMap.delete(collector.id);
         }
         Composite.remove(world, collector);
    }

    const size = 60 + (collectorLevel * 20);
    const collectorY = 400;

    collector = Bodies.circle(0, collectorY, size/2, {
        isStatic: true,
        isSensor: true,
        label: 'collector'
    });
    Composite.add(world, collector);
}

// Gems
const gems = [];
const gemColors = {
    '#00FFFF': 0x00FFFF, // Cyan
    '#FF00FF': 0xFF00FF, // Magenta
    '#FFFF00': 0xFFFF00, // Yellow
    '#00FF00': 0x00FF00  // Green
};
const gemHexColors = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00'];

function initGems() {
    // Clear existing
    for (const g of gems) {
         const mesh = bodyMeshMap.get(g.id);
         if(mesh) { scene.remove(mesh); bodyMeshMap.delete(g.id); }
         Composite.remove(world, g);
    }
    gems.length = 0;

    spawnZoneGems(40, -500, 500, -500, 500, 10, 25, ['#00FFFF', '#FF00FF']);
    spawnZoneGems(40, -500, 500, -1700, -700, 30, 60, ['#FFFF00']);
    spawnZoneGems(40, -500, 500, -2900, -1900, 70, 120, ['#00FF00']);
}

function spawnZoneGems(count, xMin, xMax, yMin, yMax, valMin, valMax, colors) {
    for(let i=0; i<count; i++) {
        const x = xMin + Math.random() * (xMax - xMin);
        const y = yMin + Math.random() * (yMax - yMin);

        const colorStr = colors[Math.floor(Math.random() * colors.length)];
        const colorVal = gemColors[colorStr];
        const radius = 10 + Math.random() * 8 + (valMin/10);

        const gem = Bodies.circle(x, y, radius, {
            restitution: 0.5,
            friction: 0.0,
            frictionAir: 0.02,
            label: 'gem'
        });

        gem.renderColor = colorVal;
        gem.value = Math.floor(valMin + Math.random() * (valMax - valMin));
        gems.push(gem);
        Composite.add(world, gem);
    }
}

// Visuals Update
function createMesh(body) {
    let mesh;
    const { label } = body;

    // Determine dimensions
    // For rectangles, bounds are updated, but we can access initial dims or calculate from vertices.
    // Easier: calculate from bounds.
    let w = body.bounds.max.x - body.bounds.min.x;
    let h = body.bounds.max.y - body.bounds.min.y;

    if (label === 'wall') {
        const geo = new THREE.BoxGeometry(w, 40, h);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 20;
    } else if (label === 'gate') {
        const geo = new THREE.BoxGeometry(w, 60, h);
        const mat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.8 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 30;
    } else if (label === 'chassis') {
        const geo = new THREE.BoxGeometry(w, 20, h);
        const mat = new THREE.MeshStandardMaterial({ color: 0xf39c12 }); // Bulldozer yellow
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 10;

        // Add a "cab"
        const cabGeo = new THREE.BoxGeometry(w * 0.6, 15, h * 0.6);
        const cabMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const cab = new THREE.Mesh(cabGeo, cabMat);
        cab.position.y = 17.5;
        mesh.add(cab);

    } else if (label === 'plow') {
        // Curved plow shape
        const geo = new THREE.BoxGeometry(w, 15, h); // Simplified
        const mat = new THREE.MeshStandardMaterial({ color: 0xd35400 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 7.5;
    } else if (label === 'gem') {
        const r = (w / 2); // Approximate
        const geo = new THREE.IcosahedronGeometry(r, 0);
        const color = body.renderColor || 0xffffff;
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.1,
            metalness: 0.5,
            emissive: color,
            emissiveIntensity: 0.4
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = r;
    } else if (label === 'collector') {
        const r = (w / 2);
        const geo = new THREE.TorusGeometry(r, 6, 16, 32);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5,
            roughness: 0.2
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI/2;
        mesh.position.y = 2;

        // Add a glowy center
        const innerGeo = new THREE.CircleGeometry(r, 32);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        // inner is already in XY plane, parent rotated X -90
        mesh.add(inner);

    } else {
        // Fallback
        const geo = new THREE.BoxGeometry(w, 10, h);
        const mat = new THREE.MeshStandardMaterial({ color: 0x999999 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 5;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.02;
        p.mesh.position.add(p.vel);
        p.mesh.scale.setScalar(p.life);
        p.mesh.rotation.x += 0.1;
        p.mesh.rotation.y += 0.1;

        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

function spawnParticles(pos, color) {
    const count = 8;
    for (let i = 0; i < count; i++) {
        const geo = new THREE.BoxGeometry(5, 5, 5);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(pos.x, 10, pos.y);

        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        const vel = new THREE.Vector3(Math.cos(angle) * speed, Math.random() * 5, Math.sin(angle) * speed);

        scene.add(mesh);
        particles.push({ mesh, vel, life: 1.0 });
    }
}

function updateGraphics() {
    // 1. Sync Physics to Mesh
    // We iterate all bodies, including parts of composite bodies if possible
    // Composite.allBodies(world) returns parent bodies.
    const bodies = Composite.allBodies(world);
    const activeIds = new Set();

    bodies.forEach(body => {
        // If compound, body.parts contains [parent, part1, part2...]
        // If simple, body.parts contains [body]

        const parts = (body.parts && body.parts.length > 1) ? body.parts.slice(1) : [body];

        parts.forEach(part => {
             activeIds.add(part.id);

             let mesh = bodyMeshMap.get(part.id);
             if (!mesh) {
                 mesh = createMesh(part);
                 if (mesh) {
                     scene.add(mesh);
                     bodyMeshMap.set(part.id, mesh);
                 }
             }

             if (mesh) {
                 // Update transform
                 mesh.position.x = part.position.x;
                 mesh.position.z = part.position.y;
                 // Y position set in createMesh (height), but could be dynamic if needed

                 // Rotation: Matter angle is Z rotation (CW). Three Y rotation is CCW.
                 // Matter 0 = Up (if we consider standard math).
                 // Actually Matter Angle 0 is usually associated with geometry creation.
                 // For Bodies.rectangle, width is along X.
                 mesh.rotation.y = -part.angle;

                 // Special animation for collector
                 if (part.label === 'collector') {
                     mesh.rotation.z += 0.02; // Rotate the ring
                 }
             }
        });
    });

    // 2. Cleanup old meshes
    for (const [id, mesh] of bodyMeshMap) {
        if (!activeIds.has(id)) {
            scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            bodyMeshMap.delete(id);
        }
    }

    // 3. Camera Follow
    if (bulldozer) {
        const targetX = bulldozer.position.x;
        const targetZ = bulldozer.position.y + 800; // Look from south

        // Smooth follow
        camera.position.x += (targetX - camera.position.x) * 0.1;
        camera.position.z += (targetZ - camera.position.z) * 0.1;
        camera.lookAt(camera.position.x, 0, camera.position.z - 1000);
    }

    updateParticles();
    renderer.render(scene, camera);
}

// Render Loop
function animate() {
    requestAnimationFrame(animate);
    updateGraphics();
}

// Events and Logic same as before...
// Input handling
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// ... Joystick Code ... (Keeping existing logic)
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

// Mouse drag for testing
gameContainer.addEventListener('mousedown', e => {
    if (e.target.closest('#game-ui')) return;
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

    const baseSpeed = 0.002 * (1 + dozerLevel * 0.1);
    const turnSpeed = 0.03;

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
});

// Collision handling
Events.on(engine, 'collisionStart', event => {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        const labelA = bodyA.label || (bodyA.parent && bodyA.parent.label);
        const labelB = bodyB.label || (bodyB.parent && bodyB.parent.label);

        // Check for collector
        let gemBody = null;
        let collectorBody = null;

        // Determine if one is gem and one is collector
        if (labelA === 'gem') gemBody = bodyA; // Gem is simple body
        if (labelB === 'gem') gemBody = bodyB;

        if (labelA === 'collector') collectorBody = bodyA;
        if (labelB === 'collector') collectorBody = bodyB;

        if (gemBody && collectorBody) {
            collectGem(gemBody);
        }
    }
});

function collectGem(gem) {
    if (!world.bodies.includes(gem)) return; // Already collected

    money += gem.value;
    updateUI();

    // Spawn particles
    spawnParticles({x: gem.position.x, y: gem.position.y}, gem.renderColor);

    Composite.remove(world, gem);
    const index = gems.indexOf(gem);
    if (index > -1) gems.splice(index, 1);
}

// UI & Logic (Same as before)
function updateUI() {
    document.getElementById('money').innerText = money;
    document.getElementById('cost-dozer').innerText = costs.dozer;
    document.getElementById('cost-plow').innerText = costs.plow;
    document.getElementById('cost-collector').innerText = costs.collector;

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
initThree();
createMap();
createBulldozer();
createCollector();
initGems();

updateUI();

const runner = Runner.create();
Runner.run(runner, engine);
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
