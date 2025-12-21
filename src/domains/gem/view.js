import * as THREE from 'three';

const gemInstancedMeshes = {};
const dummy = new THREE.Object3D();
const MAX_GEMS_PER_TYPE = 1000;

export function init(scene) {
    const gemMatBase = {
        roughness: 0.05,
        metalness: 0.9,
        emissive: 0x222222,
        emissiveIntensity: 0.3
    };

    const mappings = [
        { color: '#00FFFF', geo: new THREE.IcosahedronGeometry(1, 0) },
        { color: '#FF00FF', geo: new THREE.IcosahedronGeometry(1, 0) },
        { color: '#FFFF00', geo: new THREE.DodecahedronGeometry(1) },
        { color: '#00FF00', geo: new THREE.OctahedronGeometry(1) }
    ];

    mappings.forEach(({ color, geo }) => {
        const mesh = new THREE.InstancedMesh(
            geo, 
            new THREE.MeshStandardMaterial({ ...gemMatBase, color: new THREE.Color(color) }), 
            MAX_GEMS_PER_TYPE
        );
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Critical Fix: Disable frustum culling because the bounding sphere is not automatically updated
        // for dynamic instances, causing gems to disappear when far from origin.
        mesh.frustumCulled = false; 
        scene.add(mesh);
        gemInstancedMeshes[color] = mesh;
    });
}

export function update(bodies, alpha = 1.0) {
    // Reset counters for each color type
    const typeIndices = {};
    Object.keys(gemInstancedMeshes).forEach(color => typeIndices[color] = 0);

    // Filter for gems only
    // Optimization: The caller (graphics.js) currently iterates ALL bodies.
    // Ideally, we would pass only gem bodies here, or iterate ourselves if we had a reference.
    // For now, we will iterate the provided bodies array and pick out gems.
    
    bodies.forEach(body => {
        if (body.label !== 'gem') return;

        const color = body.gemColorHex;
        const index = typeIndices[color];
        const mesh = gemInstancedMeshes[color];

        if (mesh && index < MAX_GEMS_PER_TYPE) {
            // Interpolate position and angle
            const pX = body.positionPrev.x + (body.position.x - body.positionPrev.x) * alpha;
            const pY = body.positionPrev.y + (body.position.y - body.positionPrev.y) * alpha;
            const pA = body.anglePrev + (body.angle - body.anglePrev) * alpha;

            dummy.position.set(pX, 0, pY);
            const r = body.circleRadius || 10;
            dummy.position.y = r;
            dummy.rotation.set(0, -pA, 0);
            dummy.scale.setScalar(r);
            dummy.updateMatrix();

            mesh.setMatrixAt(index, dummy.matrix);
            typeIndices[color]++;
        }
    });

    // Flag updates
    Object.keys(gemInstancedMeshes).forEach(color => {
        const mesh = gemInstancedMeshes[color];
        const count = typeIndices[color];
        mesh.count = count;
        if (count > 0) {
            mesh.instanceMatrix.needsUpdate = true;
        }
    });
}
