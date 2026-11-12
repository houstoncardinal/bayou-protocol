/* ===== Bayou Protocol mod: grounded feet and skeleton hitboxes ===== */
// Feet
//   Animations assume a flat floor at the character's position. On stairs, steps, ramps and ledge edges a
//   foot would sink into the higher step or hang over the lower one. Every frame, for each leg: the floor
//   under the foot is found (map boxes, the same floor query the game uses for footsteps), the pelvis is
//   lowered when one foot's floor is lower than the body's, and two-bone IK (thigh, knee) moves the ankle
//   so the sole rests on its own floor, never below it. The foot keeps its animated orientation. In the air,
//   on ladders and while dead nothing is changed. (37-characters.js also scales the shared animations' hips
//   height per model, which is what made some characters stand ankle-deep on flat ground.)
//
// Hitboxes
//   The core tested shots against one head sphere (11.5 cm) and one upright cylinder (21 cm radius) from the
//   feet to the shoulders: the gap between the legs, the air beside the arms and the space above a kneeling
//   or leaning head all counted as hits. Now each character is 17 capsules that follow its animated
//   skeleton: head, neck, chest, belly, upper arms, forearms, hands, thighs, shins and feet. The radius of
//   each capsule is measured from the character model's own mesh (vertices bound to that bone, 60th
//   percentile distance to the bone), so the hitbox matches what is drawn: armour and helmets included, no
//   empty space. Zones keep their meaning (head / body / legs) and damage rules are unchanged, so it is no
//   harder to hit someone you are aiming at, only shots that visibly miss now miss.
//   The skeleton is captured after animation and IK each rendered frame and moved by the character's
//   simulated motion since then. When it is not available (not rendered yet, tab in the background) the
//   core's analytic test is used.
//   window.__bpHitboxes = true draws the capsules (debug).
const __BODY = { hb: new Map(), radii: new Map(), dbg: null, pct: 0.6, pad: 0.01 };
const __bv = () => new U();
const __bt = { a: __bv(), b: __bv(), c: __bv(), d: __bv(), e: __bv(), q: new Kw(), q2: new Kw(), q3: new Kw() };
const __bn = (s) => 'mixamorig' + s;
// ---------------------------------------------------------------- floor query
function __bodyFloor(x, y, z) {
  try {
    const h = rm({ x, y: y + 0.55, z });
    return Number.isFinite(h) && h > y - 0.7 ? h : y;
  } catch {
    return y;
  }
}
// rotate a bone by a world-space rotation q
function __bodyRotWorld(bone, q) {
  const pq = bone.parent.getWorldQuaternion(__bt.q2);
  __bt.q3.copy(pq).invert().multiply(q).multiply(pq);
  bone.quaternion.premultiply(__bt.q3);
  bone.updateMatrixWorld(!0);
}
// two-bone IK: move the ankle of (hip, knee, ankle) to target, bending in the leg's current plane
function __bodyLegIk(hip, knee, ankle, target) {
  const H = hip.getWorldPosition(__bt.a),
    K = knee.getWorldPosition(__bt.b),
    A = ankle.getWorldPosition(__bt.c);
  const la = H.distanceTo(K),
    lb = K.distanceTo(A),
    d = Math.min(la + lb - 1e-4, Math.max(Math.abs(la - lb) + 1e-4, H.distanceTo(target)));
  // knee: set the hip-ankle distance
  const cur = Math.acos(Math.max(-1, Math.min(1, __bt.d.copy(H).sub(K).normalize().dot(__bt.e.copy(A).sub(K).normalize())))),
    want = Math.acos(Math.max(-1, Math.min(1, (la * la + lb * lb - d * d) / (2 * la * lb))));
  const axis = __bt.d.copy(H).sub(K).cross(__bt.e.copy(A).sub(K));
  if (axis.lengthSq() > 1e-10) {
    axis.normalize();
    __bodyRotWorld(knee, __bt.q.setFromAxisAngle(axis, cur - want));
  }
  // hip: swing the leg so the ankle points at the target
  const A2 = ankle.getWorldPosition(__bt.c),
    H2 = hip.getWorldPosition(__bt.a);
  __bt.d.copy(A2).sub(H2).normalize();
  __bt.e.copy(target).sub(H2).normalize();
  __bodyRotWorld(hip, __bt.q.setFromUnitVectors(__bt.d, __bt.e));
}
function __bodyRig(s) {
  let r = s.userData.__body;
  if (r) return r;
  const g = (n) => s.getObjectByName(__bn(n));
  r = s.userData.__body = {
    baseY: s.position.y,
    drop: 0,
    legs: [
      ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase'],
      ['RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'],
    ].map(([h, k, a, t]) => ({ hip: g(h), knee: g(k), ankle: g(a), toe: g(t), off: 0 })),
    ok: !1,
  };
  r.ok = r.legs.every((l) => l.hip && l.knee && l.ankle);
  return r;
}
function __bodyFeet(s, v, K, dt) {
  const r = __bodyRig(s);
  if (!r.ok) return;
  // far away or not drawn (your own body): feet are not worth the work; ease the pelvis back
  const cam = typeof __R3F < 'u' && __R3F && __R3F.camera;
  if (!K.visible || (cam && Math.hypot(cam.position.x - K.position.x, cam.position.z - K.position.z) > 32)) {
    r.drop *= 0.8;
    s.position.y = r.baseY + r.drop;
    return;
  }
  const url = s.userData.bpChar,
    ankleH = (__CHAR.ankle.get(url) ?? 0.055) * kO,
    rootY = K.position.y,
    k = 1 - Math.exp(-dt * 14),
    on = v.alive && v.onGround && !(v.ladder || v.onLadder);
  // floors under each foot, relative to the floor the body stands on
  K.updateMatrixWorld(!0);
  let lowest = 0;
  for (const L of r.legs) {
    const A = L.ankle.getWorldPosition(__bt.a);
    const f = __bodyFloor(A.x, rootY, A.z);
    L.floor = f;
    L.delta = on ? Math.max(-0.45, Math.min(0.45, f - rootY)) : 0;
    lowest = Math.min(lowest, L.delta);
  }
  // pelvis down to the lower floor (smoothed), then each leg reaches its own floor
  r.drop += (lowest - r.drop) * k;
  s.position.y = r.baseY + r.drop;
  if (!on && Math.abs(r.drop) < 1e-3) return;
  s.updateMatrixWorld(!0);
  for (const L of r.legs) {
    L.off += (L.delta - r.drop - L.off) * k;
    const A = L.ankle.getWorldPosition(__bt.d),
      t = __bt.e.copy(A);
    t.y += L.off;
    // never below the floor (the animation's planted foot sits at ankle height above the soles)
    on && (t.y = Math.max(t.y, L.floor + ankleH * 0.92));
    if (Math.abs(t.y - A.y) < 0.002) continue;
    const fq = L.ankle.getWorldQuaternion(new Kw());
    __bodyLegIk(L.hip, L.knee, L.ankle, t.clone());
    // keep the foot's own orientation
    const pq = L.ankle.parent.getWorldQuaternion(__bt.q2);
    L.ankle.quaternion.copy(pq.invert().multiply(fq));
    L.ankle.updateMatrixWorld(!0);
  }
}
// ---------------------------------------------------------------- hitboxes
// [key, from bone, to bone, zone, bones whose vertices size it (prefix match), [end A, end B] pulled in by this
// fraction of the radius, so rounded ends stop at the body's surface (top of the head, shoulders, finger tips)]
const __HB_SEGS = [
  ['head', 'Head', 'HeadTop_End', 'head', ['Head', 'HeadTop', 'LeftEye', 'RightEye'], [0.2, 1]],
  ['neck', 'Neck', 'Head', 'body', ['Neck'], [0, 0.5]],
  ['chest', 'Spine1', 'Neck', 'body', ['Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder'], [0, 0.85]],
  ['belly', 'Hips', 'Spine1', 'body', ['Hips', 'Spine'], [0.55, 0]],
  ['uarmL', 'LeftArm', 'LeftForeArm', 'body', ['LeftArm'], [0, 0]],
  ['farmL', 'LeftForeArm', 'LeftHand', 'body', ['LeftForeArm'], [0, 0]],
  ['handL', 'LeftHand', 'LeftHandMiddle1', 'body', ['LeftHand'], [0, 1]],
  ['uarmR', 'RightArm', 'RightForeArm', 'body', ['RightArm'], [0, 0]],
  ['farmR', 'RightForeArm', 'RightHand', 'body', ['RightForeArm'], [0, 0]],
  ['handR', 'RightHand', 'RightHandMiddle1', 'body', ['RightHand'], [0, 1]],
  ['thighL', 'LeftUpLeg', 'LeftLeg', 'legs', ['LeftUpLeg'], [0.3, 0]],
  ['shinL', 'LeftLeg', 'LeftFoot', 'legs', ['LeftLeg'], [0, 0]],
  ['footL', 'LeftFoot', 'LeftToeBase', 'legs', ['LeftFoot', 'LeftToe'], [0, 1]],
  ['thighR', 'RightUpLeg', 'RightLeg', 'legs', ['RightUpLeg'], [0.3, 0]],
  ['shinR', 'RightLeg', 'RightFoot', 'legs', ['RightLeg'], [0, 0]],
  ['footR', 'RightFoot', 'RightToeBase', 'legs', ['RightFoot', 'RightToe'], [0, 1]],
];
const __HB_CLAMP = {
  head: [0.085, 0.155], neck: [0.045, 0.1], chest: [0.11, 0.24], belly: [0.1, 0.22],
  uarm: [0.04, 0.1], farm: [0.035, 0.085], hand: [0.03, 0.065], thigh: [0.06, 0.13], shin: [0.045, 0.1], foot: [0.035, 0.075],
};
// fallback endpoints when a model lacks the end bone: continue the parent bone's direction
const __HB_EXT = { HeadTop_End: ['Neck', 'Head', 1.1], LeftHandMiddle1: ['LeftForeArm', 'LeftHand', 0.35], RightHandMiddle1: ['RightForeArm', 'RightHand', 0.35], LeftToeBase: ['LeftLeg', 'LeftFoot', 0.3], RightToeBase: ['RightLeg', 'RightFoot', 0.3] };
function __hbBones(s) {
  let b = s.userData.__hbBones;
  if (b) return b;
  b = {};
  s.traverse((o) => o.isBone && o.name.startsWith('mixamorig') && (b[o.name.slice(9)] = o));
  return (s.userData.__hbBones = b);
}
// bone positions straight from matrixWorld (the caller updates the skeleton once per frame)
const __wp = (bone, out) => out.setFromMatrixPosition(bone.matrixWorld);
function __hbEnd(B, name, out) {
  if (B[name]) return __wp(B[name], out);
  const e = __HB_EXT[name];
  if (!e || !B[e[0]] || !B[e[1]]) return null;
  const p = __wp(B[e[1]], out),
    q = __wp(B[e[0]], __bt.e);
  return p.addScaledVector(q.sub(p).negate(), e[2]);
}
const __segDist = (p, a, b) => {
  const ab = __bt.d.copy(b).sub(a),
    t = Math.max(0, Math.min(1, __bt.e.copy(p).sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq())));
  return p.distanceTo(__bt.e.copy(a).addScaledVector(ab, t));
};
// per model: capsule radii measured from the mesh in its current pose
function __hbRadii(s) {
  const url = s.userData.bpChar;
  if (__BODY.radii.has(url)) return __BODY.radii.get(url);
  const B = __hbBones(s),
    owner = new Map(); // bone -> segment index
  __HB_SEGS.forEach((g, i) => {
    for (const [n, bone] of Object.entries(B)) if (g[4].some((p) => n === p || (n.startsWith(p) && (p === 'LeftHand' || p === 'RightHand' || p.endsWith('Toe') || p === 'HeadTop')))) owner.has(bone) || owner.set(bone, i);
  });
  s.updateMatrixWorld(!0);
  const ends = __HB_SEGS.map((g) => {
      const a = B[g[1]] ? __wp(B[g[1]], new U()) : null,
        b = __hbEnd(B, g[2], new U());
      return a && b ? [a, b] : null;
    }),
    dist = __HB_SEGS.map(() => []),
    v = new U();
  s.updateMatrixWorld(!0);
  s.traverse((o) => {
    if (!o.isSkinnedMesh || o.userData.lod) return;
    o.skeleton.update();
    const p = o.geometry.attributes.position,
      si = o.geometry.attributes.skinIndex,
      sw = o.geometry.attributes.skinWeight;
    if (!si || !sw) return;
    const step = Math.max(1, Math.floor(p.count / 12000));
    for (let i = 0; i < p.count; i += step) {
      let best = 0,
        bi = 0;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        w > best && ((best = w), (bi = si.getComponent(i, k)));
      }
      const seg = owner.get(o.skeleton.bones[bi]);
      if (seg === void 0 || !ends[seg]) continue;
      v.fromBufferAttribute(p, i);
      o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      dist[seg].push(__segDist(v, ends[seg][0], ends[seg][1]));
    }
  });
  const radii = __HB_SEGS.map((g, i) => {
    const c = __HB_CLAMP[g[0].replace(/[LR]$/, '')] || [0.04, 0.2],
      d = dist[i].sort((x, y) => x - y),
      r = d.length > 8 ? d[Math.floor(d.length * __BODY.pct)] : (c[0] + c[1]) / 2;
    return Math.max(c[0], Math.min(c[1], r));
  });
  __BODY.radii.set(url, radii);
  return radii;
}
function __hbCapture(s, v, K) {
  const radii = __hbRadii(s),
    B = __hbBones(s);
  let rec = __BODY.hb.get(v.id);
  rec || __BODY.hb.set(v.id, (rec = { segs: new Float32Array(__HB_SEGS.length * 7), ok: new Uint8Array(__HB_SEGS.length), t: 0, x: 0, y: 0, z: 0, R: 0 }));
  const a = new U(),
    b = new U();
  let R = 0;
  s.updateMatrixWorld(!0);
  __HB_SEGS.forEach((g, i) => {
    rec.ok[i] = 0;
    if (!B[g[1]] || !__hbEnd(B, g[2], b)) return;
    __wp(B[g[1]], a);
    const r = radii[i],
      L = a.distanceTo(b);
    if (L > 1e-4 && (g[5][0] || g[5][1])) {
      // pull the rounded ends in so the capsule stops at the body's surface, not r beyond it
      const dir = __bt.d.copy(b).sub(a).multiplyScalar(1 / L),
        sa = Math.min(r * g[5][0], L * 0.45),
        sb = Math.min(r * g[5][1], L * 0.45);
      a.addScaledVector(dir, sa);
      b.addScaledVector(dir, -sb);
    }
    const o = i * 7;
    rec.segs[o] = a.x;
    rec.segs[o + 1] = a.y;
    rec.segs[o + 2] = a.z;
    rec.segs[o + 3] = b.x;
    rec.segs[o + 4] = b.y;
    rec.segs[o + 5] = b.z;
    rec.segs[o + 6] = r;
    rec.ok[i] = 1;
    R = Math.max(R, Math.hypot(a.x - v.pos.x, a.z - v.pos.z) + r, Math.hypot(b.x - v.pos.x, b.z - v.pos.z) + r);
  });
  rec.t = performance.now();
  rec.s = s;
  rec.x = v.pos.x;
  rec.y = v.pos.y;
  rec.z = v.pos.z;
  rec.R = R;
  __BODY.dbg && __hbDraw(rec, v.id);
}
// ray (o + t d, |d| = 1) against a capsule a-b of radius r; returns t or -1
function __rayCapsule(ox, oy, oz, dx, dy, dz, ax, ay, az, bx, by, bz, r) {
  const bax = bx - ax,
    bay = by - ay,
    baz = bz - az,
    oax = ox - ax,
    oay = oy - ay,
    oaz = oz - az,
    baba = bax * bax + bay * bay + baz * baz,
    bard = bax * dx + bay * dy + baz * dz,
    baoa = bax * oax + bay * oay + baz * oaz,
    rdoa = dx * oax + dy * oay + dz * oaz,
    oaoa = oax * oax + oay * oay + oaz * oaz,
    A = baba - bard * bard,
    Bq = baba * rdoa - baoa * bard,
    C = baba * oaoa - baoa * baoa - r * r * baba,
    h = Bq * Bq - A * C;
  if (h < 0) return -1;
  if (A > 1e-12) {
    const t = (-Bq - Math.sqrt(h)) / A,
      y = baoa + t * bard;
    if (y > 0 && y < baba) return t;
  }
  // end caps
  const y = baoa + ((-Bq - Math.sqrt(Math.max(0, h))) / Math.max(1e-12, A)) * bard,
    cx = y <= 0 ? oax : ox - bx,
    cy = y <= 0 ? oay : oy - by,
    cz = y <= 0 ? oaz : oz - bz,
    b2 = dx * cx + dy * cy + dz * cz,
    c2 = cx * cx + cy * cy + cz * cz - r * r,
    h2 = b2 * b2 - c2;
  return h2 > 0 ? -b2 - Math.sqrt(h2) : -1;
}
{
  const coreHit = NE;
  typeof window < 'u' && (window.__bpCoreHit = coreHit);
  NE = function (w, A, i, I, B = 0) {
    const rec = __BODY.hb.get(i.id);
    if (!rec || !i.alive || performance.now() - rec.t > 400 || Math.hypot(rec.x - i.pos.x, rec.z - i.pos.z) > 1.5) return coreHit.apply(this, arguments);
    // the skeleton was captured at the last rendered frame: move it with the character since then
    const sx = i.pos.x - rec.x,
      sy = i.pos.y - rec.y,
      sz = i.pos.z - rec.z,
      ox = w.x - sx,
      oy = w.y - sy,
      oz = w.z - sz,
      pad = __BODY.pad + B;
    // broad phase: closest approach to the body's vertical axis
    const px = ox - rec.x,
      pz = oz - rec.z,
      hd = A.x * A.x + A.z * A.z,
      tc = hd > 1e-9 ? -(px * A.x + pz * A.z) / hd : 0,
      cx = px + A.x * tc,
      cz = pz + A.z * tc;
    if (cx * cx + cz * cz > (rec.R + pad + 0.05) ** 2) return null;
    let best = I,
      zone = null;
    for (let k = 0; k < __HB_SEGS.length; k++) {
      if (!rec.ok[k]) continue;
      const o = k * 7,
        s = rec.segs,
        t = __rayCapsule(ox, oy, oz, A.x, A.y, A.z, s[o], s[o + 1], s[o + 2], s[o + 3], s[o + 4], s[o + 5], s[o + 6] + pad);
      t > 0 && t < best && ((best = t), (zone = __HB_SEGS[k][3]));
    }
    return zone ? { t: best, zone } : null;
  };
}
// ---------------------------------------------------------------- per-frame hook (after the weapon IK)
{
  const prev = __locoAfter;
  __locoAfter = function (s, v, K, dt, speed) {
    prev.apply(this, arguments);
    if (!s || !s.userData || !s.userData.bpChar) return;
    try {
      __bodyFeet(s, v, K, Math.min(dt, 0.1));
    } catch (e) {
      window.__bodyErr = String(e && e.stack);
    }
    try {
      v.alive && __hbCapture(s, v, K);
    } catch (e) {
      window.__hbErr = String(e && e.stack);
    }
  };
}
// ---------------------------------------------------------------- debug drawing
function __hbDraw(rec, id) {
  const D = __BODY.dbg;
  let g = D.groups.get(id);
  if (!g) {
    g = new ji();
    g.userData.noWound = !0;
    D.root.add(g);
    D.groups.set(id, g);
    for (let k = 0; k < __HB_SEGS.length; k++) {
      const m = new Ow(D.geo, __HB_SEGS[k][3] === 'head' ? D.head : __HB_SEGS[k][3] === 'legs' ? D.legs : D.body);
      m.userData.noWound = !0;
      g.add(m);
    }
  }
  const a = new U(),
    b = new U();
  for (let k = 0; k < __HB_SEGS.length; k++) {
    const m = g.children[k],
      o = k * 7,
      s = rec.segs;
    m.visible = !!rec.ok[k];
    if (!m.visible) continue;
    a.set(s[o], s[o + 1], s[o + 2]);
    b.set(s[o + 3], s[o + 4], s[o + 5]);
    const L = a.distanceTo(b),
      r = s[o + 6];
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new U(0, 1, 0), b.clone().sub(a).normalize());
    m.scale.set(r, L / 2 + r, r);
  }
}
typeof window < 'u' &&
  Object.defineProperty(window, '__bpHitboxes', {
    set(on) {
      if (on && !__BODY.dbg && __fx.g) {
        const root = new ji();
        __fx.g.add(root);
        const mk = (c) => new Ni({ color: c, wireframe: !0, transparent: !0, opacity: 0.55, depthTest: !1 });
        __BODY.dbg = { root, groups: new Map(), geo: new bi(1, 10, 6), head: mk('#ff4040'), body: mk('#40ff70'), legs: mk('#40a0ff') };
      } else if (!on && __BODY.dbg) {
        __BODY.dbg.root.removeFromParent();
        __BODY.dbg = null;
      }
    },
    get: () => !!__BODY.dbg,
  });
typeof window < 'u' && (window.__bpBody = __BODY);
// test hooks
typeof window < 'u' &&
  ((window.__bpHitNow = (o, d, p, I, B) => NE(o, d, p, I, B)),
  (window.__bpFloorAt = (x, y, z) => __bodyFloor(x, y, z)),
  (window.__bpThree = { Raycaster: UZ, Vector3: U }));
