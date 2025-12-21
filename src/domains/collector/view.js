import * as THREE from 'three';

export function createMesh(body) {
    const { label } = body;
    let mesh;

    // Calculate dimensions from vertices
    // (Pattern extracted from graphics.js)
    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    body.vertices.forEach(v => {
        const dx = v.x - body.position.x;
        const dy = v.y - body.position.y;
        const rx = dx * c + dy * s;
        const ry = -dx * s + dy * c;
        if (rx < minX) minX = rx;
        if (rx > maxX) maxX = rx;
        if (ry < minY) minY = ry;
        if (ry > maxY) maxY = ry;
    });

    const w = maxX - minX;
    const h = maxY - minY;

    if (label === 'collector') {
        const r = (w / 2);
        const geo = new THREE.TorusGeometry(r, 6, 16, 32);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.2,
            roughness: 0.2,
            metalness: 0.8
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 2;
        
        const innerGeo = new THREE.CircleGeometry(r, 32);
        const innerMat = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        mesh.add(inner);

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
            arrow.position.set(i * (w / 4), 6, 0);
            arrowGroup.add(arrow);
        }
        arrowGroup.userData = { isArrows: true };
        mesh.add(arrowGroup);
    }

    if (mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
    }
    
    return mesh;
}

export function update(mesh, body) {
    if (!mesh || !body) return;

    // Pulse the collector
    if (body.label === 'collector') {
        mesh.rotation.z += 0.02;
    }

    // Animate conveyor arrows
    if (body.label && body.label.startsWith('conveyor')) {
        mesh.children.forEach(child => {
            if (child.userData.isArrows) {
                child.children.forEach(arrow => {
                    let speed = 0.5;
                    if (body.label === 'conveyor_right') {
                        speed = -0.5;
                        arrow.rotation.z = Math.PI / 2;
                    } else {
                        arrow.rotation.z = -Math.PI / 2;
                    }
                    arrow.position.x += speed;
                    const range = 40; // This should ideally be based on w
                    if (arrow.position.x > range) arrow.position.x -= 2 * range;
                    if (arrow.position.x < -range) arrow.position.x += 2 * range;
                });
            }
        });
    }
}
