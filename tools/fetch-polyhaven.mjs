// Download a map's Poly Haven assets (all CC0) and build game-ready copies.
//
//   node tools/fetch-polyhaven.mjs [frostline|prison|cinema|fortress]   (default frostline; skips files already downloaded)
//
// Sources (as downloaded, not shipped): assets-src/maps/<map>/
// Output (shipped):                     public/game/maps/<map>/
//   tex/<id>_{diff,nor,rough}.webp      tiling textures (2048 px for the ground and cliffs, 1024 for the rest)
//   models/<id>.glb                     models: simplified to a triangle budget (plants: whole cards kept
//                                       at random, enlarged; their alpha mask merged in), textures 1024 px
//                                       WebP, meshopt-compressed (decoded in the game by 42-smooth.js)
//   sky.webp (sky_dusk.webp)            the sky panorama (tonemapped from the HDRI, 4096 x 2048)
// Poly Haven's API: https://api.polyhaven.com (files/<id> lists every download of an asset).
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const MAPS = {
  frostline: {
    textures: {
      snow_02: 2048, // the snowfield and snow caps
      rock_face: 2048, // cliffs and rock walls (greyed to granite in the shader)
      brown_planks_05: 1024, // timber: huts, walkways, crates
      blue_metal_plate: 1024, // station walls, containers
      weathered_plank_siding: 1024, // the log cabins' walls
      rustic_stone_wall: 1024, // cabin footings and chimneys
      roof_planks: 1024, // cabin roofs (under the snow)
    },
    // model: triangle budget (the trees are scans with 100k+ triangles)
    models: {
      rock_face_02: 5000,
      old_military_crate: 2500,
      wooden_crate_02: 2000,
      barrel_03: 2500,
      metal_jerrycan: 1500,
      portable_generator: 4000,
      portable_searchlight: 3000,
      dead_tree_trunk: 3000,
      street_lamp_02: 3000, // lamp posts the Christmas lights hang from
      wooden_lantern_01: 2500,
      barrel_stove: 3000,
      stone_fire_pit: 4000,
      wooden_barrels_01: 4000,
      cardboard_box_01: 800,
      ammo_box: 1500,
      wooden_crate_01: 2000,
      tree_stump_01: 2500,
      wooden_bucket_01: 1500,
    },
    skies: { sky: 'snowy_hillside' },
  },
  prison: {
    textures: {
      painted_brick: 1024, // painted block: cell and corridor walls (greyed, then tinted to the paint colour)
      painted_plaster_wall: 1024, // plastered walls (administration, infirmary)
      garage_floor: 1024, // sealed concrete floors (cell block, solitary, laundry)
      large_grey_tiles: 1024, // tiled floors (administration, cafeteria, kitchen, infirmary)
      concrete_wall_008: 1024, // cast concrete: the perimeter wall and plain exteriors
      concrete_floor_worn_001: 1024, // walks, yards, slab tops
      asphalt_02: 1024, // roads, the visitor lot, the dock
      red_brick_03: 1024, // the old cell house
      granite_wall: 1024, // the gatehouse and the cell house's stone dressings
      green_metal_rust: 1024, // painted steel (greyed, then tinted): doors, bars, rails, furniture
      metal_plate: 1024, // diamond plate: galleries, stair treads, the dock
      sparse_grass: 1024, // verges and the ground outside
      brown_mud_dry: 1024, // dirt, the breach
      rubber_tiles: 1024, // the weight pit
      tarred_gravel: 1024, // flat roofs
      corrugated_iron: 1024, // tower roofs, sheds, the sally port
    },
    models: {
      security_camera_01: [1200, 512],
      mounted_fluorescent_lights: [500, 512],
      hanging_industrial_lamp: [1200, 512],
      Television_01: [1900, 512],
      steel_frame_shelves_01: 2000,
      metal_office_desk: 2500,
      utility_box_02: [2000, 512],
      korean_fire_extinguisher_01: [1000, 512],
      wheelchair_01: [3000, 512],
      trashbag: [1200, 512],
      concrete_road_barrier: [1500, 512],
      barrel_03: [1473, 512],
      bolt_cutters_01: [800, 512],
      security_light: [1000, 512],
      WetFloorSign_01: [228, 512],
      fire_hydrant: [2000, 512],
    },
    skies: { sky: 'kloofendal_48d_partly_cloudy_puresky', sky_dusk: 'industrial_sunset_02_puresky' },
  },
  // Fortress (77-fortress.js): its crates, barrels and lanterns come from the Frostline and prison folders
  fortress: {
    textures: {
      medieval_blocks_05: 1024, // the fortress's cut-stone walls and buildings
      castle_wall_varriation: 1024, // the outer ramparts and retaining walls (rough stone)
      plaster_stone_wall_01: 1024, // rendered house fronts (tinted)
      cobblestone_square: 1024, // courtyards and lanes
      red_sandstone_pavement: 1024, // the bomb sites and terraces (flagstones)
      grassy_cobblestone: 1024, // gardens and the lower level
      clay_roof_tiles_02: 1024, // pitched roofs
    },
    models: {
      island_tree_01: 6000, // the jungle on the island and the gardens
      island_tree_02: 6000,
      island_tree_03: 6000,
      pachira_aquatica_01: 4000, // tropical trees and undergrowth round the rim
      shrub_02: 3000,
      shrub_04: 3000,
      coastal_cliff_02: [12000, 1024], // the island's cliffs
      coastal_cliff_04: [12000, 1024],
      coast_rocks_05: [4000, 1024], // rocks at the waterline
      fern_02: 3000,
      Lantern_01: [1500, 512], // wall lanterns
      planter_pot_clay: [800, 512],
    },
    skies: {},
  },
  // the cinema also uses the prison's asphalt, concrete, plaster, steel plate, brick, gravel roofs and skies
  // (72-cinema-view.js loads those from public/game/maps/prison/)
  cinema: {
    textures: {
      poly_wool_herringbone: 1024, // carpet (tinted per room: burgundy, navy, gold)
      velour_velvet: 1024, // seats, curtains, acoustic wall panels (tinted per auditorium)
      marble_01: 1024, // the lobby's floor, columns and counters
      herringbone_parquet: 1024, // the lounge floor and the stages
      dark_wooden_planks: 1024, // wall panelling, the bar, doors
      white_stucco: 1024, // the art-deco facade and upper walls (tinted)
      leather_red_02: 1024, // the Velvet Room's recliners
      terrazzo_tiles: 1024, // the plaza and the promenade's border
      quatrefoil_jacquard_fabric: 1024, // the auditoriums' acoustic panels (tinted per theater)
      wood_plank_wall: 1024, // ribbed timber lining the auditoriums' lower walls
      marble_mosaic_tiles: 1024, // the lobby's border bands
      rosewood_veneer1: 1024, // polished rosewood: the lobby's and the Promenade's wainscot, mouldings, the counter
    },
    models: {
      Chandelier_02: [4000, 512],
      CashRegister_01: [1500, 512],
      bar_chair_round_01: [1200, 512], // (the scan's mesh will not simplify: about 14k triangles a stool)
      Sofa_01: [3000, 512],
      coffee_table_round_01: [1200, 512],
      potted_plant_02: [3000, 512],
      street_lamp_01: [1500, 512],
      metal_trash_can: [800, 512],
      ornate_mirror_01: [1500, 512],
      mid_century_lounge_chair: [2500, 512],
      fancy_picture_frame_01: [600, 1024],
      brass_vase_01: [1200, 512],
      modern_ceiling_lamp_01: [800, 512],
      CoffeeCart_01: [2500, 512], // lobby and Promenade cover
      ArmChair_01: [2000, 512],
      potted_plant_04: [2500, 512],
      side_table_01: [800, 512],
      industrial_storage_cart: [2000, 512], // the projection level
      steel_frame_shelves_02: [1500, 512],
      cardboard_box_01: [300, 512],
      painted_wooden_bench: [1200, 512], // the street
      outdoor_table_chair_set_01: [2500, 512], // the café across the street
      planter_box_01: [1200, 512],
      covered_car: [3000, 1024], // the parked cars (a scanned car under a fitted cover: Poly Haven has no bare cars)
      marble_bust_01: [3000, 512], // busts on plinths in the Grand Lobby
      ClassicConsole_01: [2500, 512], // carved console tables along the lobby walls
    },
    skies: {},
  },
};
const MAP = process.argv[2] || 'frostline';
if (!MAPS[MAP]) throw new Error('unknown map ' + MAP + ' (' + Object.keys(MAPS).join(', ') + ')');
const { textures: TEXTURES, models: MODELS, skies: SKIES } = MAPS[MAP];
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'assets-src/maps', MAP);
const OUT = path.join(ROOT, 'public/game/maps', MAP);

const api = async (id) => (await fetch('https://api.polyhaven.com/files/' + id)).json();
async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: !0 });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
fs.mkdirSync(path.join(OUT, 'tex'), { recursive: !0 });
fs.mkdirSync(path.join(OUT, 'models'), { recursive: !0 });

// ---------------------------------------------------------------- textures
for (const [id, px] of Object.entries(TEXTURES)) {
  const f = await api(id),
    res = px >= 2048 ? '2k' : '1k';
  for (const [key, out] of [['Diffuse', 'diff'], ['nor_gl', 'nor'], ['Rough', 'rough']]) {
    const src = path.join(SRC, 'tex', `${id}_${out}_${res}.jpg`);
    // a few textures come in colour variants (coll1, coll2) instead of one Diffuse map: the first is used
    await download((f[key] || (key === 'Diffuse' && f.coll1))[res].jpg.url, src);
    const dst = path.join(OUT, 'tex', `${id}_${out}.webp`);
    // roughness at half size: it is low-frequency
    await sharp(src)
      .resize(out === 'rough' ? px / 2 : px)
      .webp({ quality: out === 'nor' ? 90 : 84 })
      .toFile(dst);
  }
  console.log(`texture ${id}: ${['diff', 'nor', 'rough'].map((o) => (fs.statSync(path.join(OUT, 'tex', `${id}_${o}.webp`)).size / 1e3).toFixed(0) + ' kB').join(', ')}`);
}

// ---------------------------------------------------------------- sky
for (const [name, id] of Object.entries(SKIES)) {
  const f = await api(id),
    src = path.join(SRC, id + '.jpg');
  await download(f.tonemapped.url, src);
  await sharp(src).resize(4096, 2048).webp({ quality: 82 }).toFile(path.join(OUT, name + '.webp'));
  console.log(`${name} ${id}: ${(fs.statSync(path.join(OUT, name + '.webp')).size / 1e6).toFixed(2)} MB`);
}

// ---------------------------------------------------------------- models
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const tris = (doc) => {
  let t = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
  return Math.round(t);
};
for (const [id, spec] of Object.entries(MODELS)) {
  // budget, or [budget, texture size] (small props: 512 px)
  const [budget, texPx] = Array.isArray(spec) ? spec : [spec, 1024];
  const f = await api(id),
    g = f.gltf['1k'].gltf,
    dir = path.join(SRC, 'models', id),
    main = path.join(dir, path.basename(new URL(g.url).pathname));
  await download(g.url, main);
  for (const [rel, inc] of Object.entries(g.include || {})) await download(inc.url, path.join(dir, rel));
  const doc = await io.read(main),
    t0 = tris(doc);
  // plants: Poly Haven keeps the cut-out mask as a separate <part>_alpha image the glTF does not use; it is
  // merged into the colour texture's alpha here, and the material set to alpha-test (MASK)
  for (const m of doc.getRoot().listMaterials()) {
    if (m.getAlphaMode() === 'OPAQUE' || !m.getBaseColorTexture()) continue;
    const part = m.getName().replace(id + '_', ''),
      key = Object.keys(f).find((k) => k === part + '_alpha');
    if (!key) continue;
    const src = path.join(dir, 'alpha', key + '.jpg');
    await download(f[key]['1k'].jpg.url, src);
    const tex = m.getBaseColorTexture(),
      rgb = sharp(Buffer.from(tex.getImage())),
      { width, height } = await rgb.metadata(),
      alpha = await sharp(src).resize(width, height).greyscale().raw().toBuffer();
    tex.setImage(new Uint8Array(await rgb.joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer())).setMimeType('image/png');
    m.setAlphaMode('MASK').setAlphaCutoff(0.4);
  }
  await doc.transform(dedup(), weld());
  // foliage (alpha-tested cards): the simplifier would collapse each card to a sliver, so instead whole
  // cards are kept at random down to the budget, and every kept card is enlarged round its own centre to
  // fill the crown as densely as before. Everything else is simplified normally below.
  const foliage = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).filter((p) => p.getMaterial() && p.getMaterial().getAlphaMode() !== 'OPAQUE');
  if (foliage.length) {
    const ftris = foliage.reduce((a, p) => a + p.getIndices().getCount() / 3, 0),
      keep = Math.min(1, (budget * 0.85) / ftris),
      grow = Math.min(3.2, Math.sqrt(1 / keep));
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const p of foliage) {
      const idx = p.getIndices().getArray(),
        pos = p.getAttribute('POSITION'),
        n = pos.getCount(),
        par = new Int32Array(n).map((_, i) => i),
        find = (x) => {
          while (par[x] !== x) x = par[x] = par[par[x]];
          return x;
        };
      for (let t = 0; t < idx.length; t += 3) for (const k of [1, 2]) { const a = find(idx[t]), b = find(idx[t + k]); a !== b && (par[a] = b); }
      // one decision per card (connected piece)
      const keepCard = new Map(),
        out = [];
      for (let t = 0; t < idx.length; t += 3) {
        const c = find(idx[t]);
        keepCard.has(c) || keepCard.set(c, rnd() < keep);
        keepCard.get(c) && out.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      // enlarge kept cards round their centres
      const sum = new Map(), v = [];
      for (const i of new Set(out)) { const c = find(i), e = sum.get(c) || [0, 0, 0, 0]; pos.getElement(i, v); e[0] += v[0]; e[1] += v[1]; e[2] += v[2]; e[3]++; sum.set(c, e); }
      for (const i of new Set(out)) { const e = sum.get(find(i)); pos.getElement(i, v); pos.setElement(i, [0, 1, 2].map((k) => e[k] / e[3] + (v[k] - e[k] / e[3]) * grow)); }
      p.getIndices().setArray(n > 65535 ? new Uint32Array(out) : new Uint16Array(out));
    }
    await doc.transform(prune());
    console.log(`  ${id}: foliage ${ftris} -> ${Math.round(foliage.reduce((a, p) => a + p.getIndices().getCount() / 3, 0))} triangles (cards x${grow.toFixed(2)})`);
  }
  // a careful pass first, then a looser one if the shape still has too many triangles (scanned rocks, trees)
  if (!foliage.length) for (const error of [0.01, 0.05, 0.12]) tris(doc) > budget * 1.25 && (await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: budget / tris(doc), error })));
  else {
    // plants: trunks and branches simplified primitive by primitive (the cards are left alone)
    const rest = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).filter((p) => !foliage.includes(p)),
      restTris = rest.reduce((a, p) => a + p.getIndices().getCount() / 3, 0),
      target = Math.max(1, budget * 0.15);
    if (restTris > target * 1.25)
      for (const p of rest) {
        const ind = p.getIndices(),
          P = p.getAttribute('POSITION'),
          pos = new Float32Array(P.getCount() * 3);
        for (let i = 0; i < P.getCount(); i++) pos.set(P.getElement(i, []), i * 3);
        const want = Math.max(3, Math.floor(((ind.getCount() * target) / restTris) / 3) * 3),
          [out] = MeshoptSimplifier.simplify(new Uint32Array(ind.getArray()), pos, 3, want, 0.08);
        ind.setArray(P.getCount() > 65535 ? out : new Uint16Array(out));
      }
    await doc.transform(prune());
  }
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor|normal|emissive)/, resize: [texPx, texPx], quality: 84 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(metallicRoughness|occlusion)/, resize: [texPx / 2, texPx / 2], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    prune(),
  );
  const out = path.join(OUT, 'models', id + '.glb');
  await io.write(out, doc);
  console.log(`model ${id}: ${t0} -> ${tris(doc)} triangles, ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`);
}
let total = 0;
const walk = (d) => fs.readdirSync(d).forEach((f) => (fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : (total += fs.statSync(path.join(d, f)).size)));
walk(OUT);
console.log(`public/game/maps/${MAP}: ${(total / 1e6).toFixed(1)} MB`);
