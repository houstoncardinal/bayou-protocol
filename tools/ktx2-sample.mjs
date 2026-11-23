// one colour texture and one normal map from a model, as PNG (for trying encoder settings)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
await MeshoptDecoder.ready;
const [file, out] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(file);
const roles = new Map();
for (const m of doc.getRoot().listMaterials()) {
  m.getBaseColorTexture() && roles.set(m.getBaseColorTexture(), 'color');
  m.getNormalTexture() && roles.set(m.getNormalTexture(), 'normal');
}
let done = { color: 0, normal: 0 };
for (const [t, r] of roles) {
  if (done[r]) continue;
  const s = t.getSize();
  if (!s || s[0] < 1024) continue;
  await sharp(Buffer.from(t.getImage())).png().toFile(`${out}/${r}.png`);
  console.log(r, s.join('x'), (t.getImage().byteLength / 1024).toFixed(0) + ' KB', t.getMimeType());
  done[r] = 1;
}
