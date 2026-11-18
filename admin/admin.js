(function () {
  'use strict';
  var app = document.getElementById('app'), schema = null, stats = null, me = null;

  /* ---------- helpers ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag), kids = Array.prototype.slice.call(arguments, 2);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'class') el.className = v; else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else if (k === 'value') el.value = v; else if (v === true) el.setAttribute(k, ''); else el.setAttribute(k, v);
    });
    kids.forEach(function add(c) { if (Array.isArray(c)) c.forEach(add); else if (c != null && c !== false) el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c); });
    return el;
  }
  function api(method, path, body) {
    var o = { method: method, headers: { 'X-Requested-With': 'ncri', Accept: 'application/json' } };
    if (body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch('../api/admin/' + path, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && path !== 'login') { me = null; login(); throw new Error(j.error || 'Please sign in.'); }
        if (!r.ok) throw new Error(j.error || 'Something went wrong.'); return j;
      });
    });
  }
  function upload(file, kind) {
    var fd = new FormData(); fd.append('file', file);
    return fetch('../api/admin/upload?kind=' + kind, { method: 'POST', headers: { 'X-Requested-With': 'ncri' }, body: fd }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Upload failed.'); return j; }); });
  }
  function note(host, text, ok) { host.className = 'msg ' + (ok ? 'ok' : 'err'); host.textContent = text; host.setAttribute('role', 'status'); }
  function label(r) { return r.title || r.name || r.question || r.label || r.indicator || r.caption || r.file || ('#' + r.id); }
  function when(s) { return s ? String(s).slice(0, 16).replace('T', ' ') : ''; }
  function money(a, c) { return (c === 'USD' ? '$' : 'GHS ') + Number(a).toLocaleString('en-GB', { maximumFractionDigits: 2 }); }

  /* ---------- sign in ---------- */
  function login() {
    var msg = h('div'), email = h('input', { type: 'email', required: true, autocomplete: 'username', id: 'em' }), pw = h('input', { type: 'password', required: true, autocomplete: 'current-password', id: 'pw' });
    app.replaceChildren(h('form', { class: 'login', onsubmit: function (e) {
      e.preventDefault();
      api('POST', 'login', { email: email.value, password: pw.value }).then(function (j) { me = j.admin; start(); }).catch(function (er) { note(msg, er.message); });
    } }, h('img', { src: '../assets/img/logo-symbol.png', alt: '' }), h('h1', null, 'NCRI-Ghana admin'), h('label', null, 'Email', email), h('label', null, 'Password', pw), msg, h('button', { class: 'btn p', type: 'submit' }, 'Sign in'), h('a', { href: '../' }, '← Back to the website')));
    email.focus();
  }

  /* ---------- layout ---------- */
  var TABS = [['dash', 'Dashboard'], ['messages', 'Messages'], ['donations', 'Donations'], ['sep'], ['news', 'News'], ['documents', 'Documents'], ['faqs', 'Laari answers'], ['people', 'People'], ['partners', 'Partners'], ['videos', 'Videos'], ['gallery', 'Gallery'], ['metrics', 'Results: numbers'], ['indicators', 'Results: indicators'], ['donate_channels', 'Ways to give'], ['sep'], ['settings', 'Site text and live'], ['subscribers', 'Subscribers'], ['backups', 'Backups'], ['account', 'Account']];
  var cur = 'dash', body, navEl;
  function shell() {
    body = h('main', { id: 'main' });
    navEl = h('nav', { class: 'side', 'aria-label': 'Admin sections' });
    app.replaceChildren(h('div', { class: 'shell' }, navEl, body));
    drawNav();
  }
  function drawNav() {
    var nb = stats ? stats.messagesNew : 0;
    var items = [h('div', { class: 'brand' }, h('img', { src: '../assets/img/logo-symbol.png', alt: '' }), 'NCRI-Ghana')];
    TABS.forEach(function (t) {
      if (t[0] === 'sep') { items.push(h('div', { class: 'sep' })); return; }
      items.push(h('button', { type: 'button', 'aria-current': t[0] === cur ? 'page' : null, onclick: function () { go(t[0]); navEl.classList.remove('open'); } }, t[1], t[0] === 'messages' && nb ? h('span', { class: 'badge' }, nb) : null));
    });
    items.push(h('div', { class: 'sep' }), h('button', { type: 'button', onclick: function () { location.href = '../'; } }, 'View website'),
      h('button', { type: 'button', onclick: function () { api('POST', 'logout').then(function () { me = null; login(); }); } }, 'Sign out'));
    navEl.replaceChildren.apply(navEl, items);
  }
  function go(t) {
    cur = t; drawNav();
    var bar = h('button', { class: 'btn burger', type: 'button', 'aria-label': 'Menu', onclick: function () { navEl.classList.toggle('open'); } }, '☰');
    body.replaceChildren(h('p', { class: 'mut' }, 'Loading…'));
    var f = { dash: dash, messages: messages, donations: donations, settings: settingsView, subscribers: subs, backups: backups, account: account }[t] || function () { return resource(t); };
    Promise.resolve(f()).then(function (view) { body.replaceChildren(h('div', { class: 'bar' }, bar), view); window.scrollTo(0, 0); }).catch(function (e) { body.replaceChildren(h('div', { class: 'msg err' }, e.message)); });
  }

  /* ---------- dashboard ---------- */
  function dash() {
    return api('GET', 'stats').then(function (s) {
      stats = s; drawNav();
      var paid = s.donationsPaid.length ? s.donationsPaid.map(function (x) { return money(x.total, x.currency); }).join(' + ') : '0';
      function st(n, l, t) { return h('button', { class: 'stat', type: 'button', style: 'text-align:left;cursor:pointer;font:inherit;color:inherit', onclick: function () { go(t); } }, h('b', null, n), h('span', null, l)); }
      return h('div', null, h('h2', null, 'Welcome back'),
        h('div', { class: 'grid', style: 'margin:14px 0' }, st(s.messagesNew, 'new messages', 'messages'), st(s.donationsOpen, 'gifts waiting to be matched', 'donations'), st(paid, 'received so far', 'donations'), st(s.subscribers, 'subscribers', 'subscribers'), st(s.news, 'news stories', 'news'), st(s.documents, 'documents', 'documents')),
        h('div', { class: 'card' }, h('h3', null, 'Questions Laari could not answer'), s.unanswered.length ? [h('p', { class: 'mut' }, 'Add an answer under “Laari answers” and she will know it next time. Total chats so far: ' + s.chats + '.'), h('table', null, h('tbody', null, s.unanswered.map(function (u) { return h('tr', null, h('td', null, u.q), h('td', null, u.n + '×'), h('td', { class: 'mut' }, when(u.last))); })))] : h('p', { class: 'mut' }, 'None yet. Everything visitors asked was answered.')));
    });
  }

  /* ---------- generic content manager ---------- */
  function resource(res) {
    var def = schema.resources[res]; if (!def) throw new Error('Unknown section.');
    var host = h('div');
    function listView() {
      return api('GET', 'r/' + res).then(function (rows) {
        host.replaceChildren(h('div', { class: 'bar' }, h('h2', null, def.label), h('button', { class: 'btn p', type: 'button', onclick: function () { edit({}); } }, '+ Add new')),
          h('div', { class: 'card' }, rows.length ? h('table', null, h('tbody', null, rows.map(function (r) {
            var im = def.fields.filter(function (f) { return f.type === 'image'; })[0];
            return h('tr', null, h('td', null, im && r[im.name] ? h('img', { class: 'thumb', src: r[im.name].replace(/^\//, '../'), alt: '' }) : null),
              h('td', null, h('b', null, label(r)), r.published === 0 ? [' ', h('span', { class: 'pill o' }, 'Hidden')] : null, r.category ? h('div', { class: 'mut' }, r.category) : null),
              h('td', { class: 'act' }, h('button', { class: 'btn s', type: 'button', onclick: function () { edit(r); } }, 'Edit'), ' ', h('button', { class: 'btn s d', type: 'button', onclick: function () { if (confirm('Delete “' + label(r) + '”? This cannot be undone.')) api('DELETE', 'r/' + res + '/' + r.id).then(listView).catch(function (e) { alert(e.message); }); } }, 'Delete')));
          }))) : h('p', { class: 'mut' }, 'Nothing here yet. Use “Add new”.')));
        return host;
      });
    }
    function edit(r) {
      var data = Object.assign({}, r), st = h('div'), inputs = {};
      var form = h('form', { class: 'form', onsubmit: function (e) {
        e.preventDefault(); var out = {};
        def.fields.forEach(function (f) { if (f.name in inputs) out[f.name] = f.type === 'bool' ? inputs[f.name].checked : inputs[f.name].value; else if (f.name in data) out[f.name] = data[f.name]; });
        api(r.id ? 'PUT' : 'POST', 'r/' + res + (r.id ? '/' + r.id : ''), out).then(function () { listView(); window.scrollTo(0, 0); }).catch(function (er) { note(st, er.message); });
      } });
      def.fields.forEach(function (f) {
        if (f.type === 'file' || ['original_name', 'mime', 'size', 'downloads', 'slug'].indexOf(f.name) >= 0 && res === 'documents') return;
        var v = data[f.name], inp;
        if (f.type === 'bool') { inp = h('input', { type: 'checkbox' }); inp.checked = r.id ? +v !== 0 : f.name === 'published'; inputs[f.name] = inp; form.appendChild(h('label', null, f.name === 'published' ? 'Show on the website' : f.name.replace(/_/g, ' '), inp)); return; }
        if (f.type === 'long') inp = h('textarea', { rows: f.name === 'body' ? 12 : 5 });
        else if (f.type === 'select') inp = h('select', null, f.options.map(function (o) { return h('option', { value: o[0] }, o[1]); }));
        else inp = h('input', { type: f.type === 'num' ? 'number' : f.type === 'date' ? 'date' : 'text', step: f.type === 'num' ? 'any' : null });
        inp.value = v == null ? (f.type === 'select' ? f.options[0][0] : '') : (f.type === 'date' ? String(v).slice(0, 10) : v);
        inputs[f.name] = inp; var extra = null;
        if (f.type === 'image' || (res === 'videos' && f.name === 'embed_src')) {
          var kind = f.type === 'image' ? 'image' : 'video', pick = h('input', { type: 'file', accept: kind === 'image' ? 'image/png,image/jpeg,image/webp,image/gif' : 'video/mp4,video/webm', onchange: function () {
            if (!pick.files[0]) return; note(st, 'Uploading…', true);
            upload(pick.files[0], kind).then(function (u) { inp.value = u.file; if (kind === 'video' && inputs.embed_type) inputs.embed_type.value = 'file'; note(st, 'Uploaded. Press Save to keep it.', true); }).catch(function (e) { note(st, e.message); });
          } });
          extra = h('small', null, kind === 'image' ? 'Choose a picture to upload, or paste an https link above.' : 'Paste a YouTube or Vimeo embed link above, or upload an MP4 or WebM file here.', h('br'), pick);
        }
        form.appendChild(h('label', null, f.name.replace(/_/g, ' '), inp, extra));
      });
      if (res === 'documents') {
        var pick = h('input', { type: 'file', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.csv,.txt,.zip', onchange: function () {
          if (!pick.files[0]) return; note(st, 'Uploading…', true);
          upload(pick.files[0], 'doc').then(function (u) { data.file = u.file; data.original_name = u.original_name; data.mime = u.mime; data.size = u.size; fname.textContent = u.original_name; if (!inputs.title.value) inputs.title.value = u.original_name.replace(/\.[^.]+$/, ''); note(st, 'Uploaded. Press Save to publish.', true); }).catch(function (e) { note(st, e.message); });
        } }), fname = h('b', null, data.original_name || 'No file yet');
        form.insertBefore(h('label', null, 'File', h('span', null, fname), pick), form.children[1] || null);
      }
      form.appendChild(st);
      form.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn p', type: 'submit' }, 'Save'), h('button', { class: 'btn', type: 'button', onclick: listView }, 'Cancel')));
      host.replaceChildren(h('div', { class: 'bar' }, h('h2', null, (r.id ? 'Edit' : 'Add') + ' · ' + def.label)), h('div', { class: 'card' }, form)); window.scrollTo(0, 0);
    }
    return listView();
  }

  /* ---------- messages and donations ---------- */
  function messages() {
    return api('GET', 'messages').then(function (rows) {
      var host = h('div', null, h('div', { class: 'bar' }, h('h2', null, 'Messages')));
      function setS(r, s) { api('PUT', 'messages/' + r.id, { status: s }).then(function () { go('messages'); }); }
      host.appendChild(h('div', null, rows.length ? rows.map(function (r) {
        return h('div', { class: 'card' }, h('div', { class: 'row' }, h('b', null, r.name), h('span', { class: 'pill ' + (r.status === 'new' ? 'o' : 'g') }, r.status), h('span', { class: 'pill' }, r.kind), h('span', { class: 'mut' }, when(r.created))),
          h('p', { class: 'mut' }, [r.email, r.phone, r.org].filter(Boolean).join(' · ')), r.subject ? h('b', null, r.subject) : null, h('p', { class: 'pre' }, r.message),
          h('div', { class: 'row' }, h('a', { class: 'btn s', href: 'mailto:' + r.email + '?subject=' + encodeURIComponent('Re: ' + (r.subject || 'Your message to NCRI-Ghana')), onclick: function () { if (r.status === 'new') setS(r, 'replied'); } }, 'Reply by email'),
            h('button', { class: 'btn s', type: 'button', onclick: function () { setS(r, 'read'); } }, 'Mark read'), h('button', { class: 'btn s', type: 'button', onclick: function () { setS(r, 'archived'); } }, 'Archive'),
            h('button', { class: 'btn s d', type: 'button', onclick: function () { if (confirm('Delete this message?')) api('DELETE', 'messages/' + r.id).then(function () { go('messages'); }); } }, 'Delete')));
      }) : h('div', { class: 'card mut' }, 'No messages yet.')));
      return host;
    });
  }
  function donations() {
    return api('GET', 'donations').then(function (rows) {
      return h('div', null, h('div', { class: 'bar' }, h('h2', null, 'Donations')), h('p', { class: 'mut' }, 'Gifts recorded on the website. When you see money arrive in your Mobile Money or bank account, find the reference and mark it Paid.'),
        h('div', { class: 'card' }, rows.length ? h('table', null, h('thead', null, h('tr', null, ['Reference', 'Donor', 'Amount', 'Status', ''].map(function (t) { return h('th', null, t); }))), h('tbody', null, rows.map(function (r) {
          return h('tr', null, h('td', null, h('b', null, r.ref), h('div', { class: 'mut' }, when(r.created))), h('td', null, r.anonymous ? 'Anonymous' : r.name || '–', h('div', { class: 'mut' }, [r.email, r.phone, r.method].filter(Boolean).join(' · ')), r.message ? h('div', { class: 'mut' }, '“' + r.message + '”') : null),
            h('td', null, money(r.amount, r.currency)), h('td', null, h('span', { class: 'pill ' + (r.status === 'paid' ? 'g' : r.status === 'pending' ? 'o' : '') }, r.status)),
            h('td', { class: 'act' }, r.status !== 'paid' ? h('button', { class: 'btn s p', type: 'button', onclick: function () { api('PUT', 'donations/' + r.ref, { status: 'paid' }).then(function () { go('donations'); }); } }, 'Mark paid') : null, ' ', r.status === 'pending' ? h('button', { class: 'btn s', type: 'button', onclick: function () { api('PUT', 'donations/' + r.ref, { status: 'cancelled' }).then(function () { go('donations'); }); } }, 'Cancel') : null));
        }))) : h('p', { class: 'mut' }, 'No gifts recorded yet.')));
    });
  }

  /* ---------- site text, subscribers, account ---------- */
  var GROUPS = [['Organisation', /^(org_name|short_name|tagline|slogan|registration_notice|vision|mission)$/], ['Contact details', /^(contact_|social_)/], ['Home page', /^(hero_|featured_|impact_)/], ['Giving', /^(donat)/], ['Live broadcast', /^live_/], ['Page introductions', /_intro$|^(mel_|partnerships_|resources_)/]];
  function settingsView() {
    return api('GET', 'settings').then(function (s) {
      var inputs = {}, st = h('div'), keys = Object.keys(s).sort(), used = {};
      var form = h('form', { class: 'form', onsubmit: function (e) {
        e.preventDefault(); var out = {}; Object.keys(inputs).forEach(function (k) { out[k] = inputs[k].value; });
        api('PUT', 'settings', out).then(function () { note(st, 'Saved. The website shows the new text straight away.', true); }).catch(function (er) { note(st, er.message); });
      } });
      function field(k) {
        used[k] = 1; var long = s[k].length > 80 || /\n/.test(s[k]) || /(_text|_intro|vision|mission|_notice|_description|_ways|points)/.test(k);
        inputs[k] = long ? h('textarea', { rows: 4 }) : h('input', { type: 'text' }); inputs[k].value = s[k]; return h('label', null, k.replace(/_/g, ' '), inputs[k]);
      }
      GROUPS.concat([['Other', /./]]).forEach(function (g) {
        var ks = keys.filter(function (k) { return !used[k] && g[1].test(k); }); if (!ks.length) return;
        form.appendChild(h('h3', { style: 'margin-top:10px' }, g[0])); ks.forEach(function (k) { form.appendChild(field(k)); });
        if (g[0] === 'Live broadcast') form.appendChild(h('p', { class: 'mut' }, 'Set “live status” to live, scheduled or offline. “Live url” can be a YouTube or Vimeo link, or an HLS (.m3u8) stream.'));
      });
      form.appendChild(st); form.appendChild(h('button', { class: 'btn p', type: 'submit', style: 'justify-self:start' }, 'Save all'));
      return h('div', null, h('div', { class: 'bar' }, h('h2', null, 'Site text and live')), h('div', { class: 'card' }, form));
    });
  }
  function subs() {
    return api('GET', 'subscribers').then(function (rows) {
      return h('div', null, h('div', { class: 'bar' }, h('h2', null, 'Subscribers (' + rows.length + ')'), h('a', { class: 'btn', href: '../api/admin/subscribers?csv=1' }, 'Download CSV')),
        h('div', { class: 'card' }, rows.length ? h('table', null, h('tbody', null, rows.map(function (r) { return h('tr', null, h('td', null, r.email), h('td', { class: 'mut' }, when(r.created))); }))) : h('p', { class: 'mut' }, 'No subscribers yet.')));
    });
  }
  /* ---------- backups and recovery ---------- */
  function backups() {
    return api('GET', 'backups').then(function (j) {
      var st = h('div'), host = h('div', null, h('div', { class: 'bar' }, h('h2', null, 'Backups'),
        h('button', { class: 'btn p', type: 'button', onclick: function () { note(st, 'Making a backup…', true); api('POST', 'backups').then(function () { go('backups'); }).catch(function (e) { note(st, e.message); }); } }, 'Back up now')), st);
      host.appendChild(h('div', { class: 'card' }, h('p', null, j.auto ? 'The site backs itself up automatically about once a day and keeps the latest ' + j.keep + '.' : 'Automatic backups are switched off on this server.'),
        h('p', { class: 'mut' }, 'Each backup holds the database, uploaded pictures and videos, and documents. Download the database file and keep a copy somewhere other than this server (another computer or cloud storage). To restore, see "Backups and recovery" in the README.')));
      host.appendChild(j.backups.length ? h('div', { class: 'card' }, j.backups.map(function (b) {
        var out = h('span', { class: 'mut' });
        return h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding:8px 0;border-bottom:1px solid var(--line,#ddd)' },
          h('b', null, b.name), h('span', { class: 'mut' }, b.broken ? 'unreadable' : (b.created || '').replace('T', ' ').slice(0, 16) + ' UTC · ' + b.uploads + ' media · ' + b.docs + ' documents · db ' + Math.round(b.dbBytes / 1024) + ' KB'),
          h('span', { style: 'margin-left:auto;display:flex;gap:8px;align-items:center' }, out,
            h('button', { class: 'btn s', type: 'button', onclick: function () { out.textContent = 'Checking…'; api('GET', 'backups/' + b.name + '/verify').then(function (r) { out.textContent = r.ok ? 'Backup is complete' : 'Problem: ' + r.problems.join('; '); }).catch(function (e) { out.textContent = e.message; }); } }, 'Check'),
            h('a', { class: 'btn s', href: '../api/admin/backups/' + b.name + '/db', download: '' }, 'Download database')));
      })) : h('div', { class: 'card mut' }, 'No backups yet. Press "Back up now".'));
      return host;
    });
  }

  function account() {
    var st = h('div'), cur1 = h('input', { type: 'password', autocomplete: 'current-password' }), n1 = h('input', { type: 'password', autocomplete: 'new-password', minlength: 10 });
    return h('div', null, h('div', { class: 'bar' }, h('h2', null, 'Account')), h('div', { class: 'card' }, h('p', null, 'Signed in as ', h('b', null, me.email), '.'),
      h('form', { class: 'form', onsubmit: function (e) { e.preventDefault(); api('POST', 'password', { current: cur1.value, next: n1.value }).then(function (j) { note(st, j.message, true); cur1.value = n1.value = ''; }).catch(function (er) { note(st, er.message); }); } },
        h('h3', null, 'Change password'), h('label', null, 'Current password', cur1), h('label', null, 'New password', h('small', null, 'At least 10 characters. A few random words works well.'), n1), st, h('button', { class: 'btn p', type: 'submit', style: 'justify-self:start' }, 'Change password'))));
  }

  /* ---------- start ---------- */
  function start() {
    api('GET', 'schema').then(function (sc) { schema = sc; shell(); go('dash'); }).catch(function () {});
  }
  fetch('../api/admin/me', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (j) { if (j.admin) { me = j.admin; start(); } else login(); }).catch(function () { app.replaceChildren(h('p', { class: 'boot' }, 'The server is not running, so the admin screen cannot open. Start it with “node server.js”.')); });
})();
