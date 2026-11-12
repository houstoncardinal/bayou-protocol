/* ===== Bayou Protocol mod: full screen + keyboard lock when deploying ===== */
function __fsGet() {
  try {
    return localStorage.getItem('swat-fs') !== 'off';
  } catch {
    return !0;
  }
}
function __fsSet(v) {
  try {
    localStorage.setItem('swat-fs', v ? 'on' : 'off');
  } catch {}
}
function __kbLock() {
  try {
    navigator.keyboard && navigator.keyboard.lock && navigator.keyboard.lock(['Escape']).catch(() => {});
  } catch (e) {}
}
function __fsEnter() {
  const el = document.documentElement;
  if (document.fullscreenElement) {
    __kbLock();
    return;
  }
  try {
    const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
    r && r.then ? r.then(__kbLock).catch(() => {}) : __kbLock();
  } catch (e) {}
}
if (typeof document < 'u') {
  // any click/tap that lands the player in a match (Deploy, Quick play, Resume) also enters full screen
  const go = () => {
    if (!__fsGet() || matchMedia('(pointer:coarse)').matches) return;
    setTimeout(() => {
      const z = Zw.getState();
      z.screen === 'playing' && !z.paused && __fsEnter();
    }, 0);
  };
  window.addEventListener('click', go, !0);
  // with Esc held by keyboard lock, Esc opens the pause menu instead of dropping out of full screen
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Escape' || !document.fullscreenElement) return;
      const z = Zw.getState();
      if (z.screen === 'playing' && !z.paused && !z.buyOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        try {
          document.exitPointerLock && document.exitPointerLock();
        } catch {}
        kb();
        z.setPaused(!0);
      }
    },
    !0,
  );
  document.addEventListener('fullscreenchange', () => {
    document.fullscreenElement ||
      (() => {
        try {
          navigator.keyboard && navigator.keyboard.unlock && navigator.keyboard.unlock();
        } catch {}
      })();
  });
}
function __FsRow() {
  const [v, setV] = S.useState(__fsGet());
  return M.jsx(rw, {
    label: 'Full screen when you deploy',
    desc: 'Starting or resuming a match switches to full screen and keeps the mouse locked in the game. Esc opens the menu; hold Esc to leave full screen.',
    children: M.jsx(gg, {
      label: 'Full screen when you deploy',
      value: v ? 'on' : 'off',
      onChange: (x) => {
        (__fsSet(x === 'on'), setV(x === 'on'));
      },
      options: [
        { v: 'on', label: 'On' },
        { v: 'off', label: 'Off' },
      ],
    }),
  });
}
