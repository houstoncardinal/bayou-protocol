/* ===== Bayou Protocol mod: video screens (the cinema's auditoriums, the prison's dayroom TV) ===== */
// A map lists its screens in `A.screens`: { id, x, y, z (centre), w, h, ry (the way it faces: 0 = +z),
// room: { min, max } (inside it the sound is the room's own, at full level), hear (metres it carries outside),
// frame: 'tv' | 'none', name }. What each screen shows comes from the showings document that the /admin
// dashboard edits (GET /api/showings, see server/showings-core.mjs); without it, the defaults below.
//
// Every player computes the same moment of the film from the showing's start time (position = offset +
// time since startedAt, looped), so everyone in a room sees and hears the same frame, online or not.
//
// Two ways a video reaches a screen:
//   - a video file (kind 'file', same origin): a <video> drawn as the screen's texture. Its sound goes through
//     the game's audio graph: an HRTF panner at the screen, muffled through walls, into the game's mix.
//   - YouTube (kind 'youtube'): YouTube's player can't be drawn into WebGL (it is a cross-origin iframe), so it
//     plays in an iframe *behind* the game's canvas. The screen is drawn as a hole (alpha 0) that the iframe
//     shows through, and the iframe is warped every frame (a CSS perspective transform from the screen's four
//     corners as the camera sees them) to fill it exactly. Anything in front of the screen (players, seats,
//     the projector's beam) still draws over it. Its volume follows the room and distance (YouTube's player
//     has no positional sound). At most two YouTube players run at once (the screens nearest you); the
//     others show the film's still.
const __SCR = {
  doc: null, // the showings document
  skew: 0, // server clock - our clock (ms), from the API's Date header
  url: null,
  polled: 0,
  subs: new Set(),
  rev: 0,
  yt: null, // the YouTube IFrame API, once loaded
  ytWait: [],
  layer: null,
  maxYT: 2,
  live: [],
};
const __SCR_EPOCH = Date.UTC(2026, 0, 1); // the defaults' start time (the same on every machine)
const __SCR_OGSB = '/OGSB%20Young%20-%20Only%20Thing%20That%20Matters%20To%20You%20%5BOfficial%20Music%20Video%5D.mp4';
const __SCR_DEF = {
  t1: { name: 'Theater 1', showing: { kind: 'file', url: __SCR_OGSB, title: 'OGSB Young — Only Thing That Matters To You', channel: 'OGSB Young' } },
  t2: { name: 'Theater 2', showing: { kind: 'youtube', videoId: 'aqz-KE-bpKQ', title: 'Big Buck Bunny', channel: 'Blender' } },
  t3: { name: 'Theater 3', showing: { kind: 'youtube', videoId: 'eRsGyueVLvQ', title: 'Sintel', channel: 'Blender' } },
  t4: { name: 'Theater 4', showing: { kind: 'youtube', videoId: 'R6MlUcmOul8', title: 'Tears of Steel', channel: 'Blender' } },
  t5: { name: 'The Velvet Room', showing: { kind: 'youtube', videoId: 'WhWc3b3KhnY', title: 'Spring', channel: 'Blender Studio' } },
  lounge: { name: 'The Starlight', showing: { kind: 'youtube', videoId: 'mN0zPOpADL4', title: 'Agent 327: Operation Barbershop', channel: 'Blender Studio' } },
  prison: { name: 'Blackwater Dayroom TV', showing: { kind: 'file', url: __SCR_OGSB, title: 'OGSB Young — Only Thing That Matters To You', channel: 'OGSB Young' } },
};
const __scrNow = () => Date.now() + __SCR.skew;
// the showing a screen should play (the document's, else the default)
function __scrShowing(id) {
  const t = __SCR.doc && __SCR.doc.theaters && __SCR.doc.theaters.find((x) => x.id === id);
  if (t) return t.showing ? { loop: !0, volume: 1, offset: 0, ...t.showing, startedAt: t.showing.startedAt || __SCR_EPOCH, __id: id } : null;
  const d = __SCR_DEF[id];
  return d && d.showing ? { loop: !0, volume: 1, offset: 0, startedAt: __SCR_EPOCH, ...d.showing, __id: id } : null;
}
function __scrName(id) {
  const t = __SCR.doc && __SCR.doc.theaters && __SCR.doc.theaters.find((x) => x.id === id);
  return (t && t.name) || (__SCR_DEF[id] && __SCR_DEF[id].name) || id;
}
// the same showing? (a change re-creates the screen's source)
const __scrKey = (s) => (s ? [s.kind, s.videoId || '', s.listId || '', s.url || '', s.startedAt, s.offset || 0, s.loop ? 1 : 0].join('|') : 'off');
// where in the film everyone is (seconds), given its length
// In a match, every film starts at the beginning when the match starts and plays once to its end (the film
// clock, __filmPos: paused, rewound and fast-forwarded from the projection booth's control panel). Outside a
// match, the showings' own schedule.
function __scrPos(s, dur) {
  const fp = s.__id ? __filmPos(s.__id) : null;
  if (fp !== null) return dur > 0 ? Math.min(fp, Math.max(0, dur - 0.25)) : fp;
  const t = (s.offset || 0) + Math.max(0, __scrNow() - s.startedAt) / 1000;
  if (!(dur > 0)) return t;
  return s.loop !== !1 ? t % dur : Math.min(t, dur);
}
// ---------------------------------------------------------------- the film clock (per match)
const __FILM_IDS = ['t1', 't2', 't3', 't4', 't5', 'lounge', 'prison'];
const __filmOn = () => !!(eA.state && !eA.attract);
function __filmState(st, id) {
  const F = st.__film || (st.__film = {});
  // (from the match's first moment: every film starts when the match starts)
  return F[id] || (F[id] = { base: 0, at: 0, paused: !1, rev: 0 });
}
const __filmRaw = (f, st) => (f.paused ? f.base : f.base + Math.max(0, st.t - f.at));
function __filmPos(id) {
  return __filmOn() ? __filmRaw(__filmState(eA.state, id), eA.state) : null;
}
// op: 0 play, 1 pause, 2 skip by val seconds, 3 from the beginning, 4 go to val seconds
function __filmOp(st, id, op, val = 0) {
  const f = __filmState(st, id),
    now = __filmRaw(f, st),
    dur = (__SCR.durs && __SCR.durs[id]) || 1e9;
  if (op === 0) f.paused && ((f.base = Math.min(now, dur)), (f.at = st.t), (f.paused = !1));
  else if (op === 1) f.paused || ((f.base = Math.min(now, dur)), (f.paused = !0));
  else if (op === 2) (f.base = Math.max(0, Math.min(dur - 1, Math.min(now, dur) + val))), (f.at = st.t);
  else if (op === 3) (f.base = 0), (f.at = st.t);
  else if (op === 4) (f.base = Math.max(0, Math.min(dur - 1, val))), (f.at = st.t);
  f.rev++;
}
// from the control panel: offline and on the host directly; a client asks the host
function __filmDo(id, op, val = 0) {
  const st = eA.state;
  if (!st) return;
  if (st.net && st.net.role === 'client') st.net.actions.push({ kind: 'film', i: __FILM_IDS.indexOf(id), op, val: Math.round(val) });
  __filmOp(st, id, op, val);
}
{
  const coreAct = __bmAction;
  __bmAction = function (A, i, I) {
    if (I && I[1] === 'v') {
      const id = __FILM_IDS[Nw(I[2])];
      id && __filmOp(A, id, Nw(I[3]), Nw(I[4]) || 0);
      return !0;
    }
    return coreAct.apply(this, arguments);
  };
}
// the host sends each film's position; a client follows when it is more than a second and a half off
function __filmPack(A) {
  if (!A.__film) return null;
  const o = {};
  for (const id in A.__film) {
    const f = A.__film[id];
    o[id] = [Math.round(__filmRaw(f, A) * 10), f.paused ? 1 : 0];
  }
  return o;
}
function __filmUnpack(A, o) {
  if (!o || typeof o !== 'object') return;
  for (const id in o) {
    const r = o[id];
    if (!Array.isArray(r)) continue;
    const f = __filmState(A, id),
      pos = Nw(r[0]) / 10,
      paused = Nw(r[1]) === 1;
    if (paused !== f.paused || Math.abs(__filmRaw(f, A) - pos) > 1.5) ((f.base = pos), (f.at = A.t), (f.paused = paused), f.rev++);
  }
}
// ---------------------------------------------------------------- the showings document
function __scrApi() {
  if (__SCR.url) return __SCR.url;
  const o = typeof window < 'u' && window.BP_SHOWINGS_URL;
  return (__SCR.url = o || new URL('/api/showings', location.origin).href);
}
function __scrFetch() {
  if (typeof fetch > 'u') return;
  __SCR.polled = performance.now();
  fetch(__scrApi(), { cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = Date.parse(r.headers.get('date') || '');
      Number.isFinite(d) && Math.abs(d - Date.now()) < 864e5 && (__SCR.skew = d + 500 - Date.now());
      return r.json();
    })
    .then((doc) => {
      if (!doc || !Array.isArray(doc.theaters)) return;
      // the server's own clock (ms) is better than the Date header's whole seconds
      Number.isFinite(doc.serverTime) && Math.abs(doc.serverTime - Date.now()) < 864e5 && (__SCR.skew = doc.serverTime - Date.now());
      const was = __SCR.doc && __SCR.doc.updatedAt;
      __SCR.doc = doc;
      if (was !== doc.updatedAt) {
        __SCR.rev++;
        for (const f of __SCR.subs) f(__SCR.rev);
      }
    })
    .catch(() => {});
}
// ---------------------------------------------------------------- the YouTube IFrame API
function __scrYT(cb) {
  if (__SCR.yt) return cb(__SCR.yt);
  __SCR.ytWait.push(cb);
  if (__SCR.ytWait.length > 1 || typeof document > 'u') return;
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    try {
      prev && prev();
    } catch {}
    __SCR.yt = window.YT;
    const q = __SCR.ytWait.splice(0);
    for (const f of q) f(__SCR.yt);
  };
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.async = !0;
  s.onerror = () => (__SCR.ytFailed = !0);
  document.head.appendChild(s);
}
// the layer behind the canvas the iframes play in
function __scrLayer(gl) {
  const cv = gl.domElement,
    host = cv.parentElement;
  if (!host) return null;
  if (__SCR.layer && __SCR.layer.parentElement === host) return __SCR.layer;
  host.style.isolation = 'isolate';
  const L = document.createElement('div');
  L.className = 'bp-screens';
  L.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:-1;background:#000';
  // a CSS 3D camera (as three.js's CSS3DRenderer): the players are placed in 3D and the browser projects and
  // clips them, so a screen stays right however much of it is in view, even with its corners behind you
  const C = document.createElement('div');
  C.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;pointer-events:none';
  L.appendChild(C);
  __SCR.camEl = C;
  host.prepend(L);
  return (__SCR.layer = L);
}
// ---------------------------------------------------------------- canvas textures: the slate, the still
function __scrSlate(sc, title, sub) {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = Math.max(256, Math.round((1024 * sc.h) / sc.w));
  const c = cv.getContext('2d'),
    W = cv.width,
    H = cv.height;
  const g = c.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, '#1c2233');
  g.addColorStop(1, '#05060a');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.textAlign = 'center';
  c.fillStyle = '#c9a45a';
  c.font = `600 ${Math.round(H * 0.06)}px "Barlow Condensed", "Oswald", sans-serif`;
  c.fillText(String(sub || '').toUpperCase(), W / 2, H * 0.4);
  c.fillStyle = '#f2ead8';
  c.font = `700 ${Math.round(H * 0.11)}px "Barlow Condensed", "Oswald", sans-serif`;
  c.fillText(String(title || '').slice(0, 48), W / 2, H * 0.58);
  const t = new LI(cv);
  t.colorSpace = 'srgb';
  return t;
}
// a YouTube film's still: its largest thumbnail
function __scrStill(sc, s, cb) {
  if (!s.videoId) return cb(null);
  const tryLoad = (q, next) =>
    new jd().setCrossOrigin('anonymous').load(
      `https://i.ytimg.com/vi/${s.videoId}/${q}.jpg`,
      (t) => (t.image && t.image.width <= 120 && next ? (t.dispose(), next()) : ((t.colorSpace = 'srgb'), cb(t))),
      void 0,
      () => (next ? next() : cb(null)),
    );
  tryLoad('maxresdefault', () => tryLoad('hqdefault', null));
}
// ---------------------------------------------------------------- one screen
function __scrMake(def, root) {
  const sc = { def, id: def.id, w: def.w, h: def.h, key: null, s: null, tex: null, still: null, video: null, audio: null, yt: null, ytEl: null, active: !1, seen: 0, vol: 0, hear: def.hear ?? 24, rendered: -1, msg: 0 };
  const ry = def.ry || 0,
    nx = Math.sin(ry),
    nz = Math.cos(ry);
  sc.n = new U(nx, 0, nz);
  sc.c = new U(def.x, def.y, def.z);
  // the picture, a hair in front of the wall: flat, or curved round the audience (def.curve: how far its
  // edges come forward of its middle, metres)
  const g = new uw(),
    hw = def.w / 2,
    hh = def.h / 2,
    sag = def.curve || 0;
  if (sag > 0.01) {
    const Rr = (hw * hw + sag * sag) / (2 * sag),
      tm = Math.asin(hw / Rr),
      n = 48,
      P = [],
      UV = [],
      I = [];
    for (let i = 0; i <= n; i++) {
      const t = -tm + (2 * tm * i) / n,
        x = Rr * Math.sin(t),
        zz = Rr * (1 - Math.cos(t));
      P.push(x, -hh, zz, x, hh, zz);
      UV.push(i / n, 0, i / n, 1);
      i < n && I.push(i * 2, i * 2 + 2, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 1);
    }
    g.setAttribute('position', new gi(new Float32Array(P), 3));
    g.setAttribute('uv', new gi(new Float32Array(UV), 2));
    g.setIndex(I);
  } else {
    g.setAttribute('position', new gi(new Float32Array([-hw, -hh, 0, hw, -hh, 0, hw, hh, 0, -hw, hh, 0]), 3));
    g.setAttribute('uv', new gi(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
  }
  g.computeBoundingSphere();
  sc.mat = new Ni({ color: '#ffffff', toneMapped: !1, fog: !1 });
  sc.matOff = new Ni({ color: '#07080b', toneMapped: !1, fog: !1 });
  // the hole the YouTube player shows through: writes alpha 0 (no blending), so the page behind shows
  sc.matHole = new Ni({ color: '#000000', opacity: 0, transparent: !1, toneMapped: !1, fog: !1 });
  sc.matHole.blending = 0;
  const mesh = (sc.mesh = new Ow(g, sc.matOff));
  mesh.name = 'screen_' + def.id;
  const off = def.frame === 'tv' || def.frame === 'flat' ? 0.07 : 0.012;
  mesh.position.set(def.x + nx * off, def.y, def.z + nz * off);
  mesh.rotation.y = ry;
  mesh.userData.dyn = 1;
  mesh.onBeforeRender = (r, s, cam) => __scrPlace(sc, cam, r);
  root.add(mesh);
  // a cinema screen's edges are feathered: a strip round the picture fading from clear to the black masking
  // (the canvas draws without anti-aliasing, so the curved top edge of a huge screen showed as stair-steps)
  if (def.room) {
    const fw = Math.min(0.32, def.w * 0.012),
      Rr = sag > 0.01 ? (hw * hw + sag * sag) / (2 * sag) : 0,
      tm = Rr ? Math.asin(hw / Rr) : 0,
      n = 48,
      P = [],
      Cc = [],
      I = [],
      at = (x) => (Rr ? Rr - Math.sqrt(Math.max(0, Rr * Rr - x * x)) : 0) + 0.015,
      quad = (a, b, c, d, ia, ib, ic, id) => {
        const k = P.length / 3;
        for (const [q, al] of [[a, ia], [b, ib], [c, ic], [d, id]]) P.push(...q), Cc.push(0, 0, 0, al);
        I.push(k, k + 1, k + 2, k, k + 2, k + 3);
      };
    for (let i = 0; i < n; i++) {
      const x0 = -hw + (2 * hw * i) / n,
        x1 = -hw + (2 * hw * (i + 1)) / n;
      // top and bottom: opaque at the edge, clear fw inside it
      quad([x0, hh - fw, at(x0)], [x1, hh - fw, at(x1)], [x1, hh + 0.02, at(x1)], [x0, hh + 0.02, at(x0)], 0, 0, 1, 1);
      quad([x0, -hh - 0.02, at(x0)], [x1, -hh - 0.02, at(x1)], [x1, -hh + fw, at(x1)], [x0, -hh + fw, at(x0)], 1, 1, 0, 0);
    }
    for (const sd of [-1, 1]) {
      const xo = sd * (hw + 0.02),
        xi = sd * (hw - fw);
      quad([xi, -hh, at(xi)], [xo, -hh, at(xo)], [xo, hh, at(xo)], [xi, hh, at(xi)], 0, 1, 1, 0);
    }
    const g2 = new uw();
    g2.setAttribute('position', new gi(new Float32Array(P), 3));
    g2.setAttribute('color', new gi(new Float32Array(Cc), 4));
    g2.setIndex(I);
    g2.computeBoundingSphere();
    const em = new Ni({ vertexColors: !0, transparent: !1, toneMapped: !1, fog: !1, side: 2 });
    em.blending = 0; // writes its alpha: the picture fades into the masking
    const edge = new Ow(g2, em);
    edge.renderOrder = 1;
    edge.position.copy(mesh.position);
    edge.rotation.copy(mesh.rotation);
    edge.userData.dyn = 1;
    root.add(edge);
    sc.edge = edge;
  }
  // the four corners (world), and slightly larger ones for the iframe (so its edge never shows)
  mesh.updateMatrixWorld(!0);
  // (a curved screen's player is mapped onto its chord: the four corners, at the edges' depth)
  const cn = (k) => [new U(-hw * k, -hh * k, sag), new U(hw * k, -hh * k, sag), new U(hw * k, hh * k, sag), new U(-hw * k, hh * k, sag)].map((v) => v.applyMatrix4(mesh.matrixWorld));
  // (the player is mapped a little larger than the screen: its edges, where YouTube puts its title and logo,
  // fall behind the masking round the screen, as a cinema's masking trims a picture)
  sc.corners = cn(def.room || def.frame === 'flat' ? 1.14 : 1.012);
  (def.frame === 'tv' || def.frame === 'flat') && __scrTV(sc, root);
  return sc;
}
// a large wall-mounted TV: a slim black bezel and a steel wall bracket, behind a protective polycarbonate sheet
function __scrTV(sc, root) {
  const d = sc.def,
    G = new ji(),
    hw = d.w / 2,
    hh = d.h / 2,
    b = 0.05,
    dep = 0.07;
  const bez = new Gw({ color: '#0b0c0e', roughness: 0.35, metalness: 0.4 }),
    steel = new Gw({ color: '#5a6066', roughness: 0.55, metalness: 0.75 }),
    glass = new Gw({ color: '#9fb4c0', roughness: 0.05, metalness: 0.1, transparent: !0, opacity: 0.08, depthWrite: !1 });
  for (const m of [bez, steel]) typeof __prLit == 'function' && __PR.LV && (aw().id === 'prison' || aw().__view) && __prLit(m);
  const box = (w, h, dd, x, y, z, m) => {
    const o = new Ow(new _i(w, h, dd), m);
    o.position.set(x, y, z);
    G.add(o);
    return o;
  };
  // bezel (four bars round the picture) and the back
  box(d.w + b * 2, b, dep, 0, hh + b / 2, -dep / 2 + 0.01, bez);
  box(d.w + b * 2, b * 1.6, dep, 0, -hh - b * 0.8, -dep / 2 + 0.01, bez);
  box(b, d.h, dep, -hw - b / 2, 0, -dep / 2 + 0.01, bez);
  box(b, d.h, dep, hw + b / 2, 0, -dep / 2 + 0.01, bez);
  box(d.w * 0.96, d.h * 0.94, 0.04, 0, 0, -dep + 0.01, bez);
  // the bracket: two uprights and rails to the wall
  for (const x of [-hw * 0.45, hw * 0.45]) box(0.08, d.h * 0.8, 0.06, x, 0, -dep - 0.03, steel);
  for (const y of [-hh * 0.6, hh * 0.6]) box(d.w * 0.6, 0.06, 0.06, 0, y, -dep - 0.08, steel);
  if (d.frame !== 'tv') {
    G.position.set(d.x + Math.sin(d.ry || 0) * dep, d.y, d.z + Math.cos(d.ry || 0) * dep);
    G.rotation.y = d.ry || 0;
    root.add(G);
    return;
  }
  // a cage of flat bars over the screen (it is a prison) and the polycarbonate sheet
  const cg = 0.12;
  box(d.w + 0.3, 0.05, 0.04, 0, hh + 0.12, cg, steel);
  box(d.w + 0.3, 0.05, 0.04, 0, -hh - 0.14, cg, steel);
  box(0.05, d.h + 0.3, 0.04, -hw - 0.13, 0, cg, steel);
  box(0.05, d.h + 0.3, 0.04, hw + 0.13, 0, cg, steel);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) box(0.05, 0.05, cg + dep, sx * (hw + 0.13), sy * (hh + 0.13), (cg - dep) / 2, steel);
  const sheet = box(d.w + 0.22, d.h + 0.22, 0.012, 0, 0, cg - 0.03, glass);
  sheet.renderOrder = 2;
  // a power light
  const led = box(0.03, 0.012, 0.01, hw - 0.12, -hh - b * 0.8, 0.012, new Ni({ color: '#ff3b2f', toneMapped: !1 }));
  led.userData.dyn = 1;
  G.position.set(d.x + Math.sin(d.ry || 0) * dep, d.y, d.z + Math.cos(d.ry || 0) * dep);
  G.rotation.y = d.ry || 0;
  root.add(G);
}
// set (or change) what the screen plays
function __scrApply(sc) {
  const s = __scrShowing(sc.id),
    key = __scrKey(s);
  if (key === sc.key) return;
  __scrStop(sc);
  sc.key = key;
  sc.s = s;
  sc.msg = 0;
  if (!s) {
    sc.tex = __scrSlate(sc, __scrName(sc.id), 'No showing');
    sc.mat.map = sc.tex;
    sc.mat.needsUpdate = !0;
    sc.mesh.material = sc.mat;
    return;
  }
  // until the film is up: its title on a slate
  sc.tex = __scrSlate(sc, s.title || __scrName(sc.id), __scrName(sc.id) + ' · Now showing');
  sc.mat.map = sc.tex;
  sc.mat.needsUpdate = !0;
  sc.mesh.material = sc.mat;
  if (s.kind === 'file' && s.url) __scrFile(sc, s);
  else if (s.kind === 'youtube')
    __scrStill(sc, s, (t) => {
      if (sc.key !== key || !t) return;
      sc.still = t;
      sc.active || ((sc.mat.map = t), (sc.mat.needsUpdate = !0));
    });
}
function __scrStop(sc) {
  if (sc.video) {
    try {
      sc.video.pause();
      sc.video.removeAttribute('src');
      sc.video.load();
    } catch {}
    sc.video = null;
  }
  if (sc.audio) {
    for (const n of sc.audio.nodes)
      try {
        n.disconnect();
      } catch {}
    sc.audio = null;
  }
  __scrYTOff(sc, !0);
  for (const k of ['tex', 'still']) sc[k] && (sc[k].dispose(), (sc[k] = null));
  sc.mat.map = null;
}
// ---------------------------------------------------------------- a video file: texture and positional sound
function __scrFile(sc, s) {
  const v = document.createElement('video');
  v.crossOrigin = 'anonymous';
  v.playsInline = !0;
  v.muted = !0; // until its sound is routed through the game's audio graph
  v.loop = !__filmOn() && s.loop !== !1;
  v.preload = 'auto';
  v.src = new URL(s.url.replace(/^\//, './'), document.baseURI).href;
  sc.video = v;
  const sync = () => {
    if (!v.duration) return;
    const p = __scrPos(s, v.duration);
    Math.abs(v.currentTime - p) > 0.6 && (v.currentTime = p);
  };
  v.addEventListener('loadedmetadata', () => {
    (__SCR.durs || (__SCR.durs = {}))[sc.id] = v.duration;
    sync();
    const t = new IS(v);
    t.colorSpace = 'srgb';
    t.minFilter = t.magFilter = 1006;
    t.generateMipmaps = !1;
    sc.tex && sc.tex.dispose();
    sc.tex = t;
    sc.mat.map = t;
    sc.mat.needsUpdate = !0;
  });
  v.addEventListener('ended', () => s.loop === !1 && (sc.mat.map = sc.still || sc.mat.map));
  sc.sync = sync;
  v.play().catch(() => {});
}
// its sound: element -> gain (level) -> low-pass (walls) -> HRTF panner at the screen -> the game's mix
function __scrAudio(sc) {
  if (sc.audio || !sc.video || !$i || !yC) return;
  try {
    const I = $i,
      src = I.createMediaElementSource(sc.video),
      gain = I.createGain(),
      lp = I.createBiquadFilter(),
      pan = I.createPanner(),
      rv = I.createGain();
    gain.gain.value = 0;
    lp.type = 'lowpass';
    lp.frequency.value = 18e3;
    pan.panningModel = 'HRTF';
    pan.distanceModel = 'inverse';
    pan.refDistance = sc.def.room ? 9 : 3.5;
    pan.rolloffFactor = 1.1;
    pan.maxDistance = 200;
    const p = sc.c.clone().addScaledVector(sc.n, 0.4);
    pan.positionX.value = p.x;
    pan.positionY.value = p.y;
    pan.positionZ.value = p.z;
    // the panner points out of the screen: loudest in front of it, softer behind it
    pan.orientationX.value = sc.n.x;
    pan.orientationY.value = 0;
    pan.orientationZ.value = sc.n.z;
    pan.coneInnerAngle = 200;
    pan.coneOuterAngle = 330;
    pan.coneOuterGain = 0.35;
    rv.gain.value = 0.12;
    src.connect(gain).connect(lp).connect(pan).connect(yC);
    aj && pan.connect(rv).connect(aj);
    sc.audio = { src, gain, lp, pan, rv, nodes: [src, gain, lp, pan, rv] };
    sc.video.muted = !1;
  } catch (e) {
    sc.audioFailed = !0;
  }
}
// ---------------------------------------------------------------- YouTube: a player behind the canvas
function __scrYTOn(sc, gl) {
  const s = sc.s;
  if (!s || s.kind !== 'youtube' || sc.active) return;
  const L = __scrLayer(gl);
  if (!L) return;
  sc.active = !0;
  sc.ytOffAt = 0;
  if (sc.ytEl) return; // still playing (players keep going when you leave): nothing to restart
  // the player's size picks YouTube's quality: 1080p, or 1440p on a large high-density display
  const PW = (window.devicePixelRatio || 1) * (window.innerWidth || 0) >= 2400 ? 2560 : 1920,
    PH = Math.round((PW * sc.h) / sc.w);
  const box = document.createElement('div');
  box.style.cssText = `position:absolute;left:0;top:0;width:${PW}px;height:${PH}px;visibility:hidden;background:#000;pointer-events:none`;
  const inner = document.createElement('div');
  box.appendChild(inner);
  __SCR.camEl.appendChild(box);
  sc.ytEl = box;
  sc.ytPW = PW;
  sc.ytPH = PH;
  sc.ytReady = !1;
  __scrYT((YT) => {
    if (!sc.ytEl || sc.ytEl !== box) return;
    const pv = { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, cc_load_policy: 0, vq: PW > 2000 ? 'hd1440' : 'hd1080', cc_lang_pref: 'zz', hl: 'en', origin: location.origin };
    s.listId ? Object.assign(pv, { listType: 'playlist', list: s.listId, loop: 1 }) : (pv.start = Math.floor(__scrPos(s, 0)));
    sc.yt = new YT.Player(inner, {
      width: PW,
      height: PH,
      videoId: s.videoId || void 0,
      playerVars: pv,
      events: {
        onReady: (e) => {
          sc.ytReady = !0;
          try {
            const p = e.target;
            p.setVolume(0);
            __scrNoCaptions(p);
            p.setPlaybackQuality && p.setPlaybackQuality(PW > 2000 ? 'hd1440' : 'hd1080');
            const dur = p.getDuration();
            dur > 0 && ((__SCR.durs || (__SCR.durs = {}))[sc.id] = dur);
            !s.listId && dur > 0 && p.seekTo(__scrPos(s, dur), !0);
            p.playVideo();
          } catch {}
        },
        onStateChange: (e) => {
          // ended: in a match the film is over (the screen goes to its still); otherwise the next showing starts
          sc.ended = e.data === 0;
          if (e.data === 0 && !__filmOn() && s.loop !== !1 && !s.listId)
            try {
              e.target.seekTo(0, !0), e.target.playVideo();
            } catch {}
          e.data === 1 && ((sc.ytPlaying = !0), (sc.ytPlayAt = performance.now()), __scrNoCaptions(e.target));
          e.data === 3 && (sc.ytPlayAt = performance.now());
        },
        onError: () => (sc.ytError = !0),
      },
    });
  });
}
// no subtitles on the big screen: captions (even ones a video turns on by default) are switched off and their
// module unloaded, every time playback starts
function __scrNoCaptions(p) {
  try {
    p.setOption && p.setOption('captions', 'track', {});
    p.setOption && p.setOption('cc', 'track', {});
    p.unloadModule && (p.unloadModule('captions'), p.unloadModule('cc'));
  } catch {}
}
// out of range: the player keeps playing, silent and out of view (so the film carries on, and is there at once
// when you come back); closed after five minutes, or when a nearer screen needs the slot
function __scrYTOff(sc, kill) {
  if (!sc.ytEl) return;
  sc.active = !1;
  sc.vol = 0;
  sc.ytEl.style.visibility = 'hidden';
  try {
    sc.yt && sc.ytReady && (kill ? sc.yt.destroy() : sc.yt.setVolume(0));
  } catch {}
  if (kill) {
    sc.ytEl.remove();
    sc.ytEl = null;
    sc.yt = null;
    sc.ytReady = !1;
  } else sc.ytOffAt = performance.now();
  sc.mesh.material = sc.mat;
  sc.still && (sc.mat.map = sc.still);
}
// the player's place in 3D: the CSS camera is set from the rendering camera once a frame, each player from its
// screen's plane (on a curved screen, its chord), a little larger than the screen (its edges, where YouTube
// draws its title and logo, fall behind the canvas round the screen)
const __scrE = (v) => (Math.abs(v) < 1e-10 ? 0 : +v.toFixed(10));
const __scrM = new _A();
function __scrCam(cam, r) {
  const C = __SCR.camEl;
  if (!C || __SCR.camFrame === __SCR.frame) return;
  __SCR.camFrame = __SCR.frame;
  const cv = r.domElement,
    W = cv.clientWidth,
    H = cv.clientHeight,
    fov = cam.projectionMatrix.elements[5] * H * 0.5,
    e = cam.matrixWorldInverse.elements;
  C.style.width = W + 'px';
  C.style.height = H + 'px';
  C.style.transform =
    `perspective(${fov}px) translateZ(${fov}px) matrix3d(${[e[0], -e[1], e[2], e[3], e[4], -e[5], e[6], e[7], e[8], -e[9], e[10], e[11], e[12], -e[13], e[14], e[15]].map(__scrE).join(',')}) translate(${W / 2}px,${H / 2}px)`;
}
function __scrPlace(sc, cam, r) {
  sc.rendered = __SCR.frame;
  if (!sc.active || !sc.ytEl) return;
  __scrCam(cam, r);
  if (!sc.cssM) {
    const k = sc.def.room || sc.def.frame === 'flat' ? 1.08 : 1.012,
      M = sc.mesh.matrixWorld.clone(),
      sag = sc.def.curve || 0;
    sc.cssM = M.multiply(new _A().compose(new U(0, 0, sag * 0.55), new Kw(), new U((sc.w * k) / sc.ytPW, (sc.h * k) / sc.ytPH, 1)));
    const e = sc.cssM.elements;
    sc.ytEl.style.transform = `translate(-50%,-50%) matrix3d(${[e[0], e[1], e[2], e[3], -e[4], -e[5], -e[6], -e[7], e[8], e[9], e[10], e[11], e[12], e[13], e[14], e[15]].map(__scrE).join(',')})`;
  }
  sc.ytEl.style.visibility = 'visible';
  // YouTube shows a play icon for a moment whenever playback starts or seeks: the still stays up till it goes;
  // a finished film shows its still
  sc.mesh.material = sc.ytPlaying && !sc.ended && performance.now() - (sc.ytPlayAt || 0) > 1300 ? sc.matHole : sc.mat;
}
// ---------------------------------------------------------------- each frame: who plays, how loud
function __scrTick(list, st) {
  const ear = In.pos,
    now = performance.now(),
    paused = !!eA.paused || (typeof document < 'u' && document.hidden),
    master = paused ? 0 : Math.max(0, Math.min(1, (eA.settings && eA.settings.volume) ?? 1));
  __SCR.frame = (__SCR.frame || 0) + 1;
  const los = __SCR.frame % 8 === 0;
  // which YouTube screens get a player: the room you're in (and only it), else the nearest you can see. A
  // theater's sound stays in it: from inside another theater none reaches you, from a hall only what comes
  // through an open doorway with the screen in view
  const want = [],
    inRoomOf = (R) => !!(R && ear.x >= R.min.x && ear.x <= R.max.x && ear.z >= R.min.z && ear.z <= R.max.z && ear.y >= R.min.y - 0.5 && ear.y <= R.max.y),
    anyRoom = list.some((sc) => inRoomOf(sc.def.room));
  // (+1 for the screen the booth's control panel is working on)
  __SCR.maxYT = (anyRoom ? 1 : 2) + (__SCR.focus ? 1 : 0);
  for (const sc of list) {
    const d = sc.def,
      dist = Math.hypot(ear.x - sc.c.x, ear.y - sc.c.y, ear.z - sc.c.z),
      R = d.room,
      inRoom = inRoomOf(R);
    // in front of the screen?
    const front = (ear.x - sc.c.x) * sc.n.x + (ear.z - sc.c.z) * sc.n.z > -0.2;
    if (los) sc.clear = front && dist < 60 && Pg(ear, sc.c.clone().addScaledVector(sc.n, 0.3), aw().boxes);
    sc.dist = dist;
    sc.inRoom = inRoom;
    // level: full in its room; outside it, by distance, much less through walls
    let lv = 0;
    if (inRoom) lv = 1;
    else if (dist < sc.hear) {
      const f = 1 - dist / sc.hear;
      lv = R ? (anyRoom || !sc.clear ? 0 : f * f * 0.4) : f * f * (sc.clear ? 1 : 0.22);
    }
    sc.anyRoom = anyRoom;
    sc.lv = lv * (sc.s ? sc.s.volume ?? 1 : 0);
    if (sc.s && sc.s.kind === 'youtube' && !__SCR.ytFailed) {
      const score = sc.id === __SCR.focus ? -2e3 : inRoom ? -1e3 + dist : !anyRoom && sc.clear && dist < 40 && sc.rendered >= __SCR.frame - 3 ? dist : 1e9;
      score < 1e9 && want.push([score, sc]);
    }
    // the in-room toast: what's on (once per visit)
    if (inRoom && !sc.toast && sc.s && d.room) {
      sc.toast = 1;
      __scrToast(__scrName(sc.id), sc.s.title, sc.s.channel);
    } else if (!inRoom) sc.toast = 0;
  }
  want.sort((a, b) => a[0] - b[0]);
  const on = new Set(want.slice(0, __SCR.maxYT).map((x) => x[1]));
  for (const sc of list) {
    if (on.has(sc)) __scrYTOn(sc, st.gl);
    else if (sc.active) __scrYTOff(sc, !1);
    // players unused for a minute are closed
    !sc.active && sc.ytEl && sc.ytOffAt && (now - sc.ytOffAt > 3e5 || list.filter((x) => x.ytEl).length > __SCR.maxYT + 2) && __scrYTOff(sc, !0);
    // YouTube: volume (0-100, smoothed, silent out of range); kept on the film clock: paused and resumed with
    // it, moved at once when the booth's panel moves it, corrected if it drifts more than 2 s
    if (sc.yt && sc.ytReady) {
      sc.vol += ((sc.active ? sc.lv * master : 0) - sc.vol) * 0.15;
      if (__SCR.frame % 6 === 0)
        try {
          sc.yt.setVolume(Math.round(sc.vol * 100));
          const ps = sc.yt.getPlayerState ? sc.yt.getPlayerState() : -1,
            f = __filmOn() && eA.state.__film && eA.state.__film[sc.id],
            dur = sc.yt.getDuration();
          ps === 1 && (sc.ytPlaying = !0);
          if (!sc.s.listId) {
            const want = __scrPos(sc.s, dur),
              moved = f && f.rev !== sc.rev;
            moved && (sc.rev = f.rev);
            if (f && f.paused) ps === 1 && sc.yt.pauseVideo();
            else if (dur > 0 && want < dur - 0.5 && (ps === 2 || ps === 0)) (sc.ended = !1), sc.yt.playVideo();
            if (dur > 0 && (moved || __SCR.frame % 60 === 0) && Math.abs(sc.yt.getCurrentTime() - want) > (moved ? 0.4 : 2)) (sc.yt.seekTo(want, !0), (sc.ytPlayAt = performance.now()), (sc.ended = !1));
          }
        } catch {}
      // drawn this frame? (if not, it is out of view: hidden, still playing)
      sc.ytEl && sc.rendered < __SCR.frame - 1 && (sc.ytEl.style.visibility = 'hidden');
    }
    // a video file: sound through the game's graph; paused when nobody is near
    const v = sc.video;
    if (v) {
      __scrAudio(sc);
      // (in a match it plays on wherever you are, paused only by the booth's panel)
      const f = __filmOn() && eA.state.__film && eA.state.__film[sc.id],
        near = __filmOn() || sc.inRoom || sc.dist < Math.max(45, sc.hear * 1.6),
        hold = paused || (f && f.paused);
      if (f && f.rev !== sc.rev) (sc.rev = f.rev), sc.sync && sc.sync();
      if (near && v.paused && !hold && !v.ended) (sc.sync && sc.sync(), v.play().catch(() => {}));
      else if ((!near || hold) && !v.paused) v.pause();
      if (sc.audio) {
        const t = $i.currentTime,
          muffle = !sc.inRoom && !sc.clear;
        // the panner does the fall-off with distance; this adds the walls (and silence far away)
        const g0 = sc.def.room ? (sc.inRoom ? 1 : !sc.anyRoom && sc.clear && sc.dist < sc.hear * 1.5 ? 0.4 : 0) : sc.inRoom ? 1 : sc.dist < sc.hear * 2 ? (muffle ? 0.4 : 1) : 0;
        sc.audio.gain.gain.setTargetAtTime((sc.s.volume ?? 1) * g0, t, 0.12);
        sc.audio.lp.frequency.setTargetAtTime(muffle ? 700 : 18e3, t, 0.12);
      }
      __SCR.frame % 240 === 0 && sc.sync && !v.paused && sc.sync();
    }
  }
}
// a small card when you walk into a theater: what's showing
function __scrToast(name, title, channel) {
  if (typeof document > 'u') return;
  let el = document.getElementById('bp-nowshowing');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bp-nowshowing';
    el.style.cssText =
      'position:fixed;left:50%;top:13%;transform:translate(-50%,-8px);padding:10px 22px 12px;border-radius:6px;background:linear-gradient(180deg,rgba(18,14,10,.86),rgba(8,6,4,.86));border:1px solid rgba(201,164,90,.55);box-shadow:0 8px 30px rgba(0,0,0,.45);color:#f2ead8;text-align:center;font-family:"Barlow Condensed","Oswald",sans-serif;pointer-events:none;opacity:0;transition:opacity .35s,transform .35s;z-index:40';
    document.body.appendChild(el);
  }
  const esc = (x) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  el.innerHTML = `<div style="font-size:12px;letter-spacing:.28em;color:#c9a45a;text-transform:uppercase">${esc(name)} · Now showing</div><div style="font-size:24px;font-weight:700;letter-spacing:.02em;margin-top:2px">${esc(title)}</div>${channel ? `<div style="font-size:13px;opacity:.7;margin-top:1px">${esc(channel)}</div>` : ''}`;
  el.style.opacity = '1';
  el.style.transform = 'translate(-50%,0)';
  clearTimeout(__SCR.toastT);
  __SCR.toastT = setTimeout(() => ((el.style.opacity = '0'), (el.style.transform = 'translate(-50%,-8px)')), 4200);
}
// ---------------------------------------------------------------- with the map's tree layer
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw(),
      defs = m.screens,
      on = !!(defs && defs.length),
      [rev, setRev] = S.useState(__SCR.rev),
      st = S.useRef(null);
    S.useEffect(() => {
      if (!on) return;
      __SCR.subs.add(setRev);
      __scrFetch();
      return () => __SCR.subs.delete(setRev);
    }, [on]);
    // the screens, once per map
    const root = S.useMemo(() => {
      if (!on || typeof document > 'u') return null;
      const g = new ji();
      g.name = 'bp-screens';
      const list = [];
      for (const d of defs)
        try {
          list.push(__scrMake(d, g));
        } catch (e) {
          console.warn('[screens]', d.id, e);
        }
      g.userData.list = list;
      return g;
    }, [on, m]);
    // the showings: applied when the document changes
    S.useEffect(() => {
      if (!root) return;
      for (const sc of root.userData.list) __scrApply(sc);
    }, [root, rev]);
    S.useEffect(
      () => () => {
        if (!root) return;
        for (const sc of root.userData.list) {
          __scrStop(sc);
          for (const k of ['mat', 'matOff', 'matHole']) sc[k].dispose();
        }
        root.traverse((o) => {
          if (!o.isMesh) return;
          o.geometry.dispose();
          for (const mt of [].concat(o.material)) mt && mt.dispose && mt.dispose();
        });
        __SCR.live = [];
      },
      [root],
    );
    QI((s) => {
      if (!root) return;
      st.current = s;
      __SCR.live = root.userData.list;
      try {
        __scrTick(root.userData.list, s);
      } catch (e) {
        __SCR.err = String(e && e.stack);
      }
      // the lineup is checked every 20 s (so the dashboard's changes reach a match in progress)
      performance.now() - __SCR.polled > 2e4 && __scrFetch();
    });
    return M.jsxs(M.Fragment, { children: [M.jsx(prevTrees, {}), root ? M.jsx('primitive', { object: root }, 'scr') : null] });
  };
}
typeof window < 'u' &&
  (window.__bpScreens = () => ({
    doc: __SCR.doc,
    skew: __SCR.skew,
    err: __SCR.err,
    yt: !!__SCR.yt,
    screens: __SCR.live.map((sc) => ({ id: sc.id, kind: sc.s && sc.s.kind, title: sc.s && sc.s.title, active: sc.active, playing: !!sc.ytPlaying, lv: +(sc.lv || 0).toFixed(2), vol: +(sc.vol || 0).toFixed(2), dist: +(sc.dist || 0).toFixed(1), inRoom: sc.inRoom, clear: sc.clear, video: sc.video ? { t: +sc.video.currentTime.toFixed(1), paused: sc.video.paused, muted: sc.video.muted } : null, audio: !!sc.audio })),
  }));
