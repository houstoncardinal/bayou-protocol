# Online play, servers, friends and the leaderboard

## How it works

- **Matches run browser to browser.** Players in a match connect directly over WebRTC. The player who starts a
  server hosts the match (their browser runs it); everyone else plays with them directly. Match traffic never goes
  through a server, so it costs nothing however much people play.
- **The hub** connects players. It lists servers, passes the connection handshakes, keeps accounts (no passwords:
  a player ID and a private key stay in the browser), friends, chat, who's online and in which match, and the
  leaderboard. The code is `server/net-core.mjs`; it runs in two places:
  - **Online:** a Cloudflare Worker with one Durable Object (`server/net-worker.mjs`, `wrangler.toml`), on
    Cloudflare's free plan.
  - **LAN parties and local testing:** the dev or preview server (`npm run dev` / `npm run preview`) serves the same
    hub at `/net`, storing to `.data/net.json`. Everyone on the same network opens `http://<this machine's
    address>:5173` (dev) or `:4173` (preview). No internet needed.
- **Which hub the game uses:** the `url` in `net.config.json` (written when the hub is deployed), or the
  `BAYOU_NET_URL` environment variable at build time. A page served by the dev/preview server uses that server's
  `/net`. Settings can force LAN with `localStorage['bp-net-mode'] = 'lan'`.
- If a pair of players can't connect directly (strict networks), their match traffic relays through the hub,
  throttled to 20 updates a second. For better results there, add Cloudflare's free TURN relay (below).

## In the game

- **F2** (or the Home screen's Friends, Servers and Leaderboard) opens the social panel:
  - **Friends:** your player ID to share, add by ID, requests, who's online and in which match (**Join** puts you in
    it), chat (messages wait for friends who are offline), and invites to your match. Players in your current match
    can be added from **In this match**.
  - **Servers:** every public server running, and **Start a server** (name, mode, map, private). Private servers stay
    out of the list and out of quick play; friends join by invite or by the server's code.
  - **Leaderboard:** the top 100 by rating, with K/D and wins. A match's host reports its results when it ends;
    your rating moves with wins and losses and how you played.

## Official servers

Five permanent servers, one per map, listed first in the Servers panel and the Multiplayer screen even when
they're empty (`src/mods/86-official-servers.js`):

| Server | Mode | Map |
|---|---|---|
| Bayou #1 | Team Deathmatch | Ridgeback Pass |
| Bayou #2 | Bomb Defusal | Fortress |
| Bayou #3 | Free-for-All | Frostline |
| Bayou #4 | Jailbreak | Blackwater Penitentiary |
| Bayou #5 | Team Deathmatch | Bayou Palace Cinemas |

They cost nothing to run. Each is a fixed match room: the first player to join an empty one hosts it (bots fill the
seats), others join them, and when the host leaves the next player takes over. Quick play goes to the matching
official server when no other lobby is running. To add one, add an entry to `__OFFICIAL` with a new room name
(`cds.<mode>.<map>.<letters and digits>`). To run them on dedicated machines later, those machines join the same
room names; nothing else changes.

Player-made servers keep their name after a host hand-over: whoever hosts the match advertises it.

## Deploying the hub (once)

1. `npx wrangler login` (opens Cloudflare in your browser; a free account is enough).
2. `npx wrangler deploy` prints the hub's address, `https://bayou-net.<your-subdomain>.workers.dev`.
3. Put it in `net.config.json` as `{ "url": "wss://bayou-net.<your-subdomain>.workers.dev" }` and rebuild
   (Netlify rebuilds on push).

The leaderboard is also served over HTTP at `https://bayou-net.<your-subdomain>.workers.dev/leaderboard`.

### The free TURN relay

For players whose networks block direct connections:

1. In the Cloudflare dashboard, go to Realtime → TURN Server → Create (any name). It shows a Turn Token ID and an
   API Token.
2. Run `npm run turn:setup` and paste the two values. The script:
   - checks the values with Cloudflare first, and changes nothing if they're wrong;
   - stores them as the hub's secrets, so they stay on Cloudflare and never go in this repository;
   - redeploys the hub;
   - confirms that players now get relay addresses.

The hub then gives every player short-lived relay credentials (24 hours, fetched once an hour). It leaves out the
port-53 addresses, which browsers often time out on. It falls back to direct connections only if Cloudflare can't
be reached.

## Free-plan limits

On the Workers free plan (Durable Objects with SQLite storage), the hub gets 100,000 requests a day and 13,000
GB-seconds of Durable Object time a day:

- Every 20 WebSocket messages from players count as one request.
- Match traffic doesn't touch the hub (it goes browser to browser), except relayed pairs.
- Typical use is lobby updates, chat and connection handshakes, which stays well inside this.

## Trust

The host reports match results, so a modified host could inflate scores in its own matches. The hub only accepts
results from the match's actual host, and only for players who are in that match.
