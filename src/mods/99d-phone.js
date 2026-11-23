/* ===== Bayou Protocol mod: the phone profile (phones and tablets: __PHONE, 00c-mobile-memory.js) ===== */
// What a phone draws, chosen for a mobile graphics chip (the realism pass and the lighter shadow filter are set in
// 97-realism.js and 90-shadows.js, as their shaders are built):
//   - resolution: up to 2 x the screen's points (it was 1.25 x on a 3 x screen: blurry), at most about 1.15
//     million pixels a frame (Low: 1.6 x, 0.75 million); dynamic resolution (the core, 99b's governor) lowers it to
//     hold the screen's rate, but only when the graphics chip is the limit (99b: window.__cpuBound)
//   - no SMAA (three more full-screen passes; at twice the points the edges are already fine)
//   - the far shadow cascade redrawn every third frame (every other on a desktop), at 1024 px
if (typeof __PHONE < 'u' && __PHONE && typeof window < 'u') {
  window.__fxBase = 'smaa';
  window.__fxOff = [window.__fxBase, window.__fxOff || ''].filter(Boolean).join(',');
  const corePt = Pt;
  Pt = function (w) {
    const A = eA.settings;
    if (A.renderRes > 0) return corePt.apply(this, arguments);
    // (Low too: it was 1 x, and dynamic resolution's floor two thirds of that: 253 x 454 on an iPhone)
    const low = w === 'low',
      dpr = window.devicePixelRatio || 1,
      px = Math.max(1, window.innerWidth * window.innerHeight),
      cap = Math.sqrt((low ? 0.75e6 : 1.15e6) / px);
    return Math.max(0.3, Math.min(3, cap, Math.min(low ? 1.6 : 2, dpr) * (A.renderScale || 1)));
  };
  if (typeof __SH_TIERS < 'u') {
    __SH_TIERS.medium = [
      { h: 13, size: 2048, every: 1 },
      { h: 56, size: 1024, every: 3 },
    ];
    __SH_TIERS.high = __SH_TIERS.medium;
  }
}
