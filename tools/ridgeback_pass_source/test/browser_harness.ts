import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { loadRidgebackPass } from './rb/loadRidgebackPass';
const W = 1280, H = 720;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, W / H, 0.1, 1500);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const q = new URLSearchParams(location.search).get('q') ?? 'high';
const base = '/ridgeback_pass/';
(window as any).status_ = 'loading';
const t0 = performance.now();
loadRidgebackPass({ scene, world: null, RAPIER: null, renderer, quality: q as any,
  resolve: (p) => base + p, loadJSON: async (r: any) => (await fetch(r)).json(),
  loadGLB: (u) => new Promise((res, rej) => loader.load(u as string, res, undefined, rej)),
}).then((map) => {
  (window as any).map = map; (window as any).status_ = 'ready'; (window as any).loadMs = performance.now() - t0;
  const ray = new THREE.Raycaster(); const terr: THREE.Object3D[] = [];
  map.root.traverse((o) => { if ((o as THREE.Mesh).isMesh && (o.parent as any)?.isLOD) terr.push(o); if (o.name.startsWith('struct_') || o.name.startsWith('tunnel_')) terr.push(o); });
  const groundY = (x: number, z: number, from = 300) => { ray.set(new THREE.Vector3(x, from, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObjects(terr, false)[0]; return h ? h.point.y : 0; };
  (window as any).view = (x: number, n: number, lx: number, ln: number, eye = 1.65, abs = false, lookEye = 1.4, fov = 72, from = 300) => {
    const y = abs ? eye : groundY(x, -n, from) + eye; const ly = abs ? lookEye : groundY(lx, -ln, from) + lookEye;
    camera.fov = fov; camera.updateProjectionMatrix();
    camera.position.set(x, y, -n); camera.lookAt(lx, ly, -ln);
    map.update(camera, 3.0); renderer.render(scene, camera);
    const info = renderer.info.render; return { calls: info.calls, tris: info.triangles };
  };
}).catch((e) => { (window as any).status_ = 'error: ' + e?.message + ' ' + e?.stack; });

// ---------------- see-through hole detector ----------------
(window as any).holeScan = (nPos = 60) => {
  const map = (window as any).map; const keep = new Set<THREE.Object3D>();
  map.root.traverse((o: any) => { if ((o.parent && o.parent.isLOD) || o.name.startsWith('tunnel_') || o.name === 'backdrop' || o.name.startsWith('struct_')) keep.add(o); });
  const vis = new Map<THREE.Object3D, boolean>(); map.root.traverse((o: any) => { if (o.isMesh) { vis.set(o, o.visible); o.visible = keep.has(o) || keep.has(o.parent); } });
  const bg = scene.background, fog = scene.fog; scene.background = new THREE.Color(1, 0, 1); scene.fog = null;
  const SW = 320, SH = 180; renderer.setSize(SW, SH); camera.aspect = SW / SH; camera.updateProjectionMatrix();
  const sh0 = renderer.shadowMap.enabled; renderer.shadowMap.enabled = false;
  const gl = renderer.getContext(); const px = new Uint8Array(SW * SH * 4);
  const count = (lowerOnly: boolean) => { gl.readPixels(0, 0, SW, SH, gl.RGBA, gl.UNSIGNED_BYTE, px); let n = 0;
    for (let y = 0; y < (lowerOnly ? SH / 2 - 2 : SH); y++) for (let x = 0; x < SW; x++) { const i = (y * SW + x) * 4; if (px[i] > 240 && px[i + 1] < 15 && px[i + 2] > 240) n++; } return n; };
  const res: any = { topdown: {}, player: [] };
  // top-down for each terrain LOD level
  const ortho = new THREE.OrthographicCamera(-100, 100, 100 * SH / SW, -100 * SH / SW, 1, 600);
  for (const lvl of [0, 1]) {
    map.root.traverse((o: any) => { if (o.isLOD) { o.autoUpdate = false; o.levels.forEach((l: any, i: number) => (l.object.visible = i === lvl)); } });
    let tot = 0;
    for (const zc of [-55, 55]) { ortho.position.set(0, 300, zc); ortho.lookAt(0, 0, zc); ortho.top = 55; ortho.bottom = -55; ortho.left = -100; ortho.right = 100; ortho.updateProjectionMatrix();
      renderer.render(scene, ortho); tot += count(false); }
    res.topdown['lod' + lvl] = tot;
  }
  map.root.traverse((o: any) => { if (o.isLOD) { o.autoUpdate = true; } });
  // player-height views, looking level in 8 directions: any magenta below the horizon is a hole
  const sp = map.data.spawns; const pts = [...sp.T, ...sp.CT, ...sp.deathmatch].map((s: any) => s.p);
  let seed = 3; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  while (pts.length < nPos) { const s = pts[Math.floor(r() * 30) % pts.length]; pts.push([s[0] + (r() - 0.5) * 30, s[1], s[2] + (r() - 0.5) * 30]); }
  const ray = new THREE.Raycaster(); const terr: THREE.Object3D[] = []; map.root.traverse((o: any) => { if (o.isMesh && o.parent && o.parent.isLOD) terr.push(o); });
  for (const p of pts.slice(0, nPos)) {
    ray.set(new THREE.Vector3(p[0], 200, p[2]), new THREE.Vector3(0, -1, 0)); const hit = ray.intersectObjects(terr, false)[0]; if (!hit) continue;
    let worst = 0;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; camera.fov = 72; camera.updateProjectionMatrix();
      camera.position.set(p[0], hit.point.y + 1.65, p[2]); camera.lookAt(p[0] + Math.sin(a), hit.point.y + 1.65, p[2] + Math.cos(a));
      renderer.render(scene, camera); worst = Math.max(worst, count(true)); }
    res.player.push({ p: [Math.round(p[0]), Math.round(p[2])], holes: worst });
  }
  scene.background = bg; scene.fog = fog; vis.forEach((v, o) => (o.visible = v));
  renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.shadowMap.enabled = sh0;
  return res;
};
