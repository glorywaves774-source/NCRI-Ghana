(function () {
  'use strict';
  var $ = NCRI.$, $$ = NCRI.$$, esc = NCRI.esc, ic = NCRI.icon, S = NCRI.sections;
  var slug = new URLSearchParams(location.search).get('s');

  function article(n) {
    document.title = n.title + ' | NCRI-Ghana';
    $('#listView').hidden = true; $('#artView').hidden = false;
    $('#artHost').innerHTML = '<article class="article"><a class="link-more" href="news.html" style="transform:scaleX(1)"><span style="display:inline-grid;transform:scaleX(-1)">' + ic('arrow') + '</span> All stories</a>' +
      '<p class="tag" style="margin-top:22px">' + esc(n.category) + (n.published_at ? ' · ' + esc(NCRI.fmtDate(n.published_at)) : '') + '</p><h1>' + esc(n.title) + '</h1>' +
      (n.image ? '<div class="cover"><img src="' + esc(NCRI.U(n.image)) + '" alt=""></div>' : '') +
      '<div class="body">' + (n.body ? NCRI.rich(n.body) : '<p>' + esc(n.summary) + '</p><p class="muted">The full story will be published here soon.</p>') + '</div></article>';
    NCRI.fx();
  }
  NCRI.ready.then(function () {
    $('#newsIntro').textContent = NCRI.settings.news_intro || '';
    if (slug) {
      return NCRI.get('news/' + encodeURIComponent(slug)).then(article).catch(function () {
        $('#listView').hidden = true; $('#artView').hidden = false; $('#artHost').innerHTML = '<div class="empty glass">' + ic('file') + '<p>We could not find that story.</p><a class="btn green sm" href="news.html">See all stories</a></div>';
      });
    }
    return NCRI.get('news').then(function (list) {
      var cats = ['All'].concat(list.map(function (n) { return n.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
      $('#cats').innerHTML = cats.map(function (c, i) { return '<button class="chip" type="button" data-c="' + esc(c) + '" aria-pressed="' + (i === 0) + '">' + esc(c) + '</button>'; }).join('');
      function draw(c) {
        var l = c === 'All' ? list : list.filter(function (n) { return n.category === c; });
        $('#grid').innerHTML = l.length ? '<div class="newsgrid">' + l.map(function (n, i) { return '<div class="rv" style="--dl:' + ((i % 3) * .07) + 's">' + S.storyCard(n) + '</div>'; }).join('') + '</div>' : '<div class="empty glass">' + ic('file') + '<p>No stories yet. Please check back soon.</p></div>';
        NCRI.fx($('#grid'));
      }
      $$('#cats .chip').forEach(function (b) { b.addEventListener('click', function () { $$('#cats .chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); draw(b.dataset.c); }); });
      draw('All');
    }).catch(function () { S.err($('#grid')); });
  });
})();
