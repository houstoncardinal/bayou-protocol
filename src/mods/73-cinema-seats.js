/* ===== Bayou Protocol mod: sitting down in the cinema ===== */
// Walk up to any seat in Bayou Palace Cinemas (the theaters' rockers, the Velvet Room's recliners) and press Use
// (E or F) to sit; press it again to stand. Seated, you watch like anyone in the audience: the view drops to a
// seated eye height facing the screen, you can look round freely, your gun and most of the HUD are put away, and
// the film's sound is the room's own. Doors and a planted bomb nearby keep the Use key (opening, defusing).
// Standing up puts you in the legroom in front of the seat. Death, a new round or leaving the map stands you up.
const __SEAT = { list: null, map: null, on: null, near: null, prompt: null, scanAt: 0 };
// every seat of the map: its centre, the floor it stands on, which way it faces, where you stand up
function __seatList(m) {
  if (__SEAT.map === m) return __SEAT.list;
  __SEAT.map = m;
  const out = [];
  for (const b of (m.__cn && m.__cn.seats) || []) {
    // a row given seat by seat (the Velvet Room's curved rows): each seat's front edge and the way it faces;
    // you sit 0.38 m back from the front edge and stand up 0.55 m in front of it
    if (b.list) {
      for (const s of b.list) {
        const fx = -Math.sin(s.yaw),
          fz = -Math.cos(s.yaw);
        out.push({ x: s.x - fx * 0.38, y: b.y, z: s.z - fz * 0.38, yaw: s.yaw, ux: s.x + fx * 0.55, uz: s.z + fz * 0.55, th: b.th });
      }
      continue;
    }
    const sp = (b.a1 - b.a0) / b.n;
    for (let i = 0; i < b.n; i++) {
      const a = b.a0 + sp * (i + 0.5);
      if (b.face === 'E') {
        const front = b.f + b.d / 2;
        out.push({ x: front - 0.42, y: b.y, z: a, yaw: -Math.PI / 2, ux: front + 0.55, uz: a, th: b.th });
      } else if (b.face === 'W') {
        const front = b.f - b.d / 2;
        out.push({ x: front + 0.42, y: b.y, z: a, yaw: Math.PI / 2, ux: front - 0.55, uz: a, th: b.th });
      } else {
        const o = b.arc ? -b.arc.sag * Math.pow((a - b.arc.cx) / b.arc.hw, 2) : 0,
          yw = b.arc ? Math.atan((2 * b.arc.sag * (a - b.arc.cx)) / (b.arc.hw * b.arc.hw)) : 0;
        out.push({ x: a, y: b.y, z: b.f + 0.3 + o, yaw: yw, ux: a, uz: b.f - 0.42 + o, th: b.th });
      }
    }
  }
  return (__SEAT.list = out);
}
function __seatFind(me, m) {
  const L = __seatList(m);
  let best = null,
    bd = 1.15;
  for (const s of L) {
    if (Math.abs(me.pos.y - s.y) > 0.6) continue;
    const d = Math.hypot(me.pos.x - s.x, me.pos.z - s.z);
    d < bd && ((bd = d), (best = s));
  }
  if (!best) return null;
  // the Use key belongs to a door within reach, or a planted bomb
  for (const d of m.doors || []) if (Math.hypot(d.hinge.x - me.pos.x, d.hinge.z - me.pos.z) < 2.2) return null;
  const bomb = eA.state && eA.state.bomb;
  if (bomb && bomb.planted && bomb.pos && Math.hypot(bomb.pos.x - me.pos.x, bomb.pos.z - me.pos.z) < 5) return null;
  return best;
}
// the first-person gun and arms go out of view while seated: they are drawn as their own scene in a second
// pass (the core keeps it in window.__vmScene)
function __seatHideFp(on) {
  const vs = typeof window < 'u' && window.__vmScene;
  vs && (vs.visible = !on);
}
function __seatPrompt(text) {
  if (typeof document > 'u') return;
  let el = __SEAT.prompt;
  if (!el) {
    el = __SEAT.prompt = document.createElement('div');
    el.style.cssText =
      'position:fixed;left:50%;top:62%;transform:translateX(-50%);padding:7px 16px;border-radius:6px;background:rgba(10,8,6,.72);border:1px solid rgba(201,164,90,.45);color:#f2ead8;font:600 14px Barlow,sans-serif;letter-spacing:.04em;pointer-events:none;z-index:45;opacity:0;transition:opacity .2s';
    document.body.appendChild(el);
    const st = document.createElement('style');
    // seated: the HUD steps back (the radar, the money, the ammo) so the film has the screen
    // (no transition: the HUD re-renders constantly, and a transition restarting on every render flickered)
    // (and no crosshair at all until you stand up)
    st.textContent = 'body.bp-seated [class*="hud-"]{opacity:.14}body.bp-seated .fps-crosshair{display:none!important}';
    document.head.appendChild(st);
  }
  el.textContent = text || '';
  el.style.opacity = text ? '1' : '0';
}
function __seatKey() {
  return (typeof Gi < 'u' && Gi.use) || ['KeyE', 'KeyF'];
}
function __seatSit(me, s, scene) {
  __SEAT.on = s;
  me.yaw = s.yaw;
  // look at the middle of the theater's screen (eye height seated: about 1.15 m)
  const sc = (aw().screens || []).find((x) => x.id === s.th);
  me.pitch = sc ? Math.max(-0.2, Math.min(0.6, Math.atan2(sc.y - (s.y + 1.15), Math.hypot(sc.x - s.x, sc.z - s.z)))) : 0.1;
  __seatHideFp(!0);
  document.body.classList.add('bp-seated');
  // the "now showing" card steps aside for the film
  const ns = document.getElementById('bp-nowshowing');
  ns && ((ns.style.opacity = '0'), (ns.style.transform = 'translate(-50%,-8px)'));
}
function __seatStand(me) {
  const s = __SEAT.on;
  __SEAT.on = null;
  __seatHideFp(!1);
  typeof document < 'u' && document.body.classList.remove('bp-seated');
  if (me && s) {
    me.pos = { x: s.ux, y: s.y + 0.02, z: s.uz };
    me.vel = { x: 0, y: 0, z: 0 };
    me.crouch = 0;
  }
}
// keep the sitter in the seat: after every physics step, and every frame
function __seatHold() {
  const s = __SEAT.on,
    me = s && eA.human && eA.human();
  if (!s || !me) return;
  me.pos = { x: s.x, y: s.y, z: s.z };
  me.vel = { x: 0, y: 0, z: 0 };
  me.crouch = 1; // a seated eye height
  me.onGround = !0;
}
// seated, the player does not move at all: the physics step is skipped for them (pinning them back after the
// character controller had pushed them out of the seat's collision made the view shake, and the seats with it)
{
  const coreMove = h4;
  h4 = function (w, A, i) {
    const s = __SEAT.on;
    if (s && eA.human && w === eA.human()) {
      w.pos = { x: s.x, y: s.y, z: s.z };
      w.vel = { x: 0, y: 0, z: 0 };
      w.onGround = !0;
      return;
    }
    return coreMove.apply(this, arguments);
  };
}
// a fixed seated eye height (the core eases crouch towards the keys every step; the seat setting it back made
// the view bob a few centimetres every frame)
{
  const coreEye = tQ;
  tQ = function (w) {
    return __SEAT.on && eA.human && w === eA.human() ? p4 + 0.02 : coreEye(w);
  };
}
{
  const corePost = __phxPostStep;
  __phxPostStep = function () {
    const r = corePost.apply(this, arguments);
    __seatHold();
    return r;
  };
}
if (typeof window < 'u') {
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.repeat || !__seatKey().includes(e.code)) return;
      const m = aw(),
        me = eA.human && eA.human();
      if (!m || !m.__cn || !me || !me.alive || eA.paused) return;
      if (__SEAT.on) {
        __seatStand(me);
        e.stopImmediatePropagation();
        return;
      }
      const s = __seatFind(me, m);
      if (s) {
        __seatSit(me, s, __SEAT.scene);
        e.stopImmediatePropagation();
      }
    },
    !0,
  );
  window.__bpSeat = () => ({ on: __SEAT.on, near: __SEAT.near, seats: __SEAT.list && __SEAT.list.length });
}
// each frame: hold the seat, the prompt
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw(),
      on = !!(m && m.__cn);
    S.useEffect(
      () => () => {
        const me = eA.human && eA.human();
        __SEAT.on && __seatStand(me);
        __seatPrompt('');
      },
      [m],
    );
    QI((st) => {
      if (!on) return;
      __SEAT.scene = st.scene;
      __SEAT.cam = st.camera;
      const me = eA.human && eA.human();
      if (!me) return;
      if (__SEAT.on) {
        if (!me.alive || (eA.state && eA.state.phase === 'freeze')) return void (__seatStand(me), __seatPrompt(''));
        __seatHold();
        // a gun picked up or switched while seated: out of view too
        const now = performance.now();
        now - __SEAT.scanAt > 500 && ((__SEAT.scanAt = now), __seatHideFp(!0));
        const k = __seatKey()[0] === 'KeyE' ? 'E' : __seatKey()[0].replace('Key', '');
        __seatPrompt(`Press ${k} to stand up`);
        return;
      }
      const s = me.alive ? __seatFind(me, m) : null;
      __SEAT.near = s;
      const k = __seatKey()[0] === 'KeyE' ? 'E' : __seatKey()[0].replace('Key', '');
      __seatPrompt(s ? `Press ${k} to sit` : '');
    });
    return M.jsx(prevTrees, {});
  };
}
