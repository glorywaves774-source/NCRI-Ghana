/* Scroll motion: subtle parallax on background depth layers and photos. Uses the CSS `translate` property so it never fights other transforms. */
(function () {
  'use strict';
  if (NCRI.reduce || !window.IntersectionObserver) return;
  var SPEEDS = [['.phero .orbs', .14], ['.phero .field', .07], ['.band .field', .08]];
  var items = [], visible = new Set(), ticking = false;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    request();
  }, { rootMargin: '120px 0px' });

  function scan() {
    SPEEDS.forEach(function (s) {
      document.querySelectorAll(s[0]).forEach(function (el) {
        if (el.__px) return; el.__px = s[1]; items.push(el);
        if (el.tagName === 'IMG') { el.style.scale = '1.2'; }
        io.observe(el);
      });
    });
  }
  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    visible.forEach(function (el) {
      var host = el.tagName === 'IMG' ? el.parentNode : el, r = host.getBoundingClientRect();
      var off = (r.top + r.height / 2 - vh / 2) * el.__px;
      var lim = el.tagName === 'IMG' ? r.height * .085 : 60;
      el.style.translate = '0 ' + Math.max(-lim, Math.min(lim, off)).toFixed(1) + 'px';
    });
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);

  var fx = NCRI.fx; NCRI.fx = function (root) { var r = fx.apply(this, arguments); scan(); return r; };
  scan();
})();
