'use strict';
/* NCRI-Ghana backup and recovery. No npm packages. Used by server.js and from the command line:
     node backup.js                      make a backup now
     node backup.js list                 list backups
     node backup.js verify <name>        check a backup is complete and uncorrupted
     node backup.js restore <name>       restore a backup (STOP the server first)
   Each backup is a folder: ncri.db (a consistent snapshot), uploads/, docs/ and manifest.json (with checksums). */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const DIR = process.env.BACKUP_DIR || path.join(DATA, 'backups');
const KEEP = Math.max(1, +process.env.BACKUP_KEEP || 14);
const NAME = /^\d{8}-\d{6}(-[a-z]+)?$/;

const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
function filesIn(d) { try { return fs.readdirSync(d).filter(n => fs.statSync(path.join(d, n)).isFile()); } catch (e) { return []; } }

function list() {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) { return []; }
  return fs.readdirSync(DIR).filter(n => NAME.test(n)).sort().reverse().map(n => {
    try { const m = JSON.parse(fs.readFileSync(path.join(DIR, n, 'manifest.json'), 'utf8')); return { name: n, created: m.created, reason: m.reason, dbBytes: m.dbBytes, uploads: m.uploads, docs: m.docs }; }
    catch (e) { return { name: n, broken: true }; }
  });
}

/* db: an open DatabaseSync (the running server's). Safe while the site is live. */
function make(db, reason) {
  const name = stamp() + (reason && reason !== 'auto' ? '-' + String(reason).replace(/[^a-z]/g, '').slice(0, 10) : '');
  const dest = path.join(DIR, name), tmp = dest + '.part';
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
  try {
    try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch (e) { /* not fatal */ }
    const dbf = path.join(tmp, 'ncri.db');
    db.exec("VACUUM INTO '" + dbf.replace(/'/g, "''") + "'");
    for (const sub of ['uploads', 'docs']) {
      const src = path.join(DATA, sub); if (fs.existsSync(src)) fs.cpSync(src, path.join(tmp, sub), { recursive: true });
    }
    const chk = new DatabaseSync(dbf); const ok = chk.prepare('PRAGMA integrity_check').get().integrity_check; chk.close();
    if (ok !== 'ok') throw new Error('The database snapshot failed its integrity check.');
    const sums = {}; ['uploads', 'docs'].forEach(sub => filesIn(path.join(tmp, sub)).forEach(n => { sums[sub + '/' + n] = sha(path.join(tmp, sub, n)); }));
    const manifest = { created: new Date().toISOString(), reason: reason || 'auto', dbBytes: fs.statSync(dbf).size, dbSha256: sha(dbf), uploads: filesIn(path.join(tmp, 'uploads')).length, docs: filesIn(path.join(tmp, 'docs')).length, files: sums };
    fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify(manifest, null, 2));
    fs.renameSync(tmp, dest);
  } catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); throw e; }
  list().slice(KEEP).forEach(b => fs.rmSync(path.join(DIR, b.name), { recursive: true, force: true }));
  return list().find(b => b.name === name);
}

function verify(name) {
  if (!NAME.test(name)) throw new Error('That is not a backup name.');
  const d = path.join(DIR, name), m = JSON.parse(fs.readFileSync(path.join(d, 'manifest.json'), 'utf8')), problems = [];
  if (sha(path.join(d, 'ncri.db')) !== m.dbSha256) problems.push('ncri.db does not match its checksum');
  for (const [f, h] of Object.entries(m.files || {})) { const p = path.join(d, f); if (!fs.existsSync(p)) problems.push('missing ' + f); else if (sha(p) !== h) problems.push('changed ' + f); }
  try { const c = new DatabaseSync(path.join(d, 'ncri.db')); if (c.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') problems.push('database integrity check failed'); c.close(); } catch (e) { problems.push('database cannot be opened'); }
  return { ok: !problems.length, problems };
}

/* Restore replaces the live data. The server MUST be stopped. The current data is kept in data/pre-restore-<time>/. */
function restore(name) {
  const v = verify(name); if (!v.ok) throw new Error('Backup is not usable: ' + v.problems.join('; '));
  const d = path.join(DIR, name), keep = path.join(DATA, 'pre-restore-' + stamp());
  fs.mkdirSync(keep, { recursive: true });
  for (const n of ['ncri.db', 'ncri.db-wal', 'ncri.db-shm']) { const p = path.join(DATA, n); if (fs.existsSync(p)) fs.renameSync(p, path.join(keep, n)); }
  for (const sub of ['uploads', 'docs']) { const p = path.join(DATA, sub); if (fs.existsSync(p)) fs.renameSync(p, path.join(keep, sub)); }
  fs.copyFileSync(path.join(d, 'ncri.db'), path.join(DATA, 'ncri.db'));
  for (const sub of ['uploads', 'docs']) { const s = path.join(d, sub); fs.mkdirSync(path.join(DATA, sub), { recursive: true }); if (fs.existsSync(s)) fs.cpSync(s, path.join(DATA, sub), { recursive: true }); }
  return { restored: name, previousDataKeptIn: keep };
}

module.exports = { DIR, list, make, verify, restore, NAME };

if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === 'list') list().forEach(b => console.log(b.name, b.broken ? '(unreadable)' : b.created + '  db ' + b.dbBytes + ' B, ' + b.uploads + ' pictures/videos, ' + b.docs + ' documents'));
    else if (cmd === 'verify') { const r = verify(arg || ''); console.log(r.ok ? 'OK: backup is complete.' : 'PROBLEMS:\n- ' + r.problems.join('\n- ')); process.exitCode = r.ok ? 0 : 1; }
    else if (cmd === 'restore') { console.log('Make sure the server is stopped.'); console.log(restore(arg || '')); console.log('Done. Start the server again.'); }
    else if (!cmd) { fs.mkdirSync(DATA, { recursive: true }); const db = new DatabaseSync(path.join(DATA, 'ncri.db')); console.log('Backup made:', make(db, 'manual')); db.close(); }
    else { console.log('Use: node backup.js | list | verify <name> | restore <name>'); process.exitCode = 1; }
  } catch (e) { console.error('Failed:', e.message); process.exitCode = 1; }
}
