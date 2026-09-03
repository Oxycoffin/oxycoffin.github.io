const fail = (message) => {
  const el = document.querySelector('#error');
  if (!el) return;
  el.hidden = false;
  el.querySelector('strong').textContent = 'STONE could not start';
  el.querySelector('span').textContent = message;
};

let THREE;
try {
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.167.1/build/three.module.js');
} catch (error) {
  fail('The 3D engine could not be loaded. Check your connection and reload.');
  throw error;
}

const canvas = document.querySelector('#stage');
const sizeInput = document.querySelector('#brush-size');
const strengthInput = document.querySelector('#brush-strength');
const sizeOutput = document.querySelector('#brush-size-value');
const strengthOutput = document.querySelector('#brush-strength-value');
const undoButton = document.querySelector('#undo');
const resetButton = document.querySelector('#reset');
const status = document.querySelector('#status');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c0e);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

scene.add(new THREE.HemisphereLight(0xe9e5dc, 0x11131a, 1.7));

const keyLight = new THREE.DirectionalLight(0xfff7e7, 4.1);
keyLight.position.set(4.5, 5.8, 5.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -4;
keyLight.shadow.camera.right = 4;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -4;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xa9bbff, 1.35);
rimLight.position.set(-5, 1.2, -4);
scene.add(rimLight);

const warmLight = new THREE.PointLight(0xffc68b, 0.8, 12);
warmLight.position.set(-2.2, -0.5, 3.2);
scene.add(warmLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(5.2, 96),
  new THREE.MeshStandardMaterial({
    color: 0x111216,
    roughness: 1,
    metalness: 0
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2.06;
ground.receiveShadow = true;
scene.add(ground);

function createIcosphere(radius = 1.7, subdivisions = 4) {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
  ].map(([x, y, z]) => {
    const len = Math.hypot(x, y, z);
    return [x / len, y / len, z / len];
  });

  let faces = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
    [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
  ];

  for (let level = 0; level < subdivisions; level++) {
    const cache = new Map();
    const midpoint = (a, b) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (cache.has(key)) return cache.get(key);
      const va = vertices[a], vb = vertices[b];
      let x = (va[0] + vb[0]) * 0.5;
      let y = (va[1] + vb[1]) * 0.5;
      let z = (va[2] + vb[2]) * 0.5;
      const len = Math.hypot(x, y, z);
      const idx = vertices.length;
      vertices.push([x / len, y / len, z / len]);
      cache.set(key, idx);
      return idx;
    };

    const next = [];
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }

  const positions = new Float32Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; i++) {
    const [nx, ny, nz] = vertices[i];
    const n1 = Math.sin(nx * 3.2 + ny * 1.7 - nz * 2.3) * 0.075;
    const n2 = Math.sin(nx * 8.3 - ny * 5.1 + nz * 6.7) * 0.032;
    const n3 = Math.cos(nx * 16.1 + ny * 11.4 - nz * 9.3) * 0.012;
    const r = radius * (1 + n1 + n2 + n3);
    positions[i * 3] = nx * r * 1.08;
    positions[i * 3 + 1] = ny * r * 0.94;
    positions[i * 3 + 2] = nz * r * 1.02;
  }

  const IndexArray = vertices.length > 65535 ? Uint32Array : Uint16Array;
  const indices = new IndexArray(faces.length * 3);
  faces.forEach((f, i) => indices.set(f, i * 3));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const adjacency = Array.from({ length: vertices.length }, () => new Set());
  for (const [a, b, c] of faces) {
    adjacency[a].add(b); adjacency[a].add(c);
    adjacency[b].add(a); adjacency[b].add(c);
    adjacency[c].add(a); adjacency[c].add(b);
  }

  return { geometry, adjacency: adjacency.map(set => Array.from(set)) };
}

const { geometry: rockGeometry, adjacency } = createIcosphere();
const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0x8f8e88,
  roughness: 0.88,
  metalness: 0.015
});

const rock = new THREE.Mesh(rockGeometry, rockMaterial);
rock.castShadow = true;
rock.receiveShadow = true;
rock.rotation.set(0.06, -0.25, -0.02);
scene.add(rock);

const positions = rockGeometry.getAttribute('position');
const resetSnapshot = positions.array.slice();
const smoothingSnapshot = new Float32Array(positions.array.length);

const brushRing = new THREE.Mesh(
  new THREE.RingGeometry(0.93, 1, 72),
  new THREE.MeshBasicMaterial({
    color: 0xd6ff74,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false
  })
);
brushRing.renderOrder = 20;
brushRing.visible = false;
scene.add(brushRing);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const worldNormal = new THREE.Vector3();
const normalMatrix = new THREE.Matrix3();
const localHit = new THREE.Vector3();
const vertexNormal = new THREE.Vector3();
const zAxis = new THREE.Vector3(0, 0, 1);

let tool = 'carve';
let brushRadius = Number(sizeInput.value);
let strength = Number(strengthInput.value);
let yaw = -0.05;
let pitch = 0.08;
let distance = 6.0;
let strokeActive = false;
let orbitActive = false;
let pendingHit = null;
let lastStampPoint = null;
let currentPointerId = null;
let lastPointer = { x: 0, y: 0 };
let pointers = new Map();
let pinchState = null;
let lastNormalRecompute = 0;

const history = [];
const HISTORY_LIMIT = 18;

function setStatus(message) {
  status.textContent = message;
  status.classList.add('show');
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => status.classList.remove('show'), 1200);
}

function pushHistory() {
  history.push(positions.array.slice());
  if (history.length > HISTORY_LIMIT) history.shift();
  undoButton.disabled = history.length === 0;
}

function undo() {
  const snapshot = history.pop();
  if (!snapshot) return;
  positions.array.set(snapshot);
  positions.needsUpdate = true;
  rockGeometry.computeVertexNormals();
  rockGeometry.computeBoundingSphere();
  undoButton.disabled = history.length === 0;
  setStatus('Undone');
}

function resetRock() {
  pushHistory();
  positions.array.set(resetSnapshot);
  positions.needsUpdate = true;
  rockGeometry.computeVertexNormals();
  rockGeometry.computeBoundingSphere();
  setStatus('Stone reset');
}

function updateCamera() {
  const cp = Math.cos(pitch);
  camera.position.set(
    Math.sin(yaw) * cp * distance,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * cp * distance
  );
  camera.lookAt(0, -0.05, 0);
}

function resize() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
window.addEventListener('resize', resize, { passive: true });

function pointerToNdc(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function raycastRock(clientX, clientY) {
  pointerToNdc(clientX, clientY);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObject(rock, false)[0] || null;
}

function showBrush(hit) {
  if (!hit || tool === 'orbit') {
    brushRing.visible = false;
    return;
  }
  brushRing.visible = true;
  brushRing.position.copy(hit.point);
  brushRing.scale.setScalar(brushRadius);
  normalMatrix.getNormalMatrix(rock.matrixWorld);
  worldNormal.copy(hit.face.normal).applyMatrix3(normalMatrix).normalize();
  brushRing.quaternion.setFromUnitVectors(zAxis, worldNormal);
}

function stamp(hit) {
  if (!hit) return;
  localHit.copy(hit.point);
  rock.worldToLocal(localHit);

  if (lastStampPoint) {
    const minStep = Math.max(brushRadius * 0.11, 0.018);
    if (lastStampPoint.distanceToSquared(localHit) < minStep * minStep) return;
  }
  lastStampPoint = localHit.clone();

  const radiusSq = brushRadius * brushRadius;
  const pos = positions.array;
  const normals = rockGeometry.getAttribute('normal').array;
  if (tool === 'smooth') smoothingSnapshot.set(pos);

  for (let i = 0; i < positions.count; i++) {
    const ix = i * 3;
    const dx = pos[ix] - localHit.x;
    const dy = pos[ix + 1] - localHit.y;
    const dz = pos[ix + 2] - localHit.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= radiusSq) continue;

    const d = Math.sqrt(d2);
    const x = 1 - d / brushRadius;
    const falloff = x * x * (3 - 2 * x);

    if (tool === 'smooth') {
      const neighbors = adjacency[i];
      if (!neighbors.length) continue;
      let ax = 0, ay = 0, az = 0;
      for (const n of neighbors) {
        const ni = n * 3;
        ax += smoothingSnapshot[ni];
        ay += smoothingSnapshot[ni + 1];
        az += smoothingSnapshot[ni + 2];
      }
      const inv = 1 / neighbors.length;
      const mix = Math.min(0.42, strength * 5.5) * falloff;
      pos[ix] += (ax * inv - smoothingSnapshot[ix]) * mix;
      pos[ix + 1] += (ay * inv - smoothingSnapshot[ix + 1]) * mix;
      pos[ix + 2] += (az * inv - smoothingSnapshot[ix + 2]) * mix;
    } else {
      vertexNormal.set(normals[ix], normals[ix + 1], normals[ix + 2]).normalize();
      const sign = tool === 'raise' ? 1 : -1;
      const delta = sign * strength * falloff;
      pos[ix] += vertexNormal.x * delta;
      pos[ix + 1] += vertexNormal.y * delta;
      pos[ix + 2] += vertexNormal.z * delta;
    }
  }

  positions.needsUpdate = true;
  const now = performance.now();
  if (now - lastNormalRecompute > 24) {
    rockGeometry.computeVertexNormals();
    rockGeometry.computeBoundingSphere();
    lastNormalRecompute = now;
  }
}

function pointerDistance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function midpoint(a, b) { return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 }; }

function beginPinch() {
  if (pointers.size < 2) return;
  const [a, b] = Array.from(pointers.values());
  pinchState = {
    distance: pointerDistance(a, b),
    midpoint: midpoint(a, b),
    cameraDistance: distance,
    yaw,
    pitch
  };
  strokeActive = false;
  orbitActive = false;
  pendingHit = null;
  brushRing.visible = false;
}

function updatePinch() {
  if (pointers.size < 2 || !pinchState) return;
  const [a, b] = Array.from(pointers.values());
  const d = Math.max(pointerDistance(a, b), 20);
  const m = midpoint(a, b);
  distance = THREE.MathUtils.clamp(
    pinchState.cameraDistance * (pinchState.distance / d),
    3.6,
    8.5
  );
  yaw = pinchState.yaw - (m.x - pinchState.midpoint.x) * 0.006;
  pitch = THREE.MathUtils.clamp(
    pinchState.pitch - (m.y - pinchState.midpoint.y) * 0.005,
    -1.18,
    1.18
  );
}

canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture?.(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointers.size === 2) {
    beginPinch();
    return;
  }

  currentPointerId = event.pointerId;
  lastPointer = { x: event.clientX, y: event.clientY };
  lastStampPoint = null;

  const hit = raycastRock(event.clientX, event.clientY);
  if (tool !== 'orbit' && hit) {
    pushHistory();
    strokeActive = true;
    orbitActive = false;
    pendingHit = hit;
    showBrush(hit);
  } else {
    strokeActive = false;
    orbitActive = true;
    brushRing.visible = false;
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointers.size >= 2) {
    updatePinch();
    return;
  }

  if (event.pointerId === currentPointerId && orbitActive) {
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    yaw -= dx * 0.007;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.006, -1.18, 1.18);
    lastPointer = { x: event.clientX, y: event.clientY };
    return;
  }

  const hit = raycastRock(event.clientX, event.clientY);
  showBrush(hit);
  if (event.pointerId === currentPointerId && strokeActive) pendingHit = hit;
}, { passive: true });

function endPointer(event) {
  pointers.delete(event.pointerId);
  if (event.pointerId === currentPointerId) {
    strokeActive = false;
    orbitActive = false;
    pendingHit = null;
    currentPointerId = null;
    lastStampPoint = null;
    rockGeometry.computeVertexNormals();
    rockGeometry.computeBoundingSphere();
  }
  if (pointers.size < 2) pinchState = null;
  if (pointers.size === 1) {
    const [id, p] = Array.from(pointers.entries())[0];
    currentPointerId = id;
    lastPointer = { ...p };
  }
  try { canvas.releasePointerCapture?.(event.pointerId); } catch {}
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  distance = THREE.MathUtils.clamp(distance * Math.exp(event.deltaY * 0.001), 3.6, 8.5);
}, { passive: false });

document.querySelectorAll('[data-tool]').forEach((button) => {
  button.addEventListener('click', () => {
    tool = button.dataset.tool;
    document.querySelectorAll('[data-tool]').forEach((b) => {
      b.classList.toggle('active', b === button);
      b.setAttribute('aria-pressed', b === button ? 'true' : 'false');
    });
    brushRing.visible = false;
    setStatus(button.dataset.label || button.textContent.trim());
  });
});

sizeInput.addEventListener('input', () => {
  brushRadius = Number(sizeInput.value);
  sizeOutput.textContent = brushRadius.toFixed(2);
});
strengthInput.addEventListener('input', () => {
  strength = Number(strengthInput.value);
  strengthOutput.textContent = strength.toFixed(3);
});
undoButton.addEventListener('click', undo);
resetButton.addEventListener('click', resetRock);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pointers.clear();
    strokeActive = false;
    orbitActive = false;
    pendingHit = null;
  }
});

function animate() {
  requestAnimationFrame(animate);
  if (strokeActive && pendingHit && tool !== 'orbit') stamp(pendingHit);
  updateCamera();
  renderer.render(scene, camera);
}

resize();
updateCamera();
undoButton.disabled = true;
requestAnimationFrame(() => document.body.classList.add('ready'));
animate();
