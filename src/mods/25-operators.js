/* ===== Bayou Protocol mod: Counter-Terrorist and Terrorist operators ===== */
// Ten operators, five per side. Each has a body id (ct1..ct5, t1..t5) that selects a hand-built outfit in
// 26-character-builder.js and a matching first-person arm set in 28-fp-arms.js. Ids of the roster entries
// (maya, jordan, ...) are kept so saved picks, bot slots and online sessions keep working.
//
// Outfit vocabulary used by the builder:
//   build   'm' | 'f' and proportions          head    hair / beard / headgear / eyewear / face cover
//   top     shirt cut, colour, camo             legs    trouser cut, colour, knee pads, boots
//   gear    vest type, pouches, belt, back      hands   gloves type and colour, watch, tattoo
const __OPS = {
  ct1: {
    roster: 'maya',
    name: 'Reyes',
    role: 'Pointman · first through the door, calls the stack',
    team: 'CT',
    build: { sex: 'f', height: 0.96, girth: 0.9, shoulders: 0.88 },
    skin: '#c98d6b',
    hair: { style: 'bun', color: '#2a1810' },
    face: { brows: '#2a1810', beard: null },
    head: { gear: 'fast', color: '#7d7056', nvg: !0, headset: !0, eyes: 'ballistic' },
    top: { cut: 'combat', color: '#7d7056', camo: 'multicam', sleeves: 'long' },
    legs: { cut: 'combat', color: '#6b604a', camo: 'multicam', knees: !0, boots: '#5a4a36' },
    gear: { vest: 'plate', color: '#8a7a5a', pouches: 'mag3', patch: 'CT', belt: 'battle', back: 'none', holster: !0 },
    hands: { gloves: 'full', color: '#8a7a5a', watch: !0 },
  },
  ct2: {
    roster: 'jordan',
    name: 'Kim',
    role: 'Marksman · holds the long angle, never peeks twice',
    team: 'CT',
    build: { sex: 'm', height: 1.0, girth: 0.95 },
    skin: '#e2b893',
    hair: { style: 'short', color: '#151312' },
    face: { brows: '#151312', beard: 'stubble' },
    head: { gear: 'cap', color: '#3f4a33', backwards: !0, headset: !0, eyes: 'shades' },
    top: { cut: 'combat', color: '#4d5a3c', camo: 'none', sleeves: 'long' },
    legs: { cut: 'cargo', color: '#4a5038', camo: 'none', knees: !1, boots: '#3a3328' },
    gear: { vest: 'rig', color: '#3d4a35', pouches: 'mag2', patch: 'CT', belt: 'battle', back: 'none', holster: !0 },
    hands: { gloves: 'fingerless', color: '#2b2f26', watch: !0 },
  },
  ct3: {
    roster: 'hale',
    name: 'Hale',
    role: 'Breacher · veteran team lead, shotgun on the door',
    team: 'CT',
    build: { sex: 'm', height: 1.02, girth: 1.08, shoulders: 1.07 },
    skin: '#b98a6a',
    hair: { style: 'buzz', color: '#3a2a20' },
    face: { brows: '#2a1e16', beard: 'goatee' },
    head: { gear: 'fast', color: '#1c1f24', nvg: !1, headset: !0, eyes: 'ballistic' },
    top: { cut: 'combat', color: '#1f2733', camo: 'none', sleeves: 'long' },
    legs: { cut: 'combat', color: '#1f2733', camo: 'none', knees: !0, boots: '#141518' },
    gear: { vest: 'heavy', color: '#1a1d22', pouches: 'shells', patch: 'POLICE', belt: 'battle', back: 'none', holster: !0 },
    hands: { gloves: 'full', color: '#16181b', watch: !1 },
  },
  ct4: {
    roster: 'ito',
    name: 'Ito',
    role: 'Support · radio, spare mags and steady rifle fire',
    team: 'CT',
    build: { sex: 'm', height: 0.98, girth: 1.0 },
    skin: '#e0b48f',
    hair: { style: 'short', color: '#121214' },
    face: { brows: '#121214', beard: null },
    head: { gear: 'fast', color: '#5a5e64', nvg: !1, headset: !0, eyes: 'none', cover: 'urban' },
    top: { cut: 'combat', color: '#5a5e64', camo: 'urban', sleeves: 'long' },
    legs: { cut: 'combat', color: '#4a4e55', camo: 'urban', knees: !0, boots: '#1c1d20' },
    gear: { vest: 'plate', color: '#3c4048', pouches: 'mag3', patch: 'CT', belt: 'battle', back: 'radio', holster: !0 },
    hands: { gloves: 'full', color: '#2a2d33', watch: !0 },
  },
  ct5: {
    roster: 'sam',
    name: 'Ortiz',
    role: 'Scout · quick rotations, light kit, eyes everywhere',
    team: 'CT',
    build: { sex: 'f', height: 0.95, girth: 0.88, shoulders: 0.86 },
    skin: '#8d5a3b',
    hair: { style: 'ponytail', color: '#140d0a' },
    face: { brows: '#140d0a', beard: null },
    head: { gear: 'none', headset: !0, eyes: 'none' },
    top: { cut: 'polo', color: '#1d2a40', camo: 'none', sleeves: 'rolled', text: 'POLICE' },
    legs: { cut: 'cargo', color: '#232a36', camo: 'none', knees: !1, boots: '#141518' },
    gear: { vest: 'rig', color: '#1b2433', pouches: 'mag2', patch: 'POLICE', belt: 'battle', back: 'none', holster: !0 },
    hands: { gloves: 'none', color: '#1b2433', watch: !0, tattoo: 'forearm' },
  },
  t1: {
    roster: 'priya',
    name: 'Shah',
    role: 'Leader · plans the hit, runs the cell',
    team: 'T',
    build: { sex: 'f', height: 0.96, girth: 0.92, shoulders: 0.88 },
    skin: '#a8714f',
    hair: { style: 'long', color: '#120c08' },
    face: { brows: '#120c08', beard: null },
    head: { gear: 'none', eyes: 'shades', scarf: 'neck', scarfColor: '#c9b48c' },
    top: { cut: 'jacket', color: '#4d4a32', camo: 'none', sleeves: 'long' },
    legs: { cut: 'cargo', color: '#3b3427', camo: 'none', knees: !1, boots: '#3a2a1c' },
    gear: { vest: 'rig', color: '#5c5a3e', pouches: 'ak3', patch: null, belt: 'leather', back: 'none', holster: !1 },
    hands: { gloves: 'none', color: '#3a2a1c', watch: !0 },
  },
  t2: {
    roster: 'theo',
    name: 'Okafor',
    role: 'Wildcard · loud, reckless, and annoyingly accurate',
    team: 'T',
    build: { sex: 'm', height: 1.02, girth: 1.02 },
    skin: '#5a3a26',
    hair: { style: 'buzz', color: '#0e0a08' },
    face: { brows: '#0e0a08', beard: 'full' },
    head: { gear: 'bandana', color: '#8a2a2a', eyes: 'none' },
    top: { cut: 'tshirt', color: '#2a2622', camo: 'none', sleeves: 'short' },
    legs: { cut: 'jeans', color: '#3a4658', camo: 'none', knees: !1, boots: '#d8d4cc', sneakers: !0 },
    gear: { vest: 'rig', color: '#3d3a2c', pouches: 'ak3', patch: null, belt: 'leather', back: 'none', holster: !1, open: !0 },
    hands: { gloves: 'none', color: '#2b2f26', watch: !1, tattoo: 'sleeve' },
  },
  t3: {
    roster: 'wrench',
    name: 'Wrench',
    role: 'Demolitions · plants fast, says nothing',
    team: 'T',
    build: { sex: 'm', height: 1.0, girth: 1.06, shoulders: 1.04 },
    skin: '#c99272',
    hair: { style: 'none', color: '#1a1410' },
    face: { brows: '#1a1410', beard: null },
    head: { gear: 'balaclava', color: '#1b1b1a', eyes: 'none' },
    top: { cut: 'hoodie', color: '#3b3226', camo: 'none', sleeves: 'long' },
    legs: { cut: 'cargo', color: '#4a4232', camo: 'none', knees: !1, boots: '#2a2018' },
    gear: { vest: 'utility', color: '#5c5a3e', pouches: 'demo', patch: null, belt: 'leather', back: 'pack', holster: !1 },
    hands: { gloves: 'work', color: '#8a6a3a', watch: !1 },
  },
  t4: {
    roster: 'crane',
    name: 'Crane',
    role: 'Planner · sharp jacket, sharper rifle',
    team: 'T',
    build: { sex: 'm', height: 1.03, girth: 0.94 },
    skin: '#d9a982',
    hair: { style: 'slick', color: '#2a1d14' },
    face: { brows: '#2a1d14', beard: 'stubble' },
    head: { gear: 'none', eyes: 'shades' },
    top: { cut: 'blazer', color: '#26262a', camo: 'none', sleeves: 'long', under: '#c9c3b6' },
    legs: { cut: 'slacks', color: '#2e2e33', camo: 'none', knees: !1, boots: '#18120e' },
    gear: { vest: 'none', color: '#2e2a22', pouches: 'none', patch: null, belt: 'leather', back: 'none', holster: !0, sling: !0 },
    hands: { gloves: 'leather', color: '#1c1410', watch: !0 },
  },
  t5: {
    roster: 'nova',
    name: 'Nova',
    role: 'Entry · first through the smoke, last to fall back',
    team: 'T',
    build: { sex: 'm', height: 0.98, girth: 0.96 },
    skin: '#8d5a3b',
    hair: { style: 'short', color: '#140d0a' },
    face: { brows: '#140d0a', beard: 'stubble' },
    head: { gear: 'beanie', color: '#3b3a30', eyes: 'none', scarf: 'face', scarfColor: '#b9a27a' },
    top: { cut: 'jacket', color: '#8a7a55', camo: 'none', sleeves: 'long' },
    legs: { cut: 'cargo', color: '#a39878', camo: 'desert', knees: !0, boots: '#5a4632' },
    gear: { vest: 'rig', color: '#6b6a42', pouches: 'ak3', patch: null, belt: 'leather', back: 'none', holster: !1, bandolier: !0 },
    hands: { gloves: 'fingerless', color: '#3b3226', watch: !1 },
  },
};
const __OP_BY_ROSTER = Object.fromEntries(Object.entries(__OPS).map(([k, v]) => [v.roster, k]));
const __opIsBody = (b) => !!__OPS[b];
// ---- roster names, roles and default looks ----
for (const [body, o] of Object.entries(__OPS)) {
  const r = cs.find((x) => x.id === o.roster);
  if (r) {
    r.name = o.name;
    r.role = o.role;
    r.team = o.team;
  }
  // the look string carries the body id; colours are filled from the outfit so menus show sensible swatches
  wQ[o.roster] = ne({
    body,
    skin: o.skin,
    hair: o.hair.color,
    top: o.top.color,
    bottom: o.legs.color,
    accent: '#14171c',
    gear: o.gear.color,
    pattern: 'none',
    head: 'none',
    eyes: 'none',
    face: 'none',
    vest: o.gear.vest === 'none' ? 'none' : o.gear.vest === 'rig' ? 'rig' : 'plate',
    pack: 'none',
    gloves: o.hands.gloves !== 'none',
    pads: !!o.legs.knees,
  });
  // body presets: build proportions read by the core (height/girth scaling, IK)
  Co[body] = {
    id: body,
    name: o.name,
    desc: o.role.split(' · ')[1] || o.role,
    build: yD({
      height: o.build.height ?? 1,
      girth: o.build.girth ?? 1,
      shoulders: o.build.shoulders ?? 1,
      chest: 1,
      hips: o.build.sex === 'f' ? 1.06 : 1,
      head: o.build.sex === 'f' ? 0.96 : 1,
    }),
    suggest: {},
    sig: [],
  };
  ng.body.includes(body) || ng.body.push(body);
}
// Saved custom looks from the old SWAT/Insurgent outfits would override the new operators; keep the
// player's pick but drop stale customisations once.
try {
  if (!localStorage.getItem('bp-ops-v1')) {
    localStorage.setItem('bp-ops-v1', '1');
    const d = pQ();
    d.custom = {};
    ju(d);
  }
} catch (e) {}
// Any look whose body is not one of ours (old saves, other players on older builds) is shown as the
// first operator of its side, so nobody appears in the old armour.
function __opForLook(look, team) {
  if (look && __OPS[look.body]) return look.body;
  return team === 'T' ? 't1' : 'ct1';
}
