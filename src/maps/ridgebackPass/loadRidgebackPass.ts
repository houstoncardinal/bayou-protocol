/**
 * Ridgeback Pass v4 loader for three.js + Rapier.
 *
 *   const map = await loadRidgebackPass({ scene, world, RAPIER, loadGLB, renderer, resolve });
 *   // every frame (REQUIRED - drives tree/rock level-of-detail, grass wind and the shadow camera):
 *   map.update(camera, elapsedSeconds);
 *
 * Coordinates: meters, +Y up, north = -Z. Playable area x,z in [-100, 100].
 */
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type RAPIER_NS from '@dimforge/rapier3d-compat';
import { RIDGEBACK_ASSETS, type AssetRef } from './manifest';
import { createTerrainMaterial } from './terrainMaterial';
import type { MapData, PropsData, Vec3 } from './types';

type Rapier = typeof RAPIER_NS;
export type Quality = 'high' | 'medium' | 'low';

export interface LoadOptions {
  scene: THREE.Scene;
  world: RAPIER_NS.World | null;
  RAPIER: Rapier | null;
  /** Load one GLB (same function you use for your characters; needs MeshoptDecoder + EXT_texture_webp support). */
  loadGLB: (ref: AssetRef) => Promise<GLTF>;
  /** Map a package-relative path (e.g. 'trees/fir_a_lod0.glb') to something loadGLB understands.
   *  Web/Vite: (p) => '/maps/ridgeback_pass/' + p  (files in public/maps/ridgeback_pass). Default: the Metro manifest. */
  resolve?: (path: string) => AssetRef;
  loadJSON?: <T>(ref: unknown) => Promise<T>;
  /** Recommended: enables sharp textures at grazing angles (anisotropy) and image-based lighting from the sky. */
  renderer?: THREE.WebGLRenderer;
  quality?: Quality;
  /** Overrides for the chosen preset's distances (tree0, tree1, rock0, decorFar, grassFar...). */
  preset?: Partial<Record<'tree0' | 'tree1' | 'rock0' | 'decorFar' | 'grassFar' | 'decorDensity' | 'grassDensity' | 'terrainLodDist', number>>;
  atmosphere?: boolean;               // sun, sky light, fog, sky background. Default true
  shadows?: boolean;                  // sun shadows. Default: quality === 'high'
  tunnelLights?: 'all' | 'few' | 'none';
  onProgress?: (done: number, total: number) => void;
}

export interface LoadedMap {
  root: THREE.Group;
  data: MapData;
  /** call every frame: grass wind, per-instance tree/rock level of detail, shadow camera follow */
  update(camera: THREE.Camera, timeSeconds: number): void;
  getSpawn(team: 'T' | 'CT' | 'deathmatch', index: number): { position: THREE.Vector3; yaw: number };
  getBombSite(p: THREE.Vector3): 'A' | 'B' | null;
  getCallout(p: THREE.Vector3): string | null;
  isOutOfBounds(p: THREE.Vector3): boolean;
  dispose(): void;
}

const QUALITY = {
  high:   { tree0: 36, tree1: 115, rock0: 40, decorFar: 45, grassFar: 55, decorDensity: 1.0, grassDensity: 1.0, terrainLodDist: 90, materials: 'materials/terrain_materials_hq.glb' },
  medium: { tree0: 26, tree1: 90,  rock0: 30, decorFar: 34, grassFar: 40, decorDensity: 0.7, grassDensity: 0.6, terrainLodDist: 70, materials: 'materials/terrain_materials_hq.glb' },
  low:    { tree0: 18, tree1: 65,  rock0: 20, decorFar: 24, grassFar: 26, decorDensity: 0.4, grassDensity: 0.3, terrainLodDist: 50, materials: 'materials/terrain_materials_lq.glb' },
} as const;
const DECOR = /^(fern_|dry_branches|rock_07|rock_09|stone_01|shrub_0[234]|namaqualand_rocks|root_cluster_02|single_root|bark_debris|pine_roots)/;

/** Meshopt GLBs store positions/normals as normalized ints with the scale on the node: convert before baking transforms. */
function toFloat(g: THREE.BufferGeometry) {
  for (const n of ['position', 'normal'] as const) {
    const a = g.getAttribute(n) as THREE.BufferAttribute | undefined;
    if (!a || (a.array instanceof Float32Array && !a.normalized)) continue;
    const f = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
    g.setAttribute(n, new THREE.BufferAttribute(f, 3));
  }
  return g;
}
type Part = { geometry: THREE.BufferGeometry; material: THREE.Material; name: string };
function parts(gltf: GLTF, nodeNames?: string[], offset?: Vec3): Part[] {
  gltf.scene.updateMatrixWorld(true);
  const out: Part[] = [];
  const want = nodeNames ? new Set(nodeNames.map((n) => n.replace(/[^\w]/g, ''))) : null;
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (want) { let p: THREE.Object3D | null = m, ok = false; while (p) { if (want.has(p.name.replace(/[^\w]/g, ''))) { ok = true; break; } p = p.parent; } if (!ok) return; }
    const g = toFloat(m.geometry.clone()); g.applyMatrix4(m.matrixWorld);
    if (offset) g.translate(offset[0], offset[1], offset[2]);
    g.computeBoundingSphere();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    out.push({ geometry: g, material: mats[0], name: m.name });
  });
  return out;
}
let maxAniso = 8;
function fixMaterial(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial;
  if ('metalness' in s && !s.metalnessMap) s.metalness = 0;     // never mirror-like: three's glTF default is metalness 1
  for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap'] as const) { const t = (s as any)[k] as THREE.Texture | null; if (t) { t.anisotropy = maxAniso; t.needsUpdate = true; } }
  if (s.alphaTest > 0 || s.transparent) foliage(s);
}
/** Alpha-tested foliage: keep coverage at distance (alpha boosted per mip level) so trees/grass never thin out or vanish. */
function foliage(s: THREE.MeshStandardMaterial) {
  s.transparent = false; s.depthWrite = true; if (!(s.alphaTest > 0)) s.alphaTest = 0.5;
  // v4 tree cards / billboards are real two-sided geometry with crown normals; scanned plants (ferns, shrubs) are single cards
  s.side = /needles|billboard/.test(s.name) ? THREE.FrontSide : THREE.DoubleSide;
  if ((s as any).__ridgebackFoliage) return; (s as any).__ridgebackFoliage = true;
  const prev = s.onBeforeCompile;
  s.onBeforeCompile = (sh, r) => {
    prev?.call(s, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', `
      #ifdef USE_MAP
      { vec2 tsz = vec2(textureSize(map, 0)); vec2 dx = dFdx(vMapUv * tsz), dy = dFdy(vMapUv * tsz);
        float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));
        diffuseColor.a *= 1.0 + mip * 0.28; }
      #endif
      if (diffuseColor.a < alphaTest) discard;`);
  };
  const key = s.customProgramCacheKey?.bind(s);
  s.customProgramCacheKey = () => (key ? key() : '') + '|rb-foliage';
  s.needsUpdate = true;
}

/** Instances of one asset split over several detail levels; re-bucketed (with frustum culling) when the camera moves/turns. */
const _sph = new THREE.Sphere();
class InstancedLOD {
  levels: { meshes: THREE.InstancedMesh[]; max: number }[] = [];
  mats: THREE.Matrix4[] = []; pos: THREE.Vector3[] = []; scl: number[] = []; rad = 1;
  constructor(public name: string, items: { p: number[]; q: number[]; s: number }[], levels: { parts: Part[]; max: number }[], root: THREE.Group, cast: boolean[]) {
    const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    for (const it of items) { P.set(it.p[0], it.p[1], it.p[2]); Q.set(it.q[0], it.q[1], it.q[2], it.q[3]); S.setScalar(it.s); this.mats.push(new THREE.Matrix4().compose(P, Q, S)); this.pos.push(P.clone()); this.scl.push(it.s); }
    for (const p of levels[0].parts) { const bs = p.geometry.boundingSphere!; this.rad = Math.max(this.rad, bs.center.length() + bs.radius); }
    const sphere = new THREE.Sphere(); new THREE.Box3().setFromPoints(this.pos).getBoundingSphere(sphere); sphere.radius += 25;
    levels.forEach((lv, li) => {
      const meshes = lv.parts.map((p) => {
        const im = new THREE.InstancedMesh(p.geometry, p.material, Math.max(1, items.length));
        im.count = 0; im.castShadow = cast[li] ?? false; im.receiveShadow = true; im.name = `${name}@lod${li}`;
        im.frustumCulled = true; im.boundingSphere = sphere.clone();
        root.add(im); return im;
      });
      this.levels.push({ meshes, max: lv.max });
    });
  }
  update(cam: THREE.Vector3, frustum: THREE.Frustum | null) {
    const counts = this.levels.map(() => 0);
    for (let i = 0; i < this.pos.length; i++) {
      const d = Math.hypot(this.pos[i].x - cam.x, this.pos[i].z - cam.z);
      let li = -1; for (let k = 0; k < this.levels.length; k++) if (d < this.levels[k].max) { li = k; break; }
      if (li < 0) continue;
      // off-screen instances are skipped, except close ones (their shadows still fall into view)
      if (frustum && d > 24) { _sph.center.copy(this.pos[i]); _sph.radius = this.rad * this.scl[i] + 2; if (!frustum.intersectsSphere(_sph)) continue; }
      const n = counts[li]++; for (const m of this.levels[li].meshes) m.setMatrixAt(n, this.mats[i]);
    }
    this.levels.forEach((lv, k) => lv.meshes.forEach((m) => { m.count = counts[k]; m.instanceMatrix.needsUpdate = true; }));
  }
}

export async function loadRidgebackPass(opts: LoadOptions): Promise<LoadedMap> {
  const { scene, world, RAPIER, loadGLB } = opts;
  // (opts.preset: the game's own distances over the chosen preset: its phone profile, 53b-ridgeback.js)
  const q = opts.quality ?? 'high'; const Q = { ...QUALITY[q], ...(opts.preset ?? {}) };
  if (opts.renderer) maxAniso = Math.min(16, opts.renderer.capabilities.getMaxAnisotropy());
  const resolve = opts.resolve ?? ((p: string) => (RIDGEBACK_ASSETS.files as Record<string, AssetRef>)[p]);
  const loadJSON = opts.loadJSON ?? (async <T,>(r: unknown) => (typeof r === 'string' ? await (await fetch(r)).json() : r) as T);
  const dataRef = (k: 'map' | 'props') => (opts.resolve ? resolve(`data/${k}.json`) : (RIDGEBACK_ASSETS.data as any)[k] ?? resolve(`data/${k}.json`));
  const data = await loadJSON<MapData>(dataRef('map'));
  const props = await loadJSON<PropsData>(dataRef('props'));
  if ((data.version ?? 0) < 4) console.warn('[ridgeback] data/map.json is not v4 - copy the whole v4 assets folder');
  const root = new THREE.Group(); root.name = 'RidgebackPass'; scene.add(root);
  const disposables: { dispose(): void }[] = [];
  const cache = new Map<string, Promise<GLTF>>();
  const files = new Set<string>(['tunnels/tunnels.glb', 'structures/structures.glb', 'environment/water_creek.glb', 'environment/backdrop.glb',
    'environment/sky.glb', 'grass/grass_clumps.glb', 'grass/grass_instances.glb', Q.materials, 'collision/terrain_collision.glb', 'collision/tunnels_collision.glb', 'collision/clip_walls.glb']);
  for (const c of data.chunks) { files.add(`terrain/terrain_${c.id}_lod0.glb`); files.add(`terrain/terrain_${c.id}_lod1.glb`); }
  for (const a of Object.values(data.assets)) { (a.lods ?? [a.file!]).forEach((f) => files.add(f)); if (a.lod1) files.add(a.lod1); }
  let done = 0; const total = files.size;
  const glb = (p: string) => {
    if (!cache.has(p)) cache.set(p, loadGLB(resolve(p)).then((g) => { opts.onProgress?.(++done, total); return g; }));
    return cache.get(p)!;
  };
  [...files].forEach((f) => glb(f).catch(() => undefined));            // start every download at once

  // ---------------- terrain ----------------
  const matGLTF = await glb(Q.materials);
  let carrier: THREE.MeshStandardMaterial | null = null; let carrierC: THREE.Texture | null = null;
  matGLTF.scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const mm = m.material as THREE.MeshStandardMaterial;
    if (m.name.includes('splatC') || mm.name?.includes('splatC')) carrierC = mm.map; else carrier = mm; });
  const cm = carrier as unknown as THREE.MeshStandardMaterial;
  const splatB = cm?.roughnessMap ?? cm?.metalnessMap ?? null;
  const texturesOk = !!(cm && cm.map && cm.normalMap && cm.aoMap && splatB);
  if (!texturesOk) console.warn('[ridgeback] terrain textures missing (does your GLB loader decode WebP?) - using a plain fallback material');
  const tm = data.terrainMaterial;
  const terrainMat = texturesOk
    ? createTerrainMaterial({ albedoAtlas: cm.map!, normalAtlas: cm.normalMap!, splatA: cm.aoMap!, splatB: splatB!, splatC: carrierC },
        { tileMeters: tm.tileMeters, padFraction: tm.padFraction, atlasCols: tm.atlasCols, atlasRows: tm.atlasRows, mapMin: tm.mapMin, mapSize: tm.mapSize, quality: q, anisotropy: maxAniso })
    : new THREE.MeshStandardMaterial({ color: 0x6b6f52, roughness: 1, metalness: 0 });
  disposables.push(terrainMat);
  await Promise.all(data.chunks.map(async (c) => {
    const [g0, g1] = await Promise.all([glb(`terrain/terrain_${c.id}_lod0.glb`), glb(`terrain/terrain_${c.id}_lod1.glb`)]);
    const lod = new THREE.LOD(); lod.name = `terrain_${c.id}`;
    const hi = new THREE.Mesh(parts(g0)[0].geometry, terrainMat); hi.receiveShadow = true; hi.castShadow = true;
    const lo = new THREE.Mesh(parts(g1)[0].geometry, terrainMat); lo.receiveShadow = true;
    lod.addLevel(hi, 0); lod.addLevel(lo, Q.terrainLodDist);
    root.add(lod); disposables.push(hi.geometry, lo.geometry);
  }));

  // ---------------- static scenery ----------------
  for (const f of ['tunnels/tunnels.glb', 'structures/structures.glb']) {
    const g = await glb(f);
    g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { fixMaterial(m.material as THREE.Material); m.castShadow = true; m.receiveShadow = true; } });
    root.add(g.scene);
  }
  { // distant mountains: lighting + aerial haze are baked into the texture -> unlit, identical in every engine setup
    const g = await glb('environment/backdrop.glb');
    g.scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return;
      let near = false; for (let p: THREE.Object3D | null = m; p; p = p.parent) if (p.name.includes('backdrop_near')) near = true;
      m.frustumCulled = false; m.castShadow = false;
      if (near && texturesOk) { m.material = terrainMat; m.receiveShadow = true; return; }   // ridge just outside the map: same rock shader as the playfield
      const src = m.material as THREE.MeshStandardMaterial; const map = src.map; if (map) { map.anisotropy = maxAniso; map.colorSpace = THREE.SRGBColorSpace; }
      m.material = new THREE.MeshBasicMaterial({ map, fog: false }); m.receiveShadow = false; m.renderOrder = -1; });
    root.add(g.scene);
  }
  const water = await glb('environment/water_creek.glb');
  water.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mt = m.material as THREE.MeshStandardMaterial; mt.transparent = true; mt.depthWrite = false; mt.metalness = 0; mt.roughness = 0.06; m.renderOrder = 2; } });
  root.add(water.scene);

  // ---------------- instanced trees, rocks & props: per-instance level of detail ----------------
  const shadowsOn = opts.shadows ?? q === 'high';
  const lods: InstancedLOD[] = [];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  await Promise.all(Object.entries(props).map(async ([asset, list0]) => {
    const info = data.assets[asset]; if (!info || !list0.length) return;
    const isDecor = DECOR.test(asset);
    const list = isDecor && Q.decorDensity < 1 ? list0.filter(() => rnd() < Q.decorDensity) : list0;
    const prep = (ps: Part[]) => { ps.forEach((p) => fixMaterial(p.material)); return ps; };
    if (info.kind === 'tree') {
      const [l0, l1, bb] = await Promise.all(info.lods!.map((f) => glb(f)));
      lods.push(new InstancedLOD(asset, list, [{ parts: prep(parts(l0)), max: Q.tree0 }, { parts: prep(parts(l1)), max: Q.tree1 }, { parts: prep(parts(bb)), max: 1e9 }],
        root, [shadowsOn, false, false]));
    } else {
      const near = prep(parts(await glb(info.file!), info.nodes, info.offset));
      if (isDecor) lods.push(new InstancedLOD(asset, list, [{ parts: near, max: Q.decorFar }], root, [false]));
      else if (info.lod1) {
        const far = prep(parts(await glb(info.lod1), info.nodes, info.offset));
        lods.push(new InstancedLOD(asset, list, [{ parts: near, max: Q.rock0 }, { parts: far, max: 1e9 }], root, [shadowsOn, false]));
      } else lods.push(new InstancedLOD(asset, list, [{ parts: near, max: 1e9 }], root, [shadowsOn]));
    }
  }));

  // ---------------- grass: tufts rendered from the Poly Haven grass scans, instanced crossed cards, wind + distance fade ----
  const grassUniforms = { uTime: { value: 0 }, uFar: { value: Q.grassFar } };
  const clumps = parts(await glb('grass/grass_clumps.glb'));
  const gmat = (clumps[0].material as THREE.MeshStandardMaterial).clone();
  gmat.side = THREE.DoubleSide; gmat.alphaTest = 0.5; gmat.transparent = false; gmat.metalness = 0; gmat.roughness = 0.95;
  if (gmat.map) gmat.map.anisotropy = maxAniso;
  gmat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = grassUniforms.uTime; sh.uniforms.uFar = grassUniforms.uFar;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uFar;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 gw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sway = sin(uTime * 1.6 + gw.x * 0.35 + gw.z * 0.27) * 0.5 + sin(uTime * 2.9 + gw.x * 0.9) * 0.25;
      transformed.x += sway * 0.07 * position.y * position.y * 2.0; transformed.z += sway * 0.04 * position.y * position.y * 2.0;
      float gd = length((modelMatrix * gw).xz - cameraPosition.xz);
      transformed *= 1.0 - smoothstep(uFar - 14.0, uFar, gd);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', `
      { vec2 tsz = vec2(textureSize(map, 0)); vec2 dx = dFdx(vMapUv * tsz), dy = dFdy(vMapUv * tsz);
        float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy)))); diffuseColor.a *= 1.0 + mip * 0.3; }
      if (diffuseColor.a < alphaTest) discard;`);
  };
  gmat.customProgramCacheKey = () => 'ridgeback-grass-v4';
  disposables.push(gmat);
  const grassInst = await glb('grass/grass_instances.glb');
  const grassGroups: { c: THREE.Vector3; meshes: THREE.Object3D[] }[] = [];
  const P = new THREE.Vector3(), Qt = new THREE.Quaternion(), S = new THREE.Vector3(), M = new THREE.Matrix4(), Y = new THREE.Vector3(0, 1, 0);
  grassInst.scene.traverse((o) => {
    const pts = o as THREE.Points; if (!(pts as any).isPoints && !(o as THREE.Mesh).isMesh) return;
    const g = pts.geometry; const pos = g.getAttribute('position'); const at = g.getAttribute('_grass');
    if (!pos || !at || !pos.count) return;
    const byVar: number[][] = clumps.map(() => []);
    for (let i = 0; i < pos.count; i++) { if (Q.grassDensity < 1 && rnd() > Q.grassDensity) continue; byVar[Math.round(at.getZ(i)) % clumps.length].push(i); }
    const meshes: THREE.Object3D[] = []; const ctr = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 37) ctr.add(P.set(pos.getX(i), 0, pos.getZ(i))); ctr.divideScalar(Math.ceil(pos.count / 37));
    byVar.forEach((idx, v) => {
      if (!idx.length) return;
      const im = new THREE.InstancedMesh(clumps[v].geometry, gmat, idx.length);
      idx.forEach((i, n) => { P.set(pos.getX(i), pos.getY(i), pos.getZ(i)); Qt.setFromAxisAngle(Y, at.getX(i)); S.setScalar(at.getY(i)); im.setMatrixAt(n, M.compose(P, Qt, S)); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.receiveShadow = true; im.name = `grass_${pts.name}_${v}`;
      root.add(im); meshes.push(im);
    });
    grassGroups.push({ c: ctr, meshes });
  });

  // ---------------- atmosphere ----------------
  let sun: THREE.DirectionalLight | null = null; const sunDir = new THREE.Vector3(...data.sun.direction).normalize();
  if (opts.atmosphere ?? true) {
    sun = new THREE.DirectionalLight(data.sun.color, data.sun.intensity);
    sun.position.copy(sunDir.clone().multiplyScalar(160)); sun.target.position.set(0, 0, 0);
    if (shadowsOn) {
      sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
      const c = sun.shadow.camera as THREE.OrthographicCamera; c.left = -55; c.right = 55; c.top = 55; c.bottom = -55; c.near = 1; c.far = 360;
      sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5;
    }
    root.add(sun, sun.target, new THREE.HemisphereLight('#cfdcec', '#5a5a44', 0.8));
    scene.fog = new THREE.Fog(data.fog.color, data.fog.near, data.fog.far);
    const sky = await glb('environment/sky.glb');
    sky.scene.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      const t = (m.material as THREE.MeshStandardMaterial).emissiveMap; if (!t) return;
      t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
      scene.background = t;
      if (opts.renderer) { const pm = new THREE.PMREMGenerator(opts.renderer); const env = pm.fromEquirectangular(t).texture; scene.environment = env; (scene as any).environmentIntensity = 0.55; disposables.push(env, pm); }
    });
  }
  const lampsMode = opts.tunnelLights ?? (q === 'low' ? 'few' : 'all');
  if (lampsMode !== 'none') {
    const ls = lampsMode === 'all' ? data.lights : data.lights.filter((_, i) => i % 3 === 0);
    for (const l of ls) { const pl = new THREE.PointLight(l.color, l.intensity, l.distance, 1.8); pl.position.set(l.p[0], l.p[1], l.p[2]); root.add(pl); }
  }

  // ---------------- physics (terrain, tunnels, invisible player-clip walls, props) ----------------
  if (world && RAPIER) {
    const addTri = (g: GLTF) => {
      for (const p of parts(g)) {
        const pos = p.geometry.getAttribute('position'); const v = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) { v[i * 3] = pos.getX(i); v[i * 3 + 1] = pos.getY(i); v[i * 3 + 2] = pos.getZ(i); }
        const ix = p.geometry.getIndex(); const ind = ix ? new Uint32Array(ix.array as ArrayLike<number>) : Uint32Array.from({ length: pos.count }, (_, i) => i);
        world.createCollider(RAPIER.ColliderDesc.trimesh(v, ind)); p.geometry.dispose();
      }
    };
    addTri(await glb('collision/terrain_collision.glb')); addTri(await glb('collision/tunnels_collision.glb')); addTri(await glb('collision/clip_walls.glb'));
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), qq = new THREE.Quaternion();
    for (const c of data.colliders) {
      let desc: RAPIER_NS.ColliderDesc | null = null;
      if (c.type === 'capsule') desc = RAPIER.ColliderDesc.capsule(c.halfHeight, c.radius).setTranslation(c.p[0], c.p[1], c.p[2]);
      else if (c.type === 'capsule_axis') {
        tmpA.set(...c.a); tmpB.set(...c.b); const len = tmpA.distanceTo(tmpB);
        qq.setFromUnitVectors(up, tmpB.clone().sub(tmpA).normalize());
        desc = RAPIER.ColliderDesc.capsule(len / 2, c.radius).setTranslation((c.a[0] + c.b[0]) / 2, (c.a[1] + c.b[1]) / 2, (c.a[2] + c.b[2]) / 2)
          .setRotation({ x: qq.x, y: qq.y, z: qq.z, w: qq.w });
      } else if (c.type === 'box') desc = RAPIER.ColliderDesc.cuboid(c.half[0], c.half[1], c.half[2]).setTranslation(c.p[0], c.p[1], c.p[2]).setRotation({ x: c.q[0], y: c.q[1], z: c.q[2], w: c.q[3] });
      else if (c.type === 'hull') {
        const pts = data.hulls[c.asset]; if (!pts) continue;
        const arr = new Float32Array(pts.length * 3); pts.forEach((p, i) => { arr[i * 3] = p[0] * c.s; arr[i * 3 + 1] = p[1] * c.s; arr[i * 3 + 2] = p[2] * c.s; });
        desc = RAPIER.ColliderDesc.convexHull(arr); desc?.setTranslation(c.p[0], c.p[1], c.p[2]).setRotation({ x: c.q[0], y: c.q[1], z: c.q[2], w: c.q[3] });
      }
      if (desc) world.createCollider(desc);
    }
  }

  // ---------------- per-frame ----------------
  const camPos = new THREE.Vector3();
  for (const l of lods) l.update(new THREE.Vector3(0, 0, 0), null);
  const lastPos = new THREE.Vector3(1e9, 0, 0), lastDir = new THREE.Vector3(), camDir = new THREE.Vector3();
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4();
  const update = (camera: THREE.Camera, t: number) => {
    grassUniforms.uTime.value = t;
    camera.getWorldPosition(camPos);
    if (sun && sun.castShadow) {          // keep the shadow map centred on the player: sharp shadows, few casters
      const snap = 4; const cx = Math.round(camPos.x / snap) * snap, cz = Math.round(camPos.z / snap) * snap;
      sun.target.position.set(cx, camPos.y, cz); sun.position.set(cx + sunDir.x * 170, camPos.y + sunDir.y * 170, cz + sunDir.z * 170);
      sun.target.updateMatrixWorld();
    }
    camera.getWorldDirection(camDir);
    if (lastPos.distanceToSquared(camPos) > 1 || camDir.dot(lastDir) < 0.9975) {          // moved 1 m or turned ~4 deg
      lastPos.copy(camPos); lastDir.copy(camDir);
      camera.updateMatrixWorld(); pv.multiplyMatrices((camera as THREE.PerspectiveCamera).projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pv);
      for (const l of lods) l.update(camPos, (camera as THREE.PerspectiveCamera).isPerspectiveCamera ? frustum : null);
    }
    for (const g of grassGroups) { const on = Math.hypot(camPos.x - g.c.x, camPos.z - g.c.z) < Q.grassFar + 36; g.meshes.forEach((m) => (m.visible = on)); }
  };

  const v2 = new THREE.Vector2();
  return {
    root, data, update,
    getSpawn(team, index) { const l = data.spawns[team]; const s = l[((index % l.length) + l.length) % l.length]; return { position: new THREE.Vector3(...s.p), yaw: s.yaw }; },
    getBombSite(p) {
      for (const k of ['A', 'B'] as const) { const s = data.bombSites[k]; if (Math.hypot(p.x - s.center[0], p.z - s.center[2]) <= s.radius && Math.abs(p.y - s.center[1]) <= s.height) return k; }
      return null;
    },
    getCallout(p) {
      const PRIORITY = new Set(['Bridge', 'B Tunnels', "Smuggler's Cave", 'Old Drift']);
      for (const pass of [true, false]) {
      let best: string | null = null, bestD = Infinity;
      for (const c of data.callouts) { if (PRIORITY.has(c.name) !== pass) continue; for (let i = 0; i < c.points.length - 1; i++) {
        const [ax, az] = c.points[i], [bx, bz] = c.points[i + 1]; const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const tt = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / L2));
        const d = v2.set(p.x - (ax + tt * dx), p.z - (az + tt * dz)).length() - (c.widths[i] + tt * (c.widths[i + 1] - c.widths[i])) / 2;
        if (d < bestD - 0.01) { bestD = d; best = c.name; }
      } }
      if (pass && bestD <= 0.5) return best;
      if (!pass) return bestD < 5 ? best : null;
      }
      return null;
    },
    isOutOfBounds(p) { const b = data.bounds; return p.y < b.killY || p.x < b.min[0] || p.x > b.max[0] || p.z < b.min[2] || p.z > b.max[2]; },
    dispose() {
      scene.remove(root); scene.fog = null; scene.background = null; scene.environment = null;
      root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry?.dispose(); });
      disposables.forEach((d) => d.dispose());
    },
  };
}
export type { Vec3 };
