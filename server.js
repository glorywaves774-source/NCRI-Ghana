'use strict';
/* NCRI-Ghana server: one file, no npm packages. Needs Node 22+ (uses the built-in SQLite).
   Start:  node server.js     Settings come from environment variables (see README.md). */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const Laari = require('./assets/js/chat-engine.js');
const Backup = require('./backup.js');
const LaariKB = require('./assets/js/laari-kb.js');

const ROOT = __dirname;
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const MEDIA = path.join(DATA, 'uploads');   // public pictures and videos, served at /uploads/
const DOCS = path.join(DATA, 'docs');       // documents, served only through /download/<id>
const PORT = +process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || 'http://localhost:' + PORT).replace(/\/+$/, '');
const SECURE = /^https/.test(BASE_URL) || process.env.COOKIE_SECURE === '1';
const PAYSTACK = process.env.PAYSTACK_SECRET_KEY || '';
const STRIPE = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WH = process.env.STRIPE_WEBHOOK_SECRET || '';
[DATA, MEDIA, DOCS].forEach(d => fs.mkdirSync(d, { recursive: true }));

/* ---------- database ---------- */
const db = new DatabaseSync(path.join(DATA, 'ncri.db'));
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS items(id INTEGER PRIMARY KEY AUTOINCREMENT, res TEXT NOT NULL, data TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS ix_items_res ON items(res);
CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, hash TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, admin_id INTEGER, expires INTEGER);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, name TEXT, email TEXT, phone TEXT, org TEXT, subject TEXT, message TEXT, status TEXT DEFAULT 'new', created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS subscribers(email TEXT PRIMARY KEY, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS donations(ref TEXT PRIMARY KEY, route TEXT, currency TEXT, amount REAL, name TEXT, email TEXT, phone TEXT, message TEXT, anonymous INTEGER DEFAULT 0, method TEXT, gateway TEXT, status TEXT DEFAULT 'pending', created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS chatlog(id INTEGER PRIMARY KEY AUTOINCREMENT, q TEXT, answered INTEGER, matched TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
`);
const all = (sql, ...p) => db.prepare(sql).all(...p);
const one = (sql, ...p) => db.prepare(sql).get(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);

/* ---------- content resources the admin can manage ----------
   f = fields kept for each record. t: text, long, bool, num, date, image, select */
const RES = {
  news:     { label: 'News', order: 'published_at DESC, id DESC', f: { title: 't', slug: 't', category: 't', summary: 'long', body: 'long', image: 'image', published_at: 'date', published: 'bool' } },
  documents:{ label: 'Documents', order: 'id DESC', f: { category: 'select', title: 't', description: 't', version: 't', doc_date: 'date', file: 'file', original_name: 't', mime: 't', size: 'num', downloads: 'num', published: 'bool' } },
  faqs:     { label: 'Laari answers (FAQs)', order: 'id', f: { category: 't', question: 't', answer: 'long', keywords: 't', link: 't', published: 'bool' } },
  people:   { label: 'People', order: 'id', f: { grp: 'select', name: 't', role: 't', bio: 'long', photo: 'image', published: 'bool' } },
  partners: { label: 'Partners', order: 'id', f: { name: 't', kind: 't', url: 't', logo: 'image', published: 'bool' } },
  videos:   { label: 'Videos', order: 'id DESC', f: { title: 't', description: 't', poster: 'image', embed_type: 'select', embed_src: 't', published: 'bool' } },
  gallery:  { label: 'Gallery photos', order: 'id', f: { file: 'image', thumb: 'image', caption: 't', alt: 't', pillar: 't', featured: 'bool' } },
  metrics:  { label: 'Results: headline numbers', order: 'id', f: { label: 't', low: 'num', high: 'num', achieved: 'num', unit: 't', color: 't' } },
  indicators:{ label: 'Results: indicators', order: 'id', f: { indicator: 't', pillar_name: 't', period: 't', note: 't', unit: 't', baseline: 'num', target: 'num', achieved: 'num', status: 'select' } },
  donate_channels: { label: 'Ways to give', order: 'id', f: { route: 'select', title: 't', details: 'long', link: 't' } }
};
const SELECTS = {
  documents: { category: [['getinvolved-form', 'Get involved: volunteer forms'], ['partnership-brief', 'Partnerships: briefs and templates'], ['resource-report', 'Resources: reports'], ['resource-toolkit', 'Resources: toolkits and guides'], ['resource-brief', 'Resources: briefs and factsheets'], ['resource-training', 'Resources: training materials'],
    ['policy-accountability', 'Policy: accountability'], ['policy-anti-fraud-corruption', 'Policy: anti-fraud and corruption'], ['policy-complaints-whistleblowing', 'Policy: complaints and whistleblowing'], ['policy-conflict-of-interest', 'Policy: conflict of interest'], ['policy-financial-management', 'Policy: financial management'], ['policy-procurement', 'Policy: procurement'], ['policy-child-safeguarding', 'Policy: child safeguarding'], ['policy-gender-inclusion', 'Policy: gender equality and inclusion'], ['policy-data-protection', 'Policy: data protection and records']] },
  people: { grp: [['board', 'Board of Directors'], ['management', 'Management'], ['staff', 'Staff'], ['volunteers', 'Volunteers'], ['interns', 'Interns']] },
  indicators: { status: [['Not started', 'Not started'], ['On track', 'On track'], ['At risk', 'At risk'], ['Achieved', 'Achieved']] },
  videos: { embed_type: [['iframe', 'YouTube or Vimeo embed link'], ['file', 'Uploaded video file'], ['hls', 'HLS stream']] },
  donate_channels: { route: [['ghana', 'Giving from Ghana'], ['international', 'Giving from abroad']] }
};
const DOC_CATS = SELECTS.documents.category.map(([value, label]) => ({ value, label }));

const parse = r => Object.assign({ id: r.id }, JSON.parse(r.data));
const list = (res) => all('SELECT * FROM items WHERE res=? ORDER BY id', res).map(parse);
function sortRows(res, rows) {
  const o = RES[res].order;
  if (/published_at/.test(o)) return rows.sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')) || b.id - a.id);
  if (/id DESC/.test(o)) return rows.sort((a, b) => b.id - a.id);
  return rows;
}
const isPub = x => x.published === undefined || +x.published !== 0;
const publicList = res => sortRows(res, list(res)).filter(isPub);
const slugify = s => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';

/* ---------- first-run seeding from assets/seed ---------- */
function seedFile(n) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/seed', n + '.json'), 'utf8')); } catch (e) { return null; } }
function seed() {
  const ins = db.prepare('INSERT INTO items(res,data) VALUES(?,?)');
  const has = r => one('SELECT 1 x FROM items WHERE res=?', r);
  const add = (res, arr, map) => { if (has(res) || !arr) return; arr.forEach(x => { const d = map ? map(x) : x; delete d.id; ins.run(res, JSON.stringify(d)); }); };
  add('news', (seedFile('news') || []).map(n => Object.assign({}, n, seedFile('news_' + n.slug) || {})), x => Object.assign(x, { published: 1 }));
  add('documents', seedFile('documents'));
  add('faqs', seedFile('faqs'), x => Object.assign({ keywords: '', published: 1 }, x));
  add('people', seedFile('people')); add('partners', seedFile('partners')); add('videos', seedFile('videos'));
  add('gallery', seedFile('gallery'));
  add('donate_channels', seedFile('donate_channels'));
  const mel = seedFile('mel') || {};
  add('metrics', mel.metrics); add('indicators', mel.indicators);
  if (!one('SELECT 1 x FROM settings')) {
    const s = (seedFile('bootstrap') || {}).settings || {};
    const put = db.prepare('INSERT OR IGNORE INTO settings(k,v) VALUES(?,?)');
    Object.keys(s).forEach(k => put.run(k, typeof s[k] === 'string' ? s[k] : JSON.stringify(s[k])));
  }
  /* settings added in later versions (for example social links) appear in existing databases too, empty until filled in */
  { const sd = (seedFile('bootstrap') || {}).settings || {}, put2 = db.prepare('INSERT OR IGNORE INTO settings(k,v) VALUES(?,?)'); Object.keys(sd).forEach(k => put2.run(k, typeof sd[k] === 'string' ? sd[k] : JSON.stringify(sd[k]))); }
  /* one-time: list Saboba Youth Centre as a partner on sites that already have data (the team can edit or remove it afterwards) */
  db.exec('CREATE TABLE IF NOT EXISTS migrations(k TEXT PRIMARY KEY)');
  if (!one("SELECT 1 x FROM migrations WHERE k='partner_syc'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('partner_syc')");
    if (!one("SELECT 1 x FROM items WHERE res='partners' AND data LIKE '%Saboba Youth Centre%'")) ((seedFile('partners') || []).forEach(x => ins.run('partners', JSON.stringify(x))));
  }
  /* one-time: refresh the Managing Director's bio with his qualifications */
  if (!one("SELECT 1 x FROM migrations WHERE k='people_md_bio3'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('people_md_bio3')");
    const md = (seedFile('people') || []).find(x => x.name === 'John Kombian'), row = one("SELECT id,data FROM items WHERE res='people' AND data LIKE '%John Kombian%'");
    if (md && row) run('UPDATE items SET data=? WHERE id=?', JSON.stringify(Object.assign(JSON.parse(row.data), { bio: md.bio })), row.id);
  }
  /* one-time: add the partnership briefs and templates to sites that already have data */
  if (!one("SELECT 1 x FROM migrations WHERE k='docs_partnership_pack'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('docs_partnership_pack')");
    (seedFile('documents') || []).filter(x => /^assets\/docs\/partnership-/.test(x.static_url || '')).forEach(x => { if (!one("SELECT 1 x FROM items WHERE res='documents' AND data LIKE ?", '%' + x.static_url + '%')) ins.run('documents', JSON.stringify(x)); });
  }
  /* one-time: add the Managing Director and a Board member to sites that already have data (editable in Admin > People) */
  if (!one("SELECT 1 x FROM migrations WHERE k='people_md_board'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('people_md_board')");
    (seedFile('people') || []).forEach(x => { if (!one("SELECT 1 x FROM items WHERE res='people' AND data LIKE ?", '%' + x.name.slice(0, 12) + '%')) ins.run('people', JSON.stringify(x)); });
  }
  /* one-time: add Board member Patience Lila Dibabe to sites that already have data (editable in Admin > People) */
  if (!one("SELECT 1 x FROM migrations WHERE k='people_patience_dibabe'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('people_patience_dibabe')");
    (seedFile('people') || []).filter(x => x.name === 'Patience Lila Dibabe').forEach(x => { if (!one("SELECT 1 x FROM items WHERE res='people' AND data LIKE ?", '%Patience Lila%')) ins.run('people', JSON.stringify(x)); });
  }
  /* one-time: add the two further partners to sites that already have data */
  if (!one("SELECT 1 x FROM migrations WHERE k='partners_holido_healthaid'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('partners_holido_healthaid')");
    (seedFile('partners') || []).filter(x => /HOLIDO|Health-Aid/.test(x.name)).forEach(x => { if (!one("SELECT 1 x FROM items WHERE res='partners' AND data LIKE ?", '%' + x.name.slice(0, 14) + '%')) ins.run('partners', JSON.stringify(x)); });
  }
  /* one-time: add AgriShe to sites that already have data */
  if (!one("SELECT 1 x FROM migrations WHERE k='partner_agrishe'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('partner_agrishe')");
    if (!one("SELECT 1 x FROM items WHERE res='partners' AND data LIKE '%AgriShe%'")) ins.run('partners', JSON.stringify({ name: 'AgriShe Impact Foundation (ASIF)', kind: 'Partner', url: '', logo: '', published: 1 }));
  }
  /* one-time: AgriShe's full name */
  if (!one("SELECT 1 x FROM migrations WHERE k='partner_asif_name'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('partner_asif_name')");
    all("SELECT id,data FROM items WHERE res='partners'").forEach(r => { const d = JSON.parse(r.data); if (d.name === 'AgriShe') { d.name = 'AgriShe Impact Foundation (ASIF)'; run('UPDATE items SET data=? WHERE id=?', JSON.stringify(d), r.id); } });
  }
  /* one-time: AgriShe logo */
  if (!one("SELECT 1 x FROM migrations WHERE k='partner_asif_logo'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('partner_asif_logo')");
    all("SELECT id,data FROM items WHERE res='partners' AND data LIKE '%AgriShe%'").forEach(r => { const d = JSON.parse(r.data); if (!d.logo) { d.logo = '/assets/img/partners/agrishe-asif.png'; run('UPDATE items SET data=? WHERE id=?', JSON.stringify(d), r.id); } });
  }
  /* one-time: logos for HOLIDO and Health-Aid */
  if (!one("SELECT 1 x FROM migrations WHERE k='partner_logos_2'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('partner_logos_2')");
    [['HOLIDO', '/assets/img/partners/holido.png'], ['Health-Aid', '/assets/img/partners/health-aid.png']].forEach(([n, f]) => all("SELECT id,data FROM items WHERE res='partners' AND data LIKE ?", '%' + n + '%').forEach(r => { const d = JSON.parse(r.data); if (!d.logo) { d.logo = f; run('UPDATE items SET data=? WHERE id=?', JSON.stringify(d), r.id); } }));
  }
  /* one-time: add the Saboba Youth Centre logo to the partner entry if it has none */
  if (!one("SELECT 1 x FROM migrations WHERE k='partner_syc_logo'")) {
    run("INSERT OR IGNORE INTO migrations(k) VALUES('partner_syc_logo')");
    all("SELECT id,data FROM items WHERE res='partners' AND data LIKE '%Saboba Youth Centre%'").forEach(r => { const d = JSON.parse(r.data); if (!d.logo) { d.logo = '/assets/img/partners/saboba-youth-centre.jpg'; run('UPDATE items SET data=? WHERE id=?', JSON.stringify(d), r.id); } });
  }
  /* one-time content update: replace the original About text only if nobody has edited it */
  const cur = one("SELECT v FROM settings WHERE k='about_story'"), fresh = ((seedFile('bootstrap') || {}).settings || {}).about_story;
  if (cur && fresh && cur.v !== fresh && /^NCRI-Ghana is a community-focused initiative based in Saboba/.test(cur.v)) run("UPDATE settings SET v=? WHERE k='about_story'", fresh);
}
seed();

/* ---------- settings ---------- */
function settings() { const o = {}; all('SELECT k,v FROM settings').forEach(r => { o[r.k] = r.v; }); return o; }
const truthy = v => v === true || v === 1 || /^(1|true|yes|on)$/i.test(String(v || ''));
const amounts = s => String(s || '').split(/[,\s]+/).map(Number).filter(n => n > 0);

/* ---------- admin accounts and sessions ---------- */
function hashPw(pw) { const salt = crypto.randomBytes(16); return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 64).toString('hex'); }
function checkPw(pw, stored) {
  const [s, h] = String(stored || '').split(':'); if (!s || !h) return false;
  const a = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
(function firstAdmin() {
  if (one('SELECT 1 x FROM admins')) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@ncri-ghana.local').toLowerCase();
  const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  run('INSERT INTO admins(email,hash) VALUES(?,?)', email, hashPw(pw));
  console.log('\n  First administrator created.\n  Email:    ' + email + '\n  Password: ' + pw + (process.env.ADMIN_PASSWORD ? '' : '   (shown once: change it in Admin > Account)') + '\n');
})();
function adminOf(req) {
  const m = /(?:^|;\s*)ncri_s=([a-f0-9]{64})/.exec(req.headers.cookie || ''); if (!m) return null;
  const s = one('SELECT s.token, s.expires, a.id, a.email FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token=?', m[1]);
  if (!s || s.expires < Date.now()) return null;
  return { id: s.id, email: s.email, token: s.token };
}

/* ---------- small helpers ---------- */
const hits = new Map();
function limited(key, max, ms) {
  const now = Date.now(), a = (hits.get(key) || []).filter(t => now - t < ms);
  a.push(now); hits.set(key, a); return a.length > max;
}
setInterval(() => { const now = Date.now(); hits.forEach((a, k) => { if (!a.length || now - a[a.length - 1] > 3600e3) hits.delete(k); }); db.prepare('DELETE FROM sessions WHERE expires<?').run(now); }, 600e3).unref();
const ipOf = req => (process.env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.csv': 'text/csv', '.zip': 'application/zip', '.odt': 'application/vnd.oasis.opendocument.text', '.ods': 'application/vnd.oasis.opendocument.spreadsheet' };
const DOC_EXT = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.csv', '.txt', '.zip']);
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const VID_EXT = new Set(['.mp4', '.webm']);

function send(res, code, body, headers) {
  const h = Object.assign({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Opener-Policy': 'same-origin', 'X-Permitted-Cross-Domain-Policies': 'none' }, headers);
  if (SECURE) h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  if (body !== null && typeof body === 'object' && !Buffer.isBuffer(body)) { body = JSON.stringify(body); h['Content-Type'] = 'application/json; charset=utf-8'; h['Cache-Control'] = 'no-store'; }
  res.writeHead(code, h); res.end(body);
}
const fail = (res, code, msg) => send(res, code, { error: msg });
const CSP = "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://translate.google.com https://translate.googleapis.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com https://translate.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://i.ytimg.com https://www.gstatic.com https://translate.google.com https://translate.googleapis.com https://www.google.com; media-src 'self' blob: https:; frame-src https://translate.google.com https://translate.googleapis.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'";

function readBody(req, max) {
  return new Promise((ok, no) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { no(Object.assign(new Error('That is too large.'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => ok(Buffer.concat(chunks))); req.on('error', no);
  });
}
async function jsonBody(req) {
  const b = await readBody(req, 1e6);
  try { const j = JSON.parse(b.toString('utf8') || '{}'); return j && typeof j === 'object' ? j : {}; } catch (e) { throw Object.assign(new Error('That request was not understood.'), { code: 400 }); }
}
/* minimal multipart reader: returns {fields, file:{name, type, data}} */
function multipart(buf, ctype) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype || ''); if (!m) return null;
  const bnd = Buffer.from('--' + (m[1] || m[2])); const out = { fields: {}, file: null };
  let pos = buf.indexOf(bnd);
  while (pos >= 0) {
    const start = pos + bnd.length; if (buf.slice(start, start + 2).toString() === '--') break;
    const next = buf.indexOf(bnd, start); if (next < 0) break;
    const part = buf.slice(start + 2, next - 2), hEnd = part.indexOf('\r\n\r\n');
    if (hEnd > 0) {
      const head = part.slice(0, hEnd).toString('utf8'), data = part.slice(hEnd + 4);
      const nm = /name="([^"]*)"/.exec(head), fn = /filename="([^"]*)"/.exec(head), ct = /content-type:\s*([^\r\n]+)/i.exec(head);
      if (fn && nm && nm[1] === 'file') out.file = { name: path.basename(fn[1]), type: ct ? ct[1].trim() : '', data };
      else if (nm) out.fields[nm[1]] = data.toString('utf8');
    }
    pos = next;
  }
  return out;
}

/* ---------- public data ---------- */
function liveInfo(s) {
  const url = s.live_url || '', st = ['live', 'scheduled'].includes(s.live_status) ? s.live_status : 'offline';
  let embed = null;
  const yt = /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([\w-]{6,})/.exec(url), vm = /vimeo\.com\/(\d+)/.exec(url);
  if (yt) embed = { type: 'iframe', src: 'https://www.youtube.com/embed/' + yt[1] + '?autoplay=1' };
  else if (vm) embed = { type: 'iframe', src: 'https://player.vimeo.com/video/' + vm[1] };
  else if (/\.m3u8(\?|$)/.test(url)) embed = { type: 'hls', src: url };
  else if (/^https?:\/\/.+\.(mp4|webm)(\?|$)/.test(url)) embed = { type: 'file', src: url };
  return { status: st, title: s.live_title || 'NCRI-Ghana live', description: s.live_description || '', start: s.live_start || '', provider: s.live_provider || 'none', embed, ready: st === 'live' && !!embed };
}
const gateways = () => ({ paystack: !!PAYSTACK, stripe: !!STRIPE });
function publicGet(p) {
  const s = settings();
  switch (p) {
    case 'bootstrap': return { settings: s, partners: publicList('partners'), live: liveInfo(s), gateways: gateways() };
    case 'news': return publicList('news').map(n => ({ slug: n.slug, title: n.title, category: n.category, summary: n.summary, image: n.image, published_at: n.published_at }));
    case 'documents': return publicList('documents').map(d => Object.assign({}, d, { file: undefined }));
    case 'faqs': return publicList('faqs').map(f => ({ id: f.id, category: f.category, question: f.question, answer: f.answer, link: f.link || '' }));
    case 'people': return publicList('people');
    case 'partners': return publicList('partners');
    case 'gallery': return list('gallery');
    case 'videos': return publicList('videos').map(v => ({ id: v.id, title: v.title, description: v.description, poster: v.poster, embed: { type: v.embed_type || 'iframe', src: v.embed_src } }));
    case 'programs': return seedFile('programs') || [];
    case 'values': return seedFile('values') || [];
    case 'policy-sections': return seedFile('policy-sections') || [];
    case 'mel': return { metrics: list('metrics'), indicators: list('indicators'), charts: (seedFile('mel') || {}).charts || [] };
    case 'live': return liveInfo(s);
    case 'donate/config': return { enabled: truthy(s.donations_enabled), intro: s.donate_intro || '', notice: s.donate_notice || '', thanks: s.donate_thanks || 'Thank you.', amounts: { GHS: amounts(s.donate_amounts_ghs), USD: amounts(s.donate_amounts_usd) }, gateways: gateways() };
    case 'donate/channels': return list('donate_channels');
    case 'chat/start': {
      const f = publicList('faqs');
      return { greeting: 'Akwaaba! I’m Laari, NCRI-Ghana’s virtual guide. Ask me anything about our work, or pick a question below.', suggestions: f.slice(0, 5).map(x => x.question) };
    }
  }
  let m;
  if ((m = /^news\/([a-z0-9-]+)$/.exec(p))) { const n = publicList('news').find(x => x.slug === m[1]); return n || undefined; }
  if ((m = /^donate\/status\/([A-Za-z0-9-]{6,40})$/.exec(p))) return donationStatus(m[1]);
  return undefined;
}

/* ---------- donations ---------- */
async function donationStatus(ref) {
  const d = one('SELECT * FROM donations WHERE ref=?', ref); if (!d) return { status: 'unknown' };
  if (d.status === 'pending' && d.gateway === 'paystack' && PAYSTACK) {
    try {
      const r = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(ref), { headers: { Authorization: 'Bearer ' + PAYSTACK } });
      const j = await r.json(), st = j && j.data && j.data.status;
      if (st === 'success') { run("UPDATE donations SET status='paid' WHERE ref=?", ref); return { status: 'paid' }; }
      if (st === 'failed' || st === 'abandoned') { run("UPDATE donations SET status='failed' WHERE ref=?", ref); return { status: 'failed' }; }
    } catch (e) { /* leave pending */ }
  }
  return { status: d.status };
}
async function donate(req, b) {
  if (b.website) return { ref: 'NCRI-OK', route: 'ghana', amount: 0, currency: 'GHS', thanks: 'Thank you.', channels: [] };   // honeypot
  const route = ['ghana', 'international', 'online'].includes(b.route) ? b.route : 'ghana';
  const currency = b.currency === 'USD' ? 'USD' : 'GHS', amount = Math.round(parseFloat(b.amount) * 100) / 100;
  if (!(amount >= 1 && amount <= 1000000)) throw Object.assign(new Error('Please enter an amount of 1 or more.'), { code: 400 });
  const email = clean(b.email, 120), name = clean(b.name, 120);
  if (email && !EMAIL.test(email)) throw Object.assign(new Error('That email address does not look right.'), { code: 400 });
  const ref = 'NCRI-' + crypto.randomBytes(5).toString('hex').toUpperCase();
  const gw = route === 'online' ? (currency === 'GHS' && PAYSTACK ? 'paystack' : STRIPE ? 'stripe' : PAYSTACK ? 'paystack' : '') : '';
  run('INSERT INTO donations(ref,route,currency,amount,name,email,phone,message,anonymous,method,gateway) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    ref, route, currency, amount, name, email, clean(b.phone, 40), clean(b.message, 500), b.anonymous ? 1 : 0, clean(b.method, 40), gw);
  const s = settings(), out = { ref, route, amount, currency, thanks: s.donate_thanks || 'Thank you.', channels: route === 'online' ? [] : list('donate_channels').filter(c => c.route === route) };
  if (gw && !email) throw Object.assign(new Error('Please add your email address so we can send your receipt.'), { code: 400 });
  if (gw === 'paystack') {
    const r = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: 'Bearer ' + PAYSTACK, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, amount: Math.round(amount * 100), currency, reference: ref, callback_url: BASE_URL + '/donate.html?ref=' + ref }) });
    const j = await r.json(); if (!j.status) throw Object.assign(new Error('The payment page could not be opened. Please try again.'), { code: 502 });
    out.checkoutUrl = j.data.authorization_url;
  } else if (gw === 'stripe') {
    const f = new URLSearchParams({ mode: 'payment', 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': currency.toLowerCase(), 'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)), 'line_items[0][price_data][product_data][name]': 'Gift to NCRI-Ghana', customer_email: email, client_reference_id: ref, success_url: BASE_URL + '/donate.html?ref=' + ref, cancel_url: BASE_URL + '/donate.html?ref=' + ref });
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + STRIPE, 'Content-Type': 'application/x-www-form-urlencoded' }, body: f });
    const j = await r.json(); if (!j.url) throw Object.assign(new Error('The payment page could not be opened. Please try again.'), { code: 502 });
    out.checkoutUrl = j.url;
  }
  return out;
}
function webhook(kind, raw, headers) {
  if (kind === 'paystack') {
    if (!PAYSTACK) return false;
    const sig = crypto.createHmac('sha512', PAYSTACK).update(raw).digest('hex');
    const got = String(headers['x-paystack-signature'] || '');
    if (got.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(got))) return false;
    const e = JSON.parse(raw.toString('utf8'));
    if (e.event === 'charge.success' && e.data && e.data.reference) run("UPDATE donations SET status='paid' WHERE ref=?", e.data.reference);
    return true;
  }
  if (kind === 'stripe') {
    if (!STRIPE_WH) return false;
    const h = String(headers['stripe-signature'] || ''), t = (/t=(\d+)/.exec(h) || [])[1], v1 = (/v1=([a-f0-9]+)/.exec(h) || [])[1];
    if (!t || !v1 || Math.abs(Date.now() / 1000 - +t) > 600) return false;
    const exp = crypto.createHmac('sha256', STRIPE_WH).update(t + '.' + raw.toString('utf8')).digest('hex');
    if (exp.length !== v1.length || !crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(v1))) return false;
    const e = JSON.parse(raw.toString('utf8')), o = e.data && e.data.object;
    if (e.type === 'checkout.session.completed' && o && o.client_reference_id) run("UPDATE donations SET status='paid' WHERE ref=?", o.client_reference_id);
    if (e.type === 'checkout.session.expired' && o && o.client_reference_id) run("UPDATE donations SET status='cancelled' WHERE ref=? AND status='pending'", o.client_reference_id);
    return true;
  }
  return false;
}

/* ---------- forms and chat ---------- */
function contact(b) {
  if (b.website) return { message: 'Thank you. Your message has been sent.' };   // honeypot
  const name = clean(b.name, 120), email = clean(b.email, 120), message = clean(b.message, 4000);
  if (!name) throw Object.assign(new Error('Please enter your name.'), { code: 400 });
  if (!EMAIL.test(email)) throw Object.assign(new Error('Please enter a valid email address.'), { code: 400 });
  if (message.length < 5) throw Object.assign(new Error('Please write a short message.'), { code: 400 });
  const kind = ['general', 'volunteer', 'partner', 'media', 'donate'].includes(b.kind) ? b.kind : 'general';
  run('INSERT INTO messages(kind,name,email,phone,org,subject,message) VALUES(?,?,?,?,?,?,?)', kind, name, email, clean(b.phone, 40), clean(b.org, 160), clean(b.subject, 160), message);
  return { message: 'Thank you. Your message has been sent and the team will reply by email.' };
}
function subscribe(b) {
  const email = clean(b.email, 120).toLowerCase();
  if (!EMAIL.test(email)) throw Object.assign(new Error('Please enter a valid email address.'), { code: 400 });
  run('INSERT OR IGNORE INTO subscribers(email) VALUES(?)', email);
  return { message: 'Thank you for subscribing.' };
}
let kbCache = { at: 0, list: [] };
function laariFaqs() {
  const curated = publicList('faqs').map(f => ({ id: f.id, question: f.question, answer: f.answer, keywords: f.keywords || '', link: f.link || '' }));
  if (Date.now() - kbCache.at > 20e3) {
    const g = k => publicGet(k);
    try {
      kbCache = { at: Date.now(), list: LaariKB.build({ settings: settings(), programs: g('programs'), values: g('values'), people: g('people'), partners: g('partners'), news: g('news'), documents: g('documents'),
        mel: g('mel'), channels: g('donate/channels'), config: g('donate/config'), policySections: g('policy-sections'), live: g('live') }) };
    } catch (e) { console.error('Laari knowledge build failed:', e.message); kbCache = { at: Date.now(), list: [] }; }
  }
  return curated.concat(kbCache.list);   /* the team's own answers come first and win ties */
}
function chat(b) {
  const q = clean(b.q, 300), a = Laari.answer(laariFaqs(), q, { suggestions: publicList('faqs').slice(0, 4).map(f => f.question) });
  if (q && a.kind !== 'smalltalk') run('INSERT INTO chatlog(q,answered,matched) VALUES(?,?,?)', q, a.answered ? 1 : 0, a.matched == null ? null : String(a.matched));
  return a;
}

/* ---------- admin API ---------- */
const bad = (m, c) => Object.assign(new Error(m), { code: c || 400 });
function fieldDefs() {
  const o = {};
  Object.keys(RES).forEach(r => { o[r] = { label: RES[r].label, fields: Object.keys(RES[r].f).map(n => ({ name: n, type: RES[r].f[n], options: (SELECTS[r] || {})[n] || undefined })) }; });
  return o;
}
function cleanItem(res, b, old) {
  const def = RES[res].f, d = Object.assign({}, old || {});
  Object.keys(def).forEach(k => {
    if (!(k in b) && !(!old && (k === 'published' || k === 'published_at'))) return;
    let v = b[k];
    switch (def[k]) {
      case 'bool': v = (v === undefined && !old) ? 1 : (truthy(v) ? 1 : 0); break;
      case 'num': v = Number(v) || 0; break;
      case 'long': v = clean(v, 20000); break;
      case 'date': v = clean(v, 32) || (old ? '' : new Date().toISOString().slice(0, 10)); break;
      case 'image': v = clean(v, 500); if (v && !/^(\/uploads\/|\/assets\/img\/|https:\/\/)/.test(v)) throw bad('Pictures must be uploaded here or use an https link.'); break;
      case 'file': v = clean(v, 80); if (v && (!/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/.test(v) || !fs.existsSync(path.join(DOCS, v)))) throw bad('The file was not found. Please upload it again.'); break;
      case 'select': v = clean(v, 80); { const ok = ((SELECTS[res] || {})[k] || []).map(x => x[0]); if (ok.length && !ok.includes(v)) throw bad('Please choose a valid ' + k.replace(/_/g, ' ') + '.'); } break;
      default: v = clean(v, 500);
    }
    d[k] = v;
  });
  if (res === 'news') {
    if (!d.title) throw bad('A news item needs a title.');
    let base = slugify(d.slug || d.title), s = base, n = 2;
    while (all('SELECT id,data FROM items WHERE res=?', 'news').some(r => parse(r).slug === s && (!old || r.id !== old.id))) s = base + '-' + n++;
    d.slug = s;
  }
  if (res === 'documents' && (!d.title || !d.file || !d.category)) throw bad('A document needs a category, a title and a file.');
  if (res === 'faqs' && (!d.question || !d.answer)) throw bad('An answer needs a question and an answer.');
  if (res === 'videos' && (!d.title || !d.embed_src)) throw bad('A video needs a title and a link or file.');
  if (['people', 'partners'].includes(res) && !d.name) throw bad('Please enter a name.');
  if (res === 'gallery' && !d.file) throw bad('Please choose a picture.');
  delete d.id;
  return d;
}
async function adminApi(req, res, p, q, admin) {
  const M = req.method; let m;
  if (p === 'schema') return { docCategories: DOC_CATS, resources: fieldDefs() };
  if (p === 'backups' && M === 'GET') return { backups: Backup.list(), keep: +process.env.BACKUP_KEEP || 14, auto: !process.env.BACKUP_DISABLE };
  if (p === 'backups' && M === 'POST') { if (limited('bk:' + admin.id, 6, 3600e3)) throw bad('Please wait a little before making another backup.', 429); return { made: backupNow('manual') }; }
  if ((m = /^backups\/([\d-]+(?:-[a-z]+)?)\/(verify|db)$/.exec(p))) {
    if (!Backup.NAME.test(m[1])) throw bad('Not found.', 404);
    if (m[2] === 'verify') return Backup.verify(m[1]);
    serveFile(req, res, path.join(Backup.DIR, m[1], 'ncri.db'), { 'Content-Disposition': 'attachment; filename="ncri-' + m[1] + '.db"', 'Cache-Control': 'no-store' }); return null;
  }
  if (p === 'stats') return {
    news: one("SELECT COUNT(*) n FROM items WHERE res='news'").n, documents: one("SELECT COUNT(*) n FROM items WHERE res='documents'").n,
    messagesNew: one("SELECT COUNT(*) n FROM messages WHERE status='new'").n, messages: one('SELECT COUNT(*) n FROM messages').n, subscribers: one('SELECT COUNT(*) n FROM subscribers').n,
    donationsPaid: all("SELECT currency, SUM(amount) total, COUNT(*) n FROM donations WHERE status='paid' GROUP BY currency"), donationsOpen: one("SELECT COUNT(*) n FROM donations WHERE status='pending'").n,
    unanswered: all('SELECT q, COUNT(*) n, MAX(created) last FROM chatlog WHERE answered=0 GROUP BY lower(q) ORDER BY n DESC, last DESC LIMIT 15'), chats: one('SELECT COUNT(*) n FROM chatlog').n
  };
  if (p === 'password' && M === 'POST') {
    const b = await jsonBody(req), row = one('SELECT hash FROM admins WHERE id=?', admin.id);
    if (!checkPw(String(b.current || ''), row.hash)) throw bad('Your current password is not correct.', 403);
    if (String(b.next || '').length < 10) throw bad('The new password needs at least 10 characters.');
    run('UPDATE admins SET hash=? WHERE id=?', hashPw(String(b.next)), admin.id);
    run('DELETE FROM sessions WHERE admin_id=? AND token<>?', admin.id, admin.token);
    return { message: 'Password changed.' };
  }
  if (p === 'settings') {
    if (M === 'GET') return settings();
    if (M === 'PUT') {
      const b = await jsonBody(req), put = db.prepare('INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v');
      Object.keys(b).forEach(k => { if (/^[a-z0-9_]{2,60}$/.test(k)) put.run(k, clean(b[k], 8000)); });
      return { message: 'Saved.' };
    }
  }
  if (p === 'messages' && M === 'GET') return all('SELECT * FROM messages ORDER BY id DESC LIMIT 500');
  if ((m = /^messages\/(\d+)$/.exec(p))) {
    if (M === 'PUT') { const b = await jsonBody(req); run('UPDATE messages SET status=? WHERE id=?', ['new', 'read', 'replied', 'archived'].includes(b.status) ? b.status : 'read', +m[1]); return { ok: 1 }; }
    if (M === 'DELETE') { run('DELETE FROM messages WHERE id=?', +m[1]); return { ok: 1 }; }
  }
  if (p === 'donations' && M === 'GET') return all('SELECT * FROM donations ORDER BY created DESC LIMIT 500');
  if ((m = /^donations\/([A-Za-z0-9-]+)$/.exec(p)) && M === 'PUT') { const b = await jsonBody(req); run('UPDATE donations SET status=? WHERE ref=?', ['pending', 'paid', 'failed', 'cancelled'].includes(b.status) ? b.status : 'pending', m[1]); return { ok: 1 }; }
  if (p === 'subscribers' && M === 'GET') {
    const rows = all('SELECT email, created FROM subscribers ORDER BY created DESC');
    if (q.get('csv')) { send(res, 200, 'email,subscribed\n' + rows.map(r => r.email + ',' + r.created).join('\n'), { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="subscribers.csv"' }); return null; }
    return rows;
  }
  if (p === 'upload' && M === 'POST') {
    if (limited('up:' + admin.id, 80, 3600e3)) throw bad('Too many uploads. Please wait a little.', 429);
    const kind = ['doc', 'image', 'video'].includes(q.get('kind')) ? q.get('kind') : 'doc';
    const mp = multipart(await readBody(req, kind === 'video' ? 300e6 : 30e6), req.headers['content-type']);
    if (!mp || !mp.file || !mp.file.data.length) throw bad('Please choose a file.');
    const ext = path.extname(mp.file.name).toLowerCase(), ok = kind === 'doc' ? DOC_EXT : kind === 'image' ? IMG_EXT : VID_EXT;
    if (!ok.has(ext)) throw bad('That file type is not allowed here.');
    if (kind === 'image' && mp.file.data.length > 8e6) throw bad('Pictures must be under 8 MB.');
    const id = crypto.randomBytes(16).toString('hex') + ext;
    fs.writeFileSync(path.join(kind === 'doc' ? DOCS : MEDIA, id), mp.file.data);
    return { file: kind === 'doc' ? id : '/uploads/' + id, original_name: clean(mp.file.name, 160), mime: MIME[ext] || 'application/octet-stream', size: mp.file.data.length };
  }
  if ((m = /^r\/([a-z_]+)(?:\/(\d+))?$/.exec(p)) && RES[m[1]]) {
    const r = m[1], id = m[2] && +m[2];
    if (!id && M === 'GET') return sortRows(r, list(r));
    if (!id && M === 'POST') { const d = cleanItem(r, await jsonBody(req)); const info = run('INSERT INTO items(res,data) VALUES(?,?)', r, JSON.stringify(d)); return Object.assign({ id: Number(info.lastInsertRowid) }, d); }
    const row = id && one('SELECT * FROM items WHERE id=? AND res=?', id, r); if (id && !row) throw bad('Not found.', 404);
    if (id && M === 'PUT') { const d = cleanItem(r, await jsonBody(req), parse(row)); run('UPDATE items SET data=? WHERE id=?', JSON.stringify(d), id); return Object.assign({ id }, d); }
    if (id && M === 'DELETE') {
      const old = parse(row); run('DELETE FROM items WHERE id=?', id);
      if (r === 'documents' && old.file) fs.rm(path.join(DOCS, path.basename(old.file)), () => {});
      return { ok: 1 };
    }
  }
  throw bad('Not found.', 404);
}

/* ---------- files ---------- */
function serveFile(req, res, file, extra) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(req, res);
    const ext = path.extname(file).toLowerCase(), h = Object.assign({ 'Content-Type': MIME[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes' }, extra);
    const etag = '"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"'; h.ETag = etag;
    if (ext === '.html') { h['Cache-Control'] = 'no-cache'; h['Content-Security-Policy'] = CSP; } else if (!h['Cache-Control']) h['Cache-Control'] = 'public, max-age=3600';
    if (req.headers['if-none-match'] === etag) return send(res, 304, null, h);
    let code = 200, rng = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || ''), opt = {};
    if (rng && (rng[1] || rng[2])) {
      let a = rng[1] ? +rng[1] : Math.max(0, st.size - +rng[2]), b = rng[1] && rng[2] ? Math.min(+rng[2], st.size - 1) : st.size - 1;
      if (a > b || a >= st.size) return send(res, 416, null, { 'Content-Range': 'bytes */' + st.size });
      code = 206; opt = { start: a, end: b }; h['Content-Range'] = 'bytes ' + a + '-' + b + '/' + st.size; h['Content-Length'] = b - a + 1;
    } else h['Content-Length'] = st.size;
    const base = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Opener-Policy': 'same-origin' };
    if (/^\/(admin|api)\//.test(req.url)) base['X-Robots-Tag'] = 'noindex, nofollow';
    res.writeHead(code, Object.assign(base, h));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file, opt).on('error', () => res.destroy()).pipe(res);
  });
}
function notFound(req, res) {
  const f = path.join(ROOT, '404.html');
  if (/\.(html?)?$/.test(req.url.split('?')[0]) || !path.extname(req.url.split('?')[0])) fs.readFile(f, (e, b) => e ? send(res, 404, 'Not found', { 'Content-Type': 'text/plain' }) : send(res, 404, b, { 'Content-Type': MIME['.html'], 'Content-Security-Policy': CSP, 'Cache-Control': 'no-cache' }));
  else send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
}
const inside = (base, f) => f === base || f.startsWith(base + path.sep);
function serveStatic(req, res, pathname) {
  let p; try { p = decodeURIComponent(pathname); } catch (e) { return notFound(req, res); }
  if (p.includes('\0') || /(^|\/)\./.test(p)) return notFound(req, res);
  if (p === '/') p = '/index.html';
  if (p === '/admin') { res.writeHead(301, { Location: '/admin/' }); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  if (/^\/uploads\//.test(p)) { const f = path.join(MEDIA, path.basename(p)); return serveFile(req, res, f, { 'Cache-Control': 'public, max-age=86400' }); }
  if (!path.extname(p)) p += '.html';
  const f = path.normalize(path.join(ROOT, p));
  const okTop = (/^\/[a-z0-9-]+\.html$/.test(p) || /^\/(assets|admin)\//.test(p)) && !/^\/assets\/seed\//.test(p);
  if (!okTop || !inside(ROOT, f)) return notFound(req, res);
  if (/\.html$/.test(f) && !/^\/admin\//.test(p)) return fs.readFile(f, 'utf8', (e, t) => e ? notFound(req, res) : send(res, 200, req.method === 'HEAD' ? null : t.split('{{BASE_URL}}').join(BASE_URL), { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache', 'Content-Security-Policy': CSP }));
  serveFile(req, res, f);
}


/* ---------- SEO: sitemap ---------- */
const SITE_PAGES = [['', 1], ['about', .9], ['programs', .9], ['mel', .8], ['news', .8], ['media', .6], ['resources', .7], ['policies', .7], ['partnerships', .7], ['get-involved', .7], ['donate', .8], ['contact', .6]];
function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    SITE_PAGES.map(([p, pr]) => '  <url><loc>' + BASE_URL + '/' + (p ? p + '.html' : '') + '</loc><lastmod>' + today + '</lastmod><priority>' + pr + '</priority></url>').join('\n') + '\n</urlset>\n';
}

/* ---------- backups: automatic, plus on demand from the admin panel ---------- */
function backupNow(reason) { return Backup.make(db, reason); }
if (!process.env.BACKUP_DISABLE) {
  const due = () => { const l = Backup.list()[0]; return !l || l.broken || Date.now() - Date.parse(l.created) > 20 * 3600e3; };
  const tick = () => { try { if (due()) console.log('Backup made:', backupNow('auto').name); } catch (e) { console.error('Backup failed:', e.message); } };
  setTimeout(tick, 60e3).unref(); setInterval(tick, 3 * 3600e3).unref();
}

/* ---------- router ---------- */
const POST_LIMITS = { contact: [6, 3600e3], subscribe: [10, 3600e3], donate: [20, 3600e3], chat: [60, 600e3] };
const server = http.createServer(async (req, res) => {
  try {
    let url; try { url = new URL(req.url.replace(/^\/{2,}/, '/'), 'http://x'); } catch (e) { return fail(res, 400, 'Bad request.'); }
    const pn = url.pathname, M = req.method;
    if (!['GET', 'HEAD', 'POST', 'PUT', 'DELETE'].includes(M)) return fail(res, 405, 'Method not allowed.');
    if (/^\/(api|admin)(\/|$)/.test(pn)) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (pn === '/healthz') return send(res, 200, { ok: true });
    if (pn === '/robots.txt') return send(res, 200, 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /download/\nSitemap: ' + BASE_URL + '/sitemap.xml\n', { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    if (pn === '/sitemap.xml') return send(res, 200, sitemap(), { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    if (pn === '/.well-known/security.txt' || pn === '/security.txt') return send(res, 200, 'Contact: mailto:' + (process.env.SECURITY_EMAIL || process.env.ADMIN_EMAIL || 'info@ncri-ghana.org') + '\nExpires: ' + new Date(Date.now() + 365 * 864e5).toISOString() + '\nPreferred-Languages: en\nCanonical: ' + BASE_URL + '/.well-known/security.txt\n', { 'Content-Type': 'text/plain; charset=utf-8' });
    let m;
    if ((m = /^\/download\/(\d+)$/.exec(pn))) {
      const row = one("SELECT * FROM items WHERE id=? AND res='documents'", +m[1]), d = row && parse(row);
      if (!d || (!isPub(d) && !adminOf(req)) || !d.file) return notFound(req, res);
      run('UPDATE items SET data=? WHERE id=?', JSON.stringify(Object.assign(d, { downloads: (+d.downloads || 0) + 1 }, { id: undefined })), row.id);
      const nm = String(d.original_name || d.title || 'document').replace(/[^\w.\- ]+/g, '_').slice(0, 100), inl = url.searchParams.get('inline') && /\.pdf$/i.test(d.file);
      return serveFile(req, res, path.join(DOCS, path.basename(d.file)), { 'Content-Disposition': (inl ? 'inline' : 'attachment') + '; filename="' + nm + '"', 'Cache-Control': 'private, max-age=0' });
    }
    if (pn.startsWith('/api/')) {
      const p = pn.slice(5).replace(/\/+$/, '');
      if (M !== 'GET' && M !== 'HEAD' && !/^webhooks\//.test(p) && req.headers['x-requested-with'] !== 'ncri') return fail(res, 403, 'That request was blocked.');
      if (/^webhooks\/(paystack|stripe)$/.test(p) && M === 'POST') {
        const raw = await readBody(req, 1e6);
        return send(res, webhook(p.split('/')[1], raw, req.headers) ? 200 : 400, { ok: true });
      }
      if (p === 'admin/login' && M === 'POST') {
        if (limited('login:' + ipOf(req), 8, 900e3)) return fail(res, 429, 'Too many attempts. Please wait a few minutes and try again.');
        const b = await jsonBody(req), a = one('SELECT * FROM admins WHERE email=?', clean(b.email, 120).toLowerCase());
        const ok = a ? checkPw(String(b.password || ''), a.hash) : (checkPw('x', 'aa:bb'), false);
        if (!ok) return fail(res, 401, 'The email or password is not correct.');
        const token = crypto.randomBytes(32).toString('hex'); run('INSERT INTO sessions(token,admin_id,expires) VALUES(?,?,?)', token, a.id, Date.now() + 12 * 3600e3);
        return send(res, 200, { admin: { email: a.email } }, { 'Set-Cookie': 'ncri_s=' + token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200' + (SECURE ? '; Secure' : '') });
      }
      if (p.startsWith('admin/')) {
        const admin = adminOf(req);
        if (p === 'admin/me') return send(res, 200, { admin: admin ? { email: admin.email } : null });
        if (p === 'admin/logout' && M === 'POST') { if (admin) run('DELETE FROM sessions WHERE token=?', admin.token); return send(res, 200, { ok: 1 }, { 'Set-Cookie': 'ncri_s=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }); }
        if (!admin) return fail(res, 401, 'Please sign in.');
        const out = await adminApi(req, res, p.slice(6), url.searchParams, admin);
        return out === null ? undefined : send(res, 200, out);
      }
      if (M === 'GET' || M === 'HEAD') { const out = await publicGet(p); return out === undefined ? fail(res, 404, 'Not found.') : send(res, 200, out); }
      const key = p.split('/')[0], lim = POST_LIMITS[key];
      if (!lim) return fail(res, 404, 'Not found.');
      if (limited(key + ':' + ipOf(req), lim[0], lim[1])) return fail(res, 429, 'Too many requests. Please wait a little and try again.');
      const b = await jsonBody(req);
      return send(res, 200, key === 'contact' ? contact(b) : key === 'subscribe' ? subscribe(b) : key === 'chat' ? chat(b) : await donate(req, b));
    }
    if (M !== 'GET' && M !== 'HEAD') return fail(res, 405, 'Method not allowed.');
    serveStatic(req, res, pn);
  } catch (e) {
    const c = Number.isInteger(e.code) ? e.code : 0;
    if (!c) console.error(e);
    if (!res.headersSent) fail(res, c >= 400 && c < 600 ? c : 500, (c >= 400 && c < 500) || c === 502 ? e.message : 'Something went wrong. Please try again.');
  }
});
server.requestTimeout = 60e3; server.headersTimeout = 20e3; server.maxHeadersCount = 60; server.keepAliveTimeout = 5e3;
if (require.main === module) server.listen(PORT, () => console.log('NCRI-Ghana is running at ' + BASE_URL + '  (admin: ' + BASE_URL + '/admin/)'));
module.exports = server;
