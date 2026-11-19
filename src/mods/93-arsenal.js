/* ===== Bayou Tactical mod: team arsenals ===== */
// Each side has its own guns, as in every competitive tactical shooter with two factions: the same roles on both
// sides, filled by different weapons with different trade-offs. Counter-Terrorists carry Western 5.56 and 9 mm
// guns that cost a little more and reward precision; Terrorists carry 7.62 guns that are cheaper, hit harder
// and kick more. A few guns both sides can buy (the burst pistol, the SMG, the shotgun, the sniper and the LMG).
//
//              Counter-Terrorists          Terrorists              Both
//   Pistol     Warden 9 (starting)         Kestrel 9 (starting)    Striker 17 (burst)
//   SMG                                                            Hornet .45
//   Shotgun                                                        Mauler 12
//   Rifle      Sentinel M4A1, Talon 5.56   Kodiak 7.62 (AK)
//   Premium    Bastion 7.62 (suppressed)   Midas 7.62 (gold AK)
//   Sniper                                                         Phantom 12.7
//   Heavy                                                          Anvil 7.62
//
// How it's enforced:
//   - the buy menu lists your side's guns and the shared ones (the core already hides shop items marked with the
//     other team); buying the other side's gun is refused by the price check every purchase goes through (z9),
//     offline and on an online match's host, so a modified client can't buy it either
//   - the loadout screen offers your side's guns; a loadout gun from the other side (a saved choice, or a team
//     swap) is given as its counterpart at spawn: Sentinel <-> Kodiak, Talon -> Kodiak, Bastion <-> Midas,
//     Warden <-> Kestrel. Bots get their side's guns the same way
//   - a gun dropped by a dead enemy can still be picked up (part of the game: you earn it)
//   - High Roller ignores sides (any gun in the game) and Gun Ladder hands out its own ladder
// The Rampart 7.62 is retired: its model's author and licence were never recorded, so it can't be credited, and it
// was a second SCAR beside the Bastion. Old saved choices of it become the Bastion (CT) or the Kodiak (T).
const __ARS = {
  side: { sentinel: 'CT', hk416: 'CT', bastion: 'CT', warden: 'CT', ak47: 'T', midas: 'T', kestrel: 'T' },
  swap: {
    CT: { ak47: 'sentinel', midas: 'bastion', kestrel: 'warden', rampart: 'bastion' },
    T: { sentinel: 'ak47', hk416: 'ak47', bastion: 'midas', warden: 'kestrel', rampart: 'ak47' },
  },
};
// may this player use this item? (no side: shared; High Roller and Gun Ladder: anything)
function __arsOk(team, id, w) {
  const s = __ARS.side[id];
  if (!s || !team) return !0;
  if (w && (w.hr || w.mode === 'gungame')) return !0;
  return s === team;
}
// the Rampart leaves the shop, the loadouts, the bots' table, the Gun Ladder and the unlock list
{
  const drop = (arr, test) => {
    for (let i = arr.length - 1; i >= 0; i--) test(arr[i]) && arr.splice(i, 1);
  };
  drop(fQ, (x) => x.id === 'rampart');
  drop(BG, (b) => b.kind === 'weapon' && b.id === 'rampart');
  for (const a of [OwA, J8, uI, Xl]) drop(a, (x) => x === 'rampart');
  typeof __ROSTER < 'u' && (__ROSTER.REMAP.rampart = 'bastion');
  // each shop item marked with its side (the core's buy menu hides the other side's)
  for (const x of fQ) __ARS.side[x.id] && (x.team = __ARS.side[x.id]);
  // each side's standard rifle from the first level (the Sentinel and the Kodiak unlocked at 4 and 3, so a new
  // Terrorist had no rifle of their own and was shown the Counter-Terrorists' default)
  for (const b of BG) b.kind === 'weapon' && (b.id === 'sentinel' || b.id === 'ak47') && (b.level = 1);
}
// the menus' loadout (Xd) and an online match's (qm): a gun from the other side (a locked choice falls back to the
// core's default rifle, the Sentinel; or a saved choice from the other side) shows and plays as its counterpart
{
  const fix = (r) => {
    const team = Zw.getState().team,
      sw = __ARS.swap[team],
      mode = Zw.getState().mode;
    if (!r || !sw || mode === 'hr' || mode === 'gungame') return r;
    r.loadout && !__arsOk(team, r.loadout, null) && sw[r.loadout] && (r.loadout = sw[r.loadout]);
    r.secondary && !__arsOk(team, r.secondary, null) && sw[r.secondary] && (r.secondary = sw[r.secondary]);
    return r;
  };
  const coreXd = Xd,
    coreQm = qm;
  Xd = function () {
    return fix(coreXd.apply(this, arguments));
  };
  qm = function () {
    return fix(coreQm.apply(this, arguments));
  };
}
// purchases: the other side's gun has no price you can pay (offline, and on the host for online guests)
{
  const corePrice = z9;
  z9 = function (p, id) {
    const st = eA.state;
    return p && !__arsOk(p.team, id, st) ? 1 / 0 : corePrice.apply(this, arguments);
  };
}
// High Roller: the buy menu lists every gun whatever your side
{
  const coreShop = Oj;
  Oj = function (cat) {
    const st = eA.state;
    if (!(st && st.hr)) return coreShop.apply(this, arguments);
    return fQ.filter((I) => I.cat === cat && !(I.id === 'kit' && st.mode !== 'bomb'));
  };
}
// spawning: a gun from the other side becomes its counterpart (players and bots)
{
  const coreKit = cU;
  cU = function (w, p) {
    const r = coreKit.apply(this, arguments);
    if (p && p.team && w && !w.hr && w.mode !== 'gungame') {
      const sw = __ARS.swap[p.team] || {};
      p.loadout && !__arsOk(p.team, p.loadout, w) && (p.loadout = sw[p.loadout] || p.loadout);
      p.secondary && !__arsOk(p.team, p.secondary, w) && (p.secondary = sw[p.secondary] || p.secondary);
      // the sidearm the core hands out at spawn: your side's starting pistol
      for (const k of Object.keys(p.weapons || {})) {
        const x = p.weapons[k];
        if (x && !__arsOk(p.team, x.id, w) && sw[x.id]) {
          delete p.weapons[k];
          wn(p, sw[x.id]);
        }
      }
    }
    return r;
  };
}
// the loadout screen: your side's guns and the shared ones (the side chosen in the menus)
{
  const coreLoadout = lG;
  lG = function () {
    const st = Zw.getState(),
      team = st.team,
      hr = st.mode === 'hr' || st.mode === 'gungame';
    if (hr || (team !== 'CT' && team !== 'T')) return coreLoadout.apply(this, arguments);
    const keepP = OwA.slice(),
      keepS = YwA.slice(),
      ok = (id) => __arsOk(team, id, null);
    OwA.splice(0, OwA.length, ...keepP.filter(ok));
    YwA.splice(0, YwA.length, ...keepS.filter(ok));
    try {
      return coreLoadout.apply(this, arguments);
    } finally {
      OwA.splice(0, OwA.length, ...keepP);
      YwA.splice(0, YwA.length, ...keepS);
    }
  };
}
typeof window < 'u' &&
  (window.__bpArsenal = () => {
    const me = eA.human && eA.human();
    return {
      shop: fQ.filter((x) => x.id in gw).map((x) => x.id + (x.team ? ':' + x.team : '')),
      me: me ? { team: me.team, guns: Object.values(me.weapons).filter(Boolean).map((x) => x.id) } : null,
      bots: eA.state ? eA.state.players.filter((p) => p.isBot).map((p) => p.team + ':' + p.loadout) : null,
      // what each gun would cost you now (Infinity: not for your side)
      prices: me ? Object.fromEntries(fQ.filter((x) => x.id in gw).map((x) => [x.id, z9(me, x.id)])) : null,
    };
  });
