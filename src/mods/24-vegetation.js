/* ===== Bayou Protocol mod: vegetation models (fir pack, conifer, cacti, daisies) ===== */
// Models live in public/game/models/veg/ (web-optimised copies of the source packs kept in assets-src/models:
// textures resized to 1024px/512px and converted to WebP, about 5x smaller to download).
//
// Where things go, by map setting:
//   desert   (Dune Market, Dry Gulch, Firing Range): saguaro clusters outside the walls, prickly pear
//            patches along walls on sand and dirt inside (low, no collision)
//   industrial (Reactor): a fir forest ring around the plant, fir trees in the existing tree spots,
//            daisies on grass
//   village  (Piazza, Italian hill town): cypress-style conifers in the existing tree spots, firs and
//            conifers on the hills outside, daisies in grass and planters
//   jungle   (Temple): keeps its broadleaf jungle trees; daisies along grassy banks
// Inside the playable area only existing tree spots (which already have a trunk collider) get trees,
// so routes and bot navigation are unchanged. Everything else inside is low ground cover.
const __VEG = {
  url: {
    fir: './game/models/veg/fir-pack.glb',
    conifer: './game/models/veg/conifer.glb',
    cacti: './game/models/veg/cacti.glb',
    daisy: './game/models/veg/daisies.glb',
  },
  tpl: {}, // loaded templates: fir:[{lods:[Object3D...], h}], conifer:[...], saguaro, pear, daisy:[...]
  loading: {},
  rev: 0,
  subs: new Set(),
};
function __vegRng(seed) {
  let a = seed | 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function __vegSetting(m) {
  if (m.id === 'range') return 'desert';
  if (m.id === 'piazza') return 'village';
  if (m.id === 'reactor' || m.backdrop === 'industrial') return 'industrial';
  return m.backdrop || 'none';
}
// ---------- placement plan (runs once per map when the map is built) ----------
function __vegFree(m, x, z, r) {
  for (const b of m.boxes) {
    if (b.max.y < 0.15) continue; // floors and kerbs are fine
    if (x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z) return !1;
  }
  return !0;
}
function __vegNearWall(m, x, z, d) {
  for (const b of m.boxes) {
    if (!b.solid || b.max.y < 1.2 || b.max.y - b.min.y < 1) continue;
    if (x + d > b.min.x && x - d < b.max.x && z + d > b.min.z && z - d < b.max.z) return !0;
  }
  return !1;
}
function __vegSurface(m, x, z) {
  try {
    return TE(m, x, 0.05, z);
  } catch {
    return '';
  }
}
function __vegPlan(m) {
  const set = __vegSetting(m),
    W = m.w,
    D = m.d,
    rnd = __vegRng((W * 73856093) ^ (D * 19349663) ^ (m.id || '').length * 83492791),
    out = [];
  const ring = (n, inner, outer, kinds) => {
    // decoration outside the playable area: never reachable, so no colliders needed
    for (let i = 0; i < n; i++) {
      const side = Math.floor(rnd() * 4),
        t = rnd(),
        off = inner + rnd() * (outer - inner);
      let x, z;
      side === 0
        ? ((x = -off), (z = t * D))
        : side === 1
          ? ((x = W + off), (z = t * D))
          : side === 2
            ? ((x = t * W), (z = -off))
            : ((x = t * W), (z = D + off));
      const k = kinds[Math.floor(rnd() * kinds.length)];
      out.push({ t: k, x, z, rot: rnd() * Math.PI * 2, s: 0.85 + rnd() * 0.4, v: Math.floor(rnd() * 9) });
    }
  };
  const ground = (n, r, test, kinds, tries = n * 30) => {
    let made = 0;
    for (let i = 0; i < tries && made < n; i++) {
      const x = 1 + rnd() * (W - 2),
        z = 1 + rnd() * (D - 2);
      if (!test(x, z) || !__vegFree(m, x, z, r)) continue;
      const k = kinds[Math.floor(rnd() * kinds.length)];
      out.push({ t: k, x, z, rot: rnd() * Math.PI * 2, s: 0.8 + rnd() * 0.45, v: Math.floor(rnd() * 9) });
      made++;
    }
  };
  const soft = (s) => s === 'grass' || s === 'moss' || s === 'earth' || s === 'dirt';
  if (set === 'desert') {
    ring(38, 6, 34, ['saguaro', 'saguaro', 'pear']);
    ground(18, 0.6, (x, z) => __vegNearWall(m, x, z, 1.1) && /dirt|gravel|earth|sand|asphalt|concrete/.test(__vegSurface(m, x, z) || 'dirt'), ['pear']);
  } else if (set === 'industrial') {
    ring(70, 5, 40, ['fir', 'fir', 'fir', 'conifer']);
    ground(26, 0.5, (x, z) => soft(__vegSurface(m, x, z)), ['daisy']);
  } else if (set === 'village') {
    ring(46, 6, 38, ['conifer', 'conifer', 'fir']);
    ground(34, 0.5, (x, z) => soft(__vegSurface(m, x, z)) || __vegNearWall(m, x, z, 0.8), ['daisy']);
  } else if (set === 'jungle') {
    ground(30, 0.5, (x, z) => soft(__vegSurface(m, x, z)), ['daisy']);
  }
  // existing tree spots (already have a trunk collider): swap to real models where the setting fits.
  // Swapped trees move to m.__vegTrees so the core tree layer stops drawing them; colliders stay.
  const keep = [],
    swap = [];
  for (const tr of m.trees) {
    let v = null;
    if (set === 'village') v = tr.kind === 2 ? 'fir' : 'conifer';
    else if (set === 'industrial') v = 'fir';
    else if (set === 'desert' && tr.kind === 2) v = 'fir';
    v ? swap.push({ ...tr, __veg: v }) : keep.push(tr);
  }
  m.trees = keep;
  m.__vegTrees = swap;
  m.__veg = out;
  m.__vegSet = set;
}
for (const id of Object.keys(XE)) {
  const f = XE[id];
  XE[id] = () => {
    const m = f();
    try {
      __vegPlan(m);
    } catch (e) {
      console.warn('[veg] plan', id, e);
      m.__veg = [];
    }
    return m;
  };
}
// ---------- loading ----------
function __vegPrepMats(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = !0;
    o.receiveShadow = !0;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const mt of ms) {
      if (!mt) continue;
      // foliage cards: alpha-test instead of blending, so they sort and shadow correctly
      if (mt.transparent || mt.alphaMap || (mt.map && /leaf|leaves|brunch|branch|billboard|daisy|spine|flower/i.test(mt.name || ''))) {
        mt.transparent = !1;
        mt.alphaTest = Math.max(mt.alphaTest || 0, 0.42);
        mt.depthWrite = !0;
      }
      if (/leaf|leaves|brunch|branch|billboard|daisy|flower/i.test(mt.name || '')) {
        // matte, double-sided foliage: no glossy sheen or sky reflections greying the needles
        mt.side = 2;
        'roughness' in mt && (mt.roughness = 1);
        'metalness' in mt && (mt.metalness = 0);
        'envMapIntensity' in mt && (mt.envMapIntensity = 0.45);
        'specularIntensity' in mt && (mt.specularIntensity = 0.15);
        mt.alphaTest = 0.5;
      }
    }
  });
}
// measure a node in world units, after the sketchfab root transforms are applied
function __vegBox(o) {
  o.updateMatrixWorld(!0);
  return new xi().setFromObject(o);
}
// re-root a sub-tree so its base sits at the origin, scaled to metres, keeping world orientation
function __vegExtract(node, wantH) {
  node.updateMatrixWorld(!0);
  const g = new ji(),
    c = node.clone(!0);
  c.matrixAutoUpdate = !1;
  c.matrix.copy(node.matrixWorld);
  c.matrix.decompose(c.position, c.quaternion, c.scale);
  c.matrixAutoUpdate = !0;
  g.add(c);
  const b = __vegBox(g),
    h = b.max.y - b.min.y || 1,
    k = wantH ? wantH / h : 1;
  const cx = (b.min.x + b.max.x) / 2,
    cz = (b.min.z + b.max.z) / 2;
  c.position.set((c.position.x - cx) * 1, c.position.y - b.min.y, (c.position.z - cz) * 1);
  const out = new ji();
  out.add(g);
  g.scale.setScalar(k);
  return { obj: out, h: h * k, w: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * k };
}
function __vegLoad(kind) {
  if (__VEG.loading[kind]) return;
  __VEG.loading[kind] = 1;
  const file = kind === 'saguaro' || kind === 'pear' ? 'cacti' : kind;
  if (file !== kind && __VEG.loading[file]) return;
  __VEG.loading[file] = 1;
  __glbParse(
    __VEG.url[file],
    (gl) => {
      try {
        const sc = gl.scene;
        __vegPrepMats(sc);
        sc.updateMatrixWorld(!0);
        if (file === 'fir') {
          // nine trees: "Large tree_1..3", "Medium tree_1..3", "Small tree_1..3", each with LOD0..LOD3
          const trees = [];
          sc.traverse((o) => {
            if (/^(Large|Medium|Small)[ _]tree_\d$/.test(o.name)) trees.push(o);
          });
          __VEG.tpl.fir = trees.map((t) => {
            // the pack is authored in metres (large ~9m, medium ~6m, small ~4m): keep natural sizes
            const lods = [...t.children].sort((a, b) => (a.name > b.name ? 1 : -1)).map((l) => __vegExtract(l, 0));
            return { lods: lods.map((l) => l.obj), h: lods[0].h };
          });
        } else if (file === 'conifer') {
          const e = __vegExtract(sc, 7.5);
          __VEG.tpl.conifer = [{ lods: [e.obj], h: 7.5 }];
        } else if (file === 'cacti') {
          const sag = [],
            pear = [];
          sc.traverse((o) => {
            if (!o.isMesh) return;
            (/prickly|spines 02|spines_02/i.test(o.name) ? pear : sag).push(o);
          });
          const pack = (list, h) => {
            const g = new ji();
            for (const o of list) {
              o.updateMatrixWorld(!0);
              const c = o.clone(!1);
              c.matrixAutoUpdate = !1;
              c.matrix.copy(o.matrixWorld);
              g.add(c);
            }
            // flatten the collected meshes into one node, then normalise it like the others
            const holder = new ji();
            holder.add(g);
            const b = new xi().setFromObject(holder),
              k = h / (b.max.y - b.min.y || 1);
            g.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
            const out = new ji();
            holder.scale.setScalar(k);
            out.add(holder);
            return out;
          };
          __VEG.tpl.saguaro = [{ lods: [pack(sag, 4.2)], h: 4.2 }];
          __VEG.tpl.pear = [{ lods: [pack(pear, 0.9)], h: 0.9 }];
        } else if (file === 'daisy') {
          const list = [];
          sc.traverse((o) => {
            if (/^Daisy_(\d|patch_(big|small)_\d)$/.test(o.name)) list.push(o);
          });
          __VEG.tpl.daisy = list.map((t) => {
            const lods = [...t.children].sort((a, b) => (a.name > b.name ? 1 : -1)).map((l) => __vegExtract(l, 0).obj);
            return { lods, h: 0.6 };
          });
        }
        __VEG.rev++;
        for (const f of __VEG.subs) f(__VEG.rev);
      } catch (e) {
        console.warn('[veg] prep ' + file, e);
      }
    },
    (e) => console.warn('[veg] load ' + file, e),
  );
}
// ---------- building instances ----------
const __vegLodDist = {
  fir: [0, 30, 60, 110],
  conifer: [0],
  saguaro: [0],
  pear: [0],
  daisy: [0, 10, 22],
};
function __vegMake(kind, v, s, rot) {
  const set = __VEG.tpl[kind];
  if (!set || !set.length) return null;
  const t = set[v % set.length];
  let o;
  if (t.lods.length > 1) {
    o = new U6();
    const ds = __vegLodDist[kind] || [0, 30, 60, 110];
    t.lods.forEach((l, i) => o.addLevel(l.clone(!0), ds[i] ?? ds[ds.length - 1] + 40 * i));
  } else o = t.lods[0].clone(!0);
  o.rotation.y = rot;
  o.scale.setScalar(s);
  return o;
}
// ground height outside the playable area: top of the backdrop terrain block (the same seeded hills the
// core draws around the map) under the point, so ring trees stand on the hills instead of inside them
const __vegBack = new Map();
function __vegBackdrop(m) {
  if (__vegBack.has(m)) return __vegBack.get(m);
  let n = [];
  try {
    const bd = m.backdrop;
    n =
      bd === 'desert'
        ? pm(m.w, m.d, ['#c79f6c', '#b98f5f', '#d4ae7a', '#a87f52'], 13, !0)
        : bd === 'jungle'
          ? pm(m.w, m.d, ['#4c6b3a', '#3f5c31', '#5a7a44', '#56704a'], 21, !1)
          : bd === 'industrial'
            ? ciA(m.w, m.d)
            : bd === 'village'
              ? pm(m.w, m.d, ['#8a9a62', '#7e8f58', '#9aa56c', '#c4a07a'], 5, !1)
              : [];
  } catch (e) {}
  __vegBack.set(m, n);
  return n;
}
function __vegTop(m, x, z) {
  let y = 0;
  for (const list of [__vegBackdrop(m), m.visuals, m.boxes])
    for (const b of list || []) {
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      if ((b.max.x - b.min.x) * (b.max.z - b.min.z) < 6) continue;
      b.max.y > y && b.max.y < 80 && (y = b.max.y);
    }
  return y;
}
function __vegBuild(m) {
  const g = new ji();
  g.name = 'bp-vegetation';
  const add = (kind, x, z, s, rot, v) => {
    const o = __vegMake(kind, v, s, rot);
    if (!o) return;
    let y = 0;
    try {
      y = x >= 0 && z >= 0 && x <= m.w && z <= m.d ? rm({ x, y: 30, z }) || 0 : __vegTop(m, x, z);
    } catch {}
    o.position.set(x, y, z);
    o.userData.veg = kind;
    g.add(o);
  };
  for (const p of m.__veg || []) {
    const sc = p.t === 'fir' ? 0.8 + (p.s - 0.85) : p.s;
    add(p.t, p.x, p.z, sc, p.rot, p.v);
  }
  for (const tr of m.__vegTrees || []) {
    // keep in-map trees close to the size the collider was made for (trunk box 4m * s)
    const sc = tr.__veg === 'fir' ? 0.55 * (tr.s || 1) : 0.75 * (tr.s || 1);
    add(tr.__veg, tr.x, tr.z, sc, ((tr.x * 13.7 + tr.z * 7.1) % 6.28) || 0, Math.floor(tr.x * 3 + tr.z * 5));
  }
  __VEG.items = g.children.map((o) => ({ k: o.userData.veg, x: o.position.x, y: o.position.y, z: o.position.z }));
  __VEG.last = { map: m.id, set: m.__vegSet, placed: g.children.length, planned: (m.__veg || []).length + (m.__vegTrees || []).length, w: m.w, d: m.d };
  return g;
}
function __vegKinds(m) {
  const k = new Set();
  for (const p of m.__veg || []) k.add(p.t);
  for (const tr of m.__vegTrees || []) k.add(tr.__veg);
  return k;
}
// ---------- renderer: replaces the core tree layer (kwA) ----------
{
  const coreTrees = kwA;
  kwA = function () {
    const m = aw(),
      [rev, setRev] = S.useState(__VEG.rev);
    S.useEffect(() => {
      __VEG.subs.add(setRev);
      return () => __VEG.subs.delete(setRev);
    }, []);
    const kinds = __vegKinds(m);
    S.useEffect(() => {
      for (const k of kinds) __vegLoad(k);
    }, [m]);
    const group = S.useMemo(() => {
      try {
        return __vegBuild(m);
      } catch (e) {
        console.warn('[veg] build', e);
        return new ji();
      }
    }, [m, rev]);
    return M.jsxs(M.Fragment, { children: [M.jsx(coreTrees, {}), M.jsx('primitive', { object: group }, rev)] });
  };
}
typeof window < 'u' && (window.__bpVeg = __VEG);
// ---------- credits for third-party assets added in mods ----------
wBA.push(
  ['Fir trees and daisies', '“Realistic fir trees pack” and “Daisy models pack” by LOLIPOP (sketchfab.com/lolipop_1707)', 'CC BY 4.0'],
  ['Conifer tree', '“Conifer Tree (high-poly)” by Sereib (sketchfab.com/Sereib)', 'CC BY 4.0'],
  ['Cacti', '“Cacti” by evolveduk (sketchfab.com/evolveduk)', 'Sketchfab Standard licence'],
  ['Gun sounds', '“Snake’s Authentic Gun Sounds” packs 1 and 2 by F8 Studios (f8studios.itch.io)', 'Free for commercial use'],
);
