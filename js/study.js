// MASTERY (FSRS scheduling lives in js/fsrs.js)
// ══════════════════════════════════════════
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

  // Store undo snapshot — capture FSRS state and mastery flags so undoMastered can restore.
  lastMasteredCard = { hanzi: card.hanzi, prev: {
    mastered: cd.mastered, masteredDate: cd.masteredDate,
    stability: cd.stability, difficulty: cd.difficulty, lastReview: cd.lastReview,
    due: cd.due, reviewFlag: cd.reviewFlag, lastRating: cd.lastRating,
    correct: cd.correct, wrong: cd.wrong,
  }};

  cd.mastered = true;
  cd.masteredDate = new Date().toISOString();
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
  cardData[hanzi].due = null;
  saveProgress();
  updateReviewBadge();
  renderMasteredList();
  if (listViewActive) renderListView();
}

function getCardData(hanzi) {
  if (!cardData[hanzi]) {
    cardData[hanzi] = {
      correct: 0, wrong: 0, reviewFlag: false,
      stability: null, difficulty: null, lastReview: null,
      due: null, lastRating: null, note: '', mastered: false,
    };
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

// ── Phase 5 — daily session ──
// A "session" is the user's daily study target: today's `newCardsPerDay` new
// cards from the active focus chunk + all FSRS-due reviews from anywhere.
// The session is regenerated on date change; otherwise it persists across
// reloads so completion state survives.
function _focusChunkCards() {
  if (!activeFocusId) return null;
  // Active focus may be an HSK/JLPT chunk name ("hsk 1 · 1/8") cached on
  // the live `decks` map only when the user has opened it. Reconstruct the
  // chunk from raw data if needed so session generation works without prior
  // navigation.
  if (decks[activeFocusId]) return decks[activeFocusId];
  const m = activeFocusId.match(/^(hsk|jlpt) (\d+) · (\d+)\/(\d+)$/);
  if (!m) return null;
  const [, prefix, levelStr, chunkStr] = m;
  const level = parseInt(levelStr, 10);
  const chunkNum = parseInt(chunkStr, 10);
  const data = (prefix === 'hsk' ? HSK_DATA : JLPT_DATA)[level];
  if (!data) return null;
  const sz = getChunkSize(level);
  return data.slice((chunkNum - 1) * sz, chunkNum * sz);
}

function generateTodaySession() {
  const today = new Date().toISOString().slice(0, 10);
  // Reuse existing session if it's for today.
  if (todaySession && todaySession.date === today) return todaySession;

  // New cards: drawn from active focus only (or first unstudied across decks if no focus).
  const newCardIds = [];
  const focusCards = _focusChunkCards();
  const candidatePool = focusCards || (() => {
    // No focus — gather all cards across language's data sources as a fallback.
    const all = [];
    const dataSource = currentLang === 'ja' ? JLPT_DATA : HSK_DATA;
    for (const cards of Object.values(dataSource)) {
      if (cards) all.push(...cards);
    }
    return all;
  })();
  for (const card of candidatePool) {
    const cd = cardData[card.hanzi];
    const isNew = !cd || (cd.stability == null && !cd.mastered);
    if (isNew) newCardIds.push(card.hanzi);
    if (newCardIds.length >= newCardsPerDay) break;
  }

  // Reviews: every card whose FSRS due date is today or earlier, capped at 50.
  const reviewCardIds = getReviewCards().map(c => c.hanzi).slice(0, 50);

  todaySession = { date: today, newCardIds, reviewCardIds, completedIds: [] };
  try { setProfileData('hanzi-today-session', JSON.stringify(todaySession)); } catch (e) {}
  return todaySession;
}

function startTodaySession() {
  const session = generateTodaySession();
  // Build a synthetic deck from the session: new cards first, then reviews.
  const allIds = [...session.newCardIds, ...session.reviewCardIds];
  if (!allIds.length) return;
  const cardObjects = [];
  for (const hanzi of allIds) {
    let cardObj = null;
    const dataSource = currentLang === 'ja' ? JLPT_DATA : HSK_DATA;
    for (const [, cards] of Object.entries(dataSource)) {
      if (!cards) continue;
      const f = cards.find(c => c.hanzi === hanzi);
      if (f) { cardObj = f; break; }
    }
    if (!cardObj) {
      for (const [, cards] of Object.entries(decks)) {
        const f = cards.find(c => c.hanzi === hanzi);
        if (f) { cardObj = f; break; }
      }
    }
    if (cardObj) cardObjects.push(cardObj);
  }
  if (!cardObjects.length) return;
  const sessionName = '☀ today';
  decks[sessionName] = cardObjects;
  selectDeck(sessionName);
  if (window.innerWidth <= 480) closeSidebar();
}

/** Render the welcome-card's session info + CTA based on focus + session state. */
function renderWelcomeCardSession() {
  const info = document.getElementById('welcome-session-info');
  const cta = document.getElementById('welcome-card-cta');
  if (!info || !cta) return;
  if (!activeFocusId) {
    info.innerHTML = '';
    cta.textContent = 'select a deck';
    cta.dataset.action = 'select';
    return;
  }
  const session = generateTodaySession();
  const total = session.newCardIds.length + session.reviewCardIds.length;
  const done = session.completedIds.length;
  const remaining = total - done;
  const focusName = activeFocusId;
  if (total === 0) {
    info.innerHTML = `<div class="focus-name">${focusName}</div><div>nothing due — pick a deck or come back tomorrow</div>`;
    cta.textContent = 'select a deck';
    cta.dataset.action = 'select';
  } else if (remaining === 0) {
    info.innerHTML = `<div class="focus-name">${focusName}</div><div>all done for today — see you tomorrow</div>`;
    cta.textContent = 'review again';
    cta.dataset.action = 'start';
  } else {
    const newRem = Math.max(0, session.newCardIds.length - done);
    const revRem = Math.max(0, total - done - newRem);
    info.innerHTML = `<div class="focus-name">${focusName}</div>` +
      `<div><span class="session-counts">${newRem}</span> new · <span class="session-counts">${revRem}</span> review</div>`;
    cta.textContent = done > 0 ? 'continue session' : 'start session';
    cta.dataset.action = 'start';
  }
}

/** Welcome-card CTA dispatcher — different actions based on render state. */
function onWelcomeCardCta() {
  const cta = document.getElementById('welcome-card-cta');
  const action = cta?.dataset.action || 'select';
  if (action === 'start') {
    startTodaySession();
  } else {
    if (!document.querySelector('.sidebar').classList.contains('open')) document.getElementById('btn-deck').click();
    setTimeout(() => document.getElementById('deck-search-input')?.focus(), 60);
  }
}

/** Render the header's active-focus indicator (Phase 5 Layer D — placeholder for now). */
function renderHeaderFocus() {
  const slot = document.getElementById('header-focus');
  if (!slot) return;
  if (!activeFocusId) {
    slot.innerHTML = '';
    slot.style.display = 'none';
    return;
  }
  const session = generateTodaySession();
  const total = session.newCardIds.length + session.reviewCardIds.length;
  const done = session.completedIds.length;
  slot.style.display = '';
  slot.innerHTML = total
    ? `<span class="header-focus-name">${activeFocusId}</span><span class="header-focus-count">${done}/${total}</span>`
    : `<span class="header-focus-name">${activeFocusId}</span>`;
}

function recordSessionCompletion(hanzi) {
  if (!todaySession) return;
  if (!todaySession.completedIds.includes(hanzi)) {
    todaySession.completedIds.push(hanzi);
    try { setProfileData('hanzi-today-session', JSON.stringify(todaySession)); } catch (e) {}
    if (typeof renderWelcomeCardSession === 'function') renderWelcomeCardSession();
    if (typeof renderHeaderFocus === 'function') renderHeaderFocus();
  }
  // Mastery-gated promotion check fires after every rating.
  checkMasteryPromotion();
}

// ── Phase 5 — mastery-gated promotion ──
function _focusChunkMasteryPct() {
  const cards = _focusChunkCards();
  if (!cards || !cards.length) return 0;
  let mastered = 0;
  for (const c of cards) if (cardData[c.hanzi] && cardData[c.hanzi].mastered) mastered++;
  return mastered / cards.length;
}

/**
 * Find the next chunk after the active focus in its deck's natural order.
 * Returns null if there's no obvious next (custom decks, or last chunk in level).
 */
function _findNextChunk() {
  if (!activeFocusId) return null;
  const m = activeFocusId.match(/^(hsk|jlpt) (\d+) · (\d+)\/(\d+)$/);
  if (!m) return null;
  const [, prefix, levelStr, chunkStr, totalStr] = m;
  const chunkNum = parseInt(chunkStr, 10);
  const total = parseInt(totalStr, 10);
  const level = parseInt(levelStr, 10);
  if (chunkNum < total) {
    return `${prefix} ${level} · ${chunkNum + 1}/${total}`;
  }
  // Fallthrough: roll over to next level if available.
  const levels = lang().levels;
  const idx = levels.indexOf(level);
  if (idx >= 0 && idx < levels.length - 1) {
    const nextLevel = levels[idx + 1];
    const data = (prefix === 'hsk' ? HSK_DATA : JLPT_DATA)[nextLevel];
    if (data) {
      const sz = getChunkSize(nextLevel);
      const nextTotal = Math.ceil(data.length / sz);
      return `${prefix} ${nextLevel} · 1/${nextTotal}`;
    }
  }
  return null;
}

let _promotionShownFor = null; // suppresses repeats until activeFocus changes
function checkMasteryPromotion() {
  if (!activeFocusId) return;
  if (dismissedPromotions.includes(activeFocusId)) return;
  if (_promotionShownFor === activeFocusId) return;
  const pct = _focusChunkMasteryPct();
  if (pct < masteryPromotionThreshold) return;
  const next = _findNextChunk();
  if (!next) return;
  _promotionShownFor = activeFocusId;
  showPromotionBanner(next);
}

function showPromotionBanner(nextChunkId) {
  // Re-use existing banner if visible.
  let banner = document.getElementById('promotion-banner');
  if (banner) banner.remove();
  banner = document.createElement('div');
  banner.id = 'promotion-banner';
  banner.className = 'promotion-banner';
  const pct = Math.round(_focusChunkMasteryPct() * 100);
  banner.innerHTML = `
    <div class="promotion-text">
      <span class="promotion-title">${pct}% mastered</span>
      <span class="promotion-sub">move on to <strong>${nextChunkId}</strong>?</span>
    </div>
    <div class="promotion-actions">
      <button class="btn btn-sm" onclick="postponePromotion()">later</button>
      <button class="btn btn-sm" onclick="dismissPromotion()">dismiss</button>
      <button class="btn btn-sm btn-accent" onclick="acceptPromotion('${nextChunkId.replace(/'/g, "\\'")}')">move</button>
    </div>
  `;
  document.body.appendChild(banner);
}

function _hidePromotionBanner() {
  document.getElementById('promotion-banner')?.remove();
}
function postponePromotion() { _hidePromotionBanner(); /* re-shown on next session */ }
function dismissPromotion() {
  if (activeFocusId && !dismissedPromotions.includes(activeFocusId)) {
    dismissedPromotions.push(activeFocusId);
    try { setProfileData('hanzi-dismissed-promotions', JSON.stringify(dismissedPromotions)); } catch (e) {}
  }
  _hidePromotionBanner();
}
function acceptPromotion(nextId) {
  setActiveFocus(nextId);
  _promotionShownFor = null;
  _hidePromotionBanner();
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
  // Update card mode buttons (one per face)
  document.querySelectorAll('.card-mode-btn').forEach(btn => {
    btn.textContent = mode === 'test' ? 'study' : 'test';
    btn.classList.toggle('active', mode === 'test');
  });
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
