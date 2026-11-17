# Bayou Protocol

A browser tactical first-person shooter built on three.js and React Three Fiber.
Modes: Bomb Defusal (with halftime and overtime), Team Deathmatch, Free-for-All, Jailbreak (Blackwater
Penitentiary only), and Theater Mode (the cinema with no guns, from its Home card).
Runs on desktop (mouse and keyboard, gamepad) and on phones and tablets (touch, portrait).

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
  main.js                  Entry point: loads styles, the engine core, then the map packages
  engine/three.js          'three' for code outside the core: the core's own three.js classes (one copy)
  maps/                    Map packages' own loaders, unchanged (ridgebackPass/: Ridgeback Pass v4)
  styles/
    base.css               The game's original stylesheet (compiled)
    ui.css                 Buy menu, end screen, HUD, mobile layout, rank cards
  mods/                    Game features, one file each, loaded in file-name order
    00-environment-shims.js    Safe loading in sandboxed frames
    00-three.js                Hands the core's three.js classes to src/engine/three.js
    00b-movement.js            Movement tuning: speeds, sprint, acceleration, backpedal, tagging
    01-mouse-capture.js        Pointer lock handling and free-aim fallback
    02-weapon-models.js        Loader for the GLB weapon models
    03-ballistic-fx.js         Bullet streaks, muzzle flash, smoke, shell casings
    04-weapons.js              Weapon stats, recoil, shop prices, unlocks
    05-netcode-and-bots.js     Hit validation, movement limits, bot site logic
    07-modes.js                Which modes are offered
    08-fullscreen.js           Full screen and Esc handling
    09-ui-screens.js           Buy menu, end-of-match screen, HUD overlay, colour-blind palettes
    10-weapon-rigs.js          Animated first-person arms (Kodiak, Midas, Sentinel)
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
    35-prison.js               Blackwater Penitentiary map (code-built): layout, collision, what each shape is
    36-precision-input.js      Mouse: same aim sensitivity on every gun, DPI keeps cm/360, raw-input status
    37-characters.js           Character roster (Mixamo models, plus Wraith), shared animations, 8-way rifle
                               locomotion, turning on the spot, upper-body reload / grenade toss / hit / recoil,
                               dying fallback, guns held in the animated hands, masks, <GameCharacter>
    38-performance.js          Scenery instancing, shader warm-up, frame statistics
    39-animated-weapons.js     Hornet .45, Mauler 12, Kestrel 9, Anvil 7.62, Striker 17, Phantom 12.7 (bolt
                               action), Sentinel M4A1 carbine: animated arms, clips, shell-by-shell reload, slide
                               lock, physics casings, inspect key (X)
    40-body.js                 Foot IK on stairs and slopes; hitboxes built from each character's skeleton
    41-world-collision.js      Colliders for placed models and cacti that had none
    42-smooth.js               Viewmodel memory leak fix, background shader compile, meshopt decoder,
                               character and third-person gun levels of detail, menu preloading, FPS readout
    43-impacts.js              Bullet holes and blood only on drawn surfaces; blood mist, droplets, spatter, pools
    44-bot-behaviour.js        Bots hold crouch decisions and walk while fighting (no bobbing, no scrambling)
    45-weapon-roster.js        Model-based weapons only; removed guns remap to their closest replacement
    46-credits.js              About screen credits (kept in step with CREDITS.md)
    47-pause-menu.js           Esc menu: match card, overview with loadout pictures and quick settings
    48-retarget.js             Characters on non-Mixamo skeletons (Wraith): bones renamed, Mixamo clips
                               retargeted, ragdoll spine fallback
    49-crates.js               Map crates drawn with the crate models (instanced), breakable crates too
    50-prisoners.js            Inmates (Mixamo Ch08) pacing the Blackwater cells and the dayroom (can be shot)
    52-fp-arms.js              Arms6 first-person arms on model-only guns: two-bone IK, finger curl, trigger pull
    53a-ridgeback-data.js      Ridgeback Pass heights, tunnel floors, decks, blocked cells, spawns (generated)
    53b-ridgeback.js           Ridgeback Pass v4: runs the package's loader (src/maps), adds spawns, sites,
                               callouts, Rapier meshes and clip walls, bots' walk grid, radar minimap, preload;
                               retires Dune Market, Dry Gulch, Reactor, Cell Block and the Firing Range
    54-speed.js                Menus: background match at 30 fps, low resolution, 6 bots, shadows once a second;
                               shaders of loaded models compiled in the background so matches start fast
    55-competitive.js          Bomb Defusal halftime side swap and overtime; Blood setting; production builds
                               drop the debug hooks from window (add ?debug to keep them)
    56-memory.js               GPU memory stays flat over long sessions: bone textures, canvas textures and
                               old gun models are released after each match; gun cache capped
    57-telemetry.js            Optional production error and performance reports (set VITE_REPORT_URL)
    58-pathfinding.js          Bot pathfinding: unreachable goals refused at once (no full-grid searches)
    59-lights.js               Light budget: a fixed, small number of point lights drawn (was 17 per pixel)
    60-long-range.js           Bullets travel 800 m (damage still falls with distance); first-shot accuracy
    61-frostline.js            Frostline (snow map): layout rules and timings in docs/maps/frostline.md
    62-frostline-detail.js     Frostline in 3D: cliff faces, cavern vaults and portals, stone arches, pavilion, cover
    63-frostline-christmas.js  Frostline's Christmas decorations: trees, lights, presents, cabins, snowmen, garlands
    64-frostline-rooms.js      Frostline's hidden caverns furnished: Santa's Workshop, Crystal Cavern, Fireside Lodge
    65-prison-view.js          Blackwater in 3D: Poly Haven materials on every surface, a baked light volume
                               (daylight through openings, lamp light per room), the sky; see docs/maps/prison.md
    66-prison-detail.js        Blackwater's architecture and metalwork: cell bars, chain-link and razor wire,
                               rails, steel stairs, the cell house vault and trusses, stone portals and turrets
    66b-prison-props.js        Blackwater's furniture, fixtures, signs, graffiti, the riot's fires and beacons, its
                               doors (sliding cell gates, steel doors) and doorways
    67-jailbreak.js            Jailbreak mode (prison only): cut the cell locks, lead inmates to the getaway van
    68-loading.js              Loading screen: covers a new match until its textures, models and map scenery are in
                               and every shader is compiled (offline the match waits underneath); a map's assets
                               start loading as soon as it is picked in the menus
    69-static-scenery.js       Scenery that never moves (vegetation) gets its matrices once, not every frame
    70-screens.js              Video screens (and the Starlight's 360° dome): files as textures with positional sound; YouTube in an iframe behind
                               the canvas, warped into a hole in the screen; synced to the showings (/admin)
    71-cinema.js               Bayou Palace Cinemas map (code-built): layout, collision, what each shape is
    72-cinema-view.js          The cinema's kit (drawn by the prison's pipeline) and detail: seats, curtains,
                               marquee, posters, concession stand, projectors and their beams
    72b-cinema-sacred.js       The cinema's sacred geometry (Flower of Life, Metatron's Cube, Sri Yantra, golden
                               spiral...) inlaid, gilded and backlit; mouldings and panelling; the covered cars
    73-cinema-seats.js         Sitting in the cinema's seats (Use to sit and stand): a steady seated view, gun put away
    74-theater-mode.js         Theater Mode: the cinema with no bots, guns or clock (Home card, side rail)
    75-menu-art.js             Menu artwork: real in-game screenshots for the map and mode cards (public/game/menu/)
    76-film-control.js         The projection booth's film controls: play, pause, skip, scrub, for everyone
    77-fortress.js             Fortress map (code-built from the concept art): three levels, layout, collision, routes
    78-fortress-view.js        Fortress's kit (drawn by the prison's pipeline) and detail: arches, arcade, houses,
                               fountain, palms, crates, sheds, helicopter, lighthouse, jungle rim, cliffs and sea
    79-radar.js                The radar shows the real map: rendered once from above when a map loads (roofs cut
                               away at a per-map height), the walls traced faintly over it
    80-home-luxe.js            The Home screen: cinematic hero, glass nav and cards, season/challenges/maps/career
                               panels, hover light and generated UI sounds (styles in src/styles/home-luxe.css)
    81-net.js                  Real online play: the hub connection, matches browser to browser (WebRTC), servers
                               (browse, start, private by code), friends, chat, invites, join-in-progress, the
                               leaderboard; the social panel (F2) and window.__bpSocial. See docs/online.md
tools/
  build-characters.mjs       FBX characters + Mixamo animations -> optimised GLBs (public/game/characters)
  build-weapons.mjs          Animated first-person weapon GLBs -> optimised GLBs (public/game/models/weapons)
  build-ridgeback.mjs        Copies the Ridgeback Pass package into public/ (clean copy) and derives
                               53a-ridgeback-data.js (heights, tunnel floors, decks, obstacles, clip walls)
  build-autorig.mjs          Retired auto-rigger; `--mixamo` still writes a zip for mixamo.com's Auto-Rigger
  build-assets.mjs           Props, masks, Arms6, the DJMaesen terrorist -> optimised GLBs
  fetch-polyhaven.mjs        Downloads and optimises a map's Poly Haven textures, models and sky (frostline, prison)
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
  _retired/                  Sources no longer used by the game or the tools (see its README; safe to delete)
  maps/ridgeback_pass/       The Ridgeback Pass v4 package as delivered (source of public/game/maps/ridgeback_pass)
core/
  game.core.js             The engine core (compiled, see below)
public/game/               Models (.glb), textures, sky maps and fonts as real files
docs/ENGINE_API.md         Engine internals the mods rely on
docs/LAUNCH.md             What a public launch still needs (game server, accounts, legal, analytics)
docs/maps/ridgeback_pass/  The v4 package's README, install notes, credits and a preview
docs/maps/frostline.md     How Frostline was designed (rules from Dust2 / Nuke / Inferno, measured timings)
docs/maps/prison.md        Blackwater Penitentiary: how it is drawn and lit, and the Jailbreak mode
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

- **Where the maps are:** most maps are built in code, not loaded from map files: Kindred City (the menus'
  background) is in the core (`XE` in `core/game.core.js`; Temple and Piazza are still there but retired from
  the map list, `53b-ridgeback.js`), Bayou Palace Cinemas is `src/mods/71-cinema.js`, Blackwater Penitentiary is
  `src/mods/35-prison.js` and Frostline is `src/mods/61-frostline.js` (its ground plan is a list of smooth shapes;
  see `docs/maps/frostline.md`). Ridgeback Pass is a model package: `assets-src/maps/ridgeback_pass/` as delivered,
  copied to `public/game/maps/ridgeback_pass/` by `node tools/build-ridgeback.mjs` (which also writes
  `src/mods/53a-ridgeback-data.js`), drawn by the package's own loader
  (`src/maps/ridgebackPass/`, unchanged from the zip) and given its gameplay and physics by
  `src/mods/53b-ridgeback.js`. To install a new version: replace `assets-src/maps/ridgeback_pass/` and
  `src/maps/ridgebackPass/` with the new package's folders, run `node tools/build-ridgeback.mjs`, and check
  the loader's options in `__rbLoadView` still match.
- **Add or replace a character:** put the FBX in `assets-src/characters/counter-terrorists/` or
  `terrorists/`, run `node tools/build-characters.mjs --chars`, then list the file in `__CHAR.files` and
  give an operator its `model` in `src/mods/37-characters.js`.
- **Add an animation:** put the Mixamo FBX (without skin) in `assets-src/animations/` and run
  `node tools/build-characters.mjs --anims`. The clip is named after the file ("Rifle Walk.fbx" ->
  `RifleWalk`); root motion is removed and its speed recorded. To use it, map a game name to it in
  `__CHAR.alias` (locomotion) or `__CHAR.overlay` (upper-body actions) in `37-characters.js`.
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
- Hitscan, line of sight and explosions cast rays through Rapier (verified identical to the old caster on
  2,000 random rays). Thrown grenades are rigid bodies with CCD; explosions push players and props.
- Props (`map.physProps`) can be pushed, shot and knocked over; crates break into planks. Online, props
  run on each screen and never block shots, so they cannot desync a match.
- `window.__phx.stats()` and `window.__perf()` in the browser console show what is running (in development,
  or with `?debug` in the address on a production build).

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

## Project size: what ships and what does not

Only `public/` and the built code reach players. Everything else is for building the game.

| Folder | Size | Ships? | What it is |
|---|---|---|---|
| `public/game/` | ~135 MB | yes | Optimised models, maps, textures, sounds. A match downloads only what it uses: Ridgeback Pass about 80 MB (70 MB on Low), the built-in maps much less, plus the shared characters, guns and sounds (about 25 MB). Later visits reuse the browser's cache. |
| `assets-src/` | ~1.3 GB | no | Full-size sources (FBX characters, downloaded GLBs, the map package, sound sources). Needed only to rebuild an asset with `tools/`. |
| `assets-src/_retired/` | ~0.6 GB | no | Sources nothing uses any more. Safe to delete. |
| `.git/` | 0.5–0.9 GB | no | Version history. Run `git gc` now and then to keep it packed. |
| `node_modules/` | ~110 MB | no | Build tools (`npm install` recreates it). |
| `dist/` | ~140 MB | output | What `npm run build` makes for hosting; delete it any time. |

To keep the project folder small without losing anything:

1. Delete `assets-src/_retired/` and `dist/`.
2. Move `assets-src/` to an external drive or a cloud folder, and leave a link in its place so the tools still
   find it:

   ```
   mv assets-src "/Volumes/MyDrive/bayou-assets-src"
   ln -s "/Volumes/MyDrive/bayou-assets-src" assets-src
   ```

   That leaves about 300 MB of project plus its git history.

What players get, on a slow machine or connection:
- quality picked for the device at start, never changed mid-match;
- resolution that adapts within 70–100 % of the target;
- every quality level with the same lighting and colour (Low drops only ambient occlusion and bloom);
- Ridgeback Pass downloaded in the background during the menus on desktops;
- with `netlify.toml`'s cache headers, game files reused from the browser's cache on every later visit.

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

## Online play

Matches run browser to browser (WebRTC). A small hub connects players: it lists servers, keeps friends, chat and the
leaderboard. Online, the hub is a Cloudflare Worker on the free plan (`server/net-worker.mjs`, `wrangler.toml`,
deployed to `wss://bayou-net.bayou-protocol.workers.dev`, set in `net.config.json`). For LAN parties, the dev and
preview servers run the same hub at `/net`. The details, deploying and limits are in `docs/online.md`.

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
