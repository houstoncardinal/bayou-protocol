/* ===== Bayou Protocol mod: Fortress in 3D (the kit and its detail) ===== */
// Drawn by the prison's pipeline (65-prison-view.js) with this kit: Poly Haven cut stone, rough rampart stone,
// rendered plaster, square cobbles, sandstone flagstones, grassy cobbles and clay roof tiles (fetched for the
// map), with planks, rock, grass, corrugated iron and steel shared from Frostline and the prison. Modelled here,
// inside the layout's collision (77-fortress.js):
//   - round arches on every opening (stone architraves and keystones), blind arches on the Mid Gate
//   - the Gallery's arcade (columns, arches, its roof), crenellated ramparts with buttresses, battlements
//   - houses: windows with stone surrounds, shutters and sills (some lit), doors, pitched clay roofs
//   - stone balustrades, the fountain (an octagonal basin, water, a two-tier column), palms, crates
//   - the Market's and B's sheds (corrugated roofs on posts), the helicopter on the pad, the lighthouse lantern
//   - outside: the island's cliffs dropping to the sea, jungle palms on the ledges
const __FT_FROST = './game/maps/frostline/',
  __FT_PRISON = './game/maps/prison/';
Object.assign(__PR_SURF, {
  plat: { side: 'castle_wall_varriation', top: 'cobblestone_square', tile: 2.6, ttile: 2.2, tint: 0.12, rough: 1, nrm: 1.2 },
  rampart: { side: 'castle_wall_varriation', top: 'castle_wall_varriation', tile: 2.6, tint: 0.12, rough: 1, nrm: 1.3 },
  fwall: { side: 'medieval_blocks_05', top: 'medieval_blocks_05', tile: 2.4, tint: 0.1, rough: 1, nrm: 1.2 },
  ftrim: { side: 'medieval_blocks_05', top: 'medieval_blocks_05', tile: 1.1, tint: 0.55, rough: 0.95, nrm: 0.8 },
  render: { side: 'plaster_stone_wall_01', top: 'medieval_blocks_05', tile: 2.2, ttile: 2.4, tint: 1, rough: 1, nrm: 0.9 },
  cobble: { side: 'medieval_blocks_05', top: 'cobblestone_square', tile: 2.2, ttile: 2.0, tint: 0.1, rough: 1, nrm: 1.2 },
  flags: { side: 'medieval_blocks_05', top: 'red_sandstone_pavement', tile: 2.2, ttile: 2.6, tint: 0.75, rough: 0.95, nrm: 1 },
  gcobble: { side: 'medieval_blocks_05', top: 'grassy_cobblestone', tile: 2.2, ttile: 2.2, tint: 0, rough: 1, nrm: 1.1 },
  roofT: { side: 'clay_roof_tiles_02', top: 'clay_roof_tiles_02', tile: 1.6, tint: 0, rough: 0.9, nrm: 1.3 },
  crate: { side: 'brown_planks_05', top: 'brown_planks_05', tile: 0.9, tint: 0.25, rough: 0.9, nrm: 1 },
  frock: { side: 'rock_face', top: 'sparse_grass', tile: 7, ttile: 2.5, tint: 0.35, rough: 1, nrm: 1.4 },
  // the jungle floor on the island's ledge: grass over the rock, darker and greener than the town's
  jfloor: { side: 'rock_face', top: 'sparse_grass', tile: 4, ttile: 3.2, tint: 0.55, rough: 1, nrm: 1.2 },
});
for (const k of ['ftrim']) __PR_NOCAST.add(k);
__PR_KITS.fortress = {
  id: 'fortress',
  base: './game/maps/fortress/',
  tex: ['medieval_blocks_05', 'castle_wall_varriation', 'plaster_stone_wall_01', 'cobblestone_square', 'red_sandstone_pavement', 'grassy_cobblestone', 'clay_roof_tiles_02'],
  shared: [
    ...['brown_planks_05', 'rock_face'].map((n) => [n, __FT_FROST]),
    ...['sparse_grass', 'green_metal_rust', 'corrugated_iron', 'painted_plaster_wall', 'concrete_wall_008', 'concrete_floor_worn_001', 'garage_floor'].map((n) => [n, __FT_PRISON]),
  ],
  models: ['island_tree_01', 'island_tree_02', 'island_tree_03', 'pachira_aquatica_01', 'shrub_02', 'shrub_04', 'coastal_cliff_02', 'coastal_cliff_04', 'coast_rocks_05', 'fern_02', 'Lantern_01', 'planter_pot_clay', ['barrel_03', __FT_PRISON], ['street_lamp_02', __FT_FROST]],
  sky: [__FT_PRISON + 'sky.webp', __FT_PRISON + 'sky_dusk.webp'],
  lvNy: 30,
  detail: (root, m, models, ticks) => __ftDetail(root, m, models, ticks),
};
// ---------------------------------------------------------------- the detail
function __ftDetail(root, m, models, ticks) {
  const R = m.__pr,
    N = m.__ft;
  if (!R || !N) return null;
  const S = __prSet(),
    K = __prK,
    t0 = performance.now(),
    trim = K('#efe3cb'),
    dark = K('#2a2420');
  let seed = 4021;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // ------------------------------------------------ arches on every opening; blind arches on the Mid Gate
  for (const o of R.openings) o.frame === 'arch' && __cnArch(S, o, trim, K);
  for (const b of N.blind) {
    // a recess (dark), its arch and architrave, a sill
    const P = (a, y, d) => [a, y, b.f + d],
      hw = b.w / 2,
      ca = b.a + hw,
      d = b.side * 0.03;
    S.box('fwall', b.a + 0.2, b.y0, Math.min(b.f, b.f + d), b.a + b.w - 0.2, b.y1 - hw * 0.5, Math.max(b.f, b.f + d), K('#9c8a72'));
    __cnArch(S, { alongX: !0, f: b.f + b.side * 0.2, t: 0.4, a: b.a, w: b.w, y0: b.y0, y1: b.y1, fill: null, trim: 'ftrim' }, trim, K);
    void P;
    void ca;
  }
  // ------------------------------------------------ the ramparts: merlons along the outer edge, a parapet inside,
  // buttresses on the inner faces
  {
    const M = N.merlons[0],
      y = M.y;
    const run = (x0, z0, x1, z1, alongX) => {
      const L = alongX ? x1 - x0 : z1 - z0;
      for (let a = 0.4; a < L - 0.6; a += 1.7) {
        const p = alongX ? [x0 + a, z0] : [x0, z0 + a];
        alongX ? S.box('rampart', p[0], y, p[1], p[0] + 0.95, y + 1.1, p[1] + 0.7, K('#ffffff')) : S.box('rampart', p[0], y, p[1], p[0] + 0.7, y + 1.1, p[1] + 0.95, K('#ffffff'));
      }
    };
    run(0, 0, M.x1, 0, !0);
    run(0, M.z1 - 0.7, M.x1, M.z1, !0);
    run(0, 0, 0, M.z1, !1);
    run(M.x1 - 0.7, 0, M.x1, M.z1, !1);
    // the coping along the top
    for (const [x0, z0, x1, z1] of [[0, 0, M.x1, 2], [0, M.z1 - 2, M.x1, M.z1], [0, 0, 2, M.z1], [M.x1 - 2, 0, M.x1, M.z1]]) S.box('ftrim', x0 - 0.05, y - 0.25, z0 - 0.05, x1 + 0.05, y, z1 + 0.05, trim);
    // buttresses on the inner faces, every 10 m (where nothing stands against the wall)
    for (let x = 8; x < M.x1 - 4; x += 10) {
      S.box('rampart', x - 0.5, 0, 2, x + 0.5, y - 0.6, 2.35, K('#e9e2d6'));
      S.box('rampart', x - 0.5, 0, M.z1 - 2.35, x + 0.5, y - 0.6, M.z1 - 2, K('#e9e2d6'));
    }
  }
  // ------------------------------------------------ the rounded south-east rampart (smooth; its collision is stepped)
  if (N.arc) {
    const { cx, cz, r } = N.arc,
      n = 28,
      y = N.merlons[0].y;
    for (let i = 0; i < n; i++) {
      const a0 = ((i / n) * Math.PI) / 2,
        a1 = (((i + 1) / n) * Math.PI) / 2,
        am = (a0 + a1) / 2,
        seg = 2 * (r + 1.2) * Math.sin((a1 - a0) / 2) + 0.12,
        px = cx + Math.cos(am) * (r + 1.2),
        pz = cz + Math.sin(am) * (r + 1.2);
      S.add('rampart', __prUnit('box'), __cnM(px, y / 2, pz, 2.4, y, seg, -am), K('#ffffff'));
      S.add('ftrim', __prUnit('box'), __cnM(px, y - 0.12, pz, 2.5, 0.25, seg, -am), trim);
      i % 1 === 0 && S.add('rampart', __prUnit('box'), __cnM(cx + Math.cos(am) * (r + 2.0), y + 0.55, cz + Math.sin(am) * (r + 2.0), 0.7, 1.1, 0.95, -am), K('#ffffff'));
    }
    // the top of the stepped mass behind it
    for (let x = cx; x < m.w - 2; x += 1) {
      const zx = cz + Math.sqrt(Math.max(0, r * r - (x + 0.5 - cx) ** 2));
      zx < m.d - 2 && S.box('rampart', x, y - 0.05, zx + 1.2, x + 1, y, m.d - 2, K('#cfc7ba'));
    }
  }
  // ------------------------------------------------ turrets on the ramparts
  for (const T of N.turrets || []) {
    S.add('rampart', __prUnit('cyl16'), __cnM(T.x, T.h / 2, T.z, T.r, T.h, T.r), K('#ffffff'));
    S.add('ftrim', __prUnit('cyl16'), __cnM(T.x, T.h - 0.19, T.z, T.r + 0.25, 0.3, T.r + 0.25), trim);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      S.add('rampart', __prUnit('box'), __cnM(T.x + Math.cos(a) * (T.r - 0.1), T.h + 0.5, T.z + Math.sin(a) * (T.r - 0.1), 0.5, 1.0, 1.0, -a), K('#ffffff'));
    }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      S.box('darkM', T.x + Math.cos(a) * T.r - 0.12, T.h * 0.55, T.z + Math.sin(a) * T.r - 0.12, T.x + Math.cos(a) * T.r + 0.12, T.h * 0.55 + 1.0, T.z + Math.sin(a) * T.r + 0.12, K('#1c1c1c'));
    }
  }
  // ------------------------------------------------ pergolas: timber posts and beams, vines over them
  for (const P of N.pergolas || []) {
    const yT = P.y + P.h,
      wood = K('#6b4a30'),
      alongX = P.x1 - P.x0 >= P.z1 - P.z0;
    for (const zz of alongX ? [P.z0 + 0.3, P.z1 - 0.3] : [P.z0 + 0.3, P.z1 - 0.3]) alongX && S.box('wood', P.x0, yT - 0.22, zz - 0.09, P.x1, yT, zz + 0.09, wood);
    !alongX && [P.x0 + 0.3, P.x1 - 0.3].forEach((xx) => S.box('wood', xx - 0.09, yT - 0.22, P.z0, xx + 0.09, yT, P.z1, wood));
    const L = alongX ? P.x1 - P.x0 : P.z1 - P.z0;
    for (let a = 0.3; a < L; a += 0.55) alongX ? S.box('wood', P.x0 + a - 0.05, yT, P.z0, P.x0 + a + 0.05, yT + 0.12, P.z1, wood) : S.box('wood', P.x0, yT, P.z0 + a - 0.05, P.x1, yT + 0.12, P.z0 + a + 0.05, wood);
    for (let k = 0; k < L * 3; k++) {
      const x = alongX ? P.x0 + rnd() * L : P.x0 + rnd() * (P.x1 - P.x0),
        zz = alongX ? P.z0 + rnd() * (P.z1 - P.z0) : P.z0 + rnd() * L;
      S.add('cloth', __prUnit('sph'), __cnM(x, yT + 0.12, zz, 0.35 + rnd() * 0.25, 0.14, 0.35 + rnd() * 0.25), K(rnd() < 0.5 ? '#3f6a2b' : '#507a33'));
      rnd() < 0.15 && S.add('cloth', __prUnit('box'), __cnM(x, yT - 0.6, zz, 0.08, 1.2, 0.3), K('#3f6a2b'));
    }
    for (const [x, zz] of alongX ? [[P.x0 + 0.3, P.z1 - 0.3], [(P.x0 + P.x1) / 2 - 0.5, P.z1 - 0.3], [P.x1 - 0.3, P.z1 - 0.3]] : [[P.x1 - 0.4, P.z0 + 0.3], [P.x1 - 0.4, (P.z0 + P.z1) / 2], [P.x1 - 0.4, P.z1 - 0.3]]) S.cyl('wood', [x, P.y, zz], [x, yT, zz], 0.1, wood, 'cyl8');
  }
  // ------------------------------------------------ houses: windows, shutters, sills, doors, roofs
  const shutC = ['#3f6b6b', '#6b3f2a', '#2f4a63', '#5a5a3a', '#7a4a2a'];
  for (const H of N.houses) {
    const col = H.s === 'render' ? K(H.color) : trim,
      sc = K(shutC[Math.floor(rnd() * shutC.length)]);
    const faces = [
      ['N', H.x0, H.x1, H.z0, -1, !0],
      ['S', H.x0, H.x1, H.z1, 1, !0],
      ['W', H.z0, H.z1, H.x0, -1, !1],
      ['E', H.z0, H.z1, H.x1, 1, !1],
    ];
    // a stone plinth and a cornice
    S.box('ftrim', H.x0 - 0.06, H.y0, H.z0 - 0.06, H.x1 + 0.06, H.y0 + 0.5, H.z1 + 0.06, trim);
    S.box('ftrim', H.x0 - 0.12, H.top - 0.42, H.z0 - 0.12, H.x1 + 0.12, H.top - 0.18, H.z1 + 0.12, trim);
    for (const [nm, a0, a1, f, sd, ax] of faces) {
      // no windows on a face against a rampart
      if ((ax && (f <= 2.01 || f >= 105.99)) || (!ax && (f <= 2.01 || f >= 125.99))) continue;
      const L = a1 - a0,
        P = (a, y, d) => (ax ? [a, y, f + sd * d] : [f + sd * d, y, a]),
        box = (k, a, y0, d0, b, y1, d1, c) => {
          const p = P(a, y0, d0),
            q = P(b, y1, d1);
          S.box(k, Math.min(p[0], q[0]), y0, Math.min(p[2], q[2]), Math.max(p[0], q[0]), y1, Math.max(p[2], q[2]), c);
        };
      // the door
      let doorA = null;
      if (H.door === nm) {
        doorA = a0 + L / 2;
        box('wood', doorA - 0.75, H.y0, 0, doorA + 0.75, H.y0 + 2.5, 0.06, K('#4a2e1c'));
        box('ftrim', doorA - 0.95, H.y0, 0, doorA - 0.75, H.y0 + 2.7, 0.14, trim);
        box('ftrim', doorA + 0.75, H.y0, 0, doorA + 0.95, H.y0 + 2.7, 0.14, trim);
        box('ftrim', doorA - 0.95, H.y0 + 2.5, 0, doorA + 0.95, H.y0 + 2.85, 0.16, trim);
        box('darkM', doorA + 0.45, H.y0 + 1.1, 0.06, doorA + 0.55, H.y0 + 1.2, 0.1, K('#c9a45a'));
      }
      // windows on each floor
      for (let y = H.y0 + 1.1; y + 1.6 < H.top - 0.7; y += 3.2) {
        const n = Math.max(0, Math.floor((L - 1.6) / 2.9));
        for (let i = 0; i < n; i++) {
          const a = a0 + (L - (n - 1) * 2.9) / 2 + i * 2.9;
          if (doorA !== null && y < H.y0 + 3 && Math.abs(a - doorA) < 1.6) continue;
          const lit = rnd() < H.lit;
          box(lit ? 'glow' : 'darkM', a - 0.48, y, -0.02, a + 0.48, y + 1.5, 0.0, lit ? K(rnd() < 0.6 ? '#ffc078' : '#ffd9a0').map((v) => v * 0.55) : K('#1c1f24'));
          box('ftrim', a - 0.62, y - 0.18, 0, a + 0.62, y, 0.2, trim);
          box('ftrim', a - 0.62, y + 1.5, 0, a + 0.62, y + 1.66, 0.1, trim);
          box('ftrim', a - 0.62, y, 0, a - 0.48, y + 1.5, 0.08, trim);
          box('ftrim', a + 0.48, y, 0, a + 0.62, y + 1.5, 0.08, trim);
          if (rnd() < 0.7) {
            // shutters, open against the wall
            box('wood', a - 1.16, y, 0.02, a - 0.66, y + 1.5, 0.07, sc);
            box('wood', a + 0.66, y, 0.02, a + 1.16, y + 1.5, 0.07, sc);
          }
          // a balcony of plants on some
          rnd() < 0.12 && box('cloth', a - 0.5, y - 0.05, 0.2, a + 0.5, y + 0.25, 0.42, K('#3f6b2e'));
        }
      }
    }
    // the roof
    const w = H.x1 - H.x0,
      d = H.z1 - H.z0;
    if (H.roof === 'pitch') {
      const alongX = w >= d,
        span = alongX ? d : w,
        len = alongX ? w : d,
        rise = Math.min(3.2, span * 0.32),
        half = span / 2 + 0.45,
        ang = Math.atan2(rise, span / 2),
        sl = Math.hypot(half, rise * (half / (span / 2))),
        cx = (H.x0 + H.x1) / 2,
        cz = (H.z0 + H.z1) / 2,
        y = H.top - 0.2;
      for (const sdd of [-1, 1]) {
        const off = (sl / 2) * Math.cos(ang) - 0.0,
          yy = y + (sl / 2) * Math.sin(ang) - 0.06;
        alongX
          ? S.add('roofT', __prUnit('box'), __cnM(cx, yy, cz + sdd * (span / 2 + 0.45 - off), len + 0.6, 0.14, sl, 0, sdd * ang), K('#ffffff'))
          : S.add('roofT', __prUnit('box'), __cnM(cx + sdd * (span / 2 + 0.45 - off), yy, cz, sl, 0.14, len + 0.6, 0, 0, -sdd * ang), K('#ffffff'));
      }
      // gables: triangles of the wall's own surface; a ridge
      const MB = S.b(H.s);
      for (const e of [0, 1]) {
        if (alongX) {
          const x = e ? H.x1 : H.x0,
            q = [[x, y, H.z0], [x, y, H.z1], [x, y + rise, cz], [x, y + rise, cz]];
          e ? __prQuadRaw(MB, q[0], q[2], q[3], q[1], col) : __prQuadRaw(MB, q[1], q[2], q[3], q[0], col);
        } else {
          const zz = e ? H.z1 : H.z0,
            q = [[H.x0, y, zz], [H.x1, y, zz], [cx, y + rise, zz], [cx, y + rise, zz]];
          e ? __prQuadRaw(MB, q[1], q[2], q[3], q[0], col) : __prQuadRaw(MB, q[0], q[2], q[3], q[1], col);
        }
      }
      alongX ? S.box('roofT', H.x0 - 0.3, y + rise - 0.05, cz - 0.16, H.x1 + 0.3, y + rise + 0.14, cz + 0.16, K('#b8654a')) : S.box('roofT', cx - 0.16, y + rise - 0.05, H.z0 - 0.3, cx + 0.16, y + rise + 0.14, H.z1 + 0.3, K('#b8654a'));
    } else {
      // battlements, or a roof terrace behind a parapet (a stair-house, a water tank, pots, sometimes a pergola)
      const bt = H.roof === 'battle';
      if (!bt) {
        const cx = (H.x0 + H.x1) / 2,
          cz = (H.z0 + H.z1) / 2,
          w2 = (H.x1 - H.x0) / 2,
          d2 = (H.z1 - H.z0) / 2;
        S.box('ftrim', H.x0 + 0.4, H.top - 0.02, H.z0 + 0.4, H.x1 - 0.4, H.top + 0.02, H.z1 - 0.4, K('#d8c6a8'));
        if (w2 > 2.2 && d2 > 2.2) {
          const sx = cx + (rnd() - 0.5) * (w2 - 1.6),
            sz = cz + (rnd() - 0.5) * (d2 - 1.6);
          S.box(H.s, sx - 1.0, H.top, sz - 1.0, sx + 1.0, H.top + 2.3, sz + 1.0, col);
          S.box('ftrim', sx - 1.1, H.top + 2.3, sz - 1.1, sx + 1.1, H.top + 2.45, sz + 1.1, trim);
          S.box('wood', sx - 0.45, H.top, sz + 1.0, sx + 0.45, H.top + 1.9, sz + 1.04, K('#4a2e1c'));
          if (rnd() < 0.7) {
            const tx = H.x0 + 1.2 + rnd() * (2 * w2 - 2.4),
              tz = H.z0 + 1.2 + rnd() * (2 * d2 - 2.4);
            if (Math.hypot(tx - sx, tz - sz) > 2.2) {
              for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) S.cyl('paint', [tx + dx, H.top, tz + dz], [tx + dx, H.top + 1.0, tz + dz], 0.04, K('#5a5f5a'), 'cyl6');
              S.add('paint', __prUnit('cyl16'), __cnM(tx, H.top + 1.65, tz, 0.75, 1.3, 0.75), K(rnd() < 0.5 ? '#d8d2c4' : '#6a7a7e'));
            }
          }
          for (let k = 0; k < 3; k++) (N.pots || (N.pots = [])).push({ x: H.x0 + 0.9 + rnd() * (2 * w2 - 1.8), y: H.top, z: H.z0 + 0.8 + 0.1 * k + (rnd() < 0.5 ? 0 : 2 * d2 - 1.8) });
        }
      }
      S.box(H.s, H.x0, H.top, H.z0, H.x1, H.top + 0.5, H.z0 + 0.4, col);
      S.box(H.s, H.x0, H.top, H.z1 - 0.4, H.x1, H.top + 0.5, H.z1, col);
      S.box(H.s, H.x0, H.top, H.z0, H.x0 + 0.4, H.top + 0.5, H.z1, col);
      S.box(H.s, H.x1 - 0.4, H.top, H.z0, H.x1, H.top + 0.5, H.z1, col);
      if (bt)
        for (const [a0, a1, f0, ax] of [[H.x0, H.x1, H.z0, 1], [H.x0, H.x1, H.z1 - 0.4, 1], [H.z0, H.z1, H.x0, 0], [H.z0, H.z1, H.x1 - 0.4, 0]])
          for (let a = a0 + 0.2; a < a1 - 0.6; a += 1.5) ax ? S.box('fwall', a, H.top + 0.5, f0, a + 0.75, H.top + 1.4, f0 + 0.4, col) : S.box('fwall', f0, H.top + 0.5, a, f0 + 0.4, H.top + 1.4, a + 0.75, col);
    }
  }
  // ------------------------------------------------ the Gallery's arcade: columns, arches, its roof
  if (N.arcade) {
    const G = N.arcade;
    for (const c of N.columns) {
      S.add('ftrim', __prUnit('cyl16'), __cnM(c.x, c.y0 + 1.35, c.z, 0.26, 2.7, 0.26), trim);
      S.box('ftrim', c.x - 0.36, c.y0, c.z - 0.36, c.x + 0.36, c.y0 + 0.35, c.z + 0.36, trim);
      S.box('ftrim', c.x - 0.38, c.y0 + 2.62, c.z - 0.38, c.x + 0.38, c.y0 + 2.86, c.z + 0.38, trim);
    }
    for (let x = G.x0; x < G.x1 - 0.1; x += G.bay)
      __cnArch(S, { alongX: !0, f: G.z, t: 0.6, a: x + 0.32, w: G.bay - 0.64, y0: G.y, y1: G.y + 4.2, fill: [['fwall', '#ffffff'], ['fwall', '#ffffff']], trim: 'ftrim' }, trim, K);
    S.box('fwall', G.x0, G.y + 4.2, 10.5, G.x1, G.y + 4.8, 18, trim);
    // a lean-to of clay tiles over it
    S.add('roofT', __prUnit('box'), __cnM((G.x0 + G.x1) / 2, G.y + 5.35, 14.2, G.x1 - G.x0 + 0.4, 0.14, 8.1, 0, -0.16), K('#ffffff'));
  }
  // ------------------------------------------------ stone balustrades
  for (const r of N.rails) {
    const L = Math.hypot(r.x1 - r.x0, r.z1 - r.z0);
    if (L < 0.3) continue;
    const ax = Math.abs(r.x1 - r.x0) > Math.abs(r.z1 - r.z0),
      b = (k, a0, y0, a1, y1, h, c) => (ax ? S.box(k, Math.min(a0, a1), y0, r.z0 - h, Math.max(a0, a1), y1, r.z0 + h, c) : S.box(k, r.x0 - h, y0, Math.min(a0, a1), r.x0 + h, y1, Math.max(a0, a1), c));
    const A0 = ax ? r.x0 : r.z0,
      A1 = ax ? r.x1 : r.z1;
    b('ftrim', A0, r.y, A1, r.y + 0.2, 0.2, trim);
    b('ftrim', A0, r.y + r.h - 0.14, A1, r.y + r.h, 0.22, trim);
    const n = Math.max(2, Math.round(L / 0.32));
    for (let i = 0; i <= n; i++) {
      const a = A0 + ((A1 - A0) * i) / n,
        p = ax ? [a, r.z0] : [r.x0, a];
      i % 8 === 0 ? S.box('ftrim', p[0] - 0.16, r.y, p[1] - 0.16, p[0] + 0.16, r.y + r.h, p[1] + 0.16, trim) : S.add('ftrim', __prUnit('cyl8'), __cnM(p[0], r.y + 0.2 + (r.h - 0.34) / 2, p[1], 0.07, r.h - 0.34, 0.07), trim);
    }
  }
  // ------------------------------------------------ the fountain
  if (N.fountain) {
    const F = N.fountain,
      n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / 8,
        L = 2 * F.r * Math.tan(Math.PI / n);
      S.add('ftrim', __prUnit('box'), __cnM(F.x + Math.cos(a) * (F.r - 0.2), F.y + 0.4, F.z + Math.sin(a) * (F.r - 0.2), 0.4, 0.8, L + 0.05, -a), trim);
      S.add('ftrim', __prUnit('box'), __cnM(F.x + Math.cos(a) * (F.r - 0.15), F.y + 0.84, F.z + Math.sin(a) * (F.r - 0.15), 0.6, 0.1, L + 0.2, -a), trim);
    }
    S.add('ftrim', __prUnit('cyl16'), __cnM(F.x, F.y + 1.4, F.z, 0.35, 2.4, 0.35), trim);
    S.add('ftrim', __prUnit('cyl16'), __cnM(F.x, F.y + 1.55, F.z, 1.3, 0.18, 1.3), trim);
    S.add('ftrim', __prUnit('cyl16'), __cnM(F.x, F.y + 2.6, F.z, 0.75, 0.14, 0.75), trim);
    S.add('ftrim', __prUnit('sph'), __cnM(F.x, F.y + 2.95, F.z, 0.2, 0.3, 0.2), trim);
    S.box('flags', F.x - F.r - 1.6, F.y + 0.005, F.z - F.r - 1.6, F.x + F.r + 1.6, F.y + 0.035, F.z + F.r + 1.6, K('#efe2c8'));
    const water = Object.assign(new Gw({ color: '#2e6e74', roughness: 0.04, metalness: 0.25, transparent: !0, opacity: 0.86, envMapIntensity: 1.6 }), { __prOwn: 1 });
    for (const [r, y] of [[F.r - 0.4, F.y + 0.62], [1.2, F.y + 1.66], [0.68, F.y + 2.68]]) {
      const o = new Ow(new Rw(r, r, 0.02, 32), water);
      o.position.set(F.x, y, F.z);
      root.add(o);
    }
  }
  // ------------------------------------------------ palms
  // A date palm: a leaning, tapering trunk ringed with old leaf scars, a crown of arching fronds (each a rachis
  // with leaflets down both sides: young ones upright and bright, old ones hanging and yellowing), coconuts.
  const palm = (x, y, zz, nFr, nLf) => {
    const h = 4.4 + rnd() * 2.6,
      lx = (rnd() - 0.5) * 1.1,
      lz = (rnd() - 0.5) * 1.1,
      at = (t) => [x + lx * t * t, y + h * t, zz + lz * t * t];
    for (let k = 0; k < 10; k++) {
      const a = k / 10,
        b = (k + 1) / 10;
      S.cyl('wood', at(a), at(b), 0.2 - 0.07 * a, K(k % 2 ? '#75604a' : '#6f5b44'), 'cyl8');
      // leaf-scar rings
      k > 0 && S.cyl('wood', at(a - 0.012), at(a + 0.012), 0.207 - 0.07 * a, K('#64523d'), 'cyl8');
    }
    const top = at(1),
      MB = S.b('cloth');
    S.add('cloth', __prUnit('sph'), __cnM(top[0], top[1] - 0.15, top[2], 0.32, 0.45, 0.32), K('#5f5233'));
    for (let c = 0; c < 4; c++) {
      const az = c * 1.7 + rnd();
      S.add('cloth', __prUnit('sph'), __cnM(top[0] + Math.cos(az) * 0.24, top[1] - 0.42, top[2] + Math.sin(az) * 0.24, 0.13, 0.15, 0.13), K('#5c4a26'));
    }
    const SEG = nLf + 1;
    for (let f = 0; f < nFr; f++) {
      const age = f / nFr, // 0: young and upright .. 1: old and hanging
        az = f * 2.39996 + rnd() * 0.3,
        e0 = 1.0 - age * 1.45 + (rnd() - 0.5) * 0.2,
        L = 2.5 + rnd() * 0.9,
        droop = 0.35 + age * 0.55,
        dx = Math.cos(az),
        dz = Math.sin(az),
        pt = (t) => {
          const hz = L * Math.cos(e0) * t,
            vy = L * (Math.sin(e0) * t - droop * t * t);
          return [top[0] + dx * hz, top[1] + vy, top[2] + dz * hz];
        },
        base = age > 0.82 ? '#8a7a3e' : age > 0.6 ? '#5f7a30' : age < 0.25 ? '#62913a' : '#46752f';
      let pr = pt(0);
      for (let sg = 1; sg <= SEG; sg++) {
        const t = sg / SEG,
          q = pt(t),
          w = 0.035;
        __prQuadRaw(MB, [pr[0] + dz * w, pr[1], pr[2] - dx * w], [q[0] + dz * w, q[1], q[2] - dx * w], [q[0] - dz * w, q[1], q[2] + dx * w], [pr[0] - dz * w, pr[1], pr[2] + dx * w], K('#6b6a35'));
        if (sg < SEG) {
          // a pair of leaflets: out to the side, swept forward and drooping
          const ll = 0.85 * Math.sin(Math.PI * (t * 0.85 + 0.1)) + 0.12,
            tx = q[0] - pr[0],
            ty = q[1] - pr[1],
            tz = q[2] - pr[2],
            tl = Math.hypot(tx, ty, tz) || 1;
          for (const sd of [-1, 1]) {
            const ox = -dz * sd,
              oz = dx * sd,
              tip = [q[0] + (ox * 0.8 + (tx / tl) * 0.45) * ll, q[1] - ll * (0.32 + age * 0.3) + (ty / tl) * 0.45 * ll, q[2] + (oz * 0.8 + (tz / tl) * 0.45) * ll],
              m = [(q[0] + tip[0]) / 2, (q[1] + tip[1]) / 2, (q[2] + tip[2]) / 2],
              ww = 0.07,
              c = K(rnd() < 0.3 ? (age > 0.6 ? '#8f8540' : '#3d6a2a') : base);
            __prQuadRaw(MB, q, [m[0] + (tx / tl) * ww, m[1] + 0.02, m[2] + (tz / tl) * ww], tip, [m[0] - (tx / tl) * ww, m[1] - 0.02, m[2] - (tz / tl) * ww], c);
            __prQuadRaw(MB, [m[0] - (tx / tl) * ww, m[1] - 0.02, m[2] - (tz / tl) * ww], tip, [m[0] + (tx / tl) * ww, m[1] + 0.02, m[2] + (tz / tl) * ww], q, c);
          }
        }
        pr = q;
      }
    }
  };
  for (const p of N.palms) {
    palm(p.x, p.y, p.z, 14, 8);
    p.bed && S.box('gcobble', p.x - p.bed / 2 + 0.12, p.y - 0.02, p.z - p.bed / 2 + 0.12, p.x + p.bed / 2 - 0.12, p.y + 0.01, p.z + p.bed / 2 - 0.12, K('#ffffff'));
  }
  // ------------------------------------------------ crates: planked boxes with darker framing
  for (const c of N.crates) {
    const h = c.s / 2,
      e = 0.07,
      fc = K('#6a4a2c');
    S.box('crate', c.x - h, c.y, c.z - h, c.x + h, c.y + c.s, c.z + h, K('#d9b88a'));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.box('crate', c.x + sx * h - (sx > 0 ? e : 0), c.y, c.z + sz * h - (sz > 0 ? e : 0), c.x + sx * h + (sx < 0 ? e : 0), c.y + c.s, c.z + sz * h + (sz < 0 ? e : 0), fc);
    for (const yy of [c.y, c.y + c.s - e]) {
      S.box('crate', c.x - h - 0.005, yy, c.z - h - 0.005, c.x + h + 0.005, yy + e, c.z - h + e, fc);
      S.box('crate', c.x - h - 0.005, yy, c.z + h - e, c.x + h + 0.005, yy + e, c.z + h + 0.005, fc);
      S.box('crate', c.x - h - 0.005, yy, c.z - h, c.x - h + e, yy + e, c.z + h, fc);
      S.box('crate', c.x + h - e, yy, c.z - h, c.x + h + 0.005, yy + e, c.z + h, fc);
    }
    // a diagonal brace on two faces
    S.add('crate', __prUnit('box'), __cnM(c.x, c.y + c.s / 2, c.z - h - 0.01, c.s * 1.3, 0.09, 0.03, 0, 0, Math.PI / 4), fc);
    S.add('crate', __prUnit('box'), __cnM(c.x - h - 0.01, c.y + c.s / 2, c.z, 0.03, 0.09, c.s * 1.3, 0, Math.PI / 4), fc);
  }
  // ------------------------------------------------ sheds: posts, timber beams, corrugated roofs
  for (const sh of N.sheds) {
    const yT = sh.y + sh.h,
      steel = K('#4c524f'),
      fall = sh.market ? 0.6 : 0.45;
    if (!sh.roofOnly) for (const [x, zz] of [[sh.x0 + 0.3, sh.z0 + 0.3], [sh.x1 - 0.3, sh.z0 + 0.3], [sh.x0 + 0.3, sh.z1 - 0.3], [sh.x1 - 0.3, sh.z1 - 0.3]]) S.cyl('paint', [x, sh.y, zz], [x, yT, zz], 0.09, steel, 'cyl8');
    else for (const [x, zz] of [[sh.x0 + 0.3, sh.z1 - 4], [sh.x0 + 0.3, sh.z1 - 0.2], [(sh.x0 + sh.x1) / 2 + 0.5, sh.z1 - 0.2], [sh.x1, sh.z1 - 0.2], [sh.x1, sh.z1 - 4]]) S.cyl('paint', [x, 0, zz], [x, yT, zz], 0.13, steel, 'cyl8');
    for (const zz of [sh.z0 + 0.3, sh.z1 - 0.3]) S.box('wood', sh.x0, yT - 0.25, zz - 0.1, sh.x1, yT, zz + 0.1, K('#6b4a30'));
    const dz = sh.z1 - sh.z0 + 1,
      ang = Math.atan2(fall, dz);
    S.add('corr', __prUnit('box'), __cnM((sh.x0 + sh.x1) / 2, yT + fall / 2 + 0.05, (sh.z0 + sh.z1) / 2, sh.x1 - sh.x0 + 1, 0.06, Math.hypot(dz, fall), 0, ang), K('#a49a88'));
  }
  // ------------------------------------------------ the helicopter on the pad
  if (N.heli) {
    const Hh = N.heli,
      x = Hh.x,
      zz = Hh.z,
      y = Hh.y,
      olive = K('#3e4632'),
      blk = K('#1b1d1a');
    // the pad: a white circle and the H
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      S.add('paint', __prUnit('box'), __cnM(x + Math.cos(a) * 5.8, y + 0.06, zz + Math.sin(a) * 5.8, 0.8, 0.01, 0.22, -a), K('#e8e6df'));
    }
    S.box('paint', x - 2.2, y + 0.055, zz - 2.2, x - 1.5, y + 0.065, zz + 2.2, K('#e8e6df'));
    S.box('paint', x + 1.5, y + 0.055, zz - 2.2, x + 2.2, y + 0.065, zz + 2.2, K('#e8e6df'));
    S.box('paint', x - 1.5, y + 0.055, zz - 0.35, x + 1.5, y + 0.065, zz + 0.35, K('#e8e6df'));
    // the airframe (nose to the west, parked off the H)
    const hx = x - 0.5,
      hz = zz;
    S.add('paint', __prUnit('sph'), __cnM(hx, y + 1.55, hz, 2.3, 1.05, 1.0), olive);
    S.add('glassL', __prUnit('sph'), __cnM(hx - 1.35, y + 1.75, hz, 1.05, 0.75, 0.86), K('#9fb7c0'));
    S.cyl('paint', [hx + 1.6, y + 1.7, hz], [hx + 6.6, y + 2.1, hz], 0.32, olive, 'cyl16');
    S.add('paint', __prUnit('box'), __cnM(hx + 6.5, y + 2.75, hz, 0.9, 1.4, 0.12, 0, 0, -0.35), olive);
    S.add('paint', __prUnit('box'), __cnM(hx + 6.2, y + 2.1, hz, 0.5, 0.08, 1.8), olive);
    S.cyl('darkM', [hx + 6.6, y + 2.6, hz + 0.12], [hx + 6.6, y + 2.6, hz + 0.3], 0.05, blk, 'cyl8');
    S.add('darkM', __prUnit('box'), __cnM(hx + 6.6, y + 2.6, hz + 0.25, 0.1, 1.5, 0.04), blk);
    for (const sd of [-1, 1]) {
      S.cyl('darkM', [hx - 2.2, y + 0.12, hz + sd * 1.05], [hx + 2.2, y + 0.12, hz + sd * 1.05], 0.06, blk, 'cyl8');
      for (const dx of [-1.1, 1.1]) S.cyl('darkM', [hx + dx, y + 0.12, hz + sd * 1.05], [hx + dx, y + 0.9, hz + sd * 0.6], 0.05, blk, 'cyl8');
    }
    S.cyl('darkM', [hx, y + 2.5, hz], [hx, y + 2.95, hz], 0.12, blk, 'cyl8');
    for (let k = 0; k < 4; k++) S.add('darkM', __prUnit('box'), __cnM(hx, y + 2.98, hz, 11.4, 0.05, 0.32, (k * Math.PI) / 4 + 0.3), blk);
    for (const sd of [-1, 1]) S.box('glow', hx - 0.1, y + 1.2, hz + sd * 1.0 - 0.02, hx + 0.1, y + 1.3, hz + sd * 1.0 + 0.02, K(sd < 0 ? '#ff4a3a' : '#3cff70'));
  }
  // ------------------------------------------------ the lighthouse lantern on the tower
  if (N.tower) {
    const T = N.tower,
      cx = (T.x0 + T.x1) / 2,
      cz = (T.z0 + T.z1) / 2,
      y = T.top + 0.5;
    S.box('fwall', cx - 2.2, y - 0.5, cz - 2.2, cx + 2.2, y + 0.4, cz + 2.2, trim);
    S.box('glow', cx - 1.6, y + 0.4, cz - 1.6, cx + 1.6, y + 2.3, cz + 1.6, K('#ffe2a0').map((v) => v * 0.8));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.box('darkM', cx + sx * 1.6 - 0.1, y + 0.4, cz + sz * 1.6 - 0.1, cx + sx * 1.6 + 0.1, y + 2.3, cz + sz * 1.6 + 0.1, K('#22262a'));
    S.add('paint', __prUnit('cone8'), __cnM(cx, y + 3.1, cz, 2.3, 1.6, 2.3, Math.PI / 8), K('#3a4a3e'));
  }
  // ------------------------------------------------ outside: cliffs, the jungle ledge, the sea
  {
    const W0 = m.w,
      D0 = m.d,
      seaY = -30;
    const rock = (x0, z0, x1, z1, top, floor) => {
      S.box('frock', x0, seaY - 2, z0, x1, top, z1, K('#b8ab98'));
      // grass and moss over the top of the ledge, ragged at the edge
      floor && S.box('jfloor', x0, top - 0.05, z0, x1, top + 0.07, z1, K(rnd() < 0.5 ? '#5d7536' : '#6b7f3c'));
    };
    for (const [ax, a0, a1, f, sd] of [[1, -16, W0 + 16, 0, -1], [1, -16, W0 + 16, D0, 1], [0, 0, D0, 0, -1], [0, 0, D0, W0, 1]]) {
      for (let a = a0; a < a1; a += 6) {
        const out = 9 + rnd() * 5,
          top = -0.15 + rnd() * 0.3;
        ax ? rock(a, sd < 0 ? f - out : f, a + 6.4, sd < 0 ? f : f + out, top, 1) : rock(sd < 0 ? f - out : f, a, sd < 0 ? f : f + out, a + 6.4, top, 1);
        // a lower step of rock further out, towards the water
        const out2 = out + 4 + rnd() * 8,
          top2 = seaY + 6 + rnd() * 10;
        ax ? rock(a - 1, sd < 0 ? f - out2 : f + out, a + 7, sd < 0 ? f - out : f + out2, top2, 1) : rock(sd < 0 ? f - out2 : f + out, a - 1, sd < 0 ? f - out : f + out2, a + 7, top2, 1);
        if (!1) {
          const p = ax ? [a + 3, sd < 0 ? f - 2 - rnd() * (out - 3) : f + 2 + rnd() * (out - 3)] : [sd < 0 ? f - 2 - rnd() * (out - 3) : f + 2 + rnd() * (out - 3), a + 3];
          // jungle palms on the ledge (drawn by the palm code above: queue them for a second pass)
          (N.__outPalms || (N.__outPalms = [])).push({ x: p[0], z: p[1], y: top, bed: 0 });
        }
      }
    }
    // the scanned coastal cliffs round the island (Poly Haven): along each side, their tops just under the
    // jungle ledge, their faces out to sea
    const cl = [];
    for (const x of [14, 64, 114]) cl.push([x, -15, Math.PI], [x, D0 + 15, 0]);
    for (const zz of [22, 86]) cl.push([-15, zz, -Math.PI / 2], [W0 + 15, zz, Math.PI / 2]);
    cl.forEach(([x, zz, ry], k) => R.models.push({ id: 'coastal_cliff_02', x, y: seaY + 1, z: zz, ry: ry + (rnd() - 0.5) * 0.15, s: 1.45 + (k % 3) * 0.08 }));
    for (const [x, zz] of [[-14, -14], [W0 + 14, -14], [-14, D0 + 14], [W0 + 14, D0 + 14]]) R.models.push({ id: 'coastal_cliff_04', x, y: seaY - 2, z: zz, ry: Math.atan2(x - W0 / 2, zz - D0 / 2), s: 0.75 });
    for (let k = 0; k < 18; k++) {
      const a = rnd() * Math.PI * 2;
      R.models.push({ id: 'coast_rocks_05', x: W0 / 2 + Math.cos(a) * (88 + rnd() * 14), y: seaY - 0.6, z: D0 / 2 + Math.sin(a) * (78 + rnd() * 12), ry: rnd() * 6.28, s: 2 + rnd() * 2.5 });
    }
    // the jungle: island trees and palms all round the rim, bushes between them
    const rim = (f) => {
      for (const [ax, a0, a1, fo, sd] of [[1, -12, W0 + 12, 0, -1], [1, -12, W0 + 12, D0, 1], [0, 0, D0, 0, -1], [0, 0, D0, W0, 1]])
        for (let a = a0; a < a1; a += 1.9) f(ax ? a + rnd() * 2 : fo + sd * (2.2 + rnd() * 6.6), ax ? fo + sd * (2.2 + rnd() * 6.6) : a + rnd() * 2);
    };
    let nt = 0;
    rim((x, zz) => {
      const y = 0.12;
      const r = rnd();
      if (r < 0.1 && nt < 150) nt++, N.trees.push({ id: ['island_tree_01', 'island_tree_02', 'island_tree_03'][(rnd() * 3) | 0], x, z: zz, y: y - 0.3, s: 1.4 + rnd() * 1.3, r: rnd() * 6.28 });
      else if (r < 0.44) (N.__outPalms || (N.__outPalms = [])).push({ x, z: zz, y, bed: 0 });
      else if (r < 0.54) N.ferns.push({ x, z: zz, y: y + 0.05 });
      // undergrowth (Poly Haven scans: rows of shrubs and young pachira, laid along the shore)
      else if (r < 0.74) R.models.push({ id: 'shrub_02', x, y: y - 0.1, z: zz, ry: rnd() * 6.28, s: 1.0 + rnd() * 0.6 });
      else if (r < 0.88) R.models.push({ id: 'pachira_aquatica_01', x, y: y - 0.1, z: zz, ry: rnd() * 6.28, s: 1.6 + rnd() * 0.8 });
      else R.models.push({ id: 'shrub_04', x, y: y - 0.05, z: zz, ry: rnd() * 6.28, s: 5 + rnd() * 3 });
    });
    // the sea out to the far plane (so its edge sits on the horizon), deep teal offshore
    const sea = Object.assign(new Gw({ color: '#1d5664', roughness: 0.2, metalness: 0.3, envMapIntensity: 1.1 }), { __prOwn: 1 });
    const o = new Ow(new _i(3000, 0.2, 3000), sea);
    o.position.set(W0 / 2, seaY, D0 / 2);
    o.receiveShadow = !0;
    root.add(o);
    // shallows round the island: turquoise over the sand and rock shelf, fading out in two steps
    // (one flat disc, vertex-coloured from turquoise in the middle to exactly the sea's colour at its rim, so
    // there is no edge)
    {
      const g = new bi(1, 96, 28, 0, Math.PI * 2, 0, Math.PI / 2),
        P = g.attributes.position,
        Nn = g.attributes.normal,
        col = new Float32Array(P.count * 3),
        cIn = new UA('#3fb4a8'),
        cMid = new UA('#2a8c92'),
        cOut = new UA('#1d5664');
      for (let i = 0; i < P.count; i++) {
        const r = Math.hypot(P.getX(i), P.getZ(i)),
          u = Math.min(1, Math.max(0, (r - 0.5) / 0.5)),
          a = u < 0.45 ? u / 0.45 : 1,
          b = u < 0.45 ? 0 : (u - 0.45) / 0.55,
          sm = (t) => t * t * (3 - 2 * t),
          c0 = cIn.clone().lerp(cMid, sm(a)).lerp(cOut, sm(b));
        col.set([c0.r, c0.g, c0.b], i * 3);
        P.setY(i, 0);
        Nn.setXYZ(i, 0, 1, 0);
      }
      g.setAttribute('color', new gi(col, 3));
      const mt = Object.assign(new Gw({ color: '#ffffff', vertexColors: !0, roughness: 0.2, metalness: 0.3, envMapIntensity: 1.1 }), { __prOwn: 1 }),
        d = new Ow(g, mt);
      d.scale.set(190, 1, 175);
      d.position.set(W0 / 2, seaY + 0.7, D0 / 2);
      root.add(d);
    }
  }
  // the ledge's palms (the same palm, a little sparser)
  for (const p of N.__outPalms || []) palm(p.x, p.y, p.z, 11, 6);
  // ------------------------------------------------ lanterns on the walls (the Poly Haven lantern on a bracket)
  const walls = m.boxes.filter((b) => b.kind === 'wall');
  for (const l of R.lamps) {
    if (l.k !== 'lantern') {
      l.k === 'heli' && S.add('glow', __prUnit('sph'), __cnM(l.x, l.y, l.z, 0.12, 0.08, 0.12), K('#ffd27a'));
      continue;
    }
    let dir = null;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const px = l.x + dx * 0.6,
        pz = l.z + dz * 0.6;
      if (walls.some((b) => px > b.min.x && px < b.max.x && pz > b.min.z && pz < b.max.z && l.y > b.min.y && l.y < b.max.y)) {
        dir = [dx, dz];
        break;
      }
    }
    const nx = dir ? -dir[0] : 0,
      nz = dir ? -dir[1] : 0;
    S.cyl('darkM', [l.x - nx * 0.25, l.y + 0.25, l.z - nz * 0.25], [l.x + nx * 0.12, l.y + 0.25, l.z + nz * 0.12], 0.025, K('#1d1d1d'), 'cyl6');
    R.models.push({ id: 'Lantern_01', x: l.x + nx * 0.14, y: l.y - 0.45, z: l.z + nz * 0.14, ry: 0, s: 2.6 });
    S.add('glow', __prUnit('sph'), __cnM(l.x + nx * 0.12, l.y - 0.08, l.z + nz * 0.12, 0.07, 0.1, 0.07), K('#ffcf7a'));
  }
  // ------------------------------------------------ trees, ferns, clay pots (Poly Haven models)
  for (const t of N.trees) R.models.push({ id: t.id, x: t.x, y: t.y, z: t.z, ry: t.r || 0, s: t.s || 1 });
  for (const f of N.ferns) R.models.push({ id: 'fern_02', x: f.x, y: f.y, z: f.z, ry: rnd() * 6.28, s: 0.9 + rnd() * 0.4 });
  for (const p of N.pots || []) {
    R.models.push({ id: 'planter_pot_clay', x: p.x, y: p.y, z: p.z, ry: rnd() * 6.28, s: 2.6 });
    S.add('cloth', __prUnit('sph'), __cnM(p.x, p.y + 0.62, p.z, 0.32, 0.3, 0.32), K(rnd() < 0.5 ? '#3f6a2b' : '#5a7a30'));
  }
  // ------------------------------------------------ build
  const tris = S.build(root, __prMats, 'fortress_det_');
  __prModels2(root, R, models);
  // glow brighter at dusk and at night
  ticks.push(() => {
    const tod = Zw.getState().timeOfDay;
    __PR.glowMat && __PR.glowMat.color.setScalar(tod === 'night' ? 2.2 : tod === 'dusk' ? 1.7 : 1.1);
  });
  return { tris: Math.round(tris), ms: Math.round(performance.now() - t0), houses: N.houses.length, crates: N.crates.length, palms: N.palms.length };
}
typeof window < 'u' && (window.__bpFortress = () => ({ stats: __PR.stats }));
