// Builds the game model for the Rattler .44 (a revolver) from its Sketchfab download (CC BY 4.0; see
// CREDITS.md):
//   node tools/build-new-guns.mjs
// Source: assets-src/weapons/revolver.glb
// Output: public/game/models/weapon-rattler.glb
//
// The download is a display scene, not just the gun. Kept and named for the game (src/mods/94-new-guns.js):
//   revolver the frame, cylinder and the rounds in it; the red-dot sight as "optic" (shown with the sight
//            attachment); the under-barrel weapon light and the two loose display rounds are left out
// Textures become WebP at most 1024 px; geometry is meshopt-compressed like every other shipped model.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const GUNS = [

  {
    src: 'assets-src/weapons/revolver.glb',
    out: 'public/game/models/weapon-rattler.glb',
    part: (n) => (/^Light/.test(n) || /^Bullet/.test(n) ? null : /^AIM/.test(n) ? 'optic_' + n.replace(/[^A-Za-z0-9]+/g, '') : 'body_' + n.replace(/[^A-Za-z0-9]+/g, '')),
  },
];

for (const g of GUNS) {
  const doc = await io.read(path.join(ROOT, g.src)),
    scene = doc.getRoot().listScenes()[0];
  // Sketchfab_model > <file>.fbx > RootNode > the parts
  let root = scene.listChildren()[0];
  while (root && root.getName() !== 'RootNode' && root.listChildren().length === 1) root = root.listChildren()[0];
  if (!root || root.getName() !== 'RootNode') throw new Error(g.src + ': no RootNode');
  let kept = 0,
    dropped = 0;
  for (const n of root.listChildren()) {
    const name = g.part(n.getName());
    if (!name) {
      n.dispose();
      dropped++;
      continue;
    }
    n.setName(name);
    // the mesh nodes under it carry the same name, so the game finds them by name whatever the nesting
    n.traverse((c) => c !== n && c.getMesh() && c.setName(name));
    kept++;
  }
  await doc.transform(
    prune(),
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16, quantizeTexcoord: 14, quantizeNormal: 10, quantizationVolume: 'mesh' }),
    prune(),
  );
  // the credit travels with the file
  const a = doc.getRoot().getAsset();
  a.generator = 'Bayou Tactical tools/build-new-guns.mjs';
  await io.write(path.join(ROOT, g.out), doc);
  console.log(`${g.out}: kept ${kept} parts, dropped ${dropped}, ${(fs.statSync(path.join(ROOT, g.out)).size / 1e6).toFixed(2)} MB`);
}
