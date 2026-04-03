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
let appearance = { type: 'default', color: '#ffb347', image: null, blur: false, blobHue: 25 };
let showTimerOnly = false;

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
  // Background
  ['default','solid','image'].forEach(t => { const el=document.getElementById('bg-opt-'+t); if(el) el.classList.toggle('active',appearance.type===t); });
  const colorRow = document.getElementById('bg-color-row');
  if(colorRow) colorRow.style.display = appearance.type==='solid' ? '' : 'none';
  const blurRow = document.getElementById('bg-blur-row');
  if(blurRow) blurRow.style.display = appearance.type==='image' ? '' : 'none';
  const blurToggle = document.getElementById('bg-blur-toggle');
  if(blurToggle) blurToggle.classList.toggle('on', appearance.blur);
  const swatch = document.getElementById('bg-color-swatch');
  if(swatch) swatch.style.background = appearance.color;
  const picker = document.getElementById('bg-color-picker');
  if(picker) picker.value = appearance.color;
  // Blob tint — only shown when using default background
  const blobTintRow = document.getElementById('bg-blob-tint-row');
  if(blobTintRow) blobTintRow.style.display = appearance.type==='default' ? '' : 'none';
  const blobTintHex = hueToHex(appearance.blobHue);
  const blobSwatch = document.getElementById('bg-blob-swatch');
  if(blobSwatch) blobSwatch.style.background = blobTintHex;
  const blobPicker = document.getElementById('bg-blob-picker');
  if(blobPicker) blobPicker.value = blobTintHex;
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
  document.body.classList.toggle('bg-custom', appearance.type !== 'default');
  if (appearance.type === 'default') {
    layer.style.background = '';
    layer.style.backgroundImage = '';
    layer.style.filter = '';
  } else if (appearance.type === 'solid') {
    layer.style.background = appearance.color;
    layer.style.backgroundImage = '';
    layer.style.filter = '';
  } else if (appearance.type === 'image' && appearance.image) {
    layer.style.backgroundImage = `url(${appearance.image})`;
    layer.style.backgroundSize = 'cover';
    layer.style.backgroundPosition = 'center';
    layer.style.filter = appearance.blur ? 'blur(8px)' : '';
  }
  if (appearance.type === 'default') {
    // Let CSS variables define accent + gradient; only tint the blobs
    applyBlobTint();
    // Remove any stale accent override from a previous custom background
    const stale = document.getElementById('accent-theme');
    if (stale) stale.remove();
  } else if (appearance.type === 'solid') {
    applyAccentFromHue(hexToHue(appearance.color));
  } else {
    applyAccentFromHue(appearance.blobHue);
  }
  // Always persist image so switching back restores it without re-picking
  const toSave = { type: appearance.type, color: appearance.color, blur: appearance.blur, blobHue: appearance.blobHue };
  if (appearance.image) toSave.image = appearance.image;
  try { setProfileData('hanzi-appearance', JSON.stringify(toSave)); } catch(e) {}
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
  appearance = { type: 'default', color: '#ffb347', image: null, blur: false, blobHue: 25 };
  ['blob-style', 'accent-theme'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  applyBackground();
  syncSettingsUI();
  removeProfileData('hanzi-appearance');
}

// ── Accent theme: adapt all UI tokens to background hue ───────────────
function applyAccentFromHue(hue) {
  const h = ((hue % 360) + 360) % 360;
  let styleEl = document.getElementById('accent-theme');
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'accent-theme'; document.head.appendChild(styleEl); }
  styleEl.textContent = `
    :root {
      --accent:        hsl(${h}, 90%, 68%);
      --accent2:       hsl(${h}, 78%, 58%);
      --accent-glow:   hsla(${h}, 90%, 65%, 0.18);
      --accent-soft:   hsla(${h}, 90%, 65%, 0.08);
      --accent-softer: hsla(${h}, 90%, 65%, 0.06);
      --accent-border: hsla(${h}, 90%, 65%, 0.25);
      --grad-start: hsl(${h}, 90%, 65%);
      --grad-mid:   hsl(${(h+30)%360}, 80%, 74%);
      --grad-end:   hsl(${(h-30+360)%360}, 95%, 72%);
      --bg:    hsl(${h}, 8%, 4%);
      --bg2:   hsl(${h}, 10%, 7%);
      --bg3:   hsl(${h}, 8%, 10%);
      --bg4:   hsl(${h}, 8%, 13%);
      --border:  hsla(${h}, 90%, 65%, 0.10);
      --border2: hsla(${h}, 90%, 65%, 0.17);
      --border3: hsla(${h}, 90%, 65%, 0.26);
      --elevation: 0 8px 40px rgba(0,0,0,.5), 0 0 80px hsla(${h},80%,60%,0.08), inset 0 1px 0 rgba(255,255,255,0.04);
      --elevation-hover: 0 12px 50px rgba(0,0,0,.6), 0 0 100px hsla(${h},80%,60%,0.12), inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .light {
      --accent:        hsl(${h}, 75%, 42%);
      --accent2:       hsl(${h}, 70%, 35%);
      --accent-glow:   hsla(${h}, 75%, 42%, 0.18);
      --accent-soft:   hsla(${h}, 75%, 42%, 0.10);
      --accent-border: hsla(${h}, 75%, 42%, 0.30);
      --grad-start: #111118;
      --grad-mid:   #111118;
      --grad-end:   #111118;
      --bg:    hsl(${h}, 20%, 97%);
      --bg2:   hsl(${h}, 55%, 96%);
      --bg3:   hsl(${h}, 50%, 93%);
      --bg4:   hsl(${h}, 45%, 88%);
      --border:  hsla(${h}, 60%, 35%, 0.10);
      --border2: hsla(${h}, 60%, 35%, 0.16);
      --border3: hsla(${h}, 60%, 35%, 0.22);
    }
    .sidebar { background: hsl(${h}, 10%, 7%); }
    body.light .sidebar { background: hsl(${h}, 55%, 96%); }
    header { background: hsla(${h}, 8%, 4%, 0.88); }
    body.light header { background: hsla(${h}, 50%, 95%, 0.88); }
    .card-face {
      border-color: hsla(${h}, 90%, 65%, 0.22);
      background: linear-gradient(165deg, hsla(${h}, 25%, 14%, 0.97) 0%, hsla(${h}, 15%, 8%, 0.98) 50%, hsla(${h}, 20%, 12%, 0.97) 100%);
    }
    body.light .card-face {
      background:
        linear-gradient(165deg, hsla(${h}, 80%, 65%, 0.08) 0%, hsla(${h}, 50%, 82%, 0.05) 50%, hsla(${h}, 70%, 65%, 0.10) 100%),
        linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(248,248,255,0.95) 100%);
      border-color: hsla(${h}, 75%, 42%, 0.22);
    }
    body.light .header-title {
      background: linear-gradient(135deg, hsl(${h}, 85%, 38%) 0%, hsl(${(h+30)%360}, 80%, 46%) 50%, hsl(${(h-30+360)%360}, 85%, 40%) 100%);
      background-size: 200% 200%;
      animation: gradShift 8s ease infinite;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    body.light .card-hanzi {
      background: linear-gradient(135deg, hsl(${h}, 85%, 38%) 0%, hsl(${(h+30)%360}, 80%, 46%) 40%, hsl(${(h-30+360)%360}, 85%, 40%) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
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

function applyBlobTint() {
  const h = appearance.blobHue;
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

function updateBlobTint(hex) {
  appearance.blobHue = hexToHue(hex);
  const swatch = document.getElementById('bg-blob-swatch');
  if(swatch) swatch.style.background = hex;
  applyBlobTint();
  const toSave = { type: appearance.type, color: appearance.color, blur: appearance.blur, blobHue: appearance.blobHue };
  if(appearance.type==='image' && appearance.image) toSave.image = appearance.image;
  try { setProfileData('hanzi-appearance', JSON.stringify(toSave)); } catch(e) {}
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
