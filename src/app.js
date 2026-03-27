const state = {
  lang: 'en',
  data: null,
  examData: null,
  currentQuestions: [],
  currentIndex: 0,
  scoreCorrect: 0,
  scoreTotal: 0,
  selectedChapterId: null,
  currentMode: 'nancy',
  wrongStorageKey: 'nancyQuizWrongAnswersV2'
};

const i18n = {
  zh: {
    appTitle: 'Nancy Caroline 学习系统',
    appSubtitle: 'Emergency Care in the Streets · 中英双语互动题库',
    menuTitle: '学习模式',
    navHome: '首页',
    navChapters: '按章节学习',
    navPractice: '随机练习',
    navWrong: 'WRONG ANSWERS',
    navExam: 'EMR/PCP EXAM QUESTIONS',
    navGuidelines: 'GUIDELINE LINK',
    statusTitle: '项目状态',
    statusList: ['阶段：第一版网页骨架', '语言：中英双语', '题库：可扩展 JSON', '对象：Nancy 全书'],
    homeGoalTitle: '项目目标',
    homeGoalText: '这不是普通小测验，而是一个可分享的网页版互动学习系统。目标是让使用者通过完整题库，以选择题互动方式系统走完整本 Nancy Caroline’s Emergency Care in the Streets。',
    homeSupportedTitle: '当前已支持',
    homeSupportedList: ['中英双语题目显示', '按章节筛选', '即时判分与解析', '错题本（本地浏览器保存）'],
    homeNextTitle: '接下来会补',
    homeNextList: ['更多章节题库', '模拟考试模式', '学习进度追踪', '章节学习路线'],
    homeProgressNote: '当前正在按 chapter 顺序持续扩充正式题库。',
    startPracticeBtn: '开始练习',
    chaptersTitle: '按章节学习',
    practiceTitle: '练习模式',
    practiceMeta: '请选择一道题开始',
    scoreLabel: '分数',
    nextQuestionBtn: '下一题',
    wrongTitle: 'WRONG ANSWERS',
    wrongIntro: '错题只保存在当前浏览器本地，不会同步到线上。',
    noWrong: '当前还没有错题。',
    clearWrongLabel: '清空错题',
    wrongSourceNancy: 'Nancy 题库',
    wrongSourceExam: 'BC Guideline Exam 题库',
    examTitle: 'EMR/PCP EXAM QUESTIONS',
    examIntro: '这里是独立于 Nancy chapter 题库之外的 BC Provincial Examination Guideline 模拟题区。',
    guidelinesTitle: 'GUIDELINE LINK',
    guidelinesIntro: '这里先放常用 guideline 入口，后续再继续补充。',
    startLabel: '开始',
    openLinkLabel: '打开链接',
    complete: '这组题做完了。',
    practiceComplete: '已完成当前练习',
    explanation: '解析'
  },
  en: {
    appTitle: 'Nancy Caroline Study System',
    appSubtitle: 'Emergency Care in the Streets · Bilingual Interactive Question Bank',
    menuTitle: 'Study Modes',
    navHome: 'Home',
    navChapters: 'Study by Chapter',
    navPractice: 'Random Practice',
    navWrong: 'WRONG ANSWERS',
    navExam: 'EMR/PCP EXAM QUESTIONS',
    navGuidelines: 'GUIDELINE LINK',
    statusTitle: 'Project Status',
    statusList: ['Stage: First web prototype', 'Language: Bilingual (ZH/EN)', 'Question bank: Expandable JSON', 'Scope: Full Nancy textbook'],
    homeGoalTitle: 'Project Goal',
    homeGoalText: 'This is not a tiny quiz toy. It is a shareable web-based interactive study system designed to let learners work through the full Nancy Caroline textbook through structured MCQ-based learning.',
    homeSupportedTitle: 'Currently Supported',
    homeSupportedList: ['Bilingual question display', 'Chapter filtering', 'Instant scoring and explanations', 'Wrong-answer notebook (browser local storage)'],
    homeNextTitle: 'Coming Next',
    homeNextList: ['More chapter coverage', 'Mock exam mode', 'Learning progress tracking', 'Structured chapter roadmap'],
    homeProgressNote: 'Current priority: expanding the formal banks chapter by chapter in sequence.',
    startPracticeBtn: 'Start Practice',
    chaptersTitle: 'Study by Chapter',
    practiceTitle: 'Practice Mode',
    practiceMeta: 'Choose a question set to begin',
    scoreLabel: 'Score',
    nextQuestionBtn: 'Next Question',
    wrongTitle: 'WRONG ANSWERS',
    wrongIntro: 'Wrong answers are saved only in this browser locally and are not synced online.',
    noWrong: 'No wrong answers yet.',
    clearWrongLabel: 'Clear Wrong Answers',
    wrongSourceNancy: 'Nancy question bank',
    wrongSourceExam: 'BC Guideline exam bank',
    examTitle: 'EMR/PCP EXAM QUESTIONS',
    examIntro: 'This is a standalone BC Provincial Examination Guideline question area, separate from the Nancy chapter bank.',
    guidelinesTitle: 'GUIDELINE LINK',
    guidelinesIntro: 'This section is reserved for quick guideline access and can be expanded with more links.',
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
    wrong: document.getElementById('wrongView'),
    exam: document.getElementById('examView'),
    guidelines: document.getElementById('guidelinesView')
  },
  chapterList: document.getElementById('chapterList'),
  questionBox: document.getElementById('questionBox'),
  scoreValue: document.getElementById('scoreValue'),
  practiceTitle: document.getElementById('practiceTitle'),
  practiceMeta: document.getElementById('practiceMeta'),
  wrongList: document.getElementById('wrongList'),
  examList: document.getElementById('examList'),
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
  if (name === 'wrong') renderWrongAnswers();
  if (name === 'exam') renderExamGroups();
  if (name === 'guidelines') renderGuidelineLinks();
}
function renderStaticText() {
  document.getElementById('appTitle').textContent = t('appTitle');
  document.getElementById('appSubtitle').textContent = t('appSubtitle');
  document.getElementById('menuTitle').textContent = t('menuTitle');
  document.getElementById('navHome').textContent = t('navHome');
  document.getElementById('navChapters').textContent = t('navChapters');
  document.getElementById('navPractice').textContent = t('navPractice');
  document.getElementById('navWrong').textContent = t('navWrong');
  document.getElementById('navExam').textContent = t('navExam');
  document.getElementById('navGuidelines').textContent = t('navGuidelines');
  document.getElementById('statusTitle').textContent = t('statusTitle');
  document.getElementById('homeGoalTitle').textContent = t('homeGoalTitle');
  document.getElementById('homeGoalText').textContent = t('homeGoalText');
  document.getElementById('homeSupportedTitle').textContent = t('homeSupportedTitle');
  document.getElementById('homeNextTitle').textContent = t('homeNextTitle');
  document.getElementById('homeProgressNote').textContent = t('homeProgressNote');
  document.getElementById('homeQuestionCount').textContent = state.data ? (state.lang === 'zh' ? `Current question count / 当前题库总数：${state.data.questions.length}` : `Current question count: ${state.data.questions.length}`) : '';
  document.getElementById('chaptersTitle').textContent = t('chaptersTitle');
  document.getElementById('wrongTitle').textContent = t('wrongTitle');
  document.getElementById('wrongIntro').textContent = t('wrongIntro');
  document.getElementById('examTitle').textContent = t('examTitle');
  document.getElementById('examIntro').textContent = t('examIntro');
  document.getElementById('guidelinesTitle').textContent = t('guidelinesTitle');
  document.getElementById('guidelinesIntro').textContent = t('guidelinesIntro');
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
  els.practiceTitle.textContent = state.currentMode === 'exam'
    ? (state.lang === 'zh' ? (examGroup?.titleZh || t('examTitle')) : (examGroup?.titleEn || t('examTitle')))
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
          <div class="empty">${item.mode === 'exam' ? t('wrongSourceExam') : t('wrongSourceNancy')}</div>
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
  const [nancyRes, examRes] = await Promise.all([
    fetch(`./data/question-bank.json?v=${Date.now()}`),
    fetch(`./data/exam-bank.json?v=${Date.now()}`)
  ]);
  state.data = await nancyRes.json();
  state.examData = await examRes.json();
  renderStaticText(); renderChapters(); renderExamGroups(); renderGuidelineLinks(); updateScore(); setView('home');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { const view = btn.dataset.view; if (view === 'practice') startRandomPractice(); else setView(view); }));
  els.nextQuestionBtn.addEventListener('click', () => { state.currentIndex += 1; renderQuestion(); });
  els.langToggle.addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    renderStaticText(); renderChapters(); renderExamGroups(); renderGuidelineLinks();
    if (!els.views.practice.classList.contains('hidden')) renderQuestion();
  });
  els.startPracticeBtn.addEventListener('click', startRandomPractice);
}
init();
