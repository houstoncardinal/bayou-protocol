/* ===== Bayou Protocol mod: Bomb Defusal online (beta) + viewmodel weight ===== */
function __bmPack(A) {
  const b = A.bomb;
  return [
    b.state,
    Sw(b.pos.x),
    Sw(b.pos.y),
    Sw(b.pos.z),
    b.carrier || '',
    b.site || '',
    Math.round((b.timer || 0) * 10),
    Math.round((A.t - A.roundStart) * 10),
    A.round | 0,
  ];
}
function __bmUnpack(A, r, net) {
  if (A.mode !== 'bomb' || !Array.isArray(r)) return;
  const b = A.bomb,
    st = Ri(r[0], 12) || b.state,
    car = Ri(r[4], 16) || null;
  A.bomb = {
    ...b,
    state: st,
    pos: { x: si(r[1]), y: si(r[2]), z: si(r[3]) },
    carrier: car,
    site: Ri(r[5], 4) || null,
    timer: Nw(r[6]) / 10,
  };
  A.roundStart = A.t - Nw(r[7]) / 10;
  for (const p of A.players) p.hasBomb = st === 'carried' && p.id === car;
  const rd = Nw(r[8], A.round);
  if (rd !== A.round) {
    A.round = rd;
    const me = A.players.find((p) => p.id === net.me.u);
    if (me && me.alive) {
      const m = aw(),
        sp = m.spawns && m.spawns[me.team];
      if (sp && sp.length) {
        const mates = A.players
            .filter((p) => p.team === me.team)
            .map((p) => p.id)
            .sort(),
          k = Math.max(0, mates.indexOf(me.id));
        me.pos = { ...sp[k % sp.length] };
        me.vel.x = me.vel.y = me.vel.z = 0;
        me.yaw = me.team === 'T' ? 0 : Math.PI;
        me.actionProgress = 0;
      }
    }
    A.grenades = [];
    A.smokes = [];
    A.fires = [];
  }
}
function __bmAction(A, i, I) {
  if (A.mode !== 'bomb') return !1;
  if (I[1] === 'p') {
    if (i.alive && i.hasBomb && A.phase === 'live' && A.bomb.state === 'carried' && QQ(aw(), i.pos)) P1(A, i);
    return !0;
  }
  if (I[1] === 'f') {
    const b = A.bomb;
    if (i.alive && i.team === 'CT' && b.state === 'planted' && Math.hypot(b.pos.x - i.pos.x, b.pos.z - i.pos.z) < 3) {
      b.state = 'defused';
      b.defuser = null;
      A.fx.push({ type: 'defused', who: i.id });
      un(A, i, je.defuse, 'Bomb defused');
      se(A, 'CT', 'defused');
    }
    return !0;
  }
  return !1;
}
function __vmExtra(m, G, c, t) {
  const s = m.__w || (m.__w = { x: 0, v: 0, pg: !0, pvy: 0, roll: 0 });
  if (!s.pg && c.onGround) {
    s.v -= Math.min(1, Math.max(0, -s.pvy) / 8) * 2.4;
  }
  s.pg = c.onGround;
  s.pvy = c.vel.y;
  const dt = Math.min(t, 0.05);
  s.v += (-120 * s.x - 14 * s.v) * dt;
  s.x += s.v * dt;
  const lat = c.vel.x * Math.cos(c.yaw) - c.vel.z * Math.sin(c.yaw),
    tr = Math.max(-0.05, Math.min(0.05, -lat * 0.008));
  s.roll += (tr - s.roll) * Math.min(1, dt * 9);
  G.position.y += s.x * 0.06;
  G.rotation.x += s.x * 0.14;
  G.rotation.z += s.roll;
  const cy = __CYC[m.id],
    S = eA.state;
  if (cy && S) {
    const since = S.t - c.lastShotAt;
    if (since > cy.s && since < cy.d) {
      const k = (since - cy.s) / (cy.d - cy.s),
        e = Math.sin(k * Math.PI),
        w = Math.sin(k * Math.PI * 2);
      G.rotation.z += cy.roll * e;
      G.rotation.x += cy.pitch * e;
      G.rotation.y += cy.yaw * e;
      G.position.y -= cy.dip * e;
      G.position.z += cy.back * (k < 0.5 ? w : w * 0.35);
      G.position.x -= cy.side * e;
    }
  }
}
const __CYC = {
  sniper: { s: 0.2, d: 1.05, roll: 0.24, pitch: -0.06, yaw: 0.05, dip: 0.02, back: 0.035, side: 0.012 },
  phantom: { s: 0.22, d: 1.15, roll: 0.2, pitch: -0.05, yaw: 0.04, dip: 0.022, back: 0.04, side: 0.01 },
  shotgun: { s: 0.14, d: 0.66, roll: 0.04, pitch: 0.09, yaw: 0, dip: 0.014, back: 0.055, side: 0 },
  deagle: { s: 0.05, d: 0.3, roll: 0.03, pitch: 0.05, yaw: 0, dip: 0, back: 0.012, side: 0 },
  rpg: { s: 0.1, d: 0.9, roll: 0.1, pitch: -0.12, yaw: 0.03, dip: 0.03, back: 0, side: 0 },
};
