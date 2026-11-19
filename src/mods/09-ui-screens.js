/* ===== Bayou Protocol mod: UI (buy menu, end screen, HUD overlay, colorblind) ===== */
const __h = (t, p, ...c) => M.jsx(t, { ...(p || {}), children: c.length <= 1 ? c[0] : c });
// ---------- colorblind palettes ----------
const __CB = {
  off: { CT: ['#5b8def', '#a9c6ff'], T: ['#e0a43b', '#ffd58a'] },
  deut: { CT: ['#3d8bff', '#9cc8ff'], T: ['#ff8a1f', '#ffc28a'] },
  trit: { CT: ['#18b3a4', '#8ee8de'], T: ['#ff4f6d', '#ffa3b3'] },
  hc: { CT: ['#38d6ff', '#b5f0ff'], T: ['#ff3fd2', '#ffb1ef'] },
};
function __cbGet() {
  try {
    return localStorage.getItem('swat-cb') || 'off';
  } catch {
    return 'off';
  }
}
function __cbApply(v) {
  const p = __CB[v] || __CB.off;
  for (const k of ['CT', 'T']) {
    ii[k].main = p[k][0];
    ii[k].light = p[k][1];
  }
  document.documentElement.style.setProperty('--swat-ct', p.CT[0]);
  document.documentElement.style.setProperty('--swat-t', p.T[0]);
}
function __cbSet(v) {
  try {
    localStorage.setItem('swat-cb', v);
  } catch {}
  __cbApply(v);
}
__cbApply(__cbGet());
// ---------- weapon thumbnails ----------
const __thumbs = new Map();
function __thumb(id) {
  if (!(id in gw) || id === 'grenade') return null;
  const k = id + ':' + Gc;
  if (__thumbs.has(k)) return __thumbs.get(k);
  let u = '';
  try {
    u = eBA(id, { optic: !1, suppressor: !1, extmag: !1 }, 'none');
  } catch (e) {}
  __thumbs.set(k, u);
  return u;
}
const __catIcon = {
  rifles: 'crosshair',
  smgs: 'target',
  heavy: 'spark',
  pistols: 'aim',
  grenades: 'grenade',
  gear: 'shield',
  upgrades: 'sliders',
};
// ---------- buy menu ----------
function __BuyMenu() {
  KI(8);
  const buy = Zw((c) => c.buyItem),
    cat = Zw((c) => c.buyCat),
    setCat = Zw((c) => c.setBuyCat),
    [hov, setHov] = S.useState(null),
    close = () => {
      (Zw.getState().setBuyOpen(!1), rc());
    },
    st = eA.state,
    me = eA.human();
  if (!st || !me) return null;
  if (!MQ(st, me)) return (queueMicrotask(close), null);
  const items = Oj(cat),
    sel = items.find((c) => c.id === hov) ?? items[0],
    left =
      st.mode === 'bomb'
        ? st.phase === 'freeze'
          ? st.phaseLeft + AY
          : Math.max(0, AY - (st.t - st.roundStart - Ft))
        : null,
    cats = AU.filter((c) => Oj(c.id).length);
  const card = (c, i) => {
    const price = z9(me, c.id),
      own = TY(me, c.id),
      ok = me.money >= price,
      w = c.id in gw ? gw[c.id] : null,
      img = w ? __thumb(c.id) : null;
    return M.jsxs(
      'button',
      {
        className: `sb2-card ${own ? 'is-own' : ''} ${!ok && !own ? 'is-poor' : ''} ${sel && sel.id === c.id ? 'is-sel' : ''}`,
        disabled: own,
        onMouseEnter: () => setHov(c.id),
        onFocus: () => setHov(c.id),
        onClick: () => buy(c.id),
        children: [
          M.jsxs('div', {
            className: 'sb2-card-top',
            children: [
              M.jsx('kbd', { children: i + 1 }),
              M.jsx('span', {
                className: `sb2-price ${ok ? '' : 'no'}`,
                children: own ? 'OWNED' : `$${price.toLocaleString()}`,
              }),
            ],
          }),
          M.jsx('div', {
            className: 'sb2-thumb',
            children: img
              ? M.jsx('img', { src: img, alt: '', draggable: !1 })
              : M.jsx(Pw, { name: __catIcon[c.cat] || 'target', size: 44, sw: 1.4 }),
          }),
          M.jsx('div', { className: 'sb2-name', children: c.label }),
          w
            ? M.jsx('div', {
                className: 'sb2-bars',
                children: AF(w.id)
                  .slice(0, 3)
                  .map((J) =>
                    M.jsxs(
                      'div',
                      {
                        className: 'sb2-bar',
                        children: [
                          M.jsx('span', { children: J.label }),
                          M.jsx('i', { children: M.jsx('b', { style: { width: `${Math.round(J.k * 100)}%` } }) }),
                        ],
                      },
                      J.label,
                    ),
                  ),
              })
            : M.jsx('div', { className: 'sb2-hint', children: c.hint }),
          !own &&
            !ok &&
            M.jsx('div', {
              className: 'sb2-afford',
              children: M.jsx('i', { style: { width: `${Math.min(100, (me.money / price) * 100)}%` } }),
            }),
        ],
      },
      c.id,
    );
  };
  const det =
    sel &&
    (() => {
      const w = sel.id in gw ? gw[sel.id] : null,
        price = z9(me, sel.id),
        own = TY(me, sel.id),
        img = w ? __thumb(sel.id) : null;
      return M.jsxs('aside', {
        className: 'sb2-detail',
        children: [
          M.jsx('div', {
            className: 'sb2-kick',
            children: w
              ? MIA[qO[w.id]]
              : sel.cat === 'grenades'
                ? 'Throwable'
                : sel.cat === 'gear'
                  ? 'Protection'
                  : 'Upgrade',
          }),
          M.jsx('h3', { children: sel.label }),
          img && M.jsx('div', { className: 'sb2-hero', children: M.jsx('img', { src: img, alt: '' }) }),
          M.jsx('p', { children: sel.hint }),
          w &&
            M.jsx('div', {
              className: 'sb2-stats',
              children: AF(w.id).map((g) =>
                M.jsxs(
                  'div',
                  {
                    className: 'sb2-stat',
                    children: [
                      M.jsx('span', { children: g.label }),
                      M.jsx('i', { children: M.jsx('b', { style: { width: `${Math.round(g.k * 100)}%` } }) }),
                      M.jsx('em', { children: g.value }),
                    ],
                  },
                  g.label,
                ),
              ),
            }),
          w &&
            M.jsxs('div', {
              className: 'sb2-facts',
              children: [
                w.mag > 0 &&
                  M.jsxs('div', {
                    children: [
                      M.jsxs('b', { children: [w.mag, M.jsxs('small', { children: ['/', w.reserve] })] }),
                      M.jsx('span', { children: 'Magazine' }),
                    ],
                  }),
                M.jsxs('div', {
                  children: [
                    M.jsxs('b', { children: [w.reload.toFixed(1), 's'] }),
                    M.jsx('span', { children: 'Reload' }),
                  ],
                }),
                M.jsxs('div', {
                  children: [
                    M.jsx('b', { children: w.burst ? `${w.burst}-RND` : w.auto ? 'AUTO' : 'SEMI' }),
                    M.jsx('span', { children: 'Fire mode' }),
                  ],
                }),
                Hs(st) &&
                  M.jsxs('div', {
                    children: [M.jsxs('b', { children: ['$', w.killReward] }), M.jsx('span', { children: 'Per kill' })],
                  }),
              ],
            }),
          M.jsx('button', {
            className: 'sb2-buy',
            disabled: own || me.money < price,
            onClick: () => buy(sel.id),
            children: own
              ? 'Owned'
              : me.money < price
                ? `Need $${(price - me.money).toLocaleString()}`
                : `Buy · $${price.toLocaleString()}`,
          }),
        ],
      });
    })();
  return M.jsx('div', {
    className: 'sb2-wrap',
    onClick: (c) => c.target === c.currentTarget && close(),
    children: M.jsxs('div', {
      className: 'sb2',
      role: 'dialog',
      'aria-label': 'Buy menu',
      children: [
        M.jsxs('header', {
          className: 'sb2-head',
          children: [
            M.jsxs('div', {
              className: 'sb2-title',
              children: [M.jsxs('small', { children: ['Armory · ', __modeName(st)] }), M.jsx('b', { children: 'Buy' })],
            }),
            M.jsx('div', {
              className: 'sb2-timer',
              children:
                left !== null
                  ? M.jsxs('span', { children: ['Buy time ', M.jsxs('b', { children: [Math.ceil(left), 's'] })] })
                  : M.jsx('span', { children: 'Open while out of combat' }),
            }),
            M.jsxs('div', {
              className: 'sb2-gear',
              children: [
                me.armor > 0 && M.jsx('span', { children: me.helmet ? 'Vest + Helmet' : 'Vest' }),
                me.defuseKit && M.jsx('span', { children: 'Kit' }),
              ],
            }),
            M.jsxs('div', {
              className: 'sb2-wallet',
              children: [
                M.jsx('small', { children: 'Wallet' }),
                M.jsxs('b', { children: ['$', me.money.toLocaleString()] }),
              ],
            }),
            M.jsx('button', { className: 'sb2-x', onClick: close, 'aria-label': 'Close', children: '✕' }),
          ],
        }),
        M.jsx('nav', {
          className: 'sb2-cats',
          role: 'tablist',
          children: cats.map((c) =>
            M.jsxs(
              'button',
              {
                role: 'tab',
                'aria-selected': c.id === cat,
                onClick: () => {
                  setCat(c.id);
                  setHov(null);
                },
                children: [
                  M.jsx(Pw, { name: __catIcon[c.id] || 'target', size: 18 }),
                  M.jsx('span', { children: c.name }),
                  M.jsx('em', { children: Oj(c.id).length }),
                ],
              },
              c.id,
            ),
          ),
        }),
        M.jsx('div', { className: 'sb2-grid', children: items.map(card) }),
        det,
        M.jsxs('footer', {
          className: 'sb2-foot',
          children: [
            M.jsxs('label', {
              className: 'sb2-rebuy',
              children: [
                M.jsx(jI, { on: me.autoRebuy !== !1, onChange: (c) => (me.autoRebuy = c), label: 'Auto-rebuy' }),
                M.jsx('span', { children: 'Auto-rebuy on respawn' }),
              ],
            }),
            M.jsxs('div', {
              className: 'sb2-keys',
              children: [
                M.jsx('kbd', { children: 'Q' }),
                M.jsx('kbd', { children: 'E' }),
                ' category · ',
                M.jsx('kbd', { children: '1' }),
                '–',
                M.jsx('kbd', { children: '9' }),
                ' buy · ',
                M.jsx('kbd', { children: EI('buy') }),
                ' close',
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
// ---------- end of match ----------
// ---------- end of match ----------
// One clean panel: the result and the score; your line (kills, deaths, assists, K/D, headshots) with the XP and rank
// you earned; the two teams' tables. A bar along the bottom that is always on screen: offline, the next match (the
// next map in the rotation, same mode, side and loadout) starts by itself after 15 seconds, or at once with
// Continue; Play again replays this map; Change setup and Main menu leave. Online, the host starts the next match.
const __ES_NEXT = 15;
function __esRotation() {
  const ids = BD.map((m) => m.id).filter((id) => typeof __HX_KEY < 'u' && __HX_KEY[id]);
  return ids.length ? ids : BD.map((m) => m.id).filter((id) => id !== 'range');
}
function __esNextMap(cur) {
  const r = __esRotation(),
    i = r.indexOf(cur);
  return r[(i + 1) % r.length] || cur;
}
function __EndScreen() {
  const z = Zw();
  KI(4);
  const A = eA.state,
    me = eA.human(),
    online = !!eA.net,
    curMap = A ? aw().id : null,
    nextId = curMap ? __esNextMap(curMap) : null,
    nextName = ((nextId && BD.find((m) => m.id === nextId)) || {}).name || '',
    [left, setLeft] = S.useState(__ES_NEXT),
    [hold, setHold] = S.useState(!1);
  const go = (mapId) => {
    const o = eA.lastOptions;
    if (!o) return void (z.setup({ profileRev: z.profileRev + 1 }), z.setScreen('setup'));
    eA.start(mapId ? { ...o, map: mapId } : o);
    z.setup(mapId ? { profileRev: z.profileRev + 1, map: mapId } : { profileRev: z.profileRev + 1 });
    z.setScreen('playing');
    rc();
  };
  // the countdown to the next match (offline; paused while you hold it)
  S.useEffect(() => {
    if (online || hold) return;
    if (left <= 0) return void go(nextId);
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, hold, online]);
  // Enter: continue
  S.useEffect(() => {
    if (online) return;
    const k = (e) => e.code === 'Enter' && (e.preventDefault(), go(nextId));
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [online, nextId]);
  if (!A) return null;
  const solo = A.mode === 'ffa' || A.mode === 'gungame',
    W = A.score.CT > A.score.T ? 'CT' : A.score.T > A.score.CT ? 'T' : null,
    champ = A.players.find((o) => o.id === A.winnerId),
    won = solo ? A.winnerId === (me == null ? void 0 : me.id) : !!me && me.team === W,
    draw = !solo && !W,
    rep = awA(A),
    sc = (p) => p.score + p.kills * 20,
    mvp = [...A.players].sort((a, b) => sc(b) - sc(a))[0],
    prof = Es(),
    lvl = BQ(prof.xp),
    a0 = oo(lvl),
    a1x = oo(lvl + 1),
    pct = lvl >= cc ? 100 : Math.round(((prof.xp - a0) / (a1x - a0)) * 100),
    hs = pw && pw.kills ? Math.round((pw.headshots / pw.kills) * 100) : 0;
  const h = (t, p, ...c) => M.jsx(t, { ...(p || {}), children: c.length <= 1 ? c[0] : c });
  const row = (p) =>
    M.jsxs(
      'div',
      {
        className: 'esx-row' + (me && p.id === me.id ? ' is-me' : ''),
        children: [
          M.jsxs('span', { className: 'esx-name', children: [M.jsx(hQ, { look: p.look, size: 20 }), M.jsx('b', { children: p.name }), p.id === mvp.id && M.jsx('em', { children: 'MVP' })] }),
          h('span', null, p.kills),
          h('span', null, p.deaths),
          h('span', null, p.assists),
          h('span', { className: 'esx-score' }, Math.round(p.score)),
        ],
      },
      p.id,
    );
  const head = M.jsxs('div', { className: 'esx-row esx-head', children: [h('span', { className: 'esx-name' }, 'Player'), h('span', null, 'K'), h('span', null, 'D'), h('span', null, 'A'), h('span', { className: 'esx-score' }, 'Score')] });
  const table = (title, color, list, score, win) =>
    M.jsxs(
      'section',
      {
        className: 'esx-team' + (win ? ' is-win' : ''),
        style: { '--tc': color },
        children: [
          M.jsxs('header', { children: [h('b', null, title), win && h('em', null, 'Winner'), score !== null && h('span', null, score)] }),
          head,
          M.jsx('div', { className: 'esx-rows', children: list.map(row) }),
        ],
      },
      title,
    );
  const byScore = (X) => A.players.filter((p) => p.team === X).sort((a, b) => sc(b) - sc(a)),
    all = [...A.players].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths),
    kd = me ? (me.kills / Math.max(1, me.deaths)).toFixed(2) : '0',
    rank = rep && rep.srDelta !== void 0 ? __rankOf(rep.sr ?? 800) : null,
    unl = (rep && rep.unlocked) || [];
  return M.jsx('div', {
    className: `esx-wrap ${won ? 'is-won' : draw ? 'is-draw' : 'is-lost'}`,
    children: M.jsxs('div', {
      className: 'esx',
      children: [
        // the result
        M.jsxs('div', {
          className: 'esx-top',
          children: [
            M.jsxs('div', {
              children: [
                h('div', { className: 'esx-meta' }, [__modeName(A), aw().name, online ? 'Online' : 'Offline'].join('  ·  ')),
                h('h1', null, draw ? 'Draw' : won ? 'Victory' : 'Defeat'),
              ],
            }),
            solo
              ? h('div', { className: 'esx-champ' }, (champ ? champ.name : 'Nobody') + ' wins')
              : M.jsxs('div', {
                  className: 'esx-score-big',
                  children: [
                    M.jsxs('div', { style: { '--tc': ii.CT.light }, children: [h('small', null, 'CT'), h('b', null, Math.floor(A.score.CT))] }),
                    h('i', null, ':'),
                    M.jsxs('div', { style: { '--tc': ii.T.light }, children: [h('small', null, 'T'), h('b', null, Math.floor(A.score.T))] }),
                  ],
                }),
          ],
        }),
        // your match
        me &&
          M.jsxs('div', {
            className: 'esx-you',
            children: [
              M.jsx('div', {
                className: 'esx-stats',
                children: [
                  ['Kills', me.kills],
                  ['Deaths', me.deaths],
                  ['Assists', me.assists],
                  ['K/D', kd],
                  ['Headshots', hs + '%'],
                ].map(([k, v]) => M.jsxs('div', { children: [h('b', null, v), h('span', null, k)] }, k)),
              }),
              M.jsxs('div', {
                className: 'esx-prog',
                children: [
                  M.jsxs('div', {
                    className: 'esx-xp',
                    children: [
                      h('b', null, '+' + ((rep && rep.total) || 0).toLocaleString() + ' XP'),
                      h('span', null, rep && rep.levelAfter > rep.levelBefore ? `Level ${rep.levelBefore} → ${rep.levelAfter}` : `Level ${lvl}`),
                      rank && h('em', { className: rep.srDelta >= 0 ? 'up' : 'down' }, `${rank.name} ${rank.div}  ${rep.srDelta >= 0 ? '+' : ''}${rep.srDelta} SR`),
                    ],
                  }),
                  M.jsx('i', { className: 'esx-bar', children: M.jsx('u', { style: { width: pct + '%' } }) }),
                  unl.length > 0 && h('small', { className: 'esx-unl' }, 'Unlocked: ' + unl.slice(0, 3).map((u) => u.name).join(', ') + (unl.length > 3 ? ` and ${unl.length - 3} more` : '')),
                ],
              }),
            ],
          }),
        // the teams
        M.jsx('div', {
          className: 'esx-board' + (solo ? ' is-solo' : ''),
          children: solo ? table('Leaderboard', '#ffcf5a', all, null, !1) : [table(ii.CT.name, ii.CT.main, byScore('CT'), Math.floor(A.score.CT), W === 'CT'), table(ii.T.name, ii.T.main, byScore('T'), Math.floor(A.score.T), W === 'T')],
        }),
        // what happens next
        M.jsx('div', {
          className: 'esx-foot',
          children: online
            ? M.jsxs(M.Fragment, {
                children: [
                  h('div', { className: 'esx-next' }, h('span', null, 'Next match starts in a few seconds')),
                  h('div', { className: 'esx-btns' }, h('button', { className: 'esx-btn', onClick: () => (eA.stop(), z.setup({ profileRev: z.profileRev + 1 }), z.setScreen('online')) }, 'Leave lobby')),
                ],
              })
            : M.jsxs(M.Fragment, {
                children: [
                  M.jsxs('div', {
                    className: 'esx-next',
                    children: [
                      h('span', null, hold ? 'Next match paused' : `Next: ${nextName} in ${left}s`),
                      M.jsx('i', { className: 'esx-count', children: M.jsx('u', { style: { width: (hold ? 0 : (left / __ES_NEXT) * 100) + '%' } }) }),
                    ],
                  }),
                  M.jsxs('div', {
                    className: 'esx-btns',
                    children: [
                      h('button', { className: 'esx-btn ghost', onClick: () => (eA.stop(), z.setScreen('menu')) }, 'Main menu'),
                      h('button', { className: 'esx-btn ghost', onClick: () => (z.setup({ profileRev: z.profileRev + 1 }), z.setScreen('setup')) }, 'Change setup'),
                      h('button', { className: 'esx-btn ghost', onClick: () => setHold((v) => !v) }, hold ? 'Resume' : 'Wait'),
                      h('button', { className: 'esx-btn ghost', onClick: () => go(null) }, 'Play again'),
                      h('button', { className: 'esx-btn go', onClick: () => go(nextId) }, 'Continue'),
                    ],
                  }),
                ],
              }),
        }),
      ],
    }),
  });
}
// ---------- HUD overlay: ping ----------
(function () {
  if (typeof document > 'u') return;
  let el = null;
  setInterval(() => {
    const A = eA.state,
      on = A && eA.running && !eA.attract && Zw.getState().screen === 'playing';
    if (!on) {
      el && (el.style.display = 'none');
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'swat-hud2';
      document.body.appendChild(el);
    }
    el.style.display = '';
    let h = '';
    const net = eA.net && eA.online;
    if (net && eA.net.role) {
      const p = eA.net.role === 'host' ? 'HOST' : eA.net.ping ? eA.net.ping + ' ms' : '— ms';
      h += `<div class="h2-ping ${eA.net.ping > 140 ? 'bad' : eA.net.ping > 80 ? 'mid' : ''}">${p}</div>`;
    }
    el.innerHTML !== h && (el.innerHTML = h);
  }, 150);
})();

function __CbRow() {
  const [v, setV] = S.useState(__cbGet());
  return M.jsx(rw, {
    label: 'Colorblind team colours',
    desc: 'Changes Counter-Terrorist and Terrorist colours everywhere: HUD, radar, scoreboard, name tags and flags.',
    children: M.jsx(gg, {
      label: 'Colorblind team colours',
      value: v,
      onChange: (x) => {
        (__cbSet(x), setV(x));
      },
      options: [
        { v: 'off', label: 'Default' },
        { v: 'deut', label: 'Red-green' },
        { v: 'trit', label: 'Blue-yellow' },
        { v: 'hc', label: 'High contrast' },
      ],
    }),
  });
}
