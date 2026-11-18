/* ===== Bayou Protocol mod: Bayou Palace Cinemas in 3D (the kit and its detail) ===== */
// The cinema (71-cinema.js) is drawn by the prison's pipeline (65-prison-view.js) with this kit: its own Poly
// Haven textures (carpet, velvet, marble, parquet, panelling, stucco, leather, terrazzo; the prison's asphalt,
// concrete, plaster, brick and steel are shared), its models, and the detail built here inside the collision:
//   - seats: about 3,000 premium stadium rockers and the Velvet Room's 80 leather recliners, modelled in detail
//     (sculpted, stitched, piped; arm standards with cup holders) and instanced per room, far rows plainer;
//     step lights on every aisle step
//   - each auditorium's front: velvet curtains in folds, a scalloped valance, black masking round the screen,
//     a gold proscenium, the stage's edge and footlights; acoustic wall panels between gold fillets, sconces
//     that wash the wall with light, the projector's beam from the port to the screen with dust in it
//   - the lobby: a coffered ceiling, chandeliers, a marble compass star in the floor, deco columns, the
//     concession stand (candy cases, popcorn machines, soda fountain, menu boards), velvet-rope queues
//   - the street front: the marquee (letter boards listing what's on, a soffit and borders of chaser bulbs),
//     the PALACE blade sign in neon, the box office, palms in planters, the city across the street at night
//   - posters, the theaters' numbers and titles, the marquee: drawn from the showings (70-screens.js), and
//     redrawn when the /admin dashboard changes them
const __CN_V = { dyn: [], thumbs: {}, rev: -1 };
Object.assign(__PR_SURF, {
  carpet: { side: 'poly_wool_herringbone', top: 'poly_wool_herringbone', tile: 1.1, tint: 1, rough: 1, nrm: 0.7 },
  velvet: { side: 'velour_velvet', top: 'velour_velvet', tile: 0.7, tint: 1, rough: 1, nrm: 0.6 },
  marble: { side: 'marble_01', top: 'marble_01', tile: 2.4, tint: 0.2, rough: 0.35, rmin: 0.06, nrm: 0.35, env: 1.1 },
  parquet: { side: 'dark_wooden_planks', top: 'herringbone_parquet', tile: 1.4, ttile: 1.8, tint: 0, rough: 0.7, rmin: 0.18 },
  woodp: { side: 'dark_wooden_planks', top: 'dark_wooden_planks', tile: 1.3, tint: 0, rough: 0.55, rmin: 0.16, env: 0.8 },
  stucco: { side: 'white_stucco', top: 'white_stucco', tile: 2.4, tint: 1, rough: 1, nrm: 0.8 },
  leather: { side: 'leather_red_02', top: 'leather_red_02', tile: 0.6, tint: 0.5, rough: 0.6, rmin: 0.22, nrm: 0.8 },
  terrazzo: { side: 'terrazzo_tiles', top: 'terrazzo_tiles', tile: 1.8, tint: 0.15, rough: 0.45, rmin: 0.12 },
  hedge: { side: 'sparse_grass', top: 'sparse_grass', tile: 0.7, tint: 1, rough: 1, nrm: 1.6 },
  mosaic: { side: 'marble_mosaic_tiles', top: 'marble_mosaic_tiles', tile: 1.2, tint: 0, rough: 0.4, rmin: 0.12 },
  jacquard: { side: 'quatrefoil_jacquard_fabric', top: 'quatrefoil_jacquard_fabric', tile: 0.9, tint: 1, rough: 1, nrm: 0.8 },
  slat: { side: 'wood_plank_wall', top: 'dark_wooden_planks', tile: 1.6, tint: 0.35, rough: 0.6, rmin: 0.2, nrm: 1.2 },
  // polished rosewood: wainscots, frames, mouldings (72b-cinema-sacred.js)
  rosewood: { side: 'rosewood_veneer1', top: 'rosewood_veneer1', tile: 1.2, tint: 0, rough: 0.42, rmin: 0.1, nrm: 0.5, env: 0.9 },
  gold: { plain: 1, rough: 0.28, metal: 1, env: 1.3 },
  black: { plain: 1, rough: 0.95, metal: 0, cloth: 1 },
});
for (const k of ['gold', 'black', 'glassL', 'cnGlass', 'cnWin']) __PR_NOCAST.add(k);
const __CN_PRISON = './game/maps/prison/';
__PR_KITS.cinema = {
  id: 'cinema',
  base: './game/maps/cinema/',
  tex: ['poly_wool_herringbone', 'velour_velvet', 'marble_01', 'herringbone_parquet', 'dark_wooden_planks', 'white_stucco', 'leather_red_02', 'terrazzo_tiles', 'quatrefoil_jacquard_fabric', 'wood_plank_wall', 'marble_mosaic_tiles', 'rosewood_veneer1'],
  shared: ['sparse_grass', 'painted_plaster_wall', 'garage_floor', 'concrete_wall_008', 'concrete_floor_worn_001', 'asphalt_02', 'red_brick_03', 'granite_wall', 'green_metal_rust', 'metal_plate', 'tarred_gravel', 'large_grey_tiles'].map((n) => [n, __CN_PRISON]),
  models: ['Chandelier_02', 'CashRegister_01', 'bar_chair_round_01', 'Sofa_01', 'coffee_table_round_01', 'potted_plant_02', 'street_lamp_01', 'metal_trash_can', 'ornate_mirror_01', 'mid_century_lounge_chair', 'fancy_picture_frame_01', 'brass_vase_01', 'modern_ceiling_lamp_01', 'CoffeeCart_01', 'ArmChair_01', 'potted_plant_04', 'side_table_01', 'industrial_storage_cart', 'steel_frame_shelves_02', 'cardboard_box_01', 'painted_wooden_bench', 'outdoor_table_chair_set_01', 'planter_box_01', 'covered_car', 'marble_bust_01', 'ClassicConsole_01', ['fire_hydrant', __CN_PRISON]],
  sky: [__CN_PRISON + 'sky.webp', __CN_PRISON + 'sky_dusk.webp'],
  // indoors: less of the sky's blue, more of the lamps' warm light
  skyK: 0.28,
  lvNy: 32,
  lampK: 1.7,
  lampColor: '#ffd9ae',
  detail: (root, m, models, ticks) => __cnDetail(root, m, models, ticks),
};
// ---------------------------------------------------------------- small helpers
const __cnM = (x, y, zz, sx, sy, sz, ry = 0, rx = 0, rz = 0) => __flM(x, y, zz, sx, sy, sz, ry, rx, rz);
// a quad facing +z (local), w x h, for canvas signs
function __cnQuad(w, h) {
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array([-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0]), 3));
  g.setAttribute('normal', new gi(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  g.setAttribute('uv', new gi(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
function __cnPlane(root, x, y, zz, ry, w, h, mat, off = 0.012) {
  const o = new Ow(__cnQuad(w, h), mat);
  o.position.set(x + Math.sin(ry) * off, y, zz + Math.cos(ry) * off);
  o.rotation.y = ry;
  root.add(o);
  return o;
}
function __cnCanvas(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const t = new LI(cv);
  t.colorSpace = 'srgb';
  t.anisotropy = 8;
  t.redraw = () => {
    const c = cv.getContext('2d');
    c.clearRect(0, 0, w, h);
    draw(c, w, h);
    t.needsUpdate = !0;
  };
  t.redraw();
  return t;
}
// additive light (beams, washes, dust, stars) that leaves the canvas's alpha alone: the YouTube screens are
// holes of alpha 0 in the canvas (70-screens.js), and plain additive blending would fill them back in
function __cnAdd(m, fadeNear = 0) {
  m.blending = 5; // custom
  m.blendEquation = 100;
  m.blendSrc = 201;
  m.blendDst = 201;
  m.blendSrcAlpha = 200;
  m.blendDstAlpha = 201;
  m.transparent = !0;
  m.depthWrite = !1;
  m.toneMapped = !1;
  // fade out near the camera (standing in a projector's beam must not grey out the view)
  if (fadeNear) {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vCamD;').replace('#include <project_vertex>', '#include <project_vertex>\nvCamD = -mvPosition.z;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCamD;').replace('#include <opaque_fragment>', `outgoingLight *= smoothstep(${(fadeNear * 0.3).toFixed(2)}, ${fadeNear.toFixed(2)}, vCamD);\n#include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'cn-add-fade-' + fadeNear;
  }
  m.__prOwn = 1;
  return m;
}
const __cnGlowMat = (map, k = 1, o = {}) => {
  const m = new Ni({ map, toneMapped: !1, ...o });
  m.color.setScalar(k);
  m.__prOwn = 1;
  return m;
};
const __CN_FONT = (px, wgt = 800, fam = '"Big Shoulders Display", "Barlow Condensed", "Arial Narrow", sans-serif') => `${wgt} ${px}px ${fam}`;
function __cnFit(c, txt, px, maxW, wgt, fam) {
  let p = px;
  c.font = __CN_FONT(p, wgt, fam);
  while (c.measureText(txt).width > maxW && p > 8) c.font = __CN_FONT(--p, wgt, fam);
  return p;
}
// the cinema's screens in order (posters cycle through them)
const __CN_IDS = ['t1', 't2', 't3', 't4', 't5', 'lounge'];
const __cnShow = (id) => (typeof __scrShowing == 'function' ? __scrShowing(id) : null);
const __cnName = (id) => (typeof __scrName == 'function' ? __scrName(id) : id);
// a film's picture: YouTube's thumbnail, or a frame of a video file
function __cnThumb(s, cb) {
  if (!s || typeof document > 'u') return null;
  const key = s.videoId || s.url;
  if (!key) return null;
  const T = __CN_V.thumbs;
  if (T[key]) return T[key].ok ? T[key].img : (T[key].wait.push(cb), null);
  T[key] = { ok: !1, wait: [cb], img: null };
  const done = (img) => {
    T[key].ok = !0;
    T[key].img = img;
    for (const f of T[key].wait.splice(0)) f && f();
  };
  if (s.videoId) {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => done(im);
    im.onerror = () => done(null);
    im.src = `https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg`;
  } else {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = !0;
    v.preload = 'auto';
    v.src = new URL(s.url.replace(/^\//, './'), document.baseURI).href;
    v.addEventListener('loadedmetadata', () => (v.currentTime = Math.min(20, (v.duration || 40) * 0.3)));
    v.addEventListener('seeked', () => {
      const cv = document.createElement('canvas');
      cv.width = 480;
      cv.height = Math.round((480 * (v.videoHeight || 9)) / (v.videoWidth || 16));
      cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
      done(cv);
      v.removeAttribute('src');
      v.load();
    });
    v.addEventListener('error', () => done(null));
  }
  return null;
}
// cover-fit an image into a rectangle
function __cnCover(c, img, x, y, w, h, cut = 0) {
  const iw = img.width,
    ih = img.height * (1 - cut * 2),
    k = Math.max(w / iw, h / ih),
    sw = w / k,
    sh = h / k;
  c.drawImage(img, (iw - sw) / 2, img.height * cut + (ih - sh) / 2, sw, sh, x, y, w, h);
}
// ---------------------------------------------------------------- signs and posters (canvas)
function __cnSignTex(sg) {
  const K = sg.k;
  if (K === 'exit')
    return __cnCanvas(256, 96, (c, w, h) => {
      c.fillStyle = '#0d1a10';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5bff8a';
      c.shadowColor = '#3cff70';
      c.shadowBlur = 14;
      __cnFit(c, 'EXIT', 70, w * 0.8, 800, 'Barlow, sans-serif');
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('EXIT', w / 2, h / 2 + 3);
    });
  if (K === 'number')
    return __cnCanvas(320, 180, (c, w, h) => {
      c.fillStyle = '#120d0a';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c9a45a';
      c.lineWidth = 5;
      c.strokeRect(6, 6, w - 12, h - 12);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#c9a45a';
      c.font = __CN_FONT(22, 700, 'Barlow, sans-serif');
      c.fillText('T H E A T E R', w / 2, 32);
      c.fillStyle = '#ffe9b8';
      c.shadowColor = '#ffcf7a';
      c.shadowBlur = 18;
      c.font = __CN_FONT(118, 900);
      c.fillText(String(sg.n), w / 2, h / 2 + 22);
    });
  if (K === 'title' || K === 'boxoffice') {
    const t = __cnCanvas(1024, Math.round((1024 * sg.h) / sg.w), (c, w, h) => {
      c.fillStyle = '#0e0b09';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c9a45a';
      c.lineWidth = 3;
      c.strokeRect(4, 4, w - 8, h - 8);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (K === 'boxoffice') {
        c.fillStyle = '#ff5a4a';
        c.shadowColor = '#ff3020';
        c.shadowBlur = 16;
        __cnFit(c, 'T I C K E T S', h * 0.7, w * 0.8);
        c.fillText('T I C K E T S', w / 2, h / 2 + 2);
        return;
      }
      const s = __cnShow(sg.th),
        title = s ? s.title : 'Dark tonight';
      c.fillStyle = '#c9a45a';
      __cnFit(c, 'NOW SHOWING', h * 0.32, w * 0.3, 700, 'Barlow, sans-serif');
      c.fillText('NOW SHOWING', w / 2, h * 0.27);
      c.fillStyle = '#fff1d0';
      c.shadowColor = '#ffd27a';
      c.shadowBlur = 10;
      __cnFit(c, String(title).toUpperCase(), h * 0.5, w * 0.92);
      c.fillText(String(title).toUpperCase(), w / 2, h * 0.67);
    });
    K === 'title' && __CN_V.dyn.push(t);
    return t;
  }
  if (K === 'menu')
    return __cnCanvas(2048, 205, (c, w, h) => {
      c.fillStyle = '#100c0a';
      c.fillRect(0, 0, w, h);
      const cols = [
        ['POPCORN', [['Small', '6.50'], ['Medium', '8.00'], ['Large', '9.50'], ['Butter refill', 'free']]],
        ['REFRESHMENTS', [['Fountain drink', '5.50'], ['Bottled water', '4.00'], ['Iced tea', '4.50'], ['Hot coffee', '3.50']]],
        ['CANDY & SNACKS', [['Pralines', '4.75'], ['Chocolate', '5.25'], ['Nachos', '7.50'], ['Hot dog', '6.75']]],
        ['COMBOS', [['Date night', '19.00'], ['Family', '29.00'], ['Solo', '12.50'], ['Kids', '8.00']]],
      ];
      const cw = w / cols.length;
      cols.forEach(([hd, rows], i) => {
        const x0 = i * cw;
        c.strokeStyle = '#c9a45a';
        c.lineWidth = 3;
        c.strokeRect(x0 + 8, 8, cw - 16, h - 16);
        c.fillStyle = '#ffcf6a';
        c.textAlign = 'center';
        c.font = __CN_FONT(40, 800);
        c.fillText(hd, x0 + cw / 2, 52);
        c.font = __CN_FONT(27, 600, 'Barlow, sans-serif');
        rows.forEach(([a, b], k) => {
          const y = 92 + k * 28;
          c.textAlign = 'left';
          c.fillStyle = '#f5ead2';
          c.fillText(a, x0 + 34, y);
          c.textAlign = 'right';
          c.fillStyle = '#ffcf6a';
          c.fillText(b === 'free' ? 'free' : '$' + b, x0 + cw - 34, y);
        });
      });
    });
  return null;
}
// a poster: the film's picture, the title, the screen's name
function __cnPosterTex(slot) {
  const t = __cnCanvas(384, 576, (c, w, h) => {
    const id = __CN_IDS[slot % __CN_IDS.length],
      s = __cnShow(id);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1d1410');
    g.addColorStop(1, '#070504');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const img = s && __cnThumb(s, () => t.redraw());
    if (img) {
      __cnCover(c, img, 0, 40, w, h * 0.66, s.videoId ? 0.12 : 0);
      const f = c.createLinearGradient(0, h * 0.45, 0, h * 0.76);
      f.addColorStop(0, 'rgba(7,5,4,0)');
      f.addColorStop(1, 'rgba(7,5,4,1)');
      c.fillStyle = f;
      c.fillRect(0, h * 0.4, w, h * 0.4);
    }
    c.textAlign = 'center';
    c.fillStyle = '#c9a45a';
    c.font = __CN_FONT(22, 700, 'Barlow, sans-serif');
    c.fillText('N O W   S H O W I N G', w / 2, 28);
    const title = (s && s.title) || 'Coming soon';
    c.fillStyle = '#fff3d8';
    const words = String(title).toUpperCase().split(/\s+/),
      lines = [];
    let ln = '';
    c.font = __CN_FONT(54, 900);
    for (const wd of words) {
      const tryL = ln ? ln + ' ' + wd : wd;
      if (c.measureText(tryL).width > w * 0.86 && ln) lines.push(ln), (ln = wd);
      else ln = tryL;
    }
    ln && lines.push(ln);
    const L = lines.slice(0, 3);
    L.forEach((l, k) => {
      __cnFit(c, l, 54, w * 0.88, 900);
      c.fillText(l, w / 2, h * 0.8 + (k - (L.length - 1) / 2) * 50);
    });
    c.fillStyle = '#c9a45a';
    c.font = __CN_FONT(20, 600, 'Barlow, sans-serif');
    c.fillText(((s && s.channel) || '').toUpperCase(), w / 2, h - 52);
    c.fillStyle = '#f2ead8';
    c.font = __CN_FONT(24, 800);
    c.fillText(__cnName(id).toUpperCase(), w / 2, h - 20);
    c.strokeStyle = '#c9a45a';
    c.lineWidth = 4;
    c.strokeRect(10, 10, w - 20, h - 20);
  });
  __CN_V.dyn.push(t);
  return t;
}
// BAYOU PALACE in lit gold letters
const __cnNameTex = () =>
  __cnCanvas(2048, 140, (c, w, h) => {
    c.fillStyle = '#2a0d10';
    c.fillRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = __CN_FONT(118, 900);
    c.shadowColor = '#ffb347';
    c.shadowBlur = 28;
    c.fillStyle = '#ffe2a0';
    const t = 'B A Y O U    P A L A C E';
    __cnFit(c, t, 118, w * 0.96, 900);
    c.fillText(t, w / 2, h / 2 + 4);
  });
// the marquee's letter boards: black letters on a lit white board, the films now showing (rows of screens)
function __cnMarqueeTex(w, h, rows) {
  const t = __cnCanvas(Math.round(w * 110), Math.round(h * 110), (c, W, H) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fffaf0');
    g.addColorStop(1, '#f1e6cf');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#7a1a1a';
    c.fillRect(0, 0, W, H * 0.06);
    c.fillRect(0, H * 0.94, W, H * 0.06);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const rh = (H * 0.86) / rows.length;
    rows.forEach((ids, k) => {
      const y = H * 0.07 + rh * (k + 0.5),
        cw = W / ids.length;
      ids.forEach((id, j) => {
        const s = __cnShow(id),
          txt = (/^t[1-4]$/.test(id) ? id.slice(1) + ' · ' : '') + String((s && s.title) || 'Dark tonight').toUpperCase();
        c.fillStyle = '#151210';
        __cnFit(c, txt, rh * 0.8, cw * 0.9, 900);
        c.fillText(txt, cw * (j + 0.5), y + 3);
        j && ((c.fillStyle = '#7a1a1a'), c.fillRect(cw * j - 3, y - rh * 0.3, 6, rh * 0.6));
      });
    });
  });
  __CN_V.dyn.push(t);
  return t;
}
// the blade sign's neon letters
const __cnBladeTex = () =>
  __cnCanvas(320, 1280, (c, w, h) => {
    c.fillStyle = '#5c1015';
    c.fillRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const L = 'PALACE';
    for (let i = 0; i < L.length; i++) {
      const y = 120 + i * ((h - 240) / (L.length - 1));
      c.font = __CN_FONT(200, 900);
      c.lineWidth = 12;
      c.strokeStyle = '#ffd88a';
      c.shadowColor = '#ffb347';
      c.shadowBlur = 30;
      c.strokeText(L[i], w / 2, y);
      c.shadowBlur = 0;
      c.fillStyle = '#fff6e0';
      c.fillText(L[i], w / 2, y);
    }
  });
// a soft light washing a wall above a sconce (additive)
const __cnWashTex = () =>
  __PR.cnWash ||
  (__PR.cnWash = __cnCanvas(128, 160, (c, w, h) => {
    // fades to nothing well inside the quad's edges (a hard edge read as an orange tile on the wall)
    const g = c.createRadialGradient(w / 2, h * 0.6, 2, w / 2, h * 0.6, w * 0.46);
    g.addColorStop(0, 'rgba(255,206,150,0.42)');
    g.addColorStop(0.3, 'rgba(255,186,120,0.14)');
    g.addColorStop(0.7, 'rgba(255,170,100,0.03)');
    g.addColorStop(1, 'rgba(255,150,70,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }));
// ---------------------------------------------------------------- seats (instanced)
// A soft box: a grid on each face (xs, ys, zs: the sample coordinates along each axis, its ends included), its
// edges rounded to r (each vertex pushed out from the box shrunk by r, with analytic normals, so even a few
// vertices shade as a smooth roll), then bent by def (a position -> position map: the wrap of a backrest, the
// dish of a cushion, channel stitching), the normals carried through the bend (by its Jacobian). skip: faces
// left out ('+z -y': never seen)
const __cnRamp = (h, r, inner = []) => [-h, -h + r, ...inner, h - r, h];
function __cnSoft(xs, ys, zs, r, def, skip = '') {
  const P = [],
    Nn = [],
    I = [],
    S = [xs, ys, zs],
    lo = S.map((a) => a[0] + r),
    hi = S.map((a) => a[a.length - 1] - r),
    e = 1e-3,
    F = def || ((p) => p);
  for (const [ax, sg, key] of [[0, 1, '+x'], [0, -1, '-x'], [1, 1, '+y'], [1, -1, '-y'], [2, 1, '+z'], [2, -1, '-z']]) {
    if (skip.includes(key)) continue;
    const u = (ax + 1) % 3,
      v = (ax + 2) % 3,
      Uu = S[u],
      Vv = S[v],
      base = P.length / 3;
    for (let j = 0; j < Vv.length; j++)
      for (let i = 0; i < Uu.length; i++) {
        const p = [0, 0, 0];
        p[ax] = sg > 0 ? S[ax][S[ax].length - 1] : S[ax][0];
        p[u] = Uu[i];
        p[v] = Vv[j];
        // round: out from the shrunk box
        const c = p.map((q, k) => Math.max(lo[k], Math.min(hi[k], q))),
          d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]],
          L = Math.hypot(d[0], d[1], d[2]);
        let n = [0, 0, 0];
        if (L > 1e-7) (n = d.map((q) => q / L)), (p[0] = c[0] + n[0] * r), (p[1] = c[1] + n[1] * r), (p[2] = c[2] + n[2] * r);
        else n[ax] = sg;
        // bend: the position, and the normal through the inverse transpose of the bend's Jacobian
        const q = F(p),
          col = [0, 1, 2].map((k) => {
            const a = [...p],
              b = [...p];
            a[k] += e;
            b[k] -= e;
            const fa = F(a),
              fb = F(b);
            return [(fa[0] - fb[0]) / (2 * e), (fa[1] - fb[1]) / (2 * e), (fa[2] - fb[2]) / (2 * e)];
          }),
          cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
          k0 = cr(col[1], col[2]),
          k1 = cr(col[2], col[0]),
          k2 = cr(col[0], col[1]),
          m = [0, 1, 2].map((k) => n[0] * k0[k] + n[1] * k1[k] + n[2] * k2[k]),
          ml = Math.hypot(m[0], m[1], m[2]) || 1;
        P.push(q[0], q[1], q[2]);
        Nn.push(m[0] / ml, m[1] / ml, m[2] / ml);
      }
    const W = Uu.length;
    for (let j = 0; j < Vv.length - 1; j++)
      for (let i = 0; i < W - 1; i++) {
        const a = base + j * W + i,
          b = a + 1,
          c = a + W + 1,
          d = a + W;
        sg > 0 ? I.push(a, b, c, a, c, d) : I.push(a, c, b, a, d, c);
      }
  }
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array(P), 3));
  g.setAttribute('normal', new gi(new Float32Array(Nn), 3));
  g.setAttribute('color', new gi(new Float32Array(P.length).fill(1), 3));
  g.setIndex(I);
  return g;
}
// The seats as templates (facing -z, the front edge at z = 0, standing on y = 0), in three materials:
// upholstery (velour on the rockers, leather on the recliners; tinted per instance), dark (shells, frames,
// standards, cup holders) and brass (cup-holder rims, seat plates)
//   - the Palace XL rocker (about 630 triangles): a dished seat cushion with piping along its front, a
//     sculpted backrest wrapping round you with a lumbar roll and three stitched vertical channels, a headrest
//     pad, a moulded back shell with a brass seat plate
//   - its arm standard (shared by neighbours, about 150): a side panel, a padded armrest, a cup holder
//   - the Velvet Room's recliner (about 1,000): a chassis, a deep seat, two pillow-top bolsters and a headrest
//     pillow, a padded shell, two wide padded arms with cup holders, the footrest stowed under the seat front
function __cnSeatGeo(kind) {
  if (kind === 'stdLo') {
    // the far rows' rocker (about 150 triangles): the same shapes as plain rounded boxes
    const V = __flMB(),
      Dk = __flMB(),
      G = __flMB();
    V.add(__prRBox(0.54, 0.15, 0.54, 0.05, 1), __cnM(0, 0.455, 0.29, 1, 1, 1, 0, 0.08), 1);
    V.add(__prRBox(0.54, 0.74, 0.13, 0.05, 1), __cnM(0, 0.93, 0.66, 1, 1, 1, 0, 0.24), 1);
    Dk.add(__prRBox(0.58, 0.86, 0.05, 0.02, 1), __cnM(0, 0.98, 0.765, 1, 1, 1, 0, 0.24), 1);
    return [V.build(), Dk.build(), G.build()];
  }
  const V = __flMB(),
    Dk = __flMB(),
    G = __flMB(),
    put = (B, g, x, y, zz, rx = 0) => B.add(g, __cnM(x, y, zz, 1, 1, 1, 0, rx), 1),
    dish = (hx, hy, hz, k) => (p) => [p[0], p[1] - k * (1 - (p[0] / hx) ** 2) * (1 - (p[2] / hz) ** 2) * ((p[1] + hy) / (2 * hy)), p[2]],
    wrap = (hx, k) => (p) => [p[0], p[1], p[2] - k * (p[0] / hx) ** 2];
  if (kind === 'recliner') {
    put(Dk, __prRBox(0.86, 0.3, 0.95, 0.04, 1), 0, 0.15, 0.5);
    put(V, __cnSoft(__cnRamp(0.3, 0.05, [-0.12, 0, 0.12]), __cnRamp(0.09, 0.05), __cnRamp(0.32, 0.05, [-0.12, 0, 0.12]), 0.05, dish(0.3, 0.09, 0.32, 0.025), '-y'), 0, 0.39, 0.44, 0.04);
    const bol = (hx, hy, hz) => __cnSoft(__cnRamp(hx, 0.07, [-0.12, 0, 0.12]), __cnRamp(hy, 0.07, [0]), __cnRamp(hz, 0.07), 0.07, wrap(hx, 0.05), '+z');
    put(V, bol(0.3, 0.17, 0.11), 0, 0.66, 0.84, 0.28);
    put(V, bol(0.29, 0.15, 0.1), 0, 0.98, 0.93, 0.28);
    put(V, __cnSoft(__cnRamp(0.25, 0.06, [0]), __cnRamp(0.09, 0.05), __cnRamp(0.08, 0.05), 0.05, wrap(0.25, 0.04), '+z'), 0, 1.22, 1.0, 0.28);
    put(V, __prRBox(0.72, 0.92, 0.14, 0.05, 1), 0, 0.82, 1.03, 0.28);
    for (const sx of [-1, 1]) {
      put(V, __cnSoft([-0.07, -0.01, 0.01, 0.07], [-0.16, -0.1, 0.1, 0.16], [-0.46, -0.4, 0.4, 0.46], 0.06), sx * 0.4, 0.5, 0.52);
      Dk.add(__prUnit('cyl8'), __cnM(sx * 0.4, 0.63, 0.13, 0.045, 0.08, 0.045), 1);
      G.add(__prUnit('cyl8'), __cnM(sx * 0.4, 0.665, 0.13, 0.05, 0.012, 0.05), 1);
    }
    put(V, __prRBox(0.58, 0.22, 0.08, 0.03, 1), 0, 0.2, 0.01);
    return [V.build(), Dk.build(), G.build()];
  }
  // the rocker: a dished cushion, sloping back a little
  put(V, __cnSoft(__cnRamp(0.27, 0.04, [0]), __cnRamp(0.075, 0.035), __cnRamp(0.27, 0.04, [0.05]), 0.035, dish(0.27, 0.075, 0.27, 0.02), '-y'), 0, 0.455, 0.29, 0.08);
  put(Dk, __prRBox(0.5, 0.08, 0.5, 0.02, 1), 0, 0.36, 0.3);
  // piping along the cushion's front edge
  Dk.add(__prUnit('cyl8'), __cnM(0, 0.522, 0.045, 0.012, 0.5, 0.012, 0, 0, Math.PI / 2), 1);
  // the backrest: wrapping round you, a lumbar roll, three stitched channels and a seam across the top
  const back = (p) => {
    const wf = Math.max(0, Math.min(1, -p[2] / 0.065)),
      g = Math.exp(-(((Math.abs(p[0]) - 0.1) / 0.03) ** 2)) * 0.012 + Math.exp(-(((p[1] - 0.12) / 0.06) ** 2)) * 0.008;
    return [p[0], p[1], p[2] - 0.06 * (p[0] / 0.27) ** 2 - 0.025 * Math.exp(-(((p[1] + 0.13) / 0.12) ** 2)) + g * wf];
  };
  put(V, __cnSoft(__cnRamp(0.27, 0.045, [-0.14, -0.1, -0.06, 0, 0.06, 0.1, 0.14]), __cnRamp(0.36, 0.045, [-0.15, 0.12]), __cnRamp(0.065, 0.045), 0.045, back, '+z -y'), 0, 0.9, 0.66, 0.24);
  put(V, __cnSoft(__cnRamp(0.22, 0.04, [0]), __cnRamp(0.09, 0.04), __cnRamp(0.06, 0.04), 0.04, wrap(0.22, 0.04), '+z'), 0, 1.34, 0.78, 0.24);
  // the moulded shell behind, a brass seat plate on its top
  put(Dk, __cnSoft(__cnRamp(0.29, 0.02, [0]), __cnRamp(0.43, 0.02, [0]), [-0.025, 0.025], 0.02, wrap(0.27, 0.06)), 0, 0.98, 0.765, 0.24);
  G.add(__prUnit('box'), __cnM(0, 1.36, 0.92, 0.09, 0.035, 0.008, 0, 0.24), 1);
  return [V.build(), Dk.build(), G.build()];
}
// arm standards between seats: a side panel, a padded armrest, a cup holder with a brass rim (the recliners
// carry their own arms)
function __cnArmGeo(lo) {
  const B = __flMB(),
    G = __flMB();
  if (lo) {
    B.add(__prRBox(0.08, 0.68, 0.62, 0.025, 1), __cnM(0, 0.34, 0.36, 1, 1, 1), 1);
    return [B.build(), G.build()];
  }
  B.add(__prRBox(0.06, 0.6, 0.62, 0.02, 1), __cnM(0, 0.3, 0.38, 1, 1, 1), 1);
  B.add(__prRBox(0.1, 0.055, 0.6, 0.025, 1), __cnM(0, 0.66, 0.33, 1, 1, 1), 1);
  B.add(__prUnit('cyl8'), __cnM(0, 0.63, 0.0, 0.042, 0.09, 0.042), 1);
  G.add(__prUnit('cyl8'), __cnM(0, 0.68, 0.0, 0.047, 0.012, 0.047), 1);
  return [B.build(), G.build()];
}
// every seat of the map (the same list 73-cinema-seats.js sits people in): position, yaw, colour
function __cnSeatList(N) {
  const out = [];
  for (const b of N.seats) {
    if (b.list) {
      b.list.forEach((s, i) => out.push({ kind: b.kind, th: b.th, x: s.x, y: b.y, z: s.z, ry: s.yaw, color: b.color, dim: (i * 7 + (b.row || 0) * 3) % 11 === 0 }));
      continue;
    }
    const len = b.a1 - b.a0,
      cnt = b.n,
      sp = len / cnt,
      ew = b.face === 'E' || b.face === 'W',
      ry = b.face === 'E' ? -Math.PI / 2 : b.face === 'W' ? Math.PI / 2 : 0,
      front = b.face === 'E' ? b.f + b.d / 2 : b.face === 'W' ? b.f - b.d / 2 : b.f,
      arc = b.arc,
      off = (x) => (arc ? -arc.sag * Math.pow((x - arc.cx) / arc.hw, 2) : 0),
      turn = (x) => (arc ? Math.atan((2 * arc.sag * (x - arc.cx)) / (arc.hw * arc.hw)) : 0);
    for (let i = 0; i <= cnt; i++) {
      const a = b.a0 + sp * i,
        am = a + sp / 2;
      i < cnt && out.push({ kind: b.kind, th: b.th, row: b.row || 0, x: ew ? front : am, y: b.y, z: ew ? am : front + off(am), ry: ry + turn(am), color: b.color, dim: (i * 7 + (b.row || 0) * 3) % 11 === 0 });
      b.kind === 'std' && out.push({ arm: 1, th: b.th, row: b.row || 0, x: ew ? front : a, y: b.y, z: ew ? a : front + off(a), ry: ry + turn(a) });
    }
  }
  return out;
}
// instanced, one set per room: only the rooms the camera is in or at the door of are drawn (four auditoriums of
// 750 seats each would otherwise all be drawn from anywhere). In the auditoriums the rows go in pairs, each drawn
// in full detail within 6.5 m of the camera and as the plain far-row rocker beyond
function __cnSeats(root, N, ticks) {
  const all = __cnSeatList(N),
    M = new _A(),
    Q = new Kw(),
    P = new U(),
    Sc = new U(1, 1, 1),
    Y = new U(0, 1, 0),
    col = new UA(),
    geo = { std: __cnSeatGeo('std'), stdLo: __cnSeatGeo('stdLo'), recliner: __cnSeatGeo('recliner'), arm: __cnArmGeo(), armLo: __cnArmGeo(!0) },
    mD = __prMats('darkM'),
    mG = __prMats('gold'),
    rooms = [],
    bands = [];
  for (const k in geo) for (const g of geo[k]) (g.__cnOwn = 1), g.computeBoundingSphere();
  let n = 0,
    tris = 0;
  // one instanced set (upholstery, dark, brass) of a template for a list of seats
  const set = (parent, list, gk, upKey, name) => {
    const parts = gk === 'arm' || gk === 'armLo' ? [[geo[gk][0], mD, !1], [geo[gk][1], mG, !1]] : [[geo[gk][0], __prMatFor(upKey), !0], [geo[gk][1], mD, !1], [geo[gk][2], mG, !1]];
    let t = 0;
    for (const [g, mat, tinted] of parts) {
      if (!g.index.count) continue;
      const im = new QZ(g, mat, list.length);
      list.forEach((s, k) => {
        Q.setFromAxisAngle(Y, s.ry);
        im.setMatrixAt(k, M.compose(P.set(s.x, s.y, s.z), Q, Sc));
        tinted && im.setColorAt(k, col.set(s.color).multiplyScalar(s.dim ? 0.82 : 1));
      });
      im.instanceMatrix.needsUpdate = !0;
      im.instanceColor && (im.instanceColor.needsUpdate = !0);
      im.computeBoundingSphere();
      im.castShadow = gk === 'recliner';
      im.receiveShadow = !0;
      im.name = name;
      parent.add(im);
      t += (g.index.count / 3) * list.length;
    }
    return t;
  };
  for (const T of N.th) {
    const mine = all.filter((s) => s.th === T.id);
    if (!mine.length) continue;
    const grp = new ji();
    grp.name = 'cinema_seats_' + T.id;
    grp.userData.dyn = 1;
    const rec = mine.filter((s) => !s.arm && s.kind === 'recliner');
    rec.length && ((tris += set(grp, rec, 'recliner', 'leather', 'cinema_seats_recliner')), (n += rec.length));
    const std = mine.filter((s) => s.kind === 'std' || s.arm);
    for (let b0 = 0; std.length && b0 <= 18; b0 += 2) {
      const band = std.filter((s) => s.row >= b0 && s.row < b0 + 2);
      if (!band.length) continue;
      const hi = new ji(),
        lo = new ji(),
        seats = band.filter((s) => !s.arm),
        arms = band.filter((s) => s.arm);
      hi.userData.dyn = lo.userData.dyn = 1;
      tris += set(hi, seats, 'std', 'velvet', 'cinema_seats_std') + set(hi, arms, 'arm', '', 'cinema_seats_arm');
      set(lo, seats, 'stdLo', 'velvet', 'cinema_seats_far');
      set(lo, arms, 'armLo', '', 'cinema_seats_armfar');
      grp.add(hi, lo);
      n += seats.length;
      let x0 = 1e9,
        x1 = -1e9,
        z0 = 1e9,
        z1 = -1e9;
      for (const s of band) (x0 = Math.min(x0, s.x)), (x1 = Math.max(x1, s.x)), (z0 = Math.min(z0, s.z)), (z1 = Math.max(z1, s.z));
      bands.push({ hi, lo, x0, x1, z0, z1, y: band[0].y });
    }
    root.add(grp);
    // (an auditorium is seen into from its side corridors' doorways and from the projection level behind; the
    // Velvet Room from its Promenade entrance)
    rooms.push(T.lux ? { grp, x0: T.x0 - 0.5, x1: T.x1 + 0.5, z0: T.z0 - 0.5, z1: T.z1 + 4 } : { grp, x0: T.x0 - 6, x1: T.x1 + 6, z0: T.z0 - 0.3, z1: T.z1 + 6 });
  }
  ticks.push((dt, s) => {
    const c = s && s.camera;
    if (!c) return;
    const p = c.position;
    // (window.__cnNoSeats: a dev switch, to measure what the seats cost)
    const off = typeof window < 'u' && window.__cnNoSeats;
    for (const r of rooms) r.grp.visible = !off && p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1;
    for (const B of bands) {
      const dx = Math.max(B.x0 - p.x, 0, p.x - B.x1),
        dz = Math.max(B.z0 - p.z, 0, p.z - B.z1),
        near = Math.hypot(dx, dz) < 6.5;
      B.hi.visible = near;
      B.lo.visible = !near;
    }
  });
  return { n, tris: Math.round(tris) };
}
// ---------------------------------------------------------------- drapes
// velvet in folds: a sheet along a wall (ax 'x' or 'z' at f, standing out towards s), its depth a wave
function __cnDrape(acc, c, valance) {
  const L = c.a1 - c.a0,
    nx = Math.max(6, Math.ceil(L / 0.045)),
    ny = valance ? 4 : 12,
    P = [],
    Nn = [],
    Cc = [],
    I = [],
    k = __prK(c.color),
    fold = valance ? 0.55 : 0.32;
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const u = i / nx,
        v = j / ny,
        a = c.a0 + L * u;
      let y = c.y0 + (c.y1 - c.y0) * v;
      // a valance's bottom edge hangs in scallops
      if (valance && j === 0) y = c.y0 + 0.32 * Math.pow(Math.abs(Math.sin((Math.PI * (a - c.a0)) / 2.2)), 0.7);
      const amp = valance ? 0.07 : 0.085 + 0.05 * (1 - v),
        d = c.s * (0.08 + amp * (1 + Math.sin((2 * Math.PI * (a - c.a0)) / fold + (valance ? 0 : v * 0.6))));
      const p = c.ax === 'x' ? [a, y, c.f + d] : [c.f + d, y, a];
      P.push(...p);
      Nn.push(0, 0, 0);
      const sh = 0.78 + 0.22 * Math.sin((2 * Math.PI * (a - c.a0)) / fold + 1.2);
      Cc.push(k[0] * sh, k[1] * sh, k[2] * sh);
    }
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const q = j * (nx + 1) + i;
      // facing the room (s): wind so the front faces +s
      const flip = (c.ax === 'x') === c.s > 0;
      flip ? I.push(q, q + 1, q + nx + 2, q, q + nx + 2, q + nx + 1) : I.push(q, q + nx + 2, q + 1, q, q + nx + 1, q + nx + 2);
    }
  const base = acc.P.length / 3;
  acc.P.push(...P);
  acc.C.push(...Cc);
  for (const i of I) acc.I.push(base + i);
}
function __cnDrapeGeo(acc) {
  const g = new uw();
  g.setAttribute('position', new gi(new Float32Array(acc.P), 3));
  g.setAttribute('color', new gi(new Float32Array(acc.C), 3));
  g.setAttribute('uv', new gi(new Float32Array((acc.P.length / 3) * 2), 2));
  g.setIndex(acc.P.length / 3 > 65535 ? new gi(new Uint32Array(acc.I), 1) : new gi(new Uint16Array(acc.I), 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
// ---------------------------------------------------------------- the detail
function __cnDetail(root, m, models, ticks) {
  const R = m.__pr,
    N = m.__cn;
  if (!R || !N) return null;
  const { FAC, P1, STAGE, R0, ROW, RISE, NROW, BACK, FLY, CEIL } = __CN;
  __CN_V.dyn = [];
  let seed = 977;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
    S = __prSet(),
    t0 = performance.now(),
    K = __prK,
    gold = K('#c9a45a'),
    goldD = K('#a8843f'),
    blk = K('#141416'),
    warm = K('#ffcf8a');
  // where the floor is under a point in a theater (for panels and sconces)
  const floorAt = (zz) => (zz < R0 ? 0.12 : 0.12 + RISE * Math.min(NROW + 1, Math.ceil((zz - R0) / ROW + 1e-6)));
  // ------------------------------------------------ painted lines (parking bays, the road)
  __prLines(S, R);
  // ------------------------------------------------ seats and step lights
  const seatInfo = __cnSeats(root, N, ticks),
    nSeats = seatInfo.n;
  for (const st of N.steps) S.box('glow', st.x0 + 0.12, st.y - 0.035, st.z - 0.012, st.x1 - 0.12, st.y - 0.012, st.z + 0.004, K('#ffb054'));
  // ------------------------------------------------ the auditoriums' fronts
  const curtainB = { P: [], C: [], I: [] };
  for (const c of N.curtains) __cnDrape(curtainB, c, !1);
  for (const T of N.th) {
    const sc = T.screen,
      hw = sc.w / 2,
      hh = sc.h / 2;
    // the Starlight's sphere is drawn by 70-screens.js, its hallway and portal by 72b-cinema-sacred.js
    if (T.dome) continue;
    if (T.face === 'N' && T.xl) {
      // Palace XL: the screen is the front wall (flat, wall to wall, stage to ceiling): nothing frames it, so
      // the picture is all you see. Only black velour where the wall shows past it
      const zf = P1 + 0.4,
        c = T.c,
        black = K('#0b0b0e');
      sc.y + hh < T.h - 0.005 && S.box('black', T.ix0, sc.y + hh, zf, T.ix1, T.h, zf + 0.01, black);
      for (const [x0, x1] of [[T.ix0, c - hw], [c + hw, T.ix1]]) x1 - x0 > 0.01 && S.box('black', x0, 0.45, zf, x1, T.h, zf + 0.01, black);
      // the stage's edge: a row of small warm floor lights (no strip: it read as a lit border under the picture)
      for (let x = T.a + 4.5; x < T.b - 4.2; x += 1.2) S.box('glow', x - 0.05, 0.08, STAGE + 0.005, x + 0.05, 0.14, STAGE + 0.02, K('#ffd9a0'));
      // a warm cove light along the top of both side walls, hidden behind a black fascia
      for (const [x, sd] of [[T.ix0, 1], [T.ix1, -1]]) {
        S.box('glow', Math.min(x, x + sd * 0.04), T.h - 0.62, P1 + 1.2, Math.max(x, x + sd * 0.04), T.h - 0.58, BACK - 0.5, K('#ffb066').map((v) => v * 0.9));
        S.box('black', Math.min(x + sd * 0.04, x + sd * 0.3), T.h - 0.75, P1 + 1.2, Math.max(x + sd * 0.04, x + sd * 0.3), T.h - 0.45, BACK - 0.5, K('#0b0b0e'));
      }
      // the ceiling: black, with small recessed lights in rows
      for (let zz = P1 + 4; zz < BACK - 1; zz += 3.2) for (let x = T.ix0 + 1.5; x < T.ix1 - 1; x += 3.0) S.add('glow', __prUnit('cyl16'), __cnM(x, T.h - 0.02, zz, 0.06, 0.01, 0.06), K('#ffd7a0').map((v) => v * 0.7));
      // surround speakers on the side walls
      for (let zz = R0 - 4; zz < BACK - 3; zz += 5)
        for (const [x, s1] of [[T.ix0, 1], [T.ix1, -1]]) {
          const y = floorAt(zz) + 4.2;
          S.box('darkM', Math.min(x, x + s1 * 0.32), y, zz - 0.3, Math.max(x, x + s1 * 0.32), y + 0.7, zz + 0.3, K('#141417'));
        }
    } else if (T.face === 'N') {
      const zf = P1 + 0.4,
        c = T.c;
      // black masking round the screen, and the speaker wall behind it
      S.box('black', c - hw - 0.45, sc.y - hh - 0.35, zf, c - hw, sc.y + hh + 0.35, sc.z + 0.02, blk);
      S.box('black', c + hw, sc.y - hh - 0.35, zf, c + hw + 0.45, sc.y + hh + 0.35, sc.z + 0.02, blk);
      S.box('black', c - hw, sc.y + hh, zf, c + hw, sc.y + hh + 0.35, sc.z + 0.02, blk);
      S.box('black', c - hw, sc.y - hh - 0.35, zf, c + hw, sc.y - hh, sc.z + 0.02, blk);
      // the gold proscenium: two fluted pilasters and the header, framing curtains and screen
      for (const x of [T.a + 3.42, T.b - 3.42]) {
        S.box('gold', x - 0.16, 0.45, zf, x + 0.16, CEIL - 0.2, zf + 0.34, goldD);
        for (const dx of [-0.1, -0.035, 0.035, 0.1]) S.box('gold', x + dx - 0.018, 0.9, zf + 0.34, x + dx + 0.018, CEIL - 0.7, zf + 0.37, gold);
        S.box('gold', x - 0.24, 0.45, zf, x + 0.24, 0.9, zf + 0.42, gold);
        S.box('gold', x - 0.24, CEIL - 0.75, zf, x + 0.24, CEIL - 0.55, zf + 0.42, gold);
      }
      S.box('gold', T.a + 3.2, CEIL - 0.42, zf, T.b - 3.2, CEIL - 0.2, zf + 0.4, gold);
      // a scalloped valance under the header, over the curtains and the screen's top
      __cnDrape(curtainB, { ax: 'x', f: zf + 0.18, s: 1, a0: T.a + 3.6, a1: T.b - 3.6, y0: sc.y + hh + 0.2, y1: CEIL - 0.42, color: T.seat }, !0);
      // the stage's edge: a gold nosing and a row of footlights
      S.box('gold', T.a + 3.6, 0.4, STAGE - 0.02, T.b - 3.6, 0.455, STAGE + 0.03, gold);
      for (let x = T.a + 4.2; x < T.b - 3.9; x += 0.9) S.box('glow', x - 0.08, 0.2, STAGE + 0.005, x + 0.08, 0.3, STAGE + 0.02, K('#ffd9a0'));
      // the light-lock walls' gold caps
      for (const xw of [T.a + 3.2, T.b - 3.2]) S.box('gold', xw - 0.15, 3.0, P1 + 0.4, xw + 0.15, 3.06, P1 + 3.4, gold);
      // the ceiling: acoustic clouds under the roof, dark, each with a hidden cove of light
      for (let zz = P1 + 6; zz < BACK - 3; zz += 6.5)
        for (const [x0, x1] of [[T.a + 2.2, T.c - 0.6], [T.c + 0.6, T.b - 2.2]]) {
          S.box('black', x0, CEIL - 0.55, zz, x1, CEIL - 0.42, zz + 4.6, K('#232129'));
          S.box('glow', x0 + 0.1, CEIL - 0.42, zz + 0.1, x1 - 0.1, CEIL - 0.4, zz + 4.5, K('#3a2a5a'));
        }
      // surround speakers on the side walls
      for (let zz = 60; zz < 84; zz += 5)
        for (const [x, s] of [[T.ix0, 1], [T.ix1, -1]]) {
          const y = floorAt(zz) + 3.6;
          S.box('darkM', Math.min(x, x + s * 0.32), y, zz - 0.28, Math.max(x, x + s * 0.32), y + 0.62, zz + 0.28, K('#1b1c1f'));
        }
    } else if (T.arc) {
      // the Velvet Room's curved screen: black velour round it, following the curve: a lip in front of its foot
      // with a warm LED line along the floor, the masking above it up to the ceiling, returns at its ends back to
      // the wall (what is behind the screen never shows)
      const Ar = T.arc,
        n = 64,
        te = Math.asin(Ar.chord / 2 / Ar.R),
        pt = (r, t, y) => [Ar.xc + r * Math.cos(t), y, Ar.zc + r * Math.sin(t)],
        MB = S.b('black'),
        MG = S.b('glow'),
        bk = K('#0a0a0d'),
        led = K('#ff9a50').map((v) => v * 0.55);
      for (let i = 0; i < n; i++) {
        const t0 = -te + (2 * te * i) / n,
          t1 = -te + (2 * te * (i + 1)) / n,
          tm = (t0 + t1) / 2,
          nIn = [-Math.cos(tm), 0, -Math.sin(tm)];
        __prQuad(MB, pt(Ar.R - 0.18, t0, 0.12), pt(Ar.R - 0.18, t1, 0.12), pt(Ar.R - 0.18, t1, Ar.y0 - 0.02), pt(Ar.R - 0.18, t0, Ar.y0 - 0.02), nIn, bk);
        __prQuad(MB, pt(Ar.R - 0.18, t0, Ar.y0 - 0.02), pt(Ar.R - 0.18, t1, Ar.y0 - 0.02), pt(Ar.R + 0.05, t1, Ar.y0 - 0.02), pt(Ar.R + 0.05, t0, Ar.y0 - 0.02), [0, 1, 0], bk);
        __prQuad(MB, pt(Ar.R + 0.03, t0, Ar.y0 + Ar.h), pt(Ar.R + 0.03, t1, Ar.y0 + Ar.h), pt(Ar.R + 0.03, t1, T.h), pt(Ar.R + 0.03, t0, T.h), nIn, bk);
        __prQuad(MG, pt(Ar.R - 0.19, t0, 0.15), pt(Ar.R - 0.19, t1, 0.15), pt(Ar.R - 0.19, t1, 0.18), pt(Ar.R - 0.19, t0, 0.18), nIn, led);
      }
      for (const sd of [-1, 1]) {
        const [ex, , ez] = pt(Ar.R, sd * te, 0),
          wz = sd < 0 ? T.z0 : T.z1;
        __prQuad(MB, [ex - 0.2, 0.12, ez], [T.x1, 0.12, ez], [T.x1, T.h, ez], [ex - 0.2, T.h, ez], [0, 0, -sd], bk);
        __prQuad(MB, [ex - 0.2, 0.12, wz], [ex - 0.2, 0.12, ez], [ex - 0.2, T.h, ez], [ex - 0.2, T.h, wz], [-1, 0, 0], bk);
      }
    }
  }
  if (curtainB.P.length) {
    const cm = __prMat('velvet', { side: 2 });
    __flMesh(root, __cnDrapeGeo(curtainB), cm, 'cinema_curtains', !0);
  }
  // ------------------------------------------------ curtains over the doorways, parting as people pass
  // Two halves per doorway, each gathered towards its jamb (scaled along the opening about the jamb) while
  // anyone (players or bots) is within 1.7 m of the doorway; a brass rod over them. No collision: cloth.
  const drapes = [],
    dm = __prMat('velvet', { side: 2 });
  for (const d of N.exitDrapes || []) {
    const mid = (d.a0 + d.a1) / 2,
      f = d.f + d.s * 0.07;
    for (const [j, a0, a1] of [[d.a0, d.a0, mid + 0.04], [d.a1, mid - 0.04, d.a1]]) {
      const acc = { P: [], C: [], I: [] };
      __cnDrape(acc, { ax: d.ax, f, s: d.s, a0, a1, y0: d.y0 + 0.02, y1: d.y1, color: d.color }, !1);
      const g = __cnDrapeGeo(acc);
      d.ax === 'x' ? g.translate(-j, 0, 0) : g.translate(0, 0, -j);
      const o = new Ow(g, dm);
      d.ax === 'x' ? o.position.set(j, 0, 0) : o.position.set(0, 0, j);
      o.userData.dyn = 1;
      o.castShadow = !1;
      o.receiveShadow = !0;
      o.name = 'cinema_doorway_curtain';
      root.add(o);
      drapes.push({ o, d, ax: d.ax, cx: d.ax === 'x' ? mid : f, cz: d.ax === 'x' ? f : mid, y: d.y0, open: 0 });
    }
    const p0 = d.ax === 'x' ? [d.a0 - 0.1, d.y1 + 0.04, f] : [f, d.y1 + 0.04, d.a0 - 0.1],
      p1 = d.ax === 'x' ? [d.a1 + 0.1, d.y1 + 0.04, f] : [f, d.y1 + 0.04, d.a1 + 0.1];
    S.cyl('gold', p0, p1, 0.025, K('#8a6a3a'), 'cyl8');
  }
  if (drapes.length)
    ticks.push((dt) => {
      const st = eA.state,
        ps = st ? st.players.filter((p) => p.alive) : [],
        k = 1 - Math.exp(-dt * 7);
      for (const D of drapes) {
        const near = ps.some((p) => Math.abs(p.pos.y - D.y) < 1.5 && Math.hypot(p.pos.x - D.cx, p.pos.z - D.cz) < 1.7),
          want = near ? 1 : 0;
        if (Math.abs(want - D.open) < 0.002) continue;
        D.open += (want - D.open) * k;
        const sc = 1 - 0.78 * D.open;
        D.ax === 'x' ? (D.o.scale.x = sc) : (D.o.scale.z = sc);
        D.o.updateMatrix();
        D.o.updateMatrixWorld(!0);
      }
    });
  // ------------------------------------------------ wall panels: acoustic fabric between gold fillets; panelling
  for (const p of N.panels) {
    const along = p.ax === 'x',
      seg = p.step || 2.4,
      col = K(p.color || '#ffffff');
    if (p.k === 'acoustic') {
      for (let a = p.a0; a + seg * 0.5 < p.a1; a += seg) {
        const b = Math.min(p.a1, a + seg - 0.18),
          fl = along ? 0.12 : Math.max(floorAt(a), floorAt(b)),
          y0 = Math.max(p.y0, fl + 1.3),
          y1 = Math.max(p.y1 + (T_hi(p) ? 1 : 0), y0 + 1.4),
          mid = (a + b) / 2,
          L = b - a;
        const g = __prRBox(0.09, y1 - y0, L, 0.035, 1);
        const M = along ? __cnM(mid, (y0 + y1) / 2, p.f + p.s * 0.045, 1, 1, 1, Math.PI / 2) : __cnM(p.f + p.s * 0.045, (y0 + y1) / 2, mid, 1, 1, 1);
        S.add(p.fabric || 'velvet', g, M, col);
        // the gold fillet after it, and a cap rail
        const fa = b + 0.09;
        // the strip between panels: gold in the deco rooms, dark bronze in the XL theaters (gold there read
        // as a row of bright stripes in the dark)
        const fk = p.fabric ? 'darkM' : 'gold',
          fc = p.fabric ? K('#3a2c1e') : gold,
          fw = p.fabric ? 0.015 : 0.025;
        if (fa < p.a1) along ? S.box(fk, fa - fw, y0, Math.min(p.f, p.f + p.s * 0.11), fa + fw, y1, Math.max(p.f, p.f + p.s * 0.11), fc) : S.box(fk, Math.min(p.f, p.f + p.s * 0.11), y0, fa - fw, Math.max(p.f, p.f + p.s * 0.11), y1, fa + fw, fc);
      }
    } else if (p.k === 'dado') {
      let a = p.a0;
      const segs = [];
      for (const [s0, s1] of [...(p.skip || [])].sort((x, y) => x[0] - y[0])) segs.push([a, s0]), (a = s1);
      segs.push([a, p.a1]);
      for (const [a0, a1] of segs) {
        if (a1 - a0 < 0.2) continue;
        const f0 = p.f,
          f1 = p.f + p.s * 0.04;
        const wk = p.wood || 'woodp';
        along ? S.box(wk, a0, p.y0, Math.min(f0, f1), a1, p.y1, Math.max(f0, f1), K('#ffffff')) : S.box(wk, Math.min(f0, f1), p.y0, a0, Math.max(f0, f1), p.y1, a1, K('#ffffff'));
        // raised panels with a gilt bead (the rosewood wainscots)
        if (p.wood) {
          const n = Math.max(1, Math.round((a1 - a0) / 1.2)),
            sp = (a1 - a0) / n,
            r0 = p.f + p.s * 0.04,
            r1 = p.f + p.s * 0.055;
          for (let i = 0; i < n; i++) {
            const q0 = a0 + sp * i + 0.09,
              q1 = a0 + sp * (i + 1) - 0.09;
            if (q1 - q0 < 0.15) continue;
            along ? S.box(wk, q0, p.y0 + 0.2, Math.min(r0, r1), q1, p.y1 - 0.1, Math.max(r0, r1), K('#e6d2bc')) : S.box(wk, Math.min(r0, r1), p.y0 + 0.2, q0, Math.max(r0, r1), p.y1 - 0.1, q1, K('#e6d2bc'));
          }
          along ? S.box('marble', a0, p.y0, Math.min(p.f, p.f + p.s * 0.05), a1, p.y0 + 0.12, Math.max(p.f, p.f + p.s * 0.05), K('#2a2624')) : S.box('marble', Math.min(p.f, p.f + p.s * 0.05), p.y0, a0, Math.max(p.f, p.f + p.s * 0.05), p.y0 + 0.12, a1, K('#2a2624'));
        }
        const g0 = p.f,
          g1 = p.f + p.s * 0.065;
        along ? S.box('gold', a0, p.y1, Math.min(g0, g1), a1, p.y1 + 0.05, Math.max(g0, g1), gold) : S.box('gold', Math.min(g0, g1), p.y1, a0, Math.max(g0, g1), p.y1 + 0.05, a1, gold);
      }
    }
  }
  function T_hi(p) {
    return p.y1 > 9;
  }
  // ------------------------------------------------ lamps
  // the wall a sconce is on: the direction to it and its face
  const walls = m.boxes.filter((b) => b.kind === 'wall');
  const wallDir = (x, y, zz) => {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const px = x + dx * 0.5,
        pz = zz + dz * 0.5;
      for (const b of walls) if (px > b.min.x && px < b.max.x && pz > b.min.z && pz < b.max.z && y > b.min.y && y < b.max.y) return [dx, dz, dx > 0 ? b.min.x : dx < 0 ? b.max.x : dz > 0 ? b.min.z : b.max.z];
    }
    return null;
  };
  const washes = [];
  for (const l of R.lamps) {
    const { x, y } = l,
      zz = l.z;
    if (l.k === 'sconce') {
      const d = wallDir(x, y, zz);
      if (!d) continue;
      // the wall face behind the lamp
      const fx = d[0] ? d[2] : x,
        fz = d[1] ? d[2] : zz;
      const nx = -d[0],
        nz = -d[1],
        ry = Math.atan2(nx, nz);
      // a brass back plate and a half-round frosted glass shade, lit from inside
      S.add('gold', __prUnit('box'), __cnM(fx + nx * 0.012, y, fz + nz * 0.012, 0.14, 0.42, 0.02, ry), goldD);
      S.add('glow', __prUnit('cyl16'), __cnM(fx + nx * 0.06, y + 0.04, fz + nz * 0.06, 0.09, 0.28, 0.09, ry), K('#ffd9a8').map((v) => v * 0.75));
      S.add('gold', __prUnit('cyl16'), __cnM(fx + nx * 0.06, y - 0.12, fz + nz * 0.06, 0.1, 0.03, 0.1, ry), goldD);
      washes.push([fx + nx * 0.02, y + 0.55, fz + nz * 0.02, ry]);
    } else if (l.k === 'can') {
      S.add('gold', __prUnit('tor'), __cnM(x, y + 0.29, zz, 0.11, 0.11, 0.4, 0, Math.PI / 2), gold);
      S.add('glow', __prUnit('cyl16'), __cnM(x, y + 0.3, zz, 0.09, 0.01, 0.09), K('#fff0d0'));
    } else if (l.k === 'cove') {
      // a deco bowl pendant: alabaster bowl on three gold rods
      S.add('glow', __prUnit('hemi'), __cnM(x, y - 0.1, zz, 0.42, 0.22, 0.42, 0, Math.PI), K('#ffe2b0'));
      S.add('gold', __prUnit('tor'), __cnM(x, y - 0.1, zz, 0.43, 0.43, 0.25, 0, Math.PI / 2), gold);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        S.cyl('gold', [x + Math.cos(a) * 0.4, y - 0.1, zz + Math.sin(a) * 0.4], [x, y + 0.3, zz], 0.008, gold, 'cyl6');
      }
    } else if (l.k === 'bar') {
      S.cyl('dark', [x, y + 0.4, zz], [x, y - 0.25, zz], 0.006, blk, 'cyl6');
      S.add('glow', __prUnit('cyl16'), __cnM(x, y - 0.38, zz, 0.16, 0.26, 0.16), K('#ffb15a'));
      S.add('gold', __prUnit('tor'), __cnM(x, y - 0.25, zz, 0.17, 0.17, 0.2, 0, Math.PI / 2), gold);
    } else if (l.k === 'tube' || l.k === 'booth') {
      const L = l.k === 'tube' ? 0.6 : 0.2;
      S.box('paint', x - L, y - 0.06, zz - 0.13, x + L, y + 0.02, zz + 0.13, K('#e7e4dc'));
      S.box('glow', x - L + 0.04, y - 0.065, zz - 0.09, x + L - 0.04, y - 0.06, zz + 0.09, K('#f2f6ff'));
    } else if (l.k === 'flood') {
      S.box('darkM', x - 0.25, y - 0.1, zz - 0.18, x + 0.25, y + 0.12, zz + 0.18, K('#3b4044'));
      S.box('glow', x - 0.21, y - 0.105, zz - 0.14, x + 0.21, y - 0.1, zz + 0.14, K('#fff4dc'));
    } else if (l.k === 'chand') {
      // a chain to the ceiling and a glowing heart (the chandelier itself is a model)
      S.cyl('gold', [x, y + 1.3, zz], [x, 9.6, zz], 0.012, gold, 'cyl6');
      S.add('glow', __prUnit('sph'), __cnM(x, y + 0.4, zz, 0.16, 0.2, 0.16), K('#fff0d0'));
    }
  }
  // the wall washes (additive light above each sconce)
  if (washes.length) {
    const wm = __cnAdd(new Ni({ map: __cnWashTex(), fog: !1 }));
    wm.color.setScalar(0.4);
    const g = __cnQuad(1.5, 1.9),
      im = new QZ(g, wm, washes.length),
      M = new _A(),
      Q = new Kw();
    washes.forEach(([x, y, zz, ry], k) => im.setMatrixAt(k, M.compose(new U(x, y, zz), Q.setFromAxisAngle(new U(0, 1, 0), ry), new U(1, 1, 1))));
    im.instanceMatrix.needsUpdate = !0;
    im.computeBoundingSphere();
    im.renderOrder = 3;
    im.name = 'cinema_washes';
    root.add(im);
    ticks.push(() => {
      const tod = Zw.getState().timeOfDay;
      wm.color.setScalar(tod === 'night' ? 0.55 : tod === 'dusk' ? 0.45 : 0.38);
    });
  }
  // the yard's floodlight poles
  for (const p of R.poles) {
    S.cyl('paint', [p.x, 0, p.z], [p.x, p.h, p.z], 0.12, K('#5d646a'));
    for (const dx of [-0.35, 0.35]) {
      S.box('darkM', p.x + dx - 0.22, p.h - 0.12, p.z - 0.5, p.x + dx + 0.22, p.h + 0.12, p.z - 0.16, K('#3b4044'));
      S.box('glow', p.x + dx - 0.18, p.h - 0.125, p.z - 0.46, p.x + dx + 0.18, p.h - 0.12, p.z - 0.2, K('#fff4dc'));
    }
  }
  // ------------------------------------------------ rails (brass, some with glass)
  for (const r of N.rails) {
    const L = Math.hypot(r.x1 - r.x0, r.z1 - r.z0);
    if (L < 0.05) continue;
    const yA = r.stair ? r.stair[0] : r.y,
      yB = r.stair ? r.stair[1] : r.y,
      top = r.h,
      n = Math.max(1, Math.round(L / r.posts));
    S.cyl('gold', [r.x0, yA + top, r.z0], [r.x1, yB + top, r.z1], 0.028, gold, 'cyl8');
    for (let i = 0; i <= n; i++) {
      const t = i / n,
        x = r.x0 + (r.x1 - r.x0) * t,
        zz = r.z0 + (r.z1 - r.z0) * t,
        y = yA + (yB - yA) * t;
      S.cyl('gold', [x, y, zz], [x, y + top, zz], 0.022, gold, 'cyl8');
    }
    if (r.glass) {
      const t = 0.012;
      Math.abs(r.x1 - r.x0) > Math.abs(r.z1 - r.z0) ? S.box('cnGlass', Math.min(r.x0, r.x1), r.y + 0.08, r.z0 - t, Math.max(r.x0, r.x1), r.y + top - 0.08, r.z0 + t, K('#ffffff')) : S.box('cnGlass', r.x0 - t, r.y + 0.08, Math.min(r.z0, r.z1), r.x0 + t, r.y + top - 0.08, Math.max(r.z0, r.z1), K('#ffffff'));
    }
  }
  // ------------------------------------------------ stairs: gold nosings on the carpeted steps
  for (const s of N.stairs) {
    if (s.k === 'stagefront' || s.s !== 'carpet') continue;
    const along = s.dir === 'N' || s.dir === 'S',
      len = along ? s.z1 - s.z0 : s.x1 - s.x0,
      tr = len / s.n,
      rise = (s.y1 - s.y0) / s.n;
    for (let i = 0; i < s.n; i++) {
      const top = s.y0 + rise * (i + 1),
        a = s.dir === 'S' || s.dir === 'E' ? i * tr : len - (i + 1) * tr;
      along ? S.cyl('gold', [s.x0 + 0.05, top + 0.01, s.z0 + a + 0.02], [s.x1 - 0.05, top + 0.01, s.z0 + a + 0.02], 0.012, gold, 'cyl6') : S.cyl('gold', [s.x0 + a + 0.02, top + 0.01, s.z0 + 0.05], [s.x0 + a + 0.02, top + 0.01, s.z1 - 0.05], 0.012, gold, 'cyl6');
    }
  }
  // ------------------------------------------------ columns: round, fluted marble, gold base and capital
  for (const c of N.columns) {
    const r = c.r,
      h = c.y1 - c.y0;
    if (c.k === 'round') {
      S.add('marble', __prUnit('cyl16'), __cnM(c.x, c.y0 + h / 2, c.z, r, h, r), K('#efe9df'));
      // flutes: shallow gold-lined channels round the shaft
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2,
          px = c.x + Math.cos(a) * (r + 0.004),
          pz = c.z + Math.sin(a) * (r + 0.004);
        S.cyl('gold', [px, c.y0 + 0.45, pz], [px, c.y1 - 0.45, pz], 0.012, goldD, 'cyl6');
      }
      S.add('gold', __prUnit('cyl16'), __cnM(c.x, c.y0 + 0.12, c.z, r + 0.12, 0.24, r + 0.12), goldD);
      S.add('gold', __prUnit('tor'), __cnM(c.x, c.y0 + 0.26, c.z, r + 0.07, r + 0.07, 0.6, 0, Math.PI / 2), gold);
      S.add('gold', __prUnit('cyl16'), __cnM(c.x, c.y1 - 0.18, c.z, r + 0.16, 0.36, r + 0.16), gold);
      S.add('gold', __prUnit('tor'), __cnM(c.x, c.y1 - 0.4, c.z, r + 0.06, r + 0.06, 0.6, 0, Math.PI / 2), gold);
      continue;
    }
    S.box('gold', c.x - r - 0.06, c.y0, c.z - r - 0.06, c.x + r + 0.06, c.y0 + 0.3, c.z + r + 0.06, goldD);
    S.box('gold', c.x - r - 0.08, c.y1 - 0.35, c.z - r - 0.08, c.x + r + 0.08, c.y1 - 0.2, c.z + r + 0.08, gold);
  }
  // ------------------------------------------------ items
  for (const it of N.items) __cnItem(S, it, rnd, root, ticks);
  // ------------------------------------------------ doorway frames (deco: gold architraves; steel)
  for (const o of R.openings) {
    const t = o.t || 0.4,
      P = (a, y, d) => (o.alongX ? [a, y, o.f + d] : [o.f + d, y, a]),
      box = (k, a0, y0, d0, a1, y1, d1, c) => {
        const p = P(a0, y0, d0),
          q = P(a1, y1, d1);
        S.box(k, Math.min(p[0], q[0]), y0, Math.min(p[2], q[2]), Math.max(p[0], q[0]), y1, Math.max(p[2], q[2]), c);
      };
    if (o.frame === 'arch') {
      __cnArch(S, o, o.y0 > 1 || (o.fill && /1d1d22|0b0b0d|121833|2a0f12/.test(JSON.stringify(o.fill))) ? K('#6a5236') : gold, K);
      continue;
    }
    const k = o.frame === 'steel' ? 'paint' : 'gold',
      c = o.frame === 'steel' ? K('#3d474a') : gold,
      fw = o.frame === 'steel' ? 0.1 : 0.14;
    for (const sd of [-1, 1]) {
      const d0 = sd * (t / 2),
        d1 = sd * (t / 2 + 0.04);
      box(k, o.a - fw, o.y0, d0, o.a, o.y1 + fw, d1, c);
      box(k, o.a + o.w, o.y0, d0, o.a + o.w + fw, o.y1 + fw, d1, c);
      box(k, o.a - fw, o.y1, d0, o.a + o.w + fw, o.y1 + fw, d1, c);
      // deco: a keystone and stepped head
      o.frame !== 'steel' && box(k, o.a + o.w / 2 - 0.18, o.y1 + fw, d0, o.a + o.w / 2 + 0.18, o.y1 + fw + 0.2, d1, gold);
    }
    // the reveals (jambs and soffit) in the wall's thickness
    o.frame !== 'steel' && (box('marble', o.a - 0.001, o.y0, -t / 2, o.a + 0.03, o.y1, t / 2, K('#e9e2d4')), box('marble', o.a + o.w - 0.03, o.y0, -t / 2, o.a + o.w + 0.001, o.y1, t / 2, K('#e9e2d4')));
  }
  // ------------------------------------------------ the city across the street, the neighbours' windows
  for (const nb of N.neighbours) {
    if (nb.face === 'S') {
      const z0 = nb.z;
      for (let x = nb.x0 + 1.2; x < nb.x1 - 1; x += 2.3)
        for (let y = 3.6; y < nb.h - 1.2; y += 3.1) {
          const lit = rnd() < 0.45;
          S.box(lit ? 'glow' : 'darkM', x - 0.6, y, z0, x + 0.6, y + 1.5, z0 + 0.03, lit ? K(rnd() < 0.7 ? '#ffd7a0' : '#cfe2ff').map((v) => v * (0.5 + rnd() * 0.5)) : K('#304050'));
          S.box('stucco', x - 0.7, y - 0.12, z0, x + 0.7, y, z0 + 0.12, K('#d8ccb8'));
        }
      // shopfronts: lit windows and a striped awning
      for (let x = nb.x0 + 1.5; x < nb.x1 - 3; x += 6) {
        S.box('glow', x, 0.6, z0, x + 4.2, 2.6, z0 + 0.03, K(rnd() < 0.5 ? '#ffe2b8' : '#ffd0e0').map((v) => v * 0.6));
        S.box('cloth', x - 0.2, 2.8, z0, x + 4.4, 2.95, z0 + 1.2, K(['#7a1f2a', '#24305a', '#1f5a3e', '#b07a2a'][Math.floor(rnd() * 4)]));
      }
    } else {
      for (let zz = 2; zz < 107; zz += 3.2) {
        if (zz > 25 && zz < 91) continue;
        for (let y = 3.4; y < nb.h - 1; y += 3.4) {
          const lit = rnd() < 0.15,
            f = nb.at;
          S.box(lit ? 'glow' : 'cnWin', f - 0.03, y, zz - 0.7, f + 0.03, y + 1.6, zz + 0.7, lit ? K('#ffd7a0').map((v) => v * 0.32) : K('#ffffff'));
          S.box('granite', f - 0.08, y - 0.1, zz - 0.8, f + 0.08, y, zz + 0.8, K('#cfc6b8'));
        }
      }
    }
  }
  // the buildings across the street: a shopfront at street level (granite piers, shop windows lit from inside,
  // a fascia with the shop's name, a fabric awning), windows above in stone surrounds with sills (reflective
  // glass, a few lit), string courses, a cornice and parapet
  const awnC = ['#6e1f28', '#23345e', '#1f5a3e', '#8a5a1e', '#3a3a3a', '#5a2a4a'];
  N.shopSigns = [];
  for (const F of N.facades || []) {
    const z0 = F.z,
      W0 = F.x1 - F.x0,
      n = Math.max(1, Math.round(W0 / 3.8)),
      bw = W0 / n,
      stone = K(F.sf === 'brick' ? '#d8cfbf' : '#c9bca2'),
      aw = K(awnC[Math.floor(rnd() * awnC.length)]);
    // ground floor
    for (let i = 0; i <= n; i++) S.box('granite', F.x0 + i * bw - 0.28, 0, z0, F.x0 + i * bw + 0.28, 4.4, z0 + 0.3, K('#bdb5a8'));
    for (let i = 0; i < n; i++) {
      const a = F.x0 + i * bw + 0.3,
        b = F.x0 + (i + 1) * bw - 0.3,
        door = i === Math.floor(n / 2);
      // (the shop lit inside, seen through clear glass: thin glazing bars only)
      S.box('glow', a, door ? 0.15 : 0.7, z0 + 0.01, b, 3.4, z0 + 0.03, K(rnd() < 0.5 ? '#ffd9a8' : '#ffe8c8').map((v) => v * 0.62));
      S.box('darkM', a, 2.7, z0 + 0.04, b, 2.76, z0 + 0.08, K('#2a2622'));
      door ? S.box('darkM', (a + b) / 2 - 0.03, 0.15, z0 + 0.08, (a + b) / 2 + 0.03, 3.4, z0 + 0.12, K('#2a2622')) : S.box('granite', a, 0, z0, b, 0.7, z0 + 0.2, K('#bdb5a8'));
      S.box('darkM', a, 3.4, z0, b, 3.5, z0 + 0.12, K('#2a2622'));
      // the awning: a sloping fabric canopy on two arms
      S.add('cloth', __prUnit('box'), __cnM((a + b) / 2, 3.42, z0 + 0.75, b - a + 0.1, 0.05, 1.5, 0, -0.32), aw);
      S.add('cloth', __prUnit('box'), __cnM((a + b) / 2, 3.07, z0 + 1.47, b - a + 0.1, 0.22, 0.03), aw);
    }
    // the fascia and the shop's name (canvas, below)
    S.box('paint', F.x0 + 0.3, 3.6, z0, F.x1 - 0.3, 4.4, z0 + 0.18, K('#1d1a18'));
    F.shop && N.shopSigns.push({ x: (F.x0 + F.x1) / 2, y: 4.0, z: z0 + 0.19, w: Math.min(W0 - 1, 9), h: 0.62, text: F.shop });
    S.box('granite', F.x0, 4.4, z0, F.x1, 4.7, z0 + 0.4, stone);
    // upper floors
    for (let y = 5.5; y < F.h - 2.4; y += 3.2) {
      for (let i = 0; i < n; i++) {
        const cx = F.x0 + (i + 0.5) * bw,
          ww = Math.min(1.5, bw * 0.45),
          lit = rnd() < 0.18;
        S.box(lit ? 'glow' : 'cnWin', cx - ww / 2, y, z0 + 0.01, cx + ww / 2, y + 2.0, z0 + 0.03, lit ? K('#ffd6a0').map((v) => v * 0.3) : K('#ffffff'));
        // the stone surround, a sill and a head (a keystone on the brick fronts)
        S.box('granite', cx - ww / 2 - 0.16, y - 0.04, z0, cx - ww / 2, y + 2.04, z0 + 0.12, stone);
        S.box('granite', cx + ww / 2, y - 0.04, z0, cx + ww / 2 + 0.16, y + 2.04, z0 + 0.12, stone);
        S.box('granite', cx - ww / 2 - 0.26, y - 0.16, z0, cx + ww / 2 + 0.26, y, z0 + 0.22, stone);
        S.box('granite', cx - ww / 2 - 0.2, y + 2.0, z0, cx + ww / 2 + 0.2, y + 2.24, z0 + 0.16, stone);
        F.sf === 'brick' && S.box('granite', cx - 0.13, y + 2.0, z0, cx + 0.13, y + 2.34, z0 + 0.2, stone);
        S.box('darkM', cx - 0.02, y, z0 + 0.03, cx + 0.02, y + 2.0, z0 + 0.06, K('#e8e2d6'));
        S.box('darkM', cx - ww / 2, y + 1.3, z0 + 0.03, cx + ww / 2, y + 1.34, z0 + 0.06, K('#e8e2d6'));
      }
      S.box('granite', F.x0, y - 0.5, z0, F.x1, y - 0.38, z0 + 0.1, stone);
    }
    // cornice and parapet
    S.box('granite', F.x0 - 0.1, F.h - 0.9, z0, F.x1 + 0.1, F.h - 0.6, z0 + 0.55, stone);
    S.box('granite', F.x0 - 0.05, F.h - 0.6, z0, F.x1 + 0.05, F.h, z0 + 0.3, stone);
  }
  // the blade sign's body (its letters and bulbs are added below)
  if (N.blade) {
    const B = N.blade;
    S.box('paint', 59.6, B.y0, B.z0, 60.4, B.y1, B.z1, K('#5c1015'));
    // gold edges and a neon stripe down the front edge
    for (const x of [59.56, 60.44]) S.box('gold', x - 0.04, B.y0, B.z0 - 0.04, x + 0.04, B.y1, B.z0 + 0.04, gold);
    S.box('glow', 59.85, B.y0 + 0.2, B.z0 - 0.06, 60.15, B.y1 - 0.2, B.z0 - 0.02, K('#ff6a5a'));
  }
  // the name sign's frame on the marquee
  if (N.nameSign) {
    const Q = N.nameSign;
    S.box('paint', Q.x0, Q.y0, Q.z + 0.05, Q.x1, Q.y1, Q.z + 0.25, K('#2a0d10'));
    S.box('gold', Q.x0 - 0.06, Q.y0, Q.z - 0.02, Q.x1 + 0.06, Q.y0 + 0.08, Q.z + 0.27, gold);
    S.box('gold', Q.x0 - 0.06, Q.y1 - 0.08, Q.z - 0.02, Q.x1 + 0.06, Q.y1, Q.z + 0.27, gold);
  }
  // ------------------------------------------------ the sacred geometry and the finish (72b-cinema-sacred.js)
  try {
    __cnSacred(root, S, m, ticks);
  } catch (e) {
    console.warn('[cinema] sacred', e);
  }
  const nCars = __cnCars(root, N, models, ticks);
  // ------------------------------------------------ build the merged meshes
  const glassM = Object.assign(new Gw({ color: '#dfeef2', roughness: 0.04, metalness: 0.1, transparent: !0, opacity: 0.16, depthWrite: !1, envMapIntensity: 1.2, vertexColors: !0 }), { __prOwn: 1 });
  // window glass of the buildings round the site: dark, smooth, metallic enough to mirror the sky
  const winM = __prLit(Object.assign(new Gw({ color: '#3a4652', roughness: 0.06, metalness: 0.75, envMapIntensity: 1.5, vertexColors: !0 }), { __prOwn: 1 }));
  const tris = S.build(root, (k) => (k === 'cnGlass' ? glassM : k === 'cnWin' ? winM : __prMats(k)), 'cinema_det_');
  // ------------------------------------------------ models (chandeliers hang from the ceiling)
  for (const md of R.models) {
    if (md.hang === void 0 || !models[md.id]) continue;
    const { size } = __flParts(models[md.id]);
    md.y = md.hang - (md.id === 'Chandelier_02' ? 0.9 : 0) - size.y * md.s;
  }
  __prModels2(root, R, models);
  // ------------------------------------------------ doors (the prison's door drawing: timber and steel)
  const doors = __prDoors(root, R, m, ticks);
  // ------------------------------------------------ signs, posters, the marquee, the blade sign
  // (standalone meshes take their colour from the material: the merged sets' tint is per vertex)
  const goldMat = __prLit(Object.assign(new Gw({ color: '#c9a45a', metalness: 1, roughness: 0.3, envMapIntensity: 1.3 }), { __prOwn: 1 }));
  for (const sg of N.signs) {
    const tex = __cnSignTex(sg);
    if (!tex) continue;
    const k = sg.k === 'exit' ? 1.6 : sg.k === 'number' ? 1.25 : 1.1,
      mt = __cnGlowMat(tex, k);
    __cnPlane(root, sg.x, sg.y, sg.z, sg.ry, sg.w, sg.h, mt, 0.045);
    // a housing behind it
    const hb = new Ow(__prUnit('box'), __prMats('darkM'));
    hb.scale.set(sg.w + 0.06, sg.h + 0.06, 0.05);
    hb.position.set(sg.x + Math.sin(sg.ry) * 0.004, sg.y, sg.z + Math.cos(sg.ry) * 0.004);
    hb.rotation.y = sg.ry;
    root.add(hb);
  }
  for (const sg of N.shopSigns || []) {
    const t = __cnCanvas(1024, Math.round((1024 * sg.h) / sg.w), (c, w, h) => {
      c.fillStyle = '#1d1a18';
      c.fillRect(0, 0, w, h);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#e9d6a8';
      __cnFit(c, sg.text.toUpperCase(), h * 0.62, w * 0.9, 700, '"Big Shoulders Display", Barlow, sans-serif');
      c.fillText(sg.text.toUpperCase(), w / 2, h / 2 + 2);
    });
    const mt = Object.assign(new Gw({ map: t, roughness: 0.5, metalness: 0.3, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.35 }), { __prOwn: 1 });
    __prLit(mt);
    __cnPlane(root, sg.x, sg.y, sg.z, 0, sg.w, sg.h, mt, 0.005);
  }
  for (const p of N.posters) {
    const slot = p.slot ?? Math.floor(rnd() * 6),
      tex = __cnPosterTex(slot),
      lit = p.k !== 'easel',
      mt = lit ? __cnGlowMat(tex, 0.95) : Object.assign(new Gw({ map: tex, roughness: 0.4 }), { __prOwn: 1 });
    lit || __prLit(mt);
    if (p.k === 'easel') {
      // a gold easel standing on the floor
      const g = new ji();
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = p.ry;
      const leg = (x, rz) => {
        const o = new Ow(__prUnit('cyl8'), goldMat);
        o.scale.set(0.02, 1.8, 0.02);
        o.position.set(x, 0.9, -0.12);
        o.rotation.set(-0.12, 0, rz);
        g.add(o);
      };
      leg(-0.42, -0.05);
      leg(0.42, 0.05);
      const pl = new Ow(__cnQuad(p.w, p.h), mt);
      pl.position.set(0, 1.05 + p.h / 2 - 0.4, 0);
      pl.rotation.x = -0.12;
      g.add(pl);
      const fr = new Ow(__prUnit('box'), goldMat);
      fr.scale.set(p.w + 0.08, p.h + 0.08, 0.03);
      fr.position.set(0, 1.05 + p.h / 2 - 0.4, -0.02);
      fr.rotation.x = -0.12;
      g.add(fr);
      root.add(g);
      continue;
    }
    __cnPlane(root, p.x, p.y + p.h / 2, p.z, p.ry, p.w, p.h, mt, 0.05);
    // a gold frame round the light box
    const fr = new Ow(__prUnit('box'), goldMat);
    fr.scale.set(p.w + 0.16, p.h + 0.16, 0.06);
    fr.position.set(p.x, p.y + p.h / 2, p.z);
    fr.rotation.y = p.ry;
    root.add(fr);
  }
  // the marquee: three lit letter boards, bulbs round them and a soffit of bulbs
  const bulbs = [...N.bulbs];
  if (N.marquee) {
    const Q = N.marquee,
      bh = Q.y1 - Q.y0 - 0.3,
      by = (Q.y0 + Q.y1) / 2 + 0.05,
      wN = Q.x1 - Q.x0 - 0.4,
      wS = Q.z1 - Q.z0 - 0.3;
    __cnPlane(root, (Q.x0 + Q.x1) / 2, by, Q.z0, Math.PI, wN, bh, __cnGlowMat(__cnMarqueeTex(wN, bh, [['t1', 't2'], ['t3', 't4']]), 1.15), 0.02);
    __cnPlane(root, Q.x0, by, (Q.z0 + Q.z1) / 2 - 0.15, -Math.PI / 2, wS, bh, __cnGlowMat(__cnMarqueeTex(wS, bh, [['t5'], ['lounge']]), 1.15), 0.02);
    __cnPlane(root, Q.x1, by, (Q.z0 + Q.z1) / 2 - 0.15, Math.PI / 2, wS, bh, __cnGlowMat(__cnMarqueeTex(wS, bh, [['t1'], ['t2']]), 1.15), 0.02);
    if (N.nameSign) {
      const S0 = N.nameSign;
      __cnPlane(root, (S0.x0 + S0.x1) / 2, (S0.y0 + S0.y1) / 2, S0.z, Math.PI, S0.x1 - S0.x0 - 0.2, S0.y1 - S0.y0 - 0.2, __cnGlowMat(__cnNameTex(), 1.5), 0.0);
    }
    for (let x = Q.x0 + 0.15; x <= Q.x1 - 0.1; x += 0.3) bulbs.push([x, Q.y1 - 0.06, Q.z0 - 0.04, 0], [x, Q.y0 + 0.08, Q.z0 - 0.04, 0]);
    for (let zz = Q.z0 + 0.2; zz < Q.z1 - 0.1; zz += 0.3) for (const x of [Q.x0 - 0.04, Q.x1 + 0.04]) bulbs.push([x, Q.y1 - 0.06, zz, 0], [x, Q.y0 + 0.08, zz, 0]);
  }
  if (N.blade) {
    const B = N.blade,
      bt = __cnBladeTex(),
      mt = __cnGlowMat(bt, 1.25),
      zc = (B.z0 + B.z1) / 2 - 0.1,
      hgt = B.y1 - B.y0 - 0.5;
    __cnPlane(root, 59.6, (B.y0 + B.y1) / 2, zc, -Math.PI / 2, 2.2, hgt, mt, 0.01);
    __cnPlane(root, 60.4, (B.y0 + B.y1) / 2, zc, Math.PI / 2, 2.2, hgt, mt, 0.01);
    for (let y = B.y0 + 0.15; y < B.y1; y += 0.3) bulbs.push([59.52, y, B.z0 + 0.06, 1], [60.48, y, B.z0 + 0.06, 1]);
    // a gold sunburst crown on top
    const cr = new Ow(__prUnit('cone8'), goldMat);
    cr.scale.set(0.5, 1.2, 0.9);
    cr.position.set(60, B.y1 + 0.6, (B.z0 + B.z1) / 2);
    root.add(cr);
  }
  if (bulbs.length) {
    const g = new bi(0.045, 8, 6),
      mats = [0, 1].map(() => Object.assign(new Ni({ color: '#ffe0a0', toneMapped: !1 }), { __prOwn: 1 })),
      sets = [[], []];
    bulbs.forEach((b, k) => sets[(k + (b[3] || 0)) % 2].push(b));
    const M = new _A();
    sets.forEach((list, s) => {
      const im = new QZ(g, mats[s], list.length);
      list.forEach((b, k) => im.setMatrixAt(k, M.makeTranslation(b[0], b[1], b[2])));
      im.instanceMatrix.needsUpdate = !0;
      im.computeBoundingSphere();
      im.name = 'cinema_bulbs';
      root.add(im);
    });
    g.__cnOwn = 1;
    let t = 0;
    ticks.push((dt) => {
      t += dt;
      const ph = Math.floor(t * 3.2) % 2,
        tod = Zw.getState().timeOfDay,
        k = tod === 'night' ? 2.4 : tod === 'dusk' ? 1.9 : 1.3;
      mats[0].color.set('#ffe0a0').multiplyScalar(ph ? k : k * 0.35);
      mats[1].color.set('#ffe0a0').multiplyScalar(ph ? k * 0.35 : k);
    });
  }
  // ------------------------------------------------ row letters at the aisle ends (one mesh, a letter atlas)
  if (N.rowSigns && N.rowSigns.length) {
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      atlas = __cnCanvas(26 * 64, 64, (c, w, h) => {
        c.fillStyle = '#0d0d10';
        c.fillRect(0, 0, w, h);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = __CN_FONT(46, 800, 'Barlow, sans-serif');
        c.fillStyle = '#ffc77a';
        c.shadowColor = '#ff9a3a';
        c.shadowBlur = 8;
        for (let i = 0; i < 26; i++) c.fillText(L[i], i * 64 + 32, h / 2 + 2);
      }),
      P = [],
      UV = [],
      I = [];
    for (const r of N.rowSigns) {
      const i = Math.max(0, L.indexOf(r.ch)),
        u0 = i / 26,
        u1 = (i + 1) / 26,
        s2 = 0.075,
        cx = Math.cos(r.ry),
        sx = Math.sin(r.ry),
        // the plate's corners: its width runs across the facing direction
        pt = (dx, dy) => [r.x + cx * dx, r.y + dy, r.z - sx * dx],
        k = P.length / 3;
      P.push(...pt(-s2, -s2), ...pt(s2, -s2), ...pt(s2, s2), ...pt(-s2, s2));
      UV.push(u0, 0, u1, 0, u1, 1, u0, 1);
      I.push(k, k + 1, k + 2, k, k + 2, k + 3);
    }
    const g = new uw();
    g.setAttribute('position', new gi(new Float32Array(P), 3));
    g.setAttribute('uv', new gi(new Float32Array(UV), 2));
    g.setIndex(I);
    g.computeBoundingSphere();
    const o = new Ow(g, __cnGlowMat(atlas, 1.1, { side: 2 }));
    o.name = 'cinema_rowletters';
    root.add(o);
  }
  // ------------------------------------------------ the projectors' beams, with dust in them
  const beamM = __cnAdd(new Ni({ vertexColors: !0, side: 2, fog: !1 }), 9);
  // the beam shows only when you look back towards the projector: facing the screen (looking along the beam) it
  // fades out completely, so it never greys the picture. Each vertex carries its beam's direction (bdir).
  {
    const fade = beamM.onBeforeCompile;
    beamM.onBeforeCompile = (sh) => {
      fade && fade(sh);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 bdir;\nvarying vec3 vBDir;\nvarying vec3 vBWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvBDir = bdir;\nvBWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vBDir;\nvarying vec3 vBWorld;')
        .replace('#include <opaque_fragment>', 'outgoingLight *= 1.0 - smoothstep(-0.55, 0.05, dot(normalize(vBWorld - cameraPosition), normalize(vBDir)));\n#include <opaque_fragment>');
    };
    beamM.customProgramCacheKey = () => 'cn-beam-backlook';
  }
  const dustM = __cnAdd(new Dd({ color: '#8a8478', size: 0.014, sizeAttenuation: !0 }), 8);
  const dusts = [];
  for (const b of N.beams) {
    const xl = N.th.some((t) => t.xl && t.id === b.screen);
    const [fx, fy, fz] = b.from,
      [tx, ty, tz] = b.to,
      pw = 0.28,
      ph = 0.17,
      sw = b.w / 2,
      sh = b.h / 2;
    const A0 = [[fx - pw, fy - ph, fz], [fx + pw, fy - ph, fz], [fx + pw, fy + ph, fz], [fx - pw, fy + ph, fz]],
      B0 = [[tx - sw, ty - sh, tz], [tx + sw, ty - sh, tz], [tx + sw, ty + sh, tz], [tx - sw, ty + sh, tz]],
      P = [],
      C = [],
      I = [],
      D = [],
      bl = Math.hypot(tx - fx, ty - fy, tz - fz) || 1,
      bd = [(tx - fx) / bl, (ty - fy) / bl, (tz - fz) / bl];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4,
        k = P.length / 3;
      P.push(...A0[i], ...A0[j], ...B0[j], ...B0[i]);
      for (let v = 0; v < 4; v++) D.push(...bd);
      C.push(0.045, 0.047, 0.055, 0.045, 0.047, 0.055, 0.006, 0.006, 0.007, 0.006, 0.006, 0.007);
      I.push(k, k + 1, k + 2, k, k + 2, k + 3);
    }
    const g = new uw();
    g.setAttribute('position', new gi(new Float32Array(P), 3));
    g.setAttribute('color', new gi(new Float32Array(C), 3));
    g.setAttribute('bdir', new gi(new Float32Array(D), 3));
    g.setIndex(I);
    g.computeBoundingSphere();
    const o = new Ow(g, beamM);
    o.renderOrder = 4;
    o.name = 'cinema_beam';
    root.add(o);
    // dust motes drifting in the beam (not in the XL theaters: over a picture this size they read as noise)
    if (xl) continue;
    const n = 110,
      dp = new Float32Array(n * 3),
      seedT = [];
    for (let i = 0; i < n; i++) {
      const t = Math.pow(rnd(), 0.6),
        u = rnd() * 2 - 1,
        v = rnd() * 2 - 1;
      seedT.push([t, u, v, rnd() * 6.28]);
    }
    const dg = new uw();
    dg.setAttribute('position', new gi(dp, 3));
    const pts = new MZ(dg, dustM);
    pts.frustumCulled = !1;
    pts.userData.dyn = 1;
    root.add(pts);
    dusts.push({ b, dp, dg, seedT, fx, fy, fz, tx, ty, tz, pw, ph, sw, sh });
  }
  {
    let t = 0;
    ticks.push((dt) => {
      t += dt;
      for (const d of dusts) {
        for (let i = 0; i < d.seedT.length; i++) {
          const [s0, u, v, ph] = d.seedT[i],
            s = (s0 + t * 0.004) % 1,
            w = d.pw + (d.sw - d.pw) * s,
            h = d.ph + (d.sh - d.ph) * s;
          d.dp[i * 3] = d.fx + (d.tx - d.fx) * s + u * w * 0.9 + Math.sin(t * 0.3 + ph) * 0.05;
          d.dp[i * 3 + 1] = d.fy + (d.ty - d.fy) * s + v * h * 0.9 + Math.sin(t * 0.21 + ph * 2) * 0.06;
          d.dp[i * 3 + 2] = d.fz + (d.tz - d.fz) * s;
        }
        d.dg.attributes.position.needsUpdate = !0;
      }
    });
  }
  // ------------------------------------------------ the Velvet Room's star-field ceiling
  for (const T of N.th)
    if (T.stars) {
      const n = 1400,
        P = new Float32Array(n * 3),
        Cc = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        P[i * 3] = T.x0 + rnd() * (T.x1 - T.x0);
        P[i * 3 + 1] = T.h - 0.02;
        P[i * 3 + 2] = T.z0 + rnd() * (T.z1 - T.z0);
        const k = 0.5 + rnd() * 0.9,
          blue = rnd() < 0.3;
        Cc[i * 3] = k * (blue ? 0.75 : 1);
        Cc[i * 3 + 1] = k * (blue ? 0.85 : 0.95);
        Cc[i * 3 + 2] = k;
      }
      const g = new uw();
      g.setAttribute('position', new gi(P, 3));
      g.setAttribute('color', new gi(Cc, 3));
      const sm = __cnAdd(new Dd({ size: 0.035, vertexColors: !0, opacity: 0.95, sizeAttenuation: !0 }));
      const pts = new MZ(g, sm);
      pts.name = 'cinema_stars';
      root.add(pts);
      let t = 0;
      ticks.push((dt) => ((t += dt), (sm.opacity = 0.8 + Math.sin(t * 1.7) * 0.12)));
    }
  // ------------------------------------------------ glow follows the time of day; posters follow the showings
  ticks.push(() => {
    const tod = Zw.getState().timeOfDay,
      k = tod === 'night' ? 2.0 : tod === 'dusk' ? 1.6 : 1.2;
    __PR.glowMat && __PR.glowMat.color.setScalar(k);
    const rev = typeof __SCR == 'object' ? __SCR.rev : 0;
    if (rev !== __CN_V.rev) {
      __CN_V.rev = rev;
      for (const t of __CN_V.dyn) t.redraw();
    }
  });
  // the canvas textures are released with the view
  root.userData.cnTex = __CN_V.dyn;
  return { tris: Math.round(tris), seats: nSeats, seatTris: seatInfo.tris, cars: nCars, doors, ms: Math.round(performance.now() - t0) };
}
// ---------------------------------------------------------------- arched openings
// The opening stays a rectangle for collision; drawn, its top is a round arch: the corners above the arch are
// filled with the wall's own surfaces (both faces and the soffit), and a gold architrave follows the curve, with
// a keystone. A tall opening gets a semicircle; a wide, low one a segmental arch.
function __cnArch(S, o, gold, K) {
  const TK = o.trim || 'gold'; // the architrave's surface (stone on the Fortress)
  const t = o.t || 0.4,
    W = o.w,
    hw = W / 2,
    rise = Math.min(hw, (o.y1 - o.y0) * 0.42),
    R = (hw * hw + rise * rise) / (2 * rise),
    cy = o.y1 - R, // the arch's centre (below the crown by R)
    ca = o.a + hw,
    th0 = Math.asin(Math.min(1, hw / R)),
    n = 14,
    P = (a, y, d) => (o.alongX ? [a, y, o.f + d] : [o.f + d, y, a]),
    arcPt = (i) => {
      const th = -th0 + (2 * th0 * i) / n;
      return [ca + R * Math.sin(th), cy + R * Math.cos(th)];
    };
  // spandrels: on each face, a fan of quads from the arch up to the opening's top edge
  for (const [sd, fill] of [[-1, o.fill && o.fill[0]], [1, o.fill && o.fill[1]]]) {
    if (!fill) continue;
    const MB = S.b(fill[0]),
      col = K(fill[1] || '#ffffff'),
      d = sd * (t / 2 + 0.004);
    for (let i = 0; i < n; i++) {
      const [a0, y0] = arcPt(i),
        [a1, y1] = arcPt(i + 1);
      const q = [P(a0, y0, d), P(a1, y1, d), P(a1, o.y1, d), P(a0, o.y1, d)];
      // wound to face out of the wall on this side
      (sd > 0) === !!o.alongX ? __prQuadRaw(MB, q[0], q[1], q[2], q[3], col) : __prQuadRaw(MB, q[1], q[0], q[3], q[2], col);
    }
    // the soffit: the arch's underside through the wall's thickness
    if (sd > 0) {
      const MS = S.b(fill[0]);
      for (let i = 0; i < n; i++) {
        const [a0, y0] = arcPt(i),
          [a1, y1] = arcPt(i + 1);
        __prQuadRaw(MS, P(a0, y0, -t / 2), P(a1, y1, -t / 2), P(a1, y1, t / 2), P(a0, y0, t / 2), col);
        __prQuadRaw(MS, P(a1, y1, -t / 2), P(a0, y0, -t / 2), P(a0, y0, t / 2), P(a1, y1, t / 2), col);
      }
    }
  }
  // the architrave: a gold band round the arch and down the jambs, on both faces, and a keystone
  for (const sd of [-1, 1]) {
    const d0 = sd * (t / 2),
      d1 = sd * (t / 2 + 0.045);
    for (let i = 0; i < n; i++) {
      const [a0, y0] = arcPt(i),
        [a1, y1] = arcPt(i + 1),
        m = [(a0 + a1) / 2, (y0 + y1) / 2],
        L = Math.hypot(a1 - a0, y1 - y0),
        ang = Math.atan2(y1 - y0, a1 - a0),
        p = P(m[0], m[1], (d0 + d1) / 2);
      S.add(TK, __prUnit('box'), o.alongX ? __cnM(p[0], p[1], p[2], L + 0.02, 0.1, 0.045, 0, 0, ang) : __cnM(p[0], p[1], p[2], 0.045, 0.1, L + 0.02, 0, -ang, 0), gold);
    }
    for (const aa of [o.a - 0.05, o.a + W + 0.05]) {
      const a = P(aa - 0.05, o.y0, d0),
        b = P(aa + 0.05, cy + R * Math.cos(th0), d1);
      S.box(TK, Math.min(a[0], b[0]), o.y0, Math.min(a[2], b[2]), Math.max(a[0], b[0]), b[1], Math.max(a[2], b[2]), gold);
    }
    const k0 = P(ca - 0.16, o.y1 - 0.06, d0),
      k1 = P(ca + 0.16, o.y1 + 0.24, d1 + sd * 0.02);
    S.box(TK, Math.min(k0[0], k1[0]), k0[1], Math.min(k0[2], k1[2]), Math.max(k0[0], k1[0]), k1[1], Math.max(k0[2], k1[2]), gold);
  }
}
// ---------------------------------------------------------------- furniture and fittings
function __cnItem(S, it, rnd, root, ticks) {
  const K = __prK,
    gold = K('#c9a45a'),
    blk = K('#151517');
  switch (it.k) {
    case 'speaker': {
      // a stage monitor wedge: a black cabinet, its grille and two drivers
      const { x, y, z: zz } = it;
      S.box('darkM', x - 0.68, y + 0.02, zz - 0.48, x + 0.68, y + 0.98, zz + 0.48, K('#17181b'));
      S.box('dark', x - 0.62, y + 0.08, zz + 0.48, x + 0.62, y + 0.92, zz + 0.5, K('#0d0d0f'));
      for (const dx of [-0.32, 0.32]) S.add('darkM', __prUnit('cyl16'), __cnM(x + dx, y + 0.5, zz + 0.5, 0.22, 0.03, 0.22, 0, Math.PI / 2), K('#2a2c30'));
      break;
    }
    case 'roadcase': {
      // a flight case: black plywood, aluminium edges, brass corners and handles
      const { x, y, z: zz } = it;
      S.box('dark', x - 0.6, y, zz - 0.48, x + 0.6, y + 0.9, zz + 0.48, K('#1d1e21'));
      for (const yy of [y, y + 0.88]) S.box('stainless', x - 0.62, yy, zz - 0.5, x + 0.62, yy + 0.03, zz + 0.5, K('#a9adb1'));
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.box('stainless', x + dx * 0.6 - 0.03, y, zz + dz * 0.48 - 0.03, x + dx * 0.6 + 0.03, y + 0.92, zz + dz * 0.48 + 0.03, K('#a9adb1'));
      S.box('gold', x - 0.15, y + 0.6, zz + 0.48, x + 0.15, y + 0.66, zz + 0.52, K('#a8843f'));
      break;
    }
    case 'console': {
      // the projectionist's desk: a steel desk, a sloped panel with a lit display and rows of buttons
      const { x, y, z: zz } = it,
        ry = it.ry || 0,
        c = Math.cos(ry),
        sn = Math.sin(ry),
        P = (dx, dz) => [x + dx * c + dz * sn, zz - dx * sn + dz * c];
      const [ax, az] = P(0, 0);
      S.add('paint', __prUnit('box'), __cnM(ax, y + 0.45, az, 1.4, 0.9, 0.7, ry), K('#2b3035'));
      const [px, pz] = P(0, 0.12);
      S.add('darkM', __prUnit('box'), __cnM(px, y + 1.02, pz, 1.3, 0.05, 0.5, ry, -0.35), K('#15181b'));
      const [sx, sz] = P(0, 0.08);
      S.add('glow', __prUnit('box'), __cnM(sx, y + 1.07, sz, 0.7, 0.01, 0.32, ry, -0.35), K('#4f9dff'));
      for (let k = 0; k < 6; k++) {
        const [bx, bz] = P(-0.5 + k * 0.2, 0.3);
        S.add('glow', __prUnit('box'), __cnM(bx, y + 0.99, bz, 0.08, 0.02, 0.06, ry, -0.35), K(['#3cff70', '#ff5a4a', '#ffd25a'][k % 3]));
      }
      break;
    }
    case 'planter': {
      if (it.bare) {
        // a clipped box ball on the lawn
        S.add('hedge', __prUnit('sph'), __cnM(it.x, it.y + 0.55, it.z, 0.62, 0.55, 0.62), K('#3a5527'));
        break;
      }
      // a palm: a ringed trunk leaning a little, fronds drooping from the crown
      const { x, z: zz, y } = it,
        h = 4.2 + rnd() * 1.2,
        lean = (rnd() - 0.5) * 0.4;
      S.box('marble', x - it.w / 2 - 0.05, y - 0.05, zz - it.d / 2 - 0.05, x + it.w / 2 + 0.05, y, zz + it.d / 2 + 0.05, K('#3a3633'));
      for (let k = 0; k < 9; k++) {
        const a = k / 9,
          b = (k + 1) / 9;
        S.cyl('wood', [x + lean * a, y + h * a, zz], [x + lean * b, y + h * b, zz], 0.16 - 0.05 * a, K('#8a7356'), 'cyl8');
      }
      const top = [x + lean, y + h, zz];
      for (let f = 0; f < 11; f++) {
        const az = (f / 11) * Math.PI * 2 + rnd() * 0.3,
          L = 1.9 + rnd() * 0.6,
          MB = S.b('cloth');
        let p = top;
        for (let s = 1; s <= 5; s++) {
          const t = s / 5,
            q = [top[0] + Math.cos(az) * L * t, top[1] + 0.35 * Math.sin(Math.PI * t * 0.8) - 1.1 * t * t, top[2] + Math.sin(az) * L * t],
            wd = 0.32 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.04,
            px = -Math.sin(az) * wd,
            pz = Math.cos(az) * wd;
          __prQuadRaw(MB, [p[0] - px, p[1], p[2] - pz], [q[0] - px, q[1], q[2] - pz], [q[0] + px, q[1], q[2] + pz], [p[0] + px, p[1], p[2] + pz], K('#3f6b2e'));
          __prQuadRaw(MB, [p[0] + px, p[1], p[2] + pz], [q[0] + px, q[1], q[2] + pz], [q[0] - px, q[1], q[2] - pz], [p[0] - px, p[1], p[2] - pz], K('#355c27'));
          p = q;
        }
      }
      break;
    }
    case 'bollard': {
      // a granite post with a domed cap
      S.add('granite', __prUnit('cyl16'), __cnM(it.x, 0.6, it.z, 0.15, 0.9, 0.15), K('#c3bbae'));
      S.add('granite', __prUnit('hemi'), __cnM(it.x, 1.05, it.z, 0.15, 0.08, 0.15), K('#c3bbae'));
      break;
    }
    case 'kiosk': {
      // the box office: gold pilasters, a ticket window with a speaking grille, a counter ledge
      const { x0, x1, z0, z1 } = it;
      for (const x of [x0 + 0.06, x1 - 0.06]) S.box('gold', x - 0.08, 1.1, z0 - 0.04, x + 0.08, 2.65, z0 + 0.06, gold);
      S.box('gold', x0, 1.08, z0 - 0.06, x1, 1.14, z0 + 0.06, gold);
      S.box('marble', x0 + 0.6, 1.1, z0 - 0.3, x1 - 0.6, 1.16, z0, K('#3a3633'));
      for (let x = 59.3; x <= 60.71; x += 0.1) S.cyl('gold', [x, 1.5, z0 + 0.03], [x, 1.85, z0 + 0.03], 0.006, gold, 'cyl6');
      break;
    }
    case 'ropes': {
      const P = it.pts;
      for (const [x, zz] of P) {
        S.cyl('gold', [x, 0.15, zz], [x, 1.0, zz], 0.03, gold, 'cyl8');
        S.add('gold', __prUnit('cyl16'), __cnM(x, 0.16, zz, 0.17, 0.03, 0.17), gold);
        S.add('gold', __prUnit('sph'), __cnM(x, 1.03, zz, 0.05, 0.05, 0.05), gold);
      }
      for (let i = 0; i + 1 < P.length; i++) {
        const [ax, az] = P[i],
          [bx, bz] = P[i + 1],
          n = 8;
        let pr = [ax, 0.92, az];
        for (let s = 1; s <= n; s++) {
          const t = s / n,
            q = [ax + (bx - ax) * t, 0.92 - 0.22 * Math.sin(Math.PI * t), az + (bz - az) * t];
          S.cyl('velvet', pr, q, 0.022, K('#8a1c26'), 'cyl8');
          pr = q;
        }
      }
      break;
    }
    case 'glassdoors': {
      // brass mullions round each bay and a push bar on the open glass leaves folded back inside
      const { a0, a1, z: zz, h } = it;
      for (const x of [a0, a1]) S.box('gold', x - 0.06, 0.12, zz - 0.22, x + 0.06, 4.6, zz + 0.22, gold);
      S.box('gold', a0, h - 0.05, zz - 0.22, a1, h + 0.07, zz + 0.22, gold);
      for (const [x, s] of [[a0 + 0.08, 1], [a1 - 0.08, -1]]) {
        S.box('cnGlass', x - 0.015, 0.14, zz + 0.25, x + 0.015, h - 0.1, zz + 1.6, K('#ffffff'));
        S.box('gold', x - 0.03, 0.14, zz + 1.56, x + 0.03, h - 0.1, zz + 1.64, gold);
        S.box('gold', x + s * 0.02, 1.0, zz + 0.4, x + s * 0.06, 1.06, zz + 1.4, gold);
      }
      break;
    }
    case 'relief': {
      // the Velvet Room's blank facade: stucco relief panels (fluted, a roundel over the flutes)
      for (let x = it.x0; x < it.x1 - 1; x += 4.4) {
        S.box('stucco', x, it.y0, it.z - 0.16, x + 3.4, it.y1, it.z, K('#d9c8a8'));
        for (let k = 0; k < 6; k++) S.box('stucco', x + 0.35 + k * 0.5, it.y0 + 0.4, it.z - 0.22, x + 0.55 + k * 0.5, it.y1 - 1.2, it.z - 0.16, K('#e9dcc4'));
        // (over the flutes: a brass Seed of Life roundel, recorded in 71-cinema.js, drawn by 72b-cinema-sacred.js)
      }
      break;
    }
    case 'compass': {
      // a sixteen-point star of dark marble and brass in the lobby floor
      const MB = S.b('marble'),
        MG = S.b('gold'),
        { x, z: zz, y, r } = it;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2,
          L = i % 4 === 0 ? r : i % 2 === 0 ? r * 0.7 : r * 0.45,
          d = Math.PI / 16;
        const tip = [x + Math.cos(a) * L, y, zz + Math.sin(a) * L],
          l = [x + Math.cos(a - d) * r * 0.16, y, zz + Math.sin(a - d) * r * 0.16],
          rr = [x + Math.cos(a + d) * r * 0.16, y, zz + Math.sin(a + d) * r * 0.16],
          c = [x, y, zz];
        __prQuadRaw(i % 2 ? MG : MB, c, rr, tip, l, i % 2 ? gold : K('#2c2826'));
      }
      S.add('gold', __prUnit('tor'), __cnM(x, y, zz, r * 1.05, r * 1.05, 0.15, 0, Math.PI / 2), gold);
      break;
    }
    case 'coffers': {
      // a coffered ceiling: deep beams on a 4 m grid, gold fillets along their edges
      const { x0, x1, z0, z1, y } = it;
      for (let zz = z0 + 4; zz < z1 - 0.5; zz += 4) {
        S.box('plaster', x0, y - 0.5, zz - 0.2, x1, y, zz + 0.2, K('#e8dcc4'));
        S.box('gold', x0, y - 0.52, zz - 0.21, x1, y - 0.48, zz + 0.21, gold);
      }
      for (let x = x0 + 4; x < x1 - 0.5; x += 4) {
        S.box('plaster', x - 0.2, y - 0.5, z0, x + 0.2, y, z1, K('#e8dcc4'));
        S.box('gold', x - 0.21, y - 0.52, z0, x + 0.21, y - 0.48, z1, gold);
      }
      break;
    }
    case 'concession': {
      const { x0, x1, z0, z1, back } = it;
      // glass candy cases along the counter's front, lit, full of boxes
      for (let x = x0 + 0.4; x < x1 - 2; x += 3.2) {
        if (Math.abs(x + 1.3 - 52) < 1 || Math.abs(x + 1.3 - 60) < 1 || Math.abs(x + 1.3 - 68) < 1) continue;
        S.box('cnGlass', x, 0.25, z0 - 0.02, x + 2.6, 1.0, z0 + 0.01, K('#ffffff'));
        for (let k = 0; k < 18; k++) {
          const bx = x + 0.12 + (k % 9) * 0.27,
            by = 0.32 + Math.floor(k / 9) * 0.3;
          S.box('paint', bx, by, z0 + 0.06, bx + 0.2, by + 0.22, z0 + 0.2, K(['#d8342c', '#f2c12e', '#2a8ad8', '#e86fb0', '#3cb44b', '#f58231'][Math.floor(rnd() * 6)]));
        }
        S.box('glow', x + 0.05, 0.92, z0 + 0.05, x + 2.55, 0.94, z0 + 0.5, K('#fff1d6'));
      }
      // popcorn machines on the back counter: a red cabinet, a glass kettle box full of popcorn, lit
      for (const x of [54.5, 65.5]) {
        S.box('paint', x - 0.55, 1.0, back - 0.05, x + 0.55, 1.35, back + 0.55, K('#b3201c'));
        S.box('cnGlass', x - 0.55, 1.35, back - 0.05, x + 0.55, 2.25, back + 0.55, K('#ffffff'));
        S.box('glow', x - 0.5, 1.37, back, x + 0.5, 1.75, back + 0.5, K('#ffd65a'));
        S.box('paint', x - 0.6, 2.25, back - 0.1, x + 0.6, 2.45, back + 0.6, K('#b3201c'));
        S.box('gold', x - 0.62, 2.45, back - 0.12, x + 0.62, 2.5, back + 0.62, K('#c9a45a'));
      }
      // the soda fountain and cup stacks
      for (const x of [58.6, 61.4]) {
        S.box('stainless', x - 0.6, 1.0, back, x + 0.6, 1.75, back + 0.55, K('#c9cdd0'));
        S.box('glow', x - 0.5, 1.5, back - 0.01, x + 0.5, 1.7, back, K('#5fb3ff'));
        for (let k = 0; k < 4; k++) S.cyl('stainless', [x - 0.42 + k * 0.28, 1.35, back - 0.06], [x - 0.42 + k * 0.28, 1.2, back - 0.06], 0.02, K('#9aa0a4'), 'cyl8');
      }
      for (const x of [49.5, 70.5]) for (let k = 0; k < 3; k++) S.cyl('paint', [x + k * 0.2, 1.0, back + 0.25], [x + k * 0.2, 1.45, back + 0.25], 0.045, K('#e9e4dc'), 'cyl8');
      // a gold rail along the counter's top front, and a neon REFRESHMENTS band over the menus
      S.cyl('gold', [x0, 1.16, z0 - 0.02], [x1, 1.16, z0 - 0.02], 0.02, gold, 'cyl8');
      S.box('glow', x0 + 2, 4.05, back + 0.95, x1 - 2, 4.12, back + 0.97, K('#ff5a7a'));
      break;
    }
    case 'bench': {
      const { x, z: zz, y, ry, w } = it,
        c = Math.cos(ry),
        s = Math.sin(ry);
      S.add('woodp', __prUnit('box'), __cnM(x, y + 0.44, zz, w, 0.06, 0.46, ry), K('#ffffff'));
      S.add('woodp', __prUnit('box'), __cnM(x + s * 0.2, y + 0.75, zz + c * 0.2, w, 0.4, 0.05, ry, -0.12), K('#ffffff'));
      for (const d of [-w / 2 + 0.1, w / 2 - 0.1]) S.add('gold', __prUnit('box'), __cnM(x + c * d, y + 0.22, zz - s * d, 0.04, 0.44, 0.4, ry), gold);
      break;
    }
    case 'arcade': {
      // an arcade cabinet facing east: a lit marquee, the screen, the control panel
      const { x, z: zz, v } = it,
        cols = ['#e8452c', '#2c8ae8', '#e8c22c', '#9c2ce8', '#2ce88a', '#e82c9c'];
      S.box('paint', x, 0.12, zz - 0.4, x + 0.9, 1.9, zz + 0.4, K(cols[v % 6]).map((c) => c * 0.45));
      S.box('glow', x + 0.88, 1.62, zz - 0.36, x + 0.92, 1.86, zz + 0.36, K(cols[v % 6]));
      S.box('glow', x + 0.8, 1.05, zz - 0.3, x + 0.84, 1.5, zz + 0.3, K(['#40e0ff', '#ffe040', '#ff60c0', '#80ff60'][v % 4]).map((c) => c * 0.8));
      S.box('dark', x + 0.85, 0.95, zz - 0.4, x + 1.2, 1.02, zz + 0.4, blk);
      for (const dz of [-0.18, 0.12]) S.add('paint', __prUnit('sph'), __cnM(x + 1.0, 1.08, zz + dz, 0.035, 0.035, 0.035), K('#e8452c'));
      break;
    }
    case 'claw': {
      S.box('paint', it.x - 0.7, 0.12, it.z - 0.7, it.x + 0.7, 0.9, it.z + 0.7, K('#d63a7a'));
      S.box('cnGlass', it.x - 0.68, 0.9, it.z - 0.68, it.x + 0.68, 1.85, it.z + 0.68, K('#ffffff'));
      for (let k = 0; k < 14; k++) S.add('cloth', __prUnit('sph'), __cnM(it.x - 0.5 + rnd(), 1.0 + rnd() * 0.15, it.z - 0.5 + rnd(), 0.11, 0.11, 0.11), K(['#f4d03f', '#5dade2', '#ec7063', '#58d68d', '#f5b7b1'][k % 5]));
      S.box('glow', it.x - 0.7, 1.85, it.z - 0.7, it.x + 0.7, 2.0, it.z + 0.7, K('#ff7ab8'));
      break;
    }
    case 'photobooth': {
      S.box('paint', it.x0, 0.12, it.z0, it.x1, 2.2, it.z0 + 0.06, K('#2b2b30'));
      S.box('cloth', it.x1 - 0.05, 0.3, it.z0 + 0.1, it.x1, 2.0, it.z1 - 0.1, K('#8a1c26'));
      S.box('glow', it.x0 + 0.1, 2.0, it.z1 - 0.04, it.x1 - 0.1, 2.18, it.z1, K('#ffd45a'));
      break;
    }
    case 'coatcheck': {
      S.box('marble', it.x0 - 0.05, 1.05, it.z0 - 0.05, it.x1 + 0.05, 1.1, it.z1 + 0.05, K('#3a3633'));
      S.cyl('gold', [89.4, 1.9, it.z0 + 0.2], [89.4, 1.9, it.z1 - 0.2], 0.02, gold, 'cyl8');
      for (let zz = it.z0 + 0.4; zz < it.z1 - 0.3; zz += 0.32) S.box('cloth', 89.2, 0.9, zz - 0.12, 89.6, 1.85, zz + 0.12, K(['#2a2a33', '#5a3a2a', '#3a4a5a', '#6a1a22'][Math.floor(rnd() * 4)]));
      break;
    }
    case 'bar': {
      const { x0, x1, z0, z1, back } = it;
      // a brass foot rail, the back bar's shelves of bottles lit from below
      S.cyl('gold', [x0, 0.3, z1 + 0.18], [x1, 0.3, z1 + 0.18], 0.025, gold, 'cyl8');
      for (const y of [1.45, 1.95]) {
        S.box('cnGlass', x0, y - 0.02, 26.42, x1, y, back - 0.2, K('#ffffff'));
        S.box('glow', x0, y - 0.03, 26.42, x1, y - 0.02, 26.5, K('#ffb15a'));
        for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.16 + rnd() * 0.06) {
          const h = 0.22 + rnd() * 0.12;
          S.cyl('cnGlass', [x, y, 26.6], [x, y + h, 26.6], 0.035, K(['#4a7a3a', '#7a4a1a', '#c8c0a0', '#3a2a1a', '#9a2a2a'][Math.floor(rnd() * 5)]), 'cyl8');
        }
      }
      break;
    }
    case 'neon': {
      const t = __cnCanvas(512, 128, (c, w, h) => {
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'italic 700 92px "Big Shoulders Display", cursive';
        c.lineWidth = 7;
        c.strokeStyle = it.color || '#7ab8ff';
        c.shadowColor = it.color || '#3f8cff';
        c.shadowBlur = 24;
        c.strokeText(it.text, w / 2, h / 2);
        c.shadowBlur = 0;
        c.fillStyle = '#ffe6f8';
        c.fillText(it.text, w / 2, h / 2);
      });
      const mt = __cnGlowMat(t, 1.4, { transparent: !0, depthWrite: !1 });
      __cnPlane(root, it.x, it.y, it.z, it.ry, it.w, it.h, mt, 0.02);
      break;
    }
    case 'dock': {
      const { x0, x1, z: zz, y } = it;
      S.box('paint', x0, y - 0.05, zz - 0.04, x1, y, zz + 0.02, K('#d6ad2a'));
      for (let x = x0 + 1.5; x < x1 - 1; x += 4) S.box('dark', x - 0.3, 0.3, zz, x + 0.3, 0.9, zz + 0.18, blk);
      break;
    }
    case 'dumpster': {
      const { x, z: zz } = it;
      S.box('paint', x - 1.02, 1.5, zz - 0.82, x + 1.02, 1.56, zz + 0.82, K('#24452f'));
      for (const dx of [-0.8, 0.8]) S.add('dark', __prUnit('cyl16'), __cnM(x + dx, 0.1, zz + 0.6, 0.1, 0.06, 0.1, 0, Math.PI / 2), blk);
      break;
    }
    case 'filmcans': {
      for (let k = 0; k < 7; k++) S.add('stainless', __prUnit('cyl16'), __cnM(it.x - 0.15, 0.17 + k * 0.08, it.z + (k % 2) * 0.05, 0.19, 0.035, 0.19), K('#b8bcc0'));
      break;
    }
    case 'cleaning': {
      S.box('paint', it.x - 0.3, 0.12, it.z - 0.45, it.x + 0.3, 0.9, it.z + 0.45, K('#e2b52a'));
      S.cyl('wood', [it.x + 0.1, 0.9, it.z + 0.3], [it.x + 0.1, 1.6, it.z + 0.3], 0.015, K('#8a6a4a'), 'cyl6');
      break;
    }
    case 'projector': {
      // a 35 mm projector on its pedestal: the lamphouse, the head, two reels on top, the lens to the port
      const { x, y, z: zz } = it;
      S.box('darkM', x - 0.35, y, zz - 0.5, x + 0.35, y + 0.9, zz + 0.5, K('#2a2d31'));
      S.box('paint', x - 0.45, y + 0.9, zz - 0.62, x + 0.45, y + 1.75, zz + 0.62, K('#4a5560'));
      S.box('paint', x - 0.3, y + 1.75, zz - 0.2, x + 0.3, y + 2.2, zz + 0.45, K('#3a434c'));
      for (const dz of [-0.3, 0.35]) S.add('stainless', __prUnit('cyl16'), __cnM(x, y + 2.35, zz + dz, 0.38, 0.04, 0.38, 0, 0, Math.PI / 2), K('#b8bcc0'));
      S.cyl('darkM', [x, y + 2.3, zz - 0.62], [x, y + 2.3, zz - 1.05], 0.09, K('#1b1d20'), 'cyl16');
      S.add('glow', __prUnit('cyl16'), __cnM(x, y + 2.3, zz - 1.06, 0.07, 0.01, 0.07, 0, Math.PI / 2), K('#fff4dc'));
      S.box('glow', x + 0.36, y + 1.2, zz - 0.4, x + 0.46, y + 1.5, zz + 0.4, K('#ffcf8a'));
      break;
    }
    case 'platter': {
      const { x, y, z: zz } = it;
      S.box('darkM', x - 0.1, y, zz - 0.1, x + 0.1, y + 1.05, zz + 0.1, K('#2a2d31'));
      for (const h of [0.45, 0.75, 1.05]) S.add('stainless', __prUnit('cyl16'), __cnM(x, y + h, zz, 0.75, 0.015, 0.75), K('#aeb3b8'));
      break;
    }
  }
}
// release the canvas textures with the view (the view's own cleanup handles meshes and materials)
{
  const prevTrees = kwA;
  kwA = function () {
    const m = aw();
    S.useEffect(
      () => () => {
        for (const t of __CN_V.dyn) t.dispose && t.dispose();
        __CN_V.dyn = [];
      },
      [m],
    );
    return M.jsx(prevTrees, {});
  };
}
typeof window < 'u' &&
  (window.__bpCinema = () => ({
    stats: __PR.stats,
    dyn: __CN_V.dyn.length,
    thumbs: Object.keys(__CN_V.thumbs),
    // the scenery's heaviest drawn parts (triangles, instances included), for profiling
    heavy: () => {
      const t = {},
        sc = __PR.scene;
      sc &&
        sc.traverseVisible((o) => {
          if (!o.isMesh || !o.geometry) return;
          const g = o.geometry,
            n = ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1);
          t[o.name || o.type] = (t[o.name || o.type] || 0) + n;
        });
      return Object.entries(t)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([k, v]) => k + ' ' + Math.round(v / 1000) + 'k');
    },
  }));
