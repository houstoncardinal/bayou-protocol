/* ===== Bayou Protocol mod: Mixamo character models and animation ===== */
// Every character in the game (players, bots, online players, menus) is one of eight Mixamo models: four
// Counter-Terrorists and four Terrorists. Sources: assets-src/characters/<faction>/*.fbx. They are built
// by tools/build-characters.mjs into small game-ready files in public/game/characters/ (545 MB of FBX ->
// about 8 MB of GLB: textures 1024 px WebP, meshes up to ~22k triangles, quantised). All share one
// animation file, animations.glb, built from assets-src/animations/*.fbx.
//
// Wiring into the core:
//   Ju(look) -> the model URL for a look (core patch); mu(url) says it is a rigged, animated model
//   SZ(url)  -> loads the model and attaches the shared clips, with game names (Idle, Walk, Run) as aliases
//   XAA      -> sets up materials and shadows for these models (no extra geometry)
// The core's character component then does everything else as before: weapon-holding IK, aim pitch, wound
// decals, death ragdoll, killcam.
//
// Locomotion (__locoSpeed / __locoAfter hooks in the core character component): the clip follows the real
// movement relative to where the character faces: rifle walk forward, the same walk played in reverse when
// backpedalling, strafe left / right (the strafe clip reversed), run when fast, crouch walk, kneeling idle
// when crouched still, the firing loop when shooting while standing, jump when leaving the ground. Each clip
// plays at the speed its feet really travel, measured from the clip itself when the model loads (foot
// travel per cycle, scaled to the character's in-game size), so feet do not slide.
const __CHAR = {
  base: './game/characters/',
  anims: './game/characters/animations.glb',
  // faction folders and model files, in the order the folders list them (ct-guy-1 = first file, ...)
  files: {
    'counter-terrorists': ['Ch15_nonPBR', 'Ch35_nonPBR', 'Ch49_nonPBR', 'Swat'],
    terrorists: ['Ch10_nonPBR', 'Ch45_nonPBR', 'Warzombie_F_Pedroso', 'copzombie_l_actisdato'],
  },
  // game clip names -> clips in animations.glb (the canonical names stay available too)
  alias: { Idle: 'RifleIdle', Walk: 'RifleWalk', Run: 'RunForward', Fire: 'FiringRifle', Crouch: 'CrouchWalking', CrouchIdle: 'PistolKneelingIdle', Jump: 'JumpUp', Fall: 'JumpingDown', Death: 'Dying' },
  urls: new Set(),
  gait: new Map(), // model url -> { clip: metres per second at timeScale 1 }
  hipsScale: new Map(), // model url -> hips track scale applied to the shared clips
  ankle: new Map(), // model url -> ankle height above the soles / standing height (bind pose)
};
for (const [f, list] of Object.entries(__CHAR.files)) for (const n of list) __CHAR.urls.add(__CHAR.base + f + '/' + n + '.glb');
// ---------------------------------------------------------------- roster: operator -> model
// Five per side play in a match (the roster is the match); the picker offers the four models. The fifth
// operator on each side is a reserve who wears the first model of that side.
const __OPERATORS = [
  { roster: 'maya', body: 'ct1', team: 'CT', model: 'counter-terrorists/Swat', name: 'Vance', role: 'Pointman · first through the door, calls the stack', colors: { top: '#1e2530', gear: '#1a1f27', skin: '#c99a7a' } },
  { roster: 'jordan', body: 'ct2', team: 'CT', model: 'counter-terrorists/Ch15_nonPBR', name: 'Reyes', role: 'Marksman · plate carrier and helmet, holds the long angle', colors: { top: '#3f4a3a', gear: '#30382d', skin: '#b98a6a' } },
  { roster: 'hale', body: 'ct3', team: 'CT', model: 'counter-terrorists/Ch35_nonPBR', name: 'Hale', role: 'Breacher · all-black kit, first on the door', colors: { top: '#2b2f36', gear: '#202329', skin: '#d1a58a' } },
  { roster: 'ito', body: 'ct4', team: 'CT', model: 'counter-terrorists/Ch49_nonPBR', name: 'Ito', role: 'Support · radio, spare mags and steady rifle fire', colors: { top: '#4a4f45', gear: '#383c33', skin: '#e0b896' } },
  { roster: 'sam', body: 'ct5', team: 'CT', model: 'counter-terrorists/Swat', name: 'Ortiz', role: 'Reserve · fills the fifth slot', colors: { top: '#1e2530', gear: '#1a1f27', skin: '#a8765a' }, reserve: !0 },
  { roster: 'priya', body: 't1', team: 'T', model: 'terrorists/Ch10_nonPBR', name: 'Kastor', role: 'Leader · planned the break-out', colors: { top: '#4a4236', gear: '#3a3329', skin: '#b07a58' } },
  { roster: 'theo', body: 't2', team: 'T', model: 'terrorists/Ch45_nonPBR', name: 'Dray', role: 'Gunner · loud, fast, never reloads early', colors: { top: '#3d3a33', gear: '#2e2b26', skin: '#8d5a3b' } },
  { roster: 'wrench', body: 't3', team: 'T', model: 'terrorists/Warzombie_F_Pedroso', name: 'Wraith', role: 'Shock trooper · walks through gunfire', colors: { top: '#5a5444', gear: '#3c382e', skin: '#9a9584' } },
  { roster: 'crane', body: 't4', team: 'T', model: 'terrorists/copzombie_l_actisdato', name: 'Bishop', role: 'Turncoat · ex-guard in a stolen uniform', colors: { top: '#2c3340', gear: '#22272f', skin: '#9c9c8c' } },
  { roster: 'nova', body: 't5', team: 'T', model: 'terrorists/Ch10_nonPBR', name: 'Marek', role: 'Reserve · fills the fifth slot', colors: { top: '#4a4236', gear: '#3a3329', skin: '#c58a62' }, reserve: !0 },
];
const __OP_BY_BODY = Object.fromEntries(__OPERATORS.map((o) => [o.body, o]));
for (const o of __OPERATORS) {
  const r = cs.find((x) => x.id === o.roster);
  r && Object.assign(r, { name: o.name, role: o.role, team: o.team, reserve: !!o.reserve });
  wQ[o.roster] = ne({
    body: o.body,
    skin: o.colors.skin,
    hair: '#1a1410',
    top: o.colors.top,
    bottom: o.colors.top,
    accent: '#14171c',
    gear: o.colors.gear,
    pattern: 'none',
    head: 'none',
    eyes: 'none',
    face: 'none',
    vest: 'none',
    pack: 'none',
    gloves: !0,
    pads: !1,
  });
  Co[o.body] = { id: o.body, name: o.name, desc: o.role.split(' · ')[1] || o.role, build: yD({}), suggest: {}, sig: [] };
  ng.body.includes(o.body) || ng.body.push(o.body);
}
// ---------------------------------------------------------------- model URLs (used by the patched core Ju / mu)
function __charUrl(look) {
  const o = look && __OP_BY_BODY[look.body];
  return __CHAR.base + (o ? o.model : look && look.team === 'T' ? 'terrorists/Ch10_nonPBR' : 'counter-terrorists/Swat') + '.glb';
}
function __isCharUrl(u) {
  return __CHAR.urls.has(u);
}
// ---------------------------------------------------------------- loading: shared clips + gait measurement
const __LOCO_CLIPS = { Walk: 'z', Run: 'z', Strafing: 'x', CrouchWalking: 'z' };
// The shared clips were recorded on one skeleton; the hips translation in them is in that skeleton's units.
// A model whose legs are shorter or longer would stand in the floor or float, so every model gets its own
// copy of the clips with the hips track scaled by (its hips rest height / the clip skeleton's).
function __charClips(animGltf, f = 1, key = '') {
  animGltf.__bpClips || (animGltf.__bpClips = new Map());
  const k = key + ':' + f.toFixed(4);
  if (animGltf.__bpClips.has(k)) return animGltf.__bpClips.get(k);
  const scaled = (c) =>
    Math.abs(f - 1) < 1e-4
      ? c
      : new so(
          c.name,
          c.duration,
          c.tracks.map((t) => {
            if (!/Hips\.position$/.test(t.name)) return t;
            const u = t.clone();
            u.values = u.values.map((x) => x * f);
            return u;
          }),
        );
  const base = animGltf.animations.map(scaled),
    list = [...base];
  for (const [a, src] of Object.entries(__CHAR.alias)) {
    const c = base.find((x) => x.name === src);
    c && list.push(new so(a, c.duration, c.tracks));
  }
  animGltf.__bpClips.set(k, list);
  return list;
}
// metres per second each locomotion clip covers at normal speed: during the stance phase a foot travels
// backwards relative to the hips by one stride, so speed = 2 x foot travel / cycle length
function __charGait(url, gltf) {
  let g = __CHAR.gait.get(url);
  if (g) return g;
  g = {};
  try {
    const root = b$(gltf.scene);
    root.updateMatrixWorld(!0);
    const h = new xi().setFromObject(root).getSize(new U()).y || 1,
      scale = kO / h,
      mixer = new TZ(root),
      hips = root.getObjectByName('mixamorigHips'),
      feet = ['mixamorigLeftFoot', 'mixamorigRightFoot'].map((n) => root.getObjectByName(n)),
      a = new U(),
      b = new U();
    for (const clip of gltf.animations) {
      const axis = __LOCO_CLIPS[clip.name];
      if (!axis || !hips || !feet[0] || !feet[1]) continue;
      const act = mixer.clipAction(clip).play();
      const lo = [1e9, 1e9],
        hi = [-1e9, -1e9];
      for (let i = 0; i <= 48; i++) {
        mixer.setTime((clip.duration * i) / 48);
        root.updateMatrixWorld(!0);
        hips.getWorldPosition(a);
        feet.forEach((f, k) => {
          f.getWorldPosition(b);
          const d = b[axis] - a[axis];
          lo[k] = Math.min(lo[k], d);
          hi[k] = Math.max(hi[k], d);
        });
      }
      act.stop();
      mixer.uncacheClip(clip);
      const range = (hi[0] - lo[0] + hi[1] - lo[1]) / 2;
      g[clip.name] = Math.max(0.3, (2 * range * scale) / clip.duration);
    }
  } catch (e) {
    console.warn('[characters] gait', e);
  }
  // sensible fallbacks if a clip could not be measured
  g.Walk = g.Walk || 1.5;
  g.Run = g.Run || 4.8;
  g.Strafing = g.Strafing || 1.1;
  g.CrouchWalking = g.CrouchWalking || 1.1;
  __CHAR.gait.set(url, g);
  return g;
}
{
  const coreLoad = SZ;
  SZ = function (url) {
    const g = coreLoad(url);
    if (__isCharUrl(url) && !g.__bp) {
      const a = coreLoad(__CHAR.anims),
        mh = g.scene.getObjectByName('mixamorigHips'),
        ah = a.scene.getObjectByName('mixamorigHips'),
        f = mh && ah && Math.abs(ah.position.y) > 1e-6 ? mh.position.y / ah.position.y : 1;
      g.animations = __charClips(a, f, url);
      __CHAR.hipsScale.set(url, f);
      // ankle height above the soles in the bind pose, as a fraction of standing height (for foot IK)
      try {
        g.scene.updateMatrixWorld(!0);
        const bb = new xi().setFromObject(g.scene),
          fl = g.scene.getObjectByName('mixamorigLeftFoot');
        fl && __CHAR.ankle.set(url, (fl.getWorldPosition(new U()).y - bb.min.y) / Math.max(1e-4, bb.max.y - bb.min.y));
      } catch (e) {}
      g.scene.userData.bpChar = url;
      g.__bp = 1;
      __charGait(url, g);
    }
    return g;
  };
}
// preload: the shared clips and the first model of each side, while the menus are up
typeof window < 'u' &&
  setTimeout(() => {
    try {
      Jd.preload(r$, __CHAR.anims);
      for (const f of Object.keys(__CHAR.files)) Jd.preload(r$, __CHAR.base + f + '/' + __CHAR.files[f][0] + '.glb');
    } catch (e) {}
  }, 1500);
// ---------------------------------------------------------------- dressing: materials only
{
  const coreDress = XAA;
  XAA = function (w, A, i) {
    if (!w.userData.bpChar) return coreDress(w, A, i);
    // the core turns realistic models half a turn (its old rig faced -Z); these Mixamo exports face +Z
    Math.abs(w.rotation.y - Math.PI) < 1e-6 && (w.rotation.y = 0);
    w.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = !0;
      o.receiveShadow = !0;
      // the bind-pose bounds of a skinned mesh are too tight for an animated body; pad them
      o.geometry.boundingSphere || o.geometry.computeBoundingSphere();
      o.geometry.boundingSphere && !o.geometry.__padded && ((o.geometry.boundingSphere.radius *= 1.6), (o.geometry.__padded = 1));
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m) continue;
        'metalness' in m && (m.metalness = Math.min(m.metalness, 0.15));
        'roughness' in m && (m.roughness = Math.max(m.roughness, 0.55));
        'envMapIntensity' in m && (m.envMapIntensity = 0.7);
        m.side = 0;
      }
    });
  };
}
// ---------------------------------------------------------------- locomotion
const __LOCO = new Map();
function __locoState(v) {
  let st = __LOCO.get(v.id);
  st || __LOCO.set(v.id, (st = { last: null, vx: 0, vz: 0, speed: 0, air: 0, clip: 'Idle', ts: {}, crouchClip: !1, moving: !1, move: 'Walk', cand: null, candT: 0, yaw: null, lastShot: -1, kickT: -9 }));
  return st;
}
// Stability rules (what made characters twitch, duck and scramble):
//   - moving vs standing has hysteresis (starts above 0.85 m/s, stops below 0.4 m/s): collision nudges and
//     aim corrections no longer flick the legs between idle and walk
//   - crouched vs standing has hysteresis too (on above 0.62, off below 0.3 of the crouch)
//   - a change of movement clip (walk, strafe, back, run, crouch-walk) must hold for 0.18 s before it plays
//   - the visible body turns towards the aim direction smoothly (critically damped) instead of snapping
//     to every small aim correction; big turns (respawn, > 145°) snap
//   - no full firing animation swapped in and out on every shot: the aiming stance stays, and each shot
//     gives the upper body a small recoil kick (__locoAfter)
//   - legs play at most 1.5x (walks) / 1.8x (run): the run clip takes over from 2.6 m/s
//   - jump / fall only after 0.28 s in the air with real vertical speed (not every stair step)
function __locoSpeed(v, K, dt) {
  const st = __locoState(v),
    p = v.pos,
    R = jV.realistic;
  dt = Math.max(1e-3, Math.min(dt, 0.1));
  // velocity of the rendered body (smoothed): bots' stored velocity can lag their real movement
  if (!st.last || !v.alive || Math.hypot(p.x - st.last.x, p.z - st.last.z) > 3) st.last = { x: p.x, z: p.z };
  const k = 1 - Math.exp(-dt * 10);
  st.vx += ((p.x - st.last.x) / dt - st.vx) * k;
  st.vz += ((p.z - st.last.z) / dt - st.vz) * k;
  st.last.x = p.x;
  st.last.z = p.z;
  const speed = Math.hypot(st.vx, st.vz);
  st.speed = speed;
  st.moving = st.moving ? speed > 0.4 : speed > 0.85;
  // the body's visible heading: smoothed towards the aim yaw
  const target = v.yaw + Math.PI;
  if (st.yaw === null || !v.alive) st.yaw = target;
  const dy = Math.atan2(Math.sin(target - st.yaw), Math.cos(target - st.yaw));
  st.yaw = Math.abs(dy) > 2.5 ? target : st.yaw + dy * (1 - Math.exp(-dt * 13));
  K.rotation.y = st.yaw;
  const yaw = st.yaw - Math.PI;
  // direction of travel relative to that heading
  const fx = -Math.sin(yaw),
    fz = -Math.cos(yaw),
    fwd = (st.vx * fx + st.vz * fz) / (speed || 1),
    right = (st.vx * Math.cos(yaw) - st.vz * Math.sin(yaw)) / (speed || 1);
  st.air = v.onGround || Math.abs(v.vel.y) < 1.2 ? 0 : st.air + dt;
  const s = K.children[0],
    gait = (s && __CHAR.gait.get(s.userData.bpChar)) || { Walk: 1.5, Run: 4.8, Strafing: 1.1, CrouchWalking: 1.1 };
  st.crouchClip = st.crouchClip ? v.crouch > 0.3 : v.crouch > 0.62;
  const crouch = st.crouchClip;
  let cand;
  if (crouch) cand = fwd < -0.3 ? 'CrouchWalking-' : 'CrouchWalking';
  else if (Math.abs(right) > 0.72) cand = right > 0 ? 'Strafing-' : 'Strafing';
  else if (fwd < -0.3) cand = 'Walk-';
  else cand = speed > (st.move === 'Run' ? 2.3 : 2.6) ? 'Run' : 'Walk';
  if (cand !== st.move) {
    st.cand === cand ? (st.candT += dt) : ((st.cand = cand), (st.candT = 0));
    (st.candT > 0.18 || !st.moving) && (st.move = cand);
  } else st.cand = null;
  const move = st.move.replace('-', ''),
    sign = st.move.endsWith('-') ? -1 : 1,
    nat = gait[move] || 1.2,
    rate = sign * Math.max(0.6, Math.min(move === 'Run' ? 1.8 : 1.5, speed / nat));
  st.ts = { [move]: rate };
  // what the core will pick from: idle / walk / run / aim for this character this frame
  R.idle = crouch ? 'CrouchIdle' : 'Idle';
  R.walk = move;
  R.run = move;
  R.aim = crouch ? 'CrouchIdle' : 'Idle';
  if (st.air > 0.28 && v.alive) R.idle = R.walk = R.run = R.aim = v.vel.y > 0 ? 'Jump' : 'Fall';
  s && (s.userData.__bpLoco = st);
  return st.moving ? Math.max(speed, 0.7) : 0;
}
// a shot: the upper body takes a small, quick recoil kick (instead of swapping in a firing animation)
function __locoAfter(s, v) {
  const st = __LOCO.get(v.id);
  if (!st || !v.alive) return;
  const now = performance.now() / 1e3;
  if (v.lastShotAt !== st.lastShot) {
    st.lastShot !== -1 && (st.kickT = now);
    st.lastShot = v.lastShotAt;
  }
  const t = now - st.kickT;
  if (t > 0.25) return;
  const a = 0.055 * Math.exp(-t * 18) * Math.min(1, t * 60);
  const sp = s.userData.__spine || (s.userData.__spine = [s.getObjectByName('mixamorigSpine2'), s.getObjectByName('mixamorigNeck')]);
  sp[0] && sp[0].rotateX(-a);
  sp[1] && sp[1].rotateX(a * 0.5);
}
// clip playback speed comes from the locomotion state for these models (the core's own timeScale writes,
// tuned for the old clips, are kept for every other model)
Object.defineProperty(Q3.prototype, 'timeScale', {
  configurable: !0,
  get() {
    const st = this._mixer && this._mixer._root && this._mixer._root.userData && this._mixer._root.userData.__bpLoco,
      v = st && st.ts[this._clip.name];
    return v !== void 0 ? v : this.__ts;
  },
  set(v) {
    this.__ts = v;
  },
});
// weapon-holding IK: when a crouch clip already bends the legs, do not lower the body a second time
{
  const coreIk = Ou.prototype.update;
  Ou.prototype.update = function (o) {
    const st = this.body && this.body.userData && this.body.userData.__bpLoco;
    // aim pitch follows smoothly (no shaking upper body when the aim jitters)
    const now = performance.now() / 1e3,
      dt = Math.min(0.1, now - (this.__pt || now));
    this.__pt = now;
    this.__p === void 0 || Math.abs(o.pitch - this.__p) > 1.2 ? (this.__p = o.pitch) : (this.__p += (o.pitch - this.__p) * (1 - Math.exp(-dt * 12)));
    return coreIk.call(this, { ...o, pitch: this.__p, crouch: st && st.crouchClip ? 0 : o.crouch });
  };
}
// the old classic / realistic choice no longer exists: hide the setting
{
  const coreRow = rw;
  rw = function (p) {
    return p.label === 'Characters' ? null : coreRow(p);
  };
}
// ---------------------------------------------------------------- <GameCharacter>
// A reusable character for any R3F scene in the game, e.g. (JSX):
//   {/* Spawning a Counter-Terrorist running */}
//   <GameCharacter faction="counter-terrorists" fileName="ct-guy-1.fbx" currentAnimation="Run" />
//   {/* Spawning a Terrorist firing a rifle using the exact same shared animation folder! */}
//   <GameCharacter faction="terrorists" fileName="t-guy-1.fbx" currentAnimation="FiringRifle" />
// In the mods (no JSX): M.jsx(GameCharacter, { faction: 'terrorists', fileName: 't-guy-1.fbx', currentAnimation: 'FiringRifle' })
// Render it inside <Suspense>: the model and the shared clips load once and are cached.
//   faction           'counter-terrorists' | 'terrorists'
//   fileName          the FBX you put in the folder ('Swat.fbx', 'Ch10_nonPBR.fbx'), or 'ct-guy-N.fbx' /
//                     't-guy-N.fbx' for the Nth model in that folder; the optimised GLB built from it loads
//   currentAnimation  a clip name made from the animation file name ('Firing Rifle.fbx' -> 'FiringRifle',
//                     'Rifle Walk.fbx' -> 'RifleWalk') or a game alias (Idle, Walk, Run, Fire, Crouch, ...)
//   fade              cross-fade seconds (default 0.2); height (metres, default 1.8); position/rotation/scale
function __charResolve(faction, fileName) {
  const list = __CHAR.files[faction] || __CHAR.files['counter-terrorists'];
  const base = String(fileName || '').replace(/\.(fbx|glb)$/i, '');
  const m = /^(?:ct|t)-guy-(\d+)$/i.exec(base);
  const name = m ? list[(Math.max(1, +m[1]) - 1) % list.length] : list.find((n) => n.toLowerCase() === base.replace(/[^A-Za-z0-9]+/g, '_').toLowerCase()) || list[0];
  return __CHAR.base + faction + '/' + name + '.glb';
}
function __clipName(n) {
  const c = String(n || 'Idle').replace(/\.fbx$/i, '').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : '')).join('');
  return c;
}
function GameCharacter({ faction = 'counter-terrorists', fileName = 'ct-guy-1.fbx', currentAnimation = 'Idle', fade = 0.2, height = kO, position, rotation, scale }) {
  const url = __charResolve(faction, fileName),
    gltf = SZ(url);
  // a skeleton-safe clone per instance, scaled to the requested height, facing the same way as the game's
  const scene = S.useMemo(() => {
    const s = b$(gltf.scene);
    s.updateMatrixWorld(!0);
    const b = new xi().setFromObject(s),
      k = height / Math.max(1e-4, b.max.y - b.min.y);
    s.scale.setScalar(k);
    s.position.y = -b.min.y * k;
    XAA(s, null, null);
    return s;
  }, [gltf, height]);
  // useAnimations equivalent: one mixer bound to this clone, an action per clip (by name)
  const { mixer, actions } = S.useMemo(() => {
    const mx = new TZ(scene),
      acts = {};
    for (const c of gltf.animations) acts[c.name] = mx.clipAction(c);
    return { mixer: mx, actions: acts };
  }, [scene, gltf.animations]);
  const cur = S.useRef(null);
  S.useEffect(() => {
    const want = __clipName(currentAnimation),
      next = actions[want] || actions[__CHAR.alias[want]] || actions.Idle;
    if (!next) return;
    const prev = cur.current;
    if (prev === next) return;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(prev ? fade : 0).play();
    prev && prev.fadeOut(fade);
    cur.current = next;
  }, [currentAnimation, actions, fade]);
  // cleanup: stop and release this instance's actions and bindings (model swaps, unmounts)
  S.useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      cur.current = null;
    },
    [mixer, scene],
  );
  QI((_, dt) => mixer.update(Math.min(dt, 0.1)));
  return M.jsx('group', { position, rotation, scale, children: M.jsx('primitive', { object: scene }) });
}
typeof window < 'u' && ((window.GameCharacter = GameCharacter), (window.__bpChars = { __CHAR, __OPERATORS, __LOCO }));
// ---------------------------------------------------------------- operator picker: the four models per side
// (the reserve fifth operator still plays as a bot but is not offered in the picker)
iF = function ({ team: w, value: A, onPick: i }) {
  const B = ii[w];
  return M.jsx('div', {
    className: 'op-roster',
    style: { '--team': B.main, '--teamhi': B.light },
    children: y9(w)
      .filter((g) => !g.reserve)
      .map((g) => {
        const [n, e] = g.role.split(' · ');
        return M.jsxs(
          'button',
          {
            className: 'op-card',
            'aria-pressed': A === g.id,
            onClick: () => i(g.id),
            children: [
              M.jsx(hQ, { look: Ng(Is(g.id)), size: 48 }),
              M.jsxs('span', { className: 'op-card-txt', children: [M.jsx('b', { children: g.name }), M.jsxs('small', { children: [M.jsx('em', { children: n }), ' ', e] })] }),
              A === g.id && M.jsx('span', { className: 'op-check', children: M.jsx(Pw, { name: 'check', size: 14, sw: 2.6 }) }),
            ],
          },
          g.id,
        );
      }),
  });
};
{
  const corePick = is;
  is = function (w) {
    const v = corePick(w),
      r = cs.find((x) => x.id === v);
    return r && r.reserve ? (y9(w).find((x) => !x.reserve) || r).id : v;
  };
}
// preview helper (tests, tooling): mounts <GameCharacter> in its own canvas inside an element
typeof window < 'u' &&
  (window.__bpPreviewCharacter = (el, props) => {
    const root = Km.createRoot(el);
    root.render(
      M.jsx(x3, {
        camera: { fov: 30, position: [0, 1.1, 5.5] },
        children: [
          M.jsx('hemisphereLight', { args: ['#dfe6f0', '#2a2620', 1.2] }, 'h'),
          M.jsx('directionalLight', { position: [3, 6, 4], intensity: 2.2 }, 'd'),
          M.jsx(S.Suspense, { fallback: null, children: M.jsx(GameCharacter, props) }, 's'),
        ],
      }),
    );
    return { update: (p) => root.render(M.jsx(x3, { camera: { fov: 30, position: [0, 1.1, 5.5] }, children: [M.jsx('hemisphereLight', { args: ['#dfe6f0', '#2a2620', 1.2] }, 'h'), M.jsx('directionalLight', { position: [3, 6, 4], intensity: 2.2 }, 'd'), M.jsx(S.Suspense, { fallback: null, children: M.jsx(GameCharacter, p) }, 's')] })), unmount: () => root.unmount() };
  });
