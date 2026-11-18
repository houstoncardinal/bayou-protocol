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
// on the spot (45-degree turns both ways), rifle jump and fall. Crouched: the rifle crouch walk forwards, to
// either side and back on either diagonal (the left and back-right clips are mirrored copies of the right and
// back-left ones), a crouched turn, the kneeling idle; standing up plays the crouch-to-stand transition and a
// crouch walk that stops plays the kneel-down. Two deaths, taken in turn (the stagger and drop, the fall back
// from a shot in the front), each handing over to the ragdoll as its hips near the ground. Over the legs,
// upper-body actions: reloading (kneeling reload when crouched), the grenade throw (the low toss when
// crouched), a flinch when hit and the recoil loop while firing. Each locomotion
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
    TurnL: 'TurnLeft45Degrees',
    TurnR: 'TurningRight45Degrees',
    Fire: 'FiringRifle',
    Crouch: 'CrouchWalking',
    CrouchIdle: 'PistolKneelingIdle',
    // crouched, rifle up, in every direction (left and back-right are mirrored copies: __charMirror)
    CrouchFwd: 'WalkCrouchingForward',
    CrouchR: 'WalkCrouchingRight',
    CrouchL: 'WalkCrouchingLeft',
    CrouchBackL: 'WalkCrouchingBackwardLeft',
    CrouchBackR: 'WalkCrouchingBackwardRight',
    CrouchTurn: 'RifleCrouchTurn',
    // one-off transitions (played whole-body for a moment, __locoAfter)
    Rise: 'CrouchToStandingWithRifle',
    CrouchKneel: 'RifleCrouchWalkToKneel',
    CrouchStart: 'RifleCrouchIdleToWalk',
    Jump: 'RifleJump',
    Fall: 'JumpingDown',
    Death: 'Dying',
    Death2: 'DeathFromTheFront',
  },
  // upper-body actions played over the legs (spine, arms and head only): name -> source clip
  // (crouched: the kneeling reload and the low toss)
  overlay: { UpReload: 'Reloading', UpReloadLow: 'Reload', UpToss: 'Throw', UpTossLow: 'TossGrenade', UpHit: 'HitReaction', UpFire: 'FiringRifle' },
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
const __LOCO_CLIPS = { Walk: 1, WalkBack: 1, StrafeL: 1, StrafeR: 1, Run: 1, RunBack: 1, RunStrafeL: 1, RunStrafeR: 1, CrouchWalking: 1, CrouchFwd: 1, CrouchR: 1, CrouchL: 1, CrouchBackL: 1, CrouchBackR: 1 };
// Clips recorded for one side only get a mirrored copy for the other (the crouch walk to the right -> to the
// left, back and to the left -> back and to the right): left and right bones swap tracks, and every rotation
// and the hips' sideways movement are reflected across the body's centre plane. Added to the shared clip file
// once, so every model (and the retargeted ones) has them.
const __MIRROR = { WalkCrouchingRight: 'WalkCrouchingLeft', WalkCrouchingBackwardLeft: 'WalkCrouchingBackwardRight' };
function __charMirror(animGltf) {
  if (animGltf.__bpMirror) return;
  animGltf.__bpMirror = 1;
  for (const [src, dst] of Object.entries(__MIRROR)) {
    const c = animGltf.animations.find((x) => x.name === src);
    if (!c || animGltf.animations.some((x) => x.name === dst)) continue;
    const tracks = c.tracks.map((t) => {
      const u = t.clone();
      u.name = t.name.replace(/(Left|Right)/, (m) => (m === 'Left' ? 'Right' : 'Left'));
      const v = u.values;
      if (/\.quaternion$/.test(u.name)) for (let i = 0; i < v.length; i += 4) (v[i + 1] = -v[i + 1]), (v[i + 2] = -v[i + 2]);
      else if (/\.position$/.test(u.name)) for (let i = 0; i < v.length; i += 3) v[i] = -v[i];
      return u;
    });
    animGltf.animations.push(new so(dst, c.duration, tracks));
  }
}
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
  __charMirror(animGltf);
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
    if (c.name !== 'TurnL' && c.name !== 'TurnR' && c.name !== 'CrouchTurn') return c;
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
  for (const [k, v] of Object.entries({ Walk: 1, WalkBack: 1.1, StrafeL: 1.38, StrafeR: 0.75, Run: 3.1, RunBack: 2.75, RunStrafeL: 2.8, RunStrafeR: 3.3, CrouchWalking: 1.1, CrouchFwd: 1, CrouchR: 0.9, CrouchL: 0.9, CrouchBackL: 0.9, CrouchBackR: 0.9 })) g[k] = g[k] || v;
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
    a && /^(Death2?|Dying|DeathFromTheFront)$/.test(name || '') && a.loop !== 2200 && ((a.loop = 2200), (a.clampWhenFinished = !0)); // LoopOnce
    return a;
  };
  const coreRagdoll = yZ.from;
  yZ.from = function (s, o) {
    const st = s && s.userData && s.userData.__bpLoco;
    if (!st || !o) return coreRagdoll.apply(this, arguments);
    const now = performance.now() / 1e3;
    // a new death (the last one ended in a ragdoll, or long ago)
    (!st.dieAt || now - st.dieAt > 8) && ((st.dieAt = now), (st.dieInstant = !!(o.headshot || o.force >= 1.3 || st.dieCrouch || st.dieAir)));
    if (!st.dieInstant && now - st.dieAt < __dieHandover(s, st.deathClip || 'Death') / __DIE.rate) return null; // the death clip plays meanwhile
    // hand over in the pose the clip has reached, facing the way it fell
    const K = s.parent;
    K && st.yaw != null && ((K.rotation.y = st.yaw), K.updateMatrixWorld(!0));
    const r = coreRagdoll.call(this, s, st.dieInstant ? o : { ...o, force: o.force * 0.25, vel: { x: 0, y: 0, z: 0 } });
    r && (st.dieAt = 0);
    return r;
  };
  // The ragdoll turned each limb bone by the shortest rotation from the limb's direction when it died to its
  // direction now. Once a limb swung round to point roughly the opposite way (an arm held forward on the gun,
  // flung back as the body drops) that rotation is undefined, and the limb spun half a turn about itself in a
  // frame, over and over while the body settled. Each limb now turns from where it pointed last frame (always a
  // small, well-defined turn), carrying its twist along. The spine and hips (oriented by the shoulders and
  // hips as well) are unchanged.
  const __rgQ = { inc: new Kw(), e: new Kw(), n: new Kw(), g: new Kw(), I: new _A(), B: new _A(), dir: new U(), M: new _A() };
  yZ.prototype.apply = function () {
    const A = this.vec(jA.shR).sub(this.vec(jA.shL)),
      i = this.vec(jA.hipR).sub(this.vec(jA.hipL)),
      T = __rgQ;
    for (const D of this.order) {
      const s = this.vec(D.a),
        C = this.vec(D.b).sub(s);
      if (C.lengthSq() < 1e-8) continue;
      if (D.core) {
        const l = D.bone.name.replace(/[^a-z]/gi, '').toLowerCase() === 'hips' ? this.hipSide0 : this.side0,
          c = l === this.hipSide0 ? i : A;
        ub(D.d0, l, T.I), ub(C, c, T.B), T.g.setFromRotationMatrix(T.B.multiply(T.I.transpose()));
      } else {
        D.__g || ((D.__g = new Kw()), (D.__d = D.d0.clone().normalize()));
        T.dir.copy(C).normalize();
        D.__g.premultiply(T.inc.setFromUnitVectors(D.__d, T.dir)).normalize();
        D.__d.copy(T.dir);
        T.g.copy(D.__g);
      }
      T.n.copy(T.g).multiply(D.q0);
      const o = D.bone.parent;
      o.updateWorldMatrix(!0, !1);
      o.getWorldQuaternion(T.e);
      D.bone.quaternion.copy(T.e.invert().multiply(T.n));
      T.M.copy(o.matrixWorld).invert();
      D.bone.position.copy(s.applyMatrix4(T.M));
      D.bone.updateMatrixWorld(!1);
    }
  };
}
// The moment a death clip's body is about to reach the ground (its hips a third of the way down from where
// they start): the ragdoll takes over then. Measured once per clip from the clip itself.
const __DIE_AT = new Map();
function __dieHandover(root, name) {
  const key = (root.userData.bpChar || '') + ':' + name;
  if (__DIE_AT.has(key)) return __DIE_AT.get(key);
  let at = __DIE.handover;
  try {
    const clip = (__CHAR.clips.get(root.userData.bpChar) || []).find((c) => c.name === name),
      hips = root.getObjectByName('mixamorigHips');
    if (clip && hips) {
      const m = new TZ(root),
        act = m.clipAction(clip).play(),
        p = new U(),
        N = 60,
        Y = [];
      for (let i = 0; i <= N; i++) {
        m.setTime((clip.duration * i) / N);
        root.updateMatrixWorld(!0);
        Y.push(hips.getWorldPosition(p).y);
      }
      act.stop();
      m.uncacheRoot(root);
      const y0 = Y[0],
        yMin = Math.min(...Y),
        i = Y.findIndex((y) => y < yMin + (y0 - yMin) * 0.33);
      i > 0 && (at = Math.max(0.6, (clip.duration * i) / N));
    }
  } catch (e) {}
  __DIE_AT.set(key, at);
  return at;
}
// The part of a one-off transition clip worth playing (fractions of the clip): walk-to-kneel only from where
// the hips start their last drop (the walking before it would replay steps the character has just taken)
const __ONE_SPAN = new Map();
function __oneSpan(root, clip) {
  const key = (root.userData.bpChar || '') + ':' + clip.name;
  if (__ONE_SPAN.has(key)) return __ONE_SPAN.get(key);
  let span = [0, 1];
  if (clip.name === 'CrouchKneel')
    try {
      const hips = root.getObjectByName('mixamorigHips'),
        m = new TZ(root),
        act = m.clipAction(clip).play(),
        p = new U(),
        N = 60,
        Y = [];
      for (let i = 0; i <= N; i++) {
        m.setTime((clip.duration * i) / N);
        root.updateMatrixWorld(!0);
        Y.push(hips.getWorldPosition(p).y);
      }
      act.stop();
      m.uncacheRoot(root);
      const yEnd = Y[N];
      let i = N;
      while (i > 0 && Y[i - 1] <= Y[i] + 0.003) i--;
      while (i > 0 && Y[i - 1] > Y[i] - 0.001 && Y[i - 1] > yEnd + 0.02) i--;
      span = [Math.max(0, i / N - 0.05), 1];
    } catch (e) {}
  __ONE_SPAN.set(key, span);
  return span;
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
  // (a jump of over 3 m between frames is a respawn or a teleport, not movement)
  const tele = !st.last || Math.hypot(p.x - st.last.x, p.z - st.last.z) > 3;
  if (tele || !v.alive) st.last = { x: p.x, z: p.z };
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
      // two deaths, taken in turn (a fall back from a shot in the front, or the stagger and drop)
      st.deaths = (st.deaths || 0) + 1;
      st.deathClip = (st.deaths + String(v.id).length) % 2 ? 'Death2' : 'Death';
      const d = v.deathDir;
      st.dieFace = d && Math.hypot(d.x, d.z) > 0.1 ? Math.atan2(-d.x, -d.z) : target;
      st.dieCrouch = v.crouch > 0.5;
      st.dieAir = st.air > 0.2;
    }
    target = st.dieFace;
  }
  st.alive = v.alive;
  if (st.yaw === null || (tele && v.alive)) st.yaw = target;
  // The body turns towards the aim smoothly, and never faster than about 800 degrees a second: a turn of more
  // than 143 degrees used to be a snap, the whole character flicking round in a single frame each time a bot
  // spun to a new target (or a player flicked the mouse). Only a respawn or teleport snaps (above).
  const dy = Math.atan2(Math.sin(target - st.yaw), Math.cos(target - st.yaw)),
    turn = dy * (1 - Math.exp(-dt * (v.alive ? 13 : 16))),
    maxTurn = dt * 14;
  st.yaw += Math.max(-maxTurn, Math.min(maxTurn, turn));
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
  if (!st.moving) cand = v.alive && Math.abs(st.yawRate) > 1.1 ? (crouch ? 'CrouchTurn' : st.yawRate > 0 ? 'TurnL' : 'TurnR') : 'Still';
  else if (crouch) {
    // the crouched rifle set: forwards, sideways, and back on the diagonals (legs turned to the travel)
    const cl = (x, a) => Math.max(-a, Math.min(a, x));
    if (fwdA) (cand = 'CrouchFwd'), (off = cl(ang, 1.0));
    else if (backA) {
      const dir = ang > 0 ? Math.PI * 0.75 : -Math.PI * 0.75;
      cand = ang > 0 ? 'CrouchBackR' : 'CrouchBackL';
      off = cl(Math.atan2(Math.sin(ang - dir), Math.cos(ang - dir)), 0.9);
    } else (cand = ang > 0 ? 'CrouchR' : 'CrouchL'), (off = cl(ang - Math.sign(ang) * Math.PI * 0.5, 0.6));
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
    turning = move === 'TurnL' || move === 'TurnR' || move === 'CrouchTurn',
    nat = gait[move] || 1.1,
    rate = turning
      ? Math.max(0.7, Math.min(2, Math.abs(st.yawRate) / (move === 'TurnL' ? 0.67 : move === 'CrouchTurn' ? 2.1 : 0.79)))
      : sign * Math.max(/Run/.test(move) ? 0.45 : 0.5, Math.min(/Run/.test(move) ? 1.9 : 1.95, speed / nat));
  st.ts = v.alive ? { [move]: rate } : { [st.deathClip || 'Death']: __DIE.rate };
  R.dead = st.deathClip || 'Death';
  const still = turning ? move : crouch ? 'CrouchIdle' : 'Idle';
  R.idle = still;
  R.walk = move === 'Still' || turning ? still : move;
  R.run = R.walk;
  R.aim = turning ? move : crouch ? 'CrouchIdle' : 'AimIdle';
  // one-off transitions: standing up from a crouch, a crouch walk ending on one knee
  if (v.alive && st.prevCrouch !== void 0) {
    if (st.prevCrouch && !crouch && !st.moving) st.one = { name: 'Rise', t0: performance.now() / 1e3, len: 0.55 };
    else if (crouch && st.prevMoving && !st.moving) st.one = { name: 'CrouchKneel', t0: performance.now() / 1e3, len: 0.6 };
    else if (st.moving || (st.one && st.one.name === 'Rise' && crouch) || (st.one && st.one.name === 'CrouchKneel' && !crouch)) st.one = null;
  }
  v.alive || (st.one = null);
  st.prevCrouch = crouch;
  st.prevMoving = st.moving;
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
    want[st.crouchClip ? 'UpReloadLow' : 'UpReload'] = [12, 1 - v.reloadLeft / Math.max(0.3, ub.relTotal)];
  } else ub.relOn = !1;
  // grenade toss: from 0.7 s before the release to the end of the follow-through
  if (v.alive && ev.toss && now - ev.toss < 1.2) {
    const tn = st.crouchClip ? 'UpTossLow' : 'UpToss',
      c = clips.find((x) => x.name === tn);
    if (c) {
      const rel = __tossRelease(c, s),
        t = rel * c.duration + (now - ev.toss) * 1.3 - 0.7 * 1.3;
      want[tn] = [12, Math.max(0, Math.min(1, t / c.duration))];
    }
  }
  // a one-off transition: the whole body for its length, fading in and out round the edges
  if (st.one) {
    const k = (now - st.one.t0) / st.one.len,
      c = clips.find((x) => x.name === st.one.name);
    if (k >= 1 || !c) st.one = null;
    else {
      const [f0, f1] = __oneSpan(s, c),
        w = Math.min(1, k / 0.12, (1 - k) / 0.25) * 12;
      want[st.one.name] = [w, f0 + (f1 - f0) * k];
    }
  }
  // hit flinch: a short jolt, half strength (the aim does not leave the target)
  if (v.alive && ev.hit && now - ev.hit < 0.42) want.UpHit = [1, (now - ev.hit) / 0.42];
  // firing: the recoil loop while the trigger is held
  if (v.alive && gun && S && S.t - v.lastShotAt < 0.14 && !want.UpReload && !want.UpReloadLow) want.UpFire = [1.4, (now * 4) % 1];
  // for the weapon hold (__gunHold): the arms belong to the clip while reloading or throwing; when it fired
  st.armsBusy = !!(want.UpReload || want.UpReloadLow || want.UpToss || want.UpTossLow);
  st.shotAgo = S && v.lastShotAt !== void 0 ? S.t - v.lastShotAt : 9;
  for (const name of ['UpReload', 'UpReloadLow', 'UpToss', 'UpTossLow', 'UpHit', 'UpFire', 'Rise', 'CrouchKneel']) {
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
    // (a death stops every action; play() again is a no-op while it is running, and one starting afresh
    // eases in from nothing)
    goal && !a.isScheduled() && (a.__share = 0);
    goal && a.play();
    // Blended by the share of the pose the action has, not by its raw weight: against the legs' weight of 1 an
    // action of weight w has w / (w + 1) of the pose, so a raw weight easing from 0 towards 12 put 70 % of a
    // reload or a kneel on the body in the first frame (the arms and spine jumped). The share eases in and out
    // and the weight is worked back from it.
    const target = goal ? goal[0] / (goal[0] + 1) : 0;
    a.__share === void 0 && (a.__share = 0);
    a.__share += (target - a.__share) * (1 - Math.exp(-dt * (target > a.__share ? 11 : 8)));
    a.__share < 0.004 && !goal && (a.__share = 0);
    a.setEffectiveWeight(a.__share / Math.max(0.02, 1 - a.__share));
    // (a clip set to its very end would wrap to its first frame: stop just short of it)
    goal && (a.time = Math.min(goal[1], 0.999) * a.getClip().duration);
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
    this.__dt = dt;
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
    // how far into the aim the body is (0 low ready, 1 aiming), eased over about a third of a second: the lean,
    // the gun's pitch and the elbows follow this, not the on / off state (each switch was a jump of the arms)
    this.__ak = this.__ak === void 0 || o.hidden ? +aiming : this.__ak + (+aiming - this.__ak) * (1 - Math.exp(-dt * 7));
    // crouching is the crouch animation's job: never squat the hips on top of it
    if (!body || !body.userData.bpChar) return coreIk.call(this, { ...o, pitch: this.__p, aiming, crouch: 0 });
    // Characters with real animations: the rifle clips already hold a rifle (right hand on the pistol grip,
    // left hand on the handguard). The core would place the gun by a fixed rule and pull the arms onto it,
    // which fought the clip and left guns floating beside the hands. Here the arms keep the clip's pose and
    // the gun is put into them instead (__gunInHands); the core still builds the gun and leans the upper body.
    const r = coreIk.call(this, { ...o, pitch: this.__p, aiming, crouch: 0, hidden: !0 });
    if (!o.hidden)
      try {
        __gunHold(this, o, aiming);
      } catch (e) {
        // (kept for the console: window.__bpHoldErr)
        typeof window < 'u' && (window.__bpHoldErr = String(e && e.stack).slice(0, 400));
      }
    return r;
  };
}
// the gun into the animated hands: grip in the right palm, barrel through the left palm, kept upright
const __gh = { a: new U(), b: new U(), c: new U(), d: new U(), f: new U(), u: new U(), x: new U(), m: new _A(), q: new Kw(), pq: new Kw(), up: new U(0, 1, 0) };
function __gunInHands(ik, o, aiming, noLean) {
  const g = ik.gun && ik.gun.obj,
    I = ik.b,
    body = ik.body,
    par = body.parent;
  if (!g || !par || !I['Fist.R']) return;
  const wpn = o.weapon,
    blade = wpn === 'knife' || wpn === 'grenade';
  // the upper body follows the aim, as the core does
  const ak = blade ? 1 : __ghAk(ik, aiming),
    D = __ghMix(Math.min(ik.__p, 0) * 0.3 - 0.08, ik.__p, ak),
    side = aV(par);
  noLean || (I.Abdomen && CM(I.Abdomen, side, -D * 0.25), I.Torso && CM(I.Torso, side, -D * 0.35), I.Head && CM(I.Head, side, -D * 0.2));
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
  fwd.applyAxisAngle(side, -__ghMix(Math.min(ik.__p, 0) * 0.5 - 0.12, ik.__p, ak));
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
// ---------------------------------------------------------------- holding the weapon (every character, every clip)
// The clips' arms are not a reliable way to hold a gun: some locomotion clips are unarmed (the arms swing), the
// rifle clips differ from each other, and none knows which weapon the character carries. So the hold is worked
// out each frame from the weapon and what the character is doing, and both arms are solved onto it:
//   - long guns (rifles, SMGs, shotguns, LMGs, snipers): the stock in the right shoulder pocket. Aiming or
//     firing: on the aim line, cheek to the stock. Standing, walking, crouched: low ready, the muzzle down
//     about 30 degrees and angled across the body. Sprinting: port arms, the muzzle down and well across
//   - pistols: aiming, both arms out with the gun at eye height; otherwise compact low ready at the chest
//   - the right palm closes on the pistol grip (back of the hand outward, trigger finger along the frame
//     unless firing); the left hand cups the handguard from under the left side (pistols: wraps the right)
//   - the elbows hang naturally (right out a little, left tucked); the fingers curl round what they hold
//   - reloading and throwing: the arms go back to the clip (its reload / toss) and the gun follows the hands
//   - each shot kicks the gun back and up a little; changing hold blends over a quarter of a second
// The hands are aimed with their own geometry (from each model's bind pose), so any rig holds the same way.
const __GH = { q: new Kw(), q2: new Kw(), m: new _A(), m2: new _A(), v: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(() => new U()), up: new U(0, 1, 0) };
const __GH_FING = ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb'];
// a hand's geometry from the skin's bind pose: its finger direction and palm normal (in the hand bone's
// frame), where the palm's centre is, and each finger joint's rest rotation and curl axis
function __ghHand(body, side) {
  const S = side === 'R' ? 'Right' : 'Left',
    get = (n) => body.getObjectByName('mixamorig' + n);
  const hand = get(S + 'Hand');
  if (!hand) return null;
  let skel = null;
  body.traverse((o) => !skel && o.isSkinnedMesh && o.skeleton && o.skeleton.bones.includes(hand) && (skel = o.skeleton));
  if (!skel) return null;
  const bindW = (b) => {
    const i = skel.bones.indexOf(b);
    return i < 0 ? null : new _A().copy(skel.boneInverses[i]).invert();
  };
  const Hw = bindW(hand),
    mid = get(S + 'HandMiddle1') || get(S + 'HandIndex1'),
    th = get(S + 'HandThumb1');
  if (!Hw || !mid) return null;
  const hp = new U().setFromMatrixPosition(Hw),
    Hq = new Kw().setFromRotationMatrix(new _A().extractRotation(Hw)),
    Hqi = Hq.clone().invert(),
    Mw = bindW(mid),
    fW = new U().setFromMatrixPosition(Mw).sub(hp),
    flen = fW.length();
  fW.normalize();
  // the palm faces where the thumb and fingers close: right hand thumb x fingers, left fingers x thumb
  let nW = new U(0, -1, 0);
  const Tw = th && bindW(th);
  if (Tw) {
    const t = new U().setFromMatrixPosition(Tw).sub(hp);
    t.addScaledVector(fW, -t.dot(fW)).normalize();
    nW = side === 'R' ? new U().crossVectors(t, fW) : new U().crossVectors(fW, t);
    nW.lengthSq() < 0.5 && nW.set(0, -1, 0);
    nW.normalize();
  }
  const f = fW.clone().applyQuaternion(Hqi),
    n = nW.clone().addScaledVector(fW, -nW.dot(fW)).normalize().applyQuaternion(Hqi);
  const fingers = [];
  for (const F of __GH_FING)
    for (let k = 1; k <= 3; k++) {
      const b = get(S + 'Hand' + F + k);
      if (!b || !b.parent) continue;
      const bw = bindW(b),
        pw = bindW(b.parent);
      if (!bw || !pw) continue;
      const rest = new Kw().setFromRotationMatrix(new _A().extractRotation(new _A().copy(pw).invert().multiply(bw)));
      // curl: turning the finger's direction towards the palm (for the thumb, across the palm)
      const bq = new Kw().setFromRotationMatrix(new _A().extractRotation(bw)),
        axisW = F === 'Thumb' ? fW.clone() : new U().crossVectors(fW, nW).normalize();
      F === 'Thumb' && side === 'R' && axisW.negate();
      fingers.push({ b, F, k, rest, axis: axisW.applyQuaternion(bq.invert()).normalize() });
    }
  // the upper arm's and forearm's rest rotations (relative to their parents, from the bind pose: arms out to
  // the side), where the arm solve starts every frame (__ghSolveArm)
  const arm = get(S + 'Arm'),
    fore = get(S + 'ForeArm'),
    restOf = (b) => {
      const bw = b && bindW(b),
        pw = b && b.parent && bindW(b.parent);
      return bw && pw ? new Kw().setFromRotationMatrix(new _A().extractRotation(new _A().copy(pw).invert().multiply(bw))) : null;
    };
  return { hand, mid, arm, fore, armRest: restOf(arm), foreRest: restOf(fore), f, n, fingers };
}
// the curl of each finger by grip (joints 1, 2, 3; radians)
const __GH_CURL = {
  rifleR: { Index: [0.25, 0.2, 0.15], Middle: [1.15, 1.35, 0.9], Ring: [1.2, 1.4, 0.9], Pinky: [1.25, 1.35, 0.85], Thumb: [0.35, 0.45, 0.3] },
  fireR: { Index: [0.75, 0.9, 0.5] },
  rifleL: { Index: [0.75, 0.85, 0.55], Middle: [0.85, 0.95, 0.6], Ring: [0.9, 1.0, 0.6], Pinky: [0.95, 1.0, 0.6], Thumb: [0.3, 0.3, 0.2] },
  pistolR: { Index: [0.55, 0.75, 0.45], Middle: [1.3, 1.5, 1.0], Ring: [1.35, 1.5, 1.0], Pinky: [1.4, 1.45, 0.95], Thumb: [0.55, 0.45, 0.3] },
  pistolL: { Index: [1.05, 1.2, 0.8], Middle: [1.1, 1.25, 0.8], Ring: [1.15, 1.25, 0.8], Pinky: [1.2, 1.25, 0.75], Thumb: [0.1, 0.05, 0.05] },
};
// hold targets per weapon class and state: muzzle down (dp), across the body (dy), cant (roll), and where the
// stock (long guns) or the grip (pistols) sits, from the right shoulder: [right, up, forward] metres
const __GH_POSE = {
  long: {
    aim: { dp: 0, dy: 0.02, roll: 0, at: [-0.045, -0.015, 0.02] },
    // (small differences between the holds: bots switch between walking, running and aiming all the time, and a
    // gun swinging 24-54 degrees across the body at each switch read as it jumping from hand to hand)
    ready: { dp: 0.42, dy: 0.18, roll: 0.06, at: [-0.035, -0.05, 0.06] },
    sprint: { dp: 0.55, dy: 0.32, roll: 0.1, at: [-0.02, -0.09, 0.1] },
  },
  // two hands (an isosceles stance): aiming, both arms out with the gun centred at eye level; otherwise compact
  // low ready at the chest, muzzle down; sprinting, tucked in close
  pistol: {
    // (0.42 m out, not 0.5: at 0.5 the grip was at or past full reach, the elbow locked straight, and each
    // shot's kick swung the whole arm)
    aim: { dp: 0, dy: 0.0, roll: 0, at: [-0.19, 0.06, 0.42] },
    ready: { dp: 0.72, dy: 0.1, roll: 0, at: [-0.17, -0.2, 0.27] },
    sprint: { dp: 0.95, dy: 0.15, roll: 0, at: [-0.15, -0.24, 0.2] },
  },
};
// the eased aim amount (Ou.update) and a blend between the low-ready and aiming values of something
function __ghAk(ik, aiming) {
  return ik.__ak === void 0 ? +!!aiming : ik.__ak;
}
function __ghMix(ready, aim, k) {
  return ready + (aim - ready) * k;
}
function __ghFrame(ik, body, par, aiming) {
  const T = __GH.v,
    f = T[0].set(0, 0, 1).applyQuaternion(body.getWorldQuaternion(__GH.q)).setY(0).normalize(),
    side = aV(par);
  f.applyAxisAngle(side, -__ghMix(Math.min(ik.__p, 0) * 0.5, ik.__p, __ghAk(ik, aiming)));
  const u = T[1].copy(__GH.up).addScaledVector(f, -__GH.up.dot(f)).normalize(),
    r = T[2].crossVectors(f, u).normalize();
  return { f, u, r };
}
function __ghSolveArm(H, wrist, pole, handQ) {
  if (!H || !H.arm || !H.fore) return;
  // The two-bone solve turns each bone the shortest way from where it is to where it must point, keeping the
  // twist it started with. Started from the clip's arm, that made the result depend on the clip: where a clip
  // held the arm nearly opposite to the hold (the kneeling clips, a reload ending), the shortest turn was
  // undefined and the arm twisted one way, then the other, frame after frame. Started from the rest pose (the
  // arm out to the side, never opposite to a hold in front of the body), the same hold gives the same arm.
  H.armRest && H.arm.quaternion.copy(H.armRest);
  H.foreRest && H.fore.quaternion.copy(H.foreRest);
  H.arm.updateMatrixWorld(!0);
  // Never stretched past 95 % of the arm's length: with the elbow at its straight limit the solve is all
  // but undefined (a centimetre nearer or further swings the elbow a long way), so a gun at arm's length
  // made the arm jump with every recoil kick. The hand stops a little short instead.
  const sh = H.arm.getWorldPosition(__GH.v[3].clone()),
    reach = (H.reach || (H.reach = sh.distanceTo(H.fore.getWorldPosition(new U())) + H.fore.getWorldPosition(new U()).distanceTo(H.hand.getWorldPosition(new U())))) * 0.95,
    d = wrist.clone().sub(sh);
  d.length() > reach && (wrist = sh.add(d.setLength(reach)));
  ZP(H.arm, H.fore, H.hand, wrist, pole);
  H.hand.parent.getWorldQuaternion(__GH.q2);
  H.hand.quaternion.copy(__GH.q2.invert().multiply(handQ));
  H.hand.updateMatrixWorld(!0);
}
// where the wrist goes so the palm's centre lands on a point: back along the fingers, out of the palm (in
// this model's own size: a fraction of its wrist-to-knuckle length)
function __ghWrist(H, palmPt, F, N) {
  const L = H.hand.getWorldPosition(new U()).distanceTo(H.mid.getWorldPosition(new U())) || 0.09,
    n = N.clone().addScaledVector(F, -N.dot(F)).normalize();
  return palmPt.clone().addScaledVector(F, -0.45 * L).addScaledVector(n, -0.26 * L);
}
// the hand's world rotation that puts its fingers along F and its palm towards N
function __ghHandQ(H, F, N, out) {
  const e1 = H.f,
    e2 = H.n,
    e3 = __GH.v[6].crossVectors(e1, e2),
    E2 = __GH.v[7].copy(N).addScaledVector(F, -N.dot(F)).normalize(),
    E3 = __GH.v[8].crossVectors(F, E2);
  __GH.m.makeBasis(F, E2, E3);
  __GH.m2.makeBasis(e1, e2, e3).transpose();
  return out.setFromRotationMatrix(__GH.m.multiply(__GH.m2));
}
function __ghCurl(H, curl, extra, w) {
  if (!H) return;
  for (const c of H.fingers) {
    const a = ((extra && extra[c.F]) || curl[c.F] || [0.8, 0.9, 0.6])[c.k - 1];
    __GH.q.setFromAxisAngle(c.axis, a);
    const tgt = __GH.q2.copy(c.rest).multiply(__GH.q);
    w >= 0.999 ? c.b.quaternion.copy(tgt) : c.b.quaternion.slerp(tgt, w);
  }
}
// Part-way between the clip's pose and the hold (a reload or toss starting or ending), each bone and the gun
// are blended between the two. A plain slerp always takes the shorter way round; where the clip's hand and the
// held hand point nearly opposite ways, the shorter way switches sides from one frame to the next and the hand
// (or the gun) spun half a turn in a frame. This blend keeps going the way it went last frame, and changes only
// when the other way has become clearly shorter.
function __ghSlerpKeep(ik, key, out, q0, q1, t) {
  const sides = ik.__side || (ik.__side = new Map());
  let d = q0.x * q1.x + q0.y * q1.y + q0.z * q1.z + q0.w * q1.w,
    s = sides.get(key) || (d < 0 ? -1 : 1);
  d * s < -0.3 && (s = -s);
  sides.set(key, s);
  d *= s;
  let a = 1 - t,
    b = t * s;
  if (d < 0.9995) {
    const th = Math.acos(Math.max(-1, Math.min(1, d))),
      sn = Math.sin(th);
    a = Math.sin((1 - t) * th) / sn;
    b = (Math.sin(t * th) / sn) * s;
  }
  return out.set(q0.x * a + q1.x * b, q0.y * a + q1.y * b, q0.z * a + q1.z * b, q0.w * a + q1.w * b).normalize();
}
function __gunHold(ik, o, aiming) {
  const g = ik.gun && ik.gun.obj,
    body = ik.body,
    par = body && body.parent,
    st = body && body.userData.__bpLoco,
    wpn = o.weapon;
  if (!g || !par || wpn === 'knife' || wpn === 'grenade') return __gunInHands(ik, o, aiming);
  const hd = ik.__hd || (ik.__hd = { R: __ghHand(body, 'R'), L: __ghHand(body, 'L') }),
    R = hd.R,
    L = hd.L;
  if (!R || !R.arm) return __gunInHands(ik, o, aiming);
  // which kind of gun: the core's table knows only its own pistols; the game's weapon classes (qO: kestrel,
  // striker -> pistol) decide for the rest, and a pistol gets the pistol grip points
  const pistol = ik.gun.grip.pistol || qO[wpn] === 'pistol',
    C = pistol && !ik.gun.grip.pistol ? ik.gun.pgrip || (ik.gun.pgrip = { grip: new U(0, -0.055, 0.022), fore: new U(0, -0.085, 0.03), pistol: !0, stock: 0 }) : ik.gun.grip,
    dt = ik.__dt || 0.016,
    cls = C.pistol ? 'pistol' : 'long';
  // the core leans the upper body to the aim; do that first (as __gunInHands does)
  const ak = __ghAk(ik, aiming),
    D = __ghMix(Math.min(ik.__p, 0) * 0.3 - 0.08, ik.__p, ak),
    side = aV(par),
    I = ik.b;
  I.Abdomen && CM(I.Abdomen, side, -D * 0.25);
  I.Torso && CM(I.Torso, side, -D * 0.35);
  I.Head && CM(I.Head, side, -D * 0.2);
  g.visible = !0;
  // the state, and its targets blended smoothly
  // the run hold only after 0.6 s of running (not on every burst of speed)
  const running = !aiming && st && st.moving && st.move === 'Run' && !st.crouchClip,
    now = performance.now();
  running ? ik.__runSince || (ik.__runSince = now) : (ik.__runSince = 0);
  const sprint = running && now - ik.__runSince > 600,
    state = aiming ? 'aim' : sprint ? 'sprint' : 'ready',
    P = __GH_POSE[cls][state],
    hp = ik.__hp || (ik.__hp = { dp: P.dp, dy: P.dy, roll: P.roll, x: P.at[0], y: P.at[1], z: P.at[2], w: 1, cls }),
    k = 1 - Math.exp(-dt * 6.5);
  if (hp.cls !== cls) Object.assign(hp, { dp: P.dp, dy: P.dy, roll: P.roll, x: P.at[0], y: P.at[1], z: P.at[2], cls });
  hp.dp += (P.dp - hp.dp) * k;
  hp.dy += (P.dy - hp.dy) * k;
  hp.roll += (P.roll - hp.roll) * k;
  hp.x += (P.at[0] - hp.x) * k;
  hp.y += (P.at[1] - hp.y) * k;
  hp.z += (P.at[2] - hp.z) * k;
  // the arms are the clip's while reloading or throwing
  const wantW = st && st.armsBusy ? 0 : 1;
  hp.w += (wantW - hp.w) * (1 - Math.exp(-dt * (wantW > hp.w ? 9 : 14)));
  const W = hp.w;
  // recoil: a short kick back and up after each shot
  const ago = st ? st.shotAgo : 9,
    kick = ago < 0.12 ? Math.sin((ago / 0.12) * Math.PI) * (C.pistol ? 1 : 0.6) : 0;
  // the aim frame at the right shoulder
  body.updateMatrixWorld(!0);
  const { f, u, r } = __ghFrame(ik, body, par, aiming),
    sh = R.arm.getWorldPosition(__GH.v[3]);
  // barrel direction: down by dp, across the body by dy (towards the left), plus the kick
  const b = __GH.v[4].copy(f).multiplyScalar(Math.cos(hp.dp - kick * 0.06)).addScaledVector(u, -Math.sin(hp.dp - kick * 0.06)).normalize();
  b.multiplyScalar(Math.cos(hp.dy)).addScaledVector(r, -Math.sin(hp.dy)).normalize();
  // gun axes: -Z along the barrel, +Y up (canted by roll)
  const zA = __GH.v[5].copy(b).negate(),
    yA = __GH.v[6].copy(__GH.up).addScaledVector(zA, -__GH.up.dot(zA)).normalize();
  hp.roll && yA.applyAxisAngle(zA, -hp.roll);
  const xA = __GH.v[7].crossVectors(yA, zA).normalize();
  __GH.m.makeBasis(xA, yA, zA);
  const gq = new Kw().setFromRotationMatrix(__GH.m);
  // where it sits: the stock in the shoulder pocket (long guns) or the grip in front (pistols)
  const anchor = new U().copy(sh).addScaledVector(r, hp.x).addScaledVector(u, hp.y).addScaledVector(f, hp.z - kick * 0.035),
    gpos = new U();
  if (C.pistol) gpos.copy(anchor).sub(C.grip.clone().applyQuaternion(gq));
  else gpos.copy(anchor).addScaledVector(b, C.stock).addScaledVector(yA, 0.035 + kick * 0.01);
  // where the clip's hands would put it (for reloads and throws), and the blend between the two
  if (W < 0.999) {
    __gunInHands(ik, o, aiming, !0);
    g.updateMatrixWorld(!0);
    const cp = g.getWorldPosition(new U()),
      cq = g.getWorldQuaternion(new Kw());
    gpos.lerpVectors(cp, gpos, W);
    __ghSlerpKeep(ik, 'gun', gq, cq, gq.clone(), W);
  } else ik.__side && ik.__side.size && ik.__side.clear(); // (a new blend starts from the shorter way)
  par.getWorldQuaternion(__GH.q2);
  g.quaternion.copy(__GH.q2.clone().invert().multiply(gq));
  g.position.copy(par.worldToLocal(gpos.clone()));
  g.updateMatrixWorld(!0);
  if (W < 0.01) return;
  // the hands onto the gun
  const save = W < 0.999 ? [R, L].filter(Boolean).flatMap((H) => [H.arm, H.fore, H.hand, ...H.fingers.map((c) => c.b)]).filter(Boolean).map((bn) => [bn, bn.quaternion.clone()]) : null;
  const gx = new U(1, 0, 0).applyQuaternion(gq),
    gy = new U(0, 1, 0).applyQuaternion(gq),
    gz = new U(0, 0, 1).applyQuaternion(gq),
    toW = (x, y, z) => new U().copy(g.position).set(0, 0, 0).addScaledVector(gx, x).addScaledVector(gy, y).addScaledVector(gz, z),
    pt = (p) => g.localToWorld(p.clone());
  // right hand: palm on the grip's right side, fingers forward and down round it, palm facing left (a pistol's
  // grip is nearer upright: the hand's long axis is nearer the barrel)
  const FR = (C.pistol ? toW(0, -0.35, -0.94) : toW(0, -0.55, -0.8)).normalize(),
    NR = toW(-1, -0.1, 0).normalize(),
    qR = __ghHandQ(R, FR, NR, new Kw()),
    palmR = pt(C.grip).addScaledVector(gx, C.pistol ? 0.022 : 0.026),
    wristR = __ghWrist(R, palmR, FR, NR);
  __ghSolveArm(R, wristR, new U().copy(u).multiplyScalar(-1).addScaledVector(r, 0.45 + 0.3 * ak).addScaledVector(f, -0.25), qR);
  C.pistol ? __ghCurl(R, __GH_CURL.pistolR, null, 1) : __ghCurl(R, __GH_CURL.rifleR, ago < 0.25 || aiming ? __GH_CURL.fireR : null, 1);
  if (L && L.arm) {
    let qL, palmL, pole, FL, NL;
    if (C.pistol) {
      // support hand (thumbs forward): the palm on the grip's open left side, below the slide, its fingers
      // wrapping round the front of the right hand's fingers under the trigger guard; the thumb along the frame
      FL = toW(0.08, -0.5, -0.86).normalize();
      NL = toW(1, 0.08, 0).normalize();
      qL = __ghHandQ(L, FL, NL, new Kw());
      palmL = pt(C.grip).addScaledVector(gx, -0.034).addScaledVector(gy, -0.004).addScaledVector(gz, -0.004);
      pole = new U().copy(u).multiplyScalar(-1).addScaledVector(r, -0.75).addScaledVector(f, -0.1);
      __ghCurl(L, __GH_CURL.pistolL, null, 1);
    } else {
      // support hand: under the handguard from the left, fingers wrapping up its right side
      FL = toW(0.7, 0.25, -0.55).normalize();
      NL = toW(0.45, 0.9, 0).normalize();
      qL = __ghHandQ(L, FL, NL, new Kw());
      palmL = pt(C.fore).addScaledVector(gx, -0.025).addScaledVector(gy, -0.03);
      pole = new U().copy(u).multiplyScalar(-1).addScaledVector(r, -0.35).addScaledVector(f, -0.1);
      __ghCurl(L, __GH_CURL.rifleL, null, 1);
    }
    __ghSolveArm(L, __ghWrist(L, palmL, FL, NL), pole, qL);
  }
  // part-way back to the clip (a reload or toss starting or ending)
  if (save) for (const [bn, q0] of save) (__ghSlerpKeep(ik, bn, bn.quaternion, q0, bn.quaternion.clone(), W), bn.updateMatrixWorld(!0));
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

