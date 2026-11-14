// Ridgeback Pass: copy the map package into the game and build the data the engine needs from it.
//
//   node tools/build-ridgeback.mjs
//
// Source: assets-src/maps/ridgeback_pass/ (the package as delivered: terrain, collision, tunnels, props,
// environment, data). Output:
//   public/game/maps/ridgeback_pass/...   the same files, served to the game
//   src/mods/53a-ridgeback-data.js         what the map needs synchronously when a match starts:
//     - the terrain's top surface as a 1 m height grid (from collision/terrain_collision.glb), for the bots'
//       walk grid, spawn placement and the minimap
//     - the tunnel floors as 0.5 m cells (from collision/tunnels_collision.glb, upward-facing triangles)
//     - rocks, trees, crates and railings rasterised as blocked cells, flat tops (bridge, loft) as deck cells
//     - the invisible player-clip walls (collision/clip_walls.glb, v4) as blocked cells, so bots never path
//       into them
//     - spawns, bomb sites, callouts, secret passages, tunnel lamps, water level (from data/map.json)
// The package's coordinates are centred on 0 (x, z in -size/2..size/2); the game's maps start at 0, so the
// game adds half the map size to x and z (OFF below).
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'assets-src/maps/ridgeback_pass');
const DST = path.join(ROOT, 'public/game/maps/ridgeback_pass');
const OUT = path.join(ROOT, 'src/mods/53a-ridgeback-data.js');
const MAPJ = JSON.parse(fs.readFileSync(path.join(SRC, 'data/map.json'), 'utf8')),
  OFF = MAPJ.size / 2, // the package is centred on 0
  N = MAPJ.size + 1, // 1 m grid
  TN = MAPJ.size * 2 + 1; // 0.5 m grid (the bots' walk grid)

// 1. copy the package
const copy = (s, d) => {
  for (const f of fs.readdirSync(s)) {
    if (f.startsWith('.')) continue;
    const a = path.join(s, f),
      b = path.join(d, f);
    if (fs.statSync(a).isDirectory()) fs.mkdirSync(b, { recursive: !0 }), copy(a, b);
    else fs.copyFileSync(a, b);
  }
};
// a clean copy: v4 replaces v3 completely and some file names overlap
fs.rmSync(DST, { recursive: !0, force: !0 });
fs.mkdirSync(DST, { recursive: !0 });
copy(SRC, DST);
// the collision meshes ship uncompressed in the package (2.4 MB): meshopt-compress the served copies
// (positions stay within 3 mm; the height data below is read from the sources)
const { execFileSync } = await import('node:child_process');
execFileSync('node', [path.join(ROOT, 'tools/optimize-models.mjs'), ...['terrain_collision.glb', 'tunnels_collision.glb'].map((f) => path.join(DST, 'collision', f))], { stdio: 'inherit' });

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const mul = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
async function triangles(file) {
  const doc = await io.read(file),
    out = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute('POSITION'),
        idx = p.getIndices(),
        n = idx ? idx.getCount() : pos.getCount(),
        v = (i) => mul(M, pos.getElement(idx ? idx.getScalar(i) : i, []));
      for (let i = 0; i < n; i += 3) out.push([v(i), v(i + 1), v(i + 2)]);
    }
  }
  return out;
}
// height of triangle abc at (x, z), or null outside it
function triY(a, b, c, x, z) {
  const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  if (Math.abs(d) < 1e-9) return null;
  const l1 = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d,
    l2 = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d,
    l3 = 1 - l1 - l2;
  if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) return null;
  return l1 * a[1] + l2 * b[1] + l3 * c[1];
}
function raster(tris, step, lo, n, keep, cb) {
  for (const [a, b, c] of tris) {
    if (!keep(a, b, c)) continue;
    const x0 = Math.max(0, Math.ceil((Math.min(a[0], b[0], c[0]) - lo) / step)),
      x1 = Math.min(n - 1, Math.floor((Math.max(a[0], b[0], c[0]) - lo) / step)),
      z0 = Math.max(0, Math.ceil((Math.min(a[2], b[2], c[2]) - lo) / step)),
      z1 = Math.min(n - 1, Math.floor((Math.max(a[2], b[2], c[2]) - lo) / step));
    for (let iz = z0; iz <= z1; iz++)
      for (let ix = x0; ix <= x1; ix++) {
        const y = triY(a, b, c, lo + ix * step, lo + iz * step);
        y !== null && cb(ix, iz, y);
      }
  }
}
// 2. terrain top surface, 1 m
const terr = await triangles(path.join(SRC, 'collision/terrain_collision.glb')),
  H = new Float32Array(N * N).fill(-1);
raster(terr, 1, -OFF, N, () => !0, (ix, iz, y) => y > H[iz * N + ix] && (H[iz * N + ix] = y));
let holes = 0;
for (let i = 0; i < H.length; i++) if (H[i] < 0) holes++;
// fill any unsampled points from neighbours (tunnel mouths cut into the surface)
for (let pass = 0; pass < 6; pass++)
  for (let iz = 0; iz < N; iz++)
    for (let ix = 0; ix < N; ix++) {
      if (H[iz * N + ix] >= 0) continue;
      let s = 0,
        k = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = ix + dx,
          z = iz + dz;
        x >= 0 && z >= 0 && x < N && z < N && H[z * N + x] >= 0 && ((s += H[z * N + x]), k++);
      }
      k && (H[iz * N + ix] = s / k);
    }
const h16 = new Uint16Array(N * N);
for (let i = 0; i < H.length; i++) h16[i] = Math.max(0, Math.round(Math.max(0, H[i]) * 100));
// 3. tunnel floors, 0.5 m (upward-facing triangles only)
const tun = await triangles(path.join(SRC, 'collision/tunnels_collision.glb')),
  floors = new Map();
const up = (a, b, c) => {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  return ny / (Math.hypot(nx, ny, nz) || 1) > 0.55;
};
raster(tun, 0.5, -OFF, TN, up, (ix, iz, y) => {
  const k = iz * TN + ix,
    a = floors.get(k) || [];
  a.some((h) => Math.abs(h - y) < 0.3) || a.push(y);
  floors.set(k, a);
});
const tunnelCells = [];
for (const [k, a] of floors)
  for (const y of a) {
    const ix = k % TN,
      iz = Math.floor(k / TN),
      top = H[Math.min(N - 1, Math.round(iz / 2)) * N + Math.min(N - 1, Math.round(ix / 2))];
    // only floors under the terrain (inside a passage); floors at the surface are the terrain itself
    top - y > 1.6 && tunnelCells.push(ix, iz, Math.round(y * 100));
  }
// 4. obstacles and decks, rasterised onto the 0.5 m grid
//   blocked: [ix, iz, bottom cm, top cm] for every cell under a rock, tree, crate, railing ... (its real outline:
//            the convex outline of a rock, the turned rectangle of a box, the circle of a trunk)
//   decks:   [ix, iz, top cm] for flat walkable tops (the bridge deck, the sawmill loft, crate tops)
const map = MAPJ,
  blocked = [],
  decks = [];
const qrot = (q, v) => {
  const [x, y, z, w] = q,
    ix = w * v[0] + y * v[2] - z * v[1],
    iy = w * v[1] + z * v[0] - x * v[2],
    iz = w * v[2] + x * v[1] - y * v[0],
    iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
};
// 2D convex hull (monotone chain) and point-in-convex test
const hull2 = (pts) => {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]),
    lo = [],
    up = [];
  for (const p of pts) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (const p of pts.slice().reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
const inside = (poly, x, z) => {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    if ((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return !1;
  }
  return !0;
};
const fill = (poly, cb) => {
  const xs = poly.map((p) => p[0]),
    zs = poly.map((p) => p[1]);
  for (let iz = Math.max(0, Math.floor((Math.min(...zs) + OFF) / 0.5)); iz <= Math.min(TN - 2, Math.ceil((Math.max(...zs) + OFF) / 0.5)); iz++)
    for (let ix = Math.max(0, Math.floor((Math.min(...xs) + OFF) / 0.5)); ix <= Math.min(TN - 2, Math.ceil((Math.max(...xs) + OFF) / 0.5)); ix++) {
      const x = (ix + 0.5) * 0.5 - OFF,
        z = (iz + 0.5) * 0.5 - OFF;
      // a cell counts if its centre or any corner is inside
      if ([[0, 0], [-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].some(([dx, dz]) => inside(poly, x + dx, z + dz))) cb(ix, iz);
    }
};
const circle = (cx, cz, r, n = 12) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * 6.283) * r, cz + Math.sin((i / n) * 6.283) * r]);
for (const c of map.colliders) {
  let pts3 = [];
  if (c.type === 'capsule') pts3 = circle(c.p[0], c.p[2], c.radius).map(([x, z]) => [x, c.p[1] - c.halfHeight - c.radius, z]).concat([[c.p[0], c.p[1] + c.halfHeight + c.radius, c.p[2]]]);
  else if (c.type === 'capsule_axis') for (const e of [c.a, c.b]) pts3.push(...circle(e[0], e[2], c.radius).map(([x, z]) => [x, e[1] - c.radius, z]), [e[0], e[1] + c.radius, e[2]]);
  else {
    const pts = c.type === 'box' ? [-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [-1, 1].map((d) => [a * c.half[0], b * c.half[1], d * c.half[2]]))) : (map.hulls[c.asset] || []).map((p) => p.map((v) => v * c.s));
    pts3 = pts.map((p) => {
      const r = qrot(c.q, p);
      return [r[0] + c.p[0], r[1] + c.p[1], r[2] + c.p[2]];
    });
  }
  if (pts3.length < 3) continue;
  const y0 = Math.min(...pts3.map((p) => p[1])),
    y1 = Math.max(...pts3.map((p) => p[1])),
    poly = hull2(pts3.map((p) => [p[0], p[2]]));
  if (poly.length < 3) continue;
  // a flat, level box at least a metre square: something to stand on
  const deck = c.type === 'box' && c.half[1] < 0.3 && c.half[0] * c.half[2] > 0.25 && Math.abs(c.q[0]) < 0.05 && Math.abs(c.q[2]) < 0.05;
  fill(poly, (ix, iz) => (deck ? decks.push(ix, iz, Math.round(y1 * 100)) : blocked.push(ix, iz, Math.round(y0 * 100), Math.round(y1 * 100))));
}
// clip walls: vertical sheets; every 0.5 m cell a wall passes through is blocked over the wall's height
const clipFile = path.join(SRC, 'collision/clip_walls.glb');
let clipTris = 0;
if (fs.existsSync(clipFile)) {
  const seen = new Set();
  for (const [a, b, c] of await triangles(clipFile)) {
    clipTris++;
    const y0 = Math.min(a[1], b[1], c[1]),
      y1 = Math.max(a[1], b[1], c[1]),
      L = Math.max(Math.hypot(b[0] - a[0], b[2] - a[2]), Math.hypot(c[0] - a[0], c[2] - a[2]), Math.hypot(c[0] - b[0], c[2] - b[2])),
      n = Math.max(2, Math.ceil(L / 0.2));
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n - i; j++) {
        const u = i / n,
          v = j / n,
          x = a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v,
          z = a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * v,
          ix = Math.floor((x + OFF) / 0.5),
          iz = Math.floor((z + OFF) / 0.5),
          k = iz * TN + ix;
        if (ix < 0 || iz < 0 || ix >= TN - 1 || iz >= TN - 1 || seen.has(k + ':' + Math.round(y0))) continue;
        seen.add(k + ':' + Math.round(y0));
        blocked.push(ix, iz, Math.round(y0 * 100), Math.round(y1 * 100));
      }
  }
}
// 5. gameplay data, shifted into the game's frame
const sh = (p) => [+(p[0] + OFF).toFixed(3), +p[1].toFixed(3), +(p[2] + OFF).toFixed(3)];
const game = {
  version: map.version,
  bounds: { min: sh(map.bounds.min), max: sh(map.bounds.max), killY: map.bounds.killY },
  spawns: Object.fromEntries(Object.entries(map.spawns).map(([k, l]) => [k, l.map((s) => ({ p: sh(s.p), yaw: s.yaw }))])),
  sites: Object.fromEntries(Object.entries(map.bombSites).map(([k, s]) => [k, { center: sh(s.center), radius: s.radius, height: s.height }])),
  secrets: Object.fromEntries(Object.entries(map.secrets).map(([k, s]) => [k, { style: s.style, length: s.length, mouths: s.mouths.map(sh) }])),
  lights: map.lights.map((l) => ({ p: sh(l.p), color: l.color, intensity: l.intensity, distance: l.distance })),
  callouts: map.callouts.map((c) => ({ name: c.name, points: c.points.map(([x, z]) => [x + OFF, z + OFF]), widths: c.widths })),
  sun: map.sun,
  fog: map.fog,
  terrainMaterial: map.terrainMaterial,
};
const b64 = (arr) => Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
const body =
  `/* ===== Bayou Protocol: Ridgeback Pass data (generated by tools/build-ridgeback.mjs from assets-src/maps/ridgeback_pass, do not edit) ===== */\n` +
  `// terrain: ${terr.length} triangles -> ${N}x${N} heights (1 m, cm), ${holes} gaps filled; tunnels: ${tun.length} triangles -> ${tunnelCells.length / 3} floor cells (0.5 m); ${blocked.length / 4} blocked and ${decks.length / 3} deck cells; ${clipTris} clip-wall triangles\n` +
  `const __RB_DATA = {\n  off: ${OFF},\n  size: ${map.size},\n  n: ${N},\n  tn: ${TN},\n  heights: '${b64(h16)}',\n  tunnels: '${b64(Int32Array.from(tunnelCells))}',\n  blocked: '${b64(Int32Array.from(blocked))}',\n  decks: '${b64(Int32Array.from(decks))}',\n  game: ${JSON.stringify(game)},\n};\n`;
fs.writeFileSync(OUT, body);
console.log(`terrain ${terr.length} tris, ${holes} gaps; tunnels ${tun.length} tris -> ${tunnelCells.length / 3} floor cells; ${blocked.length / 4} blocked, ${decks.length / 3} deck cells; data ${(body.length / 1024).toFixed(0)} KB`);
