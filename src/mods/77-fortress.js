/* ===== Bayou Protocol mod: Fortress (a clifftop citadel, built from the owner's concept art) ===== */
// A sandstone citadel on a jungle island, ringed by ramparts over the sea, on three levels (metres; x east,
// z south; 128 x 108):
//   High ground (y 5.6, north)   CT Spawn behind the grand stair, the Helipad and its lighthouse tower (NE), the
//                                arcaded Gallery over A (NW)
//   Main level (y 2.4, middle)   A Site (NW) with A Long down the west rampart and A Main from the south; Mid, a
//                                cobbled square round a fountain, with the Mid Gate (three arches) south of it;
//                                B Site (E) with the sheds, B Long down the east rampart, the Garden (B lower)
//   Lower level (y 0, south)     T Spawn (SW) and the Market shed, Lower Mid (the grand stair up to the Mid Gate),
//                                the ring road (SE) and the Tunnel up to B Long
// Routes (the concept's arrows): T -> A Long (west ramp), A Main (the Market stair, a dog-leg), Mid (the grand
// stair, the gate's arch), B through the Garden (B lower), B Long through the Tunnel (the slow flank). CT ->
// A down the Gallery stair or across Mid's west arch, B down the Helipad stair or Mid's east passage.
// Every visual names a surface; 78-fortress-view.js draws them with Poly Haven materials, through the prison's
// pipeline (65-prison-view.js), and models what is not a box (arches, the arcade, crenellations, the fountain,
// palms, crates, sheds, the helicopter, the tower, the cliffs and the sea).
const __FT_L0 = 0,
  __FT_L1 = 2.4,
  __FT_L2 = 5.6;
const __FT_PHYS = (s) => (/crate|wood|plank/.test(s) ? 'wood' : /corr|paint|dark|metal/.test(s) ? 'metal' : /grass|gcobble/.test(s) ? 'dirt' : 'concrete');
function __fortressBuild() {
  const w = new Po(),
    A = w.m,
    W = 128,
    D = 108,
    L0 = __FT_L0,
    L1 = __FT_L1,
    L2 = __FT_L2;
  A.id = 'fortress';
  A.name = 'Fortress';
  A.w = W;
  A.d = D;
  A.backdrop = 'none';
  A.physProps = [];
  A.__view = __PR_KITS.fortress;
  const R = (A.__pr = { lamps: [], models: [], signs: [], decals: [], lines: [], rails: [], stairs: [], openings: [], cams: [], items: [], poles: [], pipes: [], planters: [], beacons: [], fires: [], bars: [], fences: [], wire: [], tables: [], cells: [], shu: [], towers: [], hoops: [], benches: [], bleachers: [], gallery: [], arches: [], rubble: [], pilasters: [], turrets: [], vault: null });
  const N = (A.__ft = { houses: [], rails: [], crates: [], palms: [], trees: [], ferns: [], pots: [], sheds: [], pergolas: [], turrets: [], merlons: [], blind: [], columns: [], fountain: null, heli: null, tower: null, stairs: [], arc: null });
  // ---------------------------------------------------------------- helpers
  const vs = (x0, y0, z0, x1, y1, z1, s, color) => {
    const n = A.visuals.length;
    w.vis(x0, y0, z0, x1, y1, z1, 'concrete', color);
    n < A.visuals.length && (A.visuals[n].s = s);
  };
  const cb = (x0, y0, z0, x1, y1, z1, kind, s, o = {}) => w.box(x0, y0, z0, x1, y1, z1, kind, { mat: __FT_PHYS(s), ...o });
  const bx = (x0, y0, z0, x1, y1, z1, kind, s, color, o = {}) => (vs(x0, y0, z0, x1, y1, z1, s, color), cb(x0, y0, z0, x1, y1, z1, kind, s, o));
  const lamp = (x, y, zz, k = 'lantern', hi = !1) => {
    hi && A.lights.push({ pos: z(x, y, zz), interior: !1 });
    R.lamps.push({ x, y, z: zz, k });
  };
  const model = (id, x, y, zz, ry = 0, s = 1, o = {}) => {
    if (o.box) {
      const [bx0, bz0, hw, hd, h] = o.box,
        sw = Math.abs(Math.sin(ry)) > 0.5;
      cb(bx0 - (sw ? hd : hw), y, bz0 - (sw ? hw : hd), bx0 + (sw ? hd : hw), y + h, bz0 + (sw ? hw : hd), 'prop', 'crate', { pen: 2 });
    }
    R.models.push({ id, x, y, z: zz, ry, s, ...o });
  };
  // a solid building: stone or rendered walls, windows, a pitched clay roof or a crenellated parapet
  const house = (x0, z0, x1, z1, top, o = {}) => {
    const s = o.s || 'fwall';
    bx(x0, 0, z0, x1, top, z1, 'wall', s, o.color || '#ffffff', { pen: 0 });
    N.houses.push({ id: N.houses.length, x0, z0, x1, z1, top, y0: o.base ?? L1, s, color: o.color || '#ffffff', roof: o.roof || 'parapet', win: o.win ?? 1, door: o.door || null, lit: o.lit ?? 0.5 });
  };
  // a wall with openings (arched or square), both faces drawn with their own surfaces (as in the cinema)
  const wall = (alongX, f, t, a0, a1, y0, y1, ops, neg, pos, o = {}) => {
    const piece = (s0, s1, h0, h1) => {
      if (s1 - s0 < 0.01 || h1 - h0 < 0.01) return;
      const [x0, x1, z0, z1] = alongX ? [s0, s1, f - t / 2, f + t / 2] : [f - t / 2, f + t / 2, s0, s1];
      cb(x0, h0, z0, x1, h1, z1, 'wall', neg[0], { pen: o.pen ?? 0 });
      if (alongX) vs(x0, h0, z0, x1, h1, f, neg[0], neg[1]), vs(x0, h0, f, x1, h1, z1, pos[0], pos[1]);
      else vs(x0, h0, z0, f, h1, z1, neg[0], neg[1]), vs(f, h0, z0, x1, h1, z1, pos[0], pos[1]);
    };
    let s = a0;
    for (const op of [...ops].sort((p, q) => p.a0 - q.a0)) {
      piece(s, op.a0, y0, y1);
      piece(op.a0, op.a1, op.y1, y1);
      op.y0 > y0 + 0.01 && piece(op.a0, op.a1, y0, op.y0);
      s = op.a1;
      R.openings.push({ alongX, f, t, a: op.a0, w: op.a1 - op.a0, y0: op.y0, y1: op.y1, type: 'open', frame: op.frame || 'arch', out: 0, fill: [neg, pos], trim: 'ftrim' });
    }
    piece(s, a1, y0, y1);
  };
  // a platform (high ground / main level): stone retaining walls, a cobbled top
  const slab = (x0, z0, x1, z1, y, s = 'plat') => (cb(x0, 0, z0, x1, y, z1, 'floor', s), vs(x0, 0, z0, x1, y, z1, s, '#ffffff'));
  // a flight of steps (0.2 m rises) rising towards dir, footprint x0..x1 z0..z1, solid underneath
  const steps = (x0, z0, x1, z1, dir, y0, y1, s = 'fwall', color = '#efe6d6') => {
    const n = Math.max(1, Math.round((y1 - y0) / 0.2)),
      rise = (y1 - y0) / n,
      along = dir === 'N' || dir === 'S',
      len = along ? z1 - z0 : x1 - x0,
      tr = len / n;
    for (let i = 0; i < n; i++) {
      const top = y0 + rise * (i + 1),
        a = dir === 'S' || dir === 'E' ? i * tr : len - (i + 1) * tr,
        b = a + tr;
      const [sx0, sx1, sz0, sz1] = along ? [x0, x1, z0 + a, z0 + b] : [x0 + a, x0 + b, z0, z1];
      bx(sx0, 0, sz0, sx1, top, sz1, 'stair', s, color, { mat: 'concrete' });
    }
    N.stairs.push({ x0, z0, x1, z1, dir, y0, y1, n });
  };
  // a stone balustrade (stops people, not bullets)
  const rail = (x0, z0, x1, z1, y, h = 1.0) => {
    const t = 0.18;
    w.box(Math.min(x0, x1) - (x0 === x1 ? t : 0), y, Math.min(z0, z1) - (z0 === z1 ? t : 0), Math.max(x0, x1) + (x0 === x1 ? t : 0), y + h, Math.max(z0, z1) + (z0 === z1 ? t : 0), 'rail', { pen: 1.5, mat: 'concrete' });
    N.rails.push({ x0, z0, x1, z1, y, h });
  };
  // a crate (or a stack): 1.2 m wooden shipping crates, the classic cover
  const crate = (x, zz, y, s = 1.2, h = 1, ry = 0) => {
    cb(x - s / 2, y, zz - s / 2, x + s / 2, y + s * h, zz + s / 2, 'crate', 'crate', { pen: 1.4 });
    for (let k = 0; k < h; k++) N.crates.push({ x, y: y + s * k, z: zz, s, ry: ry + k * 0.18 });
  };
  const palm = (x, zz, y, bed = 1.6) => {
    bed && bx(x - bed / 2, y, zz - bed / 2, x + bed / 2, y + 0.6, zz + bed / 2, 'prop', 'fwall', '#e8dcc6', { pen: 3 });
    N.palms.push({ x, z: zz, y: y + (bed ? 0.6 : 0), bed });
  };
  // ---------------------------------------------------------------- the ramparts and the bounds
  for (const [x0, z0, x1, z1] of [[-1, -1, 0, D + 1], [W, -1, W + 1, D + 1], [-1, -1, W + 1, 0], [-1, D, W + 1, D + 1]]) w.box(x0, 0, z0, x1, 18, z1, 'wall', { mat: 'concrete' });
  for (const [x0, z0, x1, z1] of [[0, 0, 2, D], [W - 2, 0, W, D], [2, 0, W - 2, 2], [2, D - 2, W - 2, D]]) bx(x0, 0, z0, x1, 10, z1, 'wall', 'rampart', '#ffffff', { pen: 0 });
  N.merlons.push({ x0: 0, z0: 0, x1: W, z1: D, y: 10, t: 2 });
  // the south-east corner is rounded (the ring road curves round it): the rampart follows an arc, radius 18
  N.arc = { cx: 108, cz: 88, r: 18 };
  for (let x = 108; x < W - 2; x += 1) {
    const zx = 88 + Math.sqrt(Math.max(0, 18 * 18 - (x + 0.5 - 108) ** 2));
    zx < D - 2 && cb(x, 0, zx, x + 1, 10, D - 2, 'wall', 'rampart', { pen: 0 });
  }
  // turrets on the corners and along the walls (drawn; they stand on the ramparts)
  N.turrets.push({ x: 1.2, z: 106.8, r: 3.6, h: 13 }, { x: 54, z: 107, r: 3.0, h: 12 }, { x: 1, z: 60, r: 2.8, h: 12 }, { x: 127, z: 50, r: 2.8, h: 12 }, { x: 98, z: 107.2, r: 2.8, h: 12 });
  // ---------------------------------------------------------------- levels
  slab(2, 2, 84, 18, L2);
  slab(84, 2, 126, 24, L2);
  slab(2, 18, 126, 74, L1);
  // the lower level's ground: cobbles (T spawn, the Market), grassy cobbles (Lower Mid), setts (the road)
  vs(2, 0, 74, 52, 0.02, 106, 'cobble', '#e9e0d0');
  vs(52, 0, 74, 98, 0.02, 106, 'gcobble', '#ffffff');
  vs(98, 0, 74, 126, 0.02, 106, 'cobble', '#b8b0a4');
  // ---------------------------------------------------------------- high ground: CT Spawn, the Gallery, the Helipad, the tower
  house(44, 2, 84, 5.5, 13, { roof: 'terrace', base: L2 });
  house(44, 5.5, 53, 11, 10.5, { s: 'render', color: '#e8d2ad', roof: 'terrace', base: L2, door: 'S' });
  house(75, 5.5, 84, 11, 10.5, { s: 'render', color: '#e8d2ad', roof: 'terrace', base: L2, door: 'S' });
  // the Gallery: buildings along the north rampart, a walkway in front under an arcade over A
  house(14, 2, 44, 10.5, 12.2, { s: 'render', color: '#ead7b4', roof: 'terrace', base: L2 });
  N.arcade = { x0: 14, x1: 44, z: 17.6, y: L2, h: 4.2, bay: 3.75 };
  for (let x = 14; x <= 44.01; x += 3.75) {
    cb(x - 0.32, L2, 17.3, x + 0.32, L2 + 4.2, 17.9, 'wall', 'fwall', { pen: 0 });
    N.columns.push({ x, z: 17.6, y0: L2, y1: L2 + 4.2 });
  }
  cb(14, L2 + 4.2, 10.5, 44, L2 + 4.8, 18, 'roof', 'fwall');
  // its parapet between the columns (not over the stair)
  for (let x = 14; x < 44; x += 3.75) Math.abs(x - 29) > 0.01 && rail(x + 0.32, 17.6, x + 3.75 - 0.32, 17.6, L2, 0.95);
  // the NW tower (terracotta render, a clay roof): the Gallery's end
  house(2, 2, 14, 22, 15, { s: 'render', color: '#c7764f', roof: 'pitch', base: L1, lit: 0.5 });
  // CT Spawn's courtyard: balustrades on the edge over Mid either side of the grand stair
  rail(44, 18, 58, 18, L2);
  rail(70, 18, 84, 18, L2);
  // the Helipad and the lighthouse tower (NE)
  N.heli = { x: 100, z: 12, y: L2 };
  // the helicopter (modelled in 78-fortress-view.js): its body and tail boom are solid
  cb(97.2, L2, 11, 101.8, L2 + 2.5, 13, 'prop', 'paint', { pen: 2 });
  cb(101.8, L2 + 1.3, 11.7, 106.4, L2 + 2.2, 12.3, 'prop', 'paint', { pen: 2 });
  bx(93, L2, 5, 107, L2 + 0.05, 19, 'prop', 'paint', '#3a3f3a');
  N.tower = { x0: 116, z0: 2, x1: 126, z1: 14, top: 19 };
  house(116, 2, 126, 14, 19, { roof: 'battle', base: L2, lit: 0.6 });
  rail(84, 24, 100, 24, L2);
  rail(106, 24, 126, 24, L2);
  // gardens either side of the grand stair, at its foot (palms in raised beds)
  for (const [x0, x1] of [[52.5, 57.6], [70.4, 75.5]]) {
    bx(x0, L1, 18.2, x1, L1 + 0.7, 22.6, 'prop', 'fwall', '#e8dcc6', { pen: 3 });
    vs(x0 + 0.25, L1 + 0.7, 18.45, x1 - 0.25, L1 + 0.73, 22.35, 'gcobble', '#ffffff');
    N.palms.push({ x: (x0 + x1) / 2 - 1.2, z: 20.4, y: L1 + 0.73, bed: 0 }, { x: (x0 + x1) / 2 + 1.3, z: 21.2, y: L1 + 0.73, bed: 0 });
    N.ferns.push({ x: (x0 + x1) / 2, z: 19.4, y: L1 + 0.73 }, { x: x0 + 0.9, z: 21.8, y: L1 + 0.73 }, { x: x1 - 0.9, z: 19.2, y: L1 + 0.73 });
  }
  // stairs down from the high ground
  steps(58, 18, 70, 23.4, 'N', L1, L2);
  steps(29.45, 18, 32.3, 23.4, 'N', L1, L2);
  steps(100, 24, 106, 29.4, 'N', L1, L2);
  // ---------------------------------------------------------------- A side
  // A Long: the corridor down the west rampart; a hut halfway makes a choke; Long Doors into the site
  house(2, 50, 6.5, 58, 6.4, { s: 'render', color: '#dcc6a2', roof: 'terrace', base: L1, door: 'E' });
  wall(!1, 13, 2, 22, 46, L1, L1 + 4.6, [{ a0: 28, a1: 33.5, y0: L1, y1: L1 + 3.4 }], ['fwall', '#ffffff'], ['fwall', '#ffffff']);
  house(12, 46, 26, 74, 9.4, { s: 'render', color: '#e2cba5', roof: 'terrace' });
  // A Site: flagstones, crates, barrels; enclosed south by a wall with A Main's arch
  vs(14, L1, 22, 42, L1 + 0.03, 44, 'flags', '#d9b48c');
  wall(!0, 45, 2, 14, 42, L1, L1 + 4.6, [{ a0: 34, a1: 40, y0: L1, y1: L1 + 3.6 }], ['fwall', '#ffffff'], ['fwall', '#ffffff']);
  // A Main: a dog-leg from the Market stair (x 26-34) north, then east to the arch (x 34-40)
  house(34, 56, 42, 74, 8.2, { s: 'render', color: '#e6d0aa', roof: 'terrace', door: 'W' });
  // the wall between A and the Mid connector, with A Short's arch
  wall(!1, 43, 2, 18, 36, L1, L1 + 4.6, [{ a0: 27, a1: 33, y0: L1, y1: L1 + 3.4 }], ['fwall', '#ffffff'], ['fwall', '#ffffff']);
  house(42, 36, 52, 74, 9.4, { roof: 'terrace', door: 'E' });
  // cover on A: crate stacks, a cart of barrels, a low wall
  for (const [x, zz, h] of [[22, 30, 2], [23.2, 30, 1], [33, 26.5, 1], [34.2, 26.5, 2], [36.5, 38.5, 1], [19, 39, 1], [28, 35.5, 2]]) crate(x, zz, L1, 1.2, h);
  for (const [x, zz] of [[38.6, 24.2], [39.4, 25], [17, 24]]) model('barrel_03', x, L1, zz, 0, 1, { box: [x, zz, 0.32, 0.32, 0.95] });
  bx(24, L1, 41.4, 30, L1 + 1.1, 42.2, 'wall', 'fwall', '#efe2c8', { pen: 2.5 });
  // A Long's cover: crates by the hut and at the doors
  for (const [x, zz, h] of [[8.5, 62, 1], [9.7, 62, 2], [5, 38, 1], [10.6, 27, 1]]) crate(x, zz, L1, 1.2, h);
  // the corrugated shed over A Ramp (the dog-leg's corner), on posts
  N.sheds.push({ x0: 26.4, z0: 46.6, x1: 41.6, z1: 55.6, y: L1, h: 4.0 });
  for (const [x, zz] of [[26.7, 46.9], [41.3, 46.9], [26.7, 55.3], [41.3, 55.3]]) cb(x - 0.12, L1, zz - 0.12, x + 0.12, L1 + 4.0, zz + 0.12, 'prop', 'paint', { pen: 2 });
  // A Main's cover
  crate(30.5, 52, L1, 1.2, 1);
  crate(28, 60, L1, 1.2, 1);
  // ---------------------------------------------------------------- Mid
  vs(44, L1, 18, 78, L1 + 0.02, 48, 'cobble', '#ffffff');
  N.fountain = { x: 64, z: 34, y: L1, r: 3.6 };
  // its basin's collision: an octagon from three boxes (0.8 m high: you can jump on it)
  for (const [hx, hz] of [[3.6, 1.5], [1.5, 3.6], [2.6, 2.6]]) cb(64 - hx, L1, 34 - hz, 64 + hx, L1 + 0.8, 34 + hz, 'prop', 'fwall', { pen: 4 });
  cb(63.5, L1, 33.5, 64.5, L1 + 3.2, 34.5, 'prop', 'fwall', { pen: 4 });
  for (const [x, zz] of [[55, 27.5], [74.5, 27.5], [55, 45], [74.5, 45]]) palm(x, zz, L1);
  for (const [x, zz, h] of [[57.5, 41, 1], [70, 28, 1], [71.2, 28, 2]]) crate(x, zz, L1, 1.2, h);
  // the Mid Gate: a building across the square's south side, three arches (the middle one open)
  house(44, 48, 60, 60, 10.4, { roof: 'battle' });
  house(68, 48, 80, 60, 10.4, { roof: 'battle' });
  cb(60, L1 + 4.4, 48, 68, 10.4, 60, 'wall', 'fwall', { pen: 0 });
  vs(60, L1 + 4.4, 48, 68, 10.4, 60, 'fwall', '#ffffff');
  for (const zf of [48.2, 59.8]) R.openings.push({ alongX: !0, f: zf, t: 0.4, a: 60, w: 8, y0: L1, y1: L1 + 4.4, type: 'open', frame: 'arch', out: 0, fill: [['fwall', '#ffffff'], ['fwall', '#ffffff']], trim: 'ftrim' });
  for (const [a0, a1] of [[52.8, 59.2], [68.8, 75.2]]) for (const zf of [48, 60]) N.blind.push({ alongX: !0, f: zf, a: a0, w: a1 - a0, y0: L1 + 0.6, y1: L1 + 4.0, side: zf === 48 ? -1 : 1 });
  vs(60, L1, 48, 68, L1 + 0.02, 60, 'flags', '#e2c4a0');
  // the gate terrace, a balustrade along its edge over Lower Mid (open at the grand stair)
  vs(52, L1, 60, 78, L1 + 0.02, 74, 'flags', '#e6caa6');
  rail(52, 73.8, 58, 73.8, L1);
  rail(70, 73.8, 78, 73.8, L1);
  for (const [x, zz] of [[55, 64], [75, 64]]) palm(x, zz, L1);
  // ---------------------------------------------------------------- B side
  // Mid's east passage to B (x 78-88, z 26-36); the sheds north of it; the block south of it
  house(78, 18, 84, 26, 7.4, { s: 'render', color: '#e4cda6', roof: 'terrace' });
  house(78, 36, 88, 74, 9.4, { s: 'render', color: '#dcc29b', roof: 'terrace', door: 'E' });
  vs(78, L1, 26, 88, L1 + 0.02, 36, 'cobble', '#ffffff');
  // B Site
  vs(88, L1, 24, 114, L1 + 0.03, 64, 'flags', '#d9b48c');
  N.sheds.push({ x0: 89, z0: 29, x1: 97, z1: 36, y: L1, h: 3.6 });
  bx(89, L1, 35.4, 97, L1 + 1.2, 36, 'wall', 'fwall', '#efe2c8', { pen: 2.5 });
  for (const [x, zz] of [[89.3, 29.3], [96.7, 29.3], [89.3, 35.7], [96.7, 35.7]]) cb(x - 0.12, L1, zz - 0.12, x + 0.12, L1 + 3.6, zz + 0.12, 'prop', 'paint', { pen: 2 });
  for (const [x, zz, h] of [[92, 32.5, 1], [93.2, 32.5, 2], [104, 42, 2], [105.2, 42, 1], [99, 52, 1], [110.5, 57, 2], [109.3, 57, 1], [96, 60, 1]]) crate(x, zz, L1, 1.2, h);
  for (const [x, zz] of [[111.8, 30], [112.4, 30.8], [90.5, 47]]) model('barrel_03', x, L1, zz, 0, 1, { box: [x, zz, 0.32, 0.32, 0.95] });
  // a timber pergola along B's north side under the Helipad (vines on the beams), and on B Long
  N.pergolas.push({ x0: 88.4, z0: 24.3, x1: 99.6, z1: 27.4, y: L1, h: 3.2 }, { x0: 116.3, z0: 28, x1: 119.2, z1: 42, y: L1, h: 3.2 });
  for (const [x, zz] of [[88.7, 27.1], [94.2, 27.1], [99.3, 27.1], [118.9, 28.3], [118.9, 35], [118.9, 41.7]]) cb(x - 0.12, L1, zz - 0.12, x + 0.12, L1 + 3.2, zz + 0.12, 'prop', 'crate', { pen: 2 });
  palm(112.5, 25.8, L1);
  palm(89.5, 62.4, L1, 1.4);
  // the wall between B and B Long, with the arch
  wall(!1, 115, 2, 24, 74, L1, L1 + 4.6, [{ a0: 44, a1: 50.5, y0: L1, y1: L1 + 3.6 }], ['fwall', '#ffffff'], ['fwall', '#ffffff']);
  for (const [x, zz, h] of [[121, 36, 1], [119.8, 58, 2], [121, 58, 1], [123.5, 68, 1]]) crate(x, zz, L1, 1.2, h);
  // the Garden (B lower): grassy cobbles, palms, a fruit-market shed
  vs(88, L1, 64, 114, L1 + 0.02, 74, 'gcobble', '#ffffff');
  N.sheds.push({ x0: 99, z0: 66, x1: 110, z1: 72, y: L1, h: 3.4 });
  for (const [x, zz] of [[99.3, 66.3], [109.7, 66.3], [99.3, 71.7], [109.7, 71.7]]) cb(x - 0.12, L1, zz - 0.12, x + 0.12, L1 + 3.4, zz + 0.12, 'prop', 'paint', { pen: 2 });
  for (const [x, zz, h] of [[102, 69, 1], [106.5, 68.5, 1], [107.7, 68.5, 1]]) crate(x, zz, L1, 1.2, h);
  for (const [x, zz] of [[91, 67], [112, 66]]) palm(x, zz, L1);
  N.trees.push({ id: 'island_tree_01', x: 95.5, z: 70.5, y: L1, s: 1.15, r: 0.7 });
  bx(94.6, L1, 69.6, 96.4, L1 + 0.5, 71.4, 'prop', 'fwall', '#e8dcc6', { pen: 3 });
  rail(97, 73.8, 114, 73.8, L1);
  // ---------------------------------------------------------------- the lower level
  // the stairs up to the main level
  steps(2, 74, 12, 78.4, 'N', L0, L1);
  steps(26, 74, 34, 78.4, 'N', L0, L1);
  steps(58, 74, 70, 78.4, 'N', L0, L1);
  steps(88, 74, 97, 78.4, 'N', L0, L1);
  // a planter along the stair's west side, in the corner with the house: bots walking in from Lower Mid went
  // straight for the stair's side there and stuck; now the way up is round to its foot
  bx(84.6, L0, 74, 88, L0 + 0.85, 78.4, 'prop', 'gcobble', '#ffffff', { pen: 2 });
  N.ferns.push({ x: 85.6, z: 75.4, y: L0 + 0.86 }, { x: 87, z: 77.2, y: L0 + 0.86 });
  // the Market: a long corrugated roof on posts over the A Main stair and the stalls
  N.sheds.push({ x0: 21, z0: 69, x1: 48, z1: 83, y: L0, h: 6.4, roofOnly: 1, market: 1 });
  for (const [x, zz] of [[21.3, 79], [21.3, 83], [35, 83], [48, 83], [48, 79]]) cb(x - 0.15, 0, zz - 0.15, x + 0.15, 6.4, zz + 0.15, 'prop', 'paint', { pen: 2 });
  for (const [x, zz] of [[40, 80.5], [44.5, 80.5], [23.5, 80.5]]) bx(x - 1.4, 0, zz - 0.55, x + 1.4, 1.0, zz + 0.55, 'prop', 'crate', '#ffffff', { pen: 1.5 });
  // T Spawn: walled courtyard; crates, a cart, a well
  for (const [x, zz, h] of [[8, 86, 2], [9.2, 86, 1], [45, 92, 1], [46.2, 92, 2], [16, 104, 1], [30, 88, 1]]) crate(x, zz, L0, 1.2, h);
  for (const [x, zz] of [[47.5, 102], [14, 88.5]]) palm(x, zz, L0, 1.4);
  palm(16.2, 42.4, L1, 1.3);
  palm(40.3, 23.6, L1, 1.3);
  palm(4.2, 71.2, L1, 1.2);
  for (const [x, y, zz] of [[13.2, L1, 59], [11.6, L1, 45.4], [44.6, L1, 37.2], [60, L1, 47.4], [68, L1, 47.4], [87.4, L1, 37.2], [113.2, L1, 52.2], [52.6, 0, 86.4], [52.6, 0, 95.6], [26, L2, 11.2], [36, L2, 11.2]]) N.pots.push({ x, y, z: zz });
  house(2, 96, 12, 106, 7.2, { s: 'render', color: '#d8bd96', roof: 'terrace', base: L0, door: 'E' });
  house(40, 98, 52, 106, 6.8, { s: 'render', color: '#c9ad86', roof: 'terrace', base: L0, door: 'N' });
  // the wall between T Spawn and Lower Mid, its gate
  wall(!1, 54, 2.4, 74, 106, L0, 6.2, [{ a0: 87, a1: 95, y0: L0, y1: 4.0 }], ['fwall', '#ffffff'], ['fwall', '#ffffff']);
  // Lower Mid: a garden bed of palms (cover), crates
  bx(62, 0, 88, 74, 0.9, 98, 'prop', 'fwall', '#e6d8c0', { pen: 3 });
  vs(62.3, 0.9, 88.3, 73.7, 0.93, 97.7, 'grass', '#ffffff');
  for (const [x, zz] of [[64.5, 90.5], [71.5, 95.5]]) N.palms.push({ x, z: zz, y: 0.93, bed: 0 });
  N.trees.push({ id: 'island_tree_02', x: 68, z: 93, y: 0.93, s: 1.5, r: 2.1 });
  for (const [x, zz] of [[63.4, 96.4], [72.8, 89.4], [66, 89.2]]) N.ferns.push({ x, z: zz, y: 0.93 });
  for (const [x, zz, h] of [[80, 84, 1], [81.2, 84, 2], [58.5, 101, 1], [88, 99, 1]]) crate(x, zz, L0, 1.2, h);
  // the wall between Lower Mid and the road; the block over the tunnel's west side
  wall(!1, 97, 2, 74, 106, L0, 6.2, [{ a0: 96, a1: 104, y0: L0, y1: 4.0 }], ['fwall', '#ffffff'], ['fwall', '#ffffff']);
  house(98, 74, 116, 92, 8.6, { s: 'fwall', roof: 'battle', base: L0 });
  // the ring road and the Tunnel up to B Long
  steps(116, 74, 126, 84, 'N', L0, L1, 'cobble', '#cfc6b8');
  cb(116, 5.8, 74, 126, 7.2, 92, 'roof', 'fwall');
  vs(116, 5.8, 74, 126, 7.2, 92, 'fwall', '#ffffff');
  R.openings.push({ alongX: !0, f: 91.8, t: 0.4, a: 116.2, w: 9.6, y0: L0, y1: 5.8, type: 'open', frame: 'arch', out: 0, fill: [['rampart', '#ffffff'], ['fwall', '#ffffff']], trim: 'ftrim' });
  for (const [x, zz] of [[104, 102], [112, 96]]) crate(x, zz, L0, 1.2, 1);
  // ---------------------------------------------------------------- lights (lanterns on the walls; a few that light the game)
  for (const [x, y, zz, hi] of [
    [64, 8.6, 5.7, 1], [49, 8.6, 11.2, 0], [79, 8.6, 11.2, 0], [20, 8.4, 10.7, 0], [38, 8.4, 10.7, 0],
    [14.2, 5.6, 30, 1], [41.8, 5.4, 26, 0], [36.5, 5.6, 45.8, 0], [61, 5.6, 47.7, 1], [61, 5.6, 60.3, 0],
    [87.8, 5.6, 40, 1], [114.2, 5.6, 47, 0], [114.2, 5.6, 60, 0], [53.8, 3.6, 91, 1], [96.8, 3.6, 100, 0],
    [121, 5.0, 91.5, 1], [30, 5.4, 82.6, 1], [12.2, 5.6, 64, 0], [101, 7.8, 24.3, 0], [26, 5.4, 46.2, 0],
  ]) lamp(x, y, zz, 'lantern', !!hi);
  for (const [x, zz] of [[93, 5], [107, 5], [93, 19], [107, 19]]) lamp(x, L2 + 0.2, zz, 'heli');
  lamp(121, 20.2, 8, 'beacon', !0);
  for (const [x, zz, hi] of [[53, 72.6, 1], [77, 72.6, 0], [95, 80, 0], [104, 96.5, 1], [113, 101, 0], [73, 77, 0]]) {
    const y = zz < 74 ? L1 : 0;
    model('street_lamp_02', x, y, zz, 0, 2.6, { box: [x, zz, 0.15, 0.15, 4.4] });
    lamp(x, y + 4.1, zz, 'post', !!hi);
  }
  // ---------------------------------------------------------------- objectives and spawns
  A.spawns.T = [[12, 92], [16, 95], [20, 92], [24, 97], [28, 93], [32, 98], [36, 94], [40, 92], [20, 101], [30, 102]].map(([x, zz]) => z(x, L0, zz));
  A.spawns.CT = [[56, 8], [60, 8], [64, 8], [68, 8], [72, 8], [57, 13], [61, 13], [65, 13], [69, 13], [73, 13]].map(([x, zz]) => z(x, L2, zz));
  A.spawnZones = { T: { min: z(10, L0, 90), max: z(42, L0, 104) }, CT: { min: z(54, L2, 6), max: z(76, L2, 16) } };
  A.spawnFaceCenter = !0;
  A.sites = [
    {
      name: 'A',
      min: z(16, L1 - 0.5, 23),
      max: z(40, L1 + 0.75, 43),
      stage: [z(31, L1, 50), z(7, L1, 40), z(48, L1, 30)],
      watch: [z(30, L2 + 1.3, 15.5), z(22, L1 + 1.3, 26), z(46, L1 + 1.3, 30)],
      hold: [z(23, L1, 31), z(34, L1, 28), z(20, L1, 40)],
    },
    {
      name: 'B',
      min: z(90, L1 - 0.5, 30),
      max: z(112, L1 + 0.75, 62),
      stage: [z(91, L1, 70), z(121, L1, 47), z(83, L1, 31)],
      watch: [z(103, L2 + 1.3, 22), z(94, L1 + 1.3, 33), z(110, L1 + 1.3, 58)],
      hold: [z(103, L1, 44), z(97, L1, 55), z(108, L1, 38)],
    },
  ];
  A.flagPoints = [
    { name: 'A', pos: z(28, L1, 33) },
    { name: 'B', pos: z(61, L1, 30) },
    { name: 'C', pos: z(100, L1, 46) },
  ];
  A.tdmSpawns = [
    [64, 10], [30, 14], [100, 14], [7, 40], [28, 30], [61, 42], [61, 66], [84, 31], [100, 48], [121, 40],
    [100, 70], [8, 66], [30, 64], [64, 82], [80, 96], [110, 100], [104, 98], [30, 96], [10, 90], [48, 26],
  ].map(([x, zz]) => z(x, zz < 18 || (x > 84 && zz < 24) ? L2 : zz < 74 ? L1 : L0, zz));
  A.poi = A.tdmSpawns.slice();
  for (const [name, x0, z0, x1, z1, y0, y1] of [
    ['CT Spawn', 44, 2, 84, 18, 5, 12], ['Helipad', 84, 2, 116, 24, 5, 12], ['Lighthouse', 116, 2, 126, 24, 5, 20], ['Gallery', 14, 10, 44, 18, 5, 11],
    ['NW Tower', 2, 2, 14, 22, 0, 16], ['A Long', 2, 22, 13, 74, 2, 8], ['Long Doors', 9, 26, 15, 35, 2, 8], ['A Site', 14, 22, 42, 45, 2, 5.5],
    ['A Main', 26, 46, 42, 74, 2, 8], ['A Short', 42, 22, 52, 36, 2, 8], ['Mid', 44, 18, 78, 48, 2, 5.5], ['Fountain', 56, 31, 66, 40, 2, 5.5],
    ['Mid Gate', 44, 48, 80, 60, 2, 8], ['Terrace', 52, 60, 78, 74, 2, 8], ['B Passage', 78, 26, 88, 36, 2, 8], ['B Site', 88, 24, 114, 64, 2, 5.5],
    ['B Long', 115, 24, 126, 74, 2, 8], ['Garden', 88, 64, 114, 74, 2, 8], ['Market', 21, 69, 48, 84, 0, 7], ['T Spawn', 2, 84, 54, 106, 0, 7],
    ['Lower Mid', 54, 74, 97, 106, 0, 7], ['Ring Road', 97, 92, 126, 106, 0, 7], ['Tunnel', 116, 74, 126, 92, 0, 7],
  ])
    A.areas.push({ name, min: z(x0, y0, z0), max: z(x1, y1, z1) });
  A.areas.push({ name: 'Bombsite A', min: A.sites[0].min, max: A.sites[0].max }, { name: 'Bombsite B', min: A.sites[1].min, max: A.sites[1].max });
  // every visual is drawn by the kit; the core's flat boxes are skipped
  for (const v of A.visuals) v.__hidden = 1;
  A.__veg = [];
  return A;
}
XE.fortress = __fortressBuild;
BD.splice(Math.max(0, BD.findIndex((x) => x.id === 'cinema')), 0, {
  id: 'fortress',
  name: 'Fortress',
  blurb:
    'A sandstone citadel on a jungle island, ringed by ramparts over the sea. CT hold the high ground by the helipad and the lighthouse; T come up from the market. A Long down the west rampart, Mid round the fountain and under the gate, B through the garden or the tunnel.',
  size: 'Large',
  maxPlayers: 20,
});
// no generated skyline round the island
{
  const coreSky = PiA;
  PiA = function () {
    return aw().id === 'fortress' ? [] : coreSky.apply(this, arguments);
  };
}
