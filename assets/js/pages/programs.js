(function () {
  'use strict';
  var $ = NCRI.$, esc = NCRI.esc, ic = NCRI.icon, S = NCRI.sections;
  NCRI.ready.then(function () {
    var s = NCRI.settings;
    $('#featTitle').textContent = s.featured_title || ''; $('#featText').textContent = s.featured_text || '';
    $('#featPoints').innerHTML = String(s.featured_points || '').split(/\r?\n/).filter(Boolean).map(function (t) { return '<li>' + ic('check') + esc(t) + '</li>'; }).join('');
    return S.pillars($('#pillarsHost'));
  }).then(function (programs) {
    S.sdgs($('#sdgHost'));
    NCRI.fx();
    var want = new URLSearchParams(location.search).get('open');
    if (programs && want) { var i = programs.findIndex(function (p) { return p.slug === want; }); if (i >= 0) PillarViewer.open(programs, i); }
  });
})();
