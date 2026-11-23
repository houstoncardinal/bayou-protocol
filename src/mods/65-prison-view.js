/* ===== Bayou Protocol mod: Blackwater Penitentiary in 3D (materials, light, sky) ===== */
// Draws the prison (35-prison.js) with real materials instead of the core's flat-coloured boxes:
//   - every box is drawn with a Poly Haven surface, sampled from all three axes so nothing stretches: painted
//     block (greyed, then coloured with the box's paint colour), plaster, sealed concrete, tiles, red brick,
//     granite, cast concrete, painted steel, diamond plate, asphalt, grass, mud, rubber, tarred gravel,
//     corrugated iron. Walls take the wall texture, the tops of things the floor texture. Every surface gets
//     soft stains, so no two metres look the same.
//   - light: a coarse 3D light volume (1 m x 0.75 m cells) is worked out once per map from the collision
//     boxes: how much open sky each point sees (daylight comes in through doors, windows and the cell house
//     skylight and fades into the rooms) and how much lamp light reaches it (each fixture lights its own room,
//     never through a wall). The materials use it for their ambient light, so interiors are darker than the
//     yard and lamps throw pools of light. The game's own lamps (59-lights.js) still add the highlights.
//   - the sky: a Poly Haven sky (day, dusk), the game's own at night
// The modelled shapes (bars, chain-link, rails, stairs, furniture, the vault, lamps, signs...) are built by
// 66-prison-detail.js into the same group.
const __PR = { base: './game/maps/prison/', kit: null, rev: 0, subs: new Set(), ready: !1, loading: !1, tex: null, mean: {}, models: null, mats: null, ticks: [], LV: null };
const __PR_TEX = ['painted_brick', 'painted_plaster_wall', 'garage_floor', 'large_grey_tiles', 'concrete_wall_008', 'concrete_floor_worn_001', 'asphalt_02', 'red_brick_03', 'granite_wall', 'green_metal_rust', 'metal_plate', 'sparse_grass', 'brown_mud_dry', 'rubber_tiles', 'tarred_gravel', 'corrugated_iron'];
const __PR_MODELS = ['security_camera_01', 'mounted_fluorescent_lights', 'hanging_industrial_lamp', 'Television_01', 'steel_frame_shelves_01', 'metal_office_desk', 'utility_box_02', 'korean_fire_extinguisher_01', 'wheelchair_01', 'trashbag', 'concrete_road_barrier', 'barrel_03', 'bolt_cutters_01', 'security_light', 'WetFloorSign_01', 'fire_hydrant'];
// Maps drawn by this pipeline: the prison, and any map with a kit in `m.__view` (the cinema: 72-cinema-view.js):
// its folder, textures (names; `shared` ones come from another map's folder), models, skies and its own detail
// builder in place of the prison's
const __PR_KITS = { prison: { id: 'prison', base: './game/maps/prison/', tex: __PR_TEX, models: __PR_MODELS, sky: ['sky.webp', 'sky_dusk.webp'] } };
const __prKit = (m) => (m && m.__view) || (m && m.id === 'prison' ? __PR_KITS.prison : null);
// surfaces: side / top textures, metres per repeat, tint (1: the texture greyed and painted the box's colour;
// 0: the texture's own colour), roughness scale and floor, metalness, normal strength
const __PR_SURF = {
  block: { side: 'painted_brick', top: 'garage_floor', tile: 1.5, ttile: 2.5, tint: 1, rough: 1, nrm: 1.1 },
  plaster: { side: 'painted_plaster_wall', top: 'garage_floor', tile: 2, ttile: 2.5, tint: 1, rough: 1 },
  ceil: { side: 'painted_plaster_wall', top: 'painted_plaster_wall', tile: 2.5, tint: 1, rough: 1 },
  floor: { side: 'painted_plaster_wall', top: 'garage_floor', tile: 2.5, ttile: 2.2, tint: 1, rough: 0.75, rmin: 0.28 },
  tile: { side: 'large_grey_tiles', top: 'large_grey_tiles', tile: 1.6, tint: 1, rough: 0.8, rmin: 0.2 },
  concrete: { side: 'concrete_wall_008', top: 'concrete_floor_worn_001', tile: 2.7, ttile: 3, tint: 1, rough: 1 },
  walk: { side: 'concrete_wall_008', top: 'concrete_floor_worn_001', tile: 2.7, ttile: 3, tint: 1, rough: 1 },
  brick: { side: 'red_brick_03', top: 'granite_wall', tile: 1.0, ttile: 2, tint: 0, rough: 1, nrm: 1.2 },
  granite: { side: 'granite_wall', top: 'granite_wall', tile: 2.1, tint: 0.25, rough: 1, nrm: 1.2 },
  paint: { side: 'green_metal_rust', top: 'green_metal_rust', tile: 1.0, tint: 1, rough: 0.7, rmin: 0.3, metal: 0.25 },
  plate: { side: 'green_metal_rust', top: 'metal_plate', tile: 1.0, ttile: 0.5, tint: 0.85, rough: 0.8, rmin: 0.25, metal: 0.7, nrm: 1.3 },
  asphalt: { side: 'asphalt_02', top: 'asphalt_02', tile: 3, tint: 0, rough: 1, nrm: 0.8 },
  court: { side: 'asphalt_02', top: 'asphalt_02', tile: 3, tint: 1, rough: 0.8 },
  grass: { side: 'sparse_grass', top: 'sparse_grass', tile: 2, tint: 0, rough: 1 },
  mud: { side: 'brown_mud_dry', top: 'brown_mud_dry', tile: 1.3, tint: 0, rough: 1 },
  rubber: { side: 'rubber_tiles', top: 'rubber_tiles', tile: 2, tint: 1, rough: 0.9 },
  roof: { side: 'concrete_wall_008', top: 'tarred_gravel', tile: 2.7, ttile: 2.2, tint: 0, rough: 1 },
  corr: { side: 'corrugated_iron', top: 'corrugated_iron', tile: 1.12, tint: 1, rough: 0.7, rmin: 0.3, metal: 0.5, nrm: 1.4 },
  insul: { side: 'painted_plaster_wall', top: 'painted_plaster_wall', tile: 3, tint: 1, rough: 0.6, rmin: 0.25, metal: 0.1 },
  wood: { side: 'painted_plaster_wall', top: 'painted_plaster_wall', tile: 1, tint: 1, rough: 0.8 },
  // untextured
  stainless: { plain: 1, rough: 0.32, metal: 0.9, env: 1.1 },
  dark: { plain: 1, rough: 0.6, metal: 0.4 },
  cloth: { plain: 1, rough: 0.95, metal: 0, cloth: 1 },
  glass: { plain: 1, rough: 0.05, metal: 0.1, env: 1.6 },
};
// the core material of an untagged visual -> a surface
const __PR_DEF = { concrete: 'concrete', plaster: 'plaster', metal: 'paint', trim: 'paint', tile: 'tile', asphalt: 'asphalt', grass: 'grass', dirt: 'mud', roof: 'roof', wood: 'wood', panel: 'concrete', stone: 'granite', light: 'insul' };
// The images are decoded off the main thread (createImageBitmap): decoded by three.js's loader they were decoded
// on the main thread when first drawn, about a second of the loading freeze for a map's ~50 textures.
function __prTex(name, srgb, base = __PR.base) {
  const url = base + 'tex/' + name + '.webp',
    mean = (img) => {
      // the colour texture's mean brightness: greyed textures are divided by it, so the paint colour is kept
      if (!srgb || typeof document > 'u') return;
      try {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 16;
        const c = cv.getContext('2d');
        c.drawImage(img, 0, 0, 16, 16);
        const d = c.getImageData(0, 0, 16, 16).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4) {
          const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
          s += Math.pow(l, 2.2);
        }
        __PR.mean[name.replace(/_diff$/, '')] = s / 256;
        const u = __PR.meanU && __PR.meanU[name.replace(/_diff$/, '')];
        u && u.forEach((f) => f());
      } catch (e) {}
    };
  let t;
  // phones: the GPU-compressed copy (01b-ktx2.js, tools/build-ktx2.mjs), transcoded in a worker; its mean
  // brightness was measured when it was built. The texture is handed back at once and filled when it arrives.
  const k2 = typeof __K2 < 'u' && __K2.on && __K2.tex && __K2.tex[url.replace(/^.*?game\//, '').replace(/\.webp$/, '')],
    k2l = k2 && __k2Loader();
  if (k2l) {
    const u2 = url.replace(/\.webp$/, '.ktx2'),
      key = name.replace(/_diff$/, '');
    t = new sd();
    t.flipY = !1;
    srgb &&
      k2.mean != null &&
      Promise.resolve().then(() => {
        __PR.mean[key] = k2.mean;
        const u = __PR.meanU && __PR.meanU[key];
        u && u.forEach((f) => f());
      });
    n3.itemStart(u2);
    k2l.load(
      u2,
      (tx) => {
        const ws = t.wrapS,
          wt = t.wrapT,
          an = t.anisotropy,
          cs = t.colorSpace;
        t.copy(tx);
        (t.wrapS = ws), (t.wrapT = wt), (t.anisotropy = an), (t.colorSpace = cs), (t.flipY = !1);
        t.needsUpdate = !0;
        __K2.nt++;
        n3.itemEnd(u2);
      },
      void 0,
      (e) => {
        console.warn('[prison] texture', u2, e);
        n3.itemError(u2);
        n3.itemEnd(u2);
      },
    );
  } else if (typeof createImageBitmap < 'u' && typeof fetch < 'u') {
    t = new Fi();
    // a bitmap is decoded already flipped (WebGL cannot flip one as it uploads)
    t.flipY = !1;
    n3.itemStart(url);
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(r.status + ' ' + url))))
      .then((b) => createImageBitmap(b, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
      .then((bm) => {
        t.image = bm;
        t.needsUpdate = !0;
        mean(bm);
        n3.itemEnd(url);
      })
      .catch((e) => {
        console.warn('[prison] texture', url, e);
        n3.itemError(url);
        n3.itemEnd(url);
      });
  } else t = new jd().load(url, (tx) => mean(tx.image));
  t.wrapS = t.wrapT = 1e3;
  t.anisotropy = 8;
  srgb && (t.colorSpace = 'srgb');
  return t;
}
// ---------------------------------------------------------------- the light volume
// r: open sky (1 outdoors, fading in through openings), g: lamp light. Collision boxes that stop light:
// walls, floors, roofs, the bounds and shut doors (glass, bars, rails, props and stairs let it through).
function __prLightVolume(m) {
  const cs = 1,
    ch = 0.75,
    X0 = -3,
    Z0 = -3,
    Y0 = -0.5,
    nx = Math.ceil((m.w + 6) / cs),
    nz = Math.ceil((m.d + 6) / cs),
    ny = (m.__view && m.__view.lvNy) || 18, // cells of 0.75 m up from -0.5 m (13 m; the cinema's halls are taller)
    N = nx * ny * nz,
    id = (i, j, k) => (k * ny + j) * nx + i,
    solid = new Uint8Array(N),
    fx = new Uint8Array(N), // face between (i, j, k) and (i + 1, j, k) blocked
    fy = new Uint8Array(N),
    fz = new Uint8Array(N),
    cx = (i) => X0 + (i + 0.5) * cs,
    cy = (j) => Y0 + (j + 0.5) * ch,
    cz = (k) => Z0 + (k + 0.5) * cs,
    clampI = (v, n) => Math.max(0, Math.min(n - 1, v));
  const t0 = performance.now();
  for (const b of m.boxes) {
    if (b.kind === 'glass' || b.kind === 'bars' || b.kind === 'rail' || b.kind === 'prop' || b.kind === 'crate' || b.kind === 'barrel' || b.kind === 'stair' || b.kind === 'trunk') continue;
    const i0 = clampI(Math.floor((b.min.x - X0) / cs - 0.5), nx),
      i1 = clampI(Math.ceil((b.max.x - X0) / cs - 0.5), nx),
      j0 = clampI(Math.floor((b.min.y - Y0) / ch - 0.5), ny),
      j1 = clampI(Math.ceil((b.max.y - Y0) / ch - 0.5), ny),
      k0 = clampI(Math.floor((b.min.z - Z0) / cs - 0.5), nz),
      k1 = clampI(Math.ceil((b.max.z - Z0) / cs - 0.5), nz);
    for (let k = k0; k <= k1; k++) {
      const z0 = cz(k),
        inZ = z0 >= b.min.z && z0 <= b.max.z;
      for (let j = j0; j <= j1; j++) {
        const y0 = cy(j),
          inY = y0 >= b.min.y && y0 <= b.max.y;
        for (let i = i0; i <= i1; i++) {
          const x0 = cx(i),
            inX = x0 >= b.min.x && x0 <= b.max.x,
            c = id(i, j, k);
          inX && inY && inZ && (solid[c] = 1);
          // a box between two cell centres blocks the face between them
          i < nx - 1 && inY && inZ && x0 < b.max.x && x0 + cs > b.min.x && (fx[c] = 1);
          j < ny - 1 && inX && inZ && y0 < b.max.y && y0 + ch > b.min.y && (fy[c] = 1);
          k < nz - 1 && inX && inY && z0 < b.max.z && z0 + cs > b.min.z && (fz[c] = 1);
        }
      }
    }
  }
  const sky = new Float32Array(N),
    lamp = new Float32Array(N);
  // open to the sky: down each column from the top until a roof or floor
  for (let k = 0; k < nz; k++)
    for (let i = 0; i < nx; i++)
      for (let j = ny - 1; j >= 0; j--) {
        const c = id(i, j, k);
        if (solid[c] || (j < ny - 1 && fy[id(i, j, k)])) break;
        sky[c] = 1;
      }
  // lamps: brightness by fixture
  const LI = { tube: 1, pend: 1.05, pend2: 1, cell: 0.55, cage: 0.75, strip: 0.75, flood: 1.0, wall: 0.7, picket: 0.8, lantern: 0.6, chand: 1.2, can: 0.8, sconce: 0.62, cove: 0.7, aisle: 0.45, neon: 0.6, marquee: 1.1, booth: 0.7, bar: 0.85, street: 0.9, fill: 0.9, house: 0.62, spill: 0.6, heli: 0.5, beacon: 1.1 };
  for (const L of (m.__pr && m.__pr.lamps) || []) {
    const i = clampI(Math.floor((L.x - X0) / cs), nx),
      j = clampI(Math.floor((L.y - 0.3 - Y0) / ch), ny),
      k = clampI(Math.floor((L.z - Z0) / cs), nz),
      c = id(i, j, k);
    lamp[c] = Math.max(lamp[c], LI[L.k] || 0.8);
  }
  // spread: each value reaches its open neighbours, fading per step (light through openings, round corners)
  const spread = (v, dh, dv, passes) => {
    for (let p = 0; p < passes; p++) {
      for (let k = 0; k < nz; k++)
        for (let j = 0; j < ny; j++)
          for (let i = 0; i < nx; i++) {
            const c = id(i, j, k);
            if (solid[c]) continue;
            let a = v[c];
            i > 0 && !fx[c - 1] && !solid[c - 1] && (a = Math.max(a, v[c - 1] * dh));
            j > 0 && !fy[c - nx] && !solid[c - nx] && (a = Math.max(a, v[c - nx] * dv));
            k > 0 && !fz[c - nx * ny] && !solid[c - nx * ny] && (a = Math.max(a, v[c - nx * ny] * dh));
            v[c] = a;
          }
      for (let k = nz - 1; k >= 0; k--)
        for (let j = ny - 1; j >= 0; j--)
          for (let i = nx - 1; i >= 0; i--) {
            const c = id(i, j, k);
            if (solid[c]) continue;
            let a = v[c];
            i < nx - 1 && !fx[c] && !solid[c + 1] && (a = Math.max(a, v[c + 1] * dh));
            j < ny - 1 && !fy[c] && !solid[c + nx] && (a = Math.max(a, v[c + nx] * dv));
            k < nz - 1 && !fz[c] && !solid[c + nx * ny] && (a = Math.max(a, v[c + nx * ny] * dh));
            v[c] = a;
          }
    }
  };
  spread(sky, 0.84, 0.9, 3);
  spread(lamp, 0.76, 0.84, 3);
  // a little ambient occlusion: cells with blocked faces round them are darker (corners, under tables of wall)
  const data = new Uint8Array(N * 4);
  for (let c = 0; c < N; c++) {
    let occ = 0;
    fx[c] && occ++;
    fy[c] && occ++;
    fz[c] && occ++;
    c > 0 && fx[c - 1] && occ++;
    c >= nx && fy[c - nx] && occ++;
    c >= nx * ny && fz[c - nx * ny] && occ++;
    const ao = 1 - occ * 0.06;
    data[c * 4] = Math.round(Math.min(1, sky[c] * ao) * 255);
    data[c * 4 + 1] = Math.round(Math.min(1, lamp[c]) * 255);
    data[c * 4 + 2] = solid[c] ? 255 : 0;
    data[c * 4 + 3] = 255;
  }
  const tex = new DZ(data, nx, ny, nz);
  tex.format = 1023;
  tex.type = 1009;
  tex.minFilter = tex.magFilter = 1006;
  tex.unpackAlignment = 1;
  tex.needsUpdate = !0;
  const LV = __PR.LV || (__PR.LV = { uLV: { value: null }, uLVMin: { value: new U() }, uLVSize: { value: new U() }, uLamp: { value: new UA('#ffe2b8') }, uSky: { value: new aA(0.22, 0.7) } });
  LV.uLV.value && LV.uLV.value.dispose();
  LV.uLV.value = tex;
  LV.uLVMin.value.set(X0, Y0, Z0);
  LV.uLVSize.value.set(nx * cs, ny * ch, nz * cs);
  __PR.lvMs = Math.round(performance.now() - t0);
  __PR.lvSample = (x, y, zz) => {
    const i = clampI(Math.floor((x - X0) / cs), nx),
      j = clampI(Math.floor((y - Y0) / ch), ny),
      k = clampI(Math.floor((zz - Z0) / cs), nz),
      c = id(i, j, k);
    return [data[c * 4] / 255, data[c * 4 + 1] / 255, solid[c]];
  };
  return tex;
}
// ---------------------------------------------------------------- materials
const __PR_LIGHT_GLSL = `
{ vec3 lvp = (vFW + normalize(vFN) * 0.45 - uLVMin) / uLVSize; vec4 lv = texture(uLV, lvp);
  float skyv = lv.r;
  reflectedLight.indirectDiffuse *= mix(uSky.x, 1.0, skyv);
  reflectedLight.indirectSpecular *= mix(0.3, 1.0, skyv);
  reflectedLight.indirectDiffuse += diffuseColor.rgb * uLamp * (lv.g * lv.g * 1.5 + lv.g * 0.35) * uSky.y; }
`;
function __prPatchLight(sh) {
  const LV = __PR.LV;
  Object.assign(sh.uniforms, LV);
  sh.vertexShader.includes('varying vec3 vFW') ||
    (sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFW; varying vec3 vFN;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\n{ vec4 fw = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nfw = instanceMatrix * fw;\n#endif\nvFW = (modelMatrix * fw).xyz; vec3 fn = objectNormal;\n#ifdef USE_INSTANCING\nfn = mat3(instanceMatrix) * fn;\n#endif\nvFN = normalize(mat3(modelMatrix) * fn); }'));
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vFW; varying vec3 vFN;\nuniform highp sampler3D uLV; uniform vec3 uLVMin; uniform vec3 uLVSize; uniform vec3 uLamp; uniform vec2 uSky;')
    .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + __PR_LIGHT_GLSL);
}
// the light volume on any material (models, the game's furniture): a wrapper round its own onBeforeCompile
function __prLit(m) {
  if (!m || m.__prLit || !('roughness' in m)) return m;
  m.__prLit = 1;
  // glass with transmission makes three.js draw the whole scene again every frame (for what shows through
  // it): a lamp's glass is drawn as plain see-through glass instead
  if (m.transmission > 0) (m.transmission = 0), (m.transparent = !0), (m.opacity = Math.min(m.opacity, 0.45)), (m.depthWrite = !1);
  const prev = m.onBeforeCompile,
    key = m.customProgramCacheKey && m.customProgramCacheKey.call(m);
  m.onBeforeCompile = (sh, r) => {
    prev && prev.call(m, sh, r);
    __prPatchLight(sh);
  };
  m.customProgramCacheKey = () => 'prison-lit-' + (key || '');
  m.needsUpdate = !0;
  return m;
}
function __prMat(key, o = {}) {
  const S = __PR_SURF[key],
    T = __PR.tex,
    m = new Gw({ color: o.color || '#ffffff', roughness: S.rough ?? 1, metalness: S.metal || 0, vertexColors: o.vc !== !1, envMapIntensity: S.env ?? 0.55, side: o.side || 0 });
  m.__prOwn = 1;
  if (S.plain) {
    S.cloth && (m.sheenRoughness = 1);
    m.onBeforeCompile = (sh) => __prPatchLight(sh);
    m.customProgramCacheKey = () => 'prison-plain';
    return m;
  }
  const u = {
    tS: { value: T[S.side + '_diff'] },
    tSN: { value: T[S.side + '_nor'] },
    tSR: { value: T[S.side + '_rough'] },
    tT: { value: T[S.top + '_diff'] },
    tTN: { value: T[S.top + '_nor'] },
    tTR: { value: T[S.top + '_rough'] },
    uTile: { value: new aA(S.tile, S.ttile || S.tile) },
    uMean: { value: new aA(__PR.mean[S.side] || 0.25, __PR.mean[S.top] || 0.25) },
    uTint: { value: S.tint },
    uRough: { value: new aA(S.rough ?? 1, S.rmin ?? 0.4) },
    uNrm: { value: S.nrm ?? 1 },
  };
  // the means arrive with the images: keep the uniform up to date
  const upd = () => u.uMean.value.set(__PR.mean[S.side] || 0.25, __PR.mean[S.top] || 0.25);
  for (const t of [S.side, S.top]) ((__PR.meanU || (__PR.meanU = {}))[t] || (__PR.meanU[t] = [])).push(upd);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    __prPatchLight(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D tS; uniform sampler2D tSN; uniform sampler2D tSR; uniform sampler2D tT; uniform sampler2D tTN; uniform sampler2D tTR;
uniform vec2 uTile; uniform vec2 uMean; uniform float uTint; uniform vec2 uRough; uniform float uNrm;
float prH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float prN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(prH(i), prH(i + vec2(1, 0)), f.x), mix(prH(i + vec2(0, 1)), prH(i + vec2(1, 1)), f.x), f.y); }`,
      )
      .replace(
        '#include <map_fragment>',
        `
vec3 fN = normalize(vFN);
vec3 bw = pow(abs(fN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
vec2 ux = vec2(vFW.z * sign(fN.x), vFW.y) / uTile.x, uy = vFW.xz / uTile.y, uz = vec2(-vFW.x * sign(fN.z), vFW.y) / uTile.x;
vec3 tc = vec3(0.0); vec3 tn = vec3(0.0); float trr = 0.0;
if (bw.x > 0.01) { tc += texture2D(tS, ux).rgb * bw.x; vec2 d = texture2D(tSN, ux).xy * 2.0 - 1.0; tn += vec3(0.0, d.y, d.x * sign(fN.x)) * bw.x; trr += texture2D(tSR, ux).g * bw.x; }
if (bw.y > 0.01) {
  // tops take the floor texture; undersides (ceilings, the bottoms of slabs and galleries) the wall texture
  if (fN.y >= 0.0) { tc += texture2D(tT, uy).rgb * bw.y; vec2 d = texture2D(tTN, uy).xy * 2.0 - 1.0; tn += vec3(d.x, 0.0, -d.y) * bw.y; trr += texture2D(tTR, uy).g * bw.y; }
  else { vec2 us = vFW.xz / uTile.x; tc += texture2D(tS, us).rgb * bw.y; vec2 d = texture2D(tSN, us).xy * 2.0 - 1.0; tn += vec3(d.x, 0.0, d.y) * bw.y; trr += texture2D(tSR, us).g * bw.y; }
}
if (bw.z > 0.01) { tc += texture2D(tS, uz).rgb * bw.z; vec2 d = texture2D(tSN, uz).xy * 2.0 - 1.0; tn += vec3(-d.x * sign(fN.z), d.y, 0.0) * bw.z; trr += texture2D(tSR, uz).g * bw.z; }
float tmean = mix(uMean.x, fN.y >= 0.0 ? uMean.y : uMean.x, bw.y);
float tl = dot(tc, vec3(0.299, 0.587, 0.114));
tc = mix(tc, vec3(clamp(tl / max(tmean, 0.03), 0.0, 2.2)), uTint);
// stains and wear: large soft blotches, streaks running down walls, grime along the foot of walls
float st = prN(vFW.xz * 0.21 + vec2(vFW.y * 0.13)) * 0.6 + prN(vFW.xz * 0.9 + vec2(-vFW.y * 0.6, vFW.y * 0.3)) * 0.4;
float streak = prN(vec2((vFW.x + vFW.z) * 1.7, vFW.y * 0.12)) * (1.0 - bw.y);
float foot = (1.0 - bw.y) * (1.0 - smoothstep(0.0, 0.5, fract(vFW.y / 3.2 + 0.001) * 3.2)) * 0.12;
tc *= mix(0.8, 1.06, st) * (1.0 - streak * 0.12) * (1.0 - foot);
diffuseColor.rgb *= tc;
float prRough = trr;
vec3 prNW = normalize(fN + tn * uNrm);
`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(prRough * uRough.x, uRough.y, 1.0);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(prNW, 0.0)).xyz);');
  };
  m.customProgramCacheKey = () => 'prison-tri';
  return m;
}
const __prMatFor = (s) => {
  const M = __PR.mats || (__PR.mats = {});
  return M[s] || (M[s] = __prMat(s));
};
// ---------------------------------------------------------------- the boxes
// all visual boxes as faces with a vertex colour (the paint), merged per surface and 32 m tile (culling);
// faces on the ground (never seen) are left out
function __prBoxGeo(list) {
  const P = [],
    Nn = [],
    Cc = [],
    I = [],
    col = new UA();
  const face = (a, b, c, d, n, k) => {
    const base = P.length / 3;
    for (const q of [a, b, c, d]) P.push(q[0], q[1], q[2]), Nn.push(n[0], n[1], n[2]), Cc.push(k[0], k[1], k[2]);
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (const v of list) {
    col.set(v.color || '#ffffff');
    const k = [col.r, col.g, col.b],
      x0 = v.min.x,
      y0 = v.min.y,
      z0 = v.min.z,
      x1 = v.max.x,
      y1 = v.max.y,
      z1 = v.max.z;
    face([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], k);
    y0 > 0.001 && face([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], k);
    face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], k);
    face([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], k);
    face([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], k);
    face([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], k);
  }
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array(P), 3));
  g.setAttribute('normal', new gi(new Float32Array(Nn), 3));
  g.setAttribute('color', new gi(new Float32Array(Cc), 3));
  g.setIndex(P.length / 3 > 65535 ? new gi(new Uint32Array(I), 1) : new gi(new Uint16Array(I), 1));
  g.computeBoundingSphere();
  return g;
}
function __prBoxes(root, m) {
  // merged per surface only: one draw call each. Draw calls are what this map's frames spend their CPU time
  // on (the GPU has room to spare: 3-4 ms a frame at 1600 x 900), and the map is too small for tiles to cull
  const groups = new Map(),
    T = 1e9;
  for (const v of m.visuals) {
    if (v.__skip || v.__crate || !v.__hidden) continue;
    const s = v.s || __PR_DEF[v.mat] || 'concrete';
    if (!__PR_SURF[s]) continue;
    const big = v.max.x - v.min.x > 40 || v.max.z - v.min.z > 40,
      key = s + '|' + (big ? 'big' : Math.floor((v.min.x + v.max.x) / 2 / T) + ',' + Math.floor((v.min.z + v.max.z) / 2 / T));
    (groups.get(key) || groups.set(key, []).get(key)).push(v);
  }
  let n = 0;
  for (const [key, list] of groups) {
    const s = key.split('|')[0];
    __flMesh(root, __prBoxGeo(list), __prMatFor(s), 'prison_box_' + s, s !== 'grass' && s !== 'asphalt' && s !== 'walk');
    n += list.length;
  }
  return n;
}
// ---------------------------------------------------------------- loading
function __prModels(kit, cb) {
  const got = {},
    list = kit.models || [];
  let left = list.length;
  if (!left) return cb(got);
  for (const e of list) {
    const [n, base] = Array.isArray(e) ? e : [e, kit.base];
    __glbParse(
      base + 'models/' + n + '.glb',
      (g) => ((got[n] = g), --left || cb(got)),
      () => --left || cb(got),
    );
  }
}
function __prLoad(kit = __PR_KITS.prison) {
  if (__PR.kit === kit.id && (__PR.loading || __PR.ready)) return;
  const id0 = kit.id;
  __PR.kit = id0;
  __PR.ready = !1;
  __PR.loading = !0;
  __PR.base = kit.base;
  // textures already loaded for another map are kept when this map uses them too; the rest are let go
  const old = __PR.tex || {},
    T = (__PR.tex = {}),
    want = [...(kit.tex || []).map((n) => [n, kit.base]), ...(kit.shared || [])];
  for (const [id, base] of want) for (const k of ['diff', 'nor', 'rough']) T[id + '_' + k] = old[id + '_' + k] || __prTex(id + '_' + k, k === 'diff', base);
  // (a decoded bitmap is freed with its texture)
  for (const k in old) T[k] || (old[k].dispose(), old[k].image && old[k].image.close && old[k].image.close());
  for (const [k, f] of [['sky', kit.sky[0]], ['skyDusk', kit.sky[1]]]) {
    __PR[k] && __PR[k].dispose();
    const s = new jd().load(/^\.|\//.test(f) ? f : kit.base + f);
    s.mapping = 303;
    s.colorSpace = 'srgb';
    __PR[k] = s;
  }
  __prModels(kit, (models) => {
    if (__PR.kit !== id0) return;
    __PR.models = models;
    __PR.ready = !0;
    __PR.loading = !1;
    __PR.rev++;
    for (const f of __PR.subs) f(__PR.rev);
  });
}
function __prBuildView(m) {
  const root = new ji();
  root.name = 'bp-' + m.id;
  __PR.ticks = [];
  __PR.mats = null;
  // materials cached by the detail builders: fresh for each build (the last build's were disposed)
  for (const k of ['glowMat', 'meshMat', 'netMat', 'glassLMat', 'darkMat', 'rodMat']) __PR[k] = null;
  __PR.meanU = {};
  const t0 = performance.now();
  __prLightVolume(m);
  const nBoxes = __prBoxes(root, m);
  let det = null;
  try {
    det = ((m.__view && m.__view.detail) || __prDetail)(root, m, __PR.models || {}, __PR.ticks);
  } catch (e) {
    console.warn('[prison] detail', e);
  }
  // nothing in the scenery moves except a few marked parts (beacons, searchlights): its matrices are worked out
  // once, not every frame (three.js recomputes every object's matrix each frame otherwise, a large CPU cost)
  root.updateMatrixWorld(!0);
  root.traverse((o) => {
    if (o === root || o.userData.dyn) return;
    let dyn = !1;
    for (let p = o.parent; p && p !== root; p = p.parent) p.userData.dyn && (dyn = !0);
    dyn || ((o.matrixAutoUpdate = !1), (o.matrixWorldAutoUpdate = !1));
  });
  __PR.stats = { boxes: nBoxes, lvMs: __PR.lvMs, buildMs: Math.round(performance.now() - t0), detail: det };
  return root;
}
// ---------------------------------------------------------------- drawing (with the map's tree layer)
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw(),
      kit = __prKit(m),
      on = !!kit,
      [rev, setRev] = S.useState(__PR.rev);
    S.useEffect(() => {
      __PR.subs.add(setRev);
      on && __prLoad(kit);
      // the load can finish between this view's first render and this subscription (the loading screen
      // preloads the kit): that signal was missed, and the view never built (bare props floating in the sky).
      // Catch up with whatever has happened since.
      setRev(__PR.rev);
      return () => __PR.subs.delete(setRev);
    }, [on, kit]);
    const root = S.useMemo(() => {
      if (!on || !__PR.ready || __PR.kit !== kit.id) return null;
      try {
        return __prBuildView(m);
      } catch (e) {
        console.warn('[prison] build', e);
        return null;
      }
    }, [on, kit, rev, m]);
    S.useEffect(
      () => () => {
        if (!root) return;
        const seen = new Set();
        root.traverse((o) => {
          if (!o.isMesh && !o.isPoints) return;
          o.geometry && !o.geometry.__shared && o.geometry.dispose();
          for (const mt of [].concat(o.material)) mt && (mt.__prOwn || mt.__flOwn) && !seen.has(mt) && (seen.add(mt), mt.dispose());
        });
        __PR.mats = null;
        const s = __PR.scene;
        s && __PR.bg !== void 0 && ((s.background = __PR.bg), (__PR.bg = void 0));
        __PR.skyMesh && ((__PR.skyMesh.visible = !0), (__PR.skyMesh = null));
      },
      [root],
    );
    QI((s, dt) => {
      if (!root) return;
      try {
        const sc = s.scene;
        __PR.scene = sc;
        for (const f of __PR.ticks) f(dt, s);
        if ((__PR.n = (__PR.n || 0) + 1) % 30 === 1) {
          const tod = Zw.getState().timeOfDay,
            LV = __PR.LV;
          // a kit can scale them: the sky's share indoors (skyK) and the lamps' (lampK)
          const kt = __prKit(aw()) || {};
          LV && (LV.uSky.value.set((tod === 'night' ? 0.12 : tod === 'dusk' ? 0.18 : 0.22) * (kt.skyK ?? 1), (tod === 'night' ? 1.35 : tod === 'dusk' ? 0.95 : 0.7) * (kt.lampK ?? 1)), LV.uLamp.value.set(kt.lampColor || (tod === 'night' ? '#ffd9a8' : '#ffe9c8')));
          // the sky (day and dusk; the game's own stars at night)
          const sky = tod === 'dusk' ? __PR.skyDusk : tod === 'night' ? null : __PR.sky;
          sc.traverse((o) => {
            if (o.isMesh && o.material && o.material.name !== void 0 && /Sky/.test(o.material.type + o.material.name)) {
              sky ? ((__PR.skyMesh = o), (o.visible = !1)) : (o.visible = !0);
            }
          });
          if (sky && sc.background !== sky) (__PR.bg === void 0 && (__PR.bg = sc.background)), (sc.background = sky);
          if (!sky && __PR.bg !== void 0) (sc.background = __PR.bg), (__PR.bg = void 0);
          sc.fog && sc.fog.isFog && ((sc.fog.near = 30), (sc.fog.far = tod === 'night' ? 160 : 280), sc.fog.color.set(tod === 'night' ? '#141922' : tod === 'dusk' ? '#c8b8a8' : '#c9d3dc'));
        }
      } catch (e) {}
    });
    return M.jsxs(M.Fragment, { children: [M.jsx(prevTrees, {}), root ? M.jsx('primitive', { object: root }, 'pr' + rev) : null] });
  };
}
// dev hooks: the view's numbers, and the light at a point
typeof window < 'u' && ((window.__bpPrison = () => ({ ready: __PR.ready, stats: __PR.stats, mean: __PR.mean })), (window.__bpPrisonLight = (x, y, zz) => __PR.lvSample && __PR.lvSample(x, y, zz)));
