/* ===== Bayou Protocol mod: real skies and sky lighting on the outdoor maps ===== */
// The outdoor maps had a flat white-grey sky (the core's procedural Sky, which drew over every map's own sky
// picture on Ridgeback), no sun disc or clouds, and a heavy whitish linear fog that flattened everything past
// the near ground. Now, on Ridgeback Pass, Fortress, Frostline and Blackwater (its yard; the cell blocks are
// lit through the prison's own light volume, 65-prison-view.js):
//   - the sky is a photographed one: Poly Haven HDRIs (CC0, see CREDITS.md), one per time of day: a partly
//     cloudy midday, a golden-hour sunset, a clear night with stars and a rising moon (Frostline keeps its own
//     snowy-hillside sky by day). Built by tools/fetch-sky.mjs into public/game/sky/
//   - the same HDRI lights the scene (scene.environment: reflections and sky light, prefiltered with three.js's
//     PMREM), made from a 1024 x 512 HDR with the sun taken out (the sun is the directional light) and the
//     mirrored sky under the horizon replaced with ground, so surfaces facing down get the ground's darker
//     bounce. The core's hemisphere light, which lit every side alike, is turned down to a little fill
//   - the sun (or moon) light comes from where the sun is in the picture: the sky is turned round the vertical
//     (scene.backgroundRotation / environmentRotation) so the HDRI's sun sits at the core's sun bearing for
//     that time of day (the maps' shadows keep their direction), and the light takes the HDRI sun's height
//     (at dusk and night not lower than 10 and 22 degrees: a moon or sun on the horizon would leave the lanes
//     in long shadow; the bearing, which is what the eye checks, still matches)
//   - the haze is exponential-squared fog (FogExp2) in the colour of the sky's horizon: the mid-ground keeps
//     its contrast and colour (about 5 % haze at 100 m by day), distant hills fade into the horizon (half at
//     about 400 m)
// The picture and the lighting are scaled together (tools/fetch-sky.mjs): the sky on screen is as bright as
// the light it gives, against the core's sun intensities (Ku), so the colour grade, the exposure per time of
// day and the player's brightness settings (85-view-tuning.js) apply on top as before.
//
// Quality:
//   - Low: the sky picture at 2048 x 1024 (about 15-60 kB), the sun matched to it and the new haze; the core's
//     own lighting environment and hemisphere light (no extra download or prefiltering)
//   - Medium, High: the 4096 x 2048 picture (45-190 kB) and the HDR lighting (400-770 kB)
//   - phones, tablets and low-memory devices (__LOWMEM): the 2048 picture whatever the quality
// Memory: the picture is turned into a cube once (1024 px faces, no mipmaps: it is never shrunk on screen)
// and the picture itself freed; the lighting HDR is freed once prefiltered. Leaving the outdoor maps frees both.
// The Cinema has no sky of its own here: it keeps the core's lighting and its street's sky (72-cinema-view.js).
//
// How: the core's sun component TiA is wrapped. For a handled map it is given its own copy of the time of
// day's table entry (Ku: sun direction and colour, hemisphere and environment strength), and its procedural
// sky, stars, background colour and fog (and, once this mod's lighting map is ready, the core's environment)
// are left out; __SkyView puts the sky, the environment and the haze in their place every frame. The map
// mods that used to set a sky (Ridgeback, Frostline, Blackwater, Fortress) are told there is none to set.
const __SKY_BASE = './game/sky/';
// The HDRIs, as measured by tools/fetch-sky.mjs: the sun in three.js's equirectangular directions (before
// rotation), the picture's white point (its backgroundIntensity) and the horizon's colour in the game's
// linear units (the haze fades to it).
const __SKY_SETS = {
  day: { pic: 'day', env: 'day', sun: [0.5544, 0.7416, 0.3776], white: 2, horizon: [0.2906, 0.3125, 0.3784], fogK: 0.9, sunColor: '#fff3e2', hemi: 0.3, envI: 1, minEl: 0 },
  // the averaged horizon includes the sunset's glow: the haze takes a little over half of it
  dusk: { pic: 'dusk', env: 'dusk', sun: [0.8042, 0.1059, 0.5848], white: 2, horizon: [1.9411, 1.4106, 0.912], fogK: 0.55, sunColor: '#ffa055', hemi: 0.35, envI: 1, minEl: 10 },
  // night: the moon is the light, in the core's moonlight blue; more fill than by day, to keep the lanes readable
  night: { pic: 'night', env: 'night', sun: [0.7851, 0.2385, 0.5717], white: 0.6, horizon: [0.042, 0.05, 0.068], fogK: 1, sunColor: null, hemi: 0.9, envI: 1, minEl: 22 },
  // Frostline by day: its own snowy-hillside picture (public/game/maps/frostline/sky.webp, already tone-mapped,
  // so shown at intensity 1) and lighting from the same HDRI (overcast: strong sky light, snow underfoot)
  'frost-day': { pic: null, env: 'frost-day', sun: [0.7588, 0.3423, 0.5541], white: 1, fogHex: '#dfe6ee', fogK: 1, sunColor: '#fff4ec', hemi: 0.3, envI: 0.7, minEl: 0 },
};
// the handled maps: haze density (FogExp2) per time of day, and which set by day
const __SKY_MAPS = {
  ridgeback: { fog: { day: 0.0021, dusk: 0.0024, night: 0.0026 } },
  // an island in open sea: the horizon is far
  fortress: { fog: { day: 0.0018, dusk: 0.0022, night: 0.0026 } },
  prison: { fog: { day: 0.0024, dusk: 0.0026, night: 0.003 } },
  // snow country: a thicker winter haze (it was linear, 20-230 m)
  frostline: { fog: { day: 0.0042, dusk: 0.004, night: 0.0045 }, day: 'frost-day' },
};
const __SKY = {
  core: { ...Ku }, // the core's own table entries (restored on the maps this mod leaves alone)
  variants: new Map(),
  pic: null, // { url, tex (cube), rt }
  env: null, // { url, tex (PMREM), rt }
  loading: {},
  failed: new Set(),
  subs: new Set(),
  rev: 0,
  fog: null,
  bgColor: null,
  rot: 0,
  active: null,
  flDay: null,
};
const __skyDeg = Math.PI / 180;
const __skyAz = (v) => Math.atan2(v[2], v[0]);
// the configuration for a map and time of day, or null (the core's own sky)
function __skyCfg(mapId, tod, quality) {
  const M = __SKY_MAPS[mapId];
  if (!M || !__SKY_SETS[tod]) return null;
  const name = (tod === 'day' && M.day) || tod,
    S = __SKY_SETS[name],
    core = __SKY.core[tod],
    small = quality === 'low' || __LOWMEM,
    // the light: the core's bearing, the HDRI sun's height (not under minEl)
    azT = __skyAz(core.sun),
    el = Math.max(Math.asin(S.sun[1]), S.minEl * __skyDeg);
  return {
    mapId,
    key: mapId + '|' + tod + '|' + (small ? 's' : 'b') + '|' + (quality === 'low' ? 0 : 1),
    name,
    S,
    tod,
    density: M.fog[tod],
    picUrl: S.pic ? __SKY_BASE + S.pic + (small ? '-2k' : '') + '.webp' : null,
    envUrl: quality !== 'low' && !__SKY.failed.has(__SKY_BASE + S.env + '-env.hdr') ? __SKY_BASE + S.env + '-env.hdr' : null,
    light: [Math.cos(azT) * Math.cos(el), Math.sin(el), Math.sin(azT) * Math.cos(el)],
    // the sky turned so its sun sits at that bearing (three.js: a rotation y = a moves bearings by -a)
    rot: __skyAz(S.sun) - azT,
  };
}
// the core's table entry for the map: same object while nothing changes (the core's sun memoises on it)
function __skyVariant(cfg, mine) {
  const k = cfg.key + (mine ? '|env' : '');
  let v = __SKY.variants.get(k);
  if (!v) {
    const base = __SKY.core[cfg.tod];
    v = { ...base, sun: cfg.light, sunColor: cfg.S.sunColor || base.sunColor, hemiI: mine ? cfg.S.hemi : base.hemiI, env: mine ? cfg.S.envI : base.env };
    __SKY.variants.set(k, v);
  }
  return v;
}
function __skyBump() {
  __SKY.rev++;
  for (const f of __SKY.subs) f(__SKY.rev);
}
// ---------------------------------------------------------------- loading (one picture and one lighting map at a time)
function __skyFree(e) {
  e && setTimeout(() => e.rt.dispose(), 1500); // (after the frame that stops using it)
}
function __skyLoadPic(gl, url) {
  if (!url || (__SKY.pic && __SKY.pic.url === url && __SKY.pic.gl === gl) || __SKY.loading.pic === url) return;
  __SKY.loading.pic = url;
  new jd().load(
    url,
    (t) => {
      if (__SKY.loading.pic !== url) return t.dispose();
      __SKY.loading.pic = null;
      t.mapping = 303;
      t.colorSpace = 'srgb';
      t.generateMipmaps = !1;
      t.minFilter = wi;
      t.magFilter = wi;
      // to a cube (what three.js would make of it anyway), then the picture is let go: 1024 px faces for the
      // 4096 picture (as sharp as the picture), 8-bit sRGB (precise in the dark night sky)
      const rt = new Z6(Math.max(256, t.image.height / 2));
      try {
        rt.fromEquirectangularTexture(gl, t);
      } catch (e) {
        console.warn('[sky] picture', e);
        rt.dispose();
        t.dispose();
        return;
      }
      t.dispose();
      t.image = null;
      const old = __SKY.pic;
      __SKY.pic = { url, gl, rt, tex: rt.texture };
      __skyFree(old);
      __skyBump();
    },
    void 0,
    (e) => {
      __SKY.loading.pic === url && (__SKY.loading.pic = null);
      console.warn('[sky] picture', url, e);
    },
  );
}
function __skyLoadEnv(gl, url) {
  if (!url || (__SKY.env && __SKY.env.url === url && __SKY.env.gl === gl) || __SKY.loading.env === url) return;
  __SKY.loading.env = url;
  new XwA().load(
    url,
    (t) => {
      if (__SKY.loading.env !== url) return t.dispose();
      __SKY.loading.env = null;
      t.mapping = 303;
      let rt;
      try {
        // prefiltered once (roughness levels), then the HDR is let go
        const pm = new e9(gl);
        rt = pm.fromEquirectangular(t);
        pm.dispose();
      } catch (e) {
        console.warn('[sky] lighting', e);
        __SKY.failed.add(url);
        t.dispose();
        return __skyBump();
      }
      t.dispose();
      const old = __SKY.env;
      __SKY.env = { url, gl, rt, tex: rt.texture };
      __skyFree(old);
      __skyBump();
    },
    void 0,
    (e) => {
      __SKY.loading.env === url && (__SKY.loading.env = null);
      __SKY.failed.add(url); // the core's lighting stays
      console.warn('[sky] lighting', url, e);
      __skyBump();
    },
  );
}
// ---------------------------------------------------------------- the other map mods' skies
// Their per-frame code sets scene.background to their own sky picture whenever it differs: they are given none
// (Ridgeback, Blackwater, Fortress) or, on Frostline, the picture shown here (its own by day). Their saved
// "background before" is cleared when it is one of ours, so leaving a map never puts back a freed sky.
const __SKY_PIX = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
typeof __PR_KITS < 'u' && __PR_KITS.prison && (__PR_KITS.prison.sky = [__SKY_PIX, __SKY_PIX]);
typeof __PR_KITS < 'u' && __PR_KITS.fortress && (__PR_KITS.fortress.sky = [__SKY_PIX, __SKY_PIX]);
const __skyMine = (t) => !!t && ((__SKY.pic && t === __SKY.pic.tex) || t === __SKY.bgColor);
function __skyQuietMaps(cfg, bg) {
  if (typeof __RB < 'u') {
    __RB.sky = null;
    __skyMine(__RB.bgPrev) && (__RB.bgPrev = void 0);
  }
  if (typeof __PR < 'u' && __PR.kit !== 'cinema') {
    __PR.sky && __PR.sky !== bg && __PR.sky.image && __PR.sky.image.width <= 1 && __PR.sky.dispose();
    __PR.sky = __PR.skyDusk = null;
    __skyMine(__PR.bg) && (__PR.bg = void 0);
  }
  if (typeof __FL < 'u') {
    __FL.sky && !__skyMine(__FL.sky) && (__SKY.flDay = __FL.sky);
    // on Frostline at dusk: our picture (their code sets it by day and dusk, never at night); otherwise its own
    cfg && cfg.mapId === 'frostline' && cfg.tod === 'dusk' && bg && bg !== __SKY.bgColor ? (__FL.sky = bg) : __SKY.flDay && (__FL.sky = __SKY.flDay);
    __skyMine(__FL.bg) && (__FL.bg = void 0);
  }
}
// Ridgeback's distant mountains are unlit pictures (their light and haze painted in for a day sky): darkened
// and tinted to the time of day so they do not glow at dusk and night
const __SKY_BACKDROP = { day: [1, 1, 1], dusk: [0.82, 0.68, 0.6], night: [0.13, 0.15, 0.21] };
function __skyBackdrop(tod) {
  const g = typeof __RB < 'u' && __RB.view && __RB.view.group;
  if (!g) return;
  const c = __SKY_BACKDROP[tod] || __SKY_BACKDROP.day;
  g.traverse((o) => {
    if (!o.isMesh || o.renderOrder !== -1 || !o.material || !o.material.isMeshBasicMaterial || o.material.fog) return;
    o.material.color.setRGB(c[0], c[1], c[2]);
  });
}
// ---------------------------------------------------------------- the sky, the lighting and the haze
function __SkyView({ cfg, mine }) {
  const scene = gI((s) => s.scene),
    gl = gI((s) => s.gl);
  S.useEffect(() => {
    __skyLoadPic(gl, cfg.picUrl);
    __skyLoadEnv(gl, cfg.envUrl);
  }, [gl, cfg.picUrl, cfg.envUrl]);
  // leaving the outdoor maps (or the canvas): the core's sky comes back (its elements remount); ours is freed
  S.useEffect(
    () => () => {
      __skyMine(scene.background) && (scene.background = null);
      scene.fog === __SKY.fog && (scene.fog = null);
      __SKY.env && scene.environment === __SKY.env.tex && (scene.environment = null);
      scene.backgroundRotation.set(0, 0, 0);
      scene.environmentRotation.set(0, 0, 0);
      scene.backgroundIntensity = 1;
      typeof window < 'u' && window.__vmScene && window.__vmScene.environmentRotation.set(0, 0, 0);
      typeof __FL < 'u' && __SKY.flDay && (__FL.sky = __SKY.flDay);
      __SKY.active = null;
      // freed a moment later, unless the next map wants them again
      setTimeout(() => {
        if (__SKY.active) return;
        __skyFree(__SKY.pic);
        __skyFree(__SKY.env);
        __SKY.pic = __SKY.env = null;
        __SKY.loading = {};
      }, 3000);
    },
    [scene],
  );
  QI(() => {
    const S0 = cfg.S;
    __SKY.active = cfg;
    // the picture: ours, Frostline's own by day, or a plain colour while it loads
    let bg = null;
    // (a change of picture keeps the last one up until the new one is ready)
    if (cfg.picUrl) bg = __SKY.pic && (__SKY.pic.url === cfg.picUrl || __SKY.loading.pic === cfg.picUrl) ? __SKY.pic.tex : null;
    else bg = __SKY.flDay || (typeof __FL < 'u' && __FL.sky) || null;
    const fog = __SKY.fog || (__SKY.fog = new gd('#ffffff', 0.002)),
      h = S0.horizon;
    S0.fogHex ? fog.color.set(S0.fogHex) : fog.color.setRGB(h[0] * S0.fogK, h[1] * S0.fogK, h[2] * S0.fogK);
    fog.density = cfg.density;
    if (!bg) {
      bg = __SKY.bgColor || (__SKY.bgColor = new UA());
      bg.copy(fog.color);
    }
    scene.background !== bg && (scene.background = bg);
    scene.backgroundIntensity = S0.white;
    scene.backgroundRotation.set(0, cfg.rot, 0);
    scene.fog !== fog && (scene.fog = fog);
    // the lighting map (the core's stays until ours is ready)
    if (mine && __SKY.env) {
      scene.environment !== __SKY.env.tex && (scene.environment = __SKY.env.tex);
      scene.environmentIntensity = S0.envI;
      scene.environmentRotation.set(0, cfg.rot, 0);
      // the first-person view borrows the scene's environment (the core copies it each frame), not its rotation
      typeof window < 'u' && window.__vmScene && window.__vmScene.environmentRotation.set(0, cfg.rot, 0);
    } else {
      scene.environmentRotation.set(0, 0, 0);
      typeof window < 'u' && window.__vmScene && window.__vmScene.environmentRotation.set(0, 0, 0);
    }
    __skyQuietMaps(cfg, bg);
    if ((__SKY.n = (__SKY.n || 0) + 1) % 60 === 1) __skyBackdrop(cfg.tod);
  });
  return null;
}
// ---------------------------------------------------------------- the core's sun component, wrapped
{
  const coreTiA = TiA;
  TiA = function (p) {
    const tod = p.tod,
      quality = Zw((s) => s.quality),
      [, setRev] = S.useState(__SKY.rev);
    S.useEffect(() => {
      __SKY.subs.add(setRev);
      return () => __SKY.subs.delete(setRev);
    }, []);
    let m = null;
    try {
      m = aw();
    } catch (e) {}
    const cfg = m ? __skyCfg(m.id, tod, quality) : null,
      // our lighting replaces the core's only once it is ready (no frames without any)
      mine = !!(cfg && cfg.envUrl && __SKY.env && __SKY.env.url === cfg.envUrl);
    Ku[tod] = cfg ? __skyVariant(cfg, mine) : __SKY.core[tod];
    const el = coreTiA.apply(this, arguments);
    if (!el || !el.props) return el;
    // the same number of slots either way (no remounting of the sun when the sky changes)
    const kids = [].concat(el.props.children).map((c) =>
      cfg && c && typeof c === 'object' && (c.type === 'color' || c.type === 'fog' || c.type === k_ || c.type === L_ || (mine && c.type === Ed)) ? null : c,
    );
    kids.push(cfg ? M.jsx(__SkyView, { cfg, mine }) : null);
    return M.jsxs(M.Fragment, { children: kids });
  };
}
// dev probe: what is on, and where the sun light and the picture's sun point
typeof window < 'u' &&
  (window.__bpSky = () => {
    const c = __SKY.active;
    if (!c) return { active: !1 };
    const a = __skyAz(c.S.sun) - c.rot;
    return {
      active: !0,
      set: c.name,
      pic: __SKY.pic && __SKY.pic.url,
      env: __SKY.env && __SKY.env.url,
      lightDir: c.light.map((v) => +v.toFixed(3)),
      skySunDir: [Math.cos(a) * Math.cos(Math.asin(c.S.sun[1])), c.S.sun[1], Math.sin(a) * Math.cos(Math.asin(c.S.sun[1]))].map((v) => +v.toFixed(3)),
      rotDeg: +(c.rot / __skyDeg).toFixed(2),
      fogDensity: c.density,
    };
  });
