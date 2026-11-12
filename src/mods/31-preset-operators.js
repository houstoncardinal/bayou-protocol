/* ===== Bayou Protocol mod: preset operators only ===== */
// The game uses exactly five Counter-Terrorist and five Terrorist operators (25-operators.js) with fixed
// looks. Every customisation path is removed:
//   - the Operators "studio" screen (body/colour/camo/gear editor, Shuffle, Default look, photo-to-avatar)
//     is replaced by a Profile screen that only holds your callsign
//   - the operator step in Play offline is a plain picker: choose one of the five, see them, done
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
// ---------- operator step in Play offline ----------
kIA = function ({ team: w }) {
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
