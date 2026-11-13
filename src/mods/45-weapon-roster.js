/* ===== Bayou Protocol mod: model-based weapons only ===== */
// Every weapon in the game is now a real 3D model (GLB). The weapons that were built from code (a low-detail
// gun assembled from boxes and cylinders, held by code-built arms) are gone from the buy menu, loadouts, level
// unlocks, gun game and bot purchases:
//   P9 Pistol, Magnum .50, Viper SMG, Breaker 12, Vanguard AR, BR-7, Lancer SR, Hammer LMG, the old bolt sniper,
//   the flamethrower
// Anything that still asks for one (a saved loadout, a bot's buying table, an older online client) gets the
// closest model-based weapon instead (REMAP below). Their stats stay defined so old replays and online peers
// on older builds cannot crash anything; they just cannot be bought or spawned.
// The Kodiak (AK) and the knife had first-person models but a code-built gun in other players' hands; their
// third-person model is now lifted out of the same GLB (the gun parts without the arms), like the five
// animated weapons.
// Utility (frag, flash, smoke, molotov) is unchanged.
const __ROSTER = {
  REMAP: { pistol: 'kestrel', deagle: 'warden', smg: 'hornet', shotgun: 'mauler', rifle: 'sentinel', br: 'rampart', m16: 'hk416', lmg: 'anvil', sniper: 'phantom', flamer: 'anvil', rpg: 'anvil' },
  LADDER: ['kestrel', 'striker', 'warden', 'hornet', 'mauler', 'hk416', 'sentinel', 'ak47', 'rampart', 'bastion', 'midas', 'anvil', 'phantom', 'knife'],
};
const __rmap = (id) => __ROSTER.REMAP[id] || id;
{
  const R = __ROSTER.REMAP,
    gone = (id) => id in R,
    drop = (arr, test) => {
      for (let i = arr.length - 1; i >= 0; i--) test(arr[i]) && arr.splice(i, 1);
    };
  drop(fQ, (x) => gone(x.id));
  drop(BG, (b) => b.kind === 'weapon' && gone(b.id));
  for (const a of [OwA, YwA]) {
    const keep = [...new Set(a.map(__rmap))];
    a.length = 0;
    a.push(...keep);
  }
  const bots = J8.map(__rmap);
  J8.length = 0;
  J8.push(...bots);
  uI.length = 0;
  uI.push(...__ROSTER.LADDER);
  for (const k in R) gw[k] && (gw[k].unlock = 999);
}
// buying: bots' tables and old shortcuts ask for removed guns -> the replacement
{
  const coreBuy = CB;
  CB = function (w, A, i, I) {
    return coreBuy.call(this, w, A, typeof i == 'string' ? __rmap(i) : Array.isArray(i) ? i.map(__rmap) : i, I);
  };
}
// spawning: saved or default loadouts
{
  const coreSpawn = tU;
  tU = function (w, A) {
    A.loadout = __rmap(A.loadout);
    A.secondary = __rmap(A.secondary);
    return coreSpawn.apply(this, arguments);
  };
}
// the menus' loadout choice (and anything saved from an earlier version)
{
  const fix = () => {
    const z = Zw.getState(),
      l = __rmap(z.loadout),
      s = __rmap(z.secondary);
    (l !== z.loadout || s !== z.secondary) && z.setup({ loadout: l, secondary: s });
  };
  try {
    fix();
  } catch (e) {}
  Zw.subscribe((st, prev) => {
    (st.loadout !== prev.loadout || st.secondary !== prev.secondary) && (st.loadout in __ROSTER.REMAP || st.secondary in __ROSTER.REMAP) && setTimeout(fix, 0);
  });
}
// third-person models for weapons whose first-person model is an animated rig (Kodiak, knife)
const __RW = {
  ak47: { len: 0.88, grip: 0.335, gripTop: 0.45, gz: 0.045, fore: 0.6, sight: 0.9, fb: 'ak47', arms: /glove|shirt|sleeve|arm|hand|skin/i },
  knife: { len: 0.29, grip: 0.18, gripTop: 0.5, gz: 0.01, fore: 0.5, sight: 0.9, fb: 'knife', arms: /arms|glove|sleeve|hand|skin/i },
};
function __rigWorld(id) {
  const c = __RW[id],
    R = __RIG[id] && __RIG[id].rig;
  if (!c || !R || __XG[id]) return;
  R.wrap.updateMatrixWorld(!0);
  const tpl = new ji(),
    v = new U();
  R.root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = [].concat(o.material || []);
    if (mats.some((m) => c.arms.test(m.name || '')) || (o.isSkinnedMesh && o.skeleton.bones.length > 40)) return;
    let g = o.geometry.clone();
    if (o.isSkinnedMesh) {
      // bake the skinned gun into a static mesh in its rest pose
      o.skeleton.update();
      const P = g.attributes.position,
        out = new Float32Array(P.count * 3);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(o.geometry.attributes.position, i);
        o.applyBoneTransform(i, v);
        v.applyMatrix4(o.matrixWorld);
        out[i * 3] = v.x;
        out[i * 3 + 1] = v.y;
        out[i * 3 + 2] = v.z;
      }
      g = new uw();
      g.setAttribute('position', new gi(out, 3));
      o.geometry.attributes.uv && g.setAttribute('uv', o.geometry.attributes.uv);
      o.geometry.index && g.setIndex(o.geometry.index);
      g.computeVertexNormals();
    } else g.applyMatrix4(o.matrixWorld);
    const m = new Ow(g, mats.length > 1 ? mats.map((x) => x.clone()) : mats[0].clone());
    m.name = /mag/i.test(o.name) ? 'mag_' + o.name : o.name;
    tpl.add(m);
  });
  if (!tpl.children.length) return;
  __XG[id] = { id, url: '__rig', rotY: 0, ...c };
  try {
    __xgPrep(tpl, __XG[id]);
    Gc += 1;
  } catch (e) {
    delete __XG[id];
    console.warn('[roster] ' + id, e);
  }
}
typeof window < 'u' &&
  (() => {
    const t = setInterval(() => {
      for (const id in __RW) __rigWorld(id);
      Object.keys(__RW).every((id) => __XG[id]) && clearInterval(t);
    }, 700);
  })();
typeof window < 'u' && (window.__bpRoster = () => ({ shop: fQ.filter((x) => gw[x.id]).map((x) => x.id), primaries: [...OwA], secondaries: [...YwA], ladder: [...uI], botTable: [...J8], tp: Object.keys(__RW).map((id) => [id, !!__XG[id]]) }));
