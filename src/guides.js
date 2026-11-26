// The official-guideline pages other than the treatment topics: protocols, drug sheets, the assessment model and the
// quick reference. Same picture-first card as a treatment topic (.ddx.tc) and the same sticker list (.ddx.tl), drawn
// straight from the existing data files: nothing here is new content, only a new way of showing it.
import { S, biList, t, esc, loadJSON } from './app.js?v=92';
import { two, one, mini, stk } from './home.js?v=92';

const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const X_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const FOOT = extra => `<p class="foot">${one('BC Provincial Examination Guidelines, June 15, 2026.', 'BC 官方考试指南（2026 年 6 月 15 日版）。')}${extra || ''}</p>`;
const back = (href, en, zh) => `<a class="tc-back" href="${href}">← ${one(en, zh)}</a>`;
const kick = (en, zh, pcp) => `<p class="kick sec">${pcp ? '<i class="pcp">PCP</i>' : ''}${one(en, zh)}</p>`;
const pair = (en, zh) => (en || []).map((x, i) => [x, (zh || [])[i] || x]);
const marked = (cls, ico, title, rows) => rows.length ? `<section class="tc-b ${cls}">${title}<ul>${rows.map(([en, zh]) => `<li><i>${ico}</i><span>${two(esc(en), esc(zh))}</span></li>`).join('')}</ul></section>` : '';
const ticks = (title, rows, cls = '') => marked('tc-ticks ' + cls, TICK, title, rows);
const never = (title, rows) => marked('tc-never', X_ICO, title, rows);
const pageNo = v => esc(Array.isArray(v) ? v.join(', ') : (v ?? ''));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hero = (kickHtml, h1, pic, line) => `<header class="tc-hero"><div><p class="kick">${kickHtml}</p><h1 class="h1">${h1}</h1></div>${pic ? stk(pic, 6) : ''}</header>${line ? `<p class="tc-line">${line}</p>` : ''}`;
// a long guideline sentence as a bold lead and a smaller rest: cut at the first bracket, semicolon or colon
function cut(s) {
  if (S.lang === 'both') return [s, ''];   // two languages already make two lines
  const m = /^(.{4,}?)(;\s|；|:\s|：)(.+)$/.exec(s);
  const tail = /^(.{4,}?)\s?([(（][^()（）]+[)）])$/.exec(s);   // a bracket that closes the sentence
  if (tail && (!m || tail[1].length <= m[1].length)) return [tail[1], tail[2]];
  return m ? [m[1], m[3]] : [s, ''];
}

/* the questions, one at a time: tap an answer, see why, go on (same markup as a treatment card) */
function runQuiz(box, make) {
  let qs = make(), i = 0, right = 0;
  const show = () => {
    if (!qs.length) { box.closest('.tc-quiz').remove(); return; }
    if (i >= qs.length) {
      box.innerHTML = `<p class="qn">${one(`${right} of ${qs.length} right`, `答对 ${right} / ${qs.length}`)}</p>
        <p class="q">${right === qs.length ? two('All of them.', '全对。') : two('Look at the page once more, then try again.', '再看一眼上面，然后重来一次。')}</p>
        <button class="nextbtn" id="tcAgain">${one('Again', '再来一次')}</button>`;
      box.querySelector('#tcAgain').onclick = () => { qs = make(); i = 0; right = 0; show(); };
      return;
    }
    const q = qs[i];
    box.innerHTML = `<p class="qn">${i + 1} / ${qs.length}</p><p class="q">${q.q}</p>${q.quote ? `<p class="qq">${q.quote}</p>` : ''}
      <div class="opts${q.short ? ' short' : ''}">${q.opts.map((o, k) => `<button data-k="${k}">${o}</button>`).join('')}</div><div class="why" hidden></div>`;
    box.querySelectorAll('.opts button').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === q.a;
      if (ok) right++;
      box.querySelectorAll('.opts button').forEach((o, n) => { o.disabled = true; if (n === q.a) o.classList.add('ok'); else if (n === k) o.classList.add('no'); });
      const why = box.querySelector('.why');
      why.hidden = false;
      why.innerHTML = `<p class="${ok ? 'ok' : 'no'}"><b>${ok ? one('Right.', '对。') : one('Not this one.', '不是这个。')}</b> ${q.why}</p>
        <button class="nextbtn" id="tcNext">${i + 1 < qs.length ? one('Next', '下一题') : one('Done', '看结果')}</button>`;
      why.querySelector('#tcNext').onclick = () => { i++; show(); };
    });
  };
  show();
}
const quizBox = () => `<section class="tc-b tc-quiz"><p class="kick sec">${one('Your turn', '考考你')}</p><div class="qz" id="tcQuiz"></div></section>`;
// three options with the right one somewhere among them
function options(rightHtml, wrongHtml) {
  const opts = shuffle([rightHtml, ...wrongHtml.slice(0, 2)]);
  return { opts, a: opts.indexOf(rightHtml) };
}

/* ---------------- protocols ---------------- */
const PROTO_PIC = {
  'respiratory-arrest': './img/treat/respiratory-arrest.webp', 'altered-mental-status-nyd': './img/treat/altered-mental-status-nyd.webp',
  anaphylaxis: './drugs/img/epinephrine-autoinjector.webp', 'cardiac-arrest': './img/treat/adult-cpr-aed.webp',
  'cardiac-chest-pain': './img/treat/cardiac-chest-pain.webp', 'diabetic-emergencies': './img/treat/diabetic-emergencies.webp',
  'fluid-resuscitation': './img/treat/iv-procedures.webp', 'hemorrhage-control': './img/treat/hemorrhage-control.webp',
  'nausea-vomiting': './img/treat/nausea-vomiting.webp', 'pain-management': './drugs/img/entonox.webp',
  'shortness-of-breath-suspected': './img/treat/sob-asthma-copd.webp', 'narcotic-overdose': './drugs/img/naloxone.webp',
  'environmental-emergencies': './img/treat/hypothermia.webp',
};
// "3. (PCP) Consider vascular access" -> { pcp: true, en: 'Consider vascular access', ... }
function protoSteps(p) {
  const strip = s => s.replace(/^\d+\.\s*/, '');
  const isPcp = s => /^[（(]PCP[）)]/.test(s);
  return (p.stepsEn || []).map((en, i) => {
    const e = strip(en), z = strip((p.stepsZh || [])[i] || en);
    return { pcp: isPcp(e), en: e.replace(/^\(PCP\)\s*/, ''), zh: z.replace(/^[（(]PCP[）)]\s*/, '') };
  }).filter(st => !(st.pcp && S.track !== 'pcp'));
}
function protoDeductions(p) {
  return (p.commonDeductionsEn || []).map((en, i) => {
    const zh = (p.commonDeductionsZh || [])[i] || en, m = / - (\d+)%$/.exec(en);
    return m ? { pct: +m[1], en: en.slice(0, m.index), zh: zh.replace(/\s*——\s*扣\s*\d+%$/, '') } : { pct: null, en, zh };
  });
}
export async function sProtocols(el, params) {
  const d = await loadJSON('./data/study/protocols.json');
  if (!d) { el.innerHTML = `<div class="card"><p class="muted">${t('This module is deploying — check back shortly.', '该模块内容部署中，稍后再来。')}</p></div>`; return; }
  const p = params.id && d.protocols.find(x => x.id === params.id);
  if (p) { await drawProtocol(el, p); return; }
  const list = d.protocols.filter(x => !(x.licence === 'pcp' && S.track === 'emr'));
  el.innerHTML = `<div class="ddx hm tl lang-${S.lang}"><main>
    ${back('#/study/guidelines', 'Guidelines', '考纲')}
    <header class="hm-hero"><div class="hm-head">
      <p class="kick">${S.track.toUpperCase()} · ${one('Protocols', '处置协议')}</p>
      <h1 class="h1">${two(`<span class="ph">${list.length} protocols. </span><span class="ph">The examiner <em>marks by them</em>.</span>`, `<span class="ph">${list.length} 条协议，</span><span class="ph">考官<em>按它打分</em>。</span>`)}</h1>
    </div></header>
    <div class="hm-tiles tl-tiles" style="margin-top:16px">${list.map((x, n) => `<a class="hm-tile" href="#/study/protocols?id=${x.id}">${stk(PROTO_PIC[x.id] || './img/home/protocol.webp', [-5, 4, -3, 5][n % 4])}<b>${two(esc(x.nameEn), esc(x.nameZh))}</b>${x.licence === 'pcp' ? '<small>PCP</small>' : ''}</a>`).join('')}</div>
    ${FOOT('<br>' + one('Each page: when to use it, the steps in order, and where the marks go.', '每一页：什么时候用、按顺序做什么、哪里会扣分。'))}
  </main></div>`;
}
async function drawProtocol(el, p) {
  const steps = protoSteps(p), deds = protoDeductions(p);
  const dData = (p.drugs || []).length ? await loadJSON('./data/study/drugs.json') : null;
  const drugs = (p.drugs || []).map(id => dData && dData.drugs.find(x => x.id === id)).filter(Boolean)
    .filter(dr => (dr.licence || []).some(l => l.toLowerCase() === S.track));
  const tone = pct => pct == null ? '' : pct >= 100 ? 'bad' : pct >= 15 ? 'warn' : '';
  el.innerHTML = `<div class="ddx hm tc gd lang-${S.lang}"><main>
    ${back('#/study/protocols', 'Protocols', '处置协议')}
    ${hero(`${one('Protocol', '协议')}${p.licence === 'pcp' ? ' · PCP' : ''}`, two(esc(p.nameEn), esc(p.nameZh)), PROTO_PIC[p.id])}
    <div class="tc-grid">
      ${ticks(kick('Use it when', '什么时候用'), pair(p.indicationsEn, p.indicationsZh))}
      ${never(kick('Contraindications', '禁忌'), pair(p.contraindicationsEn, p.contraindicationsZh))}
      <section class="tc-b tc-ladder long">${kick('The steps', '步骤')}<ol>${steps.map((st, i) => {
        const [mEn, sEn] = cut(st.en), [mZh, sZh] = cut(st.zh);
        return `<li><i>${i + 1}</i><span><b>${two(esc(mEn), esc(mZh))}${st.pcp ? ' <em class="pcp">PCP</em>' : ''}</b>${sEn || sZh ? `<small>${mini(esc(sEn), esc(sZh))}</small>` : ''}</span></li>`;
      }).join('')}</ol></section>
      ${deds.length ? `<section class="tc-b tc-bands">${kick('Where the marks go', '哪里会扣分')}<div class="bd stack gdr">${deds.map(x => `<div class="${tone(x.pct)}"><b>${x.pct == null ? mini('Note', '注意') : '−' + x.pct + '%'}</b><small>${two(esc(x.en), esc(x.zh))}</small></div>`).join('')}</div></section>` : ''}
      ${p.emrPcpDiffEn ? `<section class="tc-b">${kick('EMR and PCP', 'EMR 和 PCP 的差别')}<div class="phs gd-note"><p>${two(esc(p.emrPcpDiffEn), esc(p.emrPcpDiffZh))}</p></div></section>` : ''}
      ${drugs.length ? `<section class="tc-b gd-wide">${kick('The drugs in this protocol', '这条协议用到的药')}<div class="hm-tiles gd-tiles">${drugs.map((dr, n) => drugTile(dr, n)).join('')}</div></section>` : ''}
      ${quizBox()}
    </div>
    ${FOOT(` ${one(`Page ${pageNo(p.sourcePages)}.`, `第 ${pageNo(p.sourcePages)} 页。`)}`)}
  </main></div>`;
  // questions made from this protocol's own deduction lines: what does this slip cost
  runQuiz(el.querySelector('#tcQuiz'), () => shuffle(deds.filter(x => x.pct != null)).slice(0, 4).map(x => {
    const wrong = shuffle([100, 25, 15, 10, 5].filter(v => v !== x.pct)).slice(0, 2);
    return { q: one('What does this cost you?', '这样做，扣多少？'), quote: two(esc(x.en), esc(x.zh)), short: true,
      ...options('−' + x.pct + '%', wrong.map(v => '−' + v + '%')),
      why: x.pct >= 100 ? one('100% off: the station is failed on the spot.', '扣 100%：这一站当场不过。') : one(`${x.pct}% off. The pass mark is 70%.`, `扣 ${x.pct}%。及格线是 70%。`) };
  }));
}

/* ---------------- drug sheets ---------------- */
const DRUG_ZH = { entonox: '笑气', d10w: '10% 葡萄糖', 'oral-glucose': '口服葡萄糖', 'epinephrine-nebulized': '雾化肾上腺素' };
function drugName(dr) {   // a short name pair for a tile: "Naloxone" / "纳洛酮"
  const en = dr.nameEn.replace(/\s*\(.*$/, '');
  const m = /（([^）]+)）/.exec(dr.nameZh || '');
  const zh = DRUG_ZH[dr.id] || (m ? m[1].split(/[，/〔]/)[0].trim() : '');
  return S.lang === 'en' || !zh ? esc(en) : `${esc(en)}<span class="zh">${esc(zh)}</span>`;
}
const drugPic = dr => `./drugs/img/${dr.id === 'epinephrine-nebulized' ? 'epinephrine' : dr.id}.webp`;
const drugTile = (dr, n) => `<a class="hm-tile" href="#/study/drugs?id=${dr.id}">${stk(drugPic(dr), [-5, 4, -3, 5][n % 4])}<b>${drugName(dr)}</b></a>`;
export async function sDrugs(el, params) {
  const [d, add] = await Promise.all([loadJSON('./data/study/drugs.json'), loadJSON('./data/study/drugs-added.json')]);
  if (!d) { el.innerHTML = `<div class="card"><p class="muted">${t('This module is deploying — check back shortly.', '该模块内容部署中，稍后再来。')}</p></div>`; return; }
  const added = add ? add.drugs : [];
  const dr = params.id && (d.drugs.find(x => x.id === params.id) || added.find(x => x.id === params.id));
  if (dr) { drawDrug(el, dr); return; }
  const mine = d.drugs.filter(x => (x.licence || []).some(l => l.toLowerCase() === S.track));
  const others = d.drugs.filter(x => !mine.includes(x));
  const grid = xs => `<div class="hm-tiles tl-tiles">${xs.map(drugTile).join('')}</div>`;
  el.innerHTML = `<div class="ddx hm tl lang-${S.lang}"><main>
    ${back('#/study/guidelines', 'Guidelines', '考纲')}
    <header class="hm-hero"><div class="hm-head">
      <p class="kick">${S.track.toUpperCase()} · ${one('Drug sheets', '药物专论')}</p>
      <h1 class="h1">${two(`<span class="ph">The exam has </span><span class="ph"><em>${d.drugs.length} drugs</em>.</span>`, `<span class="ph">执照考试</span><span class="ph">只考这 <em>${d.drugs.length} 种药</em>。</span>`)}</h1>
    </div></header>
    <p class="kick sec">${one('Yours to give', '你能给的')} · ${mine.length}</p>${grid(mine)}
    ${others.length ? `<p class="kick sec">${one('Beyond your scope (know them by sight)', '超出你的范围（要认得）')} · ${others.length}</p>${grid(others)}` : ''}
    ${added.length ? `<p class="kick sec">${one('School course only, not on the licensing exam', '学校课程才考，执照考试不考')} · ${added.length}</p>${grid(added)}
      <p class="foot" style="margin-top:12px">${one('BCEHS added scope: drugs a BC PCP gives after Schedule 1 / 2 training. On the licensing exam, answer with the drugs above.', 'BCEHS 扩展范围：BC 的 PCP 完成 Schedule 1 / 2 培训后可以给的药。执照考试只按上面的药作答。')}</p>` : ''}
    <a class="nextbtn wide gd-cta" href="./drugs/">${one('Practise them in Drug Drill', '去药箱练这些药')} →</a>
    ${FOOT()}
  </main></div>`;
}
function drawDrug(el, dr) {
  const dose = dr.doseEn || {}, doseZh = dr.doseZh || {};
  const LBL = { adult: ['Adult', '成人'], pediatric: ['Child', '儿童'], repeat: ['Repeat', '重复'], max: ['Max', '最大量'] };
  const rows = Object.entries(dose).filter(([, v]) => v);
  const fact = (en, zh, vEn, vZh) => vEn ? `<div><i>${mini(en, zh)}</i><span>${two(esc(vEn), esc(vZh || vEn))}</span></div>` : '';
  const added = dr.scope === 'bcehs-added';
  // the headline: the English name, with the Chinese name under it ("Naloxone（纳洛酮 / Narcan）" -> "纳洛酮 / Narcan")
  const zhName = (dr.nameZh || '').replace(/^[A-Za-z0-9 /%()-]+(?=[（一-鿿])/, '').replace(/^（([^（）]+)）$/, '$1');
  const h1 = S.lang === 'en' || !zhName ? esc(dr.nameEn) : `${esc(S.lang === 'zh' ? dr.nameEn.replace(/\s*\(.*$/, '') : dr.nameEn)}<span class="zh">${esc(zhName)}</span>`;
  const tips = (arr, rx) => (arr || []).map(x => x.replace(rx, ''));
  el.innerHTML = `<div class="ddx hm tc gd lang-${S.lang}"><main>
    ${back('#/study/drugs', 'Drug sheets', '药物专论')}
    ${hero(`${one('Drug', '药物')} · ${(dr.licence || []).join(' ')}${(dr.routes || []).length ? ' · ' + dr.routes.map(esc).join(' ') : ''}`, h1, drugPic(dr),
      dr.whatEn ? two(esc(dr.whatEn), esc(dr.whatZh)) : '')}
    ${added ? `<p class="gd-flag">${one('BCEHS added scope: taught and tested in the school course, not on the EMALB licensing exam.', 'BCEHS 扩展范围：学校课程会教会考，EMALB 执照考试不考。')}</p>` : ''}
    <div class="tc-grid">
      ${ticks(kick('Give it for', '什么时候给'), pair(dr.indicationsEn, dr.indicationsZh))}
      ${never(kick('Never if', '这些情况不能给'), pair(dr.contraindicationsEn, dr.contraindicationsZh))}
      ${rows.length ? `<section class="tc-b tc-bands">${kick('Dose', '剂量')}<div class="bd stack gdr">${rows.map(([k, v]) => `<div><b>${mini(...(LBL[k] || [k, k]))}</b><small>${two(esc(v), esc(doseZh[k] || v))}</small></div>`).join('')}</div></section>` : ''}
      ${ticks(kick('Careful with', '慎用'), pair(dr.cautionsEn, dr.cautionsZh), 'warn')}
      ${ticks(kick('Side effects', '副作用'), pair(dr.sideEffectsEn, dr.sideEffectsZh), 'dot')}
      ${ticks(kick('On the exam', '考试要点'), pair(tips(dr.examTipsEn, /^Exam tip:\s*/i), tips(dr.examTipsZh, /^备考提示[:：]\s*/)))}
      ${ticks(kick('Notes', '备注'), pair(dr.notesEn, dr.notesZh), 'dot')}
      ${dr.classificationEn || dr.onsetEn ? `<section class="tc-b tc-phases gd-facts">${kick('At a glance', '一眼看完')}<div class="phs">${fact('Class', '分类', dr.classificationEn, dr.classificationZh)}${fact('Onset', '起效', dr.onsetEn, dr.onsetZh)}</div></section>` : ''}
    </div>
    <a class="nextbtn wide gd-cta" href="./drugs/">${one('Practise it in Drug Drill', '去药箱练这个药')} →</a>
    ${FOOT(' ' + (dr.sourceUrl ? `<a href="${dr.sourceUrl}" target="_blank" rel="noopener">BCEHS Handbook</a>` : one(`Page ${pageNo(dr.sourcePage)}.`, `第 ${pageNo(dr.sourcePage)} 页。`)))}
  </main></div>`;
}

/* ---------------- assessment model ---------------- */
export async function sAssessment(el) {
  const d = await loadJSON('./data/study/assessment-model.json');
  if (!d) { el.innerHTML = `<div class="card"><p class="muted">${t('This module is deploying — check back shortly.', '该模块内容部署中，稍后再来。')}</p></div>`; return; }
  const ph = d.phases || [], u = d.unstableCriteria, ch = d.criticalHistory;
  const zhName = s => (s || '').replace(/（[^）]*）$/, '');   // "初级评估（Primary Survey）" -> "初级评估"
  const phase = (p, i) => `<li><i>${i + 1}</i><span><details class="gd-ph"><summary><b>${two(esc(p.nameEn), esc(zhName(p.nameZh)))}</b>${p.purposeEn ? `<small>${mini(esc(p.purposeEn), esc(p.purposeZh || ''))}</small>` : ''}</summary>
      <div class="gd-steps">${(p.stepsEn || []).map((st, j) => {
        const z = (p.stepsZh || [])[j] || {};
        return `<div><b>${two(esc(st.step), esc(z.step || st.step))}${st.verbalize ? ` <em class="say">${mini('say it', '要口述')}</em>` : ''}</b>${st.detail ? `<small>${mini(esc(st.detail), esc(z.detail || st.detail))}</small>` : ''}</div>`;
      }).join('')}
      ${(p.interventionsEn || []).length ? `<details class="gd-more"><summary>${one('What it may lead to', '可能要做的处置')} · ${p.interventionsEn.length}</summary><ul class="gd-list">${biList(p.interventionsEn, p.interventionsZh)}</ul></details>` : ''}</div></details></span></li>`;
  const qGroups = ch ? (ch.questionsEn || []).map((g, i) => [g, (ch.questionsZh || [])[i] || {}]) : [];
  el.innerHTML = `<div class="ddx hm tc gd lang-${S.lang}"><main>
    ${back('#/study/guidelines', 'Guidelines', '考纲')}
    ${hero(`${S.track.toUpperCase()} · ${one('Assessment model', '评估模型')}`, two(`<span class="ph">Every patient. </span><span class="ph"><em>The same ${ph.length} steps</em>.</span>`, `<span class="ph">每个病人，</span><span class="ph"><em>都走这 ${ph.length} 步</em>。</span>`), './img/home/assess.webp',
      two('The practical exam is scored step by step against this order. Tap a step to open it.', '实操考试就是按这个顺序逐段打分的。点一步，看里面做什么。'))}
    <section class="tc-b tc-ladder long gd-phases">${kick('The order', '顺序')}<ol>${ph.map(phase).join('')}</ol></section>
    <div class="tc-grid">
      ${quizBox()}
      ${u ? `<section class="tc-b gd-wide"><p class="kick sec">${one('Unstable: any one of these means go now (RTC)', '危重：下面任何一条，立刻走（RTC）')}</p></section>
        ${never(kick('Found in the primary survey', '初级评估里发现'), pair(u.primarySurveyFindingsEn, u.primarySurveyFindingsZh))}
        ${never(kick('Found on the body', '身上的伤'), pair(u.anatomicalFindingsEn, u.anatomicalFindingsZh))}
        ${never(kick('How it happened', '受伤机制'), pair(u.mechanismOfInjuryEn, u.mechanismOfInjuryZh))}` : ''}
      ${d.avpu ? `<section class="tc-b tc-bands gd-wide">${kick('AVPU: how awake', 'AVPU：清醒到什么程度')}<div class="bd stack gdr avpu">${(d.avpu.levelsEn || []).map((lv, i) => {
        const z = (d.avpu.levelsZh || [])[i] || {};
        return `<div><b>${esc(lv.letter || '')}</b><small><strong>${two(esc(lv.term), esc(z.term || lv.term))}</strong>${mini(esc(lv.description), esc(z.description || lv.description))}</small></div>`;
      }).join('')}</div></section>` : ''}
      ${ch ? `<section class="tc-b gd-wide">${kick('History questions', '问病史')}
        ${(ch.mnemonics || []).map(m => `<details class="tc-src gd-fold"><summary>${esc(m.name)}${m.supplementary ? ` · ${one('study aid', '辅助记忆')}` : ''}</summary><ul class="gd-list">${biList(m.expansionEn, m.expansionZh)}</ul></details>`).join('')}
        ${qGroups.filter(([g]) => typeof g !== 'string').map(([g, z]) => `<details class="tc-src gd-fold"><summary>${two(esc(g.category), esc(z.category || g.category))}</summary><ul class="gd-list">${biList(g.questions || [], z.questions || [])}</ul></details>`).join('')}
      </section>` : ''}
      ${d.pcr ? ticks(kick('What goes on the patient care report', 'PCR 报告要写什么'), pair(d.pcr.fieldsEn, d.pcr.fieldsZh), 'dot') : ''}
    </div>
    ${FOOT(` ${one(`Pages ${esc(d.meta.sourcePages)}.`, `第 ${esc(d.meta.sourcePages)} 页。`)}`)}
  </main></div>`;
  // which step comes next: three questions drawn from the order itself
  runQuiz(el.querySelector('#tcQuiz'), () => shuffle(ph.map((_, i) => i).filter(i => i + 1 < ph.length)).slice(0, 3).map(i => {
    const nm = p => two(esc(p.nameEn), esc(zhName(p.nameZh)));
    return { q: one('What comes right after this?', '这一步之后是哪一步？'), quote: `${i + 1}. ${nm(ph[i])}`,
      ...options(nm(ph[i + 1]), shuffle(ph.filter((_, k) => k !== i && k !== i + 1)).map(nm)),
      why: one(`Step ${i + 2} of ${ph.length}.`, `它是 ${ph.length} 步里的第 ${i + 2} 步。`) };
  }));
}

/* ---------------- quick reference ---------------- */
export async function sReference(el) {
  const d = await loadJSON('./data/study/reference.json');
  if (!d) { el.innerHTML = `<div class="card"><p class="muted">${t('This module is deploying — check back shortly.', '该模块内容部署中，稍后再来。')}</p></div>`; return; }
  const G = [['eye', 'Eyes', '睁眼', 'E'], ['verbal', 'Speech', '说话', 'V'], ['motor', 'Movement', '动作', 'M']];
  const abbr = d.abbreviations || [];
  el.innerHTML = `<div class="ddx hm tc gd lang-${S.lang}"><main>
    ${back('#/study/guidelines', 'Guidelines', '考纲')}
    ${hero(`${S.track.toUpperCase()} · ${one('Reference', '速查')}`, two('<span class="ph">Forgot it? </span><span class="ph"><em>Look it up</em>.</span>', '<span class="ph">忘了，</span><span class="ph"><em>就查一下</em>。</span>'), './img/home/ref.webp')}
    <section class="tc-b gd-abbr"><p class="kick sec">${one('Abbreviations', '缩写表')} · ${abbr.length}</p>
      <div class="qz"><input class="gd-search" id="abbrSearch" type="search" placeholder="${t('Type an abbreviation or a word…', '输入缩写或词…')}" />
      <div id="abbrList"></div></div></section>
    ${d.gcs ? `<p class="kick sec">${one('Glasgow Coma Scale: 3 to 15', 'GCS 昏迷评分：3 到 15 分')}</p>
    <div class="gd-gcs">${G.map(([k, en, zh, L]) => `<section class="tc-b tc-bands"><div class="bd stack gdr gcs"><div class="head"><b>${L}</b><small><strong>${one(en, zh)}</strong></small></div>${(d.gcs[k] || []).map(x => `<div><b>${esc(x.score)}</b><small>${two(esc(x.en), esc(x.zh))}</small></div>`).join('')}</div></section>`).join('')}</div>
    ${ticks('', pair(d.gcs.notesEn, d.gcs.notesZh), 'dot')}` : ''}
    ${FOOT()}
  </main></div>`;
  const listEl = el.querySelector('#abbrList');
  const draw = q => {
    const rows = abbr.filter(a => !q || a.abbr.toLowerCase().includes(q) || (a.en || '').toLowerCase().includes(q) || (a.zh || '').includes(q));
    const shown = q ? rows : rows.slice(0, 12);
    listEl.innerHTML = `<div class="gd-abbrs">${shown.map(a => `<div><b>${esc(a.abbr)}</b><span>${two(esc(a.en), esc(a.zh))}</span></div>`).join('')}</div>
      ${!rows.length ? `<p class="gd-none">${one('Nothing matches.', '没有找到。')}</p>` : ''}
      ${!q && rows.length > shown.length ? `<button class="nextbtn" id="abbrAll">${one(`Show all ${rows.length}`, `显示全部 ${rows.length} 个`)}</button>` : ''}`;
    const all = listEl.querySelector('#abbrAll');
    if (all) all.onclick = () => { listEl.innerHTML = `<div class="gd-abbrs">${rows.map(a => `<div><b>${esc(a.abbr)}</b><span>${two(esc(a.en), esc(a.zh))}</span></div>`).join('')}</div>`; };
  };
  draw('');
  el.querySelector('#abbrSearch').oninput = e => draw(e.target.value.trim().toLowerCase());
}
