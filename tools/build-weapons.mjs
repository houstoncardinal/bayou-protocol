// Build the game's animated first-person weapons from the downloaded GLBs.
//
//   node tools/build-weapons.mjs
//
// Sources (not shipped): assets-src/weapons/*.glb   (Sketchfab downloads: arms + gun + one animation track)
// Output (shipped):      public/game/models/weapons/<id>.glb
//
// Per model: textures resized to 1024 px (gun and arms) and stored as WebP, duplicate data removed,
// animation keys that add nothing resampled out. Geometry and animation are otherwise unchanged; the
// clips are cut from the single animation track at runtime (src/mods/39-animated-weapons.js).
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress, weld } from '@gltf-transform/functions';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'assets-src/weapons');
const OUT = path.join(ROOT, 'public/game/models/weapons');
// source file -> game id
const MAP = {
  'fps_animated_smg.glb': 'hornet',
  'shotgun_animated.glb': 'mauler',
  'fps_pistol_animated.glb': 'kestrel',
  'lmg_animated.glb': 'anvil',
  'g17_pistol_-_animated.glb': 'striker',
};
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
fs.mkdirSync(OUT, { recursive: !0 });
const only = process.argv.slice(2);
for (const [file, id] of Object.entries(MAP)) {
  if (only.length && !only.includes(id)) continue;
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) {
    console.log(`${file}: missing, skipped`);
    continue;
  }
  const doc = await io.read(src);
  await doc.transform(
    dedup(),
    weld(),
    resample({ tolerance: 1e-4 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor|normal|emissive)/, resize: [1024, 1024], quality: 84 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(metallicRoughness|occlusion)/, resize: [512, 512], quality: 82 }),
    prune(),
  );
  const out = path.join(OUT, id + '.glb');
  await io.write(out, doc);
  console.log(`${file} -> weapons/${id}.glb  ${(fs.statSync(src).size / 1e6).toFixed(1)} MB -> ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`);
}
