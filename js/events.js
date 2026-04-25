// CONTEXT STRIP
// ══════════════════════════════════════════
function renderContextStrip() {
  const strip = document.getElementById('context-strip');
  const isVisible = currentMode === 'study' && activeDeck.length > 0 && showContextStrip;
  strip.classList.toggle('active', isVisible);
  if (!isVisible) { strip.innerHTML = ''; return; }

  const HALF = 6;
  const total = activeDeck.length;
  const strip_size = Math.min(HALF * 2 + 1, total);
  const indices = [];

  if (total <= HALF * 2 + 1) {
    for (let i = 0; i < total; i++) indices.push(i);
  } else {
    for (let offset = -HALF; offset <= HALF; offset++) {
      indices.push((currentIndex + offset + total) % total);
    }
  }

  strip.innerHTML = '';
  let activeTile = null;
  for (const idx of indices) {
    const card = activeDeck[idx];
    const cd = cardData[card.hanzi] || {};
    const isCurrent = idx === currentIndex;
    const tile = document.createElement('button');
    tile.className = 'ctx-tile' + (isCurrent ? ' ctx-current' : '') + (cd.mastered ? ' ctx-mastered' : '');
    tile.innerHTML = `<span class="ctx-hanzi">${card.hanzi}</span>`;
    tile.dataset.tip = `${card.pinyin} — ${card.english}`;
    tile.onclick = () => { currentIndex = idx; renderCard(); };
    strip.appendChild(tile);
    if (isCurrent) activeTile = tile;
  }
  // Scroll active tile to horizontal center.
  // We add padding = stripWidth/2 on each side so the first and last tiles
  // can always be scrolled to center (tiles alone are narrower than the strip).
  if (activeTile) {
    requestAnimationFrame(() => {
      activeTile.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    });
  }
}

function setListView(active) {
  listViewActive = active;
  document.getElementById('list-view').classList.toggle('active', active);
  const btn = document.getElementById('btn-card-list');
  btn.classList.toggle('active', active);
  btn.blur();
  if (active) renderListView();
  // Side scrollbar — show only when list view is active
  const sb = document.getElementById('card-side-scrollbar');
  if (sb) sb.hidden = !active;
  if (active) requestAnimationFrame(updateCardSideScrollbar);
}

/** Sync the custom side scrollbar's thumb size + position to the list-scroll. */
function updateCardSideScrollbar() {
  const ls = document.querySelector('#list-view .list-scroll');
  const sb = document.getElementById('card-side-scrollbar');
  const thumb = document.getElementById('card-side-scrollbar-thumb');
  if (!ls || !sb || !thumb) return;
  const ratio = ls.clientHeight / ls.scrollHeight;
  if (ratio >= 1 || !listViewActive) {
    sb.hidden = true;
    return;
  }
  sb.hidden = false;
  const trackH = sb.clientHeight;
  const thumbH = Math.max(24, trackH * ratio);
  const maxScroll = ls.scrollHeight - ls.clientHeight;
  const scrollProgress = maxScroll > 0 ? ls.scrollTop / maxScroll : 0;
  const thumbTop = (trackH - thumbH) * scrollProgress;
  thumb.style.height = thumbH + 'px';
  thumb.style.transform = `translateY(${thumbTop}px)`;
}

function renderListView() {
  const today = new Date().toISOString().slice(0, 10);
  const el = document.getElementById('list-view');
  el.innerHTML = '';
  const scroll = document.createElement('div');
  scroll.className = 'list-scroll';
  scroll.addEventListener('scroll', updateCardSideScrollbar, { passive: true });
  el.appendChild(scroll);
  let activeRow = null;
  activeDeck.forEach((card, i) => {
    const cd = cardData[card.hanzi] || {};
    const isDue = cd.reviewFlag || (cd.mastered && cd.due && cd.due <= today);
    const row = document.createElement('div');
    row.className = 'list-row' + (i === currentIndex ? ' active-row' : '');
    row.innerHTML = `
      <span class="list-hanzi">${card.hanzi}</span>
      <span class="list-pinyin">${card.pinyin}</span>
      <span class="list-english">${card.english}</span>
      <span class="list-badges">
        ${cd.mastered ? '<span class="list-mastered" title="hidden"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 13.5l11-11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>' : ''}
        ${isDue ? '<span class="list-review-badge">⟳</span>' : ''}
      </span>`;
    row.onclick = () => {
      currentIndex = i;
      setListView(false);
      renderCard();
    };
    scroll.appendChild(row);
    if (i === currentIndex) activeRow = row;
  });

  // Single bottom-region blur — extends from the very bottom past the pill,
  // covering the pill's side buffers and the fade-up region above the pill.
  const fade = document.createElement('div');
  fade.className = 'list-search-fade';
  el.appendChild(fade);

  // Search results container (shown when query is non-empty; hides .list-scroll)
  const sr = document.createElement('div');
  sr.className = 'search-results list-search-results';
  sr.id = 'card-list-search-results';
  el.appendChild(sr);

  // Search input pinned at the bottom of the overlay
  const searchPill = document.createElement('div');
  searchPill.className = 'search-pill list-search';
  searchPill.innerHTML = `
    <div class="search-bar">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <input class="search-input" id="card-list-search-input" type="text" placeholder="search this deck and others…" autocomplete="off">
    </div>`;
  el.appendChild(searchPill);

  if (activeRow) requestAnimationFrame(() => activeRow.scrollIntoView({ block: 'center' }));
}

// ══════════════════════════════════════════

// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════
document.addEventListener('keydown', e => {
  // Don't intercept when typing in inputs (the per-input Escape handlers in search.js handle clearing)
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return;
  }

  // `/` and Cmd+K (Ctrl+K on non-Mac) → open the deck panel and focus its search input.
  if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
    e.preventDefault();
    if (!document.querySelector('.sidebar').classList.contains('open')) {
      document.getElementById('btn-deck').click();
    }
    setTimeout(() => document.getElementById('deck-search-input')?.focus(), 50);
    return;
  }

  if (currentMode === 'study') {
    if (e.key === ' ') { e.preventDefault(); if (listViewActive) setListView(false); else flipCard(); }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && (e.altKey || e.metaKey || e.ctrlKey)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); nextCard(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevCard(); }
  }

  if (currentMode === 'test') {
    if (e.key === ' ' && document.getElementById('next-test-btn').style.display !== 'none') {
      e.preventDefault();
      nextTestCard();
    }
  }

  if (e.key === 'Escape') {
    // Close topmost overlay first, in priority order
    const tutorOverlay = document.getElementById('tutor-overlay');
    if (tutorOverlay && tutorOverlay.classList.contains('open')) { closeTutorOverlay(); return; }
    const fullSettings = document.getElementById('full-settings-modal');
    if (fullSettings && fullSettings.classList.contains('open')) { closeFullSettings(); return; }
    const profilePicker = document.getElementById('profile-picker-overlay');
    if (profilePicker && profilePicker.classList.contains('open')) { closeProfilePicker(); return; }
    const settingsOverlay = document.getElementById('settings-overlay');
    if (settingsOverlay && settingsOverlay.classList.contains('open')) { closeSettings(); return; }
    const masteredModal = document.getElementById('mastered-list-modal');
    if (masteredModal && masteredModal.classList.contains('open')) { toggleMasteredList(); return; }
    if (sidebarOpen) { closeSidebar(); return; }
    if (infoPanelOpen) { toggleInfoPanel(); return; }
  }
});

// Close search results on click outside
document.addEventListener('click', e => {
  const wrap = document.getElementById('header-search-wrap');
  if (!wrap.contains(e.target)) {
    document.getElementById('search-results').style.display = 'none';
    searchSelectedIdx = -1;
    // Close the pill if click outside and results are empty
    if (document.getElementById('search-input').value === '') {
      closeSearch();
    }
  }
});

// ══════════════════════════════════════════
// HEADER BUTTON: info — single-click toggle, double-click fullscreen
// ══════════════════════════════════════════
(function() {
  const btn = document.getElementById('btn-info');
  if (!btn) return;
  let clickTimer = null;
  btn.addEventListener('click', e => {
    if (clickTimer) {
      // Second click within 300ms → treat as dblclick
      clearTimeout(clickTimer);
      clickTimer = null;
      if (!infoPanelOpen) toggleInfoPanel();
      wsToggleFullscreen('info');
    } else {
      clickTimer = setTimeout(() => {
        clickTimer = null;
        toggleInfoPanel();
      }, 250);
    }
  });
})();

// ══════════════════════════════════════════
// SWIPE GESTURES (mobile)
// ══════════════════════════════════════════
(function initSwipe() {
  let touchStartX = 0, touchStartY = 0;
  const main = document.getElementById('main-content');

  main.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  main.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return; // too short or vertical

    if (currentMode === 'study') {
      if (dx < -50) nextCard();
      if (dx > 50) prevCard();
    }
  }, { passive: true });
})();

// ══════════════════════════════════════════
// LANGUAGE SWITCHING
// ══════════════════════════════════════════
function applyLangUI() {
  const cfg = lang();
  // Header + page title
  document.querySelector('.header-title').textContent = cfg.headerTitle;
  document.title = cfg.pageTitle;
  // Welcome card greeting (empty-state placeholder)
  const wg = document.getElementById('welcome-greeting');
  if (wg) wg.textContent = cfg.welcomeGreeting;
  document.body.classList.toggle('ja-mode', currentLang === 'ja');
  // Search placeholders (deck panel + card list)
  const dsi = document.getElementById('deck-search-input');
  if (dsi) dsi.placeholder = cfg.searchPlaceholder;
  const cli = document.getElementById('card-list-search-input');
  if (cli) cli.placeholder = cfg.searchPlaceholder;
  // "Show pinyin/romaji" labels
  ['show-reading-label', 'fs-show-reading-label'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = cfg.showReadingLabel;
  });
  // Language pill active state
  document.getElementById('lang-zh').classList.toggle('active', currentLang === 'zh');
  document.getElementById('lang-ja').classList.toggle('active', currentLang === 'ja');
  // Noto Sans JP — load on first Japanese switch
  if (currentLang === 'ja' && !document.getElementById('font-jp')) {
    const link = document.createElement('link');
    link.id = 'font-jp';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
  }
}

function switchLanguage(langId) {
  if (currentLang === langId) return;
  currentLang = langId;
  localStorage.setItem('app-lang', langId);

  // Clear active deck
  activeDeckName = null;
  activeDeck = [];
  currentIndex = 0;
  Object.keys(decks).forEach(k => {
    if (k.match(/^hsk \d/) || k.match(/^jlpt \d/)) delete decks[k];
  });

  // Reload progress for new language
  cardData = {};
  loadProgress();
  loadTutorHistory();

  applyLangUI();
  renderSidebar();
  buildSearchIndex();

  // Reset card display to empty state
  document.getElementById('empty-view').style.display = '';
  document.getElementById('study-view').classList.remove('active');
  document.getElementById('card-controls').classList.remove('active');
  document.body.classList.remove('deck-active');
  if (infoPanelOpen) {
    document.getElementById('info-panel-scroll').innerHTML = '';
  }
}

// ══════════════════════════════════════════
