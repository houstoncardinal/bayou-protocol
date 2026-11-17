/* ===== Bayou Protocol mod: Blackwater State Penitentiary (map) ===== */
// A maximum-security prison on the edge of the bayou, in the middle of a jailbreak, built at real scale (metres):
//   North    Visitor lot outside the wall (the crew's getaway van), the gothic stone Gatehouse (metal
//            detector, X-ray belt, control booth), the vehicle sally port, and a breach blown through the
//            north-west wall
//   West     A Block: an 1890s brick cell house under a barrel vault with steel trusses and a skylight: two
//            tiers of barred cells (bunks, steel toilet-sinks, desks) around a dayroom with round bolted
//            tables and a glass control picket; galleries reached by steel stairs
//   Centre   Administration and Visitation (booths with glass partitions and handsets), the warden's office,
//            records; the Exercise Yard with a basketball court, weight pit, bleachers and a gun tower
//   East     Infirmary, Laundry with industrial washers, NE gate tower
//   South    Cafeteria (serving line, long steel tables, kitchen with steam kettles, walk-in freezer, dish
//            pit), Solitary (SHU) with steel cell doors, the Service Dock behind the south fence
// Terrorists start in the visitor lot (they came in as visitors); Counter-Terrorists stage at the service
// dock. Bomb Defusal: A is the cafeteria and kitchen, B the A Block dayroom. Jailbreak (67-jailbreak.js): four
// inmates are locked up (two in A Block, two in Solitary); the crew cuts the locks and leads them out.
// Cell bars, fences and grilles block movement but not bullets or sight (solid: false), like real bars.
// Loose things (trays, chairs, bins, mattresses, crates, the yard basketball) are Rapier props (34-physics.js).
//
// Drawing: every box here is drawn by 65-prison-view.js with real (Poly Haven) materials: each visual names a
// surface (v.s: brick, block, plaster, floor, tile, paint, plate, ...). The shapes that are not boxes (bars,
// chain-link, razor wire, rails, stairs, round tables, bunks, toilets, towers, lamps, the vault...) are
// recorded in A.__pr and modelled by 66-prison-detail.js, each inside its collision box here.
// core material (the map picker's preview, bullets' sounds) for each surface
const __PR_CORE = { block: 'plaster', plaster: 'plaster', ceil: 'plaster', floor: 'concrete', tile: 'tile', concrete: 'concrete', walk: 'concrete', brick: 'concrete', granite: 'concrete', paint: 'metal', plate: 'metal', stainless: 'metal', insul: 'metal', corr: 'metal', asphalt: 'asphalt', grass: 'grass', mud: 'dirt', rubber: 'dirt', court: 'asphalt', roof: 'roof', wood: 'wood', glow: 'light', dark: 'metal' };
const __PR_PHYS = (s) => (/paint|plate|stainless|insul|corr|dark/.test(s) ? 'metal' : s === 'wood' ? 'wood' : /grass|mud|rubber/.test(s) ? 'dirt' : 'concrete');
// the cell house vault: the height of its inner surface across the span (x), springing from the wall tops
const __prVaultY = (v, x) => {
  const s = (v.x1 - v.x0) / 2,
    R = (s * s + v.rise * v.rise) / (2 * v.rise),
    c = (v.x0 + v.x1) / 2,
    d = Math.min(s, Math.abs(x - c));
  return v.spring + v.rise - R + Math.sqrt(R * R - d * d);
};
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
  // ---------------------------------------------------------------- palette (tints for the textured surfaces)
  const C = {
    wallOut: '#cbc4b4',
    wallIn: '#ddd6c2', // cream paint on block
    band: '#56735a', // institutional green wainscot
    shu: '#b9c3c4', // solitary: pale blue-grey
    floor: '#b2aca0',
    epoxy: '#9aa39a',
    steel: '#5c646b',
    bars: '#4f5c5a',
    rail: '#2f5876', // blue rails
    door: '#56777a',
    yellow: '#d6ad2a',
    trim: '#4f555a',
    tile: '#d3cec3',
    road: '#ffffff',
    walk: '#d4cfc4',
    brick: '#ffffff',
    stone: '#e9e4dc',
  };
  const R = (A.__pr = {
    bars: [],
    fences: [],
    wire: [],
    rails: [],
    stairs: [],
    tables: [],
    cells: [],
    shu: [],
    lamps: [],
    towers: [],
    hoops: [],
    benches: [],
    bleachers: [],
    planters: [],
    gallery: [],
    arches: [],
    signs: [],
    decals: [],
    fires: [],
    beacons: [],
    cams: [],
    models: [],
    items: [],
    pipes: [],
    rubble: [],
    pilasters: [],
    poles: [],
    turrets: [],
    lines: [],
    vault: null,
  });
  // ---------------------------------------------------------------- helpers
  // a visual box drawn with a surface; tag(): the visuals a core helper makes get surfaces (null: not drawn)
  const vs = (x0, y0, z0, x1, y1, z1, s, color) => {
    const n = A.visuals.length;
    w.vis(x0, y0, z0, x1, y1, z1, __PR_CORE[s] || 'concrete', color);
    n < A.visuals.length && (A.visuals[n].s = s);
  };
  const tag = (map, fn) => {
    const n0 = A.visuals.length,
      r = fn();
    for (let k = n0; k < A.visuals.length; k++) {
      const v = A.visuals[k],
        s = map[v.mat];
      s === null ? (v.__skip = 1) : s && (v.s = s);
    }
    return r;
  };
  // a solid box (collision and visual)
  const bx = (x0, y0, z0, x1, y1, z1, kind, s, color, o = {}) => (vs(x0, y0, z0, x1, y1, z1, s, color), w.box(x0, y0, z0, x1, y1, z1, kind, { mat: __PR_PHYS(s), ...o }));
  // collision only (the shape is modelled in 66-prison-detail.js)
  const cb = (x0, y0, z0, x1, y1, z1, kind, s, o = {}) => w.box(x0, y0, z0, x1, y1, z1, kind, { mat: __PR_PHYS(s), ...o });
  // a light: the game's lamp (59-lights.js) and its fixture (k: tube, cage, pend, flood, wall, strip, picket)
  const lamp = (x, y, zz, k = 'tube', interior = !0, o = {}) => {
    A.lights.push({ pos: z(x, y, zz), interior });
    R.lamps.push({ x, y, z: zz, k, ...o });
  };
  // bars and grilles: they stop people, not bullets or eyes. o.gap: a racked-open door's opening; o.door: a
  // shut door that can be unlocked (its own box; Jailbreak turns it off); o.racked: where the open leaf rests
  const bars = (x0, z0, x1, z1, y0, h, o = {}) => {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0),
      a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1),
      a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1),
      f = alongX ? z0 : x0,
      t = 0.035,
      box = (s0, s1, extra = {}) =>
        alongX ? w.box(s0, y0, f - t, s1, y0 + h, f + t, 'bars', { mat: 'metal', solid: !1, pen: 1, ...extra }) : w.box(f - t, y0, s0, f + t, y0 + h, s1, 'bars', { mat: 'metal', solid: !1, pen: 1, ...extra });
    const cut = o.gap || o.door,
      segs = cut ? [[a0, cut[0]], [cut[1], a1]] : [[a0, a1]];
    for (const [s0, s1] of segs) s1 - s0 > 0.05 && box(s0, s1);
    R.bars.push({ alongX, f, a0, a1, y0, h, gap: o.gap || null, door: o.door || null, racked: o.racked || null, side: o.side || 0, style: o.style || 'cell' });
    return R.bars.length - 1;
  };
  // chain-link fence: posts, rails, mesh and razor wire on outriggers (blocks movement only)
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
    }
    R.fences.push({ alongX, f, a0, a1, h, segs: segs.filter(([s0, s1]) => s1 - s0 >= 0.1) });
  };
  // a guard rail (the core's rail collision); mesh: a steel mesh infill (the cell house galleries)
  const rail = (x0, z0, x1, z1, y, h = 1.05, mesh = !1, color = C.rail) => {
    const s0 = Math.min(x0, x1) - (x0 === x1 ? 0.06 : 0),
      s1 = Math.max(x0, x1) + (x0 === x1 ? 0.06 : 0),
      o0 = Math.min(z0, z1) - (z0 === z1 ? 0.06 : 0),
      o1 = Math.max(z0, z1) + (z0 === z1 ? 0.06 : 0);
    w.box(s0, y, o0, s1, y + h, o1, 'rail', { pen: 1, mat: 'metal' });
    R.rails.push({ x0, z0, x1, z1, y, h, mesh, color });
  };
  // steel stairs (the core's stepped collision; drawn as open steel stairs: stringers, plate treads, rails)
  const stair = (x, zz, dir, y0, y1, wd, rails = 'both') => {
    const end = tag({ metal: null, concrete: null }, () => ce(w, x, zz, dir, y0, y1, wd, 'metal', '#6a7176'));
    R.stairs.push({ x, z: zz, dir, y0, y1, w: wd, rails, end });
    return end;
  };
  // a floor slab drawn with a surface (collision as the core's Tn)
  const slab = (x0, z0, x1, z1, y, s, color, th = 0.25) => (cb(x0, y - th, z0, x1, y, z1, 'floor', s), vs(x0, y - th, z0, x1, y, z1, s, color));
  // a round steel table with four stools on arms (dayroom), or a long one with six (cafeteria). Collision
  // stays inside the round shapes (a cross of boxes for the top), so nothing invisible sticks out.
  const steelTable = (x, zz, long = !1, ry = 0) => {
    if (long) cb(x - 1.2, 0, zz - 0.42, x + 1.2, 0.76, zz + 0.42, 'prop', 'stainless', { pen: 3 });
    else {
      cb(x - 0.55, 0, zz - 0.24, x + 0.55, 0.76, zz + 0.24, 'prop', 'stainless', { pen: 3 });
      cb(x - 0.24, 0, zz - 0.55, x + 0.24, 0.76, zz + 0.55, 'prop', 'stainless', { pen: 3 });
      cb(x - 0.42, 0, zz - 0.42, x + 0.42, 0.76, zz + 0.42, 'prop', 'stainless', { pen: 3 });
    }
    const st = long ? [[-0.8, -0.85], [0, -0.85], [0.8, -0.85], [-0.8, 0.85], [0, 0.85], [0.8, 0.85]] : [[0, -0.95], [0, 0.95], [-0.95, 0], [0.95, 0]];
    for (const [sx, sz] of st) {
      cb(x + sx - 0.15, 0, zz + sz - 0.15, x + sx + 0.15, 0.46, zz + sz + 0.15, 'prop', 'stainless', { pen: 3 });
      // a thin cap: the collider top (0.53 m) is above the automatic step-up height (0.48 m), so running into
      // a stool does not carry you up onto it and over the table; jumping still does
      w.box(x + sx - 0.15, 0.46, zz + sz - 0.15, x + sx + 0.15, 0.53, zz + sz + 0.15, 'prop', { mat: 'metal' });
    }
    R.tables.push({ x, z: zz, long, ry });
  };
  // a gun tower: legs, a cab reached by a stair, a waist-high parapet, a roof on corner posts
  const tower = (x0, z0, size, hgt, open) => {
    for (const [cx, cz] of [[x0, z0], [x0 + size, z0], [x0, z0 + size], [x0 + size, z0 + size]]) cb(cx - 0.15, 0, cz - 0.15, cx + 0.15, hgt, cz + 0.15, 'prop', 'paint');
    cb(x0 - 0.3, hgt - 0.3, z0 - 0.3, x0 + size + 0.3, hgt, z0 + size + 0.3, 'floor', 'concrete');
    const top = hgt;
    open !== 'N' && cb(x0 - 0.3, top, z0 - 0.3, x0 + size + 0.3, top + 1.05, z0 - 0.1, 'wall', 'paint');
    open !== 'S' && cb(x0 - 0.3, top, z0 + size + 0.1, x0 + size + 0.3, top + 1.05, z0 + size + 0.3, 'wall', 'paint');
    open !== 'W' && cb(x0 - 0.3, top, z0 - 0.1, x0 - 0.1, top + 1.05, z0 + size + 0.1, 'wall', 'paint');
    open !== 'E' && cb(x0 + size + 0.1, top, z0 - 0.1, x0 + size + 0.3, top + 1.05, z0 + size + 0.1, 'wall', 'paint');
    cb(x0 - 0.6, top + 2.6, z0 - 0.6, x0 + size + 0.6, top + 2.85, z0 + size + 0.6, 'roof', 'corr');
    A.lights.push({ pos: z(x0 + size / 2, top + 3.4, z0 + size / 2), interior: !1 });
    R.towers.push({ x0, z0, size, h: hgt, open });
    return top;
  };
  // a sign or a painted stencil: a canvas texture on a plate (signs) or flat on a surface (decals)
  const sign = (x, y, zz, ry, wd, ht, text, style = 'plate', o = {}) => R.signs.push({ x, y, z: zz, ry, w: wd, h: ht, text, style, ...o });
  const decal = (x, y, zz, nx, ny, nz, wd, ht, kind, o = {}) => R.decals.push({ x, y, z: zz, n: [nx, ny, nz], w: wd, h: ht, kind, ...o });
  // a Poly Haven model (66b-prison-props.js); box: [x, z, half width, half depth, height] for its collision
  const model = (id, x, y, zz, ry = 0, s = 1, o = {}) => {
    if (o.box) {
      const [bx0, bz0, hw, hd, h] = o.box,
        sw = Math.abs(Math.sin(ry)) > 0.5,
        ax = sw ? hd : hw,
        az = sw ? hw : hd;
      cb(bx0 - ax, y, bz0 - az, bx0 + ax, y + h, bz0 + az, 'prop', 'paint', { pen: 3 });
    }
    R.models.push({ id, x, y, z: zz, ry, s, ...o });
  };
  const item = (k, o) => R.items.push({ k, ...o });
  // every doorway and opening in a wall, for 66b-prison-props.js to frame (and gate the wide ones)
  R.openings = [];
  {
    const coreWall = w.wall.bind(w);
    w.wall = (o) => {
      coreWall(o);
      for (const op of o.openings || []) (op.type === 'open' || op.type === 'door') && R.openings.push({ alongX: o.alongX, f: o.fixed, t: o.t, out: o.outSign, a0: o.a0, a1: o.a1, a: op.a, w: op.w, y0: (o.y0 || 0) + op.y0, y1: (o.y0 || 0) + op.y1, type: op.type });
    };
  }
  // ---------------------------------------------------------------- ground and perimeter
  vs(-60, -0.2, -60, W + 60, 0, D + 60, 'grass', '#9aa078');
  // the perimeter wall: 6.2 m cast concrete (collision to 9 m, as every map's bounds), pilasters every 8 m on
  // the inside face (with their own collision), a coping, and razor wire coils on top
  tag({ panel: 'concrete' }, () => F9(w, W, D, C.wallOut, 'panel', 6.2));
  for (const [x0, z0, x1, z1] of [[0, -0.5, W, 0], [0, D, W, D + 0.5], [-0.5, 0, 0, D], [W, 0, W + 0.5, D]]) R.wire.push({ x0, z0, x1, z1, y: 6.2, double: !0 });
  for (let x = 8; x < W - 2; x += 8) {
    for (const [zz, s] of [[0, 1], [D, -1]]) {
      const zi = zz + s * 0.22;
      // not where a building or gate stands against the wall
      if (s < 0 && x > 68 && x < 94) continue;
      cb(x - 0.3, 0, Math.min(zz, zi), x + 0.3, 6.2, Math.max(zz, zi), 'wall', 'concrete', { pen: 0 });
      R.pilasters.push({ x, z: zz, s, ax: 'x', h: 6.2 });
    }
  }
  for (let zz = 8; zz < D - 2; zz += 8)
    for (const [x, s] of [[0, 1], [W, -1]]) {
      const xi = x + s * 0.22;
      cb(Math.min(x, xi), 0, zz - 0.3, Math.max(x, xi), 6.2, zz + 0.3, 'wall', 'concrete', { pen: 0 });
      R.pilasters.push({ x, z: zz, s, ax: 'z', h: 6.2 });
    }
  // north visitor lot (outside the inner wall)
  vs(0, 0.004, 0, W, 0.014, 14, 'asphalt', C.road);
  for (let x = 6; x < 52; x += 3) R.lines.push({ x0: x, z0: 2, x1: x + 0.1, z1: 7, c: '#e8e6df' });
  for (let x = 78; x < 96; x += 3) R.lines.push({ x0: x, z0: 2, x1: x + 0.1, z1: 7, c: '#e8e6df' });
  // inner compound: concrete hardstanding, the main road, walks
  vs(0, 0.004, 14.6, W, 0.012, 92, 'walk', C.walk);
  vs(0, 0.012, 14.6, W, 0.02, 23, 'asphalt', C.road);
  for (let x = 4; x < W - 4; x += 6) R.lines.push({ x0: x, z0: 18.7, x1: x + 3, z1: 18.9, c: '#e3cf7a' });
  vs(36, 0.012, 23, 44, 0.02, 92, 'walk', '#c9c4b8');
  vs(84, 0.012, 38, 100, 0.02, 70, 'walk', '#c9c4b8');
  // grass verges between buildings, worn to mud along the paths
  vs(100, 0.012, 40, 124, 0.02, 44, 'grass', '#a8ab84');
  vs(4, 0.012, 72.5, 36, 0.02, 75.5, 'grass', '#a8ab84');
  // ---------------------------------------------------------------- inner north wall, Gatehouse, sally port, breach
  const wallH = 5.6;
  for (const [x0, x1] of [[0, 38], [44.5, 56], [72, 98], [104, 128]]) {
    bx(x0, 0, 14, x1, wallH, 14.6, 'wall', 'concrete', C.wallOut);
    R.wire.push({ x0, z0: 14, x1, z1: 14.6, y: wallH });
  }
  // the breach: a blown section with ragged stumps, rubble both sides, scorched
  bx(38, 0, 14, 39, 2.6, 14.6, 'wall', 'concrete', C.wallOut);
  bx(43.5, 0, 14, 44.5, 3.4, 14.6, 'wall', 'concrete', C.wallOut);
  R.rubble.push({ x0: 38, x1: 39, y: 2.6, z0: 14, z1: 14.6, side: 1 }, { x0: 43.5, x1: 44.5, y: 3.4, z0: 14, z1: 14.6, side: -1 });
  for (const [x, zz, s, h] of [[39.6, 13.2, 1.1, 0.55], [42.2, 15.4, 1.3, 0.5], [40.8, 15.9, 0.8, 0.35], [43.2, 12.6, 0.9, 0.4], [41, 12.4, 0.6, 0.3]]) {
    cb(x - s / 2, 0, zz - s / 2, x + s / 2, h, zz + s / 2, 'prop', 'concrete', { pen: 3 });
    R.rubble.push({ chunk: !0, x, z: zz, s, h });
  }
  vs(38.6, 0.02, 11.5, 45, 0.04, 17.5, 'mud', '#a89a80');
  decal(41.2, 1.6, 14.6, 0, 0, 1, 7, 3.2, 'scorch');
  decal(41.2, 1.6, 14, 0, 0, -1, 7, 3.2, 'scorch');
  decal(41.6, 0.045, 14.3, 0, 1, 0, 8, 7, 'scorch');
  // Gatehouse: a gothic stone gatehouse straddling the wall (1898): a pointed-arch portal with the prison's
  // name in the tympanum, a crenellated parapet and two octagonal turrets on the lot side. North door from the
  // lot, south door into the compound
  {
    const x0 = 56,
      x1 = 72,
      z0 = 8,
      z1 = 20,
      h = 3.6;
    tag({ concrete: 'granite', plaster: 'plaster', trim: 'paint' }, () => {
      w.wall({ alongX: !0, fixed: z0 + 0.15, a0: x0, a1: x1, y0: 0, h, t: 0.3, outSign: -1, outMat: 'concrete', outColor: C.stone, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings: [{ a: 62.6, w: 2.8, y0: 0, y1: 2.6, type: 'open' }, { a: 58, w: 2, y0: 1, y1: 2.2, type: 'window' }, { a: 68, w: 2, y0: 1, y1: 2.2, type: 'window' }] });
      w.wall({ alongX: !0, fixed: z1 - 0.15, a0: x0, a1: x1, y0: 0, h, t: 0.3, outSign: 1, outMat: 'concrete', outColor: C.stone, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings: [{ a: 62.6, w: 2.8, y0: 0, y1: 2.6, type: 'open' }] });
      w.wall({ alongX: !1, fixed: x0 + 0.15, a0: z0 + 0.3, a1: z1 - 0.3, y0: 0, h, t: 0.3, outSign: -1, outMat: 'concrete', outColor: C.stone, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings: [] });
      w.wall({ alongX: !1, fixed: x1 - 0.15, a0: z0 + 0.3, a1: z1 - 0.3, y0: 0, h, t: 0.3, outSign: 1, outMat: 'concrete', outColor: C.stone, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings: [{ a: 16.5, w: 1.1, y0: 0, y1: 2.2, type: 'door', swing: 1, leaf: C.door }] });
    });
    vs(x0 + 0.3, 0, z0 + 0.3, x1 - 0.3, 0.025, z1 - 0.3, 'tile', '#d9d5cc');
    tag({ plaster: 'ceil', roof: 'roof' }, () => w.slab(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, h + 0.3, [], 'roof', '#7a7570', '#e6e2da', 0.3));
    // the parapet (merlons and crenels) round the roof, and the arched portals with their tympana
    for (const [a, b, c2, d2] of [[x0 - 0.3, z0 - 0.3, x1 + 0.3, z0 + 0.1], [x0 - 0.3, z1 - 0.1, x1 + 0.3, z1 + 0.3], [x0 - 0.3, z0 + 0.1, x0 + 0.1, z1 - 0.1], [x1 - 0.1, z0 + 0.1, x1 + 0.3, z1 - 0.1]]) cb(a, h + 0.3, b, c2, h + 1.0, d2, 'wall', 'granite');
    R.arches.push({ kind: 'portal', alongX: !0, f: z0, out: -1, a: 62.6, w: 2.8, y1: 2.6, top: h, text: 'A.D. 1898' });
    // the prison's name carved along the parapet over the portal
    decal((x0 + x1) / 2, h + 0.66, z0 - 0.31, 0, 0, -1, 11.5, 0.5, 'carved', { text: 'BLACKWATER STATE PENITENTIARY' });
    // the portals' stone jambs stand proud of the walls
    for (const [zA, zB] of [[z0 - 0.25, z0], [z1, z1 + 0.25]]) for (const [xA, xB] of [[62.6 - 0.55, 62.6], [65.4, 65.4 + 0.55]]) cb(xA, 0, zA, xB, 2.6, zB, 'wall', 'granite', { pen: 0 });
    R.arches.push({ kind: 'portal', alongX: !0, f: z1, out: 1, a: 62.6, w: 2.8, y1: 2.6, top: h, text: 'ADMITTANCE' });
    R.arches.push({ kind: 'parapet', x0: x0 - 0.3, x1: x1 + 0.3, z0: z0 - 0.3, z1: z1 + 0.3, y: h + 0.3 });
    for (const [tx, tz] of [[x0 - 0.45, z0 - 0.45], [x1 + 0.45, z0 - 0.45]]) {
      const a = 1.15;
      cb(tx - a, 0, tz - a * 0.414, tx + a, 7.2, tz + a * 0.414, 'wall', 'granite', { pen: 0 });
      cb(tx - a * 0.414, 0, tz - a, tx + a * 0.414, 7.2, tz + a, 'wall', 'granite', { pen: 0 });
      cb(tx - a * 0.707, 0, tz - a * 0.707, tx + a * 0.707, 7.2, tz + a * 0.707, 'wall', 'granite', { pen: 0 });
      R.turrets.push({ x: tx, z: tz, a, h: 7.2 });
    }
    // security lane: metal detector arch, X-ray belt, turnstile rails
    cb(63.0, 0, 13.2, 63.25, 2.25, 13.6, 'prop', 'paint', { pen: 2 });
    cb(65.15, 0, 13.2, 65.4, 2.25, 13.6, 'prop', 'paint', { pen: 2 });
    item('detector', { x0: 63, x1: 65.4, z0: 13.2, z1: 13.6, h: 2.3 });
    cb(59.2, 0, 11.6, 61.8, 0.9, 12.4, 'prop', 'paint', { pen: 2 });
    cb(60, 0.9, 11.65, 61.2, 1.65, 12.35, 'prop', 'paint', { pen: 2 });
    item('xray', { x0: 59.2, x1: 61.8, z0: 11.6, z1: 12.4 });
    bars(62.4, 15.2, 62.4, 18.2, 0, 1.05, { style: 'turnstile' });
    bars(65.8, 15.2, 65.8, 18.2, 0, 1.05, { style: 'turnstile' });
    // control booth: glass on two sides, a console inside
    bx(67, 0, 10.2, 67.2, 1, 15, 'wall', 'block', '#b7bcb8');
    w.pane(67.06, 1, 10.4, 67.14, 2.6, 12.6);
    w.pane(67.06, 1, 12.8, 67.14, 2.6, 15);
    bx(67.2, 0, 14.9, 71.7, 1, 15.1, 'wall', 'block', '#b7bcb8');
    w.pane(67.4, 1, 14.96, 71.6, 2.6, 15.04);
    bx(67.2, 2.6, 10.2, 71.7, 3.6, 15.1, 'wall', 'plaster', C.wallIn);
    cb(69.4, 0, 10.6, 71.6, 0.9, 11.6, 'prop', 'paint', { pen: 2 });
    item('console', { x0: 69.4, x1: 71.6, z0: 10.6, z1: 11.6, face: 'S', screens: 3 });
    sign(64.2, 3.0, 12.4, 0, 2.6, 0.5, 'ALL VISITORS WILL BE SEARCHED', 'notice');
    sign(57.6, 1.6, 19.8, Math.PI, 1.2, 0.8, 'NO WEAPONS · NO CELL PHONES · NO CONTRABAND', 'rules');
    A.areas.push({ name: 'Gatehouse', min: z(x0, 0, z0), max: z(x1, h, z1) });
    for (const [lx, lz] of [[60, 11], [66, 11], [60, 17], [66, 17]]) lamp(lx, h - 0.05, lz, 'tube');
    for (const lx of [58.5, 69.5]) lamp(lx, 3.0, 7.5, 'lantern', !1);
    R.cams.push({ x: 56.6, y: 3.2, z: 7.75, ry: Math.PI * 0.85 }, { x: 71.4, y: 3.2, z: 7.75, ry: -Math.PI * 0.85 });
  }
  // vehicle sally port: a caged lane through the wall with two barrier arms under a steel canopy
  {
    bx(97.6, 0, 9, 98, 4.2, 22, 'wall', 'concrete', C.wallOut);
    bx(104, 0, 9, 104.4, 4.2, 22, 'wall', 'concrete', C.wallOut);
    vs(98, 0.012, 9, 104, 0.02, 22, 'walk', '#b9b4aa');
    for (const zz of [10, 20.4]) {
      cb(103.3, 0, zz - 0.2, 103.8, 1.2, zz + 0.2, 'prop', 'paint', { pen: 2 });
      item('barrier', { x0: 98, x1: 103.55, z: zz });
    }
    for (let zz = 10.5; zz < 21; zz += 1.4) R.lines.push({ x0: 98, z0: zz, x1: 104, z1: zz + 0.7, c: C.yellow });
    item('canopy', { x0: 97.6, x1: 104.4, z0: 9, z1: 22, y: 4.2 });
    sign(101, 3.6, 8.9, Math.PI, 3.2, 0.6, 'SALLY PORT · STOP FOR INSPECTION', 'warn');
    A.areas.push({ name: 'Sally Port', min: z(98, 0, 9), max: z(104, 4, 22) });
    lamp(101, 4.0, 12, 'flood', !1);
    lamp(101, 4.0, 19, 'flood', !1);
  }
  // ---------------------------------------------------------------- A Block (1898 brick cell house)
  const AB = { x0: 4, x1: 36, z0: 24, z1: 72, tier: 3.2, roof: 7.0, rise: 3.8 };
  {
    const { x0, x1, z0, z1, tier, roof } = AB,
      t = 0.4,
      H = roof;
    const wallSpec = (alongX, fixed, a0, a1, outSign, openings) =>
      tag({ concrete: 'brick', plaster: 'block', trim: 'paint' }, () => w.wall({ alongX, fixed, a0, a1, y0: 0, h: H, t, outSign, outMat: 'concrete', outColor: C.brick, inMat: 'plaster', inColor: C.wallIn, trim: C.trim, openings, pen: 0 }));
    wallSpec(!0, z0 + t / 2, x0, x1, -1, [{ a: 18.8, w: 2.4, y0: 0, y1: 2.8, type: 'open' }, ...[8, 13, 26, 31].map((a) => ({ a, w: 1.2, y0: 4.8, y1: 6.2, type: 'window' }))]);
    wallSpec(!0, z1 - t / 2, x0, x1, 1, [{ a: 18.8, w: 2.4, y0: 0, y1: 2.8, type: 'open' }]);
    wallSpec(!1, x0 + t / 2, z0 + t, z1 - t, -1, []);
    wallSpec(!1, x1 - t / 2, z0 + t, z1 - t, 1, [{ a: 27.5, w: 1.6, y0: 0, y1: 2.5, type: 'door', swing: -1, leaf: C.door }, { a: 66.8, w: 1.6, y0: 0, y1: 2.5, type: 'door', swing: -1, leaf: C.door }]);
    for (const a of [8, 13, 26, 31]) R.arches.push({ kind: 'window', alongX: !0, f: z0, out: -1, a, w: 1.2, y0: 4.8, y1: 6.2 });
    for (const a of [18.8]) {
      R.arches.push({ kind: 'door', alongX: !0, f: z0, out: -1, a, w: 2.4, y1: 2.8, text: 'A BLOCK' });
      R.arches.push({ kind: 'door', alongX: !0, f: z1, out: 1, a, w: 2.4, y1: 2.8, text: 'A BLOCK' });
    }
    for (const a of [27.5, 66.8]) R.arches.push({ kind: 'door', alongX: !1, f: x1, out: 1, a, w: 1.6, y1: 2.5 });
    // the vault: a segmental barrel vault from wall top to crown (rise 3.8 m), steel arch trusses every 4 m
    // and a glazed skylight along the crown. Collision: 50 cm strips, each at the lowest point of the vault
    // over it (so a jump never meets an invisible ceiling); open along the skylight
    const V = (R.vault = { x0, x1, z0, z1, spring: roof, rise: AB.rise, sky: [18.6, 21.4] });
    for (let x = x0; x < x1 - 1e-6; x += 0.5) {
      const yA = __prVaultY(V, x),
        yB = __prVaultY(V, x + 0.5),
        y = Math.min(yA, yB);
      if (x + 0.5 > V.sky[0] && x < V.sky[1]) continue;
      cb(x, y, z0, x + 0.5, Math.max(yA, yB) + 0.4, z1, 'roof', 'roof');
      // the gable walls up to the vault
      cb(x, roof, z0, x + 0.5, Math.max(yA, yB) + 0.4, z0 + t, 'wall', 'brick', { pen: 0 });
      cb(x, roof, z1 - t, x + 0.5, Math.max(yA, yB) + 0.4, z1, 'wall', 'brick', { pen: 0 });
    }
    // painted wainscot band inside the dayroom
    vs(x0 + t + 3.2, 0, z0 + t, x1 - t - 3.2, 1.2, z0 + t + 0.02, 'block', C.band);
    vs(x0 + t + 3.2, 0, z1 - t - 0.02, x1 - t - 3.2, 1.2, z1 - t, 'block', C.band);
    // floor: sealed concrete with the painted lines that keep inmates off the stairs and the picket
    vs(x0 + t, 0, z0 + t, x1 - t, 0.03, z1 - t, 'floor', C.epoxy);
    R.lines.push({ x0: 8.2, z0: 26, x1: 31.8, z1: 26.12, c: C.yellow, y: 0.035 }, { x0: 8.2, z0: 69.9, x1: 31.8, z1: 70.02, c: C.yellow, y: 0.035 });
    R.lines.push({ x0: 16.4, z0: 43.2, x1: 23.6, z1: 43.3, c: C.yellow, y: 0.035 }, { x0: 16.4, z0: 50.7, x1: 23.6, z1: 50.8, c: C.yellow, y: 0.035 }, { x0: 16.4, z0: 43.2, x1: 16.5, z1: 50.8, c: C.yellow, y: 0.035 }, { x0: 23.5, z0: 43.2, x1: 23.6, z1: 50.8, c: C.yellow, y: 0.035 });
    decal(20, 0.036, 42.6, 0, 1, 0, 4.2, 0.4, 'stencil', { text: 'NO INMATES BEYOND THIS LINE' });
    // cells: 13 per side per tier, 2.8 m wide, 3.2 m deep. The two Jailbreak cells (A.__jbCells) are shut
    // with a door that can be unlocked
    const cz0 = 29.6,
      cw = 2.8,
      n = 13,
      depth = 3.2,
      jbCells = (A.__jbCells = [['W', 0, 11], ['E', 1, 10]]);
    const cellFront = { W: x0 + t + depth, E: x1 - t - depth };
    A.__jbBars = [];
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
            jb = jbCells.some(([sd, tr, ci]) => sd === side && tr === tierI && ci === i),
            open = !jb && ((i * 7 + tierI * 3 + (side === 'E' ? 5 : 0)) % 4 === 0 || i === 6);
          // divider wall
          bx(Math.min(back, front), y, za - 0.1, Math.max(back, front), y + ch, za + 0.1, 'wall', 'block', C.wallIn, { pen: 0 });
          // the bars front, with a sliding door: racked open, shut, or (Jailbreak) locked and unlockable
          // a shut cell's gate is a real door (E slides it open or shut; 66b-prison-props.js draws it sliding)
          const bar = bars(front, za + 0.1, front, zb - 0.1, y, ch, open ? { gap: [za + 1.6, za + 2.6], racked: [za + 0.7, za + 1.6], side: s } : { door: [za + 1.6, za + 2.6], side: s });
          if (!open) {
            const doorId = A.doors.length;
            w.door(!1, za + 1.6, front, y, 1.0, ch - 0.02, 1, C.bars);
            A.doors[doorId].__cell = { bar, s, front, a0: za + 1.6, a1: za + 2.6, y, h: ch };
            jb && A.__jbBars.push({ side, tier: tierI, i, doorId, door: { x: front + s * 0.55, y, z: za + 2.1 }, inside: { x: (back + front) / 2 - s * 0.2, y, z: za + 1.7 }, face: s > 0 ? Math.PI / 2 : -Math.PI / 2 });
          }
          // bunk against the divider, steel toilet-sink at the back corner, a desk and stool on the other wall
          const bxA = side === 'W' ? back + 0.1 : back - 2.05,
            bxB = bxA + 1.95;
          cb(bxA, y, za + 0.15, bxB, y + 0.45, za + 0.95, 'prop', 'paint', { pen: 3 });
          cb(bxA, y + 1.35, za + 0.15, bxB, y + 1.45, za + 0.95, 'prop', 'paint', { pen: 3 });
          const tx = side === 'W' ? back + 0.1 : back - 0.6;
          cb(tx, y, zb - 0.65, tx + 0.5, y + 0.42, zb - 0.15, 'prop', 'stainless', { pen: 2 });
          side === 'W' ? cb(tx, y + 0.42, zb - 0.65, tx + 0.12, y + 0.95, zb - 0.15, 'prop', 'stainless', { pen: 2 }) : cb(tx + 0.38, y + 0.42, zb - 0.65, tx + 0.5, y + 0.95, zb - 0.15, 'prop', 'stainless', { pen: 2 });
          // a steel desk on the far wall and its stool (on an arm)
          const dx0 = side === 'W' ? back + 0.75 : back - 1.65;
          cb(dx0, y + 0.7, zb - 0.55, dx0 + 0.9, y + 0.76, zb - 0.1, 'prop', 'paint', { pen: 3 });
          cb(dx0 + 0.3, y, zb - 0.95, dx0 + 0.6, y + 0.46, zb - 0.65, 'prop', 'paint', { pen: 3 });
          R.cells.push({ side, tier: tierI, i, back, front, za, zb, y, ch, s, open, jb, v: (i * 5 + tierI * 3 + (side === 'E' ? 7 : 0)) % 6 });
          lamp(back + s * 0.3, y + ch - 0.12, za + 1.4, 'cell');
          // loose things in some of the open cells
          if (open && tierI === 0) i % 2 ? P('mattress', (back + front) / 2 + s * 0.3, za + 1.9, 0.4) : P('book', (back + front) / 2, za + 1.6, i);
        }
        bx(Math.min(back, front), y, cz0 + n * cw - 0.1, Math.max(back, front), y + ch, cz0 + n * cw + 0.1, 'wall', 'block', C.wallIn, { pen: 0 });
        // cell numbers over the doors (W 101-113 / 201-213, E 114-126 / 214-226)
      }
      // upper tier floor over the cells and the steel-plate gallery in front of them
      const gal = 1.6,
        gx0 = side === 'W' ? back : front - gal,
        gx1 = side === 'W' ? front + gal : back;
      cb(gx0, tier - 0.25, cz0 - 0.1, gx1, tier, cz0 + n * cw + 0.1, 'floor', 'floor');
      vs(Math.min(back, front), tier - 0.25, cz0 - 0.1, Math.max(back, front), tier, cz0 + n * cw + 0.1, 'floor', C.epoxy);
      side === 'W' ? vs(front, tier - 0.25, cz0 - 0.1, front + gal, tier, cz0 + n * cw + 0.1, 'plate', '#a9b0b3') : vs(front - gal, tier - 0.25, cz0 - 0.1, front, tier, cz0 + n * cw + 0.1, 'plate', '#a9b0b3');
      const edge = side === 'W' ? front + gal : front - gal;
      R.gallery.push({ side, front, edge, s, z0: cz0 - 0.1, z1: cz0 + n * cw + 0.1, y: tier });
      // a mesh-filled railing along the gallery edge, leaving a gap where the stair arrives
      const gapZ = side === 'W' ? [34.1, 35.6] : [56.4, 57.9];
      rail(edge, cz0, edge, gapZ[0], tier, 1.05, !0);
      rail(edge, gapZ[1], edge, cz0 + n * cw, tier, 1.05, !0);
      rail(side === 'W' ? front : front - gal, cz0, side === 'W' ? front + gal : front, cz0, tier, 1.05, !0);
      rail(side === 'W' ? front : front - gal, cz0 + n * cw, side === 'W' ? front + gal : front, cz0 + n * cw, tier, 1.05, !0);
      for (let zz = cz0 + 2; zz < cz0 + n * cw; zz += 6) lamp(side === 'W' ? front + 0.8 : front - 0.8, tier - 0.32, zz, 'strip');
      for (let k = 0; k < n; k++) {
        const za = cz0 + k * cw;
        for (const tr of [0, 1]) sign(front + s * 0.06, tr * tier + tier - 0.42, za + 0.42, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0.36, 0.16, String((tr + 1) * 100 + (side === 'W' ? k + 1 : k + 14)), 'cellno');
      }
    }
    // stairs up to the galleries (steel, with a landing that meets the gallery)
    const sw = 1.6,
      wf = cellFront.W + 1.6,
      ef = cellFront.E - 1.6;
    stair(wf, 40.1, 'N', 0, tier, sw);
    cb(wf, tier - 0.2, 34.1, wf + sw, tier, 35.62, 'floor', 'plate');
    vs(wf, tier - 0.2, 34.1, wf + sw, tier, 35.62, 'plate', '#a9b0b3');
    rail(wf + sw, 35.62, wf + sw, 40.1, 0, 1.0);
    rail(wf, 34.1, wf + sw, 34.1, tier, 1.05);
    rail(wf + sw, 34.1, wf + sw, 35.62, tier, 1.05);
    stair(ef - sw, 51.9, 'S', 0, tier, sw);
    cb(ef - sw, tier - 0.2, 56.38, ef, tier, 57.9, 'floor', 'plate');
    vs(ef - sw, tier - 0.2, 56.38, ef, tier, 57.9, 'plate', '#a9b0b3');
    rail(ef - sw, 51.9, ef - sw, 56.38, 0, 1.0);
    rail(ef - sw, 57.9, ef, 57.9, tier, 1.05);
    rail(ef - sw, 56.38, ef - sw, 57.9, tier, 1.05);
    // control picket in the middle of the dayroom: glass all round, a console, a door on the south side
    {
      const px0 = 17.2,
        px1 = 22.8,
        pz0 = 44,
        pz1 = 50,
        ph = 2.8;
      bx(px0, 0, pz0, px1, 1.0, pz0 + 0.15, 'wall', 'block', '#a6aca8');
      bx(px0, 0, pz0 + 0.15, px0 + 0.15, 1.0, pz1, 'wall', 'block', '#a6aca8');
      bx(px1 - 0.15, 0, pz0 + 0.15, px1, 1.0, pz1, 'wall', 'block', '#a6aca8');
      bx(px0, 0, pz1 - 0.15, 19.2, 1.0, pz1, 'wall', 'block', '#a6aca8');
      bx(20.4, 0, pz1 - 0.15, px1, 1.0, pz1, 'wall', 'block', '#a6aca8');
      w.pane(px0 + 0.1, 1.0, pz0 + 0.05, px1 - 0.1, 2.5, pz0 + 0.1);
      w.pane(px0 + 0.05, 1.0, pz0 + 0.2, px0 + 0.1, 2.5, pz1 - 0.2);
      w.pane(px1 - 0.1, 1.0, pz0 + 0.2, px1 - 0.05, 2.5, pz1 - 0.2);
      w.pane(20.5, 1.0, pz1 - 0.1, px1 - 0.1, 2.5, pz1 - 0.05);
      w.door(!0, 19.22, pz1 - 0.075, 0, 1.16, 2.45, -1, C.door);
      bx(19.2, 2.5, pz1 - 0.15, 20.4, ph, pz1, 'wall', 'paint', C.steel);
      bx(px0 - 0.1, ph, pz0 - 0.1, px1 + 0.1, ph + 0.2, pz1 + 0.1, 'roof', 'paint', '#6a7176');
      item('picket', { x0: px0, x1: px1, z0: pz0, z1: pz1, h: ph });
      cb(17.6, 0, 44.4, 22.4, 0.95, 45.3, 'prop', 'paint', { pen: 2 });
      item('console', { x0: 17.6, x1: 22.4, z0: 44.4, z1: 45.3, face: 'S', screens: 4 });
      lamp(20, ph - 0.05, 47, 'tube');
      A.areas.push({ name: 'Control Picket', min: z(px0, 0, pz0), max: z(px1, ph, pz1) });
    }
    // dayroom: round bolted tables, a TV in a cage on the pillar, payphones, a drinking fountain
    for (const [x, zz] of [[13.4, 31.5], [26.6, 31.5], [13.4, 38], [26.6, 38], [13.4, 56.5], [26.6, 56.5], [13.4, 63], [26.6, 63]]) steelTable(x, zz);
    bx(19.6, 0, 33.6, 20.4, 3, 34.4, 'wall', 'block', '#b8b2a4');
    item('tv', { x: 20, y: 2.25, z: 34.4, ry: 0 });
    // a large TV high on the north wall over the door, facing the whole dayroom: it plays the dayroom's
    // programme (70-screens.js; set in the /admin dashboard as "Blackwater Dayroom TV"), with its sound
    A.screens = [{ id: 'prison', name: 'Dayroom TV', x: 20, y: 4.72, z: z0 + t, w: 4.8, h: 2.7, ry: 0, frame: 'tv', hear: 26 }];
    for (let i = 0; i < 4; i++) item('phone', { x: x0 + 0.42, y: 1.45, z: 25.55 + i * 0.9, ry: Math.PI / 2 });
    sign(x0 + 0.43, 2.25, 26.9, Math.PI / 2, 2.2, 0.35, 'INMATE TELEPHONES · CALLS MAY BE RECORDED', 'notice');
    item('fountain', { x: 35.55, y: 0, z: 46.5, ry: -Math.PI / 2 });
    sign(x1 - 0.43, 2.4, 40, -Math.PI / 2, 1.6, 0.9, 'A BLOCK · GENERAL POPULATION', 'board');
    for (const [x, zz] of [[11.8, 52], [28.6, 44.5]]) P('bin', x, zz);
    for (const [x, zz, r] of [[15.2, 33.4, 0.4], [24.6, 36.1, 2.1], [14.6, 58.2, 1.3], [25.1, 61.8, 3.6]]) P('chair', x, zz, r);
    for (const [x, zz] of [[13.4, 31.5], [26.6, 38], [13.4, 63]]) P('tray', x + 0.2, zz - 0.1, 0.3, 0.76);
    P('mattress', 21.4, 41.2, 0.7);
    P('mattress', 17.6, 53.6, 2.2);
    P('bucket', 31.0, 68.6);
    // riot: a mattress fire, papers, graffiti, the alarm beacons turning
    R.fires.push({ x: 24.2, y: 0, z: 52.6, s: 0.8, k: 'mattress' });
    decal(24.2, 0.04, 52.6, 0, 1, 0, 3.2, 3.2, 'scorch');
    decal(13.5, 2.0, z1 - t - 0.01, 0, 0, -1, 3.6, 1.2, 'graffiti', { text: 'NO MORE', c: '#c8392b' });
    decal(27, 2.1, z0 + t + 0.01, 0, 0, 1, 3.0, 1.1, 'graffiti', { text: 'FREE US', c: '#e8e2d0' });
    for (const [bx0, by, bz, ry] of [[20, 6.4, z0 + t + 0.05, 0], [20, 6.4, z1 - t - 0.05, Math.PI], [x0 + t + 0.05, 6.2, 48, Math.PI / 2], [x1 - t - 0.05, 6.2, 48, -Math.PI / 2]]) R.beacons.push({ x: bx0, y: by, z: bz, ry });
    for (const [lx, lz] of [[14, 30], [26, 30], [14, 40], [26, 40], [14, 54], [26, 54], [14, 64], [26, 64]]) lamp(lx, 6.2, lz, 'pend');
    R.cams.push({ x: x0 + t + 0.1, y: 6.0, z: z0 + t + 0.1, ry: Math.PI * 0.75 }, { x: x1 - t - 0.1, y: 6.0, z: z1 - t - 0.1, ry: -Math.PI * 0.25 });
    A.buildings.push({ name: 'A Block', x: x0, z: z0, w: x1 - x0, d: z1 - z0, h: roof });
    A.areas.push({ name: 'A Block West Cells', min: z(x0, 0, z0), max: z(cellFront.W, roof, z1) });
    A.areas.push({ name: 'A Block East Cells', min: z(cellFront.E, 0, z0), max: z(x1, roof, z1) });
    A.areas.push({ name: 'Upper Tier', min: z(x0, tier, z0), max: z(x1, roof, z1) });
    A.areas.push({ name: 'Dayroom', min: z(cellFront.W, 0, z0), max: z(cellFront.E, tier, z1) });
  }
  // ---------------------------------------------------------------- Administration and Visitation
  tag({ concrete: 'brick', plaster: 'plaster', tile: 'tile', trim: 'paint', wood: 'wood' }, () =>
    BI(w, {
      name: 'Administration',
      x: 46,
      z: 25,
      w: 36,
      d: 14,
      floors: 1,
      fh: 3.4,
      facade: 'concrete',
      facadeColor: C.brick,
      trim: C.trim,
      inner: ['plaster', '#e6e1d4'],
      floorMat: () => ['tile', '#d6d1c6'],
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
      lights: () => [],
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
    }),
  );
  for (const [lx, lz] of [[5, 4], [5, 10], [15, 4], [19, 10], [23, 4], [31, 3.5], [31, 10.5]]) lamp(46 + lx, 3.35, 25 + lz, 'tube');
  R.arches.push({ kind: 'facade', x0: 46, x1: 82, z0: 25, z1: 39, h: 3.4, cornice: !0, sills: !0 });
  R.arches.push({ kind: 'door', alongX: !0, f: 25, out: -1, a: 46 + 16.4, w: 2.4, y1: 2.6, text: 'ADMINISTRATION' });
  {
    // visitation booths: a counter with glass partitions between visitor and inmate sides
    const vz = 25 + 7,
      vx0 = 59.0,
      vx1 = 46 + 26.6;
    cb(vx0, 0, vz - 0.25, vx1, 0.95, vz + 0.25, 'prop', 'block', { pen: 3 });
    vs(vx0, 0, vz - 0.25, vx1, 0.95, vz + 0.25, 'block', '#bdb8ac');
    for (let x = vx0; x <= vx1 + 0.01; x += 1.52) bx(x - 0.04, 0.95, vz - 0.3, x + 0.04, 2.35, vz + 0.3, 'wall', 'paint', '#8e959a', { pen: 2 });
    for (let x = vx0; x < vx1 - 0.1; x += 1.52) {
      w.pane(x + 0.05, 0.95, vz - 0.03, x + 1.47, 2.3, vz + 0.03);
      for (const s of [-1, 1]) {
        item('handset', { x: x + 0.76, y: 1.38, z: vz + s * 0.31, s });
        cb(x + 0.61, 0, vz + s * 0.85 - 0.15, x + 0.91, 0.46, vz + s * 0.85 + 0.15, 'prop', 'stainless', { pen: 3 });
        w.box(x + 0.61, 0.46, vz + s * 0.85 - 0.15, x + 0.91, 0.53, vz + s * 0.85 + 0.15, 'prop', { mat: 'metal' });
        R.tables.push({ x: x + 0.76, z: vz + s * 0.85, stool: !0 });
      }
    }
    vs(vx0, 2.35, vz - 0.32, vx1, 2.45, vz + 0.32, 'paint', '#8e959a');
    sign(65.8, 2.75, vz - 0.33, Math.PI, 3.2, 0.32, 'VISITATION · 30 MINUTES', 'notice');
    P('chair', 51.2, 30.6, 0.6);
    P('box', 47.6, 36.8, 0.3);
    P('box', 48.3, 37.4, 1.2);
    P('book', 76.8, 27.6, 0.4, 0.76);
    model('metal_office_desk', 50.5, 0, 35.5, Math.PI, 1, { box: [50.5, 35.5, 1.0, 0.47, 0.79] });
    model('steel_frame_shelves_01', 47.2, 0, 33, Math.PI / 2, 1, { box: [47.2, 33, 0.55, 0.26, 2.14] });
    model('korean_fire_extinguisher_01', 56.6, 0.9, 25.45, 0);
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
    vs(x0, 0.02, z0, x1, 0.03, z1, 'asphalt', '#d2d0cc');
    // basketball court: a sports surface with lines, two hoops
    const cx0 = 50,
      cx1 = 72,
      cz0 = 46,
      cz1 = 62;
    vs(cx0, 0.03, cz0, cx1, 0.036, cz1, 'court', '#7c5a46');
    item('court', { x0: cx0, x1: cx1, z0: cz0, z1: cz1 });
    for (const [hx, dir] of [[cx0 + 0.6, 1], [cx1 - 0.6, -1]]) {
      cb(hx - 0.1, 0, 53.9, hx + 0.1, 3.4, 54.1, 'prop', 'paint', { pen: 2 });
      R.hoops.push({ x: hx, z: 54, dir });
    }
    P('ball', 61.2, 54.6);
    // weight pit: benches and racks on rubber flooring
    vs(76, 0.03, 46, 91, 0.05, 54, 'rubber', '#4a4c4e');
    for (const [x, zz] of [[78.5, 48.5], [82.5, 48.5], [86.5, 48.5], [78.5, 51.8], [82.5, 51.8]]) {
      cb(x - 0.18, 0, zz - 0.7, x + 0.18, 0.45, zz + 0.7, 'prop', 'paint', { pen: 3 });
      R.benches.push({ x, z: zz });
    }
    cb(88.6, 0, 50.2, 89.6, 1.6, 53.6, 'prop', 'paint', { pen: 2 });
    item('rack', { x0: 88.6, x1: 89.6, z0: 50.2, z1: 53.6, h: 1.6 });
    // bleachers along the south fence
    for (let i = 0; i < 4; i++) cb(52, i * 0.42, 62.8 + i * 0.7, 70, i * 0.42 + 0.42, 63.5 + i * 0.7, 'stair', 'paint', { pen: 2 });
    R.bleachers.push({ x0: 52, x1: 70, z0: 62.8, rows: 4, step: 0.42, depth: 0.7 });
    // low concrete planters and a steel picnic table for cover
    for (const [a, b, c2, d2] of [[75, 57.5, 79, 58.5], [84.5, 59.5, 85.5, 63.5], [77.5, 62, 81.5, 63]]) {
      cb(a, 0, b, c2, 0.95, d2, 'prop', 'concrete', { pen: 4 });
      R.planters.push({ x0: a, z0: b, x1: c2, z1: d2, h: 0.95 });
    }
    steelTable(89.6, 58.6, !0);
    P('cone', 74.4, 45.4);
    P('cone', 75.1, 45.9);
    R.fires.push({ x: 66.8, y: 0, z: 44.6, s: 1, k: 'barrel' }, { x: 49.4, y: 0, z: 64.4, s: 1.1, k: 'tyres' });
    cb(66.5, 0, 44.3, 67.1, 0.93, 44.9, 'prop', 'paint', { pen: 2 });
    cb(48.8, 0, 63.8, 50.0, 0.7, 65.0, 'prop', 'rubber', { pen: 3 });
    decal(57, 0.04, 54, 0, 1, 0, 6, 2.2, 'graffiti', { text: 'BLACKWATER RIOT', c: '#e8e0c8' });
    sign(59.5, 2.6, z0 - 0.05, Math.PI, 2.4, 1.0, 'YARD RULES\nNO CONTACT · NO GATHERING\nFENCE LINE IS OUT OF BOUNDS', 'rules');
    A.areas.push({ name: 'Exercise Yard', min: z(x0, 0, z0), max: z(x1, 4, z1) });
    A.areas.push({ name: 'Basketball Court', min: z(cx0, 0, cz0), max: z(cx1, 4, cz1) });
    A.areas.push({ name: 'Weight Pit', min: z(76, 0, 46), max: z(91, 4, 54) });
  }
  // gun tower overlooking the yard, the east walk and the cafeteria roofline
  tower(96.5, 50.5, 3.6, 5.2, 'E');
  stair(100.4 + 26 * 0.28, 51.4, 'W', 0, 5.2, 1.2, 'one');
  A.areas.push({ name: 'Yard Tower', min: z(96, 0, 50), max: z(108, 9, 55) });
  // NE gate tower
  tower(119.5, 16, 3.6, 6, 'S');
  stair(120.7, 19.9 + 30 * 0.28, 'N', 0, 6, 1.2, 'one');
  A.areas.push({ name: 'Gate Tower', min: z(118, 0, 15), max: z(124, 9, 24) });
  // ---------------------------------------------------------------- Infirmary
  tag({ concrete: 'concrete', plaster: 'plaster', tile: 'tile', trim: 'paint', wood: 'wood' }, () =>
    BI(w, {
      name: 'Infirmary',
      x: 86,
      z: 25,
      w: 22,
      d: 12,
      floors: 1,
      fh: 3.2,
      facade: 'concrete',
      facadeColor: '#e2ddd2',
      trim: '#3f6a7a',
      inner: ['plaster', '#f0f1ee'],
      floorMat: () => ['tile', '#dfe3df'],
      window: { every: 3.4, w: 1.2, sill: 1.1, top: 2.1 },
      doors: [{ side: 'W', at: 6 }, { side: 'S', at: 15, w: 1.6, leafless: !0 }, { side: 'N', at: 4 }],
      parts: () => [{ x1: 9, z1: 0, x2: 9, z2: 12, doors: [3, 9] }],
      roof: 'flat',
      lights: () => [],
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
    }),
  );
  for (const [lx, lz] of [[4.5, 6], [13, 3.5], [13, 8.5], [19, 6]]) lamp(86 + lx, 3.15, 25 + lz, 'tube');
  for (const zz of [27.6, 34.4]) R.items.push({ k: 'curtains', x0: 96.5, x1: 105.5, z: zz });
  model('wheelchair_01', 93.2, 0, 35.6, 2.4, 1, { box: [93.2, 35.6, 0.4, 0.4, 1.0] });
  model('korean_fire_extinguisher_01', 86.45, 0.9, 30, Math.PI / 2);
  R.arches.push({ kind: 'facade', x0: 86, x1: 108, z0: 25, z1: 37, h: 3.2, cornice: !1, sills: !0 });
  sign(97, 2.75, 37.05, 0, 2.2, 0.45, 'INFIRMARY', 'plaque', { cross: !0 });
  P('bucket', 88.2, 34.6);
  P('stool', 99.5, 30.4);
  A.areas.push({ name: 'Infirmary', min: z(86, 0, 25), max: z(108, 3.2, 37) });
  // ---------------------------------------------------------------- Laundry
  tag({ concrete: 'concrete', plaster: 'block', trim: 'paint' }, () =>
    BI(w, {
      name: 'Laundry',
      x: 104,
      z: 58,
      w: 20,
      d: 16,
      floors: 1,
      fh: 4.2,
      facade: 'concrete',
      facadeColor: '#cdc6b6',
      trim: C.trim,
      inner: ['plaster', '#d6d3c8'],
      floorMat: () => ['concrete', '#aeaba3'],
      window: { every: 4, w: 1.4, sill: 2.2, top: 3.4 },
      doors: [{ side: 'W', at: 4, w: 2.4, leafless: !0, h: 2.8 }, { side: 'W', at: 12 }, { side: 'S', at: 10, w: 3, leafless: !0, h: 3 }],
      parts: () => [],
      roof: 'flat',
      lights: () => [],
    }),
  );
  for (const [lx, lz] of [[5, 4], [15, 4], [5, 12], [15, 12]]) lamp(104 + lx, 4.1, 58 + lz, 'pend');
  {
    for (let i = 0; i < 4; i++) {
      const x = 119.4,
        zz = 60.5 + i * 2.4;
      cb(x, 0, zz, x + 2.2, 1.9, zz + 2, 'prop', 'stainless', { pen: 2 });
      item('washer', { x0: x, x1: x + 2.2, z0: zz, z1: zz + 2, face: 'W' });
    }
    for (const [x, zz] of [[110, 62], [110, 67]]) {
      cb(x, 0, zz, x + 3.2, 0.9, zz + 1.4, 'prop', 'stainless', { pen: 3 });
      item('folding', { x0: x, x1: x + 3.2, z0: zz, z1: zz + 1.4 });
    }
    for (const [x, zz] of [[112, 70.6], [106.4, 60.4]]) {
      cb(x, 0, zz, x + 1.1, 0.95, zz + 0.7, 'prop', 'paint', { pen: 3 });
      item('cart', { x0: x, x1: x + 1.1, z0: zz, z1: zz + 0.7 });
    }
    model('steel_frame_shelves_01', 105.0, 0, 70.6, Math.PI / 2, 1, { box: [105.0, 70.6, 0.55, 0.26, 2.14] });
    model('WetFloorSign_01', 114.6, 0, 64.8, 0.5);
    P('box', 108.2, 63.8, 0);
    P('box', 108.9, 64.9, 1.2);
    P('box', 108.2, 63.8, 0.15, 0.39);
    P('bin', 106.2, 72.6);
    P('bucket', 115.6, 62.4);
    R.pipes.push({ pts: [[104.3, 3.7, 59], [123.6, 3.7, 59]], r: 0.08, c: '#8a8f93' }, { pts: [[104.3, 3.45, 59.3], [123.6, 3.45, 59.3]], r: 0.05, c: '#b44a2c' });
    sign(114, 3.3, 57.95, Math.PI, 1.8, 0.4, 'LAUNDRY', 'plaque');
    A.areas.push({ name: 'Laundry', min: z(104, 0, 58), max: z(124, 4.2, 74) });
  }
  // east grounds: a parked prison van by the laundry and a pallet stack
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
    const wl = (alongX, fixed, a0, a1, outSign, openings, inColor = '#e6e1d4') =>
      tag({ concrete: 'concrete', plaster: 'block', trim: 'paint' }, () => w.wall({ alongX, fixed, a0, a1, y0: 0, h, t, outSign, outMat: 'concrete', outColor: '#d5cebf', inMat: 'plaster', inColor, trim: C.trim, openings, pen: 0 }));
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
    tag({ plaster: 'tile', trim: 'paint' }, () =>
      w.wall({ alongX: !1, fixed: kx, a0: z0 + t, a1: z1 - t, y0: 0, h, t: 0.25, outSign: 0, outMat: 'plaster', outColor: '#eceae4', inMat: 'plaster', inColor: '#eceae4', trim: C.trim, openings: [{ a: 73, w: 1.2, y0: 0, y1: 2.3, type: 'door', swing: 1, leaf: '#8a949a' }, { a: 76.5, w: 9, y0: 1.0, y1: 2.6, type: 'open' }], pen: 4 }),
    );
    vs(x0 + t, 0, z0 + t, kx, 0.03, z1 - t, 'tile', C.tile);
    vs(kx, 0, z0 + t, x1 - t, 0.03, z1 - t, 'tile', '#c6cac4');
    vs(x0 + t, 0, z0 + t, kx - 0.13, 1.1, z0 + t + 0.02, 'block', C.band);
    tag({ plaster: 'ceil', roof: 'roof' }, () => w.slab(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, h + 0.3, [], 'roof', '#7a7570', '#e2ded4', 0.3));
    R.arches.push({ kind: 'facade', x0, x1, z0, z1, h, cornice: !1, sills: !0 });
    // serving line: steam-table counter on the hall side of the opening, with sneeze-guard glass
    cb(kx - 1.0, 0, 76.5, kx - 0.15, 0.95, 85.5, 'prop', 'stainless', { pen: 2 });
    for (let zz = 76.5; zz < 85.4; zz += 1.8) w.pane(kx - 1.0, 1.25, zz + 0.05, kx - 0.95, 1.75, zz + 1.75);
    item('serving', { x0: kx - 1.0, x1: kx - 0.15, z0: 76.5, z1: 85.5, rail: kx - 2.5 });
    sign(kx - 0.1, 3.1, 81, -Math.PI / 2, 3.4, 0.9, 'TODAY: RED BEANS & RICE · CORNBREAD · GREENS', 'menu');
    // dining hall: rows of long steel tables
    for (let x = 48; x <= 76; x += 5.5) for (const zz of [74.5, 79, 83.5, 87.4]) steelTable(x, zz, !0);
    // trays and plastic chairs knocked about by the riot
    for (const [x, zz, r] of [[48.4, 74.3, 0.2], [53.6, 79.2, 1.1], [59.3, 83.4, 2.6], [64.8, 74.8, 0.9], [70.2, 87.1, 1.8], [75.7, 79.3, 0.4], [53.2, 87.6, 2.2], [64.6, 83.7, 3.1]]) P('tray', x, zz, r, 0.76);
    for (const [x, zz] of [[57.4, 76.6], [68.3, 81.4], [74.5, 85.6]]) P('tray', x, zz, x * 0.3);
    for (const [x, zz, r] of [[51.2, 76.9, 0.7], [62.1, 81.2, 2.3], [72.6, 76.9, 1.5], [78.9, 88.6, 0.2], [46.6, 85.5, 2.9]]) P('chair', x, zz, r);
    for (const [x, zz] of [[45.2, 71.2], [82.4, 71.4], [45.2, 88.6]]) P('bin', x, zz);
    for (const [x, zz] of [[49.4, 81.1], [61.7, 72.3], [77.2, 82.8]]) P('can', x, zz);
    // kitchen: prep tables, a range under a hood, steam kettles, a walk-in freezer and the dish pit
    for (const [a, b, c2, d2] of [[87, 74, 91, 75.2], [87, 79.5, 91, 80.7], [87, 85, 91, 86.2]]) {
      cb(a, 0, b, c2, 0.92, d2, 'prop', 'stainless', { pen: 2 });
      item('prep', { x0: a, x1: c2, z0: b, z1: d2 });
    }
    cb(94.6, 0, 71.5, 99.4, 0.92, 72.6, 'prop', 'stainless', { pen: 2 });
    item('range', { x0: 94.6, x1: 99.4, z0: 71.5, z1: 72.6 });
    item('hood', { x0: 94.4, x1: 99.6, z0: 71, z1: 73.2, y0: 2.3, y1: 3.0 });
    for (const [kx2, kz] of [[93.2, 75.6], [93.2, 77.4]]) {
      cb(kx2 - 0.42, 0, kz - 0.42, kx2 + 0.42, 0.95, kz + 0.42, 'prop', 'stainless', { pen: 2 });
      item('kettle', { x: kx2, z: kz, r: 0.45 });
    }
    P('bucket', 88.3, 75.5, 0, 0.92);
    P('bucket', 89.9, 80.9, 0, 0.92);
    model('steel_frame_shelves_01', 99.4, 0, 79, -Math.PI / 2, 1, { box: [99.4, 79, 0.55, 0.26, 2.14] });
    // walk-in freezer: an insulated box with a heavy door
    tag({ metal: 'insul', trim: 'paint' }, () => {
      w.wall({ alongX: !0, fixed: 81.6, a0: 92, a1: 99.7, y0: 0, h: 3, t: 0.2, outSign: 0, outMat: 'metal', outColor: '#e3e7e8', inMat: 'metal', inColor: '#eef1f2', trim: C.trim, openings: [{ a: 93, w: 1.1, y0: 0, y1: 2.2, type: 'door', swing: -1, leaf: '#c9d0d3' }], pen: 2 });
      w.wall({ alongX: !1, fixed: 92, a0: 81.7, a1: 89.7, y0: 0, h: 3, t: 0.2, outSign: 0, outMat: 'metal', outColor: '#e3e7e8', inMat: 'metal', inColor: '#eef1f2', trim: C.trim, openings: [], pen: 2 });
    });
    bx(92, 3, 81.6, 99.7, 3.2, 89.7, 'roof', 'insul', '#dfe3e4');
    for (const zz of [83, 85.4, 87.8]) {
      cb(98, 0, zz, 99.6, 1.9, zz + 1.6, 'prop', 'paint', { pen: 2 });
      item('wireshelf', { x0: 98, x1: 99.6, z0: zz, z1: zz + 1.6, h: 1.9 });
    }
    P('box', 94.4, 86.8, 0.4);
    P('box', 95.0, 87.6, 1.4);
    lamp(95.8, 2.95, 85.6, 'tube');
    // dish pit by the south door
    cb(86.2, 0, 87.8, 90.8, 0.95, 89.6, 'prop', 'stainless', { pen: 2 });
    item('sink', { x0: 86.2, x1: 90.8, z0: 87.8, z1: 89.6 });
    for (const [lx, lz] of [[50, 75], [50, 85], [58, 75], [58, 85], [66, 75], [66, 85], [74, 75], [74, 85]]) lamp(lx, h - 0.05, lz, 'pend2');
    for (const [lx, lz] of [[80, 80], [88, 74], [88, 84], [96, 77]]) lamp(lx, h - 0.05, lz, 'tube');
    R.pipes.push({ pts: [[45, 3.75, 72.2], [83.6, 3.75, 72.2]], r: 0.3, c: '#a8adb0', duct: !0 }, { pts: [[45, 3.75, 87.8], [83.6, 3.75, 87.8]], r: 0.3, c: '#a8adb0', duct: !0 });
    decal(64, 1.6, z0 + t + 0.01, 0, 0, 1, 3.2, 1.0, 'graffiti', { text: 'WE EAT LAST', c: '#c8392b' });
    for (const [bx0, bz] of [[44.36, 76], [99.64, 76]]) R.beacons.push({ x: bx0, y: 3.6, z: bz, ry: bx0 < 50 ? Math.PI / 2 : -Math.PI / 2 });
    R.cams.push({ x: x0 + 0.4, y: 3.8, z: z0 + 0.4, ry: Math.PI * 0.75 }, { x: kx - 0.2, y: 3.8, z: z1 - 0.4, ry: -Math.PI * 0.75 });
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
    const wl = (alongX, fixed, a0, a1, outSign, openings) => tag({ concrete: 'concrete', plaster: 'block', trim: 'paint' }, () => w.wall({ alongX, fixed, a0, a1, y0: 0, h, t, outSign, outMat: 'concrete', outColor: '#c2bcae', inMat: 'plaster', inColor: C.shu, trim: C.trim, openings, pen: 0 }));
    wl(!0, z0 + t / 2, x0, x1, -1, [{ a: 5.4, w: 1.4, y0: 0, y1: 2.4, type: 'door', swing: 1, leaf: C.door }]);
    wl(!0, z1 - t / 2, x0, x1, 1, [{ a: 32.3, w: 1.4, y0: 0, y1: 2.4, type: 'door', swing: -1, leaf: C.door }]);
    wl(!1, x0 + t / 2, z0 + t, z1 - t, -1, []);
    wl(!1, x1 - t / 2, z0 + t, z1 - t, 1, [{ a: 82.2, w: 1.6, y0: 0, y1: 2.4, type: 'open' }]);
    vs(x0 + t, 0, z0 + t, x1 - t, 0.03, z1 - t, 'floor', '#a3a199');
    tag({ plaster: 'ceil', roof: 'roof' }, () => w.slab(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, h + 0.3, [], 'roof', '#7a7570', '#d8d6cf', 0.3));
    R.arches.push({ kind: 'facade', x0, x1, z0, z1, h, cornice: !1, sills: !1 });
    sign(x1 + 0.05, 2.95, 82.2, Math.PI / 2, 2.6, 0.45, 'SPECIAL HOUSING UNIT', 'plaque');
    // central corridor z 81.4..84.6 with eight slots a side. North slot 0 is the entry vestibule (door from
    // A Block yard), south slot 7 the exit vestibule (door to the dock); the rest are single cells with solid
    // steel doors (a food slot and a narrow window), a concrete bunk and a steel toilet. Two (Jailbreak) are
    // locked: their doors only open when the crew cuts the lock.
    const sw = (x1 - t - (x0 + t)) / 8,
      jbShu = (A.__jbShu = []);
    for (const [side, cz0, cz1] of [['N', z0 + t, 81.4], ['S', 84.6, z1 - t]]) {
      const fixed = side === 'N' ? 81.4 : 84.6,
        hall = side === 'N' ? 0 : 7,
        jbK = side === 'N' ? 3 : 5,
        openings = [];
      for (let k = 0; k < 8; k++) {
        const xa = x0 + t + k * sw;
        openings.push(k === hall ? { a: xa + 0.6, w: sw - 1.2, y0: 0, y1: 2.6, type: 'open' } : { a: xa + 1.4, w: 1.0, y0: 0, y1: 2.2, type: 'door', swing: side === 'N' ? -1 : 1, leaf: '#5d6f73' });
      }
      const d0 = A.doors.length;
      tag({ plaster: 'block', trim: 'paint' }, () => w.wall({ alongX: !0, fixed, a0: x0 + t, a1: x1 - t, y0: 0, h, t: 0.25, outSign: 0, outMat: 'plaster', outColor: C.shu, inMat: 'plaster', inColor: C.shu, trim: C.trim, openings, pen: 2 }));
      for (let k = 0, di = d0; k < 8; k++) {
        const xa = x0 + t + k * sw;
        k > 0 && bx(xa - 0.1, 0, cz0, xa + 0.1, h, cz1, 'wall', 'block', C.shu, { pen: 0 });
        lamp(xa + sw / 2, h - 0.05, (cz0 + cz1) / 2, 'cage');
        if (k === hall) continue;
        const doorId = di++;
        A.doors[doorId].__shu = 1;
        const by = side === 'N' ? cz0 + 0.1 : cz1 - 0.9;
        cb(xa + 0.3, 0, by, xa + 2.3, 0.45, by + 0.8, 'prop', 'concrete', { pen: 4 });
        cb(xa + sw - 0.75, 0, side === 'N' ? cz0 + 0.1 : cz1 - 0.6, xa + sw - 0.25, 0.42, side === 'N' ? cz0 + 0.6 : cz1 - 0.1, 'prop', 'stainless', { pen: 2 });
        R.shu.push({ side, k, xa, sw, cz0, cz1, by, doorId, jb: k === jbK, fixed });
        sign(xa + 1.9, 2.42, fixed + (side === 'N' ? 0.14 : -0.14), side === 'N' ? 0 : Math.PI, 0.32, 0.14, 'S-' + (side === 'N' ? k : 8 + k), 'cellno');
        k === jbK && jbShu.push({ side, k, doorId, door: { x: xa + 1.9, y: 0, z: fixed + (side === 'N' ? 0.9 : -0.9) }, inside: { x: xa + sw / 2 + 0.1, y: 0, z: (cz0 + cz1) / 2 }, face: side === 'N' ? 0 : Math.PI });
      }
    }
    for (let x = 7; x < 34; x += 5) lamp(x, h - 0.05, 83, 'tube');
    R.lines.push({ x0: x0 + t, z0: 82.9, x1: x1 - t, z1: 83.1, c: C.yellow, y: 0.034 });
    P('bucket', 33.2, 82.2);
    R.cams.push({ x: x1 - t - 0.1, y: 3.1, z: 81.6, ry: -Math.PI / 2 });
    A.areas.push({ name: 'Solitary', min: z(x0, 0, z0), max: z(x1, h, z1) });
  }
  // ---------------------------------------------------------------- south fence and the Service Dock
  fence(0, 92, W, 92, 3.6, [[58, 64], [96, 102]]);
  for (const x of [58, 64, 96, 102]) {
    cb(x - 0.15, 0, 91.85, x + 0.15, 4.2, 92.15, 'prop', 'paint', { pen: 2 });
    R.poles.push({ k: 'gatepost', x, z: 92, h: 4.2 });
  }
  vs(0, 0.012, 92, W, 0.02, D, 'asphalt', C.road);
  // loading dock: a raised platform along the cafeteria's south side, with steps and rubber bumpers
  bx(70, 0, 92.3, 92, 1.2, 95, 'floor', 'concrete', '#c3bdb0');
  tag({ concrete: 'concrete' }, () => ce(w, 92 + 6 * 0.28, 92.3, 'W', 0, 1.2, 2.7, 'concrete', '#b5afa2'));
  item('dock', { x0: 70, x1: 92, z0: 92.3, z1: 95, h: 1.2 });
  w.car('car-van', 50, 98.5, Math.PI / 2);
  w.car('car-van', 80, 99.2, Math.PI / 2);
  w.static('dumpster', 106, 95.2, 0, [2.2, 1.5, 1.4]);
  w.static('dumpster', 109, 95.2, 0, [2.2, 1.5, 1.4]);
  for (const [x, zz] of [[24, 96], [25.3, 96], [24.6, 97.2]]) w.crate(x, zz, 1.2, 1.2, 0, '#9a7a52');
  for (const [x, zz] of [[36, 99], [37.2, 99.4]]) w.barrel(x, zz);
  // the "Crates and barrels" set (drawn by 49-crates.js): crates under a tarp and three drums
  (A.__crateSets || (A.__crateSets = [])).push({ x: 15, z: 99.4, rotY: 0 });
  w.box(15 - 1.05, 0, 99.4 - 2.15, 15 + 1.05, 1.05, 99.4 + 2.15, 'crate', { pen: 1.4, mat: 'wood' });
  P('crate', 30, 95.6, 0.4);
  P('crate', 31.1, 96.2, 1.1);
  P('crate', 30.5, 95.9, 0.7, 0.62);
  for (const [x, zz] of [[66, 96.4], [67, 96.9], [88, 97]]) P('cone', x, zz);
  sign(81, 3.6, 92.1, Math.PI, 3.0, 0.55, 'DELIVERIES · STAFF ONLY', 'warn');
  model('trashbag', 104.2, 0, 96.6, 0.4);
  model('trashbag', 104.9, 0, 97.3, 2.1);
  A.areas.push({ name: 'Service Dock', min: z(0, 0, 92), max: z(W, 4, D) });
  A.areas.push({ name: 'Loading Dock', min: z(70, 0, 92), max: z(95, 2, 95) });
  // ---------------------------------------------------------------- outside the wall: the visitor lot
  w.car('car-sedan', 10, 4.5, 0);
  w.car('car-hatchback', 22, 4.8, 0);
  w.car('car-sedan', 31, 4.6, Math.PI);
  w.car('car-van', 84, 5, 0);
  w.car('car-sedan', 92, 4.6, 0);
  // the getaway van the crew came in (Jailbreak: freed inmates are led to it)
  w.static('car-van', 46, 8.2, Math.PI / 2, [4.8, 2.2, 2.1]);
  for (const [x, zz] of [[52, 11.5], [54, 11.5], [74, 11.5], [76, 11.5]]) w.static('cone', x, zz, 0, [0.4, 0.7, 0.4], 0, !1);
  // a riot roadblock of concrete barriers and burning tyres west of the gatehouse
  for (const [x, zz, r] of [[27.5, 11.6, 0.1], [31.2, 11.9, -0.08]]) {
    cb(x - 0.75, 0, zz - 0.3, x + 0.75, 0.82, zz + 0.3, 'prop', 'concrete', { pen: 4 });
    model('concrete_road_barrier', x, 0, zz, r, 1);
  }
  R.fires.push({ x: 35.2, y: 0, z: 10.6, s: 1, k: 'barrel' }, { x: 88.4, y: 0, z: 10.2, s: 1.1, k: 'tyres' });
  cb(34.9, 0, 10.3, 35.5, 0.93, 10.9, 'prop', 'paint', { pen: 2 });
  cb(87.8, 0, 9.6, 89.0, 0.7, 10.8, 'prop', 'rubber', { pen: 3 });
  for (const [x, zz] of [[8, 11], [118, 11], [36, 2], [92, 2]]) {
    A.lights.push({ pos: z(x, 7.6, zz), interior: !1 });
    cb(x - 0.13, 0, zz - 0.13, x + 0.13, 7.4, zz + 0.13, 'prop', 'paint', { pen: 2 });
    R.poles.push({ k: 'flood', x, z: zz, h: 7.8, ry: zz < 6 ? Math.PI : 0 });
  }
  A.areas.push({ name: 'Visitor Lot', min: z(0, 0, 0), max: z(W, 4, 14) });
  A.areas.push({ name: 'Main Road', min: z(0, 0, 14.6), max: z(W, 4, 23) });
  A.areas.push({ name: 'Riot Breach', min: z(38, 0, 11), max: z(45, 4, 18) });
  A.areas.push({ name: 'West Alley', min: z(36, 0, 23), max: z(44, 4, 92) });
  A.areas.push({ name: 'East Walk', min: z(84, 0, 38), max: z(104, 4, 70) });
  // floodlights over the compound (on poles, clear of the walks)
  for (const [x, zz] of [[40, 40], [98, 40], [40, 68], [101.6, 88], [70, 40], [24, 22.8], [110, 24]]) {
    A.lights.push({ pos: z(x, 7.6, zz), interior: !1 });
    cb(x - 0.13, 0, zz - 0.13, x + 0.13, 7.4, zz + 0.13, 'prop', 'paint', { pen: 2 });
    R.poles.push({ k: 'flood', x, z: zz, h: 7.8, ry: Math.atan2(64 - x, 54 - zz) });
  }
  // exterior wall lights and cameras on the buildings
  for (const [x, y, zz, ry] of [[19.9, 3.4, 23.75, Math.PI], [19.9, 3.4, 72.25, 0], [36.25, 3.0, 27.5, Math.PI / 2], [36.25, 3.0, 66.8, Math.PI / 2], [64, 3.0, 24.75, Math.PI], [64, 3.0, 39.25, 0], [97, 2.9, 37.25, 0], [58, 3.2, 69.75, Math.PI], [99, 3.2, 90.25, 0], [36.25, 2.9, 82.2, Math.PI / 2], [114, 3.8, 57.75, Math.PI]]) R.models.push({ id: 'security_light', x, y, z: zz, ry, s: 1, wall: !0 });
  // hydrants, utility boxes on the walls, the bolt cutters the crew brought
  model('fire_hydrant', 50, 0, 12.9, Math.PI, 1, { box: [50, 12.9, 0.2, 0.15, 0.8] });
  model('fire_hydrant', 84, 0, 23.6, 0, 1, { box: [84, 23.6, 0.2, 0.15, 0.8] });
  model('utility_box_02', 36.25, 0, 78, Math.PI / 2, 1, { box: [36.25, 78, 0.46, 0.22, 1.12] });
  model('utility_box_02', 70, 0, 39.25, 0, 1, { box: [70, 39.25, 0.46, 0.22, 1.12] });
  model('utility_box_02', 103.75, 0, 66, -Math.PI / 2, 1, { box: [103.75, 66, 0.46, 0.22, 1.12] });
  model('bolt_cutters_01', 9.3, 0.03, 64.2, 0.6, 1, { rx: Math.PI / 2 });
  R.cams.push({ x: 38.2, y: 5.2, z: 14.75, ry: Math.PI * 0.2 }, { x: 98.2, y: 4.6, z: 22.2, ry: 0.4 }, { x: 44.2, y: 3.9, z: 69.75, ry: Math.PI * 0.8 });
  // ---------------------------------------------------------------- objectives and spawns
  // Terrorists arrive in the visitor lot; Counter-Terrorists stage at the service dock.
  A.spawns.T = [[58, 4], [62, 3], [66, 4], [70, 3], [60, 6.5], [64, 6.5], [68, 6.5], [56, 2], [72, 2], [64, 1.6]].map(([x, zz]) => z(x, 0, zz));
  A.spawns.CT = [[54, 97], [58, 96.5], [62, 97], [66, 96.5], [70, 97.5], [56, 100], [60, 100.5], [64, 100], [68, 100.5], [72, 100]].map(([x, zz]) => z(x, 0, zz));
  A.spawnZones = { T: { min: z(52, 0, 1), max: z(76, 0, 8) }, CT: { min: z(52, 0, 95.5), max: z(74, 0, 102) } };
  // the teams start on the opposite sides from the core's assumption (CT north): face the prison instead
  A.spawnFaceCenter = !0;
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
  // Jailbreak: the four locked-up inmates (two A Block cells, two Solitary cells) and where they are led
  A.jb = {
    cells: [
      ...A.__jbBars.map((c, k) => ({ id: k, kind: 'door', cell: !0, area: c.tier ? 'A Block upper tier' : 'A Block', doorId: c.doorId, door: c.door, inside: c.inside, face: c.face })),
      ...A.__jbShu.map((c, k) => ({ id: A.__jbBars.length + k, kind: 'door', area: 'Solitary', doorId: c.doorId, door: c.door, inside: c.inside, face: c.face })),
    ],
    rescue: { min: z(0, 0, -2), max: z(W, 4, 13.2) },
    van: z(46, 0, 10.9),
    need: 2,
  };
  for (const c of A.jb.cells) c.kind === 'door' && (A.doors[c.doorId].__jbLocked = 1);
  // a swinging door's leaf, once open, is solid where it rests (the core turns a door's collision off while it
  // is open, so you walked through the open leaf): a box there, on only while the door is open (66b-prison-
  // props.js switches it, once nobody stands in the swing). Cell gates slide behind their own bars: none.
  for (const d of A.doors) {
    if (d.__cell) continue;
    const th = (d.alongX ? 0 : -Math.PI / 2) + d.swing * Math.PI * 0.5,
      ex = d.hinge.x + Math.cos(th) * d.w,
      ez = d.hinge.z - Math.sin(th) * d.w,
      t = 0.035;
    d.__leafBox = w.box(Math.min(d.hinge.x, ex) - t, d.hinge.y, Math.min(d.hinge.z, ez) - t, Math.max(d.hinge.x, ex) + t, d.hinge.y + d.h, Math.max(d.hinge.z, ez) + t, 'door', { pen: 4, mat: 'metal', door: d.id, off: !0, __leaf: 1 });
  }
  // every box visual is drawn by 65-prison-view.js (with real materials); the core's merged box mesh is skipped
  for (const v of A.visuals) v.__hidden = 1;
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
    'An 1898 penitentiary on the bayou in the middle of a jailbreak. A brick cell house under a vaulted roof, the gothic gatehouse, visitation, the exercise yard and its gun tower, the cafeteria and kitchen, solitary and the service dock. In Jailbreak the crew frees the inmates.',
  size: 'Large',
  maxPlayers: 24,
});
