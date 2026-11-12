/* ===== Bayou Protocol mod: frag grenade model ===== */
// Model: "FPS Guns 4K - Frag Granade" by Heart State Games (sketchfab.com/heartstategames), CC BY-ND 4.0.
// Only technical changes were made (textures resized and converted to WebP, the unused smoke-grenade ring
// part left out); the design is unmodified, as the licence requires. File: public/game/models/grenade-frag.glb
// (source in assets-src/models/frag-grenade-source.glb).
//
// Used for the HE frag grenade everywhere you see it:
//   first person   the grenade in your hand (the core's placeholder stays as an invisible proxy, because the
//                  hand-placement code measures it to wrap the fingers)
//   thrown         every live HE grenade in the world, tumbling with its velocity
const __FRAG = { tpl: null, h: 0.09, pool: [], spin: new Map() };
typeof window < 'u' &&
  __glbParse(
    './game/models/grenade-frag.glb',
    (g) => {
      try {
        const root = g.scene;
        root.traverse((o) => o.isMesh && /ringSmoke/i.test(o.name) && (o.visible = !1));
        const keep = new ji();
        root.updateMatrixWorld(!0);
        root.traverse((o) => {
          if (!o.isMesh || !o.visible) return;
          const m = new Ow(o.geometry, o.material);
          o.matrixWorld.decompose(m.position, m.quaternion, m.scale);
          m.castShadow = m.receiveShadow = !0;
          keep.add(m);
        });
        // normalise: real M67 height (~9 cm), centred on its body
        const b = new xi().setFromObject(keep),
          size = b.getSize(new U()),
          c = b.getCenter(new U()),
          k = __FRAG.h / Math.max(size.x, size.y, size.z);
        const inner = new ji();
        for (const m of [...keep.children]) inner.add(m);
        inner.position.copy(c).multiplyScalar(-k);
        inner.scale.setScalar(k);
        const tpl = new ji();
        tpl.add(inner);
        tpl.name = 'frag';
        __FRAG.tpl = tpl;
        Gc += 1; // rebuild the first-person view with the new model
      } catch (e) {
        console.warn('[frag] prep', e);
      }
    },
    (e) => console.warn('[frag] load', e),
  );
function __fragShown(n) {
  return !!__FRAG.tpl && n.kind === 'he';
}
// ---------- first person ----------
{
  const coreBuild = wG;
  wG = function (w, A, i) {
    const r = coreBuild(w, A, i);
    if (w !== 'grenade' || !__FRAG.tpl) return r;
    try {
      r.group.updateMatrixWorld(!0);
      const b = new xi(),
        parts = [];
      r.group.traverse((o) => o.isMesh && (b.expandByObject(o), parts.push(o)));
      // invisible proxy keeps the hand pose; the real grenade sits where the placeholder body was
      for (const o of parts) o.visible = !1;
      const f = __FRAG.tpl.clone(!0);
      f.position.copy(b.getCenter(new U()));
      f.rotation.set(0, Math.PI * 0.5, 0);
      f.traverse((o) => o.isMesh && ((o.frustumCulled = !1), (o.renderOrder = hu)));
      r.group.add(f);
    } catch (e) {
      console.warn('[frag] viewmodel', e);
    }
    return r;
  };
}
// ---------- thrown grenades in the world ----------
function __fragTick(dt) {
  const S = eA.state;
  if (!__FRAG.tpl || !__fx.ready || !S) return;
  const live = S.grenades.filter((n) => n.kind === 'he');
  while (__FRAG.pool.length < live.length) {
    const m = __FRAG.tpl.clone(!0);
    m.visible = !1;
    __fx.g.add(m);
    __FRAG.pool.push(m);
  }
  const seen = new Set();
  __FRAG.pool.forEach((m, k) => {
    const n = live[k];
    if (!n) return void (m.visible = !1);
    seen.add(n);
    m.visible = !0;
    m.position.set(n.pos.x, n.pos.y, n.pos.z);
    // tumble with speed; settles when it stops rolling
    const sp = Math.hypot(n.vel.x, n.vel.y, n.vel.z),
      a = (__FRAG.spin.get(n) || 0) + sp * dt * 2.2;
    __FRAG.spin.set(n, a);
    m.rotation.set(a, Math.atan2(n.vel.x, n.vel.z), a * 0.37);
  });
  for (const n of __FRAG.spin.keys()) seen.has(n) || __FRAG.spin.delete(n);
}
{
  const coreFxTick = __fxTick;
  __fxTick = function (dt) {
    coreFxTick(dt);
    try {
      __fragTick(dt);
    } catch (e) {}
  };
}
wBA.push(['Frag grenade model', '“FPS Guns 4K - Frag Granade” by Heart State Games (sketchfab.com/heartstategames), unmodified apart from texture compression', 'CC BY-ND 4.0']);
// read-only weapon catalogue for tooling (tools/weapon-audit): stats, shop entries, unlocks, model sources
typeof window < 'u' &&
  (window.__bpCatalog = () => ({
    gw: JSON.parse(JSON.stringify(gw)),
    shop: fQ.map((x) => ({ id: x.id, label: x.label, price: x.price, hint: x.hint, cat: x.cat })),
    cls: { ...qO },
    unlock: BG.filter((b) => b.kind === 'weapon').map((b) => ({ id: b.id, level: b.level })),
    glb: Object.keys(__XG),
    rigs: Object.keys(__RIG),
  }));
