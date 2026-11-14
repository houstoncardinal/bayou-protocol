// node shoot.mjs <outPrefix> <quality> '<json views>'
import puppeteer from 'puppeteer-core';
const [out, quality, viewsJson] = process.argv.slice(2);
const views = JSON.parse(viewsJson);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1280,720'] });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 720 });
const logs = []; p.on('console', (m) => { const t = m.text(); if (!/GPU stall|THREE.WebGLRenderer: Context/.test(t)) logs.push(m.type() + ': ' + t); });
p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await p.goto(`http://localhost:8123/index.html?q=${quality}`);
await p.waitForFunction(() => window.status_ !== 'loading', { timeout: 540000, polling: 1000 });
const st = await p.evaluate(() => [window.status_, window.loadMs]);
console.log('status', st[0].slice(0, 400), 'load ms', Math.round(st[1] || 0));
if (st[0] === 'ready') for (const [name, args] of Object.entries(views)) {
  const info = await p.evaluate((a) => window.view(...a), args);
  const el = await p.$('canvas'); await el.screenshot({ path: `${out}_${name}.png` });
  console.log(name, JSON.stringify(info));
}
console.log(logs.filter((l) => !l.includes('THREE.GLTFLoader: Unknown extension')).slice(0, 15).join('\n'));
await b.close();
