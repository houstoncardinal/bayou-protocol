// The outdoor skies (src/mods/89-sky.js): Poly Haven HDRIs (CC0), turned into a sky picture and a lighting map.
//
//   node tools/fetch-sky.mjs          (or: node tools/fetch-polyhaven.mjs sky; skips files already downloaded)
//
// Sources (as downloaded, not shipped): assets-src/maps/sky/<id>_{1k,4k}.hdr
// Output (shipped):                     public/game/sky/
//   <name>.webp       the visible sky, 4096 x 2048 (Medium and High on computers)
//   <name>-2k.webp    the same at 2048 x 1024 (Low, phones, tablets and low-memory devices)
//   <name>-env.hdr    the lighting map, 1024 x 512 Radiance HDR (RLE): what the scene's environment lighting
//                     (reflections and sky light) is made from on Medium and High
//
// The HDRI is scaled once here so that the sky, the sky light and the game's sun (the directional light, at the
// time of day's intensity in the core's table Ku) agree, as in a photograph: the scale is the sun's light in the
// HDRI against the game's sun intensity. Then:
//   - the picture: the scaled sky, cut off at a little above its brightest cloud (8 bits, sRGB); the game shows
//     it at backgroundIntensity = 1 / that cut, so the sky on screen is as bright as the light it gives
//   - the lighting map: the sun taken out (the directional light is the sun, with shadows; left in, it would light
//     everything a second time, without them), and the lower half (a blurred mirror of the sky in these "pure
//     sky" HDRIs, as bright and blue as the sky) replaced with ground: earth-coloured, as bright as ground lit
//     by this sun and sky. The ground's darker bounce is most of what gives shapes their depth
//   - night: the HDRI is a long exposure (the moonlit sky looks like day), so the picture's broad sky is darkened
//     to night and the stars (fine detail) are kept bright
// It prints the numbers 89-sky.js uses (sun direction, horizon colour for the haze, background intensity).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SKIES = {
  // midday, partly cloudy (sun 48 degrees up)
  day: { id: 'kloofendal_48d_partly_cloudy_puresky', sunI: 3, white: 2 },
  // golden-hour sunset (sun 6 degrees up)
  dusk: { id: 'qwantani_sunset_puresky', sunI: 2.6, white: 2 },
  // clear night: stars and a rising moon (14 degrees up)
  night: { id: 'qwantani_moonrise_puresky', sunI: 1.45, white: 0.6, night: { sky: 0.2, stars: 2.2 } },
  // Frostline's daytime: its own snowy-hillside sky (public/game/maps/frostline/sky.webp) stays as the picture;
  // this is the lighting map made from the same HDRI, its snowfield kept as the ground
  // (512 x 256: the snowfield's detail does not compress, and the lighting is soft anyway)
  'frost-day': { id: 'snowy_hillside', sunI: 3, envOnly: !0, keepGround: !0, half: !0 },
};
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'assets-src/maps/sky');
const OUT = path.join(ROOT, 'public/game/sky');
fs.mkdirSync(SRC, { recursive: !0 });
fs.mkdirSync(OUT, { recursive: !0 });

async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
const hdrURL = (id, res) => `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/${res}/${id}_${res}.hdr`;

// ---------------------------------------------------------------- Radiance HDR (RGBE) read and write
function readHDR(buf) {
  let p = 0;
  const line = () => {
    let s = '';
    while (buf[p] !== 10) s += String.fromCharCode(buf[p++]);
    p++;
    return s;
  };
  while (line() !== '') {}
  const m = line().match(/-Y (\d+) \+X (\d+)/),
    H = +m[1],
    W = +m[2],
    out = new Float32Array(W * H * 3),
    scan = new Uint8Array(W * 4);
  for (let y = 0; y < H; y++) {
    if (buf[p] === 2 && buf[p + 1] === 2 && !(buf[p + 2] & 0x80)) {
      p += 4;
      for (let c = 0; c < 4; c++)
        for (let x = 0; x < W; ) {
          let n = buf[p++];
          if (n > 128) {
            n -= 128;
            const v = buf[p++];
            while (n--) scan[x++ * 4 + c] = v;
          } else while (n--) scan[x++ * 4 + c] = buf[p++];
        }
    } else for (let x = 0; x < W * 4; x++) scan[x] = buf[p++];
    for (let x = 0; x < W; x++) {
      const e = scan[x * 4 + 3],
        f = e ? Math.pow(2, e - 128) / 255 : 0, // (as three.js's RGBELoader decodes it)
        o = (y * W + x) * 3;
      out[o] = scan[x * 4] * f;
      out[o + 1] = scan[x * 4 + 1] * f;
      out[o + 2] = scan[x * 4 + 2] * f;
    }
  }
  return { W, H, data: out };
}
function writeHDR({ W, H, data }, file) {
  const parts = [Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${H} +X ${W}\n`, 'latin1')],
    scan = new Uint8Array(W * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3,
        m = Math.max(data[o], data[o + 1], data[o + 2]);
      if (m < 1e-20) {
        scan.fill(0, x * 4, x * 4 + 4);
        continue;
      }
      const e = Math.floor(Math.log2(m)) + 1,
        k = 255 / Math.pow(2, e);
      for (let c = 0; c < 3; c++) scan[x * 4 + c] = Math.min(255, Math.round(data[o + c] * k));
      scan[x * 4 + 3] = e + 128;
    }
    const row = [2, 2, W >> 8, W & 255];
    for (let c = 0; c < 4; c++) {
      let x = 0;
      while (x < W) {
        // a run of 4 or more equal bytes, or literal bytes up to the next such run
        let r = 1;
        while (x + r < W && r < 127 && scan[(x + r) * 4 + c] === scan[x * 4 + c]) r++;
        if (r >= 4) {
          row.push(128 + r, scan[x * 4 + c]);
          x += r;
          continue;
        }
        let n = 0;
        while (x + n < W && n < 128) {
          let rr = 1;
          while (x + n + rr < W && rr < 4 && scan[(x + n + rr) * 4 + c] === scan[(x + n) * 4 + c]) rr++;
          if (rr >= 4) break;
          n++;
        }
        row.push(n);
        for (let i = 0; i < n; i++) row.push(scan[(x + i) * 4 + c]);
        x += n;
      }
    }
    parts.push(Buffer.from(row));
  }
  fs.writeFileSync(file, Buffer.concat(parts));
}

// ---------------------------------------------------------------- measuring an HDRI
const lum = (d, o) => 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2];
// pixel row -> elevation (radians); solid angle of a pixel in that row
const elev = (y, H) => (0.5 - (y + 0.5) / H) * Math.PI;
const dOmega = (y, W, H) => ((2 * Math.PI) / W) * (Math.PI / H) * Math.cos(elev(y, H));
function measure({ W, H, data }) {
  const L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = lum(data, i * 3);
  const s = Float32Array.from(L).sort();
  // the sun: what is above the cut (well over the brightest cloud)
  const cut = Math.max(s[Math.floor(s.length * 0.999)] * 1.5, 1);
  let sx = 0, sy = 0, sz = 0, sr = 0, sg = 0, sb = 0, Esun = 0, Esky = 0;
  for (let y = 0; y < H; y++) {
    const el = elev(y, H),
      dw = dOmega(y, W, H);
    for (let x = 0; x < W; x++) {
      const i = y * W + x,
        l = L[i];
      if (el > 0) Esky += Math.min(l, cut) * Math.sin(el) * dw;
      if (l <= cut) continue;
      // three.js's equirectangular mapping: u = atan(z, x) / 2pi + 0.5, v = asin(y) / pi + 0.5 (v up)
      const phi = ((x + 0.5) / W - 0.5) * 2 * Math.PI,
        w = (l - cut) * dw,
        k = (1 - cut / l) * dw;
      sx += Math.cos(phi) * Math.cos(el) * w;
      sy += Math.sin(el) * w;
      sz += Math.sin(phi) * Math.cos(el) * w;
      sr += data[i * 3] * k;
      sg += data[i * 3 + 1] * k;
      sb += data[i * 3 + 2] * k;
      Esun += w;
    }
  }
  const n = Math.hypot(sx, sy, sz) || 1;
  return { L, cut, sun: [sx / n, sy / n, sz / n], sunRGB: [sr, sg, sb], Esun, Esky, sorted: s };
}
// average colour of a band of elevations (degrees), all the way round
function band({ W, H, data }, lo, hi, cap) {
  let r = 0, g = 0, b = 0, w = 0;
  for (let y = 0; y < H; y++) {
    const el = (elev(y, H) * 180) / Math.PI;
    if (el < lo || el > hi) continue;
    const dw = Math.cos(elev(y, H));
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3,
        l = lum(data, o),
        k = l > cap ? cap / l : 1;
      r += data[o] * k * dw;
      g += data[o + 1] * k * dw;
      b += data[o + 2] * k * dw;
      w += dw;
    }
  }
  return [r / w, g / w, b / w];
}
const srgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const hex = (rgb) => '#' + rgb.map((v) => Math.round(srgb(Math.max(0, Math.min(1, v))) * 255).toString(16).padStart(2, '0')).join('');
const r3 = (a) => a.map((v) => +v.toFixed(4));
// half size (2 x 2 pixels averaged)
function half({ W, H, data }) {
  const w = W / 2,
    h = H / 2,
    out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 3; c++) {
        const a = (yy, xx) => data[((y * 2 + yy) * W + x * 2 + xx) * 3 + c];
        out[(y * w + x) * 3 + c] = (a(0, 0) + a(0, 1) + a(1, 0) + a(1, 1)) / 4;
      }
  return { W: w, H: h, data: out };
}
// separable box blur of a W x H scalar image (wraps round horizontally)
function blur(src, W, H, rad) {
  const tmp = new Float32Array(src.length),
    out = new Float32Array(src.length),
    n = 2 * rad + 1;
  for (let y = 0; y < H; y++) {
    let acc = 0;
    for (let x = -rad; x <= rad; x++) acc += src[y * W + ((x + W) % W)];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = acc / n;
      acc += src[y * W + ((x + rad + 1) % W)] - src[y * W + ((x - rad + W) % W)];
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -rad; y <= rad; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc / n;
      acc += tmp[Math.min(H - 1, y + rad + 1) * W + x] - tmp[Math.max(0, y - rad) * W + x];
    }
  }
  return out;
}

// ---------------------------------------------------------------- build
const report = {};
for (const [name, S] of Object.entries(SKIES)) {
  const f1 = path.join(SRC, `${S.id}_1k.hdr`);
  await download(hdrURL(S.id, '1k'), f1);
  let env = readHDR(fs.readFileSync(f1));
  if (S.half) env = half(env);
  const
    M = measure(env),
    // the scale that makes the HDRI's sun as bright as the game's
    scale = S.sunI / M.Esun,
    sunEl = Math.asin(M.sun[1]),
    sunAz = Math.atan2(M.sun[2], M.sun[0]),
    sunN = Math.max(...M.sunRGB),
    // the night picture's broad sky is darkened: the haze must fade to the same colour
    nightK = S.night ? S.night.sky : 1,
    horizon = band(env, 0, 4, M.cut).map((v) => v * scale * nightK);
  // ---- the lighting map: the sun out, ground in, scaled
  {
    const { W, H, data } = env,
      Eh = (M.Esun * Math.max(0, Math.sin(sunEl)) + M.Esky) / Math.PI,
      ground = [0.2, 0.185, 0.155].map((a) => a * Eh);
    for (let y = 0; y < H; y++) {
      const el = elev(y, H),
        // ground from 4 degrees below the horizon, blending to sky at 1 degree above
        t0 = Math.max(0, Math.min(1, (0.0175 - el) / 0.087)),
        t = S.keepGround ? 0 : t0 * t0 * (3 - 2 * t0);
      for (let x = 0; x < W; x++) {
        const i = y * W + x,
          o = i * 3,
          l = M.L[i],
          k = l > M.cut ? M.cut / l : 1;
        for (let c = 0; c < 3; c++) data[o + c] = (data[o + c] * k * (1 - t) + ground[c] * t) * scale;
      }
    }
    writeHDR(env, path.join(OUT, `${name}-env.hdr`));
  }
  report[name] = {
    id: S.id,
    // the sun (or moon) in the HDRI, in three.js's world directions before any rotation
    sun: r3(M.sun),
    sunElDeg: +((sunEl * 180) / Math.PI).toFixed(2),
    sunAzDeg: +((sunAz * 180) / Math.PI).toFixed(2),
    sunColor: hex(M.sunRGB.map((v) => v / sunN)),
    scale: +scale.toFixed(5),
    // in the game's linear units, for the haze (FogExp2's colour)
    horizon: r3(horizon),
    horizonHex: hex(horizon.map((v) => v / Math.max(...horizon))),
    envKB: +(fs.statSync(path.join(OUT, `${name}-env.hdr`)).size / 1024).toFixed(0),
  };
  if (S.envOnly) continue;
  // ---- the picture, from the 4K HDRI
  const f4 = path.join(SRC, `${S.id}_4k.hdr`);
  await download(hdrURL(S.id, '4k'), f4);
  const big = readHDR(fs.readFileSync(f4)),
    { W, H, data } = big,
    L = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = lum(data, i * 3);
  // night: the broad sky darkened, the fine detail (stars) kept: luminance split into blurred and detail
  let low = null;
  if (S.night) low = blur(blur(L, W, H, 3), W, H, 3);
  // the cut: S.white in the game's units (after the scale) is stored as white. Above it the picture clips; on
  // screen that is all but white anyway after tone mapping (2 for day and dusk: the bright clouds round the
  // sun and the sun itself; 0.6 at night: the moon and its glow)
  const cutBg = 1 / S.white,
    px = Buffer.alloc(W * H * 3);
  let seed = 1;
  for (let i = 0; i < W * H; i++) {
    let k = scale * cutBg;
    if (low) {
      const l = L[i] || 1e-9,
        detail = Math.max(0, l - low[i]);
      k *= (low[i] * S.night.sky + detail * S.night.stars) / l;
    }
    for (let c = 0; c < 3; c++) {
      // (a little noise against banding in the smooth gradients)
      seed = (seed * 16807) % 2147483647;
      const v = srgb(Math.min(1, data[i * 3 + c] * k)) * 255 + (seed / 2147483647 - 0.5);
      px[i * 3 + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  const raw = { raw: { width: W, height: H, channels: 3 } };
  await sharp(px, raw).resize(4096, 2048).webp({ quality: 80, smartSubsample: !0 }).toFile(path.join(OUT, `${name}.webp`));
  await sharp(px, raw).resize(2048, 1024).webp({ quality: 80, smartSubsample: !0 }).toFile(path.join(OUT, `${name}-2k.webp`));
  Object.assign(report[name], {
    // shown at this intensity, the picture is as bright as the lighting
    bgIntensity: +(1 / cutBg).toFixed(4),
    webpKB: +(fs.statSync(path.join(OUT, `${name}.webp`)).size / 1024).toFixed(0),
    webp2kKB: +(fs.statSync(path.join(OUT, `${name}-2k.webp`)).size / 1024).toFixed(0),
  });
}
console.log(JSON.stringify(report, null, 1));
