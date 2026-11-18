/* ===== Bayou Tactical mod: picture tuning and the default quality ===== */
// Brightness, shadows and contrast, set by each player for their own screen (Settings > Video, and the quick
// settings in the in-match menu). They act in the game's own colour grade (the last colour step of the
// picture, after tone mapping), on top of whatever look the map and time of day have:
//   - Brightness: the midtones (the grade's gamma), up or down, without clipping the brightest parts
//   - Shadows: the dark tones only: up shows what is in dark corners, down deepens them
//   - Contrast: the S-curve round mid grey, steeper or flatter
// (Shadows is a curve added to the grade's shader, uShadows: dark tones scaled up or down, black kept black,
// fading out by the midtones; raising the grade's lift instead only greyed the blacks.)
// Every value applies the moment it changes. To set them accurately:
//   - a calibration strip, coloured by the same formula as the grade (so it shows exactly what the sliders
//     do to the picture): the near-black squares show where shadows disappear, the near-white ones where
//     highlights merge
//   - "Hold to view the game": while held, the menus go see-through and the live picture shows
//
// Quality: Medium by default on every device (Auto used to pick High on strong graphics cards and Low on
// phones and modest machines). With Auto on, a device that holds a very low frame rate in a match (under 25
// frames a second for 8 s, once dynamic resolution has gone as low as it can, or for 20 s regardless) is
// stepped down to Low, with a message, and starts on Low from then on. Choosing Auto again from a manual
// setting tries Medium afresh. Software renderers (no graphics card) start on Low.
const __VT = { grades: new Set(), peek: !1 };
const __VT_MAX = 50;
function __vtVals() {
  const s = eA.settings,
    c = (v) => Math.max(-__VT_MAX, Math.min(__VT_MAX, Math.round(+v || 0)));
  return { b: c(s.viewBrightness), sh: c(s.viewShadows), ct: c(s.viewContrast) };
}
// the grade with the player's adjustments on top
function __vtAdjust(A) {
  const { b, sh, ct } = __vtVals(),
    gm = Math.pow(2, (b / __VT_MAX) * 0.55),
    k = (ct / __VT_MAX) * 0.45;
  return {
    ...A,
    gamma: A.gamma.map((x) => x * gm),
    contrast: Math.max(-0.5, Math.min(1.2, A.contrast + k)),
    // the shadow curve (uShadows in the grade shader): dark tones on screen up to about twice as bright, or
    // about half as bright
    shadows: (sh / __VT_MAX) * (sh > 0 ? 1 : 0.4),
  };
}
// the core's set() knows the grade's own values; the shadow curve is the player's alone
function __vtSetGrade(g, A) {
  const r = __vtCoreSet.call(g, __vtAdjust(A)),
    u = g.uniforms && g.uniforms.get('uShadows');
  u && (u.value = __vtAdjust(A).shadows);
  return r;
}
const __vtCoreSet = Y_.prototype.set;
Y_.prototype.set = function (A) {
  this.__base = A;
  __VT.grades.delete(this);
  __VT.grades.add(this);
  // (a new grade is made when the quality changes: keep only the recent ones)
  while (__VT.grades.size > 6) __VT.grades.delete(__VT.grades.values().next().value);
  return __vtSetGrade(this, A);
};
function __vtRedraw() {
  try {
    const st = typeof __R3F < 'u' && __R3F && (__R3F.get ? __R3F.get() : __R3F);
    st && st.invalidate();
  } catch (e) {}
}
function __vtApplyAll() {
  for (const g of __VT.grades) g.__base && __vtSetGrade(g, g.__base);
  __vtRedraw();
}
function __vtSet(key, v) {
  eA.settings[key] = v;
  eA.saveSettings();
  __vtApplyAll();
}
// ---------------------------------------------------------------- the calibration strip
// The grade's formula (the Grade effect's shader), for a grey in display terms: to linear, graded, back
const __vtLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)),
  __vtSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055),
  __vtSm = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
function __vtGrade(v, G) {
  let c = [0, 1, 2].map((i) => {
    let x = Math.max(0, Math.min(1, __vtLin(v)));
    if (G.shadows) {
      let p = Math.pow(x, 1 / 2.2);
      p = Math.max(0, Math.min(1, p + G.shadows * 1.6 * p * (1 - p) ** 3));
      x = Math.pow(p, 2.2);
    }
    let y = Math.pow(Math.max(x * G.gain[i] + G.lift[i] * (1 - x), 0), 1 / G.gamma[i]);
    const s = y * y * (3 - 2 * y);
    return y + (s - y) * G.contrast;
  });
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2],
    mx = Math.max(...c),
    mn = Math.min(...c),
    boost = G.vibrance * (1 - __vtSm(0.15, 0.7, mx - mn)) - 0.18 * __vtSm(0.55, 0.9, mx - mn),
    sh = 1 - __vtSm(0, 0.45, l),
    hi = __vtSm(0.5, 1, l);
  c = c.map((x, i) => l + (x - l) * (G.sat + boost) + (G.shadow[i] * sh + G.high[i] * hi) * G.split);
  return c.map((x) => Math.round(__vtSrgb(Math.max(0, Math.min(1, x))) * 255));
}
function __vtBase() {
  const last = [...__VT.grades].pop();
  if (last && last.__base) return last.__base;
  const tod = Zw.getState().timeOfDay;
  return (G_[tod] || G_.dusk).grade;
}
const __VT_STEPS = [0, 0.025, 0.05, 0.09, 0.15, 0.25, 0.4, 0.55, 0.7, 0.85, 0.94, 1];
function __VtChart() {
  const G = __vtAdjust(__vtBase());
  return M.jsxs('div', {
    className: 'vt-chart',
    children: [
      M.jsx('div', {
        className: 'vt-steps',
        children: __VT_STEPS.map((v, i) => M.jsx('span', { style: { background: `rgb(${__vtGrade(v, G).join(',')})` } }, i)),
      }),
      M.jsxs('div', {
        className: 'vt-guide',
        children: [M.jsx('span', { children: '◀ the 2nd square should be just visible' }), M.jsx('span', { children: 'the last two should still differ ▶' })],
      }),
    ],
  });
}
// ---------------------------------------------------------------- hold to view the game
function __vtPeek(on) {
  __VT.peek = on;
  try {
    const st = typeof __R3F < 'u' && __R3F && (__R3F.get ? __R3F.get() : __R3F);
    st && st.gl.domElement.classList.add('vt-main');
  } catch (e) {}
  document.documentElement.classList.toggle('vt-peek', on);
  __vtRedraw();
}
typeof window < 'u' &&
  ['pointerup', 'pointercancel', 'blur'].forEach((e) =>
    window.addEventListener(e, () => __VT.peek && __vtPeek(!1), { passive: !0 }),
  );
function __VtPeekBtn() {
  return M.jsx('button', {
    type: 'button',
    className: 'vt-peek-btn',
    onPointerDown: (e) => (e.preventDefault(), __vtPeek(!0)),
    onKeyDown: (e) => (e.key === ' ' || e.key === 'Enter') && __vtPeek(!0),
    onKeyUp: () => __vtPeek(!1),
    children: 'Hold to view the game',
  });
}
// ---------------------------------------------------------------- the rows
const __VT_ROWS = [
  ['viewBrightness', 'Brightness', 'Lightens or darkens the midtones. The brightest parts are not clipped.'],
  ['viewShadows', 'Shadows', 'Raise to see into dark corners and night maps; lower for deeper blacks.'],
  ['viewContrast', 'Contrast', 'The difference between light and dark: higher is punchier, lower is flatter.'],
];
const __vtFmt = (v) => (v > 0 ? `+${v}` : `${v}`);
function __vtSlider(key, label, v, set) {
  return M.jsx(BB, {
    label,
    value: v,
    min: -__VT_MAX,
    max: __VT_MAX,
    step: 1,
    onChange: (x) => set(key, Math.round(x)),
    format: __vtFmt,
  });
}
// Settings > Video: the three sliders, the strip with its two buttons
function __ViewTune() {
  const [, bump] = S.useState(0),
    set = (k, v) => (__vtSet(k, v), bump((n) => n + 1)),
    vals = __vtVals(),
    cur = { viewBrightness: vals.b, viewShadows: vals.sh, viewContrast: vals.ct },
    changed = vals.b || vals.sh || vals.ct;
  return M.jsxs(M.Fragment, {
    children: [
      ...__VT_ROWS.map(([k, label, desc]) => M.jsx(rw, { label, desc, children: __vtSlider(k, label, cur[k], set) }, k)),
      M.jsx(rw, {
        label: 'Calibrate',
        desc: M.jsxs(M.Fragment, {
          children: [
            'Set Shadows until the second square from the left is only just visible, and Contrast so the last two squares still look different. ',
            'Then hold the button to check the game itself.',
            M.jsx(__VtChart, {}),
          ],
        }),
        children: M.jsxs('div', {
          className: 'vt-btns',
          children: [
            M.jsx(__VtPeekBtn, {}),
            M.jsx('button', {
              type: 'button',
              className: 'vt-reset',
              disabled: !changed,
              onClick: () => {
                for (const [k] of __VT_ROWS) eA.settings[k] = 0;
                eA.saveSettings();
                __vtApplyAll();
                bump((n) => n + 1);
              },
              children: 'Reset',
            }),
          ],
        }),
      }),
    ],
  });
}
// the in-match quick settings: the same three, a row each (built by 47-pause-menu.js's row helper)
function __vtQuickRows(row, upd) {
  const vals = __vtVals(),
    cur = { viewBrightness: vals.b, viewShadows: vals.sh, viewContrast: vals.ct };
  return __VT_ROWS.map(([k, label]) => row(label, null, __vtSlider(k, label, cur[k], (key, v) => (upd(key, v), __vtApplyAll()))));
}
// ---------------------------------------------------------------- quality: Medium by default, Low if too slow
const __AQ = { key: 'bp-autoq-v1', match: null, at: 0, acc: 0, n: 0, low: 0, last: 0 };
function __aqLowered() {
  try {
    return localStorage.getItem(__AQ.key) === 'low';
  } catch (e) {
    return !1;
  }
}
function __aqReset() {
  try {
    localStorage.removeItem(__AQ.key);
  } catch (e) {}
}
EU = function () {
  if (typeof window > 'u') return 'medium';
  let r = '';
  try {
    r = String(nz()).toLowerCase();
  } catch (e) {}
  return /swiftshader|llvmpipe|software|basic render/.test(r) || __aqLowered() ? 'low' : 'medium';
};
// the store was made (with the old automatic choice) before the mods ran
try {
  const z = Zw.getState();
  eA.settings.autoQuality && z.quality !== EU() && z.setup({ quality: EU() });
} catch (e) {}
function __aqDesc(q) {
  return __aqLowered() && q === 'low'
    ? 'Automatic: Low. This device ran below 25 frames a second on Medium, so it was lowered. Choose Medium to try it again.'
    : `Automatic: ${q === 'low' ? 'Low' : q === 'high' ? 'High' : 'Medium'}. If the frame rate stays very low during a match, it lowers itself to Low.`;
}
function __aqTick(t) {
  requestAnimationFrame(__aqTick);
  const dt = (t - __AQ.last) / 1e3;
  __AQ.last = t;
  let z;
  try {
    z = Zw.getState();
  } catch (e) {
    return;
  }
  const live = eA.running && eA.state && !eA.attract && !eA.paused && !document.hidden && z.screen === 'playing';
  if (!live || !(dt > 0) || dt > 0.5) return void (__AQ.acc = __AQ.n = 0);
  // a new match: the first 20 s load models and compile shaders (hitches that say nothing about the device)
  if (eA.state !== __AQ.match) (__AQ.match = eA.state), (__AQ.at = t), (__AQ.low = 0);
  if (t - __AQ.at < 2e4) return void (__AQ.acc = __AQ.n = 0);
  __AQ.acc += dt;
  __AQ.n++;
  if (__AQ.acc < 1) return;
  const fps = __AQ.n / __AQ.acc;
  __AQ.acc = __AQ.n = 0;
  if (!eA.settings.autoQuality || z.quality === 'low') return void (__AQ.low = 0);
  __AQ.low = fps < 25 ? __AQ.low + 1 : Math.max(0, __AQ.low - 2);
  const D = eA.__dyn,
    floor = Math.max(0.3, Pt(z.quality) * 0.65),
    atFloor = !eA.settings.dynamicRes || !D || !(D.dpr > floor + 0.01);
  if (!(__AQ.low >= 8 && (atFloor || __AQ.low >= 20))) return;
  const next = z.quality === 'high' ? 'medium' : 'low';
  z.setup({ quality: next });
  if (next === 'low')
    try {
      localStorage.setItem(__AQ.key, 'low');
    } catch (e) {}
  z.flash && z.flash(`The frame rate was very low, so graphics quality was lowered to ${next === 'low' ? 'Low' : 'Medium'}. You can change it in Settings > Video.`);
  __AQ.low = 0;
  __AQ.at = t; // let it settle before judging again
}
typeof window < 'u' && requestAnimationFrame(__aqTick);
// ---------------------------------------------------------------- look
typeof document < 'u' &&
  (() => {
    const css = document.createElement('style');
    css.textContent = `
.vt-chart{margin-top:10px;max-width:440px}
.vt-steps{display:grid;grid-template-columns:repeat(${__VT_STEPS.length},1fr);height:30px;border:1px solid rgba(255,255,255,.18);border-radius:3px;overflow:hidden}
.vt-steps span{display:block}
.vt-guide{display:flex;justify-content:space-between;gap:12px;margin-top:5px;font-size:11px;opacity:.6;letter-spacing:.02em}
.vt-btns{display:flex;flex-direction:column;gap:8px;align-items:stretch;min-width:180px}
.vt-peek-btn,.vt-reset{font:inherit;font-size:13px;padding:9px 14px;border-radius:3px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
.vt-peek-btn:hover,.vt-reset:hover:not(:disabled){background:rgba(255,255,255,.12)}
.vt-reset:disabled{opacity:.4;cursor:default}
html.vt-peek body *{visibility:hidden!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;filter:none!important;transition:none!important}
html.vt-peek canvas.vt-main,html.vt-peek .vt-peek-btn{visibility:visible!important}
html.vt-peek .vt-peek-btn{background:rgba(10,12,16,.75)}
`;
    document.head.appendChild(css);
  })();
typeof window < 'u' && (window.__bpView = () => ({ ...__vtVals(), grades: __VT.grades.size, quality: Zw.getState().quality, auto: eA.settings.autoQuality, lowered: __aqLowered(), aqLow: __AQ.low }));
