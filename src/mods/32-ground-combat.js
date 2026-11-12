/* ===== Bayou Protocol mod: ground combat only ===== */
// Bayou Protocol is good guys against bad guys on foot, with the guns you carry. Removed everywhere:
//   - scorestreaks: no UAV radar reveal, no airstrike, no Aegis shield; the reward bar on the HUD, the
//     "Call in scorestreak" key binding and touch button, the daily challenge and the tips are gone
//   - timed power-up pads in respawn modes: no rocket launcher pad, no Overdrive (damage boost) pad, no Aegis
//     pad, and their radar countdowns
//   - the rocket launcher itself: out of the buy menu, loadouts, level unlocks, gun game and bot buys
// Kill streak medals ("Hot Streak", "Streak Breaker") are just medals and stay.
wY.length = 0;
V1 = () => {};
KiA = () => null;
d1 = () => [];
// the rocket launcher
{
  const drop = (arr, test) => {
    for (let i = arr.length - 1; i >= 0; i--) test(arr[i]) && arr.splice(i, 1);
  };
  drop(fQ, (x) => x.id === 'rpg');
  drop(uI, (x) => x === 'rpg');
  drop(OwA, (x) => x === 'rpg');
  drop(BG, (b) => b.kind === 'weapon' && b.id === 'rpg');
  const coreBuy = CB;
  CB = function (w, A, i, I) {
    return i === 'rpg' ? 'Not available' : coreBuy.apply(this, arguments);
  };
  try {
    const z = Zw.getState();
    z.loadout === 'rpg' && z.setup({ loadout: 'rifle' });
  } catch (e) {}
}
{
  const i = Pn.findIndex((b) => b.id === 'streak');
  i >= 0 && Pn.splice(i, 1);
}
{
  const i = jwA.findIndex((c) => c.stat === 'streaksUsed');
  i >= 0 && jwA.splice(i, 1);
}
for (let i = oF.length - 1; i >= 0; i--) {
  const t = oF[i][1] || '';
  if (/Scorestreaks fill/.test(t)) oF.splice(i, 1);
  else if (/Aegis shield|Overdrive|rocket launcher/i.test(t)) oF.splice(i, 1);
}
