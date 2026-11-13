/* ===== Bayou Protocol mod: firing range ===== */
Ch.range = {
  id: 'range',
  name: 'Firing Range',
  cols: 40,
  rows: 64,
  base: 0,
  theme: RT,
  backdrop: 'desert',
  mid: [19, 30],
  carve: (w) => {
    (w.carve([10, 6, 29, 60], ','),
      Ye(w, 17, 56, 22, 59, 'C'),
      Ye(w, 14, 8, 25, 12, 'T'),
      w.set(10, 10, 'x'),
      w.set(29, 10, 'x'),
      w.set(10, 16, 'x'),
      w.set(29, 16, 'x'),
      w.set(10, 22, 'x'),
      w.set(29, 22, 'x'),
      w.set(10, 28, 'x'),
      w.set(29, 28, 'x'),
      w.set(10, 34, 'x'),
      w.set(29, 34, 'x'),
      w.set(10, 40, 'x'),
      w.set(29, 40, 'x'),
      w.set(10, 46, 'x'),
      w.set(29, 46, 'x'),
      w.set(10, 52, 'x'),
      w.set(29, 52, 'x'),
      w.set(13, 52, 'X'),
      w.set(26, 52, 'X'));
  },
  roofs: [],
  areas: [
    { name: 'Firing Line', r: [10, 54, 29, 60] },
    { name: 'Range', r: [10, 6, 29, 53] },
  ],
  sites: [
    { name: 'A', r: [12, 14, 17, 19] },
    { name: 'B', r: [22, 14, 27, 19] },
  ],
};
XE.range = () => BP('range');
Eg.range = 'Firing Range';
oU.range = 9999;
sBA.range = ['Practice', 'Solo', 'Unlimited ammo'];
CBA.range = ['#3a7d5c', '#0e1a16'];
gF.push([
  'range',
  'Free practice against target dummies at 8, 15, 25, 40 and 55 metres. Unlimited ammo, every weapon free, one strafing target.',
]);
try {
  Zw.subscribe((s) => {
    s.mode === 'range' && s.map !== 'range' && s.setup({ map: 'range' });
    s.mode !== 'range' && s.map === 'range' && s.setup({ map: 'sandstorm' });
  });
} catch (e) {}
const __RG_D = [8, 15, 25, 40, 55],
  __RG_X = [-5, -2.5, 0, 2.5, 5],
  // every target carries a real gun (they never fire): one per lane, and a sidearm
  __RG_W = ['sentinel', 'ak47', 'hornet', 'anvil', 'phantom'];
// Lanes: 8 m stands still; 15 m peeks (crouches and stands up every 2.4 s); 25 m strafes left and right at a
// running pace; 40 m walks towards you and back; 55 m stands still for long shots. They move with real
// velocity (so their legs walk and run), face you with their gun up, flinch when hit and stand up again
// 1.4 s after going down.
function __rgArm(p, k) {
  const id = __RG_W[k % __RG_W.length],
    g = gw[id];
  (!p.weapons[1] || p.weapons[1].id !== id) && (p.weapons = { 1: { id, mag: g.mag, reserve: g.reserve, max: g.mag }, 2: { id: 'kestrel', mag: 15, reserve: 45, max: 15 }, 3: { id: 'knife', mag: 0, reserve: 0, max: 0 } });
  p.active = 1;
}
function __rangeTick(w, dt) {
  const h = XB(w, w.humanId);
  if (!h) return;
  const m = aw();
  if (!w.__rg) {
    w.players = w.players.filter((p) => p.id === h.id || p.team !== h.team).slice(0, 6);
    const z = m.spawnZones[h.team] || m.spawnZones.CT;
    h.pos.x = (z.min.x + z.max.x) / 2;
    h.pos.z = (z.min.z + z.max.z) / 2;
    h.yaw = 0;
    h.pitch = 0;
    w.__rg = { x: h.pos.x, z: h.pos.z, y: Math.max(0, z.min.y) };
    let k = 0;
    for (const p of w.players)
      p.id !== h.id &&
        ((p.__lane = k++), __rgArm(p, p.__lane));
  }
  w.phase === 'live' ? (w.phaseLeft = 600) : (w.phaseLeft = Math.min(w.phaseLeft, 1));
  h.money = uE;
  for (const s in h.weapons) {
    const W = h.weapons[s];
    W && gw[W.id] && gw[W.id].mag > 0 && (W.reserve = gw[W.id].reserve);
  }
  const R = w.__rg;
  for (const p of w.players) {
    if (p.id === h.id) continue;
    if (!p.alive) {
      p.respawnAt = Math.min(p.respawnAt ?? 1e9, (p.diedAt ?? w.t) + 1.4);
      continue;
    }
    const k = p.__lane ?? 0,
      lane = k % 5,
      x = R.x + __RG_X[lane] + (lane === 2 ? Math.sin(w.t * 0.95) * 3.2 : 0),
      z = R.z - __RG_D[lane] + (lane === 3 ? Math.sin(w.t * 0.45) * 2.4 : 0),
      dtt = Math.max(1e-3, dt || 1 / 60);
    p.vel.x = (x - p.pos.x) / dtt;
    p.vel.z = (z - p.pos.z) / dtt;
    p.vel.y = 0;
    p.pos.x = x;
    p.pos.z = z;
    p.pos.y = R.y;
    p.onGround = !0;
    p.yaw = Math.atan2(-(h.pos.x - x), -(h.pos.z - z));
    p.pitch = 0;
    p.spawnProtUntil = 0;
    __rgArm(p, k);
  }
}
function __rangeBot(w, B, A) {
  const i = Vh(w, B, A);
  return {
    ...i,
    forward: 0,
    strafe: 0,
    fire: !1,
    firePressed: !1,
    melee: !1,
    jump: !1,
    sprint: !1,
    tactical: !1,
    aim: !1,
    crouch: B.__lane % 5 === 1 && Math.floor(w.t / 2.4) % 2 === 1,
    reload: !1,
    slot: null,
    streak: !1,
    use: !1,
  };
}
