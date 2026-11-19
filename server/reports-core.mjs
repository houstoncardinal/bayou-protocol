// Production reports from players' browsers (src/mods/57-telemetry.js), kept by the online hub
// (server/net-worker.mjs: POST /report, GET /reports?key=...). Two kinds:
//   - error: an uncaught exception or promise rejection. Grouped by its message: a count, when it was first and
//     last seen, the last stack, browser and map. At most 300 different messages are kept (the rarest go first).
//   - perf: one summary per play session (average fps, the slowest 1 %, stalls, quality, resolution scale,
//     graphics card, browser, map). Kept as running totals per map and quality, plus the last 200 sessions.
// Nothing personal is stored: no name, account or address (the address is only used, in memory, to limit how
// often one browser can report).
const MAX_ERRORS = 300,
  MAX_RECENT = 200,
  MAX_BODY = 6000;
const str = (v, n) => String(v ?? '').slice(0, n);
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : null);

export class Reports {
  constructor(store) {
    this.store = store; // { get(k), put(k, v) }
    this.rate = new Map(); // address -> { at, n }
  }
  // true if this address may report now (30 a minute)
  allow(addr) {
    const now = Date.now(),
      r = this.rate.get(addr) || { at: now, n: 0 };
    if (now - r.at > 60e3) (r.at = now), (r.n = 0);
    r.n++;
    this.rate.set(addr, r);
    if (this.rate.size > 5000) this.rate.clear();
    return r.n <= 30;
  }
  async add(raw, addr = '') {
    if (typeof raw !== 'string' || raw.length > MAX_BODY) return { ok: false, why: 'size' };
    if (!this.allow(addr)) return { ok: false, why: 'rate' };
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return { ok: false, why: 'json' };
    }
    if (!m || typeof m !== 'object') return { ok: false, why: 'json' };
    const now = Date.now();
    if (m.kind === 'error') {
      const msg = str(m.msg, 300);
      if (!msg) return { ok: false, why: 'empty' };
      const all = (await this.store.get('rep:err')) || {};
      const e = all[msg] || { n: 0, first: now };
      Object.assign(e, { n: e.n + 1, last: now, stack: str(m.stack, 1500), ua: str(m.ua, 160), map: str(m.map, 24) });
      all[msg] = e;
      const keys = Object.keys(all);
      if (keys.length > MAX_ERRORS) {
        keys.sort((a, b) => all[a].n - all[b].n || all[a].last - all[b].last);
        for (const k of keys.slice(0, keys.length - MAX_ERRORS)) delete all[k];
      }
      await this.store.put('rep:err', all);
      return { ok: true };
    }
    if (m.kind === 'perf') {
      const s = {
        at: now,
        map: str(m.map, 24),
        q: str(m.quality ?? m.q, 12),
        fps: num(m.fps ?? m.avg, 0, 1000),
        // (the game sends the frame time 99 % of frames beat, in ms: as frames a second here)
        low: m.p99ms > 0 ? num(1000 / m.p99ms, 0, 1000) : num(m.low, 0, 1000),
        stalls: num(m.stalls, 0, 1e5),
        frames: num(m.frames ?? m.n, 0, 1e8),
        dpr: num(m.dpr ?? m.scale, 0, 8),
        gpu: str(m.gpu, 80),
        ua: str(m.ua, 160),
      };
      const agg = (await this.store.get('rep:perf')) || { by: {}, recent: [] };
      const k = (s.map || '?') + ' · ' + (s.q || '?'),
        a = agg.by[k] || { sessions: 0, fpsSum: 0, lowSum: 0, stalls: 0, under30: 0 };
      a.sessions++;
      s.fps != null && (a.fpsSum += s.fps);
      s.low != null && (a.lowSum += s.low);
      a.stalls += s.stalls || 0;
      s.fps != null && s.fps < 30 && a.under30++;
      agg.by[k] = a;
      agg.recent.push(s);
      agg.recent.length > MAX_RECENT && agg.recent.splice(0, agg.recent.length - MAX_RECENT);
      await this.store.put('rep:perf', agg);
      return { ok: true };
    }
    return { ok: false, why: 'kind' };
  }
  // the owner's view: errors by how often they happen, performance by map and quality
  async summary() {
    const err = (await this.store.get('rep:err')) || {},
      perf = (await this.store.get('rep:perf')) || { by: {}, recent: [] };
    return {
      errors: Object.entries(err)
        .map(([msg, e]) => ({ msg, ...e, first: new Date(e.first).toISOString(), last: new Date(e.last).toISOString() }))
        .sort((a, b) => b.n - a.n),
      performance: Object.entries(perf.by)
        .map(([k, a]) => ({ where: k, sessions: a.sessions, avgFps: +(a.fpsSum / a.sessions).toFixed(1), avgSlowest1pct: +(a.lowSum / a.sessions).toFixed(1), sessionsUnder30fps: a.under30, stalls: a.stalls }))
        .sort((a, b) => b.sessions - a.sessions),
      recentSessions: perf.recent.slice(-50).reverse(),
    };
  }
}
export { MAX_BODY as REPORT_MAX_BODY };
