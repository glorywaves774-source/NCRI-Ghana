/* Laari's brain: matches a visitor's question to the FAQ list.
   Plain JavaScript with no dependencies, so the server uses it for the live chat
   and the static preview uses it in the browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LaariEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STOP = new Set(('a an the is are am was were be been being do does did can could would should will shall i me my we our you your ' +
    'it its to of in on at for from with and or but if so as by about how what when where who whom why which this that these those there here ' +
    'please tell more info information need want like get have has had not no yes any some also just may might').split(' '));

  /* common word forms and everyday words, mapped to one form so questions match however they are phrased */
  var SYN = { children: 'child', kids: 'child', kid: 'child', boys: 'boy', women: 'woman', ladies: 'woman', females: 'woman', men: 'man', youths: 'youth', young: 'youth', adolescents: 'youth',
    donating: 'donate', donation: 'donate', donations: 'donate', donor: 'donate', gift: 'donate', giving: 'donate', give: 'donate', contribute: 'donate', sponsor: 'donate', fund: 'donate', funding: 'donate',
    volunteering: 'volunteer', volunteers: 'volunteer', partnering: 'partner', partnership: 'partner', partnerships: 'partner', collaborate: 'partner', collaboration: 'partner',
    program: 'programme', programs: 'programme', programmes: 'programme', projects: 'programme', project: 'programme', activities: 'programme',
    farming: 'farm', farmers: 'farm', farmer: 'farm', agriculture: 'farm', crops: 'farm', food: 'farm',
    schooling: 'school', schools: 'school', education: 'school', classroom: 'school', teachers: 'school',
    sdgs: 'sdg', goals: 'goal', sustainable: 'sustain', sustainability: 'sustain',
    email: 'mail', emailing: 'mail', telephone: 'phone', call: 'phone', address: 'location', located: 'location', where: 'location',
    leaders: 'team', founder: 'team', director: 'team', chairperson: 'team', complain: 'complaint', complaints: 'complaint', complaining: 'complaint',
    ngo: 'organisation', organization: 'organisation', charity: 'organisation', nonprofit: 'organisation',
    translate: 'language', translation: 'language', languages: 'language', twi: 'language', french: 'language',
    safeguarding: 'protection', protect: 'protection', protecting: 'protection', abuse: 'protection',
    sanitation: 'wash', hygiene: 'wash', water: 'wash', toilets: 'wash',
    trees: 'climate',
    jobs: 'employment', job: 'employment', skills: 'employment' };

  function stem(w) {
    if (SYN[w]) return SYN[w];
    if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
    return w;
  }
  function tokens(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(function (w) { return w && !STOP.has(w); }).map(stem).filter(function (w) { return w.length > 1 || /\d/.test(w); });
  }

  function buildIndex(faqs) {
    var docs = faqs.map(function (f) {
      var m = new Map();
      function add(list, wgt) { list.forEach(function (t) { if (!m.has(t) || m.get(t) < wgt) m.set(t, wgt); }); }
      add(tokens(f.answer), 0.25);
      add(tokens(f.question), 1);
      add(tokens(String(f.keywords || '').replace(/,/g, ' ')), 1.4);
      var qt = tokens(f.question);
      return { faq: f, w: m, q: qt.join(' '), qset: new Set(qt) };
    });
    var df = new Map();
    docs.forEach(function (d) { d.w.forEach(function (_, t) { df.set(t, (df.get(t) || 0) + 1); }); });
    var N = Math.max(docs.length, 1);
    function idf(t) { return Math.log(1 + N / (1 + (df.get(t) || 0))); }
    return { docs: docs, idf: idf, N: N };
  }

  function rank(index, question) {
    var q = tokens(question);
    if (!q.length) return [];
    var uniq = Array.from(new Set(q));
    var denom = 0;
    uniq.forEach(function (t) { denom += index.idf(t); });
    var qjoin = q.join(' ');
    /* words that appear nowhere in what I know (a place name, a product) mean the question is probably about something else */
    var unk = 0; uniq.forEach(function (t) { if (!index.docs.some(function (d) { return d.w.has(t); })) unk += index.idf(t); });
    var damp = uniq.length > 1 && denom && unk / denom > 0.4 ? 0.5 : 1;
    return index.docs.map(function (d) {
      var s = 0;
      uniq.forEach(function (t) { if (d.w.has(t)) s += d.w.get(t) * index.idf(t); });
      var score = denom ? s / denom : 0;
      if (qjoin && qjoin === d.q) score += 1;
      /* tie-breakers: the entry whose own question uses the visitor's words, and the more focused entry, rank higher */
      var inQ = 0; uniq.forEach(function (t) { if (d.qset.has(t)) inQ++; });
      score += 0.35 * inQ / uniq.length - 0.04 * Math.log(1 + d.w.size / 30) + (+d.faq.boost || 0);
      return { faq: d.faq, score: score * damp };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  var GREET = /^(hi|hello|hey|hiya|howdy|greetings|akwaaba|good\s*(morning|afternoon|evening)|yo)\b/i;
  var THANKS = /\b(thanks|thank\s*you|thx|medaase|ayekoo|appreciate)\b/i;
  var BYE = /^(bye|goodbye|see\s*you|good\s*night|cheers)\b/i;
  var HOWARE = /how\s*are\s*you/i;

  function answer(faqs, question, opts) {
    opts = opts || {};
    var text = String(question || '').trim().slice(0, 300);
    var out = { reply: '', link: null, suggestions: [], matched: null, score: 0, answered: false, kind: 'faq' };
    if (!text) { out.reply = 'Please type a question and I will do my best to help.'; out.kind = 'empty'; return out; }

    var suggestions = opts.suggestions && opts.suggestions.length ? opts.suggestions : faqs.slice(0, 4).map(function (f) { return f.question; });
    if (GREET.test(text) && text.split(/\s+/).length <= 4) {
      out.kind = 'smalltalk'; out.answered = true;
      out.reply = 'Akwaaba! I’m Laari, NCRI-Ghana’s virtual guide. Ask me about our work, how to give, volunteer or partner, or where to find something on this site.';
      out.suggestions = suggestions; return out;
    }
    if (HOWARE.test(text)) {
      out.kind = 'smalltalk'; out.answered = true;
      out.reply = 'I’m well, thank you for asking. How can I help you today?'; out.suggestions = suggestions; return out;
    }
    if (THANKS.test(text) && text.split(/\s+/).length <= 6) {
      out.kind = 'smalltalk'; out.answered = true;
      out.reply = 'You’re most welcome! Is there anything else you would like to know?'; out.suggestions = suggestions.slice(0, 3); return out;
    }
    if (BYE.test(text) && text.split(/\s+/).length <= 4) {
      out.kind = 'smalltalk'; out.answered = true;
      out.reply = 'Goodbye, and thank you for your interest in NCRI-Ghana. I’m here whenever you need me.'; return out;
    }

    var ranked = rank(buildIndex(faqs), text);
    var best = ranked[0];
    out.score = best ? best.score : 0;
    if (best && best.score >= 0.5) {
      out.reply = best.faq.answer; out.matched = best.faq.id || null; out.answered = true;
      if (best.faq.link) out.link = { url: best.faq.link, label: linkLabel(best.faq.link) };
      out.suggestions = ranked.slice(1, 4).filter(function (r) { return r.score > 0.2; }).map(function (r) { return r.faq.question; });
      if (!out.suggestions.length) out.suggestions = suggestions.filter(function (s) { return s !== best.faq.question; }).slice(0, 3);
      return out;
    }
    var near = ranked.filter(function (r) { return r.score >= 0.22; }).slice(0, 3);
    out.kind = 'fallback';
    if (near.length) {
      out.reply = 'I’m not completely sure I understood. Did you mean one of these?';
      out.suggestions = near.map(function (r) { return r.faq.question; });
    } else {
      out.reply = 'I don’t have an answer to that yet. You can send your question to the team through the Contact page and they will get back to you. In the meantime, here are some things I can help with:';
      out.suggestions = suggestions; out.link = { url: '/contact', label: 'Contact the team' };
    }
    return out;
  }

  function linkLabel(url) {
    var u = String(url).split('#')[0].replace(/\/+$/, '');
    var map = { '/about': 'Open About', '/programs': 'See our programmes', '/donate': 'Go to Donate', '/get-involved': 'Get involved', '/partnerships': 'See Partnerships',
      '/policies': 'Read our policies', '/resources': 'Browse resources', '/mel': 'See our results', '/news': 'Read the news', '/media': 'Watch live and videos', '/contact': 'Contact the team' };
    return map[u] || 'Open page';
  }

  return { answer: answer, rank: rank, buildIndex: buildIndex, tokens: tokens };
});
