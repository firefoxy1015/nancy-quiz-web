// Study library (assessment model / protocols / treatments / drugs / reference) + jurisprudence + exam info
import { S, save, bi, biList, t, esc, loadJSON, nav, ico} from './app.js?v=92';
import { sClassroom } from './classroom.js?v=92';
import { two, one, mini, stk, meter, classDone, CHEV } from './home.js?v=92';
import { sAssessment, sProtocols, sDrugs, sReference } from './guides.js?v=92';   // the other guideline pages, in the card style

/* ---------------- study hub ---------------- */
// The six official-guideline tiles, shared by the Learn hub and the guidelines page.
async function guideTiles() {
  const tr = S.track, isEmr = tr === 'emr';
  // count what this candidate's scope actually shows, so the filtering is visible
  const [tData, pData, dData] = await Promise.all([
    loadJSON('./data/study/treatments.json'), loadJSON('./data/study/protocols.json'), loadJSON('./data/study/drugs.json'),
  ]);
  const inScope = (item, key = 'licence') => !(isEmr && item[key] === 'pcp');
  const tAll = tData ? tData.treatments.length : 0;
  const tMine = tData ? tData.treatments.filter(x => inScope(x)).length : 0;
  const pAll = pData ? pData.protocols.length : 0;
  const pMine = pData ? pData.protocols.filter(x => inScope(x)).length : 0;
  const dAll = dData ? dData.drugs.length : 0;
  const dMine = dData ? dData.drugs.filter(x => (x.licence || []).some(l => l.toLowerCase() === tr)).length : 0;
  const n = (mine, all) => mine === all ? `${all}` : `${mine} / ${all}`;
  const tile = (href, pic, r0, en, zh, sub) => `<a class="hm-tile" href="${href}">${stk(pic, r0)}<b>${two(en, zh)}</b><small>${sub}</small></a>`;
  return tile('#/study/assessment', './img/home/assess.webp', -5, 'Assessment', '评估模型', mini('the exam sequence', '考试的主线'))
    + tile('#/study/protocols', './img/home/protocol.webp', 4, 'Protocols', '处置协议', mini(`${n(pMine, pAll)} protocols`, `${n(pMine, pAll)} 个`))
    + tile('#/study/treatments', './img/home/treat.webp', -3, 'Treatments', '处置主题', mini(`${n(tMine, tAll)} topics`, `${n(tMine, tAll)} 个`))
    + tile('#/study/drugs', './drugs/img/naloxone.webp', 5, 'Drug sheets', '药物专论', mini(`${n(dMine, dAll)} drugs`, `${n(dMine, dAll)} 种`))
    + tile('#/study/reference', './img/home/ref.webp', -4, 'Reference', '速查', mini('GCS · abbreviations', 'GCS · 缩写表'))
    + tile('./drugs/', './drugs/img/nitroglycerin.webp', 4, 'Drug Drill', '药箱', mini('3 minutes', '三分钟一轮'));
}
const guideFoot = () => one('Guidelines: BC Provincial Examination Guidelines, June 15, 2026. Where the textbook and the guidelines differ, the guidelines win.', '考纲 = BC 官方考试指南（2026 年 6 月 15 日版）。教材和考纲不一样时，以考纲为准。')
  + (S.track === 'emr' ? '<br>' + one('Shown for the EMR scope: no IV, no CPAP, fewer drugs.', '已按 EMR 范围显示：不开 IV、不用 CPAP、药更少。') : '');

/* ---------------- guidelines page (what "Guidelines" on the home page opens) ---------------- */
async function sGuidelines(el) {
  const tiles = await guideTiles();
  el.innerHTML = `<div class="ddx hm lang-${S.lang}"><main>
    <header class="hm-hero"><div class="hm-head">
      <p class="kick">${S.track.toUpperCase()} · ${one('Guidelines', '考纲')}</p>
      <h1 class="h1">${two('<span class="ph">What the exam </span><span class="ph"><em>goes by</em>.</span>', '<span class="ph">考试</span><span class="ph"><em>以这个为准</em>。</span>')}</h1>
    </div></header>
    <div class="hm-tiles big trio">${tiles}</div>
    <p class="foot">${guideFoot()}<br><a href="#/study">${one('All of Learn', '上课的全部内容')}</a></p>
  </main></div>`;
}

export async function renderStudyHub(el) {
  const tr = S.track;
  const tiles = await guideTiles();
  const chData = await loadJSON('./data/study/chapters2/index.json');
  const clsData = await fetch('./data/classroom/index.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const clsAll = clsData ? clsData.units.flatMap(u => u.lessons) : [];
  const clsReady = clsAll.filter(l => l.ready).length;
  const chRead = Object.keys(S.chaptersRead || {}).length, chAll = chData ? chData.chapters.length : 54;
  const clsDone = classDone();
  const row = (href, pic, en, zh, sub, pct) => `<a class="hm-row" href="${href}">${stk(pic)}<span><b>${two(en, zh)}</b><small>${sub}</small>${pct == null ? '' : meter(pct)}</span><span class="chev">${CHEV}</span></a>`;
  // Same sticker board as the home page (.ddx.hm): the lessons as rows, the official guidelines as six tiles.
  // The class course has no entrance here or anywhere else on the site: it opens by direct link plus the class password only.
  el.innerHTML = `<div class="ddx hm lang-${S.lang}"><main>
    <header class="hm-hero"><div class="hm-head">
      <p class="kick">${tr.toUpperCase()} · ${one('Learn', '上课')}</p>
      <h1 class="h1">${two('<span class="ph">Listen first. </span><span class="ph"><em>Look it up</em> after.</span>', '<span class="ph">先听课，</span><span class="ph"><em>再查考纲</em>。</span>')}</h1>
    </div></header>

    <p class="kick sec">${one('Lessons', '听课')}</p>
    <div class="hm-rows cards duo">
      ${row('#/study/classroom', './img/home/class.webp', 'Spoken lessons', '语音课', clsReady ? mini(`${clsDone} / ${clsReady} lessons`, `${clsDone} / ${clsReady} 课`) : mini('a teacher talks you through it', '老师一课一课讲'), clsReady ? clsDone / clsReady * 100 : null)}
      ${row('#/study/chapters', './img/home/book.webp', 'Textbook review', '教材精读', mini(`${chRead} / ${chAll} chapters`, `${chRead} / ${chAll} 章`), chRead / chAll * 100)}
    </div>

    <p class="kick sec">${one('Official guidelines', '官方考纲')}</p>
    <div class="hm-tiles six">${tiles}</div>

    <p class="foot">${guideFoot()}</p>
  </main></div>`;
}

/* ---------------- sections ---------------- */
export async function renderStudySection(el, arg, params) {
  const fn = { classroom: sClassroom, chapters: sChapters, guidelines: sGuidelines, assessment: sAssessment, protocols: sProtocols, treatments: sTreatments, drugs: sDrugs, reference: sReference }[arg];
  if (!fn) { renderStudyHub(el); return; }
  await fn(el, params);
}
const backStudy = () => `<a class="back-link" href="#/study">← ${t('Learn', '上课')}</a>`;
const backGuide = () => `<a class="back-link" href="#/study/guidelines">← ${t('Guidelines', '考纲')}</a>`;
const deploying = title => `<div class="card"><h2>${title}</h2><p class="muted">${t('This module is deploying — check back shortly.', '该模块内容部署中，稍后再来。')}</p></div>`;

// Nancy Caroline chapter review. v2 (chapters2/) is the 8-module Canadian-edition
// rewrite; chapters whose index status is still 'legacy' fall back to the old
// chapters.json content via legacyFrom, so the section never shows a hole.
async function sChapters(el, params) {
  const d = await loadJSON('./data/study/chapters2/index.json');
  if (!d) { el.innerHTML = backStudy() + deploying('Chapter Review'); return; }
  if (params.ch) { await drawChapter(el, d, params.ch); return; }
  const q = (params.q || '').toLowerCase();
  const list = q ? d.chapters.filter(c =>
    (c.n + '').includes(q) || c.titleEn.toLowerCase().includes(q) || c.titleZh.includes(params.q)) : d.chapters;
  const stars = w => '★'.repeat(w);
  const read = S.chaptersRead || {};
  el.innerHTML = `
    ${backStudy()}
    <div class="card">
      <h2>${ico('cap')} ${t('Nancy Caroline Chapter Review', 'Nancy Caroline 章节精读')}</h2>
      ${bi(`All ${d.chapters.length} chapters of the Canadian edition, condensed for candidates who cannot read 4,700 pages: an exam-focused knowledge map per textbook section, every testable number, field tips, traps, and a self-check — with BC-guideline differences flagged. ★★★ chapters carry the most exam weight.`,
           `加拿大版教材全部 ${d.chapters.length} 章，为读不完 4700 页原书的考生浓缩：按原书小节组织的知识地图、全部可考数值、实战要点、常见陷阱和自查——教材与 BC 考纲的差异逐处标出。★★★ 是考试权重最高的章。`)}
      <input id="chSearch" class="lang-btn" style="width:100%;margin-top:10px;padding:9px 12px;font-size:.9rem"
             placeholder="${t('Search chapter number or title…', '搜索章节号或标题…')}" value="${esc(params.q || '')}" />
    </div>
    <div class="list-wrap">
      ${list.map(c => `<button class="list-item" data-ch="${c.id}">
        <span class="step-num" style="flex:0 0 30px;height:30px;font-size:.8rem">${c.n}</span>
        <span>${bi(c.titleEn, c.titleZh, 'span')}
          <div class="tiny">${stars(c.examWeight)} · ${c.pageCount}p${read[c.id] ? ' · ' + t('read', '已读') : ''}</div></span>
        ${c.status === 'v2' ? `<span class="tag-count" style="color:var(--accent);border-color:var(--accent)">v2</span>` : ''}
        <span class="li-arrow">›</span></button>`).join('')}
      ${list.length ? '' : `<p class="muted" style="padding:14px">${t('No chapter matches.', '没有匹配的章节。')}</p>`}
    </div>`;
  const s = el.querySelector('#chSearch');
  s.oninput = () => {
    const v = s.value;
    // re-render in place so the field keeps focus and the caret position
    const kept = s.selectionStart;
    history.replaceState(null, '', '#/study/chapters' + (v ? '?q=' + encodeURIComponent(v) : ''));
    sChapters(el, { q: v }).then(() => {
      const s2 = el.querySelector('#chSearch');
      if (s2) { s2.focus(); s2.setSelectionRange(kept, kept); }
    });
  };
  el.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => nav('/study/chapters?ch=' + b.dataset.ch));
}

async function drawChapter(el, d, chId) {
  const metaIdx = d.chapters.findIndex(c => c.id === chId);
  if (metaIdx < 0) { sChapters(el, {}); return; }
  const meta = d.chapters[metaIdx];
  const prev = d.chapters[metaIdx - 1], next = d.chapters[metaIdx + 1];
  const navRow = `<div class="card"><div class="btn-row">
      ${prev ? `<a class="btn ghost" href="#/study/chapters?ch=${prev.id}">← ${t('Ch.', '第')} ${prev.n}</a>` : ''}
      ${next ? `<a class="btn ghost" href="#/study/chapters?ch=${next.id}">${t('Ch.', '第')} ${next.n} →</a>` : ''}
      <button class="btn secondary" id="markRead">${(S.chaptersRead || {})[meta.id] ? t('Mark unread', '取消已读') : t('Mark as read', '标记已读')}</button>
    </div></div>`;
  const guardNote = `<div class="notice">${t('The textbook teaches the subject; the BC guidelines decide the exam. Where a dose, sequence or contraindication differs, follow the guidelines.',
      '教材负责把知识讲明白，但决定考试对错的是 BC 考纲。剂量、顺序、禁忌只要有出入，一律以考纲为准。')}</div>`;
  // population chapters drill by the population axis: their questions sit under
  // clinical topic groups, so a topic drill from here would come up (near) empty
  const drill = { geriatric: 'pop=geriatric', peds: 'pop=pediatric' }[meta.group] || ('topic=' + meta.group);
  const head = (c2, extra = '') => `
    <a class="back-link" href="#/study/chapters">← ${t('All chapters', '全部章节')}</a>
    <div class="card">
      <p class="tiny">${t('Chapter', '第')} ${meta.n} ${t('of', '/')} ${d.chapters.length} · ${'★'.repeat(meta.examWeight)} · ${meta.pageCount} ${t('book pages', '页原书')}${extra}</p>
      <h2 style="margin-top:2px">${bi(meta.titleEn, meta.titleZh, 'span')}</h2>
      ${c2 && c2.whyEn ? bi(c2.whyEn, c2.whyZh) : ''}
      <div class="btn-row">
        <a class="btn" href="#/practice?${drill}">${t('Drill this domain', '刷这个域的题')} →</a>
      </div>
    </div>`;

  const v2 = meta.status === 'v2' ? await loadJSON('./data/study/chapters2/' + meta.id + '.json') : null;
  if (v2) {
    const pt = p => `<li class="${p.hard ? 'pt-hard' : ''}">${bi(p.en, p.zh, 'span')}</li>`;
    el.innerHTML = `
      ${head(v2)}
      ${v2.competencies && (v2.competencies.areas || []).length ? `<div class="card">
        <h4 style="margin:0 0 6px">${t('Competency codes in this chapter (as printed in the textbook)', '本章覆盖的能力编码（教材原印）')}</h4>
        <p class="tiny">${(v2.competencies.areas || []).map(esc).join(' · ')}${(v2.competencies.codes || []).length ? ` · ${v2.competencies.codes.length} ${t('codes', '个编码')}` : ''}</p>
      </div>` : ''}
      ${(v2.bcAlerts || []).length ? `<div class="bc-alert">
        <h4>🔺 ${t('Textbook vs BC Guidelines — the guidelines win', '教材 vs BC 考纲——以考纲为准')}</h4>
        ${v2.bcAlerts.map(a => `<div class="bc-alert-item">
          <b>${bi(a.topicEn, a.topicZh, 'span')}</b>
          <div class="bc-cols">
            <div><span class="bc-tag book">${t('Book', '教材')}</span>${bi(a.bookEn, a.bookZh, 'span')}</div>
            <div><span class="bc-tag bc">BC</span>${bi(a.bcEn, a.bcZh, 'span')}</div>
          </div>${a.ref ? `<p class="tiny">${esc(a.ref)}</p>` : ''}
        </div>`).join('')}
      </div>` : ''}
      ${(v2.sections || []).length >= 8 ? `<div class="sec-toc">
        ${v2.sections.map((s, i) => `<a href="#" data-sec="${i}">${i + 1} · ${esc(t(s.titleEn, s.titleZh)).slice(0, 26)}</a>`).join('')}
      </div>` : ''}
      ${(v2.sections || []).map((s, i) => `
        <details class="acc" id="sec-${i}" ${i === 0 ? 'open' : ''}>
          <summary><span class="step-num" style="flex:0 0 26px;height:26px;font-size:.8rem">${i + 1}</span> ${bi(s.titleEn, s.titleZh, 'span')}
            <span class="tag-count">${(s.points || []).length}</span></summary>
          <div class="acc-body"><ul class="pt-list">${(s.points || []).map(pt).join('')}</ul></div>
        </details>`).join('')}
      ${(v2.hardNumbers || []).length ? `<div class="card">
        <h3 style="margin-top:0">${t('Hard numbers — every testable value in this chapter', '硬数字表——本章全部可考数值')}</h3>
        <div style="overflow-x:auto"><table class="hard-table">
          ${v2.hardNumbers.map(h => `<tr><td>${bi(h.itemEn, h.itemZh, 'span')}</td><th>${esc(h.value)}</th></tr>`).join('')}
        </table></div></div>` : ''}
      ${(v2.atScene || []).length ? `<div class="card">
        <h3 style="margin-top:0">${t('At the scene', '实战要点')}</h3>
        <ul class="pt-list">${v2.atScene.map(x => `<li>${bi(x.en, x.zh, 'span')}</li>`).join('')}</ul></div>` : ''}
      ${(v2.confusions || []).length ? `<div class="card">
        <h3 style="margin-top:0">${t('Common confusions', '常见误区')}</h3>
        <ul class="pt-list">${v2.confusions.map(x => `<li>${bi(x.en, x.zh, 'span')}</li>`).join('')}</ul></div>` : ''}
      ${(v2.mnemonics || []).length ? `<div class="card">
        <h3 style="margin-top:0">${t('Memory hooks', '记忆钩子')}</h3>
        ${v2.mnemonics.map(m => `<details class="acc"><summary><b>${esc(m.name)}</b></summary>
          <div class="acc-body">${bi(m.en, m.zh)}</div></details>`).join('')}</div>` : ''}
      ${(v2.selfCheck || []).length ? `<div class="card">
        <h3 style="margin-top:0">${t('Self-check — answer before you peek', '快测自查——先自答再点开')}</h3>
        ${v2.selfCheck.map(x => `<details class="acc"><summary>${bi(x.qEn, x.qZh, 'span')}</summary>
          <div class="acc-body">${bi(x.aEn, x.aZh)}</div></details>`).join('')}</div>` : ''}
      ${navRow}${guardNote}`;
  } else {
    // legacy fallback: old chapters.json content remapped via legacyFrom
    const old = await loadJSON('./data/study/chapters.json');
    const lc = old && meta.legacyFrom ? old.chapters.find(x => x.n === meta.legacyFrom) : null;
    const sec = (labelEn, labelZh, enArr, zhArr) => (!enArr || !enArr.length) ? '' :
      `<div class="detail-section"><h4>${t(labelEn, labelZh)}</h4><ul>${biList(enArr, zhArr)}</ul></div>`;
    el.innerHTML = `
      ${head(null, ' · ' + t('classic notes — full rewrite in progress', '经典笔记——完整版编写中'))}
      ${lc ? `<div class="card">
        ${lc.summaryEn ? bi(lc.summaryEn, lc.summaryZh) : ''}
        ${sec('Highlights', '重点提示', lc.highlightsEn, lc.highlightsZh)}
        ${sec('Key points', '关键要点', lc.keyPointsEn, lc.keyPointsZh)}
        ${sec('Must know', '必背', lc.mustKnowEn, lc.mustKnowZh)}
        ${sec('Common confusions', '常见误区', lc.commonConfusionsEn, lc.commonConfusionsZh)}
      </div>` : `<div class="card"><p class="muted">${t('This chapter is new to the Canadian edition line-up — its full review is being written. Meanwhile, drill its domain below.',
        '这一章是加拿大版新增章目，完整精读正在编写。可以先刷它对应的题库分组。')}</p></div>`}
      ${navRow}${guardNote}`;
  }
  el.querySelector('#markRead').onclick = () => {
    S.chaptersRead = S.chaptersRead || {};
    if (S.chaptersRead[meta.id]) delete S.chaptersRead[meta.id];
    else S.chaptersRead[meta.id] = Date.now();
    save(); drawChapter(el, d, chId);
  };
  // section TOC: open the target accordion, then jump to it
  el.querySelectorAll('.sec-toc a').forEach(a => a.onclick = e => {
    e.preventDefault();
    const det = el.querySelector('#sec-' + a.dataset.sec);
    if (det) { det.open = true; det.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  ensureToTop();
}

// floating back-to-top for long chapter pages; one instance, shown past ~2 screens
function ensureToTop() {
  let btn = document.querySelector('.to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'to-top'; btn.textContent = '↑'; btn.title = t('Back to top', '回到顶部');
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      btn.classList.toggle('show', window.scrollY > 1200 && location.hash.includes('/study/chapters?ch='));
    }, { passive: true });
  }
}

function sec(title, en = [], zh = []) {
  if (!en || !en.length) return '';
  return `<div class="detail-section"><h4>${title}</h4><ul>${biList(en, zh)}</ul></div>`;
}

/* A treatment topic as a picture-first card (data/study/treatment-cards.json): one line, a few drawn blocks, three questions
   answered one at a time, and the full guideline text folded underneath. Topics without a card keep the plain page below. */
const CAT = { trauma: ['Trauma', '创伤'], medical: ['Medical', '内科'], 'cardiac-arrest': ['Cardiac arrest', '心脏骤停'], procedure: ['Procedure', '操作'] };
const X_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
function treatmentCard(el, x, c) {
  const ph = h => h.split('|').map(part => `<span class="ph">${part}</span>`).join('');   // a headline breaks only at its marks
  const cat = CAT[x.category] || [x.category, x.category];
  const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const block = b => {
    if (b.pcp && S.track !== 'pcp') return '';   // beyond the EMR scope
    const title = `<p class="kick sec">${b.pcp ? '<i class="pcp">PCP</i>' : ''}${one(b.titleEn, b.titleZh)}</p>`;
    if (b.type === 'ladder') {
      const firstLate = b.steps.findIndex(st => st.last);
      return `<section class="tc-b tc-ladder">${title}<ol>${b.steps.map((st, i) => `${i === firstLate ? `<li class="lbl"><span>${one(b.tagEn, b.tagZh)}</span></li>` : ''}
        <li class="${st.last ? 'late' : ''}"><i>${st.k || i + 1}</i><span><b>${two(st.en, st.zh)}</b>${st.subEn ? `<small>${mini(st.subEn, st.subZh)}</small>` : ''}</span></li>`).join('')}</ol></section>`;
    }
    if (b.type === 'never') return `<section class="tc-b tc-never">${title}<ul>${b.items.map(it => `<li><i>${X_ICO}</i><span>${two(it.en, it.zh)}</span></li>`).join('')}</ul></section>`;
    if (b.type === 'ticks') return `<section class="tc-b tc-ticks">${title}<ul>${b.items.map(it => `<li><i>${TICK}</i><span>${two(it.en, it.zh)}</span></li>`).join('')}</ul></section>`;
    if (b.type === 'bands') return `<section class="tc-b tc-bands">${title}<div class="bd${b.stack ? ' stack' : ''}" style="--n:${b.items.length}">${b.items.map(it => `<div class="${it.tone || ''}"><b>${mini(it.big, it.bigZh || it.big)}</b><small>${mini(it.en, it.zh)}</small></div>`).join('')}</div></section>`;
    if (b.type === 'fork') return `<section class="tc-b tc-fork">${title}<div class="fk">
        <div class="act">${two(b.actEn, b.actZh)}</div>
        <div class="arms"><div class="good"><small>${mini(b.goodEn, b.goodZh)}</small><b>${mini(b.goodToEn, b.goodToZh)}</b></div>
          <div class="bad"><small>${mini(b.badEn, b.badZh)}</small><b>${mini(b.badToEn, b.badToZh)}</b></div></div></div></section>`;
    if (b.type === 'phases') return `<section class="tc-b tc-phases">${title}<div class="phs">${b.rows.map(r => `<div><i>${esc(r.k)}</i><span>${two(r.en, r.zh)}</span></div>`).join('')}</div></section>`;
    return '';
  };
  el.innerHTML = `<div class="ddx hm tc lang-${S.lang}"><main>
    <a class="tc-back" href="#/study/treatments">← ${one('Treatments', '处置主题')}</a>
    <header class="tc-hero"><div>
      <p class="kick">${mini(cat[0], cat[1])} · ${mini(x.titleEn, x.titleZh)}${x.licence === 'pcp' && !/PCP/.test(x.titleEn) ? ' · PCP' : ''}</p>
      <h1 class="h1">${two(ph(c.headEn), ph(c.headZh))}</h1>
    </div>${stk(c.pic, 6)}</header>
    <p class="tc-line">${two(c.lineEn, c.lineZh)}</p>
    <div class="tc-grid">${c.blocks.map(block).join('')}
      <section class="tc-b tc-quiz"><p class="kick sec">${one('Your turn', '考考你')}</p><div class="qz" id="tcQuiz"></div></section>
    </div>
    <details class="tc-src"><summary>${one('The full guideline text', '考纲原文')} · ${one(`page ${x.sourcePage}`, `第 ${x.sourcePage} 页`)}</summary>
      ${(x.contentEn || []).map((cEn, i) => {
        const cZh = (x.contentZh || [])[i] || {};
        return `<div class="detail-section"><h4>${bi(cEn.heading, cZh.heading || '', 'span')}</h4><ul>${biList(cEn.points, cZh.points || [])}</ul></div>`;
      }).join('')}
      ${sec(ico('info') + ' ' + t('Exam tips', '考试要点'), x.examTipsEn, x.examTipsZh)}
    </details>
    <p class="foot">${one('BC Provincial Examination Guidelines, June 15, 2026.', 'BC 官方考试指南（2026 年 6 月 15 日版）。')}</p>
  </main></div>`;

  // the questions, one at a time: tap an answer, see why, go on
  const box = el.querySelector('#tcQuiz'), qs = (c.quiz || []).filter(q => !q.pcp || S.track === 'pcp');
  let i = 0, right = 0;
  const show = () => {
    if (i >= qs.length) {
      box.innerHTML = `<p class="qn">${one(`${right} of ${qs.length} right`, `答对 ${right} / ${qs.length}`)}</p>
        <p class="q">${right === qs.length ? two('All of them. This one is yours.', '全对。这一页你拿下了。') : two('Look at the picture above once more, then try again.', '再看一眼上面的图，然后重来一次。')}</p>
        <button class="nextbtn" id="tcAgain">${one('Again', '再来一次')}</button>`;
      box.querySelector('#tcAgain').onclick = () => { i = 0; right = 0; show(); };
      return;
    }
    const q = qs[i];
    box.innerHTML = `<p class="qn">${i + 1} / ${qs.length}</p><p class="q">${two(q.qEn, q.qZh)}</p>
      <div class="opts">${q.opts.map((o, k) => `<button data-k="${k}">${two(o.en, o.zh)}</button>`).join('')}</div><div class="why" hidden></div>`;
    box.querySelectorAll('.opts button').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === q.a;
      if (ok) right++;
      box.querySelectorAll('.opts button').forEach((o, n) => { o.disabled = true; if (n === q.a) o.classList.add('ok'); else if (n === k) o.classList.add('no'); });
      const why = box.querySelector('.why');
      why.hidden = false;
      why.innerHTML = `<p class="${ok ? 'ok' : 'no'}"><b>${ok ? one('Right.', '对。') : one('Not this one.', '不是这个。')}</b> ${two(q.whyEn, q.whyZh)}</p>
        <button class="nextbtn" id="tcNext">${i + 1 < qs.length ? one('Next', '下一题') : one('Done', '看结果')}</button>`;
      why.querySelector('#tcNext').onclick = () => { i++; show(); };
    });
  };
  show();
}

async function sTreatments(el, params) {
  const d = await loadJSON('./data/study/treatments.json');
  if (!d) { el.innerHTML = backGuide() + deploying('Treatments'); return; }
  const id = params.id;
  const list = d.treatments.filter(x => !(x.licence === 'pcp' && S.track === 'emr'));
  if (id) {
    const x = d.treatments.find(y => y.id === id);
    const cards = x ? await fetch('./data/study/treatment-cards.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null) : null;
    if (x && cards && cards.cards[x.id]) { treatmentCard(el, x, cards.cards[x.id]); return; }
    if (x) {
      el.innerHTML = `
        <a class="back-link" href="#/study/treatments">← ${t('Treatments', '处置主题')}</a>
        <div class="card">
          <h2>${bi(x.titleEn, x.titleZh, 'span')} ${x.licence === 'pcp' ? '<span class="pill pcp">PCP</span>' : ''}</h2>
          ${(x.contentEn || []).map((cEn, i) => {
            const cZh = (x.contentZh || [])[i] || {};
            return `<div class="detail-section"><h4>${bi(cEn.heading, cZh.heading || '', 'span')}</h4>
              <ul>${biList(cEn.points, cZh.points || [])}</ul></div>`;
          }).join('')}
          ${sec(ico('info') + ' ' + t('Exam tips', '考试要点'), x.examTipsEn, x.examTipsZh)}
          <p class="tiny">p. ${x.sourcePage || ''}</p>
        </div>`;
      return;
    }
  }
  // the list: a sticker board, one section per category; a topic that has a card shows its sticker
  const cardData = await fetch('./data/study/treatment-cards.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const has = (cardData && cardData.cards) || {};
  const cats = {};
  for (const x of list) (cats[x.category || 'other'] ||= []).push(x);
  const name = x => `<b>${two(esc(x.titleEn), esc(x.titleZh))}</b>${x.licence === 'pcp' && !/PCP/.test(x.titleEn) ? '<small>PCP</small>' : ''}`;
  el.innerHTML = `<div class="ddx hm tl lang-${S.lang}"><main>
    <a class="tc-back" href="#/study/guidelines">← ${one('Guidelines', '考纲')}</a>
    <header class="hm-hero"><div class="hm-head">
      <p class="kick">${S.track.toUpperCase()} · ${one('Treatments', '处置主题')}</p>
      <h1 class="h1">${two('<span class="ph">This patient. </span><span class="ph"><em>What do you do?</em></span>', '<span class="ph">遇到这种病人，</span><span class="ph"><em>怎么做</em>？</span>')}</h1>
    </div></header>
    ${Object.entries(cats).map(([cat, xs]) => {
      const withCard = xs.filter(x => has[x.id]), plain = xs.filter(x => !has[x.id]);
      return `<p class="kick sec">${one((CAT[cat] || [cat])[0], (CAT[cat] || [cat, cat])[1])} · ${xs.length}</p>
        ${withCard.length ? `<div class="hm-tiles tl-tiles">${withCard.map((x, n) => `<a class="hm-tile" href="#/study/treatments?id=${x.id}">${stk(has[x.id].pic, [-5, 4, -3, 5][n % 4])}${name(x)}</a>`).join('')}</div>` : ''}
        ${plain.length ? `<div class="hm-rows tl-rows">${plain.map(x => `<a class="hm-row" href="#/study/treatments?id=${x.id}"><span>${name(x)}</span><span class="chev">${CHEV}</span></a>`).join('')}</div>` : ''}`;
    }).join('')}
    <p class="foot">${guideFoot()}</p>
  </main></div>`;
}

/* ---------------- jurisprudence ---------------- */
let jSession = null;
export async function renderJurisHub(el, arg, params) {
  const notes = await loadJSON('./data/jurisprudence/notes.json');
  const bank = await loadJSON('./data/jurisprudence/bank.json');
  if (params.mode === 'notes' && notes) { drawJurisNotes(el, notes); return; }
  if (params.mode === 'mock' && bank) { drawJurisMock(el, bank); return; }
  if (params.mode === 'practice' && bank) { drawJurisPractice(el, bank); return; }
  const hist = S.jurisHistory;
  el.innerHTML = `
    <a class="back-link" href="#/written">← ${t('Questions', '刷题')}</a>
    <div class="card">
      <h2> ${t('Jurisprudence exam', '法规考')}</h2>
      ${bi('25 questions · no time limit · 80% to pass — the highest pass mark of your three exams. Content: BC law and policy for EMAs.',
           '25 题 · 不限时 · 80% 及格——三关里及格线最高。考 BC 急救人员相关法律与政策。')}
      <div class="stat-row" style="margin-top:12px">
        <div class="stat"><b>${bank ? bank.questions.length : 0}</b><span>${t('questions', '题库量')}</span></div>
        <div class="stat"><b>${hist.length}</b><span>${t('mocks done', '模拟次数')}</span></div>
        <div class="stat"><b>${hist.length ? Math.max(...hist.map(h => h.pct)) + '%' : '—'}</b><span>${t('best', '最好成绩')}</span></div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card"><h3 style="margin-top:0">${ico('book')} ${t('Study notes', '法规笔记')}</h3>
        ${bi('EMA Act, EMA Regulation, scope of practice, conduct — summarized bilingual.', 'EMA 法案、条例、执业范围、职业行为——双语摘要。')}
        <div class="btn-row"><a class="btn" href="#/juris?mode=notes">${t('Read', '阅读')}</a></div></div>
      <div class="card"><h3 style="margin-top:0"> ${t('Practice / Mock', '练习与模拟')}</h3>
        ${bi('Drill with feedback, or simulate the real 25-question exam at the 80% bar.', '带解析刷题，或全真模拟 25 题考试（80% 及格线）。')}
        <div class="btn-row">
          <a class="btn secondary" href="#/juris?mode=practice">${t('Practice', '练习')}</a>
          <a class="btn" href="#/juris?mode=mock">${t('25-question mock', '25题模拟')}</a>
        </div></div>
    </div>
    ${hist.length ? `<div class="card"><h3 style="margin-top:0">${t('History', '历史成绩')}</h3>
      ${hist.slice(-6).reverse().map(h => `<div class="area-bar ${h.pct >= 80 ? 'band-lgreen' : 'band-red'}">
        <span class="area-tag">${h.pct}</span><div><b>${h.date}</b> · ${h.right}/25 · ${h.pct >= 80 ? t('PASS', '通过') : t('FAIL', '未过')}</div></div>`).join('')}</div>` : ''}`;
}
function drawJurisNotes(el, notes) {
  el.innerHTML = `
    <a class="back-link" href="#/juris">← ${t('Jurisprudence exam', '法规考')}</a>
    <div class="card"><h2>${ico('book')} ${t('Jurisprudence Notes', '法规笔记')}</h2>
      <p class="tiny">${esc((notes.meta.sources || []).join(' · '))}</p></div>
    ${notes.sections.map(s => `
      <details class="acc"><summary>${bi(s.titleEn, s.titleZh, 'span')}</summary>
        <div class="acc-body">
          ${(s.contentEn || []).map((cEn, i) => {
            const cZh = (s.contentZh || [])[i] || {};
            return `<div class="detail-section"><h4>${bi(cEn.heading, cZh.heading || '', 'span')}</h4>
              <ul>${biList(cEn.points, cZh.points || [])}</ul></div>`;
          }).join('')}
          <p class="tiny">${esc(s.sourceRef || '')}</p>
        </div>
      </details>`).join('')}`;
}
function drawJurisPractice(el, bank) {
  if (!jSession || jSession.mode !== 'practice') {
    jSession = { mode: 'practice', order: shuffle(bank.questions.map((_, i) => i)), pos: 0, right: 0, done: 0 };
  }
  const q = bank.questions[jSession.order[jSession.pos]];
  el.innerHTML = `
    <a class="back-link" href="#/juris">← ${t('Jurisprudence exam', '法规考')}</a>
    <div class="card">
      <div class="q-meta"><b>${t('Practice', '练习')}</b><span class="muted">${jSession.right}/${jSession.done}</span></div>
      <div class="q-text">${bi(q.questionEn, q.questionZh)}</div>
      <div class="q-opts">
        ${q.options.map(o => `<button class="opt" data-key="${o.id || o.key}"><span class="opt-key">${(o.id || o.key).toUpperCase()}</span><span>${bi(o.textEn || o.en, o.textZh || o.zh, 'span')}</span></button>`).join('')}
      </div>
      <div id="jExplain"></div>
      <div class="btn-row"><button class="btn ghost" id="jSkip">${t('Skip', '跳过')} →</button></div>
    </div>`;
  const wrap = el.querySelector('.q-opts');
  wrap.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (wrap.dataset.done) return; wrap.dataset.done = '1';
    jSession.done++;
    const k = b.dataset.key;
    if (k === q.answer) { jSession.right++; b.classList.add('correct'); }
    else { b.classList.add('wrong'); wrap.querySelector(`[data-key="${q.answer}"]`).classList.add('correct'); }
    document.getElementById('jExplain').innerHTML = `<div class="explain">${bi(q.explanationEn, q.explanationZh)}<p class="tiny">${esc(q.sourceRef || '')}</p></div>`;
    const nb = document.createElement('button'); nb.className = 'btn'; nb.textContent = t('Next', '下一题') + ' →';
    nb.onclick = () => { jSession.pos = (jSession.pos + 1) % jSession.order.length; drawJurisPractice(el, bank); };
    el.querySelector('.btn-row').prepend(nb);
  });
  el.querySelector('#jSkip').onclick = () => { jSession.pos = (jSession.pos + 1) % jSession.order.length; drawJurisPractice(el, bank); };
}
function drawJurisMock(el, bank) {
  if (!jSession || jSession.mode !== 'mock' || jSession.finished) {
    jSession = { mode: 'mock', qs: shuffle([...bank.questions]).slice(0, 25), answers: {}, pos: 0, finished: false };
  }
  const qs = jSession.qs;
  const q = qs[jSession.pos];
  el.innerHTML = `
    <a class="back-link" href="#/juris">← ${t('Jurisprudence exam', '法规考')}</a>
    <div class="card">
      <div class="q-meta"><b>${t('Mock exam', '模拟考')}</b><span>Q${jSession.pos + 1}/25 · ${t('no time limit', '不限时')}</span></div>
      <div class="q-grid">${qs.map((qq, i) => `<button class="${jSession.answers[qq.id] ? 'answered' : ''} ${i === jSession.pos ? 'current' : ''}" data-goto="${i}">${i + 1}</button>`).join('')}</div>
      <div class="q-text">${bi(q.questionEn, q.questionZh)}</div>
      <div class="q-opts">
        ${q.options.map(o => `<button class="opt ${jSession.answers[q.id] === (o.id || o.key) ? 'picked' : ''}" data-key="${o.id || o.key}"><span class="opt-key">${(o.id || o.key).toUpperCase()}</span><span>${bi(o.textEn || o.en, o.textZh || o.zh, 'span')}</span></button>`).join('')}
      </div>
      <div class="btn-row">
        <button class="btn ghost" id="jPrev" ${jSession.pos === 0 ? 'disabled' : ''}>←</button>
        <button class="btn ghost" id="jNext" ${jSession.pos === 24 ? 'disabled' : ''}>→</button>
        <button class="btn danger" id="jSubmit">${t('Submit', '交卷')}</button>
      </div>
    </div>`;
  el.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { jSession.pos = +b.dataset.goto; drawJurisMock(el, bank); });
  el.querySelectorAll('.q-opts .opt').forEach(b => b.onclick = () => { jSession.answers[q.id] = b.dataset.key; drawJurisMock(el, bank); });
  el.querySelector('#jPrev').onclick = () => { jSession.pos--; drawJurisMock(el, bank); };
  el.querySelector('#jNext').onclick = () => { jSession.pos++; drawJurisMock(el, bank); };
  el.querySelector('#jSubmit').onclick = () => {
    const un = qs.filter(qq => !jSession.answers[qq.id]).length;
    if (!confirm(t(`Submit? ${un} unanswered.`, `交卷？还有 ${un} 题没答。`))) return;
    let right = 0;
    for (const qq of qs) if (jSession.answers[qq.id] === qq.answer) right++;
    const pct = Math.round(right / 25 * 100);
    jSession.finished = true;
    S.jurisHistory.push({ date: new Date().toISOString().slice(0, 10), right, pct }); save();
    el.innerHTML = `
      <a class="back-link" href="#/juris">← ${t('Jurisprudence exam', '法规考')}</a>
      <div class="card score-hero">
        <div class="score-big ${pct >= 80 ? 'pass' : 'fail'}">${pct}%</div>
        <p><b>${right}/25</b> · ${pct >= 80 ? t('PASS (80% needed)', '通过（及格线80%）') : t('BELOW 80%', '低于 80%')}</p>
      </div>
      ${qs.map((qq, i) => `<div class="card"><p class="tiny">Q${i + 1} · ${esc(qq.topic || '')}</p>
        <div class="q-text">${bi(qq.questionEn, qq.questionZh)}</div>
        ${qq.options.map(o => {
          const k = o.id || o.key; let cls = 'opt';
          if (k === qq.answer) cls += ' correct'; else if (jSession.answers[qq.id] === k) cls += ' wrong';
          return `<div class="${cls}"><span class="opt-key">${k.toUpperCase()}</span><span>${bi(o.textEn || o.en, o.textZh || o.zh, 'span')}</span></div>`;
        }).join('')}
        <div class="explain">${bi(qq.explanationEn, qq.explanationZh)}<p class="tiny">${esc(qq.sourceRef || '')}</p></div>
      </div>`).join('')}`;
  };
}

/* ---------------- exam info ---------------- */
export async function renderExamInfo(el) {
  const rules = await loadJSON('./data/meta/exam-rules.json');
  if (!rules) { el.innerHTML = deploying('Exam info'); return; }
  const tr = S.track || 'pcp';
  const w = rules[tr].written, j = rules.jurisprudence, p = rules.practical, c = rules.common;
  el.innerHTML = `
    <div class="card">
      <h2>ℹ ${t('Exam Logistics', '考务流程')} <span class="pill ${tr}">${tr.toUpperCase()}</span></h2>
      ${bi('Verified against official sources on ' + rules.meta.verifiedDate + '. Always double-check current rules before booking.',
           '以下信息于 ' + rules.meta.verifiedDate + ' 对照官方文件核实；报名前请再次核对最新规定。')}
    </div>
    <div class="card">
      <h3 style="margin-top:0">${t('The rules you are playing by', '你要面对的硬规则')}</h3>
      <ul class="steps" style="list-style:none">
        <li class="step"><span class="step-num">3</span>${bi('Three attempts per exam. Fail all three → repeat your entire training program.', '每门考试只有 3 次机会，三次全挂就要重读整个课程。')}</li>
        <li class="step"><span class="step-num">12</span>${bi('All exams must be passed within 12 months of finishing your course.', '所有考试必须在课程结业后 12 个月内全部通过。')}</li>
        <li class="step"><span class="step-num">!</span>${bi('Practical exams are only scheduled after written + jurisprudence are passed — do those first.', '实操考要等笔试和法规考都过了才给排期——先攻前两关。')}</li>
      </ul>
    </div>
    <div class="card"><h3 style="margin-top:0">${ico('pen')} ${t('Written', '笔试')}</h3>
      ${bi(w.providerNoteEn, w.providerNoteZh)}
      ${w.deliveryEn ? `<div class="notice">${ico('info')} ${bi(w.deliveryEn, w.deliveryZh, 'span')}</div>` : ''}
      <table class="vitals-table" style="margin-top:8px">
        <tr><th>${t('Questions', '题量')}</th><td>${w.questions}${w.scoredQuestions ? ` (${w.scoredQuestions} scored)` : ''}</td></tr>
        <tr><th>${t('Time', '时长')}</th><td>${w.format ? esc(w.format) : (w.timeLimitMinutes / 60 + ' h')}</td></tr>
        <tr><th>${t('Pass', '及格')}</th><td>${w.passMarkPercent ? w.passMarkPercent + '%' : esc(w.passMarkEn || '')}</td></tr>
        ${w.feeCad ? `<tr><th>${t('Fee', '费用')}</th><td>$${w.feeCad} CAD + tax / attempt</td></tr>` : ''}
        ${w.schedule2026 ? `<tr><th>${t('2026 dates', '2026考期')}</th><td>${w.schedule2026.join(' · ')}</td></tr>` : ''}
      </table>
      ${w.retakeRulesEn ? bi(w.retakeRulesEn, w.retakeRulesZh) : ''}
      ${w.scheduleNoteEn ? bi(w.scheduleNoteEn, w.scheduleNoteZh) : ''}
      ${w.seatReservationEn ? bi(w.seatReservationEn, w.seatReservationZh) : ''}
      ${w.resultsEn ? bi(w.resultsEn, w.resultsZh) : ''}
      ${w.frameworkNoteEn ? `<div class="notice">${ico('info')} ${bi(w.frameworkNoteEn, w.frameworkNoteZh, 'span')}</div>` : ''}
      ${(w.timelineEn || []).length ? `<details class="acc" style="margin-top:10px" open>
        <summary> ${t('From application to results — the hard deadlines', '从报名到出分——所有硬节点')}</summary>
        <div class="acc-body"><ul>${biList(w.timelineEn, w.timelineZh)}</ul></div>
      </details>` : ''}
      ${(w.onlineRequirementsEn || []).length ? `<details class="acc" style="margin-top:10px">
        <summary> ${t('Online proctoring requirements — read before exam day', '在家考的硬性要求——考前必看')}</summary>
        <div class="acc-body"><ul>${biList(w.onlineRequirementsEn, w.onlineRequirementsZh)}</ul>
        ${w.techFailureEn ? bi(w.techFailureEn, w.techFailureZh) : ''}</div>
      </details>` : ''}
      ${w.securityEn ? `<details class="acc" style="margin-top:10px">
        <summary> ${t('Confidentiality — what gets your result voided', '保密红线——哪些行为会让成绩作废')}</summary>
        <div class="acc-body">${bi(w.securityEn, w.securityZh)}</div>
      </details>` : ''}
      ${w.afterFailEn || w.standardSettingEn ? `<details class="acc" style="margin-top:10px">
        <summary> ${t('Scoring, verification and appeals', '判分·复核·申诉')}</summary>
        <div class="acc-body">${w.standardSettingEn ? bi(w.standardSettingEn, w.standardSettingZh) : ''}
        ${w.afterFailEn ? bi(w.afterFailEn, w.afterFailZh) : ''}</div>
      </details>` : ''}
    </div>
    <div class="card"><h3 style="margin-top:0"> ${t('Jurisprudence', '法规考')}</h3>
      <table class="vitals-table">
        <tr><th>${t('Questions', '题量')}</th><td>${j.questions}</td></tr>
        <tr><th>${t('Time', '时长')}</th><td>${esc(j.timeLimitNoteEn)}</td></tr>
        <tr><th>${t('Pass', '及格')}</th><td>${j.passMarkPercent}%</td></tr>
      </table>
      ${bi(j.scopeEn, j.scopeZh)}${bi(j.retakeRulesEn, j.retakeRulesZh)}
    </div>
    <div class="card"><h3 style="margin-top:0">${ico('ambulance')} ${t('Practical', '实操')}</h3>
      ${bi(p.structureEn, p.structureZh)}
      <table class="vitals-table" style="margin-top:8px">
        <tr><th>${t('Time', '时长')}</th><td>${p.examMinutes} min + ${p.pcrMinutes} min PCR</td></tr>
        <tr><th>${t('Packaging', '打包时限')}</th><td>RTC ${p.rtcPackageMinutes} min · non-RTC ${p.nonRtcPackageMinutes} min</td></tr>
        <tr><th>${t('Pass', '及格')}</th><td>${p.passMarkPercent}% (${t('deduction-based', '扣分制')})</td></tr>
        <tr><th>${t('Locations', '考区')}</th><td>${p.locations.join(', ')}</td></tr>
      </table>
      ${bi(p.scoringEn, p.scoringZh)}${bi(p.mustPerformEn, p.mustPerformZh)}${bi(p.remedialEn, p.remedialZh)}${bi(p.accommodationsEn, p.accommodationsZh)}
    </div>
    <div class="card"><h3 style="margin-top:0">${ico('list')} ${t('Hard rules', '硬规则')}</h3>
      <ul>
        <li>${bi(`${c.attemptsPerExam} attempts per exam.`, `每门考试 ${c.attemptsPerExam} 次机会。`, 'span')}</li>
        <li>${bi(c.afterThreeFailsEn, c.afterThreeFailsZh, 'span')}</li>
        <li>${bi(`All exams within ${c.completionWindowMonths} months of finishing training.`, `所有考试须在结业后 ${c.completionWindowMonths} 个月内完成。`, 'span')}</li>
        <li>${bi(c.practicalPrerequisiteEn, c.practicalPrerequisiteZh, 'span')}</li>
      </ul>
      ${tr === 'pcp' && c.afterThreeFailsCoprCaveatEn ? `<div class="notice" style="background:var(--red-soft);border-color:var(--red);color:#7f1d1d">
         ${bi(c.afterThreeFailsCoprCaveatEn, c.afterThreeFailsCoprCaveatZh, 'span')}</div>` : ''}
      ${c.practicalFailExemptionEn ? `<div class="notice" style="background:var(--green-soft);border-color:var(--green);color:#14532d">
        ${ico('info')} ${bi(c.practicalFailExemptionEn, c.practicalFailExemptionZh, 'span')}</div>` : ''}
      <div class="btn-row">
        <a class="btn ghost" href="${rules.meta.sources.emalb.url}" target="_blank">EMALB ↗</a>
        <a class="btn ghost" href="${rules.meta.sources.copr.url}" target="_blank">COPR ↗</a>
        <a class="btn ghost" href="${rules.meta.sources.bcGuidelines.url}" target="_blank">${t('Official guidelines PDF', '官方考纲 PDF')} ↗</a>
      </div>
    </div>`;
}
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
