// Usage: node decode.mjs in.glb out.glb  -> removes meshopt + quantization, converts webp->png (for Blender preview)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const [inp, out] = process.argv.slice(2);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
for (const ext of doc.getRoot().listExtensionsUsed()) {
  if (['EXT_meshopt_compression', 'EXT_texture_webp', 'KHR_mesh_quantization'].includes(ext.extensionName)) ext.dispose();
}
await doc.transform(dequantize());
for (const t of doc.getRoot().listTextures()) {
  if (t.getMimeType() === 'image/webp') {
    t.setImage(await sharp(Buffer.from(t.getImage())).png().toBuffer()).setMimeType('image/png');
    t.setURI(t.getName() || '');
  }
}
await io.write(out, doc);
console.log('ok');
