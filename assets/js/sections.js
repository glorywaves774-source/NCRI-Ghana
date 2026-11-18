/* Page sections that appear on more than one page. Each takes a host element and fills it from the API. */
(function () {
  'use strict';
  var $ = NCRI.$, $$ = NCRI.$$, esc = NCRI.esc, ic = NCRI.icon;
  var S = NCRI.sections = {};

  S.err = function (host, msg) { host.innerHTML = '<div class="empty glass">' + ic('file') + '<p>' + esc(msg || 'This section could not be loaded just now. Please try again in a moment.') + '</p></div>'; };

  /* ----- core values: moving marquee plus explanation cards ----- */
  S.values = function (host, opts) {
    opts = opts || {};
    return NCRI.get('values').then(function (list) {
      function chip(v, k, hide) { return '<a class="vchip" href="' + (opts.cards ? '#v-' + k : 'about.html#v-' + k) + '" style="--c:' + esc(v.color) + ';--on:' + esc(v.on_color) + '"' + (hide ? ' tabindex="-1" aria-hidden="true"' : '') + '><span class="orb">' + ic(v.icon) + '</span>' + esc(v.name) + '</a>'; }
      function row(order, hideAll) { var h = ''; for (var pass = 0; pass < 2; pass++) order.forEach(function (k) { h += chip(list[k], k, hideAll || pass === 1); }); return h; }
      var o1 = list.map(function (_, k) { return k; }), o2 = o1.slice(4).concat(o1.slice(0, 4)).reverse();
      var html = NCRI.calm ? '<div class="vchips" role="group" aria-label="Our core values">' + o1.map(function (k) { return chip(list[k], k, false); }).join('') + '</div>'
        : '<div class="marq" role="group" aria-label="Our core values"><div class="mt" style="--sp:46s">' + row(o1, false) + '</div></div><div class="marq rev" aria-hidden="true"><div class="mt" style="--sp:58s">' + row(o2, true) + '</div></div>';
      if (opts.cards) {
        html += '<div class="wrap above"><div class="grid g3" style="margin-top:clamp(24px,4vw,44px)">' + list.map(function (v, k) {
          return '<div class="rv" style="--dl:' + ((k % 3) * .08) + 's"><article class="glass vcard tilt" id="v-' + k + '" style="--c:' + esc(v.color) + '"><div class="vhead"><span class="orb" style="--on:' + esc(v.on_color) + '">' + ic(v.icon) + '</span><h3>' + esc(v.name) + '</h3></div><p class="depth">' + esc(v.description) + '</p><div class="commit"><b>Our commitment</b>' + esc(v.commitment) + '</div></article></div>';
        }).join('') + '</div></div>';
      }
      host.innerHTML = html; NCRI.fx(host);
      if (opts.cards) host.addEventListener('click', function (e) {
        var a = e.target.closest('a.vchip'); if (!a) return; var c = $(a.getAttribute('href')); if (!c) return;
        setTimeout(function () { c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); setTimeout(function () { c.classList.remove('flash'); }, 1600); }, 450);
      });
    }).catch(function () { S.err(host); });
  };

  /* ----- six pillars; each opens the cinematic viewer ----- */
  S.pillars = function (host) {
    return NCRI.get('programs').then(function (programs) {
      host.innerHTML = '<div class="pillars">' + programs.map(function (p, i) {
        var ph = p.photos[0];
        return '<div class="pillar-w rv" style="--dl:' + (i * .07) + 's"><button class="pillar glass tilt" type="button" data-i="' + i + '" style="--c:' + esc(p.color) + '" aria-haspopup="dialog" aria-label="Open the story of ' + esc(p.name) + ': photos and articles">' +
          '<div class="ph">' + (ph ? '<img src="' + esc(NCRI.U(ph.file)) + '" alt="' + esc(ph.alt || '') + '" loading="lazy">' : '') + '</div>' +
          '<span class="mark" style="--c:' + esc(p.color) + ';--on:#fff">' + ic(p.icon) + '</span><div class="body"><h3>' + esc(p.name) + '</h3><p>' + esc(p.tagline) + '</p><span class="link-more">Open the story ' + ic('arrow') + '</span></div></button></div>';
      }).join('') + '</div>';
      $$('.pillar', host).forEach(function (b) { b.addEventListener('click', function (e) { PillarViewer.open(programs, +b.dataset.i, e); }); });
      NCRI.fx(host); return programs;
    }).catch(function () { S.err(host); });
  };

  /* ----- impact figures and charts ----- */
  S.metrics = function () { return NCRI.get('mel'); };
  function range(m) { return m.low === m.high ? Charts.num(m.low) : Charts.num(m.low) + '–' + Charts.num(m.high); }
  S.impact = function (host, opts) {
    opts = opts || {};
    return S.metrics().then(function (mel) {
      var ms = mel.metrics;
      var stats = ms.map(function (m, i) {
        var pct = m.low ? Math.min(100, m.achieved / m.low * 100) : 0;
        return '<div class="rv" style="--dl:' + (i * .08) + 's"><div class="glass stat tilt" style="--c:' + esc(m.color) + ';--w:' + (pct / 100).toFixed(3) + '"><b><span data-count="' + m.low + '">' + Charts.num(m.low) + '</span>' + (m.high !== m.low ? '–<span data-count="' + m.high + '">' + Charts.num(m.high) + '</span>' : '') + '</b><span>' + esc(m.label) + '</span><small class="muted">' + Charts.num(m.achieved || 0) + ' verified so far</small><div class="bar" title="' + Math.round(pct) + '% of the lower target reached so far"><i></i></div></div></div>';
      }).join('');
      host.innerHTML = (opts.chart ? '<div class="two" style="align-items:center"><div class="rv"><div class="glass chartbox tilt"><h3>Who we plan to reach by 2027</h3><div id="impDonut" style="width:100%;display:grid;justify-items:center;gap:16px"></div><p class="cap">Share of the combined target, using the middle of each range.</p></div><div class="glass chartbox tilt" style="margin-top:18px"><h3>Verified so far</h3><div id="impAct" style="width:100%;display:grid;justify-items:center;gap:16px"></div><p class="cap">Confirmed through monitoring and updated as results are verified.</p></div></div><div class="stats" style="grid-template-columns:repeat(2,1fr)">' + stats + '</div></div>'
        : '<div class="stats">' + stats + '</div>');
      if (opts.chart) Charts.donut($('#impDonut', host), { title: 'Planned reach by group', items: ms.map(function (m) { return { label: m.label.replace(/ reached$/, ''), value: (m.low + m.high) / 2, color: m.color, display: range(m) }; }), centerLabel: 'people (midpoint)' });
      if (opts.chart) Charts.donut($('#impAct', host), { kind: 'pie', title: 'Verified results by group', centerLabel: 'people verified', items: ms.map(function (m) { return { label: m.label.replace(/ reached$/, ''), value: m.achieved || 0, color: m.color, display: Charts.num(m.achieved || 0) + ' of ' + range(m) }; }) });
      NCRI.fx(host);
    }).catch(function () { S.err(host); });
  };

  /* ----- news ----- */
  function storyCard(n) {
    return '<a class="story glass tilt" href="news.html?s=' + encodeURIComponent(n.slug) + '"><div class="im">' + (n.image ? '<img src="' + esc(NCRI.U(n.image)) + '" alt="" loading="lazy">' : '') + '</div><div class="tx"><span class="tag">' + esc(n.category) + (n.published_at ? ' · ' + esc(NCRI.fmtDate(n.published_at)) : '') + '</span><h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p><span class="link-more">Read story ' + ic('arrow') + '</span></div></a>';
  }
  S.storyCard = storyCard;
  S.newsSlider = function (host, limit) {
    return NCRI.get('news').then(function (list) {
      list = list.slice(0, limit || 8);
      if (!list.length) { host.innerHTML = '<div class="empty glass">' + ic('file') + '<p>Stories will appear here soon.</p></div>'; return; }
      host.innerHTML = '<div class="track" tabindex="0" aria-label="Latest stories">' + list.map(storyCard).join('') + '</div>';
      var tr = $('.track', host);
      function step() { var c = $('.story', tr); return c ? c.getBoundingClientRect().width + 18 : 380; }
      var p = $('#nPrev'), n = $('#nNext');
      if (p) p.addEventListener('click', function () { tr.scrollBy({ left: -step(), behavior: NCRI.reduce ? 'auto' : 'smooth' }); });
      if (n) n.addEventListener('click', function () { tr.scrollBy({ left: step(), behavior: NCRI.reduce ? 'auto' : 'smooth' }); });
    }).catch(function () { S.err(host); });
  };

  /* ----- people ----- */
  var GROUPS = [['board', 'Board of Directors'], ['management', 'Management'], ['staff', 'Staff'], ['volunteers', 'Volunteers'], ['interns', 'Interns']];
  S.people = function (host) {
    return NCRI.get('people').then(function (all) {
      host.innerHTML = '<div class="tabs glass" role="tablist" aria-label="People groups">' + GROUPS.map(function (g, i) { return '<button class="tab" role="tab" id="pt' + i + '" aria-selected="' + (i === 0) + '" aria-controls="pp" data-g="' + g[0] + '" tabindex="' + (i ? -1 : 0) + '" type="button">' + g[1] + '</button>'; }).join('') + '</div><div id="pp" role="tabpanel" aria-labelledby="pt0"></div>';
      var tabs = $$('.tab', host), pp = $('#pp', host);
      function show(i) {
        tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; }); pp.setAttribute('aria-labelledby', 'pt' + i);
        var list = all.filter(function (p) { return p.grp === GROUPS[i][0]; });
        pp.innerHTML = list.length ? '<div class="ppl">' + list.map(function (p) { return '<div class="rv"><article class="glass person tilt"><div class="im">' + (p.photo ? '<img src="' + esc(NCRI.U(p.photo)) + '" alt="' + esc(p.name) + '" loading="lazy">' : '<div class="empty" style="height:100%;place-content:center">' + ic('woman') + '</div>') + '</div><div class="tx"><b>' + esc(p.name) + '</b><span>' + esc(p.role) + '</span>' + (p.bio ? '<p>' + esc(p.bio) + '</p>' : '') + '</div></article></div>'; }).join('') + '</div>'
          : '<div class="empty glass">' + ic('woman') + '<p>Profiles for ' + esc(GROUPS[i][1].toLowerCase()) + ' will appear here when they are published.</p></div>';
        NCRI.fx(pp);
      }
      tabs.forEach(function (t, k) {
        t.addEventListener('click', function () { show(k); });
        t.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); var n = (k + d + tabs.length) % tabs.length; tabs[n].focus(); show(n); } });
      });
      show(0);
    }).catch(function () { S.err(host); });
  };

  /* ----- documents (policies, resources, MEL, forms) ----- */
  S.docs = function () { return NCRI.get('documents'); };
  S.docList = function (host, docs, emptyMsg) {
    host.innerHTML = docs.length ? '<div class="docs">' + docs.map(NCRI.docRow).join('') + '</div>' : '<div class="empty">' + ic('file') + '<p>' + esc(emptyMsg || 'No documents have been published here yet.') + '</p></div>';
  };

  /* ----- FAQ accordion ----- */
  S.faq = function (host, filter) {
    return NCRI.get('faqs').then(function (list) {
      if (filter) list = list.filter(filter);
      host.innerHTML = '<div class="acc">' + list.map(function (f) { return '<details class="glass"><summary>' + esc(f.question) + '</summary><div class="ans"><p>' + esc(f.answer) + '</p></div></details>'; }).join('') + '</div>';
    }).catch(function () { S.err(host); });
  };

  /* ----- partner wall ----- */
  S.partnerWall = function (host) {
    return NCRI.get('partners').then(function (list) {
      var colors = ['#0B5A3C', '#F29A1A', '#4FA33A', '#D6527E', '#4A63D8', '#17A3B8'];
      host.innerHTML = list.length ? '<div class="pw">' + list.map(function (p, i) {
        var inner = '<div class="lg">' + (p.logo ? '<img src="' + esc(NCRI.U(p.logo)) + '" alt="" loading="lazy">' : '<span class="ini" style="--c:' + colors[i % 6] + '">' + esc(p.name.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase()) + '</span>') + '</div><b>' + esc(p.name) + '</b><small>' + esc(p.kind) + '</small>';
        return '<div class="rv" style="--dl:' + ((i % 6) * .05) + 's">' + (p.url ? '<a class="glass pcard tilt" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<div class="glass pcard tilt">' + inner + '</div>') + '</div>';
      }).join('') + '</div>' : '<div class="empty glass">' + ic('link') + '<p>Our partner organisations will be shown here. If your organisation would like to work with us, send an enquiry below.</p></div>';
      NCRI.fx(host);
    }).catch(function () { S.err(host); });
  };

  /* ----- forms ----- */
  NCRI.bindForm = function (form, endpoint, extra) {
    var st = $('.status', form), btn = $('button[type=submit]', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = Object.assign({}, extra || {});
      $$('input,textarea,select', form).forEach(function (f) { if (!f.name) return; data[f.name] = f.type === 'checkbox' ? f.checked : f.value; });
      st.className = 'status'; st.textContent = 'Sending…'; btn.disabled = true;
      NCRI.api.post(endpoint, data).then(function (j) {
        st.className = 'status ok'; st.textContent = j.message || 'Thank you.'; form.reset();
        if (form.__done) form.__done(j);
      }).catch(function (er) { st.className = 'status err'; st.textContent = er.message; }).then(function () { btn.disabled = false; });
    });
  };

  /* ----- live status (small card used on home and media pages) ----- */
  S.live = function () { return NCRI.get('live'); };
  S.hls = function (video, src) {
    if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = src; return; }
    var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';
    s.onload = function () { if (window.Hls && Hls.isSupported()) { var h = new Hls(); h.loadSource(src); h.attachMedia(video); } };
    document.head.appendChild(s);
  };
})();
