import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'node:fs'; import path from 'node:path';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const root = 'public/game'; const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.glb') && files.push(p); } };
walk(root);
const byDir = {}; let tot = { n: 0, bytes: 0, px: 0 }; const mimes = {}, sizes = {}; const exts = {};
for (const f of files) {
  let doc; try { doc = await io.read(f); } catch (e) { console.log('ERR', f, e.message); continue; }
  for (const e of doc.getRoot().listExtensionsUsed()) exts[e.extensionName] = (exts[e.extensionName] || 0) + 1;
  const dir = f.split('/').slice(2, 4).join('/');
  const d = byDir[dir] || (byDir[dir] = { files: 0, tex: 0, mb: 0, gpuMB: 0 }); d.files++;
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage(); if (!img) continue; const s = t.getSize() || [0, 0];
    d.tex++; d.mb += img.byteLength / 1048576; d.gpuMB += s[0] * s[1] * 4 * 1.33 / 1048576;
    mimes[t.getMimeType()] = (mimes[t.getMimeType()] || 0) + 1; const k = Math.max(...s); sizes[k] = (sizes[k] || 0) + 1;
  }
}
console.log('glb files', files.length, 'extensions used', JSON.stringify(exts));
console.log('mime', JSON.stringify(mimes), 'max side', JSON.stringify(sizes));
for (const [k, v] of Object.entries(byDir).sort((a, b) => b[1].gpuMB - a[1].gpuMB)) console.log(k.padEnd(28), 'files', v.files, 'tex', v.tex, 'fileMB', v.mb.toFixed(1), 'uncompressedGPU_MB', v.gpuMB.toFixed(0));
