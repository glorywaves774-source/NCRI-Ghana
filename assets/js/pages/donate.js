(function () {
  'use strict';
  var $ = NCRI.$, $$ = NCRI.$$, esc = NCRI.esc, ic = NCRI.icon;
  var ROUTES = [
    { k: 'ghana', t: 'Local Partners / Ghana', d: 'Give within Ghana by mobile money, bank transfer, in kind, or through a local partner.', cur: ['GHS'] },
    { k: 'international', t: 'International', d: 'Support from abroad by bank transfer, or as a foundation, institution or company.', cur: ['USD', 'EUR', 'GBP'] },
    { k: 'online', t: 'Online', d: 'Pay securely online by card or mobile money, with an instant receipt.', cur: ['GHS', 'USD', 'EUR', 'GBP'] }
  ];
  var cfg, channels = [], route = 'ghana', currency = 'GHS', amount = 0;
  function money(a, c) { try { return new Intl.NumberFormat('en', { style: 'currency', currency: c }).format(a); } catch (e) { return c + ' ' + a; } }
  function amountsFor(c) { return (c === 'GHS' ? cfg.amounts.GHS : cfg.amounts.USD) || []; }
  function gatewayFor(c) { return c === 'GHS' ? cfg.gateways.paystack : cfg.gateways.stripe; }
  function chanHtml(list) {
    return list.length ? list.map(function (c) { return '<div class="glass chan"><h4>' + esc(c.title) + '</h4><p>' + esc(c.details) + '</p>' + (c.link ? '<a class="link-more" href="' + esc(NCRI.U(c.link).replace(/^(about|programs|donate|get-involved|partnerships|policies|resources|mel|news|media|contact)$/, '$1.html')) + '">Find out more ' + ic('arrow') + '</a>' : '') + '</div>'; }).join('') : '<div class="empty glass">' + ic('heart') + '<p>Giving options for this route will be listed here soon.</p></div>';
  }

  function drawTabs() {
    $('#dtabs').innerHTML = ROUTES.map(function (r) { return '<button class="glass dtab tilt" type="button" role="tab" data-k="' + r.k + '" aria-selected="' + (r.k === route) + '"><h3>' + esc(r.t) + '</h3><p>' + esc(r.d) + '</p></button>'; }).join('');
    $$('.dtab').forEach(function (b) { b.addEventListener('click', function () { route = b.dataset.k; currency = ROUTES.filter(function (r) { return r.k === route; })[0].cur[0]; amount = 0; draw(); }); });
  }

  function draw() {
    drawTabs();
    var R = ROUTES.filter(function (r) { return r.k === route; })[0], list = channels.filter(function (c) { return c.route === route; });
    var online = route === 'online', gw = online && gatewayFor(currency);
    var amts = amountsFor(currency);
    $('#dview').innerHTML = '<div class="two"><div style="display:grid;gap:14px"><h2 class="h2" style="font-size:1.6rem">' + (online ? 'Give online' : 'How to give: ' + esc(R.t)) + '</h2>' +
      (online ? (gw ? '<div class="warn">You will be taken to our secure payment partner to finish your gift. NCRI-Ghana never sees or stores your card details.</div>' : '<div class="warn">Online checkout has not been switched on yet. You can still record your pledge below, and our team will follow up with a payment link or other options.</div>') : '') +
      chanHtml(online ? list : list) + '</div>' +
      '<form class="glass fm" id="dform" novalidate><h3>' + (online ? 'Your gift' : 'Tell us about your gift') + '</h3>' +
      '<div class="fld"><span class="check" style="font-weight:600">Amount</span><div class="amounts" id="amts">' + amts.map(function (a) { return '<button class="amt" type="button" aria-pressed="' + (a === amount) + '" data-a="' + a + '">' + money(a, currency).replace(/\.00$/, '') + '</button>'; }).join('') + '</div></div>' +
      '<div class="row2"><div class="fld"><label for="d-amt">Other amount</label><input id="d-amt" name="amount" type="number" min="1" step="0.01" inputmode="decimal" value="' + (amount || '') + '" placeholder="e.g. 75"></div>' +
      '<div class="fld"><label for="d-cur">Currency</label><select id="d-cur" name="currency"' + (R.cur.length === 1 ? ' disabled' : '') + '>' + R.cur.map(function (c) { return '<option' + (c === currency ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div></div>' +
      (!online ? '<div class="fld"><label for="d-method">How will you give?</label><select id="d-method" name="method">' + list.map(function (c) { return '<option>' + esc(c.title) + '</option>'; }).join('') + '<option>Other</option></select></div>' : '') +
      '<div class="row2"><div class="fld"><label for="d-name">Your name</label><input id="d-name" name="name" autocomplete="name" required></div><div class="fld"><label for="d-email">Email address' + (route === 'ghana' ? ' (or phone)' : '') + '</label><input id="d-email" name="email" type="email" autocomplete="email"' + (route !== 'ghana' ? ' required' : '') + '></div></div>' +
      '<div class="fld"><label for="d-phone">Phone (optional)</label><input id="d-phone" name="phone" type="tel" autocomplete="tel"></div>' +
      '<div class="fld"><label for="d-msg">Message (optional)</label><textarea id="d-msg" name="message" style="min-height:80px"></textarea></div>' +
      '<label class="check"><input type="checkbox" name="anonymous"> Please keep my gift anonymous in any public thanks</label>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="status" role="status" aria-live="polite"></div><button class="btn primary" type="submit" style="justify-self:start">' + ic('heart') + (online ? (gw ? ' Continue to secure payment' : ' Record my pledge') : ' Record my gift and get a reference') + '</button>' +
      '<p class="muted" style="font-size:.85rem;position:relative;z-index:1">' + (online ? '' : 'Recording a gift here does not move any money. It gives you a reference number to quote when you pay, so we can match your payment.') + '</p></form></div>';
    $$('#amts .amt').forEach(function (b) { b.addEventListener('click', function () { amount = +b.dataset.a; $('#d-amt').value = amount; $$('#amts .amt').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }); });
    $('#d-amt').addEventListener('input', function (e) { amount = parseFloat(e.target.value) || 0; $$('#amts .amt').forEach(function (x) { x.setAttribute('aria-pressed', +x.dataset.a === amount); }); });
    $('#d-cur').addEventListener('change', function (e) { currency = e.target.value; draw(); });
    $('#dform').addEventListener('submit', submit);
    NCRI.fx($('#dview'));
  }

  function submit(e) {
    e.preventDefault();
    var f = e.target, st = $('.status', f), btn = $('button[type=submit]', f);
    var d = { route: route, currency: currency, amount: parseFloat($('#d-amt').value), name: f.name.value, email: f.email.value, phone: f.phone.value, message: f.message.value, anonymous: f.anonymous.checked, website: f.website.value, method: f.method ? f.method.value : 'Online' };
    if (!(d.amount >= 1)) { st.className = 'status err'; st.textContent = 'Please choose or type an amount.'; return; }
    st.className = 'status'; st.textContent = 'Working…'; btn.disabled = true;
    NCRI.api.post('donate', d).then(function (j) {
      if (j.checkoutUrl) { st.className = 'status ok'; st.textContent = 'Taking you to the secure payment page…'; location.assign(j.checkoutUrl); return; }
      result(j);
    }).catch(function (er) { st.className = 'status err'; st.textContent = er.message; btn.disabled = false; });
  }

  function result(j) {
    var online = j.route === 'online';
    $('#dtabs').innerHTML = '';
    $('#dview').innerHTML = '<div class="glass refbox"><span class="mark" style="--c:var(--leaf)">' + ic('check') + '</span><h2 class="h2" style="font-size:1.7rem">Thank you</h2><p class="muted" style="max-width:52ch">' + esc(j.thanks || cfg.thanks) + '</p>' +
      '<p>Your reference number</p><div class="code" id="refcode">' + esc(j.ref) + '</div><p><b>' + money(j.amount, j.currency) + '</b> · ' + (online ? 'pledge recorded' : 'gift recorded') + '</p>' +
      '<p class="muted" style="max-width:56ch">' + (online ? 'Online payment is not switched on yet, so no money has been taken. Our team will contact you with a payment link or other ways to give. Please keep this reference.' : 'Please quote this reference in your payment note so we can match your gift. No money has been taken by this website.') + '</p>' +
      '<div class="cta"><button class="btn line" type="button" id="copyref">Copy reference</button><button class="btn green" type="button" id="again">Give again</button></div></div>' +
      (!online ? '<h3 style="margin:30px 0 14px">Where to send your gift</h3><div class="grid g3">' + chanHtml(j.channels || []) + '</div>' : '');
    $('#copyref').addEventListener('click', function () { if (navigator.clipboard) navigator.clipboard.writeText(j.ref).then(function () { $('#copyref').textContent = 'Copied'; }); });
    $('#again').addEventListener('click', function () { route = 'ghana'; currency = 'GHS'; amount = 0; draw(); window.scrollTo({ top: 0 }); });
    $('#dview').scrollIntoView({ behavior: NCRI.reduce ? 'auto' : 'smooth', block: 'start' });
    NCRI.fx($('#dview'));
  }

  function returned(ref) {
    $('#dtabs').innerHTML = '';
    $('#dview').innerHTML = '<div class="glass refbox"><h2 class="h2" style="font-size:1.6rem">Checking your payment…</h2><p class="muted">Reference ' + esc(ref) + '</p></div>';
    var tries = 0;
    (function poll() {
      NCRI.api.get('donate/status/' + encodeURIComponent(ref)).then(function (s) {
        if (s.status === 'pending' && ++tries < 5) { setTimeout(poll, 2500); return; }
        var ok = s.status === 'paid', bad = s.status === 'failed' || s.status === 'cancelled';
        $('#dview').innerHTML = '<div class="glass refbox"><span class="mark" style="--c:' + (ok ? 'var(--leaf)' : 'var(--orange)') + '">' + ic(ok ? 'check' : 'heart') + '</span><h2 class="h2" style="font-size:1.7rem">' + (ok ? 'Thank you, your gift was received' : bad ? 'The payment was not completed' : 'We are still confirming your payment') + '</h2>' +
          '<p class="muted" style="max-width:52ch">' + (ok ? esc(cfg.thanks) : bad ? 'No money was taken, or it will be returned by your bank. You are welcome to try again.' : 'This can take a few minutes. Your reference is below; you do not need to pay again.') + '</p><div class="code">' + esc(ref) + '</div><div class="cta"><a class="btn green" href="donate.html">' + (ok ? 'Give again' : 'Back to giving') + '</a><a class="btn line" href="index.html">Return home</a></div></div>';
      }).catch(function () { $('#dview').innerHTML = '<div class="empty glass"><p>We could not check that reference. Please contact us and quote ' + esc(ref) + '.</p></div>'; });
    })();
  }

  NCRI.ready.then(function () { return Promise.all([NCRI.get('donate/config'), NCRI.get('donate/channels')]); }).then(function (r) {
    cfg = r[0]; channels = r[1];
    $('#dIntro').textContent = cfg.intro || ''; $('#dNotice').textContent = cfg.notice || ''; $('#dNoticeBox').hidden = !cfg.notice;
    if (!cfg.enabled) { $('#dtabs').innerHTML = ''; $('#dview').innerHTML = '<div class="empty glass">' + ic('heart') + '<p>Online giving is not open yet. Please contact us to support our work.</p><a class="btn green" href="contact.html">Contact us</a></div>'; return; }
    var ref = new URLSearchParams(location.search).get('ref');
    if (ref) returned(ref); else draw();
  }).catch(function () { $('#dview').innerHTML = '<div class="empty glass"><p>The giving page could not be loaded. Please try again shortly.</p></div>'; });
})();
