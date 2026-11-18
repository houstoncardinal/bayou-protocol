/* ===== Bayou Tactical mod: the Home screen ===== */
// A cinematic front end: the centre of the screen is a full-bleed feature reel (a slow crossfade with parallax)
// of what the game is: five hand-built maps, Theater Mode (the 36 m Palace XL screens, the curved Velvet Room,
// the Starlight 360° sphere), Bomb Defusal and Jailbreak, and the operators. Every slide is key art rendered in
// the game and graded (public/game/menu/reel-*.webp), with a display headline, a one-line pitch and an action.
// Around it, nothing boxy: Play as an angled hero, the nav as floating type on a luminous rail, the season and
// today's orders as angled slabs lit at their edges, and a filmstrip of skewed frames that steps and times the reel.
//   tabs         Home · Season · Challenges · Leaderboard · Maps · Career (a panel slides in on a diagonal edge)
//   header       Friends (online count) · today's challenges · full screen · level and XP
//   left         Play (shows the mode and map it starts) · Multiplayer · Servers · Training · Theater Mode ·
//                Profile · Settings · you
//   social       window.__bpSocial (leaderboard, friends, openFriends, openServers, me) when the online backend
//                provides it; tasteful empty states until then
// Nothing is bought here: the game has no store and no currency, so none is shown.
// Motion: transforms and opacity only, choreographed on entry, off with prefers-reduced-motion. Sound: generated
// in WebAudio into the game's master bus (the volume setting applies), with a small generated room reverb.
// Styles: src/styles/home-luxe.css.
const __HX = { hoverAt: 0, lastHover: null, noise: null, raf: 0, mx: 0, my: 0, card: null, verb: null, verbCtx: null };
const __HX_ART = {
  op: `game/menu/season-op${typeof __LOWMEM < 'u' && __LOWMEM ? '-m' : ''}.webp`,
  crate: 'game/menu/daily-crate.webp',
};
// the reel's key art, one per feature (map ids double as the Maps panel's art)
const __HX_KEY = { fortress: 'reel-fortress', cinema: 'reel-cinema', prison: 'reel-prison', frostline: 'reel-frostline', ridgeback: 'reel-ridgeback' };
// phones, tablets and low-memory devices (__LOWMEM, 00c-mobile-memory.js): 1280 px copies of the art, and the
// heavier motion (the slow push-in, the drifting flare, the embers) left out
const __HX_LITE = typeof __LOWMEM < 'u' && !!__LOWMEM;
const __hxImg = (k) => `game/menu/${k}${__HX_LITE && /^(reel-|season-op)/.test(k) ? '-m' : ''}.webp`;
// decode the art up front (the first slides at once, the rest when the browser is idle), so nothing pops in
function __hxPreload(list) {
  for (const u of list) {
    const im = new Image();
    im.decoding = 'async';
    im.src = u;
    im.decode && im.decode().catch(() => {});
  }
}
if (typeof window < 'u') {
  setTimeout(() => __hxPreload([__hxImg('reel-cinema'), __HX_ART.op, __HX_ART.crate]), 0);
  const rest = () =>
    __hxPreload(['fortress', 'prison', 'frostline', 'ridgeback', 'theater', 'velvet', 'starlight', 'bomb', 'highroller', 'jailbreak', 'operators'].map((k) => __hxImg('reel-' + k)));
  typeof requestIdleCallback == 'function' ? requestIdleCallback(rest, { timeout: 2500 }) : setTimeout(rest, 1200);
}
// ---------------------------------------------------------------- sound
function __hxVerb(ctx, out) {
  // a short, dark room: a generated impulse response (decaying filtered noise), shared by every UI sound
  if (__HX.verb && __HX.verbCtx === ctx) return __HX.verb;
  const len = (ctx.sampleRate * 1.1) | 0,
    ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += ((Math.random() * 2 - 1) - lp) * (0.5 - 0.42 * t);
      d[i] = lp * Math.pow(1 - t, 3.2) * (i < 40 ? i / 40 : 1);
    }
  }
  const cv = ctx.createConvolver(),
    g = ctx.createGain();
  cv.buffer = ir;
  g.gain.value = 0.55;
  cv.connect(g).connect(out);
  __HX.verb = cv;
  __HX.verbCtx = ctx;
  return cv;
}
function __hxEnv(ctx, g, t, a, peak, dur) {
  g.gain.setValueAtTime(1e-4, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
}
function __hxTone(ctx, out, t, f0, f1, dur, type, vol, opt = {}) {
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  f1 !== f0 && o.frequency.exponentialRampToValueAtTime(f1, t + (opt.glide || dur));
  opt.detune && (o.detune.value = opt.detune);
  __hxEnv(ctx, g, t, opt.a || 0.004, vol, dur);
  let node = g;
  if (opt.lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = opt.lp;
    g.connect(f);
    node = f;
  }
  o.connect(g);
  node.connect(out);
  if (opt.send) {
    const s = ctx.createGain();
    s.gain.value = opt.send.amt;
    node.connect(s).connect(opt.send.node);
  }
  o.start(t);
  o.stop(t + dur + 0.05);
  o.onended = () => {
    try {
      node.disconnect();
      g.disconnect();
    } catch (e) {}
  };
}
function __hxNoise(ctx, out, t, dur, freq, q, vol, opt = {}) {
  if (!__HX.noise || __HX.noise.sampleRate !== ctx.sampleRate) {
    const b = ctx.createBuffer(1, (ctx.sampleRate * 0.8) | 0, ctx.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    __HX.noise = b;
  }
  const s = ctx.createBufferSource(),
    f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  s.buffer = __HX.noise;
  f.type = opt.type || 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  opt.to && f.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
  __hxEnv(ctx, g, t, opt.a || Math.min(0.015, dur / 3), vol, dur);
  s.connect(f).connect(g).connect(out);
  if (opt.send) {
    const sg = ctx.createGain();
    sg.gain.value = opt.send.amt;
    g.connect(sg).connect(opt.send.node);
  }
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
  s.onended = () => {
    try {
      g.disconnect();
      f.disconnect();
    } catch (e) {}
  };
}
function __hxSfx(kind) {
  try {
    const ctx = typeof $i < 'u' ? $i : null;
    if (!ctx || ctx.state === 'closed' || (kind === 'hover' && ctx.state !== 'running')) return;
    // the game's master gain (the volume setting); without it, scaled by the setting directly
    const bus = typeof Ce < 'u' && Ce ? Ce : null,
      out = bus || ctx.destination,
      v = bus ? 1 : (eA.settings && eA.settings.volume) ?? 0.7,
      t = ctx.currentTime + 0.004,
      rv = { node: __hxVerb(ctx, out), amt: 0 },
      p = 1 + (Math.random() - 0.5) * 0.06;
    if (v <= 0) return;
    const send = (amt) => ({ node: rv.node, amt });
    if (kind === 'hover') {
      // a glassy tick: two bright partials and a tiny air click
      __hxTone(ctx, out, t, 3400 * p, 2700 * p, 0.045, 'sine', 0.02 * v, { send: send(0.25) });
      __hxTone(ctx, out, t, 5200 * p, 4300 * p, 0.03, 'sine', 0.007 * v);
      __hxNoise(ctx, out, t, 0.02, 8000, 1.2, 0.008 * v, { type: 'highpass' });
    } else if (kind === 'tab') {
      // a soft whoosh rising, with a glint
      __hxNoise(ctx, out, t, 0.24, 700, 1.1, 0.045 * v, { to: 4200, a: 0.06, send: send(0.4) });
      __hxTone(ctx, out, t + 0.05, 1760 * p, 1760 * p, 0.22, 'sine', 0.012 * v, { a: 0.02, send: send(0.6) });
    } else if (kind === 'open' || kind === 'close') {
      const up = kind === 'open';
      __hxNoise(ctx, out, t, 0.3, up ? 500 : 2600, 0.8, 0.04 * v, { to: up ? 2600 : 420, a: 0.08, send: send(0.5) });
      __hxTone(ctx, out, t, up ? 220 : 330, up ? 330 : 196, 0.26, 'sine', 0.05 * v, { a: 0.03, lp: 1200 });
    } else if (kind === 'go') {
      // the confirm: a sub drop, a body thock, a struck chord with a shimmer, all in the room
      __hxTone(ctx, out, t, 120, 38, 0.6, 'sine', 0.32 * v, { glide: 0.5 });
      __hxTone(ctx, out, t, 240, 80, 0.16, 'triangle', 0.08 * v, { lp: 900 });
      __hxNoise(ctx, out, t, 0.05, 2600, 0.7, 0.08 * v, { send: send(0.3) });
      [329.63, 493.88, 659.25, 987.77, 1318.5].forEach((f, k) =>
        __hxTone(ctx, out, t + 0.02 + k * 0.03, f, f, 1.25, k < 2 ? 'triangle' : 'sine', (k < 2 ? 0.03 : 0.022) * v, { a: 0.03, lp: 5000, send: send(0.7), detune: (k % 2 ? 4 : -4) }),
      );
      __hxNoise(ctx, out, t + 0.04, 0.9, 3000, 0.6, 0.02 * v, { to: 11000, a: 0.2, send: send(0.8) });
    } else {
      // a press: a felted thock with a short click on top
      __hxTone(ctx, out, t, 175 * p, 62, 0.16, 'sine', 0.2 * v, { glide: 0.12, send: send(0.15) });
      __hxNoise(ctx, out, t, 0.03, 2400, 0.9, 0.06 * v);
      __hxTone(ctx, out, t + 0.006, 1250 * p, 980 * p, 0.05, 'triangle', 0.018 * v, { send: send(0.3) });
    }
  } catch (e) {}
}
typeof window < 'u' && (window.__bpHomeSfx = __hxSfx);
// ---------------------------------------------------------------- helpers
// h(tag, props, ...children) for React without JSX (mapped lists are flattened in, so no keys are needed)
function __hxE(t, p, ...c) {
  const props = p ? { ...p } : {},
    key = props.key;
  delete props.key;
  const kids = c.flat(3).filter((x) => x !== null && x !== void 0 && x !== !1 && x !== !0 && x !== '');
  kids.length === 1 ? (props.children = kids[0]) : kids.length && (props.children = kids);
  return kids.length > 1 ? M.jsxs(t, props, key) : M.jsx(t, props, key);
}
const __hxN = (n) => Math.round(n).toLocaleString('en-US');
function __hxGo(screen) {
  Zw.getState().setScreen(screen);
}
function __hxPlay(p) {
  const st = Zw.getState();
  p && st.setup(p);
  st.setScreen('setup');
}
function __hxTheater() {
  typeof window < 'u' && window.__bpTheater ? window.__bpTheater() : __hxGo('setup');
}
function __hxFullscreen() {
  try {
    const d = document,
      el = d.documentElement;
    d.fullscreenElement || d.webkitFullscreenElement
      ? (d.exitFullscreen || d.webkitExitFullscreen).call(d)
      : (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
  } catch (e) {}
}
function __hxMaps() {
  const art = typeof __MENU_ART < 'u' ? __MENU_ART : {};
  return BD.filter((m) => __HX_KEY[m.id] || art[m.id]).map((m) => ({ ...m, art: `game/menu/${__HX_KEY[m.id] || art[m.id]}.webp` }));
}
function __hxFeatured(maps) {
  return maps.length ? maps[Math.floor(Date.now() / 864e5) % maps.length] : null;
}
// the daily challenges reset when the UTC date changes (hM() is the UTC date)
function __hxResetIn() {
  const now = Date.now(),
    next = Math.ceil((now + 1) / 864e5) * 864e5,
    m = Math.max(0, Math.floor((next - now) / 6e4));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
function __hxData() {
  const A = Es(),
    B = BQ(A.xp),
    lo = oo(B),
    hi = oo(B + 1),
    s = A.stats,
    seasonXp = A.season && A.season.id === __SEASON.id ? A.season.xp : 0,
    sea = __seasonOf(seasonXp),
    chal = uu(A.daily.day).map((t) => ({ ...t, have: Math.min(t.goal, A.daily.progress[t.id] ?? 0), done: A.daily.done.includes(t.id) }));
  return {
    A,
    fresh: !s.matches,
    lvl: B,
    xp: A.xp,
    title: IG(B),
    lvlPct: B >= cc ? 100 : ((A.xp - lo) / (hi - lo)) * 100,
    toNext: B >= cc ? 0 : hi - A.xp,
    unlock: BG.find((t) => t.level > B),
    s,
    kd: s.deaths ? (s.kills / s.deaths).toFixed(2) : s.kills.toFixed(2),
    acc: s.shots ? Math.round((s.hits / s.shots) * 100) : 0,
    hs: s.kills ? Math.round((s.headshots / s.kills) * 100) : 0,
    winRate: s.matches ? Math.round((s.wins / s.matches) * 100) : 0,
    sea,
    seaName: __SEASON.name.split(' · '),
    rank: __rankOf(A.sr ?? 800),
    sr: Math.round(A.sr ?? 800),
    srPeak: Math.round(A.srPeak ?? A.sr ?? 800),
    chal,
    chalDone: chal.filter((c) => c.done).length,
    chalLeft: chal.filter((c) => !c.done).length,
    chalXp: chal.filter((c) => !c.done).reduce((a, c) => a + c.xp, 0),
    look: Ng(FQ()),
    name: gD(),
  };
}
const __hxChalIcon = (t) =>
  /melee|knife/i.test(t) ? 'knife' : /flash|smoke|grenade|molotov/i.test(t) ? 'grenade' : /streak|multi/i.test(t) ? 'bolt' : /head/i.test(t) ? 'crosshair' : /win/i.test(t) ? 'trophy' : /plant|defuse|bomb/i.test(t) ? 'bomb' : 'target';
// ---------------------------------------------------------------- artwork (inline SVG)
function __HxMark({ size = 56 }) {
  const id = S.useId().replace(/:/g, '');
  return __hxE(
    'svg',
    { className: 'hx-mark', width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': !0 },
    __hxE(
      'defs',
      null,
      __hxE(
        'linearGradient',
        { id: 'hxg' + id, x1: '0', y1: '0', x2: '0.35', y2: '1' },
        __hxE('stop', { offset: '0', stopColor: '#fff4d6' }),
        __hxE('stop', { offset: '0.38', stopColor: '#e8bf72' }),
        __hxE('stop', { offset: '0.72', stopColor: '#a8772f' }),
        __hxE('stop', { offset: '1', stopColor: '#f1d391' }),
      ),
      __hxE('linearGradient', { id: 'hxs' + id, x1: '0', y1: '0', x2: '1', y2: '1' }, __hxE('stop', { offset: '0', stopColor: '#fff', stopOpacity: '.9' }), __hxE('stop', { offset: '.5', stopColor: '#fff', stopOpacity: '0' })),
    ),
    // the B: angular bowls, a chevron notch cut into the stem, a speed slash beside it
    __hxE('path', {
      fill: `url(#hxg${id})`,
      fillRule: 'evenodd',
      d: 'M14 6H42L53 14V26L47 31.5L55 37V50L44 58H14V41L20 32L14 23ZM24 14V25H38L42 22V17L38 14ZM24 38V50H40L44 47V41L40 38Z',
    }),
    __hxE('path', { fill: `url(#hxg${id})`, d: 'M3 41L11 29V35L6 43Z', opacity: '.85' }),
    __hxE('path', { fill: 'none', stroke: `url(#hxs${id})`, strokeWidth: '1', d: 'M14.5 6.5H41.8L52.5 14.2V25.8' }),
  );
}
function __HxEmblem({ tier, size }) {
  return __hxE(
    'div',
    { className: 'hx-emblem', style: size ? { width: size } : null },
    __hxE(
      'svg',
      { viewBox: '0 0 80 80', 'aria-hidden': !0 },
      __hxE(
        'defs',
        null,
        __hxE('linearGradient', { id: 'hxem', x1: '0', y1: '0', x2: '1', y2: '1' }, __hxE('stop', { offset: '0', stopColor: '#f1e4ff' }), __hxE('stop', { offset: '.45', stopColor: '#a36bff' }), __hxE('stop', { offset: '1', stopColor: '#3e1784' })),
        __hxE('radialGradient', { id: 'hxemf', cx: '.5', cy: '.35', r: '.7' }, __hxE('stop', { offset: '0', stopColor: '#3a1d70' }), __hxE('stop', { offset: '1', stopColor: '#100722' })),
      ),
      __hxE('path', { d: 'M40 3L72 21V59L40 77L8 59V21Z', fill: 'url(#hxemf)', stroke: 'url(#hxem)', strokeWidth: '3' }),
      __hxE('path', { d: 'M40 13L63 26V54L40 67L17 54V26Z', fill: 'none', stroke: '#a36bff', strokeOpacity: '.4', strokeWidth: '1.2' }),
      __hxE('path', { d: 'M22 36L40 47L58 36M22 47L40 58L58 47', fill: 'none', stroke: 'url(#hxem)', strokeWidth: '4', strokeLinejoin: 'round', strokeLinecap: 'round' }),
      __hxE('path', { d: 'M40 17l3 7 7.5.6-5.7 4.9 1.8 7.3L40 33l-6.6 3.8 1.8-7.3-5.7-4.9 7.5-.6z', fill: '#f8efff' }),
    ),
    tier !== void 0 && __hxE('b', null, tier),
  );
}
const __hxCrown = () =>
  __hxE('svg', { className: 'hx-crown', viewBox: '0 0 24 18', 'aria-hidden': !0 }, __hxE('path', { d: 'M2 5l5 5 5-8 5 8 5-5-2 12H4z', fill: '#f2c75c', stroke: '#fff0c0', strokeWidth: '.8', strokeLinejoin: 'round' }));
const __hxTheaterIcon = (size = 22) =>
  __hxE(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': !0 },
    __hxE('rect', { x: '2.5', y: '5', width: '19', height: '12', rx: '2' }),
    __hxE('path', { d: 'M8 21h8M12 17v4' }),
    __hxE('path', { d: 'M10 9l5 2-5 2z', fill: 'currentColor' }),
  );
const __hxLvlHex = (lvl) =>
  __hxE(
    'span',
    { className: 'hx-lvlhex' },
    __hxE('svg', { viewBox: '0 0 24 24', 'aria-hidden': !0 }, __hxE('path', { d: 'M12 1.5l9.1 5.25v10.5L12 22.5l-9.1-5.25V6.75z', fill: 'url(#hxgold)', stroke: '#fff1c4', strokeWidth: '.8' })),
    __hxE('b', null, lvl),
  );
// a shared gold gradient for small glyphs
const __HxDefs = () =>
  __hxE(
    'svg',
    { width: 0, height: 0, style: { position: 'absolute' }, 'aria-hidden': !0 },
    __hxE('defs', null, __hxE('linearGradient', { id: 'hxgold', x1: '0', y1: '0', x2: '0', y2: '1' }, __hxE('stop', { offset: '0', stopColor: '#fff0c4' }), __hxE('stop', { offset: '.5', stopColor: '#e7b552' }), __hxE('stop', { offset: '1', stopColor: '#9a6a22' }))),
  );
// corner brackets + the cursor light, inside every glass card
const __hxDeco = () => [__hxE('span', { key: 'br', className: 'hx-br', 'aria-hidden': !0 }), __hxE('span', { key: 'sp', className: 'hx-spot', 'aria-hidden': !0 })];
// ---------------------------------------------------------------- pieces
function __HxBar({ pct, cls, ticks }) {
  return __hxE(
    'div',
    { className: `hx-bar ${cls || ''}` },
    __hxE('i', { style: { width: `${Math.max(0, Math.min(100, pct))}%` } }),
    ticks && ticks.map((x) => __hxE('u', { key: x, style: { left: `${x}%` } })),
  );
}
function __HxRing({ pct, label, sub, empty }) {
  const r = 34,
    c = 2 * Math.PI * r,
    v = Math.max(0, Math.min(100, pct || 0));
  return __hxE(
    'div',
    { className: `hx-ring ${empty ? 'is-empty' : ''}` },
    __hxE(
      'svg',
      { viewBox: '0 0 80 80', 'aria-hidden': !0 },
      __hxE('circle', { cx: 40, cy: 40, r, className: 'hx-ring-bg' }),
      __hxE('circle', { cx: 40, cy: 40, r, className: 'hx-ring-fg', style: { strokeDasharray: `${(c * v) / 100} ${c}` } }),
    ),
    __hxE('span', null, __hxE('b', null, label), __hxE('small', null, sub)),
  );
}
function __HxPanelHead({ kick, title, sub, onClose }) {
  return __hxE(
    'div',
    { className: 'hx-ph' },
    __hxE('div', null, __hxE('div', { className: 'hx-kick' }, kick), __hxE('h2', null, title), sub && __hxE('p', null, sub)),
    __hxE('button', { className: 'hx-x', 'data-sfx': 'close', 'aria-label': 'Close', onClick: onClose }, __hxE(Pw, { name: 'x', size: 18, sw: 2 })),
  );
}
function __HxFirst({ text, cta, onClick, sfx }) {
  return __hxE('div', { className: 'hx-first' }, __hxE('span', { className: 'hx-first-ico' }, __hxE(Pw, { name: 'spark', size: 18 })), __hxE('p', null, text), cta && __hxE('button', { className: 'hx-btn hx-btn--go hx-btn--sm', 'data-sfx': sfx || 'go', onClick }, __hxE(Pw, { name: 'play', size: 13 }), cta));
}
function __HxSeasonPanel({ d, onClose }) {
  const t = d.sea.tier,
    rewards = Object.entries(__SEASON.rewards).map(([k, v]) => [+k, v]),
    next = rewards.find(([k]) => k > t);
  return __hxE(
    'div',
    { className: 'hx-pbody' },
    __hxE(__HxPanelHead, { kick: d.seaName[0], title: d.seaName[1] || 'Season track', sub: `Tier ${t} of ${__SEASON.max}. Every match you play, offline or online, earns season XP.`, onClose }),
    __hxE(
      'div',
      { className: 'hx-sea-top' },
      __hxE(__HxEmblem, { tier: t, size: 76 }),
      __hxE(
        'div',
        { className: 'hx-grow' },
        __hxE('div', { className: 'hx-row-sb' }, __hxE('b', { className: 'hx-big' }, d.sea.title), __hxE('span', { className: 'hx-dim hx-num' }, t >= __SEASON.max ? 'Track complete' : `${__hxN(d.sea.toNext)} XP to tier ${t + 1}`)),
        __hxE(__HxBar, { pct: d.sea.pct, cls: 'hx-bar--violet' }),
      ),
    ),
    __hxE(
      'ol',
      { className: 'hx-track' },
      rewards.map(([k, v]) => {
        const got = k <= t,
          nx = next && next[0] === k,
          [kind, name] = v.split(': ');
        return __hxE(
          'li',
          { key: k, className: got ? 'is-got' : nx ? 'is-next' : '' },
          __hxE('span', { className: 'hx-track-t' }, k),
          __hxE('span', { className: 'hx-track-ico' }, __hxE(Pw, { name: got ? 'check' : nx ? 'spark' : 'lock', size: 14, sw: 2 })),
          __hxE('small', null, kind),
          __hxE('b', null, name),
        );
      }),
    ),
    __hxE(
      'div',
      { className: `hx-rank rk-t${d.rank.i}` },
      __hxE('div', { className: 'hx-rank-badge' }, __hxE('b', null, d.rank.name[0]), __hxE('i', null, d.rank.div)),
      __hxE(
        'div',
        { className: 'hx-grow' },
        __hxE('small', { className: 'hx-kick' }, d.fresh ? 'Ranked rating · your starting rating' : 'Ranked rating'),
        __hxE('div', { className: 'hx-row-sb' }, __hxE('b', { className: 'hx-big' }, `${d.rank.name} ${d.rank.div}`), __hxE('span', { className: 'hx-dim hx-num' }, `${__hxN(d.sr)} SR${d.fresh ? '' : ` · peak ${__hxN(d.srPeak)}`}`)),
        __hxE(__HxBar, { pct: d.rank.pct, cls: 'hx-bar--gold' }),
        __hxE('span', { className: 'hx-dim' }, d.rank.next ? `${d.rank.toNext} SR to ${d.rank.next}. Win matches to climb: harder bots and online matches count for more.` : 'Top tier reached'),
      ),
    ),
    __hxE('div', { className: 'hx-pfoot' }, __hxE('button', { className: 'hx-btn hx-btn--go', 'data-sfx': 'go', onClick: () => __hxPlay() }, __hxE(Pw, { name: 'play', size: 15 }), 'Play to earn season XP')),
  );
}
function __HxChallengesPanel({ d, onClose }) {
  const [, tick] = S.useState(0);
  S.useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 3e4);
    return () => clearInterval(t);
  }, []);
  return __hxE(
    'div',
    { className: 'hx-pbody' },
    __hxE(__HxPanelHead, { kick: 'Daily challenges', title: "Today's orders", sub: `${d.chalDone} of 3 done · new orders in ${__hxResetIn()}`, onClose }),
    __hxE(
      'div',
      { className: 'hx-chal' },
      d.chal.map((c) =>
        __hxE(
          'div',
          { key: c.id, className: `hx-chal-row ${c.done ? 'is-done' : ''}` },
          __hxE('span', { className: 'hx-chal-ico' }, __hxE(Pw, { name: c.done ? 'check' : __hxChalIcon(c.text), size: 20 })),
          __hxE('div', { className: 'hx-grow' }, __hxE('b', null, c.text), __hxE(__HxBar, { pct: (c.have / c.goal) * 100, cls: c.done ? 'hx-bar--green' : 'hx-bar--gold' })),
          __hxE('div', { className: 'hx-chal-num' }, __hxE('b', { className: 'hx-num' }, c.done ? 'Done' : `${c.have}/${c.goal}`), __hxE('small', { className: 'hx-num' }, `+${__hxN(c.xp)} XP`)),
        ),
      ),
    ),
    __hxE('p', { className: 'hx-note' }, 'Challenges count in every mode, offline and online. XP raises your level, which unlocks weapons and attachments, and your season tier.'),
    __hxE('div', { className: 'hx-pfoot' }, __hxE('button', { className: 'hx-btn hx-btn--go', 'data-sfx': 'go', onClick: () => __hxPlay() }, __hxE(Pw, { name: 'play', size: 15 }), 'Play now')),
  );
}
function __HxMapsPanel({ onClose }) {
  const maps = __hxMaps(),
    cur = Zw((s) => s.map),
    feat = __hxFeatured(maps);
  return __hxE(
    'div',
    { className: 'hx-pbody' },
    __hxE(__HxPanelHead, { kick: 'Maps', title: 'Choose your ground', sub: `${maps.length} maps in rotation. Pick one to set up a match on it.`, onClose }),
    __hxE(
      'div',
      { className: 'hx-maps' },
      maps.map((m) =>
        __hxE(
          'button',
          { key: m.id, className: `hx-map hx-tilt ${cur === m.id ? 'is-cur' : ''}`, 'data-sfx': 'click', onClick: () => __hxPlay({ map: m.id }) },
          __hxE('span', { className: 'hx-map-art hx-par-img', style: { backgroundImage: `url(${m.art})` } }),
          (feat && feat.id === m.id) || cur === m.id ? __hxE('span', { className: 'hx-map-tags' }, feat && feat.id === m.id && __hxE('em', { className: 'hx-tag' }, 'Map of the day'), cur === m.id && __hxE('em', { className: 'hx-tag hx-tag--line' }, 'Selected')) : null,
          __hxE('span', { className: 'hx-map-txt' }, __hxE('b', null, m.name), __hxE('small', null, [m.size, m.maxPlayers && `up to ${m.maxPlayers} players`].filter(Boolean).join(' · '))),
          __hxE('span', { className: 'hx-playdot' }, __hxE(Pw, { name: 'play', size: 14 })),
        ),
      ),
    ),
  );
}
function __HxCareerPanel({ d, onClose }) {
  const s = d.s,
    cells = [
      [__hxN(s.kills), 'Kills'],
      [__hxN(s.deaths), 'Deaths'],
      [d.kd, 'K/D ratio'],
      [`${d.hs}%`, 'Headshot rate'],
      [`${d.acc}%`, 'Accuracy'],
      [__hxN(s.wins), 'Wins'],
      [__hxN(s.matches), 'Matches'],
      [`${d.winRate}%`, 'Win rate'],
      [__hxN(s.bestStreak), 'Best streak'],
      [__hxN(s.medals), 'Medals'],
    ];
  return __hxE(
    'div',
    { className: 'hx-pbody' },
    __hxE(__HxPanelHead, { kick: 'Career', title: 'Service record', sub: `${d.name} · ${d.title} · level ${d.lvl}`, onClose }),
    __hxE(
      'div',
      { className: 'hx-sea-top' },
      __hxE('div', { className: 'hx-lvl-hex' }, __hxE('b', null, d.lvl)),
      __hxE(
        'div',
        { className: 'hx-grow' },
        __hxE('div', { className: 'hx-row-sb' }, __hxE('b', { className: 'hx-big' }, d.title), __hxE('span', { className: 'hx-dim hx-num' }, d.toNext ? `${__hxN(d.toNext)} XP to level ${d.lvl + 1}` : 'Max level')),
        __hxE(__HxBar, { pct: d.lvlPct, cls: 'hx-bar--blue' }),
        d.unlock && __hxE('span', { className: 'hx-dim' }, 'Level ', d.unlock.level, ' unlocks ', __hxE('b', { className: 'hx-gold' }, d.unlock.name)),
      ),
    ),
    d.fresh
      ? __hxE(__HxFirst, { text: 'No matches on record yet. Play your first match, offline or online, and your kills, accuracy, wins and streaks start counting here.', cta: 'Play your first match', onClick: () => __hxPlay() })
      : __hxE('div', { className: 'hx-cells' }, cells.map(([v, k]) => __hxE('div', { key: k, className: 'hx-cell' }, __hxE('b', { className: 'hx-num' }, v), __hxE('small', null, k)))),
    __hxE('div', { className: 'hx-pfoot' }, __hxE('button', { className: 'hx-btn', 'data-sfx': 'click', onClick: () => __hxGo('studio') }, __hxE(Pw, { name: 'user', size: 15 }), 'Edit callsign')),
  );
}
// ---------------------------------------------------------------- social (hooks the online backend provides)
// window.__bpSocial, when present: leaderboard() -> Promise<[{rank,id,name,rating,kd,wins,look}]>,
// friends() -> Promise<[{id,name,online,inGame:{mode,map}|null}]>, openFriends(), openServers(), me() -> {id,name,rank,rating}.
// Without it the Home shows the empty states (leaderboards open with online play; 0 friends online).
const __hxSocial = () => (typeof window < 'u' && window.__bpSocial) || null;
function __hxServers() {
  const so = __hxSocial();
  so && typeof so.openServers == 'function' ? so.openServers() : __hxGo('online');
}
function __hxUseFriends() {
  const [list, setList] = S.useState(null);
  S.useEffect(() => {
    let dead = !1;
    const pull = () => {
      const so = __hxSocial();
      if (!so || typeof so.friends != 'function') return setList(null);
      Promise.resolve()
        .then(() => so.friends())
        .then((l) => dead || setList(Array.isArray(l) ? l : []))
        .catch(() => dead || setList([]));
    };
    pull();
    const t = setInterval(pull, 3e4);
    // live updates when the backend offers them (a friend comes online, a request is accepted)
    let due = 0,
      off = null;
    const so = __hxSocial();
    try {
      so && typeof so.on == 'function' && (off = so.on(() => due || (due = setTimeout(() => ((due = 0), pull()), 400))));
    } catch (e) {}
    return () => ((dead = !0), clearInterval(t), clearTimeout(due), typeof off == 'function' && off());
  }, []);
  return list;
}
function __HxEmpty({ icon, title, text, cta, onClick }) {
  return __hxE(
    'div',
    { className: 'hx-empty' },
    __hxE('span', { className: 'hx-empty-ico' }, __hxE(Pw, { name: icon, size: 26 })),
    __hxE('b', null, title),
    __hxE('p', null, text),
    cta && __hxE('button', { className: 'hx-btn hx-btn--line', 'data-sfx': 'click', onClick }, cta, __hxE(Pw, { name: 'chevron', size: 13, sw: 2.4 })),
  );
}
function __HxLeaderPanel({ onClose }) {
  const so = __hxSocial(),
    [rows, setRows] = S.useState(so ? null : []),
    [me, setMe] = S.useState(null);
  S.useEffect(() => {
    if (!so || typeof so.leaderboard != 'function') return;
    let dead = !1;
    Promise.resolve()
      .then(() => so.leaderboard())
      .then((l) => dead || setRows(Array.isArray(l) ? l.slice(0, 50) : []))
      .catch(() => dead || setRows([]));
    try {
      const m = typeof so.me == 'function' ? so.me() : null;
      Promise.resolve(m).then((v) => dead || setMe(v || null));
    } catch (e) {}
    return () => (dead = !0);
  }, []);
  const live = !!(so && typeof so.leaderboard == 'function');
  return __hxE(
    'div',
    { className: 'hx-pbody' },
    __hxE(__HxPanelHead, { kick: 'Leaderboard', title: 'Top operators', sub: live ? 'Ranked rating across online play' : 'Ranked rating across online play', onClose }),
    !live
      ? __hxE(__HxEmpty, { icon: 'trophy', title: 'Leaderboards open when online play launches', text: 'Your rating is already counting: every win offline and online moves your SR. When the online ladders open, the best operators show here.', cta: 'Play online', onClick: () => __hxGo('online') })
      : rows === null
        ? __hxE('div', { className: 'hx-lb-load' }, Array.from({ length: 6 }, (_, k) => __hxE('i', { key: k })))
        : !rows.length
          ? __hxE(__HxEmpty, { icon: 'trophy', title: 'No ranked players yet', text: 'Be the first on the board: win online matches to set a rating.', cta: 'Play online', onClick: () => __hxGo('online') })
          : __hxE(
              'ol',
              { className: 'hx-lb' },
              rows.map((r, k) =>
                __hxE(
                  'li',
                  { key: r.id || k, className: `${k < 3 ? 'is-top is-top' + (k + 1) : ''} ${me && me.id && r.id === me.id ? 'is-me' : ''}` },
                  __hxE('span', { className: 'hx-lb-rank hx-num' }, r.rank ?? k + 1),
                  __hxE('span', { className: 'hx-lb-av' }, __hxE(hQ, { look: r.look || Ng(FQ()), size: 36 })),
                  __hxE('span', { className: 'hx-lb-name' }, __hxE('b', null, r.name || 'Operator'), __hxE('small', null, `${__hxN(r.wins || 0)} wins`)),
                  __hxE('span', { className: 'hx-lb-kd hx-num' }, __hxE('small', null, 'K/D'), (+r.kd || 0).toFixed(2)),
                  __hxE('span', { className: 'hx-lb-sr hx-num' }, __hxE('small', null, 'SR'), __hxN(r.rating || 0)),
                ),
              ),
            ),
    me && __hxE('div', { className: 'hx-lb-me' }, 'You: ', __hxE('b', null, me.name), me.rank ? ` · #${me.rank}` : '', me.rating ? ` · ${__hxN(me.rating)} SR` : ''),
  );
}
function __HxFriendsPanel({ friends, onClose }) {
  const so = __hxSocial(),
    online = (friends || []).filter((f) => f.online);
  return __hxE(
    'div',
    { className: 'hx-pbody' },
    __hxE(__HxPanelHead, { kick: 'Friends', title: 'Your squad', sub: so ? `${online.length} online` : 'Friends and chat', onClose }),
    !so
      ? __hxE(__HxEmpty, { icon: 'users', title: 'Friends open when online play launches', text: 'Add friends, see who is online and what they are playing, and jump into their lobby. Until then, browse the public lobbies.', cta: 'Browse servers', onClick: __hxServers })
      : !friends || !friends.length
        ? __hxE(__HxEmpty, { icon: 'users', title: 'No friends yet', text: 'Add players you meet online to see them here.', cta: 'Open friends', onClick: () => so.openFriends && so.openFriends() })
        : __hxE(
            'ul',
            { className: 'hx-fl' },
            friends.map((f) =>
              __hxE(
                'li',
                { key: f.id, className: f.online ? 'is-on' : '' },
                __hxE('i', null),
                __hxE('b', null, f.name),
                __hxE('small', null, f.inGame ? `${Eg[f.inGame.mode] || f.inGame.mode} · ${(BD.find((m) => m.id === f.inGame.map) || {}).name || f.inGame.map}` : f.online ? 'Online' : 'Offline'),
              ),
            ),
          ),
    so && so.openFriends && __hxE('div', { className: 'hx-pfoot' }, __hxE('button', { className: 'hx-btn hx-btn--go', 'data-sfx': 'click', onClick: () => so.openFriends() }, __hxE(Pw, { name: 'users', size: 15 }), 'Friends and chat')),
  );
}
// ---------------------------------------------------------------- the feature reel
// Each feature: its key art, a chapter, a display headline, a one-line pitch and an action.
const __HX_REEL = [
  { id: 'fortress', ch: 'Hand-built maps', map: 'fortress', title: 'Fortress', pitch: 'A sandstone citadel on a jungle island. Hold the ramparts, the helipad and the lighthouse.', act: 'Play Fortress', go: () => __hxPlay({ map: 'fortress' }) },
  { id: 'cinema', ch: 'Hand-built maps', map: 'cinema', title: 'Bayou Palace', pitch: 'An art-deco movie palace: the marquee, the gold lobby, six theaters and the projection level.', act: 'Play the Palace', go: () => __hxPlay({ map: 'cinema' }) },
  { id: 'prison', ch: 'Hand-built maps', map: 'prison', title: 'Blackwater', pitch: 'Cell blocks, the yard and the guard towers of a penitentiary under the searchlights.', act: 'Play Blackwater', go: () => __hxPlay({ map: 'prison' }) },
  { id: 'frostline', ch: 'Hand-built maps', map: 'frostline', title: 'Frostline', pitch: 'A frozen canyon at Christmas: ice tunnels, Santa’s workshop and caverns under the snow.', act: 'Play Frostline', go: () => __hxPlay({ map: 'frostline' }) },
  { id: 'ridgeback', ch: 'Hand-built maps', map: 'ridgeback', title: 'Ridgeback Pass', pitch: 'Mountain lanes, a quarry overlook and a creek gorge crossed by a single bridge.', act: 'Play Ridgeback', go: () => __hxPlay({ map: 'ridgeback' }) },
  { id: 'theater', ch: 'Theater Mode', title: '36-metre screens', pitch: 'Four Palace XL auditoriums with wall-to-wall screens. Watch films together with friends, no weapons.', act: 'Enter Theater Mode', go: __hxTheater },
  { id: 'velvet', ch: 'Theater Mode', title: 'The Velvet Room', pitch: 'An ultra-wide curved screen wrapped round rows of leather recliners.', act: 'Take a seat', go: __hxTheater },
  { id: 'starlight', ch: 'Theater Mode', title: 'The Starlight', pitch: 'Walk the gilded hallway into a 360° sphere and stand inside the film.', act: 'Step inside', go: __hxTheater },
  { id: 'bomb', ch: 'Game modes', title: 'Bomb Defusal', pitch: 'One life a round and a buy menu. Plant at A or B, or hold, retake and defuse.', act: 'Play Bomb Defusal', go: () => __hxPlay({ mode: 'bomb' }) },
  { id: 'highroller', ch: 'Game modes', title: 'High Roller', pitch: 'Start with $100,000 and buy any gun from the first second. No rank locks, any map.', act: 'Play High Roller', go: () => __hxPlay({ mode: 'hr' }) },
  { id: 'jailbreak', ch: 'Game modes', title: 'Jailbreak', pitch: 'Cut the cell locks and lead the inmates to the van, or keep every cell shut till time runs out.', act: 'Play Jailbreak', go: () => __hxPlay({ mode: 'jb', map: 'prison' }) },
  { id: 'operators', ch: 'Operators', title: 'Pick your side', pitch: 'Five Counter-Terrorists and five of the crew, each with a look and a role of their own.', act: 'Choose an operator', go: () => __hxPlay() },
];
const __HX_SLIDE_MS = 8000;
// ---------------------------------------------------------------- the screen
const __HX_TABS = [
  ['home', 'Home'],
  ['season', 'Season'],
  ['challenges', 'Challenges'],
  ['leaderboard', 'Leaderboard'],
  ['maps', 'Maps'],
  ['career', 'Career'],
];
function __HxHome() {
  const rev = Zw((s) => s.profileRev),
    mode = Zw((s) => s.mode),
    mapId = Zw((s) => s.map),
    d = S.useMemo(__hxData, [rev]),
    [tab, setTabRaw] = S.useState('home'),
    [closing, setClosing] = S.useState(!1),
    root = S.useRef(null),
    par = S.useRef(null),
    tabsRef = S.useRef(null),
    ind = S.useRef(null),
    stripRef = S.useRef(null),
    [, tick] = S.useState(0),
    touch = Ts(),
    friends = __hxUseFriends(),
    reduce = S.useMemo(() => typeof matchMedia == 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  // the reel: starts on the map of the day, advances every few seconds, pauses while you point at it
  const feat = __hxFeatured(__hxMaps()),
    [slide, setSlide] = S.useState(() => Math.max(0, __HX_REEL.findIndex((r) => feat && r.id === feat.id))),
    [prevSlide, setPrev] = S.useState(-1),
    [paused, setPaused] = S.useState(!1),
    go = S.useCallback((k) => {
      setSlide((cur) => {
        const n = (k + __HX_REEL.length) % __HX_REEL.length;
        n !== cur && setPrev(cur);
        return n;
      });
    }, []);
  S.useEffect(() => {
    if (paused || reduce || tab !== 'home') return;
    const t = setTimeout(() => go(slide + 1), __HX_SLIDE_MS);
    return () => clearTimeout(t);
  }, [slide, paused, reduce, tab, go]);
  // keep the active frame of the filmstrip in view (phones scroll the strip sideways)
  S.useEffect(() => {
    const el = stripRef.current && stripRef.current.querySelector('.hx-fr-on');
    el && el.scrollIntoView && stripRef.current.scrollWidth > stripRef.current.clientWidth + 4 && el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [slide, reduce]);
  // a tab: open its panel (or close it if it is the one open); closing plays out before it unmounts
  const closeT = S.useRef(0);
  const close = S.useCallback(() => {
    setTabRaw((cur) => {
      if (cur === 'home') return cur;
      setClosing(!0);
      clearTimeout(closeT.current);
      closeT.current = setTimeout(() => (setClosing(!1), setTabRaw('home')), 260);
      return cur;
    });
  }, []);
  const setTab = (t) => {
    clearTimeout(closeT.current);
    setClosing(!1);
    setTabRaw((cur) => {
      if (t === 'home' || cur === t) {
        cur !== 'home' && (setClosing(!0), (closeT.current = setTimeout(() => (setClosing(!1), setTabRaw('home')), 260)));
        return cur;
      }
      cur === 'home' && __hxSfx('open');
      return t;
    });
  };
  S.useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 3e4);
    return () => (clearInterval(t), clearTimeout(closeT.current));
  }, []);
  // keys: Esc closes a panel; left and right step the reel
  S.useEffect(() => {
    const k = (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (tab !== 'home') e.key === 'Escape' && (e.stopPropagation(), __hxSfx('close'), close());
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') (__hxSfx('tab'), go(slide + (e.key === 'ArrowRight' ? 1 : -1)));
    };
    window.addEventListener('keydown', k, !0);
    return () => window.removeEventListener('keydown', k, !0);
  }, [tab, close, slide, go]);
  // the sliding tab underline
  S.useLayoutEffect(() => {
    const place = () => {
      const nav = tabsRef.current,
        bar = ind.current;
      if (!nav || !bar) return;
      const b = nav.querySelector(`[data-tab="${closing ? 'home' : tab}"]`);
      if (!b) return;
      bar.style.transform = `translate3d(${b.offsetLeft + 6}px,0,0) scaleX(${Math.max(1, b.offsetWidth - 12)})`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [tab, closing]);
  // sounds, the reel's parallax, the slabs' tilt and cursor light: one set of delegated listeners
  S.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const over = (e) => {
      const t = e.target.closest && e.target.closest('[data-sfx]');
      if (t === __HX.lastHover) return;
      __HX.lastHover = t;
      if (!t || e.pointerType !== 'mouse' || t.disabled) return;
      const now = performance.now();
      now - __HX.hoverAt > 60 && ((__HX.hoverAt = now), __hxSfx('hover'));
    };
    const down = (e) => {
      const t = e.target.closest && e.target.closest('[data-sfx]');
      if (!t || t.disabled || (e.button !== void 0 && e.button > 0)) return;
      try {
        p1();
      } catch (x) {}
      __hxSfx(t.dataset.sfx);
    };
    const reset = (c) => {
      if (!c) return;
      c.style.removeProperty('--tx');
      c.style.removeProperty('--ty');
      c.classList.remove('is-tilt');
    };
    const frame = () => {
      __HX.raf = 0;
      const W = el.clientWidth || 1,
        H = el.clientHeight || 1,
        c = __HX.card;
      if (c && c.isConnected) {
        const r = c.getBoundingClientRect(),
          x = (__HX.mx - r.left) / r.width,
          y = (__HX.my - r.top) / r.height;
        c.style.setProperty('--px', `${(__HX.mx - r.left).toFixed(0)}px`);
        c.style.setProperty('--py', `${(__HX.my - r.top).toFixed(0)}px`);
        if (!reduce && c.classList.contains('hx-tilt')) {
          c.style.setProperty('--tx', (x - 0.5).toFixed(3));
          c.style.setProperty('--ty', (y - 0.5).toFixed(3));
          c.classList.add('is-tilt');
        }
      }
      if (par.current && !reduce) {
        par.current.style.setProperty('--hx', (__HX.mx / W - 0.5).toFixed(3));
        par.current.style.setProperty('--hy', (__HX.my / H - 0.5).toFixed(3));
      }
    };
    const move = (e) => {
      if (e.pointerType !== 'mouse') return;
      __HX.mx = e.clientX;
      __HX.my = e.clientY;
      const c = e.target.closest ? e.target.closest('.hx-g, .hx-tilt') : null;
      c !== __HX.card && (reset(__HX.card), (__HX.card = c));
      __HX.raf || (__HX.raf = requestAnimationFrame(frame));
    };
    const leave = () => (reset(__HX.card), (__HX.card = null));
    el.addEventListener('pointerover', over, { passive: !0 });
    el.addEventListener('pointerdown', down, { passive: !0 });
    el.addEventListener('pointermove', move, { passive: !0 });
    el.addEventListener('pointerleave', leave, { passive: !0 });
    return () => {
      el.removeEventListener('pointerover', over);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      __HX.raf && cancelAnimationFrame(__HX.raf);
      __HX.raf = 0;
      __HX.lastHover = null;
      __HX.card = null;
    };
  }, [reduce]);
  const curMap = BD.find((m) => m.id === mapId),
    modeName = Eg[mode] || 'Team Deathmatch',
    mapName = curMap ? curMap.name : 'Ridgeback Pass',
    R = __HX_REEL[slide],
    so = __hxSocial(),
    onlineCount = friends ? friends.filter((f) => f.online).length : 0,
    E = __hxE;
  // ---- header
  const header = E(
    'header',
    { key: 'head', className: 'hx-head hx-e', style: { '--d': '.25s' } },
    E(
      'button',
      { className: 'hx-brand', 'data-sfx': 'click', onClick: () => setTab('home'), 'aria-label': 'Bayou Tactical, Home' },
      E(__HxMark, { size: 54 }),
      E('span', { className: 'hx-word' }, E('b', null, 'BAYOU'), E('small', null, 'Tactical')),
    ),
    E(
      'nav',
      { className: 'hx-tabs', ref: tabsRef, 'aria-label': 'Home sections' },
      __HX_TABS.map(([id, label]) => E('button', { key: id, 'data-tab': id, className: 'hx-tab', 'data-sfx': 'tab', 'aria-current': (closing ? 'home' : tab) === id, onClick: () => setTab(id) }, label)),
      E('i', { className: 'hx-tab-ind', ref: ind, 'aria-hidden': !0 }),
    ),
    E(
      'div',
      { className: 'hx-tr' },
      E(
        'button',
        { className: 'hx-hbtn hx-hbtn--friends', 'data-sfx': 'click', title: 'Friends', 'aria-label': `Friends, ${onlineCount} online`, onClick: () => (so && so.openFriends ? so.openFriends() : setTab('friends')) },
        E(Pw, { name: 'users', size: 19 }),
        E('span', { className: 'hx-hbtn-txt' }, 'Friends'),
        E('em', { className: `hx-num ${onlineCount ? 'is-live' : ''}` }, onlineCount),
      ),
      E(
        'button',
        { className: 'hx-hbtn hx-hbtn--icon', 'data-sfx': 'click', title: "Today's challenges", 'aria-label': `Today's challenges, ${d.chalLeft} left`, onClick: () => setTab('challenges') },
        E(Pw, { name: 'trophy', size: 19 }),
        d.chalLeft > 0 && E('i', { className: 'hx-dot' }, d.chalLeft),
      ),
      E('button', { className: 'hx-hbtn hx-hbtn--icon hx-hbtn--fs', 'data-sfx': 'click', title: 'Full screen', 'aria-label': 'Full screen', onClick: __hxFullscreen }, E(Pw, { name: 'fullscreen', size: 18 })),
      E(
        'button',
        { className: 'hx-xp', 'data-sfx': 'click', title: d.toNext ? `${__hxN(d.toNext)} XP to level ${d.lvl + 1}. Earn it with challenges.` : 'Max level', onClick: () => setTab('challenges') },
        __hxLvlHex(d.lvl),
        E('span', { className: 'hx-xp-txt' }, E('small', null, `Level ${d.lvl}`), E('b', { className: 'hx-num' }, d.xp ? `${__hxN(d.xp)} XP` : `${__hxN(d.toNext)} XP to go`), E(__HxBar, { pct: d.lvlPct, cls: 'hx-bar--gold hx-bar--thin' })),
      ),
    ),
  );
  // ---- left: Play, the floating nav on a luminous rail, and you
  const navItems = [
    { id: 'online', icon: 'globe', t: 'Multiplayer', s: 'Quick play into a live lobby', go: () => __hxGo('online') },
    { id: 'servers', icon: 'list', t: 'Servers', s: 'Browse or host a lobby', go: __hxServers },
    { id: 'training', icon: 'target', t: 'Training', s: 'Free-for-all vs easy bots', go: () => __hxPlay({ mode: 'ffa', difficulty: 'easy' }) },
    { id: 'theater', icon: null, t: 'Theater Mode', s: 'Films together, no weapons', go: __hxTheater },
    { id: 'profile', icon: 'user', t: 'Profile', s: 'Callsign and operators', go: () => __hxGo('studio') },
    { id: 'settings', icon: 'gear', t: 'Settings', s: 'Controls, video, sound', go: () => __hxGo('settings') },
  ];
  const nav = E(
    'nav',
    { key: 'nav', className: 'hx-nav', 'aria-label': 'Main' },
    E(
      'div',
      { className: 'hx-playwrap hx-e', style: { '--d': '.35s' } },
      E(
        'button',
        { className: 'hx-play', 'data-sfx': 'go', onClick: () => __hxPlay(), 'aria-label': `Play: ${modeName} on ${mapName}` },
        E(
          'span',
          { className: 'hx-play-in' },
          E('span', { className: 'hx-play-ico' }, E('svg', { viewBox: '0 0 24 24', width: 30, height: 30, 'aria-hidden': !0 }, E('path', { d: 'M6 3.5v17l14-8.5z', fill: 'currentColor' }))),
          E('span', { className: 'hx-play-txt' }, E('b', null, 'Play'), E('small', null, 'Enter the arena')),
          E('span', { className: 'hx-play-chev' }, E(Pw, { name: 'chevron', size: 26, sw: 2.4 })),
        ),
      ),
      E('span', { className: 'hx-play-meta' }, E('i', null), E('span', null, modeName), E('b', null, mapName)),
    ),
    E(
      'div',
      { className: 'hx-navlist' },
      E('i', { className: 'hx-rail', 'aria-hidden': !0 }),
      navItems.map((n, k) =>
        E(
          'button',
          { key: n.id, className: 'hx-ni hx-e', style: { '--d': `${0.45 + k * 0.05}s` }, 'data-sfx': 'click', onClick: n.go },
          E('span', { className: 'hx-ni-ico' }, n.icon ? E(Pw, { name: n.icon, size: 19 }) : __hxTheaterIcon(19)),
          E('span', { className: 'hx-ni-txt' }, E('b', null, n.t), E('small', null, n.s)),
        ),
      ),
    ),
    E(
      'button',
      { className: 'hx-me hx-e', style: { '--d': '.8s' }, 'data-sfx': 'click', onClick: () => __hxGo('studio'), 'aria-label': `${d.name}, level ${d.lvl}. Open profile.` },
      E('span', { className: 'hx-me-av' }, E(hQ, { look: d.look, size: 48 }), E('i', { className: 'hx-num' }, d.lvl)),
      E(
        'span',
        { className: 'hx-me-txt' },
        E('small', null, d.fresh ? 'Welcome, operator' : 'Welcome back'),
        E('b', null, d.name),
        E('span', { className: 'hx-me-line hx-num' }, d.fresh ? `${d.title} · no matches yet` : `${d.title} · K/D ${d.kd} · ${__hxN(d.s.wins)} wins`),
      ),
    ),
  );
  // ---- the feature caption, floating over the art
  const caption = E(
    'section',
    { key: 'cap-' + slide, className: 'hx-feat', 'aria-live': 'polite', onPointerEnter: () => setPaused(!0), onPointerLeave: () => setPaused(!1) },
    E('span', { className: 'hx-feat-k' }, E('b', { className: 'hx-num' }, String(slide + 1).padStart(2, '0')), E('i', null), R.ch, feat && R.id === feat.id && E('em', { className: 'hx-tag hx-tag--sheen' }, 'Map of the day')),
    E('h1', { className: 'hx-feat-h' }, R.title),
    E('p', { className: 'hx-feat-p' }, R.pitch),
    E(
      'span',
      { className: 'hx-feat-act' },
      E('button', { className: 'hx-cta', 'data-sfx': 'go', onClick: R.go }, E('span', null, R.act), E(Pw, { name: 'chevron', size: 16, sw: 2.6 })),
      R.map && E('button', { className: 'hx-link', 'data-sfx': 'tab', onClick: () => setTab('maps') }, 'All maps'),
      !R.map && R.ch === 'Theater Mode' && E('span', { className: 'hx-feat-note' }, E('i', null), 'Voice chat · up to 50 in a lobby'),
    ),
  );
  // ---- right: the season and today's orders, as angled slabs lit at the edges
  const season = E(
    'button',
    { key: 'season', className: 'hx-slab hx-slab--season hx-g hx-tilt hx-e', style: { '--d': '.55s', '--c': '168,96,255' }, 'data-sfx': 'click', onClick: () => setTab('season') },
    E('span', { className: 'hx-slab-art hx-par-img', style: { backgroundImage: `url(${__HX_ART.op})` } }),
    E('span', { className: 'hx-slab-edge' }),
    E('span', { className: 'hx-spot' }),
    E(
      'span',
      { className: 'hx-slab-in' },
      E('span', { className: 'hx-kick hx-gold' }, d.seaName[0], ' · ', E('span', { className: 'hx-num' }, `Tier ${d.sea.tier}/${__SEASON.max}`)),
      E('span', { className: 'hx-slab-h' }, d.seaName[1] || 'Season track'),
      E('span', { className: 'hx-slab-p' }, d.sea.nextReward ? E(M.Fragment, null, `Tier ${d.sea.nextReward[0]} · `, E('b', null, d.sea.nextReward[1].replace(': ', ' — '))) : 'Season track complete'),
      E(__HxBar, { pct: d.sea.pct, cls: 'hx-bar--violet hx-bar--thin' }),
    ),
  );
  const daily = E(
    'button',
    { key: 'daily', className: 'hx-slab hx-slab--daily hx-g hx-tilt hx-e', style: { '--d': '.62s', '--c': '236,182,92' }, 'data-sfx': 'click', onClick: () => setTab('challenges') },
    E('span', { className: 'hx-slab-art hx-slab-art--crate hx-par-img', style: { backgroundImage: `url(${__HX_ART.crate})` } }),
    E('span', { className: 'hx-slab-edge' }),
    E('span', { className: 'hx-spot' }),
    E(
      'span',
      { className: 'hx-slab-in' },
      E('span', { className: 'hx-kick hx-gold' }, 'Daily orders · ', E('span', { className: 'hx-num' }, __hxResetIn())),
      E('span', { className: 'hx-slab-h hx-num' }, d.chalLeft ? `+${__hxN(d.chalXp)} XP` : 'All done'),
      E('span', { className: 'hx-slab-p' }, d.chalLeft ? `${d.chalLeft} challenge${d.chalLeft > 1 ? 's' : ''} left today` : 'New orders tomorrow'),
      E('span', { className: 'hx-pips' }, d.chal.map((c) => E('i', { key: c.id, className: c.done ? 'is-done' : '' }))),
    ),
  );
  const career = E(
    'button',
    { key: 'career', className: 'hx-stat-line hx-e', style: { '--d': '.7s' }, 'data-sfx': d.fresh ? 'go' : 'click', onClick: () => (d.fresh ? __hxPlay({ mode: 'ffa', difficulty: 'easy' }) : setTab('career')) },
    d.fresh
      ? E(M.Fragment, null, E('small', null, 'Service record'), E('b', null, 'Play your first match to start your record'), E(Pw, { name: 'chevron', size: 14, sw: 2.4 }))
      : [
          ['Win rate', `${d.winRate}%`],
          ['K/D', d.kd],
          ['Matches', __hxN(d.s.matches)],
          ['Rank', `${d.rank.name} ${d.rank.div}`],
        ].map(([k, v]) => E('span', { key: k }, E('small', null, k), E('b', { className: 'hx-num' }, v))),
  );
  // ---- the filmstrip: every feature, skewed frames grouped by chapter, the active one timing the reel
  let lastCh = '';
  const strip = E(
    'section',
    { key: 'strip', className: 'hx-strip hx-e', style: { '--d': '.85s' }, 'aria-label': 'Features', onPointerEnter: () => setPaused(!0), onPointerLeave: () => setPaused(!1) },
    E('button', { className: 'hx-strip-arr', 'data-sfx': 'tab', 'aria-label': 'Previous feature', onClick: () => go(slide - 1) }, E(Pw, { name: 'chevron', size: 18, sw: 2.4, style: { transform: 'scaleX(-1)' } })),
    E(
      'div',
      { className: 'hx-fr', ref: stripRef },
      __HX_REEL.map((r, k) => {
        const head = r.ch !== lastCh;
        lastCh = r.ch;
        return E(
          'button',
          { key: r.id, className: `hx-frame ${k === slide ? 'hx-fr-on' : ''} ${head ? 'hx-frame--head' : ''}`, 'data-ch': head ? r.ch : void 0, 'data-sfx': 'tab', 'aria-label': `${r.ch}: ${r.title}`, 'aria-current': k === slide, onClick: () => go(k) },
          E('span', { className: 'hx-frame-in' }, E('span', { className: 'hx-frame-img', style: { backgroundImage: `url(${__hxImg('reel-' + r.id)})` } })),
          E('span', { className: 'hx-frame-t' }, r.title),
          k === slide && E('i', { key: `p${slide}-${paused ? 'p' : 'r'}`, className: `hx-frame-prog ${paused || reduce || tab !== 'home' ? 'is-paused' : ''}`, style: { animationDuration: `${__HX_SLIDE_MS}ms` } }),
        );
      }),
    ),
    E('button', { className: 'hx-strip-arr', 'data-sfx': 'tab', 'aria-label': 'Next feature', onClick: () => go(slide + 1) }, E(Pw, { name: 'chevron', size: 18, sw: 2.4 })),
  );
  const footer = E(
    'footer',
    { key: 'foot', className: 'hx-foot hx-e', style: { '--d': '1s' } },
    E(
      'div',
      { className: 'hx-links' },
      E('button', { 'data-sfx': 'click', onClick: () => __hxGo('guide') }, 'How to play'),
      E('button', { 'data-sfx': 'click', onClick: () => __hxGo('settings') }, 'Controls'),
      E('button', { 'data-sfx': 'click', onClick: () => __hxGo('about') }, 'About and credits'),
      touch && E('span', { className: 'hx-touch' }, E(Pw, { name: 'touch', size: 14 }), 'Touch controls on'),
    ),
    E('div', { className: 'hx-tagline' }, E('i', null), E('span', { className: 'hx-sheen-txt' }, 'Bayou · Play · Compete · Dominate')),
  );
  const panelBody =
    tab === 'season'
      ? E(__HxSeasonPanel, { d, onClose: close })
      : tab === 'challenges'
        ? E(__HxChallengesPanel, { d, onClose: close })
        : tab === 'maps'
          ? E(__HxMapsPanel, { onClose: close })
          : tab === 'leaderboard'
            ? E(__HxLeaderPanel, { onClose: close })
            : tab === 'friends'
              ? E(__HxFriendsPanel, { friends, onClose: close })
              : E(__HxCareerPanel, { d, onClose: close });
  const panel = tab !== 'home' && E('section', { key: 'panel-' + tab, className: `hx-panel hx-panel--${tab} ${closing ? 'is-closing' : ''}`, role: 'dialog', 'aria-label': (__HX_TABS.find((t) => t[0] === tab) || [0, 'Friends'])[1] }, E('span', { className: 'hx-panel-edge', 'aria-hidden': !0 }), panelBody);
  // phones and portrait tablets: a bottom tab bar
  const tabbar = E(
    'nav',
    { className: 'hx-tabbar', 'aria-label': 'Main' },
    [
      ['home', E(Pw, { name: 'home', size: 21 }), 'Home', () => setTab('home')],
      ['online', E(Pw, { name: 'globe', size: 21 }), 'Online', () => __hxGo('online')],
      ['play', E(Pw, { name: 'play', size: 22 }), 'Play', () => __hxPlay()],
      ['theater', __hxTheaterIcon(21), 'Theater', __hxTheater],
      ['settings', E(Pw, { name: 'gear', size: 21 }), 'Settings', () => __hxGo('settings')],
    ].map(([id, ic, label, fn]) => E('button', { key: id, 'data-sfx': id === 'play' ? 'go' : 'click', 'aria-current': id === 'home', className: id === 'play' ? 'is-play' : '', onClick: fn }, E('span', null, ic), label)),
  );
  // the reel: the active slide (and the one fading out) full-bleed, in layers that move with the cursor
  const shown = [prevSlide, slide].filter((k, i, a) => k >= 0 && a.indexOf(k) === i);
  return E(
    'div',
    { ref: root, className: `hx ${tab !== 'home' && !closing ? 'hx--panel' : ''} ${__HX_LITE ? 'hx--lite' : ''}`, 'data-slide': R.id },
    E(__HxDefs, null),
    E(
      'div',
      { className: 'hx-hero', 'aria-hidden': !0 },
      E(
        'div',
        { className: 'hx-par', ref: par },
        shown.map((k) => E('div', { key: __HX_REEL[k].id, className: `hx-slide ${k === slide ? 'is-on' : 'is-off'}` }, E('div', { className: 'hx-slide-img', style: { backgroundImage: `url(${__hxImg('reel-' + __HX_REEL[k].id)})` } }))),
      ),
      E('i', { className: 'hx-glare' }),
      E('div', { className: 'hx-motes' }, Array.from({ length: 16 }, (_, k) => E('i', { key: k, style: { '--k': k } }))),
      E('div', { className: 'hx-shade' }),
      E('div', { className: 'hx-grain' }),
    ),
    E(
      'div',
      { className: 'hx-scroll' },
      E('div', { className: 'hx-ui' }, header, panel, E('div', { key: 'space', className: 'hx-herospace' }), caption, nav, E('aside', { key: 'right', className: 'hx-right' }, season, daily, career), strip, footer),
    ),
    tabbar,
  );
}
RIA = __HxHome;
