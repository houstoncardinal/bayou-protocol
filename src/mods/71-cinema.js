/* ===== Bayou Protocol mod: Bayou Palace Cinemas (a movie-palace multiplex) ===== */
// A 1930s art-deco movie palace on a city block, grown into a six-screen multiplex, built at real scale
// (metres; x east, z south). Every screen plays its own film: what plays is set in the /admin dashboard
// (70-screens.js reads it), and every player in a room sees the same frame.
//
//   North   the street and the plaza, the box office, the marquee and the PALACE blade sign (Terrorists arrive
//           here); east of the gardens, the palace's own parking lot behind iron railings (seen, not reached)
//   Middle  the Grand Lobby (marble, chandeliers, the concession stand, a mezzanine reached by two stairs),
//           the West Hall (arcade) and the Velvet Room (theater 5: an ultra-wide curved screen round leather
//           recliners), the East Hall and the Starlight (theater 6: a 360° sphere, reached down a short hallway)
//           the Promenade: the carpeted hall along the auditoriums' fronts (its width the golden ratio of its
//           height)
//   South   Theaters 1-4, "Palace XL": 36.75 m wide, a flat screen wall to wall (36 x 20.2 m, 16:9), 18 rows
//           of stadium seating rising 8.1 m; the ceiling at the golden ratio of the width (22.2 m). You enter at
//           the front through fire exits from the three service corridors between them, or at the top from the
//           projection level
//           the projection level over the back of the theaters (projectors, ports looking at the screens),
//           reached by steel stairs from the yard
//   Back    the loading dock and staff lot (Counter-Terrorists start here)
// The auditorium block (x 4-165) is wider than the street front (x 4-116), as a multiplex's is: it runs on east
// behind the parking lot.
// Bomb Defusal: A is the front of Theater 2 (the stage and the pit), B the front of Theater 3. Counter-
// Terrorists reach both from the top (the projection level) or the fire exits; Terrorists through the
// corridors' fire exits.
//
// Drawing: this map uses the prison's drawing pipeline (65-prison-view.js) with its own kit (72-cinema-view.js):
// every box visual names a surface and is drawn with Poly Haven materials; the light volume gives each room its
// own light; what is not a box (seats, curtains, the screens' frames, chandeliers, the marquee, posters, the
// concession stand, projectors) is recorded in A.__cn and modelled by 72-cinema-view.js inside its collision.
// The golden ratio (φ = 1.618) sets real proportions, not only ornament: see docs/maps/cinema.md.
const __PHI = (1 + Math.sqrt(5)) / 2;
// the Palace XL block: four auditoriums 36.75 m wide (1.5 x the old 24.5), side by side from x 4, the service
// corridors between them (4, 6 and 4 m)
const __CN_XL = { x0: 4, w: 36.75, gaps: [4, 6, 4] };
const __CN_TH = [
  { id: 't1', n: 1, seat: '#8a1c26', wall: '#4b1519', trim: '#c9a45a', name: 'Crimson' },
  { id: 't2', n: 2, seat: '#24427f', wall: '#18233f', trim: '#c9a45a', name: 'Royal' },
  { id: 't3', n: 3, seat: '#1e604a', wall: '#13342b', trim: '#d8b46a', name: 'Emerald' },
  { id: 't4', n: 4, seat: '#61306f', wall: '#2c1636', trim: '#c9a45a', name: 'Plum' },
].map((T, i) => {
  let a = __CN_XL.x0;
  for (let k = 0; k < i; k++) a += __CN_XL.w + __CN_XL.gaps[k];
  return { ...T, a, b: a + __CN_XL.w };
});
// the auditoriums' section (z): the Promenade 46.4-54.2 (7.8 m wide = its 4.8 m height x φ), the screen wall at
// 54.2, the stage to 58.1, the pit to 66.2, 18 rows of 1.8 m rising 0.45 m each to 98.6, the cross-aisle and the
// rear wall (101.8), the projection level (102.2-106.8) at 8.22 m, the yard behind to the back fence
const __CN = (() => {
  const P1 = 54.2,
    R0 = P1 + 12,
    ROW = 1.8,
    RISE = 0.45,
    NROW = 18,
    XA = R0 + ROW * NROW,
    BACK = XA + 3.2,
    FLY = 0.12 + RISE * NROW,
    PJ = BACK + 5,
    W = __CN_TH[3].b + 4;
  // HT: the auditoriums' height, their width / φ
  return { FAC: 26, P0: 46, P1, STAGE: P1 + 3.9, R0, ROW, RISE, NROW, XA, BACK, PJ, FLY, CEIL: 11.5, HT: +((__CN_XL.w - 0.8) / __PHI).toFixed(2), W, D: Math.ceil(PJ + 19) };
})();
const __CN_PHYS = (s) => (/paint|plate|stainless|dark|gold|black/.test(s) ? 'metal' : /wood|woodp|parquet/.test(s) ? 'wood' : /grass/.test(s) ? 'dirt' : 'concrete');
function __cinemaBuild() {
  const w = new Po(),
    A = w.m,
    W = __CN.W,
    D = __CN.D;
  A.id = 'cinema';
  A.name = 'Bayou Palace Cinemas';
  A.w = W;
  A.d = D;
  // (no generated city backdrop: its block towers looked fake; the street's own buildings close the view)
  A.backdrop = 'none';
  A.physProps = [];
  A.__view = __PR_KITS.cinema;
  const { FAC, P0, P1, STAGE, R0, ROW, RISE, NROW, XA, BACK, PJ, FLY, HT } = __CN;
  const C = {
    stucco: '#e9dcc4', // the facade: warm cream stucco
    stuccoDk: '#c9b391',
    plaster: '#d9cdb4',
    lobbyWall: '#e6d8bc',
    wood: '#ffffff',
    gold: '#c9a45a',
    carpet: '#7a1f2a', // burgundy
    carpetBlue: '#24305a',
    marble: '#f1ece2',
    marbleDk: '#3a3633',
    black: '#0b0b0d',
    ceil: '#2a2522',
    concrete: '#b8b2a8',
    brick: '#ffffff',
    road: '#ffffff',
    steel: '#4a5257',
  };
  const R = (A.__pr = { lamps: [], models: [], signs: [], decals: [], lines: [], rails: [], stairs: [], openings: [], cams: [], items: [], poles: [], pipes: [], planters: [], beacons: [], fires: [], bars: [], fences: [], wire: [], tables: [], cells: [], shu: [], towers: [], hoops: [], benches: [], bleachers: [], gallery: [], arches: [], rubble: [], pilasters: [], turrets: [], vault: null });
  const N = (A.__cn = { th: [], seats: [], steps: [], curtains: [], signs: [], beams: [], items: [], posters: [], columns: [], rails: [], stairs: [], bulbs: [], panels: [], ports: [], neighbours: [], rowSigns: [], ledLines: [], consoles: [], exitDrapes: [], facades: [], sacred: [], cars: [] });
  // ---------------------------------------------------------------- helpers
  const vs = (x0, y0, z0, x1, y1, z1, s, color) => {
    const n = A.visuals.length;
    w.vis(x0, y0, z0, x1, y1, z1, 'concrete', color);
    n < A.visuals.length && (A.visuals[n].s = s);
  };
  const cb = (x0, y0, z0, x1, y1, z1, kind, s, o = {}) => w.box(x0, y0, z0, x1, y1, z1, kind, { mat: __CN_PHYS(s), ...o });
  const bx = (x0, y0, z0, x1, y1, z1, kind, s, color, o = {}) => (vs(x0, y0, z0, x1, y1, z1, s, color), cb(x0, y0, z0, x1, y1, z1, kind, s, o));
  // a light: the game's lamp (59-lights.js, `hi`) and the light volume's (k: chand, can, sconce, cove, aisle,
  // neon, marquee, flood, booth, bar, tube)
  const lamp = (x, y, zz, k, hi = !1, interior = !0) => {
    hi && A.lights.push({ pos: z(x, y, zz), interior });
    R.lamps.push({ x, y, z: zz, k });
  };
  const model = (id, x, y, zz, ry = 0, s = 1, o = {}) => {
    if (o.box) {
      const [bx0, bz0, hw, hd, h] = o.box,
        sw = Math.abs(Math.sin(ry)) > 0.5;
      cb(bx0 - (sw ? hd : hw), y, bz0 - (sw ? hw : hd), bx0 + (sw ? hd : hw), y + h, bz0 + (sw ? hw : hd), 'prop', 'wood', { pen: 3 });
    }
    R.models.push({ id, x, y, z: zz, ry, s, ...o });
  };
  const item = (k, o) => N.items.push({ k, ...o });
  const sign = (k, x, y, zz, ry, wd, ht, o = {}) => N.signs.push({ k, x, y, z: zz, ry, w: wd, h: ht, ...o });
  // the palace's ornament: sacred geometry (the Flower and Seed of Life, Metatron's Cube, the Sri Yantra, the
  // golden spiral, the Vesica Piscis) in brass, gilt, glass and light, and the mouldings round it; all visual,
  // drawn by 72b-cinema-sacred.js
  const sg = (k, o) => N.sacred.push({ k, ...o });
  // a parked car (Poly Haven's covered car, 4.4 x 1.8 m, its cover tinted by c: [r, g, b] over the dark grey
  // cloth), solid
  const car = (x, zz, ry, c, y = 0) => {
    const sw = Math.abs(Math.sin(ry)) > 0.5,
      hw = sw ? 2.2 : 0.92,
      hd = sw ? 0.92 : 2.2;
    cb(x - hw, y, zz - hd, x + hw, y + 1.38, zz + hd, 'prop', 'paint', { pen: 3, mat: 'metal' });
    N.cars.push({ x, y, z: zz, ry, c });
  };
  // a wall along x (alongX, at z = f) or along z (at x = f), t thick, from a0 to a1, y0 to y1. Its two faces are
  // drawn with their own surfaces: neg faces -z (or -x), pos faces +z (or +x). Openings: { a0, a1, y0, y1, type:
  // 'open' | 'door' | 'window', swing, leaf (door colour), frame ('deco' | 'steel' | 'none') }
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
      piece(op.a0, op.a1, y0, op.y0);
      piece(op.a0, op.a1, op.y1, y1);
      s = op.a1;
      const ow = op.a1 - op.a0,
        oh = op.y1 - op.y0;
      if (op.type === 'window') alongX ? w.pane(op.a0, op.y0, f - 0.02, op.a1, op.y1, f + 0.02) : w.pane(f - 0.02, op.y0, op.a0, f + 0.02, op.y1, op.a1);
      if (op.type === 'door') w.door(alongX, op.a0 + 0.03, f, op.y0, ow - 0.06, oh - 0.02, op.swing ?? 1, op.leaf || '#7a5236');
      // a threshold to stand on (the walk grid never stands on a wall's top, so a sill under a doorway would
      // cut the rooms apart for the bots), as the core's walls have
      if ((op.type === 'door' || op.type === 'open') && op.y0 > 0.01) {
        const tt = t / 2 + 0.05;
        alongX ? cb(op.a0, op.y0 - 0.2, f - tt, op.a1, op.y0, f + tt, 'floor', 'marble') : cb(f - tt, op.y0 - 0.2, op.a0, f + tt, op.y0, op.a1, 'floor', 'marble');
      }
      (op.type === 'door' || op.type === 'open') && R.openings.push({ alongX, f, t, a: op.a0, w: ow, y0: op.y0, y1: op.y1, type: op.type, frame: op.frame || 'deco', out: 0, fill: [neg, pos] });
    }
    piece(s, a1, y0, y1);
  };
  // a slab (floor or roof) with its top and underside drawn with their own surfaces
  const slab = (x0, z0, x1, z1, y, th, top, under, kind = 'floor') => {
    cb(x0, y - th, z0, x1, y, z1, kind, top[0]);
    vs(x0, y - Math.min(0.06, th / 2), z0, x1, y, z1, top[0], top[1]);
    vs(x0, y - th, z0, x1, y - Math.min(0.06, th / 2), z1, under[0], under[1]);
  };
  // a straight flight of steps (0.2 m rises) going `dir` from (x0, z0)-(x1, z1) footprint, y0 to y1
  const steps = (x0, z0, x1, z1, dir, y0, y1, s, color, o = {}) => {
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
      bx(sx0, o.solid ? 0 : top - rise - 0.02, sz0, sx1, top, sz1, 'stair', s, color, { mat: 'wood' });
    }
    N.stairs.push({ x0, z0, x1, z1, dir, y0, y1, n, s, color, rail: o.rail });
  };
  // a brass rail (collision: a thin box, stops people, not bullets)
  const rail = (x0, z0, x1, z1, y, h = 1.0, o = {}) => {
    const s0 = Math.min(x0, x1) - (x0 === x1 ? 0.04 : 0),
      s1 = Math.max(x0, x1) + (x0 === x1 ? 0.04 : 0),
      o0 = Math.min(z0, z1) - (z0 === z1 ? 0.04 : 0),
      o1 = Math.max(z0, z1) + (z0 === z1 ? 0.04 : 0);
    // a stair's rail follows its slope (drawn only: the stair's own side stops nobody falling far)
    o.stair || w.box(s0, y, o0, s1, y + h, o1, 'rail', { pen: 1, mat: 'metal' });
    N.rails.push({ x0, z0, x1, z1, y, h, glass: !!o.glass, posts: o.posts ?? 1.2, stair: o.stair || null });
  };
  // ---------------------------------------------------------------- the city block round the site
  // bounds (every map has them: 14 m, unseen)
  for (const [x0, z0, x1, z1] of [[-1, -1, 0, D + 1], [W, -1, W + 1, D + 1], [-1, -1, W + 1, 0], [-1, D, W + 1, D + 1]]) w.box(x0, 0, z0, x1, 16, z1, 'wall', { mat: 'concrete' });
  // ground
  // the ground under everything, open under the Starlight (its sphere goes on below the floor)
  for (const [x0, z0, x1, z1] of [[-40, -40, W + 40, 26], [-40, 46, W + 40, D + 40], [-40, 26, 90, 46], [116, 26, W + 40, 46]]) vs(x0, -0.2, z0, x1, 0, z1, 'concrete', '#a7a196');
  // across the street (seen, never reached): a far pavement with a café's tables, then a row of four- to six-
  // storey brick and stucco buildings, each with shopfronts and awnings at street level and real windows above
  // (72-cinema-view.js models them: recessed frames, stone sills, reflective glass, cornices)
  vs(-40, 0.004, -5.2, W + 40, 0.15, -1, 'walk', '#cfc9bd');
  vs(-40, 0, -1.2, W + 40, 0.16, -1, 'granite', '#bdb6aa');
  const FB = [
    [-30, -4, 15.5, 'brick', '#ffffff', 'Hotel Bienville'],
    [-4, 17, 12.6, 'stucco', '#e6d6bb', 'Café Lafitte'],
    [17, 33, 18.2, 'brick', '#e9dccb', 'Books & Records'],
    [33, 52, 12.6, 'stucco', '#d9c7a8', 'Pharmacy'],
    [52, 68, 15.5, 'brick', '#ffffff', 'Oyster Bar'],
    [68, 87, 12.6, 'stucco', '#e8dcc2', 'Florist'],
    [87, 104, 18.2, 'brick', '#e9dccb', 'Jazz Club'],
    [104, 124, 15.5, 'stucco', '#d7c5a6', 'Deli'],
    [124, 150, 12.6, 'brick', '#ffffff', 'Hardware'],
    [150, 172, 18.2, 'stucco', '#e2d2b6', 'Bakery'],
    [172, 200, 12.6, 'brick', '#e9dccb', ''],
  ];
  for (const [x0, x1, h, sf, col, shop] of FB) {
    vs(x0, 0, -22, x1, h, -5.2, sf, col);
    N.facades.push({ x0, x1, z: -5.2, h, shop, sf });
  }
  // café tables on the far pavement
  for (const x of [0.5, 4, 7.5, 11]) R.models.push({ id: 'outdoor_table_chair_set_01', x, y: 0.15, z: -3.4, ry: Math.PI / 2, s: 1 });
  // cars parked along the far kerb (clear of the Terrorists' spawn, x 48-72)
  for (const [x, c] of [[10, [2.7, 2.72, 2.8]], [22.5, [3.2, 2.8, 2.2]], [97.5, [2.3, 1.3, 1.25]], [110, [1.5, 1.7, 2.3]], [132, [2.9, 2.9, 3.0]], [146.5, [1.7, 2.1, 1.6]], [161, [3.1, 2.7, 2.1]]]) car(x, 1.3, x < 60 ? Math.PI / 2 : -Math.PI / 2, c);
  // the neighbours at the sides and behind (brick warehouses), and the alleys between them and the cinema
  vs(-30, 0, 0, -0.2, 12, D + 30, 'brick', '#ffffff');
  vs(W + 0.2, 0, 0, W + 30, 12, D + 30, 'brick', '#ffffff');
  vs(-30, 0, D + 0.2, W + 30, 9, D + 30, 'brick', '#e8dccb');
  N.neighbours.push({ x0: 0, x1: 0, z0: 0, z1: D, h: 12, face: 'E', at: -0.2 }, { x0: W, x1: W, z0: 0, z1: D, h: 12, face: 'W', at: W + 0.2 });
  // the side alleys are fenced off: the cinema fills the block from x 4 to W - 4 (the street front to 116, the
  // parking lot east of it)
  bx(0, 0, FAC, 4, 9, PJ + 0.4, 'wall', 'brick', '#d9cbb8', { pen: 0 });
  bx(W - 4, 0, 10.6, W, 9, PJ + 0.4, 'wall', 'brick', '#d9cbb8', { pen: 0 });
  // the street (z 0-8): asphalt, a double yellow line, a zebra crossing to the plaza, drains
  vs(0, 0.004, 0, W, 0.012, 8, 'asphalt', C.road);
  for (const zz of [3.92, 4.1]) R.lines.push({ x0: 0, z0: zz, x1: W, z1: zz + 0.1, c: '#e3c45a', y: 0.014 });
  for (let x = 54.2; x < 66; x += 1.2) R.lines.push({ x0: x, z0: 0.4, x1: x + 0.6, z1: 7.6, c: '#efeee8', y: 0.015 });
  // the near pavement: concrete flags behind a granite kerb
  bx(0, 0, 8, 38, 0.15, 10.6, 'floor', 'walk', '#cfc9bd');
  bx(82, 0, 8, W, 0.15, 10.6, 'floor', 'walk', '#cfc9bd');
  vs(0, 0, 7.92, 38, 0.155, 8.18, 'granite', '#bdb6aa');
  vs(82, 0, 7.92, W, 0.155, 8.18, 'granite', '#bdb6aa');
  // the plaza in front of the doors: terrazzo, a step up from the street
  bx(38, 0, 8, 82, 0.15, FAC, 'floor', 'terrazzo', '#e8e0d0');
  vs(38, 0, 7.92, 82, 0.155, 8.18, 'granite', '#bdb6aa');
  // the forecourt either side of the plaza (where the parking lot was): gardens. Granite-kerbed lawns with palms
  // and clipped box hedges, gravel paths, benches: the Terrorists' cover on the way to the doors
  for (const [x0, x1] of [[4, 37], [83, 116]]) {
    bx(x0, 0, 10.6, x1, 0.15, FAC, 'floor', 'terrazzo', '#d9d0c0');
    for (const [gx0, gx1, gz0, gz1] of [[x0 + 1.2, x0 + 14, 12.4, 17.6], [x1 - 14, x1 - 1.2, 12.4, 17.6], [x0 + 1.2, x0 + 14, 19.6, 24.4], [x1 - 14, x1 - 1.2, 19.6, 24.4]]) {
      bx(gx0, 0.15, gz0, gx1, 0.5, gz1, 'prop', 'granite', '#cfc6b8', { pen: 3 });
      vs(gx0 + 0.25, 0.5, gz0 + 0.25, gx1 - 0.25, 0.53, gz1 - 0.25, 'hedge', '#56763a');
      // a clipped hedge along the bed's long side facing the plaza (chest high: cover)
      const hx = (gx0 + gx1) / 2;
      bx(gx0 + 0.6, 0.5, (gz0 + gz1) / 2 - 0.45, gx1 - 0.6, 1.45, (gz0 + gz1) / 2 + 0.45, 'prop', 'hedge', '#3d5a2a', { pen: 1.2, mat: 'wood' });
      item('planter', { x: hx - 4, z: gz0 + 1.1, y: 0.53, w: 1.2, d: 1.2, bare: 1 });
      item('planter', { x: hx + 4, z: gz1 - 1.1, y: 0.53, w: 1.2, d: 1.2, bare: 1 });
    }
    // benches and bins along the paths
    for (const zz of [18.6]) for (const x of [x0 + 4, x0 + 10, x1 - 10, x1 - 4]) model('painted_wooden_bench', x, 0.15, zz, Math.PI, 1, { box: [x, zz, 0.58, 0.25, 0.85] });
  }
  // ---------------------------------------------------------------- the parking lot (x 116-165, z 10.6-46)
  // In front of the auditorium block where it runs on past the street front: asphalt, painted bays, the patrons'
  // cars (Poly Haven's covered car), lamp posts, palms in islands. Wrought-iron railings between brick piers
  // close it off from the pavement and the gardens: seen from the street, not reached (no way into the building
  // from it, so no dead end for anyone to wander into)
  {
    const x0 = 116.4,
      x1 = W - 4;
    bx(x0, 0, 10.6, x1, 0.15, P0, 'floor', 'asphalt', C.road);
    cb(116.2, 0, 10.6, W - 4, 2.4, 10.95, 'wall', 'brick', { pen: 1 });
    cb(116.2, 0, 10.6, 116.55, 2.4, FAC, 'wall', 'brick', { pen: 1 });
    sg('railing', { ax: 'x', f: 10.78, a0: 116.2, a1: W - 4, y: 0.15, h: 2.2 });
    sg('railing', { ax: 'z', f: 116.38, a0: 10.78, a1: FAC, y: 0.15, h: 2.2 });
    // four rows of bays (nose in, 2.75 m wide, 5 m deep): two double rows round a middle aisle
    const rows = [[13.4, 0], [24.2, Math.PI], [30.2, 0], [41.0, Math.PI]],
      cols = [];
    for (let x = x0 + 2.2; x + 2.75 < x1 - 1; x += 2.75) cols.push(x);
    const tints = [[2.8, 2.8, 2.85], [1.9, 2.1, 1.6], [3.2, 2.9, 2.35], [1.4, 1.5, 2.0], [2.3, 1.3, 1.25], [1.5, 1.7, 2.3], [2.6, 2.4, 2.1]];
    let k = 0;
    rows.forEach(([zz, ry], r) => {
      for (const x of cols) R.lines.push({ x0: x - 0.05, z0: zz - 2.5, x1: x + 0.05, z1: zz + 2.5, c: '#e8e6df', y: 0.155 });
      R.lines.push({ x0: cols[cols.length - 1] + 2.7, z0: zz - 2.5, x1: cols[cols.length - 1] + 2.8, z1: zz + 2.5, c: '#e8e6df', y: 0.155 });
      cols.forEach((x, i) => (i * 7 + r * 3) % 9 < 4 && car(x + 1.375, zz, ry, tints[k++ % tints.length], 0.15));
    });
    // the islands between the double rows: granite kerbs, palms, lamp posts
    for (const zz of [18.8, 35.6]) {
      bx(x0 + 2.2, 0.15, zz - 0.6, x1 - 1.6, 0.3, zz + 0.6, 'prop', 'granite', '#cfc6b8', { pen: 3 });
      vs(x0 + 2.4, 0.3, zz - 0.45, x1 - 1.8, 0.32, zz + 0.45, 'hedge', '#56763a');
      for (let x = x0 + 8; x < x1 - 4; x += 12) {
        item('planter', { x, z: zz, y: 0.3, w: 0.9, d: 0.9 });
        model('street_lamp_01', x + 6, 0.3, zz, 0, 1, { box: [x + 6, zz, 0.12, 0.12, 4.5] });
        lamp(x + 6, 4.7, zz, 'street', x === x0 + 20, !1);
      }
    }
    A.areas.push({ name: 'Parking Lot', min: z(x0, 0, 10.6), max: z(x1, 4, P0) });
  }
  // bollards along the kerb (granite posts), hydrants, bins, planter boxes on the plaza
  for (let x = 2; x < W; x += 3.2) (x < 38 || x > 82 || x < 54 || x > 66) && (cb(x - 0.15, 0.15, 8.35, x + 0.15, 1.05, 8.65, 'prop', 'granite', { pen: 4 }), item('bollard', { x, z: 8.5 }));
  for (const [x, ry] of [[26, Math.PI], [94, Math.PI]]) model('fire_hydrant', x, 0.15, 9.1, ry, 1, { box: [x, 9.1, 0.18, 0.16, 0.8] });
  for (const x of [36.2, 83.8]) model('metal_trash_can', x, 0.15, 9.4, 0, 1, { box: [x, 9.4, 0.25, 0.25, 0.9] });
  for (const [x, zz] of [[44, 10.2], [76, 10.2], [44, 23.6], [76, 23.6]]) model('planter_box_01', x, 0.15, zz, 0, 2.2, { box: [x, zz, 1.0, 0.46, 0.92] });
  // street lamps along the pavements
  for (const [x, zz] of [[8, 9.6], [30, 9.6], [90, 9.6], [112, 9.6], [20, 18.6], [100, 18.6], [134, 9.6], [156, 9.6]]) {
    model('street_lamp_01', x, 0.15, zz, 0, 1, { box: [x, zz, 0.12, 0.12, 4.5] });
    lamp(x, 4.6, zz, 'street', !0, !1);
  }
  // palms in planters along the plaza's edges
  for (const [x, zz] of [[39.5, 12], [39.5, 18], [80.5, 12], [80.5, 18]]) {
    bx(x - 0.9, 0.15, zz - 1.6, x + 0.9, 0.75, zz + 1.6, 'prop', 'granite', '#d8d0c2', { pen: 3 });
    item('planter', { x, z: zz, y: 0.75, w: 1.8, d: 3.2 });
  }
  // the box office: an art-deco ticket booth on the plaza. A light marble plinth, cream stucco sides with
  // rounded corners, a curved glass front with brass mullions and a speaking grille, a stepped canopy edged
  // with bulbs, TICKETS in neon
  {
    const x0 = 57.5,
      x1 = 62.5,
      z0 = 15.6,
      z1 = 18.6;
    bx(x0, 0.15, z0, x1, 1.1, z1, 'wall', 'marble', '#efe8dc');
    bx(x0, 1.1, z1 - 0.18, x1, 2.7, z1, 'wall', 'stucco', '#efe2c8');
    bx(x0, 1.1, z0, x0 + 0.18, 2.7, z1 - 0.18, 'wall', 'stucco', '#efe2c8');
    bx(x1 - 0.18, 1.1, z0, x1, 2.7, z1 - 0.18, 'wall', 'stucco', '#efe2c8');
    w.pane(x0 + 0.18, 1.1, z0, x1 - 0.18, 2.7, z0 + 0.04);
    bx(x0 - 0.5, 2.7, z0 - 0.7, x1 + 0.5, 2.95, z1 + 0.35, 'roof', 'stucco', '#e9dcc0');
    bx(x0 - 0.2, 2.95, z0 - 0.4, x1 + 0.2, 3.15, z1 + 0.15, 'roof', 'gold', C.gold);
    sign('boxoffice', 60, 3.45, z0 - 0.1, Math.PI, 3.4, 0.5);
    item('kiosk', { x0, x1, z0, z1 });
    // (its corners rounded, the canopy's edge a gilt roll, a Seed of Life on its back)
    sg('kiosk', { x0, x1, z0, z1, y0: 0.15, y1: 2.7 });
    lamp(60, 2.5, 17, 'booth');
    for (let x = x0 - 0.35; x <= x1 + 0.36; x += 0.35) N.bulbs.push([x, 2.68, z0 - 0.72, 0]);
    R.models.push({ id: 'CashRegister_01', x: 59, y: 1.1, z: 15.95, ry: Math.PI, s: 1 }, { id: 'CashRegister_01', x: 61.2, y: 1.1, z: 15.95, ry: Math.PI, s: 1 });
    item('ropes', { pts: [[55.6, 11.4], [55.6, 14.6], [64.4, 14.6], [64.4, 11.4]] });
  }
  // a Seed of Life of brass in the plaza's terrazzo, between the box office and the doors
  sg('floor', { pat: 'seed', x: 60, z: 22.3, y: 0.15, r: 2.1, field: '#2b2f31' });
  // ---------------------------------------------------------------- the north facade (z = FAC) and the marquee
  const fz = FAC + 0.2; // the facade wall's centre (0.4 thick)
  // west hall, lobby, east hall: stucco outside, the rooms' own walls inside
  wall(!0, fz, 0.4, 4, 30, 0, 13.5, [], ['stucco', C.stucco], ['velvet', '#2a0f12']);
  item('relief', { x0: 6, x1: 28, z: FAC, y0: 2.4, y1: 7.4 });
  wall(!0, fz, 0.4, 30, 40, 0, 5.2, [{ a0: 33.5, a1: 36.5, y0: 0, y1: 3.2, type: 'open' }], ['stucco', C.stucco], ['plaster', '#d7c7a8']);
  wall(
    !0,
    fz,
    0.4,
    40,
    80,
    0,
    11.2,
    [
      // four entrance bays with glass transoms, and tall windows either side
      { a0: 52.2, a1: 55.4, y0: 0, y1: 3.2, type: 'open' },
      { a0: 56.2, a1: 59.4, y0: 0, y1: 3.2, type: 'open' },
      { a0: 60.6, a1: 63.8, y0: 0, y1: 3.2, type: 'open' },
      { a0: 64.6, a1: 67.8, y0: 0, y1: 3.2, type: 'open' },
      { a0: 43.5, a1: 48.5, y0: 6.2, y1: 9.6, type: 'window' },
      { a0: 71.5, a1: 76.5, y0: 6.2, y1: 9.6, type: 'window' },
    ],
    ['stucco', C.stucco],
    ['stucco', C.lobbyWall],
  );
  // poster cases either side of the doors: the coming attractions
  [43.2, 46.1, 49.0, 71.0, 73.9, 76.8].forEach((x, k) => N.posters.push({ x, y: 0.95, z: FAC - 0.02, ry: Math.PI, w: 1.3, h: 1.95, k: 'case', slot: k }));
  for (const [x, zz] of [[50.6, FAC - 0.3], [69.4, FAC - 0.3]]) lamp(x, 3.4, zz, 'sconce', !1, !1);
  for (const [a0, a1] of [[52.2, 55.4], [56.2, 59.4], [60.6, 63.8], [64.6, 67.8]]) w.pane(a0, 3.2, fz - 0.02, a1, 4.6, fz + 0.02), item('glassdoors', { a0, a1, z: fz, h: 3.2 });
  wall(!0, fz, 0.4, 80, 90, 0, 5.2, [{ a0: 83.5, a1: 86.5, y0: 0, y1: 3.2, type: 'open' }], ['stucco', C.stucco], ['plaster', '#d7c7a8']);
  wall(!0, fz, 0.4, 90, 116, 0, 13.5, [], ['stucco', C.stucco], ['velvet', '#121833']);
  item('relief', { x0: 92, x1: 114, z: FAC, y0: 2.4, y1: 7.4 });
  // the facade above the roofs: a stepped art-deco parapet over the lobby, fins either side of the entrance
  bx(40, 11.2, FAC, 80, 12.0, FAC + 0.4, 'wall', 'stucco', C.stuccoDk);
  bx(50, 12.0, FAC, 70, 13.4, FAC + 0.4, 'wall', 'stucco', C.stucco);
  bx(55, 13.4, FAC, 65, 14.4, FAC + 0.4, 'wall', 'stucco', C.stuccoDk);
  for (const x of [41, 51, 69, 79]) bx(x - 0.45, 0, FAC - 0.5, x + 0.45, x === 51 || x === 69 ? 13.4 : 12.0, FAC, 'wall', 'stucco', C.stuccoDk, { pen: 0 });
  // granite base course along the whole front
  bx(4, 0, FAC - 0.12, 40, 0.9, FAC, 'wall', 'granite', '#cfc6b8');
  bx(80, 0, FAC - 0.12, 116, 0.9, FAC, 'wall', 'granite', '#cfc6b8');
  // the facade's ornament: Seed of Life roundels either side of the blade sign, a frieze of interlaced circles
  // along each step of the parapet, moulded cornices, the fins ribbed in gilt over a granite base, a roundel
  // over each fluted relief on the luxury rooms' blank walls
  for (const x of [55.2, 64.8]) sg('roundel', { pat: 'seed', x, y: 10.2, z: FAC, ry: Math.PI, r: 0.9, d: 0.1, field: '#2a5560' });
  const fins = [[40.5, 41.5], [50.5, 51.5], [68.5, 69.5], [78.5, 79.5], [59.5, 60.5]];
  sg('frieze', { ax: 'x', f: FAC, s: -1, a0: 40, a1: 80, y0: 11.36, y1: 11.78, skip: fins });
  sg('frieze', { ax: 'x', f: FAC, s: -1, a0: 50, a1: 70, y0: 12.42, y1: 12.84, skip: fins });
  sg('frieze', { ax: 'x', f: FAC, s: -1, a0: 55, a1: 65, y0: 13.66, y1: 14.0, skip: fins });
  for (const [a0, a1, y] of [[40, 80, 12.0], [50, 70, 13.4], [55, 65, 14.4], [4, 30, 13.5], [90, 116, 13.5], [30, 40, 5.2], [80, 90, 5.2]]) sg('cornice', { ax: 'x', f: FAC, s: -1, a0, a1, y, skip: [[59.5, 60.5]] });
  for (const x of [41, 51, 69, 79]) sg('fin', { x, z0: FAC - 0.5, z1: FAC, y0: 0, y1: x === 51 || x === 69 ? 13.4 : 12.0 });
  for (const x0 of [6, 92]) for (let x = x0; x < x0 + 21; x += 4.4) sg('roundel', { pat: 'seed', x: x + 1.7, y: 6.8, z: FAC - 0.16, ry: Math.PI, r: 0.5, d: 0.05 });
  // the marquee: a canopy over the doors, letter boards on three faces lined with chaser bulbs
  {
    const x0 = 47,
      x1 = 73,
      z0 = FAC - 4.6,
      y0 = 4.7,
      y1 = 6.5;
    cb(x0, y0, z0, x1, y1, FAC, 'roof', 'gold');
    vs(x0, y0, z0, x1, y0 + 0.08, FAC, 'gold', C.gold);
    vs(x0, y1 - 0.12, z0, x1, y1, FAC, 'roof', '#3a3532');
    N.marquee = { x0, x1, z0, z1: FAC, y0, y1 };
    // a soffit full of bulbs under it
    for (let x = x0 + 0.6; x < x1 - 0.3; x += 0.75) for (let zz = z0 + 0.5; zz < FAC - 0.3; zz += 0.75) N.bulbs.push([x, y0 - 0.02, zz, 1]);
    lamp(54, 4.4, FAC - 2.3, 'marquee', !0, !1);
    lamp(66, 4.4, FAC - 2.3, 'marquee', !1, !1);
    // the blade sign: PALACE, standing out from the facade over the marquee, to above the roof
    N.blade = { x: 60, z0: FAC - 2.6, z1: FAC, y0: 6.9, y1: 17.2 };
    cb(59.6, 6.9, FAC - 2.6, 60.4, 17.2, FAC, 'wall', 'paint');
    // the theater's name in lit letters standing on the marquee
    N.nameSign = { x0: 49, x1: 71, z: z0 + 0.5, y0: y1 + 0.05, y1: y1 + 1.45 };
    lamp(60, 12, FAC - 2.5, 'neon', !1, !1);
  }
  // ---------------------------------------------------------------- the Grand Lobby (x 40-80, z 26-46)
  const LB = { x0: 40, x1: 80, z0: FAC + 0.4, z1: P0, h: 9.6, mz: 40.4, my: 4.6 };
  slab(40, FAC, 80, P0, 0.12, 0.12, ['marble', C.marble], ['marble', C.marble]);
  // the floor: a border and a compass of dark marble inlaid in the cream (drawn as thin inlays)
  vs(40.4, 0.121, 27.3, 79.6, 0.125, 28.0, 'mosaic', '#ffffff');
  vs(40.4, 0.121, 39.7, 79.6, 0.125, 40.4, 'mosaic', '#ffffff');
  // and, in its heart, a Flower of Life of brass in dark marble under the middle chandelier, a Seed of Life under
  // each side one
  sg('floor', { pat: 'fol', x: 60, z: 33.4, y: 0.12, r: 3.9 });
  for (const x of [45, 75]) sg('floor', { pat: 'seed', x, z: 33.2, y: 0.12, r: 1.55 });
  // the lobby's roof: a coffered ceiling (drawn), the roof over it
  slab(40, FAC, 80, P0, LB.h + 0.35, 0.35, ['roof', '#ffffff'], ['plaster', '#e2d6bf'], 'roof');
  // (over the mezzanine too)
  item('coffers', { x0: 40.4, x1: 79.6, z0: 26.4, z1: P0, y: LB.h });
  // each coffer lacquered deep blue with a gilt rosette (Metatron's Cube, the Seed of Life) in a stepped moulding
  sg('coffers', { x0: 40.4, x1: 79.6, z0: 26.4, z1: P0, y: LB.h });
  // west and east lobby walls (to the halls): an archway each, wood panelling below a dado, stucco above
  wall(!1, 40.2, 0.4, FAC + 0.4, P0, 0, LB.h, [{ a0: 29.5, a1: 33.5, y0: 0.12, y1: 3.9, type: 'open', frame: 'arch' }], ['plaster', '#d7c7a8'], ['stucco', C.lobbyWall]);
  wall(!1, 79.8, 0.4, FAC + 0.4, P0, 0, LB.h, [{ a0: 29.5, a1: 33.5, y0: 0.12, y1: 3.9, type: 'open', frame: 'arch' }], ['stucco', C.lobbyWall], ['plaster', '#d7c7a8']);
  for (const [x, s] of [[40.4, 1], [79.6, -1]]) N.panels.push({ ax: 'z', f: x, s, a0: FAC + 0.4, a1: P0, y0: 0.12, y1: 1.3, k: 'dado', wood: 'rosewood' });
  N.panels.push({ ax: 'x', f: FAC + 0.4, s: 1, a0: 40.4, a1: 79.6, y0: 0.12, y1: 1.3, k: 'dado', wood: 'rosewood', skip: [[52.2, 67.8], [42.5, 49.5], [70.5, 77.5]] });
  // the walls' ornament: over the doors a rose window of Metatron's Cube lit from behind, with a roundel either
  // side, between fluted pilasters; a frieze of interlaced circles under a moulded cornice all round; on the
  // stair walls framed bays: a picture, the golden spiral, a Seed of Life over the mezzanine
  sg('rose', { x: 60, y: 6.7, z: FAC + 0.4, ry: 0, r: 1.5 });
  for (const x of [54.4, 65.6]) sg('roundel', { pat: 'metatron', x, y: 6.7, z: FAC + 0.4, ry: 0, r: 0.8 });
  for (const x of [42.4, 50.6, 69.4, 77.6]) sg('pilaster', { ax: 'x', f: FAC + 0.4, s: 1, a: x, y0: 0.12, y1: 8.45 });
  const frz = { y0: 8.6, y1: 9.0, cornice: !0, top: LB.h };
  sg('frieze', { ax: 'x', f: FAC + 0.4, s: 1, a0: 40.4, a1: 79.6, skip: [[43.4, 48.6], [71.4, 76.6]], ...frz });
  sg('frieze', { ax: 'x', f: P0, s: -1, a0: 40.4, a1: 79.6, ...frz });
  for (const [f, s] of [[40.4, 1], [79.6, -1]]) {
    const ry = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    sg('frieze', { ax: 'z', f, s, a0: FAC + 0.4, a1: P0, ...frz });
    sg('bay', { ax: 'z', f, s, a0: 27.0, a1: 33.9, y0: 4.6, y1: 8.3 });
    sg('spiral', { x: f, y: 6.5, z: 37.5, ry, w: 6.0, h: 3.71 });
    sg('bay', { ax: 'z', f, s, a0: 41.0, a1: 45.6, y0: 5.75, y1: 8.3 });
    sg('roundel', { pat: 'seed', x: f, y: 7.02, z: 43.3, ry, r: 1.0 });
    sg('wainscot', { ax: 'z', f, s, a0: LB.mz, a1: P0, y0: LB.my, y1: LB.my + 0.95 });
  }
  // the mezzanine along the south side (y 4.6), on columns, with a brass and glass balustrade
  slab(40.4, LB.mz, 79.6, P0, LB.my, 0.3, ['carpet', C.carpet], ['plaster', '#e2d6bf']);
  rail(44.6, LB.mz, 75.4, LB.mz, LB.my, 1.05, { glass: !0, posts: 1.5 });
  for (const x of [48, 60, 72]) {
    cb(x - 0.38, 0.12, LB.mz - 0.38, x + 0.38, LB.my - 0.3, LB.mz + 0.38, 'wall', 'marble', { pen: 0 });
    N.columns.push({ x, z: LB.mz, y0: 0.12, y1: LB.my - 0.3, r: 0.42, k: 'round' });
  }
  for (const [x, zz] of [[50, 32.6], [70, 32.6]]) {
    cb(x - 0.48, 0.12, zz - 0.48, x + 0.48, LB.h, zz + 0.48, 'wall', 'marble', { pen: 0 });
    N.columns.push({ x, z: zz, y0: 0.12, y1: LB.h, r: 0.55, k: 'round' });
  }
  // the two stairs up to the mezzanine, along the side walls, carpeted, with brass rails
  steps(40.4, 31.4, 42.4, LB.mz, 'S', 0.12, LB.my, 'carpet', C.carpet, { solid: !0, rail: 'E' });
  steps(77.6, 31.4, 79.6, LB.mz, 'S', 0.12, LB.my, 'carpet', C.carpet, { solid: !0, rail: 'W' });
  rail(42.45, 31.4, 42.45, LB.mz, 0.12, 1.0, { stair: [0.12, LB.my] });
  rail(77.55, 31.4, 77.55, LB.mz, 0.12, 1.0, { stair: [0.12, LB.my] });
  // ... and the mezzanine's ends over the stairs (a landing at each)
  rail(42.4, LB.mz, 44.6, LB.mz, LB.my, 1.05, { glass: !0 });
  rail(75.4, LB.mz, 77.6, LB.mz, LB.my, 1.05, { glass: !0 });
  // the mezzanine's moulded fascia (a frieze band in it); up there, a rosewood wainscot, a Flower of Life and two
  // Metatron's Cubes on the wall
  sg('fascia', { x0: 42.45, x1: 77.55, z: LB.mz, y0: 4.15, y1: 4.6 });
  sg('wainscot', { ax: 'x', f: P0, s: -1, a0: 40.4, a1: 79.6, y0: LB.my, y1: LB.my + 0.95 });
  sg('roundel', { pat: 'fol', x: 60, y: 7.0, z: P0, ry: Math.PI, r: 1.3 });
  for (const x of [50, 70]) sg('roundel', { pat: 'metatron', x, y: 7.0, z: P0, ry: Math.PI, r: 0.7 });
  // chandeliers: three over the lobby
  for (const x of [45, 60, 75]) {
    R.models.push({ id: 'Chandelier_02', x, y: 6.4, z: 33.2, ry: 0, s: 3.8, hang: LB.h });
    lamp(x, 6.6, 33.2, 'chand', x === 60);
  }
  // the room's general light (the light volume only: cornice lighting hidden in the coffers)
  for (let x = 42.5; x <= 78; x += 4.5) for (const zz of [28.5, 32.5, 36.5, 40.5, 44.5]) lamp(x, zz > 40 ? 2.6 : 3.0, zz, 'fill');
  for (let x = 44; x <= 76; x += 8) for (const zz of [29, 34, 39]) lamp(x, 7.6, zz, 'fill');
  for (let x = 44; x <= 76; x += 6) lamp(x, LB.my + 1.6, 43.5, 'fill');
  // cans (downlights) under the mezzanine, sconces on the columns
  for (const x of [44, 52, 60, 68, 76]) lamp(x, LB.my - 0.32, 43.2, 'can');
  // the concession stand under the mezzanine: a marble counter with glass candy cases, popcorn machines,
  // the soda fountain and registers; the menu boards over it
  {
    const x0 = 48.5,
      x1 = 71.5,
      z0 = 41.6,
      z1 = 42.6;
    bx(x0, 0.12, z0, x1, 1.08, z1, 'prop', 'marble', C.marbleDk, { pen: 3 });
    bx(x0 - 0.2, 1.08, z0 - 0.08, x1 + 0.2, 1.14, z1, 'prop', 'marble', C.marble, { pen: 3 });
    // the back counter against the wall
    bx(x0, 0.12, 45.0, x1, 1.0, 45.6, 'prop', 'woodp', '#ffffff', { pen: 3 });
    item('concession', { x0, x1, z0, z1, back: 45.0 });
    // its front: a black marble plinth, a marble bullnose, gilt fillets between the candy cases, a Seed of Life
    sg('counter', { x0, x1, z: z0, y0: 0.12, y1: 1.08, fillets: [48.7, 51.8, 55.0, 58.2, 61.4, 64.6, 67.8, 71.0], medallions: [59.8] });
    for (const x of [52, 60, 68]) R.models.push({ id: 'CashRegister_01', x, y: 1.14, z: 42.05, ry: 0, s: 1 });
    sign('menu', 60, 3.3, 45.98, Math.PI, 14, 1.4);
    lamp(54, 3.9, 44, 'cove');
    lamp(66, 3.9, 44, 'cove');
  }
  // espresso carts on the lobby floor: cover on the Terrorists' way in (solid, waist to chest high)
  for (const [x, zz, ry] of [[51.5, 36.2, 0.25], [68.5, 36.2, -0.25]]) model('CoffeeCart_01', x, 0.12, zz, ry, 1, { box: [x, zz, 1.05, 0.52, 1.5] });
  // queue ropes and posters on easels in the lobby, plants, bins, benches
  item('ropes', { pts: [[53, 36.4], [53, 38.2], [67, 38.2], [67, 36.4]] });
  for (const [x, zz, ry] of [[44, 29.5, 0.5], [76, 29.5, -0.5], [44, 37.5, Math.PI / 2], [76, 37.5, -Math.PI / 2]]) N.posters.push({ x, y: 0.12, z: zz, ry, w: 1.0, h: 1.5, k: 'easel' });
  for (const [x, zz] of [[41.2, 27.4], [78.8, 27.4], [46.6, 39.6], [73.4, 39.6]]) model('potted_plant_02', x, 0.12, zz, 0, 1.2, { box: [x, zz, 0.35, 0.35, 1.2] });
  for (const [x, zz] of [[48.6, 27.0], [71.4, 27.0]]) model('metal_trash_can', x, 0.12, zz, 0, 1, { box: [x, zz, 0.25, 0.25, 0.9] });
  // carved consoles under the windows, a marble bust on each
  for (const x of [45.4, 74.6]) {
    model('ClassicConsole_01', x, 0.12, 26.76, 0, 1, { box: [x, 26.72, 0.78, 0.31, 0.95] });
    R.models.push({ id: 'marble_bust_01', x, y: 1.07, z: 26.7, ry: 0, s: 1.5 });
  }
  // posters in lit frames on the lobby walls (the films now showing)
  for (const [k, zz] of [[0, 35], [1, 38.2]]) {
    N.posters.push({ x: 40.42, y: 1.6, z: zz, ry: Math.PI / 2, w: 1.4, h: 2.1, k: 'wall', slot: k });
    N.posters.push({ x: 79.58, y: 1.6, z: zz, ry: -Math.PI / 2, w: 1.4, h: 2.1, k: 'wall', slot: k + 2 });
  }
  // up on the mezzanine: benches and a view down
  for (const x of [50, 56, 64, 70]) cb(x - 0.8, LB.my, 44.6, x + 0.8, LB.my + 0.46, 45.4, 'prop', 'woodp', { pen: 3 }), item('bench', { x, z: 45.0, y: LB.my, ry: Math.PI, w: 1.6 });
  for (const x of [46, 54, 66, 74]) lamp(x, LB.my + 2.6, 45.5, 'sconce');
  for (const x of [46.5, 53, 67, 73.5]) model('mid_century_lounge_chair', x, LB.my, 42.4, Math.PI, 1, { box: [x, 42.4, 0.4, 0.4, 0.9] });
  for (const x of [49.75, 70.25]) model('coffee_table_round_01', x, LB.my, 42.6, 0, 0.8, { box: [x, 42.6, 0.35, 0.35, 0.4] });
  for (const [x, ry] of [[40.42, Math.PI / 2], [79.58, -Math.PI / 2]]) R.models.push({ id: 'fancy_picture_frame_01', x, y: 6.45, z: 30.45, ry, s: 3.2, frame: 1 });
  for (const x of [48.9, 71.1]) R.models.push({ id: 'brass_vase_01', x, y: 1.14, z: 42.1, ry: 0, s: 1.2 });
  // the south wall of the lobby (to the Promenade): two wide archways under the mezzanine
  wall(!0, P0 + 0.2, 0.4, 40, 80, 0, LB.h, [{ a0: 41.2, a1: 46.2, y0: 0.12, y1: 4.2, type: 'open', frame: 'arch' }, { a0: 73.8, a1: 78.8, y0: 0.12, y1: 4.2, type: 'open', frame: 'arch' }], ['stucco', C.lobbyWall], ['velvet', '#5b1a22']);
  A.areas.push({ name: 'Grand Lobby', min: z(40, 0, FAC), max: z(80, 4.4, LB.mz) }, { name: 'Concessions', min: z(40, 0, LB.mz), max: z(80, 4.4, P0) }, { name: 'Mezzanine', min: z(40, 4.4, LB.mz - 0.6), max: z(80, 9, P0) });
  // ---------------------------------------------------------------- West Hall (arcade) x 30-40, East Hall x 80-90
  for (const [x0, x1, nm] of [[30, 40, 'West Hall'], [80, 90, 'East Hall']]) {
    slab(x0, FAC, x1, P0, 0.12, 0.12, ['carpet', C.carpetBlue], ['carpet', C.carpetBlue]);
    slab(x0, FAC, x1, P0, 5.2, 0.3, ['roof', '#ffffff'], ['ceil', '#2b2622'], 'roof');
    A.areas.push({ name: nm, min: z(x0, 0, FAC), max: z(x1, 5, P0) });
    for (const zz of [30, 38]) lamp((x0 + x1) / 2, 4.85, zz, 'can', zz === 38);
    for (const zz of [28, 34, 40, 44]) lamp((x0 + x1) / 2, 3.6, zz, 'fill');
  }
  // arcade cabinets along the West Hall's west wall, a claw machine, a photo booth
  for (let k = 0; k < 6; k++) {
    const zz = 31.4 + k * 1.05;
    cb(30.4, 0.12, zz - 0.42, 31.3, 1.9, zz + 0.42, 'prop', 'paint', { pen: 2 });
    item('arcade', { x: 30.4, z: zz, v: k });
  }
  cb(36.6, 0.12, 27.0, 38.0, 2.0, 28.4, 'prop', 'paint', { pen: 2 });
  item('claw', { x: 37.3, z: 27.7 });
  cb(30.4, 0.12, 40.6, 32.0, 2.2, 42.4, 'prop', 'paint', { pen: 2 });
  item('photobooth', { x0: 30.4, x1: 32.0, z0: 40.6, z1: 42.4 });
  // a seating corner in each hall: armchairs round a side table
  for (const [x, zz, ry] of [[38.3, 34.4, -Math.PI / 2], [38.3, 37.0, -Math.PI / 2], [81.7, 39.4, Math.PI / 2], [81.7, 42.0, Math.PI / 2]]) model('ArmChair_01', x, 0.12, zz, ry, 1, { box: [x, zz, 0.42, 0.38, 0.9] });
  for (const [x, zz] of [[38.4, 35.7], [81.6, 40.7]]) model('side_table_01', x, 0.12, zz, 0, 1, { box: [x, zz, 0.27, 0.27, 0.55] });
  // the East Hall: a party-room bench, posters, the coat check counter
  bx(87.6, 0.12, 30.0, 89.6, 1.05, 35.0, 'prop', 'woodp', '#ffffff', { pen: 3 });
  item('coatcheck', { x0: 87.6, x1: 89.6, z0: 30.0, z1: 35.0 });
  for (const [x, zz, ry, sl] of [[30.42, 36.5, Math.PI / 2, 4], [89.98, 40, -Math.PI / 2, 5], [80.02, 40, Math.PI / 2, 0]]) N.posters.push({ x, y: 1.5, z: zz, ry, w: 1.2, h: 1.8, k: 'wall', slot: sl });
  // ---------------------------------------------------------------- The Velvet Room (theater 5, x 4-30)
  // An ultra-wide curved screen that IS the east wall: wall to wall (a 19.5 m chord, its ends at the side walls)
  // and floor to ceiling (from a 0.2 m lip to the ceiling), curving round the seats to the left and right (its
  // middle 4 m further back than its ends; 21.6 m along the curve, about 1.85 : 1). From the middle rows it fills
  // about 120-135° of the view, the front rows more. Leather recliners in five curved rows on tiers rising west, every
  // seat turned square to the screen; a black velour surround following the curve; deep red drapes down the side
  // walls; a black ceiling 12.1 m up (the room's depth / φ). You come in from the Promenade at the front, beside
  // the screen's south end.
  const velvet = (o) => {
    const x0 = 4.4,
      x1 = 30.0,
      z0 = FAC + 0.4,
      z1 = P0,
      H = +((z1 - z0) / __PHI).toFixed(2),
      zc = (z0 + z1) / 2,
      RV = 0.42;
    slab(4, FAC, 30, P0, 0.12, 0.12, ['carpet', o.carpet], ['carpet', o.carpet]);
    slab(4, FAC, 30, P0, H + 0.3, 0.3, ['roof', '#ffffff'], ['black', '#0a0b10'], 'roof');
    wall(!1, 4.2, 0.4, FAC, P0, 0, H, [], ['stucco', C.stucco], ['velvet', o.wall]);
    wall(!1, 30.2, 0.4, FAC + 0.4, P0, 0, H, [], ['black', '#0b0b0d'], ['plaster', '#d7c7a8']);
    // the screen: an arc through its chord (wall to wall), its middle 0.35 m off the east wall, its ends 4 m nearer
    // the seats; floor to ceiling
    const SC = { chord: z1 - z0 - 0.1, sag: 4.0, h: +(H - 0.32 - 0.04).toFixed(2), y0: 0.32 },
      xs = x1 - 0.35,
      Rr = (SC.chord ** 2 / 4 + SC.sag ** 2) / (2 * SC.sag),
      xcR = xs - Rr,
      arcX = (zz) => xcR + Math.sqrt(Math.max(0, Rr * Rr - (zz - zc) ** 2));
    const sc = { id: o.id, x: xs, y: SC.y0 + SC.h / 2, z: zc, w: SC.chord, h: SC.h, ry: -Math.PI / 2, curve: SC.sag, room: { min: z(x0, 0, z0), max: z(x1, H, z1) }, hear: 14 };
    // nobody walks behind it: solid from the arc back to the wall (in 0.5 m slices)
    for (let zz = z0; zz < z1 - 0.01; zz += 0.5) {
      const zb = Math.min(z1, zz + 0.5);
      cb(Math.min(arcX(zz), arcX(zb)) + 0.06, 0, zz, x1, 2.6, zb, 'wall', 'black', { pen: 0 });
    }
    // tiers: 5, each 2.9 m deep, rising 0.42 m, to the back walkway; a flat floor in front of them to the screen
    const tiers = 5,
      dep = 2.9,
      front = 23.4,
      sag = 1.2,
      hw = 9.0;
    for (let r = 0; r < tiers; r++) {
      const xa = front - dep * (r + 1),
        xb = front - dep * r,
        top = 0.12 + RV * (r + 1);
      bx(xa, 0, z0, xb, top, z1, 'floor', 'carpet', o.carpet);
      // two blocks of eight recliners round a middle aisle; the rows bow towards the screen in the middle (1.2 m)
      // and each seat turns square to the arc
      for (const [za, zb] of [[z0 + 1.35, zc - 0.7], [zc + 0.7, z1 - 1.35]]) {
        const n = 8,
          sp = (zb - za) / n,
          list = [];
        for (let i = 0; i < n; i++) {
          const zs = za + sp * (i + 0.5),
            u = (zs - zc) / hw,
            fx = xa + 0.95 + sag * (1 - u * u),
            yaw = -Math.PI / 2 - Math.atan((2 * sag * (zs - zc)) / (hw * hw));
          list.push({ x: fx, z: zs, yaw });
          cb(fx - 1.0, top, zs - 0.42, fx - 0.06, top + 1.05, zs + 0.42, 'prop', 'leather', { pen: 2.5 });
        }
        N.seats.push({ list, y: top, face: 'E', color: o.seat, kind: 'recliner', th: o.id, row: r, w: sp });
      }
    }
    bx(x0, 0, z0, front - dep * tiers, 0.12 + RV * (tiers + 1), z1, 'floor', 'carpet', o.carpet);
    N.th.push({ id: o.id, n: o.n, name: o.name, screen: sc, x0, x1, z0, z1, h: H, face: 'E', seat: o.seat, wall: o.wall, trim: C.gold, lux: !0, arc: { xs, zc, R: Rr, xc: xcR, chord: SC.chord, sag: SC.sag, y0: SC.y0, h: SC.h } });
    // drapes down both side walls (clear of the screen's ends), sconces between them
    const floorV = (x) => (x >= front ? 0.12 : 0.12 + RV * (Math.min(tiers, Math.floor((front - x) / dep)) + 1));
    for (const [f, sd] of [[z0, 1], [z1, -1]]) {
      for (let k = 0; k < 5; k++) {
        const a = 5.0 + k * 3.8,
          b = a + 3.0;
        N.curtains.push({ ax: 'x', f: f + sd * 0.06, s: sd, a0: a, a1: b, y0: floorV(a), y1: H - 0.6, color: o.drape });
        k && lamp(a - 0.4, floorV(a - 0.4) + 3.0, f + sd * 0.25, 'sconce');
      }
    }
    lamp(25, 6, zc, 'aisle', !0);
    for (const x of [8, 15, 22]) for (const zz of [30, 36, 42]) lamp(x, 8.5, zz, 'house');
    for (const zz of [30, 36, 42]) lamp(24.5, 3.5, zz, 'spill');
    // the control desk for this room: at the back, on the walkway
    const top6 = 0.12 + RV * (tiers + 1);
    cb(4.5, top6, 34.8, 5.3, top6 + 1.0, 37.4, 'prop', 'paint', { pen: 2 });
    item('console', { x: 4.9, y: top6, z: 36.1, th: o.id, ry: Math.PI / 2 });
    N.consoles.push({ x: 5.9, y: top6, z: 36.1, th: o.id });
    // the room's name over its Promenade entrance (2.0 x 3.24 m: 1 : φ), lit; velvet drapes inside it
    sign('title', 24.6, 3.95, P0 + 0.42, 0, 4.4, 0.6, { th: o.id });
    sign('exit', 24.6, 3.62, P0 - 0.25, Math.PI, 0.7, 0.26);
    N.exitDrapes.push({ ax: 'x', f: P0, s: -1, a0: 23.6, a1: 25.6, y0: 0.12, y1: 3.36, color: o.drape });
    A.areas.push({ name: o.name, min: z(4, 0, FAC), max: z(30, H, P0) });
    return sc;
  };
  // ---------------------------------------------------------------- The Starlight: the 360° sphere
  // The east luxury room (x 90-116) is one great ellipsoid round the eye, 24 m across, the film all round you,
  // above and below: a 360° or VR video (YouTube, or a 360°/180° file) set in /admin. You come in from the
  // Promenade down a short hallway (3 m wide, 4.85 m high and long: 1 : φ : φ) of marble, rosewood and brass, and
  // through a gilt portal at its end straight into the film: the sphere has no floor to be seen, you stand on glass
  // you can't see. Nothing else of the room shows. 70-screens.js draws the sphere (def.dome) and plays the film.
  const starlight = () => {
    const x0 = 90.4,
      x1 = 115.6,
      z0 = FAC + 0.4,
      z1 = P0,
      H = 13.9,
      HWw = 3.0,
      HWh = +(HWw * __PHI).toFixed(2),
      hx = 103,
      hz1 = P0,
      hz0 = hz1 - HWh,
      rz = (hz0 - (z0 + 0.4)) / 2,
      D = { cx: hx, cz: hz0 - rz, base: 0.12, eye: 1.6, rx: (x1 - x0) / 2 - 0.6, rz, top: 11.7, bottom: 11.7, sphere: !0, front: 0 };
    // the doorway: where the hallway meets the sphere (due south of its middle). The hole in the sphere is a
    // little wider than the portal's opening (2.0 x 3.24 m) and narrower than the portal's panel round it
    D.door = { yaw: Math.PI, half: Math.atan(1.4 / rz), h: 3.9, x: hx, z: hz0, th: Math.PI / 2 };
    // the floor: walkable everywhere (invisible inside the sphere); the hallway draws its own
    cb(90, 0, FAC, 116, 0.12, P0, 'floor', 'carpet');
    slab(90, FAC, 116, P0, H + 0.3, 0.3, ['roof', '#ffffff'], ['black', '#05060a'], 'roof');
    wall(!1, 115.8, 0.4, FAC, P0, 0, H, [], ['black', '#05060a'], ['stucco', C.stucco]);
    wall(!1, 89.8, 0.4, FAC + 0.4, P0, 0, H, [], ['plaster', '#d7c7a8'], ['black', '#05060a']);
    // the sphere's wall, solid to 4 m (above it is out of reach): columns round the ellipse, open at the hallway
    const per = 2 * Math.PI * Math.sqrt((D.rx * D.rx + D.rz * D.rz) / 2),
      nCol = Math.ceil(per / 0.45);
    for (let k = 0; k < nCol; k++) {
      const th = (k / nCol) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(th - D.door.th), Math.cos(th - D.door.th))) < (1.7 / per) * Math.PI * 2) continue;
      const px = D.cx + (D.rx + 0.15) * Math.cos(th),
        pz = D.cz + (D.rz + 0.15) * Math.sin(th);
      cb(px - 0.25, 0, pz - 0.25, px + 0.25, 4.0, pz + 0.25, 'wall', 'black', { pen: 0 });
    }
    // the hallway: its walls run from the Promenade to the sphere; the portal at its end
    for (const sd of [-1, 1]) cb(hx + sd * (HWw / 2) - (sd < 0 ? 0.3 : 0), 0, hz0 - 0.2, hx + sd * (HWw / 2) + (sd > 0 ? 0.3 : 0), HWh + 0.12, hz1, 'wall', 'velvet', { pen: 0 });
    for (const sd of [-1, 1]) cb(Math.min(hx + sd * 1.0, hx + sd * (HWw / 2)), 0, hz0, Math.max(hx + sd * 1.0, hx + sd * (HWw / 2)), HWh + 0.12, hz0 + 0.3, 'wall', 'gold', { pen: 0 });
    sg('hallway', { x: hx, z0: hz0, z1: hz1, w: HWw, h: HWh, y: 0.12, door: { w: 2.0, h: +(2.0 * __PHI).toFixed(2) } });
    for (const sd of [-1, 1]) lamp(hx + sd * (HWw / 2 - 0.15), 2.75, (hz0 + hz1) / 2, 'sconce');
    for (const zz of [hz0 + 1.0, hz0 + 2.4, hz0 + 3.8]) lamp(hx, 2.0, zz, 'fill');
    const sc = { id: 'lounge', x: D.cx, y: D.base + D.eye, z: D.cz, w: 2, h: 1, ry: 0, dome: D, room: { min: z(x0, 0, z0), max: z(x1, H, z1) }, hear: 14 };
    N.th.push({ id: 'lounge', n: 6, name: 'The Starlight', screen: sc, x0, x1, z0, z1, h: H, face: 'N', seat: '#1f2c5c', wall: '#05060a', trim: C.gold, dome: D, hall: { x: hx, z0: hz0, z1: hz1, w: HWw, h: HWh } });
    // the name over the Promenade entrance and over the portal, the way out over the entrance inside
    sign('title', hx, 4.27, P0 + 0.42, 0, 3.6, 0.42, { th: 'lounge' });
    sign('title', hx, 4.18, hz0 + 0.32, 0, 2.6, 0.5, { th: 'lounge' });
    sign('exit', hx, 4.2, P0 - 0.03, Math.PI, 0.7, 0.26);
    A.areas.push({ name: 'The Starlight', min: z(90, 0, FAC), max: z(116, H, P0) });
    return sc;
  };
  A.__luxScreens = [velvet({ id: 't5', n: 5, name: 'The Velvet Room', carpet: '#3a1418', seat: '#6a1a1c', wall: '#2a0f12', drape: '#5a1016' }), starlight()];
  item('neon', { x: 92.5, y: 3.95, z: P0 + 0.44, ry: 0, text: 'Starlight', w: 2.6, h: 0.6 });
  item('neon', { x: 28.6, y: 3.95, z: P0 + 0.44, ry: 0, text: 'Velvet', w: 2.4, h: 0.6, color: '#ff6a7a' });
  // the walls between the halls and the Promenade, with wide openings; the Promenade's north wall in front of
  // the parking lot
  wall(!0, P0 + 0.2, 0.4, 4, 40, 0, 13.5, [{ a0: 23.6, a1: 25.6, y0: 0.12, y1: 3.36, type: 'open' }, { a0: 31.2, a1: 38.8, y0: 0.12, y1: 3.6, type: 'open' }], ['velvet', '#2a0f12'], ['velvet', '#5b1a22']);
  wall(!0, P0 + 0.2, 0.4, 80, 116, 0, 13.5, [{ a0: 81.2, a1: 88.8, y0: 0.12, y1: 3.6, type: 'open' }, { a0: 101.9, a1: 104.1, y0: 0.12, y1: 3.68, type: 'open' }], ['velvet', '#121833'], ['velvet', '#5b1a22']);
  wall(!0, P0 + 0.2, 0.4, 116, W - 4, 0, 6.0, [], ['stucco', C.stucco], ['velvet', '#5b1a22']);
  sg('cornice', { ax: 'x', f: P0, s: -1, a0: 116, a1: W - 4, y: 6.0 });
  // ---------------------------------------------------------------- the Promenade (z 46.4-54.2, x 4-165)
  // 7.8 m wide under a 4.8 m ceiling (width = height x φ), 160 m long, broken by arched screens
  const PM = (P0 + 0.4 + P1) / 2;
  {
    const H = 4.8,
      xe = W - 4;
    slab(4, P0, xe, P1, 0.12, 0.12, ['carpet', C.carpet], ['carpet', C.carpet]);
    slab(4, P0, xe, P1, H + 0.3, 0.3, ['roof', '#ffffff'], ['plaster', '#e2d6bf'], 'roof');
    // a terrazzo border either side of the carpet runner
    vs(4.4, 0.121, P0 + 0.4, xe - 0.4, 0.125, P0 + 0.9, 'terrazzo', '#d9d0c0');
    vs(4.4, 0.121, P1 - 0.5, xe - 0.4, 0.125, P1, 'terrazzo', '#d9d0c0');
    wall(!1, 4.2, 0.4, P0, P1, 0, H, [], ['stucco', C.stucco], ['velvet', '#5b1a22']);
    wall(!1, xe - 0.2, 0.4, P0, P1, 0, H, [], ['velvet', '#5b1a22'], ['stucco', C.stucco]);
    // lamps: a coved light down the middle, sconces between the theaters' doors
    for (let x = 12; x < xe - 4; x += 8) lamp(x, H - 0.25, PM, 'cove', x % 32 === 12);
    for (let x = 7; x < xe - 2; x += 4.5) lamp(x, 2.2, PM, 'fill');
    // arched screens across the Promenade (no long sightlines): an archway in each, alternately north and south
    const screensAt = [[33, 1], [53, 0], [76, 1], [98, 0], [120, 1], [137, 0]];
    for (const [x, n] of screensAt) {
      const [o0, o1] = n ? [P0 + 0.4, P0 + 4.0] : [P1 - 3.6, P1];
      wall(!1, x, 0.4, P0 + 0.4, P1, 0, H, [{ a0: o0, a1: o1, y0: 0.12, y1: 4.2, type: 'open', frame: 'arch' }], ['velvet', '#5b1a22'], ['velvet', '#5b1a22']);
    }
    for (const T of __CN_TH) lamp((T.a + T.b) / 2, 2.8, P1 - 0.45, 'sconce');
    for (const [x, sl] of [[8, 0], [13.5, 1], [19.5, 2], [50, 3], [55, 4], [66, 5], [71, 0], [95, 5], [110, 2], [113.5, 3], [121, 1], [126, 4], [134, 0], [141, 5], [151, 2], [156, 3], [161, 1]]) N.posters.push({ x, y: 0.9, z: P0 + 0.42, ry: 0, w: 1.3, h: 1.95, k: 'case', slot: sl });
    for (const x of [16, 60, 118, 131, 158.5]) cb(x - 0.9, 0.12, P0 + 0.55, x + 0.9, 0.58, P0 + 1.05, 'prop', 'woodp', { pen: 3 }), item('bench', { x, z: P0 + 0.8, y: 0.12, ry: 0, w: 1.8 });
    for (const x of [8, xe - 4]) model('potted_plant_02', x, 0.12, P0 + 0.9, 0, 1.1, { box: [x, P0 + 0.9, 0.35, 0.35, 1.1] });
    for (const x of [36.4, 83.6]) model('potted_plant_04', x, 0.12, P0 + 0.75, 0, 3.6, { box: [x, P0 + 0.75, 0.3, 0.3, 0.9] });
    // its ornament: in front of each theater a Seed of Life (Metatron's Cube at the Mid Corridor) of brass in
    // marble; a rosette over each pendant and beams between them; a cornice and a rosewood wainscot along both
    // walls; backlit glass either side of every entrance; roundels on the arched screens
    for (const x of [...__CN_TH.map((T) => (T.a + T.b) / 2), 84.5]) sg('floor', { pat: x === 84.5 ? 'metatron' : 'seed', x, z: PM, y: 0.12, r: 1.3 });
    for (let x = 12; x < xe - 4; x += 8) sg('ceil', { pat: x % 16 === 12 ? 'seed' : 'metatron', x, z: PM, y: H, r: 0.62 });
    for (let x = 8; x < xe - 2; x += 8) screensAt.every(([s]) => Math.abs(s - x) > 2.5) && sg('pbeam', { x, z0: P0 + 0.4, z1: P1, y: H });
    const scr = (n) => screensAt.filter((q) => q[1] === n).map(([x]) => [x - 0.25, x + 0.25]),
      allScr = screensAt.map(([x]) => [x - 0.25, x + 0.25]);
    sg('crown', { ax: 'x', f: P0 + 0.4, s: 1, a0: 4.4, a1: xe - 0.4, y: H, skip: allScr });
    sg('crown', { ax: 'x', f: P1, s: -1, a0: 4.4, a1: xe - 0.4, y: H, skip: allScr });
    N.panels.push({ ax: 'x', f: P0 + 0.4, s: 1, a0: 4.4, a1: xe - 0.4, y0: 0.12, y1: 0.78, k: 'dado', wood: 'rosewood', skip: [[23.45, 25.75], [31.05, 38.95], [41.05, 46.35], [73.65, 78.95], [81.05, 88.95], [101.75, 104.25], ...scr(0)] });
    N.panels.push({ ax: 'x', f: P1, s: -1, a0: 4.4, a1: xe - 0.4, y0: 0.12, y1: 0.78, k: 'dado', wood: 'rosewood', skip: [...__CN_XL.gaps.map((g, i) => [__CN_TH[i].b - 0.15, __CN_TH[i + 1].a + 0.15]), ...scr(1)] });
    for (let i = 0; i < 3; i++) for (const x of [__CN_TH[i].b - 0.8, __CN_TH[i + 1].a + 0.8]) sg('glass', { x, y: 2.05, z: P1, ry: Math.PI, w: 0.8, h: 2.4 });
    for (const [x, tint] of [[22.8, 'rose'], [26.4, 'rose'], [101.2, 'teal'], [104.8, 'teal']]) sg('glass', { x, y: 2.05, z: P0 + 0.4, ry: 0, w: 0.8, h: 2.4, tint });
    for (const [x, n] of screensAt) for (const sd of [-1, 1]) sg('roundel', { pat: n ? 'seed' : 'metatron', x: x + sd * 0.2, y: 2.3, z: n ? (P0 + 4.0 + P1) / 2 : (P0 + 0.4 + P1 - 3.6) / 2, ry: (sd * Math.PI) / 2, r: 0.55, d: 0.05 });
    A.areas.push({ name: 'Promenade', min: z(4, 0, P0), max: z(xe, H, P1) });
  }
  // ---------------------------------------------------------------- Theaters 1-4, Palace XL
  // Each 36.75 m wide and 47.6 m deep (1.5 x before), its ceiling 22.2 m up (the width / φ). The screen IS the
  // front wall: flat, wall to wall (35.95 x 20.2 m, 16:9), from 1 m off the floor nearly to the ceiling. 18 rows of
  // premium rockers on a stadium rake (1.8 m rows rising 0.45 m), three aisles; you come in at the front through
  // fire exits from the side corridors (2.0 x 3.24 m: 1 : φ), or at the top from the projection level.
  const corridors = __CN_XL.gaps.map((g, i) => ({ x0: __CN_TH[i].b, x1: __CN_TH[i + 1].a, name: ['West Corridor', 'Mid Corridor', 'East Corridor'][i] }));
  A.screens = [];
  const floorAt = (zz) => (zz < R0 ? 0.12 : 0.12 + RISE * Math.min(NROW + 1, Math.ceil((zz - R0) / ROW + 1e-6)));
  const EX0 = P1 + 5.6,
    EX1 = P1 + 7.6,
    EXH = 0.12 + +(2.0 * __PHI).toFixed(2),
    SY = 1.0;
  A.__slopes = [];
  for (const T of __CN_TH) {
    const { a, b } = T,
      c = (a + b) / 2,
      ix0 = a + 0.4,
      ix1 = b - 0.4,
      SW = ix1 - ix0,
      SH = +((SW * 9) / 16).toFixed(2),
      exW = corridors.some((k) => Math.abs(k.x1 - a) < 0.01),
      exE = corridors.some((k) => Math.abs(k.x0 - b) < 0.01),
      wallC = T.wall;
    // the screen wall (shared with the Promenade): no openings, the screen fills it; above the Promenade's roof
    // the block's own stucco
    wall(!0, P1 + 0.2, 0.4, a, b, 0, 5.1, [], ['velvet', '#5b1a22'], ['black', '#0b0b0d']);
    wall(!0, P1 + 0.2, 0.4, a, b, 5.1, HT, [], ['stucco', C.stucco], ['black', '#0b0b0d']);
    // side walls: fire exits into the corridors at the front (open, arched, an EXIT sign over each); the
    // corridor side deep red fabric up to its ceiling, stucco above it
    const exit = (has) => (has ? [{ a0: EX0, a1: EX1, y0: 0.12, y1: EXH, type: 'open', frame: 'arch' }] : []);
    wall(!1, a + 0.2, 0.4, P1, BACK + 0.4, 0, 4.65, exit(exW), [exW ? 'velvet' : 'stucco', exW ? '#3a171c' : C.stucco], ['velvet', '#1d1d22']);
    wall(!1, a + 0.2, 0.4, P1, BACK + 0.4, 4.65, HT, [], ['stucco', C.stucco], ['velvet', '#1d1d22']);
    wall(!1, b - 0.2, 0.4, P1, BACK + 0.4, 0, 4.65, exit(exE), ['velvet', '#1d1d22'], [exE ? 'velvet' : 'stucco', exE ? '#3a171c' : C.stucco]);
    wall(!1, b - 0.2, 0.4, P1, BACK + 0.4, 4.65, HT, [], ['velvet', '#1d1d22'], ['stucco', C.stucco]);
    // velvet curtains inside each doorway: they part as someone walks through (72-cinema-view.js)
    exW && N.exitDrapes.push({ ax: 'z', f: a + 0.4, s: 1, a0: EX0, a1: EX1, y0: 0.12, y1: EXH, color: T.seat });
    exE && N.exitDrapes.push({ ax: 'z', f: b - 0.4, s: -1, a0: EX0, a1: EX1, y0: 0.12, y1: EXH, color: T.seat });
    const RD = +(1.8 * __PHI).toFixed(2);
    for (const [o0, o1] of [[a + 0.9, a + 2.7], [b - 2.7, b - 0.9]]) N.exitDrapes.push({ ax: 'x', f: BACK, s: -1, a0: o0, a1: o1, y0: FLY, y1: FLY + RD, color: T.seat });
    // floors: a low black stage under the screen, the pit
    slab(ix0, P1 + 0.4, ix1, R0, 0.12, 0.12, ['carpet', T.seat], ['carpet', T.seat]);
    bx(a + 4.0, 0, P1 + 0.4, b - 4.0, 0.45, STAGE, 'floor', 'carpet', '#16161a');
    N.stairs.push({ k: 'stagefront', x0: a + 4.0, x1: b - 4.0, z: STAGE, y: 0.45 });
    // the rake: 18 rows; the aisles (both sides and the middle) have two steps per row
    const blocks = [
      [a + 2.2, c - 0.8],
      [c + 0.8, b - 2.2],
    ];
    const aisles = [
      [ix0, a + 2.2],
      [c - 0.8, c + 0.8],
      [b - 2.2, ix1],
    ];
    for (let k = 0; k < NROW; k++) {
      const z0 = R0 + ROW * k,
        z1 = z0 + ROW,
        top = 0.12 + RISE * (k + 1),
        half = top - RISE / 2;
      bx(ix0, 0, z0, ix1, half, z1, 'floor', 'carpet', T.seat);
      for (const [x0, x1] of blocks) bx(x0, half, z0, x1, top, z1, 'floor', 'carpet', T.seat);
      for (const [x0, x1] of aisles) {
        bx(x0, half, z0 + ROW / 2, x1, top, z1, 'stair', 'carpet', '#2a2626', { mat: 'wood', __noSlope: 1 });
        N.steps.push({ x0, x1, z: z0, y: half }, { x0, x1, z: z0 + ROW / 2, y: top });
      }
      // seats (wide rockers, 0.72 m apart): a row on each block, its collision the seats' backs and cushions
      for (const [x0, x1] of blocks) {
        cb(x0 + 0.05, top, z0 + 0.95, x1 - 0.05, top + 1.08, z1 - 0.02, 'prop', 'velvet', { pen: 2.5 });
        // the rows curve round the screen: a seat sits up to 35 cm nearer it towards the room's sides
        N.seats.push({ ax: 'x', a0: x0, a1: x1, f: z0 + 0.95, y: top, face: 'N', color: T.seat, kind: 'std', n: Math.floor((x1 - x0) / 0.72), d: ROW - 0.97, row: k, th: T.id, arc: { cx: c, hw: (b - a) / 2 - 2.2, sag: 0.35 } });
        // the row's letter at both ends, lit, facing the aisles
        N.rowSigns.push({ x: x0 - 0.01, y: top + 0.3, z: z0 + 1.25, ry: -Math.PI / 2, ch: String.fromCharCode(65 + k) }, { x: x1 + 0.01, y: top + 0.3, z: z0 + 1.25, ry: Math.PI / 2, ch: String.fromCharCode(65 + k) });
      }
    }
    // the aisles walk as smooth slopes (through each step's front edge): no catching on the half-steps
    for (const [x0, x1] of aisles) A.__slopes.push({ x0: x0 + 0.02, z0: R0 - ROW / 2, x1: x1 - 0.02, z1: XA, lo: 0.12, hi: FLY, dir: 'S' });
    // the cross-aisle at the top and its parapet
    bx(ix0, 0, XA, ix1, FLY, BACK, 'floor', 'carpet', T.seat);
    for (const [x0, x1] of blocks) {
      bx(x0, FLY - RISE, XA, x1, FLY + 0.75, XA + 0.18, 'wall', 'woodp', '#ffffff', { pen: 2 });
      rail(x0, XA + 0.09, x1, XA + 0.09, FLY + 0.75, 0.3);
    }
    // rear wall: two doors to the projection level (1.8 x 2.91 m: 1 : φ), two projection ports; brick outside
    // above the projection level's roof
    const PY = FLY + 2.3;
    wall(
      !0,
      BACK + 0.2,
      0.4,
      ix0,
      ix1,
      FLY,
      FLY + 4.4,
      [
        { a0: a + 0.9, a1: a + 2.7, y0: FLY, y1: FLY + RD, type: 'open', frame: 'arch' },
        { a0: b - 2.7, a1: b - 0.9, y0: FLY, y1: FLY + RD, type: 'open', frame: 'arch' },
        { a0: c - 1.75, a1: c - 0.85, y0: PY, y1: PY + 0.7, type: 'window' },
        { a0: c + 0.85, a1: c + 1.75, y0: PY, y1: PY + 0.7, type: 'window' },
      ],
      ['velvet', '#1d1d22'],
      ['plaster', '#cfc6b6'],
    );
    wall(!0, BACK + 0.2, 0.4, ix0, ix1, FLY + 4.4, HT, [], ['velvet', '#1d1d22'], ['brick', C.brick]);
    slab(a, P1, b, BACK + 0.4, HT + 0.3, 0.3, ['roof', '#ffffff'], ['black', '#0c0c10'], 'roof');
    // the screen: flat, flush with the front wall, wall to wall
    const sc = { id: T.id, x: c, y: SY + SH / 2, z: P1 + 0.4 + 0.005, w: SW, h: SH, ry: 0, curve: 0, room: { min: z(ix0, 0, P1 + 0.4), max: z(ix1, HT, BACK) }, hear: 24 };
    A.screens.push(sc);
    N.th.push({ ...T, screen: sc, c, ix0, ix1, x0: ix0, x1: ix1, z0: P1 + 0.4, z1: BACK, h: HT, face: 'N', blocks, aisles, xl: !0 });
    // the walls: ribbed timber to 2.2 m over the rake, jacquard fabric panels above it in the theater's colour
    for (const [f, s] of [[ix0, 1], [ix1, -1]]) {
      N.panels.push({ ax: 'z', f, s, a0: EX1 + 1.0, a1: BACK - 0.4, y0: 2.2, y1: HT - 3.5, k: 'acoustic', color: wallC, step: 3.0, fabric: 'jacquard' });
      const hasExit = s > 0 ? exW : exE;
      for (let k = 0; k < NROW + 2; k++) {
        const za = k ? R0 + ROW * (k - 1) : P1 + 0.4,
          zb = Math.min(XA, R0 + ROW * k),
          fl = k ? 0.12 + RISE * k : 0.12;
        const segs = hasExit && za < EX1 + 0.2 && zb > EX0 - 0.2 ? [[za, EX0 - 0.2], [EX1 + 0.2, zb]] : [[za, zb]];
        for (const [z0s, z1s] of segs) z1s - z0s > 0.05 && vs(Math.min(f, f + s * 0.05), fl, z0s, Math.max(f, f + s * 0.05), fl + 2.1, z1s, 'slat', '#8a6a52');
      }
    }
    // the light: dimmed house lights, light spilling from the screen over the front rows
    for (let zz = P1 + 4; zz < BACK; zz += 4) for (const x of [c - 11, c - 3.6, c + 3.6, c + 11]) lamp(x, Math.min(HT - 1.2, floorAt(zz) + 2.6), zz, 'house');
    for (const x of [c - 12, c, c + 12]) lamp(x, 4, P1 + 4.4, 'spill', x === c);
    // brass sconces up the side walls, washing the fabric with warm light
    for (let zz = R0 + 1; zz < XA; zz += 4.5) {
      const yy = floorAt(zz) + 3.3;
      lamp(ix0 + 0.15, yy, zz, 'sconce');
      lamp(ix1 - 0.15, yy, zz, 'sconce');
    }
    lamp(c, FLY + 2.8, (R0 + XA) / 2, 'aisle', !1);
    N.ledLines.push({ a, b, ix0, ix1 });
    // the projectors' beams from the ports to the screen
    N.beams.push({ from: [c - 1.3, PY + 0.35, BACK], to: [c, sc.y, sc.z + 0.05], w: SW, h: SH, screen: T.id });
    N.ports.push({ x: c - 1.3, y: PY + 0.35, z: BACK + 0.4, th: T.id }, { x: c + 1.3, y: PY + 0.35, z: BACK + 0.4, th: T.id, spare: !0 });
    // exit signs: over the fire exits, over the rear doors
    const EXM = (EX0 + EX1) / 2;
    exW && sign('exit', a + 0.42, EXH + 0.35, EXM, Math.PI / 2, 0.7, 0.26);
    exE && sign('exit', b - 0.42, EXH + 0.35, EXM, -Math.PI / 2, 0.7, 0.26);
    // outside each entrance, in the corridor: the theater's number over it, lit
    exW && sign('number', a - 0.02, EXH + 0.55, EXM, -Math.PI / 2, 1.2, 0.68, { th: T.id, n: T.n });
    exE && sign('number', b + 0.02, EXH + 0.55, EXM, Math.PI / 2, 1.2, 0.68, { th: T.id, n: T.n });
    sign('exit', a + 1.8, FLY + RD + 0.25, BACK - 0.02, Math.PI, 0.7, 0.26);
    sign('exit', b - 1.8, FLY + RD + 0.25, BACK - 0.02, Math.PI, 0.7, 0.26);
    // the theater's number over its frontage on the Promenade (lit), with the film's title under it
    sign('number', c, 4.0, P1 - 0.02, Math.PI, 1.3, 0.73, { th: T.id, n: T.n });
    sign('title', c, 3.2, P1 - 0.02, Math.PI, 10, 0.62, { th: T.id });
    // poster cases on the Promenade wall: this theater's film
    for (const x of [a + 2.2, c - 8, c + 8, b - 2.2]) N.posters.push({ x, y: 0.9, z: P1 - 0.03, ry: Math.PI, w: 1.3, h: 1.95, k: 'case', slot: __CN_TH.indexOf(T) });
    A.areas.push({ name: `Theater ${T.n}`, min: z(a, 0, P1 + 0.4), max: z(b, HT, BACK) });
  }
  // the block's cornice, over the Promenade's roof, seen from the street
  sg('cornice', { ax: 'x', f: P1, s: -1, a0: 4, a1: W - 4, y: HT + 0.3, skip: corridors.map((K) => [K.x0, K.x1]) });
  // Theaters 2 and 3 are the sites' rooms: name their fronts for callouts
  A.areas.push({ name: 'A Stage', min: z(__CN_TH[1].a + 0.4, 0, P1 + 0.4), max: z(__CN_TH[1].b - 0.4, 2, R0) }, { name: 'B Stage', min: z(__CN_TH[2].a + 0.4, 0, P1 + 0.4), max: z(__CN_TH[2].b - 0.4, 2, R0) });
  // ---------------------------------------------------------------- the corridors between the theaters
  const MID = P1 + 18;
  for (const K of corridors) {
    const { x0, x1 } = K,
      xc = (x0 + x1) / 2;
    // the side passages into the theaters: patterned carpet, deep red fabric walls over a timber dado, a dark
    // ceiling with brass downlights, sconces and lit poster cases; service concrete beyond the jog
    slab(x0, P1, x1, MID, 0.12, 0.12, ['carpet', '#5a1a24'], ['carpet', '#5a1a24']);
    slab(x0, MID, x1, PJ, 0.12, 0.12, ['concrete', '#a9a39a'], ['concrete', '#a9a39a']);
    slab(x0, P1, x1, BACK + 0.4, 4.4, 0.25, ['roof', '#ffffff'], ['dark', '#1a1518'], 'roof');
    // (over the opening onto the Promenade: the wall closed up to the Promenade's roof)
    vs(x0, 4.4, P1, x1, 5.1, P1 + 0.4, 'velvet', '#5b1a22');
    for (const [f, sd] of [[x0, 1], [x1, -1]]) N.panels.push({ ax: 'z', f, s: sd, a0: P1 + 0.5, a1: MID - 0.4, y0: 0.12, y1: 1.1, k: 'dado', skip: [[EX0 - 0.15, EX1 + 0.15]] });
    // a jog halfway (no straight line from the Promenade to the yard)
    bx(x0, 0, MID - 0.2, xc + 0.3, 4.15, MID + 0.2, 'wall', 'velvet', '#3a171c', { pen: 1 });
    bx(xc - 0.3, 0, MID + 3.6, x1, 4.15, MID + 4.0, 'wall', 'plaster', '#cfc6b6', { pen: 1 });
    for (const zz of [P1 + 1.5, P1 + 8.5, MID - 4.5]) lamp(xc, 4.1, zz, 'can', zz === P1 + 8.5);
    for (const zz of [P1 + 2.6, P1 + 11.5]) lamp(x0 + 0.15, 2.4, zz, 'sconce'), lamp(x1 - 0.15, 2.4, zz, 'sconce');
    for (let zz = MID + 8; zz < PJ - 1; zz += 10) lamp(xc, 4.1, zz, 'tube', !1);
    // lit poster cases on the passage walls (past the theaters' doorways)
    N.posters.push({ x: x0 + 0.03, y: 0.95, z: P1 + 9.6, ry: Math.PI / 2, w: 1.1, h: 1.65, k: 'case', slot: corridors.indexOf(K) + 1 }, { x: x1 - 0.03, y: 0.95, z: P1 + 9.6, ry: -Math.PI / 2, w: 1.1, h: 1.65, k: 'case', slot: corridors.indexOf(K) + 2 });
    // clutter: film cans, a cleaning cart
    item('filmcans', { x: x1 - 0.5, z: MID + 9.5 });
    item('cleaning', { x: x0 + 0.5, z: MID + 5.5 });
    cb(x1 - 0.85, 0.12, MID + 9.1, x1 - 0.15, 0.95, MID + 9.9, 'prop', 'paint', { pen: 2 });
    cb(x0 + 0.15, 0.12, MID + 5.0, x0 + 0.85, 1.05, MID + 6.0, 'prop', 'paint', { pen: 2 });
    A.areas.push({ name: K.name, min: z(x0, 0, P1), max: z(x1, 5, PJ) });
  }
  // the Promenade's south wall where a corridor meets it is open: frames over the openings
  for (const K of corridors) R.openings.push({ alongX: !0, f: P1 + 0.2, t: 0.4, a: K.x0, w: K.x1 - K.x0, y0: 0.12, y1: 4.4, type: 'open', frame: 'deco', out: 0 });
  // ---------------------------------------------------------------- the projection level (z 102.2-106.8, y 8.22)
  const PR = FLY + 4.4;
  {
    // under it, back-of-house storage (solid) beside the corridors
    for (const T of __CN_TH) bx(T.a, 0, BACK + 0.4, T.b, FLY - 0.25, PJ, 'wall', 'concrete', '#b9b2a6', { pen: 0 });
    slab(4, BACK + 0.4, W - 4, PJ, FLY, 0.25, ['plate', '#9da3a6'], ['concrete', '#b0aaa0']);
    slab(4, BACK + 0.4, W - 4, PJ + 0.4, PR, 0.3, ['roof', '#ffffff'], ['concrete', '#a8a29a'], 'roof');
    // projectors at the ports, film platters, booth benches
    for (const p of N.ports) {
      cb(p.x - 0.6, FLY, p.z + 0.6, p.x + 0.6, FLY + 2.5, p.z + 1.9, 'prop', 'paint', { pen: 2 });
      item('projector', { x: p.x, y: FLY, z: p.z + 1.25, th: p.th, ly: p.y - FLY });
      if (p.spare) {
        // the theater's control desk beside the spare port: the film's control panel (Use)
        cb(p.x - 0.7, FLY, p.z + 0.55, p.x + 0.7, FLY + 1.0, p.z + 1.25, 'prop', 'paint', { pen: 2 });
        item('console', { x: p.x, y: FLY, z: p.z + 0.9, th: p.th });
        N.consoles.push({ x: p.x, y: FLY, z: p.z + 1.7, th: p.th });
        continue;
      }
      cb(p.x - 3.4, FLY, p.z + 0.6, p.x - 1.8, FLY + 1.05, p.z + 2.2, 'prop', 'paint', { pen: 2 });
      item('platter', { x: p.x - 2.6, y: FLY, z: p.z + 1.4 });
      lamp(p.x + 1.3, PR - 0.5, p.z + 2.2, 'booth', !1);
    }
    for (let x = 10; x < W - 6; x += 20) lamp(x, PR - 0.5, BACK + 2.8, 'tube', Math.abs(x - 90) < 10);
    // the projection level is a working space: steel shelving of film stock along the back wall, storage carts,
    // boxes; cover for the CTs' rotation along it (kept clear of their spawn, x 73-96)
    const [T1, , , T4] = __CN_TH;
    for (const x of [T1.a + 14, T1.a + 20.5, __CN_TH[1].a + 4.5, __CN_TH[2].b - 4.5, T4.a + 8, T4.a + 14.5]) {
      model('steel_frame_shelves_02', x, FLY, PJ - 0.35, Math.PI, 1, { box: [x, PJ - 0.35, 0.3, 0.26, 2.1] });
      R.models.push({ id: 'cardboard_box_01', x: x + 0.05, y: FLY + 1.05, z: PJ - 0.4, ry: 0.3, s: 1 }, { id: 'cardboard_box_01', x: x - 0.1, y: FLY + 1.62, z: PJ - 0.38, ry: -0.2, s: 1 });
    }
    for (const [x, ry] of [[(corridors[0].x0 + corridors[0].x1) / 2, 0.1], [(corridors[2].x0 + corridors[2].x1) / 2, -0.1], [T1.a + 5.5, 0], [T4.b - 5.5, 0]]) model('industrial_storage_cart', x, FLY, PJ - 0.62, ry, 1, { box: [x, PJ - 0.62, 0.8, 0.56, 1.35] });
    for (const [x, zz] of [[corridors[0].x1 - 0.6, PJ - 0.6], [corridors[0].x1 - 0.1, PJ - 1.1], [corridors[2].x0 + 0.4, PJ - 0.6]]) model('cardboard_box_01', x, FLY, zz, 0.4, 1, { box: [x, zz, 0.22, 0.22, 0.36] });
    A.areas.push({ name: 'Projection Booth', min: z(4, FLY - 0.4, BACK + 0.4), max: z(W - 4, PR - 0.3, PJ) });
  }
  // the south facade: brick, ground-floor openings to the corridors, windows and doors on the projection level
  // (steel stairs down to the yard)
  const STAIRS = [[14, 'E'], [96, 'W'], [140, 'W']];
  wall(
    !0,
    PJ + 0.2,
    0.4,
    4,
    W - 4,
    0,
    PR + 0.3,
    [
      ...corridors.map((K) => ({ a0: K.x0 + 0.2, a1: K.x1 - 0.2, y0: 0.12, y1: 3.4, type: 'open', frame: 'steel' })),
      ...STAIRS.map(([x]) => ({ a0: x - 0.8, a1: x + 0.8, y0: FLY, y1: FLY + 2.3, type: 'open', frame: 'steel' })),
      ...[24, 34, 56, 70, 110, 120, 150, 158].map((x) => ({ a0: x - 1.2, a1: x + 1.2, y0: FLY + 1.1, y1: FLY + 3.1, type: 'window' })),
    ],
    ['plaster', '#d8d2c6'],
    ['brick', C.brick],
  );
  // ---------------------------------------------------------------- the yard (behind the south facade): dock and staff lot
  {
    const Y0 = PJ + 0.4;
    vs(0, 0.004, Y0, W, 0.012, D, 'asphalt', C.road);
    // the loading dock: a raised concrete apron along the facade behind Theater 2, bumpers, a ramp
    bx(50, 0, Y0, 68, 1.1, Y0 + 3, 'floor', 'concrete', '#c2bbb0');
    steps(68, Y0, 70.8, Y0 + 3, 'W', 0, 1.1, 'concrete', '#c2bbb0', { solid: !0 });
    item('dock', { x0: 50, x1: 68, z: Y0 + 3, y: 1.1 });
    w.static('car-van', 59, Y0 + 6, Math.PI / 2, [4.8, 2.2, 2.1]);
    w.static('car-van', 54, Y0 + 6, Math.PI / 2, [4.8, 2.2, 2.1]);
    // steel stairs from the yard to the projection level's three doors (a landing at the top)
    for (const [x, dir] of STAIRS) {
      const len = (FLY / 0.2) * 0.28,
        xa = dir === 'E' ? x - 0.8 - len : x + 0.8,
        xb = xa + len;
      steps(xa, Y0, xb, Y0 + 1.4, dir, 0, FLY, 'plate', '#6b7378');
      bx(x - 0.8, FLY - 0.2, Y0, x + 0.8, FLY, Y0 + 1.4, 'floor', 'plate', '#6b7378');
      rail(xa, Y0 + 1.42, xb, Y0 + 1.42, 0, 1.0, { stair: dir === 'E' ? [0, FLY] : [FLY, 0] });
      rail(x - 0.8, Y0 + 1.42, x + 0.8, Y0 + 1.42, FLY, 1.0);
      lamp(x, FLY + 2.8, Y0 + 0.2, 'flood', !1, !1);
    }
    // dumpsters, crates, barrels, the staff cars
    for (const [x, zz] of [[22, Y0 + 2], [26, Y0 + 2], [116, Y0 + 2]]) bx(x - 1.0, 0, zz - 0.8, x + 1.0, 1.5, zz + 0.8, 'prop', 'paint', '#2f5a3f', { pen: 2 }), item('dumpster', { x, z: zz });
    for (const [x, zz] of [[89.2, Y0 + 3.6], [90.6, Y0 + 3.6], [89.9, Y0 + 4.9]]) w.crate(x, zz, 1.1, 1.1, 0, '#9a7a52');
    for (const [x, zz] of [[104, Y0 + 6.6], [106.2, Y0 + 6.6]]) w.crate(x, zz, 1.2, 1.2, 0, '#8a6a46');
    w.barrel(46.8, Y0 + 6.6);
    w.barrel(47.6, Y0 + 7.3);
    // (nose in to the bays, as the lines are painted)
    car(10.1, Y0 + 10.6, 0, [2.8, 2.8, 2.85]);
    car(15.6, Y0 + 10.6, Math.PI, [1.9, 2.1, 1.6]);
    car(W - 14.9, Y0 + 10.6, 0, [3.2, 2.9, 2.35]);
    car(W - 9.4, Y0 + 10.6, Math.PI, [1.4, 1.5, 2.0]);
    for (const xs of [6, W - 19]) for (let x = xs; x <= xs + 14; x += 2.75) R.lines.push({ x0: x - 0.05, z0: Y0 + 8.2, x1: x + 0.05, z1: Y0 + 13, c: '#e8e6df' });
    // the back fence: a block wall
    bx(0, 0, D - 0.4, W, 2.6, D, 'wall', 'concrete', '#b9b2a6', { pen: 0 });
    for (let x = 30; x < W - 10; x += 30) {
      bx(x - 0.13, 0, D - 4 - 0.13, x + 0.13, 6.4, D - 4 + 0.13, 'prop', 'paint', '#5d646a', { pen: 2 });
      R.poles.push({ k: 'flood', x, z: D - 4, h: 6.6, ry: Math.PI });
      lamp(x, 6.4, D - 4, 'flood', !0, !1);
    }
    A.areas.push({ name: 'Loading Dock', min: z(44, 0, Y0), max: z(76, 4, Y0 + 9.6) }, { name: 'Staff Lot', min: z(0, 0, Y0), max: z(W, 4, D) });
  }
  // the lounge's screen joins the theaters'
  A.screens.push(...A.__luxScreens);
  A.areas.push({ name: 'Gardens', min: z(0, 0, 8), max: z(116, 4, FAC) }, { name: 'Street', min: z(0, 0, 0), max: z(W, 4, 8) }, { name: 'Box Office', min: z(50, 0, 10), max: z(70, 4, 20) });
  // ---------------------------------------------------------------- objectives and spawns
  // The round, as on the classic maps (the numbers: docs/maps/cinema.md):
  //   - Terrorists arrive on the street; Counter-Terrorists spawn on the projection level, above and behind the
  //     two middle theaters (2 and 3), where the bomb sites are: the front of each (the stage and the pit).
  //   - CTs reach a site through the rear doors, across the top cross-aisle, and hold it from the rake, looking
  //     down. They rotate site to site along the projection level.
  //   - Terrorists come in from the side passages: West passage -> A (Theater 2), East passage -> B (Theater 3),
  //     and the Mid passage between the two, a doorway into each site: the contested connector. CTs can reach
  //     Mid too, down the projection level's stairs and through the yard.
  //   - Flanks: Theaters 1 and 4 (their side doorways from the West / East passages, up their aisles to the
  //     projection level, behind the CTs); the yard behind the building, from the passages' far ends.
  const MC = (corridors[1].x0 + corridors[1].x1) / 2;
  A.spawns.T = [[52, 3], [56, 3], [60, 2.2], [64, 2.2], [68, 3], [54, 6.5], [58, 7], [62, 7], [66, 6.5], [70, 6]].map(([x, zz]) => z(x, 0, zz));
  A.spawns.CT = [[-10.5, 3.4], [-7, 3.4], [-3.5, 3.4], [3.5, 3.4], [7, 3.4], [10.5, 3.4], [-9, 4.5], [-5, 4.5], [5, 4.5], [9, 4.5]].map(([dx, dz]) => z(MC + dx, FLY, BACK + dz));
  A.spawnZones = { T: { min: z(48, 0, 1), max: z(72, 0, 8) }, CT: { min: z(MC - 11.5, FLY, BACK + 2.6), max: z(MC + 11.5, FLY, PJ) } };
  A.spawnFaceCenter = !0;
  const site = (T, nm, inT, inMid) => {
    const { a, b } = T,
      c = (a + b) / 2,
      zw = R0 + ROW * 9;
    return {
      name: nm,
      // (heights -0.5 to 0.75: the stage and the pit count; the middle is at the pit's floor, where the bots
      // aim to plant: with 0 to 1 their goal snapped to the front row's step, just outside the site)
      min: z(a + 4.4, -0.5, P1 + 0.4),
      max: z(b - 4.4, 0.75, R0 - 0.4),
      // where Terrorists gather before they go in: in the corridors, past the doorways
      stage: [z(inT, 0.12, EX1 + 2), z(inMid, 0.12, EX1 + 2)],
      // where CTs watch from: the top of the rake and its aisles
      watch: [z(c, FLY + 1.3, XA + 1.4), z(a + 1.3, floorAt(zw), zw), z(b - 1.3, floorAt(zw), zw), z(c, floorAt(R0 + ROW * 7.4) + 1.3, R0 + ROW * 7.4)],
      hold: [z(c, 0.45, STAGE - 1.0), z(a + 5.5, 0.12, R0 - 1.4), z(b - 5.5, 0.12, R0 - 1.4)],
    };
  };
  const cx = (K) => (K.x0 + K.x1) / 2;
  A.sites = [site(__CN_TH[1], 'A', cx(corridors[0]), MC), site(__CN_TH[2], 'B', cx(corridors[2]), MC)];
  A.areas.push({ name: 'Bombsite A', min: A.sites[0].min, max: A.sites[0].max }, { name: 'Bombsite B', min: A.sites[1].min, max: A.sites[1].max });
  // (no props on the sites: the front rows of seats and the stage's edge are the cover)
  const TC = __CN_TH.map((T) => (T.a + T.b) / 2);
  A.flagPoints = [
    { name: 'A', pos: z(60, 0.12, 34.5) },
    { name: 'B', pos: z(TC[1], 0.12, R0 - 3) },
    { name: 'C', pos: z(TC[2], 0.12, R0 - 3) },
  ];
  A.tdmSpawns = [
    [60, 4], [20, 18], [100, 18], [60, 21], [45, 30], [75, 30], [35, 36], [85, 36], [26, 33], [103, 34],
    [20, PM], [100, PM], [150, PM], [TC[0], R0 - 3], [TC[3], R0 - 3], [TC[1], R0 - 3], [TC[2], R0 - 3], [cx(corridors[0]), P1 + 14], [MC, MID + 8], [cx(corridors[2]), P1 + 14], [MC, PJ + 8],
  ].map(([x, zz]) => z(x, 0.12, zz));
  A.poi = [z(60, 0.12, 34), z(60, LB.my, 43), z(TC[0], 0.45, STAGE - 1.5), z(TC[3], 0.45, STAGE - 1.5), z(TC[0], FLY, XA + 1.5), z(TC[3], FLY, XA + 1.5), z(MC, 0.12, MID - 2), z(cx(corridors[0]), 0.12, MID - 2), z(cx(corridors[2]), 0.12, MID - 2), z(MC, FLY, BACK + 3), z(24.5, 0.12, 36), z(103, 0.12, 34), z(60, 0.15, 17)];
  // (no solid open leaves here, unlike Blackwater: these doors stand in the bots' routes, and the walk grid
  // does not know where a leaf rests, so bots walked into open leaves and stuck)
  // every visual is drawn by the kit (real materials); the core's flat boxes are skipped
  for (const v of A.visuals) v.__hidden = 1;
  try {
    __vegPlan(A);
  } catch (e) {
    A.__veg = [];
  }
  return A;
}
XE.cinema = __cinemaBuild;
// no generated skyline of block towers round the cinema (the street's own buildings close the view)
{
  const coreSky = PiA;
  PiA = function () {
    return aw().id === 'cinema' ? [] : coreSky.apply(this, arguments);
  };
}
BD.splice(Math.max(0, BD.findIndex((x) => x.id === 'prison')), 0, {
  id: 'cinema',
  name: 'Bayou Palace Cinemas',
  blurb:
    'An art-deco movie palace grown into a six-screen multiplex: the marquee and the Grand Lobby, the concession stand and the mezzanine, six theaters: four Palace XL auditoriums with wall-to-wall, floor-to-ceiling screens and two luxury rooms with recliners, the Velvet Room and the Starlight, and the projection level over them. Every screen plays its own film.',
  size: 'Large',
  maxPlayers: 24,
});
