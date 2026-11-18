/* Flow: calm, purposeful motion for the editorial design.
   - groups of cards, chips and logos flow in one after another as they scroll into view
   - section headings rise gently into place
   - the woven strip draws itself across the footer
   - charts draw their rings
   Everything is skipped for visitors who prefer reduced motion, and nothing is hidden without JavaScript. */
(function () {
  'use strict';
  if (!window.NCRI || NCRI.reduce || !('IntersectionObserver' in window)) return;
  var root = document.documentElement;
  root.classList.add('flow');

  var GROUPS = '.grid,.g2,.g3,.g4,.ppl,.vchips,.pgrid,.newsgrid,.trio,.stats,.focus-cards,.dtabs,.acc,.sdg-bento,.sdg-support,.cgrid,.vgrid,.ways,.foot,.docs,.doc-list';
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  function prepare(scope) {
    /* groups whose children do not already animate on their own */
    scope.querySelectorAll(GROUPS).forEach(function (g) {
      if (g.dataset.flow) return;
      var kids = Array.prototype.filter.call(g.children, function (k) { return !k.classList.contains('rv') && !k.querySelector('.rv'); });
      if (kids.length < 2 || kids.length !== g.children.length) return;
      g.dataset.flow = '1'; g.classList.add('stagger');
      kids.forEach(function (k, i) { k.style.setProperty('--i', Math.min(i, 12)); });
      io.observe(g);
    });
    /* headings that are not inside an element that already reveals */
    scope.querySelectorAll('main h2, main .eyebrow').forEach(function (h) {
      if (h.dataset.flow || h.closest('.rv,.hero,.stagger')) return;
      h.dataset.flow = '1'; h.classList.add('lift'); io.observe(h);
    });
    /* charts */
    var charts = []; scope.querySelectorAll('circle.s').forEach(function (k) { var v = k.ownerSVGElement; if (v && charts.indexOf(v) < 0) charts.push(v); });
    charts.forEach(function (c) { if (!c.dataset.flow) { c.dataset.flow = '1'; c.classList.add('drawable'); io.observe(c); } });
    /* footer strip */
    var f = document.querySelector('footer.site'); if (f && !f.dataset.flow) { f.dataset.flow = '1'; io.observe(f); }
  }

  /* content arrives from the server after first paint, so look again whenever the page changes */
  var queued = false;
  new MutationObserver(function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; prepare(document); }); })
    .observe(document.body, { childList: true, subtree: true });
  prepare(document);
})();
