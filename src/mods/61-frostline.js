/* ===== Bayou Protocol mod: Frostline (snow map, at Christmas) ===== */
// A 128 x 128 m alpine outpost in deep snow: canyons winding between rock cliffs, a vaulted glacier-ice tunnel
// to B, stone arches over the chokes, an ice pavilion on B, and three hidden caverns sealed behind ice that
// breaks when shot (or blasted): Santa's Workshop, the Crystal Cavern and the Fireside Lodge.
//
// How it was laid out (the full write-up and measured timings: docs/maps/frostline.md). The rules are
// what de_dust2, de_nuke and de_inferno have in common, turned into numbers this map is checked against:
//   1. Three lanes: a long lane to A for rifles and snipers (sightline about 45 m), a contested mid with
//      connectors to both sites, and a close-quarters approach to B (the curving Banana, then a tunnel).
//   2. Timing: Counter-Terrorists reach either site in 40-55 % of the Terrorists' time, so they set up
//      first; Terrorists reach the mid choke first (they fight for mid, CTs hold it from range).
//   3. Every site has 2-3 Terrorist entrances and its own CT entrance; site entrances are chokes 5-7 m wide.
//   4. Rotations: CT site-to-site through their spawn is short; the Terrorists' runs through mid and is long.
//   5. Sightlines: no clear line over ~45 m inside a lane; cover every ~15-20 m along long lanes; corners
//      at every spawn exit so no one sees into a spawn.
//   6. Verticality (Nuke): a raised timber deck on A overlooking both entrances; part of B under a roof.
//   7. Unique to this game: hidden caverns behind breakable ice. Both walls of Santa's Workshop open a
//      mid-to-Banana flank; the Crystal Cavern opens A Long to mid; the Fireside Lodge is a closet off B.
//      They are slower than the main routes until opened, they make noise when opened, and the ice is
//      whole again every round.
// The ground plan is a set of smooth shapes (rounded rooms, curving lanes, oval caverns) blended into one
// distance field. Everything comes from that one field, so it all agrees:
//   - collision: the rock is boxes on a 25 cm grid, set a few centimetres behind the drawn rock face (no
//     invisible walls, no gaps), and bots, bullets, wallbangs and the minimap use them as on every map
//   - what you see: sculpted cliff faces along the field's edge, the snowfield, the cave vaults and floors
// Assets: tools/fetch-polyhaven.mjs -> public/game/maps/frostline/.
const __FL = { base: './game/maps/frostline/', W: 128, D: 128, rockH: 14, inVis: !1, view: null, rev: 0, subs: new Set(), C: 0.25, N: 512 };
// ---------------------------------------------------------------- the layout (metres; x east, z south)
const __FL_L = {
  // walkable ground: r = rounded rectangle [x0, z0, x1, z1, corner radius], p = a lane along a smooth curve
  // through the points, w wide, e = an oval cavern [centre x, z, radius x, z]. `cave` marks the parts roofed over
  shapes: [
    { r: [48, 4, 80, 18, 3], n: 'CT Spawn' },
    { p: [[49, 12], [41, 12], [35.5, 15.5], [34.5, 22]], w: 7.5, n: 'A Back' },
    { r: [8, 20, 38, 46, 4], n: 'Bombsite A' },
    { r: [8.5, 20.5, 18.5, 30.5, 0.6], n: "the deck's corner" },
    { p: [[15, 45], [14, 60], [16, 74], [15, 86], [15.5, 89]], w: 13, n: 'A Long' },
    { p: [[15.5, 88], [15.5, 99]], w: 7, n: 'Long Doors' },
    { r: [10, 97, 26, 114, 4], n: 'Long Corner' },
    { p: [[22, 109], [33, 110.5], [47, 109]], w: 10, n: 'T Ramp' },
    { r: [44, 104, 84, 124, 4], n: 'T Spawn' },
    { p: [[62, 105], [61, 95], [62, 86]], w: 10, n: 'T Mid' },
    { p: [[62, 87], [62, 79]], w: 6, n: 'Mid Doors' },
    { r: [50, 54, 74, 81, 4], n: 'Mid' },
    { p: [[62, 17], [62, 30], [61, 42], [62, 55]], w: 10, n: 'CT Mid' },
    { p: [[58, 50], [46, 50]], w: 8, n: 'A Short' },
    { p: [[46, 50], [40.5, 45], [35, 40]], w: 6, n: 'Short Gap' },
    { p: [[72, 60], [80, 61.5], [88, 59.5], [95.5, 61]], w: 5.5, n: 'Crevasse' },
    { p: [[99, 75.5], [99.5, 61], [100, 51]], w: 10, n: 'B Ice Tunnel', cave: 'tunnel' },
    { p: [[100, 52], [100, 43.5]], w: 6, n: 'B Entrance', cave: 'tunnel' },
    { r: [86, 20, 118, 45, 5], n: 'Bombsite B' },
    { r: [100, 20, 118, 32, 1.2], n: 'the pavilion corner' },
    { p: [[79, 12], [88, 12], [92, 16], [92, 23]], w: 8, n: 'B Back' },
    { r: [83, 106, 104, 118, 3], n: 'Outside B' },
    { p: [[102, 111], [106, 98], [107, 88], [104, 80], [100.5, 76]], w: 11, n: 'Banana' },
    // the hidden caverns and the ice-sealed passages to them
    { e: [86, 85, 6.5, 5.2], cave: 'workshop' },
    { p: [[80, 84.5], [73, 84.5], [71.2, 80]], w: 3, cave: 'workshop' },
    { p: [[92, 84.5], [101.5, 84.2]], w: 3, cave: 'workshop' },
    { e: [31, 67, 5.8, 5], cave: 'cavern' },
    { p: [[20, 66.5], [26, 66.5]], w: 3, cave: 'cavern' },
    { p: [[36.5, 67], [42, 68.5], [47, 66.5], [51.5, 66.5]], w: 3, cave: 'cavern' },
    { e: [123.3, 32, 3.8, 6.2], cave: 'lodge' },
    { p: [[116, 32], [120.5, 32]], w: 3.5, cave: 'lodge' },
  ],
  // roofed areas: the open ground inside each outline is under a vault (spring: height where it leaves the
  // wall; rise: how much higher the crown is; w: how far from the walls the crown is reached). Where an
  // outline crosses open ground there is an arched portal (sealed with breakable ice where `pane`)
  caves: {
    tunnel: { poly: [[93.6, 45.6], [106.5, 45.6], [106.5, 73.8], [93.6, 73.8]], spring: 2.9, rise: 2.9, w: 5, kind: 'ice', floor: 'snow', name: 'B Ice Tunnel' },
    workshop: { poly: [[68.5, 82.2], [78, 82.2], [78, 79.4], [92.5, 79.4], [92.5, 82.5], [98, 82.5], [98, 86.5], [92.5, 86.5], [92.5, 92], [68.5, 92]], spring: 2.7, rise: 2.6, w: 5, kind: 'rock', floor: 'wood', pane: 1, name: "Santa's Workshop" },
    cavern: { poly: [[23.3, 60], [49.3, 60], [49.3, 74], [23.3, 74]], spring: 2.6, rise: 2.8, w: 5, kind: 'ice', floor: 'ice', pane: 1, name: 'Crystal Cavern' },
    lodge: { poly: [[118.9, 24], [127.9, 24], [127.9, 40], [118.9, 40]], spring: 2.7, rise: 1.7, w: 3.8, kind: 'wood', floor: 'wood', pane: 1, name: 'Fireside Lodge' },
  },
  // stone arches over the chokes: centre of the line across the passage, its direction, spring, rise
  arches: [
    [15.5, 94, 1, 0, 3.1, 1.9], // Long Doors
    [62, 83.5, 1, 0, 3.1, 1.7], // Mid Doors
    [41, 45.6, 0.674, -0.739, 3.0, 1.7], // Short Gap
    [62, 19.2, 1, 0, 3.5, 2.3], // the gate from the CT spawn to CT Mid
    [62, 102.6, 1, 0, 3.5, 2.3], // the gate from the T spawn to T Mid
    [46.8, 12, 0, 1, 3.2, 2.0], // A Back
  ],
  // the ice pavilion over the north-east corner of B: a barrel vault on ice columns
  pavilion: { x0: 103.8, z0: 19.4, x1: 118.8, z1: 30, spring: 3.6, rise: 1.9, cols: [[104.4, 29.4], [109.2, 29.4], [114, 29.4]] },
  // timber deck on A (top 2.2 m) with stairs coming up from the east
  decks: [[9, 21, 17, 29, 2.2]],
  // cover: x0, z0, x1, z1, height, kind (crate | snow | metal | barrel | gift), base height
  // (gift: a crate drawn as a giant wrapped present, in the spawns)
  cover: [
    [19, 31, 21, 33, 1.3, 'crate'], [19.2, 31.2, 20.8, 32.8, 2.55, 'crate', 1.3],
    [26, 25, 27.6, 26.6, 1.3, 'crate'], [22, 40, 27, 41, 1.1, 'snow'], [28, 34, 34, 36.4, 2.5, 'metal'],
    [12, 70, 16, 71.2, 1.2, 'snow'], [18.4, 58, 19.8, 59.4, 1.3, 'crate'], [10.5, 84, 12, 85.5, 1.3, 'crate'],
    [15, 104, 16.5, 105.5, 1.3, 'crate'],
    [60.5, 66, 62.5, 68, 1.4, 'crate'], [60.8, 66.3, 62.2, 67.7, 2.6, 'crate', 1.4], [53, 60, 57, 61, 1.1, 'snow'],
    [69.7, 75.7, 70.3, 76.3, 0.95, 'barrel'], [70.8, 76.5, 71.4, 77.1, 0.95, 'barrel'], [66, 72, 67.4, 73.4, 1.3, 'crate'],
    [59, 40, 60.5, 41.5, 1.3, 'crate'], [64, 34, 65.5, 35.5, 1.3, 'crate'],
    [95, 29, 97, 31, 1.4, 'crate'], [95.3, 29.3, 96.7, 30.7, 2.6, 'crate', 1.4], [104, 37, 105.5, 38.5, 1.3, 'crate'],
    [108, 31.4, 110.4, 37.4, 2.5, 'metal'], [91, 40, 96, 41, 1.1, 'snow'],
    [102, 92, 106, 93.2, 1.2, 'snow'], [105.5, 82, 109.3, 83.2, 1.2, 'snow'], [101.5, 99, 103, 100.5, 1.3, 'crate'],
    [97.7, 61.7, 98.3, 62.3, 0.95, 'barrel'], [101.2, 55.7, 101.8, 56.3, 0.95, 'barrel'],
    [83, 59, 84.5, 60.5, 1.3, 'crate'],
    [62, 9, 68, 11.4, 2.5, 'metal'], [52, 13, 54, 15, 1.3, 'gift'], [74, 8, 76, 10, 1.3, 'gift'],
    [60, 112, 61.5, 113.5, 1.3, 'gift'], [70, 116, 72, 117.5, 1.3, 'gift'],
  ],
  // decorated Christmas trees (with a trunk to collide with): x, z, size. Four in the T spawn's corners, two
  // in the CT spawn's, all clear of the routes out
  spawnTrees: [[47.5, 121, 0.85], [80.5, 121.5, 0.75], [81, 106.2, 0.65], [46.5, 116, 0.6], [78.6, 16.4, 0.55], [50.2, 16.2, 0.5],
    // and small ones in quiet corners round the map
    [24.6, 98.6, 0.3], [102.3, 116.4, 0.3], [51.6, 79.4, 0.3], [88.6, 42.4, 0.3],
    // and in Santa's Workshop and the Fireside Lodge
    [90.2, 87.6, 0.3], [123.3, 36.6, 0.29]],
  // log cabins, free-standing with their backs to the cliff, fronts facing south: x0, z0, x1, z1
  cabins: [[49, 104, 55.5, 108.5], [68.5, 104, 75, 108.5], [51.5, 4, 57.5, 7.6]],
  // snowmen (solid, waist-high cover in corners): x, z, facing
  snowmen: [[74.5, 123, 3.14], [77.8, 5.6, 0.4], [115.5, 42, 3.9], [71.5, 56.3, 2.4]],
  // the campfire behind the T spawn, and the lamp posts the Christmas lights are strung from
  firePit: [62.5, 122.6],
  posts: [[56.6, 104.4], [67.6, 104.4], [57.4, 17.6], [66.6, 17.6], [55.5, 123.2], [69.5, 123.2]],
  // larger props that block movement: x0, z0, x1, z1, height (a stack of barrels in Long Corner)
  props: [[12.2, 110, 15.6, 112.4, 0.95]],
  // inside the hidden caverns (solid): x0, z0, x1, z1, height
  furniture: [
    [82.4, 80.5, 85.6, 81.5, 0.95], // workshop: the workbench
    [87, 80.1, 90.2, 80.7, 2.1], // workshop: the toy shelves
    [83.2, 86.8, 87.6, 88.6, 1.3], // workshop: Santa's sleigh
    [26.9, 62.6, 28.1, 63.8, 1.6], [34.2, 63.4, 35.4, 64.6, 1.4], [26.4, 70, 27.6, 71.2, 1.6], [34.4, 69.6, 35.6, 70.8, 1.8], // cavern: crystal clusters
    [33.2, 70.3, 33.8, 70.9, 3], // cavern: the ice tree
    [125.9, 30.7, 127.3, 33.3, 3], // lodge: the fireplace
    [123.6, 28.9, 124.6, 29.9, 0.95], [123.6, 34.1, 124.6, 35.1, 0.95], // lodge: armchairs
    [122.7, 27, 123.9, 28.2, 0.8], // lodge: the table
  ],
  areas: [
    ['CT Spawn', 48, 4, 80, 18], ['A Back', 32, 8, 48, 22], ['A Site', 8, 20, 38, 46], ['A Long', 8, 46, 22, 92],
    ['Long Doors', 12, 92, 19, 97], ['Long Corner', 10, 97, 26, 114], ['T Ramp', 26, 104, 46, 114], ['T Spawn', 44, 104, 84, 124],
    ['T Mid', 57, 86, 67, 104], ['Mid Doors', 59, 81, 65, 86], ['Mid', 50, 54, 74, 81], ['CT Mid', 57, 18, 67, 54],
    ['A Short', 36, 38, 57, 54], ['Crevasse', 74, 57, 94, 64], ['B Ice Tunnel', 94, 50, 105, 76], ['B Entrance', 97, 44, 103, 50],
    ['B Site', 86, 20, 118, 45], ['Ice Pavilion', 104, 20, 118, 30], ['B Back', 76, 8, 96, 22], ['Outside B', 83, 106, 104, 118],
    ['Banana', 97, 76, 113, 111], ["Santa's Workshop", 70, 78, 101, 91], ['Crystal Cavern', 20, 61, 51, 73], ['Fireside Lodge', 116, 25, 128, 39],
    ['A Deck', 9, 21, 17, 29],
  ],
};
// ---------------------------------------------------------------- the distance field
// Signed distance to the nearest edge of open ground (negative on open ground, positive in rock), on a 25 cm
// grid of 513 x 513 points; `nc` is the same without the caverns and the tunnel (used for the cliff tops).
// Shapes are blended with a smooth union, so every junction is a rounded fillet, never a square corner;
// a little low-frequency wobble makes the walls natural without changing a lane's width by more than ~0.6 m.
function __flCurve(pts) {
  // Catmull-Rom through the points, 8 steps a span
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < 8; s++) {
      const t = s / 8,
        t2 = t * t,
        t3 = t2 * t,
        f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function __flShapeSd(s) {
  if (s.r) {
    const [x0, z0, x1, z1, r] = s.r,
      cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2,
      hx = (x1 - x0) / 2,
      hz = (z1 - z0) / 2;
    return {
      bb: [x0, z0, x1, z1],
      f: (x, z) => {
        const qx = Math.abs(x - cx) - hx + r,
          qz = Math.abs(z - cz) - hz + r;
        return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
      },
    };
  }
  if (s.e) {
    const [cx, cz, rx, rz] = s.e;
    return { bb: [cx - rx, cz - rz, cx + rx, cz + rz], f: (x, z) => (Math.hypot((x - cx) / rx, (z - cz) / rz) - 1) * Math.min(rx, rz) };
  }
  const c = __flCurve(s.p),
    h = s.w / 2;
  let bb = [1e9, 1e9, -1e9, -1e9];
  for (const [x, z] of c) bb = [Math.min(bb[0], x), Math.min(bb[1], z), Math.max(bb[2], x), Math.max(bb[3], z)];
  return {
    bb: [bb[0] - h, bb[1] - h, bb[2] + h, bb[3] + h],
    f: (x, z) => {
      let d = 1e9;
      for (let i = 0; i < c.length - 1; i++) {
        const ax = c[i][0],
          az = c[i][1],
          bx = c[i + 1][0] - ax,
          bz = c[i + 1][1] - az,
          px = x - ax,
          pz = z - az,
          t = Math.max(0, Math.min(1, (px * bx + pz * bz) / (bx * bx + bz * bz || 1)));
        d = Math.min(d, Math.hypot(px - bx * t, pz - bz * t));
      }
      return d - h;
    },
  };
}
function __flField() {
  if (__FL.F) return __FL.F;
  const { C } = __FL,
    N = __FL.N + 1,
    all = new Float32Array(N * N).fill(10),
    nc = new Float32Array(N * N).fill(10),
    k = 1.8,
    smin = (a, b) => {
      const h = Math.max(k - Math.abs(a - b), 0) / k;
      return Math.min(a, b) - h * h * k * 0.25;
    };
  for (const s of __FL_L.shapes) {
    const { bb, f } = __flShapeSd(s),
      m = 9,
      i0 = Math.max(0, Math.floor((bb[0] - m) / C)),
      i1 = Math.min(N - 1, Math.ceil((bb[2] + m) / C)),
      j0 = Math.max(0, Math.floor((bb[1] - m) / C)),
      j1 = Math.min(N - 1, Math.ceil((bb[3] + m) / C));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const d = f(i * C, j * C);
        if (d >= 10) continue;
        const q = j * N + i;
        all[q] = smin(all[q], d);
        s.cave || (nc[q] = smin(nc[q], d));
      }
  }
  // the wobble (same in both fields), kept off the map's edge
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const q = j * N + i,
        x = i * C,
        z = j * C,
        w = 0.32 * (__flFbm(x * 0.11 + 3.3, z * 0.11 - 1.7) * 2 - 1);
      all[q] < 9 && (all[q] += w);
      nc[q] < 9 && (nc[q] += w);
      (x < 0.6 || z < 0.6 || x > __FL.W - 0.6 || z > __FL.D - 0.6) && ((all[q] = Math.max(all[q], 2)), (nc[q] = Math.max(nc[q], 2)));
    }
  return (__FL.F = { all, nc, N });
}
// the field at any point (bilinear); outside the map: deep rock
function __flSample(a, x, z) {
  const { C } = __FL,
    { N } = __flField(),
    fx = x / C,
    fz = z / C;
  if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return 10;
  const i = Math.floor(fx),
    j = Math.floor(fz),
    u = fx - i,
    v = fz - j,
    q = j * N + i;
  return (a[q] * (1 - u) + a[q + 1] * u) * (1 - v) + (a[q + N] * (1 - u) + a[q + N + 1] * u) * v;
}
const __flD = (x, z) => __flSample(__flField().all, x, z),
  __flDn = (x, z) => __flSample(__flField().nc, x, z);
// the direction into the rock at a point (the field's gradient)
function __flGrad(x, z) {
  const h = 0.2,
    gx = __flD(x + h, z) - __flD(x - h, z),
    gz = __flD(x, z + h) - __flD(x, z - h),
    l = Math.hypot(gx, gz) || 1;
  return [gx / l, gz / l];
}
// ---------------------------------------------------------------- the caverns' outlines
// signed distance to a polygon's outline (positive inside)
function __flPolyDepth(poly, x, z) {
  let inside = !1,
    d = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j],
      [bx, bz] = poly[i];
    bz > z !== az > z && x < ((ax - bx) * (z - bz)) / (az - bz) + bx && (inside = !inside);
    const ex = bx - ax,
      ez = bz - az,
      t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez))),
      dd = Math.hypot(x - ax - ex * t, z - az - ez * t);
    d = Math.min(d, dd);
  }
  return inside ? d : -d;
}
// the cavern a point is in (at least `inset` metres inside its outline), or null
function __flCaveAt(x, z, inset = 0) {
  for (const id in __FL_L.caves) {
    const c = __FL_L.caves[id];
    if (__flPolyDepth(c.poly, x, z) >= inset) return ((c.id = id), c);
  }
  return null;
}
// a cavern's ceiling height at a point: a vault that leaves the walls at `spring` and reaches its crown
// `w` metres from the walls
function __flCeil(c, x, z) {
  const d = -__flD(x, z);
  if (d < 0) return c.spring + d * 1.2; // (behind the wall, it dips into the rock)
  const t = Math.min(d, c.w) / c.w;
  return c.spring + c.rise * Math.sqrt(1 - (1 - t) * (1 - t));
}
// where an outline crosses open ground: [ax, az, bx, bz (the stretch along the edge), nx, nz (pointing out
// of the cavern)], one per opening. (An outline must cross only its own passages: one that strays into a
// lane makes a portal there. window.__bpFrostCheck() lists them.)
function __flPortals(c) {
  if (c.__portals) return c.__portals;
  const out = [];
  for (let i = 0; i < c.poly.length; i++) {
    const [ax, az] = c.poly[i],
      [bx, bz] = c.poly[(i + 1) % c.poly.length],
      len = Math.hypot(bx - ax, bz - az),
      tx = (bx - ax) / len,
      tz = (bz - az) / len;
    // outward normal: try both, keep the one that leaves the polygon
    let nx = tz,
      nz = -tx;
    __flPolyDepth(c.poly, (ax + bx) / 2 + nx * 0.3, (az + bz) / 2 + nz * 0.3) > 0 && ((nx = -nx), (nz = -nz));
    let run = null;
    for (let s = 0; s <= len; s += 0.25) {
      const x = ax + tx * s,
        z = az + tz * s,
        open = __flD(x + nx * 0.4, z + nz * 0.4) < 0 && __flD(x - nx * 0.4, z - nz * 0.4) < 0;
      if (open) run ? (run[1] = s) : (run = [s, s]);
      if ((!open || s + 0.25 > len) && run) {
        out.push({ ax: ax + tx * run[0], az: az + tz * run[0], bx: ax + tx * run[1], bz: az + tz * run[1], tx, tz, nx, nz, ex0: ax, ez0: az, len, s0: run[0], s1: run[1] });
        run = null;
      }
    }
  }
  return (c.__portals = out);
}
// a stone arch's opening: the open stretch along its line, and the height of its underside along it
function __flArch(a) {
  if (a.__o) return a.__o;
  const [cx, cz, dx, dz, spring, rise] = a,
    l = Math.hypot(dx, dz),
    tx = dx / l,
    tz = dz / l;
  let s0 = 0,
    s1 = 0;
  while (s0 > -12 && __flD(cx + tx * (s0 - 0.1), cz + tz * (s0 - 0.1)) < 0) s0 -= 0.1;
  while (s1 < 12 && __flD(cx + tx * (s1 + 0.1), cz + tz * (s1 + 0.1)) < 0) s1 += 0.1;
  const mid = (s0 + s1) / 2,
    half = (s1 - s0) / 2;
  return (a.__o = {
    cx,
    cz,
    tx,
    tz,
    nx: -tz,
    nz: tx,
    s0,
    s1,
    spring,
    rise,
    top: spring + rise + 0.95,
    under: (s) => (s <= s0 || s >= s1 ? -0.5 : spring + rise * Math.sqrt(Math.max(0, 1 - ((s - mid) / half) ** 2))),
  });
}
// the pavilion vault's underside at z
const __flPavC = (z) => {
  const P = __FL_L.pavilion,
    m = (P.z0 + P.z1) / 2,
    h = (P.z1 - P.z0) / 2;
  return P.spring + P.rise * Math.sqrt(Math.max(0, 1 - ((z - m) / h) ** 2));
};
// greedy rectangles over a grid of n x n cells: key(i, j) -> a value (cells with equal values merge), or null
function __flRects(n, key) {
  const used = new Uint8Array(n * n),
    out = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      if (used[j * n + i]) continue;
      const v = key(i, j);
      if (v === null) continue;
      let i1 = i;
      while (i1 + 1 < n && !used[j * n + i1 + 1] && key(i1 + 1, j) === v) i1++;
      let j1 = j;
      for (;;) {
        const nj = j1 + 1;
        if (nj >= n) break;
        let ok = !0;
        for (let k = i; k <= i1 && ok; k++) (used[nj * n + k] || key(k, nj) !== v) && (ok = !1);
        if (!ok) break;
        j1 = nj;
      }
      for (let a = j; a <= j1; a++) for (let k = i; k <= i1; k++) used[a * n + k] = 1;
      out.push([i, j, i1 + 1, j1 + 1, v]);
    }
  return out;
}
// is a disc of radius r at (x, z) clear of rock and of the map's boxes? (spawns, props)
function __flClear(A, x, z, r) {
  if (__flD(x, z) > -r - 0.15) return !1;
  for (const b of A.boxes) if (!b.__rock && b.kind !== 'roof' && b.min.y < 1.8 && x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z) return !1;
  return !0;
}
// the nearest clear point to (x, z), searching outwards
function __flNearestClear(A, x, z, r = 0.6) {
  if (__flClear(A, x, z, r)) return [x, z];
  for (let rad = 0.5; rad < 8; rad += 0.5) for (let a = 0; a < 6.28; a += 0.4) if (__flClear(A, x + Math.cos(a) * rad, z + Math.sin(a) * rad, r)) return [x + Math.cos(a) * rad, z + Math.sin(a) * rad];
  return [x, z];
}
// ---------------------------------------------------------------- the map (what the simulation sees)
function __frostlineBuild() {
  const w = new Po(),
    A = w.m,
    L = __FL_L,
    { W, D, rockH, C, N } = __FL;
  A.id = 'frostline';
  A.name = 'Frostline';
  A.w = W;
  A.d = D;
  A.backdrop = 'mountains'; // replaced by this map's own snowy range (see the tiA / oiA wrappers below)
  // rock: every 25 cm cell whose centre is more than 10 cm behind the drawn rock face (so the face you see is
  // what stops you, give or take a few centimetres), merged into as few boxes as possible
  for (const [i0, j0, i1, j1] of __flRects(N, (i, j) => (__flD((i + 0.5) * C, (j + 0.5) * C) > 0.1 ? 1 : null))) w.box(i0 * C, 0, j0 * C, i1 * C, rockH, j1 * C, 'wall', { mat: 'concrete', pen: 0, __rock: 1 });
  // for the map picker's preview (hidden in the match, where the cliffs are drawn) and the minimap (which
  // would show thousands of 25 cm boxes as stripes): the rock in 50 cm blocks
  A.__mmBoxes = [];
  for (const [i0, j0, i1, j1] of __flRects(W * 2, (i, j) => (__flD((i + 0.5) / 2, (j + 0.5) / 2) > 0 ? 1 : null))) {
    const [x0, z0, x1, z1] = [i0 / 2, j0 / 2, i1 / 2, j1 / 2];
    A.visuals.push({ min: z(x0, 0, z0), max: z(x1, 6 + 3 * __flFbm(x0 * 0.05, z0 * 0.05), z1), mat: 'stone', color: '#d9dee6', __hidden: 1 });
  }
  // (the minimap draws each box with soft edges: 1 m blocks, so few seams)
  for (const [x0, z0, x1, z1] of __flRects(W, (i, j) => (__flD(i + 0.5, j + 0.5) > 0 ? 1 : null))) A.__mmBoxes.push({ min: z(x0, 0, z0), max: z(x1, rockH, z1), kind: 'wall' });
  // the caverns' vaults (50 cm cells; each at the lowest point of the drawn vault over it, rounded up, so you
  // never bump into an invisible ceiling), and ice sealing their portals
  for (const id in L.caves) {
    const c = L.caves[id],
      xs = c.poly.map((p) => p[0]),
      zs = c.poly.map((p) => p[1]),
      x0 = Math.floor(Math.min(...xs)),
      z0 = Math.floor(Math.min(...zs)),
      n = Math.ceil(Math.max(Math.max(...xs) - x0, Math.max(...zs) - z0) * 2) + 1;
    for (const [i0, j0, i1, j1, v] of __flRects(n, (i, j) => {
      const x = x0 + (i + 0.5) * 0.5,
        zz = z0 + (j + 0.5) * 0.5;
      return __flPolyDepth(c.poly, x, zz) > -0.25 && __flD(x, zz) < 0.35 ? Math.ceil(Math.max(2.2, Math.min(__flCeil(c, x - 0.25, zz - 0.25), __flCeil(c, x + 0.25, zz - 0.25), __flCeil(c, x - 0.25, zz + 0.25), __flCeil(c, x + 0.25, zz + 0.25))) * 4) / 4 : null;
    }))
      w.box(x0 + i0 * 0.5, v, z0 + j0 * 0.5, x0 + i1 * 0.5, rockH, z0 + j1 * 0.5, 'roof', { mat: c.kind === 'ice' ? 'glass' : 'concrete', pen: 0, __vault: id });
    if (c.pane)
      for (const p of __flPortals(c)) {
        // the ice: 0.6 m thick just inside the portal, across the opening and 0.35 m into the rock either side
        const e = 0.35,
          ox = -p.nx * 0.45,
          oz = -p.nz * 0.45,
          xa = p.ax - p.tx * e + ox,
          za = p.az - p.tz * e + oz,
          xb = p.bx + p.tx * e + ox,
          zb = p.bz + p.tz * e + oz;
        let top = 0;
        for (let s = 0; s <= 1; s += 0.05) top = Math.max(top, __flCeil(c, p.ax + (p.bx - p.ax) * s - p.nx * 0.45, p.az + (p.bz - p.az) * s - p.nz * 0.45));
        w.pane(Math.min(xa, xb) - 0.3 * Math.abs(p.nx), 0, Math.min(za, zb) - 0.3 * Math.abs(p.nz), Math.max(xa, xb) + 0.3 * Math.abs(p.nx), top + 0.1, Math.max(za, zb) + 0.3 * Math.abs(p.nz));
        const b = A.boxes[A.boxes.length - 1];
        b.__ice = 1;
        b.__portal = p;
        b.__cave = id;
      }
  }
  // the stone arches: their stonework over the passage, as boxes in 25 cm cells (bullets and grenades hit it)
  for (const a of L.arches) {
    const o = __flArch(a),
      T = 1.1;
    for (let s = o.s0 - 0.25; s <= o.s1 + 0.25; s += 0.25)
      for (let t = -T / 2 + 0.125; t < T / 2; t += 0.25) {
        const x = o.cx + o.tx * s + o.nx * t,
          zz = o.cz + o.tz * s + o.nz * t,
          u = o.under(s);
        u > 0 && __flD(x, zz) < 0.15 && w.box(x - 0.125, Math.ceil(u * 4) / 4, zz - 0.125, x + 0.125, o.top, zz + 0.125, 'roof', { mat: 'concrete', pen: 0, __arch: 1 });
      }
  }
  // the ice pavilion: columns, the beam along its open side, the vault
  {
    const P = L.pavilion;
    for (const [x, zz] of P.cols) w.box(x - 0.33, 0, zz - 0.33, x + 0.33, P.spring, zz + 0.33, 'wall', { mat: 'glass', pen: 0, __icePillar: 1 });
    w.box(P.x0, P.spring - 0.35, P.cols[0][1] - 0.4, P.x1, P.spring + 0.1, P.cols[0][1] + 0.4, 'roof', { mat: 'glass', pen: 0, __iceRoof: 1 });
    for (let zz = P.z0; zz < P.z1; zz += 0.5) {
      const y = Math.ceil(Math.min(__flPavC(zz), __flPavC(zz + 0.5)) * 4) / 4;
      w.box(P.x0, y, zz, P.x1, y + 0.45, zz + 0.5, 'roof', { mat: 'glass', pen: 0, __iceRoof: 1 });
    }
  }
  // the deck on A and its stair (rising west onto the deck's east edge)
  for (const [x0, z0, x1, z1, h] of L.decks) w.box(x0, 0, z0, x1, h, z1, 'floor', { mat: 'wood', __deck: 1 });
  ce(w, 20.1, 24, 'W', 0, 2.2, 1.8, 'wood', '#6b4f35');
  // (the preview-only visuals below also tell the bullet-hole code where these surfaces are drawn)
  const pv = (x0, y0, z0, x1, y1, z1, mat, color) => A.visuals.push({ min: z(x0, y0, z0), max: z(x1, y1, z1), mat, color, __hidden: 1 });
  for (const c of L.cover) {
    const [x0, z0, x1, z1, h, kind, y0 = 0] = c;
    w.box(x0, y0, z0, x1, h, z1, kind === 'snow' ? 'prop' : 'crate', { mat: kind === 'metal' ? 'metal' : kind === 'snow' ? 'dirt' : kind === 'barrel' ? 'metal' : 'wood', pen: kind === 'crate' || kind === 'gift' ? 1.4 : kind === 'snow' ? 2 : 4, __cover: kind });
    kind === 'crate' || kind === 'metal' || kind === 'gift' ? pv(x0, y0, z0, x1, h, z1, kind === 'metal' ? 'metal' : 'wood', kind === 'metal' ? '#7a3a30' : kind === 'gift' ? '#b3202a' : '#8a6a48') : kind === 'snow' && pv(x0, y0, z0, x1, h, z1, 'stone', '#eef2f6');
  }
  for (const [x, zz] of L.spawnTrees) w.box(x - 0.3, 0, zz - 0.3, x + 0.3, 6, zz + 0.3, 'trunk', { pen: 6, mat: 'wood' });
  for (const [x0, z0, x1, z1] of L.cabins) w.box(x0, 0, z0, x1, 3.2, z1, 'wall', { mat: 'wood', pen: 6, __cabin: 1 }), pv(x0, 0, z0, x1, 3.2, z1, 'wood', '#5a4030');
  for (const [x, zz] of L.snowmen) w.box(x - 0.38, 0, zz - 0.38, x + 0.38, 1.75, zz + 0.38, 'prop', { mat: 'dirt', pen: 2, __snowman: 1 });
  {
    const [x, zz] = L.firePit;
    w.box(x - 0.72, 0, zz - 0.72, x + 0.72, 0.42, zz + 0.72, 'prop', { mat: 'concrete', pen: 4 });
  }
  for (const [x, zz] of L.posts) w.box(x - 0.14, 0, zz - 0.14, x + 0.14, 4.6, zz + 0.14, 'trunk', { pen: 6, mat: 'wood' });
  for (const [x0, z0, x1, z1, h] of L.props) w.box(x0, 0, z0, x1, h, z1, 'prop', { mat: 'wood', pen: 3 });
  for (const [x0, z0, x1, z1, h] of L.furniture) w.box(x0, 0, z0, x1, h, z1, 'prop', { mat: 'wood', pen: 3, __furn: 1 });
  // ---------------------------------------------------------------- objectives and spawns
  // ten spawns a team, spread so no two players start inside each other, each checked clear of rock and props
  const sp = (list) => list.map(([x, zz]) => z(...((p) => [p[0], 0, p[1]])(__flNearestClear(A, x, zz, 0.55))));
  A.spawns.T = sp([[52, 116.5], [55.5, 119.5], [59, 116], [62.5, 118.5], [66, 115.5], [67, 120], [70.5, 119.5], [74, 117], [76, 113.5], [57.5, 122.5]]);
  A.spawns.CT = sp([[51.5, 10.5], [55.5, 9.8], [59.5, 8.0], [60, 13.5], [64, 14.5], [68.5, 13.8], [71, 8.0], [72.5, 11.5], [77, 10], [56, 15.5]]);
  A.spawnZones = { T: { min: z(51, 0, 113), max: z(77, 0, 123) }, CT: { min: z(50, 0, 7.5), max: z(78, 0, 16) } };
  A.sites = [
    {
      name: 'A',
      min: z(12, 0, 23),
      max: z(33, 1, 40),
      stage: [z(15, 0, 52), z(45, 0, 50)],
      watch: [z(34, 1.3, 30), z(13, 3.5, 25), z(30, 1.3, 22)],
      hold: [z(16, 0, 36), z(28, 0, 24), z(24, 0, 32)],
    },
    {
      name: 'B',
      min: z(91, 0, 24),
      max: z(113, 1, 41),
      stage: [z(100, 0, 56), z(86, 0, 60)],
      watch: [z(92, 1.3, 23), z(114.5, 1.3, 41.5), z(100, 1.3, 23)],
      hold: [z(107, 0, 39), z(96, 0, 26), z(102, 0, 31)],
    },
  ];
  for (const [name, x0, z0, x1, z1] of __FL_L.areas) A.areas.push({ name, min: z(x0, -1, z0), max: z(x1, 8, z1) });
  A.areas.unshift({ name: 'Bombsite A', min: A.sites[0].min, max: z(33, 5, 40) }, { name: 'Bombsite B', min: A.sites[1].min, max: z(113, 5, 41) });
  A.flagPoints = [
    { name: 'A', pos: z(22, 0, 32) },
    { name: 'B', pos: z(62, 0, 62) },
    { name: 'C', pos: z(102, 0, 33) },
  ];
  A.tdmSpawns = sp([[64, 12.5], [40, 12], [88, 12], [20, 34], [30, 44], [14, 60], [16, 80], [18, 106], [36, 110], [64, 118], [94, 112], [106, 96], [105, 80], [100, 60], [110, 40], [92, 28], [62, 46], [56, 74], [70, 64], [48, 50]]);
  A.poi = [z(22, 0, 32), z(102, 0, 33), z(62, 0, 66), z(15, 0, 70), z(106, 0, 90), z(99, 0, 61), z(84, 0, 60), z(46, 0, 50), z(62, 0, 40), z(18, 0, 104)];
  // lights: the station, the deck, the tunnel, the caverns, the pavilion, the spawns
  for (const [x, y, zz, inside] of [[64, 4, 10, 0], [88, 4, 12, 0], [40, 4, 12, 0], [13, 4.2, 25, 0], [99.5, 3.6, 56, 1], [99.2, 3.6, 68, 1], [86, 3.4, 85, 1], [31, 3.4, 67, 1], [123.5, 2.4, 32, 1], [125.6, 0.9, 32, 1], [111, 3.4, 25, 1], [62, 4, 66, 0], [64, 4, 114, 0], [62.5, 1.4, 121.4, 0], [52, 2.6, 109.6, 0], [71.5, 2.6, 109.6, 0], [54.5, 2.6, 8.7, 0]])
    A.lights.push({ pos: z(x, y, zz), interior: !!inside });
  // the minimap: the 50 cm rock blocks, and every other box as it is
  for (const b of A.boxes) b.__rock || A.__mmBoxes.push(b);
  A.__frost = 1;
  return A;
}
XE.frostline = __frostlineBuild;
{
  const i = BD.findIndex((x) => x.id === 'ridgeback');
  BD.splice(i >= 0 ? i + 1 : 0, 0, {
    id: 'frostline',
    name: 'Frostline',
    blurb: 'An alpine outpost at Christmas. A Long, contested mid, stone arches and a glacier-ice tunnel to B, with three hidden caverns sealed behind ice you can shoot through.',
    size: 'Medium',
    maxPlayers: 20,
  });
}
// no procedural mountain blocks round this map: it draws its own snowy range
{
  const coreMtn = oiA;
  oiA = function () {
    return __FL.inVis ? [] : coreMtn.apply(this, arguments);
  };
  const coreVis = tiA;
  tiA = function (w) {
    __FL.inVis = !!(w && w.__frost);
    try {
      return coreVis.apply(this, arguments);
    } finally {
      __FL.inVis = !1;
    }
  };
}
// ---------------------------------------------------------------- noise
const __flHash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function __flNoise(x, z) {
  const xi = Math.floor(x),
    zi = Math.floor(z),
    xf = x - xi,
    zf = z - zi,
    u = xf * xf * (3 - 2 * xf),
    v = zf * zf * (3 - 2 * zf),
    a = __flHash(xi, zi),
    b = __flHash(xi + 1, zi),
    c = __flHash(xi, zi + 1),
    d = __flHash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const __flFbm = (x, z) => __flNoise(x, z) * 0.55 + __flNoise(x * 2.1 + 7.3, z * 2.1 - 3.1) * 0.3 + __flNoise(x * 4.3 - 2.2, z * 4.3 + 9.4) * 0.15;
// ---------------------------------------------------------------- terrain heights
// Open ground: 0, with a drift banked against the rock. Rock: just behind a lane's cliff face, a strip of snow
// (what shows in the face's recesses); further in, the cliff top at 7.5-13 m (it continues over the rock round
// a cavern; over the cavern itself the snowfield is left out, see __flUnderVault, and the cavern's own floor and
// vault are drawn instead). Beyond the map: a range of mountains climbing to 60-110 m.
function __flHeight(x, z) {
  const { W, D } = __FL,
    top = 7.5 + 5.5 * __flFbm(x * 0.05, z * 0.05);
  if (x < 0 || z < 0 || x > W || z > D) {
    const o = Math.max(-x, -z, x - W, z - D, 0);
    return top + (o * 0.9 + 70 * Math.min(1, o / 90) * __flFbm(x * 0.012 + 4, z * 0.012 - 2)) * Math.min(1, o / 25) + 4 * __flFbm(x * 0.08, z * 0.08);
  }
  const d = __flD(x, z);
  if (d < 0) return Math.max(0, 0.35 * (1 + d / 1.6)) + 0.02 * __flNoise(x * 0.7, z * 0.7);
  const dn = __flDn(x, z);
  if (dn < 1.9) return 0.3 + 0.25 * Math.min(1, dn);
  return top + (dn > 3 ? 1.5 * __flNoise(x * 0.3, z * 0.3) * Math.min(1, (dn - 3) / 4) : 0);
}
// the snowfield is left out under the caverns' vaults (each cavern draws its own floor)
const __flUnderVault = (x, z) => __flD(x, z) < 0.5 && !!__flCaveAt(x, z, -0.1);
// the cliff-top height at a point (the plateau the sculpted faces climb to)
const __flTop = (x, z) => 7.5 + 5.5 * __flFbm(x * 0.05, z * 0.05);
// ---------------------------------------------------------------- materials (Poly Haven textures, triplanar)
function __flTex(name, srgb) {
  const t = new jd().load(__FL.base + 'tex/' + name + '.webp');
  t.wrapS = t.wrapT = 1e3;
  t.anisotropy = 8;
  srgb && (t.colorSpace = 'srgb');
  return t;
}
// A base surface (sampled from all three axes, so cliffs and box sides are never stretched) with snow
// settling on everything that faces up: how much depends on the slope, broken up by noise.
//   capLo / capHi: the face's upward-ness (normal.y) where snow starts / is complete; -2 / -1 = all snow
function __flMat(base, tile, snowTile, capLo, capHi, tint = '#ffffff', desat = 0, gain = 1) {
  const T = __FL.tex,
    m = new Gw({ color: tint, roughness: 1, metalness: 0 }),
    u = {
      tB: { value: T[base + '_diff'] },
      tBN: { value: T[base + '_nor'] },
      tBR: { value: T[base + '_rough'] },
      tS: { value: T.snow_02_diff },
      tSN: { value: T.snow_02_nor },
      tSR: { value: T.snow_02_rough },
      uTile: { value: tile },
      uSnowTile: { value: snowTile },
      uCap: { value: new aA(capLo, capHi) },
      uGrade: { value: new aA(desat, gain) },
    };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFW; varying vec3 vFN;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvFW = (modelMatrix * vec4(transformed, 1.0)).xyz; vFN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vFW; varying vec3 vFN;
uniform sampler2D tB; uniform sampler2D tBN; uniform sampler2D tBR; uniform sampler2D tS; uniform sampler2D tSN; uniform sampler2D tSR;
uniform float uTile; uniform float uSnowTile; uniform vec2 uCap; uniform vec2 uGrade;
float flH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float flN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(flH(i), flH(i + vec2(1, 0)), f.x), mix(flH(i + vec2(0, 1)), flH(i + vec2(1, 1)), f.x), f.y); }`,
      )
      .replace(
        '#include <map_fragment>',
        `
vec3 fN = normalize(vFN);
vec3 bw = pow(abs(fN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
float cn = flN(vFW.xz * 0.35) * 0.6 + flN(vFW.xz * 1.7) * 0.4;
float cap = smoothstep(uCap.x, uCap.y, fN.y + (cn - 0.5) * 0.35);
vec3 bc = vec3(0.0); vec3 bnw = vec3(0.0); float brr = 0.0;
if (cap < 0.995) {
  vec2 ux = vFW.zy / uTile, uy = vFW.xz / uTile, uz = vFW.xy / uTile;
  if (bw.x > 0.01) { bc += texture2D(tB, ux).rgb * bw.x; vec2 d = texture2D(tBN, ux).xy * 2.0 - 1.0; bnw += vec3(0.0, d.y, d.x * sign(fN.x)) * bw.x; brr += texture2D(tBR, ux).g * bw.x; }
  if (bw.y > 0.01) { bc += texture2D(tB, uy).rgb * bw.y; vec2 d = texture2D(tBN, uy).xy * 2.0 - 1.0; bnw += vec3(d.x, 0.0, -d.y) * bw.y; brr += texture2D(tBR, uy).g * bw.y; }
  if (bw.z > 0.01) { bc += texture2D(tB, uz).rgb * bw.z; vec2 d = texture2D(tBN, uz).xy * 2.0 - 1.0; bnw += vec3(d.x * sign(fN.z), d.y, 0.0) * bw.z; brr += texture2D(tBR, uz).g * bw.z; }
}
vec3 sc = vec3(0.0); vec3 snw = vec3(0.0); float sr = 0.8;
if (cap > 0.005) {
  vec2 us = vFW.xz / uSnowTile;
  sc = texture2D(tS, us).rgb; vec2 d = texture2D(tSN, us).xy * 2.0 - 1.0; snw = vec3(d.x, 0.0, -d.y); sr = texture2D(tSR, us).g;
  // fresh snow: the scan's dark tracks toned down; on a steep face a touch shaded (packed into hollows)
  sc = mix(sc, vec3(0.93, 0.95, 0.98), 0.4) * mix(0.86, 1.0, smoothstep(0.2, 0.9, fN.y));
}
bc = mix(bc, vec3(dot(bc, vec3(0.299, 0.587, 0.114))), uGrade.x) * uGrade.y;
diffuseColor.rgb *= mix(bc, sc * 1.06, cap);
float flRough = mix(brr, sr, cap);
vec3 flNW = normalize(fN + mix(bnw * 1.1, snw * 0.6, cap));
`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(flRough, 0.35, 1.0);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(flNW, 0.0)).xyz);');
  };
  m.customProgramCacheKey = () => 'frostline-tri2';
  return m;
}
// ice: translucent, glassy, a frosted surface (the rock normal at a large scale)
function __flIce(opacity) {
  const m = new Gw({ color: '#b4dcee', roughness: 0.05, metalness: 0.05, transparent: !0, opacity, envMapIntensity: 2.6, emissive: '#1d4a62', emissiveIntensity: 0.2 }),
    u = { tN: { value: __FL.tex.rock_face_nor } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vIW; varying vec3 vIN;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvIW = (modelMatrix * vec4(transformed, 1.0)).xyz; vIN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vIW; varying vec3 vIN; uniform sampler2D tN;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{ vec3 n = normalize(vIN); vec3 bw = abs(n) / (abs(n.x) + abs(n.y) + abs(n.z));
  vec2 dx = texture2D(tN, vIW.zy / 1.7).xy * 2.0 - 1.0, dy = texture2D(tN, vIW.xz / 1.7).xy * 2.0 - 1.0, dz = texture2D(tN, vIW.xy / 1.7).xy * 2.0 - 1.0;
  vec3 p = vec3(0.0, dx.y, dx.x) * bw.x + vec3(dy.x, 0.0, dy.y) * bw.y + vec3(dz.x, dz.y, 0.0) * bw.z;
  normal = normalize((viewMatrix * vec4(normalize(n + p * 0.7), 0.0)).xyz); }`,
      );
  };
  m.customProgramCacheKey = () => 'frostline-ice';
  return m;
}
// ---------------------------------------------------------------- geometry
function __flHeightGeo(x0, z0, x1, z1, step, skip, relief = 0) {
  const nx = Math.round((x1 - x0) / step) + 1,
    nz = Math.round((z1 - z0) / step) + 1,
    pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * step,
        zz = z0 + j * step,
        k = (j * nx + i) * 3;
      let px = x,
        pz = zz;
      const y = __flHeight(x, zz);
      // the cliff faces: a little horizontal jitter, so they read as broken rock rather than a grid
      if (y > 1 && x > 0 && zz > 0 && x < __FL.W && zz < __FL.D) {
        px += (__flNoise(x * 0.9, zz * 0.9 + 5) - 0.5) * 0.35;
        pz += (__flNoise(x * 0.9 + 9, zz * 0.9) - 0.5) * 0.35;
      }
      pos[k] = px;
      pos[k + 1] = y;
      pos[k + 2] = pz;
    }
  const idx = [];
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      if (skip && skip(x0 + (i + 0.5) * step, z0 + (j + 0.5) * step)) continue;
      const a = j * nx + i,
        b = a + 1,
        c = a + nx,
        d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const geo = new uw();
  geo.setAttribute('position', new gi(pos, 3));
  geo.setIndex(nx * nz > 65535 ? new gi(new Uint32Array(idx), 1) : new gi(new Uint16Array(idx), 1));
  geo.computeVertexNormals();
  if (relief) {
    const nrm = geo.getAttribute('normal').array;
    for (let k = 0; k < pos.length; k += 3) {
      const ny = nrm[k + 1];
      if (ny > 0.75 || pos[k + 1] < 0.6) continue;
      const a = (1 - Math.max(0, ny) / 0.75) * relief,
        o = (__flNoise(pos[k] * 0.45 + pos[k + 1] * 0.3, pos[k + 2] * 0.45 - pos[k + 1] * 0.2) - 0.5) * 2 + (__flNoise(pos[k] * 1.4, pos[k + 2] * 1.4 + pos[k + 1]) - 0.5) * 0.7;
      pos[k] += nrm[k] * o * a;
      pos[k + 1] += nrm[k + 1] * o * a;
      pos[k + 2] += nrm[k + 2] * o * a;
    }
    geo.computeVertexNormals();
  }
  geo.computeBoundingSphere();
  return geo;
}
// boxes merged into one geometry (normals per face); `inset` shrinks the visual a hair inside the collider
function __flBoxesGeo(list) {
  const P = [],
    N = [],
    I = [];
  for (const [x0, y0, z0, x1, y1, z1] of list) {
    const faces = [
      [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]],
      [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0]],
      [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]],
      [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0]],
      [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1], [0, 0, 1]],
      [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1]],
    ];
    for (const [a, b, c, d, n] of faces) {
      const k = P.length / 3;
      P.push(...a, ...b, ...c, ...d);
      for (let q = 0; q < 4; q++) N.push(...n);
      I.push(k, k + 1, k + 2, k, k + 2, k + 3);
    }
  }
  const geo = new uw();
  geo.setAttribute('position', new gi(new Float32Array(P), 3));
  geo.setAttribute('normal', new gi(new Float32Array(N), 3));
  geo.setIndex(I);
  geo.computeBoundingSphere();
  return geo;
}
// ---------------------------------------------------------------- the scenery
function __flModels(cb) {
  const want = [
    'rock_face_02', 'wooden_crate_02', 'barrel_03', 'metal_jerrycan', 'portable_generator', 'portable_searchlight', 'dead_tree_trunk', 'old_military_crate',
    'street_lamp_02', 'wooden_lantern_01', 'barrel_stove', 'stone_fire_pit', 'wooden_barrels_01', 'cardboard_box_01', 'ammo_box',
    'wooden_crate_01', 'tree_stump_01', 'wooden_bucket_01',
  ],
    got = {};
  let left = want.length + 1;
  // the firs: LOLIPOP's game-ready fir pack (already in the game, five trees with four detail levels each)
  __glbParse(
    './game/models/veg/fir-pack.glb',
    (g) => ((got.firs = g), --left || cb(got)),
    () => --left || cb(got),
  );
  for (const n of want)
    __glbParse(
      __FL.base + 'models/' + n + '.glb',
      (g) => ((got[n] = g), --left || cb(got)),
      () => --left || cb(got),
    );
}
// a model's meshes as (geometry, material, matrix relative to the chosen node's base centre)
function __flParts(g, prefix) {
  g.scene.updateMatrixWorld(!0);
  const meshes = [],
    bb = new xi();
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    let ok = !prefix;
    // (the loader turns spaces in node names into underscores: compare letters and digits only)
    const key = prefix && prefix.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let p = o; p && !ok; p = p.parent) p.name && p.name.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(key) && (ok = !0);
    ok && (meshes.push(o), bb.expandByObject(o));
  });
  const off = new _A().makeTranslation(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2),
    out = [];
  meshes.forEach((o) => {
    const m = o.material;
    (m.transparent || m.alphaTest > 0) && ((m.transparent = !1), (m.alphaTest = 0.35), (m.side = 2), (m.depthWrite = !0), (m.__foliage = 1));
    'metalness' in m && !m.metalnessMap && (m.metalness = 0);
    out.push({ geo: o.geometry, mat: m, M: off.clone().multiply(o.matrixWorld) });
  });
  return { parts: out, size: bb.getSize(new U()) };
}
function __flInstance(root, parts, list, cast) {
  const M = new _A(),
    Q = new Kw(),
    S = new U(),
    P = new U(),
    Y = new U(0, 1, 0);
  for (const p of parts) {
    const im = new QZ(p.geo, p.mat, list.length);
    list.forEach(([x, y, zz, s, r], k) => im.setMatrixAt(k, M.compose(P.set(x, y, zz), Q.setFromAxisAngle(Y, r), S.setScalar(s)).multiply(p.M)));
    im.instanceMatrix.needsUpdate = !0;
    im.computeBoundingSphere();
    im.castShadow = !!cast;
    im.receiveShadow = !0;
    root.add(im);
  }
}
// snow dusting on the firs' needles: everything that faces up whitens
function __flSnowy(m) {
  if (m.__snowy) return;
  m.__snowy = 1;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev && prev.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vUp;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvUp = normalize(mat3(modelMatrix) * objectNormal).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vUp;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.95, 1.0), smoothstep(0.15, 0.75, vUp) * 0.8);');
    m.__foliage &&
      (sh.fragmentShader = sh.fragmentShader.replace(
        '#include <alphatest_fragment>',
        `#ifdef USE_MAP
        { vec2 tsz = vec2(textureSize(map, 0)); vec2 dx = dFdx(vMapUv * tsz), dy = dFdy(vMapUv * tsz);
          float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy)))); diffuseColor.a *= 1.0 + mip * 0.35; }
        #endif
        if (diffuseColor.a < alphaTest) discard;`,
      ));
  };
  m.customProgramCacheKey = () => 'frostline-snowy-' + (m.alphaTest > 0 ? 'a' : 'o');
  m.needsUpdate = !0;
}
function __flBuildView(models) {
  const { W, D } = __FL,
    L = __FL_L,
    root = new ji();
  root.name = 'bp-frostline';
  const T = __FL.tex;
  // terrain inside the map (0.5 m) and the mountain range round it (4 m, overlapping the edge a little)
  const terrMat = __flMat('rock_face', 6, 4.5, 0.42, 0.72, '#c3ccd6', 0.85, 1.45),
    inner = new Ow(__flHeightGeo(0, 0, W, D, 0.5, __flUnderVault, 0.55), terrMat);
  inner.receiveShadow = !0;
  inner.name = 'frost_terrain';
  root.add(inner);
  const outer = new Ow(__flHeightGeo(-200, -200, W + 200, D + 200, 4, (x, zz) => x > 0 && zz > 0 && x < W && zz < D, 2), __flMat('rock_face', 14, 9, 0.35, 0.65, '#c3ccd6', 0.85, 1.45));
  outer.name = 'frost_range';
  outer.receiveShadow = !0;
  root.add(outer);
  // shadows from the terrain: a 2 m copy, only the shadow cameras see it (layer 1)
  const shadow = new Ow(__flHeightGeo(0, 0, W, D, 2, __flUnderVault), new Ni({ colorWrite: !1 }));
  shadow.castShadow = !0;
  shadow.layers.set(1);
  shadow.position.y = -0.05;
  root.add(shadow);
  // the cliff faces: sculpted rock standing on every edge of open ground, snow on the ledges, a snow cornice
  // on top; in the caverns, ice, rock or timber walls up to the vault
  __flCliffs(root, terrMat);
  // the caverns' vaults and floors, the arched portals and the stone arches, the ice pavilion
  __flCaves(root, terrMat);
  __flArches(root);
  __flPavilion(root);
  // cover, the deck (built from the map's own boxes, so what you see is what you hit)
  const m = aw(),
    wood = [],
    metal = [],
    snow = [],
    deck = [];
  for (const b of m.boxes) {
    const r = [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z];
    b.__cover === 'crate' ? wood.push(r) : b.__cover === 'metal' ? metal.push(r) : b.__cover === 'snow' ? snow.push(r) : b.__deck && deck.push(r);
  }
  __flCrates(root, wood);
  __flDeck(root, deck);
  __flContainers(root, metal);
  __flSnowbanks(root, snow);
  // the breakable ice in the portals: one mesh each, filling the arch, hidden when it shatters
  __FL.panes = [];
  m.panes.forEach((p, i) => {
    if (!p.box.__ice) return;
    const o = new Ow(__flIceWallGeo(p.box), __FL.iceWall || (__FL.iceWall = __flIce(0.86)));
    o.name = 'frost_icewall';
    root.add(o);
    __FL.panes.push([i, o]);
  });
  // models: firs on the ridges and the range, boulders, crates, barrels, gear
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
    low = Zw.getState().quality === 'low';
  if (models.firs) {
    // five firs in the pack: 1-3 tall (8-9 m), 4-5 young (4 m). On the ridges: detail level 1; the range:
    // detail level 2 (full 3D trees; the flat billboard level is used only on Low, past 110 m)
    const V = ['', '_2', '_3', '_4', '_5'],
      near = V.map(() => []),
      far = V.map(() => []),
      flat = V.map(() => []);
    // (the ridge firs cast no shadows: theirs fall on the cliff tops, which no one sees, and alpha-tested
    // needles are the costliest thing to draw into a shadow map. Those further from the lanes use the lighter
    // detail level)
    for (let k = 0, n = 0; k < 3000 && n < (low ? 60 : 90); k++) {
      const x = 2 + rnd() * (W - 4),
        zz = 2 + rnd() * (D - 4),
        d = Math.min(__flDn(x, zz), __flD(x, zz));
      if (d < 3) continue;
      const v = Math.floor(rnd() * 5);
      (d < 5.5 ? near : far)[v].push([x, __flHeight(x, zz) - 0.2, zz, (v < 3 ? 1.0 : 1.3) + rnd() * 0.5, rnd() * 6.28]);
      n++;
    }
    for (let k = 0; k < 140; k++) {
      const a = rnd() * 6.28,
        r = 72 + rnd() * 80,
        x = W / 2 + Math.cos(a) * r,
        zz = D / 2 + Math.sin(a) * r;
      (low && r > 110 ? flat : far)[k % 3].push([x, __flHeight(x, zz) - 0.3, zz, 1.2 + rnd() * 0.8, rnd() * 6.28]);
    }
    V.forEach((v, k) => {
      for (const [lod, list, cast] of [['_LOD1_', near[k], !1], ['_LOD2_', far[k], !1], ['_LOD3_', flat[k], !1]]) {
        if (!list.length) continue;
        const n = __flParts(models.firs, 'Christmas tree' + v + lod);
        n.parts.forEach((p) => __flSnowy(p.mat));
        __flInstance(root, n.parts, list, cast);
      }
    });
  }
  // boulders along the cliff tops (seen against the sky from the lanes) and on the range
  if (models.rock_face_02) {
    const list = [];
    for (let k = 0; k < 9000 && list.length < (low ? 30 : 55); k++) {
      const x = 1 + rnd() * (W - 2),
        zz = 1 + rnd() * (D - 2),
        d = Math.min(__flD(x, zz), __flDn(x, zz));
      if (d < 3.2 || d > 7) continue;
      list.push([x, __flHeight(x, zz) - 0.6 - rnd() * 0.5, zz, 0.8 + rnd() * 1.2, rnd() * 6.28]);
    }
    const r = __flParts(models.rock_face_02);
    r.parts.forEach((p) => (p.mat.color && p.mat.color.set('#9aa4ae'), __flSnowy(p.mat)));
    __flInstance(root, r.parts, list, !1);
  }
  // props on the cover boxes and round the spawns
  const deco = (name, list) => models[name] && list.length && __flInstance(root, __flParts(models[name]).parts, list, !0);
  deco('barrel_03', m.boxes.filter((b) => b.__cover === 'barrel').map((b) => [(b.min.x + b.max.x) / 2, 0, (b.min.z + b.max.z) / 2, 1, rnd() * 6.28]));
  deco('wooden_crate_02', [[16, 1.3, 105, 1, 0.5], [102.2, 1.3, 99.7, 1, 1]]);
  deco('portable_generator', [[30, 2.5, 35.2, 1.2, 0.5], [109.2, 2.5, 34, 1.2, 2], [66, 2.5, 10.2, 1.2, 0]]);
  deco('metal_jerrycan', [[97.6, 0, 61, 1, 0.4], [70, 0, 75, 1, 1.2], [21.5, 0, 33, 1, 2.2], [104.6, 1.3, 37.6, 1, 0.2]]);
  deco('portable_searchlight', [[16.5, 2.2, 22, 3, 2.4], [109, 2.5, 31.5, 3, 2.8]]);
  deco('dead_tree_trunk', [[109, 0, 96, 1, 1.4], [14, 0, 77, 1, 0.2], [62, 0, 96, 1, 1.7]]);
  deco('old_military_crate', [[63, 0, 12.5, 1, 0]]);
  // falling snow: 5,000 flakes in a 60 m box round the camera, moved on the GPU (no per-frame CPU work)
  {
    const n = 5000,
      p = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) p[i] = rnd();
    const geo = new uw();
    geo.setAttribute('position', new gi(p, 3));
    geo.boundingSphere = new DB(new U(), 1e6);
    const mat = new Dd({ color: '#ffffff', size: 0.06, map: bY(), transparent: !0, opacity: 0.9, depthWrite: !1, fog: !0 }),
      uu = { uT: { value: 0 }, uC: { value: new U() } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uu);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform vec3 uC;').replace(
        '#include <begin_vertex>',
        `vec3 r = position; float B = 60.0;
        vec3 q = vec3(r.x * B + sin(uT * 0.6 + r.y * 40.0) * 0.6 + uT * 0.9, r.y * 40.0 - uT * (0.9 + r.z * 0.6), r.z * B + cos(uT * 0.5 + r.x * 30.0) * 0.6);
        q = mod(q - uC + vec3(B * 0.5, 20.0, B * 0.5), vec3(B, 40.0, B)) + uC - vec3(B * 0.5, 20.0, B * 0.5);
        vec3 transformed = q;`,
      );
    };
    mat.customProgramCacheKey = () => 'frostline-snowfall';
    const pts = new MZ(geo, mat);
    pts.frustumCulled = !1;
    pts.name = 'frost_snowfall';
    __FL.snowPts = pts;
    root.add(pts);
    __FL.snowU = uu;
  }
  // Christmas: decorated trees, lights, presents, cabins, snowmen (63-frostline-christmas.js)
  try {
    __flChristmas(root, models);
  } catch (e) {
    console.warn('[frostline] christmas', e);
  }
  return root;
}
function __flLoad() {
  if (__FL.loading || __FL.ready) return;
  __FL.loading = !0;
  const T = (__FL.tex = {});
  for (const id of ['snow_02', 'rock_face', 'brown_planks_05', 'blue_metal_plate', 'weathered_plank_siding', 'rustic_stone_wall', 'roof_planks']) for (const k of ['diff', 'nor', 'rough']) T[id + '_' + k] = __flTex(id + '_' + k, k === 'diff');
  const sky = new jd().load(__FL.base + 'sky.webp');
  sky.mapping = 303;
  sky.colorSpace = 'srgb';
  __FL.sky = sky;
  __flModels((models) => {
    __FL.models = models;
    __FL.ready = !0;
    __FL.loading = !1;
    __FL.rev++;
    for (const f of __FL.subs) f(__FL.rev);
  });
}
// ---------------------------------------------------------------- drawing (with the map's tree layer)
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw(),
      on = m.id === 'frostline',
      [rev, setRev] = S.useState(__FL.rev);
    S.useEffect(() => {
      __FL.subs.add(setRev);
      on && __flLoad();
      // catch up: a load that finished between the first render and this subscription was missed (the view
      // then never built: the map's bare base geometry, untextured)
      setRev(__FL.rev);
      return () => __FL.subs.delete(setRev);
    }, [on]);
    const root = S.useMemo(() => {
      if (!on || !__FL.ready) return null;
      try {
        return __flBuildView(__FL.models);
      } catch (e) {
        console.warn('[frostline] build', e);
        return null;
      }
    }, [on, rev, m]);
    // leaving the map: free what was built for it, give the sky and fog back
    S.useEffect(
      () => () => {
        if (!root) return;
        root.traverse((o) => o.isMesh && o.name.startsWith('frost_') && (o.geometry.dispose(), o.material.__flOwn && o.material.dispose()));
        const s = __FL.scene;
        s && __FL.bg !== void 0 && ((s.background = __FL.bg), (__FL.bg = void 0));
        __FL.skyMesh && ((__FL.skyMesh.visible = !0), (__FL.skyMesh = null));
      },
      [root],
    );
    QI((s, dt) => {
      if (!root) return;
      try {
        const sc = s.scene;
        __FL.scene = sc;
        __FL.snowU && ((__FL.snowU.uT.value += Math.min(dt, 0.1)), __FL.snowU.uC.value.copy(s.camera.position));
        // no snow falling inside a cavern
        if (__FL.snowPts && (__FL.n || 0) % 10 === 0) __FL.snowPts.visible = !__flCaveAt(s.camera.position.x, s.camera.position.z, -0.3);
        for (const [i, o] of __FL.panes) o.visible = !m.panes[i].broken;
        for (const f of __FL.ticks || []) f(dt, s);
        if ((__FL.n = (__FL.n || 0) + 1) % 30 === 1) {
          // the winter sky (day and dusk; at night the game's own stars), the shadow layer, the haze
          const tod = Zw.getState().timeOfDay;
          sc.traverse((o) => {
            o.isMesh && o.material && o.material.name !== void 0 && /Sky/.test(o.material.type + o.material.name) && tod !== 'night' && ((__FL.skyMesh = o), (o.visible = !1));
            o.isLight && o.castShadow && o.shadow && o.shadow.camera.layers.enable(1);
          });
          if (tod !== 'night' && sc.background !== __FL.sky) (__FL.bg = sc.background), (sc.background = __FL.sky);
          sc.fog && sc.fog.isFog && ((sc.fog.near = 20), (sc.fog.far = tod === 'night' ? 140 : 230), sc.fog.color.set(tod === 'night' ? '#1c2433' : tod === 'dusk' ? '#c9c2c4' : '#dfe6ee'));
        }
      } catch (e) {}
    });
    return M.jsxs(M.Fragment, { children: [M.jsx(prevTrees, {}), root ? M.jsx('primitive', { object: root }, 'fl' + rev) : null] });
  };
}
// designer's check (dev): path lengths from each spawn to each site and to the mid choke, along the bots'
// own walk grid, and the times at running speed (see docs/maps/frostline.md for the targets)
typeof window < 'u' &&
  (window.__bpFrostline = (speed = 6.3) => {
    const len = (a, b) => {
      const p = KT(a, b);
      if (!p || !p.length) return null;
      let L = 0,
        q = a;
      for (const s of p) (L += Math.hypot(s.x - q.x, s.z - q.z)), (q = s);
      return L;
    };
    const m = aw(),
      ct = { x: 64, y: 0, z: 11 },
      t = { x: 64, y: 0, z: 117 },
      sA = { x: 22, y: 0, z: 32 },
      sB = { x: 102, y: 0, z: 33 },
      midDoors = { x: 62, y: 0, z: 83 },
      out = {};
    for (const [k, a, b] of [['CT -> A', ct, sA], ['CT -> B', ct, sB], ['T -> A', t, sA], ['T -> B', t, sB], ['CT -> mid doors', ct, midDoors], ['T -> mid doors', t, midDoors], ['A -> B (CT rotation)', sA, sB]]) {
      const L = len(a, b);
      out[k] = L ? `${L.toFixed(0)} m, ${(L / speed).toFixed(1)} s` : 'no path';
    }
    return { map: m.id, ...out };
  });
// test hook: which ice walls are whole
typeof window < 'u' && (window.__bpIce = () => aw().panes.map((p, i) => (p.box.__ice ? (p.broken ? 'broken' : 'whole') : null)).filter(Boolean).join(','));

// test hook: does the collision match what is drawn? Samples the whole map every 10 cm:
//   blocked: points on open ground more than 15 cm from any drawn rock face that a rock box covers
//     (an invisible wall); holes: points more than 35 cm inside drawn rock that no rock box covers
//   spawns: every spawn point clear of rock and props, and with a path to both bomb sites
typeof window < 'u' &&
  (window.__bpFrostCheck = () => {
    const m = aw(),
      rock = m.boxes.filter((b) => b.__rock),
      grid = new Map();
    for (const b of rock)
      for (let x = Math.floor(b.min.x); x <= Math.floor(b.max.x - 1e-6); x++)
        for (let zz = Math.floor(b.min.z); zz <= Math.floor(b.max.z - 1e-6); zz++) (grid.get(x * 256 + zz) || grid.set(x * 256 + zz, []).get(x * 256 + zz)).push(b);
    const inRock = (x, zz) => (grid.get(Math.floor(x) * 256 + Math.floor(zz)) || []).some((b) => x >= b.min.x && x < b.max.x && zz >= b.min.z && zz < b.max.z);
    let blocked = 0,
      holes = 0,
      worst = 0;
    const where = [];
    for (let x = 0.05; x < __FL.W; x += 0.1)
      for (let zz = 0.05; zz < __FL.D; zz += 0.1) {
        const d = __flD(x, zz);
        if (d < -0.15 && inRock(x, zz)) blocked++, (worst = Math.min(worst, d)), where.length < 8 && where.push([+x.toFixed(1), +zz.toFixed(1), +d.toFixed(2)]);
        d > 0.35 && !inRock(x, zz) && holes++;
      }
    const sA = { x: 22, y: 0, z: 32 },
      sB = { x: 102, y: 0, z: 33 },
      spawns = [...m.spawns.T, ...m.spawns.CT, ...m.tdmSpawns].map((p) => ({ at: [+p.x.toFixed(1), +p.z.toFixed(1)], clear: __flClear(m, p.x, p.z, 0.4), A: !!KT(p, sA), B: !!KT(p, sB) }));
    const portals = {};
    for (const id in __FL_L.caves) portals[id] = __flPortals(__FL_L.caves[id]).map((p) => [+((p.ax + p.bx) / 2).toFixed(1), +((p.az + p.bz) / 2).toFixed(1), +(p.s1 - p.s0).toFixed(1)]);
    return { portals, rockBoxes: rock.length, boxes: m.boxes.length, blocked, worst: +worst.toFixed(2), where, holes, spawnsT: m.spawns.T.length, spawnsCT: m.spawns.CT.length, badSpawns: spawns.filter((s) => !s.clear || !s.A || !s.B) };
  });
// test hook (dev): which of the map's meshes is under a point of the screen (-1..1)
typeof window < 'u' &&
  (window.__bpPick = (sx, sy) => {
    const R = window.__bpR3F(),
      rc = new UZ();
    let g;
    R.scene.traverse((o) => o.name === 'bp-frostline' && (g = o));
    rc.setFromCamera(new aA(sx, sy), R.camera);
    const h = g && rc.intersectObject(g, !0)[0];
    return h ? { name: h.object.name || '(model)', mat: h.object.material.type, key: h.object.material.customProgramCacheKey ? h.object.material.customProgramCacheKey() : '', at: [h.point.x, h.point.y, h.point.z].map((v) => +v.toFixed(2)), n: h.face && [h.face.normal.x, h.face.normal.y, h.face.normal.z].map((v) => +v.toFixed(2)) } : null;
  });
