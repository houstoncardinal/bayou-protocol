/* ===== Bayou Protocol mod: Frostline in 3D (cliff faces, cover, ice) ===== */
// Everything here replaces a flat box or sheet with a modelled shape, and keeps to the map's collision boxes
// (61-frostline.js), so what you see is still what you hit:
//   - cliff faces: a sculpted rock wall stands on every lane edge: strata with snow-covered ledges, bulges,
//     vertical cracks, chamfered rock corners, and a snow cornice with icicles along the top. The rock only
//     ever steps back from the collision plane (never into the lane): at most ~0.5 m up to head height,
//     where players touch it and bullets mark it, deeper higher up. Bullet holes are projected onto the rock.
//   - crates: built board by board (side boards with gaps, corner posts, rails, a diagonal brace), with a
//     snow cushion on top
//   - containers: corrugated steel walls, corner posts and castings, rails, a door end with locking bars
//   - snow walls: sculpted snowbanks (rounded, lumpy, with a drift at the foot)
//   - the deck: planks on joists and posts
//   - ice: chunky breakable walls that reach into the rock either side, roofs that meet the rock, icicles
// Low quality keeps all of it (it is cheap geometry), with fewer icicles.

// ---------------------------------------------------------------- 3D value noise
const __flH3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 269.5 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function __flN3(x, y, z) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z),
    xf = x - xi,
    yf = y - yi,
    zf = z - zi,
    u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf),
    w = zf * zf * (3 - 2 * zf),
    l = (a, b, t) => a + (b - a) * t,
    h = __flH3;
  return l(
    l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}
// ---------------------------------------------------------------- mesh builder
// Primitives (any BufferGeometry) placed by a matrix and merged into one geometry with per-vertex colour.
function __flMB() {
  const P = [],
    N = [],
    C = [],
    UV = [],
    I = [],
    v = new U(),
    n = new U(),
    NM = new _A();
  return {
    add(geo, M, col = 1) {
      NM.copy(M).invert().transpose();
      const p = geo.attributes.position,
        nn = geo.attributes.normal,
        uv = geo.attributes.uv,
        base = P.length / 3,
        c = typeof col === 'number' ? [col, col, col] : col;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(M);
        P.push(v.x, v.y, v.z);
        n.fromBufferAttribute(nn, i).transformDirection(NM);
        N.push(n.x, n.y, n.z);
        C.push(c[0], c[1], c[2]);
        uv ? UV.push(uv.getX(i), uv.getY(i)) : UV.push(0, 0);
      }
      if (geo.index) for (let i = 0; i < geo.index.count; i++) I.push(base + geo.index.getX(i));
      else for (let i = 0; i < p.count; i++) I.push(base + i);
    },
    // a flat quad a-b-c-d (counter-clockwise seen from the front)
    quad(a, b, c, d, col = 1) {
      const k = P.length / 3,
        e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      n.set(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]).normalize();
      for (const q of [a, b, c, d]) P.push(q[0], q[1], q[2]), N.push(n.x, n.y, n.z), C.push(col, col, col), UV.push(0, 0);
      I.push(k, k + 1, k + 2, k, k + 2, k + 3);
    },
    get count() {
      return P.length / 3;
    },
    build() {
      const g = new uw();
      g.setAttribute('position', new gi(new Float32Array(P), 3));
      g.setAttribute('normal', new gi(new Float32Array(N), 3));
      g.setAttribute('color', new gi(new Float32Array(C), 3));
      g.setAttribute('uv', new gi(new Float32Array(UV), 2));
      g.setIndex(P.length / 3 > 65535 ? new gi(new Uint32Array(I), 1) : new gi(new Uint16Array(I), 1));
      g.computeBoundingSphere();
      return g;
    },
  };
}
// a transform: position, size, then rotations about y, x, z (radians)
const __flQ = [new Kw(), new Kw()],
  __flAx = [new U(1, 0, 0), new U(0, 1, 0), new U(0, 0, 1)];
function __flM(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
  const q = __flQ[0].setFromAxisAngle(__flAx[1], ry);
  rx && q.multiply(__flQ[1].setFromAxisAngle(__flAx[0], rx));
  rz && q.multiply(__flQ[1].setFromAxisAngle(__flAx[2], rz));
  return new _A().compose(new U(x, y, z), q, new U(sx, sy, sz));
}
// shared unit primitives (never disposed: tiny, and reused every build)
const __flPrim = {};
const __flUnit = (k) =>
  __flPrim[k] ||
  (__flPrim[k] =
    k === 'box' ? new _i(1, 1, 1) : k === 'cyl' ? new Rw(1, 1, 1, 10, 1) : k === 'cyl6' ? new Rw(1, 1, 1, 6, 1) : k === 'sph' ? new bi(1, 14, 10) : k === 'sph6' ? new bi(1, 8, 6) : k === 'sph4' ? new bi(1, 6, 4) : k === 'cone' ? new Oc(1, 1, 6, 1) : null);
function __flMesh(root, geo, mat, name, cast = !0) {
  const o = new Ow(geo, mat);
  o.name = name;
  o.castShadow = cast;
  o.receiveShadow = !0;
  root.add(o);
  return o;
}
// materials made for one build are released with it (see the cleanup in 61-frostline.js)
const __flOwn = (m) => ((m.__flOwn = 1), m);
const __flSnowMat = () => __flOwn(__flMat('rock_face', 4, 3, -2, -1));
// ---------------------------------------------------------------- cliff faces
// How far the rock face stands back from the edge of open ground at a point (x, z) and height y.
function __flRockDepthRaw(x, y, z) {
  const big = __flN3(x * 0.16, y * 0.2, z * 0.16) * 0.65 + __flN3(x * 0.37 + 5, y * 0.4, z * 0.37 - 3) * 0.35,
    sy = y * 0.55 + 1.4 * __flN3(x * 0.06, 7.7, z * 0.06),
    f = sy - Math.floor(sy),
    strata = (1 - f) * Math.min(1, f / 0.1),
    fine = __flN3(x * 1.3, y * 1.3, z * 1.3),
    crack = 1 - Math.abs(2 * __flN3(x * 0.8 + 11, y * 0.07, z * 0.8) - 1);
  // faces lean back a little as they climb (they catch the light, and snow on their ledges)
  return 0.05 + 1.2 * big * big + 0.7 * strata + 0.25 * fine + 0.5 * Math.pow(crack, 5) + 0.04 * Math.max(0, y - 2);
}
// The same, limited by the rock's thickness there (t). Up to head height, where players touch the rock and
// most bullets land, it stays within 12 cm of the edge (the collision is 0-25 cm behind the edge): what you
// see is what stops you. Higher up it may step back to 1.6 m. Ice walls are smoother, timber walls flat.
function __flRockDepth(x, y, z, t, kind = 'rock') {
  if (kind === 'wood') return 0.02;
  const maxD = Math.max(0.06, Math.min(kind === 'ice' ? 0.6 : 1.6, t / 2 - 0.2)),
    lim = Math.min(maxD, y < 2.5 ? 0.12 : y > 4.5 ? maxD : 0.12 + ((y - 2.5) / 2) * (maxD - 0.12));
  return 0.01 + (lim - 0.01) * Math.min(1, Math.max(0, (__flRockDepthRaw(x, y, z) - 0.1) / 1.9));
}
// rock thickness from an edge point going into the rock (to the next open ground, at most 6 m)
function __flThick(x, z, nx, nz) {
  for (let s = 0.25; s < 6; s += 0.25) if (__flD(x + nx * s, z + nz * s) < 0) return s;
  return 6;
}
// The edges of open ground: closed loops traced through the distance field (marching squares on its 25 cm
// grid), resampled every 33 cm
function __flContours() {
  const { all, N } = __flField(),
    C = __FL.C,
    V = (i, j) => all[j * N + i],
    segs = [],
    at = new Map(),
    put = (e, k) => (at.has(e) ? at.get(e).push(k) : at.set(e, [k]));
  for (let j = 0; j < N - 1; j++)
    for (let i = 0; i < N - 1; i++) {
      const code = (V(i, j) > 0) | ((V(i + 1, j) > 0) << 1) | ((V(i + 1, j + 1) > 0) << 2) | ((V(i, j + 1) > 0) << 3);
      if (!code || code === 15) continue;
      const e0 = (j * N + i) * 2,
        e1 = (j * N + i + 1) * 2 + 1,
        e2 = ((j + 1) * N + i) * 2,
        e3 = (j * N + i) * 2 + 1,
        mid = V(i, j) + V(i + 1, j) + V(i + 1, j + 1) + V(i, j + 1) > 0,
        T = {
          1: [[e3, e0]], 2: [[e0, e1]], 3: [[e3, e1]], 4: [[e1, e2]], 5: mid ? [[e0, e1], [e2, e3]] : [[e3, e0], [e1, e2]], 6: [[e0, e2]], 7: [[e3, e2]],
          8: [[e2, e3]], 9: [[e0, e2]], 10: mid ? [[e3, e0], [e1, e2]] : [[e0, e1], [e2, e3]], 11: [[e1, e2]], 12: [[e1, e3]], 13: [[e0, e1]], 14: [[e3, e0]],
        }[code];
      for (const [a, b] of T) {
        const k = segs.length;
        segs.push([a, b]);
        put(a, k);
        put(b, k);
      }
    }
  // where the edge crosses a grid edge
  const pos = (e) => {
    const q = e >> 1,
      i = q % N,
      j = Math.floor(q / N),
      [i1, j1] = e & 1 ? [i, j + 1] : [i + 1, j],
      a = V(i, j),
      b = V(i1, j1),
      t = a / (a - b);
    return [(i + (i1 - i) * t) * C, (j + (j1 - j) * t) * C];
  };
  const seen = new Uint8Array(segs.length),
    loops = [];
  for (let k0 = 0; k0 < segs.length; k0++) {
    if (seen[k0]) continue;
    const pts = [];
    let k = k0,
      e = segs[k0][0];
    while (k !== void 0 && !seen[k]) {
      seen[k] = 1;
      pts.push(pos(e));
      e = segs[k][0] === e ? segs[k][1] : segs[k][0];
      k = (at.get(e) || []).find((q) => !seen[q]);
    }
    if (pts.length < 6) continue;
    // resample by arc length
    const out = [];
    let carry = 0;
    pts.push(pts[0]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i],
        [bx, bz] = pts[i + 1],
        l = Math.hypot(bx - ax, bz - az);
      for (let s = carry; s < l; s += 0.33) out.push([ax + ((bx - ax) * s) / l, az + ((bz - az) * s) / l]);
      carry = (((carry - l) % 0.33) + 0.33) % 0.33 || 0;
    }
    out.length > 4 && loops.push(out);
  }
  return loops;
}
// the cliff-top height of a lane face: rising and dipping round the plateau height (a broken skyline)
const __flFaceTop = (x, z) => __flTop(x, z) + 1.8 * (__flN3(x * 0.3, 1.3, z * 0.3) - 0.4) + 0.5 * (__flNoise(x * 1.3, z * 1.3) - 0.5);
function __flCliffs(root, laneMat) {
  const loops = __flContours(),
    KINDS = ['rock', 'cave-rock', 'ice', 'wood'],
    chunks = new Map(),
    icicles = [];
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const L of loops) {
    // columns: [x, z, dx, dz (into the rock), t, kind index, cavern]
    const cols = L.map(([x, z]) => {
      const [gx, gz] = __flGrad(x, z),
        cave = __flCaveAt(x - gx * 0.6, z - gz * 0.6, 0.05),
        k = cave ? KINDS.indexOf(cave.kind === 'rock' ? 'cave-rock' : cave.kind) : 0;
      return [x, z, gx, gz, __flThick(x, z, gx, gz), k, cave];
    });
    cols.push(cols[0]);
    // runs by 32 m tile and kind (the boundary column shared, so no gap between chunks)
    let key = null,
      run = null;
    for (const c of cols) {
      const k = (Math.floor(c[0] / 32) * 8 + Math.floor(c[1] / 32)) * 4 + c[5];
      if (k !== key) {
        run && run.push(c);
        run = [];
        chunks.has(k) || chunks.set(k, []);
        chunks.get(k).push(run);
        key = k;
      }
      run.push(c);
    }
  }
  const mats = [laneMat, laneMat, __flGlacier(), __flOwn(__flMat('weathered_plank_siding', 1.1, 2, 2, 3, '#e8d2b8', 0, 1.35))];
  for (const [key, runs] of chunks) {
    const kind = key % 4,
      P = [],
      I = [];
    for (const run of runs) {
      if (run.length < 2) continue;
      const cave = kind > 0,
        // (a run's first column may be shared with the run before, of another kind: use the run's cavern)
        runCave = cave ? (run.find((q) => q[6]) || [])[6] : null,
        R = cave ? 12 : 26,
        rows = cave ? R + 1 : R + 5,
        base = P.length / 3;
      for (const c of run) {
        const [x, zz, dx, dz, t, , cv] = c,
          k = KINDS[kind] === 'cave-rock' ? 'rock' : KINDS[kind],
          top = cave ? (cv || runCave).spring + 0.4 : __flFaceTop(x, zz),
          L = Math.max(0.5, Math.min(2.4, t / 2 + 0.05));
        let dTop = 0;
        for (let j = 0; j <= R; j++) {
          const y = -0.5 + (top + 0.5) * Math.pow(j / R, cave ? 1 : 1.3),
            d = __flRockDepth(x, y, zz, t, k);
          j === R && (dTop = d);
          P.push(x + dx * d, y, zz + dz * d);
        }
        if (cave) continue;
        // the cornice: a lip of snow curling over the edge, then back into the cliff top
        for (const [dy, dd] of [[0.22, Math.max(0.02, dTop - 0.12)], [0.42, dTop + 0.25], [0.38, dTop + 0.25 + (L - dTop - 0.25) * 0.6], [-0.25, Math.max(L + 0.1, dTop + 0.4)]]) P.push(x + dx * dd, top + dy, zz + dz * dd);
        rnd() < 0.09 && icicles.push([x + dx * (dTop - 0.05), top + 0.2, zz + dz * (dTop - 0.05), 0.25 + rnd() * 1.1, 0.03 + rnd() * 0.05]);
      }
      // the loops run either way round: wind the run's quads to face the open ground (a quad a-b-a1 faces
      // (-tz, tx) for a run heading (tx, tz); that must point away from the rock)
      const flip = -(run[1][1] - run[0][1]) * run[0][2] + (run[1][0] - run[0][0]) * run[0][3] > 0;
      for (let c = 0; c < run.length - 1; c++)
        for (let j = 0; j < rows - 1; j++) {
          const a = base + c * rows + j,
            b = base + (c + 1) * rows + j;
          flip ? I.push(a, a + 1, b, b, a + 1, b + 1) : I.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }
    if (!I.length) continue;
    const geo = new uw();
    geo.setAttribute('position', new gi(new Float32Array(P), 3));
    geo.setIndex(P.length / 3 > 65535 ? new gi(new Uint32Array(I), 1) : new gi(new Uint16Array(I), 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    // (no shadow casting: the terrain's low-detail shadow copy in 61-frostline.js casts the cliffs' shadows)
    __flMesh(root, geo, mats[kind], 'frost_cliff', !1);
  }
  __flIcicles(root, Zw.getState().quality === 'low' ? icicles.filter((_, i) => i % 2) : icicles);
}
// opaque glacier ice: the cavern and tunnel walls and vaults (glowing faintly blue, as light through ice)
function __flGlacier() {
  const m = __flIce(1);
  m.transparent = !1;
  m.color.set('#8cc6df');
  m.emissive.set('#1b5a7c');
  m.emissiveIntensity = 0.55;
  m.roughness = 0.1;
  return __flOwn(m);
}
// a bullet hole on a cliff or cavern wall: moved from the collision box onto the drawn face
function __flRockSurface(p, n) {
  if (Math.abs(n.y) > 0.5) return null;
  const d = __flD(p.x, p.z);
  if (d < -0.3 || d > 0.6) return null;
  const [gx, gz] = __flGrad(p.x, p.z);
  if (gx * n.x + gz * n.z > -0.3) return null; // the face must look the way the box face does
  const ex = p.x - gx * d,
    ez = p.z - gz * d,
    cave = __flCaveAt(ex - gx * 0.6, ez - gz * 0.6, 0.05);
  if (cave ? p.y > cave.spring + 0.3 : p.y > __flFaceTop(ex, ez)) return null;
  const m = __flRockDepth(ex, p.y, ez, __flThick(ex, ez, gx, gz), cave ? cave.kind : 'rock') - d;
  return { p: { x: p.x + gx * m, y: p.y, z: p.z + gz * m }, n: { x: -gx, y: 0, z: -gz }, box: null };
}
{
  const prev = __impSurface;
  __impSurface = function (p, n) {
    if (__FL.ready && aw().__frost) {
      const r = __flRockSurface(p, n);
      if (r) return r;
    }
    return prev.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- icicles
function __flIcicleMat() {
  return __FL.icicleMat || (__FL.icicleMat = new Gw({ color: '#d8eef8', roughness: 0.08, metalness: 0, transparent: !0, opacity: 0.86, envMapIntensity: 2, emissive: '#3a6a84', emissiveIntensity: 0.25 }));
}
// list: [x, y (top), z, length, radius]
function __flIcicles(root, list) {
  if (!list.length) return;
  const geo = new Oc(1, 1, 7, 3);
  geo.rotateX(Math.PI); // point down
  geo.translate(0, -0.5, 0); // hang from the origin
  // a little irregular: thicker rings near the top
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = -p.getY(i);
    p.setX(i, p.getX(i) * (1 + 0.25 * Math.sin(y * 19)));
    p.setZ(i, p.getZ(i) * (1 + 0.25 * Math.sin(y * 19)));
  }
  geo.computeVertexNormals();
  const im = new QZ(geo, __flIcicleMat(), list.length),
    M = new _A(),
    Q = new Kw();
  list.forEach(([x, y, z, len, r], k) => im.setMatrixAt(k, M.compose(new U(x, y, z), Q.set(0, 0, 0, 1), new U(r, len, r))));
  im.instanceMatrix.needsUpdate = !0;
  im.computeBoundingSphere();
  im.name = 'frost_icicles';
  im.receiveShadow = !1;
  root.add(im);
}
// ---------------------------------------------------------------- crates, built board by board
function __flCrates(root, list) {
  if (!list.length) return;
  const B = __flMB(),
    S = __flMB(),
    box = __flUnit('box');
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [x0, y0, z0, x1, y1, z1] of list) {
    const w = x1 - x0,
      h = y1 - y0,
      d = z1 - z0,
      cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2,
      F = 0.09, // frame width
      T = 0.035, // frame stands proud of the boards by this
      bt = 0.024, // board thickness
      tone = 0.85 + rnd() * 0.25,
      bx = (X, Y, Z, sx, sy, sz, c = 1, ry = 0, rx = 0, rz = 0) => B.add(box, __flM(X, Y, Z, sx, sy, sz, ry, rx, rz), c * tone);
    // the dark inside (seen through the gaps between boards)
    bx(cx, y0 + h / 2, cz, w - 0.1, h - 0.02, d - 0.1, 0.28);
    // side boards (horizontal), between the corner posts
    const nb = Math.max(3, Math.round(h / 0.19)),
      bh = (h - 0.02) / nb;
    for (let k = 0; k < nb; k++) {
      const y = y0 + 0.01 + bh * (k + 0.5),
        c = () => 0.78 + rnd() * 0.3;
      bx(cx, y, z0 + T + bt / 2, w - 2 * F + 0.02, bh - 0.014, bt, c());
      bx(cx, y, z1 - T - bt / 2, w - 2 * F + 0.02, bh - 0.014, bt, c());
      bx(x0 + T + bt / 2, y, cz, bt, bh - 0.014, d - 2 * F + 0.02, c());
      bx(x1 - T - bt / 2, y, cz, bt, bh - 0.014, d - 2 * F + 0.02, c());
    }
    // lid boards (along x)
    const nl = Math.max(3, Math.round(d / 0.19)),
      lw = (d - 0.02) / nl;
    for (let k = 0; k < nl; k++) bx(cx, y1 - T - bt / 2, z0 + 0.01 + lw * (k + 0.5), w - 0.04, bt, lw - 0.012, 0.78 + rnd() * 0.3);
    // frame: corner posts, rails round the bottom and top of each side, a rim round the lid
    for (const [px, pz] of [[x0 + F / 2, z0 + F / 2], [x1 - F / 2, z0 + F / 2], [x0 + F / 2, z1 - F / 2], [x1 - F / 2, z1 - F / 2]]) bx(px, y0 + h / 2, pz, F, h, F, 0.82);
    for (const y of [y0 + F / 2, y1 - F / 2]) {
      bx(cx, y, z0 + T / 2, w - 2 * F, F, T, 0.86);
      bx(cx, y, z1 - T / 2, w - 2 * F, F, T, 0.86);
      bx(x0 + T / 2, y, cz, T, F, d - 2 * F, 0.86);
      bx(x1 - T / 2, y, cz, T, F, d - 2 * F, 0.86);
    }
    bx(cx, y1 - T / 2, z0 + F / 2, w, T, F, 0.84);
    bx(cx, y1 - T / 2, z1 - F / 2, w, T, F, 0.84);
    bx(x0 + F / 2, y1 - T / 2, cz, F, T, d - 2 * F, 0.84);
    bx(x1 - F / 2, y1 - T / 2, cz, F, T, d - 2 * F, 0.84);
    // a diagonal brace across each side
    const ih = h - 2 * F;
    for (const [sx, sz, len, ry] of [[cx, z0 + T / 2, w - 2 * F, 0], [cx, z1 - T / 2, w - 2 * F, 0], [x0 + T / 2, cz, d - 2 * F, Math.PI / 2], [x1 - T / 2, cz, d - 2 * F, Math.PI / 2]]) {
      const a = Math.atan2(ih, len);
      bx(sx, y0 + h / 2, sz, Math.hypot(len, ih) - 0.06, F * 0.85, T * 0.9, 0.8, ry, 0, a);
    }
    // snow on the lid (unless another crate sits on it)
    const covered = list.some((o) => Math.abs(o[1] - y1) < 0.05 && o[0] < x1 && o[3] > x0 && o[2] < z1 && o[5] > z0);
    covered || __flSnowCushion(S, x0 + 0.02, z0 + 0.02, x1 - 0.02, z1 - 0.02, y1, 0.09);
  }
  const mat = __flOwn(__flMat('brown_planks_05', 1.2, 2, 0.75, 0.9, '#c9b8a6'));
  mat.vertexColors = !0;
  __flMesh(root, B.build(), mat, 'frost_crates');
  S.count && __flMesh(root, S.build(), __flSnowMat(), 'frost_crate_snow', !1);
}
// a cushion of snow on a flat top: domed, thickest in the middle, lumpy, with soft rounded edges
function __flSnowCushion(B, x0, z0, x1, z1, y, th) {
  const nx = Math.max(4, Math.round((x1 - x0) / 0.12)),
    nz = Math.max(4, Math.round((z1 - z0) / 0.12)),
    geo = new bB(1, 1, nx, nz),
    p = geo.attributes.position;
  geo.rotateX(-Math.PI / 2);
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5,
      v = p.getZ(i) + 0.5,
      x = x0 + u * (x1 - x0),
      z = z0 + v * (z1 - z0),
      e = Math.min(u, 1 - u, v, 1 - v) * Math.min(x1 - x0, z1 - z0), // distance to the edge (m)
      dome = Math.sqrt(Math.min(1, e / 0.12));
    p.setXYZ(i, x, y - 0.01 + th * dome * (0.75 + 0.5 * __flNoise(x * 3.1, z * 3.1)), z);
  }
  geo.computeVertexNormals();
  B.add(geo, new _A(), 1);
  geo.dispose();
}
// ---------------------------------------------------------------- the timber deck on A
function __flDeck(root, list) {
  if (!list.length) return;
  const B = __flMB(),
    box = __flUnit('box');
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [x0, y0, z0, x1, y1, z1] of list) {
    const bx = (X, Y, Z, sx, sy, sz, c = 1) => B.add(box, __flM(X, Y, Z, sx, sy, sz), c);
    // planks (along x, gaps between), a fascia round the edge, joists and posts underneath (the deck is solid
    // to the ground in the game, so the space under it is filled with dark lattice skirting)
    const n = Math.round((z1 - z0) / 0.16);
    for (let k = 0; k < n; k++) bx((x0 + x1) / 2, y1 - 0.03, z0 + (k + 0.5) * ((z1 - z0) / n), x1 - x0 - 0.02, 0.06, (z1 - z0) / n - 0.012, 0.75 + rnd() * 0.35);
    bx((x0 + x1) / 2, y1 - 0.2, (z0 + z1) / 2, x1 - x0 - 0.06, 0.32, z1 - z0 - 0.06, 0.3);
    for (const [a, b, c, d] of [[x0, z0, x1, z0 + 0.05], [x0, z1 - 0.05, x1, z1], [x0, z0, x0 + 0.05, z1], [x1 - 0.05, z0, x1, z1]]) bx((a + c) / 2, y1 - 0.16, (b + d) / 2, c - a, 0.26, d - b, 0.7);
    // skirting: vertical boards with gaps, posts at the corners and every ~2 m
    const sk = (len, f) => {
      const m = Math.round(len / 0.14);
      for (let k = 0; k < m; k++) f((k + 0.5) * (len / m), len / m - 0.03);
    };
    const hh = y1 - 0.3 - y0;
    sk(x1 - x0, (s, wd) => (bx(x0 + s, y0 + hh / 2, z0 + 0.04, wd, hh, 0.025, 0.6 + rnd() * 0.25), bx(x0 + s, y0 + hh / 2, z1 - 0.04, wd, hh, 0.025, 0.6 + rnd() * 0.25)));
    sk(z1 - z0, (s, wd) => (bx(x0 + 0.04, y0 + hh / 2, z0 + s, 0.025, hh, wd, 0.6 + rnd() * 0.25), bx(x1 - 0.04, y0 + hh / 2, z0 + s, 0.025, hh, wd, 0.6 + rnd() * 0.25)));
    bx((x0 + x1) / 2, y0 + hh / 2, (z0 + z1) / 2, x1 - x0 - 0.12, hh, z1 - z0 - 0.12, 0.18);
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.round((x1 - x0) / 2))
      for (const zz of [z0, z1]) bx(Math.min(x1 - 0.08, Math.max(x0 + 0.08, x)), y0 + (y1 - y0) / 2, Math.min(z1 - 0.08, Math.max(z0 + 0.08, zz)), 0.16, y1 - y0, 0.16, 0.65);
    // railing on the west and north sides (against the cliff it is a low guard; the open sides stay open)
  }
  const mat = __flOwn(__flMat('brown_planks_05', 1.6, 2, 0.8, 0.95));
  mat.vertexColors = !0;
  __flMesh(root, B.build(), mat, 'frost_deck');
}
// ---------------------------------------------------------------- shipping containers
function __flContainers(root, list) {
  if (!list.length) return;
  const tints = ['#b8402e', '#4a7cb4', '#5a9a50', '#c98a3a'],
    box = __flUnit('box'),
    cyl = __flUnit('cyl6'),
    S = __flMB();
  list.forEach(([x0, y0, z0, x1, y1, z1], ci) => {
    const B = __flMB(),
      alongX = x1 - x0 >= z1 - z0,
      // work in the container's own frame: length along a, width along b
      L = alongX ? x1 - x0 : z1 - z0,
      Wd = alongX ? z1 - z0 : x1 - x0,
      H = y1 - y0,
      cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2,
      ry = alongX ? 0 : Math.PI / 2,
      // local (a: along, b: across) -> world
      W2 = (a, y, b) => (alongX ? [cx + a, y, cz + b] : [cx + b, y, cz - a]),
      bx = (a, y, b, sa, sy, sb, c = 1) => {
        const [X, Y, Z] = W2(a, y, b);
        B.add(box, __flM(X, Y, Z, sa, sy, sb, ry), c);
      },
      P = 0.035, // corrugation depth
      post = 0.16;
    // corrugated walls: trapezoid profile, 0.28 m pitch, between the bottom and top rails
    const yA = y0 + 0.14,
      yB = y1 - 0.12,
      prof = [0, 0.08, 0.14, 0.22, 0.28], // outer flat, ramp in, inner flat, ramp out
      depthAt = [0, 0, 1, 1, 0];
    const wall = (len, place) => {
      const n = Math.floor(len / 0.28);
      let s0 = -len / 2 + (len - n * 0.28) / 2;
      for (let k = 0; k < n; k++)
        for (let q = 0; q < 4; q++) {
          const sa = s0 + k * 0.28 + prof[q],
            sb = s0 + k * 0.28 + prof[q + 1];
          place(sa, sb, depthAt[q] * P, depthAt[q + 1] * P);
        }
      // the strips left at the ends
      place(-len / 2, s0, 0, 0);
      place(s0 + n * 0.28, len / 2, 0, 0);
    };
    // long sides (b = +/- Wd/2): faces point out along +/-b
    for (const side of [1, -1]) {
      const b0 = (side * Wd) / 2;
      wall(L - 2 * post, (sa, sb, da, db) => {
        const A1 = W2(sa, yA, b0 - side * da),
          A2 = W2(sb, yA, b0 - side * db),
          A3 = W2(sb, yB, b0 - side * db),
          A4 = W2(sa, yB, b0 - side * da);
        side > 0 ? B.quad(A1, A2, A3, A4, 0.95) : B.quad(A2, A1, A4, A3, 0.95);
      });
    }
    // the closed end (a = -L/2): corrugated too
    {
      const a0 = -L / 2;
      wall(Wd - 2 * post, (sa, sb, da, db) => B.quad(W2(a0 + da, yA, sa), W2(a0 + db, yA, sb), W2(a0 + db, yB, sb), W2(a0 + da, yB, sa), 0.95));
    }
    // the door end (a = +L/2): two leaves, vertical locking bars with handles and cam keepers, hinges
    {
      const a0 = L / 2 - 0.03;
      bx(a0, (yA + yB) / 2, -Wd / 4 + 0.005, 0.04, yB - yA, Wd / 2 - post - 0.01, 0.9);
      bx(a0, (yA + yB) / 2, Wd / 4 - 0.005, 0.04, yB - yA, Wd / 2 - post - 0.01, 0.9);
      for (const b of [-Wd * 0.38, -Wd * 0.14, Wd * 0.14, Wd * 0.38]) {
        const [X, , Z] = W2(a0 + 0.045, 0, b);
        B.add(cyl, __flM(X, (yA + yB) / 2, Z, 0.018, yB - yA - 0.05, 0.018), 0.55);
        bx(a0 + 0.06, y0 + H * 0.45, b + 0.07, 0.03, 0.04, 0.16, 0.5); // handle
        bx(a0 + 0.05, yA + 0.06, b, 0.05, 0.07, 0.07, 0.5); // cam keepers
        bx(a0 + 0.05, yB - 0.06, b, 0.05, 0.07, 0.07, 0.5);
      }
      for (const b of [-Wd / 2 + post + 0.03, Wd / 2 - post - 0.03]) for (const y of [y0 + H * 0.2, y0 + H * 0.5, y0 + H * 0.8]) bx(a0 + 0.03, y, b, 0.06, 0.12, 0.05, 0.6);
    }
    // roof panel, slightly below the top rails
    bx(0, y1 - 0.05, 0, L - 0.1, 0.05, Wd - 0.1, 0.9);
    // frame: corner posts, top and bottom rails on all sides, corner castings
    for (const a of [-L / 2 + post / 2, L / 2 - post / 2]) for (const b of [-Wd / 2 + post / 2, Wd / 2 - post / 2]) bx(a, y0 + H / 2, b, post, H, post, 0.8);
    for (const b of [-Wd / 2 + 0.05, Wd / 2 - 0.05]) bx(0, y0 + 0.07, b, L - 2 * post, 0.14, 0.1, 0.75), bx(0, y1 - 0.06, b, L - 2 * post, 0.12, 0.1, 0.8);
    for (const a of [-L / 2 + 0.05, L / 2 - 0.05]) bx(a, y0 + 0.07, 0, 0.1, 0.14, Wd - 2 * post, 0.75), bx(a, y1 - 0.08, 0, 0.1, 0.16, Wd - 2 * post, 0.8);
    for (const a of [-L / 2 + 0.09, L / 2 - 0.09]) for (const b of [-Wd / 2 + 0.09, Wd / 2 - 0.09]) for (const y of [y0 + 0.07, y1 - 0.07]) bx(a, y, b, 0.18, 0.14, 0.18, 0.55);
    const m = __flOwn(__flMat('blue_metal_plate', 2.2, 2, 0.8, 0.92, tints[ci % tints.length], 1, 2.6));
    m.vertexColors = !0;
    __flMesh(root, B.build(), m, 'frost_container');
    __flSnowCushion(S, x0 + 0.06, z0 + 0.06, x1 - 0.06, z1 - 0.06, y1 - 0.02, 0.14);
  });
  S.count && __flMesh(root, S.build(), __flSnowMat(), 'frost_container_snow', !1);
}
// ---------------------------------------------------------------- snowbanks
// A snowbank the shape of its collision box (what you see is what you hit): full height across the top,
// rounded over at the edges, lumpy, with a small foot of snow round the base
function __flSnowbanks(root, list) {
  if (!list.length) return;
  const B = __flMB(),
    ap = 0.18;
  for (const [x0, y0, z0, x1, y1, z1] of list) {
    const X0 = x0 - ap,
      Z0 = z0 - ap,
      X1 = x1 + ap,
      Z1 = z1 + ap,
      geo = new bB(1, 1, Math.round((X1 - X0) / 0.06), Math.round((Z1 - Z0) / 0.06)),
      p = geo.attributes.position,
      H = y1 - y0;
    geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < p.count; i++) {
      const x = X0 + (p.getX(i) + 0.5) * (X1 - X0),
        z = Z0 + (p.getZ(i) + 0.5) * (Z1 - Z0),
        ex = Math.max(x0 - x, x - x1),
        ez = Math.max(z0 - z, z - z1),
        sd = ex > 0 || ez > 0 ? Math.hypot(Math.max(ex, 0), Math.max(ez, 0)) : Math.max(ex, ez),
        lump = 0.12 * (__flNoise(x * 1.7, z * 1.7) - 0.5) + 0.04 * (__flNoise(x * 6 + 3, z * 6) - 0.5);
      let y;
      if (sd <= 0) {
        const r = Math.min(1, -sd / 0.22);
        y = y0 + H * (0.84 + 0.16 * Math.sqrt(r * (2 - r))) + lump * r;
      } else {
        // the sides bulge and slump unevenly (the foot reaches 6-22 cm out)
        const a2 = ap * (0.4 + 1.2 * __flNoise(x * 1.3 + 7, z * 1.3));
        y = sd >= a2 ? 0 : y0 + H * 0.84 * Math.pow(1 - sd / a2, 0.55) + lump * (1 - sd / a2);
      }
      p.setXYZ(i, x, Math.max(0.01, y), z);
    }
    geo.computeVertexNormals();
    B.add(geo, new _A(), 1);
    geo.dispose();
  }
  __flMesh(root, B.build(), __flSnowMat(), 'frost_snowbanks');
}
// ---------------------------------------------------------------- ice
// An ice block: a box subdivided about every half metre, its faces bulging out by noise (amp); `along`
// may move each point first (to fit the block to the rock and the vault)
function __flIceBlock(x0, y0, z0, x1, y1, z1, amp, along) {
  const sx = x1 - x0,
    sy = y1 - y0,
    sz = z1 - z0,
    seg = (v) => Math.max(1, Math.min(40, Math.round(v / 0.3))),
    geo = new _i(sx, sy, sz, seg(sx), seg(sy), seg(sz)),
    p = geo.attributes.position,
    n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) + (x0 + x1) / 2,
      y = p.getY(i) + (y0 + y1) / 2,
      z = p.getZ(i) + (z0 + z1) / 2;
    along && ([x, y, z] = along(x, y, z));
    const o = amp * (0.7 * __flN3(x * 1.3, y * 1.3, z * 1.3) + 0.3 * __flN3(x * 4.7, y * 4.7, z * 4.7));
    p.setXYZ(i, x + n.getX(i) * o, y + n.getY(i) * o, z + n.getZ(i) * o);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}
// The ice sealing a portal: a chunky block filling the arch exactly: up to the vault, and sideways into the
// rock as far as the face has stepped back at each height
function __flIceWallGeo(b) {
  const p = b.__portal,
    c = __FL_L.caves[b.__cave],
    kind = c.kind,
    // the wall positions along the portal (where the open ground ends, at the ice's line)
    ox = -p.nx * 0.45,
    oz = -p.nz * 0.45,
    sAt = (x, z) => (x - p.ax) * p.tx + (z - p.az) * p.tz,
    wall = (s, dir) => {
      while (Math.abs(s) < 20 && __flD(p.ax + p.tx * s + ox, p.az + p.tz * s + oz) < 0) s += dir * 0.05;
      return s;
    },
    L = p.s1 - p.s0,
    wa = wall(0, -1),
    wb = wall(L, 1),
    back = (s, y) => {
      const x = p.ax + p.tx * s + ox,
        z = p.az + p.tz * s + oz,
        [gx, gz] = __flGrad(x, z);
      return __flRockDepth(x, Math.max(0, y), z, __flThick(x, z, gx, gz), kind) + 0.06;
    },
    along = (x, y, z) => {
      let s = sAt(x, z);
      s < wa ? (s = Math.max(s, wa - back(wa, y))) : s > wb && (s = Math.min(s, wb + back(wb, y)));
      const t = (x - p.ax) * p.nx + (z - p.az) * p.nz,
        X = p.ax + p.tx * s + p.nx * t,
        Z = p.az + p.tz * s + p.nz * t;
      return [X, Math.min(y, __flCeil(c, X, Z) - 0.03), Z];
    },
    e = 1.4;
  return __flIceBlock(b.min.x - e * Math.abs(p.tx), -0.2, b.min.z - e * Math.abs(p.tz), b.max.x + e * Math.abs(p.tx), b.max.y + 0.6, b.max.z + e * Math.abs(p.tz), 0.08, along);
}
// ---------------------------------------------------------------- the caverns
// Each cavern: its vault (glacier ice, rock or timber), its floor (snow, planks or polished ice), icicles,
// and an arched portal wherever its outline opens onto a lane
function __flCaves(root, rockMat) {
  const L = __FL_L,
    icicles = [];
  let seed = 41;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
    stone = __flMB(),
    iceStone = __flMB(),
    facades = __flMB(),
    inIce = __flMB(); // the inner faces of the ice caverns' portals
  for (const id in L.caves) {
    const c = L.caves[id],
      xs = c.poly.map((q) => q[0]),
      zs = c.poly.map((q) => q[1]),
      x0 = Math.min(...xs),
      z0 = Math.min(...zs),
      x1 = Math.max(...xs),
      z1 = Math.max(...zs);
    // the vault: a height field facing down, bumpy (scalloped ice, rough rock) or smooth (timber)
    {
      const st = 0.33,
        nx = Math.ceil((x1 - x0) / st) + 1,
        nz = Math.ceil((z1 - z0) / st) + 1,
        P = new Float32Array(nx * nz * 3),
        ok = new Uint8Array(nx * nz),
        I = [];
      for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
          const x = x0 + i * st,
            z = z0 + j * st,
            k = j * nx + i,
            d = __flD(x, z);
          ok[k] = __flPolyDepth(c.poly, x, z) > 0.05 && d < 1.2;
          const bump = c.kind === 'wood' ? 0 : c.kind === 'ice' ? 0.16 * (Math.abs(__flN3(x * 1.1, 2, z * 1.1) * 2 - 1) - 0.5) : 0.22 * (__flN3(x * 0.9, 5, z * 0.9) - 0.5);
          P.set([x, __flCeil(c, x, z) + bump, z], k * 3);
        }
      for (let j = 0; j < nz - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          const a = j * nx + i,
            b = a + 1,
            cc = a + nx,
            dd = cc + 1;
          ok[a] && ok[b] && ok[cc] && ok[dd] && I.push(a, b, cc, b, dd, cc);
        }
      const geo = new uw();
      geo.setAttribute('position', new gi(P, 3));
      geo.setIndex(nx * nz > 65535 ? new gi(new Uint32Array(I), 1) : new gi(new Uint16Array(I), 1));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const mat = c.kind === 'ice' ? __flGlacier() : c.kind === 'wood' ? __flOwn(__flMat('roof_planks', 1.3, 2, 2, 3, '#c49a70', 0.35, 1.3)) : rockMat;
      __flMesh(root, geo, mat, 'frost_vault', !0);
      // icicles from the ice and rock vaults
      if (c.kind !== 'wood')
        for (let k = 0; k < (x1 - x0) * (z1 - z0) * 0.35; k++) {
          const x = x0 + rnd() * (x1 - x0),
            z = z0 + rnd() * (z1 - z0);
          __flPolyDepth(c.poly, x, z) > 0.5 && __flD(x, z) < -0.3 && icicles.push([x, __flCeil(c, x, z) + 0.05, z, 0.1 + rnd() * rnd() * 0.9, 0.02 + rnd() * 0.04]);
        }
    }
    // the floor: exactly the snowfield's quads that 61-frostline.js leaves out under this vault (same grid)
    {
      const st = 0.5,
        fx0 = Math.floor(x0 / st) * st - st,
        fz0 = Math.floor(z0 / st) * st - st,
        nx = Math.ceil((x1 - fx0) / st) + 2,
        nz = Math.ceil((z1 - fz0) / st) + 2,
        P = new Float32Array(nx * nz * 3),
        ok = new Uint8Array(nx * nz),
        I = [];
      for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
          const x = fx0 + i * st,
            z = fz0 + j * st,
            k = j * nx + i,
            d = __flD(x, z);
          ok[k] = 1;
          P.set([x, c.floor === 'snow' ? Math.max(0, 0.35 * (1 + d / 1.6)) + 0.02 * __flNoise(x * 0.7, z * 0.7) : 0.025, z], k * 3);
        }
      for (let j = 0; j < nz - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          const a = j * nx + i,
            b = a + 1,
            cc = a + nx,
            dd = cc + 1;
          __flUnderVault(fx0 + (i + 0.5) * st, fz0 + (j + 0.5) * st) && __flCaveAt(fx0 + (i + 0.5) * st, fz0 + (j + 0.5) * st, -0.1) === c && I.push(a, cc, b, b, cc, dd);
        }
      const geo = new uw();
      geo.setAttribute('position', new gi(P, 3));
      geo.setIndex(I);
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const mat =
        c.floor === 'wood'
          ? __flOwn(__flMat('brown_planks_05', 1.6, 2, 2, 3, '#d8b898'))
          : c.floor === 'ice'
            ? __FL.iceFloor || (__FL.iceFloor = new Gw({ color: '#6fa9c9', roughness: 0.03, metalness: 0.1, envMapIntensity: 2.6, emissive: '#0d3550', emissiveIntensity: 0.35 }))
            : rockMat;
      __flMesh(root, geo, mat, 'frost_cavefloor', !1);
    }
    // portals
    for (const p of __flPortals(c)) __flPortal(c, p, facades, c.kind === 'ice' ? iceStone : stone, rnd, c.kind === 'ice' ? inIce : facades);
  }
  facades.count && __flMesh(root, facades.build(), rockMat, 'frost_portals', !0);
  stone.count && __flMesh(root, stone.build(), __flStoneMat(), 'frost_portalstone');
  iceStone.count && __flMesh(root, iceStone.build(), __flGlacier(), 'frost_portalice');
  inIce.count && __flMesh(root, inIce.build(), __flGlacier(), 'frost_portalinner');
  __flIcicles(root, icicles);
}
const __flStoneMat = () => {
  const m = __flOwn(__flMat('rustic_stone_wall', 0.9, 2, 0.7, 0.88, '#d8d4cc', 0.35, 1.15));
  m.vertexColors = !0;
  return m;
};
// A portal: the rock face above and beside an opening, its arch following the vault exactly, and a ring of
// dressed stones (ice blocks on the ice caverns) round the arch, quoins up the sides and a keystone
function __flPortal(c, p, F, S, rnd, Fin) {
  const ext = 2.6,
    T = 1.0,
    sa = -ext,
    sb = p.s1 - p.s0 + ext,
    pts = [];
  for (let s = sa; s <= sb + 1e-6; s += 0.2) {
    const s2 = Math.max(-p.s0, Math.min(p.len - p.s0, s)), // stay on the edge
      x = p.ax + p.tx * s2,
      z = p.az + p.tz * s2,
      open = __flD(x - p.nx * 0.3, z - p.nz * 0.3) < 0;
    pts.push({ s: s2, x, z, bot: open ? __flCeil(c, x - p.nx * 0.3, z - p.nz * 0.3) : -0.6, top: __flTop(x, z) + 0.6 + 0.4 * __flNoise(x * 0.9, z * 0.9), open, back: open ? void 0 : -0.06 });
  }
  __flWall(F, pts, p.nx, p.nz, 0.02, -T, (x, y, z) => 0.1 * (__flN3(x * 0.8, y * 0.8, z * 0.8) - 0.5), Fin);
  __flRing(S, pts, p.nx, p.nz, 0.02, T + 0.1, rnd, c.kind === 'ice');
}
// A wall along a line of samples {x, z, bot, top, open} between offsets f (front) and b (back) along the
// normal: front and back faces, the underside where it spans an opening, and the top. `bump` roughens the
// front face (rock)
function __flWall(B, pts, nx, nz, f, b, bump, Bin = B) {
  const at = (o, i, y, bmp) => {
      const p = pts[i],
        e = bmp ? bump(p.x, y, p.z) : 0;
      // (a sample may set its own back offset: thin where it is buried in rock)
      o === b && p.back !== void 0 && (o = p.back);
      return [p.x + nx * (o + e), y, p.z + nz * (o + e)];
    };
  // which way round the quads face: the front must face +n
  // (from the whole run: samples at its ends may coincide where they are held to an outline's corner)
  const tx = pts[pts.length - 1].x - pts[0].x,
    tz = pts[pts.length - 1].z - pts[0].z,
    flip = -tz * nx + tx * nz < 0;
  const Q = (a, b2, c2, d2, T = B) => (flip ? T.quad(b2, a, d2, c2, 1) : T.quad(a, b2, c2, d2, 1));
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i],
      p1 = pts[i + 1],
      lo0 = p0.bot,
      lo1 = p1.bot;
    // front (in up to four strips, so the bump has something to work with)
    for (let k = 0; k < 4; k++) {
      const y00 = lo0 + ((p0.top - lo0) * k) / 4,
        y01 = lo0 + ((p0.top - lo0) * (k + 1)) / 4,
        y10 = lo1 + ((p1.top - lo1) * k) / 4,
        y11 = lo1 + ((p1.top - lo1) * (k + 1)) / 4;
      Q(at(f, i, y00, 1), at(f, i + 1, y10, 1), at(f, i + 1, y11, 1), at(f, i, y01, 1));
    }
    // back
    Q(at(b, i + 1, lo1), at(b, i, lo0), at(b, i, p0.top), at(b, i + 1, p1.top), Bin);
    // underside over the opening
    p0.open && p1.open && Q(at(b, i, lo0), at(b, i + 1, lo1), at(f, i + 1, lo1, 1), at(f, i, lo0, 1), Bin);
    // top
    Q(at(f, i, p0.top, 1), at(f, i + 1, p1.top, 1), at(b, i + 1, p1.top), at(b, i, p0.top));
  }
}
// dressed stones round an opening: voussoirs every ~0.42 m along the arch (a bigger keystone at the crown),
// quoins up both jambs; `depth` how far they reach back from the front
function __flRing(S, pts, nx, nz, f, depth, rnd, ice) {
  const open = pts.filter((p) => p.open);
  if (open.length < 3) return;
  const box = __flUnit('box'),
    first = open[0],
    last = open[open.length - 1],
    tx = (last.x - first.x) / (Math.hypot(last.x - first.x, last.z - first.z) || 1),
    tz = (last.z - first.z) / (Math.hypot(last.x - first.x, last.z - first.z) || 1),
    sOf = (p) => (p.x - first.x) * tx + (p.z - first.z) * tz,
    W = sOf(last),
    // the arch curve in (s, y), from one springing to the other
    curve = [[-0.05, first.bot - 0.3], ...open.map((p) => [sOf(p), p.bot]), [W + 0.05, last.bot - 0.3]],
    len = [0];
  for (let i = 1; i < curve.length; i++) len.push(len[i - 1] + Math.hypot(curve[i][0] - curve[i - 1][0], curve[i][1] - curve[i - 1][1]));
  const total = len[len.length - 1],
    n = Math.max(5, Math.round(total / 0.42) | 1),
    crown = Math.floor(n / 2),
    col = (k) => (ice ? 1 : 0.78 + rnd() * 0.32),
    put = (s, y, ax, ay, w, h, d, c) => {
      // a block centred at (s, y) in the arch's plane, its width along (ax, ay)
      const X = first.x + tx * s + nx * (f + 0.08 - d / 2),
        Z = first.z + tz * s + nz * (f + 0.08 - d / 2),
        bx = new U(tx * ax, ay, tz * ax).normalize(),
        bz = new U(nx, 0, nz),
        by = new U().crossVectors(bz, bx),
        M = new _A().makeBasis(bx, by, bz).scale(new U(w, h, d));
      M.setPosition(X, y, Z);
      S.add(box, M, c);
    };
  for (let k = 0; k < n; k++) {
    const L0 = ((k + 0.5) / n) * total;
    let i = 1;
    while (i < len.length - 1 && len[i] < L0) i++;
    const t = (L0 - len[i - 1]) / (len[i] - len[i - 1] || 1),
      s = curve[i - 1][0] + (curve[i][0] - curve[i - 1][0]) * t,
      y = curve[i - 1][1] + (curve[i][1] - curve[i - 1][1]) * t,
      ax = curve[i][0] - curve[i - 1][0],
      ay = curve[i][1] - curve[i - 1][1],
      l = Math.hypot(ax, ay) || 1,
      // outward (away from the opening): the curve's normal
      rx = -ay / l,
      ry = ax / l,
      key = k === crown,
      h = key ? 0.78 : 0.56;
    put(s + rx * h * 0.45, y + ry * h * 0.45, ax / l, ay / l, (total / n) * 0.94, h, depth + (key ? 0.12 : 0), col(k));
  }
  // quoins: alternating long and short stones up each jamb to the springing
  for (const [p, side] of [[first, -1], [last, 1]]) {
    const s0 = sOf(p),
      top = p.bot - 0.3;
    for (let y = 0, k = 0; y < top - 0.1; k++) {
      const h = Math.min(0.42, top - y),
        wq = k % 2 ? 0.45 : 0.75;
      put(s0 + side * (wq / 2 - 0.12), y + h / 2, 1, 0, wq, h - 0.03, depth, col(k));
      y += h;
    }
  }
}
// ---------------------------------------------------------------- the stone arches over the chokes
// Each a slab of dressed stone 1.1 m deep spanning the passage and running into the rock either side: a
// round-topped opening (its underside matches the collision), a ring of voussoirs with a keystone on both
// faces, a cornice and snow along the top
function __flArches(root) {
  const B = __flMB(),
    S = __flMB(),
    snow = __flMB();
  let seed = 61;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const a of __FL_L.arches) {
    const o = __flArch(a),
      T = 1.1,
      pts = [];
    for (let s = o.s0 - 2.2; s <= o.s1 + 2.2 + 1e-6; s += 0.2) {
      const x = o.cx + o.tx * s,
        z = o.cz + o.tz * s,
        u = o.under(s);
      pts.push({ x, z, bot: u, top: o.top, open: u > 0 });
    }
    __flWall(B, pts, o.nx, o.nz, T / 2, -T / 2, (x, y, z) => 0.02 * (__flN3(x * 3, y * 3, z * 3) - 0.5));
    // the voussoirs and quoins stand proud of both faces
    __flRing(S, pts, o.nx, o.nz, T / 2, 0.5, rnd, !1);
    __flRing(S, pts, -o.nx, -o.nz, T / 2, 0.5, rnd, !1);
    // a cornice along the top, both sides, and snow on it
    const s0 = o.s0 - 2.2,
      s1 = o.s1 + 2.2,
      mx = o.cx + o.tx * ((s0 + s1) / 2),
      mz = o.cz + o.tz * ((s0 + s1) / 2),
      ry = Math.atan2(-o.tz, o.tx);
    S.add(__flUnit('box'), __flM(mx, o.top - 0.09, mz, s1 - s0, 0.18, T + 0.3, ry), 0.9);
    const loc = __flMB();
    __flSnowCushion(loc, -(s1 - s0) / 2, -(T + 0.3) / 2, (s1 - s0) / 2, (T + 0.3) / 2, 0, 0.14);
    const g = loc.build();
    snow.add(g, new _A().compose(new U(mx, o.top, mz), new Kw().setFromAxisAngle(new U(0, 1, 0), ry), new U(1, 1, 1)), 1);
    g.dispose();
  }
  const mat = __flOwn(__flMat('rustic_stone_wall', 1.1, 2, 0.72, 0.9, '#cfc9bf', 0.4, 1.1));
  __flMesh(root, B.build(), mat, 'frost_arches');
  __flMesh(root, S.build(), __flStoneMat(), 'frost_archstone');
  __flMesh(root, snow.build(), __flSnowMat(), 'frost_archsnow', !1);
}
// ---------------------------------------------------------------- the ice pavilion on B
// A barrel vault of ice over the north-east corner of the site, carried on the rock behind and on a beam
// along three ice columns (base, shaft, capital) on its open side; ribs over each column, snow on top
function __flPavilion(root) {
  const P = __FL_L.pavilion,
    ice = __flMB(),
    shell = __flMB(),
    snow = __flMB(),
    icicles = [];
  let seed = 71;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // columns
  const cyl = new Rw(1, 1, 1, 16, 1);
  for (const [x, z] of P.cols) {
    ice.add(__flUnit('box'), __flM(x, 0.12, z, 0.84, 0.24, 0.84));
    ice.add(cyl, __flM(x, 0.3, z, 0.4, 0.14, 0.4));
    ice.add(cyl, __flM(x, (P.spring - 0.35) / 2, z, 0.3, P.spring - 0.35, 0.3));
    ice.add(cyl, __flM(x, P.spring - 0.55, z, 0.4, 0.14, 0.4));
    ice.add(__flUnit('box'), __flM(x, P.spring - 0.42, z, 0.84, 0.14, 0.84));
  }
  cyl.dispose();
  // the beam along the open side
  ice.add(__flUnit('box'), __flM((P.x0 + P.x1) / 2, P.spring - 0.12, P.cols[0][1], P.x1 - P.x0, 0.45, 0.8));
  // the vault: a shell 0.4 m thick from the rock to the beam
  {
    const nx = Math.ceil((P.x1 - P.x0) / 0.6),
      nz = Math.ceil((P.z1 - P.z0) / 0.25),
      grid = (y0) => {
        const g = new bB(1, 1, nx, nz),
          p = g.attributes.position;
        g.rotateX(-Math.PI / 2);
        for (let i = 0; i < p.count; i++) {
          const x = P.x0 + (p.getX(i) + 0.5) * (P.x1 - P.x0),
            z = P.z0 + (p.getZ(i) + 0.5) * (P.z1 - P.z0);
          p.setXYZ(i, x, __flPavC(z) + y0(x, z), z);
        }
        g.computeVertexNormals();
        return g;
      },
      top = grid(() => 0.4),
      bot = grid((x, z) => 0.05 * (__flN3(x * 1.4, 1, z * 1.4) - 0.5));
    // the underside faces down: flip it
    bot.index.array.reverse();
    bot.computeVertexNormals();
    shell.add(top, new _A());
    shell.add(bot, new _A());
    // the west end: the vault's arch, closed
    for (let z = P.z0; z < P.z1 - 1e-6; z += 0.25) {
      const za = z,
        zb = Math.min(P.z1, z + 0.25);
      shell.quad([P.x0, __flPavC(za), za], [P.x0, __flPavC(zb), zb], [P.x0, __flPavC(zb) + 0.4, zb], [P.x0, __flPavC(za) + 0.4, za]);
      shell.quad([P.x0, __flPavC(zb), zb], [P.x0, __flPavC(za), za], [P.x0, __flPavC(za) + 0.4, za], [P.x0, __flPavC(zb) + 0.4, zb]);
    }
    // the south edge (over the beam)
    shell.quad([P.x0, P.spring, P.z1], [P.x1, P.spring, P.z1], [P.x1, P.spring + 0.4, P.z1], [P.x0, P.spring + 0.4, P.z1]);
    // snow on top
    const sn = grid((x, z) => 0.4 + (0.05 + 0.13 * Math.min(1, (z - P.z0) * 2, (P.z1 - z) * 2, (x - P.x0) * 2)) * (0.8 + 0.4 * __flNoise(x * 1.7, z * 1.7)));
    snow.add(sn, new _A());
    top.dispose();
    bot.dispose();
    sn.dispose();
    // ribs over each column
    for (const [x] of P.cols) {
      const arc = [];
      for (let z = P.z0; z <= P.z1 + 1e-6; z += 0.25) arc.push([x, __flPavC(z) - 0.1, z]);
      const t = __xmTube(arc, 0.17, 8, 1);
      ice.add(t, new _A());
      t.dispose();
    }
    // icicles along the beam and the west edge
    for (let x = P.x0; x < P.x1 - 0.3; x += 0.15 + rnd() * 0.2) rnd() < 0.7 && icicles.push([x, P.spring - 0.33, P.cols[0][1] + (rnd() - 0.5) * 0.7, 0.1 + rnd() * rnd() * 0.8, 0.02 + rnd() * 0.035]);
    for (let z = P.z0 + 0.5; z < P.z1; z += 0.2 + rnd() * 0.2) rnd() < 0.6 && icicles.push([P.x0 + 0.1, __flPavC(z) + 0.02, z, 0.1 + rnd() * rnd() * 0.6, 0.02 + rnd() * 0.03]);
  }
  __flMesh(root, ice.build(), __flGlacier(), 'frost_pavilion');
  __flMesh(root, shell.build(), __flOwn(__flIce(0.8)), 'frost_pavilion_vault', !1);
  __flMesh(root, snow.build(), __flSnowMat(), 'frost_pavilion_snow', !1);
  __flIcicles(root, icicles);
}
