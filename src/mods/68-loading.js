/* ===== Bayou Tactical mod: match loading screen ===== */
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
// The look: BAYOU TACTICAL built kinetically (the B mark draws itself, the letters slam in with a chromatic split),
// the map's key art behind it under scan lines, HUD brackets and a turning reticle, a segmented energy meter for
// the progress (the % read out like an ammo counter), the current step and rotating tactical tips. CSS and SVG
// only; calm under prefers-reduced-motion; on phones and tablets (__LOWMEM) the 1280 px art and no glitch loop.
const __LD_ART = { fortress: 'fortress', cinema: 'cinema', prison: 'prison', frostline: 'frostline', ridgeback: 'ridgeback' };
const __LD_TIPS = [
  'Every rifle has its own recoil pattern. Pull down against it, or fire in bursts.',
  'Stand still to shoot accurately: running and jumping throw your shots wide.',
  'Smoke blocks sight lines, flashbangs blind. Clear corners with them before you push.',
  'Call what you see on voice (hold K): the radar shows the callouts.',
  'Hold the grenade button to cook a frag so it can’t be dodged or thrown back.',
  'Guns drop when players die. Walk over the same gun for ammo, or press Use to swap.',
  'Headshots end fights fast. Keep your crosshair at head height as you move.',
  'Press E to open and close doors. Hold Tab for the scoreboard.',
];
const __LD_SEGS = 24;
function __ldCover(m) {
  if (typeof document > 'u') return null;
  let el = __LD.cover;
  const lite = typeof __LOWMEM < 'u' && !!__LOWMEM;
  if (!el) {
    el = document.createElement('div');
    el.className = 'bp-loading' + (lite ? ' bp-ld--lite' : '');
    const segs = Array.from({ length: __LD_SEGS }, () => '<i></i>').join('');
    el.innerHTML =
      '<div class="bp-ld-art"></div><div class="bp-ld-shade"></div><div class="bp-ld-scan"></div><div class="bp-ld-grid"></div>' +
      // HUD: corner brackets, a reticle turning behind the logo, side readouts
      '<div class="bp-ld-hud"><b class="c tl"></b><b class="c tr"></b><b class="c bl"></b><b class="c br"></b>' +
      '<span class="bp-ld-read l">SYS · ONLINE<br>NET · <em class="bp-ld-net">LOCAL</em><br>OPS · <em class="bp-ld-mode">TDM</em></span>' +
      '<span class="bp-ld-read r"><em class="bp-ld-clock">T+00.0</em><br>GRID · <em class="bp-ld-grid-id">BT-01</em><br>SECURE LINK</span></div>' +
      '<svg class="bp-ld-ret" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="92" class="o"/><circle cx="100" cy="100" r="70" class="m"/>' +
      '<path d="M100 2v22M100 176v22M2 100h22M176 100h22" class="t"/><path d="M30 30l10 10M170 30l-10 10M30 170l10-10M170 170l-10-10" class="t"/></svg>' +
      '<div class="bp-ld-in">' +
      // the logo
      '<div class="bp-ld-logo"><svg class="bp-ld-mark" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="bpldg" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fff4d6"/><stop offset=".38" stop-color="#e8bf72"/><stop offset=".72" stop-color="#a8772f"/><stop offset="1" stop-color="#f1d391"/></linearGradient></defs>' +
      '<path class="f" fill="url(#bpldg)" fill-rule="evenodd" d="M14 6H42L53 14V26L47 31.5L55 37V50L44 58H14V41L20 32L14 23ZM24 14V25H38L42 22V17L38 14ZM24 38V50H40L44 47V41L40 38Z"/>' +
      '<path class="s" d="M14 6H42L53 14V26L47 31.5L55 37V50L44 58H14V41L20 32L14 23Z"/><path class="f" fill="url(#bpldg)" d="M3 41L11 29V35L6 43Z"/></svg>' +
      '<div class="bp-ld-word"><span class="w1" data-t="BAYOU">' + 'BAYOU'.split('').map((c, i) => `<i style="--i:${i}">${c}</i>`).join('') + '</span>' +
      '<span class="w2" data-t="TACTICAL">' + 'TACTICAL'.split('').map((c, i) => `<i style="--i:${i}">${c}</i>`).join('') + '</span></div></div>' +
      // deploying to
      '<div class="bp-ld-kick"><i></i><span>DEPLOYING TO</span><i></i></div><div class="bp-ld-name"></div><div class="bp-ld-blurb"></div>' +
      // the energy meter
      `<div class="bp-ld-meter"><span class="bp-ld-cap">CHARGE</span><div class="bp-ld-bar">${segs}</div><span class="bp-ld-pct">000</span></div>` +
      '<div class="bp-ld-step"></div>' +
      '<div class="bp-ld-tip"><b>TACTICAL TIP</b><span></span></div>' +
      '</div>' +
      '<style>' +
      '.bp-loading{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#03040a;font-family:"Barlow",system-ui,sans-serif;color:#efe9da;transition:opacity .45s ease;pointer-events:all;--g:#f0c870;--b:88,170,255}' +
      '.bp-loading.out{opacity:0;pointer-events:none}' +
      '.bp-ld-art{position:absolute;inset:-3%;background:#03040a center/cover no-repeat;opacity:.55;filter:saturate(1.1);animation:bpldArt 18s ease-out both}' +
      '@keyframes bpldArt{from{transform:scale(1.12);opacity:0}12%{opacity:.55}to{transform:scale(1.02)}}' +
      '.bp-ld-shade{position:absolute;inset:0;background:radial-gradient(70% 70% at 50% 45%,rgba(3,5,12,.35),rgba(3,5,12,.94) 100%),linear-gradient(0deg,rgba(3,5,12,.9),transparent 40%)}' +
      '.bp-ld-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);mix-blend-mode:overlay;pointer-events:none}' +
      '.bp-ld-scan:after{content:"";position:absolute;left:0;right:0;height:18%;background:linear-gradient(180deg,transparent,rgba(var(--b),.08),transparent);animation:bpldSweep 4.5s linear infinite;will-change:transform}' +
      '@keyframes bpldSweep{from{transform:translateY(-20vh)}to{transform:translateY(120vh)}}' +
      '.bp-ld-grid{position:absolute;left:-10%;right:-10%;bottom:-6%;height:42%;background:linear-gradient(rgba(var(--b),.22) 1px,transparent 1px) 0 0/80px 40px,linear-gradient(90deg,rgba(var(--b),.22) 1px,transparent 1px) 0 0/80px 40px;transform:perspective(420px) rotateX(62deg);transform-origin:50% 100%;-webkit-mask-image:linear-gradient(0deg,#000,transparent 85%);mask-image:linear-gradient(0deg,#000,transparent 85%);animation:bpldGrid 2.2s linear infinite;opacity:.6}' +
      '@keyframes bpldGrid{to{background-position:0 40px,0 0}}' +
      '.bp-ld-hud{position:absolute;inset:clamp(14px,3vw,40px);pointer-events:none}' +
      '.bp-ld-hud .c{position:absolute;width:42px;height:42px;border:2px solid rgba(var(--b),.85);filter:drop-shadow(0 0 6px rgba(var(--b),.9));animation:bpldC .7s cubic-bezier(.2,.8,.2,1) both}' +
      '.bp-ld-hud .tl{left:0;top:0;border-right:0;border-bottom:0}.bp-ld-hud .tr{right:0;top:0;border-left:0;border-bottom:0}.bp-ld-hud .bl{left:0;bottom:0;border-right:0;border-top:0}.bp-ld-hud .br{right:0;bottom:0;border-left:0;border-top:0}' +
      '@keyframes bpldC{from{opacity:0;transform:scale(1.6)}}' +
      '.bp-ld-read{position:absolute;top:56px;font:600 10.5px/1.9 ui-monospace,Menlo,monospace;letter-spacing:.24em;color:rgba(170,205,245,.62)}.bp-ld-read.l{left:8px}.bp-ld-read.r{right:8px;text-align:right}.bp-ld-read em{font-style:normal;color:var(--g)}' +
      '.bp-ld-ret{position:absolute;left:50%;top:44%;width:min(74vh,640px);translate:-50% -50%;opacity:.28;pointer-events:none;animation:bpldSpin 22s linear infinite}' +
      '.bp-ld-ret circle,.bp-ld-ret path{fill:none;stroke:rgb(var(--b));stroke-width:.6}.bp-ld-ret .m{stroke-dasharray:3 6;stroke:var(--g)}.bp-ld-ret .t{stroke-width:1.4}' +
      '@keyframes bpldSpin{to{rotate:360deg}}' +
      '.bp-ld-in{position:relative;width:min(760px,90vw);display:flex;flex-direction:column;align-items:center;text-align:center}' +
      '.bp-ld-logo{display:flex;align-items:center;gap:clamp(12px,2vw,24px)}' +
      '.bp-ld-mark{width:clamp(64px,9vw,108px);height:auto;filter:drop-shadow(0 0 18px rgba(240,200,112,.6))}' +
      '.bp-ld-mark .f{opacity:0;animation:bpldFill .5s ease .9s forwards}.bp-ld-mark .s{fill:none;stroke:#ffe6a6;stroke-width:1.2;stroke-dasharray:260;stroke-dashoffset:260;animation:bpldDraw 1s cubic-bezier(.6,0,.3,1) .1s forwards}' +
      '@keyframes bpldDraw{to{stroke-dashoffset:0}}@keyframes bpldFill{to{opacity:1}}' +
      '.bp-ld-word{display:flex;flex-direction:column;align-items:flex-start;line-height:.86}' +
      '.bp-ld-word span{position:relative;display:flex;font-family:var(--lx-display,"Big Shoulders Display",sans-serif);font-weight:800;text-transform:uppercase}' +
      '.bp-ld-word .w1{font-size:clamp(56px,9vw,128px);letter-spacing:.14em;background:linear-gradient(180deg,#fff,#e8ebf3 48%,#98a2bc);-webkit-background-clip:text;background-clip:text;color:transparent}' +
      '.bp-ld-word .w2{margin-top:clamp(4px,.8vw,10px);font-size:clamp(20px,3.1vw,44px);letter-spacing:.62em;color:var(--g);text-shadow:0 0 18px rgba(240,200,112,.55)}' +
      '.bp-ld-word i{font-style:normal;display:inline-block;animation:bpldSlam .55s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(.25s + var(--i) * .055s)}' +
      '.bp-ld-word .w2 i{animation-delay:calc(.6s + var(--i) * .04s)}' +
      '@keyframes bpldSlam{from{opacity:0;transform:translate3d(0,-40%,0) scale(1.6);filter:blur(6px)}60%{opacity:1}}' +
      // the chromatic split: two tinted copies that glitch now and then
      '.bp-ld-word span:before,.bp-ld-word span:after{content:attr(data-t);position:absolute;left:0;top:0;letter-spacing:inherit;pointer-events:none;opacity:0;-webkit-text-fill-color:currentColor}' +
      '.bp-ld-word .w1:before{color:#ff2e63}.bp-ld-word .w1:after{color:#26e0ff}.bp-ld-word .w2:before{color:#ff2e63}.bp-ld-word .w2:after{color:#26e0ff}' +
      '.bp-ld-word span:before{animation:bpldGlA 3.2s steps(1) 1.4s infinite}.bp-ld-word span:after{animation:bpldGlB 3.2s steps(1) 1.4s infinite}' +
      '@keyframes bpldGlA{0%,86%,100%{opacity:0;transform:none;clip-path:none}88%{opacity:.75;transform:translate(-4px,1px);clip-path:inset(10% 0 55% 0)}91%{opacity:.75;transform:translate(3px,-1px);clip-path:inset(60% 0 8% 0)}94%{opacity:.6;transform:translate(-2px,0);clip-path:inset(30% 0 40% 0)}}' +
      '@keyframes bpldGlB{0%,86%,100%{opacity:0;transform:none;clip-path:none}88%{opacity:.75;transform:translate(4px,-1px);clip-path:inset(55% 0 10% 0)}91%{opacity:.75;transform:translate(-3px,1px);clip-path:inset(8% 0 60% 0)}94%{opacity:.6;transform:translate(2px,0);clip-path:inset(40% 0 30% 0)}}' +
      '.bp-ld-kick{display:flex;align-items:center;gap:14px;margin-top:clamp(22px,4vh,40px);font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.42em;color:rgba(170,205,245,.8);animation:bpldUp .6s ease 1s both}' +
      '.bp-ld-kick i{width:48px;height:1px;background:linear-gradient(90deg,transparent,rgb(var(--b)))}.bp-ld-kick i:last-child{transform:scaleX(-1)}' +
      '.bp-ld-name{margin-top:10px;font-family:var(--lx-display,"Big Shoulders Display",sans-serif);font-size:clamp(34px,4.4vw,60px);font-weight:800;line-height:.9;letter-spacing:.04em;text-transform:uppercase;color:#fff;text-shadow:0 0 24px rgba(var(--b),.55);animation:bpldUp .6s ease 1.1s both}' +
      '.bp-ld-blurb{max-width:620px;margin-top:10px;font-size:13.5px;line-height:1.5;color:rgba(214,222,240,.72);min-height:40px;animation:bpldUp .6s ease 1.2s both}' +
      '@keyframes bpldUp{from{opacity:0;transform:translateY(12px)}}' +
      '.bp-ld-meter{display:flex;align-items:center;gap:14px;width:min(620px,100%);margin-top:clamp(18px,3vh,30px);animation:bpldUp .6s ease 1.25s both}' +
      '.bp-ld-cap{font:700 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.3em;color:rgba(170,205,245,.7)}' +
      '.bp-ld-bar{flex:1;display:grid;grid-template-columns:repeat(' + __LD_SEGS + ',1fr);gap:3px;height:16px;padding:3px;transform:skewX(-18deg);box-shadow:inset 0 0 0 1px rgba(var(--b),.45),0 0 18px -6px rgba(var(--b),.8)}' +
      '.bp-ld-bar i{background:rgba(255,255,255,.07);transition:background .2s,box-shadow .2s}' +
      '.bp-ld-bar i.on{background:linear-gradient(180deg,#fff4d6,var(--g));box-shadow:0 0 8px rgba(240,200,112,.85)}' +
      '.bp-ld-bar i.hot{background:#fff;box-shadow:0 0 12px #fff,0 0 22px rgba(240,200,112,.9);animation:bpldBlink .5s steps(2) infinite}' +
      '@keyframes bpldBlink{50%{opacity:.35}}' +
      '.bp-ld-pct{min-width:64px;text-align:right;font:800 30px/1 var(--lx-display,"Big Shoulders Display",sans-serif);letter-spacing:.04em;color:#fff;font-variant-numeric:tabular-nums;text-shadow:0 0 14px rgba(240,200,112,.7)}' +
      '.bp-ld-pct:after{content:"%";font-size:15px;margin-left:2px;color:var(--g)}' +
      '.bp-ld-step{margin-top:10px;font:600 10.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.26em;color:rgba(170,205,245,.7);text-transform:uppercase}' +
      '.bp-ld-step:before{content:"> ";color:var(--g)}.bp-ld-step:after{content:"_";animation:bpldBlink 1s steps(2) infinite}' +
      '.bp-ld-tip{display:flex;flex-direction:column;gap:6px;width:min(620px,100%);margin-top:clamp(20px,4vh,40px);padding:12px 18px;text-align:left;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%);background:linear-gradient(90deg,rgba(var(--b),.14),rgba(var(--b),.03));animation:bpldUp .6s ease 1.35s both}' +
      '.bp-ld-tip b{font:700 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.32em;color:var(--g)}.bp-ld-tip span{font-size:13.5px;line-height:1.45;color:rgba(236,238,245,.86);transition:opacity .35s}.bp-ld-tip span.fade{opacity:0}' +
      '.bp-ld--lite .bp-ld-art{animation:none;opacity:.5}.bp-ld--lite .bp-ld-word span:before,.bp-ld--lite .bp-ld-word span:after,.bp-ld--lite .bp-ld-grid,.bp-ld--lite .bp-ld-ret{animation:none}.bp-ld--lite .bp-ld-scan:after{display:none}' +
      '@media (max-width:640px){.bp-ld-read{display:none}.bp-ld-hud .c{width:26px;height:26px}.bp-ld-grid{height:30%}.bp-ld-cap{display:none}}' +
      '@media (prefers-reduced-motion:reduce){.bp-loading *,.bp-loading *:before,.bp-loading *:after{animation:none!important;transition:none!important}.bp-ld-mark .f{opacity:1}.bp-ld-mark .s{stroke-dashoffset:0}}' +
      '</style>';
    document.body.appendChild(el);
    __LD.cover = el;
  }
  const info = (typeof BD < 'u' && BD.find((b) => b.id === m.id)) || {};
  const art = __LD_ART[m.id];
  el.querySelector('.bp-ld-art').style.backgroundImage = art ? `url(game/menu/reel-${art}${lite ? '-m' : ''}.webp)` : 'none';
  el.querySelector('.bp-ld-name').textContent = info.name || m.name || 'Loading';
  el.querySelector('.bp-ld-blurb').textContent = info.blurb || '';
  const st = eA.state;
  el.querySelector('.bp-ld-mode').textContent = st && st.theater ? 'THEATER' : st ? String(__modeName(st) || st.mode || '').toUpperCase() : '';
  el.querySelector('.bp-ld-net').textContent = eA.net ? 'ONLINE' : 'LOCAL';
  el.querySelector('.bp-ld-grid-id').textContent = `${String(m.id || 'bt').slice(0, 3).toUpperCase()}-${String((m.w || 0) | 0).padStart(3, '0')}`;
  // the first tip is about the mode; the rest rotate
  const first = st && st.theater ? 'Theater Mode: walk into any theater, take a seat (E) and watch. Hold K to talk.' : st && st.jb ? 'Jailbreak: Terrorists hold E at a cell lock to cut it, then lead the inmate to the getaway van. Counter-Terrorists hold the cells until time runs out.' : st && st.mode === 'bomb' ? 'Bomb Defusal: buy in the first seconds of the round (B). Terrorists plant at A or B; Counter-Terrorists defuse.' : __LD_TIPS[(Math.random() * __LD_TIPS.length) | 0];
  const tip = el.querySelector('.bp-ld-tip span');
  tip.textContent = first;
  clearInterval(__LD.tipT);
  let k = (Math.random() * __LD_TIPS.length) | 0;
  __LD.tipT = setInterval(() => {
    if (el.style.display === 'none') return clearInterval(__LD.tipT);
    tip.classList.add('fade');
    setTimeout(() => ((tip.textContent = __LD_TIPS[k++ % __LD_TIPS.length]), tip.classList.remove('fade')), 360);
  }, 4200);
  // restart the logo build each time the screen shows
  el.querySelectorAll('.bp-ld-word i, .bp-ld-mark path, .bp-ld-hud .c').forEach((n) => {
    n.style.animation = 'none';
    void n.offsetWidth;
    n.style.animation = '';
  });
  el.classList.remove('out');
  el.style.display = 'flex';
  __LD.segs = [...el.querySelectorAll('.bp-ld-bar i')];
  return el;
}
// the meter: a fraction 0..1 drawn as lit segments, the last one blinking; the % as a three-digit counter
function __ldMeter(el, f) {
  const n = __LD.segs ? __LD.segs.length : 0,
    lit = Math.round(Math.max(0, Math.min(1, f)) * n);
  if (__LD.lit !== lit) {
    __LD.lit = lit;
    for (let i = 0; i < n; i++) {
      const s = __LD.segs[i];
      s.className = i < lit - 1 ? 'on' : i === lit - 1 ? 'hot' : '';
    }
  }
  const p = String(Math.round(Math.max(0, Math.min(1, f)) * 100)).padStart(3, '0'),
    pe = el.querySelector('.bp-ld-pct');
  pe.textContent !== p && (pe.textContent = p);
  const c = el.querySelector('.bp-ld-clock'),
    t = Math.floor((performance.now() - __LD.t0) / 100);
  c && (c.textContent = `T+${String(Math.floor(t / 10)).padStart(2, '0')}.${t % 10}`);
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
  __ldMeter(el, 1);
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
    __ldMeter(el, (8 + 80 * Math.min(1, frac) + (view ? 6 : 0) + (__LD.compiling ? 6 : 0)) / 100);
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
