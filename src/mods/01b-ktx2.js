/* ===== Bayou Protocol mod: the phone set of models (GPU-compressed textures) ===== */
// tools/build-ktx2.mjs gives every shipped model with textures a copy beside it, `<name>.k2.glb`, whose
// textures are GPU-compressed (KTX2 / Basis Universal): colour textures up to 1024 px, the others up to 512 px.
// On phones and tablets (__PHONE, 00c-mobile-memory.js) every model is loaded from that copy when there is one
// (public/game/ktx2.json lists them):
//   - its textures are transcoded in a worker straight into what the graphics chip reads (ASTC on iPhones, ETC2
//     or ASTC on Android): no image decode, no scaling down on the main thread, no 2D canvas, while a map loads
//   - they take a quarter of the memory per pixel, so phones get twice the detail they had (512 / 256 px,
//     scaled down on the device) in the same memory
// ?ktx2=0 / ?ktx2=1 (remembered) turns it off on a phone, or on elsewhere (for testing).
const __K2 = { on: !1, list: null, tex: null, ready: null, loader: null, cfg: null, n: 0, nt: 0, err: null };
if (typeof window < 'u' && typeof document < 'u') {
  let want = typeof __PHONE < 'u' && !!__PHONE;
  try {
    const q = /[?&]ktx2=(0|1)\b/.exec(location.search);
    q && localStorage.setItem('bp-ktx2', q[1]);
    const f = localStorage.getItem('bp-ktx2');
    f === '0' && (want = !1);
    f === '1' && (want = !0);
  } catch {}
  // which compressed formats this device's graphics chip reads (asked of a throwaway context: the models start
  // loading before the game's renderer exists)
  if (want)
    try {
      const c = document.createElement('canvas').getContext('webgl2'),
        has = (n) => !!(c && c.getExtension(n));
      __K2.cfg = {
        astcSupported: has('WEBGL_compressed_texture_astc'),
        astcHDRSupported: !1,
        etc1Supported: has('WEBGL_compressed_texture_etc1'),
        etc2Supported: has('WEBGL_compressed_texture_etc'),
        dxtSupported: has('WEBGL_compressed_texture_s3tc'),
        bptcSupported: has('EXT_texture_compression_bptc'),
        pvrtcSupported: has('WEBGL_compressed_texture_pvrtc') || has('WEBKIT_WEBGL_compressed_texture_pvrtc'),
      };
      const lc = c && c.getExtension('WEBGL_lose_context');
      lc && lc.loseContext();
    } catch (e) {
      __K2.err = String(e);
    }
  const C = __K2.cfg;
  __K2.on = !!(want && C && (C.astcSupported || C.etc2Supported || C.dxtSupported || C.bptcSupported));
  if (__K2.on)
    __K2.ready = fetch('./game/ktx2.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => ((__K2.tex = (j && j.tex) || {}), (__K2.list = new Set(((j && j.models) || []).map((m) => 'game/' + m)))))
      .catch(() => (__K2.list = new Set()));
}
// the transcoder (one, shared by every model loader; two workers)
function __k2Loader() {
  if (__K2.loader) return __K2.loader;
  const K = globalThis.__BP_KTX2;
  if (!K) return null;
  const L = new K();
  L.setTranscoderPath('./game/basis/');
  L.setWorkerLimit(2);
  L.workerConfig = { ...__K2.cfg };
  return (__K2.loader = L);
}
if (__K2.on && typeof nu < 'u') {
  // a model with a phone copy is loaded from it (once the list is in: a moment at start)
  const coreLoad = nu.prototype.load;
  nu.prototype.load = function (u, onLoad, onProgress, onError) {
    const go = () => {
      let url = u;
      try {
        const k = String(u).split('?')[0].replace(/^.*?(?=game\/)/, '');
        __K2.list && __K2.list.has(k) && ((url = String(u).replace(/\.glb(?=\?|$)/, '.k2.glb')), __K2.n++);
      } catch {}
      return coreLoad.call(this, url, onLoad, onProgress, onError);
    };
    if (__K2.list) return go();
    __K2.ready.then(go, go);
  };
  // every model loader can read KHR_texture_basisu
  const coreParse = nu.prototype.parse;
  nu.prototype.parse = function () {
    try {
      this.ktx2Loader || this.setKTX2Loader(__k2Loader());
    } catch (e) {
      __K2.err = String(e);
    }
    return coreParse.apply(this, arguments);
  };
}
typeof window < 'u' && (window.__bpKtx2 = () => ({ on: __K2.on, models: __K2.list ? __K2.list.size : null, loaded: __K2.n, textures: __K2.nt, formats: __K2.cfg, err: __K2.err }));
