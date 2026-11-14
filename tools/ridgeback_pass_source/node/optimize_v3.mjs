// node optimize_v3.mjs <buildDir> <outDir>
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, dedup, prune, meshopt, textureCompress, mergeDocuments, unpartition } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const [B, OUT] = process.argv.slice(2); const RAW = path.join(B, 'out/raw');
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
for (const d of ['terrain', 'collision', 'trees', 'props', 'structures', 'tunnels', 'grass', 'environment', 'materials', 'data']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
const size = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' KB';
async function finish(doc, file, { tex = 0, quality = 86, compress = true, lossless = false } = {}) {
  await doc.transform(dedup(), prune({ keepAttributes: true }));
  if (tex) await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [tex, tex], quality, lossless }));
  if (compress) await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16, quantizeNormal: 10, quantizeTexcoord: 14 }));
  await io.write(path.join(OUT, file), doc); console.log(file.padEnd(44), size(file));
}
const name = (doc, n) => { doc.getRoot().listNodes().forEach((x) => x.setName(n)); doc.getRoot().listMeshes().forEach((x) => x.setName(n)); };
async function merge(files, names) {
  const t = new Document();
  for (let i = 0; i < files.length; i++) { const s = await io.read(files[i]); if (names) name(s, names[i]); mergeDocuments(t, s); }
  const r = t.getRoot(), sc = r.listScenes(); for (const s of sc.slice(1)) { s.listChildren().forEach((c) => sc[0].addChild(c)); s.dispose(); }
  r.setDefaultScene(sc[0]); await t.transform(unpartition()); return t;
}
// terrain
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
  const id = `r${r}_c${c}`;
  let d = await io.read(path.join(RAW, `terrain_${id}.glb`)); name(d, `terrain_${id}`);
  await d.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.55, error: 0.0004, lockBorder: true }));
  await finish(d, `terrain/terrain_${id}_lod0.glb`);
  d = await io.read(path.join(RAW, `terrain_${id}.glb`)); name(d, `terrain_${id}_lod1`);
  await d.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.12, error: 0.004, lockBorder: true }));
  await finish(d, `terrain/terrain_${id}_lod1.glb`);
}
{ const f = [], n = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { f.push(path.join(RAW, `terrain_collision_r${r}_c${c}.glb`)); n.push(`col_r${r}_c${c}`); }
  const d = await merge(f, n); d.getRoot().listMaterials().forEach((m) => m.dispose());
  await d.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.4, error: 0.0008, lockBorder: true }));
  await finish(d, 'collision/terrain_collision.glb', { compress: false }); }
{ const d = await io.read(path.join(RAW, 'tunnels_collision.glb')); name(d, 'tunnels_collision'); d.getRoot().listMaterials().forEach((m) => m.dispose()); await d.transform(weld()); await finish(d, 'collision/tunnels_collision.glb', { compress: false }); }
{ const n = ['B_tunnels', 'smugglers_cave', 'old_drift']; const d = await merge(n.map((x) => path.join(RAW, `tunnel_${x}.glb`)));
  await finish(d, 'tunnels/tunnels.glb', { tex: 1024 }); }
{ const d = await io.read(path.join(RAW, 'structures.glb')); await finish(d, 'structures/structures.glb', { tex: 1024 }); }
// grass
{ const d = await io.read(path.join(RAW, 'grass_clumps.glb')); await finish(d, 'grass/grass_clumps.glb', { tex: 2048, quality: 90 }); }
fs.copyFileSync(path.join(RAW, 'grass_instances.glb'), path.join(OUT, 'grass/grass_instances.glb')); console.log('grass/grass_instances.glb'.padEnd(44), size('grass/grass_instances.glb'));
// materials
for (const q of ['hq', 'lq']) { const d = await io.read(path.join(RAW, `terrain_materials_${q}.glb`)); await finish(d, `materials/terrain_materials_${q}.glb`, { tex: q === 'hq' ? 4096 : 2048, quality: 92, compress: false }); }
// environment
for (const n of ['water_creek', 'backdrop']) { const d = await io.read(path.join(RAW, `${n}.glb`)); name(d, n); await finish(d, `environment/${n}.glb`, { tex: 512 }); }
{ const d = await io.read(path.join(RAW, 'sky.glb')); await finish(d, 'environment/sky.glb', { tex: 2048, quality: 88, compress: false }); }
// trees + props: already optimized -> copy
for (const f of fs.readdirSync(path.join(B, '../assets/out')).filter((f) => f.endsWith('.glb') && !f.includes('_raw') && !f.includes('_dec')))
  fs.copyFileSync(path.join(B, '../assets/out', f), path.join(OUT, 'trees', f));
for (const f of fs.readdirSync(path.join(B, '../assets/props')).filter((f) => f.endsWith('.glb'))) fs.copyFileSync(path.join(B, '../assets/props', f), path.join(OUT, 'props', f));
console.log('trees + props copied');
