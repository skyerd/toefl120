const ETYMOLOGY_WORDS = Object.keys(SITE_DATA.etymologies).sort();

let currentView = 'home';
let currentSentenceId = null;
let currentEtymologyWord = null;

function init() {
  buildSentenceNav();
  buildEtymologyNav();
  buildStructureTags();
  buildSentenceCards();
  restoreState();
}

function saveState() {
  localStorage.setItem('toefl120_state', JSON.stringify({
    view: currentView,
    sentenceId: currentSentenceId,
    etymologyWord: currentView === 'etymology' ? currentEtymologyWord : null
  }));
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem('toefl120_state'));
    if (saved) {
      if (saved.view === 'sentence' && saved.sentenceId) {
        showSentence(saved.sentenceId);
        return;
      } else if (saved.view === 'etymology' && saved.etymologyWord) {
        showEtymology(saved.etymologyWord);
        return;
      }
    }
  } catch (e) {}
  showHome();
}

function buildSentenceNav() {
  const nav = document.getElementById('sentence-nav');
  const html = SITE_DATA.sentences.map(s => {
    const shortText = s.english.length > 36 ? s.english.substring(0, 36) + '…' : s.english;
    return `<div class="nav-item" data-sentence="${s.id}" onclick="showSentence(${s.id})">
      <span class="nav-item-num">${String(s.id).padStart(3, '0')}</span>${shortText}
    </div>`;
  }).join('');
  nav.innerHTML = html;
}

function buildEtymologyNav() {
  const nav = document.getElementById('etymology-nav');
  const html = ETYMOLOGY_WORDS.map(word => {
    return `<div class="nav-item" data-word="${word}" onclick="showEtymology('${word}')">${word}</div>`;
  }).join('');
  nav.innerHTML = html;
}

function buildStructureTags() {
  const structures = new Set();
  SITE_DATA.sentences.forEach(s => structures.add(s.structure));
  const container = document.getElementById('structure-tags');
  container.innerHTML = Array.from(structures).map(s =>
    `<span class="structure-tag" onclick="filterByStructure('${s}')">${s}</span>`
  ).join('');
}

function buildSentenceCards() {
  const container = document.getElementById('sentence-cards');
  const first12 = SITE_DATA.sentences.slice(0, 12);
  container.innerHTML = first12.map(s => `
    <div class="sentence-card" onclick="showSentence(${s.id})">
      <div class="sentence-card-num">No. ${String(s.id).padStart(3, '0')}</div>
      <div class="sentence-card-text">${s.english}</div>
      <div class="sentence-card-structure">${s.structure}</div>
    </div>
  `).join('');
}

function highlightWords(text) {
  let result = text;
  const sortedWords = ETYMOLOGY_WORDS.sort((a, b) => b.length - a.length);
  sortedWords.forEach(word => {
    const regex = new RegExp(`\\b(${word}(?:s|es|ed|ing|tion|sion|ment|ness|ity|ous|ive|al|ly|er|est|ic|ical|ize|ise|ify|ate|able|ible|ual|ual)?)\\b`, 'gi');
    result = result.replace(regex, (match) => {
      return `<span class="word-highlight" onclick="event.stopPropagation(); showEtymology('${word}')">${match}</span>`;
    });
  });
  return result;
}

function showHome() {
  currentView = 'home';
  currentSentenceId = null;
  currentEtymologyWord = null;
  document.getElementById('home-page').style.display = '';
  document.getElementById('sentence-page').style.display = 'none';
  document.getElementById('etymology-page').style.display = 'none';
  clearActiveNav();
  saveState();
}

function showSentence(id) {
  currentView = 'sentence';
  currentSentenceId = id;
  const s = SITE_DATA.sentences.find(x => x.id === id);
  if (!s) return;

  document.getElementById('home-page').style.display = 'none';
  document.getElementById('sentence-page').style.display = '';
  document.getElementById('etymology-page').style.display = 'none';

  const prevId = id > 1 ? id - 1 : null;
  const nextId = id < SITE_DATA.sentences.length ? id + 1 : null;

  document.getElementById('sentence-page').innerHTML = `
    <h1 class="sentence-title">第 ${s.id} 句</h1>
    <div class="sentence-section">
      <div class="sentence-section-label">英文原句</div>
      <div class="sentence-english">${highlightWords(s.english)}</div>
    </div>
    <div class="sentence-section">
      <div class="sentence-section-label">中文翻译</div>
      <div class="sentence-chinese">${s.chinese}</div>
    </div>
    <div class="sentence-section">
      <div class="sentence-section-label">句子结构</div>
      <span class="sentence-structure-tag">${s.structure}</span>
    </div>
    <div class="sentence-section">
      <div class="sentence-section-label">详细分析</div>
      <div class="sentence-analysis">${s.analysis}</div>
    </div>
    <div class="nav-buttons">
      <button class="nav-btn" ${prevId ? `onclick="showSentence(${prevId})"` : 'disabled'}>← 上一句</button>
      <button class="nav-btn" ${nextId ? `onclick="showSentence(${nextId})"` : 'disabled'}>下一句 →</button>
    </div>
  `;

  setActiveNav('sentence', id);
  closeSidebarMobile();
  window.scrollTo(0, 0);
  saveState();
}

function showEtymology(word) {
  currentView = 'etymology';
  currentEtymologyWord = word;
  const etymology = SITE_DATA.etymologies[word];
  if (!etymology) return;

  document.getElementById('home-page').style.display = 'none';
  document.getElementById('sentence-page').style.display = 'none';
  document.getElementById('etymology-page').style.display = '';

  const relatedSentences = SITE_DATA.sentences.filter(s => {
    const regex = new RegExp(`\\b${word}\\w*\\b`, 'i');
    return regex.test(s.english);
  });

  document.getElementById('etymology-page').innerHTML = `
    <h1 class="etymology-word">${word}</h1>
    <div class="etymology-section">
      <div class="etymology-section-label">词源探析</div>
      <div class="etymology-text">${etymology}</div>
    </div>
    ${relatedSentences.length > 0 ? `
    <div class="etymology-sentences">
      <div class="etymology-sentences-label">出现在以下句子中</div>
      ${relatedSentences.map(s => `
        <div class="etymology-sentence-item" onclick="showSentence(${s.id})">
          <div class="etymology-sentence-num">第 ${s.id} 句 · <span class="structure-label">${s.structure}</span></div>
          <div class="etymology-sentence-text">${s.english}</div>
        </div>
      `).join('')}
    </div>` : ''}
  `;

  setActiveNav('etymology', word);
  closeSidebarMobile();
  window.scrollTo(0, 0);
  saveState();
}

function setActiveNav(type, id) {
  clearActiveNav();
  if (type === 'sentence') {
    const item = document.querySelector(`.nav-item[data-sentence="${id}"]`);
    if (item) item.classList.add('active');
  } else if (type === 'etymology') {
    const item = document.querySelector(`.nav-item[data-word="${id}"]`);
    if (item) item.classList.add('active');
  }
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

function filterByStructure(structure) {
  const filtered = SITE_DATA.sentences.filter(s => s.structure === structure);
  if (filtered.length > 0) {
    showSentence(filtered[0].id);
  }
}

function findBaseWord(word) {
  const lower = word.toLowerCase();
  if (SITE_DATA.etymologies[lower]) return lower;
  for (const base of ETYMOLOGY_WORDS) {
    const regex = new RegExp(`^${base}(?:s|es|ed|ing|tion|sion|ment|ness|ity|ous|ive|al|ly|er|est|ic|ical|ize|ise|ify|ate|able|ible|ual)?$`, 'i');
    if (regex.test(lower)) return base;
  }
  return null;
}

document.addEventListener('dblclick', function(e) {
  const sel = window.getSelection();
  if (!sel || !sel.toString().trim()) return;
  const text = sel.toString().trim();
  if (!/^[a-zA-Z]+$/.test(text)) return;
  const baseWord = findBaseWord(text);
  if (baseWord) {
    showEtymology(baseWord);
  } else {
    window.open(`https://www.etymonline.com/word/${text.toLowerCase()}`, '_blank');
  }
});

document.addEventListener('keydown', (e) => {
  if (currentView === 'sentence' && currentSentenceId) {
    if (e.key === 'ArrowLeft' && currentSentenceId > 1) {
      showSentence(currentSentenceId - 1);
    }
    if (e.key === 'ArrowRight' && currentSentenceId < SITE_DATA.sentences.length) {
      showSentence(currentSentenceId + 1);
    }
  }
});

init();
