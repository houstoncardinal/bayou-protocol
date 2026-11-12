/* ===== Bayou Protocol mod: smooth frames and lean memory ===== */
// 1. Memory leak: every time the first-person weapon was rebuilt (switching guns, buying, respawning), the
//    old procedurally built gun and arms stayed in GPU memory: about 100 geometries per switch, so after
//    a few dozen switches the game carried thousands of dead buffers and kept getting slower. The previous
//    viewmodel's own geometry and materials are now freed when the next one is built.
// 2. Shader hitches: three.js read every new shader's compile log on first use, which makes the browser
//    wait for the GPU driver to finish compiling (tens of ms each on real hardware: a visible hitch the
//    first time any gun, effect or character appears). That check is off (it only matters while
//    developing; add ?debug to the URL to turn it back on), and every weapon (first and third person),
//    casing and effect is compiled in the background while a map loads, a little at a time.
// 3. Smaller downloads: all models are meshopt-compressed (tools/optimize-models.mjs). The decoder is
//    registered with every model loader here; loading waits for it (a few milliseconds at start-up).
// 4. Less GPU work for things far away:
//    - characters: two lower-detail versions of every character mesh (40% and 15% of the triangles),
//      made in the background with meshoptimizer's simplifier and sharing the same skeleton, vertices and
//      materials, so animation, hitboxes and wounds are unaffected. Beyond 14 m and 30 m from the camera
//      the lighter version is drawn (and casts the shadow).
//    - guns held by other players: the third-person gun is a simplified copy (about a third of the
//      triangles of the detailed first-person models it comes from).
// 5. Everything a match needs (all characters, the shared animations) is fetched while you are in the
//    menus, so nothing has to load and pop in when the round starts.
const __MO = { dec: null, simp: null, ready: null };
typeof window < 'u' &&
  (__MO.ready = import('meshoptimizer')
    .then(async (m) => {
      await m.MeshoptDecoder.ready;
      __MO.dec = m.MeshoptDecoder;
      await m.MeshoptSimplifier.ready;
      __MO.simp = m.MeshoptSimplifier;
    })
    .catch((e) => console.warn('[smooth] meshoptimizer', e)));
// ---------------------------------------------------------------- 3. meshopt decoder on every loader
{
  const coreParse = nu.prototype.parse;
  nu.prototype.parse = function (...args) {
    if (__MO.dec || !__MO.ready) {
      __MO.dec && !this.meshoptDecoder && this.setMeshoptDecoder(__MO.dec);
      return coreParse.apply(this, args);
    }
    __MO.ready.then(() => {
      __MO.dec && !this.meshoptDecoder && this.setMeshoptDecoder(__MO.dec);
      coreParse.apply(this, args);
    });
  };
}
// ---------------------------------------------------------------- 2. shader compile checks off
{
  const debug = typeof location < 'u' && /[?&]debug\b/.test(location.search);
  const CoreRenderer = PZ;
  PZ = class extends CoreRenderer {
    constructor(...a) {
      super(...a);
      this.debug.checkShaderErrors = debug;
    }
  };
}
// ---------------------------------------------------------------- 1. viewmodel leak
const __VMO = { prev: null };
function __vmIds() {
  const g = new uw(),
    m = new Ni(),
    r = [g.id, m.id];
  g.dispose();
  m.dispose();
  return r;
}
function __vmRelease() {
  const p = __VMO.prev;
  __VMO.prev = null;
  if (!p) return;
  for (const g of p.geos) g.dispose();
  for (const m of p.mats) m.dispose();
}
{
  const coreRigFor = __rigFor;
  __rigFor = function () {
    __vmRelease(); // the core removes the old viewmodel and asks for a new one: free the old one first
    return coreRigFor.apply(this, arguments);
  };
  const coreVm = xu;
  xu = function () {
    const [g0, m0] = __vmIds(),
      r = coreVm.apply(this, arguments);
    try {
      const own = { geos: new Set(), mats: new Set() };
      r.group.traverse((o) => {
        o.geometry && o.geometry.id > g0 && own.geos.add(o.geometry);
        for (const m of [].concat(o.material || [])) m && m.id > m0 && own.mats.add(m);
      });
      __VMO.prev = own;
    } catch (e) {}
    return r;
  };
}
// ---------------------------------------------------------------- 4. simplified geometry
const __LOD = { geo: new WeakMap(), queue: [], busy: !1, chars: new Set() };
// index buffers at the given triangle ratios for a geometry; null until made (made in the background)
function __lodIndices(geo, ratios, err) {
  const key = ratios.join(',');
  let e = __LOD.geo.get(geo);
  e || __LOD.geo.set(geo, (e = {}));
  if (e[key] !== void 0) return e[key];
  if (!e['q' + key]) {
    e['q' + key] = 1;
    __LOD.queue.push(() => {
      try {
        const P = geo.attributes.position,
          n = P.count,
          pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) (pos[i * 3] = P.getX(i)), (pos[i * 3 + 1] = P.getY(i)), (pos[i * 3 + 2] = P.getZ(i));
        const src = geo.index ? new Uint32Array(geo.index.array) : Uint32Array.from({ length: n }, (_, i) => i);
        e[key] = ratios.map((r) => {
          const target = Math.max(3, Math.floor((src.length * r) / 3) * 3);
          const [out] = __MO.simp.simplify(src, pos, 3, target, err, ['LockBorder']);
          return out.length < src.length * 0.92 ? new gi(n < 65536 ? new Uint16Array(out) : out, 1) : null;
        });
      } catch (x) {
        e[key] = null;
      }
    });
    __lodPump();
  }
  return void 0;
}
function __lodPump() {
  if (__LOD.busy || !__LOD.queue.length) return;
  if (!__MO.simp) return void (__MO.ready && __MO.ready.then(__lodPump));
  __LOD.busy = !0;
  const run = () => {
    const job = __LOD.queue.shift();
    job && job();
    __LOD.busy = !1;
    __lodPump();
  };
  typeof requestIdleCallback == 'function' ? requestIdleCallback(run, { timeout: 500 }) : setTimeout(run, 30);
}
const __lodGeo = (geo, index) => {
  const g = new uw();
  for (const k in geo.attributes) g.setAttribute(k, geo.attributes[k]);
  g.setIndex(index);
  g.boundingSphere = geo.boundingSphere;
  g.boundingBox = geo.boundingBox;
  return g;
};
// characters: LOD meshes next to each skinned mesh, sharing its skeleton
function __lodChar(s) {
  if (s.userData.__lod) return s.userData.__lod;
  const meshes = [];
  s.traverse((o) => o.isSkinnedMesh && !o.userData.lod && meshes.push(o));
  // only build once every mesh's simplified versions exist (they are made in the background)
  const all = meshes.map((m) => __lodIndices(m.geometry, [0.4, 0.15], 0.02));
  if (all.some((x) => x === void 0)) return null;
  const sets = [];
  for (const [mi, m] of meshes.entries()) {
    const ix = all[mi];
    if (!ix || !ix[0]) continue;
    m.boundingSphere || m.computeBoundingSphere();
    const levels = ix.map((index) => {
      if (!index) return null;
      const lm = new m.constructor(__lodGeo(m.geometry, index), m.material);
      lm.bindMode = m.bindMode;
      lm.bind(m.skeleton, m.bindMatrix);
      lm.position.copy(m.position);
      lm.quaternion.copy(m.quaternion);
      lm.scale.copy(m.scale);
      lm.boundingSphere = m.boundingSphere;
      lm.castShadow = m.castShadow;
      lm.receiveShadow = m.receiveShadow;
      lm.frustumCulled = m.frustumCulled;
      lm.renderOrder = m.renderOrder;
      lm.userData.lod = !0;
      lm.userData.noWound = !0;
      lm.visible = !1;
      m.parent.add(lm);
      return lm;
    });
    sets.push([m, ...levels]);
  }
  return (s.userData.__lod = { sets, level: 0 });
}
function __lodSelect(s, K) {
  const cam = __R3F && __R3F.camera;
  if (!cam || !s.userData.bpChar) return;
  const L = __lodChar(s);
  if (!L) return;
  const d = Math.hypot(cam.position.x - K.position.x, cam.position.y - K.position.y - 1, cam.position.z - K.position.z),
    cur = L.level,
    // hysteresis so a character on a boundary does not flicker between levels
    lvl = cur === 0 ? (d > 15 ? (d > 31 ? 2 : 1) : 0) : cur === 1 ? (d < 13 ? 0 : d > 31 ? 2 : 1) : d < 29 ? (d < 13 ? 0 : 1) : 2;
  if (lvl === cur && L.applied) return;
  L.level = lvl;
  L.applied = !0;
  for (const set of L.sets) {
    const pick = set[lvl] ? lvl : set[1] && lvl === 2 ? 1 : 0;
    set.forEach((m, i) => m && (m.visible = i === pick));
  }
}
{
  const prev = __locoAfter;
  __locoAfter = function (s, v, K) {
    prev.apply(this, arguments);
    try {
      s && s.userData && __lodSelect(s, K);
    } catch (e) {}
  };
}
// third-person guns: a simplified copy of every mesh over 2,500 triangles
{
  const coreHd = Hd;
  Hd = function () {
    const B = coreHd.apply(this, arguments);
    try {
      B.traverse((o) => {
        if (!o.isMesh || o.isSkinnedMesh || !o.geometry.index || o.geometry.index.count < 7500) return;
        const ix = __lodIndices(o.geometry, [0.35], 0.004);
        if (!ix || !ix[0]) return;
        const e = __LOD.geo.get(o.geometry);
        o.geometry = e.tp || (e.tp = __lodGeo(o.geometry, ix[0]));
      });
    } catch (e) {}
    return B;
  };
}
// ---------------------------------------------------------------- 2b. background shader compile
const __WARM = { done: new Set(), queue: [], key: '', t: 0, veg: 0 };
// backdrop plants (instanced, outside the walls): swap in the simplified geometry once it exists
function __farVeg(scene) {
  scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.userData.farVeg || o.userData.farDone || !o.geometry.index) return;
    const ix = __lodIndices(o.geometry, [0.35], 0.01);
    if (ix === void 0) return;
    o.userData.farDone = !0;
    if (ix && ix[0]) {
      const e = __LOD.geo.get(o.geometry);
      o.geometry = e.far || (e.far = __lodGeo(o.geometry, ix[0]));
    }
  });
}
function __warmTick(g) {
  const now = performance.now();
  if (now - __WARM.t < 120) return;
  __WARM.t = now;
  if (now - __WARM.veg > 1000) {
    __WARM.veg = now;
    __farVeg(g.scene);
  }
  // (re)build the list when the map or the loaded models change
  const key = (eA.state ? aw().id || '' : '') + ':' + Gc;
  if (key !== __WARM.key) {
    __WARM.key = key;
    const list = [];
    for (const k in __RIG) {
      const c = __RIG[k];
      c && c.rig && c.rig.wrap && list.push(c.rig.wrap);
    }
    for (const k in __XG) __XG[k] && __XG[k].tpl && list.push(__XG[k].tpl);
    typeof __BRASS < 'u' && __BRASS.pool[0] && list.push(...Object.values(__BRASS_TYPES).filter((t) => t.geo).map((t) => new Ow(t.geo, t.mat)));
    __WARM.queue = list.filter((o) => !__WARM.done.has(o.uuid + key));
  }
  const o = __WARM.queue.shift();
  if (!o || !g.gl.compileAsync) return;
  __WARM.done.add(o.uuid + __WARM.key);
  try {
    o.updateMatrixWorld(!0);
    g.gl.compileAsync(o, g.camera, g.scene).catch(() => {});
  } catch (e) {}
}
{
  const coreDet = __detTick;
  __detTick = function (g) {
    try {
      eA.state && __warmTick(g);
    } catch (e) {}
    return coreDet.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- 5. fetch match assets in the menus
typeof window < 'u' &&
  setTimeout(() => {
    const urls = [];
    for (const [f, list] of Object.entries(__CHAR.files)) for (const n of list) urls.push(__CHAR.base + f + '/' + n + '.glb');
    let i = 0;
    const next = () => {
      if (i >= urls.length) return;
      try {
        Jd.preload(r$, urls[i++]);
      } catch (e) {}
      typeof requestIdleCallback == 'function' ? requestIdleCallback(next, { timeout: 1500 }) : setTimeout(next, 400);
    };
    next();
  }, 2500);
typeof window < 'u' &&
  (window.__bpSmooth = () => ({
    lodQueue: __LOD.queue.length,
    warmQueue: __WARM.queue.length,
    warmed: __WARM.done.size,
    viewmodelOwned: __VMO.prev ? __VMO.prev.geos.size : 0,
    decoder: !!__MO.dec,
    simplifier: !!__MO.simp,
  }));
typeof window < 'u' && (window.__bpScene = () => __R3F && __R3F.scene);
// ---------------------------------------------------------------- frame rate readout (Settings > Video)
const __FPS = { el: null, n: 0, t: 0, worst: 0, last: 0 };
{
  const S = eA.settings;
  S.showFps === void 0 && (S.showFps = !1);
}
function __fpsFrame() {
  const now = performance.now();
  if (__FPS.last) __FPS.worst = Math.max(__FPS.worst, now - __FPS.last);
  __FPS.last = now;
  __FPS.n++;
  if (now - __FPS.t < 500) return;
  const on = eA.settings.showFps && Zw.getState().screen === 'playing';
  if (on && !__FPS.el) {
    __FPS.el = document.createElement('div');
    __FPS.el.className = 'bp-fps';
    __FPS.el.style.cssText = 'position:fixed;top:6px;left:50%;transform:translateX(150px);z-index:50;font:600 11px/1 ui-monospace,monospace;color:#cfe9d4;background:rgba(10,14,18,.55);padding:4px 7px;border-radius:5px;pointer-events:none;letter-spacing:.02em';
    document.body.appendChild(__FPS.el);
  }
  if (__FPS.el) {
    __FPS.el.style.display = on ? '' : 'none';
    on && (__FPS.el.textContent = `${Math.round((__FPS.n * 1000) / (now - __FPS.t))} FPS · worst ${__FPS.worst.toFixed(0)} ms`);
  }
  __FPS.n = 0;
  __FPS.t = now;
  __FPS.worst = 0;
}
{
  const coreDet = __detTick;
  __detTick = function () {
    try {
      __fpsFrame();
    } catch (e) {}
    return coreDet.apply(this, arguments);
  };
}
function __FpsRow({ row }) {
  const [on, set] = S.useState(!!eA.settings.showFps);
  return M.jsx(row, {
    label: 'Show frame rate',
    desc: 'Frames per second and the slowest frame in the last half second, at the top of the screen.',
    children: M.jsx(jI, {
      label: 'Show frame rate',
      on,
      onChange: (v) => {
        eA.settings.showFps = v;
        eA.saveSettings();
        set(v);
      },
    }),
  });
}
{
  const coreRow = rw;
  rw = function (p) {
    const r = coreRow(p);
    return p.label === 'Dynamic resolution' ? M.jsxs(M.Fragment, { children: [r, M.jsx(__FpsRow, { row: coreRow })] }) : r;
  };
}
