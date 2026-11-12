#!/usr/bin/env node
// Builds the game's weapon sounds from the firearm recording pack in assets-src/soundfx.
//
//   node tools/build-gunshots.mjs
//
// Source: Snake's Authentic Gun Sounds Pack 1 + 2 (F8 Studios, f8studios.itch.io). Calibres .22LR, 5.56,
// 7.62x39, 7.62x54R, 9mm, .308 and 20 gauge, each as Single / Double Tap / Burst / Spray, in the full mix
// (with the room and echo) and, for pack 1, a dry "Isolated" mix; plus reloads, bolt cycling, pistol
// handling and magazine packing. This script:
//   1. finds every individual shot in every recording (envelope onset detection), so one in-game trigger
//      pull plays one real shot, with many natural variations per calibre for round-robin playback
//   2. builds layers per weapon: close (full mix, so every shot carries its natural echo), far (full mix,
//      band-limited), tail.out (room decay, automatic weapons only, used when a burst ends),
//      suppressed (filtered, shortened dry shot), cycle (bolt action after a sniper shot), reload
//   5. writes assets-src/soundfx/SOUND_USAGE.md listing every source file used and every file not used
//   3. derives weapons the pack does not cover (9 mm pistols, SMG, .50 magnum, 12-gauge) from the nearest
//      calibre by pitch and tone, so every gun in the game has recorded sound
//   4. encodes each file twice, Opus/OGG (Chrome, Firefox, Edge) and AAC/M4A (Safari), mono 48 kHz,
//      peak-normalised, and writes public/game/audio/manifest.json (other keys in it are kept)
// Re-run after changing the mapping below; generated weapon/reload folders are rebuilt from scratch.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PROJECT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(PROJECT, 'assets-src', 'soundfx');
const OUT = path.join(PROJECT, 'public', 'game', 'audio');
const SR = 48000;

// ---------- weapon -> source calibre + processing ----------
// pitch in semitones; tone: 'bright' | 'dark' | 'body' (low-end boost) ; class gain applied in the engine
const WEAPONS = {
  rifle: { cal: '556', pitch: 0, sup: '556' },
  hk416: { cal: '556', pitch: 0.4, sup: '556' },
  m16: { cal: '556', pitch: -0.4, tone: 'bright', sup: '556' },
  sentinel: { cal: '556', pitch: 0.8, sup: '556' },
  ak47: { cal: '76239', pitch: 0, sup: '76239' },
  midas: { cal: '76239', pitch: 0.3, tone: 'bright', sup: '76239' },
  rampart: { cal: '76239', pitch: -0.8, tone: 'body', sup: '76239' },
  bastion: { cal: '76239', pitch: -0.5, tone: 'body', sup: '76239' },
  sniper: { cal: '308', pitch: 0, cycle: 'bolt308', sup: '308' },
  phantom: { cal: '76254', pitch: -1.5, cycle: 'mosin', sup: '76254' },
  br: { cal: '308', pitch: 0.4, sup: '308' },
  lmg: { cal: '76254', pitch: 0.3, preferSpray: !0, sup: '76254' },
  pistol: { cal: '9mm', pitch: 0, sup: '9mm' },
  warden: { cal: '9mm', pitch: -0.6, tone: 'body', sup: '9mm' },
  smg: { cal: '9mm', pitch: 0.3, preferSpray: !0, sup: '9mm' },
  deagle: { cal: '9mm', pitch: -3, tone: 'body', sup: '9mm' },
  shotgun: { cal: '20g', pitch: -1, tone: 'body', sup: '20g' },
};
const AUTO = new Set(['rifle', 'hk416', 'sentinel', 'ak47', 'midas', 'rampart', 'bastion', 'lmg', 'smg']);
const ALWAYS_SUPPRESSED = new Set(['bastion', 'phantom']);
// full = full-mix folder, iso = dry folder (only pack 1 has dry recordings)
const CALS = {
  556: { name: '5.56', full: 'Full Sound/5.56/WAV', iso: 'Isolated/5.56/WAV' },
  76239: { name: '7.62x39', full: 'Full Sound/7.62x39/WAV', iso: 'Isolated/7.62x39/WAV' },
  76254: { name: '7.62x54R', full: 'Full Sound/7.62x54R/WAV', iso: 'Isolated/7.62x54R/WAV' },
  '9mm': { name: '9mm', full: 'Full Sounds/9mm/WAV', iso: 'Isolated/9mm/WAV' },
  308: { name: '.308', full: 'Full Sounds/.308 (7.62x51)/WAV', iso: 'Isolated/.308 (7.62x51)/WAV' },
  '20g': { name: '20 gauge', full: 'Full Sounds/20 Gauge/WAV', iso: 'Isolated/20 Gauge/WAV' },
};
const RELOADS = {
  rifle: 'AR Reload Full',
  hk416: 'AR Reload Full',
  m16: 'AR Reload Full',
  sentinel: 'AR Reload Full',
  ak47: 'AK Reload Full',
  midas: 'AK Reload Full',
  rampart: 'AK Reload Full',
  bastion: 'AK Reload Full',
  lmg: 'AK Reload Full',
  sniper: '308 Magazine Full',
  phantom: '308 Magazine Full',
  br: '308 Magazine Full',
  pistol: ['& More/Pistol/WAV/9mm Pistol Reload 1.wav', '& More/Pistol/WAV/9mm Pistol Reload 2.wav'],
  warden: ['& More/Pistol/WAV/9mm Pistol Reload 1.wav', '& More/Pistol/WAV/9mm Pistol Reload 2.wav'],
  deagle: ['& More/Pistol/WAV/9mm Pistol Reload 2.wav'],
  smg: 'Angel Mag Reload Full',
  shotgun: 'Pump Reload Full',
};
const CYCLES = { bolt308: ['308 Bolt Cycle'], mosin: ['Mosin Bolt Cycle'] };
const BUY = [
  '& More/Mag Pack/WAV/AR PolyMag Unpack.wav',
  '& More/Mag Pack/WAV/AK PolyMag Unpack.wav',
  '& More/Mag Pack/WAV/9mm Magazine Unpack.wav',
  'Reloads, Cycling & More/WAV/AR Charging Handle WAV.wav',
  'Reloads, Cycling & More/WAV/AK Rack WAV.wav',
];
const DRYFIRE = ['& More/Pistol/WAV/9mm Pistol Dry Fire.wav'];
const USED = new Set();
const rc = (n) => (n.includes('/') ? n : `Reloads, Cycling & More/WAV/${n} WAV.wav`);

// ---------- audio helpers ----------
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { maxBuffer: 1 << 28 });
function decode(f) {
  const b = ff(['-i', f, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-']);
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
// shots: a sharp rise of the 2 ms peak envelope over the level 6-10 ms earlier. Works for single shots and
// for sprays, where the level never falls back to silence between rounds.
function shots(x) {
  const w = Math.round(SR * 0.002),
    n = Math.floor(x.length / w),
    env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let k = 0; k < w; k++) m = Math.max(m, Math.abs(x[i * w + k]));
    env[i] = m;
  }
  const mx = env.reduce((a, b) => Math.max(a, b), 0),
    out = [];
  let last = -1e9;
  // a take that starts loud at sample 0 (no lead-in) is a shot at t = 0
  if (Math.max(env[0], env[1], env[2], env[3]) > 0.3 * mx) (out.push(0), (last = 0));
  for (let i = 5; i < n - 3; i++) {
    const t = i * 0.002,
      before = Math.min(env[i - 3], env[i - 4], env[i - 5]),
      peak = Math.max(env[i], env[i + 1], env[i + 2], env[i + 3]);
    if (peak > 0.3 * mx && env[i] > before * 2.4 && env[i] > 0.12 * mx && t - last > 0.06) {
      out.push(Math.max(0, t - 0.004));
      last = t;
    }
  }
  return { on: out, dur: x.length / SR, mx, x };
}
function peakOf(x, a, b) {
  let m = 0;
  for (let i = Math.max(0, Math.floor(a * SR)); i < Math.min(x.length, Math.floor(b * SR)); i++) m = Math.max(m, Math.abs(x[i]));
  return m || 1;
}
function toneFilter(tone) {
  return tone === 'bright'
    ? ',equalizer=f=3500:t=q:w=1:g=2.5'
    : tone === 'dark'
      ? ',lowpass=f=3200,equalizer=f=110:t=q:w=1:g=4'
      : tone === 'body'
        ? ',equalizer=f=140:t=q:w=1.2:g=4,equalizer=f=4200:t=q:w=1:g=-2'
        : '';
}
function encode(src, start, len, rel, filters) {
  USED.add(path.relative(SRC, src));
  const base = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(base), { recursive: !0 });
  const af = `atrim=start=${start.toFixed(4)}:duration=${len.toFixed(4)},asetpts=PTS-STARTPTS${filters || ''},afade=t=in:d=0.002,afade=t=out:st=${Math.max(0, len - 0.03).toFixed(4)}:d=0.03,alimiter=limit=0.89:attack=1:release=40`;
  const common = ['-i', src, '-af', af, '-ac', '1', '-ar', String(SR)];
  ff([...common, '-c:a', 'libopus', '-b:a', '112k', base + '.ogg']);
  ff([...common, '-c:a', 'aac', '-b:a', '128k', base + '.m4a']);
  return rel;
}
const normF = (pk, target = 0.85) => `,volume=${Math.min(4, target / pk).toFixed(3)}`;
const pitchF = (st) => (st ? `,asetrate=${Math.round(SR * Math.pow(2, st / 12))},aresample=${SR}` : '');
const find = (dir, re) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => re.test(f)).map((f) => path.join(dir, f)) : []);

// ---------- analyse the pack ----------
const cal = {};
const sliceAll = (dir) => {
  const out = [];
  for (const f of find(path.join(SRC, dir || '_none'), /\.wav$/i)) {
    const s = shots(decode(f));
    s.on.forEach((t, i) => {
      const gap = (s.on[i + 1] ?? s.dur) - t,
        last = i === s.on.length - 1;
      out.push({ f, t, gap, last, len: Math.min(last ? 1.6 : gap - 0.003, 1.6), spray: /spray|burst/i.test(f), single: /single/i.test(f), pk: peakOf(s.x, t, t + 0.1) });
    });
  }
  return out;
};
for (const [k, c] of Object.entries(CALS)) {
  cal[k] = { full: sliceAll(c.full), iso: sliceAll(c.iso) };
  console.log(`${c.name.padEnd(9)} full-mix shots ${String(cal[k].full.length).padStart(3)}, dry shots ${cal[k].iso.length}`);
}
// ---------- build ----------
for (const d of ['weapons', 'reload', 'ui']) fs.rmSync(path.join(OUT, d), { recursive: !0, force: !0 });
const man = fs.existsSync(path.join(OUT, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8')) : { sounds: {} };
for (const k of Object.keys(man.sounds)) if (man.sounds[k].source === 'pack') delete man.sounds[k];
const put = (key, files, gain = 1) => files.length && (man.sounds[key] = { files, gain, source: 'pack' });
for (const [id, w] of Object.entries(WEAPONS)) {
  const C = cal[w.cal],
    pf = pitchF(w.pitch) + toneFilter(w.tone),
    auto = AUTO.has(id);
  // close layer from the FULL mix: each shot keeps its own echo. Automatic weapons use rounds cut from
  // bursts and sprays at the cyclic length; semi-auto, burst and bolt guns use whole single shots with
  // their full natural decay.
  let pool;
  if (auto) {
    pool = C.full.filter((s) => s.len >= 0.08);
    w.preferSpray && (pool = [...pool.filter((s) => s.spray), ...pool.filter((s) => !s.spray)]);
    pool = pool.map((s) => ({ ...s, len: Math.min(0.26, s.len) }));
  } else {
    const long = C.full.filter((s) => s.len >= 0.45);
    pool = (long.length >= 3 ? long : C.full.filter((s) => s.len >= 0.2)).map((s) => ({ ...s, len: Math.min(1.3, s.len) }));
  }
  const close = pool.slice(0, 10).map((s, i) => encode(s.f, s.t, s.len, `weapons/${id}/close_${String(i + 1).padStart(2, '0')}`, normF(s.pk) + pf));
  const singles = C.full.filter((s) => s.len >= 0.6);
  const far = singles.slice(0, 4).map((s, i) => encode(s.f, s.t, Math.min(1.6, s.len), `weapons/${id}/far_${i + 1}`, normF(s.pk, 0.7) + pf + ',highpass=f=160,lowpass=f=2400,volume=-3dB'));
  // room tail only for automatic fire: it plays softly under a burst and carries the echo when it stops
  const tails = auto ? singles.slice(0, 3).map((s, i) => encode(s.f, s.t + 0.06, Math.min(1.9, s.len - 0.06), `weapons/${id}/tail_${i + 1}`, normF(s.pk, 0.75) + pf + ',highpass=f=180')) : [];
  put(`weapon.${id}.close`, close);
  put(`weapon.${id}.far`, far);
  put(`weapon.${id}.tail.out`, tails, 0.8);
  // suppressed: band-limited, shortened DRY shots (a suppressor removes the crack and most of the echo)
  const S = cal[w.sup].iso.filter((s) => s.len >= 0.08);
  const sup = S.slice(0, 6).map((s, i) => encode(s.f, s.t, Math.min(0.18, s.len), `weapons/${id}/suppressed_${i + 1}`, normF(s.pk) + pitchF(w.pitch) + ',highpass=f=420,lowpass=f=2100,volume=-9dB'));
  put(`weapon.suppressed.${id}`, sup, ALWAYS_SUPPRESSED.has(id) ? 1.1 : 1);
  if (w.cycle) {
    const files = CYCLES[w.cycle].map((n, i) => {
      const f = path.join(SRC, rc(n));
      return encode(f, 0, Math.min(1.5, decode(f).length / SR), `weapons/${id}/cycle_${i + 1}`, '');
    });
    put(`weapon.${id}.cycle`, files, 0.8);
  }
  const r = RELOADS[id];
  if (r) {
    const list = Array.isArray(r) ? r : [r];
    put(
      `reload.${id}`,
      list.map((n, i) => {
        const f = path.join(SRC, rc(n));
        return encode(f, 0, decode(f).length / SR, `reload/${id}_${i + 1}`, '');
      }),
      0.85,
    );
  }
  console.log(id.padEnd(9), `${CALS[w.cal].name.padEnd(9)} close ${close.length}  far ${far.length}  tail ${tails.length}  suppressed ${sup.length}${w.cycle ? '  cycle' : ''}${r ? '  reload' : ''}`);
}
// buying a gun: magazines unpacked, charging handles and racks
put(
  'ui.buy',
  BUY.map((n, i) => {
    const f = path.join(SRC, rc(n));
    return encode(f, 0, Math.min(1.4, decode(f).length / SR), `ui/buy_${i + 1}`, '');
  }),
  0.7,
);
// empty magazine click
put(
  'dryfire',
  DRYFIRE.map((n, i) => encode(path.join(SRC, n), 0, Math.min(0.6, decode(path.join(SRC, n)).length / SR), `weapons/dryfire_${i + 1}`, '')),
  0.8,
);
man.ext = ['ogg', 'm4a'];
fs.mkdirSync(OUT, { recursive: !0 });
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(man, null, 1));
const size = (d) => fs.readdirSync(d, { withFileTypes: !0 }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`\nWrote ${Object.keys(man.sounds).length} sound keys, ${(size(OUT) / 1048576).toFixed(1)} MB in public/game/audio`);
// ---------- usage report ----------
const all = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: !0 })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : e.name !== '.DS_Store' && all.push(path.relative(SRC, p));
  }
};
walk(SRC);
const used = all.filter((f) => USED.has(f)).sort(),
  unused = all.filter((f) => !USED.has(f) && !/readme|SOUND_USAGE/i.test(f)).sort();
const why = (f) =>
  /\.mp3$/i.test(f)
    ? 'MP3 copy of a WAV master (the WAV is used)'
    : /Isolated\//.test(f)
      ? 'dry recording; the full mix is used for this calibre'
      : /\.22LR/.test(f) || /^Full Sound\/\.22LR/.test(f)
        ? 'no .22 weapon in the game (the 9mm pack covers pistols)'
        : /Revolver/.test(f)
          ? 'no revolver in the game'
          : /Bipod/.test(f)
            ? 'no bipod mechanic in the game'
            : /Part [12]/.test(f)
              ? 'split version of a "Full" take that is used'
              : 'no matching action in the game';
const md = [
  '# Sound usage (generated by tools/build-gunshots.mjs)',
  '',
  `Used: ${used.length} files. Not used: ${unused.length} files.`,
  '',
  '## Used',
  '',
  ...used.map((f) => `- ${f}`),
  '',
  '## Not used',
  '',
  ...unused.map((f) => `- ${f} — ${why(f)}`),
  '',
];
// keep the record of files deleted in earlier clean-ups
const prev = fs.existsSync(path.join(SRC, 'SOUND_USAGE.md')) ? fs.readFileSync(path.join(SRC, 'SOUND_USAGE.md'), 'utf8') : '';
const del = prev.includes('## Deleted') ? '\n' + prev.slice(prev.indexOf('## Deleted')) : '';
fs.writeFileSync(path.join(SRC, 'SOUND_USAGE.md'), md.join('\n') + del);
unused.length && fs.writeFileSync(path.join(SRC, '.unused.json'), JSON.stringify(unused, null, 1));
console.log(`Source files used: ${used.length}, not used: ${unused.length} (see assets-src/soundfx/SOUND_USAGE.md)`);
