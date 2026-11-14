/* ===== Bayou Protocol mod: crate models ===== */
// Every crate the maps build (the plaza and market stacks, the warehouse rows, the prison stores) is drawn
// with the downloaded crate models instead of a wood-coloured box with plank trim. Colliders, cover, bullet
// penetration and the minimap are untouched: only the look changes.
//   - most crates: "Crate box" (one textured crate, 218 triangles) fitted to the crate's size, turned a
//     quarter turn at random and tinted towards the colour the map gave it (olive on the military maps)
//   - about one in four: a stack of "Secure box crates" (six printed variants: plain, Top Secret, Handle with
//     care ...), two side by side and as many high as fit
//   - a few: a stack of TNT crates (the bolts, 6,000 tiny triangles, are left out)
//   - the breakable crates (prison stores) use the crate box model too; they still break into planks
//   - the prison storage corner gets the "Crates and barrels" set (with its own collider, 35-prison.js)
// All instances of a model share one draw call per material (InstancedMesh). Until the models load, plain
// boxes stand in.
const __CR = {
  urls: { box: './game/models/props/crate-box.glb', secure: './game/models/props/secure-crates.glb', tnt: './game/models/props/tnt-crate.glb', set: './game/models/props/crates-barrels.glb' },
  models: {},
  loading: !1,
  rev: 0,
  subs: new Set(),
  fallback: null,
  last: null,
};
// geometry in world units: positions/normals as floats (the files store them quantised and normalised,
// which cannot hold values outside -1..1)
function __crFloat(geo, M) {
  const g = new uw();
  for (const [k, a] of Object.entries(geo.attributes)) {
    if (k !== 'position' && k !== 'normal' && k !== 'uv') continue;
    const n = a.count,
      s = a.itemSize,
      out = new Float32Array(n * s);
    for (let i = 0; i < n; i++) {
      out[i * s] = a.getX(i);
      s > 1 && (out[i * s + 1] = a.getY(i));
      s > 2 && (out[i * s + 2] = a.getZ(i));
    }
    g.setAttribute(k, new gi(out, s));
  }
  geo.index && g.setIndex(Array.from(geo.index.array));
  g.applyMatrix4(M);
  return g;
}
// meshes picked from a loaded model, baked into one frame and normalised to a unit box: x and z centred,
// y from 0 to 1. `size` keeps the real proportions.
function __crPrep(scene, pick) {
  scene.updateMatrixWorld(!0);
  const parts = [];
  scene.traverse((o) => o.isMesh && (!pick || pick(o)) && parts.push({ geo: __crFloat(o.geometry, o.matrixWorld), mat: o.material }));
  const b = new xi();
  for (const p of parts) p.geo.computeBoundingBox(), b.union(p.geo.boundingBox);
  const c = b.getCenter(new U()),
    s = b.getSize(new U()),
    M = new _A().makeScale(1 / s.x, 1 / s.y, 1 / s.z).multiply(new _A().makeTranslation(-c.x, -b.min.y, -c.z));
  for (const p of parts) {
    p.geo.applyMatrix4(M);
    p.geo.computeBoundingBox();
    p.geo.computeBoundingSphere();
    const ms = Array.isArray(p.mat) ? p.mat : [p.mat];
    for (const m of ms) (m.side = 0), (m.envMapIntensity = 1);
  }
  return { parts, size: s };
}
function __crLoad() {
  if (__CR.loading || typeof window > 'u') return;
  __CR.loading = !0;
  const done = () => {
    __CR.rev++;
    for (const f of __CR.subs) f(__CR.rev);
  };
  for (const [k, url] of Object.entries(__CR.urls))
    __glbParse(
      url,
      (g) => {
        try {
          if (k === 'secure') {
            // six crates in a row: each is its own variant (the seventh repeats the first)
            const ms = [];
            g.scene.traverse((o) => o.isMesh && ms.push(o));
            __CR.models.secure = ms.slice(0, 6).map((o) => __crPrep(g.scene, (x) => x === o));
          } else if (k === 'tnt') __CR.models.tnt = __crPrep(g.scene, (o) => !/bulloni/i.test([].concat(o.material).map((m) => m.name).join()));
          else if (k === 'set') __CR.models.set = __crPrep(g.scene);
          else __CR.models.box = __crPrep(g.scene);
          done();
        } catch (e) {
          console.warn('[crates] ' + k, e);
        }
      },
      (e) => console.warn('[crates] load ' + k, e),
    );
}
const __crHash = (x, z, k = 0) => {
  const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
  return v - Math.floor(v);
};
// the instances for a map: { model part -> [matrix, colour] }
function __crPlan(m) {
  const out = new Map(),
    q = new Kw(),
    Y = new U(0, 1, 0),
    put = (model, i, pos, yaw, scl, col) => {
      for (const p of model.parts) {
        let a = out.get(p);
        a || out.set(p, (a = []));
        a.push({ m: new _A().compose(pos, q.setFromAxisAngle(Y, yaw).clone(), scl), c: col, i });
      }
    },
    M = __CR.models,
    white = new UA(1, 1, 1);
  let i = 0;
  for (const c of m.crates || []) {
    i++;
    const r = __crHash(c.x, c.z),
      r2 = __crHash(c.x, c.z, 1),
      stack = (model, unit) => {
        // two side by side (along z), as many high as keep each close to its own proportions
        const n = Math.max(1, Math.round(c.h / (c.s * unit))),
          h = c.h / n;
        for (let k = 0; k < n; k++)
          for (const side of [-1, 1]) {
            const mdl = Array.isArray(model) ? model[Math.floor(__crHash(c.x + k, c.z + side, 2) * model.length)] : model;
            put(mdl, i, new U(c.x, c.y + k * h, c.z + (side * c.s) / 4), (__crHash(c.x, c.z + k * side, 3) < 0.5 ? 0 : Math.PI) + (r2 - 0.5) * 0.06, new U(c.s * 0.985, h * 0.995, (c.s / 2) * 0.97), white);
          }
      };
    if (M.secure && r < 0.26 && c.h <= 1.9) stack(M.secure, 0.55);
    else if (M.tnt && r >= 0.26 && r < 0.33 && c.h <= 1.6) stack(M.tnt, 0.5);
    else if (M.box) {
      const col = white.clone().lerp(new UA(c.color || '#a87b4f').multiplyScalar(1.55), 0.32);
      put(M.box, i, new U(c.x, c.y, c.z), Math.floor(r2 * 4) * (Math.PI / 2) + (r - 0.5) * 0.04, new U(c.s, c.h, c.s), col);
    }
  }
  for (const d of m.__crateSets || []) M.set && put(M.set, ++i, new U(d.x, d.y || 0, d.z), d.rotY || 0, new U(M.set.size.x, M.set.size.y, M.set.size.z), white);
  return out;
}
function __crBuild(m) {
  const g = new ji();
  g.name = 'bp-crates';
  const M = __CR.models;
  if (!M.box) {
    // stand-ins until the models arrive: plain wood boxes
    if (!(m.crates || []).length) return g;
    __CR.fallback || (__CR.fallback = { geo: new _i(1, 1, 1).translate(0, 0.5, 0), mat: new Gw({ color: '#9b7447', roughness: 0.85 }) });
    const im = new QZ(__CR.fallback.geo, __CR.fallback.mat, m.crates.length);
    m.crates.forEach((c, k) => im.setMatrixAt(k, new _A().compose(new U(c.x, c.y, c.z), new Kw(), new U(c.s, c.h, c.s))));
    im.castShadow = im.receiveShadow = !0;
    g.add(im);
    return g;
  }
  const plan = __crPlan(m);
  let tris = 0;
  for (const [p, list] of plan) {
    const im = new QZ(p.geo, p.mat, list.length);
    list.forEach((e, k) => (im.setMatrixAt(k, e.m), im.setColorAt(k, e.c)));
    im.instanceMatrix.needsUpdate = !0;
    im.instanceColor && (im.instanceColor.needsUpdate = !0);
    im.castShadow = im.receiveShadow = !0;
    im.computeBoundingSphere();
    im.userData.bpCrates = 1;
    g.add(im);
    tris += ((p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3) * list.length;
  }
  __CR.last = { map: m.id, crates: (m.crates || []).length, sets: (m.__crateSets || []).length, draws: g.children.length, instances: [...plan.values()].reduce((a, l) => a + l.length, 0), tris: Math.round(tris) };
  return g;
}
// ---------------------------------------------------------------- map building: record crates, hide boxes
{
  const coreCrate = Po.prototype.crate;
  Po.prototype.crate = function (x, z, s = 1.2, h = s, y = 0, color = '#a87b4f') {
    const v = this.m.visuals,
      n0 = v.length;
    coreCrate.call(this, x, z, s, h, y, color);
    for (let k = n0; k < v.length; k++) v[k].__crate = 1;
    (this.m.crates || (this.m.crates = [])).push({ x, z, s, h, y, color });
  };
  // the plank trim drawn around map crates
  const coreTrim = tJ;
  tJ = function (w) {
    const v = w.m.visuals,
      n0 = v.length;
    coreTrim.apply(this, arguments);
    for (let k = n0; k < v.length; k++) v[k].__crate = 1;
  };
  // the map's merged geometry leaves crates out (they are drawn here)
  const coreVis = tiA;
  tiA = function (w) {
    const all = w.visuals;
    w.visuals = all.filter((e) => !e.__crate && !e.__hidden);
    try {
      return coreVis.apply(this, arguments);
    } finally {
      w.visuals = all;
    }
  };
}
// breakable crates: the crate box model at the prop's size, centred on its body
{
  const coreGeo = __phxPropGeo;
  __phxPropGeo = function (type, def) {
    if (type === 'crate' && !__PD.geo.has('crate') && __CR.models.box) {
      const p = __CR.models.box.parts[0],
        [x, y, z] = def.box,
        geo = p.geo.clone().applyMatrix4(new _A().makeScale(x, y, z).multiply(new _A().makeTranslation(0, -0.5, 0))),
        mat = (Array.isArray(p.mat) ? p.mat[0] : p.mat).clone();
      mat.color.lerp(new UA(def.color).multiplyScalar(1.5), 0.25);
      __PD.geo.set('crate', { geo, mat });
    }
    return coreGeo.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- drawing
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw(),
      [rev, setRev] = S.useState(__CR.rev);
    S.useEffect(() => {
      __CR.subs.add(setRev);
      __crLoad();
      return () => __CR.subs.delete(setRev);
    }, []);
    const group = S.useMemo(() => {
      try {
        return __crBuild(m);
      } catch (e) {
        console.warn('[crates] build', e);
        return new ji();
      }
    }, [m, rev]);
    S.useEffect(
      () => () => {
        for (const o of group.children) o.dispose && o.dispose();
      },
      [group],
    );
    return M.jsxs(M.Fragment, { children: [M.jsx(prevTrees, {}), M.jsx('primitive', { object: group }, 'cr' + rev)] });
  };
}
typeof window < 'u' && (setTimeout(__crLoad, 300), (window.__bpCrates = () => ({ loaded: Object.keys(__CR.models), last: __CR.last, list: (aw().crates || []).map((c) => [c.x, c.z, c.s, c.h, c.y]) })));
