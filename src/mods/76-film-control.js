/* ===== Bayou Protocol mod: the projection booth's film controls ===== */
// Behind every theater, on the projection level (the Velvet Room and the Starlight: at the back of the room), is
// the projectionist's desk. Walk up to it and press Use (E or F): the control panel opens for that theater's
// film, and the tabs along its top reach every other screen.
//   - play / pause, back 10 s / 30 s, forward 10 s / 30 s, from the beginning, and a progress bar to drag
//   - keys: Space play/pause, arrows 10 s (with Shift 30 s), Home from the beginning, Esc or Use closes
//   - it moves the film for everyone (the film clock in 70-screens.js; online, the host applies it)
// While it is open the mouse is free, the game's keys are off and the match carries on.
const __FC = { open: !1, id: null, el: null, prompt: null, raf: 0, near: null, drag: !1 };
const __FC_NAMES = { t1: 'Theater 1', t2: 'Theater 2', t3: 'Theater 3', t4: 'Theater 4', t5: 'The Velvet Room', lounge: 'The Starlight', prison: 'Dayroom TV' };
const __fcName = (id) => (typeof __scrName == 'function' ? __scrName(id) : __FC_NAMES[id] || id);
const __fcTime = (t) => {
  if (!(t >= 0) || !isFinite(t)) return '--:--';
  t = Math.floor(t);
  const h = Math.floor(t / 3600),
    m = Math.floor((t % 3600) / 60),
    s = t % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
};
const __fcIcon = {
  play: '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>',
  back: (n) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/><text x="12" y="15.2" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="Barlow,sans-serif" font-weight="700">${n}</text></svg>`,
  fwd: (n) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/><text x="12" y="15.2" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="Barlow,sans-serif" font-weight="700">${n}</text></svg>`,
  start: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 5h2.2v14H6zM19 5.5v13L9 12z" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
function __fcCss() {
  if (document.getElementById('bp-fc-css')) return;
  const st = document.createElement('style');
  st.id = 'bp-fc-css';
  st.textContent = `
.bp-fc{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:radial-gradient(120% 90% at 50% 40%,rgba(10,8,14,.35),rgba(4,4,8,.78));backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);font-family:Barlow,system-ui,sans-serif;color:#f3ede2;animation:bpfcIn .22s ease-out}
@keyframes bpfcIn{from{opacity:0}to{opacity:1}}
.bp-fc-card{width:min(720px,94vw);max-height:92vh;overflow:auto;border-radius:22px;background:linear-gradient(180deg,rgba(28,24,30,.92),rgba(14,12,18,.94));border:1px solid rgba(201,164,90,.28);box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);padding:22px 24px 20px;animation:bpfcUp .28s cubic-bezier(.2,.8,.2,1)}
@keyframes bpfcUp{from{transform:translateY(14px) scale(.985);opacity:.6}to{transform:none;opacity:1}}
.bp-fc-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.bp-fc-kick{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#c9a45a}
.bp-fc-room{font:800 26px/1.05 "Big Shoulders Display",Barlow,sans-serif;letter-spacing:.02em}
.bp-fc-x{margin-left:auto;width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#e9e2d4;display:grid;place-items:center;cursor:pointer;transition:background .15s}
.bp-fc-x:hover{background:rgba(255,255,255,.1)}
.bp-fc-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;scrollbar-width:none}
.bp-fc-tab{flex:0 0 auto;padding:7px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#cfc6b6;font:600 13px Barlow,sans-serif;cursor:pointer;white-space:nowrap;transition:all .15s}
.bp-fc-tab:hover{border-color:rgba(201,164,90,.5);color:#fff}
.bp-fc-tab[aria-pressed=true]{background:linear-gradient(180deg,#e2c27a,#b98f42);color:#1a1208;border-color:transparent}
.bp-fc-now{display:grid;grid-template-columns:200px 1fr;gap:18px;align-items:center}
.bp-fc-thumb{aspect-ratio:16/9;border-radius:14px;background:#0b0b10 center/cover;box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.06)}
.bp-fc-title{font:700 20px/1.25 Barlow,sans-serif;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bp-fc-chan{margin-top:4px;color:#a99f8e;font-size:14px}
.bp-fc-state{display:inline-flex;align-items:center;gap:7px;margin-top:10px;padding:4px 10px;border-radius:999px;background:rgba(60,255,112,.1);color:#7dffa4;font:600 12px Barlow,sans-serif;letter-spacing:.06em;text-transform:uppercase}
.bp-fc-state i{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor}
.bp-fc-state.paused{background:rgba(255,200,90,.12);color:#ffd27a}
.bp-fc-state.ended{background:rgba(255,255,255,.08);color:#cfc6b6}
.bp-fc-bar{position:relative;height:28px;margin:20px 0 4px;cursor:pointer;touch-action:none}
.bp-fc-track{position:absolute;left:0;right:0;top:11px;height:6px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden}
.bp-fc-fill{height:100%;width:0;background:linear-gradient(90deg,#b98f42,#f0d48c)}
.bp-fc-knob{position:absolute;top:5px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#fff3d6;box-shadow:0 2px 10px rgba(0,0,0,.5),0 0 0 4px rgba(240,212,140,.18);transition:transform .12s}
.bp-fc-bar:hover .bp-fc-knob{transform:scale(1.15)}
.bp-fc-times{display:flex;justify-content:space-between;font:600 13px Barlow,sans-serif;color:#a99f8e;font-variant-numeric:tabular-nums}
.bp-fc-ctl{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px;flex-wrap:wrap}
.bp-fc-b{width:52px;height:52px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#ece4d4;display:grid;place-items:center;cursor:pointer;transition:transform .1s,background .15s}
.bp-fc-b:hover{background:rgba(255,255,255,.1)}
.bp-fc-b:active{transform:scale(.94)}
.bp-fc-play{width:74px;height:74px;border-radius:50%;border:none;background:linear-gradient(180deg,#f0d48c,#b98f42);color:#1a1208;box-shadow:0 10px 26px rgba(201,164,90,.35)}
.bp-fc-play:hover{background:linear-gradient(180deg,#f7e0a4,#c99c4c)}
.bp-fc-keys{margin-top:16px;text-align:center;color:#7d7566;font-size:12px;letter-spacing:.02em}
.bp-fc-keys kbd{display:inline-block;min-width:20px;padding:1px 6px;margin:0 2px;border-radius:6px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#d8cfbf;font:600 11px Barlow,sans-serif}
.bp-fc-prompt{position:fixed;left:50%;top:62%;transform:translateX(-50%);padding:7px 16px;border-radius:6px;background:rgba(10,8,6,.72);border:1px solid rgba(201,164,90,.45);color:#f2ead8;font:600 14px Barlow,sans-serif;letter-spacing:.04em;pointer-events:none;z-index:45;opacity:0;transition:opacity .2s}
@media (max-width:560px){.bp-fc-card{padding:16px}.bp-fc-now{grid-template-columns:1fr}.bp-fc-room{font-size:22px}.bp-fc-ctl{gap:6px;flex-wrap:nowrap}.bp-fc-b{width:42px;height:42px;border-radius:13px}.bp-fc-play{width:58px;height:58px}.bp-fc-keys{display:none}}
`;
  document.head.appendChild(st);
}
function __fcBuild() {
  __fcCss();
  const el = document.createElement('div');
  el.className = 'bp-fc';
  el.innerHTML = `<div class="bp-fc-card" role="dialog" aria-label="Film controls">
  <div class="bp-fc-head"><div><div class="bp-fc-kick">Projection booth</div><div class="bp-fc-room"></div></div><button class="bp-fc-x" aria-label="Close">${__fcIcon.close}</button></div>
  <div class="bp-fc-tabs"></div>
  <div class="bp-fc-now"><div class="bp-fc-thumb"></div><div><div class="bp-fc-title"></div><div class="bp-fc-chan"></div><div class="bp-fc-state"><i></i><span></span></div></div></div>
  <div class="bp-fc-bar" aria-label="Seek"><div class="bp-fc-track"><div class="bp-fc-fill"></div></div><div class="bp-fc-knob"></div></div>
  <div class="bp-fc-times"><span class="bp-fc-t0">0:00</span><span class="bp-fc-t1">--:--</span></div>
  <div class="bp-fc-ctl">
    <button class="bp-fc-b" data-op="start" title="From the beginning">${__fcIcon.start}</button>
    <button class="bp-fc-b" data-op="b30" title="Back 30 s">${__fcIcon.back(30)}</button>
    <button class="bp-fc-b" data-op="b10" title="Back 10 s">${__fcIcon.back(10)}</button>
    <button class="bp-fc-b bp-fc-play" data-op="toggle" title="Play / pause"></button>
    <button class="bp-fc-b" data-op="f10" title="Forward 10 s">${__fcIcon.fwd(10)}</button>
    <button class="bp-fc-b" data-op="f30" title="Forward 30 s">${__fcIcon.fwd(30)}</button>
  </div>
  <div class="bp-fc-keys"><kbd>Space</kbd> play / pause · <kbd>←</kbd><kbd>→</kbd> 10 s · <kbd>Shift</kbd>+<kbd>←</kbd><kbd>→</kbd> 30 s · <kbd>Home</kbd> from the beginning · <kbd>Esc</kbd> close</div>
</div>`;
  // clicks stay in the panel (the game would take them as shots)
  for (const t of ['mousedown', 'mouseup', 'click', 'wheel', 'pointerdown']) el.addEventListener(t, (e) => e.stopPropagation());
  el.addEventListener('mousedown', (e) => e.target === el && __fcClose());
  el.querySelector('.bp-fc-x').addEventListener('click', () => __fcClose());
  el.querySelector('.bp-fc-ctl').addEventListener('click', (e) => {
    const b = e.target.closest('[data-op]');
    b && __fcCmd(b.dataset.op);
  });
  const bar = el.querySelector('.bp-fc-bar'),
    seekAt = (e) => {
      const r = bar.getBoundingClientRect(),
        k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
        dur = __fcDur(__FC.id);
      dur > 0 && __filmDo(__FC.id, 4, k * dur);
    };
  bar.addEventListener('pointerdown', (e) => ((__FC.drag = !0), bar.setPointerCapture(e.pointerId), seekAt(e)));
  bar.addEventListener('pointermove', (e) => __FC.drag && __fcDrag(e, bar));
  bar.addEventListener('pointerup', (e) => (__FC.drag && seekAt(e), (__FC.drag = !1)));
  document.body.appendChild(el);
  return el;
}
// while dragging: the bar follows the pointer, the film moves when it is let go
function __fcDrag(e, bar) {
  const r = bar.getBoundingClientRect(),
    k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  __FC.dragK = k;
}
const __fcDur = (id) => (__SCR.durs && __SCR.durs[id]) || 0;
function __fcCmd(op) {
  const id = __FC.id,
    f = eA.state && eA.state.__film && eA.state.__film[id],
    dur = __fcDur(id),
    pos = __filmPos(id) || 0,
    ended = dur > 0 && pos >= dur - 0.6;
  if (op === 'toggle') ended ? __filmDo(id, 3) : __filmDo(id, f && f.paused ? 0 : 1);
  else if (op === 'start') __filmDo(id, 3);
  else if (op === 'b10') __filmDo(id, 2, -10);
  else if (op === 'b30') __filmDo(id, 2, -30);
  else if (op === 'f10') __filmDo(id, 2, 10);
  else if (op === 'f30') __filmDo(id, 2, 30);
}
function __fcTabs() {
  const tabs = __FC.el.querySelector('.bp-fc-tabs'),
    ids = (aw().screens || []).map((s) => s.id);
  tabs.innerHTML = ids.map((id) => `<button class="bp-fc-tab" data-id="${id}" aria-pressed="${id === __FC.id}">${__fcName(id).replace(/[<>&]/g, '')}</button>`).join('');
  tabs.onclick = (e) => {
    const b = e.target.closest('[data-id]');
    b && ((__FC.id = b.dataset.id), (__SCR.focus = __FC.id), __fcTabs(), __fcFill());
  };
}
function __fcFill() {
  const el = __FC.el,
    s = typeof __scrShowing == 'function' ? __scrShowing(__FC.id) : null;
  el.querySelector('.bp-fc-room').textContent = __fcName(__FC.id);
  el.querySelector('.bp-fc-title').textContent = (s && s.title) || 'No film is booked';
  el.querySelector('.bp-fc-chan').textContent = (s && s.channel) || '';
  el.querySelector('.bp-fc-thumb').style.backgroundImage = s && s.videoId ? `url(https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg)` : 'linear-gradient(135deg,#2a1418,#0c0c12)';
}
function __fcTick() {
  if (!__FC.open) return;
  __FC.raf = requestAnimationFrame(__fcTick);
  const el = __FC.el,
    id = __FC.id,
    dur = __fcDur(id),
    pos = __filmPos(id) || 0,
    f = eA.state && eA.state.__film && eA.state.__film[id],
    ended = dur > 0 && pos >= dur - 0.6,
    paused = !!(f && f.paused),
    k = __FC.drag && __FC.dragK !== void 0 ? __FC.dragK : dur > 0 ? Math.min(1, pos / dur) : 0;
  el.querySelector('.bp-fc-fill').style.width = k * 100 + '%';
  el.querySelector('.bp-fc-knob').style.left = k * 100 + '%';
  el.querySelector('.bp-fc-t0').textContent = __fcTime(__FC.drag && dur ? k * dur : Math.min(pos, dur || pos));
  el.querySelector('.bp-fc-t1').textContent = dur > 0 ? __fcTime(dur) : 'loading…';
  const st = el.querySelector('.bp-fc-state'),
    mode = ended ? 'ended' : paused ? 'paused' : 'playing';
  if (st.dataset.mode !== mode) {
    st.dataset.mode = mode;
    st.className = 'bp-fc-state ' + (mode === 'playing' ? '' : mode);
    st.querySelector('span').textContent = ended ? 'Finished' : paused ? 'Paused for everyone' : 'Playing for everyone';
    el.querySelector('.bp-fc-play').innerHTML = paused || ended ? __fcIcon.play : __fcIcon.pause;
  }
}
// ---------------------------------------------------------------- open, close
function __fcOpen(id) {
  if (__FC.open) return;
  __FC.open = !0;
  __FC.id = id;
  __SCR.focus = id; // that screen's player is kept running (its length is known, the film is there to see)
  __FC.el || (__FC.el = __fcBuild());
  __FC.el.style.display = '';
  __fcTabs();
  __fcFill();
  RD.active = !0; // the game's keys are off
  window.__bpPanelOpen = !0;
  document.pointerLockElement && document.exitPointerLock();
  __fcPrompt('');
  __fcTick();
}
function __fcClose() {
  if (!__FC.open) return;
  __FC.open = !1;
  cancelAnimationFrame(__FC.raf);
  __FC.el && (__FC.el.style.display = 'none');
  __SCR.focus = null;
  setTimeout(() => ((RD.active = !1), (window.__bpPanelOpen = !1)), 60);
  // back into the game: the mouse is captured again (allowed: closing was a click or a key press)
  try {
    const c = document.querySelector('.fps-root canvas') || document.querySelector('canvas'),
      r = c && c.requestPointerLock && c.requestPointerLock();
    r && r.catch && r.catch(() => {});
  } catch (e) {}
}
function __fcPrompt(text) {
  let el = __FC.prompt;
  if (!el) {
    __fcCss();
    el = __FC.prompt = document.createElement('div');
    el.className = 'bp-fc-prompt';
    document.body.appendChild(el);
  }
  el.textContent = text || '';
  el.style.opacity = text ? '1' : '0';
}
// the game pauses itself when the mouse is let go; not while this panel is open
try {
  const orig = Zw.getState().setPaused;
  Zw.setState({ setPaused: (v) => (__FC.open && v ? void 0 : orig(v)) });
} catch (e) {}
if (typeof window < 'u') {
  window.addEventListener(
    'keydown',
    (e) => {
      const use = (typeof Gi < 'u' && Gi.use) || ['KeyE', 'KeyF'];
      if (__FC.open) {
        e.stopImmediatePropagation();
        e.preventDefault();
        if (e.repeat && !/Arrow/.test(e.code)) return;
        if (e.code === 'Escape' || use.includes(e.code)) return __fcClose();
        if (e.code === 'Space') __fcCmd('toggle');
        else if (e.code === 'ArrowLeft') __fcCmd(e.shiftKey ? 'b30' : 'b10');
        else if (e.code === 'ArrowRight') __fcCmd(e.shiftKey ? 'f30' : 'f10');
        else if (e.code === 'Home') __fcCmd('start');
        return;
      }
      if (e.repeat || !use.includes(e.code) || !__FC.near) return;
      const me = eA.human && eA.human();
      if (!me || !me.alive || Zw.getState().screen !== 'playing') return;
      e.stopImmediatePropagation();
      __fcOpen(__FC.near.th);
    },
    !0,
  );
  window.__bpFilmPanel = (id) => (id ? __fcOpen(id) : __fcClose());
  window.__bpFilmPanelState = () => ({ open: __FC.open, id: __FC.id, near: __FC.near && __FC.near.th });
}
// each frame: near a desk?
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw();
    S.useEffect(() => () => (__fcClose(), __fcPrompt('')), [m]);
    QI(() => {
      const C = m && m.__cn && m.__cn.consoles,
        me = eA.human && eA.human();
      if (!C || !me || __FC.open) return;
      let near = null;
      if (me.alive) for (const c of C) Math.hypot(me.pos.x - c.x, me.pos.z - c.z) < 1.4 && Math.abs(me.pos.y - c.y) < 0.8 && (near = c);
      if (near !== __FC.near) {
        __FC.near = near;
        const k = ((typeof Gi < 'u' && Gi.use) || ['KeyE'])[0].replace('Key', '');
        __fcPrompt(near ? `Press ${k} for the film controls · ${__fcName(near.th)}` : '');
      }
    });
    return M.jsx(prevTrees, {});
  };
}
