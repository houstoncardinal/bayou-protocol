/* ===== Bayou Protocol mod: mouse capture + free-aim fallback (only when the browser frame forbids mouse lock) ===== */
var __NL = { on: !1, x: -1, y: -1, fails: [], warned: !1, keys: {} };
function __nlFail() {
  const t = performance.now();
  __NL.fails = __NL.fails.filter((x) => t - x < 8e3);
  __NL.fails.push(t);
  if (__NL.fails.length >= 3) __nlEnable();
}
function __nlEnable() {
  if (__NL.on) return;
  __NL.on = !0;
  try {
    const z = Zw.getState();
    z.screen === 'playing' && z.setPaused && z.setPaused(!1);
    __NL.warned ||
      ((__NL.warned = !0),
      z.flash &&
        z.flash(
          'This preview window blocks mouse lock and full screen, so the mouse can leave the game. Free-aim is on for now. To play locked-in and full screen, download the game file and open it in Chrome, Edge or Firefox.',
        ));
  } catch (e) {}
}
function __nlTryLock() {
  try {
    const c = document.querySelector('.fps-root canvas') || document.querySelector('canvas'),
      r = c && c.requestPointerLock && c.requestPointerLock();
    r && r.catch && r.catch(() => {});
  } catch (e) {}
}
if (typeof document < 'u') {
  document.addEventListener('pointerlockerror', __nlFail);
  document.addEventListener('pointerlockchange', () => {
    document.pointerLockElement && ((__NL.on = !1), (__NL.fails = []));
  });
  window.addEventListener('mousemove', (e) => {
    __NL.x = e.clientX / Math.max(1, innerWidth);
    __NL.y = e.clientY / Math.max(1, innerHeight);
  });
  document.addEventListener('mouseleave', () => {
    __NL.x = __NL.y = -1;
  });
  window.addEventListener('blur', () => {
    __NL.x = __NL.y = -1;
  });
  window.addEventListener(
    'mousedown',
    () => {
      if (__NL.on && !document.pointerLockElement) {
        const z = Zw.getState();
        z.screen === 'playing' && !z.paused && !z.buyOpen && __nlTryLock();
      }
    },
    !0,
  );
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Escape' || !__NL.on || document.pointerLockElement) return;
      const z = Zw.getState();
      z.screen === 'playing' &&
        !z.paused &&
        !z.buyOpen &&
        (e.preventDefault(), e.stopImmediatePropagation(), kb(), z.setPaused(!0));
    },
    !0,
  );
  window.addEventListener('keydown', (e) => {
    /^Arrow/.test(e.code) && (__NL.keys[e.code] = !0);
  });
  window.addEventListener('keyup', (e) => {
    delete __NL.keys[e.code];
  });
  window.addEventListener('blur', () => {
    __NL.keys = {};
  });
  setInterval(() => {
    const zz = Zw.getState();
    if (zz.screen === 'playing' && !zz.paused && !zz.buyOpen) {
      const K = __NL.keys,
        k2 = kq * eA.settings.mouseSens * zZ();
      (K.ArrowLeft || K.ArrowRight) &&
        ((__NL.kt = Math.min(1, (__NL.kt || 0.35) + 0.06)),
        (eA.mouseBuf.x += (K.ArrowRight ? 1 : -1) * 26 * __NL.kt * k2));
      (K.ArrowUp || K.ArrowDown) && (eA.mouseBuf.y += (K.ArrowDown ? 1 : -1) * 13 * k2);
      K.ArrowLeft || K.ArrowRight || (__NL.kt = 0.35);
    }
  }, 16);
  setInterval(() => {
    const z = Zw.getState(),
      aim = __NL.on && !document.pointerLockElement && z.screen === 'playing' && !z.paused && !z.buyOpen;
    document.documentElement.classList.toggle('swat-aim', aim);
    if (!aim || __NL.x < 0) return;
    const k = kq * eA.settings.mouseSens * zZ(),
      E = 0.14,
      ex = __NL.x < E ? -(E - __NL.x) / E : __NL.x > 1 - E ? (__NL.x - (1 - E)) / E : 0,
      ey = __NL.y < E ? -(E - __NL.y) / E : __NL.y > 1 - E ? (__NL.y - (1 - E)) / E : 0;
    ex && (eA.mouseBuf.x += ex * Math.abs(ex) * 34 * k);
    ey && (eA.mouseBuf.y += ey * Math.abs(ey) * 16 * k * (eA.settings.invertY ? -1 : 1));
  }, 16);
}
