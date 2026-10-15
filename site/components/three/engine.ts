// The site's one 3D picture: the Silver and Gold membership capsules, drawn once as a still image
// (no animation loop) in the logo's colours. Loaded only where it is shown.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type SceneKind = 'capsules';

const MAT = {
  brass: () => new THREE.MeshPhysicalMaterial({ color: 0xD3A048, metalness: 1, roughness: .24 }),
  silver: () => new THREE.MeshPhysicalMaterial({ color: 0xE3E5E8, metalness: 1, roughness: .18 }),
  olive: () => new THREE.MeshPhysicalMaterial({ color: 0x34330F, metalness: .05, roughness: .36, clearcoat: 1, clearcoatRoughness: .16 }),
  moss: () => new THREE.MeshPhysicalMaterial({ color: 0x6A6528, metalness: 0, roughness: .3, clearcoat: .9, clearcoatRoughness: .2 }),
  linen: () => new THREE.MeshPhysicalMaterial({ color: 0xFBF6EC, metalness: 0, roughness: .42, clearcoat: .7, clearcoatRoughness: .25 }),
};
const ball = (r: number, mat: THREE.Material) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 32), mat);
function capsule(top: THREE.Material, bottom: THREE.Material, band: THREE.Material) {
  const g = new THREE.Group(), r = .46, h = .95;
  const hemi = (m: THREE.Material, up: boolean) => { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32, 0, Math.PI * 2, up ? 0 : Math.PI / 2, Math.PI / 2), m); me.position.y = up ? h / 2 : -h / 2; return me; };
  const cyl = (m: THREE.Material, y: number) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h / 2, 64, 1, true), m); me.position.y = y; return me; };
  g.add(hemi(top, true), cyl(top, h / 4), cyl(bottom, -h / 4), hemi(bottom, false));
  const seam = new THREE.Mesh(new THREE.TorusGeometry(r * 1.004, .014, 12, 96), band); seam.rotation.x = Math.PI / 2; g.add(seam);
  return g;
}

/** Draws the scene into the <canvas> inside `el` and re-draws only when its size changes. Returns a disposer. */
export function mount(el: HTMLElement, _kind: SceneKind, opts: { delay?: number; still?: boolean } = {}): () => void {
  const canvas = el.querySelector('canvas');
  if (!canvas) return () => {};
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch { el.style.display = 'none'; return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), .04).texture;
  scene.environment = env;
  const key = new THREE.DirectionalLight(0xFFF1D6, 1.4); key.position.set(3, 4, 5); scene.add(key);
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100); camera.position.set(0, 0, 6.2);

  const silver = capsule(MAT.silver(), MAT.linen(), MAT.silver());
  silver.position.set(-1.05, .25, 0); silver.rotation.set(0, .9, .55);
  const gold = capsule(MAT.brass(), MAT.olive(), MAT.brass());
  gold.position.set(1, -.2, .4); gold.rotation.set(0, -.7, -.5); gold.scale.setScalar(1.12);
  scene.add(silver, gold);
  // a few still beads and one olive, as in the approved composition
  ([[-1.95, .05, .2, .09, MAT.silver], [-.15, .55, -.3, .06, MAT.moss], [.25, .1, .3, .04, MAT.linen], [1.85, .45, .1, .07, MAT.brass]] as const)
    .forEach(([x, y, z, r, m]) => { const b = ball(r, m()); b.position.set(x, y, z); scene.add(b); });
  const olive = ball(.2, MAT.moss()); olive.scale.set(1, 1.35, 1); olive.position.set(.15, 1.2, -.6); scene.add(olive);

  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const t = setTimeout(() => { resize(); el.classList.add('ready'); }, opts.delay ?? 0);

  return () => {
    clearTimeout(t); ro.disconnect();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
    });
    env.dispose(); pm.dispose(); renderer.dispose(); renderer.forceContextLoss();
  };
}
