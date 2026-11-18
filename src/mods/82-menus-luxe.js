/* ===== Bayou Tactical mod: every menu screen in the Home's language ===== */
// Play offline, Play online, Settings, Profile, How to play and About share one frame (the core's `ao`):
// the old left side-rail and its "BAYOU PROTOCOL / Southwest Houston Tactical" logo are replaced by the Home's
// header (the B mark and BAYOU TACTICAL, tabs that say where you are, your level), the screen's own key art behind
// glass, and the Home's generated UI sounds on every button. Each screen keeps its own components and controls:
// they are restyled in src/styles/menus-luxe.css (cinematic mode and map pickers using the reel art, angled
// step bar, glass panels lit at the edges, an angled gold Deploy). Profile gets a real service record beside the
// callsign. Map thumbnails everywhere (setup, online, loading screen) become the reel's key art.
// Phones, tablets and low-memory devices (__LOWMEM): the 1280 px copies of the art, no slow push-in.
const __MX = { lite: typeof __LOWMEM < 'u' && !!__LOWMEM };
const __mxArt = (k) => `game/menu/reel-${k}${__MX.lite ? '-m' : ''}.webp`;
// map thumbnails and previews (the setup's map step, online lobbies): the reel's key art
for (const id of ['fortress', 'cinema', 'prison', 'frostline', 'ridgeback']) ll.set(id, __mxArt(id));
// Settings > Key bindings crashed the screen ("Something went wrong"): the live bindings and the key -> action map
// are built before the mods run, so an action a mod adds (Inspect weapon, 39-animated-weapons.js) had no binding
// entry, and one a mod removes (the scorestreak key, 32-ground-combat.js) was still in the map with no label.
// Every listed action gets an entry (its default keys) and the map is rebuilt from the list as it is now.
try {
  for (const b of Pn) Gi[b.id] || (Gi[b.id] = [...(Ys[b.id] || [null, null])]);
  W3 = L3();
} catch (e) {}
// the mode cards' art: the reel's key art (relative URLs, as the page is served from any folder)
if (typeof document < 'u') {
  const st = document.createElement('style'),
    art = { tdm: ['operators', '38% 30%'], ffa: ['ridgeback', 'center'], bomb: ['bomb', '40% center'], jb: ['jailbreak', '35% center'] };
  st.textContent = Object.entries(art)
    .map(([m, [k, pos]]) => `.mx .po-mode[data-mode='${m}'] .po-mode-art{background:url(${__mxArt(k)}) ${pos} / cover no-repeat!important}`)
    .join('');
  document.head.appendChild(st);
}
// the art behind each screen: the chosen map for match setup, a feature elsewhere
const __MX_BG = {
  setup: (z) => (z.mode === 'jb' ? 'jailbreak' : z.mode === 'bomb' && !__MX_MAPS.has(z.map) ? 'bomb' : z.map),
  online: (z) => z.map,
  settings: () => 'velvet',
  studio: () => 'operators',
  guide: () => 'bomb',
  about: () => 'cinema',
};
const __MX_MAPS = new Set(['fortress', 'cinema', 'prison', 'frostline', 'ridgeback']);
const __MX_NAV = [
  ['menu', 'Home', 'home'],
  ['setup', 'Play offline', 'target'],
  ['online', 'Play online', 'globe'],
  ['theater', 'Theater', null],
  ['settings', 'Settings', 'gear'],
  ['studio', 'Profile', 'user'],
];
const __MX_TITLE = { setup: 'Play offline', online: 'Play online', settings: 'Settings', studio: 'Profile', guide: 'How to play', about: 'About' };
// the brand, wherever the core draws it
vV = function ({ onClick: w, compact: A = !1 }) {
  return M.jsxs('button', {
    className: 'lx-brand mx-brand',
    onClick: w,
    'aria-label': 'Bayou Tactical, Home',
    children: [M.jsx(__HxMark, { size: A ? 36 : 44 }), M.jsxs('span', { className: 'mx-word', children: [M.jsx('b', { children: 'BAYOU' }), M.jsx('small', { children: 'Tactical' })] })],
  });
};
// the Home's UI sounds on every button of a menu screen
function __mxSounds(el) {
  if (!el) return () => {};
  let last = null,
    at = 0;
  const pick = (t) => (t.closest('.lx-btn--go, .hx-play') ? 'go' : t.closest('.mx-tab, .po-steps button, .lx-tabs button') ? 'tab' : 'click');
  const over = (e) => {
    const t = e.target.closest && e.target.closest('button, [role=button], label.lx-swatch, input[type=range]');
    if (t === last) return;
    last = t;
    if (!t || e.pointerType !== 'mouse' || t.disabled) return;
    const now = performance.now();
    now - at > 60 && ((at = now), __hxSfx('hover'));
  };
  const down = (e) => {
    const t = e.target.closest && e.target.closest('button, [role=button], label.lx-swatch');
    if (!t || t.disabled || (e.button !== void 0 && e.button > 0)) return;
    try {
      p1();
    } catch (x) {}
    __hxSfx(pick(t));
  };
  el.addEventListener('pointerover', over, { passive: !0 });
  el.addEventListener('pointerdown', down, { passive: !0 });
  return () => (el.removeEventListener('pointerover', over), el.removeEventListener('pointerdown', down));
}
ao = function ({ children: w, footer: A, solid: i = !1 }) {
  const I = Zw((g) => g.screen),
    B = Zw((g) => g.setScreen),
    z = Zw((g) => ({ map: g.map, mode: g.mode })),
    rev = Zw((g) => g.profileRev),
    root = S.useRef(null),
    me = S.useMemo(() => {
      const n = Es(),
        L = BQ(n.xp),
        lo = oo(L),
        hi = oo(L + 1);
      return { lvl: L, pct: L >= cc ? 100 : ((n.xp - lo) / (hi - lo)) * 100, name: gD(), look: Ng(FQ()) };
    }, [rev]);
  S.useEffect(() => __mxSounds(root.current), []);
  const art = (__MX_BG[I] || (() => 'cinema'))(z),
    go = (id) => (id === 'theater' ? __hxTheater() : B(id)),
    E = __hxE;
  return E(
    'div',
    { ref: root, className: `lx-screen mx mx--${I} ${i ? 'lx-screen--solid' : ''} ${__MX.lite ? 'mx--lite' : ''}`, 'data-art': art },
    E(__HxDefs, null),
    E('div', { className: 'mx-bg', 'aria-hidden': !0 }, E('div', { key: art, className: 'mx-bg-img', style: { backgroundImage: `url(${__mxArt(art)})` } }), E('div', { className: 'mx-bg-shade' })),
    E(
      'header',
      { className: 'mx-head' },
      E(vV, { onClick: () => B('menu') }),
      E('span', { className: 'mx-crumb' }, E('button', { onClick: () => B('menu') }, 'Home'), E('i', null), E('b', null, __MX_TITLE[I] || '')),
      E(
        'nav',
        { className: 'mx-tabs', 'aria-label': 'Main' },
        __MX_NAV.map(([id, label, ic]) => E('button', { key: id, className: 'mx-tab', 'aria-current': I === id, onClick: () => go(id) }, ic ? E(Pw, { name: ic, size: 16 }) : __hxTheaterIcon(16), E('span', null, label))),
      ),
      E(
        'div',
        { className: 'mx-tr' },
        E('button', { className: 'mx-ib', title: 'How to play', 'aria-label': 'How to play', 'aria-current': I === 'guide', onClick: () => B('guide') }, E(Pw, { name: 'list', size: 17 })),
        E('button', { className: 'mx-ib', title: 'About and credits', 'aria-label': 'About and credits', 'aria-current': I === 'about', onClick: () => B('about') }, E(Pw, { name: 'star', size: 17 })),
        E(
          'button',
          { className: 'mx-me', onClick: () => B('studio'), 'aria-label': `${me.name}, level ${me.lvl}. Open profile.` },
          E('span', { className: 'mx-me-av' }, E(hQ, { look: me.look, size: 36 })),
          E('span', { className: 'mx-me-txt' }, E('b', null, me.name), E('small', { className: 'hx-num' }, `Level ${me.lvl}`), E('i', null, E('u', { style: { width: `${me.pct}%` } }))),
        ),
      ),
    ),
    E('main', { className: 'lx-main mx-main' }, E(QIA, { key: I }, w), A && E('div', { className: 'lx-actionbar mx-actionbar' }, A)),
    E(
      'nav',
      { className: 'lx-tabbar mx-tabbar', 'aria-label': 'Main' },
      [
        ['menu', 'home', 'Home'],
        ['online', 'globe', 'Online'],
        ['setup', 'play', 'Offline'],
        ['theater', null, 'Theater'],
        ['settings', 'gear', 'Settings'],
      ].map(([id, ic, label]) => E('button', { key: id, 'aria-current': I === id, className: id === 'setup' ? 'is-play' : '', onClick: () => go(id) }, E('span', null, ic ? E(Pw, { name: ic, size: 21 }) : __hxTheaterIcon(21)), label)),
    ),
  );
};
// ---------------------------------------------------------------- Profile: the callsign, and the record behind it
SIA = function () {
  const w = Zw(),
    [name, setName] = S.useState(gD),
    dirty = name.trim() !== gD() && name.trim().length > 0,
    d = S.useMemo(__hxData, [w.profileRev]);
  const save = () => {
    const n = name.trim() || 'Player';
    Pu(n);
    try {
      eA.online && eA.online.rename(n, Ng(FQ()));
    } catch (e) {}
    setName(n);
    w.setup({ profileRev: w.profileRev + 1 });
  };
  const E = __hxE,
    s = d.s,
    cells = [
      [d.kd, 'K/D'],
      [`${d.winRate}%`, 'Win rate'],
      [__hxN(s.kills), 'Kills'],
      [`${d.hs}%`, 'Headshots'],
      [`${d.acc}%`, 'Accuracy'],
      [__hxN(s.matches), 'Matches'],
      [__hxN(s.bestStreak), 'Best streak'],
      [__hxN(s.medals), 'Medals'],
    ];
  return M.jsx(ao, {
    footer: M.jsxs(M.Fragment, {
      children: [
        M.jsx('div', { className: 'lx-summary', children: dirty ? 'Unsaved changes' : 'Saved. Other players see this name online.' }),
        M.jsx('button', { className: 'lx-btn lx-btn--quiet', disabled: !dirty, onClick: () => setName(gD()), children: 'Undo' }),
        M.jsx('button', { className: 'lx-btn lx-btn--go', disabled: !dirty, onClick: save, children: 'Save' }),
      ],
    }),
    children: E(
      'div',
      { className: 'lx-page mx-prof' },
      E(
        'section',
        { className: 'mx-prof-hero' },
        E('span', { className: 'mx-prof-art', style: { backgroundImage: `url(game/menu/season-op${__MX.lite ? '-m' : ''}.webp)` } }),
        E(
          'div',
          { className: 'mx-prof-id' },
          E('div', { className: 'lx-kicker' }, 'Profile · operator file'),
          E('h1', { className: 'lx-h1' }, 'Callsign'),
          E('p', { className: 'lx-note' }, 'The name shown on the scoreboard, kill feed and in online lobbies. Your operator is chosen per side when you set up a match.'),
          E('input', {
            value: name,
            maxLength: 18,
            'aria-label': 'Callsign',
            className: 'mx-callsign',
            onChange: (e) => setName(rd(e.target.value)),
            onKeyDown: (e) => e.key === 'Enter' && dirty && save(),
          }),
          E(
            'div',
            { className: 'mx-prof-lvl' },
            __hxLvlHex(d.lvl),
            E('span', null, E('b', null, d.title), E('small', { className: 'hx-num' }, d.toNext ? `${__hxN(d.toNext)} XP to level ${d.lvl + 1}` : 'Max level')),
            E(__HxBar, { pct: d.lvlPct, cls: 'hx-bar--gold' }),
          ),
        ),
      ),
      E(
        'section',
        { className: 'mx-prof-grid' },
        E(
          'div',
          { className: `mx-panel mx-rank rk-t${d.rank.i}` },
          E('div', { className: 'lx-kicker' }, 'Ranked rating'),
          E('div', { className: 'mx-rank-row' }, E('div', { className: 'hx-rank-badge' }, E('b', null, d.rank.name[0]), E('i', null, d.rank.div)), E('div', null, E('b', { className: 'mx-big' }, `${d.rank.name} ${d.rank.div}`), E('small', { className: 'hx-num' }, `${__hxN(d.sr)} SR${d.fresh ? '' : ` · peak ${__hxN(d.srPeak)}`}`))),
          E(__HxBar, { pct: d.rank.pct, cls: 'hx-bar--gold' }),
          E('p', { className: 'lx-note' }, d.rank.next ? `${d.rank.toNext} SR to ${d.rank.next}` : 'Top tier reached'),
        ),
        E(
          'div',
          { className: 'mx-panel mx-season' },
          E('div', { className: 'lx-kicker' }, d.seaName.join(' · ')),
          E('div', { className: 'mx-rank-row' }, E(__HxEmblem, { tier: d.sea.tier, size: 64 }), E('div', null, E('b', { className: 'mx-big' }, d.sea.title), E('small', { className: 'hx-num' }, `Tier ${d.sea.tier} / ${__SEASON.max}`))),
          E(__HxBar, { pct: d.sea.pct, cls: 'hx-bar--violet' }),
          E('p', { className: 'lx-note' }, d.sea.nextReward ? `Tier ${d.sea.nextReward[0]}: ${d.sea.nextReward[1]}` : 'Season track complete'),
        ),
        E(
          'div',
          { className: 'mx-panel mx-record' },
          E('div', { className: 'lx-kicker' }, 'Service record'),
          d.fresh
            ? E(__HxFirst, { text: 'No matches on record yet. Play your first match and your kills, accuracy, wins and streaks start counting here.', cta: 'Play your first match', onClick: () => w.setScreen('setup') })
            : E('div', { className: 'mx-cells' }, cells.map(([v, k]) => E('div', { key: k }, E('b', { className: 'hx-num' }, v), E('small', null, k)))),
        ),
      ),
    ),
  });
};
