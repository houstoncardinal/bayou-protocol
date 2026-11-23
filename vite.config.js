import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { handleShowings, fileStore, MAX_BODY } from './server/showings-core.mjs';
import { NetHub, fileStore as netFileStore } from './server/net-core.mjs';
import { WebSocketServer } from 'ws';

// The engine core is a compiled module. Everything in src/mods runs inside the
// core's module scope, so mods can use engine internals directly (see docs/ENGINE_API.md).
// This plugin splices the mods into the core at the BAYOU_MODS marker, in file-name order,
// and reloads the page when a mod changes.
function bayouMods() {
  const dir = path.resolve(process.cwd(), 'src/mods');
  return {
    name: 'bayou-mods',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0].replace(/\\/g, '/').endsWith('core/game.core.js')) return null;
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
      for (const f of files) this.addWatchFile(path.join(dir, f));
      const mods = files.map((f) => `\n/* ---- src/mods/${f} ---- */\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
      if (!code.includes('/*__BAYOU_MODS__*/')) this.error('BAYOU_MODS marker missing from core/game.core.js');
      return { code: code.replace('/*__BAYOU_MODS__*/', () => mods), map: null };
    },
  };
}

// The screenings API (/api/showings, see server/showings-core.mjs) and the /admin dashboard, for the dev and
// preview servers. On Netlify the same core runs as netlify/functions/showings.mjs with Netlify Blobs; here it
// stores to .data/ (git-ignored).
function bayouShowings() {
  const store = fileStore(path.resolve(process.cwd(), '.data'));
  const middleware = (req, res, next) => {
    const [pathname, query = ''] = req.url.split('?');
    if (pathname === '/admin' || pathname === '/admin/') {
      req.url = '/admin.html' + (query ? '?' + query : '');
      return next();
    }
    if (pathname !== '/api/showings') return next();
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size <= MAX_BODY + 1) chunks.push(c); });
    req.on('end', async () => {
      const ip = (req.socket && req.socket.remoteAddress) || 'local';
      const r = await handleShowings({ method: req.method, body: Buffer.concat(chunks).toString('utf8'), ip }, store);
      res.writeHead(r.status, r.headers);
      res.end(req.method === 'HEAD' ? undefined : r.body);
    });
  };
  return {
    name: 'bayou-showings',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}

// The online hub (server/net-core.mjs) on the dev and preview servers, at /net: LAN parties and local testing.
// Everyone on the same network opens http://<this machine's address>:5173 and plays through this machine; the
// accounts, friends and leaderboard are kept in .data/net.json. Online play uses the Cloudflare hub instead.
function netConfigURL() {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'net.config.json'), 'utf8')).url || '';
  } catch {
    return '';
  }
}
function bayouNet() {
  let hub = null;
  const attach = (server) => {
    if (!server.httpServer) return;
    hub || ((hub = new NetHub(netFileStore(fs, path.resolve(process.cwd(), '.data/net.json')))), hub.purgeDemo()); // (the test accounts, once)
    const wss = new WebSocketServer({ noServer: true, maxPayload: 128 * 1024 });
    server.httpServer.on('upgrade', (req, sock, head) => {
      if ((req.url || '').split('?')[0] !== '/net') return;
      wss.handleUpgrade(req, sock, head, (ws) => {
        const c = hub.open(ws);
        ws.on('message', (d) => hub.message(c, d.toString()));
        ws.on('close', () => hub.close(c));
        ws.on('error', () => hub.close(c));
      });
    });
  };
  return { name: 'bayou-net', configureServer: attach, configurePreviewServer: attach };
}

// Dev only: test devices on the LAN (a phone opening http://<this machine>:5173) post their measurements here
// (src/mods/99c-devlog.js); they're appended to .data/devlog.jsonl (git-ignored) to be read on this machine.
function bayouDevlog() {
  const file = path.resolve(process.cwd(), '.data/devlog.jsonl');
  return {
    name: 'bayou-devlog',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.split('?')[0] !== '/__bp_devlog' || req.method !== 'POST') return next();
        const chunks = [];
        let size = 0;
        req.on('data', (c) => { size += c.length; if (size <= 64 * 1024) chunks.push(c); });
        req.on('end', () => {
          try {
            const o = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            o.at = new Date().toISOString();
            o.from = (req.socket && req.socket.remoteAddress) || '';
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.appendFileSync(file, JSON.stringify(o) + '\n');
          } catch {}
          res.writeHead(204);
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [bayouMods(), bayouShowings(), bayouNet(), bayouDevlog()],
  // the online hub's address (set BAYOU_NET_URL when building for the web, e.g. wss://bayou-net.<you>.workers.dev);
  // empty: the game uses the server it was loaded from (/net: the dev/preview server, LAN parties)
  // (or net.config.json's "url": written when the hub is deployed, so every build finds it)
  define: { __BAYOU_NET__: JSON.stringify(process.env.BAYOU_NET_URL || netConfigURL()) },
  // map packages import 'three': give them the core's copy (src/engine/three.js), never a second one
  // (and 'postprocessing' -> the core's own copy too: src/engine/postprocessing.js)
  resolve: {
    alias: [
      { find: /^three$/, replacement: path.resolve(process.cwd(), 'src/engine/three.js') },
      { find: /^postprocessing$/, replacement: path.resolve(process.cwd(), 'src/engine/postprocessing.js') },
    ],
  },
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020', chunkSizeWarningLimit: 6000, assetsInlineLimit: 0,
    // the game and the /admin screenings dashboard (a separate page that never loads the game)
    rollupOptions: { input: { main: path.resolve(process.cwd(), 'index.html'), admin: path.resolve(process.cwd(), 'admin.html') } },
  },
});
