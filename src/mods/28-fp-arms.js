/* ===== Bayou Protocol mod: one shared first-person arm model for every weapon ===== */
// Before: two guns (Kodiak/Midas, Sentinel) used artist-made rigged arms baked together with that gun,
// and every other gun used arms generated in code, so your arms changed shape whenever you switched guns.
// Now every weapon uses the same modelled, skinned arms (hands with all five fingers, from the Sentinel
// rig), posed onto each gun with two-bone IK: right hand on the grip, left hand on the handguard, using
// the same grip points the game already computes per weapon. The left hand follows the core's reload
// motion because its target lives in the weapon's "support" group.
// The arms only change when your operator changes: skin tone, glove colour (or bare hands), and sleeves
// in that operator's fabric and camo cut long, rolled or short, plus their watch.
// OFF: the shared arm kit is unfinished. With it off, the golden AK (Midas/Kodiak) and Sentinel use their
// original artist-made rigs and every other gun uses its previous arms, exactly as before.
const __ARM_ENABLED = !1;
const __ARM = { tpl: null, loading: !1, err: null, vm: {} };
// per-weapon viewmodel placement read by the core (hip offset in camera space, scale)
function __armVm(id, k) {
  const v = __ARM.tpl && !(typeof window < 'u' && window.__noVm) && __ARM.vm[id];
  return v ? v[k] : null;
}
const __armV = () => new U();
function __armLoad() {
  if (__ARM.loading || typeof window > 'u') return;
  __ARM.loading = !0;
  __glbParse(
    './game/models/rig-sentinel-arms.glb',
    (g) => {
      try {
        const root = g.scene;
        root.updateMatrixWorld(!0);
        let main = null;
        const drop = [],
          skins = [];
        root.traverse((o) => {
          /Main_M4/i.test(o.name) && o.isMesh && (main = o);
          o.isSkinnedMesh ? skins.push(o) : o.isMesh && drop.push(o);
        });
        const gunC = main ? new xi().setFromObject(main).getCenter(__armV()) : __armV(0, 1.42, 0.2);
        for (const d of drop) d.removeFromParent();
        const bone = (re) => {
          let r = null;
          root.traverse((o) => !r && o.isBone && re.test(o.name) && (r = o));
          return r;
        };
        const side = (S) => {
          const arm = bone(new RegExp('^' + S + 'Arm_')),
            fore = bone(new RegExp('^' + S + 'ForeArm_')),
            hand = bone(new RegExp('^' + S + 'Hand_')),
            mid = bone(new RegExp('^' + S + 'HandMiddle1_')),
            thumb = bone(new RegExp('^' + S + 'HandThumb1_'));
          // hand frame in the hand bone's local space: fingers, and the palm normal facing the gun
          const f = mid.position.clone().normalize(),
            t = thumb.position.clone().normalize();
          let n = new U().crossVectors(f, t).normalize();
          const hw = hand.getWorldPosition(__armV()),
            toGun = gunC.clone().sub(hw).normalize(),
            nW = n.clone().transformDirection(hand.matrixWorld);
          nW.dot(toGun) < 0 && n.negate();
          return { arm, fore, hand, f, n, len: mid.getWorldPosition(__armV()).distanceTo(hw) };
        };
        __ARM.tpl = { root, skins, R: side('Right'), L: side('Left'), restR: null, unit: 1 };
        // geometry-space units per metre of the skinned meshes (for sleeve sizes and camo scale)
        {
          const m = skins[0],
            bi = new _A().copy(m.bindMatrix).invert(),
            gp = (b) => new U().setFromMatrixPosition(new _A().copy(bi).multiply(new _A().copy(m.skeleton.boneInverses[m.skeleton.bones.indexOf(b)]).invert()));
          const T0 = __ARM.tpl;
          T0.unit = gp(T0.R.fore).distanceTo(gp(T0.R.hand)) / (T0.R.fore.getWorldPosition(__armV()).distanceTo(T0.R.hand.getWorldPosition(__armV())) || 1);
        }
        __ARM.tpl.restR = __ARM.tpl.R.hand.getWorldPosition(__armV());
        Gc += 1; // rebuild the viewmodel with the new arms
      } catch (e) {
        __ARM.err = e;
        console.warn('[arms] prep', e);
      }
    },
    (e) => console.warn('[arms] load', e),
  );
}
__ARM_ENABLED && __armLoad();
// ---------- per-operator materials ----------
const __armMatCache = new Map();
function __armMats(op, srcMats) {
  const key = op ? op.roster : 'none';
  if (__armMatCache.has(key)) return __armMatCache.get(key);
  const o = op || __OPS.ct1;
  const skin = srcMats.skin.clone(),
    glove = srcMats.glove.clone();
  // texture is light skin; multiply toward this operator's tone (in linear space)
  const want = new UA(o.skin),
    base = new UA('#d29a7c');
  skin.color = new UA(Math.min(1.4, want.r / base.r), Math.min(1.4, want.g / base.g), Math.min(1.4, want.b / base.b)).multiplyScalar(0.95);
  const gc = new UA(o.hands.color);
  glove.color = gc.clone().multiplyScalar(1.9);
  const m = {
    skin,
    glove,
    showGlove: o.hands.gloves !== 'none',
    sleeve: zn(o.top.color, o.top.camo || 'none', 3.2 / (__ARM.tpl.unit || 1), 0.93),
    cuff: zn('#' + new UA(o.top.color).multiplyScalar(0.72).getHexString(), 'none', 3.2 / (__ARM.tpl.unit || 1), 0.95),
    watch: II.rubber,
    metal: II.metal,
    o,
  };
  __armMatCache.set(key, m);
  return m;
}
// ---------- sleeves skinned to the rig's arm bones ----------
const __armSleeveCache = new Map();
function __armSleeves(rig, mesh, o) {
  const key = o.roster + '|' + o.top.sleeves + '|' + (o.hands.watch ? 1 : 0);
  if (__armSleeveCache.has(key)) return __armSleeveCache.get(key);
  const sk = mesh.skeleton,
    bindInv = new _A().copy(mesh.bindMatrix).invert(),
    S = { idx: {}, pos: {}, end: {} };
  const gpos = (i) => new U().setFromMatrixPosition(new _A().copy(bindInv).multiply(new _A().copy(sk.boneInverses[i]).invert()));
  sk.bones.forEach((b, i) => {
    const n = b.name.replace(/_\d+$/, '').toLowerCase();
    S.idx[n] = i;
    S.pos[n] = gpos(i);
  });
  const parts = [];
  // geometry-space units per metre, from the forearm (about 0.26 m on this rig)
  const unit = S.pos.rightforearm.distanceTo(S.pos.righthand) / (rig.R.fore.getWorldPosition(__armV()).distanceTo(rig.R.hand.getWorldPosition(__armV())) || 0.26);
  for (const side of ['right', 'left']) {
    const A0 = S.pos[side + 'arm'],
      F0 = S.pos[side + 'forearm'],
      H0 = S.pos[side + 'hand'];
    S.end[side + 'arm'] = F0;
    S.end[side + 'forearm'] = H0;
    S.end[side + 'hand'] = H0.clone().add(H0.clone().sub(F0).multiplyScalar(0.3));
    const at = (t) => (t <= 1 ? A0.clone().lerp(F0, t) : F0.clone().lerp(H0, t - 1));
    const r = (t) => (t <= 1 ? 0.057 - 0.008 * t : 0.05 - 0.013 * Math.pow(t - 1, 0.8)) * unit;
    const end = o.top.sleeves === 'short' ? 0.55 : o.top.sleeves === 'rolled' ? 1.5 : 1.86;
    const ts = [...Array(14)].map((_, i) => (end * i) / 13);
    const up = __v(0, 1, 0);
    const g = __limb(ts.map(at), ts.map((t) => [r(t) + 0.006 * unit, (r(t) + 0.006 * unit) * 0.9]), up, 22, (a, k) => 1 + 0.03 * Math.sin(a * 5 + k * 1.9), [!1, !1]);
    parts.push({ g, mat: 'sleeve', bones: [side + 'arm', side + 'forearm', side + 'hand'] });
    const ce = at(end),
      q = new Kw().setFromUnitVectors(__v(0, 1, 0), at(end + 0.01).sub(ce).normalize());
    const cr = r(end) + 0.008 * unit;
    parts.push({
      g:
        o.top.sleeves === 'rolled'
          ? __place(new oI(cr, 0.011 * unit, 8, 24).rotateX(Math.PI / 2), ce, q)
          : __place(new Rw(cr, cr, 0.022 * unit, 22, 1, !0), ce, q),
      mat: 'cuff',
      bones: [side + 'forearm', side + 'hand'],
    });
    if (o.hands.watch && side === 'left') {
      const wp = at(1.88),
        wq = new Kw().setFromUnitVectors(__v(0, 1, 0), at(1.9).sub(wp).normalize()),
        wr = r(1.88) + 0.003 * unit;
      parts.push({ g: __place(new Rw(wr, wr, 0.018 * unit, 20, 1, !0), wp, wq), mat: 'watch', bones: [side + 'forearm'] });
      parts.push({ g: __place(new Rw(0.016 * unit, 0.016 * unit, 0.009 * unit, 18).rotateX(Math.PI / 2), wp.clone().add(__v(0, wr + 0.004 * unit, 0)), wq), mat: 'metal', bones: [side + 'forearm'] });
    }
  }
  const byMat = new Map();
  for (const p of parts) {
    __toIndexed(p.g);
    p.g.attributes.uv || p.g.setAttribute('uv', new gi(new Float32Array(p.g.attributes.position.count * 2), 2));
    __cbWeights(p.g, p.bones, S);
    (byMat.get(p.mat) || byMat.set(p.mat, []).get(p.mat)).push(p.g);
  }
  const out = [...byMat].map(([mat, list]) => ({ mat, g: __cbMerge(list) }));
  __armSleeveCache.set(key, out);
  return out;
}
// ---------- building the arms for one weapon ----------
const __armQ = { a: new Kw(), b: new Kw(), m: new _A(), m2: new _A() };
function __armOrient(h, fW, nW) {
  // rotate the hand bone so its finger direction and palm normal match the targets (world space)
  const x = fW.clone().normalize(),
    z = nW.clone().sub(x.clone().multiplyScalar(nW.dot(x))).normalize(),
    y = new U().crossVectors(z, x);
  const xl = h.f.clone(),
    zl = h.n.clone().sub(xl.clone().multiplyScalar(h.n.dot(xl))).normalize(),
    yl = new U().crossVectors(zl, xl);
  const Rt = __armQ.m.makeBasis(x, y, z),
    Rl = __armQ.m2.makeBasis(xl, yl, zl).invert(),
    qW = new Kw().setFromRotationMatrix(Rt.multiply(Rl));
  h.hand.parent.getWorldQuaternion(__armQ.a);
  h.hand.quaternion.copy(__armQ.a.invert().multiply(qW));
  h.hand.updateMatrixWorld(!0);
}
function __armBuild(w, spec, g, B) {
  const T = __ARM.tpl,
    op = __OPS[spec.op] || null,
    clone = G$(T.root);
  const find = (re) => {
    let r = null;
    clone.traverse((o) => !r && o.isBone && re.test(o.name) && (r = o));
    return r;
  };
  const side = (S, src) => ({
    arm: find(new RegExp('^' + S + 'Arm_')),
    fore: find(new RegExp('^' + S + 'ForeArm_')),
    hand: find(new RegExp('^' + S + 'Hand_')),
    f: src.f,
    n: src.n,
    len: src.len,
  });
  const R = side('Right', T.R),
    L = side('Left', T.L);
  // materials: skin + gloves recoloured for the operator, sleeves added
  let skinMat = null,
    gloveMat = null,
    first = null;
  clone.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    /glove/i.test(o.material.name) ? (gloveMat = o) : (skinMat = o);
  });
  const mats = __armMats(op, { skin: skinMat.material, glove: gloveMat.material });
  skinMat.material = mats.skin;
  gloveMat.material = mats.glove;
  gloveMat.visible = mats.showGlove;
  first = skinMat;
  for (const { mat, g: geo } of __armSleeves(T, skinMat, mats.o)) {
    const mm = new tZ(geo, mats[mat]);
    skinMat.parent.add(mm);
    mm.bind(skinMat.skeleton, skinMat.bindMatrix);
  }
  clone.traverse((o) => {
    if (!o.isMesh) return;
    o.renderOrder = hu;
    o.castShadow = o.receiveShadow = !1;
    o.frustumCulled = !1;
  });
  // ----- grip targets on this weapon (same construction the game uses for its own hands) -----
  const pistol = w === 'pistol' || w === 'deagle' || w === 'warden',
    melee = w === 'knife' || w === 'grenade';
  const K = rwA(g, pistol ? 0.022 : w === 'shotgun' ? 0.085 : w === 'br' || w === 'lmg' || w === 'sniper' ? 0.095 : 0.045);
  const tilt = K.tilt,
    q = __armV().set(0, Math.cos(tilt), -Math.sin(tilt)),
    h = __armV().set(-1, 0, 0),
    IA = new U().crossVectors(h, q),
    yTop = K.yTop - 0.05,
    gc = __armV().set(K.x, yTop, K.zAt(yTop)),
    CA = 0.016 + K.half + 0.002,
    fA = R.len - 0.35 * K.depth;
  const rWrist = gc.clone().addScaledVector(h, -CA).addScaledVector(IA, -fA).addScaledVector(q, -0.012);
  const rT = new ji();
  rT.position.copy(rWrist);
  g.add(rT);
  const rF = IA.clone(),
    rN = h.clone();
  // support hand: in the "support" group so the core's reload animation moves it
  const sup = new ji();
  sup.name = 'support';
  sup.userData.restZ = B.foregrip;
  const lT = new ji();
  let lF, lN;
  if (!pistol && !melee) {
    const y = B.foregrip,
      qq = GwA(g, y),
      hh = (qq.y0 + qq.y1) / 2,
      ia = Math.max(0.012, (qq.y1 - qq.y0) / 2),
      BA = __armV().set(0, 0, 1),
      _ = __armV().set(1, 0.2, 0).normalize(),
      ca = new U().crossVectors(BA, _),
      fa = 0.016 + ia + 0.002,
      da = L.len - 0.55 * qq.half;
    lT.position.set(qq.cx, hh, y + 0.04).addScaledVector(ca, -fa).addScaledVector(_, -da);
    lF = _.clone();
    lN = ca.clone();
  } else {
    // one-handed weapons: the support arm rests low and out of view
    lT.position.set(-0.28, -0.42, 0.28);
    lF = __armV().set(0.3, -0.2, -1).normalize();
    lN = __armV().set(1, 0, 0);
  }
  sup.add(lT);
  g.add(sup);
  // ----- place the rig: rotate to face -Z, put its resting right hand on our right wrist -----
  const wrap = new ji();
  clone.rotation.y = Math.PI;
  wrap.add(clone);
  clone.updateMatrixWorld(!0);
  const restR = T.restR.clone().applyAxisAngle(__armV().set(0, 1, 0), Math.PI);
  wrap.position.copy(rWrist).sub(restR);
  g.add(wrap);
  // hold the gun where the rig's eye expects it: put the rig's camera bone on the real camera
  {
    let cam = null;
    clone.traverse((o) => !cam && /FPS_Camera/i.test(o.name) && (cam = o));
    if (cam) {
      g.updateMatrixWorld(!0);
      const c = g.worldToLocal(cam.getWorldPosition(__armV())),
        sc = pistol || melee ? 0.72 : 0.56;
      // a touch lower and further right than the authored eye so the gun sits in the lower-right third
      __ARM.vm[w] = { scale: sc, hip: [-c.x * sc + 0.02, -c.y * sc - 0.035, -c.z * sc - 0.02] };
    }
  }
  typeof window < 'u' && (window.__armDbg = { g, R, L, rT, lT, wrap, clone, first });
  // ----- per-frame IK, run right before the arms draw (then the skin is refreshed for this frame) -----
  const poleR = __armV().set(0.7, -1, 0.25),
    poleL = __armV().set(-0.7, -1, 0.25),
    tmp = __armV(),
    tmpQ = new Kw();
  first.onBeforeRender = () => {
    try {
      g.updateMatrixWorld(!0);
      g.getWorldQuaternion(tmpQ);
      const dir = (v) => v.clone().applyQuaternion(tmpQ);
      ZP(R.arm, R.fore, R.hand, rT.getWorldPosition(tmp).clone(), dir(poleR));
      __armOrient(R, dir(rF), dir(rN));
      ZP(L.arm, L.fore, L.hand, lT.getWorldPosition(tmp).clone(), dir(poleL));
      __armOrient(L, dir(lF), dir(lN));
      first.skeleton.update();
    } catch (e) {}
  };
  return g;
}
// ---------- hooks ----------
{
  const coreXu = xu,
    coreKu = ku;
  // the arm spec now carries the operator, so arms depend on the character and not on the gun
  ku = function (w) {
    const r = coreKu(w);
    try {
      const look = iQ(w.look);
      r.op = __opForLook(look, w.team);
    } catch (e) {}
    return r;
  };
  xu = function (w, A, i, I) {
    if (!__ARM.tpl) return coreXu(w, A, i, I);
    try {
      const B = wG(w, i, AG(zu(I))),
        g = B.group;
      // magazine and pump groups, as the core expects them
      const mag = new ji();
      mag.name = 'mag';
      for (const y of [...g.children]) y.userData.mag && mag.add(y);
      const pump = new ji();
      pump.name = 'pump';
      if (w === 'shotgun')
        for (const y of [...g.children]) y.isMesh && Math.abs(y.position.z - B.foregrip) < 0.1 && Math.abs(y.position.y - 0.014) < 0.004 && pump.add(y);
      g.add(mag, pump);
      g.traverse((y) => {
        y.isMesh && ((y.renderOrder = hu), (y.castShadow = y.receiveShadow = !1), (y.frustumCulled = !1));
      });
      __armBuild(w, A, g, B);
      return { group: g, muzzle: B.muzzle };
    } catch (e) {
      console.warn('[arms] build', w, e);
      return coreXu(w, A, i, I);
    }
  };
  // the baked per-gun rigs used different arms; use the shared arms on every gun instead
  const coreRig = __rigFor;
  __rigFor = function (id) {
    return __ARM.tpl ? null : coreRig(id);
  };
}
typeof window < 'u' && (window.__bpArms = __ARM);
