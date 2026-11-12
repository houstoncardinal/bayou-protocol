/* ===== Bayou Protocol mod: precision mouse input ===== */
// Turn rate = 0.022° per mouse count × Sensitivity (the scale most competitive shooters use), and:
//   - Same on every gun. Hip-fire never depended on the gun; aiming did, because each gun's zoom (1.25×
//     to 1.75×, scopes 3×) divided your sensitivity. Now aiming uses one fixed factor for every gun (your
//     ADS / scope multiplier over a reference zoom of 1.5× / 3×), so the same hand movement turns the same
//     amount on the AK, the Midas, an SMG or a pistol. "Match each gun's zoom" brings back the old scaling.
//   - DPI keeps your turn distance. Changing the DPI setting rescales Sensitivity so the cm per full turn
//     stays the same (set it to your mouse's DPI after you change it on the mouse).
//   - Vertical ratio: vertical look speed relative to horizontal.
//   - Raw input status: the browser is asked for raw (unaccelerated) mouse input; settings show whether it
//     was granted. Without it the operating system's pointer acceleration changes your turn rate with hand
//     speed, which feels like a sensitivity that never stays put.
//   - Settings persistence: saved on every change (as before) and the browser is asked to keep the site's
//     storage persistent, so it is not cleared under storage pressure.
const __LOOK = { raw: null, refAds: 1.5, refScope: 3 };
{
  const S = eA.settings;
  S.aimSensByZoom === void 0 && (S.aimSensByZoom = !1);
  S.ySens === void 0 && (S.ySens = 1);
}
zZ = function () {
  const w = eA.human(),
    S = eA.settings;
  if (!w) return 1;
  const wp = re(w);
  if (S.aimSensByZoom) {
    const i = wp ? 1 / k3(w, wp.scope, wp.adsZoom) : 1,
      I = w.scoped ? S.scopeSensitivity : w.ads > 0.5 ? S.adsSensitivity : 1;
    return i * I;
  }
  if (w.scoped) return S.scopeSensitivity / __LOOK.refScope;
  const a = Math.max(0, Math.min(1, w.ads || 0));
  return 1 + (S.adsSensitivity / __LOOK.refAds - 1) * a;
};
// DPI changes keep cm/360
{
  let lastDpi = eA.settings.mouseDpi,
    lastSens = eA.settings.mouseSens;
  const coreSave = eA.saveSettings;
  eA.saveSettings = function () {
    const S = this.settings;
    if (S.mouseDpi !== lastDpi && S.mouseSens === lastSens && lastDpi > 0 && S.mouseDpi > 0) S.mouseSens = Math.round(((S.mouseSens * lastDpi) / S.mouseDpi) * 1000) / 1000;
    lastDpi = S.mouseDpi;
    lastSens = S.mouseSens;
    try {
      navigator.storage && navigator.storage.persist && navigator.storage.persist();
    } catch (e) {}
    return coreSave.apply(this, arguments);
  };
}
// Raw input on every mouse capture. The game takes the mouse in several places: deploying and resuming
// from Esc (the core, which asked for raw input), closing the buy menu (21-buy-menu-mouse.js) and the
// free-aim fallback (01-mouse-capture.js), which did not. After buying a gun the mouse was therefore
// captured with the operating system's pointer acceleration on, so the same hand movement turned further
// the faster you moved, and pausing with Esc "fixed" it by capturing again with raw input. Every capture
// now goes through here: raw input when the setting is on and the browser supports it; if the browser
// refuses raw input, every capture falls back the same way, so the turn rate never changes mid-match.
if (typeof Element < 'u' && Element.prototype.requestPointerLock) {
  const coreLock = Element.prototype.requestPointerLock;
  Element.prototype.requestPointerLock = function (opts) {
    const want = eA.settings.rawInput !== !1 && __LOOK.rawOk !== !1,
      o = want ? { ...(opts || {}), unadjustedMovement: !0 } : void 0;
    let r;
    try {
      r = coreLock.call(this, o);
    } catch (e) {
      r = null;
    }
    if (!r || typeof r.then != 'function') {
      __LOOK.raw = null;
      return r;
    }
    const el = this;
    return r.then(
      () => {
        __LOOK.raw = !!o;
        __LOOK.locks = (__LOOK.locks || 0) + 1;
      },
      (err) => {
        // raw input not supported here: remember it, and lock the plain way (every time from now on)
        if (o && err && err.name === 'NotSupportedError') {
          __LOOK.rawOk = !1;
          __LOOK.raw = !1;
          const r2 = coreLock.call(el);
          return r2 && r2.then ? r2.then(() => (__LOOK.locks = (__LOOK.locks || 0) + 1)) : r2;
        }
        throw err;
      },
    );
  };
}
// ---------- settings rows (under Mouse smoothing) ----------
function __LookSettings() {
  const [, force] = __useForce(),
    S = eA.settings,
    set = (k, val) => {
      S[k] = val;
      eA.saveSettings();
      force();
    },
    cm = (360 / (0.022 * S.mouseSens) / S.mouseDpi) * 2.54,
    raw = __LOOK.raw;
  return M.jsxs(M.Fragment, {
    children: [
      M.jsx(rw, {
        label: 'Aiming sensitivity across guns',
        desc: S.aimSensByZoom
          ? "Scaled by each gun's zoom, so the view moves the same distance on screen; the hand movement differs a little from gun to gun."
          : 'The same hand movement turns the same amount on every gun, hip-fire and aiming. Recommended.',
        children: M.jsx(__LookSeg, {
          value: S.aimSensByZoom ? 'zoom' : 'same',
          options: [
            ['same', 'Same on every gun'],
            ['zoom', "Match each gun's zoom"],
          ],
          onChange: (x) => set('aimSensByZoom', x === 'zoom'),
        }),
      }),
      M.jsx(rw, {
        label: 'Vertical sensitivity',
        desc: 'Up and down look speed relative to left and right. 1.00 is the same.',
        children: M.jsx(BB, { label: 'Vertical sensitivity', value: S.ySens ?? 1, min: 0.5, max: 1.5, step: 0.01, onChange: (x) => set('ySens', Math.round(x * 100) / 100), format: (x) => `${x.toFixed(2)}×` }),
      }),
      M.jsx(rw, {
        label: 'Turn distance',
        desc:
          raw === !0
            ? 'Raw input is active: the browser passes your mouse counts straight through, with no pointer acceleration.'
            : raw === !1
              ? 'This browser refused raw input, so your operating system’s pointer acceleration still applies and the turn rate changes with hand speed. Turn off pointer acceleration in your mouse settings, or use Chrome or Edge.'
              : 'Raw input is requested the next time the game captures the mouse.',
        children: M.jsx('span', { className: 'lx-numbox', style: { display: 'inline-block', minWidth: 120, textAlign: 'center' }, children: `${cm.toFixed(1)} cm / 360°` }),
      }),
    ],
  });
}
function __useForce() {
  const [, f] = S.useState(0);
  return [0, () => f((x) => x + 1)];
}
function __LookSeg({ value, options, onChange }) {
  return M.jsx('div', {
    className: 'lx-seg',
    role: 'group',
    children: options.map(([k, label]) => M.jsx('button', { 'aria-pressed': value === k, onClick: () => onChange(k), children: label }, k)),
  });
}
{
  const coreRow = rw;
  rw = function (p) {
    if (p.label === 'Aim-down-sights multiplier' && !eA.settings.aimSensByZoom)
      p = { ...p, desc: 'Sensitivity while aiming down sights, relative to hip-fire. The same on every gun.' };
    if (p.label === 'Mouse DPI')
      p = { ...p, desc: "Your mouse's DPI (from its software). When you change it here, Sensitivity is adjusted so the turn distance stays the same." };
    if (p.label === 'Scope multiplier' && !eA.settings.aimSensByZoom)
      p = { ...p, desc: 'Sensitivity through a sniper scope, relative to hip-fire. The same on every scoped gun.' };
    const r = coreRow(p);
    return p.label === 'Mouse smoothing' ? M.jsxs(M.Fragment, { children: [r, M.jsx(__LookSettings, {})] }) : r;
  };
}
typeof window < 'u' &&
  (window.__look = {
    // degrees turned per mouse count for the current weapon and aim state
    degPerCount: () => (kq * eA.settings.mouseSens * zZ() * 180) / Math.PI,
    raw: () => ({ granted: __LOOK.raw, supported: __LOOK.rawOk !== !1, locks: __LOOK.locks || 0 }),
  });
typeof window < 'u' && (window.__nlState = () => ({ freeAim: __NL.on, fails: __NL.fails.length }));
