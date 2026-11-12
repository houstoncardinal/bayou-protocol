#!/usr/bin/env node
// Adds your own recordings (for example from the Sonniss GDC Game Audio Bundles, royalty-free for
// commercial use with no credit required) to a game sound key.
//
//   node tools/import-audio.mjs weapon.rifle.close ~/Sonniss/2024/SomePack/AR_Shot_Close_*.wav
//   node tools/import-audio.mjs step.metal ~/Sonniss/.../Footsteps_Metal_*.wav --gain 0.8
//   node tools/import-audio.mjs --list          (show every key the game understands and what it has)
//
// Each file is trimmed of leading silence, loudness-normalised, and converted to 48 kHz Opus-in-OGG at
// 128 kbps when ffmpeg is installed (brew install ffmpeg); otherwise it is copied as-is. Imported keys are
// marked "sonniss" in the manifest so tools/fetch-freesound.mjs will not overwrite them.
// Keys are documented at the top of src/mods/29-audio-samples.js.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'game', 'audio');
const manPath = path.join(ROOT, 'manifest.json');
const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { sounds: {} };
const args = process.argv.slice(2);
if (!args.length || args[0] === '--list') {
  for (const [k, v] of Object.entries(man.sounds).sort()) console.log(k.padEnd(30), String(v.files.length).padStart(3), v.source || '');
  process.exit(0);
}
const key = args[0],
  gi = args.indexOf('--gain'),
  gain = gi > 0 ? +args[gi + 1] : 1,
  files = args.slice(1).filter((a, i, all) => a !== '--gain' && all[i - 1] !== '--gain' && a !== '--replace'),
  replace = args.includes('--replace');
let ff = !0;
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  ff = !1;
  console.warn('ffmpeg not found: copying files without conversion (install it for smaller files)');
}
const dir = path.join(ROOT, ...key.split('.'));
fs.mkdirSync(dir, { recursive: !0 });
const out = replace ? [] : [...(man.sounds[key]?.files || [])];
for (const f of files) {
  const base = path.basename(f).replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase(),
    ext = ff ? '.ogg' : path.extname(f).toLowerCase(),
    rel = path.posix.join(...key.split('.'), base + ext),
    dst = path.join(ROOT, rel);
  if (ff)
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-af', 'silenceremove=start_periods=1:start_threshold=-60dB,loudnorm=I=-16:TP=-1:LRA=11', '-ar', '48000', '-c:a', 'libopus', '-b:a', '128k', dst]);
  else fs.copyFileSync(f, dst);
  out.includes(rel) || out.push(rel);
  console.log('  +', rel);
}
man.sounds[key] = { files: out, gain, source: 'sonniss' };
fs.writeFileSync(manPath, JSON.stringify(man, null, 1));
console.log(`${key}: ${out.length} files`);
