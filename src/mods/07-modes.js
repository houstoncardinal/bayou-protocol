/* ===== Bayou Protocol mod: focused mode list ===== */
(function () {
  for (const k of ['dom', 'kc', 'hp', 'gungame']) delete Eg[k];
  Eg.ctf = 'Capture the Flag';
  const order = ['tdm', 'ffa', 'ctf', 'bomb'];
  Object.assign(oU, { ctf: 3 });
  Object.assign(sBA, { ctf: ['Respawn', 'Team', 'Flags'] });
  Object.assign(CBA, { ctf: ['#2f6fb3', '#0e1726'] });
  const txt = {
    tdm: 'Respawn and fight. First team to the kill limit wins.',
    ffa: 'Everyone for themselves. First to the kill limit wins.',
    ctf: 'Steal the enemy flag from their base and bring it home while yours is safe. First to the capture limit wins.',
    bomb: 'One life a round, a buy menu, plant or defuse.',
  };
  gF.splice(0, gF.length, ...order.map((k) => [k, txt[k]]));
  CN.splice(0, CN.length, 'tdm', 'ffa', 'ctf', 'bomb');
  try {
    const st = Zw.getState();
    st.setup({ scores: { ...oU, ...st.scores }, mode: order.includes(st.mode) ? st.mode : 'tdm' });
  } catch (e) {}
})();
