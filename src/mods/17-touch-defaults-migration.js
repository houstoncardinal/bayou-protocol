(function () {
  try {
    if (localStorage.getItem('bp-touch-v2')) return;
    localStorage.setItem('bp-touch-v2', '1');
    const s = eA.settings;
    let ch = !1;
    s.touchScale === 1 && ((s.touchScale = 0.82), (ch = !0));
    s.touchOpacity === 0.9 && ((s.touchOpacity = 0.6), (ch = !0));
    if (ch) {
      const o = JSON.parse(localStorage.getItem('cds-settings') || '{}');
      o.touchScale = s.touchScale;
      o.touchOpacity = s.touchOpacity;
      localStorage.setItem('cds-settings', JSON.stringify(o));
    }
  } catch (e) {}
})();
