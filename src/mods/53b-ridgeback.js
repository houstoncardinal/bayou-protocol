/* ===== Bayou Protocol mod: Ridgeback Pass v4 (200 m alpine map) ===== */
// A compact 10 v 10 alpine map for bomb defusal and deathmatch, built from Poly Haven photo-scans. The v4
// package (assets-src/maps/ridgeback_pass, copied to public/game/maps/ridgeback_pass by tools/build-ridgeback.mjs)
// replaces v3 completely. Its loader runs unchanged (src/maps/ridgebackPass, see "the scenery" below); this
// mod adds what the game needs round it:
//   - the map as the simulation sees it: 10 T, 10 CT and 18 deathmatch spawns, bombsites A and B, callouts
//     for the location readout (Bridge, B Tunnels, Smuggler's Cave, Old Drift, A Main, Mid ...), capture
//     points, the lanterns as lights
//   - physics: terrain and tunnel collision meshes as Rapier triangle meshes, rocks as convex hulls, the
//     bridge, loft and crates as boxes, trunks and posts as capsules, in the game's collision groups, so
//     bullets, line of sight, grenades and every player and bot collide with the mountain; the package's
//     invisible clip walls stop players and bots (not bullets) climbing cliffs and ridge tops
//   - bots: their walk grid (0.5 m cells) is built from the terrain heights, the tunnel floors, the bridge
//     deck and loft, every obstacle's real outline and the clip walls (tools/build-ridgeback.mjs ->
//     53a-ridgeback-data.js)
//   - quality follows the game's Video quality (the package's high / medium / low presets)
// The package is centred on 0; the game's maps start at 0, so everything is moved by half the map size.
const __RB = {
  base: './game/maps/ridgeback_pass/',
  H: null,
  col: null, // { terrain: [[verts, idx]...], tunnels: [...], clip: [...] } in the game's frame
  data: null, // map.json
  props: null, // props.json
  loadingCol: !1,
  view: null, // { q, map (the loader's result), group }
  viewLoading: null, // the quality being loaded
  rev: 0,
  subs: new Set(),
  inVis: !1,
  stats: {},
};
const __rbOFF = __RB_DATA.off,
  __rbW = __RB_DATA.size;
const __rbB64 = (s, T) => {
  const bin = atob(s),
    u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new T(u8.buffer);
};
// ---------------------------------------------------------------- terrain heights (1 m grid, bilinear)
function __rbHeights() {
  if (__RB.H) return __RB.H;
  const u16 = __rbB64(__RB_DATA.heights, Uint16Array),
    H = new Float32Array(u16.length);
  for (let i = 0; i < u16.length; i++) H[i] = u16[i] / 100;
  return (__RB.H = H);
}
function __rbGround(x, z) {
  const H = __rbHeights(),
    N = __RB_DATA.n,
    fx = Math.max(0, Math.min(N - 1.001, x)),
    fz = Math.max(0, Math.min(N - 1.001, z)),
    ix = Math.floor(fx),
    iz = Math.floor(fz),
    tx = fx - ix,
    tz = fz - iz,
    a = H[iz * N + ix],
    b = H[iz * N + ix + 1],
    c = H[(iz + 1) * N + ix],
    d = H[(iz + 1) * N + ix + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}
// 0.5 m cells: tunnel floors and deck tops (extra levels), blocked spans
function __rbCells() {
  if (__RB.cells) return __RB.cells;
  const tn = __RB_DATA.tn,
    lv = new Map(),
    bl = new Map(),
    t = __rbB64(__RB_DATA.tunnels, Int32Array),
    d = __rbB64(__RB_DATA.decks, Int32Array),
    b = __rbB64(__RB_DATA.blocked, Int32Array),
    push = (m, k, v) => (m.get(k) || m.set(k, []).get(k)).push(v);
  for (let i = 0; i < t.length; i += 3) push(lv, t[i + 1] * tn + t[i], t[i + 2] / 100);
  for (let i = 0; i < d.length; i += 3) push(lv, d[i + 1] * tn + d[i], d[i + 2] / 100);
  for (let i = 0; i < b.length; i += 4) push(bl, b[i + 1] * tn + b[i], [b[i + 2] / 100, b[i + 3] / 100]);
  return (__RB.cells = { lv, bl });
}
// ---------------------------------------------------------------- the map (what the simulation sees)
function __ridgebackBuild() {
  const w = new Po(),
    A = w.m,
    G = __RB_DATA.game,
    W = __rbW;
  A.id = 'ridgeback';
  A.name = 'Ridgeback Pass';
  A.w = W;
  A.d = W;
  A.backdrop = 'mountains';
  A.__terrain = !0;
  // invisible walls at the edge (the cliffs already stop people; these stop grenades and the odd jump)
  for (const [x0, z0, x1, z1] of [
    [-1, -1, W + 1, 0],
    [-1, W, W + 1, W + 1],
    [-1, 0, 0, W],
    [W, 0, W + 1, W],
  ])
    w.box(x0, 0, z0, x1, 140, z1, 'bounds', { mat: 'concrete', pen: 0 });
  const P = (p) => z(p[0], p[1], p[2]),
    onG = (p) => z(p.x, __rbGround(p.x, p.z), p.z);
  A.spawns.T = G.spawns.T.map((s) => P(s.p));
  A.spawns.CT = G.spawns.CT.map((s) => P(s.p));
  const zone = (l) => ({ min: z(Math.min(...l.map((s) => s.p[0])) - 1, 0, Math.min(...l.map((s) => s.p[2])) - 1), max: z(Math.max(...l.map((s) => s.p[0])) + 1, 0, Math.max(...l.map((s) => s.p[2])) + 1) });
  A.spawnZones = { T: zone(G.spawns.T), CT: zone(G.spawns.CT) };
  A.tdmSpawns = G.spawns.deathmatch.map((s) => P(s.p));
  const site = (k) => {
    const s = G.sites[k],
      c = s.center,
      r = s.radius * 0.72; // the plantable square inside the disc
    return { name: k, min: z(c[0] - r, c[1] - 2, c[2] - r), max: z(c[0] + r, c[1] + s.height, c[2] + r) };
  };
  const sA = site('A'),
    sB = site('B'),
    ctC = A.spawns.CT[0],
    tC = A.spawns.T[0],
    mid = (a, b, t) => z(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t),
    ctr = (s) => z((s.min.x + s.max.x) / 2, 0, (s.min.z + s.max.z) / 2);
  for (const s of [sA, sB]) {
    const c = ctr(s);
    s.stage = [onG(mid(tC, c, 0.55)), onG(mid(tC, c, 0.75))];
    s.watch = [onG(mid(ctC, c, 0.7)), onG(z(c.x + 6, 0, c.z + 5)), onG(z(c.x - 6, 0, c.z + 5))].map((p) => z(p.x, p.y + 1.3, p.z));
    s.hold = [onG(z(c.x + 4, 0, c.z - 3)), onG(z(c.x - 4, 0, c.z - 3)), onG(z(c.x, 0, c.z + 4))];
  }
  A.sites = [sA, sB];
  // callouts -> named areas for the location readout: the bombsites, then the specific places (bridge,
  // passages), then the lanes round them
  A.areas.push({ name: 'Bombsite A', min: sA.min, max: z(sA.max.x, sA.max.y + 4, sA.max.z) }, { name: 'Bombsite B', min: sB.min, max: z(sB.max.x, sB.max.y + 4, sB.max.z) });
  const special = new Set(['Bridge', 'B Tunnels', "Smuggler's Cave", 'Old Drift']);
  for (const pass of [!0, !1])
    for (const c of G.callouts) {
      if (special.has(c.name) !== pass) continue;
      for (let i = 0; i < Math.max(1, c.points.length - 1); i++) {
        const a = c.points[i],
          b = c.points[Math.min(i + 1, c.points.length - 1)],
          r = Math.max(c.widths[i], c.widths[Math.min(i + 1, c.widths.length - 1)]) / 2;
        A.areas.push({ name: c.name, min: z(Math.min(a[0], b[0]) - r, -5, Math.min(a[1], b[1]) - r), max: z(Math.max(a[0], b[0]) + r, 140, Math.max(a[1], b[1]) + r) });
      }
    }
  A.flagPoints = [
    { name: 'A', pos: onG(ctr(sA)) },
    { name: 'B', pos: onG(z(W / 2, 0, W / 2)) },
    { name: 'C', pos: onG(ctr(sB)) },
  ];
  A.poi = [...G.callouts.map((c) => onG(z(c.points[0][0], 0, c.points[0][1]))), ...Object.values(G.secrets).flatMap((s) => s.mouths.map(P))];
  // the lanterns (the game keeps the nearest few lit)
  for (const l of G.lights) A.lights.push({ pos: P(l.p), interior: !0 });
  // minimap: cliffs and steep ground outlined (hidden outlines, not drawn in the world)
  for (let x = 1; x < W; x += 2)
    for (let zz = 1; zz < W; zz += 2) {
      const h = __rbGround(x, zz),
        s = Math.max(Math.abs(__rbGround(x + 1, zz) - __rbGround(x - 1, zz)), Math.abs(__rbGround(x, zz + 1) - __rbGround(x, zz - 1))) / 2;
      s > 0.9 && A.visuals.push({ min: z(x - 1, 0, zz - 1), max: z(x + 1, Math.max(2, h), zz + 1), mat: 'stone', color: '#7b7d78', __hidden: 1 });
    }
  return A;
}
XE.ridgeback = __ridgebackBuild;
BD.unshift({
  id: 'ridgeback',
  name: 'Ridgeback Pass',
  blurb: 'An alpine pass for ten a side, from Poly Haven scans. A Main, Mid and the bridge over the creek gorge, B Tunnels and two secret flanks: the Smuggler’s Cave and the Old Drift.',
  size: 'Large',
  maxPlayers: 20,
});
// ---------------------------------------------------------------- bots' walk grid
{
  const coreNav = p9;
  p9 = function () {
    const w = aw();
    if (!w.__terrain) return coreNav.apply(this, arguments);
    if (Ws && QJ === w) return Ws;
    const c = o8.get(w);
    if (c) return (Ws = c.nav), (TI = c.gw), (qe = c.gh), (QJ = w), (Le = void 0), Ws;
    const t0 = performance.now();
    TI = Math.ceil(w.w / Un);
    qe = Math.ceil(w.d / Un);
    QJ = w;
    Le = void 0;
    const { lv, bl } = __rbCells(),
      tn = __RB_DATA.tn,
      start = new Int32Array(TI * qe + 1),
      hs = [],
      cols = [];
    for (let s = 0; s < qe; s++)
      for (let C = 0; C < TI; C++) {
        const o = s * TI + C,
          k = s * tn + C,
          spans = bl.get(k),
          free = (h) => !spans || !spans.some(([y0, y1]) => y1 > h + me && y0 < h + 1.7);
        start[o] = hs.length;
        const L = [__rbGround((C + 0.5) * Un, (s + 0.5) * Un), ...(lv.get(k) || [])].filter(free).sort((a, b) => a - b);
        for (let i = 0; i < L.length; i++) (i && L[i] - L[i - 1] < 0.3) || (hs.push(L[i]), cols.push(o));
      }
    start[TI * qe] = hs.length;
    Ws = { start, h: Float32Array.from(hs), col: Int32Array.from(cols) };
    o8.set(w, { nav: Ws, gw: TI, gh: qe });
    __RB.stats.nav = { cells: TI * qe, levels: hs.length, ms: Math.round(performance.now() - t0) };
    return Ws;
  };
}
// ---------------------------------------------------------------- physics
// colliders that are not map boxes still answer the game's ray queries: each gets a record like a box
const __CG_CLIP = 1024;
__CF.kcc = __cg(__CG.PLAYER | __CG.ENEMY, __CG.ENV | __CG.GLASS | __CG.INTERACTIVE | __CG_CLIP);
const __rbRec = (kind, mat) => ({ kind, mat, solid: !0, __mesh: 1, min: { x: 1, y: 1, z: 1 }, max: { x: 0, y: 0, z: 0 } });
function __rbAddCol(w, desc, rec) {
  const c = w.createCollider(desc.setCollisionGroups(__cg(__CG.ENV, __CG.ALL)).setFriction(0.8));
  __PHX.boxOf.set(c.handle, rec);
  return c;
}
function __rbPhysics(m) {
  const P = __PHX,
    R = P.R,
    w = P.world;
  if (!w || P.map !== m) return;
  const st = (P.__rb = P.__rb && P.__rb.world === w ? P.__rb : { world: w, cols: [], full: !1 });
  if (st.full) return;
  const real = __RB.col && __RB.data;
  // until the collision meshes have loaded, the terrain is a triangle mesh built from the height grid
  if (!real) {
    if (st.cols.length) return;
    const N = __RB_DATA.n,
      H = __rbHeights(),
      v = new Float32Array(N * N * 3),
      idx = new Uint32Array((N - 1) * (N - 1) * 6);
    for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) v.set([ix, H[iz * N + ix], iz], (iz * N + ix) * 3);
    let k = 0;
    for (let iz = 0; iz < N - 1; iz++)
      for (let ix = 0; ix < N - 1; ix++) {
        const a = iz * N + ix,
          b = a + 1,
          c = a + N,
          d = c + 1;
        idx.set([a, c, b, b, c, d], k);
        k += 6;
      }
    st.cols.push(__rbAddCol(w, R.ColliderDesc.trimesh(v, idx), __rbRec('terrain', 'dirt')));
    w.step(P.events);
    return;
  }
  for (const c of st.cols) w.removeCollider(c, !1), P.boxOf.delete(c.handle);
  st.cols = [];
  for (const [v, idx] of __RB.col.terrain) st.cols.push(__rbAddCol(w, R.ColliderDesc.trimesh(v, idx), __rbRec('terrain', 'dirt')));
  for (const [v, idx] of __RB.col.tunnels) st.cols.push(__rbAddCol(w, R.ColliderDesc.trimesh(v, idx), __rbRec('tunnel', 'concrete')));
  // invisible player clip: stops players and bots climbing cliffs and ridge tops; bullets, grenades and
  // line of sight pass through
  for (const [v, idx] of __RB.col.clip || []) {
    const c = w.createCollider(R.ColliderDesc.trimesh(v, idx).setCollisionGroups(__cg(__CG_CLIP, __CG.PLAYER | __CG.ENEMY)).setFriction(0));
    st.cols.push(c);
  }
  const D = __RB.data,
    O = __rbOFF,
    up = new U(0, 1, 0),
    qq = new Kw();
  let n = 0;
  for (const c of D.colliders) {
    let desc = null,
      rec = null;
    if (c.type === 'capsule') (desc = R.ColliderDesc.capsule(c.halfHeight, c.radius).setTranslation(c.p[0] + O, c.p[1], c.p[2] + O)), (rec = __rbRec('tree', 'wood'));
    else if (c.type === 'capsule_axis') {
      const a = new U(...c.a),
        b = new U(...c.b);
      qq.setFromUnitVectors(up, b.clone().sub(a).normalize());
      desc = R.ColliderDesc.capsule(a.distanceTo(b) / 2, c.radius)
        .setTranslation((c.a[0] + c.b[0]) / 2 + O, (c.a[1] + c.b[1]) / 2, (c.a[2] + c.b[2]) / 2 + O)
        .setRotation({ x: qq.x, y: qq.y, z: qq.z, w: qq.w });
      rec = __rbRec('post', 'wood');
    } else if (c.type === 'box') (desc = R.ColliderDesc.cuboid(c.half[0], c.half[1], c.half[2]).setTranslation(c.p[0] + O, c.p[1], c.p[2] + O).setRotation({ x: c.q[0], y: c.q[1], z: c.q[2], w: c.q[3] })), (rec = __rbRec('crate', 'wood'));
    else if (c.type === 'hull') {
      const pts = D.hulls[c.asset];
      if (!pts) continue;
      const arr = new Float32Array(pts.length * 3);
      pts.forEach((p, i) => ((arr[i * 3] = p[0] * c.s), (arr[i * 3 + 1] = p[1] * c.s), (arr[i * 3 + 2] = p[2] * c.s)));
      desc = R.ColliderDesc.convexHull(arr);
      desc && desc.setTranslation(c.p[0] + O, c.p[1], c.p[2] + O).setRotation({ x: c.q[0], y: c.q[1], z: c.q[2], w: c.q[3] });
      const wood = /wood|barrel|crate|bucket|stump|trunk|branch/.test(c.asset);
      rec = __rbRec(wood ? 'crate' : 'rock', wood ? 'wood' : 'concrete');
    }
    if (!desc) continue;
    st.cols.push(__rbAddCol(w, desc, rec));
    n++;
  }
  st.full = !0;
  __RB.stats.physics = { meshes: __RB.col.terrain.length + __RB.col.tunnels.length, clip: (__RB.col.clip || []).length, colliders: n };
  w.step(P.events);
}
{
  const coreBuild = __phxBuild;
  __phxBuild = function (m) {
    coreBuild.apply(this, arguments);
    m && m.__terrain && __rbPhysics(m);
  };
}
// collision meshes and data: fetched early, so the real meshes are ready when a match starts
function __rbBake(g) {
  const out = [];
  g.scene.updateMatrixWorld(!0);
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    const geo = __crFloat(o.geometry, new _A().makeTranslation(__rbOFF, 0, __rbOFF).multiply(o.matrixWorld)),
      p = geo.attributes.position,
      v = new Float32Array(p.array),
      idx = geo.index ? new Uint32Array(geo.index.array) : Uint32Array.from({ length: p.count }, (_, i) => i);
    out.push([v, idx]);
  });
  return out;
}
function __rbLoadData(cb) {
  if (__RB.data) return cb && cb();
  (__RB.dataWait || (__RB.dataWait = [])).push(cb);
  if (__RB.dataLoading) return;
  __RB.dataLoading = !0;
  fetch(__RB.base + 'data/map.json')
    .then((r) => r.json())
    .then((d) => {
      __RB.data = d;
      for (const f of __RB.dataWait.splice(0)) f && f();
    })
    .catch((e) => console.warn('[ridgeback] map.json', e));
}
function __rbLoadCollision() {
  if (__RB.loadingCol || typeof window > 'u') return;
  __RB.loadingCol = !0;
  const col = {},
    done = () => {
      if (!col.terrain || !col.tunnels || !col.clip || !__RB.data) return;
      __RB.col = col;
      const P = __PHX;
      P.world && P.map && P.map.__terrain && __rbPhysics(P.map);
    };
  for (const [k, f] of [['terrain', 'terrain_collision'], ['tunnels', 'tunnels_collision'], ['clip', 'clip_walls']])
    __rbGLB('collision/' + f + '.glb')
      .then((g) => ((col[k] = __rbBake(g)), done()))
      .catch((e) => (console.warn('[ridgeback] ' + f, e), (col[k] = []), done()));
  __rbLoadData(done);
}
typeof window < 'u' && setTimeout(__rbLoadCollision, 2500);
// ---------------------------------------------------------------- the scenery: the v4 package's own loader
// src/maps/ridgebackPass/loadRidgebackPass.ts (unchanged from the v4 zip) builds the scenery: the terrain
// chunks with their shader, tunnels, structures, creek, distant mountains, instanced trees, rocks and props
// with per-instance detail levels and culling, and the grass. It is called with:
//   - the game's renderer (anisotropic filtering) and model loader (meshopt + WebP, the shared queue)
//   - atmosphere off: the game lights the map (time of day, its sun and shadows, fog) like every other map,
//     with the package's alpine sky panorama as the background
//   - no physics world: the game adds the collision itself (above), in its collision groups, so bullets,
//     grenades, line of sight and footstep surfaces know what they hit
//   - no tunnel lamps: the lanterns are map lights, and the game keeps the nearest few lit
// The package is centred on 0 and the game's maps start at 0, so the scenery sits in a group moved by half
// the map size. The terrain shader places its blend maps in world space: their origin is moved to match.
// map.update() (level of detail, culling, grass wind) is given a copy of the camera in the package's frame.
// The package's "high" preset (trees and rocks casting shadows, full-detail trees to 36 m: about 5 million
// triangles a frame) needs a discrete or Pro / Max class GPU. On integrated graphics High keeps its sharper
// resolution and shadows but uses the "medium" scenery, which looks nearly the same and runs twice as fast.
const __rbStrongGpu = () => {
  if (__RB.strong === void 0)
    try {
      __RB.strong = /nvidia|geforce|rtx|gtx|radeon rx|radeon pro|arc a|apple m[1-9] (pro|max|ultra)/i.test(nz());
    } catch (e) {
      __RB.strong = !1;
    }
  return __RB.strong;
};
const __rbQuality = (q) => (q === 'high' ? (__rbStrongGpu() ? 'high' : 'medium') : q === 'low' ? 'low' : 'medium');
function __rbGLB(p) {
  const C = __RB.glbs || (__RB.glbs = new Map());
  C.has(p) || C.set(p, new Promise((res, rej) => __glbParse(__RB.base + p, res, rej)));
  return C.get(p);
}
async function __rbJSON(p) {
  if (p === 'data/map.json') {
    await new Promise((r) => __rbLoadData(r));
    const d = __RB.data,
      tm = d.terrainMaterial;
    return { ...d, terrainMaterial: { ...tm, mapMin: [tm.mapMin[0] + __rbOFF, tm.mapMin[1] - __rbOFF] } };
  }
  if (p === 'data/props.json') return __RB.props || (__RB.props = await (await fetch(__RB.base + p)).json());
  return (await fetch(__RB.base + p)).json();
}
// The package's terrain shader, made cheaper (the first two leave every pixel the same, the third changes
// none by more than 1 %):
//   - the cliff-rock mask is worked out first; where a pixel is all rock, the ground layers (which the mask
//     would multiply by zero) are not sampled at all
//   - a ground layer is skipped when its weight is more than 0.85 below the strongest one: its height-blend
//     weight (weight + height x 0.6) then stays more than 0.25 under the best, which the shader's own blend
//     (max(h - best + 0.25, 0)) turns into exactly zero
//   - triplanar projections with under 1 % of the blend are not sampled
// The terrain covers most of the screen and its shader is the most expensive one in the game, so this is the
// largest single saving on this map. Applied to the loaded material, so src/maps stays as delivered.
function __rbFastTerrain(group) {
  group.traverse((o) => {
    const m = o.isMesh && o.material;
    if (!m || m.__rbFast || !m.customProgramCacheKey || !/^ridgeback-terrain/.test(m.customProgramCacheKey())) return;
    m.__rbFast = 1;
    const prev = m.onBeforeCompile,
      key = m.customProgramCacheKey.bind(m);
    m.onBeforeCompile = function (sh, r) {
      prev.call(this, sh, r);
      m.userData.u = sh.uniforms;
      let f = sh.fragmentShader;
      const rockA = 'float steep = min(tN.y, mix(tN.y, gN.y, 0.6));\nfloat rockF = smoothstep(0.78, 0.60, steep + (tNoise(tWP * 0.35) - 0.5) * 0.12);',
        ids = 'int ids[10];',
        loopIf = 'if (w[i] > 0.02) {',
        wArr = 'w[9] = sC.b;';
      if (![rockA, ids, loopIf, wArr].every((x) => f.includes(x))) return void console.warn('[ridgeback] terrain shader changed: fast path not applied');
      f = f.replace(rockA, '');
      f = f.replace(ids, rockA + '\n' + ids);
      f = f.replace(wArr, wArr + '\nfloat maxW = max(max(max(w[0], w[1]), max(w[2], w[3])), max(max(w[4], w[5]), max(max(w[6], w[7]), max(w[8], w[9]))));');
      f = f.replace(loopIf, 'if (w[i] > max(0.02, maxW - 0.85) && rockF < 0.999) {');
      // triplanar: a projection whose blend weight is under 1 % is not sampled (at most a 1 % change; on most
      // slopes one of the three projections is near zero, so a third of the rock samples go)
      const tri = 'tLayer(layer, P.zy / t, ax, nx); tLayer(layer, P.xz / t, ay, ny); tLayer(layer, P.xy / t, az, nz);';
      f.includes(tri) &&
        (f = f.replace(
          tri,
          'ax = vec4(0.0); nx = vec4(0.5, 0.5, 1.0, 1.0); ay = ax; ny = nx; az = ax; nz = nx;\n  if (bw.x > 0.01) tLayer(layer, P.zy / t, ax, nx);\n  if (bw.y > 0.01) tLayer(layer, P.xz / t, ay, ny);\n  if (bw.z > 0.01) tLayer(layer, P.xy / t, az, nz);',
        ));
      sh.fragmentShader = f;
    };
    m.customProgramCacheKey = () => key() + '-fast';
    m.needsUpdate = !0;
  });
}
// Terrain shadows from the low-detail terrain: each chunk's full-detail mesh (about 55k triangles) was drawn
// a second time into the sun's shadow map every frame. A ridge's shadow only needs its outline, so the chunk's
// low-detail mesh (about a tenth of the triangles), on a layer only the shadow cameras see and set 6 cm lower
// (so it never shades the detailed surface it sits under), casts it instead.
const __rbShadowMat = typeof window < 'u' ? new Ni({ colorWrite: !1, depthWrite: !1 }) : null;
function __rbTerrainShadows(group) {
  group.traverse((o) => {
    if (!o.isLOD || !/^terrain_/.test(o.name) || o.userData.__rbShadow || o.levels.length < 2) return;
    o.userData.__rbShadow = 1;
    const hi = o.levels[0].object,
      lo = o.levels[1].object;
    hi.castShadow = !1;
    lo.castShadow = !1;
    const proxy = new Ow(lo.geometry, __rbShadowMat);
    proxy.name = o.name + '_shadow';
    proxy.castShadow = !0;
    proxy.receiveShadow = !1;
    proxy.position.y = -0.06;
    proxy.layers.set(1);
    o.parent.add(proxy);
  });
}
// Depth pre-pass for the terrain: the terrain's shader is the most expensive in the game, and hills behind
// hills were shaded in full and then drawn over. Each chunk is first drawn depth-only (almost free), a hair
// further away, so the real pass then shades only the pixels that end up on screen.
const __rbDepthMat = typeof window < 'u' ? Object.assign(new Ni({ colorWrite: !1 }), { polygonOffset: !0, polygonOffsetFactor: 1, polygonOffsetUnits: 2 }) : null;
function __rbTerrainPrepass(group, q) {
  group.traverse((o) => {
    if (!o.isLOD || !/^terrain_/.test(o.name) || o.userData.__rbPre) return;
    o.userData.__rbPre = 1;
    // the full-detail chunk (about 55,000 triangles) only near the camera: the surface detail is in the
    // shader, so beyond this the 5,000-triangle chunk looks the same (compared in screenshots) and the frame
    // has a third fewer triangles
    o.levels[1] && (o.levels[1].distance = Math.min(o.levels[1].distance, q === 'high' ? 60 : q === 'low' ? 35 : 50));
    for (const l of o.levels) {
      const m = new Ow(l.object.geometry, __rbDepthMat);
      m.name = 'terrain_depth';
      m.renderOrder = -5;
      m.matrixAutoUpdate = !1;
      l.object.add(m);
    }
  });
}
// the shadow-casting lights look at layer 1 too (checked now and then: lights are re-created with the time of day)
function __rbShadowLayers(scene) {
  if ((__RB.lyr = (__RB.lyr || 0) + 1) % 60 !== 1) return;
  scene.traverse((o) => o.isLight && o.castShadow && o.shadow && o.shadow.camera.layers.enable(1));
}
function __rbLoadView(q, gl) {
  if (__RB.viewLoading === q || (__RB.view && __RB.view.q === q && !__RB.viewLoading)) return;
  const load = globalThis.__BP_MAPS && globalThis.__BP_MAPS.ridgeback;
  if (!load) return console.warn('[ridgeback] the v4 loader is missing (src/maps/ridgeback.js)');
  __RB.viewLoading = q;
  __rbLoadCollision();
  const group = new ji(),
    t0 = performance.now();
  group.name = 'bp-ridgeback';
  group.position.set(__rbOFF, 0, __rbOFF);
  load({ scene: group, world: null, RAPIER: null, renderer: gl, quality: q, atmosphere: !1, shadows: q === 'high', tunnelLights: 'none', resolve: (p) => p, loadGLB: __rbGLB, loadJSON: __rbJSON })
    .then((map) => {
      if (__RB.viewLoading !== q) return map.dispose(); // the quality changed (or the map was left) meanwhile
      __RB.viewLoading = null;
      const old = __RB.view;
      __rbFastTerrain(group);
      __rbTerrainShadows(group);
      __rbTerrainPrepass(group, q);
      __RB.view = { q, map, group };
      let n = 0;
      group.traverse((o) => o.isMesh && n++);
      __RB.stats.view = { quality: q, loader: 'v4', meshes: n, ms: Math.round(performance.now() - t0) };
      __rbGLB('environment/sky.glb')
        .then((g) =>
          g.scene.traverse((o) => {
            const t = o.isMesh && o.material && o.material.emissiveMap;
            t && ((t.mapping = 303), (t.colorSpace = Tw), (t.needsUpdate = !0), (__RB.sky = t));
          }),
        )
        .catch(() => {});
      __RB.rev++;
      for (const f of __RB.subs) f(__RB.rev);
      // the old quality's scenery: freed once the new one is on screen
      old && setTimeout(() => old.map.dispose(), 0);
    })
    .catch((e) => {
      __RB.viewLoading === q && (__RB.viewLoading = null);
      console.warn('[ridgeback] load', e);
    });
}
function __rbUnloadView() {
  const v = __RB.view;
  __RB.view = null;
  __RB.viewLoading = null;
  v && v.map.dispose();
  // the downloaded models (about 350 MB of memory, and their textures on the graphics card) are released
  // too; the browser's cache keeps the files, and on desktops the menus load them again in the background
  // while Ridgeback is the selected map
  const C = __RB.glbs;
  __RB.glbs = new Map();
  __RB.sky = null;
  C &&
    C.forEach((p, path) => {
      if (/^collision\//.test(path)) return; // their triangles are already baked into __RB.col
      p.then(
        (g) =>
          g.scene.traverse((o) => {
            if (!o.isMesh) return;
            o.geometry && o.geometry.dispose();
            for (const m of [].concat(o.material || [])) {
              if (!m) continue;
              for (const k in m) m[k] && m[k].isTexture && m[k].dispose();
              m.dispose();
            }
          }),
        () => {},
      );
    });
  __RB.preloaded = !1;
}
// per frame: detail levels, culling and wind (the package's update), sky and haze
function __rbFrame(v, s) {
  const cam = s.camera,
    P = __RB.proxy || (__RB.proxy = new ui());
  cam.updateMatrixWorld();
  cam.matrixWorld.decompose(P.position, P.quaternion, P.scale);
  P.position.x -= __rbOFF;
  P.position.z -= __rbOFF;
  P.projectionMatrix.copy(cam.projectionMatrix);
  P.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
  const t0 = performance.now();
  v.map.update(P, s.clock.elapsedTime);
  __rbShadowLayers(s.scene);
  typeof __PROF < 'u' && ((__PROF.map += performance.now() - t0), __PROF.mapN++);
  if (__RB.sky && s.scene.background !== __RB.sky) (__RB.bgPrev = s.scene.background), (__RB.bgScene = s.scene), (s.scene.background = __RB.sky);
  const f = s.scene.fog,
    F = __RB_DATA.game.fog;
  f && f.near !== F.near && ((f.near = F.near), (f.far = F.far), f.color && f.color.set(F.color));
}
{
  // no procedural mountain blocks round this map: it has its own backdrop
  const coreMtn = oiA;
  oiA = function () {
    return __RB.inVis ? [] : coreMtn.apply(this, arguments);
  };
  const coreVis = tiA;
  tiA = function (w) {
    __RB.inVis = !!(w && w.__terrain);
    try {
      return coreVis.apply(this, arguments);
    } finally {
      __RB.inVis = !1;
    }
  };
}
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw(),
      on = !!m.__terrain,
      q = __rbQuality(Zw((s) => s.quality)),
      gl = gI((s) => s.gl),
      [, setRev] = S.useState(__RB.rev);
    S.useEffect(() => {
      __RB.subs.add(setRev);
      return () => __RB.subs.delete(setRev);
    }, []);
    S.useEffect(() => {
      on && __rbLoadView(q, gl);
    }, [on, q, gl]);
    // leaving the map: free the scenery, give the sky back
    S.useEffect(
      () => () => {
        if (!on) return;
        __rbUnloadView();
        __RB.bgScene && __RB.bgPrev !== void 0 && ((__RB.bgScene.background = __RB.bgPrev), (__RB.bgPrev = void 0));
      },
      [on],
    );
    // a quality change keeps the current scenery on screen until the new one is ready
    const v = on ? __RB.view : null;
    QI((s) => {
      if (v)
        try {
          __rbFrame(v, s);
        } catch (e) {}
    });
    return M.jsxs(M.Fragment, { children: [M.jsx(prevTrees, {}), v ? M.jsx('primitive', { object: v.group }, 'rb-' + v.q) : null] });
  };
}
// Ridgeback is the default map: on desktops its models download and decode in the background while the
// menus are up (one at a time, so the menus stay smooth), and pressing Play only has to build the scenery.
// Phones and low-memory devices load it when a match starts instead.
function __rbPreload() {
    try {
      const z = Zw.getState(),
        desk = !(window.matchMedia && matchMedia('(pointer: coarse)').matches) && (navigator.deviceMemory || 8) >= 4;
      if (!desk || z.map !== 'ridgeback' || __RB.preloaded || __RB.view) return;
      __RB.preloaded = !0;
      __rbLoadData(() => {
        const D = __RB.data,
          q = __rbQuality(z.quality),
          files = new Set(['tunnels/tunnels.glb', 'structures/structures.glb', 'environment/water_creek.glb', 'environment/backdrop.glb', 'environment/sky.glb', 'grass/grass_clumps.glb', 'grass/grass_instances.glb', q === 'low' ? 'materials/terrain_materials_lq.glb' : 'materials/terrain_materials_hq.glb']);
        for (const c of D.chunks) files.add(`terrain/terrain_${c.id}_lod0.glb`), files.add(`terrain/terrain_${c.id}_lod1.glb`);
        for (const a of Object.values(D.assets)) for (const f of [...(a.lods || [a.file]), a.lod1]) f && files.add(f);
        __rbLoadCollision();
        __rbJSON('data/props.json').catch(() => {});
        const list = [...files];
        const next = () => {
          const f = list.shift();
          if (!f) return;
          // a match on another map started: stop (its own models come first)
          if (eA.state && !eA.attract && aw().id !== 'ridgeback') return;
          __rbGLB(f).then(
            () => setTimeout(next, 30),
            () => setTimeout(next, 30),
          );
        };
        next();
      });
    } catch (e) {}
}
if (typeof window < 'u') {
  __glbAfter(__rbPreload, 1500);
  // back in the menus with Ridgeback selected (after its models were released on leaving it): again
  Zw.subscribe((s) => s.screen === 'menu' && s.map === 'ridgeback' && !__RB.preloaded && setTimeout(__rbPreload, 3e3));
}
// minimap: the package's top-down radar image (data/radar.png: image top = north, the whole 200 m map)
{
  const coreRadar = hV;
  hV = function () {
    const c = coreRadar.apply(this, arguments);
    if (!aw().__terrain || typeof Image > 'u') return c;
    const draw = (img) => {
      const x = c.getContext('2d');
      x.save();
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, c.width, c.height);
      x.globalAlpha = 0.9;
      x.drawImage(img, 0, 0, c.width, c.height);
      x.restore();
    };
    if (__RB.radar) draw(__RB.radar);
    else {
      // the minimap keeps this canvas: drawing into it once the image arrives updates the minimap
      const img = new Image();
      img.onload = () => ((__RB.radar = img), draw(img));
      img.src = __RB.base + 'data/radar.png';
    }
    return c;
  };
}
// bullet holes: the terrain and rocks are not boxes; on this map accept the physics hit as the surface
{
  const coreSurf = __impSurface;
  __impSurface = function (p, n) {
    const r = coreSurf.apply(this, arguments);
    if (r || !aw().__terrain) return r;
    const l = Math.hypot(n.x, n.y, n.z) || 1;
    return { p: { x: p.x, y: p.y, z: p.z }, n: { x: n.x / l, y: n.y / l, z: n.z / l }, box: null };
  };
}
typeof window < 'u' && (window.__bpRbGroup = () => __RB.view && __RB.view.group);
typeof window < 'u' && (window.__bpRidgeback = () => ({ collision: !!__RB.col, data: !!__RB.data, view: !!__RB.view, stats: __RB.stats, ground: (x, z) => __rbGround(x, z) }));
// ---------------------------------------------------------------- map list
// Dune Market, Dry Gulch, Reactor, Cell Block and the Firing Range are retired: off the map list, and a
// saved choice of one of them (or of the firing range mode) moves to Ridgeback Pass / team deathmatch.
for (const id of ['sandstorm', 'dustbowl', 'reactor', 'cellblock', 'range']) {
  const i = BD.findIndex((x) => x.id === id);
  i >= 0 && BD.splice(i, 1);
}
delete Eg.range;
try {
  const fix = (s) => {
    BD.some((b) => b.id === s.map) || s.setup({ map: 'ridgeback' });
    s.mode === 'range' && s.setup({ mode: 'tdm' });
  };
  fix(Zw.getState());
  Zw.subscribe(fix);
} catch (e) {}
