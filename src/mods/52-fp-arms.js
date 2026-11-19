/* ===== Bayou Protocol mod: first-person arms (Arms6) on model-only guns ===== */
// Guns that come as a model without arms (Warden, Talon / HK416, Rampart, Bastion, and any other gun the game
// draws with its built-in arms) are held by the "Arms6" model instead of the arms built from primitives.
//   - the core still works out where the hands go: the right hand on the pistol grip (its angle and width
//     measured from the gun), the left hand under the handguard at the gun's foregrip, and it still moves the
//     left hand for reloads and pumps. Those hands are kept as invisible targets.
//   - every frame, before the arms are drawn, each arm is solved as a two-bone chain (upper arm, forearm) so
//     the wrist lands on its target, the elbow bending down and out; the hand is turned to the target's
//     palm and finger directions
//   - fingers close round what they hold: four fingers round the grip, the trigger finger resting along
//     the frame and squeezing the trigger on every shot, the thumb over the top; the left hand cups the
//     handguard. Pistols: the left hand wraps the right (two-handed grip).
//   - the shoulders sit low and behind the eye, both on one chest, so the arms come in from the bottom
//     corners of the screen like real arms
const __FA = { url: './game/models/weapons/arms6.glb', g: null, loading: !1, err: null, n: 0, last: null };
// guns fired with one hand (the revolver: 94-new-guns.js adds it): the free arm hangs relaxed at the side, below
// the view, its fingers loosely curled, instead of wrapping the gun
const __FA_ONE = new Set();
function __faLoad() {
  if (__FA.loading || typeof window > 'u') return;
  __FA.loading = !0;
  __glbParse(
    __FA.url,
    (g) => {
      __FA.g = g;
      Gc += 1; // rebuild first-person models with the arms
    },
    (e) => ((__FA.err = String(e)), console.warn('[arms] load', e)),
  );
}
const __faBone = (root, base, side) => {
  const re = new RegExp('^' + base + '[._]?' + side + '(_\\d+)?$');
  let r = null;
  root.traverse((o) => !r && o.isBone && re.test(o.name) && (r = o));
  return r;
};
// a hand frame: columns = finger direction, palm normal, their cross product
function __faBasis(F, P) {
  const f = F.clone().normalize(),
    p = P.clone().sub(f.clone().multiplyScalar(P.dot(f))).normalize(),
    c = new U().crossVectors(f, p);
  return new _A().makeBasis(f, p, c);
}
function __faMakeArms() {
  const root = b$(__FA.g.scene),
    holder = new ji();
  holder.name = 'bp-arms6';
  holder.add(root);
  // the model's hands are large (14 cm wrist to knuckles): 85 % puts them in proportion with the guns
  root.scale.multiplyScalar(0.85);
  let mesh = null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    mesh = o;
    o.frustumCulled = !1;
    o.castShadow = o.receiveShadow = !1;
    o.renderOrder = hu;
    for (const m of [].concat(o.material)) m && ((m.envMapIntensity = 1), (m.side = 0));
  });
  // turn the rig so its front is -Z (the view direction) and its left arm is on the left (-X)
  holder.updateMatrixWorld(!0);
  const B = {};
  for (const s of ['L', 'R']) {
    B[s] = { arm: __faBone(root, 'arm', s), fore: __faBone(root, 'elbow', s), twist: __faBone(root, 'forearm', s), hand: __faBone(root, 'hand', s), fingers: {} };
    for (const f of ['thumb', 'point', 'middle', 'ring', 'pink']) B[s].fingers[f] = [1, 2, 3].map((k) => __faBone(root, f + k, s));
  }
  const pL = B.L.arm.getWorldPosition(new U()),
    pR = B.R.arm.getWorldPosition(new U()),
    side = pL.clone().sub(pR),
    fwd = new U().crossVectors(side, new U(0, 1, 0)).normalize();
  // fwd -> -Z: R_y(t) * fwd = -Z
  root.rotation.y = Math.PI - Math.atan2(fwd.x, fwd.z);
  holder.updateMatrixWorld(!0);
  // bind data in the holder's frame
  const hqi = holder.getWorldQuaternion(new Kw()).invert(),
    rel = (o) => hqi.clone().multiply(o.getWorldQuaternion(new Kw())),
    pos = (o) => holder.worldToLocal(o.getWorldPosition(new U()));
  const bind = new Map();
  root.traverse((o) => o.isBone && bind.set(o, o.quaternion.clone()));
  for (const s of ['L', 'R']) {
    const b = B[s],
      sh = pos(b.arm),
      el = pos(b.fore),
      wr = pos(b.hand),
      mid = pos(b.fingers.middle[0]),
      F = mid.clone().sub(wr),
      // the fingers bend about the hand bone's local Z, towards local -X on the left hand and +X on the
      // right: that side is the palm
      P = new U(s === 'L' ? -1 : 1, 0, 0).applyQuaternion(rel(b.hand));
    b.L1 = sh.distanceTo(el);
    b.L2 = el.distanceTo(wr);
    b.dirUp = el.clone().sub(sh).normalize();
    b.dirLo = wr.clone().sub(el).normalize();
    b.qArm = rel(b.arm);
    b.qFore = rel(b.fore);
    b.qHand = rel(b.hand);
    b.handBasisInv = __faBasis(F, P).invert();
    b.shoulder = sh;
  }
  const chest = B.L.shoulder.clone().add(B.R.shoulder).multiplyScalar(0.5);
  return { holder, root, mesh, B, bind, chest, trig: 0, lastShot: null };
}
// the procedural arms built by the core: hide them, keep the hands as targets
function __faStrip(g, gunSet) {
  let right = null,
    left = null;
  const sup = g.children.find((c) => c.name === 'support');
  for (const c of g.children) {
    if (gunSet.has(c) || c === sup || c.name === 'mag' || c.name === 'pump') continue;
    if (!c.isMesh && c.children.some((k) => k.isMesh)) right = right || c;
    c.traverse((o) => o.isMesh && (o.visible = !1));
  }
  if (sup) for (const c of sup.children) !c.isMesh && c.children.some((k) => k.isMesh) && (left = left || c), c.traverse((o) => o.isMesh && (o.visible = !1));
  return { right, left, sup };
}
// the two-handed pistol grip (tunable from the console: window.__bpArmsPistol)
const __FA_PL = { rOff: [0, -0.055, 0.025], side: 0.032, down: -0.012, fwd: -0.012, tip: -0.45, curl: [1.45, 1.35, 0.95], thumbR: [0.05, 0.1, 0.05], thumbL: [0.05, 0.05, 0.05] };
typeof window < 'u' && (window.__bpArmsPistol = __FA_PL);
const __faT = { a: new U(), b: new U(), c: new U(), d: new U(), e: new U(), q: new Kw(), q2: new Kw(), q3: new Kw(), m: new _A(), m2: new _A() };
// one arm: shoulder S, wrist target T (holder frame), pole direction; hand basis (finger dir, palm normal)
function __faSolve(A, s, T, pole, F, P) {
  const b = A.B[s],
    H = A.holder,
    t = __faT;
  // reset this arm to its bind pose
  for (const o of [b.arm, b.fore, b.twist, b.hand]) o && o.quaternion.copy(A.bind.get(o));
  b.arm.updateMatrixWorld(!0);
  const S = H.worldToLocal(b.arm.getWorldPosition(t.a)),
    reach = (b.L1 + b.L2) * 0.998,
    toT = t.b.copy(T).sub(S);
  let d = toT.length();
  d > reach && (toT.multiplyScalar(reach / d), (d = reach));
  d = Math.max(d, Math.abs(b.L1 - b.L2) + 1e-3);
  const dir = toT.clone().normalize(),
    a = (b.L1 * b.L1 - b.L2 * b.L2 + d * d) / (2 * d),
    h = Math.sqrt(Math.max(0, b.L1 * b.L1 - a * a)),
    pd = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize(),
    E = S.clone().add(dir.clone().multiplyScalar(a)).add(pd.multiplyScalar(h)),
    W = S.clone().add(toT);
  // holder-frame rotation of a bone, written back as a local rotation
  const hq = H.getWorldQuaternion(t.q3),
    setRel = (bone, qRel) => {
      bone.parent.getWorldQuaternion(t.q2);
      bone.quaternion.copy(t.q2.invert().multiply(hq).multiply(qRel));
      bone.updateMatrixWorld(!0);
    };
  setRel(b.arm, new Kw().setFromUnitVectors(b.dirUp, E.clone().sub(S).normalize()).multiply(b.qArm));
  // forearm: from the elbow's current direction to the wrist
  const qf = H.getWorldQuaternion(new Kw()).invert().multiply(b.fore.getWorldQuaternion(new Kw())),
    curLo = b.dirLo.clone().applyQuaternion(qf.clone().multiply(b.qFore.clone().invert())),
    wantLo = W.clone().sub(E).normalize();
  setRel(b.fore, new Kw().setFromUnitVectors(curLo, wantLo).multiply(qf));
  // hand: absolute orientation from the target's finger direction and palm normal
  const R = __faBasis(F, P).multiply(b.handBasisInv),
    qh = new Kw().setFromRotationMatrix(R).multiply(b.qHand);
  setRel(b.hand, qh);
  // forearm twist bone takes part of the wrist's roll, so the forearm does not candy-wrap
  if (b.twist) {
    const qt = H.getWorldQuaternion(new Kw()).invert().multiply(b.twist.getWorldQuaternion(new Kw()));
    setRel(b.twist, qt.slerp(qh.clone().multiply(b.qHand.clone().invert()).multiply(qt), 0.45));
    setRel(b.hand, qh);
  }
}
// finger curl: rotation about each joint's local Z (the rig's bend axis), sign by side
const __faZ = new U(0, 0, 1);
function __faCurl(A, s, set) {
  const b = A.B[s],
    k = s === 'L' ? 1 : -1;
  for (const [f, angs] of Object.entries(set)) {
    const js = b.fingers[f];
    js.forEach((j, i) => {
      if (!j) return;
      j.quaternion.copy(A.bind.get(j)).multiply(__faT.q.setFromAxisAngle(__faZ, k * (angs[i] || 0)));
    });
  }
  b.hand.updateMatrixWorld(!0);
}
// ---------------------------------------------------------------- per frame (just before the arms are drawn)
function __faPose(A, ctx, cam) {
  const t = __faT,
    H = A.holder,
    g = H.parent;
  if (!g || !ctx.right) return;
  g.updateMatrixWorld(!0);
  const toH = (o, v) => H.worldToLocal(o.localToWorld(v.clone())),
    dirH = (o, v) => toH(o, v).sub(toH(o, new U()));
  // the core's hand frames: local +Y = fingers, +Z = palm normal (towards what the hand holds)
  const R = ctx.right,
    // pistols: the hand down onto the grip (the core's frame sits at the top of the grip, under the slide)
    wR = toH(R, new U(0, 0.0, 0)).add(ctx.left ? new U() : new U(...__FA_PL.rOff)),
    FR = dirH(R, new U(0, 1, 0)),
    PR = dirH(R, new U(0, 0, 1));
  let wL, FL, PL;
  if (ctx.left) (wL = toH(ctx.left, new U(0, 0, 0))), (FL = dirH(ctx.left, new U(0, 1, 0))), (PL = dirH(ctx.left, new U(0, 0, 1)));
  else {
    // pistol (thumbs forward): the left palm against the grip's open left side, just under and ahead of the
    // right hand, its fingers wrapping round the front of the right hand's fingers: the right hand's finger
    // direction mirrored across the gun's centre plane, tipped a little forward
    wL = wR.clone().add(PR.clone().multiplyScalar(__FA_PL.side)).add(new U(0, __FA_PL.down, __FA_PL.fwd));
    FL = new U(-FR.x, FR.y, FR.z).add(new U(0, 0, __FA_PL.tip)).normalize();
    PL = PR.clone().multiplyScalar(-1);
  }
  // chest: below and just behind the eye, then forward only as far as each hand needs to reach its target
  const eye = cam ? H.worldToLocal(cam.getWorldPosition(new U())) : new U(wR.x - 0.12, wR.y + 0.2, wR.z + 0.25),
    sh = eye.clone().add(new U(0.02, -0.3, 0.1)),
    wristR0 = wR.clone().sub(FR.clone().multiplyScalar(0.02)),
    wristL0 = A.one ? sh.clone().add(new U(-0.27, -0.6, 0.05)) : wL.clone().sub(FL.clone().multiplyScalar(0.02));
  // one-handed: the free hand hangs, fingers down, palm towards the thigh
  A.one && ((FL = new U(0.06, -1, 0.04).normalize()), (PL = new U(1, 0, 0)));
  for (const [s, wr] of [
    ['L', wristL0],
    ['R', wristR0],
  ]) {
    const b = A.B[s],
      off = b.shoulder.clone().sub(A.chest),
      d = wr.clone().sub(sh.clone().add(off)),
      over = d.length() - (b.L1 + b.L2) * 0.93;
    over > 0 && sh.add(d.normalize().multiplyScalar(over));
  }
  // the rig's chest was measured with the rig at the holder's origin: move the rig so it lands on `sh`
  A.root.position.copy(sh).sub(A.chest);
  A.root.updateMatrixWorld(!0);
  // wrist targets: the core's frame is at the palm; the wrist is behind it along the fingers
  __faSolve(A, 'R', wristR0, new U(0.7, -1, 0.25), FR, PR);
  __faSolve(A, 'L', wristL0, A.one ? new U(-0.25, 0, 1) : new U(-0.8, -1, 0.1), FL, PL);
  // trigger: squeeze on every shot (a short pull and release)
  const me = eA.human && eA.human();
  if (me && me.lastShotAt !== A.lastShot) A.lastShot !== null && (A.trig = 1), (A.lastShot = me.lastShotAt);
  const now = performance.now();
  A.trig = Math.max(0, A.trig - (now - (A.tPrev || now)) / 110);
  A.tPrev = now;
  const tr = Math.sin(Math.min(1, A.trig) * Math.PI * 0.5);
  __faCurl(A, 'R', {
    point: [0.32 + 0.42 * tr, 0.42 + 0.38 * tr, 0.25 + 0.2 * tr],
    middle: [1.25, 1.2, 0.8],
    ring: [1.3, 1.25, 0.8],
    pink: [1.35, 1.2, 0.8],
    // pistols: the thumb lies forward along the frame (under the support thumb); rifles: over the grip
    // (one hand on a revolver: the thumb wraps down round the grip's left side, over the middle finger)
    thumb: ctx.left ? [0.35, 0.55, 0.45] : A.one ? [0.6, 0.75, 0.6] : __FA_PL.thumbR,
  });
  A.one
    ? __faCurl(A, 'L', { point: [0.25, 0.3, 0.2], middle: [0.35, 0.4, 0.25], ring: [0.4, 0.45, 0.25], pink: [0.45, 0.45, 0.25], thumb: [0.2, 0.15, 0.1] })
    : ctx.left
    ? __faCurl(A, 'L', { point: [0.85, 0.75, 0.5], middle: [1.0, 0.85, 0.55], ring: [1.05, 0.9, 0.55], pink: [1.1, 0.9, 0.55], thumb: [0.4, 0.4, 0.3] })
    : __faCurl(A, 'L', { point: __FA_PL.curl, middle: __FA_PL.curl, ring: __FA_PL.curl, pink: __FA_PL.curl, thumb: __FA_PL.thumbL });
  A.mesh.skeleton && A.mesh.skeleton.update();
  __FA.n++;
}
// ---------------------------------------------------------------- the core's first-person model builder
{
  const coreXu = xu;
  xu = function (w) {
    __FA.g || __faLoad();
    if (!__FA.g || __FA.off || w === 'knife' || w === 'grenade' || w === 'frag' || w === 'flash' || w === 'smoke') return coreXu.apply(this, arguments);
    let gunSet = null;
    const coreGrip = rwA;
    rwA = function (g) {
      gunSet || (gunSet = new Set(g.children));
      return coreGrip.apply(this, arguments);
    };
    let res;
    try {
      res = coreXu.apply(this, arguments);
    } finally {
      rwA = coreGrip;
    }
    try {
      if (!gunSet || !res || !res.group) return res;
      const g = res.group,
        ctx = __faStrip(g, gunSet),
        A = __faMakeArms();
      g.add(A.holder);
      A.one = __FA_ONE.has(w);
      A.mesh.onBeforeRender = (r, sc, cam) => {
        try {
          __faPose(A, ctx, cam);
        } catch (e) {
          __FA.err || ((__FA.err = String(e && e.stack)), console.warn('[arms]', e));
        }
      };
      __FA.last = { weapon: w, right: !!ctx.right, left: !!ctx.left };
      __FA.holder = A.holder;
    } catch (e) {
      console.warn('[arms] ' + w, e);
    }
    return res;
  };
}
typeof window < 'u' && (setTimeout(__faLoad, 900), (window.__bpArms = () => ({ loaded: !!__FA.g, err: __FA.err, posed: __FA.n, last: __FA.last })), (window.__bpArmsHolder = () => __FA.holder), (window.__bpArmsOff = (v) => ((__FA.off = v), (Gc += 1))));
