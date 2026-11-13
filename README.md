# Bayou Protocol

A browser tactical first-person shooter built on three.js and React Three Fiber.
Modes: Team Deathmatch, Free-for-All, Capture the Flag, Bomb Defusal, plus a Firing Range.
Runs on desktop (mouse and keyboard, gamepad) and on phones and tablets (touch, landscape).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173, reloads when you edit a mod or a style
npm run build      # production build in dist/
npm run preview    # serve the production build locally
```

Requires Node 18 or newer.

## Project layout

```
index.html                 Page shell: meta tags, loading screen, #root
src/
  main.js                  Entry point: loads styles, then the engine core
  styles/
    base.css               The game's original stylesheet (compiled)
    ui.css                 Buy menu, end screen, HUD, mobile layout, rank cards
  mods/                    Game features, one file each, loaded in file-name order
    00-environment-shims.js    Safe loading in sandboxed frames
    01-mouse-capture.js        Pointer lock handling and free-aim fallback
    02-weapon-models.js        Loader for the GLB weapon models
    03-ballistic-fx.js         Bullet streaks, muzzle flash, smoke, shell casings
    04-weapons.js              Weapon stats, recoil, shop prices, unlocks
    05-netcode-and-bots.js     Hit validation, movement limits, bot site logic
    06-capture-the-flag.js     Capture the Flag rules, bots, flags, network sync
    07-modes.js                Which modes are offered
    08-fullscreen.js           Full screen and Esc handling
    09-ui-screens.js           Buy menu, end-of-match screen, HUD overlay, colour-blind palettes
    10-weapon-rigs.js          Animated first-person arms (Kodiak, Midas, Sentinel)
    11-firing-range.js         Firing Range map and mode
    12-hit-audio.js            Hit, headshot and kill sounds
    13-rank-and-season.js      Ranked rating and season track
    14-bomb-online-and-weapon-weight.js   Online Bomb Defusal sync, gun weight and cycling
    15-mobile.js               Landscape-only, full screen requests on touch devices
    16-label-line-of-sight.js  World labels hidden behind walls
    17-touch-defaults-migration.js
    18-surface-detail.js       Surface relief and texture filtering
    19-responsive.js           Window-size variables (--hud-s, swat-short, swat-narrow) for responsive HUD and menus
    20-audio-engine.js         Voice manager: frees finished sound chains, caps voices, keeps audio alive
    21-buy-menu-mouse.js       Frees the cursor while the buy menu is open (hover, scroll, click to buy)
    22-stance-accuracy.js      Spread model: crouching and aiming always tighten spread and the crosshair
    23-theme-and-home.js       Dark theme (the only theme) and the one-screen home dashboard
    24-vegetation.js           Fir, conifer, cactus and daisy models placed per map setting
    29-audio-samples.js        Recorded-sample sound engine (falls back to the synth per sound)
    30-frag-grenade.js         Frag grenade model in hand and in flight (CC BY-ND, unmodified)
    31-preset-operators.js     Preset operators only (no customisation); Profile screen holds the callsign
    32-ground-combat.js        No scorestreaks (UAV, airstrike, Aegis), no power-up pads, no rocket launcher
    33-knife.js                Animated first-person knife (knife_animated.glb): idle, slashes, stabs
    34-physics.js              Rapier physics: world per map, character controller, grenades, props, rays
    35-prison.js               Blackwater Penitentiary map
    36-precision-input.js      Mouse: same aim sensitivity on every gun, DPI keeps cm/360, raw-input status
    37-characters.js           The 8 Mixamo character models, shared animations, locomotion, <GameCharacter>
    38-performance.js          Scenery instancing, shader warm-up, frame statistics
    39-animated-weapons.js     Hornet .45, Mauler 12, Kestrel 9, Anvil 7.62, Striker 17: animated arms, clips,
                               shell-by-shell reload, slide lock, physics casings, inspect key (X)
    40-body.js                 Foot IK on stairs and slopes; hitboxes built from each character's skeleton
    41-world-collision.js      Colliders for placed models and cacti that had none
    42-smooth.js               Viewmodel memory leak fix, background shader compile, meshopt decoder,
                               character and third-person gun levels of detail, menu preloading, FPS readout
    43-impacts.js              Bullet holes and blood only on drawn surfaces; blood mist, droplets, spatter, pools
    44-bot-behaviour.js        Bots hold crouch decisions and walk while fighting (no bobbing, no scrambling)
    45-weapon-roster.js        Model-based weapons only; removed guns remap to their closest replacement
    46-credits.js              About screen credits (kept in step with CREDITS.md)
    47-pause-menu.js           Esc menu: match card, overview with loadout pictures and quick settings
tools/
  build-characters.mjs       FBX characters + Mixamo animations -> optimised GLBs (public/game/characters)
  build-weapons.mjs          Animated first-person weapon GLBs -> optimised GLBs (public/game/models/weapons)
  optimize-models.mjs        meshopt-compresses every GLB under public/game (run after adding models)
  inspect-glb.mjs            What takes the space in a GLB (textures, geometry, animation)
  optimize-vegetation.mjs    Simplifies heavy vegetation meshes (trunks, cactus bodies)
  build-gunshots.mjs         Builds all weapon sounds from assets-src/soundfx (slices shots, layers, encodes)
  fetch-freesound.mjs        Downloads CC0 Freesound effects for every sound key (needs a free API key)
  import-audio.mjs           Adds your own recordings (e.g. Sonniss) to a sound key, converts to Opus
assets-src/                  Full-size source assets. Not shipped; optimised copies live in public/
  characters/<faction>/      Character FBX from Mixamo (kept out of git: several are over GitHub's 100 MB limit)
  animations/                Mixamo animation FBX (without skin), shared by every character
  weapons/                   Animated arms + gun GLBs as downloaded (the G17 source is over 100 MB: kept out of git)
core/
  game.core.js             The engine core (compiled, see below)
public/game/               Models (.glb), textures, sky maps and fonts as real files
docs/ENGINE_API.md         Engine internals the mods rely on
vite.config.js             Vite config and the plugin that loads the mods
```

## How the code is organised

The game was originally a single compiled HTML file, so the engine core
(`core/game.core.js`) is minified JavaScript, not hand-written source. It holds
three.js, React, the renderer, the simulation, bots, netcode and the menus.

Everything added since then lives in `src/mods` as readable files. At build time
`vite.config.js` splices the mods into the core at the `/*__BAYOU_MODS__*/`
marker, in file-name order. Because they run inside the core's module scope,
mods can read and change engine internals directly. `docs/ENGINE_API.md` lists
the ones that matter.

A few changes had to be made inside the core itself (for example the hooks that
call into the mods). Those are already applied in `core/game.core.js`.

### Common tasks

- **Add or replace a character:** put the FBX in `assets-src/characters/counter-terrorists/` or
  `terrorists/`, run `node tools/build-characters.mjs --chars`, then list the file in `__CHAR.files` and
  give an operator its `model` in `src/mods/37-characters.js`.
- **Add an animation:** put the Mixamo FBX (without skin, "In Place" for walks and runs) in
  `assets-src/animations/` and run `node tools/build-characters.mjs --anims`. The clip is named after the
  file ("Rifle Walk.fbx" -> `RifleWalk`).
- **Add an animated weapon:** put the GLB in `assets-src/weapons/`, add it to `MAP` in
  `tools/build-weapons.mjs` and run it, then add an entry to `__AW` (model, gun node name, clip time ranges)
  and `__AW_STATS` in `src/mods/39-animated-weapons.js`. To find the clip ranges, chart which gun parts
  move when, then check rendered frames: `window.__bpRigSheet(url, times)` renders the model at given times.
- **Check hitboxes:** `window.__bpHitboxes = true` in the browser console draws every character's capsules.
- **Show a character anywhere** (menus, cut-scenes): `<GameCharacter faction="terrorists"
  fileName="t-guy-1.fbx" currentAnimation="FiringRifle" />` inside `<Suspense>`; in a mod,
  `M.jsx(GameCharacter, { ... })`. See the comment above `GameCharacter` in `37-characters.js`.

- **Tune a weapon:** edit its entry in `src/mods/04-weapons.js` (damage, fire
  rate, magazine, recoil, price).
- **Add a weapon model:** put a `.glb` in `public/game/models`, add an entry to
  the table at the top of `src/mods/02-weapon-models.js`, and add its stats in
  `04-weapons.js`.
- **Change the HUD or menus:** `src/styles/ui.css`, and the React components in
  `src/mods/09-ui-screens.js`.
- **Change touch controls:** positions are in the core (search for `tc-right`);
  look and feel is in `ui.css` under "touch HUD".
- **Debug in the browser console:** `window.cds` is the game controller and
  `window.cdsUi` is the UI store.

## Physics

Rapier 3D (`@dimforge/rapier3d-compat`) runs the physics; three.js renders. `src/mods/34-physics.js`:

- One Rapier world per map, built from the map's boxes (every wall, floor, stair, door, window), stepped
  at a fixed 1/60 s from an accumulator, with interpolation for anything drawn from it.
- Players and bots move with Rapier's kinematic character controller (capsule, step climbing, slopes,
  snap to ground, walls and ceilings), so the game's own speeds, jump height and air control are kept.
- Hitscan, line of sight and rockets cast rays through Rapier (verified identical to the old caster on
  2,000 random rays). Thrown grenades are rigid bodies with CCD; explosions push players and props.
- Props (`map.physProps`) can be pushed, shot and knocked over; crates break into planks. Online, props
  run on each screen and never block shots, so they cannot desync a match.
- `window.__phx.stats()` and `window.__perf()` in the browser console show what is running.

## Asset pipeline

Keep two copies of every heavy asset:

- `assets-src/` holds the originals exactly as downloaded (GLB/FBX, WAV). Nothing here is served or
  deployed. Commit it with Git LFS, or keep it out of git and back it up separately.
- `public/game/` holds only what the browser loads, already optimised:
  - `models/` GLB with textures at 1024 px (512 px for small props) in WebP, duplicate data removed.
    Characters and first-person arms keep their skeleton and animation clips in the same GLB.
  - `models/veg/`, `models/chars/`, `models/arms/` one folder per kind, file names in kebab-case.
  - `audio/<category>/...` 48 kHz Opus-in-OGG at 128 kbps (about 10x smaller than WAV), listed in
    `audio/manifest.json`. Loops (ambience) at 96 kbps.
  - `textures/` 1-2k JPEG/WebP; normal maps stay PNG or WebP lossless.

After adding or replacing any model, run `node tools/optimize-models.mjs`: it meshopt-compresses geometry
and animation (about 40% smaller; the game registers the decoder) and skips files already done.

Optimise a model's textures (resize, WebP, dedupe) with gltf-transform:

```bash
npx @gltf-transform/cli resize assets-src/models/foo.glb /tmp/a.glb --width 1024 --height 1024
npx @gltf-transform/cli webp /tmp/a.glb /tmp/b.glb --quality 82
npx @gltf-transform/cli dedup /tmp/b.glb public/game/models/veg/foo.glb
```

Load big assets lazily (only on maps that use them), as `24-vegetation.js` does, so the first load
stays small.

## Deploying

`npm run build` produces a static site in `dist/`. Host it anywhere that serves
static files. The build uses relative paths, so it also works from a sub-folder.

- **Netlify:** connect the repository. `netlify.toml` already sets the build
  command and the publish folder.
- **Vercel:** import the repository. It detects Vite automatically.
- **GitHub Pages:** push to `main`. The workflow in
  `.github/workflows/deploy.yml` builds and publishes. Turn on Pages in the
  repository settings and choose "GitHub Actions" as the source.

Mouse lock and full screen need the game to run as its own page, which any of
these hosts gives you. On iPhone, "Add to Home Screen" from Safari launches it
without the browser bars.

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Bayou Protocol"
git branch -M main
git remote add origin https://github.com/<you>/bayou-protocol.git
git push -u origin main
```

## Asset credits

Every third-party model, sound, texture, library and font, with author, source link and licence, is listed in
[CREDITS.md](CREDITS.md) and shown in the game under About (`src/mods/46-credits.js`). When you add a model,
add it to both. Sketchfab downloads carry the author, title and licence in the file itself
(`asset.extras`), which is where the current list comes from.
