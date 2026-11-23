/* ===== Bayou Protocol mod: Jailbreak (Blackwater Penitentiary) ===== */
// A round mode on the prison map. It runs as Bomb Defusal (one life a round, the buy menu, the economy) with a
// jb flag on the world and no bomb (the core patch in BY: mode "jb" -> "bomb" + __jbInit):
//   - four inmates are locked up, all on the guards' half: two at the south end of A Block (lower tier
//     west, upper tier east), two in Solitary
//   - Terrorists (the breakout crew) hold E at a cell's lock for 3.5 seconds to cut it: the door opens and the
//     inmate follows whoever freed him. Lead him out through the gatehouse, the breach or the sally port to
//     the getaway van in the visitor lot. Two rescued wins the round
//   - if his leader dies or gets too far ahead, an inmate stops and waits with his hands on his head: any
//     Terrorist can press E by him to lead him on
//   - Counter-Terrorists (the guards) win by holding until time runs out (2:30) or by eliminating the crew
//   - inmates cannot be hurt (they duck when shot at), so guards cannot simply deny them
// Bots: the crew splits between cutting locks, collecting waiting inmates and covering the escort; leaders
// head straight for the van. Guards hold the cell house and solitary, and chase anyone leading an inmate.
// Online: the host runs it; clients get the inmates' states and positions (status field JB) and send their
// lock cuts and pickups as actions ("j").
const __JB = { roundTime: 150, cut: 3.5, reach: 1.45, follow: 1.7, lost: 16, speed: 4.0, walk: 1.6 };
const __JB_ST = ['locked', 'follow', 'wait', 'rescued'];
function __jbInit(m) {
  const J = m && m.jb;
  if (!J) return null;
  return { need: J.need, rescued: 0, p: J.cells.map((c) => __jbFresh(c)) };
}
function __jbFresh(c) {
  return { id: c.id, state: 'locked', pos: { ...c.inside }, yaw: c.face, leader: null, prog: 0, cutter: null, path: null, pathAt: -9, gone: 0 };
}
// a new round: everyone back in their cells, doors shut and locked
function __jbReset(w) {
  const m = aw(),
    J = m.jb;
  if (!J || !w.jb) return;
  w.jb.rescued = 0;
  w.jb.p = J.cells.map((c) => __jbFresh(c));
  for (const c of J.cells) {
    const d = m.doors[c.doorId];
    d && ((d.open = !1), (d.box.off = !1), (d.__jbLocked = 1));
  }
  for (const p of w.players) (p.__jbProg = 0), (p.__jbAt = -1);
}
// open a cell (host / offline)
function __jbOpen(w, id, who) {
  const m = aw(),
    c = m.jb.cells[id],
    p = w.jb.p[id];
  if (!c || !p || p.state !== 'locked') return;
  const d = m.doors[c.doorId];
  d && ((d.__jbLocked = 0), pt(w, c.doorId, !0));
  p.state = 'follow';
  p.leader = who.id;
  p.prog = 0;
  who.money = Math.min(uE, who.money + 300);
  un(w, who, 150, 'Cell opened');
  w.fx.push({ type: 'announce', text: `${who.name} broke open a cell in ${c.area}`, team: 'T' });
}
function __jbTake(w, id, who) {
  const p = w.jb.p[id];
  if (!p || p.state !== 'wait') return;
  p.state = 'follow';
  p.leader = who.id;
  w.fx.push({ type: 'announce', text: `${who.name} is leading an inmate out`, team: 'T' });
}
const __jbNear = (a, b, r, dy = 1.3) => Math.hypot(a.x - b.x, a.z - b.z) < r && Math.abs((a.y || 0) - (b.y || 0)) < dy;
// the use key for one player this tick (humans from Y8, bots from __jbTick): cut a lock or pick up an inmate
function __jbUse(w, A, use, dt) {
  const J = w.jb,
    m = aw();
  if (!J || !m.jb || w.phase !== 'live' || !A.alive || A.team !== 'T') return (A.__jbProg = 0), (A.__jbAt = -1);
  const client = w.net && w.net.role === 'client';
  // inmates waiting for someone to lead them
  if (use && !A.__jbPrevUse)
    for (const p of J.p)
      if (p.state === 'wait' && __jbNear(A.pos, p.pos, __JB.follow + 0.2)) {
        client ? w.net.actions.push({ kind: 'jb', i: p.id, op: 1 }) : __jbTake(w, p.id, A);
        break;
      }
  A.__jbPrevUse = use;
  // a lock: hold use beside the door, standing still
  let at = -1;
  for (const c of m.jb.cells) if (J.p[c.id] && J.p[c.id].state === 'locked' && __jbNear(A.pos, c.door, __JB.reach)) at = c.id;
  if (!use || at < 0 || !A.onGround) return (A.__jbProg = 0), (A.__jbAt = -1);
  if (A.__jbAt !== at) (A.__jbAt = at), (A.__jbProg = 0);
  A.__jbProg += dt;
  A.vel.x = A.vel.z = 0;
  J.p[at].cutter = A.id;
  J.p[at].prog = A.__jbProg / __JB.cut;
  if (A.__jbProg >= __JB.cut) {
    A.__jbProg = 0;
    A.__jbAt = -1;
    client ? w.net.actions.push({ kind: 'jb', i: at, op: 0 }) : __jbOpen(w, at, A);
  }
}
// the inmates (host / offline): follow their leader along the bots' walk grid, wait when lost, get out
function __jbTick(w, dt) {
  const J = w.jb,
    m = aw();
  if (!J || !m.jb) return;
  // bots cut locks and pick up inmates by standing at them
  for (const A of w.players)
    if (A.isBot && A.alive && A.team === 'T') __jbUse(w, A, m.jb.cells.some((c) => J.p[c.id] && J.p[c.id].state === 'locked' && __jbNear(A.pos, c.door, __JB.reach)), dt);
  for (const p of J.p) {
    if (p.cutter) {
      const c = XB(w, p.cutter);
      (!c || !c.alive || c.__jbAt !== p.id) && ((p.cutter = null), (p.prog = 0));
    }
    if (p.state === 'rescued') continue;
    if (p.state === 'wait') {
      for (const A of w.players) if (A.isBot && A.alive && A.team === 'T' && __jbNear(A.pos, p.pos, __JB.follow)) __jbTake(w, p.id, A);
      continue;
    }
    if (p.state !== 'follow') continue;
    const L = XB(w, p.leader);
    if (!L || !L.alive || Math.hypot(L.pos.x - p.pos.x, L.pos.z - p.pos.z) > __JB.lost) {
      p.state = 'wait';
      p.leader = null;
      p.path = null;
      continue;
    }
    // out: inside the visitor lot
    const R = m.jb.rescue;
    if (p.pos.x > R.min.x && p.pos.x < R.max.x && p.pos.z > R.min.z && p.pos.z < R.max.z) {
      p.state = 'rescued';
      p.leader = null;
      J.rescued += 1;
      L.money = Math.min(uE, L.money + 1000);
      un(w, L, 300, 'Inmate rescued');
      w.fx.push({ type: 'medal', who: L.id, text: 'Inmate Rescued' });
      w.fx.push({ type: 'announce', text: `Inmate rescued (${J.rescued}/${J.need})`, team: 'T' });
      J.rescued >= J.need && se(w, 'T', 'rescued');
      continue;
    }
    const d = Math.hypot(L.pos.x - p.pos.x, L.pos.z - p.pos.z);
    if (d < __JB.follow && Math.abs(L.pos.y - p.pos.y) < 1.2) continue;
    // a path to the leader every half second; walk it (running when far behind)
    if (!p.path || w.t - p.pathAt > 0.5) {
      p.pathAt = w.t;
      try {
        p.path = KT(p.pos, L.pos) || [{ x: L.pos.x, y: L.pos.y, z: L.pos.z }];
      } catch (e) {
        p.path = [{ x: L.pos.x, y: L.pos.y, z: L.pos.z }];
      }
    }
    let step = Math.min(d > 4 ? __JB.speed : d > 2.4 ? 3.2 : __JB.walk, 6) * dt;
    while (step > 0 && p.path.length) {
      const q = p.path[0],
        dx = q.x - p.pos.x,
        dz = q.z - p.pos.z,
        dl = Math.hypot(dx, dz);
      if (dl < 0.05) {
        p.path.shift();
        continue;
      }
      const s = Math.min(step, dl);
      p.pos.x += (dx / dl) * s;
      p.pos.z += (dz / dl) * s;
      p.pos.y += ((q.y ?? p.pos.y) - p.pos.y) * Math.min(1, s / Math.max(dl, 0.05));
      p.yaw = Math.atan2(dx, dz);
      step -= s;
    }
  }
}
// ---------------------------------------------------------------- hooks into the core
{
  // round start: reset the inmates and the doors; no bomb in Jailbreak
  const coreQU = QU;
  QU = function (w) {
    const r = coreQU.apply(this, arguments);
    // maps whose spawns face the wrong way by the core's rule (T north, CT south): face the map's centre
    const m = aw();
    if (m.spawnFaceCenter) for (const p of w.players) p.yaw = Math.atan2(-(m.w / 2 - p.pos.x), -(m.d / 2 - p.pos.z));
    if (w.jb) {
      for (const p of w.players) p.hasBomb = !1;
      w.bomb = { state: 'none', pos: { x: -100, y: 0, z: -100 }, carrier: null, site: null, timer: 0, defuser: null, nextBeep: 0 };
      __jbReset(w);
    }
    return r;
  };
  // the live round: the bomb's tick runs as before; Jailbreak's tick after it
  const coreG1 = G1;
  G1 = function (w, A) {
    w.jb ? __jbTick(w, A) : coreG1.apply(this, arguments);
  };
  // players' use key
  const coreY8 = Y8;
  Y8 = function (w, A, i, I) {
    const r = coreY8.apply(this, arguments);
    w.jb && !A.isBot && __jbUse(w, A, !!(i && i.use), I);
    return r;
  };
  // a locked solitary door does not open (until its lock is cut)
  const corePt = pt;
  pt = function (w, id, open) {
    const d = aw().doors[id];
    if (open && d && d.__jbLocked && w && w.jb) return !1;
    return corePt.apply(this, arguments);
  };
  // bots open doors they walk into; not cell gates (they line the galleries)
  r1 = function (w) {
    const A = aw();
    for (const i of w.players)
      if (i.alive && i.isBot && Math.hypot(i.vel.x, i.vel.z) >= 0.5)
        for (const I of A.doors) {
          if (I.open || I.__cell) continue;
          const B = x9(I);
          Math.abs(B.y - 1 - i.pos.y) < 1 && Ci(B, i.pos) < 1.25 && pt(w, I.id, !0);
        }
  };
  // clients' actions on the host
  const coreAct = __bmAction;
  __bmAction = function (A, i, I) {
    if (I && I[1] === 'j') {
      if (!A.jb || !i.alive || i.team !== 'T') return !0;
      const id = Nw(I[2]),
        op = Nw(I[3]),
        c = aw().jb && aw().jb.cells[id],
        p = A.jb.p[id];
      if (!c || !p) return !0;
      op === 0 ? __jbNear(i.pos, c.door, __JB.reach + 1) && __jbOpen(A, id, i) : __jbNear(i.pos, p.pos, __JB.follow + 1.5) && __jbTake(A, id, i);
      return !0;
    }
    return coreAct.apply(this, arguments);
  };
  // bots: Jailbreak goals
  const coreGoal = rh;
  rh = function (w, A, i) {
    if (w.jb && w.phase === 'live') {
      try {
        const g = __jbGoal(w, A, i);
        A.__jbGoal = g;
        if (g) return g;
      } catch (e) {}
    }
    return coreGoal.apply(this, arguments);
  };
}
function __jbGoal(w, A, brain) {
  const J = w.jb,
    m = aw(),
    team = w.players.filter((p) => p.team === A.team && p.alive),
    e = team.findIndex((p) => p.id === A.id),
    van = m.jb.van;
  A.__jbWant = !1;
  if (A.team === 'T') {
    const mine = J.p.find((p) => p.state === 'follow' && p.leader === A.id);
    if (mine) return { x: van.x, y: 0, z: van.z };
    const waiting = J.p.filter((p) => p.state === 'wait').sort((a, b) => Math.hypot(a.pos.x - A.pos.x, a.pos.z - A.pos.z) - Math.hypot(b.pos.x - A.pos.x, b.pos.z - A.pos.z))[0];
    if (waiting && (e % 2 === 0 || Math.hypot(waiting.pos.x - A.pos.x, waiting.pos.z - A.pos.z) < 25)) return { ...waiting.pos };
    const locked = m.jb.cells.filter((c) => J.p[c.id].state === 'locked');
    if (locked.length && e % 3 !== 2) {
      // spread the crew over the cells
      const c = locked[(e >> 1) % locked.length];
      if (__jbNear(A.pos, c.door, __JB.reach)) A.__jbWant = !0;
      return { x: c.door.x, y: c.door.y || 0, z: c.door.z };
    }
    const lead = J.p.find((p) => p.state === 'follow');
    if (lead) {
      const L = XB(w, lead.leader);
      if (L) return Fo(w, L.pos, 4);
    }
    return null;
  }
  // guards: chase whoever leads an inmate; otherwise hold the cell house and solitary
  const lead = J.p.find((p) => p.state === 'follow');
  if (lead && e % 3 !== 1) {
    const L = XB(w, lead.leader);
    if (L) return { ...L.pos };
  }
  const posts = [
    { x: 11.5, y: 0, z: 59 },
    { x: 24, y: 0, z: 83 },
    { x: 29, y: 3.2, z: 55 },
    { x: 20, y: 0, z: 69 },
    { x: 33, y: 0, z: 47 },
  ];
  const locked = J.p.filter((p) => p.state === 'locked').length;
  if (!locked) return null;
  const pst = posts[e % posts.length];
  return brain && brain.goal && Math.hypot(brain.goal.x - pst.x, brain.goal.z - pst.z) < 6 && w.t < (brain.patrolAt || 0) ? brain.goal : ((brain && (brain.patrolAt = w.t + 8)), Fo(w, pst, 5));
}
// ---------------------------------------------------------------- online status
function __jbPack(A) {
  const J = A.jb;
  if (!J) return null;
  return [J.rescued, J.p.map((p) => [__JB_ST.indexOf(p.state), Sw(p.pos.x), Sw(p.pos.y), Sw(p.pos.z), Math.round(p.yaw * 100), p.leader || '', Math.round((p.prog || 0) * 100)])];
}
function __jbUnpack(A, r) {
  if (!A.jb || !Array.isArray(r) || !Array.isArray(r[1])) return;
  const m = aw();
  A.jb.rescued = Nw(r[0]);
  r[1].forEach((q, k) => {
    const p = A.jb.p[k];
    if (!p || !Array.isArray(q)) return;
    p.state = __JB_ST[Nw(q[0])] || 'locked';
    p.pos = { x: si(q[1]), y: si(q[2]), z: si(q[3]) };
    p.yaw = Nw(q[4]) / 100;
    p.leader = Ri(q[5], 16) || null;
    p.prog = Nw(q[6]) / 100;
    const c = m.jb && m.jb.cells[k];
    const d = c && m.doors[c.doorId];
    d && (d.__jbLocked = p.state === 'locked' ? 1 : 0);
  });
}
// ---------------------------------------------------------------- minimap
function __jbMini(C, D, me, rot) {
  const m = aw(),
    J = D.jb;
  if (!m.jb || !J) return;
  const R = m.jb.rescue;
  C.fillStyle = 'rgba(80,220,120,0.16)';
  C.fillRect(R.min.x, R.min.z, R.max.x - R.min.x, R.max.z - R.min.z);
  const label = (x, z, t, col) => {
    C.save();
    C.translate(x, z);
    C.rotate(-rot);
    C.fillStyle = col;
    C.font = '900 6px "Chakra Petch", sans-serif';
    C.textAlign = 'center';
    C.textBaseline = 'middle';
    C.fillText(t, 0, 0);
    C.restore();
  };
  label(m.jb.van.x, m.jb.van.z, 'EXIT', 'rgba(120,240,150,0.95)');
  for (const c of m.jb.cells) {
    const p = J.p[c.id];
    if (!p) continue;
    if (p.state === 'locked') {
      C.fillStyle = 'rgba(255,170,60,0.95)';
      C.fillRect(c.door.x - 1, c.door.z - 1, 2, 2);
    } else if (p.state !== 'rescued') {
      C.fillStyle = p.state === 'wait' ? 'rgba(255,220,80,0.95)' : 'rgba(255,140,40,1)';
      C.beginPath();
      C.arc(p.pos.x, p.pos.z, 1.3, 0, Math.PI * 2);
      C.fill();
    }
  }
}
// ---------------------------------------------------------------- the inmates, the HUD (drawn with the map's tree layer)
const __JBV = { el: null, group: null };
function __jbHud() {
  if (__JBV.el || typeof document > 'u') return __JBV.el;
  const el = document.createElement('div');
  el.className = 'jb-hud';
  el.innerHTML =
    '<div class="jb-obj"></div><div class="jb-hint"></div><div class="jb-bar"><i></i></div><div class="jb-marks"></div>' +
    '<style>.jb-hud{position:fixed;inset:0;pointer-events:none;z-index:40;font-family:"Chakra Petch",sans-serif}' +
    '.jb-obj{position:absolute;top:64px;left:50%;transform:translateX(-50%);padding:5px 14px;border-radius:8px;background:rgba(10,14,22,.72);color:#f4efe2;font-weight:700;font-size:14px;letter-spacing:.06em;white-space:nowrap;border:1px solid rgba(255,160,60,.35)}' +
    '.jb-obj b{color:#ffad4a}.jb-hint{position:absolute;top:58%;left:50%;transform:translateX(-50%);color:#fff;font-size:15px;font-weight:700;text-shadow:0 1px 3px #000;white-space:nowrap}' +
    '.jb-bar{position:absolute;top:62%;left:50%;width:220px;height:7px;margin-left:-110px;border-radius:4px;background:rgba(0,0,0,.5);display:none;overflow:hidden}.jb-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff9a3a,#ffd27a)}' +
    '.jb-mark{position:absolute;will-change:transform;font-size:11px;font-weight:800;letter-spacing:.08em;white-space:nowrap;text-align:center;text-shadow:0 1px 2px #000}' +
    '.jb-mark span{display:block;font-size:16px;line-height:1}</style>';
  document.body.appendChild(el);
  return (__JBV.el = el);
}
function __jbHudHide() {
  __JBV.el && (__JBV.el.style.display = 'none');
}
function __jbHudTick(cam) {
  const st = eA.state,
    me = eA.human && eA.human(),
    m = aw();
  if (!st || !st.jb || !m.jb || !me) return __jbHudHide();
  const el = __jbHud();
  el.style.display = '';
  const J = st.jb,
    free = J.p.filter((p) => p.state !== 'locked').length,
    T = me.team === 'T';
  // the page is only touched when something changed (rewriting it every frame costs the browser a layout)
  const set = (node, key, v, html) => {
    const k = html ? '__html' : '__m_' + key;
    if (node[k] === v) return !1;
    node[k] = v;
    html ? (node.innerHTML = v) : key.startsWith('__') || (node[key] = v);
    return !0;
  };
  set(el.children[0], 'innerHTML', `JAILBREAK &nbsp;·&nbsp; RESCUED <b>${J.rescued}/${J.need}</b> &nbsp;·&nbsp; FREED <b>${free}/${J.p.length}</b>`, !0);
  // the prompt and the progress bar
  let hint = '',
    prog = 0;
  if (T && me.alive && st.phase === 'live') {
    for (const c of m.jb.cells) if (J.p[c.id].state === 'locked' && __jbNear(me.pos, c.door, __JB.reach)) (hint = 'Hold E to cut the lock'), (prog = me.__jbAt === c.id ? me.__jbProg / __JB.cut : 0);
    for (const p of J.p) if (p.state === 'wait' && __jbNear(me.pos, p.pos, __JB.follow + 0.2)) hint = 'Press E to lead the inmate';
    J.p.some((p) => p.state === 'follow' && p.leader === me.id) && !hint && (hint = 'Lead him to the getaway van');
  }
  if (!T && me.alive) for (const c of m.jb.cells) J.p[c.id].state === 'locked' && __jbNear(me.pos, c.door, __JB.reach) && (hint = 'Locked: keep the crew away from it');
  set(el.children[1], 'textContent', hint);
  const bar = el.children[2];
  set(bar, '__d', prog > 0 ? 'block' : 'none') && (bar.style.display = prog > 0 ? 'block' : 'none');
  prog > 0 && (bar.firstChild.style.width = Math.round(Math.min(1, prog) * 100) + '%');
  // world markers: cells, inmates, the van
  const marks = [];
  const add = (x, y, zz, icon, text, col) => marks.push({ x, y, z: zz, icon, text, col });
  for (const c of m.jb.cells) {
    const p = J.p[c.id];
    // locked cells: only nearby ones (the minimap shows them all)
    if (p.state === 'locked') Math.hypot(c.door.x - me.pos.x, c.door.z - me.pos.z) < 50 && add(c.door.x, (c.door.y || 0) + 2.3, c.door.z, '🔒', T ? 'CUT THE LOCK' : 'GUARD', '#ffb04a');
    else if (p.state !== 'rescued') add(p.pos.x, (p.pos.y || 0) + 2.15, p.pos.z, p.state === 'wait' ? '✋' : '▲', p.state === 'wait' ? 'WAITING' : 'INMATE', p.state === 'wait' ? '#ffd86a' : '#ff8a3a');
  }
  T && J.p.some((p) => p.state === 'follow') && add(m.jb.van.x, 2.8, m.jb.van.z, '⇩', 'GETAWAY VAN', '#7cf09a');
  const box = el.children[3],
    W = innerWidth,
    H = innerHeight,
    v = __JBV.v || (__JBV.v = new U()),
    c2 = __JBV.c2 || (__JBV.c2 = new U());
  while (box.children.length < marks.length) {
    const d = document.createElement('div');
    d.className = 'jb-mark';
    box.appendChild(d);
  }
  for (let k = 0; k < box.children.length; k++) {
    const d = box.children[k],
      mk = marks[k];
    const hide = () => d.__shown !== !1 && ((d.__shown = !1), (d.style.display = 'none'));
    if (!mk) {
      hide();
      continue;
    }
    v.set(mk.x, mk.y, mk.z).project(cam);
    if (v.z > 1 || v.z < -1) {
      hide();
      continue;
    }
    const dist = cam.position.distanceTo(c2.set(mk.x, mk.y, mk.z));
    d.__shown !== !0 && ((d.__shown = !0), (d.style.display = ''), (d.style.left = '0px'), (d.style.top = '0px'));
    d.style.transform = `translate(${(((v.x + 1) / 2) * W).toFixed(1)}px, ${(((1 - v.y) / 2) * H).toFixed(1)}px) translate(-50%, -100%)`;
    set(d, '__c', mk.col) && (d.style.color = mk.col);
    const op = dist > 60 ? '0.55' : '0.95';
    set(d, '__o', op) && (d.style.opacity = op);
    set(d, '__h', `<span>${mk.icon}</span>${mk.text} ${Math.round(dist)}m`, !0);
  }
}
// the inmates themselves: the prisoners' model (50-prisoners.js) in orange, following the world's state
function __jbBuild() {
  if (!__PRS.models.mx.g || !__PRS.anims) return null;
  const g = new ji();
  g.name = 'bp-jailbreak';
  g.userData.npcs = [];
  for (let k = 0; k < 4; k++) {
    const n = __prsMake('mx', 0.3 + k * 0.17);
    n.root.traverse((o) => {
      if (!o.isMesh) return;
      o.material = [].concat(o.material).map((mt) => {
        const c = mt.clone();
        c.color && c.color.multiply(new UA('#ff9550'));
        return c;
      });
      o.material.length === 1 && (o.material = o.material[0]);
    });
    __prsPlay(n, 'idle', 0);
    g.add(n.holder);
    g.userData.npcs.push(Object.assign(n, { yaw: 0, swing: 0, phase: k, shake: 0, look: 0 }));
  }
  return g;
}
function __jbAnimate(g, dt, cam) {
  const st = eA.state,
    J = st && st.jb;
  // not a Jailbreak match: the inmates stay out of the scene (their skeletons would cost a frame's work)
  if (!J) {
    for (const n of g.userData.npcs) n.holder.parent && g.remove(n.holder);
    return;
  }
  for (const n of g.userData.npcs) n.holder.parent || g.add(n.holder);
  g.userData.npcs.forEach((n, k) => {
    const p = J.p[k];
    if (!p || p.state === 'rescued') return void (n.holder.visible = !1);
    n.holder.visible = !0;
    const h = n.holder.position,
      first = !n.__placed;
    n.__placed = 1;
    const dx = p.pos.x - h.x,
      dz = p.pos.z - h.z,
      d = Math.hypot(dx, dz);
    // smooth to the state (it moves at tick rate, or arrives from the host)
    first || d > 4 ? h.set(p.pos.x, p.pos.y || 0, p.pos.z) : (h.x += dx * Math.min(1, dt * 10), h.z += dz * Math.min(1, dt * 10), (h.y += ((p.pos.y || 0) - h.y) * Math.min(1, dt * 8)));
    const speed = first ? 0 : d / Math.max(dt, 1e-3) / 10;
    let dy = p.yaw - n.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    n.yaw += dy * Math.min(1, dt * 8);
    n.holder.rotation.y = n.yaw;
    const moving = p.state === 'follow' && speed > 0.25;
    __prsPlay(n, moving ? 'walk' : 'idle', 0.25, moving ? Math.min(2.2, Math.max(0.7, speed / 1.45)) : 1);
    n.poseTo = p.state === 'locked' ? (p.prog > 0 ? 'head' : 'bars') : p.state === 'wait' ? 'head' : 'down';
    n.pose !== n.poseTo ? ((n.poseW = Math.max(0.35, n.poseW - dt * 3)), n.poseW <= 0.36 && (n.pose = n.poseTo)) : (n.poseW = Math.min(1, n.poseW + dt * 2.2));
    n.phase += dt;
    n.swing = moving ? Math.sin(n.phase * 7) : n.swing * 0.9;
    n.look += ((n.pose === 'head' ? 0.4 : 0.05) - n.look) * Math.min(1, dt * 3);
    const dc = cam ? cam.position.distanceTo(h) : 0;
    if (dc < 70) {
      n.mixer.update(dt);
      __prsArms(n, dt);
    }
  });
}
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw(),
      on = m.id === 'prison',
      [rev, setRev] = S.useState(__PRS.rev);
    S.useEffect(() => {
      __PRS.subs.add(setRev);
      // catch up: a load that finished between the first render and this subscription was missed (the view
      // then never built: the map's bare base geometry, untextured)
      setRev(__PRS.rev);
      return () => __PRS.subs.delete(setRev);
    }, []);
    const group = S.useMemo(() => {
      if (!on) return null;
      try {
        return __jbBuild();
      } catch (e) {
        console.warn('[jailbreak] build', e);
        return null;
      }
    }, [on, rev, m]);
    QI((s, dt) => {
      try {
        group && __jbAnimate(group, Math.min(dt, 0.05), s.camera);
        on ? __jbHudTick(s.camera) : __jbHudHide();
      } catch (e) {}
    });
    S.useEffect(() => () => __jbHudHide(), []);
    return M.jsxs(M.Fragment, { children: [M.jsx(prevTrees, {}), group ? M.jsx('primitive', { object: group }, 'jb' + rev) : null] });
  };
}
// ---------------------------------------------------------------- the mode in the menus (prison only)
(function () {
  Eg.jb = 'Jailbreak';
  Object.assign(oU, { jb: 8 });
  Object.assign(sBA, { jb: ['Rounds', 'Buy', 'Rescue'] });
  Object.assign(CBA, { jb: ['#c8642a', '#1c120a'] });
  // Jailbreak is no longer offered (the owner's choice): not in the offline or online mode lists. Its code stays,
  // so an old link or a lobby from an older version still runs; a saved choice of it becomes Bomb Defusal.
  try {
    const st = Zw.getState(),
      orig = st.setup;
    Zw.setState({
      setup: (p = {}) => {
        const cur = Zw.getState(),
          mode = p.mode ?? cur.mode,
          map = p.map ?? cur.map;
        mode === 'jb' && (p = { ...p, mode: 'bomb' });
        return orig(p);
      },
    });
    st.scores && st.scores.jb === void 0 && orig({ scores: { ...st.scores, jb: 8 } });
    st.mode === 'jb' && orig({ mode: 'bomb' });
  } catch (e) {}
})();
// dev hooks: the inmates' states; force a state (dev testing)
typeof window < 'u' &&
  ((window.__bpJail = () => {
    const st = eA.state;
    return st && st.jb ? { rescued: st.jb.rescued, need: st.jb.need, p: st.jb.p.map((p) => ({ id: p.id, s: p.state, x: +p.pos.x.toFixed(1), y: +(p.pos.y || 0).toFixed(1), z: +p.pos.z.toFixed(1), leader: p.leader, prog: +(p.prog || 0).toFixed(2) })), phase: st.phase, left: +st.phaseLeft.toFixed(1), bomb: st.bomb && st.bomb.state, mode: st.mode } : null;
  }),
  (window.__bpJailBots = () => {
    const st = eA.state;
    return st ? st.players.filter((p) => p.isBot && p.alive).map((p) => [p.team, p.name, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1), p.__jbGoal ? [+p.__jbGoal.x.toFixed(1), +p.__jbGoal.z.toFixed(1)] : null, +(p.__jbProg || 0).toFixed(1)]) : null;
  }),
  (window.__bpJailOpen = (id) => {
    const st = eA.state,
      me = eA.human();
    st && st.jb && me && __jbOpen(st, id, me);
  }));
