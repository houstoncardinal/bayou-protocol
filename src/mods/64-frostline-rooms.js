/* ===== Bayou Protocol mod: Frostline's hidden caverns, furnished for Christmas ===== */
// The three caverns behind the breakable ice (layout and collision: 61-frostline.js; vaults, floors and
// portals: 62-frostline-detail.js). Each keeps a clear path straight through between its portals; the
// furniture stands against the walls and has collision boxes in the layout (`furniture`).
//   - Santa's Workshop: timber beams across a rock vault, a workbench with tools and a half-built toy train,
//     shelves of toys (teddy bears, soldiers, drums, balls), Santa's sleigh with a sack of presents, lanterns
//   - the Crystal Cavern: glowing crystal clusters, a frozen waterfall over a frozen pool, an ice-crystal
//     Christmas tree with a star, snowflakes hanging from the vault, drifting motes of light
//   - the Fireside Lodge: a timber-lined room with a stone fireplace (a real fire), stockings on the mantel,
//     candles, armchairs, a rug, a table with milk and cookies, a decorated tree
const __XR = {};
// painted or plain surfaces: plain colours, vertex-coloured (one draw call per material)
function __xrMats() {
  const own = (m) => __flOwn(m);
  return {
    wood: own(Object.assign(__flMat('brown_planks_05', 0.9, 2, 2, 3, '#ffffff'), { vertexColors: !0 })), // (indoors: no snow)
    paint: own(new ri({ color: '#ffffff', roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2, vertexColors: !0 })),
    gold: own(new Gw({ color: '#e2b94e', metalness: 1, roughness: 0.25 })),
    cloth: own(new Gw({ color: '#ffffff', roughness: 0.95, vertexColors: !0 })),
    stone: __flStoneMat(),
    dark: own(new Gw({ color: '#0d0a08', roughness: 1 })),
    candle: own(new Gw({ color: '#fff2dc', emissive: '#ffb04a', emissiveIntensity: 0.25, roughness: 0.6 })),
    flame: own(new Gw({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: 3.2 })),
  };
}
// a glowing material: colour per instance, a slow pulse per instance (crystals)
function __xrGlowMat(I, speed) {
  const u = { uT: { value: 0 } },
    m = __flOwn(new Gw({ color: '#ffffff', roughness: 0.08, metalness: 0.1, transparent: !0, opacity: 0.88, envMapIntensity: 2 }));
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vPh;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPh = float(gl_InstanceID);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPh; uniform float uT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance = vColor.rgb * ${I.toFixed(2)} * (0.72 + 0.28 * sin(uT * ${speed.toFixed(2)} + vPh * 1.7));`);
  };
  m.customProgramCacheKey = () => 'xr-glow-' + I + '-' + speed;
  m.__u = u;
  return m;
}
// a crystal: a hexagonal prism with a pointed tip, 1 m long along +y from the origin, radius 1
function __xrCrystalGeo() {
  if (__XR.crystal) return __XR.crystal;
  const B = __flMB(),
    shaft = new Rw(1, 1, 0.78, 6, 1),
    tip = new Oc(1, 0.22, 6, 1);
  B.add(shaft, __flM(0, 0.39, 0, 1, 1, 1));
  B.add(tip, __flM(0, 0.89, 0, 1, 1, 1));
  shaft.dispose();
  tip.dispose();
  return (__XR.crystal = B.build());
}
// a snowflake ornament, 1 m across, in the x-y plane: six arms with side branches
function __xrFlakeGeo() {
  if (__XR.flake) return __XR.flake;
  const B = __flMB(),
    box = __flUnit('box');
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3,
      c = Math.cos(a),
      s = Math.sin(a);
    B.add(box, __flM(c * 0.25, s * 0.25, 0, 0.5, 0.035, 0.02, 0, 0, a));
    for (const [r, l] of [[0.22, 0.13], [0.36, 0.09]])
      for (const side of [1, -1]) B.add(box, __flM(c * r + Math.cos(a + side * 0.9) * l * 0.5, s * r + Math.sin(a + side * 0.9) * l * 0.5, 0, l, 0.025, 0.02, 0, 0, a + side * 0.9));
  }
  return (__XR.flake = B.build());
}
// beams across a vault: a timber following the ceiling's curve, along z at x (or along x at z)
function __xrBeams(B, c, list, rnd) {
  for (const [x0, z0, x1, z1] of list) {
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const x = x0 + (x1 - x0) * t,
        z = z0 + (z1 - z0) * t;
      if (__flD(x, z) > 0.6) continue;
      pts.push([x, __flCeil(c, x, z) - 0.14, z]);
    }
    if (pts.length < 3) continue;
    const t = __xmTube(pts, 0.15, 4, 1);
    B.add(t, new _A(), 0.55 + rnd() * 0.2);
    t.dispose();
  }
}
function __flRooms(root, models, ticks, lights, bulbs, presents, wreaths) {
  const M = __xrMats(),
    L = __FL_L,
    box = __flUnit('box'),
    cyl = __flUnit('cyl'),
    sph = __flUnit('sph'),
    wood = __flMB(),
    paint = __flMB(),
    cloth = __flMB(),
    stone = __flMB(),
    gold = __flMB(),
    dark = __flMB(),
    candle = __flMB(),
    flame = __flMB(),
    hang = [];
  let seed = 97;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
    bx = (B, x, y, z, sx, sy, sz, c = 1, ry = 0, rx = 0, rz = 0) => B.add(box, __flM(x, y, z, sx, sy, sz, ry, rx, rz), c),
    cy = (B, x, y, z, r, h, c = 1, ry = 0, rx = 0, rz = 0) => B.add(cyl, __flM(x, y, z, r, h, r, ry, rx, rz), c),
    sp = (B, x, y, z, r, c = 1, sy = 1) => B.add(sph, __flM(x, y, z, r, r * sy, r), c),
    RED = [0.5, 0.04, 0.04],
    GREEN = [0.05, 0.25, 0.1],
    CREAM = [0.9, 0.85, 0.75],
    BROWN = [0.35, 0.2, 0.1],
    WHITE = [0.95, 0.95, 0.95],
    BLUE = [0.08, 0.15, 0.55],
    SKIN = [0.95, 0.75, 0.6];
  // ================================================================ Santa's Workshop
  {
    const c = L.caves.workshop;
    // timber beams across the vault, and lights strung between them
    __xrBeams(wood, c, [[80.5, 78, 80.5, 92], [84, 78, 84, 92], [87.5, 78, 87.5, 92], [91, 78, 91, 92]], rnd);
    for (const [xa, xb] of [[80.5, 84], [84, 87.5], [87.5, 91]]) for (const zz of [82.6, 87]) lights.push([[xa, __flCeil(c, xa, zz) - 0.3, zz], [xb, __flCeil(c, xb, zz) - 0.3, zz], 0.35, 'warm', 0.26]);
    hang.push([84, __flCeil(c, 84, 84.6), 84.6], [88.2, __flCeil(c, 88.2, 84.6), 84.6]);
    // a red rug with a gold border down the middle
    cloth.add(cyl, __flM(86, 0.03, 84.6, 2.5, 0.02, 1.35), [0.75, 0.55, 0.15]);
    cloth.add(cyl, __flM(86, 0.042, 84.6, 2.3, 0.02, 1.2), RED);
    // the workbench: a thick top, legs, a shelf under it, a vise, tools, a half-built toy train, paint pots
    {
      const x0 = 82.4,
        x1 = 85.6,
        z0 = 80.5,
        z1 = 81.5,
        cx = (x0 + x1) / 2,
        cz = (z0 + z1) / 2;
      bx(wood, cx, 0.9, cz, x1 - x0, 0.09, z1 - z0, 0.95);
      for (const [x, z] of [[x0 + 0.08, z0 + 0.08], [x1 - 0.08, z0 + 0.08], [x0 + 0.08, z1 - 0.08], [x1 - 0.08, z1 - 0.08]]) bx(wood, x, 0.43, z, 0.1, 0.86, 0.1, 0.7);
      bx(wood, cx, 0.22, cz, x1 - x0 - 0.1, 0.05, z1 - z0 - 0.1, 0.8);
      bx(dark, x0 + 0.3, 1.0, z1 - 0.15, 0.22, 0.12, 0.14); // vise
      cy(dark, x0 + 0.3, 1.0, z1 + 0.02, 0.012, 0.3, 1, 0, Math.PI / 2);
      // hammer, saw, planks
      cy(wood, cx - 0.4, 0.97, cz + 0.1, 0.018, 0.32, 0.6, 0.6, 0, Math.PI / 2);
      bx(dark, cx - 0.4 - Math.cos(0.6) * 0.16, 0.97, cz + 0.1 + Math.sin(0.6) * 0.16, 0.05, 0.04, 0.12, 1, 0.6);
      bx(dark, cx + 0.9, 0.955, cz - 0.15, 0.5, 0.01, 0.13, 1, 0.3);
      for (let k = 0; k < 3; k++) bx(wood, cx + 0.2 + k * 0.03, 0.96 + k * 0.03, cz - 0.25, 0.7, 0.03, 0.09, 0.9 + k * 0.05, 0.1 * k);
      // the toy train: engine (cab, boiler, chimney, wheels) and a wagon
      const tx = cx - 1.1,
        tz = cz - 0.1;
      bx(paint, tx, 1.06, tz, 0.16, 0.18, 0.14, RED);
      cy(paint, tx + 0.17, 1.03, tz, 0.06, 0.2, GREEN, 0, 0, Math.PI / 2);
      cy(gold, tx + 0.22, 1.13, tz, 0.02, 0.07);
      bx(paint, tx + 0.45, 1.01, tz, 0.22, 0.08, 0.14, BLUE);
      for (const x of [tx - 0.04, tx + 0.12, tx + 0.22, tx + 0.38, tx + 0.52]) for (const s of [-1, 1]) cy(dark, x, 0.98, tz + s * 0.08, 0.035, 0.02, 1, 0, Math.PI / 2);
      // paint pots and brushes
      for (const [dx, col] of [[0.55, RED], [0.68, GREEN], [0.81, [0.85, 0.65, 0.1]]]) {
        cy(paint, cx + dx, 1.0, cz + 0.28, 0.05, 0.12, [0.7, 0.7, 0.7]);
        cy(paint, cx + dx, 1.061, cz + 0.28, 0.045, 0.005, col);
      }
    }
    // the toy shelves: a frame of four shelves against the wall, full of toys
    {
      const x0 = 87,
        x1 = 90.2,
        z0 = 80.1,
        z1 = 80.7,
        cx = (x0 + x1) / 2,
        cz = (z0 + z1) / 2;
      for (const x of [x0 + 0.04, x1 - 0.04]) bx(wood, x, 1.05, cz, 0.06, 2.1, z1 - z0, 0.8);
      bx(wood, cx, 1.05, z0 + 0.02, x1 - x0, 2.1, 0.03, 0.6);
      const shelves = [0.08, 0.6, 1.12, 1.64, 2.08];
      for (const y of shelves) bx(wood, cx, y, cz, x1 - x0 - 0.08, 0.04, z1 - z0, 0.9);
      // toys on each shelf, front-facing (+z)
      for (let si = 0; si < 4; si++) {
        const y = shelves[si] + 0.02;
        for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.38) {
          const kind = (si * 3 + Math.round(x * 2)) % 5,
            z = cz + 0.06;
          if (kind === 0) {
            // teddy bear: body, head, ears, snout, a red bow
            const b = [0.42, 0.26, 0.12];
            sp(cloth, x, y + 0.13, z, 0.11, b, 1.1);
            sp(cloth, x, y + 0.3, z + 0.01, 0.085, b);
            for (const s of [-1, 1]) sp(cloth, x + s * 0.07, y + 0.37, z, 0.03, b);
            sp(cloth, x, y + 0.29, z + 0.08, 0.035, [0.7, 0.55, 0.38]);
            sp(cloth, x, y + 0.215, z + 0.07, 0.025, RED);
          } else if (kind === 1) {
            // toy soldier: red coat, blue trousers, a face, a tall black hat
            cy(paint, x, y + 0.08, z, 0.045, 0.16, BLUE);
            cy(paint, x, y + 0.2, z, 0.05, 0.1, RED);
            sp(paint, x, y + 0.29, z, 0.04, SKIN);
            cy(paint, x, y + 0.37, z, 0.042, 0.1, [0.03, 0.03, 0.03]);
            cy(gold, x, y + 0.2, z + 0.051, 0.005, 0.08);
          } else if (kind === 2) {
            // drum: red shell, white skins, gold hoops, sticks
            cy(paint, x, y + 0.09, z, 0.1, 0.16, RED);
            cy(paint, x, y + 0.172, z, 0.098, 0.006, WHITE);
            cy(gold, x, y + 0.165, z, 0.102, 0.012);
            cy(gold, x, y + 0.016, z, 0.102, 0.012);
            for (const s of [-1, 1]) cy(wood, x + s * 0.04, y + 0.19, z + 0.03, 0.007, 0.2, 0.9, 0, 0, Math.PI / 2 + s * 0.3);
          } else if (kind === 3) {
            // a ball, striped
            sp(paint, x, y + 0.1, z, 0.1, [[0.8, 0.1, 0.1], [0.1, 0.4, 0.8], [0.9, 0.7, 0.1]][Math.round(x) % 3]);
            cy(paint, x, y + 0.1, z, 0.101, 0.035, WHITE);
          } else presents.push([x, y, z, 0.2, 0.16, 0.18, rnd() * 0.6, __XM_PAPER[Math.floor(rnd() * 8)], __XM_RIBBON[Math.floor(rnd() * 5)], Math.floor(rnd() * 3)]);
        }
      }
    }
    // Santa's sleigh: a red body on gold runners that curl up at the front, a velvet seat, a sack of presents
    {
      const x0 = 83.2,
        x1 = 87.6,
        z0 = 86.8,
        z1 = 88.6,
        cz = (z0 + z1) / 2,
        L0 = x0 + 0.3,
        L1 = x1 - 0.7;
      // runners
      for (const s of [-1, 1]) {
        const zr = cz + s * 0.72,
          pts = [];
        for (let x = L0 - 0.1; x <= L1; x += 0.1) pts.push([x, 0.06, zr]);
        for (let a = 0; a <= Math.PI * 1.4; a += 0.15) pts.push([L1 + Math.sin(a) * 0.32, 0.38 - Math.cos(a) * 0.32, zr]);
        const t = __xmTube(pts, 0.035, 8, 1);
        gold.add(t, new _A());
        t.dispose();
        for (const x of [L0 + 0.3, (L0 + L1) / 2, L1 - 0.3]) cy(gold, x, 0.25, zr, 0.025, 0.38);
      }
      // the body: floor, sides with a sweep at the front, backrest
      bx(paint, (L0 + L1) / 2 + 0.1, 0.5, cz, L1 - L0 + 0.4, 0.14, 1.45, RED);
      for (const s of [-1, 1]) {
        bx(paint, (L0 + L1) / 2 + 0.1, 0.78, cz + s * 0.7, L1 - L0 + 0.4, 0.45, 0.07, RED);
        bx(gold, (L0 + L1) / 2 + 0.1, 1.02, cz + s * 0.7, L1 - L0 + 0.42, 0.04, 0.09);
        // the front scroll
        const pts = [];
        for (let a = 0; a <= Math.PI * 1.6; a += 0.12) pts.push([L1 + 0.3 + Math.sin(a) * 0.25 * (1 - a / 7), 0.85 + Math.cos(a) * 0.25 * (1 - a / 7), cz + s * 0.7]);
        const t = __xmTube(pts, 0.05, 8, 1);
        gold.add(t, new _A());
        t.dispose();
      }
      bx(paint, L0 - 0.05, 0.95, cz, 0.16, 0.95, 1.45, RED);
      bx(gold, L0 - 0.05, 1.43, cz, 0.2, 0.05, 1.5);
      bx(cloth, L0 + 0.45, 0.68, cz, 0.7, 0.18, 1.3, [0.45, 0.03, 0.08]);
      bx(cloth, L0 + 0.1, 0.95, cz, 0.12, 0.55, 1.3, [0.45, 0.03, 0.08]);
      // Santa's sack (lumpy, tied with gold rope), presents spilling from it
      const sack = new bi(0.5, 20, 14),
        q = sack.attributes.position;
      for (let i = 0; i < q.count; i++) {
        const x = q.getX(i),
          y = q.getY(i),
          z = q.getZ(i),
          o = 1 + 0.12 * (__flN3(x * 6, y * 6, z * 6) - 0.5) - (y > 0.3 ? (y - 0.3) * 0.9 : 0);
        q.setXYZ(i, x * o, y * 1.2, z * o);
      }
      sack.computeVertexNormals();
      cloth.add(sack, __flM((L0 + L1) / 2 + 0.4, 1.12, cz, 1, 1, 1), [0.42, 0.06, 0.05]);
      sack.dispose();
      gold.add(new oI(0.1, 0.02, 6, 14), __flM((L0 + L1) / 2 + 0.4, 1.6, cz, 1, 1, 1, 0, Math.PI / 2));
      __xmPile(presents, (L0 + L1) / 2 + 0.4, cz, 4, 0.35, 0.55, rnd, 0.57);
      __xmPile(presents, x0 + 0.1, z1 + 0.7, 3, 0, 0.35, rnd);
    }
    __xmPile(presents, 92.2, 82.3, 5, 0, 0.6, rnd);
  }
  // ================================================================ the Crystal Cavern
  {
    const c = L.caves.cavern,
      crystals = [],
      cols = ['#46d8ff', '#5b86ff', '#a874ff', '#7af0ff'],
      cluster = (x, y, z, n, size, up = 1) => {
        for (let k = 0; k < n; k++) {
          const a = rnd() * 6.28,
            tilt = 0.15 + rnd() * 0.65,
            len = size * (0.45 + rnd() * 0.75),
            r = len * (0.11 + rnd() * 0.05),
            Mx = new _A().compose(new U(x + Math.cos(a) * size * 0.15, y, z + Math.sin(a) * size * 0.15), new Kw().setFromEuler(new TB(up > 0 ? Math.sin(a) * tilt : Math.PI + Math.sin(a) * tilt, a, up > 0 ? -Math.cos(a) * tilt : Math.cos(a) * tilt)), new U(r, len, r));
          crystals.push([Mx, cols[Math.floor(rnd() * cols.length)]]);
        }
      };
    // the four big clusters (with collision), smaller ones along the walls, some hanging from the vault
    for (const [x0, z0, x1, z1] of L.furniture.slice(3, 7)) cluster((x0 + x1) / 2, -0.05, (z0 + z1) / 2, 11, 1.7);
    for (let k = 0; k < 40; k++) {
      const a = rnd() * 6.28,
        x = 31 + Math.cos(a) * 5.4,
        z = 67 + Math.sin(a) * 4.6;
      if (Math.abs(z - 66.8) < 2.2 && (x < 27 || x > 35)) continue; // keep the ways in and out clear
      __flD(x, z) > -0.2 && __flD(x, z) < 0.4 && cluster(x, -0.05, z, 3, 0.5 + rnd() * 0.4);
    }
    for (let k = 0; k < 18; k++) {
      const x = 27 + rnd() * 8,
        z = 63 + rnd() * 8;
      __flD(x, z) < -0.5 && cluster(x, __flCeil(c, x, z) + 0.1, z, 3, 0.4 + rnd() * 0.4, -1);
    }
    // the ice tree: rings of crystals pointing out and down, getting smaller to the top, a star on top
    {
      const tx = 33.5,
        tz = 70.6;
      for (let ring = 0; ring < 9; ring++) {
        const y = 0.25 + ring * 0.3,
          rad = 1.05 * (1 - ring / 9.5),
          n = Math.max(4, Math.round(14 * (1 - ring / 10)));
        for (let k = 0; k < n; k++) {
          const a = (k / n) * 6.28 + ring * 0.4,
            len = 0.25 + rad * 0.55;
          crystals.push([new _A().compose(new U(tx + Math.cos(a) * rad * 0.35, y, tz + Math.sin(a) * rad * 0.35), new Kw().setFromEuler(new TB(Math.sin(a) * 1.9, a, -Math.cos(a) * 1.9)), new U(len * 0.12, len, len * 0.12)), ring % 3 ? '#7af0ff' : '#ffffff']);
        }
        for (let k = 0; k < n; k += 2) {
          const a = (k / n) * 6.28 + ring * 0.4 + 0.2;
          bulbs.push([tx + Math.cos(a) * rad * 0.8, y - 0.1, tz + Math.sin(a) * rad * 0.8, '#e8f8ff', 0.7]);
        }
      }
      crystals.push([new _A().compose(new U(tx, 0, tz), new Kw(), new U(0.09, 2.9, 0.09)), '#ffffff']);
      __XR.iceStar = [tx, 3.05, tz];
      __xmPile(presents, tx, tz, 5, 0.9, 1.2, rnd);
    }
    const gm = __xrGlowMat(1.6, 0.8);
    __xmInst(root, __xrCrystalGeo(), gm, crystals, 'frost_xr_crystals');
    ticks.push((dt) => (gm.__u.uT.value += Math.min(dt, 0.1)));
    // the frozen waterfall: a rippled sheet of ice down the north wall, spreading into a frozen pool
    {
      const cx = 31,
        P = [],
        I = [],
        nu = 16,
        nv = 22;
      // where the wall is, along x at the top and bottom
      const wallZ = (x, y) => {
        let z = 66;
        while (z > 55 && __flD(x, z) < 0) z -= 0.05;
        return z + __flRockDepth(x, y, z, 2, 'ice');
      };
      for (let j = 0; j <= nv; j++)
        for (let i = 0; i <= nu; i++) {
          const v = j / nv,
            y = (1 - v) * (__flCeil(c, cx, 62.6) + 0.2),
            w = 1.1 + v * v * 0.9,
            x = cx + (i / nu - 0.5) * 2 * w,
            out = 0.05 + 0.25 * Math.pow(v, 3) + 0.06 * Math.sin(x * 9 + y * 2) * (1 - v * 0.5) + 0.05 * __flN3(x * 3, y * 3, 1);
          P.push(x, y, wallZ(x, y) + out + (v > 0.85 ? (v - 0.85) * 2.4 : 0));
        }
      for (let j = 0; j < nv; j++)
        for (let i = 0; i < nu; i++) {
          const a = j * (nu + 1) + i,
            b = a + 1,
            cc = a + nu + 1,
            d = cc + 1;
          I.push(a, cc, b, b, cc, d);
        }
      const g = new uw();
      g.setAttribute('position', new gi(new Float32Array(P), 3));
      g.setIndex(I);
      g.computeVertexNormals();
      __flMesh(root, g, __flOwn(__flIce(0.82)), 'frost_xr_waterfall', !1);
      // the pool
      const pool = new Rw(1.5, 1.6, 0.05, 32, 1);
      __flMesh(root, (pool.applyMatrix4(new _A().compose(new U(cx, 0.03, 63.6), new Kw(), new U(1, 1, 0.7))), pool), __FL.iceFloor || __flGlacier(), 'frost_xr_pool', !1);
    }
    // snowflakes hanging from the vault on threads
    {
      const flakes = [],
        threads = [];
      for (let k = 0; k < 14; k++) {
        const x = 26.5 + rnd() * 9,
          z = 63.5 + rnd() * 7;
        if (__flD(x, z) > -0.8) continue;
        const top = __flCeil(c, x, z),
          y = top - 0.6 - rnd() * 1.0,
          s = 0.28 + rnd() * 0.2;
        flakes.push([__flM(x, y, z, s, s, s, rnd() * 6.28), null]);
        threads.push([__flM(x, (y + top) / 2, z, 0.004, top - y, 0.004), null]);
      }
      __xmInst(root, __xrFlakeGeo(), __flOwn(new Gw({ color: '#f4fbff', emissive: '#bfe8ff', emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.2 })), flakes, 'frost_xr_flakes');
      __xmInst(root, __flUnit('cyl6'), M.dark, threads, 'frost_xr_threads');
    }
    // motes of light drifting up through the cavern
    const t = __xmRising(root, [31, 0.3, 67], 60, { color: '#9fe8ff', size: 0.06, rise: 3.2, spread: 9, life: 9, add: !0, grow: 0 });
    ticks.push((dt) => (t.value += Math.min(dt, 0.1)));
  }
  // ================================================================ the Fireside Lodge
  {
    const c = L.caves.lodge;
    // beams across the timber vault, lights between them, two lanterns
    __xrBeams(wood, c, [[118.6, 28, 128, 28], [118.6, 32, 128, 32], [118.6, 36, 128, 36]], rnd);
    for (const [za, zb] of [[28, 32], [32, 36]]) for (const x of [121.4, 125.2]) lights.push([[x, __flCeil(c, x, za) - 0.3, za], [x, __flCeil(c, x, zb) - 0.3, zb], 0.3, 'warm', 0.24]);
    hang.push([122.2, __flCeil(c, 122.2, 30), 30], [122.2, __flCeil(c, 122.2, 34), 34]);
    // the fireplace: stone piers and lintel round a dark firebox, a hearth, a timber mantel, the chimney breast
    // up to the vault; a fire of logs inside
    {
      const x0 = 125.9,
        x1 = 127.3,
        z0 = 30.7,
        z1 = 33.3,
        cz = (z0 + z1) / 2,
        top = __flCeil(c, 126.6, cz) + 0.3;
      bx(stone, (x0 + x1) / 2, 0.45, z0 + 0.4, x1 - x0, 0.9, 0.8, 0.95);
      bx(stone, (x0 + x1) / 2, 0.45, z1 - 0.4, x1 - x0, 0.9, 0.8, 0.95);
      bx(stone, (x0 + x1) / 2, 1.05, cz, x1 - x0, 0.3, z1 - z0, 0.9);
      bx(stone, (x0 + x1) / 2 + 0.25, (1.2 + top) / 2, cz, x1 - x0 - 0.5, top - 1.2, z1 - z0 - 0.3, 0.85);
      bx(dark, x1 - 0.35, 0.45, cz, 0.7, 0.9, 1.0);
      bx(stone, x0 - 0.25, 0.06, cz, 0.6, 0.12, z1 - z0 + 0.3, 0.75);
      bx(wood, x0 - 0.12, 1.26, cz, 0.36, 0.1, z1 - z0 + 0.4, 0.7);
      for (let k = 0; k < 3; k++) cy(wood, x0 + 0.45, 0.12 + (k % 2) * 0.08, cz - 0.25 + k * 0.25, 0.06, 0.6, 0.45, 0, Math.PI / 2, 0.3 * (k - 1));
      __xmFire(root, x0 + 0.42, 0.1, cz, ticks, 0.55);
      // stockings hanging from the mantel, a garland with lights along it, candles, a wreath above
      for (let k = 0; k < 3; k++) {
        const z = cz - 0.75 + k * 0.75,
          col = [RED, GREEN, RED][k];
        bx(cloth, x0 - 0.3, 0.98, z, 0.08, 0.36, 0.17, col);
        bx(cloth, x0 - 0.3, 0.83, z + 0.08, 0.08, 0.13, 0.3, col);
        bx(cloth, x0 - 0.3, 1.18, z, 0.09, 0.1, 0.19, WHITE);
      }
      const g = [];
      for (let z = z0 - 0.15; z <= z1 + 0.15; z += 0.08) g.push([x0 - 0.3, 1.3 - 0.12 * Math.abs(Math.sin(((z - z0) / (z1 - z0)) * Math.PI * 2)), z]);
      __XR.mantel = g;
      for (const z of [cz - 0.5, cz + 0.5]) {
        cy(candle, x0 - 0.1, 1.42, z, 0.03, 0.22);
        sp(flame, x0 - 0.1, 1.56, z, 0.018, 1, 1.8);
      }
      wreaths.push([x0 - 0.02, 2.0, cz, -Math.PI / 2, 0.5]);
    }
    // two armchairs facing the fire, a rug between, a table with milk and cookies, a lantern
    for (const [x0, z0, x1, z1] of [[123.6, 28.9, 124.6, 29.9], [123.6, 34.1, 124.6, 35.1]]) {
      // an armchair facing the fire: a skirted base, a plump seat cushion, a high back with a rolled top,
      // rolled arms, turned feet
      const cx = (x0 + x1) / 2,
        cz = (z0 + z1) / 2,
        fab = [0.42, 0.05, 0.06],
        fab2 = [0.5, 0.08, 0.08];
      bx(cloth, cx, 0.25, cz, 0.9, 0.3, 0.9, fab);
      sp(cloth, cx + 0.06, 0.45, cz, 0.36, fab2, 0.3);
      bx(cloth, x0 + 0.12, 0.72, cz, 0.2, 0.75, 0.84, fab);
      cy(cloth, x0 + 0.12, 1.1, cz, 0.12, 0.84, fab2, 0, Math.PI / 2);
      for (const s2 of [-1, 1]) {
        bx(cloth, cx, 0.5, cz + s2 * 0.4, 0.86, 0.32, 0.14, fab);
        cy(cloth, cx, 0.68, cz + s2 * 0.4, 0.1, 0.88, fab2, 0, 0, Math.PI / 2);
      }
      for (const [dx, dz] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) cy(wood, cx + dx, 0.05, cz + dz, 0.04, 0.1, 0.45);
      // a tartan throw over one arm
      bx(cloth, cx + 0.1, 0.72, cz + 0.4, 0.5, 0.03, 0.2, [0.1, 0.3, 0.12]);
    }
    cloth.add(cyl, __flM(124.6, 0.03, 32, 1.3, 0.02, 1.3), [0.75, 0.6, 0.2]);
    cloth.add(cyl, __flM(124.6, 0.04, 32, 1.15, 0.02, 1.15), GREEN);
    cloth.add(cyl, __flM(124.6, 0.05, 32, 0.7, 0.02, 0.7), RED);
    {
      const tx = 123.3,
        tz = 27.6;
      cy(wood, tx, 0.77, tz, 0.55, 0.05, 0.95);
      cy(wood, tx, 0.38, tz, 0.07, 0.75, 0.7);
      cy(wood, tx, 0.03, tz, 0.3, 0.05, 0.7);
      cy(paint, tx - 0.15, 0.805, tz + 0.05, 0.13, 0.015, WHITE);
      for (let k = 0; k < 5; k++) cy(paint, tx - 0.15 + Math.cos(k * 1.3) * 0.06, 0.82 + (k > 2 ? 0.012 : 0), tz + 0.05 + Math.sin(k * 1.3) * 0.06, 0.035, 0.01, [0.75, 0.5, 0.25]);
      cy(paint, tx + 0.15, 0.87, tz - 0.05, 0.04, 0.14, WHITE);
      __XR.lanterns = [[tx + 0.2, 0.795, tz + 0.15, 1.1, 0.4]];
    }
  }
  // ================================================================ shared: build it all
  const out = [
    [wood, M.wood, 'frost_xr_wood', !0],
    [paint, M.paint, 'frost_xr_paint', !0],
    [cloth, M.cloth, 'frost_xr_cloth', !0],
    [stone, M.stone, 'frost_xr_stone', !0],
    [gold, M.gold, 'frost_xr_gold', !1],
    [dark, M.dark, 'frost_xr_dark', !1],
    [candle, M.candle, 'frost_xr_candles', !1],
    [flame, M.flame, 'frost_xr_flames', !1],
  ];
  for (const [B, m, name, cast] of out) B.count && __flMesh(root, B.build(), m, name, cast);
  // the mantel garland, and a star on the ice tree
  if (__XR.mantel) {
    const t = __xmTube(__XR.mantel, (_, d) => 0.07 + 0.025 * Math.sin(d * 31), 6, 0.5);
    __flMesh(root, t, __flOwn(new Gw({ color: '#1b4a22', roughness: 0.9 })), 'frost_xr_mantelgarland', !1);
    for (let i = 1; i < __XR.mantel.length; i += 2) bulbs.push([...__XR.mantel[i].map((v, k) => (k === 1 ? v - 0.06 : v)), __XM_MULTI[i % 6], 0.7]);
  }
  if (__XR.iceStar) {
    const [x, y, z] = __XR.iceStar;
    __xmInst(root, __XM.star || (__XM.star = __xmStarGeo(1, 0.42, 0.2)), __flOwn(new Gw({ color: '#eaf8ff', metalness: 0.5, roughness: 0.2, emissive: '#bfefff', emissiveIntensity: 2.4 })), [[__flM(x, y, z, 0.28, 0.28, 0.28, 0.4), null]], 'frost_xr_icestar');
  }
  // lanterns hanging from the vaults, and one on the lodge's table
  __xmHang(root, models, hang);
  if (__XR.lanterns && models.wooden_lantern_01) {
    const pp = __flParts(models.wooden_lantern_01);
    __xmGlow(pp.parts);
    __flInstance(root, pp.parts, __XR.lanterns, !1);
  }
  __XR.lanterns = void 0;
}
