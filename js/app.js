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

  // Load favorites and render sidebar
  loadFavorites();
  renderSidebar();

  // Build search index
  buildSearchIndex();

  // Sidebar starts closed — toggled via header deck button
  sidebarOpen = false;

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

  // First-time welcome — show only for truly new users (no progress, no custom profiles)
  const profileData = getProfiles();
  const hasProgress = getProfileData('hanzi-progress') || getProfileData('jp-progress');
  const isFirstLaunch = !localStorage.getItem('hanzi-welcomed') &&
    !hasProgress &&
    profileData.profiles.length <= 1 &&
    profileData.profiles[0]?.name === 'Default';
  if (isFirstLaunch) {
    setTimeout(() => {
      document.getElementById('welcome-modal').classList.add('open');
      document.getElementById('welcome-name').focus();
    }, 500);
  }
}

// ── Welcome modal ───────────────────────────────────────────────────────
function completeWelcome() {
  const nameInput = document.getElementById('welcome-name');
  const name = nameInput.value.trim() || 'Default';
  const isJapanese = document.getElementById('welcome-ja').classList.contains('active');
  const lang = isJapanese ? 'ja' : 'zh';

  // Rename the default profile (or create one)
  const data = getProfiles();
  if (data.profiles.length && data.profiles[0].id === 'default') {
    data.profiles[0].name = name;
    saveProfilesIndex(data);
  } else {
    const id = createProfile(name);
    switchProfile(id);
  }

  // Set language
  if (lang !== currentLang) {
    switchLanguage(lang);
  }

  // Mark welcomed so we don't show again
  localStorage.setItem('hanzi-welcomed', '1');

  // Close modal + update UI
  document.getElementById('welcome-modal').classList.remove('open');
  _updateProfilePill();
  renderSidebar();
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
    // Position vertically — flip below when near top
    if (rect.top < 80) {
      tip.style.top = (rect.bottom + 8) + 'px';
      tip.style.transform = 'translateX(-50%)';
    } else {
      tip.style.top = (rect.top - 8) + 'px';
      tip.style.transform = 'translateX(-50%) translateY(-100%)';
    }
    // Position horizontally — center on element, then clamp to viewport
    tip.style.left = '0px';
    tip.style.visibility = 'hidden';
    tip.classList.add('visible');
    const tipW = tip.offsetWidth;
    let left = rect.left + rect.width / 2;
    if (left + tipW / 2 > window.innerWidth - 8) left = window.innerWidth - 8 - tipW / 2;
    if (left - tipW / 2 < 8) left = 8 + tipW / 2;
    tip.style.left = left + 'px';
    tip.style.visibility = '';
  });

  document.addEventListener('mouseout', e => {
    if (e.relatedTarget?.closest('[data-tip]')) return;
    tip.classList.remove('visible');
  });
})();
