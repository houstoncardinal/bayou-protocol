// Bayou Protocol's online hub on Cloudflare (free plan): a Worker that sends every player's WebSocket to one
// Durable Object, which runs the hub (server/net-core.mjs) with its SQLite-backed storage. Deployed with
// `npx wrangler deploy` (wrangler.toml at the repo root). Matches themselves run browser to browser (WebRTC);
// this only carries the lobby, signalling, friends, chat and the leaderboard.
//
// Optional: Cloudflare's free TURN relay (Realtime, 1,000 GB a month free) for players whose networks block
// direct connections. Create a TURN key in the Cloudflare dashboard (Realtime → TURN) and set its id and API
// token as secrets: `npx wrangler secret put TURN_KEY_ID` and `npx wrangler secret put TURN_KEY_TOKEN`.
import { DurableObject } from 'cloudflare:workers';
import { NetHub } from './net-core.mjs';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };

export class BayouHub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const st = ctx.storage;
    this.hub = new NetHub(
      {
        get: (k) => st.get(k),
        put: (k, v) => st.put(k, v),
        delete: (k) => st.delete(k),
        list: async (prefix) => [...(await st.list({ prefix })).entries()],
      },
      { ice: () => this.iceServers() },
    );
  }
  async iceServers() {
    const stun = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
    const id = this.env.TURN_KEY_ID,
      tok = this.env.TURN_KEY_TOKEN;
    if (!id || !tok) return stun;
    // short-lived TURN credentials, cached for an hour
    if (this.turn && Date.now() - this.turn.at < 3600e3) return this.turn.list;
    try {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 86400 }),
      });
      const j = await r.json();
      // (Cloudflare's own advice: leave out the port-53 addresses, which browsers often time out on)
      const turn = (Array.isArray(j.iceServers) ? j.iceServers : [j.iceServers])
        .filter(Boolean)
        .map((x) => ({ ...x, urls: [].concat(x.urls || []).filter((u) => !/:53(\?|$)/.test(u)) }))
        .filter((x) => x.urls.length);
      if (!turn.length) return ((this.turn = { at: Date.now() - 3300e3, list: stun }), stun);
      const list = [...stun, ...turn];
      this.turn = { at: Date.now(), list };
      return list;
    } catch {
      // (tried again in five minutes, not on every player's connection)
      this.turn = { at: Date.now() - 3300e3, list: stun };
      return stun;
    }
  }
  async fetch(req) {
    await this.hub.purgeDemo();
    const url = new URL(req.url);
    if (url.pathname.endsWith('/leaderboard')) return Response.json(await this.hub.leaderboard(), { headers: CORS });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Bayou Protocol online hub', { status: 200 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const c = this.hub.open(server);
    server.addEventListener('message', (e) => this.hub.message(c, typeof e.data === 'string' ? e.data : ''));
    const bye = () => this.hub.close(c);
    server.addEventListener('close', bye);
    server.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const stub = env.HUB.get(env.HUB.idFromName('bayou-hub'));
    return stub.fetch(req);
  },
};
