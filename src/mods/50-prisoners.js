/* ===== Bayou Protocol mod: prisoners (Blackwater Penitentiary) ===== */
// Inmates in the A Block cells and the dayroom of Blackwater Penitentiary. They are scenery, not players:
// no colliders, no team, no scoreboard, and bots ignore them.
//   - in the shut cells: an inmate paces between the bars and the back wall. At the bars he grips them and
//     shakes his head; at the back he puts his hands on his head and looks at the floor; sometimes he stands
//     with his arms crossed. Upper tier cells too.
//   - in the dayroom: a few walk a lap round the tables and the control picket, stopping now and then
//   - shoot one and he drops (Dying clip, or a fall for the model without one) with a blood hit; they are
//     back the next round
// Model: the Mixamo Ch08 (shared clips; the non-Mixamo "Prisoner 3" was retired, its Character Creator rig
// table below is kept for reference). The shared clips hold a rifle, so the
// arms are posed on top of them every frame: each arm bone is turned so it points along a direction given in
// the body's own frame (down at the sides, forward to the bars, up behind the head, folded), blended with
// the clip so the switch is smooth. Animation runs at full rate within 30 m, every third frame to 60 m, not
// at all beyond.
const __PRS = {
  models: {
    mx: { url: './game/characters/prisoners/Ch08_nonPBR.glb', g: null },
  },
  anims: null,
  loading: !1,
  rev: 0,
  subs: new Set(),
  last: null,
};
const __PRS_POSE = {
  // left side (+X is the body's left, +Z its front); the right side mirrors x. up = upper arm, lo = forearm
  down: { up: [0.2, -1, 0.04], lo: [0.1, -1, 0.28] },
  bars: { up: [0.32, -0.3, 1], lo: [-0.12, 0.28, 1] },
  head: { up: [1, 0.7, -0.3], lo: [-0.9, 0.55, -0.5] },
  cross: { up: [0.32, -1, 0.42], lo: [-1, 0.12, 0.3] },
};
function __prsLoad() {
  if (__PRS.loading || typeof window > 'u') return;
  __PRS.loading = !0;
  const done = () => {
    __PRS.rev++;
    for (const f of __PRS.subs) f(__PRS.rev);
  };
  for (const [k, m] of Object.entries(__PRS.models))
    __glbParse(
      m.url,
      (g) => {
        m.g = g;
        __PRS.anims || k !== 'mx' ? done() : 0;
      },
      (e) => console.warn('[prisoners] load ' + k, e),
    );
  __glbParse(
    __CHAR.anims,
    (a) => {
      __PRS.anims = a;
      done();
    },
    (e) => console.warn('[prisoners] clips', e),
  );
}
const __prsRig = {
  mx: { arm: ['mixamorigLeftArm', 'mixamorigRightArm'], fore: ['mixamorigLeftForeArm', 'mixamorigRightForeArm'], hand: ['mixamorigLeftHand', 'mixamorigRightHand'], head: 'mixamorigHead', legs: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg'] },
  cc: { arm: [/^CC_Base_L_Upperarm(_\d+)?$/, /^CC_Base_R_Upperarm(_\d+)?$/], fore: [/^CC_Base_L_Forearm(_\d+)?$/, /^CC_Base_R_Forearm(_\d+)?$/], hand: [/^CC_Base_L_Hand(_\d+)?$/, /^CC_Base_R_Hand(_\d+)?$/], head: /^CC_Base_Head(_\d+)?$/, legs: [/^CC_Base_L_Thigh(_\d+)?$/, /^CC_Base_R_Thigh(_\d+)?$/] },
};
function __prsFind(root, n) {
  if (typeof n === 'string') return root.getObjectByName(n);
  let r = null;
  root.traverse((o) => !r && o.isBone && n.test(o.name) && (r = o));
  return r;
}
// one inmate: holder (position, heading: +Z is his front) > inner (model turned to face +Z, scaled) > clone
function __prsMake(kind, seed) {
  const M = __PRS.models[kind],
    holder = new ji(),
    inner = new ji(),
    root = b$(M.g.scene);
  inner.add(root);
  holder.add(inner);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = !0;
    o.frustumCulled = !0;
    o.geometry.boundingSphere || o.geometry.computeBoundingSphere();
    o.geometry.boundingSphere && !o.geometry.__padded && ((o.geometry.boundingSphere.radius *= 1.8), (o.geometry.__padded = 1));
    for (const m of [].concat(o.material)) m && ('metalness' in m && (m.metalness = Math.min(m.metalness, 0.1)), 'roughness' in m && (m.roughness = Math.max(m.roughness, 0.6)), (m.envMapIntensity = 0.7));
  });
  const R = __prsRig[kind],
    B = {
      arm: R.arm.map((n) => __prsFind(root, n)),
      fore: R.fore.map((n) => __prsFind(root, n)),
      hand: R.hand.map((n) => __prsFind(root, n)),
      head: __prsFind(root, R.head),
      legs: R.legs.map((n) => __prsFind(root, n)),
    };
  // face +Z: the side axis runs from the right hip to the left; front = side x up
  holder.updateMatrixWorld(!0);
  if (B.legs[0] && B.legs[1]) {
    const s = B.legs[0].getWorldPosition(new U()).sub(B.legs[1].getWorldPosition(new U())),
      f = new U().crossVectors(s, new U(0, 1, 0));
    inner.rotation.y = -Math.atan2(f.x, f.z);
  }
  holder.updateMatrixWorld(!0);
  // standing height 1.72 to 1.86 m, feet on the floor
  const bb = new xi().setFromObject(root),
    h = bb.max.y - bb.min.y || 1,
    k = (1.72 + 0.14 * seed) / h;
  inner.scale.setScalar(k);
  inner.position.y = -bb.min.y * k;
  holder.updateMatrixWorld(!0);
  // each arm bone's rest direction (towards its child) and rest rotation, in the holder's frame
  const hqi = holder.getWorldQuaternion(new Kw()).invert(),
    rest = new Map();
  for (const side of [0, 1])
    for (const [b, c] of [
      [B.arm[side], B.fore[side]],
      [B.fore[side], B.hand[side]],
    ]) {
      if (!b || !c) continue;
      const d = c.getWorldPosition(new U()).sub(b.getWorldPosition(new U())).applyQuaternion(hqi).normalize();
      rest.set(b, { d, q: hqi.clone().multiply(b.getWorldQuaternion(new Kw())) });
    }
  // clips
  const mixer = new TZ(root),
    acts = {};
  if (kind === 'mx') {
    const a = __PRS.anims,
      mh = root.getObjectByName('mixamorigHips'),
      ah = a.scene.getObjectByName('mixamorigHips'),
      f = mh && ah && Math.abs(ah.position.y) > 1e-6 ? mh.position.y / ah.position.y : 1,
      clips = __charClips(a, f, M.url),
      get = (n) => clips.find((c) => c.name === n);
    for (const [k2, n] of [
      ['walk', 'RifleWalk'],
      ['idle', 'RifleIdle'],
      ['die', 'Dying'],
    ])
      get(n) && (acts[k2] = mixer.clipAction(get(n)));
    acts.walkSpeed = 1.45;
  } else {
    // the model's one clip is a walk on the spot: drop the root's slow drift, and use its first frame to stand
    const src = M.g.animations[0];
    if (src) {
      if (!M.walk) {
        M.walk = src.clone();
        for (const t of M.walk.tracks)
          if (/BoneRoot[^.]*\.position$/.test(t.name)) {
            const v = t.values;
            for (let i = 3; i < v.length; i += 3) (v[i] = v[0]), (v[i + 2] = v[2]);
          }
        M.stand = __rigClip({ animations: [M.walk] }, ['', 0, 0.04]);
      }
      acts.walk = mixer.clipAction(M.walk);
      M.stand && (acts.idle = mixer.clipAction(M.stand));
    }
    acts.walkSpeed = 1.3;
  }
  return { holder, root, mixer, acts, B, rest, kind, cur: null, pose: 'down', poseW: kind === 'mx' ? 1 : 0, poseTo: 'down', shake: 0, look: 0 };
}
function __prsPlay(n, k, fade = 0.35, ts = 1) {
  const a = n.acts[k];
  if (!a) return;
  a.timeScale = ts;
  if (n.cur === k) return;
  a.reset().play();
  k === 'die' && ((a.loop = 2200), (a.clampWhenFinished = !0));
  const prev = n.cur && n.acts[n.cur];
  prev && prev.crossFadeTo(a, fade, !1);
  n.cur = k;
}
// arms pointed along the pose's directions (blended with the clip by poseW), head shake and look down
const __prsT = { q: new Kw(), q2: new Kw(), q3: new Kw(), hq: new Kw(), hqi: new Kw(), v: new U(), up: new U(0, 1, 0), x: new U(1, 0, 0) };
function __prsArms(n, t) {
  const T = __prsT;
  n.holder.updateMatrixWorld(!0);
  n.holder.getWorldQuaternion(T.hq);
  T.hqi.copy(T.hq).invert();
  const P = __PRS_POSE[n.pose] || __PRS_POSE.down,
    w = n.poseW;
  if (w > 0.01)
    for (const side of [0, 1])
      for (const [b, key] of [
        [n.B.arm[side], 'up'],
        [n.B.fore[side], 'lo'],
      ]) {
        const r = b && n.rest.get(b);
        if (!r) continue;
        const d = P[key],
          sw = n.pose === 'down' ? n.swing * (side ? -1 : 1) * (key === 'up' ? 0.32 : 0.18) : 0;
        T.v.set(side ? -d[0] : d[0], d[1], d[2] + sw).normalize();
        // target, in the holder frame; the clip's current rotation, in the holder frame; blend; back to local
        T.q.setFromUnitVectors(r.d, T.v).multiply(r.q);
        b.getWorldQuaternion(T.q2);
        T.q3.copy(T.hqi).multiply(T.q2).slerp(T.q, w);
        b.parent.getWorldQuaternion(T.q2);
        b.quaternion.copy(T.q2.invert().multiply(T.hq).multiply(T.q3));
        b.updateMatrixWorld(!0);
      }
  const H = n.B.head;
  if (H && (Math.abs(n.shake) > 0.002 || Math.abs(n.look) > 0.002)) {
    H.getWorldQuaternion(T.q2);
    T.q.setFromAxisAngle(T.up, n.shake).multiply(T.q3.setFromAxisAngle(T.v.copy(T.x).applyQuaternion(T.hq), n.look));
    H.parent.getWorldQuaternion(T.q3);
    H.quaternion.copy(T.q3.invert().multiply(T.q).multiply(T.q2));
    H.updateMatrixWorld(!0);
  }
}
// ---------------------------------------------------------------- where they are (A Block, 35-prison.js)
function __prsPlan(m) {
  const out = [],
    h = (a, b, c = 0) => {
      const v = Math.sin(a * 12.9898 + b * 78.233 + c * 4.1) * 43758.5453;
      return v - Math.floor(v);
    };
  // cells: 13 a side a tier, 2.8 m wide from z 29.6; west cells x 4.4 (back) to 7.6 (bars), east 35.6 to 32.4
  const cz0 = 29.6,
    cw = 2.8;
  for (const side of ['W', 'E'])
    for (let tier = 0; tier < 2; tier++)
      for (let i = 0; i < 13; i++) {
        const open = (i * 7 + tier * 3 + (side === 'E' ? 5 : 0)) % 4 === 0 || i === 6;
        if (open || h(i, tier, side === 'E' ? 2 : 1) > 0.34) continue;
        const s = side === 'W' ? 1 : -1,
          back = side === 'W' ? 4.4 : 35.6,
          front = side === 'W' ? 7.6 : 32.4,
          zc = cz0 + i * cw + 1.62,
          y = tier * 3.2,
          out1 = s > 0 ? Math.PI / 2 : -Math.PI / 2;
        out.push({
          kind: 'mx',
          y,
          path: [
            { x: front - s * 0.42, z: zc, face: out1, poses: ['bars', 'bars', 'cross'], wait: [3, 8] },
            { x: back + s * 0.95, z: zc, face: out1 + Math.PI, poses: ['head', 'down', 'cross'], wait: [2, 6] },
          ],
          speed: 0.95 + 0.25 * h(i, tier, 3),
          seed: h(i, tier, 9),
        });
      }
  // the dayroom lap (clear of the tables, stairs, bins and the control picket)
  const lap = [
    { x: 11.0, z: 42.8 },
    { x: 11.0, z: 68.6 },
    { x: 28.0, z: 68.6 },
    { x: 28.0, z: 42.8 },
  ];
  for (let k = 0; k < 3; k++)
    out.push({
      kind: 'mx',
      y: 0,
      loop: !0,
      start: k,
      path: lap.map((p, j) => ({ ...p, poses: ['down', 'cross', 'head'], wait: j % 2 ? [0, 0] : [1.5, 4], chance: 0.5 })),
      speed: 1.05 + 0.1 * k,
      seed: 0.3 * k + 0.1,
    });
  return out;
}
function __prsBuild(m) {
  const g = new ji();
  g.name = 'bp-prisoners';
  const npcs = [];
  for (const p of __prsPlan(m)) {
    const kind = 'mx';
    if (!__PRS.models[kind].g || (kind === 'mx' && !__PRS.anims)) continue;
    const n = Object.assign(__prsMake(kind, p.seed), { plan: p, i: p.start || 0, state: 'idle', wait: 0.5 + p.seed * 3, yaw: 0, swing: 0, phase: p.seed * 6, alive: !0, fall: 0 });
    const s = p.path[n.i];
    n.holder.position.set(s.x, p.y, s.z);
    n.yaw = s.face ?? 0;
    n.holder.rotation.y = n.yaw;
    __prsPlay(n, 'idle', 0);
    n.acts.idle && (n.acts.idle.time = p.seed * 5);
    g.add(n.holder);
    npcs.push(n);
  }
  g.userData.npcs = npcs;
  __PRS.last = { map: m.id, npcs: npcs.length, kinds: npcs.map((n) => n.kind).join('') };
  return g;
}
function __prsTick(g, dt, cam, frame) {
  const npcs = g.userData.npcs || [],
    st = eA.state,
    round = st && st.round;
  if (round !== g.userData.round) {
    g.userData.round = round;
    for (const n of npcs) n.alive || __prsRevive(n);
  }
  for (const n of npcs) {
    const p = n.plan,
      pos = n.holder.position,
      dCam = cam ? cam.position.distanceTo(pos) : 0;
    if (!n.alive) {
      if (!n.acts.die && n.fall < 1) {
        n.fall = Math.min(1, n.fall + dt * 2.4);
        n.holder.rotation.x = -n.fall * n.fall * (Math.PI / 2) * 0.96;
        n.holder.updateMatrixWorld(!0);
      }
      dCam < 60 && n.mixer.update(dt);
      continue;
    }
    // behaviour: walk to the next point, wait there in a pose, go on
    const tgt = p.path[n.i];
    if (n.state === 'walk') {
      const dx = tgt.x - pos.x,
        dz = tgt.z - pos.z,
        d = Math.hypot(dx, dz);
      if (d < 0.06) {
        const [a, b] = tgt.wait || [2, 5],
          stop = !(tgt.chance !== void 0 && Math.random() > tgt.chance) && b > 0;
        if (stop) {
          n.state = 'idle';
          n.wait = a + Math.random() * (b - a);
          n.poseTo = tgt.poses[Math.floor(Math.random() * tgt.poses.length)];
          n.faceTo = tgt.face;
          n.shakeT = n.poseTo === 'bars' || Math.random() < 0.3 ? 0.4 + Math.random() * 1.5 : -1;
        }
        n.i = (n.i + 1) % p.path.length;
      } else {
        const want = Math.atan2(dx, dz);
        let dy = want - n.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        n.yaw += Math.sign(dy) * Math.min(Math.abs(dy), dt * 4.5);
        // turn first if facing well away, then walk
        const go = Math.abs(dy) < 0.9 ? p.speed : 0;
        go && (pos.x += (dx / d) * Math.min(d, go * dt), (pos.z += (dz / d) * Math.min(d, go * dt)));
        __prsPlay(n, go ? 'walk' : 'idle', 0.3, go ? go / n.acts.walkSpeed : 1);
        n.poseTo = 'down';
      }
    } else {
      n.wait -= dt;
      if (n.faceTo !== void 0) {
        let dy = n.faceTo - n.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        n.yaw += Math.sign(dy) * Math.min(Math.abs(dy), dt * 3);
      }
      __prsPlay(n, 'idle', 0.4);
      if (n.wait <= 0) (n.state = 'walk'), (n.poseTo = 'down');
    }
    n.holder.rotation.y = n.yaw;
    // pose blend: out of the old pose, into the new (Ch08 always has its arms posed: its clips hold a rifle)
    const base = n.kind === 'mx' ? 1 : 0;
    if (n.poseTo !== n.pose) {
      n.poseW = Math.max(n.kind === 'mx' ? 0.35 : 0, n.poseW - dt * 3);
      n.poseW <= (n.kind === 'mx' ? 0.36 : 0.01) && (n.pose = n.poseTo);
    } else n.poseW = Math.min(n.pose === 'down' ? base : 1, n.poseW + dt * 2.2);
    // head: a slow shake at the bars, eyes down with the hands on the head
    n.phase += dt;
    n.shakeT > 0 && n.state === 'idle' ? (n.shakeT -= dt) : (n.shakeT = n.state === 'idle' && Math.random() < dt * 0.15 ? 1.2 : n.shakeT);
    const shaking = n.state === 'idle' && n.shakeT > 0;
    n.shake += ((shaking ? Math.sin(n.phase * 6.5) * 0.38 : 0) - n.shake) * Math.min(1, dt * 8);
    n.look += ((n.pose === 'head' && n.state === 'idle' ? 0.42 : n.pose === 'bars' ? -0.05 : 0.08) - n.look) * Math.min(1, dt * 3);
    n.swing = n.state === 'walk' ? Math.sin(n.phase * 5.6 * (p.speed / 1.1)) : n.swing * 0.9;
    // animation: full rate up close, every third frame further out, none past 60 m
    if (dCam > 60) continue;
    if (dCam > 30 && (frame + n.plan.seed * 3) % 3 >= 1) continue;
    n.mixer.update(dCam > 30 ? dt * 3 : dt);
    __prsArms(n, dt);
  }
}
function __prsRevive(n) {
  n.alive = !0;
  n.fall = 0;
  n.holder.rotation.x = 0;
  const s = n.plan.path[0];
  n.holder.position.set(s.x, n.plan.y, s.z);
  n.i = 0;
  n.state = 'idle';
  n.wait = 1 + Math.random() * 3;
  n.acts.die && n.acts.die.stop();
  n.cur = null;
  __prsPlay(n, 'idle', 0);
}
// shots: a bullet's path through an inmate (a capsule) drops him
{
  const coreShot = __fxShot;
  __fxShot = function (g, j, Z, local) {
    coreShot.apply(this, arguments);
    try {
      const G = __PRS.group;
      if (!G || !G.parent || !j || !j.from || !j.to || j.weapon === 'grenade') return;
      const a = j.from,
        b = j.to,
        dx = b.x - a.x,
        dy = b.y - a.y,
        dz = b.z - a.z,
        L2 = dx * dx + dy * dy + dz * dz || 1;
      for (const n of G.userData.npcs || []) {
        if (!n.alive) continue;
        const p = n.holder.position;
        // closest approach of the shot to the body's vertical axis, between feet and head
        let best = 1 / 0,
          hit = null;
        for (let k = 0; k <= 8; k++) {
          const hy = p.y + 0.25 + (k / 8) * 1.45,
            t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (hy - a.y) * dy + (p.z - a.z) * dz) / L2)),
            qx = a.x + dx * t - p.x,
            qy = a.y + dy * t - hy,
            qz = a.z + dz * t - p.z,
            e = Math.hypot(qx, qz) + Math.abs(qy) * 0.5;
          e < best && ((best = e), (hit = { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t }));
        }
        if (best > 0.28) continue;
        n.alive = !1;
        n.fall = 0;
        __prsPlay(n, 'die', 0.12);
        const st = eA.state,
          l = Math.sqrt(L2);
        st && st.fx && st.fx.push({ type: 'impact', pos: hit, normal: { x: -dx / l, y: -dy / l, z: -dz / l }, flesh: !0 });
      }
    } catch (e) {}
  };
}
// ---------------------------------------------------------------- drawing (with the map's tree layer)
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw(),
      on = m.id === 'prison',
      [rev, setRev] = S.useState(__PRS.rev);
    S.useEffect(() => {
      __PRS.subs.add(setRev);
      on && __prsLoad();
      return () => __PRS.subs.delete(setRev);
    }, [on]);
    const group = S.useMemo(() => {
      if (!on || !__PRS.models.mx.g || !__PRS.anims) return null;
      try {
        return __prsBuild(m);
      } catch (e) {
        console.warn('[prisoners] build', e);
        return null;
      }
    }, [m, rev, on]);
    const fr = S.useRef(0);
    QI((s, dt) => {
      if (!group) return;
      try {
        __prsTick(group, Math.min(dt, 0.05), s.camera, fr.current++);
      } catch (e) {}
    });
    S.useEffect(() => {
      __PRS.group = group;
      return () => {
        __PRS.group === group && (__PRS.group = null);
        group && group.userData.npcs.forEach((n) => n.mixer.stopAllAction());
      };
    }, [group]);
    return M.jsxs(M.Fragment, { children: [M.jsx(prevTrees, {}), group ? M.jsx('primitive', { object: group }, 'prs' + rev) : null] });
  };
}
typeof window < 'u' && (window.__bpPrisoners = () => ({ last: __PRS.last, live: __PRS.group ? __PRS.group.userData.npcs.map((n) => ({ k: n.kind, x: +n.holder.position.x.toFixed(2), z: +n.holder.position.z.toFixed(2), s: n.state, pose: n.pose, alive: n.alive, clip: n.cur })) : null }));
