/* Language menu powered by Google Translate. Translation is done in the visitor's browser by Google; nothing is stored on our server. */
(function () {
  'use strict';
  var $ = NCRI.$, ic = NCRI.icon, esc = NCRI.esc;
  var LANGS = [['en', 'English'], ['fr', 'Français'], ['ak', 'Twi (Akan)'], ['ee', 'Eʋegbe (Ewe)'], ['gaa', 'Ga'], ['ha', 'Hausa'], ['ar', 'العربية'], ['es', 'Español'], ['pt', 'Português'], ['de', 'Deutsch'], ['zh-CN', '中文'], ['sw', 'Kiswahili']];
  var INCLUDED = LANGS.map(function (l) { return l[0]; }).join(',');

  function cookieLang() { var m = /(?:^|;\s*)googtrans=\/[^/]*\/([\w-]+)/.exec(document.cookie); return m ? m[1] : ''; }
  function saved() { try { return localStorage.getItem('ncri-lang') || ''; } catch (e) { return ''; } }
  function remember(c) { try { localStorage.setItem('ncri-lang', c); } catch (e) { /* ignore */ } }
  function setCookie(v, days) {
    var exp = days ? '; max-age=' + days * 86400 : '; max-age=0';
    document.cookie = 'googtrans=' + v + '; path=/' + exp + '; SameSite=Lax';
    var host = location.hostname; if (host.indexOf('.') > 0) document.cookie = 'googtrans=' + v + '; path=/; domain=' + host + exp + '; SameSite=Lax';
  }
  var cur = cookieLang() || saved() || 'en';
  if (!LANGS.some(function (l) { return l[0] === cur; })) cur = 'en';

  function loadGoogle() {
    if (document.getElementById('gt-script')) return;
    var holder = document.createElement('div'); holder.id = 'google_translate_element'; holder.className = 'gt-holder'; document.body.appendChild(holder);
    window.ncriTranslateInit = function () {
      try { new window.google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: INCLUDED, autoDisplay: false }, 'google_translate_element'); } catch (e) { /* offline or blocked */ }
    };
    var s = document.createElement('script'); s.id = 'gt-script'; s.src = 'https://translate.google.com/translate_a/element.js?cb=ncriTranslateInit'; s.async = true; document.head.appendChild(s);
  }

  function choose(code) {
    remember(code);
    if (code === 'en') setCookie('/en/en', 0); else setCookie('/en/' + code, 365);
    location.reload();
  }

  function build() {
    var theme = $('#theme'); if (!theme) return;
    var wrap = document.createElement('div'); wrap.className = 'lang notranslate'; wrap.setAttribute('translate', 'no');
    var name = (LANGS.filter(function (l) { return l[0] === cur; })[0] || LANGS[0])[1];
    wrap.innerHTML = '<button class="icon-btn langbtn" id="lang" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="langmenu" aria-label="Language: ' + esc(name) + '. Change language">' + ic('globe') + '</button>' +
      '<div class="langmenu glass liquid" id="langmenu" role="menu" hidden><p class="lh">Translate this site</p>' + LANGS.map(function (l) {
        return '<button type="button" role="menuitemradio" aria-checked="' + (l[0] === cur) + '" data-l="' + l[0] + '"' + (l[0] === 'ar' ? ' lang="ar"' : '') + '>' + esc(l[1]) + '</button>';
      }).join('') + '<p class="ln">Translated automatically by Google Translate. Some wording may be inaccurate.</p></div>';
    theme.parentNode.insertBefore(wrap, theme);
    var btn = $('#lang'), menu = $('#langmenu');
    function open(o) { menu.hidden = !o; btn.setAttribute('aria-expanded', o); if (o) { var c = menu.querySelector('[aria-checked="true"]'); if (c) c.focus(); } }
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(menu.hidden); });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) open(false); });
    wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape') { open(false); btn.focus(); } });
    menu.addEventListener('click', function (e) { var b = e.target.closest('[data-l]'); if (b) { if (b.dataset.l === cur) { open(false); return; } choose(b.dataset.l); } });
  }
  build();
  if (cur !== 'en') { document.documentElement.classList.add('translated'); loadGoogle(); }
})();
