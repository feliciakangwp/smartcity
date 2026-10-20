// 3D smart-city view. Each system is a store on a lot along one main road.
// Healthy links are delivery trucks; broken links are couriers stuck with a "?".
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as store from './store.js';
import { computeLinks, STATUS_LABEL } from './validation.js';
import { esc, openSystem } from './ui.js';

const SPACING = 28;     // distance between store columns
const LOT_Z = 17;       // lot centre distance from the road centre line
const DOOR_Z = 9;       // where a store's walkway meets the pavement
const WALL_COLORS = [0x7fb7c9, 0xf2c57c, 0x9fd18b, 0xe8a0a8, 0xb8a6e3, 0x8fcfc0, 0xf0a97a];
const BRICK = 0x9a6b4f;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer, scene, camera, controls, clock, stage, raycaster, pointer;
let raf = null;
let city = null;
let animated = [];   // objects with update(dt, t)
let pickables = [];

export function start(el, { rebuild }) {
  if (!renderer) init(el);
  if (rebuild || !city) buildCity();
  resize();
  if (!raf) { clock.getDelta(); loop(); }
}

export function pause() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
}

function init(el) {
  stage = el;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  document.getElementById('city-loading').hidden = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe0ee);
  scene.fog = new THREE.Fog(0xbfe0ee, 140, 300);

  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 800);
  camera.position.set(-14, 66, 96);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.minDistance = 20;
  controls.maxDistance = 220;
  controls.autoRotateSpeed = 0.6;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f5a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sun.position.set(50, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 70, bottom: -70, near: 1, far: 260 });
  scene.add(sun);

  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  new ResizeObserver(resize).observe(el);

  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const hit = pick(e);
    if (hit) showInfo(hit);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    renderer.domElement.style.cursor = pick(e) ? 'pointer' : 'grab';
  });

  const rotate = document.getElementById('city-rotate');
  rotate.addEventListener('change', () => (controls.autoRotate = rotate.checked));

  document.getElementById('city-info').addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.close !== undefined) document.getElementById('city-info').hidden = true;
    if (t.dataset.open) openSystem(t.dataset.open);
  });
}

function resize() {
  if (!renderer || !stage.clientWidth) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function loop() {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  for (const a of animated) a.update(dt, t);
  controls.update();
  renderer.render(scene, camera);
}

function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  for (const hit of raycaster.intersectObjects(pickables, true)) {
    let o = hit.object;
    while (o && !o.userData.pick) o = o.parent;
    if (o) return o.userData.pick;
  }
  return null;
}

// ---------- helpers ----------
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts }));
  return matCache.get(key);
}

function box(w, h, d, color, x = 0, y = 0, z = 0, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(r, h, color, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function textSprite(draw, w, h, scale) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(scale * (w / h), scale, 1);
  s.renderOrder = 10;
  return s;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function disposeTree(obj) {
  const shared = new Set(matCache.values());
  obj.traverse((o) => {
    o.geometry?.dispose();
    if (o.material && !shared.has(o.material)) {
      o.material.map?.dispose();
      o.material.dispose();
    }
  });
}

// ---------- city ----------
function buildCity() {
  if (city) { scene.remove(city); disposeTree(city); }
  city = new THREE.Group();
  animated = [];
  pickables = [];
  document.getElementById('city-info').hidden = true;

  const systems = store.getSystems();
  const links = computeLinks(systems);
  const cols = Math.max(1, Math.ceil(systems.length / 2));
  const halfW = (cols * SPACING) / 2 + 24;
  const rand = rng(7);

  // Ground, main road, pavements, cross streets
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 + 80, 150), mat(0x8cc084));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  city.add(ground);
  city.add(box(halfW * 2 + 40, 0.1, 10, 0x3d4549, 0, 0.05, 0));
  for (let x = -halfW - 18; x < halfW + 18; x += 6) city.add(box(2.6, 0.12, 0.3, 0xf2f2e8, x, 0.08, 0));
  for (const s of [-1, 1]) city.add(box(halfW * 2 + 40, 0.3, 2.4, 0xcfcfc6, 0, 0.15, s * 6.2));
  for (let c = 0; c <= cols; c++) {
    const x = (c - cols / 2) * SPACING;
    for (const s of [-1, 1]) city.add(box(4, 0.1, 30, 0x4a5357, x, 0.05, s * 22.4));
  }

  // Trees and street lamps
  for (let x = -halfW - 10; x < halfW + 10; x += 7 + rand() * 5) {
    for (const s of [-1, 1]) {
      if (rand() < 0.75) city.add(tree(x + rand() * 2, s * (33 + rand() * 6), rand));
    }
  }
  for (let x = -halfW; x <= halfW; x += 14) {
    for (const s of [-1, 1]) city.add(lamp(x, s * 7.2));
  }

  // Stores
  const positions = new Map();
  systems.forEach((sys, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const x = (Math.floor(i / 2) - (cols - 1) / 2) * SPACING;
    positions.set(sys.id, { x, side, doorZ: side * DOOR_Z, index: i });
    const brokenCount = links.filter((l) => (l.from === sys.id || l.to === sys.id) && l.status === 'broken').length;
    const lot = buildLot(sys, i);
    lot.position.set(x, 0, side * LOT_Z);
    if (side > 0) lot.rotation.y = Math.PI;
    lot.userData.pick = { type: 'system', id: sys.id };
    pickables.push(lot);
    city.add(lot);

    const label = storeLabel(sys, brokenCount);
    label.position.set(x, 14, side * (LOT_Z + 7));
    city.add(label);
  });

  // Data links
  links.forEach((link, k) => {
    const a = positions.get(link.from);
    const b = positions.get(link.to);
    if (!a || !b) return;
    city.add(arc(a, b, link));
    const route = makeRoute(a, b, k);
    if (link.status === 'broken') addStuckCourier(route, link);
    else addTrucks(route, link);
  });

  scene.add(city);
}

function tree(x, z, rand) {
  const g = new THREE.Group();
  const h = 1.6 + rand() * 1.2;
  g.add(cyl(0.25, h, 0x7a5a3a, 0, h / 2, 0, 6));
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + rand() * 0.8, 0), mat(rand() < 0.5 ? 0x4f9a52 : 0x5fae5a));
  crown.position.y = h + 1;
  crown.castShadow = true;
  g.add(crown);
  g.position.set(x, 0, z);
  return g;
}

function lamp(x, z) {
  const g = new THREE.Group();
  g.add(cyl(0.1, 5, 0x5a6266, 0, 2.5, 0, 6));
  g.add(box(0.9, 0.2, 0.4, 0x5a6266, 0, 5, -Math.sign(z) * 0.4));
  g.add(box(0.5, 0.12, 0.3, 0xfff1b8, 0, 4.88, -Math.sign(z) * 0.5, { emissive: 0xffe9a0, emissiveIntensity: 0.6 }));
  g.position.set(x, 0, z);
  return g;
}

// A lot holds one building block per build part. Local +z faces the road.
function buildLot(sys, index) {
  const g = new THREE.Group();
  const p = store.progressOf(sys);
  const rand = rng(index * 97 + 13);
  const color = sys.legacy ? BRICK : WALL_COLORS[index % WALL_COLORS.length];

  g.add(box(22, 0.3, 16, p === 0 ? 0x9b7b56 : sys.legacy ? 0xa9a59b : 0xdedbd2, 0, 0.15, 0));
  g.add(box(2.2, 0.34, 4, 0xbdbdb4, 0, 0.17, 6));

  if (p === 0) {
    emptyLand(g, rand);
    return g;
  }

  const parts = sys.parts.length ? sys.parts : [{ name: '', progress: 0 }];
  const gap = 0.8;
  const w = (20 - gap * (parts.length - 1)) / parts.length;
  parts.forEach((part, j) => {
    const pg = buildPart(part.progress, w, 10, sys, color, rand, j === parts.length - 1);
    pg.position.set(-10 + w / 2 + j * (w + gap), 0.3, -1);
    g.add(pg);
  });
  return g;
}

function emptyLand(g, rand) {
  // Fence, dirt mounds and a "reserved" board: land waiting to be built.
  for (let x = -10.5; x <= 10.5; x += 1.5) {
    g.add(box(0.15, 1.1, 0.15, 0xd8c8a0, x, 0.85, -7.6));
    g.add(box(0.15, 1.1, 0.15, 0xd8c8a0, x, 0.85, 7.6));
  }
  for (let z = -7.6; z <= 7.6; z += 1.5) {
    g.add(box(0.15, 1.1, 0.15, 0xd8c8a0, -10.5, 0.85, z));
    g.add(box(0.15, 1.1, 0.15, 0xd8c8a0, 10.5, 0.85, z));
  }
  for (const z of [-7.6, 7.6]) g.add(box(21, 0.12, 0.08, 0xe08a2e, 0, 1.2, z));
  for (const x of [-10.5, 10.5]) g.add(box(0.08, 0.12, 15.2, 0xe08a2e, x, 1.2, 0));
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1 + rand(), 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8a6a48));
    m.position.set(-7 + rand() * 14, 0.3, -5 + rand() * 8);
    m.scale.y = 0.5;
    m.castShadow = true;
    g.add(m);
  }
  g.add(cyl(0.12, 3, 0x6b4f33, -1.6, 1.8, 5.5, 6));
  g.add(cyl(0.12, 3, 0x6b4f33, 1.6, 1.8, 5.5, 6));
  const board = textSprite((ctx, w, h) => {
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#6b4f33'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = '#4a3622'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 46px Archivo, Arial, sans-serif'; ctx.fillText('LAND RESERVED', w / 2, h * 0.38);
    ctx.font = '500 32px Arial, sans-serif'; ctx.fillText('Build not started', w / 2, h * 0.7);
  }, 400, 160, 1.5);
  board.material.depthTest = true;
  board.position.set(0, 3.4, 5.5);
  g.add(board);
}

function buildPart(progress, w, d, sys, color, rand, isLast) {
  const g = new THREE.Group();
  const H = sys.legacy ? 6.5 : 8;
  const ww = w - 0.6, dd = d - 0.6;

  if (progress === 0) {
    g.add(box(w, 0.06, d, 0x8a6a48, 0, 0.03, 0));
    return g;
  }

  // Foundation slab
  g.add(box(w, 0.5, d, 0x9c9c95, 0, 0.25, 0));

  if (progress <= 15) {
    // Discovery: rebar stubs, survey stakes and a cone or two
    for (let x = -ww / 2 + 0.5; x <= ww / 2 - 0.4; x += 1.4) {
      for (let z = -dd / 2 + 0.5; z <= dd / 2 - 0.4; z += 2.2) g.add(cyl(0.06, 0.9, 0x8b4a2b, x, 0.95, z, 5));
    }
    for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
      g.add(cyl(0.06, 1.4, 0xd9c7a0, x, 0.7, z, 5));
      g.add(box(0.5, 0.3, 0.02, 0xff6a2b, x + 0.25, 1.25, z));
    }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 10), mat(0xff7a2b));
    cone.position.set(ww / 2 - 0.5 + rand() * 0.2, 0.9, d / 2 + 0.4);
    g.add(cone);
    return g;
  }

  // Built walls, proportional to progress
  const bh = Math.max(1.2, (H * progress) / 100);
  const wall = box(ww, bh, dd, color, 0, 0.5 + bh / 2, 0);
  g.add(wall);
  const front = dd / 2 + 0.03;

  // Windows (legacy: some boarded up)
  for (let y = 0.5 + 3; y < 0.5 + bh - 0.6; y += 2.3) {
    for (let x = -ww / 2 + 1; x <= ww / 2 - 1; x += 1.8) {
      const boarded = sys.legacy && rand() < 0.3;
      g.add(box(1, 1.1, 0.06, boarded ? 0x6b4f33 : 0x2c4a63, x, y, front, boarded ? undefined : { roughness: 0.2, metalness: 0.3 }));
    }
  }

  // Shopfront: door, glass and awning
  if (bh >= 2.6) {
    g.add(box(1.3, 2.2, 0.08, sys.legacy ? 0x5a3b26 : 0x34404a, 0, 1.6, front));
    if (ww > 3.5) g.add(box(ww - 2.6, 1.5, 0.06, 0x9fd3ea, 0, 1.6, front, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }));
    const awning = box(ww - 0.4, 0.15, 1.4, sys.legacy ? 0x8a7a63 : 0xe2574c, 0, 2.95, front + 0.6);
    awning.rotation.x = 0.25;
    g.add(awning);
  }

  if (sys.legacy) {
    // Weathering: stains and cracks on the façade
    for (let i = 0; i < 4; i++) g.add(box(0.6 + rand(), 0.5 + rand(), 0.05, 0x6e4a35, -ww / 2 + 0.6 + rand() * (ww - 1.2), 0.9 + rand() * (bh - 1.2), front + 0.01));
    const crack = box(0.08, Math.min(2.2, bh * 0.4), 0.05, 0x2b1d14, ww / 2 - 0.9, 0.5 + bh * 0.55, front + 0.02);
    crack.rotation.z = 0.5;
    g.add(crack);
  }

  if (progress >= 100) {
    if (sys.legacy) {
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, ww * 0.62, 2.4, 4, 1), mat(0x5e3a2a));
      roof.rotation.y = Math.PI / 4;
      roof.scale.z = dd / ww;
      roof.position.y = 0.5 + bh + 1.2;
      roof.castShadow = true;
      g.add(roof);
      const tv = box(0.08, 1.6, 0.08, 0x777777, ww / 4, 0.5 + bh + 2, 0);
      tv.rotation.z = 0.25;
      g.add(tv);
    } else {
      g.add(box(ww + 0.2, 0.4, dd + 0.2, 0xf4f4f0, 0, 0.5 + bh + 0.2, 0));
      g.add(box(1.6, 0.9, 1.2, 0xb7bec3, -ww / 4, 0.5 + bh + 0.8, -1));
    }
  } else {
    // Scaffolding up to the planned height, plus a crane on bigger builds
    const top = 0.5 + H;
    const base = 0.5 + bh;
    const scaff = 0xc9922c;
    const xs = [-ww / 2 - 0.3, 0, ww / 2 + 0.3];
    for (const x of xs) for (const z of [-dd / 2 - 0.3, dd / 2 + 0.3]) g.add(box(0.12, top - 0.3, 0.12, scaff, x, (top + 0.3) / 2, z));
    for (let y = base; y <= top + 0.01; y += 1.4) {
      for (const z of [-dd / 2 - 0.3, dd / 2 + 0.3]) g.add(box(ww + 0.7, 0.1, 0.1, scaff, 0, y, z));
      for (const x of [-ww / 2 - 0.3, ww / 2 + 0.3]) g.add(box(0.1, 0.1, dd + 0.7, scaff, x, y, 0));
    }
    const ghost = box(ww, top - base, dd, color, 0, (top + base) / 2, 0, { transparent: true, opacity: 0.12 });
    ghost.castShadow = false;
    g.add(ghost);

    if (progress >= 30 && w >= 5) {
      const crane = new THREE.Group();
      const mastH = H + 5;
      crane.add(box(0.5, mastH, 0.5, 0xf2b705, 0, mastH / 2, 0));
      const jib = new THREE.Group();
      jib.add(box(9, 0.4, 0.4, 0xf2b705, 2.5, 0, 0));
      jib.add(box(1.2, 0.8, 0.8, 0x555555, -2.2, -0.2, 0));
      jib.add(cyl(0.03, 3, 0x333333, 5.5, -1.5, 0, 4));
      jib.add(box(0.6, 0.4, 0.6, 0x8a8a8a, 5.5, -3.1, 0));
      jib.position.y = mastH;
      crane.add(jib);
      crane.position.set(ww / 2 - 0.4, 0, -dd / 2 + 0.4);
      g.add(crane);
      const speed = 0.15 + rand() * 0.1;
      const phase = rand() * 6;
      animated.push({ update: (dt, t) => { if (!reduceMotion) jib.rotation.y = Math.sin(t * speed + phase) * 1.2; } });
    }
  }

  if (sys.leakingPipe && isLast) addLeakingPipe(g, ww, dd, bh);
  return g;
}

function addLeakingPipe(g, ww, dd, bh) {
  const px = ww / 2 + 0.25, pz = dd / 2 - 1.2;
  const pipeH = bh + 0.3;
  g.add(cyl(0.18, pipeH, 0x7c8a8f, px, 0.5 + pipeH / 2, pz, 10));
  const elbow = cyl(0.18, 0.9, 0x7c8a8f, px - 0.35, 0.5 + pipeH, pz, 10);
  elbow.rotation.z = Math.PI / 2;
  g.add(elbow);
  const leakY = 0.5 + bh * 0.5;
  const joint = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 6, 12), mat(0xa0522d));
  joint.rotation.x = Math.PI / 2;
  joint.position.set(px, leakY, pz);
  g.add(joint);

  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshStandardMaterial({ color: 0x4aa3d8, transparent: true, opacity: 0.7, roughness: 0.1 }));
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(px + 1.1, 0.02, pz);
  g.add(puddle);

  const dropMat = new THREE.MeshStandardMaterial({ color: 0x3d9ad1, roughness: 0.1, emissive: 0x1a5a85, emissiveIntensity: 0.3 });
  const drops = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), dropMat);
    g.add(m);
    drops.push({ m, t: i * 0.09, vx: 0.8 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.6 });
  }
  animated.push({
    update: (dt, t) => {
      puddle.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
      for (const d of drops) {
        d.t += reduceMotion ? 0 : dt;
        let y = leakY - 4.9 * d.t * d.t;
        if (y < 0.05) { d.t = 0; y = leakY; }
        d.m.position.set(px + 0.2 + d.vx * d.t, y, pz + d.vz * d.t);
      }
    },
  });
}

function storeLabel(sys, broken) {
  const p = store.progressOf(sys);
  const tags = [store.stageOf(p)];
  if (sys.legacy) tags.push('Legacy');
  if (sys.leakingPipe) tags.push('Leaking');
  return textSprite((ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    roundRect(ctx, 6, 6, w - 12, h - 12, 26);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = broken ? '#c13d2b' : '#1d5c6f';
    ctx.stroke();
    ctx.fillStyle = '#142329';
    ctx.textBaseline = 'middle';
    ctx.font = '800 64px Archivo, Arial, sans-serif';
    ctx.fillText(sys.name, 34, h * 0.36);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1d5c6f';
    ctx.fillText(`${p}%`, w - 34, h * 0.36);
    ctx.textAlign = 'left';
    ctx.font = '500 32px "IBM Plex Sans", Arial, sans-serif';
    ctx.fillStyle = '#4b5d64';
    ctx.fillText(tags.join(' · '), 34, h * 0.74);
    if (broken) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c13d2b';
      ctx.fillText(`${broken} broken`, w - 34, h * 0.74);
    }
  }, 560, 180, 3.4);
}

// Overhead arc between two stores. Broken links are drawn with a gap in the middle.
function arc(a, b, link) {
  const g = new THREE.Group();
  const p0 = new THREE.Vector3(a.x, 11, a.side * LOT_Z * 0.8);
  const p2 = new THREE.Vector3(b.x, 11, b.side * LOT_Z * 0.8);
  const p1 = new THREE.Vector3((a.x + b.x) / 2, 24, (p0.z + p2.z) / 2);
  const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  const color = { ok: 0x2f9e62, risk: 0xe2a01b, broken: 0xd9442f }[link.status];
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 });
  const segment = (t0, t1) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(curve.getPoint(t0 + ((t1 - t0) * i) / 24));
    return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.16, 6), material);
  };
  if (link.status === 'broken') {
    g.add(segment(0, 0.42));
    g.add(segment(0.58, 1));
  } else {
    g.add(segment(0, 1));
    // Arrowhead near the receiving end
    const tip = curve.getPoint(0.9);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 10), material);
    cone.position.copy(tip);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangent(0.9).normalize());
    g.add(cone);
  }
  return g;
}

// Route: out of the source's walkway, along the road, into the target's walkway.
function makeRoute(a, b, k) {
  const dir = b.x === a.x ? (a.side < b.side ? 1 : -1) : Math.sign(b.x - a.x);
  const laneZ = (dir > 0 ? 2.4 : -2.4) + ((k % 2) - 0.5) * 0.9;
  const off = ((k % 3) - 1) * 0.6;
  const pts = [
    new THREE.Vector3(a.x + off, 0, a.doorZ),
    new THREE.Vector3(a.x + off, 0, laneZ),
    new THREE.Vector3(b.x + off, 0, laneZ),
    new THREE.Vector3(b.x + off, 0, b.doorZ),
  ].filter((p, i, arr) => i === 0 || p.distanceTo(arr[i - 1]) > 0.01);
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = lens[lens.length - 1];
  return {
    total,
    at(dist) {
      dist = Math.max(0, Math.min(total, dist));
      let i = 1;
      while (i < pts.length - 1 && lens[i] < dist) i++;
      const seg = lens[i] - lens[i - 1] || 1;
      const f = (dist - lens[i - 1]) / seg;
      const pos = pts[i - 1].clone().lerp(pts[i], f);
      const d = pts[i].clone().sub(pts[i - 1]).normalize();
      return { pos, heading: Math.atan2(-d.z, d.x) };
    },
  };
}

function truck(color, cargo) {
  const g = new THREE.Group();
  g.add(box(3, 0.4, 1.3, 0x2b2f33, 0, 0.55, 0));
  g.add(box(0.9, 1.1, 1.25, color, 1.05, 1.2, 0));
  g.add(box(0.05, 0.5, 1.0, 0x9fd3ea, 1.52, 1.45, 0));
  g.add(box(1.9, 1.4, 1.3, cargo, -0.45, 1.45, 0));
  g.add(box(1.92, 0.3, 1.32, color, -0.45, 1.2, 0));
  for (const x of [-1, 1]) for (const z of [-0.65, 0.65]) {
    const wheel = cyl(0.32, 0.25, 0x1a1a1a, x, 0.32, z, 12);
    wheel.rotation.x = Math.PI / 2;
    g.add(wheel);
  }
  return g;
}

function addTrucks(route, link) {
  const risk = link.status === 'risk';
  const speed = risk ? 4 : 7;
  const count = route.total > 30 ? 2 : 1;
  const cycle = route.total / speed + 1.5;
  for (let n = 0; n < count; n++) {
    const t = truck(risk ? 0xe2a01b : 0x2f9e62, 0xf7f7f2);
    t.userData.pick = { type: 'link', link };
    pickables.push(t);
    city.add(t);
    const offset = (n / count) * cycle;
    animated.push({
      update: (dt, time) => {
        const local = reduceMotion ? cycle * 0.4 + offset : (time + offset) % cycle;
        const { pos, heading } = route.at(local * speed);
        t.position.copy(pos);
        t.rotation.y = heading;
        // Data lost at an unbuilt target: the truck fades as it arrives
        const fade = link.lost && local * speed > route.total * 0.85;
        t.visible = !fade || Math.floor(time * 4) % 2 === 0;
      },
    });
  }
}

function courier() {
  const g = new THREE.Group();
  const legs = [cyl(0.13, 0.9, 0x2b3a4a, 0, 0.45, -0.17, 6), cyl(0.13, 0.9, 0x2b3a4a, 0, 0.45, 0.17, 6)];
  legs.forEach((l) => g.add(l));
  g.add(cyl(0.38, 1.1, 0xff7a2b, 0, 1.45, 0, 10));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), mat(0xe8b896));
  head.position.y = 2.3;
  head.castShadow = true;
  g.add(head);
  g.add(box(0.5, 0.18, 0.7, 0xff7a2b, 0.05, 2.55, 0));
  g.add(box(0.6, 0.5, 0.6, 0xb98b5a, 0.45, 1.5, 0));
  return { g, legs };
}

function questionMark() {
  return textSprite((ctx, w, h) => {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#d9442f';
    ctx.stroke();
    ctx.fillStyle = '#d9442f';
    ctx.font = '900 190px Archivo, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w / 2, h / 2 + 10);
  }, 256, 256, 4.2);
}

// A courier walks most of the route, then stands stuck with a "?" before retrying.
function addStuckCourier(route, link) {
  const { g, legs } = courier();
  const q = questionMark();
  q.renderOrder = 20;
  g.add(q);
  g.userData.pick = { type: 'link', link };
  pickables.push(g);
  city.add(g);

  const stopAt = route.total * 0.78;
  const { pos: stuckPos } = route.at(stopAt);
  if (link.lost) {
    // Undelivered parcels scattered on the pavement
    for (let i = 0; i < 4; i++) {
      const p = box(0.5, 0.4, 0.5, 0xb98b5a, stuckPos.x + Math.cos(i * 1.7) * 1.4, 0.2, stuckPos.z + Math.sin(i * 1.7) * 1.1);
      p.rotation.y = i;
      city.add(p);
    }
  }

  const speed = 3;
  const walk = stopAt / speed;
  const wait = 9;
  const cycle = walk + wait;
  animated.push({
    update: (dt, time) => {
      // Start the cycle in the stuck state so the first frame shows the problem
      const local = reduceMotion ? walk + 1 : (time + walk) % cycle;
      const walking = local < walk;
      const { pos, heading } = route.at(walking ? local * speed : stopAt);
      g.position.copy(pos);
      g.rotation.y = heading;
      const swing = walking ? Math.sin(local * 10) * 0.5 : 0;
      legs[0].rotation.z = swing;
      legs[1].rotation.z = -swing;
      g.position.y = walking ? Math.abs(Math.sin(local * 10)) * 0.12 : 0;
      const s = walking ? 0.6 : 1 + Math.sin(time * 4) * 0.08;
      q.scale.set(4.2 * s, 4.2 * s, 1);
      q.position.y = (walking ? 3.8 : 5) + (walking ? 0 : Math.sin(time * 3) * 0.3);
      if (!walking) g.rotation.y = heading + Math.sin(time * 1.5) * 0.6; // looking around, lost
    },
  });
}

// ---------- info panel ----------
function showInfo(hit) {
  const panel = document.getElementById('city-info');
  const links = computeLinks(store.getSystems());
  if (hit.type === 'system') {
    const s = store.getSystem(hit.id);
    if (!s) return;
    const p = store.progressOf(s);
    const mine = links.filter((l) => l.from === s.id || l.to === s.id);
    panel.innerHTML = `<button class="icon-btn close" data-close aria-label="Close">✕</button>
      <h3>${esc(s.name)} · ${p}%</h3>
      <div class="chips"><span class="chip">${store.stageOf(p)}</span>${s.legacy ? '<span class="chip legacy">Legacy</span>' : ''}${s.leakingPipe ? '<span class="chip leak">Data leaks</span>' : ''}</div>
      <p style="margin:0" class="muted">${esc(s.description || 'No description yet.')}</p>
      <div><b>Parts</b><ul>${s.parts.map((pt) => `<li>${esc(pt.name)}: ${pt.progress}%</li>`).join('')}</ul></div>
      <div><b>Data links</b>${mine.length ? `<ul>${mine.map((l) => `<li>${esc(l.srcName)} → ${esc(l.tgtName)}: <span class="chip ${l.status}">${STATUS_LABEL[l.status]}</span></li>`).join('')}</ul>` : '<p class="muted" style="margin:4px 0 0">None declared</p>'}</div>
      <button class="btn primary" data-open="${esc(s.id)}">${store.isSignedInFor(s.id) ? 'Edit in register' : 'Sign in to update'}</button>`;
  } else {
    const l = links.find((x) => x.from === hit.link.from && x.to === hit.link.to) ?? hit.link;
    panel.innerHTML = `<button class="icon-btn close" data-close aria-label="Close">✕</button>
      <h3>${esc(l.srcName)} → ${esc(l.tgtName)}</h3>
      <div class="chips"><span class="chip ${l.status}">${STATUS_LABEL[l.status]}</span></div>
      <p style="margin:0"><b>Data:</b> ${esc(l.data)}</p>
      <p style="margin:0">Push declared by ${esc(l.srcName)}: <b>${l.push === null ? 'No' : 'Yes'}</b><br>Pull declared by ${esc(l.tgtName)}: <b>${l.pull === null ? 'No' : 'Yes'}</b></p>
      ${l.issues.length ? `<ul>${l.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Both sides agree on this link.</p>'}
      <button class="btn" data-open="${esc(l.status === 'broken' && l.pull === null ? l.to : l.from)}">Fix in register</button>`;
  }
  panel.hidden = false;
}
