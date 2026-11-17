/* ===== Bayou Protocol mod: focused mode list ===== */
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
    st.setup({ scores: { ...oU, ...st.scores }, mode: order.includes(st.mode) ? st.mode : 'tdm' });
  } catch (e) {}
})();
