/* ===== Bayou Protocol mod: foot-planted locomotion for every character ===== */
// Why characters slid: the core picked idle/walk/run from the stored velocity and played one forward walk
// clip whatever the direction, so strafing and backpedalling (about 40% of bot movement in a fight)
// skated the feet. Bots whose stored velocity lagged their real movement also glided in the idle pose.
//
// Now:
//  - speed comes from how far the rendered body actually moved (smoothed), not from the stored velocity
//  - legs are driven by two-bone IK with planted feet: each foot stays locked to the ground during stance
//    and swings to a landing point predicted along the real direction of travel, so walking, running,
//    strafing, backpedalling and crouch-walking all step correctly with no sliding
//  - standing still, the body turns by stepping its feet when the planted stance gets twisted
//  - feet follow the floor height (stairs, ramps), soles stay level, toes lift in the swing
//  - fingers curl around the weapon (trigger finger ready, support hand wrapped on the handguard)
// Hooks in the core character component (qAA): __locoSpeed replaces the velocity read, __locoAfter runs
// after the weapon IK each frame.
const __LOCO = new Map();
const __lv = () => new U();
function __locoState(v) {
  let st = __LOCO.get(v.id);
  if (!st) {
    st = {
      last: null,
      vel: __lv(),
      speed: 0,
      phase: 0,
      feet: [
        { plant: null, from: __lv(), to: __lv(), swing: !1, t: 0, yaw: 0 },
        { plant: null, from: __lv(), to: __lv(), swing: !1, t: 0, yaw: 0 },
      ],
      idleStep: 0,
    };
    __LOCO.set(v.id, st);
  }
  return st;
}
function __locoSpeed(v, K, dt) {
  const st = __locoState(v),
    p = v.pos;
  if (!st.last || !v.alive) {
    st.last = { x: p.x, z: p.z };
    st.vel.set(0, 0, 0);
    st.speed = 0;
    return 0;
  }
  const d = Math.max(1e-3, dt),
    vx = (p.x - st.last.x) / d,
    vz = (p.z - st.last.z) / d;
  st.last = { x: p.x, z: p.z };
  // teleports (respawn, round reset) reset the gait instead of producing a huge speed
  if (Math.hypot(vx, vz) > 14) {
    st.vel.set(0, 0, 0);
    st.feet.forEach((f) => (f.plant = null));
    return (st.speed = 0);
  }
  const k = 1 - Math.exp(-d * 10);
  st.vel.x += (vx - st.vel.x) * k;
  st.vel.z += (vz - st.vel.z) * k;
  st.speed = Math.hypot(st.vel.x, st.vel.z);
  return st.speed;
}
const __lt = { a: __lv(), b: __lv(), c: __lv(), f: __lv(), r: __lv(), up: new U(0, 1, 0) };
function __locoFloor(x, y, z) {
  try {
    const h = rm({ x, y: y + 0.6, z });
    return Number.isFinite(h) && Math.abs(h - y) < 0.9 ? h : y;
  } catch {
    return y;
  }
}
const __gripFor = (w) =>
  w === 'knife' || w === 'grenade'
    ? { right: { fist: 1.35, index: 1.25, thumb: 0.7 }, left: { fist: 0.55, index: 0.45, thumb: 0.3 } }
    : w === 'pistol' || w === 'deagle' || w === 'warden'
      ? { right: { fist: 1.3, index: 0.3, thumb: 0.65 }, left: { fist: 1.15, index: 1.05, thumb: 0.55 } }
      : { right: { fist: 1.3, index: 0.28, thumb: 0.6 }, left: { fist: 1.05, index: 0.95, thumb: 0.75 } };
function __locoAfter(s, v, K, dt, speed) {
  if (!v.alive || !K) return;
  const st = __locoState(v),
    sides = ['L', 'R'],
    b = (n) => fe(s, n);
  const thigh = [b('UpperLeg.L'), b('UpperLeg.R')],
    calf = [b('LowerLeg.L'), b('LowerLeg.R')],
    foot = [b('Foot.L'), b('Foot.R')];
  if (!thigh[0] || !thigh[1] || !calf[0] || !calf[1] || !foot[0] || !foot[1]) return;
  K.updateMatrixWorld(!0);
  // body frame: forward from the model, right from forward x up
  const fwd = GP(K).setY(0).normalize(),
    right = __lt.r.set(-fwd.z, 0, fwd.x),
    ground = v.pos.y,
    scale = K.scale.y * (s.scale ? s.scale.y : 1) || 1;
  const crouch = Math.max(0, Math.min(1, v.crouch || 0)),
    moving = speed > 0.3 && v.onGround !== !1,
    run = speed > 4.2,
    stride = Math.min(1.45, 0.42 + speed * (run ? 0.19 : 0.21)) * (1 - 0.35 * crouch),
    duty = run ? 0.38 : crouch > 0.5 ? 0.62 : 0.58,
    lift = (run ? 0.17 : 0.1) * (1 - 0.3 * crouch),
    ankleH = 0.1 * scale,
    halfW = 0.105 * scale,
    dir = speed > 0.05 ? __lt.f.set(st.vel.x / speed, 0, st.vel.z / speed) : __lt.f.copy(fwd);
  const rest = (i) => {
    const h = thigh[i].getWorldPosition(__lv());
    return __lv().set(h.x, ground, h.z).addScaledVector(right, (i ? 1 : -1) * 0.02 * scale);
  };
  // advance the gait by real distance travelled
  moving && (st.phase = (st.phase + (speed * dt) / (2 * stride)) % 1);
  const yawNow = Math.atan2(fwd.x, fwd.z);
  for (let i = 0; i < 2; i++) {
    const F = st.feet[i],
      r0 = rest(i);
    if (!F.plant) {
      F.plant = r0.clone();
      F.plant.y = __locoFloor(F.plant.x, ground, F.plant.z);
      F.yaw = yawNow;
    }
    let target;
    if (moving) {
      const ph = (st.phase + (i ? 0.5 : 0)) % 1;
      if (ph < duty) {
        // stance: locked to the ground
        if (F.swing) {
          F.swing = !1;
          F.plant.copy(F.to);
          F.yaw = yawNow;
        }
        target = F.plant.clone();
      } else {
        // swing: from lift-off to a landing point ahead along the direction of travel
        const t = (ph - duty) / (1 - duty);
        if (!F.swing) {
          F.swing = !0;
          F.from.copy(F.plant);
        }
        F.to.copy(r0).addScaledVector(dir, stride * 0.5 * duty * 1.15);
        F.to.y = __locoFloor(F.to.x, ground, F.to.z);
        const e = t * t * (3 - 2 * t);
        target = F.from.clone().lerp(F.to, e);
        target.y += Math.sin(t * Math.PI) * lift * scale;
      }
    } else {
      // standing: settle into a stance, step when the body has turned or drifted away from the feet
      if (F.swing) {
        F.t += dt / 0.22;
        const e = Math.min(1, F.t),
          k = e * e * (3 - 2 * e);
        target = F.from.clone().lerp(F.to, k);
        target.y += Math.sin(Math.min(1, F.t) * Math.PI) * 0.07 * scale;
        if (F.t >= 1) {
          F.swing = !1;
          F.plant.copy(F.to);
          F.yaw = yawNow;
        }
      } else {
        let dy = Math.abs(yawNow - F.yaw);
        dy = Math.min(dy, Math.PI * 2 - dy);
        const drift = Math.hypot(F.plant.x - r0.x, F.plant.z - r0.z);
        const other = st.feet[1 - i];
        if ((drift > 0.2 * scale || dy > 0.7) && !other.swing && st.idleStep <= 0) {
          F.swing = !0;
          F.t = 0;
          F.from.copy(F.plant);
          F.to.copy(r0);
          F.to.y = __locoFloor(F.to.x, ground, F.to.z);
          st.idleStep = 0.12;
        }
        target = F.plant.clone();
      }
    }
    // knee points forward and slightly out; foot target is the ankle, above the contact point
    target.y += ankleH;
    const pole = fwd.clone().multiplyScalar(1).addScaledVector(right, (i ? 1 : -1) * 0.15).add(__lt.up.clone().multiplyScalar(0.05));
    ZP(thigh[i], calf[i], foot[i], target, pole);
    // level the sole: point the foot along the body/travel direction, toe up/down in the swing
    const toeB = fe(s, i ? 'Foot.R' : 'Foot.L');
    if (toeB && toeB.children.length) {
      const fp = foot[i].getWorldPosition(__lt.a),
        tc = toeB.children.find((c) => c.isBone) || toeB.children[0];
      const tp = tc.getWorldPosition(__lt.b),
        cur = tp.sub(fp),
        want = (moving ? dir.clone().lerp(fwd, 0.5) : fwd.clone()).normalize();
      let pitch = 0;
      if (moving && F.swing) {
        const ph = ((st.phase + (i ? 0.5 : 0)) % 1 - duty) / (1 - duty);
        pitch = ph < 0.35 ? -0.35 * (1 - ph / 0.35) : 0.25 * Math.sin(((ph - 0.35) / 0.65) * Math.PI);
      }
      // the foot->toe bone points ~36 degrees down when the sole is flat
      want.multiplyScalar(0.8);
      want.y = -0.6 + pitch;
      HY(foot[i], cur, want.normalize());
    }
  }
  st.idleStep -= dt;
  // fingers wrap the weapon
  const fr = s.userData && s.userData.fingers;
  if (fr && fr.length) {
    const w = (v.weapons[v.active] && v.weapons[v.active].id) || 'knife';
    __cbCurl(fr, __gripFor(w));
  }
}
// drop state for players who leave
setInterval(() => {
  const S = eA.state;
  if (!S) return __LOCO.clear();
  for (const id of __LOCO.keys()) S.players.some((p) => p.id === id) || __LOCO.delete(id);
}, 5000);
