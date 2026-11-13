/* ===== Bayou Protocol mod: movement tuning (read by the core's player update) ===== */
// Competitive, readable movement. Before: every gun ran at 5.4-6.35 m/s, sprint x1.36 (up to 8.6 m/s), and
// velocity reached 63% of a new direction in one twentieth of a second, so players and bots could reverse a
// full-speed strafe in a single frame: too fast to track, and it looked like teleporting.
//   k       0.82   overall speed (rifle run ~4.7 m/s, pistol ~5.2, LMG ~3.8)
//   walk    0.42   walk key (quiet) ~2 m/s with a rifle (within the side-step clip, so walking strafes step)
//   back    0.80   moving backwards is slower than forwards
//   sprint  1.30   sprint on top of the run
//   acc     9.5    ground acceleration (1/s): ~0.3 s to full speed, ~0.2 s to reverse a strafe
//   dec     13     ground friction with no input: stops in ~0.25 s (counter-strafing still works)
//   tag     0.6    being hit slows you to 60% for tagT = 0.3 s (tagging, as in competitive shooters)
// Crouching (x0.4), aiming down sights (x0.65), limping and air control are unchanged.
const __MV = { k: 0.82, walk: 0.42, back: 0.8, sprint: 1.3, acc: 9.5, dec: 13, tag: 0.6, tagT: 0.3 };
