// Print what takes space in GLB files: textures (format, size, bytes), meshes (triangles, vertex bytes),
// animations.   node tools/inspect-glb.mjs file.glb [...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const d = await io.read(f), r = d.getRoot();
  let tex = 0, geo = 0, anim = 0, tris = 0;
  const tl = r.listTextures().map((t) => { const b = t.getImage()?.byteLength || 0; tex += b; return `${t.getMimeType().split('/')[1]} ${(t.getSize() || []).join('x')} ${(b / 1e3).toFixed(0)}k`; });
  for (const a of r.listAccessors()) { const b = a.getArray()?.byteLength || 0; geo += b; }
  for (const m of r.listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(); tris += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
  for (const a of r.listAnimations()) for (const s of a.listSamplers()) anim += (s.getInput().getArray().byteLength + s.getOutput().getArray().byteLength);
  console.log(f.split('/').slice(-2).join('/'), `textures ${(tex / 1e6).toFixed(2)} MB (${tl.length}), accessors ${(geo / 1e6).toFixed(2)} MB (anim ${(anim / 1e6).toFixed(2)}), ${Math.round(tris)} tris, ext ${r.listExtensionsUsed().map((e) => e.extensionName.replace(/^(KHR|EXT)_/, '')).join(',')}`);
  process.argv.includes('-v') && console.log('   ' + tl.join(' | '));
}
