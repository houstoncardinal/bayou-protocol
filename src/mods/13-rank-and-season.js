/* ===== Bayou Protocol mod: ranked rating + season track ===== */
const __TIERS = [
  ['Bronze', 0],
  ['Silver', 800],
  ['Gold', 1000],
  ['Platinum', 1200],
  ['Diamond', 1400],
  ['Master', 1600],
  ['Apex', 1800],
];
function __rankOf(sr) {
  let i = 0;
  for (let k = 0; k < __TIERS.length; k++) sr >= __TIERS[k][1] && (i = k);
  const lo = __TIERS[i][1],
    hi = i < __TIERS.length - 1 ? __TIERS[i + 1][1] : lo + 200,
    div = i === __TIERS.length - 1 ? '' : ['III', 'II', 'I'][Math.min(2, Math.floor((sr - lo) / ((hi - lo) / 3)))];
  return {
    name: __TIERS[i][0],
    div,
    pct: Math.max(0, Math.min(100, ((sr - lo) / (hi - lo)) * 100)),
    next: i < __TIERS.length - 1 ? __TIERS[i + 1][0] : null,
    toNext: Math.max(0, hi - sr),
    i,
  };
}
const __SEASON = {
  id: 'S1',
  name: 'Season 1 · Southwest Heat',
  step: 3000,
  max: 30,
  rewards: {
    1: 'Title: Rookie',
    3: 'Calling card: Bayou',
    5: 'Title: Operator',
    8: 'Calling card: Feeder Road',
    10: 'Title: Breacher',
    13: 'Calling card: Night Market',
    15: 'Title: Specialist',
    18: 'Calling card: Gulf Storm',
    20: 'Title: Veteran',
    25: 'Title: Elite',
    30: 'Title: Alief Legend',
  },
};
function __seasonOf(xp) {
  const t = Math.min(__SEASON.max, Math.floor(xp / __SEASON.step));
  return {
    tier: t,
    pct: t >= __SEASON.max ? 100 : ((xp % __SEASON.step) / __SEASON.step) * 100,
    toNext: t >= __SEASON.max ? 0 : __SEASON.step - (xp % __SEASON.step),
    title: (() => {
      let s = 'Recruit';
      for (const k in __SEASON.rewards)
        +k <= t && /^Title/.test(__SEASON.rewards[k]) && (s = __SEASON.rewards[k].slice(7));
      return s;
    })(),
    nextReward: (() => {
      for (const k in __SEASON.rewards) if (+k > t) return [+k, __SEASON.rewards[k]];
      return null;
    })(),
  };
}
function __rankApply(A, w, won, B, total) {
  if (w.mode === 'range') return;
  const kd = (pw.kills + 0.5 * (pw.assists || 0)) / Math.max(1, pw.deaths),
    perf = Math.max(-8, Math.min(10, Math.round((kd - 1) * 6))),
    on = !!eA.net,
    base = won ? 24 : -18,
    d = Math.round((base + perf) * (on ? 1.25 : B));
  A.sr = Math.max(0, (A.sr ?? 800) + d);
  A.srDelta = d;
  A.srPeak = Math.max(A.srPeak ?? 0, A.sr);
  (!A.season || A.season.id !== __SEASON.id) && (A.season = { id: __SEASON.id, xp: 0 });
  const t0 = __seasonOf(A.season.xp).tier;
  A.season.xp += total;
  A.season.gained = __seasonOf(A.season.xp).tier - t0;
}
function __RankCard() {
  Zw((s) => s.profileRev);
  const A = Es(),
    r = __rankOf(A.sr ?? 800),
    s = __seasonOf(A.season && A.season.id === __SEASON.id ? A.season.xp : 0);
  return M.jsxs('section', {
    className: 'lx-section lx-enter-3 rk-wrap',
    children: [
      M.jsxs('div', {
        className: `rk-card rk-t${r.i}`,
        children: [
          M.jsxs('div', {
            className: 'rk-badge',
            children: [M.jsx('b', { children: r.name[0] }), M.jsx('i', { children: r.div })],
          }),
          M.jsxs('div', {
            className: 'rk-body',
            children: [
              M.jsx('small', { children: 'Ranked rating' }),
              M.jsxs('h4', {
                children: [r.name, ' ', r.div, M.jsxs('em', { children: [Math.round(A.sr ?? 800), ' SR'] })],
              }),
              M.jsx('div', { className: 'rk-bar', children: M.jsx('u', { style: { width: r.pct + '%' } }) }),
              M.jsx('span', { children: r.next ? `${r.toNext} SR to ${r.next}` : 'Top tier reached' }),
              M.jsx('span', {
                className: 'rk-note',
                children: 'Win matches to climb. Harder bots and online matches are worth more.',
              }),
            ],
          }),
        ],
      }),
      M.jsxs('div', {
        className: 'rk-card rk-season',
        children: [
          M.jsxs('div', {
            className: 'rk-badge',
            children: [M.jsx('b', { children: s.tier }), M.jsx('i', { children: 'TIER' })],
          }),
          M.jsxs('div', {
            className: 'rk-body',
            children: [
              M.jsx('small', { children: __SEASON.name }),
              M.jsxs('h4', { children: [s.title, M.jsxs('em', { children: ['Tier ', s.tier, ' / ', __SEASON.max] })] }),
              M.jsx('div', { className: 'rk-bar', children: M.jsx('u', { style: { width: s.pct + '%' } }) }),
              M.jsx('span', {
                children:
                  s.tier >= __SEASON.max
                    ? 'Season track complete'
                    : `${s.toNext.toLocaleString()} XP to tier ${s.tier + 1}`,
              }),
              s.nextReward &&
                M.jsxs('span', {
                  className: 'rk-note',
                  children: ['Next reward at tier ', s.nextReward[0], ': ', s.nextReward[1]],
                }),
            ],
          }),
        ],
      }),
    ],
  });
}
