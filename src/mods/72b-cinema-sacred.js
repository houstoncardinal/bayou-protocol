/* ===== Bayou Protocol mod: Bayou Palace Cinemas: sacred geometry and the finish ===== */
// The palace's ornament, drawn on top of 72-cinema-view.js's kit from the records 71-cinema.js keeps in
// A.__cn.sacred (all visual: nothing here has collision):
//   - the figures, drawn procedurally on canvases (crisp anti-aliased lines, a bevel and a dark groove so they
//     read as inlaid metal): the Flower of Life, the Seed of Life, Metatron's Cube, the Sri Yantra, the
//     golden-ratio spiral in its Fibonacci squares, the Vesica Piscis, and a running band of interlaced circles
//   - brass inlays in dark marble: the Grand Lobby's floor (a Flower of Life under the middle chandelier, a Seed
//     of Life under each side one), the plaza, the Promenade in front of each theater
//   - the lobby's ceiling: every coffer lacquered deep blue with a gilt rosette (Metatron's Cube and the Seed of
//     Life alternately) inside a stepped moulding
//   - walls: fluted pilasters with stepped gilt capitals, a frieze of interlaced circles under a moulded
//     cornice, framed bays (the golden spiral on the stair walls), brass roundels, a rosewood wainscot with
//     raised panels, the mezzanine's moulded fascia, the concession counter's plinth, fillets and medallion
//   - glass lit from behind: a rose window of Metatron's Cube over the lobby doors, tall Seed-of-Life and
//     Vesica Piscis panels flanking every theater's entrance on the Promenade
//   - (the auditoriums' ceilings stay plain black: the pattern that was there came out, owner's call)
//     (formerly: a Sri Yantra, the Velvet Room a Flower of Life, in faint gold light, dim enough
//     not to compete with the film
//   - the street front: roundels, friezes and cornices on the facade, ribbed fins
//   - the parked cars: Poly Haven's scanned covered car, instanced, each cover its own colour
// Canvas textures are made once per build and released with the view (72-cinema-view.js's __CN_V.dyn).
const __SG_R3 = Math.sqrt(3);
const __sgUnit = (k) => {
  const P = __sgUnit.c || (__sgUnit.c = {});
  if (P[k]) return P[k];
  const g = k === 'disc' ? new Rw(1, 1, 1, 96, 1) : k === 'rod' ? new Rw(1, 1, 1, 12, 1) : null;
  g.setAttribute('color', new gi(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  g.__shared = 1;
  return (P[k] = g);
};
// ---------------------------------------------------------------- the figures (Path2D, canvas pixels)
const __sgC = (P, x, y, r) => (P.moveTo(x + r, y), P.arc(x, y, r, 0, Math.PI * 2));
// the hexagonal lattice round (cx, cy), spacing s, out to ring n
function __sgLattice(cx, cy, s, n) {
  const out = [];
  for (let q = -n; q <= n; q++)
    for (let r = -n; r <= n; r++) {
      const d = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
      // (turned so a petal points straight up)
      d <= n && out.push([cx + s * (r * __SG_R3) / 2, cy + s * (q + r / 2), d]);
    }
  return out;
}
// a ring of n circles of radius cr round a circle of radius R (interlaced when they overlap)
function __sgChain(P, cx, cy, R, cr, n) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    __sgC(P, cx + Math.cos(a) * R, cy + Math.sin(a) * R, cr);
  }
}
// a lotus petal (a pointed lens) from radius a to b at angle th, its half-width w
function __sgPetal(P, cx, cy, a, b, th, w) {
  const c = Math.cos(th),
    s = Math.sin(th),
    m = (a + b) / 2,
    p0 = [cx + c * a, cy + s * a],
    p1 = [cx + c * b, cy + s * b];
  P.moveTo(p0[0], p0[1]);
  P.quadraticCurveTo(cx + c * m - s * w * 2, cy + s * m + c * w * 2, p1[0], p1[1]);
  P.quadraticCurveTo(cx + c * m + s * w * 2, cy + s * m - c * w * 2, p0[0], p0[1]);
}
const __sgPoly = (P, pts, close = !0) => {
  P.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) P.lineTo(pts[i][0], pts[i][1]);
  close && P.closePath();
};
// Seed of Life: seven circles of radius r and the circle round them
function __sgSeed(P, cx, cy, r) {
  __sgC(P, cx, cy, r);
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    __sgC(P, cx + Math.cos(a) * r, cy + Math.sin(a) * r, r);
  }
  __sgC(P, cx, cy, 2 * r);
}
// Metatron's Cube: the thirteen circles of the Fruit of Life and the 78 lines joining their centres
function __sgMetatron(Pc, Pl, cx, cy, r) {
  const C = [[cx, cy]];
  for (const d of [2 * r, 4 * r]) for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    C.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]);
  }
  for (const [x, y] of C) __sgC(Pc, x, y, r);
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) Pl.moveTo(C[i][0], C[i][1]), Pl.lineTo(C[j][0], C[j][1]);
  return C;
}
// the Sri Yantra (after the classical figure): four triangles pointing up, five down, round the bindu; the
// lotuses of eight and sixteen petals, three circles, the square enclosure with its four gates. U: the radius
// of the triangles' circle
function __sgSri(P, cx, cy, U) {
  const tri = (base, apex, hw) => {
    // (y up in the figure, down on the canvas)
    __sgPoly(P, [[cx - hw * U, cy - base * U], [cx + hw * U, cy - base * U], [cx, cy - apex * U]]);
  };
  const onC = (y) => Math.sqrt(Math.max(0, 1 - y * y));
  // up (Shiva)
  tri(-0.62, 1.0, onC(-0.62));
  tri(-0.47, 0.76, 0.62);
  tri(-0.3, 0.55, 0.47);
  tri(-0.08, 0.36, 0.3);
  // down (Shakti)
  tri(0.62, -1.0, onC(0.62));
  tri(0.47, -0.8, 0.66);
  tri(0.3, -0.6, 0.5);
  tri(0.16, -0.42, 0.36);
  tri(0.05, -0.24, 0.2);
  __sgC(P, cx, cy, U * 0.035);
  __sgC(P, cx, cy, U * 1.03);
  for (let k = 0; k < 8; k++) __sgPetal(P, cx, cy, U * 1.05, U * 1.34, (k / 8) * Math.PI * 2 - Math.PI / 2, U * 0.085);
  __sgC(P, cx, cy, U * 1.37);
  for (let k = 0; k < 16; k++) __sgPetal(P, cx, cy, U * 1.39, U * 1.63, (k / 16) * Math.PI * 2 - Math.PI / 2, U * 0.06);
  for (const r of [1.66, 1.71, 1.76]) __sgC(P, cx, cy, U * r);
  // the bhupura: three nested squares, a T-shaped gate in the middle of each side
  for (const h of [1.84, 1.9, 1.96]) {
    const g = 0.2 + (h - 1.84),
      d = 0.14,
      s = h * U,
      G = g * U,
      Dd = d * U,
      side = [];
    // one side (the top), then turned four times
    const top = [[-s, -s], [-G, -s], [-G, -s - Dd], [-G - Dd * 0.6, -s - Dd], [-G - Dd * 0.6, -s - Dd * 1.6], [G + Dd * 0.6, -s - Dd * 1.6], [G + Dd * 0.6, -s - Dd], [G, -s - Dd], [G, -s], [s, -s]];
    for (let q = 0; q < 4; q++) {
      const c = Math.cos((q * Math.PI) / 2),
        sn = Math.sin((q * Math.PI) / 2);
      for (const [x, y] of top) side.push([cx + x * c - y * sn, cy + x * sn + y * c]);
    }
    __sgPoly(P, side);
  }
}
// ---------------------------------------------------------------- inks
// brass (an inlay or a gilt relief): the groove's dark edge, the metal (a gradient over the whole piece, as a
// polished surface catches light unevenly), a highlight along one side
function __sgInk(c, P, lw, mode = 'brass') {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (mode === 'brass') {
    c.strokeStyle = 'rgba(28,16,6,0.62)';
    c.lineWidth = lw * 1.85;
    c.stroke(P);
    const g = c.createLinearGradient(0, 0, c.canvas.width, c.canvas.height);
    for (const [s, col] of [[0, '#9a6a24'], [0.22, '#e3bf68'], [0.45, '#b4862f'], [0.68, '#f2d488'], [0.85, '#c09038'], [1, '#9c6c26']]) g.addColorStop(s, col);
    c.strokeStyle = g;
    c.lineWidth = lw;
    c.stroke(P);
    c.save();
    c.translate(-lw * 0.22, -lw * 0.22);
    c.strokeStyle = 'rgba(255,243,206,0.55)';
    c.lineWidth = lw * 0.3;
    c.stroke(P);
    c.restore();
  } else if (mode === 'glow') {
    for (const [a, k] of [[0.07, 6], [0.16, 3], [0.38, 1.7]]) {
      c.strokeStyle = `rgba(255,196,110,${a})`;
      c.lineWidth = lw * k;
      c.stroke(P);
    }
    c.strokeStyle = '#ffe6b4';
    c.lineWidth = lw;
    c.stroke(P);
  } else {
    // lead came round stained glass, gilded down its middle
    c.strokeStyle = '#1a120a';
    c.lineWidth = lw * 1.7;
    c.stroke(P);
    c.strokeStyle = '#b8914a';
    c.lineWidth = lw * 0.42;
    c.stroke(P);
  }
}
// seeded glass: a little mottling, as cathedral glass has
function __sgMottle(c, w, h, n, a) {
  let s = 4242;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const x = rnd() * w,
      y = rnd() * h,
      r = 2 + rnd() * 9;
    c.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${a * rnd()})` : `rgba(0,0,0,${a * rnd()})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
}
// ---------------------------------------------------------------- the textures
function __sgTex(w, h, draw, o = {}) {
  // (phones and low-memory devices: half the size; every pattern is drawn to the size it's given)
  __LOWMEM && ((w = Math.round(w / 2)), (h = Math.round(h / 2)));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new LI(cv);
  t.colorSpace = 'srgb';
  t.anisotropy = o.aniso || 8;
  o.repeat && (t.wrapS = 1e3);
  t.redraw = () => {};
  __CN_V.dyn.push(t);
  return t;
}
const __SG_TEX = {
  // Flower of Life: the 19 circles and the arcs of the next ring, inside two rings and a band of interlaced
  // circles
  fol: (mode = 'brass') =>
    __sgTex(mode === 'glow' ? 1024 : 2048, mode === 'glow' ? 1024 : 2048, (c, S) => {
      const cx = S / 2,
        Rf = S * 0.4,
        r = Rf / 3,
        lw = S * (mode === 'glow' ? 0.0028 : 0.0056),
        P = new Path2D();
      for (const [x, y] of __sgLattice(cx, cx, r, 3)) __sgC(P, x, y, r);
      c.save();
      const clip = new Path2D();
      __sgC(clip, cx, cx, Rf + lw);
      c.clip(clip);
      __sgInk(c, P, lw, mode);
      c.restore();
      const Q = new Path2D(),
        R1 = Rf * 1.045,
        R2 = S * 0.485;
      for (const R of [Rf, R1, R2]) __sgC(Q, cx, cx, R);
      __sgInk(c, Q, lw * 1.1, mode);
      const Ch = new Path2D(),
        mid = (R1 + R2) / 2,
        cr = (R2 - R1) / 2;
      __sgChain(Ch, cx, cx, mid, cr, Math.round((Math.PI * 2 * mid) / cr));
      __sgInk(c, Ch, lw * 0.55, mode);
    }, { aniso: 16 }),
  // Seed of Life in a ring of lotus petals
  seed: () =>
    __sgTex(1024, 1024, (c, S) => {
      const cx = S / 2,
        r = S * 0.17,
        lw = S * 0.012,
        P = new Path2D();
      __sgSeed(P, cx, cx, r);
      __sgInk(c, P, lw);
      const Q = new Path2D();
      for (let k = 0; k < 12; k++) __sgPetal(Q, cx, cx, r * 2.08, S * 0.455, (k / 12) * Math.PI * 2 - Math.PI / 2, S * 0.032);
      __sgC(Q, cx, cx, S * 0.475);
      __sgC(Q, cx, cx, S * 0.49);
      __sgInk(c, Q, lw * 0.75);
      // a dot at each petal's tip, and the bindu
      const D = new Path2D();
      for (let k = 0; k < 12; k++) {
        const a = ((k + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
        __sgC(D, cx + Math.cos(a) * S * 0.44, cx + Math.sin(a) * S * 0.44, S * 0.008);
      }
      __sgC(D, cx, cx, S * 0.012);
      __sgInk(c, D, lw * 0.9);
    }, { aniso: 16 }),
  // Metatron's Cube
  metatron: () =>
    __sgTex(1024, 1024, (c, S) => {
      const cx = S / 2,
        r = S * 0.083,
        lw = S * 0.011,
        Pc = new Path2D(),
        Pl = new Path2D();
      __sgMetatron(Pc, Pl, cx, cx, r);
      __sgInk(c, Pl, lw * 0.6);
      __sgInk(c, Pc, lw);
      const Q = new Path2D();
      __sgC(Q, cx, cx, r * 5.3);
      __sgC(Q, cx, cx, r * 5.55);
      __sgChain(Q, cx, cx, r * 5.86, r * 0.27, Math.round((Math.PI * 2 * r * 5.86) / (r * 0.27)));
      __sgC(Q, cx, cx, r * 6.16);
      __sgInk(c, Q, lw * 0.7);
    }),
  // the Sri Yantra, as light
  sri: () =>
    __sgTex(1536, 1536, (c, S) => {
      const P = new Path2D();
      __sgSri(P, S / 2, S / 2, S / 2 / 2.03);
      __sgInk(c, P, S * 0.003, 'glow');
    }),
  // the golden spiral through its Fibonacci squares (a golden rectangle, 1.618 : 1), a border round it
  spiral: () =>
    __sgTex(1536, 949, (c, W, H) => {
      const m = 26,
        lw = 10,
        Sq = new Path2D(),
        Sp = new Path2D(),
        B = new Path2D();
      let x = m,
        y = m,
        w = W - 2 * m,
        h = H - 2 * m;
      B.rect(m - 14, m - 14, w + 28, h + 28);
      B.rect(m - 3, m - 3, w + 6, h + 6);
      for (let i = 0; i < 11 && w > 3 && h > 3; i++) {
        const d = i % 4;
        if (d === 0) {
          const s = h;
          Sq.rect(x, y, s, s);
          Sp.moveTo(x, y + s), Sp.arc(x + s, y + s, s, Math.PI, Math.PI * 1.5);
          i < 2 && __sgC(Sq, x + s / 2, y + s / 2, s / 2);
          (x += s), (w -= s);
        } else if (d === 1) {
          const s = w;
          Sq.rect(x, y, s, s);
          Sp.moveTo(x, y), Sp.arc(x, y + s, s, Math.PI * 1.5, Math.PI * 2);
          i < 2 && __sgC(Sq, x + s / 2, y + s / 2, s / 2);
          (y += s), (h -= s);
        } else if (d === 2) {
          const s = h;
          Sq.rect(x + w - s, y, s, s);
          Sp.moveTo(x + w, y), Sp.arc(x + w - s, y, s, 0, Math.PI * 0.5);
          w -= s;
        } else {
          const s = w;
          Sq.rect(x, y + h - s, s, s);
          Sp.moveTo(x + w, y + h), Sp.arc(x + w, y + h - s, s, Math.PI * 0.5, Math.PI);
          h -= s;
        }
      }
      __sgInk(c, B, lw);
      __sgInk(c, Sq, lw * 0.6);
      __sgInk(c, Sp, lw * 1.5);
    }),
  // a running band: a chain of circles each through its neighbours' centres (the Vesica Piscis repeated),
  // between double borders; tiles along its length
  frieze: () =>
    __sgTex(1024, 256, (c, W, H) => {
      c.fillStyle = 'rgba(0,0,0,0)';
      const r = W / 10,
        P = new Path2D(),
        B = new Path2D(),
        D = new Path2D(),
        cy = H / 2,
        rr = r * 0.98;
      for (let i = -1; i <= 10; i++) __sgC(P, i * r, cy, rr);
      for (let i = 0; i <= 10; i++) __sgC(D, i * r + r / 2, cy, H * 0.022);
      for (const y of [H * 0.035, H * 0.085, H * 0.915, H * 0.965]) B.moveTo(-10, y), B.lineTo(W + 10, y);
      c.save();
      c.beginPath();
      c.rect(0, H * 0.1, W, H * 0.8);
      c.clip();
      __sgInk(c, P, H * 0.05);
      __sgInk(c, D, H * 0.03);
      c.restore();
      __sgInk(c, B, H * 0.03);
    }, { repeat: !0 }),
  // a tall backlit panel: the Seed of Life over the Vesica Piscis over a hexagram, in amber and teal glass
  glass: (tint) =>
    __sgTex(512, 1536, (c, W, H) => {
      const g = c.createLinearGradient(0, 0, 0, H);
      for (const [s, col] of tint) g.addColorStop(s, col);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      const rg = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, H * 0.55);
      rg.addColorStop(0, 'rgba(255,236,190,0.45)');
      rg.addColorStop(1, 'rgba(0,0,0,0.25)');
      c.fillStyle = rg;
      c.fillRect(0, 0, W, H);
      __sgMottle(c, W, H, 900, 0.07);
      const L = new Path2D(),
        fills = [];
      // the Seed of Life
      const r1 = W * 0.2,
        y1 = H * 0.2;
      __sgSeed(L, W / 2, y1, r1);
      fills.push([W / 2, y1, r1]);
      for (let k = 0; k < 6; k++) fills.push([W / 2 + Math.cos(-Math.PI / 2 + (k * Math.PI) / 3) * r1, y1 + Math.sin(-Math.PI / 2 + (k * Math.PI) / 3) * r1, r1]);
      // the Vesica Piscis: two circles through each other's centres, the mandorla between them
      const r2 = W * 0.29,
        y2 = H * 0.52;
      for (const sx of [-0.5, 0.5]) __sgC(L, W / 2 + sx * r2, y2, r2), fills.push([W / 2 + sx * r2, y2, r2]);
      L.moveTo(W / 2, y2 - (r2 * __SG_R3) / 2), L.lineTo(W / 2, y2 + (r2 * __SG_R3) / 2);
      L.moveTo(W / 2 - r2 * 1.5, y2), L.lineTo(W / 2 + r2 * 1.5, y2);
      // the hexagram in its circle
      const r3 = W * 0.36,
        y3 = H * 0.82;
      __sgC(L, W / 2, y3, r3);
      fills.push([W / 2, y3, r3 * 0.5]);
      for (const ph of [-Math.PI / 2, Math.PI / 2]) __sgPoly(L, [0, 1, 2].map((k) => [W / 2 + Math.cos(ph + (k * 2 * Math.PI) / 3) * r3, y3 + Math.sin(ph + (k * 2 * Math.PI) / 3) * r3]));
      // light glass where the circles overlap (the petals and the mandorla come out brighter)
      c.globalCompositeOperation = 'lighter';
      for (const [x, y, r] of fills) {
        c.fillStyle = 'rgba(255,214,150,0.16)';
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
      c.globalCompositeOperation = 'source-over';
      // the panel's border and cross-bars
      L.rect(W * 0.04, W * 0.04, W * 0.92, H - W * 0.08);
      for (const y of [H * 0.36, H * 0.68]) L.moveTo(W * 0.04, y), L.lineTo(W * 0.96, y);
      __sgInk(c, L, W * 0.018, 'lead');
    }),
  // the rose window: Metatron's Cube in jewel glass, round
  rose: () =>
    __sgTex(1024, 1024, (c, S) => {
      const cx = S / 2,
        R = S * 0.49;
      c.save();
      c.beginPath();
      c.arc(cx, cx, R, 0, Math.PI * 2);
      c.clip();
      const g = c.createRadialGradient(cx, cx, 0, cx, cx, R);
      for (const [s, col] of [[0, '#ffe9b0'], [0.25, '#e8a43c'], [0.5, '#a3402c'], [0.72, '#3b2a6e'], [0.9, '#16405e'], [1, '#0e2236']]) g.addColorStop(s, col);
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
      __sgMottle(c, S, S, 1400, 0.08);
      const r = S * 0.07,
        Pc = new Path2D(),
        Pl = new Path2D(),
        C = __sgMetatron(Pc, Pl, cx, cx, r);
      c.globalCompositeOperation = 'lighter';
      for (const [x, y] of C) {
        c.fillStyle = 'rgba(255,220,160,0.13)';
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
      c.globalCompositeOperation = 'source-over';
      const O = new Path2D();
      __sgC(O, cx, cx, r * 5.25);
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        O.moveTo(cx + Math.cos(a) * r * 5.25, cx + Math.sin(a) * r * 5.25), O.lineTo(cx + Math.cos(a) * R, cx + Math.sin(a) * R);
      }
      __sgChain(O, cx, cx, r * 6.3, r * 0.55, 24);
      __sgInk(c, Pl, S * 0.006, 'lead');
      __sgInk(c, Pc, S * 0.009, 'lead');
      __sgInk(c, O, S * 0.009, 'lead');
      c.restore();
      const Rim = new Path2D();
      __sgC(Rim, cx, cx, R - 4);
      __sgInk(c, Rim, S * 0.014, 'lead');
    }),
};
// ---------------------------------------------------------------- materials
// a brass inlay or gilt relief on a quad: see-through round the lines, metal, a soft glow where it is lit
function __sgBrassMat(tex, glow = 0.12) {
  const m = new Gw({ map: tex, transparent: !0, depthWrite: !1, metalness: 0.72, roughness: 0.32, envMapIntensity: 1.6, emissive: '#ffb45a', emissiveMap: tex, emissiveIntensity: glow, polygonOffset: !0, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.__prOwn = 1;
  m.__sgGlow = glow;
  return __prLit(m);
}
// light added over what is behind (keeping the canvas's alpha: the YouTube screens are holes in it)
function __sgAddMat(tex, k) {
  const m = new Ni({ map: tex, transparent: !0, depthWrite: !1, toneMapped: !1, fog: !1 });
  m.blending = 5;
  m.blendEquation = 100;
  m.blendSrc = 204;
  m.blendDst = 201;
  m.blendSrcAlpha = 200;
  m.blendDstAlpha = 201;
  m.color.setScalar(k);
  m.__prOwn = 1;
  return m;
}
// quads with texture coordinates, merged per material: p the centre, u and v half the width and height
// (the face looks along u x v)
function __sgQuads() {
  const P = [],
    Nn = [],
    UV = [],
    I = [];
  return {
    add(p, u, v, uv = [0, 0, 1, 1]) {
      const k = P.length / 3,
        n = new U(u[0], u[1], u[2]).cross(new U(v[0], v[1], v[2])).normalize();
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        P.push(p[0] + u[0] * su + v[0] * sv, p[1] + u[1] * su + v[1] * sv, p[2] + u[2] * su + v[2] * sv);
        Nn.push(n.x, n.y, n.z);
      }
      UV.push(uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]);
      I.push(k, k + 1, k + 2, k, k + 2, k + 3);
    },
    mesh(root, mat, name, order = 0) {
      if (!P.length) return null;
      const g = new uw();
      g.setAttribute('position', new gi(new Float32Array(P), 3));
      g.setAttribute('normal', new gi(new Float32Array(Nn), 3));
      g.setAttribute('uv', new gi(new Float32Array(UV), 2));
      g.setIndex(I);
      g.computeBoundingSphere();
      const o = new Ow(g, mat);
      o.name = name;
      o.renderOrder = order;
      o.receiveShadow = !0;
      root.add(o);
      return o;
    },
  };
}
// a face's axes from its yaw (the direction it looks: (sin ry, 0, cos ry))
const __sgAx = (ry) => ({ n: [Math.sin(ry), 0, Math.cos(ry)], u: [Math.cos(ry), 0, -Math.sin(ry)] });
// ---------------------------------------------------------------- the drawing
function __cnSacred(root, S, m, ticks) {
  const N = m.__cn,
    // (a copy: compound records add their parts to it as they are drawn)
    list = [...((N && N.sacred) || [])];
  if (!list.length) return;
  const K = __prK,
    gold = K('#c9a45a'),
    goldD = K('#a8843f'),
    T = {},
    tex = (k, ...a) => T[k + a.join()] || (T[k + a.join()] = __SG_TEX[k](...a)),
    Q = {},
    quads = (key) => Q[key] || (Q[key] = { q: __sgQuads(), key }),
    // a wall-mounted quad: centre, the way it looks (ry), its size, standing off the wall by d
    wallQ = (key, x, y, zz, ry, w, h, d = 0.012, uv) => {
      const A = __sgAx(ry);
      quads(key).q.add([x + A.n[0] * d, y, zz + A.n[2] * d], [A.u[0] * w / 2, 0, A.u[2] * w / 2], [0, h / 2, 0], uv);
    },
    // a box against a wall: along u from a0 to a1 (wall coordinates), y0 to y1, standing out d0 to d1
    wallBox = (k, ax, f, s, a0, a1, y0, y1, d0, d1, col) => {
      const e0 = f + s * d0,
        e1 = f + s * d1;
      ax === 'x' ? S.box(k, a0, y0, Math.min(e0, e1), a1, y1, Math.max(e0, e1), col) : S.box(k, Math.min(e0, e1), y0, a0, Math.max(e0, e1), y1, a1, col);
    },
    // segments of a run, less the gaps
    runs = (a0, a1, skip = []) => {
      const out = [];
      let a = a0;
      for (const [s0, s1] of [...skip].sort((p, q) => p[0] - q[0])) s0 > a && out.push([a, Math.min(s0, a1)]), (a = Math.max(a, s1));
      a < a1 && out.push([a, a1]);
      return out.filter(([p, q]) => q - p > 0.05);
    },
    disc = (k, x, y, zz, r, t, col, ry = null) => (ry === null ? S.add(k, __sgUnit('disc'), __cnM(x, y + t / 2, zz, r, t, r), col) : S.add(k, __sgUnit('disc'), __cnM(x + Math.sin(ry) * t / 2, y, zz + Math.cos(ry) * t / 2, r, t, r, ry, Math.PI / 2), col));
  for (const it of list) {
    switch (it.k) {
      // ------------------------------------------------ brass in dark marble, in the floor
      case 'floor': {
        const { x, z: zz, y, r } = it;
        disc('gold', x, y - 0.004, zz, r + 0.06, 0.007, goldD);
        disc('marble', x, y - 0.004, zz, r, 0.011, K(it.field || '#173c44'));
        it.pat === 'fol' && disc('marble', x, y - 0.004, zz, r * 0.84, 0.012, K('#24302d'));
        quads('floor:' + it.pat).q.add([x, y + 0.012, zz], [r, 0, 0], [0, 0, -r]);
        break;
      }
      // ------------------------------------------------ the lobby's coffers: lacquered panels, gilt rosettes
      case 'coffers': {
        const { x0, x1, z0, z1, y } = it,
          xs = [x0],
          zs = [z0];
        for (let x = x0 + 4; x < x1 - 0.5; x += 4) xs.push(x);
        xs.push(x1);
        for (let zz = z0 + 4; zz < z1 - 0.5; zz += 4) zs.push(zz);
        zs.push(z1);
        let n = 0;
        for (let i = 0; i + 1 < xs.length; i++)
          for (let j = 0; j + 1 < zs.length; j++) {
            const a0 = xs[i] + (i ? 0.2 : 0),
              a1 = xs[i + 1] - (i + 2 < xs.length ? 0.2 : 0),
              b0 = zs[j] + (j ? 0.2 : 0),
              b1 = zs[j + 1] - (j + 2 < zs.length ? 0.2 : 0),
              cx = (a0 + a1) / 2,
              cz = (b0 + b1) / 2,
              w = a1 - a0,
              d = b1 - b0;
            // a stepped moulding inside the beams, a gilt fillet, the lacquered field
            for (const [p0, q0, p1, q1] of [[a0, b0, a1, b0 + 0.14], [a0, b1 - 0.14, a1, b1], [a0, b0, a0 + 0.14, b1], [a1 - 0.14, b0, a1, b1]]) S.box('plaster', p0, y - 0.13, q0, p1, y, q1, K('#efe3c8'));
            for (const [p0, q0, p1, q1] of [[a0 + 0.14, b0 + 0.14, a1 - 0.14, b0 + 0.17], [a0 + 0.14, b1 - 0.17, a1 - 0.14, b1 - 0.14], [a0 + 0.14, b0 + 0.14, a0 + 0.17, b1 - 0.14], [a1 - 0.17, b0 + 0.14, a1 - 0.14, b1 - 0.14]]) S.box('gold', p0, y - 0.15, q0, p1, y - 0.005, q1, gold);
            S.box('plaster', a0 + 0.14, y - 0.012, b0 + 0.14, a1 - 0.14, y, b1 - 0.14, K(it.field || '#21465e'));
            if (Math.min(w, d) < 2.6) continue;
            const s = Math.min(w, d) - 0.55;
            quads(n++ % 2 ? 'ceil:seed' : 'ceil:metatron').q.add([cx, y - 0.016, cz], [s / 2, 0, 0], [0, 0, s / 2]);
          }
        break;
      }
      // ------------------------------------------------ a ceiling rosette (a raised plaster disc, a gilt ring)
      case 'ceil': {
        const { x, z: zz, y, r } = it;
        S.add('stucco', __sgUnit('disc'), __cnM(x, y - 0.03, zz, r * 1.18, 0.06, r * 1.18), K('#efe4cc'));
        S.add('gold', __sgUnit('disc'), __cnM(x, y - 0.035, zz, r * 1.04, 0.07, r * 1.04), goldD);
        S.add('stucco', __sgUnit('disc'), __cnM(x, y - 0.04, zz, r, 0.08, r), K(it.field || '#2a1a1e'));
        quads('ceil:' + it.pat).q.add([x, y - 0.088, zz], [r * 0.98, 0, 0], [0, 0, r * 0.98]);
        break;
      }
      // ------------------------------------------------ gold light on a dark ceiling (the auditoriums)
      case 'ceilGlow': {
        const { x, z: zz, y, r } = it;
        quads('glow:' + it.pat + ':' + it.kk).q.add([x, y - 0.03, zz], [r, 0, 0], [0, 0, r]);
        break;
      }
      // ------------------------------------------------ a roundel on a wall: a gilt ring, a dark marble field,
      // the figure in brass
      case 'roundel': {
        const { x, y, z: zz, ry, r } = it,
          A = __sgAx(ry),
          d = it.d || 0.06;
        disc('gold', x, y, zz, r + 0.07, d, goldD, ry);
        disc('marble', x + A.n[0] * d * 0.5, y, zz + A.n[2] * d * 0.5, r, d * 0.6, K(it.field || '#173c44'), ry);
        wallQ('wall:' + it.pat, x, y, zz, ry, r * 2, r * 2, d * 1.1 + 0.008);
        break;
      }
      // ------------------------------------------------ backlit glass (a frame of rosewood and gilt round it)
      case 'glass': {
        const { x, y, z: zz, ry, w, h } = it,
          A = __sgAx(ry),
          f = 0.07;
        // the frame: four rails standing 6 cm off the wall, a gilt bead inside them
        for (const [du, dv, sw, sh] of [[0, h / 2 + f / 2, w + 2 * f, f], [0, -h / 2 - f / 2, w + 2 * f, f], [-w / 2 - f / 2, 0, f, h], [w / 2 + f / 2, 0, f, h]]) S.add('rosewood', __prUnit('box'), __cnM(x + A.u[0] * du + A.n[0] * 0.035, y + dv, zz + A.u[2] * du + A.n[2] * 0.035, sw, sh, 0.07, ry), K('#ffffff'));
        for (const [du, dv, sw, sh] of [[0, h / 2, w, 0.02], [0, -h / 2, w, 0.02], [-w / 2, 0, 0.02, h], [w / 2, 0, 0.02, h]]) S.add('gold', __prUnit('box'), __cnM(x + A.u[0] * du + A.n[0] * 0.06, y + dv, zz + A.u[2] * du + A.n[2] * 0.06, sw, sh, 0.03, ry), gold);
        S.add('gold', __prUnit('box'), __cnM(x + A.u[0] * 0 + A.n[0] * 0.08, y + h / 2 + f + 0.03, zz + A.n[2] * 0.08, 0.22, 0.06, 0.05, ry), gold);
        wallQ('glass:' + (it.tint || 'amber'), x, y, zz, ry, w, h, 0.03);
        break;
      }
      case 'rose': {
        const { x, y, z: zz, ry, r } = it,
          A = __sgAx(ry);
        disc('gold', x, y, zz, r + 0.14, 0.08, gold, ry);
        disc('stucco', x, y, zz, r + 0.32, 0.04, K('#efe2c6'), ry);
        // a ring of twelve small gilt bosses round it
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2,
            du = Math.cos(a) * (r + 0.24),
            dv = Math.sin(a) * (r + 0.24);
          S.add('gold', __prUnit('sph'), __cnM(x + A.u[0] * du + A.n[0] * 0.05, y + dv, zz + A.u[2] * du + A.n[2] * 0.05, 0.05, 0.05, 0.035, ry), gold);
        }
        wallQ('rose', x, y, zz, ry, r * 2, r * 2, 0.085);
        break;
      }
      // ------------------------------------------------ the golden spiral in a framed bay
      case 'spiral': {
        const { x, y, z: zz, ry, w, h } = it;
        const A = __sgAx(ry),
          sb = (du, dv, sw, sh, d0, d1, k, col) => S.add(k, __prUnit('box'), __cnM(x + A.u[0] * du + A.n[0] * (d0 + d1) / 2, y + dv, zz + A.u[2] * du + A.n[2] * (d0 + d1) / 2, sw, sh, d1 - d0, ry), col);
        sb(0, 0, w, h, 0, 0.025, 'marble', K('#1d2624'));
        // a moulded frame: an outer stucco bead and a gilt inner one
        for (const [du, dv, sw, sh] of [[0, h / 2 + 0.07, w + 0.28, 0.14], [0, -h / 2 - 0.07, w + 0.28, 0.14], [-w / 2 - 0.07, 0, 0.14, h], [w / 2 + 0.07, 0, 0.14, h]]) sb(du, dv, sw, sh, 0, 0.07, 'stucco', K('#efe2c6'));
        for (const [du, dv, sw, sh] of [[0, h / 2 + 0.01, w + 0.02, 0.025], [0, -h / 2 - 0.01, w + 0.02, 0.025], [-w / 2 - 0.01, 0, 0.025, h], [w / 2 + 0.01, 0, 0.025, h]]) sb(du, dv, sw, sh, 0, 0.05, 'gold', gold);
        wallQ('wall:spiral', x, y, zz, ry, w * 0.985, h * 0.985, 0.038);
        break;
      }
      // ------------------------------------------------ a framed bay (a moulding round a panel of the wall)
      case 'bay': {
        const { ax, f, s, a0, a1, y0, y1 } = it;
        for (const [p0, p1, q0, q1] of [[a0, a1, y1 - 0.12, y1], [a0, a1, y0, y0 + 0.12], [a0, a0 + 0.12, y0, y1], [a1 - 0.12, a1, y0, y1]]) wallBox('stucco', ax, f, s, p0, p1, q0, q1, 0, 0.06, K('#efe2c6'));
        for (const [p0, p1, q0, q1] of [[a0 + 0.12, a1 - 0.12, y1 - 0.145, y1 - 0.12], [a0 + 0.12, a1 - 0.12, y0 + 0.12, y0 + 0.145], [a0 + 0.12, a0 + 0.145, y0 + 0.12, y1 - 0.12], [a1 - 0.145, a1 - 0.12, y0 + 0.12, y1 - 0.12]]) wallBox('gold', ax, f, s, p0, p1, q0, q1, 0, 0.035, gold);
        break;
      }
      // ------------------------------------------------ a fluted pilaster with a stepped gilt capital
      case 'pilaster': {
        const { ax, f, s, a, y0, y1 } = it,
          w = it.w || 0.5;
        wallBox('marble', ax, f, s, a - w / 2 - 0.07, a + w / 2 + 0.07, y0, y0 + 0.42, 0, 0.13, K('#e9e2d4'));
        wallBox('gold', ax, f, s, a - w / 2 - 0.05, a + w / 2 + 0.05, y0 + 0.42, y0 + 0.47, 0, 0.11, gold);
        wallBox('stucco', ax, f, s, a - w / 2, a + w / 2, y0 + 0.47, y1 - 0.5, 0, 0.08, K('#f0e5cd'));
        for (let k = 0; k < 5; k++) {
          const c = a - w / 2 + (w * (k + 0.5)) / 5;
          wallBox('gold', ax, f, s, c - 0.012, c + 0.012, y0 + 0.62, y1 - 0.66, 0.08, 0.088, goldD);
        }
        // the capital: three steps out, a band of light gilt
        wallBox('gold', ax, f, s, a - w / 2 - 0.02, a + w / 2 + 0.02, y1 - 0.5, y1 - 0.4, 0, 0.1, goldD);
        wallBox('stucco', ax, f, s, a - w / 2 - 0.06, a + w / 2 + 0.06, y1 - 0.4, y1 - 0.22, 0, 0.12, K('#f0e5cd'));
        wallBox('gold', ax, f, s, a - w / 2 - 0.1, a + w / 2 + 0.1, y1 - 0.22, y1 - 0.14, 0, 0.15, gold);
        wallBox('stucco', ax, f, s, a - w / 2 - 0.14, a + w / 2 + 0.14, y1 - 0.14, y1, 0, 0.18, K('#f0e5cd'));
        break;
      }
      // ------------------------------------------------ a frieze of interlaced circles under a moulded cornice
      case 'frieze': {
        const { ax, f, s, a0, a1, y0, y1 } = it,
          h = y1 - y0,
          ry = ax === 'x' ? (s > 0 ? 0 : Math.PI) : s > 0 ? Math.PI / 2 : -Math.PI / 2,
          // the texture's period: ten circles in 4 x its height
          per = h * 4;
        for (const [p0, p1] of runs(a0, a1, it.skip)) {
          wallBox('marble', ax, f, s, p0, p1, y0, y1, 0, 0.03, K(it.field || '#1d2321'));
          wallBox('gold', ax, f, s, p0, p1, y0 - 0.035, y0, 0, 0.05, gold);
          wallBox('gold', ax, f, s, p0, p1, y1, y1 + 0.035, 0, 0.05, gold);
          if (it.cornice) {
            wallBox('stucco', ax, f, s, p0, p1, y1 + 0.035, y1 + 0.2, 0, 0.09, K('#efe2c6'));
            wallBox('stucco', ax, f, s, p0, p1, y1 + 0.2, y1 + 0.32, 0, 0.17, K('#f2e7cf'));
            wallBox('gold', ax, f, s, p0, p1, y1 + 0.32, y1 + 0.35, 0, 0.19, goldD);
            wallBox('stucco', ax, f, s, p0, p1, y1 + 0.35, Math.max(y1 + 0.5, it.top || 0), 0, 0.24, K('#f2e7cf'));
          }
          // the strip (u along the run, whichever way the face looks)
          const mid = (p0 + p1) / 2,
            L = p1 - p0,
            cx = ax === 'x' ? mid : f + s * 0.032,
            cz = ax === 'x' ? f + s * 0.032 : mid,
            A = __sgAx(ry),
            sgn = ax === 'x' ? A.u[0] : A.u[2],
            u0 = (sgn > 0 ? p0 : -p1) / per;
          quads('frieze').q.add([cx, (y0 + y1) / 2, cz], [A.u[0] * L / 2, 0, A.u[2] * L / 2], [0, h / 2, 0], [u0, 0, u0 + L / per, 1]);
        }
        break;
      }
      // ------------------------------------------------ a moulded cornice (outside: the facade's parapets)
      case 'cornice': {
        const { ax, f, s, a0, a1, y } = it;
        for (const [p0, p1] of runs(a0, a1, it.skip)) {
          wallBox('stucco', ax, f, s, p0, p1, y - 0.42, y - 0.3, 0, 0.1, K('#ddcdaf'));
          wallBox('gold', ax, f, s, p0, p1, y - 0.3, y - 0.26, 0, 0.13, goldD);
          wallBox('stucco', ax, f, s, p0, p1, y - 0.26, y - 0.12, 0, 0.18, K('#e9dcc4'));
          wallBox('stucco', ax, f, s, p0 - 0.05, p1 + 0.05, y - 0.12, y + 0.02, 0, 0.28, K('#efe3cb'));
        }
        break;
      }
      // ------------------------------------------------ a rosewood wainscot: raised panels, a gilt cap rail
      case 'wainscot': {
        const { ax, f, s, a0, a1, y0, y1 } = it,
          pw = it.pw || 1.25;
        for (const [p0, p1] of runs(a0, a1, it.skip)) {
          wallBox('rosewood', ax, f, s, p0, p1, y0, y1, 0, 0.035, K('#ffffff'));
          wallBox('marble', ax, f, s, p0, p1, y0, y0 + 0.14, 0, 0.05, K('#2a2624'));
          wallBox('gold', ax, f, s, p0, p1, y1, y1 + 0.04, 0, 0.065, gold);
          const n = Math.max(1, Math.round((p1 - p0) / pw)),
            sp = (p1 - p0) / n;
          for (let i = 0; i < n; i++) {
            const q0 = p0 + sp * i + 0.1,
              q1 = p0 + sp * (i + 1) - 0.1;
            if (q1 - q0 < 0.15) continue;
            wallBox('rosewood', ax, f, s, q0, q1, y0 + 0.24, y1 - 0.1, 0.035, 0.05, K('#e8d4c0'));
            for (const [r0, r1, t0, t1] of [[q0, q1, y1 - 0.12, y1 - 0.1], [q0, q1, y0 + 0.24, y0 + 0.26], [q0, q0 + 0.02, y0 + 0.24, y1 - 0.1], [q1 - 0.02, q1, y0 + 0.24, y1 - 0.1]]) wallBox('gold', ax, f, s, r0, r1, t0, t1, 0.035, 0.055, goldD);
          }
        }
        break;
      }
      // ------------------------------------------------ the mezzanine's fascia: moulded, a frieze band
      case 'fascia': {
        const { x0, x1, z: zz, y0, y1 } = it;
        S.box('stucco', x0, y0, zz - 0.1, x1, y1, zz, K('#efe2c6'));
        S.box('gold', x0, y0 - 0.04, zz - 0.13, x1, y0, zz, gold);
        S.box('stucco', x0, y0 - 0.16, zz - 0.06, x1, y0 - 0.04, zz, K('#e7d9bd'));
        S.box('gold', x0, y1 - 0.03, zz - 0.12, x1, y1, zz, gold);
        const h = (y1 - y0) * 0.55,
          yc = (y0 + y1) / 2,
          per = h * 4;
        S.box('marble', x0 + 0.05, yc - h / 2, zz - 0.115, x1 - 0.05, yc + h / 2, zz - 0.1, K('#1d2321'));
        quads('frieze').q.add([(x0 + x1) / 2, yc, zz - 0.118], [-(x1 - x0 - 0.1) / 2, 0, 0], [0, h / 2, 0], [0, 0, (x1 - x0 - 0.1) / per, 1]);
        break;
      }
      // ------------------------------------------------ the concession counter's front
      case 'counter': {
        const { x0, x1, z: zz, y0, y1 } = it;
        S.box('marble', x0 - 0.04, y0, zz - 0.05, x1 + 0.04, y0 + 0.14, zz, K('#141312'));
        S.box('gold', x0 - 0.04, y0 + 0.14, zz - 0.06, x1 + 0.04, y0 + 0.165, zz, gold);
        S.cyl('marble', [x0 - 0.2, y1 + 0.03, zz - 0.085], [x1 + 0.2, y1 + 0.03, zz - 0.085], 0.032, K('#f1ece2'), 'cyl16');
        for (const x of it.fillets || []) S.box('gold', x - 0.03, y0 + 0.165, zz - 0.03, x + 0.03, y1 - 0.02, zz, gold);
        for (const x of it.medallions || []) {
          disc('gold', x, (y0 + y1) / 2 + 0.05, zz, 0.38, 0.02, goldD, Math.PI);
          disc('marble', x, (y0 + y1) / 2 + 0.05, zz - 0.01, 0.34, 0.025, K('#1e2826'), Math.PI);
          wallQ('wall:seed', x, (y0 + y1) / 2 + 0.05, zz, Math.PI, 0.68, 0.68, 0.045);
        }
        break;
      }
      // ------------------------------------------------ a crown moulding where a wall meets the ceiling
      case 'crown': {
        const { ax, f, s, a0, a1, y } = it;
        for (const [p0, p1] of runs(a0, a1, it.skip)) {
          wallBox('stucco', ax, f, s, p0, p1, y - 0.24, y, 0, 0.07, K('#efe2c6'));
          wallBox('gold', ax, f, s, p0, p1, y - 0.27, y - 0.24, 0, 0.09, gold);
          wallBox('stucco', ax, f, s, p0, p1, y - 0.15, y, 0, 0.14, K('#f2e7cf'));
          wallBox('stucco', ax, f, s, p0, p1, y - 0.07, y, 0, 0.22, K('#f4ead4'));
        }
        break;
      }
      // ------------------------------------------------ a beam across the Promenade's ceiling
      case 'pbeam': {
        const { x, z0, z1, y } = it;
        S.box('stucco', x - 0.18, y - 0.26, z0, x + 0.18, y, z1, K('#efe2c6'));
        S.box('gold', x - 0.19, y - 0.29, z0, x + 0.19, y - 0.26, z1, gold);
        S.box('stucco', x - 0.26, y - 0.1, z0, x + 0.26, y, z1, K('#f2e7cf'));
        // a stepped corbel at each end
        for (const [za, zb] of [[z0, z0 + 0.3], [z1 - 0.3, z1]]) S.box('stucco', x - 0.22, y - 0.62, za, x + 0.22, y - 0.26, zb, K('#e9dbbf')), S.box('gold', x - 0.23, y - 0.66, za, x + 0.23, y - 0.62, zb, gold);
        break;
      }
      // ------------------------------------------------ the box office: rounded corners, a gilt roll on the canopy
      case 'kiosk': {
        const { x0, x1, z0, z1, y0, y1 } = it;
        for (const [x, zz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
          S.add('stucco', __sgUnit('rod'), __cnM(x, (y0 + y1) / 2, zz, 0.22, y1 - y0, 0.22), K('#efe2c8'));
          for (const y of [y0 + 0.95, y1 - 0.08]) S.add('gold', __sgUnit('rod'), __cnM(x, y, zz, 0.235, 0.05, 0.235), gold);
          S.add('marble', __sgUnit('rod'), __cnM(x, y0 + 0.45, zz, 0.25, 0.9, 0.25), K('#efe8dc'));
        }
        S.cyl('gold', [x0 - 0.5, 2.825, z0 - 0.7], [x1 + 0.5, 2.825, z0 - 0.7], 0.13, gold, 'cyl16');
        S.cyl('gold', [x0 - 0.5, 2.825, z0 - 0.7], [x0 - 0.5, 2.825, z1 + 0.35], 0.13, gold, 'cyl16');
        S.cyl('gold', [x1 + 0.5, 2.825, z0 - 0.7], [x1 + 0.5, 2.825, z1 + 0.35], 0.13, gold, 'cyl16');
        disc('gold', (x0 + x1) / 2, 1.9, z1, 0.62, 0.03, goldD, 0);
        disc('marble', (x0 + x1) / 2, 1.9, z1 + 0.015, 0.56, 0.03, K('#173c44'), 0);
        wallQ('wall:seed', (x0 + x1) / 2, 1.9, z1, 0, 1.12, 1.12, 0.055);
        break;
      }
      // ------------------------------------------------ the Starlight's hallway: from the Promenade to the sphere
      // Proportioned by φ: 3 m wide, 4.85 m high and long; a runner 1.85 m wide (the width / φ); a rosewood
      // wainscot 1.15 m high (the height / φ³); framed bays 1.4 x 2.27 m (1 : φ); the portal's opening 2.0 x
      // 3.24 m (1 : φ). Marble floor with a brass-edged runner, silk walls, brass sconces, a coved ceiling washed
      // by hidden light round a gilt rosette, and at the far end a gilt portal in black velour: through it, the film
      case 'hallway': {
        const { x, z0, z1, w, h, y } = it,
          xl = x - w / 2,
          xr = x + w / 2,
          zm = (z0 + z1) / 2,
          L = z1 - z0,
          rw = w / __PHI,
          wh = +(h / __PHI ** 3).toFixed(2),
          silk = K('#cdb98f');
        // the floor: cream marble, dark marble borders with a brass line, the runner
        S.box('marble', xl, y - 0.12, z0, xr, y + 0.004, z1, K('#efe9de'));
        for (const sd of [-1, 1]) {
          const e = sd < 0 ? xl : xr;
          S.box('marble', Math.min(e, e - sd * 0.32), y + 0.004, z0, Math.max(e, e - sd * 0.32), y + 0.007, z1, K('#262220'));
          S.box('gold', Math.min(e - sd * 0.34, e - sd * 0.36), y + 0.004, z0, Math.max(e - sd * 0.34, e - sd * 0.36), y + 0.008, z1, gold);
          S.box('gold', x + sd * (rw / 2) - 0.03, y + 0.004, z0 + 0.35, x + sd * (rw / 2) + 0.03, y + 0.022, z1, gold);
        }
        S.box('carpet', x - rw / 2 + 0.03, y + 0.004, z0 + 0.35, x + rw / 2 - 0.03, y + 0.02, z1, K('#7a1a26'));
        // the walls: silk over a rosewood wainscot, a pilaster at each end, two framed bays with a roundel each
        for (const [f, s] of [[xl, 1], [xr, -1]]) {
          S.box('jacquard', Math.min(f, f - s * 0.05), y, z0, Math.max(f, f - s * 0.05), y + h, z1, silk);
          list.push({ k: 'wainscot', ax: 'z', f, s, a0: z0 + 0.55, a1: z1 - 0.55, y0: y, y1: y + wh, pw: 0.7 });
          for (const a of [z0 + 0.32, z1 - 0.32]) list.push({ k: 'pilaster', ax: 'z', f, s, a, y0: y, y1: y + h - 0.3, w: 0.4 });
          const bw = 1.4,
            bh = +(bw * __PHI).toFixed(2);
          for (const c of [zm - 0.92, zm + 0.92]) {
            list.push({ k: 'bay', ax: 'z', f, s, a0: c - bw / 2, a1: c + bw / 2, y0: y + wh + 0.3, y1: y + wh + 0.3 + bh });
            list.push({ k: 'roundel', pat: 'seed', x: f + s * 0.02, y: y + wh + 0.3 + bh / 2, z: c, ry: s > 0 ? Math.PI / 2 : -Math.PI / 2, r: 0.42, d: 0.04 });
          }
          list.push({ k: 'crown', ax: 'z', f, s, a0: z0, a1: z1, y: y + h });
        }
        // the ceiling: a cove of hidden light along both sides, a flat field with a gilt rosette in the middle
        S.box('plaster', xl, y + h, z0, xr, y + h + 0.1, z1, K('#e9dec8'));
        for (const sd of [-1, 1]) {
          const e = sd < 0 ? xl : xr;
          S.box('stucco', Math.min(e, e - sd * 0.42), y + h - 0.5, z0, Math.max(e, e - sd * 0.42), y + h - 0.42, z1, K('#efe2c6'));
          S.box('gold', Math.min(e - sd * 0.42, e - sd * 0.44), y + h - 0.52, z0, Math.max(e - sd * 0.42, e - sd * 0.44), y + h - 0.36, z1, gold);
          S.box('glow', Math.min(e - sd * 0.08, e - sd * 0.38), y + h - 0.42, z0, Math.max(e - sd * 0.08, e - sd * 0.38), y + h - 0.41, z1, K('#ffcf8a'));
        }
        list.push({ k: 'ceil', pat: 'metatron', x, z: zm, y: y + h, r: 0.62, field: '#1d3a44' });
        // the portal: a black velour panel across the far end, the opening (2.0 x 3.24 m) in a gilt architrave
        // with a keystone, slim backlit teal glass either side
        const dw = it.door.w,
          dh = it.door.h,
          pz = z0 + 0.3,
          bk = K('#0a0a0d');
        // (from the floor's underside up: from inside the sphere nothing pale shows under the panel)
        S.box('black', xl, y - 0.4, z0 - 0.05, x - dw / 2, y + h, pz, bk);
        S.box('black', x + dw / 2, y - 0.4, z0 - 0.05, xr, y + h, pz, bk);
        S.box('black', x - dw / 2, y - 0.4, z0 - 0.06, x + dw / 2, y - 0.02, z0 - 0.04, bk);
        S.box('black', x - dw / 2, y + dh, z0 - 0.05, x + dw / 2, y + h, pz, bk);
        for (const sd of [-1, 1]) S.box('gold', x + sd * (dw / 2) - (sd > 0 ? 0 : 0.14), y, pz, x + sd * (dw / 2) + (sd > 0 ? 0.14 : 0), y + dh + 0.14, pz + 0.06, gold);
        S.box('gold', x - dw / 2 - 0.14, y + dh, pz, x + dw / 2 + 0.14, y + dh + 0.14, pz + 0.06, gold);
        S.box('gold', x - dw / 2 - 0.2, y + dh + 0.14, pz, x + dw / 2 + 0.2, y + dh + 0.2, pz + 0.09, gold);
        S.box('gold', x - 0.16, y + dh - 0.04, pz, x + 0.16, y + dh + 0.3, pz + 0.1, goldD);
        // (a hair inside the opening: the reveal, gilt)
        for (const sd of [-1, 1]) S.box('gold', x + sd * (dw / 2) - 0.02, y, z0 - 0.05, x + sd * (dw / 2) + 0.02, y + dh, pz, goldD);
        for (const sd of [-1, 1]) list.push({ k: 'glass', x: x + sd * (dw / 2 + 0.27), y: y + 1.75, z: pz, ry: 0, w: 0.26, h: 2.6, tint: 'teal' });
        // the threshold: a brass strip where the floor ends and the film begins
        S.box('gold', x - dw / 2, y - 0.02, z0 - 0.05, x + dw / 2, y + 0.012, z0 + 0.06, gold);
        break;
      }
      // ------------------------------------------------ wrought-iron railings between brick piers (the lot)
      case 'railing': {
        const { ax, f, a0, a1, y, h } = it,
          n = Math.max(1, Math.round((a1 - a0) / 2.6)),
          sp = (a1 - a0) / n,
          P = (a, yy) => (ax === 'x' ? [a, yy, f] : [f, yy, a]),
          box = (k, p0, p1, col) => S.box(k, Math.min(p0[0], p1[0]), p0[1], Math.min(p0[2], p1[2]), Math.max(p0[0], p1[0]), p1[1], Math.max(p0[2], p1[2]), col),
          iron = K('#1c1d1f');
        for (let i = 0; i <= n; i++) {
          const a = a0 + sp * i,
            [px, , pz] = P(a, 0);
          S.box('brick', px - 0.25, y - 0.15, pz - 0.25, px + 0.25, y + h, pz + 0.25, K('#d9cbb8'));
          S.box('granite', px - 0.3, y + h, pz - 0.3, px + 0.3, y + h + 0.1, pz + 0.3, K('#cfc6b8'));
          S.add('gold', __prUnit('sph'), __cnM(px, y + h + 0.2, pz, 0.1, 0.1, 0.1), gold);
          if (i === n) break;
          // the bays between: a low granite curb, two rails, bars with spear tips
          const p0 = P(a + 0.25, 0),
            p1 = P(a + sp - 0.25, 0);
          box('granite', [p0[0] - (ax === 'z' ? 0.12 : 0), y - 0.15, p0[2] - (ax === 'x' ? 0.12 : 0)], [p1[0] + (ax === 'z' ? 0.12 : 0), y + 0.25, p1[2] + (ax === 'x' ? 0.12 : 0)], K('#cfc6b8'));
          for (const yy of [y + 0.4, y + h - 0.25]) S.cyl('dark', P(a + 0.25, yy), P(a + sp - 0.25, yy), 0.018, iron, 'cyl6');
          for (let b = a + 0.37; b < a + sp - 0.3; b += 0.13) {
            S.cyl('dark', P(b, y + 0.25), P(b, y + h - 0.12), 0.011, iron, 'cyl6');
            S.add('gold', __prUnit('cone8'), __cnM(...P(b, y + h - 0.05), 0.025, 0.12, 0.025), goldD);
          }
        }
        break;
      }
      // ------------------------------------------------ a ribbed fin on the facade
      case 'fin': {
        const { x, z0, z1, y0, y1 } = it;
        for (const dx of [-0.22, 0, 0.22]) S.box('gold', x + dx - 0.025, y0 + 0.6, z0 - 0.04, x + dx + 0.025, y1 - 0.4, z0, gold);
        S.box('stucco', x - 0.55, y1 - 0.4, z0 - 0.08, x + 0.55, y1, z1, K('#d9c8a8'));
        S.box('gold', x - 0.58, y1 - 0.44, z0 - 0.1, x + 0.58, y1 - 0.4, z1, gold);
        S.box('granite', x - 0.55, 0, z0 - 0.06, x + 0.55, y0 + 0.6, z1, K('#cfc6b8'));
        break;
      }
    }
  }
  // ------------------------------------------------ the textured quads, one mesh per figure and finish
  const mats = [];
  for (const key in Q) {
    const [kind, pat, kk] = key.split(':');
    let mt,
      order = 2;
    if (kind === 'floor') mt = __sgBrassMat(tex(pat), 0.22);
    else if (kind === 'ceil' || kind === 'wall') mt = __sgBrassMat(tex(pat), kind === 'ceil' ? 0.45 : 0.35);
    else if (kind === 'frieze') mt = __sgBrassMat(tex('frieze'), 0.35);
    else if (kind === 'glow') (mt = __sgAddMat(tex(pat, 'glow'), +kk || 0.4)), (order = 3);
    else if (kind === 'glass') mt = __cnGlowMat(tex('glass', __SG_GLASS[pat] || __SG_GLASS.amber), 1.0);
    else if (kind === 'rose') mt = __cnGlowMat(tex('rose'), 1.0, { transparent: !0, alphaTest: 0.02 });
    if (!mt) continue;
    mats.push(mt);
    Q[key].q.mesh(root, mt, 'cinema_sacred_' + key.replace(/:/g, '_'), order);
  }
  // the glow follows the time of day (the gilt glows more at night, under the lamps)
  ticks.push(() => {
    const tod = Zw.getState().timeOfDay,
      k = tod === 'night' ? 1.6 : tod === 'dusk' ? 1.3 : 1;
    for (const mt of mats) mt.__sgGlow !== void 0 && (mt.emissiveIntensity = mt.__sgGlow * k);
  });
}
// the backlit panels' glass (top to bottom)
const __SG_GLASS = {
  amber: [[0, '#2a4a5a'], [0.18, '#c88a34'], [0.5, '#f0c070'], [0.82, '#b0582c'], [1, '#1e3a52']],
  rose: [[0, '#3a1a3a'], [0.2, '#b04050'], [0.5, '#f0b080'], [0.8, '#a83848'], [1, '#2a1838']],
  teal: [[0, '#10303a'], [0.2, '#2a8a8a'], [0.5, '#e8d090'], [0.8, '#2a7a84'], [1, '#0e2a36']],
};
// ---------------------------------------------------------------- the parked cars
// Poly Haven's covered car (a scan: a fitted cover over a saloon), instanced; each cover its own colour
function __cnCars(root, N, models, ticks) {
  const g = models.covered_car;
  if (!g || !N.cars || !N.cars.length) return 0;
  const { parts } = __flParts(g);
  const M = new _A(),
    Qr = new Kw(),
    P = new U(),
    Sc = new U(1, 1, 1),
    Y = new U(0, 1, 0),
    col = new UA(),
    // in two groups, each drawn only from where it can be seen: the street front's (the street, the parking lot)
    // and the yard's (the staff lot)
    groups = [N.cars.filter((c) => c.z < 60), N.cars.filter((c) => c.z >= 60)].filter((l) => l.length).map((list) => {
      const grp = new ji();
      grp.userData.dyn = 1;
      grp.userData.front = list[0].z < 60;
      for (const p of parts) {
        for (const mt of [].concat(p.mat)) __prLit(mt);
        const im = new QZ(p.geo, p.mat, list.length);
        list.forEach((c, k) => {
          Qr.setFromAxisAngle(Y, c.ry);
          im.setMatrixAt(k, M.compose(P.set(c.x, c.y || 0, c.z), Qr, Sc).multiply(p.M));
          Array.isArray(c.c) ? col.setRGB(c.c[0], c.c[1], c.c[2]) : col.set(c.c || '#ffffff');
          im.setColorAt(k, col);
        });
        im.instanceMatrix.needsUpdate = !0;
        im.instanceColor.needsUpdate = !0;
        im.computeBoundingSphere();
        im.castShadow = im.receiveShadow = !0;
        im.name = 'cinema_car';
        grp.add(im);
      }
      root.add(grp);
      return grp;
    });
  const { P1, BACK } = __CN;
  ticks &&
    ticks.push((dt, s) => {
      const p = s && s.camera && s.camera.position;
      if (!p) return;
      for (const grp of groups) grp.visible = grp.userData.front ? p.z < P1 + 2 || p.y > 13 : p.z > BACK - 4 || p.y > 13;
    });
  return N.cars.length;
}
