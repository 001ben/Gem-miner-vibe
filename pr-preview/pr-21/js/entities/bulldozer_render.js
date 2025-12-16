import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- Procedural Textures ---
function createProceduralTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (type === 'tracks') {
        // Tread pattern
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#333';
        // Draw Chevrons
        const barHeight = 64;
        for(let y=0; y<512; y+=barHeight) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(256, y + 32);
            ctx.lineTo(512, y);
            ctx.lineTo(512, y + 20);
            ctx.lineTo(256, y + 52);
            ctx.lineTo(0, y + 20);
            ctx.fill();
        }
    } else if (type === 'body') {
        // Metal Scratches/Noise
        ctx.fillStyle = '#FFAA00'; // Base Yellow
        ctx.fillRect(0, 0, 512, 512);

        // Add Noise
        for(let i=0; i<5000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const w = Math.random() * 10 + 1;
            const h = Math.random() * 2 + 1;
            ctx.fillRect(x, y, w, h);
        }

        // Rust spots
        for(let i=0; i<20; i++) {
             ctx.fillStyle = 'rgba(100, 50, 0, 0.2)';
             const x = Math.random() * 512;
             const y = Math.random() * 512;
             const r = Math.random() * 50 + 10;
             ctx.beginPath();
             ctx.arc(x, y, r, 0, Math.PI*2);
             ctx.fill();
        }
    } else if (type === 'cabin') {
        // Grey Metal
        ctx.fillStyle = '#888899';
        ctx.fillRect(0, 0, 512, 512);
        // Bolts/Rivets
         ctx.fillStyle = '#555';
         for(let x=20; x<512; x+=100) {
             for(let y=20; y<512; y+=100) {
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI*2);
                ctx.fill();
             }
         }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

// --- Triplanar Shader Logic ---
function enhanceMaterialWithTriplanar(material, isScrolling, animatedMaterials) {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uScale = { value: 0.1 }; // Texture scale

        if (isScrolling) {
            animatedMaterials.push(shader.uniforms);
        }

        // Vertex Shader: Pass world position and normal
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `
            #include <common>
            varying vec3 vWorldPosition;
            varying vec3 vWorldNormal;
            `
        );
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `
            #include <worldpos_vertex>
            vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            `
        );

        // Fragment Shader: Triplanar Mapping
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>
            varying vec3 vWorldPosition;
            varying vec3 vWorldNormal;
            uniform float uTime;
            uniform float uScale;
            `
        );

        // Replace the map fragment with triplanar logic
        const triplanarLogic = `
            vec3 blending = abs(vWorldNormal);
            blending = normalize(max(blending, 0.00001)); // Avoid div by zero
            float b = (blending.x + blending.y + blending.z);
            blending /= b;

            vec3 coord = vWorldPosition * uScale;

            // Scrolling logic
            float scroll = ${isScrolling ? 'uTime * 2.0' : '0.0'};

            vec4 xaxis = texture2D(map, coord.yz + vec2(0.0, scroll));
            vec4 yaxis = texture2D(map, coord.xz + vec2(0.0, scroll));
            vec4 zaxis = texture2D(map, coord.xy + vec2(0.0, scroll));

            vec4 texColor = xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;

            diffuseColor *= texColor;
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            triplanarLogic
        );
    };
}

export class BulldozerRenderer {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.loader = new GLTFLoader();
        this.animatedMaterials = [];
        this.animatedInstances = []; // { mesh, curve, count, speed, offset, side }

        this.trackParams = {
            up: new THREE.Vector3(1, 0, 0), // Axle
            rotX: 0,
            rotY: 0,
            rotZ: Math.PI * 1.5, // 270 deg
            spread: 1.6
        };

        this.scale = 100.0;

        // Reusable vectors
        this._position = new THREE.Vector3();
        this._tangent = new THREE.Vector3();
        this._lookAtTarget = new THREE.Vector3();
        this.dummy = new THREE.Object3D();

        this.isLoaded = false;
    }

    load(url) {
        const startTime = performance.now();
        console.log(`Loading asset: ${url}...`);
        let fileSize = 0;

        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                const endTime = performance.now();
                const duration = (endTime - startTime).toFixed(2);
                console.log(`Asset loaded: ${url}`);
                console.log(`Time: ${duration}ms, Size: ${(fileSize / 1024).toFixed(2)} KB`);

                // Parse components
                let bodyMesh = null;
                let linkGeo = null;
                let linkMat = null;
                let leftPathPoints = null;
                let rightPathPoints = null;

                gltf.scene.traverse((child) => {
                    // console.log(`Node: ${child.name}, Type: ${child.type}, isMesh: ${child.isMesh}`);
                    if (child.name.includes("Bulldozer_Body") && (child.isMesh || child.type === 'Group')) {
                        console.log("Found Bulldozer_Body!");
                        bodyMesh = child.clone();
                    }
                    else if (child.name.includes("Asset_TrackLink") && child.isMesh) {
                        linkGeo = child.geometry;
                        linkMat = child.material;
                    }
                    else if (child.name.includes("Asset_TrackPath_L")) {
                        if (child.isMesh || child.isLine) {
                            const attr = child.geometry.attributes.position;
                            leftPathPoints = [];
                            for (let i = 0; i < attr.count; i++) {
                                leftPathPoints.push(new THREE.Vector3().fromBufferAttribute(attr, i));
                            }
                        }
                    }
                    else if (child.name.includes("Asset_TrackPath_R")) {
                         if (child.isMesh || child.isLine) {
                            const attr = child.geometry.attributes.position;
                            rightPathPoints = [];
                            for (let i = 0; i < attr.count; i++) {
                                rightPathPoints.push(new THREE.Vector3().fromBufferAttribute(attr, i));
                            }
                        }
                    }
                });

                // Setup Body
                if (bodyMesh) {
                    console.log("Setting up body mesh...");
                    this.group.add(bodyMesh);

                    const texBody = createProceduralTexture('body');
                    const matBody = new THREE.MeshStandardMaterial({
                        map: texBody,
                        roughness: 0.8,
                        metalness: 0.2
                    });
                    enhanceMaterialWithTriplanar(matBody, false, this.animatedMaterials);

                    const matGlass = new THREE.MeshPhysicalMaterial({
                        color: 0xaaccff,
                        metalness: 0.1,
                        roughness: 0.1,
                        transmission: 0.6,
                        transparent: true
                    });

                    bodyMesh.traverse((c) => {
                        if (c.isMesh) {
                            c.castShadow = true;
                            c.receiveShadow = true;
                            // Check material name for Glass
                            if (c.material && c.material.name && c.material.name.includes("Glass")) {
                                c.material = matGlass;
                            } else {
                                c.material = matBody;
                            }
                        }
                    });
                } else {
                    console.warn("Bulldozer_Body mesh not found in GLB! Using fallback.");
                    const geo = new THREE.BoxGeometry(2.5, 1.5, 4.0); // Rough dimensions from Blender (Y is Z in Three?)
                    // Blender: 2.5(X), 4.0(Y), 1.5(Z).
                    // Three: 2.5(X), 1.5(Y/Height), 4.0(Z/Depth).
                    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: true });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.y = 1.0 + 0.75; // Z=1.0 + half height?
                    this.group.add(mesh);
                }

                // Setup Tracks
                const setupTrack = (points, side) => {
                    if (!points || points.length < 2 || !linkGeo) {
                        console.warn(`Skipping track setup for side ${side}: Invalid points or geometry.`);
                        return;
                    }
                    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
                    const count = 50;

                    // Track Material
                    const tex = createProceduralTexture('tracks');
                    const mat = new THREE.MeshStandardMaterial({
                        map: tex,
                        roughness: 0.8,
                        metalness: 0.2
                    });
                    enhanceMaterialWithTriplanar(mat, true, this.animatedMaterials); // Scrolling enabled

                    const mesh = new THREE.InstancedMesh(linkGeo, mat, count);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

                    this.group.add(mesh);

                    this.animatedInstances.push({
                        mesh: mesh,
                        curve: curve,
                        count: count,
                        speed: 0, // Controlled via update
                        offset: 0,
                        side: side
                    });
                };

                setupTrack(leftPathPoints, -1);
                setupTrack(rightPathPoints, 1);

                this.isLoaded = true;
                resolve();
            }, (xhr) => {
                // onProgress
                if (xhr.lengthComputable) {
                    fileSize = xhr.total;
                } else {
                    fileSize = xhr.loaded; // Best guess
                }
            }, reject);
        });
    }

    setPose(position, angle) {
        this.group.position.set(position.x, 0, position.y);
        this.group.rotation.y = -angle; // MatterJS angle is -ThreeJS Y rotation?
        this.group.scale.setScalar(this.scale);
    }

    setScale(s) {
        this.scale = s;
    }

    setSpeeds(leftSpeed, rightSpeed) {
        // Find instances
        this.animatedInstances.forEach(track => {
            // side -1 is left, 1 is right
            if (track.side === -1) track.speed = leftSpeed;
            if (track.side === 1) track.speed = rightSpeed;
        });
    }

    update(delta) {
        // Update shader animations
        this.animatedMaterials.forEach(uniforms => {
            uniforms.uTime.value += delta;
        });

        // Update tracks
        this.animatedInstances.forEach(track => {
            if (Math.abs(track.speed) > 0.001) {
                track.offset = (track.offset + track.speed * delta) % 1.0;
            }

            for (let i = 0; i < track.count; i++) {
                const t = (i / track.count + track.offset) % 1.0;
                track.curve.getPointAt(t, this._position);
                track.curve.getTangentAt(t, this._tangent);

                this.dummy.up.copy(this.trackParams.up);
                this.dummy.position.copy(this._position);

                this._lookAtTarget.copy(this._position).add(this._tangent);
                this.dummy.lookAt(this._lookAtTarget);

                // UI Corrections / Fixes
                if (this.trackParams.rotX) this.dummy.rotateX(this.trackParams.rotX);
                if (this.trackParams.rotY) this.dummy.rotateY(this.trackParams.rotY);
                if (this.trackParams.rotZ) this.dummy.rotateZ(this.trackParams.rotZ);

                if (this.trackParams.spread) {
                    this.dummy.position.addScaledVector(this.trackParams.up, this.trackParams.spread * track.side);
                }

                this.dummy.updateMatrix();
                track.mesh.setMatrixAt(i, this.dummy.matrix);
            }
            track.mesh.instanceMatrix.needsUpdate = true;
        });
    }
}
