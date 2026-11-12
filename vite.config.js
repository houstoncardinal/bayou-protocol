import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

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

export default defineConfig({
  base: './',
  plugins: [bayouMods()],
  server: { host: true, port: 5173 },
  build: { target: 'es2020', chunkSizeWarningLimit: 6000, assetsInlineLimit: 0 },
});
