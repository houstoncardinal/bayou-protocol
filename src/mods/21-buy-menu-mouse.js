/* ===== Bayou Protocol mod: buy menu works with the mouse ===== */
// Opening the buy menu with B used to leave the mouse locked to the game: the cursor stayed hidden and
// moving the mouse turned the camera, so cards could only be bought with number keys.
// Now the menu frees the cursor while it is open (hover, wheel-scroll, click to buy all work) and the
// game takes the mouse back when the menu closes. Losing the lock here does not pause the match:
// the core's pointerlockchange handler skips the pause while the buy menu is open.
if (typeof document < 'u') {
  let wasOpen = !1;
  const relock = () => {
    const z = Zw.getState();
    if (z.screen !== 'playing' || z.paused || z.buyOpen || document.pointerLockElement) return;
    if (WI.kind === 'pad' || M9()) return;
    try {
      const c = document.querySelector('.fps-root canvas') || document.querySelector('canvas'),
        r = c && c.requestPointerLock && c.requestPointerLock();
      r && r.catch && r.catch(() => {});
    } catch (e) {}
  };
  Zw.subscribe((s) => {
    const open = !!s.buyOpen && s.screen === 'playing';
    if (open === wasOpen) return;
    wasOpen = open;
    if (open) {
      kb(); // release held keys/buttons so you don't keep walking or firing behind the menu
      if (document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch (e) {}
      }
      // put the cursor somewhere useful: the first card gets focus for keyboard users too
      setTimeout(() => {
        const first = document.querySelector('.sb2-grid .sb2-card:not([disabled])');
        first && first.focus({ preventScroll: !0 });
      }, 0);
    } else relock();
  });
  // clicking empty space around the panel closes it, like a modal
  document.addEventListener(
    'mousedown',
    (e) => {
      const z = Zw.getState();
      if (!z.buyOpen || e.button !== 0) return;
      const t = e.target;
      t instanceof Element && t.classList.contains('sb2-wrap') && (z.setBuyOpen(!1), relock());
    },
    !0,
  );
}
