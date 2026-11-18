(function () {
  'use strict';
  var $ = NCRI.$, esc = NCRI.esc, ic = NCRI.icon, S = NCRI.sections;
  var STATUS = { 'Not started': '#6B7B73', 'On track': '#4FA33A', 'At risk': '#F29A1A', 'Achieved': '#0B5A3C' };
  function rng(m) { return m.low === m.high ? Charts.num(m.low) : Charts.num(m.low) + '–' + Charts.num(m.high); }

  function load(fresh) {
    return Promise.all([NCRI.get('mel'), fresh ? NCRI.api.get('documents') : S.docs()]).then(function (r) {
      var mel = r[0], docs = r[1].filter(function (d) { return /^mel-/.test(d.category); }), ms = mel.metrics;

      Charts.donut($('#melDonut'), { title: 'Planned reach by group', items: ms.map(function (m) { return { label: m.label.replace(/ reached$/, ''), value: (m.low + m.high) / 2, color: m.color, display: rng(m) }; }), centerLabel: 'people (midpoint)' });

      var tot = ms.reduce(function (a, m) { return a + (m.achieved || 0); }, 0);
      Charts.donut($('#actDonut'), { kind: 'pie', title: 'Verified results by group', centerLabel: 'people verified', items: ms.map(function (m) { return { label: m.label.replace(/ reached$/, ''), value: m.achieved || 0, color: m.color, display: Charts.num(m.achieved || 0) + ' of ' + rng(m) }; }) });
      Charts.compare($('#cmpHost'), { items: ms.map(function (m) { return { label: m.label.replace(/ reached$/, ''), low: m.low, high: m.high, actual: m.achieved || 0, color: m.color }; }) });
      $('#rings').innerHTML = ms.map(function (m, i) {
        var pct = m.low ? Math.min(100, m.achieved / m.low * 100) : 0;
        return '<div class="rv" style="--dl:' + (i * .08) + 's"><div class="glass ring tilt" style="--c:' + esc(m.color) + '"><div data-ring="' + i + '"></div><b class="t">' + esc(m.label) + '</b><small>' + Charts.num(m.achieved) + ' verified of ' + rng(m) + ' planned</small></div></div>';
      }).join('');
      ms.forEach(function (m, i) { Charts.ring($('[data-ring="' + i + '"]'), { pct: m.low ? Math.min(100, m.achieved / m.low * 100) : 0, color: m.color, label: m.label }); });

      var extra = $('#extraCharts');
      extra.innerHTML = mel.charts.map(function (c, i) { return '<div class="rv"><div class="glass chartbox tilt"><h3>' + esc(c.title) + '</h3><div data-x="' + i + '" style="width:100%;display:grid;justify-items:center;gap:16px"></div>' + (c.caption ? '<p class="cap">' + esc(c.caption) + '</p>' : '') + '</div></div>'; }).join('');
      mel.charts.forEach(function (c, i) {
        var items = Charts.parsePairs(c.data), host = $('[data-x="' + i + '"]');
        if (c.kind === 'bar') Charts.bars(host, { items: items }); else Charts.donut(host, { kind: c.kind, title: c.title, items: items });
      });
      $('#extraWrap').hidden = !mel.charts.length;

      $('#indHost').innerHTML = mel.indicators.length ? '<div class="glass table-w"><table class="tbl"><thead><tr><th>Indicator</th><th>Pillar</th><th>Baseline</th><th>Target</th><th>Achieved</th><th>Status</th></tr></thead><tbody>' +
        mel.indicators.map(function (x) {
          return '<tr><td><b>' + esc(x.indicator) + '</b>' + (x.period ? '<br><small class="muted">' + esc(x.period) + '</small>' : '') + (x.note ? '<br><small class="muted">' + esc(x.note) + '</small>' : '') + '</td><td>' + esc(x.pillar_name || '–') + '</td><td>' + Charts.num(x.baseline) + ' ' + esc(x.unit) + '</td><td>' + Charts.num(x.target) + ' ' + esc(x.unit) + '</td><td>' + Charts.num(x.achieved) + ' ' + esc(x.unit) + '</td><td><span class="badge" style="--c:' + (STATUS[x.status] || '#6B7B73') + '">' + esc(x.status) + '</span></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty glass">' + ic('file') + '<p>Detailed indicators, baselines and results will be published here as they are set and verified.</p></div>';

      var inds = mel.indicators;
      $('#indCharts').hidden = !inds.length;
      if (inds.length) {
        var cnt = {}; inds.forEach(function (x) { cnt[x.status] = (cnt[x.status] || 0) + 1; });
        Charts.donut($('#statusDonut'), { kind: 'pie', title: 'Indicators by status', items: Object.keys(STATUS).filter(function (k) { return cnt[k]; }).map(function (k) { return { label: k, value: cnt[k], color: STATUS[k], display: cnt[k] + (cnt[k] === 1 ? ' indicator' : ' indicators') }; }) });
        Charts.bars($('#indBars'), { items: inds.map(function (x) { var span = (x.target - x.baseline) || 1, p = Math.max(0, Math.min(100, (x.achieved - x.baseline) / span * 100)); return { label: x.indicator, value: p, display: Charts.num(x.achieved) + ' of ' + Charts.num(x.target) + ' ' + (x.unit || ''), color: STATUS[x.status] || '#6B7B73' }; }) });
      }
      S.docList($('#melDocs'), docs, 'MEL reports, tools and learning briefs will be published here.');
      NCRI.fx();
    }).catch(function () { S.err($('#melDonut')); });
  }
  NCRI.ready.then(function () {
    var s = NCRI.settings;
    $('#melIntro').textContent = s.mel_intro || '';
    $('#melM').textContent = s.mel_monitoring || ''; $('#melE').textContent = s.mel_evaluation || ''; $('#melL').textContent = s.mel_learning || '';
    $('#melNote').textContent = s.impact_note || '';
    return load(false);
  });
  document.addEventListener('ncri:docs-changed', function () { load(true); });
})();
