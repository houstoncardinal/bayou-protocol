// Rig an unrigged character model onto the Mixamo skeleton, so it plays every shared animation directly.
//
// Retired: the three characters it rigged (Cole, Marek, Ghost) are out of the game; only Mixamo-rigged
// characters are used now. `--mixamo` is still useful: it writes a zip to upload to mixamo.com's Auto-Rigger
// (assets-src/characters/mixamo-upload/). Sources are in assets-src/_retired/characters/.
//
//   node tools/build-autorig.mjs quantek     "Terrorist" by Quantek Studio -> terrorists/Marek.glb
//   node tools/build-autorig.mjs gasmask     "Gas Mask Guy" by modellerschool -> terrorists/Ghost.glb
//   node tools/build-autorig.mjs tactical    "Modern Tactical Soldier" by ItsKrish7 -> counter-terrorists/Cole.glb
// The skeleton (and the weights copied) come from the Mixamo character Ch45, kept in assets-src/characters/_rig.
//
// For a model without a skeleton (these: 1.5 to 2 million triangles, standing in an A-pose):
//   1. its meshes are merged (they share one material), welded, and simplified to about 24,000 triangles,
//      keeping UV seams and normals
//   2. it is turned so its arms run along x and its toes point to +Z, stood on y = 0, centred and scaled to a
//      real standing height
//   3. the skeleton of a Mixamo character from the game (Ch45: bone names, hierarchy, rest rotations) is
//      scaled to that height, and its upper arms are lowered to the model's A-pose angle, measured from where
//      the hands are. That posed skeleton is the bind pose; the bones keep Mixamo's own axes, so the Mixamo
//      clips drive it exactly as they drive the Mixamo characters.
//   4. weights: first each vertex is assigned to a limb (an arm if it is clearly nearer that arm's bones, then
//      grown along the mesh's own edges so fingers hanging by a thigh still belong to the hand); then it copies
//      the artist-made weights of its nearest points on Ch45, posed the same way, restricted to the same limb.
//      (A distance-to-bone weighting is computed first, as a fallback for any vertex with no match.)
//   5. textures to 1024 px WebP, geometry quantised
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, textureCompress, quantize } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const JOBS = {
  quantek: { src: 'assets-src/_retired/characters/terrorist_quantek_unrigged.glb', skel: 'assets-src/characters/_rig/Ch45_skeleton.glb', out: 'public/game/characters/terrorists/Marek.glb', tris: 24000, height: 1.78 },
  tactical: { src: 'assets-src/_retired/characters/modern_tactical_soldier.glb', skel: 'assets-src/characters/_rig/Ch45_skeleton.glb', out: 'public/game/characters/counter-terrorists/Cole.glb', tris: 24000, height: 1.8 },
  gasmask: { src: 'assets-src/_retired/characters/gas_mask_guy.glb', skel: 'assets-src/characters/_rig/Ch45_skeleton.glb', out: 'public/game/characters/terrorists/Ghost.glb', tris: 24000, height: 1.8 },
};
const JOB = JOBS[process.argv[2] || 'quantek'];
if (!JOB) throw new Error('job: ' + Object.keys(JOBS).join(' | '));

await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

// ---------------------------------------------------------------- small math
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qinv = (q) => [-q[0], -q[1], -q[2], q[3]];
const qrot = (q, v) => {
  const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), qinv(q));
  return [p[0], p[1], p[2]];
};
const qaxis = (ax, a) => [ax[0] * Math.sin(a / 2), ax[1] * Math.sin(a / 2), ax[2] * Math.sin(a / 2), Math.cos(a / 2)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mmul = (A, B) => {
  const o = new Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) o[c * 4 + r] = A[r] * B[c * 4] + A[4 + r] * B[c * 4 + 1] + A[8 + r] * B[c * 4 + 2] + A[12 + r] * B[c * 4 + 3];
  return o;
};
const xform = (M, v) => [M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12], M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13], M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14]];
const xdir = (M, v) => [M[0] * v[0] + M[4] * v[1] + M[8] * v[2], M[1] * v[0] + M[5] * v[1] + M[9] * v[2], M[2] * v[0] + M[6] * v[1] + M[10] * v[2]];
const rigid = (q, t) => {
  const x = qrot(q, [1, 0, 0]),
    y = qrot(q, [0, 1, 0]),
    z = qrot(q, [0, 0, 1]);
  return [x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, t[0], t[1], t[2], 1];
};
const rigidInv = (q, t) => {
  const qi = qinv(q),
    ti = qrot(qi, t);
  return rigid(qi, [-ti[0], -ti[1], -ti[2]]);
};

// ---------------------------------------------------------------- 1. merge, weld, simplify
const src = await io.read(path.join(ROOT, JOB.src));
let P = [],
  N = [],
  UV = [],
  IDX = [],
  material = null;
for (const node of src.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const M = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    material = material || prim.getMaterial();
    const pos = prim.getAttribute('POSITION'),
      nor = prim.getAttribute('NORMAL'),
      uv = prim.getAttribute('TEXCOORD_0'),
      base = P.length / 3,
      n = pos.getCount();
    for (let i = 0; i < n; i++) {
      P.push(...xform(M, pos.getElement(i, [])));
      const d = nor ? xdir(M, nor.getElement(i, [])) : [0, 1, 0],
        l = Math.hypot(...d) || 1;
      N.push(d[0] / l, d[1] / l, d[2] / l);
      const t = uv ? uv.getElement(i, []) : [0, 0];
      UV.push(t[0], t[1]);
    }
    const ind = prim.getIndices();
    if (ind) for (let i = 0; i < ind.getCount(); i++) IDX.push(base + ind.getScalar(i));
    else for (let i = 0; i < n; i++) IDX.push(base + i);
  }
}
console.log(`merged: ${P.length / 3} vertices, ${IDX.length / 3} triangles`);
{
  const key = new Map(),
    remap = new Uint32Array(P.length / 3),
    P2 = [],
    N2 = [],
    U2 = [];
  for (let i = 0; i < P.length / 3; i++) {
    const k = P[i * 3].toFixed(5) + ',' + P[i * 3 + 1].toFixed(5) + ',' + P[i * 3 + 2].toFixed(5) + ',' + UV[i * 2].toFixed(4) + ',' + UV[i * 2 + 1].toFixed(4);
    let r = key.get(k);
    if (r === undefined) key.set(k, (r = P2.length / 3)), P2.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]), N2.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]), U2.push(UV[i * 2], UV[i * 2 + 1]);
    remap[i] = r;
  }
  IDX = IDX.map((i) => remap[i]);
  P = P2;
  N = N2;
  UV = U2;
}
{
  const pos = Float32Array.from(P),
    attr = new Float32Array((P.length / 3) * 5);
  for (let i = 0; i < P.length / 3; i++) attr.set([N[i * 3], N[i * 3 + 1], N[i * 3 + 2], UV[i * 2], UV[i * 2 + 1]], i * 5);
  let [ind] = MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(IDX), pos, 3, attr, 5, [0.5, 0.5, 0.5, 1, 1], null, JOB.tris * 3, 0.02, []);
  if (ind.length > JOB.tris * 3 * 1.6) [ind] = MeshoptSimplifier.simplifySloppy(ind, pos, 3, null, JOB.tris * 3, 0.02);
  const used = new Map(),
    P2 = [],
    N2 = [],
    U2 = [];
  IDX = Array.from(ind, (i) => {
    let r = used.get(i);
    if (r === undefined) used.set(i, (r = P2.length / 3)), P2.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]), N2.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]), U2.push(UV[i * 2], UV[i * 2 + 1]);
    return r;
  });
  P = P2;
  N = N2;
  UV = U2;
}
const V = P.length / 3;
console.log(`simplified: ${V} vertices, ${IDX.length / 3} triangles`);
// ---------------------------------------------------------------- 2. turn, stand, centre, scale
{
  let lo = [1e9, 1e9, 1e9],
    hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < V; i++) for (let k = 0; k < 3; k++) (lo[k] = Math.min(lo[k], P[i * 3 + k])), (hi[k] = Math.max(hi[k], P[i * 3 + k]));
  const cx = (lo[0] + hi[0]) / 2,
    cz = (lo[2] + hi[2]) / 2,
    H = hi[1] - lo[1],
    k = JOB.height / H;
  for (let i = 0; i < V; i++) (P[i * 3] = (P[i * 3] - cx) * k), (P[i * 3 + 1] = (P[i * 3 + 1] - lo[1]) * k), (P[i * 3 + 2] = (P[i * 3 + 2] - cz) * k);
  // arms out to the sides: the wider horizontal axis is the shoulders' (x); a model facing sideways is turned
  let x0 = 1e9,
    x1 = -1e9,
    z0 = 1e9,
    z1 = -1e9;
  for (let i = 0; i < V; i++) (x0 = Math.min(x0, P[i * 3])), (x1 = Math.max(x1, P[i * 3])), (z0 = Math.min(z0, P[i * 3 + 2])), (z1 = Math.max(z1, P[i * 3 + 2]));
  console.log(`extent x ${(x1 - x0).toFixed(3)} z ${(z1 - z0).toFixed(3)}`);
  if (z1 - z0 > (x1 - x0) * 1.1)
    for (let i = 0; i < V; i++) {
      const x = P[i * 3],
        z = P[i * 3 + 2],
        nx = N[i * 3],
        nz = N[i * 3 + 2];
      (P[i * 3] = z), (P[i * 3 + 2] = -x), (N[i * 3] = nz), (N[i * 3 + 2] = -nx);
    }
  // toes point forward: the lowest band (soles, toes) reaches further forward than the ankles above it
  let a = 0,
    an = 0,
    b = 0,
    bn = 0;
  for (let i = 0; i < V; i++) {
    const y = P[i * 3 + 1] / JOB.height;
    y < 0.03 ? ((a += P[i * 3 + 2]), an++) : y > 0.06 && y < 0.12 && ((b += P[i * 3 + 2]), bn++);
  }
  const toesFwd = a / an - b / bn;
  if (toesFwd < 0) for (let i = 0; i < V; i++) (P[i * 3] *= -1), (P[i * 3 + 2] *= -1), (N[i * 3] *= -1), (N[i * 3 + 2] *= -1);
  console.log(`height ${H.toFixed(3)} -> ${JOB.height} m, toes ${toesFwd >= 0 ? 'already' : 'turned to'} +Z`);
}
// ---------------------------------------------------------------- --mixamo: a file to rig on mixamo.com
// node tools/build-autorig.mjs <job> --mixamo writes assets-src/characters/mixamo-upload/<job>.zip (OBJ +
// material + colour texture, the simplified model standing at its real height) and stops. Upload that zip to
// mixamo.com, let the Auto-Rigger place the skeleton, download the FBX ("With Skin", T-pose) into
// assets-src/characters/<faction>/ and run node tools/build-characters.mjs: it becomes a normal Mixamo
// character with hand-quality skin weights.
if (process.argv.includes('--mixamo')) {
  const { execFileSync } = await import('node:child_process');
  const dir = path.join(ROOT, 'assets-src/characters/mixamo-upload', process.argv[2]);
  fs.mkdirSync(dir, { recursive: !0 });
  const name = process.argv[2],
    lines = [`mtllib ${name}.mtl`, `o ${name}`];
  for (let i = 0; i < V; i++) lines.push(`v ${P[i * 3].toFixed(5)} ${P[i * 3 + 1].toFixed(5)} ${P[i * 3 + 2].toFixed(5)}`);
  for (let i = 0; i < V; i++) lines.push(`vt ${UV[i * 2].toFixed(5)} ${(1 - UV[i * 2 + 1]).toFixed(5)}`);
  for (let i = 0; i < V; i++) lines.push(`vn ${N[i * 3].toFixed(4)} ${N[i * 3 + 1].toFixed(4)} ${N[i * 3 + 2].toFixed(4)}`);
  lines.push(`usemtl ${name}`);
  for (let t = 0; t < IDX.length; t += 3) {
    const [a, b, c] = [IDX[t] + 1, IDX[t + 1] + 1, IDX[t + 2] + 1];
    lines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
  }
  fs.writeFileSync(path.join(dir, name + '.obj'), lines.join('\n'));
  const tex = material.getBaseColorTexture();
  if (tex) await sharp(Buffer.from(tex.getImage())).resize(2048, 2048, { fit: 'inside' }).png().toFile(path.join(dir, name + '.png'));
  fs.writeFileSync(path.join(dir, name + '.mtl'), `newmtl ${name}\nKd 1 1 1\n${tex ? `map_Kd ${name}.png\n` : ''}`);
  const zip = path.join(ROOT, 'assets-src/characters/mixamo-upload', name + '.zip');
  fs.rmSync(zip, { force: !0 });
  execFileSync('zip', ['-j', '-q', zip, ...fs.readdirSync(dir).map((f) => path.join(dir, f))]);
  console.log(`${path.relative(ROOT, zip)}: ${(fs.statSync(zip).size / 1e6).toFixed(1)} MB, ${IDX.length / 3} triangles, ready for mixamo.com`);
  process.exit(0);
}
// ---------------------------------------------------------------- 3. the skeleton
const sdoc = await io.read(path.join(ROOT, JOB.skel)),
  sJ = sdoc.getRoot().listSkins()[0].listJoints(),
  sParent = new Map();
for (const n of sdoc.getRoot().listNodes()) for (const c of n.listChildren()) sParent.set(c, n);
const bones = sJ.map((j) => ({ name: j.getName(), t: j.getTranslation().slice(), q: j.getRotation().slice(), parent: null, src: j }));
for (const b of bones) b.parent = bones.find((x) => x.src === sParent.get(b.src)) || null;
const byName = (n) => bones.find((b) => b.name === 'mixamorig:' + n);
const world = () => {
  for (const b of bones) {
    const chain = [];
    for (let x = b; x; x = x.parent) chain.unshift(x);
    let q = [0, 0, 0, 1],
      t = [0, 0, 0];
    for (const x of chain) (t = add(t, qrot(q, x.t))), (q = qmul(q, x.q));
    b.wq = q;
    b.wt = t;
  }
};
world();
let mH = 0;
for (let i = 0; i < V; i++) mH = Math.max(mH, P[i * 3 + 1]);
const s = mH / byName('HeadTop_End').wt[1];
for (const b of bones) b.t = b.t.map((v) => v * s);
world();
// A-pose: lower each upper arm to point at the model's hand (the outermost vertices on that side)
for (const [side, sign] of [
  ['Left', 1],
  ['Right', -1],
]) {
  const arm = byName(side + 'Arm'),
    sh = arm.wt;
  let best = null;
  for (let i = 0; i < V; i++) {
    const x = P[i * 3] * sign;
    (!best || x > best[0] * sign) && (best = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
  }
  const ang = Math.atan2(sh[1] - best[1], Math.abs(best[0] - sh[0])),
    R = qaxis([0, 0, 1], -sign * ang),
    pw = arm.parent.wq;
  arm.q = qmul(qinv(pw), qmul(R, qmul(pw, arm.q)));
  world();
  // arm length: the skeleton is a standard character scaled to this one's height, so its arms can be
  // longer or shorter than the model's. Scale the forearm and hand so the fingertip lands on the model's.
  const tip = byName(side + 'HandMiddle4') || byName(side + 'HandMiddle3'),
    reach = Math.hypot(...sub(best, sh)),
    have = Math.hypot(...sub(tip.wt, sh)),
    raw = reach / have,
    // outside 0.9-1.2 the outermost point was not a fingertip (an elbow on a model with bent arms): no change
    r = raw > 0.9 && raw < 1.2 ? raw : 1;
  const fore = byName(side + 'ForeArm');
  // the upper arm keeps its own length up to the elbow; everything below scales with the reach
  const scaleChain = (b, k) => {
    for (const c of bones.filter((x) => x.parent === b)) (c.t = c.t.map((v) => v * k)), scaleChain(c, k);
  };
  fore.t = fore.t.map((v) => v * r);
  scaleChain(fore, r);
  world();
  console.log(`${side} arm lowered ${((ang * 180) / Math.PI).toFixed(1)}° to the hand at ${best.map((v) => v.toFixed(2)).join(', ')}; arm length x${r.toFixed(2)}`);
}
// ---------------------------------------------------------------- 4. weights
const isFinger = (n) => /Hand(Thumb|Index|Middle|Ring|Pinky)/.test(n),
  isEnd = (n) => /_End$/.test(n),
  deform = bones.filter((b) => !isFinger(b.name) && !isEnd(b.name)),
  segEnd = (b) => {
    const kids = bones.filter((x) => x.parent === b && !isFinger(x.name));
    const pref = kids.find((x) => /Spine|Neck|Head|ForeArm|Hand$|Leg$|Foot|ToeBase|Arm$/.test(x.name)) || kids[0];
    return pref ? pref.wt : add(b.wt, qrot(b.wq, [0, 0.08 * s, 0]));
  },
  segs = deform.map((b) => ({ b, a: b.wt, e: b.name.endsWith('Hand') ? add(b.wt, sub(b.wt, bones.find((x) => x.name === b.name.replace('Hand', 'ForeArm')).wt).map((v) => v * 0.6)) : segEnd(b) })),
  hipsY = byName('Hips').wt[1],
  shL = byName('LeftArm').wt,
  group = (n) => (/Left(UpLeg|Leg|Foot|ToeBase)/.test(n) ? 'legL' : /Right(UpLeg|Leg|Foot|ToeBase)/.test(n) ? 'legR' : /Left(Arm|ForeArm|Hand)/.test(n) ? 'armL' : /Right(Arm|ForeArm|Hand)/.test(n) ? 'armR' : 'core');
const JNT = new Uint16Array(V * 4),
  WGT = new Float32Array(V * 4);
const segDist = (k, p) => {
  const { a, e } = segs[k],
    ab = sub(e, a),
    L2 = dot(ab, ab) || 1e-9,
    t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / L2));
  return Math.hypot(...sub(p, add(a, ab.map((v) => v * t))));
};
// limb membership. In the standing pose there is a gap between each arm and the torso (and between a
// hanging hand and the thigh). At every height, the vertices on each side are sorted by their distance
// from the body's centre line; the arm starts beyond the first clear gap (2 cm or more) after the body.
// Measuring distance to the bones instead (the first version) failed on bulky models: the sides of a plate
// carrier are nearer the hanging arm than the spine, so they followed the arm and tore when it moved.
// Around the shoulder (no gap, the arm joins the body) the nearer bone decides.
const ARM = new Int8Array(V),
  dA = new Float32Array(V),
  dB = new Float32Array(V),
  armY = byName('LeftArm').wt[1],
  handLo = Math.min(...['LeftHand', 'RightHand'].map((n) => byName(n).wt[1])) - 0.14 * s,
  band = 0.02,
  cell = 0.01;
for (let i = 0; i < V; i++) {
  const p = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]],
    side = p[0] > 0 ? 'armL' : 'armR';
  let dArm = 1e9,
    dBody = 1e9;
  for (let k = 0; k < segs.length; k++) {
    const g = group(segs[k].b.name),
      d = segDist(k, p);
    g === side ? (dArm = Math.min(dArm, d)) : g !== 'armL' && g !== 'armR' && (dBody = Math.min(dBody, d));
  }
  dA[i] = dArm;
  dB[i] = dBody;
}
for (const sg of [1, -1]) {
  const nb = Math.ceil((armY - handLo) / band) + 1,
    bounds = new Float32Array(nb).fill(Infinity);
  for (let b = 0; b < nb; b++) {
    const y0 = handLo + b * band,
      cnt = new Int32Array(90);
    for (let i = 0; i < V; i++) {
      const y = P[i * 3 + 1],
        u = P[i * 3] * sg;
      if (y < y0 || y >= y0 + band || u <= 0) continue;
      cnt[Math.min(89, Math.floor(u / cell))]++;
    }
    let k = 0;
    while (k < 90 && !cnt[k]) k++; // the gap between the legs at the centre is not the one
    for (; k < 88; k++)
      if (!cnt[k] && !cnt[k + 1]) {
        let rest = 0;
        for (let j = k + 2; j < 90; j++) rest += cnt[j];
        if (rest > 3) bounds[b] = (k + 1) * cell;
        break;
      }
  }
  // a gap seen at one height only is noise: keep the middle of five neighbouring heights
  const med = bounds.map((_, b) => {
    const w = [];
    for (let j = b - 2; j <= b + 2; j++) j >= 0 && j < nb && w.push(bounds[j]);
    w.sort((x, y) => x - y);
    return w[w.length >> 1];
  });
  for (let i = 0; i < V; i++) {
    const y = P[i * 3 + 1],
      u = P[i * 3] * sg;
    if (u <= 0) continue;
    if (y >= handLo && y < armY - 0.03 * s) {
      const b = Math.min(nb - 1, Math.floor((y - handLo) / band));
      ARM[i] = isFinite(med[b]) && u >= med[b] ? 1 : 0;
    } else if (y >= armY - 0.03 * s && y < armY + 0.12 * s) ARM[i] = u > Math.abs(shL[0]) * 0.9 && dA[i] < dB[i] ? 1 : 0;
  }
  console.log(`${sg > 0 ? 'left' : 'right'} arm: gap found at ${med.filter(isFinite).length} of ${nb} heights`);
}
// fallback: inverse distance to the bones of the vertex's limb
for (let i = 0; i < V; i++) {
  const p = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]],
    side = p[0] > 0 ? 'armL' : 'armR',
    onArm = !!ARM[i],
    below = p[1] < hipsY * 0.98,
    cand = [];
  for (let k = 0; k < segs.length; k++) {
    const g = group(segs[k].b.name);
    if (onArm ? g !== side && !/Shoulder|Spine2/.test(segs[k].b.name) : g === 'armL' || g === 'armR') continue;
    if (!onArm && below && ((g === 'legL' && p[0] < -0.02) || (g === 'legR' && p[0] > 0.02))) continue;
    if (!onArm && !below && (g === 'legL' || g === 'legR') && p[1] > hipsY * 1.05) continue;
    cand.push([segDist(k, p), k]);
  }
  cand.sort((x, y) => x[0] - y[0]);
  const top = cand.slice(0, 4),
    d0 = Math.max(top[0][0], 0.01 * s);
  let w = top.map(([d]) => 1 / Math.pow(Math.max(d, d0 * 0.5) / d0, 4)),
    sum = w.reduce((x, y) => x + y, 0);
  w = w.map((x) => x / sum);
  top.forEach(([, k], j) => ((JNT[i * 4 + j] = bones.indexOf(segs[k].b)), (WGT[i * 4 + j] = w[j])));
}
// weights copied from the Mixamo character, posed like this model, within the same limb
{
  const sNode = sdoc.getRoot().listNodes().find((n) => n.getMesh() && n.getSkin()),
    sSkin = sNode.getSkin(),
    sIBM = sSkin.getInverseBindMatrices(),
    sJoints = sSkin.listJoints(),
    JM = sJoints.map((j, i) => mmul(rigid(bones.find((x) => x.src === j).wq, bones.find((x) => x.src === j).wt), sIBM.getElement(i, []))),
    SP = [],
    SJ = [],
    SW = [],
    SG = [];
  for (const prim of sNode.getMesh().listPrimitives()) {
    const pos = prim.getAttribute('POSITION'),
      jj = prim.getAttribute('JOINTS_0'),
      ww = prim.getAttribute('WEIGHTS_0');
    for (let i = 0; i < pos.getCount(); i++) {
      const v = pos.getElement(i, []),
        j = jj.getElement(i, []),
        w = ww.getElement(i, []),
        o = [0, 0, 0];
      let ws = 0,
        top = 0;
      for (let k = 0; k < 4; k++) {
        if (!w[k]) continue;
        const t = xform(JM[j[k]], v);
        (o[0] += w[k] * t[0]), (o[1] += w[k] * t[1]), (o[2] += w[k] * t[2]), (ws += w[k]);
        w[k] > w[top] && (top = k);
      }
      if (!ws) continue;
      SP.push(o[0] / ws, o[1] / ws, o[2] / ws);
      SJ.push(j);
      SW.push(w.map((x) => x / ws));
      SG.push(group(sJoints[j[top]].getName()));
    }
  }
  const C = 0.04,
    grid = new Map(),
    key = (x, y, z) => x + ',' + y + ',' + z;
  for (let i = 0; i < SP.length / 3; i++) {
    const k = key(Math.floor(SP[i * 3] / C), Math.floor(SP[i * 3 + 1] / C), Math.floor(SP[i * 3 + 2] / C));
    (grid.get(k) || grid.set(k, []).get(k)).push(i);
  }
  let copied = 0;
  for (let i = 0; i < V; i++) {
    const p = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]],
      side = p[0] > 0 ? 'armL' : 'armR',
      onArm = !!ARM[i],
      below = p[1] < hipsY * 0.98,
      // the top of the arm blends into the shoulder and chest
      ok = (g) => (onArm ? g === side || (p[1] > armY - 0.1 * s && g === 'core') : g !== 'armL' && g !== 'armR' && !(below && ((g === 'legL' && p[0] < -0.02) || (g === 'legR' && p[0] > 0.02)))),
      cx = Math.floor(p[0] / C),
      cy = Math.floor(p[1] / C),
      cz = Math.floor(p[2] / C),
      found = [];
    for (let r = 0; r <= 8 && found.length < 6; r++) {
      found.length = 0;
      for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++)
          for (let dz = -r; dz <= r; dz++)
            for (const j of grid.get(key(cx + dx, cy + dy, cz + dz)) || []) ok(SG[j]) && found.push([Math.hypot(SP[j * 3] - p[0], SP[j * 3 + 1] - p[1], SP[j * 3 + 2] - p[2]), j]);
    }
    if (!found.length) continue;
    found.sort((a, b) => a[0] - b[0]);
    const acc = new Map();
    for (const [d, j] of found.slice(0, 6)) {
      const f = 1 / (d + 0.004) ** 2;
      for (let k = 0; k < 4; k++) SW[j][k] && acc.set(SJ[j][k], (acc.get(SJ[j][k]) || 0) + f * SW[j][k]);
    }
    const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
      sum = top.reduce((a, [, w]) => a + w, 0);
    for (let k = 0; k < 4; k++) (JNT[i * 4 + k] = top[k] ? top[k][0] : 0), (WGT[i * 4 + k] = top[k] ? top[k][1] / sum : 0);
    copied++;
  }
  console.log(`weights copied from ${path.basename(JOB.skel)} for ${copied} of ${V} vertices (${SP.length / 3} source points)`);
}
// smoothing: neighbouring vertices must not follow very different bones, or the surface tears between
// them when the skeleton moves (the belt following a thigh while the shirt above follows the spine). The
// weights are averaged with their neighbours along the mesh's edges a few times, as a rigger's "smooth
// weights" does. Arms and torso are only connected at the shoulder (the gap keeps them apart lower down),
// where the blend is what a real shoulder needs.
{
  const adj = Array.from({ length: V }, () => new Set());
  for (let t = 0; t < IDX.length; t += 3) for (const [x, y] of [[IDX[t], IDX[t + 1]], [IDX[t + 1], IDX[t + 2]], [IDX[t + 2], IDX[t]]]) x !== y && (adj[x].add(y), adj[y].add(x));
  // vertices at the same position (UV seams) are one point of the surface: join them too
  const pos = new Map();
  for (let i = 0; i < V; i++) {
    const k = Math.round(P[i * 3] * 2000) + ',' + Math.round(P[i * 3 + 1] * 2000) + ',' + Math.round(P[i * 3 + 2] * 2000);
    const o = pos.get(k);
    o === undefined ? pos.set(k, i) : (adj[i].add(o), adj[o].add(i));
  }
  let W = Array.from({ length: V }, (_, i) => {
    const m = new Map();
    for (let k = 0; k < 4; k++) WGT[i * 4 + k] > 0 && m.set(JNT[i * 4 + k], WGT[i * 4 + k]);
    return m;
  });
  for (let it = 0; it < 8; it++) {
    const N2 = W.map((m, i) => {
      const o = new Map();
      for (const [b, w] of m) o.set(b, w * 0.5);
      const nn = adj[i].size;
      if (!nn) return m;
      for (const j of adj[i]) {
        for (const [b, w] of W[j]) o.set(b, (o.get(b) || 0) + (w * 0.5) / nn);
      }
      return o;
    });
    W = N2;
  }
  for (let i = 0; i < V; i++) {
    const top = [...W[i].entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
      sum = top.reduce((a, [, w]) => a + w, 0) || 1;
    for (let k = 0; k < 4; k++) (JNT[i * 4 + k] = top[k] ? top[k][0] : 0), (WGT[i * 4 + k] = top[k] ? top[k][1] / sum : 0);
  }
  console.log('weights smoothed along the surface');
}
// ---------------------------------------------------------------- 5. write
const doc = new Document(),
  buf = doc.createBuffer();
doc.createScene('Scene');
const nodes = bones.map((b) => doc.createNode(b.name).setTranslation(b.t).setRotation(b.q));
bones.forEach((b, i) => b.parent && nodes[bones.indexOf(b.parent)].addChild(nodes[i]));
const rootNode = doc.createNode('RootNode');
bones.forEach((b, i) => !b.parent && rootNode.addChild(nodes[i]));
const ibm = new Float32Array(bones.length * 16);
bones.forEach((b, i) => ibm.set(rigidInv(b.wq, b.wt), i * 16));
const skin = doc.createSkin('skin').setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf)).setSkeleton(nodes[bones.findIndex((b) => !b.parent)]);
nodes.forEach((n) => skin.addJoint(n));
const mat = doc.createMaterial(material.getName() || 'character');
const copyTex = (t) => t && doc.createTexture(t.getName()).setImage(t.getImage()).setMimeType(t.getMimeType());
mat.setBaseColorFactor(material.getBaseColorFactor()).setMetallicFactor(Math.min(0.2, material.getMetallicFactor())).setRoughnessFactor(Math.max(0.6, material.getRoughnessFactor()));
material.getBaseColorTexture() && mat.setBaseColorTexture(copyTex(material.getBaseColorTexture()));
material.getNormalTexture() && mat.setNormalTexture(copyTex(material.getNormalTexture()));
material.getMetallicRoughnessTexture() && mat.setMetallicRoughnessTexture(copyTex(material.getMetallicRoughnessTexture()));
const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
const prim = doc
  .createPrimitive()
  .setAttribute('POSITION', acc('VEC3', Float32Array.from(P)))
  .setAttribute('NORMAL', acc('VEC3', Float32Array.from(N)))
  .setAttribute('TEXCOORD_0', acc('VEC2', Float32Array.from(UV)))
  .setAttribute('JOINTS_0', acc('VEC4', JNT))
  .setAttribute('WEIGHTS_0', acc('VEC4', WGT))
  .setIndices(acc('SCALAR', Uint32Array.from(IDX)))
  .setMaterial(mat);
const meshNode = doc.createNode('character').setMesh(doc.createMesh('character').addPrimitive(prim)).setSkin(skin);
doc.getRoot().listScenes()[0].addChild(rootNode).addChild(meshNode);
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor|normal)/, resize: [1024, 1024], quality: 84 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(metallicRoughness)/, resize: [512, 512], quality: 82 }),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
  prune(),
);
await io.write(path.join(ROOT, JOB.out), doc);
console.log(`${JOB.out}: ${(fs.statSync(path.join(ROOT, JOB.out)).size / 1e6).toFixed(2)} MB, ${IDX.length / 3} triangles, ${bones.length} bones`);
