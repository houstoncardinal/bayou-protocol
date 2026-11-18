/* ===== Bayou Tactical mod: official servers ===== */
// Five permanent servers, one per map, across every online mode. They are always in the server lists (the
// Servers panel, the Multiplayer screen's live lobbies) even when nobody is in them, and quick play goes to the
// matching one when no other lobby is running.
//
// They cost nothing to run: each is a fixed match room name. The first player to join an empty one hosts it in
// their browser (bots fill the empty seats, as in every lobby); everyone after joins them. When the host leaves,
// the next player takes the match over (the core's host hand-over), and when the last one leaves the server is
// empty again but stays listed. Two players joining an empty one at the same moment end up in the same match,
// since the room name is the same for everyone.
//
// To add one: a new entry here (lb: 'cds.<mode>.<map>.<letters and digits>', a name not used before). To run them
// on dedicated machines later, those machines join these same room names; nothing else changes.
const __OFFICIAL = [
  { lb: 'cds.tdm.ridgeback.bayou1', title: 'Bayou #1', mode: 'tdm', map: 'ridgeback' },
  { lb: 'cds.bomb.fortress.bayou2', title: 'Bayou #2', mode: 'bomb', map: 'fortress' },
  { lb: 'cds.ffa.frostline.bayou3', title: 'Bayou #3', mode: 'ffa', map: 'frostline' },
  { lb: 'cds.jb.prison.bayou4', title: 'Bayou #4', mode: 'jb', map: 'prison' },
  { lb: 'cds.tdm.cinema.bayou5', title: 'Bayou #5', mode: 'tdm', map: 'cinema' },
];
const __OFFICIAL_BY = new Map(__OFFICIAL.map((o) => [o.lb, o]));
// a server's name as players chose it, by room (kept so a host who takes a match over can carry it on)
const __SV_SEEN = new Map();
{
  const prevList = aBA;
  aBA = function (peers) {
    const list = prevList.apply(this, arguments);
    for (const p of peers) {
      const s = p.presence && p.presence.sv;
      s && typeof s.lb === 'string' && !__OFFICIAL_BY.has(s.lb) && __SV_SEEN.set(s.lb, { lb: s.lb, n: s.n, pv: s.pv });
    }
    while (__SV_SEEN.size > 200) __SV_SEEN.delete(__SV_SEEN.keys().next().value);
    // a running server whose own label went (its creator left, or started another) keeps its name
    for (const l of list) if (!l.title && __SV_SEEN.has(l.name)) (l.title = String(__SV_SEEN.get(l.name).n || '').slice(0, 32)), (l.priv = !!__SV_SEEN.get(l.name).pv);
    // the official servers: first, in their order, whether anyone is in them or not
    const off = __OFFICIAL.map((o) => {
      const l = list.find((x) => x.name === o.lb) || { name: o.lb, mode: o.mode, map: o.map, count: 0, players: [] };
      return Object.assign(l, { title: o.title, official: !0, priv: !1 });
    });
    return [...off, ...list.filter((l) => !__OFFICIAL_BY.has(l.name))];
  };
}
// The host of a player-made server carries its name: whoever hosts the match (its creator, or the player who
// took it over) advertises it, so the server lists keep showing it after a hand-over.
typeof window < 'u' &&
  setInterval(() => {
    try {
      const net = eA.net,
        lb = net && net.room && net.room.name;
      if (!lb || net.role !== 'host' || __OFFICIAL_BY.has(lb)) return;
      const seen = __SV_SEEN.get(lb),
        mine = __NET.myLp && __NET.myLp.sv;
      if (!seen || (mine && mine.lb === lb)) return;
      const someone = [...__NET.lobby.values()].some((p) => p && p.sv && p.sv.lb === lb);
      someone || __netLobbyRoom().presence({ sv: seen });
    } catch (e) {}
  }, 2000);
typeof window < 'u' && (window.__bpOfficial = () => __OFFICIAL.map((o) => ({ ...o })));
