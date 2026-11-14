import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync } from 'fs';
import { loadRidgebackPass } from './rb/loadRidgebackPass';
(globalThis as any).self = globalThis;
const PKG = '/home/claude/v3/pkg/ridgeback_pass/';
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const scene = new THREE.Scene();
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
console.warn = () => {};
const map = await loadRidgebackPass({ scene, world, RAPIER, atmosphere: false, resolve: (p) => PKG + p,
  loadJSON: async (r: any) => JSON.parse(readFileSync(r, 'utf8')),
  loadGLB: (ref: any) => new Promise((res, rej) => { const b = readFileSync(ref); loader.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej); }) });
world.step();
console.log('colliders', world.colliders.len());
const ray = (o: number[], d: number[], max = 500) => { const h = world.castRay(new RAPIER.Ray({ x: o[0], y: o[1], z: o[2] }, { x: d[0], y: d[1], z: d[2] }), max, true); return h ? h.timeOfImpact : null; };
let fails = 0; const check = (ok: boolean, msg: string) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + msg); };
for (const team of ['T', 'CT', 'deathmatch'] as const) {
  const n = map.data.spawns[team].length; let ok = 0;
  for (let i = 0; i < n; i++) { const s = map.getSpawn(team, i); const d = ray([s.position.x, s.position.y + 2, s.position.z], [0, -1, 0], 10);
    const head = ray([s.position.x, s.position.y + 0.3, s.position.z], [0, 1, 0], 1.6); if (d !== null && Math.abs(d - 2) < 0.6 && head === null) ok++; }
  check(ok === n, `spawns ${team}: ${ok}/${n} on solid ground with head clearance`);
}
const drop = (x: number, y: number, z: number) => {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).lockRotations());
  world.createCollider(RAPIER.ColliderDesc.capsule(0.55, 0.35), body); for (let i = 0; i < 240; i++) world.step();
  const p = body.translation(); world.removeRigidBody(body); return p.y;
};
const s0 = map.getSpawn('T', 0); const ry = drop(s0.position.x, s0.position.y + 3, s0.position.z);
check(Math.abs(ry - 0.9 - s0.position.y) < 0.4, `dropped player rests on terrain (y ${ry.toFixed(2)} vs ground ${s0.position.y.toFixed(2)})`);
// bridge deck: stand mid-span (gl z = -north)
const bridgeY = drop(0, 14, 11); check(bridgeY > 9.6 && bridgeY < 10.4, `player stands on bridge deck mid-span (capsule centre y ${bridgeY.toFixed(2)}, deck ~9.07)`);
// sawmill loft deck
const loftTop = ray([45.4, 30, -36.6], [0, -1, 0], 40); check(loftTop !== null && 30 - loftTop > 13, `sawmill loft deck is solid (top y ${(30 - (loftTop ?? 0)).toFixed(2)})`);
for (const [name, t] of Object.entries(map.data.secrets)) {
  const [a, b] = t.mouths; const nm = { B_tunnels: 'B Tunnels', smugglers_cave: "Smuggler's Cave", old_drift: 'Old Drift' }[name]!;
  const pts = map.data.callouts.find((c) => c.name === nm)!.points;
  for (const [mi, m] of t.mouths.entries()) {
    const near = mi === 0 ? pts : [...pts].reverse();
    const dir = new THREE.Vector3(near[1][0] - near[0][0], 0, near[1][1] - near[0][1]).normalize();
    const free = ray([m[0] - dir.x * 3, m[1] + 1.2, m[2] - dir.z * 3], [dir.x, 0, dir.z], 8);
    check(free === null, `${name} mouth ${mi}: entrance clear for 8 m ${free !== null ? '(blocked at ' + free.toFixed(1) + ')' : ''}`);
  }
  let minClear = 99;
  for (let i = 1; i < pts.length - 1; i++) { const [x, z] = pts[i]; const f = i / (pts.length - 1); const y = a[1] + (b[1] - a[1]) * f + 1.0;
    const dn = ray([x, y, z], [0, -1, 0], 4), up = ray([x, y, z], [0, 1, 0], 6); if (dn !== null && up !== null) minClear = Math.min(minClear, dn + up); }
  check(minClear > 3.0 && minClear < 99, `${name}: min floor-to-ceiling ${minClear.toFixed(2)} m`);
}
check(map.getBombSite(new THREE.Vector3(...map.data.bombSites.A.center)) === 'A' && map.getBombSite(new THREE.Vector3(...map.data.bombSites.B.center)) === 'B', 'bomb site zones A/B');
check(map.getCallout(new THREE.Vector3(0, 9, 11)) === 'Bridge', `callout on bridge = ${map.getCallout(new THREE.Vector3(0, 9, 11))}`);
check(map.getCallout(s0.position) === 'T Spawn', `callout at T spawn = ${map.getCallout(s0.position)}`);
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`);
