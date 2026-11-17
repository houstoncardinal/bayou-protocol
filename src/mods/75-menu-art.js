/* ===== Bayou Protocol mod: menu artwork (real screenshots) ===== */
// The map cards and the large map preview were drawn on a canvas when the menu opened (an isometric block
// model of each map, built on the main thread: slow, and it looked like blocks). They are now screenshots
// taken in the game (public/game/menu/, 1280 x 720 WebP, shot at High quality): put straight into the
// thumbnail cache (ll), so nothing is drawn. The mode cards get screenshots too (ui.css and below).
// To retake them: stand where you want in a match with the HUD hidden and screenshot at 1600 x 900.
const __MENU_ART = { cinema: 'map-cinema', prison: 'map-prison', frostline: 'map-frostline', ridgeback: 'map-ridgeback' };
for (const [id, f] of Object.entries(__MENU_ART)) ll.set(id, `game/menu/${f}.webp`);
if (typeof document < 'u') {
  const st = document.createElement('style');
  st.textContent =
    ['tdm', 'ffa', 'ctf', 'bomb', 'jb', 'theater'].map((m) => `.po-mode[data-mode='${m}'] .po-mode-art{background:linear-gradient(180deg,rgba(8,10,14,.05),rgba(8,10,14,.55)),url(game/menu/mode-${m}.webp) center/cover!important}`).join('') +
    '.mp-art,.po-maphero-art{background-size:cover!important;background-position:center!important}' +
    // the mode icon sits smaller over a photo
    '.po-mode-art svg{width:44px!important;height:44px!important;opacity:.92}';
  document.head.appendChild(st);
  // decode them early, so the cards are instant
  setTimeout(() => {
    for (const f of [...Object.values(__MENU_ART), 'mode-tdm', 'mode-ffa', 'mode-ctf', 'mode-bomb', 'mode-jb', 'mode-theater', 'theater']) {
      const im = new Image();
      im.src = `game/menu/${f}.webp`;
    }
  }, 300);
}
