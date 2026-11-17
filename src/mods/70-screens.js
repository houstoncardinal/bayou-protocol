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
  lounge: { name: 'The Starlight', showing: { kind: 'youtube', videoId: '7AkbUfZjS5k', title: 'Virtual Nature 360° · Nature Meditation', channel: 'ECOVR', projection: '360' } },
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
// ---------------------------------------------------------------- the Starlight's dome
// def.dome: { cx, cz, base, eye, rx, rz, top, front, door: { yaw, half, h } }: half an ellipsoid over the floor
// (rx, rz across, top high), seen from the eye point (cx, base + eye, cz). Built as a grid of directions from
// that eye point (yaw across, elevation up): each vertex is where that direction meets the dome, so a 360° film
// mapped by direction (equirectangular) is right from the middle of the room. The doorway is left open.
//   - a YouTube 360°/VR video: the dome is a hole (as the flat screens are) and the player behind the canvas
//     fills the window, YouTube's own 360° view turned every frame to where the camera looks
//   - a 360°/180° video file (mono, or stereo top/bottom or side by side): drawn on the dome as its texture
const __scrYaw = (y) => Math.atan2(Math.sin(y), Math.cos(y));
function __scrDomeGeo(sc, g) {
  const D = sc.def.dome,
    NA = 128,
    NE = D.sphere ? 72 : 40,
    E0 = D.sphere ? -Math.PI / 2 : (-14 * Math.PI) / 180,
    ex = D.cx,
    ey = D.base + D.eye,
    ez = D.cz,
    P = [],
    UV = [],
    A = [],
    EL = [],
    Cc = [],
    I = [];
  for (let j = 0; j <= NE; j++) {
    const e = E0 + ((Math.PI / 2 - E0) * j) / NE;
    for (let i = 0; i <= NA; i++) {
      const a = -Math.PI + (2 * Math.PI * i) / NA,
        yaw = D.front + a,
        dx = -Math.sin(yaw) * Math.cos(e),
        dy = Math.sin(e),
        dz = -Math.cos(yaw) * Math.cos(e),
        // where the ray from the eye meets the ellipsoid ((x-cx)/rx)^2 + ((y-base)/top)^2 + ((z-cz)/rz)^2 = 1
        ox = 0,
        oy = D.eye / D.top,
        oz = 0,
        Dx = dx / D.rx,
        Dy = dy / D.top,
        Dz = dz / D.rz,
        qa = Dx * Dx + Dy * Dy + Dz * Dz,
        qb = 2 * (ox * Dx + oy * Dy + oz * Dz),
        qc = ox * ox + oy * oy + oz * oz - 1;
      let t = (-qb + Math.sqrt(Math.max(0, qb * qb - 4 * qa * qc))) / (2 * qa),
        y = ey + dy * t;
      // a sphere: an ellipsoid centred on the eye (its own height above and below); a dome: down to the
      // floor's edge (under the floor, out of sight)
      if (D.sphere) (t = 1 / Math.sqrt((dx / D.rx) ** 2 + (dy / (dy >= 0 ? D.top : D.bottom)) ** 2 + (dz / D.rz) ** 2)), (y = ey + dy * t);
      else if (y < D.base) (t = (D.base - ey) / dy), (y = D.base);
      P.push(ex + dx * t, y, ez + dz * t);
      UV.push(0.5 - a / (2 * Math.PI), 0.5 + e / Math.PI);
      A.push(a);
      EL.push(e);
      Cc.push(1, 1, 1);
    }
  }
  const W = NA + 1,
    door = D.door;
  for (let j = 0; j < NE; j++)
    for (let i = 0; i < NA; i++) {
      const k = j * W + i;
      if (door) {
        const am = D.front + (A[k] + A[k + 1]) / 2,
          yMin = Math.min(P[k * 3 + 1], P[(k + W) * 3 + 1]),
          yMax = Math.max(P[k * 3 + 1], P[(k + W) * 3 + 1]);
        // (the doorway runs from the floor up: a sphere's surface below the floor stays closed)
        if (Math.abs(__scrYaw(am - door.yaw)) < door.half && yMin < door.h && yMax > D.base - 0.25) continue;
      }
      I.push(k, k + W, k + 1, k + 1, k + W, k + W + 1);
    }
  g.setAttribute('position', new gi(new Float32Array(P), 3));
  g.setAttribute('uv', new gi(new Float32Array(UV), 2));
  g.setAttribute('color', new gi(new Float32Array(Cc), 3));
  g.setIndex(I);
  sc.domeA = A;
  sc.domeE = EL;
}
// a dome's mapping for a film: 360° (all round) or 180° (VR180: the front half, black behind)
function __scrDomeMap(sc, s) {
  const g = sc.mesh.geometry,
    uv = g.attributes.uv,
    col = g.attributes.color,
    half = s && s.kind === 'file' && s.projection === '180';
  for (let k = 0; k < sc.domeA.length; k++) {
    const a = sc.domeA[k],
      e = sc.domeE[k];
    uv.setXY(k, half ? Math.min(1, Math.max(0, 0.5 - a / Math.PI)) : 0.5 - a / (2 * Math.PI), 0.5 + e / Math.PI);
    const f = half ? Math.min(1, Math.max(0, (Math.PI / 2 + 0.08 - Math.abs(a)) / 0.16)) : 1;
    col.setXYZ(k, f, f, f);
  }
  uv.needsUpdate = col.needsUpdate = !0;
}
// a stereo VR file: one eye's half of each frame (the left: the top, or the left side)
function __scrDomeEye(sc, t, s) {
  const st = s && s.stereo;
  t.repeat.set(st === 'sbs' ? 0.5 : 1, st === 'tb' ? 0.5 : 1);
  t.offset.set(0, st === 'tb' ? 0.5 : 0);
}
// the dome when no film is up: a night sky (equirectangular), the film's title at the front
function __scrDomeSky(title, sub) {
  const cv = document.createElement('canvas');
  cv.width = 2048;
  cv.height = 1024;
  const c = cv.getContext('2d'),
    W = cv.width,
    H = cv.height;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#02030a');
  g.addColorStop(0.42, '#0a1230');
  g.addColorStop(0.5, '#1a2550');
  g.addColorStop(0.56, '#0b1128');
  g.addColorStop(1, '#03040a');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // the Milky Way: a soft band across the sky
  for (let i = 0; i < 900; i++) {
    const u = Math.random(),
      v = 0.22 + 0.16 * Math.sin(u * Math.PI * 2) + (Math.random() - 0.5) * 0.12,
      r = 8 + Math.random() * 40,
      gr = c.createRadialGradient(u * W, v * H, 0, u * W, v * H, r);
    gr.addColorStop(0, `rgba(${150 + Math.random() * 60},${150 + Math.random() * 50},255,0.035)`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.fillRect(u * W - r, v * H - r, r * 2, r * 2);
  }
  // stars, thinning towards the horizon (the poles' rows are wide on the canvas: fewer there)
  for (let i = 0; i < 5200; i++) {
    const v = Math.random() * 0.56,
      u = Math.random(),
      lat = (0.5 - v) * Math.PI;
    if (Math.random() > Math.cos(lat) + 0.05) continue;
    const b = Math.random(),
      r = b > 0.985 ? 2.2 : b > 0.9 ? 1.4 : 0.8;
    c.fillStyle = `rgba(${220 + Math.random() * 35},${225 + Math.random() * 30},255,${0.35 + Math.random() * 0.65})`;
    c.beginPath();
    c.arc(u * W, v * H, r, 0, Math.PI * 2);
    c.fill();
  }
  c.textAlign = 'center';
  // (the canvas wraps 360°: 30 px of it is about 5° of sky; the title sits 30° up, over the seats' view ahead)
  c.fillStyle = '#9fb6ff';
  c.font = '600 15px "Barlow Condensed", "Oswald", sans-serif';
  c.fillText(String(sub || '').toUpperCase(), W / 2, H * 0.305);
  c.fillStyle = '#f2ead8';
  c.font = '700 30px "Barlow Condensed", "Oswald", sans-serif';
  c.fillText(String(title || '').slice(0, 60), W / 2, H * 0.335);
  const t = new LI(cv);
  t.colorSpace = 'srgb';
  return t;
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
  // edges come forward of its middle, metres), or bowed (def.bow), or a dome round you (def.dome)
  const g = new uw(),
    hw = def.w / 2,
    hh = def.h / 2,
    sag = def.curve || 0,
    // a bowed screen: flat (so YouTube's flat player stays locked to it), its top and bottom edges curving out
    // towards the sides, the way a huge curved screen looks from the seats: the picture's half-height at x
    bow = def.bow || 0,
    yT = (x) => hh - bow * (1 - (x / hw) ** 2);
  sag > 0.01 && (sc.arcW = 2 * ((hw * hw + sag * sag) / (2 * sag)) * Math.asin(Math.min(1, hw / ((hw * hw + sag * sag) / (2 * sag)))));
  if (def.dome) __scrDomeGeo(sc, g);
  else if (bow > 0.01) {
    const n = 64,
      P = [],
      UV = [],
      I = [];
    for (let i = 0; i <= n; i++) {
      const x = -hw + (2 * hw * i) / n,
        t = yT(x);
      P.push(x, -t, 0, x, t, 0);
      UV.push(i / n, (hh - t) / def.h, i / n, (hh + t) / def.h);
      i < n && I.push(i * 2, i * 2 + 2, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 1);
    }
    g.setAttribute('position', new gi(new Float32Array(P), 3));
    g.setAttribute('uv', new gi(new Float32Array(UV), 2));
    g.setIndex(I);
  } else if (sag > 0.01) {
    const Rr = (hw * hw + sag * sag) / (2 * sag),
      tm = Math.asin(hw / Rr),
      n = 128, // (a deep curve: smooth from the front rows)
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
  sc.mat = new Ni({ color: '#ffffff', toneMapped: !1, fog: !1, vertexColors: !!def.dome });
  sc.matOff = new Ni({ color: '#07080b', toneMapped: !1, fog: !1 });
  // the hole the YouTube player shows through: writes alpha 0 (no blending), so the page behind shows
  sc.matHole = new Ni({ color: '#000000', opacity: 0, transparent: !1, toneMapped: !1, fog: !1 });
  sc.matHole.blending = 0;
  // (a dome is seen from inside only: from the vestibule outside it is the dark wall it should be)
  def.dome && (sc.mat.side = sc.matOff.side = sc.matHole.side = 0);
  const mesh = (sc.mesh = new Ow(g, sc.matOff));
  // the dome's outside: the same shell, dark, seen only from outside (from the vestibule it is a wall)
  if (def.dome) {
    const shell = new Ow(g, new Ni({ color: '#06070c', side: 1, fog: !1 }));
    shell.name = 'screen_dome_shell';
    root.add(shell);
  }
  // a dome's fallback for a film that isn't 360°: a flat screen at the dome's front, where the YouTube player is
  // placed as on the flat screens (hidden unless needed)
  if (def.dome) {
    const D = def.dome,
      fw = D.flatW || 11,
      fh = (fw * 9) / 16,
      fg = new uw();
    fg.setAttribute('position', new gi(new Float32Array([-fw / 2, -fh / 2, 0, fw / 2, -fh / 2, 0, fw / 2, fh / 2, 0, -fw / 2, fh / 2, 0]), 3));
    fg.setAttribute('uv', new gi(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    fg.setIndex([0, 1, 2, 0, 2, 3]);
    fg.computeBoundingSphere();
    const fm = (sc.flatMesh = new Ow(fg, sc.matHole)),
      fd = D.flatAt || 6.7;
    fm.position.set(D.cx - Math.sin(D.front) * fd, D.base + (D.flatY || 5), D.cz - Math.cos(D.front) * fd);
    fm.rotation.y = D.front;
    fm.visible = !1;
    fm.userData.dyn = 1;
    fm.renderOrder = 2;
    root.add(fm);
    sc.flatW = fw;
    sc.flatH = fh;
  }
  mesh.name = 'screen_' + def.id;
  const off = def.frame === 'tv' || def.frame === 'flat' ? 0.07 : 0.012;
  // (a dome's geometry is built in world space)
  def.dome || (mesh.position.set(def.x + nx * off, def.y, def.z + nz * off), (mesh.rotation.y = ry));
  mesh.userData.dyn = 1;
  mesh.onBeforeRender = (r, s, cam) => __scrPlace(sc, cam, r);
  root.add(mesh);
  // no frame: the picture runs to the screen's edge, which is the wall's. Only a hairline there (5 cm, a pixel or
  // two from the seats) fades the picture into the black, so the edge is smooth instead of stair-stepped (the
  // canvas draws without anti-aliasing)
  if (def.room && !def.dome) {
    const fw = 0.09,
      P = [],
      Cc = [],
      I = [],
      quad = (a, b, c, d, ia, ib, ic, id) => {
        const k = P.length / 3;
        for (const [q, al] of [[a, ia], [b, ib], [c, ic], [d, id]]) P.push(...q), Cc.push(0, 0, 0, al);
        I.push(k, k + 1, k + 2, k, k + 2, k + 3);
      },
      // (on a curved screen the strip follows the arc: its depth at x, a hair in front of the picture)
      Rc = sag > 0.01 ? (hw * hw + sag * sag) / (2 * sag) : 0,
      zAt = (x) => (Rc ? Rc - Math.sqrt(Math.max(0, Rc * Rc - Math.min(hw, Math.abs(x)) ** 2)) : 0) + 0.004;
    // (along the top and bottom edges, following the bow or the curve)
    for (let i = 0, n = bow > 0.01 || Rc ? 96 : 1; i < n; i++) {
      const xa = -hw + (2 * hw * i) / n,
        xb = -hw + (2 * hw * (i + 1)) / n,
        ta = yT(xa),
        tb = yT(xb),
        za = zAt(xa),
        zb = zAt(xb);
      quad([xa, ta - fw, za], [xb, tb - fw, zb], [xb, tb + 0.01, zb], [xa, ta + 0.01, za], 0, 0, 1, 1);
      quad([xa, -ta - 0.01, za], [xb, -tb - 0.01, zb], [xb, -tb + fw, zb], [xa, -ta + fw, za], 1, 1, 0, 0);
    }
    for (const sd of [-1, 1]) {
      const xo = sd * (hw + 0.01),
        xi = sd * (hw - fw),
        // (a curved screen's ends: the strip turns with the arc, so it lies on the picture)
        zi = zAt(xi),
        zo = zAt(hw) + (Rc ? 0.01 : 0);
      quad([xi, -hh, zi], [xo, -hh, zo], [xo, hh, zo], [xi, hh, zi], 0, 1, 1, 0);
    }
    const g2 = new uw();
    g2.setAttribute('position', new gi(new Float32Array(P), 3));
    g2.setAttribute('color', new gi(new Float32Array(Cc), 4));
    g2.setIndex(I);
    g2.computeBoundingSphere();
    const em = new Ni({ vertexColors: !0, transparent: !1, toneMapped: !1, fog: !1, side: 2 });
    em.blending = 0; // writes its alpha
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
  // the film's shape (a widescreen film inside a 16:9 YouTube video: set in /admin) only re-places the player
  const asp = (s && s.aspect) || 0;
  asp !== sc.aspect && ((sc.aspect = asp), (sc.cssM = null));
  if (key === sc.key) return;
  __scrStop(sc);
  sc.key = key;
  sc.s = s;
  sc.msg = 0;
  sc.def.dome && __scrDomeMap(sc, s);
  if (!s) {
    sc.tex = sc.def.dome ? __scrDomeSky(__scrName(sc.id), 'No showing') : __scrSlate(sc, __scrName(sc.id), 'No showing');
    sc.mat.map = sc.tex;
    sc.mat.needsUpdate = !0;
    sc.mesh.material = sc.mat;
    return;
  }
  // until the film is up: its title on a slate
  sc.tex = sc.def.dome ? __scrDomeSky(s.title || __scrName(sc.id), __scrName(sc.id) + ' · 360° · Now showing') : __scrSlate(sc, s.title || __scrName(sc.id), __scrName(sc.id) + ' · Now showing');
  sc.mat.map = sc.tex;
  sc.mat.needsUpdate = !0;
  sc.mesh.material = sc.mat;
  if (s.kind === 'file' && s.url) __scrFile(sc, s);
  // (a dome keeps its sky till the player is up: a 360° film's thumbnail is a flat crop)
  else if (s.kind === 'youtube' && !sc.def.dome)
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
// ---------------------------------------------------------------- a cinema screen's picture fills it
// A video file is cropped to cover the screen edge to edge (its shape kept): black bars baked into the file
// (a widescreen film inside a 16:9 frame) are found by sampling a small copy of the frame every few seconds
// (each bar: the smallest seen over the last few samples, so a dark scene doesn't count as a bar).
function __scrFit(sc, v, t) {
  const cv = document.createElement('canvas'),
    W = 64,
    H = 36,
    hist = [];
  cv.width = W;
  cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: !0 }),
    apply = (bt, bb, bl, br) => {
      const vw = v.videoWidth || 16,
        vh = v.videoHeight || 9,
        fw = 1 - bl - br,
        fh = 1 - bt - bb,
        ca = (fw * vw) / (fh * vh),
        sa = (sc.arcW || sc.w) / sc.h;
      let rx = fw,
        ry = fh;
      ca > sa ? (rx = fw * (sa / ca)) : (ry = fh * (ca / sa));
      t.repeat.set(rx, ry);
      t.offset.set(bl + (fw - rx) / 2, bb + (fh - ry) / 2);
    },
    look = () => {
      if (!sc.video || sc.video !== v) return clearInterval(iv);
      if (v.readyState < 2 || v.paused) return;
      try {
        cx.drawImage(v, 0, 0, W, H);
        const d = cx.getImageData(0, 0, W, H).data,
          lum = (i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2],
          rowDark = (y) => {
            for (let x = 0; x < W; x++) if (lum((y * W + x) * 4) > 26) return !1;
            return !0;
          },
          _ = 0;
        // letterbox bars only (top and bottom, the same height: that's how a widescreen film sits in a 16:9
        // file); a dark scene's edges are not bars, so they must match and hold over several samples
        let t0 = 0,
          b0 = 0;
        const cap = Math.floor(H * 0.16);
        while (t0 <= cap && rowDark(t0)) t0++;
        while (b0 <= cap && rowDark(H - 1 - b0)) b0++;
        // (a frame bright right to its top or bottom edge says there are no bars; a frame dark past the bars or
        // dark on one side only says nothing, and is skipped)
        if (t0 && b0 && (t0 > cap || b0 > cap || Math.abs(t0 - b0) > 1)) return;
        hist.push(Math.min(t0, b0));
        hist.length > 6 && hist.shift();
        if (hist.length < 3) return;
        const m = Math.min(...hist),
          f = m ? (m + 0.6) / H : 0;
        apply(f, f, 0, 0);
      } catch (e) {
        clearInterval(iv);
      }
    },
    iv = setInterval(look, 2500);
  apply(0, 0, 0, 0);
  setTimeout(look, 600);
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
    sc.def.dome ? __scrDomeEye(sc, t, s) : sc.def.room && __scrFit(sc, v, t);
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
    pan.refDistance = sc.def.dome ? 40 : sc.def.room ? 9 : 3.5;
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
    pan.coneInnerAngle = sc.def.dome ? 360 : 200;
    pan.coneOuterAngle = sc.def.dome ? 360 : 330;
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
  const dome = !!sc.def.dome,
    cvEl = gl.domElement,
    // (a cinema screen on a large high-density display gets a 4K player: YouTube picks its quality by the
    // player's size, and these screens fill most of the view)
    hiDPI = (window.devicePixelRatio || 1) * (window.innerWidth || 0),
    PW = dome ? Math.round((cvEl.clientWidth || innerWidth) * __SCR_DOME_K) : sc.def.room && hiDPI >= 2800 ? 3840 : hiDPI >= 2400 ? 2560 : 1920,
    PH = dome ? Math.round((cvEl.clientHeight || innerHeight) * __SCR_DOME_K) : Math.round((PW * 9) / 16); // 16:9, as YouTube's films are: scaled to cover the screen (below)
  const box = document.createElement('div');
  // (a dome's player is not placed in 3D: it fills the window, a little over (its corners, where YouTube puts
  // its 360° badge, fall outside), and YouTube turns its view to match the camera)
  box.style.cssText = dome
    ? `position:absolute;left:${-Math.round((PW - (cvEl.clientWidth || innerWidth)) / 2)}px;top:${-Math.round((PH - (cvEl.clientHeight || innerHeight)) / 2)}px;width:${PW}px;height:${PH}px;visibility:hidden;background:#000;pointer-events:none`
    : `position:absolute;left:0;top:0;width:${PW}px;height:${PH}px;visibility:hidden;background:#000;pointer-events:none`;
  const inner = document.createElement('div');
  box.appendChild(inner);
  (dome ? L : __SCR.camEl).appendChild(box);
  sc.ytEl = box;
  sc.ytPW = PW;
  sc.ytPH = PH;
  sc.ytReady = !1;
  __scrYT((YT) => {
    if (!sc.ytEl || sc.ytEl !== box) return;
    const pv = { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, cc_load_policy: 0, vq: dome ? 'hd2160' : PW > 3000 ? 'hd2160' : PW > 2000 ? 'hd1440' : 'hd1080', cc_lang_pref: 'zz', hl: 'en', origin: location.origin };
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
            p.setPlaybackQuality && p.setPlaybackQuality(dome ? 'hd2160' : PW > 3000 ? 'hd2160' : PW > 2000 ? 'hd1440' : 'hd1080');
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
  sc.flatMesh && ((sc.flatMesh.visible = !1), kill && ((sc.domeFlat = !1), (sc.domeMode = null)));
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
const __SCR_DOME_K = 1.1;
// the dome's player box: the window's size and a little over, centred on it
function __scrDomeBox(sc, W, H) {
  const K = __SCR_DOME_K,
    PW = Math.round(W * K),
    PH = Math.round(H * K),
    b = sc.ytEl;
  b.style.left = -Math.round((PW - W) / 2) + 'px';
  b.style.top = -Math.round((PH - H) / 2) + 'px';
  b.style.width = PW + 'px';
  b.style.height = PH + 'px';
  try {
    sc.yt && sc.ytReady && sc.yt.setSize(PW, PH);
  } catch {}
}
// the dome's player: kept the window's size; YouTube's 360° view turned to the camera's yaw and pitch (both
// count up turning left and looking up, as the game's do), its field of view the camera's across the window's
// longer side, widened for the player's overscan. A video that turns out not to be 360° keeps the sky up.
function __scrPlaceDome(sc, cam, r) {
  const cv = r.domElement,
    W = cv.clientWidth,
    H = cv.clientHeight,
    K = __SCR_DOME_K;
  if (sc.yt && sc.ytReady && !sc.domeFlat && (sc.domeW !== W || sc.domeH !== H)) {
    sc.domeW = W;
    sc.domeH = H;
    __scrDomeBox(sc, W, H);
  }
  sc.ytEl.style.visibility = 'visible';
  let sph = !1;
  if (sc.yt && sc.ytReady && sc.yt.setSphericalProperties && sc.domeMode !== 'flat')
    try {
      const sp = sc.yt.getSphericalProperties && sc.yt.getSphericalProperties();
      sph = !!(sp && typeof sp.yaw === 'number');
      sph && (sc.domeMode = '360');
      if (sph) {
        const d = cam.getWorldDirection(__scrV),
          yaw = Math.atan2(-d.x, -d.z),
          pitch = Math.asin(Math.max(-1, Math.min(1, d.y))),
          vf = (cam.fov * Math.PI) / 180,
          // the camera's field across the window's longer side, then across the (larger) player's
          f = W >= H ? 2 * Math.atan(Math.tan(vf / 2) * (W / H)) : vf,
          fk = 2 * Math.atan(Math.tan(f / 2) * K),
          deg = 180 / Math.PI,
          y = ((((yaw - sc.def.dome.front) * deg) % 360) + 360) % 360,
          o = { yaw: y, pitch: pitch * deg, roll: 0, fov: Math.max(30, Math.min(120, fk * deg)) },
          L = sc.domeLast;
        // (only when it changes: each call is a message to the player's frame)
        if (!L || Math.abs(L.yaw - o.yaw) > 0.05 || Math.abs(L.pitch - o.pitch) > 0.05 || Math.abs(L.fov - o.fov) > 0.05) {
          sc.yt.setSphericalProperties(o);
          sc.domeLast = o;
        }
      }
    } catch {}
  // not a 360° video (YouTube gives it no view to turn): it plays on the flat screen at the dome's front. Decided
  // once per player: a 360° film reports no view for its first moments, and moving the player back and forth
  // between the two placements every frame stalled the page; it is flat only after 5 s of playing with no view.
  !sc.domeMode && sc.ytPlaying && !sph && performance.now() - (sc.ytPlayAt || 0) > 5000 && (sc.domeMode = 'flat');
  const flat = sc.domeMode === 'flat';
  if (flat !== !!sc.domeFlat) {
    sc.domeFlat = flat;
    const b = sc.ytEl,
      FW = 1920,
      FH = 1080;
    if (flat) {
      __SCR.camEl.appendChild(b);
      b.style.left = b.style.top = '0';
      b.style.width = FW + 'px';
      b.style.height = FH + 'px';
      try {
        sc.yt.setSize(FW, FH);
      } catch {}
      const u = Math.max(sc.flatW / FW, sc.flatH / FH) * 1.04,
        e = sc.flatMesh.matrixWorld.clone().multiply(new _A().compose(new U(), new Kw(), new U(u, u, 1))).elements;
      b.style.transform = `translate(-50%,-50%) matrix3d(${[e[0], e[1], e[2], e[3], -e[4], -e[5], -e[6], -e[7], e[8], e[9], e[10], e[11], e[12], e[13], e[14], e[15]].map(__scrE).join(',')})`;
    } else {
      __SCR.layer.appendChild(b);
      b.style.transform = '';
      sc.domeW = 0;
    }
  }
  sc.flatMesh.visible = flat;
  flat && __scrCam(cam, r);
  sc.mesh.material = sc.domeMode === '360' && sc.ytPlaying && !sc.ended && performance.now() - (sc.ytPlayAt || 0) > 1300 ? sc.matHole : sc.mat;
}
const __scrV = new U();
function __scrPlace(sc, cam, r) {
  sc.rendered = __SCR.frame;
  if (!sc.active || !sc.ytEl) return;
  if (sc.def.dome) return __scrPlaceDome(sc, cam, r);
  __scrCam(cam, r);
  if (!sc.cssM) {
    // the player covers the screen (one scale for both axes, so the picture keeps its shape: what overhangs is
    // cropped by the hole), a little over, so its edges (YouTube's title and logo) fall outside the picture
    const k = sc.def.room || sc.def.frame === 'flat' ? 1.06 : 1.012,
      M = sc.mesh.matrixWorld.clone(),
      sag = sc.def.curve || 0,
      // (a widescreen film inside the 16:9 video: the picture is ytPW wide and ytPW / aspect high, between black
      // bars: scaled so that picture covers the screen, the bars fall outside it)
      asp = sc.aspect > 16 / 9 + 0.01 ? sc.aspect : 0,
      u = sc.def.room ? Math.max(sc.w / sc.ytPW, sc.h / (asp ? sc.ytPW / asp : sc.ytPH)) * (sag > 0.01 ? 1.015 : k) : 0;
    // (a curved screen's player lies on its chord, the plane through its two ends: there the picture and the
    // player meet exactly from any seat, and in between the player is seen through the curve, so no edge of it
    // ever shows; the old placement half-way into the curve let its edges show as glowing borders)
    sc.cssM = M.multiply(new _A().compose(new U(0, 0, sag), new Kw(), u ? new U(u, u, 1) : new U((sc.w * k) / sc.ytPW, (sc.h * k) / sc.ytPH, 1)));
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
    const front = !!d.dome || (ear.x - sc.c.x) * sc.n.x + (ear.z - sc.c.z) * sc.n.z > -0.2;
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
    __live: __SCR.live,
    screens: __SCR.live.map((sc) => ({ id: sc.id, kind: sc.s && sc.s.kind, title: sc.s && sc.s.title, active: sc.active, playing: !!sc.ytPlaying, lv: +(sc.lv || 0).toFixed(2), vol: +(sc.vol || 0).toFixed(2), dist: +(sc.dist || 0).toFixed(1), inRoom: sc.inRoom, clear: sc.clear, video: sc.video ? { t: +sc.video.currentTime.toFixed(1), paused: sc.video.paused, muted: sc.video.muted, crop: sc.tex && sc.tex.repeat ? [+sc.tex.repeat.x.toFixed(3), +sc.tex.repeat.y.toFixed(3)] : null } : null, audio: !!sc.audio })),
  }));
