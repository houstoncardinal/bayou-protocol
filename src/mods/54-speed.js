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
{
  const corePt = Pt;
  Pt = function () {
    const v = corePt.apply(this, arguments);
    return eA.attract ? Math.min(v, 0.6) : v;
  };
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
    const prevTM = gl.toneMapping;
    try {
      scene === vm && (vm.environment = st.scene.environment);
      tm != null && (gl.toneMapping = tm);
      o.updateMatrixWorld(!0);
      gl.compileAsync(o, st.camera, scene).catch(() => {});
    } catch (e) {
    } finally {
      gl.toneMapping = prevTM;
    }
  }
}
function __spdTick() {
  const g = typeof __R3F < 'u' && __R3F;
  if (!g) return;
  const st = g.get ? g.get() : g,
    want = eA.attract ? 'menu' : eA.paused ? 'pause' : '';
  if (want !== __SPD.mode) {
    __SPD.mode = want;
    st.setFrameloop(want ? 'demand' : 'always');
    st.gl.shadowMap.autoUpdate = want !== 'menu';
    st.gl.shadowMap.needsUpdate = !0;
    // into a match: full resolution straight away (dynamic resolution takes over from there)
    want || st.setDpr(Pt(Zw.getState().quality));
  }
  if (!want) {
    // the first minute and a half of a match: anything that loaded since the menus (other characters, the
    // guns bots carry) is compiled in the background as soon as it is loaded, not on the frame it first
    // comes into view (a hitch in the middle of a fight)
    const m = eA.state;
    m !== __SPD.match && ((__SPD.match = m), (__SPD.matchAt = performance.now()));
    if (m && performance.now() - __SPD.matchAt < 9e4)
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
  }
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
