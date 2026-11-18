// Drug Drill 药箱 — drug monograph practice for BC paramedics. One file, no dependencies.
// Three decks: emalb (licensing exam), bcehs (on the road), home (patients' own medicines).
// Progress lives in localStorage under 'drugdrill1'.
(() => {
  'use strict';
  const LS = 'drugdrill1', IV = [0, 1, 3, 7, 14, 30], ROUND = 10, GOAL = 20;
  const DECK_ORDER = ['emalb', 'bcehs', 'home'];
  const DK = {
    emalb: { en: 'Exam drugs', zh: '考试药', sub: { en: 'EMALB licensing exam monographs', zh: 'EMALB 执照考试的药物专论' }, tag: { en: 'Exam', zh: '考试' }, ico: 'cap' },
    bcehs: { en: 'On the road', zh: '出车药', sub: { en: 'BCEHS drug monographs', zh: 'BCEHS 药物专论' }, tag: { en: 'BCEHS', zh: '出车' }, ico: 'siren' },
    home: { en: "Patients' medicines", zh: '病人的药', sub: { en: 'What the pill bottles tell you', zh: '药瓶告诉你什么' }, tag: { en: 'Home meds', zh: '家用药' }, ico: 'bottle' },
  };
  const GROUPS = {
    heart: ['Heart and blood pressure', '心脏与血压'], blood: ['Blood thinners', '抗栓药'], diabetes: ['Diabetes', '糖尿病'], lungs: ['Lungs', '肺'],
    mind: ['Mental health', '精神心理'], neuro: ['Brain and nerves', '脑与神经'], pain: ['Pain and opioids', '疼痛与阿片'], other: ['Hormones and others', '激素与其他'],
  };
  // drugs that share a family are never used as each other's wrong answers
  const FAM = {
    acetaminophen: ['pain'], ibuprofen: ['pain'], ketorolac: ['pain'], entonox: ['pain', 'cardiac'], methoxyflurane: ['pain'], ketamine: ['pain'], morphine: ['pain'],
    hydromorphone: ['pain'], lidocaine: ['pain'], aspirin: ['antiplatelet', 'pain', 'cardiac'], d10w: ['sugar'], glucagon: ['sugar'], 'oral-glucose': ['sugar'],
    dexamethasone: ['steroid', 'airway'], hydrocortisone: ['steroid'], dimenhydrinate: ['nausea', 'antihistamine', 'cardiac'], ondansetron: ['nausea'],
    diphenhydramine: ['allergy', 'antihistamine'], epinephrine: ['allergy', 'airway', 'sympathomimetic'], salbutamol: ['airway', 'sympathomimetic', 'allergy'],
    ipratropium: ['airway'], naloxone: ['antidote'], nitroglycerin: ['cardiac'], 'tranexamic-acid': ['bleeding'],
  };
  // home cards in different groups that still overlap (a shared name ending, or a drug that belongs to both classes)
  const HFAM = {
    'oral-steroids': ['steroid', 'immuno'], 'inhaled-steroids': ['steroid'], immunosuppressants: ['immuno'],
    'nsaids-home': ['nsaid'], antiplatelets: ['nsaid'], benzodiazepines: ['seizure'], antiepileptics: ['seizure'],
    ppis: ['prazole'], antipsychotics: ['prazole', 'idone'], 'thiazide-diuretics': ['idone'],
  };
  const I = {
    cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/></svg>',
    siren: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18v-5a6 6 0 0112 0v5"/><path d="M4 21h16v-3H4z"/><path d="M12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4"/></svg>',
    bottle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M7 6h10l1 3v11a2 2 0 01-2 2H8a2 2 0 01-2-2V9z"/><path d="M6 12h12M6 17h12"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l1 12a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M9 8V6a3 3 0 016 0v2"/><path d="M12 12v5M9.5 14.5h5"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.1l1.5-7L2 9.3l7-.8z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.8 1.2V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00-1.2-2.8H3a2 2 0 110-4h.1a1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 002.8-1.2V3a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.8H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  };

  /* ---------------- state ---------------- */
  let D = null, CARD = {}, ITEMS = {};
  const S = (() => {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { s = {}; }
    return Object.assign({ lang: null, items: {}, cards: {}, seen: {}, days: {}, streak: { n: 0, last: 0, best: 0 }, xp: 0, last: 'emalb', sound: false, blitzBest: 0 }, s);
  })();
  if (!S.lang) {
    S.lang = 'both';
    try { const site = JSON.parse(localStorage.getItem('bcprep2') || '{}'); if (site.langChosen && site.lang) S.lang = site.lang; } catch (e) { /* keep default */ }
  }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { /* private mode: play without saving */ } };
  const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);

  /* ---------------- helpers ---------------- */
  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const T = o => { // bilingual object → html for the current language mode
    if (o == null) return '';
    if (typeof o === 'string') return esc(o);
    if (S.lang === 'en') return esc(o.en);
    if (S.lang === 'zh') return esc(o.zh);
    return esc(o.en) + '<span class="zh">' + esc(o.zh) + '</span>';
  };
  const tx = (en, zh) => T({ en, zh });
  const inl = (en, zh) => esc(S.lang === 'en' ? en : S.lang === 'zh' ? zh : en + ' ' + zh);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const short = n => n.replace(/\s*\(.*\)\s*$/, '');
  // a drug name inside a sentence: lower-case unless it is an abbreviation or a brand (ASA, D10W, Entonox, ACE inhibitors)
  const low = n => { const t = short(n); return /^(Entonox|[A-Z0-9]{2})/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1); };
  const key = c => c.deck + '/' + c.id;
  const isHome = c => c.deck === 'home';
  const twin = c => isHome(c) ? c.zh : low(c.name) + ' ' + c.zh; // how the card is named inside a Chinese sentence
  const nameBi = c => ({ en: c.name, zh: twin(c) });
  const nameHtml = c => `<b>${esc(c.name)}</b><span class="nzh">${esc(c.zh)}</span>`;
  const fams = c => isHome(c) ? [c.group === 'other' ? c.id : c.group].concat(HFAM[c.id] || []) : (FAM[c.id] || [c.id]);
  const stars = (m, cls = '') => [0.34, 0.67, 0.95].map(th => `<span class="star ${m >= th ? 'on' : ''} ${cls}">${I.star}</span>`).join('');
  function speak(text) {
    try { const u = new SpeechSynthesisUtterance(short(text)); u.lang = 'en-US'; u.rate = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* no speech on this device */ }
  }
  let actx = null;
  function beep(ok) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = ok ? 880 : 220; o.type = ok ? 'sine' : 'triangle';
      g.gain.setValueAtTime(0.08, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.18);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.2);
    } catch (e) { /* no audio */ }
  }
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* no haptics */ } };

  /* ---------------- items and spaced repetition ---------------- */
  function itemsOf(c) {
    const k = key(c);
    if (ITEMS[k]) return ITEMS[k];
    const out = [];
    (c.cases || []).forEach((d, i) => out.push({ k: k + '/c' + i, card: c, type: d.kind === 'gh' ? 'gh' : 'pick', d }));
    (c.tf || []).forEach((d, i) => out.push({ k: k + '/t' + i, card: c, type: 'tf', d }));
    (c.mcq || []).forEach((d, i) => out.push({ k: k + '/m' + i, card: c, type: 'mcq', d }));
    const auto = isHome(c) ? ['chips', 'tells', 'hook', 'brand'].concat(c.stem ? ['stem'] : []) : ['chips', 'cls', 'hook', 'use'];
    for (const t of auto) { const it = { k: k + '/' + t, card: c, type: t }; if (build(it)) out.push(it); }
    return ITEMS[k] = out;
  }
  const rec = it => S.items[it.k];
  // Scheduling is per drug, not per question. A drug comes back after 1, 3, 7, 14 and 30 days, and each visit asks only a few
  // of its questions (the ones missed last time first). That keeps reviews short enough that new drugs keep arriving.
  const crec = c => S.cards[key(c)];
  const mastery = c => { const r = crec(c); return r ? Math.min(1, r.b / 4) : 0; };
  function grade(it, ok) { // one first-try answer
    const r = S.items[it.k] || (S.items[it.k] = { n: 0, w: 0 });
    r.n++; r.last = Date.now(); r.ok = ok; if (!ok) r.w++;
    const t = today(), d = S.days[t] || (S.days[t] = { q: 0, ok: 0 });
    d.q++; if (ok) d.ok++;
    if (d.q >= ROUND && S.streak.last !== t) {
      S.streak.n = S.streak.last === t - 1 ? S.streak.n + 1 : 1;
      S.streak.last = t; S.streak.best = Math.max(S.streak.best || 0, S.streak.n);
    }
    for (const k of Object.keys(S.days)) if (+k < t - 90) delete S.days[k];
    const tally = R && R.tally && R.tally[key(it.card)];
    if (tally) { tally.done++; if (!ok) tally.wrong++; if (tally.done === tally.n) settle(it.card, tally); }
    save();
  }
  function settle(c, tally) { // every question planned for this drug in this round is answered: move it along the schedule
    const k = key(c), r = S.cards[k] || (S.cards[k] = { b: 0, due: 0, n: 0 }), miss = tally.wrong / tally.n;
    if (tally.fresh) r.b = miss > 0.34 ? 0 : 1;
    else if (miss <= 0.1) r.b = Math.min(5, r.b + 1);
    else if (miss > 0.34) r.b = Math.max(1, r.b - 1);
    r.n++; r.due = today() + IV[r.b];
  }
  const curStreak = () => (S.streak.last >= today() - 1 ? S.streak.n : 0);
  const deckCards = dk => (D.decks[dk] || []);
  const isDue = c => { const r = crec(c); return !!S.seen[key(c)] && (!r || r.due <= today()); };
  const dueCards = cards => cards.filter(isDue);
  function pickItems(c, n) { // what to ask this visit: missed last time first, then never asked, then asked longest ago. Always a patient if there is one.
    const score = it => { const r = rec(it); return !r ? 1 : r.ok === false ? 0 : 2 + (r.last || 0) / 1e13; };
    const its = shuffle(itemsOf(c)).sort((x, y) => score(x) - score(y)), out = its.slice(0, n);
    const isCase = i => i.type === 'gh' || i.type === 'pick';
    if (out.length && !out.some(isCase)) { const cs = its.find(isCase); if (cs) out[out.length - 1] = cs; }
    return out;
  }

  /* ---------------- question builders ---------------- */
  function others(c, n, ok, uniq) { // n other cards from the same deck that share no family with c (and, with uniq, differ from each other on that text)
    const mine = fams(c), seen = new Set(), out = [];
    for (const o of shuffle(deckCards(c.deck))) {
      if (o.id === c.id || fams(o).some(f => mine.includes(f)) || (ok && !ok(o))) continue;
      if (uniq) { const u = uniq(o).toLowerCase(); if (seen.has(u)) continue; seen.add(u); }
      out.push(o);
      if (out.length === n) return out;
    }
    return null;
  }
  const opts = (right, wrongs) => shuffle([{ t: right, ok: true }].concat(wrongs.map(t => ({ t, ok: false }))));
  function build(it) {
    const c = it.card, d = it.d, sn = low(c.name), tw = twin(c);
    switch (it.type) {
      case 'gh':
        return { ui: 'two', mode: 'gh', stem: d.stem, ask: { en: `Give ${sn}?`, zh: `给 ${tw}吗？` }, a: d.give, why: d.why, bad: d.bad };
      case 'tf':
        return { ui: 'two', mode: 'tf', quote: d.s, ask: { en: 'True or false?', zh: '对还是错？' }, a: d.a, why: d.why };
      case 'pick':
        return { ui: 'opts', stem: d.stem, ask: d.ask, opts: opts(d.opts[0], d.opts.slice(1)), why: d.why, bad: d.bad };
      case 'mcq':
        return { ui: 'opts', ask: d.q, opts: opts(d.opts[0], d.opts.slice(1)), why: d.why };
      case 'bag':
        return { ui: 'opts', stem: d.stem, bottles: d.meds, ask: d.ask, opts: opts(d.opts[0], d.opts.slice(1)), why: d.why, bad: d.bad };
      case 'chips': {
        const list = (c.no || []).filter(x => !/^(none\b|no (absolute |listed |known )?contraindication)/i.test(x.en)); // "None noted" is a statement, not something to tap
        const real = shuffle(list.filter(x => x.key)).concat(shuffle(list.filter(x => !x.key))).slice(0, 3);
        const fake = shuffle(c.noFake || []).slice(0, 6 - real.length > 3 ? 3 : 6 - real.length);
        if (!real.length || fake.length < 2) return null;
        return {
          ui: 'chips', chips: shuffle(real.map(t => ({ t, ok: true })).concat(fake.map(t => ({ t, ok: false })))),
          ask: isHome(c) ? { en: `Tap every situation where ${sn} should NOT be used.`, zh: `点出所有不该用${c.zh}的情况。` }
            : { en: `Tap every reason NOT to give ${sn}.`, zh: `点出所有不能给 ${tw} 的情况。` },
          why: { en: 'Not on the list: ' + fake.map(f => f.en).join(', ') + '.', zh: '不在禁忌里的：' + fake.map(f => f.zh).join('、') + '。' },
        };
      }
      case 'cls': {
        const o = others(c, 3, x => x.cls.en.toLowerCase() !== c.cls.en.toLowerCase(), x => x.cls.en);
        return o && { ui: 'opts', ask: { en: `What kind of drug is ${sn}?`, zh: `${tw} 属于哪一类药？` }, opts: opts(c.cls, o.map(x => x.cls)), why: c.how };
      }
      case 'hook': {
        const o = others(c, 3);
        return o && { ui: 'opts', quote: c.hook, ask: isHome(c) ? { en: 'Which medicine is this?', zh: '这说的是哪类药？' } : { en: 'Which drug is this?', zh: '这说的是哪个药？' },
          opts: opts(nameBi(c), o.map(nameBi)), why: c.how };
      }
      case 'use': {
        const mine = new Set(c.use.map(u => u.en.toLowerCase()));
        const o = others(c, 3, x => x.use && x.use[0] && !mine.has(x.use[0].en.toLowerCase()), x => x.use[0].en);
        return o && { ui: 'opts', ask: { en: `${short(c.name)} is given for…`, zh: `${tw} 用于…` }, opts: opts(pick(c.use), o.map(x => x.use[0])),
          why: { en: c.use.map(u => u.en).join('. ') + '.', zh: c.use.map(u => u.zh).join('。') + '。' } };
      }
      case 'tells': {
        if (!c.tells || !c.tellsFake || c.tellsFake.length < 3) return null;
        const ex = pick(c.examples);
        return { ui: 'opts', bottles: [ex],
          ask: { en: `You find ${ex.g}${ex.b ? ` (${ex.b})` : ''} in the patient's bag. They most likely have…`, zh: `你在病人的药袋里看到 ${ex.g} ${ex.zh}${ex.b ? `（${ex.b}）` : ''}。病人最可能有…` },
          opts: opts(pick(c.tells), shuffle(c.tellsFake).slice(0, 3)),
          why: { en: `${c.name}: ` + c.tells.map(u => u.en).join(', ') + '.', zh: `${c.zh}：` + c.tells.map(u => u.zh).join('、') + '。' } };
      }
      case 'stem': {
        const o = others(c, 3);
        return o && { ui: 'opts', ask: { en: `A drug name with "${c.stem}" in it is usually…`, zh: `药名里带 "${c.stem}" 的通常是…` }, opts: opts(nameBi(c), o.map(nameBi)),
          why: { en: c.examples.map(e => e.g).join(', ') + '.', zh: c.examples.map(e => e.g + ' ' + e.zh).join('、') + '。' } };
      }
      case 'brand': {
        const mine = new Set(c.examples.map(e => e.g));
        const exBi = e => ({ en: e.g + (e.b ? ` (${e.b})` : ''), zh: e.g + ' ' + e.zh + (e.b ? `（${e.b}）` : '') });
        let wrong = null;
        for (let tries = 0; tries < 8 && !wrong; tries++) { // a generic can sit on two cards, so make sure the three wrong bottles differ
          const o = others(c, 3, x => x.examples && x.examples.some(e => !mine.has(e.g)));
          if (!o) return null;
          const w = o.map(x => pick(x.examples.filter(e => !mine.has(e.g))));
          if (new Set(w.map(e => e.g)).size === 3) wrong = w;
        }
        if (!wrong) return null;
        return { ui: 'opts', ask: { en: `Which of these belongs under "${short(c.name)}"?`, zh: `下面哪个属于「${c.zh}」？` },
          opts: opts(exBi(pick(c.examples)), wrong.map(exBi)),
          why: { en: `${c.name}: ` + c.examples.map(e => e.g).join(', ') + '.', zh: `${c.zh}：` + c.examples.map(e => e.g + ' ' + e.zh).join('、') + '。' } };
      }
    }
    return null;
  }

  /* ---------------- rounds ---------------- */
  let R = null; // the round in progress
  function scopeCards(scope) {
    if (scope.card) return [CARD[scope.card]];
    if (scope.deck) return deckCards(scope.deck);
    return DECK_ORDER.flatMap(deckCards);
  }
  function introSet(c, n) { // the first questions asked right after a drug is taught
    const its = itemsOf(c), by = t => shuffle(its.filter(i => i.type === t));
    const cases = shuffle(its.filter(i => i.type === 'gh' || i.type === 'pick'));
    const seq = [cases[0], by('chips')[0], by('mcq')[0], by('tf')[0], cases[1], isHome(c) ? by('tells')[0] : by('use')[0], by('tf')[1], by('hook')[0]];
    return seq.filter(Boolean).slice(0, n);
  }
  function buildRound(scope) {
    const cards = scopeCards(scope), q = it => ({ t: 'q', item: it }), tally = {};
    if (scope.card) { // one drug, everything about it
      const c = cards[0], fresh = !S.seen[key(c)], its = shuffle(itemsOf(c)).slice(0, 12);
      if (fresh || isDue(c)) tally[key(c)] = { n: its.length, done: 0, wrong: 0, fresh };
      return { steps: (fresh ? [{ t: 'learn', card: c }] : []).concat(its.map(q)), tally };
    }
    const sched = c => crec(c) || { b: 0, due: 0 };
    const due = dueCards(cards).sort((x, y) => (sched(x).due - sched(y).due) || (sched(x).b - sched(y).b));
    const unseen = cards.filter(c => !S.seen[key(c)]);
    let lead = [], fresh = null;
    if (unseen.length && due.length <= 6) { // room for a new drug: teach it, then ask about it straight away
      fresh = unseen[0];
      const its = introSet(fresh, due.length ? 5 : 6);
      lead = [{ t: 'learn', card: fresh }].concat(its.map(q));
      tally[key(fresh)] = { n: its.length, done: 0, wrong: 0, fresh: true };
    }
    const review = []; let room = ROUND - Math.max(0, lead.length - 1);
    for (const c of due) {
      if (room < 2) break;
      const its = pickItems(c, Math.min(room, sched(c).b <= 1 ? 4 : 3));
      review.push(...its.map(q)); room -= its.length;
      tally[key(c)] = { n: its.length, done: 0, wrong: 0 };
    }
    if (room >= 2) { // nothing else is due: extra practice on the weakest drugs already learned. It does not move their schedule.
      const rest = shuffle(cards.filter(c => S.seen[key(c)] && !tally[key(c)])).sort((x, y) => sched(x).b - sched(y).b);
      for (const c of rest) { if (room < 2) break; const its = pickItems(c, Math.min(room, 3)); review.push(...its.map(q)); room -= its.length; }
    }
    const tail = shuffle(review);
    // two warm-up reviews first, then the new drug, then the rest
    return { steps: fresh && tail.length >= 3 ? tail.slice(0, 2).concat(lead, tail.slice(2)) : lead.concat(tail), tally };
  }
  function startRound(scope) {
    const { steps, tally } = buildRound(scope);
    if (!steps.length) { go('#/'); return; }
    if (scope.deck) { S.last = scope.deck; save(); }
    const cards = [...new Set(steps.map(s => s.card || s.item.card))];
    R = { scope, steps, tally, i: 0, right: 0, first: 0, combo: 0, best: 0, xp: 0, cards, learned: [] };
    render();
  }
  function startBags() {
    const bags = shuffle(D.bags || []).sort((a, b) => ((S.items['bag/' + a.id] || { n: 0 }).n - (S.items['bag/' + b.id] || { n: 0 }).n)).slice(0, 8);
    if (!bags.length) return;
    const fake = { deck: 'home', id: 'bags', name: 'Med bag detective', zh: '药袋侦探' };
    const steps = bags.map(b => ({ t: 'q', item: { k: 'bag/' + b.id, card: fake, type: 'bag', d: b } }));
    R = { scope: { bags: true }, steps, tally: {}, i: 0, right: 0, first: 0, combo: 0, best: 0, xp: 0, cards: [], learned: [] };
    location.hash = '#/play'; render();
  }

  /* ---------------- views ---------------- */
  const app = document.getElementById('app');
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function route() { const h = location.hash.replace(/^#\/?/, ''); const seg = h.split('/'); return { name: seg[0] || 'home', a: seg[1], b: seg[2] }; }
  function render() {
    const r = route();
    app.className = 'lang-' + S.lang;
    document.documentElement.lang = S.lang === 'zh' ? 'zh' : 'en';
    if (r.name === 'play' && R) return R.blitz ? viewBlitz() : viewPlay();
    if (r.name === 'play') return go('#/');
    if (r.name === 'deck' && D.decks[r.a]) return viewDeck(r.a);
    if (r.name === 'card' && CARD[r.a + '/' + r.b]) return viewCard(CARD[r.a + '/' + r.b]);
    if (r.name === 'settings') return viewSettings();
    viewHome();
  }
  const topbar = (title, back) => `<div class="top">${back ? `<button class="back" data-go="${back}">‹ ${inl('Back', '返回')}</button>` : ''}<h1>${title}</h1>
    <button class="iconbtn" data-act="lang" aria-label="Language">${S.lang === 'both' ? 'EN中' : S.lang === 'en' ? 'EN' : '中'}</button>
    <button class="iconbtn" data-go="#/settings" aria-label="Settings">${I.gear}</button></div>`;

  function deckStats(dk) {
    const cards = deckCards(dk), seen = cards.filter(c => S.seen[key(c)]);
    const m = cards.length ? cards.reduce((s, c) => s + mastery(c), 0) / cards.length : 0;
    return { n: cards.length, seen: seen.length, m, due: dueCards(cards).length };
  }
  function viewHome() {
    const t = today(), d = S.days[t] || { q: 0, ok: 0 }, st = curStreak();
    const week = [6, 5, 4, 3, 2, 1, 0].map(i => `<i class="${(S.days[t - i] || {}).q >= ROUND ? 'on' : ''}"></i>`).join('');
    const live = DECK_ORDER.filter(k => deckCards(k).length);
    const mostDue = live.map(k => [deckStats(k).due, k]).sort((x, y) => y[0] - x[0])[0];
    const last = mostDue && mostDue[0] > 0 ? mostDue[1] : (live.includes(S.last) ? S.last : live[0]);
    const ls = deckStats(last);
    const ctaSub = ls.due ? inl(`${ls.due} drug${ls.due > 1 ? 's' : ''} to review`, `${ls.due} 个药待复习`) : ls.seen < ls.n ? inl('a new drug is waiting', '有新药等你') : inl('keep it sharp', '保持手感');
    let h = topbar(`Drug Drill <small>药箱</small>`) + `<main>
      <div class="hero">
        <div class="ring" style="--p:${Math.min(100, Math.round(d.q / GOAL * 100))}"><div><div><b>${d.q}</b><span>/ ${GOAL}</span></div></div></div>
        <div class="hero-txt">
          <div class="streak"><span class="flame ${st ? '' : 'off'}">${I.flame}</span>${st} ${inl('day streak', '天连续')}</div>
          <p>${d.q >= GOAL ? tx('Goal done. Anything more is a bonus.', '今天的目标完成了，再练都是赚的。') : d.q ? tx(`${GOAL - d.q} more to hit today's goal.`, `再做 ${GOAL - d.q} 题就达标。`) : tx('Ten questions is one round. About three minutes.', '一轮 10 题，大约 3 分钟。')}</p>
          <div class="week">${week}</div>
        </div>
      </div>
      <div class="cta d-${last}"><button class="btn" data-act="start" data-deck="${last}">${tx('Start a round', '开始一轮')}<span class="zh" style="font-size:13px">${esc(S.lang === 'zh' ? DK[last].zh : DK[last].en)} · ${ctaSub}</span></button></div>
      <input class="search" id="q" type="search" placeholder="${inl('Find a drug', '查一个药')}" autocomplete="off" />
      <div id="found"></div><div id="shelves">
      <div class="sect">${inl('Three medicine shelves', '三个药柜')}</div>`;
    for (const dk of DECK_ORDER) {
      const s = deckStats(dk); if (!s.n) continue;
      h += `<div class="deck d-${dk}"><div class="deck-h"><div class="deck-ico">${I[DK[dk].ico]}</div>
        <div class="deck-t"><b>${tx(DK[dk].en, DK[dk].zh)}</b><span>${T(DK[dk].sub)}</span></div>${s.due ? `<span class="due">${s.due}</span>` : ''}</div>
        <div class="bar"><i style="width:${Math.round(s.m * 100)}%"></i></div>
        <div class="deck-f"><span>${inl(`${s.seen} of ${s.n} learned`, `已学 ${s.seen}/${s.n}`)}</span><b>${Math.round(s.m * 100)}%</b></div>
        <div class="deck-btns"><button class="btn small" data-act="start" data-deck="${dk}">${inl('Practice', '练习')}</button><button class="btn ghost small" data-go="#/deck/${dk}">${inl('Browse', '看药卡')}</button></div></div>`;
    }
    h += `<div class="sect">${inl('Quick games', '小游戏')}</div><div class="games">
      <button class="game d-bcehs" data-act="blitz"><div class="gi">${I.bolt}</div><b>${inl('60-second blitz', '60 秒快答')}</b><span>${tx('True or false, as fast as you can.', '对还是错，越快越好。')}${S.blitzBest ? ` ${inl('Best', '最高')} ${S.blitzBest}` : ''}</span></button>
      ${(D.bags || []).length ? `<button class="game d-home" data-act="bags"><div class="gi">${I.bag}</div><b>${inl('Med bag detective', '药袋侦探')}</b><span>${tx('Read the bottles, read the patient.', '看药瓶，猜病人。')}</span></button>` : ''}
      </div>
      <p class="foot">${tx('Sources: EMALB Provincial Examination Guidelines (June 2026), BCEHS Clinical Practice Guidelines drug monographs, Nancy Caroline’s Emergency Care in the Streets. A study aid. On the road, the current BCEHS guideline and medical oversight decide.',
        '资料来源：EMALB 省考考纲（2026 年 6 月）、BCEHS 临床指南药物专论、Nancy Caroline 教材。这是学习工具，出车以现行 BCEHS 指南和医疗监督为准。')}<br><a href="../">${inl('Back to the main site', '回主站')}</a></p></div></main>`;
    app.innerHTML = h;
    $('#q').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase(), found = $('#found'), shelves = $('#shelves');
      if (!q) { found.innerHTML = ''; shelves.style.display = ''; return; }
      const hay = c => (c.name + ' ' + c.zh + ' ' + (c.brand || []).join(' ') + ' ' + (c.examples || []).map(x => x.g + ' ' + x.zh + ' ' + x.b).join(' ') + ' ' + (c.stem || '')).toLowerCase();
      const hits = DECK_ORDER.flatMap(deckCards).filter(c => hay(c).includes(q)).slice(0, 12);
      shelves.style.display = 'none';
      found.innerHTML = hits.length ? `<div class="grid" style="margin-top:12px">${hits.map(c => `<div class="d-${c.deck}" style="display:contents">${tile(c, true)}</div>`).join('')}</div>`
        : `<p class="muted" style="text-align:center;margin:24px 0">${inl('Nothing by that name.', '没找到这个名字。')}</p>`;
    });
  }

  function tile(c, tag) {
    const seen = S.seen[key(c)], m = mastery(c);
    return `<button class="tile ${seen ? '' : 'new'}" data-go="#/card/${key(c)}">${tag ? `<span class="pill" style="align-self:flex-start;margin-bottom:6px">${inl(DK[c.deck].tag.en, DK[c.deck].tag.zh)}</span>` : ''}<b>${esc(c.name)}</b><span class="nzh">${esc(c.zh)}</span>
      <span class="stars">${seen ? stars(m) : `<span class="lock">${inl('NEW', '未学')}</span>`}</span><i class="fill" style="width:${Math.round(m * 100)}%"></i></button>`;
  }
  function viewDeck(dk) {
    const cards = deckCards(dk), s = deckStats(dk);
    let h = topbar(tx(DK[dk].en, DK[dk].zh), '#/') + `<main class="d-${dk}">
      <div class="cta" style="margin-top:4px"><button class="btn" data-act="start" data-deck="${dk}">${tx('Practice this shelf', '练这个药柜')}<span class="zh" style="font-size:13px">${inl(`${s.seen} of ${s.n} learned`, `已学 ${s.seen}/${s.n}`)}${s.due ? ' · ' + inl(`${s.due} drug${s.due > 1 ? 's' : ''} to review`, `${s.due} 个药待复习`) : ''}</span></button></div>`;
    if (dk === 'home') {
      for (const g of Object.keys(GROUPS)) {
        const cs = cards.filter(c => c.group === g); if (!cs.length) continue;
        h += `<div class="grp">${inl(GROUPS[g][0], GROUPS[g][1])}</div><div class="grid">${cs.map(tile).join('')}</div>`;
      }
    } else h += `<div class="grid">${cards.map(tile).join('')}</div>`;
    app.innerHTML = h + '</main>';
  }

  const li = (arr, cls) => (arr || []).map(x => `<li class="${cls && x.key ? 'key' : ''}">${x.who && x.who !== 'all' ? `<span class="who">${inl(x.who === 'adult' ? 'Adult' : 'Child', x.who === 'adult' ? '成人' : '儿童')}</span>` : ''}${T(x)}</li>`).join('');
  const sec = (en, zh, arr, cls = '') => arr && arr.length ? `<div class="sec ${cls}"><h3>${inl(en, zh)}</h3><ul>${li(arr, cls)}</ul></div>` : '';
  const bottles = exs => `<div class="bottles">${exs.map(e => `<div class="bottle"><b>${esc(e.g)}</b><span>${esc(e.zh)}${e.b ? ' · ' + esc(e.b) : ''}</span></div>`).join('')}</div>`;
  function cardHead(c) {
    const lvl = c.lvl ? `<span class="pill grey">${esc(c.lvl === 'ACP' ? 'ACP+' : c.lvl + '+')}</span>` : '';
    const noExam = c.deck === 'bcehs' && !CARD['emalb/' + c.id] ? ` <span class="pill grey">${inl('Not on the exam', '执照考试不考')}</span>` : '';
    return `<span class="pill">${inl(DK[c.deck].tag.en, DK[c.deck].tag.zh)}</span> ${lvl}${noExam}
      <div class="dname" style="margin-top:8px">${esc(c.name)}</div><div class="dzh">${esc(c.zh)}${c.brand && c.brand.length ? ' · ' + esc(c.brand.join(', ')) : ''}</div>
      ${c.say ? `<button class="say" data-say="${esc(c.name)}">${I.spk}<span>${esc(c.say)}</span></button>` : ''}
      ${c.stem ? `<div><span class="stemtag">${esc(c.stem)}</span></div>` : ''}`;
  }
  function cardBody(c, part) { // part: 0 what, 1 when/how much, 2 never/careful, undefined = everything
    const all = part === undefined; let h = '';
    if (all || part === 0) {
      h += `<div class="hook">${T(c.hook)}</div><div class="how">${T(c.how)}</div><div style="margin-top:10px"><span class="pill grey">${T(c.cls).replace('<span class="zh">', ' <span>')}</span></div>`;
      if (isHome(c)) h += bottles(c.examples);
    }
    if (all || part === 1) {
      if (isHome(c)) h += sec('If you find it, the patient probably has', '看到它，病人多半有', c.tells) + sec('What it does for them', '它在治什么', c.use) + (c.medic ? `<div class="note"><h3>${inl('What it changes for you', '对你意味着什么')}</h3><ul style="margin:0;padding-left:18px">${c.medic.map(m => `<li style="margin:6px 0">${T(m)}</li>`).join('')}</ul></div>` : '');
      else h += sec('Give it for', '什么时候给', c.use) + sec('Dose', '剂量', c.dose) + (c.pk ? `<p class="tiny muted" style="margin:10px 0 0">${T(c.pk)}</p>` : '');
    }
    if (all || part === 2) {
      h += sec(isHome(c) ? 'Should not be used with' : 'Never give if', isHome(c) ? '这些情况不该用' : '这些情况绝对不给', c.no, 'never') + sec('Be careful', '要小心', c.care) + sec('Side effects', '副作用', c.fx);
      if (c.pearl) h += `<div class="note"><h3>${inl('Teacher says', '老师说')}</h3>${T(c.pearl)}</div>`;
      if (c.diff) h += `<div class="note diff"><h3>${inl(c.deck === 'emalb' ? 'Exam vs the road' : 'The road vs the exam', c.deck === 'emalb' ? '考试和出车的差别' : '出车和考试的差别')}</h3>${T(c.diff)}</div>`;
    }
    if (all) h += `<p class="srcline">${esc(c.src || '')}</p>`;
    return h;
  }
  function viewCard(c) {
    const twinDeck = c.deck === 'emalb' ? 'bcehs' : c.deck === 'bcehs' ? 'emalb' : null;
    const sib = twinDeck && CARD[twinDeck + '/' + c.id];
    const tabs = sib ? `<div class="tabs">${['emalb', 'bcehs'].map(dk => `<button class="${dk === c.deck ? 'on' : ''}" data-go="#/card/${dk}/${c.id}">${inl(DK[dk].tag.en, DK[dk].tag.zh)}</button>`).join('')}</div>` : '';
    app.innerHTML = topbar('', '#/deck/' + c.deck) + `<main class="d-${c.deck}">${tabs}<div class="dcard">${cardHead(c)}${cardBody(c)}</div>
      <div class="stick"><button class="btn" data-act="startcard" data-card="${key(c)}">${tx('Practice this one', '就练这个')}</button></div></main>`;
  }

  /* ---------------- play ---------------- */
  function progress() { const done = R.i, n = R.steps.length; return Math.round(done / n * 100); }
  const playTop = extra => `<div class="play-top"><button class="x" data-act="quit" aria-label="Close">${I.cross}</button><div class="prog"><i style="width:${Math.max(4, progress())}%"></i></div>${extra || `<span class="combo">${R.combo >= 2 ? '×' + R.combo : ''}</span>`}</div>`;
  function viewPlay() {
    if (R.i >= R.steps.length) return viewDone();
    const st = R.steps[R.i];
    if (st.t === 'learn') return viewLearn(st);
    const it = st.item, c = it.card, q = st.q || (st.q = build(it));
    if (!q) { R.i++; return viewPlay(); }
    let h = playTop() + `<div class="stage d-${c.deck}"><div class="qhead"><span class="pill">${inl(DK[c.deck].tag.en, DK[c.deck].tag.zh)}</span><span class="qdrug">${nameHtml(c)}</span>${st.retry ? `<span class="pill grey">${inl('Again', '再来一次')}</span>` : ''}</div>`;
    if (q.stem) h += `<div class="stem">${T(q.stem)}</div>`;
    if (q.bottles) h += bottles(q.bottles);
    if (q.quote) h += `<div class="quote">${T(q.quote)}</div>`;
    h += `<div class="ask">${T(q.ask)}</div>`;
    if (q.ui === 'opts') h += `<div class="opts">${q.opts.map((o, i) => `<button class="opt" data-ans="${i}">${T(o.t)}</button>`).join('')}</div><div class="spacer"></div>`;
    if (q.ui === 'chips') h += `<div class="chips">${q.chips.map((o, i) => `<button class="chip" data-chip="${i}">${T(o.t)}</button>`).join('')}</div><div class="spacer"></div><div id="chk"><button class="btn" data-act="check" disabled>${tx('Check', '检查')}</button></div>`;
    if (q.ui === 'two') h += q.mode === 'gh'
      ? `<div class="two"><button class="give" data-two="1">${tx('Give', '给')}</button><button class="hold" data-two="0">${tx('Hold', '不给')}</button></div>`
      : `<div class="two"><button class="tr" data-two="1">${tx('True', '对')}</button><button class="fa" data-two="0">${tx('False', '错')}</button></div>`;
    h += `<div id="sheet"></div></div>`;
    app.innerHTML = h;
    window.scrollTo(0, 0);
  }
  function answered(ok, detail) {
    const st = R.steps[R.i], it = st.item, q = st.q, c = it.card;
    $('.stage').classList.add('locked');
    if (!st.retry) { grade(it, ok); R.first++; if (ok) R.right++; }
    if (ok) { R.combo++; R.best = Math.max(R.best, R.combo); R.xp += st.retry ? 5 : 10; S.xp += st.retry ? 5 : 10; }
    else { R.combo = 0; if (!st.retry) R.steps.push({ t: 'q', item: it, retry: true }); }
    save(); beep(ok); if (!ok) buzz(70);
    const praise = [['Correct', '对了'], ['Nailed it', '漂亮'], ['Exactly', '没错'], ['Yes', '对']];
    const p = pick(praise);
    const chk = $('#chk'); if (chk) chk.remove();
    $('#sheet').innerHTML = `<div class="sheet ${ok ? 'ok' : 'no'}"><h2>${ok ? I.check : I.cross}${ok ? inl(p[0], p[1]) : inl('Not quite', '不对')}</h2>
      ${!ok && q.bad ? `<p class="conseq">${T(q.bad)}</p>` : ''}${!ok && detail ? `<p class="ans">${detail}</p>` : ''}
      ${q.why ? `<p class="why">${T(q.why)}</p>` : ''}
      <button class="btn" data-act="next">${tx('Continue', '继续')}</button>${c.src ? `<p class="srcline">${esc(c.src)}</p>` : ''}</div>`;
    const sh = $('.sheet'); if (sh && sh.scrollIntoView) sh.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
  function learnBody(c, p) { // three short screens. Everything else is on the full card and in the questions.
    if (p === 0) return cardBody(c, 0);
    if (p === 1) {
      if (isHome(c)) return sec('If you find it, the patient probably has', '看到它，病人多半有', c.tells)
        + `<div class="note"><h3>${inl('What it changes for you', '对你意味着什么')}</h3><ul style="margin:0;padding-left:18px">${(c.medic || []).slice(0, 2).map(m => `<li style="margin:6px 0">${T(m)}</li>`).join('')}</ul></div>`;
      const more = (c.dose || []).length - 2;
      return sec('Give it for', '什么时候给', c.use) + sec('Dose', '剂量', (c.dose || []).slice(0, 2))
        + (more > 0 ? `<p class="tiny muted" style="margin:8px 0 0">${inl(`${more} more dose line${more > 1 ? 's' : ''} on the full card.`, `完整药卡里还有 ${more} 条剂量说明。`)}</p>` : '');
    }
    const keys = (c.no || []).filter(x => x.key), show = keys.length ? keys : (c.no || []).slice(0, 3), rest = (c.no || []).length - show.length;
    return sec(isHome(c) ? 'Should not be used with' : 'Never give if', isHome(c) ? '这些情况不该用' : '这些情况绝对不给', show, 'never')
      + (rest > 0 ? `<p class="tiny muted" style="margin:8px 0 0">${inl(`Plus ${rest} more on the full card. The questions will bring them up.`, `完整药卡里还有 ${rest} 条，做题时会遇到。`)}</p>` : '')
      + (c.pearl ? `<div class="note"><h3>${inl('Teacher says', '老师说')}</h3>${T(c.pearl)}</div>` : '');
  }
  function viewLearn(st) {
    const c = st.card, p = st.p || 0;
    app.innerHTML = playTop('<span class="combo"></span>') + `<div class="stage d-${c.deck}"><div class="learn">
      <span class="newtag">${inl('NEW', '新药')} · ${inl(DK[c.deck].tag.en, DK[c.deck].tag.zh)}</span>
      <div class="dcard">${p === 0 ? cardHead(c) : `<div class="qdrug" style="font-size:18px">${nameHtml(c)}</div>`}${learnBody(c, p)}</div>
      <div class="dots">${[0, 1, 2].map(i => `<i class="${i === p ? 'on' : ''}"></i>`).join('')}</div><div class="spacer"></div></div></div>
      <div class="actbar d-${c.deck}"><button class="btn" data-act="learnnext">${p < 2 ? tx('Next', '下一页') : tx('Got it. Quiz me', '记住了，考我')}</button></div>`;
    window.scrollTo(0, 0);
  }
  function viewDone() {
    const acc = R.first ? Math.round(R.right / R.first * 100) : 0, st = curStreak();
    const back = c => { const r = crec(c); if (!r) return ''; const d = r.due - today(); return d <= 0 ? inl('again today', '今天再练') : d === 1 ? inl('back tomorrow', '明天再见') : inl(`back in ${d} days`, `${d} 天后再见`); };
    const gains = R.cards.map(c => `<div><span class="gname">${nameHtml(c)}</span><span class="gstars">${stars(mastery(c))}</span><b class="gback">${back(c)}</b></div>`).join('');
    const msg = acc >= 90 ? ['Sharp.', '很稳。'] : acc >= 70 ? ['Solid round.', '这轮不错。'] : ['The misses come back tomorrow. That is how it sticks.', '错的明天会再出现，这样才记得住。'];
    const scope = R.scope;
    app.innerHTML = `<div class="top"><h1></h1></div><main class="done d-${scope.deck || 'home'}">
      <div class="big">${acc}<small>%</small></div><h2>${tx(msg[0], msg[1])}</h2>
      <div class="stats"><div class="stat"><b>${R.right}/${R.first}</b><span>${inl('first try', '一次答对')}</span></div><div class="stat"><b>×${R.best}</b><span>${inl('best combo', '最长连对')}</span></div><div class="stat"><b>${st}</b><span>${inl('day streak', '天连续')}</span></div></div>
      ${R.learned.length ? `<p class="muted" style="margin:0 0 10px">${inl('New today:', '今天新学：')} ${R.learned.map(c => esc(c.name)).join(', ')}</p>` : ''}
      ${gains ? `<div class="gain">${gains}</div>` : ''}
      <button class="btn" data-act="again">${tx('One more round', '再来一轮')}</button>
      <div style="height:12px"></div><button class="btn ghost" data-go="#/">${tx('Done for now', '先到这儿')}</button></main>`;
    if (acc >= 80) confetti();
    const keep = R.scope; R = null; viewDone.scope = keep;
    window.scrollTo(0, 0);
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = ['#5753d0', '#0c9483', '#e2702f', '#e0a100', '#1f9d55'];
    for (let i = 0; i < 36; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = cols[i % 5]; s.style.animationDuration = 1.4 + Math.random() * 1.6 + 's'; s.style.animationDelay = Math.random() * 0.4 + 's'; box.appendChild(s); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
  }

  /* ---------------- 60-second blitz ---------------- */
  function startBlitz() {
    let cards = DECK_ORDER.flatMap(deckCards).filter(c => S.seen[key(c)]);
    if (cards.length < 3) cards = DECK_ORDER.flatMap(deckCards);
    const pool = shuffle(cards.flatMap(c => (c.tf || []).map(d => ({ c, d }))));
    if (!pool.length) return;
    R = { blitz: true, pool, i: 0, score: 0, n: 0, miss: [], end: Date.now() + 60000 };
    R.timer = setInterval(() => { if (!R || !R.blitz) return; const left = Math.max(0, Math.ceil((R.end - Date.now()) / 1000)); const el = $('.clock'); if (el) el.textContent = left + 's'; if (left <= 0) endBlitz(); }, 250);
    location.hash = '#/play'; render();
  }
  function viewBlitz() {
    if (R.over) return;
    const x = R.pool[R.i % R.pool.length], left = Math.max(0, Math.ceil((R.end - Date.now()) / 1000));
    app.innerHTML = `<div class="play-top"><button class="x" data-act="quit">${I.cross}</button><div class="prog"><i style="width:${Math.max(4, Math.round(left / 60 * 100))}%;background:var(--home)"></i></div><span class="clock">${left}s</span></div>
      <div class="stage d-${x.c.deck}" id="bz"><div class="qhead"><span class="pill">${inl(DK[x.c.deck].tag.en, DK[x.c.deck].tag.zh)}</span><span class="qdrug">${nameHtml(x.c)}</span><span style="margin-left:auto;font-weight:800">${R.score}</span></div>
      <div class="blitz-s"><div>${T(x.d.s)}</div></div>
      <div class="two" style="padding-bottom:calc(16px + env(safe-area-inset-bottom))"><button class="tr" data-bz="1">${tx('True', '对')}</button><button class="fa" data-bz="0">${tx('False', '错')}</button></div></div>`;
  }
  function endBlitz() {
    clearInterval(R.timer); R.over = true;
    const best = R.score > (S.blitzBest || 0); if (best) { S.blitzBest = R.score; save(); }
    app.innerHTML = `<div class="top"><h1></h1></div><main class="done d-bcehs"><div class="big">${R.score}</div><h2>${best ? tx('New best.', '新纪录。') : tx(`Best so far: ${S.blitzBest}`, `目前最高：${S.blitzBest}`)}</h2>
      <p class="muted">${inl(`${R.n} answered in 60 seconds`, `60 秒答了 ${R.n} 题`)}</p>
      ${R.miss.length ? `<div class="sect" style="text-align:left">${inl('Worth another look', '值得再看一眼')}</div><div class="missed-list">${R.miss.slice(0, 8).map(m => `<p><b>${esc(short(m.c.name))}</b> ${T(m.d.s)}<span class="zh" style="color:var(--ok)">${esc(S.lang === 'zh' ? m.d.why.zh : m.d.why.en)}</span></p>`).join('')}</div>` : ''}
      <button class="btn" data-act="blitz">${tx('Again', '再来')}</button><div style="height:12px"></div><button class="btn ghost" data-go="#/">${tx('Home', '回首页')}</button></main>`;
    if (best && R.score >= 8) confetti();
    R = null; window.scrollTo(0, 0);
  }

  /* ---------------- settings ---------------- */
  function viewSettings() {
    const seg = (name, cur, list) => `<div class="seg">${list.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-set="${name}" data-val="${v}">${l}</button>`).join('')}</div>`;
    const answered = Object.values(S.items).reduce((s, r) => s + r.n, 0);
    app.innerHTML = topbar(inl('Settings', '设置'), '#/') + `<main>
      <div class="set"><div class="row"><span>${inl('Language', '语言')}</span>${seg('lang', S.lang, [['en', 'EN'], ['both', 'EN+中'], ['zh', '中文']])}</div>
      <div class="row"><span>${inl('Sound', '声音')}</span>${seg('sound', S.sound ? '1' : '0', [['0', inl('Off', '关')], ['1', inl('On', '开')]])}</div></div>
      <div class="set"><div class="row"><span>${inl('Questions answered', '累计答题')}</span><b>${answered}</b></div><div class="row"><span>${inl('Longest streak', '最长连续')}</span><b>${S.streak.best || 0}</b></div>
      <div class="row"><span>${inl('Add to your home screen', '添加到手机桌面')}</span></div><p class="tiny muted" style="margin:-6px 0 14px">${tx('iPhone: Share, then Add to Home Screen. Android: menu, then Add to Home screen. It then opens like an app and works offline.', 'iPhone：点分享，再点「添加到主屏幕」。安卓：点菜单，再点「添加到主屏幕」。之后像 App 一样打开，没网也能用。')}</p></div>
      <div class="set"><div class="row"><button class="danger" data-act="reset">${inl('Reset all progress', '清空全部进度')}</button></div></div>
      <p class="foot">Drug Drill · ${esc(D.built || '')}</p></main>`;
  }

  /* ---------------- events ---------------- */
  app.addEventListener('click', e => {
    const b = e.target.closest('button,[data-go]'); if (!b) return;
    if (b.dataset.say) return speak(b.dataset.say);
    if (b.dataset.go) return go(b.dataset.go);
    if (b.dataset.set) {
      if (b.dataset.set === 'lang') S.lang = b.dataset.val; else S.sound = b.dataset.val === '1';
      save(); if (S.sound) beep(true); return render();
    }
    if (b.dataset.ans !== undefined) {
      const q = R.steps[R.i].q, i = +b.dataset.ans, ok = q.opts[i].ok;
      document.querySelectorAll('.opt').forEach((el, j) => el.classList.add(q.opts[j].ok ? 'right' : j === i ? 'wrong' : 'dim'));
      return answered(ok);
    }
    if (b.dataset.two !== undefined) {
      const q = R.steps[R.i].q, v = b.dataset.two === '1', ok = v === q.a;
      document.querySelectorAll('.two button').forEach(el => el.classList.add(el === b ? 'picked' : 'dim'));
      const right = q.mode === 'gh' ? (q.a ? inl('Right call: give it.', '应该给。') : inl('Right call: hold it.', '应该不给。')) : (q.a ? inl('It is true.', '这句是对的。') : inl('It is false.', '这句是错的。'));
      return answered(ok, right);
    }
    if (b.dataset.chip !== undefined) {
      b.classList.toggle('sel');
      $('#chk button').disabled = !document.querySelector('.chip.sel'); return;
    }
    if (b.dataset.bz !== undefined) {
      const x = R.pool[R.i % R.pool.length], ok = (b.dataset.bz === '1') === x.d.a;
      R.n++; if (ok) R.score++; else { R.miss.push(x); buzz(50); }
      beep(ok); R.i++; viewBlitz();
      const s = $('#bz'); if (s) s.classList.add(ok ? 'flash-ok' : 'flash-no'); return;
    }
    switch (b.dataset.act) {
      case 'lang': S.lang = S.lang === 'both' ? 'en' : S.lang === 'en' ? 'zh' : 'both'; save(); return render();
      case 'start': location.hash = '#/play'; return startRound({ deck: b.dataset.deck });
      case 'startcard': location.hash = '#/play'; return startRound({ card: b.dataset.card });
      case 'again': { const sc = viewDone.scope || { deck: S.last }; location.hash = '#/play'; return sc.bags ? startBags() : startRound(sc); }
      case 'bags': return startBags();
      case 'blitz': return startBlitz();
      case 'quit': if (R && R.timer) clearInterval(R.timer); R = null; return go('#/');
      case 'next': R.i++; return viewPlay();
      case 'learnnext': {
        const st = R.steps[R.i];
        if ((st.p || 0) < 2) { st.p = (st.p || 0) + 1; return viewLearn(st); }
        if (!S.seen[key(st.card)]) { S.seen[key(st.card)] = today(); R.learned.push(st.card); save(); }
        R.i++; return viewPlay();
      }
      case 'check': {
        const q = R.steps[R.i].q; let ok = true;
        document.querySelectorAll('.chip').forEach((el, j) => {
          const sel = el.classList.contains('sel'), real = q.chips[j].ok;
          if (sel !== real) ok = false;
          el.classList.remove('sel'); el.classList.add(real ? (sel ? 'right' : 'missed') : (sel ? 'wrong' : 'dim'));
        });
        return answered(ok, inl('The green ones are the real ones.', '绿色的才是真的。'));
      }
      case 'reset':
        if (confirm(S.lang === 'en' ? 'Erase all progress in Drug Drill?' : '确定清空药箱里的全部进度吗？')) { const lang = S.lang; localStorage.removeItem(LS); location.hash = '#/'; S.items = {}; S.cards = {}; S.seen = {}; S.days = {}; S.streak = { n: 0, last: 0, best: 0 }; S.xp = 0; S.blitzBest = 0; S.lang = lang; save(); render(); }
        return;
    }
  });
  window.addEventListener('hashchange', () => { if (route().name !== 'play' && R) { if (R.timer) clearInterval(R.timer); R = null; } render(); });

  /* ---------------- boot ---------------- */
  fetch('./data.json?v=' + (window.DRUG_DATA_V || Date.now())).then(r => r.json()).then(d => {
    D = d;
    for (const dk of DECK_ORDER) for (const c of deckCards(dk)) CARD[key(c)] = c;
    if (route().name === 'play') location.hash = '#/';
    if (/[?&]debug/.test(location.search)) window.__dd = { build, itemsOf, CARD, D, cur: () => R && R.steps && R.steps[R.i] && R.steps[R.i].q }; // test hook: lets a script audit every generated question
    render();
  }).catch(() => { app.innerHTML = '<div class="boot">Could not load the drug data. Check your connection and reload.<br>药物数据没加载出来，检查网络后刷新。</div>'; });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
})();
