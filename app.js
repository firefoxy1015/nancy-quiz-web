const state = {
  lang: 'zh',
  data: null,
  currentQuestions: [],
  currentIndex: 0,
  scoreCorrect: 0,
  scoreTotal: 0,
  selectedChapterId: null,
  wrongKey: 'nancyQuizWrongAnswers'
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

function getWrongAnswers() {
  return JSON.parse(localStorage.getItem(state.wrongKey) || '[]');
}

function saveWrongAnswer(questionId) {
  const wrong = new Set(getWrongAnswers());
  wrong.add(questionId);
  localStorage.setItem(state.wrongKey, JSON.stringify([...wrong]));
}

function setView(name) {
  Object.entries(els.views).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  if (name === 'wrong') renderWrongAnswers();
}

function renderChapters() {
  els.chapterList.innerHTML = '';
  state.data.chapters.forEach(ch => {
    const div = document.createElement('div');
    div.className = 'chapter-item';
    div.innerHTML = `
      <div>
        <strong>${state.lang === 'zh' ? ch.titleZh : ch.titleEn}</strong>
      </div>
      <button data-chapter="${ch.id}">${state.lang === 'zh' ? '开始' : 'Start'}</button>
    `;
    div.querySelector('button').addEventListener('click', () => startChapterPractice(ch.id));
    els.chapterList.appendChild(div);
  });
}

function updateScore() {
  els.scoreValue.textContent = `${state.scoreCorrect} / ${state.scoreTotal}`;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function startChapterPractice(chapterId) {
  state.selectedChapterId = chapterId;
  state.currentQuestions = shuffle(state.data.questions.filter(q => q.chapterId === chapterId));
  state.currentIndex = 0;
  state.scoreCorrect = 0;
  state.scoreTotal = 0;
  updateScore();
  setView('practice');
  renderQuestion();
}

function startRandomPractice() {
  state.selectedChapterId = null;
  state.currentQuestions = shuffle(state.data.questions);
  state.currentIndex = 0;
  state.scoreCorrect = 0;
  state.scoreTotal = 0;
  updateScore();
  setView('practice');
  renderQuestion();
}

function renderQuestion() {
  const q = state.currentQuestions[state.currentIndex];
  if (!q) {
    els.questionBox.innerHTML = `<p class="empty">${state.lang === 'zh' ? '这组题做完了。' : 'This set is complete.'}</p>`;
    els.practiceMeta.textContent = state.lang === 'zh' ? '已完成当前练习' : 'Practice complete';
    return;
  }

  const chapter = state.data.chapters.find(ch => ch.id === q.chapterId);
  els.practiceTitle.textContent = state.lang === 'zh' ? (chapter?.titleZh || '练习模式') : (chapter?.titleEn || 'Practice');
  els.practiceMeta.textContent = `${state.currentIndex + 1} / ${state.currentQuestions.length}`;

  const wrapper = document.createElement('div');
  wrapper.className = 'question-card';
  wrapper.innerHTML = `
    <h3>${state.lang === 'zh' ? q.questionZh : q.questionEn}</h3>
    <div class="options"></div>
    <div class="explanation hidden"></div>
  `;

  const optionsDiv = wrapper.querySelector('.options');
  const explanationDiv = wrapper.querySelector('.explanation');

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<strong>${opt.key}.</strong> ${state.lang === 'zh' ? opt.zh : opt.en}`;
    btn.addEventListener('click', () => {
      if (wrapper.dataset.answered === 'true') return;
      wrapper.dataset.answered = 'true';
      state.scoreTotal += 1;
      const isCorrect = opt.key === q.answer;
      if (isCorrect) {
        state.scoreCorrect += 1;
        btn.classList.add('correct');
      } else {
        btn.classList.add('wrong');
        saveWrongAnswer(q.id);
      }
      [...optionsDiv.children].forEach(child => {
        const childKey = child.textContent.trim().charAt(0);
        if (childKey === q.answer) child.classList.add('correct');
      });
      explanationDiv.classList.remove('hidden');
      explanationDiv.innerHTML = `
        <strong>${state.lang === 'zh' ? '解析' : 'Explanation'}</strong>
        <p>${state.lang === 'zh' ? q.explanationZh : q.explanationEn}</p>
      `;
      updateScore();
    });
    optionsDiv.appendChild(btn);
  });

  els.questionBox.innerHTML = '';
  els.questionBox.appendChild(wrapper);
}

function renderWrongAnswers() {
  const wrong = getWrongAnswers();
  if (!wrong.length) {
    els.wrongList.innerHTML = `<p class="empty">${state.lang === 'zh' ? '目前还没有错题。' : 'No wrong answers yet.'}</p>`;
    return;
  }
  const items = state.data.questions.filter(q => wrong.includes(q.id));
  els.wrongList.innerHTML = items.map(q => `
    <div class="chapter-item">
      <div>
        <strong>${state.lang === 'zh' ? q.questionZh : q.questionEn}</strong>
        <div class="empty">${state.lang === 'zh' ? q.explanationZh : q.explanationEn}</div>
      </div>
    </div>
  `).join('');
}

async function init() {
  const res = await fetch('./question-bank.json');
  state.data = await res.json();
  renderChapters();
  updateScore();
  setView('home');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'practice') startRandomPractice();
      else setView(view);
    });
  });

  els.nextQuestionBtn.addEventListener('click', () => {
    state.currentIndex += 1;
    renderQuestion();
  });

  els.langToggle.addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    renderChapters();
    if (!els.views.wrong.classList.contains('hidden')) renderWrongAnswers();
    if (!els.views.practice.classList.contains('hidden')) renderQuestion();
  });

  els.startPracticeBtn.addEventListener('click', startRandomPractice);
}

init();
