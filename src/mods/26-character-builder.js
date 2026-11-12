/* ===== Bayou Protocol mod: operator character builder ===== */
// Replaces the armoured "Vanguard" body (model-32 + bolted-on visor and plates) with ten hand-built
// Counter-Terrorist and Terrorist operators defined in 25-operators.js.
//
// How it works: the core still loads model-32 for its Mixamo skeleton and Idle/Walk/Run clips. XAA (the
// core's "dress the realistic model" step) is replaced: it removes the Vanguard meshes and builds the
// operator's body, clothes, gear and head as skinned meshes bound to that same skeleton. So animation,
// weapon-holding IK, crouch IK, wound decals and the ragdoll all keep working unchanged.
//
// Geometry is modelled in a canonical frame (metres, Y up, facing -Z, T-pose) taken from the skeleton's
// bind pose, skinned with distance-based weights restricted per part, merged per material and cached per
// operator. Fingers are separate segments on the hand bones so they can curl around the weapon.
const __CHB = { geo: new Map(), bones: null };
// ---------- small math ----------
const __v = (x = 0, y = 0, z = 0) => new U(x, y, z);
const __lerp = (a, b, t) => a + (b - a) * t;
const __smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function __segDist(p, a, b) {
  const abx = b.x - a.x,
    aby = b.y - a.y,
    abz = b.z - a.z,
    l2 = abx * abx + aby * aby + abz * abz || 1e-9;
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = p.x - (a.x + abx * t),
    dy = p.y - (a.y + aby * t),
    dz = p.z - (a.z + abz * t);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
// ---------- skeleton in the canonical frame ----------
const __bn = (n) => n.replace(/[^a-z0-9]/gi, '').toLowerCase().replace(/^mixamorig/, '');
function __cbSkeleton(root, vm) {
  root.updateMatrixWorld(!0);
  const sk = vm.skeleton,
    bindInv = new _A().copy(vm.bindMatrix).invert(),
    idx = {},
    pos = {},
    rot = {},
    child = {};
  // Skin space: inverse-bind matrices of this export are not in the mesh node's local space (the 0.01
  // Character scale never enters skinning), so build the canonical frame from the skeleton itself:
  // orientation from the Character node, scale from hips->head (0.508 m in the reference rig), hips pinned.
  const gp = (i) => new U().setFromMatrixPosition(new _A().copy(bindInv).multiply(new _A().copy(sk.boneInverses[i]).invert()));
  sk.bones.forEach((b, i) => (idx[__bn(b.name)] = i));
  const Mp = new _A().copy(root.matrixWorld).invert().multiply(vm.parent.matrixWorld),
    rq = new Kw(),
    tmpP = new U(),
    tmpS = new U();
  Mp.decompose(tmpP, rq, tmpS);
  const gH = gp(idx.hips),
    gHd = gp(idx.head),
    sc = 0.508 / (gHd.distanceTo(gH) || 1),
    hipC = gH.clone().applyQuaternion(rq).multiplyScalar(sc),
    Mrel = new _A().compose(__v(-0.002 - hipC.x, 1.061 - hipC.y, -0.011 - hipC.z), rq, __v(sc, sc, sc));
  sk.bones.forEach((b, i) => {
    const n = __bn(b.name);
    idx[n] = i;
    const m = new _A().copy(Mrel).multiply(bindInv).multiply(new _A().copy(sk.boneInverses[i]).invert());
    const p = new U(),
      q = new Kw(),
      s = new U();
    m.decompose(p, q, s);
    pos[n] = p;
    rot[n] = q;
  });
  // segment end for each bone: preferred child, or an extension for leaf bones
  const pref = ['spine', 'neck', 'head', 'middle1', 'arm', 'forearm', 'hand', 'leg', 'foot', 'toebase'];
  sk.bones.forEach((b) => {
    const n = __bn(b.name),
      kids = b.children.filter((c) => c.isBone).map((c) => __bn(c.name));
    let c = kids.find((k) => /spine|neck/.test(k) && !/shoulder/.test(k)) || kids.find((k) => /middle1$/.test(k)) || null;
    if (!c && kids.length === 1) c = kids[0];
    if (!c && kids.length) c = kids.find((k) => pref.some((p) => k.endsWith(p))) || kids[0];
    child[n] = c;
  });
  const end = {};
  for (const n of Object.keys(pos)) {
    if (child[n] && pos[child[n]]) end[n] = pos[child[n]].clone();
    else {
      const par = Object.keys(child).find((k) => child[k] === n);
      const dir = par ? pos[n].clone().sub(pos[par]) : __v(0, 0.1, 0);
      const len = n === 'head' ? 0.2 : Math.max(0.015, dir.length() * 0.7);
      end[n] = n === 'head' ? pos[n].clone().add(__v(0, 0.2, -0.01)) : pos[n].clone().add(dir.normalize().multiplyScalar(len));
    }
  }
  const G = new _A().copy(Mrel).invert(); // canonical -> geometry space
  const unit = pos.head && pos.hips ? pos.head.distanceTo(pos.hips) : 0.51; // canonical metres, ~0.51
  const geoUnit = new U().setFromMatrixScale(G).x; // geometry units per canonical metre
  return { idx, pos, rot, end, G, unit, geoUnit };
}
// ---------- geometry helpers (canonical frame) ----------
function __toIndexed(g) {
  if (!g.index) {
    const n = g.attributes.position.count,
      a = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) a[i] = i;
    g.setIndex(new gi(a, 1));
  }
  g.attributes.normal || g.computeVertexNormals();
  return g;
}
// tube through rings: [{c:Vector3, u:Vector3, v:Vector3, ru, rv}] ; shape(theta, ringIndex) -> radius scale
function __loft(rings, seg = 24, shape = null, caps = [!1, !1]) {
  const pos = [],
    uv = [],
    ind = [],
    R = rings.length;
  for (let r = 0; r < R; r++) {
    const g = rings[r];
    for (let s = 0; s <= seg; s++) {
      const t = (s / seg) * Math.PI * 2,
        k = shape ? shape(t, r, g) : 1,
        c = Math.cos(t) * g.ru * k,
        d = Math.sin(t) * g.rv * k;
      pos.push(g.c.x + g.u.x * c + g.v.x * d, g.c.y + g.u.y * c + g.v.y * d, g.c.z + g.u.z * c + g.v.z * d);
      uv.push(s / seg, r / (R - 1));
    }
  }
  const W = seg + 1;
  for (let r = 0; r < R - 1; r++)
    for (let s = 0; s < seg; s++) {
      const a = r * W + s,
        b = a + W;
      ind.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const capAt = (r, flip) => {
    const g = rings[r],
      ci = pos.length / 3;
    pos.push(g.c.x, g.c.y, g.c.z);
    uv.push(0.5, 0.5);
    for (let s = 0; s < seg; s++) {
      const a = r * W + s;
      flip ? ind.push(ci, a + 1, a) : ind.push(ci, a, a + 1);
    }
  };
  caps[0] && capAt(0, !0);
  caps[1] && capAt(R - 1, !1);
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array(pos), 3));
  g.setAttribute('uv', new gi(new Float32Array(uv), 2));
  g.setIndex(ind);
  g.computeVertexNormals();
  return g;
}
// rings along a polyline of centres with radii; axes from a reference "up"
function __limb(points, radii, ref, seg = 20, shape = null, caps = [!1, !1]) {
  const rings = points.map((c, i) => {
    const a = points[Math.min(points.length - 1, i + 1)],
      b = points[Math.max(0, i - 1)],
      t = a.clone().sub(b).normalize(),
      u = ref.clone().sub(t.clone().multiplyScalar(ref.dot(t))).normalize(),
      v = new U().crossVectors(t, u).normalize(),
      r = radii[i];
    return { c, u, v, ru: Array.isArray(r) ? r[0] : r, rv: Array.isArray(r) ? r[1] : r };
  });
  return __loft(rings, seg, shape, caps);
}
// horizontal rings around the body (torso, waist): rows of [y, halfWidth, halfDepth, zCentre]
function __ring(rows, seg = 32, shape = null, caps = [!1, !1]) {
  return __loft(
    rows.map(([y, w, d, z]) => ({ c: __v(0, y, z), u: __v(1, 0, 0), v: __v(0, 0, 1), ru: w, rv: d })),
    seg,
    shape,
    caps,
  );
}
function __place(g, pos, quat = null, scale = null) {
  const m = new _A().compose(pos, quat || new Kw(), scale || __v(1, 1, 1));
  g.applyMatrix4(m);
  return g;
}
const __rbox = (sx, sy, sz, r = 0.006, seg = 2) => __toIndexed(new t9(sx, sy, sz, seg, Math.min(r, sx / 2, sy / 2, sz / 2)));
const __qe = (x = 0, y = 0, z = 0) => new Kw().setFromEuler(new TB(x, y, z, 'YXZ'));
// ---------- head ----------
// unit-sphere direction -> head surface point (canonical), with jaw, chin, nose, brow, cheeks, sockets
function __headFn(H, sex) {
  const f = sex === 'f';
  const sx = f ? 0.074 : 0.079,
    sy = f ? 0.112 : 0.117,
    sz = f ? 0.098 : 0.102;
  const bump = (d, cx, cy, cz, w, amt) => {
    const dd = (d.x - cx) ** 2 + (d.y - cy) ** 2 + (d.z - cz) ** 2;
    return amt * Math.exp(-dd / (w * w));
  };
  return (d, off = 0) => {
    let x = d.x * sx,
      y = d.y * sy,
      z = d.z * sz;
    // jaw narrows below the cheeks, chin comes forward
    const jaw = __smooth(-0.15, -0.95, d.y);
    x *= 1 - (f ? 0.36 : 0.28) * jaw;
    z *= 1 - 0.18 * jaw * (d.z > 0 ? 1 : 0);
    d.z < 0 && (z -= 0.012 * jaw * __smooth(0.2, -0.9, d.z));
    // back of the skull rounder and higher
    d.z > 0 && d.y > -0.2 && ((z *= 1.06), (y *= 1.02));
    // flatter face plane
    d.z < -0.55 && (z *= 0.94);
    // features (all relative to the face front)
    let out = 0;
    out += bump(d, 0, -0.08, -1, 0.17, 0.032) * (Math.abs(d.x) < 0.22 ? 1 : 0.6); // nose
    out += bump(d, 0, -0.26, -0.98, 0.13, 0.006); // nose tip / upper lip
    out += bump(d, 0, 0.27, -0.93, 0.3, 0.007); // brow ridge
    out -= bump(d, 0.34, 0.12, -0.92, 0.15, 0.012) + bump(d, -0.34, 0.12, -0.92, 0.15, 0.012); // eye sockets
    out += bump(d, 0.62, -0.05, -0.74, 0.22, 0.006) + bump(d, -0.62, -0.05, -0.74, 0.22, 0.006); // cheekbones
    out -= bump(d, 0, -0.47, -0.88, 0.12, 0.004); // mouth line
    out += bump(d, 0, -0.78, -0.62, 0.2, 0.006); // chin
    const n = __v(x / (sx * sx), y / (sy * sy), z / (sz * sz)).normalize();
    return __v(H.x + x + n.x * (out + off), H.y + y + n.y * (out + off), H.z + z + n.z * (out + off));
  };
}
// shell over the head: vertices outside the mask sink inside the head so edges taper cleanly
function __headShell(fn, mask, off, ws = 48, hs = 36, inner = -0.012) {
  const g = new bi(1, ws, hs),
    p = g.attributes.position,
    d = new U();
  for (let i = 0; i < p.count; i++) {
    d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const m = mask(d),
      q = fn(d, m >= 1 ? off : m <= 0 ? inner : __lerp(inner, off, m));
    p.setXYZ(i, q.x, q.y, q.z);
  }
  g.computeVertexNormals();
  return g;
}
// ---------- text patches ----------
const __patchTex = new Map();
function __patchMat(text, bg, fg) {
  const k = text + bg + fg;
  if (__patchTex.has(k)) return __patchTex.get(k);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, 256, 96);
  x.strokeStyle = 'rgba(255,255,255,.18)';
  x.lineWidth = 4;
  x.strokeRect(6, 6, 244, 84);
  x.fillStyle = fg;
  x.font = `800 ${text.length > 4 ? 54 : 64}px "Barlow","Arial Narrow",sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 128, 52);
  const t = new LI(c);
  t.colorSpace = Tw;
  t.anisotropy = 4;
  const m = new Gw({ map: t, roughness: 0.85, metalness: 0 });
  __patchTex.set(k, m);
  return m;
}
const __tatTex = new Map();
function __tattooMat(skin, kind) {
  const k = skin + kind;
  if (__tatTex.has(k)) return __tatTex.get(k);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = skin;
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(18,22,30,.78)';
  x.fillStyle = 'rgba(18,22,30,.7)';
  x.lineCap = 'round';
  if (kind === 'sleeve') {
    for (let i = 0; i < 9; i++) {
      x.lineWidth = 5 + (i % 3) * 3;
      x.beginPath();
      for (let s = 0; s <= 256; s += 8) x.lineTo(s, 20 + i * 27 + Math.sin(s / 22 + i) * 12);
      x.stroke();
    }
  } else {
    x.lineWidth = 6;
    x.beginPath();
    x.arc(128, 150, 42, 0, Math.PI * 2);
    x.stroke();
    x.beginPath();
    x.moveTo(128, 70);
    x.lineTo(128, 230);
    x.moveTo(60, 150);
    x.lineTo(196, 150);
    x.stroke();
  }
  const t = new LI(c);
  t.colorSpace = Tw;
  const m = Zu(skin);
  m.map = t;
  __tatTex.set(k, m);
  return m;
}
// ---------- materials ----------
function __cbMats(o, unitScale) {
  const cloth = (c, camo, r = 0.92) => zn(c, camo || 'none', 0.6 * unitScale, r);
  const flat = (c, r = 0.8, m = 0) => new Gw({ color: c, roughness: r, metalness: m });
  const dark = (c, k) => '#' + new UA(c).multiplyScalar(k).getHexString();
  const gl = o.hands,
    glove =
      gl.gloves === 'leather'
        ? new ri({ color: gl.color, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.5 })
        : IQ(gl.color);
  return {
    skin: Zu(o.skin),
    lip: flat(dark(o.skin, 0.72), 0.55),
    hair: Gu(o.hair.color),
    brow: Gu(o.face.brows || o.hair.color),
    beard: Gu(o.hair.color),
    stub: flat(dark(o.skin, 0.62), 0.9),
    eyeW: new Gw({ color: '#e9e6df', roughness: 0.25 }),
    iris: new Gw({ color: '#2a1c12', roughness: 0.2 }),
    shirt: cloth(o.top.color, o.top.camo),
    shirt2: cloth(o.top.under || dark(o.top.color, 0.75), 'none'),
    pants: cloth(o.legs.color, o.legs.camo),
    boot: new ri({ color: o.legs.boots, roughness: o.legs.sneakers ? 0.75 : 0.55, clearcoat: o.legs.sneakers ? 0 : 0.2 }),
    sole: flat(o.legs.sneakers ? '#efece6' : '#151515', 0.9),
    glove,
    gear: cloth(o.gear.color, o.top.camo === 'multicam' && o.gear.vest === 'plate' ? 'multicam' : 'none', 0.88),
    gear2: cloth(dark(o.gear.color, 0.78), 'none', 0.9),
    strap: flat(dark(o.gear.color, 0.62), 0.9),
    metal: II.metal,
    rubber: II.rubber,
    lens: II.lens,
    helmet: new ri({ color: o.head.color || '#2a2d33', roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.6 }),
    headwear: IQ(o.head.color || '#2a2d33'),
    scarf: cloth(o.head.scarfColor || '#b9a27a', 'none', 0.95),
    belt: o.gear.belt === 'leather' ? new ri({ color: '#3a2618', roughness: 0.55, clearcoat: 0.2 }) : flat('#1c1d1f', 0.85),
    buckle: flat('#8a8a86', 0.35, 0.8),
    teamTape: flat(o.team === 'CT' ? '#3d6fd8' : '#d8a03d', 0.6),
    tattoo: o.hands.tattoo ? __tattooMat(o.skin, o.hands.tattoo) : null,
    patch: o.gear.patch ? __patchMat(o.gear.patch, o.team === 'CT' ? '#18233a' : '#2e2a22', '#f2efe6') : null,
    backText: o.top.text ? __patchMat(o.top.text, o.top.color, '#f4f1ea') : null,
    blade: flat('#2b2d30', 0.35, 0.7),
    tan: cloth('#8a7a55', 'none'),
    olive: flat('#4b5132', 0.8),
    wire: flat('#a8322a', 0.6),
  };
}
// ---------- the outfit ----------
function __buildOperator(o, S) {
  const P = S.pos,
    E = S.end,
    parts = []; // {g, mat, bones:[names] | rigid:name}
  const add = (g, mat, bones) => (g && mat ? parts.push({ g: __toIndexed(g), mat, bones: Array.isArray(bones) ? bones : [bones] }) : null);
  const f = o.build.sex === 'f';
  const has = (n) => !!P[n];
  const sp = (n) => P[n] || __v();
  // body landmarks
  const hip = sp('hips'),
    neck = sp('neck'),
    head = sp('head'),
    lA = sp('leftarm'),
    rA = sp('rightarm'),
    lF = sp('leftforearm'),
    rF = sp('rightforearm'),
    lH = sp('lefthand'),
    rH = sp('righthand'),
    lU = sp('leftupleg'),
    rU = sp('rightupleg'),
    lL = sp('leftleg'),
    rL = sp('rightleg'),
    lFt = sp('leftfoot'),
    rFt = sp('rightfoot'),
    lT = sp('lefttoebase'),
    rT = sp('righttoebase');
  const spineZ = (y) => {
    const pts = ['hips', 'spine', 'spine1', 'spine2', 'neck'].filter(has).map((n) => P[n]);
    for (let i = 0; i < pts.length - 1; i++)
      if (y <= pts[i + 1].y) return __lerp(pts[i].z, pts[i + 1].z, Math.max(0, (y - pts[i].y) / (pts[i + 1].y - pts[i].y || 1)));
    return pts[pts.length - 1].z;
  };
  const torsoBones = ['hips', 'spine', 'spine1', 'spine2', 'neck', 'leftshoulder', 'rightshoulder', 'leftarm', 'rightarm', 'leftupleg', 'rightupleg'];
  const chestBones = ['spine1', 'spine2'];
  const shY = lA.y,
    shW = Math.abs(rA.x - lA.x) / 2;
  // torso silhouette: [y, halfWidth, halfDepth]; z follows the spine, front slightly fuller
  const torso = f
    ? [
        [hip.y - 0.12, 0.178, 0.115],
        [hip.y - 0.04, 0.182, 0.118],
        [hip.y + 0.06, 0.152, 0.105],
        [hip.y + 0.13, 0.142, 0.1],
        [hip.y + 0.22, 0.155, 0.112],
        [hip.y + 0.3, 0.17, 0.132],
        [shY - 0.06, 0.188, 0.12],
        [shY - 0.01, shW * 0.88, 0.1],
        [shY + 0.035, 0.11, 0.075],
        [neck.y + 0.005, 0.06, 0.056],
      ]
    : [
        [hip.y - 0.12, 0.172, 0.115],
        [hip.y - 0.04, 0.178, 0.12],
        [hip.y + 0.06, 0.166, 0.115],
        [hip.y + 0.14, 0.172, 0.12],
        [hip.y + 0.23, 0.188, 0.13],
        [hip.y + 0.31, 0.2, 0.135],
        [shY - 0.06, 0.212, 0.126],
        [shY - 0.01, shW * 0.96, 0.108],
        [shY + 0.035, 0.125, 0.082],
        [neck.y + 0.005, 0.064, 0.06],
      ];
  const tz = (y, d) => spineZ(y) - 0.012 - d * 0.08;
  const torsoShape = (k = 1, wr = 0.012) => (t, r, g) => {
    const front = Math.sin(t) < 0 ? 1 : 0,
      side = Math.abs(Math.cos(t));
    return k * (1 + front * 0.04 * Math.abs(Math.sin(t)) - 0.05 * side * (1 - front) + wr * Math.sin(t * 7 + r * 1.7));
  };
  const torsoRows = (from, to, grow = 0) =>
    torso.filter((r) => r[0] >= from - 1e-6 && r[0] <= to + 1e-6).map(([y, w, d]) => [y, w + grow, d + grow, tz(y, d)]);
  // ----- shirt / jacket -----
  const top = o.top;
  const hemY = top.cut === 'jacket' || top.cut === 'blazer' || top.cut === 'hoodie' ? hip.y - 0.16 : hip.y - 0.06;
  const hemRow = [hemY, f ? 0.182 : 0.18, 0.124, tz(hemY, 0.124)];
  const tRows = [hemRow, ...torsoRows(hemY + 0.03, neck.y - 0.03, top.cut === 'jacket' || top.cut === 'blazer' || top.cut === 'hoodie' ? 0.012 : 0.004)];
  add(__ring(tRows, 36, torsoShape(1, top.cut === 'hoodie' ? 0.02 : 0.012), [!1, !1]), top.cut === 'blazer' ? 'shirt' : 'shirt', torsoBones);
  // collar
  if (top.cut === 'combat' || top.cut === 'polo' || top.cut === 'jacket' || top.cut === 'blazer') {
    const cy = neck.y - 0.02;
    add(__ring([[cy - 0.015, 0.072, 0.066, spineZ(cy) - 0.012], [cy + 0.035, top.cut === 'polo' ? 0.074 : 0.068, 0.064, spineZ(cy) - 0.006]], 28), 'shirt', ['spine2', 'neck']);
  }
  if (top.cut === 'tshirt') {
    const cy = neck.y - 0.03;
    add(new oI(0.07, 0.008, 8, 28).rotateX(Math.PI / 2).translate(0, cy, spineZ(cy) - 0.01), 'shirt2', ['spine2', 'neck']);
  }
  if (top.cut === 'blazer') {
    // shirt V and lapels
    const y0 = hip.y + 0.2,
      y1 = shY + 0.02,
      zf = tz(hip.y + 0.25, 0.13) - 0.13;
    add(__place(new bB(0.09, y1 - y0), __v(0, (y0 + y1) / 2, zf - 0.006), __qe(-0.12, 0, 0)), 'shirt2', chestBones);
    for (const s of [-1, 1])
      add(__place(__rbox(0.06, y1 - y0 + 0.02, 0.012, 0.004), __v(s * 0.06, (y0 + y1) / 2, zf - 0.01), __qe(-0.1, 0, s * 0.22)), 'shirt', chestBones);
    for (let i = 0; i < 2; i++) add(__place(new bi(0.007, 8, 6), __v(0.012, hip.y + 0.08 + i * 0.08, zf + 0.012)), 'buckle', chestBones);
  }
  if (top.cut === 'jacket') {
    for (const s of [-1, 1]) add(__place(__rbox(0.09, 0.1, 0.022, 0.006), __v(s * 0.085, hip.y + 0.3, tz(hip.y + 0.3, 0.13) - 0.13), __qe(-0.15, 0, 0)), 'shirt', chestBones);
    add(__place(__rbox(0.012, 0.42, 0.012, 0.004), __v(0, hip.y + 0.12, tz(hip.y + 0.12, 0.12) - 0.123)), 'buckle', ['hips', 'spine', 'spine1', 'spine2']);
  }
  if (top.cut === 'hoodie') {
    add(__place(new bi(1, 24, 16), __v(0, neck.y + 0.01, spineZ(neck.y) + 0.09), null, __v(0.115, 0.07, 0.075)), 'shirt', ['spine2', 'neck']);
    add(__place(__rbox(0.2, 0.12, 0.03, 0.012), __v(0, hip.y - 0.02, tz(hip.y, 0.12) - 0.118)), 'shirt', ['hips', 'spine']);
    for (const s of [-1, 1]) add(__place(new Rw(0.003, 0.003, 0.16, 6), __v(s * 0.035, neck.y - 0.1, spineZ(neck.y - 0.1) - 0.105)), 'shirt2', ['spine2']);
  }
  if (top.cut === 'polo') {
    for (let i = 0; i < 2; i++) add(__place(new bi(0.005, 8, 6), __v(0, neck.y - 0.05 - i * 0.035, spineZ(neck.y) - 0.073)), 'shirt2', ['spine2']);
  }
  // ----- arms: sleeves, exposed skin, hands -----
  for (const side of ['left', 'right']) {
    const s = side === 'left' ? -1 : 1,
      A0 = side === 'left' ? lA : rA,
      F0 = side === 'left' ? lF : rF,
      H0 = side === 'left' ? lH : rH,
      sh = __v(A0.x - s * 0.075, A0.y + 0.005, A0.z),
      armBones = ['spine2', side + 'shoulder', side + 'arm', side + 'forearm', side + 'hand'];
    const at = (t) => (t <= 1 ? sh.clone().lerp(A0, t) : t <= 2 ? A0.clone().lerp(F0, t - 1) : F0.clone().lerp(H0, t - 2));
    // radius profile along 0..3 (shoulder..wrist)
    const rad = (t) => {
      const m = f ? 0.88 : 1;
      if (t <= 1) return 0.066 * m;
      if (t <= 2) return __lerp(0.06, 0.045, t - 1) * m + (t - 1 < 0.35 ? 0.006 * m : 0);
      return __lerp(0.047, 0.033, Math.pow(t - 2, 0.8)) * m;
    };
    const ts = (a, b, n) => [...Array(n)].map((_, i) => a + ((b - a) * i) / (n - 1));
    const sleeveEnd = top.sleeves === 'short' ? 1.42 : top.sleeves === 'rolled' ? 2.45 : 2.94;
    const sT = ts(0, sleeveEnd, 14),
      sleeveGrow = top.cut === 'jacket' || top.cut === 'blazer' || top.cut === 'hoodie' ? 0.01 : 0.004;
    add(
      __limb(
        sT.map(at),
        sT.map((t) => [rad(t) + sleeveGrow, (rad(t) + sleeveGrow) * 0.92]),
        __v(0, 1, 0),
        20,
        (t, r) => 1 + 0.025 * Math.sin(t * 5 + r * 2.1),
        [!1, !1],
      ),
      'shirt',
      armBones,
    );
    // cuff / roll / hem
    const ce = at(sleeveEnd),
      cdir = at(sleeveEnd + 0.01).sub(ce).normalize(),
      cq = new Kw().setFromUnitVectors(__v(0, 1, 0), cdir);
    const cr = rad(sleeveEnd) + sleeveGrow;
    top.sleeves === 'rolled'
      ? add(__place(new oI(cr + 0.004, 0.011, 8, 22).rotateX(Math.PI / 2), ce, cq), 'shirt', armBones)
      : add(__place(new Rw(cr + 0.003, cr + 0.003, 0.02, 20, 1, !0), ce, cq), top.sleeves === 'long' ? 'shirt2' : 'shirt', armBones);
    // skin where the sleeve stops
    if (sleeveEnd < 2.9) {
      const kT = ts(sleeveEnd - 0.08, 3, 12);
      const tat = o.hands.tattoo && (o.hands.tattoo === 'sleeve' || side === 'left');
      add(__limb(kT.map(at), kT.map((t) => [rad(t) * 0.97, rad(t) * 0.86]), __v(0, 1, 0), 18), tat ? 'tattoo' : 'skin', armBones);
    }
    // shoulder flag / unit patch on combat shirts
    if (top.cut === 'combat') {
      const pp = at(1.45),
        n = __v(s, 0.0, 0).normalize();
      add(__place(__rbox(0.006, 0.05, 0.065, 0.002), pp.clone().addScaledVector(n, rad(1.45) + 0.006)), 'teamTape', armBones);
    }
    // ---- hand ----
    const hm = side + 'hand',
      gl = o.hands.gloves,
      palmMat = gl === 'none' ? 'skin' : 'glove',
      fingerMat = gl === 'none' || gl === 'fingerless' ? 'skin' : 'glove';
    const mid = P[side + 'handmiddle1'] || H0.clone().add(__v(s * 0.1, 0, 0));
    const pc = H0.clone().lerp(mid, 0.55);
    add(__place(__rbox(mid.distanceTo(H0) + 0.02, 0.032, f ? 0.074 : 0.084, 0.012), __v(pc.x, pc.y - 0.003, pc.z)), palmMat, [side + 'forearm', hm, side + 'handmiddle1', side + 'handindex1', side + 'handring1']);
    // glove cuff
    gl !== 'none' && add(__place(new Rw(0.04, 0.038, 0.035, 18).rotateZ(Math.PI / 2), H0.clone().add(__v(-s * 0.005, 0, 0)), null, __v(1, 0.85, 1.05)), palmMat, [side + 'forearm', hm]);
    for (const fn of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
      const chain = [1, 2, 3, 4].map((k) => side + 'hand' + fn + k).filter(has);
      if (!chain.length) continue;
      const pts = chain.map((n) => P[n]);
      pts.push(E[chain[chain.length - 1]]);
      const r0 = (fn === 'thumb' ? 0.0115 : fn === 'pinky' ? 0.0078 : 0.0092) * (f ? 0.9 : 1);
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k],
          b = pts[k + 1],
          len = a.distanceTo(b),
          r = r0 * (1 - k * 0.1);
        const g = new kC(r, Math.max(0.002, len), 4, 10);
        __place(g, a.clone().lerp(b, 0.5), new Kw().setFromUnitVectors(__v(0, 1, 0), b.clone().sub(a).normalize()));
        add(g, k === 0 && gl === 'fingerless' ? 'glove' : fingerMat, [hm, chain[Math.max(0, k - 1)], chain[k]]);
      }
    }
    // watch on the left wrist
    if (o.hands.watch && side === 'left') {
      const wp = at(2.86),
        wq = new Kw().setFromUnitVectors(__v(0, 1, 0), at(2.9).sub(wp).normalize());
      add(__place(new Rw(rad(2.86) + 0.004, rad(2.86) + 0.004, 0.018, 18, 1, !0), wp, wq), 'rubber', armBones);
      add(__place(new Rw(0.016, 0.016, 0.01, 18).rotateX(Math.PI / 2), wp.clone().add(__v(0, rad(2.86) + 0.008, 0))), 'metal', armBones);
    }
  }
  // ----- neck -----
  add(__limb([__v(0, neck.y - 0.06, spineZ(neck.y) - 0.01), __v(0, neck.y, spineZ(neck.y) - 0.012), __v(0, head.y + 0.04, head.z - 0.01)], [[0.054, 0.05], [0.052, 0.049], [0.05, 0.048]], __v(1, 0, 0), 20), 'skin', ['spine2', 'neck', 'head']);
  // ----- head -----
  const HC = __v(0, head.y + (f ? 0.092 : 0.098), head.z - 0.018),
    hf = __headFn(HC, o.build.sex);
  add(__headShell(hf, () => 1, 0, 56, 44), 'skin', 'head');
  // eyes, brows, lips, ears
  for (const s of [-1, 1]) {
    const ec = hf(__v(s * 0.33, 0.11, -0.94).normalize(), -0.009);
    add(__place(new bi(0.0118, 16, 12), ec), 'eyeW', 'head');
    add(__place(new bi(0.0062, 12, 8), ec.clone().add(__v(0, 0, -0.0085))), 'iris', 'head');
    const bc = hf(__v(s * 0.33, 0.27, -0.92).normalize(), 0.002);
    add(__place(__rbox(0.03, 0.006, 0.008, 0.003), bc, __qe(0, -s * 0.25, s * 0.08)), 'brow', 'head');
    const ea = hf(__v(s, 0.02, 0.05).normalize(), 0);
    add(__place(new bi(1, 14, 10), ea.clone().add(__v(s * 0.004, 0, 0.004)), __qe(0, s * 0.3, 0), __v(0.009, 0.03, 0.018)), 'skin', 'head');
  }
  add(__place(new bi(1, 16, 8), hf(__v(0, -0.47, -0.9).normalize(), 0.001), null, __v(0.021, 0.006, 0.008)), 'lip', 'head');
  // hair
  const hs = o.hair.style;
  const hairMask = (front) => (d) => __smooth(-0.32 + 0.5 * Math.max(0, -d.z) * front, -0.12 + 0.5 * Math.max(0, -d.z) * front, d.y) * (Math.abs(d.x) > 0.93 && d.y < 0.15 ? 0 : 1);
  const coversHead = o.head.gear === 'balaclava' || o.head.gear === 'beanie' || o.head.gear === 'fast';
  if (hs !== 'none' && !(coversHead && (hs === 'buzz' || hs === 'short'))) {
    const th = hs === 'buzz' ? 0.003 : hs === 'slick' ? 0.009 : 0.013;
    add(__headShell(hf, hairMask(hs === 'slick' ? 0.75 : 0.62), th), 'hair', 'head');
    if (hs === 'ponytail')
      add(__limb([__v(0, HC.y + 0.03, HC.z + 0.1), __v(0, HC.y - 0.05, HC.z + 0.125), __v(0, HC.y - 0.15, HC.z + 0.12)], [0.024, 0.022, 0.012], __v(1, 0, 0), 12, null, [!1, !0]), 'hair', ['head', 'neck']);
    if (hs === 'bun') add(__place(new bi(0.036, 16, 12), __v(0, HC.y + 0.035, HC.z + 0.105)), 'hair', 'head');
    if (hs === 'long') add(__place(new bi(1, 24, 16), __v(0, HC.y - 0.1, HC.z + 0.06), null, __v(0.085, 0.13, 0.045)), 'hair', ['head', 'neck', 'spine2']);
  }
  // facial hair
  const bd = o.face.beard;
  if (bd === 'full') add(__headShell(hf, (d) => __smooth(-0.02, -0.22, d.y) * __smooth(0.45, 0.15, d.z) * (1 - Math.exp(-((d.x ** 2 + (d.y + 0.47) ** 2) / 0.012)) * (d.z < -0.7 ? 1 : 0)), 0.011), 'beard', 'head');
  if (bd === 'goatee') add(__headShell(hf, (d) => (Math.abs(d.x) < 0.3 && d.y < -0.36 && d.z < -0.45 ? 1 : 0), 0.007), 'beard', 'head');
  if (bd === 'stubble') add(__headShell(hf, (d) => __smooth(0, -0.25, d.y) * __smooth(0.4, 0.1, d.z), 0.0012), 'stub', 'head');
  // ----- headgear -----
  const hd = o.head;
  if (hd.gear === 'fast') {
    const mask = (d) => (d.z < -0.5 && d.y < 0.4 ? 0 : Math.abs(d.x) > 0.75 && d.y < 0.12 ? 0 : __smooth(-0.15, 0.02, d.y + 0.25 * Math.max(0, d.z)));
    add(__headShell(hf, mask, 0.03, 40, 28, -0.006), 'helmet', 'head');
    for (const s of [-1, 1]) add(__place(__rbox(0.012, 0.022, 0.12, 0.004), hf(__v(s * 0.97, 0.18, 0.05).normalize(), 0.034)), 'rubber', 'head');
    add(__place(__rbox(0.045, 0.028, 0.02, 0.005), hf(__v(0, 0.55, -0.83).normalize(), 0.034)), 'rubber', 'head');
    add(__place(__rbox(0.08, 0.05, 0.004, 0.002), hf(__v(0, 0.86, 0.5).normalize(), 0.033), __qe(-0.95, 0, 0)), 'teamTape', 'head');
    if (hd.nvg) {
      const nb = hf(__v(0, 0.62, -0.78).normalize(), 0.055);
      for (const s of [-1, 1]) add(__place(new Rw(0.014, 0.016, 0.06, 14), nb.clone().add(__v(s * 0.018, 0.01, -0.01)), __qe(0.9, 0, 0)), 'rubber', 'head');
    }
  }
  if (hd.gear === 'cap') {
    add(__headShell(hf, (d) => __smooth(0.12, 0.26, d.y), 0.012, 40, 28), 'headwear', 'head');
    const back = hd.backwards ? 1 : -1;
    add(__place(new Rw(0.075, 0.075, 0.005, 24, 1, !1, Math.PI * (back > 0 ? 0 : 1), Math.PI), hf(__v(0, 0.32, back * 0.95).normalize(), 0.012), __qe(back * 0.12, 0, 0), __v(1, 1, 0.85)), 'headwear', 'head');
  }
  if (hd.gear === 'beanie') {
    add(__headShell(hf, (d) => __smooth(-0.08, 0.06, d.y) * (d.z < -0.6 && d.y < 0.3 ? 0 : 1), 0.016, 40, 28), 'headwear', 'head');
    add(__place(new oI(0.088, 0.012, 8, 32).rotateX(Math.PI / 2), __v(0, HC.y + 0.035, HC.z + 0.005), null, __v(1, 1.12, 1.18)), 'headwear', 'head');
  }
  if (hd.gear === 'bandana') {
    add(__headShell(hf, (d) => (d.y > 0.18 ? 1 : 0) * __smooth(0.1, 0.22, d.y), 0.008, 40, 28), 'headwear', 'head');
    add(__place(new bi(0.018, 10, 8), hf(__v(0, 0.2, 1).normalize(), 0.012)), 'headwear', 'head');
    add(__place(__rbox(0.03, 0.07, 0.006, 0.003), hf(__v(0, 0.0, 1).normalize(), 0.02), __qe(0.2, 0, 0.3)), 'headwear', ['head', 'neck']);
  }
  if (hd.gear === 'balaclava') {
    const slot = (d) => (d.z < -0.55 && d.y > -0.02 && d.y < 0.3 && Math.abs(d.x) < 0.62 ? 0 : 1);
    add(__headShell(hf, slot, 0.006, 56, 44, -0.004), 'headwear', 'head');
    add(__limb([__v(0, neck.y - 0.05, spineZ(neck.y) - 0.01), __v(0, head.y + 0.02, head.z - 0.008)], [[0.06, 0.057], [0.056, 0.054]], __v(1, 0, 0), 20), 'headwear', ['spine2', 'neck', 'head']);
  }
  if (hd.headset) {
    for (const s of [-1, 1]) add(__place(new Rw(0.034, 0.034, 0.03, 20).rotateZ(Math.PI / 2), hf(__v(s, 0.02, 0.05).normalize(), hd.gear === 'fast' ? 0.03 : 0.016)), 'rubber', 'head');
    if (hd.gear !== 'fast' && hd.gear !== 'cap') add(__place(new oI(0.1, 0.006, 6, 24, Math.PI).rotateY(Math.PI / 2), __v(0, HC.y + 0.01, HC.z + 0.01)), 'rubber', 'head');
    add(__place(new Rw(0.003, 0.003, 0.07, 6), hf(__v(-0.7, -0.45, -0.55).normalize(), 0.012), __qe(0, 0, 1.2)), 'rubber', 'head');
  }
  if (hd.eyes === 'ballistic') {
    add(__headShell(hf, (d) => (d.z < -0.25 && Math.abs(d.y - 0.11) < 0.08 && Math.abs(d.x) < 0.8 ? 1 : 0), 0.014, 48, 64, -0.01), 'lens', 'head');
  }
  if (hd.eyes === 'shades') {
    for (const s of [-1, 1]) add(__place(new bi(1, 16, 10), hf(__v(s * 0.34, 0.1, -0.94).normalize(), 0.011), null, __v(0.024, 0.017, 0.004)), 'lens', 'head');
    add(__place(__rbox(0.016, 0.003, 0.003, 0.001), hf(__v(0, 0.13, -1).normalize(), 0.014)), 'metal', 'head');
    for (const s of [-1, 1]) add(__place(__rbox(0.002, 0.003, 0.09, 0.001), hf(__v(s * 0.92, 0.12, -0.35).normalize(), 0.006)), 'metal', 'head');
  }
  if (hd.scarf) {
    const ny = neck.y + 0.005;
    add(__place(new oI(0.072, 0.024, 10, 30).rotateX(Math.PI / 2), __v(0, ny, spineZ(ny) - 0.012), null, __v(1.05, 1, 1.1)), 'scarf', ['spine2', 'neck']);
    add(__place(__rbox(0.12, 0.14, 0.012, 0.01), __v(0.02, ny - 0.1, tz(ny - 0.1, 0.1) - 0.11), __qe(-0.2, 0, 0.12)), 'scarf', ['spine2', 'spine1']);
    hd.scarf === 'face' && add(__headShell(hf, (d) => __smooth(-0.02, -0.12, d.y) * __smooth(0.5, 0.2, d.z), 0.016, 48, 36), 'scarf', 'head');
  }
  // ----- legs -----
  const lg = o.legs;
  const slim = lg.cut === 'jeans' || lg.cut === 'slacks' ? 0.9 : 1;
  // pelvis / seat
  add(__ring([[hip.y + 0.09, 0.168, 0.116, tz(hip.y + 0.09, 0.116)], [hip.y - 0.02, 0.178 * slim + 0.01, 0.122, tz(hip.y, 0.12)], [hip.y - 0.1, 0.17 * slim + 0.01, 0.112, tz(hip.y - 0.1, 0.11)]], 32, null, [!1, !0]), 'pants', ['hips', 'spine', 'leftupleg', 'rightupleg']);
  for (const side of ['left', 'right']) {
    const s = side === 'left' ? -1 : 1,
      U0 = side === 'left' ? lU : rU,
      L0 = side === 'left' ? lL : rL,
      F0 = side === 'left' ? lFt : rFt,
      T0 = side === 'left' ? lT : rT,
      legB = ['hips', side + 'upleg', side + 'leg', side + 'foot'];
    const top0 = __v(U0.x * 0.75, hip.y + 0.04, U0.z);
    const at = (t) => (t <= 1 ? top0.clone().lerp(U0, t) : t <= 2 ? U0.clone().lerp(L0, t - 1) : L0.clone().lerp(F0, t - 2));
    const rad = (t) => {
      const m = (f ? 1.02 : 1) * slim;
      if (t <= 1) return 0.1 * m;
      if (t <= 2) return __lerp(0.092, 0.06, t - 1) * m;
      const k = t - 2;
      return (k < 0.35 ? __lerp(0.06, 0.064, k / 0.35) : __lerp(0.064, 0.044, (k - 0.35) / 0.65)) * m;
    };
    const ts = [0, 0.5, 1, 1.25, 1.5, 1.75, 1.92, 2, 2.12, 2.3, 2.45, 2.62, 2.78, 2.9];
    const calf = (t, r) => {
      const back = Math.sin(t) > 0 ? Math.sin(t) : 0,
        k = ts[r] - 2;
      return 1 + (k > 0.05 && k < 0.6 ? 0.12 * back * Math.sin(((k - 0.05) / 0.55) * Math.PI) : 0) + 0.02 * Math.sin(t * 6 + r);
    };
    add(__limb(ts.map(at), ts.map((t) => [rad(t) + 0.006, rad(t) + 0.006]), __v(0, 0, -1), 22, calf), 'pants', legB);
    // cargo pocket
    if (lg.cut === 'cargo' || lg.cut === 'combat') {
      const pp = at(1.4);
      add(__place(__rbox(0.03, 0.15, 0.11, 0.01), pp.clone().add(__v(s * (rad(1.4) + 0.012), 0, 0))), lg.cut === 'cargo' ? 'pants' : 'gear2', legB);
    }
    // knee pads
    if (lg.knees) {
      const kp = at(2.02),
        n = __v(0, 0, -1);
      add(__place(new bi(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), kp.clone().addScaledVector(n, rad(2.02) * 0.6), __qe(-Math.PI / 2, 0, 0), __v(0.058, 0.07, 0.05)), 'gear2', [side + 'upleg', side + 'leg']);
    }
    // boots
    const heel = __v(F0.x, 0.02, F0.z + 0.065),
      toe = __v(T0.x, 0.03, T0.z - 0.075),
      bootTop = lg.sneakers ? 0.12 : 0.21,
      bootB = [side + 'leg', side + 'foot', side + 'toebase'];
    const fpts = [heel, heel.clone().lerp(toe, 0.25), heel.clone().lerp(toe, 0.55), heel.clone().lerp(toe, 0.82), toe];
    const fr = [[0.045, 0.06], [0.05, 0.075], [0.052, 0.065], [0.05, 0.045], [0.03, 0.02]];
    add(__limb(fpts.map((p, i) => p.clone().add(__v(0, i < 3 ? 0.035 - i * 0.008 : 0.016, 0))), fr.map(([w, h]) => [w, h * 0.7]), __v(1, 0, 0), 18, null, [!0, !0]), 'boot', bootB);
    add(__place(__rbox(0.105, 0.022, heel.distanceTo(toe) + 0.04, 0.008), heel.clone().lerp(toe, 0.5).setY(0.011)), 'sole', bootB);
    add(__limb([__v(F0.x, 0.05, F0.z + 0.01), __v(F0.x, bootTop, F0.z + 0.0)], [[0.058, 0.064], [0.054, 0.058]], __v(1, 0, 0), 18), 'boot', bootB);
    if (!lg.sneakers) add(__place(new oI(0.056, 0.005, 6, 18).rotateX(Math.PI / 2), __v(F0.x, bootTop - 0.01, F0.z)), 'sole', bootB);
  }
  // ----- belt -----
  const gr = o.gear,
    by = hip.y + 0.045;
  const beltRow = (y, grow) => [y, (f ? 0.162 : 0.17) + grow, 0.12 + grow, tz(y, 0.12)];
  if (gr.belt === 'battle') {
    add(__ring([beltRow(by - 0.025, 0.018), beltRow(by + 0.025, 0.018)], 32, null), 'strap', ['hips', 'spine']);
    for (const s of [-1, 1]) add(__place(__rbox(0.05, 0.07, 0.05, 0.01), __v(s * 0.16, by, tz(by, 0.12))), 'gear2', ['hips']);
  } else if (gr.belt === 'leather') {
    add(__ring([beltRow(by - 0.016, 0.01), beltRow(by + 0.016, 0.01)], 32, null), 'belt', ['hips', 'spine']);
    add(__place(__rbox(0.04, 0.03, 0.008, 0.003), __v(0, by, tz(by, 0.12) - 0.133)), 'buckle', ['hips']);
  }
  if (gr.holster) {
    const ux = rU.x + 0.07,
      hy = rU.y - 0.16;
    add(__place(__rbox(0.045, 0.16, 0.09, 0.01), __v(ux + 0.02, hy, rU.z + 0.01)), 'gear2', ['rightupleg']);
    add(__place(__rbox(0.03, 0.06, 0.035, 0.008), __v(ux + 0.02, hy + 0.1, rU.z + 0.02), __qe(0.2, 0, 0)), 'rubber', ['rightupleg', 'hips']);
    add(__place(__rbox(0.05, 0.02, 0.008, 0.003), __v(ux + 0.02, hy + 0.02, rU.z + 0.01)), 'strap', ['rightupleg']);
  }
  // ----- torso gear -----
  const vest = gr.vest,
    cy = hip.y + 0.27,
    frontZ = (y, d = 0.13) => tz(y, d) - d;
  if (vest === 'plate' || vest === 'heavy') {
    const heavy = vest === 'heavy',
      pw = f ? 0.27 : 0.3,
      ph = 0.33,
      pt = heavy ? 0.07 : 0.055;
    add(__place(__rbox(pw, ph, pt, 0.025), __v(0, cy, frontZ(cy) - pt * 0.35), __qe(0.06, 0, 0)), 'gear', chestBones);
    add(__place(__rbox(pw, ph + 0.02, pt, 0.025), __v(0, cy + 0.01, tz(cy, 0.13) + 0.13 + pt * 0.3), __qe(-0.06, 0, 0)), 'gear', chestBones);
    add(__ring([[hip.y + 0.11, 0.184, 0.132, tz(hip.y + 0.11, 0.12)], [hip.y + 0.21, 0.198, 0.142, tz(hip.y + 0.21, 0.13)]], 32), 'gear', ['spine', 'spine1']);
    for (const s of [-1, 1]) add(__place(__rbox(0.06, 0.02, 0.26, 0.008), __v(s * 0.1, shY + 0.03, spineZ(shY) - 0.012), __qe(0, 0, -s * 0.12)), 'gear', ['spine2', s < 0 ? 'leftshoulder' : 'rightshoulder']);
    // pouches
    const pz = frontZ(cy - 0.1) - pt - 0.005;
    if (gr.pouches === 'mag3' || gr.pouches === 'mag2') {
      const n = gr.pouches === 'mag3' ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const x = (k - (n - 1) / 2) * 0.078;
        add(__place(__rbox(0.07, 0.1, 0.045, 0.01), __v(x, cy - 0.11, pz)), 'gear2', chestBones);
        add(__place(__rbox(0.072, 0.025, 0.048, 0.006), __v(x, cy - 0.055, pz)), 'gear', chestBones);
      }
    }
    if (gr.pouches === 'shells') {
      for (let k = 0; k < 10; k++) add(__place(new Rw(0.009, 0.009, 0.04, 8), __v(-0.11 + k * 0.024, cy - 0.06, frontZ(cy) - pt - 0.012)), 'wire', chestBones);
      add(__place(__rbox(0.26, 0.05, 0.02, 0.006), __v(0, cy - 0.06, frontZ(cy) - pt - 0.002)), 'strap', chestBones);
    }
    // admin pouch + patch
    add(__place(__rbox(0.13, 0.07, 0.025, 0.008), __v(0, cy + 0.08, frontZ(cy + 0.08) - pt - 0.002)), 'gear2', chestBones);
    if (gr.patch) add(__place(new bB(0.12, 0.045), __v(0, cy + 0.09, frontZ(cy + 0.09) - pt - 0.016), __qe(0.06, Math.PI, 0)), 'patch', chestBones);
    if (gr.patch) add(__place(new bB(0.2, 0.075), __v(0, cy + 0.04, tz(cy, 0.13) + 0.13 + pt * 0.9), __qe(-0.06, 0, 0)), 'patch', chestBones);
    if (heavy) {
      for (const s of [-1, 1]) {
        const A0 = s < 0 ? lA : rA;
        add(__place(new bi(1, 18, 12, 0, Math.PI, 0, Math.PI), A0.clone().add(__v(s * 0.035, 0.03, 0)), __qe(0, 0, -s * Math.PI / 2), __v(0.075, 0.075, 0.08)), 'gear', ['spine2', s < 0 ? 'leftarm' : 'rightarm']);
      }
      add(__place(new oI(0.085, 0.022, 8, 20, Math.PI), __v(0, neck.y - 0.04, spineZ(neck.y) - 0.02), __qe(Math.PI / 2 + 0.25, 0, Math.PI)), 'gear', ['spine2', 'neck']);
      add(__place(__rbox(0.16, 0.14, 0.03, 0.02), __v(0, hip.y - 0.08, frontZ(hip.y - 0.08, 0.12) - 0.02)), 'gear', ['hips']);
    }
    // radio on the side
    add(__place(__rbox(0.04, 0.12, 0.06, 0.008), __v(-0.2, cy - 0.06, tz(cy, 0.13))), 'rubber', ['spine1']);
  }
  if (vest === 'rig') {
    const rz = frontZ(cy - 0.04, 0.13) - (gr.open ? 0.02 : 0.012),
      ry = cy - (gr.open ? 0.1 : 0.06);
    add(__place(__rbox(f ? 0.25 : 0.29, 0.13, 0.03, 0.01), __v(0, ry, rz), __qe(0.08, 0, 0)), 'gear', chestBones);
    const ak = gr.pouches === 'ak3',
      n = ak || gr.pouches === 'mag3' ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const x = (k - (n - 1) / 2) * 0.08;
      add(__place(__rbox(0.07, ak ? 0.14 : 0.11, 0.045, 0.012), __v(x, ry - 0.01, rz - 0.035), __qe(ak ? 0.12 : 0.05, 0, 0)), 'gear2', chestBones);
      add(__place(__rbox(0.072, 0.03, 0.05, 0.006), __v(x, ry + (ak ? 0.065 : 0.055), rz - 0.035)), 'gear', chestBones);
    }
    // H-harness
    for (const s of [-1, 1]) {
      add(__place(__rbox(0.04, 0.3, 0.008, 0.003), __v(s * 0.085, shY - 0.1, frontZ(shY - 0.1, 0.12) - 0.006), __qe(0.12, 0, s * 0.05)), 'strap', chestBones);
      add(__place(__rbox(0.04, 0.34, 0.008, 0.003), __v(s * 0.06, shY - 0.12, tz(shY, 0.12) + 0.125), __qe(-0.1, 0, -s * 0.28)), 'strap', chestBones);
      add(__place(__rbox(0.05, 0.016, 0.24, 0.006), __v(s * 0.098, shY + 0.032, spineZ(shY) - 0.01), __qe(0, 0, -s * 0.12)), 'strap', ['spine2', s < 0 ? 'leftshoulder' : 'rightshoulder']);
    }
    if (gr.patch) add(__place(new bB(0.1, 0.035), __v(0, ry + 0.085, rz - 0.017), __qe(0.08, Math.PI, 0)), 'patch', chestBones);
  }
  if (vest === 'utility') {
    add(__ring(torsoRows(hip.y + 0.0, shY - 0.04, 0.022).map((r) => [r[0], r[1], r[2], r[3]]), 32, (t) => (Math.abs(Math.cos(t)) < 0.12 && Math.sin(t) < 0 ? 0.985 : 1)), 'gear', ['hips', 'spine', 'spine1', 'spine2']);
    for (let row = 0; row < 2; row++)
      for (const s of [-1, 1]) {
        const y = hip.y + 0.12 + row * 0.13;
        add(__place(__rbox(0.08, 0.09, 0.04, 0.01), __v(s * 0.075, y, frontZ(y, 0.13) - 0.04)), 'gear2', chestBones);
      }
    // explosive blocks with wiring
    for (const s of [-1, 1]) {
      const y = cy + 0.06;
      add(__place(__rbox(0.07, 0.05, 0.035, 0.004), __v(s * 0.07, y, frontZ(y, 0.13) - 0.045)), 'olive', chestBones);
      add(__place(new oI(0.02, 0.0025, 6, 14), __v(s * 0.07, y + 0.03, frontZ(y, 0.13) - 0.06), __qe(0.6, 0, 0)), 'wire', chestBones);
    }
  }
  if (gr.bandolier) {
    const a = __v(0.15, shY + 0.02, spineZ(shY) - 0.05),
      b = __v(-0.17, hip.y + 0.02, tz(hip.y, 0.12) - 0.07);
    const pts = [a, a.clone().lerp(b, 0.33).add(__v(0, 0, -0.08)), a.clone().lerp(b, 0.66).add(__v(0, 0, -0.07)), b];
    add(__limb(pts, pts.map(() => [0.028, 0.008]), __v(0, 0, -1), 10), 'belt', ['spine2', 'spine1', 'spine', 'hips']);
    for (let k = 1; k < 10; k++) {
      const t = k / 10,
        p = pts[Math.floor(t * 3)].clone().lerp(pts[Math.floor(t * 3) + 1], (t * 3) % 1);
      add(__place(new Rw(0.006, 0.006, 0.04, 6), p.add(__v(0, 0, -0.012)), __qe(0, 0, 0.9)), 'buckle', ['spine1', 'spine']);
    }
  }
  if (gr.sling) {
    const a = __v(-0.12, shY + 0.02, spineZ(shY) - 0.04),
      b = __v(0.16, hip.y + 0.06, tz(hip.y, 0.12) - 0.05);
    add(__limb([a, a.clone().lerp(b, 0.5).add(__v(0, 0, -0.07)), b], [[0.02, 0.004], [0.02, 0.004], [0.02, 0.004]], __v(0, 0, -1), 8), 'strap', ['spine2', 'spine1', 'spine']);
  }
  // ----- back -----
  if (gr.back === 'radio') {
    const y = cy + 0.02,
      bz = tz(y, 0.13) + 0.13 + 0.09;
    add(__place(__rbox(0.17, 0.24, 0.07, 0.015), __v(0, y, bz)), 'rubber', chestBones);
    add(__place(new Rw(0.004, 0.003, 0.42, 6), __v(-0.06, y + 0.32, bz + 0.01), __qe(0.08, 0, 0.1)), 'rubber', chestBones);
  }
  if (gr.back === 'pack') {
    const y = cy - 0.02,
      bz = tz(y, 0.13) + 0.13 + 0.08;
    add(__place(__rbox(0.27, 0.34, 0.12, 0.03), __v(0, y, bz)), 'gear2', chestBones);
    add(__place(__rbox(0.2, 0.12, 0.04, 0.015), __v(0, y - 0.08, bz + 0.07)), 'gear', chestBones);
  }
  if (o.top.text && vest !== 'plate' && vest !== 'heavy') add(__place(new bB(0.22, 0.07), __v(0, cy + 0.06, tz(cy, 0.13) + 0.142)), 'backText', chestBones);
  return parts;
}
// ---------- skinning + merge ----------
function __cbWeights(g, allowed, S) {
  const p = g.attributes.position,
    n = p.count,
    si = new Uint16Array(n * 4),
    sw = new Float32Array(n * 4),
    v = new U();
  const segs = allowed.map((name) => ({ i: S.idx[name], a: S.pos[name], b: S.end[name] })).filter((s) => s.i !== void 0 && s.a && s.b);
  for (let k = 0; k < n; k++) {
    v.set(p.getX(k), p.getY(k), p.getZ(k));
    if (segs.length === 1) {
      si[k * 4] = segs[0].i;
      sw[k * 4] = 1;
      continue;
    }
    const ws = segs.map((s) => {
      const d = __segDist(v, s.a, s.b) + 0.004;
      return { i: s.i, w: 1 / (d * d * d * d) };
    });
    ws.sort((a, b) => b.w - a.w);
    const top = ws.slice(0, 4),
      tot = top.reduce((a, b) => a + b.w, 0) || 1;
    top.forEach((t, j) => {
      si[k * 4 + j] = t.i;
      sw[k * 4 + j] = t.w / tot;
    });
  }
  g.setAttribute('skinIndex', new gi(si, 4));
  g.setAttribute('skinWeight', new gi(sw, 4));
}
function __cbMerge(list) {
  let nv = 0,
    ni = 0;
  for (const g of list) (nv += g.attributes.position.count), (ni += g.index.count);
  const pos = new Float32Array(nv * 3),
    nor = new Float32Array(nv * 3),
    uv = new Float32Array(nv * 2),
    si = new Uint16Array(nv * 4),
    sw = new Float32Array(nv * 4),
    ind = new Uint32Array(ni);
  let ov = 0,
    oi = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array.subarray(0, c * 3), ov * 3);
    nor.set(g.attributes.normal.array.subarray(0, c * 3), ov * 3);
    g.attributes.uv && uv.set(g.attributes.uv.array.subarray(0, c * 2), ov * 2);
    si.set(g.attributes.skinIndex.array, ov * 4);
    sw.set(g.attributes.skinWeight.array, ov * 4);
    const ix = g.index.array;
    for (let k = 0; k < ix.length; k++) ind[oi + k] = ix[k] + ov;
    ov += c;
    oi += ix.length;
  }
  const g = new uw();
  g.setAttribute('position', new gi(pos, 3));
  g.setAttribute('normal', new gi(nor, 3));
  g.setAttribute('uv', new gi(uv, 2));
  g.setAttribute('skinIndex', new gi(si, 4));
  g.setAttribute('skinWeight', new gi(sw, 4));
  g.setIndex(new gi(ind, 1));
  return g;
}
function __cbGeometry(opId, S) {
  const k = opId;
  if (__CHB.geo.has(k)) return __CHB.geo.get(k);
  const o = __OPS[opId],
    parts = __buildOperator(o, S),
    byMat = new Map();
  for (const p of parts) {
    const g = p.g;
    // geometries from three helpers can be non-indexed or lack normals/uv; normalise them
    g.attributes.normal || g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new gi(new Float32Array(g.attributes.position.count * 2), 2));
    __cbWeights(g, p.bones, S);
    (byMat.get(p.mat) || byMat.set(p.mat, []).get(p.mat)).push(g);
  }
  const out = [];
  for (const [mat, list] of byMat) {
    const g = __cbMerge(list);
    g.applyMatrix4(S.G); // canonical -> the skinned mesh's geometry space
    g.computeBoundingSphere();
    out.push({ mat, g });
  }
  __CHB.geo.set(k, out);
  return out;
}
// ---------- finger curl (applied every frame after animation/IK) ----------
function __cbFingerRig(root, S) {
  const rig = [];
  for (const side of ['left', 'right']) {
    for (const fn of ['thumb', 'index', 'middle', 'ring', 'pinky'])
      for (let k = 1; k <= 3; k++) {
        const n = side + 'hand' + fn + k;
        if (S.idx[n] === void 0) continue;
        const b = (() => {
          let r = null;
          root.traverse((o) => {
            !r && o.isBone && __bn(o.name) === n && (r = o);
          });
          return r;
        })();
        if (!b) continue;
        const dir = S.end[n].clone().sub(S.pos[n]).normalize(),
          palm = fn === 'thumb' ? __v(0, -1, side === 'left' ? 0 : 0).add(__v(side === 'left' ? -0.3 : 0.3, 0, 0.6)).normalize() : __v(0, -1, 0);
        const axisC = new U().crossVectors(dir, palm).normalize(),
          axisL = axisC.clone().applyQuaternion(S.rot[n].clone().invert()).normalize();
        rig.push({ b, rest: b.quaternion.clone(), axis: axisL, side, fn, k });
      }
  }
  return rig;
}
const __curlQ = new Kw();
function __cbCurl(rig, grip) {
  for (const r of rig) {
    const g = grip[r.side];
    if (!g) {
      r.b.quaternion.copy(r.rest);
      continue;
    }
    const base = r.fn === 'thumb' ? g.thumb : r.fn === 'index' ? g.index : g.fist,
      a = base * (r.k === 1 ? 0.9 : r.k === 2 ? 1.05 : 0.75);
    __curlQ.setFromAxisAngle(r.axis, a);
    r.b.quaternion.copy(r.rest).multiply(__curlQ);
  }
}
// ---------- assembly: replaces the core's realistic-model dressing ----------
function __cbAssemble(w, A, teamColor) {
  let vm = null;
  const drop = [];
  w.traverse((o) => {
    if (!o.isSkinnedMesh && !o.isMesh) return;
    if (o.isSkinnedMesh && !/visor/i.test(o.name) && !vm) vm = o;
    drop.push(o);
  });
  if (!vm) return !1;
  const team = A && __OPS[A.body] ? __OPS[A.body].team : teamColor && ii.T && teamColor === ii.T.main ? 'T' : 'CT';
  const opId = __opForLook(A, team),
    o = __OPS[opId];
  const S = __cbSkeleton(w, vm);
  __CHB.bones || (__CHB.bones = S);
  const geos = __cbGeometry(opId, S),
    mats = __cbMats(o, 1 / S.geoUnit);
  // the base skin tone comes from the look, so a recoloured operator still matches
  A && A.skin && A.skin !== o.skin && (mats.skin = Zu(A.skin));
  const parent = vm.parent,
    skel = vm.skeleton,
    bind = vm.bindMatrix.clone();
  for (const d of drop) d.removeFromParent();
  for (const { mat, g } of geos) {
    const m = mats[mat];
    if (!m) continue;
    const mesh = new tZ(g, m);
    mesh.name = 'op-' + mat;
    mesh.castShadow = !0;
    mesh.receiveShadow = !0;
    mesh.frustumCulled = !1;
    parent.add(mesh);
    mesh.bind(skel, bind);
  }
  w.userData.op = opId;
  w.userData.fingers = __cbFingerRig(w, S);
  return !0;
}
{
  const coreDress = XAA;
  XAA = function (w, A, i) {
    try {
      if (__cbAssemble(w, A, i)) return;
    } catch (e) {
      console.warn('[ops] build failed, using the core model', e);
    }
    return coreDress(w, A, i);
  };
}
typeof window < 'u' && (window.__bpOps = { __CHB, __OPS });
