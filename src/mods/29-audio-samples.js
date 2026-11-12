/* ===== Bayou Protocol mod: recorded-sample audio engine ===== */
// Plays real recordings (Sonniss GDC bundles, CC0 Freesound) for every game event that has samples, and
// falls back to the core's synthesised sound for anything that does not. Samples go through the same
// voice chain as the synth (20-audio-engine.js: 3D panning, distance low-pass, wall occlusion, indoor/
// outdoor reverb, voice limit), so they sit in the world correctly.
//
// Files: public/game/audio/<category>/... and public/game/audio/manifest.json:
//   { "sounds": { "<key>": { "files": ["weapons/rifle/close_01.ogg", ...], "gain": 1 } } }
// tools/fetch-freesound.mjs and tools/import-audio.mjs write that manifest. Keys (most specific wins):
//   weapon.<id>.close | weapon.<class>.close     shot, near           weapon.<id|class>.far   distant shot
//   weapon.<id|class>.tail.out | .tail.in        reflections          weapon.<id|class>.mech  bolt/action
//   weapon.suppressed.<class>                    suppressed shot      reload.<id> | reload.<class>
//   dryfire  whiz  impact.<mat>  impact.flesh  impact.head  hit.self  hit.armor  shield.break
//   step.<surface>  step.run.<surface>  land.<surface>  slide  jump
//   explosion.near  explosion.far  flash.bang  smoke.pop  grenade.throw  grenade.bounce  fire.loop
//   door.open  door.close  glass.break  melee.swing  melee.hit  ui.buy  ui.money  ui.hit  ui.head  ui.kill
//   amb.<desert|industrial|village|jungle|city>   ambience loops
const __SND = { stats: {}, man: null, buf: new Map(), loading: new Map(), last: new Map(), ready: !1, amb: null };
const __wClass = (id) => {
  const c = (typeof qO < 'u' && qO[id]) || '';
  return c === 'heavy' ? (id === 'shotgun' ? 'shotgun' : id === 'rpg' ? 'launcher' : 'lmg') : c || (id === 'shotgun' ? 'shotgun' : 'rifle');
};
function __sndKey(...keys) {
  if (!__SND.man) return null;
  for (const k of keys) if (k && __SND.man.sounds[k] && __SND.man.sounds[k].files.length) return k;
  return null;
}
async function __sndLoadManifest() {
  try {
    const r = await fetch('./game/audio/manifest.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const m = await r.json();
    if (m && m.sounds) {
      __SND.man = m;
      __SND.ready = !0;
    }
  } catch (e) {}
}
// files may be listed without an extension when the manifest offers several encodings ("ext": ["ogg","m4a"]):
// Opus/OGG where the browser decodes it, AAC/M4A otherwise (Safari)
function __sndExt() {
  if (__SND.extPick !== void 0) return __SND.extPick;
  const list = (__SND.man && __SND.man.ext) || [];
  let pick = '';
  try {
    const a = document.createElement('audio');
    pick = list.find((e) => (e === 'ogg' ? a.canPlayType('audio/ogg; codecs="opus"') : e === 'm4a' ? a.canPlayType('audio/mp4; codecs="mp4a.40.2"') : a.canPlayType('audio/' + e))) || list[list.length - 1] || '';
  } catch {}
  return (__SND.extPick = pick);
}
function __sndBuffer(file) {
  if (__SND.buf.has(file)) return __SND.buf.get(file);
  const url = /\.[a-z0-9]{2,4}$/i.test(file) ? file : file + '.' + __sndExt();
  if (!__SND.loading.has(file) && $i)
    __SND.loading.set(
      file,
      fetch('./game/audio/' + url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((a) => $i.decodeAudioData(a))
        .then((b) => (__SND.buf.set(file, b), b))
        .catch(() => (__SND.buf.set(file, null), null)),
    );
  return null;
}
function __sndPreload(prefixes) {
  if (!__SND.man || !$i) return;
  for (const [k, v] of Object.entries(__SND.man.sounds)) if (prefixes.some((p) => k.startsWith(p))) v.files.forEach(__sndBuffer);
}
// pick a variation, never the same file twice in a row
function __sndPick(key) {
  const files = __SND.man.sounds[key].files,
    ready = files.filter((f) => __SND.buf.get(f));
  files.forEach(__sndBuffer);
  if (!ready.length) return null;
  const last = __SND.last.get(key);
  let f = ready[Math.floor(Math.random() * ready.length)];
  ready.length > 1 && f === last && (f = ready[(ready.indexOf(f) + 1) % ready.length]);
  __SND.last.set(key, f);
  return __SND.buf.get(f);
}
// play one layer through the world voice chain; returns true if a sample played
function __sndPlay(key, pos, gain = 1, opts = {}) {
  if (!key || !$i) return !1;
  const b = __sndPick(key);
  if (!b) return !1;
  const g = gain * (__SND.man.sounds[key].gain ?? 1) * (1 + (Math.random() * 2 - 1) * 0.06),
    v = xw(pos, g, { reverb: opts.reverb ?? 0.15, travel: opts.travel, maxDist: opts.maxDist ?? 120, occlude: opts.occlude });
  if (!v) return !0; // culled by distance or voice budget: still counts as handled
  const s = $i.createBufferSource();
  s.buffer = b;
  s.playbackRate.value = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * (opts.pitchVar ?? 0.035));
  s.connect(v.in);
  s.start(v.t + (opts.delay ?? 0));
  __SND.stats[key] = (__SND.stats[key] || 0) + 1;
  return !0;
}
const __near = (d) => 1 - __smoothS(12, 70, d),
  __smoothS = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
function __dist(pos) {
  return pos ? Math.hypot(pos.x - In.pos.x, pos.y - In.pos.y, pos.z - In.pos.z) : 0;
}
// ---------- event handlers (return true when samples covered the event) ----------
const __SH = {
  shot(B, A) {
    const self = VI(B.shooter),
      pos = self ? null : B.from,
      id = B.weapon,
      cl = __wClass(id),
      d = __dist(pos);
    if (id === 'knife' || id === 'grenade') return !1;
    if (B.suppressed) {
      const k = __sndKey('weapon.suppressed.' + id, 'weapon.suppressed.' + cl);
      if (!k) return !1;
      __sndPlay(k, pos, 0.9, { travel: !0, maxDist: 60, reverb: 0.1 });
      const cyc = __sndKey('weapon.' + id + '.cycle');
      cyc && __sndPlay(cyc, pos, self ? 0.6 : 0.4, { maxDist: 30, delay: 0.55, pitchVar: 0.01 });
      return !0;
    }
    const close = __sndKey('weapon.' + id + '.close', 'weapon.' + cl + '.close');
    if (!close) return !1;
    const CG = { pistol: 0.78, smg: 0.82, rifle: 1, sniper: 1.18, shotgun: 1.15, lmg: 1.05, launcher: 1.1 },
      cg = CG[cl] ?? 1,
      now = performance.now(),
      prev = __SND['ls' + B.shooter] || 0,
      auto = now - prev < 190;
    __SND['ls' + B.shooter] = now;
    const far = __sndKey('weapon.' + id + '.far', 'weapon.' + cl + '.far'),
      k = __near(d);
    __sndPlay(close, pos, cg * (self ? 1 : 0.95) * (far ? k : 1), { travel: !0, maxDist: 400, reverb: 0.08, pitchVar: 0.025 });
    far && k < 0.98 && __sndPlay(far, pos, cg * (1 - k), { travel: !0, maxDist: 400, reverb: 0.05, pitchVar: 0.02 });
    const indoor = pos ? RE(pos) : In.indoor,
      tail = __sndKey('weapon.' + id + '.tail.' + (indoor ? 'in' : 'out'), 'weapon.' + cl + '.tail.' + (indoor ? 'in' : 'out'));
    // in sustained fire the room tails would pile up into a wash: keep them low until the burst ends
    tail && __sndPlay(tail, pos, cg * (auto ? 0.28 : 0.75), { travel: !0, maxDist: 400, reverb: 0.02, occlude: !1, delay: 0.015 });
    const cyc = __sndKey('weapon.' + id + '.cycle');
    cyc && d < 30 && __sndPlay(cyc, pos, self ? 0.6 : 0.4, { maxDist: 30, delay: 0.55, pitchVar: 0.01 });
    const mech = __sndKey('weapon.' + id + '.mech', 'weapon.' + cl + '.mech');
    mech && d < 10 && __sndPlay(mech, pos, self ? 0.55 : 0.35, { maxDist: 12, delay: 0.02 });
    // bullet passing close to the listener
    const I = A.players.find((p) => p.id === A.humanId);
    if (!self && I && I.alive && performance.now() - (__SND.whiz || 0) > 90) {
      const n = Hi(I),
        e = Iz(B.from, B.to, n);
      e.d < 2.2 && e.d > 0.15 && Math.hypot(B.to.x - n.x, B.to.z - n.z) > 1 && __sndPlay(__sndKey('whiz'), e.at, 0.9, { maxDist: 8 }) && (__SND.whiz = performance.now());
    }
    return !0;
  },
  impact(B) {
    const k = B.flesh ? __sndKey('impact.flesh') : __sndKey('impact.' + (B.mat || 'default'), 'impact.default');
    return k ? __sndPlay(k, B.pos, B.flesh ? 0.9 : 0.6, { maxDist: 45 }) : !1;
  },
  hit(B) {
    let any = !1;
    if (VI(B.attacker) && B.victim !== B.attacker) any = __sndPlay(__sndKey(B.headshot ? 'ui.head' : 'ui.hit'), null, B.headshot ? 0.6 : 0.4) || any;
    if (VI(B.victim)) any = __sndPlay(__sndKey(B.shield ? 'hit.armor' : 'hit.self'), null, 0.8) || any;
    return any;
  },
  kill(B) {
    return VI(B.killer) && B.victim !== B.killer ? __sndPlay(__sndKey('ui.kill'), null, 0.45) : !1;
  },
  shieldbreak(B, A) {
    return __sndPlay(__sndKey('shield.break'), VI(B.who) ? null : yo(A, B.who), 0.7, { maxDist: 30 });
  },
  reload(B, A) {
    const g = A.players.find((e) => e.id === B.who),
      n = g && g.weapons[g.active];
    if (!n) return !1;
    const k = __sndKey('reload.' + n.id, 'reload.' + __wClass(n.id));
    if (!k) return !1;
    const b = __sndPick(k),
      want = gw[n.id].reload || 2.5;
    // stretch slightly so the clip sound lines up with this weapon's reload time
    return __sndPlay(k, VI(B.who) ? null : yo(A, B.who), VI(B.who) ? 0.7 : 0.5, { maxDist: 30, rate: b ? Math.max(0.85, Math.min(1.2, b.duration / want)) : 1, pitchVar: 0.01 });
  },
  empty() {
    return __sndPlay(__sndKey('dryfire'), null, 0.5);
  },
  step(B, A) {
    const who = A.players.find((p) => p.id === B.who),
      surf = TE(aw(), B.pos.x, B.pos.y, B.pos.z),
      run = who && who.sprinting;
    const k = __sndKey(run ? 'step.run.' + surf : null, 'step.' + surf, run ? 'step.run.concrete' : null, 'step.concrete');
    if (!k) return !1;
    const n = performance.now();
    if (n - (__SND['st' + B.who] || 0) < 180) return !0;
    __SND['st' + B.who] = n;
    const self = VI(B.who);
    return __sndPlay(k, self ? null : B.pos, (self ? 0.32 : 0.85) * (run ? 1.2 : 1) * (who && who.crouch > 0.5 ? 0.45 : 1), { maxDist: 32, reverb: 0.1 });
  },
  land(B) {
    const k = __sndKey('land.' + TE(aw(), B.pos.x, B.pos.y, B.pos.z), 'land.concrete');
    return k ? __sndPlay(k, VI(B.who) ? null : B.pos, B.hard ? 1 : 0.6, { maxDist: 40 }) : !1;
  },
  slide(B, A) {
    return __sndPlay(__sndKey('slide'), VI(B.who) ? null : yo(A, B.who), 0.6, { maxDist: 30 });
  },
  explosion(B) {
    const d = __dist(B.pos),
      near = __sndKey('explosion.near'),
      far = __sndKey('explosion.far');
    if (!near && !far) return !1;
    const k = __near(d * 0.6);
    near && __sndPlay(near, B.pos, (B.big ? 1.3 : 1.1) * (far ? k : 1), { travel: !0, maxDist: 500, reverb: 0.3, occlude: !1 });
    far && __sndPlay(far, B.pos, (B.big ? 1.2 : 1) * (near ? 1 - k : 1), { travel: !0, maxDist: 500, reverb: 0.2, occlude: !1 });
    return !0;
  },
  flash(B) {
    return __sndPlay(__sndKey('flash.bang'), B.pos, 1.2, { travel: !0, maxDist: 200, reverb: 0.4 });
  },
  smoke(B) {
    return __sndPlay(__sndKey('smoke.pop'), B.pos, 0.6, { maxDist: 40 });
  },
  throw(B, A) {
    return __sndPlay(__sndKey('grenade.throw'), VI(B.who) ? null : yo(A, B.who), 0.5, { maxDist: 25 });
  },
  bounce(B) {
    return __sndPlay(__sndKey('grenade.bounce'), B.pos, 0.5, { maxDist: 35 });
  },
  glass(B) {
    return __sndPlay(__sndKey('glass.break'), B.pos, 0.9, { maxDist: 60 });
  },
  door(B) {
    return __sndPlay(__sndKey(B.open ? 'door.open' : 'door.close'), B.pos, 0.7, { maxDist: 30 });
  },
  melee(B, A) {
    const p = VI(B.who) ? null : yo(A, B.who),
      a = __sndPlay(__sndKey('melee.swing'), p, 0.6, { maxDist: 25 });
    B.hit && __sndPlay(__sndKey('melee.hit'), p, 0.8, { maxDist: 25, delay: 0.08 });
    return a;
  },
  buy(B) {
    return VI(B.who) ? __sndPlay(__sndKey('ui.buy'), null, 0.5) : !1;
  },
  money(B) {
    return VI(B.who) ? __sndPlay(__sndKey('ui.money'), null, 0.4) : !1;
  },
};
{
  const coreBz = Bz;
  Bz = function (w, A) {
    if (!__SND.ready || !$i) return coreBz(w, A);
    const rest = [];
    for (const B of w) {
      const h = __SH[B.type];
      let done = !1;
      try {
        done = !!(h && h(B, A));
      } catch (e) {
        done = !1;
      }
      done || rest.push(B);
    }
    rest.length && coreBz(rest, A);
  };
}
// ---------- ambience bed per map setting ----------
function __sndAmbience() {
  if (!__SND.ready || !$i || !oe) return;
  const m = aw(),
    set = m.id === 'piazza' ? 'village' : m.id === 'reactor' ? 'industrial' : m.backdrop || 'city',
    key = __sndKey('amb.' + set, 'amb.city');
  if (!key || (__SND.amb && __SND.amb.key === key)) return;
  const b = __sndPick(key);
  if (!b) return;
  if (__SND.amb) {
    try {
      __SND.amb.g.gain.setTargetAtTime(0, $i.currentTime, 0.8);
      __SND.amb.s.stop($i.currentTime + 4);
    } catch {}
  }
  const s = $i.createBufferSource(),
    g = $i.createGain();
  s.buffer = b;
  s.loop = !0;
  g.gain.value = 0;
  g.gain.setTargetAtTime(0.6, $i.currentTime, 1.5);
  s.connect(g).connect(oe);
  s.start();
  __SND.amb = { key, s, g };
}
if (typeof window < 'u') {
  __sndLoadManifest();
  // warm the cache with the sounds every match needs, once the audio context exists
  const warm = setInterval(() => {
    if (!$i || !__SND.ready) return;
    clearInterval(warm);
    __sndPreload(['weapon.', 'step.', 'impact.', 'reload.', 'ui.', 'hit.', 'whiz', 'dryfire', 'land.']);
  }, 1000);
  setInterval(() => {
    const z = Zw.getState();
    z.screen === 'playing' && __sndAmbience();
  }, 3000);
  window.__bpSound = __SND;
}
