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

## Deploying the hub (once)

1. `npx wrangler login` (opens Cloudflare in your browser; a free account is enough).
2. `npx wrangler deploy` prints the hub's address, `https://bayou-net.<your-subdomain>.workers.dev`.
3. Put it in `net.config.json` as `{ "url": "wss://bayou-net.<your-subdomain>.workers.dev" }` and rebuild
   (Netlify rebuilds on push).

The leaderboard is also served over HTTP at `https://bayou-net.<your-subdomain>.workers.dev/leaderboard`.

### Optional: the free TURN relay

In the Cloudflare dashboard, go to Realtime, then TURN, and create a TURN key. Then run
`npx wrangler secret put TURN_KEY_ID` and `npx wrangler secret put TURN_KEY_TOKEN`. The hub then hands players
short-lived relay credentials. The free tier covers 1,000 GB a month.

## Free-plan limits

On the Workers free plan (Durable Objects with SQLite storage), the hub gets 100,000 requests a day and 13,000
GB-seconds of Durable Object time a day:

- Every 20 WebSocket messages from players count as one request.
- Match traffic doesn't touch the hub (it goes browser to browser), except relayed pairs.
- Typical use is lobby updates, chat and connection handshakes, which stays well inside this.

## Trust

The host reports match results, so a modified host could inflate scores in its own matches. The hub only accepts
results from the match's actual host, and only for players who are in that match.
