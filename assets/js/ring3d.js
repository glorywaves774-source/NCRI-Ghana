/* "Life in our communities": a slow, continuous marquee of undistorted photos. Hover, focus or the pause button stops it;
   each photo opens larger. With reduced motion it becomes a plain scrollable strip. (Name kept for the pages that call Ring3D.) */
(function () {
  'use strict';
  var esc = NCRI.esc;
  window.Ring3D = function (host, photos) {
    if (!photos.length) { host.innerHTML = ''; return; }
    function half(clone) {
      return '<div class="gal-half"' + (clone ? ' aria-hidden="true"' : '') + '>' + photos.map(function (p, i) {
        return '<figure class="gal-item"><button type="button" data-i="' + i + '"' + (clone ? ' tabindex="-1"' : '') + ' aria-label="Open photo: ' + esc(p.caption || '') + '"><img src="' + esc(NCRI.U(p.file)) + '" alt="' + (clone ? '' : esc(p.alt || p.caption || '')) + '" loading="lazy" draggable="false"></button>' +
          (p.caption && !clone ? '<figcaption>' + esc(p.caption) + '</figcaption>' : (clone && p.caption ? '<figcaption>' + esc(p.caption) + '</figcaption>' : '')) + '</figure>';
      }).join('') + '</div>';
    }
    var moving = !NCRI.reduce && photos.length > 2;
    host.innerHTML = '<div class="gal marq' + (moving ? ' run' : '') + '" role="group" aria-label="Photo gallery, slowly scrolling"><div class="gal-view" tabindex="0"><div class="gal-run" style="--t:' + (photos.length * 11) + 's">' + half(false) + (moving ? half(true) : '') + '</div></div>' +
      (moving ? '<div class="r-ctrl"><button class="icon-btn" id="gpause" type="button" aria-pressed="false" aria-label="Pause the scrolling photos">' + NCRI.icon('pause') + '</button></div>' : '') + '</div>';
    var root = host.querySelector('.gal'), view = host.querySelector('.gal-view'), pb = host.querySelector('#gpause');
    view.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) { var p = photos[+b.dataset.i]; NCRI.lightbox(p.file, p.caption); } });
    if (pb) pb.addEventListener('click', function () { var on = root.classList.toggle('paused'); pb.setAttribute('aria-pressed', on); pb.setAttribute('aria-label', on ? 'Resume the scrolling photos' : 'Pause the scrolling photos'); pb.classList.toggle('is-paused', on); });
  };
})();
