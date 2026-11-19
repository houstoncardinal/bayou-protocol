/* ===== Bayou Protocol mod: focused mode list ===== */
// (Gun Ladder is added back, with its name, by 92-pacing.js; Domination, Tag Hunt and Hot Zone stay out.)
(function () {
  for (const k of ['dom', 'kc', 'hp', 'gungame']) delete Eg[k];
  delete Eg.ctf;
  const order = ['tdm', 'ffa', 'bomb'];
  const txt = {
    tdm: 'Respawn and fight. First team to the kill limit wins.',
    ffa: 'Everyone for themselves. First to the kill limit wins.',
    bomb: 'One life a round, a buy menu, plant or defuse.',
  };
  gF.splice(0, gF.length, ...order.map((k) => [k, txt[k]]));
  CN.splice(0, CN.length, 'tdm', 'ffa', 'bomb');
  try {
    const st = Zw.getState();
    // (a saved mode added back by a later mod, Gun Ladder or High Roller, is kept: only retired ones reset)
    st.setup({ scores: { ...oU, ...st.scores }, mode: [...order, 'gungame', 'hr'].includes(st.mode) ? st.mode : 'tdm' });
  } catch (e) {}
})();
