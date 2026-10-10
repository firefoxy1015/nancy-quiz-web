// Study library (assessment model / protocols / treatments / drugs / reference) + jurisprudence + exam info
import { S, save, bi, biList, t, esc, loadJSON, nav, ico} from './app.js?v=18';

/* ---------------- study hub ---------------- */
export async function renderStudyHub(el) {
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
  const scopeTag = (mine, all) => mine === all
    ? `<span class="tag-count">${all}</span>`
    : `<span class="tag-count" style="color:var(--${tr});border-color:var(--${tr})">${mine} / ${all}</span>`;
  const chData = await loadJSON('./data/study/chapters2/index.json');
  const chV2 = chData ? chData.chapters.filter(c => c.status === 'v2').length : 0;
  const cards = [
    ['chapters', ico('cap'), 'Nancy Caroline Chapter Review', 'Nancy Caroline 章节精读',
      `All 54 chapters of the Canadian edition. ${chV2} are rewritten in depth — knowledge map, every testable number, BC-guideline conflicts flagged.`,
      `加拿大版教材全部 54 章，其中 ${chV2} 章已深度重写——知识地图、全部可考数值、教材与 BC 考纲冲突逐处标注。`,
      chData ? `<span class="tag-count">${chV2} / ${chData.chapters.length}</span>` : ''],
    ['assessment', ico('compass'), 'Patient Assessment Model', '患者评估模型',
      'The backbone of both written and practical. Learn the exact official sequence.', '笔试和实操共同的主线，按官方顺序学。', ''],
    ['protocols', ico('list'), 'Protocols', '处置协议',
      'The decision trees examiners test: cardiac arrest to narcotic overdose.', '考官考的决策树：从心脏骤停到麻醉剂过量。', scopeTag(pMine, pAll)],
    ['treatments', ico('bandage'), 'Treatments', '处置主题',
      'Wound care, spinal, burns, CPR, environmental — every testable topic.', '伤口/脊柱/烧伤/CPR/环境急症——每个可考主题。', scopeTag(tMine, tAll)],
    ['drugs', ico('pill'), 'Drug Monographs', '药物专论',
      'Doses, contraindications, and who may give what.', '剂量、禁忌、给药权限。', scopeTag(dMine, dAll)],
    ['reference', ico('abc'), 'Reference', '速查参考',
      'Abbreviations, GCS, AVPU, history mnemonics, PCR fields.', '缩写表、GCS、AVPU、病史口诀、PCR 字段。', ''],
  ];
  el.innerHTML = `
    <div class="card">
      <h2>${ico('book')} ${t('Study Library', '学习内容库')} <span class="pill ${tr}">${tr.toUpperCase()}</span></h2>
      ${bi('Two layers. The Nancy Caroline chapter review is your textbook backbone — it teaches the subject. Everything below it is structured from the official BC Provincial Examination Guidelines (June 15, 2026), the only standard examiners may mark against, with page references throughout. When the textbook and the guidelines differ, the guidelines win.',
           '两层内容。Nancy Caroline 章节精读是教材主线——它负责把知识讲明白。它下面的全部内容结构化自 BC 官方考纲（2026年6月15日现行版）——考官唯一被允许采用的标准，每条都带原文页码。教材与考纲冲突时，一律以考纲为准。')}
    </div>
    <div class="notice">
      ${bi(isEmr
        ? `Filtered to the EMR scope: you see ${pMine} of ${pAll} protocols, ${tMine} of ${tAll} treatment topics, and ${dMine} of ${dAll} drugs. Assessment, history taking and most trauma and medical care are identical at both levels — what changes is which interventions you are authorized to perform (no IV, no CPAP, fewer drugs).`
        : `Full PCP scope: all ${pAll} protocols, ${tAll} treatment topics and ${dMine} of ${dAll} drugs are within your authorization. The extra ground over EMR is IV therapy, CPAP, fluid resuscitation and the PCP-only medications.`,
        isEmr
        ? `已按 EMR 授权范围过滤：协议 ${pMine}/${pAll}、处置主题 ${tMine}/${tAll}、药物 ${dMine}/${dAll}。评估流程、病史采集和大部分创伤/内科处置在两个等级是完全一样的——区别只在于"你被授权做哪些干预"（EMR 不能开 IV、不能用 CPAP、可用药更少）。`
        : `PCP 完整范围：${pAll} 个协议、${tAll} 个处置主题全部可用，药物 ${dMine}/${dAll} 在你的授权内。比 EMR 多出来的是 IV 治疗、CPAP、液体复苏和 PCP 专属药物。`)}
    </div>
    <div class="list-wrap">
      ${cards.map(c => `<button class="list-item" data-goto="/study/${c[0]}">
        <span style="display:inline-flex;color:var(--accent);font-size:1.15rem">${c[1]}</span>
        <span>${bi(c[2], c[3], 'span')}<div class="tiny">${t(c[4], c[5])}</div></span>
        ${c[6]}
        <span class="li-arrow">›</span></button>`).join('')}
    </div>`;
  el.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => nav(b.dataset.goto));
}

/* ---------------- sections ---------------- */
export async function renderStudySection(el, arg, params) {
  const fn = { chapters: sChapters, assessment: sAssessment, protocols: sProtocols, treatments: sTreatments, drugs: sDrugs, reference: sReference }[arg];
  if (!fn) { renderStudyHub(el); return; }
  await fn(el, params);
}
const backStudy = () => `<a class="back-link" href="#/study">← ${t('Study library', '学习内容库')}</a>`;
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

async function sAssessment(el) {
  const d = await loadJSON('./data/study/assessment-model.json');
  if (!d) { el.innerHTML = backStudy() + deploying('Assessment Model'); return; }
  el.innerHTML = `
    ${backStudy()}
    <div class="card">
      <h2>${ico('compass')} ${t('Patient Assessment Model', '患者评估模型')}</h2>
      <p class="tiny">${esc(d.meta.source)} · pp.${esc(d.meta.sourcePages)}</p>
      ${bi('Master this order until it is automatic — the practical exam is scored phase by phase against it.',
           '把这个顺序练到条件反射——实操考试就是按它逐阶段评分的。')}
    </div>
    ${(d.phases || []).map((p, i) => `
      <details class="acc">
        <summary><span class="step-num" style="flex:0 0 26px;height:26px;font-size:.8rem">${i + 1}</span> ${bi(p.nameEn, p.nameZh, 'span')}</summary>
        <div class="acc-body">
          ${(p.stepsEn || []).map((st, j) => {
            const zh = (p.stepsZh || [])[j] || {};
            return `<div class="chk" style="cursor:default">
              <span>${bi(st.step, zh.step, 'span')}${st.detail ? `<div class="tiny">${bi(st.detail, zh.detail || '', 'span')}</div>` : ''}</span>
              ${st.verbalize ? `<span class="chk-w" style="background:var(--accent-soft);color:var(--accent)"> ${t('say it', '要口述')}</span>` : ''}
            </div>`;
          }).join('')}
          ${(p.interventionsEn || []).length ? `<div class="detail-section"><h4>${t('Possible interventions', '可能触发的干预')}</h4><ul>${biList(p.interventionsEn, p.interventionsZh)}</ul></div>` : ''}
          <p class="tiny">p.${p.sourcePage || ''}</p>
        </div>
      </details>`).join('')}
    ${d.unstableCriteria ? `<div class="card"><h3 style="margin-top:0">${ico('cross')} ${t('Unstable / RTC criteria', '危重(RTC)判定标准')}</h3>
      ${d.unstableCriteria.descriptionEn ? bi(d.unstableCriteria.descriptionEn, d.unstableCriteria.descriptionZh) : ''}
      ${[['primarySurveyFindings', t('Primary survey findings', '初级评估发现')],
         ['anatomicalFindings', t('Anatomical findings', '解剖学发现')],
         ['mechanismOfInjury', t('Mechanism of injury', '受伤机制')]]
        .map(([key, label]) => sec(label, d.unstableCriteria[key + 'En'], d.unstableCriteria[key + 'Zh'])).join('')}
      <p class="tiny">pp. ${pages(d.unstableCriteria.sourcePages)}</p></div>` : ''}
    ${d.criticalHistory ? `<div class="card"><h3 style="margin-top:0"> ${t('Critical History Questions', '关键病史问题')}</h3>
      ${(d.criticalHistory.mnemonics || []).map(m => `<details class="acc"><summary><b>${esc(m.name)}</b>${m.supplementary ? ` <span class="pill gray">${t('study aid', '辅助记忆')}</span>` : ''}</summary>
        <div class="acc-body"><ul>${biList(m.expansionEn, m.expansionZh)}</ul></div></details>`).join('')}
      ${renderCriticalHistory(d.criticalHistory)}
    </div>` : ''}
    ${d.avpu ? `<div class="card"><h3 style="margin-top:0"> AVPU</h3>
      ${(d.avpu.levelsEn || []).map((lv, i) => {
        const lz = (d.avpu.levelsZh || [])[i] || {};
        return `<div class="chk" style="cursor:default">
          <span class="opt-key" style="background:var(--accent-soft);color:var(--accent);border:none">${esc(lv.letter || '')}</span>
          <span><b>${bi(lv.term, lz.term || lv.term, 'span')}</b><div class="tiny">${bi(lv.description, lz.description || '', 'span')}</div></span>
        </div>`;
      }).join('')}
      ${(d.avpu.notesEn || []).length ? `<div class="detail-section"><h4>${t('Notes', '要点')}</h4><ul>${biList(d.avpu.notesEn, d.avpu.notesZh)}</ul></div>` : ''}</div>` : ''}
    ${d.pcr ? `<div class="card"><h3 style="margin-top:0">${ico('list')} ${t('Patient Care Report fields', 'PCR 报告字段')}</h3><ul>${biList(d.pcr.fieldsEn, d.pcr.fieldsZh)}</ul></div>` : ''}`;
}

async function sProtocols(el, params) {
  const d = await loadJSON('./data/study/protocols.json');
  if (!d) { el.innerHTML = backStudy() + deploying('Protocols'); return; }
  const id = params.id;
  const list = d.protocols.filter(p => !(p.licence === 'pcp' && S.track === 'emr'));
  if (id) {
    const p = d.protocols.find(x => x.id === id);
    if (p) { drawProtocol(el, p); return; }
  }
  el.innerHTML = `
    ${backStudy()}
    <div class="card"><h2> ${t('Protocols', '处置协议')} <span class="pill ${S.track}">${S.track.toUpperCase()}</span></h2>
    ${bi('These 13 protocols are exactly what the practical examiners grade "cognitive ability and protocol decision-making" against.',
         '这 13 个协议就是实操考官评估"认知能力与协议决策"的依据。')}</div>
    <div class="list-wrap">
      ${list.map(p => `<button class="list-item" data-goto="/study/protocols?id=${p.id}">
        <span>${bi(p.nameEn, p.nameZh, 'span')}</span>
        ${p.licence === 'pcp' ? '<span class="pill pcp">PCP</span>' : ''}
        <span class="li-arrow">›</span></button>`).join('')}
    </div>`;
  el.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => nav(b.dataset.goto));
}
function drawProtocol(el, p) {
  el.innerHTML = `
    <a class="back-link" href="#/study/protocols">← ${t('Protocols', '协议列表')}</a>
    <div class="card">
      <h2>${bi(p.nameEn, p.nameZh, 'span')} ${p.licence === 'pcp' ? '<span class="pill pcp">PCP</span>' : ''}</h2>
      ${sec(t('Indications', '适应指征'), p.indicationsEn, p.indicationsZh)}
      ${sec(t('Contraindications', '禁忌'), p.contraindicationsEn, p.contraindicationsZh)}
      ${sec(t('Steps', '处置步骤'), p.stepsEn, p.stepsZh)}
      ${p.emrPcpDiffEn ? `<div class="detail-section"><h4>EMR vs PCP</h4>${bi(p.emrPcpDiffEn, p.emrPcpDiffZh)}</div>` : ''}
      ${sec(' ' + t('Common exam deductions', '考试常见扣分'), p.commonDeductionsEn, p.commonDeductionsZh)}
      ${(p.drugs || []).length ? `<div class="detail-section"><h4>${t('Linked drugs', '关联药物')}</h4><div class="btn-row">${p.drugs.map(dg => `<a class="btn ghost" href="#/study/drugs?id=${dg}">${esc(dg)}</a>`).join('')}</div></div>` : ''}
      <p class="tiny">pp. ${pages(p.sourcePages)}</p>
    </div>`;
}
// source page refs arrive as arrays in some files and plain strings in others
function pages(v) { return esc(Array.isArray(v) ? v.join(', ') : (v ?? '')); }
// criticalHistory.questionsEn is grouped by mechanism: [{category, questions[]}, …]
function renderCriticalHistory(ch) {
  const en = ch.questionsEn || [], zh = ch.questionsZh || [];
  if (!en.length) return '';
  if (typeof en[0] === 'string') {
    return `<div class="detail-section"><h4>${t('By mechanism', '按受伤机制')}</h4><ul>${biList(en, zh)}</ul></div>`;
  }
  return en.map((g, i) => {
    const gz = zh[i] || {};
    return `<details class="acc"><summary>${bi(g.category, gz.category || g.category, 'span')}</summary>
      <div class="acc-body"><ul>${biList(g.questions || [], gz.questions || [])}</ul></div></details>`;
  }).join('');
}
function sec(title, en = [], zh = []) {
  if (!en || !en.length) return '';
  return `<div class="detail-section"><h4>${title}</h4><ul>${biList(en, zh)}</ul></div>`;
}

async function sTreatments(el, params) {
  const d = await loadJSON('./data/study/treatments.json');
  if (!d) { el.innerHTML = backStudy() + deploying('Treatments'); return; }
  const id = params.id;
  const list = d.treatments.filter(x => !(x.licence === 'pcp' && S.track === 'emr'));
  if (id) {
    const x = d.treatments.find(y => y.id === id);
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
  const cats = {};
  for (const x of list) (cats[x.category || 'other'] ||= []).push(x);
  el.innerHTML = `
    ${backStudy()}
    <div class="card"><h2>${ico('bandage')} ${t('Treatments', '处置主题')} <span class="pill ${S.track}">${S.track.toUpperCase()}</span></h2></div>
    ${Object.entries(cats).map(([cat, xs]) => `
      <div class="card"><h3 style="margin-top:0">${esc(cat)}</h3></div>
      <div class="list-wrap">
        ${xs.map(x => `<button class="list-item" data-goto="/study/treatments?id=${x.id}">
          <span>${bi(x.titleEn, x.titleZh, 'span')}</span>
          ${x.licence === 'pcp' ? '<span class="pill pcp">PCP</span>' : ''}
          <span class="li-arrow">›</span></button>`).join('')}
      </div>`).join('')}`;
  el.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => nav(b.dataset.goto));
}

async function sDrugs(el, params) {
  const d = await loadJSON('./data/study/drugs.json');
  if (!d) { el.innerHTML = backStudy() + deploying('Drugs'); return; }
  const id = params.id;
  if (id) {
    const dr = d.drugs.find(x => x.id === id);
    if (dr) { drawDrug(el, dr); return; }
  }
  const mine = d.drugs.filter(dr => (dr.licence || []).map(s => s.toLowerCase()).includes(S.track));
  const others = d.drugs.filter(dr => !mine.includes(dr));
  el.innerHTML = `
    ${backStudy()}
    <div class="card"><h2>${ico('pill')} ${t('Drug Monographs', '药物专论')} <span class="pill ${S.track}">${S.track.toUpperCase()}</span></h2>
      ${bi(`${mine.length} drugs in your scope · ${others.length} beyond it (still worth recognizing).`,
           `你的授权范围内 ${mine.length} 个药 · 范围外 ${others.length} 个（也要认识）。`)}</div>
    <div class="list-wrap">
      ${mine.map(dr => drugRow(dr)).join('')}
    </div>
    ${others.length ? `<div class="card"><h3 style="margin-top:0">${t('Beyond your scope', '超出你的授权')}</h3></div>
    <div class="list-wrap">${others.map(dr => drugRow(dr)).join('')}</div>` : ''}`;
  el.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => nav(b.dataset.goto));
}
function drugRow(dr) {
  return `<button class="list-item" data-goto="/study/drugs?id=${dr.id}">
    <span>${bi(dr.nameEn, dr.nameZh, 'span')}</span>
    <span style="display:flex;gap:4px">${(dr.licence || []).map(l => `<span class="pill ${l.toLowerCase()}">${l}</span>`).join('')}</span>
    <span class="li-arrow">›</span></button>`;
}
function drawDrug(el, dr) {
  const dose = dr.doseEn || {}, doseZh = dr.doseZh || {};
  el.innerHTML = `
    <a class="back-link" href="#/study/drugs">← ${t('Drugs', '药物列表')}</a>
    <div class="card">
      <h2>${bi(dr.nameEn, dr.nameZh, 'span')}</h2>
      <div style="display:flex;gap:6px;margin:6px 0">${(dr.licence || []).map(l => `<span class="pill ${l.toLowerCase()}">${l}</span>`).join('')}
        ${(dr.routes || []).map(r => `<span class="pill gray">${esc(r)}</span>`).join('')}</div>
      ${dr.classificationEn ? `<div class="detail-section"><h4>${t('Class', '分类')}</h4>${bi(dr.classificationEn, dr.classificationZh)}</div>` : ''}
      ${sec(t('Indications', '适应指征'), dr.indicationsEn, dr.indicationsZh)}
      ${sec(' ' + t('Contraindications', '禁忌'), dr.contraindicationsEn, dr.contraindicationsZh)}
      ${sec(' ' + t('Cautions', '慎用'), dr.cautionsEn, dr.cautionsZh)}
      <div class="detail-section"><h4>${t('Dose', '剂量')}</h4>
        <table class="vitals-table">
          ${Object.entries(dose).filter(([, v]) => v).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${bi(v, doseZh[k] || '', 'span')}</td></tr>`).join('')}
        </table></div>
      ${sec(t('Side effects', '副作用'), dr.sideEffectsEn, dr.sideEffectsZh)}
      ${sec(t('Notes', '备注'), dr.notesEn, dr.notesZh)}
      ${sec(ico('info') + ' ' + t('Exam tips', '考试要点'), dr.examTipsEn, dr.examTipsZh)}
      <p class="tiny">p. ${dr.sourcePage || ''}</p>
    </div>`;
}

async function sReference(el) {
  const d = await loadJSON('./data/study/reference.json');
  if (!d) { el.innerHTML = backStudy() + deploying('Reference'); return; }
  el.innerHTML = `
    ${backStudy()}
    <div class="card">
      <h2>${ico('abc')} ${t('Abbreviations', '缩写表')} <span class="tag-count">${(d.abbreviations || []).length}</span></h2>
      <input class="search-box" id="abbrSearch" placeholder="${t('Search abbreviations…', '搜索缩写…')}" />
      <div id="abbrList"></div>
    </div>
    ${d.gcs ? `<div class="card"><h3 style="margin-top:0"> Glasgow Coma Scale</h3>
      <div class="grid-3">
        ${['eye', 'verbal', 'motor'].map(k => `<div><h4 style="text-transform:capitalize">${k}</h4>
          <ul style="padding-left:18px">${(d.gcs[k] || []).map(x => `<li class="tiny">${esc(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('')}</ul></div>`).join('')}
      </div>
      ${(d.gcs.notesEn || []).length ? `<ul>${biList(d.gcs.notesEn, d.gcs.notesZh)}</ul>` : ''}</div>` : ''}`;
  const listEl = el.querySelector('#abbrList');
  const drawAbbr = q => {
    const rows = (d.abbreviations || []).filter(a => !q || a.abbr.toLowerCase().includes(q) || (a.en || '').toLowerCase().includes(q));
    listEl.innerHTML = `<table class="vitals-table">${rows.slice(0, 200).map(a =>
      `<tr><th style="white-space:nowrap">${esc(a.abbr)}</th><td>${bi(a.en, a.zh, 'span')}</td></tr>`).join('')}</table>`;
  };
  drawAbbr('');
  el.querySelector('#abbrSearch').oninput = e => drawAbbr(e.target.value.trim().toLowerCase());
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
    <div class="card">
      <h2> ${t('Jurisprudence Camp', '法规营')}</h2>
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
    <a class="back-link" href="#/juris">← ${t('Jurisprudence camp', '法规营')}</a>
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
    <a class="back-link" href="#/juris">← ${t('Jurisprudence camp', '法规营')}</a>
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
    <a class="back-link" href="#/juris">← ${t('Jurisprudence camp', '法规营')}</a>
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
      <a class="back-link" href="#/juris">← ${t('Jurisprudence camp', '法规营')}</a>
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
