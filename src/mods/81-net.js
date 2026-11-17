/* ===== Bayou Protocol mod: real online play, friends, chat, servers, leaderboard ===== */
// Online play used the host page's own rooms (window.claude, only inside Claude) or, failing that, a
// BroadcastChannel (only tabs of the same browser). Now:
//   - a hub (server/net-core.mjs) carries the lobby, the signals to connect players, friends, chat and the
//     leaderboard: on the web it's the Cloudflare Worker (BAYOU_NET_URL at build, see docs/online.md); served by
//     the dev/preview server it's /net on that machine (LAN parties: everyone opens this machine's address)
//   - matches run browser to browser: WebRTC data channels between every pair of players in the match (the
//     game's netcode is unchanged: it still sees rooms of peers with presence); a pair that can't connect
//     directly relays through the hub
// The transport here has the same shape as the core's (room = { name, peers(), presence(p), onPeers(cb),
// leave() }), so the core's matchmaking, server list, voice chat and match sync all run on it.
//
// On top: window.__bpSocial (friends, chat, invites, servers, leaderboard, profile) and its panel (F2, or the
// Home screen's Friends / Servers / Leaderboard).
const __NET = {
  url: null,
  ws: null,
  ready: !1,
  readyWaiters: [],
  peer: null,
  id: null,
  me: null,
  ice: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }],
  lobby: new Map(), // peer -> lobby presence
  myLp: {},
  rooms: new Map(), // room name -> room state
  friends: [],
  reqs: [],
  unread: {},
  chats: new Map(), // friend id -> [{f, x, a}]
  lb: null,
  subs: new Set(),
  retry: 0,
  lpDirty: {},
  lpTimer: 0,
  reported: new Set(),
};
// ------------------------------------------------------------------ where the hub is
function __netURL() {
  try {
    const o = localStorage.getItem('bp-net-url');
    if (o) return o;
  } catch {}
  const mode = __netMode();
  const built = typeof __BAYOU_NET__ < 'u' ? __BAYOU_NET__ : '';
  if (mode !== 'lan' && built) return built.replace(/\/?$/, '') + (/\/net$|\/ws$/.test(built) ? '' : '/net');
  // the dev/preview server (LAN parties): the hub is on the machine this page came from
  if (typeof location < 'u' && /^https?:$/.test(location.protocol) && (mode === 'lan' || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/.test(location.hostname) || /^(5173|4173)$/.test(location.port)))
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/net';
  return null;
}
function __netMode() {
  try {
    return localStorage.getItem('bp-net-mode') || 'auto';
  } catch {
    return 'auto';
  }
}
const __netEmit = (what) => {
  for (const f of __NET.subs)
    try {
      f(what);
    } catch {}
};
// ------------------------------------------------------------------ the hub connection
function __netConnect() {
  if (__NET.ws || typeof WebSocket > 'u') return;
  const url = (__NET.url = __netURL());
  if (!url) return;
  let ws;
  try {
    ws = new WebSocket(url);
  } catch {
    return;
  }
  __NET.ws = ws;
  ws.onopen = () => {
    __NET.retry = 0;
    let id = null,
      tok = null;
    try {
      id = localStorage.getItem('bp-net-id');
      tok = localStorage.getItem('bp-net-tok');
    } catch {}
    ws.send(JSON.stringify({ t: 'hi', id, tok, name: __netName(), look: __netLook() }));
  };
  ws.onmessage = (e) => {
    let m;
    try {
      m = JSON.parse(e.data);
    } catch {
      return;
    }
    __netOnMessage(m);
  };
  ws.onclose = () => {
    __NET.ws = null;
    const was = __NET.ready;
    __NET.ready = !1;
    __NET.lobby.clear();
    for (const r of __NET.rooms.values()) r.dropAll();
    was && __netEmit('offline');
    // reconnect, backing off to 20 s
    const wait = Math.min(20000, 800 * 2 ** __NET.retry++);
    setTimeout(__netConnect, wait);
  };
}
// switch hubs (Online / LAN): drop this connection (and the current online session) and connect again
function __netReconnect() {
  const ws = __NET.ws;
  __NET.retry = 0;
  ws && ((ws.onclose = null), ws.close());
  __NET.ws = null;
  __NET.ready = !1;
  __NET.lobby.clear();
  for (const r of [...__NET.rooms.values()]) r.leave();
  try {
    eA.online && !eA.net && (eA.online = null), (JN = null);
  } catch {}
  __netConnect();
}
function __netSend(m) {
  const ws = __NET.ws;
  ws && ws.readyState === 1 && ws.send(JSON.stringify(m));
}
function __netName() {
  try {
    return gD();
  } catch {
    return 'Player';
  }
}
function __netLook() {
  try {
    return JSON.stringify(Ng(FQ())).slice(0, 400);
  } catch {
    return null;
  }
}
function __netWhenReady(ms = 6000) {
  if (__NET.ready) return Promise.resolve(!0);
  __netConnect();
  if (!__NET.ws) return Promise.resolve(!1);
  return new Promise((res) => {
    const t = setTimeout(() => res(!1), ms);
    __NET.readyWaiters.push(() => (clearTimeout(t), res(!0)));
  });
}
function __netOnMessage(m) {
  switch (m.t) {
    case 'hi': {
      __NET.peer = m.peer;
      __NET.id = m.id;
      __NET.me = m.me;
      try {
        localStorage.setItem('bp-net-id', m.id);
        m.tok && localStorage.setItem('bp-net-tok', m.tok);
      } catch {}
      Array.isArray(m.ice) && m.ice.length && (__NET.ice = m.ice);
      __NET.lobby = new Map((m.lobby || []).map((x) => [x.peer, x.p || {}]));
      __NET.friends = m.friends || [];
      __NET.reqs = m.reqs || [];
      __NET.unread = m.unread || {};
      __NET.ready = !0;
      // what we had published before a reconnect
      Object.keys(__NET.myLp).length && __netSend({ t: 'lp', p: __NET.myLp });
      for (const r of __NET.rooms.values()) r.rejoin();
      for (const f of __NET.readyWaiters.splice(0)) f();
      __NET.lobbyRoom && __NET.lobbyRoom.changed();
      __netEmit('ready');
      return;
    }
    case 'lp': {
      if (m.gone) __NET.lobby.delete(m.peer);
      else {
        const p = { ...(__NET.lobby.get(m.peer) || {}) };
        for (const [k, v] of Object.entries(m.p || {})) v === null ? delete p[k] : (p[k] = v);
        __NET.lobby.set(m.peer, p);
      }
      __NET.lobbyRoom && __NET.lobbyRoom.changed();
      __netEmit('lobby');
      return;
    }
    case 'joined':
    case 'pj':
    case 'pl':
    case 'sig':
    case 'rp': {
      const r = __NET.rooms.get(m.room);
      r && r.on(m);
      return;
    }
    case 'friends':
      __NET.friends = m.list || [];
      __NET.reqs = m.reqs || [];
      return __netEmit('friends');
    case 'fp': {
      const f = __NET.friends.find((x) => x.id === m.id);
      if (f) {
        const wasIn = f.game && f.game.lb;
        f.online = m.online;
        f.game = m.game;
        !wasIn && m.game && __netToast(`${f.name} is in a match`, `${__netModeName(m.game.m)} · ${__netMapName(m.game.mp)}`, { act: 'Join', run: () => __bpSocial.join(f.id) });
      }
      return __netEmit('friends');
    }
    case 'freq':
      __NET.reqs = [...__NET.reqs.filter((x) => x.id !== m.from.id), m.from];
      __netToast('Friend request', `${m.from.name} wants to be friends`, { act: 'Open', run: () => __bpSocial.openFriends() });
      return __netEmit('friends');
    case 'msg': {
      const list = __NET.chats.get(m.with) || [];
      list.push(m.m);
      __NET.chats.set(m.with, list.slice(-200));
      if (m.m.f !== __NET.id) {
        const open = __NET.ui && __NET.ui.chatWith === m.with && __NET.ui.visible;
        if (open) __netSend({ t: 'read', with: m.with });
        else {
          __NET.unread[m.with] = (__NET.unread[m.with] || 0) + 1;
          const f = __NET.friends.find((x) => x.id === m.with);
          __netToast(f ? f.name : 'Message', __netInvite(m.m.x) ? 'invited you to their match' : m.m.x, { act: 'Reply', run: () => __bpSocial.openChat(m.with) });
        }
      }
      return __netEmit('chat');
    }
    case 'hist':
      __NET.chats.set(m.with, m.msgs || []);
      return __netEmit('chat');
    case 'lb':
      __NET.lb = { at: Date.now(), rows: m.rows || [] };
      return __netEmit('lb');
    case 'me':
      __NET.me = m.me;
      return __netEmit('me');
    case 'prof':
      __NET.lastProfile = m.p;
      return __netEmit('prof');
    case 'ok':
      m.what === 'freq' && __netToast('Request sent', 'They will see it next time they look', {});
      return;
    case 'err':
      __netToast("Couldn't do that", m.msg || '', {});
      return;
  }
}
// ------------------------------------------------------------------ the lobby room (through the hub)
function __netLobbyRoom() {
  if (__NET.lobbyRoom) return __NET.lobbyRoom;
  const subs = new Set();
  let snap = null,
    queued = !1;
  const R = {
    name: 'lobby',
    peers() {
      if (snap) return snap;
      snap = [{ peer: __NET.peer || 'me', isMe: !0, presence: Object.freeze({ ...__NET.myLp }) }, ...[...__NET.lobby].map(([peer, p]) => ({ peer, isMe: !1, presence: p }))];
      return snap;
    },
    presence(p) {
      for (const [k, v] of Object.entries(p || {})) v === null ? delete __NET.myLp[k] : (__NET.myLp[k] = v);
      Object.assign(__NET.lpDirty, p);
      snap = null;
      R.changed();
      __NET.lpTimer ||
        (__NET.lpTimer = setTimeout(() => {
          __NET.lpTimer = 0;
          const d = __NET.lpDirty;
          __NET.lpDirty = {};
          Object.keys(d).length && __netSend({ t: 'lp', p: d });
        }, 60));
    },
    onPeers(cb) {
      subs.add(cb);
      queueMicrotask(() => cb(R.peers()));
      return () => subs.delete(cb);
    },
    changed() {
      snap = null;
      if (queued) return;
      queued = !0;
      requestAnimationFrame(() => {
        queued = !1;
        const s = R.peers();
        for (const f of subs) f(s);
      });
    },
    async leave() {},
  };
  return (__NET.lobbyRoom = R);
}
// ------------------------------------------------------------------ a match room (browser to browser)
function __netGameRoom(name) {
  const subs = new Set(),
    others = new Map(), // peer -> presence
    links = new Map(), // peer -> link
    mine = { hu: __NET.id, hn: __netName().slice(0, 20) };
  let dirty = {},
    snap = null,
    queued = !1,
    left = !1,
    fullAt = 0;
  const R = {
    name,
    peers() {
      if (snap) return snap;
      snap = [{ peer: __NET.peer || 'me', isMe: !0, presence: Object.freeze({ ...mine }) }, ...[...others].map(([peer, p]) => ({ peer, isMe: !1, presence: p }))];
      return snap;
    },
    presence(p) {
      for (const [k, v] of Object.entries(p || {})) v === null ? delete mine[k] : (mine[k] = v);
      Object.assign(dirty, p);
      snap = null;
      changed();
    },
    onPeers(cb) {
      subs.add(cb);
      queueMicrotask(() => cb(R.peers()));
      return () => subs.delete(cb);
    },
    async leave() {
      if (left) return;
      left = !0;
      clearInterval(pump);
      __netSend({ t: 'leave', room: name });
      for (const L of links.values()) L.close();
      links.clear();
      __NET.rooms.delete(name);
    },
    // ---- from the hub
    on(m) {
      if (m.t === 'joined') for (const p of m.peers) link(p.peer, !0);
      else if (m.t === 'pj') link(m.peer, !1);
      else if (m.t === 'pl') drop(m.peer);
      else if (m.t === 'sig') (links.get(m.from) || link(m.from, !1)).signal(m.d);
      else if (m.t === 'rp') receive(m.from, m.x);
    },
    rejoin() {
      __netSend({ t: 'join', room: name });
    },
    dropAll() {
      for (const p of [...links.keys()]) drop(p);
    },
  };
  function changed() {
    snap = null;
    if (queued) return;
    queued = !0;
    requestAnimationFrame(() => {
      queued = !1;
      const s = R.peers();
      for (const f of subs) f(s);
    });
  }
  function receive(from, x) {
    if (!x || typeof x !== 'object') return;
    if (x.f) others.set(from, Object.freeze({ ...x.f }));
    else if (x.d) {
      const p = { ...(others.get(from) || {}) };
      for (const [k, v] of Object.entries(x.d)) v === null ? delete p[k] : (p[k] = v);
      others.set(from, Object.freeze(p));
    }
    changed();
  }
  function drop(peer) {
    const L = links.get(peer);
    L && L.close();
    links.delete(peer);
    others.delete(peer) && changed();
  }
  // one link per other player: a data channel (negotiated, so both ends open it the same way); the newer
  // player makes the offer. If it isn't open within 6 s, this pair relays through the hub.
  function link(peer, offer) {
    if (links.has(peer)) return links.get(peer);
    const pc = new RTCPeerConnection({ iceServers: __NET.ice }),
      dc = pc.createDataChannel('p', { negotiated: !0, id: 0, ordered: !0 }),
      L = {
        pc,
        dc,
        relay: !1,
        open: !1,
        lastRelay: 0,
        send(x) {
          if (L.open && dc.readyState === 'open') dc.send(JSON.stringify(x));
          else if (L.relay) __netSend({ t: 'rp', room: name, to: peer, x });
        },
        async signal(d) {
          try {
            if (d.sdp) {
              await pc.setRemoteDescription(d.sdp);
              if (d.sdp.type === 'offer') {
                await pc.setLocalDescription(await pc.createAnswer());
                __netSend({ t: 'sig', room: name, to: peer, d: { sdp: pc.localDescription } });
              }
              for (const c of L.pending || []) await pc.addIceCandidate(c).catch(() => {});
              L.pending = null;
            } else if (d.ice) {
              pc.remoteDescription ? await pc.addIceCandidate(d.ice).catch(() => {}) : (L.pending || (L.pending = [])).push(d.ice);
            }
          } catch {}
        },
        close() {
          clearTimeout(L.timer);
          try {
            dc.close();
            pc.close();
          } catch {}
        },
      };
    links.set(peer, L);
    pc.onicecandidate = (e) => e.candidate && __netSend({ t: 'sig', room: name, to: peer, d: { ice: e.candidate } });
    dc.onopen = () => {
      L.open = !0;
      L.relay = !1;
      dc.send(JSON.stringify({ f: mine }));
    };
    dc.onclose = () => (L.open = !1);
    dc.onmessage = (e) => {
      try {
        receive(peer, JSON.parse(e.data));
      } catch {}
    };
    L.timer = setTimeout(() => {
      L.open || ((L.relay = !0), __netSend({ t: 'rp', room: name, to: peer, x: { f: mine } }));
    }, 6000);
    if (offer)
      (async () => {
        try {
          await pc.setLocalDescription(await pc.createOffer());
          __netSend({ t: 'sig', room: name, to: peer, d: { sdp: pc.localDescription } });
        } catch {}
      })();
    return L;
  }
  // what changed goes out 30 times a second (relayed pairs: 20); everything every 2 s, so nothing drifts
  const pump = setInterval(() => {
    const t = performance.now(),
      full = t - fullAt > 2000,
      d = dirty;
    if (!full && !Object.keys(d).length) return;
    dirty = {};
    full && (fullAt = t);
    const x = full ? { f: mine } : { d };
    for (const L of links.values()) {
      if (L.relay && !L.open) {
        if (t - L.lastRelay < 50 && !full) {
          Object.assign(dirty, d);
          continue;
        }
        L.lastRelay = t;
      }
      L.send(x);
    }
  }, 33);
  __NET.rooms.set(name, R);
  __netSend({ t: 'join', room: name });
  return R;
}
// ------------------------------------------------------------------ the transport the core uses
function __netTransport() {
  return {
    kind: 'net',
    lobby: __netLobbyRoom(),
    async join(name) {
      if (!(await __netWhenReady())) throw new Error('offline');
      const old = __NET.rooms.get(name);
      old && (await old.leave());
      return __netGameRoom(name);
    },
    close() {
      __netLobbyRoom().presence({ mm: null });
    },
  };
}
{
  const coreRooms = rBA;
  rBA = async function () {
    const c = await coreRooms.apply(this, arguments);
    if (c) return c;
    if (!__netURL()) return null;
    return (await __netWhenReady()) ? __netTransport() : null;
  };
}
// private servers are left out of quick play (they're joined by code or invite); servers keep their names
{
  const coreList = aBA;
  aBA = function (peers) {
    const list = coreList.apply(this, arguments),
      sv = new Map();
    for (const p of peers) {
      const s = p.presence && p.presence.sv;
      s && typeof s.lb === 'string' && sv.set(s.lb, s);
    }
    for (const l of list) {
      const s = sv.get(l.name);
      s && ((l.title = String(s.n || '').slice(0, 32)), (l.priv = !!s.pv), (l.max = s.max | 0 || null));
    }
    return list;
  };
  const corePick = JBA;
  JBA = function (list, ...rest) {
    return corePick.call(this, list.filter((l) => !l.priv), ...rest);
  };
}
// ------------------------------------------------------------------ the leaderboard: the host reports each match
setInterval(() => {
  try {
    const st = eA.state,
      net = eA.net;
    if (!st || !net || !net.room || st.phase !== 'matchEnd' || net.role !== 'host') return;
    const room = net.room.name;
    if (__NET.reported.has(room + ':' + st.round)) return;
    __NET.reported.add(room + ':' + st.round);
    const byU = new Map();
    for (const p of net.room.peers()) p.presence && p.presence.u && p.presence.hu && byU.set(p.presence.u, p.presence.hu);
    const ffa = st.mode === 'ffa' || st.mode === 'gungame',
      top = [...st.players].sort((a, b) => b.kills - a.kills)[0],
      winTeam = st.score ? (st.score.CT > st.score.T ? 'CT' : st.score.T > st.score.CT ? 'T' : null) : null;
    const rows = st.players
      .filter((p) => !p.isBot && byU.has(p.id))
      .map((p) => ({ id: byU.get(p.id), k: p.kills | 0, d: p.deaths | 0, win: ffa ? p === top || p.id === st.winnerId : p.team === winTeam }));
    rows.length && __netSend({ t: 'result', room, rows });
  } catch {}
}, 1000);
// ------------------------------------------------------------------ names, modes, maps
const __netModeName = (m) => (typeof Eg < 'u' && Eg[m]) || m || '';
const __netMapName = (id) => {
  try {
    return (BD.find((b) => b.id === id) || {}).name || id || '';
  } catch {
    return id || '';
  }
};
const __netInvite = (x) => {
  const r = /^\[invite:([a-z0-9][a-z0-9_.-]{0,47})\]$/.exec(String(x || ''));
  return r ? r[1] : null;
};
// ------------------------------------------------------------------ joining and creating matches
async function __netOnline() {
  if (eA.online) return eA.online;
  try {
    JN ?? (JN = PG.connect({ u: Math.random().toString(36).slice(2, 8), name: gD(), look: Ng(FQ()), opts: qm() }));
    const x = await JN;
    x && ((eA.online = x), (x.onSplit = (g) => eA.goOnline(g)));
    return x;
  } catch {
    return null;
  }
}
async function __netEnter(lb) {
  const on = await __netOnline();
  if (!on) return __netToast('Not connected', 'Online play is unavailable right now', {}), !1;
  on.me.opts = qm();
  on.rename(gD(), Ng(FQ()));
  const g = await on.enter(lb);
  if (!g) return __netToast("Couldn't join", 'That match is full or has ended', {}), !1;
  __NET.ui && __NET.ui.hide();
  eA.goOnline(g);
  Zw.getState().setScreen('playing');
  rc();
  return !0;
}
async function __netCreate({ name, mode, map, priv }) {
  const on = await __netOnline();
  if (!on) return __netToast('Not connected', 'Online play is unavailable right now', {}), !1;
  on.me.opts = qm();
  on.rename(gD(), Ng(FQ()));
  const g = await on.create(mode, map);
  if (!g) return __netToast("Couldn't start the server", 'Try again in a moment', {}), !1;
  on.transport.lobby.presence({ sv: { lb: g.room.name, n: String(name || '').slice(0, 32) || `${gD()}'s server`, pv: priv ? 1 : 0 } });
  __NET.ui && __NET.ui.hide();
  eA.goOnline(g);
  Zw.getState().setScreen('playing');
  rc();
  return !0;
}
// ------------------------------------------------------------------ the public API (the Home screen uses it)
const __bpSocial = {
  connected: () => __NET.ready,
  network: () => (__NET.url ? (typeof location < 'u' && __NET.url.includes('//' + location.host + '/net') ? 'lan' : 'online') : 'off'),
  me() {
    const m = __NET.me;
    if (!m) return null;
    const r = __NET.lb && __NET.lb.rows.find((x) => x.id === m.id);
    return { id: m.id, name: m.name, rating: m.rating, rank: r ? r.rank : null, kd: m.d ? m.k / m.d : m.k, wins: m.w, matches: m.mt };
  },
  async leaderboard() {
    if (!(await __netWhenReady(4000))) return [];
    if (!__NET.lb || Date.now() - __NET.lb.at > 30000) {
      __netSend({ t: 'lb' });
      await new Promise((res) => {
        const f = (w) => w === 'lb' && (__NET.subs.delete(f), res());
        __NET.subs.add(f);
        setTimeout(() => (__NET.subs.delete(f), res()), 4000);
      });
    }
    return ((__NET.lb && __NET.lb.rows) || []).map((r) => ({ rank: r.rank, id: r.id, name: r.name, rating: r.rating, kd: r.d ? +(r.k / r.d).toFixed(2) : r.k, wins: r.w, matches: r.mt, look: r.look, online: r.online }));
  },
  async friends() {
    await __netWhenReady(4000);
    return __NET.friends.map((f) => ({ id: f.id, name: f.name, online: !!f.online, inGame: f.game ? { mode: f.game.m, map: f.game.mp, lb: f.game.lb } : null }));
  },
  onlineFriends: () => __NET.friends.filter((f) => f.online).length,
  unread: () => Object.values(__NET.unread).reduce((a, b) => a + b, 0),
  requests: () => __NET.reqs.length,
  addFriend: (id) => __netSend({ t: 'freq', to: String(id || '').trim().toLowerCase() }),
  accept: (id) => __netSend({ t: 'facc', id }),
  decline: (id) => __netSend({ t: 'fdec', id }),
  remove: (id) => __netSend({ t: 'fdel', id }),
  send: (to, text) => __netSend({ t: 'msg', to, text }),
  invite(to) {
    const net = eA.net;
    if (!net || !net.room) return __netToast('Not in a match', 'Start or join an online match first, then invite', {});
    __netSend({ t: 'msg', to, text: `[invite:${net.room.name}]` });
  },
  async join(friendId) {
    const f = __NET.friends.find((x) => x.id === friendId);
    if (!f || !f.game) return __netToast('Not in a match', `${f ? f.name : 'They'} isn't in a match right now`, {});
    return __netEnter(f.game.lb);
  },
  joinCode: (code) => __netEnter(String(code || '').trim()),
  createServer: (o) => __netCreate(o),
  servers() {
    const L = __netLobbyRoom().peers();
    return aBA(L).map((l) => ({ code: l.name, title: l.title || null, mode: l.mode, map: l.map, count: l.count, players: l.players, priv: !!l.priv }));
  },
  on(cb) {
    __NET.subs.add(cb);
    return () => __NET.subs.delete(cb);
  },
  openFriends: () => __netUI().show('friends'),
  openChat: (id) => __netUI().show('friends', id),
  openServers: () => __netUI().show('servers'),
  openLeaderboard: () => __netUI().show('leaderboard'),
};
typeof window < 'u' && ((window.__bpSocial = __bpSocial), (window.__bpNet = () => ({ url: __NET.url, ready: __NET.ready, id: __NET.id, peer: __NET.peer, lobby: __NET.lobby.size, rooms: [...__NET.rooms.keys()], links: [...__NET.rooms.values()].map((r) => r.name) })));
// connect early (the Home screen shows friends online and the leaderboard)
typeof window < 'u' && setTimeout(__netConnect, 1200);
// a new name or look reaches the hub
typeof window < 'u' &&
  Zw.subscribe((s, p) => {
    if (__NET.ready && s.profileRev !== p.profileRev) __netSend({ t: 'name', name: __netName(), look: __netLook() });
  });
// ------------------------------------------------------------------ toasts
function __netToast(title, body, o = {}) {
  if (typeof document > 'u') return;
  let host = document.getElementById('bp-net-toasts');
  host || ((host = document.createElement('div')), (host.id = 'bp-net-toasts'), document.body.appendChild(host));
  const el = document.createElement('div');
  el.className = 'bpn-toast';
  const esc = (x) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  el.innerHTML = `<i></i><div><b>${esc(title)}</b><span>${esc(body)}</span></div>${o.act ? `<button>${esc(o.act)}</button>` : ''}`;
  o.act && el.querySelector('button').addEventListener('click', () => (o.run && o.run(), el.remove()));
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => (el.classList.remove('in'), setTimeout(() => el.remove(), 400)), o.ms || 5500);
}
// ------------------------------------------------------------------ the panel: friends & chat, servers, leaderboard
function __netUI() {
  if (__NET.ui) return __NET.ui;
  const root = document.createElement('div');
  root.id = 'bp-net';
  root.innerHTML = `<div class="bpn-scrim"></div><section class="bpn-panel" role="dialog" aria-label="Social">
    <header class="bpn-head"><div class="bpn-tabs" role="tablist">
      <button data-tab="friends" role="tab">Friends<em class="bpn-n" data-n="friends"></em></button>
      <button data-tab="servers" role="tab">Servers</button>
      <button data-tab="leaderboard" role="tab">Leaderboard</button></div>
      <div class="bpn-net"></div><button class="bpn-x" aria-label="Close">✕</button></header>
    <div class="bpn-body"></div></section>`;
  document.body.appendChild(root);
  const body = root.querySelector('.bpn-body'),
    esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
    U = {
      visible: !1,
      tab: 'friends',
      chatWith: null,
      show(tab = 'friends', chat = null) {
        U.tab = tab;
        U.chatWith = chat;
        U.visible = !0;
        root.classList.add('on');
        try {
          document.pointerLockElement && document.exitPointerLock();
          eA.state && !eA.attract && Zw.getState().screen === 'playing' && !eA.net && Zw.getState().setPaused && Zw.getState().setPaused(!0);
        } catch {}
        __netConnect();
        tab === 'leaderboard' && __netSend({ t: 'lb' });
        chat && (__netSend({ t: 'hist', with: chat }), __netSend({ t: 'read', with: chat }), delete __NET.unread[chat]);
        render();
      },
      hide() {
        U.visible = !1;
        root.classList.remove('on');
      },
    };
  root.querySelector('.bpn-scrim').addEventListener('click', U.hide);
  root.querySelector('.bpn-x').addEventListener('click', U.hide);
  root.querySelector('.bpn-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    b && U.show(b.dataset.tab);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && U.visible) (e.stopPropagation(), U.hide());
  }, !0);
  const friendRow = (f) => {
    const st = f.game ? `<span class="bpn-ing">In ${esc(__netModeName(f.game.m))} · ${esc(__netMapName(f.game.mp))}</span>` : f.online ? '<span class="bpn-on">Online</span>' : '<span class="bpn-off">Offline</span>';
    const un = __NET.unread[f.id] ? `<em class="bpn-n">${__NET.unread[f.id]}</em>` : '';
    return `<div class="bpn-f ${f.online ? 'is-on' : ''}" data-id="${esc(f.id)}"><i class="bpn-dot"></i><div class="bpn-fn"><b>${esc(f.name)}</b>${st}</div>
      <div class="bpn-fa">${f.game ? `<button data-act="join">Join</button>` : ''}<button data-act="chat">Chat${un}</button><button data-act="del" title="Remove" class="bpn-ghost">✕</button></div></div>`;
  };
  function renderFriends() {
    const me = __NET.me,
      inMatch = eA.net && eA.net.room ? eA.net.room.peers().filter((p) => !p.isMe && p.presence && p.presence.hu && p.presence.hu !== __NET.id && !__NET.friends.some((f) => f.id === p.presence.hu)) : [];
    if (U.chatWith) {
      const f = __NET.friends.find((x) => x.id === U.chatWith) || { name: 'Friend', id: U.chatWith },
        msgs = __NET.chats.get(U.chatWith) || [];
      body.innerHTML = `<div class="bpn-chat"><div class="bpn-ch-head"><button class="bpn-ghost" data-act="back">‹ Friends</button><b>${esc(f.name)}</b>
        ${f.game ? `<button data-act="join" data-id="${esc(f.id)}">Join their match</button>` : ''}${eA.net ? `<button class="bpn-ghost" data-act="invite" data-id="${esc(f.id)}">Invite to my match</button>` : ''}</div>
        <div class="bpn-msgs">${msgs.map((m) => {
          const inv = __netInvite(m.x);
          return `<div class="bpn-m ${m.f === __NET.id ? 'mine' : ''}">${inv ? `<span>${m.f === __NET.id ? 'You sent an invite' : 'Invited you to their match'}</span>${m.f === __NET.id ? '' : `<button data-act="code" data-code="${esc(inv)}">Join</button>`}` : esc(m.x)}<time>${new Date(m.a).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>`;
        }).join('') || '<p class="bpn-empty">Say hello.</p>'}</div>
        <form class="bpn-send"><input maxlength="500" placeholder="Message ${esc(f.name)}" autocomplete="off"><button>Send</button></form></div>`;
      const box = body.querySelector('.bpn-msgs');
      box.scrollTop = box.scrollHeight;
      body.querySelector('.bpn-send').addEventListener('submit', (e) => {
        e.preventDefault();
        const i = e.target.querySelector('input');
        i.value.trim() && __bpSocial.send(U.chatWith, i.value);
        i.value = '';
      });
      setTimeout(() => body.querySelector('.bpn-send input')?.focus(), 30);
      return;
    }
    body.innerHTML = `<div class="bpn-cols"><div>
      <div class="bpn-card bpn-me"><span>Your player ID</span><b>${esc(me ? me.id : '…')}</b><button class="bpn-ghost" data-act="copyid">Copy</button><small>Share it so friends can add you.</small></div>
      <form class="bpn-add"><input placeholder="Add a friend by player ID" maxlength="24" autocomplete="off"><button>Add</button></form>
      ${__NET.reqs.length ? `<h4>Requests</h4>${__NET.reqs.map((r) => `<div class="bpn-f" data-id="${esc(r.id)}"><i class="bpn-dot"></i><div class="bpn-fn"><b>${esc(r.name)}</b><span>wants to be friends</span></div><div class="bpn-fa"><button data-act="acc">Accept</button><button class="bpn-ghost" data-act="dec">Decline</button></div></div>`).join('')}` : ''}
      ${inMatch.length ? `<h4>In this match</h4>${inMatch.map((p) => `<div class="bpn-f" data-id="${esc(p.presence.hu)}"><i class="bpn-dot"></i><div class="bpn-fn"><b>${esc(p.presence.hn || 'Player')}</b><span>Playing now</span></div><div class="bpn-fa"><button data-act="add">Add friend</button></div></div>`).join('')}` : ''}
      </div><div><h4>Friends <small>${__NET.friends.filter((f) => f.online).length} online</small></h4>
      ${[...__NET.friends].sort((a, b) => (b.game ? 2 : b.online ? 1 : 0) - (a.game ? 2 : a.online ? 1 : 0) || a.name.localeCompare(b.name)).map(friendRow).join('') || '<p class="bpn-empty">No friends yet. Add someone by their player ID, or from a match or the leaderboard.</p>'}</div></div>`;
    body.querySelector('.bpn-add').addEventListener('submit', (e) => {
      e.preventDefault();
      const i = e.target.querySelector('input');
      i.value.trim() && __bpSocial.addFriend(i.value);
      i.value = '';
    });
  }
  function renderServers() {
    const list = __bpSocial.servers().filter((s) => !s.priv),
      modes = (typeof CN < 'u' ? CN : ['tdm', 'ffa', 'bomb']).filter((m) => m !== 'theater'),
      maps = typeof BD < 'u' ? BD : [];
    body.innerHTML = `<div class="bpn-cols"><div>
      <h4>Online servers <small>${list.length}</small></h4>
      ${list.map((s) => `<div class="bpn-sv"><div><b>${esc(s.title || `${__netModeName(s.mode)} · ${__netMapName(s.map)}`)}</b><span>${esc(__netModeName(s.mode))} · ${esc(__netMapName(s.map))} · ${s.count} playing</span></div><button data-act="code" data-code="${esc(s.code)}">Join</button></div>`).join('') || '<p class="bpn-empty">No servers running right now. Start one: your friends can join it from here.</p>'}
      <form class="bpn-add bpn-code"><input placeholder="Join a private server by code" maxlength="48" autocomplete="off"><button>Join</button></form>
      </div><div class="bpn-card bpn-create"><h4>Start a server</h4>
      <label>Name<input name="n" maxlength="32" value="${esc(__netName())}'s server"></label>
      <label>Mode<select name="m">${modes.map((m) => `<option value="${m}">${esc(__netModeName(m))}</option>`).join('')}</select></label>
      <label>Map<select name="mp">${maps.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>
      <label class="bpn-chk"><input type="checkbox" name="pv"> Private (join by code or invite)</label>
      <button data-act="create">Start server</button>
      <small>Your browser hosts the match; everyone else plays with you directly.${__bpSocial.network() === 'lan' ? ' On this network (LAN): players open this machine’s address.' : ''}</small></div></div>`;
    body.querySelector('.bpn-code').addEventListener('submit', (e) => {
      e.preventDefault();
      const i = e.target.querySelector('input');
      i.value.trim() && __bpSocial.joinCode(i.value);
    });
  }
  async function renderLeaderboard() {
    const rows = (__NET.lb && __NET.lb.rows) || [],
      me = __NET.me;
    body.innerHTML = `<div class="bpn-lb"><div class="bpn-lb-head"><span>#</span><span>Player</span><span>Rating</span><span>K/D</span><span>Wins</span><span></span></div>
      ${rows.map((r) => `<div class="bpn-lb-row ${me && r.id === me.id ? 'mine' : ''} ${r.rank <= 3 ? 'top' + r.rank : ''}" data-id="${esc(r.id)}"><span>${r.rank}</span><span><i class="bpn-dot ${r.online ? 'on' : ''}"></i>${esc(r.name)}</span><span>${r.rating}</span><span>${r.d ? (r.k / r.d).toFixed(2) : r.k}</span><span>${r.w}</span><span>${me && r.id !== me.id && !__NET.friends.some((f) => f.id === r.id) ? '<button class="bpn-ghost" data-act="add">Add</button>' : ''}</span></div>`).join('') || '<p class="bpn-empty">No ranked players yet. Finish an online match to get on the board.</p>'}
      ${me && !rows.some((r) => r.id === me.id) ? `<div class="bpn-lb-row mine"><span>–</span><span>${esc(me.name)} (you)</span><span>${me.rating}</span><span>${me.d ? (me.k / me.d).toFixed(2) : me.k}</span><span>${me.w}</span><span></span></div>` : ''}</div>`;
  }
  function render() {
    if (!U.visible) return;
    for (const b of root.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === U.tab));
    const n = __bpSocial.requests() + __bpSocial.unread();
    root.querySelector('[data-n="friends"]').textContent = n ? String(n) : '';
    const net = __bpSocial.network();
    const canLan = typeof location < 'u' && /^(5173|4173)$/.test(location.port),
      canOnline = !!(typeof __BAYOU_NET__ < 'u' && __BAYOU_NET__);
    root.querySelector('.bpn-net').innerHTML =
      (__NET.ready ? `<i class="bpn-dot on"></i>${net === 'lan' ? 'LAN · this network' : 'Online'}` : __NET.url ? '<i class="bpn-dot"></i>Connecting…' : '<i class="bpn-dot"></i>Online play is not set up') +
      (canLan && canOnline ? `<button class="bpn-ghost bpn-switch" data-act="netmode">${net === 'lan' ? 'Go online' : 'Use LAN'}</button>` : '');
    if (!__NET.url) return void (body.innerHTML = '<p class="bpn-empty">Online play needs the Bayou hub. See docs/online.md.</p>');
    U.tab === 'servers' ? renderServers() : U.tab === 'leaderboard' ? renderLeaderboard() : renderFriends();
  }
  // the network switch (in the header): reconnect to the other hub
  root.querySelector('.bpn-net').addEventListener('click', (e) => {
    if (!e.target.closest('[data-act="netmode"]')) return;
    try {
      localStorage.setItem('bp-net-mode', __bpSocial.network() === 'lan' ? 'auto' : 'lan');
    } catch {}
    __netReconnect();
    setTimeout(render, 50);
  });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const row = b.closest('[data-id]'),
      id = (row && row.dataset.id) || b.dataset.id;
    switch (b.dataset.act) {
      case 'chat':
        return U.show('friends', id);
      case 'back':
        return U.show('friends');
      case 'join':
        return __bpSocial.join(id);
      case 'invite':
        return __bpSocial.invite(id), __netToast('Invite sent', '', {});
      case 'del':
        return confirm('Remove this friend?') && __bpSocial.remove(id);
      case 'acc':
        return __bpSocial.accept(id);
      case 'dec':
        return __bpSocial.decline(id);
      case 'add':
        return __bpSocial.addFriend(id);
      case 'code':
        return __bpSocial.joinCode(b.dataset.code);
      case 'copyid':
        return navigator.clipboard && navigator.clipboard.writeText(__NET.id || '').then(() => __netToast('Copied', 'Your player ID is on the clipboard', {}));
      case 'create': {
        const f = b.closest('.bpn-create');
        return __bpSocial.createServer({ name: f.querySelector('[name=n]').value, mode: f.querySelector('[name=m]').value, map: f.querySelector('[name=mp]').value, priv: f.querySelector('[name=pv]').checked });
      }
    }
  });
  __bpSocial.on((w) => {
    if (!U.visible) return;
    // (don't rebuild the chat input while typing: only when something new arrives)
    if (U.chatWith && w !== 'chat' && w !== 'friends') return;
    if (U.tab === 'servers' && w === 'lobby' && body.contains(document.activeElement) && document.activeElement.tagName !== 'BUTTON') return;
    render();
  });
  return (__NET.ui = U);
}
// F2: friends & chat, anywhere (in a match too)
typeof document < 'u' &&
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'F2' || e.repeat) return;
    e.preventDefault();
    const U = __netUI();
    U.visible ? U.hide() : U.show('friends');
  });
if (typeof document < 'u') {
  const st = document.createElement('style');
  st.textContent = `
#bp-net{position:fixed;inset:0;z-index:80;pointer-events:none;font-family:Barlow,"Inter",sans-serif;color:#efe7d6}
#bp-net.on{pointer-events:auto}
.bpn-scrim{position:absolute;inset:0;background:radial-gradient(ellipse at 70% 40%,rgba(30,40,80,.35),rgba(4,6,12,.72));backdrop-filter:blur(6px);opacity:0;transition:opacity .3s}
#bp-net.on .bpn-scrim{opacity:1}
.bpn-panel{position:absolute;right:max(16px,3vw);top:50%;width:min(860px,94vw);max-height:min(760px,90vh);display:flex;flex-direction:column;transform:translate(24px,-50%);opacity:0;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .3s;
  background:linear-gradient(160deg,rgba(22,26,44,.92),rgba(10,12,22,.94));border:1px solid rgba(160,180,255,.18);border-radius:22px;box-shadow:0 30px 80px -20px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.06);overflow:hidden}
#bp-net.on .bpn-panel{transform:translate(0,-50%);opacity:1}
.bpn-head{display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.06)}
.bpn-tabs{display:flex;gap:4px;background:rgba(255,255,255,.04);border-radius:999px;padding:4px}
.bpn-tabs button{border:0;background:transparent;color:#a9b1c9;font:600 13px/1 Barlow,sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:9px 16px;border-radius:999px;cursor:pointer;transition:background .2s,color .2s}
.bpn-tabs button[aria-selected=true]{background:linear-gradient(180deg,#9fb6ff,#6f8bf0);color:#0b0f1d}
.bpn-net{margin-left:auto;font-size:12px;letter-spacing:.08em;color:#9aa3bd;display:flex;align-items:center;gap:8px}
.bpn-switch{margin-left:6px;padding:6px 10px!important;font-size:10px!important}
.bpn-x{border:0;background:rgba(255,255,255,.06);color:#cfd6ea;width:34px;height:34px;border-radius:50%;cursor:pointer}
.bpn-body{overflow:auto;padding:18px}
.bpn-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:18px}
@media (max-width:760px){.bpn-cols{grid-template-columns:1fr}.bpn-panel{right:3vw;top:auto;bottom:3vh;transform:translate(0,24px);max-height:86vh}#bp-net.on .bpn-panel{transform:none}}
.bpn-body h4{margin:16px 0 8px;font:700 12px/1 Barlow,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#d8b16a}
.bpn-body h4 small{color:#8f97ad;letter-spacing:.06em;margin-left:6px}
.bpn-card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px}
.bpn-me{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center}
.bpn-me span{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8f97ad}
.bpn-me b{grid-column:1;font:700 20px/1.1 "JetBrains Mono",monospace;letter-spacing:.06em;color:#fff}
.bpn-me button{grid-row:1/3;grid-column:2}
.bpn-me small{grid-column:1/3;color:#8f97ad}
.bpn-add{display:flex;gap:8px;margin-top:12px}
.bpn-add input,.bpn-send input,.bpn-create input,.bpn-create select{flex:1;min-width:0;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;padding:10px 12px;font:500 14px Barlow,sans-serif;outline:none}
.bpn-add input:focus,.bpn-send input:focus,.bpn-create input:focus{border-color:#9fb6ff;box-shadow:0 0 0 3px rgba(111,139,240,.25)}
#bp-net button:not(.bpn-x):not([data-tab]){border:0;border-radius:10px;padding:9px 14px;font:700 12px/1 Barlow,sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;background:linear-gradient(180deg,#e8c77d,#b88f43);color:#1a1205;transition:transform .15s,filter .15s}
#bp-net button:not(.bpn-x):not([data-tab]):hover{transform:translateY(-1px);filter:brightness(1.08)}
#bp-net button.bpn-ghost{background:rgba(255,255,255,.07);color:#d6dcef}
.bpn-f,.bpn-sv{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;transition:background .2s}
.bpn-f:hover,.bpn-sv:hover{background:rgba(255,255,255,.04)}
.bpn-fn,.bpn-sv>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.bpn-fn b,.bpn-sv b{font-weight:700;font-size:15px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bpn-fn span,.bpn-sv span{font-size:12px;color:#8f97ad}
.bpn-fn .bpn-on{color:#7fe3a0}.bpn-fn .bpn-ing{color:#9fb6ff}
.bpn-fa{display:flex;gap:6px}
.bpn-dot{width:9px;height:9px;border-radius:50%;background:#4a5068;flex:none;display:inline-block}
.bpn-f.is-on .bpn-dot,.bpn-dot.on{background:#5be08b;box-shadow:0 0 10px #5be08b}
.bpn-n{display:inline-grid;place-items:center;min-width:18px;height:18px;margin-left:6px;border-radius:9px;background:#ff4d6d;color:#fff;font:700 11px/1 Barlow;font-style:normal;padding:0 5px}
.bpn-n:empty{display:none}
.bpn-empty{color:#8f97ad;font-size:14px;line-height:1.5}
.bpn-chat{display:flex;flex-direction:column;height:min(560px,62vh)}
.bpn-ch-head{display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}
.bpn-ch-head b{flex:1;font-size:17px}
.bpn-msgs{flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:14px 2px}
.bpn-m{align-self:flex-start;max-width:75%;background:rgba(255,255,255,.06);border-radius:14px 14px 14px 4px;padding:9px 12px;font-size:14px;line-height:1.4;display:flex;flex-direction:column;gap:6px}
.bpn-m.mine{align-self:flex-end;background:linear-gradient(180deg,rgba(111,139,240,.4),rgba(80,100,200,.35));border-radius:14px 14px 4px 14px}
.bpn-m time{font-size:10px;color:#9aa3bd;align-self:flex-end}
.bpn-send{display:flex;gap:8px;padding-top:10px}
.bpn-create{display:flex;flex-direction:column;gap:10px}
.bpn-create label{display:flex;flex-direction:column;gap:6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8f97ad}
.bpn-create .bpn-chk{flex-direction:row;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-size:13px;color:#cfd6ea}
.bpn-create small{color:#8f97ad;line-height:1.4}
.bpn-lb-head,.bpn-lb-row{display:grid;grid-template-columns:44px 1fr 80px 64px 64px 70px;align-items:center;gap:8px;padding:10px 12px}
.bpn-lb-head{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8f97ad}
.bpn-lb-row{border-radius:12px;font-variant-numeric:tabular-nums}
.bpn-lb-row:nth-child(even){background:rgba(255,255,255,.025)}
.bpn-lb-row span:nth-child(2){display:flex;align-items:center;gap:8px;font-weight:700;color:#fff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.bpn-lb-row.top1 span:first-child{color:#f3cf73}.bpn-lb-row.top2 span:first-child{color:#cfd6ea}.bpn-lb-row.top3 span:first-child{color:#d39a62}
.bpn-lb-row.mine{outline:1px solid rgba(159,182,255,.5);background:rgba(111,139,240,.12)}
#bp-net-toasts{position:fixed;right:18px;bottom:18px;z-index:90;display:flex;flex-direction:column;gap:10px;pointer-events:none}
.bpn-toast{pointer-events:auto;display:flex;align-items:center;gap:12px;min-width:260px;max-width:360px;padding:12px 14px;border-radius:14px;background:linear-gradient(160deg,rgba(24,28,48,.95),rgba(12,14,26,.95));border:1px solid rgba(160,180,255,.2);box-shadow:0 18px 40px -12px rgba(0,0,0,.6);color:#efe7d6;font-family:Barlow,sans-serif;transform:translateX(30px);opacity:0;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .3s}
.bpn-toast.in{transform:none;opacity:1}
.bpn-toast i{width:8px;height:36px;border-radius:4px;background:linear-gradient(180deg,#9fb6ff,#d8b16a)}
.bpn-toast div{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.bpn-toast b{font-size:14px}.bpn-toast span{font-size:12px;color:#9aa3bd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpn-toast button{border:0;border-radius:9px;padding:8px 12px;background:linear-gradient(180deg,#e8c77d,#b88f43);color:#1a1205;font:700 11px/1 Barlow;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}`;
  document.head.appendChild(st);
}
