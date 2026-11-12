/* ===== Bayou Protocol mod: animated first-person rigs ===== */
const __RIG = {
  ak47: {
    url: './game/models/rig-kodiak-arms.glb',
    eye: [0, 1.6, 0.12],
    ads: [0, 0.035, 0.1],
    muzzleBone: /Weapon/i,
    clips: {
      draw: ['Equip'],
      idle: ['_Idle', 0, 0, 'Idle_Aim'],
      aimIdle: ['Idle_Aim'],
      walk: ['_Walk', 0, 0, 'Walk_Aim'],
      aimWalk: ['Walk_Aim'],
      run: ['_Run'],
      fire: ['AK_Fire'],
      aimFire: ['Aim_Fire'],
      reload: ['Reload'],
    },
  },
  midas: { alias: 'ak47', gold: !0 },
  sentinel: {
    url: './game/models/rig-sentinel-arms.glb',
    eye: [0.011, 1.539, -0.101],
    ads: [-0.064, 0.009, -0.03],
    muzzleBone: /M4_Root|Main/i,
    clips: {
      draw: ['Draw', 8.9, 10],
      idle: ['Fire', 1, 6],
      fire: ['Fire', 7.45, 8.33],
      reload: ['Reload', 0, 3.67],
      reloadEmpty: ['Reload_Empty', 3.6, 7.5],
    },
  },
};
function __rigClip(g, spec) {
  const [name, a, b, exclude] = spec;
  const src = g.animations.find((x) => x.name.includes(name) && (!exclude || !x.name.includes(exclude)));
  if (!src) return null;
  if (a === void 0 || (a === 0 && b === 0)) return src;
  const C = src.constructor,
    tr = src.tracks.map((k) => {
      const t = k.clone();
      t.trim(a, b);
      t.shift(-a);
      return t;
    });
  return new C(src.name + '_' + a, b - a, tr);
}
function __rigPrep(g, c) {
  const root = g.scene,
    inner = new ji(),
    wrap = new ji();
  inner.add(root);
  inner.rotation.y = Math.PI;
  const e = new U(...c.eye).applyAxisAngle(new U(0, 1, 0), Math.PI);
  inner.position.copy(e).multiplyScalar(-1);
  wrap.add(inner);
  root.traverse((o) => {
    if (o.isMesh) {
      o.frustumCulled = !1;
      o.castShadow = !1;
      o.renderOrder = hu;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) {
        m.envMapIntensity = 1;
      }
    }
  });
  const mixer = new TZ(root),
    acts = {};
  for (const k in c.clips) {
    const cl = __rigClip(g, c.clips[k]);
    if (cl) {
      const a = mixer.clipAction(cl);
      acts[k] = { a, dur: cl.duration };
    }
  }
  let bone = null;
  root.traverse((o) => {
    !bone && o.isBone && c.muzzleBone.test(o.name) && (bone = o);
  });
  c.rig = {
    wrap,
    inner,
    root,
    mixer,
    acts,
    bone,
    cur: null,
    lastShot: -1,
    reloading: !1,
    drawn: !1,
    muzzleLocal: null,
  };
  // muzzle: frontmost gun vertex in idle pose (in wrap space), stored relative to the gun bone
  const idle = acts.idle || acts.fire;
  idle && (idle.a.play(), mixer.update(0));
  wrap.updateMatrixWorld(!0);
  let best = null;
  const v = new U();
  root.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      v.fromBufferAttribute(p, i);
      o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      (!best || v.z < best.z) && (best = v.clone());
    }
  });
  if (best) {
    c.rig.muzzleWrap = wrap.worldToLocal(best.clone());
    bone && (c.rig.muzzleLocal = bone.worldToLocal(best.clone()));
  }
  mixer.stopAllAction();
}
function __rigLoad() {
  if (typeof window > 'u') return;
  for (const k in __RIG) {
    const c = __RIG[k];
    if (!c.url || c.url.startsWith('__')) continue;
    __glbParse(
      c.url,
      (g) => {
        try {
          __rigPrep(g, c);
          Gc += 1;
        } catch (e) {
          console.warn('[SWAT] rig ' + k, e);
        }
      },
      (e) => console.warn('[SWAT] rig load ' + k, e),
    );
  }
}
function __rigSkin(R, gold) {
  if (R.gold === gold) return;
  R.gold = gold;
  R.root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (!m || !/^Material/.test(m.name || '')) return;
    m.userData.o || (m.userData.o = { c: m.color.clone(), me: m.metalness, r: m.roughness, map: m.map });
    if (gold) {
      m.color.set('#e2b53a');
      m.metalness = 1;
      m.roughness = 0.26;
      m.map = null;
    } else {
      const s = m.userData.o;
      m.color.copy(s.c);
      m.metalness = s.me;
      m.roughness = s.r;
      m.map = s.map;
    }
    m.needsUpdate = !0;
  });
}
function __rigFor(id) {
  let c = __RIG[id];
  const gold = !!(c && c.gold);
  c && c.alias && (c = __RIG[c.alias]);
  if (!c || !c.rig || eA.settings.handedness === 'left') return null;
  const R = c.rig;
  __rigSkin(R, gold);
  R.cur = null;
  R.drawn = !1;
  R.lastShot = -1;
  R.reloading = !1;
  R.mixer.stopAllAction();
  return { group: R.wrap, muzzle: (R.muzzleWrap || new U(0, 0, -0.6)).clone(), rig: c, foregrip: 0 };
}
function __rigPlay(R, k, { loop = !0, fade = 0.15, scale = 1, restart = !1 } = {}) {
  const A = R.acts[k];
  if (!A) return !1;
  if (R.cur === k && !restart) {
    A.a.timeScale = scale;
    return !0;
  }
  const prev = R.cur && R.acts[R.cur];
  A.a.reset();
  A.a.setLoop(loop ? 2201 : 2200, loop ? 1 / 0 : 1);
  A.a.clampWhenFinished = !loop;
  A.a.timeScale = scale;
  A.a.enabled = !0;
  A.a.setEffectiveWeight(1);
  A.a.play();
  prev && prev !== A && prev.a.crossFadeTo(A.a, fade, !1);
  R.cur = k;
  R.curStart = performance.now() / 1e3;
  return !0;
}
function __rigFrame(m, G, c, f, l, t, r, b, Z, h, _, BA, DA, base, CA, fA, dA, hA, yawTilt) {
  const C = m.rig,
    R = C.rig;
  G.scale.setScalar(1);
  G.position.x += -base[0] + hA * 0.045 + C.ads[0] * r;
  G.position.y += -base[1] + dA + C.ads[1] * r;
  G.position.z += -base[2] + C.ads[2] * r;
  G.rotation.x += -CA;
  G.rotation.y -= yawTilt;
  G.rotation.z -= fA;
  const now = performance.now() / 1e3,
    busy = R.cur && !R.acts[R.cur].a.loop === !1;
  R.drawn = !0;
  const inDraw = !1;
  if (_) {
    if (!R.reloading) {
      R.reloading = !0;
      const empty = c.weapons[c.active] && c.weapons[c.active].mag === 0 && R.acts.reloadEmpty;
      const k = empty ? 'reloadEmpty' : 'reload',
        A = R.acts[k];
      A && __rigPlay(R, k, { loop: !1, fade: 0.1, scale: A.dur / Math.max(0.5, f.reload) });
    }
  } else {
    R.reloading && ((R.reloading = !1), (R.cur = R.cur === 'reload' || R.cur === 'reloadEmpty' ? R.cur : R.cur));
    if (DA && !inDraw) {
      const k = r > 0.5 && R.acts.aimFire ? 'aimFire' : 'fire',
        A = R.acts[k];
      A &&
        __rigPlay(R, k, {
          loop: !1,
          fade: 0.03,
          restart: !0,
          scale: Math.max(1, A.dur / Math.max(0.08, f.rate * 1.6)),
        });
      R.fireUntil = now + Math.max(0.12, f.rate * 1.5);
    } else if (
      (!inDraw && !(R.fireUntil > now) && !(R.cur === 'reload' || R.cur === 'reloadEmpty')) ||
      ((R.cur === 'reload' || R.cur === 'reloadEmpty') && !R.acts[R.cur].a.isRunning())
    ) {
      const mv = Z > 1.2 && c.onGround,
        aim = r > 0.5;
      let k =
        c.sprinting && mv && R.acts.run
          ? 'run'
          : mv
            ? aim && R.acts.aimWalk
              ? 'aimWalk'
              : R.acts.walk
                ? 'walk'
                : 'idle'
            : aim && R.acts.aimIdle
              ? 'aimIdle'
              : 'idle';
      __rigPlay(R, k, { fade: 0.2, scale: k === 'walk' || k === 'aimWalk' ? Math.max(0.6, Math.min(1.6, Z / 4)) : 1 });
    }
  }
  R.mixer.update(Math.min(t, 0.05));
  if (R.bone && R.muzzleLocal) {
    const p = R.bone.localToWorld(R.muzzleLocal.clone());
    G.worldToLocal(p);
    m.muzzle.copy(p);
  }
}
__rigLoad();
window.__RIG_DBG = () =>
  Object.fromEntries(
    Object.entries(__RIG)
      .filter(([k, c]) => !c.alias)
      .map(([k, c]) => [
        k,
        c.rig
          ? {
              cur: c.rig.cur,
              acts: Object.keys(c.rig.acts),
              bone: c.rig.bone && c.rig.bone.name,
              mz: c.rig.muzzleWrap && c.rig.muzzleWrap.toArray().map((n) => +n.toFixed(3)),
              parent: !!c.rig.wrap.parent,
            }
          : null,
      ]),
  );
