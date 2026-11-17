import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { handleShowings, fileStore, MAX_BODY } from './server/showings-core.mjs';

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

export default defineConfig({
  base: './',
  plugins: [bayouMods(), bayouShowings()],
  // map packages import 'three': give them the core's copy (src/engine/three.js), never a second one
  resolve: { alias: [{ find: /^three$/, replacement: path.resolve(process.cwd(), 'src/engine/three.js') }] },
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020', chunkSizeWarningLimit: 6000, assetsInlineLimit: 0,
    // the game and the /admin screenings dashboard (a separate page that never loads the game)
    rollupOptions: { input: { main: path.resolve(process.cwd(), 'index.html'), admin: path.resolve(process.cwd(), 'admin.html') } },
  },
});
