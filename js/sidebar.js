// SIDEBAR
// ══════════════════════════════════════════
let sidebarHoverTimer = null;
let sidebarInteracted = false;

function toggleSidebar() {
  if (window.innerWidth <= 480) {
    // Mobile: full slide-out toggle
    sidebarOpen = !sidebarOpen;
    document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
    document.getElementById('sidebar-backdrop').classList.toggle('visible', sidebarOpen);
  } else {
    // Desktop: toggle between 52px strip and 260px
    sidebarOpen = !sidebarOpen;
    sidebarInteracted = sidebarOpen; // lock open on explicit toggle
    document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
  }
}

function closeSidebar() {
  sidebarOpen = false;
  sidebarInteracted = false;
  document.getElementById('sidebar').classList.add('collapsed');
  document.getElementById('new-deck-panel').classList.remove('open');
  updateNewDeckBtn();
  document.getElementById('sidebar-backdrop').classList.remove('visible');
}
// Double-click on collapsed sidebar to expand
document.addEventListener('dblclick', function(e) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('collapsed') && sidebar.contains(e.target)) {
    e.preventDefault();
    sidebarOpen = true;
    sidebarInteracted = true;
    sidebar.classList.remove('collapsed');
    updateNewDeckBtn();
  }
});
// Click outside sidebar to collapse it (desktop only)
document.addEventListener('mousedown', function(e) {
  if (window.innerWidth <= 768) return;
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  if (!sidebarOpen) return;
  if (!sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
    sidebarOpen = false;
    sidebar.classList.add('collapsed');
    document.getElementById('new-deck-panel').classList.remove('open');
    updateNewDeckBtn();
  }
});

function expandSidebarOnHover() {
  if (window.innerWidth <= 480) return;
  clearTimeout(sidebarHoverTimer);
  if (!sidebarOpen) {
    sidebarOpen = true;
    document.getElementById('sidebar').classList.remove('collapsed');
  }
}

function scheduleSidebarCollapse() {
  if (window.innerWidth <= 480) return;
  if (sidebarInteracted) return;
  clearTimeout(sidebarHoverTimer);
  sidebarHoverTimer = setTimeout(() => {
    if (!sidebarInteracted) {
      sidebarOpen = false;
      document.getElementById('sidebar').classList.add('collapsed');
    }
  }, 300);
}

// Click-outside to collapse (desktop only, when interacted)
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 480) return;
  if (!sidebarInteracted) return;
  // Ignore clicks on elements that were removed from DOM (e.g. sidebar re-rendered by selectDeck)
  if (!document.body.contains(e.target)) return;
  const sidebar = document.getElementById('sidebar');
  const _toggle = document.getElementById('sidebar-toggle');
  if (!sidebar.contains(e.target) && (!_toggle || !_toggle.contains(e.target))) {
    sidebarOpen = false;
    sidebarInteracted = false;
    sidebar.classList.add('collapsed');
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

  for (const level of levels) {
    const data = dataSource[level];
    const loaded = !!data;
    const isOpen = openState[level];
    const count = loaded ? data.length : null;

    const wrapper = document.createElement('div');
    wrapper.className = 'hsk-level' + (isOpen ? ' open' : '');

    // Header
    const header = document.createElement('div');
    header.className = 'hsk-level-header';
    const shortLabel = isJapanese ? `N${level}` : `HSK${level}`;
    header.innerHTML = `
      <span class="sidebar-icon hsk-label-icon" style="display:none;font-size:10px;font-weight:700;letter-spacing:.03em">${shortLabel}</span>
      <span class="sidebar-full">${prefix}${level}</span>
      <span class="sidebar-full" style="display:flex;align-items:center;gap:8px">
        ${count !== null ? `<span class="count">${count}</span>` : '<span class="count" style="font-style:italic">loading…</span>'}
        <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    `;
    header.onclick = () => {
      openState[level] = !openState[level];
      renderSidebar();
    };
    wrapper.appendChild(header);

    if (loaded && isOpen) {
      const sz = chunkSizes[level] || 20;
      const totalChunks = Math.ceil(data.length / sz);

      // Chunk size pills
      const controls = document.createElement('div');
      controls.className = 'chunk-controls';
      controls.innerHTML = `
        <div class="chunk-size-row">
          <span class="chunk-size-label">chunk</span>
          <div class="chunk-pills">
            ${[10, 15, 20, 30, 50].map(n =>
              `<button class="chunk-pill${sz === n ? ' active' : ''}" onclick="event.stopPropagation();${isJapanese?'jlptChunkSize':'hskChunkSize'}[${level}]=${n};renderSidebar()">${n}</button>`
            ).join('')}
          </div>
        </div>
      `;
      wrapper.appendChild(controls);

      // Chunk items
      for (let i = 0; i < data.length; i += sz) {
        const chunkNum = Math.floor(i / sz) + 1;
        const name = `${deckPrefix} ${level} · ${chunkNum}/${totalChunks}`;
        const cards = data.slice(i, i + sz);

        const item = document.createElement('div');
        item.className = 'chunk-item' + (name === activeDeckName ? ' active' : '');
        item.innerHTML = `<span>${chunkNum}/${totalChunks}</span><span class="chunk-count">${cards.length}</span>`;
        item.onclick = () => {
          decks[name] = cards;
          selectDeck(name);
          if (window.innerWidth <= 480) closeSidebar();
        };
        wrapper.appendChild(item);
      }
    }

    list.appendChild(wrapper);
  }

  // Custom decks
  const customList = document.getElementById('custom-deck-list');
  customList.innerHTML = '';
  const custom = Object.entries(decks).filter(([k]) => !k.match(/^hsk \d/) && !k.match(/^jlpt \d/));
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
  const sidebar = document.getElementById('sidebar');
  // If collapsed, expand first
  if (sidebar.classList.contains('collapsed')) {
    sidebarOpen = true;
    sidebar.classList.remove('collapsed');
    updateNewDeckBtn();
    // Open the panel after expansion
    setTimeout(() => {
      document.getElementById('new-deck-panel').classList.add('open');
      document.getElementById('new-deck-btn').innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2.5 4L5.5 7.5L8.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }, 260);
    return;
  }
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
  const collapsed = document.getElementById('sidebar').classList.contains('collapsed');
  if (collapsed) {
    btn.innerHTML = '+';
  } else {
    btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> new deck';
  }
}

// ══════════════════════════════════════════
