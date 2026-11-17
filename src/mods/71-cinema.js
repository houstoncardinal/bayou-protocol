/* ===== Bayou Protocol mod: Bayou Palace Cinemas (a movie-palace multiplex) ===== */
// A 1930s art-deco movie palace on a city block, grown into a six-screen multiplex, built at real scale
// (metres; x east, z south). Every screen plays its own film: what plays is set in the /admin dashboard
// (70-screens.js reads it), and every player in a room sees the same frame.
//
//   North   the street, the parking lot and the plaza, the box office, the marquee and the PALACE blade sign
//           (Terrorists arrive here)
//   Middle  the Grand Lobby (marble, chandeliers, the concession stand, a mezzanine reached by two stairs),
//           the West Hall (arcade) and the Velvet Room (theater 5), the East Hall and the Starlight (theater 6)
//           the Promenade: the carpeted hall along the auditoriums' fronts
//           (the Velvet Room and the Starlight are full luxury theaters: recliners, 17.4 m screens)
//   South   Theaters 1-4: stadium seating (14 rows rising 5.9 m), screens 15 m wide, a stage, curtains; you
//           enter at the front beside the screen (behind a light-lock wall), or at the top from the projection
//           level. Three service corridors run between them from the Promenade to the yard, with fire exits
//           into each theater's front
//           the projection level over the back of the theaters (projectors, ports looking at the screens),
//           reached by steel stairs from the yard
//   Back    the loading dock and staff lot (Counter-Terrorists start here)
// Bomb Defusal: A is the front of Theater 1 (the stage and the pit), B the front of Theater 4. Counter-
// Terrorists reach both from the top (the projection level) or the fire exits; Terrorists through the
// Promenade's entrances or the corridors.
//
// Drawing: this map uses the prison's drawing pipeline (65-prison-view.js) with its own kit (72-cinema-view.js):
// every box visual names a surface and is drawn with Poly Haven materials; the light volume gives each room its
// own light; what is not a box (seats, curtains, the screens' frames, chandeliers, the marquee, posters, the
// concession stand, projectors) is recorded in A.__cn and modelled by 72-cinema-view.js inside its collision.
const __CN_TH = [
  { id: 't1', n: 1, a: 4, b: 28.5, seat: '#8a1c26', wall: '#4b1519', trim: '#c9a45a', name: 'Crimson' },
  { id: 't2', n: 2, a: 32.5, b: 57, seat: '#24427f', wall: '#18233f', trim: '#c9a45a', name: 'Royal' },
  { id: 't3', n: 3, a: 63, b: 87.5, seat: '#1e604a', wall: '#13342b', trim: '#d8b46a', name: 'Emerald' },
  { id: 't4', n: 4, a: 91.5, b: 116, seat: '#61306f', wall: '#2c1636', trim: '#c9a45a', name: 'Plum' },
];
// the auditoriums' section (z): promenade 46-53, screen wall 53, stage to 55.6, pit to 61, 14 rows of 1.5 m
// rising 0.42 m each to 82, the cross-aisle (82-85) and the rear wall, the projection level (85.4-90) at 6.3 m
const __CN = { FAC: 26, P0: 46, P1: 53, STAGE: 55.6, R0: 61, ROW: 1.5, RISE: 0.42, NROW: 14, XA: 82, BACK: 85, PJ: 90, FLY: 6.3, CEIL: 11.5 };
const __CN_PHYS = (s) => (/paint|plate|stainless|dark|gold|black/.test(s) ? 'metal' : /wood|woodp|parquet/.test(s) ? 'wood' : /grass/.test(s) ? 'dirt' : 'concrete');
function __cinemaBuild() {
  const w = new Po(),
    A = w.m,
    W = 120,
    D = 108;
  A.id = 'cinema';
  A.name = 'Bayou Palace Cinemas';
  A.w = W;
  A.d = D;
  // (no generated city backdrop: its block towers looked fake; the street's own buildings close the view)
  A.backdrop = 'none';
  A.physProps = [];
  A.__view = __PR_KITS.cinema;
  const { FAC, P0, P1, STAGE, R0, ROW, RISE, NROW, XA, BACK, PJ, FLY, CEIL } = __CN;
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
  const N = (A.__cn = { th: [], seats: [], steps: [], curtains: [], signs: [], beams: [], items: [], posters: [], columns: [], rails: [], stairs: [], bulbs: [], panels: [], ports: [], neighbours: [], rowSigns: [], ledLines: [], consoles: [], exitDrapes: [], facades: [] });
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
  vs(-40, -0.2, -40, W + 40, 0, D + 40, 'concrete', '#a7a196');
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
    [124, 150, 12.6, 'brick', '#ffffff', ''],
  ];
  for (const [x0, x1, h, sf, col, shop] of FB) {
    vs(x0, 0, -22, x1, h, -5.2, sf, col);
    N.facades.push({ x0, x1, z: -5.2, h, shop, sf });
  }
  // café tables on the far pavement
  for (const x of [0.5, 4, 7.5, 11]) R.models.push({ id: 'outdoor_table_chair_set_01', x, y: 0.15, z: -3.4, ry: Math.PI / 2, s: 1 });
  // the neighbours at the sides and behind (brick warehouses), and the alleys between them and the cinema
  vs(-30, 0, 0, -0.2, 12, D + 30, 'brick', '#ffffff');
  vs(W + 0.2, 0, 0, W + 30, 12, D + 30, 'brick', '#ffffff');
  vs(-30, 0, D + 0.2, W + 30, 9, D + 30, 'brick', '#e8dccb');
  N.neighbours.push({ x0: 0, x1: 0, z0: 0, z1: D, h: 12, face: 'E', at: -0.2 }, { x0: W, x1: W, z0: 0, z1: D, h: 12, face: 'W', at: W + 0.2 });
  // the side alleys are fenced off: the cinema fills the block from x 4 to 116
  bx(0, 0, FAC, 4, 9, PJ + 0.4, 'wall', 'brick', '#d9cbb8', { pen: 0 });
  bx(W - 4, 0, FAC, W, 9, PJ + 0.4, 'wall', 'brick', '#d9cbb8', { pen: 0 });
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
  // bollards along the kerb (granite posts), hydrants, bins, planter boxes on the plaza
  for (let x = 2; x < W; x += 3.2) (x < 38 || x > 82 || x < 54 || x > 66) && (cb(x - 0.15, 0.15, 8.35, x + 0.15, 1.05, 8.65, 'prop', 'granite', { pen: 4 }), item('bollard', { x, z: 8.5 }));
  for (const [x, ry] of [[26, Math.PI], [94, Math.PI]]) model('fire_hydrant', x, 0.15, 9.1, ry, 1, { box: [x, 9.1, 0.18, 0.16, 0.8] });
  for (const x of [36.2, 83.8]) model('metal_trash_can', x, 0.15, 9.4, 0, 1, { box: [x, 9.4, 0.25, 0.25, 0.9] });
  for (const [x, zz] of [[44, 10.2], [76, 10.2], [44, 23.6], [76, 23.6]]) model('planter_box_01', x, 0.15, zz, 0, 2.2, { box: [x, zz, 1.0, 0.46, 0.92] });
  // street lamps along the pavements
  for (const [x, zz] of [[8, 9.6], [30, 9.6], [90, 9.6], [112, 9.6], [20, 18.6], [100, 18.6]]) {
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
    lamp(60, 2.5, 17, 'booth');
    for (let x = x0 - 0.35; x <= x1 + 0.36; x += 0.35) N.bulbs.push([x, 2.68, z0 - 0.72, 0]);
    R.models.push({ id: 'CashRegister_01', x: 59, y: 1.1, z: 15.95, ry: Math.PI, s: 1 }, { id: 'CashRegister_01', x: 61.2, y: 1.1, z: 15.95, ry: Math.PI, s: 1 });
    item('ropes', { pts: [[55.6, 11.4], [55.6, 14.6], [64.4, 14.6], [64.4, 11.4]] });
  }
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
  item('compass', { x: 60, z: 33.5, y: 0.125, r: 3.2 });
  // the lobby's roof: a coffered ceiling (drawn), the roof over it
  slab(40, FAC, 80, P0, LB.h + 0.35, 0.35, ['roof', '#ffffff'], ['plaster', '#e2d6bf'], 'roof');
  item('coffers', { x0: 40.4, x1: 79.6, z0: 26.4, z1: 40.4, y: LB.h });
  // west and east lobby walls (to the halls): an archway each, wood panelling below a dado, stucco above
  wall(!1, 40.2, 0.4, FAC + 0.4, P0, 0, LB.h, [{ a0: 29.5, a1: 33.5, y0: 0.12, y1: 3.9, type: 'open', frame: 'arch' }], ['plaster', '#d7c7a8'], ['stucco', C.lobbyWall]);
  wall(!1, 79.8, 0.4, FAC + 0.4, P0, 0, LB.h, [{ a0: 29.5, a1: 33.5, y0: 0.12, y1: 3.9, type: 'open', frame: 'arch' }], ['stucco', C.lobbyWall], ['plaster', '#d7c7a8']);
  for (const [x, s] of [[40.4, 1], [79.6, -1]]) N.panels.push({ ax: 'z', f: x, s, a0: FAC + 0.4, a1: P0, y0: 0.12, y1: 1.3, k: 'dado' });
  N.panels.push({ ax: 'x', f: FAC + 0.4, s: 1, a0: 40.4, a1: 79.6, y0: 0.12, y1: 1.3, k: 'dado', skip: [[52.2, 67.8], [42.5, 49.5], [70.5, 77.5]] });
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
  for (const [x, zz] of [[46.6, 27.2], [73.4, 27.2]]) model('metal_trash_can', x, 0.12, zz, 0, 1, { box: [x, zz, 0.25, 0.25, 0.9] });
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
  for (const [x, ry] of [[40.42, Math.PI / 2], [79.58, -Math.PI / 2]]) R.models.push({ id: 'fancy_picture_frame_01', x, y: 5.6, z: 31.5, ry, s: 3.2, frame: 1 });
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
  // ---------------------------------------------------------------- the two luxury theaters
  // The Velvet Room (screen 5, x 4-30) and The Starlight (screen 6, x 90-116, its mirror image): leather
  // recliners on five wide tiers, a 15.2 m screen across the front wall (curved a little), velvet drapes down
  // the side walls, brass sconces; the Velvet Room deep red under a dark ceiling, the Starlight navy under a
  // star-field. Entrances at the front corners, under the screen: from the halls and from the Promenade.
  const lux = (o) => {
    const M = (x) => (o.mirror ? 120 - x : x),
      sw = (a, b) => (o.mirror ? [b, a] : [a, b]),
      x0 = Math.min(M(4.4), M(29.6)),
      x1 = Math.max(M(4.4), M(29.6)),
      z0 = FAC + 0.4,
      z1 = P0 - 0.2,
      H = 11.9,
      face = o.mirror ? 'W' : 'E';
    slab(Math.min(M(4), M(30)), FAC, Math.max(M(4), M(30)), P0, 0.12, 0.12, ['carpet', o.carpet], ['carpet', o.carpet]);
    slab(Math.min(M(4), M(30)), FAC, Math.max(M(4), M(30)), P0, H + 0.3, 0.3, ['roof', '#ffffff'], ['black', '#0a0b10'], 'roof');
    wall(!1, M(4.2), 0.4, FAC, P0, 0, H, [], ...sw(['stucco', C.stucco], ['velvet', o.wall]));
    // the screen wall: no openings (the room is entered through its side wall from the Promenade)
    wall(!1, M(30.2), 0.4, FAC + 0.4, P0, 0, H, [], ...sw(['black', '#0b0b0d'], ['plaster', '#d7c7a8']));
    // tiers: 5, each 2.6 m deep, rising 0.42 m, to the back walkway
    const tiers = 5,
      dep = 2.6,
      front = 22.2;
    for (let r = 0; r < tiers; r++) {
      const xa = front - dep * (r + 1),
        xb = front - dep * r,
        top = 0.12 + RISE * (r + 1);
      bx(M(xa), 0, z0, M(xb), top, z1, 'floor', 'carpet', o.carpet);
      for (const [za, zb] of [[z0 + 1.3, 35.4], [37.0, z1 - 1.3]]) {
        cb(M(xa + 0.15), top, za, M(xa + 1.15), top + 1.05, zb, 'prop', 'leather', { pen: 2.5 });
        N.seats.push({ ax: 'z', a0: za, a1: zb, f: M(xa + 0.65), y: top, face, color: o.seat, kind: 'recliner', n: 5, d: 1.0, th: o.id });
      }
    }
    bx(M(4.4), 0, z0, M(front - dep * tiers), 0.12 + RISE * (tiers + 1), z1, 'floor', 'carpet', o.carpet);
    // the screen across the front wall, 2.9 m up (over the entrance), curved a little
    // wall to wall (19 m) and from just above the floor to the ceiling, 16:9, curved a little
    const sc = { id: o.id, x: M(30.0), y: 0.85 + 5.345, z: 36.1, w: 19.0, h: 10.69, curve: 0.5, ry: o.mirror ? Math.PI / 2 : -Math.PI / 2, room: { min: z(x0, 0, z0), max: z(x1, H, z1) }, hear: 14 };
    N.th.push({ id: o.id, n: o.n, name: o.name, screen: sc, x0, x1, z0, z1, h: H, face, seat: o.seat, wall: o.wall, trim: C.gold, stars: !!o.stars, lux: !0 });
    // drapes down both side walls, between the sconces; fabric panels over the screen wall's sides
    for (const [f, sd] of [[z0, 1], [z1, -1]]) {
      for (let k = 0; k < 5; k++) {
        const a = Math.min(M(6 + k * 4.4), M(9.6 + k * 4.4)),
          b = Math.max(M(6 + k * 4.4), M(9.6 + k * 4.4));
        N.curtains.push({ ax: 'x', f: f + sd * 0.06, s: sd, a0: a, a1: b, y0: 0.12 + RISE * Math.max(0, 5 - k), y1: H - 0.6, color: o.drape });
      }
    }
    for (const x of [8, 12.4, 16.8, 21.2, 25.6])
      for (const [zz, sd] of [[z0 + 0.25, 1], [z1 - 0.25, -1]]) lamp(M(x - 0.5), 0.12 + RISE * Math.max(0, Math.min(6, Math.ceil((front - x) / dep))) + 3.0, zz, 'sconce');
    lamp(M(26), 6, 36, 'aisle', !0);
    for (const x of [8, 15, 22]) for (const zz of [30, 36, 42]) lamp(M(x), 8.5, zz, 'house');
    for (const zz of [30, 36, 42]) lamp(M(27.5), 3.5, zz, 'spill');
    // the control desk for this room: at the back, under the projection window
    cb(Math.min(M(4.5), M(5.3)), 0.12 + RISE * 6, 34.8, Math.max(M(4.5), M(5.3)), 0.12 + RISE * 6 + 1.0, 37.4, 'prop', 'paint', { pen: 2 });
    item('console', { x: M(4.9), y: 0.12 + RISE * 6, z: 36.1, th: o.id, ry: o.mirror ? -Math.PI / 2 : Math.PI / 2 });
    N.consoles.push({ x: M(5.9), y: 0.12 + RISE * 6, z: 36.1, th: o.id });
    // the room's name over its Promenade entrance, lit
    sign('title', M(28.15), 3.35, P0 + 0.42, 0, 4.4, 0.6, { th: o.id });
    sign('exit', M(28.15), 3.25, P0 - 0.25, Math.PI, 0.7, 0.26);
    N.exitDrapes.push({ ax: 'x', f: P0, s: -1, a0: Math.min(M(26.9), M(29.4)), a1: Math.max(M(26.9), M(29.4)), y0: 0.12, y1: 2.8, color: o.drape });
    A.areas.push({ name: o.name, min: z(Math.min(M(4), M(30)), 0, FAC), max: z(Math.max(M(4), M(30)), H, P0) });
    return sc;
  };
  A.__luxScreens = [
    lux({ id: 't5', n: 5, name: 'The Velvet Room', mirror: !1, carpet: '#3a1418', seat: '#6a1a1c', wall: '#2a0f12', drape: '#5a1016' }),
    lux({ id: 'lounge', n: 6, name: 'The Starlight', mirror: !0, carpet: '#161c38', seat: '#1f2c5c', wall: '#121833', drape: '#1c2a5e', stars: !0 }),
  ];
  item('neon', { x: 92.0, y: 3.95, z: P0 + 0.44, ry: 0, text: 'Starlight', w: 3.2, h: 0.7 });
  item('neon', { x: 28.0, y: 3.95, z: P0 + 0.44, ry: 0, text: 'Velvet', w: 3.0, h: 0.7, color: '#ff6a7a' });
  // the walls between the halls and the Promenade, with wide openings
  wall(!0, P0 + 0.2, 0.4, 4, 40, 0, 13.5, [{ a0: 26.9, a1: 29.4, y0: 0.12, y1: 2.8, type: 'open' }, { a0: 31.2, a1: 38.8, y0: 0.12, y1: 3.6, type: 'open' }], ['velvet', '#2a0f12'], ['velvet', '#5b1a22']);
  wall(!0, P0 + 0.2, 0.4, 80, 116, 0, 13.5, [{ a0: 81.2, a1: 88.8, y0: 0.12, y1: 3.6, type: 'open' }, { a0: 90.6, a1: 93.1, y0: 0.12, y1: 2.8, type: 'open' }], ['velvet', '#121833'], ['velvet', '#5b1a22']);
  // ---------------------------------------------------------------- the Promenade (z 46-53, x 4-116)
  {
    const H = 4.8;
    slab(4, P0, 116, P1, 0.12, 0.12, ['carpet', C.carpet], ['carpet', C.carpet]);
    slab(4, P0, 116, P1, H + 0.3, 0.3, ['roof', '#ffffff'], ['plaster', '#e2d6bf'], 'roof');
    // a terrazzo border either side of the carpet runner
    vs(4.4, 0.121, P0 + 0.4, 115.6, 0.125, P0 + 0.9, 'terrazzo', '#d9d0c0');
    vs(4.4, 0.121, P1 - 0.9, 115.6, 0.125, P1 - 0.4, 'terrazzo', '#d9d0c0');
    wall(!1, 4.2, 0.4, P0, P1, 0, H, [], ['stucco', C.stucco], ['velvet', '#5b1a22']);
    wall(!1, 115.8, 0.4, P0, P1, 0, H, [], ['velvet', '#5b1a22'], ['stucco', C.stucco]);
    // lamps: a coved light down the middle, sconces between the theaters' doors
    for (let x = 12; x < 112; x += 8) lamp(x, H - 0.25, 49.5, 'cove', x % 32 === 12);
    for (let x = 7; x < 114; x += 4.5) lamp(x, 2.2, 49.5, 'fill');
    // arched screens across the Promenade (no 110 m sightline): an archway in each, alternately north and south
    for (const [x, n] of [[24, 1], [50, 0], [70, 0], [96, 1]]) {
      const [o0, o1] = n ? [P0 + 0.4, P0 + 4.0] : [P1 - 3.6, P1];
      wall(!1, x, 0.4, P0 + 0.4, P1, 0, H, [{ a0: o0, a1: o1, y0: 0.12, y1: 4.2, type: 'open', frame: 'arch' }], ['velvet', '#5b1a22'], ['velvet', '#5b1a22']);
    }
    for (const x of [16.25, 44.75, 75.25, 103.75]) lamp(x, 2.8, P1 - 0.45, 'sconce');
    for (const [x, sl] of [[8, 0], [13.5, 1], [19.5, 2], [47.8, 3], [53, 4], [67, 5], [72.2, 0], [92, 1], [99.5, 2], [111, 3]]) N.posters.push({ x, y: 0.9, z: P0 + 0.42, ry: 0, w: 1.3, h: 1.95, k: 'case', slot: sl });
    for (const x of [16, 60, 102]) cb(x - 0.9, 0.12, P0 + 0.55, x + 0.9, 0.58, P0 + 1.05, 'prop', 'woodp', { pen: 3 }), item('bench', { x, z: P0 + 0.8, y: 0.12, ry: 0, w: 1.8 });
    for (const x of [8, 112]) model('potted_plant_02', x, 0.12, P0 + 0.9, 0, 1.1, { box: [x, P0 + 0.9, 0.35, 0.35, 1.1] });
    for (const x of [36.4, 83.6]) model('potted_plant_04', x, 0.12, P0 + 0.75, 0, 3.6, { box: [x, P0 + 0.75, 0.3, 0.3, 0.9] });
    A.areas.push({ name: 'Promenade', min: z(4, 0, P0), max: z(116, H, P1) });
  }
  // ---------------------------------------------------------------- Theaters 1-4
  const corridors = [
    { x0: 28.5, x1: 32.5, name: 'West Corridor' },
    { x0: 57, x1: 63, name: 'Mid Corridor' },
    { x0: 87.5, x1: 91.5, name: 'East Corridor' },
  ];
  A.screens = [];
  const floorAt = (zz) => (zz < R0 ? 0.12 : 0.12 + RISE * Math.min(NROW + 1, Math.ceil((zz - R0) / ROW + 1e-6)));
  // Palace XL: each auditorium is built round a wall-to-wall curved screen (22.4 x 12.6 m, 16:9, from 2.8 m
  // to the 16 m ceiling, curved 1.1 m deep). You come in under its corners from the Promenade, through the fire
  // exits from the side corridors, or at the top from the projection level.
  // the screen fills the front wall: 23.5 m wall to wall, 13.2 m (16:9) from just above the stage to the
  // ceiling, curved 0.9 m towards the audience
  const HT = 14.5,
    SW = 23.5,
    SH = 13.22,
    SY = 0.85,
    SAG = 0.9;
  A.__slopes = [];
  for (const T of __CN_TH) {
    const { a, b } = T,
      c = (a + b) / 2,
      ix0 = a + 0.4,
      ix1 = b - 0.4,
      exW = corridors.some((k) => Math.abs(k.x1 - a) < 0.01),
      exE = corridors.some((k) => Math.abs(k.x0 - b) < 0.01),
      wallC = T.wall;
    // the screen wall (shared with the Promenade): no openings, the screen fills it. You come in from the side
    // corridors through the side walls, beside the front rows, or at the top from the projection level
    wall(!0, P1 + 0.2, 0.4, a, b, 0, HT, [], ['velvet', '#5b1a22'], ['black', '#0b0b0d']);
    // side walls: charcoal acoustic panelling; fire exits into the corridors at the front
    // fire exits: open passages (no doors to catch on), arched, an EXIT sign over each
    const exit = (has) => (has ? [{ a0: 56.6, a1: 58.8, y0: 0.12, y1: 3.0, type: 'open', frame: 'arch' }] : []);
    // (the corridor side: deep red fabric walls, as a cinema's side passages)
    wall(!1, a + 0.2, 0.4, P1, BACK + 0.4, 0, HT, exit(exW), [exW ? 'velvet' : 'stucco', exW ? '#3a171c' : C.stucco], ['velvet', '#1d1d22']);
    wall(!1, b - 0.2, 0.4, P1, BACK + 0.4, 0, HT, exit(exE), ['velvet', '#1d1d22'], [exE ? 'velvet' : 'stucco', exE ? '#3a171c' : C.stucco]);
    // velvet curtains inside each doorway: they part as someone walks through (72-cinema-view.js), so the
    // corridor's light does not spill into the dark theater; the EXIT sign stays lit over them
    exW && N.exitDrapes.push({ ax: 'z', f: a + 0.4, s: 1, a0: 56.6, a1: 58.8, y0: 0.12, y1: 3.0, color: T.seat });
    exE && N.exitDrapes.push({ ax: 'z', f: b - 0.4, s: -1, a0: 56.6, a1: 58.8, y0: 0.12, y1: 3.0, color: T.seat });
    for (const [o0, o1] of [[a + 0.9, a + 2.7], [b - 2.7, b - 0.9]]) N.exitDrapes.push({ ax: 'x', f: BACK, s: -1, a0: o0, a1: o1, y0: FLY, y1: FLY + 2.7, color: T.seat });
    // floors: a low black stage under the screen, the pit
    slab(ix0, P1 + 0.4, ix1, R0, 0.12, 0.12, ['carpet', T.seat], ['carpet', T.seat]);
    bx(a + 3.2, 0, P1 + 0.4, b - 3.2, 0.45, STAGE, 'floor', 'carpet', '#16161a');
    N.stairs.push({ k: 'stagefront', x0: a + 3.2, x1: b - 3.2, z: STAGE, y: 0.45 });
    // the rake: 14 rows; the aisles (both sides and the middle) have two steps per row
    const blocks = [
      [a + 1.7, c - 0.65],
      [c + 0.65, b - 1.7],
    ];
    const aisles = [
      [ix0, a + 1.7],
      [c - 0.65, c + 0.65],
      [b - 1.7, ix1],
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
      // seats (wide rockers): a row on each block, its collision the seats' backs and folded cushions
      for (const [x0, x1] of blocks) {
        cb(x0 + 0.05, top, z0 + 0.86, x1 - 0.05, top + 1.05, z1 - 0.02, 'prop', 'velvet', { pen: 2.5 });
        // the rows curve round the screen: a seat sits up to 22 cm nearer it towards the room's sides
        N.seats.push({ ax: 'x', a0: x0, a1: x1, f: z0 + 0.86, y: top, face: 'N', color: T.seat, kind: 'std', n: Math.floor((x1 - x0) / 0.66), d: ROW - 0.88, row: k, th: T.id, arc: { cx: c, hw: (b - a) / 2 - 1.7, sag: 0.22 } });
        // the row's letter at both ends, lit, facing the aisles
        N.rowSigns.push({ x: x0 - 0.01, y: top + 0.3, z: z0 + 1.15, ry: -Math.PI / 2, ch: String.fromCharCode(65 + k) }, { x: x1 + 0.01, y: top + 0.3, z: z0 + 1.15, ry: Math.PI / 2, ch: String.fromCharCode(65 + k) });
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
    // rear wall: two doors to the projection level, two projection ports
    wall(
      !0,
      BACK + 0.2,
      0.4,
      ix0,
      ix1,
      FLY,
      HT,
      [
        { a0: a + 0.9, a1: a + 2.7, y0: FLY, y1: FLY + 2.7, type: 'open', frame: 'arch' },
        { a0: b - 2.7, a1: b - 0.9, y0: FLY, y1: FLY + 2.7, type: 'open', frame: 'arch' },
        { a0: c - 1.75, a1: c - 0.85, y0: 8.6, y1: 9.3, type: 'window' },
        { a0: c + 0.85, a1: c + 1.75, y0: 8.6, y1: 9.3, type: 'window' },
      ],
      ['velvet', '#1d1d22'],
      ['plaster', '#cfc6b6'],
    );
    slab(a, P1, b, BACK + 0.4, HT + 0.3, 0.3, ['roof', '#ffffff'], ['black', '#0c0c10'], 'roof');
    // the screen: curved, wall to wall
    const sc = { id: T.id, x: c, y: SY + SH / 2, z: P1 + 0.4 + 0.2, w: SW, h: SH, ry: 0, curve: SAG, room: { min: z(ix0, 0, P1 + 0.4), max: z(ix1, HT, BACK) }, hear: 16 };
    A.screens.push(sc);
    N.th.push({ ...T, screen: sc, c, ix0, ix1, x0: ix0, x1: ix1, z0: P1 + 0.4, z1: BACK, h: HT, face: 'N', blocks, aisles, xl: !0 });
    // the walls: ribbed timber to 2.2 m over the rake, jacquard fabric panels above it in the theater's colour
    for (const [f, s] of [[ix0, 1], [ix1, -1]]) {
      N.panels.push({ ax: 'z', f, s, a0: 59.6, a1: BACK - 0.4, y0: 2.2, y1: 12.5, k: 'acoustic', color: wallC, step: 3.0, fabric: 'jacquard' });
      // (not over the entrance: before, the timber lining covered it, so from inside it could not be seen)
      const hasExit = s > 0 ? exW : exE;
      for (let k = 0; k < NROW + 2; k++) {
        const za = k ? R0 + ROW * (k - 1) : P1 + 0.4,
          zb = Math.min(XA, R0 + ROW * k),
          fl = k ? 0.12 + RISE * k : 0.12;
        const segs = hasExit && za < 59 && zb > 56.4 ? [[za, 56.4], [59, zb]] : [[za, zb]];
        for (const [z0s, z1s] of segs) z1s - z0s > 0.05 && vs(Math.min(f, f + s * 0.05), fl, z0s, Math.max(f, f + s * 0.05), fl + 2.1, z1s, 'slat', '#8a6a52');
      }
    }
    // the light: dimmed house lights, light spilling from the screen over the front rows, LED lines on the walls
    for (let zz = 57; zz < 85; zz += 4) for (const x of [c - 7, c - 2.5, c + 2.5, c + 7]) lamp(x, Math.min(13.4, floorAt(zz) + 2.6), zz, 'house');
    for (const x of [c - 8, c, c + 8]) lamp(x, 4, 57.5, 'spill', x === c);
    // brass sconces up the side walls, washing the fabric with warm light
    for (let zz = 62; zz < 84; zz += 4.5) {
      const yy = floorAt(zz) + 3.3;
      lamp(ix0 + 0.15, yy, zz, 'sconce');
      lamp(ix1 - 0.15, yy, zz, 'sconce');
    }
    lamp(c, 9, 74, 'aisle', !1);
    N.ledLines.push({ a, b, ix0, ix1 });
    // the projectors' beams from the ports to the screen
    N.beams.push({ from: [c - 1.3, 8.95, BACK], to: [c, sc.y, sc.z + 0.05], w: SW, h: SH, screen: T.id });
    N.ports.push({ x: c - 1.3, y: 8.95, z: BACK + 0.4, th: T.id }, { x: c + 1.3, y: 8.95, z: BACK + 0.4, th: T.id, spare: !0 });
    // exit signs: over the fire exits, beside the front entrances, over the rear doors
    exW && sign('exit', a + 0.42, 3.4, 57.7, Math.PI / 2, 0.7, 0.26);
    exE && sign('exit', b - 0.42, 3.4, 57.7, -Math.PI / 2, 0.7, 0.26);
    // outside each entrance, in the corridor: the theater's number over it, lit
    exW && sign('number', a - 0.02, 3.75, 57.7, -Math.PI / 2, 1.2, 0.68, { th: T.id, n: T.n });
    exE && sign('number', b + 0.02, 3.75, 57.7, Math.PI / 2, 1.2, 0.68, { th: T.id, n: T.n });
    sign('exit', a + 1.8, FLY + 2.95, BACK - 0.02, Math.PI, 0.7, 0.26);
    sign('exit', b - 1.8, FLY + 2.95, BACK - 0.02, Math.PI, 0.7, 0.26);
    // the theater's number over its entrances (lit), with the film's title between them
    sign('number', c, 4.55, P1 - 0.02, Math.PI, 1.6, 0.9, { th: T.id, n: T.n });
    sign('title', c, 3.55, P1 - 0.02, Math.PI, 10, 0.75, { th: T.id });
    // poster cases on the Promenade wall either side of the title: this theater's film
    for (const x of [a + 2.2, b - 2.2]) N.posters.push({ x, y: 0.9, z: P1 - 0.03, ry: Math.PI, w: 1.3, h: 1.95, k: 'case', slot: __CN_TH.indexOf(T) });
    A.areas.push({ name: `Theater ${T.n}`, min: z(a, 0, P1 + 0.4), max: z(b, HT, BACK) });
  }
  // Theater 1 is the A site's room, 4 the B site's: name their fronts for callouts
  A.areas.push({ name: 'A Stage', min: z(32.9, 0, P1 + 0.4), max: z(56.6, 2, R0) }, { name: 'B Stage', min: z(63.4, 0, P1 + 0.4), max: z(87.1, 2, R0) });
  // ---------------------------------------------------------------- the corridors between the theaters
  for (const K of corridors) {
    const { x0, x1 } = K,
      xc = (x0 + x1) / 2;
    // the side passages into the theaters: patterned carpet, deep red fabric walls over a timber dado, a dark
    // ceiling with brass downlights, sconces and lit poster cases; service concrete beyond the jog
    slab(x0, P1, x1, 71, 0.12, 0.12, ['carpet', '#5a1a24'], ['carpet', '#5a1a24']);
    slab(x0, 71, x1, PJ, 0.12, 0.12, ['concrete', '#a9a39a'], ['concrete', '#a9a39a']);
    slab(x0, P1, x1, BACK + 0.4, 4.4, 0.25, ['roof', '#ffffff'], ['dark', '#1a1518'], 'roof');
    for (const [f, sd] of [[x0, 1], [x1, -1]]) N.panels.push({ ax: 'z', f, s: sd, a0: P1 + 0.5, a1: 70.6, y0: 0.12, y1: 1.1, k: 'dado', skip: [[56.45, 58.95]] });
    // a jog halfway (no straight line from the Promenade to the yard)
    const mid = 71;
    bx(x0, 0, mid - 0.2, xc + 0.3, 4.15, mid + 0.2, 'wall', 'velvet', '#3a171c', { pen: 1 });
    bx(xc - 0.3, 0, mid + 3.6, x1, 4.15, mid + 4.0, 'wall', 'plaster', '#cfc6b6', { pen: 1 });
    for (const zz of [54.5, 61, 66.5]) lamp(xc, 4.1, zz, 'can', zz === 61);
    for (const zz of [55.6, 63.5]) lamp(x0 + 0.15, 2.4, zz, 'sconce'), lamp(x1 - 0.15, 2.4, zz, 'sconce');
    for (const zz of [79, 87]) lamp(xc, 4.1, zz, 'tube', !1);
    // lit poster cases on the passage walls (not over the theaters' doorways)
    N.posters.push({ x: x0 + 0.03, y: 0.95, z: 60.6, ry: Math.PI / 2, w: 1.1, h: 1.65, k: 'case', slot: corridors.indexOf(K) + 1 }, { x: x1 - 0.03, y: 0.95, z: 60.6, ry: -Math.PI / 2, w: 1.1, h: 1.65, k: 'case', slot: corridors.indexOf(K) + 2 });
    // clutter: film cans, a stack of chairs, a popcorn cart, a cleaning cart
    item('filmcans', { x: x1 - 0.5, z: 80.5 });
    item('cleaning', { x: x0 + 0.5, z: 76.5 });
    cb(x1 - 0.85, 0.12, 80.1, x1 - 0.15, 0.95, 80.9, 'prop', 'paint', { pen: 2 });
    cb(x0 + 0.15, 0.12, 76.0, x0 + 0.85, 1.05, 77.0, 'prop', 'paint', { pen: 2 });
    A.areas.push({ name: K.name, min: z(x0, 0, P1), max: z(x1, 5, PJ) });
  }
  // the Promenade's south wall where a corridor meets it is open: frames over the openings
  for (const K of corridors) R.openings.push({ alongX: !0, f: P1 + 0.2, t: 0.4, a: K.x0, w: K.x1 - K.x0, y0: 0.12, y1: 4.4, type: 'open', frame: 'deco', out: 0 });
  // ---------------------------------------------------------------- the projection level (z 85.4-90, y 6.3)
  {
    // under it, back-of-house storage (solid) beside the corridors
    for (const T of __CN_TH) bx(T.a, 0, BACK + 0.4, T.b, FLY - 0.25, PJ, 'wall', 'concrete', '#b9b2a6', { pen: 0 });
    slab(4, BACK + 0.4, 116, PJ, FLY, 0.25, ['plate', '#9da3a6'], ['concrete', '#b0aaa0']);
    slab(4, BACK + 0.4, 116, PJ + 0.4, 10.7, 0.3, ['roof', '#ffffff'], ['concrete', '#a8a29a'], 'roof');
    // projectors at the ports, film platters, booth benches
    for (const p of N.ports) {
      cb(p.x - 0.6, FLY, p.z + 0.6, p.x + 0.6, FLY + 2.5, p.z + 1.9, 'prop', 'paint', { pen: 2 });
      item('projector', { x: p.x, y: FLY, z: p.z + 1.25, th: p.th });
      if (p.spare) {
        // the theater's control desk beside the spare port: the film's control panel (Use)
        cb(p.x - 0.7, FLY, p.z + 0.55, p.x + 0.7, FLY + 1.0, p.z + 1.25, 'prop', 'paint', { pen: 2 });
        item('console', { x: p.x, y: FLY, z: p.z + 0.9, th: p.th });
        N.consoles.push({ x: p.x, y: FLY, z: p.z + 1.7, th: p.th });
        continue;
      }
      cb(p.x - 3.4, FLY, p.z + 0.6, p.x - 1.8, FLY + 1.05, p.z + 2.2, 'prop', 'paint', { pen: 2 });
      item('platter', { x: p.x - 2.6, y: FLY, z: p.z + 1.4 });
      lamp(p.x + 1.3, 10.2, p.z + 2.2, 'booth', !1);
    }
    for (const x of [10, 30, 60, 90, 110]) lamp(x, 10.2, 87.8, 'tube', x === 60);
    // the projection level is a working space: steel shelving of film stock along the back wall, storage carts,
    // boxes; cover for the CTs' rotation along it (kept clear of their spawn, x 47-73)
    for (const x of [18, 24.5, 37, 83, 95.5, 102]) {
      model('steel_frame_shelves_02', x, FLY, 89.65, Math.PI, 1, { box: [x, 89.65, 0.3, 0.26, 2.1] });
      R.models.push({ id: 'cardboard_box_01', x: x + 0.05, y: FLY + 1.05, z: 89.6, ry: 0.3, s: 1 }, { id: 'cardboard_box_01', x: x - 0.1, y: FLY + 1.62, z: 89.62, ry: -0.2, s: 1 });
    }
    for (const [x, ry] of [[29, 0.1], [91, -0.1], [9.5, 0], [111, 0]]) model('industrial_storage_cart', x, FLY, 89.38, ry, 1, { box: [x, 89.38, 0.8, 0.56, 1.35] });
    for (const [x, zz] of [[30.6, 89.4], [31.1, 88.9], [89.4, 89.4]]) model('cardboard_box_01', x, FLY, zz, 0.4, 1, { box: [x, zz, 0.22, 0.22, 0.36] });
    A.areas.push({ name: 'Projection Booth', min: z(4, FLY - 0.4, BACK + 0.4), max: z(116, 10.4, PJ) });
  }
  // the south facade: brick, ground-floor openings to the corridors and the dock, windows and doors on the
  // projection level (steel stairs down to the yard)
  wall(
    !0,
    PJ + 0.2,
    0.4,
    4,
    116,
    0,
    11.0,
    [
      ...corridors.map((K) => ({ a0: K.x0 + 0.2, a1: K.x1 - 0.2, y0: 0.12, y1: 3.4, type: 'open', frame: 'steel' })),
      { a0: 13.2, a1: 14.8, y0: FLY, y1: FLY + 2.3, type: 'open', frame: 'steel' },
      { a0: 72.2, a1: 73.8, y0: FLY, y1: FLY + 2.3, type: 'open', frame: 'steel' },
      { a0: 105.2, a1: 106.8, y0: FLY, y1: FLY + 2.3, type: 'open', frame: 'steel' },
      ...[22, 40, 48, 80, 98].map((x) => ({ a0: x - 1.2, a1: x + 1.2, y0: 7.4, y1: 9.4, type: 'window' })),
    ],
    ['plaster', '#d8d2c6'],
    ['brick', C.brick],
  );
  // ---------------------------------------------------------------- the yard (z 90.4-108): dock and staff lot
  {
    vs(0, 0.004, PJ + 0.4, W, 0.012, D, 'asphalt', C.road);
    // the loading dock: a raised concrete apron along the facade between the corridors, bumpers, a ramp
    bx(36, 0, PJ + 0.4, 54, 1.1, 93.4, 'floor', 'concrete', '#c2bbb0');
    steps(54, PJ + 0.4, 56.8, 93.4, 'W', 0, 1.1, 'concrete', '#c2bbb0', { solid: !0 });
    item('dock', { x0: 36, x1: 54, z: 93.4, y: 1.1 });
    w.static('car-van', 45, 96.4, Math.PI / 2, [4.8, 2.2, 2.1]);
    w.static('car-van', 40, 96.4, Math.PI / 2, [4.8, 2.2, 2.1]);
    // steel stairs from the yard to the projection level's three doors (a landing at the top)
    for (const [x, dir] of [[14, 'E'], [73, 'W'], [106, 'W']]) {
      const len = (FLY / 0.2) * 0.28,
        xa = dir === 'E' ? x - 0.8 - len : x + 0.8,
        xb = xa + len;
      steps(xa, PJ + 0.4, xb, PJ + 1.8, dir, 0, FLY, 'plate', '#6b7378');
      bx(x - 0.8, FLY - 0.2, PJ + 0.4, x + 0.8, FLY, PJ + 1.8, 'floor', 'plate', '#6b7378');
      rail(xa, PJ + 1.82, xb, PJ + 1.82, 0, 1.0, { stair: dir === 'E' ? [0, FLY] : [FLY, 0] });
      rail(x - 0.8, PJ + 1.82, x + 0.8, PJ + 1.82, FLY, 1.0);
      lamp(x, FLY + 2.8, PJ + 0.6, 'flood', !1, !1);
    }
    // dumpsters, pallets, crates, a generator, the staff cars
    for (const [x, zz] of [[22, 92.4], [26, 92.4], [96, 92.4]]) bx(x - 1.0, 0, zz - 0.8, x + 1.0, 1.5, zz + 0.8, 'prop', 'paint', '#2f5a3f', { pen: 2 }), item('dumpster', { x, z: zz });
    for (const [x, zz] of [[64, 94], [65.4, 94], [64.7, 95.3]]) w.crate(x, zz, 1.1, 1.1, 0, '#9a7a52');
    for (const [x, zz] of [[82, 97], [84.2, 97]]) w.crate(x, zz, 1.2, 1.2, 0, '#8a6a46');
    w.barrel(30, 97);
    w.barrel(30.8, 97.7);
    w.car('car-sedan', 10, 101, Math.PI / 2);
    w.car('car-hatchback', 15.5, 101, Math.PI / 2);
    w.car('car-sedan', 104.5, 101, -Math.PI / 2);
    w.car('car-sedan', 110, 101, -Math.PI / 2);
    for (let x = 6; x <= 20; x += 2.75) R.lines.push({ x0: x - 0.05, z0: 98.6, x1: x + 0.05, z1: 103.4, c: '#e8e6df' });
    for (let x = 101; x <= 115; x += 2.75) R.lines.push({ x0: x - 0.05, z0: 98.6, x1: x + 0.05, z1: 103.4, c: '#e8e6df' });
    // the back fence: a block wall
    bx(0, 0, D - 0.4, W, 2.6, D, 'wall', 'concrete', '#b9b2a6', { pen: 0 });
    for (const [x, zz] of [[30, 104], [60, 104], [90, 104]]) {
      bx(x - 0.13, 0, zz - 0.13, x + 0.13, 6.4, zz + 0.13, 'prop', 'paint', '#5d646a', { pen: 2 });
      R.poles.push({ k: 'flood', x, z: zz, h: 6.6, ry: Math.PI });
      lamp(x, 6.4, zz, 'flood', !0, !1);
    }
    A.areas.push({ name: 'Loading Dock', min: z(30, 0, PJ + 0.4), max: z(62, 4, 100) }, { name: 'Staff Lot', min: z(0, 0, PJ + 0.4), max: z(W, 4, D) });
  }
  // the lounge's screen joins the theaters'
  A.screens.push(...A.__luxScreens);
  A.areas.push({ name: 'Parking Lot', min: z(0, 0, 8), max: z(W, 4, FAC) }, { name: 'Street', min: z(0, 0, 0), max: z(W, 4, 8) }, { name: 'Box Office', min: z(50, 0, 10), max: z(70, 4, 20) });
  // ---------------------------------------------------------------- objectives and spawns
  // The round, as on the classic maps (the numbers: docs/maps/cinema.md):
  //   - Terrorists arrive on the street; Counter-Terrorists spawn on the projection level, above and behind the
  //     two middle theaters (2 and 3), where the bomb sites are: the front of each (the stage and the pit).
  //   - CTs reach a site in about 60 % of the Terrorists' time: through the rear doors, across the top
  //     cross-aisle, and they hold the site from the rake, looking down. They rotate site to site along the
  //     projection level in seconds.
  //   - Terrorists come in from the side passages: West passage -> A (Theater 2), East passage -> B (Theater 3),
  //     and the Mid passage between the two, a doorway into each site: the contested connector. CTs can reach
  //     Mid too, down the projection level's stairs and through the yard.
  //   - Flanks: Theaters 1 and 4 (their side doorways from the West / East passages, up their aisles to the
  //     projection level, behind the CTs); the yard behind the building, from the passages' far ends.
  A.spawns.T = [[52, 3], [56, 3], [60, 2.2], [64, 2.2], [68, 3], [54, 6.5], [58, 7], [62, 7], [66, 6.5], [70, 6]].map(([x, zz]) => z(x, 0, zz));
  A.spawns.CT = [[49.5, 88.4], [53, 88.4], [56.5, 88.4], [63.5, 88.4], [67, 88.4], [70.5, 88.4], [51, 89.5], [55, 89.5], [65, 89.5], [69, 89.5]].map(([x, zz]) => z(x, FLY, zz));
  A.spawnZones = { T: { min: z(48, 0, 1), max: z(72, 0, 8) }, CT: { min: z(47, FLY, 87.6), max: z(73, FLY, 90) } };
  A.spawnFaceCenter = !0;
  const site = (T, nm, inT, inMid) => {
    const { a, b } = T,
      c = (a + b) / 2;
    return {
      name: nm,
      // (heights -0.5 to 0.75: the stage and the pit count; the middle is at the pit's floor, where the bots
      // aim to plant: with 0 to 1 their goal snapped to the front row's step, just outside the site)
      min: z(a + 3.4, -0.5, P1 + 0.4),
      max: z(b - 3.4, 0.75, R0 - 0.4),
      // where Terrorists gather before they go in: at the two doorways
      stage: [z(inT, 0.12, 60.5), z(inMid, 0.12, 60.5)],
      // where CTs watch from: the top of the rake and its aisles
      watch: [z(c, FLY + 1.3, 83.4), z(a + 1.0, 3.5, 74), z(b - 1.0, 3.5, 74), z(c, 0.12 + RISE * 8 + 1.3, R0 + ROW * 7.4)],
      hold: [z(c, 0.45, 54.6), z(a + 4.4, 0.12, 59.6), z(b - 4.4, 0.12, 59.6)],
    };
  };
  A.sites = [site(__CN_TH[1], 'A', 30.5, 60), site(__CN_TH[2], 'B', 89.5, 60)];
  A.areas.push({ name: 'Bombsite A', min: A.sites[0].min, max: A.sites[0].max }, { name: 'Bombsite B', min: A.sites[1].min, max: A.sites[1].max });
  // (no props on the sites: the front rows of seats and the stage's edge are the cover)
  A.flagPoints = [
    { name: 'A', pos: z(60, 0.12, 34.5) },
    { name: 'B', pos: z(44.75, 0.12, 58.2) },
    { name: 'C', pos: z(75.25, 0.12, 58.2) },
  ];
  A.tdmSpawns = [
    [60, 4], [20, 18], [100, 18], [60, 21], [45, 30], [75, 30], [35, 36], [85, 36], [26, 33], [94, 39],
    [20, 49.5], [100, 49.5], [16, 58], [104, 58], [44.75, 58], [75.25, 58], [30.5, 66], [60, 80], [89.5, 66], [60, 100],
  ].map(([x, zz]) => z(x, 0.12, zz));
  A.poi = [z(60, 0.12, 34), z(60, LB.my, 43), z(16.25, 0.45, 55), z(103.75, 0.45, 55), z(16.25, FLY, 83.5), z(103.75, FLY, 83.5), z(60, 0.12, 70), z(30.5, 0.12, 70), z(89.5, 0.12, 70), z(60, FLY, 87.8), z(26, 0.12, 36), z(94, 0.12, 36), z(60, 0.15, 17)];
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
    'An art-deco movie palace grown into a six-screen multiplex: the marquee and the Grand Lobby, the concession stand and the mezzanine, six theaters: four Palace XL auditoriums with wall-to-wall curved screens and two luxury rooms with recliners, the Velvet Room and the Starlight, and the projection level over them. Every screen plays its own film.',
  size: 'Large',
  maxPlayers: 24,
});
