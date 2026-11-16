/* ===== Bayou Protocol mod: Frostline at Christmas ===== */
// Decorations on the Frostline map, all modelled in 3D and placed from the layout in 61-frostline.js:
//   - decorated Christmas trees in both spawns: glossy baubles with metal caps, a spiral of twinkling lights,
//     a gold bead garland and a star on top (lit, it glows through the bloom), presents round the trunk
//   - presents: wrapped boxes (striped, dotted and starred paper) with ribbons and bows; the four crates in
//     the spawns are giant presents
//   - log cabins (stacked logs with notched corners, stone footing, plank door with a wreath, lit windows
//     with shutters and curtains, a snow-loaded roof with icicles, a stone chimney that smokes)
//   - string lights: across the spawn exits and the chokes, along the cabin eaves and the container, in the
//     ice tunnel under the roof; candy-striped lamp posts with lamps and wreaths
//   - snowmen (coal eyes, carrot nose, stick arms, knitted scarf, hat), giant candy canes
//   - a campfire with flames, sparks and log seats behind the T spawn; lanterns; lanterns hanging in the tunnel and the hidden rooms;
//     Poly Haven barrels, buckets, boxes and a stove; garlands with lights on every arch (the caverns'
//     interiors are in 64-frostline-rooms.js)
// Everything is merged or instanced by material (a few dozen draw calls), and animated on the GPU (the
// twinkling, the flames, the smoke): no per-frame work beyond a few uniforms.
const __XM = { tex: {} };
// ---------------------------------------------------------------- canvas textures (made once, kept)
function __xmCanvas(key, size, draw) {
  if (__XM.tex[key]) return __XM.tex[key];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new LI(c);
  t.wrapS = t.wrapT = 1e3;
  t.colorSpace = 'srgb';
  t.anisotropy = 8;
  return (__XM.tex[key] = t);
}
// wrapping paper: drawn in greys and white, tinted by each present's colour
const __xmPaper = (k) =>
  __xmCanvas('paper' + k, 256, (g, S) => {
    g.fillStyle = '#c8c8c8';
    g.fillRect(0, 0, S, S);
    g.fillStyle = '#ffffff';
    if (k === 0)
      for (let i = -S; i < S * 2; i += 42) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + 16, 0);
        g.lineTo(i + 16 - S, S);
        g.lineTo(i - S, S);
        g.fill();
      }
    else if (k === 1)
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) g.beginPath(), g.arc((x + (y % 2) * 0.5) * 32 + 8, y * 32 + 16, 6, 0, 7), g.fill();
    else {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 3;
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          const cx = (x + (y % 2) * 0.5) * 64 + 16,
            cy = y * 64 + 32;
          for (let a = 0; a < 3; a++) g.beginPath(), g.moveTo(cx - Math.cos(a * 1.047) * 13, cy - Math.sin(a * 1.047) * 13), g.lineTo(cx + Math.cos(a * 1.047) * 13, cy + Math.sin(a * 1.047) * 13), g.stroke();
        }
    }
  });
// candy stripes (red and white, a thin green line), drawn diagonally so they wind round a tube
const __xmCandy = () =>
  __xmCanvas('candy', 128, (g, S) => {
    g.fillStyle = '#f4f1ea';
    g.fillRect(0, 0, S, S);
    for (const [col, w, off] of [['#c3121c', 34, 0], ['#1d7a3a', 5, 44]])
      for (let i = -S; i < S * 2; i += S / 2) {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(i + off, 0);
        g.lineTo(i + off + w, 0);
        g.lineTo(i + off + w - S, S);
        g.lineTo(i + off - S, S);
        g.fill();
      }
  });
// ---------------------------------------------------------------- a tube along a path (parallel-transport frames)
// u runs along the tube in metres / uLen, v round it; rad(t) gives the radius at t (0..1 along the path)
function __xmTube(pts, rad, radial = 8, uLen = 0.33) {
  const n = pts.length,
    P = [],
    N = [],
    UV = [],
    I = [],
    T = [],
    a = new U(),
    b = new U();
  for (let i = 0; i < n; i++) {
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[Math.min(n - 1, i + 1)];
    T.push(new U(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize());
  }
  let nrm = Math.abs(T[0].y) < 0.9 ? new U(0, 1, 0) : new U(1, 0, 0);
  nrm = nrm.sub(T[0].clone().multiplyScalar(nrm.dot(T[0]))).normalize();
  let s = 0;
  for (let i = 0; i < n; i++) {
    if (i) {
      s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
      nrm.sub(T[i].clone().multiplyScalar(nrm.dot(T[i]))).normalize();
    }
    const bin = new U().crossVectors(T[i], nrm),
      r = typeof rad === 'function' ? rad(i / (n - 1), s) : rad;
    for (let j = 0; j <= radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      a.copy(nrm).multiplyScalar(Math.cos(ang)).add(b.copy(bin).multiplyScalar(Math.sin(ang)));
      P.push(pts[i][0] + a.x * r, pts[i][1] + a.y * r, pts[i][2] + a.z * r);
      N.push(a.x, a.y, a.z);
      UV.push(s / uLen, j / radial);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < radial; j++) {
      const k = i * (radial + 1) + j,
        q = k + radial + 1;
      I.push(k, k + 1, q, k + 1, q + 1, q);
    }
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array(P), 3));
  g.setAttribute('normal', new gi(new Float32Array(N), 3));
  g.setAttribute('uv', new gi(new Float32Array(UV), 2));
  g.setIndex(I);
  return g;
}
// a hanging strand between a and b ([x, y, z]) sagging by `sag` in the middle
const __xmSag = (a, b, sag, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
// ---------------------------------------------------------------- instanced helpers
function __xmInst(root, geo, mat, list, name, cast = !1) {
  // list: [matrix, colour (hex or null)]
  if (!list.length) return null;
  const im = new QZ(geo, mat, list.length),
    c = new UA();
  list.forEach(([M, col], k) => (im.setMatrixAt(k, M), col != null && im.setColorAt(k, c.set(col))));
  im.instanceMatrix.needsUpdate = !0;
  im.instanceColor && (im.instanceColor.needsUpdate = !0);
  im.computeBoundingSphere();
  im.name = name;
  im.castShadow = cast;
  im.receiveShadow = !0;
  root.add(im);
  return im;
}
// ---------------------------------------------------------------- the lights (bulbs twinkle on the GPU)
function __xmBulbMat() {
  const u = { uT: { value: 0 }, uI: { value: 2.4 } },
    m = __flOwn(new Gw({ color: '#ffffff', roughness: 0.3, metalness: 0 }));
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vPh;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPh = float(gl_InstanceID);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPh; uniform float uT; uniform float uI;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat tw = 0.6 + 0.4 * sin(uT * (1.1 + fract(vPh * 0.371) * 1.9) + vPh * 2.39);\ntotalEmissiveRadiance = vColor.rgb * uI * tw;');
  };
  m.customProgramCacheKey = () => 'xmas-bulb';
  m.__u = u;
  return m;
}
const __XM_MULTI = ['#ff2416', '#19e64a', '#2a5cff', '#ffae19', '#ff2ccf', '#20d6ff'],
  __XM_WARM = ['#ffc472', '#ffb85a', '#ffd08a'];
// ---------------------------------------------------------------- a five-pointed star (faceted, both sides)
function __xmStarGeo(R, r, t) {
  const o = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5,
      q = i % 2 ? r : R;
    o.push([Math.cos(a) * q, Math.sin(a) * q, 0]);
  }
  const P = [];
  for (let i = 0; i < 10; i++) {
    const A = o[i],
      B = o[(i + 1) % 10];
    P.push(0, 0, t, ...A, ...B, 0, 0, -t, ...B, ...A);
  }
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array(P), 3));
  g.computeVertexNormals();
  return g;
}
// ---------------------------------------------------------------- the crown of a fir (radius by height)
function __xmCrown(parts) {
  const v = new U(),
    pts = [];
  let H = 0;
  for (const p of parts) {
    if (!p.mat.__foliage) continue;
    const pos = p.geo.attributes.position;
    for (let i = 0; i < pos.count; i += 2) {
      v.fromBufferAttribute(pos, i).applyMatrix4(p.M);
      pts.push([v.y, Math.hypot(v.x, v.z)]);
      H = Math.max(H, v.y);
    }
  }
  const B = 32,
    bins = Array.from({ length: B }, () => []);
  for (const [y, r] of pts) bins[Math.min(B - 1, Math.max(0, Math.floor((y / H) * B)))].push(r);
  const R = bins.map((l) => (l.length ? l.sort((a, b) => a - b)[Math.floor(l.length * 0.8)] : 0));
  // smooth, and never wider than the bin below (a clean cone for placing things on)
  for (let i = 1; i < B; i++) R[i] = Math.min(R[i], R[i - 1] * 1.08 + 0.05);
  return { H, r: (h) => R[Math.min(B - 1, Math.max(0, Math.floor((h / H) * B)))] };
}
// ---------------------------------------------------------------- presents
// [x, y, z, w, h, d, rotY, paper colour, ribbon colour, pattern 0-2]
function __xmPresents(root, list) {
  if (!list.length) return;
  const box = new _i(1, 1, 1),
    bodies = [[], [], []],
    bands = [],
    bows = [],
    M = (x, y, z, sx, sy, sz, ry) => __flM(x, y, z, sx, sy, sz, ry);
  for (const [x, y, z, w, h, d, ry, paper, ribbon, pat] of list) {
    bodies[pat].push([M(x, y + h / 2, z, w, h, d, ry), paper]);
    const bw = Math.max(0.035, 0.12 * Math.min(w, d)),
      e = 0.008;
    bands.push([M(x, y + h / 2, z, w + e, h + e, bw, ry), ribbon], [M(x, y + h / 2, z, bw, h + e, d + e, ry), ribbon]);
    bows.push([M(x, y + h, z, Math.min(w, d) * 0.85, Math.min(w, d) * 0.85, Math.min(w, d) * 0.85, ry + 0.785), ribbon]);
  }
  // the bow, for a present 1 m across: two loops leaning out, a knot, two tails lying on the lid
  if (!__XM.bow) {
    const B = __flMB(),
      tor = new oI(0.16, 0.05, 6, 14);
    B.add(tor, __flM(0.15, 0.12, 0, 1, 0.85, 0.35, 0, 0, -0.45));
    B.add(tor, __flM(-0.15, 0.12, 0, 1, 0.85, 0.35, 0, 0, 0.45));
    B.add(__flUnit('sph6'), __flM(0, 0.04, 0, 0.065, 0.055, 0.07));
    B.add(__flUnit('box'), __flM(0.12, 0.005, 0.09, 0.28, 0.008, 0.07, 0.6));
    B.add(__flUnit('box'), __flM(-0.1, 0.005, 0.11, 0.26, 0.008, 0.07, -0.75));
    tor.dispose();
    __XM.bow = B.build();
  }
  bodies.forEach((l, k) => __xmInst(root, box, __flOwn(new Gw({ map: __xmPaper(k), roughness: 0.42, metalness: 0 })), l, 'frost_xm_presents', !0));
  const rib = __flOwn(new Gw({ color: '#ffffff', roughness: 0.28, metalness: 0.55 }));
  __xmInst(root, box, rib, bands, 'frost_xm_ribbons');
  __xmInst(root, __XM.bow, rib, bows, 'frost_xm_bows');
}
const __XM_PAPER = ['#b3141f', '#1f6e3a', '#c99a2e', '#1f3f8f', '#e6e6e6', '#5a2a7a', '#9aa3ad', '#c2185b'],
  __XM_RIBBON = ['#e0b84a', '#e6e9ee', '#c4161c', '#f4f4f4', '#2a8a4a'];
// a pile of presents round a point, between radius r0 and r1
function __xmPile(out, x, z, n, r0, r1, rnd, y = 0) {
  for (let k = 0; k < n; k++) {
    const a = rnd() * 6.28,
      r = r0 + rnd() * (r1 - r0),
      w = 0.22 + rnd() * 0.32,
      d = 0.22 + rnd() * 0.32,
      h = 0.16 + rnd() * 0.3,
      px = x + Math.cos(a) * r,
      pz = z + Math.sin(a) * r,
      paper = __XM_PAPER[Math.floor(rnd() * __XM_PAPER.length)],
      ribbon = __XM_RIBBON[Math.floor(rnd() * __XM_RIBBON.length)];
    out.push([px, y, pz, w, h, d, rnd() * 6.28, paper, ribbon, Math.floor(rnd() * 3)]);
    // now and then a small one on top
    rnd() < 0.3 && out.push([px, y + h, pz, w * 0.6, h * 0.7, d * 0.6, rnd() * 6.28, __XM_PAPER[Math.floor(rnd() * 8)], __XM_RIBBON[Math.floor(rnd() * 5)], Math.floor(rnd() * 3)]);
  }
}
// ---------------------------------------------------------------- wreaths (geometry for one 0.6 m across, facing +z)
function __xmWreathGeo() {
  if (__XM.wreath) return __XM.wreath;
  const B = __flMB(),
    tor = new oI(0.25, 0.085, 8, 26),
    p = tor.attributes.position;
  // bushy: every vertex pushed out by noise (clumps of needles), dark greens
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      o = 1 + 0.35 * (__flN3(x * 22, y * 22, z * 22) - 0.4);
    const cx = (x / Math.hypot(x, y)) * 0.25,
      cy = (y / Math.hypot(x, y)) * 0.25;
    p.setXYZ(i, cx + (x - cx) * o, cy + (y - cy) * o, z * o);
  }
  tor.computeVertexNormals();
  B.add(tor, new _A(), [0.05, 0.16, 0.06]);
  tor.dispose();
  // berries and pine cones
  let seed = 31;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * 6.28 + 0.3;
    for (let j = 0; j < 3; j++) B.add(__flUnit('sph6'), __flM(Math.cos(a) * 0.25 + (rnd() - 0.5) * 0.06, Math.sin(a) * 0.25 + (rnd() - 0.5) * 0.06, 0.08, 0.022, 0.022, 0.022), [0.55, 0.02, 0.02]);
    k % 3 === 1 && B.add(__flUnit('sph'), __flM(Math.cos(a + 0.35) * 0.27, Math.sin(a + 0.35) * 0.27, 0.07, 0.035, 0.055, 0.035, 0, 0, a), [0.22, 0.12, 0.05]);
  }
  // a red velvet bow at the bottom
  const t2 = new oI(0.07, 0.025, 6, 16);
  B.add(t2, __flM(0.07, -0.28, 0.09, 1, 0.8, 0.5, 0, 0, -0.4), [0.6, 0.03, 0.03]);
  B.add(t2, __flM(-0.07, -0.28, 0.09, 1, 0.8, 0.5, 0, 0, 0.4), [0.6, 0.03, 0.03]);
  B.add(__flUnit('box'), __flM(0.04, -0.38, 0.09, 0.05, 0.18, 0.01, 0, 0, 0.25), [0.6, 0.03, 0.03]);
  B.add(__flUnit('box'), __flM(-0.04, -0.38, 0.09, 0.05, 0.18, 0.01, 0, 0, -0.25), [0.6, 0.03, 0.03]);
  t2.dispose();
  return (__XM.wreath = B.build());
}
// ---------------------------------------------------------------- the candy cane (1.2 m, hook to +x)
function __xmCaneGeo() {
  if (__XM.cane) return __XM.cane;
  const pts = [];
  for (let y = 0; y <= 1.0; y += 0.04) pts.push([0, y, 0]);
  for (let k = 1; k <= 16; k++) {
    const a = Math.PI - (k / 16) * Math.PI;
    pts.push([0.15 + Math.cos(a) * 0.15, 1.0 + Math.sin(a) * 0.15, 0]);
  }
  pts.push([0.3, 0.94, 0], [0.3, 0.9, 0]);
  return (__XM.cane = __xmTube(pts, 0.042, 12, 0.3));
}
// ---------------------------------------------------------------- snowmen (one merged mesh per material)
function __xmSnowmen(root, list) {
  if (!list.length) return;
  const snow = __flMB(),
    coal = __flMB(),
    carrot = __flMB(),
    wood = __flMB(),
    cloth = __flMB();
  const lumpy = (r) => {
    const g = new bi(r, 22, 16),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        o = 1 + 0.05 * (__flN3(x * 7 + r * 9, y * 7, z * 7) - 0.5);
      p.setXYZ(i, x * o, y * o, z * o);
    }
    g.computeVertexNormals();
    return g;
  };
  const scarfs = [[0.6, 0.04, 0.05], [0.05, 0.3, 0.12], [0.08, 0.15, 0.55], [0.75, 0.55, 0.08]];
  list.forEach(([x, zz, face], k) => {
    const R = new _A().makeRotationY(face),
      T = (lx, ly, lz) => {
        const v = new U(lx, ly, lz).applyMatrix4(R);
        return [x + v.x, ly, zz + v.z];
      },
      put = (B, geo, lx, ly, lz, sx, sy, sz, ry = 0, rx = 0, rz = 0, c = 1) => {
        const [X, Y, Z] = T(lx, ly, lz);
        B.add(geo, __flM(X, Y, Z, sx, sy, sz, face + ry, rx, rz), c);
      };
    // body: three balls (the bottom one settled into the snow)
    for (const [r, y] of [[0.45, 0.36], [0.33, 0.97], [0.23, 1.42]]) {
      const g = lumpy(r);
      put(snow, g, 0, y, 0, 1, 1, 1);
      g.dispose();
    }
    // a little drift round the base
    put(snow, __flUnit('sph'), 0, 0, 0, 0.62, 0.12, 0.62);
    // face: coal eyes, a smile, a carrot; coal buttons
    for (const s of [-1, 1]) put(coal, __flUnit('sph6'), s * 0.075, 1.49, 0.2, 0.025, 0.025, 0.02);
    for (let i = 0; i < 5; i++) {
      const a = -0.6 + i * 0.3;
      put(coal, __flUnit('sph6'), Math.sin(a) * 0.1, 1.36 - Math.cos(a) * 0.035, 0.205 - Math.abs(Math.sin(a)) * 0.03, 0.016, 0.016, 0.014);
    }
    put(carrot, __flUnit('cone'), 0, 1.43, 0.3, 0.032, 0.2, 0.032, 0, Math.PI / 2 + 0.08);
    for (const y of [0.85, 1.0, 1.14]) put(coal, __flUnit('sph6'), 0, y, Math.sqrt(Math.max(0.0001, 0.33 * 0.33 - (y - 0.97) * (y - 0.97))) + 0.005, 0.028, 0.028, 0.02);
    // stick arms with a twig each
    for (const s of [-1, 1]) {
      put(wood, __flUnit('cyl6'), s * 0.55, 1.12, 0, 0.018, 0.55, 0.018, 0, 0, s * -1.05);
      put(wood, __flUnit('cyl6'), s * 0.72, 1.27, 0.02, 0.012, 0.18, 0.012, 0, 0.3, s * -0.35);
    }
    // a knitted scarf (with a tail) and a hat
    const sc = scarfs[k % scarfs.length],
      ring = new oI(0.2, 0.055, 8, 24);
    put(cloth, ring, 0, 1.24, 0, 1, 1, 1, 0, Math.PI / 2, 0, sc);
    put(cloth, __flUnit('box'), 0.13, 1.06, 0.2, 0.11, 0.34, 0.035, 0, -0.25, 0.15, sc);
    ring.dispose();
    if (k % 2 === 0) {
      put(cloth, __flUnit('cyl'), 0, 1.6, 0, 0.25, 0.025, 0.25, 0, 0, 0, [0.03, 0.03, 0.03]);
      put(cloth, __flUnit('cyl'), 0, 1.74, 0, 0.15, 0.26, 0.15, 0, 0, 0, [0.03, 0.03, 0.03]);
      put(cloth, __flUnit('cyl'), 0, 1.65, 0, 0.152, 0.05, 0.152, 0, 0, 0, sc);
    } else {
      put(cloth, __flUnit('sph'), 0, 1.57, 0, 0.21, 0.17, 0.21, 0, 0, 0, sc);
      put(cloth, __flUnit('cyl'), 0, 1.56, 0, 0.215, 0.06, 0.215, 0, 0, 0, [0.85, 0.85, 0.85]);
      put(cloth, __flUnit('sph'), 0, 1.76, 0, 0.065, 0.065, 0.065, 0, 0, 0, [0.9, 0.9, 0.9]);
    }
  });
  __flMesh(root, snow.build(), __flSnowMat(), 'frost_xm_snowmen');
  __flMesh(root, coal.build(), __flOwn(new Gw({ color: '#111', roughness: 0.6, metalness: 0.1 })), 'frost_xm_coal', !1);
  __flMesh(root, carrot.build(), __flOwn(new Gw({ color: '#e0661a', roughness: 0.6 })), 'frost_xm_carrot', !1);
  __flMesh(root, wood.build(), __flOwn(new Gw({ color: '#3b2a1c', roughness: 0.95 })), 'frost_xm_sticks');
  __flMesh(root, cloth.build(), __flOwn(new Gw({ color: '#ffffff', roughness: 0.95, vertexColors: !0 })), 'frost_xm_cloth');
}
// ---------------------------------------------------------------- log cabins (front faces +z)
function __xmCabins(root, list, lights, presents, wreaths, smoke, icicles) {
  if (!list.length) return;
  const log = __flMB(),
    stone = __flMB(),
    roof = __flMB(),
    trim = __flMB(),
    glass = __flMB(),
    dark = __flMB(),
    snow = __flMB(),
    box = __flUnit('box'),
    cyl = __flUnit('cyl');
  let seed = 17;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const RED = [0.42, 0.06, 0.04],
    GREEN = [0.07, 0.2, 0.1],
    CREAM = [0.85, 0.8, 0.7],
    IRON = [0.08, 0.08, 0.08];
  for (const [x0, z0, x1, z1] of list) {
    const W = x1 - x0,
      Dp = z1 - z0,
      cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2,
      r = 0.14,
      pitch = 0.265,
      base = 0.3,
      eave = 2.95,
      ang = 0.66, // roof pitch (38 degrees)
      ridge = eave + (Dp / 2) * Math.tan(ang),
      ov = 0.55, // eave overhang
      gov = 0.4, // gable overhang
      bx = (B, X, Y, Z, sx, sy, sz, c = 1, ry = 0, rx = 0, rz = 0) => B.add(box, __flM(X, Y, Z, sx, sy, sz, ry, rx, rz), c),
      logX = (a, b, y, zz) => log.add(cyl, __flM((a + b) / 2, y, zz, r, b - a, r, 0, 0, Math.PI / 2), 0.72 + rnd() * 0.35),
      logZ = (a, b, y, x) => log.add(cyl, __flM(x, y, (a + b) / 2, r, b - a, r, 0, Math.PI / 2, 0), 0.72 + rnd() * 0.35);
    const door = { a: cx - 0.5, b: cx + 0.5, y0: base, y1: base + 2.0 },
      wins = [cx - W * 0.3, cx + W * 0.3].map((c) => ({ a: c - 0.45, b: c + 0.45, y0: 1.1, y1: 1.95 })),
      ops = [door, ...wins];
    // walls: stacked logs, the side walls half a log higher, every log running past the corners
    const nL = Math.round((eave - base) / pitch);
    for (let k = 0; k < nL; k++) {
      const yF = base + r + k * pitch,
        yS = yF + pitch / 2;
      logX(x0 - 0.22, x1 + 0.22, yF, z0 + r);
      let segs = [[x0 - 0.22, x1 + 0.22]];
      for (const o of ops)
        if (yF + r * 0.6 > o.y0 && yF - r * 0.6 < o.y1)
          segs = segs.flatMap(([a, b]) =>
            [
              [a, Math.min(b, o.a - 0.06)],
              [Math.max(a, o.b + 0.06), b],
            ].filter(([p, q]) => q - p > 0.05),
          );
      for (const [a, b] of segs) logX(a, b, yF, z1 - r);
      yS < eave + 0.05 && (logZ(z0 - 0.22, z1 + 0.22, yS, x0 + r), logZ(z0 - 0.22, z1 + 0.22, yS, x1 - r));
    }
    // the dark inside (seen between logs), the stone footing, a step at the door
    bx(dark, cx, (base + eave) / 2, cz - 0.07, W - 0.2, eave - base, Dp - 0.34);
    bx(stone, cx, base / 2, cz, W + 0.1, base + 0.02, Dp + 0.1, 1);
    bx(stone, cx, 0.09, z1 + 0.25, 1.5, 0.18, 0.5, 0.9);
    // the door: frame, vertical boards, a Z brace, an iron ring handle; a wreath on it
    bx(trim, door.a - 0.06, (door.y0 + door.y1) / 2 + 0.05, z1 - 0.1, 0.12, door.y1 - door.y0 + 0.1, 0.22, CREAM);
    bx(trim, door.b + 0.06, (door.y0 + door.y1) / 2 + 0.05, z1 - 0.1, 0.12, door.y1 - door.y0 + 0.1, 0.22, CREAM);
    bx(trim, cx, door.y1 + 0.07, z1 - 0.1, 1.24, 0.14, 0.22, CREAM);
    for (let i = 0; i < 5; i++) bx(trim, door.a + 0.1 + i * 0.2, (door.y0 + door.y1) / 2, z1 - 0.17, 0.19, door.y1 - door.y0, 0.05, RED.map((c) => c * (0.85 + rnd() * 0.3)));
    for (const y of [door.y0 + 0.35, door.y1 - 0.35]) bx(trim, cx, y, z1 - 0.13, 0.94, 0.12, 0.03, RED.map((c) => c * 0.8));
    bx(trim, cx, (door.y0 + door.y1) / 2, z1 - 0.13, 1.25, 0.11, 0.03, RED.map((c) => c * 0.8), 0, 0, Math.atan2(door.y1 - door.y0 - 0.7, 0.94));
    trim.add(new oI(0.05, 0.008, 6, 14), __flM(door.b - 0.16, door.y0 + 1.0, z1 - 0.1, 1, 1, 1), IRON);
    wreaths.push([cx, door.y0 + 1.55, z1 - 0.1, 0, 0.6]);
    // windows: frame, warm glass, glazing bars, curtains, shutters, a sill with snow
    for (const o of wins) {
      const mx = (o.a + o.b) / 2,
        my = (o.y0 + o.y1) / 2,
        ww = o.b - o.a,
        wh = o.y1 - o.y0;
      bx(glass, mx, my, z1 - 0.22, ww, wh, 0.02);
      bx(trim, mx, my, z1 - 0.19, 0.04, wh, 0.03, CREAM);
      bx(trim, mx, my, z1 - 0.19, ww, 0.04, 0.03, CREAM);
      for (const s of [-1, 1]) bx(trim, mx + s * (ww / 2 - 0.12), my, z1 - 0.205, 0.2, wh - 0.04, 0.015, RED);
      for (const [X, Y, sx, sy] of [[o.a - 0.04, my, 0.08, wh + 0.16], [o.b + 0.04, my, 0.08, wh + 0.16], [mx, o.y1 + 0.04, ww + 0.16, 0.08]]) bx(trim, X, Y, z1 - 0.1, sx, sy, 0.22, CREAM);
      bx(trim, mx, o.y0 - 0.04, z1 - 0.02, ww + 0.3, 0.07, 0.3, CREAM);
      __flSnowCushion(snow, o.a - 0.12, z1 - 0.14, o.b + 0.12, z1 + 0.12, o.y0 - 0.005, 0.06);
      for (const s of [-1, 1]) {
        const sxp = s < 0 ? o.a - 0.33 : o.b + 0.33;
        for (let i = 0; i < 3; i++) bx(trim, sxp - 0.15 + i * 0.15 + 0.075 - 0.075, my, z1 + 0.025, 0.14, wh + 0.1, 0.035, GREEN.map((c) => c * (0.9 + rnd() * 0.2)));
        bx(trim, sxp, my + 0.2, z1 + 0.05, 0.42, 0.06, 0.02, GREEN);
        bx(trim, sxp, my - 0.2, z1 + 0.05, 0.42, 0.06, 0.02, GREEN);
      }
    }
    // gables: vertical boards filling the triangle above the side walls
    for (const gx of [x0 + 0.05, x1 - 0.05])
      for (let zz = z0 + 0.1; zz < z1 - 0.05; zz += 0.2) {
        const h = Math.max(0.05, (Dp / 2 - Math.abs(zz - cz)) * Math.tan(ang));
        bx(roof, gx, eave + h / 2, zz, 0.06, h, 0.19, 0.8 + rnd() * 0.3);
      }
    // the roof: two plank slabs, fascia boards, rafter tails, a ridge board
    const Ls = (Dp / 2 + ov) / Math.cos(ang),
      th = 0.12;
    for (const s of [1, -1]) {
      // s = 1: the front slope (falling towards +z)
      const n = [0, Math.cos(ang), s * Math.sin(ang)],
        mid = [cx, ridge - (Ls / 2) * Math.sin(ang), cz + s * (Ls / 2) * Math.cos(ang)];
      bx(roof, mid[0], mid[1] + n[1] * th * 0.5, mid[2] + n[2] * th * 0.5, W + 2 * gov, th, Ls, 1, 0, s * ang);
      const ez = cz + s * (Dp / 2 + ov),
        ey = ridge - Ls * Math.sin(ang);
      bx(trim, cx, ey + 0.02, ez + s * 0.03, W + 2 * gov + 0.04, 0.2, 0.05, CREAM);
      for (let x = x0 - gov + 0.3; x < x1 + gov - 0.2; x += 0.6) bx(trim, x, ey + 0.17, cz + s * (Dp / 2 + ov / 2), 0.08, 0.12, ov + 0.1, 0.45, 0, s * ang);
      // snow on this slope: a thick, lumpy layer, thinner at the gable edges, curling over the eave
      const nu = Math.round((W + 2 * gov) / 0.16),
        nv = Math.round(Ls / 0.16) + 3,
        P = [],
        I = [],
        base0 = 0;
      for (let j = 0; j <= nv; j++)
        for (let i = 0; i <= nu; i++) {
          const u = i / nu,
            x = x0 - gov + u * (W + 2 * gov),
            vv = Math.min(1, j / (nv - 3)),
            v = vv * Ls,
            edge = Math.min(1, Math.min(u, 1 - u) * (W + 2 * gov) * 4),
            lump = 0.04 * (__flNoise(x * 2.7, v * 2.7 + s * 9) - 0.5);
          let h = (0.04 + 0.2 * Math.sqrt(edge)) * (0.85 + 0.3 * __flNoise(x * 0.9, v * 0.9)) + lump,
            ext = 0;
          j === nv - 2 && ((ext = 0.07), (h *= 0.85));
          j === nv - 1 && ((ext = 0.1), (h = -0.02));
          j === nv && ((ext = 0.08), (h = -0.12 - 0.06 * __flNoise(x * 3, 1)));
          const vd = v + ext,
            y = ridge - vd * Math.sin(ang) + n[1] * (th + h),
            zz = cz + s * vd * Math.cos(ang) + n[2] * (th + h);
          P.push(x, y, zz);
        }
      for (let j = 0; j < nv; j++)
        for (let i = 0; i < nu; i++) {
          const a = j * (nu + 1) + i,
            b = a + nu + 1;
          s > 0 ? I.push(a, b, a + 1, a + 1, b, b + 1) : I.push(a, a + 1, b, a + 1, b + 1, b);
        }
      const g = new uw();
      g.setAttribute('position', new gi(new Float32Array(P), 3));
      g.setIndex(I);
      g.computeVertexNormals();
      snow.add(g, new _A(), 1);
      g.dispose();
      // icicles along the eave (front and back)
      for (let x = x0 - gov + 0.1; x < x1 + gov - 0.1; x += 0.12 + rnd() * 0.2) rnd() < 0.7 && icicles.push([x, ey - 0.06, ez + s * 0.02, 0.1 + rnd() * rnd() * 0.7, 0.02 + rnd() * 0.03]);
      // lights along the front eave, in scallops
      if (s > 0) {
        const hooks = Math.round((W + 2 * gov) / 1.2);
        for (let h = 0; h < hooks; h++) {
          const a = x0 - gov + 0.05 + (h * (W + 2 * gov - 0.1)) / hooks,
            b = x0 - gov + 0.05 + ((h + 1) * (W + 2 * gov - 0.1)) / hooks;
          lights.push([[a, ey - 0.03, ez + 0.06], [b, ey - 0.03, ez + 0.06], 0.16, 'multi', 0.24]);
        }
      }
    }
    bx(trim, cx, ridge + 0.1, cz, W + 2 * gov + 0.06, 0.12, 0.2, 0.5);
    // a stone chimney through the back slope, with a cap, its flue, snow on the cap, and smoke
    const chx = x0 + 1.1,
      chz = cz - 0.55;
    bx(stone, chx, (eave + ridge + 1.0) / 2, chz, 0.7, ridge + 1.0 - eave, 0.7, 0.95);
    bx(stone, chx, ridge + 1.04, chz, 0.84, 0.09, 0.84, 0.8);
    bx(dark, chx, ridge + 1.09, chz, 0.36, 0.02, 0.36);
    __flSnowCushion(snow, chx - 0.42, chz - 0.42, chx - 0.2, chz + 0.42, ridge + 1.085, 0.06);
    smoke.push([chx, ridge + 1.15, chz]);
    // presents on the step
    __xmPile(presents, cx + 0.95, z1 + 0.35, 3, 0.1, 0.35, rnd);
  }
  const m = (base, tile, tint, desat, gain) => {
    const q = __flOwn(__flMat(base, tile, 2, 0.8, 0.94, tint, desat, gain));
    q.vertexColors = !0;
    return q;
  };
  __flMesh(root, log.build(), m('weathered_plank_siding', 1.1, '#d8c6b2'), 'frost_xm_logs');
  __flMesh(root, stone.build(), m('rustic_stone_wall', 1.2), 'frost_xm_stone');
  __flMesh(root, roof.build(), m('roof_planks', 1.4, '#a88c70', 0.45), 'frost_xm_roof');
  __flMesh(root, trim.build(), m('brown_planks_05', 1.0, '#ffffff', 0.6, 1.6), 'frost_xm_trim');
  __flMesh(root, dark.build(), __flOwn(new Gw({ color: '#0d0a08', roughness: 1 })), 'frost_xm_dark', !1);
  __flMesh(root, glass.build(), __flOwn(new Gw({ color: '#2a1a0c', roughness: 0.12, metalness: 0, emissive: '#ffa548', emissiveIntensity: 1.5 })), 'frost_xm_windows', !1);
  __flMesh(root, snow.build(), __flSnowMat(), 'frost_xm_roofsnow');
}
// ---------------------------------------------------------------- campfire flames, sparks, chimney smoke
function __xmFire(root, x, y, z, ticks, S = 1) {
  const u = { uT: { value: 0 } },
    mat = __flOwn(new Ni({ color: '#ffffff', transparent: !0, depthWrite: !1, blending: 2, side: 2, fog: !0 }));
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uT; varying float vY; varying vec3 vP;')
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = position; vY = clamp((position.y + 0.5), 0.0, 1.0);
        float sd = float(gl_InstanceID) * 1.7;
        transformed.x += sin(uT * 6.0 + position.y * 7.0 + sd) * 0.05 * vY;
        transformed.z += cos(uT * 5.3 + position.y * 6.0 + sd) * 0.05 * vY;
        vP = position + vec3(sd, -uT * 1.6, sd * 0.3);`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uT; varying float vY; varying vec3 vP;\nfloat fh(vec3 p){return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453);}\nfloat fn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(fh(i),fh(i+vec3(1,0,0)),f.x),mix(fh(i+vec3(0,1,0)),fh(i+vec3(1,1,0)),f.x),f.y),mix(mix(fh(i+vec3(0,0,1)),fh(i+vec3(1,0,1)),f.x),mix(fh(i+vec3(0,1,1)),fh(i+vec3(1,1,1)),f.x),f.y),f.z);}')
      .replace(
        '#include <opaque_fragment>',
        `float n = fn(vP * vec3(6.0, 4.0, 6.0)) * 0.65 + fn(vP * 13.0) * 0.35;
        float a = smoothstep(0.0, 0.15, vY) * pow(1.0 - vY, 1.4) * smoothstep(0.25, 0.75, n + 0.35 * (1.0 - vY));
        vec3 c = mix(vec3(1.0, 0.82, 0.42) * 2.6, vec3(1.0, 0.32, 0.06) * 1.6, smoothstep(0.1, 0.8, vY));
        gl_FragColor = vec4(c * a, a);`,
      );
  };
  mat.customProgramCacheKey = () => 'xmas-flame';
  const cone = new Oc(0.22, 1, 14, 6, !0),
    list = [];
  for (let k = 0; k < 5; k++) {
    const a = k * 1.256,
      r = k ? 0.12 : 0;
    list.push([__flM(x + Math.cos(a) * r * S, y + (0.42 + (k ? 0 : 0.12)) * S, z + Math.sin(a) * r * S, (k ? 0.8 : 1.15) * S, (k ? 0.75 : 1.1) * S, (k ? 0.8 : 1.15) * S, a), null]);
  }
  const im = __xmInst(root, cone, mat, list, 'frost_xm_flames');
  im && (im.frustumCulled = !1);
  // embers glowing in the logs
  __xmInst(root, __flUnit('sph6'), __flOwn(new Gw({ color: '#300', emissive: '#ff5a10', emissiveIntensity: 2.2, roughness: 1 })), Array.from({ length: 14 }, (_, k) => [__flM(x + Math.cos(k * 2.4) * 0.28 * S * ((k % 4) / 4 + 0.3), y + 0.06, z + Math.sin(k * 2.4) * 0.28 * S * ((k % 4) / 4 + 0.3), 0.06 * S, 0.04 * S, 0.06 * S), null]), 'frost_xm_embers');
  // sparks: rising, drifting, fading (GPU)
  const sp = __xmRising(root, [x, y + 0.5 * S, z], Math.round(40 * S), { color: '#ffa040', size: 0.05, rise: 2.6 * S, spread: 0.5 * S, life: 1.4, add: !0, grow: 0 });
  ticks.push((dt) => ((u.uT.value += Math.min(dt, 0.1)), sp && (sp.value += Math.min(dt, 0.1))));
}
// particles rising from a point (sparks, smoke): returns the time uniform
function __xmRising(root, [x, y, z], n, o) {
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) (p[i * 3] = i / n), (p[i * 3 + 1] = Math.random()), (p[i * 3 + 2] = Math.random());
  const geo = new uw();
  geo.setAttribute('position', new gi(p, 3));
  geo.boundingSphere = new DB(new U(x, y + 3, z), 8);
  const u = { uT: { value: 0 }, uO: { value: new U(x, y, z) } },
    mat = __flOwn(new Dd({ color: o.color, size: o.size, map: bY(), transparent: !0, opacity: o.opacity || 1, depthWrite: !1, blending: o.add ? 2 : 1, fog: !0 }));
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uT; uniform vec3 uO; varying float vA;')
      .replace(
        '#include <begin_vertex>',
        `float age = fract(uT / ${o.life.toFixed(2)} + position.x);
        vec3 transformed = uO + vec3((position.y - 0.5) * ${o.spread.toFixed(2)} * (0.3 + age) + sin(uT * 0.7 + position.x * 20.0) * 0.3 * age + age * age * 0.8,
          age * ${o.rise.toFixed(2)}, (position.z - 0.5) * ${o.spread.toFixed(2)} * (0.3 + age));
        vA = sin(age * 3.14159) * (1.0 - age * 0.5);`,
      )
      .replace('gl_PointSize = size;', `gl_PointSize = size * (1.0 + age * ${(o.grow || 0).toFixed(2)});`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vA;').replace('#include <premultiplied_alpha_fragment>', 'gl_FragColor.a *= vA;\n#include <premultiplied_alpha_fragment>');
  };
  mat.customProgramCacheKey = () => 'xmas-rise-' + (o.add ? 'a' : 'n') + o.life + o.rise + o.spread + (o.grow || 0);
  const pts = new MZ(geo, mat);
  pts.name = 'frost_xm_particles';
  root.add(pts);
  return u.uT;
}
// ---------------------------------------------------------------- the whole set
function __flChristmas(root, models) {
  const L = __FL_L,
    m = aw(),
    ticks = (__FL.ticks = []),
    low = Zw.getState().quality === 'low',
    lights = [], // strands: [a, b, sag, style, spacing]
    bulbs = [], // single bulbs: [x, y, z, colour, scale]
    presents = [],
    wreaths = [], // [x, y, z, rotY, scale]
    smoke = [],
    icicles = [],
    garlands = []; // [[x, y, z], ...]
  let seed = 77;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // ---- decorated trees
  if (models.firs) {
    const fir = __flParts(models.firs, 'Christmas tree_LOD0_');
    fir.parts.forEach((p) => __flSnowy(p.mat));
    const crown = __xmCrown(fir.parts),
      baubles = [],
      caps = [],
      stars = [],
      garland = __flMB();
    // the big spawn trees at full detail; the small ones (under 4 m) at the pack's first reduced level
    __flInstance(root, fir.parts, L.spawnTrees.filter((t) => t[2] >= 0.4).map(([x, zz, s]) => [x, 0, zz, s * 1.4, rnd() * 6.28]), !0);
    const small = __flParts(models.firs, 'Christmas tree_LOD1_');
    small.parts.forEach((p) => __flSnowy(p.mat));
    __flInstance(root, small.parts, L.spawnTrees.filter((t) => t[2] < 0.4).map(([x, zz, s]) => [x, 0, zz, s * 1.4, rnd() * 6.28]), !0);
    const BAUBLE = ['#a8101a', '#d4a73a', '#c9ccd2', '#1d3d8f', '#7a1020', '#e3c06a'];
    L.spawnTrees.forEach(([x, zz, s0], ti) => {
      const s = s0 * 1.4,
        H = crown.H * s,
        R = (h) => crown.r(h / s) * s,
        warm = ti >= 4; // the CT trees in warm white, the T trees in colours
      // baubles: denser low down (where the crown is wide)
      const nb = Math.round(60 * s * s);
      for (let k = 0, tries = 0; k < nb && tries < nb * 8; tries++) {
        const h = H * (0.1 + rnd() * 0.8),
          r = R(h);
        if (rnd() * R(H * 0.1) > r) continue;
        const a = rnd() * 6.28,
          rr = r * (0.82 + rnd() * 0.1),
          sz = (0.06 + rnd() * 0.05) * Math.sqrt(s),
          px = x + Math.cos(a) * rr,
          pz = zz + Math.sin(a) * rr,
          col = BAUBLE[Math.floor(rnd() * BAUBLE.length)];
        baubles.push([__flM(px, h, pz, sz, sz, sz), col]);
        caps.push([__flM(px, h + sz * 0.98, pz, sz * 0.32, sz * 0.3, sz * 0.32), '#c8a24a']);
        k++;
      }
      // a spiral of lights, bottom to top
      const turns = 6.5;
      let last = null;
      for (let t = 0; t <= 1; t += 0.0015) {
        const h = H * (0.07 + 0.83 * t),
          a = t * turns * 6.283 + ti,
          r = R(h) * 0.96,
          p = [x + Math.cos(a) * r, h, zz + Math.sin(a) * r];
        if (last && Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) < 0.24) continue;
        last = p;
        bulbs.push([p[0], p[1] - 0.02, p[2], warm ? __XM_WARM[bulbs.length % 3] : __XM_MULTI[bulbs.length % __XM_MULTI.length], 0.75]);
      }
      // a gold bead garland in swags, winding the other way
      const pts = [],
        gt = 4;
      for (let t = 0; t <= 1; t += 0.002) {
        const h = H * (0.12 + 0.72 * t),
          a = -t * gt * 6.283 + ti * 2,
          sw = Math.abs(Math.sin(t * gt * 4 * Math.PI)), // between hooks the strand sags
          r = R(h) * 0.93 + 0.04;
        pts.push([x + Math.cos(a) * r, h - 0.18 * sw, zz + Math.sin(a) * r]);
      }
      const tube = __xmTube(pts, (_, d) => 0.016 + 0.01 * Math.abs(Math.sin(d * 60)), 6, 1);
      garland.add(tube, new _A(), 1);
      tube.dispose();
      // the star, facing a random way, leaning back a touch
      stars.push([__flM(x, H + 0.22 * s, zz, 0.3 * s, 0.3 * s, 0.3 * s, rnd() * 6.28, -0.1), null]);
      // presents round the trunk
      __xmPile(presents, x, zz, 6 + Math.round(s * 2), 0.6, 0.9 + 0.7 * s, rnd);
    });
    __xmInst(root, __flUnit('sph'), __flOwn(new ri({ color: '#ffffff', metalness: 0.65, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.6 })), baubles, 'frost_xm_baubles');
    __xmInst(root, __flUnit('cyl6'), __flOwn(new Gw({ color: '#ffffff', metalness: 0.9, roughness: 0.35 })), caps, 'frost_xm_caps');
    garland.count && __flMesh(root, garland.build(), __flOwn(new Gw({ color: '#e2b94e', metalness: 1, roughness: 0.28, emissive: '#3a2a08', emissiveIntensity: 0.6 })), 'frost_xm_garland', !1);
    const star = __XM.star || (__XM.star = __xmStarGeo(1, 0.42, 0.2));
    __xmInst(root, star, __flOwn(new Gw({ color: '#ffd36a', metalness: 0.7, roughness: 0.25, emissive: '#ffb22e', emissiveIntensity: 2.6 })), stars, 'frost_xm_stars');
  }
  // ---- giant presents (the crates in the spawns)
  for (const b of m.boxes)
    if (b.__cover === 'gift') {
      const k = presents.length;
      presents.push([(b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2, b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z, 0, ['#a8121c', '#1d5e34', '#1f3f8f', '#c99a2e'][k % 4], ['#e0b84a', '#e6e9ee', '#c4161c', '#e0b84a'][k % 4], k % 3]);
    }
  // ---- cabins
  __xmCabins(root, L.cabins, lights, presents, wreaths, smoke, icicles);
  // ---- lamp posts: candy-striped poles, a lamp, a wreath and a bow; the light strands hang from them
  const postTop = (p) => [p[0], 4.25, p[1]],
    candyMat = __flOwn(new ri({ map: __xmCandy(), roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
  {
    const B = __flMB(),
      pole = __xmTube(
        [
          [0, 0, 0],
          [0, 4.4, 0],
        ],
        0.085,
        14,
        0.55,
      );
    for (const [x, zz] of L.posts) {
      B.add(pole, __flM(x, 0, zz, 1, 1, 1));
      wreaths.push([x, 2.6, zz, zz > 64 ? Math.PI : 0, 0.5]); // hung round the pole
    }
    pole.dispose();
    __flMesh(root, B.build(), candyMat, 'frost_xm_posts');
    // lamp heads
    if (models.street_lamp_02) {
      const pp = __flParts(models.street_lamp_02);
      __xmGlow(pp.parts);
      __flInstance(
        root,
        pp.parts,
        L.posts.map(([x, zz]) => [x, 4.4, zz, 1.1, zz > 64 ? Math.PI : 0]),
        !1,
      );
    }
    // a gold ball on top of each pole
    __xmInst(root, __flUnit('sph'), __flOwn(new Gw({ color: '#e2b94e', metalness: 1, roughness: 0.2 })), L.posts.map(([x, zz]) => [__flM(x, 4.45, zz, 0.11, 0.11, 0.11), null]), 'frost_xm_finials');
  }
  const [N1, N2, C1, C2, S1, S2] = L.posts.map(postTop);
  // T spawn: an arch over the way to mid, strands to the back wall (crossing) and to the cabins
  lights.push([N1, N2, 0.7, 'multi'], [N1, S1, 1.0, 'multi'], [N2, S2, 1.0, 'multi'], [N1, S2, 1.2, 'warm'], [N2, S1, 1.2, 'warm'], [S1, S2, 0.6, 'multi']);
  lights.push([N1, [55.6, 2.55, 109.15], 0.25, 'warm'], [N2, [68.4, 2.55, 109.15], 0.25, 'warm']);
  // CT spawn: an arch over the gate to CT Mid, a strand to the cabin
  lights.push([C1, C2, 0.7, 'warm'], [C1, [57.9, 2.55, 8.25], 0.6, 'warm']);
  // the CT container: lights round its top edge
  for (const b of m.boxes)
    if (b.__cover === 'metal') {
      const y = b.max.y + 0.02,
        c = [[b.min.x, b.min.z], [b.max.x, b.min.z], [b.max.x, b.max.z], [b.min.x, b.max.z]];
      for (let i = 0; i < 4; i++) lights.push([[c[i][0], y, c[i][1]], [c[(i + 1) % 4][0], y, c[(i + 1) % 4][1]], 0.06, 'multi', 0.3]);
    }
  // across the lanes, hung from the rock itself: from a point in the lane, out along a direction to each wall
  const wallAt = (cx, cz, dx, dz, y, inset = 0) => {
    const l = Math.hypot(dx, dz);
    let s = 0;
    while (s < 30 && __flD(cx + (dx / l) * s, cz + (dz / l) * s) < 0) s += 0.05;
    const ex = cx + (dx / l) * s,
      ez = cz + (dz / l) * s,
      [gx, gz] = __flGrad(ex, ez),
      d = __flRockDepth(ex, y, ez, __flThick(ex, ez, gx, gz)) - inset;
    return [ex + gx * d, y, ez + gz * d];
  };
  const across = (cx, cz, dx, dz, y, sag, style) => lights.push([wallAt(cx, cz, -dx, -dz, y), wallAt(cx, cz, dx, dz, y), sag, style]);
  for (const [zz, cx] of [[52, 14.6], [66, 15], [80, 15.9]]) across(cx, zz, 1, zz === 66 ? -0.25 : 0.25, 5, 1.0, zz === 66 ? 'warm' : 'multi'); // A Long
  [[104.8, 82], [106.2, 86], [106.9, 90], [106.7, 94], [106.2, 98], [105.2, 102]].forEach(([x, zz], i) => across(x, zz, 1, i % 2 ? -0.35 : 0.35, 4.8, 0.8, i % 2 ? 'warm' : 'multi')); // Banana
  [[76, 60.8], [80, 61.5], [84, 60.5], [88, 59.5], [92, 60.3]].forEach(([x, zz], i) => across(x, zz, i % 2 ? -0.3 : 0.3, 1, 4.6, 0.5, 'multi')); // Crevasse
  across(62, 67.5, 1, 0.5, 6, 1.8, 'warm'); // Mid
  across(62, 67.5, 1, -0.5, 6, 1.8, 'multi');
  across(62, 36, 1, 0.3, 5.5, 0.9, 'warm'); // CT Mid
  across(61.5, 95, 1, -0.3, 5.5, 0.9, 'multi'); // T Mid
  across(84, 112, 0.2, 1, 5, 1.0, 'warm'); // Outside B
  // the ice tunnel: festoons along both walls just under the vault
  for (let zz = 50.5; zz < 72; zz += 3.5) {
    lights.push([wallAt(99.5, zz, -1, 0, 2.5, 0.05), wallAt(99.5, zz + 3.5, -1, 0, 2.5, 0.05), 0.25, 'multi', 0.26], [wallAt(99.5, zz, 1, 0, 2.5, 0.05), wallAt(99.5, zz + 3.5, 1, 0, 2.5, 0.05), 0.25, 'multi', 0.26]);
  }
  // the pavilion: scallops along its beam, and lights over each rib
  {
    const P = L.pavilion,
      xs = [P.x0 + 0.1, ...P.cols.map((c) => c[0]), P.x1 - 0.5],
      zb = P.cols[0][1] + 0.42;
    for (let i = 0; i < xs.length - 1; i++) lights.push([[xs[i], P.spring - 0.36, zb], [xs[i + 1], P.spring - 0.36, zb], 0.22, 'warm', 0.24]);
    for (const [x] of P.cols) for (let zz = P.z0 + 0.6; zz < P.z1 - 0.3; zz += 0.3) bulbs.push([x, __flPavC(zz) - 0.3, zz, __XM_MULTI[Math.round(zz * 3) % __XM_MULTI.length], 0.8]);
  }
  // the arches: a garland along each arch with lights in it, and a wreath on the keystone, both faces
  for (const a of L.arches) {
    const o = __flArch(a),
      mid = (o.s0 + o.s1) / 2;
    for (const side of [1, -1]) {
      const pts = [];
      for (let s = o.s0 + 0.05; s <= o.s1 - 0.05; s += 0.1) {
        const t = (s - mid) / ((o.s1 - o.s0) / 2),
          y = o.under(s) + 0.62 + 0.25 * (1 - t * t);
        pts.push([o.cx + o.tx * s + o.nx * side * 0.64, y, o.cz + o.tz * s + o.nz * side * 0.64]);
      }
      garlands.push(pts);
      wreaths.push([o.cx + o.nx * side * 0.66, o.spring + o.rise + 0.28, o.cz + o.nz * side * 0.66, Math.atan2(o.nx * side, o.nz * side), 0.55]);
    }
  }
  // the tunnel's portals too
  for (const p of __flPortals(L.caves.tunnel)) {
    const pts = [],
      c = L.caves.tunnel;
    for (let s = -0.2; s <= p.s1 - p.s0 + 0.2; s += 0.1) {
      const x = p.ax + p.tx * s,
        zz = p.az + p.tz * s;
      if (__flD(x - p.nx * 0.3, zz - p.nz * 0.3) > 0) continue;
      pts.push([x + p.nx * 0.2, __flCeil(c, x - p.nx * 0.3, zz - p.nz * 0.3) + 0.55, zz + p.nz * 0.2]);
    }
    pts.length > 4 && garlands.push(pts);
  }
  // ---- the caverns' interiors (64-frostline-rooms.js): they add lights, presents and wreaths of their own
  try {
    __flRooms(root, models, ticks, lights, bulbs, presents, wreaths);
  } catch (e) {
    console.warn('[frostline] rooms', e);
  }
  // ---- build the strands: bulbs plus a thin wire each
  const wire = __flMB();
  for (const [a, b, sag, style, spacing = 0.33] of lights) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
      n = Math.max(2, Math.round(len / spacing)),
      pts = [];
    for (let i = 0; i <= 24; i++) pts.push(__xmSag(a, b, sag, i / 24));
    const tube = __xmTube(pts, 0.007, 4, 1);
    wire.add(tube, new _A(), 1);
    tube.dispose();
    for (let i = 1; i < n; i++) {
      const p = __xmSag(a, b, sag, i / n);
      bulbs.push([p[0], p[1] - 0.045, p[2], style === 'warm' ? __XM_WARM[i % 3] : __XM_MULTI[(i + Math.round(a[0])) % __XM_MULTI.length], 1]);
    }
  }
  wire.count && __flMesh(root, wire.build(), __flOwn(new Gw({ color: '#10220f', roughness: 0.7 })), 'frost_xm_wires', !1);
  // garlands: bushy fir ropes (lumpy tubes) with lights woven through and red bows where they start and end
  if (garlands.length) {
    const G = __flMB(),
      bows = [];
    for (const pts of garlands) {
      const t = __xmTube(pts, (_, d) => 0.1 + 0.035 * Math.sin(d * 23) + 0.025 * Math.sin(d * 57 + 1), 7, 0.5),
        q = t.attributes.position;
      // needles: push every vertex out a little at random, for a bristly silhouette
      for (let i = 0; i < q.count; i++) {
        const x = q.getX(i),
          y = q.getY(i),
          z = q.getZ(i),
          o = 0.03 * (__flH3(x * 31, y * 31, z * 31) - 0.5);
        q.setXYZ(i, x + o, y + o, z - o);
      }
      t.computeVertexNormals();
      G.add(t, new _A(), [0.05, 0.17, 0.07]);
      t.dispose();
      for (let i = 2; i < pts.length - 2; i += 3) bulbs.push([pts[i][0], pts[i][1] - 0.06, pts[i][2], __XM_MULTI[i % __XM_MULTI.length], 0.8]);
      bows.push(pts[0], pts[pts.length - 1]);
    }
    __flMesh(root, G.build(), __flOwn(new Gw({ color: '#ffffff', roughness: 0.9, vertexColors: !0 })), 'frost_xm_garlands', !1);
    __XM.bowPts = bows;
  }
  if (bulbs.length) {
    const bm = __xmBulbMat();
    __xmInst(root, __flUnit('sph4'), bm, bulbs.map(([x, y, z, c, s]) => [__flM(x, y, z, 0.03 * s, 0.045 * s, 0.03 * s), c]), 'frost_xm_bulbs');
    ticks.push((dt) => {
      bm.__u.uT.value += Math.min(dt, 0.1);
      const tod = Zw.getState().timeOfDay;
      bm.__u.uI.value = tod === 'night' ? 5 : tod === 'dusk' ? 3.6 : 2.4;
    });
  }
  // ---- snowmen, candy canes, wreaths
  __xmSnowmen(root, L.snowmen);
  {
    // in pairs either side of the ways out of the spawns and the chokes, 35 cm off the rock
    const canes = [];
    for (const [cx, cz, dx, dz] of [[62, 104.6, 1, 0], [62, 18.2, 1, 0], [15.5, 96.5, 1, 0], [100, 45, 1, 0], [45.5, 109, 0, 1], [83.6, 112, 0, 1], [62, 81, 1, 0]])
      for (const side of [1, -1]) {
        const [x, , zz] = wallAt(cx, cz, dx * side, dz * side, 0.3, 0.45);
        canes.push([x, zz, Math.atan2(-dx * side, -dz * side) + (rnd() - 0.5) * 0.6]);
      }
    __xmInst(root, __xmCaneGeo(), candyMat, canes.map(([x, zz, r]) => [__flM(x, -0.05, zz, 1.15, 1.15, 1.15, r, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.12), null]), 'frost_xm_canes', !0);
    // wreaths on the container doors too
    for (const b of m.boxes) b.__cover === 'metal' && wreaths.push(b.max.x - b.min.x >= b.max.z - b.min.z ? [b.max.x + 0.12, 1.5, (b.min.z + b.max.z) / 2, Math.PI / 2, 0.8] : [(b.min.x + b.max.x) / 2, 1.5, b.max.z + 0.12, 0, 0.8]);
    __xmInst(root, __xmWreathGeo(), __flOwn(new Gw({ color: '#ffffff', roughness: 0.85, vertexColors: !0 })), wreaths.map(([x, y, z, r, s]) => [__flM(x, y, z, s * 1.6, s * 1.6, s * 1.6, r), null]), 'frost_xm_wreaths');
  }
  // ---- presents (round the trees, on cabin steps, the giant ones, a few on the A deck and in the Ice Hall)
  __xmPile(presents, 14.5, 26.5, 3, 0, 0.6, rnd, 2.2);
  __xmPile(presents, 116.6, 21.4, 5, 0, 0.9, rnd); // in the pavilion's back corner
  __xmPresents(root, presents);
  // ---- the campfire
  {
    const [x, zz] = L.firePit;
    models.stone_fire_pit && __flInstance(root, __flParts(models.stone_fire_pit).parts, [[x, 0, zz, 1, 0.4]], !0);
    const B = __flMB();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 6.28;
      B.add(__flUnit('cyl'), __flM(x + Math.cos(a) * 0.18, 0.28, zz + Math.sin(a) * 0.18, 0.055, 0.7, 0.055, -a, 0, 0.9), k % 2 ? [0.12, 0.08, 0.05] : [0.05, 0.04, 0.03]);
    }
    __flMesh(root, B.build(), __flOwn(new Gw({ color: '#ffffff', roughness: 0.95, vertexColors: !0, emissive: '#4a1404', emissiveIntensity: 0.6 })), 'frost_xm_firelogs');
    __xmFire(root, x, 0.12, zz, ticks);
    models.tree_stump_01 && __flInstance(root, __flParts(models.tree_stump_01).parts, [[x - 2.1, -0.05, zz + 0.2, 0.55, 0.5], [x + 2.1, -0.05, zz + 0.1, 0.55, 2.1]], !0);
  }
  // ---- chimney smoke
  for (const p of smoke) {
    const t = __xmRising(root, p, low ? 10 : 22, { color: '#c8ccd2', size: 1.1, rise: 6, spread: 0.6, life: 7, opacity: 0.32, grow: 1.6 });
    ticks.push((dt) => (t.value += Math.min(dt, 0.1)));
  }
  // ---- icicles from the cabins
  __flIcicles(root, icicles);
  // ---- lanterns (lit), lamps in the hidden rooms and the tunnel, and Poly Haven props round the spawns
  if (models.wooden_lantern_01) {
    const pp = __flParts(models.wooden_lantern_01);
    __xmGlow(pp.parts);
    const list = [[20, 2.55, 32, 1.4, 0.3], [96, 2.6, 30, 1.4, 1], [61.5, 2.6, 67, 1.4, 2], [12.6, 2.2, 21.8, 1.4, 0.2], [16.5, 2.2, 28.4, 1.4, 1.3], [60.75, 1.3, 112.75, 1.4, 0.4]];
    for (const [x0, , z0, x1, , z1] of [].concat(L.cabins.map((c) => [c[0], 0, c[1], c[2], 0, c[3]])))
      list.push([(x0 + x1) / 2 - 0.9, 0, z1 + 0.3, 1.3, 0.4], [(x0 + x1) / 2 + 0.9, 0, z1 + 0.3, 1.3, 2.4]);
    __flInstance(root, pp.parts, list, !1);
  }
  // lanterns hanging on chains from the tunnel's vault and the pavilion's: [x, ceiling, z]
  if (models.wooden_lantern_01) {
    const t = L.caves.tunnel,
      at = [[99.5, __flCeil(t, 99.5, 55), 55], [99.2, __flCeil(t, 99.2, 63), 63], [99, __flCeil(t, 99, 70.5), 70.5], [107, __flPavC(24.7), 24.7], [111.6, __flPavC(24.7), 24.7], [116, __flPavC(24.7), 24.7]];
    __xmHang(root, models, at);
  }
  const deco = (name, list) => models[name] && list.length && __flInstance(root, __flParts(models[name]).parts, list, !0);
  deco('barrel_stove', [[58.6, 0, 4.9, 1, 0.3]]);
  deco('wooden_barrels_01', [[13.9, 0, 111.2, 1, 0.4]]);
  deco('wooden_bucket_01', [[48.6, 0, 108.8, 1, 0.4], [75.4, 0, 108.6, 1, 2], [55.4, 0, 8.0, 1, 1.1]]);
  deco('wooden_crate_01', [[56.2, 0, 104.4, 1, 1.57], [75.6, 0, 104.6, 1, 0.1], [51.9, 0, 8.3, 1, 0.2]]);
  deco('cardboard_box_01', [[67.4, 0, 12.0, 1.4, 0.5], [68.2, 0, 12.1, 1.4, 1.8], [67.8, 0.47, 12.05, 1.4, 1.0]]);
  deco('ammo_box', [[52.6, 1.3, 13.4, 1.6, 0.2], [27.1, 1.3, 25.6, 1.6, 1.4], [104.5, 1.3, 37.5, 1.6, 2.2]]);
}
// lamp and lantern glass: lit (warm, blooming)
function __xmGlow(parts) {
  const lit = __XM.lit || (__XM.lit = new Gw({ color: '#ffd9a0', emissive: '#ffb04a', emissiveIntensity: 2.6, roughness: 0.2 }));
  for (const p of parts) /glass/i.test(p.mat.name || '') && (p.mat = lit);
}

// lanterns hung on chains: [x, ceiling height, z]; the lantern's base 1.75 m below the ceiling (at most 3.4 m up)
function __xmHang(root, models, at) {
  if (!models.wooden_lantern_01 || !at.length) return;
  const pp = __flParts(models.wooden_lantern_01);
  __xmGlow(pp.parts);
  const base = at.map(([x, y, z]) => [x, Math.min(3.4, y - 1.75), z]);
  __flInstance(root, pp.parts, base.map(([x, y, z]) => [x, y, z, 1.3, 0]), !1);
  __xmInst(root, __flUnit('cyl6'), __FL.chainMat || (__FL.chainMat = new Gw({ color: '#222', metalness: 0.8, roughness: 0.5 })), at.map(([x, y, z], i) => {
    const b = base[i][1] + 0.69;
    return [__flM(x, (y + b) / 2 + 0.05, z, 0.008, y - b + 0.1, 0.008), null];
  }), 'frost_xm_chains');
}
