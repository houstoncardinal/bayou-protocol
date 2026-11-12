#!/usr/bin/env node
// Downloads CC0 (public domain, commercial use, no credit required) sound effects from Freesound for
// every game sound key, and writes public/game/audio/manifest.json for src/mods/29-audio-samples.js.
//
//   1. Create a free API key: https://freesound.org/apiv2/apply  (log in, "Request new access credentials")
//   2. FREESOUND_API_KEY=xxxx node tools/fetch-freesound.mjs            (all keys)
//      FREESOUND_API_KEY=xxxx node tools/fetch-freesound.mjs step.      (only keys starting with "step.")
//
// It downloads Freesound's high-quality OGG previews (about 192 kbps), which needs only the API key.
// Originals (WAV) need an OAuth2 login; set FREESOUND_OAUTH_TOKEN as well to fetch those instead.
// Only results whose license is exactly CC0 are kept. Every file's source URL and author are recorded in
// public/game/audio/SOURCES.json so you have an audit trail even though CC0 needs no attribution.
// Re-run any time; existing files are kept, and keys you have replaced with Sonniss files
// (tools/import-audio.mjs) are left alone unless you pass --force.
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.FREESOUND_API_KEY;
const OAUTH = process.env.FREESOUND_OAUTH_TOKEN;
if (!KEY) {
  console.error('Set FREESOUND_API_KEY (free at https://freesound.org/apiv2/apply)');
  process.exit(1);
}
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'game', 'audio');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');

// key -> [search query, how many variations, min s, max s]
const PLAN = {
  'weapon.rifle.close': ['assault rifle gunshot close', 6, 0.2, 2.5],
  'weapon.rifle.far': ['rifle gunshot distant', 4, 0.4, 4],
  'weapon.rifle.tail.out': ['gunshot tail outdoor echo', 3, 0.8, 4],
  'weapon.rifle.tail.in': ['gunshot indoor reverb tail', 3, 0.5, 3],
  'weapon.rifle.mech': ['rifle bolt carrier mechanical', 3, 0.05, 0.8],
  'weapon.ak47.close': ['ak47 gunshot', 5, 0.2, 2.5],
  'weapon.smg.close': ['submachine gun shot', 5, 0.15, 2],
  'weapon.smg.far': ['smg gunshot distant', 3, 0.3, 3],
  'weapon.pistol.close': ['pistol gunshot 9mm', 6, 0.15, 2],
  'weapon.pistol.far': ['pistol shot distant', 3, 0.3, 3],
  'weapon.deagle.close': ['magnum revolver gunshot', 4, 0.2, 2.5],
  'weapon.shotgun.close': ['shotgun blast', 5, 0.3, 2.5],
  'weapon.shotgun.far': ['shotgun distant', 3, 0.4, 3.5],
  'weapon.shotgun.mech': ['shotgun pump action', 3, 0.2, 1.2],
  'weapon.sniper.close': ['sniper rifle shot', 4, 0.3, 3],
  'weapon.sniper.far': ['sniper shot distant echo', 3, 0.5, 4],
  'weapon.sniper.mech': ['bolt action rifle cycle', 3, 0.3, 1.5],
  'weapon.lmg.close': ['machine gun single shot', 4, 0.15, 2],
  'weapon.launcher.close': ['rocket launcher launch', 3, 0.4, 3],
  'weapon.suppressed.rifle': ['suppressed rifle shot silencer', 4, 0.1, 1.5],
  'weapon.suppressed.pistol': ['silenced pistol shot', 4, 0.1, 1.2],
  'reload.rifle': ['rifle reload magazine', 3, 1.2, 4],
  'reload.pistol': ['pistol reload magazine', 3, 0.8, 3],
  'reload.shotgun': ['shotgun shell load', 3, 0.8, 4],
  'reload.sniper': ['bolt action reload', 2, 1, 4],
  dryfire: ['gun dry fire click empty', 3, 0.05, 0.6],
  whiz: ['bullet whiz flyby', 5, 0.1, 1.2],
  'impact.default': ['bullet impact concrete', 6, 0.05, 1],
  'impact.metal': ['bullet ricochet metal impact', 5, 0.05, 1.2],
  'impact.wood': ['bullet impact wood', 4, 0.05, 1],
  'impact.dirt': ['bullet impact dirt sand', 4, 0.05, 1],
  'impact.glass': ['bullet glass impact', 3, 0.05, 1.2],
  'impact.flesh': ['bullet body impact flesh hit', 5, 0.05, 0.8],
  'hit.self': ['body punch impact grunt', 4, 0.1, 1],
  'hit.armor': ['bullet hits kevlar armor', 3, 0.05, 0.8],
  'shield.break': ['glass shatter energy shield', 2, 0.3, 2],
  'step.concrete': ['footstep boot concrete', 8, 0.08, 0.6],
  'step.run.concrete': ['running footstep concrete', 6, 0.08, 0.5],
  'step.wood': ['footstep boot wood floor', 6, 0.08, 0.6],
  'step.metal': ['footstep metal grate', 6, 0.08, 0.6],
  'step.gravel': ['footstep gravel', 6, 0.08, 0.6],
  'step.dirt': ['footstep dirt sand', 6, 0.08, 0.6],
  'step.grass': ['footstep grass', 6, 0.08, 0.6],
  'step.tile': ['footstep tile floor', 6, 0.08, 0.6],
  'step.carpet': ['footstep carpet', 4, 0.08, 0.6],
  'step.asphalt': ['footstep asphalt street', 6, 0.08, 0.6],
  'step.water': ['footstep water splash shallow', 4, 0.1, 0.8],
  'land.concrete': ['jump land boots concrete', 3, 0.1, 1],
  slide: ['body slide floor', 2, 0.4, 1.5],
  'explosion.near': ['grenade explosion close', 4, 1, 6],
  'explosion.far': ['explosion distant rumble', 3, 1.5, 8],
  'flash.bang': ['flashbang stun grenade', 3, 0.3, 3],
  'smoke.pop': ['smoke grenade hiss', 2, 1, 6],
  'grenade.throw': ['grenade pin pull throw', 3, 0.2, 1.5],
  'grenade.bounce': ['grenade bounce metal clink', 3, 0.05, 0.8],
  'door.open': ['door open creak', 3, 0.3, 2],
  'door.close': ['door close slam', 3, 0.2, 1.5],
  'glass.break': ['window glass break', 3, 0.3, 3],
  'melee.swing': ['knife swing whoosh', 3, 0.1, 0.8],
  'melee.hit': ['knife stab hit', 3, 0.05, 0.8],
  'ui.buy': ['weapon pickup equip', 3, 0.1, 1],
  'ui.money': ['cash register coins', 2, 0.1, 1.2],
  'ui.hit': ['hitmarker click', 3, 0.02, 0.3],
  'ui.head': ['headshot ding metal', 3, 0.05, 0.6],
  'ui.kill': ['kill confirm tick', 2, 0.05, 0.8],
  'amb.desert': ['desert wind ambience loop', 1, 20, 180],
  'amb.industrial': ['industrial factory ambience', 1, 20, 180],
  'amb.village': ['mediterranean village ambience birds', 1, 20, 180],
  'amb.jungle': ['jungle ambience', 1, 20, 180],
  'amb.city': ['city ambience distant traffic', 1, 20, 180],
};

const manPath = path.join(ROOT, 'manifest.json'),
  srcPath = path.join(ROOT, 'SOURCES.json');
const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { sounds: {} };
const src = fs.existsSync(srcPath) ? JSON.parse(fs.readFileSync(srcPath, 'utf8')) : {};
const api = (q) => `https://freesound.org/apiv2${q}${q.includes('?') ? '&' : '?'}token=${KEY}`;

for (const [key, [query, n, dmin, dmax]] of Object.entries(PLAN)) {
  if (only.length && !only.some((o) => key.startsWith(o))) continue;
  const cur = man.sounds[key];
  if (cur && cur.source === 'sonniss' && !force) {
    console.log('skip (Sonniss)', key);
    continue;
  }
  const filter = encodeURIComponent(`license:"Creative Commons 0" duration:[${dmin} TO ${dmax}]`);
  const url = api(`/search/text/?query=${encodeURIComponent(query)}&filter=${filter}&sort=rating_desc&page_size=${n * 3}&fields=id,name,username,license,previews,duration,url,download`);
  const r = await fetch(url);
  if (!r.ok) {
    console.warn('search failed', key, r.status);
    continue;
  }
  const res = (await r.json()).results.filter((x) => /creativecommons\.org\/publicdomain\/zero/.test(x.license)).slice(0, n);
  const dir = path.join(ROOT, ...key.split('.'));
  fs.mkdirSync(dir, { recursive: !0 });
  const files = [];
  for (const [i, x] of res.entries()) {
    const ext = OAUTH ? path.extname(x.name) || '.wav' : '.ogg',
      rel = path.posix.join(...key.split('.'), `fs${x.id}${ext}`),
      out = path.join(ROOT, rel);
    if (!fs.existsSync(out)) {
      const dl = OAUTH ? await fetch(x.download, { headers: { Authorization: `Bearer ${OAUTH}` } }) : await fetch(x.previews['preview-hq-ogg']);
      if (!dl.ok) continue;
      fs.writeFileSync(out, Buffer.from(await dl.arrayBuffer()));
    }
    files.push(rel);
    src[rel] = { freesound: x.url, author: x.username, license: 'CC0 1.0', name: x.name };
  }
  if (files.length) man.sounds[key] = { files, gain: cur?.gain ?? 1, source: 'freesound' };
  console.log(key.padEnd(28), files.length, 'files');
}
fs.mkdirSync(ROOT, { recursive: !0 });
fs.writeFileSync(manPath, JSON.stringify(man, null, 1));
fs.writeFileSync(srcPath, JSON.stringify(src, null, 1));
console.log('\nWrote', manPath, '\nListen through the results and delete any that do not fit; re-run to refill.');
