(function () {
  'use strict';
  var $ = NCRI.$, $$ = NCRI.$$, esc = NCRI.esc, S = NCRI.sections;
  var CATS = [['', 'All'], ['resource-report', 'Reports'], ['resource-toolkit', 'Toolkits & guides'], ['resource-brief', 'Briefs & factsheets'], ['resource-training', 'Training materials']];
  var all = [], cat = '', q = '';
  function draw() {
    var list = all.filter(function (d) { return (!cat || d.category === cat) && (!q || (d.title + ' ' + d.description).toLowerCase().indexOf(q) >= 0); });
    $('#count').textContent = list.length + ' document' + (list.length === 1 ? '' : 's');
    S.docList($('#resList'), list, all.length ? 'Nothing matches your search. Try a different word or category.' : 'Reports, toolkits and briefs will be published here soon.');
  }
  function load(fresh) {
    return (fresh ? NCRI.api.get('documents') : S.docs()).then(function (d) { all = d.filter(function (x) { return /^resource-/.test(x.category); }); draw(); }).catch(function () { S.err($('#resList')); });
  }
  NCRI.ready.then(function () {
    $('#resIntro').textContent = NCRI.settings.resources_intro || '';
    $('#cats').innerHTML = CATS.map(function (c, i) { return '<button class="chip" type="button" data-c="' + c[0] + '" aria-pressed="' + (i === 0) + '">' + c[1] + '</button>'; }).join('');
    $$('#cats .chip').forEach(function (b) { b.addEventListener('click', function () { cat = b.dataset.c; $$('#cats .chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); draw(); }); });
    $('#q').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); draw(); });
    return load(false);
  });
  document.addEventListener('ncri:docs-changed', function () { load(true); });
})();
