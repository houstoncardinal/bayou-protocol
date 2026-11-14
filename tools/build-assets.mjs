// Build game-ready copies of downloaded models (props, extra characters, masks, first-person arms).
//
//   node tools/build-assets.mjs            everything in JOBS
//   node tools/build-assets.mjs crates     only jobs whose name contains "crates"
//
// Per job: duplicate data removed, textures resized (colour/normal to `tex` px, roughness/AO to half) and
// stored as WebP, meshes over `maxTris` simplified (`err`: how far the simplifier may move the surface,
// relative to the model's size), animation keys resampled, then meshopt-compressed (decoded in the game by
// the loader, see src/mods/42-smooth.js). Sources stay in assets-src/ (not shipped).
//   specGloss   materials use the retired KHR_materials_pbrSpecularGlossiness extension (three.js shows them
//               plain white): converted to metal/roughness
//   dropMat     meshes whose material name matches are removed (a pistol modelled into a character's hand)
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, resample, meshopt, metalRough } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const JOBS = [
  // props (49-crates.js)
  { name: 'crate-box', src: 'assets-src/props/crate_box.glb', out: 'public/game/models/props/crate-box.glb', tex: 1024 },
  { name: 'crates-barrels', src: 'assets-src/props/crates_and_barrels.glb', out: 'public/game/models/props/crates-barrels.glb', tex: 1024 },
  { name: 'crates-tnt', src: 'assets-src/props/tnt_crate.glb', out: 'public/game/models/props/tnt-crate.glb', tex: 1024, maxTris: 3000, err: 0.06 },
  { name: 'crates-secure', src: 'assets-src/props/secure_box_crates_type_a.glb', out: 'public/game/models/props/secure-crates.glb', tex: 1024, maxTris: 7000, err: 0.04 },
  // characters
  // the pistol modelled in its hand is dropped (the game puts the real weapon there)
  { name: 'terrorist-dj', src: 'assets-src/characters/terrorist_djmaesen.glb', out: 'public/game/characters/terrorists/terrorist-djmaesen.glb', tex: 1024, specGloss: !0, dropMat: /pistol3rd/ },
  // masks for the Terrorists (fitted to each head at runtime, 37-characters.js)
  { name: 'mask-balaclava', src: 'assets-src/characters/masks/knitted_ski_mask__ribbed_knit_balaclava.glb', out: 'public/game/characters/masks/balaclava.glb', tex: 1024, maxTris: 9000, err: 0.02 },
  // first-person arms on the gun models (52-fp-arms.js)
  { name: 'arms6', src: 'assets-src/weapons/arms6.glb', out: 'public/game/models/weapons/arms6.glb', tex: 2048 },
];
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const tris = (doc) => {
  let t = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
  return Math.round(t);
};
const only = process.argv[2];
for (const j of JOBS) {
  if (only && !j.name.includes(only)) continue;
  const src = path.join(ROOT, j.src),
    out = path.join(ROOT, j.out);
  if (!fs.existsSync(src)) {
    console.log(`${j.name}: ${j.src} missing, skipped`);
    continue;
  }
  const doc = await io.read(src),
    t0 = tris(doc);
  if (j.specGloss) {
    await doc.transform(metalRough());
    // the conversion adds an index of refraction of 1000 and a specular layer, which read as chrome here
    for (const m of doc.getRoot().listMaterials()) m.setExtension('KHR_materials_ior', null), m.setExtension('KHR_materials_specular', null), m.setRoughnessFactor(1);
  }
  if (j.dropMat)
    for (const n of doc.getRoot().listNodes()) {
      const m = n.getMesh();
      m && m.listPrimitives().every((p) => j.dropMat.test(p.getMaterial()?.getName() || '')) && (n.setMesh(null), m.dispose());
    }
  await doc.transform(dedup(), weld());
  if (j.maxTris && tris(doc) > j.maxTris) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: j.maxTris / tris(doc), error: j.err || 0.01 }));
  // sloppy: the simplifier may ignore the topology (for small accessories whose seams stop the normal one)
  if (j.sloppy && tris(doc) > j.maxTris * 1.3) {
    const r = j.maxTris / tris(doc);
    for (const m of doc.getRoot().listMeshes())
      for (const p of m.listPrimitives()) {
        const ind = p.getIndices(),
          pos = p.getAttribute('POSITION');
        if (!ind || !pos) continue;
        const P = new Float32Array(pos.getCount() * 3);
        for (let i = 0; i < pos.getCount(); i++) P.set(pos.getElement(i, []), i * 3);
        const [out] = MeshoptSimplifier.simplifySloppy(new Uint32Array(ind.getArray()), P, 3, null, Math.max(3, Math.floor((ind.getCount() * r) / 3) * 3), 0.05);
        ind.setArray(out);
      }
    await doc.transform(prune());
  }
  await doc.transform(
    resample({ tolerance: 1e-4 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor|normal|emissive)/, resize: [j.tex, j.tex], quality: 84 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(metallicRoughness|occlusion|specular|sheen|clearcoat|transmission)/, resize: [j.tex / 2, j.tex / 2], quality: 82 }),
    // skinned models: one quantization volume for the whole scene. Per-mesh volumes are compensated in the
    // inverse bind matrices, which breaks when meshes of different sizes share one skin
    meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16, quantizeTexcoord: 14, quantizeNormal: 10, quantizationVolume: doc.getRoot().listSkins().length ? 'scene' : 'mesh' }),
    prune(),
  );
  fs.mkdirSync(path.dirname(out), { recursive: !0 });
  await io.write(out, doc);
  console.log(`${j.name}: ${(fs.statSync(src).size / 1e6).toFixed(1)} MB -> ${(fs.statSync(out).size / 1e6).toFixed(2)} MB, ${t0} -> ${tris(doc)} triangles`);
}
