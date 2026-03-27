const state = {
  lang: 'en',
  data: null,
  currentQuestions: [],
  currentIndex: 0,
  scoreCorrect: 0,
  scoreTotal: 0,
  selectedChapterId: null,
  wrongKey: 'nancyQuizWrongAnswers'
};

const i18n = {
  zh: {
    appTitle: 'Nancy Caroline 学习系统',
    appSubtitle: 'Emergency Care in the Streets · 中英双语互动题库',
    menuTitle: '学习模式',
    navHome: '首页',
    navChapters: '按章节学习',
    navPractice: '随机练习',
    navWrong: '错题本',
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
    wrongTitle: '错题本',
    startLabel: '开始',
    complete: '这组题做完了。',
    practiceComplete: '已完成当前练习',
    noWrong: '目前还没有错题。',
    explanation: '解析'
  },
  en: {
    appTitle: 'Nancy Caroline Study System',
    appSubtitle: 'Emergency Care in the Streets · Bilingual Interactive Question Bank',
    menuTitle: 'Study Modes',
    navHome: 'Home',
    navChapters: 'Study by Chapter',
    navPractice: 'Random Practice',
    navWrong: 'Wrong Answers',
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
    wrongTitle: 'Wrong Answers',
    startLabel: 'Start',
    complete: 'This set is complete.',
    practiceComplete: 'Current practice complete',
    noWrong: 'No wrong answers yet.',
    explanation: 'Explanation'
  }
};

const els = {
  views: {
    home: document.getElementById('homeView'),
    chapters: document.getElementById('chaptersView'),
    practice: document.getElementById('practiceView'),
    wrong: document.getElementById('wrongView')
  },
  chapterList: document.getElementById('chapterList'),
  questionBox: document.getElementById('questionBox'),
  scoreValue: document.getElementById('scoreValue'),
  practiceTitle: document.getElementById('practiceTitle'),
  practiceMeta: document.getElementById('practiceMeta'),
  wrongList: document.getElementById('wrongList'),
  nextQuestionBtn: document.getElementById('nextQuestionBtn'),
  langToggle: document.getElementById('langToggle'),
  startPracticeBtn: document.getElementById('startPracticeBtn')
};

function t(key) { return i18n[state.lang][key]; }
function getWrongAnswers() { return JSON.parse(localStorage.getItem(state.wrongKey) || '[]'); }
function saveWrongAnswer(questionId) {
  const wrong = new Set(getWrongAnswers()); wrong.add(questionId);
  localStorage.setItem(state.wrongKey, JSON.stringify([...wrong]));
}
function setView(name) {
  Object.entries(els.views).forEach(([key, el]) => el.classList.toggle('hidden', key !== name));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === name));
  if (name === 'wrong') renderWrongAnswers();
}
function renderStaticText() {
  document.getElementById('appTitle').textContent = t('appTitle');
  document.getElementById('appSubtitle').textContent = t('appSubtitle');
  document.getElementById('menuTitle').textContent = t('menuTitle');
  document.getElementById('navHome').textContent = t('navHome');
  document.getElementById('navChapters').textContent = t('navChapters');
  document.getElementById('navPractice').textContent = t('navPractice');
  document.getElementById('navWrong').textContent = t('navWrong');
  document.getElementById('statusTitle').textContent = t('statusTitle');
  document.getElementById('homeGoalTitle').textContent = t('homeGoalTitle');
  document.getElementById('homeGoalText').textContent = t('homeGoalText');
  document.getElementById('homeSupportedTitle').textContent = t('homeSupportedTitle');
  document.getElementById('homeNextTitle').textContent = t('homeNextTitle');
  document.getElementById('homeProgressNote').textContent = t('homeProgressNote');
  document.getElementById('homeQuestionCount').textContent = state.data ? (state.lang === 'zh' ? `Current question count / 当前题库总数：${state.data.questions.length}` : `Current question count: ${state.data.questions.length}`) : '';
  document.getElementById('chaptersTitle').textContent = t('chaptersTitle');
  document.getElementById('wrongTitle').textContent = t('wrongTitle');
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
  state.selectedChapterId = chapterId;
  state.currentQuestions = shuffle(state.data.questions.filter(q => q.chapterId === chapterId));
  state.currentIndex = 0; state.scoreCorrect = 0; state.scoreTotal = 0; updateScore(); setView('practice'); renderQuestion();
}
function startRandomPractice() {
  state.selectedChapterId = null;
  state.currentQuestions = shuffle(state.data.questions);
  state.currentIndex = 0; state.scoreCorrect = 0; state.scoreTotal = 0; updateScore(); setView('practice'); renderQuestion();
}
function renderQuestion() {
  const q = state.currentQuestions[state.currentIndex];
  if (!q) {
    els.questionBox.innerHTML = `<p class="empty">${t('complete')}</p>`;
    els.practiceMeta.textContent = t('practiceComplete');
    return;
  }
  const chapter = state.data.chapters.find(ch => ch.id === q.chapterId);
  els.practiceTitle.textContent = state.lang === 'zh' ? (chapter?.titleZh || t('practiceTitle')) : (chapter?.titleEn || t('practiceTitle'));
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
      if (isCorrect) { state.scoreCorrect += 1; btn.classList.add('correct'); } else { btn.classList.add('wrong'); saveWrongAnswer(q.id); }
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
  if (!wrong.length) { els.wrongList.innerHTML = `<p class="empty">${t('noWrong')}</p>`; return; }
  const items = state.data.questions.filter(q => wrong.includes(q.id));
  els.wrongList.innerHTML = items.map(q => `<div class="chapter-item"><div><strong>${state.lang === 'zh' ? q.questionZh : q.questionEn}</strong><div class="empty">${state.lang === 'zh' ? q.explanationZh : q.explanationEn}</div></div></div>`).join('');
}
async function init() {
  const res = await fetch('./data/question-bank.json');
  state.data = await res.json();
  renderStaticText(); renderChapters(); updateScore(); setView('home');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { const view = btn.dataset.view; if (view === 'practice') startRandomPractice(); else setView(view); }));
  els.nextQuestionBtn.addEventListener('click', () => { state.currentIndex += 1; renderQuestion(); });
  els.langToggle.addEventListener('click', () => { state.lang = state.lang === 'zh' ? 'en' : 'zh'; renderStaticText(); renderChapters(); if (!els.views.wrong.classList.contains('hidden')) renderWrongAnswers(); if (!els.views.practice.classList.contains('hidden')) renderQuestion(); });
  els.startPracticeBtn.addEventListener('click', startRandomPractice);
}
init();
