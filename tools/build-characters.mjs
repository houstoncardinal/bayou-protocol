// Build the game's character models and shared animations from the Mixamo FBX sources.
//
//   node tools/build-characters.mjs            (all characters and animations)
//   node tools/build-characters.mjs --anims    (animations only)
//
// Sources (not shipped):
//   assets-src/characters/counter-terrorists/*.fbx   character models (Mixamo, with skin)
//   assets-src/characters/terrorists/*.fbx
//   assets-src/animations/*.fbx                       Mixamo animations (without skin), any number
// Output (shipped):
//   public/game/characters/<faction>/<Name>.glb        one skinned mesh per character, no animations
//   public/game/characters/animations.glb              every animation as a clip on one skeleton
//   public/game/characters/manifest.json               what was built, sizes, clip names
//
// What it does to each model: FBX -> glTF (FBX2glTF), bone names normalised to "mixamorig:<Bone>" (Mixamo
// downloads sometimes say mixamorig1:, mixamorig2:), empty emissive maps and leftover animations removed,
// vertices welded, heavy meshes simplified to about 22k triangles, textures resized (colour and normal
// 1024 px, roughness 512 px) and stored as WebP, vertex data quantised (KHR_mesh_quantization, decoded
// natively by three.js). Animations: clip named from the file name ("Rifle Walk.fbx" -> "RifleWalk"),
// root motion removed (the hips keep their height and sway but do not travel), redundant keys resampled
// out, all merged onto one skeleton so every character shares one small file.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, quantize, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'assets-src');
const OUT = path.join(ROOT, 'public/game/characters');
const FBX2GLTF = path.join(ROOT, 'node_modules/fbx2gltf/bin', os.type(), os.type() === 'Windows_NT' ? 'FBX2glTF.exe' : 'FBX2glTF');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-chars-'));
const MAX_TRIS = 22000;
const UNIT = 1; // FBX2glTF converts Mixamo's centimetres to metres
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const only = process.argv.includes('--anims') ? 'anims' : process.argv.includes('--chars') ? 'chars' : 'all';

const clean = (s) => s.replace(/\.fbx$/i, '').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const boneName = (n) => n.replace(/^mixamorig\d*[:_]?/i, 'mixamorig:');
function toGlb(fbx, name) {
  const out = path.join(TMP, name),
    fbm = fbx.replace(/\.fbx$/i, '.fbm'),
    had = fs.existsSync(fbm);
  execFileSync(FBX2GLTF, ['-b', '--pbr-metallic-roughness', '-i', fbx, '-o', out], { stdio: 'pipe' });
  // FBX2glTF unpacks embedded textures into <name>.fbm next to the source; they are inside the GLB now
  had || fs.rmSync(fbm, { recursive: !0, force: !0 });
  return out + '.glb';
}
const tris = (doc) => {
  let t = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const i = p.getIndices();
      t += (i ? i.getCount() : p.getAttribute('POSITION').getCount()) / 3;
    }
  return Math.round(t);
};
async function isBlank(tex) {
  try {
    const st = await sharp(Buffer.from(tex.getImage())).stats();
    return st.channels.slice(0, 3).every((c) => c.max < 8);
  } catch {
    return !1;
  }
}

const manifest = { built: new Date().toISOString(), characters: {}, animations: { file: 'animations.glb', clips: [] } };
try {
  const prev = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
  manifest.characters = prev.characters || {};
  only === 'chars' && (manifest.animations = prev.animations);
  only === 'anims' && (manifest.characters = prev.characters || {});
} catch {}

// ---------------------------------------------------------------- characters
if (only !== 'anims') {
  manifest.characters = {};
  for (const faction of ['counter-terrorists', 'terrorists']) {
    const dir = path.join(SRC, 'characters', faction);
    if (!fs.existsSync(dir)) continue;
    fs.mkdirSync(path.join(OUT, faction), { recursive: !0 });
    const files = fs.readdirSync(dir).filter((f) => /\.fbx$/i.test(f)).sort();
    manifest.characters[faction] = [];
    for (const f of files) {
      const name = f.replace(/\.fbx$/i, '').replace(/[^A-Za-z0-9]+/g, '_');
      process.stdout.write(`${faction}/${f} ... `);
      const raw = toGlb(path.join(dir, f), name);
      const doc = await io.read(raw);
      fs.rmSync(raw);
      const root = doc.getRoot();
      for (const n of root.listNodes()) n.setName(boneName(n.getName()));
      for (const a of root.listAnimations()) a.dispose();
      for (const m of root.listMaterials()) {
        const e = m.getEmissiveTexture();
        if (e && (await isBlank(e))) m.setEmissiveTexture(null), m.setEmissiveFactor([0, 0, 0]);
        m.setDoubleSided(!1);
      }
      const before = tris(doc);
      await doc.transform(prune(), dedup(), weld());
      if (tris(doc) > MAX_TRIS) {
        await MeshoptSimplifier.ready;
        await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: MAX_TRIS / tris(doc), error: 0.002, lockBorder: !0 }));
      }
      await doc.transform(
        textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor|normal|emissive)/, resize: [1024, 1024], quality: 82 }),
        textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(metallicRoughness|occlusion)/, resize: [512, 512], quality: 80 }),
        quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
        prune(),
      );
      const out = path.join(OUT, faction, name + '.glb');
      await io.write(out, doc);
      const bytes = fs.statSync(out).size,
        srcBytes = fs.statSync(path.join(dir, f)).size;
      manifest.characters[faction].push({ fbx: f, file: `${faction}/${name}.glb`, tris: tris(doc), trisSource: before, bytes, sourceBytes: srcBytes });
      console.log(`${(srcBytes / 1e6).toFixed(1)} MB -> ${(bytes / 1e6).toFixed(2)} MB, ${before} -> ${tris(doc)} triangles`);
    }
  }
}

// ---------------------------------------------------------------- animations
if (only !== 'chars') {
  const dir = path.join(SRC, 'animations');
  const files = fs.readdirSync(dir).filter((f) => /\.fbx$/i.test(f)).sort();
  // the shared skeleton comes from the first animation file
  let base = null,
    nodeBy = null;
  manifest.animations.clips = [];
  for (const f of files) {
    const clip = clean(f);
    const raw = toGlb(path.join(dir, f), 'anim_' + clip);
    const doc = await io.read(raw);
    fs.rmSync(raw);
    const root = doc.getRoot();
    for (const n of root.listNodes()) n.setName(boneName(n.getName()));
    for (const m of root.listMeshes()) m.dispose();
    for (const s of root.listSkins()) s.dispose();
    const anim = root.listAnimations().find((a) => a.listChannels().length) || root.listAnimations()[0];
    if (!anim) {
      console.log(`${f}: no animation, skipped`);
      continue;
    }
    // root motion: the hips keep their own height and sway but do not travel through the level
    let drift = { x: 0, z: 0 };
    for (const ch of anim.listChannels()) {
      const n = ch.getTargetNode();
      if (!n || !/Hips$/.test(n.getName()) || ch.getTargetPath() !== 'translation') continue;
      const out = ch.getSampler().getOutput(),
        arr = out.getArray().slice(),
        x0 = arr[0],
        z0 = arr[2],
        k = arr.length / 3;
      // remove the straight-line drift, keep the oscillation around it. The drift is recorded (metres per
      // second, character facing +Z) so the game can play the clip at the speed its feet actually travel.
      const dx = (arr[(k - 1) * 3] - x0) / Math.max(1, k - 1),
        dz = (arr[(k - 1) * 3 + 2] - z0) / Math.max(1, k - 1),
        t = ch.getSampler().getInput().getArray(),
        span = t[t.length - 1] - t[0] || 1;
      drift = { x: +(((arr[(k - 1) * 3] - x0) / span) * UNIT).toFixed(3), z: +(((arr[(k - 1) * 3 + 2] - z0) / span) * UNIT).toFixed(3) };
      for (let i = 0; i < k; i++) {
        arr[i * 3] -= x0 + dx * i;
        arr[i * 3 + 2] -= z0 + dz * i;
      }
      out.setArray(arr);
    }
    anim.setName(clip);
    for (const a of root.listAnimations()) a !== anim && a.dispose();
    await doc.transform(resample({ tolerance: 1e-4 }), prune());
    if (!base) {
      base = doc;
      nodeBy = new Map(base.getRoot().listNodes().map((n) => [n.getName(), n]));
    } else {
      // copy the clip onto the base skeleton, matching bones by name
      const a2 = base.createAnimation(clip);
      const buf = base.getRoot().listBuffers()[0];
      for (const ch of doc.getRoot().listAnimations()[0].listChannels()) {
        const tn = nodeBy.get(ch.getTargetNode()?.getName());
        if (!tn) continue;
        const s = ch.getSampler(),
          cp = (acc) => base.createAccessor().setArray(acc.getArray().slice()).setType(acc.getType()).setBuffer(buf);
        const s2 = base.createAnimationSampler().setInput(cp(s.getInput())).setOutput(cp(s.getOutput())).setInterpolation(s.getInterpolation());
        a2.addSampler(s2).addChannel(base.createAnimationChannel().setTargetNode(tn).setTargetPath(ch.getTargetPath()).setSampler(s2));
      }
    }
    const dur = Math.max(...doc.getRoot().listAnimations()[0].listSamplers().map((s) => s.getInput().getMax([0])[0]));
    manifest.animations.clips.push({ name: clip, source: f, duration: +dur.toFixed(3), speed: +Math.hypot(drift.x, drift.z).toFixed(3), drift });
    console.log(`animation ${f} -> ${clip} (${dur.toFixed(2)} s)`);
  }
  if (base) {
    await base.transform(dedup(), prune());
    fs.mkdirSync(OUT, { recursive: !0 });
    const out = path.join(OUT, 'animations.glb');
    await io.write(out, base);
    manifest.animations.bytes = fs.statSync(out).size;
    console.log(`animations.glb: ${manifest.animations.clips.length} clips, ${(manifest.animations.bytes / 1e6).toFixed(2)} MB`);
  }
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.rmSync(TMP, { recursive: !0, force: !0 });
