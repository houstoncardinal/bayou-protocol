// node simplify_parts.mjs in.glb out.glb '{"trunk":1200,"branches":1500,"*":3000}' [texSize] [--nocompress]
// Simplifies each mesh to a target triangle count chosen by substring match on the mesh/node name.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive, dedup, prune, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const [inp, out, targetsJson, texArg, flag] = process.argv.slice(2);
const targets = JSON.parse(targetsJson); const tex = parseInt(texArg || '0');
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(inp);
await doc.transform(weld({ tolerance: 0.0001 }));
let before = 0, after = 0;
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const nm = (node.getName() + ' ' + mesh.getName()).toLowerCase();
  let target = targets['*'] ?? null;
  for (const [k, v] of Object.entries(targets)) if (k !== '*' && nm.includes(k)) target = v;
  for (const prim of mesh.listPrimitives()) {
    const n = prim.getIndices() ? prim.getIndices().getCount() / 3 : prim.getAttribute('POSITION').getCount() / 3;
    before += n;
    if (target && n > target) {
      let ratio = target / n, err = 0.01;
      for (let it = 0; it < 6; it++) {
        simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio, error: err, lockBorder: false });
        const m = prim.getIndices().getCount() / 3;
        if (m <= target * 1.3) break;
        err *= 3;
      }
    }
    after += prim.getIndices() ? prim.getIndices().getCount() / 3 : prim.getAttribute('POSITION').getCount() / 3;
  }
}
await doc.transform(dedup(), prune());
if (tex) await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [tex, tex], quality: 86 }));
if (flag !== '--nocompress') await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(out, doc);
console.log(out.split('/').pop().padEnd(34), 'tris', Math.round(before), '->', Math.round(after));
