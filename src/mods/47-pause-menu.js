/* ===== Bayou Protocol mod: pause menu ===== */
// The Esc menu, redesigned (styles: "Pause menu" in src/styles/ui.css). Same structure and keys as before
// (left rail of sections, Q / E to move between them, Esc to resume), new look and a far more useful first
// page:
//   - rail: a match card (mode, map, live round state, the score as a bar in team colours, your kills /
//     deaths / score) above the section list
//   - overview: a large Resume card beside the match status; your match stats; your loadout with rendered
//     pictures of the guns you are carrying (from their 3D models); quick settings (sensitivity, aiming
//     multiplier, field of view, volume) that apply immediately; then every section as a visual card
//   - every section (scoreboard, loadout, settings, help) uses the same panels, rows and controls
// Gun pictures: rendered once per gun from its third-person model in a small offscreen renderer and cached.
const __PV = { thumbs: new Map(), queue: [], ren: null, busy: !1, subs: new Set() };
function __pvThumb(id) {
  if (__PV.thumbs.has(id)) return __PV.thumbs.get(id);
  __PV.queue.includes(id) || (__PV.queue.push(id), setTimeout(__pvPump, 30));
  return null;
}
function __pvPump() {
  if (__PV.busy || !__PV.queue.length) return;
  __PV.busy = !0;
  const id = __PV.queue.shift();
  try {
    const built = __XG[id] && __XG[id].tpl ? __xgBuild(id) : null;
    if (!built) {
      // model not loaded yet: try again shortly
      setTimeout(() => (__PV.queue.push(id), __pvPump()), 800);
      __PV.busy = !1;
      return;
    }
    const W = 360,
      H = 150;
    if (!__PV.ren) {
      __PV.ren = new PZ({ antialias: !0, alpha: !0, preserveDrawingBuffer: !0 });
      __PV.ren.setPixelRatio(1);
      __PV.ren.setSize(W, H);
      __PV.ren.toneMapping = to;
      __PV.ren.toneMappingExposure = 1.15;
    }
    const sc = new lD();
    sc.add(new dd('#e8eef8', '#3a3328', 1.4));
    const key = new Os('#ffffff', 2.4);
    key.position.set(2, 3, 1.5);
    const rim = new Os('#d0a960', 1.6);
    rim.position.set(-2, 1, -2.5);
    sc.add(key, rim);
    const g = built.group;
    sc.add(g);
    g.updateMatrixWorld(!0);
    const b = new xi().setFromObject(g),
      c = b.getCenter(new U()),
      s = b.getSize(new U()),
      cam = new ui(18, W / H, 0.01, 50),
      fit = Math.max(s.z / (W / H), s.y) / (2 * Math.tan((18 * Math.PI) / 360));
    cam.position.set(c.x + fit * 1.12, c.y + s.y * 0.15, c.z);
    cam.lookAt(c);
    __PV.ren.render(sc, cam);
    __PV.thumbs.set(id, __PV.ren.domElement.toDataURL('image/png'));
    for (const f of __PV.subs) f();
  } catch (e) {
    __PV.thumbs.set(id, '');
  }
  __PV.busy = !1;
  __PV.queue.length && setTimeout(__pvPump, 16);
}
function __usePv() {
  const [, set] = S.useState(0);
  S.useEffect(() => {
    const f = () => set((x) => x + 1);
    __PV.subs.add(f);
    return () => __PV.subs.delete(f);
  }, []);
}
// live match numbers, refreshed while the menu is open
function __useTick(ms = 500) {
  const [, set] = S.useState(0);
  S.useEffect(() => {
    const t = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}
const __fmtT = (s) => (s > 0 && isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '');
function __pvStatus() {
  const w = eA.state;
  if (!w) return null;
  const free = w.mode === 'ffa' || w.mode === 'gungame',
    phase = w.phase === 'freeze' ? 'Buy time' : w.phase === 'roundEnd' ? 'Round over' : w.phase === 'matchEnd' ? 'Match over' : 'Live',
    bomb = w.mode === 'bomb';
  return {
    mode: Eg[w.mode] || w.mode,
    map: aw().name,
    phase,
    round: bomb ? `Round ${w.round}` : '',
    timer: bomb && w.phaseLeft < 1e6 ? __fmtT(w.phaseLeft) : '',
    goal: bomb ? `First to ${w.winScore || 8} rounds` : w.mode === 'tdm' ? `First to ${oU.tdm} kills` : w.mode === 'gungame' ? 'Last weapon wins' : '',
    free,
    ct: w.score.CT,
    t: w.score.T,
  };
}
function __PvScore({ st, me }) {
  const tot = Math.max(1, st.ct + st.t),
    ct = (st.ct / tot) * 100;
  return M.jsxs('div', {
    className: 'pv-score',
    children: [
      M.jsxs('div', { className: `pv-side ${me === 'CT' ? 'is-me' : ''}`, style: { '--tc': ii.CT.main }, children: [M.jsx('span', { children: ii.CT.short || 'CT' }), M.jsx('b', { children: st.ct })] }),
      M.jsx('div', { className: 'pv-bar', style: { '--ct': ii.CT.main, '--t': ii.T.main, '--p': `${st.ct + st.t ? ct : 50}%` } }),
      M.jsxs('div', { className: `pv-side pv-side--t ${me === 'T' ? 'is-me' : ''}`, style: { '--tc': ii.T.main }, children: [M.jsx('b', { children: st.t }), M.jsx('span', { children: ii.T.short || 'T' })] }),
    ],
  });
}
// ---------------------------------------------------------------- rail: match card
PBA = function () {
  __useTick(1000);
  const st = __pvStatus(),
    A = eA.human();
  if (!st) return null;
  return M.jsxs('div', {
    className: 'pm-match pv-match',
    children: [
      M.jsxs('div', { className: 'pv-kick', children: [M.jsx('i', { className: `pv-dot ${st.phase === 'Live' ? 'is-live' : ''}` }), eA.net ? 'Online' : 'Offline', ' · ', st.phase, st.round && ` · ${st.round}`] }),
      M.jsx('div', { className: 'pv-mode', children: st.mode }),
      M.jsx('div', { className: 'pv-map', children: st.map }),
      !st.free && M.jsx(__PvScore, { st, me: A && A.team }),
      A &&
        M.jsx('div', {
          className: 'pv-mine',
          children: [
            ['Kills', A.kills],
            ['Deaths', A.deaths],
            ['Score', A.score],
          ].map(([k, v]) => M.jsxs('div', { children: [M.jsx('b', { children: v }), M.jsx('span', { children: k })] }, k)),
        }),
    ],
  });
};
// ---------------------------------------------------------------- overview page
function __PvWeapon({ wp, label }) {
  __usePv();
  if (!wp) return null;
  const d = gw[wp.id] || {},
    img = __pvThumb(wp.id);
  return M.jsxs('div', {
    className: 'pv-gun',
    children: [
      M.jsx('div', { className: 'pv-gun-img', children: img ? M.jsx('img', { src: img, alt: '' }) : M.jsx('div', { className: 'pv-gun-ph' }) }),
      M.jsxs('div', {
        className: 'pv-gun-txt',
        children: [M.jsx('small', { children: label }), M.jsx('b', { children: d.name || wp.id }), d.mag > 0 && M.jsxs('span', { children: [wp.mag, ' / ', wp.reserve] })],
      }),
    ],
  });
}
function __PvQuick() {
  const [, set] = S.useState(0),
    s = eA.settings,
    upd = (k, v) => {
      s[k] = v;
      eA.saveSettings();
      set((x) => x + 1);
    },
    cm = (360 / (0.022 * s.mouseSens) / (s.mouseDpi || 800)) * 2.54,
    row = (label, note, ctl) => M.jsxs('div', { className: 'pv-qrow', children: [M.jsxs('div', { className: 'pv-qlabel', children: [M.jsx('b', { children: label }), note && M.jsx('span', { children: note })] }), ctl] }, label);
  return M.jsxs('section', {
    className: 'pv-card',
    children: [
      M.jsxs('header', { className: 'pv-card-h', children: [M.jsx(Pw, { name: 'mouse', size: 16 }), M.jsx('span', { children: 'Quick settings' })] }),
      Ts()
        ? null
        : row('Sensitivity', `${cm.toFixed(1)} cm per full turn`, M.jsx(BB, { label: 'Sensitivity', value: s.mouseSens, min: 0.5, max: 20, step: 0.05, onChange: (v) => upd('mouseSens', Math.round(v * 100) / 100), format: (v) => v.toFixed(2) })),
      row('Aiming down sights', 'Relative to hip-fire', M.jsx(BB, { label: 'Aiming down sights', value: s.adsSensitivity, min: 0.3, max: 2, step: 0.01, onChange: (v) => upd('adsSensitivity', v), format: (v) => `${v.toFixed(2)}×` })),
      row('Field of view', null, M.jsx(BB, { label: 'Field of view', value: s.fov, min: 65, max: 110, step: 1, onChange: (v) => upd('fov', v), format: (v) => `${v}°` })),
      row('Volume', null, M.jsx(BB, { label: 'Volume', value: s.volume, min: 0, max: 1, step: 0.01, onChange: (v) => upd('volume', v), format: (v) => `${Math.round(v * 100)}%` })),
    ],
  });
}
fBA = function ({ onPick }) {
  __useTick(500);
  const touch = Ts(),
    online = !!eA.net,
    w = eA.state,
    A = eA.human(),
    st = __pvStatus(),
    noLoadout = (w && (w.mode === 'bomb' || w.mode === 'gungame')) || online,
    groups = cBA(online, w && (w.mode === 'bomb' || w.mode === 'gungame')),
    tiles = groups.flatMap((g) => g.items).filter((x) => x.id !== 'resume'),
    kd = A ? (A.kills / Math.max(1, A.deaths)).toFixed(2) : '0';
  return M.jsxs('div', {
    className: 'pv',
    children: [
      M.jsxs('div', {
        className: 'pv-hero',
        children: [
          M.jsxs('button', {
            className: 'pv-resume',
            onClick: () => (WM(), rc()),
            children: [
              M.jsx('span', { className: 'pv-play', children: M.jsx(Pw, { name: 'play', size: 30 }) }),
              M.jsxs('div', { children: [M.jsx('b', { children: 'Resume' }), M.jsx('span', { children: touch ? 'Tap to go back in' : WI.kind === 'pad' ? 'Press Start or B' : 'Click, or press Esc' })] }),
            ],
          }),
          st &&
            M.jsxs('div', {
              className: 'pv-status',
              children: [
                M.jsxs('div', { className: 'pv-status-top', children: [M.jsx('span', { children: st.mode }), M.jsx('span', { className: 'pv-status-map', children: st.map })] }),
                M.jsxs('div', {
                  className: 'pv-status-mid',
                  children: [
                    M.jsxs('div', { children: [M.jsx('small', { children: 'State' }), M.jsx('b', { children: st.phase })] }),
                    st.round && M.jsxs('div', { children: [M.jsx('small', { children: 'Round' }), M.jsx('b', { children: w.round })] }),
                    st.timer && M.jsxs('div', { children: [M.jsx('small', { children: 'Time' }), M.jsx('b', { children: st.timer })] }),
                  ],
                }),
                !st.free && M.jsx(__PvScore, { st, me: A && A.team }),
                st.goal && M.jsx('div', { className: 'pv-goal', children: st.goal }),
              ],
            }),
        ],
      }),
      A &&
        M.jsx('div', {
          className: 'pv-stats',
          children: [
            ['Kills', A.kills],
            ['Deaths', A.deaths],
            ['Assists', A.assists ?? 0],
            ['K/D', kd],
            ['Score', A.score],
            w && w.mode === 'bomb' ? ['Money', `$${(A.money || 0).toLocaleString()}`] : ['Streak', A.streak || 0],
          ].map(([k, v]) => M.jsxs('div', { className: 'pv-stat', children: [M.jsx('b', { children: v }), M.jsx('span', { children: k })] }, k)),
        }),
      M.jsxs('div', {
        className: 'pv-grid',
        children: [
          A &&
            M.jsxs('section', {
              className: 'pv-card',
              children: [
                M.jsxs('header', {
                  className: 'pv-card-h',
                  children: [
                    M.jsx(Pw, { name: 'crosshair', size: 16 }),
                    M.jsx('span', { children: 'Your loadout' }),
                    !noLoadout && M.jsx('button', { className: 'pv-link', onClick: () => onPick('loadout'), children: 'Change' }),
                  ],
                }),
                M.jsx(__PvWeapon, { wp: A.weapons[1], label: 'Primary' }),
                M.jsx(__PvWeapon, { wp: A.weapons[2], label: 'Sidearm' }),
                M.jsxs('div', {
                  className: 'pv-chips',
                  children: [
                    A.weapons[4] && M.jsx('span', { children: 'Frag grenade' }),
                    A.tactical && A.tactical.count > 0 && M.jsx('span', { children: { flash: 'Flashbang', smoke: 'Smoke', molotov: 'Molotov' }[A.tactical.kind] || A.tactical.kind }),
                    A.armor > 0 && M.jsx('span', { children: A.helmet ? 'Vest + helmet' : 'Vest' }),
                    A.defuseKit && M.jsx('span', { children: 'Defuse kit' }),
                  ],
                }),
              ],
            }),
          M.jsx(__PvQuick, {}),
        ],
      }),
      M.jsx('div', { className: 'pv-sub', children: 'Everything else' }),
      M.jsx('div', {
        className: 'pv-tiles',
        children: tiles.map((t) =>
          M.jsxs(
            'button',
            {
              className: 'pv-tile',
              onClick: () => onPick(t.id),
              children: [
                M.jsx('span', { className: 'pv-tile-ico', children: M.jsx(Pw, { name: t.icon, size: 20 }) }),
                M.jsxs('span', { className: 'pv-tile-txt', children: [M.jsx('b', { children: t.label }), M.jsx('span', { children: t.desc })] }),
              ],
            },
            t.id,
          ),
        ),
      }),
    ],
  });
};
typeof window < 'u' && (window.__bpPauseThumbs = __PV);
