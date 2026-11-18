/* Laari: the NCRI-Ghana virtual guide. Answers come from the FAQ list the administrator edits. */
(function () {
  'use strict';
  var $ = NCRI.$, esc = NCRI.esc, ic = NCRI.icon;
  var KEY = 'laari-chat-v1';
  var root = document.createElement('div'); root.className = 'laari';
  root.innerHTML =
    '<div class="l-panel" id="l-panel" role="dialog" aria-label="Chat with Laari" aria-modal="false">' +
    '<div class="l-head"><span class="l-av"><img src="assets/img/logo-symbol.png" alt="" width="30" height="25"></span><div><b>Laari</b><small>NCRI-Ghana virtual guide</small></div>' +
    '<button class="icon-btn x" type="button" id="l-close" aria-label="Close chat">' + ic('x') + '</button></div>' +
    '<div class="l-msgs" id="l-msgs" role="log" aria-live="polite" aria-relevant="additions"></div>' +
    '<div class="l-sug" id="l-sug"></div>' +
    '<form class="l-form" id="l-form" autocomplete="off"><label class="sr" for="l-in">Type your question</label><input id="l-in" maxlength="300" placeholder="Ask me anything…"><button type="submit" aria-label="Send">' + ic('send') + '</button></form>' +
    '<div class="l-note">Laari answers common questions. Please don’t share personal details here. For anything else, <a href="contact.html">contact the team</a>.</div></div>' +
    '<button class="l-launch glass" type="button" id="l-open" aria-expanded="false" aria-controls="l-panel"><span class="l-av"><img src="assets/img/logo-symbol.png" alt="" width="30" height="25"></span><span>Ask Laari</span></button>';
  document.body.appendChild(root);

  var msgs = $('#l-msgs'), sug = $('#l-sug'), input = $('#l-in'), started = false, busy = false, history = [];
  try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { history = []; }

  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-30))); } catch (e) { /* ignore */ } }
  function pageHref(u) { return String(u || '').replace(/^\//, '').replace(/^(about|programs|donate|get-involved|partnerships|policies|resources|mel|news|media|contact)(?=$|#)/, '$1.html'); }
  function add(who, text, link) {
    var d = document.createElement('div'); d.className = 'l-m ' + who;
    d.textContent = text;
    if (link && link.url) { var a = document.createElement('a'); a.className = 'l-link'; a.href = pageHref(link.url); a.innerHTML = esc(link.label || 'Open') + ic('arrow'); a.querySelector('svg').style.cssText = 'width:14px;height:14px'; d.appendChild(document.createElement('br')); d.appendChild(a); }
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  }
  function chips(list) {
    sug.innerHTML = '';
    (list || []).slice(0, 5).forEach(function (q) { var b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.addEventListener('click', function () { ask(q); }); sug.appendChild(b); });
  }
  function typing() { var d = document.createElement('div'); d.className = 'l-m bot l-typing'; d.setAttribute('aria-label', 'Laari is typing'); d.innerHTML = '<i></i><i></i><i></i>'; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }

  function localAnswer(q) {
    var get = function (k) { return NCRI.get(k).catch(function () { return null; }); };
    return Promise.all([get('faqs'), get('programs'), get('values'), get('people'), get('partners'), get('news'), get('documents'), get('mel'), get('donate/channels'), get('donate/config'), get('policy-sections'), get('live')]).then(function (r) {
      var faqs = (r[0] || []).map(function (f) { return { id: f.id, question: f.question, answer: f.answer, keywords: '', link: f.link }; });
      var kb = window.LaariKB ? window.LaariKB.build({ settings: NCRI.settings || {}, programs: r[1], values: r[2], people: r[3], partners: r[4], news: r[5], documents: r[6], mel: r[7], channels: r[8], config: r[9], policySections: r[10], live: r[11] }) : [];
      return window.LaariEngine.answer(faqs.concat(kb), q, { suggestions: faqs.slice(0, 4).map(function (f) { return f.question; }) });
    });
  }
  function ask(q) {
    q = String(q || '').trim(); if (!q || busy) return;
    busy = true; add('me', q); history.push({ w: 'me', t: q }); input.value = ''; sug.innerHTML = '';
    var t = typing(), wait = NCRI.reduce ? 0 : 550;
    var req = NCRI.demo ? localAnswer(q) : NCRI.api.post('chat', { q: q }).catch(function () { return localAnswer(q); });
    Promise.all([req, new Promise(function (r) { setTimeout(r, wait); })]).then(function (res) {
      var a = res[0]; t.remove();
      add('bot', a.reply, a.link); history.push({ w: 'bot', t: a.reply, l: a.link }); save(); chips(a.suggestions);
    }).catch(function () {
      t.remove(); add('bot', 'Sorry, I could not reach the server just now. Please try again, or use the Contact page.', { url: '/contact', label: 'Contact the team' });
    }).then(function () { busy = false; if (!phone() || root.classList.contains('typing')) input.focus(); });
  }

  function open() {
    root.classList.add('open'); $('#l-open').setAttribute('aria-expanded', 'true');
    if (!started) {
      started = true;
      if (history.length) { history.forEach(function (m) { add(m.w, m.t, m.l); }); NCRI.get('chat/start').then(function (s) { chips(s.suggestions); }).catch(function () {}); }
      else NCRI.get('chat/start').catch(function () { return NCRI.get('faqs').then(function (l) { return { greeting: 'Akwaaba! I’m Laari, NCRI-Ghana’s virtual guide. Ask me anything about our work, or pick a question below.', suggestions: l.slice(0, 5).map(function (f) { return f.question; }) }; }); })
        .then(function (s) { add('bot', s.greeting); history.push({ w: 'bot', t: s.greeting }); save(); chips(s.suggestions); });
    }
    if (!phone()) setTimeout(function () { input.focus(); }, 60);   /* on phones the keyboard stays down until the visitor taps the box */
    try { sessionStorage.setItem('laari-open', '1'); } catch (e) { /* ignore */ }
  }
  function close() { root.classList.remove('open'); $('#l-open').setAttribute('aria-expanded', 'false'); $('#l-open').focus(); try { sessionStorage.removeItem('laari-open'); } catch (e) { /* ignore */ } }
  /* phones: while typing, the window fills the space above the keyboard and the suggestions and note step aside */
  function phone() { return matchMedia('(max-width:760px)').matches; }
  var panel = $('#l-panel'), vv = window.visualViewport;
  function fit() {
    if (!root.classList.contains('typing') || !vv) { panel.style.top = panel.style.height = ''; return; }
    panel.style.top = Math.round(vv.offsetTop + 8) + 'px'; panel.style.height = Math.round(vv.height - 16) + 'px';
    msgs.scrollTop = msgs.scrollHeight;
  }
  input.addEventListener('focus', function () { if (phone()) { root.classList.add('typing'); document.documentElement.classList.add('l-typing'); fit(); setTimeout(fit, 300); } });
  input.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== input) { root.classList.remove('typing'); document.documentElement.classList.remove('l-typing'); fit(); } }, 120); });
  if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
  $('#l-open').addEventListener('click', open); $('#l-close').addEventListener('click', close);
  $('#l-form').addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('open')) close(); });
  document.addEventListener('click', function (e) { var a = e.target.closest('[data-laari]'); if (a) { e.preventDefault(); open(); } });
  try { if (sessionStorage.getItem('laari-open') === '1') open(); } catch (e) { /* ignore */ }
})();
