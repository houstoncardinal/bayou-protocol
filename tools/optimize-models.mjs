// Compress every shipped model's geometry and animation with meshopt (EXT_meshopt_compression + quantised
// vertices, KHR_mesh_quantization), after removing duplicate data. Visually lossless: positions keep 14+ bits
// over each mesh's own bounds (well under a millimetre on a gun or a character), normals 10 bits, UVs 14
// bits, skin weights 8 bits. Textures are left as they are (already WebP at sensible sizes).
// The game registers the meshopt decoder with every model loader (src/mods/42-smooth.js).
//
//   node tools/optimize-models.mjs                 every .glb under public/game
//   node tools/optimize-models.mjs file.glb ...    just these
// Files already using meshopt compression are skipped, so it is safe to run again after adding models.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const walk = (d) => fs.readdirSync(d, { withFileTypes: !0 }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.glb') ? [path.join(d, e.name)] : []));
const files = process.argv.slice(2).length ? process.argv.slice(2) : walk(path.join(ROOT, 'public/game'));
let before = 0,
  after = 0;
for (const f of files) {
  const doc = await io.read(f);
  if (doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === 'EXT_meshopt_compression')) continue;
  const b = fs.statSync(f).size;
  await doc.transform(dedup(), meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16, quantizeTexcoord: 14, quantizeNormal: 10 }), prune());
  await io.write(f, doc);
  const a = fs.statSync(f).size;
  before += b;
  after += a;
  console.log(`${path.relative(ROOT, f)}: ${(b / 1e6).toFixed(2)} -> ${(a / 1e6).toFixed(2)} MB`);
}
console.log(`total ${(before / 1e6).toFixed(1)} -> ${(after / 1e6).toFixed(1)} MB`);
