/* ===== Bayou Protocol mod: speed (menus and loading) ===== */
// Behind every menu screen the game runs a live match (the "attract" scene) under a dark overlay: it was
// rendered like a real match, at full resolution and every display refresh, with ten bots, while seven
// blurred panels re-blurred it every frame. Almost none of it is visible, so while the menus are up:
//   - the scene renders 30 times a second instead of at the display rate (60 to 144 Hz), on demand
//   - at no more than 0.6 x resolution (it is seen through a 90 % dark overlay), chosen through the game's
//     own resolution logic (Pt), so dynamic resolution and the canvas agree
//   - with three bots a side instead of five (37-characters.js)
//   - the sun's shadow map is redrawn once a second instead of every frame (it doubles the drawing work)
// The pause menu in a match is throttled to 30 fps too (full resolution: the match shows round its edges).
// Everything goes back the moment a match is played.
// Core patches that go with this: the canvas only re-applies its resolution and frame loop when those
// settings change (it used to on every menu update, resizing the whole renderer each time and undoing
// dynamic resolution), and dynamic resolution does not measure the menus' deliberate 30 fps (it would have
// read it as a slow machine and, with auto quality on, lowered the quality setting).
//
// Shader warm-up in the menus: the first frame a material is drawn, the graphics driver has to compile its
// shader, and pressing Play used to compile a few dozen at once (characters not in the menu's match, every
// first-person gun and arms). While the menus are up, everything already loaded is compiled in the
// background (in parallel on the GPU process where the browser supports it), in the same lighting set-up as
// the match, so the first frames of a match only draw. The same runs for the first 90 s of a match, for
// models that load after the menus.
const __SPD = { mode: '', n: 0 };
// High on a GPU that is not a Pro / Max class or dedicated one (the base Apple M chips, Intel and AMD
// integrated graphics): High's sharper shadows and extra lights, at Medium's resolution budget (2.6 instead
// of 3.7 million pixels). Measured on a base M4 at 3840 x 1080: High at the full budget held about 30-40 fps
// on the outdoor maps; capped, it plays like Medium.
function __strongGpu() {
  if (__SPD.strong === void 0)
    try {
      __SPD.strong = /nvidia|geforce|rtx|gtx|radeon rx|radeon pro|arc a|apple m[1-9] (pro|max|ultra)/i.test(nz());
    } catch (e) {
      __SPD.strong = !1;
    }
  return __SPD.strong;
}
{
  const corePt = Pt;
  Pt = function (q) {
    let v = corePt.apply(this, arguments);
    q === 'high' && !__strongGpu() && (v = Math.min(v, corePt.call(this, 'medium')));
    return eA.attract ? Math.min(v, 0.6) : v;
  };
}
function __spdLearn() {
  if (!__SPD.learn)
    try {
      __SPD.learn = JSON.parse(localStorage.getItem('bp-dyn-v1') || '{}') || {};
    } catch (e) {
      __SPD.learn = {};
    }
  return __SPD.learn;
}
const __SWARM = { done: new WeakSet(), t: 0, n: 0 };
function __spdWarm(st) {
  const now = performance.now();
  if (now - __SWARM.t < 1500 || !st.gl.compileAsync || !st.scene.environment) return;
  __SWARM.t = now;
  const gl = st.gl,
    vm = (typeof window < "u" && window.__vmScene) || __SPD.vm,
    batch = [];
  // characters and third-person guns are drawn in the main scene; first-person models in the viewmodel
  // scene (its own lights, the main scene's environment, its own tone mapping)
  for (const s of (typeof __CHAR < 'u' && __CHAR.scenes) || []) batch.push([s, st.scene, null]);
  for (const k in __XG) __XG[k] && __XG[k].tpl && batch.push([__XG[k].tpl, st.scene, null]);
  if (vm) {
    for (const k in __RIG) __RIG[k] && __RIG[k].rig && __RIG[k].rig.wrap && batch.push([__RIG[k].rig.wrap, vm, to]);
    __FA.g && batch.push([__FA.g.scene, vm, to]);
  }
  let left = 4;
  for (const [o, scene, tm] of batch) {
    if (!left) break;
    if (__SWARM.done.has(o)) continue;
    __SWARM.done.add(o);
    left--;
    __SWARM.n++;
    const prevTM = gl.toneMapping,
      prevRT = gl.getRenderTarget();
    try {
      scene === vm && (vm.environment = st.scene.environment);
      tm != null && (gl.toneMapping = tm);
      // for where it is drawn: the first-person view to the screen, the world into the effect chain's target
      // (compiled for the screen, characters and guns got shaders never used: slow on phones)
      gl.setRenderTarget(scene !== vm && typeof __SMOOTH < 'u' && __SMOOTH.rt ? __SMOOTH.rt : null);
      o.updateMatrixWorld(!0);
      __withoutVm(scene, () => { for (const x of __hasLight(o) ? __lightFree(o) : [o]) gl.compileAsync(x, st.camera, scene).catch(() => {}); });
    } catch (e) {
    } finally {
      gl.toneMapping = prevTM;
      gl.setRenderTarget(prevRT);
    }
  }
}
// No match at all (phones run none behind the menus) and not the operator studio: the 3D view is behind opaque
// menu pages, so nothing is drawn on the main renderer, from its very first frame (setting the frame loop to
// 'demand' still drew that first frame: the whole effect chain compiled, some 55 shaders, a second each on an
// iPhone). Its shaders compile under the match's loading screen. Menu previews use a renderer of their own.
function __spdIdle() {
  try {
    return !eA.state && Zw.getState().screen !== 'studio';
  } catch (e) {
    return !1;
  }
}
function __spdIdleGuard(gl) {
  if (!gl || gl.__bpIdleGuard) return;
  gl.__bpIdleGuard = 1;
  const r = gl.render;
  gl.render = function () {
    if (__spdIdle()) return;
    return r.apply(this, arguments);
  };
}
function __spdTick() {
  const g = typeof __R3F < 'u' && __R3F;
  if (!g) return;
  // (no match at all, as on phones, which run none behind the menus: the 3D view was still drawn every frame
  // behind the opaque menu pages, effects and all, compiling some 55 shaders in the first seconds (a second each
  // on an iPhone: the menus stuttered). It is drawn only when asked now ('idle'); the operator studio keeps its
  // frames. A match's shaders compile under its loading screen.)
  const st = g.get ? g.get() : g,
    want = eA.attract ? 'menu' : !eA.state && Zw.getState().screen !== 'studio' ? 'idle' : eA.paused ? 'pause' : '';
  if (want !== __SPD.mode) {
    __SPD.mode = want;
    st.setFrameloop(want ? 'demand' : 'always');
    st.gl.shadowMap.autoUpdate = want !== 'menu' && want !== 'idle';
    st.gl.shadowMap.needsUpdate = !0;
    // into a match: the resolution this machine settled on the last time it played this map at this quality
    // (full resolution the first time); dynamic resolution takes over from there. Leaving a match: remember
    // where it settled.
    const z = Zw.getState(),
      full = Pt(z.quality),
      D = eA.__dyn;
    if (!want) {
      __SPD.dynKey = z.map + ':' + z.quality + ':' + Math.round(full * 100);
      const start = eA.settings.dynamicRes ? Math.min(full, Math.max(full * 0.65, __spdLearn()[__SPD.dynKey] || full)) : full;
      eA.__dynStart = start;
      D && ((D.dpr = start), (D.lo = D.hi = 0), (D.wait = 1e4), (D.dropAt = performance.now()));
      st.setDpr(start);
    } else if (__SPD.dynKey && D && D.dpr > 0) {
      const L = __spdLearn();
      L[__SPD.dynKey] = D.dpr;
      try {
        localStorage.setItem('bp-dyn-v1', JSON.stringify(L));
      } catch (e) {}
      __SPD.dynKey = '';
      (want === 'menu' || want === 'idle') && (eA.__dynStart = 0);
    }
  }
  if (!want) {
    // the first minute and a half of a match: anything that loaded since the menus (other characters, the
    // guns bots carry) is compiled in the background as soon as it is loaded, not on the frame it first
    // comes into view (a hitch in the middle of a fight)
    const m = eA.state;
    m !== __SPD.match && ((__SPD.match = m), (__SPD.matchAt = performance.now()));
    // only where the browser compiles shaders in the background (KHR_parallel_shader_compile); elsewhere a
    // compile blocks the frame, so it is better left to the moment it is actually needed
    __SPD.kpc === void 0 && (__SPD.kpc = !!st.gl.extensions.has('KHR_parallel_shader_compile'));
    if (m && __SPD.kpc && performance.now() - __SPD.matchAt < 9e4)
      try {
        __spdWarm(st);
      } catch (e) {}
    return;
  }
  if (want === 'menu') {
    ++__SPD.n % 30 === 0 && (st.gl.shadowMap.needsUpdate = !0);
    try {
      __spdWarm(st);
    } catch (e) {}
    // the menus' background match: two seconds of frames to settle, then a still (redrawn once a second).
    // Nothing behind the dark overlay needs to move, and its bots, physics and drawing were what made the
    // menus slow to click through (the simulation only advances on rendered frames)
    __SPD.menuN = __SPD.mode === 'menu' && __SPD.menuMode ? __SPD.menuN + 1 : 0;
    __SPD.menuMode = 1;
    if (__SPD.menuN > 60 && __SPD.menuN % 30) return;
  } else __SPD.menuMode = 0;
  st.invalidate();
}
typeof window < 'u' &&
  (setInterval(() => {
    try {
      __spdTick();
    } catch (e) {}
  }, 1000 / 30),
  (window.__bpSpeed = () => {
    const st = __R3F && (__R3F.get ? __R3F.get() : __R3F);
    return { warmed: __SWARM.n, mode: __SPD.mode, frameloop: st && st.frameloop, dpr: st && st.viewport.dpr };
  }));
