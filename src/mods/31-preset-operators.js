/* ===== Bayou Protocol mod: preset operators only ===== */
// The game uses exactly five Counter-Terrorist and five Terrorist operators (25-operators.js) with fixed
// looks. Every customisation path is removed:
//   - the Operators "studio" screen (body/colour/camo/gear editor, Shuffle, Default look, photo-to-avatar)
//     is replaced by a Profile screen that only holds your callsign
//   - the Team step in Play offline: pick your side and one of its five operators, see them, done
//     (no Customise button, no editor panel, no "Custom" tags)
//   - saved custom looks are ignored and deleted; your free-for-all and online look is the operator you
//     picked for the Counter-Terrorists
try {
  localStorage.removeItem('cds-avatar');
  const d = pQ();
  if (d.custom && Object.keys(d.custom).length) {
    d.custom = {};
    ju(d);
  }
} catch (e) {}
// looks always come from the preset table
Is = function (w) {
  const t = (cs.find((x) => x.id === w) || {}).team || 'CT';
  return Qs(wQ[w] || Zd, t);
};
X$ = () => !1;
P9 = () => {};
N$ = () => {};
FQ = () => Is(is('CT'));
// ---------- Team step in Play offline: your side and your operator, in one ----------
// The side was a step of its own and the operator the next; now the two sides sit at the top of the
// operator list: tap one and its operators fill the list below, the stage shows the one you have.
function __poTeam() {
  const w = Zw(),
    desc = (a) =>
      w.mode === 'jb'
        ? a === 'CT'
          ? 'Guard the inmates: keep every cell shut till time runs out.'
          : 'Cut the cell locks and lead two inmates out to the van.'
        : w.mode === 'bomb'
          ? a === 'CT'
            ? 'Hold both sites. Retake and defuse if they plant.'
            : 'Get the bomb to A or B, plant it and protect it.'
          : a === 'CT'
            ? 'Disciplined, armoured and coordinated.'
            : 'Fast and aggressive. Hit hard, keep moving.';
  const side = (a) => {
    const J = ii[a],
      on = w.team === a;
    return M.jsxs(
      'button',
      {
        className: 'pt-side',
        'aria-pressed': on,
        style: { '--team': J.main, '--teamhi': J.light },
        onClick: () => on || w.setup({ team: a, operatorId: is(a) }),
        children: [
          M.jsx('span', { className: 'pt-emb', children: a === 'CT' ? M.jsx(yQ, { size: 34 }) : M.jsx(Pw, { name: 'bomb', size: 28, sw: 1.4 }) }),
          M.jsx('small', { children: a === 'CT' ? 'Counter-Terrorist unit' : 'The crew' }),
          M.jsx('b', { children: J.name }),
          on && M.jsx('span', { className: 'pt-check', children: M.jsx(Pw, { name: 'check', size: 13, sw: 2.6 }) }),
        ],
      },
      a,
    );
  };
  return M.jsx(kIA, {
    team: w.team,
    top: M.jsxs(M.Fragment, {
      children: [
        M.jsx('div', { className: 'pt-sides', role: 'group', 'aria-label': 'Team', children: ['CT', 'T'].map(side) }),
        M.jsx('p', { className: 'pt-desc', children: desc(w.team) }),
      ],
    }),
  });
}
if (typeof document < 'u') {
  const st = document.createElement('style');
  st.textContent = [
    '.pt-sides{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:none}',
    '.pt-side{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:11px 12px 12px;border-radius:12px;border:1px solid var(--lx-line);background:linear-gradient(160deg,color-mix(in srgb,var(--team) 14%,#141a22),#0e1319);color:var(--lx-bone);text-align:left;cursor:pointer;transition:border-color .2s,box-shadow .2s,background .2s,transform .15s}',
    '.pt-side:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--teamhi) 55%,transparent)}',
    '.pt-side[aria-pressed=true]{border-color:var(--teamhi);background:linear-gradient(160deg,color-mix(in srgb,var(--team) 40%,#141a22),#0e1319);box-shadow:inset 0 0 0 1px var(--teamhi),0 10px 28px -12px var(--team)}',
    '.pt-emb{height:34px;display:grid;place-items:center;color:var(--teamhi);margin-bottom:2px}',
    '.pt-side small{font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;opacity:.72}',
    '.pt-side b{font-family:var(--lx-display);font-size:21px;font-weight:800;text-transform:uppercase;line-height:.95;color:var(--teamhi);word-break:break-word}',
    '.pt-check{position:absolute;top:9px;right:9px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--teamhi);color:#0d1117}',
    '.pt-desc{margin:0 2px 2px;font-size:12.5px;line-height:1.4;color:color-mix(in srgb,var(--lx-bone) 62%,transparent)}',
    '@media (max-width:899px){.pt-side b{font-size:18px}.pt-side{padding:10px}}',
  ].join('');
  document.head.appendChild(st);
}
// (the operator picker; `top` goes above its list: the Team step puts the two sides there)
kIA = function ({ team: w, top }) {
  const A = Zw(),
    [i, I] = S.useState(() => is(w));
  S.useEffect(() => I(is(w)), [w]);
  const pick = (f) => {
    du(w, f);
    I(f);
    A.setup({ operatorId: f });
  };
  const op = y9(w).find((f) => f.id === i) || y9(w)[0],
    [kind, desc] = op.role.split(' · ');
  return M.jsxs('div', {
    className: 'op-step',
    style: { '--team': ii[w].main },
    children: [
      M.jsxs('div', {
        className: 'op-col',
        children: [
          top || null,
          M.jsxs('div', { className: 'po-kick', children: [ii[w].name, ' · choose your operator'] }),
          M.jsx(iF, { team: w, value: op.id, onPick: pick }),
        ],
      }),
      M.jsxs('div', {
        className: 'op-stage',
        children: [
          M.jsx(DG, { avatar: Is(op.id), weapon: A.loadout, attach: A.attach }),
          M.jsx('div', {
            className: 'op-stage-cap',
            children: M.jsxs('div', {
              children: [M.jsx('div', { className: 'po-kick', children: kind }), M.jsx('b', { children: op.name }), desc && M.jsx('div', { className: 'lx-note', children: desc })],
            }),
          }),
        ],
      }),
    ],
  });
};
// ---------- Profile screen (replaces the Operators editor) ----------
SIA = function () {
  const w = Zw(),
    [name, setName] = S.useState(gD),
    dirty = name.trim() !== gD() && name.trim().length > 0;
  const save = () => {
    const n = name.trim() || 'Player';
    Pu(n);
    try {
      eA.online && eA.online.rename(n, Ng(FQ()));
    } catch (e) {}
    setName(n);
    w.setup({ profileRev: w.profileRev + 1 });
  };
  return M.jsx(ao, {
    footer: M.jsxs(M.Fragment, {
      children: [
        M.jsx('div', { className: 'lx-summary', children: dirty ? 'Unsaved changes' : 'Saved. Other players see this name online.' }),
        M.jsx('button', { className: 'lx-btn lx-btn--quiet', disabled: !dirty, onClick: () => setName(gD()), children: 'Undo' }),
        M.jsx('button', { className: 'lx-btn lx-btn--go', disabled: !dirty, onClick: save, children: 'Save' }),
      ],
    }),
    children: M.jsxs('div', {
      className: 'lx-page',
      style: { maxWidth: 620 },
      children: [
        M.jsx('div', { className: 'lx-kicker', children: 'Profile' }),
        M.jsx('h1', { className: 'lx-h1 mt-2.5', children: 'Callsign' }),
        M.jsx('p', {
          className: 'lx-note mt-3',
          children: 'The name shown on the scoreboard, kill feed and in online lobbies. Your operator is chosen per side when you set up a match.',
        }),
        M.jsx('input', {
          value: name,
          maxLength: 18,
          'aria-label': 'Callsign',
          onChange: (e) => setName(rd(e.target.value)),
          onKeyDown: (e) => e.key === 'Enter' && dirty && save(),
          className:
            'mt-5 w-full rounded-md border border-[color:var(--lx-line-hi)] px-3 py-2.5 text-[18px] font-semibold text-[color:var(--lx-bone)] outline-none focus:border-[color:var(--lx-brass)]',
          style: { background: 'var(--lx-glass-hi)' },
        }),
      ],
    }),
  });
};
