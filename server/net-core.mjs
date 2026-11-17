// Bayou Protocol's online hub: shared by the Cloudflare Worker (server/net-worker.mjs: a Durable Object, for
// online play) and the dev/preview server (vite.config.js: /net, for LAN parties and local testing).
//
// What it does (over one WebSocket per player tab, JSON messages):
//   - accounts without passwords: a player id and a secret token made on first visit, kept in the browser
//   - the lobby: every player's lobby presence (name, which match they're in), so the game's own server list works
//   - matchmaking signals: who is in which match room, and the WebRTC offers/answers/ICE between them; the
//     matches themselves run peer to peer (browser to browser). A pair whose direct link fails can relay
//     through here (throttled)
//   - friends: requests, accept, remove; who of your friends is online and which match they're in (to join it)
//   - chat: direct messages between friends, delivered at once if they're online, kept (last 200) if not
//   - the leaderboard: each match's host reports the results; ratings, K/D, wins; top players on request
//
// `store` is a small async key-value store: { get(k), put(k, v), delete(k), list(prefix) -> [[k, v], ...] }.
// Durable Object storage and the dev server's JSON file both fit it.

const MAX_MSG = 96 * 1024;
const NAME_RE = /[^\p{L}\p{N} _.\-'!?]/gu;
const ID_RE = /^[a-z0-9]{6,24}$/;
const ROOM_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/;

const rnd = (n) => {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map((b) => (b % 36).toString(36)).join('');
};
async function hash(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bayou-net:' + s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const cleanName = (v) => String(v ?? '').replace(NAME_RE, '').trim().slice(0, 20) || 'Player';
const cleanText = (v) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, 500);
const pairKey = (a, b) => 'm:' + (a < b ? a + '|' + b : b + '|' + a);
const asList = (v) => (Array.isArray(v) ? v : []);

export class NetHub {
  constructor(store, opts = {}) {
    this.store = store;
    this.ice = opts.ice || (async () => [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]);
    this.conns = new Map(); // peer -> conn
    this.rooms = new Map(); // room -> Map(peer -> joinedAt)
    this.byUser = new Map(); // uid -> Set(peer)
    this.lb = null; // the leaderboard, cached
  }
  // ------------------------------------------------------------------ connections
  open(sock) {
    let peer = rnd(10);
    while (this.conns.has(peer)) peer = rnd(10);
    const c = { peer, sock, uid: null, user: null, lp: {}, rooms: new Set(), budget: 240, at: Date.now(), relayAt: new Map() };
    this.conns.set(peer, c);
    return c;
  }
  send(c, m) {
    try {
      c.sock.send(JSON.stringify(m));
    } catch {}
  }
  toUser(uid, m) {
    for (const p of this.byUser.get(uid) || []) {
      const c = this.conns.get(p);
      c && this.send(c, m);
    }
  }
  async close(c) {
    if (!this.conns.has(c.peer)) return;
    this.conns.delete(c.peer);
    for (const r of c.rooms) this.leaveRoom(c, r);
    if (c.uid) {
      const s = this.byUser.get(c.uid);
      s && (s.delete(c.peer), s.size || this.byUser.delete(c.uid));
      this.broadcast({ t: 'lp', peer: c.peer, gone: 1 }, c);
      if (!this.byUser.has(c.uid)) {
        const u = await this.store.get('u:' + c.uid);
        u && ((u.seen = Date.now()), await this.store.put('u:' + c.uid, u));
      }
      await this.friendsPresence(c.uid);
    }
  }
  broadcast(m, except) {
    const s = JSON.stringify(m);
    for (const c of this.conns.values())
      if (c !== except && c.uid)
        try {
          c.sock.send(s);
        } catch {}
  }
  // ------------------------------------------------------------------ messages
  async message(c, raw) {
    // a simple budget: about 120 messages a second sustained (matches don't come through here)
    const t0 = Date.now();
    c.budget = Math.min(240, c.budget + ((t0 - c.at) / 1000) * 120);
    c.at = t0;
    if (--c.budget < 0) return;
    if (typeof raw !== 'string' || raw.length > MAX_MSG) return;
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hi') return this.hello(c, m);
    if (!c.uid) return;
    switch (m.t) {
      case 'lp':
        return this.lobbyPresence(c, m.p);
      case 'join':
        return this.joinRoom(c, m.room);
      case 'leave':
        return this.leaveRoom(c, m.room);
      case 'sig':
        return this.signal(c, m);
      case 'rp':
        return this.relay(c, m);
      case 'name':
        return this.rename(c, m);
      case 'freq':
        return this.friendRequest(c, m.to);
      case 'facc':
        return this.friendAccept(c, m.id);
      case 'fdec':
        return this.friendDecline(c, m.id);
      case 'fdel':
        return this.friendRemove(c, m.id);
      case 'msg':
        return this.chat(c, m.to, m.text);
      case 'hist':
        return this.history(c, m.with);
      case 'read':
        return this.markRead(c, m.with);
      case 'lb':
        return this.send(c, { t: 'lb', rows: await this.leaderboard() });
      case 'prof':
        return this.send(c, { t: 'prof', p: await this.profile(m.id) });
      case 'result':
        return this.result(c, m);
      case 'ping':
        return this.send(c, { t: 'pong', at: m.at });
    }
  }
  // ------------------------------------------------------------------ accounts
  async hello(c, m) {
    if (c.uid) return;
    let u = null;
    if (ID_RE.test(String(m.id || '')) && typeof m.tok === 'string') {
      const got = await this.store.get('u:' + m.id);
      got && got.th === (await hash(m.tok)) && (u = got);
    }
    let tok = null;
    if (!u) {
      let id = rnd(12);
      while (await this.store.get('u:' + id)) id = rnd(12);
      tok = rnd(32);
      u = { id, th: await hash(tok), name: cleanName(m.name), look: m.look ?? null, rating: 1000, k: 0, d: 0, w: 0, l: 0, mt: 0, created: Date.now() };
    }
    m.name && (u.name = cleanName(m.name));
    m.look !== undefined && (u.look = typeof m.look === 'string' ? m.look.slice(0, 400) : null);
    u.seen = Date.now();
    await this.store.put('u:' + u.id, u);
    c.uid = u.id;
    let s = this.byUser.get(u.id);
    s || this.byUser.set(u.id, (s = new Set()));
    s.add(c.peer);
    this.send(c, {
      t: 'hi',
      peer: c.peer,
      id: u.id,
      ...(tok ? { tok } : {}),
      me: this.publicUser(u),
      lobby: [...this.conns.values()].filter((o) => o.uid && o !== c).map((o) => ({ peer: o.peer, p: o.lp })),
      friends: await this.friendList(u.id),
      reqs: await this.requestList(u.id),
      unread: (await this.store.get('un:' + u.id)) || {},
      ice: await this.ice(),
    });
    await this.friendsPresence(u.id);
  }
  publicUser(u) {
    return { id: u.id, name: u.name, look: u.look ?? null, rating: Math.round(u.rating), k: u.k, d: u.d, w: u.w, l: u.l, mt: u.mt };
  }
  async rename(c, m) {
    const u = await this.store.get('u:' + c.uid);
    if (!u) return;
    m.name && (u.name = cleanName(m.name));
    m.look !== undefined && (u.look = typeof m.look === 'string' ? m.look.slice(0, 400) : null);
    await this.store.put('u:' + u.id, u);
    this.lb = null;
    await this.friendsPresence(u.id);
  }
  async profile(id) {
    if (!ID_RE.test(String(id || ''))) return null;
    const u = await this.store.get('u:' + id);
    if (!u) return null;
    const rows = await this.leaderboard();
    const r = rows.find((x) => x.id === id);
    return { ...this.publicUser(u), rank: r ? r.rank : null, online: this.byUser.has(id), game: this.gameOf(id) };
  }
  // ------------------------------------------------------------------ the lobby
  lobbyPresence(c, p) {
    if (!p || typeof p !== 'object') return;
    const before = JSON.stringify(c.lp.mm ?? null);
    for (const [k, v] of Object.entries(p)) {
      if (k.length > 16) continue;
      v === null ? delete c.lp[k] : (c.lp[k] = v);
    }
    if (JSON.stringify(c.lp).length > 4096) c.lp = {};
    this.broadcast({ t: 'lp', peer: c.peer, p }, c);
    JSON.stringify(c.lp.mm ?? null) !== before && this.friendsPresence(c.uid);
  }
  gameOf(uid) {
    for (const p of this.byUser.get(uid) || []) {
      const mm = this.conns.get(p)?.lp?.mm;
      if (mm && typeof mm.lb === 'string') return { lb: mm.lb, m: mm.m, mp: mm.mp, sv: this.conns.get(p).lp.sv ?? null };
    }
    return null;
  }
  // ------------------------------------------------------------------ match rooms (WebRTC signalling)
  joinRoom(c, room) {
    if (!ROOM_RE.test(String(room || '')) || c.rooms.has(room) || c.rooms.size > 4) return;
    let r = this.rooms.get(room);
    r || this.rooms.set(room, (r = new Map()));
    const peers = [...r].map(([peer, j]) => ({ peer, j, uid: this.conns.get(peer)?.uid ?? null }));
    const j = Date.now();
    r.set(c.peer, j);
    c.rooms.add(room);
    this.send(c, { t: 'joined', room, j, peers });
    for (const p of r.keys()) p !== c.peer && this.send(this.conns.get(p), { t: 'pj', room, peer: c.peer, j, uid: c.uid });
  }
  leaveRoom(c, room) {
    const r = this.rooms.get(room);
    c.rooms.delete(room);
    if (!r || !r.has(c.peer)) return;
    r.delete(c.peer);
    for (const p of r.keys()) this.send(this.conns.get(p), { t: 'pl', room, peer: c.peer });
    r.size || this.rooms.delete(room);
  }
  signal(c, m) {
    const r = this.rooms.get(m.room);
    if (!r || !r.has(c.peer) || !r.has(m.to)) return;
    const o = this.conns.get(m.to);
    o && this.send(o, { t: 'sig', room: m.room, from: c.peer, d: m.d });
  }
  // a pair that couldn't connect directly: their room presence goes through here, at most 20 a second each way
  relay(c, m) {
    const r = this.rooms.get(m.room);
    if (!r || !r.has(c.peer) || !r.has(m.to)) return;
    const key = m.to,
      t = Date.now();
    if (t - (c.relayAt.get(key) || 0) < 45) return;
    c.relayAt.set(key, t);
    const o = this.conns.get(m.to);
    o && this.send(o, { t: 'rp', room: m.room, from: c.peer, x: m.x });
  }
  // ------------------------------------------------------------------ friends
  async friendList(uid) {
    const ids = asList(await this.store.get('f:' + uid));
    const out = [];
    for (const id of ids) {
      const u = await this.store.get('u:' + id);
      u && out.push({ ...this.publicUser(u), online: this.byUser.has(id), game: this.gameOf(id), seen: u.seen || 0 });
    }
    return out;
  }
  async requestList(uid) {
    const ids = asList(await this.store.get('fr:' + uid));
    const out = [];
    for (const id of ids) {
      const u = await this.store.get('u:' + id);
      u && out.push(this.publicUser(u));
    }
    return out;
  }
  async friendsPresence(uid) {
    if (!uid) return;
    const ids = asList(await this.store.get('f:' + uid));
    if (!ids.length) return;
    const msg = { t: 'fp', id: uid, online: this.byUser.has(uid), game: this.gameOf(uid) };
    for (const id of ids) this.toUser(id, msg);
  }
  async friendRequest(c, to) {
    if (!ID_RE.test(String(to || '')) || to === c.uid) return;
    const them = await this.store.get('u:' + to);
    if (!them) return this.send(c, { t: 'err', what: 'freq', msg: 'No player with that id.' });
    const mine = asList(await this.store.get('f:' + c.uid));
    if (mine.includes(to)) return this.send(c, { t: 'err', what: 'freq', msg: 'Already friends.' });
    // they already asked me: that's a yes
    const myReqs = asList(await this.store.get('fr:' + c.uid));
    if (myReqs.includes(to)) return this.friendAccept(c, to);
    const theirs = asList(await this.store.get('fr:' + to));
    if (theirs.includes(c.uid)) return this.send(c, { t: 'ok', what: 'freq', to });
    if (theirs.length > 100) return;
    theirs.push(c.uid);
    await this.store.put('fr:' + to, theirs);
    const me = await this.store.get('u:' + c.uid);
    this.toUser(to, { t: 'freq', from: this.publicUser(me) });
    this.send(c, { t: 'ok', what: 'freq', to });
  }
  async friendAccept(c, id) {
    const reqs = asList(await this.store.get('fr:' + c.uid));
    if (!reqs.includes(id)) return;
    await this.store.put('fr:' + c.uid, reqs.filter((x) => x !== id));
    for (const [a, b] of [[c.uid, id], [id, c.uid]]) {
      const f = asList(await this.store.get('f:' + a));
      f.includes(b) || f.length > 300 || (f.push(b), await this.store.put('f:' + a, f));
    }
    this.send(c, { t: 'friends', list: await this.friendList(c.uid), reqs: await this.requestList(c.uid) });
    this.toUser(id, { t: 'friends', list: await this.friendList(id), reqs: await this.requestList(id) });
  }
  async friendDecline(c, id) {
    const reqs = asList(await this.store.get('fr:' + c.uid));
    await this.store.put('fr:' + c.uid, reqs.filter((x) => x !== id));
    this.send(c, { t: 'friends', list: await this.friendList(c.uid), reqs: await this.requestList(c.uid) });
  }
  async friendRemove(c, id) {
    for (const [a, b] of [[c.uid, id], [id, c.uid]]) {
      const f = asList(await this.store.get('f:' + a));
      f.includes(b) && (await this.store.put('f:' + a, f.filter((x) => x !== b)));
    }
    this.send(c, { t: 'friends', list: await this.friendList(c.uid), reqs: await this.requestList(c.uid) });
    this.toUser(id, { t: 'friends', list: await this.friendList(id), reqs: await this.requestList(id) });
  }
  // ------------------------------------------------------------------ chat
  async chat(c, to, text) {
    const x = cleanText(text);
    if (!x || !ID_RE.test(String(to || ''))) return;
    const f = asList(await this.store.get('f:' + c.uid));
    if (!f.includes(to)) return this.send(c, { t: 'err', what: 'msg', msg: 'You can only message friends.' });
    const key = pairKey(c.uid, to),
      list = asList(await this.store.get(key)),
      msg = { f: c.uid, x, a: Date.now() };
    list.push(msg);
    await this.store.put(key, list.slice(-200));
    const un = (await this.store.get('un:' + to)) || {};
    un[c.uid] = (un[c.uid] || 0) + 1;
    await this.store.put('un:' + to, un);
    this.toUser(to, { t: 'msg', with: c.uid, m: msg });
    this.toUser(c.uid, { t: 'msg', with: to, m: msg });
  }
  async history(c, id) {
    if (!ID_RE.test(String(id || ''))) return;
    this.send(c, { t: 'hist', with: id, msgs: asList(await this.store.get(pairKey(c.uid, id))).slice(-100) });
  }
  async markRead(c, id) {
    const un = (await this.store.get('un:' + c.uid)) || {};
    if (un[id]) delete un[id], await this.store.put('un:' + c.uid, un);
  }
  // ------------------------------------------------------------------ the leaderboard
  // A match's host (the room's earliest joiner) reports each player's kills, deaths and whether their side won;
  // only players who are in that room right now count, and each player once per room.
  async result(c, m) {
    const r = this.rooms.get(m.room);
    if (!r || !r.has(c.peer)) return;
    const host = [...r].sort((a, b) => a[1] - b[1])[0];
    if (!host || host[0] !== c.peer) return;
    const inRoom = new Set([...r.keys()].map((p) => this.conns.get(p)?.uid).filter(Boolean));
    const doneKey = 'rr:' + m.room;
    const done = asList(await this.store.get(doneKey));
    for (const row of asList(m.rows).slice(0, 64)) {
      if (!row || !inRoom.has(row.id) || done.includes(row.id)) continue;
      const u = await this.store.get('u:' + row.id);
      if (!u) continue;
      const k = Math.max(0, Math.min(200, row.k | 0)),
        d = Math.max(0, Math.min(200, row.d | 0)),
        win = !!row.win;
      u.k += k;
      u.d += d;
      u.mt += 1;
      win ? (u.w += 1) : (u.l += 1);
      // rating: a win or loss, and how you played (kills over deaths), with smaller steps as you play more
      const step = u.mt < 10 ? 1.6 : 1;
      u.rating = Math.max(0, u.rating + step * ((win ? 22 : -14) + Math.max(-12, Math.min(18, (k - d) * 1.5))));
      await this.store.put('u:' + u.id, u);
      done.push(row.id);
      this.toUser(u.id, { t: 'me', me: this.publicUser(u) });
    }
    await this.store.put(doneKey, done.slice(-128));
    this.lb = null;
  }
  async leaderboard() {
    if (this.lb && Date.now() - this.lb.at < 30000) return this.lb.rows;
    const all = (await this.store.list('u:')).map(([, u]) => u).filter((u) => u && u.mt >= 1);
    all.sort((a, b) => b.rating - a.rating || b.w - a.w);
    const rows = all.slice(0, 100).map((u, i) => ({ rank: i + 1, ...this.publicUser(u), online: this.byUser.has(u.id) }));
    this.lb = { at: Date.now(), rows };
    return rows;
  }
}

// a JSON-file store for the dev server (LAN parties): everything in memory, written to disk a moment after a change
export function fileStore(fs, path) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {}
  let t = null;
  const save = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      try {
        fs.mkdirSync(path.replace(/\/[^/]+$/, ''), { recursive: !0 });
        fs.writeFileSync(path, JSON.stringify(data));
      } catch {}
    }, 400);
  };
  return {
    async get(k) {
      return data[k];
    },
    async put(k, v) {
      data[k] = v;
      save();
    },
    async delete(k) {
      delete data[k];
      save();
    },
    async list(prefix) {
      return Object.entries(data).filter(([k]) => k.startsWith(prefix));
    },
  };
}
