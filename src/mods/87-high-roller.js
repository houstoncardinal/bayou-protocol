/* ===== Bayou Tactical mod: High Roller, and every gun skin for everyone ===== */
// High Roller: a respawn team fight (Team Deathmatch rules: first team to the kill limit) where everyone starts
// with $100,000 and can buy any gun and attachment from the first second, whatever their rank. Any map,
// offline and online.
//   - it runs as Team Deathmatch with an hr flag on the match (core patch in BY: mode "hr" -> "tdm" + hr),
//     like Jailbreak runs as Bomb Defusal
//   - starting money: $100,000 (core patch: the two places a respawn mode hands out its starting money ask
//     __startMoney); the money cap is lifted to $10,000,000 for it (core patch: the three cap sites ask
//     __moneyCap), so kill rewards add to the $100,000 instead of cutting it to the usual $14,000
//   - no rank locks: in a High Roller match (or with it chosen in the menus) every gun, attachment and
//     tactical counts as unlocked for the loadout; the buy menu never had rank locks
//   - bots carry the guns a $100,000 budget buys: any primary in the roster, with attachments
// Online, the mode travels in the server's room name (cds.hr.<map>.<id>) like every mode, so the host's match
// is a High Roller match and so is everyone's who joins it.
//
// Gun skins: every finish (Woodland, Urban, Tiger, Gold, Diamond, Dark Matter) is available to every player,
// on every gun, without the level or weapon-mastery requirements.
const __HR = { money: 1e5, cap: 1e7 };
function __hrOn() {
  try {
    const room = (eA.net && eA.net.room && eA.net.room.name) || (eA.online && eA.online.game && eA.online.game.room && eA.online.game.room.name) || '',
      hrRoom = /^cds\.hr\./.test(room);
    // in a match, only the match decides (a normal match never gets High Roller's unlocks); in the menus, the
    // mode chosen there (so its loadout screen offers every gun)
    if (eA.state && !eA.attract) return !!eA.state.hr || hrRoom;
    return hrRoom || Zw.getState().mode === 'hr';
  } catch (e) {
    return !1;
  }
}
// A match's mode name, for everything that shows it in a match (the round banner, buy menu, scoreboard, pause
// menu, loading screen): High Roller and Jailbreak run as Team Deathmatch and Bomb Defusal underneath, and
// showed those names. (In the menus `x` is the menu's own settings, whose mode is already 'hr' or 'jb'.)
function __modeName(x) {
  return !x ? '' : x.hr ? Eg.hr : x.jb ? Eg.jb : Eg[x.mode];
}
// (called by the core: see the header)
function __startMoney(st) {
  return st && st.hr ? __HR.money : lU;
}
function __moneyCap() {
  return eA.state && eA.state.hr ? __HR.cap : uE;
}
// unlocks: skins always; guns, attachments and tacticals in High Roller
{
  const coreUnlocked = Fn;
  Fn = function (profile, kind, id) {
    if (kind === 'camo') return !0;
    if ((kind === 'weapon' || kind === 'attachment' || kind === 'tactical') && __hrOn()) return !0;
    return coreUnlocked.apply(this, arguments);
  };
}
// bots: a High Roller's loadout
{
  const coreKit = cU;
  cU = function (w, p) {
    const r = coreKit.apply(this, arguments);
    if (w && w.hr && p && p.isBot) {
      const prim = OwA.filter((id) => gw[id] && !(gw[id].unlock >= 999)),
        sec = YwA.filter((id) => gw[id] && !(gw[id].unlock >= 999));
      prim.length && (p.loadout = prim[Math.floor(Dw(w) * prim.length)]);
      sec.length && (p.secondary = sec[Math.floor(Dw(w) * sec.length)]);
      p.attach = { optic: Dw(w) < 0.75, suppressor: Dw(w) < 0.4, extmag: Dw(w) < 0.7 };
    }
    return r;
  };
}
// ---------------------------------------------------------------- the mode in the menus
(function () {
  Eg.hr = 'High Roller';
  Object.assign(oU, { hr: 50 });
  Object.assign(sBA, { hr: ['Respawn', 'Team', '$100K'] });
  Object.assign(CBA, { hr: ['#c9a227', '#1f1705'] });
  gF.some(([k]) => k === 'hr') || gF.push(['hr', 'Start with $100,000 and buy any gun or attachment from the first second, no rank locks. Respawn team fight, first to the kill limit. Any map.']);
  CN.includes('hr') || CN.push('hr');
  try {
    const st = Zw.getState();
    st.scores && st.scores.hr === void 0 && st.setup({ scores: { ...st.scores, hr: 50 } });
  } catch (e) {}
})();
// its card art (the mode picker), like the other modes' (75-menu-art.js)
typeof document < 'u' &&
  (() => {
    const css = document.createElement('style');
    css.textContent = ".po-mode[data-mode='hr'] .po-mode-art{background:linear-gradient(180deg,rgba(8,10,14,0) 55%,rgba(8,10,14,.28)),url(game/menu/mode-hr.webp) center/cover!important;filter:brightness(1.1) saturate(1.05)}";
    document.head.appendChild(css);
  })();
typeof window < 'u' && (window.__bpHighRoller = () => ({ on: __hrOn(), state: !!(eA.state && eA.state.hr), mode: eA.state && eA.state.mode, money: eA.human() ? eA.human().money : null, guns: eA.human() ? Object.values(eA.human().weapons).filter(Boolean).map((x) => x.id) : null, bots: eA.state ? eA.state.players.filter((p) => p.isBot).map((p) => p.loadout) : null, enemy: (() => { const me = eA.human(), e = me && eA.state && eA.state.players.find((p) => p.team !== me.team && p.alive); return e ? e.id : null; })() }));
