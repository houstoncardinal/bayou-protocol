// The phone set of models: every shipped model with textures gets a copy beside it, `<name>.k2.glb`, whose
// textures are GPU-compressed (KTX2 / Basis Universal ETC1S, KHR_texture_basisu). A phone transcodes them in a
// worker straight into the format its graphics chip reads (ASTC on iPhones, ETC2 on Android): no image decode or
// downscaling on the main thread while a map loads, and a quarter of the memory per pixel. Sizes for phones:
// colour textures (base colour, emissive) at most 1024 px, the rest (normal, roughness, metalness, occlusion...)
// at most 512 px: twice the detail phones had (512 / 256, scaled down on the device), in the same memory.
// Desktops keep the original files. The list of converted models goes to public/game/ktx2.json (the game reads
// it to know which models have a phone copy).
//
//   node tools/build-ktx2.mjs            convert what is new or changed (encoded textures are cached by content)
//   node tools/build-ktx2.mjs --force    convert everything again
//   node tools/build-ktx2.mjs --only=x   only the models whose path contains x (the manifest then lists only those)
// Needs `basisu` (brew install basis_universal).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureBasisu } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const run = promisify(execFile);
const ROOT = path.resolve('public/game');
const CACHE = path.resolve('node_modules/.cache/ktx2');
const FORCE = process.argv.includes('--force'),
  ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const CAP = { color: 1024, aux: 512 };
const JOBS = Math.max(2, Math.min(6, Math.floor(os.cpus().length / 2)));

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync(CACHE, { recursive: true });

const files = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.glb') && !p.endsWith('.k2.glb') && files.push(p);
  }
};
walk(ROOT);
ONLY && files.splice(0, files.length, ...files.filter((f) => f.includes(ONLY)));

// what each texture is used as: colour (sRGB), normal map, or other data (linear)
function roles(doc) {
  const r = new Map();
  const set = (t, k) => t && (r.get(t) === 'normal' || r.get(t) === 'color' ? 0 : r.set(t, k));
  for (const m of doc.getRoot().listMaterials()) {
    m.getNormalTexture() && r.set(m.getNormalTexture(), 'normal');
    set(m.getBaseColorTexture(), 'color');
    set(m.getEmissiveTexture(), 'color');
    set(m.getMetallicRoughnessTexture(), 'data');
    set(m.getOcclusionTexture(), 'data');
    for (const ext of m.listExtensions()) for (const k of Object.getOwnPropertyNames(Object.getPrototypeOf(ext))) {
      if (!/^get.*Texture$/.test(k)) continue;
      try {
        const t = ext[k]();
        t && set(t, /Color|Sheen(?!Roughness)|Specular(Color)/.test(k) ? 'color' : 'data');
      } catch {}
    }
  }
  return r;
}

// one texture to KTX2 (cached by its bytes, role and size cap)
async function encode(bytes, role, flip = !1) {
  const cap = role === 'color' ? CAP.color : CAP.aux;
  const key = crypto.createHash('sha1').update(bytes).update(role + cap + (flip ? 'f' : '') + 'v1').digest('hex');
  const out = path.join(CACHE, key + '.ktx2');
  if (fs.existsSync(out)) return fs.readFileSync(out);
  const tmp = path.join(CACHE, key + '.png');
  let img = sharp(Buffer.from(bytes));
  const meta = await img.metadata();
  if (Math.max(meta.width, meta.height) > cap) img = img.resize({ width: meta.width >= meta.height ? cap : null, height: meta.height > meta.width ? cap : null });
  await img.png().toFile(tmp);
  const args = ['-ktx2', '-etc1s', '-quality', '95', '-effort', '5', '-mipmap', '-no_multithreading'];
  role === 'color' ? args.push('-srgb') : args.push('-linear');
  role === 'normal' && args.push('-normal_map', '-mip_renorm');
  flip && args.push('-y_flip');
  args.push('-file', tmp, '-output_file', out);
  try {
    await run('basisu', args, { maxBuffer: 64 * 1024 * 1024 });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  return fs.readFileSync(out);
}

// a small pool of encoder processes
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

const manifest = [];
let converted = 0,
  skipped = 0,
  texN = 0,
  inMB = 0,
  outMB = 0;
const t0 = Date.now();
for (const f of files) {
  const rel = path.relative(ROOT, f).split(path.sep).join('/'),
    dst = f.replace(/\.glb$/, '.k2.glb');
  let doc;
  try {
    doc = await io.read(f);
  } catch (e) {
    console.log('skip (unreadable)', rel, e.message);
    continue;
  }
  const texs = doc.getRoot().listTextures().filter((t) => t.getImage() && /image\/(png|jpeg|webp)/.test(t.getMimeType()));
  if (!texs.length) continue;
  manifest.push(rel);
  if (!FORCE && fs.existsSync(dst) && fs.statSync(dst).mtimeMs > fs.statSync(f).mtimeMs) {
    skipped++;
    continue;
  }
  const R = roles(doc);
  await pool(texs, JOBS, async (t) => {
    const img = t.getImage();
    inMB += img.byteLength / 1048576;
    const k = await encode(img, R.get(t) || 'data');
    outMB += k.byteLength / 1048576;
    t.setImage(new Uint8Array(k)).setMimeType('image/ktx2');
    texN++;
  });
  doc.createExtension(KHRTextureBasisu).setRequired(true);
  for (const e of doc.getRoot().listExtensionsUsed()) e.extensionName === 'EXT_texture_webp' && e.dispose();
  await io.write(dst, doc);
  converted++;
  console.log(`${rel}  ${texs.length} textures  ${(fs.statSync(f).size / 1048576).toFixed(1)} -> ${(fs.statSync(dst).size / 1048576).toFixed(1)} MB`);
}
manifest.sort();
// ---------------------------------------------------------------- loose textures of the built maps (maps/*/tex)
// Loaded by 65-prison-view.js (__prTex) as images flipped on decode: their KTX2 copies are encoded flipped
// (a compressed texture cannot be flipped as it is uploaded). The colour ones' mean brightness, which the game
// measured from the decoded image, is worked out here (the same 16 x 16 average of luminance ^ 2.2).
const loose = {};
let looseN = 0;
const texDirs = fs.readdirSync(path.join(ROOT, 'maps')).map((d) => path.join(ROOT, 'maps', d, 'tex')).filter((d) => fs.existsSync(d));
const looseFiles = [];
for (const d of texDirs) for (const f of fs.readdirSync(d)) /\.(webp|png|jpe?g)$/.test(f) && looseFiles.push(path.join(d, f));
await pool(looseFiles.filter((f) => !ONLY || f.includes(ONLY)), JOBS, async (f) => {
  const base = f.replace(/\.(webp|png|jpe?g)$/, ''),
    rel = path.relative(ROOT, base).split(path.sep).join('/'),
    role = /_nor$/.test(base) ? 'normal' : /_diff$|_col(or)?$|_albedo$/.test(base) ? 'color' : 'data',
    bytes = fs.readFileSync(f),
    k = await encode(bytes, role, !0);
  fs.writeFileSync(base + '.ktx2', k);
  const e = {};
  if (role === 'color') {
    const { data } = await sharp(bytes).resize(16, 16, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: !0 });
    let m = 0;
    for (let i = 0; i < data.length; i += 3) m += Math.pow((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255, 2.2);
    e.mean = +(m / 256).toFixed(5);
  }
  loose[rel] = e;
  looseN++;
});
fs.writeFileSync(path.join(ROOT, 'ktx2.json'), JSON.stringify({ v: 1, caps: CAP, models: manifest, tex: Object.fromEntries(Object.entries(loose).sort()) }, null, 1) + '\n');
console.log(`${looseN} loose map textures`);
console.log(`\n${converted} converted, ${skipped} up to date, ${manifest.length} in the phone set; ${texN} textures ${inMB.toFixed(0)} MB -> ${outMB.toFixed(0)} MB; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
