/* ===== Bayou Protocol mod: measurements from test devices (dev server only) ===== */
// A phone or tablet opening the dev server on the LAN (http://<this machine>:5173) posts what it measures every
// 5 s to the dev server (vite.config.js: bayouDevlog -> .data/devlog.jsonl): frame times, resolution, graphics
// chip, what it supports, draw calls, texture memory, errors. On touch devices a small readout shows the same at
// the top of the screen (?hud=0 hides it). None of this is in a published build (import.meta.env.DEV).
if (import.meta.env.DEV && typeof window < 'u') {
  const D = {
    id: Math.random().toString(36).slice(2, 8),
    ft: [],
    last: 0,
    gpu: '',
    caps: null,
    errs: 0,
    hud: null,
  };
  const post = (kind, body) => {
    try {
      fetch('/__bp_devlog', { method: 'POST', body: JSON.stringify({ kind, id: D.id, t: Math.round(performance.now()), ...body }), keepalive: !0 });
    } catch (e) {}
  };
  const store = () => {
    const g = typeof __R3F < 'u' && __R3F;
    return g && (g.get ? g.get() : g);
  };
  const caps = (gl) => {
    if (D.caps) return D.caps;
    try {
      const c = gl.getContext(),
        x = c.getExtension('WEBGL_debug_renderer_info');
      D.gpu = x ? String(c.getParameter(x.UNMASKED_RENDERER_WEBGL)) : String(c.getParameter(c.RENDERER));
      D.caps = {
        webgl2: typeof WebGL2RenderingContext < 'u' && c instanceof WebGL2RenderingContext,
        maxTex: c.getParameter(c.MAX_TEXTURE_SIZE),
        astc: !!c.getExtension('WEBGL_compressed_texture_astc'),
        etc: !!c.getExtension('WEBGL_compressed_texture_etc'),
        etc1: !!c.getExtension('WEBGL_compressed_texture_etc1'),
        s3tc: !!c.getExtension('WEBGL_compressed_texture_s3tc'),
        bptc: !!c.getExtension('EXT_texture_compression_bptc'),
        pvrtc: !!c.getExtension('WEBGL_compressed_texture_pvrtc'),
        floatRT: !!c.getExtension('EXT_color_buffer_float'),
        halfRT: !!c.getExtension('EXT_color_buffer_half_float'),
        parallel: !!c.getExtension('KHR_parallel_shader_compile'),
      };
    } catch (e) {
      D.caps = { err: String(e) };
    }
    return D.caps;
  };
  // texture memory as uploaded (uncompressed: 4 bytes a pixel, a third more with mipmaps)
  const texMem = (sc) => {
    const seen = new Set();
    let bytes = 0,
      n = 0,
      big = 0;
    sc.traverse((o) => {
      const ms = o.material;
      if (!ms) return;
      for (const m of Array.isArray(ms) ? ms : [ms])
        if (m)
          for (const k in m) {
            const t = m[k];
            if (!t || !t.isTexture || seen.has(t)) continue;
            seen.add(t);
            const im = t.image,
              w = (im && (im.naturalWidth || im.videoWidth || im.width)) || 0,
              h = (im && (im.naturalHeight || im.videoHeight || im.height)) || 0;
            if (!w || !h) continue;
            n++;
            Math.max(w, h) >= 1024 && big++;
            bytes += t.isCompressedTexture ? w * h : w * h * 4 * (t.generateMipmaps !== !1 ? 1.33 : 1);
          }
    });
    return { textures: n, big1k: big, mb: Math.round(bytes / 1048576) };
  };
  const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
  const tick = (now) => {
    requestAnimationFrame(tick);
    if (D.last) {
      const dt = now - D.last;
      dt < 1000 && D.ft.push(dt);
    }
    D.last = now;
  };
  requestAnimationFrame(tick);
  let n = 0;
  setInterval(() => {
    try {
      const st = store(),
        z = typeof Zw < 'u' ? Zw.getState() : {},
        a = D.ft.slice().sort((x, y) => x - y);
      D.ft.length = 0;
      if (!st || document.hidden) return;
      const gl = st.gl,
        info = gl.info,
        sz = gl.getDrawingBufferSize(new aA()),
        sc = typeof __SMOOTH < 'u' && __SMOOTH.scene,
        dyn = eA.__dyn,
        frame = typeof __FRAME < 'u' ? __FRAME : null,
        body = {
          screen: z.screen,
          quality: z.quality,
          map: eA.state && !eA.attract ? (aw() || {}).id : null,
          phase: eA.state && eA.state.phase,
          fps: a.length ? Math.round(1000 / (a.reduce((x, y) => x + y, 0) / a.length)) : 0,
          p50: a.length ? +pct(a, 0.5).toFixed(1) : 0,
          p95: a.length ? +pct(a, 0.95).toFixed(1) : 0,
          p99: a.length ? +pct(a, 0.99).toFixed(1) : 0,
          max: a.length ? Math.round(a[a.length - 1]) : 0,
          over33: a.filter((x) => x > 34).length,
          over50: a.filter((x) => x > 50).length,
          frames: a.length,
          buf: [sz.x, sz.y],
          css: [innerWidth, innerHeight],
          dpr: devicePixelRatio,
          pr: +gl.getPixelRatio().toFixed(2),
          dyn: dyn ? +(+dyn.dpr || 0).toFixed(2) : null,
          gov: window.__bpGovernor ? window.__bpGovernor() : null,
          calls: frame ? frame.calls : info.render.calls,
          tris: frame ? frame.triangles : info.render.triangles,
          programs: info.programs ? info.programs.length : 0,
          gpuTex: info.memory.textures,
          gpuGeo: info.memory.geometries,
          lowmem: window.__bpLowMem ? window.__bpLowMem() : null,
          heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        };
      // shader programs created since the last report, by kind (output colour space, lights) and loading state
      const seen = D.progSeen || (D.progSeen = new Set()),
        fresh = {};
      for (const P of info.programs || [])
        if (!seen.has(P.id)) {
          seen.add(P.id);
          const f = String(P.cacheKey).split(','),
            L = window.__bpLoading ? window.__bpLoading() : null,
            k = [f[4], 'L' + f.slice(30, 48).join('.'), L ? L.state + (L.compiling ? '+C' : '') : '-'].join('|');
          fresh[k] = (fresh[k] || 0) + 1;
        }
      Object.keys(fresh).length && (body.newPrograms = fresh);
      body.loading = window.__bpLoading ? window.__bpLoading() : null;
      body.cpu = window.__bpCpu ? window.__bpCpu() : null;
      if (n++ % 6 === 0) {
        body.gpu = D.gpu || (caps(gl), D.gpu);
        body.caps = caps(gl);
        body.ua = navigator.userAgent;
        sc && (body.tex = texMem(sc));
      }
      post('perf', body);
      if (D.hud)
        D.hud.textContent = `${body.fps} fps  p95 ${body.p95}  ${body.buf[0]}x${body.buf[1]}  ${body.quality}  ${body.calls} calls`;
    } catch (e) {
      post('devlog-error', { msg: String(e && e.stack).slice(0, 600) });
    }
  }, 5000);
  const err = (msg, stack) => D.errs++ < 30 && post('error', { msg: String(msg).slice(0, 300), stack: String(stack || '').slice(0, 1200) });
  window.addEventListener('error', (e) => err(e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) => err('unhandled: ' + ((e.reason && e.reason.message) || e.reason), e.reason && e.reason.stack));
  // the readout, on touch devices
  const touch = matchMedia('(pointer:coarse)').matches;
  if (touch && !/[?&]hud=0/.test(location.search)) {
    const add = () => {
      const h = document.createElement('div');
      h.style.cssText = 'position:fixed;top:2px;left:50%;transform:translateX(-50%);z-index:99999;font:11px/1.3 ui-monospace,monospace;color:#9f9;background:rgba(0,0,0,.55);padding:2px 6px;border-radius:4px;pointer-events:none;white-space:nowrap';
      h.textContent = 'measuring…';
      document.body.appendChild(h);
      D.hud = h;
    };
    document.body ? add() : addEventListener('DOMContentLoaded', add);
  }
  // the shader census: every program in use, recompiled one at a time in a fresh context and timed (each waited
  // for). On a test device, ?census=1 runs it once a match is live and posts the result.
  window.__bpShaderCensus = () => {
    const st = store();
    if (!st) return null;
    const progs = st.gl.info.programs || [],
      src = st.gl.getContext(),
      c = document.createElement('canvas').getContext('webgl2');
    if (!c) return { err: 'no webgl2' };
    const out = [];
    let total = 0;
    // (on a phone only the 20 largest: each can take a second there)
    const touch = matchMedia('(pointer:coarse)').matches,
      size = (P) => {
        try {
          return (src.getAttachedShaders(P.program) || []).reduce((a, x) => a + (src.getShaderSource(x) || '').length, 0);
        } catch (e) {
          return 0;
        }
      },
      list = touch ? progs.slice().sort((a, b) => size(b) - size(a)).slice(0, 20) : progs;
    for (const P of list) {
      try {
        const sh = src.getAttachedShaders(P.program) || [];
        const vs = sh.map((x) => src.getShaderParameter(x, src.SHADER_TYPE) === src.VERTEX_SHADER && src.getShaderSource(x)).find(Boolean),
          fs = sh.map((x) => src.getShaderParameter(x, src.SHADER_TYPE) === src.FRAGMENT_SHADER && src.getShaderSource(x)).find(Boolean);
        if (!vs || !fs) continue;
        const t0 = performance.now(),
          v = c.createShader(c.VERTEX_SHADER),
          f = c.createShader(c.FRAGMENT_SHADER),
          pr = c.createProgram();
        c.shaderSource(v, vs);
        c.compileShader(v);
        c.shaderSource(f, fs);
        c.compileShader(f);
        c.attachShader(pr, v);
        c.attachShader(pr, f);
        c.linkProgram(pr);
        c.getProgramParameter(pr, c.LINK_STATUS);
        const ms = performance.now() - t0;
        total += ms;
        const defs = (fs.match(/#define [A-Z_]+/g) || []).length;
        out.push({ name: P.name, ms: +ms.toFixed(1), fsKB: +(fs.length / 1024).toFixed(1), vsKB: +(vs.length / 1024).toFixed(1), defs, key: String(P.cacheKey).slice(0, 120) });
        c.deleteProgram(pr);
        c.deleteShader(v);
        c.deleteShader(f);
      } catch (e) {}
    }
    out.sort((a, b) => b.ms - a.ms);
    const byName = {};
    for (const o of out) {
      const k = o.name || '?';
      (byName[k] || (byName[k] = { n: 0, ms: 0 })).n++;
      byName[k].ms += o.ms;
    }
    return { programs: progs.length, timed: out.length, totalMs: Math.round(total), byName, slowest: out.slice(0, 15) };
  };
  if (/[?&]census=1/.test(location.search)) {
    const iv = setInterval(() => {
      if (!eA.state || eA.attract || eA.state.phase !== 'live' || (typeof __LD < 'u' && __LD.state === 'loading')) return;
      clearInterval(iv);
      setTimeout(() => post('census', window.__bpShaderCensus()), 3000);
    }, 1000);
  }
  window.__bpProgListRaw = () => {
    const st = store();
    return st ? (st.gl.info.programs || []).map((P) => ({ program: P.program, cacheKey: String(P.cacheKey), name: P.name })) : [];
  };
  window.__bpRendererObj = () => {
    const st = store();
    return st ? st.gl : null;
  };
  // draw-call census: every draw over n frames, by pass (main / shadow / first-person / other) and by what is
  // drawn (the top-level group under the scene and the kind of object), averaged per frame
  window.__bpDrawCensus = (frames = 30) =>
    new Promise((res) => {
      const st = store();
      if (!st) return res(null);
      const gl = st.gl,
        orig = gl.renderBufferDirect,
        vm = window.__vmScene,
        world = typeof __SMOOTH < 'u' ? __SMOOTH.scene : null,
        out = new Map();
      let cur = null,
        n = 0;
      const R = gl.render;
      gl.render = function (sc) {
        const prev = cur;
        cur = sc === world ? 'main' : sc === vm ? 'firstPerson' : 'other:' + ((sc && (sc.name || sc.type)) || '?');
        try {
          return R.apply(this, arguments);
        } finally {
          cur = prev;
        }
      };
      const top = (o) => {
        let t = o;
        while (t.parent && t.parent.parent) t = t.parent;
        return (t.name || t.type || '?').slice(0, 28);
      };
      gl.renderBufferDirect = function (cam, scene, geo, mat, obj) {
        const pass = scene === null ? (cur === 'main' ? 'shadow' : 'shadow:' + cur) : cur || '?',
          kind = obj.isSkinnedMesh ? 'skinned' : obj.isInstancedMesh ? 'instanced' : obj.isSprite ? 'sprite' : obj.isPoints ? 'points' : obj.isLine ? 'line' : 'mesh',
          k = pass + ' | ' + top(obj) + ' | ' + kind;
        out.set(k, (out.get(k) || 0) + 1);
        return orig.apply(this, arguments);
      };
      const tick = () => {
        if (++n < frames) return requestAnimationFrame(tick);
        gl.renderBufferDirect = orig;
        gl.render = R;
        const rows = [...out].map(([k, v]) => [k, +(v / frames).toFixed(1)]).sort((a, b) => b[1] - a[1]),
          byPass = {};
        for (const [k, v] of rows) {
          const p = k.split(' | ')[0];
          byPass[p] = +((byPass[p] || 0) + v).toFixed(1);
        }
        res({ perFrame: +rows.reduce((a, r) => a + r[1], 0).toFixed(1), byPass, top: rows.slice(0, 30) });
      };
      requestAnimationFrame(tick);
    });
  window.__bpScene = () => (typeof __SMOOTH < 'u' ? __SMOOTH.scene : null);
  post('hello', { ua: navigator.userAgent, dpr: devicePixelRatio, css: [innerWidth, innerHeight], screen: [screen.width, screen.height] });
}
