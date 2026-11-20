// Converts the two Industrial texture packs (assets-src/Industrial_Pack_Part1_Concrete_Masonry_Ground and
// _Part2_Metal_Wood: 16 tileable 2048 px PBR materials, owned outright, see their README.md) into the textures the
// map pipeline reads (src/mods/65-prison-view.js), for the Foundry map (src/mods/98-foundry.js):
//   <name>_diff.webp   colour, with the pack's ambient occlusion multiplied in (70 %), 1024 px
//   <name>_nor.webp    the normal map (OpenGL convention, as the pipeline expects), 1024 px
//   <name>_rough.webp  the packed occlusion / roughness / metal map (the pipeline reads roughness from green)
//   metal_bar_grating_mask.webp  the grating's cut-out mask
//   node tools/build-industrial.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'),
  OUT = path.join(ROOT, 'public/game/maps/foundry/tex'),
  SIZE = 1024;
fs.mkdirSync(OUT, { recursive: !0 });
sharp.cache(!1);
let total = 0;
for (const pack of ['Industrial_Pack_Part1_Concrete_Masonry_Ground', 'Industrial_Pack_Part2_Metal_Wood']) {
  const dir = path.join(ROOT, 'assets-src', pack);
  for (const name of fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, d + '_albedo.jpg')))) {
    const f = (s) => path.join(dir, name, name + s);
    // the occlusion (red of the packed map), to darken the colour in creases
    const ao = await sharp(f('_orm.png')).extractChannel(0).resize(SIZE, SIZE).raw().toBuffer(),
      alb = await sharp(f('_albedo.jpg')).resize(SIZE, SIZE).removeAlpha().raw().toBuffer();
    for (let i = 0, p = 0; i < ao.length; i++, p += 3) {
      const k = 0.3 + 0.7 * (ao[i] / 255);
      alb[p] *= k;
      alb[p + 1] *= k;
      alb[p + 2] *= k;
    }
    await sharp(alb, { raw: { width: SIZE, height: SIZE, channels: 3 } }).webp({ quality: 86 }).toFile(path.join(OUT, name + '_diff.webp'));
    await sharp(f('_normal_gl.png')).resize(SIZE, SIZE).removeAlpha().webp({ quality: 92 }).toFile(path.join(OUT, name + '_nor.webp'));
    await sharp(f('_orm.png')).resize(SIZE, SIZE).removeAlpha().webp({ quality: 90 }).toFile(path.join(OUT, name + '_rough.webp'));
    fs.existsSync(f('_opacity.png')) && (await sharp(f('_opacity.png')).resize(SIZE, SIZE).webp({ quality: 92 }).toFile(path.join(OUT, name + '_mask.webp')));
    const sz = ['_diff', '_nor', '_rough'].reduce((a, s) => a + fs.statSync(path.join(OUT, name + s + '.webp')).size, 0);
    total += sz;
    console.log(name.padEnd(30), (sz / 1e6).toFixed(2) + ' MB');
  }
}
console.log('total', (total / 1e6).toFixed(1) + ' MB ->', path.relative(ROOT, OUT));
