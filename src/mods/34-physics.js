/* ===== Bayou Protocol mod: Rapier physics ===== */
// Rapier 3D (@dimforge/rapier3d-compat) is the physics engine; three.js stays the renderer.
//
// Sections in this file:
//   PhysicsManager        async WASM init, one Rapier world per map, fixed 1/60 s steps from an accumulator,
//                         interpolation factor for rendering, rebuild on map change, full disposal
//   CollisionManager      collision groups and filters, the map-box <-> collider registry, ray queries that
//                         the game's hitscan, line of sight and rockets go through
//   CharacterController   Rapier's kinematic character controller for every player and bot: capsule, steps,
//                         slopes, ground snap, walls and ceilings; capsule-vs-capsule character collision;
//                         stay crouched under low ceilings
//   ProjectileManager     thrown grenades (HE, flash, smoke, molotov) as CCD rigid bodies with contact events;
//                         rockets stay as swept rays (now through Rapier)
//   WeaponPhysics         bullet impulses and breakage on props, explosion knockback on players, blast
//                         impulses on props
//   EnvironmentalPhysics  dynamic props declared by a map (map.physProps): mass, friction, restitution,
//                         pushing, knocking over, breakable crates with debris, reset every round
//   RagdollController     builds an articulated ragdoll from rigid bodies and spherical joints (foundation;
//                         the existing Verlet death ragdoll is still what you see)
//
// What stays the same: the game's movement feel (speeds, acceleration, air control, jump height, 18 m/s²
// player gravity), mouse look and camera, damage, hitboxes (analytic head sphere / body cylinder, exact and
// cheap), netcode. Online, everything that decides gameplay (walls, floors, grenades) is computed by the
// host as before; props are simulated on each screen and never block bullets, so they cannot desync a match.
// Until the WASM module is ready (a fraction of a second after page load) and if it ever fails to load, the
// game's original box solver is used instead, so nothing calls into Rapier before it exists.

// ---------------------------------------------------------------- PhysicsManager
const __PHX = {
  R: null,
  ready: !1,
  failed: !1,
  world: null,
  map: null,
  nBoxes: 0,
  STEP: 1 / 60,
  MAX_STEPS: 5,
  acc: 0,
  alpha: 0,
  steps: 0,
  events: null,
  ground: null,
  boxCols: [], // collider per map box (same index), null when skipped
  boxOf: new Map(), // collider handle -> map box
  propOf: new Map(), // collider handle -> prop / debris record
  chars: new Map(), // player id -> character record
  kcc: null,
  nades: new Map(), // grenade object -> body record
  nadeOf: new Map(), // collider handle -> grenade object
  props: [], // live prop records
  debris: [],
  ragdolls: new Set(),
  stats: { steps: 0, kcc: 0, rays: 0, rayMs: 0, contacts: 0 },
};
const __G = 9.81;
typeof window < 'u' &&
  import('@dimforge/rapier3d-compat')
    .then(async (m) => {
      const R = m.default || m;
      await R.init();
      __PHX.R = R;
      __PHX.ready = !0;
      __phxShapes();
    })
    .catch((e) => {
      __PHX.failed = !0;
      console.warn('[physics] Rapier failed to load, using the built-in box solver', e);
    });
function __phxOn() {
  return __PHX.ready && !__PHX.off && !!__PHX.world && __PHX.map === aw();
}
// build (or rebuild) the world for the current map; returns false while Rapier is still loading
function __phxEnsure() {
  if (!__PHX.ready) return !1;
  const m = aw();
  if (__PHX.world && __PHX.map === m && __PHX.nBoxes === m.boxes.length) return !0;
  __phxDispose();
  __phxBuild(m);
  return !0;
}
function __phxBuild(m) {
  const P = __PHX,
    R = P.R,
    w = new R.World({ x: 0, y: -__G, z: 0 });
  w.timestep = P.STEP;
  w.integrationParameters.numSolverIterations = 4;
  P.world = w;
  P.map = m;
  P.nBoxes = m.boxes.length;
  P.events = new R.EventQueue(!0);
  // the game has an implicit ground plane at y = 0 under every map. Sized to the map: a huge cuboid loses
  // floating-point precision in contact normals and drags the character controller.
  P.ground = w.createCollider(
    R.ColliderDesc.cuboid(m.w / 2 + 40, 1, m.d / 2 + 40)
      .setTranslation(m.w / 2, -1, m.d / 2)
      .setCollisionGroups(__cg(__CG.ENV, __CG.ALL))
      .setFriction(0.8),
  );
  P.boxCols = m.boxes.map((b) => {
    const hx = Math.max(0.005, (b.max.x - b.min.x) / 2),
      hy = Math.max(0.005, (b.max.y - b.min.y) / 2),
      hz = Math.max(0.005, (b.max.z - b.min.z) / 2);
    const glass = b.kind === 'glass';
    const c = w.createCollider(
      R.ColliderDesc.cuboid(hx, hy, hz)
        .setTranslation(b.min.x + hx, b.min.y + hy, b.min.z + hz)
        .setCollisionGroups(__cg(glass ? __CG.GLASS : __CG.ENV, __CG.ALL))
        .setFriction(b.mat === 'metal' ? 0.45 : b.mat === 'wood' ? 0.65 : 0.8)
        .setRestitution(b.mat === 'metal' ? 0.3 : 0.15)
        .setEnabled(!b.off),
    );
    c.__on = !b.off;
    P.boxOf.set(c.handle, b);
    return c;
  });
  P.kcc = __phxMakeKcc(w);
  P.acc = 0;
  __phxPropsBuild(m);
  w.step(P.events); // scene queries only see colliders after a step
}
function __phxDispose() {
  const P = __PHX;
  __phxPropsDispose();
  for (const r of P.ragdolls) r.dispose();
  P.ragdolls.clear();
  P.chars.clear();
  P.nades.clear();
  P.nadeOf.clear();
  P.boxOf.clear();
  P.propOf.clear();
  P.boxCols = [];
  if (P.world) {
    P.kcc && P.world.removeCharacterController(P.kcc);
    P.events && P.events.free();
    P.world.free();
  }
  P.world = null;
  P.kcc = null;
  P.events = null;
  P.map = null;
}
// fixed-step driver: called once per simulation sub-step with that sub-step's dt
function __phxAdvance(state, dt) {
  const P = __PHX;
  if (!__phxEnsure()) return;
  P.acc += dt;
  let n = 0;
  while (P.acc >= P.STEP && n < P.MAX_STEPS) {
    __phxPreStep(state);
    P.world.step(P.events);
    __phxPostStep(state);
    P.acc -= P.STEP;
    n++;
    P.stats.steps++;
  }
  if (n === P.MAX_STEPS) P.acc = 0; // far behind (tab was hidden): drop the backlog instead of spiralling
  P.alpha = P.acc / P.STEP;
}
function __phxPreStep(state) {
  const P = __PHX;
  // doors opening, glass breaking and barrels exploding switch their colliders
  const boxes = P.map.boxes;
  for (let i = 0; i < boxes.length; i++) {
    const c = P.boxCols[i];
    if (!c) continue;
    const on = !boxes[i].off;
    if (c.__on !== on) {
      c.setEnabled(on);
      c.__on = on;
    }
  }
  __phxCharsSync(state);
}
function __phxPostStep(state) {
  const P = __PHX;
  P.events.drainCollisionEvents((h1, h2, started) => {
    if (!started) return;
    P.stats.contacts++;
    const g = P.nadeOf.get(h1) || P.nadeOf.get(h2);
    g && (g.__hit = !0);
  });
  __phxNadesAfterStep(state);
  __phxPropsAfterStep();
}

// ---------------------------------------------------------------- CollisionManager
// Rapier interaction groups: upper 16 bits = what a collider is, lower 16 bits = what it collides with.
const __CG = {
  ENV: 1, // static world: walls, floors, stairs, props baked into the map, doors
  GLASS: 2, // windows (breakable; grenades and bullets go through and break them)
  PLAYER: 4, // the local player's body
  ENEMY: 8, // every other character (bots, remote players)
  PROJECTILE: 16, // grenades
  INTERACTIVE: 32, // dynamic props
  TRIGGER: 64, // sensors (reserved for objective volumes)
  HITBOX: 128, // reserved: hit detection uses the analytic head/body volumes in NE()
  WEAPON: 256, // query group for bullets and melee
  DEBRIS: 512, // short-lived pieces of broken props
  ALL: 0xffff,
};
const __cg = (member, filter) => ((member & 0xffff) << 16) | (filter & 0xffff);
const __CF = {
  char: __cg(__CG.PLAYER | __CG.ENEMY, __CG.INTERACTIVE | __CG.DEBRIS),
  kcc: __cg(__CG.PLAYER | __CG.ENEMY, __CG.ENV | __CG.GLASS | __CG.INTERACTIVE),
  nade: __cg(__CG.PROJECTILE, __CG.ENV | __CG.INTERACTIVE),
  // props and debris also answer WEAPON queries (bullet rays), which never collide physically
  prop: __cg(__CG.INTERACTIVE, __CG.ENV | __CG.GLASS | __CG.PLAYER | __CG.ENEMY | __CG.PROJECTILE | __CG.INTERACTIVE | __CG.DEBRIS | __CG.WEAPON),
  debris: __cg(__CG.DEBRIS, __CG.ENV | __CG.GLASS | __CG.INTERACTIVE | __CG.WEAPON),
  bullet: __cg(__CG.WEAPON, __CG.ENV | __CG.GLASS),
  bulletProps: __cg(__CG.WEAPON, __CG.INTERACTIVE | __CG.DEBRIS),
  glassOnly: __cg(__CG.WEAPON, __CG.GLASS),
  staticOnly: __cg(__CG.ALL, __CG.ENV),
};
let __ray = null;
function __phxRay(o, d) {
  const R = __PHX.R;
  __ray || (__ray = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }));
  __ray.origin.x = o.x;
  __ray.origin.y = o.y;
  __ray.origin.z = o.z;
  __ray.dir.x = d.x;
  __ray.dir.y = d.y;
  __ray.dir.z = d.z;
  return __ray;
}
const __inBox = (p, b) =>
  p.x >= b.min.x && p.x <= b.max.x && p.y >= b.min.y && p.y <= b.max.y && p.z >= b.min.z && p.z <= b.max.z;
// Same contract as the game's grid ray cast: nearest map box that passes `pred`, skipping boxes that are
// switched off and boxes the ray starts inside. Returns { t, point, normal, box } or null.
function __phxRayBoxes(o, d, maxT, pred) {
  const P = __PHX,
    t0 = performance.now();
  const hit = P.world.castRayAndGetNormal(
    __phxRay(o, d),
    maxT,
    !0,
    void 0,
    __CF.bullet,
    void 0,
    void 0,
    (c) => {
      const b = P.boxOf.get(c.handle);
      return !!b && !b.off && pred(b) && !__inBox(o, b);
    },
  );
  P.stats.rays++;
  P.stats.rayMs += performance.now() - t0;
  if (!hit) return null;
  const t = hit.timeOfImpact,
    n = hit.normal;
  return {
    t,
    point: { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t },
    // boxes are axis-aligned: snap the normal so it matches the grid cast exactly
    normal:
      Math.abs(n.x) > 0.5
        ? { x: Math.sign(n.x), y: 0, z: 0 }
        : Math.abs(n.y) > 0.5
          ? { x: 0, y: Math.sign(n.y), z: 0 }
          : { x: 0, y: 0, z: Math.sign(n.z) },
    box: P.boxOf.get(hit.collider.handle),
  };
}
{
  const coreRay = jc;
  // hitscan bullets, line of sight (Pg), rockets and every other jc() caller go through Rapier
  jc = function (w, A, i, I, B = (g) => g.solid) {
    if (__phxOn() && I === __PHX.map.boxes && i > 0) return __phxRayBoxes(w, A, i, B);
    return coreRay(w, A, i, I, B);
  };
}

// ---------------------------------------------------------------- CharacterController
const __KCC = { offset: 0.02, step: me + 0.03, stepWidth: 0.12, snap: 0.32, climb: (46 * Math.PI) / 180, slide: (50 * Math.PI) / 180 };
function __phxMakeKcc(w) {
  const k = w.createCharacterController(__KCC.offset);
  k.setUp({ x: 0, y: 1, z: 0 });
  k.setSlideEnabled(!0);
  k.enableAutostep(__KCC.step, __KCC.stepWidth, !1);
  k.enableSnapToGround(__KCC.snap);
  k.setMaxSlopeClimbAngle(__KCC.climb);
  k.setMinSlopeSlideAngle(__KCC.slide);
  k.setApplyImpulsesToDynamicBodies(!0);
  k.setCharacterMass(85);
  return k;
}
const __capShapes = new Map();
function __phxCapsule(hh) {
  const k = Math.round(hh * 100);
  let s = __capShapes.get(k);
  s || __capShapes.set(k, (s = new __PHX.R.Capsule(k / 100, PQ)));
  return s;
}
function __phxShapes() {}
const __idQ = { x: 0, y: 0, z: 0, w: 1 };
function __phxChar(w) {
  const P = __PHX,
    R = P.R;
  let c = P.chars.get(w.id);
  if (c && c.p === w) return c;
  if (c) {
    P.world.removeCollider(c.probe, !1);
    P.world.removeRigidBody(c.body);
  }
  const hh = Math.max(0.05, kO / 2 - PQ);
  // the probe is what the controller sweeps; it collides with nothing itself
  const probe = P.world.createCollider(R.ColliderDesc.capsule(hh, PQ).setSensor(!0).setCollisionGroups(0));
  // the body is a kinematic capsule that follows the character so props bounce off people
  const body = P.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(w.pos.x, w.pos.y + kO / 2, w.pos.z));
  const col = P.world.createCollider(
    R.ColliderDesc.capsule(hh, PQ).setCollisionGroups(__CF.char).setFriction(0.5),
    body,
  );
  c = { p: w, probe, body, col, hh, bodyHh: hh };
  P.chars.set(w.id, c);
  return c;
}
function __phxCharsSync(state) {
  const P = __PHX;
  if (!state) return;
  const live = new Set();
  for (const p of state.players) {
    live.add(p.id);
    const c = __phxChar(p);
    const on = !!p.alive;
    c.col.isEnabled() !== on && c.col.setEnabled(on);
    if (!on) continue;
    const hh = Math.max(0.05, tQ(p) / 2 - PQ);
    if (Math.abs(hh - c.bodyHh) > 0.01) {
      c.col.setHalfHeight(hh);
      c.bodyHh = hh;
    }
    c.body.setNextKinematicTranslation({ x: p.pos.x, y: p.pos.y + PQ + hh, z: p.pos.z });
  }
  for (const [id, c] of P.chars)
    if (!live.has(id)) {
      P.world.removeCollider(c.probe, !1);
      P.world.removeRigidBody(c.body);
      P.chars.delete(id);
    }
}
const __kccPred = (c) => {
  const b = __PHX.boxOf.get(c.handle);
  return b ? !b.off : !0;
};
const __kv = { x: 0, y: 0, z: 0 };
function __phxMove(w, dt) {
  const P = __PHX,
    k = P.kcc,
    c = __phxChar(w);
  // capsule height follows crouch; refuse to stand up into a ceiling
  let hh = Math.max(0.05, tQ(w) / 2 - PQ);
  if (hh > c.hh + 0.004) {
    const cy = w.pos.y + PQ + hh + __KCC.offset;
    const blocked = P.world.intersectionWithShape(
      { x: w.pos.x, y: cy, z: w.pos.z },
      __idQ,
      __phxCapsule(hh),
      P.R.QueryFilterFlags.EXCLUDE_SENSORS,
      __cg(__CG.ALL, __CG.ENV),
      void 0,
      void 0,
      __kccPred,
    );
    if (blocked) {
      w.crouch = Math.min(1, Math.max(0, (kO - 2 * (c.hh + PQ)) / (kO - p4)));
      hh = c.hh;
    }
  }
  if (Math.abs(hh - c.hh) > 0.001) {
    c.probe.setHalfHeight(hh);
    c.hh = hh;
  }
  const lift = PQ + hh + __KCC.offset;
  c.probe.setTranslation({ x: w.pos.x, y: w.pos.y + lift, z: w.pos.z });
  // on the ground the sweep is horizontal and snap-to-ground keeps the feet down (stairs, slopes, small
  // drops); pressing the capsule into the floor every tick makes the controller bleed speed on box seams
  const stick = w.onGround && w.vel.y <= 0;
  __kv.x = w.vel.x * dt;
  __kv.y = stick ? 0 : w.vel.y * dt;
  __kv.z = w.vel.z * dt;
  k.computeColliderMovement(c.probe, __kv, P.R.QueryFilterFlags.EXCLUDE_SENSORS, __CF.kcc, __kccPred);
  P.stats.kcc++;
  const mv = k.computedMovement();
  let nx = w.pos.x + mv.x,
    ny = w.pos.y + mv.y,
    nz = w.pos.z + mv.z;
  // velocity response: keep sliding along surfaces, stop into them
  for (let i = 0, n = k.numComputedCollisions(); i < n; i++) {
    const h = k.computedCollision(i);
    if (!h) continue;
    const N = h.normal1;
    __PHX.dbg && __PHX.dbg.push([+N.x.toFixed(2), +N.y.toFixed(2), +N.z.toFixed(2), +(h.witness1.y - w.pos.y).toFixed(2), P.boxOf.get(h.collider && h.collider.handle)?.kind]);
    if (N.y > 0.6) continue; // ground: handled by the grounded flag
    if (N.y < -0.6) {
      w.vel.y > 0 && (w.vel.y = 0); // ceiling
      continue;
    }
    const L = Math.hypot(N.x, N.z) || 1,
      ex = N.x / L,
      ez = N.z / L,
      into = w.vel.x * ex + w.vel.z * ez;
    if (into < 0) {
      w.vel.x -= into * ex;
      w.vel.z -= into * ez;
    }
  }
  // character-to-character: capsules push apart (other characters' bodies are processed on their own update)
  const st = eA.state;
  if (st) {
    let px = 0,
      pz = 0;
    for (const o of st.players) {
      if (o === w || !o.alive) continue;
      const dy = o.pos.y - ny;
      if (dy > tQ(w) - 0.1 || -dy > tQ(o) - 0.1) continue;
      const dx = nx - o.pos.x,
        dz = nz - o.pos.z,
        d = Math.hypot(dx, dz),
        min = PQ * 2;
      if (d >= min) continue;
      const push = min - d;
      if (d > 1e-4) {
        px += (dx / d) * push;
        pz += (dz / d) * push;
      } else {
        const a = (w.id.length * 1.7) % 6.28;
        px += Math.cos(a) * push;
        pz += Math.sin(a) * push;
      }
    }
    if (px || pz) {
      // resolve the push through the controller too, so it can never shove someone into a wall
      c.probe.setTranslation({ x: nx, y: ny + lift, z: nz });
      __kv.x = px;
      __kv.y = 0;
      __kv.z = pz;
      k.computeColliderMovement(c.probe, __kv, P.R.QueryFilterFlags.EXCLUDE_SENSORS, __CF.kcc, __kccPred);
      const m2 = k.computedMovement();
      nx += m2.x;
      nz += m2.z;
      const vin = (w.vel.x * px + w.vel.z * pz) / Math.hypot(px, pz);
      if (vin < 0) {
        const L = Math.hypot(px, pz);
        w.vel.x -= (vin * px) / L;
        w.vel.z -= (vin * pz) / L;
      }
    }
  }
  w.pos.x = nx;
  w.pos.y = ny;
  w.pos.z = nz;
  const grounded = k.computedGrounded() && w.vel.y <= 0.01;
  if (grounded) {
    w.vel.y < 0 && (w.vel.y = 0);
    w.onGround = !0;
  } else w.onGround = !1;
  w.pos.y < 0 && ((w.pos.y = 0), w.vel.y < 0 && (w.vel.y = 0), (w.onGround = !0));
}
{
  const coreMove = h4;
  h4 = function (w, A, i) {
    if (__phxOn() && i === __PHX.map.boxes && A > 0) return __phxMove(w, A);
    return coreMove(w, A, i);
  };
}

// ---------------------------------------------------------------- ProjectileManager
const __NADE = { r: 0.05, mass: 0.4, restitution: 0.38, friction: 0.7, gravityScale: sU / __G };
function __phxNade(g) {
  const P = __PHX,
    R = P.R;
  let rec = P.nades.get(g);
  if (rec) return rec;
  const body = P.world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(g.pos.x, g.pos.y, g.pos.z)
      .setLinvel(g.vel.x, g.vel.y, g.vel.z)
      .setAngvel({ x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 12 })
      .setGravityScale(__NADE.gravityScale)
      .setCcdEnabled(!0)
      .setLinearDamping(0.04)
      .setAngularDamping(1.6),
  );
  const col = P.world.createCollider(
    R.ColliderDesc.ball(__NADE.r)
      .setMass(__NADE.mass)
      .setRestitution(__NADE.restitution)
      .setFriction(__NADE.friction)
      .setCollisionGroups(__CF.nade)
      .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS),
    body,
  );
  rec = { body, col, p0: { ...g.pos }, p1: { ...g.pos }, v0: { ...g.vel } };
  P.nades.set(g, rec);
  P.nadeOf.set(col.handle, g);
  return rec;
}
function __phxNadeDrop(g) {
  const P = __PHX,
    rec = P.nades.get(g);
  if (!rec) return;
  P.nadeOf.delete(rec.col.handle);
  P.world.removeRigidBody(rec.body);
  P.nades.delete(g);
}
function __phxNadesAfterStep(state) {
  const P = __PHX;
  if (!P.nades.size) return;
  const live = state ? new Set(state.grenades) : new Set();
  for (const [g, rec] of P.nades) {
    if (!live.has(g)) {
      __phxNadeDrop(g);
      continue;
    }
    const t = rec.body.translation(),
      v = rec.body.linvel();
    rec.p0 = rec.p1;
    rec.p1 = { x: t.x, y: t.y, z: t.z };
    // windows: grenades break the glass they fly through and lose a little speed
    const dx = rec.p1.x - rec.p0.x,
      dy = rec.p1.y - rec.p0.y,
      dz = rec.p1.z - rec.p0.z,
      L = Math.hypot(dx, dy, dz);
    if (L > 1e-4 && state) {
      const d = { x: dx / L, y: dy / L, z: dz / L };
      const h = P.world.castRayAndGetNormal(__phxRay(rec.p0, d), L, !0, void 0, __CF.glassOnly, void 0, void 0, (c) => {
        const b = P.boxOf.get(c.handle);
        return !!b && !b.off && b.glass !== void 0;
      });
      if (h) {
        const b = P.boxOf.get(h.collider.handle);
        hE(state, b.glass, { x: rec.p0.x + d.x * h.timeOfImpact, y: rec.p0.y + d.y * h.timeOfImpact, z: rec.p0.z + d.z * h.timeOfImpact }, d);
        rec.body.setLinvel({ x: v.x * 0.8, y: v.y * 0.8, z: v.z * 0.8 }, !0);
      }
    }
    // a hard contact: bounce sound, and molotovs burst
    if (g.__hit) {
      g.__hit = !1;
      const dv = Math.hypot(v.x - rec.v0.x, v.y - rec.v0.y, v.z - rec.v0.z);
      if (dv > 1.2) {
        g.__bounced = !0;
        state && Math.hypot(v.x, v.y, v.z) > 1.2 && state.fx.push({ type: 'bounce', pos: { ...rec.p1 } });
      }
    }
    rec.v0 = { x: v.x, y: v.y, z: v.z };
  }
}
{
  const coreNades = Q1;
  // same rules as the game's grenade update (fuses, molotov bursting on impact, effects); only the movement
  // comes from Rapier. Rockets keep their swept-ray flight.
  Q1 = function (w, A) {
    if (!__phxOn()) return coreNades(w, A);
    const P = __PHX,
      a = P.alpha;
    for (const I of [...w.grenades]) {
      if (I.kind === 'rocket') {
        M1(w, I, A);
        continue;
      }
      const rec = __phxNade(I),
        v = rec.body.linvel();
      // render/sim position: interpolated between the last two physics steps
      I.pos = { x: rec.p0.x + (rec.p1.x - rec.p0.x) * a, y: rec.p0.y + (rec.p1.y - rec.p0.y) * a, z: rec.p0.z + (rec.p1.z - rec.p0.z) * a };
      I.vel = { x: v.x, y: v.y, z: v.z };
      const B = !!I.__bounced;
      I.__bounced = !1;
      I.fuse -= A;
      I.kind === 'molotov' && B && (I.fuse = Math.min(I.fuse, 0));
      if (I.fuse > 0) continue;
      w.grenades = w.grenades.filter((g) => g !== I);
      __phxNadeDrop(I);
      if (I.kind === 'flash') aU(w, I.pos, XB(w, I.owner) ?? null);
      else if (I.kind === 'smoke')
        w.smokes.push({ pos: { ...I.pos, y: Math.max(0, I.pos.y - 0.06) }, born: w.t, until: w.t + CU }), w.fx.push({ type: 'smoke', pos: { ...I.pos } });
      else if (I.kind === 'molotov') {
        const g = W9(I.pos);
        xE(w, { x: I.pos.x, y: g, z: I.pos.z }, g1, n1, I.owner);
      } else jQ(w, I.pos, Fh, gw.grenade.damage, XB(w, I.owner) ?? null, 'grenade');
    }
  };
}

// ---------------------------------------------------------------- WeaponPhysics
// knockback strength (m/s at the centre of the blast) by explosion source
const __KNOCK = { grenade: 7, rpg: 9, bomb: 12, barrel: 7, default: 6 };
{
  const coreBlast = jQ;
  jQ = function (w, A, i, I, B, g) {
    coreBlast(w, A, i, I, B, g);
    try {
      const k = __KNOCK[g] ?? __KNOCK.default,
        e = { x: A.x, y: A.y + 0.3, z: A.z };
      for (const p of w.players) {
        if (!p.alive || p.remote) continue;
        const c = { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z },
          dx = c.x - A.x,
          dz = c.z - A.z,
          d = Math.hypot(dx, c.y - A.y, dz);
        if (d > i || !Pg(e, c, aw().boxes)) continue;
        const s = k * (1 - d / i),
          h = Math.hypot(dx, dz) || 1;
        p.vel.x += (dx / h) * s;
        p.vel.z += (dz / h) * s;
        s > 1.5 && ((p.vel.y = Math.max(p.vel.y, s * 0.42)), (p.onGround = !1));
      }
    } catch (e) {}
  };
}
// a local effect event, rendered and heard by the normal effects pipeline (bullet impact sparks/splinters)
function __phxEmit(list) {
  const S = eA.state;
  if (!S) return;
  for (const f of eA.listeners) {
    try {
      f(list, S);
    } catch (e) {}
  }
}
function __phxBulletProps(ev) {
  const P = __PHX;
  if (!P.props.length && !P.debris.length) return;
  const wp = gw[ev.weapon];
  if (!wp || ev.weapon === 'knife' || ev.weapon === 'grenade' || ev.weapon === 'flamer' || wp.special === 'rocket') return;
  const dx = ev.to.x - ev.from.x,
    dy = ev.to.y - ev.from.y,
    dz = ev.to.z - ev.from.z,
    L = Math.hypot(dx, dy, dz);
  if (L < 1e-3) return;
  const d = { x: dx / L, y: dy / L, z: dz / L };
  // bullets keep going through props (they cannot block shots online), but they shove and break them
  let o = ev.from,
    left = L + 0.05,
    hits = 0;
  while (hits < 3) {
    const h = P.world.castRayAndGetNormal(__phxRay(o, d), left, !0, void 0, __CF.bulletProps);
    if (!h) break;
    const rec = P.propOf.get(h.collider.handle);
    const pt = { x: o.x + d.x * h.timeOfImpact, y: o.y + d.y * h.timeOfImpact, z: o.z + d.z * h.timeOfImpact };
    if (rec && rec.body) {
      const J = Math.min(1.8, wp.damage * 0.022) * (wp.pellets > 1 ? 0.5 : 1);
      rec.body.applyImpulseAtPoint({ x: d.x * J, y: d.y * J + J * 0.15, z: d.z * J }, pt, !0);
      __phxEmit([{ type: 'impact', pos: pt, normal: h.normal, flesh: !1, mat: rec.def.mat, noHole: !0, __phx: 1 }]);
      if (rec.def.hp) {
        rec.hp -= wp.damage;
        rec.hp <= 0 && __phxBreak(rec, d);
      }
    }
    hits++;
    left -= h.timeOfImpact + 0.02;
    if (left <= 0) break;
    o = { x: pt.x + d.x * 0.02, y: pt.y + d.y * 0.02, z: pt.z + d.z * 0.02 };
  }
}
function __phxBlastProps(pos, big) {
  const P = __PHX,
    R = big ? 10 : 7.5,
    k = big ? 16 : 11;
  for (const list of [P.props, P.debris])
    for (const rec of list) {
      if (!rec.body) continue;
      const t = rec.body.translation(),
        dx = t.x - pos.x,
        dy = t.y - pos.y + 0.4,
        dz = t.z - pos.z,
        d = Math.hypot(dx, dy, dz);
      if (d > R) continue;
      const m = rec.body.mass(),
        s = (k * m * (1 - d / R)) / Math.max(0.5, d);
      rec.body.applyImpulse({ x: dx * s, y: Math.abs(dy) * s + s * 0.6, z: dz * s }, !0);
      rec.body.applyTorqueImpulse({ x: (Math.random() - 0.5) * s * 0.3, y: (Math.random() - 0.5) * s * 0.3, z: (Math.random() - 0.5) * s * 0.3 }, !0);
      rec.def && rec.def.hp && d < R * 0.55 && __phxBreak(rec, { x: dx / d, y: 0.3, z: dz / d });
    }
}
typeof window < 'u' &&
  eA.on((ev) => {
    if (!__phxOn()) return;
    for (const e of ev) {
      if (e.__phx) continue;
      try {
        if (e.type === 'shot') __phxBulletProps(e);
        else if (e.type === 'explosion') __phxBlastProps(e.pos, e.big);
      } catch (err) {}
    }
  });

// ---------------------------------------------------------------- EnvironmentalPhysics
// Prop catalogue. Sizes in metres, mass in kg. Light enough to shove by walking into them; crates break.
const __PROPS = {
  tray: { box: [0.46, 0.025, 0.34], mass: 0.35, fr: 0.45, re: 0.25, color: '#9aa1a8', mat: 'metal', metal: 0.7 },
  chair: { chair: !0, box: [0.46, 0.84, 0.5], mass: 3.2, fr: 0.6, re: 0.1, color: '#3f5f86', mat: 'metal' },
  stool: { cyl: [0.18, 0.46], mass: 2.4, fr: 0.6, re: 0.1, color: '#5c6670', mat: 'metal', metal: 0.6 },
  bin: { cyl: [0.24, 0.72], mass: 4.5, fr: 0.5, re: 0.15, color: '#475348', mat: 'metal', metal: 0.4 },
  bucket: { cyl: [0.17, 0.33], mass: 1.2, fr: 0.5, re: 0.2, color: '#d0a53a', mat: 'metal' },
  cone: { cone: [0.17, 0.5], mass: 0.8, fr: 0.7, re: 0.2, color: '#e2621d', mat: 'dirt' },
  box: { box: [0.5, 0.38, 0.4], mass: 2.5, fr: 0.65, re: 0.05, color: '#b48d5c', mat: 'wood' },
  crate: { box: [0.72, 0.62, 0.72], mass: 16, fr: 0.65, re: 0.05, color: '#9b7447', mat: 'wood', hp: 60, planks: !0 },
  ball: { ball: 0.12, mass: 0.62, fr: 0.8, re: 0.78, color: '#cf6a2c', mat: 'dirt', damp: 0.3 },
  mattress: { box: [0.82, 0.13, 1.9], mass: 9, fr: 0.9, re: 0.05, color: '#d6d0bf', mat: 'dirt' },
  book: { box: [0.17, 0.04, 0.24], mass: 0.45, fr: 0.6, re: 0.1, color: '#6b3a32', mat: 'wood' },
  can: { cyl: [0.033, 0.12], mass: 0.05, fr: 0.5, re: 0.3, color: '#b7bdc3', mat: 'metal', metal: 0.9 },
  plank: { box: [0.6, 0.04, 0.12], mass: 1.1, fr: 0.65, re: 0.1, color: '#9b7447', mat: 'wood' },
};
const __propGeo = new Map(),
  __propMat = new Map();
function __phxPropMat(def) {
  const k = def.color + '|' + (def.metal || 0);
  let m = __propMat.get(k);
  m || __propMat.set(k, (m = new Gw({ color: def.color, roughness: def.metal ? 0.45 : 0.85, metalness: def.metal || 0 })));
  return m;
}
function __phxPropMesh(type, def) {
  const g = new ji(),
    mat = __phxPropMat(def),
    add = (geo, x, y, z, m = mat) => {
      const o = new Ow(geo, m);
      o.position.set(x, y, z);
      o.castShadow = o.receiveShadow = !0;
      g.add(o);
      return o;
    };
  if (def.chair) {
    // moulded plastic stacking chair: seat, back, four steel legs
    const [w, h, d] = def.box,
      leg = __phxPropMat({ color: '#2b2f33', metal: 0.8 });
    add(new _i(w, 0.04, d * 0.86), 0, -h / 2 + 0.46, 0.02);
    add(new _i(w, 0.36, 0.04), 0, -h / 2 + 0.66, -d / 2 + 0.03).rotation.x = -0.12;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new _i(0.025, 0.46, 0.025), (sx * w) / 2.3, -h / 2 + 0.23, (sz * d) / 2.4, leg);
  } else if (def.box) add(new _i(...def.box), 0, 0, 0);
  else if (def.cyl) {
    const [r, h] = def.cyl;
    add(new Rw(r, r * (type === 'bin' || type === 'bucket' ? 0.86 : 1), h, 18), 0, 0, 0);
    type === 'bin' && add(new Rw(r * 1.04, r * 1.04, 0.03, 18), 0, h / 2, 0, __phxPropMat({ color: '#2f3832' }));
  } else if (def.cone) {
    const [r, h] = def.cone;
    add(new Rw(0.015, r, h - 0.03, 16), 0, 0.015, 0);
    add(new _i(r * 2.3, 0.03, r * 2.3), 0, -h / 2 + 0.015, 0, __phxPropMat({ color: '#1f1f1f' }));
    add(new Rw(r * 0.55, r * 0.72, 0.07, 16), 0, 0.03, 0, __phxPropMat({ color: '#f2f2f2' }));
  } else if (def.ball) add(new bi(def.ball, 20, 14), 0, 0, 0);
  g.name = 'prop-' + type;
  return g;
}
function __phxPropBody(def, x, y, z, rotY, vel) {
  const P = __PHX,
    R = P.R;
  const q = { x: 0, y: Math.sin(rotY / 2), z: 0, w: Math.cos(rotY / 2) };
  const body = P.world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setRotation(q)
      .setLinearDamping(def.damp ?? 0.1)
      .setAngularDamping(def.damp ?? 0.4)
      .setCcdEnabled(def.mass < 1),
  );
  const cd = (desc, tx = 0, ty = 0, tz = 0, part = 1) =>
    P.world.createCollider(
      desc
        .setTranslation(tx, ty, tz)
        .setMass(def.mass * part)
        .setFriction(def.fr)
        .setRestitution(def.re)
        .setCollisionGroups(def.debris ? __CF.debris : __CF.prop),
      body,
    );
  let col;
  if (def.chair) {
    const [w, h, d] = def.box;
    col = cd(R.ColliderDesc.cuboid(w / 2, 0.24, d / 2), 0, -h / 2 + 0.24, 0, 0.7);
    cd(R.ColliderDesc.cuboid(w / 2, 0.19, 0.03), 0, -h / 2 + 0.66, -d / 2 + 0.03, 0.3);
  } else if (def.box) col = cd(R.ColliderDesc.cuboid(def.box[0] / 2, def.box[1] / 2, def.box[2] / 2));
  else if (def.cyl) col = cd(R.ColliderDesc.cylinder(def.cyl[1] / 2, def.cyl[0]));
  else if (def.cone) col = cd(R.ColliderDesc.cone(def.cone[1] / 2, def.cone[0]));
  else col = cd(R.ColliderDesc.ball(def.ball));
  vel && body.setLinvel(vel, !0);
  return { body, col };
}
function __phxTag(body, rec) {
  for (let i = 0; i < body.numColliders(); i++) __PHX.propOf.set(body.collider(i).handle, rec);
}
function __phxUntag(body) {
  for (let i = 0; i < body.numColliders(); i++) __PHX.propOf.delete(body.collider(i).handle);
}
function __phxPropHalfY(def) {
  return def.box ? def.box[1] / 2 : def.cyl ? def.cyl[1] / 2 : def.cone ? def.cone[1] / 2 : def.ball || 0.1;
}
function __phxPropsBuild(m) {
  const P = __PHX;
  P.props = [];
  for (const s of m.physProps || []) {
    const def = __PROPS[s.type];
    if (!def) continue;
    const { body, col } = __phxPropBody(def, s.x, (s.y || 0) + __phxPropHalfY(def) + 0.005, s.z, s.rotY || 0);
    const rec = { spec: s, def, type: s.type, body, col, hp: def.hp || 0, mesh: null, p0: null, p1: null, q0: null, q1: null };
    __phxTag(body, rec);
    __phxPropSnap(rec);
    P.props.push(rec);
  }
}
function __phxPropSnap(rec) {
  const t = rec.body.translation(),
    r = rec.body.rotation();
  rec.p1 = { x: t.x, y: t.y, z: t.z };
  rec.q1 = new Kw(r.x, r.y, r.z, r.w);
  rec.p0 = { ...rec.p1 };
  rec.q0 = rec.q1.clone();
}
function __phxPropsAfterStep() {
  const P = __PHX;
  for (const list of [P.props, P.debris])
    for (const rec of list) {
      if (!rec.body) continue;
      if (rec.body.isSleeping()) {
        rec.p0 = rec.p1;
        rec.q0 = rec.q1;
        continue;
      }
      const t = rec.body.translation(),
        r = rec.body.rotation();
      rec.p0 = rec.p1;
      rec.q0 = rec.q1;
      rec.p1 = { x: t.x, y: t.y, z: t.z };
      rec.q1 = new Kw(r.x, r.y, r.z, r.w);
      // fell out of the world (pushed through a gap by an explosion): put it back where it started
      t.y < -10 && rec.spec && (rec.body.setTranslation({ x: rec.spec.x, y: (rec.spec.y || 0) + 0.5, z: rec.spec.z }, !0), rec.body.setLinvel({ x: 0, y: 0, z: 0 }, !0));
    }
}
function __phxBreak(rec, d) {
  const P = __PHX;
  if (!rec.body) return;
  const t = rec.body.translation(),
    v = rec.body.linvel();
  __phxUntag(rec.body);
  P.world.removeRigidBody(rec.body);
  rec.body = null;
  __phxDrawHide(rec);
  __phxEmit([{ type: 'impact', pos: { x: t.x, y: t.y, z: t.z }, normal: { x: -d.x, y: 0.5, z: -d.z }, flesh: !1, mat: 'wood', noHole: !0, __phx: 1 }]);
  if (!rec.def.planks) return;
  const def = { ...__PROPS.plank, debris: !0 };
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2,
      o = { x: t.x + Math.cos(a) * 0.2, y: t.y + (i % 3) * 0.15 - 0.1, z: t.z + Math.sin(a) * 0.2 };
    const s = 2.5 + Math.random() * 2;
    const { body, col } = __phxPropBody(def, o.x, o.y, o.z, a, {
      x: v.x + Math.cos(a) * s + d.x * 2,
      y: v.y + 1.5 + Math.random() * 2,
      z: v.z + Math.sin(a) * s + d.z * 2,
    });
    body.setAngvel({ x: (Math.random() - 0.5) * 14, y: (Math.random() - 0.5) * 14, z: (Math.random() - 0.5) * 14 }, !0);
    const drec = { def, type: 'plank', body, col, mesh: null, until: performance.now() / 1e3 + 9 + Math.random() * 3 };
    __phxTag(body, drec);
    __phxPropSnap(drec);
    P.debris.push(drec);
  }
}
function __phxPropsDispose() {
  const P = __PHX;
  __phxDrawDispose();
  P.props = [];
  P.debris = [];
}
// every round: props go back where the map put them, debris is cleared
function __phxPropsReset() {
  const P = __PHX;
  if (!__phxOn()) return;
  for (const rec of P.debris) {
    rec.body && (__phxUntag(rec.body), P.world.removeRigidBody(rec.body));
    __phxDrawFree(rec);
  }
  P.debris = [];
  for (const rec of P.props) {
    if (!rec.body) {
      const { body, col } = __phxPropBody(rec.def, rec.spec.x, 0, rec.spec.z, 0);
      rec.body = body;
      rec.col = col;
      __phxTag(body, rec);
    }
    const s = rec.spec,
      ry = s.rotY || 0;
    rec.body.setTranslation({ x: s.x, y: (s.y || 0) + __phxPropHalfY(rec.def) + 0.005, z: s.z }, !1);
    rec.body.setRotation({ x: 0, y: Math.sin(ry / 2), z: 0, w: Math.cos(ry / 2) }, !1);
    rec.body.setLinvel({ x: 0, y: 0, z: 0 }, !1);
    rec.body.setAngvel({ x: 0, y: 0, z: 0 }, !1);
    rec.body.sleep();
    rec.hp = rec.def.hp || 0;
    rec.drawn = !1;
    __phxPropSnap(rec);
  }
}
{
  const coreReset = Ph;
  Ph = function (m) {
    coreReset(m);
    try {
      __phxPropsReset();
    } catch (e) {}
  };
}
// ---- drawing: one merged, vertex-coloured mesh per prop type, drawn as one InstancedMesh per type
// (a map's 70 props cost ~13 draw calls instead of ~200). Instances are interpolated between the last two
// physics states every frame, so motion is smooth at any refresh rate.
const __PD = { group: null, pools: new Map(), geo: new Map() },
  __pm = new _A(),
  __pq = new Kw(),
  __pv = new U(),
  __ps = new U(1, 1, 1),
  __pzero = new _A().makeScale(0, 0, 0);
function __phxPropGeo(type, def) {
  let e = __PD.geo.get(type);
  if (e) return e;
  const g = __phxPropMesh(type, def),
    parts = [];
  g.updateMatrixWorld(!0);
  g.traverse((o) => {
    if (!o.isMesh) return;
    const geo = (o.geometry.index ? o.geometry : o.geometry).clone().applyMatrix4(o.matrixWorld),
      n = geo.attributes.position.count,
      c = new Float32Array(n * 3),
      col = o.material.color;
    for (let i = 0; i < n; i++) (c[i * 3] = col.r), (c[i * 3 + 1] = col.g), (c[i * 3 + 2] = col.b);
    geo.setAttribute('color', new gi(c, 3));
    for (const k of Object.keys(geo.attributes)) /^(position|normal|uv|color)$/.test(k) || geo.deleteAttribute(k);
    parts.push(geo);
  });
  const merged = Xn(parts.map((x) => (x.index ? x : x.toNonIndexed()))) || parts[0];
  e = { geo: merged, mat: new Gw({ vertexColors: !0, roughness: def.metal ? 0.45 : 0.82, metalness: def.metal || 0 }) };
  __PD.geo.set(type, e);
  return e;
}
function __phxDrawPool(type, def) {
  let pool = __PD.pools.get(type);
  if (pool) return pool;
  if (!__fx.ready) return null;
  if (!__PD.group) {
    __PD.group = new ji();
    __PD.group.name = 'bp-props';
    __fx.g.add(__PD.group);
  }
  const P = __PHX,
    cap = type === 'plank' ? 72 : P.props.filter((r) => r.type === type).length + 2,
    { geo, mat } = __phxPropGeo(type, def),
    im = new QZ(geo, mat, cap);
  im.castShadow = im.receiveShadow = !0;
  im.frustumCulled = !1;
  for (let i = 0; i < cap; i++) im.setMatrixAt(i, __pzero);
  __PD.group.add(im);
  pool = { im, free: [...Array(cap).keys()].reverse(), dirty: !0 };
  __PD.pools.set(type, pool);
  return pool;
}
function __phxDrawHide(rec) {
  const pool = rec.slot !== void 0 && __PD.pools.get(rec.type);
  pool && (pool.im.setMatrixAt(rec.slot, __pzero), (pool.dirty = !0));
}
function __phxDrawFree(rec) {
  const pool = rec.slot !== void 0 && __PD.pools.get(rec.type);
  if (!pool) return;
  pool.im.setMatrixAt(rec.slot, __pzero);
  pool.free.push(rec.slot);
  pool.dirty = !0;
  rec.slot = void 0;
}
function __phxDrawDispose() {
  if (__PD.group) {
    __PD.group.removeFromParent();
    for (const p of __PD.pools.values()) p.im.dispose();
  }
  __PD.group = null;
  __PD.pools.clear();
}
function __phxRender() {
  const P = __PHX;
  if (!__phxOn() || !__fx.ready) return;
  // the effects group is rebuilt with the scene: re-attach the prop layer if it was detached
  __PD.group && __PD.group.parent !== __fx.g && (__fx.g.add(__PD.group));
  const a = P.alpha,
    now = performance.now() / 1e3;
  for (const list of [P.props, P.debris])
    for (const rec of list) {
      const pool = __phxDrawPool(rec.type, rec.def);
      if (!pool) return;
      if (rec.slot === void 0) {
        if (!pool.free.length) continue;
        rec.slot = pool.free.pop();
        rec.drawn = !1;
      }
      if (!rec.body) continue;
      // a sleeping prop does not move: draw it once more at rest, then skip it until it wakes
      const asleep = rec.body.isSleeping();
      if (asleep && rec.drawn === 'rest') continue;
      __pv.set(rec.p0.x + (rec.p1.x - rec.p0.x) * a, rec.p0.y + (rec.p1.y - rec.p0.y) * a, rec.p0.z + (rec.p1.z - rec.p0.z) * a);
      __pq.copy(rec.q0).slerp(rec.q1, a);
      pool.im.setMatrixAt(rec.slot, __pm.compose(__pv, __pq, __ps));
      pool.dirty = !0;
      rec.drawn = asleep ? 'rest' : !0;
    }
  for (const p of __PD.pools.values()) p.dirty && ((p.im.instanceMatrix.needsUpdate = !0), (p.dirty = !1));
  // debris disappears after a while
  for (let i = P.debris.length - 1; i >= 0; i--) {
    const rec = P.debris[i];
    if (now < rec.until) continue;
    rec.body && (__phxUntag(rec.body), P.world.removeRigidBody(rec.body));
    __phxDrawFree(rec);
    P.debris.splice(i, 1);
  }
}
{
  const coreFx = __fxTick;
  __fxTick = function (dt) {
    coreFx(dt);
    try {
      __phxRender();
    } catch (e) {}
  };
}

// ---------------------------------------------------------------- RagdollController
// Builds an articulated ragdoll: one capsule rigid body per bone segment, joined with spherical joints at the
// shared end points. Input: [{ name, a:{x,y,z}, b:{x,y,z}, r, parent }] in world space (a = joint end,
// b = child end); parent is the index of the parent segment or -1. Bodies collide with the world and props,
// not with each other. Returns { parts, read(i) -> {p, q}, push(i, impulse), dispose() }.
function __phxRagdoll(segments, initialVel) {
  const P = __PHX,
    R = P.R;
  if (!__phxOn()) return null;
  const parts = segments.map((s) => {
    const mx = (s.a.x + s.b.x) / 2,
      my = (s.a.y + s.b.y) / 2,
      mz = (s.a.z + s.b.z) / 2,
      dir = new U(s.b.x - s.a.x, s.b.y - s.a.y, s.b.z - s.a.z),
      len = dir.length();
    const q = new Kw().setFromUnitVectors(new U(0, 1, 0), dir.normalize());
    const body = P.world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(mx, my, mz)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setLinearDamping(0.3)
        .setAngularDamping(2)
        .setLinvel((initialVel && initialVel.x) || 0, (initialVel && initialVel.y) || 0, (initialVel && initialVel.z) || 0),
    );
    P.world.createCollider(
      R.ColliderDesc.capsule(Math.max(0.01, len / 2 - s.r), s.r)
        .setDensity(985)
        .setFriction(0.9)
        .setCollisionGroups(__CF.debris),
      body,
    );
    return { name: s.name, body, half: len / 2, seg: s };
  });
  const joints = [];
  segments.forEach((s, i) => {
    if (s.parent < 0) return;
    const pa = parts[s.parent],
      ch = parts[i];
    // anchor = this segment's joint end (a), expressed in both bodies' local frames
    const toLocal = (part, p) => {
      const t = part.body.translation(),
        r = part.body.rotation(),
        v = new U(p.x - t.x, p.y - t.y, p.z - t.z).applyQuaternion(new Kw(r.x, r.y, r.z, r.w).invert());
      return { x: v.x, y: v.y, z: v.z };
    };
    joints.push(P.world.createImpulseJoint(R.JointData.spherical(toLocal(pa, s.a), toLocal(ch, s.a)), pa.body, ch.body, !0));
  });
  const rd = {
    parts,
    read(i) {
      const b = parts[i].body,
        t = b.translation(),
        r = b.rotation();
      return { p: { x: t.x, y: t.y, z: t.z }, q: { x: r.x, y: r.y, z: r.z, w: r.w } };
    },
    push(i, J) {
      parts[i].body.applyImpulse(J, !0);
    },
    dispose() {
      if (!P.world) return;
      for (const j of joints) P.world.removeImpulseJoint(j, !1);
      for (const p of parts) P.world.removeRigidBody(p.body);
      P.ragdolls.delete(rd);
    },
  };
  P.ragdolls.add(rd);
  return rd;
}

// ---------------------------------------------------------------- integration
{
  const coreSimStep = U1;
  U1 = function (w, A, i) {
    try {
      __phxAdvance(w, A);
    } catch (e) {
      console.warn('[physics] step', e);
    }
    return coreSimStep(w, A, i);
  };
}
// debug / test hooks
typeof window < 'u' &&
  (window.__phx = {
    get ready() {
      return __phxOn();
    },
    // A/B switch for testing: true = the game's original box solver
    set off(v) {
      __PHX.off = !!v;
    },
    dbg(on) {
      const d = __PHX.dbg;
      __PHX.dbg = on ? [] : null;
      return d;
    },
    stats: () => ({ ...__PHX.stats, props: __PHX.props.length, debris: __PHX.debris.length, nades: __PHX.nades.size, chars: __PHX.chars.size, colliders: __PHX.world ? __PHX.world.colliders.len() : 0, bodies: __PHX.world ? __PHX.world.bodies.len() : 0 }),
    // compare Rapier hitscan with the original grid ray cast on random rays through the current map
    compareRays(n = 500) {
      if (!__phxOn()) return null;
      const m = aw(),
        grid = Ge(m.boxes);
      let same = 0,
        diff = [];
      for (let k = 0; k < n; k++) {
        const o = { x: Math.random() * m.w, y: 0.2 + Math.random() * 6, z: Math.random() * m.d },
          a = Math.random() * 6.283,
          e = (Math.random() - 0.3) * 1.2,
          d = { x: Math.cos(a) * Math.cos(e), y: Math.sin(e), z: Math.sin(a) * Math.cos(e) },
          pred = (b) => b.solid;
        const g = grid.raycast(o, d, 80, pred),
          r = __phxRayBoxes(o, d, 80, pred);
        const ok = (!g && !r) || (g && r && Math.abs(g.t - r.t) < 0.01 && g.box === r.box);
        ok ? same++ : diff.length < 5 && diff.push({ o, d, g: g && [g.t, g.box.kind], r: r && [r.t, r.box.kind] });
      }
      return { same, n, diff };
    },
    props: () => __PHX.props.map((r) => ({ type: r.type, alive: !!r.body, p: r.p1 })),
    blast: (pos, big) => __phxBlastProps(pos, big),
    ragdollTest() {
      const p = eA.human();
      if (!p || !__phxOn()) return null;
      const x = p.pos.x,
        z = p.pos.z - 2,
        y = 2.5;
      const v = (a, b, c) => ({ x: x + a, y: y + b, z: z + c });
      return __phxRagdoll([
        { name: 'pelvis', a: v(0, 0, 0), b: v(0, 0.25, 0), r: 0.13, parent: -1 },
        { name: 'chest', a: v(0, 0.25, 0), b: v(0, 0.6, 0), r: 0.15, parent: 0 },
        { name: 'head', a: v(0, 0.6, 0), b: v(0, 0.85, 0), r: 0.11, parent: 1 },
        { name: 'thighL', a: v(-0.1, 0, 0), b: v(-0.1, -0.45, 0), r: 0.07, parent: 0 },
        { name: 'thighR', a: v(0.1, 0, 0), b: v(0.1, -0.45, 0), r: 0.07, parent: 0 },
        { name: 'armL', a: v(-0.2, 0.55, 0), b: v(-0.5, 0.55, 0), r: 0.05, parent: 1 },
        { name: 'armR', a: v(0.2, 0.55, 0), b: v(0.5, 0.55, 0), r: 0.05, parent: 1 },
      ]);
    },
  });
typeof window < 'u' &&
  (window.__phx.propAt = (i) => {
    const r = __PHX.props[i];
    return r && { type: r.type, alive: !!r.body, p: r.body ? { ...r.body.translation() } : null, asleep: r.body ? r.body.isSleeping() : null };
  });
