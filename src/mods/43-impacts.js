/* ===== Bayou Protocol mod: bullet holes and blood that stay where they belong ===== */
// Why marks floated in the air:
//   - bullet holes were put wherever a shot hit a collision box, and some boxes are never drawn: the
//     invisible walls around every map ("bounds"), the boxes around cars, cones and cacti. Holes on doors,
//     windows and barrels stayed in mid-air after the door opened, the glass broke or the barrel blew up.
//   - blood thrown on the floor was placed at the victim's foot height (+2 cm), so a victim who was jumping,
//     on stairs or on a ledge left blood hanging in the air; pools under bodies spread over step edges.
// Now every mark is checked against what is actually drawn before it appears:
//   1. invisible bounds never get marks
//   2. a drawn map surface (the map's visual boxes) must be right there, facing the same way, or
//   3. a short ray must hit the actual model there (doors, barrels, trees, cars, furniture): the mark is
//      snapped onto that surface with its real orientation
//   otherwise nothing is drawn (no hole, no dust puff in the air). Marks on doors, glass and barrels
//   disappear when that object opens, breaks or explodes.
//
// Blood (replaces the core's red puffs and flying red cubes):
//   - a short mist at the wound, mostly blown out along the bullet's path (more for headshots and big hits)
//   - droplets that fly with the bullet, fall under gravity and collide with the world (Rapier): where one
//     lands on a drawn surface it leaves a drop; on a moving prop it leaves nothing
//   - a spatter on the wall or floor behind the victim (up to 2.4 m), stretched along the bullet's direction
//     and sized by distance
//   - a pool under a body: it starts under the hips once the body has settled and spreads over ~9 s, only
//     as far as the floor stays flat (it never runs over a step edge or into the air)
//   - decals sit a few millimetres above the surface and are depth-tested, so feet standing in a pool are
//     on top of it, not in it. Everything is cleared at the start of each round.
// Drawing: each kind of mark is one instanced mesh (about a dozen draw calls in total, however many marks).
const __IMP = { map: null, vgrid: null, bgrid: null, cand: null, candMap: null, g: null, scene: null, pools: {}, track: [], growing: [], mist: [], drops: null, dropList: [], lastHit: new Map(), pendingPools: [], t: 0 };
const __iv = () => new U();
const __it = { a: __iv(), b: __iv(), c: __iv(), q: new Kw(), q2: new Kw(), m: new _A(), s: __iv(), z: new U(0, 0, 1), rc: null };
// ---------------------------------------------------------------- surface index
const __ICELL = 2;
function __impGrid(list) {
  const g = new Map();
  list.forEach((b) => {
    if (!b || !b.min) return;
    for (let x = Math.floor(b.min.x / __ICELL); x <= Math.floor(b.max.x / __ICELL); x++)
      for (let z = Math.floor(b.min.z / __ICELL); z <= Math.floor(b.max.z / __ICELL); z++) {
        const k = x * 4096 + z;
        g.has(k) || g.set(k, []);
        g.get(k).push(b);
      }
  });
  return g;
}
function __impCells(g, p) {
  return g.get(Math.floor(p.x / __ICELL) * 4096 + Math.floor(p.z / __ICELL)) || [];
}
function __impIndex() {
  const m = aw();
  if (__IMP.map === m) return m;
  __IMP.map = m;
  __IMP.vgrid = __impGrid(m.visuals);
  __IMP.bgrid = __impGrid(m.boxes);
  __IMP.cand = null;
  return m;
}
const __impAxis = (n) => (Math.abs(n.x) >= Math.abs(n.y) && Math.abs(n.x) >= Math.abs(n.z) ? 'x' : Math.abs(n.y) >= Math.abs(n.z) ? 'y' : 'z');
function __impOnFace(b, p, ax, sign) {
  const e = 0.03;
  if (p.x < b.min.x - e || p.x > b.max.x + e || p.y < b.min.y - e || p.y > b.max.y + e || p.z < b.min.z - e || p.z > b.max.z + e) return !1;
  return Math.abs(p[ax] - (sign > 0 ? b.max[ax] : b.min[ax])) < 0.045;
}
// meshes drawn by models (doors, barrels, trees, cars, furniture): world bounds, gridded, built once per map
function __impMeshes() {
  const sc = __IMP.scene;
  if (!sc) return null;
  if (__IMP.cand && __IMP.candMap === __IMP.map) return __IMP.cand;
  const list = [];
  const skip = (o) => {
    for (let p = o; p; p = p.parent) if (p.userData && (p.userData.bpChar || p.userData.__imp || p.userData.noWound) || p === (typeof __fx < 'u' && __fx.g) || p.name === 'bp-props') return !0;
    return !1;
  };
  sc.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.renderOrder >= 1e3 || !o.geometry || !o.geometry.attributes.position) return;
    const tris = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    if (tris > 30000 || skip(o)) return;
    let bb;
    try {
      o.updateWorldMatrix(!0, !1);
      if (o.isInstancedMesh) (o.boundingBox || o.computeBoundingBox()), (bb = o.boundingBox.clone().applyMatrix4(o.matrixWorld));
      else (o.geometry.boundingBox || o.geometry.computeBoundingBox()), (bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
    } catch (e) {
      return;
    }
    const s = bb.getSize(__it.s);
    if (s.x * s.y * s.z > 400) return; // map-sized merged meshes are covered by the visual boxes
    bb.object = o;
    list.push(bb);
  });
  __IMP.cand = __impGrid(list);
  __IMP.candMap = __IMP.map;
  return __IMP.cand;
}
function __impMeshRay(p, n) {
  const g = __impMeshes();
  if (!g) return null;
  const objs = __impCells(g, p).filter((b) => b.distanceToPoint(p) < 0.25).map((b) => b.object);
  if (!objs.length) return null;
  __it.rc || (__it.rc = new UZ());
  const RC = __it.rc;
  RC.set(__it.a.set(p.x + n.x * 0.18, p.y + n.y * 0.18, p.z + n.z * 0.18), __it.b.set(-n.x, -n.y, -n.z).normalize());
  RC.far = 0.45;
  const h = RC.intersectObjects(objs, !1)[0];
  if (!h || !h.face) return null;
  const nm = h.face.normal.clone();
  if (h.object.isInstancedMesh && h.instanceId !== void 0) {
    h.object.getMatrixAt(h.instanceId, __it.m);
    nm.transformDirection(__it.m);
  }
  nm.transformDirection(h.object.matrixWorld);
  nm.dot(__it.b) > 0 && nm.negate();
  return { p: h.point.clone(), n: nm };
}
// Is there a drawn surface at p facing n? Returns { p, n, box } snapped to it, or null.
function __impSurface(p, n) {
  const m = __impIndex(),
    ax = __impAxis(n),
    sign = Math.sign(n[ax]) || 1,
    an = { x: 0, y: 0, z: 0 };
  an[ax] = sign;
  // the ground plane under every map
  if (ax === 'y' && sign > 0 && Math.abs(p.y) < 0.04 && p.x > -1 && p.z > -1 && p.x < m.w + 1 && p.z < m.d + 1) return { p: { x: p.x, y: 0, z: p.z }, n: an, box: null };
  let box = null;
  for (const b of __impCells(__IMP.bgrid, p))
    if (!b.off && __impOnFace(b, p, ax, sign)) {
      box = b;
      if (b.kind !== 'bounds') break;
    }
  if (box && box.kind === 'bounds') return null;
  if (!box || !/door|glass|barrel/.test(box.kind))
    for (const v of __impCells(__IMP.vgrid, p)) if (__impOnFace(v, p, ax, sign)) return { p: { ...p, [ax]: sign > 0 ? v.max[ax] : v.min[ax] }, n: an, box };
  const h = __impMeshRay(p, n);
  return h ? { p: h.p, n: h.n, box } : null;
}
// ---------------------------------------------------------------- textures
function __impCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new LI(c);
  t.colorSpace = Tw;
  t.anisotropy = 4;
  return t;
}
const __rnd = (a, b) => a + Math.random() * (b - a);
function __blob(g, x, y, r, col, lumps = 9) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i <= lumps; i++) {
    const a = (i / lumps) * Math.PI * 2,
      rr = r * __rnd(0.72, 1.15);
    i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}
const __IMP_TEX = {
  // spatter: dense core, droplets and streaks thrown towards +x (the bullet's direction)
  splat: () =>
    __impCanvas(256, 128, (g, w, h) => {
      const cx = w * 0.3,
        cy = h / 2;
      __blob(g, cx, cy, 26, 'rgba(92,6,8,0.92)', 14);
      __blob(g, cx + 6, cy - 4, 15, 'rgba(70,4,6,0.95)', 10);
      for (let i = 0; i < 46; i++) {
        const a = __rnd(-0.55, 0.55) + (Math.random() < 0.15 ? Math.PI : 0),
          d = __rnd(18, 118),
          r = Math.max(1, 6 * Math.random() * (1 - d / 140));
        __blob(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.55, r, `rgba(${80 + Math.random() * 30},5,7,${__rnd(0.6, 0.95)})`, 6);
      }
      for (let i = 0; i < 7; i++) {
        const a = __rnd(-0.35, 0.35),
          d = __rnd(40, 110);
        g.strokeStyle = 'rgba(85,6,8,0.75)';
        g.lineWidth = __rnd(1.5, 3.5);
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(cx + 18, cy + Math.sin(a) * 8);
        g.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.5);
        g.stroke();
      }
    }),
  pool: () =>
    __impCanvas(256, 256, (g, w) => {
      const c = w / 2;
      __blob(g, c, c, 104, 'rgba(58,3,5,0.95)', 22);
      __blob(g, c + 6, c - 4, 86, 'rgba(84,6,8,0.96)', 18);
      for (let i = 0; i < 6; i++) __blob(g, c + __rnd(-70, 70), c + __rnd(-70, 70), __rnd(14, 30), 'rgba(96,8,10,0.9)', 9);
      const gr = g.createRadialGradient(c - 22, c - 26, 4, c, c, 100);
      gr.addColorStop(0, 'rgba(255,255,255,0.10)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    }),
  drop: () =>
    __impCanvas(64, 64, (g) => {
      __blob(g, 32, 32, 20, 'rgba(88,6,8,0.95)', 10);
      for (let i = 0; i < 5; i++) __blob(g, 32 + __rnd(-26, 26), 32 + __rnd(-26, 26), __rnd(2, 4), 'rgba(88,6,8,0.85)', 6);
    }),
  hole: (mat) =>
    __impCanvas(64, 64, (g) => {
      const c = 32;
      if (mat === 'metal') {
        const gr = g.createRadialGradient(c, c, 2, c, c, 26);
        gr.addColorStop(0, 'rgba(12,12,12,1)');
        gr.addColorStop(0.32, 'rgba(40,38,36,0.95)');
        gr.addColorStop(0.45, 'rgba(190,185,175,0.85)');
        gr.addColorStop(0.62, 'rgba(90,86,80,0.4)');
        gr.addColorStop(1, 'rgba(60,56,50,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
        return;
      }
      const wood = mat === 'wood';
      // chipped crater: a pale ring of exposed material, scorched edge, dark hole
      __blob(g, c, c, wood ? 22 : 25, wood ? 'rgba(196,160,116,0.55)' : 'rgba(205,198,186,0.5)', 12);
      __blob(g, c, c, wood ? 13 : 15, 'rgba(70,60,50,0.75)', 10);
      __blob(g, c, c, wood ? 7 : 8, 'rgba(10,9,8,1)', 8);
      g.strokeStyle = 'rgba(30,26,22,0.6)';
      g.lineWidth = 1;
      for (let i = 0; i < (wood ? 4 : 7); i++) {
        const a = Math.random() * Math.PI * 2,
          d = __rnd(14, 30);
        g.beginPath();
        g.moveTo(c + Math.cos(a) * 9, c + Math.sin(a) * 9);
        g.lineTo(c + Math.cos(a) * d, c + Math.sin(a) * d * (wood ? 0.3 : 1));
        g.stroke();
      }
    }),
  mist: () =>
    __impCanvas(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(120,10,12,0.85)');
      gr.addColorStop(0.5, 'rgba(100,8,10,0.4)');
      gr.addColorStop(1, 'rgba(90,6,8,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    }),
};
// ---------------------------------------------------------------- decal pools (one instanced mesh each)
const __IMP_KINDS = {
  splat: { tex: 'splat', cap: 60, rough: 0.3, var: 3 },
  pool: { tex: 'pool', cap: 14, rough: 0.18, var: 2 },
  drop: { tex: 'drop', cap: 120, rough: 0.3, var: 2 },
  hole: { tex: 'hole', cap: 70, rough: 0.9, var: 2 },
  holeWood: { tex: 'hole', mat: 'wood', cap: 40, rough: 0.9, var: 1 },
  holeMetal: { tex: 'hole', mat: 'metal', cap: 40, rough: 0.5, var: 1 },
};
const __zero = new _A().makeScale(0, 0, 0);
function __impInit() {
  const sc = typeof __R3F < 'u' && __R3F && __R3F.scene;
  if (!sc) return !1;
  if (__IMP.scene === sc && __IMP.g && __IMP.g.parent === sc) return !0;
  __IMP.scene = sc;
  __IMP.g && __IMP.g.removeFromParent();
  const g = new ji();
  g.name = 'bp-impacts';
  g.userData.__imp = !0;
  sc.add(g);
  __IMP.g = g;
  const plane = new bB(1, 1);
  __IMP.pools = {};
  for (const [k, d] of Object.entries(__IMP_KINDS))
    __IMP.pools[k] = [...Array(d.var)].map(() => {
      const mat = new Gw({ map: __IMP_TEX[d.tex](d.mat), transparent: !0, depthWrite: !1, polygonOffset: !0, polygonOffsetFactor: -2, polygonOffsetUnits: -4, roughness: d.rough, metalness: 0 });
      const im = new QZ(plane, mat, d.cap);
      im.frustumCulled = !1;
      im.renderOrder = 2;
      im.receiveShadow = !0;
      im.userData.__imp = !0;
      for (let i = 0; i < d.cap; i++) im.setMatrixAt(i, __zero);
      g.add(im);
      return { im, n: 0, cap: d.cap };
    });
  // mist sprites and droplets
  const mt = __IMP_TEX.mist();
  __IMP.mist = [...Array(28)].map(() => {
    const s = new Cc(new Io({ map: mt, transparent: !0, depthWrite: !1 }));
    s.visible = !1;
    s.userData.__imp = !0;
    g.add(s);
    return { s, v: __iv(), life: 0, max: 1, grow: 1 };
  });
  const dm = new QZ(new bi(1, 5, 4), new Gw({ color: '#5a0507', roughness: 0.25 }), 160);
  dm.frustumCulled = !1;
  dm.userData.__imp = !0;
  for (let i = 0; i < 160; i++) dm.setMatrixAt(i, __zero);
  g.add(dm);
  __IMP.drops = { im: dm, n: 0, list: [...Array(160)].map(() => ({ p: __iv(), v: __iv(), r: 0, life: 0 })) };
  __IMP.track = [];
  __IMP.growing = [];
  return !0;
}
// place a decal: centre p, normal n, size (m), rotation about the normal, stretch along the decal's x axis
function __impPlace(kind, p, n, size, rot, stretch = 1, box = null, grow = null) {
  const set = __IMP.pools[kind];
  if (!set) return null;
  const P = set[Math.floor(Math.random() * set.length)],
    i = P.n++ % P.cap;
  const pos = __it.a.set(p.x + n.x * 0.004, p.y + n.y * 0.004, p.z + n.z * 0.004);
  __it.q.setFromUnitVectors(__it.z, __it.b.set(n.x, n.y, n.z).normalize());
  __it.q2.setFromAxisAngle(__it.z, rot);
  __it.q.multiply(__it.q2);
  const rec = { P, i, pos: pos.clone(), q: __it.q.clone(), sx: size * stretch, sy: size, box };
  __impWrite(rec, grow ? grow.from : 1);
  // anything previously tracked in this slot is gone now
  __IMP.track = __IMP.track.filter((t) => !(t.P === P && t.i === i));
  __IMP.growing = __IMP.growing.filter((t) => !(t.P === P && t.i === i));
  box && __IMP.track.push(rec);
  grow && ((rec.t0 = performance.now() / 1e3), (rec.grow = grow), __IMP.growing.push(rec));
  return rec;
}
function __impWrite(rec, k) {
  rec.P.im.setMatrixAt(rec.i, __it.m.compose(rec.pos, rec.q, __it.s.set(rec.sx * k, rec.sy * k, 1)));
  rec.P.im.instanceMatrix.needsUpdate = !0;
}
function __impClear() {
  for (const set of Object.values(__IMP.pools))
    for (const P of set) {
      for (let i = 0; i < P.cap; i++) P.im.setMatrixAt(i, __zero);
      P.im.instanceMatrix.needsUpdate = !0;
    }
  __IMP.track = [];
  __IMP.growing = [];
  __IMP.pendingPools = [];
  if (__IMP.drops) for (const d of __IMP.drops.list) d.life = 0;
}
// rotation about the normal so the decal's x axis follows direction d along the surface
function __impAlong(n, d) {
  __it.q.setFromUnitVectors(__it.z, __it.b.set(n.x, n.y, n.z).normalize());
  const lx = __it.a.set(1, 0, 0).applyQuaternion(__it.q),
    ly = __it.c.set(0, 1, 0).applyQuaternion(__it.q),
    k = d.x * n.x + d.y * n.y + d.z * n.z,
    px = d.x - n.x * k,
    py = d.y - n.y * k,
    pz = d.z - n.z * k;
  return Math.atan2(px * ly.x + py * ly.y + pz * ly.z, px * lx.x + py * lx.y + pz * lx.z);
}
// ---------------------------------------------------------------- world rays (Rapier when available)
function __impRay(o, d, len, props) {
  if (typeof __phxOn == 'function' && __phxOn()) {
    const P = __PHX,
      h = P.world.castRayAndGetNormal(__phxRay(o, d), len, !0, void 0, __cg(__CG.DEBRIS, __CG.ENV | (props ? __CG.INTERACTIVE : 0)));
    P.stats.rays++;
    if (!h) return null;
    return { t: h.timeOfImpact, p: { x: o.x + d.x * h.timeOfImpact, y: o.y + d.y * h.timeOfImpact, z: o.z + d.z * h.timeOfImpact }, n: { x: h.normal.x, y: h.normal.y, z: h.normal.z }, prop: P.propOf.has(h.collider.handle) };
  }
  const r = jc(o, d, len, aw().boxes, (b) => b.solid && b.kind !== 'glass');
  return r ? { t: r.t, p: r.point, n: r.normal, prop: !1 } : null;
}
// ---------------------------------------------------------------- blood
function __bloodHit(e) {
  if (!e.pos || e.shield) return;
  const now = performance.now() / 1e3,
    last = __IMP.lastHit.get(e.victim) || 0;
  // a shotgun blast is one wound, not nine
  if (now - last < 0.06) return;
  __IMP.lastHit.set(e.victim, now);
  let d = e.dir || { x: 0, y: 0, z: 1 };
  const L = Math.hypot(d.x, d.y, d.z) || 1;
  d = { x: d.x / L, y: d.y / L, z: d.z / L };
  const k = Math.max(0.45, Math.min(1.6, (e.dmg || 30) / 38)) * (e.headshot ? 1.5 : 1),
    p = e.pos;
  // mist: most of it blown through along the bullet, a little back towards the shooter
  for (let i = 0; i < (e.headshot ? 6 : 4); i++) {
    const m = __IMP.mist[(__IMP.mi = ((__IMP.mi || 0) + 1) % __IMP.mist.length)],
      back = i === 0;
    m.s.position.set(p.x, p.y, p.z);
    const sp = back ? -0.6 : __rnd(1.2, 2.6) * k;
    m.v.set(d.x * sp + __rnd(-0.35, 0.35), d.y * sp + __rnd(-0.1, 0.4), d.z * sp + __rnd(-0.35, 0.35));
    m.life = m.max = __rnd(0.16, 0.32) * (back ? 0.7 : 1);
    m.size = __rnd(0.08, 0.14) * k;
    m.grow = __rnd(2.2, 3.4);
    m.s.material.opacity = 0.85;
    m.s.scale.setScalar(m.size);
    m.s.visible = !0;
  }
  // droplets
  const D = __IMP.drops,
    n = Math.round(5 + 9 * k);
  for (let i = 0; i < n; i++) {
    const o = D.list[D.n++ % D.list.length],
      sp = __rnd(1.8, 4.8) * Math.min(1.3, k);
    o.p.set(p.x + d.x * 0.08, p.y + d.y * 0.08, p.z + d.z * 0.08);
    o.v.set(d.x * sp + __rnd(-0.9, 0.9), d.y * sp + __rnd(-0.2, 1.1), d.z * sp + __rnd(-0.9, 0.9));
    o.r = __rnd(0.004, 0.009);
    o.life = 2.5;
    o.mark = Math.random() < 0.55;
  }
  // spatter behind the victim
  if (e.headshot || (e.dmg || 0) >= 35 || Math.random() < 0.55) {
    const o = { x: p.x + d.x * 0.25, y: p.y + d.y * 0.25, z: p.z + d.z * 0.25 },
      h = __impRay(o, d, 2.4, !1);
    if (h && !h.prop) {
      const s = __impSurface(h.p, h.n);
      if (s) {
        const dist = h.t + 0.25,
          size = (0.22 + 0.22 * k) * (1.15 - dist / 3.2);
        size > 0.06 && __impPlace('splat', s.p, s.n, size, __impAlong(s.n, d) + __rnd(-0.12, 0.12), 1.6 + Math.min(1, dist) * 0.6, s.box, { from: 0.55, to: 1, dur: 0.06 });
      }
    }
  }
}
function __bloodPoolLater(victim) {
  __IMP.pendingPools.push({ victim, at: performance.now() / 1e3 + 0.9 });
}
function __bloodPool(victim) {
  const st = eA.state,
    v = st && st.players.find((p) => p.id === victim);
  if (!v) return;
  // where the body actually lies: its hips bone (the ragdoll moves the skeleton)
  let c = { x: v.pos.x, y: v.pos.y + 0.4, z: v.pos.z };
  try {
    const rec = typeof __BODY < 'u' && __BODY.hb.get(victim),
      hips = rec && rec.s && rec.s.getObjectByName('mixamorigHips');
    if (hips) {
      const w = hips.getWorldPosition(__iv());
      Math.hypot(w.x - v.pos.x, w.z - v.pos.z) < 3 && (c = { x: w.x, y: w.y + 0.3, z: w.z });
    }
  } catch (e) {}
  const down = { x: 0, y: -1, z: 0 },
    h = __impRay(c, down, 1.6, !1);
  if (!h || h.prop || h.n.y < 0.85) return;
  const s = __impSurface(h.p, h.n);
  if (!s) return;
  // spread only as far as the floor stays flat and drawn
  let R = 0;
  for (const r of [0.55, 0.45, 0.36, 0.28, 0.2]) {
    let ok = !0;
    for (let i = 0; i < 8 && ok; i++) {
      const a = (i / 8) * Math.PI * 2,
        q = { x: s.p.x + Math.cos(a) * r, y: s.p.y + 0.25, z: s.p.z + Math.sin(a) * r },
        hh = __impRay(q, down, 0.4, !1);
      ok = !!hh && !hh.prop && Math.abs(hh.p.y - s.p.y) < 0.03 && !!__impSurface(hh.p, hh.n);
    }
    if (ok) {
      R = r;
      break;
    }
  }
  R && __impPlace('pool', s.p, s.n, R * 2, Math.random() * 6.28, 1, null, { from: 0.12, to: 1, dur: 9 });
}
// ---------------------------------------------------------------- per frame
function __impTick(dt) {
  if (!__IMP.g) return;
  dt = Math.min(dt, 0.05);
  const now = performance.now() / 1e3;
  for (const m of __IMP.mist) {
    if (m.life <= 0) continue;
    m.life -= dt;
    if (m.life <= 0) {
      m.s.visible = !1;
      continue;
    }
    const k = 1 - m.life / m.max;
    m.v.multiplyScalar(1 - 6 * dt);
    m.v.y -= 1.2 * dt;
    m.s.position.addScaledVector(m.v, dt);
    m.s.scale.setScalar(m.size * (1 + k * m.grow));
    m.s.material.opacity = 0.85 * (1 - k) * (1 - k);
  }
  // droplets: gravity and drag, swept against the world; a landing on a drawn surface leaves a drop
  const D = __IMP.drops;
  if (D) {
    let any = !1;
    D.list.forEach((o, i) => {
      if (o.life <= 0) return;
      any = !0;
      o.life -= dt;
      o.v.y -= 9.81 * dt;
      o.v.multiplyScalar(1 - 0.6 * dt);
      const sp = o.v.length(),
        L = sp * dt;
      let dead = o.life <= 0;
      if (!dead && L > 1e-5) {
        const dir = { x: o.v.x / sp, y: o.v.y / sp, z: o.v.z / sp },
          h = __impRay(o.p, dir, L + 0.005, !0);
        if (h) {
          dead = !0;
          if (o.mark && !h.prop) {
            const s = __impSurface(h.p, h.n);
            s && __impPlace('drop', s.p, s.n, o.r * __rnd(5, 9), Math.random() * 6.28, 1 + Math.min(1.2, Math.hypot(dir.x, dir.z) * (s.n.y > 0.8 ? 1.4 : 0.4)), s.box);
          }
        } else o.p.addScaledVector(o.v, dt);
      }
      if (dead) {
        o.life = 0;
        D.im.setMatrixAt(i, __zero);
      } else D.im.setMatrixAt(i, __it.m.compose(o.p, __it.q.identity(), __it.s.set(o.r, o.r * 1.6, o.r)));
    });
    (any || D.was) && (D.im.instanceMatrix.needsUpdate = !0);
    D.was = any;
  }
  // growing decals (spatter pops out, pools spread)
  for (let i = __IMP.growing.length - 1; i >= 0; i--) {
    const r = __IMP.growing[i],
      t = Math.min(1, (now - r.t0) / r.grow.dur),
      e = 1 - Math.pow(1 - t, 3);
    __impWrite(r, r.grow.from + (r.grow.to - r.grow.from) * e);
    t >= 1 && __IMP.growing.splice(i, 1);
  }
  for (let i = __IMP.pendingPools.length - 1; i >= 0; i--)
    if (now >= __IMP.pendingPools[i].at) {
      const p = __IMP.pendingPools.splice(i, 1)[0];
      try {
        __bloodPool(p.victim);
      } catch (e) {}
    }
  // marks on doors, glass and barrels go with them
  if (now - __IMP.t > 0.25) {
    __IMP.t = now;
    for (let i = __IMP.track.length - 1; i >= 0; i--) {
      const r = __IMP.track[i];
      if (!r.box.off) continue;
      r.P.im.setMatrixAt(r.i, __zero);
      r.P.im.instanceMatrix.needsUpdate = !0;
      __IMP.track.splice(i, 1);
    }
  }
}
// ---------------------------------------------------------------- the core's effects see only valid marks
function __impFilter(list) {
  if (!list || !list.length || !__impInit()) return list;
  const out = [];
  for (const e of list) {
    if (e.type === 'impact') {
      if (e.flesh) continue; // blood is drawn here, from the 'hit' event
      if (e.__phx) {
        out.push(e);
        continue;
      }
      const s = __impSurface(e.pos, e.normal);
      if (!s) continue; // nothing drawn there: no hole, no dust in the air
      const kind = e.mat === 'wood' ? 'holeWood' : e.mat === 'metal' ? 'holeMetal' : 'hole';
      e.noHole || __impPlace(kind, s.p, s.n, __rnd(0.065, 0.09), Math.random() * 6.28, 1, s.box);
      out.push({ ...e, pos: s.p, normal: s.n, noHole: !0 });
    } else if (e.type === 'blood') continue;
    else if (e.type === 'kill') e.victim && __bloodPoolLater(e.victim);
    else if (e.type === 'hit') {
      try {
        __bloodHit(e);
      } catch (x) {}
      out.push(e);
    } else {
      e.type === 'roundStart' && __impClear();
      out.push(e);
    }
  }
  return out;
}
{
  const coreOn = eA.on;
  eA.on = function (fn) {
    if (typeof fn == 'function' && /nextDecal/.test(Function.prototype.toString.call(fn))) {
      const wrapped = (list, st) => fn(__impFilter(list), st);
      return coreOn.call(this, wrapped);
    }
    return coreOn.apply(this, arguments);
  };
}
{
  const coreTick = __fxTick;
  __fxTick = function (dt) {
    coreTick(dt);
    try {
      __impTick(dt);
    } catch (e) {}
  };
}
typeof window < 'u' &&
  (window.__bpImpacts = () => ({
    holes: ['hole', 'holeWood', 'holeMetal'].reduce((n, k) => n + (__IMP.pools[k] || []).reduce((a, P) => a + Math.min(P.n, P.cap), 0), 0),
    splats: (__IMP.pools.splat || []).reduce((a, P) => a + Math.min(P.n, P.cap), 0),
    drops: (__IMP.pools.drop || []).reduce((a, P) => a + Math.min(P.n, P.cap), 0),
    pools: (__IMP.pools.pool || []).reduce((a, P) => a + Math.min(P.n, P.cap), 0),
    tracked: __IMP.track.length,
    check: (p, n) => __impSurface(p, n),
  }));
