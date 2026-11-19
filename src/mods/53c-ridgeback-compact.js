/* ===== Bayou Tactical mod: Ridgeback Pass, compact ===== */
// The 200 m map played as a ring: the Terrorists started at the far south end and walked 116 m (about 20 s) to
// either bombsite round the long outer lanes, while the Counter-Terrorists were 45 m from both. Now the north half
// is the map, a classic three-lane layout:
//   - T spawn moves up the mid lane to just south of the bridge (98-102, 128-133). From there it is 82 m to
//     either site (about 14 s; the CTs still get there first, in about 8 s, to set up), with three real choices:
//       A: through the Smuggler's Cave, out onto A Main and north to A
//       Mid: over the bridge, then A Ramp, the Old Drift or B Window
//       B: down into the creek gorge, east along it to B Lower and north to B
//   - everything south of that is closed by rockfalls: A Main's southern loop, the old T spawn, B Approach and
//     the B Tunnels (closed at their north end), each with an invisible wall behind it that also stops grenades
//   - cover where fights happen: boxes and crates to plant behind and hold from on both sites, cover at the exits
//     of A Main and B Lower, and on the CTs' rotations to each site
// Every rock and crate added is the map's own Poly Haven model, solid with its exact collision hull, and known to
// the bots' walk grid (so they walk round it, and never south of the cut). Deathmatch spawns south of the cut are
// replaced by spawns round the lanes that are left.
const __RBC = (() => {
  const r = (rotY) => [0, Math.sin(rotY / 2), 0, Math.cos(rotY / 2)];
  // [asset, x, z, turn, scale, raise (metres, for stacking: the scaled height of what it sits on)]
  const P = [
    // rockfalls: A Main's southern loop (z 141), the mid lane behind T spawn (z 141), the B Tunnels (z 127.5)
    ['coast_rocks_05', 52.5, 141.6, 0.3, 1.8], ['coast_rocks_05', 58.0, 141.8, -0.4, 1.8], ['namaqualand_boulder_04', 55.2, 141.2, 0.9, 1.6],
    ['namaqualand_boulder_04', 50.2, 142.3, 2.1, 1.6], ['namaqualand_boulder_04', 60.2, 142.2, -1.2, 1.5], ['boulder_01', 55.5, 143.0, 0.4, 2.0],
    ['coast_rocks_05', 98.5, 141.8, 0.6, 2.0], ['coast_rocks_05', 105.5, 142.0, -0.3, 2.0], ['namaqualand_boulder_04', 101.8, 141.0, 1.4, 1.8],
    ['namaqualand_boulder_04', 95.8, 141.2, 0.2, 1.7], ['namaqualand_boulder_04', 108.3, 141.4, 2.4, 1.7], ['boulder_01', 102.0, 143.0, 1.0, 2.0],
    ['coast_rocks_05', 143.8, 127.8, 0.1, 1.6], ['namaqualand_boulder_04', 140.6, 127.2, 1.1, 1.6], ['namaqualand_boulder_04', 146.8, 127.4, -0.7, 1.6],
    // A site: a stack of military crates (plant behind it), a crate pair, barrels
    ['wooden_military_crate', 60.0, 66.5, 0.2, 2.0], ['wooden_military_crate', 60.0, 66.5, 0.25, 2.0, 0.94],
    ['wooden_crate_02', 66.5, 72.0, 1.2, 2.0], ['wooden_crate_02', 66.5, 72.0, 1.15, 1.9, 0.92], ['wooden_barrels_01_barrel01', 58.5, 72.8, 0.4, 1.2], ['wooden_barrels_01_barrel01', 59.6, 73.6, 1.7, 1.2],
    // B site: the same idea, mirrored
    ['wooden_military_crate', 134.0, 68.0, -0.3, 2.0], ['wooden_military_crate', 134.0, 68.0, -0.25, 2.0, 0.94],
    ['wooden_crate_02', 138.6, 74.2, 0.5, 2.0], ['wooden_crate_02', 138.6, 74.2, 0.55, 1.9, 0.92], ['wooden_barrels_01_barrel01', 139.0, 66.6, 0.9, 1.2],
    // the exits of A Main and B Lower; the CTs' rotations
    ['wooden_military_crate', 58.4, 84.5, 0.4, 2.0], ['wooden_military_crate', 141.8, 86.5, -0.5, 2.0],
    ['wooden_military_crate', 86.0, 56.5, 0.9, 2.0], ['wooden_crate_02', 117.0, 58.5, -0.6, 2.0], ['wooden_crate_02', 117.0, 58.5, -0.55, 1.9, 0.92],
  ];
  return {
    props: P.map(([asset, x, z, t, s, up = 0]) => ({ asset, x, z, q: r(t), s, up, t })),
    tSpawns: [[97.5, 128.5], [97.5, 132.5], [99, 130.5], [99, 132.5], [100.5, 128.5], [100.5, 130.5], [100.5, 132.5], [102, 128.5], [102, 130.5], [102, 132.5]],
    // deathmatch spawns round what is left
    dm: [[57, 90], [60, 110], [140, 109], [140, 92], [100, 125], [74, 81], [118, 89], [50, 54], [60, 133], [84, 54], [119, 56], [137, 64], [63, 62], [92, 136], [100, 104], [128, 81]],
    // the cut: invisible walls (players, bots, grenades): all of z > 141.6, and the B Tunnels behind their rockfall
    walls: [[0, 141.6, 200, 142.2], [138, 127.9, 150, 141.6]],
    CUT_Z: 141.4,
    injected: { props: !1, data: !1 },
  };
})();
// the props' sizes (their collision hulls' bounds, measured from map.json: known before it loads, so the bots'
// walk grid can be built at any time)
const __RBC_EXT = {
  coast_rocks_05: [[-1.99, 0.05, -1.85], [2.02, 1.32, 1.87]],
  namaqualand_boulder_04: [[-1.2, 0.06, -1.23], [1.24, 1.78, 1.25]],
  boulder_01: [[-0.56, 0.03, -0.91], [0.62, 0.99, 0.9]],
  wooden_military_crate: [[-0.62, 0, -0.26], [0.62, 0.47, 0.26]],
  wooden_crate_02: [[-0.26, 0, -0.58], [0.26, 0.46, 0.58]],
  wooden_barrels_01_barrel01: [[-0.38, 0, -0.38], [0.37, 0.92, 0.37]],
};
function __rbcExtent(asset) {
  const e = __RBC_EXT[asset];
  return e ? { mn: e[0], mx: e[1] } : null;
}
// each prop's height: on the ground there (the lowest of its footprint's corners, so it does not float on a slope),
// plus its stacking raise
function __rbcY(o) {
  const e = __rbcExtent(o.asset),
    r = e ? Math.max(e.mx[0] - e.mn[0], e.mx[2] - e.mn[2]) * 0.35 * o.s : 0.3;
  let g = 1e9;
  for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) g = Math.min(g, __rbGround(o.x + dx, o.z + dz));
  return g + o.up; // (the raise is in metres: the height of the scaled crate under it)
}
// the scenery: the rocks and crates added to the package's own instances (drawn with its detail levels)
{
  const prevJSON = __rbJSON;
  __rbJSON = async function (p) {
    const r = await prevJSON.apply(this, arguments);
    if (p === 'data/props.json' && r && !__RBC.injected.props) {
      await new Promise((res) => __rbLoadData(res));
      __RBC.injected.props = !0;
      for (const o of __RBC.props) (r[o.asset] || (r[o.asset] = [])).push({ p: [o.x - __rbOFF, __rbcY(o), o.z - __rbOFF], q: o.q, s: o.s });
    }
    return r;
  };
}
// the physics: each one solid with its exact hull
{
  const prevData = __rbLoadData;
  __rbLoadData = function (cb) {
    return prevData.call(this, () => {
      try {
        const D = __RB.data;
        if (D && !__RBC.injected.data) {
          __RBC.injected.data = !0;
          for (const o of __RBC.props) D.hulls[o.asset] && D.colliders.push({ type: 'hull', asset: o.asset, p: [o.x - __rbOFF, __rbcY(o), o.z - __rbOFF], q: o.q, s: o.s });
        }
      } catch (e) {
        console.warn('[ridgeback] compact', e);
      }
      cb && cb();
    });
  };
}
// the bots' walk grid: nothing south of the cut, and the new props blocked
{
  const prevCells = __rbCells;
  __rbCells = function () {
    if (__RB.cells) return __RB.cells;
    const C = prevCells.apply(this, arguments),
      tn = __RB_DATA.tn,
      add = (c, s, y0, y1) => {
        const k = s * tn + c;
        (C.bl.get(k) || C.bl.set(k, []).get(k)).push([y0, y1]);
      };
    for (const [x0, z0, x1, z1] of __RBC.walls) for (let s = Math.floor(z0 / 0.5); s <= Math.floor(z1 / 0.5); s++) for (let c = Math.floor(x0 / 0.5); c < Math.ceil(x1 / 0.5); c++) add(c, s, -50, 300);
    for (let s = Math.floor(__RBC.CUT_Z / 0.5); s < tn; s++) for (let c = 0; c < tn; c++) add(c, s, -50, 300);
    for (const o of __RBC.props) {
      const e = __rbcExtent(o.asset);
      if (!e) continue;
      const y = __rbcY(o),
        cs = Math.cos(o.t),
        sn = Math.sin(o.t);
      let xa = 1e9,
        xb = -1e9,
        za = 1e9,
        zb = -1e9;
      for (const lx of [e.mn[0], e.mx[0]])
        for (const lz of [e.mn[2], e.mx[2]]) {
          const wx = o.x + (lx * cs + lz * sn) * o.s,
            wz = o.z + (-lx * sn + lz * cs) * o.s;
          (xa = Math.min(xa, wx)), (xb = Math.max(xb, wx)), (za = Math.min(za, wz)), (zb = Math.max(zb, wz));
        }
      for (let s = Math.floor(za / 0.5); s <= Math.floor(zb / 0.5); s++) for (let c = Math.floor(xa / 0.5); c <= Math.floor(xb / 0.5); c++) add(c, s, y - 0.2, y + e.mx[1] * o.s);
    }
    return C;
  };
}
// the map: the new T spawn, the walls, deathmatch spawns, the bots' site plans redone from the new spawn
{
  const prevBuild = XE.ridgeback;
  XE.ridgeback = function () {
    const A = prevBuild.apply(this, arguments),
      w = new Po(),
      g = (x, zz) => z(x, __rbGround(x, zz), zz);
    w.m = A;
    for (const [x0, z0, x1, z1] of __RBC.walls) w.box(x0, -5, z0, x1, 140, z1, 'bounds', { mat: 'concrete', pen: 0 });
    A.spawns.T = __RBC.tSpawns.map(([x, zz]) => g(x, zz));
    A.spawnZones.T = { min: z(96.5, 0, 127.5), max: z(103, 0, 133.5) };
    A.tdmSpawns = [...A.tdmSpawns.filter((p) => p.z < __RBC.CUT_Z - 1.5), ...__RBC.dm.map(([x, zz]) => g(x, zz))];
    A.poi = A.poi.filter((p) => p.z < __RBC.CUT_Z - 1);
    // the bots' plans for each site (where to stage, watch and hold), from the new T spawn
    const ctC = A.spawns.CT[0],
      tC = A.spawns.T[0],
      mid = (a, b, t) => z(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t),
      onG = (p) => z(p.x, __rbGround(p.x, p.z), p.z);
    for (const s of A.sites) {
      const c = z((s.min.x + s.max.x) / 2, 0, (s.min.z + s.max.z) / 2);
      s.stage = [onG(mid(tC, c, 0.55)), onG(mid(tC, c, 0.75))];
      s.watch = [onG(mid(ctC, c, 0.7)), onG(z(c.x + 6, 0, c.z + 5)), onG(z(c.x - 6, 0, c.z + 5))].map((p) => z(p.x, p.y + 1.3, p.z));
    }
    return A;
  };
  const e = BD.find((m) => m.id === 'ridgeback');
  e &&
    Object.assign(e, {
      blurb: 'A tight alpine pass. Three lanes from T spawn: the Smuggler’s Cave onto A Main, the bridge over the creek gorge into Mid, or down the gorge to B Lower. Cover on both sites.',
      size: 'Medium',
      maxPlayers: 16,
    });
}
typeof window < 'u' && (window.__bpRidgeback = () => ({ props: __RBC.props.length, injected: __RBC.injected, tSpawns: aw().id === 'ridgeback' ? aw().spawns.T.map((p) => [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]) : null }));
typeof window < 'u' && (window.__bpRbGround = (x, zz) => __rbGround(x, zz));
