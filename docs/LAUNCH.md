# Launch checklist: what still needs outside services

The audit items that can live in the browser code are done (see the README and `src/mods/55-competitive.js`).
The rest need a server, an account with a service, or a legal decision. This page says what each one needs,
which service to use, and roughly how long it takes.

## How online play works today (read this first)

`Play online` does not use a game server. The engine asks the page it runs in for a shared "room"
(`window.claude.use("room")`, which exists when the game is hosted as a Claude artifact) and syncs lobbies and
matches through it. One player's browser runs the match (the host), and the others send it their inputs.
Voice chat is peer-to-peer WebRTC, using Google and Cloudflare STUN servers only.

When the game is hosted anywhere else (your own domain, Netlify, Vercel, itch.io), that room does not exist.
Online play then falls back to `BroadcastChannel`, which only links tabs in the same browser on one computer.
**So a public launch on your own domain needs the game server below before online play works for strangers.**

## 1. Authoritative game server (the big one)

What it fixes: cheating (the host's browser currently decides everything), host migration, hidden-enemy
culling (the server only sends enemies you could see), reconnects, leave penalties and surrender votes.

Recommended: **Colyseus** (Node.js, open source, made for room-based games). Host it on **Fly.io** to get
regions (deploy to `iad`, `fra`, `sin` and so on; about $5–10 a month per small region). Hetzner is cheaper
if you only need one region.

Steps:
1. `npm create colyseus-app@latest server` in a new folder next to this one.
2. Move the match simulation into the server room:
   - The core's tick function `U1(state, dt, inputs)` and everything it calls are plain JavaScript with no
     rendering, so they can run in Node.
   - Build the core without the React and three.js parts, or ask me to split it out.
3. Each client sends only its inputs (keys, aim, fire) at 30–60 Hz.
4. The server sends back the state, minus enemies the player cannot see.
5. In the client, replace the `rBA()` transport (`window.claude.use("room")`) with a Colyseus client. The
   lobby, join and presence calls map one-to-one onto Colyseus rooms.
6. Reconnect: Colyseus has `allowReconnection(client, 30)`. Leave penalty: record leaves against the
   account (section 2) and block matchmaking for N minutes. Surrender: a vote message the room counts.

Expect 2–4 weeks for someone who knows Node. Matchmaking (queues by region and skill) is built into
Colyseus (`matchMaker`) once rooms exist.

## 2. Accounts and server-stored progress

Recommended: **Supabase**. It is free to start and gives you login (email, Google, Discord, Apple) and a
Postgres database.

1. Create a project at supabase.com.
2. Add a `profiles` table (id, name, level, xp, unlocks, stats). Turn on Row Level Security so users can only
   read and write their own row.
3. Progress is stored in `localStorage` today (`eA.saveSettings`, the profile store). On login, load the
   row into it. On match end, write the row.
4. Once the game server exists, it should write match results, not the client. Otherwise players can edit
   their own XP.

## 3. Text chat moderation, reports, mute and block

- Mute already exists per player in voice chat.
- Block: store the blocked ids on the Supabase profile; the game server never puts you in a room with them.
- Report: a Supabase `reports` table (reporter, target, reason, match id) and a page where you review them.
- Text filter: run messages through a profanity list on the server (e.g. the `obscenity` npm package).
- Voice at scale: P2P voice does not work for 10 players behind strict NATs. Move to **LiveKit Cloud**
  (free tier) and add a TURN server (Cloudflare Calls or Twilio) so voice connects everywhere.

## 4. Legal pages, cookie consent, age gate

- Privacy policy and terms: generate them with **Termly** or **iubenda** (they ask what you collect: account
  email, gameplay stats, voice audio passing through, analytics). Host them as `/privacy` and `/terms`
  pages and link them from Settings > About and the login screen.
- Cookie consent: only needed once you add analytics or ads that set cookies or IDs.
  - Termly's banner works.
  - Or use cookieless analytics (below) and skip it.
- Age gate: with voice and text chat between strangers, the rating boards and app stores expect 13+.
  - Add a date-of-birth question at account creation.
  - For under-13s: no account, so no chat.
  - The new Blood setting (Settings > Gameplay) covers the gore toggle.

## 5. Error tracking and analytics

- **Sentry** (free tier):
  - `npm i @sentry/browser`, then `Sentry.init({ dsn, tracesSampleRate: 0.1 })` in `src/main.js`.
  - Upload source maps in the build (`@sentry/vite-plugin`). Stack traces from the minified core are
    readable with them.
- Analytics:
  - **Plausible** or **Umami** are cookieless, so they need no consent banner.
  - Use **PostHog** if you want funnels (menu → first match → second session).

## 6. Licensing to check before you sell or monetise

- Mixamo animations and characters:
  - Adobe's terms allow them in games you ship, royalty free.
  - They do not allow redistributing the raw FBX files. Keep `assets-src/` out of any public repository.
- The frag grenade model is CC BY-ND:
  - It is shipped unmodified, with credit, which BY-ND allows.
  - Do not edit or re-texture it; replace it if you need changes.
- `CREDITS.md` lists no NC (non-commercial) licences today. Re-check every new Sketchfab download before
  adding it: an NC model blocks selling the game or showing ads.
- The weapons use invented names (Sentinel M4A1 is a generic military designation). Avoid brand and
  trademarked product names (M4A4 was a game-specific name and has been removed).

## Items deliberately not done in this pass

- **Practice/training map.** The Firing Range was removed at your request. A practice mode can use any map
  with bots off (Offline > Rules).
- **Sensitivity converter, tutorial and ping display.** These are small, in-browser additions that can be
  built next on request. The ping display needs the game server to be meaningful.
- **Replays.**
  - The server can record the input stream per match (it is small) and play it back through the same
    simulation.
  - Doing this before the server exists would have to be redone after.
- **Cutting CTF, the mobile/desktop matchmaking split, and minifying the core.** These are product decisions
  for when matchmaking exists. The core is already minified.
