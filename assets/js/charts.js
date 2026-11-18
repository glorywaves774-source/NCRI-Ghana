/* Small, dependency-free charts: pie, donut, progress ring and bars. Colours come from the data so the admin can change them. */
(function () {
  'use strict';
  var esc = NCRI.esc, reduce = NCRI.reduce;
  var NS = 'http://www.w3.org/2000/svg';
  function num(n) { return Number(n || 0).toLocaleString('en'); }

  /* "Label | value | #colour" per line */
  function parsePairs(text) {
    var fallback = ['#0B5A3C', '#F29A1A', '#4FA33A', '#D6527E', '#4A63D8', '#17A3B8', '#8E6BBF', '#B57800'];
    return String(text || '').split(/\r?\n/).map(function (l, i) {
      var p = l.split('|').map(function (x) { return x.trim(); });
      var v = parseFloat(p[1]);
      return p[0] && v >= 0 ? { label: p[0], value: v, color: /^#[0-9a-f]{6}$/i.test(p[2] || '') ? p[2] : fallback[i % fallback.length] } : null;
    }).filter(Boolean);
  }

  function donut(el, o) {
    var items = (o.items || []).filter(function (i) { return i.value > 0; });
    var total = items.reduce(function (a, i) { return a + i.value; }, 0);
    if (!total) { /* nothing recorded yet: show an empty ring and the planned context */
      el.innerHTML = '<div class="donut"><svg viewBox="0 0 200 200" role="img" aria-label="' + esc(o.title || 'Chart') + ': nothing recorded yet"><circle class="bg" cx="100" cy="100" r="72" stroke-width="34"></circle></svg><div class="mid"><b>0</b><span>' + esc(o.centerLabel || '') + '</span></div></div>' +
        '<ul class="legend">' + (o.items || []).map(function (it) { return '<li style="--c:' + esc(it.color) + ';cursor:default"><i></i><span>' + esc(it.label) + '</span><em>' + (it.display || '0') + '</em></li>'; }).join('') + '</ul>';
      return;
    }
    var pie = o.kind === 'pie';
    var r = pie ? 50 : 72, sw = pie ? 100 : 34, C = 2 * Math.PI * r;
    var circles = '<circle class="bg" cx="100" cy="100" r="' + r + '" stroke-width="' + sw + '"></circle>';
    var cum = 0, gap = items.length > 1 ? 2.5 : 0;
    items.forEach(function (it, i) {
      var len = C * it.value / total;
      circles += '<circle class="s" data-i="' + i + '" cx="100" cy="100" r="' + r + '" stroke="' + esc(it.color) + '" stroke-width="' + sw + '" stroke-dasharray="0 ' + C.toFixed(2) + '" stroke-dashoffset="' + (-cum).toFixed(2) + '" data-len="' + Math.max(len - gap, 0.5).toFixed(2) + '" tabindex="0" role="img" aria-label="' + esc(it.label) + ': ' + num(it.value) + ' (' + Math.round(it.value / total * 100) + '%)"></circle>';
      cum += len;
    });
    var midLabel = o.centerLabel || '', midVal = o.centerValue != null ? o.centerValue : num(total);
    el.innerHTML = '<div class="donut"><svg viewBox="0 0 200 200" role="group" aria-label="' + esc(o.title || 'Chart') + '">' + circles + '</svg>' +
      (pie ? '' : '<div class="mid"><b>' + esc(midVal) + '</b><span>' + esc(midLabel) + '</span></div>') + '</div>' +
      (o.legend === false ? '' : '<ul class="legend">' + items.map(function (it, i) {
        return '<li data-i="' + i + '" tabindex="0" style="--c:' + esc(it.color) + '"><i></i><span>' + esc(it.label) + '</span><em>' + (it.display || num(it.value)) + ' · ' + Math.round(it.value / total * 100) + '%</em></li>';
      }).join('') + '</ul>');
    var box = el.querySelector('.donut'), mid = el.querySelector('.mid');
    function focus(i) {
      box.classList.toggle('dim', i >= 0);
      el.querySelectorAll('circle.s,.legend li').forEach(function (n) { n.classList.toggle('on', +n.dataset.i === i); });
      if (mid) {
        if (i >= 0) { mid.firstChild.textContent = Math.round(items[i].value / total * 100) + '%'; mid.lastChild.textContent = items[i].label; }
        else { mid.firstChild.textContent = midVal; mid.lastChild.textContent = midLabel; }
      }
    }
    el.querySelectorAll('circle.s,.legend li').forEach(function (n) {
      var i = +n.dataset.i;
      n.addEventListener('mouseenter', function () { focus(i); }); n.addEventListener('mouseleave', function () { focus(-1); });
      n.addEventListener('focus', function () { focus(i); }); n.addEventListener('blur', function () { focus(-1); });
    });
    function draw() { el.querySelectorAll('circle.s').forEach(function (c, k) { setTimeout(function () { c.setAttribute('stroke-dasharray', c.dataset.len + ' ' + C.toFixed(2)); }, reduce ? 0 : k * 120); }); }
    NCRI.watch(box, draw);
  }

  function ring(el, o) {
    var pct = Math.max(0, Math.min(100, o.pct || 0)), r = 72, C = 2 * Math.PI * r;
    el.innerHTML = '<div class="donut" role="img" aria-label="' + esc(o.label) + ': ' + Math.round(pct) + '% of the target reached so far"><svg viewBox="0 0 200 200"><circle class="bg" cx="100" cy="100" r="' + r + '" stroke-width="26"></circle>' +
      '<circle class="s" cx="100" cy="100" r="' + r + '" stroke="' + esc(o.color || '#F29A1A') + '" stroke-width="26" stroke-linecap="round" stroke-dasharray="0 ' + C.toFixed(1) + '" data-len="' + (C * pct / 100).toFixed(1) + '"></circle></svg>' +
      '<div class="mid"><b>' + Math.round(pct) + '%</b></div></div>';
    var c = el.querySelector('.s');
    NCRI.watch(el, function () { c.setAttribute('stroke-dasharray', c.dataset.len + ' ' + C.toFixed(1)); });
  }

  function bars(el, o) {
    var items = o.items || [], max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    el.innerHTML = '<div class="hbar" role="list">' + items.map(function (it) {
      return '<div role="listitem"><span><b>' + esc(it.label) + '</b><em style="font-style:normal">' + (it.display || num(it.value)) + '</em></span><i style="--w:' + (it.value / max * 100).toFixed(1) + '%;--c:' + esc(it.color) + '"></i></div>';
    }).join('') + '</div>';
  }

  /* planned range versus verified actual, one row per group */
  function compare(el, o) {
    var items = o.items || [], max = Math.max.apply(null, items.map(function (i) { return i.high; }).concat([1]));
    el.innerHTML = '<div class="cmp" role="list">' + items.map(function (it) {
      var hi = it.high / max * 100, lo = it.low / max * 100, ac = Math.min(100, it.actual / max * 100);
      return '<div role="listitem" style="--c:' + esc(it.color) + '"><span><b>' + esc(it.label) + '</b><em>' + num(it.actual) + ' of ' + (it.low === it.high ? num(it.low) : num(it.low) + '–' + num(it.high)) + '</em></span>' +
        '<div class="tr" role="img" aria-label="' + esc(it.label) + ': ' + num(it.actual) + ' verified, planned ' + num(it.low) + ' to ' + num(it.high) + '"><u style="width:' + hi.toFixed(1) + '%"></u><s style="left:' + lo.toFixed(1) + '%"></s><i style="--w:' + ac.toFixed(1) + '%"></i></div></div>';
    }).join('') + '</div><ul class="key"><li><i class="a"></i>Verified so far</li><li><i class="p"></i>Planned range</li><li><i class="t"></i>Lower target</li></ul>';
    var box = el.querySelector('.cmp');
    NCRI.watch(box, function () { box.classList.add('go'); });
  }

  window.Charts = { compare: compare, donut: donut, ring: ring, bars: bars, parsePairs: parsePairs, num: num };
})();
