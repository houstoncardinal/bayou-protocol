/* ===== Bayou Protocol mod: match pacing, spawn safety, adaptive bots, objective modes ===== */
// This file has three parts:
//   1. a measuring probe (dev only: it records nothing unless asked to, window.__bpPace)
//   2. the pacing fixes, each explained where it is made
//   3. the objective modes (Domination, Tag Hunt, Hot Zone, Gun Ladder) brought back into the menus
//
// ---------------------------------------------------------------- 1. the probe
// What it measures, per life of every player (bots included, the human separately):
//   - seconds from spawning to first contact (an enemy within 90 m with a clear line between the two)
//   - seconds from spawning to the first damage dealt or taken
//   - spawn kills: deaths within 3 s of spawning
//   - time to kill: from the killer's first hit on the victim in that life to the death
//   - bot accuracy: hitscan shots fired by bots that hit someone, out of all they fired
//   - stuck: a bot with a route that has moved less than 0.4 m in 2 s outside a fight
//   - walking into walls: a bot pushing its move keys at a wall (moving under 0.4 m/s) outside a fight
//   - idle: a bot outside a fight that has moved less than 1.5 m in 5 s
//   - match length to the score limit
// window.__bpPace.start() begins a recording, window.__bpPace.report() summarises it.
// window.__bpPace.sim(opts) runs a whole offline match faster than real time, without drawing it (for
// measuring); window.__bpPace.auto = true lets the bot brain play the human player.
const __PACE = { rec: null, auto: !1, fix: !0, cur: null, autoDiff: null, adaptOff: !1 };
function __paceLife(w, p) {
  const L = { id: p.id, bot: !!p.isBot, human: p.id === w.humanId, spawn: w.t, contact: null, engage: null, death: null, killer: null, ttk: null, hits: {} };
  p.__paceL = L;
  __PACE.rec && __PACE.rec.lives.push(L);
  return L;
}
function __paceSample(w) {
  const R = __PACE.rec;
  if (!R || w.phase !== 'live') return;
  if (w.t - R.lastSample < 0.25) return;
  const dt = w.t - R.lastSample;
  R.lastSample = w.t;
  const boxes = aw().boxes;
  for (const p of w.players) {
    if (!p.alive) continue;
    const L = p.__paceL;
    if (L && L.contact === null)
      for (const e of w.players) {
        if (!e.alive || !zi(w, p, e) || Ci(p.pos, e.pos) > 90) continue;
        if (Pg(Hi(p), { x: e.pos.x, y: e.pos.y + 1.2, z: e.pos.z }, boxes)) {
          L.contact = w.t - L.spawn;
          break;
        }
      }
    if (!p.isBot) continue;
    const S = R.bots[p.id] || (R.bots[p.id] = { trail: [], stuck: 0, idle: 0, alive: 0, wall: 0, stuckEp: 0, wasStuck: !1, coverEp: 0, flankEp: 0, lastCover: null, lastFlank: null }),
      b = w.brains[p.id],
      fight = !!(b && (b.target || w.t - (b.lastSeenAt ?? -99) < 3 || w.t - (p.lastShotAt ?? -9) < 2 || w.t - (p.lastHitAt ?? -9) < 2));
    S.alive += dt;
    S.trail.push({ t: w.t, x: p.pos.x, z: p.pos.z });
    for (; S.trail.length && w.t - S.trail[0].t > 5.01; ) S.trail.shift();
    const moved = (age) => {
      const o = S.trail.find((q) => w.t - q.t <= age + 0.01);
      return o ? Math.hypot(p.pos.x - o.x, p.pos.z - o.z) : 99;
    };
    const old = S.trail[0];
    if (!fight && old && w.t - old.t > 4.9 && moved(5) < 1.5 && w.t - p.spawnedAt > 5) S.idle += dt;
    const st = !fight && b && b.path && b.path.length > 0 && w.t - p.spawnedAt > 2 && moved(2) < 0.4;
    st && (S.stuck += dt);
    st && !S.wasStuck && S.stuckEp++;
    S.wasStuck = st;
    // cover and flanking: how often the core's own tactics are used
    b && b.cover && b.cover !== S.lastCover && S.coverEp++;
    S.lastCover = b && b.cover;
    b && b.flank && b.flank !== S.lastFlank && S.flankEp++;
    S.lastFlank = b && b.flank;
  }
}
function __paceStats(a) {
  const v = a.filter((x) => x !== null && x !== void 0 && Number.isFinite(x)).sort((x, y) => x - y);
  if (!v.length) return { n: 0 };
  const q = (f) => +v[Math.min(v.length - 1, Math.floor(f * v.length))].toFixed(2);
  return { n: v.length, p25: q(0.25), med: q(0.5), p75: q(0.75), p90: q(0.9), mean: +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2) };
}
function __paceReport() {
  const R = __PACE.rec,
    w = eA.state;
  if (!R) return null;
  const sum = (sel) => {
    const L = R.lives.filter(sel),
      dead = L.filter((l) => l.death !== null);
    return {
      lives: L.length,
      contact: __paceStats(L.map((l) => l.contact)),
      noContactShare: +(L.filter((l) => l.contact === null && l.death !== null).length / Math.max(1, dead.length)).toFixed(2),
      contactBy20s: +(L.filter((l) => l.contact !== null && l.contact <= 20).length / Math.max(1, L.length)).toFixed(2),
      engage: __paceStats(L.map((l) => l.engage)),
      life: __paceStats(dead.map((l) => l.death - l.spawn)),
      spawnKills: dead.filter((l) => l.death - l.spawn < 3 && l.killer && l.killer !== l.id).length,
      deaths: dead.length,
      ttk: __paceStats(dead.map((l) => l.ttk)),
    };
  };
  const bots = Object.values(R.bots),
    tot = (k) => bots.reduce((s, b) => s + b[k], 0),
    aliveMin = tot('alive') / 60,
    dur = (w ? w.t : R.t0) - R.t0;
  return {
    map: R.map,
    mode: R.mode,
    difficulty: R.difficulty,
    seconds: +dur.toFixed(1),
    matchEnd: R.matchEnd,
    score: w ? { ...w.score } : null,
    winner: w ? w.winnerId || w.lastWinner : null,
    objective: w ? { flags: w.flags.map((f) => f.name + ':' + (f.owner || '-')).join(' '), hill: w.hill ? w.hill.idx : null, tagsOut: w.tags.length, topGunLevel: Math.max(0, ...w.players.map((q) => q.ggLevel || 0)), captures: w.players.reduce((s, q) => s + (q.captures || 0), 0) } : null,
    humanKD: (() => {
      const h = w && XB(w, w.humanId);
      return h ? [h.kills, h.deaths] : null;
    })(),
    killsPerMin: +((R.kills / Math.max(1, dur)) * 60).toFixed(1),
    human: sum((l) => l.human),
    all: sum(() => !0),
    botAccuracy: +(R.hits / Math.max(1, R.shots)).toFixed(3),
    botShots: R.shots,
    botAccuracyByRange: Object.fromEntries(Object.entries(R.byRange).map(([k, [n, h]]) => [k, [+(h / Math.max(1, n)).toFixed(3), n]])),
    stuckPerBotMin: +(tot('stuckEp') / Math.max(0.01, aliveMin)).toFixed(2),
    stuckShare: +(tot('stuck') / Math.max(0.01, tot('alive'))).toFixed(3),
    wallShare: +(tot('wall') / Math.max(0.01, tot('alive'))).toFixed(3),
    idleShare: +(tot('idle') / Math.max(0.01, tot('alive'))).toFixed(3),
    coverPerBotMin: +(tot('coverEp') / Math.max(0.01, aliveMin)).toFixed(2),
    flankPerBotMin: +(tot('flankEp') / Math.max(0.01, aliveMin)).toFixed(2),
    adapt: R.adapt.slice(-12),
  };
}
// spawns: every life starts here
{
  const coreSpawn = yE;
  yE = function (w, A) {
    const r = coreSpawn.apply(this, arguments);
    try {
      __paceLife(w, A);
    } catch (e) {}
    return r;
  };
}
// deaths: life length, spawn kills, time to kill
{
  const coreDie = o1;
  o1 = function (w, A, i) {
    try {
      const L = A.__paceL;
      if (L && L.death === null) {
        L.death = w.t;
        L.killer = i ? i.id : null;
        i && L.hits[i.id] !== void 0 && (L.ttk = w.t - L.hits[i.id]);
      }
      __PACE.rec && i && i.id !== A.id && __PACE.rec.kills++;
    } catch (e) {}
    return coreDie.apply(this, arguments);
  };
}
// damage: first hits (for time to kill and first engagement), and which bot shots hit
{
  const coreDmg = Ee;
  Ee = function (w, A, i, I) {
    try {
      if (A && A.alive && i && i.id !== A.id && I > 0) {
        const L = A.__paceL,
          K = i.__paceL;
        L && (L.hits[i.id] === void 0 && (L.hits[i.id] = w.t), L.engage === null && (L.engage = w.t - L.spawn));
        K && K.engage === null && (K.engage = w.t - K.spawn);
        __PACE.cur && __PACE.cur.p === i && (__PACE.cur.hit = !0);
      }
    } catch (e) {}
    return coreDmg.apply(this, arguments);
  };
}
// shots: bots' hitscan shots, and whether each hit
{
  const coreFire = aJ;
  aJ = function (w, A) {
    const R = __PACE.rec,
      wp = R && A && A.isBot && A.weapons[A.active],
      d = wp && gw[wp.id],
      count = d && d.mag > 0 && !d.special && wp.id !== 'grenade';
    if (!count) return coreFire.apply(this, arguments);
    const before = A.lastShotAt;
    __PACE.cur = { p: A, hit: !1 };
    try {
      return coreFire.apply(this, arguments);
    } finally {
      if (A.lastShotAt !== before) {
        R.shots++;
        __PACE.cur.hit && R.hits++;
        // by range to the bot's target (near < 15 m, mid 15-35 m, far beyond)
        const b = w.brains[A.id],
          t = b && b.target && XB(w, b.target),
          bin = !t ? 'none' : Ci(t.pos, A.pos) < 15 ? 'near' : Ci(t.pos, A.pos) < 35 ? 'mid' : 'far',
          a = R.byRange[bin] || (R.byRange[bin] = [0, 0]);
        a[0]++;
        __PACE.cur.hit && a[1]++;
      }
      __PACE.cur = null;
    }
  };
}
// every simulation step: sampling, and the end of the match
{
  const coreStep = U1;
  U1 = function (w) {
    const r = coreStep.apply(this, arguments);
    try {
      const R = __PACE.rec;
      if (R && w === eA.state) {
        __paceSample(w);
        w.phase === 'matchEnd' && R.matchEnd === null && (R.matchEnd = +(w.t - R.t0).toFixed(1));
      }
    } catch (e) {}
    return r;
  };
}
// player update: walking into walls (bots), and the autopilot human (measuring only)
{
  const coreUpdate = Y8;
  Y8 = function (w, A, i, I) {
    try {
      if (__PACE.auto && A && !A.isBot && A.alive && w === eA.state && A.id === w.humanId) i = arguments[2] = Vh(w, A, I);
      const R = __PACE.rec;
      if (R && A && A.isBot && A.alive && i && w.phase === 'live') {
        const b = w.brains[A.id],
          fight = !!(b && (b.target || w.t - (b.lastSeenAt ?? -99) < 3));
        if (!fight && Math.abs(i.forward || 0) + Math.abs(i.strafe || 0) > 0.5 && Math.hypot(A.vel.x, A.vel.z) < 0.4 && w.t - A.spawnedAt > 1) {
          const S = R.bots[A.id];
          S && (S.wall += I);
        }
      }
    } catch (e) {}
    return coreUpdate.apply(this, arguments);
  };
}
typeof window < 'u' &&
  (window.__bpPace = {
    start() {
      const w = eA.state;
      __PACE.rec = { t0: w ? w.t : 0, map: aw().id, mode: w && w.mode, difficulty: w && w.difficulty, lives: [], bots: {}, kills: 0, shots: 0, hits: 0, byRange: {}, lastSample: -1, matchEnd: null, adapt: [] };
      if (w) for (const p of w.players) p.alive && (__paceLife(w, p).spawn = w.t);
      return !0;
    },
    stop() {
      const r = __paceReport();
      __PACE.rec = null;
      return r;
    },
    report: __paceReport,
    get auto() {
      return __PACE.auto;
    },
    set auto(v) {
      __PACE.auto = !!v;
    },
    get fix() {
      return __PACE.fix;
    },
    set fix(v) {
      __PACE.fix = !!v;
    },
    // the current map's objective points: walk grid cell, connected area, route length from every respawn
    // point, nearest respawn point, and how uneven the ground is inside the zone (dev check for section 3)
    objectives(points) {
      const m = aw(),
        nav = p9(),
        area = nav.__areas || (nav.__areas = __pfAreas(nav)),
        len = (r, a) => (r ? r.reduce((s, q, k) => s + nI(q, k ? r[k - 1] : a), 0) : null);
      const fp = (points || m.flagPoints || []).map((f) => (Array.isArray(f) ? { name: f[0], pos: { x: f[1], y: f[2], z: f[3] } } : f));
      const pair = {};
      for (let a = 0; a < fp.length; a++) for (let b = a + 1; b < fp.length; b++) pair[fp[a].name + fp[b].name] = Math.round(len(KT(fp[a].pos, fp[b].pos), fp[a].pos) ?? -1);
      const out = fp.map((f) => {
        const c = l8(f.pos),
          sp = (m.tdmSpawns || []).map((p) => len(KT(p, f.pos), p)),
          ok = sp.filter((x) => x !== null),
          hs = [];
        for (let a = 0; a < 16; a++)
          for (const r of [1.5, 3, 4.4]) {
            const q = l8({ x: f.pos.x + Math.cos(a / 2.55) * r, y: f.pos.y, z: f.pos.z + Math.sin(a / 2.55) * r });
            hs.push(q >= 0 ? nav.h[q] : null);
          }
        const hv = hs.filter((x) => x !== null);
        return {
          name: f.name,
          pos: [+f.pos.x.toFixed(1), +f.pos.y.toFixed(2), +f.pos.z.toFixed(1)],
          cell: c,
          cellY: c >= 0 ? +nav.h[c].toFixed(2) : null,
          area: c >= 0 ? area[c] : null,
          reachFrom: ok.length + '/' + sp.length,
          routeMean: ok.length ? Math.round(ok.reduce((s, x) => s + x, 0) / ok.length) : null,
          routeMin: ok.length ? Math.round(Math.min(...ok)) : null,
          nearestSpawn: Math.round(Math.min(...(m.tdmSpawns || []).map((p) => Ci(p, f.pos)))),
          zoneWalkable: hv.length + '/' + hs.length,
          zoneDy: hv.length ? +(Math.max(...hv.map((y) => Math.abs(y - f.pos.y)))).toFixed(2) : null,
        };
      });
      return { points: out, routes: pair };
    },
    // a whole match (or `seconds` of one) run as fast as the machine allows, without drawing; resolves
    // with the report. opts: { map, mode, difficulty, seconds, auto, fix }
    sim(opts = {}) {
      const o = { map: 'ridgeback', mode: 'tdm', difficulty: 'normal', seconds: 180, auto: !0, ...opts };
      __PACE.auto = !!o.auto;
      __PACE.autoDiff = o.autoDiff || null;
      __PACE.adaptOff = o.adapt === !1;
      o.fix !== void 0 && (__PACE.fix = !!o.fix);
      eA.start({ team: 'CT', operatorId: is('CT'), difficulty: o.difficulty, winScore: o.winScore ?? oU[o.mode === 'hr' ? 'tdm' : o.mode], mode: o.mode, map: o.map, loadout: 'rifle', secondary: 'pistol' });
      window.__bpPace.start();
      return window.__bpPace.ff(o.seconds, !0).then((r) => {
        __PACE.auto = !1;
        eA.paused = !0; // (a measuring match is not left running behind the menu)
        return r;
      });
    },
    // fast-forward the match being played by `seconds` (or to its end), without drawing those steps;
    // resolves with the report (and ends the recording if `stop`)
    ff(seconds, stop) {
      const w = eA.state;
      __PACE.rec || window.__bpPace.start();
      const t0 = performance.now(),
        until = w.t + seconds;
      return new Promise((done) => {
        const step = () => {
          eA.paused = !1;
          try {
            for (let k = 0; k < 240 && w.t < until && w.phase !== 'matchEnd'; k++) eA.tick(1 / 60);
          } finally {
            eA.paused = !0;
          }
          if (w.t < until && w.phase !== 'matchEnd' && eA.state === w) return setTimeout(step, 0);
          const r = stop ? window.__bpPace.stop() : __paceReport();
          r.wallMs = Math.round(performance.now() - t0);
          eA.paused = !1;
          done(r);
        };
        step();
      });
    },
  });
// ---------------------------------------------------------------- 2. pacing fixes
// Measured before these fixes (offline Team Deathmatch, 10 players, the human played by the bot brain; see
// the table in the change notes): spawn kills were already rare (about 1 in 100 deaths: the core's spawn
// picker avoids spawns an enemy can see within 40 m, and spawn protection lasts 1.6 s and ends when you fire),
// and bots already take cover and flank. What was wrong:
//   - Ridgeback Pass was slow: the median life went 11-22 s before its first damage (easy and normal: 19
//     and 22 s), one in ten 36-50 s; 9-11 kills a minute; five of six matches ran out of time (8 min) before
//     the kill limit. The spawn picker took any spawn 45 m or more from the nearest enemy (on a 200 m map,
//     often 80 m away), and a bot with no recent sighting walked to a random point of the map 45% of the time.
//     With the changes below: first damage after 11-14 s (median), one in ten after 22-35 s; 12-14 kills a
//     minute; matches reach the kill limit in 5-8 min. Fortress was already brisk and stays so.
//   - (from the code) a bot whose goal could not be reached (a point inside a rock or on a ledge) stood still
//     until its next goal was due, up to 22 s. Measured idle time was small (1-5% of bot time).
const __PACE_OK = (w) => !!w && __PACE.fix && w === eA.state && !eA.attract && w.mode !== 'range' && w.mode !== 'theater';
// ---- spawns: safe, and near enough to the fight
// A respawn now goes to a spawn point that no enemy is within 20 m of (or will be in a second, at its present
// speed) and that no enemy within 35 m can see; among those it prefers one about 40 m from the nearest enemy
// (a fight within ten to twenty seconds instead of a long walk), one an enemy farther off cannot see, one near
// a teammate, and not one somebody spawned at in the last 4 s. If every point is unsafe, the one farthest
// from the enemy is used. Spawn protection (the core's: 1.6 s, ends when you fire, knife or throw) is kept.
function __paceSpawnPick(w, A) {
  const m = aw(),
    pts = m.tdmSpawns,
    boxes = m.boxes;
  if (!pts || !pts.length) return null;
  const foes = w.players.filter((e) => e !== A && e.alive && zi(w, A, e)),
    mates = cn(w) ? [] : w.players.filter((e) => e !== A && e.alive && e.team === A.team),
    used = w.__paceUsed || (w.__paceUsed = {});
  let best = null,
    bs = -1 / 0,
    far = null,
    fs = -1;
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k],
      head = { x: p.x, y: p.y + 1.5, z: p.z };
    let dmin = foes.length ? 1 / 0 : 42,
      seenNear = !1,
      seenFar = !1;
    for (const e of foes) {
      const d = Math.min(Ci(e.pos, p), Math.hypot(e.pos.x + e.vel.x - p.x, e.pos.z + e.vel.z - p.z));
      d < dmin && (dmin = d);
      if (d < 75 && Pg(Hi(e), head, boxes)) d < 35 ? (seenNear = !0) : (seenFar = !0);
    }
    dmin > fs && !seenNear && ((fs = dmin), (far = p));
    if (dmin < 20 || seenNear) continue;
    const obj = __paceSpawnObj(w, A, p);
    if (obj === null) continue;
    const mate = mates.length ? Math.min(...mates.map((e) => Ci(e.pos, p))) : 99,
      s = -Math.abs(dmin - 40) * 0.6 - (seenFar ? 25 : 0) + (mate < 25 ? 6 : 0) - (w.t - (used[k] ?? -99) < 4 ? 15 : 0) + obj + Dw(w) * 6;
    s > bs && ((bs = s), (best = k));
  }
  const pick = best !== null ? pts[best] : far;
  best !== null && (used[best] = w.t);
  return pick;
}
{
  const corePick = C1;
  C1 = function (w, A) {
    try {
      if (__PACE_OK(w) && xI(w)) {
        const p = __paceSpawnPick(w, A);
        if (p) return p;
      }
    } catch (e) {}
    return corePick.apply(this, arguments);
  };
}
// ---- adaptive difficulty (offline matches only)
// The human's recent form is read every 2 s: kills and deaths in the last 150 s and how long their lives
// lasted. Struggling (more deaths than kills, short lives) moves a hidden dial below zero, dominating moves it
// above; it needs six or so kills and deaths before it moves fully, and it moves slowly (about 40 s to settle),
// so a lucky streak or one bad life does nothing. The dial changes only the bots on the other side from the
// human (their teammates stay at the chosen difficulty):
//   below zero, at most: react 40% slower, first shot 60% wider, recoil held 40% less well, aim sway (below),
//   turn 20% slower, half as many headshots, a narrower view, and they come looking for the human less often
//   above zero, at most: react 20% faster, first shot 30% tighter, recoil held 20% better, turn 15% faster,
//   40% more headshots, see a little farther, and come looking for the human more often
// The chosen difficulty is always the centre, and the push upwards is half the size of the ease downwards.
// Nothing is shown, and nothing a bot is not otherwise allowed changes: no seeing through walls, no extra
// health or damage. Online matches are not touched (the dial is about one player).
function __paceAdapt(w) {
  const a = w.__adapt || (w.__adapt = { s: 0, target: 0, at: -9, ev: [], lifeAt: null, log: -99 });
  if (w.t - a.at < 2) return a;
  const dt = Math.min(10, w.t - a.at);
  a.at = w.t;
  const h = XB(w, w.humanId);
  if (!h) return a;
  for (; a.ev.length && w.t - a.ev[0].t > 150; ) a.ev.shift();
  const k = a.ev.filter((e) => e.k).length,
    d = a.ev.filter((e) => !e.k).length,
    lives = a.ev.filter((e) => !e.k).map((e) => e.life);
  h.alive && h.spawnedAt !== void 0 && lives.push(w.t - h.spawnedAt);
  const kd = Math.max(-1, Math.min(1, Math.log2((k + 1) / (d + 1)) / 2)),
    avg = lives.length ? lives.reduce((s, x) => s + x, 0) / lives.length : 35,
    lf = Math.max(-1, Math.min(1, Math.log2(Math.max(1, avg) / 35))),
    conf = Math.min(1, (k + d) / 6);
  a.target = (0.65 * kd + 0.35 * lf) * conf;
  a.s += (a.target - a.s) * (1 - Math.exp(-dt / 40));
  a.s = Math.max(-1, Math.min(1, a.s));
  const R = __PACE.rec;
  R && w.t - a.log >= 10 && ((a.log = w.t), R.adapt.push({ t: Math.round(w.t), s: +a.s.toFixed(2), k, d, avgLife: Math.round(avg) }));
  return a;
}
// the human's kills and deaths, for the dial
{
  const coreDie = o1;
  o1 = function (w, A, i) {
    try {
      if (w && w.humanId && w === eA.state) {
        const a = w.__adapt || (w.__adapt = { s: 0, target: 0, at: -9, ev: [], lifeAt: null, log: -99 });
        A.id === w.humanId && a.ev.push({ t: w.t, k: !1, life: w.t - (A.spawnedAt ?? w.t) });
        i && i.id === w.humanId && A.id !== i.id && a.ev.push({ t: w.t, k: !0 });
      }
    } catch (e) {}
    return coreDie.apply(this, arguments);
  };
}
// a bot's skill profile for this think: the chosen difficulty's, moved by the dial for the human's enemies
function __paceProfile(w, A, base) {
  const h = XB(w, w.humanId);
  if (!h || h.isBot === !0 || !zi(w, A, h) || !A.isBot || __PACE.adaptOff || w.net) return null;
  const s = __paceAdapt(w).s;
  if (Math.abs(s) < 0.03) return null;
  const e = s < 0 ? -s : 0,
    p = s > 0 ? s : 0;
  return {
    ...base,
    reaction: base.reaction * (1 + 0.4 * e - 0.2 * p),
    aimError: base.aimError * (1 + 0.6 * e - 0.3 * p),
    turnSpeed: base.turnSpeed * (1 - 0.2 * e + 0.15 * p),
    headshotBias: Math.min(0.45, base.headshotBias * (1 - 0.5 * e + 0.4 * p)),
    fov: base.fov * (1 - 0.1 * e + 0.05 * p),
    range: base.range * (1 - 0.15 * e + 0.1 * p),
    sprayControl: Math.min(0.9, base.sprayControl * (1 - 0.4 * e + 0.2 * p)),
    __sway: 0.01 * e,
  };
}
// ---- aim sway: the dial's steadiest lever
// While the human is struggling, each of their enemies' aim drifts a little around its target while it
// fights (two slow waves, different per bot), by up to 1 cm a metre at the bottom of the dial: a spray at
// 30 m opens by about a hand's width. At the centre and above there is no sway: the chosen difficulty's aim.
// (Measured: the difficulties already differ in accuracy where fights happen: hits per bullet at 15-35 m
// were about 3%, 7% and 14% on easy, normal and hard; beyond 35 m all three spray at 2-4%.)
{
  const coreThink = Vh;
  Vh = function (w, A) {
    if (!__PACE_OK(w)) return coreThink.apply(this, arguments);
    const key = w.difficulty,
      base = Zh[key];
    let prof = null;
    try {
      prof = base && __paceProfile(w, A, base);
      // (measuring: the autopilot human can play at another difficulty than the bots)
      !A.isBot && __PACE.auto && __PACE.autoDiff && Zh[__PACE.autoDiff] && (prof = Zh[__PACE.autoDiff]);
    } catch (e) {}
    prof && (Zh[key] = prof);
    let r;
    try {
      r = coreThink.apply(this, arguments);
    } finally {
      prof && (Zh[key] = base);
    }
    try {
      const b = w.brains[A.id];
      if (prof && prof.__sway > 0 && b && b.target && w.t >= b.reactAt && A.alive) {
        const amp = prof.__sway,
          ph = A.__swayPh ?? (A.__swayPh = Dw(w) * 100);
        A.yaw += amp * (0.6 * Math.sin(w.t * 1.7 + ph) + 0.4 * Math.sin(w.t * 4.3 + ph * 1.3));
        A.pitch += amp * 0.6 * (0.6 * Math.sin(w.t * 1.3 + ph * 0.7) + 0.4 * Math.sin(w.t * 3.7 + ph));
      }
    } catch (e) {}
    return r;
  };
}
// ---- where a bot goes when it has no recent sighting (Team Deathmatch, Free-for-All, Tag Hunt, Gun Ladder)
// It heads for the area of an enemy (80% of the time; otherwise a random point of interest), aiming for the
// map's nearest landmark (point of interest or spawn point) to that enemy, with 10 m of guesswork, and
// re-decides every 6-12 s rather than 10-22 s. It never heads for an enemy who spawned in the last 5 s (no
// spawn camping). Nearer enemies are likelier picks; the human is picked more or less often with the
// adaptive dial. (The core sent bots to an enemy only 55% of the time, and to a random point the rest.)
function __paceHunt(w, A, i) {
  const m = aw(),
    C = c8(w, CD(w, A));
  if (C && w.t - C.at < 6 && nI(C.pos, A.pos) < 50) return null; // the core follows fresh intel
  if (w.mode === 'kc' && w.tags.some((t) => Ci(t.pos, A.pos) < 28)) return null; // ...and nearby tags
  if (i.goal && w.t < i.patrolAt && Ci(i.goal, A.pos) > 2) return i.goal;
  i.patrolAt = w.t + 6 + Dw(w) * 6;
  const foes = w.players.filter((e) => e.alive && zi(w, A, e) && w.t - (e.spawnedAt ?? -99) > 5);
  const marks = [...(m.poi || []), ...(m.tdmSpawns || [])];
  if (!marks.length) return null;
  if (foes.length && Dw(w) < 0.8) {
    const hs = w.__adapt && !w.net && !__PACE.adaptOff ? w.__adapt.s : 0,
      wt = foes.map((e) => (1 / Math.max(15, Ci(e.pos, A.pos))) * (e.id === w.humanId ? 1 + 0.5 * hs : 1)),
      tot = wt.reduce((s, x) => s + x, 0);
    let r = Dw(w) * tot,
      f = foes[0];
    for (let k = 0; k < foes.length; k++) if ((r -= wt[k]) <= 0) {
      f = foes[k];
      break;
    }
    const g = { x: f.pos.x + (Dw(w) - 0.5) * 20, z: f.pos.z + (Dw(w) - 0.5) * 20 },
      near = marks.filter((p) => Ci(p, A.pos) > 4).sort((a, b) => Ci(a, g) - Ci(b, g))[0];
    if (near) return { ...near };
  }
  return { ...marks[Math.floor(Dw(w) * marks.length)] };
}
{
  const coreGoal = rh;
  rh = function (w, A, i) {
    try {
      if (__PACE_OK(w) && (w.mode === 'tdm' || w.mode === 'ffa' || w.mode === 'kc' || w.mode === 'gungame') && !w.jb) {
        const g = __paceHunt(w, A, i);
        if (g) return g;
      }
    } catch (e) {}
    return coreGoal.apply(this, arguments);
  };
}
// ---- unreachable goals and stuck bots
// A goal no route reaches (the route search returns nothing) is dropped at once, so the next think picks
// another, instead of standing there until the goal is due to change. A bot that has a route but has moved
// less than 0.5 m in 3 s outside a fight (the core's jump-and-retry did not free it) drops its goal too.
{
  const coreRoute = f8;
  f8 = function (w, A, i, I) {
    const r = coreRoute.apply(this, arguments);
    try {
      // (not a chase: a last-seen enemy position is the core's own short-lived goal)
      if (__PACE_OK(w) && I && i.goal && !i.path.length && Ci(A.pos, i.goal) > 2.5 && !i.cover && !(i.lastSeen && Ci(i.lastSeen, i.goal) < 1.5)) {
        i.goal = null;
        i.patrolAt = 0;
      }
      if (__PACE_OK(w) && i.path.length && !i.target) {
        const s = A.__paceStuck || (A.__paceStuck = { t: w.t, x: A.pos.x, z: A.pos.z });
        if (Math.hypot(A.pos.x - s.x, A.pos.z - s.z) > 0.5 || w.t - (A.spawnedAt ?? 0) < 1) (s.t = w.t), (s.x = A.pos.x), (s.z = A.pos.z);
        else if (w.t - s.t > 3) {
          i.goal = null;
          i.path = [];
          i.patrolAt = 0;
          s.t = w.t;
        }
      }
    } catch (e) {}
    return r;
  };
}
typeof window < 'u' && (window.__bpAdapt = () => (eA.state && eA.state.__adapt ? { s: +eA.state.__adapt.s.toFixed(3), target: +eA.state.__adapt.target.toFixed(3), events: eA.state.__adapt.ev.length } : null));
// ---------------------------------------------------------------- 3. objective modes
// Domination (dom), Tag Hunt (kc, "kill confirmed"), Hot Zone (hp, "hardpoint") and Gun Ladder (gungame) are
// complete in the core (scoring, the HUD, bot goals, online sync) and were only taken out of the menus
// (07-modes.js). What each needs from a map: Domination and Hot Zone use the map's three `flagPoints`, A, B
// and C (Hot Zone visits them in the order A, C, B, one minute each); Tag Hunt and Gun Ladder need nothing
// beyond respawn points (Gun Ladder's guns are the ladder `uI`, set in 45-weapon-roster.js).
// Every current map has flag points; each was checked with window.__bpPace.objectives(): on the walk grid,
// reachable from every respawn point, the ground inside the 4.6 m zone level within 0.6 m. Three maps' points
// were lopsided and are moved here, measured as route lengths along the bots' walk grid. A match starts with
// each team on its own side (CT near A, Terrorists near C), so B should be the same walk from A and from C:
//   - Bayou Palace Cinemas: A was the lobby, B Theater 2's pit, C Theater 3's pit: A sat almost under B and C
//     was off on its own. Now A is Theater 2's pit and C Theater 3's pit (the two bomb sites, mirror images
//     either side of the Mid passage) and B the Mid passage between them, which has a doorway into each:
//     A-B 29 m, C-B 28 m, A-C 43 m.
//   - Fortress: B (the fountain) was 33 m from A and 49 m from C; moved 7 m east along Mid: 42 m and 43 m.
//   - Frostline: B was 50 m from A and 60 m from C; moved 4 m east: 55 m and 55 m.
//   Ridgeback Pass (A-B 50 m, C-B 48 m) and Blackwater Penitentiary (A Block dayroom, exercise yard,
//   cafeteria: 57 m, 53 m, A-C 53 m) were already balanced and are unchanged.
// Several respawn points sit on or next to a flag point (Cinemas' theater pits, Fortress's A and C). In
// Domination and Hot Zone the spawn picker (above) does not use a respawn point within 10 m of a flag (Hot
// Zone: of the live zone or the next one), so nobody appears inside an objective; it prefers points near flags
// the team holds and avoids those near the enemy's. A Domination match starts with each team on its own side:
// CT near A, Terrorists near C, the same walk from B; a Hot Zone match with both teams as far from the first
// zone.
const __PACE_FLAGS = {
  cinema: (m) => {
    const T = __CN_TH.map((t) => (t.a + t.b) / 2),
      y = 0.12,
      zz = __CN.R0 - 3;
    return [
      { name: 'A', pos: z(T[1], y, zz) },
      { name: 'B', pos: z((__CN_TH[1].b + __CN_TH[2].a) / 2, y, __CN.P1 + 16) },
      { name: 'C', pos: z(T[2], y, zz) },
    ];
  },
  // (B moved: see above; the other two stay as the map made them)
  fortress: (m) => m.flagPoints.map((f) => (f.name === 'B' ? { name: 'B', pos: z(68, f.pos.y, 40) } : f)),
  frostline: (m) => m.flagPoints.map((f) => (f.name === 'B' ? { name: 'B', pos: z(66, f.pos.y, 63) } : f)),
};
for (const [id, f] of Object.entries(__PACE_FLAGS)) {
  const build = XE[id];
  if (!build) continue;
  XE[id] = function () {
    const m = build.apply(this, arguments);
    try {
      m.flagPoints = f(m);
    } catch (e) {}
    return m;
  };
  try {
    const built = fj.get(id);
    built && (built.flagPoints = f(built));
  } catch (e) {}
}
// spawn picker additions for the objective modes (used by __paceSpawnPick through this hook)
function __paceSpawnObj(w, A, p) {
  const m = aw(),
    fp = m.flagPoints || [];
  if (!fp.length) return 0;
  if (w.mode === 'dom') {
    let s = 0;
    for (const f of w.flags) {
      const d = Ci(f.pos, p);
      if (d < 10) return null;
      f.owner === A.team && Math.abs(f.progress) >= 1 && d < 30 && (s += 8);
      f.owner && f.owner !== A.team && d < 30 && (s -= 8);
    }
    return s + __paceSide(w, A, p, fp);
  }
  if (w.mode === 'hp') {
    const order = jj(),
      h = w.hill;
    if (h) {
      if (Ci(h.pos, p) < 12) return null;
      const nx = order[(h.idx + 1) % Math.max(1, order.length)];
      if (nx && h.moveAt - w.t < 15 && Ci(nx, p) < 12) return null;
    } else if (order[0] && Ci(order[0], p) < 12) return null;
    return __paceSide(w, A, p, fp);
  }
  return 0;
}
// the first spawn of a match. Domination: each team on its own side (CT by A, Terrorists by C). Hot Zone:
// both teams the same distance (about 45 m) from the first zone, which is A (with CT spawned by A, the first
// test gave CT the whole first minute: 8 points to 0 in 16 s)
function __paceSide(w, A, p, fp) {
  if (w.t - w.roundStart > 1 || cn(w)) return 0;
  if (w.mode === 'hp') {
    const z0 = jj()[0];
    return z0 ? -Math.abs(Ci(z0, p) - 45) * 0.8 : 0;
  }
  const home = fp.find((f) => f.name === (A.team === 'CT' ? 'A' : 'C'));
  return home ? -Ci(home.pos, p) * 0.8 : 0;
}
// Gun Ladder back in the menus: offline (gF) and online (CN), after Free-for-All, with the core's own
// description. (Domination, Hot Zone and Tag Hunt were tried and left out at the owner's choice: their map
// positions and spawn rules below stay, unused, in case they come back.)
(function () {
  Object.assign(Eg, { gungame: 'Gun Ladder' });
  const txt = {
    hp: 'One zone that moves every minute. Your team scores a point a second while it holds it alone.',
    kc: 'Every kill drops a dog tag. Grab enemy tags to score; grab your own to deny them.',
    dom: 'Capture and hold A, B and C. Held flags score every second.',
    gungame: 'Two kills to move up a gun. Win with the knife; knife kills set the victim back.',
  };
  const put = (list, after, keys, row) => {
    let at = list.findIndex((x) => (row ? x[0] : x) === after);
    at = at < 0 ? list.length - 1 : at;
    for (const k of keys) list.some((x) => (row ? x[0] : x) === k) || list.splice(++at, 0, row ? [k, txt[k]] : k);
  };
  put(gF, 'ffa', ['gungame'], !0);
  put(CN, 'ffa', ['gungame'], !1);
  try {
    const st = Zw.getState();
    st.setup({ scores: { ...oU, ...st.scores } });
  } catch (e) {}
})();
// their cards' art: the reel's key art of a map that suits each, washed in the mode's own colour (the core's
// card colours, CBA), as High Roller's card reuses art (87-high-roller.js)
typeof document < 'u' &&
  (() => {
    const art = { gungame: ['cinema', '#5c6b2f'] },
      url = (k) => (typeof __mxArt === 'function' ? __mxArt(k) : `game/menu/reel-${k}.webp`),
      css = document.createElement('style');
    css.textContent = Object.entries(art)
      .map(([m, [k, c]]) => `.po-mode[data-mode='${m}'] .po-mode-art,.mx .po-mode[data-mode='${m}'] .po-mode-art{background:linear-gradient(180deg,${c}55,${c}aa),url(${url(k)}) center/cover no-repeat!important;filter:saturate(1.05)}`)
      .join('');
    document.head.appendChild(css);
  })();
// the pause menu's goal line (47-pause-menu.js names only Team Deathmatch's and Gun Ladder's)
if (typeof __pvStatus === 'function') {
  const corePv = __pvStatus;
  __pvStatus = function () {
    const r = corePv.apply(this, arguments);
    try {
      const w = eA.state;
      if (r && w && !r.goal) {
        const n = w.winScore || oU[w.mode];
        r.goal = w.mode === 'dom' ? `First to ${n} points: hold the flags` : w.mode === 'hp' ? `First to ${n} points: hold the zone` : w.mode === 'kc' ? `First to ${n} tags` : w.mode === 'ffa' ? `First to ${n} kills` : '';
      }
    } catch (e) {}
    return r;
  };
}
