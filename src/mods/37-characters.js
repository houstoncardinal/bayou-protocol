/* ===== Bayou Protocol mod: Mixamo character models and animation ===== */
// Every character in the game (players, bots, online players, menus) is one of eight models: four
// Counter-Terrorists and four Terrorists, all rigged on Mixamo except Wraith (his own rig, retargeted to the
// Mixamo animations in 48-retarget.js). Ghost is "gasmask 2.fbx", rigged with Mixamo's Auto-Rigger.
// Sources: assets-src/characters/<faction>/*.fbx. They are built
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
// movement relative to where the character faces, from the Mixamo rifle locomotion set: walk and run
// forwards, backwards, strafing left and right, a relaxed rifle idle and an aiming idle when engaged, turning
// on the spot, crouch walk, kneeling idle when crouched still, rifle jump and fall. Over the legs, upper-body
// actions: reloading, the grenade toss, a flinch when hit and the recoil loop while firing. Each locomotion
// clip plays at the speed its feet really travel, measured from the clip itself when the model loads (foot
// travel per cycle, scaled to the character's in-game size), so feet do not slide.
const __CHAR = {
  base: './game/characters/',
  anims: './game/characters/animations.glb',
  // faction folders and model files, in the order the folders list them (ct-guy-1 = first file, ...)
  files: {
    'counter-terrorists': ['Ch15_nonPBR', 'Ch35_nonPBR', 'Ch36_desert_operator', 'Ch18_nonPBR'],
    terrorists: ['Ch10_nonPBR', 'terrorist-djmaesen', 'The_Boss', 'gasmask_2'],
    prisoners: ['Ch08_nonPBR'],
  },
  // models rigged on another skeleton: renamed and given retargeted animations when they load (48-retarget.js)
  retarget: { 'terrorists/terrorist-djmaesen': 'djmaesen' },
  // game clip names -> clips in animations.glb (the canonical names stay available too)
  // (the rifle locomotion set: a real clip for every direction at walking and running pace)
  alias: {
    Idle: 'RifleIdle',
    AimIdle: 'RifleAimingIdle',
    Walk: 'Walking',
    WalkBack: 'WalkingBackwards',
    StrafeL: 'StrafeLeft',
    StrafeR: 'StrafeRight',
    Run: 'RifleRun',
    RunBack: 'RunBackwards',
    RunStrafeL: 'Strafe2',
    RunStrafeR: 'Strafe',
    TurnL: 'TurnLeft',
    TurnR: 'TurningRight45Degrees',
    Fire: 'FiringRifle',
    Crouch: 'CrouchWalking',
    CrouchIdle: 'PistolKneelingIdle',
    Jump: 'RifleJump',
    Fall: 'JumpingDown',
    Death: 'Dying',
  },
  // upper-body actions played over the legs (spine, arms and head only): name -> source clip
  overlay: { UpReload: 'Reloading', UpToss: 'TossGrenade', UpHit: 'HitReaction', UpFire: 'FiringRifle' },
  urls: new Set(),
  clips: new Map(), // model url -> its clips (with the upper-body versions)
  gait: new Map(), // model url -> { clip: metres per second at timeScale 1 }
  hipsScale: new Map(), // model url -> hips track scale applied to the shared clips
  ankle: new Map(), // model url -> ankle height above the soles / standing height (bind pose)
};
for (const [f, list] of Object.entries(__CHAR.files)) for (const n of list) __CHAR.urls.add(__CHAR.base + f + '/' + n + '.glb');
// ---------------------------------------------------------------- roster: operator -> model
// Five per side play in a match (the roster is the match); the picker offers the side's models. Reserve
// operators fill a side to five: they wear one of the side's models and are not offered in the picker.
const __OPERATORS = [
  { roster: 'maya', body: 'ct1', team: 'CT', model: 'counter-terrorists/Ch18_nonPBR', name: 'Rook', role: 'Pointman · first through the door, calls the stack', colors: { top: '#2b3138', gear: '#1f242a', skin: '#c99a7a' } },
  { roster: 'jordan', body: 'ct2', team: 'CT', model: 'counter-terrorists/Ch15_nonPBR', name: 'Reyes', role: 'Marksman · plate carrier and helmet, holds the long angle', colors: { top: '#3f4a3a', gear: '#30382d', skin: '#b98a6a' } },
  { roster: 'hale', body: 'ct3', team: 'CT', model: 'counter-terrorists/Ch35_nonPBR', name: 'Hale', role: 'Breacher · all-black kit, first on the door', colors: { top: '#2b2f36', gear: '#202329', skin: '#d1a58a' } },
  // reserves fill a side to five in a match; they wear a model of their side and are not in the picker
  { roster: 'ito', body: 'ct4', team: 'CT', model: 'counter-terrorists/Ch18_nonPBR', name: 'Mercer', role: 'Rifleman · reserve, holds the flank', colors: { top: '#2b3138', gear: '#1f242a', skin: '#c99a7a' }, reserve: !0 },
  { roster: 'sam', body: 'ct5', team: 'CT', model: 'counter-terrorists/Ch36_desert_operator', name: 'Kade', role: 'Desert operator · long-range overwatch in sand camo', colors: { top: '#a08b64', gear: '#7d6c4c', skin: '#b98a6a' } },
  { roster: 'priya', body: 't1', team: 'T', model: 'terrorists/Ch10_nonPBR', name: 'Kastor', role: 'Leader · planned the break-out', colors: { top: '#4a4236', gear: '#3a3329', skin: '#b07a58' } },
  { roster: 'wrench', body: 't3', team: 'T', model: 'terrorists/terrorist-djmaesen', name: 'Wraith', role: 'Insurgent · face wrapped, rifle up, first in', colors: { top: '#5a5444', gear: '#3c382e', skin: '#9a9584' } },
  { roster: 'nova', body: 't5', team: 'T', model: 'terrorists/Ch10_nonPBR', name: 'Sokol', role: 'Enforcer · reserve, holds the choke', colors: { top: '#4a4236', gear: '#3a3329', skin: '#b07a58' }, reserve: !0 },
  { roster: 'ghost', body: 't6', team: 'T', model: 'terrorists/gasmask_2', name: 'Ghost', role: 'Chemist · full-face respirator, smoke and gas, never takes it off', colors: { top: '#3a3d36', gear: '#2a2c27', skin: '#b07a58' } },
  { roster: 'boss', body: 't7', team: 'T', model: 'terrorists/The_Boss', name: 'The Boss', role: 'Kingpin · runs the crew, cigar in, never misses a payday', colors: { top: '#2a2522', gear: '#1d1a18', skin: '#c58a62' } },
];
// operators beyond the core's five a side get a roster entry of their own; core operators no longer in
// the roster (Dray, Bishop) are taken out of it
for (const o of __OPERATORS) cs.some((x) => x.id === o.roster) || cs.push({ id: o.roster, name: o.name, team: o.team, role: o.role });
for (let i = cs.length - 1; i >= 0; i--) __OPERATORS.some((o) => o.roster === cs[i].id) || cs.splice(i, 1);
// a match is still five a side: your operator plus four more of your side, the rest sit this one out (a
// different one each match, so every operator plays)
{
  const coreStart = BY;
  BY = function (w) {
    if (!w || w.roster) return coreStart.apply(this, arguments);
    const all = cs.slice(),
      keep = [],
      // the live match behind the menus (no human player) is scenery: three a side is plenty
      side = !w.operatorId && w.team == null ? 3 : 5;
    for (const team of ['CT', 'T']) {
      const list = all.filter((x) => x.team === team),
        me = list.find((x) => x.id === w.operatorId),
        rest = list.filter((x) => x !== me).sort(() => Math.random() - 0.5);
      keep.push(...(me ? [me] : []), ...rest.slice(0, side - (me ? 1 : 0)));
    }
    cs.length = 0;
    cs.push(...all.filter((x) => keep.includes(x)));
    try {
      return coreStart.apply(this, arguments);
    } finally {
      cs.length = 0;
      cs.push(...all);
    }
  };
}
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
  return __CHAR.base + (o ? o.model : look && look.team === 'T' ? 'terrorists/Ch10_nonPBR' : 'counter-terrorists/Ch15_nonPBR') + '.glb';
}
function __isCharUrl(u) {
  return __CHAR.urls.has(u);
}
// ---------------------------------------------------------------- loading: shared clips + gait measurement
const __LOCO_CLIPS = { Walk: 1, WalkBack: 1, StrafeL: 1, StrafeR: 1, Run: 1, RunBack: 1, RunStrafeL: 1, RunStrafeR: 1, CrouchWalking: 1 };
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
// Per model, after its clips are built (or retargeted):
//   - the turn-in-place clips keep their stepping feet but not their turn: the Mixamo clips rotate the hips a
//     quarter / eighth of a turn, and the game already turns the body to the aim, so the hips' rotation about
//     the vertical is taken out (key by key, relative to the first key)
//   - an upper-body copy of each action clip (reload, grenade toss, hit flinch, firing recoil): only the
//     spine above the waist, the neck, head, shoulders, arms and hands, so it plays over any leg movement
const __UPPER = /^mixamorig(Spine1|Spine2|Neck|Head|HeadTop_End|(Left|Right)(Shoulder|Arm|ForeArm|Hand\w*))\.quaternion$/;
function __charExtras(list) {
  if (list.__bpExtras) return list;
  const out = list.map((c) => {
    if (c.name !== 'TurnL' && c.name !== 'TurnR') return c;
    const tracks = c.tracks.map((t) => {
      if (!/Hips\.quaternion$/.test(t.name)) return t;
      const u = t.clone(),
        q = new Kw(),
        f = new U(),
        y = new Kw(),
        Y = new U(0, 1, 0),
        yawOf = () => (f.set(0, 0, 1).applyQuaternion(q), Math.atan2(f.x, f.z));
      q.fromArray(u.values, 0);
      const y0 = yawOf();
      for (let i = 0; i < u.values.length; i += 4) {
        q.fromArray(u.values, i);
        q.premultiply(y.setFromAxisAngle(Y, y0 - yawOf())).toArray(u.values, i);
      }
      return u;
    });
    return new so(c.name, c.duration, tracks);
  });
  for (const [name, src] of Object.entries(__CHAR.overlay)) {
    const c = list.find((x) => x.name === src);
    c && out.push(new so(name, c.duration, c.tracks.filter((t) => __UPPER.test(t.name))));
  }
  out.__bpExtras = 1;
  return out;
}
// tracks for bones a model does not have (Ghost's Auto-Rigger skeleton has index fingers and thumbs only)
// are dropped: three.js would otherwise warn for each one whenever an action is made, and bind nothing
function __charFit(list, scene) {
  const names = new Set();
  scene.traverse((o) => names.add(o.name));
  const keep = (t) => names.has(t.name.slice(0, t.name.lastIndexOf('.')));
  if (list.every((c) => c.tracks.every(keep))) return list;
  const out = list.map((c) => (c.tracks.every(keep) ? c : new so(c.name, c.duration, c.tracks.filter(keep))));
  out.__bpExtras = 1;
  return out;
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
      feet = ['LeftToeBase', 'RightToeBase'].map((n) => root.getObjectByName('mixamorig' + n) || root.getObjectByName('mixamorig' + n.replace('ToeBase', 'Foot'))),
      a = new U(),
      b = new U();
    // ground speed at which the planted foot stays still: while a foot is the lower one (on the ground), it
    // moves backwards relative to the hips at exactly the speed the body must travel for it not to slide
    const N = 120;
    for (const clip of gltf.animations) {
      if (!__LOCO_CLIPS[clip.name] || !hips || !feet[0] || !feet[1]) continue;
      const act = mixer.clipAction(clip).play(),
        P = [];
      for (let i = 0; i <= N; i++) {
        mixer.setTime((clip.duration * i) / N);
        root.updateMatrixWorld(!0);
        hips.getWorldPosition(a);
        P.push(
          feet.map((f) => {
            f.getWorldPosition(b);
            return [b.x - a.x, b.y, b.z - a.z];
          }),
        );
      }
      act.stop();
      mixer.uncacheClip(clip);
      const dts = clip.duration / N;
      let sum = 0,
        n = 0;
      for (let i = 0; i < N; i++) {
        const k = P[i][0][1] < P[i][1][1] ? 0 : 1,
          k2 = P[i + 1][0][1] < P[i + 1][1][1] ? 0 : 1;
        if (k !== k2) continue;
        sum += Math.hypot(P[i + 1][k][0] - P[i][k][0], P[i + 1][k][2] - P[i][k][2]) / dts;
        n++;
      }
      n && (g[clip.name] = Math.max(0.3, (sum / n) * scale));
    }
  } catch (e) {
    console.warn('[characters] gait', e);
  }
  // sensible fallbacks if a clip could not be measured
  // (the clips' own travel speeds, from their root motion: tools/build-characters.mjs -> manifest.json)
  for (const [k, v] of Object.entries({ Walk: 1, WalkBack: 1.1, StrafeL: 1.38, StrafeR: 0.75, Run: 3.1, RunBack: 2.75, RunStrafeL: 2.8, RunStrafeR: 3.3, CrouchWalking: 1.1 })) g[k] = g[k] || v;
  __CHAR.gait.set(url, g);
  return g;
}
{
  const coreLoad = SZ;
  SZ = function (url) {
    const g = coreLoad(url);
    if (__isCharUrl(url) && !g.__bp) {
      const a = coreLoad(__CHAR.anims),
        rt = __CHAR.retarget[url.slice(__CHAR.base.length).replace(/\.glb$/, '')],
        mh = g.scene.getObjectByName('mixamorigHips'),
        ah = a.scene.getObjectByName('mixamorigHips'),
        f = mh && ah && Math.abs(ah.position.y) > 1e-6 ? mh.position.y / ah.position.y : 1;
      g.animations = __charClips(a, f, url);
      if (rt)
        try {
          g.animations = __retarget(g, a, rt);
        } catch (e) {
          console.warn('[characters] retarget ' + url, e);
        }
      g.animations = __charFit(__charExtras(g.animations), g.scene);
      __CHAR.clips.set(url, g.animations);
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
      (__CHAR.scenes || (__CHAR.scenes = [])).push(g.scene); // shader warm-up in the menus (54-speed.js)
      __charGait(url, g);
    }
    return g;
  };
}
// preload: the shared clips and the first model of each side, while the menus are up (once the menu scene
// is lit: 02-weapon-models.js)
typeof window < 'u' &&
  __glbAfter(() => {
    try {
      Jd.preload(r$, __CHAR.anims);
      for (const f of Object.keys(__CHAR.files)) f !== 'prisoners' && Jd.preload(r$, __CHAR.base + f + '/' + __CHAR.files[f][0] + '.glb');
    } catch (e) {}
  }, 300);
// ---------------------------------------------------------------- dressing: materials only
{
  const coreDress = XAA;
  XAA = function (w, A, i) {
    if (!w.userData.bpChar) return coreDress(w, A, i);
    // the core turns realistic models half a turn (its old rig faced -Z); these Mixamo exports face +Z
    Math.abs(w.rotation.y - Math.PI) < 1e-6 && (w.rotation.y = 0);
    // retargeted rigs may be authored facing another way
    w.userData.__faceYaw && !w.userData.__faced && ((w.rotation.y -= w.userData.__faceYaw), (w.userData.__faced = 1));
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
// ---------------------------------------------------------------- deaths
// How a character dies:
//   - body shot: the body turns to fall away from the shooter and plays the Dying animation (hit, stagger
//     back, knees, down) 35 % faster than recorded; just before it reaches the ground the physics ragdoll
//     (the core's Verlet ragdoll) takes over from that pose, so it settles onto the real ground, slopes and
//     steps instead of lying on a flat plane
//   - headshot, explosion, crouched or in the air: straight to the ragdoll (a limp drop, or thrown)
//   - if a ragdoll cannot be built for a model, the Dying animation plays to the end and stays down
jV.realistic.dead = 'Death';
const __DIE = { rate: 1.35, handover: 2.45 }; // clip seconds at which the ragdoll takes over
{
  const coreClipAction = TZ.prototype.clipAction;
  TZ.prototype.clipAction = function (clip) {
    const a = coreClipAction.apply(this, arguments);
    const name = typeof clip === 'string' ? clip : clip && clip.name;
    a && /^(Death|Dying)$/.test(name || '') && a.loop !== 2200 && ((a.loop = 2200), (a.clampWhenFinished = !0)); // LoopOnce
    return a;
  };
  const coreRagdoll = yZ.from;
  yZ.from = function (s, o) {
    const st = s && s.userData && s.userData.__bpLoco;
    if (!st || !o) return coreRagdoll.apply(this, arguments);
    const now = performance.now() / 1e3;
    // a new death (the last one ended in a ragdoll, or long ago)
    (!st.dieAt || now - st.dieAt > 8) && ((st.dieAt = now), (st.dieInstant = !!(o.headshot || o.force >= 1.3 || st.dieCrouch || st.dieAir)));
    if (!st.dieInstant && now - st.dieAt < __DIE.handover / __DIE.rate) return null; // the Dying clip plays meanwhile
    // hand over in the pose the clip has reached, facing the way it fell
    const K = s.parent;
    K && st.yaw != null && ((K.rotation.y = st.yaw), K.updateMatrixWorld(!0));
    const r = coreRagdoll.call(this, s, st.dieInstant ? o : { ...o, force: o.force * 0.25, vel: { x: 0, y: 0, z: 0 } });
    r && (st.dieAt = 0);
    return r;
  };
}
// ---------------------------------------------------------------- locomotion
const __LOCO = new Map();
function __locoState(v) {
  let st = __LOCO.get(v.id);
  st || __LOCO.set(v.id, (st = { last: null, vx: 0, vz: 0, speed: 0, air: 0, clip: 'Idle', ts: {}, crouchClip: !1, moving: !1, move: 'Walk', cand: null, candT: 0, yaw: null, off: 0, back: !1 }));
  return st;
}
// Stability rules (what made characters twitch, duck and scramble):
//   - moving vs standing has hysteresis (starts above 0.85 m/s, stops below 0.4 m/s): collision nudges and
//     aim corrections no longer flick the legs between idle and walk
//   - crouched vs standing has hysteresis too (on above 0.55, off below 0.3 of the crouch)
//   - a change of movement clip must hold for 0.15 s before it plays
//   - the visible body turns towards the aim direction smoothly instead of snapping to every correction
//   - jump / fall only after 0.28 s in the air with real vertical speed (not every stair step)
// Feet that do not slide: the lower body turns towards the direction of travel (up to 77 degrees either
// side) and walks or runs forwards at the clip's own pace, while the spine turns back by the same angle so
// the chest, head and gun stay on the aim (applied just before the weapon-holding IK, see Ou below).
// Moving backwards, the legs angle back up to 57 degrees and the walk / run plays in reverse. The clip speed
// matches the ground speed (the stride measured from each clip), so a foot in contact with the floor stays
// put instead of gliding.
function __locoSpeed(v, K, dt) {
  const st = __locoState(v),
    p = v.pos,
    R = jV.realistic;
  dt = Math.max(1e-3, Math.min(dt, 0.1));
  if (!st.last || !v.alive || Math.hypot(p.x - st.last.x, p.z - st.last.z) > 3) st.last = { x: p.x, z: p.z };
  const k = 1 - Math.exp(-dt * 10);
  st.vx += ((p.x - st.last.x) / dt - st.vx) * k;
  st.vz += ((p.z - st.last.z) / dt - st.vz) * k;
  st.last.x = p.x;
  st.last.z = p.z;
  const speed = Math.hypot(st.vx, st.vz);
  st.speed = speed;
  st.moving = st.moving ? speed > 0.4 : speed > 0.85;
  let target = v.yaw + Math.PI;
  if (!v.alive) {
    // dying: turn to face where the shot came from (the fall goes away from it), over 0.2 s
    if (st.alive !== !1) {
      const d = v.deathDir;
      st.dieFace = d && Math.hypot(d.x, d.z) > 0.1 ? Math.atan2(-d.x, -d.z) : target;
      st.dieCrouch = v.crouch > 0.5;
      st.dieAir = st.air > 0.2;
    }
    target = st.dieFace;
  }
  st.alive = v.alive;
  if (st.yaw === null) st.yaw = target;
  const dy = Math.atan2(Math.sin(target - st.yaw), Math.cos(target - st.yaw));
  st.yaw = Math.abs(dy) > 2.5 && v.alive ? target : st.yaw + dy * (1 - Math.exp(-dt * (v.alive ? 13 : 16)));
  K.rotation.y = st.yaw;
  const yaw = st.yaw - Math.PI,
    fwd = st.vx * -Math.sin(yaw) + st.vz * -Math.cos(yaw),
    right = st.vx * Math.cos(yaw) - st.vz * Math.sin(yaw),
    ang = Math.atan2(right, fwd);
  st.air = v.onGround || Math.abs(v.vel.y) < 1.2 ? 0 : st.air + dt;
  const s = K.children[0],
    gait = (s && __CHAR.gait.get(s.userData.bpChar)) || { Walk: 1.1, Run: 3.1, CrouchWalking: 1.1 };
  st.crouchClip = st.crouchClip ? v.crouch > 0.3 : v.crouch > 0.55;
  const crouch = st.crouchClip;
  // Which clip (the rifle locomotion set has one for every direction, at walking and running pace):
  //   forwards (within 45 degrees of the aim): walk or run, legs turned towards the line of travel
  //   backwards (beyond 135 degrees): walk / run backwards, legs turned the same way
  //   sideways: strafe left / right at walking or running pace, legs turned up to 35 degrees for diagonals
  //   crouched: crouch-walk forwards or reversed
  //   standing still while the body turns (faster than 1.1 rad/s): turn on the spot, feet stepping round
  // Running vs walking has hysteresis (on above 2.1 m/s, off below 1.7). Every clip plays at ground speed /
  // its measured stride speed, so a planted foot stays planted.
  const A = Math.abs(ang),
    fwdA = A < 0.79,
    backA = A > 2.36;
  st.run = st.run ? speed > 1.7 : speed > 2.1;
  const run = st.run,
    yr = Math.atan2(Math.sin(st.yaw - (st.pyaw ?? st.yaw)), Math.cos(st.yaw - (st.pyaw ?? st.yaw))) / dt;
  st.pyaw = st.yaw;
  st.yawRate = (st.yawRate || 0) + (yr - (st.yawRate || 0)) * (1 - Math.exp(-dt * 8));
  let off = 0,
    cand;
  if (!st.moving) cand = !crouch && v.alive && Math.abs(st.yawRate) > 1.1 ? (st.yawRate > 0 ? 'TurnL' : 'TurnR') : 'Still';
  else if (crouch) {
    cand = backA ? 'CrouchWalking-' : 'CrouchWalking';
    off = backA ? Math.max(-1, Math.min(1, Math.atan2(Math.sin(ang - Math.PI), Math.cos(ang - Math.PI)))) : Math.max(-1.35, Math.min(1.35, ang));
  } else if (fwdA) {
    cand = run ? 'Run' : 'Walk';
    off = ang;
  } else if (backA) {
    cand = run ? 'RunBack' : 'WalkBack';
    off = Math.atan2(Math.sin(ang - Math.PI), Math.cos(ang - Math.PI));
  } else {
    cand = ang > 0 ? (run ? 'RunStrafeR' : 'StrafeR') : run ? 'RunStrafeL' : 'StrafeL';
    off = Math.max(-0.6, Math.min(0.6, ang - Math.sign(ang) * Math.PI * 0.5));
  }
  st.off += (off - st.off) * (1 - Math.exp(-dt * 9));
  if (cand !== st.move) {
    st.cand === cand ? (st.candT += dt) : ((st.cand = cand), (st.candT = 0));
    (st.candT > 0.15 || (!st.moving && cand === 'Still')) && (st.move = cand);
  } else st.cand = null;
  const move = st.move.replace('-', ''),
    sign = st.move.endsWith('-') ? -1 : 1,
    turning = move === 'TurnL' || move === 'TurnR',
    nat = gait[move] || 1.1,
    rate = turning
      ? Math.max(0.7, Math.min(2, Math.abs(st.yawRate) / (move === 'TurnL' ? 1.57 : 0.79)))
      : sign * Math.max(/Run/.test(move) ? 0.45 : 0.5, Math.min(/Run/.test(move) ? 1.9 : 1.95, speed / nat));
  st.ts = v.alive ? { [move]: rate } : { Death: __DIE.rate };
  const still = crouch ? 'CrouchIdle' : turning ? move : 'Idle';
  R.idle = still;
  R.walk = move === 'Still' || turning ? still : move;
  R.run = R.walk;
  R.aim = crouch ? 'CrouchIdle' : turning ? move : 'AimIdle';
  if (st.air > 0.28 && v.alive) R.idle = R.walk = R.run = R.aim = v.vel.y > 0 ? 'Jump' : 'Fall';
  s && (s.userData.__bpLoco = st);
  return st.moving ? Math.max(speed, 0.7) : 0;
}
// Upper-body actions over the legs: reloading (for as long as the reload takes), the grenade toss (around
// the moment it leaves the hand), a flinch when hit and the recoil loop while firing. Each is the upper-body
// copy of its clip (__charExtras), blended in and out by weight: three.js averages the actions on a bone by
// weight, so a weight of 12 against the legs' 1 is the action's pose on the arms and spine, while the hips
// and legs (which the upper-body clips do not touch) keep walking or running.
const __UB = new Map(); // player id -> { toss, hit } (seconds, performance clock)
typeof window < 'u' &&
  eA.on((list) => {
    const now = performance.now() / 1e3;
    for (const e of Array.isArray(list) ? list : [list]) {
      if (!e) continue;
      const id = e.type === 'throw' ? e.who : e.type === 'hit' ? e.victim : null;
      if (id == null) continue;
      const u = __UB.get(id) || {};
      e.type === 'throw' ? (u.toss = now) : (u.hit = now);
      __UB.set(id, u);
    }
  });
const __UB_MARK = new Map(); // clip -> moment the grenade is released (fraction of the clip), measured once
function __tossRelease(clip, root) {
  if (__UB_MARK.has(clip)) return __UB_MARK.get(clip);
  let at = 0.55;
  try {
    const m = new TZ(root),
      h = root.getObjectByName('mixamorigRightHand'),
      hips = root.getObjectByName('mixamorigHips'),
      a = new U(),
      b = new U();
    if (h && hips) {
      const act = m.clipAction(clip).play(),
        N = 60,
        P = [];
      for (let i = 0; i <= N; i++) {
        m.setTime((clip.duration * i) / N);
        root.updateMatrixWorld(!0);
        P.push(h.getWorldPosition(a).sub(hips.getWorldPosition(b)).clone());
      }
      act.stop();
      m.uncacheRoot(root);
      // the release: the hand's fastest forward-and-up movement
      let best = -1;
      for (let i = 1; i <= N; i++) {
        const v = P[i].z - P[i - 1].z + (P[i].y - P[i - 1].y) * 0.5;
        v > best && ((best = v), (at = i / N));
      }
    }
  } catch (e) {}
  __UB_MARK.set(clip, at);
  return at;
}
function __locoAfter(s, v, K, dt) {
  const st = s && s.userData.__bpLoco,
    mixer = st && st.mixer,
    clips = s && __CHAR.clips.get(s.userData.bpChar);
  if (!mixer || !clips) return;
  const ub = st.ub || (st.ub = {}),
    now = performance.now() / 1e3,
    ev = __UB.get(v.id) || {},
    S = eA.state,
    w = v.weapons && v.weapons[v.active],
    gun = w && w.id !== 'knife' && w.id !== 'grenade';
  dt = Math.max(1e-3, Math.min(dt || 0.016, 0.1));
  // what each action wants now: [weight, time in the clip]
  const want = {};
  // reload: the clip stretched over the weapon's reload time
  if (v.alive && gun && v.reloadLeft > 0) {
    ub.relTotal = ub.relOn ? Math.max(ub.relTotal, v.reloadLeft) : v.reloadLeft;
    ub.relOn = !0;
    want.UpReload = [12, 1 - v.reloadLeft / Math.max(0.3, ub.relTotal)];
  } else ub.relOn = !1;
  // grenade toss: from 0.7 s before the release to the end of the follow-through
  if (v.alive && ev.toss && now - ev.toss < 1.2) {
    const c = clips.find((x) => x.name === 'UpToss');
    if (c) {
      const rel = __tossRelease(c, s),
        t = rel * c.duration + (now - ev.toss) * 1.3 - 0.7 * 1.3;
      want.UpToss = [12, Math.max(0, Math.min(1, t / c.duration))];
    }
  }
  // hit flinch: a short jolt, half strength (the aim does not leave the target)
  if (v.alive && ev.hit && now - ev.hit < 0.42) want.UpHit = [1, (now - ev.hit) / 0.42];
  // firing: the recoil loop while the trigger is held
  if (v.alive && gun && S && S.t - v.lastShotAt < 0.14 && !want.UpReload) want.UpFire = [1.4, (now * 4) % 1];
  for (const name of ['UpReload', 'UpToss', 'UpHit', 'UpFire']) {
    let a = ub[name];
    const goal = want[name];
    if (!a && !goal) continue;
    if (!a) {
      const c = clips.find((x) => x.name === name);
      if (!c) continue;
      a = ub[name] = mixer.clipAction(c);
      a.timeScale = 0; // time is set below, not advanced by the mixer
      a.setEffectiveWeight(0);
    }
    // (a death stops every action; play() again is a no-op while it is running)
    goal && a.play();
    const target = goal ? goal[0] : 0,
      cur = a.getEffectiveWeight();
    // in quickly, out a little slower (the arms return to the gun)
    a.setEffectiveWeight(cur + (target - cur) * (1 - Math.exp(-dt * (target > cur ? 18 : 10))));
    goal && (a.time = goal[1] * a.getClip().duration);
    a.getEffectiveWeight() < 0.01 && !goal && a.setEffectiveWeight(0);
  }
}
// rotate a bone about the world up axis
const __lq = { q: new Kw(), p: new Kw(), up: new U(0, 1, 0) };
function __rotY(bone, a) {
  if (!bone || !a) return;
  bone.parent.getWorldQuaternion(__lq.p);
  __lq.q.setFromAxisAngle(__lq.up, a);
  bone.quaternion.premultiply(__lq.p.clone().invert().multiply(__lq.q).multiply(__lq.p));
  bone.updateMatrixWorld(!0);
}
// clip playback speed comes from the locomotion state for these models (the core's own timeScale writes,
// tuned for the old clips, are kept for every other model)
Object.defineProperty(Q3.prototype, 'timeScale', {
  configurable: !0,
  get() {
    const st = this._mixer && this._mixer._root && this._mixer._root.userData && this._mixer._root.userData.__bpLoco,
      v = st && st.ts[this._clip.name];
    st && !st.mixer && (st.mixer = this._mixer);
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
    const body = this.body,
      st = body && body.userData && body.userData.__bpLoco,
      now = performance.now() / 1e3,
      dt = Math.min(0.1, now - (this.__pt || now));
    this.__pt = now;
    // lower body towards the direction of travel, upper body back onto the aim (before the arms are solved)
    if (st && Math.abs(st.off) > 0.01 && !o.hidden) {
      const B = this.__lb || (this.__lb = ['Hips', 'Spine', 'Spine1', 'Spine2'].map((n) => body.getObjectByName('mixamorig' + n)));
      if (B[0] && B[1]) {
        body.updateMatrixWorld(!0);
        __rotY(B[0], -st.off);
        __rotY(B[1], st.off * 0.45);
        __rotY(B[2], st.off * 0.3);
        __rotY(B[3], st.off * 0.25);
      }
    }
    // aim pitch follows smoothly
    this.__p === void 0 || Math.abs(o.pitch - this.__p) > 1.2 ? (this.__p = o.pitch) : (this.__p += (o.pitch - this.__p) * (1 - Math.exp(-dt * 12)));
    // the gun stays up for 2.5 s after the last reason to aim (a shot, a target): no snapping between
    // low ready and aim on every shot, which read as ducking
    o.aiming && (this.__aimUntil = now + 2.5);
    const aiming = !!o.aiming || now < (this.__aimUntil || 0) || (eA.state && eA.state.mode === 'range');
    // crouching is the crouch animation's job: never squat the hips on top of it
    if (!body || !body.userData.bpChar) return coreIk.call(this, { ...o, pitch: this.__p, aiming, crouch: 0 });
    // Characters with real animations: the rifle clips already hold a rifle (right hand on the pistol grip,
    // left hand on the handguard). The core would place the gun by a fixed rule and pull the arms onto it,
    // which fought the clip and left guns floating beside the hands. Here the arms keep the clip's pose and
    // the gun is put into them instead (__gunInHands); the core still builds the gun and leans the upper body.
    const r = coreIk.call(this, { ...o, pitch: this.__p, aiming, crouch: 0, hidden: !0 });
    if (!o.hidden)
      try {
        __gunInHands(this, o, aiming);
      } catch (e) {}
    return r;
  };
}
// the gun into the animated hands: grip in the right palm, barrel through the left palm, kept upright
const __gh = { a: new U(), b: new U(), c: new U(), d: new U(), f: new U(), u: new U(), x: new U(), m: new _A(), q: new Kw(), pq: new Kw(), up: new U(0, 1, 0) };
function __gunInHands(ik, o, aiming) {
  const g = ik.gun && ik.gun.obj,
    I = ik.b,
    body = ik.body,
    par = body.parent;
  if (!g || !par || !I['Fist.R']) return;
  const wpn = o.weapon,
    blade = wpn === 'knife' || wpn === 'grenade';
  // the upper body follows the aim, as the core does
  const D = aiming || blade ? ik.__p : Math.min(ik.__p, 0) * 0.3 - 0.08,
    side = aV(par);
  I.Abdomen && CM(I.Abdomen, side, -D * 0.25);
  I.Torso && CM(I.Torso, side, -D * 0.35);
  I.Head && CM(I.Head, side, -D * 0.2);
  if (blade) return void (g.visible = !1);
  g.visible = !0;
  const T = __gh,
    palm = (hand, mid, out) => {
      hand.getWorldPosition(out);
      mid ? out.lerp(mid.getWorldPosition(T.c), 0.55) : 0;
      return out;
    },
    mids = ik.__mids || (ik.__mids = [body.getObjectByName('mixamorigRightHandMiddle1'), body.getObjectByName('mixamorigLeftHandMiddle1')]),
    pr = palm(I['Fist.R'], mids[0], T.a),
    pl = I['Fist.L'] ? palm(I['Fist.L'], mids[1], T.b) : null,
    C = ik.gun.grip;
  // barrel direction: through the left hand for long guns; along the aim for pistols (and when the left hand
  // is too far off to be on the gun)
  const fwd = T.f.set(0, 0, 1).applyQuaternion(body.getWorldQuaternion(T.q)).setY(0).normalize();
  fwd.applyAxisAngle(side, -(aiming ? ik.__p : Math.min(ik.__p, 0) * 0.5 - 0.12));
  let dir = fwd;
  if (!C.pistol && pl) {
    const d = T.d.copy(pl).sub(pr),
      L = d.length();
    L > 0.12 && L < 0.75 && d.multiplyScalar(1 / L).dot(fwd) > 0.2 && (dir = d);
  }
  // basis: local -Z = barrel, local +Y = up (as upright as the barrel allows)
  const zA = T.d.copy(dir).negate().normalize(),
    yA = T.u.copy(T.up).addScaledVector(zA, -T.up.dot(zA)).normalize(),
    xA = T.x.crossVectors(yA, zA).normalize();
  T.m.makeBasis(xA, yA, zA);
  T.q.setFromRotationMatrix(T.m);
  par.getWorldQuaternion(T.pq);
  g.quaternion.copy(T.pq.invert().multiply(T.q));
  // grip point onto the right palm
  g.position.set(0, 0, 0);
  g.updateMatrix();
  par.updateMatrixWorld(!0);
  g.updateMatrixWorld(!0);
  const gw = g.localToWorld(T.c.copy(C.grip));
  g.getWorldPosition(T.x);
  const want = T.x.add(T.a.copy(pr).sub(gw));
  par.worldToLocal(want);
  g.position.copy(want);
  g.updateMatrixWorld(!0);
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
// a saved choice of a retired operator (Cole and Marek are reserves now) moves to the side's first one
try {
  const fixOp = (s) => {
    const o = __OPERATORS.find((x) => x.roster === s.operatorId);
    if (!o || !o.reserve) return;
    const to = __OPERATORS.find((x) => x.team === o.team && !x.reserve);
    to && s.setup({ operatorId: to.roster });
  };
  fixOp(Zw.getState());
  Zw.subscribe(fixOp);
} catch (e) {}
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
// ---------------------------------------------------------------- masks
// Terrorists wear masks (public/game/characters/masks, built by tools/build-assets.mjs): each is fitted to
// the head it goes on when that character loads. The head is measured from the vertices skinned to its Head
// bone, in a frame lined up with the body (so a mask's front faces the face whatever the bone's own axes),
// and the mask hangs from the Head bone, so it moves with every animation.
//   wrap: covers the whole head (balaclava, ski mask), a little larger than it so hair and ears stay inside
//   face: sits on the front of the face (a face mask), as wide as the head
const __MASK = {
  base: './game/characters/masks/',
  on: {
    'terrorists/Ch10_nonPBR': { file: 'balaclava', kind: 'wrap', grow: [1.12, 1.1, 1.14], drop: 0.04 },
  },
  tpl: new Map(),
  head: new Map(),
  pending: [],
};
function __maskLoad() {
  if (__MASK.loading || typeof window > 'u') return;
  __MASK.loading = !0;
  for (const c of new Set(Object.values(__MASK.on).map((c) => c.file)))
    __glbParse(
      __MASK.base + c + '.glb',
      (g) => {
        const s = g.scene;
        s.updateMatrixWorld(!0);
        const b = new xi().setFromObject(s);
        s.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = o.receiveShadow = !0;
          for (const m of [].concat(o.material)) m && ((m.envMapIntensity = 0.8), 'roughness' in m && (m.roughness = Math.max(m.roughness, 0.55)), (m.side = 2));
        });
        __MASK.tpl.set(c, { scene: s, box: b });
        for (const p of __MASK.pending.splice(0)) __maskPut(p.w, p.url);
      },
      (e) => console.warn('[masks] ' + c, e),
    );
}
typeof window < 'u' && __glbAfter(__maskLoad, 1200);
// the head's extent in a frame at the Head bone, turned like the body (bind pose)
function __maskHead(w, head) {
  const url = w.userData.bpChar;
  if (__MASK.head.has(url)) return __MASK.head.get(url);
  w.updateMatrixWorld(!0);
  const anchorQ = head.getWorldQuaternion(new Kw()).invert().multiply(w.getWorldQuaternion(new Kw())),
    anchor = new ji();
  anchor.quaternion.copy(anchorQ);
  head.add(anchor);
  anchor.updateMatrixWorld(!0);
  const box = new xi(),
    v = new U();
  w.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const bi = o.skeleton.bones.findIndex((b) => b === head || /HeadTop/.test(b.name)),
      ti = o.skeleton.bones.findIndex((b) => /HeadTop/.test(b.name)),
      hi = o.skeleton.bones.indexOf(head),
      si = o.geometry.attributes.skinIndex,
      sw = o.geometry.attributes.skinWeight,
      P = o.geometry.attributes.position;
    if (bi < 0 || !si) return;
    for (let i = 0; i < P.count; i++) {
      let best = -1,
        bw = 0;
      for (let k = 0; k < 4; k++) {
        const wt = sw.getComponent(i, k);
        wt > bw && ((bw = wt), (best = si.getComponent(i, k)));
      }
      if (best !== hi && best !== ti) continue;
      v.fromBufferAttribute(P, i);
      o.applyBoneTransform(i, v);
      o.localToWorld(v);
      anchor.worldToLocal(v);
      box.expandByPoint(v);
    }
  });
  head.remove(anchor);
  const r = box.isEmpty() ? null : { box, anchorQ };
  __MASK.head.set(url, r);
  return r;
}
function __maskPut(w, url) {
  const key = url.slice(__CHAR.base.length).replace(/\.glb$/, ''),
    c = __MASK.on[key];
  if (!c || w.userData.__masked) return;
  const T = __MASK.tpl.get(c.file);
  if (!T) return void __MASK.pending.push({ w, url });
  const head = w.getObjectByName('mixamorigHead');
  if (!head) return;
  const H = __maskHead(w, head);
  if (!H) return;
  const hs = H.box.getSize(new U()),
    hc = H.box.getCenter(new U()),
    ms = T.box.getSize(new U()),
    mc = T.box.getCenter(new U()),
    anchor = new ji(),
    inner = T.scene.clone(!0);
  anchor.name = 'bp-mask';
  anchor.quaternion.copy(H.anchorQ);
  if (c.kind === 'wrap') {
    inner.scale.set((hs.x * c.grow[0]) / ms.x, (hs.y * c.grow[1]) / ms.y, (hs.z * c.grow[2]) / ms.z);
    inner.position.set(hc.x - mc.x * inner.scale.x, hc.y - hs.y * c.drop - mc.y * inner.scale.y, hc.z - mc.z * inner.scale.z);
  } else {
    // face mask: as wide as the head, its back at the middle of the head, its top at the brow
    const k = (hs.x * c.grow[0]) / ms.x;
    inner.scale.setScalar(k);
    inner.position.set(hc.x - mc.x * k, H.box.max.y - hs.y * 0.18 - T.box.max.y * k, hc.z - T.box.min.z * k);
  }
  anchor.add(inner);
  head.add(anchor);
  w.userData.__masked = 1;
}
{
  const prevDress = XAA;
  XAA = function (w) {
    const r = prevDress.apply(this, arguments);
    try {
      w.userData && w.userData.bpChar && (__maskLoad(), __maskPut(w, w.userData.bpChar));
    } catch (e) {
      console.warn('[masks]', e);
    }
    return r;
  };
}
// test hook: kill a player through the game's own death path (o1), as a gunshot from the human would
typeof window < 'u' &&
  (window.__bpKill = (id, weapon = 'rifle') => {
    const S = eA.state,
      v = S && S.players.find((p) => p.id === id),
      me = eA.human();
    v && v.alive && o1(S, v, me, weapon, !1, { dir: { x: v.pos.x - me.pos.x, y: 0, z: v.pos.z - me.pos.z } });
  });
