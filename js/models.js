import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- toon materials + ink outline (matches the printed look) ---------- */
const gradient = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;

const cache = new Map();
export const M = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...opts }));
  return cache.get(key);
};
const INK = new THREE.MeshBasicMaterial({ color: 0x16130e, side: THREE.BackSide });

/** Adds a slightly larger back-face mesh behind every mesh, which draws a hand-inked outline. */
export function inkify(root, thickness = 1.07) {
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.noInk) meshes.push(o); });
  for (const m of meshes) {
    const line = new THREE.Mesh(m.geometry, INK);
    line.scale.setScalar(thickness);
    line.userData.noInk = true;
    m.add(line);
  }
  return root;
}

const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
};
const plate = (r = 1.05) => mesh(new THREE.CylinderGeometry(r, r * 0.82, 0.12, 24), M(0xfbf6ea));
const bowl = (r, color) =>
  new THREE.Mesh(new THREE.SphereGeometry(r, 18, 9, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M(color, { side: THREE.DoubleSide }));

let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* ---------- dishes ---------- */
const DISH = {
  'nasi-lemak'() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.02, 7), M(0x2f8f46), 0, -0.07, 0));
    g.add(plate());
    const rice = mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xffffff), -0.2, 0.06, 0);
    rice.scale.y = 1.15;
    g.add(rice);
    const white = mesh(new THREE.SphereGeometry(0.22, 12, 8), M(0xffffff), 0.5, 0.12, 0.3);
    white.scale.set(1, 0.5, 1.3);
    g.add(white, mesh(new THREE.SphereGeometry(0.11, 10, 8), M(0xffb300), 0.5, 0.2, 0.3));
    g.add(mesh(new THREE.ConeGeometry(0.24, 0.28, 8), M(0xd8321f), 0.45, 0.2, -0.38));
    for (let i = 0; i < 3; i++) {
      const c = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 10), M(0x8bd66e), -0.55 + i * 0.16, 0.14, 0.55);
      c.rotation.x = Math.PI / 2.6;
      g.add(c);
    }
    for (let i = 0; i < 10; i++) g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), M(0xb5763a), -0.1 + rand() * 0.4, 0.1, 0.5 + rand() * 0.3));
    return g;
  },

  'roti-canai'() {
    const g = new THREE.Group();
    g.add(plate());
    g.add(mesh(new THREE.CylinderGeometry(0.72, 0.76, 0.1, 9), M(0xeab655), -0.12, 0.1, 0.05));
    const r2 = mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.09, 8), M(0xd49033), -0.2, 0.2, 0.15);
    r2.rotation.set(0.12, 0.6, 0.08);
    g.add(r2);
    const b = bowl(0.32, 0x9b5b34);
    b.position.set(0.62, 0.38, -0.45);
    g.add(b, mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 14), M(0xf2a93b), 0.62, 0.35, -0.45));
    return g;
  },

  'teh-tarik'() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.62, 0.52, 0.05, 20), M(0xffffff)));
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.92, 16), M(0xc07a3f), 0, 0.5, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.38, 0.36, 0.24, 16), M(0xf6e3c4), 0, 1.06, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.95, 8), M(0xc98347), 0.02, 1.7, 0));
    const mug = mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.5, 16), M(0xc9ccd2), 0.2, 2.35, 0);
    mug.rotation.z = -0.9;
    g.add(mug);
    return g;
  },

  'kuih-lapis'() {
    const g = new THREE.Group();
    g.add(plate(0.9));
    const colors = [0xd8321f, 0xfbeede];
    for (let p = 0; p < 2; p++) {
      const piece = new THREE.Group();
      for (let i = 0; i < 9; i++) piece.add(mesh(new THREE.BoxGeometry(0.9, 0.09, 0.45), M(i === 8 ? 0xb31f12 : colors[i % 2]), 0, 0.11 + i * 0.09, 0));
      piece.position.set(p ? 0.25 : -0.2, p ? 0 : 0, p ? 0.28 : -0.2);
      piece.rotation.y = p ? -0.5 : 0.3;
      if (p) { piece.rotation.z = Math.PI / 2; piece.position.set(0.35, 0.5, 0.3); }
      g.add(piece);
    }
    return g;
  },

  satay() {
    const g = new THREE.Group();
    const p = plate(0.95);
    p.scale.x = 1.35;
    g.add(p);
    for (let i = 0; i < 3; i++) {
      const sk = new THREE.Group();
      const stick = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 6), M(0xd9b27c));
      stick.rotation.z = Math.PI / 2;
      sk.add(stick);
      for (let j = 0; j < 4; j++) {
        const meat = mesh(new THREE.DodecahedronGeometry(0.12), M(j % 2 ? 0x8a3b12 : 0xa2501d), -0.5 + j * 0.27, 0, 0);
        meat.rotation.set(rand(), rand(), rand());
        sk.add(meat);
      }
      sk.position.set(-0.15, 0.2, -0.35 + i * 0.32);
      sk.rotation.y = 0.15 - i * 0.12;
      g.add(sk);
    }
    const b = bowl(0.3, 0xffffff);
    b.position.set(0.95, 0.36, 0.2);
    g.add(b, mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 14), M(0xb86b2b), 0.95, 0.33, 0.2));
    return g;
  },

  cendol() {
    const g = new THREE.Group();
    const b = bowl(0.8, 0x2b59c3);
    b.position.y = 0.8;
    g.add(b, mesh(new THREE.CylinderGeometry(0.1, 0.25, 0.1, 12), M(0x2b59c3), 0, 0.05, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.77, 0.77, 0.02, 20), M(0xfff8e7), 0, 0.74, 0));
    g.add(mesh(new THREE.ConeGeometry(0.55, 0.85, 12), M(0xf1f7ff), 0, 1.16, 0));
    g.add(mesh(new THREE.ConeGeometry(0.34, 0.4, 12), M(0x5a2a0e), 0, 1.4, 0));
    for (let i = 0; i < 12; i++) {
      const a = rand() * Math.PI * 2, r = 0.45 + rand() * 0.2;
      const s = mesh(new THREE.CapsuleGeometry(0.045, 0.22, 3, 6), M(0x4cc552), Math.cos(a) * r, 0.78, Math.sin(a) * r);
      s.rotation.set(Math.PI / 2, 0, a + rand());
      g.add(s);
    }
    return g;
  },

  'char-kway-teow'() {
    const g = new THREE.Group();
    g.add(plate());
    const mound = new THREE.Group();
    for (let i = 0; i < 38; i++) {
      const a = rand() * Math.PI * 2, r = rand() * 0.6;
      const n = mesh(new THREE.BoxGeometry(0.55, 0.035, 0.11), M(i % 3 ? 0x9a6533 : 0x7a4a22), Math.cos(a) * r, 0.12 + rand() * 0.28 * (1 - r), Math.sin(a) * r);
      n.rotation.set(rand() * 0.6, rand() * Math.PI, rand() * 0.6);
      mound.add(n);
    }
    g.add(mound);
    for (let i = 0; i < 3; i++) {
      const prawn = mesh(new THREE.TorusGeometry(0.13, 0.06, 6, 10, Math.PI * 1.2), M(0xff7a3d), -0.3 + i * 0.3, 0.42, -0.1 + (i % 2) * 0.25);
      prawn.rotation.set(-1.2, 0, rand() * 3);
      g.add(prawn);
    }
    for (let i = 0; i < 8; i++) {
      const chive = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5), M(0x3a9a3a), -0.4 + rand() * 0.8, 0.4, -0.4 + rand() * 0.8);
      chive.rotation.set(Math.PI / 2, 0, rand() * 3);
      g.add(chive);
    }
    return g;
  },

  'asam-laksa'() {
    const g = new THREE.Group();
    const b = bowl(0.85, 0xfbf6ea);
    b.position.y = 0.85;
    g.add(b, mesh(new THREE.CylinderGeometry(0.12, 0.28, 0.1, 12), M(0xfbf6ea), 0, 0.05, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.02, 22), M(0xc0562b), 0, 0.72, 0));
    for (let i = 0; i < 4; i++) {
      const coil = mesh(new THREE.TorusGeometry(0.2 + i * 0.06, 0.035, 6, 20), M(0xffffff), -0.15 + rand() * 0.2, 0.75, -0.1 + rand() * 0.2);
      coil.rotation.x = Math.PI / 2;
      g.add(coil);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(mesh(new THREE.BoxGeometry(0.28, 0.05, 0.06), M(i % 2 ? 0x8bd66e : 0xffd23d), Math.cos(a) * 0.5, 0.77, Math.sin(a) * 0.5));
    }
    for (let i = 0; i < 3; i++) {
      const leaf = mesh(new THREE.SphereGeometry(0.12, 8, 6), M(0x2f9e44), 0.1 + i * 0.1, 0.8, 0.25 - i * 0.12);
      leaf.scale.set(1, 0.25, 0.6);
      g.add(leaf);
    }
    return g;
  },

  'ikan-bakar'() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2.3, 0.03, 1.2), M(0x2f8f46)));
    const body = mesh(new THREE.SphereGeometry(0.5, 16, 10), M(0xb5561f), 0, 0.22, 0);
    body.scale.set(1.7, 0.45, 0.6);
    g.add(body);
    const tail = mesh(new THREE.ConeGeometry(0.28, 0.45, 4), M(0x8f3f14), -1.0, 0.22, 0);
    tail.rotation.z = -Math.PI / 2;
    tail.scale.z = 0.3;
    g.add(tail);
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(0.04, 0.03, 0.5), M(0x2a1608), -0.35 + i * 0.22, 0.44, 0));
    g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), M(0xffffff), 0.62, 0.3, 0.2));
    const lime = mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0x8bd66e), 0.7, 0.02, -0.4);
    g.add(lime, mesh(new THREE.ConeGeometry(0.18, 0.2, 8), M(0xd8321f), -0.6, 0.12, 0.42));
    return g;
  },

  durian() {
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(0.75, 1);
    const body = mesh(geo, M(0x9bb040));
    body.scale.set(1, 1.15, 1);
    g.add(body);
    const pos = geo.attributes.position, seen = new Set(), up = new THREE.Vector3(0, 1, 0);
    const spike = new THREE.ConeGeometry(0.075, 0.24, 4);
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const key = v.toArray().map((n) => n.toFixed(2)).join();
      if (seen.has(key)) continue;
      seen.add(key);
      v.y *= 1.15;
      const s = new THREE.Mesh(spike, M(0x6f8a2a));
      s.position.copy(v).multiplyScalar(1.05);
      s.quaternion.setFromUnitVectors(up, v.clone().normalize());
      s.userData.noInk = true;
      g.add(s);
    }
    for (let i = 0; i < 2; i++) {
      const pod = mesh(new THREE.SphereGeometry(0.26, 10, 8), M(0xffd84d), -0.15 + i * 0.32, -0.1 + i * 0.12, 0.62);
      pod.scale.set(0.8, 1.2, 0.8);
      g.add(pod);
    }
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.35, 6), M(0x6b4a2b), 0, 1.0, 0));
    return g;
  },
};

/** Centre on origin and fit a box of `size`. */
function fit(inner, size = 1.8) {
  const box = new THREE.Box3().setFromObject(inner);
  const s = box.getSize(new THREE.Vector3());
  inner.position.sub(box.getCenter(new THREE.Vector3()));
  const outer = new THREE.Group();
  outer.add(inner);
  outer.scale.setScalar(size / Math.max(s.x, s.y, s.z));
  return outer;
}

export const buildDish = (id, size) => fit(inkify(DISH[id]()), size);

/* ---------- scroll props ---------- */
/* ---------- Petronas Twin Towers ----------
   Floor plan: two squares rotated 45° (an 8-point star) with the inner corners
   filled by arcs. The shaft steps back in tiers, every floor is a glass ribbon
   between steel bands, and fins run up the star points. */
function petronasShape(R) {
  const shape = new THREE.Shape();
  const inner = R * 0.765; // where the two squares cross
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, b = a + Math.PI / 8, c = a + Math.PI / 4;
    const p = [Math.cos(a) * R, Math.sin(a) * R];
    if (k === 0) shape.moveTo(...p); else shape.lineTo(...p);
    const i1 = [Math.cos(b - 0.12) * inner, Math.sin(b - 0.12) * inner];
    const i2 = [Math.cos(b + 0.12) * inner, Math.sin(b + 0.12) * inner];
    shape.lineTo(...i1);
    shape.quadraticCurveTo(Math.cos(b) * R * 0.9, Math.sin(b) * R * 0.9, ...i2);
    if (k === 7) shape.lineTo(Math.cos(c) * R, Math.sin(c) * R);
  }
  return shape;
}

const slab = (R, h) => {
  const g = new THREE.ExtrudeGeometry(petronasShape(R), { depth: h, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); // extrude upward
  return g;
};

const flat = (g) => (g.index ? g.toNonIndexed() : g);

export function buildTowers() {
  const steel = M(0xe4e8ee), glass = M(0x5f86a8), lit = M(0xffd23d, { emissive: 0xf5b700, emissiveIntensity: 0.6 });
  const FLOOR = 0.085;
  const tiers = [[0.62, 52], [0.57, 10], [0.52, 8], [0.46, 7], [0.39, 6], [0.31, 5]]; // [radius, floors]

  function tower(x, seedOffset) {
    const t = new THREE.Group();
    const glassParts = [], steelParts = [], litParts = [];
    let y = 0, rnd = seedOffset;
    const r01 = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);

    for (const [R, floors] of tiers) {
      const h = floors * FLOOR;
      glassParts.push(slab(R * 0.965, h).translate(0, y, 0));
      for (let f = 0; f <= floors; f++) {
        steelParts.push(slab(R, FLOOR * 0.3).translate(0, y + f * FLOOR - FLOOR * 0.15, 0));
        if (f < floors && r01() < 0.16) {
          const a = Math.floor(r01() * 16) * (Math.PI / 8) + Math.PI / 16;
          const win = new THREE.BoxGeometry(R * 0.28, FLOOR * 0.55, 0.01);
          win.rotateY(-a + Math.PI / 2);
          win.translate(Math.cos(a) * R * 0.87, y + f * FLOOR + FLOOR * 0.5, Math.sin(a) * R * 0.87);
          litParts.push(win);
        }
      }
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const fin = new THREE.BoxGeometry(0.035, h, 0.035);
        fin.translate(Math.cos(a) * R * 1.005, y + h / 2, -Math.sin(a) * R * 1.005);
        steelParts.push(fin);
      }
      steelParts.push(slab(R * 1.03, 0.05).translate(0, y + h, 0));
      y += h;
    }

    const ring = (r, yy, tube = 0.025) => new THREE.TorusGeometry(r, tube, 8, 32).rotateX(Math.PI / 2).translate(0, yy, 0);
    steelParts.push(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 16).translate(0, y + 0.15, 0));
    for (let i = 0; i < 4; i++) steelParts.push(ring(0.19 - i * 0.03, y + 0.35 + i * 0.12));
    steelParts.push(new THREE.CylinderGeometry(0.07, 0.16, 0.8, 16).translate(0, y + 0.7, 0));
    steelParts.push(new THREE.SphereGeometry(0.09, 16, 12).translate(0, y + 1.2, 0));
    steelParts.push(ring(0.11, y + 1.2, 0.012));
    steelParts.push(new THREE.CylinderGeometry(0.012, 0.04, 1.6, 8).translate(0, y + 2.0, 0));

    const merged = (parts, mat) => {
      const m = new THREE.Mesh(mergeGeometries(parts.map(flat)), mat);
      m.userData.noInk = true; // outlined below with a sideways-only shell
      return m;
    };
    const core = merged(glassParts, glass);
    // ink outline: thicken only horizontally, so the shell hugs the shaft instead of growing upward
    const outline = new THREE.Mesh(core.geometry, INK);
    outline.scale.set(1.09, 1, 1.09);
    outline.userData.noInk = true;
    core.add(outline);
    t.add(core, merged(steelParts, steel));
    if (litParts.length) t.add(merged(litParts, lit));
    t.position.x = x;
    return t;
  }

  const g = new THREE.Group();
  g.add(tower(-1.05, 11), tower(1.05, 29));

  // skybridge: double deck between floors 41–42 with an inverted-V support
  const bridgeY = 41 * FLOOR;
  g.add(mesh(new THREE.BoxGeometry(1.0, 0.16, 0.22), M(0xd8321f), 0, bridgeY, 0));
  g.add(mesh(new THREE.BoxGeometry(1.04, 0.03, 0.25), steel, 0, bridgeY + 0.09, 0));
  g.add(mesh(new THREE.BoxGeometry(1.04, 0.03, 0.25), steel, 0, bridgeY - 0.09, 0));
  const legTop = new THREE.Vector3(0, bridgeY - 0.1, 0);
  for (const sgn of [-1, 1]) {
    const foot = new THREE.Vector3(sgn * 0.5, 29 * FLOOR, 0);
    const leg = mesh(new THREE.CylinderGeometry(0.022, 0.03, legTop.distanceTo(foot), 8), steel);
    leg.position.copy(legTop).add(foot).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), foot.clone().sub(legTop).normalize());
    g.add(leg);
  }

  // KLCC park
  g.add(mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.12, 40), M(0x0e6b47), 0, -0.06, 0));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2;
    g.add(mesh(new THREE.SphereGeometry(0.13 + (i % 3) * 0.03, 12, 8), M(i % 2 ? 0x4cc552 : 0x2f8f46), Math.cos(a) * 2.0, 0.08, Math.sin(a) * 1.3 + 0.35));
  }
  return fit(inkify(g), 3.6);
}

export function buildTingkat() {
  const g = new THREE.Group();
  const colors = [0x0e6b47, 0xd8321f, 0xf5b700];
  const food = [0xffffff, 0xf08c2a, 0x7cc35a];
  const tiers = colors.map((c, i) => {
    const t = new THREE.Group();
    t.add(mesh(new THREE.CylinderGeometry(0.8, 0.78, 0.55, 28), M(c)));
    t.add(mesh(new THREE.CylinderGeometry(0.81, 0.81, 0.08, 28), M(0xfbf6ea), 0, 0.12, 0));
    t.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.02, 24), M(food[i]), 0, 0.28, 0));
    for (let k = 0; k < 5; k++) t.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), M(food[(i + 1) % 3]), Math.cos(k * 1.3) * 0.4, 0.3, Math.sin(k * 1.3) * 0.4));
    t.position.y = -0.6 + i * 0.58;
    g.add(t);
    return t;
  });
  const lid = new THREE.Group();
  const dome = mesh(new THREE.SphereGeometry(0.8, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf5b700));
  dome.scale.y = 0.35;
  lid.add(dome);
  const handle = mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 20, Math.PI), M(0xc9ccd2), 0, 0.25, 0);
  lid.add(handle);
  lid.position.y = 1.15;
  g.add(lid);
  tiers.push(lid);
  const root = fit(inkify(g), 2.6);
  root.userData.layers = tiers.map((t) => ({ obj: t, y: t.position.y }));
  return root;
}

export function buildCoin() {
  const g = new THREE.Group();
  const gold = M(0xf5b700), deep = M(0xc98a00);
  const disc = mesh(new THREE.CylinderGeometry(1, 1, 0.16, 40), gold);
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  const rim = mesh(new THREE.TorusGeometry(1, 0.07, 8, 40), deep);
  g.add(rim);
  for (const side of [1, -1]) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      const petal = mesh(new THREE.SphereGeometry(0.28, 10, 6), deep, Math.cos(a) * 0.33, Math.sin(a) * 0.33, side * 0.09);
      petal.scale.set(1, 0.6, 0.2);
      petal.rotation.z = a;
      g.add(petal);
    }
    g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), gold, 0, 0, side * 0.1));
  }
  return fit(inkify(g), 2.2);
}

export function buildHibiscus() {
  const g = new THREE.Group();
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 5) * Math.PI * 2;
    const petal = mesh(new THREE.SphereGeometry(0.6, 14, 8), M(0xd8321f), 0.55, 0, 0);
    petal.scale.set(1, 0.1, 0.75);
    const hinge = new THREE.Group();
    hinge.add(petal);
    pivot.add(hinge);
    g.add(pivot);
    petals.push(hinge);
  }
  g.add(mesh(new THREE.SphereGeometry(0.18, 10, 8), M(0x8a0f16), 0, 0.02, 0));
  const stamen = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), M(0xffd23d), 0.1, 0.5, 0);
  stamen.rotation.z = -0.25;
  g.add(stamen);
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), M(i % 2 ? 0xd8321f : 0xffd23d), 0.24 + Math.cos(i) * 0.08, 1.02, Math.sin(i * 2) * 0.08));
  for (const s of [-1, 1]) {
    const leaf = mesh(new THREE.SphereGeometry(0.5, 10, 6), M(0x2f8f46), s * 0.7, -0.15, -0.5);
    leaf.scale.set(1, 0.08, 0.45);
    leaf.rotation.y = s * 0.6;
    g.add(leaf);
  }
  const root = fit(inkify(g), 2.4);
  root.userData.petals = petals;
  return root;
}
