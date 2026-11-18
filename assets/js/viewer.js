/* Cinematic pillar viewer: a full-screen story for each programme pillar, with photos and articles. */
(function () {
  'use strict';
  var $ = NCRI.$, $$ = NCRI.$$, esc = NCRI.esc, ic = NCRI.icon, root = document.documentElement, reduce = NCRI.reduce;
  var DUR = 6500, el, programs = [], vp = 0, vs = 0, va = 0, timer = null, lastFocus = null, isOpen = false, hideT = null;

  function build() {
    el = document.createElement('div'); el.className = 'viewer'; el.id = 'viewer'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'vTitle');
    el.style.setProperty('--dur', DUR + 'ms');
    el.innerHTML = '<div class="v-inner"><div class="v-bar vglass"><span class="v-kick" id="vKick"></span><div class="v-nav">' +
      '<button class="v-btn" id="vPrev" type="button" aria-label="Previous pillar"><span style="transform:scaleX(-1);display:grid">' + ic('arrow') + '</span></button>' +
      '<button class="v-btn" id="vNext" type="button" aria-label="Next pillar">' + ic('arrow') + '</button>' +
      '<button class="v-btn" id="vClose" type="button" aria-label="Close and return to the site">' + ic('x') + '</button></div></div>' +
      '<div class="v-stage" id="vStage"><div id="vScenes"></div><div class="v-title" id="vHead"><span class="eyebrow" id="vTag"></span><h2 id="vTitle"></h2><p id="vLine"></p></div><p class="v-cap" id="vCap"></p><div class="dots v-dots" id="vDots" role="tablist" aria-label="Photos"></div></div>' +
      '<div class="v-body"><div class="v-list" id="vList" role="tablist" aria-label="Articles"></div><article class="v-read vglass" id="vRead" role="tabpanel" tabindex="-1"></article></div>' +
      '<div class="v-more"><span>Explore another pillar</span><div id="vChips"></div></div>' +
      '<p class="v-note">Photographs are from NCRI-Ghana community activities. Article text is draft wording for NCRI-Ghana to review and edit in the admin panel.</p></div>';
    document.body.appendChild(el);
    $('#vClose').addEventListener('click', close);
    $('#vPrev').addEventListener('click', function () { load(vp - 1); el.scrollTo({ top: 0 }); });
    $('#vNext').addEventListener('click', function () { load(vp + 1); el.scrollTo({ top: 0 }); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = $$('button:not([disabled])', el).filter(function (b) { return b.offsetParent !== null; });
        if (!f.length) return; var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
  }

  function scene(n) {
    var P = programs[vp], sc = $$('.v-scene', el), dd = $$('.dot', $('#vDots'));
    var count = Math.max(sc.length, 1); vs = (n + count) % count;
    sc.forEach(function (e, k) { e.classList.toggle('on', k === vs); });
    dd.forEach(function (d, k) { d.classList.remove('run'); d.classList.toggle('on', k === vs); d.setAttribute('aria-selected', k === vs); });
    var cap = $('#vCap'); cap.classList.remove('show'); void cap.offsetWidth;
    cap.textContent = P.photos[vs] ? P.photos[vs].caption : ''; cap.classList.add('show');
    clearTimeout(timer);
    if (!reduce && dd.length > 1) { void $('#vDots').offsetWidth; dd[vs].classList.add('run'); timer = setTimeout(function () { scene(vs + 1); }, DUR); }
  }

  function article(n, focus) {
    var P = programs[vp], A = P.articles[n]; if (!A) { $('#vRead').innerHTML = '<p>Articles for this pillar will appear here soon.</p>'; return; }
    va = n;
    $$('.v-tab', $('#vList')).forEach(function (t, k) { t.setAttribute('aria-selected', k === n); });
    var ps = NCRI.paras(A.body), h = '<span class="v-meta">' + esc(A.kicker) + ' · ' + A.read_mins + ' min read</span><h3>' + esc(A.title) + '</h3>';
    ps.forEach(function (p, k) { h += '<p' + (k === 0 ? ' class="first"' : '') + '>' + esc(p) + '</p>'; if (k === 1 && A.pull_quote) h += '<blockquote class="pull">' + esc(A.pull_quote) + '</blockquote>'; });
    if (P.photos.length) h += '<div class="v-photos">' + P.photos.slice(0, 3).map(function (ph, k) { return '<button type="button" data-k="' + k + '" aria-label="Enlarge photo: ' + esc(ph.caption) + '"><img src="' + esc(NCRI.U(ph.file)) + '" alt="' + esc(ph.alt || ph.caption) + '" loading="lazy"></button>'; }).join('') + '</div>';
    var read = $('#vRead'); read.innerHTML = h; read.classList.remove('swap'); void read.offsetWidth; read.classList.add('swap');
    $$('.v-photos button', read).forEach(function (b) { b.addEventListener('click', function () { var ph = P.photos[+b.dataset.k]; NCRI.lightbox(ph.file, ph.caption); }); });
    if (focus) { var top = read.getBoundingClientRect().top; if (top < 0 || innerWidth < 900) el.scrollTo({ top: el.scrollTop + top - 90, behavior: reduce ? 'auto' : 'smooth' }); }
  }

  function load(p) {
    vp = (p + programs.length) % programs.length;
    var P = programs[vp];
    el.style.setProperty('--pc', P.color);
    $('#vKick').textContent = 'Pillar ' + (vp + 1) + ' of ' + programs.length;
    $('#vTag').textContent = 'Pillar ' + (vp + 1);
    $('#vTitle').textContent = P.name; $('#vLine').textContent = P.tagline;
    var hd = $('#vHead'); hd.classList.remove('swap'); void hd.offsetWidth; hd.classList.add('swap');
    $('#vScenes').innerHTML = P.photos.length ? P.photos.map(function (ph, k) { return '<div class="v-scene" role="img" aria-label="' + esc(ph.alt || ph.caption) + '" style="background-image:url(\'' + esc(NCRI.U(ph.file)) + '\');--kx:' + (k % 2 ? '1.5%' : '-1.5%') + '"></div>'; }).join('') :
      '<div class="v-scene" style="background:linear-gradient(135deg,' + esc(P.color) + ',#04140D)"></div>';
    var dots = $('#vDots'); dots.innerHTML = '';
    P.photos.forEach(function (ph, k) { var b = document.createElement('button'); b.className = 'dot'; b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Photo ' + (k + 1) + ': ' + ph.caption); b.innerHTML = '<i></i>'; b.addEventListener('click', function () { scene(k); }); dots.appendChild(b); });
    $('#vList').innerHTML = P.articles.map(function (a, k) { return '<button class="v-tab" role="tab" type="button" data-k="' + k + '" aria-selected="false"><small>' + esc(a.kicker) + ' · ' + a.read_mins + ' min</small><b>' + esc(a.title) + '</b></button>'; }).join('');
    $$('.v-tab', $('#vList')).forEach(function (t) { t.addEventListener('click', function () { article(+t.dataset.k, true); }); });
    $('#vChips').innerHTML = programs.map(function (q, k) { return '<button class="v-chip" type="button" data-k="' + k + '" style="--c:' + esc(q.color) + '"' + (k === vp ? ' aria-current="true"' : '') + '><i></i>' + esc(q.name) + '</button>'; }).join('');
    $$('.v-chip', $('#vChips')).forEach(function (c) { c.addEventListener('click', function () { load(+c.dataset.k); el.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }); });
    article(0, false); scene(0);
  }

  function inert(on) { ['#site-header', 'main', '#site-footer', '.laari'].forEach(function (s) { var e = $(s); if (e) { e.inert = on; if (on) e.setAttribute('aria-hidden', 'true'); else e.removeAttribute('aria-hidden'); } }); }

  function open(list, index, ev) {
    if (!list || !list.length) return;
    programs = list; if (!el) build();
    clearTimeout(hideT); lastFocus = document.activeElement;
    var r = ev && ev.currentTarget && ev.currentTarget.getBoundingClientRect ? ev.currentTarget.getBoundingClientRect() : null;
    var ox = ev && ev.clientX ? ev.clientX : (r ? r.left + r.width / 2 : innerWidth / 2), oy = ev && ev.clientY ? ev.clientY : (r ? r.top + r.height / 2 : innerHeight / 2);
    el.style.setProperty('--ox', ox + 'px'); el.style.setProperty('--oy', oy + 'px');
    load(index); el.hidden = false; el.scrollTop = 0; void el.offsetWidth;
    el.classList.add('open'); root.classList.add('v-open'); inert(true); isOpen = true;
    setTimeout(function () { $('#vClose').focus({ preventScroll: true }); }, 140);
  }
  function close() {
    if (!isOpen) return; isOpen = false; clearTimeout(timer);
    el.classList.remove('open'); root.classList.remove('v-open'); inert(false);
    hideT = setTimeout(function () { el.hidden = true; $('#vScenes').innerHTML = ''; }, reduce ? 20 : 900);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  window.PillarViewer = { open: open, close: close };
})();
