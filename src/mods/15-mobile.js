/* ===== Bayou Protocol mod: phones and tablets — landscape only, full screen where the browser allows ===== */
(function () {
  if (typeof document > 'u') return;
  const touch = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  if (!touch) return;
  const H = document.documentElement;
  H.classList.add('swat-touch');
  const ios =
      /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    standalone = !!navigator.standalone || matchMedia('(display-mode: standalone),(display-mode: fullscreen)').matches;
  const ov = document.createElement('div');
  ov.id = 'swat-rotate';
  ov.innerHTML =
    '<div><svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="22" y="8" width="20" height="36" rx="4" opacity=".35"/><rect x="8" y="34" width="48" height="22" rx="4"/><path d="M48 12c6 3 9 8 9 14"/><path d="M57 18v8h-8"/></svg><b>Turn your device sideways</b><span>Bayou Protocol plays in landscape, menus included.</span>' +
    (ios && !standalone
      ? '<small>For true full screen on iPhone or iPad: open the game in Safari, tap Share, then “Add to Home Screen”, and launch it from there.</small>'
      : '') +
    '</div>';
  const add = () => document.body && document.body.appendChild(ov);
  document.body ? add() : document.addEventListener('DOMContentLoaded', add);
  const go = () => {
    try {
      const el = H,
        rq = el.requestFullscreen || el.webkitRequestFullscreen;
      if (rq && !document.fullscreenElement && !document.webkitFullscreenElement) {
        const p = rq.call(el, { navigationUI: 'hide' });
        Promise.resolve(p)
          .then(() => {
            try {
              screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {});
            } catch (e) {}
          })
          .catch(() => {});
      } else {
        try {
          screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {});
        } catch (e) {}
      }
    } catch (e) {}
  };
  window.addEventListener('touchend', go, { passive: !0, capture: !0 });
  window.addEventListener('click', go, !0);
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  const vh = () => H.style.setProperty('--swat-vh', window.innerHeight + 'px');
  vh();
  window.addEventListener('resize', vh);
  window.addEventListener('orientationchange', () => setTimeout(vh, 250));
})();
