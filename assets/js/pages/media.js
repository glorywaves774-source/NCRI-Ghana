(function () {
  'use strict';
  var $ = NCRI.$, $$ = NCRI.$$, esc = NCRI.esc, ic = NCRI.icon, S = NCRI.sections;
  var lastSig = '';

  function iframe(src, title) {
    var f = document.createElement('iframe'); f.src = src; f.title = title || 'Video player'; f.loading = 'lazy';
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen'); f.setAttribute('allowfullscreen', ''); f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    return f;
  }
  function videoEl(src, poster) { var v = document.createElement('video'); v.controls = true; v.playsInline = true; v.preload = 'metadata'; if (poster) v.poster = NCRI.U(poster); v.src = NCRI.U(src); return v; }
  function embedNode(e, title, poster) {
    if (e.type === 'iframe') return iframe(e.src, title);
    var v = videoEl(e.type === 'hls' ? '' : e.src, poster); if (e.type === 'hls') { v.removeAttribute('src'); S.hls(v, e.src); }
    return v;
  }

  function renderLive(l) {
    var sig = JSON.stringify([l.status, l.ready, l.embed && l.embed.src, l.title, l.start, l.description]);
    if (sig === lastSig) return; lastSig = sig;
    var host = $('#livePlayer'), pill = $('#livePill');
    $('#liveTitle').textContent = l.title || 'NCRI-Ghana live'; $('#liveDesc').textContent = l.description || '';
    pill.className = 'status-pill ' + (l.status === 'live' ? 'live' : l.status === 'scheduled' ? 'scheduled' : '');
    pill.innerHTML = '<i></i>' + (l.status === 'live' ? 'Live now' : l.status === 'scheduled' ? 'Scheduled' : 'Offline');
    host.innerHTML = '';
    if (l.status === 'live' && l.ready) { host.appendChild(embedNode(l.embed, l.title)); return; }
    var msg = l.status === 'live' ? 'We are live. The stream is being connected, please refresh in a moment.'
      : l.status === 'scheduled' && l.start ? 'Our next broadcast is planned for ' + l.start + '. Come back then to watch live.'
      : 'We are not broadcasting right now. Our videos below are available any time.';
    var d = document.createElement('div'); d.className = 'off';
    d.innerHTML = '<span class="status-pill ' + (l.status === 'scheduled' ? 'scheduled' : '') + '"><i></i>' + (l.status === 'live' ? 'Connecting' : l.status === 'scheduled' ? 'Coming up' : 'Between broadcasts') + '</span><h3>' + esc(l.title || 'NCRI-Ghana live') + '</h3><p>' + esc(msg) + '</p>';
    host.appendChild(d);
  }
  function pollLive() { NCRI.api.get('live').then(renderLive).catch(function () {}); }

  function ytThumb(src) { var m = /embed\/([\w-]{6,})/.exec(src || ''); return m && m[1] !== 'live_stream' ? 'https://i.ytimg.com/vi/' + m[1] + '/hqdefault.jpg' : ''; }
  function openVideo(v) {
    var m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', v.title);
    m.innerHTML = '<div class="box" style="width:min(1000px,100%);padding:14px;gap:12px"><div style="display:flex;align-items:center;gap:12px"><h3 style="margin:0 0 0 6px;flex:1">' + esc(v.title) + '</h3><button class="icon-btn" type="button" id="vx" aria-label="Close video">' + ic('x') + '</button></div><div class="player" style="border-radius:18px"></div>' + (v.description ? '<p class="muted" style="padding:0 6px 6px">' + esc(v.description) + '</p>' : '') + '</div>';
    var prev = document.activeElement; document.body.appendChild(m);
    var node = embedNode(v.embed, v.title, v.poster); $('.player', m).appendChild(node); if (node.tagName === 'VIDEO') node.play().catch(function () {});
    function close() { m.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key); m.addEventListener('click', function (e) { if (e.target === m) close(); }); $('#vx', m).addEventListener('click', close); $('#vx', m).focus();
  }
  function videos() {
    return NCRI.get('videos').then(function (list) {
      $('#vHost').innerHTML = list.length ? '<div class="vgrid">' + list.map(function (v, i) {
        var th = v.poster ? '<img src="' + esc(NCRI.U(v.poster)) + '" alt="" loading="lazy">' : (ytThumb(v.embed.src) ? '<img src="' + esc(ytThumb(v.embed.src)) + '" alt="" loading="lazy">' : (v.embed.type === 'file' ? '<video src="' + esc(NCRI.U(v.embed.src)) + '#t=0.8" preload="metadata" muted playsinline></video>' : ''));
        return '<div class="rv" style="--dl:' + ((i % 3) * .07) + 's"><button class="glass vid tilt" type="button" data-i="' + i + '" aria-label="Play video: ' + esc(v.title) + '"><div class="th">' + th + '<div class="play"><span>' + ic('play') + '</span></div></div><div class="tx"><h3>' + esc(v.title) + '</h3>' + (v.description ? '<p>' + esc(v.description) + '</p>' : '') + '</div></button></div>';
      }).join('') + '</div>' : '<div class="empty glass">' + ic('play') + '<p>Videos will appear here once they are added.</p></div>';
      $$('.vid', $('#vHost')).forEach(function (b) { b.addEventListener('click', function () { openVideo(list[+b.dataset.i]); }); });
      NCRI.fx($('#vHost'));
    }).catch(function () { S.err($('#vHost')); });
  }

  NCRI.ready.then(function () {
    $('#mediaIntro').textContent = NCRI.settings.media_intro || '';
    return NCRI.get('live').then(renderLive).catch(function () { renderLive({ status: 'offline', ready: false }); });
  }).then(function () { videos(); if (!NCRI.demo) setInterval(pollLive, 30000); });
})();
