// SIDEBAR
// ══════════════════════════════════════════
// Sidebar is either open (visible) or closed (hidden). No collapsed strip.
// Toggled via the deck button in the header.

// ── Favorites ──
let favorites = { levels: [], chunks: {} };

function loadFavorites() {
  try {
    const raw = getProfileData('hanzi-favorites');
    if (raw) favorites = JSON.parse(raw);
  } catch(e) {}
  if (!favorites.levels) favorites.levels = [];
  if (!favorites.chunks) favorites.chunks = {};
}

function saveFavorites() {
  try { setProfileData('hanzi-favorites', JSON.stringify(favorites)); } catch(e) {}
}

function toggleLevelFavorite(level) {
  const idx = favorites.levels.indexOf(level);
  if (idx >= 0) favorites.levels.splice(idx, 1);
  else favorites.levels.push(level);
  saveFavorites();
  renderSidebar();
}

function toggleChunkFavorite(levelKey, chunkNum) {
  if (!favorites.chunks[levelKey]) favorites.chunks[levelKey] = [];
  const arr = favorites.chunks[levelKey];
  const idx = arr.indexOf(chunkNum);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(chunkNum);
  if (arr.length === 0) delete favorites.chunks[levelKey];
  saveFavorites();
  renderSidebar();
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open', sidebarOpen);
  document.getElementById('btn-deck').classList.toggle('active', sidebarOpen);
  // Mobile backdrop
  if (window.innerWidth <= 480) {
    document.getElementById('sidebar-backdrop').classList.toggle('visible', sidebarOpen);
  }
}

function closeSidebar() {
  sidebarOpen = false;
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.remove('open');
  document.getElementById('new-deck-panel').classList.remove('open');
  const deckBtn = document.getElementById('btn-deck');
  if (deckBtn) deckBtn.classList.remove('active');
  document.getElementById('sidebar-backdrop').classList.remove('visible');
}

// Click outside sidebar to close it
document.addEventListener('mousedown', function(e) {
  if (!sidebarOpen) return;
  const sidebar = document.getElementById('sidebar');
  const deckBtn = document.getElementById('btn-deck');
  const ctxMenu = document.getElementById('chunk-ctx-menu');
  if (!sidebar.contains(e.target) && (!deckBtn || !deckBtn.contains(e.target))
      && (!ctxMenu || !ctxMenu.contains(e.target))) {
    closeSidebar();
  }
});

function getChunkSize(level) {
  return currentLang === 'ja' ? (jlptChunkSize[level] || 20) : (hskChunkSize[level] || 20);
}

function renderSidebar() {
  const list = document.getElementById('hsk-list');
  list.innerHTML = '';

  const isJapanese = currentLang === 'ja';
  const dataSource = isJapanese ? JLPT_DATA : HSK_DATA;
  const openState  = isJapanese ? jlptOpen   : hskOpen;
  const chunkSizes = isJapanese ? jlptChunkSize : hskChunkSize;
  const levels     = lang().levels;
  const prefix     = lang().levelPrefix;   // 'HSK ' or 'JLPT N'
  const deckPrefix = isJapanese ? 'jlpt' : 'hsk';

  // Sort levels: favorited first, then original order
  const sortedLevels = [...levels].sort((a, b) => {
    const aFav = favorites.levels.includes(a);
    const bFav = favorites.levels.includes(b);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  for (const level of sortedLevels) {
    const data = dataSource[level];
    const loaded = !!data;
    const isOpen = openState[level];
    const count = loaded ? data.length : null;
    const isLevelFav = favorites.levels.includes(level);

    const wrapper = document.createElement('div');
    wrapper.className = 'hsk-level' + (isOpen ? ' open' : '');

    // Header
    const header = document.createElement('div');
    header.className = 'hsk-level-header';
    header.innerHTML = `
      <span class="deck-name">${isLevelFav ? '<span class="fav-star">★</span> ' : ''}${prefix}${level}</span>
      <span style="display:flex;align-items:center;gap:8px">
        ${count !== null ? `<span class="count">${count}</span>` : '<span class="count" style="font-style:italic">loading…</span>'}
        <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    `;
    header.onclick = () => {
      openState[level] = !openState[level];
      renderSidebar();
    };
    // Right-click on level header
    header.oncontextmenu = (e) => {
      e.preventDefault();
      _showLevelContextMenu(e, level, isJapanese);
    };
    wrapper.appendChild(header);

    if (loaded && isOpen) {
      const sz = chunkSizes[level] || 20;
      const totalChunks = Math.ceil(data.length / sz);
      const levelKey = `${deckPrefix}${level}`;
      const favChunks = favorites.chunks[levelKey] || [];

      // Build chunk list, then sort favorited to top
      const chunkList = [];
      for (let i = 0; i < data.length; i += sz) {
        const chunkNum = Math.floor(i / sz) + 1;
        chunkList.push({ chunkNum, start: i, end: i + sz });
      }
      chunkList.sort((a, b) => {
        const aFav = favChunks.includes(a.chunkNum);
        const bFav = favChunks.includes(b.chunkNum);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
      });

      for (const { chunkNum, start, end } of chunkList) {
        const name = `${deckPrefix} ${level} · ${chunkNum}/${totalChunks}`;
        const cards = data.slice(start, end);
        const isChunkFav = favChunks.includes(chunkNum);

        // Calculate mastery %
        let mastered = 0;
        for (const c of cards) {
          const cd = cardData[c.hanzi];
          if (cd && cd.mastered) mastered++;
        }
        const pct = Math.round((mastered / cards.length) * 100);

        const item = document.createElement('div');
        item.className = 'chunk-item' + (name === activeDeckName ? ' active' : '');
        item.innerHTML = `
          ${isChunkFav ? '<span class="fav-star">★</span>' : ''}
          <span>${chunkNum}/${totalChunks}</span>
          <span class="chunk-count">${cards.length}</span>
          <div class="chunk-progress"><div class="chunk-progress-fill" style="width:${pct}%"></div></div>
        `;
        item.onclick = () => {
          decks[name] = cards;
          selectDeck(name);
          if (window.innerWidth <= 480) closeSidebar();
        };
        // Right-click context menu
        item.oncontextmenu = (e) => {
          e.preventDefault();
          _showChunkContextMenu(e, level, chunkNum, levelKey, isJapanese);
        };
        wrapper.appendChild(item);
      }
    }

    list.appendChild(wrapper);
  }

  // Custom decks
  const customList = document.getElementById('custom-deck-list');
  customList.innerHTML = '';
  const custom = Object.entries(decks).filter(([k]) => !k.match(/^hsk \d/) && !k.match(/^jlpt \d/) && k !== '⟳ review');
  document.getElementById('custom-decks-header').style.display = custom.length > 0 ? '' : 'none';

  custom.forEach(([name, cards]) => {
    const item = document.createElement('div');
    item.className = 'deck-item' + (name === activeDeckName ? ' active' : '');
    const tag = name.startsWith('📁') ? 'csv' : 'ai';
    item.innerHTML = `
      <span class="deck-name">${name}</span>
      <span class="deck-tag ${tag}">${tag}</span>
    `;
    item.onclick = () => {
      selectDeck(name);
      if (window.innerWidth <= 480) closeSidebar();
    };
    item.ondblclick = (e) => {
      e.stopPropagation();
      startRenameDeck(item, name, cards);
    };
    customList.appendChild(item);
  });

  updateReviewBadge();
}

function toggleNewDeck() {
  // If sidebar is closed, open it first
  if (!sidebarOpen) toggleSidebar();
  const panel = document.getElementById('new-deck-panel');
  const btn = document.getElementById('new-deck-btn');
  panel.classList.toggle('open');
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2.5 4L5.5 7.5L8.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  } else {
    updateNewDeckBtn();
  }
}
function updateNewDeckBtn() {
  const btn = document.getElementById('new-deck-btn');
  if (btn) {
    btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> new deck';
  }
}

// ── Context menus ──
function _showCtxMenu(e, html) {
  const old = document.getElementById('chunk-ctx-menu');
  if (old) old.remove();
  const menu = document.createElement('div');
  menu.id = 'chunk-ctx-menu';
  menu.className = 'ctx-menu';
  menu.innerHTML = html;
  menu.style.position = 'fixed';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.style.zIndex = '300';
  document.body.appendChild(menu);
  setTimeout(() => {
    const close = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('mousedown', close);
      }
    };
    document.addEventListener('mousedown', close);
  }, 10);
}

function _setChunkSize(level, size, isJapanese) {
  const sizes = isJapanese ? jlptChunkSize : hskChunkSize;
  const prefix = isJapanese ? 'jlpt' : 'hsk';
  const levelKey = `${prefix}${level}`;
  sizes[level] = size;
  // Clear chunk favorites for this level — chunk numbers no longer match
  if (favorites.chunks[levelKey] && favorites.chunks[levelKey].length) {
    delete favorites.chunks[levelKey];
    saveFavorites();
    showToast('Chunk favorites cleared — chunk boundaries changed');
  }
  renderSidebar();
}

function _showLevelContextMenu(e, level, isJapanese) {
  const sizes = isJapanese ? jlptChunkSize : hskChunkSize;
  const current = sizes[level] || 20;
  const isFav = favorites.levels.includes(level);
  _showCtxMenu(e, `
    <button class="ctx-menu-item" onclick="event.stopPropagation();toggleLevelFavorite(${level});document.getElementById('chunk-ctx-menu').remove()">${isFav ? '★ unfavorite' : '☆ favorite'}</button>
    <div class="ctx-menu-divider"></div>
    <div class="ctx-menu-title">chunk size</div>
    ${[10, 15, 20, 30, 50].map(n =>
      `<button class="ctx-menu-item${n === current ? ' active' : ''}" onclick="event.stopPropagation();_setChunkSize(${level},${n},${isJapanese});document.getElementById('chunk-ctx-menu').remove()">${n} cards</button>`
    ).join('')}
  `);
}

function _showChunkContextMenu(e, level, chunkNum, levelKey, isJapanese) {
  const favChunks = favorites.chunks[levelKey] || [];
  const isFav = favChunks.includes(chunkNum);
  const sizes = isJapanese ? jlptChunkSize : hskChunkSize;
  const current = sizes[level] || 20;
  _showCtxMenu(e, `
    <button class="ctx-menu-item" onclick="event.stopPropagation();toggleChunkFavorite('${levelKey}',${chunkNum});document.getElementById('chunk-ctx-menu').remove()">${isFav ? '★ unfavorite' : '☆ favorite'}</button>
    <div class="ctx-menu-divider"></div>
    <div class="ctx-menu-title">chunk size</div>
    ${[10, 15, 20, 30, 50].map(n =>
      `<button class="ctx-menu-item${n === current ? ' active' : ''}" onclick="event.stopPropagation();_setChunkSize(${level},${n},${isJapanese});document.getElementById('chunk-ctx-menu').remove()">${n} cards</button>`
    ).join('')}
  `);
}

// ══════════════════════════════════════════
