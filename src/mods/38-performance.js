/* ===== Bayou Protocol mod: performance ===== */
// - Static scenery instancing: vegetation placed around and inside maps was one cloned mesh per tree, cactus
//   and flower (up to ~800 draw calls on wooded maps, doubled by the shadow pass). Clones that share a mesh
//   and material are merged into one InstancedMesh each, so a whole ring of trees costs a handful of draw
//   calls. Trees with distance LODs (the fir pack) keep their LOD switching and are left as they are.
// - Shader warm-up: when a map's scene is up, every material is compiled in the background (compileAsync,
//   parallel where the GPU driver supports it) instead of stalling the first frame each new object is seen.
// - Backdrop trees outside the walls do not cast shadows (the sun never puts them between it and the play area).
// - Frame statistics for testing and tuning: window.__perf() (draw calls, triangles, lights, objects for the
//   whole last frame) and window.__perfBreakdown('tris' | 'meshes').
function __instanceStatic(g, m) {
  g.updateMatrixWorld(!0);
  const inv = new _A().copy(g.matrixWorld).invert(),
    groups = new Map(),
    drop = [];
  // plants outside the walls are only ever seen from 15+ m: their spines go and their geometry is
  // simplified once the simplifier has made a lighter version (42-smooth.js)
  const outside = (c) => m && (c.position.x < -2 || c.position.z < -2 || c.position.x > m.w + 2 || c.position.z > m.d + 2);
  for (const c of g.children) {
    if (c.type === 'LOD') continue;
    const far = outside(c);
    c.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
      for (let p = o.parent; p && p !== g; p = p.parent) if (p.type === 'LOD') return;
      if (far && /spine/i.test(o.name + ' ' + (o.material.name || ''))) return void drop.push(o);
      const k = o.geometry.uuid + '|' + o.material.uuid + '|' + (far ? 'far' : 'near');
      groups.has(k) || groups.set(k, []);
      groups.get(k).push(o);
    });
  }
  for (const o of drop) o.removeFromParent();
  let merged = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const im = new QZ(list[0].geometry, list[0].material, list.length);
    list.forEach((o, i) => im.setMatrixAt(i, new _A().multiplyMatrices(inv, o.matrixWorld)));
    im.castShadow = list[0].castShadow;
    im.receiveShadow = list[0].receiveShadow;
    im.name = 'instanced:' + (list[0].name || list[0].material.name || 'mesh');
    im.computeBoundingSphere();
    im.userData.farVeg = /\|far$/.test([...groups.entries()].find((e) => e[1] === list)[0]);
    g.add(im);
    for (const o of list) o.removeFromParent();
    merged += list.length;
  }
  // drop the now-empty wrapper groups
  const empty = [];
  g.traverse((o) => o !== g && !o.isMesh && o.type !== 'LOD' && !o.children.length && empty.push(o));
  for (const o of empty) o.removeFromParent();
  g.userData.instanced = merged;
  return g;
}
{
  const coreVeg = __vegBuild;
  __vegBuild = function (m) {
    const g = coreVeg(m);
    try {
      // backdrop trees outside the walls are never between the sun and the play area: no shadow pass
      for (const o of g.children)
        if (o.type === 'LOD' && (o.position.x < -2 || o.position.z < -2 || o.position.x > m.w + 2 || o.position.z > m.d + 2)) o.traverse((c) => (c.castShadow = !1));
      __instanceStatic(g, m);
    } catch (e) {
      console.warn('[perf] vegetation instancing', e);
    }
    return g;
  };
}
let __R3F = null;
const __FRAME = { calls: 0, triangles: 0 };
{
  const coreDet = __detTick;
  __detTick = function (g) {
    __R3F = g;
    // whole-frame totals: the renderer would otherwise reset its counters on every render pass
    const info = g.gl.info;
    info.autoReset && (info.autoReset = !1);
    __FRAME.calls = info.render.calls;
    __FRAME.triangles = info.render.triangles;
    info.reset();
    // a new map: compile its shaders in the background once the scene has been populated
    const m = eA.state ? aw() : null;
    if (m && m !== __FRAME.map) {
      __FRAME.map = m;
      clearTimeout(__FRAME.warm);
      __FRAME.warm = setTimeout(() => {
        try {
          g.gl.compileAsync && g.gl.compileAsync(g.scene, g.camera).catch(() => {});
        } catch (e) {}
      }, 1200);
    }
    return coreDet.apply(this, arguments);
  };
}
typeof window < 'u' &&
  (window.__perf = () => {
    if (!__R3F) return null;
    const { gl, scene } = __R3F,
      info = gl.info,
      c = { meshes: 0, instanced: 0, skinned: 0, lights: 0, shadowLights: 0, visibleMeshes: 0 };
    scene.traverse((o) => {
      o.isMesh && (c.meshes++, o.visible && c.visibleMeshes++);
      o.isInstancedMesh && c.instanced++;
      o.isSkinnedMesh && c.skinned++;
      o.isLight && !o.isAmbientLight && !o.isHemisphereLight && (c.lights++, o.castShadow && c.shadowLights++);
    });
    return { calls: __FRAME.calls, triangles: __FRAME.triangles, programs: info.programs ? info.programs.length : 0, textures: info.memory.textures, geometries: info.memory.geometries, pixelRatio: gl.getPixelRatio(), ...c };
  });
// breakdown of visible triangles by top-level scene group (for finding what to optimise)
typeof window < 'u' &&
  (window.__perfBreakdown = (by = 'tris') => {
    if (!__R3F) return null;
    const out = {};
    const tri = (o) => {
      const g = o.geometry;
      if (!g) return 0;
      const n = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0;
      return (n / 3) * (o.isInstancedMesh ? o.count : 1);
    };
    const label = (o) => {
      const names = [];
      for (let p = o; p && p.type !== 'Scene' && names.length < 3; p = p.parent) p.name && names.push(p.name);
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      return (names.join('<') || '?') + ' | ' + o.geometry.type + ' | ' + ((mat && (mat.name || mat.type)) || '') + (o.isSkinnedMesh ? ' [skinned]' : o.isInstancedMesh ? ' [instanced]' : '');
    };
    __R3F.scene.traverseVisible((o) => {
      if (!o.isMesh) return;
      const k = label(o);
      out[k] = out[k] || { meshes: 0, tris: 0 };
      out[k].meshes++;
      out[k].tris += tri(o);
    });
    return Object.entries(out)
      .sort((a, b) => b[1][by] - a[1][by])
      .slice(0, 25)
      .map(([k, v]) => `${k}: ${v.meshes} meshes, ${Math.round(v.tris / 1000)}k tris`);
  });
// every map's data (tests and tools): [{ id, m }]
typeof window < 'u' && (window.__bpMaps = () => Object.keys(XE).map((id) => ({ id, m: vT(id) })));
// shader programs in use (tests): one key per compiled program
typeof window < 'u' && (window.__progs = () => (__R3F && __R3F.gl.info.programs ? __R3F.gl.info.programs.map((p) => p.name + ':' + p.cacheKey.length + ':' + p.cacheKey.slice(0, 160).replace(/,/g, ' ')) : []));
