// SM-2 ALGORITHM
// ══════════════════════════════════════════
function applySM2(cd, q) {
  // q: 0=Again, 3=Hard, 4=Good, 5=Easy
  if (q < 3) {
    cd.interval = 1;
    cd.reviewFlag = true;
  } else {
    const prev = cd.interval || 1;
    if (prev <= 1) cd.interval = q === 5 ? 4 : 1;
    else cd.interval = q === 5 ? Math.round(prev * cd.efactor * 1.3) : Math.round(prev * cd.efactor);
    cd.interval = Math.max(1, cd.interval);
    cd.efactor = Math.max(1.3, (cd.efactor || 2.5) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    cd.reviewFlag = false;
  }
  const d = new Date();
  d.setDate(d.getDate() + cd.interval);
  cd.due = d.toISOString().slice(0, 10);
  cd.lastRating = q;
}

// ══════════════════════════════════════════
// MASTERY
// ══════════════════════════════════════════
function toggleMastered() {
  if (!activeDeck.length) return;
  const card = activeDeck[currentIndex];
  const cd = cardData[card.hanzi] || {};
  if (cd.mastered) {
    // Show: unmark mastered
    if (!cardData[card.hanzi]) cardData[card.hanzi] = {};
    cardData[card.hanzi].mastered = false;
    cardData[card.hanzi].reviewFlag = false;
    saveProgress();
    updateReviewBadge();
    renderCard();
  } else {
    markMastered();
  }
}

function markMastered() {
  if (!activeDeck.length) return;
  const card = activeDeck[currentIndex];
  if (!cardData[card.hanzi]) cardData[card.hanzi] = {};
  const cd = cardData[card.hanzi];

  // Store undo snapshot
  lastMasteredCard = { hanzi: card.hanzi, prev: { mastered: cd.mastered, masteredDate: cd.masteredDate, interval: cd.interval, efactor: cd.efactor, due: cd.due, reviewFlag: cd.reviewFlag, correct: cd.correct, wrong: cd.wrong, lastRating: cd.lastRating } };

  cd.mastered = true;
  cd.masteredDate = new Date().toISOString();
  if (!cd.interval) cd.interval = 1;
  if (!cd.efactor) cd.efactor = 2.5;
  cd.due = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  cd.reviewFlag = false;

  saveProgress();
  updateReviewBadge();
  showUndoBtn();
  nextCard();
}

function showUndoBtn() {
  const btn = document.getElementById('btn-undo');
  btn.classList.add('visible');
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => btn.classList.remove('visible'), 5000);
}

function undoMastered() {
  if (!lastMasteredCard) return;
  const { hanzi, prev } = lastMasteredCard;
  if (!cardData[hanzi]) cardData[hanzi] = {};
  Object.assign(cardData[hanzi], prev);
  lastMasteredCard = null;
  clearTimeout(undoTimer);
  document.getElementById('btn-undo').classList.remove('visible');
  saveProgress();
  updateReviewBadge();
  renderCard();
}

function toggleHideMastered() {
  hideMastered = !hideMastered;
  // If current card is now hidden, advance to next visible one
  if (hideMastered && activeDeck.length && isCardHidden(activeDeck[currentIndex])) {
    nextCard();
  } else {
    renderCard();
  }
}

function toggleMasteredList() {
  const modal = document.getElementById('mastered-list-modal');
  const isOpen = modal.classList.contains('open');
  if (isOpen) {
    modal.classList.remove('open');
  } else {
    renderMasteredList();
    modal.classList.add('open');
  }
}

function renderMasteredList() {
  // Gather all mastered cards across all decks
  const masteredCards = [];
  const seen = new Set();
  const allDecks = [
    ...Object.entries(HSK_DATA).map(([lvl, cards]) => ({ name: 'HSK ' + lvl, cards })),
    ...Object.entries(decks).filter(([n]) => n !== '⟳ review').map(([name, cards]) => ({ name, cards }))
  ];
  for (const { cards } of allDecks) {
    if (!cards) continue;
    for (const card of cards) {
      if (seen.has(card.hanzi)) continue;
      seen.add(card.hanzi);
      const cd = cardData[card.hanzi];
      if (cd && cd.mastered) masteredCards.push(card);
    }
  }

  const count = document.getElementById('mastered-list-count');
  count.textContent = `(${masteredCards.length})`;

  const el = document.getElementById('mastered-list-content');
  if (!masteredCards.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text3);padding:24px">no mastered cards yet</div>';
    return;
  }

  el.innerHTML = masteredCards.map(card => `
    <div class="mastered-list-row">
      <div class="mastered-list-hanzi">${card.hanzi}</div>
      <div class="mastered-list-info">
        <div class="mastered-list-pinyin">${card.pinyin}</div>
        <div class="mastered-list-english">${card.english}</div>
      </div>
      <button class="mastered-list-unmaster" onclick="unmasterCard('${card.hanzi}')">unmaster</button>
    </div>
  `).join('');
}

function unmasterCard(hanzi) {
  if (!cardData[hanzi]) return;
  cardData[hanzi].mastered = false;
  cardData[hanzi].masteredDate = null;
  cardData[hanzi].interval = 0;
  cardData[hanzi].due = null;
  saveProgress();
  updateReviewBadge();
  renderMasteredList();
  if (listViewActive) renderListView();
}

function getCardData(hanzi) {
  if (!cardData[hanzi]) {
    cardData[hanzi] = { correct: 0, wrong: 0, reviewFlag: false, interval: 0, efactor: 2.5, due: null, lastRating: null, note: '', mastered: false };
  }
  return cardData[hanzi];
}

// ══════════════════════════════════════════
// REVIEW DECK
// ══════════════════════════════════════════
function getReviewCards() {
  const today = new Date().toISOString().slice(0, 10);
  const due = [];
  for (const [hanzi, cd] of Object.entries(cardData)) {
    if (cd.reviewFlag || (cd.mastered && cd.due && cd.due <= today)) {
      // Find the card object from any deck
      let cardObj = null;
      let sourceDeck = null;
      for (const [level, cards] of Object.entries(HSK_DATA)) {
        if (cards) { const found = cards.find(c => c.hanzi === hanzi); if (found) { cardObj = found; sourceDeck = 'HSK ' + level; break; } }
      }
      if (!cardObj) {
        for (const [name, cards] of Object.entries(decks)) {
          if (name !== '⟳ review') { const found = cards.find(c => c.hanzi === hanzi); if (found) { cardObj = found; sourceDeck = name; break; } }
        }
      }
      if (cardObj) {
        // Clone to avoid mutating original
        const clone = Object.assign({}, cardObj);
        clone._sourceDeck = sourceDeck;
        due.push(clone);
      }
    }
  }
  return due;
}

function updateReviewBadge() {
  const count = getReviewCards().length;
  const badge = document.getElementById('review-badge');
  const deck = document.getElementById('review-deck');
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('empty', count === 0);
  }
  if (deck) {
    deck.classList.toggle('has-cards', count > 0);
    deck.classList.toggle('active', activeDeckName === '⟳ review');
  }
  // Show badge on header deck button when sidebar is closed
  let headerBadge = document.getElementById('deck-btn-badge');
  if (!headerBadge) {
    const btn = document.getElementById('btn-deck');
    if (btn) {
      headerBadge = document.createElement('span');
      headerBadge.id = 'deck-btn-badge';
      headerBadge.className = 'header-badge';
      btn.style.position = 'relative';
      btn.appendChild(headerBadge);
    }
  }
  if (headerBadge) {
    headerBadge.textContent = count;
    headerBadge.style.display = count > 0 ? '' : 'none';
  }
}

function openReviewDeck() {
  const cards = getReviewCards();
  if (!cards.length) {
    showToast("All caught up — no cards due for review!");
    return;
  }
  decks['⟳ review'] = cards;
  selectDeck('⟳ review');
  setMode('test');
}

function showToast(msg) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg4);border:1px solid var(--border2);color:var(--text);padding:10px 20px;border-radius:var(--radius);font-size:13px;z-index:9998;box-shadow:var(--elevation);pointer-events:none;transition:opacity .3s';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ══════════════════════════════════════════
// MODE SWITCHING
// ══════════════════════════════════════════
function setMode(mode) {
  // Save test session when leaving test mode
  if (currentMode === 'test' && mode !== 'test' && sessionLog.length > 0) saveSession();

  currentMode = mode;
  // Update card mode button
  const modeBtn = document.getElementById('card-mode-btn');
  if (modeBtn) {
    modeBtn.textContent = mode === 'test' ? 'study' : 'test';
    modeBtn.classList.toggle('active', mode === 'test');
  }
  // Legacy pill (may be removed)
  const pillTest = document.getElementById('pill-test');
  if (pillTest) pillTest.classList.toggle('active', mode === 'test');

  const hasDeck = activeDeck.length > 0;

  document.getElementById('study-view').classList.toggle('active', mode === 'study' && hasDeck);
  document.getElementById('card-controls').classList.toggle('active', mode === 'study' && hasDeck);
  document.getElementById('test-view').classList.toggle('active', mode === 'test');

  // Info panel: hide in test mode
  const btnInfo = document.getElementById('btn-info');
  if (btnInfo) btnInfo.style.display = mode === 'test' ? 'none' : '';
  if (mode === 'test') {
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel && infoPanel.classList.contains('open')) toggleInfoPanel();
  }

  renderContextStrip();
  updatePrefsVisibility();

  if (mode === 'test') {
    if (!hasDeck) {
      // No deck — show prompt and open sidebar
      _showTestNoDeck();
    } else {
      _showTestStartScreen();
    }
    // Open sidebar so user can pick a deck
    if (!sidebarOpen) toggleSidebar();
  }

  if (mode === 'study') {
    renderCard();
    // Reset inline overrides so test-view children are clean on next entry
    const ss = document.getElementById('test-start-screen');
    const ta = document.getElementById('test-area');
    const pb = document.getElementById('test-progress-bar');
    const nd = document.getElementById('test-no-deck');
    if (ss) ss.style.display = '';
    if (ta) ta.style.display = '';
    if (pb) pb.style.display = '';
    if (nd) nd.style.display = 'none';
  }
}

function _showTestNoDeck() {
  document.getElementById('test-start-screen').style.display = 'none';
  document.getElementById('test-area').style.display = 'none';
  document.getElementById('test-progress-bar').style.display = 'none';
  const nd = document.getElementById('test-no-deck');
  if (nd) nd.style.display = '';
}

function _showTestStartScreen() {
  const startScreen = document.getElementById('test-start-screen');
  const testArea = document.getElementById('test-area');
  const progressBar = document.getElementById('test-progress-bar');
  startScreen.style.display = '';
  testArea.style.display = 'none';
  progressBar.style.display = 'none';

  // Fill in deck info
  const deckNameEl = document.getElementById('test-start-deck-name');
  if (activeDeckName === '⟳ review') {
    deckNameEl.innerHTML = '<svg class="review-icon" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1.5 8a6.5 6.5 0 0 1 11.48-4.17M14.5 1.5v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.5 8A6.5 6.5 0 0 1 3.02 12.17M1.5 14.5v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> review';
  } else {
    deckNameEl.textContent = activeDeckName;
  }
  document.getElementById('test-start-meta').textContent =
    `${activeDeck.length} card${activeDeck.length !== 1 ? 's' : ''}`;

  syncStartFmt();
}

function syncStartFmt() {
  const isMC = currentFormat === 'mc';
  const mc = document.getElementById('start-fmt-mc');
  const ty = document.getElementById('start-fmt-type');
  if (mc) mc.classList.toggle('active', isMC);
  if (ty) ty.classList.toggle('active', !isMC);
}

function beginTest() {
  stats = { correct: 0, wrong: 0, streak: 0, times: [], mastered: new Set(), reviewFlagged: new Set() };
  sessionLog = [];
  currentIndex = 0;

  document.getElementById('test-start-screen').style.display = 'none';
  document.getElementById('test-area').style.display = '';
  document.getElementById('test-progress-bar').style.display = '';

  updateStats();
  initTestCard();
}

// ══════════════════════════════════════════
