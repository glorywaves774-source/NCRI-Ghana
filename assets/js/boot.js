/* Runs first, in the page head: marks the page as script-enabled and applies the saved colour theme before first paint. */
(function () {
  var r = document.documentElement;
  r.classList.add('js');
  try { var t = localStorage.getItem('ncri-theme'); if (t === 'dark' || t === 'light') r.setAttribute('data-theme', t); } catch (e) { /* storage can be blocked; the site still works */ }
})();
