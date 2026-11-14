/* ===== Bayou Protocol mod: characters on non-Mixamo skeletons ===== */
// The game's characters share one set of Mixamo animations, and the hitboxes, foot IK, leg turning and
// weapon-holding IK all find bones by their Mixamo names. A character rigged differently (for example
// "terrorist" by DJMaesen: hip, spine, chest, L_leg, L_knee, ...) is adapted when it loads:
//   1. its bones are renamed to the Mixamo names (a table per rig, below), so every system finds them
//   2. every shared animation is retargeted onto it: for each frame, each Mixamo bone's world-space rotation
//      away from its rest pose is applied to the matching bone's rest pose (both rigs rest in a T-pose), with
//      the difference in facing between the two rigs taken out; the hips' height and sway are scaled by leg
//      length. Bones with no Mixamo counterpart (eyes, finger tips) keep their rest pose.
//   3. the model is turned to face the same way as the Mixamo characters
// Clips are baked once per model at 30 frames a second and cached.
const __RT_MAPS = {
  djmaesen: {
    hip: 'Hips', spine: 'Spine', chest: 'Spine2', neck: 'Neck', head: 'Head', top: 'HeadTop_End',
    L_shoulder: 'LeftShoulder', L_arm: 'LeftArm', L_elbow: 'LeftForeArm', L_wrist: 'LeftHand',
    R_shoulder: 'RightShoulder', R_arm: 'RightArm', R_elbow: 'RightForeArm', R_wrist: 'RightHand',
    L_thumb1: 'LeftHandThumb1', L_thumb2: 'LeftHandThumb2', L_thumb3: 'LeftHandThumb3',
    L_point1: 'LeftHandIndex1', L_point2: 'LeftHandIndex2', L_point3: 'LeftHandIndex3',
    L_middle1: 'LeftHandMiddle1', L_middle2: 'LeftHandMiddle2', L_middle3: 'LeftHandMiddle3',
    L_ring1: 'LeftHandRing1', L_ring2: 'LeftHandRing2', L_ring3: 'LeftHandRing3',
    L_pink1: 'LeftHandPinky1', L_pink2: 'LeftHandPinky2', L_pink3: 'LeftHandPinky3',
    R_thumb1: 'RightHandThumb1', R_thumb2: 'RightHandThumb2', R_thumb3: 'RightHandThumb3',
    R_point1: 'RightHandIndex1', R_point2: 'RightHandIndex2', R_point3: 'RightHandIndex3',
    R_middle1: 'RightHandMiddle1', R_middle2: 'RightHandMiddle2', R_middle3: 'RightHandMiddle3',
    R_ring1: 'RightHandRing1', R_ring2: 'RightHandRing2', R_ring3: 'RightHandRing3',
    R_pink1: 'RightHandPinky1', R_pink2: 'RightHandPinky2', R_pink3: 'RightHandPinky3',
    L_leg: 'LeftUpLeg', L_knee: 'LeftLeg', L_ankle: 'LeftFoot', L_foot: 'LeftToeBase', L_toes: 'LeftToe_End',
    R_leg: 'RightUpLeg', R_knee: 'RightLeg', R_ankle: 'RightFoot', R_foot: 'RightToeBase', R_toes: 'RightToe_End',
  },
};
const __RT = { clips: new Map() };
// orthonormal frame of a rig in its own model space: x = towards its left, y = up, z = forward
function __rtFrame(get) {
  const w = (n) => get(n) && get(n).getWorldPosition(new U());
  const hips = w('Hips'),
    head = w('Head') || w('Neck'),
    l = w('LeftUpLeg'),
    r = w('RightUpLeg');
  if (!hips || !head || !l || !r) return null;
  const up = head.sub(hips).normalize(),
    side = l.sub(r).normalize(),
    fwd = new U().crossVectors(side, up).normalize();
  side.crossVectors(up, fwd).normalize();
  return new Kw().setFromRotationMatrix(new _A().makeBasis(side, up, fwd));
}
function __retarget(gltf, animGltf, mapName) {
  const map = __RT_MAPS[mapName],
    T = {};
  // 1. rename
  gltf.scene.traverse((o) => {
    if (!o.isBone) return;
    const base = o.name.replace(/_\d+$/, ''),
      m = map[base];
    m && ((o.name = 'mixamor' + 'ig' + m), (T[m] = o));
  });
  gltf.scene.updateMatrixWorld(!0);
  // source skeleton (the shared animations' own) at rest
  const src = b$(animGltf.scene),
    S = {};
  // the shared animation file has no skin, so its joints load as plain nodes, not bones
  src.traverse((o) => o.name.startsWith('mixamorig') && (S[o.name.slice(9)] = o));
  src.updateMatrixWorld(!0);
  const fs = __rtFrame((n) => S[n]),
    ft = __rtFrame((n) => T[n]);
  if (!fs || !ft) throw new Error('rig frames not found');
  // C maps a rotation expressed in the source rig's frame into the target rig's frame
  const C = ft.clone().multiply(fs.clone().invert()),
    Ci = C.clone().invert();
  const names = Object.keys(T).filter((n) => S[n]),
    Rs = {},
    Rt = {};
  for (const n of names) (Rs[n] = S[n].getWorldQuaternion(new Kw())), (Rt[n] = T[n].getWorldQuaternion(new Kw()));
  // bones of the target in parent-first order, with their rest local rotations
  const bones = [];
  gltf.scene.traverse((o) => o.isBone && bones.push(o));
  const restLocal = new Map(bones.map((b) => [b, b.quaternion.clone()])),
    restPos = T.Hips.position.clone(),
    hipsParentInv = new _A().copy(T.Hips.parent.matrixWorld).invert(),
    hipsRestW = T.Hips.getWorldPosition(new U()),
    legT = T.Hips.getWorldPosition(new U()).distanceTo(T.LeftFoot.getWorldPosition(new U())),
    legS = S.Hips.getWorldPosition(new U()).distanceTo(S.LeftFoot.getWorldPosition(new U())),
    k = legT / Math.max(1e-6, legS);
  const mixer = new TZ(src),
    out = [];
  // the shared file's rest pose is the first frame of whichever clip built it (a ladder climb, hips high):
  // measure the hips against the standing idle instead. Standing, the target's hips sit a little below its
  // T-pose height; every other pose scales from there.
  const ref = (() => {
    const c = animGltf.animations.find((x) => x.name === 'RifleIdle') || animGltf.animations[0],
      a = mixer.clipAction(c).play();
    mixer.setTime(0);
    src.updateMatrixWorld(!0);
    const v = S.Hips.getWorldPosition(new U());
    a.stop();
    mixer.uncacheClip(c);
    return v;
  })();
  const qTrack = animGltf.animations[0].tracks.find((t) => /quaternion$/.test(t.name)).constructor,
    vTrack = animGltf.animations[0].tracks.find((t) => /position$/.test(t.name)).constructor;
  for (const clip of animGltf.animations) {
    const act = mixer.clipAction(clip).play(),
      n = Math.max(2, Math.round(clip.duration * 30) + 1),
      times = new Float32Array(n),
      qv = new Map(names.map((nm) => [nm, new Float32Array(n * 4)])),
      hp = new Float32Array(n * 3),
      W = new Map(),
      q = new Kw(),
      tmp = new Kw();
    for (let f = 0; f < n; f++) {
      const t = (clip.duration * f) / (n - 1);
      times[f] = t;
      mixer.setTime(t);
      src.updateMatrixWorld(!0);
      W.clear();
      const worldQ = (b) => {
        if (W.has(b)) return W.get(b);
        let r;
        if (!b.isBone) r = b.getWorldQuaternion(new Kw());
        else {
          const m = b.name.startsWith('mixamorig') && S[b.name.slice(9)] ? b.name.slice(9) : null;
          if (m) {
            const D = S[m].getWorldQuaternion(new Kw()).multiply(Rs[m].clone().invert());
            r = C.clone().multiply(D).multiply(Ci).multiply(Rt[m]);
          } else r = worldQ(b.parent).clone().multiply(restLocal.get(b));
        }
        W.set(b, r);
        return r;
      };
      for (const nm of names) {
        const b = T[nm];
        q.copy(worldQ(b.parent)).invert().multiply(worldQ(b));
        // keep the quaternion on the same side as the previous key (no flips when interpolating)
        const a = qv.get(nm);
        if (f && a[(f - 1) * 4] * q.x + a[(f - 1) * 4 + 1] * q.y + a[(f - 1) * 4 + 2] * q.z + a[(f - 1) * 4 + 3] * q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
        a.set([q.x, q.y, q.z, q.w], f * 4);
      }
      const hs = S.Hips.getWorldPosition(new U()),
        d = hs.clone().sub(ref).setY(0).applyQuaternion(C).multiplyScalar(k),
        p = hipsRestW.clone().add(d);
      p.y = hipsRestW.y * 0.965 * (hs.y / Math.max(1e-4, ref.y));
      p.applyMatrix4(hipsParentInv);
      hp.set([p.x, p.y, p.z], f * 3);
    }
    act.stop();
    mixer.uncacheClip(clip);
    const tracks = names.map((nm) => new qTrack(T[nm].name + '.quaternion', times, qv.get(nm)));
    tracks.push(new vTrack(T.Hips.name + '.position', times, hp));
    out.push(new so(clip.name, clip.duration, tracks));
  }
  for (const [a, srcName] of Object.entries(__CHAR.alias)) {
    const c = out.find((x) => x.name === srcName);
    c && out.push(new so(a, c.duration, c.tracks));
  }
  // face the same way as the Mixamo characters (+Z)
  const fwd = new U(0, 0, 1).applyQuaternion(ft);
  gltf.scene.userData.__faceYaw = Math.atan2(fwd.x, fwd.z) - 0;
  return out;
}
typeof window < 'u' && (window.__bpRetarget = __RT);
// The death ragdoll finds 17 body bones by their Mixamo names, the abdomen as Spine1. A rig with a shorter
// spine (DJMaesen's has spine and chest only: Spine and Spine2) had no Spine1, so no ragdoll was built and
// the body froze where it stood. Missing spine bones fall back to the nearest one the rig has.
{
  const coreBone = fe,
    FALLBACK = { abdomen: ['spine', 'spine2'], torso: ['spine1', 'spine'] };
  fe = function (w, A) {
    const r = coreBone(w, A);
    if (r) return r;
    const alt = FALLBACK[String(A).replace(/[^a-z0-9]/gi, '').toLowerCase()];
    if (!alt) return r;
    let b = null;
    for (const n of alt) {
      w.traverse((o) => {
        b || !o.isBone || o.name.replace(/[^a-z0-9]/gi, '').toLowerCase() !== 'mixamorig' + n || (b = o);
      });
      if (b) break;
    }
    b && Nb.has(w) && Nb.get(w).set(A, b);
    return b || r;
  };
}
