/* ===== Bayou Protocol mod: GPU memory stays flat over a long session ===== */
// Measured before this: every match left GPU resources behind, so a session got heavier the longer it ran
// (Blackwater: ~150 textures and ~100 geometries a match; ten matches, ~1,500 textures). What leaked, and
// what happens now:
//   - bone textures: every animated character (cloned per match) gets a small texture holding its skeleton;
//     nothing released it. Skeletons no longer on screen give theirs back (three.js makes it again if one
//     returns)
//   - canvas textures (signs, labels, decals drawn on a canvas) made per match: released when the scene no
//     longer uses them (re-uploaded automatically if they come back)
//   - third-person guns: the core caches each gun model under a key that changes whenever any model finishes
//     loading, keeping every older version; the older version of the same gun is now released, and the cache
//     (one model per gun and attachment combination) is kept to 40, dropping ones nothing on screen uses
//   - character low-detail meshes: shared per model instead of one per character (42-smooth.js)
//   - Ridgeback Pass: its models and textures are released when you leave the map (53b-ridgeback.js)
// Sweeps run a few seconds after a match ends (once the menu scene is built) and every 30 s.
const __MEM = { skel: new Set(), canvas: new Set(), stale: [], sweeps: 0, freed: { skel: 0, canvas: 0, gun: 0 } };
{
  const coreBones = rQ.prototype.computeBoneTexture;
  rQ.prototype.computeBoneTexture = function () {
    __MEM.skel.add(this);
    return coreBones.apply(this, arguments);
  };
  const coreListen = Fi.prototype.addEventListener;
  Fi.prototype.addEventListener = function (type) {
    // the renderer listens for 'dispose' when it uploads a texture
    type === 'dispose' && this.isCanvasTexture && __MEM.canvas.add(this);
    return coreListen.apply(this, arguments);
  };
}
// older cached versions of a third-person gun
{
  const prevHd = Hd;
  Hd = function (w, A) {
    try {
      const pre = `${w}:${+A.optic}${+A.suppressor}${+A.extmag}:`,
        key = pre + Gc;
      if (!fV.has(key))
        for (const [k, v] of fV)
          if (k !== key && k.startsWith(pre)) {
            fV.delete(k);
            __MEM.stale.push({ group: v.group, at: performance.now() });
          }
    } catch (e) {}
    return prevHd.apply(this, arguments);
  };
}
function __memSweep(full) {
  const g = typeof __R3F < 'u' && __R3F;
  if (!g || !g.scene) return;
  __MEM.sweeps++;
  const skel = new Set(),
    tex = new Set();
  g.scene.traverse((o) => {
    o.isSkinnedMesh && o.skeleton && skel.add(o.skeleton);
    if (!full) return;
    for (const m of [].concat(o.material || [])) for (const k in m) m[k] && m[k].isTexture && tex.add(m[k]);
  });
  // the first-person view is a scene of its own
  const vm = (typeof window < 'u' && window.__vmScene) || (typeof __SPD < 'u' && __SPD.vm);
  vm && vm.traverse((o) => o.isSkinnedMesh && o.skeleton && skel.add(o.skeleton));
  for (const s of __MEM.skel)
    if (!skel.has(s)) {
      __MEM.skel.delete(s);
      s.boneTexture && (s.dispose(), __MEM.freed.skel++);
    }
  if (full) {
    g.scene.background && g.scene.background.isTexture && tex.add(g.scene.background);
    for (const t of __MEM.canvas)
      if (!tex.has(t)) {
        __MEM.canvas.delete(t);
        t.dispose();
        __MEM.freed.canvas++;
      }
  }
  // the gun cache holds one model per gun and attachment combination met so far (up to ~100): above 40,
  // the oldest that nothing on screen uses are released
  if (fV.size > 40) {
    const used = new Set();
    g.scene.traverse((o) => o.isMesh && used.add(o.geometry));
    for (const [k, v] of fV) {
      if (fV.size <= 40) break;
      let inUse = !1;
      v.group.traverse((o) => {
        if (!o.isMesh) return;
        const e = typeof __LOD < 'u' && __LOD.geo.get(o.geometry);
        (used.has(o.geometry) || (e && e.tp && used.has(e.tp))) && (inUse = !0);
      });
      if (inUse) continue;
      fV.delete(k);
      __MEM.stale.push({ group: v.group, at: 0 });
    }
  }
  // old gun versions: their geometry (and its simplified copy) once no character holds them any more
  const now = performance.now();
  __MEM.stale = __MEM.stale.filter((x) => {
    if (now - x.at < 5e3) return !0;
    x.group.traverse((o) => {
      if (!o.isMesh) return;
      const e = typeof __LOD < 'u' && __LOD.geo.get(o.geometry);
      e && e.tp && e.tp.dispose();
      o.geometry.dispose();
    });
    __MEM.freed.gun++;
    return !1;
  });
}
if (typeof window < 'u') {
  let was = '';
  Zw.subscribe((s) => {
    const now = s.screen;
    // a match ended: sweep once the menu's own scene is in place
    was === 'playing' && now !== 'playing' && setTimeout(() => __memSweep(!0), 4e3);
    was = now;
  });
  setInterval(() => {
    try {
      __memSweep(!1);
    } catch (e) {}
  }, 3e4);
  window.__bpMem = () => ({ ...__MEM.freed, sweeps: __MEM.sweeps, trackedSkeletons: __MEM.skel.size, trackedCanvas: __MEM.canvas.size, gunKey: Gc, gunCache: fV.size });
}
