
/* UN Sustainable Development Goals: which goals our six pillars contribute to. Goal names are the UN's; tiles are our own design, not UN icons. */
(function () {
  'use strict';
  var S = NCRI.sections, esc = NCRI.esc;
  var GOALS = {
    1: ['No Poverty', '#E5243B'], 2: ['Zero Hunger', '#DDA63A'], 3: ['Good Health and Well-being', '#4C9F38'], 4: ['Quality Education', '#C5192D'],
    5: ['Gender Equality', '#FF3A21'], 6: ['Clean Water and Sanitation', '#26BDE2'], 7: ['Affordable and Clean Energy', '#FCC30B'], 8: ['Decent Work and Economic Growth', '#A21942'],
    9: ['Industry, Innovation and Infrastructure', '#FD6925'], 10: ['Reduced Inequalities', '#DD1367'], 11: ['Sustainable Cities and Communities', '#FD9D24'], 12: ['Responsible Consumption and Production', '#BF8B2E'],
    13: ['Climate Action', '#3F7E44'], 14: ['Life Below Water', '#0A97D9'], 15: ['Life on Land', '#56C02B'], 16: ['Peace, Justice and Strong Institutions', '#00689D'], 17: ['Partnerships for the Goals', '#19486A']
  };
  /* tier: core = a programme pillar is built around it; support = our work contributes along the way */
  var FOCUS = {
    4: { tier: 'core', pillars: ['child-protection-education', 'youth-development'], how: 'Keeping children safe, enrolled and learning, and giving young people practical skills, mentoring and pathways into work.' },
    5: { tier: 'core', pillars: ['women-girls-empowerment', 'child-protection-education'], how: 'Savings groups, skills, leadership and safety so women and girls can earn, speak and lead, and so more girls stay in school.' },
    2: { tier: 'core', pillars: ['agriculture-food-security'], how: 'Climate-smart farming, better markets and dry-season water for stronger harvests, food security and household incomes.' },
    6: { tier: 'core', pillars: ['water-sanitation-hygiene'], how: 'Community-led action for safe drinking water, inclusive sanitation and practical hygiene education.' },
    8: { tier: 'core', pillars: ['youth-development', 'agriculture-food-security', 'women-girls-empowerment'], how: 'Skills, mentoring, savings and farm-based livelihoods that lead to decent work and rising incomes close to home.' },
    13: { tier: 'core', pillars: ['climate-governance-resilience', 'agriculture-food-security'], how: 'Preparedness, tree planting and climate-smart farming that help communities adapt to a changing climate.' },
    16: { tier: 'core', pillars: ['child-protection-education', 'climate-governance-resilience'], how: 'Protecting children from abuse and exploitation, and building accountable local governance that communities help shape.' },
    1: { tier: 'support', pillars: ['agriculture-food-security', 'women-girls-empowerment'], how: 'Higher incomes and savings reduce poverty for the households we work with.' },
    10: { tier: 'support', pillars: ['women-girls-empowerment', 'child-protection-education'], how: 'Inclusion is built into our work: girls, women, young people and vulnerable households are who we serve first.' },
    17: { tier: 'support', pillars: ['climate-governance-resilience'], how: 'We work with communities, traditional leaders, schools and local institutions, and welcome new partners.' }
  };
  var ORDER_CORE = [4, 5, 2, 6, 8, 13, 16];
  /* text colour for a tile: whichever of dark or white has the higher contrast with the goal's colour */
  function ink(hex) {
    var n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], white = 1.05 / (L + 0.05), dark = (L + 0.05) / 0.0612;
    return dark > white ? '#1B1B1B' : '#FFFFFF';
  }

  S.sdgs = function (host) {
    return NCRI.get('programs').then(function (programs) {
      var bySlug = {}; programs.forEach(function (p, i) { bySlug[p.slug] = { p: p, i: i }; });
      var core = ORDER_CORE.map(function (n) { return n; });
      var support = [1, 10, 17], others = Object.keys(GOALS).map(Number).filter(function (n) { return !FOCUS[n]; });
      function tile(n, big) {
        var g = GOALS[n], f = FOCUS[n];
        return '<button type="button" class="sdg sdg-' + f.tier + (big ? ' sdg-' + big : '') + '" data-n="' + n + '" style="--c:' + g[1] + ';--ink:' + ink(g[1]) + '" aria-pressed="false" aria-controls="sdgDetail">' +
          '<span class="sdg-n">' + n + '</span><span class="sdg-body"><span class="sdg-t">' + esc(g[0]) + '</span><span class="sdg-x2">' + esc(f.how) + '</span></span>' + (f.tier === 'core' ? '<span class="sdg-tag">Focus area</span>' : '<span class="sdg-tag">Contributing</span>') + '</button>';
      }
      var sizes = { 4: 'w', 5: 'x', 8: 'w' };
      host.innerHTML = '<div class="sdg-bento">' + core.map(function (n) { return '<div class="rv sdg-cell sdg-cell-' + (sizes[n] || 's') + '">' + tile(n, sizes[n]) + '</div>'; }).join('') + '</div>' +
        '<div class="sdg-row"><span class="sdg-label">Also contributing</span><div class="sdg-support">' + support.map(function (n) { return '<div class="rv">' + tile(n) + '</div>'; }).join('') + '</div></div>' +
        '<div id="sdgDetail" class="glass sdg-detail" aria-live="polite"></div>' +
        '<div class="sdg-row"><span class="sdg-label">Other goals (not a current focus)</span><ul class="sdg-others">' + others.map(function (n) { return '<li style="--c:' + GOALS[n][1] + '" title="' + esc(GOALS[n][0]) + '"><b>' + n + '</b><span>' + esc(GOALS[n][0]) + '</span></li>'; }).join('') + '</ul></div>' +
        '<p class="sdg-note">The Sustainable Development Goals are the United Nations’ shared agenda for 2030 (<a href="https://sdgs.un.org/goals" target="_blank" rel="noopener">sdgs.un.org/goals</a>). Goal names are quoted from the UN. These tiles are our own design, not UN icons, and do not imply UN endorsement. NCRI-Ghana’s work is mapped to goals by programme area; verified results are on the <a href="mel.html">Impact page</a>.</p>';
      var detail = host.querySelector('#sdgDetail'), tiles = [].slice.call(host.querySelectorAll('.sdg'));
      function show(n, focus) {
        var g = GOALS[n], f = FOCUS[n];
        tiles.forEach(function (t) { t.setAttribute('aria-pressed', +t.dataset.n === n); });
        detail.style.setProperty('--c', g[1]);
        detail.innerHTML = '<div class="sdg-d-h"><span class="sdg-d-n" style="background:' + g[1] + ';color:' + ink(g[1]) + '">' + n + '</span><div><span class="eyebrow">' + (f.tier === 'core' ? 'Focus area' : 'Contributing goal') + '</span><h3>' + esc(g[0]) + '</h3></div></div><p>' + esc(f.how) + '</p>' +
          '<div class="sdg-pills"><span>Programme pillars</span>' + f.pillars.filter(function (s) { return bySlug[s]; }).map(function (s) { var o = bySlug[s]; return '<button type="button" class="sdg-pill" data-i="' + o.i + '" style="--c:' + esc(o.p.color) + '"><i></i>' + esc(o.p.name) + '</button>'; }).join('') + '</div>';
        [].forEach.call(detail.querySelectorAll('.sdg-pill'), function (b) { b.addEventListener('click', function (e) { PillarViewer.open(programs, +b.dataset.i, e); }); });
      }
      tiles.forEach(function (t) { t.addEventListener('click', function () { show(+t.dataset.n); }); });
      show(core[0]);
      NCRI.fx(host);
    }).catch(function () { S.err(host); });
  };
})();
