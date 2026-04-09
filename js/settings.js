// SETTINGS
// ══════════════════════════════════════════
function toggleSearch() {
  if (currentMode === 'test') return;
  const wrap = document.getElementById('header-search-wrap');
  const isOpen = wrap.classList.toggle('open');
  if (isOpen) {
    setTimeout(() => document.getElementById('search-input').focus(), 50);
  } else {
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').style.display = 'none';
  }
}
function closeSearch() {
  const wrap = document.getElementById('header-search-wrap');
  if (!wrap.classList.contains('open')) return;
  wrap.classList.remove('open');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').style.display = 'none';
}
window.addEventListener('blur', () => closeSearch());

// Appearance state
let appearance = {
  type: 'theme',             // 'theme' | 'color' | 'image'
  primaryHue: 25,            // hue for gradient elements (--grad-start/mid/end) and blobs
  complementSecondary: true, // if true, auto-compute secondary from primary
  secondaryHue: null,        // manual secondary hue; null means use getSecondaryHue(primaryHue)
  color: '#ffb347',          // solid background color (for type='color')
  image: null,
  blur: false,
  matchBg: false             // if true, tint all bg/border/surface colors to accent hue
};
let showTimerOnly = false;

// Curated swatch palette — hue values
const SWATCHES = [
  { hue: 25,  name: 'amber' },
  { hue: 12,  name: 'coral' },
  { hue: 345, name: 'rose' },
  { hue: 300, name: 'mauve' },
  { hue: 250, name: 'indigo' },
  { hue: 210, name: 'ocean' },
  { hue: 180, name: 'teal' },
  { hue: 155, name: 'sage' },
  { hue: 80,  name: 'lime' },
  { hue: 45,  name: 'gold' },
];

function renderSwatches() {
  ['swatch-row-quick', 'swatch-row-full'].forEach(id => {
    const row = document.getElementById(id);
    if (!row) return;
    row.innerHTML = SWATCHES.map(s => {
      const hex = hueToHex(s.hue);
      const isActive = Math.abs(appearance.primaryHue - s.hue) < 5 ||
                       Math.abs(appearance.primaryHue - s.hue) > 355;
      return `<div class="swatch-dot${isActive ? ' active' : ''}"
        style="background:${hex}"
        title="${s.name}"
        onclick="selectSwatch(${s.hue})"></div>`;
    }).join('');
  });
}

function selectSwatch(hue) {
  appearance.primaryHue = hue;
  appearance.type = 'theme';
  applyThemeColors();
  applyBlobTint();
  if (appearance.matchBg) applyAccentFromHue(hue);
  saveAppearance();
  syncSettingsUI();
}

function syncSettingsUI() {
  const isLight = document.body.classList.contains('light');
  // Theme
  const themeLabel = isLight ? 'light mode' : 'dark mode';
  ['theme-toggle','fs-theme-toggle'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('on',isLight); });
  ['theme-label','fs-theme-label'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=themeLabel; });
  // Pinyin
  ['pinyin-toggle','fs-pinyin-toggle'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('on',showPinyin); });
  // Context strip
  ['context-strip-toggle'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('on',showContextStrip); });
  // Format
  ['fmt-mc','fs-fmt-mc'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('active',currentFormat==='mc'); });
  ['fmt-type','fs-fmt-type'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('active',currentFormat==='type'); });
  // Timer
  ['timer-toggle','fs-timer-toggle'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('on',showTimer); });
  // Timer-only
  ['timer-only-toggle','fs-timer-only-toggle'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('on',showTimerOnly); });
  ['timer-only-row','fs-timer-only-row'].forEach(id => { const el=document.getElementById(id); if(el){ el.style.opacity=showTimer?'1':'.4'; el.style.pointerEvents=showTimer?'':'none'; }});
  // Diff ratings
  ['diff-ratings-toggle','fs-diff-ratings-toggle'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.toggle('on',showDifficultyRatings); });
  // Swatch palette
  renderSwatches();
  // Match-bg toggle
  const matchBgToggle = document.getElementById('fs-match-bg-toggle');
  if (matchBgToggle) matchBgToggle.classList.toggle('on', !!appearance.matchBg);
}

function updatePrefsVisibility() {
  const study = document.getElementById('prefs-study-group');
  const fmt   = document.getElementById('prefs-format-group');
  const test  = document.getElementById('prefs-test-group');
  if(study) study.style.display = currentMode==='study' ? '' : 'none';
  if(fmt)   fmt.style.display   = currentMode==='test'  ? '' : 'none';
  if(test)  test.style.display  = currentMode==='test'  ? '' : 'none';
}

function toggleSettings() {
  const overlay = document.getElementById('settings-overlay');
  overlay.classList.toggle('open');
  if (overlay.classList.contains('open')) {
    updatePrefsVisibility();
    syncSettingsUI();
  }
}
function closeSettings() {
  document.getElementById('settings-overlay').classList.remove('open');
}

function openFullSettings() {
  closeSettings();
  const modal = document.getElementById('full-settings-modal');
  modal.classList.add('open');
  const keyInput = document.getElementById('api-key-input');
  if(keyInput) keyInput.value = getApiKey();
  syncSettingsUI();
}
function closeFullSettings() {
  document.getElementById('full-settings-modal').classList.remove('open');
}

// ── Background system ──────────────────────
function applyBackground() {
  const layer = document.getElementById('bg-layer');
  if (!layer) return;
  document.body.classList.toggle('bg-custom', appearance.type !== 'theme');
  if (appearance.type === 'theme') {
    layer.style.background = '';
    layer.style.backgroundImage = '';
    layer.style.filter = '';
  } else if (appearance.type === 'color') {
    layer.style.background = appearance.color;
    layer.style.backgroundImage = '';
    layer.style.filter = '';
  } else if (appearance.type === 'image' && appearance.image) {
    layer.style.backgroundImage = `url(${appearance.image})`;
    layer.style.backgroundSize = 'cover';
    layer.style.backgroundPosition = 'center';
    layer.style.filter = appearance.blur ? 'blur(8px)' : '';
  }
  // Always apply theme colors (primary gradient + secondary accent)
  applyThemeColors();
  // Blob tint follows primary hue (only visible in 'theme' dark mode)
  applyBlobTint();
  // Apply full UI tint if matchBg is enabled, otherwise remove stale override
  if (appearance.matchBg) {
    applyAccentFromHue(appearance.primaryHue);
  } else {
    const stale = document.getElementById('accent-theme');
    if (stale) stale.remove();
  }
  saveAppearance();
}

function setBackground(type) {
  appearance.type = type;
  applyBackground();
  syncSettingsUI();
}

// Smart image selector: restores stored image without re-picking if one exists
function selectBgImage() {
  if (appearance.type !== 'image' && appearance.image) {
    appearance.type = 'image';
    applyBackground();
    syncSettingsUI();
  } else {
    document.getElementById('bg-image-input').click();
  }
}

function updateBgColor(color) {
  appearance.color = color;
  const swatch = document.getElementById('bg-color-swatch');
  if (swatch) swatch.style.background = color;
  applyBackground();
}

function loadBgImage(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    appearance.type = 'image';
    appearance.image = e.target.result;
    applyBackground();
    syncSettingsUI();
  };
  reader.readAsDataURL(file);
}

function toggleBgBlur() {
  appearance.blur = !appearance.blur;
  applyBackground();
  syncSettingsUI();
}

function resetAppearance() {
  appearance = { type: 'theme', primaryHue: 25, complementSecondary: true, secondaryHue: null, color: '#ffb347', image: null, blur: false, matchBg: false };
  ['blob-style', 'accent-theme', 'theme-colors'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  applyBackground();
  syncSettingsUI();
  removeProfileData('hanzi-appearance');
}

// ── Background tint: tint workspace + panel backdrop to accent hue ───────────────
function applyAccentFromHue(hue) {
  const h = ((hue % 360) + 360) % 360;
  let styleEl = document.getElementById('accent-theme');
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'accent-theme'; document.head.appendChild(styleEl); }
  styleEl.textContent = `
    .app-body { background: hsl(${h}, 45%, 14%); }
    .main-content { background: hsl(${h}, 35%, 17%); }
    body.light .app-body { background: hsl(${h}, 55%, 87%); }
    body.light .main-content { background: hsl(${h}, 45%, 91%); }
  `;
}

// ── Blob tint helpers ─────────────────────
function hexToHue(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  if(d===0) return 0;
  let h = max===r ? ((g-b)/d+6)%6 : max===g ? (b-r)/d+2 : (r-g)/d+4;
  return Math.round(h*60);
}

function hueToHex(hue) {
  const h = ((hue%360)+360)%360, s=0.7, l=0.55;
  const c = (1-Math.abs(2*l-1))*s;
  const x = c*(1-Math.abs((h/60)%2-1));
  const m = l-c/2;
  let r,g,b;
  if(h<60){r=c;g=x;b=0;}else if(h<120){r=x;g=c;b=0;}
  else if(h<180){r=0;g=c;b=x;}else if(h<240){r=0;g=x;b=c;}
  else if(h<300){r=x;g=0;b=c;}else{r=c;g=0;b=x;}
  return '#'+[r+m,g+m,b+m].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
}

function getSecondaryHue(primaryHue) {
  // Analogous: accent stays in the same warm family as the gradient
  return primaryHue;
}

function applyThemeColors() {
  const p = appearance.primaryHue;
  // Gradient inspired by the "Mmmmm" reference: big lightness/saturation swings
  // within a tight hue range. Start = deep saturated, mid = lighter/creamier, end = warm.
  const midHue = (p + 12) % 360;
  const endHue = (p + 5) % 360;
  // Accent derives from the primary hue — one color family everywhere.
  let styleEl = document.getElementById('theme-colors');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'theme-colors';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    :root {
      --grad-start: hsl(${p}, 90%, 62%);
      --grad-mid:   hsl(${midHue}, 65%, 78%);
      --grad-end:   hsl(${endHue}, 82%, 56%);
      --accent:        hsl(${p}, 75%, 55%);
      --accent2:       hsl(${p}, 70%, 48%);
      --accent-glow:   hsla(${p}, 75%, 55%, 0.20);
      --accent-soft:   hsla(${p}, 75%, 55%, 0.10);
      --accent-softer: hsla(${p}, 75%, 55%, 0.06);
      --accent-border: hsla(${p}, 75%, 55%, 0.28);
    }
    .light {
      --grad-start: hsl(${p}, 88%, 48%);
      --grad-mid:   hsl(${midHue}, 55%, 68%);
      --grad-end:   hsl(${endHue}, 78%, 42%);
      --accent:        hsl(${p}, 72%, 52%);
      --accent2:       hsl(${p}, 68%, 45%);
      --accent-glow:   hsla(${p}, 72%, 52%, 0.18);
      --accent-soft:   hsla(${p}, 72%, 52%, 0.10);
      --accent-softer: hsla(${p}, 72%, 52%, 0.05);
      --accent-border: hsla(${p}, 72%, 52%, 0.28);
    }
  `;
}

function saveAppearance() {
  const toSave = {
    type: appearance.type,
    primaryHue: appearance.primaryHue,
    complementSecondary: appearance.complementSecondary,
    secondaryHue: appearance.secondaryHue,
    color: appearance.color,
    blur: appearance.blur,
    matchBg: appearance.matchBg
  };
  if (appearance.image) toSave.image = appearance.image;
  try { setProfileData('hanzi-appearance', JSON.stringify(toSave)); } catch(e) {}
}

function applyBlobTint() {
  const h = appearance.primaryHue;
  let styleEl = document.getElementById('blob-style');
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'blob-style'; document.head.appendChild(styleEl); }
  styleEl.textContent = `
    body:not(.light)::after {
      background:
        radial-gradient(ellipse 65% 55% at 18% 14%, hsla(${h},60%,55%,0.30) 0%, transparent 60%),
        radial-gradient(ellipse 55% 60% at 80% 86%, hsla(${(h+20)%360},70%,50%,0.22) 0%, transparent 60%),
        radial-gradient(ellipse 50% 45% at 52% 48%, hsla(${(h+40)%360},65%,58%,0.12) 0%, transparent 55%) !important;
    }
    body.light::after {
      background:
        radial-gradient(ellipse 65% 55% at 18% 14%, hsla(${h},70%,60%,0.09) 0%, transparent 60%),
        radial-gradient(ellipse 55% 60% at 80% 86%, hsla(${(h+20)%360},60%,65%,0.07) 0%, transparent 60%),
        radial-gradient(ellipse 50% 45% at 52% 48%, hsla(${(h+40)%360},65%,70%,0.05) 0%, transparent 55%) !important;
    }`;
}

function updatePrimaryColor(hex) {
  appearance.primaryHue = hexToHue(hex);
  if (appearance.complementSecondary) syncSettingsUI(); // auto-update secondary swatch
  applyThemeColors();
  applyBlobTint();
  saveAppearance();
}

function updateSecondaryColor(hex) {
  appearance.secondaryHue = hexToHue(hex);
  applyThemeColors();
  saveAppearance();
}

function toggleComplementSecondary() {
  appearance.complementSecondary = !appearance.complementSecondary;
  if (appearance.complementSecondary) appearance.secondaryHue = null;
  syncSettingsUI();
  applyThemeColors();
  saveAppearance();
}

function toggleMatchBg() {
  appearance.matchBg = !appearance.matchBg;
  if (appearance.matchBg) {
    applyAccentFromHue(appearance.primaryHue);
  } else {
    // Remove the accent-theme override to restore default bg colors
    const el = document.getElementById('accent-theme');
    if (el) el.remove();
  }
  saveAppearance();
  syncSettingsUI();
}

function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('hanzi-theme', isLight ? 'light' : 'dark');
  syncSettingsUI();
}

function togglePinyin() {
  showPinyin = !showPinyin;
  renderCard();
  syncSettingsUI();
}

function toggleContextStrip() {
  showContextStrip = !showContextStrip;
  setProfileData('hanzi-context-strip', showContextStrip ? '1' : '0');
  renderContextStrip();
  syncSettingsUI();
}

function toggleTimer() {
  showTimer = !showTimer;
  syncSettingsUI();
}

function toggleTimerOnly() {
  showTimerOnly = !showTimerOnly;
  syncSettingsUI();
}

function setFormat(fmt) {
  currentFormat = fmt;
  syncSettingsUI();
}

// ══════════════════════════════════════════
