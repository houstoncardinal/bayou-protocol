function __b64buf(u) {
  const s = atob(u.slice(u.indexOf(',') + 1)),
    b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b.buffer;
}
// Model loading queue. At start-up the game used to request ~30 models at once (every gun, crate, mask,
// character, the Ridgeback collision), which buried the few files the menu scene needs (its lighting
// environment arrived after 20 s, so every shader was compiled twice). Now:
//   - the menu's environment map is fetched first, the moment the page starts
//   - background model loads wait until the menu scene is lit (or 8 s, or a match starts)
//   - then at most 6 run at once (what a browser opens per server anyway), so the parse work is spread out
//   - a model asked for during a match goes to the front of the queue
const __GLQ = { q: [], active: 0, max: 6, open: !1, after: [], iv: null, t0: typeof performance < 'u' ? performance.now() : 0 };
function __glbGateCheck() {
  if (__GLQ.open) return !0;
  let lit = !1,
    playing = !1;
  try {
    lit = !!(__R3F && __R3F.scene && __R3F.scene.environment);
    playing = !!(eA.state && !eA.attract);
  } catch (e) {}
  if (!lit && !playing && performance.now() - __GLQ.t0 < 8000) return !1;
  __GLQ.open = !0;
  clearInterval(__GLQ.iv);
  for (const f of __GLQ.after.splice(0)) setTimeout(f, 0);
  __glbPump();
  return !0;
}
// run fn once the start-up loads are released (used for preloads elsewhere)
function __glbAfter(fn, delay = 0) {
  if (typeof window > 'u') return;
  const go = () => setTimeout(fn, delay);
  if (__GLQ.open) return go();
  __GLQ.after.push(go);
  __GLQ.iv || (__GLQ.iv = setInterval(__glbGateCheck, 150));
}
function __glbPump() {
  if (!__GLQ.open && !__glbGateCheck()) return void (__GLQ.iv || (__GLQ.iv = setInterval(__glbGateCheck, 150)));
  while (__GLQ.active < __GLQ.max && __GLQ.q.length) __GLQ.q.shift()();
}
function __glbParse(u, ok, err) {
  if (u.startsWith('data:'))
    try {
      return new nu().parse(__b64buf(u), '', ok, err);
    } catch (e) {
      return err && err(e);
    }
  const run = () => {
    __GLQ.active++;
    let fin = !1;
    const end = (f) => (...a) => {
      fin || ((fin = !0), __GLQ.active--, setTimeout(__glbPump, 0));
      f && f(...a);
    };
    try {
      new nu().load(u, end(ok), void 0, end(err));
    } catch (e) {
      end(err)(e);
    }
  };
  let urgent = !1;
  try {
    urgent = !!(eA.state && !eA.attract);
  } catch (e) {}
  urgent ? __GLQ.q.unshift(run) : __GLQ.q.push(run);
  __glbPump();
}
// the menu's lighting environment first (day / dusk / night)
typeof window < 'u' &&
  setTimeout(() => {
    try {
      const tod = Zw.getState().timeOfDay;
      Jd.preload(TwA, './game/env/env-0' + (tod === 'day' ? 1 : tod === 'night' ? 3 : 2) + '.bin');
    } catch (e) {}
  }, 0);
/* ===== Bayou Protocol mod: GLB weapon models ===== */
const __XG = {
  warden: {
    id: 'warden',
    url: './game/models/weapon-warden.glb',
    rotY: Math.PI,
    len: 0.205,
    grip: 0.14,
    gripTop: 0.73,
    gz: 0.022,
    fore: 0.5,
    sight: 0.97,
    fb: 'pistol',
  },
  bastion: {
    id: 'bastion',
    url: './game/models/weapon-bastion.glb',
    rotY: 0,
    len: 0.98,
    grip: 0.29,
    gripTop: 0.35,
    gz: 0.045,
    fore: 0.55,
    sight: 0.8,
    fb: 'br',
  },
  midas: {
    id: 'midas',
    url: './game/models/weapon-midas.glb',
    rotY: Math.PI / 2,
    len: 0.88,
    grip: 0.335,
    gripTop: 0.61,
    gz: 0.045,
    fore: 0.6,
    sight: 0.93,
    fb: 'ak47',
    gold: !0,
  },
  // (the Rampart 7.62 is retired: 93-arsenal.js)

};
function __xgPrep(scene, c) {
  scene.updateMatrixWorld(!0);
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const a = o.geometry;
    for (const k of Object.keys(a.attributes)) {
      const m = a.getAttribute(k);
      if (m.array instanceof Float32Array && !m.normalized) continue;
      const G = new Float32Array(m.count * m.itemSize);
      for (let z = 0; z < m.count; z++)
        for (let r = 0; r < m.itemSize; r++) G[z * m.itemSize + r] = m.getComponent(z, r);
      a.setAttribute(k, new gi(G, m.itemSize));
    }
  });
  const inner = new ji();
  inner.add(scene);
  inner.rotation.y = c.rotY;
  inner.rotation.x = c.rotX || 0;
  inner.updateMatrixWorld(!0);
  let b = new xi().setFromObject(inner);
  inner.scale.setScalar(c.len / (b.max.z - b.min.z));
  inner.updateMatrixWorld(!0);
  b = new xi().setFromObject(inner);
  const L = b.max.z - b.min.z,
    H = b.max.y - b.min.y,
    gz = b.max.z - c.grip * L,
    gy = b.min.y + c.gripTop * H;
  inner.position.set(-(b.min.x + b.max.x) / 2, -0.02 - gy, c.gz - gz);
  inner.updateMatrixWorld(!0);
  const tpl = new ji();
  tpl.name = 'xg_' + c.id;
  inner.traverse((o) => {
    if (!o.isMesh) return;
    const m = new Ow(o.geometry, o.material);
    o.matrixWorld.decompose(m.position, m.quaternion, m.scale);
    m.name = o.name;
    if (/^mag/.test(o.name)) m.userData.mag = !0;
    const mt = o.material;
    if (mt) {
      mt.envMapIntensity = c.gold ? 1.25 : 1;
    }
    m.castShadow = !0;
    m.receiveShadow = !0;
    tpl.add(m);
  });
  tpl.updateMatrixWorld(!0);
  b = new xi().setFromObject(tpl);
  // muzzle: average height of vertices in the front 2.5cm
  let sy = 0,
    n = 0;
  const v = new U();
  tpl.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      if (v.z < b.min.z + 0.025) {
        sy += v.y;
        n++;
      }
    }
  });
  const H2 = b.max.y - b.min.y;
  c.tpl = tpl;
  c.muzzle = new U(0, n ? sy / n : 0, b.min.z);
  c.foregrip = b.max.z - c.fore * (b.max.z - b.min.z);
  c.sightY = b.min.y + c.sight * H2 - 0.004;
}
function __xgBuild(w) {
  const c = __XG[w];
  if (!c || !c.tpl) return null;
  const g = c.tpl.clone(!0);
  return { group: g, muzzle: c.muzzle.clone(), foregrip: c.foregrip };
}
function __xgSight(w) {
  const c = __XG[w];
  return c && c.tpl ? c.sightY : null;
}
function __xgLoad() {
  if (typeof window > 'u' || typeof document > 'u') return;
  for (const k in __XG) {
    const c = __XG[k];
    __glbParse(
      c.url,
      (g) => {
        try {
          __xgPrep(g.scene, c);
          Gc += 1;
        } catch (e) {
          console.warn('[SWAT] model ' + k, e);
        }
      },
      (e) => console.warn('[SWAT] load ' + k, e),
    );
  }
}
__xgLoad();
window.__XG = __XG;
