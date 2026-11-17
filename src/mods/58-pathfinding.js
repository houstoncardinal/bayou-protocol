/* ===== Bayou Protocol mod: bot pathfinding without frame hitches ===== */
// Bots find their way with an A* search over the map's walk grid (Ridgeback Pass: 156,000 cells). When the
// goal cannot be reached at all (a cover spot on a ledge, a point inside a rock or behind a clip wall), the
// search only finds that out by visiting every cell it can reach: 30 to 70 ms in one frame, and about a
// quarter of all searches on Ridgeback ended that way: a visible stutter every second or two.
// The grid is now split once per map into connected areas (cells joined by any walkable step). A goal in a
// different area from the bot is refused at once, without searching.
const __PF = { n: 0, fail: 0, skipped: 0, ms: 0, worst: 0, buildMs: 0 };
function __pfAreas(nav) {
  const t0 = performance.now(),
    N = nav.h.length,
    par = new Int32Array(N);
  for (let i = 0; i < N; i++) par[i] = i;
  const find = (x) => {
    while (par[x] !== x) x = par[x] = par[par[x]];
    return x;
  };
  for (let G = 0; G < N; G++) {
    const c = nav.col[G],
      x = c % TI,
      z = Math.floor(c / TI),
      h = nav.h[G];
    for (const [dx, dz] of mh) {
      const R = XM(nav, x + dx, z + dz, h, me);
      if (R < 0 || (dx && dz && (XM(nav, x + dx, z, h, me) < 0 || XM(nav, x, z + dz, h, me) < 0))) continue;
      const a = find(G),
        b = find(R);
      a !== b && (par[a] = b);
    }
  }
  for (let i = 0; i < N; i++) par[i] = find(i);
  __PF.buildMs = Math.round(performance.now() - t0);
  return par;
}
{
  const corePath = KT;
  KT = function (a, b) {
    const t = performance.now();
    let r = null,
      skip = !1;
    try {
      const nav = p9(),
        area = nav.__areas || (nav.__areas = __pfAreas(nav)),
        A = l8(a),
        B = l8(b);
      skip = A >= 0 && B >= 0 && area[A] !== area[B];
    } catch (e) {}
    skip ? __PF.skipped++ : (r = corePath(a, b));
    const d = performance.now() - t;
    __PF.n++;
    r || __PF.fail++;
    __PF.ms += d;
    d < 1e3 && (__PF.worst = Math.max(__PF.worst, d));
    return r;
  };
}
typeof window < 'u' &&
  ((window.__bpPath = () => ({ ...__PF })),
  // dev: a path between two points, and the walk-grid area each point is in
  (window.__bpPathTo = (a, b) => {
    const nav = p9(),
      area = nav.__areas || (nav.__areas = __pfAreas(nav)),
      A = l8(a),
      B = l8(b);
    return { from: A >= 0 ? area[A] : null, to: B >= 0 ? area[B] : null, path: KT(a, b) };
  }),
  (window.__bpMap = () => aw()));
