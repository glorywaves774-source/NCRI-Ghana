/* Clear bubble magnifier. NCRI.lens(frame, target, urlFn, opts): shows the real photo enlarged inside a glass bubble that
   follows the pointer. The photo underneath is never filtered, tinted or moved. Off on touch screens and for reduced motion. */
(function () {
  'use strict';
  var NCRI = window.NCRI = window.NCRI || {};
  var cache = {};
  function dims(u) { return cache[u] || (cache[u] = new Promise(function (res) { var i = new Image(); i.onload = function () { res([i.naturalWidth, i.naturalHeight]); }; i.onerror = function () { res(null); }; i.src = u; })); }

  NCRI.lens = function (frame, target, urlFn, o) {
    o = o || {};
    if (matchMedia('(pointer:coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var size = o.size || 170, R = size / 2, Z = o.zoom || 2.1, el = document.createElement('div'), nat = null, lastUrl = '', cx = 0, cy = 0, tx = 0, ty = 0, raf = null, first = true;
    el.className = 'lens'; el.setAttribute('aria-hidden', 'true'); el.style.width = el.style.height = size + 'px'; frame.appendChild(el);
    function step() { cx += (tx - cx) * .22; cy += (ty - cy) * .22; el.style.transform = 'translate3d(' + (cx - R) + 'px,' + (cy - R) + 'px,0)'; raf = (Math.abs(tx - cx) > .4 || Math.abs(ty - cy) > .4) ? requestAnimationFrame(step) : null; }
    function paint(px, py, tr) {
      var iw = nat[0], ih = nat[1], s = Math.max(tr.width / iw, tr.height / ih), ox = (tr.width - iw * s) / 2, oy = (tr.height - ih * s) / 2;
      el.style.backgroundSize = (iw * s * Z) + 'px ' + (ih * s * Z) + 'px';
      el.style.backgroundPosition = (-((px - ox) * Z - R)) + 'px ' + (-((py - oy) * Z - R)) + 'px';
    }
    frame.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var u = urlFn(); if (!u) return;
      if (u !== lastUrl) { lastUrl = u; nat = null; el.style.backgroundImage = 'url("' + u.replace(/"/g, '%22') + '")'; dims(u).then(function (d) { nat = d; }); }
      var over = o.avoid && e.target.closest && e.target.closest(o.avoid);
      var tr = target.getBoundingClientRect(), fr = frame.getBoundingClientRect();
      var inside = e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom;
      if (over || !inside || !nat) { el.classList.remove('on'); return; }
      var px = Math.min(Math.max(e.clientX - tr.left, R * .35), tr.width - R * .35), py = Math.min(Math.max(e.clientY - tr.top, R * .35), tr.height - R * .35);
      paint(px, py, tr);
      tx = px + (tr.left - fr.left); ty = py + (tr.top - fr.top);
      if (first) { cx = tx; cy = ty; first = false; }
      el.classList.add('on'); if (!raf) raf = requestAnimationFrame(step);
    });
    frame.addEventListener('pointerleave', function () { el.classList.remove('on'); first = true; });
  };

  /* page banners: attach to each banner photo */
  function banners() {
    document.querySelectorAll('.phero-photo').forEach(function (fig) {
      var img = fig.querySelector('img'); if (!img || fig.dataset.lens) return; fig.dataset.lens = '1';
      NCRI.lens(fig, img, function () { return img.currentSrc || img.src; }, { size: 150, zoom: 2 });
    });
  }
  if (NCRI.ready && NCRI.ready.then) NCRI.ready.then(banners); else document.addEventListener('DOMContentLoaded', banners);
})();
