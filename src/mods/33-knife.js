/* ===== Bayou Protocol mod: animated knife ===== */
// Model: "knife Animated" by DJMaesen (sketchfab.com/bumstrum), CC BY 4.0. Textures resized to 1024 px and
// converted to WebP; geometry and animation unchanged. File: public/game/models/knife.glb
// (source in assets-src/models/knife_animated.glb).
//
// The model is a pair of first-person arms holding a combat knife, with one 4.8 s animation track that holds
// several moves back to back. It is cut into clips:
//   idle    0.00-1.33  breathing idle (loops)
//   slashA  1.33-2.00  forehand slash        (primary attack, alternates with slashB)
//   slashB  2.00-2.67  backhand slash
//   stabA   2.67-3.40  flip to reverse grip and stab   (quick melee)
//   stabB   3.40-4.13  second reverse-grip stab
// It goes through the animated rig system in 10-weapon-rigs.js, so it gets the same bob, sway and draw as the
// other rigged weapons. Left-handed mode keeps the old knife (the rig system does not mirror rigs).
__RIG.knife = {
  url: './game/models/knife.glb',
  knife: !0,
  eye: [0, 0, 0],
  ads: [0, 0, 0],
  muzzleBone: /^$/,
  clips: {
    idle: ['anims', 0, 1.333],
    slashA: ['anims', 1.333, 2.0],
    slashB: ['anims', 2.0, 2.667],
    stabA: ['anims', 2.667, 3.4],
    stabB: ['anims', 3.4, 4.133],
  },
};
typeof window < 'u' &&
  __glbParse(
    __RIG.knife.url,
    (g) => {
      try {
        __rigPrep(g, __RIG.knife);
        __knifeFit(__RIG.knife);
        Gc += 1;
      } catch (e) {
        console.warn('[knife] prep', e);
      }
    },
    (e) => console.warn('[knife] load', e),
  );
// The model is authored in centimetres around its own camera, facing +Z. It is turned to face -Z, scaled to
// metres, then lowered and pushed out a little so the knife sits low on the right like the other weapons at
// the game's 62° field of view (the model was framed for a wider one). Measured with __KNIFE_DBG.
const __KNIFE_FIT = { pos: [0.045, -0.145, -0.11], rotX: 0.15, rotY: Math.PI, scale: 0.0095 };
function __knifeFit(c) {
  const R = c.rig;
  R.inner.position.set(...__KNIFE_FIT.pos);
  R.inner.rotation.set(__KNIFE_FIT.rotX, __KNIFE_FIT.rotY, 0, 'YXZ');
  R.inner.scale.setScalar(__KNIFE_FIT.scale);
}
typeof window < 'u' &&
  (window.__KNIFE_SET = (o) => {
    Object.assign(__KNIFE_FIT, o);
    __RIG.knife.rig && __knifeFit(__RIG.knife);
  });
{
  const coreRigFrame = __rigFrame;
  __rigFrame = function (m, G, c, f, l, t, r, b, Z, h, _, BA, DA, base, CA, fA, dA, hA, yawTilt) {
    const C = m.rig;
    if (!C || !C.knife) return coreRigFrame.apply(this, arguments);
    const R = C.rig;
    G.scale.setScalar(1);
    G.position.x += -base[0] + hA * 0.045;
    G.position.y += -base[1] + dA;
    G.position.z += -base[2];
    G.rotation.x += -CA;
    G.rotation.y -= yawTilt;
    G.rotation.z -= fA;
    const swing = R.acts.slashA && R.acts.slashA.dur;
    if (!R.drawn) {
      R.drawn = !0;
      R.lastShot = c.lastShotAt;
      R.lastMelee = c.meleeAt;
      R.flip = 0;
      __rigPlay(R, 'idle', { fade: 0 });
    }
    if (c.lastShotAt !== R.lastShot) {
      // primary attack: alternate forehand and backhand, sped up to fit the knife's swing rate
      R.lastShot = c.lastShotAt;
      R.flip ^= 1;
      const k = R.flip ? 'slashA' : 'slashB';
      __rigPlay(R, k, { loop: !1, fade: 0.05, restart: !0, scale: swing / Math.max(0.3, f.rate * 0.9) });
      R.busyUntil = performance.now() / 1e3 + f.rate * 0.9;
    } else if (c.meleeAt !== R.lastMelee) {
      R.lastMelee = c.meleeAt;
      const k = Math.random() < 0.5 ? 'stabA' : 'stabB',
        A = R.acts[k];
      A && __rigPlay(R, k, { loop: !1, fade: 0.05, restart: !0, scale: A.dur / 0.6 });
      R.busyUntil = performance.now() / 1e3 + 0.6;
    } else if (!(R.busyUntil > performance.now() / 1e3)) {
      __rigPlay(R, 'idle', { fade: 0.18, scale: c.sprinting ? 1.6 : 1 });
    }
    R.mixer.update(Math.min(t, 0.05));
  };
}
wBA.push(['Knife model', '“knife Animated” by DJMaesen (sketchfab.com/bumstrum), textures compressed', 'CC BY 4.0']);
// debug: bounds of the posed arms in rig space, used to fit __KNIFE_FIT
typeof window < 'u' &&
  (window.__KNIFE_DBG = () => {
    const R = __RIG.knife.rig;
    if (!R) return null;
    R.acts.idle.a.reset().play();
    R.mixer.update(0.5);
    R.wrap.updateMatrixWorld(!0);
    const b = new xi(),
      v = new U(),
      inv = R.wrap.matrixWorld.clone().invert();
    let blade = null;
    R.root.traverse((o) => {
      if (!o.isMesh) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 2) {
        v.fromBufferAttribute(p, i);
        o.isSkinnedMesh && o.applyBoneTransform(i, v);
        v.applyMatrix4(o.matrixWorld).applyMatrix4(inv);
        b.expandByPoint(v);
        !o.isSkinnedMesh && (!blade || v.z < blade.z) && (blade = v.clone());
      }
    });
    R.mixer.stopAllAction();
    const r = (x) => +x.toFixed(3);
    return { min: b.min.toArray().map(r), max: b.max.toArray().map(r), blade: blade && blade.toArray().map(r) };
  });
