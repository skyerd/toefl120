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
  markAllNotesOnPage();
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

// --- Float Rail Features ---

function showNotes() {
  document.getElementById('notes-panel').classList.add('open');
  if (!notesCurrentPara) renderAllNotes();
}

function closeNotes() {
  document.getElementById('notes-panel').classList.remove('open');
  clearActivePara();
}

// --- Notes System ---
let notesUser = JSON.parse(localStorage.getItem('tflyc_user') || 'null');
let notesToken = null; // Token kept in memory only (OWASP recommendation)
let notesCurrentPara = null; // paragraph key for current context

// Restore login state — verify token is still valid on load
if (notesUser) {
  // Token not persisted; user needs to re-login after page refresh
  // This follows OWASP guidance: store tokens in memory, not localStorage
  notesUser = null;
  localStorage.removeItem('tflyc_user');
  localStorage.removeItem('tflyc_token');
}

function loginGitHub() {
  if (notesUser) {
    // Logout
    notesUser = null;
    notesToken = null;
    localStorage.removeItem('tflyc_user');
    localStorage.removeItem('tflyc_token');
    document.getElementById('login-btn-text').textContent = '登录';
    document.getElementById('notes-logged-in').style.display = 'none';
    return;
  }
  // Show login modal with OAuth
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
  // GitHub OAuth App client_id — user needs to register their own
  const CLIENT_ID = 'Ov23liF5mZ0e0b0VqB9A';
  const REDIRECT_URI = location.origin + location.pathname.replace(/[^/]*$/, '') + '../callback.html';
  const scope = 'read:user';
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}`;
  const popup = window.open(url, 'github-oauth', 'width=600,height=700');
  // Listen for message from callback
  window.addEventListener('message', function handler(e) {
    if (e.origin !== location.origin) return;
    if (e.data && e.data.type === 'github-oauth') {
      window.removeEventListener('message', handler);
      if (e.data.code) {
        // Exchange code for token via a public proxy
        exchangeCodeForToken(e.data.code, CLIENT_ID);
      }
    }
  });
}

async function exchangeCodeForToken(code, clientId) {
  document.getElementById('login-modal')?.remove();
  // Show loading
  const loading = document.createElement('div');
  loading.className = 'login-modal';
  loading.id = 'login-modal';
  loading.innerHTML = '<div class="login-modal-box"><div style="text-align:center;padding:20px;color:var(--fg-secondary);font-size:0.88rem">正在验证...</div></div>';
  document.body.appendChild(loading);

  try {
    // Use a serverless function or direct approach
    // For static sites, we use the code directly with GitHub API
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
    // CORS blocked — fallback: ask user to enter token manually
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
    notesToken = token; // Keep token in memory only, not localStorage (OWASP)
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

// --- Paragraph selection ---
function getParaKey(el) {
  // Generate a unique key for a paragraph element
  const sentencePage = document.getElementById('sentence-page');
  if (!sentencePage.contains(el)) return null;
  // Find the section this paragraph belongs to
  const section = el.closest('.sentence-section');
  if (!section) return null;
  const label = section.querySelector('.sentence-section-label');
  if (!label) return null;
  return 's' + currentSentenceId + ':' + label.textContent.trim();
}

function selectParagraph(el) {
  clearActivePara();
  notesCurrentPara = getParaKey(el);
  if (!notesCurrentPara) return;
  el.classList.add('active-para');
  // Show context
  const text = el.textContent.trim().substring(0, 120);
  document.getElementById('notes-context').style.display = '';
  document.getElementById('notes-context-text').textContent = text + (el.textContent.trim().length > 120 ? '...' : '');
  // Show input if logged in
  document.getElementById('notes-input-wrap').style.display = notesUser ? '' : 'none';
  // Open panel
  document.getElementById('notes-panel').classList.add('open');
  renderNotes(notesCurrentPara);
}

function clearActivePara() {
  document.querySelectorAll('.active-para').forEach(el => el.classList.remove('active-para'));
}

// Ctrl+double-click on desktop
document.addEventListener('dblclick', function(e) {
  if (!e.ctrlKey && !e.metaKey) return;
  const target = e.target.closest('.sentence-english, .sentence-chinese, .sentence-analysis');
  if (!target) return;
  e.preventDefault();
  selectParagraph(target);
});

// Long-press on mobile
(function() {
  let pressTimer = null;
  let pressTarget = null;
  let startX = 0, startY = 0;
  document.addEventListener('touchstart', function(e) {
    const target = e.target.closest('.sentence-english, .sentence-chinese, .sentence-analysis');
    if (!target) return;
    pressTarget = target;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    pressTimer = setTimeout(() => {
      // Haptic feedback (Material Design / Apple HIG recommendation)
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
    // Cancel if finger moved more than 10px (W3C best practice to avoid conflict with scrolling)
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
  // Mark paragraph as having notes
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

  // Sort: by (likes * 2 + recency score), newest and most liked first
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
  // Show all notes across all paragraphs
  const notes = getNotes();
  const allNotes = [];
  for (const [key, list] of Object.entries(notes)) {
    list.forEach(n => allNotes.push({ ...n, paraKey: key }));
  }
  if (!allNotes.length) {
    document.getElementById('notes-list').innerHTML = '<div class="notes-empty">Ctrl+双击 或 长按段落添加笔记</div>';
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
  // Parse paraKey like "s5:英文原文"
  const match = paraKey.match(/^s(\d+):(.+)$/);
  if (!match) return;
  const sentenceId = parseInt(match[1]);
  const sectionLabel = match[2];
  if (currentSentenceId !== sentenceId) {
    showSentence(sentenceId);
  }
  // Find the section with matching label
  setTimeout(() => {
    const sections = document.querySelectorAll('.sentence-section-label');
    for (const label of sections) {
      if (label.textContent.trim() === sectionLabel) {
        const section = label.closest('.sentence-section');
        const content = section.querySelector('.sentence-english, .sentence-chinese, .sentence-analysis');
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
  // Add highlight class to paragraphs that have notes
  const match = paraKey.match(/^s(\d+):(.+)$/);
  if (!match) return;
  const sectionLabel = match[2];
  const sections = document.querySelectorAll('.sentence-section-label');
  for (const label of sections) {
    if (label.textContent.trim() === sectionLabel) {
      const section = label.closest('.sentence-section');
      const content = section.querySelector('.sentence-english, .sentence-chinese, .sentence-analysis');
      if (content) content.classList.add('para-highlight');
      break;
    }
  }
}

// Mark all existing notes on page load
function markAllNotesOnPage() {
  const notes = getNotes();
  for (const key of Object.keys(notes)) {
    if (key.startsWith('s' + currentSentenceId + ':')) {
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

function showRepo() {
  // TODO: 共享仓库功能
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
    // tick line
    const x1 = 100 + 78 * Math.cos(rad);
    const y1 = 100 + 78 * Math.sin(rad);
    const x2 = 100 + 84 * Math.cos(rad);
    const y2 = 100 + 84 * Math.sin(rad);
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',x1); line.setAttribute('y1',y1);
    line.setAttribute('x2',x2); line.setAttribute('y2',y2);
    line.setAttribute('stroke','#ADB5BD'); line.setAttribute('stroke-width','2');
    g.appendChild(line);
    // number
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
  // Map minutes to angle: 60min = 360deg, so each min = 6deg
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
    // Smooth: 1-minute resolution (6deg per min)
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

  // Also detect mouse near right edge (within 20% of viewport width)
  document.addEventListener('mousemove', function(e) {
    if (e.clientX > window.innerWidth * 0.8) {
      showRail();
    }
  });
})();
