import { world } from './physics.js';
import { state } from './state.js';
import { getShopPads } from './entities/shop.js';

export let scene, camera, renderer;
export const bodyMeshMap = new Map();
export const particles = [];
const tracks = [];
let trackTexture;
let lastDozerPos = null;
let coinPileGroup = null;

// Bank Area Configuration
const BANK_POS = { x: 400, y: 400 }; // Moved away from wall (Collector is at 0, 400)
const COINS_PER_STACK = 100;
const PILE_RADIUS = 80;

export function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8899aa); // Lighter sky
    // Fog for depth - Increased far plane to prevent washed out look at high zoom
    scene.fog = new THREE.Fog(0x8899aa, 500, 10000);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(50, aspect, 10, 5000);
    // Initial position, updated later
    camera.position.set(0, 1500, 100); // Higher and steeper angle
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Brighter ambient
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); // Brighter sun
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
    // Construction site dirt color
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x9b7653, roughness: 1.0 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    scene.add(plane);

    createTrackTexture();
    createCoinPile();
}

function createCoinPile() {
    // A group for the coin pile grid
    coinPileGroup = new THREE.Group();
    coinPileGroup.position.set(BANK_POS.x, 0, BANK_POS.y);
    scene.add(coinPileGroup);
}

// Map to store textures for pads to avoid recreation if text doesn't change
const padTextures = new Map();

// Updated for billboards: simpler, bigger text, transparent background
function getPadTexture(title, cost) {
    const key = `${title}-${cost}`;
    if (padTextures.has(key)) return padTextures.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Transparent Background
    ctx.clearRect(0, 0, 512, 256);

    // Background panel for text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(10, 10, 492, 236, 20);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px Arial';

    // Title
    ctx.fillText(title, 256, 80);

    // Cost
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 80px Arial';
    const costText = cost === null ? "MAX" : `$${cost}`;
    ctx.fillText(costText, 256, 180);

    const texture = new THREE.CanvasTexture(canvas);
    padTextures.set(key, texture);
    return texture;
}

function createTrackTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.clearRect(0, 0, 64, 64);

    // Two tire tracks
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

    // Left Track (approx 1/3 width)
    // Draw treads
    for(let y = 0; y < 64; y += 8) {
        ctx.fillRect(4, y, 16, 4); // Left tread
        ctx.fillRect(44, y, 16, 4); // Right tread
    }

    // Add some noise or dirt
    ctx.fillStyle = 'rgba(50, 40, 30, 0.1)';
    ctx.fillRect(0, 0, 64, 64);

    trackTexture = new THREE.CanvasTexture(canvas);
    trackTexture.magFilter = THREE.NearestFilter;
    trackTexture.wrapS = THREE.RepeatWrapping;
    trackTexture.wrapT = THREE.RepeatWrapping;
}

export function createMesh(body) {
    let mesh;
    const { label } = body;

    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    body.vertices.forEach(v => {
        const rx = v.x * c + v.y * s;
        const ry = -v.x * s + v.y * c;
        if (rx < minX) minX = rx;
        if (rx > maxX) maxX = rx;
        if (ry < minY) minY = ry;
        if (ry > maxY) maxY = ry;
    });

    const w = maxX - minX;
    const h = maxY - minY;

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
        const cabGeo = new THREE.BoxGeometry(w * 0.6, 15, h * 0.6);
        const cabMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const cab = new THREE.Mesh(cabGeo, cabMat);
        cab.position.y = 17.5;
        mesh.add(cab);
    } else if (label === 'plow') {
        let geo;
        if (state.plowLevel >= 6) {
             // Curved / Bigger wings visual
             geo = new THREE.BoxGeometry(w, 20, h);
        } else {
             geo = new THREE.BoxGeometry(w, 15, h);
        }

        const mat = new THREE.MeshStandardMaterial({ color: 0xd35400 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 7.5;

        if (state.plowLevel >= 6) {
            // Add visual wings
            const wingGeo = new THREE.BoxGeometry(20, 20, h * 0.8);
            const leftWing = new THREE.Mesh(wingGeo, mat);
            leftWing.position.set(-w/2, 0, 20);
            leftWing.rotation.y = Math.PI / 4;
            mesh.add(leftWing);

            const rightWing = new THREE.Mesh(wingGeo, mat);
            rightWing.position.set(w/2, 0, 20);
            rightWing.rotation.y = -Math.PI / 4;
            mesh.add(rightWing);
        }
    } else if (label === 'gem') {
        const r = (w / 2);
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
        const innerGeo = new THREE.CircleGeometry(r, 32);
        const innerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        mesh.add(inner);
    } else if (label && label.startsWith('shop_pad')) {
        const geo = new THREE.BoxGeometry(w, 5, h);
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 2.5;

        const billGeo = new THREE.PlaneGeometry(w * 1.5, h * 0.8);
        const billMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
        const billMesh = new THREE.Mesh(billGeo, billMat);

        billMesh.position.set(0, 60, -h/2 - 20);
        billMesh.rotation.x = -Math.PI / 6;

        billMesh.userData = { isTextPlane: true };
        mesh.add(billMesh);

        const type = label.split('_')[2];
        const iconMesh = createShopIcon(type);
        iconMesh.position.set(0, 40, 0);
        iconMesh.userData = { isIcon: true };
        mesh.add(iconMesh);

    } else if (label && label.startsWith('conveyor')) {
        const geo = new THREE.BoxGeometry(w, 5, h);
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 2.5;

        const arrowGroup = new THREE.Group();
        for (let i = -1; i <= 1; i++) {
            const arrowGeo = new THREE.ConeGeometry(3, 8, 8);
            const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const arrow = new THREE.Mesh(arrowGeo, arrowMat);
            arrow.rotation.z = -Math.PI / 2; // Point Right (+X) default
            arrow.position.set(i * (w/4), 6, 0);
            arrowGroup.add(arrow);
        }
        arrowGroup.userData = { isArrows: true };
        mesh.add(arrowGroup);

    } else {
        const geo = new THREE.BoxGeometry(w, 10, h);
        const mat = new THREE.MeshStandardMaterial({ color: 0x999999 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 5;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createShopIcon(type) {
    let geo, mat, mesh;
    if (type === 'dozer') {
        geo = new THREE.BoxGeometry(20, 20, 20);
        mat = new THREE.MeshStandardMaterial({ color: 0xf39c12 });
    } else if (type === 'plow') {
        geo = new THREE.ConeGeometry(15, 30, 4);
        mat = new THREE.MeshStandardMaterial({ color: 0xd35400 });
    } else if (type === 'collector') {
        geo = new THREE.TorusGeometry(10, 3, 8, 16);
        mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    } else if (type === 'area') {
        geo = new THREE.BoxGeometry(15, 25, 5);
        mat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
    } else {
        geo = new THREE.BoxGeometry(10, 10, 10);
        mat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    }
    mesh = new THREE.Mesh(geo, mat);
    return mesh;
}

export function removeBodyMesh(bodyId) {
    const mesh = bodyMeshMap.get(bodyId);
    if (mesh) {
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
        bodyMeshMap.delete(bodyId);
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (p.type === 'coin_fly') {
            // Parabolic Flight
            const now = Date.now();
            const elapsed = now - p.startTime;
            let t = elapsed / p.duration;

            if (t >= 1.0) {
                // Arrived
                scene.remove(p.mesh);
                particles.splice(i, 1);
                continue;
            }

            // Lerp X and Z
            const currentX = p.startPos.x + (p.targetPos.x - p.startPos.x) * t;
            const currentZ = p.startPos.z + (p.targetPos.z - p.startPos.z) * t;

            // Parabolic Height (Sine wave)
            const height = Math.sin(t * Math.PI) * p.arcHeight;

            p.mesh.position.set(currentX, height + 10, currentZ);

            // Spin
            p.mesh.rotation.y += 0.2;
            p.mesh.rotation.z += 0.1;

        } else if (p.type === 'floating_text') {
            p.life -= 0.01;
            p.mesh.position.y += 0.5; // Float up

            // Fade out if possible (Canvas texture transparent?)
            // We can set opacity on material
            if (p.mesh.material.opacity > 0) {
                p.mesh.material.opacity = p.life;
            }

            if (p.life <= 0) {
                scene.remove(p.mesh);
                if (p.mesh.material.map) p.mesh.material.map.dispose();
                particles.splice(i, 1);
            }

        } else {
            // Standard Physics Particles
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

    // Update Tracks
    for (let i = tracks.length - 1; i >= 0; i--) {
        const t = tracks[i];
        t.life -= 0.01;

        if (t.life < 1.0) {
            t.mesh.material.opacity = t.life * 0.8;
        }

        if (t.life <= 0) {
            scene.remove(t.mesh);
            t.mesh.geometry.dispose();
            tracks.splice(i, 1);
        }
    }
}

function spawnTrackSegment(pos, angle, width) {
    const treadOffset = (width / 2) - 8;
    const segmentLength = 15;
    const segmentWidth = 10;
    const offsets = [-treadOffset, treadOffset];

    const geo = new THREE.PlaneGeometry(segmentWidth, segmentLength);
    const mat = new THREE.MeshBasicMaterial({
        map: trackTexture,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
    });

    offsets.forEach(off => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.order = 'YXZ';
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.y = -angle;

        const rx = off * Math.cos(angle);
        const ry = off * Math.sin(angle);

        mesh.position.set(pos.x + rx, 0.5, pos.y + ry);

        scene.add(mesh);
        tracks.push({ mesh, life: 2.0 });
    });
}

export function spawnParticles(pos, color, type = 'normal') {
    let count = 8;
    let size = 5;
    let speedBase = 2;
    let life = 1.0;

    if (type === 'dust') {
        count = 3;
        size = 3;
        speedBase = 0.5;
        life = 0.5;
    } else if (type === 'upgrade') {
        count = 30;
        size = 4;
        speedBase = 5;
        life = 2.0;
    }

    for (let i = 0; i < count; i++) {
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(pos.x, 10, pos.y);

        if (type === 'upgrade') {
            mesh.position.y += Math.random() * 50;
        }

        const angle = Math.random() * Math.PI * 2;
        const speed = speedBase + Math.random() * speedBase;

        let vy = Math.random() * 5;
        if (type === 'upgrade') vy = 5 + Math.random() * 10;
        if (type === 'dust') vy = Math.random() * 2;

        const vel = new THREE.Vector3(Math.cos(angle) * speed, vy, Math.sin(angle) * speed);

        scene.add(mesh);
        particles.push({ mesh, vel, life: life, type: type });
    }
}

export function spawnFloatingText(text, pos, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(text, 128, 48);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(80, 20);
    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(pos.x, 50, pos.y);
    mesh.rotation.x = -Math.PI / 4; // Tilt back

    scene.add(mesh);

    particles.push({
        mesh,
        life: 2.0,
        type: 'floating_text'
    });
}

export function spawnCoinDrop(amount, startPos) {
    // Spawn a flying coin visual
    const targetPos = { x: BANK_POS.x, z: BANK_POS.y };
    // Use gem position as start, or fallback to 0,0
    const start = startPos ? { x: startPos.x, z: startPos.y } : { x: 0, z: 400 };

    const geo = new THREE.CylinderGeometry(5, 5, 2, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.rotation.x = Math.PI / 2; // Flat coin
    mesh.position.set(start.x, 10, start.z);

    scene.add(mesh);

    particles.push({
        mesh,
        startPos: start,
        targetPos: targetPos,
        startTime: Date.now(),
        duration: 800, // ms
        arcHeight: 200,
        type: 'coin_fly'
    });
}

function updateCoinPile() {
    if (!coinPileGroup) return;

    // Calculate desired number of stacks
    const targetStacks = Math.floor(state.money / COINS_PER_STACK);
    const currentStacks = coinPileGroup.children.length;

    // Add stacks
    if (currentStacks < targetStacks) {
        const diff = targetStacks - currentStacks;
        const addCount = Math.min(diff, 5);

        for (let i = 0; i < addCount; i++) {
            // Random pile distribution for "Classic Heap" look
            const r = Math.sqrt(Math.random()) * PILE_RADIUS;
            const theta = Math.random() * 2 * Math.PI;

            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);

            // Create stack mesh
            const geo = new THREE.CylinderGeometry(5, 5, 10, 8);
            const mat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
            const mesh = new THREE.Mesh(geo, mat);

            // Randomize rotation slightly for messiness
            mesh.rotation.x = (Math.random() - 0.5) * 0.5;
            mesh.rotation.z = (Math.random() - 0.5) * 0.5;
            mesh.rotation.y = Math.random() * Math.PI;

            mesh.position.set(x, 5, z);

            mesh.scale.set(0.1, 0.1, 0.1);
            mesh.userData.targetScale = 1.0;

            coinPileGroup.add(mesh);
        }
    }

    // Remove stacks (if spent)
    if (currentStacks > targetStacks) {
        const removeCount = Math.min(currentStacks - targetStacks, 10);
        for (let i = 0; i < removeCount; i++) {
            const child = coinPileGroup.children[coinPileGroup.children.length - 1];
            coinPileGroup.remove(child);
            if(child.geometry) child.geometry.dispose();
            if(child.material) child.material.dispose();
        }
    }

    // Animate growing stacks
    coinPileGroup.children.forEach(child => {
        if (child.userData.targetScale) {
            child.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        }
    });
}

export function updateGraphics(bulldozer) {
    const bodies = Matter.Composite.allBodies(world);
    const activeIds = new Set();
    const shopPads = getShopPads();

    bodies.forEach(body => {
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
                 mesh.position.x = part.position.x;
                 mesh.position.z = part.position.y;
                 mesh.rotation.y = -part.angle;

                 if (part.label && part.label.startsWith('shop_pad')) {
                     const padData = shopPads.find(p => p.body === body);
                     if (padData) {
                         const currentCost = padData.costFn();
                         const texture = getPadTexture(padData.title, currentCost);
                         const textPlane = mesh.children.find(c => c.userData.isTextPlane);
                         if (textPlane && textPlane.material.map !== texture) {
                             textPlane.material.map = texture;
                             textPlane.material.needsUpdate = true;
                         }
                         const icon = mesh.children.find(c => c.userData.isIcon);
                         if (icon) {
                             icon.rotation.y += 0.02;
                             icon.rotation.z += 0.01;
                         }
                     }
                 }

                 if (part.label === 'collector') {
                     mesh.rotation.z += 0.02;
                 }

                 if (part.label && part.label.startsWith('conveyor')) {
                     mesh.children.forEach(child => {
                         if (child.userData.isArrows) {
                             child.children.forEach(arrow => {
                                 let speed = 0.5;
                                 if (part.label === 'conveyor_right') {
                                     speed = -0.5;
                                     arrow.rotation.z = Math.PI / 2;
                                 } else {
                                     arrow.rotation.z = -Math.PI / 2;
                                 }
                                 arrow.position.x += speed;
                                 const range = 40;
                                 if (arrow.position.x > range) arrow.position.x -= 2*range;
                                 if (arrow.position.x < -range) arrow.position.x += 2*range;
                             });
                         }
                     });
                 }
             }
        });
    });

    for (const [id, mesh] of bodyMeshMap) {
        if (!activeIds.has(id)) {
            scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            bodyMeshMap.delete(id);
        }
    }

    if (bulldozer) {
        const baseHeight = 1500;
        const zoomLevel = (state.dozerLevel - 1) * 100; // Reduced zoom multiplier
        const targetY = baseHeight + zoomLevel;
        camera.position.y = targetY;
        camera.position.x = bulldozer.position.x;
        camera.position.z = bulldozer.position.y + 500;
        camera.lookAt(bulldozer.position.x, 0, bulldozer.position.y);

        if (!lastDozerPos) {
            lastDozerPos = { ...bulldozer.position };
        } else {
            const dx = bulldozer.position.x - lastDozerPos.x;
            const dy = bulldozer.position.y - lastDozerPos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 20) {
                const width = 40 + (state.dozerLevel * 5);
                spawnTrackSegment(bulldozer.position, bulldozer.angle, width);
                spawnParticles(bulldozer.position, 0x9b7653, 'dust');
                lastDozerPos = { ...bulldozer.position };
            }
        }
    }

    updateCoinPile();
    updateParticles();
    renderer.render(scene, camera);
}
