// All 3D on the site: one module, loaded on demand. Every object is built from the brand:
// the logo's olive and gold, its stethoscope ring and heartbeat line.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type SceneKind = 'mark' | 'capsules' | 'field' | 'chestpiece' | 'house' | 'phone' | 'orbit' | 'calendar' | 'map';

const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* one smoothed pointer for every scene */
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
let pointerBound = false;
function bindPointer() {
  if (pointerBound) return; pointerBound = true;
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  const tick = () => { mouse.sx += (mouse.x - mouse.sx) * .05; mouse.sy += (mouse.y - mouse.sy) * .05; requestAnimationFrame(tick); };
  tick();
}

const MAT = {
  brass: () => new THREE.MeshPhysicalMaterial({ color: 0xD3A048, metalness: 1, roughness: .24 }),
  silver: () => new THREE.MeshPhysicalMaterial({ color: 0xE3E5E8, metalness: 1, roughness: .18 }),
  olive: () => new THREE.MeshPhysicalMaterial({ color: 0x34330F, metalness: .05, roughness: .36, clearcoat: 1, clearcoatRoughness: .16 }),
  moss: () => new THREE.MeshPhysicalMaterial({ color: 0x6A6528, metalness: 0, roughness: .3, clearcoat: .9, clearcoatRoughness: .2 }),
  linen: () => new THREE.MeshPhysicalMaterial({ color: 0xFBF6EC, metalness: 0, roughness: .42, clearcoat: .7, clearcoatRoughness: .25, sheen: .4, sheenColor: new THREE.Color(0xffffff) }),
  glow: () => new THREE.MeshStandardMaterial({ color: 0xF5D48F, emissive: 0xE8B85A, emissiveIntensity: 2.4 }),
};
const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 4);
const tube = (curve: THREE.Curve<THREE.Vector3>, r: number, mat: THREE.Material, seg = 64) => new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 20, false), mat);
const ball = (r: number, mat: THREE.Material, seg = 32) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat);
const rr = (w: number, h: number, r: number) => {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
};
const slab = (w: number, h: number, d: number, r: number, mat: THREE.Material, bev = .04) => {
  const g = new THREE.ExtrudeGeometry(rr(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 6, curveSegments: 18 });
  g.center(); return new THREE.Mesh(g, mat);
};
const textTex = (lines: [string, string, string, number, number?][], w = 512, h = 512) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!;
  for (const [txt, font, color, y, track = 0] of lines) {
    x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
    if ('letterSpacing' in x) (x as unknown as { letterSpacing: string }).letterSpacing = track + 'px';
    x.fillText(txt, w / 2, y);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
const fontsReady = () => (document.fonts ? Promise.all([document.fonts.ready]).catch(() => {}) : Promise.resolve());
const displayFont = () => getComputedStyle(document.documentElement).getPropertyValue('--font-fraunces').trim() || 'Georgia';
const sansFont = () => getComputedStyle(document.documentElement).getPropertyValue('--font-hanken').trim() || 'sans-serif';
const capsule = (top: THREE.Material, bottom: THREE.Material, band: THREE.Material) => {
  const g = new THREE.Group(), r = .46, h = .95;
  const hemi = (m: THREE.Material, up: boolean) => { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32, 0, Math.PI * 2, up ? 0 : Math.PI / 2, Math.PI / 2), m); me.position.y = up ? h / 2 : -h / 2; return me; };
  const cyl = (m: THREE.Material, y: number) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h / 2, 64, 1, true), m); me.position.y = y; return me; };
  g.add(hemi(top, true), cyl(top, h / 4), cyl(bottom, -h / 4), hemi(bottom, false));
  const seam = new THREE.Mesh(new THREE.TorusGeometry(r * 1.004, .014, 12, 96), band); seam.rotation.x = Math.PI / 2; g.add(seam);
  return g;
};
const sastHour = () => {
  const p = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  return +p.find((x) => x.type === 'hour')!.value % 24 + +p.find((x) => x.type === 'minute')!.value / 60;
};

interface Stage { scene: THREE.Scene; camera: THREE.PerspectiveCamera; el: HTMLElement; frame?: (t: number) => void; cleanup: (() => void)[] }

/** Mounts a scene into `el` (which holds a <canvas>). Returns a disposer. */
export function mount(el: HTMLElement, kind: SceneKind, opts: { delay?: number } = {}): () => void {
  const canvas = el.querySelector('canvas');
  if (!canvas) return () => {};
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch { el.style.display = 'none'; return () => {}; }
  bindPointer();
  const still = reduce();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = kind === 'field' ? 1.15 : 1.05;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), .04).texture;
  scene.environment = env;
  const key = new THREE.DirectionalLight(0xFFF1D6, 1.4); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xE8C988, .8); rim.position.set(-4, -1, -3); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100); camera.position.set(0, 0, 5);
  const st: Stage = { scene, camera, el, cleanup: [] };
  const t0 = performance.now();
  let visible = true, raf = 0, disposed = false;
  const render = () => { st.frame?.((performance.now() - t0) / 1000); renderer.render(scene, camera); };
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (still) render();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '120px' }); io.observe(el);
  const start = () => {
    if (disposed) return;
    el.classList.add('ready');
    if (still) { render(); return; }
    const loop = () => { raf = requestAnimationFrame(loop); if (visible) render(); };
    loop();
  };

  Promise.resolve(BUILD[kind](st)).then(() => setTimeout(start, opts.delay ?? 0));

  return () => {
    disposed = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); st.cleanup.forEach((f) => f());
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); });
    });
    env.dispose(); pm.dispose(); renderer.dispose(); renderer.forceContextLoss();
  };
}

/** Gentle float + mouse tilt shared by the small objects. */
function floaty(st: Stage, g: THREE.Object3D, o: { z?: number; spin?: number; tilt?: number; bob?: number; anim?: (t: number) => void } = {}) {
  st.camera.position.set(0, 0, o.z ?? 4.6);
  st.scene.add(g);
  const b = g.rotation.clone(), spin = o.spin ?? .45, tilt = o.tilt ?? .4, bob = o.bob ?? .06;
  st.frame = (t) => {
    g.rotation.y = b.y + Math.sin(t * spin) * .45 + mouse.sx * tilt;
    g.rotation.x = b.x + mouse.sy * tilt * .5;
    g.position.y = Math.sin(t * 1.15) * bob;
    o.anim?.(t);
  };
}

const BUILD: Record<SceneKind, (st: Stage) => void | Promise<void>> = {
  /* the logo mark, built in 3D */
  mark(st) {
    st.camera.position.set(0, 0, 5.4);
    const P = (x: number, y: number) => new THREE.Vector3((x - 60) / 44, -(y - 60) / 44, 0);
    const olive = MAT.olive(), brass = MAT.brass();
    const g = new THREE.Group(); st.scene.add(g);
    const R = 1, T = .078;
    const a1 = new THREE.Mesh(new THREE.TorusGeometry(R, T, 32, 180, Math.PI), olive); a1.rotation.z = Math.PI * 2 / 3; g.add(a1);
    const a2 = new THREE.Mesh(new THREE.TorusGeometry(R, T, 32, 120, Math.PI * 2 / 3), brass); a2.rotation.z = -Math.PI / 6; g.add(a2);
    for (const [deg, m] of [[120, olive], [300, olive], [90, brass], [330, brass]] as const) { const b = ball(T, m); const r = deg * Math.PI / 180; b.position.set(Math.cos(r) * R, Math.sin(r) * R, 0); g.add(b); }
    const cp = new THREE.Group(); cp.position.set(Math.cos(-Math.PI / 4) * R, Math.sin(-Math.PI / 4) * R, .02);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .13, 64), brass); disc.rotation.x = Math.PI / 2; cp.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.15, .022, 16, 64), MAT.linen()); ring.position.z = .07; cp.add(ring);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .02, 48), brass); cap.rotation.x = Math.PI / 2; cap.position.z = .07; cp.add(cap);
    g.add(cp);
    g.add(tube(new THREE.CubicBezierCurve3(P(14, 34), P(14, 52), P(18, 62), P(28, 64)), .045, brass), tube(new THREE.CubicBezierCurve3(P(42, 34), P(42, 52), P(38, 62), P(28, 64)), .045, brass));
    for (const p of [P(14, 32), P(42, 32)]) { const b = ball(.075, olive); b.position.copy(p); g.add(b); }
    const pts = [[28, 64], [44, 64], [49, 52], [54, 74], [59, 36], [64, 82], [68, 56], [71, 62], [104, 60]].map(([x, y]) => P(x, y));
    const ecg = new THREE.CurvePath<THREE.Vector3>(); for (let i = 0; i < pts.length - 1; i++) ecg.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    g.add(tube(ecg, .034, olive, 400));
    pts.slice(1, -1).forEach((p) => { const b = ball(.034, olive, 16); b.position.copy(p); g.add(b); });
    const pulse = ball(.06, MAT.glow()); g.add(pulse); pulse.add(new THREE.PointLight(0xF2C66B, 1.2, 1.4));
    g.rotation.set(.1, -.5, 0);
    st.frame = (t) => {
      const k = ease((t - .6) / 1.6);
      g.scale.setScalar(.55 + .45 * k);
      g.rotation.y = -.5 * (1 - k) + Math.sin(t * .45) * .22 + mouse.sx * .55;
      g.rotation.x = .1 + mouse.sy * .3;
      g.rotation.z = Math.sin(t * .3) * .04;
      g.position.y = Math.sin(t * 1.1) * .05;
      pulse.position.copy(ecg.getPointAt((t * .32) % 1));
    };
  },

  /* care plans: silver & gold capsules with orbiting beads */
  capsules(st) {
    st.camera.position.set(0, 0, 6.2); st.camera.fov = 32; st.camera.updateProjectionMatrix();
    const silver = capsule(MAT.silver(), MAT.linen(), MAT.silver());
    const gold = capsule(MAT.brass(), MAT.olive(), MAT.brass());
    silver.position.set(-1.05, .25, 0); silver.rotation.z = .55;
    gold.position.set(1, -.2, .4); gold.rotation.z = -.5; gold.scale.setScalar(1.12);
    st.scene.add(silver, gold);
    const beads: THREE.Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const b = ball(.05 + (i % 3) * .035, [MAT.linen, MAT.brass, MAT.moss, MAT.silver][i % 4]());
      b.userData = { a: i / 14 * Math.PI * 2, rr: 2.1 + (i % 3) * .25, y: Math.sin(i * 2.3) * .8, sp: .12 + (i % 5) * .02 };
      st.scene.add(b); beads.push(b);
    }
    const ol = ball(.2, MAT.moss(), 48); ol.scale.set(1, 1.35, 1); ol.position.set(.15, 1.25, -.6); st.scene.add(ol);
    let prog = 0;
    const onScroll = () => { const r = st.el.getBoundingClientRect(); prog = (innerHeight - r.top) / (innerHeight + r.height); };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    st.cleanup.push(() => removeEventListener('scroll', onScroll));
    st.frame = (t) => {
      silver.rotation.y = t * .5 + prog * 4; silver.rotation.z = .55 + Math.sin(t * .6) * .08 - prog * .5; silver.position.y = .25 + Math.sin(t * .9) * .1;
      gold.rotation.y = -t * .42 - prog * 4; gold.rotation.z = -.5 + Math.cos(t * .5) * .08 + prog * .5; gold.position.y = -.2 + Math.cos(t * .8) * .12;
      for (const b of beads) { const u = b.userData, a = u.a + t * u.sp; b.position.set(Math.cos(a) * u.rr, u.y + Math.sin(t + u.a) * .08, Math.sin(a) * u.rr * .6); }
      ol.position.y = 1.25 + Math.sin(t * 1.2) * .06; ol.rotation.z = Math.sin(t * .7) * .2;
      st.scene.rotation.y = mouse.sx * .25; st.scene.rotation.x = mouse.sy * .12;
    };
  },

  /* footer: a slow field of the practice's small things, kept right of the headline */
  field(st) {
    st.camera.position.set(0, 0, 7); st.camera.fov = 38; st.camera.updateProjectionMatrix();
    const field = new THREE.Group(); st.scene.add(field);
    const makers = [
      () => { const c = capsule(MAT.brass(), MAT.linen(), MAT.brass()); c.scale.setScalar(.32); return c; },
      () => { const c = capsule(MAT.silver(), MAT.moss(), MAT.silver()); c.scale.setScalar(.28); return c; },
      () => ball(.16, MAT.brass()),
      () => { const o = ball(.15, MAT.moss()); o.scale.set(1, 1.35, 1); return o; },
      () => new THREE.Mesh(new THREE.TorusGeometry(.17, .04, 20, 64), MAT.brass()),
      () => ball(.1, MAT.linen()),
    ];
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const hw = Math.tan(THREE.MathUtils.degToRad(19)) * 7 * (st.camera.aspect || 2.5);
    const items: THREE.Object3D[] = [];
    for (let i = 0; i < 14; i++) {
      const m = makers[i % makers.length]();
      m.position.set(hw * (.42 + rnd() * .52), (rnd() - .5) * 4, (rnd() - .7) * 2.4);
      m.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      m.userData = { y: m.position.y, sp: .2 + rnd() * .5, ph: rnd() * 6, rs: (rnd() - .5) * .6 };
      field.add(m); items.push(m);
    }
    st.frame = (t) => {
      for (const m of items) { const u = m.userData; m.position.y = u.y + Math.sin(t * u.sp + u.ph) * .18; m.rotation.x += u.rs * .01; m.rotation.y += u.rs * .014; }
      field.rotation.y = mouse.sx * .18; field.rotation.x = mouse.sy * .1;
    };
  },

  /* in person: a stethoscope chestpiece */
  chestpiece(st) {
    const g = new THREE.Group(), brass = MAT.brass();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.8, .84, .3, 72), brass); disc.rotation.x = Math.PI / 2; g.add(disc);
    const dia = new THREE.Mesh(new THREE.CylinderGeometry(.64, .64, .32, 72), MAT.linen()); dia.rotation.x = Math.PI / 2; dia.position.z = .01; g.add(dia);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.7, .055, 20, 96), brass); ring.position.z = .17; g.add(ring);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.11, .14, .55, 32), brass); stem.position.y = 1.05; g.add(stem);
    g.add(tube(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(.15, 1.85, -.2), new THREE.Vector3(.8, 2.15, -.45), new THREE.Vector3(1.5, 2.1, -.7)]), .12, MAT.olive(), 80));
    g.position.y = -.55; g.scale.setScalar(.82); g.rotation.set(.3, -.55, .12);
    const outer = new THREE.Group(); outer.add(g);
    floaty(st, outer, { z: 5 });
  },

  /* house call: a little house */
  house(st) {
    const g = new THREE.Group();
    const sh = new THREE.Shape(); sh.moveTo(-1, -1); sh.lineTo(1, -1); sh.lineTo(1, .3); sh.lineTo(0, 1.25); sh.lineTo(-1, .3); sh.closePath();
    const body = new THREE.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 5 }); body.translate(0, 0, -.55);
    g.add(new THREE.Mesh(body, MAT.linen()));
    const roof = MAT.olive();
    for (const [sx, rz] of [[-1, 1], [1, -1]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.62, .13, 1.36), roof); r.position.set(sx * .53, .82, 0); r.rotation.z = rz * .76; g.add(r); }
    const door = slab(.42, .72, .06, .2, MAT.brass(), .03); door.position.set(0, -.6, .62); g.add(door);
    const knob = ball(.035, MAT.olive(), 12); knob.position.set(.12, -.6, .68); g.add(knob);
    for (const x of [-.55, .55]) { const w = slab(.34, .34, .04, .05, MAT.olive(), .025); w.position.set(x, -.1, .61); g.add(w); }
    const ch = new THREE.Mesh(new THREE.BoxGeometry(.22, .5, .22), MAT.brass()); ch.position.set(.56, 1.0, -.25); g.add(ch);
    g.scale.setScalar(.82); g.rotation.set(.18, -.6, 0);
    floaty(st, g, { z: 5 });
  },

  /* virtual: a phone with a live heartbeat */
  phone(st) {
    const g = new THREE.Group();
    g.add(slab(1.25, 2.3, .14, .24, MAT.olive()));
    const scr = new THREE.Mesh(new THREE.ShapeGeometry(rr(1.06, 2.06, .16), 12), new THREE.MeshPhysicalMaterial({ color: 0x1E1D07, roughness: .12, clearcoat: 1, metalness: .2 })); scr.position.z = .112; g.add(scr);
    const pts = [[-.42, 0], [-.18, 0], [-.12, .18], [-.06, -.22], [0, .42], [.06, -.3], [.12, .06], [.18, 0], [.42, 0]].map(([x, y]) => new THREE.Vector3(x, y, .125));
    const path = new THREE.CurvePath<THREE.Vector3>(); for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    g.add(tube(path, .016, MAT.glow(), 160));
    const dot = ball(.035, MAT.glow(), 16); g.add(dot);
    const cam = ball(.035, MAT.brass(), 16); cam.position.set(0, .93, .12); g.add(cam);
    const pill = slab(.32, .06, .01, .03, MAT.brass(), .01); pill.position.set(0, -.88, .12); g.add(pill);
    g.scale.setScalar(.92); g.rotation.set(.12, .5, -.1);
    floaty(st, g, { z: 4.6, anim: (t) => dot.position.copy(path.getPointAt((t * .45) % 1)) });
  },

  /* hours: a 24-hour ring; gold beads are practice hours, the sun sits at the real SAST time */
  orbit(st) {
    const g = new THREE.Group(), R = 1.35;
    g.add(new THREE.Mesh(new THREE.TorusGeometry(R, .016, 12, 200), MAT.brass()));
    const ang = (h: number) => Math.PI / 2 - (h - 12) / 24 * Math.PI * 2;
    for (let h = 0; h < 24; h++) {
      const open = h >= 9 && h < 16;
      const b = ball(open ? .075 : .04, open ? MAT.brass() : MAT.silver(), 20);
      b.position.set(Math.cos(ang(h)) * R, Math.sin(ang(h)) * R, 0); g.add(b);
    }
    const hh = sastHour();
    const sun = ball(.17, MAT.glow(), 40); sun.position.set(Math.cos(ang(hh)) * R, Math.sin(ang(hh)) * R, 0); g.add(sun);
    sun.add(new THREE.PointLight(0xF2C66B, 2, 2.2));
    const moon = ball(.12, MAT.linen(), 32); moon.position.set(Math.cos(ang(hh) + Math.PI) * R * .62, Math.sin(ang(hh) + Math.PI) * R * .62, .1); g.add(moon);
    g.add(ball(.09, MAT.brass(), 24));
    const hand = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, R * .9, 8), MAT.brass());
    hand.position.set(Math.cos(ang(hh)) * R * .45, Math.sin(ang(hh)) * R * .45, 0); hand.rotation.z = ang(hh) - Math.PI / 2; g.add(hand);
    g.rotation.set(-.55, .25, 0);
    floaty(st, g, { z: 5.2, spin: .3, tilt: .3, bob: .04 });
  },

  /* booking: a desk calendar showing today */
  async calendar(st) {
    await fontsReady();
    const g = new THREE.Group(), now = new Date();
    g.add(slab(1.6, 1.75, .5, .2, MAT.linen()));
    const band = slab(1.6, .46, .52, .2, MAT.olive()); band.position.y = .645; g.add(band);
    for (const x of [-.45, .45]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.14, .035, 14, 48), MAT.brass()); r.rotation.y = Math.PI / 2; r.position.set(x, .9, 0); g.add(r); }
    const tz = { timeZone: 'Africa/Johannesburg' } as const;
    const month = now.toLocaleString('en-ZA', { ...tz, month: 'long' }).toUpperCase();
    const wd = now.toLocaleString('en-ZA', { ...tz, weekday: 'long' }).toUpperCase();
    const day = now.toLocaleString('en-ZA', { ...tz, day: 'numeric' });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .4), new THREE.MeshBasicMaterial({ map: textTex([[month, `600 54px ${sansFont()}`, '#E8C988', 64, 14]], 512, 128), transparent: true }));
    top.position.set(0, .64, .306); g.add(top);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.3), new THREE.MeshBasicMaterial({ map: textTex([[day, `300 300px ${displayFont()}`, '#31310F', 230], [wd, `600 40px ${sansFont()}`, '#8C6119', 430, 10]], 512, Math.round(512 * 1.3 / 1.5)), transparent: true }));
    face.position.set(0, -.2, .3); g.add(face);
    g.scale.setScalar(.95); g.rotation.set(.1, -.45, .06);
    floaty(st, g, { z: 4.8 });
  },

  /* locations: a tabletop map, viewed from the north (east on the left, matching the text columns) */
  async map(st) {
    st.camera.position.set(0, 5.5, 7.6); st.camera.lookAt(0, .25, 0);
    const g = new THREE.Group(); st.scene.add(g);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, .14, 128), new THREE.MeshPhysicalMaterial({ color: 0xEAE1CB, roughness: .85, clearcoat: .3 })));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.3, .03, 12, 200), MAT.brass()); rim.rotation.x = Math.PI / 2; rim.position.y = .07; g.add(rim);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0xCFC3A6, roughness: 1 });
    const V = (x: number, z: number) => new THREE.Vector3(x, .075, z);
    for (const p of [[V(-2.1, -.9), V(-.6, -.5), V(.8, -1), V(2.1, -.6)], [V(-1.9, .9), V(-.4, .3), V(.9, .6), V(2, 1)], [V(-.7, -2), V(-.3, -.4), V(-.5, .8), V(-.1, 2.1)], [V(.9, -1.9), V(1.2, -.2), V(.9, 1.1), V(1.3, 1.8)]])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 80, .022, 6), roadMat));
    const A = new THREE.Vector3(-1.2, .07, -.55), B = new THREE.Vector3(1.2, .07, .55);
    const pin = (p: THREE.Vector3, mat: THREE.Material) => {
      const pg = new THREE.Group(); pg.position.copy(p);
      const head = ball(.17, mat, 40); head.position.y = .66; pg.add(head);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.11, .5, 32), mat); cone.rotation.x = Math.PI; cone.position.y = .36; pg.add(cone);
      const dot = ball(.06, MAT.linen(), 16); dot.position.set(0, .66, .15); pg.add(dot);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), new THREE.MeshBasicMaterial({ color: 0x31310F, transparent: true, opacity: .18 })); sh.rotation.x = -Math.PI / 2; sh.position.y = .005; pg.add(sh);
      g.add(pg); return pg;
    };
    const pA = pin(A, MAT.brass()), pB = pin(B, MAT.olive());
    const arc = new THREE.QuadraticBezierCurve3(A.clone().setY(.1), new THREE.Vector3(0, 1.5, 0), B.clone().setY(.1));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(arc, 120, .02, 10), new THREE.MeshStandardMaterial({ color: 0xE8C988, emissive: 0xC69036, emissiveIntensity: .5 })));
    const pulse = ball(.05, MAT.glow(), 16); g.add(pulse);
    await fontsReady();
    for (const [p, label] of [[pA, 'ESTHER PARK'], [pB, 'FOURWAYS']] as const) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTex([[label, `600 46px ${sansFont()}`, '#31310F', 64, 12]], 512, 128), transparent: true, depthTest: false }));
      sp.scale.set(1.7, .425, 1); sp.position.y = 1.12; p.add(sp);
    }
    st.frame = (t) => {
      g.rotation.y = Math.sin(t * .2) * .18 + mouse.sx * .35;
      pA.position.y = A.y + Math.abs(Math.sin(t * 1.6)) * .08;
      pB.position.y = B.y + Math.abs(Math.sin(t * 1.6 + 1.3)) * .08;
      pulse.position.copy(arc.getPointAt((Math.sin(t * .6) + 1) / 2));
    };
  },
};
