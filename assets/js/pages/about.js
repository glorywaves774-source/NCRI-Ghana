(function () {
  'use strict';
  var $ = NCRI.$, esc = NCRI.esc, S = NCRI.sections;
  NCRI.ready.then(function () {
    var s = NCRI.settings;
    $('#story').innerHTML = NCRI.paras(s.about_story).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    $('#vision').textContent = s.vision || ''; $('#mission').textContent = s.mission || '';
    S.values($('#valuesHost'), { cards: true });
    S.sdgs($('#sdgHost'));
    S.people($('#peopleHost'));
    NCRI.fx();
  });
})();
