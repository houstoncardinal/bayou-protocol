/* ===== Bayou Protocol mod: Blackwater Penitentiary in 3D (furniture, fixtures, signs, the riot) ===== */
// Modelled inside the collision boxes of 35-prison.js:
//   - cells: steel bunks with mattresses, pillows and blankets (made up or thrown about), a stainless
//     toilet-sink, a wall desk and stool, a shelf of books and cups, a caged lamp, a slit window
//   - solitary: concrete bunks, steel toilets
//   - round dayroom tables with stools on arms, long cafeteria tables, visitation stools
//   - lamps: fluorescent fittings, caged sconces, industrial pendants, gallery strip lights, floodlights on
//     poles, gothic lanterns at the gatehouse (they glow, brighter at night)
//   - gun towers (steel legs and bracing, a cab, a hipped roof, a sweeping searchlight), basketball hoops,
//     weight benches and a rack, aluminium bleachers, planters
//   - the kitchen (range and hood, steam kettles, prep tables, the serving line, a three-bay sink), the laundry
//     (front-loading washers, folding tables, carts), the gatehouse security lane, consoles with CCTV
//     screens, payphones, a caged TV, a fountain, curtains in the infirmary, the dock
//   - signs and stencils (painted on canvas), graffiti and scorch marks, burning barrels, tyres and a
//     mattress with smoke, alarm beacons turning, security cameras, Poly Haven props
//   - Jailbreak: the locked cells' doors (they slide open when the lock is cut) and their lock panels
function __prMats(k) {
  if (k === 'glow') return __PR.glowMat || (__PR.glowMat = Object.assign(new Ni({ vertexColors: !0, toneMapped: !1 }), { __prOwn: 1 }));
  if (k === 'mesh') return __PR.meshMat || (__PR.meshMat = __prAlphaMat(__prChainTex(), '#b9c0c4', 1));
  if (k === 'net') return __PR.netMat || (__PR.netMat = __prAlphaMat(__prChainTex(), '#f4f4f0', 1, { metal: 0, rough: 0.9 }));
  // thin rods (bars, balusters, rails, wires): plain painted steel (a texture is invisible at their width, and
  // the textured shader on thousands of thin cylinders was the cell house's biggest cost)
  if (k === 'rod') return __PR.rodMat || (__PR.rodMat = __prLit(Object.assign(new Gw({ vertexColors: !0, roughness: 0.5, metalness: 0.5, envMapIntensity: 0.7 }), { __prOwn: 1 })));
  if (k === 'darkM') return __PR.darkMat || (__PR.darkMat = __prLit(Object.assign(new Gw({ color: '#2a2e31', roughness: 0.5, metalness: 0.6 }), { __prOwn: 1 })));
  if (k === 'glassL') return __PR.glassLMat || (__PR.glassLMat = Object.assign(new Gw({ color: '#c8dbe2', roughness: 0.08, metalness: 0.2, transparent: !0, opacity: 0.35, depthWrite: !1, envMapIntensity: 1.5 }), { __prOwn: 1 }));
  return __prMatFor(__PR_SURF[k] ? k : 'paint');
}
// ---------------------------------------------------------------- canvas: signs, decals, screens
function __prSignDraw(c, w, h, sg) {
  const lines = String(sg.text).split('\n'),
    font = (px, wgt = 800) => `${wgt} ${px}px "Chakra Petch", "Arial Narrow", Arial, sans-serif`,
    fit = (txt, px, maxW, wgt) => {
      let p = px;
      c.font = font(p, wgt);
      while (c.measureText(txt).width > maxW && p > 6) c.font = font(--p, wgt);
      return p;
    };
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const st = sg.style;
  if (st === 'cellno') {
    c.fillStyle = '#1b1f22';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ece8dc';
    fit(lines[0], h * 0.78, w * 0.9);
    c.fillText(lines[0], w / 2, h / 2 + 1);
    return;
  }
  if (st === 'warn') {
    c.fillStyle = '#e8b923';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#16181a';
    for (let x = -h; x < w + h; x += h * 0.5) c.beginPath(), c.moveTo(x, h), c.lineTo(x + h * 0.25, h), c.lineTo(x + h * 0.5, h * 0.82), c.lineTo(x + h * 0.25, h * 0.82), c.fill();
    fit(lines[0], h * 0.42, w * 0.92);
    c.fillText(lines[0], w / 2, h * 0.42);
    return;
  }
  if (st === 'menu') {
    c.fillStyle = '#26332c';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#6b4a2e';
    c.lineWidth = h * 0.06;
    c.strokeRect(0, 0, w, h);
    c.fillStyle = 'rgba(240,236,220,0.92)';
    fit('CHOW HALL', h * 0.2, w * 0.8, 700);
    c.fillText('CHOW HALL', w / 2, h * 0.22);
    fit(lines[0], h * 0.15, w * 0.9, 500);
    c.fillText(lines[0], w / 2, h * 0.6);
    return;
  }
  if (st === 'board') {
    c.fillStyle = '#9a7650';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#20262a';
    c.fillRect(0, 0, w, h * 0.22);
    c.fillStyle = '#f0ece0';
    fit(lines[0], h * 0.14, w * 0.92);
    c.fillText(lines[0], w / 2, h * 0.11);
    let seed = 7;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 9; k++) {
      const pw = w * (0.12 + r() * 0.1),
        ph = h * (0.22 + r() * 0.12),
        px = w * 0.04 + r() * (w * 0.92 - pw),
        py = h * 0.28 + r() * (h * 0.68 - ph);
      c.fillStyle = ['#f4f1e6', '#f6e7a8', '#e8eef2', '#f4f1e6'][k % 4];
      c.fillRect(px, py, pw, ph);
      c.fillStyle = 'rgba(40,40,40,0.55)';
      for (let l = 0; l < 5; l++) c.fillRect(px + pw * 0.1, py + ph * (0.2 + l * 0.14), pw * (0.5 + r() * 0.35), Math.max(1, ph * 0.03));
      c.fillStyle = '#c0392b';
      c.beginPath();
      c.arc(px + pw / 2, py + 3, 3, 0, Math.PI * 2);
      c.fill();
    }
    return;
  }
  if (st === 'plaque') {
    c.fillStyle = '#23302c';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#b89b5a';
    c.lineWidth = h * 0.06;
    c.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16);
    c.fillStyle = '#d8c48a';
    const x0 = sg.cross ? w * 0.12 : 0;
    if (sg.cross) {
      c.fillStyle = '#c4302b';
      c.fillRect(w * 0.06, h * 0.38, h * 0.48, h * 0.24);
      c.fillRect(w * 0.06 + h * 0.12, h * 0.26, h * 0.24, h * 0.48);
      c.fillStyle = '#e9e6dc';
    }
    fit(lines[0], h * 0.5, w * 0.8 - x0, 700);
    c.fillText(lines[0], w / 2 + x0 / 2, h / 2 + 1);
    return;
  }
  if (st === 'rules') {
    c.fillStyle = '#eceae2';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#21486b';
    c.fillRect(0, 0, w, h * (lines.length > 1 ? 0.26 : 0.3));
    c.fillStyle = '#f2f0e8';
    fit(lines[0], h * 0.17, w * 0.9);
    c.fillText(lines[0], w / 2, h * 0.13);
    c.fillStyle = '#22262a';
    lines.slice(1).forEach((l, i) => (fit(l, h * 0.13, w * 0.9, 600), c.fillText(l, w / 2, h * (0.4 + i * 0.2))));
    lines.length === 1 && (fit(lines[0], h * 0.2, w * 0.9, 600), c.fillText(lines[0], w / 2, h * 0.62));
    return;
  }
  // plate / notice
  c.fillStyle = st === 'notice' ? '#efede6' : '#273238';
  c.fillRect(0, 0, w, h);
  st === 'notice' && ((c.fillStyle = '#b3261e'), c.fillRect(0, 0, w, h * 0.12), c.fillRect(0, h * 0.88, w, h * 0.12));
  c.fillStyle = st === 'notice' ? '#1c1f22' : '#f1efe8';
  fit(lines[0], h * 0.55, w * 0.94);
  c.fillText(lines[0], w / 2, h / 2 + 1);
}
// an atlas of every sign (shelf-packed), drawn once per build
function __prSignAtlas(list, alpha) {
  const S2 = 2048,
    ppm = alpha ? 160 : 220,
    cv = document.createElement('canvas');
  cv.width = cv.height = S2;
  const c = cv.getContext('2d');
  alpha || ((c.fillStyle = '#777'), c.fillRect(0, 0, S2, S2));
  let x = 0,
    y = 0,
    row = 0;
  const out = [];
  for (const sg of list) {
    let w = Math.min(560, Math.max(24, Math.round(sg.w * ppm))),
      h = Math.min(320, Math.max(12, Math.round(sg.h * ppm)));
    if (x + w > S2) (x = 0), (y += row + 2), (row = 0);
    if (y + h > S2) break;
    c.save();
    c.translate(x, y);
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
    alpha ? __prDecalDraw(c, w, h, sg) : __prSignDraw(c, w, h, sg);
    c.restore();
    out.push({ sg, u0: x / S2, v0: 1 - (y + h) / S2, u1: (x + w) / S2, v1: 1 - y / S2 });
    x += w + 2;
    row = Math.max(row, h);
  }
  const t = new LI(cv);
  t.colorSpace = 'srgb';
  t.anisotropy = 8;
  return { tex: t, out };
}
function __prDecalDraw(c, w, h, d) {
  if (d.kind === 'scorch') {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2);
    g.addColorStop(0, 'rgba(12,10,9,0.92)');
    g.addColorStop(0.45, 'rgba(22,18,15,0.7)');
    g.addColorStop(1, 'rgba(30,25,20,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    let seed = 3;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 40; k++) {
      c.fillStyle = `rgba(10,8,6,${0.15 + r() * 0.3})`;
      c.beginPath();
      c.arc(w / 2 + (r() - 0.5) * w * 0.8, h / 2 + (r() - 0.5) * h * 0.8, r() * w * 0.08, 0, Math.PI * 2);
      c.fill();
    }
    return;
  }
  if (d.kind === 'carved') {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const lines = [d.text, d.sub].filter(Boolean);
    lines.forEach((l, i) => {
      let px = (h * (lines.length > 1 ? (i ? 0.3 : 0.42) : 0.62)) | 0;
      c.font = `700 ${px}px "Times New Roman", Georgia, serif`;
      while (c.measureText(l).width > w * 0.94 && px > 6) c.font = `700 ${--px}px "Times New Roman", Georgia, serif`;
      const y = lines.length > 1 ? h * (i ? 0.78 : 0.34) : h / 2;
      c.fillStyle = 'rgba(255,250,240,0.55)';
      c.fillText(l, w / 2 + 1, y + 1);
      c.fillStyle = 'rgba(40,36,30,0.85)';
      c.fillText(l, w / 2, y);
    });
    return;
  }
  if (d.kind === 'stencil') {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let px = (h * 0.7) | 0;
    c.font = `900 ${px}px "Arial Black", Arial, sans-serif`;
    while (c.measureText(d.text).width > w * 0.96 && px > 6) c.font = `900 ${--px}px "Arial Black", Arial, sans-serif`;
    c.fillStyle = 'rgba(222,178,44,0.88)';
    c.fillText(d.text, w / 2, h / 2);
    return;
  }
  // graffiti: sprayed letters with a fuzzy edge and drips
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let px = (h * 0.72) | 0;
  c.font = `900 ${px}px Impact, "Arial Black", sans-serif`;
  while (c.measureText(d.text).width > w * 0.95 && px > 6) c.font = `900 ${--px}px Impact, "Arial Black", sans-serif`;
  c.save();
  c.translate(w / 2, h / 2);
  c.rotate(-0.05);
  c.shadowColor = d.c || '#c8392b';
  c.shadowBlur = px * 0.12;
  c.fillStyle = d.c || '#c8392b';
  c.globalAlpha = 0.9;
  c.fillText(d.text, 0, 0);
  c.restore();
  let seed = 5;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  c.fillStyle = d.c || '#c8392b';
  c.globalAlpha = 0.75;
  for (let k = 0; k < 9; k++) c.fillRect(w * 0.1 + r() * w * 0.8, h * 0.6, Math.max(1, w * 0.006), h * (0.1 + r() * 0.3));
  c.globalAlpha = 1;
}
// screens: grainy CCTV views in a grid with captions
const __prScreenTex = () =>
  __PR.screenTex ||
  (__PR.screenTex = __prCanvas(512, 256, (c, w, h) => {
    const cams = ['CAM 01 GATE', 'CAM 04 A BLK', 'CAM 07 YARD', 'CAM 09 SHU', 'CAM 12 CHOW', 'CAM 15 DOCK', 'CAM 02 LOT', 'CAM 11 INF'];
    let seed = 9;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 8; k++) {
      const x = (k % 4) * (w / 4),
        y = Math.floor(k / 4) * (h / 2),
        cw = w / 4,
        ch = h / 2;
      const g = c.createLinearGradient(x, y, x, y + ch);
      g.addColorStop(0, '#3c4642');
      g.addColorStop(1, '#16201c');
      c.fillStyle = g;
      c.fillRect(x + 1, y + 1, cw - 2, ch - 2);
      c.fillStyle = 'rgba(160,190,170,0.22)';
      for (let i = 0; i < 6; i++) c.fillRect(x + r() * cw * 0.8, y + ch * 0.3 + r() * ch * 0.5, cw * (0.08 + r() * 0.2), ch * (0.1 + r() * 0.3));
      c.strokeStyle = 'rgba(170,200,180,0.25)';
      c.beginPath();
      c.moveTo(x, y + ch * 0.75);
      c.lineTo(x + cw * 0.5, y + ch * 0.45);
      c.lineTo(x + cw, y + ch * 0.75);
      c.stroke();
      for (let i = 0; i < 300; i++) (c.fillStyle = `rgba(255,255,255,${r() * 0.08})`), c.fillRect(x + r() * cw, y + r() * ch, 1, 1);
      c.fillStyle = '#d8f0dc';
      c.font = '700 11px monospace';
      c.fillText(cams[k], x + 4, y + 13);
      k === 3 && ((c.fillStyle = '#ff4030'), c.fillText('● ALARM', x + cw - 58, y + 13));
    }
  }));
// signs and decals as quads (one mesh each, from the atlases)
function __prSigns(root, R, carved) {
  const quads = (list, alpha) => {
    if (!list.length) return;
    const { tex, out } = __prSignAtlas(list, alpha),
      P = [],
      Nn = [],
      UV = [],
      I = [];
    for (const { sg, u0, v0, u1, v1 } of out) {
      let n, up;
      if (sg.n) (n = new U(...sg.n).normalize()), (up = Math.abs(n.y) > 0.9 ? new U(0, 0, 1) : new U(0, 1, 0));
      else (n = new U(Math.sin(sg.ry || 0), 0, Math.cos(sg.ry || 0))), (up = new U(0, 1, 0));
      const right = new U().crossVectors(up, n).normalize(),
        c = new U(sg.x, sg.y, sg.z).addScaledVector(n, alpha ? 0.006 : 0.012),
        hw = sg.w / 2,
        hh = sg.h / 2,
        k = P.length / 3;
      for (const [sx, sy, u, v] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
        const p = c.clone().addScaledVector(right, sx * hw).addScaledVector(up, sy * hh);
        P.push(p.x, p.y, p.z);
        Nn.push(n.x, n.y, n.z);
        UV.push(u, v);
      }
      I.push(k, k + 1, k + 2, k, k + 2, k + 3);
      // the sign's plate (signs only): a thin backing
    }
    const g = new uw();
    g.setAttribute('position', new gi(new Float32Array(P), 3));
    g.setAttribute('normal', new gi(new Float32Array(Nn), 3));
    g.setAttribute('uv', new gi(new Float32Array(UV), 2));
    g.setIndex(I);
    g.computeBoundingSphere();
    const m = new Gw({ map: tex, roughness: alpha ? 0.95 : 0.55, metalness: alpha ? 0 : 0.15, transparent: alpha, depthWrite: !alpha, polygonOffset: !0, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    m.__prOwn = 1;
    __prLit(m);
    const o = __flMesh(root, g, m, alpha ? 'prison_decals' : 'prison_signs', !1);
    alpha && (o.renderOrder = 2);
  };
  quads(R.signs.map((s) => ({ ...s })), !1);
  quads([...R.decals.map((d) => ({ ...d, n: d.n })), ...carved.map((t) => ({ ...t, kind: 'carved', x: t.x[0], y: t.x[1], z: t.x[2] }))], !0);
}
// ---------------------------------------------------------------- cells
function __prCells(S, R, rnd) {
  const steel = __prK('#56676a'),
    ss = __prK('#c4cacd'),
    linen = __prK('#e4e0d4'),
    blankets = ['#6b6f72', '#c26a2a', '#5e6b58', '#8a8d8f', '#3f4d63', '#c26a2a'].map(__prK),
    ticking = __prK('#d8d2c2'),
    books = ['#8a2b22', '#2d4c6b', '#d8c48a', '#3e5a3a', '#2a2a2a', '#c9b48f'].map(__prK);
  for (const c of R.cells) {
    const { back: b, front: f, za, zb, y, s, v } = c,
      X = (d) => b + s * d, // d metres from the back wall into the cell
      bx = (d0, y0, z0, d1, y1, z1, k, col) => S.box(k, Math.min(X(d0), X(d1)), y + y0, z0, Math.max(X(d0), X(d1)), y + y1, z1, col);
    // bunk: two steel pans on a skirt, front posts, mattresses
    bx(0.1, 0, za + 0.15, 2.05, 0.4, za + 0.17, 'paint', steel);
    bx(2.03, 0, za + 0.15, 2.05, 0.4, za + 0.95, 'paint', steel);
    bx(0.1, 0.38, za + 0.15, 2.05, 0.45, za + 0.95, 'paint', steel);
    bx(0.1, 1.35, za + 0.15, 2.05, 1.45, za + 0.95, 'paint', steel);
    bx(0.1, 1.3, za + 0.93, 2.05, 1.45, za + 0.95, 'paint', steel);
    for (const d of [1.97]) S.cyl('paint', [X(d), y, za + 0.9], [X(d), y + 1.45, za + 0.9], 0.03, steel);
    for (const lvl of [0.45, 1.45]) {
      const made = (v + (lvl > 1 ? 3 : 0)) % 4 !== 1,
        cx = X(1.075),
        zc = za + 0.55;
      S.add('cloth', __prRBox(1.9, 0.11, 0.76, 0.045, 2), new _A().compose(new U(cx, y + lvl + 0.055, zc), new Kw(), new U(1, 1, 1)), ticking);
      // pillow at the back wall end, a blanket folded or thrown
      S.add('cloth', __prRBox(0.45, 0.1, 0.32, 0.045, 2), new _A().compose(new U(X(0.36), y + lvl + 0.15, zc), new Kw().setFromAxisAngle(__prUp, rnd() * 0.3 - 0.15), new U(1, 1, 1)), linen);
      const bl = blankets[(v + (lvl > 1 ? 2 : 0)) % blankets.length];
      made
        ? S.add('cloth', __prRBox(1.3, 0.035, 0.78, 0.015, 2), new _A().compose(new U(X(1.38), y + lvl + 0.125, zc), new Kw(), new U(1, 1, 1)), bl)
        : S.add('cloth', __prRBox(0.7, 0.14, 0.5, 0.06, 2), new _A().compose(new U(X(1.5), y + lvl + 0.16, zc + 0.05), new Kw().setFromEuler(new TB(0.2, rnd() * 3, 0.1)), new U(1, 1, 1)), bl);
    }
    // stainless toilet-sink against the back wall at the far corner
    const tz = zb - 0.4;
    S.add('stainless', __prRBox(0.46, 0.4, 0.46, 0.08, 2), new _A().compose(new U(X(0.35), y + 0.2, tz), new Kw(), new U(1, 1, 1)), ss);
    S.add('stainless', __prUnit('tor'), new _A().compose(new U(X(0.38), y + 0.41, tz), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI / 2), new U(0.17, 0.17, 0.3)), ss);
    S.add('dark', __prUnit('cyl16'), new _A().compose(new U(X(0.38), y + 0.39, tz), new Kw(), new U(0.15, 0.01, 0.15)), __prK('#4c565a'));
    bx(0.1, 0.42, zb - 0.65, 0.22, 0.95, zb - 0.15, 'stainless', ss);
    bx(0.22, 0.8, zb - 0.55, 0.42, 0.95, zb - 0.25, 'stainless', ss);
    bx(0.23, 0.86, zb - 0.5, 0.4, 0.951, zb - 0.3, 'dark', __prK('#5b6468'));
    for (const dz of [-0.2, 0.2]) S.cyl('stainless', [X(0.22), y + 0.9, tz + dz], [X(0.25), y + 0.9, tz + dz], 0.02, ss);
    // the desk and stool, a shelf above it with books and a cup
    const dk = __prK('#5f6e72');
    bx(0.75, 0.7, zb - 0.55, 1.65, 0.76, zb - 0.1, 'paint', dk);
    bx(1.15, 0.2, zb - 0.12, 1.25, 0.7, zb - 0.1, 'paint', dk);
    S.add('paint', __prUnit('cyl16'), new _A().compose(new U(X(1.2), y + 0.44, zb - 0.8), new Kw(), new U(0.16, 0.03, 0.16)), dk);
    S.cyl('paint', [X(1.2), y, zb - 0.8], [X(1.2), y + 0.43, zb - 0.8], 0.035, dk);
    S.cyl('paint', [X(1.2), y + 0.25, zb - 0.8], [X(1.2), y + 0.25, zb - 0.12], 0.025, dk);
    bx(0.75, 1.55, zb - 0.32, 1.65, 1.58, zb - 0.1, 'paint', dk);
    for (let k = 0, d = 0.8; k < 3 + (v % 3); k++) {
      const t = 0.035 + rnd() * 0.03,
        h = 0.18 + rnd() * 0.08;
      bx(d, 1.58, zb - 0.3, d + t, 1.58 + h, zb - 0.13, 'cloth', books[(k + v) % books.length]);
      d += t + 0.005;
    }
    v % 2 && S.add('cloth', __prUnit('cyl'), new _A().compose(new U(X(1.45), y + 0.81, zb - 0.32), new Kw(), new U(0.04, 0.1, 0.04)), __prK(v % 4 === 1 ? '#c4c0b4' : '#2f5f8a'));
    // papers and photos on the wall over the desk, shoes under the bunk
    for (let k = 0; k < 2 + (v % 2); k++) {
      const z0 = zb - 0.11,
        d = 0.85 + k * 0.28;
      S.box('cloth', Math.min(X(d), X(d + 0.2)), y + 1.75 + (k % 2) * 0.12, z0 - 0.003, Math.max(X(d), X(d + 0.2)), y + 1.98 + (k % 2) * 0.12, z0, __prK(['#f2efe6', '#d9c9a8', '#a8b8c8'][k % 3]));
    }
    v % 3 !== 2 && (bx(1.6, 0, za + 1.05, 1.88, 0.09, za + 1.17, 'dark', __prK('#2b2b2c')), bx(1.6, 0, za + 1.2, 1.88, 0.09, za + 1.32, 'dark', __prK('#2b2b2c')));
    // a towel over the bunk end, a caged lamp, the slit window
    v % 2 === 0 && S.box('cloth', Math.min(X(2.04), X(2.07)), y + 0.95, za + 0.3, Math.max(X(2.04), X(2.07)), y + 1.32, za + 0.7, __prK(['#e8e4d8', '#c25a2a', '#7a8a98'][v % 3]));
    // the cell's window: a narrow barred light in the outer wall. Inside, frosted wired glass in a steel frame
    // with a concrete sill; outside, dark glass behind two bars, a stone sill and lintel set in the brick
    const zc = zb - 1.45,
      hw = 0.15,
      wy0 = y + 1.5,
      wy1 = y + 2.4;
    S.box('glow', Math.min(X(0), X(-0.002)), wy0, zc - hw, Math.max(X(0), X(-0.002)), wy1, zc + hw, __prK('#c7d6dd'));
    bx(-0.003, 0.0 + 1.44, zc - hw - 0.06, 0.03, 1.5, zc + hw + 0.06, 'concrete', __prK('#c8c2b6'));
    for (const [z0, z1] of [[zc - hw - 0.04, zc - hw], [zc + hw, zc + hw + 0.04]]) bx(0, 1.5, z0, 0.025, 2.4, z1, 'paint', __prK('#4b5552'));
    bx(0, 2.4, zc - hw - 0.04, 0.025, 2.44, zc + hw + 0.04, 'paint', __prK('#4b5552'));
    R.__lampsCell.push([X(0.12), y + c.ch - 0.2, za + 1.4, s]);
    const xo = s > 0 ? b - 0.401 : b + 0.401,
      O = (d) => xo - s * d;
    S.box('glass', Math.min(O(-0.002), O(0)), wy0, zc - hw, Math.max(O(-0.002), O(0)), wy1, zc + hw, __prK('#26323a'));
    for (const dz of [-hw / 3, hw / 3]) S.cyl('rod', [O(0.03), wy0, zc + dz], [O(0.03), wy1, zc + dz], 0.012, __prK('#3b4442'), 'cyl8');
    S.box('granite', Math.min(O(0), O(0.1)), wy0 - 0.1, zc - hw - 0.12, Math.max(O(0), O(0.1)), wy0, zc + hw + 0.12, __prK('#ddd7cc'));
    S.box('granite', Math.min(O(0), O(0.05)), wy1, zc - hw - 0.14, Math.max(O(0), O(0.05)), wy1 + 0.16, zc + hw + 0.14, __prK('#e4ded3'));
    for (const z of [zc - hw - 0.05, zc + hw + 0.05]) S.box('granite', Math.min(O(0), O(0.03)), wy0, z - 0.05, Math.max(O(0), O(0.03)), wy1, z + 0.05, __prK('#d6d0c4'));
  }
  // solitary: concrete bunks with thin mattresses, steel toilets
  for (const c of R.shu) {
    S.box('concrete', c.xa + 0.3, 0, c.by, c.xa + 2.3, 0.45, c.by + 0.8, __prK('#bcb6aa'));
    S.add('cloth', __prRBox(1.9, 0.07, 0.72, 0.03, 2), new _A().compose(new U(c.xa + 1.3, 0.485, c.by + 0.4), new Kw(), new U(1, 1, 1)), __prK(c.k % 2 ? '#d8d2c2' : '#bf6a2c'));
    const tz0 = c.side === 'N' ? c.cz0 + 0.1 : c.cz1 - 0.6;
    S.add('stainless', __prRBox(0.48, 0.4, 0.48, 0.08, 2), new _A().compose(new U(c.xa + c.sw - 0.5, 0.2, tz0 + 0.25), new Kw(), new U(1, 1, 1)), __prK('#c4cacd'));
    S.add('stainless', __prUnit('tor'), new _A().compose(new U(c.xa + c.sw - 0.5, 0.41, tz0 + 0.25), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI / 2), new U(0.16, 0.16, 0.3)), __prK('#c4cacd'));
  }
}
// ---------------------------------------------------------------- tables, stools
function __prTables(S, R) {
  const ss = __prK('#b9c0c4'),
    dk = __prK('#7d878c');
  for (const t of R.tables) {
    if (t.stool) {
      S.add('stainless', __prUnit('cyl16'), new _A().compose(new U(t.x, 0.445, t.z), new Kw(), new U(0.17, 0.03, 0.17)), ss);
      S.cyl('paint', [t.x, 0, t.z], [t.x, 0.43, t.z], 0.035, dk);
      S.add('paint', __prUnit('cyl16'), new _A().compose(new U(t.x, 0.01, t.z), new Kw(), new U(0.14, 0.02, 0.14)), dk);
      continue;
    }
    if (t.long) {
      S.add('stainless', __prRBox(2.4, 0.04, 0.84, 0.018, 2), new _A().compose(new U(t.x, 0.74, t.z), new Kw(), new U(1, 1, 1)), ss);
      for (const dx of [-0.85, 0.85]) {
        S.box('paint', t.x + dx - 0.05, 0, t.z - 0.32, t.x + dx + 0.05, 0.72, t.z + 0.32, dk);
        S.box('paint', t.x + dx - 0.05, 0.02, t.z - 0.95, t.x + dx + 0.05, 0.08, t.z + 0.95, dk);
      }
      for (const [sx, sz] of [[-0.8, -0.85], [0, -0.85], [0.8, -0.85], [-0.8, 0.85], [0, 0.85], [0.8, 0.85]]) {
        S.add('stainless', __prUnit('cyl16'), new _A().compose(new U(t.x + sx, 0.445, t.z + sz), new Kw(), new U(0.17, 0.03, 0.17)), ss);
        S.cyl('paint', [t.x + sx, 0.08, t.z + sz], [t.x + sx, 0.43, t.z + sz], 0.03, dk);
      }
      S.box('paint', t.x - 0.85, 0.06, t.z - 0.88, t.x + 0.85, 0.1, t.z - 0.82, dk);
      S.box('paint', t.x - 0.85, 0.06, t.z + 0.82, t.x + 0.85, 0.1, t.z + 0.88, dk);
      continue;
    }
    // round: a top on a pedestal, four stools on curved arms from the base
    S.add('stainless', __prUnit('cyl16'), new _A().compose(new U(t.x, 0.74, t.z), new Kw(), new U(0.58, 0.04, 0.58)), ss);
    S.add('stainless', __prUnit('tor'), new _A().compose(new U(t.x, 0.74, t.z), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI / 2), new U(0.58, 0.58, 0.25)), ss);
    S.cyl('paint', [t.x, 0, t.z], [t.x, 0.72, t.z], 0.07, dk);
    S.add('paint', __prUnit('cyl16'), new _A().compose(new U(t.x, 0.02, t.z), new Kw(), new U(0.3, 0.04, 0.3)), dk);
    for (const [sx, sz] of [[0, -0.95], [0, 0.95], [-0.95, 0], [0.95, 0]]) {
      S.add('stainless', __prUnit('cyl16'), new _A().compose(new U(t.x + sx, 0.445, t.z + sz), new Kw(), new U(0.17, 0.03, 0.17)), ss);
      S.cyl('paint', [t.x + sx, 0.12, t.z + sz], [t.x + sx, 0.43, t.z + sz], 0.03, dk);
      S.cyl('paint', [t.x + sx * 0.25, 0.12, t.z + sz * 0.25], [t.x + sx, 0.12, t.z + sz], 0.028, dk);
    }
  }
}
// ---------------------------------------------------------------- lamps
function __prLamps(root, S, R, models) {
  const inst = (id, prefix, list, scale = 1) => {
    if (!list.length || !models[id]) return !1;
    const { parts } = __flParts(models[id], prefix);
    for (const p of parts) for (const mt of [].concat(p.mat)) __prLit(mt), (R.__emis = R.__emis || []).push(mt);
    __flInstance(root, parts, list.map(([x, y, zz, r]) => [x, y, zz, scale, r]), !1);
    return !0;
  };
  const housing = __prK('#e8e6e0'),
    warm = __prK('#fff2dc'),
    cool = __prK('#eef6ff'),
    blk = __prK('#2b3033');
  const by = (k) => R.lamps.filter((l) => l.k === k);
  // fluorescent fittings (the model where it loaded, a drawn one otherwise)
  const tubes = [...by('tube'), ...by('picket')];
  if (!inst('mounted_fluorescent_lights', null, tubes.map((l) => [l.x, l.y - 0.045, l.z, 0])))
    for (const l of tubes) S.box('paint', l.x - 0.62, l.y - 0.08, l.z - 0.15, l.x + 0.62, l.y, l.z + 0.15, housing), S.box('glow', l.x - 0.58, l.y - 0.085, l.z - 0.11, l.x + 0.58, l.y - 0.08, l.z + 0.11, cool);
  // under-gallery strips
  for (const l of by('strip')) S.box('paint', l.x - 0.12, l.y - 0.02, l.z - 0.62, l.x + 0.12, l.y + 0.07, l.z + 0.62, housing), S.box('glow', l.x - 0.09, l.y - 0.025, l.z - 0.58, l.x + 0.09, l.y - 0.02, l.z + 0.58, cool);
  // pendants: hang from the vault (A Block) or the ceiling (laundry, cafeteria) on a cable
  const V = R.vault;
  const pend = [...by('pend'), ...by('pend2')].map((l) => {
    const top = l.k === 'pend' && V && l.x > V.x0 && l.x < V.x1 && l.z > V.z0 && l.z < V.z1 ? __prVaultY(V, l.x) : l.y + 0.05,
      len = l.k === 'pend2' ? 0.95 : 1.15,
      y0 = l.k === 'pend' ? l.y - 0.4 : l.y - 0.1 - len;
    S.cyl('dark', [l.x, y0 + len, l.z], [l.x, top, l.z], 0.008, blk, 'cyl6');
    return [l.x, y0, l.z, 0, len / 1.34];
  });
  if (models.hanging_industrial_lamp) {
    const { parts } = __flParts(models.hanging_industrial_lamp);
    for (const p of parts) for (const mt of [].concat(p.mat)) __prLit(mt), (R.__emis = R.__emis || []).push(mt);
    __flInstance(root, parts, pend.map(([x, y, zz, r, s]) => [x, y, zz, s, r]), !1);
  }
  for (const [x, y, zz] of pend) S.add('glow', __prUnit('hemi'), new _A().compose(new U(x, y + 0.02, zz), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI), new U(0.1, 0.06, 0.1)), warm);
  // caged lamps: cells (on the back wall), solitary ceilings
  const cage = (x, y, zz, wallX) => {
    S.add('glow', __prUnit('sph'), new _A().compose(new U(x, y, zz), new Kw(), new U(0.045, 0.06, 0.045)), __prK('#9c8a6a'));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      S.add('paint', __prUnit('tor'), new _A().compose(new U(x, y, zz), new Kw().setFromAxisAngle(__prUp, a), new U(0.085, 0.11, 0.6)), blk);
    }
    wallX !== void 0 ? S.cyl('paint', [wallX, y, zz], [x, y, zz], 0.03, blk) : S.cyl('paint', [x, y + 0.08, zz], [x, y + 0.2, zz], 0.04, blk);
  };
  for (const [x, y, zz, s] of R.__lampsCell) cage(x, y, zz, x - s * 0.12);
  for (const l of by('cage')) cage(l.x, l.y - 0.2, l.z);
  // gothic lanterns at the gatehouse
  for (const l of by('lantern')) {
    S.box('paint', l.x - 0.02, l.y + 0.3, l.z, l.x + 0.02, l.y + 0.34, l.z + 0.45, blk);
    S.box('paint', l.x - 0.16, l.y - 0.32, l.z - 0.16, l.x + 0.16, l.y - 0.28, l.z + 0.16, blk);
    S.box('glow', l.x - 0.13, l.y - 0.28, l.z - 0.13, l.x + 0.13, l.y + 0.12, l.z + 0.13, warm);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.cyl('paint', [l.x + dx * 0.145, l.y - 0.3, l.z + dz * 0.145], [l.x + dx * 0.145, l.y + 0.14, l.z + dz * 0.145], 0.012, blk, 'cyl6');
    S.add('paint', __prUnit('cone8'), new _A().compose(new U(l.x, l.y + 0.26, l.z), new Kw().setFromAxisAngle(__prUp, Math.PI / 8), new U(0.22, 0.25, 0.22)), blk);
  }
  // floodlights on the sally port, poles (lot and compound)
  const head = (x, y, zz, ry, tilt = 0.5) => {
    const q = new Kw().setFromEuler(new TB(tilt, ry, 0, 'YXZ'));
    S.add('dark', __prUnit('box'), new _A().compose(new U(x, y, zz), q, new U(0.5, 0.34, 0.16)), __prK('#40474b'));
    const f = new U(0, 0, 0.081).applyQuaternion(q);
    S.add('glow', __prUnit('box'), new _A().compose(new U(x + f.x, y + f.y, zz + f.z), q, new U(0.44, 0.28, 0.01)), __prK('#fff7e4'));
  };
  for (const l of by('flood')) head(l.x, l.y + 0.1, l.z, l.z < 15 ? 0 : Math.PI, 0.6);
  for (const p of R.poles) {
    if (p.k === 'gatepost') {
      S.cyl('paint', [p.x, 0, p.z], [p.x, p.h, p.z], 0.15, __prK('#5d646a'));
      S.add('paint', __prUnit('sph'), new _A().compose(new U(p.x, p.h, p.z), new Kw(), new U(0.16, 0.1, 0.16)), __prK('#5d646a'));
      continue;
    }
    S.cyl('paint', [p.x, 0, p.z], [p.x, p.h, p.z], 0.13, __prK('#6d767c'));
    S.add('concrete', __prUnit('cyl16'), new _A().compose(new U(p.x, 0.15, p.z), new Kw(), new U(0.28, 0.3, 0.28)), __prK('#c3bdb0'));
    const ux = Math.sin(p.ry),
      uz = Math.cos(p.ry);
    S.cyl('paint', [p.x - uz * 0.7, p.h, p.z + ux * 0.7], [p.x + uz * 0.7, p.h, p.z - ux * 0.7], 0.05, __prK('#6d767c'));
    for (const d of [-0.55, 0, 0.55]) head(p.x - uz * d + ux * 0.2, p.h - 0.1, p.z + ux * d + uz * 0.2, p.ry, 0.75);
    S.box('dark', p.x - 0.18 + ux * 0.14, 1.2, p.z - 0.18 + uz * 0.14, p.x + 0.18 + ux * 0.14, 1.6, p.z + 0.18 + uz * 0.14, __prK('#7a8287'));
  }
  void root;
}
// ---------------------------------------------------------------- towers, yard
function __prTowers(S, R, beams) {
  const st = __prK('#56636a'),
    cab = __prK('#7b8a86'),
    roofc = __prK('#4f5a5c');
  for (const t of R.towers) {
    const { x0, z0, size: s, h } = t,
      x1 = x0 + s,
      z1 = z0 + s;
    for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) S.cyl('paint', [cx, 0, cz], [cx, h - 0.3, cz], 0.15, st);
    for (const [ax, az, bx2, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]])
      for (const [ya, yb] of [[0.4, h * 0.5], [h * 0.5, h - 0.45]]) {
        if (t.open === 'E' && ax === x1 && bx2 === x1) continue;
        if (t.open === 'S' && az === z1 && bz === z1) continue;
        S.cyl('paint', [ax, ya, az], [bx2, yb, bz], 0.035, st, 'cyl6');
        S.cyl('paint', [bx2, ya, bz], [ax, yb, az], 0.035, st, 'cyl6');
      }
    S.box('concrete', x0 - 0.3, h - 0.3, z0 - 0.3, x1 + 0.3, h, z1 + 0.3, __prK('#bdb7aa'));
    S.box('paint', x0 - 0.32, h - 0.32, z0 - 0.32, x1 + 0.32, h - 0.22, z1 + 0.32, st);
    // the cab: steel panels to waist height on its closed sides, corner posts, a header, a roof
    const sides = { N: [x0 - 0.3, z0 - 0.3, x1 + 0.3, z0 - 0.1], S: [x0 - 0.3, z1 + 0.1, x1 + 0.3, z1 + 0.3], W: [x0 - 0.3, z0 - 0.1, x0 - 0.1, z1 + 0.1], E: [x1 + 0.1, z0 - 0.1, x1 + 0.3, z1 + 0.1] };
    for (const k in sides) {
      if (k === t.open) continue;
      const [a, b, c, d] = sides[k];
      S.box('paint', a, h, b, c, h + 1.05, d, cab);
      S.box('paint', a - 0.02, h + 1.0, b - 0.02, c + 0.02, h + 1.1, d + 0.02, st);
    }
    for (const [cx, cz] of [[x0 - 0.2, z0 - 0.2], [x1 + 0.2, z0 - 0.2], [x0 - 0.2, z1 + 0.2], [x1 + 0.2, z1 + 0.2]]) S.box('paint', cx - 0.06, h, cz - 0.06, cx + 0.06, h + 2.6, cz + 0.06, st);
    S.box('paint', x0 - 0.3, h + 2.35, z0 - 0.3, x1 + 0.3, h + 2.6, z1 + 0.3, cab);
    S.box('corr', x0 - 0.6, h + 2.6, z0 - 0.6, x1 + 0.6, h + 2.85, z1 + 0.6, roofc);
    // a hipped cap above the roof slab, a searchlight on a yoke, an antenna
    S.add('corr', __prUnit('cone8'), new _A().compose(new U((x0 + x1) / 2, h + 3.25, (z0 + z1) / 2), new Kw().setFromAxisAngle(__prUp, Math.PI / 4), new U((s / 2 + 0.6) * 1.414, 0.8, (s / 2 + 0.6) * 1.414)), roofc);
    S.cyl('paint', [x1 + 0.4, h + 2.85, z0 - 0.4], [x1 + 0.4, h + 5.2, z0 - 0.4], 0.015, st, 'cyl6');
    const lx = x0 - 0.25,
      lz = z0 - 0.25,
      ly = h + 2.85;
    S.cyl('paint', [lx, ly, lz], [lx, ly + 0.35, lz], 0.06, st);
    beams.push({ x: lx, y: ly + 0.55, z: lz, phase: x0 * 0.1 });
  }
  for (const hp of R.hoops) {
    const d = hp.dir,
      x = hp.x;
    S.cyl('paint', [x, 0, hp.z], [x, 3.25, hp.z], 0.1, __prK('#3c4146'));
    S.cyl('paint', [x, 3.25, hp.z], [x + d * 0.12, 3.42, hp.z], 0.08, __prK('#3c4146'));
    S.box('paint', Math.min(x + d * 0.1, x + d * 0.16), 2.9, 53.1, Math.max(x + d * 0.1, x + d * 0.16), 3.95, 54.9, __prK('#f2f0ea'));
    S.box('paint', Math.min(x + d * 0.161, x + d * 0.165), 3.05, 53.7, Math.max(x + d * 0.161, x + d * 0.165), 3.5, 54.3, __prK('#c23b22'));
    S.box('paint', Math.min(x + d * 0.162, x + d * 0.166), 3.1, 53.75, Math.max(x + d * 0.162, x + d * 0.166), 3.45, 54.25, __prK('#f2f0ea'));
    const rx = x + d * (0.16 + 0.23 + 0.06);
    S.add('paint', __prUnit('tor'), new _A().compose(new U(rx, 3.05, hp.z), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI / 2), new U(0.23, 0.23, 0.12)), __prK('#d65a24'));
    S.box('paint', Math.min(x + d * 0.16, rx - d * 0.2), 3.03, hp.z - 0.05, Math.max(x + d * 0.16, rx - d * 0.2), 3.07, hp.z + 0.05, __prK('#d65a24'));
    const net = new Rw(0.225, 0.16, 0.42, 12, 1, !0),
      uv = net.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 2);
    S.add('net', net, new _A().makeTranslation(rx, 3.05 - 0.21, hp.z));
  }
  for (const b of R.benches) {
    const blk = __prK('#25282a'),
      fr = __prK('#2f3336');
    S.add('dark', __prRBox(0.3, 0.07, 1.3, 0.03, 2), new _A().compose(new U(b.x, 0.42, b.z), new Kw(), new U(1, 1, 1)), blk);
    S.box('paint', b.x - 0.05, 0, b.z - 0.62, b.x + 0.05, 0.38, b.z - 0.52, fr);
    S.box('paint', b.x - 0.05, 0, b.z + 0.52, b.x + 0.05, 0.38, b.z + 0.62, fr);
    S.box('paint', b.x - 0.25, 0, b.z - 0.62, b.x + 0.25, 0.04, b.z - 0.52, fr);
    S.box('paint', b.x - 0.25, 0, b.z + 0.52, b.x + 0.25, 0.04, b.z + 0.62, fr);
    for (const sx of [-0.59, 0.59]) S.cyl('paint', [b.x + sx, 0, b.z - 0.79], [b.x + sx, 1.25, b.z - 0.79], 0.03, fr);
    S.cyl('stainless', [b.x - 1.0, 1.2, b.z - 0.79], [b.x + 1.0, 1.2, b.z - 0.79], 0.014, __prK('#c9ced1'));
    for (const sx of [-0.8, -0.74, 0.74, 0.8]) S.add('dark', __prUnit('cyl16'), new _A().compose(new U(b.x + sx, 1.2, b.z - 0.79), new Kw().setFromAxisAngle(new U(0, 0, 1), Math.PI / 2), new U(Math.abs(sx) > 0.77 ? 0.17 : 0.22, 0.03, Math.abs(sx) > 0.77 ? 0.17 : 0.22)), blk);
  }
  for (const b of R.bleachers) {
    const al = __prK('#c5cbcf'),
      fr = __prK('#6a7176');
    for (let i = 0; i < b.rows; i++) {
      const y = (i + 1) * b.step,
        z0 = b.z0 + i * b.depth;
      S.box('stainless', b.x0, y - 0.05, z0 + 0.32, b.x1, y, z0 + b.depth, al);
      S.box('stainless', b.x0, y - 0.05, z0, b.x1, y, z0 + 0.28, al);
      S.box('paint', b.x0, y - b.step, z0, b.x1, y - 0.05, z0 + 0.02, __prK('#9aa2a6'));
    }
    for (let x = b.x0 + 0.4; x < b.x1; x += 2.2) {
      S.box('paint', x - 0.04, 0, b.z0, x + 0.04, b.rows * b.step - 0.05, b.z0 + b.rows * b.depth, fr);
      S.cyl('paint', [x, b.rows * b.step, b.z0 + b.rows * b.depth - 0.05], [x, b.rows * b.step + 0.9, b.z0 + b.rows * b.depth - 0.05], 0.025, fr);
    }
    S.cyl('paint', [b.x0, b.rows * b.step + 0.9, b.z0 + b.rows * b.depth - 0.05], [b.x1, b.rows * b.step + 0.9, b.z0 + b.rows * b.depth - 0.05], 0.025, fr);
  }
  for (const p of R.planters) {
    S.box('concrete', p.x0, 0, p.z0, p.x1, p.h - 0.05, p.z1, __prK('#cbc5b8'));
    S.box('concrete', p.x0 - 0.03, p.h - 0.08, p.z0 - 0.03, p.x1 + 0.03, p.h, p.z1 + 0.03, __prK('#d6d0c3'));
    S.box('mud', p.x0 + 0.1, p.h - 0.12, p.z0 + 0.1, p.x1 - 0.1, p.h - 0.06, p.z1 - 0.1, __prK('#8a7a64'));
    const n = Math.max(2, Math.round(((p.x1 - p.x0) * (p.z1 - p.z0)) / 0.6));
    for (let k = 0; k < n; k++) {
      const x = p.x0 + 0.3 + ((k * 0.618) % 1) * (p.x1 - p.x0 - 0.6),
        zz = p.z0 + 0.3 + ((k * 0.382 + 0.2) % 1) * (p.z1 - p.z0 - 0.6);
      S.add('cloth', __prUnit('sph'), new _A().compose(new U(x, p.h + 0.12, zz), new Kw(), new U(0.22, 0.18, 0.22)), __prK(k % 3 ? '#5f6e3c' : '#7a6f45'));
    }
  }
}
// ---------------------------------------------------------------- equipment (R.items)
function __prItems(S, R, screens) {
  const ss = __prK('#c2c8cb'),
    dk = __prK('#3a4045'),
    blk = __prK('#202325');
  const scr = (x0, y0, z0, x1, y1, z1, n) => screens.push({ x0, y0, z0, x1, y1, z1, n });
  for (const it of R.items) {
    switch (it.k) {
      case 'detector': {
        S.add('paint', __prRBox(0.25, 2.25, 0.4, 0.05, 2), new _A().makeTranslation(it.x0 + 0.125, 1.125, (it.z0 + it.z1) / 2), __prK('#d9dcde'));
        S.add('paint', __prRBox(0.25, 2.25, 0.4, 0.05, 2), new _A().makeTranslation(it.x1 - 0.125, 1.125, (it.z0 + it.z1) / 2), __prK('#d9dcde'));
        S.add('paint', __prRBox(it.x1 - it.x0, 0.22, 0.42, 0.06, 2), new _A().makeTranslation((it.x0 + it.x1) / 2, 2.2, (it.z0 + it.z1) / 2), __prK('#d9dcde'));
        S.box('glow', it.x0 + 0.06, 1.2, it.z0 - 0.002, it.x0 + 0.19, 2.0, it.z0, __prK('#40ff60'));
        break;
      }
      case 'xray': {
        S.box('dark', it.x0, 0, it.z0, it.x1, 0.85, it.z1, dk);
        S.box('dark', it.x0 - 0.1, 0.85, it.z0 + 0.15, it.x1 + 0.1, 0.9, it.z1 - 0.15, blk);
        S.add('paint', __prRBox(1.2, 0.75, 0.7, 0.08, 2), new _A().makeTranslation((it.x0 + it.x1) / 2, 1.27, (it.z0 + it.z1) / 2), __prK('#c9ccce'));
        for (let k = 0; k < 6; k++) S.box('dark', (it.x0 + it.x1) / 2 - 0.6 - 0.005, 0.92, it.z0 + 0.2 + k * 0.07, (it.x0 + it.x1) / 2 - 0.6 + 0.005, 1.5, it.z0 + 0.25 + k * 0.07, blk);
        scr(it.x1 - 0.1, 1.3, it.z0 - 0.3, it.x1 + 0.3, 1.6, it.z0 - 0.29, 1);
        break;
      }
      case 'console': {
        S.box('paint', it.x0, 0, it.z0, it.x1, 0.92, it.z1, dk);
        S.box('stainless', it.x0 - 0.02, 0.92, it.z0 - 0.02, it.x1 + 0.02, 0.95, it.z1 + 0.02, __prK('#8e979c'));
        const n = it.screens || 3,
          w = (it.x1 - it.x0 - 0.2) / n;
        for (let k = 0; k < n; k++) {
          const x = it.x0 + 0.1 + k * w;
          S.box('dark', x + 0.03, 0.97, it.z0 + 0.05, x + w - 0.03, 1.48, it.z0 + 0.12, blk);
          scr(x + 0.06, 1.0, it.z0 + 0.121, x + w - 0.06, 1.45, it.z0 + 0.122, k);
          S.box('dark', x + 0.12, 0.95, it.z0 + 0.4, x + w - 0.12, 0.97, it.z0 + 0.6, blk);
        }
        break;
      }
      case 'barrier': {
        S.box('paint', it.x1 - 0.25, 0, it.z - 0.2, it.x1 + 0.25, 1.2, it.z + 0.2, __prK('#d6ad2a'));
        for (let x = it.x0; x < it.x1 - 0.3; x += 0.5) S.cyl('paint', [x, 1.06, it.z], [Math.min(x + 0.5, it.x1 - 0.3), 1.06, it.z], 0.045, __prK(Math.round((x - it.x0) / 0.5) % 2 ? '#c03a2b' : '#ece8e0'));
        S.box('dark', it.x1 + 0.05, 0.9, it.z - 0.12, it.x1 + 0.6, 1.2, it.z + 0.12, blk);
        break;
      }
      case 'canopy': {
        S.box('corr', it.x0, it.y + 0.15, it.z0, it.x1, it.y + 0.22, it.z1, __prK('#7c868a'));
        for (let zz = it.z0 + 0.5; zz < it.z1; zz += 3) S.box('paint', it.x0, it.y, zz - 0.06, it.x1, it.y + 0.15, zz + 0.06, __prK('#4f585d'));
        break;
      }
      case 'picket': {
        S.box('paint', it.x0 - 0.05, 2.5, it.z0 - 0.05, it.x1 + 0.05, 2.8, it.z1 + 0.05, __prK('#5a6064'));
        break;
      }
      case 'tv': {
        R.models.push({ id: 'Television_01', x: it.x, y: it.y - 0.25, z: it.z + 0.3, ry: 0, s: 1 });
        const c = __prK('#2b3033');
        for (let k = 0; k <= 8; k++) S.cyl('paint', [it.x - 0.4 + k * 0.1, it.y - 0.28, it.z + 0.58], [it.x - 0.4 + k * 0.1, it.y + 0.3, it.z + 0.58], 0.006, c, 'cyl6');
        S.box('paint', it.x - 0.42, it.y - 0.3, it.z, it.x + 0.42, it.y - 0.26, it.z + 0.6, c);
        S.box('paint', it.x - 0.42, it.y + 0.28, it.z, it.x + 0.42, it.y + 0.32, it.z + 0.6, c);
        break;
      }
      case 'phone': {
        const x = it.x;
        S.box('stainless', x, it.y - 0.28, it.z - 0.14, x + 0.1, it.y + 0.22, it.z + 0.14, ss);
        S.box('dark', x + 0.1, it.y - 0.05, it.z - 0.07, x + 0.11, it.y + 0.12, it.z + 0.07, blk);
        S.add('dark', __prRBox(0.05, 0.22, 0.05, 0.02, 1), new _A().makeTranslation(x + 0.13, it.y - 0.02, it.z + 0.11), blk);
        S.cyl('dark', [x + 0.12, it.y - 0.14, it.z + 0.11], [x + 0.11, it.y - 0.5, it.z + 0.04], 0.006, blk, 'cyl6');
        break;
      }
      case 'fountain': {
        S.add('stainless', __prRBox(0.32, 0.3, 0.42, 0.05, 2), new _A().makeTranslation(it.x - 0.16, 0.9, it.z), ss);
        S.box('stainless', it.x - 0.05, 0.4, it.z - 0.12, it.x, 0.75, it.z + 0.12, ss);
        break;
      }
      case 'handset': {
        S.add('dark', __prRBox(0.05, 0.2, 0.05, 0.02, 1), new _A().makeTranslation(it.x + 0.12, it.y, it.z + it.s * 0.02), blk);
        break;
      }
      case 'court': {
        const wht = __prK('#f2efe6'),
          L = (x0, z0, x1, z1) => S.box('court', x0, 0.037, z0, x1, 0.041, z1, wht);
        L(it.x0, it.z0, it.x1, it.z0 + 0.06);
        L(it.x0, it.z1 - 0.06, it.x1, it.z1);
        L(it.x0, it.z0, it.x0 + 0.06, it.z1);
        L(it.x1 - 0.06, it.z0, it.x1, it.z1);
        L((it.x0 + it.x1) / 2 - 0.03, it.z0, (it.x0 + it.x1) / 2 + 0.03, it.z1);
        const cz = (it.z0 + it.z1) / 2;
        for (const [x0, x1] of [[it.x0, it.x0 + 5.8], [it.x1 - 5.8, it.x1]]) S.box('court', x0, 0.036, cz - 2.45, x1, 0.039, cz + 2.45, __prK('#8a3c2c'));
        const ring = (cx, r) => {
          for (let k = 0; k < 32; k++) {
            const a0 = (k / 32) * Math.PI * 2,
              a1 = ((k + 1) / 32) * Math.PI * 2;
            S.cyl('court', [cx + Math.cos(a0) * r, 0.039, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, 0.039, cz + Math.sin(a1) * r], 0.03, wht, 'cyl6');
          }
        };
        ring((it.x0 + it.x1) / 2, 1.8);
        ring(it.x0 + 5.8, 1.8);
        ring(it.x1 - 5.8, 1.8);
        break;
      }
      case 'rack': {
        const fr = __prK('#2f3336');
        for (const zz of [it.z0 + 0.1, it.z1 - 0.1]) for (const x of [it.x0 + 0.1, it.x1 - 0.1]) S.cyl('paint', [x, 0, zz], [x, it.h, zz], 0.035, fr);
        for (const y of [0.4, 1.0, 1.55]) S.cyl('paint', [it.x0 + 0.1, y, it.z0 + 0.1], [it.x0 + 0.1, y, it.z1 - 0.1], 0.03, fr), S.cyl('paint', [it.x1 - 0.1, y, it.z0 + 0.1], [it.x1 - 0.1, y, it.z1 - 0.1], 0.03, fr);
        for (let k = 0; k < 6; k++) S.add('dark', __prUnit('cyl16'), new _A().compose(new U((it.x0 + it.x1) / 2, 0.45 + (k % 2) * 0.6, it.z0 + 0.5 + k * 0.45), new Kw().setFromAxisAngle(new U(0, 0, 1), Math.PI / 2), new U(0.2, 0.05, 0.2)), __prK('#1d1f21'));
        break;
      }
      case 'washer': {
        const x0 = it.x0,
          zc = (it.z0 + it.z1) / 2;
        S.add('stainless', __prRBox(it.x1 - it.x0, 1.9, it.z1 - it.z0 - 0.1, 0.06, 2), new _A().makeTranslation((it.x0 + it.x1) / 2, 0.95, zc), ss);
        S.add('stainless', __prUnit('tor'), new _A().compose(new U(x0 - 0.02, 1.0, zc), new Kw().setFromAxisAngle(new U(0, 0, 1), Math.PI / 2), new U(0.45, 0.45, 0.5)), __prK('#dfe3e5'));
        S.add('glassL', __prUnit('cyl16'), new _A().compose(new U(x0 - 0.015, 1.0, zc), new Kw().setFromAxisAngle(new U(0, 0, 1), Math.PI / 2), new U(0.42, 0.02, 0.42)), 1);
        S.add('dark', __prUnit('cyl16'), new _A().compose(new U(x0 + 0.05, 1.0, zc), new Kw().setFromAxisAngle(new U(0, 0, 1), Math.PI / 2), new U(0.38, 0.02, 0.38)), __prK('#4a5256'));
        S.box('dark', x0 - 0.01, 1.6, zc - 0.6, x0, 1.8, zc + 0.6, blk);
        S.box('glow', x0 - 0.012, 1.68, zc - 0.5, x0 - 0.011, 1.74, zc - 0.3, __prK('#ff4a3a'));
        break;
      }
      case 'folding':
      case 'prep': {
        S.box('stainless', it.x0, 0.86, it.z0, it.x1, 0.9, it.z1, ss);
        S.box('stainless', it.x0 + 0.05, 0.22, it.z0 + 0.05, it.x1 - 0.05, 0.25, it.z1 - 0.05, ss);
        for (const [x, zz] of [[it.x0 + 0.05, it.z0 + 0.05], [it.x1 - 0.05, it.z0 + 0.05], [it.x0 + 0.05, it.z1 - 0.05], [it.x1 - 0.05, it.z1 - 0.05]]) S.cyl('stainless', [x, 0, zz], [x, 0.86, zz], 0.022, ss);
        if (it.k === 'prep') {
          S.add('stainless', __prUnit('cyl16'), new _A().makeTranslation(it.x0 + 0.6, 1.0, (it.z0 + it.z1) / 2).multiply(new _A().makeScale(0.22, 0.2, 0.22)), ss);
          S.box('wood', it.x0 + 1.4, 0.9, it.z0 + 0.25, it.x0 + 1.9, 0.93, it.z1 - 0.25, __prK('#c9a77a'));
        } else for (let k = 0; k < 4; k++) S.add('cloth', __prRBox(0.38, 0.06, 0.3, 0.025, 1), new _A().makeTranslation(it.x0 + 0.4 + k * 0.7, 0.93 + (k % 2) * 0.06, (it.z0 + it.z1) / 2), __prK(['#f0eee6', '#c86a2c', '#f0eee6', '#a8b0b6'][k]));
        break;
      }
      case 'cart': {
        S.box('paint', it.x0, 0.12, it.z0, it.x1, 0.16, it.z1, dk);
        S.add('cloth', __prRBox(it.x1 - it.x0 - 0.06, 0.75, it.z1 - it.z0 - 0.06, 0.05, 2), new _A().makeTranslation((it.x0 + it.x1) / 2, 0.55, (it.z0 + it.z1) / 2), __prK('#c9c0a6'));
        S.add('cloth', __prRBox(it.x1 - it.x0 - 0.2, 0.12, it.z1 - it.z0 - 0.2, 0.05, 2), new _A().makeTranslation((it.x0 + it.x1) / 2, 0.92, (it.z0 + it.z1) / 2), __prK('#c86a2c'));
        for (const [x, zz] of [[it.x0 + 0.08, it.z0 + 0.08], [it.x1 - 0.08, it.z0 + 0.08], [it.x0 + 0.08, it.z1 - 0.08], [it.x1 - 0.08, it.z1 - 0.08]]) S.add('dark', __prUnit('cyl16'), new _A().compose(new U(x, 0.06, zz), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI / 2), new U(0.06, 0.03, 0.06)), blk);
        break;
      }
      case 'curtains': {
        S.cyl('stainless', [it.x0, 2.2, it.z], [it.x1, 2.2, it.z], 0.015, ss);
        for (let x = it.x0; x < it.x1 - 0.5; x += 3) {
          const len = 1.2 + (x % 2) * 0.6;
          for (let k = 0; k < 10; k++) {
            const xa = x + (k / 10) * len,
              xb = x + ((k + 1) / 10) * len,
              da = Math.sin(k * 1.4) * 0.06,
              db = Math.sin((k + 1) * 1.4) * 0.06;
            __prQuad(S.b('cloth'), [xa, 0.35, it.z + da], [xb, 0.35, it.z + db], [xb, 2.18, it.z + db], [xa, 2.18, it.z + da], [0, 0, 1], __prK('#9fc3cf'));
            __prQuad(S.b('cloth'), [xa, 0.35, it.z + da - 0.004], [xb, 0.35, it.z + db - 0.004], [xb, 2.18, it.z + db - 0.004], [xa, 2.18, it.z + da - 0.004], [0, 0, -1], __prK('#9fc3cf'));
          }
        }
        break;
      }
      case 'serving': {
        S.box('stainless', it.x0, 0, it.z0, it.x1, 0.9, it.z1, ss);
        S.box('stainless', it.x0 - 0.02, 0.9, it.z0 - 0.02, it.x1 + 0.02, 0.95, it.z1 + 0.02, ss);
        for (let zz = it.z0 + 0.3; zz < it.z1 - 0.4; zz += 0.7) {
          S.box('dark', it.x0 + 0.12, 0.88, zz, it.x1 - 0.12, 0.951, zz + 0.55, __prK('#5b6266'));
          S.box('cloth', it.x0 + 0.15, 0.9, zz + 0.03, it.x1 - 0.15, 0.94, zz + 0.52, __prK(['#8c3b26', '#e2d6b0', '#4f6b2e', '#c4a35a'][Math.round(zz * 3) % 4]));
        }
        S.box('stainless', it.rail - 0.1, 0.88, it.z0, it.rail + 0.15, 0.92, it.z1, ss);
        for (const zz of [it.z0, it.z1]) S.cyl('stainless', [it.rail, 0, zz], [it.rail, 0.88, zz], 0.03, ss);
        for (let zz = it.z0; zz <= it.z1; zz += 1.8) S.cyl('stainless', [it.x0 + 0.02, 0.95, zz], [it.x0 + 0.02, 1.78, zz], 0.015, ss);
        S.box('stainless', it.x0 - 0.05, 1.75, it.z0, it.x0 + 0.1, 1.8, it.z1, ss);
        break;
      }
      case 'range': {
        S.box('dark', it.x0, 0, it.z0, it.x1, 0.9, it.z1, __prK('#2b2e30'));
        S.box('stainless', it.x0, 0.9, it.z0, it.x1, 0.93, it.z1, ss);
        for (let k = 0; k < 6; k++) {
          const x = it.x0 + 0.45 + k * 0.78,
            zc = (it.z0 + it.z1) / 2;
          S.add('dark', __prUnit('tor'), new _A().compose(new U(x, 0.945, zc), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI / 2), new U(0.18, 0.18, 0.5)), blk);
          S.box('dark', x - 0.3, 0.2, it.z1 - 0.01, x + 0.3, 0.7, it.z1, __prK('#3d4245'));
          S.box('stainless', x - 0.25, 0.62, it.z1, x + 0.25, 0.64, it.z1 + 0.04, ss);
        }
        S.add('stainless', __prUnit('cyl16'), new _A().makeTranslation(it.x0 + 1.2, 1.1, (it.z0 + it.z1) / 2).multiply(new _A().makeScale(0.3, 0.32, 0.3)), ss);
        break;
      }
      case 'hood': {
        S.box('stainless', it.x0, it.y0 + 0.25, it.z0, it.x1, it.y1, it.z1, ss);
        S.box('dark', it.x0 + 0.1, it.y0 + 0.24, it.z0 + 0.2, it.x1 - 0.1, it.y0 + 0.25, it.z1 - 0.2, __prK('#5e6569'));
        S.box('stainless', it.x0 + 0.1, it.y0, it.z0 + 0.1, it.x1 - 0.1, it.y0 + 0.25, it.z1 - 0.1, ss);
        S.box('stainless', (it.x0 + it.x1) / 2 - 0.35, it.y1, (it.z0 + it.z1) / 2 - 0.35, (it.x0 + it.x1) / 2 + 0.35, 4.2, (it.z0 + it.z1) / 2 + 0.35, ss);
        break;
      }
      case 'kettle': {
        S.add('stainless', __prUnit('hemi'), new _A().compose(new U(it.x, 0.95, it.z), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI), new U(it.r * 0.92, 0.5, it.r * 0.92)), ss);
        S.add('stainless', __prUnit('tor'), new _A().compose(new U(it.x, 0.95, it.z), new Kw().setFromAxisAngle(new U(1, 0, 0), Math.PI / 2), new U(it.r * 0.92, it.r * 0.92, 0.4)), ss);
        S.add('stainless', __prUnit('hemi'), new _A().compose(new U(it.x, 0.97, it.z), new Kw(), new U(it.r * 0.9, 0.12, it.r * 0.9)), ss);
        for (const a of [0, 2.1, 4.2]) S.cyl('stainless', [it.x + Math.cos(a) * it.r * 0.6, 0, it.z + Math.sin(a) * it.r * 0.6], [it.x + Math.cos(a) * it.r * 0.6, 0.5, it.z + Math.sin(a) * it.r * 0.6], 0.03, ss);
        S.cyl('dark', [it.x + it.r, 0.85, it.z], [it.x + it.r + 0.2, 0.85, it.z], 0.02, blk);
        break;
      }
      case 'wireshelf': {
        for (const y of [0.1, 0.6, 1.1, 1.6]) S.box('stainless', it.x0, y, it.z0, it.x1, y + 0.02, it.z1, ss);
        for (const [x, zz] of [[it.x0, it.z0], [it.x1, it.z0], [it.x0, it.z1], [it.x1, it.z1]]) S.cyl('stainless', [x, 0, zz], [x, it.h, zz], 0.012, ss, 'cyl6');
        for (const y of [0.12, 0.62, 1.12]) S.box('cloth', it.x0 + 0.1, y, it.z0 + 0.1, it.x1 - 0.2, y + 0.3, it.z1 - 0.15, __prK(y > 1 ? '#c8b27a' : '#a8885a'));
        break;
      }
      case 'sink': {
        S.box('stainless', it.x0, 0.85, it.z0, it.x1, 0.95, it.z1, ss);
        for (let k = 0; k < 3; k++) S.box('dark', it.x0 + 0.15 + k * 1.5, 0.94, it.z0 + 0.25, it.x0 + 1.35 + k * 1.5, 0.951, it.z1 - 0.25, __prK('#6e767a'));
        S.box('stainless', it.x0, 0.95, it.z1 - 0.06, it.x1, 1.25, it.z1, ss);
        for (let k = 0; k < 3; k++) S.cyl('stainless', [it.x0 + 0.75 + k * 1.5, 0.95, it.z1 - 0.1], [it.x0 + 0.75 + k * 1.5, 1.3, it.z1 - 0.1], 0.02, ss);
        for (const x of [it.x0 + 0.05, it.x1 - 0.05]) S.cyl('stainless', [x, 0, it.z0 + 0.1], [x, 0.85, it.z0 + 0.1], 0.025, ss);
        break;
      }
      case 'dock': {
        for (let x = it.x0 + 1; x < it.x1; x += 3) S.box('dark', x, 0.5, it.z1, x + 0.6, 1.0, it.z1 + 0.12, __prK('#1e1f20'));
        S.box('paint', it.x0, it.h - 0.02, it.z1 - 0.15, it.x1, it.h + 0.003, it.z1, __prK('#d6ad2a'));
        S.box('plate', it.x0 + 8, it.h, it.z1 - 1.8, it.x0 + 10, it.h + 0.006, it.z1, __prK('#9aa1a4'));
        break;
      }
    }
  }
}
// ---------------------------------------------------------------- the riot: fires, smoke, beacons
function __prRiot(root, S, R, models, ticks, low) {
  const smokes = [];
  for (const f of R.fires) {
    if (f.k === 'barrel') {
      R.models.push({ id: 'barrel_03', x: f.x, y: 0, z: f.z, ry: f.x, s: 1, burnt: 1 });
      __xmFire(root, f.x, 0.93, f.z, ticks, 0.75 * f.s);
    } else if (f.k === 'tyres') {
      for (let k = 0; k < 4; k++) S.add('dark', __prUnit('tyre'), new _A().compose(new U(f.x + (k % 2) * 0.12 - 0.06, 0.1 + k * 0.17, f.z + (k > 1 ? 0.1 : -0.05)), new Kw().setFromEuler(new TB(Math.PI / 2 + (k - 1.5) * 0.06, k * 0.7, 0)), new U(0.3, 0.3, 0.34)), __prK('#1a1a1a'));
      __xmFire(root, f.x, 0.66, f.z, ticks, 1.1 * f.s);
    } else {
      S.add('cloth', __prRBox(1.9, 0.12, 0.8, 0.05, 2), new _A().compose(new U(f.x, 0.07, f.z), new Kw().setFromAxisAngle(__prUp, 0.5), new U(1, 1, 1)), __prK('#2a2420'));
      __xmFire(root, f.x - 0.4, 0.1, f.z, ticks, 0.6 * f.s);
      __xmFire(root, f.x + 0.5, 0.1, f.z + 0.2, ticks, 0.45 * f.s);
    }
    // smoke rising, thick and dark, bending in the wind
    const indoor = __PR.lvSample && __PR.lvSample(f.x, 3, f.z)[0] < 0.5,
      u = __xmRising(root, [f.x, 1.2, f.z], low ? 26 : 50, { color: '#2a2826', size: indoor ? 1.6 : 3.2, rise: indoor ? 4.5 : 22, spread: indoor ? 3 : 4, life: indoor ? 4.5 : 9, add: !1, opacity: 0.42, grow: 1.5 });
    u && smokes.push(u);
  }
  ticks.push((dt) => {
    for (const u of smokes) u.value += Math.min(dt, 0.1);
  });
  // alarm beacons: a red dome with a spinning reflector and two sweeping beams
  const beams = [];
  const beamGeo = new Oc(0.5, 6, 12, 1, !0);
  beamGeo.translate(0, -3, 0);
  beamGeo.rotateX(Math.PI / 2);
  const beamMat = Object.assign(new Ni({ color: '#ff2a1a', transparent: !0, opacity: 0.18, blending: 2, depthWrite: !1, side: 2, toneMapped: !1 }), { __prOwn: 1 });
  for (const b of R.beacons) {
    const g = new ji();
    g.position.set(b.x, b.y, b.z);
    g.rotation.y = b.ry;
    g.userData.dyn = 1;
    root.add(g);
    const nrm = new U(Math.sin(b.ry), 0, Math.cos(b.ry));
    S.box('dark', b.x - 0.08 - Math.abs(nrm.z) * 0.04, b.y - 0.25, b.z - 0.08 - Math.abs(nrm.x) * 0.04, b.x + 0.08 + Math.abs(nrm.z) * 0.04, b.y - 0.18, b.z + 0.08 + Math.abs(nrm.x) * 0.04, __prK('#2a2c2e'));
    S.add('glow', __prUnit('hemi'), new _A().compose(new U(b.x + nrm.x * 0.08, b.y - 0.18, b.z + nrm.z * 0.08), new Kw(), new U(0.1, 0.16, 0.1)), __prK('#ff3020'));
    const spin = new ji();
    spin.position.set(nrm.x * 0.08 * 0, -0.1, 0.08);
    g.add(spin);
    for (const s of [0, Math.PI]) {
      const o = new Ow(beamGeo, beamMat);
      o.rotation.y = s;
      o.frustumCulled = !1;
      spin.add(o);
    }
    beams.push(spin);
  }
  beamGeo.__shared = 0;
  let t = 0;
  ticks.push((dt) => {
    t += dt;
    const on = Math.sin(t * 2.2) > -0.2;
    for (const s of beams) (s.rotation.y = t * 4), (s.visible = on);
  });
}
// ---------------------------------------------------------------- Poly Haven models
function __prModels2(root, R, models) {
  const by = new Map();
  for (const m of R.models) (by.get(m.id) || by.set(m.id, []).get(m.id)).push(m);
  const cams = R.cams.map((c) => ({ id: 'security_camera_01', x: c.x, y: c.y - 0.15, z: c.z, ry: c.ry, s: 1 }));
  by.set('security_camera_01', cams);
  for (const [id, list] of by) {
    const g = models[id];
    if (!g) continue;
    const { parts } = __flParts(g);
    for (const p of parts) for (const mt of [].concat(p.mat)) __prLit(mt);
    const scale = id === 'steel_frame_shelves_01' ? 0.1 : 1,
      M = new _A(),
      Q = new Kw(),
      Sv = new U(),
      Pv = new U();
    for (const p of parts) {
      const im = new QZ(p.geo, p.mat, list.length);
      list.forEach((o, k) => {
        Q.setFromEuler(new TB(o.rx || 0, o.ry || 0, 0, 'YXZ'));
        im.setMatrixAt(k, M.compose(Pv.set(o.x, o.y, o.z), Q, Sv.setScalar((o.s || 1) * scale)).multiply(p.M));
      });
      im.instanceMatrix.needsUpdate = !0;
      im.computeBoundingSphere();
      im.castShadow = id !== 'security_light';
      im.receiveShadow = !0;
      im.name = 'prison_model_' + id;
      root.add(im);
    }
  }
}
// ---------------------------------------------------------------- doors, gates, doorways
// The core draws every map's doors as one instanced wooden house door. Blackwater's are drawn here instead
// (the core's door drawing is skipped for it, below): the cell gates slide (bars on a track), steel doors swing
// (a vision panel of wired glass, a kick plate, a lever, hinges; solitary's have a food slot and a barred
// window), the office doors are panelled timber. Same door objects, same opening and closing (E, bots,
// online), same timing as the core's animation.
function __prDoorLeaf(kind, w, h) {
  const S = __prSet(),
    T = 0.05,
    paint = 1,
    ss = __prK('#c4cacd'),
    dk = __prK('#25292b');
  // (local: x across the leaf from its hinge, y up, z through it)
  const B = (k, x0, y0, z0, x1, y1, z1, c = paint) => S.b(k).add(__prUnit('box'), __prBM(x0, y0, z0, x1, y1, z1), c);
  const Cy = (k, a, b, r, c = paint, u = 'cyl8') => S.b(k).add(__prUnit(u), __prCM(a, b, r), c);
  if (kind === 'cell') {
    const n = Math.round((w - 0.05) / 0.115);
    for (let i = 0; i <= n; i++) {
      const x = 0.03 + ((w - 0.06) * i) / n;
      Cy('paint', [x, 0.03, 0], [x, h - 0.14, 0], 0.0125);
    }
    for (const y of [0.08, 1.1, h - 0.16]) B('paint', 0, y - 0.025, -0.02, w, y + 0.025, 0.02);
    B('paint', 0, 0.02, -0.03, 0.05, h - 0.12, 0.03);
    B('paint', w - 0.05, 0.02, -0.03, w, h - 0.12, 0.03);
    B('paint', w - 0.2, 0.95, -0.06, w - 0.05, 1.25, 0.06);
    return S;
  }
  if (kind === 'wood') {
    B('wood', 0, 0, -T / 2, w, h, T / 2);
    for (const [y0, y1] of [[0.15, h * 0.45], [h * 0.52, h - 0.15]]) for (const sd of [-1, 1]) B('wood', 0.12, y0, sd * T / 2, w - 0.12, y1, sd * (T / 2 + 0.008), __prK('#d9cdbb'));
    for (const sd of [-1, 1]) Cy('stainless', [w - 0.09, 1.0, sd * T / 2], [w - 0.09, 1.0, sd * (T / 2 + 0.06)], 0.025, __prK('#b89b5a'), 'cyl16');
    for (const y of [0.25, h - 0.25]) Cy('stainless', [0, y - 0.06, 0], [0, y + 0.06, 0], 0.012, __prK('#b89b5a'));
    return S;
  }
  // steel doors (and solitary's)
  const shu = kind === 'shu';
  B('paint', 0, 0, -T / 2, w, h, T / 2);
  // raised stiles and rails round the faces
  for (const sd of [-1, 1]) {
    const z0 = sd * T / 2,
      z1 = sd * (T / 2 + 0.008);
    B('paint', 0, 0, z0, 0.06, h, z1);
    B('paint', w - 0.06, 0, z0, w, h, z1);
    B('paint', 0, h - 0.07, z0, w, h, z1);
    B('stainless', 0.04, 0.02, sd * T / 2, w - 0.04, 0.28, sd * (T / 2 + 0.003), ss);
  }
  if (shu) {
    // a small barred window high up, a food slot with a hinged flap
    B('glass', w * 0.35, 1.45, -0.01, w * 0.65, 1.8, 0.01, __prK('#2c3a40'));
    for (let k = 1; k < 4; k++) Cy('paint', [w * 0.35 + (w * 0.3 * k) / 4, 1.45, 0], [w * 0.35 + (w * 0.3 * k) / 4, 1.8, 0], 0.008);
    for (const sd of [-1, 1]) B('paint', w * 0.3, 0.98, sd * T / 2, w * 0.7, 1.16, sd * (T / 2 + 0.03), __prK('#3c4446'));
  } else {
    // a narrow vision panel of wired glass on the latch side
    const x0 = w - 0.42,
      x1 = w - 0.26;
    B('glass', x0, 1.25, -0.012, x1, 1.95, 0.012, __prK('#2c3a40'));
    for (const sd of [-1, 1]) {
      B('paint', x0 - 0.03, 1.22, sd * T / 2, x1 + 0.03, 1.25, sd * (T / 2 + 0.012));
      B('paint', x0 - 0.03, 1.95, sd * T / 2, x1 + 0.03, 1.98, sd * (T / 2 + 0.012));
      B('paint', x0 - 0.03, 1.25, sd * T / 2, x0, 1.95, sd * (T / 2 + 0.012));
      B('paint', x1, 1.25, sd * T / 2, x1 + 0.03, 1.95, sd * (T / 2 + 0.012));
    }
  }
  // recessed panels (pressed into the sheet), a closer arm at the head, a number plate, wired glass mesh
  for (const sd of [-1, 1]) {
    const z0 = sd * T / 2,
      z1 = sd * (T / 2 + 0.005);
    for (const [y0, y1] of shu ? [[0.35, 0.9], [1.9, h - 0.2]] : [[0.35, 1.0], [2.02, h - 0.18]]) {
      B('paint', 0.14, y0, z0, w - 0.14, y0 + 0.02, z1);
      B('paint', 0.14, y1 - 0.02, z0, w - 0.14, y1, z1);
      B('paint', 0.14, y0, z0, 0.16, y1, z1);
      B('paint', w - 0.16, y0, z0, w - 0.14, y1, z1);
    }
    B('stainless', w * 0.5 - 0.09, h - 0.32, sd * T / 2, w * 0.5 + 0.09, h - 0.24, sd * (T / 2 + 0.004), ss);
  }
  B('dark', 0.1, h - 0.16, T / 2, 0.42, h - 0.08, T / 2 + 0.06, dk);
  Cy('dark', [0.4, h - 0.12, T / 2 + 0.05], [0.75, h - 0.04, T / 2 + 0.2], 0.012, dk, 'cyl6');
  if (!shu) {
    const x0 = w - 0.42,
      x1 = w - 0.26;
    for (let k = 1; k < 7; k++) Cy('rod', [x0, 1.25 + (0.7 * k) / 7, 0], [x1, 1.25 + (0.7 * k) / 7, 0], 0.0018, __prK('#8a8f92'), 'cyl6');
    for (let k = 1; k < 3; k++) Cy('rod', [x0 + ((x1 - x0) * k) / 3, 1.25, 0], [x0 + ((x1 - x0) * k) / 3, 1.95, 0], 0.0018, __prK('#8a8f92'), 'cyl6');
  }
  // lever handles both sides, a deadlock, a push bar on one face, hinges
  for (const sd of [-1, 1]) {
    Cy('stainless', [w - 0.1, 1.02, sd * T / 2], [w - 0.1, 1.02, sd * (T / 2 + 0.05)], 0.018, ss, 'cyl16');
    B('stainless', w - 0.26, 0.995, sd * (T / 2 + 0.035), w - 0.08, 1.045, sd * (T / 2 + 0.06), ss);
    Cy('dark', [w - 0.1, 1.28, sd * T / 2], [w - 0.1, 1.28, sd * (T / 2 + 0.012)], 0.03, dk, 'cyl16');
  }
  shu || (B('stainless', 0.12, 0.98, T / 2 + 0.05, w - 0.12, 1.04, T / 2 + 0.08, ss), B('stainless', 0.12, 0.96, T / 2, 0.16, 1.06, T / 2 + 0.06, ss), B('stainless', w - 0.16, 0.96, T / 2, w - 0.12, 1.06, T / 2 + 0.06, ss));
  for (const y of [0.25, h * 0.5, h - 0.25]) Cy('dark', [-0.005, y - 0.07, 0], [-0.005, y + 0.07, 0], 0.016, dk);
  return S;
}
function __prDoors(root, R, m, ticks) {
  const groups = new Map(),
    Mx = new _A(),
    Q = new Kw(),
    P = new U(),
    Sc = new U(1, 1, 1),
    up = new U(0, 1, 0),
    col = new UA();
  for (const d of m.doors) {
    const kind = d.__cell ? 'cell' : d.__shu ? 'shu' : /^#(5c3b24|8a6a4a|7a5236)$/i.test(d.color || '') ? 'wood' : 'steel',
      key = kind + '|' + d.w.toFixed(2) + '|' + d.h.toFixed(2);
    (groups.get(key) || groups.set(key, { kind, w: d.w, h: d.h, doors: [] }).get(key)).doors.push(d);
  }
  const insts = [];
  for (const g of groups.values()) {
    const S = __prDoorLeaf(g.kind, g.w, g.h),
      tmp = new ji();
    S.build(tmp, __prMats, 'prison_door_', !0);
    for (const o of [...tmp.children]) {
      const im = new QZ(o.geometry, o.material, g.doors.length);
      im.name = 'prison_door';
      im.castShadow = !0;
      im.receiveShadow = !0;
      im.frustumCulled = !1;
      const tint = o.material === __prMats('paint') || o.material === __prMats('wood');
      tint && g.doors.forEach((d, k) => im.setColorAt(k, col.set(g.kind === 'cell' ? '#55625f' : d.color || '#ffffff')));
      root.add(im);
      insts.push({ im, g });
    }
  }
  // place (and animate) every leaf: swing about the hinge, or slide along the track (cell gates)
  const place = (im, k, d) => {
    if (d.__cell) {
      const c = d.__cell;
      Q.setFromAxisAngle(up, d.alongX ? 0 : -Math.PI / 2);
      const along = new U(1, 0, 0).applyQuaternion(Q),
        through = new U(0, 0, 1).applyQuaternion(Q),
        slide = -d.anim * (d.w - 0.05);
      P.set(d.hinge.x, d.hinge.y, d.hinge.z).addScaledVector(along, slide).addScaledVector(through, d.anim > 0.01 ? c.s * 0.07 : 0);
    } else {
      Q.setFromAxisAngle(up, (d.alongX ? 0 : -Math.PI / 2) + d.swing * d.anim * Math.PI * 0.5);
      P.set(d.hinge.x, d.hinge.y, d.hinge.z);
    }
    im.setMatrixAt(k, Mx.compose(P, Q, Sc));
  };
  for (const { im, g } of insts) {
    g.doors.forEach((d, k) => place(im, k, d));
    im.instanceMatrix.needsUpdate = !0;
    im.instanceColor && (im.instanceColor.needsUpdate = !0);
    im.computeBoundingSphere();
  }
  ticks.push((dt) => {
    let moved = !1;
    // the open leaf's collision: on while the door is open, once nobody stands where the leaf rests
    const st = eA.state;
    for (const d of m.doors) {
      const b = d.__leafBox;
      if (!b) continue;
      const want = !!d.open && d.anim > 0.85;
      if (want === !b.off) continue;
      if (want && st && st.players.some((p) => p.alive && p.pos.x > b.min.x - 0.4 && p.pos.x < b.max.x + 0.4 && p.pos.z > b.min.z - 0.4 && p.pos.z < b.max.z + 0.4 && p.pos.y < b.max.y && p.pos.y + 1.8 > b.min.y)) continue;
      b.off = !want;
    }
    for (const d of m.doors) {
      const s = d.open ? 1 : 0;
      if (Math.abs(d.anim - s) < 0.001) continue;
      d.anim += (s - d.anim) * Math.min(1, dt * (d.__cell ? 4 : 7));
      Math.abs(d.anim - s) < 0.001 && (d.anim = s);
      moved = !0;
    }
    if (!moved) return;
    for (const { im, g } of insts) {
      g.doors.forEach((d, k) => place(im, k, d));
      im.instanceMatrix.needsUpdate = !0;
    }
  });
  // lock panels on the Jailbreak cells: red while locked, green once cut
  const panels = [];
  for (const c of (m.jb && m.jb.cells) || []) {
    const d = m.doors[c.doorId];
    if (!d) continue;
    const cell = d.__cell,
      out = cell ? cell.s : c.door.z > c.inside.z ? 1 : -1,
      onX = cell ? !1 : !0,
      px = cell ? cell.front + out * 0.06 : c.door.x + 0.72,
      pz = cell ? cell.a1 + 0.25 : c.door.z - out * 0.75,
      py = (c.door.y || 0) + 1.35,
      g = new Ow(__prUnit('box'), __prMats('darkM'));
    g.position.set(px, py, pz);
    g.scale.set(onX ? 0.18 : 0.05, 0.26, onX ? 0.05 : 0.18);
    root.add(g);
    const led = new Ow(__prUnit('sph'), Object.assign(new Ni({ color: '#ff2a1a', toneMapped: !1 }), { __prOwn: 1 }));
    led.position.set(px + (onX ? 0 : out * 0.03), py + 0.08, pz + (onX ? out * 0.03 : 0));
    led.scale.setScalar(0.022);
    root.add(led);
    panels.push({ led, c });
  }
  ticks.push(() => {
    const st = eA.state,
      J = st && st.jb;
    for (const p of panels) {
      const s = J && J.p && J.p[p.c.id],
        open = s && s.state !== 'locked';
      p.led.visible = !!J;
      p.led.material.color.set(open ? '#2aff5a' : Math.sin(performance.now() / 300) > 0 ? '#ff2a1a' : '#5a0a06');
    }
  });
  return insts.length;
}
// doorways: a steel frame round every opening (both faces), and on the wide entrances a barred sliding gate
// racked open beside the opening on the inside, on a track
function __prDoorways(S, R) {
  const fr = __prK('#3d474a'),
    gate = __prK('#55625f');
  for (const o of R.openings || []) {
    const t = o.t || 0.3,
      faces = o.out === 0 ? [-1, 1] : [-1, 1],
      P = (a, y, d) => (o.alongX ? [a, y, o.f + d] : [o.f + d, y, a]),
      box = (a0, y0, d0, a1, y1, d1, c, k = 'paint') => {
        const p = P(a0, y0, d0),
          q = P(a1, y1, d1);
        S.box(k, Math.min(p[0], q[0]), y0, Math.min(p[2], q[2]), Math.max(p[0], q[0]), y1, Math.max(p[2], q[2]), c);
      };
    // every doorway gets a heavy steel frame on both faces (doors: a door frame with a stop, round the leaf)
    for (const sd of faces) {
      if (o.type !== 'open') {
        const d0 = sd * (t / 2),
          d1 = sd * (t / 2 + 0.045);
        box(o.a - 0.12, o.y0, d0, o.a, o.y1 + 0.12, d1, fr);
        box(o.a + o.w, o.y0, d0, o.a + o.w + 0.12, o.y1 + 0.12, d1, fr);
        box(o.a - 0.12, o.y1, d0, o.a + o.w + 0.12, o.y1 + 0.12, d1, fr);
      }
    }
    o.type !== 'open' && o.out && o.y0 < 0.05 && box(o.a - 0.2, 0, o.out * (t / 2), o.a + o.w + 0.2, 0.06, o.out * (t / 2 + 0.38), __prK('#cfc8bb'), 'granite');
    if (o.type === 'open')
      for (const sd of faces) {
        const d0 = sd * (t / 2),
          d1 = sd * (t / 2 + 0.035);
        box(o.a - 0.1, o.y0, d0, o.a, o.y1 + 0.1, d1, fr);
        box(o.a + o.w, o.y0, d0, o.a + o.w + 0.1, o.y1 + 0.1, d1, fr);
        box(o.a - 0.1, o.y1, d0, o.a + o.w + 0.1, o.y1 + 0.1, d1, fr);
      }
    // a threshold plate
    o.y0 < 0.05 && box(o.a, 0.0, -t / 2 - 0.05, o.a + o.w, 0.035, t / 2 + 0.05, __prK('#9aa1a4'), 'plate');
    if (o.type !== 'open' || o.out === 0 || o.w < 2.3 || o.w > 3.1) continue;
    // the gate: racked beside the opening on the inside face, where the wall is clear
    const inside = -o.out,
      others = (R.openings || []).filter((p) => p !== o && p.alongX === o.alongX && Math.abs(p.f - o.f) < 0.05),
      fits = (a0, a1) => a0 > o.a0 + 0.2 && a1 < o.a1 - 0.2 && !others.some((p) => p.a < a1 + 0.1 && p.a + p.w > a0 - 0.1);
    let g0 = o.a + o.w + 0.08;
    fits(g0, g0 + o.w) || ((g0 = o.a - o.w - 0.08), fits(g0, g0 + o.w) || (g0 = null));
    if (g0 === null) continue;
    const d = inside * (t / 2 + 0.09),
      h = o.y1 - 0.05,
      n = Math.round(o.w / 0.12);
    for (let i = 0; i <= n; i++) S.cyl('paint', P(g0 + (o.w * i) / n, 0.05, d), P(g0 + (o.w * i) / n, h, d), 0.013, gate, 'cyl8');
    for (const y of [0.1, 1.1, h - 0.06]) box(g0, y - 0.03, d - 0.015, g0 + o.w, y + 0.03, d + 0.015, gate);
    // the track over the opening and the gate, on brackets
    box(Math.min(o.a, g0) - 0.1, o.y1 + 0.12, inside * (t / 2), Math.max(o.a + o.w, g0 + o.w) + 0.1, o.y1 + 0.24, d + inside * 0.04, fr);
    // and a sign over the opening on the inside: a striped warning band
    box(o.a, o.y1 + 0.26, inside * (t / 2), o.a + o.w, o.y1 + 0.34, inside * (t / 2 + 0.012), __prK('#d6ad2a'));
  }
}
// the core's door drawing is skipped on Blackwater (drawn above)
{
  const coreDoors = diA;
  diA = function () {
    return aw().id === 'prison' || aw().__view ? null : coreDoors.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- the whole set
function __prDetail(root, m, models, ticks) {
  const R = m.__pr;
  if (!R) return null;
  const low = Zw.getState().quality === 'low';
  R.__coils = [];
  R.__glassB = [];
  R.__lampsCell = [];
  R.__emis = [];
  let seed = 1234;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
    S = __prSet(),
    S2 = __prSet(),
    chainB = __flMB(),
    meshB = __flMB(),
    leaves = [],
    carved = [],
    screens = [],
    beams = [],
    t0 = performance.now();
  __prBars(S, R, leaves);
  __prFences(S, R, chainB);
  __prWire(S, R);
  __prRails(S, R, meshB);
  __prStairs(S, R);
  __prGallery(S, R);
  __prVault(root, S, R, m);
  __prArches(root, S, R, m, carved);
  __prTurrets(root, S, R);
  __prPerimeter(S, R, m);
  __prLines(S, R);
  __prRubble(S, R);
  __prCells(S, R, rnd);
  __prTables(S, R);
  __prLamps(root, S, R, models);
  __prTowers(S, R, beams);
  __prItems(S, R, screens);
  __prRiot(root, S, R, models, ticks, low);
  for (const p of R.pipes) for (let k = 0; k + 1 < p.pts.length; k++) {
    S.cyl(p.duct ? 'stainless' : 'paint', p.pts[k], p.pts[k + 1], p.r, __prK(p.c), 'cyl16');
    if (p.duct) {
      const [a, b] = [p.pts[k], p.pts[k + 1]],
        L = Math.hypot(b[0] - a[0], b[2] - a[2]);
      for (let s = 1.5; s < L; s += 1.5) {
        const t = s / L,
          q = [a[0] + (b[0] - a[0]) * t, a[1], a[2] + (b[2] - a[2]) * t];
        S.cyl('stainless', [q[0] - 0.03, q[1], q[2]], [q[0] + 0.03, q[1], q[2]], p.r + 0.015, __prK('#9ea4a7'), 'cyl16');
        S.cyl('paint', [q[0], q[1] + p.r, q[2]], [q[0], 4.2, q[2]], 0.01, __prK('#55595c'), 'cyl6');
      }
    }
  }
  __prCoils(root, R);
  const tris = S.build(root, __prMats, 'prison_det_');
  chainB.count && __flMesh(root, chainB.build(), __prAlphaMat(__prChainTex(), '#b7bec2', 0.6), 'prison_chainlink', !1);
  meshB.count && __flMesh(root, meshB.build(), __prMats('mesh'), 'prison_railmesh', !1);
  // window fanlights (glass)
  if (R.__glassB.length) {
    const G = __flMB();
    for (const b of R.__glassB) {
      const g = b.build();
      G.add(g, new _A(), 1);
      g.dispose();
    }
    const gm = new Gw({ color: '#3a4a52', emissive: '#7f949c', emissiveIntensity: 0.25, roughness: 0.08, metalness: 0.4 });
    gm.__prOwn = 1;
    __flMesh(root, G.build(), gm, 'prison_fanlights', !1);
  }
  // CCTV screens
  if (screens.length) {
    const MB = __flMB(),
      tex = __prScreenTex();
    for (const s of screens) {
      const g = new uw(),
        k = s.n % 8,
        u0 = (k % 4) / 4,
        v0 = k < 4 ? 0.5 : 0,
        onZ = Math.abs(s.z1 - s.z0) < Math.abs(s.x1 - s.x0);
      const P = onZ ? [s.x0, s.y0, s.z1, s.x1, s.y0, s.z1, s.x1, s.y1, s.z1, s.x0, s.y1, s.z1] : [s.x1, s.y0, s.z0, s.x1, s.y0, s.z1, s.x1, s.y1, s.z1, s.x1, s.y1, s.z0];
      g.setAttribute('position', new gi(new Float32Array(P), 3));
      g.setAttribute('normal', new gi(new Float32Array(onZ ? [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1] : [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]), 3));
      g.setAttribute('uv', new gi(new Float32Array([u0, v0, u0 + 0.25, v0, u0 + 0.25, v0 + 0.5, u0, v0 + 0.5]), 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      MB.add(g, new _A(), 1);
    }
    const sm = Object.assign(new Ni({ map: tex, toneMapped: !1, side: 2 }), { __prOwn: 1 });
    sm.color.setScalar(1.1);
    __flMesh(root, MB.build(), sm, 'prison_screens', !1);
  }
  __prSigns(root, R, carved);
  __prModels2(root, R, models);
  const doors = __prDoors(root, R, m, ticks);
  __prDoorways(S2, R);
  S2.build(root, __prMats, 'prison_dw_');
  // searchlights on the towers: a lamp head that sweeps, with a beam at dusk and night
  const beamGeo = new Oc(2.2, 34, 16, 1, !0);
  beamGeo.translate(0, -17, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const bm = Object.assign(new Ni({ color: '#fff4dc', transparent: !0, opacity: 0.06, blending: 2, depthWrite: !1, side: 2, toneMapped: !1, fog: !0 }), { __prOwn: 1 });
  const lights = [];
  for (const b of beams) {
    const g = new ji();
    g.position.set(b.x, b.y, b.z);
    g.userData.dyn = 1;
    root.add(g);
    const head = new Ow(__prUnit('cyl16'), __prMats('darkM'));
    head.scale.set(0.22, 0.4, 0.22);
    head.rotation.x = Math.PI / 2;
    g.add(head);
    const lens = new Ow(__prUnit('cyl16'), Object.assign(new Ni({ color: '#fff6e0', toneMapped: !1 }), { __prOwn: 1 }));
    lens.scale.set(0.2, 0.02, 0.2);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.2;
    g.add(lens);
    const beam = new Ow(beamGeo, bm);
    beam.frustumCulled = !1;
    g.add(beam);
    lights.push({ g, beam, b });
  }
  // glow: brighter at night; emissive models follow
  let t = 0;
  ticks.push((dt) => {
    t += dt;
    const tod = Zw.getState().timeOfDay,
      k = tod === 'night' ? 2.2 : tod === 'dusk' ? 1.6 : 1.1;
    __PR.glowMat && __PR.glowMat.color.setScalar(k);
    for (const mt of R.__emis) 'emissiveIntensity' in mt && (mt.emissiveIntensity = k * 0.9);
    bm.opacity = tod === 'night' ? 0.085 : tod === 'dusk' ? 0.05 : 0;
    for (const L of lights) {
      L.g.rotation.y = Math.sin(t * 0.25 + L.b.phase) * 1.3 + L.b.phase;
      L.g.rotation.x = 0.32 + Math.sin(t * 0.4 + L.b.phase) * 0.08;
      L.beam.visible = bm.opacity > 0;
    }
  });
  return { tris: Math.round(tris), ms: Math.round(performance.now() - t0), doors, coils: R.__coils.length, signs: R.signs.length };
}
