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
              children: [M.jsxs('small', { children: ['Armory · ', Eg[st.mode]] }), M.jsx('b', { children: 'Buy' })],
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
function __EndScreen() {
  const z = Zw();
  KI(4);
  const A = eA.state,
    me = eA.human();
  if (!A) return null;
  const solo = A.mode === 'ffa' || A.mode === 'gungame',
    W = A.score.CT > A.score.T ? 'CT' : A.score.T > A.score.CT ? 'T' : null,
    champ = A.players.find((o) => o.id === A.winnerId),
    won = solo ? A.winnerId === (me == null ? void 0 : me.id) : !!me && me.team === W,
    draw = !solo && !W;
  const rep = awA(A);
  const sc = (p) => p.score + p.kills * 20,
    mvp = [...A.players].sort((a, b) => sc(b) - sc(a))[0],
    prof = Es(),
    lvl = BQ(prof.xp),
    a0 = oo(lvl),
    a1x = oo(lvl + 1),
    pct = lvl >= cc ? 100 : Math.round(((prof.xp - a0) / (a1x - a0)) * 100);
  const acc = pw && pw.shots ? Math.round((pw.hits / pw.shots) * 100) : 0,
    hs = pw && pw.kills ? Math.round((pw.headshots / pw.kills) * 100) : 0,
    again = () => {
      (eA.lastOptions && eA.start(eA.lastOptions),
        z.setScreen('playing'),
        z.setup({ profileRev: z.profileRev + 1 }),
        rc());
    };
  const row = (p, i) =>
    M.jsxs(
      'div',
      {
        className: `es-row ${me && p.id === me.id ? 'is-me' : ''} ${p.alive ? '' : ''}`,
        children: [
          M.jsx('span', { className: 'es-rank', children: i + 1 }),
          M.jsxs('span', {
            className: 'es-name',
            children: [
              M.jsx(hQ, { look: p.look, size: 22 }),
              M.jsx('b', { children: p.name }),
              p.id === mvp.id && M.jsx('em', { children: 'MVP' }),
            ],
          }),
          M.jsx('span', { children: p.kills }),
          M.jsx('span', { children: p.deaths }),
          M.jsx('span', { children: p.assists }),
          M.jsx('span', { children: (p.kills / Math.max(1, p.deaths)).toFixed(2) }),
          A.mode === 'ctf' && M.jsx('span', { children: p.captures || 0 }),
          M.jsx('span', { className: 'es-score', children: Math.round(p.score) }),
        ],
      },
      p.id,
    );
  const head = M.jsxs('div', {
    className: 'es-row es-thead',
    children: [
      M.jsx('span', { children: '#' }),
      M.jsx('span', { className: 'es-name', children: 'Player' }),
      M.jsx('span', { children: 'K' }),
      M.jsx('span', { children: 'D' }),
      M.jsx('span', { children: 'A' }),
      M.jsx('span', { children: 'K/D' }),
      A.mode === 'ctf' && M.jsx('span', { children: 'CAP' }),
      M.jsx('span', { children: 'Score' }),
    ],
  });
  const team = (X) => {
    const ps = A.players.filter((p) => p.team === X).sort((a, b) => sc(b) - sc(a));
    return M.jsxs(
      'section',
      {
        className: `es-team ${W === X ? 'is-win' : ''}`,
        style: { '--tc': ii[X].main },
        children: [
          M.jsxs('header', {
            children: [
              M.jsx('b', { children: ii[X].name }),
              M.jsx('span', { className: 'es-tscore', children: Math.floor(A.score[X]) }),
              W === X && M.jsx('em', { children: 'Winner' }),
            ],
          }),
          head,
          M.jsx('div', { className: 'es-rows', style: { '--n': Math.max(5, ps.length) }, children: ps.map(row) }),
        ],
      },
      X,
    );
  };
  const all = [...A.players].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  return M.jsx('div', {
    className: `es-wrap ${won ? 'is-won' : draw ? 'is-draw' : 'is-lost'}`,
    children: M.jsxs('div', {
      className: 'es',
      children: [
        M.jsxs('div', {
          className: 'es-hero',
          children: [
            M.jsxs('div', {
              className: 'es-meta',
              children: [Eg[A.mode], ' · ', aw().name, eA.net ? ' · Online' : ' · Offline'],
            }),
            M.jsx('h1', { children: draw ? 'Draw' : won ? 'Victory' : 'Defeat' }),
            M.jsx('div', {
              className: 'es-big',
              children: solo
                ? M.jsxs('span', { children: [(champ == null ? void 0 : champ.name) ?? 'Nobody', ' wins'] })
                : M.jsxs(M.Fragment, {
                    children: [
                      M.jsx('span', { style: { color: ii.CT.light }, children: Math.floor(A.score.CT) }),
                      M.jsx('i', { children: ':' }),
                      M.jsx('span', { style: { color: ii.T.light }, children: Math.floor(A.score.T) }),
                    ],
                  }),
            }),
            me &&
              M.jsxs('div', {
                className: 'es-you',
                children: [
                  [
                    ['Kills', me.kills],
                    ['Deaths', me.deaths],
                    ['Assists', me.assists],
                    ['Accuracy', acc + '%'],
                    ['Headshots', hs + '%'],
                    ['Score', Math.round(me.score)],
                    ...(Hs(A) ? [['Earned', '$' + (me.earned ?? 0).toLocaleString()]] : []),
                  ].map(([k, v]) =>
                    M.jsxs('div', { children: [M.jsx('b', { children: v }), M.jsx('span', { children: k })] }, k),
                  ),
                ],
              }),
            M.jsxs('div', {
              className: 'es-mvp',
              children: [
                M.jsx(hQ, { look: mvp.look, size: 44 }),
                M.jsxs('div', {
                  children: [
                    M.jsx('small', { children: 'Match MVP' }),
                    M.jsx('b', { children: mvp.name }),
                    M.jsxs('span', {
                      children: [
                        mvp.kills,
                        ' kills · ',
                        mvp.deaths,
                        ' deaths',
                        A.mode === 'ctf' ? ` · ${mvp.captures || 0} captures` : '',
                      ],
                    }),
                  ],
                }),
              ],
            }),
            (() => {
              const kd = me
                  ? (me.kills +
                      0.5 * me.assists +
                      2 * (me.captures || 0) +
                      2 * ((rep && rep.stats && rep.stats.plants) || 0)) /
                      (me.deaths + 1) +
                    (acc >= 30 ? 0.3 : 0)
                  : 0,
                grade = kd >= 3 ? 'S' : kd >= 2 ? 'A' : kd >= 1.2 ? 'B' : kd >= 0.7 ? 'C' : 'D';
              const best = (f, min = 1) => {
                  const s = [...A.players].sort((a, b) => f(b) - f(a))[0];
                  return s && f(s) >= min ? s : null;
                },
                acs = [];
              const tf = best((p) => p.kills, 3);
              tf && acs.push(['Top Fragger', tf.name]);
              const tp = best((p) => p.assists, 2);
              tp && acs.push(['Team Player', tp.name]);
              if (A.mode === 'ctf') {
                const fr = best((p) => p.captures || 0, 1);
                fr && acs.push(['Flag Runner', fr.name]);
              }
              const un = [...A.players].filter((p) => p.kills >= 2).sort((a, b) => a.deaths - b.deaths)[0];
              un && acs.push(['Hardest to Kill', un.name]);
              if (me) {
                acc >= 35 && pw.shots >= 20 && acs.push(['Sharpshooter', 'You']);
                hs >= 40 && me.kills >= 3 && acs.push(['Headhunter', 'You']);
                rep && rep.stats && rep.stats.bestStreak >= 5 && acs.push(['Unstoppable', 'You']);
              }
              return M.jsxs(M.Fragment, {
                children: [
                  M.jsxs('div', {
                    className: 'es-reward',
                    children: [
                      M.jsxs('div', {
                        className: `es-grade g-${grade}`,
                        children: [M.jsx('b', { children: grade }), M.jsx('span', { children: 'Rating' })],
                      }),
                      M.jsxs('div', {
                        className: 'es-xpsum',
                        children: [
                          M.jsxs('b', { children: ['+', ((rep && rep.total) || 0).toLocaleString(), ' XP'] }),
                          M.jsx('span', {
                            children:
                              rep && rep.levelAfter > rep.levelBefore
                                ? `Level up! ${rep.levelBefore} → ${rep.levelAfter}`
                                : `${IG(lvl)} · Level ${lvl}`,
                          }),
                          M.jsx('i', { children: M.jsx('u', { style: { width: pct + '%' } }) }),
                          M.jsx('small', {
                            children:
                              lvl >= cc ? 'Max level' : `${(a1x - prof.xp).toLocaleString()} XP to level ${lvl + 1}`,
                          }),
                        ],
                      }),
                    ],
                  }),
                  rep &&
                    rep.srDelta !== void 0 &&
                    (() => {
                      const r = __rankOf(rep.sr ?? 800);
                      return M.jsxs('div', {
                        className: 'es-rank2',
                        children: [
                          M.jsxs('b', { children: [r.name, ' ', r.div] }),
                          M.jsxs('span', { children: [Math.round(rep.sr), ' SR'] }),
                          M.jsxs('em', {
                            className: rep.srDelta >= 0 ? 'up' : 'down',
                            children: [rep.srDelta >= 0 ? '+' : '', rep.srDelta],
                          }),
                          rep.seasonGained > 0 && M.jsxs('i', { children: ['Season tier +', rep.seasonGained] }),
                        ],
                      });
                    })(),
                  rep &&
                    rep.lines &&
                    M.jsx('div', {
                      className: 'es-lines',
                      children: rep.lines
                        .slice()
                        .sort((a, b) => b.xp - a.xp)
                        .slice(0, 6)
                        .map((l) =>
                          M.jsxs(
                            'div',
                            {
                              children: [
                                M.jsx('span', { children: l.label }),
                                M.jsxs('b', { children: ['+', l.xp.toLocaleString()] }),
                              ],
                            },
                            l.label,
                          ),
                        ),
                    }),
                  rep &&
                    rep.unlocked &&
                    rep.unlocked.length > 0 &&
                    M.jsx('div', {
                      className: 'es-unlocks',
                      children: rep.unlocked.map((u) =>
                        M.jsxs('span', { children: ['Unlocked: ', u.name] }, u.id + u.level),
                      ),
                    }),
                  acs.length > 0 &&
                    M.jsx('div', {
                      className: 'es-acs',
                      children: acs
                        .slice(0, 5)
                        .map(([k, v]) =>
                          M.jsxs(
                            'div',
                            { children: [M.jsx('small', { children: k }), M.jsx('b', { children: v })] },
                            k,
                          ),
                        ),
                    }),
                ],
              });
            })(),
            M.jsx('div', {
              className: 'es-actions',
              children: eA.net
                ? M.jsxs(M.Fragment, {
                    children: [
                      M.jsx('span', { className: 'es-note', children: 'Next match starts in a few seconds…' }),
                      M.jsx('button', {
                        className: 'es-btn',
                        onClick: () => {
                          (eA.stop(), z.setup({ profileRev: z.profileRev + 1 }), z.setScreen('online'));
                        },
                        children: 'Leave lobby',
                      }),
                    ],
                  })
                : M.jsxs(M.Fragment, {
                    children: [
                      M.jsx('button', {
                        className: 'es-btn ghost',
                        onClick: () => {
                          (eA.stop(), z.setScreen('menu'));
                        },
                        children: 'Main menu',
                      }),
                      M.jsx('button', {
                        className: 'es-btn ghost',
                        onClick: () => {
                          (z.setup({ profileRev: z.profileRev + 1 }), z.setScreen('setup'));
                        },
                        children: 'Change setup',
                      }),
                      M.jsx('button', { className: 'es-btn go', onClick: again, children: 'Play again' }),
                    ],
                  }),
            }),
          ],
        }),
        M.jsx('div', {
          className: `es-board ${solo ? 'is-solo' : ''}`,
          children: solo
            ? M.jsxs('section', {
                className: 'es-team',
                style: { '--tc': '#ffcf5a' },
                children: [
                  M.jsx('header', { children: M.jsx('b', { children: 'Leaderboard' }) }),
                  head,
                  M.jsx('div', { className: 'es-rows', style: { '--n': all.length }, children: all.map(row) }),
                ],
              })
            : [team('CT'), team('T')],
        }),
      ],
    }),
  });
}
// ---------- HUD overlay: CTF status + ping ----------
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
    if (A.mode === 'ctf' && A.ctf) {
      for (const X of ['CT', 'T']) {
        const f = A.ctf[X],
          s =
            f.state === 'home'
              ? 'AT BASE'
              : f.state === 'carried'
                ? 'TAKEN — ' + (_u(f.carrier) || 'enemy')
                : 'DROPPED · ' + Math.max(0, Math.ceil(20 - (A.t - f.dropAt))) + 's';
        h += `<div class="h2-flag h2-${f.state}" style="--tc:${ii[X].main}"><i></i><b>${ii[X].name} flag</b><span>${s}</span><em>${Math.floor(A.score[X])}</em></div>`;
      }
    }
    const net = eA.net && eA.online;
    if (net && eA.net.role) {
      const p = eA.net.role === 'host' ? 'HOST' : eA.net.ping ? eA.net.ping + ' ms' : '— ms';
      h += `<div class="h2-ping ${eA.net.ping > 140 ? 'bad' : eA.net.ping > 80 ? 'mid' : ''}">${p}</div>`;
    }
    document.documentElement.classList.toggle('swat-ctf', A.mode === 'ctf');
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
