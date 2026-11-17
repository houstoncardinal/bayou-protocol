// Screenings backend shared by the Netlify Function (netlify/functions/showings.mjs) and the
// vite dev/preview servers (vite.config.js). No framework: `handleShowings()` takes a parsed request and
// a tiny storage interface `{ get(key) -> value|null, set(key, value) }` and returns `{ status, headers, body }`.
//
// The game reads GET /api/showings and plays each screen at position = offset + (now - startedAt) / 1000
// (looped), so every player sees the same moment. The /admin dashboard writes it with POST + PIN.
//
// This file runs ONLY on the server. Never import it from browser code: it holds the default PIN.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const DOC_KEY = 'showings';
export const THROTTLE_KEY = 'auth-throttle';
export const MAX_FAILS = 8;
export const FAIL_WINDOW_MS = 15 * 60 * 1000;

const LOCAL_MV = '/OGSB%20Young%20-%20Only%20Thing%20That%20Matters%20To%20You%20%5BOfficial%20Music%20Video%5D.mp4';
// A fixed start time for the built-in programme, so every player computes the same position.
const DEFAULT_STARTED_AT = Date.UTC(2026, 0, 1);

const yt = (videoId, title, channel) => ({
  kind: 'youtube', videoId, title, channel, thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  startedAt: DEFAULT_STARTED_AT, offset: 0, loop: true, volume: 1,
});
const mv = () => ({
  kind: 'file', url: LOCAL_MV, title: 'OGSB Young — Only Thing That Matters To You', channel: 'OGSB Young',
  startedAt: DEFAULT_STARTED_AT, offset: 0, loop: true, volume: 1,
});

// Screen ids are fixed by the maps; order here is the order of the GET document.
export const SCREENS = [
  { id: 't1', name: 'Theater 1', group: 'cinema', showing: mv },
  { id: 't2', name: 'Theater 2', group: 'cinema', showing: () => yt('aqz-KE-bpKQ', 'Big Buck Bunny', 'Blender') },
  { id: 't3', name: 'Theater 3', group: 'cinema', showing: () => yt('eRsGyueVLvQ', 'Sintel', 'Blender') },
  { id: 't4', name: 'Theater 4', group: 'cinema', showing: () => yt('R6MlUcmOul8', 'Tears of Steel', 'Blender') },
  { id: 't5', name: 'The Velvet Room', group: 'cinema', showing: () => yt('WhWc3b3KhnY', 'Spring', 'Blender Studio') },
  { id: 'lounge', name: 'The Starlight', group: 'cinema', showing: () => yt('mN0zPOpADL4', 'Agent 327: Operation Barbershop', 'Blender Studio') },
  { id: 'prison', name: 'Blackwater Dayroom TV', group: 'other', showing: mv },
];
const SCREEN_BY_ID = new Map(SCREENS.map((s) => [s.id, s]));

export function defaultDocument() {
  return {
    version: 1,
    updatedAt: new Date(DEFAULT_STARTED_AT).toISOString(),
    theaters: SCREENS.map((s) => ({ id: s.id, name: s.name, showing: s.showing() })),
  };
}

// Stored data merged over the defaults: every known id, in order; unknown ids dropped; a missing entry (or
// one that no longer validates) falls back to its default. `showing: null` is kept: that screen is off.
export function mergeDocument(stored) {
  const def = defaultDocument();
  if (!stored || typeof stored !== 'object' || !Array.isArray(stored.theaters)) return def;
  const byId = new Map();
  for (const t of stored.theaters) if (t && typeof t === 'object' && SCREEN_BY_ID.has(t.id)) byId.set(t.id, t);
  const theaters = def.theaters.map((d) => {
    const s = byId.get(d.id);
    if (!s) return d;
    const name = cleanName(s.name) || d.name;
    if (!('showing' in s)) return { id: d.id, name, showing: d.showing };
    if (s.showing === null) return { id: d.id, name, showing: null };
    try { return { id: d.id, name, showing: validateShowing(s.showing, { now: Date.now(), stored: true }) }; }
    catch { return { id: d.id, name, showing: d.showing }; }
  });
  const updatedAt = typeof stored.updatedAt === 'string' && !Number.isNaN(Date.parse(stored.updatedAt)) ? stored.updatedAt : def.updatedAt;
  return { version: 1, updatedAt, theaters };
}

// ---------------------------------------------------------------- validation

export class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}
const bad = (msg) => { throw new HttpError(400, msg); };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_LIST = /^[A-Za-z0-9_-]{2,64}$/;
const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  // collapse whitespace and drop control characters
  return v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function cleanName(v) { return cleanText(v, 40); }

// http(s) URLs, or a same-site path ("/clip.mp4", "./clip.mp4", "game/clip.mp4"). No other schemes, no
// protocol-relative "//host", no whitespace/quotes/angle brackets.
export function isSafeVideoUrl(u) {
  if (typeof u !== 'string' || !u || u.length > 2048) return false;
  if (/[\s"'<>\\`]/.test(u)) return false;
  if (/^https?:\/\//i.test(u)) {
    try { const p = new URL(u); return (p.protocol === 'http:' || p.protocol === 'https:') && !!p.hostname; } catch { return false; }
  }
  if (u.startsWith('//')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return false; // javascript:, data:, blob:, ...
  return true;
}

function num(v, name, { min = -Infinity, max = Infinity, def } = {}) {
  if (v === undefined || v === null) return def;
  if (typeof v !== 'number' || !Number.isFinite(v)) bad(`${name} must be a number.`);
  return Math.min(max, Math.max(min, v));
}

// Strictly validate (and normalise) one showing. Unknown fields are dropped.
export function validateShowing(s, { now = Date.now(), stored = false } = {}) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) bad('Each showing must be an object (or null to turn the screen off).');
  const title = cleanText(s.title, 120);
  if (!title) bad('Every showing needs a title.');
  if (typeof s.title === 'string' && s.title.trim().length > 120) bad('Titles can be at most 120 characters.');
  const channel = cleanText(s.channel, 120);
  const out = { kind: s.kind };
  if (s.kind === 'youtube') {
    if (s.videoId !== undefined && s.videoId !== null && s.videoId !== '' && !YT_ID.test(String(s.videoId))) bad('That YouTube video id is not valid (it must be 11 characters).');
    if (s.listId !== undefined && s.listId !== null && s.listId !== '' && !YT_LIST.test(String(s.listId))) bad('That YouTube playlist id is not valid.');
    const videoId = YT_ID.test(String(s.videoId || '')) ? s.videoId : undefined;
    const listId = YT_LIST.test(String(s.listId || '')) ? s.listId : undefined;
    if (!videoId && !listId) bad('A YouTube showing needs a video id or a playlist id.');
    if (videoId) out.videoId = videoId;
    if (listId) out.listId = listId;
    out.title = title;
    if (channel) out.channel = channel;
    if (videoId) out.thumb = ytThumb(videoId);
    else if (typeof s.thumb === 'string' && /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/[a-z0-9_]+\.jpg$/.test(s.thumb)) out.thumb = s.thumb;
  } else if (s.kind === 'file') {
    if (!isSafeVideoUrl(s.url)) bad('Video files must be an http(s) link or a path on this site.');
    out.url = s.url;
    out.title = title;
    if (channel) out.channel = channel;
    if (typeof s.thumb === 'string' && /^https:\/\//i.test(s.thumb) && isSafeVideoUrl(s.thumb)) out.thumb = s.thumb;
  } else {
    bad("A showing's kind must be 'youtube' or 'file'.");
  }
  let startedAt = num(s.startedAt, 'startedAt', { def: now });
  if (startedAt <= 0 || (!stored && startedAt > now + 60_000)) startedAt = now; // never in the future
  out.startedAt = Math.round(startedAt);
  out.offset = num(s.offset, 'offset', { min: 0, max: 86400 * 7, def: 0 });
  if (s.loop !== undefined && typeof s.loop !== 'boolean') bad('loop must be true or false.');
  out.loop = s.loop === undefined ? true : s.loop;
  out.volume = Math.round(num(s.volume, 'volume', { min: 0, max: 1, def: 1 }) * 1000) / 1000;
  return out;
}

export function validateSave(theaters, now = Date.now()) {
  if (!Array.isArray(theaters) || !theaters.length) bad('Nothing to save: send at least one screen.');
  if (theaters.length > SCREENS.length) bad('Too many screens in one save.');
  const seen = new Set();
  return theaters.map((t) => {
    if (!t || typeof t !== 'object') bad('Each screen must be an object.');
    if (!SCREEN_BY_ID.has(t.id)) bad(`Unknown screen "${String(t.id).slice(0, 20)}".`);
    if (seen.has(t.id)) bad(`Screen "${t.id}" appears twice.`);
    seen.add(t.id);
    const out = { id: t.id };
    if (t.name !== undefined) {
      if (typeof t.name !== 'string') bad('Screen names must be text.');
      if (t.name.trim().length > 40) bad('Screen names can be at most 40 characters.');
      out.name = cleanName(t.name) || SCREEN_BY_ID.get(t.id).name;
    }
    if (!('showing' in t)) bad(`Screen "${t.id}" is missing its showing (use null to turn it off).`);
    out.showing = t.showing === null ? null : validateShowing(t.showing, { now });
    return out;
  });
}

// ---------------------------------------------------------------- link parsing

const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'gaming.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be']);

// "90", "90s", "1m30s", "1h2m3s", "1:30", "01:02:03" -> seconds
export function parseTime(t) {
  if (!t) return 0;
  t = String(t).trim().toLowerCase();
  if (/^\d+(\.\d+)?s?$/.test(t)) return Math.floor(parseFloat(t));
  const hms = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) return (+hms[1] || 0) * 3600 + (+hms[2] || 0) * 60 + (+hms[3] || 0);
  const col = t.match(/^(?:(\d+):)?(\d+):(\d{1,2})$/);
  if (col) return (+col[1] || 0) * 3600 + +col[2] * 60 + +col[3];
  return 0;
}

// Auto-generated mixes / personal lists that don't play as embedded playlists.
const UNEMBEDDABLE_LIST = /^(RD|UL|LL$|WL$|LM$|OLAK5uy_)/;

// Turn a pasted string into { kind:'youtube', videoId?, listId?, offset } or { kind:'file', url, title } or throw 400.
export function parseLink(input) {
  let raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) bad('Paste a YouTube link or a direct .mp4/.webm video link.');
  if (raw.length > 2048) bad('That link is too long.');
  raw = raw.replace(/^[<("'\[]+|[>)"'\]]+$/g, ''); // <link>, "link", (link)
  if (/<iframe/i.test(input)) { // pasted embed code
    const m = String(input).match(/src=["']([^"']+)["']/i);
    if (m) raw = m[1];
  }
  if (YT_ID.test(raw) && !/\./.test(raw)) return { kind: 'youtube', videoId: raw, offset: 0 }; // bare video id
  if (/^(PL|UU|FL)[A-Za-z0-9_-]{10,40}$/.test(raw)) return { kind: 'youtube', listId: raw, offset: 0 }; // bare playlist id
  let url;
  const isPath = raw.startsWith('/') && !raw.startsWith('//');
  try {
    if (isPath) url = new URL(raw, 'http://local.invalid');
    else url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : (raw.startsWith('//') ? 'https:' + raw : 'https://' + raw));
  } catch { bad("That doesn't look like a link. Paste a YouTube link or a direct .mp4/.webm video link."); }
  if (!isPath && url.protocol !== 'http:' && url.protocol !== 'https:') bad('Only http(s) links are supported.');
  const host = url.hostname.toLowerCase();

  if (!isPath && YT_HOSTS.has(host)) {
    const q = url.searchParams;
    const parts = url.pathname.split('/').filter(Boolean);
    let videoId;
    if (host.endsWith('youtu.be')) videoId = parts[0];
    else if (parts[0] === 'watch' || parts.length === 0) videoId = q.get('v');
    else if (['shorts', 'embed', 'live', 'v', 'e', 'vi'].includes(parts[0])) videoId = parts[1] === 'videoseries' ? undefined : parts[1];
    else if (parts[0] === 'playlist') videoId = undefined;
    else if (parts[0] === 'attribution_link') {
      const inner = q.get('u');
      if (inner) return parseLink('https://www.youtube.com' + inner);
    } else if (parts[0].startsWith('@') || parts[0] === 'channel' || parts[0] === 'c' || parts[0] === 'user') {
      bad("That's a channel page. Paste the link of a specific video or playlist.");
    }
    if (videoId && !YT_ID.test(videoId)) videoId = (videoId.match(/^[A-Za-z0-9_-]{11}/) || [])[0];
    let listId = q.get('list') || undefined;
    if (listId && !YT_LIST.test(listId)) listId = undefined;
    if (listId && videoId && UNEMBEDDABLE_LIST.test(listId)) listId = undefined; // a mix: keep just the video
    if (listId && !videoId && UNEMBEDDABLE_LIST.test(listId)) bad("That's an auto-generated YouTube mix, which can't be shown on a screen. Paste a video or a regular playlist.");
    if (!videoId && !listId) bad("Couldn't find a video in that YouTube link. Open the video and copy the link from the address bar or the Share button.");
    const offset = parseTime(q.get('t') || q.get('start') || (url.hash.match(/t=([^&]+)/) || [])[1]);
    return { kind: 'youtube', ...(videoId ? { videoId } : {}), ...(listId ? { listId } : {}), offset };
  }

  const file = decodeSafe(url.pathname.split('/').pop() || '');
  const ext = (file.match(/\.([a-z0-9]{2,5})$/i) || [])[1]?.toLowerCase();
  if (ext === 'mp4' || ext === 'webm' || ext === 'm4v') {
    const href = isPath ? url.pathname + url.search : url.href;
    if (!isSafeVideoUrl(href)) bad("That video link can't be used.");
    return { kind: 'file', url: href, title: titleFromFile(file), offset: parseTime((url.hash.match(/t=([^&,]+)/) || [])[1]) };
  }
  if (ext === 'm3u8' || ext === 'mpd') bad('Live streams (.m3u8/.mpd) are not supported. Paste a YouTube link or a direct .mp4/.webm file.');
  if (ext === 'mov' || ext === 'mkv' || ext === 'avi') bad(`.${ext} files don't play in browsers. Convert it to .mp4 (H.264) or .webm first.`);
  if (/vimeo\.com$|twitch\.tv$|tiktok\.com$|dailymotion\.com$|facebook\.com$|instagram\.com$/.test(host)) bad(`${host.replace(/^www\./, '')} links aren't supported yet. Use a YouTube link or a direct .mp4/.webm file.`);
  bad("That link isn't a YouTube video or a direct .mp4/.webm file.");
}

function decodeSafe(s) { try { return decodeURIComponent(s); } catch { return s; } }

export function titleFromFile(name) {
  let t = name.replace(/\.[a-z0-9]{2,5}$/i, '');
  t = t.replace(/[_]+/g, ' ').replace(/(?<=\S)\.(?=\S)/g, ' ');
  if (!/\s-\s/.test(t)) t = t.replace(/(?<=[\p{L}\d])-(?=[\p{L}\d])/gu, ' '); // my-clip-name -> my clip name
  t = t.replace(/\s+-\s+/g, ' — ')
    .replace(/[\s(\[]*\b(2160|1440|1080|720|480|360)p\b[)\]]?|\b(4k|uhd|hd)\b(?=\s*$)/gi, ' ') // resolution tags
    .replace(/\s+/g, ' ').trim();
  if (t && t === t.toLowerCase()) t = t.replace(/(^|\s)(\p{L})/gu, (m, a, c) => a + c.toUpperCase());
  return (t || 'Untitled video').slice(0, 120);
}

// Check that a direct video link really serves a video other sites may play. Throws 400 for links that can't
// work; returns a warning string for ones that may not; undefined when all is well.
async function probeFile(url, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(url, { method: 'GET', redirect: 'follow', headers: { Range: 'bytes=0-1', Origin: 'https://bayou-protocol.invalid' }, signal: AbortSignal.timeout(7000) });
  } catch { return "Couldn't reach that server to check the file; make sure the link opens the video in your browser."; }
  try { res.body?.cancel?.(); } catch { /* ignore */ }
  const h = (k) => (res.headers.get(k) || '').toLowerCase();
  const type = h('content-type');
  if (res.status === 404 || res.status === 410) throw new HttpError(400, 'There is no video at that link (the server says it was not found).');
  if (h('cf-mitigated') || ((res.status === 401 || res.status === 403) && type.includes('text/html'))) {
    throw new HttpError(400, "That site blocks other sites from playing its videos (it answers with a login or bot check). Upload the file somewhere that allows direct links, or use YouTube.");
  }
  if (!res.ok) throw new HttpError(400, `The video server refused the link (HTTP ${res.status}).`);
  if (type && !/^(video\/|application\/octet-stream|binary\/octet-stream|application\/mp4)/.test(type)) {
    throw new HttpError(400, `That link opens ${type.includes('html') ? 'a web page' : 'a ' + type.split(';')[0] + ' file'}, not a video. Copy the direct link to the .mp4/.webm file.`);
  }
  const corp = h('cross-origin-resource-policy');
  if (corp === 'same-origin' || corp === 'same-site') throw new HttpError(400, "That server doesn't allow its videos to be played on other sites. Upload the file somewhere else, or use YouTube.");
  if (!h('access-control-allow-origin')) return "This host doesn't send CORS headers, so the in-game screen may stay dark for it. Files on this site or on CORS-enabled hosts always work.";
  return undefined;
}

// Fetch title/author from YouTube's oEmbed (server-side: it has no CORS headers).
async function oembed(watchUrl, fetchImpl) {
  const endpoint = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(watchUrl);
  let res;
  try { res = await fetchImpl(endpoint, { signal: AbortSignal.timeout(7000), headers: { 'Accept': 'application/json' } }); }
  catch { return { offline: true }; }
  if (res.status === 401 || res.status === 403) throw new HttpError(400, "YouTube won't let this video play outside youtube.com (it's private, age-restricted, or its owner turned off embedding). Try another upload.");
  if (res.status === 400 || res.status === 404) throw new HttpError(400, "That YouTube video doesn't exist (or was removed). Check the link.");
  if (!res.ok) return { offline: true };
  try { return await res.json(); } catch { return { offline: true }; }
}

export async function resolveLink(input, { fetchImpl = globalThis.fetch } = {}) {
  const p = parseLink(input);
  const draft = { kind: p.kind };
  let warning;
  if (p.kind === 'youtube') {
    if (p.videoId) draft.videoId = p.videoId;
    if (p.listId) draft.listId = p.listId;
    const watch = p.videoId ? `https://www.youtube.com/watch?v=${p.videoId}` : `https://www.youtube.com/playlist?list=${p.listId}`;
    const meta = await oembed(watch, fetchImpl);
    if (meta.offline) {
      warning = "Couldn't reach YouTube to look up the title; you can still publish it.";
      draft.title = p.videoId ? `YouTube video ${p.videoId}` : 'YouTube playlist';
    } else {
      draft.title = cleanText(meta.title, 120) || (p.videoId ? `YouTube video ${p.videoId}` : 'YouTube playlist');
      const ch = cleanText(meta.author_name, 120);
      if (ch) draft.channel = ch;
    }
    if (p.videoId) draft.thumb = ytThumb(p.videoId);
    else if (typeof meta.thumbnail_url === 'string' && /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/[a-z0-9_]+\.jpg$/.test(meta.thumbnail_url)) draft.thumb = meta.thumbnail_url;
  } else {
    draft.url = p.url;
    draft.title = p.title;
    if (/^https?:/i.test(p.url)) warning = await probeFile(p.url, fetchImpl);
  }
  draft.offset = p.offset || 0;
  draft.loop = true;
  draft.volume = 1;
  return { showing: draft, ...(warning ? { warning } : {}) };
}

// ---------------------------------------------------------------- PIN + throttling

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
export function pinMatches(given, expected) {
  if (typeof given !== 'string') return false;
  return crypto.timingSafeEqual(sha(given), sha(expected));
}
const ipKey = (ip) => crypto.createHash('sha256').update('bp-admin:' + (ip || 'unknown')).digest('hex').slice(0, 24);

async function readThrottle(store, now) {
  let t = null;
  try { t = await store.get(THROTTLE_KEY); } catch { t = null; }
  const map = t && typeof t === 'object' && !Array.isArray(t) ? t : {};
  for (const k of Object.keys(map)) if (!map[k] || now - map[k].first > FAIL_WINDOW_MS) delete map[k];
  return map;
}

// Throws 429 when this IP is locked out, 401 on a wrong PIN; resolves when the PIN is right.
export async function checkPin(store, ip, pin, { expected, now = Date.now() } = {}) {
  const map = await readThrottle(store, now);
  const k = ipKey(ip);
  const rec = map[k];
  if (rec && rec.n >= MAX_FAILS) {
    const retryAfter = Math.max(1, Math.ceil((rec.first + FAIL_WINDOW_MS - now) / 1000));
    throw new HttpError(429, `Too many wrong PINs. Try again in ${Math.ceil(retryAfter / 60)} minute${retryAfter > 60 ? 's' : ''}.`, { retryAfter });
  }
  if (pinMatches(pin, expected)) {
    if (rec) { delete map[k]; await store.set(THROTTLE_KEY, map); }
    return;
  }
  map[k] = rec ? { n: rec.n + 1, first: rec.first } : { n: 1, first: now };
  await store.set(THROTTLE_KEY, map);
  const left = MAX_FAILS - map[k].n;
  if (left <= 0) throw new HttpError(429, 'Too many wrong PINs. Try again in 15 minutes.', { retryAfter: Math.ceil(FAIL_WINDOW_MS / 1000) });
  throw new HttpError(401, left <= 3 ? `Wrong PIN. ${left} attempt${left === 1 ? '' : 's'} left before a 15-minute lockout.` : 'Wrong PIN.');
}

// ---------------------------------------------------------------- storage helpers

export async function loadDocument(store) {
  let stored = null;
  try { stored = await store.get(DOC_KEY); } catch { stored = null; }
  return mergeDocument(stored);
}

// Dev/preview store: one JSON file per key in `dir` (.data/showings.json, .data/auth-throttle.json).
export function fileStore(dir) {
  const file = (key) => path.join(dir, key.replace(/[^a-z0-9_-]/gi, '_') + '.json');
  return {
    async get(key) {
      try { return JSON.parse(await fs.readFile(file(key), 'utf8')); } catch { return null; }
    },
    async set(key, value) {
      await fs.mkdir(dir, { recursive: true });
      const f = file(key), tmp = f + '.' + process.pid + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(value, null, 2));
      await fs.rename(tmp, f);
    },
  };
}

export function memoryStore(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    map: m,
    async get(k) { return m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null; },
    async set(k, v) { m.set(k, JSON.parse(JSON.stringify(v))); },
  };
}

// ---------------------------------------------------------------- request handler

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const PUBLIC_HEADERS = { ...JSON_HEADERS, 'Access-Control-Allow-Origin': '*' };
export const MAX_BODY = 64 * 1024;

const reply = (status, body, headers = JSON_HEADERS) => ({ status, headers, body: JSON.stringify(body) });

/**
 * @param {{ method: string, body?: string, ip?: string }} req  body = raw request text
 * @param {{ get(key:string): Promise<any>, set(key:string, value:any): Promise<void> }} store
 * @param {{ pin?: string, now?: () => number, fetchImpl?: typeof fetch }} [opts]
 */
export async function handleShowings(req, store, opts = {}) {
  const now = opts.now ? opts.now() : Date.now();
  const expected = String(opts.pin || process.env.ADMIN_PIN || '011491');
  const method = (req.method || 'GET').toUpperCase();
  try {
    if (method === 'OPTIONS') {
      return { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' }, body: '' };
    }
    if (method === 'GET' || method === 'HEAD') {
      const doc = await loadDocument(store);
      return reply(200, { ...doc, serverTime: now }, PUBLIC_HEADERS);
    }
    if (method !== 'POST') return reply(405, { error: 'Method not allowed.' }, { ...JSON_HEADERS, Allow: 'GET, POST, OPTIONS' });

    const text = typeof req.body === 'string' ? req.body : '';
    if (text.length > MAX_BODY) return reply(413, { error: 'Request too large.' });
    let body;
    try { body = JSON.parse(text || '{}'); } catch { return reply(400, { error: 'The request was not valid JSON.' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'The request was not valid JSON.' });
    const action = body.action;
    if (!['login', 'save', 'resolve'].includes(action)) return reply(400, { error: 'Unknown action.' });

    await checkPin(store, req.ip, body.pin, { expected, now });

    if (action === 'login') return reply(200, { ok: true });

    if (action === 'resolve') {
      const r = await resolveLink(body.url, { fetchImpl: opts.fetchImpl || globalThis.fetch });
      return reply(200, { ok: true, ...r });
    }

    // save
    const changes = validateSave(body.theaters, now);
    const current = await loadDocument(store);
    const byId = new Map(changes.map((c) => [c.id, c]));
    const theaters = current.theaters.map((t) => {
      const c = byId.get(t.id);
      if (!c) return t;
      return { id: t.id, name: c.name !== undefined ? c.name : t.name, showing: c.showing };
    });
    const doc = { version: 1, updatedAt: new Date(now).toISOString(), theaters };
    await store.set(DOC_KEY, doc);
    return reply(200, { ...mergeDocument(doc), serverTime: now });
  } catch (e) {
    if (e instanceof HttpError) {
      const headers = e.status === 429 && e.extra?.retryAfter ? { ...JSON_HEADERS, 'Retry-After': String(e.extra.retryAfter) } : JSON_HEADERS;
      return reply(e.status, { error: e.message, ...(e.extra || {}) }, headers);
    }
    console.error('[showings]', e);
    return reply(500, { error: 'Something went wrong on the server. Please try again.' });
  }
}
