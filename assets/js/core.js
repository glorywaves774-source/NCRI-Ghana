/* NCRI-Ghana core: data access, shared header and footer, theme, motion helpers and the admin quick-upload. */
(function () {
  'use strict';
  var NCRI = window.NCRI = { demo: false, settings: {}, partners: [], admin: null };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  NCRI.$ = $; NCRI.$$ = $$;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;
  NCRI.reduce = reduce;
  NCRI.calm = true;   /* editorial design: no tilt, parallax, magnifier, magnetic buttons or moving strips */
  var VER = (/[?&]v=([\w-]+)/.exec((document.currentScript || {}).src || '') || [])[1] || '';

  /* ---------- helpers ---------- */
  NCRI.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var esc = NCRI.esc;
  /* Site pages all sit at the root, so every local path is made relative. That also lets the static preview work. */
  NCRI.U = function (p) { p = String(p || ''); return /^(https?:|data:|blob:)/.test(p) ? p : p.replace(/^\/+/, ''); };
  NCRI.fmtDate = function (d) { var t = new Date(String(d).replace(' ', 'T')); return isNaN(t) ? '' : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };
  NCRI.fmtSize = function (n) { n = +n || 0; return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
  NCRI.paras = function (t) { return String(t || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean); };
  NCRI.rich = function (t) {
    var out = '', list = false;
    String(t || '').split(/\r?\n/).forEach(function (line) {
      var l = line.trim();
      if (/^- /.test(l)) { if (!list) { out += '<ul>'; list = true; } out += '<li>' + esc(l.slice(2)) + '</li>'; return; }
      if (list) { out += '</ul>'; list = false; }
      if (/^## /.test(l)) out += '<h2>' + esc(l.slice(3)) + '</h2>';
      else if (l) out += '<p>' + esc(l) + '</p>';
    });
    return out + (list ? '</ul>' : '');
  };

  /* ---------- icons ---------- */
  var IC = {
    arrow: 'M5 12h14M13 6l6 6-6 6', pause: 'M9 5v14M15 5v14', download: 'M12 3v12M7 11l5 5 5-5M4 20h16', x: 'M6 6l12 12M18 6L6 18', send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z', menu: 'M4 7h16M4 12h16M4 17h16',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z', moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', chev: 'M6 9l6 6 6-6', file: 'M6 3h8l5 5v13H6zM14 3v5h5', upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
    check: '<circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M8 7.5h8"/>', woman: '<circle cx="12" cy="6" r="3"/><path d="M12 10l-5 10h10z"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 14c0-3 2.5-5 6-5 0 3-2.5 5-6 5z"/>', bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    cloud: '<path d="M7 14a4 4 0 1 1 1-7.9A5 5 0 0 1 18 8a3.5 3.5 0 0 1 0 7H7z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', crown: '<path d="M4 18h16"/><path d="M5 18L4 8l5 4 3-6 3 6 5-4-1 10"/>',
    circles: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>', scales: '<path d="M12 4v16M6 20h12M5 8h14"/><path d="M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>',
    home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>', 'shield-check': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', 'heart-handshake': '<path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z"/><path d="M8.5 12.5l2-2 2 1.5 2.5-2.5"/>', 'lock-keyhole': '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.4"/><path d="M12 16.4V18"/>', droplet: '<path d="M12 3c3.5 4.2 6 7.6 6 10.8A6 6 0 0 1 6 13.8C6 10.6 8.5 7.2 12 3z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.4"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    leaf: '<path d="M5 19C5 10 11 5 20 5c0 9-5 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>', link: '<path d="M9 14a4 4 0 1 1 0-8h3M15 10a4 4 0 1 1 0 8h-3M9 12h6"/>',
    heart: '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>', star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>', whatsapp: '<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.5z"/><path d="M9 9c0 3 3 6 6 6l1-2-2-1-1 .8c-1-.5-1.800-1.300-2.300-2.300L11 9.500 10 7.500z"/>',
    live: '<circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.500a6.400 6.400 0 0 0 0 9M16.500 7.500a6.400 6.400 0 0 1 0 9M4.500 4.500a10.600 10.600 0 0 0 0 15M19.500 4.500a10.600 10.600 0 0 1 0 15"/>',
    x_logo: '<path d="M4 4l16 16M20 4L4 20"/>', youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>'
  };
  var FILLED = {
    play: '<path d="M7 4l13 8-13 8z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8z"/>',
    linkedin: '<rect x="3" y="9" width="4" height="12"/><circle cx="5" cy="5" r="2"/><path d="M10 9h4v2c1-1.500 2.500-2.300 4.500-2.300C21 8.700 22 10.500 22 13v8h-4v-7c0-1.400-.6-2.200-2-2.200S14 12.700 14 14v7h-4z"/>'
  };
  NCRI.icon = function (n, cls) {
    var p = IC[n];
    if (p !== undefined) {
      if (p.charAt(0) !== '<') p = '<path d="' + p + '"/>';
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + p + '</svg>';
    }
    if (FILLED[n]) return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + FILLED[n] + '</svg>';
    return '';
  };
  var ic = NCRI.icon;

  /* ---------- data: the real API, or the saved preview data when no backend is attached ---------- */
  function isJson(res) { return res.ok && /json/.test(res.headers.get('content-type') || ''); }
  NCRI.api = {
    get: function (path) {
      var key = path.split('?')[0];
      if (NCRI.demo) return seed(key);
      return fetch('api/' + path, { headers: { Accept: 'application/json' } }).then(function (r) {
        if (isJson(r)) return r.json();
        throw new Error('no-api');
      }).catch(function (e) {
        if (!NCRI.demo) { NCRI.demo = true; document.documentElement.classList.add('demo'); }
        return seed(key);
      });
    },
    send: function (method, path, body) {
      if (NCRI.demo) return Promise.reject(new Error('This is a preview without the server attached, so nothing can be sent from here. On the live site this works.'));
      return fetch('api/' + path, { method: method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'ncri' }, body: JSON.stringify(body || {}) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.'); return j; }); });
    },
    post: function (path, body) { return NCRI.api.send('POST', path, body); }
  };
  function seed(key) {
    return fetch('assets/seed/' + key.replace(/\//g, '_') + '.json').then(function (r) { if (!r.ok) throw new Error('Not available in the preview.'); return r.json(); });
  }
  var cache = {};
  NCRI.get = function (path) { return cache[path] || (cache[path] = NCRI.api.get(path)); };

  /* ---------- shared layout ---------- */
  var NAV = [
    { t: 'About', href: 'about.html', kids: [['About us', 'about.html'], ['Core values', 'about.html#values'], ['Our people', 'about.html#people'], ['Policies', 'policies.html']] },
    { t: 'Our work', href: 'programs.html', kids: [['Programmes', 'programs.html'], ['Impact & learning (MEL)', 'mel.html'], ['Resources', 'resources.html']] },
    { t: 'Media', href: 'news.html', kids: [['News & updates', 'news.html'], ['Live & videos', 'media.html']] },
    { t: 'Partnerships', href: 'partnerships.html' },
    { t: 'Get involved', href: 'get-involved.html' },
    { t: 'Contact', href: 'contact.html' }
  ];
  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/^$/, 'index.html');
  if (!/\.html$/.test(PAGE)) PAGE += '.html';
  NCRI.page = PAGE;
  function isCur(href) { return href.split('#')[0] === PAGE && href.indexOf('#') < 0; }


  /* ---------- inner page banners: a clear, undistorted photo beside the title ---------- */
  var HERO_PHOTOS = {
    'about.html': ['ph01', 'Pupils gather under the trees for an outreach session'], 'programs.html': ['ph02', 'A facilitator explains with picture cards'],
    'policies.html': ['ph08', 'Civic education: how laws are made'], 'resources.html': ['ph09', 'Pupils attend a classroom session'],
    'mel.html': ['ph06', 'Farmers and field staff on site'], 'partnerships.html': ['ph04', 'A community talk in the shade of a tree'],
    'get-involved.html': ['ph11', 'Young people take the microphone'], 'news.html': ['ph05', 'Farmers inspect young trees'],
    'donate.html': ['ph03', 'A women’s group meets around a savings box'], 'contact.html': ['ph07', 'A pupil joins a civic education session'],
    'media.html': ['ph10', 'A girl speaks at a community event']
  };
  function pageHero() {
    var h = HERO_PHOTOS[NCRI.page], box = document.querySelector('.phero > .wrap'); if (!h || !box) return;
    var fig = document.createElement('figure'); fig.className = 'phero-photo rv';
    fig.innerHTML = '<img src="assets/img/photos/' + h[0] + '.jpg" alt="' + esc(h[1]) + '" width="1200" height="900" fetchpriority="high"><figcaption>' + esc(h[1]) + '</figcaption>';
    box.classList.add('has-photo'); box.appendChild(fig);
  }

  function renderHeader() {
    var links = NAV.map(function (n) {
      if (!n.kids) return '<a href="' + n.href + '"' + (isCur(n.href) ? ' aria-current="page"' : '') + '>' + n.t + '</a>';
      var cur = n.kids.some(function (k) { return isCur(k[1]); });
      return '<div class="dd"><button type="button" aria-expanded="false"' + (cur ? ' aria-current="page"' : '') + '>' + esc(n.t) + ic('chev') + '</button><div class="dd-menu">' +
        n.kids.map(function (k) { return '<a href="' + k[1] + '"' + (isCur(k[1]) ? ' aria-current="page"' : '') + '>' + esc(k[0]) + '</a>'; }).join('') + '</div></div>';
    }).join('');
    /* phone and tablet menu: a drawer that slides in from the left over a dimmed page */
    var groups = NAV.map(function (n) {
      var items = n.kids || [[n.t, n.href]];
      return '<div class="dr-g"><p class="dr-h">' + esc(n.t) + '</p>' + items.map(function (k) {
        return '<a href="' + k[1] + '"' + (isCur(k[1]) ? ' aria-current="page"' : '') + '>' + esc(k[0]) + '</a>'; }).join('') + '</div>';
    }).join('');
    var TABS = [['Home', 'index.html', 'home', ['index.html']], ['Work', 'programs.html', 'sprout', ['programs.html', 'mel.html', 'resources.html']], ['News', 'news.html', 'file', ['news.html', 'media.html']], ['Donate', 'donate.html', 'heart', ['donate.html']]];
    $('#site-header').innerHTML =
      '<div class="nav-wrap"><div class="wrap"><nav class="nav" aria-label="Main">' +
      '<button class="icon-btn burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">' + ic('menu') + '</button>' +
      '<a class="brand" href="index.html" aria-label="NCRI-Ghana home"><img src="assets/img/logo-symbol.png" alt="" width="46" height="38"><span translate="no">NCRI-Ghana</span></a>' +
      '<div class="links">' + links + '</div>' +
      '<button class="icon-btn" id="theme" type="button" aria-label="Switch to dark mode">' + ic('moon') + '</button>' +
      '<a class="btn primary sm hdr-donate" href="donate.html">' + ic('heart') + ' Donate</a>' +
      '</nav></div></div>';
    var shell = document.createElement('div');
    shell.innerHTML =
      '<div class="dr-scrim" id="dr-scrim" hidden></div>' +
      '<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Menu" hidden>' +
      '<div class="dr-top"><a class="brand" href="index.html"><img src="assets/img/logo-symbol.png" alt="" width="40" height="33"><span translate="no">NCRI-Ghana</span></a>' +
      '<button class="icon-btn dr-x" id="dr-x" type="button" aria-label="Close menu">' + ic('x') + '</button></div>' +
      '<label class="dr-find"><span class="sr">Find a page</span>' + ic('search') + '<input id="dr-q" type="search" placeholder="Find a page" autocomplete="off" enterkeyhint="search"></label>' +
      '<nav class="dr-list" aria-label="All pages"><div class="dr-g"><a href="index.html"' + (isCur('index.html') ? ' aria-current="page"' : '') + '>Home</a></div>' + groups + '<p class="dr-none" hidden>No page matches that.</p></nav>' +
      '<a class="btn primary dr-donate" href="donate.html">' + ic('heart') + ' Donate</a></aside>' +
      '<nav class="tabbar" aria-label="Main sections">' + TABS.map(function (t) {
        return '<a href="' + t[1] + '"' + (t[3].indexOf(PAGE) >= 0 ? ' aria-current="page"' : '') + '>' + ic(t[2]) + '<span>' + t[0] + '</span></a>'; }).join('') +
      '<button type="button" id="tab-menu" aria-controls="drawer" aria-expanded="false">' + ic('menu') + '<span>Menu</span></button></nav>';
    while (shell.firstChild) document.body.appendChild(shell.firstChild);

    $$('.dd').forEach(function (dd) {
      var b = $('button', dd), t;
      function set(o) { dd.classList.toggle('open', o); b.setAttribute('aria-expanded', o); }
      b.addEventListener('click', function () { var o = !dd.classList.contains('open'); $$('.dd.open').forEach(function (x) { if (x !== dd) { x.classList.remove('open'); $('button', x).setAttribute('aria-expanded', 'false'); } }); set(coarse ? o : true); });
      if (!coarse) { dd.addEventListener('mouseenter', function () { clearTimeout(t); set(true); }); dd.addEventListener('mouseleave', function () { t = setTimeout(function () { set(false); }, 160); }); }
      dd.addEventListener('keydown', function (e) { if (e.key === 'Escape') { set(false); b.focus(); } });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.dd')) $$('.dd.open').forEach(function (x) { x.classList.remove('open'); $('button', x).setAttribute('aria-expanded', 'false'); }); });

    var drawer = $('#drawer'), scrim = $('#dr-scrim'), q = $('#dr-q'), openers = [$('#burger'), $('#tab-menu')], lastFocus = null, pushed = false;
    function setOpen(o) {
      drawer.hidden = scrim.hidden = false;
      requestAnimationFrame(function () { document.documentElement.classList.toggle('dr-open', o); });
      openers.forEach(function (b) { b.setAttribute('aria-expanded', o); });
      if (!o) setTimeout(function () { if (!document.documentElement.classList.contains('dr-open')) { drawer.hidden = scrim.hidden = true; } }, 320);
    }
    function openDrawer() {
      if (document.documentElement.classList.contains('dr-open')) return;
      lastFocus = document.activeElement; setOpen(true);
      try { history.pushState({ ncriDrawer: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
      setTimeout(function () { $('#dr-x').focus({ preventScroll: true }); }, 60);
    }
    function closeDrawer(fromBack) {
      if (!document.documentElement.classList.contains('dr-open')) return;
      setOpen(false); q.value = ''; filter('');
      if (pushed && !fromBack) { pushed = false; history.back(); } else pushed = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    openers.forEach(function (b) { b.addEventListener('click', openDrawer); });
    $('#dr-x').addEventListener('click', function () { closeDrawer(); });
    scrim.addEventListener('click', function () { closeDrawer(); });
    window.addEventListener('popstate', function () { if (document.documentElement.classList.contains('dr-open')) closeDrawer(true); });
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
      if (e.key === 'Tab') { var f = $$('a,button,input', drawer).filter(function (x) { return x.offsetParent; }), a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    /* choosing a page replaces the menu's history step, so Back does not need an extra press */
    $$('a[href]', drawer).forEach(function (a) { a.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      var href = a.getAttribute('href'); e.preventDefault(); setOpen(false);
      var samePage = href.split('#')[0] === PAGE;
      if (pushed) { pushed = false; if (samePage) { history.back(); setTimeout(function () { location.hash = href.split('#')[1] || ''; if (!href.split('#')[1]) scrollTo(0, 0); }, 60); return; } location.replace(href); }
      else location.href = href;
    }); });
    var fold = function (t) { return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); };
    function filter(v) {
      var n = fold(v), any = false;
      $$('.dr-g', drawer).forEach(function (g) { var hit = false;
        $$('a', g).forEach(function (a) { var ok = !n || fold(a.textContent + ' ' + (($('.dr-h', g) || {}).textContent || '')).indexOf(n) >= 0; a.hidden = !ok; hit = hit || ok; });
        g.hidden = !hit; any = any || hit; });
      $('.dr-none', drawer).hidden = any;
    }
    q.addEventListener('input', function () { filter(q.value); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var a = $$('.dr-list a', drawer).filter(function (x) { return !x.hidden; })[0]; if (a) a.click(); } });

    /* light and dark: follows the device until the visitor chooses; the choice is kept in storage and a cookie */
    var themeBtn = $('#theme');
    function isDark() { var r = document.documentElement; return r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
    function syncTheme() { var d = isDark(); document.documentElement.setAttribute('data-bs-theme', d ? 'dark' : 'light'); themeBtn.innerHTML = ic(d ? 'sun' : 'moon'); themeBtn.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); themeBtn.title = d ? 'Light mode' : 'Dark mode'; }
    syncTheme();
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme); } catch (e) { /* older browsers */ }
    themeBtn.addEventListener('click', function () {
      var t = isDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = t; syncTheme();
      try { localStorage.setItem('ncri-theme', t); } catch (e) { /* ignore */ }
      document.cookie = 'ncri-theme=' + t + '; Path=/; Max-Age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    });
  }

  function partnersStrip(list) {
    if (!list.length) {
      return '<section class="pstrip" aria-labelledby="pst"><div class="wrap"><h2 id="pst">Our partners</h2><div class="pinvite"><span>We are building partnerships with communities, institutions and organisations across Northern Ghana.</span><a class="btn green sm" href="partnerships.html">Become a partner</a></div></div></section>';
    }
    var items = list.map(function (p, i) {
      var inner = (p.logo ? '<img src="' + esc(NCRI.U(p.logo)) + '" alt="" loading="lazy">' : '') + '<span>' + esc(p.name) + '</span>';
      return p.url ? '<a class="pitem" href="' + esc(p.url) + '" target="_blank" rel="noopener"' + (i >= list.length ? ' tabindex="-1" aria-hidden="true"' : '') + '>' + inner + '</a>' : '<span class="pitem">' + inner + '</span>';
    }).join('');
    if (NCRI.calm) return '<section class="pstrip" aria-labelledby="pst"><div class="wrap"><h2 id="pst">Organisations partnering with us</h2><div class="pgrid">' + items + '</div></div></section>';
    var twice = list.length < 6 ? items + items + items + items : items + items;
    return '<section class="pstrip" aria-labelledby="pst"><div class="wrap"><h2 id="pst">Organisations partnering with us</h2></div><div class="marq"><div class="mt" style="--sp:' + Math.max(30, list.length * 7) + 's">' + twice + '</div></div></section>';
  }

  /* wide logos already carry the organisation's name, so the text label is dropped beside them */
  document.addEventListener('load', function (e) { var i = e.target; if (i && i.tagName === 'IMG' && i.parentNode && i.parentNode.classList && i.parentNode.classList.contains('pitem') && i.naturalWidth / i.naturalHeight > 2) i.parentNode.classList.add('wide'); }, true);

  /* official pages, in the order they are shown. Add the links in the admin panel: Site text and live > Contact details. */
  var SOCIALS = [['social_facebook', 'facebook', 'Facebook', 'fb'], ['social_instagram', 'instagram', 'Instagram', 'ig'], ['social_linkedin', 'linkedin', 'LinkedIn', 'li'], ['social_x', 'x_logo', 'X', 'x'], ['social_youtube', 'youtube', 'YouTube', 'yt'], ['social_whatsapp', 'whatsapp', 'WhatsApp', 'wa']];
  function socialUrl(v) { v = String(v || '').trim(); return /^https?:\/\//i.test(v) ? v : (v ? 'https://' + v.replace(/^\/+/, '') : ''); }
  NCRI.socialLinks = function (cls) {
    var s = NCRI.settings || {};
    return SOCIALS.filter(function (x) { return socialUrl(s[x[0]]); }).map(function (x) {
      return '<a class="' + (cls || 'soc') + ' ' + x[3] + '" href="' + esc(socialUrl(s[x[0]])) + '" target="_blank" rel="noopener noreferrer"><span class="si">' + ic(x[1]) + '</span><span>' + x[2] + '</span></a>';
    }).join('');
  };

  function renderFooter() {
    var s = NCRI.settings, y = new Date().getFullYear();
    var soc = SOCIALS.map(function (x) { return [x[0], x[1], x[2]]; })
      .filter(function (x) { return socialUrl(s[x[0]]); }).map(function (x) { return '<a href="' + esc(socialUrl(s[x[0]])) + '" target="_blank" rel="noopener noreferrer" aria-label="' + x[2] + '">' + ic(x[1]) + '</a>'; }).join('');
    var contact = esc(s.contact_address || 'Saboba, Northern Region, Ghana') + (s.contact_email ? '<br><a href="mailto:' + esc(s.contact_email) + '" style="display:inline">' + esc(s.contact_email) + '</a>' : '') + (s.contact_phone ? '<br>' + esc(s.contact_phone) : '') +
      (!s.contact_email && !s.contact_phone ? '<br>' + esc(s.contact_pending || '') : '');
    $('#site-footer').innerHTML = partnersStrip(NCRI.partners || []) +
      '<footer class="site"><div class="field" aria-hidden="true"><i></i><i></i><i></i></div><div class="wrap"><div class="foot">' +
      '<div><span class="logo-plate"><img src="assets/img/logo-full.png" alt="' + esc(s.short_name || 'NCRI-Ghana') + ' - ' + esc(s.slogan || '') + '" width="233" height="52"></span><p style="margin-top:16px;max-width:34ch">' + esc(s.tagline || '') + '</p>' + (soc ? '<div class="social">' + soc + '</div>' : '') + '</div>' +
      '<div><h4>Explore</h4><a href="about.html">About us</a><a href="programs.html">Programmes</a><a href="mel.html">Impact &amp; learning</a><a href="resources.html">Resources</a><a href="news.html">News &amp; updates</a><a href="media.html">Live &amp; videos</a></div>' +
      '<div><h4>Governance</h4><a href="policies.html#accountability">Accountability</a><a href="policies.html#anti-fraud-corruption">Anti-fraud &amp; anti-corruption</a><a href="policies.html#complaints-whistleblowing">Complaints &amp; whistleblowing</a><a href="policies.html#financial-management">Financial management</a><a href="policies.html#procurement">Procurement</a></div>' +
      '<div><h4>Stay connected</h4><p style="margin-bottom:10px">' + contact + '</p><p>Subscribe for updates and opportunities.</p>' +
      '<form class="sub" id="sub" novalidate><label class="sr" for="s-email">Email address</label><input id="s-email" type="email" placeholder="Email address" autocomplete="email"><button class="btn primary sm" type="submit">Subscribe</button></form><p id="subStatus" role="status" aria-live="polite" style="font-size:.85rem;margin-top:8px"></p>' +
      '<a class="btn ghost sm" href="donate.html" style="display:inline-flex;margin-top:12px">' + ic('heart') + ' Donate</a></div></div>' +
      '<div class="legal"><span>© ' + y + ' ' + esc(s.org_name || 'Northern Community Resilience Initiative (NCRI-Ghana)') + '. All rights reserved.</span><span>' + esc(s.registration_notice || '') + '</span></div></div></footer>';
    $('#sub').addEventListener('submit', function (e) {
      e.preventDefault();
      var st = $('#subStatus'), v = $('#s-email').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { st.textContent = 'Please enter a valid email address.'; return; }
      NCRI.api.post('subscribe', { email: v }).then(function (j) { st.textContent = j.message || 'Thank you for subscribing.'; $('#s-email').value = ''; }).catch(function (er) { st.textContent = er.message; });
    });
  }

  /* ---------- effects ---------- */
  function injectFilters() {
    var d = document.createElement('div');
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
      '<filter id="lg" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.018" numOctaves="2" seed="7" result="n"/><feGaussianBlur in="n" stdDeviation="2.5" result="b"/><feDisplacementMap in="SourceGraphic" in2="b" scale="22" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="lens" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="1" seed="2" result="n"/><feGaussianBlur in="n" stdDeviation="3" result="b"/><feDisplacementMap in="SourceGraphic" in2="b" scale="46" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>';
    document.body.appendChild(d.firstChild);
    try { var br = navigator.userAgentData && navigator.userAgentData.brands; if ((br && br.some(function (b) { return /Chromium/.test(b.brand); })) || (!br && window.chrome)) /* liquid-glass refraction switched off (Aurora UI) */; } catch (e) { /* plain glass */ }
  }

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting) return;
      var t = en.target; t.classList.add('in'); io.unobserve(t);
      $$('[data-count]', t).forEach(NCRI.count); if (t.hasAttribute && t.hasAttribute('data-count')) NCRI.count(t);
      if (t.__onview) t.__onview();
    });
  }, { threshold: .12, rootMargin: '0px 0px -5% 0px' }) : null;
  NCRI.watch = function (el, fn) { el.__onview = fn; if (io) io.observe(el); else fn(); };
  NCRI.count = function (el) {
    if (el.__counted) return; el.__counted = 1;
    var to = +el.dataset.count || 0;
    if (reduce) { el.textContent = to.toLocaleString('en'); return; }
    var t0 = null;
    (function f(ts) { if (!t0) t0 = ts; var p = Math.min((ts - t0) / 1500, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en'); if (p < 1) requestAnimationFrame(f); })(performance.now());
  };
  /* Call after rendering new content: it wires up reveal-on-scroll, counters and word reveals. */
  NCRI.fx = function (root) {
    root = root || document;
    $$('.rv:not(.seen)', root).forEach(function (el) {
      el.classList.add('seen');
      if (!io) { el.classList.add('in'); return; }
      io.observe(el);
    });
    $$('[data-count]:not(.seen)', root).forEach(function (el) { el.classList.add('seen'); if (!el.closest('.rv') && io) io.observe(el); });
    $$('[data-words]:not(.words)', root).forEach(function (el) {
      var i = 0; el.classList.add('words');
      el.innerHTML = el.textContent.split(/\s+/).map(function (w) { return '<span class="w" style="--i:' + (i++) + '">' + esc(w) + '</span>'; }).join(' ');
    });
  };

  var hot = null;
  function pointerFx() {
    if (NCRI.calm) return;
    if (coarse || reduce) {
      document.addEventListener('pointermove', glow, { passive: true });
      return;
    }
    document.addEventListener('pointermove', function (e) {
      glow(e);
      var t = e.target.closest && e.target.closest('.tilt');
      if (hot && hot !== t) { reset(hot); hot = null; }
      if (!t) return;
      hot = t;
      var r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      t.classList.add('hot');
      t.style.setProperty('--ry', ((x - .5) * 7).toFixed(2) + 'deg');
      t.style.setProperty('--rx', ((.5 - y) * 6).toFixed(2) + 'deg');
      t.style.setProperty('--tx', ((x - .5) * 2).toFixed(3));
      t.style.setProperty('--ty', ((y - .5) * 2).toFixed(3));
    }, { passive: true });
    document.addEventListener('pointerleave', function () { if (hot) { reset(hot); hot = null; } });
    /* magnetic primary buttons */
    document.addEventListener('pointermove', function (e) {
      var b = e.target.closest && e.target.closest('.btn.primary,.btn.green');
      $$('.btn.mag').forEach(function (x) { if (x !== b) { x.classList.remove('mag'); x.style.translate = ''; } });
      if (!b) return;
      var r = b.getBoundingClientRect();
      b.classList.add('mag'); b.style.translate = (((e.clientX - r.left) / r.width - .5) * 8).toFixed(1) + 'px ' + (((e.clientY - r.top) / r.height - .5) * 6).toFixed(1) + 'px';
    }, { passive: true });
  }
  function reset(t) { t.classList.remove('hot'); t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); t.style.setProperty('--tx', '0'); t.style.setProperty('--ty', '0'); }
  function glow(e) {
    var g = e.target.closest && e.target.closest('.glass'); if (!g) return;
    var r = g.getBoundingClientRect();
    g.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); g.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }
  function progressBar() {
    var bar = $('#progress'); if (!bar) return; var ticking = false;
    function upd() { var h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(scrollY / h, 1) : 0) + ')'; ticking = false; }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true }); upd();
  }

  /* ---------- lightbox ---------- */
  NCRI.lightbox = function (src, caption) {
    var lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo');
    lb.innerHTML = '<button class="icon-btn x" type="button" aria-label="Close photo">' + ic('x') + '</button><figure><img src="' + esc(NCRI.U(src)) + '" alt="' + esc(caption || '') + '">' + (caption ? '<figcaption>' + esc(caption) + '</figcaption>' : '') + '</figure>';
    var prev = document.activeElement;
    function close() { lb.classList.remove('open'); setTimeout(function () { lb.remove(); if (prev && prev.focus) prev.focus(); }, 300); document.removeEventListener('keydown', key, true); }
    function key(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === 'Tab') { e.preventDefault(); $('.x', lb).focus(); } }
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.closest('.x')) close(); });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(lb); requestAnimationFrame(function () { lb.classList.add('open'); $('.x', lb).focus(); });
  };

  /* ---------- administrator quick upload (visible only when signed in to /admin) ---------- */
  function adminBar() {
    if (NCRI.demo) return;
    fetch('api/admin/me', { headers: { Accept: 'application/json' } }).then(function (r) { return isJson(r) ? r.json() : { admin: null }; }).then(function (j) {
      if (!j.admin) return;
      NCRI.admin = j.admin; document.documentElement.classList.add('is-admin');
      var def = document.body.dataset.docUpload;
      var fab = document.createElement('div'); fab.className = 'admin-fab glass';
      fab.innerHTML = '<a href="admin/" style="text-decoration:none;position:relative;z-index:1;font-weight:700">Admin</a>' + (def ? '<button class="btn primary sm" type="button">' + ic('upload') + ' Upload document</button>' : '');
      document.body.appendChild(fab);
      if (def) $('button', fab).addEventListener('click', function () { NCRI.openUpload(def); });
      $$('.js-upload').forEach(function (b) { b.addEventListener('click', function () { NCRI.openUpload(b.dataset.cat || def); }); });
    }).catch(function () { /* not signed in */ });
  }
  NCRI.openUpload = function (cat) {
    fetch('api/admin/schema').then(function (r) { return r.json(); }).then(function (sc) {
      var m = document.createElement('div'); m.className = 'modal';
      m.innerHTML = '<form class="box fm" novalidate><h3>Upload a document</h3>' +
        '<div class="fld"><label for="u-cat">Where it appears</label><select id="u-cat">' + sc.docCategories.map(function (c) { return '<option value="' + c.value + '"' + (c.value === cat ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '</select></div>' +
        '<div class="fld"><label for="u-title">Title</label><input id="u-title" required></div>' +
        '<div class="fld"><label for="u-desc">Short description (optional)</label><input id="u-desc"></div>' +
        '<div class="row2"><div class="fld"><label for="u-ver">Version</label><input id="u-ver" placeholder="v1.0"></div><div class="fld"><label for="u-file">File</label><input id="u-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.csv,.txt,.zip" required></div></div>' +
        '<div class="status" role="status" aria-live="polite"></div><div class="cta"><button class="btn green" type="submit">Upload and publish</button><button class="btn line" type="button" id="u-x">Cancel</button></div></form>';
      document.body.appendChild(m); $('#u-title', m).focus();
      var st = $('.status', m);
      function close() { m.remove(); }
      $('#u-x', m).addEventListener('click', close); m.addEventListener('click', function (e) { if (e.target === m) close(); });
      m.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
      $('form', m).addEventListener('submit', function (e) {
        e.preventDefault();
        var f = $('#u-file', m).files[0], title = $('#u-title', m).value.trim();
        if (!f || !title) { st.className = 'status err'; st.textContent = 'Please add a title and choose a file.'; return; }
        st.className = 'status'; st.textContent = 'Uploading…';
        var fd = new FormData(); fd.append('file', f);
        fetch('api/admin/upload?kind=doc', { method: 'POST', headers: { 'X-Requested-With': 'ncri' }, body: fd }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error); return j; }); })
          .then(function (up) {
            return NCRI.api.post('admin/r/documents', { category: $('#u-cat', m).value, title: title, description: $('#u-desc', m).value, version: $('#u-ver', m).value, file: up.file, original_name: up.original_name, mime: up.mime, size: up.size, published: 1 });
          }).then(function () { st.className = 'status ok'; st.textContent = 'Published.'; document.dispatchEvent(new Event('ncri:docs-changed')); setTimeout(close, 700); })
          .catch(function (er) { st.className = 'status err'; st.textContent = er.message; });
      });
    });
  };

  /* ---------- shared document list ---------- */
  var TYPE = { 'application/pdf': ['PDF', '#C0392B'], 'application/msword': ['DOC', '#2B6CB0'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['DOCX', '#2B6CB0'],
    'application/vnd.ms-excel': ['XLS', '#1F8A4C'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['XLSX', '#1F8A4C'], 'application/vnd.ms-powerpoint': ['PPT', '#D35400'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['PPTX', '#D35400'], 'text/csv': ['CSV', '#1F8A4C'], 'text/plain': ['TXT', '#5D6D7E'], 'application/zip': ['ZIP', '#7D3C98'] };
  NCRI.docRow = function (d) {
    var t = TYPE[d.mime] || ['FILE', '#5D6D7E'], pdf = d.mime === 'application/pdf';
    var meta = [d.version, d.doc_date ? NCRI.fmtDate(d.doc_date) : '', NCRI.fmtSize(d.size), (d.downloads || 0) + ' download' + (d.downloads === 1 ? '' : 's')].filter(Boolean).join(' · ');
    var dl = d.static_url || (NCRI.demo ? '#' : 'download/' + d.id);
    return '<div class="doc"><div class="ftype" style="--c:' + t[1] + '" aria-hidden="true">' + t[0] + '</div><div><h4>' + esc(d.title) + '</h4><small>' + esc(meta) + '</small>' + (d.description ? '<p>' + esc(d.description) + '</p>' : '') + '</div>' +
      '<div class="act">' + (pdf && !NCRI.demo ? '<a class="btn line sm" href="download/' + d.id + '?inline=1" target="_blank" rel="noopener">' + ic('eye') + ' View</a>' : '') + '<a class="btn green sm" href="' + dl + '"' + (NCRI.demo && !d.static_url ? ' aria-disabled="true"' : '') + ' download>' + ic('download') + ' Download</a></div></div>';
  };

  /* ---------- start ---------- */
  var resolveReady; NCRI.ready = new Promise(function (r) { resolveReady = r; });
  function start() {
    injectFilters(); renderHeader(); pageHero(); progressBar(); pointerFx();
    (NCRI.calm ? ['translate'] : ['translate', 'motion', 'lens']).forEach(function (n) { var sc = document.createElement('script'); sc.src = 'assets/js/' + n + '.js' + (VER ? '?v=' + VER : ''); document.head.appendChild(sc); });
    NCRI.get('bootstrap').then(function (b) {
      NCRI.settings = b.settings || {}; NCRI.partners = b.partners || []; NCRI.boot = b;
    }).catch(function () { /* the pages still render with their built-in text */ }).then(function () {
      renderFooter(); NCRI.fx(); adminBar();
      if (location.hash && document.getElementById(location.hash.slice(1))) setTimeout(function () { document.getElementById(location.hash.slice(1)).scrollIntoView(); }, 150);
    }).then(resolveReady);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
