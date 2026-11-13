/* ===== Bayou Protocol mod: animated weapons (Hornet, Mauler, Kestrel, Anvil, Striker) ===== */
// Five first-person weapons made from animated arm-and-gun models (Sketchfab downloads, built by
// tools/build-weapons.mjs into public/game/models/weapons/<id>.glb: textures 1024 px WebP, 223 MB -> 10.5 MB).
// Each model is a pair of arms holding a gun, with every move on one animation track. The track is cut into
// clips by time (found by charting when the trigger, bolt, slide, magazine and pump move, then checking
// rendered frames):
//
//   Hornet .45   SMG          fire, empty reload (bolt pull), quick reload, inspect, idle, buttstroke
//   Mauler 12    pump shotgun fire, pump, shell-by-shell reload (start / one shell / finish), inspect, idle, bash
//   Kestrel 9    pistol       fire, empty reload (slide release), quick reload, inspect, idle, pistol whip
//   Anvil 7.62   belt LMG     fire, belt reload (cover, box, belt, charge), second reload, inspect, idle, bash
//   Striker 17   burst pistol fire, last round (slide locks back), quick reload, empty reload, inspect, idle
//
// Per weapon, beyond its own stats, recoil pattern and sound class:
//   - reload time depends on the magazine: an empty reload (bolt / slide / charge) takes longer than a
//     reload with a round still chambered, and the matching animation plays
//   - Mauler: pump between shots (the hull is ejected when the pump goes back), reload loads one shell at a
//     time and firing during a reload stops it with the shells already loaded
//   - Striker: 3-round burst; the last round locks the slide back until the reload
//   - Hornet: steadier from the hip than other SMGs (hip spread x0.75)
//   - Anvil: heavy and slow, but steady when crouched (recoil x0.6, spread x0.75)
//   - every gun ejects its own casing (9 mm, .45, 7.62 + belt link, red 12-gauge hull) as a small physics
//     object that bounces off walls, floors and props through the Rapier world and stays on the floor a while
//   - Inspect weapon key (default X)
// The fit (orientation, scale, hip and aim-down-sights position) is computed from the model itself when it
// loads: barrel along the longest gun axis pointing away from the arms, scaled to the gun's real length,
// muzzle placed where the other rigs put theirs, sights centred for ADS. The third-person / world gun is
// lifted out of the same file (the gun parts without the arms).
const __AW = {
  hornet: {
    url: './game/models/weapons/hornet.glb',
    gunNode: 'smg45',
    len: 0.6,
    muzzle: [0.115, -0.125, -0.6],
    world: { len: 0.6, grip: 0.36, gripTop: 0.38, gz: 0.045, fore: 0.66, sight: 0.9, fb: 'smg' },
    mag: /^clip/,
    casing: '45',
    clips: { fire: [0, 0.2], reloadEmpty: [0.2, 2.4], reload: [2.4, 4.2], inspect: [4.2, 6.3], idle: [6.3, 6.63], melee: [7.15, 7.8] },
  },
  mauler: {
    url: './game/models/weapons/mauler.glb',
    gunNode: 'shotgun',
    len: 0.98,
    muzzle: [0.12, -0.13, -0.84],
    world: { len: 0.98, grip: 0.3, gripTop: 0.4, gz: 0.045, fore: 0.62, sight: 0.86, fb: 'shotgun' },
    casing: '12ga',
    pump: !0,
    shells: { start: 0.38, per: 0.5, end: 0.5 },
    clips: { fire: [0, 0.43], pump: [0.43, 1.1], shellStart: [1.1, 1.45], shellIn: [1.45, 2.1], shellEnd: [2.1, 3.0], inspect: [3.0, 4.2], idle: [4.25, 5.25], melee: [5.37, 6.0] },
  },
  kestrel: {
    url: './game/models/weapons/kestrel.glb',
    gunNode: 'BPpistol',
    len: 0.205,
    muzzle: [0.09, -0.092, -0.44],
    world: { len: 0.205, grip: 0.14, gripTop: 0.73, gz: 0.022, fore: 0.5, sight: 0.97, fb: 'pistol' },
    mag: /^clip|^bullet/,
    casing: '9mm',
    clips: { fire: [0, 0.3], reloadEmpty: [0.3, 2.27], reload: [2.27, 4.4], inspect: [4.4, 5.87], idle: [5.87, 6.73], melee: [6.73, 7.4] },
  },
  anvil: {
    url: './game/models/weapons/anvil.glb',
    gunNode: 'lmg',
    len: 1.12,
    muzzle: [0.13, -0.15, -0.9],
    world: { len: 1.12, grip: 0.3, gripTop: 0.34, gz: 0.05, fore: 0.55, sight: 0.84, fb: 'lmg' },
    mag: /^mag|^bullet/,
    casing: '762',
    // the belt's rounds: animated only while a belt is being laid in (reloads); everywhere else they hold
    // the loaded position (the model's per-shot belt step snaps back out of line, which looked like flicker)
    freeze: { parts: /^bullet\d/, at: 0, clips: ['fire', 'idle', 'inspect', 'melee'] },
    clips: { fire: [0, 0.27], reload: [0.27, 4.6], inspect: [4.6, 6.13], reloadEmpty: [6.13, 10.5], idle: [10.5, 11.17], melee: [11.17, 11.83] },
  },
  striker: {
    url: './game/models/weapons/striker.glb',
    gunNode: 'g17_base',
    len: 0.19,
    muzzle: [0.09, -0.088, -0.42],
    world: { len: 0.19, grip: 0.14, gripTop: 0.73, gz: 0.022, fore: 0.5, sight: 0.97, fb: 'pistol' },
    mag: /^g17_magazine|^g17_bullet/,
    casing: '9mm',
    clips: { fire: [0, 0.43], reload: [0.43, 2.73], fireLast: [2.73, 3.1], reloadEmpty: [3.1, 6.0], inspect: [6.75, 7.8], idle: [7.8, 8.83] },
  },
};
const __AW_IDS = Object.keys(__AW);
// ---------------------------------------------------------------- stats, shop, unlocks, sounds, bots
const __AW_STATS = {
  hornet: {
    name: 'Hornet .45', slot: 1, price: 1450, damage: 29, rate: 0.072, auto: !0, mag: 25, reserve: 100, reload: 1.85, reloadEmpty: 2.25,
    spread: 0.0062, moveSpread: 0.016, recoil: 0.0066, pellets: 1, range: 45, falloff: 0.09, armorPen: 0.62, headMult: 3.4, speed: 6.2,
    killReward: 600, adsZoom: 1.25, pen: 0.8, unlock: 3,
  },
  mauler: {
    name: 'Mauler 12', slot: 1, price: 1600, damage: 24, rate: 0.92, auto: !1, mag: 6, reserve: 30, reload: 3.2,
    spread: 0.05, moveSpread: 0.02, recoil: 0.055, pellets: 9, range: 24, falloff: 0.3, armorPen: 0.5, headMult: 2, speed: 5.7,
    killReward: 900, adsZoom: 1.15, pen: 0.45, unlock: 4,
  },
  kestrel: {
    name: 'Kestrel 9', slot: 2, price: 400, damage: 31, rate: 0.13, auto: !1, mag: 15, reserve: 45, reload: 1.8, reloadEmpty: 2.0,
    spread: 0.0035, moveSpread: 0.03, recoil: 0.011, pellets: 1, range: 60, falloff: 0.06, armorPen: 0.55, headMult: 4, speed: 6.35,
    killReward: 350, adsZoom: 1.25, pen: 0.75, unlock: 1,
  },
  anvil: {
    name: 'Anvil 7.62', slot: 1, price: 5300, damage: 34, rate: 0.08, auto: !0, mag: 100, reserve: 200, reload: 4.35, reloadEmpty: 4.5,
    spread: 0.0055, moveSpread: 0.1, recoil: 0.009, pellets: 1, range: 125, falloff: 0.018, armorPen: 0.84, headMult: 3.5, speed: 4.6,
    killReward: 300, adsZoom: 1.4, pen: 2.1, unlock: 11,
  },
  striker: {
    name: 'Striker 17', slot: 2, price: 650, damage: 24, rate: 0.055, auto: !1, burst: 3, burstDelay: 0.3, mag: 18, reserve: 54, reload: 2.1,
    reloadEmpty: 2.6, spread: 0.0042, moveSpread: 0.032, recoil: 0.0125, pellets: 1, range: 50, falloff: 0.07, armorPen: 0.5, headMult: 3.8,
    speed: 6.3, killReward: 350, adsZoom: 1.2, pen: 0.7, unlock: 6,
  },
};
for (const [id, s] of Object.entries(__AW_STATS)) gw[id] = { id, ...s };
Object.assign(qO, { hornet: 'smg', mauler: 'shotgun', kestrel: 'pistol', anvil: 'heavy', striker: 'pistol' });
Object.assign(iU, {
  hornet: { onset: 3, freq: 0.8, phase: 0.3, amp: 0.55, bias: 0.06, vert: 0.85 },
  mauler: { onset: 1, freq: 1, phase: 0, amp: 0.3, bias: 0, vert: 1.2 },
  kestrel: { onset: 1, freq: 1.3, phase: 0.2, amp: 0.3, bias: 0.02, vert: 0.9 },
  anvil: { onset: 5, freq: 0.32, phase: 0.9, amp: 1.1, bias: 0.14, vert: 1.05 },
  striker: { onset: 1, freq: 1.6, phase: 0.6, amp: 0.55, bias: -0.04, vert: 1.05 },
});
Object.assign(VwA, {
  hornet: [0.02, 0.034, 0.018, 0.034],
  mauler: [0.075, 0.17, 0.032, 0.065],
  kestrel: [0.028, 0.11, 0.02, 0.045],
  anvil: [0.032, 0.045, 0.022, 0.04],
  striker: [0.024, 0.09, 0.018, 0.04],
});
Object.assign(z1, {
  hornet: { ...z1.smg, blast: 2100, boomGain: 0.75, vol: 0.95 },
  mauler: { ...z1.shotgun, vol: 1.1 },
  kestrel: { ...z1.pistol, blast: 3000, vol: 0.8 },
  anvil: { ...z1.lmg, blast: 1400, boomGain: 1.15, vol: 1.15 },
  striker: { ...z1.pistol, blast: 3300, vol: 0.76 },
});
{
  const ins = (after, item) => {
    const i = fQ.findIndex((x) => x.id === after);
    fQ.splice(i < 0 ? fQ.length : i + 1, 0, item);
  };
  ins('smg', { id: 'hornet', label: 'Hornet .45', price: 1450, hint: '.45 SMG. Steady from the hip. $600 per kill', cat: 'smgs' });
  ins('shotgun', { id: 'mauler', label: 'Mauler 12', price: 1600, hint: 'Pump shotgun. Loads shell by shell; fire to stop reloading', cat: 'smgs' });
  ins('pistol', { id: 'kestrel', label: 'Kestrel 9', price: 400, hint: '15-round 9 mm. Quick reload with one in the chamber', cat: 'pistols' });
  ins('kestrel', { id: 'striker', label: 'Striker 17', price: 650, hint: 'Three-round burst pistol. Slide locks on the last round', cat: 'pistols' });
  ins('lmg', { id: 'anvil', label: 'Anvil 7.62', price: 5300, hint: '100-round belt. Crouch to steady it', cat: 'heavy' });
  Xl.push(...__AW_IDS);
  J8.push('hornet', 'hornet', 'mauler', 'anvil');
  OwA.push('hornet', 'mauler', 'anvil');
  YwA.push('kestrel', 'striker');
  BG.push(
    { level: 1, kind: 'weapon', id: 'kestrel', name: 'Kestrel 9 pistol' },
    { level: 3, kind: 'weapon', id: 'hornet', name: 'Hornet .45 SMG' },
    { level: 4, kind: 'weapon', id: 'mauler', name: 'Mauler 12 pump shotgun' },
    { level: 6, kind: 'weapon', id: 'striker', name: 'Striker 17 burst pistol' },
    { level: 11, kind: 'weapon', id: 'anvil', name: 'Anvil 7.62 LMG' },
  );
  BG.sort((a, b) => a.level - b.level);
  // Inspect weapon key (X: free since scorestreaks were removed)
  Pn.some((b) => b.id === 'inspect') || Pn.splice(Pn.findIndex((b) => b.id === 'melee') + 1, 0, { id: 'inspect', label: 'Inspect weapon', group: 'Combat' });
  Ys.inspect || (Ys.inspect = ['KeyX', null]);
  const coreBind = q3;
  q3 = function (w) {
    if (w === 'inspect') {
      const h = eA.human && eA.human();
      h && (h.__inspectAt = performance.now());
      return;
    }
    return coreBind.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- simulation: reload times, shells, handling
{
  const corePl = Pl;
  Pl = function (w, A) {
    const before = A.reloadLeft,
      wp = A.weapons[A.active],
      d = wp && __AW_STATS[wp.id];
    corePl(w, A);
    if (!d || !(A.reloadLeft > 0) || before > 0) return;
    const ext = wp.max && wp.max > gw[wp.id].mag ? 1.12 : 1;
    A.__awEmpty = wp.mag === 0;
    if (__AW[wp.id].shells) {
      A.__sh = { id: wp.id, t: 0, phase: 'start', n: 0, empty: wp.mag === 0 };
      A.reloadLeft = 9;
    } else if (d.reloadEmpty && wp.mag === 0) A.reloadLeft = d.reloadEmpty * ext;
    A.__awReloadTotal = A.reloadLeft;
  };
}
// shell-by-shell reload, run before the core player update each tick
function __awShells(w, A, i, I) {
  const s = A.__sh;
  if (!s) return;
  const wp = A.weapons[A.active],
    sh = __AW[s.id] && __AW[s.id].shells;
  if (!A.alive || !wp || wp.id !== s.id || !sh || (i.slot && i.slot !== A.active)) {
    A.__sh = null;
    A.reloadLeft > 0 && (A.reloadLeft = 0);
    return;
  }
  // firing stops the reload with whatever is loaded (after the first shell is in)
  if ((i.firePressed || i.fire) && wp.mag > 0 && s.phase !== 'end') {
    A.__sh = null;
    A.reloadLeft = 0;
    return;
  }
  s.t += I;
  if (s.phase === 'start' && s.t >= sh.start) (s.phase = 'insert'), (s.t = 0);
  if (s.phase === 'insert' && s.t >= sh.per) {
    s.t -= sh.per;
    wp.mag += 1;
    wp.reserve -= 1;
    s.n += 1;
    w.fx.push({ type: 'shell', who: A.id });
    if (wp.mag >= ut(wp) || wp.reserve <= 0) (s.phase = 'end'), (s.t = 0);
  }
  if (s.phase === 'end' && s.t >= sh.end + (s.empty ? 0.45 : 0)) {
    A.__sh = null;
    A.reloadLeft = 0;
    return;
  }
  A.reloadLeft = 9; // keeps the core in its reloading state (no fire, no ADS) without it filling the tube
}
{
  const coreUpdate = Y8;
  Y8 = function (w, A, i, I) {
    try {
      A.__sh && __awShells(w, A, i, I);
    } catch (e) {}
    return coreUpdate.apply(this, arguments);
  };
}
// handling: Hornet steadier from the hip; Anvil steadier crouched
{
  const coreFire = aJ;
  aJ = function (w, A) {
    const wp = A.weapons[A.active],
      d = wp && gw[wp.id];
    if (!d || (wp.id !== 'hornet' && wp.id !== 'anvil')) return coreFire.apply(this, arguments);
    const s0 = d.spread,
      r0 = d.recoil;
    if (wp.id === 'hornet') d.spread = s0 * (1 - 0.25 * (1 - A.ads));
    else {
      const c = Math.min(1, A.crouch);
      d.spread = s0 * (1 - 0.25 * c);
      d.recoil = r0 * (1 - 0.4 * c);
    }
    try {
      return coreFire.apply(this, arguments);
    } finally {
      d.spread = s0;
      d.recoil = r0;
    }
  };
}
// ---------------------------------------------------------------- loading and fitting the models
function __awClipLoop(R, k) {
  const A = R.acts[k];
  A && R.cur === k && A.a.setLoop(k === 'idle' ? 2202 : A.a.loop, 1 / 0); // idle segments are short: ping-pong
}
function __awVerts(meshes, fn) {
  const v = new U();
  for (const o of meshes) {
    const p = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(p.count / 4000));
    for (let i = 0; i < p.count; i += step) {
      v.fromBufferAttribute(p, i);
      o.isSkinnedMesh && o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      fn(v);
    }
  }
}
function __awFit(id) {
  const c = __AW[id],
    R = c.rig,
    inner = R.inner,
    root = R.root;
  const gun = root.getObjectByName(c.gunNode) || root.getObjectByName(c.gunNode.replace(/[^\w]/g, '_'));
  if (!gun) throw new Error('gun node ' + c.gunNode + ' not found');
  const gunMeshes = [],
    armMeshes = [];
  root.traverse((o) => o.isMesh && (o.isSkinnedMesh ? armMeshes : gunMeshes).push(o));
  inner.position.set(0, 0, 0);
  inner.rotation.set(0, 0, 0);
  inner.scale.setScalar(1);
  const idle = R.acts.idle;
  R.mixer.stopAllAction();
  idle.a.reset().play();
  R.mixer.update(0);
  R.wrap.updateMatrixWorld(!0);
  // gun extent and the arms' centre in model space
  const gb = new xi();
  __awVerts(gunMeshes, (v) => gb.expandByPoint(v));
  const ac = new U();
  let an = 0;
  __awVerts(armMeshes, (v) => (ac.add(v), an++));
  an && ac.multiplyScalar(1 / an);
  const sz = gb.getSize(new U()),
    gc = gb.getCenter(new U()),
    axis = sz.x > sz.z ? 'x' : 'z',
    sign = c.flip ? -(Math.sign(gc[axis] - ac[axis]) || 1) : Math.sign(gc[axis] - ac[axis]) || 1;
  // barrel -> -Z: R_y(t) maps +X to (cos t, 0, -sin t) and +Z to (sin t, 0, cos t)
  const yaw = axis === 'x' ? (sign > 0 ? Math.PI / 2 : -Math.PI / 2) : sign > 0 ? Math.PI : 0;
  inner.rotation.y = yaw;
  inner.scale.setScalar(c.len / sz[axis]);
  R.wrap.updateMatrixWorld(!0);
  // muzzle (frontmost gun point) onto its target
  let mz = null;
  __awVerts(gunMeshes, (v) => (!mz || v.z < mz.z) && (mz = v.clone()));
  const d = new U(...c.muzzle).sub(mz);
  inner.position.add(d);
  R.wrap.updateMatrixWorld(!0);
  mz.add(d);
  // sight line: top of the gun over its rear half; ADS puts it on the centre of the screen
  const gb2 = new xi();
  __awVerts(gunMeshes, (v) => gb2.expandByPoint(v));
  const L = gb2.max.z - gb2.min.z,
    cx = (gb2.min.x + gb2.max.x) / 2;
  let top = -1 / 0;
  __awVerts(gunMeshes, (v) => v.z > gb2.min.z + 0.45 * L && v.z < gb2.min.z + 0.95 * L && Math.abs(v.x - cx) < 0.02 && v.y > top && (top = v.y));
  isFinite(top) || (top = gb2.max.y);
  c.ads = c.adsFix || [-cx, -0.018 - top, c.len < 0.3 ? 0.02 : -0.04];
  c.fitInfo = { axis, sign, scale: +(c.len / sz[axis]).toFixed(5), top: +top.toFixed(3), cx: +cx.toFixed(3), muzzle: mz.toArray().map((x) => +x.toFixed(3)) };
  R.bone = gun;
  R.muzzleWrap = mz.clone();
  R.muzzleLocal = gun.worldToLocal(mz.clone());
  // world / third-person gun: the gun parts in the idle pose, barrel along -Z
  const tpl = new ji();
  for (const o of gunMeshes) {
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld),
      m = new Ow(g, Array.isArray(o.material) ? o.material.map((x) => x.clone()) : o.material.clone());
    let n = o.name;
    for (let p = o; p && p !== gun; p = p.parent) if (c.mag && c.mag.test(p.name)) n = 'mag_' + o.name;
    m.name = n;
    tpl.add(m);
  }
  __XG[id] = { id, url: '__aw', rotY: 0, ...c.world };
  __xgPrep(tpl, __XG[id]);
  R.mixer.stopAllAction();
  R.cur = null;
}
for (const id of __AW_IDS) {
  const c = __AW[id];
  c.anim = !0;
  c.eye = [0, 0, 0];
  c.ads = [0, 0, 0];
  c.muzzleBone = /^$/;
  c.clips = Object.fromEntries(Object.entries(c.clips).map(([k, [a, b]]) => [k, ['', a, b]]));
  __RIG[id] = c;
}
typeof window < 'u' &&
  setTimeout(() => {
    for (const id of __AW_IDS) {
      const c = __AW[id];
      __glbParse(
        c.url,
        (g) => {
          try {
            __AW_PREP = { c, g };
            try {
              __rigPrep(g, c);
            } finally {
              __AW_PREP = null;
            }
            __awFit(id);
            Gc += 1;
          } catch (e) {
            console.warn('[weapons] ' + id, e);
            c.err = String(e && e.message);
          }
        },
        (e) => console.warn('[weapons] load ' + id, e),
      );
    }
  }, 600);
// clips listed in a weapon's `freeze`: the matching parts get a constant track (their value at `at` seconds
// on the model's animation track) instead of their animated one
let __AW_PREP = null;
{
  const coreClip = __rigClip;
  __rigClip = function (g, spec) {
    const clip = coreClip.apply(this, arguments),
      P = __AW_PREP,
      F = P && P.c.freeze;
    if (!clip || !F) return clip;
    const key = Object.keys(P.c.clips).find((k) => P.c.clips[k] === spec);
    if (!F.clips.includes(key)) return clip;
    const src = g.animations[0];
    clip.tracks = clip.tracks.map((t) => {
      if (!F.parts.test(t.name.split('.')[0])) return t;
      const st = src.tracks.find((x) => x.name === t.name);
      if (!st) return t;
      const v = Array.from(st.createInterpolant(new st.ValueBufferType(st.getValueSize())).evaluate(F.at));
      return new t.constructor(t.name, [0, clip.duration], [...v, ...v]);
    });
    return clip;
  };
}
// ---------------------------------------------------------------- first-person animation
function __awPlay(R, k, o = {}) {
  const ok = __rigPlay(R, k, o);
  ok && __awClipLoop(R, k);
  return ok;
}
{
  const coreRigFrame = __rigFrame;
  __rigFrame = function (m, G, c, f, l, t, r, b, Z, h, _, BA, DA, base, CA, fA, dA, hA, yawTilt) {
    const C = m.rig;
    if (!C || !C.anim) return coreRigFrame.apply(this, arguments);
    const R = C.rig,
      now = performance.now() / 1e3,
      wp = c.weapons[c.active];
    if (!R.drawn) {
      R.drawn = !0;
      R.lastShot = c.lastShotAt;
      R.lastMelee = c.meleeAt;
      R.lastInspect = c.__inspectAt;
      R.busyUntil = 0;
      R.locked = !1;
      R.pumpAt = 0;
      R.reloading = !1;
      R.spr = 0;
      R.jab = -9;
      R.shKey = '';
      __awPlay(R, 'idle', { fade: 0 });
    }
    // sprint: gun lowered and turned in
    R.spr += ((c.sprinting && c.onGround && !_ ? 1 : 0) - R.spr) * Math.min(1, t * 9);
    const jk = (now - R.jab) / 0.42,
      jab = jk >= 0 && jk < 1 ? Math.sin(jk * Math.PI) : 0;
    G.scale.setScalar(1);
    G.position.x += -base[0] + hA * 0.045 + C.ads[0] * r + R.spr * 0.02;
    G.position.y += -base[1] + dA + C.ads[1] * r - R.spr * 0.05 + jab * 0.03;
    G.position.z += -base[2] + C.ads[2] * r + R.spr * 0.03 - jab * 0.16;
    G.rotation.x += -CA - R.spr * 0.22 - jab * 0.35;
    G.rotation.y -= yawTilt - R.spr * 0.5;
    G.rotation.z -= fA - R.spr * 0.12;
    // melee
    if (c.meleeAt !== R.lastMelee) {
      R.lastMelee = c.meleeAt;
      R.locked = !1;
      R.pumpAt = 0;
      if (R.acts.melee && __awPlay(R, 'melee', { loop: !1, fade: 0.05, restart: !0, scale: R.acts.melee.dur / 0.6 })) R.busyUntil = now + 0.6;
      else R.jab = now;
    }
    // fire (and the pump after it)
    if (c.lastShotAt !== R.lastShot) {
      R.lastShot = c.lastShotAt;
      const last = !!(wp && wp.mag === 0 && R.acts.fireLast),
        k = last ? 'fireLast' : 'fire',
        A = R.acts[k],
        win = Math.max(0.05, C.pump ? f.rate * 0.4 : f.rate * 0.95),
        sc = Math.max(1, A.dur / win);
      __awPlay(R, k, { loop: !1, fade: 0.02, restart: !0, scale: sc });
      R.busyUntil = now + A.dur / sc;
      R.locked = last;
      R.pumpAt = C.pump && wp && wp.mag > 0 ? R.busyUntil : 0;
    }
    if (R.pumpAt && now >= R.pumpAt) {
      R.pumpAt = 0;
      const A = R.acts.pump,
        sc = Math.max(1, A.dur / Math.max(0.25, f.rate * 0.55));
      __awPlay(R, 'pump', { loop: !1, fade: 0.04, restart: !0, scale: sc });
      R.busyUntil = now + A.dur / sc;
    }
    // reload
    if (_) {
      const sh = c.__sh;
      if (C.shells && sh) {
        const key = sh.phase + ':' + sh.n;
        if (key !== R.shKey) {
          R.shKey = key;
          R.locked = !1;
          R.pumpAt = 0;
          if (sh.phase === 'start') __awPlay(R, 'shellStart', { loop: !1, fade: 0.1, restart: !0, scale: R.acts.shellStart.dur / C.shells.start });
          else if (sh.phase === 'insert') __awPlay(R, 'shellIn', { loop: !1, fade: 0.06, restart: !0, scale: R.acts.shellIn.dur / C.shells.per });
          else if (sh.phase === 'end') {
            __awPlay(R, 'shellEnd', { loop: !1, fade: 0.08, restart: !0, scale: R.acts.shellEnd.dur / C.shells.end });
            sh.empty && (R.pumpAt = now + C.shells.end);
          }
        }
      } else if (!R.reloading) {
        R.reloading = !0;
        R.locked = !1;
        R.pumpAt = 0;
        const empty = c.__awEmpty && R.acts.reloadEmpty,
          k = empty ? 'reloadEmpty' : 'reload',
          A = R.acts[k];
        A && __awPlay(R, k, { loop: !1, fade: 0.1, restart: !0, scale: A.dur / Math.max(0.5, c.__awReloadTotal || c.reloadLeft || f.reload) });
      }
    } else {
      R.reloading = !1;
      R.shKey = '';
      if (c.__inspectAt !== R.lastInspect) {
        R.lastInspect = c.__inspectAt;
        R.inspectReq = !0;
      }
      const free = now >= R.busyUntil && !R.pumpAt;
      if (free && R.locked) {
        // slide locked back: hold the last frame of the last-round shot
      } else if (free && R.inspectReq && R.acts.inspect && r < 0.2 && !c.sprinting) {
        R.inspectReq = !1;
        __awPlay(R, 'inspect', { loop: !1, fade: 0.2, restart: !0 });
        R.busyUntil = now + R.acts.inspect.dur;
      } else if (free) __awPlay(R, 'idle', { fade: R.cur === 'inspect' ? 0.3 : 0.15 });
      R.inspectReq && (r > 0.2 || DA) && (R.inspectReq = !1);
    }
    R.mixer.update(Math.min(t, 0.05));
    if (R.bone && R.muzzleLocal) {
      const p = R.bone.localToWorld(R.muzzleLocal.clone());
      G.worldToLocal(p);
      m.muzzle.copy(p);
    }
  };
}
// switching away and back resets the slide lock and an unfinished pump
{
  const coreRigFor = __rigFor;
  __rigFor = function (id) {
    const r = coreRigFor(id);
    if (r && __AW[id]) {
      r.rig.rig.locked = !1;
      r.rig.rig.pumpAt = 0;
    }
    return r;
  };
}
// ---------------------------------------------------------------- casings
// Small physics objects: gravity, drag, spin; swept against the Rapier world (walls, floors, stairs, props,
// glass) each frame; bounce with restitution, then lie on their side and stay for 12 s.
const __BRASS = { pool: [], n: 0, queue: [], made: !1, g: null, tmp: new U() };
const __BRASS_TYPES = {
  '9mm': { r: 0.0048, l: 0.019, col: '#c9a24a', metal: 1 },
  45: { r: 0.006, l: 0.023, col: '#c9a24a', metal: 1 },
  762: { r: 0.0058, l: 0.05, col: '#b8933f', metal: 1 },
  '12ga': { r: 0.0105, l: 0.067, col: '#9b2a22', metal: 0, base: '#c9a24a' },
  link: { box: [0.012, 0.004, 0.02], col: '#3a3d40', metal: 1 },
};
function __brassInit(g) {
  if (__BRASS.made && __BRASS.g === g) return;
  __BRASS.made = !0;
  __BRASS.g = g;
  for (const t of Object.values(__BRASS_TYPES)) {
    if (t.geo) continue;
    if (t.box) t.geo = new _i(...t.box);
    else if (t.base) {
      const paint = (geo, hex) => {
        const c = new UA(hex),
          n = geo.attributes.position.count,
          a = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) (a[i * 3] = c.r), (a[i * 3 + 1] = c.g), (a[i * 3 + 2] = c.b);
        geo.setAttribute('color', new gi(a, 3));
        return geo;
      };
      t.geo = Xn([paint(new Rw(t.r, t.r, t.l * 0.78, 10).translate(0, t.l * 0.11, 0), t.col), paint(new Rw(t.r * 1.05, t.r * 1.05, t.l * 0.22, 10).translate(0, -t.l * 0.39, 0), t.base)]);
      t.mat = new Gw({ vertexColors: !0, roughness: 0.55, metalness: 0.2 });
    } else t.geo = new Rw(t.r, t.r, t.l, 8);
    t.mat || (t.mat = new Gw({ color: t.col, metalness: t.metal, roughness: t.metal ? 0.32 : 0.6 }));
    t.half = t.box ? t.box[1] / 2 : t.r;
  }
  for (const o of __BRASS.pool) o.m.removeFromParent();
  __BRASS.pool = [...Array(90)].map(() => {
    const m = new Ow(__BRASS_TYPES['9mm'].geo, __BRASS_TYPES['9mm'].mat);
    m.visible = !1;
    m.castShadow = !1;
    g.add(m);
    return { m, v: new U(), w: new U(), life: 0, rest: !1, t: null, b: 0 };
  });
}
function __brassSpawn(type, pos, vel) {
  const t = __BRASS_TYPES[type];
  if (!t || !__BRASS.pool.length) return;
  const c = __BRASS.pool[__BRASS.n++ % __BRASS.pool.length];
  c.t = t;
  c.m.geometry = t.geo;
  c.m.material = t.mat;
  c.m.position.copy(pos);
  c.m.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.PI / 2);
  c.v.copy(vel);
  c.w.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 40);
  c.life = 12;
  c.rest = !1;
  c.b = 0;
  c.m.visible = !0;
}
function __brassEject(type, Z, local) {
  if (!__BRASS.made) return;
  const b = Hi(Z),
    u = cI(Z.yaw, Z.pitch),
    r = { x: Math.cos(Z.yaw), z: -Math.sin(Z.yaw) },
    pis = (gw[(Z.weapons[Z.active] || {}).id] || {}).slot === 2,
    fwd = local ? 0.32 : pis ? 0.42 : 0.5,
    p = new U(b.x + u.x * fwd + r.x * (local ? 0.12 : 0.1), b.y - (local ? 0.13 : 0.16) + u.y * fwd, b.z + u.z * fwd + r.z * (local ? 0.12 : 0.1)),
    sp = type === '12ga' ? 1.6 : 2.2,
    v = new U(r.x * (sp + Math.random() * 0.9) - u.x * 0.3 + Z.vel.x, 1.5 + Math.random() * 0.9 + Z.vel.y * 0.5, r.z * (sp + Math.random() * 0.9) - u.z * 0.3 + Z.vel.z);
  __brassSpawn(type, p, v);
  type === '762' && __brassSpawn('link', p.clone().add(new U(r.x * 0.03, 0, r.z * 0.03)), v.clone().multiplyScalar(0.8));
}
function __brassTick(dt) {
  if (!__BRASS.made) return;
  const now = performance.now() / 1e3,
    st = eA.state;
  for (let i = __BRASS.queue.length - 1; i >= 0; i--) {
    const q = __BRASS.queue[i];
    if (now < q.at) continue;
    __BRASS.queue.splice(i, 1);
    const Z = st && st.players.find((p) => p.id === q.who);
    Z && Z.alive && __brassEject(q.type, Z, q.local);
  }
  dt = Math.min(dt, 0.05);
  const P = __PHX,
    phys = __phxOn(),
    d = __BRASS.tmp;
  for (const c of __BRASS.pool) {
    if (c.life <= 0) continue;
    c.life -= dt;
    if (c.life <= 0) {
      c.m.visible = !1;
      continue;
    }
    if (c.rest) continue;
    c.v.y -= 9.81 * dt;
    c.v.multiplyScalar(1 - 0.4 * dt);
    const p = c.m.position,
      sp = c.v.length(),
      L = sp * dt;
    let hit = null;
    if (L > 1e-5) {
      d.copy(c.v).multiplyScalar(1 / sp);
      if (phys) {
        const h = P.world.castRayAndGetNormal(__phxRay(p, d), L + c.t.half, !0, void 0, __cg(__CG.DEBRIS, __CG.ENV | __CG.GLASS | __CG.INTERACTIVE));
        P.stats.rays++;
        h && (hit = { t: h.timeOfImpact, n: h.normal });
      } else {
        const fl = rm({ x: p.x, y: p.y + 0.05, z: p.z });
        p.y + d.y * L < fl + c.t.half && (hit = { t: Math.max(0, (p.y - fl - c.t.half) / Math.max(1e-4, -d.y)), n: { x: 0, y: 1, z: 0 } });
      }
    }
    if (hit) {
      const n = hit.n;
      p.addScaledVector(d, Math.max(0, hit.t - c.t.half));
      p.x += n.x * 0.002;
      p.y += n.y * 0.002;
      p.z += n.z * 0.002;
      const vn = c.v.x * n.x + c.v.y * n.y + c.v.z * n.z;
      c.v.x -= 1.4 * vn * n.x;
      c.v.y -= 1.4 * vn * n.y;
      c.v.z -= 1.4 * vn * n.z;
      c.v.multiplyScalar(0.62);
      c.w.multiplyScalar(0.55);
      c.b++;
      // resting on a floor: lie on its side
      if (n.y > 0.6 && (c.v.length() < 0.45 || c.b > 5)) {
        c.rest = !0;
        c.m.rotation.set(0, Math.random() * 6.28, c.t.box ? 0 : Math.PI / 2);
      }
    } else p.addScaledVector(c.v, dt);
    c.m.rotation.x += c.w.x * dt;
    c.m.rotation.y += c.w.y * dt;
    c.m.rotation.z += c.w.z * dt;
    p.y < -5 && (c.life = 0);
  }
}
{
  const coreShot = __fxShot;
  __fxShot = function (g, j, Z, local) {
    const id = j && j.weapon,
      c = __AW[id];
    if (!c || !g) return coreShot.apply(this, arguments);
    const n0 = __fx.nc;
    coreShot.apply(this, arguments);
    // the core spawns a generic rifle casing for non-local shots: replace it with this gun's
    if (__fx.nc !== n0) {
      const k = __fx.cas[(__fx.nc - 1) % __fx.cas.length];
      k.life = 0;
      k.m.visible = !1;
    }
    __brassInit(g);
    if (c.pump) {
      const wp = Z.weapons[Z.active];
      wp && wp.mag > 0 && __BRASS.queue.push({ at: performance.now() / 1e3 + gw[id].rate * 0.62, who: Z.id, type: c.casing, local });
    } else __brassEject(c.casing, Z, local);
  };
}
{
  const coreTick = __fxTick;
  __fxTick = function (dt) {
    coreTick(dt);
    try {
      __brassTick(dt);
    } catch (e) {}
  };
}
// ---------------------------------------------------------------- debug
typeof window < 'u' &&
  ((window.__bpWeapons = __AW),
  (window.__AW_SET = (id, o) => {
    Object.assign(__AW[id], o);
    __AW[id].rig && (__awFit(id), (Gc += 1));
  }));
// render a first-person model at given animation times into data URLs (used to find clip ranges)
typeof window < 'u' &&
  (window.__bpRigSheet = (url, times, opts = {}) =>
    new Promise((ok, fail) => {
      __glbParse(
        url,
        (g) => {
          try {
            const W = opts.w || 240,
              H = opts.h || 180,
              ren = new PZ({ antialias: !0, preserveDrawingBuffer: !0 });
            ren.setSize(W, H);
            const sc = new lD();
            sc.add(new dd('#ffffff', '#445566', 2.2));
            const dl = new Os('#ffffff', 2);
            dl.position.set(1, 2, 3);
            sc.add(dl);
            sc.add(g.scene);
            const mixer = new TZ(g.scene),
              clip = g.animations[0],
              act = mixer.clipAction(clip).play();
            g.scene.updateMatrixWorld(!0);
            const box = new xi().setFromObject(g.scene),
              c = box.getCenter(new U()),
              sz = box.getSize(new U()).length();
            const cam = new ui(opts.fov || 60, W / H, sz / 500, sz * 10);
            (opts.view || 'side') === 'side' ? cam.position.set(c.x + sz * 0.9, c.y + sz * 0.15, c.z) : cam.position.set(c.x + sz * 0.5, c.y + sz * 0.3, c.z + sz * 0.8);
            cam.lookAt(c);
            const out = [];
            for (const t of times) {
              mixer.setTime(t);
              ren.render(sc, cam);
              out.push(ren.domElement.toDataURL('image/jpeg', 0.8));
            }
            act.stop();
            ren.dispose();
            ok({ duration: clip.duration, frames: out, names: g.animations.map((a) => a.name) });
          } catch (e) {
            fail(String(e && e.stack));
          }
        },
        (e) => fail(String(e)),
      );
    }));
// test hooks
typeof window < 'u' &&
  ((window.__bpGw = (id) => gw[id]),
  (window.__bpBrass = () => ({ live: __BRASS.pool.filter((c) => c.life > 0).length, resting: __BRASS.pool.filter((c) => c.life > 0 && c.rest).length, types: [...new Set(__BRASS.pool.filter((c) => c.life > 0).map((c) => Object.keys(__BRASS_TYPES).find((k) => __BRASS_TYPES[k] === c.t)))] })));
