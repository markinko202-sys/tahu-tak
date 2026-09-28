import * as THREE from 'three';
import { inkify, buildDish, buildTowers, buildHibiscus } from './models.js';
import { DISHES } from './data.js';

/* =========================================================
   Makan Trip — drive around the city, taste your dishes, race.
   Same toon + ink look as the quiz.
   ========================================================= */
const $ = (s) => document.querySelector(s);
const PREVIEW = new URLSearchParams(location.search).has('preview');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// phones and tablets get a lighter profile; resolution then adapts to the real frame rate
const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;

/* ---------- state (quiz progress is read, trip progress is its own key) ---------- */
const QUIZ_KEY = 'tahu-tak-v1';
const TRIP_KEY = PREVIEW ? 'tahu-tak-trip-preview' : 'tahu-tak-trip';
const read = (k, d) => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) || '{}') }; } catch { return { ...d }; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
let quiz = read(QUIZ_KEY, { coins: 30, seen: [] });
const trip = read(TRIP_KEY, { tasted: [], best: null, coins: 30, wins: 0, losses: 0, car: null });
trip.car = { body: 0xf5b700, wheels: 0x222222, roof: 'tingkat', ...(trip.car || {}) };
const unlocked = PREVIEW ? DISHES.map((d) => d.id) : quiz.seen;
const allUnlocked = unlocked.length === DISHES.length;
const coins = () => (PREVIEW ? trip.coins : quiz.coins);
const save = () => write(TRIP_KEY, trip);
function addCoins(n) {
  if (PREVIEW) { trip.coins += n; save(); }
  else { quiz = read(QUIZ_KEY, quiz); quiz.coins += n; write(QUIZ_KEY, quiz); }
  renderHud('coins');
}

/* ---------- renderer ---------- */
const canvas = $('#world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const DPR_MAX = Math.min(window.devicePixelRatio, MOBILE ? 1.5 : 1.75);
let dpr = MOBILE ? Math.min(DPR_MAX, 1.25) : DPR_MAX;
renderer.setPixelRatio(dpr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const ANISO = renderer.capabilities.getMaxAnisotropy();

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

/* ---------- city grid ----------
   7×7 blocks (16 units square) with 10-unit roads and a ring road outside.
   The centre block is the KLCC park. */
const N = 7, B = 16, ROAD = 10, P = B + ROAD;
const MID = (N - 1) / 2;
const HALF = MID * P;                      // 78
const EDGE = HALF + B / 2 + ROAD;          // 96, outer edge of the ring road
const bc = (i) => (i - MID) * P;           // block centre
const LINES = [];                          // road centrelines: ±13, ±39, ±65, ±91
for (let k = 0; k < N - 1; k++) LINES.push(bc(k) + P / 2);
LINES.push(-(HALF + B / 2 + ROAD / 2), HALF + B / 2 + ROAD / 2);
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* ---------- scene ---------- */
const scene = new THREE.Scene();
scene.fog = MOBILE ? new THREE.Fog(0xf3dcc0, 60, 150) : new THREE.Fog(0xf3dcc0, 90, 230);
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, MOBILE ? 170 : 400);
scene.add(new THREE.HemisphereLight(0xfff1dc, 0x7a6a55, 1.35));
const sun = new THREE.DirectionalLight(0xffd2a0, 2.1); // low evening sun
sun.castShadow = true;
const SH = MOBILE ? 32 : 48;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 200 });
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.08; // no striped self-shadowing on flat walls
scene.add(sun, sun.target);

const grass = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), toon(0x9cc37a));
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.05;
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

/* facade textures drawn once on canvas (2× resolution, anisotropic, mipmapped) */
function facade(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 128, 128);
  if (kind === 'shop') {
    g.fillStyle = '#6d6a66';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(8 + i * 40, 128); g.lineTo(8 + i * 40, 92); g.arc(24 + i * 40, 92, 16, Math.PI, 0); g.lineTo(40 + i * 40, 128); g.fill(); }
    g.fillStyle = '#9a958f';
    g.fillRect(0, 70, 128, 6);
    for (let i = 0; i < 2; i++) {
      g.fillStyle = '#5d5a57'; g.fillRect(22 + i * 52, 22, 32, 38);
      g.fillStyle = '#8f8a84'; g.fillRect(14 + i * 52, 22, 8, 38); g.fillRect(54 + i * 52, 22, 8, 38);
    }
  } else {
    g.fillStyle = '#6a6f78';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) g.fillRect(10 + x * 29, 6 + y * 15, 20, 9);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}

const box = new THREE.BoxGeometry(1, 1, 1);
const PASTEL = [0xf2a7a0, 0x9fd3c7, 0xf5d26b, 0xa7c5eb, 0xf3e1c7, 0xc9e4a6, 0xe8b4d8, 0xf7c59f];

/* ---------- cafés: one per dish, spread over the grid ---------- */
const CAFES = [
  { dish: 'teh-tarik', name: 'Kopitiam Pak Ali', kind: 'Kopitiam', at: [2, 2, 0], color: 0x0e6b47, note: 'Frothy, milky and not too sweet. The uncle pulls it from arm’s height.' },
  { dish: 'roti-canai', name: 'Mamak Bistro Selvam', kind: 'Mamak', at: [4, 2, 1], color: 0xd8321f, note: 'Crispy outside, soft layers inside. Tear it, dunk it in the dhal.' },
  { dish: 'nasi-lemak', name: 'Warung Kak Yah', kind: 'Warung', at: [2, 4, 3], color: 0x2f8f46, note: 'Coconut rice, fiery sambal and crunchy ikan bilis. Breakfast of champions.' },
  { dish: 'kuih-lapis', name: 'Kuih Nyonya Rose', kind: 'Kuih stall', at: [4, 4, 2], color: 0xe86a92, note: 'Peel it layer by layer. Soft, springy and lightly sweet.' },
  { dish: 'satay', name: 'Satay Haji Osman', kind: 'Satay stall', at: [0, 3, 0], color: 0xa2501d, note: 'Smoky from the charcoal, sweet from the marinade. Dip, bite, repeat.' },
  { dish: 'cendol', name: 'Cendol Tepi Jalan', kind: 'Dessert cart', at: [6, 3, 1], color: 0x2b59c3, note: 'Ice-cold and silky. The gula Melaka does all the talking.' },
  { dish: 'char-kway-teow', name: 'Wok Hei Uncle Lim', kind: 'Hawker stall', at: [3, 0, 2], color: 0x7a4a22, note: 'Smoky flat noodles, plump prawns and plenty of wok hei.' },
  { dish: 'asam-laksa', name: 'Laksa Pulau Pinang', kind: 'Hawker stall', at: [3, 6, 3], color: 0xc0562b, note: 'Sour, spicy and fishy in the best way. Add a spoon of prawn paste.' },
  { dish: 'ikan-bakar', name: 'Ikan Bakar Tepi Laut', kind: 'Seafood', at: [1, 5, 2], color: 0x1f6f8b, note: 'Charred on banana leaf, with lime and sambal on the side.' },
  { dish: 'durian', name: 'Durian Ah Keong', kind: 'Fruit stall', at: [5, 1, 3], color: 0x8a9a2a, note: 'Creamy, bittersweet and unforgettable. Your car will smell of it for a week.' },
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
  const centre = i === MID && j === MID;
  colliders.push({ x0: cx - B / 2, x1: cx + B / 2, z0: cz - B / 2, z1: cz + B / 2, park: centre });
  walks.push({ x: cx, y: 0.15, z: cz, sx: B, sy: 0.3, sz: B, color: centre ? 0x5a9a5a : 0xe8dcc3 });
  if (centre) continue;

  for (let s = 0; s < 4; s++) {
    const { n, ry } = SIDES[s];
    const t = [-n[1], n[0]];
    const hasCafe = cafeAt.has(`${i},${j},${s}`);
    // x-facing sides own the corners (three houses); z-facing sides get a middle house only,
    // so no two buildings overlap — overlaps flicker and let ink shells poke through walls
    const ks = s < 2 ? [-1, 0, 1] : [0];
    for (const k of ks) {
      if (k === 0 && hasCafe) continue;
      const w = hasCafe ? 3.4 : 4.2, d = 4, h = 5.5 + rand() * 2.6;
      const out = B / 2 - 1.4 - d / 2;
      const along = k * (hasCafe ? 5.4 : 4.4);
      const x = cx + n[0] * out + t[0] * along, z = cz + n[1] * out + t[1] * along;
      houses.push({ x, y: 0.3 + h / 2, z, sx: w, sy: h, sz: d, ry, color: PASTEL[Math.floor(rand() * PASTEL.length)] });
      roofs.push({ x, y: 0.3 + h + 0.25, z, sx: w + 0.1, sy: 0.5, sz: d + 0.2, ry, color: rand() < 0.5 ? 0xb5562f : 0x7c5a44 });
    }
    const lx = cx + n[0] * (B / 2 - 0.5) + t[0] * 2.4, lz = cz + n[1] * (B / 2 - 0.5) + t[1] * 2.4;
    poles.push({ x: lx, y: 0.3 + 2, z: lz, sx: 0.14, sy: 4, sz: 0.14, color: 0x2a2a2a });
    bulbs.push({ x: lx, y: 4.5, z: lz, sx: 0.35, sy: 0.35, sz: 0.35 });
  }
  if (rand() < 0.3) {
    const h = 14 + rand() * 12;
    condos.push({ x: cx, y: 0.3 + h / 2, z: cz, sx: 4.6, sy: h, sz: 4.6, color: [0xf3e1c7, 0xdfe6ee, 0xf2d4c2][Math.floor(rand() * 3)] });
  }
  for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = cx + ox * (B / 2 - 0.9), z = cz + oz * (B / 2 - 0.9), r = 1 + rand() * 0.4;
    trunks.push({ x, y: 1.3, z, sx: 0.3, sy: 2.2, sz: 0.3, color: 0x6b4a2b });
    canopies.push({ x, y: 2.9 + r * 0.5, z, sx: r, sy: r, sz: r, color: rand() < 0.5 ? 0x4cc552 : 0x2f8f46 });
  }
}
const hedges = [];
for (const s of [-1, 1]) {
  hedges.push({ x: 0, y: 0.6, z: s * (EDGE + 0.8), sx: EDGE * 2 + 3, sy: 1.2, sz: 1.2, color: 0x2f8f46 });
  hedges.push({ x: s * (EDGE + 0.8), y: 0.6, z: 0, sx: 1.2, sy: 1.2, sz: EDGE * 2 + 3, color: 0x2f8f46 });
}
const dashes = [];
for (const c of LINES) {
  for (let v = -EDGE + 1; v < EDGE - 1; v += 5) {
    if (LINES.some((o) => Math.abs(v - o) < ROAD / 2 + 0.8)) continue;
    dashes.push({ x: c, y: 0.03, z: v, sx: 0.3, sy: 0.02, sz: 2.2 });
    dashes.push({ x: v, y: 0.03, z: c, sx: 2.2, sy: 0.02, sz: 0.3 });
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

// KLCC in the middle — low-band variant so the facade doesn't shimmer at distance
const towers = buildTowers({ bandEvery: 4 });
towers.scale.multiplyScalar(10);
towers.position.y = 0.3 + 0.08 - new THREE.Box3().setFromObject(towers).min.y; // lifted a hair off the lawn: no z-fighting
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
  t.anisotropy = ANISO;
  return t;
}

const ringGeo = new THREE.TorusGeometry(2.6, 0.22, 8, 40);
for (const cafe of CAFES) {
  const [i, j, s] = cafe.at;
  const { n, ry } = SIDES[s];
  const cx = bc(i), cz = bc(j);
  const open = unlocked.includes(cafe.dish);
  const g = new THREE.Group();
  g.position.set(cx + n[0] * (B / 2 - 2.0), 0.3, cz + n[1] * (B / 2 - 2.0));
  g.rotation.y = ry;
  const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  part(new THREE.BoxGeometry(3.6, 3.4, 0.4), toon(cafe.color), 0, 1.7, -1.2);
  part(new THREE.BoxGeometry(3.2, 1.1, 1.2), toon(0xa0673a), 0, 0.55, 0.6);
  for (const sx of [-1.6, 1.6]) part(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), toon(0x2a2a2a), sx, 1.6, 1.2);
  for (let k = 0; k < 6; k++) {
    const stripe = part(new THREE.BoxGeometry(0.6, 0.08, 2.4), toon(k % 2 ? 0xfffaf0 : cafe.color), -1.5 + k * 0.6, 3.25, 0.1);
    stripe.rotation.x = 0.28;
  }
  part(new THREE.BoxGeometry(3.8, 0.9, 0.2), toon(0xfffaf0), 0, 4.1, -1.0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 0.86), new THREE.MeshBasicMaterial({ map: signTexture(cafe.name, cafe.color) }));
  sign.position.set(0, 4.1, -0.88);
  sign.userData.noInk = true;
  g.add(sign);
  if (!open) part(new THREE.BoxGeometry(3.3, 2.6, 0.12), toon(0x9aa0a6), 0, 1.6, 1.25);
  inkify(g);
  if (open) {
    const dish = buildDish(cafe.dish, 2.6);
    dish.position.set(0, 8, 0);
    g.add(dish);
    cafe.dishObj = dish;
  }
  scene.add(g);

  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xf5b700 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(cx + n[0] * (B / 2 + ROAD / 2), 0.25, cz + n[1] * (B / 2 + ROAD / 2));
  ring.visible = open;
  scene.add(ring);
  Object.assign(cafe, { ring, open, stall: g, x: ring.position.x, z: ring.position.z });
}
const paintRings = () => CAFES.forEach((c) => c.ring.material.color.set(trip.tasted.includes(c.dish) ? 0x3ddc84 : 0xf5b700));
paintRings();

/* ---------- cars: a little kancil, customisable ---------- */
const ROOFS = {
  tingkat: { label: 'Tingkat', dot: '#d8321f' },
  durian: { label: 'Durian', dot: '#9bb040' },
  teh: { label: 'Teh tarik', dot: '#c07a3f' },
  bunga: { label: 'Bunga raya', dot: '#d9443a' },
  none: { label: 'Nothing', dot: null },
};
const BODY_COLORS = [0xf5b700, 0xd8321f, 0x0e6b47, 0x2b59c3, 0xe86a92, 0xfbf6ea, 0x2a2a2a, 0xff7a3d];
const WHEEL_COLORS = [0x222222, 0xe4e8ee, 0xf5b700, 0xd8321f];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function buildCar({ body: bodyColor, wheels: wheelColor, roof }) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const body = new THREE.Group();
  g.add(body);
  // extra segments so the shell can crumple when it gets hit
  const shell = [
    add(new THREE.BoxGeometry(2, 0.75, 3.6, 6, 3, 10), toon(bodyColor), 0, 0.8, 0, body),
    add(new THREE.BoxGeometry(1.8, 0.75, 2, 5, 3, 6), toon(0xfbf6ea), 0, 1.5, -0.25, body),
  ];
  const glass = toon(0x2b59c3);
  add(new THREE.BoxGeometry(1.62, 0.55, 0.06), glass, 0, 1.52, 0.78, body).rotation.x = -0.35;
  add(new THREE.BoxGeometry(1.62, 0.5, 0.06), glass, 0, 1.52, -1.27, body);
  for (const sx of [-0.91, 0.91]) add(new THREE.BoxGeometry(0.06, 0.45, 1.5), glass, sx, 1.52, -0.25, body);
  const stripe = add(new THREE.BoxGeometry(2.04, 0.14, 3.64), toon(bodyColor === 0xd8321f ? 0xfbf6ea : 0xd8321f), 0, 0.72, 0, body);
  stripe.userData.noInk = true;
  const lights = { front: [], back: [] };
  for (const sx of [-0.65, 0.65]) {
    lights.front.push(add(new THREE.BoxGeometry(0.4, 0.2, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff4c2 }), sx, 0.9, 1.81, body));
    lights.back.push(add(new THREE.BoxGeometry(0.4, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xff3b2f }), sx, 0.9, -1.81, body));
  }
  const wheels = [], front = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 1.0, 0.42, sz * 1.15);
    add(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 16), toon(0x222222), 0, 0, 0, pivot).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.36, 12), toon(wheelColor === 0x222222 ? 0xe4e8ee : wheelColor), 0, 0, 0, pivot).rotation.z = Math.PI / 2;
    g.add(pivot);
    wheels.push(pivot);
    if (sz > 0) front.push(pivot);
  }
  inkify(g);
  // roof ornament (models come already inked)
  let orn = null;
  if (roof === 'tingkat') {
    orn = new THREE.Group();
    [0x0e6b47, 0xd8321f, 0xf5b700].forEach((c, k) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 16), toon(c)); m.position.y = k * 0.28; orn.add(m); });
    inkify(orn);
    orn.position.set(0, 2.03, -0.3);
  } else if (roof === 'durian') { orn = buildDish('durian', 0.9); orn.position.set(0, 2.35, -0.3); }
  else if (roof === 'teh') { orn = buildDish('teh-tarik', 1.0); orn.position.set(0, 2.4, -0.3); }
  else if (roof === 'bunga') { orn = buildHibiscus(); orn.scale.multiplyScalar(0.42); orn.position.set(0, 2.2, -0.3); }
  if (orn) { orn.traverse((o) => { if (o.isMesh) o.castShadow = true; }); body.add(orn); }
  Object.assign(g.userData, { body, wheels, front, shell, lights, glass, dented: false });
  return g;
}

let car = buildCar(trip.car);
scene.add(car);
function rebuildCar() {
  const old = car;
  car = buildCar(trip.car);
  car.position.copy(old.position);
  car.rotation.copy(old.rotation);
  car.visible = old.visible;
  scene.remove(old);
  scene.add(car);
}

// the rival: Ah Beng in a red kancil with a durian on the roof
const RIVAL_LOOK = { body: 0xd8321f, wheels: 0xf5b700, roof: 'durian' };
let rivalCar = buildCar(RIVAL_LOOK);
rivalCar.visible = false;
scene.add(rivalCar);

// arrow floating over the car that points to the next race gate
const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 4), toon(0xd8321f));
arrow.geometry.rotateX(Math.PI / 2);
inkify(arrow);
arrow.visible = false;
scene.add(arrow);

/* ---------- driving model (arcade), shared by player and rival ---------- */
const START = { x: -13, z: -70 };
// heading = where the nose points, vdir = where the car actually travels (they split while drifting)
const drive = { x: START.x, z: START.z, heading: 0, vdir: 0, speed: 0, steer: 0, shake: 0, boost: 0 };
const keys = { up: false, down: false, left: false, right: false, drift: false };
const angWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const RADIUS = 1.3;
function hits(x, z, r = RADIUS) {
  if (Math.abs(x) > EDGE - r || Math.abs(z) > EDGE - r) return true;
  // the grid is regular, so only the nearest block can overlap the point
  const i = Math.round(x / P + MID), j = Math.round(z / P + MID);
  if (i < 0 || j < 0 || i >= N || j >= N) return false;
  const cx = bc(i), cz = bc(j);
  return Math.abs(x - cx) < B / 2 + r && Math.abs(z - cz) < B / 2 + r;
}

/** Move a car state along its travel direction, sliding along walls. Returns true on a hard hit. */
function move(st, dt) {
  const dir = st.vdir ?? st.heading;
  const fx = Math.sin(dir), fz = Math.cos(dir);
  const nx = st.x + fx * st.speed * dt, nz = st.z + fz * st.speed * dt;
  if (!hits(nx, nz)) { st.x = nx; st.z = nz; return false; }
  if (!hits(nx, st.z)) { st.x = nx; st.speed *= 0.9; return false; }
  if (!hits(st.x, nz)) { st.z = nz; st.speed *= 0.9; return false; }
  const hard = Math.abs(st.speed) > 6;
  st.speed *= -0.3;
  return hard;
}
function pose(obj, st, dt, throttle = 0) {
  obj.position.set(st.x, 0, st.z);
  obj.rotation.y = st.heading;
  const { body, wheels, front } = obj.userData;
  body.rotation.z = -st.steer * st.speed * 0.006 + (body.userData.lean || 0);
  body.rotation.x = -throttle * 0.03;
  wheels.forEach((w) => { w.children[0].rotation.x += st.speed * dt / 0.42; w.children[1].rotation.x = w.children[0].rotation.x; });
  front.forEach((w) => { w.rotation.y = st.steer * 0.45; });
}

function step(dt) {
  const input = !modalOpen() && !race.countingDown && !drive.dead;
  const throttle = input ? (keys.up ? 1 : 0) - (keys.down ? 1 : 0) : 0;
  const steerIn = input ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0;
  if (throttle > 0) drive.speed += (drive.speed < 0 ? 40 : 16) * dt;
  else if (throttle < 0) drive.speed -= (drive.speed > 0 ? 34 : 10) * dt;
  drive.speed *= 1 - (throttle ? 0.35 : 1.4) * dt;
  if (drive.boost > 0) { drive.boost -= dt; drive.speed += 26 * dt; } // mini-turbo after a good drift
  drive.speed = Math.max(-8, Math.min(drive.boost > 0 ? 33 : 26, drive.speed));
  if (Math.abs(drive.speed) < 0.05 && !throttle) drive.speed = 0;
  drive.steer += (steerIn - drive.steer) * Math.min(1, dt * 8);
  const grip = Math.min(1, Math.abs(drive.speed) / 8) * Math.sign(drive.speed);

  // drift: hold Shift above walking pace — the nose turns harder while the car keeps sliding the old way
  const wantDrift = input && keys.drift && drive.speed > 7;
  if (wantDrift && !drift.on) Object.assign(drift, { on: true, time: 0, points: 0 });
  if (drift.on) drift.time += dt;
  drive.heading += drive.steer * (drift.on ? 2.9 : 2.1) * grip * dt;
  drive.vdir += angWrap(drive.heading - drive.vdir) * Math.min(1, (drift.on ? 2.4 : 12) * dt);
  const slip = Math.abs(angWrap(drive.heading - drive.vdir));
  if (drift.on) {
    drive.speed *= 1 - 0.3 * dt;
    if (slip > 0.18 && drive.speed > 8) { drift.points += slip * drive.speed * dt * 12; tyreFx(dt); }
    renderDrift();
  }
  if (drift.on && !wantDrift) endDrift();
  if (move(drive, dt)) { drive.shake = 0.5; if (drift.on) endDrift(true); }
  pose(car, drive, dt, throttle);
}

/* ---------- particles: shared geometry, per-particle material, capped count ---------- */
const PUFF_GEO = new THREE.SphereGeometry(1, 8, 6), CHIP_GEO = new THREE.BoxGeometry(1, 1, 1);
const PUFF_CAP = MOBILE ? 70 : 220;
function particle(list, geo, color, size, pos, vel, life, opacity = 0.9) {
  if (list === puffs && puffs.length >= PUFF_CAP) return null;
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity }));
  m.scale.setScalar(size);
  m.position.copy(pos);
  m.userData = { v: vel, life, size };
  scene.add(m);
  list.push(m);
  return m;
}
const FX = MOBILE ? 0.5 : 1; // particle density

/* ---------- drift extras: score, mini-turbo, skid marks, tyre smoke ---------- */
const drift = { on: false, time: 0, points: 0, fxT: 0 };
function renderDrift() {
  const el = $('#drift');
  el.hidden = false;
  const ready = drift.time > 0.8 && drift.points > 40;
  el.classList.toggle('ready', ready);
  el.innerHTML = `Drift <b>${Math.round(drift.points)}</b>${ready ? '<small>turbo ready</small>' : ''}`;
}
function endDrift(crashed = false) {
  drift.on = false;
  const el = $('#drift');
  if (!crashed && drift.time > 0.8 && drift.points > 40) {
    drive.boost = 0.9;
    el.innerHTML = `Turbo! <b>+${Math.round(drift.points)}</b>`;
    el.classList.add('ready');
  } else if (crashed) {
    el.innerHTML = 'Adoi! <b>0</b>';
    el.classList.remove('ready');
  }
  clearTimeout(endDrift.t);
  endDrift.t = setTimeout(() => { if (!drift.on) el.hidden = true; }, 900);
}
const SKIDS = 500;
const skidMat = new THREE.MeshBasicMaterial({ color: 0x2a2630, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const skids = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.36, 0.8).rotateX(-Math.PI / 2), skidMat, SKIDS);
skids.frustumCulled = false;
{ const zero = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < SKIDS; i++) skids.setMatrixAt(i, zero); }
scene.add(skids);
let skidI = 0;
function tyreFx(dt) {
  drift.fxT -= dt;
  if (drift.fxT > 0) return;
  drift.fxT = 0.03;
  const c = Math.cos(drive.heading), sn = Math.sin(drive.heading);
  for (const side of [-1, 1]) {
    // rear wheel in world space
    const lx = side * 1.0, lz = -1.15;
    const x = drive.x + lx * c + lz * sn, z = drive.z - lx * sn + lz * c;
    _q.setFromAxisAngle(UP, drive.heading);
    _m.compose(_p.set(x, 0.04, z), _q, _s.set(1, 1, 1));
    skids.setMatrixAt(skidI, _m);
    skidI = (skidI + 1) % SKIDS;
    if (Math.random() < 0.6 * FX) {
      particle(puffs, PUFF_GEO, 0xeeeae2, 0.35 + Math.random() * 0.25, new THREE.Vector3(x, 0.4, z),
        new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.8 + Math.random(), (Math.random() - 0.5) * 1.2), 0.8, 0.7);
    }
  }
  skids.instanceMatrix.needsUpdate = true;
}

/* ---------- chase camera that never enters buildings ---------- */
const camPos = new THREE.Vector3(drive.x, 9, drive.z - 12);
const camLook = new THREE.Vector3();
function follow(dt) {
  const camDir = drive.vdir + angWrap(drive.heading - drive.vdir) * 0.35; // mostly travel direction: drifts look sideways
  const fx = Math.sin(camDir), fz = Math.cos(camDir);
  const back = race.running ? 11 : 12, up = race.running ? 7.5 : 9.5;
  let free = 1;
  for (let k = 1; k <= 12; k++) {
    const f = k / 12, px = drive.x - fx * back * f, pz = drive.z - fz * back * f;
    if (hits(px, pz, 0.8) || Math.abs(px) > EDGE || Math.abs(pz) > EDGE) break;
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
  sun.position.set(drive.x - 36, 55, drive.z + 22);
  sun.target.position.set(drive.x, 0, drive.z);
}

/* ---------- cafés: the dialog only pops the first time ---------- */
let current = null, lastCafe = null;
const modalOpen = () => ['#intro', '#cafe', '#result', '#raceMenu', '#garage'].some((id) => !$(id).hidden);

function checkCafes() {
  if (race.running || race.countingDown || modalOpen()) return;
  for (const c of CAFES) {
    const d = Math.hypot(drive.x - c.x, drive.z - c.z);
    if (c === lastCafe && d > 6) lastCafe = null;
    if (c === lastCafe) continue;
    if (d < 6 && !c.open) { hint(`${c.name} is closed. Win ${DISHES.find((x) => x.id === c.dish).name} in the quiz to open it.`); lastCafe = c; }
    else if (d < 3.2 && c.open && !trip.tasted.includes(c.dish) && Math.abs(drive.speed) < 18) { openCafe(c); lastCafe = c; }
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
  $('#cafeDone').hidden = true;
  $('#tasteBtn').hidden = false;
  $('#cafe').hidden = false;
  $('#tasteBtn').focus();
}
function taste() {
  if (!current || trip.tasted.includes(current.dish)) return;
  trip.tasted.push(current.dish);
  save();
  addCoins(5);
  steam(current.stall);
  toast(`Sedap! ${DISHES.find((x) => x.id === current.dish).name} tasted · +5 coins`, current.dish);
  paintRings();
  renderHud();
  closeCafe();
  if (allUnlocked && DISHES.every((d) => trip.tasted.includes(d.id))) toast('You tasted everything. Race unlocked! Press R');
}
function closeCafe() { $('#cafe').hidden = true; current = null; canvas.focus(); }

const puffs = [];
function steam(stall) {
  const base = stall.position.clone().add(new THREE.Vector3(0, 3, 0));
  for (let k = 0; k < 14 * FX; k++) {
    particle(puffs, PUFF_GEO, 0xffffff, 0.3 + Math.random() * 0.3, base.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2)),
      new THREE.Vector3((Math.random() - 0.5) * 1.5, 2 + Math.random() * 2, (Math.random() - 0.5) * 1.5), 1);
  }
}

/* ---------- race ----------
   The loop follows roads only. Gates sit in the middle of straight stretches,
   rotated along the road and exactly as wide as it, so poles stay on the kerbs. */
const CORNERS = [[-13, 13], [39, 13], [39, 65], [91, 65], [91, -91], [13, -91], [13, -39], [-65, -39], [-65, -91], [-13, -91]];
const PATH = [[START.x, START.z], ...CORNERS, [START.x, START.z]]; // closed loop back to the start line
const GATE_SPOTS = [];
for (let k = 1; k < PATH.length; k++) {
  const [ax, az] = PATH[k - 1], [bx, bz] = PATH[k];
  const len = Math.hypot(bx - ax, bz - az);
  const last = k === PATH.length - 1;
  const pieces = last ? 1 : len > 110 ? 3 : len > 60 ? 2 : 1;
  for (let p = 1; p <= pieces; p++) {
    const f = last ? 1 : p / (pieces + 1); // the last one is the finish line itself
    GATE_SPOTS.push({ x: ax + (bx - ax) * f, z: az + (bz - az) * f, ang: Math.atan2(bx - ax, bz - az), seg: k });
  }
}
const race = { running: false, countingDown: false, mode: 'trial', idx: 0, t: 0 };
const gates = GATE_SPOTS.map(({ x, z, ang }, k) => {
  const g = new THREE.Group();
  const red = toon(0xd8321f), gold = toon(0xf5b700);
  const hw = ROAD / 2 - 0.35; // poles on the kerb line
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 6.4, 10), red); p.position.set(s * hw, 3.2, 0); g.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 0.6, 0.5, 0.5), red); beam.position.y = 6.3; g.add(beam);
  const top = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 1.4, 0.3, 0.7), gold); top.position.y = 6.75; g.add(top);
  for (const s of [-2.6, 0, 2.6]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff4d3d }));
    l.scale.y = 0.85; l.position.set(s, 5.35, 0); g.add(l);
  }
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.95), new THREE.MeshBasicMaterial({ map: signTexture(k === GATE_SPOTS.length - 1 ? 'Finish' : `Gate ${k + 1}`, 0xd8321f), side: THREE.DoubleSide }));
  label.position.set(0, 6.3, 0.3);
  label.userData.noInk = true;
  g.add(label);
  inkify(g);
  g.position.set(x, 0, z);
  g.rotation.y = ang;
  g.visible = false;
  scene.add(g);
  // inside a junction the gate may also turn across; on a plain straight it can only flip
  const onLine = (v) => LINES.some((l) => Math.abs(v - l) < ROAD / 2);
  const axes = [ang, ang + Math.PI];
  if (onLine(x) && onLine(z)) axes.push(ang + Math.PI / 2, ang - Math.PI / 2);
  return { x, z, obj: g, axes, cur: ang, ang, seg: GATE_SPOTS[k].seg };
});
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/** The active gates swing round to face you as you approach, snapping to a direction the road allows. */
function aimGates(dt) {
  for (const k of [race.idx, race.idx + 1]) {
    const g = gates[k];
    if (!g || !g.obj.visible) continue;
    const dist = Math.hypot(g.x - drive.x, g.z - drive.z);
    if (dist < 80 && dist > GATE_R) {
      const want = Math.atan2(g.x - drive.x, g.z - drive.z); // direction you are coming from
      g.target = g.axes.reduce((best, a) => (Math.abs(wrap(a - want)) < Math.abs(wrap(best - want)) ? a : best), g.axes[0]);
    }
    if (g.target === undefined) continue;
    // springy turn: a little overshoot so it reads as the gate reacting to you
    g.vel = (g.vel || 0) + wrap(g.target - g.cur) * 60 * dt;
    g.vel *= Math.exp(-9 * dt);
    g.cur += g.vel * dt;
    g.obj.rotation.y = g.cur;
  }
}
const GATE_R = ROAD / 2 + 1.2;

/* rival AI: follows the road corners, brakes for turns, mild rubber band */
const rival = { x: 0, z: 0, heading: 0, speed: 0, steer: 0, wp: 1, gate: 0, done: false };
function progress(gateIdx, st) {
  const g = gates[Math.min(gateIdx, gates.length - 1)];
  const prev = gateIdx > 0 ? gates[gateIdx - 1] : { x: START.x, z: START.z };
  const seg = Math.max(1, Math.hypot(g.x - prev.x, g.z - prev.z));
  return gateIdx + Math.max(0, 1 - Math.hypot(st.x - g.x, st.z - g.z) / seg);
}
function rivalStep(dt) {
  if (!race.running || rival.done || rival.dead) { if (!rival.dead) pose(rivalCar, rival, 0); return; }
  const [tx, tz] = PATH[rival.wp];
  const dx = tx - rival.x, dz = tz - rival.z, dist = Math.hypot(dx, dz);
  if (dist < 5 && rival.wp < PATH.length - 1) rival.wp++;
  let diff = Math.atan2(dx, dz) - rival.heading;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  rival.steer = Math.max(-1, Math.min(1, diff * 2));
  rival.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
  const next = PATH[rival.wp + 1];
  let target = 23;
  if (next) {
    const a1 = Math.atan2(dx, dz), a2 = Math.atan2(next[0] - tx, next[1] - tz);
    const turn = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
    if (turn > 0.6 && dist < 24) target = 11; // brake for the corner
  }
  if (Math.abs(diff) > 0.5) target = Math.min(target, 9);
  const lead = progress(rival.gate, rival) - progress(race.idx, drive);
  target *= lead > 1.2 ? 0.86 : lead < -1.2 ? 1.08 : 1; // keep it close
  rival.speed += Math.sign(target - rival.speed) * (rival.speed < target ? 15 : 32) * dt;
  move(rival, dt);
  pose(rivalCar, rival, dt, 1);
  const g = gates[rival.gate];
  if (g && Math.hypot(rival.x - g.x, rival.z - g.z) < GATE_R) {
    rival.gate++;
    if (rival.gate === gates.length) { rival.done = true; if (race.running) finishRace(false); }
  }
}
/* ---------- contact damage (1 vs 1) ----------
   First touch: both cars crumple. Second touch: whoever got rammed explodes and
   respawns at the last gate it passed. Then the count starts over. */
const contact = { count: 0, cool: 0 };
function bumpCars(dt) {
  contact.cool = Math.max(0, contact.cool - dt);
  drive.safe = Math.max(0, (drive.safe || 0) - dt);
  rival.safe = Math.max(0, (rival.safe || 0) - dt);
  if (drive.dead || rival.dead || !race.running) return;
  const dx = drive.x - rival.x, dz = drive.z - rival.z, d = Math.hypot(dx, dz);
  if (!(d > 0 && d < 2.6)) return;
  const push = (2.6 - d) / 2, nx = dx / d, nz = dz / d;
  if (!hits(drive.x + nx * push, drive.z + nz * push)) { drive.x += nx * push; drive.z += nz * push; }
  if (!hits(rival.x - nx * push, rival.z - nz * push)) { rival.x -= nx * push; rival.z -= nz * push; }
  if (contact.cool > 0 || drive.safe > 0 || rival.safe > 0) { drive.speed *= 0.97; rival.speed *= 0.97; return; }

  // who rammed whom: the car closing in faster along the line between them
  const pv = drive.speed, rv = rival.speed;
  const pClose = -(Math.sin(drive.vdir ?? drive.heading) * nx + Math.cos(drive.vdir ?? drive.heading) * nz) * pv;
  const rClose = (Math.sin(rival.heading) * nx + Math.cos(rival.heading) * nz) * rv;
  const hitPoint = new THREE.Vector3((drive.x + rival.x) / 2, 0.9, (drive.z + rival.z) / 2);
  contact.count++;
  contact.cool = 1.1;
  drive.shake = 0.6;
  drive.speed *= 0.6; rival.speed *= 0.6;
  sparks(hitPoint);
  if (contact.count === 1) {
    dent(car, rival.x, rival.z); dent(rivalCar, drive.x, drive.z);
    hint('Bang! Both cars dented. One more hit and someone blows up.');
  } else {
    const rivalWasRammed = pClose >= rClose;
    explode(rivalWasRammed ? 'rival' : 'player');
    contact.count = 0;
  }
}
function resetDamage() {
  contact.count = 0; contact.cool = 0;
  drive.dead = false; drive.safe = 0;
  if (car.userData.dented) rebuildCar();
  if (rivalCar.userData.dented) rebuildRival();
  car.visible = true;
}
function rebuildRival() {
  const old = rivalCar;
  rivalCar = buildCar(RIVAL_LOOK);
  rivalCar.visible = old.visible;
  scene.remove(old);
  scene.add(rivalCar);
  pose(rivalCar, rival, 0);
}

/** Crumple the side of the car facing the other car: shell pushed in, lights smashed, glass cracked. */
function dent(obj, otherX, otherZ) {
  obj.updateMatrixWorld(true);
  const c = obj.position;
  const dir = new THREE.Vector3(otherX - c.x, 0, otherZ - c.z).normalize();
  const impact = c.clone().addScaledVector(dir, 1.9).setY(0.9); // on the shell, not inside it
  for (const m of obj.userData.shell) {
    const local = m.worldToLocal(impact.clone());
    const inward = dir.clone().negate().transformDirection(new THREE.Matrix4().copy(m.matrixWorld).invert()).normalize();
    const pos = m.geometry.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const dist = v.distanceTo(local);
      if (dist > 2.1) continue;
      let k = (2.1 - dist) / 2.1;
      k = k * k * (3 - 2 * k);
      v.addScaledVector(inward, k * 0.6);                        // caved in
      v.x += (Math.random() - 0.5) * 0.22 * k;                   // crumpled, not a clean push
      v.y += (Math.random() - 0.5) * 0.2 * k;
      v.z += (Math.random() - 0.5) * 0.22 * k;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    m.geometry.computeVertexNormals();
  }
  // which end took it: smash those lights
  const localHit = obj.userData.body.worldToLocal(impact.clone());
  const smashed = localHit.z > 0.6 ? obj.userData.lights.front : localHit.z < -0.6 ? obj.userData.lights.back : [];
  smashed.forEach((l) => { l.material = new THREE.MeshBasicMaterial({ color: 0x3a3632 }); l.rotation.z = (Math.random() - 0.5) * 0.8; });
  obj.userData.glass.color.set(0xc9d6ea);                        // cracked, milky windows
  const body = obj.userData.body;
  body.rotation.y = (Math.random() - 0.5) * 0.12;               // knocked out of true
  body.userData.lean = (localHit.x > 0 ? 1 : -1) * 0.07;         // sags on the hit side
  obj.userData.dented = true;
}

/* explosions, debris, sparks, and a smoking bonnet on dented cars */
const debris = [];
function sparks(at) {
  for (let k = 0; k < 16 * FX; k++) {
    particle(debris, CHIP_GEO, k % 2 ? 0xffd23d : 0xff7a3d, 0.12, at, new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 7, (Math.random() - 0.5) * 12), 0.5, 1);
  }
}
function explode(who) {
  const st = who === 'player' ? drive : rival;
  const obj = who === 'player' ? car : rivalCar;
  const color = who === 'player' ? trip.car.body : RIVAL_LOOK.body;
  const at = new THREE.Vector3(st.x, 1, st.z);
  // fireball
  for (let k = 0; k < 22 * FX; k++) {
    particle(puffs, PUFF_GEO, [0xffd23d, 0xff7a3d, 0xd8321f][k % 3], 0.5 + Math.random() * 0.7, at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random(), (Math.random() - 0.5) * 1.5)),
      new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 5, (Math.random() - 0.5) * 6), 0.9, 0.95);
  }
  // body panels flying off
  for (let k = 0; k < 12 * FX; k++) {
    const m = new THREE.Mesh(CHIP_GEO, toon(k % 3 ? color : 0x222222));
    m.scale.set(0.3 + Math.random() * 0.6, 0.12, 0.3 + Math.random() * 0.6);
    m.position.copy(at);
    m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 16, 5 + Math.random() * 9, (Math.random() - 0.5) * 16);
    m.userData.spin = new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    m.userData.life = 1.6;
    m.castShadow = true;
    scene.add(m); debris.push(m);
  }
  obj.visible = false;
  st.dead = true;
  st.speed = 0;
  drive.shake = who === 'player' ? 1.2 : Math.max(drive.shake, 0.7);
  if (drift.on) endDrift(true);
  hint(who === 'player' ? 'BOOM! Ah Beng wrecked you. Back to your last gate…' : 'BOOM! Ah Beng is wrecked. He restarts from his last gate.');
  setTimeout(() => respawn(who), 1200);
}
function respawn(who) {
  if (!race.running) return;
  const passed = who === 'player' ? race.idx : rival.gate;
  const g = passed > 0 ? gates[passed - 1] : null;
  const spot = g ? { x: g.x, z: g.z, heading: g.ang, seg: g.seg } : { x: START.x, z: START.z, heading: 0, seg: 1 };
  if (who === 'player') {
    Object.assign(drive, { x: spot.x, z: spot.z, heading: spot.heading, vdir: spot.heading, speed: 0, steer: 0, boost: 0, dead: false, safe: 2 });
    rebuildCar();
    car.visible = true;
    camPos.set(drive.x - Math.sin(drive.heading) * 11, 7.5, drive.z - Math.cos(drive.heading) * 11);
  } else {
    Object.assign(rival, { x: spot.x, z: spot.z, heading: spot.heading, speed: 0, steer: 0, wp: spot.seg, dead: false, safe: 2 });
    rebuildRival();
    rivalCar.visible = true;
  }
}
function damageFx(dt) {
  for (let k = debris.length - 1; k >= 0; k--) {
    const m = debris[k];
    m.userData.v.y -= 22 * dt;
    m.position.addScaledVector(m.userData.v, dt);
    if (m.position.y < 0.1) { m.position.y = 0.1; m.userData.v.multiplyScalar(0.5); m.userData.v.y *= -0.3; }
    if (m.userData.spin) { m.rotation.x += m.userData.spin.x * dt; m.rotation.z += m.userData.spin.z * dt; }
    m.userData.life -= dt;
    if (m.userData.life <= 0) { scene.remove(m); m.material.dispose(); debris.splice(k, 1); }
  }
  // invulnerable cars blink; dented cars smoke from the bonnet
  const blink = Math.floor(performance.now() / 120) % 2 === 0;
  if (!drive.dead) car.visible = !(drive.safe > 0) || blink;
  if (!rival.dead && race.mode === 'duel' && (race.running || race.countingDown)) rivalCar.visible = !(rival.safe > 0) || blink;
  damageFx.t = (damageFx.t || 0) - dt;
  if (damageFx.t <= 0) {
    damageFx.t = 0.12;
    for (const [obj, st] of [[car, drive], [rivalCar, rival]]) {
      if (!obj.userData.dented || st.dead || !obj.visible) continue;
      particle(puffs, PUFF_GEO, 0x6b6660, 0.25 + Math.random() * 0.2, new THREE.Vector3(st.x + Math.sin(st.heading) * 1.4, 1.3, st.z + Math.cos(st.heading) * 1.4),
        new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.5, (Math.random() - 0.5) * 0.6), 0.9, 0.6);
    }
  }
}

function openRaceMenu() {
  if (!raceAllowed() || race.running || race.countingDown) return;
  closeCafe();
  $('#result').hidden = true;
  $('#bestTrial').textContent = trip.best ? `Best lap ${fmt(trip.best)}` : 'No lap yet';
  $('#duelRecord').textContent = `${trip.wins} win${trip.wins === 1 ? '' : 's'} · ${trip.losses} loss${trip.losses === 1 ? '' : 'es'}`;
  $('#raceMenu').hidden = false;
  $('#modeTrial').focus();
}
function startRace(mode) {
  $('#raceMenu').hidden = true;
  $('#result').hidden = true;
  race.mode = mode;
  const duel = mode === 'duel';
  Object.assign(drive, { x: START.x - (duel ? 2.6 : 0), z: START.z, heading: 0, vdir: 0, speed: 0, steer: 0, boost: 0 });
  Object.assign(rival, { x: START.x + 2.6, z: START.z, heading: 0, speed: 0, steer: 0, wp: 1, gate: 0, done: false, dead: false, safe: 0 });
  resetDamage();
  rivalCar.visible = duel;
  pose(rivalCar, rival, 0);
  camPos.set(drive.x, 7.5, drive.z - 11);
  Object.assign(race, { running: false, countingDown: true, idx: 0, t: 0 });
  gates.forEach((g) => { g.cur = g.axes[0]; g.vel = 0; g.target = undefined; g.obj.rotation.y = g.cur; });
  showGates();
  $('#raceHud').hidden = false;
  $('#racePos').hidden = !duel;
  $('#raceTime').textContent = fmt(0);
  $('#raceCp').textContent = `Gate 0/${gates.length}`;
  arrow.visible = true;
  const cd = $('#countdown');
  cd.hidden = false;
  ['3', '2', '1', 'Jalan!'].forEach((txt, k) => setTimeout(() => {
    if (!race.countingDown) return; // aborted
    cd.classList.toggle('go', k === 3);
    cd.innerHTML = `<span>${txt}</span>`;
    if (k === 3) { race.countingDown = false; race.running = true; showGates(); setTimeout(() => { cd.hidden = true; }, 700); }
  }, k * 800));
}
function showGates() {
  gates.forEach((g, k) => { g.obj.visible = (race.running || race.countingDown) && (k === race.idx || k === race.idx + 1); g.obj.scale.setScalar(k === race.idx ? 1 : 0.85); });
}
function checkGates() {
  if (!race.running) return;
  const g = gates[race.idx];
  if (Math.hypot(drive.x - g.x, drive.z - g.z) < GATE_R) {
    race.idx++;
    $('#raceCp').textContent = `Gate ${race.idx}/${gates.length}`;
    if (race.idx === gates.length) return finishRace(true);
    showGates();
  }
  if (race.mode === 'duel') {
    const first = progress(race.idx, drive) >= progress(rival.gate, rival);
    race.first = first;
  }
}
function finishRace(playerFirst) {
  race.running = false;
  arrow.visible = false;
  gates.forEach((g) => { g.obj.visible = false; });
  $('#raceHud').hidden = true;
  if (race.mode === 'duel') {
    if (playerFirst) { trip.wins++; addCoins(20); } else trip.losses++;
    save();
    $('#resTitle').textContent = playerFirst ? 'Menang! You win' : 'Kalah! Ah Beng wins';
    $('#resTime').textContent = fmt(race.t);
    $('#resBest').textContent = playerFirst ? '+20 coins. Ah Beng wants a rematch.' : 'He took the corners faster. Try again?';
  } else {
    const pb = !trip.best || race.t < trip.best;
    if (pb) { trip.best = Math.round(race.t); save(); addCoins(10); }
    $('#resTitle').textContent = pb ? 'Rekod baru!' : 'Finish!';
    $('#resTime').textContent = fmt(race.t);
    $('#resBest').textContent = pb ? 'New best lap! +10 coins' : `Best: ${fmt(trip.best)}`;
  }
  $('#result').hidden = false;
  $('#raceAgain').focus();
}
function abortRace() {
  race.running = race.countingDown = false;
  rival.dead = false;
  resetDamage();
  arrow.visible = false;
  rivalCar.visible = false;
  gates.forEach((g) => { g.obj.visible = false; });
  $('#raceHud').hidden = true;
  $('#countdown').hidden = true;
}
const raceAllowed = () => PREVIEW || (allUnlocked && DISHES.every((d) => trip.tasted.includes(d.id)));
const fmt = (ms) => { const s = ms / 1000, m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

/* ---------- garage ---------- */
function renderGarage() {
  const sw = (list, keyName) => list.map((c) => `<button class="swatch" style="background:${hex(c)}" aria-label="${keyName} colour ${hex(c)}" aria-pressed="${trip.car[keyName] === c}" data-${keyName}="${c}"></button>`).join('');
  $('#swBody').innerHTML = sw(BODY_COLORS, 'body');
  $('#swWheels').innerHTML = sw(WHEEL_COLORS, 'wheels');
  $('#swRoof').innerHTML = Object.entries(ROOFS).map(([id, r]) => `<button class="roof-opt" aria-pressed="${trip.car.roof === id}" data-roof="${id}">${r.label}</button>`).join('');
}
$('#garage').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.body) trip.car.body = +b.dataset.body;
  else if (b.dataset.wheels) trip.car.wheels = +b.dataset.wheels;
  else if (b.dataset.roof) trip.car.roof = b.dataset.roof;
  else return;
  save();
  rebuildCar();
  renderGarage();
});
const openGarage = () => { if (race.running || race.countingDown) return; closeCafe(); renderGarage(); $('#garage').hidden = false; $('#garageDone').focus(); };
const closeGarage = () => { $('#garage').hidden = true; canvas.focus(); };

/* ---------- HUD, hints, toasts, minimap ---------- */
let hudT = 0;
function hudText(dt) { // text changes at 10 Hz — no need to touch the DOM every frame
  if ((hudT -= dt) > 0 || !race.running) return;
  hudT = 0.1;
  $('#raceTime').textContent = fmt(race.t);
  if (race.mode === 'duel') {
    $('#racePos').textContent = race.first ? '1st' : '2nd';
    $('#racePos').classList.toggle('first', !!race.first);
  }
}
/** Nudge the render resolution to hold ~50–60 fps on whatever device this is. */
const perf = { acc: 0, n: 0 };
function adaptResolution(dt) {
  perf.acc += dt; perf.n++;
  if (perf.acc < 1.5) return;
  const avg = perf.acc / perf.n;
  perf.acc = perf.n = 0;
  const next = avg > 1 / 45 ? dpr - 0.15 : avg < 1 / 58 ? dpr + 0.1 : dpr;
  const clamped = Math.max(0.7, Math.min(DPR_MAX, next));
  if (Math.abs(clamped - dpr) > 0.01) { dpr = clamped; renderer.setPixelRatio(dpr); resize(); }
}
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
const S = 200, K = S / (EDGE * 2 + 4), MX = (x) => (x + EDGE + 2) * K, MZ = (z) => (z + EDGE + 2) * K;
/** A tiny top-down kancil in the car's own colours, with its roof ornament as a dot. */
function mmCar(st, look) {
  mm.save();
  mm.translate(MX(st.x), MZ(st.z));
  mm.rotate(-st.heading);
  mm.scale(1.25, 1.25);
  mm.lineWidth = 1.2; mm.strokeStyle = '#16130e';
  mm.fillStyle = hex(look.wheels === 0x222222 ? 0x16130e : look.wheels);
  for (const [x, y] of [[-4.4, 2.4], [3, 2.4], [-4.4, -5], [3, -5]]) mm.fillRect(x, y, 1.4, 2.6);
  mm.fillStyle = hex(look.body);
  mm.beginPath(); mm.roundRect(-3.4, -6.5, 6.8, 13, 2); mm.fill(); mm.stroke();
  mm.fillStyle = '#2b59c3'; mm.fillRect(-2.5, 2.4, 5, 2); // windscreen, facing forward
  const dot = ROOFS[look.roof]?.dot;
  if (dot) { mm.beginPath(); mm.arc(0, -1.6, 1.8, 0, Math.PI * 2); mm.fillStyle = dot; mm.fill(); mm.stroke(); }
  mm.restore();
}
const mmBase = document.createElement('canvas');
mmBase.width = mmBase.height = S;
{
  const b = mmBase.getContext('2d');
  b.fillStyle = '#9cc37a'; b.fillRect(0, 0, S, S);
  b.fillStyle = '#55505e'; b.fillRect(MX(-EDGE), MZ(-EDGE), EDGE * 2 * K, EDGE * 2 * K);
  for (const c of colliders) { b.fillStyle = c.park ? '#5a9a5a' : '#e8dcc3'; b.fillRect(MX(c.x0), MZ(c.z0), B * K, B * K); }
}
let mmT = 0;
function minimap(dt) {
  if ((mmT -= dt) > 0) return;
  mmT = 1 / 30;
  mm.drawImage(mmBase, 0, 0);
  if (race.running || race.countingDown) {
    mm.beginPath(); PATH.forEach(([x, z], k) => (k ? mm.lineTo(MX(x), MZ(z)) : mm.moveTo(MX(x), MZ(z))));
    mm.strokeStyle = 'rgba(216,50,31,.55)'; mm.lineWidth = 2; mm.stroke();
    const g = gates[race.idx];
    if (g) { mm.beginPath(); mm.arc(MX(g.x), MZ(g.z), 5, 0, Math.PI * 2); mm.fillStyle = '#d8321f'; mm.fill(); mm.lineWidth = 1.5; mm.strokeStyle = '#16130e'; mm.stroke(); }
  } else {
    for (const c of CAFES) {
      mm.beginPath(); mm.arc(MX(c.x), MZ(c.z), 4, 0, Math.PI * 2);
      mm.fillStyle = !c.open ? '#9aa0a6' : trip.tasted.includes(c.dish) ? '#3ddc84' : '#f5b700';
      mm.fill(); mm.lineWidth = 1.5; mm.strokeStyle = '#16130e'; mm.stroke();
    }
  }
  if (rivalCar.visible) mmCar(rival, RIVAL_LOOK);
  mmCar(drive, trip.car);
}

/* ---------- input ---------- */
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ShiftLeft: 'drift', ShiftRight: 'drift' };
addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; if (!modalOpen()) e.preventDefault(); }
  if (e.code === 'Escape') {
    if (!$('#cafe').hidden) closeCafe();
    else if (!$('#garage').hidden) closeGarage();
    else if (!$('#raceMenu').hidden) { $('#raceMenu').hidden = true; canvas.focus(); }
    else if (race.running || race.countingDown) abortRace();
  }
  if (e.code === 'KeyR' && !modalOpen()) openRaceMenu();
  if (e.code === 'KeyG' && !modalOpen()) openGarage();
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
$('#raceBtn').addEventListener('click', openRaceMenu);
$('#modeTrial').addEventListener('click', () => startRace('trial'));
$('#modeDuel').addEventListener('click', () => startRace('duel'));
$('#raceMenuClose').addEventListener('click', () => { $('#raceMenu').hidden = true; canvas.focus(); });
$('#raceAgain').addEventListener('click', () => startRace(race.mode));
$('#freeRoam').addEventListener('click', () => { $('#result').hidden = true; rival.dead = false; resetDamage(); rivalCar.visible = false; canvas.focus(); });
$('#garageBtn').addEventListener('click', openGarage);
$('#garageDone').addEventListener('click', closeGarage);
$('#startDrive').addEventListener('click', () => { $('#intro').hidden = true; canvas.focus(); hint('Drive into a glowing ring to stop at a café.'); });
canvas.tabIndex = 0;
if (PREVIEW) { // handy for poking at the preview from devtools
  window.__trip = { drive, rival, race, gates, camera, contact, get car() { return car; }, get rivalCar() { return rivalCar; }, frame: () => { step(0.016); follow(1); renderer.render(scene, camera); } };
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
let simTime = 0;
function tick() {
  requestAnimationFrame(tick);
  sim(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
}
/** One frame of game logic (also driven by hand from devtools in preview). */
function sim(dt) {
  const t = (simTime += dt);
  step(dt);
  if (race.mode === 'duel' && (race.running || race.countingDown)) { rivalStep(dt); bumpCars(dt); }
  damageFx(dt);
  follow(dt);
  checkCafes();
  checkGates();
  if (race.running || race.countingDown) aimGates(dt);
  if (race.running) race.t += dt * 1000;
  if (arrow.visible) {
    const g = gates[race.idx];
    if (g) {
      arrow.position.set(drive.x, 4.2 + Math.sin(t * 4) * 0.15, drive.z);
      arrow.rotation.y = Math.atan2(g.x - drive.x, g.z - drive.z);
    }
  }
  for (const c of CAFES) {
    if (c.dishObj) { c.dishObj.rotation.y += dt * (reducedMotion ? 0 : 0.8); c.dishObj.position.y = 8 + Math.sin(t * 1.5 + c.x) * 0.25; }
    c.ring.visible = c.open && !race.running && !race.countingDown; // café rings step aside during races
    c.ring.scale.setScalar(1 + Math.sin(t * 3 + c.z) * 0.05);
  }
  for (let k = puffs.length - 1; k >= 0; k--) {
    const p = puffs[k];
    p.position.addScaledVector(p.userData.v, dt);
    p.userData.life -= dt * 0.8;
    p.material.opacity = Math.max(0, p.userData.life);
    p.scale.setScalar((p.userData.size || 1) * (1 + (1 - p.userData.life)));
    if (p.userData.life <= 0) { scene.remove(p); p.material.dispose(); puffs.splice(k, 1); }
  }
  minimap(dt);
  hudText(dt);
  adaptResolution(dt);
}
tick();
if (PREVIEW) window.__trip.sim = (frames = 1, dt = 1 / 60) => { for (let i = 0; i < frames; i++) sim(dt); renderer.render(scene, camera); };
