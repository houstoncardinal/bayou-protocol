/* ===== Bayou Protocol mod: Theater Mode (watch films together, no weapons) ===== */
// Bayou Palace Cinemas as a place to go to the movies: no bots, no guns, no damage, no clock. Walk the lobby,
// pick a theater, take a seat (Use) and watch; online, everyone in the lobby is there together with voice chat
// (the game's own, K to talk). Start it from "Theater Mode" in the menu's side rail (offline, straight in) or
// pick it as the mode of an online lobby.
// It runs as the engine's team deathmatch with `st.theater` set: the core's match flow, spawns and online
// sync, with the fighting taken out.
const __TH = { lobby: [[60, 34.5], [57, 35.5], [63, 35.5], [54, 33.5], [66, 33.5], [60, 37.5], [51, 36], [69, 36]] };
// ---------------------------------------------------------------- the match
{
  const coreStart = BY;
  BY = function (w) {
    if (!w || w.mode !== 'theater') return coreStart.apply(this, arguments);
    const st = coreStart.call(this, { ...w, mode: 'tdm', map: 'cinema' });
    st.theater = !0;
    st.winScore = 1e9;
    // people only: no bots
    st.players = st.players.filter((p) => !p.isBot);
    return st;
  };
}
// everyone empty-handed (the knife kept as the "nothing" slot the engine needs, never drawn or used)
function __thDisarm(p) {
  const w = p.weapons || {};
  if (Object.keys(w).length !== 1 || !w[3]) p.weapons = { 3: { id: 'knife', mag: 0, reserve: 0, max: 0 } };
  p.active = 3;
  p.money = 0;
}
// to the lobby on every (re)spawn, facing the theaters
function __thPlace(st) {
  st.players.forEach((p, k) => {
    if (!p.alive || p.__thPlaced === st.round) return;
    p.__thPlaced = st.round;
    const [x, zz] = __TH.lobby[k % __TH.lobby.length];
    p.pos = { x, y: 0.12, z: zz };
    p.vel = { x: 0, y: 0, z: 0 };
    p.yaw = Math.PI;
    p.pitch = 0;
  });
}
{
  const coreY8 = Y8;
  Y8 = function (w, A, i, I) {
    if (w && w.theater && i) i = { ...i, fire: !1, ads: !1, aim: !1, reload: !1, melee: !1, buy: !1, slot: 0 };
    return coreY8.call(this, w, A, i, I);
  };
}
{
  const coreHurt = Ee;
  Ee = function (w) {
    if (w && w.theater) return;
    return coreHurt.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- each frame: no clock, no guns, no gun HUD
{
  const prevTrees = kwA;
  kwA = function () {
    QI(() => {
      const st = eA.state,
        on = !!(st && st.theater && !eA.attract);
      if (typeof document < 'u' && document.body.classList.contains('bp-theater') !== on) document.body.classList.toggle('bp-theater', on);
      const vs = typeof window < 'u' && window.__vmScene;
      if (!on) return void (vs && vs.__thHid && ((vs.visible = !0), (vs.__thHid = 0)));
      vs && vs.visible && ((vs.visible = !1), (vs.__thHid = 1));
      st.phase === 'live' && st.phaseLeft < 3600 && (st.phaseLeft = 3600 * 6);
      for (const p of st.players) __thDisarm(p);
      __thPlace(st);
    });
    return M.jsx(prevTrees, {});
  };
}
// ---------------------------------------------------------------- the mode in the menus
(function () {
  Eg.theater = 'Theater Mode';
  Object.assign(oU, { theater: 1 });
  Object.assign(sBA, { theater: ['Movies', 'No weapons', 'Voice'] });
  Object.assign(CBA, { theater: ['#7a1f2a', '#120a0c'] });
  gF.some(([k]) => k === 'theater') || gF.push(['theater', 'Bayou Palace Cinemas with no guns: walk in, take a seat and watch the films together. Online, talk with voice chat.']);
  CN.includes('theater') || CN.push('theater');
  // Theater Mode is the cinema's: choosing it picks the map; another map turns it back into team deathmatch
  try {
    const orig = Zw.getState().setup;
    Zw.setState({
      setup: (p = {}) => {
        const cur = Zw.getState(),
          mode = p.mode ?? cur.mode,
          map = p.map ?? cur.map;
        if (p.mode === 'theater' && map !== 'cinema') p = { ...p, map: 'cinema' };
        else if (p.map && p.map !== 'cinema' && mode === 'theater') p = { ...p, mode: 'tdm' };
        return orig(p);
      },
    });
  } catch (e) {}
})();
// "Theater Mode" in the menu's side rail, under Play offline: straight into the cinema
function __thGo() {
  const s = Zw.getState();
  s.setup({ mode: 'theater', map: 'cinema' });
  s.setScreen('setup');
  // deploy from the setup screen (the normal path: loading screen, operator, settings)
  let n = 0;
  const t = setInterval(() => {
    const b = document.querySelectorAll('.lx-actionbar .lx-btn--go');
    if (b.length || ++n > 40) {
      clearInterval(t);
      b.length && b[b.length - 1].click();
    }
  }, 50);
}
if (typeof document < 'u') {
  const st = document.createElement('style');
  st.textContent = [
    // in the theater: no gun HUD (ammo, slots, money, kill feed, medals)
    'body.bp-theater .hud-weapon,body.bp-theater .hud-slots,body.bp-theater .hud-wallet,body.bp-theater .hud-feed,body.bp-theater .hud-medals,body.bp-theater .hud-vitals{display:none!important}',
    // the score and clock at the top (no score, no clock in the theater)
    'body.bp-theater .fps-hud > .absolute.left-1\\/2.top-3,body.bp-theater .fps-hud > .absolute.left-1\\/2{display:none!important}',
    // the Home screen's Theater Mode card
    '@media (min-width:900px){.hm2-plays{grid-template-columns:repeat(3,minmax(0,1fr))!important}}@media (max-width:899px){.hm2-plays{grid-template-columns:1fr!important}}',
    '.bp-th-rail{position:relative}.bp-th-rail .bp-th-ic{display:grid;place-items:center}',
  ].join('');
  document.head.appendChild(st);
  const inject = () => {
    if (document.querySelector('.bp-th-rail')) return;
    const off = [...document.querySelectorAll('button')].find((b) => /Play offline/.test(b.textContent) && /Against bots/.test(b.textContent));
    if (!off) return;
    const b = off.cloneNode(!0);
    b.classList.add('bp-th-rail');
    b.removeAttribute('aria-current');
    const texts = [...b.querySelectorAll('*')].filter((e) => !e.children.length && e.textContent.trim());
    texts.forEach((e) => (/Play offline/.test(e.textContent) ? (e.textContent = 'Theater Mode') : /Against bots/.test(e.textContent) && (e.textContent = 'Watch films, no weapons')));
    const svg = b.querySelector('svg');
    svg &&
      (svg.outerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="12" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M10 9l5 2-5 2z" fill="currentColor"/></svg>');
    b.addEventListener('click', (e) => (e.preventDefault(), e.stopPropagation(), __thGo()), !0);
    off.after(b);
  };
  // (checked at most five times a second, and never during a match: the HUD changes the page constantly)
  let due = 0;
  new MutationObserver(() => {
    if (due || Zw.getState().screen === 'playing') return;
    due = setTimeout(() => ((due = 0), inject()), 200);
  }).observe(document.documentElement, { childList: !0, subtree: !0 });
  window.__bpTheater = __thGo;
}
