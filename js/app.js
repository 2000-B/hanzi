// INIT
// ══════════════════════════════════════════
async function init() {
  // Migrate legacy keys → per-profile keys and set _activeProfileId
  initProfiles();

  // Load saved theme (global — not per-profile). Default: light mode.
  const savedTheme = localStorage.getItem('hanzi-theme');
  if (savedTheme !== 'dark') {
    document.body.classList.add('light');
  }

  // Load saved context strip setting (per-profile)
  const savedContextStrip = getProfileData('hanzi-context-strip');
  if (savedContextStrip !== null) showContextStrip = savedContextStrip !== '0';

  // Load saved difficulty ratings setting (per-profile)
  if (getProfileData('hanzi-diff-ratings')) {
    showDifficultyRatings = true;
  }
  // Load appearance (per-profile)
  try {
    const savedApp = JSON.parse(getProfileData('hanzi-appearance') || 'null');
    if (savedApp) {
      // Migrate old type names
      if (savedApp.type === 'default') savedApp.type = 'theme';
      if (savedApp.type === 'solid') savedApp.type = 'color';
      // Migrate old blobHue → primaryHue
      if (savedApp.blobHue != null && savedApp.primaryHue == null) savedApp.primaryHue = savedApp.blobHue;
      // Guard against accidentally saved hue=0 (red) when default amber (25) was intended
      if (savedApp.primaryHue === 0 && savedApp.type === 'theme') savedApp.primaryHue = 25;
      appearance = { ...appearance, ...savedApp };
    }
  } catch(e) {}
  applyBackground();
  syncSettingsUI();

  // Apply language-specific UI
  applyLangUI();

  // Load progress from localStorage
  loadProgress();
  loadTutorHistory();

  // Load all data from JSON files
  await loadAllData();

  // Render sidebar
  renderSidebar();

  // Build search index
  buildSearchIndex();

  // Sidebar hover expand (desktop only)
  const sidebarEl = document.getElementById('sidebar');
  sidebarEl.addEventListener('mouseenter', expandSidebarOnHover);
  sidebarEl.addEventListener('mouseleave', scheduleSidebarCollapse);

  // Mark sidebar interaction on any click inside (except toggle button)
  sidebarEl.addEventListener('click', () => {
    if (window.innerWidth > 480) sidebarInteracted = true;
  });

  // Start collapsed on desktop
  if (window.innerWidth > 480) {
    sidebarOpen = false;
    sidebarEl.classList.add('collapsed');
  }

  // Inject per-panel fullscreen buttons
  ensureFullscreenBtns();

  // Restore workspace zoom + snap settings
  initWorkspace();

  // Render profile indicator
  _updateProfilePill();

  // Hide loading screen
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
  }, 300);
}

// Register service worker
if ('serviceWorker' in navigator) {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    // Dev: unregister any cached SW so CSS/JS changes appear immediately
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  } else {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  }
}

// Go
init();

// ── CUSTOM TOOLTIP ──────────────────────────────────────────────────────
(function() {
  const tip = document.createElement('div');
  tip.className = 'app-tooltip';
  document.body.appendChild(tip);
  let hideTimer;

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    clearTimeout(hideTimer);
    tip.textContent = el.dataset.tip;
    const rect = el.getBoundingClientRect();
    tip.style.left = (rect.left + rect.width / 2) + 'px';
    // Flip below when element is near the top of the screen
    if (rect.top < 80) {
      tip.style.top = (rect.bottom + 8) + 'px';
      tip.style.transform = 'translateX(-50%)';
    } else {
      tip.style.top = (rect.top - 8) + 'px';
      tip.style.transform = 'translateX(-50%) translateY(-100%)';
    }
    tip.classList.add('visible');
  });

  document.addEventListener('mouseout', e => {
    if (e.relatedTarget?.closest('[data-tip]')) return;
    tip.classList.remove('visible');
  });
})();
