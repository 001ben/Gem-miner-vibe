import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { world } from './physics.js';
import { state } from './state.js';
import { getShopPads } from '../entities/shop.js';

export let scene, camera, renderer;
export const bodyMeshMap = new Map();
export const particles = [];
const tracks = [];
let trackTexture;
let dirtTexture;
let lastDozerPos = null;
const gemInstancedMeshes = {}; // Map of colorHex -> InstancedMesh
const dummy = new THREE.Object3D();
const MAX_GEMS_PER_TYPE = 1000;

export function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaccff); // Brighter, more vivid sky
  // Fog for depth
  scene.fog = new THREE.Fog(0xaaccff, 500, 10000);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspect, 10, 5000);
  // Initial position, updated later
  camera.position.set(0, 1500, 100);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Environment Map (for realistic reflections)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); // Balanced ambient
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.3); // Slightly softer sun
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

  createDirtTexture();
  createTrackTexture();

  // Ground
  const planeGeo = new THREE.PlaneGeometry(10000, 10000);
  // Darker, "dirtier" sand/dirt
  const planeMat = new THREE.MeshStandardMaterial({
    color: 0x665544, // Darker brownish-grey
    map: dirtTexture,
    roughness: 0.95, // Very rough
    metalness: 0.0
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -2;
  plane.receiveShadow = true;
  scene.add(plane);

  // Gem Instanced Meshes (Mapped by Color)
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
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ ...gemMatBase, color: new THREE.Color(color) }), MAX_GEMS_PER_TYPE);
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

function createDirtTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base color
  ctx.fillStyle = '#aa8c66';
  ctx.fillRect(0, 0, 512, 512);

  // Add noise/dirt spots
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2 + 1;
    const shade = Math.random() * 40 - 20;

    // Convert base hex to RGB and apply shade
    const r = Math.max(0, Math.min(255, 170 + shade));
    const g = Math.max(0, Math.min(255, 140 + shade));
    const b = Math.max(0, Math.min(255, 102 + shade));

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, size, size);
  }

  dirtTexture = new THREE.CanvasTexture(canvas);
  dirtTexture.wrapS = THREE.RepeatWrapping;
  dirtTexture.wrapT = THREE.RepeatWrapping;
  dirtTexture.repeat.set(50, 50); // Repeat across the large plane
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
  for (let y = 0; y < 64; y += 8) {
    ctx.fillRect(4, y, 16, 4); // Left tread
    ctx.fillRect(44, y, 16, 4); // Right tread
  }

  // Add some noise or dirt
  ctx.fillStyle = 'rgba(25, 20, 15, 0.2)';
  ctx.fillRect(0, 0, 64, 64);

  trackTexture = new THREE.CanvasTexture(canvas);
  trackTexture.magFilter = THREE.NearestFilter;
  trackTexture.wrapS = THREE.RepeatWrapping;
  trackTexture.wrapT = THREE.RepeatWrapping;
}

/**
 * Renders a specific model type in isolation for verification/debugging.
 * Clears the scene and sets up a studio-like environment.
 */
export function debugRenderModel(type, level = 1) {
  // Clear existing scene
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  bodyMeshMap.clear();

  // Reset Camera
  camera.position.set(0, 200, 200);
  camera.lookAt(0, 0, 0);

  // Studio Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const spot = new THREE.SpotLight(0xffffff, 1);
  spot.position.set(100, 200, 100);
  spot.lookAt(0, 0, 0);
  scene.add(spot);

  // Grid helper
  const grid = new THREE.GridHelper(500, 50, 0x444444, 0x222222);
  scene.add(grid);

  // Create Dummy Body for visualization
  let body = {
    position: { x: 0, y: 0 },
    angle: 0,
    vertices: [],
    label: type,
    // Mock properties usually provided by Matter.js
    parts: []
  };

  // Simulate body dimensions based on type/level
  let w = 40, h = 40;
  if (type === 'plow') {
    w = 50 + (level * 5); // Approximate expansion
    h = 20;
    state.plowLevel = level; // Hack state for createMesh check
  } else if (type === 'chassis') {
    w = 60; h = 40;
  }

  // Create vertices for createMesh calculation
  body.vertices = [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 }
  ];

  const mesh = createMesh(body);
  if (mesh) {
    scene.add(mesh);
    // Spin it slowly in update loop if we wanted, but static is fine for screenshot
    mesh.rotation.y = Math.PI; // Face camera?
  }
}
window.debugRenderModel = debugRenderModel;

export function createMesh(body) {
  let mesh;
  const { label } = body;

  const c = Math.cos(body.angle);
  const s = Math.sin(body.angle);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  body.vertices.forEach(v => {
    // Transform world vertex back to local space relative to body center
    // pos = body.pos + rotate(localPos)
    // localPos = rotateInv(pos - body.pos)
    const dx = v.x - body.position.x;
    const dy = v.y - body.position.y;
    
    // Rotate by -angle
    const rx = dx * c + dy * s;
    const ry = -dx * s + dy * c;

    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry;
    if (ry > maxY) maxY = ry;
  });

  const w = maxX - minX;
  const h = maxY - minY;

  if (label === 'plow') {
      console.log(`[DEBUG] createMesh(plow): Angle=${body.angle.toFixed(2)} W=${w.toFixed(2)} H=${h.toFixed(2)}`);
  }

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
    // Deterministic Dimension Calculation (Matches src/entities/bulldozer.js)
    // Synchronized to fix misalignment at high levels
    // Width = Base (60) + (Level * 8 * 2) * 1.5 scaling
    const plowWidth = (60 + (state.plowLevel * 16)) * 1.5;
    const plowHeight = 22; 

    let geo;
    if (state.plowLevel >= 6) {
      // Curved / Bigger wings visual
      geo = new THREE.BoxGeometry(plowWidth, 20, plowHeight);
    } else {
      geo = new THREE.BoxGeometry(plowWidth, 15, plowHeight);
    }

    const mat = new THREE.MeshStandardMaterial({ color: 0xd35400 });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 7.5;

  } else if (label === 'plow_wing') {
    // Render the physical wings separately
    const geo = new THREE.BoxGeometry(w, 15, h);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd35400 });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 7.5;

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
      emissiveIntensity: 0.2, // High neon intensity
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
  } else if (label && label.startsWith('shop_pad')) {
    const geo = new THREE.BoxGeometry(w, 5, h);
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 2.5;

    const billGeo = new THREE.PlaneGeometry(w * 1.5, h * 0.8);
    const billMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
    const billMesh = new THREE.Mesh(billGeo, billMat);

    billMesh.position.set(0, 60, -h / 2 - 20);
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
      arrow.position.set(i * (w / 4), 6, 0);
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
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.6,
      metalness: 0.2
    });
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
  // Spawn a flying coin visual (DOM based)
  const start = startPos ? new THREE.Vector3(startPos.x, 10, startPos.y) : new THREE.Vector3(0, 10, 400);

  // Project start position to screen coordinates
  start.project(camera);

  const x = (start.x * 0.5 + 0.5) * window.innerWidth;
  const y = -(start.y * 0.5 - 0.5) * window.innerHeight;

  const el = document.createElement('div');
  el.className = 'flying-coin';
  el.innerText = '$';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);

  // Target: #money element
  const moneyEl = document.getElementById('money');
  const moneyRect = moneyEl.getBoundingClientRect();
  const targetX = moneyRect.left + moneyRect.width / 2;
  const targetY = moneyRect.top + moneyRect.height / 2;

  // Animate using Web Animations API for smoother performance
  const animation = el.animate([
    { transform: `translate(0, 0) scale(1)` },
    { transform: `translate(${targetX - x}px, ${targetY - y}px) scale(0.5)` }
  ], {
    duration: 800,
    easing: 'ease-in'
  });

  animation.onfinish = () => {
    el.remove();
  };
}


export function updateGraphics(bulldozer, bulldozerRenderer, alpha = 1.0) {
  const bodies = Matter.Composite.allBodies(world);
  const activeIds = new Set();
  const shopPads = getShopPads();

  // Reset counters for each color type
  const typeIndices = {};
  Object.keys(gemInstancedMeshes).forEach(color => typeIndices[color] = 0);

  bodies.forEach(body => {
    // Calculate interpolated values for the body
    const interpX = body.positionPrev.x + (body.position.x - body.positionPrev.x) * alpha;
    const interpY = body.positionPrev.y + (body.position.y - body.positionPrev.y) * alpha;
    
    // Angle interpolation (handle wrapping if necessary, though Matter.js angles usually don't wrap abruptly)
    const interpAngle = body.anglePrev + (body.angle - body.anglePrev) * alpha;

    // 1. Handle Bulldozer (Compound Body)
    if (body.label === 'bulldozer') {
      if (bulldozerRenderer && bulldozerRenderer.isLoaded) {
        // Phase 3 & 4: Interpolated Geometric Offset Correction
        const offset = body.chassisOffset || { x: 0, y: 0 };
        const cos = Math.cos(interpAngle);
        const sin = Math.sin(interpAngle);
        
        const rotatedX = offset.x * cos - offset.y * sin;
        const rotatedY = offset.x * sin + offset.y * cos;

        const renderX = interpX + rotatedX;
        const renderY = interpY + rotatedY;

        bulldozerRenderer.setPose({ x: renderX, y: renderY }, interpAngle);

        const angle = interpAngle - Math.PI / 2;
        const fwdX = Math.cos(angle);
        const fwdY = Math.sin(angle);
        const dot = body.velocity.x * fwdX + body.velocity.y * fwdY;
        const speed = dot * 0.05;

        const visualScale = 1.0 + (state.dozerLevel - 1) * 0.15;
        bulldozerRenderer.setScale(visualScale * 10.0);

        // Sync Plow Upgrades
        // Width: Base 3 + (Level * 1)? Need to check physical match.
        // Physical: (60 + (plowLevel * 16)) * 1.5 = 114 (Lvl1) to ~240 (Lvl10)
        // Renderer Scale = 10.0. Segment Width = 1.0.
        // Visual Width = Segments * 1.0 * 10.0 = Segments * 10.
        // To match Physics: Segments = PhysicsWidth / 10.
        // Lvl 1: 114 / 10 = 11.4 -> 12 segments
        const physicsWidth = (60 + (state.plowLevel * 16)) * 1.5;
        const plowSegs = Math.ceil(physicsWidth / 10.0);
        bulldozerRenderer.setPlowWidth(plowSegs);

        // Wings: Active >= Level 3.
        const wingsActive = state.plowLevel >= 3;
        // Wing Scale: 1.0 + (Level - 3) * 0.1
        let wingScale = 1.0;
        if (state.plowLevel > 3) {
            wingScale = 1.0 + (state.plowLevel - 3) * 0.1;
        }
        bulldozerRenderer.setPlowWings(wingsActive, wingScale);

        // Teeth: Toggleable? Or High Level?
        // User: "I don't want the teeth to always be enabled."
        // Logic: Enable if explicitly toggled (debug/future UI) OR maybe very high level?
        // For now, respect a state flag if it exists, else false.
        const teethActive = state.plowTeethEnabled || false;
        bulldozerRenderer.setPlowTeeth(teethActive);


        bulldozerRenderer.setSpeeds(speed, speed);
        bulldozerRenderer.update(1 / 60);
      }
    }

    // 2. Handle Other Bodies (Parts or Single)
    const parts = (body.parts && body.parts.length > 1) ? body.parts.slice(1) : [body];
    parts.forEach(part => {
      // Skip chassis/plow mesh creation if handled by BulldozerRenderer
      if (part.label === 'chassis') return;
      if (part.label === 'plow' && bulldozerRenderer && bulldozerRenderer.isLoaded) return;

      if (part.label === 'gem') {
        const color = part.gemColorHex;
        const index = typeIndices[color];
        const mesh = gemInstancedMeshes[color];

        if (mesh && index < MAX_GEMS_PER_TYPE) {
            // Interpolate gems too
            const pX = part.positionPrev.x + (part.position.x - part.positionPrev.x) * alpha;
            const pY = part.positionPrev.y + (part.position.y - part.positionPrev.y) * alpha;
            const pA = part.anglePrev + (part.angle - part.anglePrev) * alpha;

            dummy.position.set(pX, 0, pY);
            const r = part.circleRadius || 10;
            dummy.position.y = r;
            dummy.rotation.set(0, -pA, 0);
            dummy.scale.setScalar(r);
            dummy.updateMatrix();

            mesh.setMatrixAt(index, dummy.matrix);
            typeIndices[color]++;
        }
        return;
      }

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
        // Phase 3 & 4: Interpolated Geometric Offset Correction for procedural parts
        if (part.oOffset) {
            const cos = Math.cos(interpAngle);
            const sin = Math.sin(interpAngle);
            const rotatedX = part.oOffset.x * cos - part.oOffset.y * sin;
            const rotatedY = part.oOffset.x * sin + part.oOffset.y * cos;
            
            mesh.position.x = interpX + rotatedX;
            mesh.position.z = interpY + rotatedY;
            mesh.rotation.y = -(interpAngle + (part.oAngle || 0));
        } else {
            // Standard interpolation for single bodies
            const pX = part.positionPrev.x + (part.position.x - part.positionPrev.x) * alpha;
            const pY = part.positionPrev.y + (part.position.y - part.positionPrev.y) * alpha;
            const pA = part.anglePrev + (part.angle - part.anglePrev) * alpha;

            mesh.position.x = pX;
            mesh.position.z = pY;
            mesh.rotation.y = -pA;
        }

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
                if (arrow.position.x > range) arrow.position.x -= 2 * range;
                if (arrow.position.x < -range) arrow.position.x += 2 * range;
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
    // Mobile check: Zoom out on small screens (width <= 768)
    const isMobile = window.innerWidth <= 768;
    const baseHeight = isMobile ? 800 : 500;

    const zoomLevel = (state.dozerLevel - 1) * 50; // Reduced zoom multiplier
    const targetY = baseHeight + zoomLevel;
    const targetOffsetZ = targetY / 1.732; // this targets a 60 degree perspective angle
    camera.position.y = targetY;
    camera.position.x = bulldozer.position.x;
    camera.position.z = bulldozer.position.y + targetOffsetZ;
    camera.lookAt(bulldozer.position.x, 0, bulldozer.position.y);

    if (!lastDozerPos) {
      lastDozerPos = { ...bulldozer.position };
    } else {
      const dx = bulldozer.position.x - lastDozerPos.x;
      const dy = bulldozer.position.y - lastDozerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 20) {
        const width = 40 + (state.dozerLevel * 5);
        spawnTrackSegment(bulldozer.position, bulldozer.angle, width);
        spawnParticles(bulldozer.position, 0x3d2b1f, 'dust'); // Much darker brown
        lastDozerPos = { ...bulldozer.position };
      }
    }
  }

  updateParticles();

  // Update all gem types
  Object.keys(gemInstancedMeshes).forEach(color => {
    const mesh = gemInstancedMeshes[color];
    const count = typeIndices[color];
    mesh.count = count;
    if (count > 0) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  renderer.render(scene, camera);
}

window.spawnCoinDrop = spawnCoinDrop;
