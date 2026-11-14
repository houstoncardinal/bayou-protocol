import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import validator from 'gltf-validator';
import fs from 'fs'; import path from 'path';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const root = process.argv[2]; let total = 0, errs = 0;
function walk(d) { return fs.readdirSync(d).flatMap(f => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : [p]; }); }
for (const f of walk(root).filter(f => f.endsWith('.glb'))) {
  const doc = await io.read(f); let tris = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  const rep = await validator.validateBytes(new Uint8Array(fs.readFileSync(f)), { maxIssues: 50 });
  errs += rep.issues.numErrors; total += tris;
  console.log(path.relative(root, f).padEnd(36), String(Math.round(tris)).padStart(7), 'tris', 'tex', doc.getRoot().listTextures().length, 'err', rep.issues.numErrors, 'warn', rep.issues.numWarnings,
    rep.issues.numErrors ? JSON.stringify(rep.issues.messages.filter(m => m.severity === 0).slice(0, 2).map(m => m.code + ' ' + m.message)) : '');
}
console.log('TOTAL tris', Math.round(total), 'errors', errs);
