import * as THREE from 'three';

/* ---------- material + primitive helpers ---------- */
const M = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.65, metalness: 0, ...opts });

const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
};

const plate = (r = 1.05) => mesh(new THREE.CylinderGeometry(r, r * 0.82, 0.12, 24), M(0xf4efe6, { roughness: 0.35 }));
// lower hemisphere, rim at y = 0 — reads as a bowl
const bowl = (r, color) =>
  new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    M(color, { side: THREE.DoubleSide, roughness: 0.4 })
  );

// deterministic pseudo-random so every load looks the same
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* ---------- dishes, each built from primitives ---------- */
const builders = {
  'nasi-lemak'() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.02, 7), M(0x2f8f46), 0, -0.07, 0)); // banana leaf
    g.add(plate());
    const rice = mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xfdfbf5), -0.2, 0.06, 0);
    rice.scale.y = 1.15;
    g.add(rice);
    const white = mesh(new THREE.SphereGeometry(0.22, 12, 8), M(0xffffff), 0.5, 0.12, 0.3);
    white.scale.set(1, 0.5, 1.3);
    g.add(white, mesh(new THREE.SphereGeometry(0.11, 10, 8), M(0xffb300), 0.5, 0.2, 0.3));
    g.add(mesh(new THREE.ConeGeometry(0.24, 0.28, 8), M(0xd62d20), 0.45, 0.2, -0.38)); // sambal
    for (let i = 0; i < 3; i++) {
      const c = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 10), M(0x7fd36b), -0.55 + i * 0.16, 0.14, 0.55);
      c.rotation.x = Math.PI / 2.6;
      g.add(c);
    }
    for (let i = 0; i < 12; i++) {
      g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), M(0xb5763a), -0.1 + rand() * 0.4, 0.1, 0.5 + rand() * 0.3));
      const a = mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), M(0xe0a458), 0.1 + rand() * 0.4, 0.1, -0.1 + rand() * 0.3);
      a.rotation.y = rand() * Math.PI;
      g.add(a);
    }
    return g;
  },

  'roti-canai'() {
    const g = new THREE.Group();
    g.add(plate());
    const r1 = mesh(new THREE.CylinderGeometry(0.72, 0.76, 0.1, 9), M(0xe8b04f), -0.12, 0.1, 0.05);
    const r2 = mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.09, 8), M(0xd49033), -0.2, 0.2, 0.15);
    r2.rotation.set(0.12, 0.6, 0.08);
    g.add(r1, r2);
    const b = bowl(0.32, 0x9b5b34);
    b.position.set(0.62, 0.38, -0.45);
    g.add(b, mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 14), M(0xf2a93b), 0.62, 0.35, -0.45));
    return g;
  },

  'teh-tarik'() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.62, 0.52, 0.05, 20), M(0xffffff, { roughness: 0.3 }), 0, 0, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.92, 16), M(0xc07a3f), 0, 0.5, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.38, 0.36, 0.24, 16), M(0xf6e3c4), 0, 1.06, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.4, 0.31, 1.25, 18, 1, true),
      M(0xffffff, { transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide }), 0, 0.64, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.95, 8), M(0xc98347), 0.02, 1.7, 0)); // the "pull"
    const mug = mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.5, 16), M(0xc9ccd2, { metalness: 0.85, roughness: 0.25 }), 0.2, 2.35, 0);
    mug.rotation.z = -0.9;
    g.add(mug);
    return g;
  },

  satay() {
    const g = new THREE.Group();
    const p = plate(0.95);
    p.scale.x = 1.35;
    g.add(p);
    for (let i = 0; i < 3; i++) {
      const skewer = new THREE.Group();
      const stick = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 6), M(0xd9b27c));
      stick.rotation.z = Math.PI / 2;
      skewer.add(stick);
      for (let j = 0; j < 4; j++) {
        const meat = mesh(new THREE.DodecahedronGeometry(0.12), M(j % 2 ? 0x8a3b12 : 0xa2501d), -0.5 + j * 0.27, 0, 0);
        meat.scale.set(1.1, 0.85, 0.9);
        meat.rotation.set(rand(), rand(), rand());
        skewer.add(meat);
      }
      skewer.position.set(-0.15, 0.2, -0.35 + i * 0.32);
      skewer.rotation.y = 0.15 - i * 0.12;
      g.add(skewer);
    }
    const b = bowl(0.3, 0xeeeeee);
    b.position.set(0.95, 0.36, 0.2);
    g.add(b, mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 14), M(0xb86b2b), 0.95, 0.33, 0.2));
    return g;
  },

  cendol() {
    const g = new THREE.Group();
    const b = bowl(0.8, 0x2f6fb5);
    b.position.y = 0.8;
    g.add(b, mesh(new THREE.CylinderGeometry(0.1, 0.25, 0.1, 12), M(0x2f6fb5), 0, 0.05, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.77, 0.77, 0.02, 20), M(0xfff8e7), 0, 0.74, 0));
    g.add(mesh(new THREE.ConeGeometry(0.55, 0.85, 12), M(0xeef6ff, { roughness: 0.2 }), 0, 1.16, 0));
    g.add(mesh(new THREE.ConeGeometry(0.34, 0.4, 12), M(0x5a2a0e, { roughness: 0.2 }), 0, 1.4, 0));
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2, r = 0.45 + rand() * 0.2;
      const s = mesh(new THREE.CapsuleGeometry(0.04, 0.22, 3, 6), M(0x4cc552), Math.cos(a) * r, 0.78, Math.sin(a) * r);
      s.rotation.set(Math.PI / 2, 0, a + rand());
      g.add(s);
    }
    for (let i = 0; i < 6; i++) {
      const a = rand() * Math.PI * 2;
      g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), M(0x7a1f1f), Math.cos(a) * 0.62, 0.79, Math.sin(a) * 0.62));
    }
    return g;
  },

  durian() {
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(0.75, 1);
    const body = mesh(geo, M(0x8fa33a));
    body.scale.set(1, 1.15, 1);
    g.add(body);
    const pos = geo.attributes.position, seen = new Set(), up = new THREE.Vector3(0, 1, 0);
    const spikeGeo = new THREE.ConeGeometry(0.075, 0.24, 4), spikeMat = M(0x6f8a2a);
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const key = v.toArray().map((n) => n.toFixed(2)).join();
      if (seen.has(key)) continue;
      seen.add(key);
      v.y *= 1.15;
      const s = new THREE.Mesh(spikeGeo, spikeMat);
      s.position.copy(v).multiplyScalar(1.05);
      s.quaternion.setFromUnitVectors(up, v.clone().normalize());
      g.add(s);
    }
    for (let i = 0; i < 2; i++) {
      const pod = mesh(new THREE.SphereGeometry(0.26, 10, 8), M(0xffd84d, { roughness: 0.4 }), -0.15 + i * 0.32, -0.1 + i * 0.12, 0.62);
      pod.scale.set(0.8, 1.2, 0.8);
      g.add(pod);
    }
    const stem = mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.35, 6), M(0x6b4a2b), 0, 1.0, 0);
    g.add(stem);
    return g;
  },
};

/** Wrap a dish so it is centred on its origin and fits a ~1.8 unit box. */
function buildDish(id) {
  const inner = builders[id]();
  const box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  inner.position.sub(box.getCenter(new THREE.Vector3()));
  const outer = new THREE.Group();
  outer.add(inner);
  outer.scale.setScalar(1.8 / Math.max(size.x, size.y, size.z));
  return outer;
}

function lantern() {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.35, 12, 10), M(0xff2a1a, { emissive: 0xff2a1a, emissiveIntensity: 0.9 }));
  body.scale.y = 0.85;
  const cap = M(0xffc53d, { metalness: 0.6, roughness: 0.3 });
  g.add(body, mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10), cap, 0, 0.32, 0), mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10), cap, 0, -0.32, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.3, 5), M(0xffc53d), 0, -0.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 3, 3), M(0x333333), 0, 1.85, 0));
  return g;
}

/* ================================================================== */

export function initScene(canvas, { dishIds, reducedMotion, onCollect, onHover, reserveEl }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0c0a1d, 14, 32);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  const addLights = (s) => {
    s.add(new THREE.HemisphereLight(0xb8a8ff, 0x2a0f18, 1.1));
    const key = new THREE.DirectionalLight(0xffe0b0, 2.2);
    key.position.set(4, 8, 6);
    s.add(key);
    const rim = new THREE.DirectionalLight(0xff6a8a, 1.2);
    rim.position.set(-6, 2, -4);
    s.add(rim);
  };
  addLights(scene);
  const warm = new THREE.PointLight(0xff5a2a, 30, 18);
  warm.position.set(2, 4, 2);
  scene.add(warm);

  /* dishes */
  const dishes = dishIds.map((id, i) => {
    const d = buildDish(id);
    d.userData = { id, base: (i / dishIds.length) * Math.PI * 2, pop: 0, spin: 0, hover: 0, collected: false };
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 8, 48), M(0xffc53d, { emissive: 0xffb627, emissiveIntensity: 1.2 }));
    halo.rotation.x = Math.PI / 2;
    halo.visible = false;
    halo.scale.setScalar(1 / d.scale.x); // keep the ring the same world size for every dish
    d.add(halo);
    d.userData.halo = halo;
    scene.add(d);
    return d;
  });

  /* snapshots for the HTML cards — rendered once with the same renderer */
  const snapshots = {};
  {
    const studio = new THREE.Scene();
    addLights(studio);
    const cam = new THREE.PerspectiveCamera(35, 4 / 3, 0.1, 50);
    cam.position.set(0, 1.7, 3.6);
    cam.lookAt(0, 0, 0);
    renderer.setSize(480, 360, false);
    for (const d of dishes) {
      const clone = buildDish(d.userData.id);
      clone.rotation.y = -0.5;
      studio.add(clone);
      renderer.render(studio, cam);
      snapshots[d.userData.id] = canvas.toDataURL('image/png');
      studio.remove(clone);
    }
  }

  /* lanterns */
  const lanterns = [];
  const lanternRig = new THREE.Group();
  scene.add(lanternRig);
  for (let i = 0; i < 9; i++) {
    const l = lantern();
    l.position.set(-9 + i * 2.3 + rand(), 4 + rand() * 1.4, -5 - rand() * 3);
    l.userData.phase = rand() * Math.PI * 2;
    lanternRig.add(l);
    lanterns.push(l);
  }

  /* drifting steam / firefly particles */
  const COUNT = 1400;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(COUNT * 3), pCol = new Float32Array(COUNT * 3);
  const palette = [new THREE.Color(0xffb627), new THREE.Color(0xff6a8a), new THREE.Color(0xfff1d6)];
  for (let i = 0; i < COUNT; i++) {
    pPos.set([(rand() - 0.5) * 30, (rand() - 0.5) * 16, (rand() - 0.5) * 16 - 4], i * 3);
    pCol.set(palette[i % 3].toArray(), i * 3);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.06, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(particles);

  /* collect burst */
  const bursts = [];
  const burstGeo = new THREE.TetrahedronGeometry(0.08);
  function burst(origin) {
    for (let i = 0; i < 36; i++) {
      const m = new THREE.Mesh(burstGeo, M([0xffb627, 0xff4d3d, 0x3ddc84, 0xffffff][i % 4], { emissive: 0xff8a1f, emissiveIntensity: 0.4, transparent: true }));
      m.position.copy(origin);
      m.userData.v = new THREE.Vector3((rand() - 0.5) * 7, rand() * 6 + 1, (rand() - 0.5) * 7);
      m.userData.life = 1;
      scene.add(m);
      bursts.push(m);
    }
  }

  /* layout */
  const layout = { cx: 3.2, cy: 0, rx: 3.1, ry: 2.0, camZ: 11, lookX: 1.1, lookY: 0 };
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w < 760 && reserveEl) {
      // narrow screens: orbit in the free band below the copy
      const camZ = 15;
      const halfH = camZ * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), halfW = halfH * camera.aspect;
      const px = (2 * halfH) / h;
      const top = halfH - (reserveEl.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top + 16) * px;
      const bottom = -halfH;
      Object.assign(layout, {
        camZ, lookX: 0, lookY: 0,
        cx: 0, cy: (top + bottom) / 2,
        rx: Math.max(0.6, halfW - 1.05),
        ry: Math.max(0.2, Math.min(0.9, (top - bottom) / 2 - 1.1)),
      });
      lanternRig.position.y = halfH * 1.4 - 5.5; // keep lanterns above the headline on tall canvases
    } else {
      Object.assign(layout, { cx: 3.2, cy: 0, rx: 3.1, ry: 2.0, camZ: 11, lookX: 1.1, lookY: 0 });
      lanternRig.position.y = 0;
    }
    camera.position.z = layout.camZ;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas); // also catches late font loads changing the copy height

  /* pointer: parallax, hover, click */
  const ndc = new THREE.Vector2(9, 9), look = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  let hovered = null;

  const pick = () => {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(dishes, true)[0];
    if (!hit) return null;
    let o = hit.object;
    while (o && !o.userData.id) o = o.parent;
    return o;
  };
  const setNdc = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    return r;
  };
  canvas.addEventListener('pointermove', (e) => {
    const r = setNdc(e);
    const d = pick();
    hovered = d;
    canvas.style.cursor = d ? 'pointer' : 'default';
    onHover(d ? d.userData.id : null, e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; ndc.set(9, 9); onHover(null); });
  canvas.addEventListener('pointerdown', (e) => {
    setNdc(e);
    const d = pick();
    if (!d) return;
    d.userData.pop = 1;
    d.userData.spin = 1;
    if (!d.userData.collected) burst(d.getWorldPosition(new THREE.Vector3()));
    onCollect(d.userData.id);
  });

  /* visibility — stop rendering off-screen */
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  const speed = reducedMotion ? 0.15 : 1;
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime * speed;

    look.x += (ndc.x === 9 ? 0 : ndc.x - look.x) * 0.04;
    look.y += (ndc.y === 9 ? 0 : ndc.y - look.y) * 0.04;
    camera.position.x = look.x * 0.8;
    camera.position.y = layout.lookY + look.y * 0.5;
    camera.lookAt(layout.lookX, layout.lookY, 0);

    for (const d of dishes) {
      const u = d.userData;
      const a = u.base + t * 0.12;
      d.position.set(
        layout.cx + Math.cos(a) * layout.rx,
        layout.cy + Math.sin(a) * layout.ry + Math.sin(t * 1.3 + u.base) * 0.15,
        Math.sin(a) * 1.4
      );
      u.hover += ((hovered === d ? 1 : 0) - u.hover) * 0.15;
      u.pop = Math.max(0, u.pop - dt * 1.8);
      u.spin = Math.max(0, u.spin - dt * 0.9);
      const s = 1 + u.hover * 0.12 + Math.sin(u.pop * Math.PI) * 0.35;
      d.scale.setScalar(s * (d.userData.baseScale ??= d.scale.x));
      d.rotation.y += dt * (0.35 + u.spin * 12) * speed;
      d.rotation.x = 0.35 + Math.sin(t + u.base) * 0.08;
      if (u.halo.visible) u.halo.rotation.z += dt * 0.8;
    }

    for (const l of lanterns) {
      l.position.y += Math.sin(t * 0.9 + l.userData.phase) * 0.003;
      l.rotation.z = Math.sin(t * 0.7 + l.userData.phase) * 0.06;
    }
    warm.intensity = 28 + Math.sin(t * 3) * 4;

    const arr = pGeo.attributes.position.array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] += dt * 0.35 * speed;
      if (arr[i] > 8) arr[i] = -8;
    }
    pGeo.attributes.position.needsUpdate = true;

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.userData.v.y -= 9 * dt;
      b.position.addScaledVector(b.userData.v, dt);
      b.rotation.x += dt * 8;
      b.userData.life -= dt * 1.1;
      b.material.opacity = Math.max(0, b.userData.life);
      if (b.userData.life <= 0) { scene.remove(b); b.material.dispose(); bursts.splice(i, 1); }
    }

    renderer.render(scene, camera);
  }
  tick();

  return {
    snapshots,
    markCollected(id, collected = true) {
      const d = dishes.find((x) => x.userData.id === id);
      if (!d) return;
      d.userData.collected = collected;
      d.userData.halo.visible = collected;
    },
  };
}
