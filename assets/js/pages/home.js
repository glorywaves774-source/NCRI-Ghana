(function () {
  'use strict';
  var $ = NCRI.$, $$ = NCRI.$$, esc = NCRI.esc, ic = NCRI.icon, S = NCRI.sections;


  /* choose the brightest picture of each pillar (measured on the small thumbnails); falls back to the featured one */
  function luminance(url) {
    return new Promise(function (res) {
      var i = new Image(); i.onload = function () { try { var c = document.createElement('canvas'); c.width = c.height = 16; var x = c.getContext('2d'); x.drawImage(i, 0, 0, 16, 16); var d = x.getImageData(0, 0, 16, 16).data, t = 0; for (var k = 0; k < d.length; k += 4) t += .2126 * d[k] + .7152 * d[k + 1] + .0722 * d[k + 2]; res(t / (d.length / 4)); } catch (e) { res(null); } };
      i.onerror = function () { res(null); }; i.src = url;
    });
  }
  function pickPhotos(gal, progs) {
    var withFile = gal.filter(function (g) { return g.file; });
    return Promise.all(withFile.map(function (g) { return luminance(NCRI.U(g.thumb || g.file)); })).then(function (lum) {
      withFile.forEach(function (g, k) { g._l = lum[k] == null ? (g.featured ? 150 : 100) : lum[k] + (lum[k] == null ? 0 : 0); });
      var used = {}, out = [];
      progs.forEach(function (p, pi) {
        var mine = withFile.filter(function (g) { return g.pillar === p.slug; }).sort(function (a, b) { return b._l - a._l; });
        if (mine.length) { used[mine[0].file] = 1; out.push({ ph: mine[0], pi: pi }); } else out.push({ ph: null, pi: pi });
      });
      out.forEach(function (o) {
        if (o.ph) return;
        var rest = withFile.filter(function (g) { return !used[g.file]; }).sort(function (a, b) { return b._l - a._l; })[0] || withFile[0] || { file: '', alt: '' };
        used[rest.file] = 1; o.ph = rest;
      });
      return out;
    });
  }

  function hero(picks, progs) {
    var host = $('#hero'), s = NCRI.settings;
    /* one slide per pillar (6): the intro sits on the first pillar's picture, the other five tell their pillar's story */
    var feat = picks;
    var slides = feat.map(function (it, i) {
      var ph = it.ph, pi = it.pi, p = progs[pi];
      var bg = ph.file ? 'background-image:url(\'' + esc(NCRI.U(ph.file)) + '\')' : 'background:linear-gradient(135deg,#0B5A3C,#04140D)';
      var inner;
      if (i === 0 || !p) {
        inner = '<span class="eyebrow">' + esc(s.hero_eyebrow || 'NCRI-Ghana') + '</span><h1>' + esc(s.hero_title || 'Building resilient communities for a sustainable future.') + '</h1><p>' + esc(s.hero_text || '') + '</p>' +
          '<div class="cta"><a class="btn primary" href="programs.html">Our programmes ' + ic('arrow', 'go') + '</a><a class="btn ghost" href="about.html">Learn more</a></div>';
      } else {
        inner = '<span class="eyebrow">Pillar ' + (pi + 1) + ' · ' + esc(p.name) + '</span><h2>' + esc(p.tagline) + '</h2><p>' + esc(p.summary) + '</p>' +
          '<div class="cta"><button class="btn primary" type="button" data-open="' + pi + '">Open the story ' + ic('arrow', 'go') + '</button><a class="btn ghost" href="donate.html">Support this work</a></div>';
      }
      return '<article class="slide' + (i === 0 ? ' on' : '') + '" data-photo="' + esc(NCRI.U(ph.file || '')) + '" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + feat.length + '"' + (i ? ' aria-hidden="true"' : '') + '><div class="photo" role="img" aria-label="' + esc(ph.alt || ph.caption || '') + '" style="' + bg + '"></div><div class="slide-inner"><div class="panel glass liquid">' + inner + '</div></div></article>';
    });
    host.setAttribute('role', 'region'); host.setAttribute('aria-roledescription', 'carousel'); host.setAttribute('aria-label', 'NCRI-Ghana programmes');
    host.innerHTML = '<div class="slides">' + slides.join('') + '</div>' + (s.registration_notice ? '<div class="notice">' + esc(s.registration_notice) + '</div>' : '') +
      '<div class="hero-ui"><div class="pill"><button class="arrow" id="prev" type="button" aria-label="Previous slide"><span style="transform:scaleX(-1);display:grid">' + ic('arrow') + '</span></button><div class="dots" id="dots"></div><button class="arrow" id="next" type="button" aria-label="Next slide">' + ic('arrow') + '</button><span class="count" id="count"></span></div></div>';
    var els = $$('.slide', host), dotsEl = $('#dots'), count = $('#count'), idx = 0, DUR = 7000, dots = [], tm = null;
    host.style.setProperty('--dur', DUR + 'ms');
    function go(n) {
      idx = (n + els.length) % els.length;
      els.forEach(function (e, k) { e.classList.toggle('on', k === idx); e.setAttribute('aria-hidden', k !== idx); });
      dots.forEach(function (d, k) { d.classList.remove('run'); d.classList.toggle('on', k === idx); d.setAttribute('aria-selected', k === idx); });
      void dotsEl.offsetWidth; clearTimeout(tm);
      if (!NCRI.reduce && els.length > 1) { dots[idx].classList.add('run'); tm = setTimeout(function () { if (!host.classList.contains('paused')) go(idx + 1); else tm = setTimeout(function () { go(idx + 1); }, 1500); }, DUR); }
      count.textContent = ('0' + (idx + 1)).slice(-2) + ' / ' + ('0' + els.length).slice(-2);
    }
    els.forEach(function (_, k) { var b = document.createElement('button'); b.className = 'dot'; b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Slide ' + (k + 1)); b.innerHTML = '<i></i>'; b.addEventListener('click', function () { host.classList.add('anim'); go(k); }); dotsEl.appendChild(b); dots.push(b); });
    $('#prev').addEventListener('click', function () { host.classList.add('anim'); go(idx - 1); });
    $('#next').addEventListener('click', function () { host.classList.add('anim'); go(idx + 1); });
    if (els.length < 2) $('.pill', host).hidden = true;
    ['mouseenter', 'focusin'].forEach(function (ev) { host.addEventListener(ev, function () { host.classList.add('paused'); }); });
    ['mouseleave', 'focusout'].forEach(function (ev) { host.addEventListener(ev, function () { host.classList.remove('paused'); }); });
    host.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { host.classList.add('anim'); go(idx - 1); } if (e.key === 'ArrowRight') { host.classList.add('anim'); go(idx + 1); } });
    var sx = null;
    host.addEventListener('pointerdown', function (e) { if (!e.target.closest('button,a')) sx = e.clientX; });
    host.addEventListener('pointerup', function (e) { if (sx === null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) { host.classList.add('anim'); go(idx + (dx < 0 ? 1 : -1)); } });
    $$('[data-open]', host).forEach(function (b) { b.addEventListener('click', function (e) { PillarViewer.open(progs, +b.dataset.open, e); }); });
    /* clear bubble magnifier over the current picture (not over the text panel or controls) */
    if (NCRI.lens) NCRI.lens(host, host, function () { var on = $('.slide.on', host); return on && on.dataset.photo; }, { size: 170, zoom: 2.1, avoid: '.panel,.hero-ui,.notice,button,a' });
    go(0); host.classList.add('anim');
  }

  NCRI.ready.then(function () { return Promise.all([NCRI.get('gallery'), NCRI.get('programs')]); }).then(function (r) {
    var gal = r[0], progs = r[1], s = NCRI.settings;
    pickPhotos(gal, progs).then(function (picks) { hero(picks, progs); }).catch(function () { hero(progs.map(function (p, pi) { return { ph: gal.filter(function (g) { return g.pillar === p.slug; })[0] || gal[pi] || { file: '' }, pi: pi }; }), progs); });
    $('#vision').textContent = s.vision || ''; $('#mission').textContent = s.mission || '';
    S.values($('#valuesHost'), { cards: false });
    S.pillars($('#pillarsHost'));
    $('#featTitle').textContent = 'Helping children learn, grow and thrive';
    $('#featText').textContent = 'NCRI-Ghana works with families, schools, community leaders and local institutions to protect children’s rights, expand opportunities for girls and build safe, supportive communities.';
    var focusAreas = [
      {title:'Keep Girls in School', text:'NCRI-Ghana promotes girls’ access to quality education by addressing barriers that prevent girls from enrolling, attending school regularly and completing their education. We work with families, schools, community leaders and other stakeholders to promote gender equality, reduce school dropout, support menstrual health and hygiene, and encourage girls to pursue their educational aspirations in a supportive environment.', icon:'school'},
      {title:'Strengthen Child Protection', text:'Every child deserves to grow up safe, respected and free from abuse, neglect, exploitation and harmful practices. NCRI-Ghana works to strengthen child protection through community awareness, child rights education, early identification and reporting of protection concerns, and collaboration with families, schools, traditional authorities and relevant institutions to promote the safety, dignity and well-being of every child.', icon:'shield'},
      {title:'Support Families and Communities', text:'Strong families and resilient communities are essential to children’s development and educational success. NCRI-Ghana supports community-driven initiatives that strengthen parenting, improve family well-being, promote women’s empowerment and expand livelihood opportunities. By working with caregivers, community leaders, local institutions and development partners, we help build supportive environments where children and young people can learn, grow and thrive.', icon:'people'},
      {title:'Create Safe and Inclusive Learning Environments', text:'Every learner should have the opportunity to learn in an environment that is safe, welcoming, accessible and inclusive. NCRI-Ghana promotes child-friendly schools and learning spaces that respect diversity, prevent discrimination and bullying, encourage participation and respond to the needs of vulnerable and underserved children. We work with educators, parents, school authorities and communities to foster dignity, equal opportunity, positive relationships and meaningful participation in education.', icon:'heart'}
    ];
    var focusHost = $('#featPoints');
    focusHost.innerHTML = focusAreas.map(function (f, i) { return '<button type="button" class="focus-card" data-focus-index="' + i + '" aria-haspopup="dialog"><span class="focus-card-number">0' + (i + 1) + '</span><span class="focus-card-copy"><strong>' + esc(f.title) + '</strong><span>Read how we make a difference</span></span><span class="focus-card-arrow" aria-hidden="true">↗</span></button>'; }).join('');
    var focusModal = $('#focusModal'), focusTitle = $('#focusModalTitle'), focusText = $('#focusModalText'), lastFocusTrigger = null;
    function closeFocusModal() { focusModal.hidden = true; document.body.classList.remove('focus-modal-open'); if (lastFocusTrigger) lastFocusTrigger.focus(); }
    focusHost.querySelectorAll('[data-focus-index]').forEach(function (btn) { btn.addEventListener('click', function () { var f = focusAreas[+btn.dataset.focusIndex]; lastFocusTrigger = btn; focusTitle.textContent = f.title; focusText.textContent = f.text; focusModal.hidden = false; document.body.classList.add('focus-modal-open'); var closeBtn = focusModal.querySelector('.focus-modal-close'); if (closeBtn) closeBtn.focus(); }); });
    focusModal.querySelectorAll('[data-focus-close]').forEach(function (el) { el.addEventListener('click', closeFocusModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !focusModal.hidden) closeFocusModal(); });
    S.impact($('#impactHost'), { chart: true }); $('#impactNote').textContent = s.impact_note || '';
    window.Ring3D($('#ringHost'), gal.map(function (g) { return { file: g.file, thumb: g.thumb, caption: g.caption }; }));
    S.sdgs($('#sdgHost'));
    S.newsSlider($('#newsHost'), 8);
    NCRI.fx();
  });

  /* live and video teaser */
  Promise.all([NCRI.get('live').catch(function () { return null; }), NCRI.get('videos').catch(function () { return []; })]).then(function (r) {
    var live = r[0], vids = r[1] || [], host = $('#liveStrip'); if (!host) return;
    var isLive = live && live.status === 'live';
    host.innerHTML = '<div class="live-strip glass tilt"><div class="th" aria-hidden="true"></div><div style="position:relative;z-index:1"><span class="tag">' + (isLive ? 'Live now' : 'Live &amp; videos') + '</span><h3 style="font-size:1.4rem;margin:6px 0">' + (isLive ? esc(live.title || 'We are live') : (vids.length ? 'Watch our latest videos' : 'Live broadcasts and videos')) + '</h3><p class="muted">' + (isLive ? 'Join the broadcast from NCRI-Ghana now.' : (vids.length ? esc(vids[0].title) : 'Follow NCRI-Ghana events as they happen and revisit the moments that matter.')) + '</p></div><a class="btn ' + (isLive ? 'primary' : 'green') + '" href="media.html">' + ic(isLive ? 'live' : 'play') + (isLive ? ' Watch live' : ' Open the media page') + '</a></div>';
    NCRI.fx(host);
  });
})();
