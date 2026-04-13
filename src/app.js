const state = {
  lang: 'en',
  data: null,
  examData: null,
  reviewData: null,
  coprData: null,
  coprMockData: null,
  scenariosData: null,
  currentQuestions: [],
  currentIndex: 0,
  scoreCorrect: 0,
  scoreTotal: 0,
  selectedChapterId: null,
  selectedReviewChapterId: null,
  selectedCoprSectionId: null,
  selectedScenarioId: null,
  currentMode: 'nancy',
  wrongStorageKey: 'nancyQuizWrongAnswersV2'
};

const i18n = {
  zh: {
    appTitle: 'BC PCP 学习系统',
    appSubtitle: 'Nancy + BC PCP + BC Handbook · 中英双语互动备考系统',
    menuTitle: '学习模式',
    navHome: '首页',
    navChapters: '按章节学习',
    navPractice: '随机练习',
    navReview: '章节讲义',
    navWrong: '错题本',
    navExam: 'EMR/PCP 考试题库',
    navCopr: 'BC PCP',
    navScenarios: 'SCENARIOS',
    navGuidelines: '指引入口',
    statusTitle: '项目状态',
    statusList: ['阶段：BC PCP 2027 定向版', '语言：中英双语', '题库：可扩展 JSON', '范围：Nancy + BC PCP written exam'],
    homeGoalTitle: '项目目标',
    homeGoalText: '这不是普通小测验，而是一个面向 BC PCP 2027 考生的网页版互动备考系统。目标是把 Nancy 基础、BC handbook 思路、BC 临床判断与模拟考试整合到同一个学习入口里。',
    homeSupportedTitle: '当前已支持',
    homeSupportedList: ['Nancy 章节题库', 'BC PCP mock exam', 'BC handbook 导向讲义', '错题本（本地浏览器保存）', 'CPR 场景化 scenarios'],
    homeNextTitle: '接下来会补',
    homeNextList: ['更多 BC 高频块', '更细的 mock 题型分层', '弱项反馈', '更完整的 BC written exam roadmap'],
    homeProgressNote: '当前重点：继续把系统压成 BC PCP 2027 written exam 备考方向。',
    startPracticeBtn: '开始练习',
    chaptersTitle: '按章节学习',
    practiceTitle: '练习模式',
    practiceMeta: '请选择一道题开始',
    scoreLabel: '分数',
    nextQuestionBtn: '下一题',
    reviewTitle: '章节讲义',
    reviewIntro: '这里按 chapter 提供重点总结和 highlights，帮助快速抓住本章主轴。',
    reviewEmpty: '请选择一个 chapter 查看重点。',
    reviewBackLabel: '← 返回 Chapter Review',
    summaryLabel: 'Summary',
    highlightsLabel: 'Highlights',
    keyPointsLabel: 'Key Points',
    mustKnowLabel: 'Must Know',
    commonConfusionsLabel: 'Common Confusions / Test Traps',
    wrongTitle: '错题本',
    wrongIntro: '错题只保存在当前浏览器本地，不会同步到线上。',
    noWrong: '当前还没有错题。',
    clearWrongLabel: '清空错题',
    wrongSourceNancy: 'Nancy 题库',
    wrongSourceExam: 'BC Guideline Exam 题库',
    examTitle: 'EMR/PCP 考试题库',
    examIntro: '这里是独立于 Nancy chapter 题库之外的 BC Provincial Examination Guideline 模拟题区。',
    coprTitle: 'BC PCP',
    coprIntro: '这里不再做泛 COPR 说明，而是专门整理 BC PCP 2027 written exam 真正相关的备考逻辑、BC handbook 高频思路与临床判断框架。',
    coprBackLabel: '← 返回 BC PCP',
    coprSourceLabel: '来源：BC Handbook / BCEHS Clinical Practice Guidelines / BC-focused exam prep notes',
    coprMockTitle: 'BC PCP Mock Exam',
    coprMockIntro: '这里提供面向 BC PCP 2027 written exam 的 mock 题。每次开始都会从 1000 题里随机抽 50 题。',
    scenariosTitle: 'SCENARIOS',
    scenariosIntro: '这里整理 10 个 BC PCP license exam 风格、且都会进入 CPR 的 call。每个场景都给你现场背景、到场所见、CPR 核心点和考试高分提醒。',
    guidelinesTitle: '指引入口',
    guidelinesIntro: '这里保留 BC 相关 guideline / handbook 入口，后续继续补。',
    startLabel: '开始',
    openLinkLabel: '打开链接',
    complete: '这组题做完了。',
    practiceComplete: '已完成当前练习',
    explanation: '解析'
  },
  en: {
    appTitle: 'BC PCP Study System',
    appSubtitle: 'Nancy + BC PCP + BC Handbook · Bilingual Interactive Exam Prep',
    menuTitle: 'Study Modes',
    navHome: 'Home',
    navChapters: 'Study by Chapter',
    navPractice: 'Random Practice',
    navReview: '章节讲义',
    navWrong: '错题本',
    navExam: 'EMR/PCP 考试题库',
    navCopr: 'BC PCP',
    navScenarios: 'SCENARIOS',
    navGuidelines: '指引入口',
    statusTitle: 'Project Status',
    statusList: ['Stage: BC PCP 2027 targeted build', 'Language: Bilingual (ZH/EN)', 'Question bank: Expandable JSON', 'Scope: Nancy + BC PCP written exam'],
    homeGoalTitle: 'Project Goal',
    homeGoalText: 'This is a web-based interactive prep system built for a BC PCP 2027 candidate. The goal is to combine Nancy foundations, BC handbook logic, BC clinical judgment, and mock exams in one study workflow.',
    homeSupportedTitle: 'Currently Supported',
    homeSupportedList: ['Nancy chapter bank', 'BC PCP mock exam', 'BC handbook-driven study notes', 'Wrong-answer notebook (browser local storage)', 'CPR scenario bank'],
    homeNextTitle: 'Coming Next',
    homeNextList: ['More BC high-yield blocks', 'Better mock-exam difficulty layering', 'Weak-topic feedback', 'A fuller BC written-exam roadmap'],
    homeProgressNote: 'Current priority: pushing the system harder toward BC PCP 2027 written-exam prep.',
    startPracticeBtn: 'Start Practice',
    chaptersTitle: 'Study by Chapter',
    practiceTitle: 'Practice Mode',
    practiceMeta: 'Choose a question set to begin',
    scoreLabel: 'Score',
    nextQuestionBtn: 'Next Question',
    reviewTitle: '章节讲义',
    reviewIntro: 'This section provides chapter-by-chapter summaries and highlights for fast review.',
    reviewEmpty: 'Choose a chapter to view the review notes.',
    reviewBackLabel: '← Back to Chapter Review',
    summaryLabel: 'Summary',
    highlightsLabel: 'Highlights',
    keyPointsLabel: 'Key Points',
    mustKnowLabel: 'Must Know',
    commonConfusionsLabel: 'Common Confusions / Test Traps',
    wrongTitle: '错题本',
    wrongIntro: 'Wrong answers are saved only in this browser locally and are not synced online.',
    noWrong: 'No wrong answers yet.',
    clearWrongLabel: 'Clear Wrong Answers',
    wrongSourceNancy: 'Nancy question bank',
    wrongSourceExam: 'BC Guideline exam bank',
    examTitle: 'EMR/PCP 考试题库',
    examIntro: 'This is a standalone BC Provincial Examination Guideline question area, separate from the Nancy chapter bank.',
    coprTitle: 'BC PCP',
    coprIntro: 'This section is no longer generic COPR commentary. It is now focused on BC PCP 2027 written-exam prep, BC handbook high-yield logic, and the clinical judgment patterns that matter most for BC-focused study.',
    coprBackLabel: '← Back to BC PCP',
    coprSourceLabel: 'Source: BC Handbook / BCEHS Clinical Practice Guidelines / BC-focused exam prep notes',
    coprMockTitle: 'BC PCP Mock Exam',
    coprMockIntro: 'This section provides mock questions aimed at BC PCP 2027 written-exam prep. Each start pulls a random 50-question test from a 1000-question bank.',
    scenariosTitle: 'SCENARIOS',
    scenariosIntro: 'This section gives 10 BC PCP license-exam style calls that all progress to CPR. Each scenario includes dispatch context, arrival findings, CPR focus points, and exam pearls.',
    guidelinesTitle: '指引入口',
    guidelinesIntro: 'This section is reserved for BC-relevant guideline and handbook entry points.',
    startLabel: 'Start',
    openLinkLabel: 'Open Link',
    complete: 'This set is complete.',
    practiceComplete: 'Current practice complete',
    explanation: 'Explanation'
  }
};

const els = {
  views: {
    home: document.getElementById('homeView'),
    chapters: document.getElementById('chaptersView'),
    practice: document.getElementById('practiceView'),
    review: document.getElementById('reviewView'),
    reviewDetail: document.getElementById('reviewDetailView'),
    wrong: document.getElementById('wrongView'),
    exam: document.getElementById('examView'),
    copr: document.getElementById('coprView'),
    coprDetail: document.getElementById('coprDetailView'),
    coprMock: document.getElementById('coprMockView'),
    scenarios: document.getElementById('scenariosView'),
    scenarioDetail: document.getElementById('scenarioDetailView'),
    guidelines: document.getElementById('guidelinesView')
  },
  chapterList: document.getElementById('chapterList'),
  questionBox: document.getElementById('questionBox'),
  scoreValue: document.getElementById('scoreValue'),
  practiceTitle: document.getElementById('practiceTitle'),
  practiceMeta: document.getElementById('practiceMeta'),
  reviewList: document.getElementById('reviewList'),
  reviewDetail: document.getElementById('reviewDetail'),
  reviewBackBtn: document.getElementById('reviewBackBtn'),
  wrongList: document.getElementById('wrongList'),
  examList: document.getElementById('examList'),
  coprList: document.getElementById('coprList'),
  coprDetail: document.getElementById('coprDetail'),
  coprBackBtn: document.getElementById('coprBackBtn'),
  coprMockList: document.getElementById('coprMockList'),
  scenariosList: document.getElementById('scenariosList'),
  scenarioDetail: document.getElementById('scenarioDetail'),
  scenarioBackBtn: document.getElementById('scenarioBackBtn'),
  guidelinesList: document.getElementById('guidelinesList'),
  nextQuestionBtn: document.getElementById('nextQuestionBtn'),
  langToggle: document.getElementById('langToggle'),
  startPracticeBtn: document.getElementById('startPracticeBtn')
};

function getExamGroups() {
  return state.examData?.groups || [];
}

const guidelineLinks = [
  {
    titleEn: 'BCEHS Clinical Practice Guidelines',
    titleZh: 'BCEHS Clinical Practice Guidelines',
    url: 'https://handbook.bcehs.ca/clinical-practice-guidelines/'
  },
  {
    titleEn: 'BLS Treatment Guidelines (BCEHS Handbook)',
    titleZh: 'BLS Treatment Guidelines（BCEHS Handbook）',
    url: 'https://handbook.bcehs.ca/clinical-resources/treatment-guidelines/'
  },
  {
    titleEn: 'COPR Paramedic Competency Profile',
    titleZh: 'COPR Paramedic Competency Profile',
    url: 'https://copr.ca/'
  }
];

function t(key) { return i18n[state.lang][key]; }
function getWrongAnswers() {
  try {
    return JSON.parse(localStorage.getItem(state.wrongStorageKey) || '[]');
  } catch {
    return [];
  }
}
function saveWrongAnswer(entry) {
  const current = getWrongAnswers();
  const exists = current.some(item => item.id === entry.id && item.mode === entry.mode);
  if (!exists) {
    current.unshift(entry);
    localStorage.setItem(state.wrongStorageKey, JSON.stringify(current));
  }
}
function clearWrongAnswers() {
  localStorage.removeItem(state.wrongStorageKey);
  renderWrongAnswers();
}
function setView(name) {
  Object.entries(els.views).forEach(([key, el]) => el.classList.toggle('hidden', key !== name));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === name));
  if (name === 'review') renderChapterReviewList();
  if (name === 'wrong') renderWrongAnswers();
  if (name === 'exam') renderExamGroups();
  if (name === 'copr') renderCoprList();
  if (name === 'coprMock') renderCoprMockList();
  if (name === 'scenarios') renderScenarios();
  if (name === 'scenarioDetail') renderScenarioDetail();
  if (name === 'guidelines') renderGuidelineLinks();
}
function renderStaticText() {
  document.getElementById('appTitle').textContent = t('appTitle');
  document.getElementById('appSubtitle').textContent = t('appSubtitle');
  document.getElementById('menuTitle').textContent = t('menuTitle');
  document.getElementById('navHome').textContent = t('navHome');
  document.getElementById('navChapters').textContent = t('navChapters');
  document.getElementById('navPractice').textContent = t('navPractice');
  document.getElementById('navReview').textContent = t('navReview');
  document.getElementById('navWrong').textContent = t('navWrong');
  document.getElementById('navExam').textContent = t('navExam');
  document.getElementById('navCopr').textContent = t('navCopr');
  document.getElementById('navScenarios').textContent = t('navScenarios');
  document.getElementById('navGuidelines').textContent = t('navGuidelines');
  document.getElementById('statusTitle').textContent = t('statusTitle');
  document.getElementById('homeGoalTitle').textContent = t('homeGoalTitle');
  document.getElementById('homeGoalText').textContent = t('homeGoalText');
  document.getElementById('homeSupportedTitle').textContent = t('homeSupportedTitle');
  document.getElementById('homeNextTitle').textContent = t('homeNextTitle');
  document.getElementById('homeProgressNote').textContent = t('homeProgressNote');
  document.getElementById('homeQuestionCount').textContent = state.data ? (state.lang === 'zh' ? `Current question count / 当前题库总数：${state.data.questions.length}` : `Current question count: ${state.data.questions.length}`) : '';
  document.getElementById('chaptersTitle').textContent = t('chaptersTitle');
  document.getElementById('reviewTitle').textContent = t('reviewTitle');
  document.getElementById('reviewIntro').textContent = t('reviewIntro');
  els.reviewBackBtn.textContent = t('reviewBackLabel');
  document.getElementById('wrongTitle').textContent = t('wrongTitle');
  document.getElementById('wrongIntro').textContent = t('wrongIntro');
  document.getElementById('examTitle').textContent = t('examTitle');
  document.getElementById('examIntro').textContent = t('examIntro');
  document.getElementById('coprTitle').textContent = t('coprTitle');
  document.getElementById('coprIntro').textContent = t('coprIntro');
  els.coprBackBtn.textContent = t('coprBackLabel');
  document.getElementById('coprMockTitle').textContent = t('coprMockTitle');
  document.getElementById('coprMockIntro').textContent = t('coprMockIntro');
  document.getElementById('scenariosTitle').textContent = t('scenariosTitle');
  document.getElementById('scenariosIntro').textContent = t('scenariosIntro');
  document.getElementById('guidelinesTitle').textContent = t('guidelinesTitle');
  document.getElementById('guidelinesIntro').textContent = t('guidelinesIntro');
  if (els.scenarioBackBtn) els.scenarioBackBtn.textContent = state.lang === 'zh' ? '← 返回 Scenarios' : '← Back to Scenarios';
  document.getElementById('scoreLabel').textContent = t('scoreLabel');
  els.nextQuestionBtn.textContent = t('nextQuestionBtn');
  els.startPracticeBtn.textContent = t('startPracticeBtn');

  const statusList = document.getElementById('statusList');
  statusList.innerHTML = t('statusList').map(item => `<li>${item}</li>`).join('');
  document.getElementById('homeSupportedList').innerHTML = t('homeSupportedList').map(item => `<li>${item}</li>`).join('');
  document.getElementById('homeNextList').innerHTML = t('homeNextList').map(item => `<li>${item}</li>`).join('');
}
function renderChapters() {
  els.chapterList.innerHTML = '';
  state.data.chapters.forEach(ch => {
    const div = document.createElement('div');
    div.className = 'chapter-item';
    div.innerHTML = `
      <div><strong>${state.lang === 'zh' ? ch.titleZh : ch.titleEn}</strong></div>
      <button data-chapter="${ch.id}">${t('startLabel')}</button>`;
    div.querySelector('button').addEventListener('click', () => startChapterPractice(ch.id));
    els.chapterList.appendChild(div);
  });
}
function updateScore() { els.scoreValue.textContent = `${state.scoreCorrect} / ${state.scoreTotal}`; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function startChapterPractice(chapterId) {
  state.currentMode = 'nancy';
  state.selectedChapterId = chapterId;
  state.currentQuestions = shuffle(state.data.questions.filter(q => q.chapterId === chapterId));
  state.currentIndex = 0; state.scoreCorrect = 0; state.scoreTotal = 0; updateScore(); setView('practice'); renderQuestion();
}
function startRandomPractice() {
  state.currentMode = 'nancy';
  state.selectedChapterId = null;
  state.currentQuestions = shuffle(state.data.questions);
  state.currentIndex = 0; state.scoreCorrect = 0; state.scoreTotal = 0; updateScore(); setView('practice'); renderQuestion();
}
function startExamGroup(groupId) {
  state.currentMode = 'exam';
  state.selectedChapterId = null;
  state.currentQuestions = shuffle(state.examData.questions.filter(q => q.groupId === groupId));
  state.currentIndex = 0; state.scoreCorrect = 0; state.scoreTotal = 0; updateScore(); setView('practice'); renderQuestion();
}
function renderQuestion() {
  const q = state.currentQuestions[state.currentIndex];
  if (!q) {
    els.questionBox.innerHTML = `<p class="empty">${t('complete')}</p>`;
    els.practiceMeta.textContent = t('practiceComplete');
    return;
  }
  const chapter = state.currentMode === 'nancy' ? state.data.chapters.find(ch => ch.id === q.chapterId) : null;
  const examGroup = state.currentMode === 'exam' ? state.examData.groups.find(group => group.id === q.groupId) : null;
  const coprMockGroup = state.currentMode === 'coprMock' ? state.coprMockData.groups.find(group => group.id === q.groupId) : null;
  els.practiceTitle.textContent = state.currentMode === 'exam'
    ? (state.lang === 'zh' ? (examGroup?.titleZh || t('examTitle')) : (examGroup?.titleEn || t('examTitle')))
    : state.currentMode === 'coprMock'
      ? (state.lang === 'zh' ? (coprMockGroup?.titleZh || t('coprMockTitle')) : (coprMockGroup?.titleEn || t('coprMockTitle')))
      : (state.lang === 'zh' ? (chapter?.titleZh || t('practiceTitle')) : (chapter?.titleEn || t('practiceTitle')));
  els.practiceMeta.textContent = `${state.currentIndex + 1} / ${state.currentQuestions.length}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'question-card';
  wrapper.innerHTML = `<h3>${state.lang === 'zh' ? q.questionZh : q.questionEn}</h3><div class="options"></div><div class="explanation hidden"></div>`;
  const optionsDiv = wrapper.querySelector('.options');
  const explanationDiv = wrapper.querySelector('.explanation');
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<strong>${opt.key}.</strong> ${state.lang === 'zh' ? opt.zh : opt.en}`;
    btn.addEventListener('click', () => {
      if (wrapper.dataset.answered === 'true') return;
      wrapper.dataset.answered = 'true'; state.scoreTotal += 1;
      const isCorrect = opt.key === q.answer;
      if (isCorrect) {
        state.scoreCorrect += 1;
        btn.classList.add('correct');
      } else {
        btn.classList.add('wrong');
        saveWrongAnswer({
          id: q.id,
          mode: state.currentMode,
          question: state.lang === 'zh' ? q.questionZh : q.questionEn,
          context: state.currentMode === 'exam'
            ? (state.lang === 'zh' ? (examGroup?.titleZh || t('examTitle')) : (examGroup?.titleEn || t('examTitle')))
            : state.currentMode === 'coprMock'
              ? (state.lang === 'zh' ? (coprMockGroup?.titleZh || t('coprMockTitle')) : (coprMockGroup?.titleEn || t('coprMockTitle')))
              : (state.lang === 'zh' ? (chapter?.titleZh || t('chaptersTitle')) : (chapter?.titleEn || t('chaptersTitle'))),
          explanation: state.lang === 'zh' ? q.explanationZh : q.explanationEn
        });
      }
      [...optionsDiv.children].forEach(child => { const childKey = child.textContent.trim().charAt(0); if (childKey === q.answer) child.classList.add('correct'); });
      explanationDiv.classList.remove('hidden');
      explanationDiv.innerHTML = `<strong>${t('explanation')}</strong><p>${state.lang === 'zh' ? q.explanationZh : q.explanationEn}</p>`;
      updateScore();
    });
    optionsDiv.appendChild(btn);
  });
  els.questionBox.innerHTML = ''; els.questionBox.appendChild(wrapper);
}
function renderChapterReviewList() {
  const reviews = state.reviewData?.reviews || [];
  els.reviewList.innerHTML = reviews.map(item => `
    <div class="chapter-item review-item">
      <div><strong>${state.lang === 'zh' ? item.titleZh : item.titleEn}</strong></div>
      <button data-review-open="${item.chapterId}">${t('startLabel')}</button>
    </div>
  `).join('');
  els.reviewList.querySelectorAll('button[data-review-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedReviewChapterId = btn.dataset.reviewOpen;
      renderChapterReviewDetail();
      setView('reviewDetail');
    });
  });
  if (!reviews.length) {
    els.reviewList.innerHTML = `<p class="empty">${t('reviewEmpty')}</p>`;
  }
}
function renderChapterReviewDetail() {
  const item = (state.reviewData?.reviews || []).find(r => r.chapterId === state.selectedReviewChapterId);
  if (!item) {
    els.reviewDetail.innerHTML = `<p class="empty">${t('reviewEmpty')}</p>`;
    return;
  }
  const title = state.lang === 'zh' ? (item.titleZh || item.titleEn) : (item.titleEn || item.titleZh);
  const summary = state.lang === 'zh' ? (item.summaryZh || item.summaryEn || '') : (item.summaryEn || item.summaryZh || '');
  const highlights = state.lang === 'zh' ? (item.highlightsZh || item.highlightsEn || []) : (item.highlightsEn || item.highlightsZh || []);
  const keyPoints = state.lang === 'zh' ? (item.keyPointsZh || item.keyPointsEn || []) : (item.keyPointsEn || item.keyPointsZh || []);
  const mustKnow = state.lang === 'zh' ? (item.mustKnowZh || item.mustKnowEn || []) : (item.mustKnowEn || item.mustKnowZh || []);
  const commonConfusions = state.lang === 'zh' ? (item.commonConfusionsZh || item.commonConfusionsEn || []) : (item.commonConfusionsEn || item.commonConfusionsZh || []);

  els.reviewDetail.innerHTML = `
    <h3>${title}</h3>
    <div class="review-section">
      <strong>${t('summaryLabel')}</strong>
      <p>${summary}</p>
    </div>
    <div class="review-section">
      <strong>${t('highlightsLabel')}</strong>
      <ul>${highlights.map(point => `<li>${point}</li>`).join('')}</ul>
    </div>
    ${keyPoints.length ? `
      <div class="review-section">
        <strong>${t('keyPointsLabel')}</strong>
        <ul>${keyPoints.map(point => `<li>${point}</li>`).join('')}</ul>
      </div>
    ` : ''}
    ${mustKnow.length ? `
      <div class="review-section">
        <strong>${t('mustKnowLabel')}</strong>
        <ul>${mustKnow.map(point => `<li>${point}</li>`).join('')}</ul>
      </div>
    ` : ''}
    ${commonConfusions.length ? `
      <div class="review-section">
        <strong>${t('commonConfusionsLabel')}</strong>
        <ul>${commonConfusions.map(point => `<li>${point}</li>`).join('')}</ul>
      </div>
    ` : ''}
  `;
}
function renderCoprList() {
  const sections = state.coprData?.sections || [];
  els.coprList.innerHTML = `
    <div class="chapter-item review-item">
      <div><strong>${state.lang === 'zh' ? 'COPR Mock Exam' : 'COPR Mock Exam'}</strong></div>
      <button data-copr-mock-open="1">${t('startLabel')}</button>
    </div>
    ${sections.map(section => `
      <div class="chapter-item review-item">
        <div><strong>${state.lang === 'zh' ? section.titleZh : section.titleEn}</strong></div>
        <button data-copr-open="${section.id}">${t('startLabel')}</button>
      </div>
    `).join('')}
  `;
  els.coprList.querySelectorAll('button[data-copr-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedCoprSectionId = btn.dataset.coprOpen;
      renderCoprDetail();
      setView('coprDetail');
    });
  });
  els.coprList.querySelector('[data-copr-mock-open]')?.addEventListener('click', () => {
    renderCoprMockList();
    setView('coprMock');
  });
}
function renderCoprDetail() {
  const item = (state.coprData?.sections || []).find(section => section.id === state.selectedCoprSectionId);
  if (!item) {
    els.coprDetail.innerHTML = `<p class="empty">${t('coprIntro')}</p>`;
    return;
  }
  const title = state.lang === 'zh' ? item.titleZh : item.titleEn;
  const body = state.lang === 'zh' ? item.bodyZh : item.bodyEn;
  const highlights = state.lang === 'zh' ? item.highlightsZh : item.highlightsEn;
  els.coprDetail.innerHTML = `
    <h3>${title}</h3>
    <div class="review-section"><div class="empty">${t('coprSourceLabel')}</div></div>
    <div class="review-section">${body.map(p => `<p>${p}</p>`).join('')}</div>
    <div class="review-section">
      <strong>${t('highlightsLabel')}</strong>
      <ul>${highlights.map(point => `<li>${point}</li>`).join('')}</ul>
    </div>
  `;
}
function startCoprMockExam(groupId) {
  state.currentMode = 'coprMock';
  state.selectedChapterId = null;
  const all = state.coprMockData.questions.filter(q => q.groupId === groupId);
  state.currentQuestions = shuffle(all).slice(0, 50);
  state.currentIndex = 0;
  state.scoreCorrect = 0;
  state.scoreTotal = 0;
  updateScore();
  setView('practice');
  renderQuestion();
}
function renderCoprMockList() {
  const groups = state.coprMockData?.groups || [];
  els.coprMockList.innerHTML = groups.map(group => {
    const count = state.coprMockData.questions.filter(q => q.groupId === group.id).length;
    return `
      <div class="resource-card">
        <div>
          <strong>${state.lang === 'zh' ? group.titleZh : group.titleEn}</strong>
          <div class="empty">${state.lang === 'zh' ? group.descriptionZh : group.descriptionEn}</div>
          <div class="empty">${state.lang === 'zh' ? `题库总数：${count}；每次开始随机抽 50 题` : `Bank size: ${count}; each start draws a random 50-question test`}</div>
        </div>
        <button data-copr-mock-id="${group.id}">${t('startLabel')}</button>
      </div>
    `;
  }).join('');
  els.coprMockList.querySelectorAll('button[data-copr-mock-id]').forEach(btn => {
    btn.addEventListener('click', () => startCoprMockExam(btn.dataset.coprMockId));
  });
}
function renderWrongAnswers() {
  const wrong = getWrongAnswers();
  if (!wrong.length) {
    els.wrongList.innerHTML = `<p class="empty">${t('noWrong')}</p>`;
    return;
  }
  els.wrongList.innerHTML = `
    <div class="wrong-toolbar">
      <button id="clearWrongBtn">${t('clearWrongLabel')}</button>
    </div>
    ${wrong.map(item => `
      <div class="resource-card wrong-answer-card">
        <div>
          <strong>${item.question}</strong>
          <div class="empty">${item.mode === 'exam' ? t('wrongSourceExam') : item.mode === 'coprMock' ? 'COPR Mock Exam' : t('wrongSourceNancy')}</div>
          <div class="empty">${item.context}</div>
          <div class="explanation-inline"><strong>${t('explanation')}</strong> ${item.explanation}</div>
        </div>
      </div>
    `).join('')}
  `;
  document.getElementById('clearWrongBtn')?.addEventListener('click', clearWrongAnswers);
}
function renderExamGroups() {
  const groups = getExamGroups();
  els.examList.innerHTML = groups.map(group => {
    const count = state.examData.questions.filter(q => q.groupId === group.id).length;
    return `
    <div class="resource-card">
      <div>
        <strong>${state.lang === 'zh' ? group.titleZh : group.titleEn}</strong>
        <div class="empty">${state.lang === 'zh' ? group.descriptionZh : group.descriptionEn}</div>
        <div class="empty">${state.lang === 'zh' ? `题数：${count}` : `Questions: ${count}`}</div>
      </div>
      <button data-exam-id="${group.id}">${t('startLabel')}</button>
    </div>
  `}).join('');
  els.examList.querySelectorAll('button[data-exam-id]').forEach(btn => {
    btn.addEventListener('click', () => startExamGroup(btn.dataset.examId));
  });
}
function renderScenarioTable(item) {
  const title = state.lang === 'zh' ? item.titleZh : item.titleEn;
  const background = state.lang === 'zh' ? item.backgroundZh : item.backgroundEn;
  const sceneSurvey = state.lang === 'zh' ? item.sceneSurveyZh : item.sceneSurveyEn;
  const condition = state.lang === 'zh' ? item.conditionZh : item.conditionEn;
  const primarySurvey = state.lang === 'zh' ? item.primarySurveyZh : item.primarySurveyEn;
  const secondarySurvey = state.lang === 'zh' ? item.secondarySurveyZh : item.secondarySurveyEn;
  const vitalSigns = state.lang === 'zh' ? item.vitalSignsZh : item.vitalSignsEn;
  const comments = state.lang === 'zh' ? item.commentsZh : item.commentsEn;
  const rapidTransport = state.lang === 'zh' ? item.rapidTransportZh : item.rapidTransportEn;
  const interventions = state.lang === 'zh' ? item.interventionsZh : item.interventionsEn;
  const handover = state.lang === 'zh' ? item.handoverZh : item.handoverEn;
  const bonusPoints = state.lang === 'zh' ? item.bonusPointsZh : item.bonusPointsEn;
  return `
    <div class="scenario-card scenario-table-card">
      <table class="scenario-table">
        <tr>
          <th>${state.lang === 'zh' ? 'Scenario' : 'Scenario'}</th>
          <td>${title}</td>
          <th>${state.lang === 'zh' ? 'Scenario No' : 'Scenario No'}</th>
          <td class="scenario-no-cell">${item.scenarioNo}</td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Background' : 'Background'}</th>
          <td colspan="3">${background}</td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Scene Survey' : 'Scene Survey'}</th>
          <td colspan="3">${sceneSurvey}</td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Condition of Patient' : 'Condition of Patient'}</th>
          <td colspan="3">${condition}</td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Primary Survey' : 'Primary Survey'}</th>
          <td colspan="3"><ul class="scenario-table-list">${primarySurvey.map(point => `<li>${point}</li>`).join('')}</ul></td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Secondary Survey Interview' : 'Secondary Survey Interview'}</th>
          <td colspan="3"><ul class="scenario-table-list">${secondarySurvey.map(point => `<li>${point}</li>`).join('')}</ul></td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Vital Signs' : 'Vital Signs'} <span class="scenario-q">(Q.${item.scenarioNo})</span></th>
          <td colspan="3"><ul class="scenario-table-list">${vitalSigns.map(point => `<li>${point}</li>`).join('')}</ul></td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Rapid Transport?' : 'Rapid Transport?'}</th>
          <td>${rapidTransport}</td>
          <th>${state.lang === 'zh' ? 'Interventions' : 'Interventions'}</th>
          <td><ul class="scenario-table-list">${interventions.map(point => `<li>${point}</li>`).join('')}</ul></td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Handover' : 'Handover'}</th>
          <td colspan="3">${handover}</td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Comments' : 'Comments'}</th>
          <td colspan="3">${comments}</td>
        </tr>
        <tr>
          <th>${state.lang === 'zh' ? 'Bonus Points' : 'Bonus Points'}</th>
          <td colspan="3"><ul class="scenario-table-list">${bonusPoints.map(point => `<li>${point}</li>`).join('')}</ul></td>
        </tr>
      </table>
    </div>
  `;
}
function renderScenarios() {
  const scenarios = state.scenariosData?.scenarios || [];
  els.scenariosList.innerHTML = scenarios.map(item => `
    <div class="scenario-item-button-wrap">
      <button class="scenario-open-btn" data-scenario-open="${item.id}">
        <span>${state.lang === 'zh' ? item.titleZh : item.titleEn}</span>
        <span class="scenario-open-meta">${item.scenarioNo}</span>
      </button>
    </div>
  `).join('');
  els.scenariosList.querySelectorAll('button[data-scenario-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedScenarioId = btn.dataset.scenarioOpen;
      renderScenarioDetail();
      setView('scenarioDetail');
    });
  });
}
function renderScenarioDetail() {
  const item = (state.scenariosData?.scenarios || []).find(s => s.id === state.selectedScenarioId);
  if (!item) {
    els.scenarioDetail.innerHTML = `<p class="empty">No scenario selected.</p>`;
    return;
  }
  els.scenarioDetail.innerHTML = renderScenarioTable(item);
}
function renderGuidelineLinks() {
  els.guidelinesList.innerHTML = guidelineLinks.map(link => `
    <div class="resource-card">
      <div>
        <strong>${state.lang === 'zh' ? link.titleZh : link.titleEn}</strong>
        <div class="empty"><a href="${link.url}" target="_blank" rel="noreferrer">${link.url}</a></div>
      </div>
      <a class="resource-link-btn" href="${link.url}" target="_blank" rel="noreferrer">${t('openLinkLabel')}</a>
    </div>
  `).join('');
}
async function init() {
  const [nancyRes, examRes, reviewRes, coprRes, coprMockRes, scenariosRes] = await Promise.all([
    fetch(`./data/question-bank.json?v=20260404-1426`),
    fetch(`./data/exam-bank.json?v=20260404-1426`),
    fetch(`./data/chapter-review.json?v=20260404-1426`),
    fetch(`./data/copr-guide.json?v=20260404-1426`),
    fetch(`./data/copr-mock-bank.json?v=20260404-1426`),
    fetch(`./data/scenarios.json?v=20260412-scenarios5`)
  ]);
  state.data = await nancyRes.json();
  state.examData = await examRes.json();
  state.reviewData = await reviewRes.json();
  state.coprData = await coprRes.json();
  state.coprMockData = await coprMockRes.json();
  state.scenariosData = await scenariosRes.json();
  renderStaticText(); renderChapters(); renderChapterReviewList(); renderExamGroups(); renderCoprList(); renderScenarios(); renderGuidelineLinks(); updateScore(); setView('home');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { const view = btn.dataset.view; if (view === 'practice') startRandomPractice(); else setView(view); }));
  els.nextQuestionBtn.addEventListener('click', () => { state.currentIndex += 1; renderQuestion(); });
  els.langToggle.addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    renderStaticText();
    renderChapters();
    renderChapterReviewList();
    renderExamGroups();
    renderCoprList();
    renderScenarios();
    renderGuidelineLinks();
    if (!els.views.practice.classList.contains('hidden')) renderQuestion();
    if (!els.views.reviewDetail.classList.contains('hidden')) renderChapterReviewDetail();
    if (!els.views.coprDetail.classList.contains('hidden')) renderCoprDetail();
    if (!els.views.wrong.classList.contains('hidden')) renderWrongAnswers();
  });
  els.startPracticeBtn.addEventListener('click', startRandomPractice);
  els.reviewBackBtn.addEventListener('click', () => setView('review'));
  els.coprBackBtn.addEventListener('click', () => setView('copr'));
  els.scenarioBackBtn?.addEventListener('click', () => setView('scenarios'));
}
init();
