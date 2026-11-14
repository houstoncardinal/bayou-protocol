/* ===== Bayou Protocol mod: competitive rules, gore setting, production hardening ===== */
// Bomb Defusal halftime and overtime (first to N rounds, as set in the match rules):
//   - after N - 1 rounds the teams swap sides: everyone changes team, each team keeps its score (the scores
//     swap with the sides), money goes back to the starting amount, guns back to a pistol and knife, armor,
//     helmets and kits are lost, the loss bonus resets. "Halftime: switching sides" is announced.
//   - overtime: if both teams reach N - 1, the target goes up by 3 (a 6-round overtime, first to 4 of them
//     wins it) with a side swap after its first 3 rounds; tied again, another overtime. A match never ends
//     on a single coin-flip round.
// Gore setting (Settings > Gameplay > Blood): off removes blood mist, spatter and pools (for younger players
// and streams); hits still flash the hit marker and play their sounds.
// Production builds: the debug and test hooks (window.cds, cdsUi, __phx, __bpHitboxes ...) are removed
// once the game has started, so a player cannot read every position or aim from the browser console with
// one line. Add ?debug to the address to keep them (local testing). This raises the bar; it does not make a
// browser game cheat-proof (see the README: a match server is the real protection).
// ---------------------------------------------------------------- halftime and overtime
{
  const coreStart = BY;
  BY = function (w) {
    const st = coreStart.apply(this, arguments);
    try {
      st.mode === 'bomb' && (st.__swapAt = Math.max(1, st.winScore - 1));
    } catch (e) {}
    return st;
  };
}
function __cmpSwap(w, text) {
  for (const p of w.players) {
    p.team = p.team === 'CT' ? 'T' : 'CT';
    p.weapons = {};
    wn(p, 'pistol');
    wn(p, 'knife');
    p.active = 2;
    p.armor = 0;
    p.helmet = !1;
    p.defuseKit = !1;
    p.hasBomb = !1;
    p.money = Uh;
    p.lastBuys = [];
  }
  const s = w.score.CT;
  w.score.CT = w.score.T;
  w.score.T = s;
  w.lossStreak = { CT: 0, T: 0 };
  w.fx.push({ type: 'announce', text });
}
{
  const coreEnd = se;
  se = function (w) {
    const live = w.phase === 'live';
    const r = coreEnd.apply(this, arguments);
    try {
      if (live && w.mode === 'bomb' && w.__swapAt != null) {
        const N = w.winScore;
        // tied one short of the target: overtime
        if (w.score.CT === N - 1 && w.score.T === N - 1) {
          w.winScore = N + 3;
          w.__swapAt = w.score.CT + w.score.T + 3;
          w.__ot = (w.__ot || 0) + 1;
          w.fx.push({ type: 'announce', text: w.__ot > 1 ? `Overtime ${w.__ot}` : 'Overtime' });
        }
      }
    } catch (e) {}
    return r;
  };
}
{
  const coreRound = QU;
  QU = function (w) {
    try {
      if (w.mode === 'bomb' && w.__swapAt != null && w.score.CT + w.score.T === w.__swapAt && w.__swappedAt !== w.__swapAt) {
        w.__swappedAt = w.__swapAt;
        __cmpSwap(w, w.__ot ? 'Overtime halftime: switching sides' : 'Halftime: switching sides');
      }
    } catch (e) {}
    return coreRound.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- gore setting
eA.settings.gore === void 0 && (eA.settings.gore = !0);
{
  const coreBloodHit = __bloodHit,
    coreBloodPool = __bloodPoolLater;
  __bloodHit = function () {
    if (eA.settings.gore === !1) return;
    return coreBloodHit.apply(this, arguments);
  };
  __bloodPoolLater = function () {
    if (eA.settings.gore === !1) return;
    return coreBloodPool.apply(this, arguments);
  };
}
function __GoreRow({ row }) {
  const [on, set] = S.useState(eA.settings.gore !== !1);
  return M.jsx(row, {
    label: 'Blood',
    desc: 'Blood when players are hit and pools when they fall. Turn it off for younger players or streams.',
    children: M.jsx(jI, {
      label: 'Blood',
      on,
      onChange: (v) => {
        eA.settings.gore = v;
        eA.saveSettings();
        set(v);
      },
    }),
  });
}
{
  const coreRow = rw;
  rw = function (p) {
    const r = coreRow(p);
    return p.label === 'Kill cam' ? M.jsxs(M.Fragment, { children: [r, M.jsx(__GoreRow, { row: coreRow })] }) : r;
  };
}
// ---------------------------------------------------------------- production: no debug hooks on window
typeof window < 'u' &&
  import.meta.env.PROD &&
  !/[?&]debug\b/.test(location.search) &&
  setTimeout(() => {
    // the first-person scene is read through window by 54-speed.js: keep a private reference first
    try {
      window.__vmScene && (__SPD.vm = window.__vmScene);
    } catch (e) {}
    for (const k of Object.keys(window)) if (/^(cds|__bp|__phx|__perf|__r3f|__progs|__XG$|__RIG|__KNIFE|__AW_SET|__look$|__nlState|__hbErr|__bodyErr|__locoErr|__vmScene$)/.test(k)) try {
      delete window[k];
    } catch (e) {
      window[k] = void 0;
    }
  }, 0);
