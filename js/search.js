// SEARCH INDEX
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

function navigateToSearchResult(card, deckName) {
  closeSearch();

  if (deckName === 'CEDICT') {
    // CEDICT-only result: just show in info panel, don't navigate to deck
    if (!infoPanelOpen) toggleInfoPanel();
    renderInfoPanel(card);
    return;
  }

  // Level deck names: "HSK 1" or "JLPT N5"
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

  // Jump to the specific card
  const idx = activeDeck.findIndex(c => c.hanzi === card.hanzi);
  if (idx >= 0) { currentIndex = idx; renderCard(); }

  if (window.innerWidth <= 480) closeSidebar();
}

// ══════════════════════════════════════════

// SEARCH
// ══════════════════════════════════════════
document.getElementById('search-input').addEventListener('input', function () {
  const q = this.value.trim();
  const results = document.getElementById('search-results');
  searchSelectedIdx = -1;
  if (!q) { results.style.display = 'none'; return; }
  const qNorm = normalizePinyin(q.toLowerCase());

  // Search deck cards
  const deckMatches = searchIndex.filter(({ card }) =>
    card.hanzi.includes(q) ||
    normalizePinyin(card.pinyin).includes(qNorm) ||
    card.english.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);

  // Search dictionary for additional results (CEDICT for Chinese, ENRICHED_JP for Japanese)
  const deckHanzi = new Set(deckMatches.map(m => m.card.hanzi));
  const cedictMatches = [];
  if (currentLang === 'ja') {
    for (const [hanzi, entry] of Object.entries(JP_DICT)) {
      if (deckHanzi.has(hanzi)) continue;
      const defs = entry.defs ? entry.defs.join(' / ') : '';
      const pin = entry.romaji || '';
      if (hanzi.includes(q) ||
          (entry.kana || '').includes(q) ||
          pin.toLowerCase().includes(q.toLowerCase()) ||
          defs.toLowerCase().includes(q.toLowerCase())) {
        cedictMatches.push({ card: { hanzi, pinyin: pin, english: defs, kana: entry.kana }, deckName: 'CEDICT' });
        if (cedictMatches.length >= 6) break;
      }
    }
  } else {
    for (const [hanzi, entry] of Object.entries(CEDICT)) {
      if (deckHanzi.has(hanzi)) continue; // already in deck results
      const defs = entry.defs ? entry.defs.join(' ') : '';
      const pin = entry.pinyin || '';
      if (hanzi.includes(q) ||
          normalizePinyin(pin).includes(qNorm) ||
          defs.toLowerCase().includes(q.toLowerCase())) {
        cedictMatches.push({ card: { hanzi, pinyin: pin, english: defs }, deckName: 'CEDICT' });
        if (cedictMatches.length >= 6) break;
      }
    }
  }

  const allMatches = [...deckMatches, ...cedictMatches];
  if (!allMatches.length) { results.style.display = 'none'; return; }
  results.innerHTML = '';
  allMatches.forEach(({ card, deckName }) => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    const deckLabel = deckName === 'CEDICT' ? (currentLang === 'ja' ? '辞書' : '词典') : deckName;
    item.innerHTML = `<span class="search-result-hanzi">${card.hanzi}</span>
      <span class="search-result-text">
        <div class="search-result-pinyin">${card.pinyin}</div>
        <div class="search-result-english">${card.english}</div>
      </span>
      <span class="search-result-deck">${deckLabel}</span>`;
    item.onclick = () => navigateToSearchResult(card, deckName);
    results.appendChild(item);
  });
  results.style.display = 'block';
});

let searchSelectedIdx = -1;
document.getElementById('search-input').addEventListener('keydown', function (e) {
  const results = document.getElementById('search-results');
  if (results.style.display === 'none' || !results.children.length) return;
  const items = results.querySelectorAll('.search-result-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    searchSelectedIdx = Math.min(searchSelectedIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    searchSelectedIdx = Math.max(searchSelectedIdx - 1, -1);
  } else if (e.key === 'Enter' && searchSelectedIdx >= 0) {
    e.preventDefault();
    items[searchSelectedIdx].click();
    searchSelectedIdx = -1;
    return;
  } else {
    return;
  }
  items.forEach((item, i) => item.classList.toggle('selected', i === searchSelectedIdx));
  if (searchSelectedIdx >= 0) items[searchSelectedIdx].scrollIntoView({ block: 'nearest' });
});


// ══════════════════════════════════════════

// SEARCH BAR TOGGLE
// ══════════════════════════════════════════
function toggleSearchBar() {
  const bar = document.getElementById('search-bar');
  const btn = document.getElementById('btn-search');
  const isOpen = bar.classList.contains('open');
  if (isOpen) {
    closeSearchBar();
  } else {
    bar.classList.add('open');
    btn.style.display = 'none';
    setTimeout(() => document.getElementById('search-input').focus(), 100);
  }
}
function closeSearchBar() {
  const bar = document.getElementById('search-bar');
  bar.classList.remove('open');
  document.getElementById('btn-search').style.display = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').style.display = 'none';
}
// Close search when clicking outside
document.addEventListener('mousedown', e => {
  const wrap = document.querySelector('.search-btn-wrap');
  const bar = document.getElementById('search-bar');
  if (bar.classList.contains('open') && !wrap.contains(e.target)) {
    closeSearchBar();
  }
});

// ══════════════════════════════════════════
