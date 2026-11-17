# Positional audio

Sound goes through one Web Audio graph (`src/mods/20-audio-engine.js`, the voice router `xw`;
`29-audio-samples.js` picks the recorded samples).

- **Direction.** Every positional sound within 70 m is placed with an HRTF panner (front, behind, above and below,
  best through headphones). Up to 28 at once, nearest first; further and extra sounds use equal-power panning. The
  listener follows the camera's position and the direction you face.
- **Distance.** Inverse fall-off (reference 2.5 m), a low-pass that darkens far sounds, and the speed of sound for
  gunfire and explosions (a far shot is heard after the muzzle flash).
- **Walls.** A sound with no line of sight to you goes through a 900 Hz low-pass at 45 % level.
- **Rooms.** Two reverbs (indoor and outdoor), chosen by whether the sound is under a roof.
- **Footsteps.** Everyone's footsteps, at their feet, carry 40 m (running louder). Walking (Shift) and crouching are
  silent, as in other tactical shooters.
- **Voices.** Up to 72 at once; the quietest and furthest are dropped first, your own sounds never.
- **Films** (the cinema, the prison TV): the room's own sound only (`70-screens.js`).
