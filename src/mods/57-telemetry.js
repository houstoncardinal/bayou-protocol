/* ===== Bayou Protocol mod: production error and performance reports (off unless configured) ===== */
// Set VITE_REPORT_URL when building (Netlify: Site configuration > Environment variables) to an endpoint
// that accepts a JSON POST (your own serverless function, or a log service's HTTP intake). Then:
//   - errors: uncaught exceptions and promise rejections, at most 20 a session, each message once
//   - performance: when the tab is hidden or closed, one summary of the session's play: frames per second
//     (average and the slowest 1 %), long stalls, quality, resolution scale, graphics card, browser, the map
// Nothing personal is sent: no name, no account, no IP handling here (your endpoint sees the request as any
// server would). Without VITE_REPORT_URL this file does nothing but count frames for the summary.
const __REP = {
  // VITE_REPORT_URL if set; otherwise the online hub's /report (server/reports-core.mjs), but only on the
  // published site: local and LAN testing never reports
  url:
    import.meta.env.VITE_REPORT_URL ||
    (typeof location < 'u' && typeof __BAYOU_NET__ < 'u' && __BAYOU_NET__ && !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/.test(location.hostname) && /^https:$/.test(location.protocol)
      ? String(__BAYOU_NET__).replace(/^ws/, 'http').replace(/\/+$/, '') + '/report'
      : ''),
  sent: 0,
  seen: new Set(),
  f: { n: 0, sum: 0, slow: 0, worst: 0, hist: new Uint32Array(64) }, // frame times, 2 ms buckets
  stalls: 0,
  map: '',
};
function __repSend(kind, body) {
  if (!__REP.url || typeof navigator === 'undefined') return;
  const data = JSON.stringify({ kind, t: Date.now(), v: 1, ...body });
  try {
    // (as plain text: a beacon or fetch to another site with a JSON content type would need a preflight that
    // beacons can't make; the hub parses the text as JSON)
    navigator.sendBeacon ? navigator.sendBeacon(__REP.url, new Blob([data], { type: 'text/plain' })) : fetch(__REP.url, { method: 'POST', body: data, keepalive: !0, headers: { 'content-type': 'text/plain' } });
  } catch (e) {}
}
function __repGpu() {
  try {
    const g = typeof __R3F < 'u' && __R3F && __R3F.gl.getContext(),
      x = g && g.getExtension('WEBGL_debug_renderer_info');
    return x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)).slice(0, 120) : '';
  } catch (e) {
    return '';
  }
}
if (typeof window !== 'undefined') {
  const err = (msg, stack) => {
    if (!__REP.url || __REP.sent >= 20) return;
    const key = String(msg).slice(0, 200);
    if (__REP.seen.has(key)) return;
    __REP.seen.add(key);
    __REP.sent++;
    __repSend('error', { msg: key, stack: String(stack || '').slice(0, 1500), map: __REP.map, ua: navigator.userAgent.slice(0, 160) });
  };
  window.addEventListener('error', (e) => err(e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) => err('unhandled: ' + ((e.reason && e.reason.message) || e.reason), e.reason && e.reason.stack));
  // frame times while a match is being played (menus run at 30 fps on purpose and are left out)
  let last = 0;
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = last ? now - last : 0;
    last = now;
    const z = Zw.getState();
    if (!dt || dt > 1000 || z.screen !== 'playing' || eA.paused || document.hidden) return;
    const F = __REP.f;
    F.n++;
    F.sum += dt;
    F.worst = Math.max(F.worst, dt);
    F.hist[Math.min(63, Math.floor(dt / 2))]++;
    dt > 50 && __REP.stalls++;
    try {
      __REP.map = aw().id;
    } catch (e) {}
  };
  requestAnimationFrame(tick);
  const summary = () => {
    const F = __REP.f;
    if (!__REP.url || F.n < 300) return;
    // the frame time below which 99 % of frames fell
    let acc = 0,
      p99 = 0;
    for (let i = 0; i < 64; i++) if ((acc += F.hist[i]) >= F.n * 0.99) { p99 = (i + 1) * 2; break; }
    const z = Zw.getState();
    __repSend('perf', {
      frames: F.n,
      fps: +(1000 / (F.sum / F.n)).toFixed(1),
      p99ms: p99,
      worstMs: Math.round(F.worst),
      stalls: __REP.stalls,
      quality: z.quality,
      dpr: (typeof __R3F < 'u' && __R3F && +__R3F.gl.getPixelRatio().toFixed(2)) || 0,
      screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
      gpu: __repGpu(),
      map: __REP.map,
      ua: navigator.userAgent.slice(0, 160),
    });
    __REP.f = { n: 0, sum: 0, slow: 0, worst: 0, hist: new Uint32Array(64) };
    __REP.stalls = 0;
  };
  document.addEventListener('visibilitychange', () => document.hidden && summary());
  window.addEventListener('pagehide', summary);
}
