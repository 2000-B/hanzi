// WORKSPACE — fullscreen + zoom
// ══════════════════════════════════════════

// ── Fullscreen ────────────────────────────

function ensureFullscreenBtns() {
  const panels = [
    { id: 'flashcard', el: document.getElementById('main-content') },
    { id: 'analytics', el: document.getElementById('analytics-view') },
    { id: 'info',      el: document.getElementById('info-panel') },
  ];
  panels.forEach(({ id, el }) => {
    if (!el || el.querySelector('.ws-fullscreen-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'icon-btn ws-fullscreen-btn';
    btn.tabIndex = -1;
    btn.setAttribute('data-tip', 'fullscreen');
    btn.dataset.panelId = id;
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none">
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
        stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    btn.onclick = e => { e.stopPropagation(); wsToggleFullscreen(id); };
    el.appendChild(btn);
  });
}

function wsToggleFullscreen(panelId) {
  const panelEls = {
    flashcard: document.getElementById('main-content'),
    analytics: document.getElementById('analytics-view'),
    info:      document.getElementById('info-panel'),
  };
  const target = panelEls[panelId];
  if (!target) return;

  const wasFullscreen = target.classList.contains('ws-fullscreen');

  // Analytics: exiting fullscreen = close the panel entirely
  if (panelId === 'analytics' && wasFullscreen) {
    target.classList.remove('ws-fullscreen');
    closeAnalytics();
    return;
  }

  const isNowFullscreen = target.classList.toggle('ws-fullscreen');

  // Remove fullscreen from every other panel
  Object.entries(panelEls).forEach(([id, el]) => {
    if (id !== panelId && el) el.classList.remove('ws-fullscreen');
  });

  // Update button icon: expand ↔ compress
  const compressPath = `<path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const expandPath = `<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;

  target.querySelectorAll('.ws-fullscreen-btn svg').forEach(svg => {
    svg.innerHTML = isNowFullscreen ? compressPath : expandPath;
  });

  // Reset icons on panels that just lost fullscreen
  Object.entries(panelEls).forEach(([id, el]) => {
    if (id === panelId || !el) return;
    el.querySelectorAll('.ws-fullscreen-btn svg').forEach(svg => {
      svg.innerHTML = expandPath;
    });
  });
}

// Escape exits fullscreen
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const fs = document.querySelector('.ws-fullscreen');
    if (fs) {
      fs.classList.remove('ws-fullscreen');
      fs.querySelectorAll('.ws-fullscreen-btn svg').forEach(svg => {
        svg.innerHTML = `<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
          stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      });
      if (fs.id === 'analytics-view') closeAnalytics();
    }
  }
});

// ── Zoom ──────────────────────────────────

let wsZoom = 100;
let wsSnapEnabled = true;
let _zoomHideTimer = null;

function workspaceZoom(val) {
  wsZoom = Math.min(200, Math.max(50, Number(val)));
  const pane = document.querySelector('.split-pane');
  if (pane) {
    if (wsZoom === 100) {
      pane.style.transform = '';
      pane.style.transformOrigin = '';
      pane.style.width = '';
      pane.style.height = '';
    } else {
      const scale = wsZoom / 100;
      pane.style.transformOrigin = 'top left';
      pane.style.transform = `scale(${scale})`;
      pane.style.width = (100 / scale) + '%';
      pane.style.height = (100 / scale) + '%';
    }
  }
  const slider = document.getElementById('ws-zoom-slider');
  const label = document.getElementById('ws-zoom-label');
  if (slider) slider.value = wsZoom;
  if (label) label.textContent = wsZoom + '%';
  showZoomTray();
  try { localStorage.setItem('hanzi-ws-zoom', wsZoom); } catch(e) {}
}

function workspaceZoomReset() { workspaceZoom(100); }

function showZoomTray() {
  const tray = document.getElementById('ws-zoom-tray');
  if (!tray) return;
  tray.classList.add('visible');
  clearTimeout(_zoomHideTimer);
  _zoomHideTimer = setTimeout(() => tray.classList.remove('visible'), 1800);
}

function toggleSnapGrid() {
  wsSnapEnabled = !wsSnapEnabled;
  const toggle = document.getElementById('snap-grid-toggle');
  if (toggle) toggle.classList.toggle('on', wsSnapEnabled);
  try { localStorage.setItem('hanzi-ws-snap', wsSnapEnabled ? '1' : '0'); } catch(e) {}
}

// Ctrl+scroll to zoom
document.addEventListener('wheel', e => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -5 : 5;
  workspaceZoom(wsZoom + delta);
}, { passive: false });

// Ctrl+= / Ctrl+- / Ctrl+0
document.addEventListener('keydown', e => {
  if (!e.ctrlKey && !e.metaKey) return;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); workspaceZoom(wsZoom + 10); }
  if (e.key === '-')                  { e.preventDefault(); workspaceZoom(wsZoom - 10); }
  if (e.key === '0')                  { e.preventDefault(); workspaceZoomReset(); }
});

function initWorkspace() {
  const savedZoom = localStorage.getItem('hanzi-ws-zoom');
  if (savedZoom) workspaceZoom(Number(savedZoom));
  const savedSnap = localStorage.getItem('hanzi-ws-snap');
  if (savedSnap !== null) {
    wsSnapEnabled = savedSnap === '1';
    const toggle = document.getElementById('snap-grid-toggle');
    if (toggle) toggle.classList.toggle('on', wsSnapEnabled);
  }
}

// ══════════════════════════════════════════
