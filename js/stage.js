import * as THREE from 'three';
import { buildDish, buildTowers, buildTingkat, buildCoin, buildHibiscus } from './models.js';

/**
 * One fixed, full-viewport WebGL canvas. Each 3D prop is pinned to an empty
 * placeholder element ([data-prop]) in the page, so the layout stays in CSS
 * and the models follow it on scroll and resize. How far the placeholder has
 * travelled through the viewport (0 → 1) drives each prop's animation.
 */
export function initStage(canvas, { dishIds, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const lights = (s) => {
    s.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 6, 5);
    s.add(key);
  };

  /* ---- product shots for the UI, rendered once ---- */
  const snapshots = {};
  {
    const studio = new THREE.Scene();
    lights(studio);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    cam.position.set(0, 2.2, 3.8);
    cam.lookAt(0, 0, 0);
    renderer.setSize(360, 360, false);
    for (const id of dishIds) {
      const d = buildDish(id);
      d.rotation.y = -0.6;
      studio.add(d);
      renderer.render(studio, cam);
      snapshots[id] = canvas.toDataURL('image/png');
      studio.remove(d);
    }
  }

  const scene = new THREE.Scene();
  lights(scene);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 12;
  const DIST = 12;

  /* ---- props ---- */
  const factories = {
    towers: () => buildTowers(),
    tingkat: () => buildTingkat(),
    coin: () => buildCoin(),
    hibiscus: () => buildHibiscus(),
    susan: () => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.12, 40), new THREE.MeshToonMaterial({ color: 0xa0673a }));
      const ink = new THREE.Mesh(top.geometry, new THREE.MeshBasicMaterial({ color: 0x16130e, side: THREE.BackSide }));
      ink.scale.setScalar(1.03);
      top.add(ink);
      g.add(top);
      const ring = new THREE.Group();
      dishIds.slice(0, 8).forEach((id, i) => {
        const d = buildDish(id, 1.05);
        const a = (i / 8) * Math.PI * 2;
        d.position.set(Math.cos(a) * 1.55, 0.45, Math.sin(a) * 1.55);
        ring.add(d);
      });
      const centre = buildDish('durian', 1.2);
      centre.position.y = 0.7;
      ring.add(centre);
      g.add(ring);
      g.userData.ring = ring;
      g.rotation.x = 0.55;
      const holder = new THREE.Group();
      holder.add(g);
      holder.scale.setScalar(0.62);
      const outer = new THREE.Group();
      outer.add(holder);
      outer.userData.ring = ring;
      return outer;
    },
  };

  // rough world size of each prop at scale 1, so it fills its placeholder
  const NOMINAL = { towers: 3.3, tingkat: 3.6, coin: 2.3, hibiscus: 2.5, susan: 3.0 };
  const props = [...document.querySelectorAll('[data-prop]')].map((el) => {
    const obj = factories[el.dataset.prop]();
    obj.visible = false;
    scene.add(obj);
    return { el, obj, type: el.dataset.prop, base: obj.scale.x, p: 0, size: NOMINAL[el.dataset.prop] };
  });

  let W = 0, H = 0;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => { mouse.tx = e.clientX / W - 0.5; mouse.ty = e.clientY / H - 0.5; }, { passive: true });

  const ease = (t) => t * t * (3 - 2 * t);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const clock = new THREE.Clock();
  let paused = false;

  function tick() {
    requestAnimationFrame(tick);
    if (paused) return;
    const t = clock.getElapsedTime() * (reducedMotion ? 0 : 1);
    const worldPerPx = (2 * DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / H;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    let any = false;
    for (const pr of props) {
      const r = pr.el.getBoundingClientRect();
      const on = r.bottom > -100 && r.top < H + 100 && r.width > 0;
      pr.obj.visible = on;
      if (!on) continue;
      any = true;

      // pin to placeholder centre and size
      pr.obj.position.set((r.left + r.width / 2 - W / 2) * worldPerPx, -(r.top + r.height / 2 - H / 2) * worldPerPx, 0);
      const fitScale = (Math.min(r.width, r.height) * worldPerPx * 0.95) / pr.size;
      const p = clamp((H - r.top) / (H + r.height)); // 0 entering bottom → 1 leaving top
      pr.p += (p - pr.p) * 0.12; // smoothed
      const s = pr.p, o = pr.obj;
      const pop = ease(clamp(s * 3)); // grows in as it enters
      o.scale.setScalar(pr.base * fitScale * (0.6 + 0.4 * pop));

      switch (pr.type) {
        case 'towers':
          o.rotation.y = -0.5 + s * Math.PI * 1.4 + mouse.x * 0.4 + t * 0.05;
          o.rotation.x = 0.08 + mouse.y * 0.15;
          break;
        case 'tingkat': {
          const open = ease(clamp((s - 0.2) * 2.5));
          o.userData.layers.forEach((l, i) => { l.obj.position.y = l.y + (i - 1.5) * open * 0.75; l.obj.rotation.y = open * i * 0.4; });
          o.rotation.y = s * Math.PI + t * 0.1;
          o.rotation.x = 0.35;
          break;
        }
        case 'coin':
          o.rotation.y = s * Math.PI * 4;
          o.rotation.x = 0.3;
          o.rotation.z = Math.sin(t * 1.2) * 0.08;
          o.position.y += Math.sin(t * 2) * 0.08;
          break;
        case 'hibiscus': {
          const open = ease(clamp((s - 0.15) * 2));
          o.userData.petals.forEach((h) => { h.rotation.z = 1.2 - open * 1.45; });
          o.rotation.y = s * Math.PI * 1.5 + t * 0.15;
          o.rotation.x = 0.5;
          break;
        }
        case 'susan':
          o.userData.ring.rotation.y = s * Math.PI * 2.5 + t * 0.08;
          o.rotation.y = mouse.x * 0.3;
          break;
      }
    }
    if (any) renderer.render(scene, camera);
    else renderer.clear();
  }
  tick();

  return {
    snapshots,
    pause(v) { paused = v; if (v) renderer.clear(); },
  };
}
