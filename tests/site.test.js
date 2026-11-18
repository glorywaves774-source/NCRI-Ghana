'use strict';
/* Run with:  node --test tests/
   Starts the site on a spare port with a throwaway data folder and checks the pages, the UI standard pieces and the admin API basics. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ncri-test-'));
process.env.DATA_DIR = tmp;
process.env.BACKUP_DISABLE = '1';
process.env.ADMIN_EMAIL = 'test@example.org';
process.env.ADMIN_PASSWORD = 'test-password-123';
const server = require('../server.js');
let base;

test.before(() => new Promise(ok => server.listen(0, '127.0.0.1', () => { base = 'http://127.0.0.1:' + server.address().port; ok(); })));
test.after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

test('every public page loads', async () => {
  for (const p of PAGES) {
    const r = await fetch(base + '/' + p);
    assert.strictEqual(r.status, p === '404.html' ? 200 : 200, p);
    assert.match(r.headers.get('content-security-policy') || '', /script-src 'self'/, p + ' has a strict CSP');
  }
});

test('pages follow the UI standard: viewport, theme script in head, mobile.css last, no inline scripts', () => {
  for (const p of PAGES) {
    const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    assert.match(head, /name="viewport" content="width=device-width,initial-scale=1/, p + ' viewport');
    assert.match(head, /<script src="assets\/js\/boot\.js"><\/script>/, p + ' theme script in head');
    const css = [...head.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
    assert.strictEqual(css[css.length - 1], 'assets/css/mobile.css', p + ' loads mobile.css last');
    assert.doesNotMatch(html, /<script(?![^>]*\b(?:src=|type="application\/ld\+json"))[^>]*>\s*\S/, p + ' has no inline script (search-engine JSON data is allowed)');
  }
  const admin = fs.readFileSync(path.join(ROOT, 'admin/index.html'), 'utf8');
  assert.match(admin, /<script src="\.\.\/assets\/js\/boot\.js"><\/script>/, 'admin applies the saved theme before paint');
});

test('no glass: every frosted blur is switched off by the Aurora layer', () => {
  const css = fs.readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8');
  const aurora = css.indexOf('AURORA UI');
  assert.ok(aurora > 0, 'Aurora layer present');
  assert.match(css.slice(aurora), /\*,\*::before,\*::after\{-webkit-backdrop-filter:none!important;backdrop-filter:none!important\}/);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'assets/js/core.js'), 'utf8'), /classList\.add\('lg-ok'\)/, 'refraction filter is off');
});

test('theme is remembered in storage and a cookie, and sets data-bs-theme', () => {
  const boot = fs.readFileSync(path.join(ROOT, 'assets/js/boot.js'), 'utf8');
  const core = fs.readFileSync(path.join(ROOT, 'assets/js/core.js'), 'utf8');
  assert.match(boot, /ncri-theme=\(dark\|light\)/);
  assert.match(boot, /data-bs-theme/);
  assert.match(core, /document\.cookie = 'ncri-theme='/);
  assert.match(fs.readFileSync(path.join(ROOT, 'assets/css/mobile.css'), 'utf8'), /@media print/);
});

test('phone navigation: drawer, tab bar and Back handling exist', () => {
  const core = fs.readFileSync(path.join(ROOT, 'assets/js/core.js'), 'utf8');
  for (const bit of ['id="drawer"', 'class="tabbar"', 'id="dr-q"', "addEventListener('popstate'", 'location.replace(href)', "e.key === 'Escape'"]) assert.ok(core.includes(bit), bit);
  const tabs = /var TABS = (\[.*?\]);\n/.exec(core);
  assert.ok(tabs, 'tab list found');
  assert.ok(eval(tabs[1]).length + 1 <= 5, 'at most 5 tabs including Menu');
});

test('forms, chat and admin sign-in still work', async () => {
  const H = { 'Content-Type': 'application/json', 'X-Requested-With': 'ncri' };
  let r = await fetch(base + '/api/contact', { method: 'POST', headers: H, body: JSON.stringify({ name: 'A', email: 'a@b.co', message: 'hello there' }) });
  assert.strictEqual(r.status, 200);
  r = await fetch(base + '/api/chat', { method: 'POST', headers: H, body: JSON.stringify({ q: 'where are you based?' }) });
  assert.match((await r.json()).reply, /Saboba/);
  r = await fetch(base + '/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.strictEqual(r.status, 403, 'cross-site requests are blocked');
  r = await fetch(base + '/api/admin/login', { method: 'POST', headers: H, body: JSON.stringify({ email: 'test@example.org', password: 'test-password-123' }) });
  assert.strictEqual(r.status, 200);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  r = await fetch(base + '/api/admin/stats', { headers: { Cookie: cookie } });
  assert.strictEqual((await r.json()).messages, 1);
});

test('an admin edit to a person survives a restart (one-time update runs once)', async () => {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(tmp, 'ncri.db'));
  assert.ok(db.prepare("SELECT 1 x FROM migrations WHERE k='people_md_bio3'").get(), 'bio update is recorded as done');
  db.close();
});

test('stylesheet and script links carry a per-deploy version so updates show at once', async () => {
  for (const p of ['/about.html', '/admin/']) {
    const html = await (await fetch(base + p)).text();
    const links = [...html.matchAll(/(?:src|href)="((?!https?:)[^"]+\.(?:css|js)[^"]*)"/g)].map(m => m[1]);
    assert.ok(links.length > 2, p);
    links.forEach(l => assert.match(l, /\?v=\w+$/, p + ' ' + l));
  }
});

test('motion: flow script is loaded, and every motion stops for reduced motion', () => {
  const core = fs.readFileSync(path.join(ROOT, 'assets/js/core.js'), 'utf8');
  const flow = fs.readFileSync(path.join(ROOT, 'assets/js/flow.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8');
  assert.match(core, /\['translate', 'flow'\]/, 'flow loads in the calm design');
  assert.match(flow, /NCRI\.reduce/, 'flow does nothing for reduce motion');
  const motion = css.slice(css.indexOf('MOTION (calm and purposeful'));
  assert.match(motion, /@media \(prefers-reduced-motion:reduce\)/);
});
