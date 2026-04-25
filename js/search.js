// SEARCH INDEX + RESULT NAVIGATION
// ══════════════════════════════════════════
function normalizePinyin(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function buildSearchIndex() {
  searchIndex = [];
  if (currentLang === 'ja') {
    for (const [level, cards] of Object.entries(JLPT_DATA)) {
      if (cards) cards.forEach(c => searchIndex.push({ card: c, deckName: 'JLPT N' + level }));
    }
  } else {
    for (const [level, cards] of Object.entries(HSK_DATA)) {
      if (cards) cards.forEach(c => searchIndex.push({ card: c, deckName: 'HSK ' + level }));
    }
  }
  for (const [name, cards] of Object.entries(decks)) {
    if (name !== '⟳ review') cards.forEach(c => searchIndex.push({ card: c, deckName: name }));
  }
}

// ── Card-level matching ─────────────────────────────────────────────────────
/**
 * Match cards in `searchIndex` against `q`. Returns up to `limit` results.
 * `excludeHanzi` filters out cards already shown elsewhere (e.g., current-deck matches).
 */
function _searchCards(q, limit = 8, excludeHanzi = null) {
  const qLower = q.toLowerCase();
  const qNorm = normalizePinyin(qLower);
  const out = [];
  for (const entry of searchIndex) {
    if (excludeHanzi && excludeHanzi.has(entry.card.hanzi)) continue;
    const c = entry.card;
    if (c.hanzi.includes(q) ||
        normalizePinyin(c.pinyin).includes(qNorm) ||
        c.english.toLowerCase().includes(qLower)) {
      out.push(entry);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Match dictionary entries (CEDICT or JP_DICT) for the current language. */
function _searchDictionary(q, limit = 6, excludeHanzi = null) {
  const qLower = q.toLowerCase();
  const qNorm = normalizePinyin(qLower);
  const out = [];
  if (currentLang === 'ja') {
    for (const [hanzi, entry] of Object.entries(JP_DICT)) {
      if (excludeHanzi && excludeHanzi.has(hanzi)) continue;
      const defs = entry.defs ? entry.defs.join(' / ') : '';
      const pin = entry.romaji || '';
      if (hanzi.includes(q) ||
          (entry.kana || '').includes(q) ||
          pin.toLowerCase().includes(qLower) ||
          defs.toLowerCase().includes(qLower)) {
        out.push({ card: { hanzi, pinyin: pin, english: defs, kana: entry.kana }, deckName: 'CEDICT' });
        if (out.length >= limit) break;
      }
    }
  } else {
    for (const [hanzi, entry] of Object.entries(CEDICT)) {
      if (excludeHanzi && excludeHanzi.has(hanzi)) continue;
      const defs = entry.defs ? entry.defs.join(' ') : '';
      const pin = entry.pinyin || '';
      if (hanzi.includes(q) ||
          normalizePinyin(pin).includes(qNorm) ||
          defs.toLowerCase().includes(qLower)) {
        out.push({ card: { hanzi, pinyin: pin, english: defs }, deckName: 'CEDICT' });
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}

// ── Result row HTML helper ─────────────────────────────────────────────────
function _resultRowHTML(card, deckName) {
  const deckLabel = deckName === 'CEDICT' ? (currentLang === 'ja' ? '辞書' : '词典') : deckName;
  return `<span class="search-result-hanzi">${card.hanzi}</span>
    <span class="search-result-text">
      <div class="search-result-pinyin">${card.pinyin}</div>
      <div class="search-result-english">${card.english}</div>
    </span>
    <span class="search-result-deck">${deckLabel}</span>`;
}

// ── Deck-panel search (hierarchical: decks + chunks + cards) ───────────────
function runDeckPanelSearch() {
  const input = document.getElementById('deck-search-input');
  const results = document.getElementById('deck-search-results');
  if (!input || !results) return;
  const q = input.value.trim();
  results.innerHTML = '';
  if (!q) { results.style.display = 'none'; return; }

  // Decks: exact / prefix / substring on name
  const qLower = q.toLowerCase();
  const deckMatches = Object.keys(decks)
    .filter(n => n !== '⟳ review' && n.toLowerCase().includes(qLower))
    .slice(0, 4);

  // Cards (deck index + dictionary)
  const cardMatches = _searchCards(q, 8);
  const seen = new Set(cardMatches.map(m => m.card.hanzi));
  const dictMatches = _searchDictionary(q, 4, seen);

  if (!deckMatches.length && !cardMatches.length && !dictMatches.length) {
    results.innerHTML = '<div class="search-empty">no matches</div>';
    results.style.display = 'block';
    return;
  }

  if (deckMatches.length) {
    const hdr = document.createElement('div');
    hdr.className = 'search-result-group';
    hdr.textContent = 'decks';
    results.appendChild(hdr);
    deckMatches.forEach(name => {
      const item = document.createElement('div');
      item.className = 'search-result-item search-deck-row';
      item.textContent = name;
      item.onclick = () => {
        if (decks[name]) selectDeck(name);
        _closeDeckSearch();
      };
      results.appendChild(item);
    });
  }
  const allCards = [...cardMatches, ...dictMatches];
  if (allCards.length) {
    const hdr = document.createElement('div');
    hdr.className = 'search-result-group';
    hdr.textContent = 'cards';
    results.appendChild(hdr);
    allCards.forEach(({ card, deckName }) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = _resultRowHTML(card, deckName);
      item.onclick = () => { navigateToSearchResult(card, deckName); _closeDeckSearch(); };
      results.appendChild(item);
    });
  }
  results.style.display = 'block';
}

function _closeDeckSearch() {
  const input = document.getElementById('deck-search-input');
  const results = document.getElementById('deck-search-results');
  if (input) input.value = '';
  if (results) { results.innerHTML = ''; results.style.display = 'none'; }
}

// ── Card-list overlay search (current-deck above, cross-deck below) ────────
function runCardListSearch() {
  const input = document.getElementById('card-list-search-input');
  const results = document.getElementById('card-list-search-results');
  const scroll = document.querySelector('#list-view .list-scroll');
  if (!input || !results) return;
  const q = input.value.trim();
  results.innerHTML = '';
  if (!q) {
    results.style.display = 'none';
    if (scroll) scroll.style.display = '';
    return;
  }
  if (scroll) scroll.style.display = 'none';

  const qLower = q.toLowerCase();
  const qNorm = normalizePinyin(qLower);
  const currentMatches = activeDeck.filter(c =>
    c.hanzi.includes(q) ||
    normalizePinyin(c.pinyin).includes(qNorm) ||
    c.english.toLowerCase().includes(qLower)
  ).slice(0, 12);
  const seen = new Set(currentMatches.map(c => c.hanzi));
  const otherMatches = _searchCards(q, 8, seen).filter(m => m.deckName !== activeDeckName);

  if (!currentMatches.length && !otherMatches.length) {
    results.innerHTML = '<div class="search-empty">no matches</div>';
    results.style.display = 'block';
    return;
  }

  if (currentMatches.length) {
    const hdr = document.createElement('div');
    hdr.className = 'search-result-group';
    hdr.textContent = 'in this deck';
    results.appendChild(hdr);
    currentMatches.forEach(card => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = _resultRowHTML(card, activeDeckName || '');
      item.onclick = () => {
        const idx = activeDeck.findIndex(c => c.hanzi === card.hanzi);
        if (idx >= 0) { currentIndex = idx; renderCard(); }
        setListView(false);
      };
      results.appendChild(item);
    });
  }
  if (otherMatches.length) {
    const hdr = document.createElement('div');
    hdr.className = 'search-result-group';
    hdr.textContent = 'from other decks';
    results.appendChild(hdr);
    otherMatches.forEach(({ card, deckName }) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = _resultRowHTML(card, deckName);
      item.onclick = () => { navigateToSearchResult(card, deckName); setListView(false); };
      results.appendChild(item);
    });
  }
  results.style.display = 'block';
}

// ── Navigation from search results ─────────────────────────────────────────
function navigateToSearchResult(card, deckName) {
  if (deckName === 'CEDICT') {
    if (!infoPanelOpen) toggleInfoPanel();
    renderInfoPanel(card);
    return;
  }
  const hskMatch = deckName.match(/^HSK (\d+)$/);
  const jlptMatch = deckName.match(/^JLPT N(\d+)$/);
  const levelMatch = hskMatch || jlptMatch;
  if (levelMatch) {
    const level = parseInt(levelMatch[1]);
    const data = hskMatch ? HSK_DATA[level] : JLPT_DATA[level];
    const deckPrefix = hskMatch ? 'hsk' : 'jlpt';
    if (!data) return;
    const sz = getChunkSize(level);
    const totalChunks = Math.ceil(data.length / sz);
    const cardPos = data.findIndex(c => c.hanzi === card.hanzi);
    if (cardPos < 0) return;
    const chunkIdx = Math.floor(cardPos / sz);
    const chunkNum = chunkIdx + 1;
    const name = `${deckPrefix} ${level} · ${chunkNum}/${totalChunks}`;
    decks[name] = data.slice(chunkIdx * sz, (chunkIdx + 1) * sz);
    selectDeck(name);
  } else {
    if (!decks[deckName]) return;
    selectDeck(deckName);
  }
  const idx = activeDeck.findIndex(c => c.hanzi === card.hanzi);
  if (idx >= 0) { currentIndex = idx; renderCard(); }
  if (window.innerWidth <= 480) closeSidebar();
}

// ── Wiring ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const di = document.getElementById('deck-search-input');
  if (di) {
    di.addEventListener('input', runDeckPanelSearch);
    di.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (di.value) { di.value = ''; runDeckPanelSearch(); }
        else { di.blur(); }
      }
    });
  }
  // Card-list input is rendered dynamically inside renderListView, so we delegate.
  document.addEventListener('input', e => {
    if (e.target.id === 'card-list-search-input') runCardListSearch();
  });
  document.addEventListener('keydown', e => {
    if (e.target.id === 'card-list-search-input' && e.key === 'Escape') {
      if (e.target.value) { e.target.value = ''; runCardListSearch(); }
      else { e.target.blur(); }
    }
  });
});
