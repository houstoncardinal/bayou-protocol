// Turns on Cloudflare's free TURN relay for the online hub (`npm run turn:setup`).
//
// First, in the Cloudflare dashboard: Realtime → TURN Server → Create (any name, e.g. "bayou-net"). It shows a
// Turn Token ID and an API Token. This script asks for both (the token isn't shown as you type), stores them as
// the hub's secrets (TURN_KEY_ID, TURN_KEY_TOKEN: on Cloudflare only, never in this repository), redeploys the hub
// and checks that it now gives players TURN relay addresses.
import { spawnSync } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';

const ask = (q, hidden) =>
  new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => rl.output.write(s.includes(q) ? s : s.replace(/[^\r\n]/g, '•'));
    }
    rl.question(q, (a) => (rl.close(), hidden && process.stdout.write('\n'), res(a.trim())));
  });
const wrangler = (args, input) => spawnSync('npx', ['wrangler', ...args], { input, stdio: [input == null ? 'inherit' : 'pipe', 'inherit', 'inherit'] });

console.log('\nCloudflare TURN relay for the Bayou Protocol online hub\n');
console.log('In the Cloudflare dashboard: Realtime → TURN Server → Create. Then copy its two values here.\n');
const id = await ask('Turn Token ID: ');
const tok = await ask('API Token: ', !0);
if (!/^[A-Za-z0-9_-]{8,}$/.test(id) || tok.length < 16) {
  console.log('\nThose don’t look right (the ID is a long hex string; the token is longer). Nothing was changed.');
  process.exit(1);
}
// check them against Cloudflare before storing anything
const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ ttl: 600 }),
}).catch(() => null);
if (!r || !r.ok) {
  console.log(`\nCloudflare didn’t accept that ID and token (${r ? r.status : 'no answer'}). Nothing was changed.`);
  process.exit(1);
}
console.log('\nCloudflare accepted the key. Storing it on the hub…');
if (wrangler(['secret', 'put', 'TURN_KEY_ID'], id).status || wrangler(['secret', 'put', 'TURN_KEY_TOKEN'], tok).status) {
  console.log('\nStoring the secrets failed (run `npx wrangler login` first). Nothing else was changed.');
  process.exit(1);
}
console.log('\nRedeploying the hub…');
if (wrangler(['deploy']).status) process.exit(1);
// the hub's address, and a player's-eye check: its hello carries TURN servers now
let url = '';
try {
  url = JSON.parse(fs.readFileSync('net.config.json', 'utf8')).url;
} catch {}
if (url && typeof WebSocket !== 'undefined') {
  const ok = await new Promise((res) => {
    const ws = new WebSocket(url.replace(/\/?$/, '/net'));
    const t = setTimeout(() => (ws.close(), res(null)), 15000);
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hi', name: 'turn-check' }));
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.t !== 'hi') return;
      clearTimeout(t);
      ws.close();
      res(JSON.stringify(m.ice || []).includes('turn:'));
    };
    ws.onerror = () => (clearTimeout(t), res(null));
  });
  console.log(ok ? '\nDone: players now get Cloudflare TURN relays.' : ok === false ? '\nThe hub is deployed, but its first answer had no TURN servers yet; give it a minute and run this again to check.' : '\nThe hub is deployed (couldn’t reach it to check).');
} else console.log('\nDone.');
