/* ===== Bayou Protocol mod: keeping clear of the host's badge ===== */
// Netlify's free plan can add a "Powered by Netlify" badge to the site: an iframe (#nl-badge-frame) fixed at the
// bottom right, over everything. Over the game it sat on the phone's bottom tab bar, the setup screen's Deploy
// button and the touch controls, so a tap meant for the game went to Netlify. The badge is Netlify's, so it isn't
// hidden or moved here (switch it off in Netlify: Project configuration → General → Powered by Netlify badge).
// While it shows, the game gives it a strip at the bottom of the screen: the app (#root) ends above it, and with
// a transform on #root its fixed screens (menus, the match, the touch controls) fit in that shorter area too.
// If the badge isn't there, or a visitor closes it, nothing changes.
(function () {
  if (typeof document > 'u') return;
  const st = document.createElement('style');
  st.textContent = [
    'html.has-host-badge,html.has-host-badge body{background:#05060a}',
    'html.has-host-badge #root{position:fixed;left:0;top:0;right:0;bottom:var(--host-badge-h,0px);height:auto!important;transform:translateZ(0);overflow:hidden}',
    'html.has-host-badge #bp-net-toasts{bottom:calc(var(--host-badge-h,0px) + 14px)}',
  ].join('');
  document.head.appendChild(st);
  let last = '';
  const check = () => {
    const f = document.getElementById('nl-badge-frame');
    let h = 0;
    if (f) {
      const cs = getComputedStyle(f),
        r = f.getBoundingClientRect();
      // (shown: on screen, in the lower part of the window)
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.height > 0 && r.width > 0 && r.top > window.innerHeight * 0.5) h = Math.ceil(window.innerHeight - r.top + 6);
    }
    const key = String(h);
    if (key === last) return;
    last = key;
    document.documentElement.classList.toggle('has-host-badge', h > 0);
    document.documentElement.style.setProperty('--host-badge-h', h + 'px');
    // the game's canvas and HUD measure the window: tell them it changed
    window.dispatchEvent(new Event('resize'));
  };
  new MutationObserver(check).observe(document.documentElement, { childList: !0, subtree: !1 });
  const start = () => (document.body && new MutationObserver(check).observe(document.body, { childList: !0 }), check());
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
  window.addEventListener('resize', () => setTimeout(check, 50));
  setInterval(check, 2000);
})();
