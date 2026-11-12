/* ===== Bayou Protocol mod: responsive sizing for any window or screen size ===== */
// Publishes the viewport size as CSS variables and size classes so ui.css can scale the HUD
// and reflow menus smoothly while the window is dragged, instead of jumping between fixed layouts.
//   --hud-s   HUD scale: 1 at 1280x800, smaller in small windows, a little larger on big screens
//   --vw-px / --vh-px   current viewport size in px
//   html.swat-short     viewport height under 560px (compact menus, tighter HUD)
//   html.swat-narrow    viewport width under 980px
(function () {
  if (typeof document > 'u') return;
  const H = document.documentElement;
  let lastW = 0,
    lastH = 0;
  const apply = () => {
    const vv = window.visualViewport;
    const w = Math.round(window.innerWidth || (vv && vv.width) || H.clientWidth),
      h = Math.round(window.innerHeight || (vv && vv.height) || H.clientHeight);
    if (!w || !h || (w === lastW && h === lastH)) return;
    lastW = w;
    lastH = h;
    const s = Math.max(0.55, Math.min(1.15, Math.min(w / 1280, h / 800)));
    H.style.setProperty('--hud-s', s.toFixed(3));
    H.style.setProperty('--vw-px', w + 'px');
    H.style.setProperty('--vh-px', h + 'px');
    H.classList.toggle('swat-short', h < 560);
    H.classList.toggle('swat-narrow', w < 980);
  };
  // resize already fires at most once per frame, so apply straight away: no one-frame lag while dragging
  const schedule = () => apply();
  apply();
  window.addEventListener('resize', schedule, { passive: !0 });
  window.addEventListener('orientationchange', () => setTimeout(schedule, 120));
  window.visualViewport && window.visualViewport.addEventListener('resize', schedule, { passive: !0 });
  document.addEventListener('fullscreenchange', schedule);
})();
