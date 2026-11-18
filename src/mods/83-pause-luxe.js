/* ===== Bayou Tactical mod: the pause menu in the Home's language ===== */
// The in-match menu (core + 47-pause-menu.js: the rail of sections, the overview, scoreboard, loadout, settings,
// help, the leave confirmation) keeps its structure and every control; this adds the BAYOU TACTICAL mark over
// the rail's match card, the Home's generated UI sounds on its buttons, and the look (src/styles/pause-luxe.css:
// glass lit at the edges, angled cuts, gold and blue). It sits over a live match, so it stays light: no
// background picture, and on phones and low-memory devices (__LOWMEM) no backdrop blur at all.
typeof document < 'u' && typeof __LOWMEM < 'u' && __LOWMEM && document.documentElement.classList.add('bp-lite');
{
  const prevCard = PBA;
  PBA = function () {
    return M.jsxs(M.Fragment, {
      children: [
        M.jsxs('div', {
          className: 'pz-brand',
          children: [M.jsx(__HxMark, { size: 34 }), M.jsxs('span', { className: 'mx-word', children: [M.jsx('b', { children: 'BAYOU' }), M.jsx('small', { children: 'Tactical' })] })],
        }),
        M.jsx(prevCard, {}),
      ],
    });
  };
}
// the Home's UI sounds on the menu's buttons (one pair of listeners on the page, acting only inside the menu)
if (typeof document < 'u') {
  let last = null,
    at = 0;
  const inMenu = (t) => t && t.closest && t.closest('.pm-wrap') && t.closest('button, [role=button], label.lx-swatch');
  document.addEventListener(
    'pointerover',
    (e) => {
      const t = inMenu(e.target);
      if (t === last) return;
      last = t;
      if (!t || e.pointerType !== 'mouse' || t.disabled) return;
      const now = performance.now();
      now - at > 60 && ((at = now), __hxSfx('hover'));
    },
    { passive: !0 },
  );
  document.addEventListener(
    'pointerdown',
    (e) => {
      const t = inMenu(e.target);
      if (!t || t.disabled || (e.button !== void 0 && e.button > 0)) return;
      __hxSfx(t.closest('.pv-resume, .pm-item--go') ? 'go' : t.closest('.pm-item, .lx-tabs button') ? 'tab' : 'click');
    },
    { passive: !0 },
  );
}
