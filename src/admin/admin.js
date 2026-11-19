// Screenings Office (/admin): programs what the in-game cinema screens play.
// Talks to /api/showings (server/showings-core.mjs). Vanilla JS, separate from the game bundle.
// The PIN is never stored in this code: the owner types it, it lives in sessionStorage for the tab's lifetime,
// and every write sends it to the server, which checks it.

const API = '/api/showings';
const PIN_KEY = 'bp-admin-pin';
const DEFAULT_EPOCH = Date.UTC(2026, 0, 1); // start time of the built-in programme (server/showings-core.mjs)
const CINEMA = ['t1', 't2', 't3', 't4', 't5', 'lounge'];
const GROUPS = [
  { title: 'Bayou Palace Cinemas', sub: 'Six theaters: Palace XL 1-4, the Velvet Room, and the Starlight, a 360° dome', ids: CINEMA },
  { title: 'Other maps', sub: 'Screens elsewhere in Bayou Protocol', ids: ['prison', 'condo'] },
];
const META = {
  t1: { no: '1', where: 'Auditorium 1' },
  t2: { no: '2', where: 'Auditorium 2' },
  t3: { no: '3', where: 'Auditorium 3' },
  t4: { no: '4', where: 'Auditorium 4' },
  t5: { no: '5', where: 'Premium · Auditorium 5' },
  lounge: { no: '360°', where: '360° dome · 360 & VR video' },
  prison: { no: 'TV', where: 'Blackwater Prison' },
  condo: { no: 'HC', where: 'Frostline · secret condo' },
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const ICON = {
  play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  replace: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  restart: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  off: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v8M6.3 7.3a8 8 0 1 0 11.4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pen: '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  vol: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bang: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 6v8M12 18v.01" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
};

const state = {
  pin: sessionStorage.getItem(PIN_KEY) || '',
  doc: null,
  skew: 0, // server clock - our clock (ms)
  proposal: [], // { key, input, status: 'loading'|'ok'|'error', showing, error, warning, target, manual, dupOf }
  saving: 0,
};
const now = () => Date.now() + state.skew;
const byId = (id) => state.doc?.theaters.find((t) => t.id === id);
const nameOf = (id) => byId(id)?.name || id;

// ---------------------------------------------------------------- API

class ApiError extends Error { constructor(status, msg, body) { super(msg); this.status = status; this.body = body; } }

async function getDoc() {
  let res;
  try { res = await fetch(API, { cache: 'no-store' }); } catch { throw new ApiError(0, "Can't reach the server. Check your connection."); }
  if (!res.ok) throw new ApiError(res.status, `The server answered ${res.status}.`);
  const doc = await res.json();
  if (typeof doc.serverTime === 'number') state.skew = doc.serverTime - Date.now();
  return doc;
}

async function post(action, data = {}, pin = state.pin) {
  let res;
  try {
    res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ action, pin, ...data }) });
  } catch { throw new ApiError(0, "Can't reach the server. Check your connection and try again."); }
  let body = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) {
    const err = new ApiError(res.status, body?.error || `The server answered ${res.status}. Please try again.`, body);
    if (action !== 'login' && (res.status === 401 || res.status === 429)) {
      showLock(res.status === 401 ? 'Your session ended. Enter the PIN again.' : err.message, res.status === 429 ? body?.retryAfter : 0);
    }
    throw err;
  }
  return body;
}

// Serialised writes: each save lands on top of the previous one's result.
let saveChain = Promise.resolve();
// the Starlight is a 360° dome: whatever goes on it keeps the format it had (360° unless set otherwise)
const DOME = 'lounge';
function withFormat(t) {
  if (t.id !== DOME || !t.showing) return t;
  const cur = byId(DOME)?.showing;
  return { ...t, showing: { ...t.showing, projection: t.showing.projection || cur?.projection || '360', stereo: 'stereo' in t.showing ? t.showing.stereo : cur?.stereo } };
}
function save(theaters, { quiet } = {}) {
  theaters = theaters.map(withFormat);
  const run = async () => {
    state.saving++;
    setStatus();
    try {
      const doc = await post('save', { theaters });
      if (typeof doc.serverTime === 'number') state.skew = doc.serverTime - Date.now();
      setDoc(doc);
      return doc;
    } catch (e) {
      if (!quiet && e.status !== 401 && e.status !== 429) toast(e.message, { type: 'err' });
      throw e;
    } finally {
      state.saving--;
      setStatus();
    }
  };
  const p = saveChain.then(run, run);
  saveChain = p.catch(() => {});
  return p;
}

const resolveCache = new Map();
function resolveLink(url) {
  const k = url.trim();
  if (!resolveCache.has(k)) {
    const p = post('resolve', { url: k }).catch((e) => { resolveCache.delete(k); throw e; });
    resolveCache.set(k, p);
  }
  return resolveCache.get(k);
}

// ---------------------------------------------------------------- helpers

function sourceKey(s) {
  if (!s) return '';
  return s.kind === 'youtube' ? `yt:${s.videoId || ''}:${s.listId || ''}` : `file:${s.url}`;
}
function ago(ms) {
  const s = Math.max(0, Math.round((now() - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return 'since ' + new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}
function startedText(ms) {
  if (ms <= DEFAULT_EPOCH) return 'Now showing · built-in programme, looping';
  const a = ago(ms);
  return a.startsWith('since') ? `Now showing · ${a}` : `Now showing · started ${a}`;
}
function clock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}
function hue(str) { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 360; return [350, 18, 32, 280, 8, 330, 200][h % 7]; }
function kindLabel(s) {
  if (!s) return '';
  if (s.kind === 'file') return 'Video file';
  return s.listId && !s.videoId ? 'Playlist' : s.listId ? 'YouTube · playlist' : 'YouTube';
}
function badge(s) {
  if (!s) return '<span class="badge"><i style="background:#666"></i>Off</span>';
  const cls = s.kind === 'file' ? 'file' : s.listId && !s.videoId ? 'list' : 'yt';
  return `<span class="badge ${cls}"><i></i>${esc(kindLabel(s))}</span>`;
}
function posterArt(s) {
  if (!s) return `<div class="dark"><div class="dark-title">Screen dark</div><div class="dark-sub">Drop a link here, or</div><button class="btn btn-gold btn-sm dark-cta" type="button" data-act="replace" tabindex="-1">${ICON.replace} Add a showing</button></div>`;
  if (s.thumb) return `<img src="${esc(s.thumb)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  const gen = `<div class="gen" style="--h:${hue(s.title)}"><div class="gen-title">${esc(s.title)}</div><div class="gen-sub">${esc(s.channel || 'Feature presentation')}</div></div>`;
  if (s.kind === 'file' && s.url) {
    // a real frame from the file, faded in over the generated poster once it loads
    return gen + `<video muted playsinline preload="metadata" src="${esc(s.url)}#t=${Math.max(8, (s.offset || 0) + 8)}" aria-hidden="true" tabindex="-1"></video>`;
  }
  return gen;
}
function wirePoster(el) {
  const v = $('video', el);
  if (v) { v.addEventListener('loadeddata', () => v.classList.add('ready'), { once: true }); v.addEventListener('error', () => v.remove(), { once: true }); }
  const img = $('img', el);
  if (img) img.addEventListener('error', () => { img.replaceWith(Object.assign(document.createElement('div'), { className: 'gen', innerHTML: '<div class="gen-title">Poster unavailable</div>' })); }, { once: true });
}
function splitLinks(text) {
  const out = [];
  // pull out iframe embeds first, then split on whitespace / commas / semicolons / pipes
  text = String(text || '').replace(/<iframe[^>]*src=["']([^"']+)["'][^>]*>(\s*<\/iframe>)?/gi, ' $1 ');
  for (let part of text.split(/[\s,;|]+/)) {
    part = part.trim().replace(/^[<("'\[]+|[>)"'\].]+$/g, '');
    if (!part) continue;
    if (!/[./]/.test(part) && !/^[A-Za-z0-9_-]{11}$/.test(part) && !/^PL[A-Za-z0-9_-]{10,}$/.test(part)) continue; // stray words
    out.push(part);
  }
  return [...new Set(out)];
}

// ---------------------------------------------------------------- toasts + status

function toast(msg, { type = 'ok', action, onAction, ms = 5000 } = {}) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-ic">${type === 'ok' ? ICON.check : ICON.bang}</span><span class="toast-msg"></span>`;
  $('.toast-msg', el).textContent = msg;
  if (action) {
    const b = Object.assign(document.createElement('button'), { className: 'btn btn-ghost', type: 'button', textContent: action });
    b.addEventListener('click', () => { close(); onAction?.(); });
    el.append(b);
  }
  const x = Object.assign(document.createElement('button'), { className: 'icon-btn', type: 'button', innerHTML: ICON.x });
  x.setAttribute('aria-label', 'Dismiss');
  x.style.width = x.style.height = '30px';
  x.addEventListener('click', () => close());
  el.append(x);
  const box = $('#toasts');
  box.append(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  let t = setTimeout(close, type === 'err' ? Math.max(ms, 7000) : ms);
  el.addEventListener('mouseenter', () => clearTimeout(t));
  el.addEventListener('mouseleave', () => { t = setTimeout(close, 2500); });
  function close() { clearTimeout(t); el.classList.add('out'); setTimeout(() => el.remove(), 260); }
  return close;
}

let statusErr = '';
function setStatus() {
  const dot = $('#status-dot'), txt = $('#status-text');
  if (!dot) return;
  dot.className = 'dot';
  if (state.saving) { dot.classList.add('busy'); txt.textContent = 'Publishing…'; return; }
  if (statusErr) { dot.classList.add('err'); txt.textContent = statusErr; return; }
  if (!state.doc) { dot.classList.add('busy'); txt.textContent = 'Loading…'; return; }
  const live = state.doc.theaters.filter((t) => t.showing).length;
  const total = state.doc.theaters.length;
  const pub = Date.parse(state.doc.updatedAt);
  const never = pub <= DEFAULT_EPOCH;
  dot.classList.add('live');
  txt.textContent = `${live} of ${total} screens live · ${never ? 'Default programme, not published yet' : 'Last published ' + ago(pub).replace(/^since /, '')}`;
  dot.parentElement.title = never ? 'Nothing has been published yet: the screens play the built-in programme.' : `Last published ${new Date(pub).toLocaleString()}`;
}

// ---------------------------------------------------------------- PIN screen

let pollTimer = 0, tickTimer = 0;
const pinInputs = $$('.pin-digit');
let lockTimer = 0;

function showLock(message = '', retryAfter = 0) {
  state.pin = '';
  sessionStorage.removeItem(PIN_KEY);
  $('#app').hidden = true;
  $('#lock').hidden = false;
  closeDialogs();
  $('#toasts').innerHTML = '';
  state.proposal = [];
  clearInterval(pollTimer); clearInterval(tickTimer);
  document.title = 'Screenings Office · Bayou Palace Cinemas';
  clearPin();
  setLockMsg(message, retryAfter ? 'locked' : message ? 'info' : '');
  if (retryAfter) startLockout(retryAfter);
  else { setPinDisabled(false); setTimeout(() => pinInputs[0].focus(), 30); }
}
function setLockMsg(msg, cls = '') {
  const el = $('#lock-msg');
  el.textContent = msg || '';
  el.className = 'lock-msg' + (cls ? ' ' + cls : '');
}
function setPinDisabled(d) { pinInputs.forEach((i) => (i.disabled = d)); $('#lock-submit').disabled = d; }
function clearPin() { pinInputs.forEach((i) => { i.value = ''; i.classList.remove('filled'); }); $('#pin').classList.remove('ok'); }
function pinValue() { return pinInputs.map((i) => i.value).join(''); }
function fillPin(from, digits) {
  let i = from;
  for (const d of digits) { if (i >= 6) break; pinInputs[i].value = d; pinInputs[i].classList.add('filled'); i++; }
  pinInputs[Math.min(i, 5)].focus();
  if (pinValue().length === 6) submitPin();
}
function startLockout(sec) {
  clearInterval(lockTimer);
  setPinDisabled(true);
  const end = Date.now() + sec * 1000;
  const tick = () => {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    if (!left) { clearInterval(lockTimer); setPinDisabled(false); setLockMsg('You can try again now.', 'info'); pinInputs[0].focus(); return; }
    setLockMsg(`Too many wrong PINs. Locked for ${clock(left)}.`, 'locked');
  };
  tick();
  lockTimer = setInterval(tick, 1000);
}

pinInputs.forEach((inp, i) => {
  inp.addEventListener('input', () => {
    const digits = inp.value.replace(/\D/g, '');
    inp.value = '';
    inp.classList.remove('filled');
    if (!digits) return;
    setLockMsg('');
    fillPin(i, digits);
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !inp.value && i > 0) { e.preventDefault(); const p = pinInputs[i - 1]; p.value = ''; p.classList.remove('filled'); p.focus(); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); pinInputs[i - 1].focus(); }
    else if (e.key === 'ArrowRight' && i < 5) { e.preventDefault(); pinInputs[i + 1].focus(); }
    else if (e.key.length === 1 && /\d/.test(e.key) && inp.value) { inp.value = ''; } // overwrite
  });
  inp.addEventListener('focus', () => inp.select());
  inp.addEventListener('paste', (e) => {
    const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (!digits) return;
    e.preventDefault();
    e.stopPropagation();
    setLockMsg('');
    fillPin(digits.length >= 6 ? 0 : i, digits);
  });
});
$('#lock-form').addEventListener('submit', (e) => { e.preventDefault(); submitPin(); });

let pinBusy = false;
async function submitPin() {
  const pin = pinValue();
  if (pinBusy) return;
  if (pin.length < 6) { setLockMsg('Enter all 6 digits.'); pinInputs[pin.length].focus(); return; }
  pinBusy = true;
  setPinDisabled(true);
  setLockMsg('Checking…', 'info');
  try {
    await post('login', {}, pin);
    $('#pin').classList.add('ok');
    setLockMsg('');
    state.pin = pin;
    sessionStorage.setItem(PIN_KEY, pin);
    setTimeout(enterApp, 220);
  } catch (e) {
    const pinEl = $('#pin');
    pinEl.classList.remove('shake');
    void pinEl.offsetWidth;
    pinEl.classList.add('shake');
    setTimeout(() => pinEl.classList.remove('shake'), 600);
    clearPin();
    if (e.status === 429) { startLockout(e.body?.retryAfter || 900); }
    else {
      setLockMsg(e.message);
      setPinDisabled(false);
      pinInputs[0].focus();
    }
  } finally { pinBusy = false; }
}

$('#lock-btn').addEventListener('click', () => { showLock('Locked. Enter your PIN to continue.'); });

// ---------------------------------------------------------------- dashboard


async function enterApp() {
  $('#lock').hidden = true;
  $('#app').hidden = false;
  document.title = 'Screenings · Bayou Palace Cinemas';
  $('#kbd-mod').textContent = isMac ? '⌘' : 'Ctrl';
  if (!state.doc) renderSkeleton();
  await refresh(true);
  clearInterval(pollTimer); clearInterval(tickTimer);
  pollTimer = setInterval(() => { if (!document.hidden && !state.saving) refresh(); }, 30000);
  tickTimer = setInterval(() => { updateTimes(); setStatus(); }, 15000);
}

async function refresh(first) {
  try {
    const doc = await getDoc();
    statusErr = '';
    $('#load-error').hidden = true;
    setDoc(doc);
  } catch (e) {
    if (first || !state.doc) {
      $('#load-error').hidden = false;
      $('#load-error-msg').textContent = e.message;
    }
    statusErr = 'Offline · retrying';
    setStatus();
  }
}
$('#load-retry').addEventListener('click', () => refresh(true));
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.pin && !$('#app').hidden) refresh(); });

function setDoc(doc) {
  state.doc = doc;
  renderGroups();
  renderProposal();
  setStatus();
}

function renderSkeleton() {
  $('#groups').innerHTML = GROUPS.map((g) => `
    <section class="group"><div class="group-head"><div><h2 class="group-title">${esc(g.title)}</h2><p class="group-sub">${esc(g.sub)}</p></div><div class="group-rule"></div></div>
    <div class="grid">${g.ids.map(() => '<div class="card loading-skel" aria-hidden="true"><div class="poster"></div><div class="card-body"><div class="sk" style="width:40%"></div><div class="sk" style="width:80%;height:22px"></div><div class="sk" style="width:55%"></div></div></div>').join('')}</div></section>`).join('');
}

const cards = new Map(); // id -> { el, key }

function renderGroups() {
  const root = $('#groups');
  if (!root.querySelector('.grid[data-ready]')) {
    root.innerHTML = '';
    cards.clear();
    for (const g of GROUPS) {
      const sec = document.createElement('section');
      sec.className = 'group';
      sec.setAttribute('aria-labelledby', 'g-' + g.ids[0]);
      sec.innerHTML = `<div class="group-head"><div><h2 class="group-title" id="g-${g.ids[0]}">${esc(g.title)}</h2><p class="group-sub">${esc(g.sub)}</p></div><div class="group-rule"></div><span class="group-count"></span></div><div class="grid" data-ready></div>`;
      const grid = $('.grid', sec);
      for (const id of g.ids) {
        const el = buildCard(id);
        grid.append(el);
        cards.set(id, { el, key: null });
      }
      root.append(sec);
    }
  }
  for (const g of GROUPS) {
    for (const id of g.ids) updateCard(id);
    const live = g.ids.filter((id) => byId(id)?.showing).length;
    const count = $(`#g-${g.ids[0]}`).closest('.group').querySelector('.group-count');
    count.textContent = g.ids.length > 1 ? `${live} of ${g.ids.length} screens showing` : live ? 'Showing' : 'Dark';
  }
}

function buildCard(id) {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.id = id;
  el.innerHTML = `
    <div class="poster">
      <div class="poster-art"></div>
      <div class="poster-top"><span class="kind"></span><span class="screen-no" aria-hidden="true">${esc(META[id].no)}</span></div>
      <button class="poster-play" type="button">${ICON.play}</button>
      <div class="poster-live"><span class="live-dot"></span><span class="live-text"></span></div>
      <div class="drop-hint"></div>
    </div>
    <div class="card-body">
      <div class="name-row">
        <label class="name-wrap"><span class="sr-only">Screen name</span><input class="name" maxlength="40" spellcheck="false" autocomplete="off"><span class="name-pen">${ICON.pen}</span></label>
        <span class="where">${esc(META[id].where)}</span>
      </div>
      <h3 class="title"></h3>
      <p class="channel"></p>
      <div class="vol">
        <button class="icon-btn vol-btn" type="button"></button>
        <input type="range" min="0" max="100" step="1" class="vol-range">
        <output class="vol-out"></output>
      </div>
      ${id !== DOME && CINEMA.includes(id) ? `<div class="fmt fmt--flat">
        <div class="fmt-row"><span class="fmt-l">Picture</span>
          <div class="seg" role="group" aria-label="Film shape"><button type="button" data-asp="0">Full 16:9</button><button type="button" data-asp="1.85">Widescreen 1.85</button><button type="button" data-asp="2.39">Scope 2.39</button></div></div>
        <p class="fmt-note">If a YouTube film has black bars above and below its picture, pick its shape and the screen fills edge to edge (video files are trimmed automatically).</p>
      </div>` : ''}
      ${id === DOME ? `<div class="fmt">
        <div class="fmt-row"><span class="fmt-l">Format</span>
          <div class="seg" role="group" aria-label="Dome format"><button type="button" data-proj="360">360°</button><button type="button" data-proj="180">180° VR</button></div></div>
        <div class="fmt-row"><span class="fmt-l">VR file</span>
          <div class="seg" role="group" aria-label="Stereo layout of a VR video file"><button type="button" data-st="mono">Mono</button><button type="button" data-st="tb">Top / bottom</button><button type="button" data-st="sbs">Side by side</button></div></div>
        <p class="fmt-note">Paste any 360° or VR YouTube link (it turns with the viewer's head), or a link to a 360° / 180° video file. Format and VR layout apply to video files; YouTube knows its own. A video that isn't 360° plays on a flat screen at the dome's front.</p>
      </div>` : ''}
      <div class="actions">
        <button class="act primary" type="button" data-act="replace">${ICON.replace}<span>Replace</span></button>
        <button class="act" type="button" data-act="restart">${ICON.restart}<span>Restart</span></button>
        <button class="act" type="button" data-act="preview">${ICON.eye}<span>Preview</span></button>
        <button class="act danger" type="button" data-act="clear">${ICON.off}<span>Turn off</span></button>
      </div>
    </div>`;

  // name: inline edit, saved on Enter / blur, Esc reverts
  const name = $('.name', el);
  name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); name.blur(); }
    else if (e.key === 'Escape') { name.value = nameOf(id); name.blur(); }
  });
  name.addEventListener('blur', async () => {
    const t = byId(id);
    const v = name.value.replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (!v) { name.value = t.name; return; }
    if (v === t.name) return;
    try { await save([{ id, name: v, showing: t.showing }]); toast(`Renamed to “${v}”.`); }
    catch { name.value = nameOf(id); }
  });

  // volume
  const range = $('.vol-range', el), out = $('.vol-out', el), vbtn = $('.vol-btn', el);
  const paintVol = (v) => { range.value = v; range.style.setProperty('--p', v + '%'); out.textContent = v + '%'; vbtn.innerHTML = +v === 0 ? ICON.mute : ICON.vol; vbtn.setAttribute('aria-label', +v === 0 ? 'Unmute' : 'Mute'); };
  el._paintVol = paintVol;
  let volT = 0;
  const commitVol = (v) => {
    clearTimeout(volT);
    volT = setTimeout(async () => {
      const t = byId(id);
      if (!t?.showing) return;
      const volume = Math.round(v) / 100;
      if (Math.abs((t.showing.volume ?? 1) - volume) < 0.001) return;
      try { await save([{ id, showing: { ...t.showing, volume } }], { quiet: false }); toast(`${t.name} volume set to ${Math.round(v)}%.`, { ms: 2500 }); }
      catch { paintVol(Math.round((byId(id)?.showing?.volume ?? 1) * 100)); }
    }, 350);
  };
  range.addEventListener('input', () => { paintVol(range.value); el._volDirty = true; });
  range.addEventListener('change', () => { el._volDirty = false; commitVol(+range.value); });
  vbtn.addEventListener('click', () => {
    const t = byId(id);
    if (!t?.showing) return;
    const v = +range.value === 0 ? (el._lastVol || 100) : 0;
    if (+range.value) el._lastVol = +range.value;
    paintVol(v);
    commitVol(v);
  });

  // the dome's format
  el.addEventListener('click', async (e) => {
    const f = e.target.closest('[data-proj], [data-st], [data-asp]');
    if (!f) return;
    const t = byId(id);
    if (!t?.showing) return;
    const showing = { ...t.showing };
    if (f.dataset.asp) {
      showing.aspect = +f.dataset.asp || null;
      try { await save([{ id, showing }]); toast(`${t.name}: ${showing.aspect ? `${showing.aspect}:1 picture, filled edge to edge` : 'full 16:9 picture'}.`, { ms: 2500 }); } catch { /* shown */ }
      return;
    }
    if (f.dataset.proj) showing.projection = f.dataset.proj;
    if (f.dataset.st) showing.stereo = f.dataset.st === 'mono' ? null : f.dataset.st;
    const label = (showing.projection === '180' ? '180° VR' : '360°') + (showing.stereo ? (showing.stereo === 'tb' ? ', VR top / bottom' : ', VR side by side') : '');
    try { await save([{ id, showing }]); toast(`${t.name}: ${label}.`, { ms: 2500 }); } catch { /* shown */ }
  });

  // actions
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], .poster-play');
    if (!b || b.disabled) return;
    const act = b.classList.contains('poster-play') ? (byId(id)?.showing ? 'preview' : 'replace') : b.dataset.act;
    if (act === 'replace') openReplace(id);
    else if (act === 'preview') openPreview(id);
    else if (act === 'restart') restart(id);
    else if (act === 'clear') clearScreen(id);
  });

  // drop a link onto the card
  let depth = 0;
  const hasLink = (e) => [...(e.dataTransfer?.types || [])].some((t) => t === 'text/uri-list' || t === 'text/plain');
  el.addEventListener('dragenter', (e) => { if (!hasLink(e)) return; e.preventDefault(); depth++; el.classList.add('drop'); });
  el.addEventListener('dragover', (e) => { if (!hasLink(e)) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; });
  el.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; el.classList.remove('drop'); } });
  el.addEventListener('drop', (e) => {
    if (!hasLink(e)) return;
    e.preventDefault();
    e.stopPropagation();
    depth = 0;
    el.classList.remove('drop');
    const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    const link = splitLinks(text.split('\n').filter((l) => !l.startsWith('#')).join(' '))[0];
    if (link) dropOnScreen(id, link);
  });
  return el;
}

function updateCard(id) {
  const c = cards.get(id);
  const t = byId(id);
  if (!c || !t) return;
  const el = c.el, s = t.showing;
  const key = s ? sourceKey(s) + '|' + (s.thumb || '') + '|' + s.title : 'off';
  if (c.key !== key) {
    const art = $('.poster-art', el);
    art.innerHTML = posterArt(s);
    wirePoster(art);
    $('.kind', el).innerHTML = badge(s);
    c.key = key;
  }
  el.classList.toggle('is-off', !s);
  const name = $('.name', el);
  if (document.activeElement !== name) name.value = t.name;
  name.setAttribute('aria-label', `Screen name (${META[id].where})`);
  const title = $('.title', el);
  title.textContent = s ? s.title : 'Nothing scheduled';
  title.classList.toggle('off', !s);
  title.title = s ? s.title : '';
  $('.channel', el).textContent = s ? [s.channel, s.offset ? `starts at ${clock(s.offset)}` : ''].filter(Boolean).join(' · ') || kindLabel(s) : 'This screen is turned off in the game.';
  $('.poster-live', el).hidden = !s;
  $('.drop-hint', el).textContent = `Drop to show on ${t.name}`;
  const play = $('.poster-play', el);
  play.setAttribute('aria-label', s ? `Preview ${s.title} on ${t.name}` : `Schedule a showing on ${t.name}`);
  play.innerHTML = s ? ICON.play : ICON.replace;
  updateTimes(id);
  if (!el._volDirty) el._paintVol(Math.round((s?.volume ?? 1) * 100));
  $('.vol-range', el).disabled = !s;
  $('.vol-btn', el).disabled = !s;
  $('.vol-range', el).setAttribute('aria-label', `${t.name} volume`);
  for (const b of $$('[data-act]', el)) {
    const a = b.dataset.act;
    b.disabled = !s && a !== 'replace';
    b.setAttribute('aria-label', `${a === 'clear' ? 'Turn off' : a[0].toUpperCase() + a.slice(1)} · ${t.name}`);
  }
  $('[data-act="replace"] span', el).textContent = s ? 'Replace' : 'Add showing';
  for (const b of $$('[data-asp]', el)) { b.setAttribute('aria-pressed', String(String(s?.aspect || 0) === b.dataset.asp)); b.disabled = !s; }
  for (const b of $$('[data-proj]', el)) { b.setAttribute('aria-pressed', String((s?.projection || '360') === b.dataset.proj)); b.disabled = !s; }
  for (const b of $$('[data-st]', el)) { b.setAttribute('aria-pressed', String((s?.stereo || 'mono') === b.dataset.st)); b.disabled = !s; }
}

function updateTimes(only) {
  for (const [id, c] of cards) {
    if (only && id !== only) continue;
    const s = byId(id)?.showing;
    if (s) $('.live-text', c.el).textContent = startedText(s.startedAt);
  }
}

function flash(ids) {
  for (const id of ids) {
    const el = cards.get(id)?.el;
    if (!el) continue;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }
}

function setCardBusy(id, msg) {
  const el = cards.get(id)?.el;
  if (!el) return;
  $('.poster-busy', el)?.remove();
  if (msg) $('.poster', el).insertAdjacentHTML('beforeend', `<div class="poster-busy"><span class="spin"></span><span>${esc(msg)}</span></div>`);
}

// ---------------------------------------------------------------- screen actions

async function publishOne(id, showing, verb) {
  const t = byId(id);
  const prev = t?.showing ?? null;
  const next = showing ? { ...showing, startedAt: now(), volume: showing.volume ?? prev?.volume ?? 1 } : null;
  await save([{ id, showing: next }]);
  flash([id]);
  toast(verb, { action: 'Undo', onAction: () => save([{ id, showing: prev }]).then(() => { flash([id]); toast(`${nameOf(id)} is back to how it was.`, { ms: 3000 }); }).catch(() => {}) });
}

async function restart(id) {
  const t = byId(id);
  if (!t?.showing) return;
  try {
    await save([{ id, showing: { ...t.showing, startedAt: now() } }]);
    flash([id]);
    toast(`${t.name} restarted from the beginning.`);
  } catch { /* toast already shown */ }
}

async function clearScreen(id) {
  const t = byId(id);
  if (!t?.showing) return;
  try { await publishOne(id, null, `${t.name} is dark now.`); } catch { /* shown */ }
}

async function dropOnScreen(id, link) {
  setCardBusy(id, 'Looking up the link…');
  let r;
  try { r = await resolveLink(link); }
  catch (e) {
    setCardBusy(id, null);
    if (e.status !== 401 && e.status !== 429) toast(e.message, { type: 'err' });
    return;
  }
  try {
    if (sourceKey(r.showing) === sourceKey(byId(id)?.showing)) { toast(`That's already showing on ${nameOf(id)}.`, { type: 'warn' }); return; }
    setCardBusy(id, 'Publishing…');
    const prevVol = byId(id)?.showing?.volume;
    await publishOne(id, { ...r.showing, volume: prevVol ?? 1 }, `Now showing on ${nameOf(id)}: ${r.showing.title}`);
    if (r.warning) toast(r.warning, { type: 'warn' });
  } catch { /* save() already explained it */ }
  finally { setCardBusy(id, null); }
}

// ---------------------------------------------------------------- smart paste

const smartInput = $('#smart-input');
const autoGrow = () => { smartInput.style.height = 'auto'; smartInput.style.height = Math.min(180, smartInput.scrollHeight) + 'px'; };
smartInput.addEventListener('input', autoGrow);
smartInput.addEventListener('paste', () => setTimeout(() => { autoGrow(); analyze(); }, 0));
smartInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyze(); } });
$('#smart-go').addEventListener('click', () => analyze());
$('#proposal-discard').addEventListener('click', () => { state.proposal = []; renderProposal(); smartInput.focus(); });
$('#proposal-publish').addEventListener('click', publishLineup);

let seq = 0;
function analyze(text = smartInput.value) {
  const links = splitLinks(text);
  if (!links.length) {
    if (text.trim()) toast("Couldn't find any links in that text. Paste YouTube links or .mp4/.webm file links.", { type: 'warn' });
    smartInput.focus();
    return;
  }
  smartInput.value = '';
  autoGrow();
  let skipped = 0;
  for (const input of links) {
    if (state.proposal.some((p) => p.input === input)) { skipped++; continue; }
    const item = { key: ++seq, input, status: 'loading', target: '', manual: false };
    state.proposal.push(item);
    resolveLink(input).then((r) => {
      item.showing = r.showing;
      item.warning = r.warning;
      // the same film pasted twice under different links
      if (state.proposal.some((p) => p !== item && p.status === 'ok' && sourceKey(p.showing) === sourceKey(r.showing))) {
        state.proposal = state.proposal.filter((p) => p !== item);
        toast(`Skipped a duplicate: “${r.showing.title}” is already in the lineup.`, { type: 'warn', ms: 3500 });
      } else item.status = 'ok';
    }, (e) => {
      if (e.status === 401 || e.status === 429) { state.proposal = []; return; }
      item.status = 'error';
      item.error = e.message;
    }).finally(() => { if (state.proposal.length) { autoAssign(); renderProposal(); } });
  }
  if (skipped) toast(`Skipped ${skipped} link${skipped > 1 ? 's' : ''} already in the lineup.`, { type: 'warn', ms: 3000 });
  autoAssign();
  renderProposal();
  const prop = $('#proposal');
  if (prop.getBoundingClientRect().top > innerHeight - 120) prop.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Assignment: cinema screens only; dark screens first, then the longest-running showing (smallest startedAt);
// one link per screen; links already showing somewhere are left unscheduled. Manual picks are kept as-is.
function autoAssign() {
  const taken = new Set(state.proposal.filter((p) => p.manual && p.target).map((p) => p.target));
  const order = CINEMA.map((id, i) => ({ id, i, t: byId(id) }))
    .sort((a, b) => {
      const ao = a.t?.showing ? 1 : 0, bo = b.t?.showing ? 1 : 0;
      if (ao !== bo) return ao - bo;
      if (ao) return (a.t.showing.startedAt - b.t.showing.startedAt) || (a.i - b.i);
      return a.i - b.i;
    })
    .map((x) => x.id);
  const showingAt = new Map();
  for (const t of state.doc?.theaters || []) if (t.showing) showingAt.set(sourceKey(t.showing), t.id);
  for (const p of state.proposal) {
    if (p.manual) continue;
    p.dupOf = '';
    p.target = '';
    if (p.status !== 'ok') continue;
    const where = showingAt.get(sourceKey(p.showing));
    if (where) { p.dupOf = where; continue; }
    const id = order.find((x) => !taken.has(x));
    if (id) { p.target = id; taken.add(id); }
  }
}

function whyText(p) {
  if (p.status === 'loading') return 'Finding the best screen…';
  if (p.status === 'error') return 'Fix or remove this link';
  if (!p.target) {
    if (p.dupOf) return `Already showing on ${nameOf(p.dupOf)}`;
    return 'Not scheduled · pick a screen';
  }
  const cur = byId(p.target)?.showing;
  if (!cur) return 'Screen is dark';
  if (sourceKey(cur) === sourceKey(p.showing)) return 'Already showing here';
  const a = ago(cur.startedAt);
  if (cur.startedAt <= DEFAULT_EPOCH) return `Replaces ${cur.title} · built-in programme`;
  return `Replaces ${cur.title} · ${a.startsWith('since') ? 'on ' + a : 'started ' + a}`;
}

function screenOptions(sel) {
  const opt = (id) => {
    const t = byId(id);
    const used = state.proposal.find((p) => p.target === id);
    return `<option value="${id}"${id === sel ? ' selected' : ''}>${esc(t?.name || id)}${!t?.showing ? ' (dark)' : ''}${used && id !== sel ? ' · in lineup' : ''}</option>`;
  };
  return `<option value=""${!sel ? ' selected' : ''}>Don't schedule</option>
    <optgroup label="Bayou Palace Cinemas">${CINEMA.map(opt).join('')}</optgroup>
    <optgroup label="Other maps">${opt('prison')}${opt('condo')}</optgroup>`;
}

function renderProposal() {
  const box = $('#proposal');
  const items = state.proposal;
  box.hidden = !items.length;
  $('#smart').classList.toggle('has-proposal', !!items.length);
  if (!items.length) return;
  const list = $('#proposal-list');
  const focusedKey = document.activeElement?.closest?.('.prow')?.dataset.key;
  const focusedCls = document.activeElement?.className;
  list.innerHTML = items.map((p) => {
    const s = p.showing;
    const thumb = p.status === 'loading' ? '<span class="spin"></span>'
      : s?.thumb ? `<img src="${esc(s.thumb)}" alt="" referrerpolicy="no-referrer">`
        : s ? `<div class="gen" style="--h:${hue(s.title)};padding:6px 8px"><div class="gen-title" style="font-size:13px">${esc(s.title)}</div></div>`
          : `<span class="err-ic">${ICON.bang}</span>`;
    const title = p.status === 'ok' ? s.title : p.status === 'loading' ? 'Looking up…' : p.input;
    const meta = p.status === 'ok'
      ? [s.channel, kindLabel(s), s.offset ? `starts at ${clock(s.offset)}` : ''].filter(Boolean).map(esc).join(' · ') + (p.warning ? ` · <span class="warn">${esc(p.warning)}</span>` : '')
      : p.status === 'loading' ? esc(p.input) : esc(p.error);
    const cls = ['prow', p.status === 'error' ? 'error' : '', p.status === 'ok' && !p.target ? 'skip' : ''].join(' ');
    return `<li class="${cls}" data-key="${p.key}">
      <div class="prow-screen">
        <label class="select${p.target ? '' : ' unset'}"><span class="sr-only">Screen for ${esc(title)}</span>
          <select class="prow-sel"${p.status !== 'ok' ? ' disabled' : ''}>${screenOptions(p.target)}</select></label>
        <span class="prow-why">${esc(whyText(p))}</span>
      </div>
      <span class="prow-arrow" aria-hidden="true">${ICON.arrow}</span>
      <div class="prow-film">
        <div class="pthumb">${thumb}</div>
        <div class="pinfo"><div class="ptitle" title="${esc(title)}">${esc(title)}</div><div class="pmeta">${meta}</div></div>
      </div>
      <button class="icon-btn prow-del" type="button" aria-label="Remove ${esc(title)} from the lineup">${ICON.x}</button>
    </li>`;
  }).join('');
  for (const img of $$('img', list)) img.addEventListener('error', () => img.remove(), { once: true });
  if (focusedKey) $(`.prow[data-key="${focusedKey}"] .${String(focusedCls).split(' ').includes('prow-sel') ? 'prow-sel' : 'prow-del'}`, list)?.focus();

  const loading = items.filter((p) => p.status === 'loading').length;
  const errors = items.filter((p) => p.status === 'error').length;
  const ready = items.filter((p) => p.status === 'ok' && p.target);
  const sum = [];
  if (loading) sum.push(`Looking up ${loading} link${loading > 1 ? 's' : ''}…`);
  if (ready.length) sum.push(`<strong>${ready.length} showing${ready.length > 1 ? 's' : ''}</strong> ready for ${ready.length > 1 ? `${ready.length} screens` : nameOf(ready[0].target)}`);
  if (errors) sum.push(`${errors} link${errors > 1 ? 's' : ''} couldn't be used`);
  $('#proposal-sum').innerHTML = sum.join(' · ') || 'Pick a screen for at least one showing.';
  const dark = CINEMA.filter((id) => !byId(id)?.showing).length;
  $('#proposal-note').textContent = loading ? 'Finding titles and the best screens…'
    : dark ? `Dark screens are filled first, then the longest-running showings are replaced.`
      : 'All screens are showing, so the longest-running showings are replaced first.';
  const pub = $('#proposal-publish');
  pub.disabled = !ready.length || !!loading || state.saving > 0;
  pub.textContent = ready.length > 1 ? `Publish lineup (${ready.length})` : 'Publish lineup';
}

$('#proposal-list').addEventListener('change', (e) => {
  const sel = e.target.closest('.prow-sel');
  if (!sel) return;
  const item = state.proposal.find((p) => String(p.key) === sel.closest('.prow').dataset.key);
  if (!item) return;
  const target = sel.value;
  const other = target && state.proposal.find((p) => p !== item && p.target === target);
  if (other) { other.target = item.target; other.manual = true; } // swap: never two links on one screen
  item.target = target;
  item.manual = true;
  autoAssign();
  renderProposal();
});
$('#proposal-list').addEventListener('click', (e) => {
  const b = e.target.closest('.prow-del');
  if (!b) return;
  const key = b.closest('.prow').dataset.key;
  state.proposal = state.proposal.filter((p) => String(p.key) !== key);
  autoAssign();
  renderProposal();
  if (!state.proposal.length) smartInput.focus();
});

async function publishLineup() {
  const ready = state.proposal.filter((p) => p.status === 'ok' && p.target);
  if (!ready.length) return;
  const t0 = now();
  const prev = ready.map((p) => ({ id: p.target, showing: byId(p.target)?.showing ?? null }));
  const theaters = ready.map((p) => {
    const cur = byId(p.target)?.showing;
    const same = cur && sourceKey(cur) === sourceKey(p.showing);
    return { id: p.target, showing: same ? cur : { ...p.showing, startedAt: t0, volume: cur?.volume ?? p.showing.volume ?? 1 } };
  });
  const btn = $('#proposal-publish');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Publishing…';
  try {
    await save(theaters);
    const left = state.proposal.filter((p) => !ready.includes(p));
    state.proposal = left.filter((p) => p.status === 'error'); // keep links that failed, so they can be fixed
    renderProposal();
    flash(theaters.map((t) => t.id));
    const names = theaters.map((t) => nameOf(t.id));
    toast(theaters.length === 1 ? `Published: ${ready[0].showing.title} is now showing on ${names[0]}.` : `Lineup published: ${theaters.length} screens updated.`, {
      action: 'Undo',
      onAction: () => save(prev).then(() => { flash(prev.map((p) => p.id)); toast('Lineup undone.', { ms: 3000 }); }).catch(() => {}),
    });
    cards.get(theaters[0].id)?.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch { /* toast already shown */ }
  finally { renderProposal(); }
}

// Paste anywhere (when not typing in a field) or drop anywhere outside a card -> smart bar
function typingTarget(el) {
  return el && (el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
}
document.addEventListener('paste', (e) => {
  if ($('#app').hidden || typingTarget(e.target) || typingTarget(document.activeElement) || document.querySelector('dialog[open]')) return;
  const text = e.clipboardData?.getData('text') || '';
  if (!text.trim()) return;
  e.preventDefault();
  const smart = $('#smart');
  smart.classList.add('glow');
  setTimeout(() => smart.classList.remove('glow'), 900);
  smart.scrollIntoView({ behavior: 'smooth', block: 'start' });
  analyze(text);
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !$('#app').hidden && !typingTarget(document.activeElement) && !document.querySelector('dialog[open]')) { e.preventDefault(); smartInput.focus(); }
});
const smartBar = $('#smart-bar');
let pageDrag = 0;
document.addEventListener('dragenter', (e) => { if (!$('#app').hidden && [...(e.dataTransfer?.types || [])].includes('text/plain')) { pageDrag++; smartBar.classList.add('drag'); } });
document.addEventListener('dragleave', () => { if (--pageDrag <= 0) { pageDrag = 0; smartBar.classList.remove('drag'); } });
document.addEventListener('dragover', (e) => { if (!$('#app').hidden) e.preventDefault(); });
document.addEventListener('drop', (e) => {
  pageDrag = 0;
  smartBar.classList.remove('drag');
  if ($('#app').hidden) return;
  e.preventDefault();
  const text = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || '';
  if (text.trim()) analyze(text.split('\n').filter((l) => !l.startsWith('#')).join('\n'));
});

// ---------------------------------------------------------------- Replace dialog

const repDlg = $('#replace-dlg'), repInput = $('#replace-input'), repPrev = $('#replace-preview'), repOk = $('#replace-ok');
let repFor = null, repDraft = null, repSeq = 0;

function openReplace(id) {
  const t = byId(id);
  repFor = id;
  repDraft = null;
  $('#replace-eyebrow').textContent = `${t.name} · ${META[id].where}`;
  $('#replace-title').textContent = t.showing ? 'Replace showing' : 'New showing';
  repInput.value = '';
  repPrev.innerHTML = t.showing ? `<p class="rp-msg">Now showing: <strong>${esc(t.showing.title)}</strong>. Paste a link to replace it.</p>` : '';
  repOk.disabled = true;
  repOk.textContent = `Show on ${t.name}`;
  repDlg.showModal();
  repInput.focus();
}
async function repResolve() {
  const v = repInput.value.trim();
  repDraft = null;
  repOk.disabled = true;
  if (!v) { repPrev.innerHTML = ''; return; }
  const my = ++repSeq;
  repPrev.innerHTML = '<p class="rp-msg"><span class="spin"></span> Looking up the link…</p>';
  try {
    const r = await resolveLink(splitLinks(v)[0] || v);
    if (my !== repSeq) return;
    const s = r.showing;
    repDraft = s;
    const thumb = s.thumb ? `<img src="${esc(s.thumb)}" alt="" referrerpolicy="no-referrer">` : `<div class="gen" style="--h:${hue(s.title)};padding:6px 8px"><div class="gen-title" style="font-size:14px">${esc(s.title)}</div></div>`;
    const same = sourceKey(s) === sourceKey(byId(repFor)?.showing);
    repPrev.innerHTML = `<div class="rp"><div class="pthumb">${thumb}</div><div class="pinfo"><div class="ptitle">${esc(s.title)}</div><div class="pmeta">${[s.channel, kindLabel(s), s.offset ? `starts at ${clock(s.offset)}` : ''].filter(Boolean).map(esc).join(' · ')}</div>${r.warning ? `<div class="pmeta"><span class="warn">${esc(r.warning)}</span></div>` : ''}${same ? '<div class="pmeta"><span class="warn">This is already showing here. Publishing restarts it.</span></div>' : ''}</div></div>`;
    repOk.disabled = false;
  } catch (e) {
    if (my !== repSeq) return;
    if (e.status === 401 || e.status === 429) return;
    repPrev.innerHTML = `<p class="rp-msg err">${ICON.bang} ${esc(e.message)}</p>`;
  }
}
let repT = 0;
repInput.addEventListener('input', () => { clearTimeout(repT); repT = setTimeout(repResolve, 450); });
repInput.addEventListener('paste', () => { clearTimeout(repT); setTimeout(repResolve, 0); });
repInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (repDraft) repOk.click(); else { clearTimeout(repT); repResolve(); } } });
$('#replace-form').addEventListener('submit', async (e) => {
  const v = e.submitter?.value;
  if (v !== 'ok') return;
  e.preventDefault();
  if (!repDraft || !repFor) return;
  const id = repFor, draft = repDraft;
  repDlg.close();
  setCardBusy(id, 'Publishing…');
  try { await publishOne(id, draft, `Now showing on ${nameOf(id)}: ${draft.title}`); }
  catch { /* toast shown */ }
  finally { setCardBusy(id, null); }
});

// ---------------------------------------------------------------- Preview dialog

const prevDlg = $('#preview-dlg');
function openPreview(id) {
  const t = byId(id), s = t?.showing;
  if (!s) return;
  $('#preview-eyebrow').textContent = `${t.name} · ${META[id].where}`;
  $('#preview-title').textContent = s.title;
  const frame = $('#preview-frame');
  const elapsed = (s.offset || 0) + Math.max(0, (now() - s.startedAt) / 1000);
  if (s.kind === 'youtube') {
    const q = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1' });
    if (s.offset) q.set('start', String(Math.floor(s.offset)));
    if (s.listId) q.set('list', s.listId);
    const src = `https://www.youtube-nocookie.com/embed/${s.videoId ? s.videoId : 'videoseries'}?${q}`;
    frame.innerHTML = `<iframe src="${esc(src)}" title="${esc(s.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    $('#preview-note').textContent = `${[s.channel, kindLabel(s)].filter(Boolean).join(' · ')}. ${startedText(s.startedAt)}; in the game it plays from where the showing is now${s.loop ? ' and loops' : ''}.`;
  } else {
    frame.innerHTML = `<video controls autoplay playsinline src="${esc(s.url)}"></video>`;
    const v = $('video', frame);
    v.volume = s.volume ?? 1;
    v.addEventListener('loadedmetadata', () => {
      const d = v.duration;
      if (Number.isFinite(d) && d > 0) {
        const pos = s.loop ? elapsed % d : Math.min(elapsed, d);
        v.currentTime = pos;
        $('#preview-note').textContent = `Synced to what players see right now: ${clock(pos)} of ${clock(d)}. ${startedText(s.startedAt)}.`;
      }
    }, { once: true });
    v.addEventListener('error', () => { $('#preview-note').textContent = "This video file couldn't be loaded. Check that the link still works."; }, { once: true });
    $('#preview-note').textContent = startedText(s.startedAt) + '.';
  }
  prevDlg.showModal();
  $('#preview-close').focus();
}
$('#preview-close').addEventListener('click', () => prevDlg.close());
prevDlg.addEventListener('close', () => { $('#preview-frame').innerHTML = ''; });
for (const d of [prevDlg, repDlg]) {
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // click on the backdrop
}
function closeDialogs() { for (const d of $$('dialog[open]')) d.close(); }

// ---------------------------------------------------------------- boot

if (state.pin) {
  // a refresh keeps the session: show the dashboard straight away, and confirm the PIN in the background
  enterApp();
  post('login').catch((e) => {
    if (e.status === 401) showLock('Your session ended. Enter the PIN again.');
    else if (e.status === 429) showLock(e.message, e.body?.retryAfter || 900);
  });
} else {
  showLock();
}
