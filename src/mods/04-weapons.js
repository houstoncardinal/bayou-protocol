/* ===== Bayou Protocol mod: weapons ===== */
(function () {
  const NEW = {
    warden: {
      id: 'warden',
      name: 'Warden 9',
      slot: 2,
      price: 450,
      damage: 30,
      rate: 0.11,
      auto: !1,
      mag: 17,
      reserve: 51,
      reload: 1.85,
      spread: 0.0032,
      moveSpread: 0.028,
      recoil: 0.0095,
      pellets: 1,
      range: 60,
      falloff: 0.065,
      armorPen: 0.56,
      headMult: 4,
      speed: 6.35,
      killReward: 350,
      adsZoom: 1.25,
      pen: 0.75,
    },
    sentinel: {
      id: 'sentinel',
      name: 'Sentinel Carbine',
      slot: 1,
      price: 3000,
      damage: 31,
      rate: 0.072,
      auto: !0,
      mag: 30,
      reserve: 90,
      reload: 2.25,
      spread: 0.0017,
      moveSpread: 0.042,
      recoil: 0.0072,
      pellets: 1,
      range: 135,
      falloff: 0.016,
      armorPen: 0.78,
      headMult: 3.8,
      speed: 5.7,
      killReward: 250,
      adsZoom: 1.55,
      pen: 1.5,
    },
    bastion: {
      id: 'bastion',
      name: 'Bastion 7.62',
      slot: 1,
      price: 3350,
      damage: 44,
      rate: 0.1,
      auto: !0,
      mag: 20,
      reserve: 80,
      reload: 2.7,
      spread: 0.0021,
      moveSpread: 0.065,
      recoil: 0.0138,
      pellets: 1,
      range: 160,
      falloff: 0.012,
      armorPen: 0.88,
      headMult: 3.6,
      speed: 5.15,
      killReward: 250,
      adsZoom: 1.75,
      pen: 2.1,
    },
    rampart: {
      id: 'rampart',
      name: 'Rampart 7.62',
      slot: 1,
      price: 3200,
      damage: 42,
      rate: 0.096,
      auto: !0,
      mag: 20,
      reserve: 80,
      reload: 2.45,
      spread: 0.0024,
      moveSpread: 0.058,
      recoil: 0.0145,
      pellets: 1,
      range: 140,
      falloff: 0.014,
      armorPen: 0.86,
      headMult: 3.6,
      speed: 5.4,
      killReward: 250,
      adsZoom: 1.5,
      pen: 2,
    },
    phantom: {
      id: 'phantom',
      name: 'Phantom 12.7',
      slot: 1,
      price: 4900,
      damage: 104,
      rate: 1.55,
      auto: !1,
      mag: 5,
      reserve: 20,
      reload: 3.6,
      spread: 0.075,
      moveSpread: 0.13,
      recoil: 0.046,
      pellets: 1,
      range: 150,
      falloff: 0.09,
      armorPen: 0.9,
      headMult: 4,
      speed: 4.7,
      killReward: 150,
      adsZoom: 1.5,
      pen: 2.4,
      scope: 3,
    },
    midas: {
      id: 'midas',
      name: 'Midas 7.62',
      slot: 1,
      price: 3600,
      damage: 37,
      rate: 0.105,
      auto: !0,
      mag: 30,
      reserve: 90,
      reload: 2.6,
      spread: 0.0024,
      moveSpread: 0.06,
      recoil: 0.0116,
      pellets: 1,
      range: 125,
      falloff: 0.023,
      armorPen: 0.8,
      headMult: 4,
      speed: 5.35,
      killReward: 250,
      adsZoom: 1.4,
      pen: 1.9,
    },
  };
  Object.assign(gw, NEW);
  const ren = {
    ak47: { name: 'Kodiak 7.62', price: 2600 },
    m16: { name: 'Lancer SR', price: 3050 },
    hk416: { name: 'Talon 5.56', price: 2950 },
    rpg: { name: 'Ram-7 Launcher', price: 5400 },
    rifle: { price: 2850 },
    br: { price: 2650 },
    sniper: { price: 4600, killReward: 150 },
    deagle: { price: 750, killReward: 350 },
    pistol: { price: 200, killReward: 350 },
    smg: { price: 1300, killReward: 550 },
    shotgun: { price: 1400, killReward: 750 },
    flamer: { price: 3800, killReward: 500 },
    lmg: { price: 5000, killReward: 250 },
    knife: { killReward: 1250 },
    grenade: { price: 350 },
  };
  for (const k in ren) Object.assign(gw[k], ren[k]);
  for (const k of ['rifle', 'br', 'ak47', 'm16', 'hk416', 'rpg']) gw[k].killReward = 250;
  Object.assign(gw.smg, { recoil: 0.006 });
  Object.assign(gw.lmg, { recoil: 0.0095 });
  Object.assign(gw.m16, { recoil: 0.0064 });
  gw.hk416 && Object.assign(gw.hk416, { recoil: 0.0069 });
  Object.assign(qO, {
    phantom: 'sniper',
    rampart: 'rifle',
    warden: 'pistol',
    sentinel: 'rifle',
    bastion: 'rifle',
    midas: 'rifle',
  });
  Object.assign(iU, {
    warden: { onset: 1, freq: 1.2, phase: 0.5, amp: 0.35, bias: 0, vert: 0.9 },
    sentinel: { onset: 4, freq: 0.62, phase: 0.4, amp: 0.48, bias: -0.03, vert: 0.86 },
    bastion: { onset: 2, freq: 0.36, phase: 0, amp: 0.85, bias: 0.16, vert: 1.28 },
    rampart: { onset: 2, freq: 0.42, phase: 0.6, amp: 1, bias: 0.12, vert: 1.32 },
    phantom: { onset: 1, freq: 1, phase: 0, amp: 0.25, bias: 0.05, vert: 1.1 },
    midas: { onset: 6, freq: 0.45, phase: Math.PI, amp: 1.15, bias: 0.1, vert: 1.04 },
  });
  Object.assign(VwA, {
    phantom: [0.07, 0.12, 0.03, 0.06],
    rampart: [0.046, 0.085, 0.024, 0.046],
    warden: [0.026, 0.1, 0.018, 0.04],
    sentinel: [0.024, 0.04, 0.012, 0.024],
    bastion: [0.042, 0.08, 0.02, 0.04],
    midas: [0.033, 0.058, 0.022, 0.042],
  });
  Object.assign(z1, {
    warden: { ...z1.pistol, blast: 2800, boomGain: 0.5, vol: 0.78 },
    sentinel: { ...z1.hk416, blast: 2350, vol: 0.98 },
    bastion: { ...z1.ak47, blast: 1500, boom: [120, 38], boomGain: 1.1, vol: 1.15 },
    midas: { ...z1.ak47, blast: 1650, vol: 1.1 },
    phantom: { ...z1.sniper },
    rampart: { ...z1.ak47, blast: 1450, boom: [110, 36], boomGain: 1.2, vol: 1.2 },
  });
  // shop
  const find = (id) => fQ.find((x) => x.id === id),
    set = (id, o) => {
      const x = find(id);
      x && Object.assign(x, o);
    };
  set('pistol', { label: 'P9 Pistol', price: 200, hint: 'Reliable 12-round sidearm' });
  set('deagle', { price: 750, hint: 'Hand cannon. One-tap headshots' });
  set('smg', { price: 1300, hint: 'Fast and cheap. $550 per kill' });
  set('shotgun', { price: 1400, hint: 'Brutal up close. $750 per kill' });
  set('ak47', { label: 'Kodiak 7.62', price: 2600, hint: 'Hardest-hitting standard rifle; climbs hard' });
  set('br', { price: 2650, hint: 'Three-round burst, 1.8× optic' });
  set('rifle', { price: 2850, hint: 'Accurate when you stop to shoot' });
  set('hk416', { label: 'Talon 5.56', price: 2950, hint: 'Piston carbine: fast, flat and controllable' });
  set('m16', { label: 'Lancer SR', price: 3050, hint: 'Long-barrel rifle. Accurate at range' });
  set('sniper', { price: 4600, hint: 'Right-click to scope. One shot body kills' });
  set('flamer', { price: 3800, hint: 'Sets people alight. Nine metres of fire. $500 per kill' });
  set('lmg', { price: 5000 });
  BD.push({
    id: 'range',
    name: 'Firing Range',
    blurb: 'A walled practice range with target dummies from 8 to 55 metres.',
    size: 'Small',
    maxPlayers: 6,
  });
  {
    const b = BD.find((x) => x.id === 'sandstorm');
    b &&
      (b.blurb =
        'A walled desert market town. A roofed bazaar hall in the centre, a raised plaza at A to the north, a paved courtyard at B to the south, and side cuts linking every street.');
  }
  set('rpg', { label: 'Ram-7 Launcher', price: 5400 });
  set('armor', { label: 'Ballistic Vest', price: 600, hint: 'Halves body damage' });
  set('helmet', { label: 'Vest + Helmet', price: 950 });
  set('kit', { price: 350, hint: 'Defuse in 6 s instead of 10' });
  set('grenade', { price: 350 });
  set('flash', { price: 250 });
  set('smoke', { price: 350 });
  set('molotov', { price: 550 });
  set('ammo', { price: 250 });
  set('optic', { price: 300 });
  set('suppressor', { price: 450 });
  set('extmag', { price: 350 });
  const ins = (after, item) => {
    const i = fQ.findIndex((x) => x.id === after);
    fQ.splice(i + 1, 0, item);
  };
  ins('sniper', {
    id: 'phantom',
    label: 'Phantom 12.7',
    price: 4900,
    hint: 'Silenced 12.7 mm bolt-action. No flash, off the radar, 3× scope. Loses punch past 60 m',
    cat: 'rifles',
  });
  ins('pistol', {
    id: 'warden',
    label: 'Warden 9',
    price: 450,
    hint: '17-round striker pistol. Fast, flat follow-ups',
    cat: 'pistols',
  });
  ins('m16', {
    id: 'sentinel',
    label: 'Sentinel Carbine',
    price: 3000,
    hint: 'Compact 5.56 carbine. ~830 rpm, very controllable',
    cat: 'rifles',
  });
  ins('sentinel', {
    id: 'rampart',
    label: 'Rampart 7.62',
    price: 3200,
    hint: 'Compact 7.62 battle rifle. ~625 rpm, hits hard, kicks harder',
    cat: 'rifles',
  });
  ins('rampart', {
    id: 'bastion',
    label: 'Bastion 7.62',
    price: 3350,
    hint: 'Suppressed 7.62 battle rifle. 20 rounds that hit like a truck',
    cat: 'rifles',
  });
  ins('bastion', {
    id: 'midas',
    label: 'Midas 7.62',
    price: 3600,
    hint: 'Gilded match-grade 7.62. Tighter than the Kodiak',
    cat: 'rifles',
  });
  Xl.push('warden', 'sentinel', 'bastion', 'midas', 'rampart', 'phantom');
  J8.push('sentinel', 'sentinel', 'bastion', 'midas', 'rampart');
  OwA.push('sentinel', 'rampart', 'bastion', 'midas', 'phantom');
  YwA.push('warden');
  for (const b of BG) {
    if (b.id === 'ak47') b.name = 'Kodiak 7.62';
    if (b.id === 'hk416') b.name = 'Talon 5.56';
    if (b.id === 'm16') b.name = 'Lancer SR rifle';
    if (b.id === 'rpg') b.name = 'Ram-7 launcher';
  }
  BG.push(
    { level: 2, kind: 'weapon', id: 'warden', name: 'Warden 9 pistol' },
    { level: 4, kind: 'weapon', id: 'sentinel', name: 'Sentinel Carbine' },
    { level: 5, kind: 'weapon', id: 'rampart', name: 'Rampart 7.62' },
    { level: 6, kind: 'weapon', id: 'bastion', name: 'Bastion 7.62' },
    { level: 10, kind: 'weapon', id: 'phantom', name: 'Phantom 12.7 silenced sniper' },
    { level: 9, kind: 'weapon', id: 'midas', name: 'Midas 7.62 (gold)' },
  );
  BG.sort((a, b) => a.level - b.level);
})();
