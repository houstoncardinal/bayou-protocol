/* ===== Bayou Protocol mod: dark theme + redesigned home screen ===== */
// Theme: the game is dark only. html[data-theme="dark"] is set at start-up; menus, sheets, the buy menu,
// scoreboard, pause menu and HUD panels read it (see ui.css, "Theme"). The old light theme and its switch
// are gone, and a saved light choice from an older version is cleared.
// Home: the operator showcase is gone (you pick an operator after choosing a side), and the page is a
// single-screen dashboard that fits without scrolling on desktop.
const __THEME_KEY = 'bp-theme';
function __themeGet() {
  return 'dark';
}
try {
  typeof localStorage < 'u' && localStorage.removeItem(__THEME_KEY);
} catch {}
const __themeSubs = new Set();
function __themeApply(v) {
  const H = document.documentElement;
  H.dataset.theme = v;
  H.style.colorScheme = v;
  const m = document.querySelector('meta[name="theme-color"]');
  m && m.setAttribute('content', '#0b0e14');
}
function __themeSet(v) {
  try {
    localStorage.setItem(__THEME_KEY, v);
  } catch {}
  __themeApply(v);
  for (const f of __themeSubs) f(v);
}
typeof document < 'u' && __themeApply(__themeGet());
function __useTheme() {
  const [v, setV] = S.useState(__themeGet());
  S.useEffect(() => {
    __themeSubs.add(setV);
    return () => __themeSubs.delete(setV);
  }, []);
  return v;
}
// Operator is chosen after picking a side (offline setup: Side → Operator), so it is not a top-level tab.
{
  const k = LV.findIndex((x) => x.screen === 'studio');
  k >= 0 && LV.splice(k, 1);
}
// ---------- home ----------
function __HomeChallenges() {
  const I = Es(),
    c = (t) =>
      /melee|knife/i.test(t)
        ? 'knife'
        : /flash|smoke|grenade|molotov/i.test(t)
          ? 'grenade'
          : /streak/i.test(t)
            ? 'bolt'
            : /head/i.test(t)
              ? 'crosshair'
              : /win/i.test(t)
                ? 'trophy'
                : /flag|capture/i.test(t)
                  ? 'flag'
                  : /tag/i.test(t)
                    ? 'tag'
                    : 'target';
  return M.jsx('div', {
    className: 'hm2-chal',
    children: uu(I.daily.day).map((t) => {
      const j = I.daily.progress[t.id] ?? 0,
        d = I.daily.done.includes(t.id);
      return M.jsxs(
        'div',
        {
          className: `hm2-chal-row ${d ? 'is-done' : ''}`,
          children: [
            M.jsx('span', { className: 'hm2-chal-ico', children: M.jsx(Pw, { name: d ? 'check' : c(t.text), size: 16 }) }),
            M.jsxs('div', {
              className: 'min-w-0',
              children: [
                M.jsx('div', { className: 'hm2-chal-txt', children: t.text }),
                M.jsx('div', {
                  className: 'hm2-bar',
                  children: M.jsx('i', { style: { width: `${Math.min(100, (j / t.goal) * 100)}%` } }),
                }),
              ],
            }),
            M.jsxs('div', {
              className: 'hm2-chal-num',
              children: [
                M.jsx('b', { children: d ? 'Done' : `${j}/${t.goal}` }),
                M.jsxs('small', { children: ['+', t.xp.toLocaleString(), ' XP'] }),
              ],
            }),
          ],
        },
        t.id,
      );
    }),
  });
}
function __HomePlay({ cls, art, icon, kick, title, sub, meta, onClick, primary }) {
  return M.jsxs('button', {
    className: `hm2-play ${cls || ''} ${primary ? 'hm2-play--primary' : ''}`,
    onClick,
    children: [
      M.jsx('span', { className: 'hm2-play-art', style: { backgroundImage: `url(./game/textures/${art})` } }),
      M.jsx('span', { className: 'hm2-play-shade' }),
      M.jsxs('span', {
        className: 'hm2-play-body',
        children: [
          M.jsxs('span', {
            className: 'hm2-play-top',
            children: [
              M.jsx('span', { className: 'hm2-play-ico', children: M.jsx(Pw, { name: icon, size: 20 }) }),
              M.jsx('span', { className: 'hm2-play-kick', children: kick }),
            ],
          }),
          M.jsxs('span', {
            className: 'hm2-play-main',
            children: [
              M.jsx('span', { className: 'hm2-play-title', children: title }),
              M.jsx('span', { className: 'hm2-play-sub', children: sub }),
            ],
          }),
          M.jsxs('span', {
            className: 'hm2-play-foot',
            children: [
              M.jsx('span', {
                className: 'hm2-play-meta',
                children: meta.map((m) => M.jsx('em', { children: m }, m)),
              }),
              M.jsx('span', { className: 'hm2-play-go', children: M.jsx(Pw, { name: 'chevron', size: 18, sw: 2.4 }) }),
            ],
          }),
        ],
      }),
    ],
  });
}
function __Home() {
  const w = Zw();
  Zw((s) => s.profileRev);
  const I = Es(),
    B = BQ(I.xp),
    g = oo(B),
    n = oo(B + 1),
    pct = B >= cc ? 100 : ((I.xp - g) / (n - g)) * 100,
    D = BG.find((t) => t.level > B),
    s = I.stats,
    name = gD(),
    touch = Ts(),
    kd = s.deaths ? (s.kills / s.deaths).toFixed(2) : String(s.kills),
    acc = `${s.shots ? Math.round((s.hits / s.shots) * 100) : 0}%`;
  return M.jsx(ao, {
    children: M.jsxs('div', {
      className: 'hm2',
      children: [
        M.jsxs('header', {
          className: 'hm2-head lx-enter',
          children: [
            M.jsxs('div', {
              className: 'hm2-title',
              children: [
                M.jsx('div', { className: 'lx-kicker', children: 'Season 1 · Southwest Houston' }),
                M.jsxs('h1', { children: ['Hold the line. ', M.jsx('em', { children: 'Clear the site.' })] }),
                M.jsx('p', {
                  children:
                    'Counter-Terrorists against Terrorists on five tight tactical maps. Plant or defuse, hold your angles and call it out on voice.',
                }),
              ],
            }),
            M.jsxs('div', {
              className: 'hm2-id',
              children: [
                M.jsx('div', { className: 'hm2-lvl', children: M.jsx('b', { children: B }) }),
                M.jsxs('div', {
                  className: 'hm2-id-body',
                  children: [
                    M.jsx('small', { children: `${IG(B)} · level ${B}` }),
                    M.jsx('strong', { children: name }),
                    M.jsx('div', { className: 'hm2-bar', children: M.jsx('i', { style: { width: `${pct}%` } }) }),
                    M.jsx('span', {
                      children: B < cc ? `${(n - I.xp).toLocaleString()} XP to level ${B + 1}` : 'Max level',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        M.jsxs('section', {
          className: 'hm2-plays lx-enter-2',
          children: [
            M.jsx(__HomePlay, {
              primary: !0,
              art: 'texture-21.jpg',
              icon: 'globe',
              kick: 'Multiplayer',
              title: 'Play online',
              sub: 'Quick play into a live lobby, or browse and host your own.',
              meta: ['Up to 50 players', 'Voice chat', 'Ranked'],
              onClick: () => w.setScreen('online'),
            }),
            M.jsx(__HomePlay, {
              art: 'texture-19.jpg',
              icon: 'target',
              kick: 'Offline',
              title: 'Play vs bots',
              sub: 'Pick a side and operator, any mode and map.',
              meta: ['4 modes', '5 maps'],
              onClick: () => w.setScreen('setup'),
            }),
            M.jsx(__HomePlay, {
              cls: 'hm2-play--range',
              art: 'texture-20.jpg',
              icon: 'crosshair',
              kick: 'Practice',
              title: 'Firing range',
              sub: 'Every weapon free, targets from 8 to 55 metres.',
              meta: ['Unlimited ammo'],
              onClick: () => {
                w.setup({ mode: 'range', map: 'range' });
                w.setScreen('setup');
              },
            }),
          ],
        }),
        M.jsxs('section', {
          className: 'hm2-dash lx-enter-3',
          children: [
            M.jsxs('div', {
              className: 'hm2-panel hm2-panel--rank',
              children: [
                M.jsx('div', { className: 'hm2-ph', children: M.jsx('span', { children: 'Competitive' }) }),
                M.jsx(__RankCard, {}),
              ],
            }),
            M.jsxs('div', {
              className: 'hm2-panel',
              children: [
                M.jsxs('div', {
                  className: 'hm2-ph',
                  children: [
                    M.jsx('span', { children: 'Service record' }),
                    D && M.jsxs('small', { children: ['Level ', D.level, ' unlocks ', M.jsx('b', { children: D.name })] }),
                  ],
                }),
                M.jsx('div', {
                  className: 'hm2-stats',
                  children: [
                    [s.kills.toLocaleString(), 'Kills'],
                    [kd, 'K/D'],
                    [acc, 'Accuracy'],
                    [s.wins.toLocaleString(), 'Wins'],
                  ].map(([t, j]) =>
                    M.jsxs('div', { className: 'hm2-stat', children: [M.jsx('b', { children: t }), M.jsx('span', { children: j })] }, j),
                  ),
                }),
              ],
            }),
            M.jsxs('div', {
              className: 'hm2-panel',
              children: [
                M.jsxs('div', {
                  className: 'hm2-ph',
                  children: [M.jsx('span', { children: "Today's challenges" }), M.jsx('small', { children: 'Reset daily' })],
                }),
                M.jsx(__HomeChallenges, {}),
              ],
            }),
          ],
        }),
        M.jsxs('footer', {
          className: 'hm2-foot lx-enter-3',
          children: [
            M.jsxs('button', {
              className: 'lx-btn lx-btn--quiet',
              onClick: () => w.setScreen('guide'),
              children: [M.jsx(Pw, { name: 'list', size: 15 }), ' How to play'],
            }),
            M.jsxs('button', {
              className: 'lx-btn lx-btn--quiet',
              onClick: () => w.setScreen('settings'),
              children: [M.jsx(Pw, { name: 'gear', size: 15 }), ' Settings'],
            }),
            M.jsxs('button', {
              className: 'lx-btn lx-btn--quiet',
              onClick: () => w.setScreen('about'),
              children: [M.jsx(Pw, { name: 'star', size: 15 }), ' About and credits'],
            }),
            touch && M.jsxs('span', { className: 'hm2-touch', children: [M.jsx(Pw, { name: 'touch', size: 14 }), ' Touch controls on'] }),
          ],
        }),
      ],
    }),
  });
}
RIA = __Home;
