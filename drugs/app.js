// Drug Drill 药箱 — drug monograph practice for BC paramedics. One file, no dependencies.
// Three decks: emalb (licensing exam), bcehs (on the road), home (patients' own medicines).
// Progress lives in localStorage under 'drugdrill1'.
(() => {
  'use strict';
  const LS = 'drugdrill1', IV = [0, 1, 3, 7, 14, 30], ROUND = 10, GOAL = 20;
  const DECK_ORDER = ['emalb', 'home', 'bcehs'];
  const DK = {
    emalb: { en: 'Exam drugs', zh: '考试药', sub: { en: 'EMALB licensing exam monographs', zh: 'EMALB 执照考试的药物专论' }, tag: { en: 'Exam', zh: '考试' }, ico: 'cap' },
    bcehs: { en: 'On the road', zh: '出车药', sub: { en: 'BCEHS monographs, for reference. The exam wins where they differ', zh: 'BCEHS 专论，仅供参考。和考试不同时以考试为准' }, tag: { en: 'BCEHS', zh: '出车' }, ico: 'siren' },
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
    snd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.8 1.2V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00-1.2-2.8H3a2 2 0 110-4h.1a1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 002.8-1.2V3a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.8H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  };

  /* ---------------- state ---------------- */
  let D = null, CARD = {}, ITEMS = {};
  const S = (() => {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { s = {}; }
    return Object.assign({ lang: null, items: {}, cards: {}, seen: {}, days: {}, streak: { n: 0, last: 0, best: 0 }, xp: 0, last: 'emalb', sound: true, blitzBest: 0 }, s);
  })();
  // 2026-11-21: sound became the Play & learn set and is on by default. Before that it was off by default and hidden in settings,
  // so a saved "off" says nothing about a choice: switch everyone on once; the speaker button mutes it from then on.
  if (S.sfx !== 2) { S.sound = true; S.sfx = 2; }
  if (!S.lang) {
    S.lang = 'en';
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
    if (S.lang === 'en') return esc(o.en) + '<span class="zh">' + esc(o.zh) + '</span>';
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
  // Sound: the same set as the site's Play & learn drills (src/drill.js), synthesized, no files. A chime when right that climbs
  // with the combo, a soft buzz when wrong, a jingle at the end of a round, a fanfare when today is done (the day's 10 questions
  // tick the streak, or every drug due in that shelf is reviewed) or a blitz sets a new best. The speaker button mutes it.
  let actx = null;
  function tone(a, f, at, dur, o) {
    const type = o.type || 'sine', vol = o.vol || 0.16, glide = o.glide || 0, lp = o.lp || 0, bell = o.bell || 0;
    const t = a.currentTime + at, g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (lp) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; g.connect(fl); out = fl; }
    out.connect(a.destination);
    for (const [fr, k] of [[f, 1]].concat(bell ? [[f * 2, bell]] : [])) { // bell: a soft octave partial for a chime
      const osc = a.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(fr, t);
      if (glide) osc.frequency.exponentialRampToValueAtTime(fr * glide, t + dur);
      if (k === 1) osc.connect(g); else { const gk = a.createGain(); gk.gain.value = k; osc.connect(gk); gk.connect(g); }
      osc.start(t); osc.stop(t + dur + 0.02);
    }
  }
  function sfx(kind, combo) {
    if (!S.sound) return;
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      const a = actx || (actx = new A());
      if (a.state === 'suspended') a.resume().catch(() => {});
      const up = Math.pow(2, Math.min(Math.max((combo || 0) - 1, 0), 7) / 12); // a combo climbs a semitone per answer, up to a fifth
      switch (kind) {
        case 'ok': tone(a, 784 * up, 0, 0.16, { bell: 0.25 }); tone(a, 1175 * up, 0.075, 0.32, { bell: 0.25 }); break;
        case 'no': tone(a, 247, 0, 0.16, { type: 'square', vol: 0.07, lp: 800, glide: 0.94 }); tone(a, 185, 0.14, 0.3, { type: 'square', vol: 0.07, lp: 700, glide: 0.92 }); break;
        case 'round': [523, 659, 784].forEach((f, i) => tone(a, f, i * 0.09, 0.22, { bell: 0.2 })); tone(a, 1047, 0.27, 0.55, { bell: 0.3 }); break;
        case 'today':
          [523, 659, 784, 1047].forEach((f, i) => tone(a, f, i * 0.1, 0.26, { type: 'triangle', vol: 0.12, bell: 0.2 }));
          [1047, 1319, 1568].forEach(f => tone(a, f, 0.44, 1.2, { type: 'triangle', vol: 0.08, bell: 0.15 }));
          [2093, 2637, 3136, 2637, 3520].forEach((f, i) => tone(a, f, 0.56 + i * 0.07, 0.28, { vol: 0.035 }));
          break;
      }
    } catch (e) { /* no audio on this device */ }
  }
  const sndBtn = () => `<button class="iconbtn snd" data-act="snd" aria-pressed="${S.sound}" aria-label="${S.sound ? inl('Sound on. Tap to mute', '声音开着，点一下关掉') : inl('Sound off. Tap to turn on', '声音关着，点一下打开')}">${S.sound ? I.snd : I.mute}</button>`;
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
      if (R) R.dayDone = true;
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
        return { ui: 'opts', stem: d.stem, meds: d.cards.map((id, i) => ({ id, label: d.meds[i].g })), ask: d.ask, opts: opts(d.opts[0], d.opts.slice(1)), why: d.why, bad: d.bad };
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
        return o && { ui: 'opts', ask: { en: `${short(c.name)} is given for…`, zh: `${tw} 用于…` }, opts: opts(c.use[0], o.map(x => x.use[0])),
          why: { en: c.use.map(u => u.en).join('. ') + '.', zh: c.use.map(u => u.zh).join('。') + '。' } };
      }
      case 'tells': {
        if (!c.tells || !c.tellsFake || c.tellsFake.length < 3) return null;
        const ex = pick(c.examples);
        return { ui: 'opts', meds: [{ id: c.id, label: ex.g + (ex.b ? ' · ' + ex.b : '') }],
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
    R = { scope, steps, tally, i: 0, right: 0, first: 0, combo: 0, best: 0, xp: 0, cards, learned: [], dayDone: false,
      dueAtStart: scope.deck ? dueCards(deckCards(scope.deck)).length : 0 };
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
  // Sticker-book design (2026-11-18): dot-grid paper, one real object per screen, BC ambulance Battenburg check as the one loud motif.
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
  const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const tilt = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0; return (Math.abs(h) % 11) - 5; };
  const stk = (id, cls = '', style = '') => `<img class="stk ${cls}" src="img/${esc(id)}.webp" alt="" draggable="false" style="--r:${tilt(id)}deg;${style}" onerror="this.style.visibility='hidden'">`;
  const zhChip = () => S.lang === 'en' ? `<button class="zhchip" data-act="peek" aria-label="Show Chinese">中文</button>` : '';
  const rawT = o => S.lang === 'zh' ? o.zh : S.lang === 'both' ? o.en + '<span class="zh">' + o.zh + '</span>' : o.en + '<span class="zh">' + o.zh + '</span>';
  const head = (title, back) => `<header class="top">${back ? `<button class="iconbtn back" data-go="${back}" aria-label="Back">${I.back}</button>` : ''}<div class="top-t">${title}</div><button class="iconbtn" data-go="#/settings" aria-label="Settings">${I.gear}</button></header>`;
  const deckName = dk => inl(DK[dk].en, DK[dk].zh);
  function deckStats(dk) {
    const cards = deckCards(dk), seen = cards.filter(c => S.seen[key(c)]);
    const m = cards.length ? cards.reduce((s, c) => s + mastery(c), 0) / cards.length : 0;
    return { n: cards.length, seen: seen.length, m, due: dueCards(cards).length };
  }
  const meter = (pct, cls = '') => `<span class="meter ${cls}"><i style="width:${Math.max(pct ? 3 : 0, Math.round(pct))}%"></i></span>`;

  function viewHome() {
    const st = curStreak(), live = DECK_ORDER.filter(k => deckCards(k).length);
    const stats = Object.fromEntries(live.map(k => [k, deckStats(k)]));
    const dueAll = live.filter(k => k !== 'bcehs').reduce((s, k) => s + stats[k].due, 0);
    const examLive = live.filter(k => k !== 'bcehs'); // the main button is for the exam: never the road shelf
    const mostDue = examLive.map(k => [stats[k].due, k]).sort((x, y) => y[0] - x[0])[0];
    const deck = mostDue && mostDue[0] > 0 ? mostDue[1] : (examLive.includes(S.last) ? S.last : examLive[0]);
    const fresh = deckCards(deck).find(c => !S.seen[key(c)]);
    let pile = dueCards(deckCards(deck)).slice(0, 3);
    if (pile.length < 3 && fresh) pile.push(fresh);
    for (const c of deckCards(deck)) { if (pile.length >= 3) break; if (!pile.includes(c)) pile.push(c); }
    const title = dueAll
      ? { en: `${NUM[dueAll] || dueAll} drug${dueAll > 1 ? 's are' : ' is'} due <em>today</em>.`, zh: `今天有 <em>${dueAll}</em> 个药要复习。` }
      : fresh ? { en: 'A new drug is <em>waiting</em>.', zh: '有一个<em>新药</em>在等你。' }
        : { en: 'All caught up. Keep it <em>sharp</em>.', zh: '都复习完了，<em>保持手感</em>。' };
    const slots = [
      { s: 'left:2%;top:96px', mh: 150, mw: 210, tag: 'left:6%;top:250px' },
      { s: 'left:34%;top:6px', mh: 210, mw: 150, tag: 'left:38%;top:214px' },
      { s: 'right:2%;top:24px', mh: 180, mw: 150, tag: 'right:5%;top:196px' },
    ];
    const date = new Date().toLocaleDateString(S.lang === 'zh' ? 'zh-CN' : 'en-CA', { weekday: 'long', month: 'short', day: 'numeric' });
    let h = `<header class="top home-top"><span class="date">${esc(date)}</span><span class="streak" title="${inl('Day streak', '连续天数')}"><b></b>${st} ${inl(st === 1 ? 'day' : 'days', '天')}</span>${sndBtn()}<button class="iconbtn" data-go="#/settings" aria-label="Settings">${I.gear}</button></header>
      <main class="home">
      <h1 class="h1">${rawT(title)}</h1>
      <div class="pile">${pile.map((c, i) => `<img class="stk" src="img/${esc(c.id)}.webp" alt="" draggable="false" style="position:absolute;${slots[i].s};max-height:${slots[i].mh}px;max-width:${slots[i].mw}px;--r:${[-12, -4, 9][i]}deg" onerror="this.style.visibility='hidden'"><span class="tag" style="${slots[i].tag};--r:${[-4, 3, 5][i]}deg">${esc(short(c.name))}</span>`).join('')}</div>
      <button class="go" data-act="start" data-deck="${deck}"><span>${inl('Start a round', '开始一轮')}<small>${deckName(deck)} · ${inl('10 questions, about 3 minutes', '10 题，大约 3 分钟')}</small></span><span class="arrow">${I.arrow}</span></button>
      <div class="shelves">${live.map(k => { const s = stats[k]; return `<button class="shelf" data-go="#/deck/${k}"><b>${deckName(k)}</b>${s.due ? `<span class="due">${s.due}</span>` : ''}<span class="cnt">${s.seen} / ${s.n}</span>${meter(s.seen / s.n * 100)}</button>`; }).join('')}</div>
      <div class="games">
        <button class="game" data-act="blitz"><span class="gi">${I.bolt}</span><b>${inl('60-second blitz', '60 秒快答')}</b><span>${S.blitzBest ? inl(`Best: ${S.blitzBest}`, `最高 ${S.blitzBest}`) : inl('True or false, fast', '对还是错，越快越好')}</span></button>
        ${(D.bags || []).length ? `<button class="game" data-act="bags"><img class="gimg" src="img/beta-blockers.webp" alt=""><b>${inl('Med bag detective', '药袋侦探')}</b><span>${inl('Read the bottles', '看药瓶，猜病人')}</span></button>` : ''}
      </div>
      <input class="search" id="q" type="search" placeholder="${inl('Find a drug or a pill', '查一个药')}" autocomplete="off" />
      <div id="found"></div>
      <p class="foot">${tx('Sources: EMALB Provincial Examination Guidelines (June 2026), BCEHS drug monographs, Nancy Caroline’s Emergency Care in the Streets. A study aid. On the road, the current BCEHS guideline and medical oversight decide.',
        '资料来源：EMALB 省考考纲（2026 年 6 月）、BCEHS 药物专论、Nancy Caroline 教材。这是学习工具，出车以现行 BCEHS 指南和医疗监督为准。')}<br><a href="../">${inl('Back to the main site', '回主站')}</a></p>
      </main>`;
    app.innerHTML = h;
    $('#q').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase(), found = $('#found');
      if (!q) { found.innerHTML = ''; return; }
      const hay = c => (c.name + ' ' + c.zh + ' ' + (c.brand || []).join(' ') + ' ' + (c.examples || []).map(x => x.g + ' ' + x.zh + ' ' + x.b).join(' ') + ' ' + (c.stem || '')).toLowerCase();
      const hits = DECK_ORDER.flatMap(deckCards).filter(c => hay(c).includes(q)).slice(0, 12);
      found.innerHTML = hits.length ? `<div class="hits">${hits.map(c => `<button class="hit" data-go="#/card/${key(c)}">${stk(c.id, 'thumb')}<span><b>${esc(c.name)}</b><small>${esc(c.zh)} · ${inl(DK[c.deck].tag.en, DK[c.deck].tag.zh)}</small></span></button>`).join('')}</div>`
        : `<p class="muted center">${inl('Nothing by that name.', '没找到这个名字。')}</p>`;
    });
  }

  function slot(c) {
    const seen = S.seen[key(c)];
    return `<button class="slot ${seen ? '' : 'unseen'}" data-go="#/card/${key(c)}"><span class="slot-img">${stk(c.id)}</span><span class="slot-name">${esc(short(c.name))}</span><span class="slot-stars">${seen ? stars(mastery(c)) : `<em>${inl('new', '未学')}</em>`}</span></button>`;
  }
  function viewDeck(dk) {
    const cards = deckCards(dk), s = deckStats(dk);
    let h = head(deckName(dk), '#/') + `<main class="deckpage">
      <p class="deck-sub">${T(DK[dk].sub)}</p>
      <button class="go" data-act="start" data-deck="${dk}"><span>${inl('Practice this shelf', '练这个药柜')}<small>${inl(`${s.seen} of ${s.n} learned`, `已学 ${s.seen}/${s.n}`)}${s.due ? ' · ' + inl(`${s.due} due`, `${s.due} 个待复习`) : ''}</small></span><span class="arrow">${I.arrow}</span></button>`;
    if (dk === 'home') {
      for (const g of Object.keys(GROUPS)) {
        const cs = cards.filter(c => c.group === g); if (!cs.length) continue;
        h += `<h2 class="grp">${inl(GROUPS[g][0], GROUPS[g][1])}</h2><div class="book">${cs.map(slot).join('')}</div>`;
      }
    } else h += `<div class="book">${cards.map(slot).join('')}</div>`;
    app.innerHTML = h + '</main>';
  }

  // pharmacy-label block: the dose and the hard stops, set like a dispensing label
  const whoTag = x => x.who && x.who !== 'all' ? `<span class="who">${inl(x.who === 'adult' ? 'ADULT' : 'CHILD', x.who === 'adult' ? '成人' : '儿童')}</span>` : '';
  const label = (left, right, items, stop) => items && items.length ? `<div class="label ${stop ? 'stop' : ''}"><div class="lh"><span>${left}</span><span>${right || ''}</span></div>${items.map(x => `<div class="ll ${x.key ? 'key' : ''}">${whoTag(x)}<span>${T(x)}</span></div>`).join('')}</div>` : '';
  const list = (en, zh, arr) => arr && arr.length ? `<section class="sec"><h3>${inl(en, zh)}</h3><ul>${arr.map(x => `<li>${T(x)}</li>`).join('')}</ul></section>` : '';
  const note = (en, zh, body, cls = '') => body ? `<div class="note ${cls}"><h3>${inl(en, zh)}</h3>${T(body)}</div>` : '';
  const pills = c => {
    const lvl = c.lvl ? `<span class="pill">${esc(c.lvl === 'ACP' ? 'BCEHS: ACP+' : c.lvl + '+')}</span>` : '';
    const noExam = c.deck === 'bcehs' && !CARD['emalb/' + c.id] ? `<span class="pill">${inl('Not on the exam', '执照考试不考')}</span>` : '';
    return lvl || noExam ? `<div class="pills">${lvl}${noExam}</div>` : '';
  };
  const nameBlock = c => `<div class="dname">${esc(c.name)}</div><div class="dzh">${esc(c.zh)}${c.brand && c.brand.length ? ' · ' + esc(c.brand.join(', ')) : ''}</div>
    <div class="namerow">${c.say ? `<button class="say" data-say="${esc(c.name)}">${I.spk}<span>${esc(c.say)}</span></button>` : ''}${c.stem ? `<span class="stemtag">${esc(c.stem)}</span>` : ''}</div>`;
  const examples = c => c.examples ? `<div class="exs">${c.examples.map(e => `<span><b>${esc(e.g)}</b> ${esc(e.zh)}${e.b ? ` <i>${esc(e.b)}</i>` : ''}</span>`).join('')}</div>` : '';
  const neverLabel = (c, onlyKey) => {
    const arr = (c.no || []).filter(x => !onlyKey || x.key);
    const shown = arr.length ? arr : (c.no || []);
    return label(isHome(c) ? inl('SHOULD NOT BE USED WITH', '这些情况不该用') : inl('NEVER GIVE IF', '这些情况绝对不给'), '', shown, true);
  };
  function viewCard(c) {
    const twinDeck = c.deck === 'emalb' ? 'bcehs' : c.deck === 'bcehs' ? 'emalb' : null;
    const sib = twinDeck && CARD[twinDeck + '/' + c.id];
    const tabs = sib ? `<div class="tabs">${['emalb', 'bcehs'].map(dk => `<button class="${dk === c.deck ? 'on' : ''}" data-go="#/card/${dk}/${c.id}">${inl(DK[dk].tag.en, DK[dk].tag.zh)}</button>`).join('')}</div>` : '';
    let b = `<div class="cardhero">${stk(c.id, 'big')}</div>${nameBlock(c)}${pills(c)}<p class="hook">${T(c.hook)}</p><p class="how">${T(c.how)}</p><p class="cls">${T(c.cls)}</p>`;
    if (isHome(c)) {
      b += examples(c) + list('If you find it, the patient probably has', '看到它，病人多半有', c.tells) + list('What it does for them', '它在治什么', c.use)
        + (c.medic ? `<div class="note"><h3>${inl('What it changes for you', '对你意味着什么')}</h3><ul>${c.medic.map(m => `<li>${T(m)}</li>`).join('')}</ul></div>` : '')
        + neverLabel(c) + list('Be careful', '要小心', c.care) + list('Side effects', '副作用', c.fx);
    } else {
      b += list('Give it for', '什么时候给', c.use) + label(esc(short(c.name).toUpperCase()), inl(DK[c.deck].tag.en.toUpperCase(), DK[c.deck].tag.zh), c.dose)
        + (c.pk ? `<p class="pk">${T(c.pk)}</p>` : '') + neverLabel(c) + list('Be careful', '要小心', c.care) + list('Side effects', '副作用', c.fx);
    }
    b += note('Teacher says', '老师说', c.pearl, 'teacher');
    if (c.diff) b += note(c.deck === 'emalb' ? 'Exam vs the road' : 'The road vs the exam', c.deck === 'emalb' ? '考试和出车的差别' : '出车和考试的差别', c.diff, 'diff');
    b += `<p class="srcline">${esc(c.src || '')}</p>`;
    app.innerHTML = head('', '#/deck/' + c.deck) + `<main class="cardpage"><div class="cardtools">${tabs}<span class="sp"></span>${zhChip()}</div>${b}
      <div class="stick"><button class="go" data-act="startcard" data-card="${key(c)}"><span>${inl('Practice this one', '就练这个')}</span><span class="arrow">${I.arrow}</span></button></div></main>`;
  }

  /* ---------------- play ---------------- */
  const segs = () => {
    const n = R.steps.length;
    if (n > 18) return `<div class="segs cont">${meter(R.i / n * 100)}</div>`;
    return `<div class="segs">${R.steps.map((s, i) => `<i class="${i < R.i ? 'on' : i === R.i ? 'now' : ''}"></i>`).join('')}</div>`;
  };
  const playTop = extra => `<div class="bar"><button class="x" data-act="quit" aria-label="Close">${I.cross}</button>${segs()}${extra === undefined ? `<span class="combo">${R.combo >= 2 ? '×' + R.combo : ''}</span>` : extra}${sndBtn()}</div>`;
  const HIDE_NAME = ['hook', 'stem', 'brand'];
  function viewPlay() {
    app.classList.remove('peek');
    if (R.i >= R.steps.length) return viewDone();
    const st = R.steps[R.i];
    if (st.t === 'learn') return viewLearn(st);
    const it = st.item, c = it.card, q = st.q || (st.q = build(it));
    if (!q) { R.i++; return viewPlay(); }
    const hide = HIDE_NAME.includes(it.type), call = ['gh', 'pick', 'bag'].includes(it.type);
    const what = hide || it.type === 'bag' ? inl(DK[c.deck].tag.en, DK[c.deck].tag.zh) : esc(short(c.name)) + ' · ' + inl(DK[c.deck].tag.en, DK[c.deck].tag.zh);
    let h = playTop() + `<div class="stage">
      <div class="qhd">${call ? '<i class="dot"></i>' : ''}<span>${call ? inl('Call', '出车') + ' · ' : ''}${what}</span>${st.retry ? `<span class="again">${inl('again', '再来')}</span>` : ''}<span class="sp"></span>${zhChip()}</div>`;
    if (q.stem) h += `<div class="bubble">${T(q.stem)}</div>`;
    if (q.meds) h += `<div class="medrow">${q.meds.map(m => `<span class="med">${stk(m.id, 'mid')}<span class="tag">${esc(m.label)}</span></span>`).join('')}</div>`;
    if (q.quote) h += `<div class="quote">${T(q.quote)}</div>`;
    if (q.ui === 'two') {
      h += `<div class="herostk">${hide ? '' : stk(c.id, 'hero')}<span class="stamp" hidden></span></div><div class="ask center">${T(q.ask)}</div>`;
      h += q.mode === 'gh'
        ? `<div class="two"><button class="give" data-two="1">${inl('Give', '给')}</button><button class="hold" data-two="0">${inl('Hold', '不给')}</button></div>`
        : `<div class="two"><button class="give" data-two="1">${inl('True', '对')}</button><button class="hold" data-two="0">${inl('False', '错')}</button></div>`;
    } else {
      h += `<div class="askrow"><div class="ask">${T(q.ask)}</div>${hide || q.meds ? '' : stk(c.id, 'mini')}</div>`;
      if (q.ui === 'opts') h += `<div class="opts">${q.opts.map((o, i) => `<button class="opt" data-ans="${i}">${T(o.t)}</button>`).join('')}</div>`;
      if (q.ui === 'chips') h += `<div class="chips">${q.chips.map((o, i) => `<button class="chip" data-chip="${i}">${T(o.t)}</button>`).join('')}</div><div id="chk"><button class="nextbtn wide" data-act="check" disabled>${inl('Check', '检查')}</button></div>`;
    }
    h += `<div id="sheet"></div></div>`;
    app.innerHTML = h;
    window.scrollTo(0, 0);
  }
  function answered(ok, detail) {
    const st = R.steps[R.i], it = st.item, q = st.q, c = it.card;
    $('.stage').classList.add('locked');
    if (!st.retry) { grade(it, ok); R.first++; if (ok) R.right++; }
    if (ok) { R.combo++; R.best = Math.max(R.best, R.combo); } else { R.combo = 0; if (!st.retry) R.steps.push({ t: 'q', item: it, retry: true }); }
    save(); sfx(ok ? 'ok' : 'no', R.combo); if (!ok) buzz(70);
    const cb = $('.combo'); if (cb) cb.textContent = R.combo >= 2 ? '×' + R.combo : '';
    if (q.mode === 'gh') { const s = $('.stamp'); if (s) { s.textContent = q.a ? inl('GIVE', '给') : inl('HOLD', '不给'); s.className = 'stamp ' + (q.a ? 'g' : 'h'); s.hidden = false; } }
    const p = pick([['Right call.', '判断对了。'], ['Exactly.', '没错。'], ['Nailed it.', '漂亮。'], ['Yes.', '对。']]);
    const chk = $('#chk'); if (chk) chk.remove();
    const holdLabel = q.mode === 'gh' && !isHome(c) && (c.no || []).some(x => x.key && !/^none/i.test(x.en)) ? neverLabel(c, true) : '';
    $('#sheet').innerHTML = `<div class="sheet ${ok ? 'ok' : 'no'}"><div class="verdict"><b>${ok ? I.check : I.cross}</b>${ok ? inl(p[0], p[1]) : inl('Not quite.', '不对。')}</div>
      ${!ok && q.bad ? `<p class="conseq">${T(q.bad)}</p>` : ''}${!ok && detail ? `<p class="ans">${detail}</p>` : ''}
      ${q.why ? `<p class="why">${T(q.why)}</p>` : ''}${holdLabel}
      <div class="next">${zhChip()}<span class="sp"></span><button class="nextbtn" data-act="next">${inl('Continue', '继续')} ${I.arrow}</button></div></div>`;
    const sh = $('.sheet'); if (sh && sh.scrollIntoView) sh.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
  function learnBody(c, p) { // three short screens; the full card and the questions carry the rest
    if (p === 0) return `<div class="cardhero">${stk(c.id, 'big')}</div>${nameBlock(c)}${pills(c)}<p class="hook">${T(c.hook)}</p><p class="how">${T(c.how)}</p>${isHome(c) ? examples(c) : ''}`;
    if (p === 1) {
      if (isHome(c)) return `<div class="learnname">${stk(c.id, 'mini')}<b>${esc(c.name)}</b></div>` + list('If you find it, the patient probably has', '看到它，病人多半有', c.tells)
        + `<div class="note"><h3>${inl('What it changes for you', '对你意味着什么')}</h3><ul>${(c.medic || []).slice(0, 2).map(m => `<li>${T(m)}</li>`).join('')}</ul></div>`;
      const more = (c.dose || []).length - 3;
      return `<div class="learnname">${stk(c.id, 'mini')}<b>${esc(c.name)}</b></div>` + list('Give it for', '什么时候给', c.use) + label(esc(short(c.name).toUpperCase()), inl(DK[c.deck].tag.en.toUpperCase(), DK[c.deck].tag.zh), (c.dose || []).slice(0, 3))
        + (more > 0 ? `<p class="pk">${inl(`${more} more dose line${more > 1 ? 's' : ''} on the full card.`, `完整药卡里还有 ${more} 条剂量说明。`)}</p>` : '');
    }
    const keys = (c.no || []).filter(x => x.key), rest = (c.no || []).length - (keys.length || (c.no || []).length);
    return `<div class="learnname">${stk(c.id, 'mini')}<b>${esc(c.name)}</b></div>` + neverLabel(c, true)
      + (rest > 0 ? `<p class="pk">${inl(`Plus ${rest} more on the full card. The questions will bring them up.`, `完整药卡里还有 ${rest} 条，做题时会遇到。`)}</p>` : '')
      + note('Teacher says', '老师说', c.pearl, 'teacher');
  }
  function viewLearn(st) {
    const c = st.card, p = st.p || 0;
    app.innerHTML = playTop('<span class="combo"></span>') + `<div class="stage learn">
      <div class="qhd"><span class="newtag">${inl('New drug', '新药')}</span><span>${inl(DK[c.deck].tag.en, DK[c.deck].tag.zh)}</span><span class="sp"></span>${zhChip()}</div>
      ${learnBody(c, p)}
      <div class="dots">${[0, 1, 2].map(i => `<i class="${i === p ? 'on' : ''}"></i>`).join('')}</div>
      <div class="stick"><button class="go" data-act="learnnext"><span>${p < 2 ? inl('Next', '下一页') : inl('Got it. Quiz me', '记住了，考我')}</span><span class="arrow">${I.arrow}</span></button></div></div>`;
    window.scrollTo(0, 0);
  }
  function viewDone() {
    const acc = R.first ? Math.round(R.right / R.first * 100) : 0, st = curStreak();
    const back = c => { const r = crec(c); if (!r) return ''; const d = r.due - today(); return d <= 0 ? inl('again today', '今天再练') : d === 1 ? inl('back tomorrow', '明天再见') : inl(`back in ${d} days`, `${d} 天后再见`); };
    const fan = R.cards.slice(0, 5);
    const msg = acc >= 90 ? ['Sharp.', '很稳。'] : acc >= 70 ? ['Solid round.', '这轮不错。'] : ['The misses come back tomorrow.', '错的明天会再出现。'];
    const sub = acc >= 70 ? ['That is how it sticks.', '就是这样记住的。'] : ['That is how it sticks.', '这样才记得住。'];
    const cleared = R.dueAtStart > 0 && !dueCards(deckCards(R.scope.deck)).length, todayDone = R.dayDone || cleared;
    const todayLine = !todayDone ? '' : `<p class="todaydone">${I.check}${R.dayDone ? inl(`Today's practice done. ${st}-day streak.`, `今天的练习完成了，连续 ${st} 天。`) : inl('Every drug due on this shelf is reviewed.', '这一栏今天要复习的药都做完了。')}</p>`;
    app.innerHTML = `<main class="done">
      <div class="fan">${fan.map((c, i) => stk(c.id, 'fanstk', `--r:${(i - (fan.length - 1) / 2) * 9}deg;z-index:${10 - Math.abs(i - 2)}`)).join('')}</div>
      <div class="score">${acc}<small>%</small></div><h2 class="h2">${inl(msg[0], msg[1])}</h2><p class="muted center">${inl(sub[0], sub[1])}</p>${todayLine}
      <div class="stats"><div><b>${R.right}/${R.first}</b><span>${inl('first try', '一次答对')}</span></div><div><b>×${R.best}</b><span>${inl('best combo', '最长连对')}</span></div><div><b>${st}</b><span>${inl('day streak', '天连续')}</span></div></div>
      ${R.cards.length ? `<div class="gain">${R.cards.map(c => `<div>${stk(c.id, 'thumb')}<span class="gname">${esc(short(c.name))}${R.learned.includes(c) ? ` <em>${inl('new', '新')}</em>` : ''}</span><span class="gstars">${stars(mastery(c))}</span><span class="gback">${back(c)}</span></div>`).join('')}</div>` : ''}
      <button class="go" data-act="again"><span>${inl('One more round', '再来一轮')}</span><span class="arrow">${I.arrow}</span></button>
      <button class="ghostbtn" data-go="#/">${inl('Done for now', '先到这儿')}</button></main>`;
    sfx(todayDone ? 'today' : 'round');
    if (acc >= 80 || todayDone) confetti();
    const keep = R.scope; R = null; viewDone.scope = keep;
    window.scrollTo(0, 0);
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = ['#DCEB3F', '#0E6A44', '#15181B', '#DCEB3F', '#C8402B'];
    for (let i = 0; i < 36; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = cols[i % 5]; s.style.animationDuration = 1.4 + Math.random() * 1.6 + 's'; s.style.animationDelay = Math.random() * 0.4 + 's'; box.appendChild(s); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
  }

  /* ---------------- 60-second blitz ---------------- */
  function startBlitz() {
    let cards = DECK_ORDER.flatMap(deckCards).filter(c => S.seen[key(c)]);
    if (cards.length < 3) cards = DECK_ORDER.flatMap(deckCards);
    const pool = shuffle(cards.flatMap(c => (c.tf || []).map(d => ({ c, d }))));
    if (!pool.length) return;
    R = { blitz: true, pool, i: 0, score: 0, n: 0, combo: 0, miss: [], end: Date.now() + 60000 };
    R.timer = setInterval(() => { if (!R || !R.blitz) return; const left = Math.max(0, Math.ceil((R.end - Date.now()) / 1000)); const el = $('.clock'); if (el) el.textContent = left + 's'; const m = $('.bar .meter i'); if (m) m.style.width = (left / 60 * 100) + '%'; if (left <= 0) endBlitz(); }, 250);
    location.hash = '#/play'; render();
  }
  function viewBlitz() {
    if (R.over) return;
    const x = R.pool[R.i % R.pool.length], left = Math.max(0, Math.ceil((R.end - Date.now()) / 1000));
    app.innerHTML = `<div class="bar"><button class="x" data-act="quit" aria-label="Close">${I.cross}</button><div class="segs cont">${meter(left / 60 * 100)}</div><span class="clock">${left}s</span>${sndBtn()}</div>
      <div class="stage blitz" id="bz"><div class="qhd"><span>${esc(short(x.c.name))} · ${inl(DK[x.c.deck].tag.en, DK[x.c.deck].tag.zh)}</span><span class="sp"></span><b class="bscore">${R.score}</b></div>
      <div class="herostk">${stk(x.c.id, 'mid')}</div>
      <div class="blitz-s">${T(x.d.s)}</div>
      <div class="two"><button class="give" data-bz="1">${inl('True', '对')}</button><button class="hold" data-bz="0">${inl('False', '错')}</button></div></div>`;
  }
  function endBlitz() {
    clearInterval(R.timer); R.over = true;
    const best = R.score > (S.blitzBest || 0); if (best) { S.blitzBest = R.score; save(); }
    app.innerHTML = `<main class="done"><div class="score">${R.score}</div><h2 class="h2">${best ? inl('New best.', '新纪录。') : inl(`Best so far: ${S.blitzBest}`, `目前最高：${S.blitzBest}`)}</h2>
      <p class="muted center">${inl(`${R.n} answered in 60 seconds`, `60 秒答了 ${R.n} 题`)}</p>
      ${R.miss.length ? `<h3 class="grp">${inl('Worth another look', '值得再看一眼')}</h3><div class="missed">${R.miss.slice(0, 8).map(m => `<div>${stk(m.c.id, 'thumb')}<p><b>${esc(short(m.c.name))}</b> ${T(m.d.s)}<span class="fix">${T(m.d.why)}</span></p></div>`).join('')}</div>` : ''}
      <button class="go" data-act="blitz"><span>${inl('Again', '再来')}</span><span class="arrow">${I.arrow}</span></button><button class="ghostbtn" data-go="#/">${inl('Home', '回首页')}</button></main>`;
    sfx(best && R.score >= 8 ? 'today' : 'round');
    if (best && R.score >= 8) confetti();
    R = null; window.scrollTo(0, 0);
  }

  /* ---------------- settings ---------------- */
  function viewSettings() {
    const seg = (name, cur, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-set="${name}" data-val="${v}">${l}</button>`).join('')}</div>`;
    const answered = Object.values(S.items).reduce((s, r) => s + r.n, 0);
    app.innerHTML = head(inl('Settings', '设置'), '#/') + `<main class="settings">
      <div class="set"><div class="row"><span>${inl('Language', '语言')}</span>${seg('lang', S.lang, [['en', 'EN'], ['both', 'EN+中'], ['zh', '中文']])}</div>
      <p class="hint">${inl('In EN, tap 中文 on any question to see the Chinese.', '选 EN 时，题目上点「中文」就能看中文。')}</p>
      <div class="row"><span>${inl('Sound', '声音')}</span>${seg('sound', S.sound ? '1' : '0', [['0', inl('Off', '关')], ['1', inl('On', '开')]])}</div></div>
      <div class="set"><div class="row"><span>${inl('Questions answered', '累计答题')}</span><b>${answered}</b></div><div class="row"><span>${inl('Longest streak', '最长连续')}</span><b>${S.streak.best || 0}</b></div></div>
      <div class="set"><div class="row"><span>${inl('Add to your home screen', '添加到手机桌面')}</span></div><p class="hint">${inl('iPhone: Share, then Add to Home Screen. Android: menu, then Add to Home screen. It opens like an app and works offline.', 'iPhone：点分享，再点「添加到主屏幕」。安卓：点菜单，再点「添加到主屏幕」。之后像 App 一样打开，没网也能用。')}</p></div>
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
      save(); if (S.sound) sfx('ok'); return render();
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
      R.n++; if (ok) { R.score++; R.combo++; } else { R.miss.push(x); R.combo = 0; buzz(50); }
      sfx(ok ? 'ok' : 'no', R.combo); R.i++; viewBlitz();
      const s = $('#bz'); if (s) s.classList.add(ok ? 'flash-ok' : 'flash-no'); return;
    }
    switch (b.dataset.act) {
      case 'snd': S.sound = !S.sound; save(); document.querySelectorAll('.snd').forEach(el => { el.outerHTML = sndBtn(); }); if (S.sound) sfx('ok'); return;
      case 'peek': app.classList.toggle('peek'); return;
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
