// DECK SELECTION & CARD RENDERING
// ══════════════════════════════════════════
function selectDeck(name) {
  // Save session if switching away from test mode
  if (currentMode === 'test' && sessionLog.length > 0) saveSession();

  activeDeckName = name;
  activeDeck = [...decks[name]];
  currentIndex = 0;
  stats = { correct: 0, wrong: 0, streak: 0, times: [], mastered: new Set(), reviewFlagged: new Set() };
  sessionLog = [];

  document.getElementById('empty-view').style.display = 'none';
  document.body.classList.add('deck-active');
  // Reset list view when switching decks
  if (listViewActive) setListView(false);
  document.getElementById('study-view').classList.add('active');
  document.getElementById('card-controls').classList.add('active');

  renderCard();
  updateProgress();
  renderSidebar();

  if (currentMode === 'test') {
    // In test mode: undo the unconditional study-view activation above, show start screen
    document.getElementById('study-view').classList.remove('active');
    document.getElementById('card-controls').classList.remove('active');
    document.getElementById('test-view').classList.add('active');
    const nd = document.getElementById('test-no-deck');
    if (nd) nd.style.display = 'none';
    _showTestStartScreen();
  }
}

function renderCard() {
  if (!activeDeck.length) return;
  const card = activeDeck[currentIndex];
  if (!card) return;

  // Unflip
  document.getElementById('card-inner').classList.remove('flipped');

  document.getElementById('front-hanzi').textContent = card.hanzi;
  document.getElementById('front-pinyin').textContent = card.pinyin;
  document.getElementById('front-pinyin').classList.toggle('hidden', !showPinyin);
  document.getElementById('back-english').textContent = card.english;

  // Note indicator
  const cd = cardData[card.hanzi];
  const noteIcon = document.getElementById('card-note-icon');
  noteIcon.classList.toggle('visible', !!(cd && cd.note));
  if (cd && cd.note) noteIcon.title = cd.note;

  // Review flag
  const flag = document.getElementById('card-review-flag');
  flag.style.display = (cd && cd.reviewFlag) ? '' : 'none';

  // Update mastery button label
  const btnMastered = document.getElementById('btn-mastered');
  if (btnMastered) {
    const isMastered = cd && cd.mastered;
    btnMastered.setAttribute('data-tip', isMastered ? 'show' : 'hide');
    // Eye icon (open) vs eye-slash (hidden)
    btnMastered.innerHTML = isMastered
      ? '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 13.5l11-11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.3"/></svg>';
  }

  updateProgress();

  // Sync info panel if open
  if (infoPanelOpen) { infoPanelHistory = []; renderInfoPanel(card); }
  renderContextStrip();
}

function flipCard() {
  document.getElementById('card-inner').classList.toggle('flipped');
}

function isCardHidden(card) {
  if (!hideMastered) return false;
  const cd = cardData[card.hanzi];
  return cd && cd.mastered && !cd.reviewFlag;
}

function nextCard() {
  if (!activeDeck.length) return;
  let next = (currentIndex + 1) % activeDeck.length;
  if (hideMastered) {
    for (let i = 0; i < activeDeck.length; i++) {
      if (!isCardHidden(activeDeck[next])) break;
      next = (next + 1) % activeDeck.length;
    }
    if (isCardHidden(activeDeck[next])) {
      showToast('All cards mastered — toggle hide to continue');
      return;
    }
  }
  currentIndex = next;
  renderCard();
}

function prevCard() {
  if (!activeDeck.length) return;
  let prev = (currentIndex - 1 + activeDeck.length) % activeDeck.length;
  if (hideMastered) {
    for (let i = 0; i < activeDeck.length; i++) {
      if (!isCardHidden(activeDeck[prev])) break;
      prev = (prev - 1 + activeDeck.length) % activeDeck.length;
    }
    if (isCardHidden(activeDeck[prev])) {
      showToast('All cards mastered — toggle hide to continue');
      return;
    }
  }
  currentIndex = prev;
  renderCard();
}

function shuffleDeck() {
  for (let i = activeDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeDeck[i], activeDeck[j]] = [activeDeck[j], activeDeck[i]];
  }
  currentIndex = 0;
  renderCard();
}

function updateProgress() {
  const counters = document.querySelectorAll('.card-counter');
  const text = activeDeck.length ? `${currentIndex + 1} / ${activeDeck.length}` : '';
  counters.forEach(c => {
    c.textContent = text;
    c.style.display = activeDeck.length ? '' : 'none';
  });
}

let controlsTrayOpen = false;
function toggleControlsTray() {
  controlsTrayOpen = !controlsTrayOpen;
  document.getElementById('card-controls').classList.toggle('tray-open', controlsTrayOpen);
  document.getElementById('controls-tray-chevron').blur();
}

function toggleCardList() {
  setListView(!listViewActive);
}

function toggleFlashcardPanel() {
  const panel = document.getElementById('main-content');
  const isOpen = panel.classList.toggle('open');
  const btn = document.getElementById('btn-flashcard');
  if (btn) btn.classList.toggle('active', isOpen);
}

// ══════════════════════════════════════════
