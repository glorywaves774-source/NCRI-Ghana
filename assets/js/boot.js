/* Runs first, in the page head: marks the page as script-enabled and applies the colour theme before first paint.
   The visitor's choice is kept in localStorage and a cookie; until they choose, the device setting is followed. */
(function () {
  var r = document.documentElement, t = null;
  r.classList.add('js');
  try { t = localStorage.getItem('ncri-theme'); } catch (e) { /* storage can be blocked; the cookie still works */ }
  if (t !== 'dark' && t !== 'light') { var m = /(?:^|;\s*)ncri-theme=(dark|light)/.exec(document.cookie || ''); t = m ? m[1] : null; }
  if (t) r.setAttribute('data-theme', t);
  var dark = t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  r.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
})();
