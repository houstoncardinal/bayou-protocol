/* ===== Bayou Protocol mod: Blackwater Penitentiary in 3D (architecture and metalwork) ===== */
// The shapes 35-prison.js records in A.__pr, modelled (each inside its collision box, so what you see is what
// you hit):
//   - cell fronts: round steel bars on flat straps, sliding doors (racked open, shut, or locked with a lock
//     box: the Jailbreak cells' doors slide open when the lock is cut), turnstile rails
//   - chain-link fences (a see-through mesh) on round posts, with outriggers carrying razor wire coils;
//     razor wire coils along the wall tops
//   - tube rails (with a mesh infill on the cell house galleries), open steel stairs (plate treads on
//     stringers, handrails), the galleries' steel beams and brackets
//   - the cell house: a barrel vault (plastered inside, metal roof outside) with steel arch trusses and a
//     glazed skylight along the crown, brick gables with a lunette window, a brick cornice
//   - stone: arched window heads and door surrounds on the old buildings, the gatehouse's pointed-arch
//     portals with the prison's name, its crenellated parapet and octagonal turrets with spires
//   - the perimeter wall's pilasters and coping, cornices and sills on the newer buildings, painted lines
// Shared helpers for 66b-prison-props.js too.
const __prK = (h) => {
  const c = new UA(h);
  return [c.r, c.g, c.b];
};
const __prQ = new Kw(),
  __prUp = new U(0, 1, 0);
// unit shapes with a white colour attribute (the materials use vertex colours)
function __prUnit(k) {
  const P = __prUnit.c || (__prUnit.c = {});
  if (P[k]) return P[k];
  const g =
    k === 'box' ? new _i(1, 1, 1)
    : k === 'cyl' ? new Rw(1, 1, 1, 10, 1)
    : k === 'cyl8' ? new Rw(1, 1, 1, 8, 1, !0)
    : k === 'cyl16' ? new Rw(1, 1, 1, 18, 1)
    : k === 'cyl6' ? new Rw(1, 1, 1, 6, 1)
    : k === 'cone8' ? new Oc(1, 1, 8, 1)
    : k === 'sph' ? new bi(1, 14, 10)
    : k === 'hemi' ? new bi(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2)
    : k === 'tor' ? new oI(1, 0.08, 6, 28)
    : k === 'oct' ? new Rw(1, 1, 1, 8, 1).rotateY(Math.PI / 8)
    : k === 'tyre' ? new oI(1, 0.34, 8, 22)
    : null;
  const n = g.attributes.position.count;
  g.setAttribute('color', new gi(new Float32Array(n * 3).fill(1), 3));
  g.__shared = 1;
  return (P[k] = g);
}
// rounded box (mattresses, pads, seats), unit-free: w x h x d with edge radius r
function __prRBox(w, h, d, r, seg = 3) {
  const key = [w, h, d, r, seg].map((v) => v.toFixed(3)).join(','),
    P = __prRBox.c || (__prRBox.c = {});
  if (P[key]) return P[key];
  const g = new _i(w, h, d, seg * 2, seg * 2, seg * 2),
    p = g.attributes.position,
    n = g.attributes.normal,
    hx = w / 2 - r,
    hy = h / 2 - r,
    hz = d / 2 - r,
    v = new U(),
    c = new U();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
    v.sub(c);
    const L = v.length() || 1;
    v.multiplyScalar(1 / L);
    n.setXYZ(i, v.x, v.y, v.z);
    p.setXYZ(i, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r);
  }
  g.setAttribute('color', new gi(new Float32Array(p.count * 3).fill(1), 3));
  g.__shared = 1;
  return (P[key] = g);
}
// a matrix for a box (corners), a cylinder between two points, or a placed shape
const __prBM = (x0, y0, z0, x1, y1, z1) => new _A().compose(new U((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), new Kw(), new U(Math.max(1e-4, Math.abs(x1 - x0)), Math.max(1e-4, Math.abs(y1 - y0)), Math.max(1e-4, Math.abs(z1 - z0))));
function __prCM(a, b, r, r2 = r) {
  const d = new U(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
    L = d.length() || 1e-4;
  __prQ.setFromUnitVectors(__prUp, d.multiplyScalar(1 / L));
  return new _A().compose(new U((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), __prQ, new U(r, L, r2));
}
// a set of mesh builders, one per material key (one draw call each: this map's frames are limited by draw
// calls, not by triangles); build() makes the meshes. Small things cast no shadow.
const __PR_NOCAST = new Set(['rod', 'glow', 'glass', 'glassL', 'mesh', 'net', 'coil', 'cloth', 'stainless', 'dark', 'court', 'wood', 'mud']);
function __prSet() {
  const B = {},
    v = new U(),
    T = 1e9;
  return {
    b: (k) => B[k + '|0,0'] || (B[k + '|0,0'] = __flMB()),
    add(k, geo, M, col) {
      v.fromBufferAttribute(geo.attributes.position, 0).applyMatrix4(M);
      const key = k + '|' + Math.floor(v.x / T) + ',' + Math.floor(v.z / T);
      (B[key] || (B[key] = __flMB())).add(geo, M, col);
    },
    box(k, x0, y0, z0, x1, y1, z1, col) {
      this.add(k, __prUnit('box'), __prBM(x0, y0, z0, x1, y1, z1), col);
    },
    cyl(k, a, b, r, col, u = 'cyl') {
      // thin rods (bars, rails, wires) cast no shadow: thousands of them, and their shadows cost more than
      // they show
      this.add(r < 0.03 && k === 'paint' ? 'rod' : k, __prUnit(u), __prCM(a, b, r), col);
    },
    build(root, mats, prefix, cast = !0) {
      let tris = 0;
      for (const key in B) {
        if (!B[key].count) continue;
        const k = key.split('|')[0],
          g = B[key].build();
        tris += g.index.count / 3;
        __flMesh(root, g, mats(k), prefix + k, cast && !__PR_NOCAST.has(k));
      }
      return tris;
    },
  };
}
// ---------------------------------------------------------------- canvas textures
function __prCanvas(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new LI(cv);
  t.wrapS = t.wrapT = 1e3;
  t.anisotropy = 8;
  t.colorSpace = 'srgb';
  return t;
}
// chain-link: galvanised wire diamonds (alpha)
const __prChainTex = () =>
  __PR.chainTex ||
  (__PR.chainTex = __prCanvas(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#c9ced2';
    c.lineWidth = 5;
    c.lineCap = 'round';
    for (const [a, b, e, f] of [[0, h / 2, w / 2, 0], [w / 2, 0, w, h / 2], [w, h / 2, w / 2, h], [w / 2, h, 0, h / 2]]) c.beginPath(), c.moveTo(a, b), c.lineTo(e, f), c.stroke();
    c.strokeStyle = 'rgba(80,86,90,0.6)';
    c.lineWidth = 1.5;
    for (const [a, b, e, f] of [[0, h / 2, w / 2, 0], [w / 2, h, 0, h / 2]]) c.beginPath(), c.moveTo(a + 2, b + 2), c.lineTo(e + 2, f + 2), c.stroke();
  }));
// razor wire seen from the side: overlapping loops with barbs (alpha), wrapped round a cylinder
const __prCoilTex = () =>
  __PR.coilTex ||
  (__PR.coilTex = __prCanvas(256, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let k = 0; k < 9; k++) {
      const x = (k / 9) * w + 6;
      c.strokeStyle = k % 2 ? '#aab0b4' : '#8c9297';
      c.lineWidth = 3.5;
      c.beginPath();
      c.ellipse(x, h / 2, 26, h / 2 - 4, 0.35, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#b8bec2';
      for (let b = 0; b < 8; b++) {
        const a = (b / 8) * Math.PI * 2,
          px = x + Math.cos(a) * 26 * Math.cos(0.35) - Math.sin(a) * (h / 2 - 4) * Math.sin(0.35),
          py = h / 2 + Math.cos(a) * 26 * Math.sin(0.35) + Math.sin(a) * (h / 2 - 4) * Math.cos(0.35);
        c.beginPath();
        c.moveTo(px - 5, py - 1.5);
        c.lineTo(px + 5, py + 1.5);
        c.lineTo(px + 5, py - 1);
        c.closePath();
        c.fill();
      }
    }
  }));
function __prAlphaMat(tex, color, rep, o = {}) {
  const m = new Gw({ color, map: tex, alphaTest: 0.45, side: 2, metalness: o.metal ?? 0.6, roughness: o.rough ?? 0.45, envMapIntensity: 0.8 });
  m.__prOwn = 1;
  return __prLit(m);
}
// quads with uv (for the alpha meshes): a vertical panel from a to b (x, z), y0..y1, uv in repeats of rep
function __prPanel(MB, ax, az, bx, bz, y0, y1, rep, col = 1) {
  const L = Math.hypot(bx - ax, bz - az),
    nx = -(bz - az) / (L || 1),
    nz = (bx - ax) / (L || 1),
    g = new uw(),
    u1 = L / rep,
    v1 = (y1 - y0) / rep;
  g.setAttribute('position', new gi(new Float32Array([ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y1, az]), 3));
  g.setAttribute('normal', new gi(new Float32Array([nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz]), 3));
  g.setAttribute('uv', new gi(new Float32Array([0, 0, u1, 0, u1, v1, 0, v1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  MB.add(g, new _A(), col);
}
// a quad a-b-c-d (counter-clockwise seen from its front) with a colour: a number or [r, g, b]
function __prQuadRaw(MB, a, b, c, d, col = 1) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]],
    n = new U(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]);
  if (n.lengthSq() < 1e-18) return;
  n.normalize();
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array([...a, ...b, ...c, ...d]), 3));
  g.setAttribute('normal', new gi(new Float32Array([n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  MB.add(g, new _A(), col);
}
// a quad facing along n (the corners are put in the right order whichever way they were given). A quad whose
// last corner is its first is a triangle (fans): it gets its own normal (a zero normal shades as NaN, and the
// bloom pass smears NaN over the whole screen)
function __prQuad(MB, a, b, c, d, n, col = 1) {
  const tri = Math.abs(d[0] - a[0]) + Math.abs(d[1] - a[1]) + Math.abs(d[2] - a[2]) < 1e-6,
    q = tri ? c : d,
    e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    e2 = [q[0] - a[0], q[1] - a[1], q[2] - a[2]],
    cx = e1[1] * e2[2] - e1[2] * e2[1],
    cy = e1[2] * e2[0] - e1[0] * e2[2],
    cz = e1[0] * e2[1] - e1[1] * e2[0],
    L = Math.hypot(cx, cy, cz);
  if (L < 1e-9) return;
  if (!tri) return cx * n[0] + cy * n[1] + cz * n[2] >= 0 ? __prQuadRaw(MB, a, b, c, d, col) : __prQuadRaw(MB, a, d, c, b, col);
  const flip = cx * n[0] + cy * n[1] + cz * n[2] < 0,
    s = flip ? -1 / L : 1 / L,
    P = flip ? [...a, ...c, ...b] : [...a, ...b, ...c],
    g = new uw();
  g.setAttribute('position', new gi(new Float32Array(P), 3));
  g.setAttribute('normal', new gi(new Float32Array([cx * s, cy * s, cz * s, cx * s, cy * s, cz * s, cx * s, cy * s, cz * s]), 3));
  MB.add(g, new _A(), col);
}
// a box along a direction in a wall plane: centre p, length along u, thickness along v, depth along the normal
function __prBasisM(p, u, v, L, T, Dp) {
  const n = new U().crossVectors(u, v).normalize();
  return new _A().makeBasis(u.clone().normalize(), v.clone().normalize(), n).scale(new U(L, T, Dp)).setPosition(p[0], p[1], p[2]);
}
// ---------------------------------------------------------------- metalwork
function __prBars(S, R, leaves) {
  const sp = 0.115,
    r = 0.0125;
  for (const [bi2, b] of R.bars.entries()) {
    const col = __prK(b.style === 'turnstile' ? '#8f979c' : '#55625f'),
      at = (a, y) => (b.alongX ? [a, y, b.f] : [b.f, y, a]),
      bx = (a0, y0, a1, y1, t, d = 0) => (b.alongX ? S.box('paint', a0, y0, b.f - t + d, a1, y1, b.f + t + d, col) : S.box('paint', b.f - t + d, y0, a0, b.f + t + d, y1, a1, col));
    const cut = b.gap || b.door,
      segs = cut ? [[b.a0, cut[0]], [cut[1], b.a1]] : [[b.a0, b.a1]];
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.05) continue;
      const n = Math.max(1, Math.round((s1 - s0) / sp));
      for (let i = 0; i <= n; i++) {
        const a = s0 + ((s1 - s0) * i) / n;
        S.cyl('paint', at(a, b.y0), at(a, b.y0 + b.h), r, col, 'cyl8');
      }
      for (const yy of b.style === 'turnstile' ? [b.y0 + 0.05, b.y0 + b.h - 0.03] : [b.y0 + 0.08, b.y0 + 1.1, b.y0 + b.h - 0.08]) bx(s0 - 0.01, yy - 0.025, s1 + 0.01, yy + 0.025, 0.02);
      // frame posts at the ends
      b.style !== 'turnstile' && (bx(s0 - 0.03, b.y0, s0 + 0.03, b.y0 + b.h, 0.03), bx(s1 - 0.03, b.y0, s1 + 0.03, b.y0 + b.h, 0.03));
    }
    if (b.style === 'turnstile') {
      for (const a of [b.a0, b.a1]) S.cyl('paint', at(a, 0), at(a, b.h + 0.02), 0.03, col);
      continue;
    }
    // the door's lock box and its track along the top
    const dr = b.door || b.gap || b.shut;
    if (dr) {
      const lockA = dr[1] + 0.04,
        s = b.side || 1,
        d = -s * 0.07;
      bx(lockA - 0.06, b.y0 + 0.95, lockA + 0.08, b.y0 + 1.3, 0.05, d);
      bx(dr[0] - 0.9, b.y0 + b.h - 0.12, dr[1] + 0.1, b.y0 + b.h - 0.02, 0.05, d);
    }
    // a door leaf: racked open (beside its opening, behind the fixed bars), or a locked door of its own
    const leaf = (a0, a1, G, off) => {
      const n = Math.round((a1 - a0) / sp);
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        G.cyl('paint', b.alongX ? [a, b.y0 + 0.03, b.f + off] : [b.f + off, b.y0 + 0.03, a], b.alongX ? [a, b.y0 + b.h - 0.14, b.f + off] : [b.f + off, b.y0 + b.h - 0.14, a], r, col, 'cyl8');
      }
      for (const yy of [b.y0 + 0.08, b.y0 + 1.1, b.y0 + b.h - 0.16]) b.alongX ? G.box('paint', a0 - 0.02, yy - 0.025, b.f + off - 0.02, a1 + 0.02, yy + 0.025, b.f + off + 0.02, col) : G.box('paint', b.f + off - 0.02, yy - 0.025, a0 - 0.02, b.f + off + 0.02, yy + 0.025, a1 + 0.02, col);
    };
    b.racked && leaf(b.racked[0], b.racked[1], S, -(b.side || 1) * 0.07);
    if (b.door) {
      const G = __prSet();
      leaf(b.door[0], b.door[1], G, 0);
      leaves.push({ bar: bi2, set: G, axis: b.alongX ? 'x' : 'z', dist: -(b.door[1] - b.door[0] - 0.05), off: -(b.side || 1) * 0.07 });
    }
  }
}
function __prFences(S, R, chainB) {
  const col = __prK('#8d959b');
  for (const f of R.fences) {
    const at = (a, y, d = 0) => (f.alongX ? [a, y, f.f + d] : [f.f + d, y, a]);
    for (const [s0, s1] of f.segs) {
      const A0 = at(s0, 0),
        A1 = at(s1, 0);
      __prPanel(chainB, A0[0], A0[2], A1[0], A1[2], 0.05, f.h - 0.02, 0.6);
      const n = Math.max(1, Math.round((s1 - s0) / 3));
      for (let i = 0; i <= n; i++) {
        const a = s0 + ((s1 - s0) * i) / n,
          end = i === 0 || i === n;
        S.cyl('paint', at(a, 0), at(a, f.h + 0.05), end ? 0.05 : 0.04, col);
        S.add('paint', __prUnit('sph'), new _A().compose(new U(...at(a, f.h + 0.06)), new Kw(), new U(0.05, 0.035, 0.05)), col);
        // outriggers: a V of arms carrying three strands and the coil
        for (const sd of [-1, 1]) S.cyl('paint', at(a, f.h), at(a, f.h + 0.5, sd * 0.3), 0.018, col);
      }
      S.cyl('paint', at(s0, f.h - 0.02), at(s1, f.h - 0.02), 0.022, col);
      S.cyl('paint', at(s0, 0.08), at(s1, 0.08), 0.007, col);
      for (const sd of [-1, 1]) S.cyl('paint', at(s0, f.h + 0.5, sd * 0.3), at(s1, f.h + 0.5, sd * 0.3), 0.004, col, 'cyl6');
      R.__coils.push({ a: at(s0, f.h + 0.4), b: at(s1, f.h + 0.4), r: 0.26 });
    }
  }
}
// razor wire along wall tops (two coils side by side and one on top on the perimeter)
function __prWire(S, R) {
  const col = __prK('#7d8489');
  for (const w of R.wire) {
    const alongX = w.x1 - w.x0 >= w.z1 - w.z0,
      c = alongX ? (w.z0 + w.z1) / 2 : (w.x0 + w.x1) / 2,
      a0 = alongX ? w.x0 : w.z0,
      a1 = alongX ? w.x1 : w.z1,
      at = (a, y, d = 0) => (alongX ? [a, y, c + d] : [c + d, y, a]);
    if (w.double) {
      for (const d of [-0.27, 0.27]) R.__coils.push({ a: at(a0, w.y + 0.28, d), b: at(a1, w.y + 0.28, d), r: 0.27 });
      R.__coils.push({ a: at(a0, w.y + 0.72, 0), b: at(a1, w.y + 0.72, 0), r: 0.27 });
    } else R.__coils.push({ a: at(a0, w.y + 0.28), b: at(a1, w.y + 0.28), r: 0.27 });
    for (let a = a0 + 1.5; a < a1; a += 3) S.cyl('paint', at(a, w.y), at(a, w.y + (w.double ? 0.95 : 0.55)), 0.012, col);
  }
}
// the coils: open cylinders wrapped in the razor wire texture (cheap, and reads right from any side)
function __prCoils(root, R) {
  const MB = __flMB(),
    seg = 7;
  for (const c of R.__coils) {
    const L = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1], c.b[2] - c.a[2]);
    if (L < 0.2) continue;
    const g = new Rw(c.r, c.r, 1, seg, 1, !0),
      uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * (L / 0.62));
    MB.add(g, __prCM(c.a, c.b, 1, 1));
    g.dispose();
  }
  MB.count && __flMesh(root, MB.build(), __prAlphaMat(__prCoilTex(), '#c4c9cc', 1, { metal: 0.7, rough: 0.35 }), 'prison_coil', !1);
}
// rails: tubes, posts, a kick plate; a mesh infill on the galleries
function __prRails(S, R, meshB) {
  for (const r of R.rails) {
    const col = __prK(r.color || '#2f5876'),
      L = Math.hypot(r.x1 - r.x0, r.z1 - r.z0);
    if (L < 0.05) continue;
    const y = r.y,
      top = y + r.h - 0.025;
    S.cyl('paint', [r.x0, top, r.z0], [r.x1, top, r.z1], 0.025, col);
    S.cyl('paint', [r.x0, y + 0.52, r.z0], [r.x1, y + 0.52, r.z1], 0.016, col);
    const n = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= n; i++) {
      const t = i / n,
        x = r.x0 + (r.x1 - r.x0) * t,
        zz = r.z0 + (r.z1 - r.z0) * t;
      S.cyl('paint', [x, y, zz], [x, top, zz], 0.022, col);
    }
    const ux = (r.x1 - r.x0) / L,
      uz = (r.z1 - r.z0) / L;
    S.add('paint', __prUnit('box'), new _A().compose(new U((r.x0 + r.x1) / 2, y + 0.06, (r.z0 + r.z1) / 2), __prQ.setFromAxisAngle(__prUp, Math.atan2(-uz, ux)).clone(), new U(L, 0.12, 0.012)), col);
    // the galleries: vertical balusters (a mesh infill shimmers at a distance)
    if (r.mesh) {
      const nb = Math.max(1, Math.round(L / 0.12));
      for (let i = 1; i < nb; i++) {
        const t = i / nb,
          x = r.x0 + (r.x1 - r.x0) * t,
          zz = r.z0 + (r.z1 - r.z0) * t;
        S.cyl('paint', [x, y + 0.12, zz], [x, top, zz], 0.009, col, 'cyl8');
      }
    }
    void meshB;
  }
}
// open steel stairs on the core's stepped collision (35-prison.js stair(): ce())
function __prStairs(S, R) {
  const plate = __prK('#b2b8bb'),
    paint = __prK('#3f4b52'),
    rail = __prK('#2f5876');
  for (const st of R.stairs) {
    const n = Math.max(1, Math.round((st.y1 - st.y0) / 0.2)),
      C = (st.y1 - st.y0) / n,
      o = 0.28,
      w = st.w,
      // a point on the stair: along (run from the foot, m), across (0..w), height
      P = (along, across, y) => (st.dir === 'N' ? [st.x + across, y, st.z - along] : st.dir === 'S' ? [st.x + across, y, st.z + along] : st.dir === 'E' ? [st.x + along, y, st.z + across] : [st.x - along, y, st.z + across]);
    for (let c = 0; c < n; c++) {
      const t = st.y0 + (c + 1) * C,
        p0 = P(c * o, 0, t - 0.04),
        p1 = P((c + 1) * o, w, t);
      S.box('plate', Math.min(p0[0], p1[0]), t - 0.04, Math.min(p0[2], p1[2]), Math.max(p0[0], p1[0]), t, Math.max(p0[2], p1[2]), plate);
      // a nosing
      const q0 = P(c * o, 0.02, t - 0.07),
        q1 = P(c * o + 0.03, w - 0.02, t);
      S.box('paint', Math.min(q0[0], q1[0]), t - 0.07, Math.min(q0[2], q1[2]), Math.max(q0[0], q1[0]), t - 0.03, Math.max(q0[2], q1[2]), __prK('#d6ad2a'));
    }
    // stringers (channels along both sides) and handrails
    const run = n * o;
    for (const across of [-0.02, w + 0.02]) {
      const a = P(0, across, st.y0 - 0.1),
        b = P(run, across, st.y1 - 0.06),
        d = new U(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
        L = d.length();
      d.normalize();
      const side = new U(...P(0, 1, 0)).sub(new U(...P(0, 0, 0))).normalize(),
        up = new U().crossVectors(side, d).normalize(),
        M = new _A().makeBasis(d, up, side);
      M.scale(new U(L, 0.26, 0.02)).setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      S.add('paint', __prUnit('box'), M, paint);
      if (st.rails === 'both' || across > 0) {
        const h = 0.92,
          r0 = P(0, across, st.y0 + h + C),
          r1 = P(run, across, st.y1 + h);
        S.cyl('paint', r0, r1, 0.022, rail);
        for (const k of [0, 0.5, 1]) {
          const pa = P(run * k, across, st.y0 + (st.y1 - st.y0) * k + (k ? 0 : C)),
            pb = [pa[0], pa[1] + h, pa[2]];
          S.cyl('paint', pa, pb, 0.02, rail);
        }
      }
    }
  }
}
// gallery steel: an I-beam along each gallery edge, brackets under it at every cell wall, a yellow edge
function __prGallery(S, R) {
  const steel = __prK('#3f4b52');
  for (const g of R.gallery) {
    const y = g.y - 0.25,
      e = g.edge,
      s = g.s;
    S.box('paint', e - 0.07, y - 0.32, g.z0, e + 0.07, y, g.z1, steel);
    S.box('paint', e - 0.12, y - 0.34, g.z0, e + 0.12, y - 0.32, g.z1, steel);
    S.box('paint', Math.min(e, e - s * 0.03), g.y - 0.12, g.z0, Math.max(e, e - s * 0.03), g.y + 0.002, g.z1, __prK('#d6ad2a'));
    for (let zz = g.z0 + 0.1; zz <= g.z1; zz += 2.8) {
      const a = [g.front, y - 0.05, zz],
        b = [e, y - 0.05, zz];
      S.box('paint', Math.min(g.front, e), y - 0.12, zz - 0.05, Math.max(g.front, e), y, zz + 0.05, steel);
      S.cyl('paint', [g.front, y - 0.95, zz], [e - s * 0.08, y - 0.12, zz], 0.035, steel);
    }
  }
}
// ---------------------------------------------------------------- the cell house vault
function __prVault(root, S, R, m) {
  const V = R.vault;
  if (!V) return;
  const { x0, x1, z0, z1 } = V,
    nx = 64,
    Y = (x) => __prVaultY(V, x),
    // inner surface (plaster, faces down), outer roof (metal, faces up), with the skylight cut out
    inner = __flMB(),
    outer = __flMB(),
    glass = __flMB(),
    cIn = __prK('#d9d2c0'),
    cOut = __prK('#5d6a6a');
  const strip = (MB, xa, xb, ya, yb, zA, zB, up, col) => {
    const k = MB.count;
    up ? MB.quad([xa, ya, zA], [xa, ya, zB], [xb, yb, zB], [xb, yb, zA], col) : MB.quad([xa, ya, zA], [xb, yb, zA], [xb, yb, zB], [xa, ya, zB], col);
    return k;
  };
  for (let i = 0; i < nx; i++) {
    const xa = x0 + ((x1 - x0) * i) / nx,
      xb = x0 + ((x1 - x0) * (i + 1)) / nx,
      sky = xb > V.sky[0] && xa < V.sky[1];
    if (sky) {
      // the skylight: a raised glazed lantern along the crown
      __prQuadRaw(glass, [xa, Y(xa) + 0.55, z0 + 0.4], [xb, Y(xb) + 0.55, z0 + 0.4], [xb, Y(xb) + 0.55, z1 - 0.4], [xa, Y(xa) + 0.55, z1 - 0.4], 1);
      continue;
    }
    for (const [za, zb] of [[z0 + 0.4, z1 - 0.4]]) {
      __prQuadRaw(inner, [xa, Y(xa), za], [xb, Y(xb), za], [xb, Y(xb), zb], [xa, Y(xa), zb], cIn);
      __prQuadRaw(outer, [xa, Y(xa) + 0.42, zb], [xb, Y(xb) + 0.42, zb], [xb, Y(xb) + 0.42, za], [xa, Y(xa) + 0.42, za], cOut);
    }
  }
  // the lantern's upstands and its roof ridge
  const sx0 = V.sky[0],
    sx1 = V.sky[1];
  for (const x of [sx0, sx1]) S.box('paint', x - 0.08, Y(x), z0 + 0.4, x + 0.08, Y(x) + 0.62, z1 - 0.4, __prK('#46514f'));
  for (let zz = z0 + 0.4; zz <= z1 - 0.4; zz += 2) S.box('paint', sx0, Y(sx0) + 0.55, zz - 0.04, sx1, Y(sx0) + 0.62, zz + 0.04, __prK('#46514f'));
  // standing seams on the roof
  for (let zz = z0 + 0.9; zz < z1 - 0.4; zz += 0.6)
    for (let i = 0; i < nx; i++) {
      const xa = x0 + ((x1 - x0) * i) / nx,
        xb = x0 + ((x1 - x0) * (i + 1)) / nx;
      if (xb > sx0 && xa < sx1) continue;
      S.cyl('corr', [xa, Y(xa) + 0.43, zz], [xb, Y(xb) + 0.43, zz], 0.018, __prK('#5d6a6a'), 'cyl6');
    }
  __flMesh(root, inner.build(), __prMatFor('ceil'), 'prison_vault_in', !0);
  __flMesh(root, outer.build(), __prMatFor('corr'), 'prison_vault_out', !0);
  const gm = new Gw({ color: '#cfe3ea', emissive: '#dfeaf0', emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.2, transparent: !0, opacity: 0.55, side: 2, depthWrite: !1 });
  gm.__prOwn = 1;
  __flMesh(root, glass.build(), gm, 'prison_skylight', !1);
  // steel arch trusses every 4 m: a curved top chord under the plaster, a bottom chord, lattice, and a tie rod
  const st = __prK('#3d4a50');
  for (let zz = z0 + 4; zz < z1 - 1; zz += 4) {
    const pts = [],
      bot = [];
    for (let i = 0; i <= 40; i++) {
      const x = x0 + 0.45 + ((x1 - x0 - 0.9) * i) / 40;
      pts.push([x, Y(x) - 0.06, zz]);
      bot.push([x, Y(x) - 0.55 + 0.3 * (1 - Math.abs((x - (x0 + x1) / 2) / ((x1 - x0) / 2))), zz]);
    }
    for (let i = 0; i < 40; i++) {
      S.box('paint', pts[i][0], pts[i][1] - 0.08, zz - 0.06, pts[i + 1][0], pts[i + 1][1] - 0.02, zz + 0.06, st);
      S.cyl('paint', bot[i], bot[i + 1], 0.04, st, 'cyl6');
      i % 2 === 0 ? S.cyl('paint', pts[i], bot[i + 1], 0.022, st, 'cyl6') : S.cyl('paint', bot[i], pts[i + 1], 0.022, st, 'cyl6');
    }
    // the springing: brackets on the walls
    for (const x of [x0 + 0.4, x1 - 0.4]) S.box('paint', x - 0.12, V.spring - 0.8, zz - 0.1, x + 0.12, V.spring + 0.05, zz + 0.1, st);
    S.cyl('paint', [x0 + 0.45, V.spring + 0.1, zz], [x1 - 0.45, V.spring + 0.1, zz], 0.025, st, 'cyl6');
  }
  // brick gables with a lunette window and a stone coping; a corbelled brick cornice along the sides
  const gb = __flMB(),
    br = __prK('#ffffff');
  for (const [zf, out] of [[z0, -1], [z1, 1]]) {
    for (let i = 0; i < nx; i++) {
      const xa = x0 + ((x1 - x0) * i) / nx,
        xb = x0 + ((x1 - x0) * (i + 1)) / nx,
        ya = Y(xa) + 0.42,
        yb = Y(xb) + 0.42,
        zi = out < 0 ? zf + 0.4 : zf - 0.4;
      // outer face, inner face
      __prQuad(gb, [xa, V.spring, zf], [xb, V.spring, zf], [xb, yb, zf], [xa, ya, zf], [0, 0, out], br);
      __prQuad(gb, [xa, V.spring, zi], [xb, V.spring, zi], [xb, yb - 0.42, zi], [xa, ya - 0.42, zi], [0, 0, -out], br);
      S.box('granite', xa - 0.02, Math.min(ya, yb) - 0.02, Math.min(zf, zi) - 0.08, xb + 0.02, Math.max(ya, yb) + 0.12, Math.max(zf, zi) + 0.08, __prK('#e8e2d8'));
    }
    // the lunette: a half-round window in the gable with radial glazing bars
    const cx = (x0 + x1) / 2,
      cy = V.spring + 0.3,
      Rr = 2.3,
      zg = zf + out * 0.03,
      lun = __flMB();
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI,
        a1 = ((i + 1) / 24) * Math.PI;
      __prQuad(lun, [cx, cy, zg], [cx + Math.cos(a0) * Rr, cy + Math.sin(a0) * Rr, zg], [cx + Math.cos(a1) * Rr, cy + Math.sin(a1) * Rr, zg], [cx, cy, zg], [0, 0, out]);
    }
    const lm = new Gw({ color: '#3a4a52', emissive: '#9fb4bd', emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.4 });
    lm.__prOwn = 1;
    __flMesh(root, lun.build(), lm, 'prison_lunette', !1);
    for (let k = 0; k <= 6; k++) {
      const a = (k / 6) * Math.PI;
      S.cyl('paint', [cx, cy, zg + out * 0.02], [cx + Math.cos(a) * Rr, cy + Math.sin(a) * Rr, zg + out * 0.02], 0.03, __prK('#e8e2d8'), 'cyl6');
    }
    // the stone arch round it: voussoirs
    for (let k = 0; k < 15; k++) {
      const a0 = (k / 15) * Math.PI,
        a1 = ((k + 1) / 15) * Math.PI,
        am = (a0 + a1) / 2,
        rr = Rr + 0.22,
        M = new _A().compose(new U(cx + Math.cos(am) * rr, cy + Math.sin(am) * rr, zf + out * 0.06), __prQ.setFromAxisAngle(new U(0, 0, 1), am - Math.PI / 2).clone(), new U(rr * (a1 - a0) - 0.03, 0.44, 0.14));
      S.add('granite', __prUnit('box'), M, __prK(k === 7 ? '#efe9de' : '#e2dcd2'));
    }
    S.box('granite', cx - Rr - 0.5, cy - 0.12, zf + out * 0.12 - 0.07, cx + Rr + 0.5, cy + 0.02, zf + out * 0.12 + 0.07, __prK('#e2dcd2'));
  }
  __flMesh(root, gb.build(), __prMatFor('brick'), 'prison_gables', !0);
  // the side walls' cornice: three corbelled brick courses and a gutter
  for (const [x, out] of [[x0, -1], [x1, 1]])
    for (let k = 0; k < 3; k++) {
      const d = 0.06 * (k + 1),
        y = V.spring - 0.6 + k * 0.2;
      out < 0 ? S.box('brick', x - d, y, z0 - 0.02, x, y + 0.2, z1 + 0.02, __prK('#ffffff')) : S.box('brick', x, y, z0 - 0.02, x + d, y + 0.2, z1 + 0.02, __prK('#ffffff'));
      k === 2 && (out < 0 ? S.cyl('paint', [x - 0.3, V.spring + 0.32, z0], [x - 0.3, V.spring + 0.32, z1], 0.09, __prK('#5f6a66'), 'cyl8') : S.cyl('paint', [x + 0.3, V.spring + 0.32, z0], [x + 0.3, V.spring + 0.32, z1], 0.09, __prK('#5f6a66'), 'cyl8'));
    }
  // the plinth: a granite base course round the cell house, and a string course; both stop at the doorways
  // (a course run across a doorway read as a step blocking the door)
  const gaps = (alongX, f, y0, y1) => (R.openings || []).filter((o) => o.alongX === alongX && Math.abs(o.f - f) < 0.5 && o.y0 < y1 && o.y1 > y0).map((o) => [o.a - (o.type === 'open' ? 0.12 : 0.14), o.a + o.w + (o.type === 'open' ? 0.12 : 0.14)]);
  const course = (alongX, f, out, a0, a1, y0, y1, d) => {
    let s0 = a0;
    for (const [g0, g1] of gaps(alongX, f + (alongX ? (out < 0 ? 0.2 : -0.2) : out < 0 ? 0.2 : -0.2), y0, y1).sort((p, q) => p[0] - q[0])) {
      g0 > s0 && (alongX ? S.box('granite', s0, y0, Math.min(f, f + out * d), g0, y1, Math.max(f, f + out * d), __prK('#ddd7cc')) : S.box('granite', Math.min(f, f + out * d), y0, s0, Math.max(f, f + out * d), y1, g0, __prK('#ddd7cc')));
      s0 = Math.max(s0, g1);
    }
    s0 < a1 && (alongX ? S.box('granite', s0, y0, Math.min(f, f + out * d), a1, y1, Math.max(f, f + out * d), __prK('#ddd7cc')) : S.box('granite', Math.min(f, f + out * d), y0, s0, Math.max(f, f + out * d), y1, a1, __prK('#ddd7cc')));
  };
  for (const [y0, y1, d] of [[0, 0.75, 0.06], [3.9, 4.15, 0.04]]) {
    course(!0, z0, -1, x0 - d, x1 + d, y0, y1, d);
    course(!0, z1, 1, x0 - d, x1 + d, y0, y1, d);
    course(!1, x0, -1, z0, z1, y0, y1, d);
    course(!1, x1, 1, z0, z1, y0, y1, d);
  }
  void m;
}
// ---------------------------------------------------------------- stone dressings, portals, parapets, turrets
function __prArches(root, S, R, m, text) {
  const stone = __prK('#e4ded3'),
    dark = __prK('#cfc8bc');
  for (const a of R.arches) {
    if (a.kind === 'window' || a.kind === 'door' || a.kind === 'portal') {
      const o = a.out,
        f = a.f,
        P = (s, y, d) => (a.alongX ? [s, y, f + o * d] : [f + o * d, y, s]),
        bxs = (s0, y0, s1, y1, d0, d1, col = stone) => {
          const p = P(s0, y0, d0),
            q = P(s1, y1, d1);
          S.box('granite', Math.min(p[0], q[0]), y0, Math.min(p[2], q[2]), Math.max(p[0], q[0]), y1, Math.max(p[2], q[2]), col);
        },
        y0 = a.kind === 'window' ? a.y0 : 0,
        y1 = a.y1,
        s0 = a.a,
        s1 = a.a + a.w,
        cx = (s0 + s1) / 2,
        hw = a.w / 2,
        jw = a.kind === 'portal' ? 0.55 : 0.32;
      // jambs and sill
      bxs(s0 - jw, y0 - (a.kind === 'window' ? 0.12 : 0), s0, y1, 0, a.kind === 'portal' ? 0.25 : 0.06);
      bxs(s1, y0 - (a.kind === 'window' ? 0.12 : 0), s1 + jw, y1, 0, a.kind === 'portal' ? 0.25 : 0.06);
      a.kind === 'window' && bxs(s0 - 0.42, y0 - 0.16, s1 + 0.42, y0, 0, 0.12, dark);
      // the head: a round arch (windows, doors) or a pointed gothic arch (portals), in voussoirs. A pointed
      // arch is two arcs of radius Rr, each centred on the springing line at Rr from its own springing
      const pointed = a.kind === 'portal',
        Rr = pointed ? a.w * 0.7 : hw,
        nk = pointed ? 13 : 9,
        thA = Math.acos((hw - Rr) / Rr);
      const arcPt = (t) => {
        if (!pointed) return [cx - Math.cos(t * Math.PI) * hw, y1 + Math.sin(t * Math.PI) * hw, -Math.cos(t * Math.PI), Math.sin(t * Math.PI)];
        const left = t <= 0.5,
          c0 = left ? s0 + Rr : s1 - Rr,
          th = left ? Math.PI - (Math.PI - thA) * (t / 0.5) : (Math.PI - thA) * ((1 - t) / 0.5);
        return [c0 + Math.cos(th) * Rr, y1 + Math.sin(th) * Rr, Math.cos(th), Math.sin(th)];
      };
      const thick = pointed ? 0.5 : 0.32,
        dep = pointed ? 0.25 : 0.07,
        uS = a.alongX ? [1, 0, 0] : [0, 0, 1];
      for (let k = 0; k < nk; k++) {
        const p0 = arcPt(k / nk),
          p1 = arcPt((k + 1) / nk),
          ds = p1[0] - p0[0],
          dy = p1[1] - p0[1],
          L = Math.hypot(ds, dy),
          // outward (away from the opening) in the wall plane
          ns = (p0[2] + p1[2]) / 2,
          ny = (p0[3] + p1[3]) / 2,
          nl = Math.hypot(ns, ny) || 1,
          c = P((p0[0] + p1[0]) / 2 + (ns / nl) * thick * 0.5, (p0[1] + p1[1]) / 2 + (ny / nl) * thick * 0.5, dep / 2),
          u = new U(uS[0] * ds, dy, uS[2] * ds),
          v = new U(uS[0] * ns, ny, uS[2] * ns);
        S.add('granite', __prUnit('box'), __prBasisM(c, u, v, L + 0.02, thick, dep + 0.02), k === Math.floor(nk / 2) ? __prK('#f1ebe0') : stone);
      }
      // the tympanum (doors, portals): the panel between the door head and the arch, with carved lettering
      if (a.kind !== 'window') {
        const tg = new uw(),
          pts = [];
        const N2 = 16;
        for (let k = 0; k <= N2; k++) pts.push(arcPt(k / N2));
        const Pp = [],
          Ii = [];
        const base = P(cx, y1, 0.012);
        Pp.push(base[0], base[1], base[2]);
        for (const [px, py] of pts) {
          const q = P(px, py, 0.012);
          Pp.push(q[0], q[1], q[2]);
        }
        const nrm = a.alongX ? [0, 0, o] : [o, 0, 0],
          tv = (k) => [Pp[k * 3], Pp[k * 3 + 1], Pp[k * 3 + 2]];
        for (let k = 0; k < N2; k++) {
          const A0 = tv(0),
            A1 = tv(k + 1),
            A2 = tv(k + 2),
            cz = (A1[0] - A0[0]) * (A2[1] - A0[1]) - (A1[1] - A0[1]) * (A2[0] - A0[0]),
            cxx = (A1[1] - A0[1]) * (A2[2] - A0[2]) - (A1[2] - A0[2]) * (A2[1] - A0[1]),
            cyy = (A1[2] - A0[2]) * (A2[0] - A0[0]) - (A1[0] - A0[0]) * (A2[2] - A0[2]);
          cxx * nrm[0] + cyy * nrm[1] + cz * nrm[2] >= 0 ? Ii.push(0, k + 1, k + 2) : Ii.push(0, k + 2, k + 1);
        }
        const Nn = [];
        for (let k = 0; k <= N2 + 1; k++) Nn.push(...nrm);
        tg.setAttribute('position', new gi(new Float32Array(Pp), 3));
        tg.setAttribute('normal', new gi(new Float32Array(Nn), 3));
        tg.setAttribute('color', new gi(new Float32Array((N2 + 2) * 3).fill(0.82), 3));
        tg.setIndex(Ii);
        S.add('granite', tg, new _A(), stone);
        a.text && text.push({ x: P(cx, y1 + (pointed ? 0.62 : 0.32), 0.03), ry: a.alongX ? (o < 0 ? Math.PI : 0) : o > 0 ? Math.PI / 2 : -Math.PI / 2, w: Math.min(a.w * (pointed ? 1.15 : 1.05), 3.2), h: pointed ? 0.5 : 0.3, text: a.text, sub: a.year, style: 'carved' });
        // a lintel at the door head
        bxs(s0 - jw, y1 - 0.02, s1 + jw, y1 + 0.16, 0, pointed ? 0.27 : 0.08, dark);
      } else {
        // the window head: an arched fanlight with glazing bars
        const fl = __flMB(),
          N2 = 12,
          base = P(cx, y1, -0.01);
        for (let k = 0; k < N2; k++) {
          const [ax0, ay0] = arcPt(k / N2),
            [ax1, ay1] = arcPt((k + 1) / N2);
          __prQuad(fl, base, P(ax0, ay0, -0.01), P(ax1, ay1, -0.01), base, a.alongX ? [0, 0, o] : [o, 0, 0]);
        }
        R.__glassB.push(fl);
        for (const t of [0.25, 0.5, 0.75]) {
          const [ex, ey] = arcPt(t);
          S.cyl('paint', P(cx, y1, 0.0), P(ex, ey, 0.0), 0.015, __prK('#3d4743'), 'cyl6');
        }
      }
      continue;
    }
    if (a.kind === 'parapet') {
      // merlons and crenels round the gatehouse roof, a coping and a corbel table under it
      const y = a.y;
      for (const [x0, z0, x1, z1] of [[a.x0, a.z0, a.x1, a.z0 + 0.4], [a.x0, a.z1 - 0.4, a.x1, a.z1], [a.x0, a.z0 + 0.4, a.x0 + 0.4, a.z1 - 0.4], [a.x1 - 0.4, a.z0 + 0.4, a.x1, a.z1 - 0.4]]) {
        S.box('granite', x0, y, z0, x1, y + 0.7, z1, stone);
        const alongX = x1 - x0 > z1 - z0,
          L = alongX ? x1 - x0 : z1 - z0,
          n = Math.floor(L / 1.1);
        for (let k = 0; k < n; k++) {
          const s = (alongX ? x0 : z0) + (L - n * 1.1) / 2 + k * 1.1 + 0.25;
          alongX ? S.box('granite', s, y + 0.7, z0 - 0.02, s + 0.6, y + 1.35, z1 + 0.02, stone) : S.box('granite', x0 - 0.02, y + 0.7, s, x1 + 0.02, y + 1.35, s + 0.6, stone);
        }
        alongX ? S.box('granite', x0 - 0.06, y - 0.22, z0 - 0.1, x1 + 0.06, y, z1 + 0.1, dark) : S.box('granite', x0 - 0.1, y - 0.22, z0 - 0.06, x1 + 0.1, y, z1 + 0.06, dark);
      }
      continue;
    }
    if (a.kind === 'facade') {
      // the newer buildings: a projecting cornice and coping at the roof, sills and lintels at the windows
      const y = a.h + 0.3;
      for (const [x0, z0, x1, z1] of [[a.x0 - 0.42, a.z0 - 0.42, a.x1 + 0.42, a.z0 - 0.2], [a.x0 - 0.42, a.z1 + 0.2, a.x1 + 0.42, a.z1 + 0.42], [a.x0 - 0.42, a.z0 - 0.2, a.x0 - 0.2, a.z1 + 0.2], [a.x1 + 0.2, a.z0 - 0.2, a.x1 + 0.42, a.z1 + 0.2]]) {
        S.box('concrete', x0, y, z0, x1, y + 0.55, z1, __prK('#d5cfc2'));
        S.box('concrete', x0 - 0.03, y + 0.55, z0 - 0.03, x1 + 0.03, y + 0.62, z1 + 0.03, __prK('#bdb7aa'));
        a.cornice && S.box('concrete', x0 - 0.06, y - 0.25, z0 - 0.06, x1 + 0.06, y - 0.05, z1 + 0.06, __prK('#e2dcd0'));
      }
      if (a.sills)
        for (const p of m.panes) {
          const b = p.box,
            cx = (b.min.x + b.max.x) / 2,
            cz = (b.min.z + b.max.z) / 2;
          if (cx < a.x0 - 0.3 || cx > a.x1 + 0.3 || cz < a.z0 - 0.3 || cz > a.z1 + 0.3 || b.min.y < 0.5) continue;
          const onX = b.max.x - b.min.x > b.max.z - b.min.z,
            out = onX ? (Math.abs(cz - a.z0) < Math.abs(cz - a.z1) ? -1 : 1) : Math.abs(cx - a.x0) < Math.abs(cx - a.x1) ? -1 : 1,
            face = onX ? (out < 0 ? a.z0 : a.z1) : out < 0 ? a.x0 : a.x1;
          if (onX ? Math.abs(cz - face) > 0.5 : Math.abs(cx - face) > 0.5) continue;
          const s0 = onX ? b.min.x : b.min.z,
            s1 = onX ? b.max.x : b.max.z,
            put = (y0, y1, d, e) => (onX ? S.box('concrete', s0 - e, y0, Math.min(face, face + out * d), s1 + e, y1, Math.max(face, face + out * d), __prK('#ddd7ca')) : S.box('concrete', Math.min(face, face + out * d), y0, s0 - e, Math.max(face, face + out * d), y1, s1 + e, __prK('#ddd7ca')));
          put(b.min.y - 0.1, b.min.y - 0.01, 0.1, 0.1);
          put(b.max.y + 0.01, b.max.y + 0.17, 0.04, 0.12);
        }
    }
  }
}
// octagonal turrets with string courses, arrow slits, a crenellated top and a slate spire
function __prTurrets(root, S, R) {
  const stone = __prK('#e2dcd1');
  for (const t of R.turrets) {
    const a = t.a / Math.cos(Math.PI / 8),
      oct = (r, y0, y1, col, k = 'granite') => S.add(k, __prUnit('oct'), new _A().compose(new U(t.x, (y0 + y1) / 2, t.z), new Kw(), new U(r, y1 - y0, r)), col);
    oct(a, 0, t.h, stone);
    oct(a + 0.08, 0, 0.7, __prK('#d4cec2'));
    oct(a + 0.06, 3.1, 3.3, __prK('#d4cec2'));
    oct(a + 0.18, t.h - 0.05, t.h + 0.25, __prK('#d4cec2'));
    // merlons on the eight faces
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2,
        rr = a + 0.06,
        M = new _A().compose(new U(t.x + Math.cos(ang) * rr * 0.92, t.h + 0.55, t.z + Math.sin(ang) * rr * 0.92), new Kw().setFromAxisAngle(__prUp, -ang + Math.PI / 2), new U(0.42, 0.6, 0.3));
      S.add('granite', __prUnit('box'), M, stone);
      // an arrow slit on four faces
      if (k % 2 === 0) {
        const M2 = new _A().compose(new U(t.x + Math.cos(ang) * (t.a + 0.01), 4.6, t.z + Math.sin(ang) * (t.a + 0.01)), new Kw().setFromAxisAngle(__prUp, -ang + Math.PI / 2), new U(0.12, 0.9, 0.05));
        S.add('dark', __prUnit('box'), M2, __prK('#1d2123'));
      }
    }
    // the spire: a tall slate cone with a finial
    const sp = __prUnit('cone8');
    S.add('paint', sp, new _A().compose(new U(t.x, t.h + 0.25 + 2.1, t.z), new Kw().setFromAxisAngle(__prUp, Math.PI / 8), new U(a * 0.92, 4.2, a * 0.92)), __prK('#56606a'));
    S.cyl('paint', [t.x, t.h + 4.3, t.z], [t.x, t.h + 5.2, t.z], 0.03, __prK('#2b2f31'), 'cyl6');
    S.add('paint', __prUnit('sph'), new _A().compose(new U(t.x, t.h + 4.95, t.z), new Kw(), new U(0.07, 0.07, 0.07)), __prK('#9c8a4a'));
  }
}
// the perimeter wall: pilasters with capitals, a coping along the top
function __prPerimeter(S, R, m) {
  const c = __prK('#cbc4b4'),
    cap = __prK('#bfb8a8');
  for (const p of R.pilasters) {
    if (p.ax === 'x') {
      const z0 = Math.min(p.z, p.z + p.s * 0.22),
        z1 = Math.max(p.z, p.z + p.s * 0.22);
      S.box('concrete', p.x - 0.3, 0, z0, p.x + 0.3, p.h, z1, c);
      S.box('concrete', p.x - 0.36, p.h - 0.25, Math.min(p.z, p.z + p.s * 0.28), p.x + 0.36, p.h, Math.max(p.z, p.z + p.s * 0.28), cap);
      S.box('concrete', p.x - 0.36, 0, Math.min(p.z, p.z + p.s * 0.28), p.x + 0.36, 0.45, Math.max(p.z, p.z + p.s * 0.28), cap);
    } else {
      const x0 = Math.min(p.x, p.x + p.s * 0.22),
        x1 = Math.max(p.x, p.x + p.s * 0.22);
      S.box('concrete', x0, 0, p.z - 0.3, x1, p.h, p.z + 0.3, c);
      S.box('concrete', Math.min(p.x, p.x + p.s * 0.28), p.h - 0.25, p.z - 0.36, Math.max(p.x, p.x + p.s * 0.28), p.h, p.z + 0.36, cap);
      S.box('concrete', Math.min(p.x, p.x + p.s * 0.28), 0, p.z - 0.36, Math.max(p.x, p.x + p.s * 0.28), 0.45, p.z + 0.36, cap);
    }
  }
  const W = m.w,
    D = m.d;
  for (const [x0, z0, x1, z1] of [[-1.1, -1.1, W + 1.1, 0.1], [-1.1, D - 0.1, W + 1.1, D + 1.1], [-1.1, 0.1, 0.1, D - 0.1], [W - 0.1, 0.1, W + 1.1, D - 0.1]]) S.box('concrete', x0, 6.2, z0, x1, 6.32, z1, cap);
  // the inner north wall's coping
  for (const [x0, x1] of [[0, 38], [44.5, 56], [72, 98], [104, 128]]) S.box('concrete', x0, 5.6, 13.94, x1, 5.7, 14.66, cap);
}
// painted lines (on the surface they lie on: they pick up its texture)
function __prLines(S, R) {
  for (const l of R.lines) {
    const y = l.y ?? 0.022;
    S.box('court', l.x0, y, l.z0, l.x1, y + 0.004, l.z1, __prK(l.c));
  }
}
// the breach: ragged concrete with bent rebar on the stumps, and broken chunks (inside their boxes)
function __prRubble(S, R) {
  const c = __prK('#bdb7aa'),
    rb = __prK('#6d4a35');
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const r of R.rubble) {
    if (r.chunk) {
      for (let k = 0; k < 3; k++) {
        const s = r.s * (0.45 + rnd() * 0.3),
          h = r.h * (0.5 + rnd() * 0.5),
          x = r.x + (rnd() - 0.5) * (r.s - s),
          zz = r.z + (rnd() - 0.5) * (r.s - s);
        S.add('concrete', __prUnit('box'), new _A().compose(new U(x, h / 2, zz), new Kw().setFromEuler(new TB((rnd() - 0.5) * 0.3, rnd() * 3, (rnd() - 0.5) * 0.3)), new U(s * 0.8, h, s * 0.75)), c);
      }
      continue;
    }
    // jagged top of the stump and rebar sticking out towards the gap
    const n = 6;
    for (let k = 0; k < n; k++) {
      const x0 = r.x0 + ((r.x1 - r.x0) * k) / n,
        x1 = r.x0 + ((r.x1 - r.x0) * (k + 1)) / n,
        h = 0.15 + rnd() * 0.45;
      S.box('concrete', x0, r.y, r.z0 + 0.04, x1, r.y + h * (r.side > 0 ? (k + 1) / n : 1 - k / n), r.z1 - 0.04, c);
    }
    for (let k = 0; k < 5; k++) {
      const y = 0.4 + k * 0.5 + rnd() * 0.2,
        x = r.side > 0 ? r.x1 : r.x0,
        zz = r.z0 + 0.15 + rnd() * 0.3,
        L = 0.3 + rnd() * 0.5;
      S.cyl('paint', [x, y, zz], [x + r.side * L, y + (rnd() - 0.3) * 0.4, zz + (rnd() - 0.5) * 0.3], 0.008, rb, 'cyl6');
    }
  }
}
