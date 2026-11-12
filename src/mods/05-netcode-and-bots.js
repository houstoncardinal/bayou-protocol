/* ===== Bayou Protocol mod: netcode hardening, bots ===== */
function __histRec(A) {
  for (const p of A.players) {
    const h = p.__hist || (p.__hist = []);
    h.push({ t: A.t, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    for (; h.length && A.t - h[0].t > 0.5;) h.shift();
  }
}
function __claimOk(A, i, B, g, I) {
  const w = gw[g] || (g === 'melee' ? gw.knife : null);
  if (!w) return !1;
  const now = A.t,
    bk = i.__tb || (i.__tb = {}),
    pel = Math.max(1, w.pellets || 1),
    rate = Math.max(0.05, w.rate || 0.1);
  let b = bk[g];
  b || (b = bk[g] = { tok: pel * 4, at: now });
  b.tok = Math.min(pel * 4, b.tok + (Math.max(0, now - b.at) / rate) * pel * 1.3);
  b.at = now;
  if (b.tok < 1) return !1;
  b.tok -= 1;
  const dmg = Nw(I[2]),
    cap = (w.damage * Math.max(1, w.headMult || 1) + (w.splash ? w.damage : 0)) * 1.12 + 6;
  if (dmg > cap) return !1;
  const d = Math.hypot(B.pos.x - i.pos.x, B.pos.z - i.pos.z);
  if (g === 'grenade' || g === 'rpg') return d < 40;
  if (d > Math.max(8, (w.range || 60) * 1.5 + 6)) return !1;
  if (g === 'melee' || g === 'knife') return d < 4;
  const boxes = aw().boxes,
    eye = Hi(i),
    pts = [B.pos, ...(B.__hist || []).filter((h) => now - h.t < 0.45)];
  for (const p of pts)
    for (const y of [1.55, 1.1, 0.45])
      if (Pg(eye, { x: p.x, y: p.y + y - (B.crouch || 0) * 0.45, z: p.z }, boxes)) return !0;
  return (w.pen || 0) >= 1 && d < 70;
}
function __clampMove(A, p, o, dt) {
  if (A.t - (p.spawnedAt ?? -9) < 1.5) return;
  const dx = p.pos.x - o.x,
    dz = p.pos.z - o.z,
    d = Math.hypot(dx, dz),
    mx = 14 * Math.max(dt, 1 / 60) + 0.6;
  if (d > mx && d < 25) {
    const k = mx / d;
    ((p.pos.x = o.x + dx * k), (p.pos.z = o.z + dz * k));
  }
}
function __tSite(w) {
  const last = w.__lastSite;
  let s = Dw(w) < 0.5 ? 'A' : 'B';
  last && (s = Dw(w) < 0.62 ? (last === 'A' ? 'B' : 'A') : last);
  w.__lastSite = s;
  return s;
}
function __tRotate(w, C, g) {
  if (C.rot || w.bomb.state === 'planted') return;
  const ci = c8(w, 'T');
  if (!ci || w.t - ci.at > 2.5) return;
  const st = g(C.site);
  if (!st) return;
  const cx = (st.min.x + st.max.x) / 2,
    cz = (st.min.z + st.max.z) / 2;
  if (Ci(ci.pos, { x: cx, z: cz }) < 24 && w.t < C.executeAt + 12 && Dw(w) < 0.08) {
    C.site = C.site === 'A' ? 'B' : 'A';
    C.rot = 1;
    C.executeAt = Math.max(C.executeAt, w.t + 5);
  }
}
