(function () {
  'use strict';
  var $ = NCRI.$, esc = NCRI.esc, S = NCRI.sections;
  function docs(fresh) {
    return (fresh ? NCRI.api.get('documents') : S.docs()).then(function (d) { S.docList($('#pDocs'), d.filter(function (x) { return x.category === 'partnership-brief'; }), 'Partnership briefs and agreement templates will be published here.'); }).catch(function () { S.err($('#pDocs')); });
  }
  NCRI.ready.then(function () {
    var s = NCRI.settings;
    $('#pIntro').textContent = s.partnerships_intro || '';
    $('#ways').innerHTML = String(s.partnerships_ways || '').split(/\r?\n/).filter(Boolean).map(function (l, i) {
      var p = l.split('|'); return '<div class="rv" style="--dl:' + (i * .08) + 's"><article class="glass way tilt"><h3>' + esc((p[0] || '').trim()) + '</h3><p>' + esc((p[1] || '').trim()) + '</p></article></div>';
    }).join('');
    S.partnerWall($('#wall')); NCRI.bindForm($('#pForm'), 'contact', { kind: 'partner' });
    NCRI.fx(); return docs(false);
  });
  document.addEventListener('ncri:docs-changed', function () { docs(true); });
})();
