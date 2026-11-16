// Download the Frostline map's Poly Haven assets (all CC0) and build game-ready copies.
//
//   node tools/fetch-polyhaven.mjs          everything below (skips files already downloaded)
//
// Sources (as downloaded, not shipped): assets-src/maps/frostline/
// Output (shipped):                     public/game/maps/frostline/
//   tex/<id>_{diff,nor,rough}.webp      tiling textures (2048 px for the ground and cliffs, 1024 for the rest)
//   models/<id>.glb                     models: simplified to a triangle budget (plants: whole cards kept
//                                       at random, enlarged; their alpha mask merged in), textures 1024 px
//                                       WebP, meshopt-compressed (decoded in the game by 42-smooth.js)
//   sky.webp                            the sky panorama (tonemapped from the HDRI, 4096 x 2048)
// Poly Haven's API: https://api.polyhaven.com (files/<id> lists every download of an asset).
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'assets-src/maps/frostline');
const OUT = path.join(ROOT, 'public/game/maps/frostline');
const TEXTURES = {
  snow_02: 2048, // the snowfield and snow caps
  rock_face: 2048, // cliffs and rock walls (greyed to granite in the shader)
  brown_planks_05: 1024, // timber: huts, walkways, crates
  blue_metal_plate: 1024, // station walls, containers
  weathered_plank_siding: 1024, // the log cabins' walls
  rustic_stone_wall: 1024, // cabin footings and chimneys
  roof_planks: 1024, // cabin roofs (under the snow)
};
// model: triangle budget (the trees are scans with 100k+ triangles)
const MODELS = {
  rock_face_02: 5000,
  old_military_crate: 2500,
  wooden_crate_02: 2000,
  barrel_03: 2500,
  metal_jerrycan: 1500,
  portable_generator: 4000,
  portable_searchlight: 3000,
  dead_tree_trunk: 3000,
  street_lamp_02: 3000, // lamp posts the Christmas lights hang from
  wooden_lantern_01: 2500,
  barrel_stove: 3000,
  stone_fire_pit: 4000,
  wooden_barrels_01: 4000,
  cardboard_box_01: 800,
  ammo_box: 1500,
  wooden_crate_01: 2000,
  tree_stump_01: 2500,
  wooden_bucket_01: 1500,
};
const SKY = 'snowy_hillside';

const api = async (id) => (await fetch('https://api.polyhaven.com/files/' + id)).json();
async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: !0 });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
fs.mkdirSync(path.join(OUT, 'tex'), { recursive: !0 });
fs.mkdirSync(path.join(OUT, 'models'), { recursive: !0 });

// ---------------------------------------------------------------- textures
for (const [id, px] of Object.entries(TEXTURES)) {
  const f = await api(id),
    res = px >= 2048 ? '2k' : '1k';
  for (const [key, out] of [['Diffuse', 'diff'], ['nor_gl', 'nor'], ['Rough', 'rough']]) {
    const src = path.join(SRC, 'tex', `${id}_${out}_${res}.jpg`);
    await download(f[key][res].jpg.url, src);
    const dst = path.join(OUT, 'tex', `${id}_${out}.webp`);
    // roughness at half size: it is low-frequency
    await sharp(src)
      .resize(out === 'rough' ? px / 2 : px)
      .webp({ quality: out === 'nor' ? 90 : 84 })
      .toFile(dst);
  }
  console.log(`texture ${id}: ${['diff', 'nor', 'rough'].map((o) => (fs.statSync(path.join(OUT, 'tex', `${id}_${o}.webp`)).size / 1e3).toFixed(0) + ' kB').join(', ')}`);
}

// ---------------------------------------------------------------- sky
{
  const f = await api(SKY),
    src = path.join(SRC, SKY + '.jpg');
  await download(f.tonemapped.url, src);
  await sharp(src).resize(4096, 2048).webp({ quality: 82 }).toFile(path.join(OUT, 'sky.webp'));
  console.log(`sky ${SKY}: ${(fs.statSync(path.join(OUT, 'sky.webp')).size / 1e6).toFixed(2)} MB`);
}

// ---------------------------------------------------------------- models
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const tris = (doc) => {
  let t = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
  return Math.round(t);
};
for (const [id, budget] of Object.entries(MODELS)) {
  const f = await api(id),
    g = f.gltf['1k'].gltf,
    dir = path.join(SRC, 'models', id),
    main = path.join(dir, path.basename(new URL(g.url).pathname));
  await download(g.url, main);
  for (const [rel, inc] of Object.entries(g.include || {})) await download(inc.url, path.join(dir, rel));
  const doc = await io.read(main),
    t0 = tris(doc);
  // plants: Poly Haven keeps the cut-out mask as a separate <part>_alpha image the glTF does not use; it is
  // merged into the colour texture's alpha here, and the material set to alpha-test (MASK)
  for (const m of doc.getRoot().listMaterials()) {
    if (m.getAlphaMode() === 'OPAQUE' || !m.getBaseColorTexture()) continue;
    const part = m.getName().replace(id + '_', ''),
      key = Object.keys(f).find((k) => k === part + '_alpha');
    if (!key) continue;
    const src = path.join(dir, 'alpha', key + '.jpg');
    await download(f[key]['1k'].jpg.url, src);
    const tex = m.getBaseColorTexture(),
      rgb = sharp(Buffer.from(tex.getImage())),
      { width, height } = await rgb.metadata(),
      alpha = await sharp(src).resize(width, height).greyscale().raw().toBuffer();
    tex.setImage(new Uint8Array(await rgb.joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer())).setMimeType('image/png');
    m.setAlphaMode('MASK').setAlphaCutoff(0.4);
  }
  await doc.transform(dedup(), weld());
  // foliage (alpha-tested cards): the simplifier would collapse each card to a sliver, so instead whole
  // cards are kept at random down to the budget, and every kept card is enlarged round its own centre to
  // fill the crown as densely as before. Everything else is simplified normally below.
  const foliage = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).filter((p) => p.getMaterial() && p.getMaterial().getAlphaMode() !== 'OPAQUE');
  if (foliage.length) {
    const ftris = foliage.reduce((a, p) => a + p.getIndices().getCount() / 3, 0),
      keep = Math.min(1, (budget * 0.85) / ftris),
      grow = Math.min(3.2, Math.sqrt(1 / keep));
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const p of foliage) {
      const idx = p.getIndices().getArray(),
        pos = p.getAttribute('POSITION'),
        n = pos.getCount(),
        par = new Int32Array(n).map((_, i) => i),
        find = (x) => {
          while (par[x] !== x) x = par[x] = par[par[x]];
          return x;
        };
      for (let t = 0; t < idx.length; t += 3) for (const k of [1, 2]) { const a = find(idx[t]), b = find(idx[t + k]); a !== b && (par[a] = b); }
      // one decision per card (connected piece)
      const keepCard = new Map(),
        out = [];
      for (let t = 0; t < idx.length; t += 3) {
        const c = find(idx[t]);
        keepCard.has(c) || keepCard.set(c, rnd() < keep);
        keepCard.get(c) && out.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      // enlarge kept cards round their centres
      const sum = new Map(), v = [];
      for (const i of new Set(out)) { const c = find(i), e = sum.get(c) || [0, 0, 0, 0]; pos.getElement(i, v); e[0] += v[0]; e[1] += v[1]; e[2] += v[2]; e[3]++; sum.set(c, e); }
      for (const i of new Set(out)) { const e = sum.get(find(i)); pos.getElement(i, v); pos.setElement(i, [0, 1, 2].map((k) => e[k] / e[3] + (v[k] - e[k] / e[3]) * grow)); }
      p.getIndices().setArray(n > 65535 ? new Uint32Array(out) : new Uint16Array(out));
    }
    await doc.transform(prune());
    console.log(`  ${id}: foliage ${ftris} -> ${Math.round(foliage.reduce((a, p) => a + p.getIndices().getCount() / 3, 0))} triangles (cards x${grow.toFixed(2)})`);
  }
  // a careful pass first, then a looser one if the shape still has too many triangles (scanned rocks, trees)
  if (!foliage.length) for (const error of [0.01, 0.05, 0.12]) tris(doc) > budget * 1.25 && (await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: budget / tris(doc), error })));
  else {
    // plants: trunks and branches simplified primitive by primitive (the cards are left alone)
    const rest = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).filter((p) => !foliage.includes(p)),
      restTris = rest.reduce((a, p) => a + p.getIndices().getCount() / 3, 0),
      target = Math.max(1, budget * 0.15);
    if (restTris > target * 1.25)
      for (const p of rest) {
        const ind = p.getIndices(),
          P = p.getAttribute('POSITION'),
          pos = new Float32Array(P.getCount() * 3);
        for (let i = 0; i < P.getCount(); i++) pos.set(P.getElement(i, []), i * 3);
        const want = Math.max(3, Math.floor(((ind.getCount() * target) / restTris) / 3) * 3),
          [out] = MeshoptSimplifier.simplify(new Uint32Array(ind.getArray()), pos, 3, want, 0.08);
        ind.setArray(P.getCount() > 65535 ? out : new Uint16Array(out));
      }
    await doc.transform(prune());
  }
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor|normal|emissive)/, resize: [1024, 1024], quality: 84 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(metallicRoughness|occlusion)/, resize: [512, 512], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    prune(),
  );
  const out = path.join(OUT, 'models', id + '.glb');
  await io.write(out, doc);
  console.log(`model ${id}: ${t0} -> ${tris(doc)} triangles, ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`);
}
let total = 0;
const walk = (d) => fs.readdirSync(d).forEach((f) => (fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : (total += fs.statSync(path.join(d, f)).size)));
walk(OUT);
console.log(`public/game/maps/frostline: ${(total / 1e6).toFixed(1)} MB`);
