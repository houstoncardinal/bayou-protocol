/* ===== Bayou Protocol mod: match loading screen ===== */
// Pressing Deploy switched straight to the match while the map was still arriving: for 1-6 seconds you saw a
// white, fogged, empty scene (the map's own geometry, textures and models not in yet), players floating in it,
// the gun in its unloaded pose, and the first frames of each new material stalling while its shader compiled.
// Now a loading screen covers the match until it is ready to play:
//   - every texture and model request in flight is counted (the loading manager all loaders report to);
//     ready once none has been pending for 0.35 s
//   - the maps that build their own scenery wait for it: Blackwater (bp-prison), the cinema (bp-cinema), Frostline (bp-frostline),
//     Ridgeback Pass (bp-ridgeback)
//   - then every material in the scene is compiled (compileAsync: in parallel, off the main thread where the
//     browser can), two frames are drawn, and the screen fades out
//   - offline, the match is paused underneath (no one is shot, the round clock waits); online it runs on
// A map's assets also start loading as soon as it is chosen in the menus, so most of the wait is gone by the
// time you press Deploy. The screen never stays longer than 30 s.
const __LD = { pending: 0, quietAt: 0, cover: null, state: null, step: '', t0: 0, total: 0, done: 0, paused: !1 };
// count the loads in flight
{
  const mgr = n3,
    start = mgr.itemStart,
    end = mgr.itemEnd,
    error = mgr.itemError;
  mgr.itemStart = function (u) {
    __LD.pending++;
    __LD.total++;
    return start.apply(this, arguments);
  };
  mgr.itemEnd = function (u) {
    __LD.pending = Math.max(0, __LD.pending - 1);
    __LD.done++;
    __LD.pending || (__LD.quietAt = performance.now());
    return end.apply(this, arguments);
  };
  mgr.itemError = function (u) {
    return error.apply(this, arguments);
  };
}
const __ldBusy = () => __LD.pending > 0 || (typeof __GLQ < 'u' && (__GLQ.active > 0 || __GLQ.q.length > 0));
// the scenery a map builds for itself
const __LD_VIEW = { prison: 'bp-prison', frostline: 'bp-frostline', ridgeback: 'bp-ridgeback', cinema: 'bp-cinema', fortress: 'bp-fortress' };
function __ldCover(m) {
  if (typeof document > 'u') return null;
  let el = __LD.cover;
  if (!el) {
    el = document.createElement('div');
    el.className = 'bp-loading';
    el.innerHTML =
      '<div class="bp-ld-in"><div class="bp-ld-kick">DEPLOYING</div><div class="bp-ld-name"></div><div class="bp-ld-blurb"></div><div class="bp-ld-bar"><i></i></div><div class="bp-ld-step"></div><div class="bp-ld-tip"></div></div>' +
      '<style>.bp-loading{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#1b2433 0%,#0b0f17 70%);font-family:"Chakra Petch","Barlow",sans-serif;color:#efe9da;transition:opacity .35s ease;pointer-events:all}' +
      '.bp-loading.out{opacity:0;pointer-events:none}.bp-ld-in{width:min(560px,86vw);text-align:left}' +
      '.bp-ld-kick{font-size:12px;letter-spacing:.3em;color:#d9b36a;font-weight:700}.bp-ld-name{font-size:44px;font-weight:800;letter-spacing:.02em;line-height:1.05;margin:6px 0 10px;text-transform:uppercase}' +
      '.bp-ld-blurb{font-size:14px;line-height:1.5;color:#b9b3a6;min-height:42px}.bp-ld-bar{height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin:22px 0 10px;overflow:hidden}' +
      '.bp-ld-bar i{display:block;height:100%;width:4%;background:linear-gradient(90deg,#c8964a,#f0d18c);transition:width .25s ease}.bp-ld-step{font-size:12px;letter-spacing:.14em;color:#8d8778;text-transform:uppercase}' +
      '.bp-ld-tip{margin-top:26px;font-size:13px;color:#cfc6b0;line-height:1.5;border-left:2px solid #d9b36a;padding-left:12px}</style>';
    document.body.appendChild(el);
    __LD.cover = el;
  }
  const info = (typeof BD < 'u' && BD.find((b) => b.id === m.id)) || {};
  el.querySelector('.bp-ld-name').textContent = info.name || m.name || 'Loading';
  el.querySelector('.bp-ld-blurb').textContent = info.blurb || '';
  const st = eA.state,
    tip = st && st.jb ? 'Jailbreak: Terrorists hold E at a cell lock to cut it, then lead the inmate to the getaway van in the visitor lot. Counter-Terrorists hold the cells until time runs out.' : st && st.mode === 'bomb' ? 'Bomb Defusal: buy in the first seconds of the round (B). Terrorists plant at A or B; Counter-Terrorists defuse.' : 'Press E to open and close doors. Hold Tab for the scoreboard.';
  el.querySelector('.bp-ld-tip').textContent = tip;
  el.classList.remove('out');
  el.style.display = 'flex';
  return el;
}
function __ldShow(m) {
  __LD.t0 = performance.now();
  __LD.total = __LD.pending;
  __LD.done = 0;
  __LD.step = 'Loading the map';
  __LD.compiling = !1;
  __LD.ready = !1;
  __ldCover(m);
  // offline: the match waits under the cover
  if (!eA.net && !eA.paused) (eA.paused = !0), (__LD.paused = !0);
}
function __ldHide() {
  __LD.state = 'shown';
  __LD.paused && ((eA.paused = !1), (__LD.paused = !1));
  const el = __LD.cover;
  if (!el) return;
  el.classList.add('out');
  setTimeout(() => el.classList.contains('out') && (el.style.display = 'none'), 400);
}
// each frame (inside the canvas): start the cover for a new match, check readiness, compile, reveal
function __ldTick(s) {
  const st = eA.state,
    playing = st && !eA.attract && Zw.getState().screen === 'playing';
  if (!playing) {
    __LD.match = null;
    if (__LD.cover && __LD.cover.style.display !== 'none' && !__LD.cover.classList.contains('out')) __ldHide();
    return;
  }
  if (__LD.match !== st) {
    __LD.match = st;
    __LD.state = 'loading';
    __ldShow(aw());
  }
  if (__LD.state !== 'loading') return;
  const now = performance.now(),
    m = aw(),
    el = __LD.cover,
    want = __LD_VIEW[m.id];
  let view = !want;
  if (want) s.scene.traverse((o) => o.name === want && (view = !0));
  m.id === 'ridgeback' && typeof __RB < 'u' && __RB.viewLoading && (view = !1);
  const busy = __ldBusy(),
    quiet = !busy && now - __LD.quietAt > 350,
    frac = __LD.total ? __LD.done / Math.max(__LD.total, __LD.done + __LD.pending) : 1;
  if (el) {
    el.querySelector('.bp-ld-bar i').style.width = Math.round(8 + 80 * Math.min(1, frac) + (view ? 6 : 0) + (__LD.compiling ? 6 : 0)) + '%';
    el.querySelector('.bp-ld-step').textContent = __LD.compiling ? 'Preparing shaders' : busy ? `Loading textures and models (${__LD.done} / ${Math.max(__LD.total, __LD.done + __LD.pending)})` : !view ? 'Building the map' : 'Almost there';
  }
  if (now - __LD.t0 > 30000) return __ldHide();
  if (__LD.ready) return;
  if (!quiet || !view || __LD.compiling) return;
  // compile every material in the scene before the first frame is shown
  __LD.compiling = !0;
  const fin = () => {
    let n = 0;
    const two = () => (++n < 3 ? requestAnimationFrame(two) : ((__LD.ready = !0), __ldHide()));
    requestAnimationFrame(two);
  };
  try {
    s.gl.compileAsync ? s.gl.compileAsync(s.scene, s.camera).then(fin, fin) : (s.gl.compile(s.scene, s.camera), fin());
  } catch (e) {
    fin();
  }
}
{
  const prevTrees = kwA;
  kwA = function () {
    QI((s) => {
      try {
        __ldTick(s);
      } catch (e) {}
    });
    return M.jsx(prevTrees, {});
  };
}
// start loading a map's own assets as soon as it is chosen (menus), not when the match begins
{
  const pre = (map) => {
    try {
      map === 'prison' && (__prLoad(), __prsLoad());
      map !== 'prison' && __PR_KITS[map] && __prLoad(__PR_KITS[map]);
      map === 'frostline' && __flLoad();
    } catch (e) {}
  };
  try {
    let last = '';
    Zw.subscribe((st) => {
      st.map !== last && ((last = st.map), setTimeout(() => pre(last), 300));
    });
    setTimeout(() => pre(Zw.getState().map), 1500);
  } catch (e) {}
}
typeof window < 'u' && (window.__bpLoading = () => ({ state: __LD.state, pending: __LD.pending, glq: typeof __GLQ < 'u' ? [__GLQ.active, __GLQ.q.length] : null, ms: Math.round(performance.now() - __LD.t0), compiling: __LD.compiling }));
