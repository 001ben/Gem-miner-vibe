import { world } from './physics.js';
import { state } from './state.js';
import { getShopPads } from './entities/shop.js';

export let scene, camera, renderer;
export const bodyMeshMap = new Map();
export const particles = [];
const tracks = [];
let trackTexture;
let lastDozerPos = null;
let coinPileMesh = null;

export function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8899aa); // Lighter sky
    // Fog for depth - Increased far plane to prevent washed out look at high zoom
    scene.fog = new THREE.Fog(0x8899aa, 500, 5000);

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
    // A group for the coin pile
    coinPileMesh = new THREE.Group();
    coinPileMesh.position.set(0, 5, 400); // Near collector (0, 400)

    // Create several "piles" or simple gold shapes
    // A main central mound
    const geo = new THREE.ConeGeometry(30, 20, 16);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.8
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 10;
    coinPileMesh.add(mesh);

    scene.add(coinPileMesh);
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
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    // Transparent background
    ctx.clearRect(0, 0, 32, 32);
    // Dark tracks
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, 32, 32);
    // Darker stripes
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, 32, 6);
    ctx.fillRect(0, 16, 32, 6);

    trackTexture = new THREE.CanvasTexture(canvas);
    trackTexture.magFilter = THREE.NearestFilter;
}

export function createMesh(body) {
    let mesh;
    const { label } = body;

    // Determine dimensions
    // We cannot use bounds (AABB) because it changes with rotation, but BoxGeometry is local (unrotated).
    // We must calculate the unrotated width/height by projecting vertices onto the body's axes.
    // Effectively, we find the range of vertex positions in the body's local coordinate system.
    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    body.vertices.forEach(v => {
        // Rotate vertex back by -angle to align with global axes (local space)
        // x' = x*cos(-a) - y*sin(-a) = x*c + y*s
        // y' = x*sin(-a) + y*cos(-a) = -x*s + y*c
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

    } else if (label && label.startsWith('shop_pad')) {
        // Shop Pad Visual
        const geo = new THREE.BoxGeometry(w, 5, h); // Low platform
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 2.5;

        // Add a "Billboard" for text
        // Vertical plane at the back of the pad
        const billGeo = new THREE.PlaneGeometry(w * 1.5, h * 0.8);
        const billMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }); // Map set later
        const billMesh = new THREE.Mesh(billGeo, billMat);

        // Position: Back edge. Pad center is 0. Height is h. Z is mapped to h.
        // Local Z is height axis (h).
        // Back edge is at -h/2 (or +h/2 depending on orientation).
        // Let's place it at -h/2 - 20 (behind).
        // And raised up.
        billMesh.position.set(0, 60, -h/2 - 20);
        // Rotate to face somewhat towards camera?
        // Camera is looking at 0,0 from 0,1500,500. High angle.
        // Text should be tilted back slightly.
        billMesh.rotation.x = -Math.PI / 6; // Tilt back 30 deg

        billMesh.userData = { isTextPlane: true };
        mesh.add(billMesh);

        // Add 3D Icon floating above
        // Determine type from label
        // label format: shop_pad_TYPE
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

        // Add arrows or markings
        // Since we don't have textures easily available, let's add some small meshes as "arrows"
        // that we can animate in updateGraphics
        const arrowGroup = new THREE.Group();
        // Create 3 arrows along the length
        for (let i = -1; i <= 1; i++) {
            const arrowGeo = new THREE.ConeGeometry(3, 8, 8);
            const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const arrow = new THREE.Mesh(arrowGeo, arrowMat);
            // Arrow points up Y in local space.
            // We want it to point along the conveyor movement direction.
            // The conveyor is a rectangle.
            // In local unrotated space, width is along X, height is along Z (because we map y to z).
            // Actually, in `createMesh`, we map box W to X and H to Z.
            // If the conveyor is "conveyor_left", it extends left.
            // If we assume length is along X (which it is for Bodies.rectangle unless rotated).
            // Let's just place them along X and see.
            // Wait, Bodies.rectangle(x, y, w, h). W is X, H is Y.
            // In Three.js: W is X, H is Z.
            // So they are along X.

            arrow.rotation.x = Math.PI / 2; // Point along Z? No.
            arrow.rotation.z = -Math.PI / 2; // Point along X.

            arrow.position.set(i * (w/4), 6, 0);
            arrowGroup.add(arrow);
        }
        arrowGroup.userData = { isArrows: true };
        mesh.add(arrowGroup);

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

function createShopIcon(type) {
    let geo, mat, mesh;

    if (type === 'dozer') {
        // Engine block / Box
        geo = new THREE.BoxGeometry(20, 20, 20);
        mat = new THREE.MeshStandardMaterial({ color: 0xf39c12 });
    } else if (type === 'plow') {
        // Wedge
        geo = new THREE.ConeGeometry(15, 30, 4); // Pyramid-ish
        mat = new THREE.MeshStandardMaterial({ color: 0xd35400 });
    } else if (type === 'collector') {
        // Ring
        geo = new THREE.TorusGeometry(10, 3, 8, 16);
        mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    } else if (type === 'area') {
        // Gate/Lock (Box)
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

    // Update Tracks
    for (let i = tracks.length - 1; i >= 0; i--) {
        const t = tracks[i];
        t.life -= 0.016; // 1/60 (approx 1 sec fade? No, 0.016 per frame -> 60 frames = 1 sec. User wanted 2 sec. So 0.008)

        if (t.life < 1.0) {
            t.mesh.material.opacity = t.life;
        }

        if (t.life <= 0) {
            scene.remove(t.mesh);
            t.mesh.geometry.dispose(); // Share geometry? No, we created simple planes.
            tracks.splice(i, 1);
        }
    }
}

function spawnTrackSegment(pos, angle, width) {
    // We spawn two segments (Left and Right)
    // Offset from center.
    // If body width is `width`. Treads are at +/- (width/2 - 5).
    const treadOffset = (width / 2) - 8;
    const segmentLength = 15;
    const segmentWidth = 10;

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    // Left Tread
    // local: x = -treadOffset, y = 0
    // global: x' = x*c - y*s, y' = x*s + y*c (Wait, angle is body angle)
    // Actually we want to place it BEHIND the dozer? No, AT the dozer position is fine if we spawn frequently.
    // But better to spawn at the BACK of the dozer if we only spawn when moved.
    // Or just spawn at current pos and let dozer move away.

    // We spawn at current pos.

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
        // Rotate: Plane is XY. Ground is XZ.
        // We want plane to lie on ground.
        mesh.rotation.x = -Math.PI / 2;

        // Also rotate around Y to match dozer angle.
        // But dozer angle `angle` is in physics (inverted Y?).
        // In graphics: mesh.rotation.y = -part.angle;
        mesh.rotation.z = -angle; // For plane geometry in XY rotated -90 X, rotation around local Z is Y-axis world rotation.
        // Wait. If we rotate X -90. Local Z points UP world Y. Local Y points World -Z. Local X points World X.
        // We want to rotate around World Y.
        // It's easier to set rotation order or use setFromEuler.

        mesh.rotation.order = 'YXZ';
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.y = -angle;

        // Position
        // Rotate offset vector
        // Physics angle `angle`.
        // Vector (off, 0).
        // Rotated: x = off * cos(angle), y = off * sin(angle).
        // In World: x -> x, y -> z.

        const rx = off * Math.cos(angle);
        const ry = off * Math.sin(angle);

        mesh.position.set(pos.x + rx, 0.5, pos.y + ry); // Slightly above ground

        scene.add(mesh);
        tracks.push({ mesh, life: 2.0 }); // 2 seconds (if we decrement 0.008 per frame at 60fps ~ 125 frames -> 125 * 0.016 = 2s)
        // Actually if we decrement 0.008, 1.0 / 0.008 = 125 frames. 125/60 = 2.08s. Close enough.
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
            mesh.position.y += Math.random() * 50; // Start higher
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

export function updateGraphics(bulldozer) {
    // 1. Sync Physics to Mesh
    const bodies = Matter.Composite.allBodies(world);
    const activeIds = new Set();

    // Also update Shop Pad textures
    const shopPads = getShopPads(); // From entities/shop.js

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
                     // Find the associated pad data to get cost/title
                     const padData = shopPads.find(p => p.body === body);
                     if (padData) {
                         // Update texture
                         const currentCost = padData.costFn();
                         const texture = getPadTexture(padData.title, currentCost);

                         // Find text plane (billboard)
                         const textPlane = mesh.children.find(c => c.userData.isTextPlane);
                         if (textPlane && textPlane.material.map !== texture) {
                             textPlane.material.map = texture;
                             textPlane.material.needsUpdate = true;
                         }

                         // Rotate Icon
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
                     // Animate arrows
                     // The arrows are in arrowGroup, which is children[0] if we added it last?
                     // Or traverse.
                     mesh.children.forEach(child => {
                         if (child.userData.isArrows) {
                             // Move arrows
                             child.children.forEach(arrow => {
                                 // Move along X local
                                 // Check label to see direction?
                                 // conveyor_left: gems move Right (towards center 0).
                                 // conveyor_right: gems move Left (towards center 0).
                                 // If the body is just a rectangle at position X.
                                 // If conveyor_left is at -X, gems move +X.
                                 // If conveyor_right is at +X, gems move -X.

                                 let speed = 0.5;
                                 // "The belt arrow symbols are all facing right" - arrow rotation is likely static in createMesh.
                                 // In createMesh, arrow.rotation.z = -Math.PI / 2. This points them towards +X (Right).
                                 // conveyor_left (at negative X) pushes gems Right (+X). Arrows should point Right.
                                 // conveyor_right (at positive X) pushes gems Left (-X). Arrows should point Left.

                                 if (part.label === 'conveyor_right') {
                                     speed = -0.5;
                                     // Rotate arrows to point Left if not already?
                                     // Updating rotation every frame is wasteful but simple.
                                     arrow.rotation.z = Math.PI / 2; // Point Left (-X)
                                 } else {
                                     arrow.rotation.z = -Math.PI / 2; // Point Right (+X)
                                 }

                                 // Note: For conveyor_top, we'd need different logic, but it's vertical.
                                 // Assuming mostly horizontal belts for now as per current simple logic.

                                 arrow.position.x += speed;

                                 // Loop based on mesh size?
                                 // We don't have mesh size easily here, using fixed range.
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
        // Zoom out slightly as dozer levels up
        const baseHeight = 1500;
        const zoomLevel = (state.dozerLevel - 1) * 200; // 200 units per level
        const targetY = baseHeight + zoomLevel;

        // Simple lerp for smoothness if we wanted, but instant is fine
        camera.position.y = targetY;

        camera.position.x = bulldozer.position.x;
        camera.position.z = bulldozer.position.y + 500; // Tilted angle (previously 100)

        // Look directly at the bulldozer
        camera.lookAt(bulldozer.position.x, 0, bulldozer.position.y);

        // Tracks Logic
        if (!lastDozerPos) {
            lastDozerPos = { ...bulldozer.position };
        } else {
            const dx = bulldozer.position.x - lastDozerPos.x;
            const dy = bulldozer.position.y - lastDozerPos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Spawn every 20 units moved
            if (dist > 20) {
                // Get chassis width. bulldozer body size is roughly what we need.
                // In bulldozer.js: bodySize = 40 + (state.dozerLevel * 5).
                // We can't easily access that variable, but we can guess or calculate from bounds?
                // Or just use 40 + level * 5. We import `state`.
                const width = 40 + (state.dozerLevel * 5);

                spawnTrackSegment(bulldozer.position, bulldozer.angle, width);
                // Also spawn dust
                spawnParticles(bulldozer.position, 0x9b7653, 'dust');

                lastDozerPos = { ...bulldozer.position };
            }
        }
    }

    // Update Coin Pile Size
    if (coinPileMesh) {
        // Log scale?
        // 0 money -> scale 0.5
        // 1000 money -> scale 1.0
        // 10000 money -> scale 2.0

        let targetScale = 0.5 + Math.log10(Math.max(1, state.money) + 100) / 4;
        // Dampen changes
        coinPileMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);

        // Spin slowly
        coinPileMesh.rotation.y += 0.005;
    }

    updateParticles();
    renderer.render(scene, camera);
}

export function spawnCoinDrop(amount) {
    // Spawn a falling coin visual
    const pos = { x: 0, y: 400 }; // Collector position

    const geo = new THREE.CylinderGeometry(5, 5, 2, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.rotation.x = Math.PI / 2; // Lie flat? No, cylinder is Y-up. Disc shape.
    mesh.rotation.z = Math.PI / 2; // Upright coin?

    mesh.position.set(pos.x + (Math.random()-0.5)*40, 200, pos.y + (Math.random()-0.5)*40); // Start high

    scene.add(mesh);

    // Animate falling
    const particle = {
        mesh,
        vel: new THREE.Vector3(0, -5, 0), // Fall down
        life: 2.0, // Should hit ground fast
        type: 'coin_drop'
    };

    particles.push(particle);
}
