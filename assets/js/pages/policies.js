(function () {
  'use strict';
  var $ = NCRI.$, $$ = NCRI.$$, esc = NCRI.esc, ic = NCRI.icon, S = NCRI.sections;
  var sections = [];
  function render(docs) {
    var host = $('#polHost');
    host.innerHTML = sections.map(function (p) {
      var list = docs.filter(function (d) { return d.category === 'policy-' + p.key; });
      return '<div class="rv"><section class="glass pol" id="' + p.key + '" style="--c:' + esc(p.color) + '"><div class="pol-h"><span class="mark" style="--c:' + esc(p.color) + ';--on:#fff">' + ic(p.icon) + '</span><div class="grow"><h2>' + esc(p.name) + '</h2><p>' + esc(p.about) + '</p></div>' +
        '<button class="btn line sm admin-only js-upload" type="button" data-cat="policy-' + p.key + '">' + ic('upload') + ' Upload</button></div>' +
        '<div data-list="' + p.key + '"></div>' +
        (p.key === 'complaints-whistleblowing' ? '<div class="warn" style="position:relative;z-index:1"><b>Want to raise a concern?</b> You can write to us in confidence through the <a href="contact.html?kind=complaint"><b>Contact page</b></a>. Choose “Complaint / concern”, and you may leave out your name if you prefer.</div>' : '') +
        '</section></div>';
    }).join('');
    sections.forEach(function (p) { S.docList($('[data-list="' + p.key + '"]', host), docs.filter(function (d) { return d.category === 'policy-' + p.key; }), 'The approved ' + p.name.toLowerCase() + ' policy will be published here.'); });
    $$('.js-upload', host).forEach(function (b) { b.addEventListener('click', function () { NCRI.openUpload(b.dataset.cat); }); });
    NCRI.fx(host);
  }
  function load(fresh) { return (fresh ? NCRI.api.get('documents') : S.docs()).then(function (d) { render(d.filter(function (x) { return /^policy-/.test(x.category); })); }).catch(function () { S.err($('#polHost')); }); }
  NCRI.ready.then(function () {
    $('#polIntro').textContent = NCRI.settings.policies_intro || '';
    return NCRI.get('policy-sections');
  }).then(function (s) {
    sections = s;
    $('#subnav').innerHTML = s.map(function (p) { return '<a href="#' + p.key + '">' + esc(p.name) + '</a>'; }).join('');
    return load(false);
  }).then(function () {
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 200); }
    if ('IntersectionObserver' in window) {
      var links = $$('#subnav a');
      var so = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); }); }); }, { rootMargin: '-35% 0px -55% 0px' });
      sections.forEach(function (p) { var t = document.getElementById(p.key); if (t) so.observe(t); });
    }
  });
  document.addEventListener('ncri:docs-changed', function () { load(true); });
})();
