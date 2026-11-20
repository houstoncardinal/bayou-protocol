/* ===== Bayou Tactical mod: Foundry (a steel mill: the owner's Industrial texture packs) ===== */
// Bomb defusal (and every mode) in a working steel mill, 88 x 96 m. North is CT, south T.
//
//   A Heaven (crane platform)    CT Spawn (office plaza)    CT to B + the stair to B Heaven
//   A: the RAIL YARD                    Top Mid                 B: the CRUCIBLE HALL
//     a freight train through the site    |  \_ Pipes ------------ (B Heaven: the catwalk over CT's door,
//     (behind it, the coupler gap, round   |                         the crucible in the middle, the furnace,
//     both ends); a gantry crane carries   |                         the ladle that pours every 45 s)
//     a container back and forth overhead  |                              |
//   A Short: a ramp up over Mid's west side, Mid Doors             Bay Doors
//     a landing, down into A                 |                        |
//   A Long (the Rails) -- Garage -- Lower Mid -- Underpass -- the Loading Bay (B Main)
//   Scrap Yard ------------------- T Spawn (truck yard) --------------- Coal Yard
//
// What makes it play:
//   - each site has three ways in and a high position: A Heaven (CT's, over A, 3.08 m) and B Heaven (the
//     catwalk, 3.08 m), each answered from somewhere (Short's landing sees A Heaven; Pipes sees the catwalk)
//   - mid control pays: Pipes (Mid -> B, CT side of the doors) is the fastest way onto B, Short the fastest onto A
//   - the train splits A: behind it (A Long's side), through the 2.5 m coupler gap, round its north end (a
//     1.5 m squeeze under A Heaven) or its south end; from A Heaven a running jump lands on the boxcar's roof
//   - long (the Rails, Mid), medium (A, the yards) and close (Pipes, the hall, the Bay Doors) fights
//   - the show: every 45 s the ladle over the crucible tips and pours, the hall flares orange, sparks fly and the
//     pour roars; embers drift up from the furnace all the time; the gantry crane slides over A with a container
//     swinging under it (its shadow crosses the site); stacks and cooling towers stand round the mill
// Built with the game's grid builder (walls, floors, ramps, the catwalk deck, roofs, crates, the walk grid,
// spawns, sites, callouts) plus solid props of its own (the train, the crucible, coils, trailers), drawn by the
// map pipeline (65-prison-view.js) with the owner's 16 Industrial PBR materials (tools/build-industrial.mjs) at
// their real-world sizes.
const __FD = { base: './game/maps/foundry/', prison: './game/maps/prison/', pourBuf: null };
// ---------------------------------------------------------------- the layout (2 m cells; digits are heights, 0.44 m each)
// custom solid props (metres): [x0, z0, x1, z1, y0, y1, kind]
const __FD_PROPS = [
  // A: the freight train on the yard's track: a boxcar, the coupler gap (2 m: a peek), a flatcar of steel coils
  [10.2, 21.5, 13.2, 32.5, 0, 3.4, 'boxcar'],
  [10.2, 35, 13.2, 41, 0, 1.3, 'flatcar'],
  [10.4, 35.6, 13.0, 37.4, 1.3, 3.1, 'coilx'],
  [10.4, 38.6, 13.0, 40.4, 1.3, 3.1, 'coilx'],
  // A: a coil stack by Short's foot; I-beams
  [27.4, 36.4, 30.6, 38.2, 0, 1.8, 'coils2'],
  [15.6, 26.6, 21.6, 27.8, 0, 1.1, 'beams'],
  // B: the crucible in the middle of the site (round: four boxes)
  [65.5, 30.0, 70.5, 32.0, 0, 2.4, 'crucible'],
  [67.0, 28.5, 69.0, 33.5, 0, 2.4, 'crucible'],
  [66.0, 29.25, 70.0, 32.75, 0, 2.4, 'crucible'],
  [66.25, 29.0, 69.75, 33.0, 0, 2.4, 'crucible'],
  // T spawn: two semi-trailers
  [22.0, 88.4, 34.0, 91.0, 0, 3.8, 'trailer'],
  [64.0, 88.4, 76.0, 91.0, 0, 3.8, 'trailer'],
  // B: the catwalk's columns; A Heaven: the crane's control cabin
  [60.85, 21.6, 61.15, 21.9, 0, 2.73, 'col'], [66.35, 21.6, 66.65, 21.9, 0, 2.73, 'col'], [71.85, 21.6, 72.15, 21.9, 0, 2.73, 'col'], [77.35, 21.6, 77.65, 21.9, 0, 2.73, 'col'],
  [4.4, 6.4, 9.0, 11.4, 3.08, 5.9, 'cabin'],
  // Outside Long: a scrap heap; Outside B: coil stack
  [9.0, 82.0, 13.0, 86.5, 0, 2.2, 'scrap'],
  [76.0, 85.0, 79.6, 86.8, 0, 1.8, 'coils2'],
];
const __FD_ROOFS = [
  { r: [29, 8, 39, 11], y: 9, fill: 0 }, // the Crucible Hall: three bays, skylights at rows 12 and 17
  { r: [29, 13, 39, 16], y: 9, fill: 0 },
  { r: [29, 18, 39, 22], y: 9, fill: 0 },
  { r: [25, 18, 28, 20], y: 3.6, fill: 0 }, // Pipes
  { r: [7, 31, 16, 33], y: 3.6, fill: 0 }, // the Garage
  { r: [25, 31, 33, 33], y: 3.6, fill: 0 }, // the Underpass
  { r: [34, 30, 41, 36], y: 5.2, fill: 0 }, // the Loading Bay
  { r: [37, 23, 39, 29], y: 4.4, fill: 0 }, // the Bay Doors
];
const __FD_DEF = {
  id: 'foundry',
  name: 'Foundry',
  cols: 44,
  rows: 48,
  base: 0,
  upper: 3.08,
  backdrop: 'industrial',
  mid: [21, 22],
  theme: {
    walls: ['#b9bcbc', '#a9aeb0', '#c5c3bb', '#8f9a9a', '#b5ad9c'],
    wallMat: 'concrete',
    trim: '#7e8486',
    plinth: '#6d7173',
    ground: ['asphalt', '#55534e'],
    paved: ['concrete', '#9a978f'],
    retain: ['concrete', '#8e8b84'],
    ceiling: '#5b5f62',
    door: '#3e5b6e',
    shutters: ['#3e5b6e', '#4a4f53'],
    awnings: ['#c5a02c', '#3e5b6e'],
    crate: '#7b6a4c',
    hmin: 9,
    hmax: 13,
    windows: !1,
  },
  carve: (w) => {
    const c = (r, ch) => w.carve(r, ch),
      s = (x, y, ch) => w.set(x, y, ch),
      ramp = (cells, from = 1) => cells.forEach(([x0, y0, x1, y1], i) => c([x0, y0, x1, y1], Pe(from + i)));
    // ---- CT spawn (the office plaza)
    c([16, 2, 27, 7], '.');
    Ye(w, 17, 3, 26, 5, 'C');
    // ---- CT to A, and A Heaven: the crane platform (3.08 m) in A's north-west corner, its stair up from CT's side
    c([8, 4, 15, 6], '.');
    c([2, 3, 7, 9], '7');
    ramp([[13, 3, 13, 3], [12, 3, 12, 3], [11, 3, 11, 3], [10, 3, 10, 3], [9, 3, 9, 3], [8, 3, 8, 3]]);
    // ---- A: the Rail Yard
    c([8, 7, 15, 9], '.');
    c([2, 10, 15, 21], '.');
    // ---- A Long (the Rails): down the west wall, the Long Doors (a 4 m gap), Outside Long (the scrap yard)
    c([2, 22, 6, 36], '.');
    for (const x of [2, 5, 6]) s(x, 24, '#');
    c([2, 37, 11, 45], '.');
    // ---- A Short: up from Mid's west side over a ramp, a landing, down into A from the east
    c([19, 8, 24, 29], '.');
    ramp([[19, 21, 20, 21], [19, 20, 20, 20], [19, 19, 20, 19], [19, 18, 20, 18], [19, 17, 20, 17], [19, 16, 20, 16]]);
    c([18, 14, 20, 15], '6');
    ramp([[13, 14, 13, 15], [14, 14, 14, 15], [15, 14, 15, 15], [16, 14, 16, 15], [17, 14, 17, 15]]);
    // ---- Mid (the Pour): the Mid Doors (a 4 m gap), Lower Mid
    c([19, 26, 20, 26], '#');
    c([23, 26, 24, 26], '#');
    c([17, 30, 26, 39], '.');
    // ---- T spawn (the truck yard), Outside B (the coal yard)
    c([12, 40, 31, 45], '.');
    Ye(w, 14, 41, 30, 43, 'T');
    c([32, 37, 41, 45], '.');
    // ---- the connectors: the Garage (Long <-> Lower Mid), the Underpass (Lower Mid <-> the Loading Bay)
    c([7, 31, 16, 33], ',');
    c([25, 31, 33, 33], ',');
    // ---- B: the Crucible Hall; Pipes (from Mid); CT's door and the stair to B Heaven (the catwalk over it, 3.08 m)
    c([29, 8, 39, 22], ',');
    c([34, 8, 39, 8], '#');
    c([38, 12, 39, 15], '#'); // the furnace
    c([25, 18, 28, 20], ',');
    c([28, 3, 31, 7], '.');
    ramp([[32, 3, 33, 3], [32, 4, 33, 4], [32, 5, 33, 5], [32, 6, 33, 6], [32, 7, 33, 7], [32, 8, 33, 8]]);
    c([29, 9, 39, 10], 'L');
    // ---- B Main: the Loading Bay (a truck dock along its east side, 2.2 m), the Bay Doors up into the hall
    c([34, 30, 41, 36], ',');
    c([40, 30, 41, 35], '5');
    c([37, 23, 39, 29], ',');
    // ---- cover: crates (x single, X double), barrels (o), half walls (=)
    for (const [x, y, ch] of [
      [11, 12, 'X'], [8, 19, 'x'], [11, 17, '='], [12, 17, '='], [14, 11, 'o'],
      [22, 11, 'X'], [23, 19, 'x'], [24, 28, 'o'], [18, 34, 'x'], [25, 36, 'X'], [21, 37, '='], [22, 37, '='],
      [5, 30, 'x'], [3, 34, 'o'], [8, 40, 'X'], [4, 43, 'x'],
      [35, 40, 'X'], [40, 43, 'x'], [38, 38, 'o'], [36, 32, 'x'], [38, 34, 'X'], [39, 27, 'o'],
      [31, 12, 'x'], [36, 19, 'X'], [33, 20, 'x'], [30, 21, 'o'], [37, 16, 'x'],
      [11, 32, 'x'], [29, 32, 'x'], [17, 3, 'x'],
    ])
      s(x, y, ch);
  },
  roofs: __FD_ROOFS,
  areas: [
    { name: 'CT Spawn', r: [16, 2, 27, 7] }, { name: 'CT to A', r: [8, 4, 15, 6] }, { name: 'A Heaven', r: [2, 3, 13, 9] },
    { name: 'Behind Train', r: [2, 10, 4, 21] }, { name: 'A Site', r: [5, 7, 15, 21] }, { name: 'Long Doors', r: [2, 23, 6, 25] },
    { name: 'A Long', r: [2, 26, 6, 36] }, { name: 'Scrap Yard', r: [2, 37, 11, 45] }, { name: 'Garage', r: [7, 31, 16, 33] },
    { name: 'A Short', r: [13, 14, 20, 21] }, { name: 'Top Mid', r: [19, 8, 24, 25] }, { name: 'Mid Doors', r: [19, 26, 24, 26] },
    { name: 'Mid', r: [19, 27, 24, 29] }, { name: 'Lower Mid', r: [17, 30, 26, 39] }, { name: 'T Spawn', r: [12, 40, 31, 45] },
    { name: 'Coal Yard', r: [32, 37, 41, 45] }, { name: 'Loading Bay', r: [34, 30, 41, 36] }, { name: 'Bay Doors', r: [37, 23, 39, 29] },
    { name: 'Underpass', r: [25, 31, 33, 33] }, { name: 'Pipes', r: [25, 18, 28, 20] }, { name: 'B Heaven', r: [29, 9, 39, 10] },
    { name: 'CT to B', r: [28, 3, 33, 8] }, { name: 'B Site', r: [29, 11, 39, 22] },
  ],
  sites: [
    { name: 'A', r: [7, 10, 15, 20] },
    { name: 'B', r: [30, 11, 37, 20] },
  ],
};

// ---------------------------------------------------------------- materials (the owner's packs; each at its real size)
Object.assign(__PR_SURF, {
  fyard: { side: 'concrete_wall_cast', top: 'asphalt_worn', tile: 2.4, ttile: 3, tint: 0, rough: 1, nrm: 0.65 },
  fgravel: { side: 'concrete_wall_cast', top: 'gravel_dirt_ground', tile: 2.4, ttile: 2, tint: 0, rough: 1, nrm: 1.3 },
  fslab: { side: 'concrete_wall_cast', top: 'concrete_floor_warehouse', tile: 2.4, ttile: 4, tint: 0, rough: 0.95, rmin: 0.3, nrm: 1 },
  fepoxy: { side: 'concrete_wall_cast', top: 'concrete_epoxy_floor', tile: 2.4, ttile: 4, tint: 0, rough: 0.85, rmin: 0.18, nrm: 0.8 },
  fcast: { side: 'concrete_wall_cast', top: 'concrete_floor_warehouse', tile: 2.4, ttile: 4, tint: 0, rough: 1, nrm: 1.1 },
  fbrick: { side: 'brick_industrial', top: 'concrete_floor_warehouse', tile: 1.0, ttile: 4, tint: 0, rough: 1, nrm: 1.3 },
  fblock: { side: 'cinderblock_painted', top: 'concrete_floor_warehouse', tile: 0.8, ttile: 4, tint: 0, rough: 1, nrm: 1.2 },
  fcorr: { side: 'corrugated_metal_galvanized', top: 'corrugated_metal_galvanized', tile: 2.0, tint: 0, rough: 0.8, rmin: 0.3, metal: 0.55, nrm: 1.4 },
  fpanel: { side: 'steel_panel_riveted', top: 'steel_panel_riveted', tile: 2.0, tint: 0, rough: 0.85, rmin: 0.3, metal: 0.6, nrm: 1.2 },
  froof: { side: 'steel_panel_riveted', top: 'corrugated_metal_galvanized', tile: 2.0, ttile: 2.0, tint: 0, rough: 0.85, rmin: 0.3, metal: 0.55, nrm: 1.3 },
  fhaz: { side: 'hazard_stripes_steel', top: 'diamond_plate_steel', tile: 1.0, ttile: 1.0, tint: 0, rough: 0.8, rmin: 0.25, metal: 0.55, nrm: 1.2 },
  fplate: { side: 'painted_metal_chipped', top: 'diamond_plate_steel', tile: 1.5, ttile: 1.0, tint: 0, rough: 0.8, rmin: 0.25, metal: 0.55, nrm: 1.3 },
  frust: { side: 'rusted_steel_plate', top: 'rusted_steel_plate', tile: 2.0, tint: 0, rough: 0.95, metal: 0.45, nrm: 1.3 },
  fpallet: { side: 'wood_pallet_planks', top: 'wood_pallet_planks', tile: 1.2, tint: 0, rough: 0.9, nrm: 1.2 },
  ftile: { side: 'ceramic_tiles_dirty', top: 'concrete_floor_warehouse', tile: 1.2, ttile: 4, tint: 0, rough: 0.6, rmin: 0.15, nrm: 1 },
  // painted steel that takes its colour (the boxcar, the cranes, columns, railings); rolled steel coils
  fpaint: { side: 'painted_metal_chipped', top: 'painted_metal_chipped', tile: 1.5, tint: 0.8, rough: 0.75, rmin: 0.3, metal: 0.45, nrm: 1.1 },
  fcoil: { side: 'rusted_steel_plate', top: 'rusted_steel_plate', tile: 1.2, tint: 0.7, rough: 0.6, rmin: 0.18, metal: 0.85, nrm: 0.7 },
  // shipping containers: corrugated steel, painted (the container's colour) or bare and rusted
  fbox: { side: 'corrugated_metal_galvanized', top: 'rusted_steel_plate', tile: 2.0, ttile: 2, tint: 0.85, rough: 0.75, rmin: 0.3, metal: 0.5, nrm: 1.5 },
});
for (const k of ['puddle', 'lava']) __PR_NOCAST.add(k);
__PR_KITS.foundry = {
  id: 'foundry',
  base: __FD.base,
  tex: [
    'asphalt_worn', 'brick_industrial', 'ceramic_tiles_dirty', 'cinderblock_painted', 'concrete_epoxy_floor', 'concrete_floor_warehouse', 'concrete_wall_cast', 'gravel_dirt_ground',
    'corrugated_metal_galvanized', 'diamond_plate_steel', 'hazard_stripes_steel', 'metal_bar_grating', 'painted_metal_chipped', 'rusted_steel_plate', 'steel_panel_riveted', 'wood_pallet_planks',
  ],
  shared: [],
  models: ['hanging_industrial_lamp', 'security_light', 'barrel_03', 'concrete_road_barrier', 'utility_box_02', 'korean_fire_extinguisher_01'].map((n) => [n, __FD.prison]),
  sky: [__FD.prison + 'sky.webp', __FD.prison + 'sky_dusk.webp'],
  lvNy: 26,
  detail: (root, m, models, ticks) => __fdDetail(root, m, models, ticks),
};
// ---------------------------------------------------------------- the map
const __fdIn = (x, z, r) => x >= r[0] * 2 && x <= (r[2] + 1) * 2 && z >= r[1] * 2 && z <= (r[3] + 1) * 2;
const __fdInProp = (p, m = 0.45) => __FD_PROPS.some((b) => p.x > b[0] - m && p.x < b[2] + m && p.z > b[1] - m && p.z < b[3] + m && p.y < b[5] - 0.2);
// the textures carry their own colour (tint 0): the boxes are drawn near white, a little varied block to block
const __FD_TONE = { fyard: 1, fgravel: 0.92, fslab: 0.97, fepoxy: 1, fcast: 0.95, fbrick: 0.98, fblock: 1, fcorr: 0.96, fpanel: 0.95, froof: 0.9, fhaz: 1, fplate: 1, frust: 1, fpallet: 1, ftile: 1 };
function __foundryBuild() {
  const A = Ah(__FD_DEF),
    w = new Po();
  w.m = A;
  A.physProps = A.physProps || [];
  A.__view = __PR_KITS.foundry;
  A.__veg = [];
  const R = (A.__pr = { lamps: [], models: [], signs: [], decals: [], lines: [], rails: [], stairs: [], openings: [], cams: [], items: [], poles: [], pipes: [], planters: [], beacons: [], fires: [], bars: [], fences: [], wire: [], tables: [], cells: [], shu: [], towers: [], hoops: [], benches: [], bleachers: [], gallery: [], arches: [], rubble: [], pilasters: [], turrets: [], vault: null });
  const roofOf = (x, zz) => __FD_ROOFS.find((r) => __fdIn(x, zz, r.r)),
    hall = (x, zz) => __fdIn(x, zz, [29, 8, 39, 22]),
    WALLS = ['fbrick', 'fcast', 'fcorr', 'fpanel', 'fblock', 'fbrick', 'fcast'],
    wallOf = (cx, cz) => WALLS[Math.floor(ei(Math.floor(cx / 28), Math.floor(cz / 28), 7) * WALLS.length)];
  // ------------------------------------------------ every visual given its surface (the kit draws them all)
  for (const v of A.visuals) {
    v.__hidden = 1;
    if (v.s) continue;
    const sx = v.max.x - v.min.x,
      sy = v.max.y - v.min.y,
      cx = (v.min.x + v.max.x) / 2,
      cz = (v.min.z + v.max.z) / 2,
      rf = roofOf(cx, cz);
    if (sx > 300) v.s = 'fgravel';
    else if (v.mat === 'roof') v.s = 'froof';
    else if (v.mat === 'plaster') v.s = 'fpanel';
    else if (v.mat === 'stone') v.s = v.min.y > 3.5 || (v.min.y < 0.05 && sy > 0.25 && sy < 1.2) ? 'fcast' : 'fhaz';
    else if (v.mat === 'metal') v.s = 'fplate';
    else if (v.mat === 'wood') v.s = sy > 1.4 && Math.min(sx, v.max.z - v.min.z) < 0.35 ? 'fplate' : 'fpallet';
    else if (v.mat === 'panel') v.s = sy < 0.2 ? 'fslab' : 'fcast';
    else if (v.mat === 'asphalt') v.s = sy < 0.2 ? 'fyard' : 'fcast';
    else if (v.mat === 'concrete') {
      if (rf && v.min.y > rf.y - 0.1 && sy < 0.6) v.s = 'froof';
      else if (sy < 0.2) v.s = v.min.y > 0.3 ? 'fplate' : hall(cx, cz) ? 'fepoxy' : 'fslab';
      else if (sy > 3) v.s = hall(cx, cz) ? 'frust' : wallOf(cx, cz);
      else v.s = 'fcast';
    }
    const k = __FD_TONE[v.s];
    if (k) v.color = hi('#ffffff', k * (sy > 3 ? 0.94 + 0.06 * ei(Math.floor(cx / 6), Math.floor(cz / 6), 5) : 1));
  }
  // ------------------------------------------------ the solid props (drawn in the detail)
  for (const [x0, z0, x1, z1, y0, y1, kind] of __FD_PROPS) w.box(x0, y0, z0, x1, y1, z1, 'prop', { mat: kind === 'crucible' || kind === 'cabin' ? 'concrete' : 'metal', pen: kind === 'col' ? 6 : 3 });
  // nothing the bots aim for (site holds, stage points, cover spots, spawns) inside a prop
  for (const s of A.sites) for (const k of ['hold', 'stage', 'watch']) s[k] && (s[k] = s[k].filter((p) => !__fdInProp(p)));
  A.poi = (A.poi || []).filter((p) => !__fdInProp(p));
  A.tdmSpawns = (A.tdmSpawns || []).filter((p) => !__fdInProp(p, 1));
  for (const t of ['CT', 'T']) A.spawns[t] = A.spawns[t].filter((p) => !__fdInProp(p, 1));
  // ------------------------------------------------ road barriers (cover at the chokes)
  for (const [x, zz, ry] of [[44.0, 57.6, 0.05], [46.4, 34.0, 0.25], [16.0, 80.0, Math.PI / 2], [70.0, 80.4, 0.1], [57.0, 63.6, Math.PI / 2]]) {
    const sw = Math.abs(Math.sin(ry)) > 0.5;
    w.box(x - (sw ? 0.3 : 0.75), 0, zz - (sw ? 0.75 : 0.3), x + (sw ? 0.3 : 0.75), 0.82, zz + (sw ? 0.75 : 0.3), 'prop', { mat: 'concrete', pen: 4 });
    R.models.push({ id: 'concrete_road_barrier', x, y: 0, z: zz, ry, s: 1 });
  }
  // drums by the furnace and in the yards (solid)
  R.__fdDrums = [[73.4, 41.2], [74.2, 42.0], [61.0, 24.6], [6.0, 60.0], [40.6, 86.6], [83.6, 80.0]];
  for (const [x, zz] of R.__fdDrums) w.box(x - 0.3, 0, zz - 0.3, x + 0.3, 0.9, zz + 0.3, 'prop', { mat: 'metal', pen: 2 });
  // ------------------------------------------------ lamps
  for (const l of A.lights) R.lamps.push({ x: l.pos.x, y: l.pos.y, z: l.pos.z, k: 'wall' });
  // under every roof: industrial pendants about one each 7 m
  for (const rf of __FD_ROOFS) {
    const [c0, r0, c1, r1] = rf.r,
      x0 = c0 * 2,
      x1 = (c1 + 1) * 2,
      z0 = r0 * 2,
      z1 = (r1 + 1) * 2,
      nx = Math.max(1, Math.round((x1 - x0) / 7)),
      nz = Math.max(1, Math.round((z1 - z0) / 7));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = x0 + ((i + 0.5) * (x1 - x0)) / nx,
          zz = z0 + ((j + 0.5) * (z1 - z0)) / nz,
          y = rf.y - 0.05;
        // in the hall, none in the crane's path over the crucible
        if (rf.y > 8 && Math.abs(zz - 31) < 3) continue;
        A.lights.push({ pos: z(x, y - 1.3, zz), interior: !0 });
        R.lamps.push({ x, y, z: zz, k: 'pend' });
      }
  }
  // the hall: fill light through it (its light volume)
  for (let x = 59; x < 80; x += 5) for (let zz = 23; zz < 46; zz += 5) R.lamps.push({ x, y: 4.4, z: zz, k: 'chand' });
  // floodlight poles over the open yards
  R.__fdPoles = [];
  for (const [x, zz] of [[54.5, 5.5], [5.0, 88.5], [82.5, 74.5], [62.5, 90.5], [30.6, 21.0], [47.4, 17.0], [34.6, 78.6], [5.0, 46.0]]) {
    A.lights.push({ pos: z(x, 7.6, zz), interior: !1 });
    R.lamps.push({ x, y: 7.8, z: zz, k: 'flood' });
    w.box(x - 0.14, 0, zz - 0.14, x + 0.14, 7.8, zz + 0.14, 'prop', { mat: 'metal', pen: 6 });
    R.__fdPoles.push([x, zz]);
  }
  return A;
}
XE.foundry = __foundryBuild;
BD.find((x) => x.id === 'foundry') ||
  BD.splice(Math.max(0, BD.findIndex((x) => x.id === 'fortress')), 0, {
    id: 'foundry',
    name: 'Foundry',
    blurb: 'A steel mill. A in the rail yard round a freight train, B in the crucible hall where the ladle pours every 45 seconds. Two heavens, a mid that pays, three ways into each site.',
    size: 'Medium',
    maxPlayers: 16,
  });
// the map's art, its loading screen, radar, sky and haze, the home reel
{
  typeof __LD_VIEW < 'u' && (__LD_VIEW.foundry = 'bp-foundry');
  typeof __LD_ART < 'u' && (__LD_ART.foundry = 'foundry');
  typeof __RAD_CUT < 'u' && (__RAD_CUT.foundry = 3.0);
  typeof __SKY_MAPS < 'u' && (__SKY_MAPS.foundry = { fog: { day: 0.0026, dusk: 0.003, night: 0.0032 } });
  typeof __SKY_PIX < 'u' && (__PR_KITS.foundry.sky = [__SKY_PIX, __SKY_PIX]);
  typeof __MX_MAPS < 'u' && __MX_MAPS.add('foundry');
  typeof __MENU_ART < 'u' && (__MENU_ART.foundry = 'map-foundry');
  typeof __HX_KEY < 'u' && (__HX_KEY.foundry = 'reel-foundry');
  typeof __mxArt < 'u' ? ll.set('foundry', __mxArt('foundry')) : ll.set('foundry', 'game/menu/map-foundry.webp');
  typeof __HX_REEL < 'u' &&
    __HX_REEL.splice(1, 0, { id: 'foundry', ch: 'Hand-built maps', map: 'foundry', title: 'Foundry', pitch: 'A steel mill: a freight train through A, a crucible that pours molten steel in the middle of B.', act: 'Play Foundry', go: () => __hxPlay({ map: 'foundry' }) });
}
// ---------------------------------------------------------------- the detail
// molten steel: a crust of dark slag over glowing metal, cracked, slowly flowing (its brightness rises in a pour)
function __fdLavaTex() {
  return __prCanvas(256, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.45, '#ffa632');
    g.addColorStop(1, '#ff6a12');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    let s = 91;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 190; i++) {
      const x = r() * w,
        y = r() * h,
        rr = 2.5 + r() * 9;
      c.fillStyle = `rgba(${70 + r() * 50},${22 + r() * 18},8,${0.35 + r() * 0.35})`;
      c.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2,
          q = rr * (0.6 + r() * 0.5);
        k ? c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : c.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
      }
      c.fill();
    }
  });
}
// a pour's sound: a deep roar of falling metal, hiss and spitting crackle (made once, in the browser)
function __fdPourBuffer(ctx) {
  const sr = ctx.sampleRate,
    L = 7,
    n = Math.floor(sr * L),
    b = ctx.createBuffer(1, n, sr),
    d = b.getChannelData(0);
  let br = 0,
    lp = 0,
    hp = 0,
    prev = 0,
    cr = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr,
      env = Math.min(1, t / 0.5) * Math.min(1, (L - t) / 1.8),
      wn = Math.random() * 2 - 1;
    br = (br + 0.02 * wn) / 1.02;
    lp += (wn - lp) * 0.06;
    hp = 0.97 * (hp + wn - prev);
    prev = wn;
    Math.random() < 0.0012 * env && (cr = 0.6 + Math.random() * 0.6);
    cr *= 0.993;
    d[i] = (br * 4.2 * (0.8 + 0.2 * Math.sin(t * 5.3)) + lp * 0.5 + hp * 0.05 + cr * wn) * env * 0.5;
  }
  return b;
}
function __fdPourSound(pos) {
  try {
    if (typeof $i > 'u' || !$i || typeof xw > 'u') return;
    const B = __FD.pourBuf || (__FD.pourBuf = __fdPourBuffer($i)),
      v = xw(pos, 1.6, { reverb: 0.5, maxDist: 95 });
    if (!v) return;
    const s = $i.createBufferSource();
    s.buffer = B;
    s.connect(v.in);
    s.start(v.t);
  } catch (e) {}
}
function __fdDetail(root, m, models, ticks) {
  const R = m.__pr;
  if (!R) return null;
  const S = __prSet(),
    K = __prK,
    t0 = performance.now(),
    dark = K('#24272a'),
    white = K('#ffffff'),
    steel = K('#5b6066'),
    yellow = K('#d6a92a'),
    lavaMat = __flOwn(new Ni({ color: '#ffffff', map: __fdLavaTex(), vertexColors: !0, toneMapped: !1 })),
    puddleMat = __prLit(__flOwn(new Gw({ color: '#15181b', roughness: 0.04, metalness: 0.1, transparent: !0, opacity: 0.72, depthWrite: !1 }))),
    mats = (k) => (k === 'lava' ? lavaMat : k === 'puddle' ? puddleMat : __prMats(k));
  let seed = 7319;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rail = (a, b, col = yellow, posts = 1.5) => {
    S.cyl('paint', [a[0], a[1] + 1.0, a[2]], [b[0], b[1] + 1.0, b[2]], 0.03, col);
    S.cyl('paint', [a[0], a[1] + 0.5, a[2]], [b[0], b[1] + 0.5, b[2]], 0.022, col);
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
    for (let t = 0; t <= L + 0.01; t += posts) {
      const q = [a[0] + ((b[0] - a[0]) * t) / L, a[1], a[2] + ((b[2] - a[2]) * t) / L];
      S.cyl('paint', q, [q[0], q[1] + 1.02, q[2]], 0.028, col);
    }
  };
  const wheels = (x0, x1, zc) => {
    S.box('dark', x0 + 0.3, 0.3, zc - 1.25, x1 - 0.3, 0.78, zc + 1.25, dark);
    for (const dz of [-0.85, 0.85])
      for (const x of [x0 + 0.35, x1 - 0.65]) S.cyl('dark', [x, 0.43, zc + dz], [x + 0.3, 0.43, zc + dz], 0.43, steel, 'cyl16');
  };
  const coil = (a, b, r, col) => {
    S.cyl('fcoil', a, b, r, col, 'cyl16');
    S.cyl('dark', [a[0] - (b[0] - a[0]) * 0.004, a[1], a[2] - (b[2] - a[2]) * 0.004], [b[0] + (b[0] - a[0]) * 0.004, b[1], b[2] + (b[2] - a[2]) * 0.004], r * 0.34, dark, 'cyl16');
  };
  // ================================================= A: the Rail Yard
  // the track: ballast, sleepers, two rails, from A Heaven's foot to the Long Doors
  S.box('fgravel', 10.0, 0.005, 20.1, 13.4, 0.02, 47.9, white);
  for (let zz = 20.3; zz < 47.7; zz += 0.62) S.box('fpallet', 10.2, 0.012, zz, 13.2, 0.06, zz + 0.24, K('#7a6a58'));
  for (const x of [11.0, 12.4]) {
    S.box('fplate', x - 0.035, 0.05, 20.1, x + 0.035, 0.13, 47.9, steel);
    S.box('dark', x - 0.07, 0.05, 20.1, x + 0.07, 0.07, 47.9, dark);
  }
  // the boxcar (rust red): corrugated sides, its roof, the underframe and two bogies, sliding doors, ladders, couplers
  {
    const [x0, z0, x1, z1] = [10.2, 21.5, 13.2, 32.5],
      red = K('#8f3b27');
    S.box('fbox', x0 + 0.05, 1.12, z0 + 0.1, x1 - 0.05, 3.3, z1 - 0.1, red);
    S.box('frust', x0 - 0.04, 3.3, z0, x1 + 0.04, 3.4, z1, white);
    S.box('dark', x0 + 0.25, 0.78, z0 + 0.25, x1 - 0.25, 1.12, z1 - 0.25, dark);
    wheels(x0, x1, z0 + 2.0);
    wheels(x0, x1, z1 - 2.0);
    for (const x of [x0 - 0.02, x1 - 0.06]) {
      S.box('fpaint', x, 1.3, 25.2, x + 0.08, 3.15, 28.8, K('#7d3220'));
      S.box('dark', x - 0.02, 3.15, 23.0, x + 0.1, 3.22, 31.0, dark);
      S.box('dark', x + 0.02, 2.1, 27.9, x + 0.06, 2.3, 28.2, dark);
    }
    for (const zz of [z0 + 0.02, z1 - 0.1]) S.box('dark', x0 + 1.2, 0.85, zz - 0.35, x1 - 1.2, 1.1, zz + 0.43, dark);
    for (const [x, zz] of [[x0 - 0.05, z0 + 0.4], [x1 + 0.05, z1 - 0.4]]) for (let y = 1.3; y < 3.3; y += 0.38) S.cyl('dark', [x, y, zz - 0.25], [x, y, zz + 0.25], 0.018, dark, 'cyl6');
    for (let zz = z0 + 0.8; zz < z1 - 0.5; zz += 1.4) for (const x of [x0 + 0.02, x1 - 0.06]) S.box('fpaint', x, 1.12, zz, x + 0.04, 3.3, zz + 0.1, K('#7a301f'));
  }
  // the flatcar: a plank deck on its frame, two bogies, coils chained down on cradles
  {
    const [x0, z0, x1, z1] = [10.2, 35, 13.2, 41];
    S.box('fpallet', x0, 1.05, z0, x1, 1.3, z1, K('#a08a70'));
    S.box('dark', x0 - 0.04, 0.85, z0, x1 + 0.04, 1.08, z1, dark);
    wheels(x0, x1, z0 + 1.3);
    wheels(x0, x1, z1 - 1.3);
    for (const zz of [36.5, 39.5]) {
      coil([10.45, 2.2, zz], [12.95, 2.2, zz], 0.88, K('#a7adb3'));
      for (const dz of [-0.75, 0.75]) S.box('fpallet', 10.5, 1.3, zz + dz - 0.18, 12.9, 1.55, zz + dz + 0.18, K('#8a7458'));
      S.cyl('dark', [11.7, 3.1, zz], [11.7, 1.3, zz - 0.95], 0.012, dark, 'cyl6');
    }
  }
  // A Heaven: the crane's control cabin, railings (open toward the boxcar: the jump)
  {
    const [x0, z0, x1, z1, y0, y1] = [4.4, 6.4, 9.0, 11.4, 3.08, 5.9];
    S.box('fpanel', x0, y0, z0, x1, y1, z1, K('#e6e1d6'));
    S.box('frust', x0 - 0.2, y1, z0 - 0.2, x1 + 0.2, y1 + 0.14, z1 + 0.2, white);
    S.box('glassL', x1 - 0.02, y0 + 1.1, z0 + 0.5, x1 + 0.02, y1 - 0.4, z1 - 0.5, white);
    S.box('glassL', x0 + 0.5, y0 + 1.1, z1 - 0.02, x1 - 0.5, y1 - 0.4, z1 + 0.02, white);
    S.box('fpaint', x1 + 0.01, y0, z0 + 0.6, x1 + 0.06, y0 + 2.1, z0 + 1.5, K('#3e5b6e'));
    R.lamps.push({ x: (x0 + x1) / 2, y: y1 - 0.2, z: (z0 + z1) / 2, k: 'tube' });
  }
  rail([15.9, 3.08, 8.2], [15.9, 3.08, 19.9]);
  rail([4.1, 3.08, 19.9], [9.6, 3.08, 19.9]);
  rail([13.8, 3.08, 19.9], [15.9, 3.08, 19.9]);
  S.box('fhaz', 9.6, 3.0, 19.85, 13.8, 3.1, 20.05, white);
  // A Short's landing: a railing over Top Mid
  rail([41.9, 2.64, 28.2], [41.9, 2.64, 31.8]);
  // coils, I-beams
  for (const x of [28.2, 29.8]) coil([x, 0.8, 36.45], [x, 0.8, 38.15], 0.8, K(x < 29 ? '#a7adb3' : '#8d949b'));
  for (const x of [77.0, 78.6]) coil([x, 0.8, 85.05], [x, 0.8, 86.75], 0.8, K('#9aa1a8'));
  for (const [yy, n] of [[0, 3], [0.36, 3], [0.72, 2]])
    for (let k = 0; k < n; k++) {
      const z0 = 26.65 + k * 0.38 + (n === 2 ? 0.19 : 0);
      S.box('frust', 15.6, yy, z0, 21.6, yy + 0.04, z0 + 0.34, white);
      S.box('frust', 15.6, yy + 0.04, z0 + 0.15, 21.6, yy + 0.32, z0 + 0.19, white);
      S.box('frust', 15.6, yy + 0.32, z0, 21.6, yy + 0.36, z0 + 0.34, white);
    }
  // ================================================= B: the Crucible Hall
  // the crucible: a riveted steel shell, banded, trunnions, a heavy rim, molten steel inside
  const CX = 68,
    CZ = 31;
  S.cyl('frust', [CX, 0, CZ], [CX, 2.34, CZ], 2.5, white, 'cyl16');
  for (const y of [0.35, 1.25, 2.05]) S.cyl('dark', [CX, y, CZ], [CX, y + 0.16, CZ], 2.56, dark, 'cyl16');
  S.add('dark', __prUnit('tor'), __cnM(CX, 2.4, CZ, 2.42, 2.42, 1.6, 0, Math.PI / 2), dark);
  S.add('lava', __prUnit('cyl16'), __cnM(CX, 2.355, CZ, 2.34, 0.03, 2.34), white);
  for (const s of [-1, 1]) {
    S.cyl('dark', [CX + s * 2.5, 1.7, CZ], [CX + s * 2.95, 1.7, CZ], 0.3, steel, 'cyl16');
    S.box('dark', CX + s * 2.62 - 0.15, 0, CZ - 0.35, CX + s * 2.62 + 0.15, 1.45, CZ + 0.35, dark);
  }
  // its keep-out line painted round it, the hall's walkway lines
  for (const [x0, z0, x1, z1] of [[CX - 3.6, CZ - 3.6, CX + 3.6, CZ - 3.45], [CX - 3.6, CZ + 3.45, CX + 3.6, CZ + 3.6], [CX - 3.6, CZ - 3.6, CX - 3.45, CZ + 3.6], [CX + 3.45, CZ - 3.6, CX + 3.6, CZ + 3.6], [58.4, 44.6, 73.6, 44.75]])
    S.box('paint', x0, 0.006, z0, x1, 0.014, z1, yellow);
  // the furnace (on the east wall): a refractory brick face, its glowing mouth under a hood, a tapping channel
  // under grating to the crucible
  S.box('fbrick', 75.7, 0, 24.2, 76.02, 6.4, 31.8, white);
  S.box('dark', 75.55, 0.35, 26.4, 75.72, 2.75, 29.6, dark);
  S.box('lava', 75.5, 0.5, 26.6, 75.56, 2.55, 29.4, white);
  S.box('frust', 74.4, 2.9, 25.8, 75.7, 3.35, 30.2, white);
  S.box('frust', 74.4, 3.35, 26.4, 75.7, 6.2, 29.6, white);
  S.box('dark', 70.3, 0, 27.3, 75.7, 0.1, 28.7, dark);
  S.box('lava', 70.5, 0.02, 27.55, 75.6, 0.07, 28.45, white);
  for (let x = 70.6; x < 75.6; x += 0.32) S.box('dark', x, 0.07, 27.45, x + 0.06, 0.11, 28.55, dark);
  for (const [y, c] of [[1.6, '#59ff8a'], [1.9, '#ffcf4a']]) S.add('glow', __prUnit('cyl16'), __cnM(75.68, y, 25.0, 0.09, 0.02, 0.09, 0, 0, Math.PI / 2), K(c));
  // B Heaven: the catwalk's railing, its yellow columns; the stair's handrail
  rail([58.2, 3.08, 21.95], [79.8, 3.08, 21.95]);
  for (const b of __FD_PROPS) b[6] === 'col' && S.box('fpaint', b[0], 0, b[1], b[2], b[5], b[3], yellow);
  // the hall's crane: rails along both walls, the yellow bridge across the hall over the crucible
  for (const x of [58.3, 79.7]) S.box('dark', x - 0.15, 7.35, 16.2, x + 0.15, 7.6, 45.8, dark);
  S.box('fpaint', 58.0, 7.6, 30.4, 80.0, 8.25, 31.6, yellow);
  S.box('fhaz', 58.0, 7.6, 30.36, 80.0, 7.9, 30.4, white);
  S.box('fhaz', 58.0, 7.6, 31.6, 80.0, 7.9, 31.64, white);
  S.box('fpaint', CX - 1.3, 7.05, CZ - 0.9, CX + 1.3, 7.6, CZ + 0.9, K('#c99a26'));
  // skylights: steel slats across the two open strips (the sun comes through in stripes)
  for (const z0 of [24, 34]) {
    for (let x = 58.3; x < 80; x += 0.75) S.box('dark', x, 9.05, z0, x + 0.12, 9.35, z0 + 2, dark);
    for (const zz of [z0, z0 + 1.94]) S.box('fpaint', 58, 9.0, zz, 80, 9.4, zz + 0.06, yellow);
  }
  // pipe runs on brackets: the hall's south and east walls, Mid's walls
  const pipe = (a, b, r, col) => {
    S.cyl('fplate', a, b, r, col);
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
    for (let t = 1.5; t < L; t += 3) {
      const q = [a[0] + ((b[0] - a[0]) * t) / L, a[1], a[2] + ((b[2] - a[2]) * t) / L];
      S.box('dark', q[0] - 0.05, q[1] - 0.32, q[2] - 0.05, q[0] + 0.05, q[1] + 0.05, q[2] + 0.05, dark);
    }
  };
  pipe([58.6, 5.4, 45.6], [73.6, 5.4, 45.6], 0.18, K('#4f6a5a'));
  pipe([58.6, 5.95, 45.6], [73.6, 5.95, 45.6], 0.1, K('#8a3a2a'));
  pipe([79.6, 5.4, 32.6], [79.6, 5.4, 45.6], 0.18, K('#4f6a5a'));
  pipe([38.35, 5.3, 16.2], [38.35, 5.3, 27.6], 0.16, K('#4f6a5a'));
  pipe([49.65, 5.3, 16.2], [49.65, 5.3, 51.6], 0.2, K('#3d5a78'));
  pipe([49.65, 5.9, 16.2], [49.65, 5.9, 51.6], 0.1, K('#a8862e'));
  // Pipes (the corridor): its namesake overhead, both sides
  for (const zz of [36.35, 41.65]) pipe([50.2, 2.9, zz], [57.8, 2.9, zz], 0.14, K(zz < 40 ? '#4f6a5a' : '#8a3a2a'));
  // ================================================= the yards
  // semi-trailers (T spawn and the Coal Yard): box bodies, landing legs, rear wheels
  for (const b of __FD_PROPS) {
    if (b[6] !== 'trailer') continue;
    const [x0, z0, x1, z1] = b,
      col = K(x0 < 40 ? '#d8d4ca' : '#3d6f96');
    S.box('fbox', x0, 1.25, z0 + 0.03, x1, 3.8, z1 - 0.03, col);
    S.box('dark', x0 + 0.3, 0.95, z0 + 0.2, x1 - 0.3, 1.25, z1 - 0.2, dark);
    for (const x of [x0 + 0.9, x0 + 2.2]) for (const zz of [z0 + 0.15, z1 - 0.45]) S.cyl('dark', [x, 0.5, zz], [x, 0.5, zz + 0.3], 0.5, steel, 'cyl16');
    for (const zz of [z0 + 0.3, z1 - 0.3]) S.box('dark', x1 - 2.6, 0, zz - 0.08, x1 - 2.45, 0.95, zz + 0.08, dark);
  }
  // the scrap heap: crushed sheet, beams and drums piled on each other
  for (let i = 0; i < 26; i++) {
    const x = 9.3 + rnd() * 3.2,
      zz = 82.3 + rnd() * 3.8,
      y = rnd() * 1.6,
      s = 0.4 + rnd() * 0.9;
    S.add(rnd() < 0.5 ? 'frust' : 'fpaint', __prUnit('box'), __cnM(x, y + s * 0.3, zz, s * 1.4, s * 0.5, s, rnd() * 3, rnd() * 0.8 - 0.4, rnd() * 0.8 - 0.4), K(['#8f3b27', '#3d6f96', '#a7adb3', '#c49a2a'][i % 4]));
  }
  // painted hazard stripes across the thresholds
  for (const [x0, z0, x1, z1] of [[6, 47.7, 10, 48.05], [6, 49.95, 10, 50.3], [42, 51.7, 46, 52.05], [42, 53.95, 46, 54.3], [74, 46.05, 80, 46.4], [57.6, 36, 57.95, 42], [58, 15.6, 64, 15.95]]) S.box('fhaz', x0, 0.006, z0, x1, 0.016, z1, white);
  // puddles on the asphalt (they mirror the sky and the lamps)
  for (const [x, zz, sx, sz] of [[44, 70, 3.2, 1.6], [24, 86, 2.4, 1.4], [8, 72, 1.6, 2.6], [74, 78, 2.8, 1.6], [46, 24, 1.8, 1.2], [26, 42, 2.2, 1.3]]) S.add('puddle', __prUnit('cyl16'), __cnM(x, 0.012, zz, sx, 0.004, sz), white);
  // ================================================= lamps
  const warm = K('#fff1cf');
  for (const l of R.lamps) {
    if (l.k === 'pend') {
      const y0 = l.y - 1.5;
      S.cyl('dark', [l.x, y0 + 1.1, l.z], [l.x, l.y, l.z], 0.008, dark, 'cyl6');
      R.models.push({ id: 'hanging_industrial_lamp', x: l.x, y: y0, z: l.z, ry: rnd() * 6.28, s: 0.86 });
      S.add('glow', __prUnit('hemi'), new _A().compose(new U(l.x, y0 + 0.02, l.z), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI), new U(0.12, 0.07, 0.12)), warm);
    } else if (l.k === 'flood') {
      S.cyl('dark', [l.x, 0, l.z], [l.x, l.y, l.z], 0.11, dark, 'cyl6');
      S.box('dark', l.x - 0.7, l.y, l.z - 0.06, l.x + 0.7, l.y + 0.08, l.z + 0.06, dark);
      for (const dx of [-0.55, 0.55]) {
        const q = new Kw().setFromEuler(new TB(0.55, rnd() * 6.28, 0, 'YXZ'));
        S.add('dark', __prUnit('box'), new _A().compose(new U(l.x + dx, l.y + 0.2, l.z), q, new U(0.45, 0.3, 0.14)), K('#40474b'));
        const f = new U(0, 0, 0.072).applyQuaternion(q);
        S.add('glow', __prUnit('box'), new _A().compose(new U(l.x + dx + f.x, l.y + 0.2 + f.y, l.z + f.z), q, new U(0.4, 0.25, 0.01)), K('#fff7e4'));
      }
    } else if (l.k === 'tube') S.box('glow', l.x - 0.6, l.y, l.z - 0.05, l.x + 0.6, l.y + 0.04, l.z + 0.05, K('#eef4ff'));
  }
  // props on walls, drums
  for (const [x, y, zz, ry] of [[58.1, 1.3, 30.0, Math.PI / 2], [37.9, 1.3, 46.0, -Math.PI / 2], [64.1, 1.3, 9.0, Math.PI / 2], [32.1, 1.3, 64.0, Math.PI / 2]]) R.models.push({ id: 'utility_box_02', x, y, z: zz, ry, s: 1 });
  for (const [x, zz, ry] of [[58.15, 26.0, Math.PI / 2], [79.7, 40.5, -Math.PI / 2], [14.1, 64.0, Math.PI / 2], [50.2, 20.0, -Math.PI / 2]]) R.models.push({ id: 'korean_fire_extinguisher_01', x, y: 1.0, z: zz, ry, s: 1 });
  for (const [x, zz] of R.__fdDrums || []) R.models.push({ id: 'barrel_03', x, y: 0, z: zz, ry: rnd() * 6.28, s: 1 });
  // ================================================= round the mill: stacks, cooling towers, the blast furnace
  const far = __prSet();
  for (const [x, zz, h, r] of [[104, 12, 52, 2.6], [110, 24, 46, 2.3], [104, 36, 52, 2.6]]) {
    far.cyl('fbrick', [x, 0, zz], [x, h, zz], r, K('#d8cfc4'), 'cyl16');
    for (let y = h - 9; y < h; y += 4.5) far.cyl('paint', [x, y, zz], [x, y + 2.25, zz], r + 0.03, K('#c8352a'), 'cyl16');
    far.cyl('dark', [x, h, zz], [x, h + 0.6, zz], r + 0.25, dark, 'cyl16');
  }
  // cooling towers: hyperboloid shells (lathed), west of the mill
  const towerGeo = new mc([0, 6, 14, 24, 34, 44, 52, 58].map((y, i) => new aA([20, 18.2, 16.4, 15.0, 14.3, 14.6, 15.4, 16.2][i], y)), 40);
  {
    const n = towerGeo.attributes.position.count;
    towerGeo.setAttribute('color', new gi(new Float32Array(n * 3).fill(1), 3));
  }
  for (const [x, zz, s] of [[-52, 26, 1], [-58, 74, 1.12]]) far.add('fcast', towerGeo, __cnM(x, 0, zz, s, s, s), K('#c9c4ba'));
  // the blast furnace north-east of the hall: its shell, a rusted frame round it, downcomer pipes, a glow
  far.cyl('frust', [112, 0, -14], [112, 34, -14], 5.5, white, 'cyl16');
  far.cyl('dark', [112, 34, -14], [112, 40, -14], 3.0, dark, 'cyl16');
  for (const [dx, dz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) far.box('frust', 112 + dx - 0.4, 0, -14 + dz - 0.4, 112 + dx + 0.4, 38, -14 + dz + 0.4, white);
  for (const y of [10, 20, 30]) far.box('dark', 104.6, y, -21.4, 119.4, y + 0.5, -6.6, dark);
  far.cyl('fplate', [112, 38, -14], [96, 30, -2], 1.1, K('#6b6f73'));
  far.cyl('fplate', [96, 30, -2], [96, 0, -2], 1.1, K('#6b6f73'));
  far.add('glow', __prUnit('cyl16'), __cnM(112, 2.2, -8.4, 1.4, 1.8, 0.2, 0, Math.PI / 2), K('#ff8a2a'));
  const farTris = far.build(root, mats, 'foundry_far_', !1);
  // aviation lights on the stacks (blinking)
  const avMat = __flOwn(new Ni({ color: '#ff2a1a', toneMapped: !1 })),
    av = new ji();
  for (const [x, zz, h] of [[104, 12, 52.8], [110, 24, 46.8], [104, 36, 52.8]]) {
    const o = new Ow(__prUnit('sph'), avMat);
    o.scale.setScalar(0.45);
    o.position.set(x, h, zz);
    av.add(o);
  }
  root.add(av);
  const tris = S.build(root, mats, 'foundry_det_');
  __prModels2(root, R, models);
  // ================================================= moving: A's gantry crane and its container
  const plain = {},
    pm = (k) => (k === 'glow' ? __prMats('glow') : k === 'lava' ? lavaMat : plain[k] || (plain[k] = __prLit(__flOwn(new Gw({ vertexColors: !0, roughness: k === 'steel' ? 0.4 : 0.62, metalness: k === 'steel' ? 0.75 : 0.35 }))))),
    gant = new ji(),
    trol = new ji(),
    hook = new ji();
  {
    // fixed: the runway beams on their columns either side of the yard
    const F = __prSet();
    for (const x of [2.6, 33.4]) {
      F.box('fpaint', x - 0.3, 10.0, 21.0, x + 0.3, 10.6, 45.0, yellow);
      for (const zz of [22, 35, 44.4]) F.box('fpaint', x - 0.25, 0, zz - 0.25, x + 0.25, 10.0, zz + 0.25, yellow);
    }
    F.build(root, mats, 'foundry_runway_');
    // the bridge (moves along z), the trolley (along x), the hook block and a container on four cables (swings)
    const G = __prSet();
    G.box('paint', 2.4, 10.6, -0.8, 33.6, 11.6, -0.3, yellow);
    G.box('paint', 2.4, 10.6, 0.3, 33.6, 11.6, 0.8, yellow);
    for (const x of [2.6, 33.4]) G.box('paint', x - 0.5, 10.6, -1.6, x + 0.5, 11.3, 1.6, yellow);
    G.box('steel', 2.4, 11.6, -0.06, 33.6, 11.66, 0.06, dark);
    G.build(gant, pm, 'foundry_gantry_');
    const Tr = __prSet();
    Tr.box('paint', -1.3, 11.0, -1.1, 1.3, 12.0, 1.1, K('#c99a26'));
    Tr.box('steel', -0.5, 10.5, -0.5, 0.5, 11.0, 0.5, dark);
    Tr.build(trol, pm, 'foundry_trolley_');
    const Hk = __prSet();
    for (const [dx, dz] of [[-2.6, -0.9], [2.6, -0.9], [-2.6, 0.9], [2.6, 0.9]]) Hk.cyl('steel', [0, 0, 0], [dx, -1.9, dz], 0.025, dark, 'cyl6');
    Hk.box('steel', -0.35, -0.45, -0.25, 0.35, 0.05, 0.25, dark);
    Hk.box('paint', -3.03, -4.49, -1.22, 3.03, -1.9, 1.22, K('#3d6f96'));
    Hk.box('steel', -3.05, -4.49, -1.24, -2.9, -1.9, 1.24, dark);
    Hk.box('steel', 2.9, -4.49, -1.24, 3.05, -1.9, 1.24, dark);
    Hk.build(hook, pm, 'foundry_hook_');
    hook.position.set(0, 10.5, 0);
    trol.add(hook);
    gant.add(trol);
    root.add(gant);
  }
  // ================================================= moving: B's ladle, the pour
  const lad = new ji(),
    stream = new Ow(__prUnit('cyl16'), lavaMat),
    pourLight = new PD('#ff7a2a', 0, 32, 2),
    heat = new PD('#ff7a2a', 0, 9, 2);
  {
    const Lg = __prSet();
    // pivot at the bail's pins; the ladle hangs 2.4 m under the crane
    Lg.cyl('paint', [0, -2.5, 0], [0, -0.9, 0], 1.25, K('#5d5248'), 'cyl16');
    Lg.cyl('steel', [0, -2.5, 0], [0, -2.35, 0], 1.28, dark, 'cyl16');
    Lg.add('steel', __prUnit('tor'), __cnM(0, -0.9, 0, 1.3, 1.3, 1.6, 0, Math.PI / 2), dark);
    Lg.add('lava', __prUnit('cyl16'), __cnM(0, -1.0, 0, 1.17, 0.03, 1.17), white);
    Lg.box('steel', -1.32, -0.95, -0.2, -1.62, -0.85, 0.2, dark);
    for (const s of [-1, 1]) {
      Lg.cyl('steel', [0, -1.3, s * 1.25], [0, -1.3, s * 1.5], 0.16, dark, 'cyl16');
      Lg.box('paint', -0.12, -1.4, s * 1.5 - 0.06, 0.12, 0.6, s * 1.5 + 0.06, yellow);
    }
    Lg.box('paint', -0.12, 0.45, -1.56, 0.12, 0.65, 1.56, yellow);
    Lg.build(lad, pm, 'foundry_ladle_');
    lad.position.set(CX + 0.2, 6.65, CZ);
    root.add(lad);
    stream.visible = !1;
    stream.name = 'foundry_pour';
    root.add(stream);
    pourLight.position.set(CX, 4.0, CZ);
    heat.position.set(75.0, 1.6, 28.0);
    root.add(pourLight, heat);
  }
  // cables from the hall crane's trolley to the ladle's bail
  const cab = __prSet();
  for (const dz of [-0.3, 0.3]) cab.cyl('dark', [CX, 7.05, CZ + dz], [CX + 0.2, 7.2, CZ + dz], 0.02, dark, 'cyl6');
  cab.build(root, mats, 'foundry_cable_');
  // embers rising from the furnace and the crucible; sparks in a pour
  const embers = typeof __fwSnow < 'u' ? __fwSnow(110, [64, 0.4, 24, 77, 8.5, 36], { color: '#ffb066', size: 0.07, speed: 0.55, rise: 1, sway: 0.5, add: 1 }) : null,
    sparks = typeof __fwSnow < 'u' ? __fwSnow(160, [CX - 2.6, 2.3, CZ - 2.6, CX + 2.6, 6.5, CZ + 2.6], { color: '#ffd27a', size: 0.06, speed: 2.4, rise: 1, sway: 1.2, add: 1 }) : null;
  embers && root.add(embers.pts);
  sparks && ((sparks.pts.visible = !1), root.add(sparks.pts));
  const lip = new U(),
    P = 45;
  let lastPour = -1,
    tPrev = performance.now();
  ticks.push(() => {
    const now = performance.now(),
      dt = Math.min(0.1, (now - tPrev) / 1000);
    tPrev = now;
    const T = Date.now() / 1000,
      tod = Zw.getState().timeOfDay;
    __PR.glowMat && __PR.glowMat.color.setScalar(tod === 'night' ? 2.2 : tod === 'dusk' ? 1.7 : 1.15);
    // A's crane: the bridge drifts along the yard, the trolley across it; the container sways
    const g = (T % 84) / 84,
      e = 0.5 - 0.5 * Math.cos(g * Math.PI * 2);
    gant.position.set(0, 0, 23.5 + e * 19);
    trol.position.x = 9 + (0.5 - 0.5 * Math.cos(((T % 52) / 52) * Math.PI * 2)) * 18;
    hook.rotation.z = Math.sin(T * 0.9) * 0.035;
    hook.rotation.x = Math.sin(T * 0.63 + 1) * 0.025;
    // the pour: tilt (2.5 s), pour (6 s), back (2.5 s), every 45 s, the same moment for every player
    const c = T % P,
      n = Math.floor(T / P),
      tilt = c < 2.5 ? c / 2.5 : c < 8.5 ? 1 : c < 11 ? 1 - (c - 8.5) / 2.5 : 0,
      ease = tilt * tilt * (3 - 2 * tilt),
      pouring = c > 2.2 && c < 8.8;
    lad.rotation.z = ease * 1.15;
    lad.updateMatrixWorld();
    lip.set(-1.5, -0.95, 0).applyMatrix4(lad.matrixWorld);
    if (pouring) {
      const h = Math.max(0.1, lip.y - 2.37);
      stream.visible = !0;
      stream.position.set(lip.x, 2.37 + h / 2, lip.z);
      stream.scale.set(0.16 + 0.03 * Math.sin(T * 30), h, 0.16 + 0.03 * Math.cos(T * 27));
    } else stream.visible = !1;
    const k = pouring ? Math.min(1, (c - 2.2) * 2) * Math.min(1, (8.8 - c) * 1.5) : 0,
      flick = 0.92 + 0.08 * Math.sin(T * 13) * Math.sin(T * 7.3);
    lavaMat.color.setScalar((1.25 + k * 1.6) * flick);
    lavaMat.map && (lavaMat.map.offset.x = (T * 0.012) % 1);
    pourLight.intensity = k * 55 * flick;
    heat.intensity = (14 + k * 10) * flick;
    if (sparks) (sparks.pts.visible = k > 0.05), (sparks.u.uT.value = T % 1000);
    embers && (embers.u.uT.value = T % 1000);
    // the roar: once a pour, for whoever is in the match
    if (pouring && n !== lastPour && c < 3.5) (lastPour = n), eA.state && !eA.attract && __fdPourSound(z(CX, 4, CZ));
    // aviation lights: a slow blink
    avMat.color.setScalar(Math.sin(T * 2.6) > 0.3 ? 1.6 : 0.08);
    void dt;
  });
  return { tris: Math.round(tris + farTris), ms: Math.round(performance.now() - t0), lamps: R.lamps.length };
}
typeof window < 'u' && (window.__bpFoundry = () => ({ stats: __PR.stats, map: aw().id }));
