(function () {
  'use strict';
  var $ = NCRI.$, S = NCRI.sections;
  function docs(fresh) {
    return (fresh ? NCRI.api.get('documents') : S.docs()).then(function (d) { S.docList($('#gDocs'), d.filter(function (x) { return x.category === 'getinvolved-form'; }), 'Volunteer and partnership forms will be published here.'); }).catch(function () { S.err($('#gDocs')); });
  }
  NCRI.ready.then(function () {
    $('#giIntro').textContent = NCRI.settings.getinvolved_intro || '';
    NCRI.bindForm($('#vForm'), 'contact', { kind: 'volunteer', subject: 'Volunteer application' });
    S.faq($('#giFaq'), function (f) { return f.category === 'Giving and support'; });
    NCRI.fx(); return docs(false);
  });
  document.addEventListener('ncri:docs-changed', function () { docs(true); });
})();
