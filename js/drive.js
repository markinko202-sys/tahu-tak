import * as THREE from 'three';
import { inkify, buildDish, buildTowers } from './models.js';
import { DISHES } from './data.js';

/* =========================================================
   Makan Trip — drive around the city, taste your dishes, race.
   Same toon + ink look as the quiz.
   ========================================================= */
const $ = (s) => document.querySelector(s);
const PREVIEW = new URLSearchParams(location.search).has('preview');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- state (quiz progress is read, trip progress is its own key) ---------- */
const QUIZ_KEY = 'tahu-tak-v1';
const TRIP_KEY = PREVIEW ? 'tahu-tak-trip-preview' : 'tahu-tak-trip';
const read = (k, d) => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return { ...d }; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
let quiz = read(QUIZ_KEY, { coins: 30, seen: [] });
const trip = read(TRIP_KEY, { tasted: [], best: null, coins: 30 });
const unlocked = PREVIEW ? DISHES.map((d) => d.id) : quiz.seen;
const allUnlocked = unlocked.length === DISHES.length;
const coins = () => (PREVIEW ? trip.coins : quiz.coins);
function addCoins(n) {
  if (PREVIEW) { trip.coins += n; write(TRIP_KEY, trip); }
  else { quiz = read(QUIZ_KEY, quiz); quiz.coins += n; write(QUIZ_KEY, quiz); }
  renderHud('coins');
}

/* ---------- renderer ---------- */
const canvas = $('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// toon ramp shared by everything built here
const ramp = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
const toon = (color, opts = {}) => new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...opts });
const INK = new THREE.MeshBasicMaterial({ color: 0x16130e, side: THREE.BackSide });

/* ---------- dish snapshots for the UI ---------- */
const snaps = {};
{
  const studio = new THREE.Scene();
  studio.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 6, 5);
  studio.add(key);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  cam.position.set(0, 2.2, 3.8);
  cam.lookAt(0, 0, 0);
  renderer.setSize(256, 256, false);
  for (const d of DISHES) {
    const m = buildDish(d.id);
    m.rotation.y = -0.6;
    studio.add(m);
    renderer.render(studio, cam);
    snaps[d.id] = canvas.toDataURL('image/png');
    studio.remove(m);
  }
}

/* ---------- scene ---------- */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf3dcc0, 70, 150);
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 300);
scene.add(new THREE.HemisphereLight(0xfff1dc, 0x7a6a55, 1.35));
const sun = new THREE.DirectionalLight(0xffd2a0, 2.1); // low evening sun
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 });
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.06; // stops the striped self-shadowing on flat walls
scene.add(sun, sun.target);

/* ---------- city grid ----------
   5×5 blocks, 13 units square, 7-unit roads between them and a ring road outside.
   Road centrelines sit at ±10, ±30 and ±50. The centre block is the KLCC park. */
const P = 20, B = 13, N = 5, ROAD = 7;
const HALF = ((N - 1) / 2) * P;           // 40
const EDGE = HALF + B / 2 + ROAD;         // 53.5, outer edge of the ring road
const LINES = [-50, -30, -10, 10, 30, 50];
const bc = (i) => (i - 2) * P;            // block centre
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ground: grass beyond the city, asphalt inside
const grass = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), toon(0x9cc37a));
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.02;
grass.receiveShadow = true;
scene.add(grass);
const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(EDGE * 2, EDGE * 2), toon(0x55505e));
asphalt.rotation.x = -Math.PI / 2;
asphalt.receiveShadow = true;
scene.add(asphalt);

/** Instanced helper: unit geometry + per-instance transform/colour, with an instanced ink shell. */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
function instanced(geo, mat, items, { ink = 0.14, shadow = true } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const line = ink ? new THREE.InstancedMesh(geo, INK, items.length) : null;
  items.forEach((it, i) => {
    _q.setFromAxisAngle(UP, it.ry || 0);
    _p.set(it.x, it.y, it.z);
    _s.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);
    if (line) { _s.addScalar(ink); _m.compose(_p, _q, _s); line.setMatrixAt(i, _m); }
    if (it.color != null) mesh.setColorAt(i, _c.set(it.color));
  });
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (line) scene.add(line);
  return mesh;
}

/* facade textures drawn once on canvas: shophouse (five-foot-way arches + shuttered windows) and condo grid */
function facade(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.scale(2, 2); // drawn in 128 units, stored at 256 for crisper mips
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 128, 128);
  if (kind === 'shop') {
    g.fillStyle = '#6d6a66';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(8 + i * 40, 128); g.lineTo(8 + i * 40, 92); g.arc(24 + i * 40, 92, 16, Math.PI, 0); g.lineTo(40 + i * 40, 128); g.fill(); }
    g.fillStyle = '#9a958f';
    g.fillRect(0, 70, 128, 6); // five-foot-way ledge
    for (let i = 0; i < 2; i++) {
      g.fillStyle = '#5d5a57'; g.fillRect(22 + i * 52, 22, 32, 38);
      g.fillStyle = '#8f8a84'; g.fillRect(14 + i * 52, 22, 8, 38); g.fillRect(54 + i * 52, 22, 8, 38); // shutters
    }
  } else {
    g.fillStyle = '#6a6f78';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) g.fillRect(10 + x * 29, 6 + y * 15, 20, 9);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

const box = new THREE.BoxGeometry(1, 1, 1);
const PASTEL = [0xf2a7a0, 0x9fd3c7, 0xf5d26b, 0xa7c5eb, 0xf3e1c7, 0xc9e4a6, 0xe8b4d8, 0xf7c59f];

/* ---------- cafés: one per dish ---------- */
const CAFES = [
  { dish: 'teh-tarik', name: 'Kopitiam Pak Ali', kind: 'Kopitiam', at: [1, 1, 0], color: 0x0e6b47, note: 'Frothy, milky and not too sweet. The uncle pulls it from arm’s height.' },
  { dish: 'roti-canai', name: 'Mamak Bistro Selvam', kind: 'Mamak', at: [3, 1, 1], color: 0xd8321f, note: 'Crispy outside, soft layers inside. Tear it, dunk it in the dhal.' },
  { dish: 'nasi-lemak', name: 'Warung Kak Yah', kind: 'Warung', at: [1, 3, 3], color: 0x2f8f46, note: 'Coconut rice, fiery sambal and crunchy ikan bilis. Breakfast of champions.' },
  { dish: 'kuih-lapis', name: 'Kuih Nyonya Rose', kind: 'Kuih stall', at: [3, 3, 2], color: 0xe86a92, note: 'Peel it layer by layer. Soft, springy and lightly sweet.' },
  { dish: 'satay', name: 'Satay Haji Osman', kind: 'Satay stall', at: [0, 2, 0], color: 0xa2501d, note: 'Smoky from the charcoal, sweet from the marinade. Dip, bite, repeat.' },
  { dish: 'cendol', name: 'Cendol Tepi Jalan', kind: 'Dessert cart', at: [4, 2, 1], color: 0x2b59c3, note: 'Ice-cold and silky. The gula Melaka does all the talking.' },
  { dish: 'char-kway-teow', name: 'Wok Hei Uncle Lim', kind: 'Hawker stall', at: [2, 0, 2], color: 0x7a4a22, note: 'Smoky flat noodles, plump prawns and plenty of wok hei.' },
  { dish: 'asam-laksa', name: 'Laksa Pulau Pinang', kind: 'Hawker stall', at: [2, 4, 3], color: 0xc0562b, note: 'Sour, spicy and fishy in the best way. Add a spoon of prawn paste.' },
  { dish: 'ikan-bakar', name: 'Ikan Bakar Tepi Laut', kind: 'Seafood', at: [0, 4, 2], color: 0x1f6f8b, note: 'Charred on banana leaf, with lime and sambal on the side.' },
  { dish: 'durian', name: 'Durian Ah Keong', kind: 'Fruit stall', at: [4, 0, 3], color: 0x8a9a2a, note: 'Creamy, bittersweet and unforgettable. Your car will smell of it for a week.' },
];
// side: 0 = +x, 1 = −x, 2 = +z, 3 = −z → outward normal and facing angle
const SIDES = [
  { n: [1, 0], ry: Math.PI / 2 }, { n: [-1, 0], ry: -Math.PI / 2 },
  { n: [0, 1], ry: 0 }, { n: [0, -1], ry: Math.PI },
];
const cafeAt = new Map(CAFES.map((c) => [c.at.join(), c]));

/* ---------- blocks, buildings, trees, lamps ---------- */
const walks = [], houses = [], roofs = [], condos = [], trunks = [], canopies = [], poles = [], bulbs = [];
const colliders = [];
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const cx = bc(i), cz = bc(j);
  colliders.push({ x0: cx - B / 2, x1: cx + B / 2, z0: cz - B / 2, z1: cz + B / 2 });
  const centre = i === 2 && j === 2;
  walks.push({ x: cx, y: 0.15, z: cz, sx: B, sy: 0.3, sz: B, color: centre ? 0x5a9a5a : 0xe8dcc3 });
  if (centre) continue;

  for (let s = 0; s < 4; s++) {
    const { n, ry } = SIDES[s];
    const t = [-n[1], n[0]]; // along the facade
    const hasCafe = cafeAt.has(`${i},${j},${s}`);
    // x-facing sides own the corners and get three houses; z-facing sides only a middle one,
    // so no two buildings ever overlap (overlaps flicker and let ink shells poke through walls)
    const ks = s < 2 ? [-1, 0, 1] : [0];
    for (const k of ks) {
      if (k === 0 && hasCafe) continue; // gap for the café
      const w = hasCafe ? 2.9 : 3.4, d = 3.4, h = 5 + rand() * 2.4;
      const out = B / 2 - 1.3 - d / 2;
      const along = k * (hasCafe ? 4.6 : 3.6); // neighbours step aside to open a little plaza
      const x = cx + n[0] * out + t[0] * along, z = cz + n[1] * out + t[1] * along;
      const color = PASTEL[Math.floor(rand() * PASTEL.length)];
      houses.push({ x, y: 0.3 + h / 2, z, sx: w, sy: h, sz: d, ry, color });
      roofs.push({ x, y: 0.3 + h + 0.25, z, sx: w + 0.1, sy: 0.5, sz: d + 0.2, ry, color: rand() < 0.5 ? 0xb5562f : 0x7c5a44 });
    }
    // a street lamp in the middle of each side, at the kerb
    const lx = cx + n[0] * (B / 2 - 0.5) + t[0] * 1.8, lz = cz + n[1] * (B / 2 - 0.5) + t[1] * 1.8;
    poles.push({ x: lx, y: 0.3 + 2, z: lz, sx: 0.14, sy: 4, sz: 0.14, color: 0x2a2a2a });
    bulbs.push({ x: lx, y: 4.5, z: lz, sx: 0.35, sy: 0.35, sz: 0.35 });
  }
  if (rand() < 0.3) {
    const h = 14 + rand() * 12;
    condos.push({ x: cx, y: 0.3 + h / 2, z: cz, sx: 5, sy: h, sz: 5, color: [0xf3e1c7, 0xdfe6ee, 0xf2d4c2][Math.floor(rand() * 3)] });
  }
  for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = cx + ox * 5.6, z = cz + oz * 5.6, r = 1 + rand() * 0.5;
    trunks.push({ x, y: 1.3, z, sx: 0.3, sy: 2.2, sz: 0.3, color: 0x6b4a2b });
    canopies.push({ x, y: 2.9 + r * 0.5, z, sx: r, sy: r, sz: r, color: rand() < 0.5 ? 0x4cc552 : 0x2f8f46 });
  }
}
// hedge around the ring road
const hedges = [];
for (const s of [-1, 1]) {
  hedges.push({ x: 0, y: 0.6, z: s * (EDGE + 0.8), sx: EDGE * 2 + 3, sy: 1.2, sz: 1.2, color: 0x2f8f46 });
  hedges.push({ x: s * (EDGE + 0.8), y: 0.6, z: 0, sx: 1.2, sy: 1.2, sz: EDGE * 2 + 3, color: 0x2f8f46 });
}
// dashed lane markings, skipped inside junctions
const dashes = [];
for (const c of LINES) {
  for (let v = -EDGE + 1; v < EDGE - 1; v += 4) {
    if (LINES.some((o) => Math.abs(v - o) < ROAD / 2 + 0.5)) continue;
    dashes.push({ x: c, y: 0.03, z: v, sx: 0.25, sy: 0.02, sz: 1.8 });
    dashes.push({ x: v, y: 0.03, z: c, sx: 1.8, sy: 0.02, sz: 0.25 });
  }
}

instanced(box, toon(0xffffff), walks, { ink: 0.1 });
instanced(box, toon(0xffffff, { map: facade('shop') }), houses);
instanced(box, toon(0xffffff), roofs);
instanced(box, toon(0xffffff, { map: facade('condo') }), condos);
instanced(new THREE.CylinderGeometry(0.5, 0.5, 1, 8), toon(0xffffff), trunks, { ink: 0.1 });
instanced(new THREE.IcosahedronGeometry(1, 1), toon(0xffffff, { flatShading: true }), canopies, { ink: 0.18 });
instanced(new THREE.CylinderGeometry(0.5, 0.5, 1, 6), toon(0xffffff), poles, { ink: 0.08 });
instanced(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a }), bulbs, { ink: 0.1, shadow: false });
instanced(box, toon(0xffffff), hedges, { ink: 0.12 });
instanced(box, new THREE.MeshBasicMaterial({ color: 0xf6efe0 }), dashes, { ink: 0, shadow: false });

// KLCC in the middle
const towers = buildTowers();
towers.scale.multiplyScalar(8);
towers.position.set(0, 0, 0);
towers.position.y = 0.3 - new THREE.Box3().setFromObject(towers).min.y; // stand on the park
towers.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
scene.add(towers);

/* ---------- café stalls ---------- */
await document.fonts.load('60px "Special Gothic Condensed One"').catch(() => {});
function signTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 512, 128);
  g.lineWidth = 10; g.strokeStyle = '#16130e'; g.strokeRect(5, 5, 502, 118);
  g.fillStyle = '#' + color.toString(16).padStart(6, '0');
  g.font = '64px "Special Gothic Condensed One", Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text.toUpperCase(), 256, 68, 470);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const ringGeo = new THREE.TorusGeometry(2.4, 0.2, 8, 40);
for (const cafe of CAFES) {
  const [i, j, s] = cafe.at;
  const { n, ry } = SIDES[s];
  const cx = bc(i), cz = bc(j);
  const open = unlocked.includes(cafe.dish);
  const g = new THREE.Group();
  g.position.set(cx + n[0] * (B / 2 - 2.0), 0.3, cz + n[1] * (B / 2 - 2.0));
  g.rotation.y = ry;

  const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  part(new THREE.BoxGeometry(3.6, 3.4, 0.4), toon(cafe.color), 0, 1.7, -1.2);          // back wall
  part(new THREE.BoxGeometry(3.2, 1.1, 1.2), toon(0xa0673a), 0, 0.55, 0.6);              // counter
  for (const sx of [-1.6, 1.6]) part(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), toon(0x2a2a2a), sx, 1.6, 1.2);
  for (let k = 0; k < 6; k++) {                                                          // striped awning
    const stripe = part(new THREE.BoxGeometry(0.6, 0.08, 2.4), toon(k % 2 ? 0xfffaf0 : cafe.color), -1.5 + k * 0.6, 3.25, 0.1);
    stripe.rotation.x = 0.28;
  }
  const board = part(new THREE.BoxGeometry(3.8, 0.9, 0.2), toon(0xfffaf0), 0, 4.1, -1.0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.86), new THREE.MeshBasicMaterial({ map: signTexture(cafe.name, cafe.color) }));
  sign.position.set(0, 4.1, -0.89);
  g.add(sign);
  if (!open) part(new THREE.BoxGeometry(3.3, 2.6, 0.12), toon(0x9aa0a6), 0, 1.6, 1.25);   // shutter down
  inkify(g);

  if (open) {
    const dish = buildDish(cafe.dish, 2.6);
    dish.position.set(0, 8, 0);
    g.add(dish);
    cafe.dishObj = dish;
  }
  scene.add(g);

  // trigger ring on the road centreline in front of the stall
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xf5b700 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(cx + n[0] * (B / 2 + ROAD / 2), 0.25, cz + n[1] * (B / 2 + ROAD / 2));
  ring.visible = open;
  scene.add(ring);
  Object.assign(cafe, { ring, open, stall: g, x: ring.position.x, z: ring.position.z });
}
const paintRings = () => CAFES.forEach((c) => c.ring.material.color.set(trip.tasted.includes(c.dish) ? 0x3ddc84 : 0xf5b700));
paintRings();

/* ---------- the car: a little yellow kancil with a tingkat on the roof ---------- */
function buildCar() {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const body = new THREE.Group();
  g.add(body);
  add(new THREE.BoxGeometry(2, 0.75, 3.6), toon(0xf5b700), 0, 0.8, 0, body);
  add(new THREE.BoxGeometry(1.8, 0.75, 2), toon(0xfbf6ea), 0, 1.5, -0.25, body);
  const glass = toon(0x2b59c3);
  const wind = add(new THREE.BoxGeometry(1.62, 0.55, 0.06), glass, 0, 1.52, 0.78, body); wind.rotation.x = -0.35;
  add(new THREE.BoxGeometry(1.62, 0.5, 0.06), glass, 0, 1.52, -1.27, body);
  for (const sx of [-0.91, 0.91]) add(new THREE.BoxGeometry(0.06, 0.45, 1.5), glass, sx, 1.52, -0.25, body);
  add(new THREE.BoxGeometry(2.04, 0.14, 3.64), toon(0xd8321f), 0, 0.72, 0, body).userData.noInk = true;
  for (const sx of [-0.65, 0.65]) {
    add(new THREE.BoxGeometry(0.4, 0.2, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff4c2 }), sx, 0.9, 1.81, body);
    add(new THREE.BoxGeometry(0.4, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xff3b2f }), sx, 0.9, -1.81, body);
  }
  // roof rack with a tingkat
  [0x0e6b47, 0xd8321f, 0xf5b700].forEach((c, k) => add(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 16), toon(c), 0, 2.03 + k * 0.28, -0.3, body));
  // wheels (front ones on steering pivots)
  const wheels = [], front = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 1.0, 0.42, sz * 1.15);
    const w = add(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 16), toon(0x222222), 0, 0, 0, pivot);
    w.rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 12), toon(0xe4e8ee), 0, 0, 0, pivot).rotation.z = Math.PI / 2;
    g.add(pivot);
    wheels.push(pivot);
    if (sz > 0) front.push(pivot);
  }
  inkify(g);
  Object.assign(g.userData, { body, wheels, front });
  return g;
}
const car = buildCar();
scene.add(car);

// arrow floating over the car that points to the next race gate
const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 4), toon(0xd8321f));
arrow.geometry.rotateX(Math.PI / 2);
inkify(arrow);
arrow.visible = false;
scene.add(arrow);

/* ---------- driving model (arcade) ---------- */
const drive = { x: -10, z: -38, heading: 0, speed: 0, steer: 0, shake: 0 };
const keys = { up: false, down: false, left: false, right: false };
const RADIUS = 1.3;
const hits = (x, z) =>
  Math.abs(x) > EDGE - RADIUS || Math.abs(z) > EDGE - RADIUS ||
  colliders.some((c) => x > c.x0 - RADIUS && x < c.x1 + RADIUS && z > c.z0 - RADIUS && z < c.z1 + RADIUS);

function step(dt) {
  const input = !modalOpen() && !race.countingDown;
  const throttle = input ? (keys.up ? 1 : 0) - (keys.down ? 1 : 0) : 0;
  const steerIn = input ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0;
  const max = 24, maxRev = -8;

  if (throttle > 0) drive.speed += (drive.speed < 0 ? 40 : 16) * dt;
  else if (throttle < 0) drive.speed -= (drive.speed > 0 ? 34 : 10) * dt;
  drive.speed *= 1 - (throttle ? 0.35 : 1.4) * dt; // rolling drag
  drive.speed = Math.max(maxRev, Math.min(max, drive.speed));
  if (Math.abs(drive.speed) < 0.05 && !throttle) drive.speed = 0;

  drive.steer += (steerIn - drive.steer) * Math.min(1, dt * 8);
  const grip = Math.min(1, Math.abs(drive.speed) / 8) * Math.sign(drive.speed);
  drive.heading += drive.steer * 2.1 * grip * dt;

  const fx = Math.sin(drive.heading), fz = Math.cos(drive.heading);
  const nx = drive.x + fx * drive.speed * dt, nz = drive.z + fz * drive.speed * dt;
  if (!hits(nx, nz)) { drive.x = nx; drive.z = nz; }
  else if (!hits(nx, drive.z)) { drive.x = nx; drive.speed *= 0.9; }
  else if (!hits(drive.x, nz)) { drive.z = nz; drive.speed *= 0.9; }
  else { if (Math.abs(drive.speed) > 6) drive.shake = 0.5; drive.speed *= -0.3; }

  // pose the car
  car.position.set(drive.x, 0, drive.z);
  car.rotation.y = drive.heading;
  const { body, wheels, front } = car.userData;
  body.rotation.z = -drive.steer * drive.speed * 0.006;
  body.rotation.x = -throttle * 0.03;
  wheels.forEach((w) => { w.children[0].rotation.x += drive.speed * dt / 0.42; w.children[1].rotation.x = w.children[0].rotation.x; });
  front.forEach((w) => { w.rotation.y = drive.steer * 0.45; });
}

/* ---------- chase camera ---------- */
const camPos = new THREE.Vector3(drive.x, 8, drive.z - 14);
const camLook = new THREE.Vector3();
function follow(dt) {
  const fx = Math.sin(drive.heading), fz = Math.cos(drive.heading);
  const back = race.running ? 11 : 12, up = race.running ? 7.5 : 9.5;
  // pull the camera in (and up) if a block sits between it and the car
  let free = 1;
  for (let k = 1; k <= 12; k++) {
    const f = k / 12, px = drive.x - fx * back * f, pz = drive.z - fz * back * f;
    if (colliders.some((c) => px > c.x0 - 0.8 && px < c.x1 + 0.8 && pz > c.z0 - 0.8 && pz < c.z1 + 0.8) || Math.abs(px) > EDGE || Math.abs(pz) > EDGE) break;
    free = f;
  }
  const dist = Math.max(3.5, back * free);
  const target = new THREE.Vector3(drive.x - fx * dist, up + (1 - free) * 9, drive.z - fz * dist);
  camPos.lerp(target, 1 - Math.exp(-dt * 5));
  camera.position.copy(camPos);
  if (drive.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * drive.shake;
    camera.position.y += (Math.random() - 0.5) * drive.shake;
    drive.shake = Math.max(0, drive.shake - dt * 2);
  }
  camLook.set(drive.x + fx * 6, 0.8, drive.z + fz * 6);
  camera.lookAt(camLook);
  sun.position.set(drive.x - 30, 45, drive.z + 18);
  sun.target.position.set(drive.x, 0, drive.z);
}

/* ---------- cafés: stopping and tasting ---------- */
let current = null, lastCafe = null;
const modalOpen = () => !$('#intro').hidden || !$('#cafe').hidden || !$('#result').hidden;

function checkCafes() {
  if (race.running || race.countingDown || modalOpen()) return;
  for (const c of CAFES) {
    const d = Math.hypot(drive.x - c.x, drive.z - c.z);
    if (c === lastCafe && d > 5) lastCafe = null;
    if (d < 5.5 && !c.open && c !== lastCafe) { hint(`${c.name} is closed. Win ${DISHES.find((x) => x.id === c.dish).name} in the quiz to open it.`); lastCafe = c; }
    if (d < 3 && c.open && c !== lastCafe && Math.abs(drive.speed) < 16) { openCafe(c); lastCafe = c; }
  }
}

function openCafe(c) {
  current = c;
  drive.speed = 0;
  const d = DISHES.find((x) => x.id === c.dish);
  $('#cafeKind').textContent = c.kind;
  $('#cafeName').textContent = c.name;
  $('#cafeImg').src = snaps[c.dish];
  $('#cafeImg').alt = d.name;
  $('#cafeDish').textContent = d.name;
  $('#cafeNote').textContent = c.note;
  const done = trip.tasted.includes(c.dish);
  $('#cafeDone').hidden = !done;
  $('#tasteBtn').hidden = done;
  $('#cafe').hidden = false;
  (done ? $('#leaveBtn') : $('#tasteBtn')).focus();
}
function taste() {
  if (!current || trip.tasted.includes(current.dish)) return;
  trip.tasted.push(current.dish);
  write(TRIP_KEY, trip);
  addCoins(5);
  steam(current.stall);
  const d = DISHES.find((x) => x.id === current.dish);
  toast(`Sedap! ${d.name} tasted · +5 coins`, current.dish);
  paintRings();
  renderHud();
  closeCafe();
  if (unlocked.every((id) => trip.tasted.includes(id)) && allUnlocked) toast('You tasted everything. Race unlocked! Press R');
}
function closeCafe() { $('#cafe').hidden = true; current = null; canvas.focus(); }

// little puffs of steam from a stall after tasting
const puffs = [];
function steam(stall) {
  const base = stall.position.clone().add(new THREE.Vector3(0, 3, 0));
  for (let k = 0; k < 14; k++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    m.position.copy(base).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2));
    m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 1.5, 2 + Math.random() * 2, (Math.random() - 0.5) * 1.5);
    m.userData.life = 1;
    scene.add(m);
    puffs.push(m);
  }
}

/* ---------- race ---------- */
const START = { x: -10, z: -38, heading: 0 };
const ROUTE = [[-10, 10], [-10, 50], [30, 50], [30, 10], [50, 10], [50, -50], [10, -50], [10, -10], [-30, -10], [-30, -50], [-10, -50], [-10, -30]];
const race = { running: false, countingDown: false, idx: 0, t: 0 };
const gates = ROUTE.map(([x, z], k) => {
  const [px, pz] = k ? ROUTE[k - 1] : [START.x, START.z];
  const ang = Math.atan2(x - px, z - pz); // direction of travel into this gate
  const g = new THREE.Group();
  const red = toon(0xd8321f), gold = toon(0xf5b700);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 6, 10), red); p.position.set(s * 3.9, 3, 0); g.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.5, 0.5), red); beam.position.y = 6; g.add(beam);
  const top = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.3, 0.7), gold); top.position.y = 6.45; g.add(top);
  for (const s of [-2, 0, 2]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff4d3d }));
    l.scale.y = 0.85; l.position.set(s, 5.1, 0); g.add(l);
  }
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.9), new THREE.MeshBasicMaterial({ map: signTexture(k === ROUTE.length - 1 ? 'Finish' : `Gate ${k + 1}`, 0xd8321f), side: THREE.DoubleSide }));
  label.position.set(0, 6, 0.3);
  g.add(label);
  inkify(g);
  g.position.set(x, 0, z);
  g.rotation.y = ang;
  g.visible = false;
  scene.add(g);
  return { x, z, obj: g };
});

function startRace() {
  if (!raceAllowed()) return;
  $('#result').hidden = true;
  closeCafe();
  Object.assign(drive, { x: START.x, z: START.z, heading: START.heading, speed: 0, steer: 0 });
  camPos.set(START.x, 6, START.z - 13);
  race.running = false;
  race.countingDown = true;
  race.idx = 0;
  race.t = 0;
  showGates();
  $('#raceHud').hidden = false;
  $('#raceTime').textContent = fmt(0);
  $('#raceCp').textContent = `Gate 0/${gates.length}`;
  arrow.visible = true;
  const cd = $('#countdown');
  cd.hidden = false;
  const seq = ['3', '2', '1', 'Jalan!'];
  seq.forEach((txt, k) => setTimeout(() => {
    cd.classList.toggle('go', k === 3);
    cd.innerHTML = `<span>${txt}</span>`;
    if (k === 3) { race.countingDown = false; race.running = true; setTimeout(() => { cd.hidden = true; }, 700); }
  }, k * 800));
}
function showGates() { gates.forEach((g, k) => { g.obj.visible = race.running || race.countingDown ? k === race.idx || k === race.idx + 1 : false; g.obj.scale.setScalar(k === race.idx ? 1 : 0.8); }); }
function checkGates() {
  if (!race.running) return;
  const g = gates[race.idx];
  if (Math.hypot(drive.x - g.x, drive.z - g.z) < 5.5) {
    race.idx++;
    $('#raceCp').textContent = `Gate ${race.idx}/${gates.length}`;
    if (race.idx === gates.length) return finishRace();
    showGates();
  }
}
function finishRace() {
  race.running = false;
  arrow.visible = false;
  gates.forEach((g) => { g.obj.visible = false; });
  $('#raceHud').hidden = true;
  const pb = !trip.best || race.t < trip.best;
  if (pb) { trip.best = Math.round(race.t); write(TRIP_KEY, trip); }
  $('#resTime').textContent = fmt(race.t);
  $('#resBest').textContent = pb ? 'New best lap!' : `Best: ${fmt(trip.best)}`;
  $('#resTitle').textContent = pb ? 'Rekod baru!' : 'Finish!';
  $('#result').hidden = false;
  $('#raceAgain').focus();
  if (pb) addCoins(10);
}
function abortRace() {
  race.running = race.countingDown = false;
  arrow.visible = false;
  gates.forEach((g) => { g.obj.visible = false; });
  $('#raceHud').hidden = true;
  $('#countdown').hidden = true;
}
const raceAllowed = () => PREVIEW || (allUnlocked && DISHES.every((d) => trip.tasted.includes(d.id)));
const fmt = (ms) => { const s = ms / 1000, m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

/* ---------- HUD, hints, toasts, minimap ---------- */
function renderHud(what) {
  $('#tastedCount').textContent = `${trip.tasted.filter((id) => unlocked.includes(id)).length}/${unlocked.length}`;
  $('#coinCount').textContent = coins();
  $('#raceBtn').disabled = !raceAllowed();
  $('#raceBtn').title = raceAllowed() ? 'Start a race (R)' : 'Taste every dish to unlock racing';
  if (what === 'coins') { const p = $('#coinCount').parentElement; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
}
let hintTimer;
function hint(text) {
  const h = $('#hint');
  h.textContent = text;
  h.classList.remove('fade');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => h.classList.add('fade'), 4500);
}
function toast(text, dishId) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${dishId ? `<img src="${snaps[dishId]}" alt="">` : ''}<span>${text}</span>`;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 3200);
}

const mm = $('#minimap').getContext('2d');
function minimap() {
  const S = 200, k = S / (EDGE * 2 + 4), X = (x) => (x + EDGE + 2) * k, Z = (z) => (z + EDGE + 2) * k;
  mm.fillStyle = '#9cc37a'; mm.fillRect(0, 0, S, S);
  mm.fillStyle = '#55505e'; mm.fillRect(X(-EDGE), Z(-EDGE), EDGE * 2 * k, EDGE * 2 * k);
  for (const c of colliders) { mm.fillStyle = c.x0 < 0 && c.x1 > 0 && c.z0 < 0 && c.z1 > 0 ? '#5a9a5a' : '#e8dcc3'; mm.fillRect(X(c.x0), Z(c.z0), B * k, B * k); }
  for (const c of CAFES) {
    mm.beginPath(); mm.arc(X(c.x), Z(c.z), 5, 0, Math.PI * 2);
    mm.fillStyle = !c.open ? '#9aa0a6' : trip.tasted.includes(c.dish) ? '#3ddc84' : '#f5b700';
    mm.fill(); mm.lineWidth = 2; mm.strokeStyle = '#16130e'; mm.stroke();
  }
  if (race.running || race.countingDown) {
    const g = gates[race.idx];
    if (g) { mm.beginPath(); mm.arc(X(g.x), Z(g.z), 7, 0, Math.PI * 2); mm.strokeStyle = '#d8321f'; mm.lineWidth = 3; mm.stroke(); }
  }
  mm.save();
  mm.translate(X(drive.x), Z(drive.z));
  mm.rotate(-drive.heading);
  mm.beginPath(); mm.moveTo(0, 8); mm.lineTo(5, -5); mm.lineTo(-5, -5); mm.closePath();
  mm.fillStyle = '#d8321f'; mm.fill(); mm.lineWidth = 2; mm.strokeStyle = '#16130e'; mm.stroke();
  mm.restore();
}

/* ---------- input ---------- */
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; if (!modalOpen()) e.preventDefault(); }
  if (e.code === 'Escape') { if (!$('#cafe').hidden) closeCafe(); else if (race.running || race.countingDown) abortRace(); }
  if (e.code === 'KeyR' && !modalOpen() && !race.countingDown) startRace();
});
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => Object.keys(keys).forEach((k) => { keys[k] = false; }));
document.querySelectorAll('#touch button').forEach((b) => {
  const set = (v) => { keys[b.dataset.key] = v; b.classList.toggle('on', v); };
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); set(true); });
  b.addEventListener('pointerup', () => set(false));
  b.addEventListener('pointercancel', () => set(false));
});
$('#tasteBtn').addEventListener('click', taste);
$('#leaveBtn').addEventListener('click', closeCafe);
$('#raceBtn').addEventListener('click', startRace);
$('#raceAgain').addEventListener('click', startRace);
$('#freeRoam').addEventListener('click', () => { $('#result').hidden = true; canvas.focus(); });
$('#startDrive').addEventListener('click', () => { $('#intro').hidden = true; canvas.focus(); hint('Drive into a glowing ring to stop at a café.'); });
canvas.tabIndex = 0;
if (PREVIEW) { // handy for poking at the preview from devtools
  window.__trip = { drive, camera, frame: () => { step(0.016); follow(1); renderer.render(scene, camera); } };
}

/* ---------- intro gate ---------- */
if (PREVIEW) {
  $('#previewTag').hidden = false;
  $('#backLink').href = 'index.html?preview=1';
} else if (!allUnlocked) {
  const card = $('#intro .card');
  card.querySelector('.eyebrow').textContent = `Locked · ${unlocked.length}/10 dishes`;
  card.querySelector('p:not(.eyebrow)').textContent = 'Makan Trip opens once you have collected all 10 dishes in the quiz. Go win the rest, then come back hungry.';
  const btn = $('#startDrive');
  btn.textContent = 'Back to the quiz';
  btn.replaceWith(Object.assign(btn.cloneNode(true), { onclick: () => { location.href = 'index.html#play'; } }));
}

/* ---------- loop ---------- */
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
resize();
addEventListener('resize', resize);
renderHud();

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  step(dt);
  follow(dt);
  checkCafes();
  checkGates();
  if (race.running) { race.t += dt * 1000; $('#raceTime').textContent = fmt(race.t); }
  if (arrow.visible) {
    const g = gates[race.idx];
    if (g) {
      arrow.position.set(drive.x, 4.2 + Math.sin(t * 4) * 0.15, drive.z);
      arrow.rotation.y = Math.atan2(g.x - drive.x, g.z - drive.z);
    }
  }
  for (const c of CAFES) {
    if (c.dishObj) { c.dishObj.rotation.y += dt * (reducedMotion ? 0 : 0.8); c.dishObj.position.y = 8 + Math.sin(t * 1.5 + c.x) * 0.25; }
    c.ring.scale.setScalar(1 + Math.sin(t * 3 + c.z) * 0.05);
  }
  for (let k = puffs.length - 1; k >= 0; k--) {
    const p = puffs[k];
    p.position.addScaledVector(p.userData.v, dt);
    p.userData.life -= dt * 0.8;
    p.material.opacity = Math.max(0, p.userData.life);
    p.scale.setScalar(1 + (1 - p.userData.life));
    if (p.userData.life <= 0) { scene.remove(p); puffs.splice(k, 1); }
  }
  minimap();
  renderer.render(scene, camera);
}
tick();
