// PROFILES — multi-user localStorage partitioning
// ══════════════════════════════════════════

// ── Storage access layer ───────────────────

let _activeProfileId = 'default';

function getActiveProfileId() { return _activeProfileId; }

/** Returns the full localStorage key for a given base key under the active profile. */
function profileKey(baseKey) {
  return `hanzi-u:${_activeProfileId}:${baseKey}`;
}

function getProfileData(baseKey) {
  return localStorage.getItem(profileKey(baseKey));
}

function setProfileData(baseKey, value) {
  try {
    localStorage.setItem(profileKey(baseKey), value);
  } catch(e) {
    if (e.name === 'QuotaExceededError') {
      alert('Storage is full. Please export your progress (Settings → Export) and clear old data.');
    }
  }
}

function removeProfileData(baseKey) {
  localStorage.removeItem(profileKey(baseKey));
}

// ── Profile index ──────────────────────────

function getProfiles() {
  try {
    const raw = localStorage.getItem('hanzi-profiles');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { profiles: [], activeId: 'default' };
}

function saveProfilesIndex(data) {
  try { localStorage.setItem('hanzi-profiles', JSON.stringify(data)); } catch(e) {}
}

function getActiveProfile() {
  const data = getProfiles();
  return data.profiles.find(p => p.id === _activeProfileId) || null;
}

// ── Migration (one-time, keyless → prefixed) ───────────────

// All old top-level keys that become per-profile
const _MIGRATE_KEYS = [
  'hanzi-progress', 'jp-progress',
  'hanzi-tutor-history', 'jp-tutor-history',
  'hanzi-api-key',
  'hanzi-diff-ratings',
  'hanzi-appearance',
];

function _migrateToProfiles() {
  // Write new prefixed copies, then delete originals
  _MIGRATE_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      try {
        localStorage.setItem(`hanzi-u:default:${key}`, val);
        localStorage.removeItem(key);
      } catch(e) {}
    }
  });

  // Create the profiles index with a single Default entry
  saveProfilesIndex({
    profiles: [{ id: 'default', name: 'Default', createdAt: new Date().toISOString() }],
    activeId: 'default',
  });
}

// ── Init (call before loadProgress) ────────

function initProfiles() {
  const existing = localStorage.getItem('hanzi-profiles');
  if (!existing) {
    _migrateToProfiles();
    _activeProfileId = 'default';
  } else {
    try {
      const data = JSON.parse(existing);
      _activeProfileId = data.activeId || 'default';
      // Integrity: ensure the activeId actually exists
      if (!data.profiles.some(p => p.id === _activeProfileId)) {
        _activeProfileId = data.profiles[0]?.id || 'default';
        data.activeId = _activeProfileId;
        saveProfilesIndex(data);
      }
    } catch(e) {
      _migrateToProfiles();
      _activeProfileId = 'default';
    }
  }
}

// ── Profile CRUD ───────────────────────────

function _genId() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

function createProfile(name) {
  const data = getProfiles();
  const id = _genId();
  data.profiles.push({ id, name, createdAt: new Date().toISOString() });
  saveProfilesIndex(data);
  return id;
}

/** Erase all localStorage keys belonging to a profile. */
function eraseProfileData(id) {
  const prefix = `hanzi-u:${id}:`;
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

function renameProfile(id, newName) {
  const data = getProfiles();
  const profile = data.profiles.find(p => p.id === id);
  if (profile) { profile.name = newName; saveProfilesIndex(data); }
  _updateProfilePill();
  renderProfileList();
}

/** Switch to another profile. Saves current state first, then reloads everything. */
function switchProfile(id) {
  if (id === _activeProfileId) { closeProfilePicker(); return; }

  // Persist current profile before leaving
  saveProgress();
  saveTutorHistory();

  // Update index
  const data = getProfiles();
  data.activeId = id;
  saveProfilesIndex(data);
  _activeProfileId = id;

  // Clear in-memory state
  cardData = {};
  tutorHistory = [];
  // Remove custom decks (keep built-in HSK/JLPT decks in memory)
  Object.keys(decks).forEach(k => {
    if (!k.match(/^hsk \d/i) && !k.match(/^jlpt \d/i)) delete decks[k];
  });

  // Reload new profile's persisted state
  loadProgress();
  loadTutorHistory();

  // Re-apply appearance settings
  try {
    const savedApp = JSON.parse(getProfileData('hanzi-appearance') || 'null');
    appearance = { type: 'theme', primaryHue: 300, complementSecondary: true, secondaryHue: null, color: '#c47ad6', image: null, blur: false, matchBg: false };
    if (savedApp) Object.assign(appearance, savedApp);
  } catch(e) {}
  applyBackground();

  // Re-apply misc settings
  showDifficultyRatings = !!getProfileData('hanzi-diff-ratings');
  const keyInput = document.getElementById('api-key-input');
  if (keyInput) keyInput.value = getApiKey();

  // Re-render
  renderSidebar();
  renderCard();
  syncSettingsUI();

  closeProfilePicker();
  _updateProfilePill();
}

function deleteProfile(id) {
  const data = getProfiles();

  if (data.profiles.length <= 1) {
    // Auto-create new Default, switch to it, then delete the old one
    const newId = _genId();
    data.profiles.push({ id: newId, name: 'Default', createdAt: new Date().toISOString() });
    data.activeId = newId;
    saveProfilesIndex(data);
    _activeProfileId = newId;
    cardData = {};
    tutorHistory = [];
    Object.keys(decks).forEach(k => {
      if (!k.match(/^hsk \d/i) && !k.match(/^jlpt \d/i)) delete decks[k];
    });
    loadProgress();
    loadTutorHistory();
    eraseProfileData(id);
    data.profiles = data.profiles.filter(p => p.id !== id);
    saveProfilesIndex(data);
    renderSidebar(); renderCard(); syncSettingsUI();
    _updateProfilePill();
    renderProfileList();
    return;
  }

  const wasActive = (id === _activeProfileId);
  const idx = data.profiles.findIndex(p => p.id === id);
  data.profiles = data.profiles.filter(p => p.id !== id);

  if (wasActive) {
    const nextIdx = Math.min(idx, data.profiles.length - 1);
    const nextId = data.profiles[nextIdx].id;
    data.activeId = nextId;
    saveProfilesIndex(data);
    _activeProfileId = nextId;
    cardData = {};
    tutorHistory = [];
    Object.keys(decks).forEach(k => {
      if (!k.match(/^hsk \d/i) && !k.match(/^jlpt \d/i)) delete decks[k];
    });
    loadProgress();
    loadTutorHistory();
    try {
      const savedApp = JSON.parse(getProfileData('hanzi-appearance') || 'null');
      appearance = { type: 'theme', primaryHue: 300, complementSecondary: true, secondaryHue: null, color: '#c47ad6', image: null, blur: false, matchBg: false };
      if (savedApp) Object.assign(appearance, savedApp);
    } catch(e) {}
    applyBackground();
    showDifficultyRatings = !!getProfileData('hanzi-diff-ratings');
    renderSidebar(); renderCard(); syncSettingsUI(); _updateProfilePill();
  } else {
    saveProfilesIndex(data);
  }

  eraseProfileData(id);
  renderProfileList();
}

// ── Profile picker UI ──────────────────────

function openProfilePicker() {
  document.getElementById('profile-picker-overlay').classList.add('open');
  renderProfileList();
}

function closeProfilePicker() {
  const overlay = document.getElementById('profile-picker-overlay');
  if (overlay) overlay.classList.remove('open');
  // Hide the add-new row
  const addRow = document.getElementById('new-profile-row');
  if (addRow) addRow.style.display = 'none';
}

function _updateProfilePill() {
  const active = getActiveProfile();
  // Update settings panel profile name
  const nameEl = document.getElementById('settings-profile-name');
  if (nameEl && active) nameEl.textContent = active.name;
}

function _escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderProfileList() {
  _updateProfilePill();
  const list = document.getElementById('profile-list');
  if (!list) return;
  const data = getProfiles();

  list.innerHTML = data.profiles.map(p => {
    const isActive = p.id === _activeProfileId;
    return `<div class="profile-row${isActive ? ' active' : ''}" data-id="${_escHtml(p.id)}">
      <span class="profile-row-dot"></span>
      <span class="profile-row-name">${_escHtml(p.name)}</span>
      ${isActive
        ? `<span class="profile-row-badge">active</span>`
        : `<button class="btn btn-sm profile-row-switch" onclick="switchProfile('${_escHtml(p.id)}')">switch</button>`
      }
      <button class="icon-btn profile-row-delete" onclick="_confirmDeleteProfile('${_escHtml(p.id)}','${_escHtml(p.name)}')" data-tip="delete profile">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;
  }).join('');
}

function _confirmDeleteProfile(id, name) {
  if (!confirm(`Delete profile "${name}"? This cannot be undone.`)) return;
  deleteProfile(id);
}

function showNewProfileInput() {
  const row = document.getElementById('new-profile-row');
  if (!row) return;
  row.style.display = 'flex';
  const input = document.getElementById('new-profile-input');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
}

function profilePickerAdd() {
  const input = document.getElementById('new-profile-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) { input.focus(); return; }

  const data = getProfiles();
  if (data.profiles.some(p => p.name === name)) {
    input.setCustomValidity('A profile with this name already exists.');
    input.reportValidity();
    setTimeout(() => input.setCustomValidity(''), 2000);
    return;
  }
  input.setCustomValidity('');
  createProfile(name);
  input.value = '';
  document.getElementById('new-profile-row').style.display = 'none';
  renderProfileList();
}

// ══════════════════════════════════════════
