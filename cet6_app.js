let currentView = 'home';
let currentWord = null;

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

function init() {
  buildLetterNav();
  buildWordNav();
  buildLetterTags();
  buildWordList();
  restoreState();
}

function saveState() {
  localStorage.setItem('cet6_state', JSON.stringify({
    view: currentView,
    word: currentView === 'word' ? currentWord : null
  }));
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem('cet6_state'));
    if (saved) {
      if (saved.view === 'word' && saved.word) {
        showWord(saved.word);
        return;
      }
    }
  } catch (e) {}
  showHome();
}

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
  nav.innerHTML = CET6_WORDS.map(w => {
    return `<div class="nav-item" data-word="${w.word}" onclick="showWord('${w.word}')">${w.word}</div>`;
  }).join('');
}

function buildLetterTags() {
  const container = document.getElementById('letter-tags');
  container.innerHTML = LETTERS.map(l =>
    `<span class="structure-tag" onclick="scrollToLetter('${l}')">${l}</span>`
  ).join('');
}

function buildWordList() {
  const container = document.getElementById('word-list');
  let html = '';
  LETTERS.forEach(l => {
    html += `<div class="letter-group" id="letter-${l}">
      <div class="letter-header">${l}</div>
      <div class="letter-words">`;
    letterMap[l].forEach(w => {
      html += `<div class="word-item" onclick="showWord('${w.word}')">
        <span class="word-item-word">${w.word}</span>
        <span class="word-item-meaning">${w.meaning}</span>
      </div>`;
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
}

function scrollToLetter(letter) {
  showHome();
  setTimeout(() => {
    const el = document.getElementById('letter-' + letter);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
  closeSidebarMobile();
}

function showHome() {
  currentView = 'home';
  currentWord = null;
  document.getElementById('home-page').style.display = '';
  document.getElementById('word-page').style.display = 'none';
  clearActiveNav();
  saveState();
}

function showWord(word) {
  currentView = 'word';
  currentWord = word;
  const w = CET6_WORDS.find(x => x.word === word);
  if (!w) return;

  document.getElementById('home-page').style.display = 'none';
  document.getElementById('word-page').style.display = '';

  // Find prev/next
  const idx = CET6_WORDS.findIndex(x => x.word === word);
  const prevWord = idx > 0 ? CET6_WORDS[idx - 1].word : null;
  const nextWord = idx < CET6_WORDS.length - 1 ? CET6_WORDS[idx + 1].word : null;

  // Parse meaning to extract pos and definition
  const meaningText = w.meaning;

  document.getElementById('word-page').innerHTML = `
    <h1 class="word-title">${w.word}</h1>
    <div class="word-section">
      <div class="word-section-label">释义</div>
      <div class="word-meaning-detail">${meaningText}</div>
    </div>
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

// Keyboard navigation
document.addEventListener('keydown', (e) => {
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
});

// Float Rail Hover
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

init();
