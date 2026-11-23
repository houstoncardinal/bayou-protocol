/* ===== Bayou Protocol mod: memory on phones and tablets ===== */
// Phones crashed: Safari on iOS gives a page roughly 1-1.5 GB before it kills it, reloads it, and after a few
// tries shows its error screen. Measured at a phone's size: the Home screen held 1.7 GB of textures (a bot match
// on Ridgeback ran behind the menus, with 3072 px terrain maps) and every map 0.5-0.7 GB even on Low (a
// 4096 x 2048 sky, 2048 px character and prop textures). On phones, tablets and low-memory devices:
//   - no match behind the menus (the Home screen is pictures)
//   - textures at most 512 px on phones, 1024 px on tablets: loaded images are scaled down once, before they
//     reach the GPU, and the full-size originals let go (that's the phone's memory as well as the GPU's)
//   - the GPU is said to take at most 2048 px, so anything else (canvases drawn in code) is scaled down on upload
//   - other maps aren't loaded in the background while you're in the menus (each mod checks __LOWMEM)
// Desktop is unchanged. localStorage['bp-lowmem'] = '1' / '0' forces it on or off (for testing).
// a crash last time (the page reloaded in the middle of a match, without leaving it): the lightest settings this
// time, whatever the device (iOS reloads a tab that ran out of memory, then shows its error after a few tries)
const __CRASHES = (() => {
  if (typeof sessionStorage > 'u') return 0;
  try {
    const alive = +sessionStorage.getItem('bp-alive'),
      n = (+sessionStorage.getItem('bp-crashes') || 0) + (alive && Date.now() - alive < 60000 ? 1 : 0);
    sessionStorage.removeItem('bp-alive');
    n && sessionStorage.setItem('bp-crashes', String(n));
    return n;
  } catch {
    return 0;
  }
})();
const __LOWMEM = (() => {
  if (typeof window > 'u' || typeof navigator > 'u') return !1;
  if (__CRASHES) return !0;
  try {
    const f = localStorage.getItem('bp-lowmem');
    if (f === '1') return !0;
    if (f === '0') return !1;
  } catch {}
  try {
    const ua = navigator.userAgent || '',
      ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      android = /Android/i.test(ua),
      coarse = matchMedia('(pointer:coarse)').matches && !matchMedia('(pointer:fine)').matches,
      dm = navigator.deviceMemory || 0;
    return ios || android || coarse || (dm > 0 && dm <= 4);
  } catch {
    return !1;
  }
})();
// (phones: 512 px, which on a phone's screen still looks sharp; tablets and low-memory computers: 1024 px)
const __TEXCAP = (() => {
  if (!__LOWMEM) return 0;
  try {
    const f = +localStorage.getItem('bp-texcap');
    if (f >= 256) return f;
  } catch {}
  if (__CRASHES) return 256;
  const s = typeof screen < 'u' ? Math.min(screen.width, screen.height) : 800;
  return s < 600 ? 512 : 1024;
})();
typeof document < 'u' && __LOWMEM && document.documentElement.classList.add('bp-lowmem');
// ---------------------------------------------------------------- the phone profile
// Phones and tablets (touch, iOS, Android) draw with a mobile graphics chip: 5-10 times less than a laptop's, and
// built to draw the screen in small tiles kept on the chip, so every extra full-screen pass (an effect that reads
// and writes the whole picture) costs far more than on a desktop. With the profile on (src/mods/99d-phone.js):
// a sharper picture (drawn at up to twice the screen's points, held to the screen's rate by dynamic resolution),
// and the effects phones pay most for and show least off: the realism pass, SMAA, the softest shadow filtering.
// ?phone=classic (remembered) turns it off, ?phone=on back on: to compare on the same device.
const __PHONE = (() => {
  if (typeof window > 'u' || typeof navigator > 'u') return !1;
  try {
    const q = /[?&]phone=(classic|on)\b/.exec(location.search);
    q && localStorage.setItem('bp-phone', q[1]);
    if (localStorage.getItem('bp-phone') === 'classic') return !1;
  } catch {}
  try {
    const ua = navigator.userAgent || '',
      ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      android = /Android/i.test(ua),
      coarse = matchMedia('(pointer:coarse)').matches && !matchMedia('(pointer:fine)').matches;
    return ios || android || coarse;
  } catch {
    return !1;
  }
})();
typeof document < 'u' && __PHONE && document.documentElement.classList.add('bp-phone');
// ---------------------------------------------------------------- the GPU's size limit, as the renderer sees it
if (__LOWMEM && typeof window < 'u')
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C || !C.prototype || C.prototype.__bpCapped) continue;
    const get = C.prototype.getParameter;
    C.prototype.getParameter = function (p) {
      const v = get.call(this, p);
      // MAX_TEXTURE_SIZE, MAX_CUBE_MAP_TEXTURE_SIZE
      return (p === 0x0d33 || p === 0x851c) && typeof v === 'number' ? Math.min(v, 2048) : v;
    };
    C.prototype.__bpCapped = !0;
  }
// ---------------------------------------------------------------- loaded images scaled down before upload
const __TEXSMALL = new WeakMap();
function __texShrink(t) {
  const im = t.image;
  if (!im || t.isCompressedTexture || t.isDataTexture || t.isVideoTexture || t.isCanvasTexture || t.isDepthTexture) return;
  const isImg = typeof HTMLImageElement < 'u' && im instanceof HTMLImageElement,
    isBmp = typeof ImageBitmap < 'u' && im instanceof ImageBitmap;
  if (!isImg && !isBmp) return;
  const w = isImg ? im.naturalWidth : im.width,
    h = isImg ? im.naturalHeight : im.height;
  if (!w || !h || Math.max(w, h) <= __TEXCAP) return;
  let c = __TEXSMALL.get(im);
  if (!c) {
    const k = __TEXCAP / Math.max(w, h);
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k));
    c.height = Math.max(1, Math.round(h * k));
    c.__bpSmall = 1;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    try {
      x.drawImage(im, 0, 0, c.width, c.height);
    } catch {
      return;
    }
    __TEXSMALL.set(im, c);
    // the full-size bitmap's memory goes now (other textures sharing it get the same small copy)
    isBmp && im.close && im.close();
  }
  t.image = c;
}
if (__TEXCAP && typeof Fi < 'u') {
  const d = Object.getOwnPropertyDescriptor(Fi.prototype, 'needsUpdate');
  d &&
    d.set &&
    Object.defineProperty(Fi.prototype, 'needsUpdate', {
      configurable: !0,
      get: d.get,
      set(v) {
        if (v === !0)
          try {
            __texShrink(this);
          } catch {}
        d.set.call(this, v);
      },
    });
}
// ---------------------------------------------------------------- detail maps smaller still
// A realistic surface has three or four maps (colour, normal, roughness, ...); most of a map's textures are the
// detail ones. On phones they go to 256 px (tablets 512): checked just before a surface is first drawn, when it's
// known which job each texture does (textures shared with a colour slot are left at the colour size).
const __AUXCAP = __TEXCAP ? Math.max(256, __TEXCAP / 2) : 0;
function __texShrinkTo(t, cap) {
  if (!t || !t.isTexture || t.isCompressedTexture || t.isDataTexture || t.isVideoTexture || t.isCanvasTexture || t.__bpAuxDone) return;
  t.__bpAuxDone = 1;
  const im = t.image,
    isImg = typeof HTMLImageElement < 'u' && im instanceof HTMLImageElement,
    isBmp = typeof ImageBitmap < 'u' && im instanceof ImageBitmap,
    isOurs = typeof HTMLCanvasElement < 'u' && im instanceof HTMLCanvasElement && im.__bpSmall;
  if (!isImg && !isBmp && !isOurs) return;
  const w = isImg ? im.naturalWidth : im.width,
    h = isImg ? im.naturalHeight : im.height;
  if (!w || !h || Math.max(w, h) <= cap) return;
  const k = cap / Math.max(w, h),
    c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  c.__bpSmall = 1;
  const x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  try {
    x.drawImage(im, 0, 0, c.width, c.height);
  } catch {
    return;
  }
  t.image = c;
  t.needsUpdate = !0;
}
if (__AUXCAP && typeof Ow < 'u') {
  const AUX = ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'bumpMap', 'displacementMap', 'clearcoatNormalMap', 'specularIntensityMap'],
    COLOUR = ['map', 'emissiveMap', 'alphaMap'],
    prev = Ow.prototype.onBeforeRender;
  Ow.prototype.onBeforeRender = function (r, s, c, g, mat) {
    if (mat && !mat.__bpAux) {
      mat.__bpAux = 1;
      const colour = new Set(COLOUR.map((k) => mat[k]).filter(Boolean));
      for (const k of AUX) mat[k] && !colour.has(mat[k]) && __texShrinkTo(mat[k], __AUXCAP);
    }
    return prev.apply(this, arguments);
  };
}
// ---------------------------------------------------------------- downloaded model files let go once built
// (every device) The glTF loader kept each model's whole downloaded file (the .glb's binary chunk) and every
// buffer it had unpacked in its cache, for as long as the model stayed cached, i.e. for good: about a third of
// the game's memory in a match. Once a model is built, its geometry and textures hold their own data, so the
// parser's cache and the file are let go.
if (typeof E$ < 'u' && E$.prototype && E$.prototype.parse && !E$.prototype.__bpFree) {
  const coreParse = E$.prototype.parse;
  E$.prototype.parse = function (onLoad, onError) {
    const P = this;
    return coreParse.call(
      this,
      (gltf) => {
        onLoad(gltf);
        setTimeout(() => {
          try {
            P.cache && P.cache.removeAll();
            const bin = P.extensions && P.extensions.KHR_binary_glTF;
            bin && (bin.body = null);
            P.nodeCache = {};
          } catch {}
        }, 0);
      },
      onError,
    );
  };
  E$.prototype.__bpFree = !0;
}
// ---------------------------------------------------------------- no match behind the menus
if (__LOWMEM && typeof eA < 'u') {
  const coreStart = eA.start;
  eA.start = function (w, attract) {
    if (attract) {
      // (and whatever ran before goes, so its map can be freed)
      this.running && this.attract && this.stop();
      return;
    }
    return coreStart.apply(this, arguments);
  };
}
// the crash marker: set every few seconds while a match runs, cleared when the page is left normally
if (typeof window < 'u' && typeof sessionStorage < 'u') {
  setInterval(() => {
    try {
      eA.running && !eA.attract ? sessionStorage.setItem('bp-alive', String(Date.now())) : sessionStorage.removeItem('bp-alive');
    } catch {}
  }, 3000);
  const left = () => {
    try {
      sessionStorage.removeItem('bp-alive');
    } catch {}
  };
  window.addEventListener('pagehide', left);
  window.addEventListener('beforeunload', left);
  // after a crash: Low quality from the start
  __CRASHES &&
    setTimeout(() => {
      try {
        const z = Zw.getState();
        z.quality !== 'low' && z.setup({ quality: 'low' });
      } catch {}
    }, 0);
}
typeof window < 'u' && (window.__bpLowMem = () => ({ on: __LOWMEM, cap: __TEXCAP, aux: __AUXCAP, crashes: __CRASHES, phone: __PHONE }));

// Play offline / online: picking a mode moves on to the map step by itself on a desktop; on phones and narrow
// windows it stays, so the choice is seen (the mode list fills the screen there), and Next moves on
function __bpAutoStep() {
  try {
    return !(matchMedia('(max-width: 899px)').matches || matchMedia('(pointer: coarse)').matches);
  } catch {
    return !0;
  }
}
