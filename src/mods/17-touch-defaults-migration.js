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
// Touch buttons back to full size (2026-11-22): at 82 % reload, crouch, melee and throw were 33-39 px, under the
// 44 px a thumb needs; the HUD's layout on phones was reworked to fit them (src/styles/ui.css). Anyone still on
// the old default moves to 100 % once; a size chosen in Settings is kept.
(function () {
  try {
    if (localStorage.getItem('bp-touch-v3')) return;
    localStorage.setItem('bp-touch-v3', '1');
    const s = eA.settings;
    if (s.touchScale !== 0.82) return;
    s.touchScale = 1;
    const o = JSON.parse(localStorage.getItem('cds-settings') || '{}');
    o.touchScale = 1;
    localStorage.setItem('cds-settings', JSON.stringify(o));
  } catch (e) {}
})();
