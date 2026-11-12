// Simplify the heavy meshes in the shipped vegetation models (trunks, cactus bodies). Leaf and flower cards
// are left as they are. Backdrop trees are never seen up close, so ~2.5k triangles per trunk is plenty.
//   node tools/optimize-vegetation.mjs [file.glb ...]   (default: conifer.glb and cacti.glb)
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive, prune, dedup } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['conifer.glb', 'cacti.glb'].map((f) => path.join(ROOT, 'public/game/models/veg', f));
const ERR = +(process.env.VEG_ERROR || 0.02),
  TARGET = 2500,
  MIN = 4000;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
await MeshoptSimplifier.ready;
const tris = (p) => (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
for (const f of files) {
  const doc = await io.read(f);
  await doc.transform(weld());
  let before = 0,
    after = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const t = tris(p);
      before += t;
      if (t > MIN) simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: TARGET / t, error: ERR, lockBorder: !1 });
      // meshes made of many separate shells (fir bark: one per branch) cannot be collapsed edge by edge;
      // the sloppy simplifier ignores topology, which is fine for a backdrop trunk
      if (tris(p) > MIN * 1.5 && p.getIndices()) {
        const pos = p.getAttribute('POSITION').getArray(),
          idx = new Uint32Array(p.getIndices().getArray()),
          [out] = MeshoptSimplifier.simplifySloppy(idx, pos instanceof Float32Array ? pos : new Float32Array(pos), 3, null, Math.floor(TARGET) * 3, 0.05);
        p.getIndices().setArray(out.length < 65536 * 3 ? new Uint32Array(out) : out);
      }
      after += tris(p);
    }
  await doc.transform(dedup(), prune());
  await io.write(f, doc);
  console.log(`${path.basename(f)}: ${Math.round(before)} -> ${Math.round(after)} triangles`);
}
