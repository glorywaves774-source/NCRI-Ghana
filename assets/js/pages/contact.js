(function () {
  'use strict';
  var $ = NCRI.$, esc = NCRI.esc, ic = NCRI.icon, S = NCRI.sections;
  NCRI.ready.then(function () {
    var s = NCRI.settings;
    $('#cIntro').textContent = s.contact_intro || '';
    var rows = [['pin', 'Head office', esc(s.contact_address || 'Saboba, Northern Region, Ghana')]];
    if (s.contact_email) rows.push(['mail', 'Email', '<a href="mailto:' + esc(s.contact_email) + '">' + esc(s.contact_email) + '</a>']);
    if (s.contact_phone) rows.push(['phone', 'Phone', esc(s.contact_phone)]);
    if (s.contact_hours) rows.push(['file', 'Office hours', esc(s.contact_hours)]);
    if (!s.contact_email && !s.contact_phone) rows.push(['mail', 'Official contact channels', esc(s.contact_pending || 'Contact details will be published after they are verified.')]);
    var links = NCRI.socialLinks('soc');
    rows.push(['globe', 'Follow us', links ? '<span class="socrow">' + links + '</span>' : esc('Our official Facebook, Instagram and LinkedIn pages will be linked here once they are verified.')]);
    $('#facts').innerHTML = rows.map(function (r) { return '<div style="display:flex;gap:14px"><span class="mark" style="--c:var(--green);--on:#fff;flex:none;width:42px;height:42px;border-radius:13px">' + ic(r[0]) + '</span><div><b>' + r[1] + '</b><span>' + r[2] + '</span></div></div>'; }).join('');
    var kind = new URLSearchParams(location.search).get('kind');
    if (kind && $('#c-kind option[value="' + kind + '"]')) $('#c-kind').value = kind;
    NCRI.bindForm($('#cForm'), 'contact');
    S.faq($('#cFaq')); NCRI.fx();
  });
})();
