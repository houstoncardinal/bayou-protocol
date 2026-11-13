/* ===== Bayou Protocol mod: Blackwater State Penitentiary (map) ===== */
// A maximum-security prison on the edge of the bayou, built at real scale (metres):
//   North    Visitor lot outside the wall, Gatehouse (metal detector, X-ray belt, control booth), vehicle
//            sally port, and a riot breach blown through the north-west wall
//   West     A Block: two tiers of barred cells (bunks, steel toilets and sinks) around a dayroom with bolted
//            tables and a glass control picket; galleries reached by steel stairs
//   Centre   Administration and Visitation (booths with glass partitions and handsets), the warden's office,
//            records; the Exercise Yard with a basketball court, weight pit, bleachers and a guard tower
//   East     Infirmary, Laundry with industrial washers, NE gate tower
//   South    Cafeteria (serving line with sneeze guards, steel tables, kitchen, walk-in freezer, dish pit),
//            Solitary (SHU) with steel cell doors, the Service Dock behind the south fence
// Terrorists start in the visitor lot (they came in as visitors); Counter-Terrorists stage at the service
// dock. Bombsite A is the cafeteria and kitchen, bombsite B is the A Block dayroom.
// Cell bars, fences and grilles block movement but not bullets or sight (solid: false), like real bars.
// Loose things (trays, chairs, bins, mattresses, crates, the yard basketball) are Rapier props (34-physics.js).
function __prisonBuild() {
  const w = new Po(),
    A = w.m,
    W = 128,
    D = 104;
  A.id = 'prison';
  A.name = 'Blackwater Penitentiary';
  A.w = W;
  A.d = D;
  A.backdrop = 'industrial';
  A.physProps = [];
  const P = (type, x, zz, rotY = 0, y = 0) => A.physProps.push({ type, x, z: zz, rotY, y });
  // ---------------------------------------------------------------- palette
  const C = {
    wallOut: '#b8b2a5',
    wallIn: '#dcd6c6',
    band: '#6f8466', // institutional green wainscot
    floor: '#a7a49b',
    epoxy: '#8f9a90',
    steel: '#5c646b',
    bars: '#4b5258',
    rail: '#3a3f44',
    door: '#6e7a80',
    yellow: '#d6ad2a',
    trim: '#4f555a',
    tile: '#c8c3b6',
    road: '#55575a',
    walk: '#b5b0a5',
  };
  // ---------------------------------------------------------------- helpers
  // solid box. Steel furniture and fixtures get a flat painted/stainless finish ('trim'); the game's 'metal'
  // surface is corrugated sheet. Bullets still spark and ring as metal.
  const bx = (x0, y0, z0, x1, y1, z1, kind, mat, color, o = {}) =>
    w.solid(x0, y0, z0, x1, y1, z1, kind, mat === 'metal' ? 'trim' : mat, color, { mat: mat === 'metal' ? 'metal' : mat === 'wood' ? 'wood' : 'concrete', ...o });
  // bars and grilles: they stop people, not bullets or eyes
  const bars = (x0, z0, x1, z1, y0, h, gapFrom = null, gapTo = null) => {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0),
      a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1),
      a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1),
      f = alongX ? z0 : x0,
      t = 0.035;
    const segs = gapFrom === null ? [[a0, a1]] : [[a0, gapFrom], [gapTo, a1]];
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.05) continue;
      alongX
        ? w.box(s0, y0, f - t, s1, y0 + h, f + t, 'bars', { mat: 'metal', solid: !1, pen: 1 })
        : w.box(f - t, y0, s0, f + t, y0 + h, s1, 'bars', { mat: 'metal', solid: !1, pen: 1 });
      const n = Math.max(1, Math.round((s1 - s0) / 0.13));
      for (let i = 0; i <= n; i++) {
        const a = s0 + ((s1 - s0) * i) / n;
        alongX ? w.vis(a - 0.014, y0, f - 0.014, a + 0.014, y0 + h, f + 0.014, 'metal', C.bars) : w.vis(f - 0.014, y0, a - 0.014, f + 0.014, y0 + h, a + 0.014, 'metal', C.bars);
      }
      for (const yy of [y0 + 0.06, y0 + 1.05, y0 + h - 0.06])
        alongX ? w.vis(s0, yy - 0.03, f - 0.025, s1, yy + 0.03, f + 0.025, 'metal', C.bars) : w.vis(f - 0.025, yy - 0.03, s0, f + 0.025, yy + 0.03, s1, 'metal', C.bars);
    }
  };
  // chain-link style fence: posts, rails and a see-through mesh (blocks movement only)
  const fence = (x0, z0, x1, z1, h = 3.4, gaps = []) => {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0),
      a0 = alongX ? x0 : z0,
      a1 = alongX ? x1 : z1,
      f = alongX ? z0 : x0;
    let s = a0;
    const segs = [];
    for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) segs.push([s, g0]), (s = g1);
    segs.push([s, a1]);
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.1) continue;
      alongX ? w.box(s0, 0, f - 0.04, s1, h, f + 0.04, 'bars', { mat: 'metal', solid: !1, pen: 1 }) : w.box(f - 0.04, 0, s0, f + 0.04, h, s1, 'bars', { mat: 'metal', solid: !1, pen: 1 });
      const n = Math.max(1, Math.round((s1 - s0) / 3));
      for (let i = 0; i <= n; i++) {
        const a = s0 + ((s1 - s0) * i) / n;
        alongX ? w.vis(a - 0.04, 0, f - 0.04, a + 0.04, h + 0.5, f + 0.04, 'metal', '#7d858b') : w.vis(f - 0.04, 0, a - 0.04, f + 0.04, h + 0.5, a + 0.04, 'metal', '#7d858b');
      }
      // mesh: a fine lattice of thin wires reads as chain-link from a few metres away
      for (let yy = 0.25; yy < h; yy += 0.25) alongX ? w.vis(s0, yy, f - 0.006, s1, yy + 0.012, f + 0.006, 'metal', '#9aa1a6') : w.vis(f - 0.006, yy, s0, f + 0.006, yy + 0.012, s1, 'metal', '#9aa1a6');
      for (let a = s0 + 0.25; a < s1; a += 0.25) alongX ? w.vis(a, 0.05, f - 0.006, a + 0.012, h, f + 0.006, 'metal', '#9aa1a6') : w.vis(f - 0.006, 0.05, a, f + 0.006, h, a + 0.012, 'metal', '#9aa1a6');
      // razor wire coil on top
      alongX ? w.vis(s0, h + 0.3, f - 0.22, s1, h + 0.62, f + 0.22, 'metal', '#5b6166') : w.vis(f - 0.22, h + 0.3, s0, f + 0.22, h + 0.62, s1, 'metal', '#5b6166');
    }
  };
  // a steel table with four bolted stools (prison dayroom / cafeteria)
  const steelTable = (x, zz, long = !1) => {
    const [hw, hd] = long ? [1.2, 0.45] : [0.6, 0.6];
    bx(x - hw, 0, zz - hd, x + hw, 0.76, zz + hd, 'prop', 'metal', '#8c949a', { pen: 3 });
    w.vis(x - 0.08, 0, zz - 0.08, x + 0.08, 0.72, zz + 0.08, 'metal', C.steel);
    const st = long
      ? [[-0.8, -0.95], [0, -0.95], [0.8, -0.95], [-0.8, 0.95], [0, 0.95], [0.8, 0.95]]
      : [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [sx, sz] of st) {
      bx(x + sx - 0.19, 0, zz + sz - 0.19, x + sx + 0.19, 0.46, zz + sz + 0.19, 'prop', 'metal', '#7e878d', { pen: 3 });
      // a thin invisible cap: the collider top (0.53 m) is above the automatic step-up height (0.48 m), so
      // running into a stool does not carry you up onto it and over the table; jumping still does
      w.box(x + sx - 0.19, 0.46, zz + sz - 0.19, x + sx + 0.19, 0.53, zz + sz + 0.19, 'prop', { mat: 'metal' });
      w.vis(x + sx * 0.5 - 0.03, 0.1, zz + sz * 0.5 - 0.03, x + sx * 0.95 + 0.03, 0.14, zz + sz * 0.95 + 0.03, 'metal', C.steel);
    }
  };
  // a guard tower: legs, a cabin floor reached by a stair, a waist-high parapet and a roof
  const tower = (x0, z0, size, hgt, open) => {
    for (const [cx, cz] of [[x0, z0], [x0 + size, z0], [x0, z0 + size], [x0 + size, z0 + size]]) bx(cx - 0.15, 0, cz - 0.15, cx + 0.15, hgt, cz + 0.15, 'prop', 'concrete', '#a9a397');
    Tn(w, x0 - 0.3, z0 - 0.3, x0 + size + 0.3, z0 + size + 0.3, hgt, 'concrete', '#9c978c', 0.3);
    const top = hgt;
    // parapet with gaps for the stair and the windows
    open !== 'N' && bx(x0 - 0.3, top, z0 - 0.3, x0 + size + 0.3, top + 1.05, z0 - 0.1, 'wall', 'concrete', C.wallOut);
    open !== 'S' && bx(x0 - 0.3, top, z0 + size + 0.1, x0 + size + 0.3, top + 1.05, z0 + size + 0.3, 'wall', 'concrete', C.wallOut);
    open !== 'W' && bx(x0 - 0.3, top, z0 - 0.1, x0 - 0.1, top + 1.05, z0 + size + 0.1, 'wall', 'concrete', C.wallOut);
    open !== 'E' && bx(x0 + size + 0.1, top, z0 - 0.1, x0 + size + 0.3, top + 1.05, z0 + size + 0.1, 'wall', 'concrete', C.wallOut);
    // roof on corner posts
    for (const [cx, cz] of [[x0 - 0.2, z0 - 0.2], [x0 + size + 0.2, z0 - 0.2], [x0 - 0.2, z0 + size + 0.2], [x0 + size + 0.2, z0 + size + 0.2]]) w.vis(cx - 0.06, top + 1.05, cz - 0.06, cx + 0.06, top + 2.6, cz + 0.06, 'metal', C.rail);
    bx(x0 - 0.6, top + 2.6, z0 - 0.6, x0 + size + 0.6, top + 2.85, z0 + size + 0.6, 'roof', 'metal', '#4a5056');
    w.vis(x0 + size / 2 - 0.25, top + 2.85, z0 + size / 2 - 0.25, x0 + size / 2 + 0.25, top + 3.2, z0 + size / 2 + 0.25, 'metal', '#2f3438');
    A.lights.push({ pos: z(x0 + size / 2, top + 3.4, z0 + size / 2), interior: !1 });
    return top;
  };
  // ---------------------------------------------------------------- ground and perimeter
  w.vis(-60, -0.2, -60, W + 60, 0, D + 60, 'grass', '#73855a');
  F9(w, W, D, '#bdb7aa', 'concrete', 6.2);
  // razor wire along the perimeter wall top
  for (const [x0, z0, x1, z1] of [[0, -0.5, W, 0], [0, D, W, D + 0.5], [-0.5, 0, 0, D], [W, 0, W + 0.5, D]]) w.vis(x0 - 0.2, 6.25, z0 - 0.2, x1 + 0.2, 6.65, z1 + 0.2, 'metal', '#5b6166');
  // north visitor lot (outside the inner wall)
  w.vis(0, 0.004, 0, W, 0.014, 14, 'asphalt', C.road);
  for (let x = 6; x < 52; x += 3) w.vis(x, 0.015, 2, x + 0.1, 0.02, 7, 'trim', '#e8e6df');
  for (let x = 78; x < 96; x += 3) w.vis(x, 0.015, 2, x + 0.1, 0.02, 7, 'trim', '#e8e6df');
  // inner compound
  w.vis(0, 0.004, 14.6, W, 0.012, 92, 'concrete', '#a9a59b');
  w.vis(0, 0.012, 14.6, W, 0.02, 23, 'asphalt', C.road); // main road
  for (let x = 4; x < W - 4; x += 6) w.vis(x, 0.021, 18.7, x + 3, 0.026, 18.9, 'trim', '#e3cf7a');
  w.vis(36, 0.012, 23, 44, 0.02, 92, 'concrete', C.walk); // west alley
  w.vis(84, 0.012, 38, 100, 0.02, 70, 'concrete', C.walk);
  // grass verges inside the wall (between buildings), patched and worn
  w.vis(100, 0.012, 40, 124, 0.02, 44, 'grass', '#6f8a52');
  w.vis(4, 0.012, 72.5, 36, 0.02, 75.5, 'grass', '#6f8a52');
  // ---------------------------------------------------------------- inner north wall, Gatehouse, sally port, breach
  const wallH = 5.6;
  for (const [x0, x1] of [[0, 38], [44.5, 56], [72, 98], [104, 128]]) bx(x0, 0, 14, x1, wallH, 14.6, 'wall', 'concrete', C.wallOut);
  for (const [x0, x1] of [[0, 38], [44.5, 56], [72, 98], [104, 128]]) w.vis(x0, wallH, 13.85, x1, wallH + 0.35, 14.75, 'metal', '#5b6166');
  // the breach: a blown section, rubble on both sides
  bx(38, 0, 14, 39, 2.6, 14.6, 'wall', 'concrete', C.wallOut);
  bx(43.5, 0, 14, 44.5, 3.4, 14.6, 'wall', 'concrete', C.wallOut);
  for (const [x, zz, s, h] of [[39.6, 13.2, 1.1, 0.55], [42.2, 15.4, 1.3, 0.5], [40.8, 15.9, 0.8, 0.35], [43.2, 12.6, 0.9, 0.4], [41, 12.4, 0.6, 0.3]])
    bx(x - s / 2, 0, zz - s / 2, x + s / 2, h, zz + s / 2, 'prop', 'concrete', '#9d978a', { pen: 3 });
  w.vis(38.6, 0.02, 11.5, 45, 0.04, 17.5, 'dirt', '#7d725e');
  // Gatehouse: straddles the wall. North door from the lot, south door into the compound
  {
    const x0 = 56,
      x1 = 72,
      z0 = 8,
      z1 = 20,
      h = 3.6;
    w.wall({ alongX: !0, fixed: z0 + 0.15, a0: x0, a1: x1, y0: 0, h, t: 0.3, outSign: -1, outMat: 'concrete', outColor: C.wallOut, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings: [{ a: 62.6, w: 2.8, y0: 0, y1: 2.6, type: 'open' }, { a: 58, w: 2, y0: 1, y1: 2.2, type: 'window' }, { a: 68, w: 2, y0: 1, y1: 2.2, type: 'window' }] });
    w.wall({ alongX: !0, fixed: z1 - 0.15, a0: x0, a1: x1, y0: 0, h, t: 0.3, outSign: 1, outMat: 'concrete', outColor: C.wallOut, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings: [{ a: 62.6, w: 2.8, y0: 0, y1: 2.6, type: 'open' }] });
    w.wall({ alongX: !1, fixed: x0 + 0.15, a0: z0 + 0.3, a1: z1 - 0.3, y0: 0, h, t: 0.3, outSign: -1, outMat: 'concrete', outColor: C.wallOut, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings: [] });
    w.wall({ alongX: !1, fixed: x1 - 0.15, a0: z0 + 0.3, a1: z1 - 0.3, y0: 0, h, t: 0.3, outSign: 1, outMat: 'concrete', outColor: C.wallOut, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings: [{ a: 16.5, w: 1.1, y0: 0, y1: 2.2, type: 'door', swing: 1, leaf: C.door }] });
    w.vis(x0 + 0.3, 0, z0 + 0.3, x1 - 0.3, 0.025, z1 - 0.3, 'tile', '#c9c6bf');
    w.slab(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, h + 0.3, [], 'roof', '#5d6064', '#7d858a', 0.3);
    // security lane: metal detector arch, X-ray belt, turnstile rails
    bx(63.0, 0, 13.2, 63.25, 2.25, 13.6, 'prop', 'metal', '#c9ccce', { pen: 2 });
    bx(65.15, 0, 13.2, 65.4, 2.25, 13.6, 'prop', 'metal', '#c9ccce', { pen: 2 });
    w.vis(63.0, 2.1, 13.2, 65.4, 2.3, 13.6, 'metal', '#c9ccce');
    bx(59.2, 0, 11.6, 61.8, 0.9, 12.4, 'prop', 'metal', '#3e4449', { pen: 2 }); // X-ray belt
    bx(60, 0.9, 11.65, 61.2, 1.65, 12.35, 'prop', 'metal', '#5e666c', { pen: 2 }); // X-ray tunnel
    w.vis(59.2, 0.9, 11.75, 61.8, 0.93, 12.25, 'metal', '#1c1f22');
    bars(62.4, 15.2, 62.4, 18.2, 0, 1.05);
    bars(65.8, 15.2, 65.8, 18.2, 0, 1.05);
    // control booth: glass on two sides, a console inside
    bx(67, 0, 10.2, 67.2, 1, 15, 'wall', 'concrete', C.wallIn);
    w.pane(67.06, 1, 10.4, 67.14, 2.6, 12.6);
    w.pane(67.06, 1, 12.8, 67.14, 2.6, 15);
    bx(67.2, 0, 14.9, 71.7, 1, 15.1, 'wall', 'concrete', C.wallIn);
    w.pane(67.4, 1, 14.96, 71.6, 2.6, 15.04);
    bx(67.2, 2.6, 10.2, 71.7, 3.6, 15.1, 'wall', 'plaster', C.wallIn);
    bx(69.4, 0, 10.6, 71.6, 0.9, 11.6, 'prop', 'metal', '#3a4045', { pen: 2 });
    for (let i = 0; i < 3; i++) w.vis(69.6 + i * 0.7, 0.9, 10.7, 70.2 + i * 0.7, 1.35, 10.78, 'metal', '#1a2a33');
    A.areas.push({ name: 'Gatehouse', min: z(x0, 0, z0), max: z(x1, h, z1) });
    for (const [lx, lz] of [[60, 11], [66, 11], [60, 17], [66, 17]]) w.light(lx, h - 0.15, lz);
  }
  // vehicle sally port: a caged lane through the wall with two barrier arms
  {
    bx(97.6, 0, 9, 98, 4.2, 22, 'wall', 'concrete', C.wallOut);
    bx(104, 0, 9, 104.4, 4.2, 22, 'wall', 'concrete', C.wallOut);
    w.vis(98, 0.012, 9, 104, 0.02, 22, 'concrete', '#8f8c85');
    for (const zz of [10, 20.4]) {
      w.vis(98, 1, zz - 0.06, 103.2, 1.12, zz + 0.06, 'metal', '#d8d4cc');
      for (let x = 98.4; x < 103; x += 0.8) w.vis(x, 1, zz - 0.065, x + 0.4, 1.12, zz + 0.065, 'metal', '#c03a2b');
      bx(103.3, 0, zz - 0.2, 103.8, 1.2, zz + 0.2, 'prop', 'metal', '#d6ad2a', { pen: 2 });
    }
    for (let zz = 10.5; zz < 21; zz += 1.4) w.vis(98, 0.021, zz, 104, 0.026, zz + 0.7, 'trim', '#d6ad2a');
    A.areas.push({ name: 'Sally Port', min: z(98, 0, 9), max: z(104, 4, 22) });
  }
  // ---------------------------------------------------------------- A Block (two tiers of cells around a dayroom)
  const AB = { x0: 4, x1: 36, z0: 24, z1: 72, tier: 3.2, roof: 7.0 };
  {
    const { x0, x1, z0, z1, tier, roof } = AB,
      t = 0.4,
      H = roof;
    const wallSpec = (alongX, fixed, a0, a1, outSign, openings) =>
      w.wall({ alongX, fixed, a0, a1, y0: 0, h: H, t, outSign, outMat: 'concrete', outColor: C.wallOut, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings, pen: 0 });
    wallSpec(!0, z0 + t / 2, x0, x1, -1, [{ a: 18.8, w: 2.4, y0: 0, y1: 2.8, type: 'open' }, ...[8, 13, 26, 31].map((a) => ({ a, w: 1.2, y0: 4.8, y1: 6.2, type: 'window' }))]);
    wallSpec(!0, z1 - t / 2, x0, x1, 1, [{ a: 18.8, w: 2.4, y0: 0, y1: 2.8, type: 'open' }]);
    wallSpec(!1, x0 + t / 2, z0 + t, z1 - t, -1, []);
    wallSpec(!1, x1 - t / 2, z0 + t, z1 - t, 1, [{ a: 27.5, w: 1.6, y0: 0, y1: 2.5, type: 'door', swing: -1, leaf: C.door }, { a: 66.8, w: 1.6, y0: 0, y1: 2.5, type: 'door', swing: -1, leaf: C.door }]);
    // painted wainscot band inside the dayroom
    w.vis(x0 + t + 3.2, 0, z0 + t, x1 - t - 3.2, 1.2, z0 + t + 0.02, 'plaster', C.band);
    w.vis(x0 + t + 3.2, 0, z1 - t - 0.02, x1 - t - 3.2, 1.2, z1 - t, 'plaster', C.band);
    // floor and roof (with skylight strips)
    w.vis(x0 + t, 0, z0 + t, x1 - t, 0.03, z1 - t, 'concrete', C.epoxy);
    w.vis(8.2, 0.03, 26, 31.8, 0.035, 26.12, 'trim', C.yellow);
    w.vis(8.2, 0.03, 69.9, 31.8, 0.035, 70.02, 'trim', C.yellow);
    w.slab(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, roof + 0.3, [], 'roof', '#5f6366', '#8a9093', 0.3);
    for (let zz = 30; zz < 68; zz += 8) w.vis(14, roof - 0.02, zz, 26, roof + 0.01, zz + 2.4, 'light', '#f4f1e6');
    // cells: 13 per side per tier, 2.8 m wide, 3.2 m deep
    const cz0 = 29.6,
      cw = 2.8,
      n = 13,
      depth = 3.2;
    const cellFront = { W: x0 + t + depth, E: x1 - t - depth };
    for (const side of ['W', 'E']) {
      const back = side === 'W' ? x0 + t : x1 - t,
        front = cellFront[side],
        s = side === 'W' ? 1 : -1;
      for (let tierI = 0; tierI < 2; tierI++) {
        const y = tierI * tier,
          ch = tier - 0.2;
        for (let i = 0; i < n; i++) {
          const za = cz0 + i * cw,
            zb = za + cw,
            open = (i * 7 + tierI * 3 + (side === 'E' ? 5 : 0)) % 4 === 0 || i === 6;
          // divider wall
          bx(Math.min(back, front), y, za - 0.1, Math.max(back, front), y + ch, za + 0.1, 'wall', 'plaster', C.wallIn, { pen: 0 });
          // the bars front, with a sliding door that is either racked open or shut
          bars(front, za + 0.1, front, zb - 0.1, y, ch, open ? za + 1.6 : null, open ? za + 2.6 : null);
          open && w.vis(front + s * 0.1 - 0.02, y, za + 0.7, front + s * 0.1 + 0.02, y + ch, za + 1.6, 'metal', C.bars);
          // cell number plate
          w.vis(front - 0.02, y + ch - 0.4, za + 0.25, front + 0.02, y + ch - 0.2, za + 0.55, 'trim', '#e8e3d3');
          // bunk bed against the divider, steel toilet and sink at the back corner, a shelf
          const bxA = side === 'W' ? back + 0.1 : back - 2.05,
            bxB = bxA + 1.95;
          bx(bxA, y, za + 0.15, bxB, y + 0.45, za + 0.95, 'prop', 'metal', '#8a9196', { pen: 3 });
          w.vis(bxA + 0.05, y + 0.45, za + 0.18, bxB - 0.05, y + 0.6, za + 0.92, 'plaster', i % 3 ? '#d9d3c2' : '#c46a2c');
          bx(bxA, y + 1.35, za + 0.15, bxB, y + 1.45, za + 0.95, 'prop', 'metal', '#8a9196', { pen: 3 });
          w.vis(bxA + 0.05, y + 1.45, za + 0.18, bxB - 0.05, y + 1.58, za + 0.92, 'plaster', '#d9d3c2');
          for (const px of [bxA + 0.05, bxB - 0.1]) w.vis(px, y, za + 0.15, px + 0.05, y + 1.45, za + 0.2, 'metal', C.steel);
          const tx = side === 'W' ? back + 0.1 : back - 0.6;
          bx(tx, y, zb - 0.65, tx + 0.5, y + 0.42, zb - 0.15, 'prop', 'metal', '#b9bfc3', { pen: 2 });
          bx(tx, y + 0.42, zb - 0.65, tx + 0.5, y + 0.95, zb - 0.55, 'prop', 'metal', '#b9bfc3', { pen: 2 });
          w.vis(tx + 0.05, y + 1.6, zb - 0.6, tx + 0.45, y + 1.65, zb - 0.2, 'trim', '#c6ccd0');
          const sh = side === 'W' ? back + 0.05 : back - 0.35;
          w.vis(sh, y + 1.9, za + 1.3, sh + 0.3, y + 1.94, za + 2.3, 'wood', '#7a6a55');
          w.light((back + front) / 2, y + ch - 0.1, (za + zb) / 2);
          // loose things in some of the cells
          if (open && tierI === 0) i % 2 ? P('mattress', (back + front) / 2 + s * 0.3, za + 1.9, 0.4) : P('book', (back + front) / 2, za + 1.6, i);
        }
        bx(Math.min(back, front), y, cz0 + n * cw - 0.1, Math.max(back, front), y + ch, cz0 + n * cw + 0.1, 'wall', 'plaster', C.wallIn, { pen: 0 });
      }
      // upper tier floor over the cells and the gallery in front of them
      const gal = 1.6,
        gx0 = side === 'W' ? back : front - gal,
        gx1 = side === 'W' ? front + gal : back;
      Tn(w, gx0, cz0 - 0.1, gx1, cz0 + n * cw + 0.1, tier, 'concrete', '#9d9a91', 0.25);
      const edge = side === 'W' ? front + gal : front - gal;
      // railing along the gallery edge, leaving a gap where the stair arrives
      const gapZ = side === 'W' ? [34.1, 35.6] : [56.4, 57.9];
      w.rail(edge, cz0, edge, gapZ[0], tier, C.rail, 1.05);
      w.rail(edge, gapZ[1], edge, cz0 + n * cw, tier, C.rail, 1.05);
      w.rail(side === 'W' ? front : front - gal, cz0, side === 'W' ? front + gal : front, cz0, tier, C.rail, 1.05);
      w.rail(side === 'W' ? front : front - gal, cz0 + n * cw, side === 'W' ? front + gal : front, cz0 + n * cw, tier, C.rail, 1.05);
      // gallery underside lights
      for (let zz = cz0 + 2; zz < cz0 + n * cw; zz += 6) w.light(side === 'W' ? front + 0.8 : front - 0.8, tier - 0.3, zz);
    }
    // stairs up to the galleries (steel, with a landing that meets the gallery)
    const sw = 1.6,
      wf = cellFront.W + 1.6,
      ef = cellFront.E - 1.6;
    ce(w, wf, 40.1, 'N', 0, tier, sw, 'metal', '#6a7176');
    Tn(w, wf, 34.1, wf + sw, 35.62, tier, 'metal', '#6a7176', 0.2);
    w.rail(wf + sw, 35.62, wf + sw, 40.1, 0, C.rail, 1.0);
    w.rail(wf, 34.1, wf + sw, 34.1, tier, C.rail, 1.05);
    w.rail(wf + sw, 34.1, wf + sw, 35.62, tier, C.rail, 1.05);
    ce(w, ef - sw, 51.9, 'S', 0, tier, sw, 'metal', '#6a7176');
    Tn(w, ef - sw, 56.38, ef, 57.9, tier, 'metal', '#6a7176', 0.2);
    w.rail(ef - sw, 51.9, ef - sw, 56.38, 0, C.rail, 1.0);
    w.rail(ef - sw, 57.9, ef, 57.9, tier, C.rail, 1.05);
    w.rail(ef - sw, 56.38, ef - sw, 57.9, tier, C.rail, 1.05);
    // control picket in the middle of the dayroom: glass all round, a console, a door on the south side
    {
      const px0 = 17.2,
        px1 = 22.8,
        pz0 = 44,
        pz1 = 50,
        ph = 2.8;
      bx(px0, 0, pz0, px1, 1.0, pz0 + 0.15, 'wall', 'concrete', '#9ea3a0');
      bx(px0, 0, pz0 + 0.15, px0 + 0.15, 1.0, pz1, 'wall', 'concrete', '#9ea3a0');
      bx(px1 - 0.15, 0, pz0 + 0.15, px1, 1.0, pz1, 'wall', 'concrete', '#9ea3a0');
      bx(px0, 0, pz1 - 0.15, 19.2, 1.0, pz1, 'wall', 'concrete', '#9ea3a0');
      bx(20.4, 0, pz1 - 0.15, px1, 1.0, pz1, 'wall', 'concrete', '#9ea3a0');
      w.pane(px0 + 0.1, 1.0, pz0 + 0.05, px1 - 0.1, 2.5, pz0 + 0.1);
      w.pane(px0 + 0.05, 1.0, pz0 + 0.2, px0 + 0.1, 2.5, pz1 - 0.2);
      w.pane(px1 - 0.1, 1.0, pz0 + 0.2, px1 - 0.05, 2.5, pz1 - 0.2);
      w.pane(20.5, 1.0, pz1 - 0.1, px1 - 0.1, 2.5, pz1 - 0.05);
      w.door(!0, 19.22, pz1 - 0.075, 0, 1.16, 2.45, -1, C.door);
      bx(19.2, 2.5, pz1 - 0.15, 20.4, ph, pz1, 'wall', 'concrete', '#9ea3a0');
      bx(px0 - 0.1, ph, pz0 - 0.1, px1 + 0.1, ph + 0.2, pz1 + 0.1, 'roof', 'metal', '#5a6064');
      for (const [x, zz] of [[px0, pz0], [px1, pz0], [px0, pz1], [px1, pz1]]) w.vis(x - 0.08, 1.0, zz - 0.08, x + 0.08, ph, zz + 0.08, 'metal', C.steel);
      bx(17.6, 0, 44.4, 22.4, 0.95, 45.3, 'prop', 'metal', '#3a4045', { pen: 2 });
      for (let i = 0; i < 4; i++) w.vis(17.9 + i * 1.15, 0.95, 44.5, 18.7 + i * 1.15, 1.45, 44.58, 'metal', '#16262e');
      w.light(20, ph - 0.1, 47);
      A.areas.push({ name: 'Control Picket', min: z(px0, 0, pz0), max: z(px1, ph, pz1) });
    }
    // dayroom: bolted tables, a TV on a pillar, phones on the wall
    for (const [x, zz] of [[13.4, 31.5], [26.6, 31.5], [13.4, 38], [26.6, 38], [13.4, 56.5], [26.6, 56.5], [13.4, 63], [26.6, 63]]) steelTable(x, zz);
    bx(19.6, 0, 33.6, 20.4, 3, 34.4, 'wall', 'concrete', '#b2ada2');
    w.vis(19.1, 2.2, 34.4, 20.9, 3.05, 34.5, 'metal', '#111417');
    for (let i = 0; i < 4; i++) w.vis(x0 + 0.42, 1.3, 25.4 + i * 0.9, x0 + 0.48, 1.6, 25.7 + i * 0.9, 'metal', '#2a2d30');
    for (const [x, zz] of [[11.8, 52], [28.6, 44.5]]) P('bin', x, zz);
    for (const [x, zz, r] of [[15.2, 33.4, 0.4], [24.6, 36.1, 2.1], [14.6, 58.2, 1.3], [25.1, 61.8, 3.6]]) P('chair', x, zz, r);
    for (const [x, zz] of [[13.4, 31.5], [26.6, 38], [13.4, 63]]) P('tray', x + 0.2, zz - 0.1, 0.3, 0.76);
    P('mattress', 21.4, 41.2, 0.7);
    P('mattress', 17.6, 53.6, 2.2);
    P('bucket', 31.0, 68.6);
    for (const [lx, lz] of [[14, 30], [26, 30], [14, 40], [26, 40], [14, 54], [26, 54], [14, 64], [26, 64]]) w.light(lx, roof - 0.3, lz);
    A.buildings.push({ name: 'A Block', x: x0, z: z0, w: x1 - x0, d: z1 - z0, h: roof });
    A.areas.push({ name: 'A Block West Cells', min: z(x0, 0, z0), max: z(cellFront.W, roof, z1) });
    A.areas.push({ name: 'A Block East Cells', min: z(cellFront.E, 0, z0), max: z(x1, roof, z1) });
    A.areas.push({ name: 'Upper Tier', min: z(x0, tier, z0), max: z(x1, roof, z1) });
    A.areas.push({ name: 'Dayroom', min: z(cellFront.W, 0, z0), max: z(cellFront.E, tier, z1) });
  }
  // ---------------------------------------------------------------- Administration and Visitation
  BI(w, {
    name: 'Administration',
    x: 46,
    z: 25,
    w: 36,
    d: 14,
    floors: 1,
    fh: 3.4,
    facade: 'concrete',
    facadeColor: C.wallOut,
    trim: C.trim,
    inner: ['plaster', '#e3ded1'],
    floorMat: () => ['tile', '#cfcac0'],
    window: { every: 3.6, w: 1.2, sill: 1.2, top: 2.2 },
    doors: [
      { side: 'N', at: 16.4, w: 2.4, leafless: !0, h: 2.6 },
      { side: 'S', at: 6, w: 1.6, leafless: !0 },
      { side: 'S', at: 26, w: 1.2 },
      { side: 'W', at: 6 },
      { side: 'E', at: 7 },
    ],
    parts: () => [
      { x1: 11, z1: 0, x2: 11, z2: 14, doors: [5], arches: [10] },
      { x1: 27, z1: 0, x2: 27, z2: 14, doors: [4, 10] },
      { x1: 27, z1: 7, x2: 36, z2: 7, doors: [31] },
    ],
    roof: 'flat',
    lights: () => [[5, 4], [5, 10], [15, 4], [19, 10], [23, 4], [31, 3.5], [31, 10.5]],
    furnish: (fl, y, b, at) => {
      for (const [t, lx, lz, r, a, d2, h] of [
        ['counter', 5.5, 2.2, 0, 3.2, 0.7, 1.05], // reception
        ['bookcase', 1, 9, Math.PI / 2, 0.95, 0.6, 1.85],
        ['bookcase', 1, 11.5, Math.PI / 2, 0.95, 0.6, 1.85],
        ['desk', 30.5, 2.6, 0, 1.9, 0.8, 0.76], // warden
        ['bookcase', 35, 2.5, -Math.PI / 2, 0.95, 0.6, 1.85],
        ['sofa', 31.5, 5.8, Math.PI, 1.95, 0.9, 0.9],
        ['table', 31.5, 10.5, 0, 1.8, 0.95, 0.75], // guard break room
        ['fridge', 35, 12.8, -Math.PI / 2, 0.9, 0.85, 1.95],
      ]) {
        const [X, Z] = at(lx, lz);
        b.furn(t, X, y, Z, r, a, d2, h);
      }
    },
  });
  {
    // visitation booths: a counter with glass partitions between visitor and inmate sides
    const vz = 25 + 7,
      vx0 = 59.0,
      vx1 = 46 + 26.6;
    bx(vx0, 0, vz - 0.25, vx1, 0.95, vz + 0.25, 'prop', 'concrete', '#a9a59c', { pen: 3 });
    for (let x = vx0; x <= vx1 + 0.01; x += 1.52) bx(x - 0.04, 0.95, vz - 0.3, x + 0.04, 2.35, vz + 0.3, 'wall', 'metal', '#8e959a', { pen: 2 });
    for (let x = vx0; x < vx1 - 0.1; x += 1.52) {
      w.pane(x + 0.05, 0.95, vz - 0.03, x + 1.47, 2.3, vz + 0.03);
      for (const s of [-1, 1]) {
        w.vis(x + 0.64, 1.25, vz + s * 0.31 - 0.03, x + 0.88, 1.5, vz + s * 0.31 + 0.03, 'metal', '#1d1f21');
        bx(x + 0.56, 0, vz + s * 0.85 - 0.2, x + 0.96, 0.46, vz + s * 0.85 + 0.2, 'prop', 'metal', '#7e878d', { pen: 3 });
        w.box(x + 0.56, 0.46, vz + s * 0.85 - 0.2, x + 0.96, 0.53, vz + s * 0.85 + 0.2, 'prop', { mat: 'metal' });
      }
    }
    w.vis(vx0, 2.35, vz - 0.32, vx1, 2.45, vz + 0.32, 'metal', '#8e959a');
    P('chair', 51.2, 30.6, 0.6);
    P('box', 47.6, 36.8, 0.3);
    P('box', 48.3, 37.4, 1.2);
    P('book', 76.8, 27.6, 0.4, 0.76);
    A.areas.push({ name: 'Visitation', min: z(57, 0, 25), max: z(73, 3.4, 39) });
    A.areas.push({ name: 'Records', min: z(46, 0, 25), max: z(57, 3.4, 39) });
    A.areas.push({ name: "Warden's Office", min: z(73, 0, 25), max: z(82, 3.4, 32) });
  }
  // ---------------------------------------------------------------- Exercise Yard
  {
    const x0 = 46,
      x1 = 94,
      z0 = 43,
      z1 = 66;
    fence(x0, z0, x1, z0, 3.4, [[54, 57], [70, 73]]);
    fence(x0, z1, x1, z1, 3.4, [[60, 63], [84, 87]]);
    fence(x0, z0, x0, z1, 3.4, [[52, 55]]);
    fence(x1, z0, x1, z1, 3.4, [[48, 51]]);
    w.vis(x0, 0.02, z0, x1, 0.03, z1, 'asphalt', '#6a6b6a');
    // basketball court with lines and two hoops
    const cx0 = 50,
      cx1 = 72,
      cz0 = 46,
      cz1 = 62;
    w.vis(cx0, 0.03, cz0, cx1, 0.036, cz1, 'asphalt', '#7b5a43');
    for (const [a, b, c2, d2] of [[cx0, cz0, cx1, cz0 + 0.08], [cx0, cz1 - 0.08, cx1, cz1], [cx0, cz0, cx0 + 0.08, cz1], [cx1 - 0.08, cz0, cx1, cz1], [(cx0 + cx1) / 2 - 0.04, cz0, (cx0 + cx1) / 2 + 0.04, cz1]])
      w.vis(a, 0.036, b, c2, 0.04, d2, 'trim', '#f0eee6');
    for (const [hx, dir] of [[cx0 + 0.6, 1], [cx1 - 0.6, -1]]) {
      bx(hx - 0.1, 0, 53.9, hx + 0.1, 3.4, 54.1, 'prop', 'metal', '#3c4146', { pen: 2 });
      w.vis(hx + dir * 0.1, 2.9, 53.1, hx + dir * 0.16, 3.95, 54.9, 'metal', '#e9e7e1');
      w.vis(hx + dir * 0.16, 3.05, 53.78, hx + dir * 0.62, 3.08, 54.22, 'metal', '#d65a24');
      w.vis(hx + dir * 0.1, 3.3, 53.75, hx + dir * 0.13, 3.6, 53.8, 'trim', '#c23b22');
    }
    P('ball', 61.2, 54.6);
    // weight pit: benches and racks on a rubber mat
    w.vis(76, 0.03, 46, 91, 0.05, 54, 'dirt', '#2c2e2f');
    for (const [x, zz] of [[78.5, 48.5], [82.5, 48.5], [86.5, 48.5], [78.5, 51.8], [82.5, 51.8]]) {
      bx(x - 0.18, 0, zz - 0.7, x + 0.18, 0.45, zz + 0.7, 'prop', 'metal', '#2f3336', { pen: 3 });
      w.vis(x - 0.62, 0, zz - 0.82, x - 0.56, 1.25, zz - 0.76, 'metal', C.steel);
      w.vis(x + 0.56, 0, zz - 0.82, x + 0.62, 1.25, zz - 0.76, 'metal', C.steel);
      w.vis(x - 0.95, 1.18, zz - 0.82, x + 0.95, 1.21, zz - 0.76, 'metal', '#a9aeb2');
    }
    bx(88.6, 0, 50.2, 89.6, 1.6, 53.6, 'prop', 'metal', '#3a3f43', { pen: 2 });
    // bleachers along the south fence
    for (let i = 0; i < 4; i++) bx(52 + i * 0.0, i * 0.42, 62.8 + i * 0.7, 70, i * 0.42 + 0.42, 63.5 + i * 0.7, 'stair', 'metal', '#8a9095', { pen: 2 });
    // low concrete planters and a picnic table for cover
    for (const [a, b, c2, d2] of [[75, 57.5, 79, 58.5], [84.5, 59.5, 85.5, 63.5], [77.5, 62, 81.5, 63]]) bx(a, 0, b, c2, 0.95, d2, 'prop', 'concrete', '#a6a196', { pen: 4 });
    steelTable(89.6, 58.6, !0);
    P('cone', 74.4, 45.4);
    P('cone', 75.1, 45.9);
    A.areas.push({ name: 'Exercise Yard', min: z(x0, 0, z0), max: z(x1, 4, z1) });
    A.areas.push({ name: 'Basketball Court', min: z(cx0, 0, cz0), max: z(cx1, 4, cz1) });
    A.areas.push({ name: 'Weight Pit', min: z(76, 0, 46), max: z(91, 4, 54) });
  }
  // yard tower overlooking the yard, the east alley and the cafeteria roofline
  tower(96.5, 50.5, 3.6, 5.2, 'E');
  // the stair climbs west and arrives at the tower's open east side
  ce(w, 100.4 + 26 * 0.28, 51.4, 'W', 0, 5.2, 1.2, 'metal', '#6a7176');
  A.areas.push({ name: 'Yard Tower', min: z(96, 0, 50), max: z(108, 9, 55) });
  // NE gate tower
  tower(119.5, 16, 3.6, 6, 'S');
  // the stair climbs north and arrives at the tower's open south side
  ce(w, 120.7, 19.9 + 30 * 0.28, 'N', 0, 6, 1.2, 'metal', '#6a7176');
  A.areas.push({ name: 'Gate Tower', min: z(118, 0, 15), max: z(124, 9, 24) });
  // ---------------------------------------------------------------- Infirmary
  BI(w, {
    name: 'Infirmary',
    x: 86,
    z: 25,
    w: 22,
    d: 12,
    floors: 1,
    fh: 3.2,
    facade: 'concrete',
    facadeColor: '#c4beb2',
    trim: '#3f6a7a',
    inner: ['plaster', '#eef0ee'],
    floorMat: () => ['tile', '#d8dcd8'],
    window: { every: 3.4, w: 1.2, sill: 1.1, top: 2.1 },
    doors: [{ side: 'W', at: 6 }, { side: 'S', at: 15, w: 1.6, leafless: !0 }, { side: 'N', at: 4 }],
    parts: () => [{ x1: 9, z1: 0, x2: 9, z2: 12, doors: [3, 9] }],
    roof: 'flat',
    lights: () => [[4.5, 6], [13, 3.5], [13, 8.5], [19, 6]],
    furnish: (fl, y, b, at) => {
      for (const [t, lx, lz, r, a, d2, h] of [
        ['desk', 4, 2, 0, 1.9, 0.8, 0.76],
        ['bookcase', 1, 9, Math.PI / 2, 0.95, 0.6, 1.85],
        ['bed', 12, 1.4, 0, 1.0, 1.95, 0.75],
        ['bed', 15, 1.4, 0, 1.0, 1.95, 0.75],
        ['bed', 18, 1.4, 0, 1.0, 1.95, 0.75],
        ['bed', 12, 10.6, Math.PI, 1.0, 1.95, 0.75],
        ['bed', 15, 10.6, Math.PI, 1.0, 1.95, 0.75],
        ['bookcase', 21, 6, -Math.PI / 2, 0.95, 0.6, 1.85],
      ]) {
        const [X, Z] = at(lx, lz);
        b.furn(t, X, y, Z, r, a, d2, h);
      }
    },
  });
  for (const zz of [27.6, 34.4]) for (let x = 96.5; x < 106; x += 3) w.vis(x - 0.02, 2.2, zz - 0.6, x + 0.02, 2.24, zz + 0.6, 'metal', '#b9c2c6');
  P('bucket', 88.2, 34.6);
  P('stool', 99.5, 30.4);
  A.areas.push({ name: 'Infirmary', min: z(86, 0, 25), max: z(108, 3.2, 37) });
  // ---------------------------------------------------------------- Laundry
  BI(w, {
    name: 'Laundry',
    x: 104,
    z: 58,
    w: 20,
    d: 16,
    floors: 1,
    fh: 4.2,
    facade: 'concrete',
    facadeColor: '#b5afa2',
    trim: C.trim,
    inner: ['plaster', '#d9d6cc'],
    floorMat: () => ['concrete', '#9b9a94'],
    window: { every: 4, w: 1.4, sill: 2.2, top: 3.4 },
    doors: [{ side: 'W', at: 4, w: 2.4, leafless: !0, h: 2.8 }, { side: 'W', at: 12 }, { side: 'S', at: 10, w: 3, leafless: !0, h: 3 }],
    parts: () => [],
    roof: 'flat',
    lights: () => [[5, 4], [15, 4], [5, 12], [15, 12]],
  });
  {
    for (let i = 0; i < 4; i++) {
      const x = 119.4,
        zz = 60.5 + i * 2.4;
      bx(x, 0, zz, x + 2.2, 1.9, zz + 2, 'prop', 'metal', '#c8ccce', { pen: 2 });
      w.vis(x - 0.02, 0.6, zz + 0.45, x, 1.6, zz + 1.55, 'metal', '#3a4045');
    }
    for (const [x, zz] of [[110, 62], [110, 67]]) bx(x, 0, zz, x + 3.2, 0.9, zz + 1.4, 'prop', 'metal', '#9aa1a6', { pen: 3 });
    for (const [x, zz] of [[112, 70.6], [106.4, 60.4]]) {
      bx(x, 0, zz, x + 1.1, 0.95, zz + 0.7, 'prop', 'metal', '#7f878c', { pen: 3 });
      w.vis(x + 0.05, 0.6, zz + 0.05, x + 1.05, 0.95, zz + 0.65, 'plaster', '#c46a2c');
    }
    P('box', 108.2, 63.8, 0);
    P('box', 108.9, 64.9, 1.2);
    P('box', 108.2, 63.8, 0.15, 0.39);
    P('bin', 106.2, 72.6);
    P('bucket', 115.6, 62.4);
    A.areas.push({ name: 'Laundry', min: z(104, 0, 58), max: z(124, 4.2, 74) });
  }
  // east grounds: a parked prison bus by the laundry and a pallet stack
  w.car('car-van', 114, 50.5, Math.PI / 2);
  for (const [x, zz, s] of [[106, 46, 1.2], [107.3, 46, 1.2], [106.6, 46, 1.0, 1.2]]) w.crate(x, zz, s, s, 0, '#9a7a52');
  P('crate', 110.6, 47.2, 0.3);
  P('crate', 110.2, 48.4, 0.9);
  // ---------------------------------------------------------------- Cafeteria and Kitchen (bombsite A)
  {
    const x0 = 44,
      x1 = 100,
      z0 = 70,
      z1 = 90,
      h = 4.2,
      kx = 84; // kitchen starts here
    const t = 0.3;
    const wl = (alongX, fixed, a0, a1, outSign, openings, inMat = 'plaster', inColor = '#e6e1d4') =>
      w.wall({ alongX, fixed, a0, a1, y0: 0, h, t, outSign, outMat: 'concrete', outColor: C.wallOut, inMat, inColor, trim: C.trim, openings, pen: 0 });
    wl(!0, z0 + t / 2, x0, x1, -1, [
      { a: 50, w: 2.4, y0: 0, y1: 2.7, type: 'open' },
      { a: 66, w: 2.4, y0: 0, y1: 2.7, type: 'open' },
      ...[55, 60, 71, 76].map((a) => ({ a, w: 1.6, y0: 1.2, y1: 2.6, type: 'window' })),
      { a: 92, w: 1.2, y0: 0, y1: 2.3, type: 'door', swing: 1, leaf: C.door },
    ]);
    wl(!0, z1 - t / 2, x0, x1, 1, [{ a: 58, w: 2.4, y0: 0, y1: 2.7, type: 'open' }, { a: 94, w: 3, y0: 0, y1: 2.9, type: 'open' }]);
    wl(!1, x0 + t / 2, z0 + t, z1 - t, -1, [{ a: 79, w: 1.6, y0: 0, y1: 2.5, type: 'door', swing: 1, leaf: C.door }]);
    wl(!1, x1 - t / 2, z0 + t, z1 - t, 1, [{ a: 82, w: 1.2, y0: 0, y1: 2.3, type: 'door', swing: -1, leaf: C.door }]);
    // kitchen partition: the serving line opening runs along it
    w.wall({ alongX: !1, fixed: kx, a0: z0 + t, a1: z1 - t, y0: 0, h, t: 0.25, outSign: 0, outMat: 'plaster', outColor: '#e6e1d4', inMat: 'plaster', inColor: '#e6e1d4', trim: C.trim, openings: [{ a: 73, w: 1.2, y0: 0, y1: 2.3, type: 'door', swing: 1, leaf: '#8a949a' }, { a: 76.5, w: 9, y0: 1.0, y1: 2.6, type: 'open' }], pen: 4 });
    w.vis(x0 + t, 0, z0 + t, kx, 0.03, z1 - t, 'tile', C.tile);
    w.vis(kx, 0, z0 + t, x1 - t, 0.03, z1 - t, 'tile', '#b9bdb6');
    w.vis(x0 + t, 0, z0 + t, kx - 0.13, 1.1, z0 + t + 0.02, 'plaster', C.band);
    w.slab(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, h + 0.3, [], 'roof', '#5d6064', '#7d858a', 0.3);
    // serving line: steam-table counter on the hall side of the opening, with sneeze-guard glass
    bx(kx - 1.0, 0, 76.5, kx - 0.15, 0.95, 85.5, 'prop', 'metal', '#b7bcbf', { pen: 2 });
    for (let zz = 76.8; zz < 85.2; zz += 1.4) w.vis(kx - 0.9, 0.95, zz, kx - 0.25, 1.0, zz + 1.1, 'metal', '#8a9095');
    for (let zz = 76.5; zz < 85.4; zz += 1.8) w.pane(kx - 1.0, 1.25, zz + 0.05, kx - 0.95, 1.75, zz + 1.75);
    w.vis(kx - 1.05, 1.75, 76.5, kx - 0.9, 1.8, 85.5, 'metal', '#b7bcbf');
    w.vis(kx - 2.6, 0.9, 76.5, kx - 2.4, 0.95, 85.5, 'metal', '#9aa1a6'); // tray slide rail
    for (const zz of [76.5, 85.5]) w.vis(kx - 2.6, 0, zz - 0.04, kx - 2.52, 0.9, zz + 0.04, 'metal', C.steel);
    // dining hall: rows of long steel tables
    for (let x = 48; x <= 76; x += 5.5) for (const zz of [74.5, 79, 83.5, 87.4]) steelTable(x, zz, !0);
    // trays and plastic chairs knocked about by the riot
    for (const [x, zz, r] of [[48.4, 74.3, 0.2], [53.6, 79.2, 1.1], [59.3, 83.4, 2.6], [64.8, 74.8, 0.9], [70.2, 87.1, 1.8], [75.7, 79.3, 0.4], [53.2, 87.6, 2.2], [64.6, 83.7, 3.1]]) P('tray', x, zz, r, 0.76);
    for (const [x, zz] of [[57.4, 76.6], [68.3, 81.4], [74.5, 85.6]]) P('tray', x, zz, x * 0.3);
    for (const [x, zz, r] of [[51.2, 76.9, 0.7], [62.1, 81.2, 2.3], [72.6, 76.9, 1.5], [78.9, 88.6, 0.2], [46.6, 85.5, 2.9]]) P('chair', x, zz, r);
    for (const [x, zz] of [[45.2, 71.2], [82.4, 71.4], [45.2, 88.6]]) P('bin', x, zz);
    for (const [x, zz] of [[49.4, 81.1], [61.7, 72.3], [77.2, 82.8]]) P('can', x, zz);
    // kitchen: prep islands, ranges with a hood, big pots, a walk-in freezer and the dish pit
    for (const [a, b, c2, d2] of [[87, 74, 91, 75.2], [87, 79.5, 91, 80.7], [87, 85, 91, 86.2]]) {
      bx(a, 0, b, c2, 0.92, d2, 'prop', 'metal', '#c3c8cb', { pen: 2 });
      w.vis(a + 0.1, 0.25, b + 0.1, c2 - 0.1, 0.3, d2 - 0.1, 'metal', '#9aa1a6');
    }
    bx(94.6, 0, 71.5, 99.4, 0.92, 72.6, 'prop', 'metal', '#3b4145', { pen: 2 });
    w.vis(94.4, 2.3, 71, 99.6, 3.0, 73.2, 'metal', '#a7adb1');
    for (let i = 0; i < 4; i++) w.vis(95 + i * 1.15, 0.92, 71.8, 95.8 + i * 1.15, 1.25, 72.4, 'metal', '#2a2d30');
    P('bucket', 88.3, 75.5, 0, 0.92);
    P('bucket', 89.9, 80.9, 0, 0.92);
    // walk-in freezer: an insulated box with a heavy door
    w.wall({ alongX: !0, fixed: 81.6, a0: 92, a1: 99.7, y0: 0, h: 3, t: 0.2, outSign: 0, outMat: 'metal', outColor: '#cfd4d6', inMat: 'metal', inColor: '#e3e7e8', trim: C.trim, openings: [{ a: 93, w: 1.1, y0: 0, y1: 2.2, type: 'door', swing: -1, leaf: '#b9c0c3' }], pen: 2 });
    w.wall({ alongX: !1, fixed: 92, a0: 81.7, a1: 89.7, y0: 0, h: 3, t: 0.2, outSign: 0, outMat: 'metal', outColor: '#cfd4d6', inMat: 'metal', inColor: '#e3e7e8', trim: C.trim, openings: [], pen: 2 });
    bx(92, 3, 81.6, 99.7, 3.2, 89.7, 'roof', 'metal', '#b9c0c3');
    for (const zz of [83, 85.4, 87.8]) bx(98, 0, zz, 99.6, 1.9, zz + 1.6, 'prop', 'metal', '#9aa1a6', { pen: 2 });
    P('box', 94.4, 86.8, 0.4);
    P('box', 95.0, 87.6, 1.4);
    w.light(95.8, 2.9, 85.6);
    // dish pit by the south door
    bx(86.2, 0, 87.8, 90.8, 0.95, 89.6, 'prop', 'metal', '#c3c8cb', { pen: 2 });
    w.vis(86.4, 0.6, 87.9, 90.6, 0.95, 89.5, 'metal', '#7b8286');
    for (const [lx, lz] of [[50, 75], [50, 85], [58, 75], [58, 85], [66, 75], [66, 85], [74, 75], [74, 85], [80, 80], [88, 74], [88, 84], [96, 77]]) w.light(lx, h - 0.2, lz);
    A.buildings.push({ name: 'Cafeteria', x: x0, z: z0, w: x1 - x0, d: z1 - z0, h });
    A.areas.push({ name: 'Cafeteria', min: z(x0, 0, z0), max: z(kx, h, z1) });
    A.areas.push({ name: 'Serving Line', min: z(kx - 3, 0, 76), max: z(kx + 1, h, 86) });
    A.areas.push({ name: 'Kitchen', min: z(kx, 0, z0), max: z(x1, h, z1) });
    A.areas.push({ name: 'Freezer', min: z(92, 0, 81.6), max: z(100, 3, 90) });
  }
  // ---------------------------------------------------------------- Solitary (SHU)
  {
    const x0 = 4,
      x1 = 36,
      z0 = 76,
      z1 = 90,
      h = 3.4,
      t = 0.35;
    const wl = (alongX, fixed, a0, a1, outSign, openings) => w.wall({ alongX, fixed, a0, a1, y0: 0, h, t, outSign, outMat: 'concrete', outColor: '#aaa496', inMat: 'plaster', inColor: '#cfcabd', trim: C.trim, openings, pen: 0 });
    wl(!0, z0 + t / 2, x0, x1, -1, [{ a: 5.4, w: 1.4, y0: 0, y1: 2.4, type: 'door', swing: 1, leaf: C.door }]);
    wl(!0, z1 - t / 2, x0, x1, 1, [{ a: 32.3, w: 1.4, y0: 0, y1: 2.4, type: 'door', swing: -1, leaf: C.door }]);
    wl(!1, x0 + t / 2, z0 + t, z1 - t, -1, []);
    wl(!1, x1 - t / 2, z0 + t, z1 - t, 1, [{ a: 82.2, w: 1.6, y0: 0, y1: 2.4, type: 'open' }]);
    w.vis(x0 + t, 0, z0 + t, x1 - t, 0.03, z1 - t, 'concrete', '#8d8a83');
    w.slab(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, h + 0.3, [], 'roof', '#5d6064', '#7d858a', 0.3);
    // central corridor z 81.4..84.6 with eight slots a side. North slot 0 is the entry vestibule (door from
    // A Block yard), south slot 7 the exit vestibule (door to the dock); the rest are single cells with solid
    // steel doors, a concrete bunk and a steel toilet.
    const sw = (x1 - t - (x0 + t)) / 8;
    for (const [side, cz0, cz1] of [['N', z0 + t, 81.4], ['S', 84.6, z1 - t]]) {
      const fixed = side === 'N' ? 81.4 : 84.6,
        hall = side === 'N' ? 0 : 7,
        openings = [];
      for (let k = 0; k < 8; k++) {
        const xa = x0 + t + k * sw;
        openings.push(k === hall ? { a: xa + 0.6, w: sw - 1.2, y0: 0, y1: 2.6, type: 'open' } : { a: xa + 1.4, w: 1.0, y0: 0, y1: 2.2, type: 'door', swing: side === 'N' ? -1 : 1, leaf: '#5b666d' });
      }
      w.wall({ alongX: !0, fixed, a0: x0 + t, a1: x1 - t, y0: 0, h, t: 0.25, outSign: 0, outMat: 'plaster', outColor: '#cfcabd', inMat: 'plaster', inColor: '#cfcabd', trim: C.trim, openings, pen: 2 });
      for (let k = 0; k < 8; k++) {
        const xa = x0 + t + k * sw;
        k > 0 && bx(xa - 0.1, 0, cz0, xa + 0.1, h, cz1, 'wall', 'plaster', '#cfcabd', { pen: 0 });
        w.light(xa + sw / 2, h - 0.15, (cz0 + cz1) / 2);
        if (k === hall) continue;
        const by = side === 'N' ? cz0 + 0.1 : cz1 - 0.9;
        bx(xa + 0.3, 0, by, xa + 2.3, 0.45, by + 0.8, 'prop', 'concrete', '#b2ada2', { pen: 4 });
        w.vis(xa + 0.35, 0.45, by + 0.05, xa + 2.25, 0.55, by + 0.75, 'plaster', '#d9d3c2');
        bx(xa + sw - 0.75, 0, side === 'N' ? cz0 + 0.1 : cz1 - 0.6, xa + sw - 0.25, 0.42, side === 'N' ? cz0 + 0.6 : cz1 - 0.1, 'prop', 'metal', '#b9bfc3', { pen: 2 });
      }
    }
    for (let x = 7; x < 34; x += 5) w.light(x, h - 0.15, 83);
    w.vis(x0 + t, 0.03, 82.9, x1 - t, 0.034, 83.1, 'trim', C.yellow);
    P('bucket', 33.2, 82.2);
    A.areas.push({ name: 'Solitary', min: z(x0, 0, z0), max: z(x1, h, z1) });
  }
  // ---------------------------------------------------------------- south fence and the Service Dock
  fence(0, 92, W, 92, 3.6, [[58, 64], [96, 102]]);
  for (const x of [58, 64, 96, 102]) bx(x - 0.15, 0, 91.85, x + 0.15, 4.2, 92.15, 'prop', 'metal', '#5d646a', { pen: 2 });
  w.vis(0, 0.012, 92, W, 0.02, D, 'asphalt', '#5b5c5e');
  // loading dock: a raised platform along the cafeteria's south wall side, with steps
  bx(70, 0, 92.3, 92, 1.2, 95, 'floor', 'concrete', '#a29d92');
  ce(w, 92 + 6 * 0.28, 92.3, 'W', 0, 1.2, 2.7, 'concrete', '#a29d92');
  for (let x = 71; x < 92; x += 3) w.vis(x, 0.4, 94.96, x + 0.6, 0.9, 95.12, 'metal', '#222');
  w.car('car-van', 50, 98.5, Math.PI / 2);
  w.car('car-van', 80, 99.2, Math.PI / 2);
  w.static('dumpster', 106, 95.2, 0, [2.2, 1.5, 1.4]);
  w.static('dumpster', 109, 95.2, 0, [2.2, 1.5, 1.4]);
  for (const [x, zz] of [[24, 96], [25.3, 96], [24.6, 97.2]]) w.crate(x, zz, 1.2, 1.2, 0, '#9a7a52');
  for (const [x, zz] of [[36, 99], [37.2, 99.4]]) w.barrel(x, zz);
  P('crate', 30, 95.6, 0.4);
  P('crate', 31.1, 96.2, 1.1);
  P('crate', 30.5, 95.9, 0.7, 0.62);
  for (const [x, zz] of [[66, 96.4], [67, 96.9], [88, 97]]) P('cone', x, zz);
  A.areas.push({ name: 'Service Dock', min: z(0, 0, 92), max: z(W, 4, D) });
  A.areas.push({ name: 'Loading Dock', min: z(70, 0, 92), max: z(95, 2, 95) });
  // ---------------------------------------------------------------- outside the wall: visitor lot
  w.car('car-sedan', 10, 4.5, 0);
  w.car('car-hatchback', 22, 4.8, 0);
  w.car('car-sedan', 31, 4.6, Math.PI);
  w.car('car-van', 84, 5, 0);
  w.car('car-sedan', 92, 4.6, 0);
  // the transfer bus the terrorists came in on
  w.static('car-van', 46, 8.2, Math.PI / 2, [4.8, 2.2, 2.1]);
  for (const [x, zz] of [[52, 11.5], [54, 11.5], [74, 11.5], [76, 11.5]]) w.static('cone', x, zz, 0, [0.4, 0.7, 0.4], 0, !1);
  for (const [x, zz] of [[8, 11], [118, 11]]) {
    A.streetLights.push({ x, z: zz, rotY: 0 });
    A.lights.push({ pos: z(x, 5.6, zz), interior: !1 });
  }
  A.areas.push({ name: 'Visitor Lot', min: z(0, 0, 0), max: z(W, 4, 14) });
  A.areas.push({ name: 'Main Road', min: z(0, 0, 14.6), max: z(W, 4, 23) });
  A.areas.push({ name: 'Riot Breach', min: z(38, 0, 11), max: z(45, 4, 18) });
  A.areas.push({ name: 'West Alley', min: z(36, 0, 23), max: z(44, 4, 92) });
  A.areas.push({ name: 'East Walk', min: z(84, 0, 38), max: z(104, 4, 70) });
  // floodlights over the compound
  for (const [x, zz] of [[40, 40], [98, 40], [40, 68], [100, 88], [70, 40], [20, 20], [110, 24]]) {
    A.streetLights.push({ x, z: zz, rotY: 0 });
    A.lights.push({ pos: z(x, 5.6, zz), interior: !1 });
  }
  // ---------------------------------------------------------------- objectives and spawns
  // Terrorists arrive in the visitor lot; Counter-Terrorists stage at the service dock.
  A.spawns.T = [[58, 4], [62, 3], [66, 4], [70, 3], [60, 6.5], [64, 6.5], [68, 6.5], [56, 2], [72, 2], [64, 1.6]].map(([x, zz]) => z(x, 0, zz));
  A.spawns.CT = [[54, 97], [58, 96.5], [62, 97], [66, 96.5], [70, 97.5], [56, 100], [60, 100.5], [64, 100], [68, 100.5], [72, 100]].map(([x, zz]) => z(x, 0, zz));
  A.spawnZones = { T: { min: z(52, 0, 1), max: z(76, 0, 8) }, CT: { min: z(52, 0, 95.5), max: z(74, 0, 102) } };
  A.sites = [
    {
      name: 'A',
      min: z(66, 0, 72),
      max: z(92, 1, 89),
      stage: [z(60, 0, 67.5), z(42, 0, 82)],
      watch: [z(76, 1.3, 88), z(90, 1.3, 77), z(68, 1.3, 72.5)],
      hold: [z(88, 0, 82), z(80, 0, 88), z(72, 0, 74)],
    },
    {
      name: 'B',
      min: z(10, 0, 38),
      max: z(30, 1, 58),
      stage: [z(20, 0, 21), z(38, 0, 40)],
      watch: [z(8.4, 4.5, 46), z(31.6, 4.5, 50), z(20, 1.3, 66)],
      hold: [z(15, 0, 52), z(25, 0, 42), z(9, 3.2, 40)],
    },
  ];
  A.areas.push({ name: 'Bombsite A', min: A.sites[0].min, max: A.sites[0].max }, { name: 'Bombsite B', min: A.sites[1].min, max: A.sites[1].max });
  A.flagPoints = [
    { name: 'A', pos: z(20, 0, 47.5 + 6) },
    { name: 'B', pos: z(64, 0, 54) },
    { name: 'C', pos: z(62, 0, 80) },
  ];
  A.tdmSpawns = [
    [64, 4], [20, 18], [110, 19], [10, 30], [30, 66], [50, 31], [78, 34], [96, 32], [60, 45], [90, 63],
    [114, 66], [50, 80], [78, 86], [96, 75], [16, 83], [30, 98], [62, 98], [104, 98], [40, 54], [86, 44],
  ].map(([x, zz]) => z(x, 0, zz));
  A.poi = [z(8.4, 3.2, 40), z(31.6, 3.2, 60), z(20, 0, 47), z(64, 0, 31), z(98.3, 5.2, 52.3), z(121.3, 6, 17.8), z(70, 0, 80), z(92, 0, 84), z(20, 0, 83), z(114, 0, 66), z(41, 0, 15), z(101, 0, 16)];
  try {
    __vegPlan(A);
  } catch (e) {
    A.__veg = [];
  }
  return A;
}
XE.prison = __prisonBuild;
BD.splice(Math.max(0, BD.findIndex((x) => x.id === 'range')), 0, {
  id: 'prison',
  name: 'Blackwater Penitentiary',
  blurb:
    'A maximum-security prison taken over in a riot. Two tiers of cells around the A Block dayroom, the gatehouse, visitation, the exercise yard and its tower, the cafeteria and kitchen, solitary and the service dock.',
  size: 'Large',
  maxPlayers: 24,
});
