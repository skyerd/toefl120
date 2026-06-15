// --- CET6 App ---
let currentView = 'home'; // 'home' | 'word' | 'dictation' | 'choice'
let currentWord = null;
let appMode = 'browse'; // 'browse' | 'study'
let studyMode = 'review'; // 'review' | 'dictation' | 'choice'
let searchQuery = '';

// Dictation state
let dictationIndex = 0;
let dictationAnswered = false;
let dictationWord = null;

// Choice state
let choiceIndex = 0;
let choiceAnswered = false;
let choiceQuestion = null; // { type: 'en2zh'|'zh2en', question, options, correctIndex }

// Etymology words from data.js
const ETYMOLOGY_WORDS = (typeof SITE_DATA !== 'undefined' && SITE_DATA.etymologies) ? Object.keys(SITE_DATA.etymologies).sort() : [];

// Build letter index
const LETTERS = [];
const letterMap = {};
CET6_WORDS.forEach(w => {
  const letter = w.word[0].toUpperCase();
  if (!letterMap[letter]) {
    letterMap[letter] = [];
    LETTERS.push(letter);
  }
  letterMap[letter].push(w);
});
LETTERS.sort();

// --- Init ---
function init() {
  loadMode();
  buildLetterNav();
  buildWordNav();
  buildLetterTags();
  buildWordList();
  renderModeToggle();
  renderStudyModes();
  renderStudyStats();
  restoreState();
}

// --- Mode Persistence ---
function loadMode() {
  try {
    const saved = localStorage.getItem('cet6_mode');
    if (saved === 'study') appMode = 'study';
    else appMode = 'browse';
    const savedStudy = localStorage.getItem('cet6_study_mode');
    if (['review', 'dictation', 'choice'].includes(savedStudy)) studyMode = savedStudy;
    else studyMode = 'review';
  } catch (e) {}
}

function saveMode() {
  localStorage.setItem('cet6_mode', appMode);
  localStorage.setItem('cet6_study_mode', studyMode);
}

// --- State Persistence ---
function saveState() {
  localStorage.setItem('cet6_state', JSON.stringify({
    view: currentView,
    word: currentView === 'word' ? currentWord : null,
    mode: appMode,
    studyMode: studyMode
  }));
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem('cet6_state'));
    if (saved) {
      if (saved.mode) appMode = saved.mode;
      if (saved.studyMode) studyMode = saved.studyMode;
      if (saved.view === 'word' && saved.word) {
        showWord(saved.word);
        return;
      }
    }
  } catch (e) {}
  showHome();
}

// --- Progress / Mastery ---
function getProgress() {
  try {
    return JSON.parse(localStorage.getItem('cet6_progress') || '{}');
  } catch (e) { return {}; }
}

function saveProgress(progress) {
  localStorage.setItem('cet6_progress', JSON.stringify(progress));
}

function getWordProgress(word) {
  const progress = getProgress();
  return progress[word] || { correct: 0, wrong: 0, lastStudied: 0, mastered: false };
}

function isMastered(word) {
  const p = getWordProgress(word);
  return p.correct >= 3 && p.wrong <= p.correct * 0.5;
}

function isDifficult(word) {
  const p = getWordProgress(word);
  return p.wrong > 3;
}

function isRecentlyStudied(word) {
  const p = getWordProgress(word);
  return p.lastStudied > 0 && (Date.now() - p.lastStudied) < 7 * 24 * 60 * 60 * 1000;
}

function getMasteryClass(word) {
  if (isMastered(word)) return 'mastered';
  if (isDifficult(word)) return 'difficult';
  const p = getWordProgress(word);
  if (p.correct > 0 || p.wrong > 0) return 'learning';
  return 'new';
}

function recordCorrect(word) {
  const progress = getProgress();
  if (!progress[word]) progress[word] = { correct: 0, wrong: 0, lastStudied: 0, mastered: false };
  progress[word].correct++;
  progress[word].lastStudied = Date.now();
  progress[word].mastered = progress[word].correct >= 3 && progress[word].wrong <= progress[word].correct * 0.5;
  saveProgress(progress);
}

function recordWrong(word) {
  const progress = getProgress();
  if (!progress[word]) progress[word] = { correct: 0, wrong: 0, lastStudied: 0, mastered: false };
  progress[word].wrong++;
  progress[word].lastStudied = Date.now();
  progress[word].mastered = false;
  saveProgress(progress);
}

// --- Mode Toggle ---
function renderModeToggle() {
  const area = document.getElementById('mode-toggle-area');
  if (!area) return;
  area.innerHTML = `
    <div class="mode-toggle">
      <button class="mode-btn ${appMode === 'browse' ? 'active' : ''}" onclick="setAppMode('browse')">阅览</button>
      <button class="mode-btn ${appMode === 'study' ? 'active' : ''}" onclick="setAppMode('study')">背诵</button>
    </div>
  `;
}

function setAppMode(mode) {
  appMode = mode;
  saveMode();
  renderModeToggle();
  renderStudyModes();
  renderStudyStats();
  buildWordList();
  buildWordNav();
  if (mode === 'study' && studyMode === 'dictation') {
    startDictation();
  } else if (mode === 'study' && studyMode === 'choice') {
    startChoice();
  } else {
    showHome();
  }
}

// --- Study Sub-Modes ---
function renderStudyModes() {
  const area = document.getElementById('study-modes-area');
  if (!area) return;
  if (appMode !== 'study') {
    area.innerHTML = '';
    return;
  }
  area.innerHTML = `
    <div class="study-modes">
      <button class="study-mode-btn ${studyMode === 'review' ? 'active' : ''}" onclick="setStudyMode('review')">浏览</button>
      <button class="study-mode-btn ${studyMode === 'dictation' ? 'active' : ''}" onclick="setStudyMode('dictation')">默写</button>
      <button class="study-mode-btn ${studyMode === 'choice' ? 'active' : ''}" onclick="setStudyMode('choice')">选择题</button>
    </div>
  `;
}

function setStudyMode(mode) {
  studyMode = mode;
  saveMode();
  renderStudyModes();
  if (mode === 'dictation') {
    startDictation();
  } else if (mode === 'choice') {
    startChoice();
  } else {
    showHome();
  }
}

// --- Study Stats ---
function renderStudyStats() {
  const area = document.getElementById('study-stats-area');
  if (!area) return;
  if (appMode !== 'study') {
    area.innerHTML = '';
    return;
  }
  const progress = getProgress();
  let mastered = 0, learning = 0, difficult = 0, newCount = 0;
  CET6_WORDS.forEach(w => {
    const cls = getMasteryClass(w.word);
    if (cls === 'mastered') mastered++;
    else if (cls === 'difficult') difficult++;
    else if (cls === 'learning') learning++;
    else newCount++;
  });
  area.innerHTML = `
    <div class="study-stats">
      <div class="study-stat"><div class="study-stat-num" style="color:#37B24D">${mastered}</div><div class="study-stat-label">已掌握</div></div>
      <div class="study-stat"><div class="study-stat-num" style="color:#F59F00">${learning}</div><div class="study-stat-label">学习中</div></div>
      <div class="study-stat"><div class="study-stat-num" style="color:#F03E3E">${difficult}</div><div class="study-stat-label">困难</div></div>
      <div class="study-stat"><div class="study-stat-num">${newCount}</div><div class="study-stat-label">未学</div></div>
    </div>
  `;
}

// --- Build Navigation ---
function buildLetterNav() {
  const nav = document.getElementById('letter-nav');
  nav.innerHTML = LETTERS.map(l => {
    const count = letterMap[l].length;
    return `<div class="nav-item" data-letter="${l}" onclick="scrollToLetter('${l}')">
      <span class="nav-item-num">${l}</span>${count} 词
    </div>`;
  }).join('');
}

function buildWordNav() {
  const nav = document.getElementById('word-nav');
  const query = searchQuery.toLowerCase();
  nav.innerHTML = CET6_WORDS.filter(w => {
    if (!query) return true;
    return w.word.toLowerCase().includes(query) || w.meaning.toLowerCase().includes(query);
  }).map(w => {
    const masteryCls = getMasteryClass(w.word);
    const dot = appMode === 'study' ? `<span class="word-mastery ${masteryCls}"></span>` : '';
    const meaningDisplay = getWordNavMeaning(w);
    return `<div class="nav-item" data-word="${w.word}" onclick="showWord('${w.word}')">${dot}${w.word} ${meaningDisplay}</div>`;
  }).join('');
}

function getWordNavMeaning(w) {
  if (appMode === 'browse') return '';
  // Study mode: show meaning only for mastered/recently studied words
  if (isMastered(w.word) && isRecentlyStudied(w.word) && !isDifficult(w.word)) {
    return `<span style="color:var(--fg-secondary);font-size:0.72rem">${w.meaning}</span>`;
  }
  return '';
}

function buildLetterTags() {
  const container = document.getElementById('letter-tags');
  container.innerHTML = LETTERS.map(l =>
    `<span class="structure-tag" onclick="scrollToLetter('${l}')">${l}</span>`
  ).join('');
}

// --- Build Word List ---
function buildWordList() {
  const container = document.getElementById('word-list');
  const query = searchQuery.toLowerCase();
  let html = '';
  LETTERS.forEach(l => {
    const filteredWords = letterMap[l].filter(w => {
      if (!query) return true;
      return w.word.toLowerCase().includes(query) || w.meaning.toLowerCase().includes(query);
    });
    if (filteredWords.length === 0) return;
    html += `<div class="letter-group" id="letter-${l}">
      <div class="letter-header">${l}</div>
      <div class="letter-words">`;
    filteredWords.forEach(w => {
      const masteryCls = appMode === 'study' ? getMasteryClass(w.word) : '';
      const dot = appMode === 'study' ? `<span class="word-mastery ${masteryCls}"></span>` : '';
      const meaningHtml = getWordItemMeaning(w);
      const wordText = query ? highlightText(w.word, query) : w.word;
      const meaningText = query ? highlightText(w.meaning, query) : null;
      html += `<div class="word-item" onclick="showWord('${w.word}')">
        ${dot}<span class="word-item-word">${wordText}</span>
        <span class="word-item-meaning">${meaningText || meaningHtml}</span>
      </div>`;
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;

  // Update search result count
  const countEl = document.getElementById('search-result-count');
  if (query && countEl) {
    const total = CET6_WORDS.filter(w => w.word.toLowerCase().includes(query) || w.meaning.toLowerCase().includes(query)).length;
    countEl.textContent = `找到 ${total} 个结果`;
  } else if (countEl) {
    countEl.textContent = '';
  }
}

function getWordItemMeaning(w) {
  if (appMode === 'browse') return w.meaning;
  // Study mode: smart Chinese display
  if (isMastered(w.word) && isRecentlyStudied(w.word) && !isDifficult(w.word)) {
    return w.meaning;
  }
  return '<span class="word-item-meaning-hidden">___</span>';
}

function highlightText(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.substring(0, idx) + '<span class="search-highlight">' + text.substring(idx, idx + query.length) + '</span>' + text.substring(idx + query.length);
}

// --- Search ---
function onSearch(value) {
  searchQuery = value.trim();
  buildWordList();
  buildWordNav();
}

// --- Scroll to Letter ---
function scrollToLetter(letter) {
  showHome();
  setTimeout(() => {
    const el = document.getElementById('letter-' + letter);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
  closeSidebarMobile();
}

// --- Show Home ---
function showHome() {
  currentView = 'home';
  currentWord = null;
  document.getElementById('home-page').style.display = '';
  document.getElementById('word-page').style.display = 'none';
  document.getElementById('dictation-page').style.display = 'none';
  document.getElementById('choice-page').style.display = 'none';
  clearActiveNav();
  renderModeToggle();
  renderStudyModes();
  renderStudyStats();
  buildWordList();
  saveState();
}

// --- Show Word Detail ---
function showWord(word) {
  currentView = 'word';
  currentWord = word;
  const w = CET6_WORDS.find(x => x.word === word);
  if (!w) return;

  document.getElementById('home-page').style.display = 'none';
  document.getElementById('word-page').style.display = '';
  document.getElementById('dictation-page').style.display = 'none';
  document.getElementById('choice-page').style.display = 'none';

  const idx = CET6_WORDS.findIndex(x => x.word === word);
  const prevWord = idx > 0 ? CET6_WORDS[idx - 1].word : null;
  const nextWord = idx < CET6_WORDS.length - 1 ? CET6_WORDS[idx + 1].word : null;

  const meaningText = w.meaning;

  // Etymology
  let etymologyHtml = '';
  const etymology = getEtymology(word);
  if (etymology) {
    etymologyHtml = `
      <div class="word-etymology">
        <div class="word-etymology-label">词源探析</div>
        <div class="word-etymology-text">${etymology}</div>
      </div>`;
  }

  // Mastery info in study mode
  let masteryHtml = '';
  if (appMode === 'study') {
    const p = getWordProgress(word);
    const cls = getMasteryClass(word);
    masteryHtml = `
      <div class="study-stats" style="margin-bottom:24px">
        <div class="study-stat"><div class="study-stat-num" style="color:#37B24D">${p.correct}</div><div class="study-stat-label">正确</div></div>
        <div class="study-stat"><div class="study-stat-num" style="color:#F03E3E">${p.wrong}</div><div class="study-stat-label">错误</div></div>
        <div class="study-stat"><div class="study-stat-num"><span class="word-mastery ${cls}" style="width:12px;height:12px"></span></div><div class="study-stat-label">${cls === 'mastered' ? '已掌握' : cls === 'difficult' ? '困难' : cls === 'learning' ? '学习中' : '未学'}</div></div>
      </div>`;
  }

  document.getElementById('word-page').innerHTML = `
    <h1 class="word-title">${w.word}</h1>
    ${masteryHtml}
    <div class="word-section">
      <div class="word-section-label">释义</div>
      <div class="word-meaning-detail">${meaningText}</div>
    </div>
    ${etymologyHtml}
    <div class="nav-buttons">
      <button class="nav-btn" ${prevWord ? `onclick="showWord('${prevWord}')"` : 'disabled'}>← 上一个</button>
      <button class="nav-btn" ${nextWord ? `onclick="showWord('${nextWord}')"` : 'disabled'}>下一个 →</button>
    </div>
  `;

  setActiveNav(word);
  closeSidebarMobile();
  window.scrollTo(0, 0);
  saveState();
}

// --- Etymology ---
function getEtymology(word) {
  if (typeof SITE_DATA === 'undefined' || !SITE_DATA.etymologies) return null;
  const lower = word.toLowerCase();
  if (SITE_DATA.etymologies[lower]) return SITE_DATA.etymologies[lower];
  // Try base word
  const base = findBaseWord(word);
  if (base && SITE_DATA.etymologies[base]) return SITE_DATA.etymologies[base];
  return null;
}

function findBaseWord(word) {
  if (typeof SITE_DATA === 'undefined' || !SITE_DATA.etymologies) return null;
  const lower = word.toLowerCase();
  if (SITE_DATA.etymologies[lower]) return lower;
  for (const base of ETYMOLOGY_WORDS) {
    const regex = new RegExp(`^${base}(?:s|es|ed|ing|tion|sion|ment|ness|ity|ous|ive|al|ly|er|est|ic|ical|ize|ise|ify|ate|able|ible|ual)?$`, 'i');
    if (regex.test(lower)) return base;
  }
  return null;
}

// Double-click any English word to look up etymology
document.addEventListener('dblclick', function(e) {
  const sel = window.getSelection();
  if (!sel || !sel.toString().trim()) return;
  const text = sel.toString().trim();
  if (!/^[a-zA-Z]+$/.test(text)) return;
  const baseWord = findBaseWord(text);
  if (baseWord) {
    showWord(baseWord);
  } else {
    window.open(`https://www.etymonline.com/word/${text.toLowerCase()}`, '_blank');
  }
});

// --- Dictation Mode ---
function startDictation() {
  currentView = 'dictation';
  dictationIndex = 0;
  dictationAnswered = false;
  document.getElementById('home-page').style.display = 'none';
  document.getElementById('word-page').style.display = 'none';
  document.getElementById('dictation-page').style.display = '';
  document.getElementById('choice-page').style.display = 'none';
  renderDictation();
  saveState();
}

function renderDictation() {
  if (dictationIndex >= CET6_WORDS.length) {
    dictationIndex = 0;
  }
  dictationWord = CET6_WORDS[dictationIndex];
  dictationAnswered = false;

  const container = document.getElementById('dictation-page');
  container.innerHTML = `
    <div class="dictation-card">
      <div class="dictation-progress">${dictationIndex + 1} / ${CET6_WORDS.length}</div>
      <div class="dictation-word">${dictationWord.word}</div>
      <input class="dictation-input" id="dictation-input" type="text" placeholder="输入中文释义..." autofocus onkeydown="if(event.key==='Enter')checkDictation()">
      <div class="dictation-feedback" id="dictation-feedback"></div>
      <div class="dictation-answer" id="dictation-answer" style="display:none"></div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="action-btn action-btn-primary" id="dictation-submit-btn" onclick="checkDictation()">提交</button>
        <button class="action-btn action-btn-secondary" id="dictation-next-btn" onclick="nextDictation()" style="display:none">下一个 →</button>
      </div>
    </div>
  `;
  setTimeout(() => {
    const input = document.getElementById('dictation-input');
    if (input) input.focus();
  }, 100);
}

function checkDictation() {
  if (dictationAnswered) return;
  dictationAnswered = true;
  const input = document.getElementById('dictation-input');
  const feedback = document.getElementById('dictation-feedback');
  const answer = document.getElementById('dictation-answer');
  const submitBtn = document.getElementById('dictation-submit-btn');
  const nextBtn = document.getElementById('dictation-next-btn');

  const userAnswer = input.value.trim();
  const correctAnswer = dictationWord.meaning;

  // Simple matching: check if the user's answer contains key Chinese characters from the meaning
  const isCorrect = checkMeaningMatch(userAnswer, correctAnswer);

  if (isCorrect) {
    input.classList.add('correct');
    feedback.textContent = '✓ 正确！';
    feedback.className = 'dictation-feedback correct';
    recordCorrect(dictationWord.word);
  } else {
    input.classList.add('wrong');
    feedback.textContent = '✗ 错误';
    feedback.className = 'dictation-feedback wrong';
    recordWrong(dictationWord.word);
  }

  answer.textContent = '正确答案：' + correctAnswer;
  answer.style.display = '';
  submitBtn.style.display = 'none';
  nextBtn.style.display = '';
  input.disabled = true;
}

function checkMeaningMatch(userAnswer, correctAnswer) {
  if (!userAnswer) return false;
  // Extract Chinese characters from correct answer (remove POS tags like (adj.), (v.), etc.)
  const cleanCorrect = correctAnswer.replace(/\([^)]*\)/g, '').replace(/[；;、，,]/g, ' ').trim();
  const parts = cleanCorrect.split(/\s+/).filter(p => p.length > 0);

  // Check if user answer contains at least one significant part of the meaning
  const significantParts = parts.filter(p => p.length >= 2);
  if (significantParts.length === 0) return userAnswer.includes(cleanCorrect);

  let matchCount = 0;
  for (const part of significantParts) {
    if (userAnswer.includes(part)) matchCount++;
  }
  // At least half of the significant parts should match
  return matchCount >= Math.ceil(significantParts.length * 0.5);
}

function nextDictation() {
  dictationIndex++;
  if (dictationIndex >= CET6_WORDS.length) dictationIndex = 0;
  renderDictation();
}

// --- Choice Mode ---
function startChoice() {
  currentView = 'choice';
  choiceIndex = 0;
  choiceAnswered = false;
  document.getElementById('home-page').style.display = 'none';
  document.getElementById('word-page').style.display = 'none';
  document.getElementById('dictation-page').style.display = 'none';
  document.getElementById('choice-page').style.display = '';
  renderChoice();
  saveState();
}

function renderChoice() {
  if (choiceIndex >= CET6_WORDS.length) {
    choiceIndex = 0;
  }
  choiceAnswered = false;

  // Randomly choose question type
  const type = Math.random() < 0.5 ? 'en2zh' : 'zh2en';
  const correctWord = CET6_WORDS[choiceIndex];

  // Pick 3 random wrong options
  const wrongOptions = [];
  const usedIndices = new Set([choiceIndex]);
  while (wrongOptions.length < 3) {
    const rIdx = Math.floor(Math.random() * CET6_WORDS.length);
    if (!usedIndices.has(rIdx)) {
      usedIndices.add(rIdx);
      wrongOptions.push(CET6_WORDS[rIdx]);
    }
  }

  // Build options
  let options;
  let question;
  if (type === 'en2zh') {
    question = correctWord.word;
    options = [
      { text: correctWord.meaning, correct: true },
      { text: wrongOptions[0].meaning, correct: false },
      { text: wrongOptions[1].meaning, correct: false },
      { text: wrongOptions[2].meaning, correct: false }
    ];
  } else {
    question = correctWord.meaning;
    options = [
      { text: correctWord.word, correct: true },
      { text: wrongOptions[0].word, correct: false },
      { text: wrongOptions[1].word, correct: false },
      { text: wrongOptions[2].word, correct: false }
    ];
  }

  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  choiceQuestion = { type, question, options, correctWord };

  const container = document.getElementById('choice-page');
  container.innerHTML = `
    <div class="choice-card">
      <div class="choice-progress">${choiceIndex + 1} / ${CET6_WORDS.length}</div>
      <div class="choice-question">${question}</div>
      <div class="choice-options" id="choice-options">
        ${options.map((opt, i) => `
          <button class="choice-option" data-index="${i}" data-correct="${opt.correct}" onclick="answerChoice(this, ${i})">${opt.text}</button>
        `).join('')}
      </div>
      <div style="text-align:center">
        <button class="action-btn action-btn-secondary" id="choice-next-btn" onclick="nextChoice()" style="display:none">下一题 →</button>
      </div>
    </div>
  `;
}

function answerChoice(el, index) {
  if (choiceAnswered) return;
  choiceAnswered = true;

  const isCorrect = el.dataset.correct === 'true';
  const allOptions = document.querySelectorAll('.choice-option');

  // Highlight correct and wrong
  allOptions.forEach(opt => {
    opt.classList.add('disabled');
    if (opt.dataset.correct === 'true') {
      opt.classList.add('correct');
    }
  });

  if (isCorrect) {
    recordCorrect(choiceQuestion.correctWord.word);
  } else {
    el.classList.add('wrong');
    recordWrong(choiceQuestion.correctWord.word);
  }

  document.getElementById('choice-next-btn').style.display = '';
}

function nextChoice() {
  choiceIndex++;
  if (choiceIndex >= CET6_WORDS.length) choiceIndex = 0;
  renderChoice();
}

// --- Navigation Helpers ---
function setActiveNav(word) {
  clearActiveNav();
  const item = document.querySelector(`.nav-item[data-word="${word}"]`);
  if (item) item.classList.add('active');
}

function clearActiveNav() {
  document.querySelectorAll('.nav-item.active').forEach(el => el.classList.remove('active'));
}

function toggleNavSection(el) {
  el.parentElement.classList.toggle('collapsed');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function closeSidebarMobile() {
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

// --- Keyboard Navigation ---
document.addEventListener('keydown', (e) => {
  // Dictation mode: Enter to submit
  if (currentView === 'dictation' && e.key === 'Enter' && !dictationAnswered) {
    checkDictation();
    return;
  }
  // Dictation mode: Enter for next after answered
  if (currentView === 'dictation' && e.key === 'Enter' && dictationAnswered) {
    nextDictation();
    return;
  }
  // Choice mode: Enter for next after answered
  if (currentView === 'choice' && e.key === 'Enter' && choiceAnswered) {
    nextChoice();
    return;
  }
  // Word detail navigation
  if (currentView === 'word' && currentWord) {
    const idx = CET6_WORDS.findIndex(x => x.word === currentWord);
    if (e.key === 'ArrowLeft' && idx > 0) {
      showWord(CET6_WORDS[idx - 1].word);
    }
    if (e.key === 'ArrowRight' && idx < CET6_WORDS.length - 1) {
      showWord(CET6_WORDS[idx + 1].word);
    }
    if (e.key === 'Escape') {
      showHome();
    }
  }
  // Escape from study modes back to home
  if (e.key === 'Escape' && (currentView === 'dictation' || currentView === 'choice')) {
    showHome();
  }
});

// --- Float Rail Hover ---
(function() {
  const rail = document.getElementById('float-rail');
  const edge = document.getElementById('rail-edge');
  let hideTimer = null;

  function showRail() {
    clearTimeout(hideTimer);
    rail.classList.add('visible');
  }

  function hideRail() {
    hideTimer = setTimeout(() => {
      if (!rail.matches(':hover')) {
        rail.classList.remove('visible');
      }
    }, 400);
  }

  edge.addEventListener('mouseenter', showRail);
  rail.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  rail.addEventListener('mouseleave', hideRail);

  document.addEventListener('mousemove', function(e) {
    if (e.clientX > window.innerWidth * 0.8) {
      showRail();
    }
  });
})();

// --- Float Rail Features ---

function showNotes() {
  document.getElementById('notes-panel').classList.add('open');
  if (!notesCurrentPara) renderAllNotes();
}

function closeNotes() {
  document.getElementById('notes-panel').classList.remove('open');
  clearActivePara();
}

function showRepo() {
  // TODO: 共享仓库功能
}

// --- Notes System ---
let notesUser = JSON.parse(localStorage.getItem('tflyc_user') || 'null');
let notesToken = null;
let notesCurrentPara = null;

if (notesUser) {
  notesUser = null;
  localStorage.removeItem('tflyc_user');
  localStorage.removeItem('tflyc_token');
}

function loginGitHub() {
  if (notesUser) {
    notesUser = null;
    notesToken = null;
    localStorage.removeItem('tflyc_user');
    localStorage.removeItem('tflyc_token');
    document.getElementById('login-btn-text').textContent = '登录';
    document.getElementById('notes-logged-in').style.display = 'none';
    return;
  }
  const modal = document.createElement('div');
  modal.className = 'login-modal';
  modal.id = 'login-modal';
  modal.innerHTML = `
    <div class="login-modal-box">
      <div class="login-modal-title">GitHub 登录</div>
      <div style="margin-bottom:14px">
        <button onclick="startGitHubOAuth()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 0;background:#24292e;color:#fff;border:none;border-radius:6px;font-size:0.88rem;font-family:inherit;cursor:pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          使用 GitHub 登录
        </button>
      </div>
      <div style="text-align:center;font-size:0.75rem;color:#ADB5BD;margin-bottom:12px">— 或输入 Token —</div>
      <input class="login-modal-input" id="gh-token" placeholder="GitHub Personal Access Token" type="password" autofocus>
      <div class="login-modal-hint" style="margin-bottom:14px">前往 GitHub Settings → Developer settings → Personal access tokens → Generate new token (classic)，勾选 <code>read:user</code> 权限即可</div>
      <div class="login-modal-actions">
        <button class="login-modal-btn login-modal-cancel" onclick="document.getElementById('login-modal').remove()">取消</button>
        <button class="login-modal-btn login-modal-confirm" onclick="confirmLoginWithToken()">确认</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('gh-token').addEventListener('keydown', e => { if (e.key === 'Enter') confirmLoginWithToken(); });
}

function startGitHubOAuth() {
  const CLIENT_ID = 'Ov23liF5mZ0e0b0VqB9A';
  const REDIRECT_URI = location.origin + location.pathname.replace(/[^/]*$/, '') + '../callback.html';
  const scope = 'read:user';
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}`;
  window.open(url, 'github-oauth', 'width=600,height=700');
  window.addEventListener('message', function handler(e) {
    if (e.origin !== location.origin) return;
    if (e.data && e.data.type === 'github-oauth') {
      window.removeEventListener('message', handler);
      if (e.data.code) {
        exchangeCodeForToken(e.data.code, CLIENT_ID);
      }
    }
  });
}

async function exchangeCodeForToken(code, clientId) {
  document.getElementById('login-modal')?.remove();
  const loading = document.createElement('div');
  loading.className = 'login-modal';
  loading.id = 'login-modal';
  loading.innerHTML = '<div class="login-modal-box"><div style="text-align:center;padding:20px;color:var(--fg-secondary);font-size:0.88rem">正在验证...</div></div>';
  document.body.appendChild(loading);
  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, code: code })
    });
    const data = await res.json();
    if (data.access_token) {
      await verifyAndSetUser(data.access_token);
    } else {
      throw new Error('No token');
    }
  } catch {
    document.getElementById('login-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.id = 'login-modal';
    modal.innerHTML = `
      <div class="login-modal-box">
        <div class="login-modal-title">手动验证</div>
        <div style="font-size:0.82rem;color:var(--fg-secondary);margin-bottom:12px;line-height:1.6">由于浏览器安全限制，自动登录无法完成。请按以下步骤操作：</div>
        <div style="font-size:0.78rem;color:var(--fg-secondary);margin-bottom:14px;line-height:1.7;background:var(--bg-secondary);padding:10px 12px;border-radius:6px">
          1. 前往 GitHub → Settings → Developer settings<br>
          2. Personal access tokens → Tokens (classic)<br>
          3. Generate new token → 勾选 <code>read:user</code><br>
          4. 复制 Token 粘贴到下方
        </div>
        <input class="login-modal-input" id="gh-token-fallback" placeholder="ghp_xxxxxxxxxxxx" type="password" autofocus>
        <div class="login-modal-actions">
          <button class="login-modal-btn login-modal-cancel" onclick="document.getElementById('login-modal').remove()">取消</button>
          <button class="login-modal-btn login-modal-confirm" onclick="confirmLoginWithTokenFallback()">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('gh-token-fallback').addEventListener('keydown', e => { if (e.key === 'Enter') confirmLoginWithTokenFallback(); });
  }
}

async function confirmLoginWithToken() {
  const token = document.getElementById('gh-token').value.trim();
  if (!token) return;
  await verifyAndSetUser(token);
}

async function confirmLoginWithTokenFallback() {
  const token = document.getElementById('gh-token-fallback').value.trim();
  if (!token) return;
  await verifyAndSetUser(token);
}

async function verifyAndSetUser(token) {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    notesUser = { login: data.login, avatar: data.avatar_url };
    notesToken = token;
    document.getElementById('login-btn-text').textContent = notesUser.login;
    document.getElementById('notes-logged-in').style.display = '';
    document.getElementById('notes-avatar').src = notesUser.avatar;
    document.getElementById('notes-username').textContent = notesUser.login;
    document.getElementById('login-modal')?.remove();
  } catch {
    const input = document.getElementById('gh-token') || document.getElementById('gh-token-fallback');
    if (input) input.style.borderColor = '#DC3545';
  }
}

// --- Paragraph selection for notes ---
function getParaKey(el) {
  const wordPage = document.getElementById('word-page');
  if (!wordPage.contains(el)) return null;
  const section = el.closest('.word-section, .word-etymology');
  if (!section) return null;
  const label = section.querySelector('.word-section-label, .word-etymology-label');
  if (!label) return null;
  return 'w:' + currentWord + ':' + label.textContent.trim();
}

function selectParagraph(el) {
  clearActivePara();
  notesCurrentPara = getParaKey(el);
  if (!notesCurrentPara) return;
  el.classList.add('active-para');
  const text = el.textContent.trim().substring(0, 120);
  document.getElementById('notes-context').style.display = '';
  document.getElementById('notes-context-text').textContent = text + (el.textContent.trim().length > 120 ? '...' : '');
  document.getElementById('notes-input-wrap').style.display = notesUser ? '' : 'none';
  document.getElementById('notes-panel').classList.add('open');
  renderNotes(notesCurrentPara);
}

function clearActivePara() {
  document.querySelectorAll('.active-para').forEach(el => el.classList.remove('active-para'));
}

// Ctrl+double-click for notes on word meaning
document.addEventListener('dblclick', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;
  const target = e.target.closest('.word-meaning-detail, .word-etymology-text');
  if (!target) return;
  e.preventDefault();
  selectParagraph(target);
});

// Long-press on mobile for notes
(function() {
  let pressTimer = null;
  let pressTarget = null;
  let startX = 0, startY = 0;
  document.addEventListener('touchstart', function(e) {
    const target = e.target.closest('.word-meaning-detail, .word-etymology-text');
    if (!target) return;
    pressTarget = target;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    pressTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      target.classList.add('active-para');
      e.preventDefault();
      selectParagraph(target);
    }, 600);
  }, { passive: false });
  document.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
    if (pressTarget) pressTarget.classList.remove('active-para');
    pressTarget = null;
  });
  document.addEventListener('touchmove', function(e) {
    if (!pressTarget) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearTimeout(pressTimer);
      pressTarget.classList.remove('active-para');
      pressTarget = null;
    }
  });
})();

// Click on highlighted paragraph to view notes
document.addEventListener('click', function(e) {
  const para = e.target.closest('.para-highlight');
  if (para) {
    selectParagraph(para);
  }
});

// --- Notes storage ---
function getNotes() {
  return JSON.parse(localStorage.getItem('tflyc_notes') || '{}');
}
function saveNotes(notes) {
  localStorage.setItem('tflyc_notes', JSON.stringify(notes));
}

function submitNote() {
  if (!notesUser) { loginGitHub(); return; }
  if (!notesCurrentPara) return;
  const input = document.getElementById('notes-input');
  const text = input.value.trim();
  if (!text) return;

  const notes = getNotes();
  if (!notes[notesCurrentPara]) notes[notesCurrentPara] = [];
  notes[notesCurrentPara].push({
    id: Date.now().toString(36),
    author: notesUser.login,
    avatar: notesUser.avatar,
    text: text,
    time: Date.now(),
    likes: 0,
    likedBy: []
  });
  saveNotes(notes);
  input.value = '';
  renderNotes(notesCurrentPara);
  markParaWithNotes(notesCurrentPara);
}

function toggleLike(paraKey, noteId) {
  if (!notesUser) { loginGitHub(); return; }
  const notes = getNotes();
  const noteList = notes[paraKey];
  if (!noteList) return;
  const note = noteList.find(n => n.id === noteId);
  if (!note) return;
  if (!note.likedBy) note.likedBy = [];
  const idx = note.likedBy.indexOf(notesUser.login);
  if (idx === -1) {
    note.likedBy.push(notesUser.login);
    note.likes = (note.likes || 0) + 1;
  } else {
    note.likedBy.splice(idx, 1);
    note.likes = Math.max(0, (note.likes || 0) - 1);
  }
  saveNotes(notes);
  renderNotes(paraKey);
}

function renderNotes(paraKey) {
  const notes = getNotes();
  const list = notes[paraKey] || [];
  const container = document.getElementById('notes-list');

  if (!list.length) {
    container.innerHTML = '<div class="notes-empty">暂无笔记</div>';
    return;
  }

  const maxTime = Math.max(...list.map(n => n.time));
  const sorted = [...list].sort((a, b) => {
    const scoreA = (a.likes || 0) * 2 + (a.time / maxTime);
    const scoreB = (b.likes || 0) * 2 + (b.time / maxTime);
    return scoreB - scoreA;
  });

  container.innerHTML = sorted.map(n => {
    const isLiked = notesUser && n.likedBy && n.likedBy.includes(notesUser.login);
    const heartSvg = isLiked
      ? '<svg viewBox="0 0 24 24" fill="#E03131" stroke="#E03131" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="#ADB5BD" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
    const timeStr = formatTime(n.time);
    return `<div class="note-item">
      <div class="note-item-header">
        <img class="note-item-avatar" src="${safeAvatar(n.avatar)}" alt="">
        <span class="note-item-author">${escapeHtml(n.author)}</span>
        <span class="note-item-time">${timeStr}</span>
      </div>
      <div class="note-item-text">${escapeHtml(n.text)}</div>
      <div class="note-item-actions">
        <button class="note-like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${paraKey}','${n.id}')">
          ${heartSvg}
          <span class="like-count">${n.likes || 0}</span>
        </button>
      </div>
    </div>`;
  }).join('');
}

function renderAllNotes() {
  const notes = getNotes();
  const allNotes = [];
  for (const [key, list] of Object.entries(notes)) {
    list.forEach(n => allNotes.push({ ...n, paraKey: key }));
  }
  if (!allNotes.length) {
    document.getElementById('notes-list').innerHTML = '<div class="notes-empty">Ctrl+双击单词释义添加笔记</div>';
    return;
  }
  const maxTime = Math.max(...allNotes.map(n => n.time));
  const sorted = allNotes.sort((a, b) => {
    const scoreA = (a.likes || 0) * 2 + (a.time / maxTime);
    const scoreB = (b.likes || 0) * 2 + (b.time / maxTime);
    return scoreB - scoreA;
  });
  const container = document.getElementById('notes-list');
  container.innerHTML = sorted.map(n => {
    const isLiked = notesUser && n.likedBy && n.likedBy.includes(notesUser.login);
    const heartSvg = isLiked
      ? '<svg viewBox="0 0 24 24" fill="#E03131" stroke="#E03131" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="#ADB5BD" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
    return `<div class="note-item" onclick="jumpToPara('${n.paraKey}')" style="cursor:pointer">
      <div class="note-item-header">
        <img class="note-item-avatar" src="${safeAvatar(n.avatar)}" alt="">
        <span class="note-item-author">${escapeHtml(n.author)}</span>
        <span class="note-item-time">${formatTime(n.time)}</span>
      </div>
      <div class="note-item-text">${escapeHtml(n.text)}</div>
      <div class="note-item-actions">
        <button class="note-like-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation();toggleLike('${n.paraKey}','${n.id}')">
          ${heartSvg}
          <span class="like-count">${n.likes || 0}</span>
        </button>
      </div>
    </div>`;
  }).join('');
}

function jumpToPara(paraKey) {
  const match = paraKey.match(/^w:(.+):(.+)$/);
  if (!match) return;
  const word = match[1];
  const sectionLabel = match[2];
  if (currentWord !== word) {
    showWord(word);
  }
  setTimeout(() => {
    const labels = document.querySelectorAll('.word-section-label, .word-etymology-label');
    for (const label of labels) {
      if (label.textContent.trim() === sectionLabel) {
        const section = label.closest('.word-section, .word-etymology');
        const content = section.querySelector('.word-meaning-detail, .word-etymology-text');
        if (content) {
          selectParagraph(content);
          content.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      }
    }
  }, 100);
}

function markParaWithNotes(paraKey) {
  const match = paraKey.match(/^w:(.+):(.+)$/);
  if (!match) return;
  const sectionLabel = match[2];
  const labels = document.querySelectorAll('.word-section-label, .word-etymology-label');
  for (const label of labels) {
    if (label.textContent.trim() === sectionLabel) {
      const section = label.closest('.word-section, .word-etymology');
      const content = section.querySelector('.word-meaning-detail, .word-etymology-text');
      if (content) content.classList.add('para-highlight');
      break;
    }
  }
}

function markAllNotesOnPage() {
  const notes = getNotes();
  for (const key of Object.keys(notes)) {
    if (key.startsWith('w:' + currentWord + ':')) {
      markParaWithNotes(key);
    }
  }
}

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  return Math.floor(diff / 86400000) + '天前';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isValidImageUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function safeAvatar(url) {
  return isValidImageUrl(url) ? url : '';
}

// --- Pomodoro with Clock ---
let pomoInterval = null;
let pomoSeconds = 0;
let pomoSelectedMin = 25;
let clockDragging = false;

function showPomodoroModal() {
  document.getElementById('pomodoro-modal').style.display = '';
  drawClockTicks();
  updateClockHand();
}

function closePomodoroModal() {
  document.getElementById('pomodoro-modal').style.display = 'none';
}

function drawClockTicks() {
  const g = document.getElementById('pomo-ticks');
  if (g.children.length) return;
  const marks = [5,10,15,20,25,30,35,40,45,50,55,60];
  marks.forEach((min, i) => {
    const angle = (i / 12) * 360 - 90;
    const rad = angle * Math.PI / 180;
    const x1 = 100 + 78 * Math.cos(rad);
    const y1 = 100 + 78 * Math.sin(rad);
    const x2 = 100 + 84 * Math.cos(rad);
    const y2 = 100 + 84 * Math.sin(rad);
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',x1); line.setAttribute('y1',y1);
    line.setAttribute('x2',x2); line.setAttribute('y2',y2);
    line.setAttribute('stroke','#ADB5BD'); line.setAttribute('stroke-width','2');
    g.appendChild(line);
    const tx = 100 + 66 * Math.cos(rad);
    const ty = 100 + 66 * Math.sin(rad);
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x',tx); text.setAttribute('y',ty);
    text.setAttribute('text-anchor','middle'); text.setAttribute('dominant-baseline','central');
    text.setAttribute('font-size','11'); text.setAttribute('fill','#6C757D');
    text.setAttribute('font-family','Inter,sans-serif');
    text.textContent = min;
    g.appendChild(text);
  });
}

function updateClockHand() {
  const hand = document.getElementById('pomo-hand');
  const label = document.getElementById('pomo-clock-label');
  const angle = (pomoSelectedMin / 60) * 360;
  hand.setAttribute('transform', `rotate(${angle},100,100)`);
  label.textContent = pomoSelectedMin + ' min';
}

function selectPreset(el, min) {
  document.querySelectorAll('.pomo-preset').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  pomoSelectedMin = min;
  updateClockHand();
}

// Clock drag interaction
(function() {
  const svg = document.getElementById('pomo-clock-svg');
  if (!svg) return;
  function getAngleFromEvent(e) {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let angle = Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    return angle;
  }
  function onMove(e) {
    if (!clockDragging) return;
    e.preventDefault();
    const angle = getAngleFromEvent(e);
    const min = Math.round((angle / 360) * 60) || 1;
    pomoSelectedMin = Math.min(Math.max(min, 1), 60);
    document.querySelectorAll('.pomo-preset').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.min) === pomoSelectedMin);
    });
    updateClockHand();
  }
  function onUp() { clockDragging = false; }
  svg.addEventListener('mousedown', (e) => { clockDragging = true; onMove(e); });
  svg.addEventListener('touchstart', (e) => { clockDragging = true; onMove(e); }, {passive:false});
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, {passive:false});
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);
})();

function startPomodoro() {
  pomoSeconds = pomoSelectedMin * 60;
  if (pomoInterval) clearInterval(pomoInterval);
  updatePomoDisplay();
  document.getElementById('pomodoro-timer').style.display = '';
  closePomodoroModal();
  pomoInterval = setInterval(() => {
    pomoSeconds--;
    if (pomoSeconds <= 0) {
      clearInterval(pomoInterval);
      pomoInterval = null;
      document.getElementById('pomodoro-display').textContent = '00:00';
      if (Notification.permission === 'granted') {
        new Notification('番茄钟', { body: '时间到！' });
      }
      setTimeout(() => { document.getElementById('pomodoro-timer').style.display = 'none'; }, 3000);
      return;
    }
    updatePomoDisplay();
  }, 1000);
}

function stopPomodoro() {
  if (pomoInterval) { clearInterval(pomoInterval); pomoInterval = null; }
  document.getElementById('pomodoro-timer').style.display = 'none';
}

function updatePomoDisplay() {
  const m = Math.floor(pomoSeconds / 60);
  const s = pomoSeconds % 60;
  document.getElementById('pomodoro-display').textContent =
    String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// --- Start App ---
init();
