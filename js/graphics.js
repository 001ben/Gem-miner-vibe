import { world } from './physics.js';
import { state } from './state.js';

export let scene, camera, renderer;
export const bodyMeshMap = new Map();
export const particles = [];

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
}

export function spawnParticles(pos, color) {
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

export function updateGraphics(bulldozer) {
    // 1. Sync Physics to Mesh
    const bodies = Matter.Composite.allBodies(world);
    const activeIds = new Set();

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
    }

    updateParticles();
    renderer.render(scene, camera);
}
