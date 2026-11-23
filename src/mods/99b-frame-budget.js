/* ===== Bayou Tactical mod: frame budget (the main thread's per-frame work, trimmed) ===== */
// A profile of a live match (10 bots, High) put about a third of the main thread in three.js itself: about 15% in
// working out every object's matrices every frame, the rest in issuing draw calls. Physics, bots and pathfinding
// together were about 1%. This file holds the measurements (window.__bpFrame()) and the fixes.
const __FB = { err: null, pools: 0, skipped: 0 };
// ---------------------------------------------------------------- 1. hidden effect pools: no matrix work
// The engine keeps pools of effect objects ready (tracers, impact sprites, smoke, debris, sparks: about 1,600
// of the scene's 2,750 objects in a match), hidden until used. three.js recomputed every one's matrices every
// frame anyway. A group that is mostly such objects is marked as a pool, and its hidden childless members are
// passed over; one shown again is worked out in the same frame (before it is drawn), as it always set its own
// position first. Only pool groups are touched: hidden meshes used for anything else are left as they were.
{
  // set on each pool group itself (every other object keeps three.js's own method, with no extra call)
  function poolUMW(force) {
    this.matrixAutoUpdate && this.updateMatrix();
    if (this.matrixWorldNeedsUpdate || force) {
      this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix));
      this.matrixWorldNeedsUpdate = !1;
      force = !0;
    }
    const ch = this.children;
    for (let i = 0, l = ch.length; i < l; i++) {
      const c = ch[i];
      if (c.visible === !1 && c.matrixAutoUpdate && c.children.length === 0 && (c.isSprite || c.isPoints || (c.isMesh && !c.isSkinnedMesh) || c.isLine)) {
        // its world matrix must be redone when it is next shown, even if nothing above it moved
        c.matrixWorldNeedsUpdate = !0;
        continue;
      }
      c.updateMatrixWorld(force);
    }
  }
  const leafFx = (o) => o.children.length === 0 && (o.isSprite || o.isPoints || o.isLine || (o.isMesh && !o.isSkinnedMesh));
  // find the pools (a few levels under the scene): 24+ children, at least 80% childless effect objects
  const mark = (o, depth) => {
    const ch = o.children;
    if (ch.length >= 24) {
      let fx = 0;
      for (const c of ch) leafFx(c) && fx++;
      if (fx >= ch.length * 0.8) return void (o.__fbPool || ((o.__fbPool = 1), (o.updateMatrixWorld = poolUMW), (__FB.poolFn = poolUMW), __FB.pools++));
    }
    if (depth < 3) for (const c of ch) c.isGroup || c.type === 'Object3D' ? mark(c, depth + 1) : 0;
  };
  typeof window < 'u' &&
    setInterval(() => {
      try {
        const sc = typeof __SMOOTH < 'u' && __SMOOTH.scene;
        sc && mark(sc, 0);
      } catch (e) {
        __FB.err = String(e && e.stack);
      }
    }, 2000);
}
// ---------------------------------------------------------------- 2. shadows: the middle cascade every other pass
// Shadows were more than half the main view's draw calls (about 250 of 450 a frame). High: the far cascade was
// already redrawn every other pass; the middle one (11-40 m) now takes the other passes, so each frame draws
// the near cascade (round the player, where shadows are looked at closely: still every frame) and one of the
// other two. At 60 fps and over the further shadows still update 30+ times a second.
// Medium (and High on a base Apple M chip or integrated graphics, which get Medium's two cascades): the outer
// cascade (13-56 m) every other pass.
if (typeof __SH_TIERS < 'u') {
  __SH_TIERS.high && __SH_TIERS.high[1] && (__SH_TIERS.high[1].every = 2);
  __SH_TIERS.medium && __SH_TIERS.medium[1] && (__SH_TIERS.medium[1].every = 2);
}
// ---------------------------------------------------------------- measuring
typeof window < 'u' &&
  (window.__bpFrame = () => {
    const sc = typeof __SMOOTH < 'u' && __SMOOTH.scene;
    if (!sc) return null;
    const rows = [];
    let all = 0,
      auto = 0,
      worldAuto = 0,
      bones = 0;
    for (const top of sc.children) {
      let n = 0,
        a = 0,
        w = 0,
        b = 0;
      top.traverse((o) => {
        n++;
        o.matrixAutoUpdate && a++;
        o.matrixWorldAutoUpdate && w++;
        o.isBone && b++;
      });
      const t0 = performance.now();
      for (let i = 0; i < 5; i++) top.updateMatrixWorld(!0);
      rows.push({ name: top.name || top.type, n, auto: a, worldAuto: w, bones: b, ms: +((performance.now() - t0) / 5).toFixed(3) });
      all += n;
      auto += a;
      worldAuto += w;
      bones += b;
    }
    rows.sort((x, y) => y.ms - x.ms);
    return { all, auto, worldAuto, bones, pools: __FB.pools, sceneAuto: sc.matrixAutoUpdate, top: rows.slice(0, 14), err: __FB.err };
  });
// what each top-level group holds (names and types of its first meshes), and how many times per frame the
// renderer draws a scene (each draw recomputes that scene's matrices)
typeof window < 'u' &&
  (window.__bpFrameWho = () => {
    const sc = typeof __SMOOTH < 'u' && __SMOOTH.scene;
    if (!sc) return null;
    return sc.children
      .map((top) => {
        let n = 0;
        const names = new Map();
        top.traverse((o) => {
          n++;
          const k = (o.name || '') + ':' + o.type;
          names.set(k, (names.get(k) || 0) + 1);
        });
        return { n, kinds: [...names].sort((a, b) => b[1] - a[1]).slice(0, 6) };
      })
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  });
typeof window < 'u' &&
  (window.__bpRenders = (ms = 2000) =>
    new Promise((res) => {
      const g = typeof __R3F < 'u' && __R3F,
        st = g && (g.get ? g.get() : g),
        gl = st && st.gl;
      if (!gl) return res(null);
      const prev = gl.render,
        by = new Map(),
        smR = gl.shadowMap.render;
      let smC = 0,
        smMs = 0,
        smN = 0;
      gl.shadowMap.render = function () {
        const c0 = gl.info.render.calls,
          t = performance.now(),
          r = smR.apply(this, arguments);
        smC += gl.info.render.calls - c0;
        smMs += performance.now() - t;
        smN++;
        return r;
      };
      let frames = 0;
      gl.render = function (scene, cam) {
        const rt = this.getRenderTarget(),
          k = (scene === __SMOOTH.scene ? 'MAIN' : scene && (scene.name || scene.type)) + (scene && scene.overrideMaterial ? '+override' : '') + (rt ? ' rt' + rt.width + 'x' + rt.height : ' screen') + ' cam:' + (cam && cam.type);
        by.set(k, (by.get(k) || 0) + 1);
        const c0 = this.info.render.calls,
          sh = this.shadowMap.enabled && (this.shadowMap.autoUpdate || this.shadowMap.needsUpdate),
          r = prev.apply(this, arguments);
        if (scene === __SMOOTH.scene) {
          const d = this.info.render.calls - c0;
          calls += d;
          sh ? (shN++, (shC += d)) : (noN++, (noC += d));
        }
        return r;
      };
      let calls = 0,
        shN = 0,
        shC = 0,
        noN = 0,
        noC = 0;
      const tick = () => (frames++, performance.now() - t0 < ms ? requestAnimationFrame(tick) : done());
      const t0 = performance.now();
      requestAnimationFrame(tick);
      const done = () => {
        gl.render = prev;
        gl.shadowMap.render = smR;
        res({ shadowCalls: Math.round(smC / frames), shadowMs: +(smMs / frames).toFixed(2), shadowRenders: +(smN / frames).toFixed(2), frames, mainCalls: Math.round(calls / frames), withShadowUpdate: shN ? Math.round(shC / shN) : null, withoutShadowUpdate: noN ? Math.round(noC / noN) : null, shadowFrames: shN, autoReset: gl.info.autoReset, perFrame: [...by].map(([k, v]) => [k, +(v / frames).toFixed(2)]).sort((a, b) => b[1] - a[1]) });
      };
    }));
// long frames (Chrome's long-animation-frame entries): which scripts ran in them, by source position
typeof window < 'u' &&
  (window.__bpLongFrames = (ms = 12000, over = 20) =>
    new Promise((res) => {
      if (typeof PerformanceObserver > 'u' || !PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) return res(null);
      const out = [];
      const po = new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          e.duration >= over &&
            out.push({
              dur: Math.round(e.duration),
              render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0),
              block: Math.round(e.blockingDuration || 0),
              scripts: (e.scripts || []).map((s) => ({ d: Math.round(s.duration), fn: s.sourceFunctionName, url: (s.sourceURL || '').replace(/^.*\//, ''), pos: s.sourceCharPosition, inv: s.invoker, type: s.invokerType, forced: Math.round(s.forcedStyleAndLayoutDuration || 0) })),
            });
      });
      po.observe({ type: 'long-animation-frame', buffered: !1 });
      setTimeout(() => (po.disconnect(), res(out)), ms);
    }));
// A/B: the whole scene's matrix pass, with the pool groups' own method and without (n passes each)
typeof window < 'u' &&
  (window.__bpPoolAB = (n = 300) => {
    const sc = typeof __SMOOTH < 'u' && __SMOOTH.scene;
    if (!sc) return null;
    const pools = [];
    sc.traverse((o) => o.__fbPool && pools.push(o));
    const time = () => {
      const t = performance.now();
      for (let i = 0; i < n; i++) sc.updateMatrixWorld(!0);
      return +(((performance.now() - t) / n) * 1000).toFixed(0);
    };
    time();
    const on = time();
    for (const o of pools) delete o.updateMatrixWorld;
    const off = time();
    for (const o of pools) __FB.poolFn && (o.updateMatrixWorld = __FB.poolFn);
    return { pools: pools.length, usPerPassWithPools: on, usPerPassWithout: off };
  });
// the number of shader programs (for tracing when they are made)
typeof window < 'u' &&
  (window.__bpProg = () => {
    const g = typeof __R3F < 'u' && __R3F,
      st = g && (g.get ? g.get() : g);
    return st && st.gl.info.programs ? st.gl.info.programs.length : -1;
  });
typeof window < 'u' &&
  (window.__bpProgList = () => {
    const g = typeof __R3F < 'u' && __R3F,
      st = g && (g.get ? g.get() : g);
    return st && st.gl.info.programs ? st.gl.info.programs.map((x) => ({ id: x.id, name: x.name, key: String(x.cacheKey).slice(0, 80), full: String(x.cacheKey), users: x.usedTimes })) : [];
  });
// what the loading screen is waiting for: the map's own scenery (by name) and its loader's state
typeof window < 'u' &&
  (window.__bpViewState = () => {
    const sc = typeof __SMOOTH < 'u' && __SMOOTH.scene,
      m = aw(),
      want = typeof __LD_VIEW < 'u' && __LD_VIEW[m.id];
    let found = !1;
    sc && want && sc.traverse((o) => o.name === want && (found = !0));
    return { map: m.id, want, found, fl: typeof __FL < 'u' ? { ready: __FL.ready, loading: __FL.loading, rev: __FL.rev, subs: __FL.subs.size } : null, ld: typeof __LD < 'u' ? { state: __LD.state, quietAt: Math.round(performance.now() - __LD.quietAt), pending: __LD.pending } : null };
  });
// spikes: for ms milliseconds, time every per-frame callback and every draw; report what ran long in the frames
// that took over `over` ms (each callback named by the start of its source)
typeof window < 'u' &&
  (window.__bpFrameSpikes = (ms = 10000, over = 30) =>
    new Promise((res) => {
      const g = typeof __R3F < 'u' && __R3F,
        st = g && (g.get ? g.get() : g);
      if (!st) return res(null);
      const subs = st.internal.subscribers,
        wrapped = [],
        cur = new Map(),
        add = (k, d) => cur.set(k, (cur.get(k) || 0) + d);
      for (const s of subs) {
        const r = s.ref,
          fn = r.current,
          name = String(fn).replace(/\s+/g, ' ').slice(0, 90);
        r.current = function () {
          const t = performance.now();
          try {
            return fn.apply(this, arguments);
          } finally {
            add('cb ' + name, performance.now() - t);
          }
        };
        wrapped.push([r, fn]);
      }
      const gl = st.gl,
        rr = gl.render;
      gl.render = function (scene, cam) {
        const t = performance.now();
        try {
          return rr.apply(this, arguments);
        } finally {
          add('render ' + (scene === __SMOOTH.scene ? 'MAIN' : (scene && (scene.name || scene.type)) + (cam && cam.isOrthographicCamera ? '/ortho' : '')), performance.now() - t);
        }
      };
      const spikes = [],
        tot = new Map();
      let last = performance.now(),
        frames = 0;
      const tick = () => {
        const n = performance.now(),
          dt = n - last;
        last = n;
        frames++;
        for (const [k, v] of cur) tot.set(k, (tot.get(k) || 0) + v);
        if (dt > over) spikes.push({ dt: Math.round(dt), top: [...cur].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => [Math.round(v), k]) });
        cur.clear();
        n - t0 < ms ? requestAnimationFrame(tick) : done();
      };
      const t0 = performance.now();
      requestAnimationFrame(tick);
      const done = () => {
        gl.render = rr;
        for (const [r, fn] of wrapped) r.current = fn;
        res({ frames, spikes, avg: [...tot].map(([k, v]) => [+(v / frames).toFixed(2), k]).sort((a, b) => b[0] - a[0]).slice(0, 12) });
      };
    }));
// ---------------------------------------------------------------- 3. the frame governor
// On a big, sharp screen (a Retina laptop: 2-3 million pixels drawn a frame) a match is held by the graphics card,
// not the main thread: dropped frames there were frames the card had not finished. Dynamic resolution (the core)
// only reacted on a fast screen (100 Hz and over) below 55% of its refresh rate: anything from 66 to 110 frames a
// second on a 120 Hz screen passed as fine, and stuttered. Now:
//   - the target is 80% of the screen's refresh on fast screens (96 at 120 Hz), 95% on 60 Hz ones; resolution
//     drops below it (a core change), and
//   - before resolution, effects that cost the card much and are seen least are switched off, one each 2 s of
//     missing the target: reflections, then light shafts, then the far shadows redrawn every third pass. None of
//     them changes a shader (no compile, no hitch). With room to spare for 8 s at full resolution, they come back
//     one at a time, the last switched off first.
// window.__bpGovernor() reports it; localStorage bp-governor = '0' turns it off.
const __GOV = { step: 0, acc: 0, n: 0, last: 0, low: 0, high: 0, at: 0, R: 60, on: !0 };
try {
  __GOV.on = localStorage.getItem('bp-governor') !== '0';
} catch (e) {}
const __GOV_STEPS = ['ssr', 'rays', 'shadow3'];
function __govApply() {
  const parts = __GOV_STEPS.slice(0, __GOV.step);
  // the realism switches (97-realism.js reads them every frame)
  // (plus what a device profile leaves off for good: window.__fxBase, e.g. SMAA on phones: 99d-phone.js)
  window.__fxOff = [window.__fxBase || '', ...parts.filter((p) => p !== 'shadow3')].filter(Boolean).join(',');
  // the outer cascade: every 2nd pass normally, every 3rd at the last step (phones: every 3rd, then 4th)
  const ph = typeof __PHONE < 'u' && __PHONE,
    ev = (parts.includes('shadow3') ? 3 : 2) + (ph ? 1 : 0);
  if (typeof __SH_TIERS < 'u') for (const t of ['high', 'medium']) __SH_TIERS[t] && __SH_TIERS[t][__SH_TIERS[t].length - 1] && (__SH_TIERS[t][__SH_TIERS[t].length - 1].every = ev);
}
function __govTick(t) {
  requestAnimationFrame(__govTick);
  const dt = (t - __GOV.last) / 1e3;
  __GOV.last = t;
  let z;
  try {
    z = Zw.getState();
  } catch (e) {
    return;
  }
  const live = __GOV.on && eA.running && eA.state && !eA.attract && !eA.paused && !document.hidden && z.screen === 'playing' && z.quality !== 'low';
  // the screen's refresh rate: measured in the menus, where a frame costs little and the browser runs at the
  // screen's own rate (in a match the card may be what sets the pace, which says nothing about the screen)
  if (!live) {
    __GOV.acc = __GOV.n = 0;
    if (document.hidden || !(dt > 0) || dt > 0.1) return void (__GOV.racc = __GOV.rn = 0);
    __GOV.racc = (__GOV.racc || 0) + dt;
    __GOV.rn = (__GOV.rn || 0) + 1;
    if (__GOV.racc >= 1) {
      const r = __GOV.rn / __GOV.racc;
      // to the nearest common rate (60, 75, 90, 100, 120, 144, 165, 240)
      const rates = [60, 75, 90, 100, 120, 144, 165, 240],
        near = rates.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 60);
      Math.abs(near - r) < near * 0.08 && near > __GOV.R && (__GOV.R = near);
      __GOV.racc = __GOV.rn = 0;
    }
    return;
  }
  if (!(dt > 0) || dt > 0.25) return void (__GOV.acc = __GOV.n = 0);
  // a new match starts at full quality; its first 10 s are loading hitches, not the machine's pace
  if (eA.state !== __GOV.match) (__GOV.match = eA.state), (__GOV.at = t), (__GOV.step = 0), (__GOV.low = __GOV.high = 0), __govApply();
  if (t - __GOV.at < 1e4) return void (__GOV.acc = __GOV.n = 0);
  __GOV.acc += dt;
  __GOV.n++;
  if (__GOV.acc < 1) return;
  const fps = __GOV.n / __GOV.acc;
  __GOV.acc = __GOV.n = 0;
  __GOV.fps = Math.round(fps);
  __GOV.R = Math.max(__GOV.R, Math.min(240, fps));
  // dynamic resolution judges against the same refresh rate (its own guess was the best rate seen in the match)
  eA.__dyn && (eA.__dyn.R = Math.max(eA.__dyn.R || 60, __GOV.R));
  const goal = __GOV.R > 100 ? __GOV.R * 0.8 : __GOV.R * 0.95,
    D = eA.__dyn,
    full = typeof Pt < 'u' ? Pt(z.quality) : 1,
    atFull = !D || !(D.dpr < full - 0.01);
  __GOV.goal = Math.round(goal);
  if (fps < goal) (__GOV.low++, (__GOV.high = 0));
  else if (fps > goal * 1.12) (__GOV.high++, (__GOV.low = 0));
  else __GOV.low = __GOV.high = 0;
  if (__GOV.low >= 2 && __GOV.step < __GOV_STEPS.length) {
    __GOV.step++;
    __GOV.low = 0;
    __govApply();
    // this second's shortfall is the effects' to answer, not the resolution's
    D && (D.lo = 0);
  } else if (__GOV.high >= 8 && __GOV.step > 0 && atFull) {
    __GOV.step--;
    __GOV.high = 0;
    __govApply();
  }
}
typeof window < 'u' && requestAnimationFrame(__govTick);
typeof window < 'u' &&
  (window.__bpGovernor = (on) => {
    if (on === !1 || on === !0) {
      __GOV.on = on;
      on || ((__GOV.step = 0), __govApply());
    }
    const D = eA.__dyn;
    return { on: __GOV.on, fps: __GOV.fps, goal: __GOV.goal, refresh: Math.round(__GOV.R), off: __GOV_STEPS.slice(0, __GOV.step), resolution: D && +D.dpr.toFixed(2) };
  });
// ---------------------------------------------------------------- 4. other players' guns: no rebuild storms
// Each player seen in third person holds a copy of a gun built for it (merged into a few meshes) and cached by
// weapon and attachments. The cache key also carried Gc, a counter the weapon files raise whenever any gun, rig,
// arms or grenade model finishes loading, and those stream in during the first minute of a match. Every rise threw
// the whole cache away, and every player on screen rebuilt its gun in the same frame: 5-38 ms each, 20-33 ms
// stalls about ten times a match. Now a gun's cache entry is keyed on the models that gun is actually built from,
// so a rise only costs a cheap copy. Guns players carry but have not drawn yet, then the guns bots can buy, are
// built ahead, one per idle moment.
const __TP = { built: 0, warmed: 0, q: [], pend: !1 };
{
  const ids = new WeakMap();
  let n = 0;
  const tok = (o) => {
    if (!o) return 0;
    let k = ids.get(o);
    k || ids.set(o, (k = ++n));
    return k;
  };
  // what wG builds this gun from (everything else it uses is made in code and never changes)
  const fp = (w) => {
    const x = typeof __XG < 'u' && __XG[w];
    let s = '' + tok(x && x.tpl);
    x && x.fb && __XG[x.fb] && (s += '.' + tok(__XG[x.fb].tpl));
    w === 'hk416' && (s += 'b' + tok(Bs));
    w === 'grenade' && typeof __FRAG < 'u' && (s += 'f' + tok(__FRAG.tpl));
    return s;
  };
  const key = (w, A) => `${w}:${+A.optic}${+A.suppressor}${+A.extmag}:${fp(w)}`;
  const build = (w, A, k) => {
    MV ?? (MV = AG());
    let I = wG(w, A, MV);
    I = { ...I, group: OAA(I.group) };
    I.group.userData.foregrip = I.foregrip;
    I.group.userData.muzzle = I.muzzle.clone();
    // an older build of the same gun (its model has since loaded) is dropped from the cache
    const pre = k.slice(0, k.lastIndexOf(':') + 1);
    for (const o of fV.keys()) o !== k && o.startsWith(pre) && fV.delete(o);
    fV.set(k, I);
    __TP.built++;
    return I;
  };
  Hd = function (w, A) {
    const k = key(w, A),
      I = fV.get(k) || build(w, A, k),
      B = I.group.clone();
    B.userData = { ...I.group.userData };
    return B;
  };
  // guns the players carry, built before they are drawn: one per idle moment
  const warm = (dl) => {
    __TP.pend = !1;
    while (__TP.q.length) {
      const [w, A] = __TP.q.shift(),
        k = key(w, A);
      if (fV.has(k)) continue;
      if (dl && !dl.didTimeout && dl.timeRemaining() < 6) {
        __TP.q.unshift([w, A]);
        break;
      }
      try {
        build(w, A, k);
        __TP.warmed++;
      } catch (e) {}
      break;
    }
    __TP.q.length && !__TP.pend && ((__TP.pend = !0), requestIdleCallback(warm, { timeout: 1500 }));
  };
  const scan = () => {
    try {
      const st = eA.state;
      if (!st || !st.players || document.hidden) return;
      const want = new Map();
      for (const p of st.players) {
        if (!p || !p.weapons || !p.attach) continue;
        for (const x of Object.values(p.weapons)) {
          const w = x && x.id;
          if (!w) continue;
          const k = key(w, p.attach);
          fV.has(k) || want.has(k) || want.set(k, [w, { optic: !!p.attach.optic, suppressor: !!p.attach.suppressor, extmag: !!p.attach.extmag }]);
        }
      }
      // then, with nothing carried left to build, the guns a bot of each side can buy (the bots' table, each
      // side's own version), for each set of attachments in play
      if (!want.size && !st.attract) {
        const combos = new Map();
        for (const p of st.players) p && p.attach && p.team && combos.set(p.team + (+!!p.attach.optic) + (+!!p.attach.suppressor) + (+!!p.attach.extmag), p);
        const table = typeof J8 < 'u' ? [...new Set([...J8, 'pistol', 'knife'])] : [];
        for (const p of combos.values()) {
          const sw = typeof __ARS < 'u' && __ARS.swap[p.team];
          for (let w of table) {
            sw && sw[w] && (w = sw[w]);
            const k = key(w, p.attach);
            fV.has(k) || want.has(k) || want.set(k, [w, { optic: !!p.attach.optic, suppressor: !!p.attach.suppressor, extmag: !!p.attach.extmag }]);
          }
        }
      }
      __TP.q = [...want.values()];
      __TP.q.length && !__TP.pend && ((__TP.pend = !0), requestIdleCallback(warm, { timeout: 1500 }));
    } catch (e) {}
  };
  typeof window < 'u' && typeof requestIdleCallback == 'function' && setInterval(scan, 400);
  typeof window < 'u' && (window.__bpGuns = () => ({ cached: fV.size, built: __TP.built, warmed: __TP.warmed, queued: __TP.q.length }));
}
// ---------------------------------------------------------------- 5. a ray at a character: only the triangles near it
// Each bullet that hits a player places a wound mark: a short ray is cast at the animated body. three.js tests a ray
// against a skinned mesh triangle by triangle, posing all three corners with their bones first, so one ray at a
// realistic character (tens of thousands of triangles) took 7-24 ms: a stall on every hit. Now each skinned model's
// triangles are grouped once by the bone that moves them and split into small clusters, each with a centre and a
// reach, and a ray tests only the clusters it passes near (each placed by its bone in the current pose). A tested triangle is tested exactly as before (same function, same
// result); the ones left out are too far from the ray to be hit.
const __SR = { on: !0, rays: 0, tested: 0, total: 0, prep: 0 };
{
  const prepOf = new WeakMap(),
    _m = new _A(),
    _v = new U(),
    _p = new U(),
    _q = new U();
  // per geometry: for each bone the triangles it moves (by its strongest weight on any corner) and their reach
  const prep = (mesh) => {
    const g = mesh.geometry,
      sk = mesh.skeleton;
    let P = prepOf.get(g);
    if (P && P.nb === sk.bones.length) return P;
    const t0 = performance.now(),
      idx = g.index,
      pos = g.attributes.position,
      si = g.attributes.skinIndex,
      sw = g.attributes.skinWeight,
      nb = sk.bones.length,
      nv = pos.count,
      nt = idx.count / 3,
      main = new Int32Array(nv);
    for (let i = 0; i < nv; i++) {
      let b = -1,
        w = -1;
      for (let k = 0; k < 4; k++) {
        const x = sw.getComponent(i, k);
        x > w && ((w = x), (b = si.getComponent(i, k)));
      }
      main[i] = b;
    }
    // (triangle, bone) pairs: a triangle goes with each bone that moves one of its corners most
    const pt = [],
      pb = [];
    for (let f = 0; f < nt; f++) {
      const m = f * 3,
        A = main[idx.getX(m)],
        B = main[idx.getX(m + 1)],
        C = main[idx.getX(m + 2)];
      A >= 0 && A < nb && (pt.push(m), pb.push(A));
      B >= 0 && B < nb && B !== A && (pt.push(m), pb.push(B));
      C >= 0 && C < nb && C !== A && C !== B && (pt.push(m), pb.push(C));
    }
    // each pair's corners in its bone's own space (bind pose)
    const n = pt.length,
      X = new Float32Array(n * 9),
      cen = new Float32Array(n * 3),
      M = sk.boneInverses.map((bi) => new _A().multiplyMatrices(bi, mesh.bindMatrix).elements);
    for (let i = 0; i < n; i++) {
      const e = M[pb[i]];
      for (let k = 0; k < 3; k++) {
        const v = idx.getX(pt[i] + k),
          x = pos.getX(v),
          y = pos.getY(v),
          z = pos.getZ(v),
          o = i * 9 + k * 3;
        X[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
        X[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        X[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      }
      for (let c = 0; c < 3; c++) cen[i * 3 + c] = (X[i * 9 + c] + X[i * 9 + 3 + c] + X[i * 9 + 6 + c]) / 3;
    }
    // per bone, split its pairs in halves along the widest axis until a cluster holds 48 or fewer
    const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => pb[p] - pb[q]),
      cb = [],
      cx = [],
      cr = [],
      cs = [],
      tri = [];
    const split = (arr) => {
      if (arr.length > 48) {
        let lx = 1 / 0,
          ly = 1 / 0,
          lz = 1 / 0,
          hx = -1 / 0,
          hy = -1 / 0,
          hz = -1 / 0;
        for (const i of arr) {
          const x = cen[i * 3],
            y = cen[i * 3 + 1],
            z = cen[i * 3 + 2];
          x < lx && (lx = x), y < ly && (ly = y), z < lz && (lz = z), x > hx && (hx = x), y > hy && (hy = y), z > hz && (hz = z);
        }
        const ex = hx - lx,
          ey = hy - ly,
          ez = hz - lz,
          ax = ex > ey ? (ex > ez ? 0 : 2) : ey > ez ? 1 : 2;
        arr.sort((p, q) => cen[p * 3 + ax] - cen[q * 3 + ax]);
        const h = arr.length >> 1;
        split(arr.slice(0, h));
        split(arr.slice(h));
        return;
      }
      let x = 0,
        y = 0,
        z = 0;
      for (const i of arr) (x += cen[i * 3]), (y += cen[i * 3 + 1]), (z += cen[i * 3 + 2]);
      (x /= arr.length), (y /= arr.length), (z /= arr.length);
      let r = 0;
      for (const i of arr)
        for (let k = 0; k < 3; k++) {
          const o = i * 9 + k * 3,
            d = (X[o] - x) ** 2 + (X[o + 1] - y) ** 2 + (X[o + 2] - z) ** 2;
          d > r && (r = d);
        }
      cb.push(pb[arr[0]]), cx.push(x, y, z), cr.push(Math.sqrt(r)), cs.push(tri.length);
      for (const i of arr) tri.push(pt[i]);
    };
    for (let i = 0; i < n; ) {
      let j = i;
      while (j < n && pb[order[j]] === pb[order[i]]) j++;
      split(order.slice(i, j));
      i = j;
    }
    cs.push(tri.length);
    P = { nb, bone: Int32Array.from(cb), cen: Float32Array.from(cx), rad: Float32Array.from(cr), start: Uint32Array.from(cs), tri: Uint32Array.from(tri), seen: new Uint32Array(nt + 1), stamp: 0 };
    prepOf.set(g, P);
    __SR.prep += performance.now() - t0;
    __SR.geos = (__SR.geos || 0) + 1;
    return P;
  };
  const fits = (m) => {
    const g = m.geometry,
      idx = g && g.index,
      dr = g && g.drawRange;
    return !!(idx && m.skeleton && !Array.isArray(m.material) && idx.count >= 6000 && m.bindMode === sY && dr.start === 0 && !(dr.count !== 1 / 0 && dr.count < idx.count) && g.attributes.skinIndex && !g.morphAttributes.position);
  };
  // characters' models are prepared ahead, one per idle moment (in the menus, or under the loading cover), not on
  // the first hit
  {
    let list = [],
      at = 0,
      pend = !1;
    const work = (dl) => {
      pend = !1;
      while (list.length && (!dl || dl.didTimeout || dl.timeRemaining() > 4)) {
        const m = list.shift();
        try {
          const P = prepOf.get(m.geometry);
          (P && P.nb === m.skeleton.bones.length) || prep(m);
        } catch (e) {}
        if (dl && !dl.didTimeout) continue;
        break;
      }
      list.length && !pend && ((pend = !0), requestIdleCallback(work, { timeout: 3000 }));
    };
    typeof window < 'u' &&
      typeof requestIdleCallback == 'function' &&
      setInterval(() => {
        try {
          const sc = typeof __SMOOTH < 'u' && __SMOOTH.scene;
          if (!sc || document.hidden || pend || performance.now() - at < 2000) return;
          at = performance.now();
          const seen = new Set();
          list = [];
          sc.traverse((o) => {
            if (!o.isSkinnedMesh || seen.has(o.geometry) || !fits(o)) return;
            seen.add(o.geometry);
            const P = prepOf.get(o.geometry);
            (P && P.nb === o.skeleton.bones.length) || list.push(o);
          });
          list.length && ((pend = !0), requestIdleCallback(work, { timeout: 3000 }));
        } catch (e) {}
      }, 500);
  }
  const core = Ow.prototype._computeIntersections;
  tZ.prototype._computeIntersections = function (A, out, rayL) {
    const g = this.geometry,
      mat = this.material,
      idx = g.index,
      dr = g.drawRange,
      sk = this.skeleton;
    if (!__SR.on || !fits(this)) return core.call(this, A, out, rayL);
    const P = prep(this);
    // the ray in world space, as a segment (it is short when a ray is: the wound ray is 2.4 m)
    const o = A.ray.origin,
      dir = A.ray.direction,
      len = Math.min(A.far, 1e3);
    const uv = g.attributes.uv,
      uv1 = g.attributes.uv1,
      nrm = g.attributes.normal,
      seen = P.seen,
      st = ++P.stamp === 4294967295 ? (seen.fill(0), (P.stamp = 1)) : P.stamp;
    let tested = 0;
    let lastB = -1,
      sc = 1,
      e = null;
    for (let k = 0, n = P.bone.length; k < n; k++) {
      const b = P.bone[k];
      if (b !== lastB) {
        const bw = sk.bones[b].matrixWorld;
        e = bw.elements;
        sc = bw.getMaxScaleOnAxis();
        lastB = b;
      }
      // the cluster's centre, posed rigidly by its bone
      const x = P.cen[k * 3],
        y = P.cen[k * 3 + 1],
        z = P.cen[k * 3 + 2];
      _p.set(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
      const t = Math.max(0, Math.min(len, _q.copy(_p).sub(o).dot(dir)));
      _q.copy(o).addScaledVector(dir, t);
      // with room for corners bent by a neighbouring bone
      if (_q.distanceTo(_p) > P.rad[k] * sc * 1.1 + 0.1) continue;
      for (let i = P.start[k], j = P.start[k + 1]; i < j; i++) {
        const m = P.tri[i],
          f = m / 3;
        if (seen[f] === st) continue;
        seen[f] = st;
        tested++;
        const h = Y0(this, mat, A, rayL, uv, uv1, nrm, idx.getX(m), idx.getX(m + 1), idx.getX(m + 2));
        h && ((h.faceIndex = f), out.push(h));
      }
    }
    __SR.rays++;
    __SR.tested += tested;
    __SR.total += idx.count / 3;
  };
  // dev check: random rays at every posed character, culled against the full test (same nearest hit?)
  typeof window < 'u' &&
    (window.__bpSkinRayTest = (n = 40) => {
      const sc = __SMOOTH.scene,
        rc = new UZ(),
        ms = [];
      sc.traverse((o) => o.isSkinnedMesh && o.visible && o.geometry.index && o.geometry.index.count >= 6000 && ms.push(o));
      let rays = 0,
        hits = 0,
        bad = 0,
        tFull = 0,
        tCull = 0;
      const c = new U(),
        d = new U(),
        ctr = new U();
      for (const m of ms) {
        m.geometry.boundingSphere || m.geometry.computeBoundingSphere();
        m.updateMatrixWorld(!0);
        m.getWorldPosition(ctr);
        for (let i = 0; i < n; i++) {
          // like the wound ray: level, from 1.2 m out, at a height on the body; plus some from any direction
          const a = Math.random() * Math.PI * 2,
            y = ctr.y + 0.1 + Math.random() * 1.7;
          i % 4 === 3 ? d.randomDirection() : d.set(-Math.cos(a), 0, -Math.sin(a));
          c.set(ctr.x + (Math.random() - 0.5) * 0.3, y, ctr.z + (Math.random() - 0.5) * 0.3).addScaledVector(d, -1.2);
          rc.set(c, d);
          rc.far = 2.4;
          __SR.on = !1;
          let t = performance.now();
          const A = rc.intersectObject(m, !1);
          tFull += performance.now() - t;
          __SR.on = !0;
          t = performance.now();
          const B = rc.intersectObject(m, !1);
          tCull += performance.now() - t;
          rays++;
          A.length && hits++;
          const da = A.length ? A[0].distance : -1,
            db = B.length ? B[0].distance : -1;
          Math.abs(da - db) > 1e-6 && bad++;
        }
      }
      return { meshes: ms.length, rays, hits, mismatches: bad, fullMs: +(tFull / rays).toFixed(2), culledMs: +(tCull / rays).toFixed(3) };
    });
  typeof window < 'u' &&
    (window.__bpSkinRay = (on) => ((on === !1 || on === !0) && (__SR.on = on), { on: __SR.on, rays: __SR.rays, tested: __SR.tested, of: __SR.total, models: __SR.geos || 0, prepMs: +__SR.prep.toFixed(1) }));
}
// ---------------------------------------------------------------- 6. textures sent to the card before they are needed
// A texture goes to the graphics card the first time something using it is drawn; a big one stalls that frame. The
// loading screen sends those of everything in the scene, but things are added later (shown on an event, like the
// bomb when it is dropped: a 0.4 s stall). Every few seconds, the scene's textures never sent yet go one per idle
// moment. (Only never-sent ones: textures redrawn each frame, like screens, are left to their own updates.)
// localStorage bp-texwarm = '0' turns this and the loading screen's hidden-texture upload off.
const __TX = { sent: 0 };
{
  let list = [],
    at = 0,
    pend = !1;
  const store = () => {
    const g = typeof __R3F < 'u' && __R3F;
    return g && (g.get ? g.get() : g);
  };
  const fresh = (gl, t) => t && t.isTexture && t.image && !t.isVideoTexture && !t.isRenderTargetTexture && !gl.properties.get(t).__webglInit;
  const work = (dl) => {
    pend = !1;
    const st = store();
    if (!st) return;
    while (list.length && (dl.didTimeout || dl.timeRemaining() > 6)) {
      const t = list.pop();
      try {
        fresh(st.gl, t) && (st.gl.initTexture(t), __TX.sent++);
      } catch (e) {}
      if (!dl.didTimeout) continue;
      break;
    }
    list.length && ((pend = !0), requestIdleCallback(work, { timeout: 2000 }));
  };
  typeof window < 'u' &&
    typeof requestIdleCallback == 'function' &&
    setInterval(() => {
      try {
        const st = store(),
          sc = typeof __SMOOTH < 'u' && __SMOOTH.scene;
        if (!st || !sc || pend || document.hidden || performance.now() - at < 3000 || localStorage.getItem('bp-texwarm') === '0') return;
        if (typeof __LD < 'u' && __LD.state === 'loading') return;
        at = performance.now();
        const tex = new Set();
        sc.traverse((o) => {
          const ms = o.material;
          if (!ms) return;
          for (const mt of Array.isArray(ms) ? ms : [ms]) if (mt) for (const k in mt) fresh(st.gl, mt[k]) && tex.add(mt[k]);
        });
        list = [...tex];
        list.length && ((pend = !0), requestIdleCallback(work, { timeout: 2000 }));
      } catch (e) {}
    }, 1000);
  typeof window < 'u' && (window.__bpTexSent = () => __TX.sent);
}
// ---------------------------------------------------------------- 7. held by the processor, or by the graphics chip?
// Dynamic resolution lowers the picture's resolution when frames come too slowly. That helps when the graphics
// chip is what's slow. On a phone it is often the processor (the game's code and the cost of each draw call), and
// there a smaller picture is no faster, only blurrier: an iPhone went down to 253 x 454 pixels and still ran at 25
// frames a second. Each frame, the time from its start to its last draw is measured; when that fills most of the
// time between frames, the processor is the limit (window.__cpuBound): resolution is not lowered then, and is
// raised back towards full (the core's controller, ziA, reads the flag).
const __CPU = { start: 0, end: 0, busy: [], iv: [], frac: 0, at: 0, gl: null };
{
  const med = (a) => {
    const b = a.slice().sort((x, y) => x - y);
    return b[b.length >> 1] || 0;
  };
  const loop = () => {
    requestAnimationFrame(loop);
    const now = performance.now();
    try {
      const g = typeof __R3F < 'u' && __R3F,
        st = g && (g.get ? g.get() : g);
      if (st && st.gl && __CPU.gl !== st.gl) {
        __CPU.gl = st.gl;
        const r = st.gl.render;
        st.gl.render = function () {
          const v = r.apply(this, arguments);
          __CPU.end = performance.now();
          return v;
        };
      }
    } catch (e) {}
    if (__CPU.start && __CPU.end > __CPU.start && now - __CPU.start < 250) {
      __CPU.busy.push(__CPU.end - __CPU.start);
      __CPU.iv.push(now - __CPU.start);
    }
    __CPU.start = now;
    if (now - __CPU.at > 1000 && __CPU.iv.length >= 10) {
      __CPU.at = now;
      __CPU.frac = med(__CPU.busy) / Math.max(1, med(__CPU.iv));
      // (a little hysteresis: on at 80% busy, off below 65%)
      window.__cpuBound = window.__cpuBound ? __CPU.frac > 0.65 : __CPU.frac > 0.8;
      __CPU.busy.length = __CPU.iv.length = 0;
    }
  };
  typeof window < 'u' && ((window.__cpuBound = !1), requestAnimationFrame(loop), (window.__bpCpu = () => ({ busy: +__CPU.frac.toFixed(2), cpuBound: window.__cpuBound })));
}
// ---------------------------------------------------------------- 8. one shader per surface: a fixed number of point lights
// three.js writes the number of point lights in view into every lit surface's shader. The game's point lights come
// and go (the nearest map lamps, explosion and fire flashes, a map's own: 6 to 12 in a match), and each new number
// made every surface compile its shader again. A desktop hides that (shaders compile in the background); an iPhone
// compiles one at a time, about a second each: Deploy on Ridgeback froze the phone for 95 s, compiling sets of
// shaders for numbers of lights it never used again (of 283 shaders, 60 were in use). Now the list of point
// lights handed to the shaders is always padded to 12 with lights of no strength (they add nothing); only a scene
// with more than 12 at once would need another set.
const __PT = { n: 12, pads: [] };
function __ptPad(I, t) {
  const n = __PT.n;
  if (t >= n) return t;
  for (let k = t; k < n; k++) I.point[k] = __PT.pads[k] || (__PT.pads[k] = { position: new U(), color: new UA(0, 0, 0), distance: 0, decay: 2 });
  return n;
}
// ---------------------------------------------------------------- 9. distant and unseen players: their pose less often
// Each player's pose (the animation mixer, the arms put onto the gun, the hit flinch, the upper-body blend, the
// feet) was worked out every frame: a quarter of a phone's frame with ten bots. A player outside the view is posed
// every 4th frame; on phones and tablets also one far away every 2nd (beyond 28 m) or 3rd (beyond 55 m) frame. The
// character still moves every frame (only the limbs keep last frame's pose between), the animation clock is
// carried over (no slow motion), and the hitboxes follow every frame. You, a player in the killcam and the dead
// are always posed. The core's character component asks here (__animLod); 40-body.js handles the held frames.
const __AL = { n: 0, st: new Map(), v: new U(), held: 0, posed: 0 };
typeof window < 'u' && requestAnimationFrame(function al() {
  __AL.n++;
  requestAnimationFrame(al);
});
function __animLod(v, K, dt) {
  let st = __AL.st.get(v.id);
  st || __AL.st.set(v.id, (st = { acc: 0, k: __AL.st.size }));
  st.acc += dt;
  let every = 1;
  try {
    const S = eA.state;
    if (v.alive && S && S.humanId !== v.id && eA.replayTime() === null && !(eA.killcam && eA.killcam.killer === v.id)) {
      const g = typeof __R3F < 'u' && __R3F,
        cam = g && (g.get ? g.get() : g).camera;
      if (cam) {
        const p = __AL.v.set(K.position.x, K.position.y + 1, K.position.z),
          d = p.distanceTo(cam.position);
        p.project(cam);
        const seen = d < 6 || (p.z < 1 && Math.abs(p.x) < 1.3 && Math.abs(p.y) < 1.3);
        every = !seen ? 4 : typeof __PHONE < 'u' && __PHONE ? (d > 55 ? 3 : d > 28 ? 2 : 1) : 1;
      }
    }
  } catch (e) {}
  if (every > 1 && (__AL.n + st.k) % every !== 0) {
    __AL.held++;
    return { skip: !0, dt: st.acc };
  }
  const r = { skip: !1, dt: Math.min(st.acc, 0.25) };
  st.acc = 0;
  __AL.posed++;
  return r;
}
typeof window < 'u' && (window.__bpAnimLod = () => ({ posed: __AL.posed, held: __AL.held }));
