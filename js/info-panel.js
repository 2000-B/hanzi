// INFO PANEL + DIVIDER
// ══════════════════════════════════════════
function toggleInfoPanel() {
  infoPanelOpen = !infoPanelOpen;
  const panel = document.getElementById('info-panel');
  document.getElementById('btn-info').classList.toggle('active', infoPanelOpen);
  document.getElementById('btn-tray-info')?.classList.toggle('active', infoPanelOpen);

  if (!infoPanelOpen) {
    // Closing — play fade-out animation, then drop display:flex by removing both classes.
    // Cancel any in-flight closing animation first so re-toggling is responsive.
    clearTimeout(panel._closeTimer);
    panel.classList.remove('open');
    panel.classList.add('closing');
    panel._closeTimer = setTimeout(() => {
      panel.classList.remove('closing');
    }, 200);

    // Clear fullscreen state if panel was fullscreened when closed
    if (panel.classList.contains('ws-fullscreen')) {
      panel.classList.remove('ws-fullscreen');
      // Restore fullscreen btn icon
      const expandPath = `<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
        stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      panel.querySelectorAll('.ws-fullscreen-btn svg').forEach(svg => {
        svg.innerHTML = expandPath;
      });
      // Restore saved inline styles on all panels
      const allPanels = [document.getElementById('main-content'), panel];
      allPanels.forEach(el => {
        if (el && el._savedStyle) {
          el.style.width = el._savedStyle.width;
          el.style.height = el._savedStyle.height;
          el.style.flex = el._savedStyle.flex;
          delete el._savedStyle;
        }
        if (el) el.style.display = '';
      });
      // Restore dividers
      const workspace = document.getElementById('workspace');
      if (workspace) workspace.querySelectorAll('.ws-divider').forEach(d => d.style.display = '');
    }
    // Clear stale inline styles from the closing panel
    panel.style.width = '';
    panel.style.height = '';
    panel.style.flex = '';
  }

  if (infoPanelOpen) {
    // Opening — clear any in-flight close animation and apply the open class.
    clearTimeout(panel._closeTimer);
    panel.classList.remove('closing');
    panel.classList.add('open');

    // Restore saved panel width
    const savedW = getProfileData('hanzi-info-width');
    if (savedW) {
      const w = parseInt(savedW, 10);
      if (w >= 240 && w <= 600) { panel.style.width = w + 'px'; }
    }
    if (activeDeck.length) {
      renderInfoPanel(activeDeck[currentIndex]);
      renderTutorHistory();
      _syncTutorBarVisibility();
    }
  }
}

/** Hide the tutor bar when no API key is set. */
function _syncTutorBarVisibility() {
  const bar = document.querySelector('.tutor-bar');
  if (bar) bar.style.display = getApiKey() ? '' : 'none';
}

/**
 * Tray pencil button action.
 * - If the info panel is closed → open it, then focus the note field and flash it.
 * - If the panel is open and the note is in view → focus + flash.
 * - If the panel is open but the note is out of view → scroll to it, then focus + flash.
 */
function openNoteFromTray() {
  const focusAndFlash = () => {
    const ta = document.getElementById('user-note');
    if (!ta) return;
    ta.focus();
    ta.classList.add('flash');
    clearTimeout(ta._flashT);
    ta._flashT = setTimeout(() => ta.classList.remove('flash'), 600);
  };
  if (!infoPanelOpen) {
    toggleInfoPanel();
    // Wait one paint frame so the slide-in animation has started before stealing focus.
    setTimeout(() => {
      const ta = document.getElementById('user-note');
      if (ta) ta.scrollIntoView({ block: 'center', behavior: 'instant' });
      focusAndFlash();
    }, 60);
    return;
  }
  const ta = document.getElementById('user-note');
  if (!ta) return;
  const scroll = ta.closest('.info-panel-scroll');
  let inView = true;
  if (scroll) {
    const tr = ta.getBoundingClientRect();
    const sr = scroll.getBoundingClientRect();
    inView = tr.top >= sr.top && tr.bottom <= sr.bottom;
  }
  if (inView) {
    focusAndFlash();
  } else {
    ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(focusAndFlash, 250);
  }
}

function getEnriched() { return currentLang === 'ja' ? ENRICHED_JP : ENRICHED; }
function getDict()     { return currentLang === 'ja' ? JP_DICT : CEDICT; }

// ── Contextual help tooltips ──
const IP_HELP = {
  components: {
    zh: 'Characters are built from smaller parts called radicals and components. Semantic components hint at meaning; phonetic components hint at pronunciation. Recognising them speeds up memorisation.',
    ja: 'Kanji are built from smaller parts called radicals and components. Semantic components hint at meaning; phonetic components hint at pronunciation. Many components are shared between Chinese and Japanese.',
  },
  etymology: {
    zh: 'Etymology traces how a character\'s meaning and form evolved over time. Understanding the origin — even briefly — creates a memorable hook that makes the character stick.',
    ja: 'Etymology traces how a character\'s meaning and form evolved. Japanese kanji were adopted from Chinese, so the history often covers both the original Chinese form and how usage shifted in Japanese.',
  },
  readings: {
    ja: 'Japanese kanji have two reading types. On\'yomi (音読み) are the Chinese-derived pronunciations — used mostly in compound words. Kun\'yomi (訓読み) are the native Japanese pronunciations — used mostly for standalone words and verb/adjective stems.',
  },
};

let _helpCounter = 0;
function ipHelpBtn(section) {
  const text = IP_HELP[section]?.[currentLang] || IP_HELP[section]?.zh;
  if (!text) return '';
  const id = 'ip-help-' + (++_helpCounter);
  return `<button class="ip-help-btn" onclick="(function(b){var box=document.getElementById('${id}');box.classList.toggle('open');b.style.color=box.classList.contains('open')?'var(--accent)':''})(this)" aria-label="explain ${section}">?</button><div class="ip-help-box" id="${id}">${text}</div>`;
}

function renderInfoPanel(card) {
  if (!card) return;
  infoPanelCurrentCard = card;
  _helpCounter = 0; // reset so IDs are stable across re-renders
  const scroll = document.getElementById('info-panel-scroll');

  const enrichedSource = getEnriched();
  const dictSource = getDict();
  const isJapanese = currentLang === 'ja';

  const entry   = isJapanese ? (JP_DICT[card.hanzi] || null) : (CEDICT[card.hanzi] || null);
  const enriched = enrichedSource[card.hanzi] || null;
  const isMultiChar = card.hanzi.length > 1;
  const cd = cardData[card.hanzi] || {};

  let html = '';

  // ── Back button ──
  if (infoPanelHistory.length > 0) {
    html += `<button class="ip-back-btn" onclick="infoPanelBack()">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      back
    </button>`;
  }

  // ── Header ──
  html += `<div class="ip-header">
    <div class="ip-hanzi">${card.hanzi}</div>
    ${isJapanese && card.kana && card.kana !== card.hanzi ? `<div class="ip-kana">${card.kana}</div>` : ''}
    <div class="ip-pinyin">${card.pinyin}${_hasTtsVoice() ? `
      <button class="ip-audio-btn" onclick="speakHanzi('${card.hanzi}')" data-tip="listen">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 5.5h2l3-3v11l-3-3H3a1 1 0 01-1-1v-3a1 1 0 011-1z" fill="currentColor"/><path d="M11 4.5a5 5 0 010 7M9 6.5a2.5 2.5 0 010 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </button>` : ''}
    </div>
    <div class="ip-english">${card.english}</div>
    <div class="ip-badges">
      ${isJapanese && enriched && enriched.jlpt ? `<span class="ip-badge hsk">JLPT N${enriched.jlpt}</span>` : ''}
      ${!isJapanese && entry && entry.hsk ? `<span class="ip-badge hsk">HSK ${entry.hsk}</span>` : ''}
      ${enriched && enriched.strokeCount ? `<span class="ip-badge">${enriched.strokeCount} strokes</span>` : ''}
      ${enriched && enriched.radical ? `<span class="ip-badge">radical: ${enriched.radical}</span>` : ''}
    </div>
  </div>`;

  // ── User note (always visible, right under header) ──
  html += `<div class="ip-section ip-note-section">
    <textarea class="ip-note-area" id="user-note" placeholder="add a personal note, memory hook, or association…" onblur="saveNote()">${cd.note || ''}</textarea>
    <div class="ip-note-saved" id="ip-note-saved">saved ✓</div>
  </div>`;

  // ── Readings (Japanese only) ──
  if (isJapanese && enriched && (enriched.onyomi || enriched.kunyomi)) {
    html += `<div class="ip-section">
      <div class="ip-section-title">readings ${ipHelpBtn('readings')}</div>
      ${enriched.onyomi ? `<div class="ip-reading"><span class="ip-reading-label">on'yomi</span> ${enriched.onyomi}</div>` : ''}
      ${enriched.kunyomi ? `<div class="ip-reading"><span class="ip-reading-label">kun'yomi</span> ${enriched.kunyomi}</div>` : ''}
    </div>`;
  }

  // ── Definitions ──
  if (entry && entry.defs && entry.defs.length > 0) {
    html += `<div class="ip-section">
      <div class="ip-section-title">definitions</div>
      <div class="ip-defs">${entry.defs.join(' · ')}</div>
    </div>`;
  }

  // ── Enriched data sections ──
  if (enriched) {

    // Word-level literal meaning (multi-character words only)
    if (enriched.literal) {
      html += `<div class="ip-section">
        <div class="ip-section-title">literal meaning</div>
        <div class="ip-literal">"${enriched.literal}"</div>
        ${enriched.wordNote ? `<div class="ip-word-note">${enriched.wordNote}</div>` : ''}
      </div>`;
    }

    // Components
    if (enriched.components && enriched.components.length > 0) {
      html += `<div class="ip-section">
        <div class="ip-section-title">components ${ipHelpBtn('components')}</div>
        ${enriched.components.map(c => `
          <div class="ip-component">
            <div class="ip-comp-char" onclick="navigateToChar('${c.char}')" data-tip="look up ${c.char}">${c.char}</div>
            <div class="ip-comp-info">
              <div class="ip-comp-role ${c.role || ''}">${c.role || 'component'}</div>
              <div class="ip-comp-meaning">${c.meaning || ''}</div>
              ${c.note ? `<div class="ip-comp-note">${c.note}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>`;
    }

    // Per-character breakdown for multi-character words
    if (isMultiChar && enriched.characters) {
      html += `<div class="ip-section">
        <div class="ip-section-title">character breakdown</div>`;
      for (const charHanzi of enriched.characters) {
        const charData = enrichedSource[charHanzi];
        if (charData) {
          html += `<details style="margin-bottom:8px">
            <summary style="cursor:pointer;font-family:'Noto Sans SC',sans-serif;font-size:20px;color:var(--text);padding:6px 0">
              ${charHanzi} <span style="font-family:inherit;font-size:12px;color:var(--text2);font-weight:400">${charData.pinyin || ''} — ${charData.english || ''}</span>
            </summary>
            <div style="padding-left:12px;border-left:2px solid var(--border);margin-top:4px">
              ${charData.components ? charData.components.map(c => `
                <div class="ip-component" style="margin-bottom:4px">
                  <div class="ip-comp-char" style="font-size:24px;min-width:36px">${c.char}</div>
                  <div class="ip-comp-info">
                    <div class="ip-comp-role ${c.role || ''}">${c.role || ''}</div>
                    <div class="ip-comp-meaning">${c.meaning || ''}</div>
                  </div>
                </div>
              `).join('') : ''}
              ${charData.etymology ? `<div class="ip-etymology" style="margin-top:6px;font-size:12px">${charData.etymology}</div>` : ''}
            </div>
          </details>`;
        }
      }
      html += `</div>`;
    }

    // ── "More info" expandable — etymology, examples, related ──
    const hasEtymology = enriched.etymology && !isMultiChar;
    const hasExamples = enriched.examples && enriched.examples.length > 0;
    const hasRelated = enriched.sameRadical && enriched.sameRadical.length > 0;
    if (hasEtymology || hasExamples || hasRelated || true) {
      html += `<details class="ip-more-info">
        <summary class="ip-more-toggle">more info</summary>
        <div class="ip-more-content">`;

      if (hasEtymology) {
        html += `<div class="ip-section">
          <div class="ip-section-title">etymology ${ipHelpBtn('etymology')}</div>
          <div class="ip-etymology">${enriched.etymology}</div>
        </div>`;
      }

      if (hasExamples) {
        html += `<div class="ip-section">
          <div class="ip-section-title">examples</div>
          ${enriched.examples.map(ex => `
            <div class="ip-example">
              <div class="ip-ex-zh">${isJapanese ? ex.ja : ex.zh}</div>
              <div class="ip-ex-pinyin">${isJapanese ? ex.romaji : ex.pinyin}</div>
              <div class="ip-ex-en">${ex.en}</div>
              ${ex.level ? `<span class="ip-ex-level">${lang().levelPrefix}${ex.level}</span>` : ''}
            </div>
          `).join('')}
        </div>`;
      }

      if (hasRelated) {
        html += `<div class="ip-section">
          <div class="ip-section-title">related (same radical)</div>
          <div class="ip-related">
            ${enriched.sameRadical.map(ch => `
              <div class="ip-related-char" onclick="navigateToChar('${ch}')" data-tip="${ch}">${ch}</div>
            `).join('')}
          </div>
        </div>`;
      }

      // ── Card-level stats ──
      const cdStats = cardData[card.hanzi];
      if (cdStats && (cdStats.correct || cdStats.wrong || cdStats.mastered)) {
        const seen = (cdStats.correct || 0) + (cdStats.wrong || 0);
        const acc = seen > 0 ? Math.round((cdStats.correct || 0) / seen * 100) : 0;
        html += `<div class="ip-section">
          <div class="ip-section-title">card stats</div>
          <div class="ip-card-stats">
            <div class="ip-card-stat"><span class="ip-card-stat-label">seen</span><span class="ip-card-stat-value">${seen}</span></div>
            <div class="ip-card-stat"><span class="ip-card-stat-label">accuracy</span><span class="ip-card-stat-value">${acc}%</span></div>
            <div class="ip-card-stat"><span class="ip-card-stat-label">streak</span><span class="ip-card-stat-value">${cdStats.correct || 0}</span></div>
            ${cdStats.mastered ? `<div class="ip-card-stat"><span class="ip-card-stat-label">mastered</span><span class="ip-card-stat-value" style="color:var(--green)">✓</span></div>` : ''}
            ${cdStats.due ? `<div class="ip-card-stat"><span class="ip-card-stat-label">next review</span><span class="ip-card-stat-value">${cdStats.due}</span></div>` : ''}
            ${cdStats.reviewFlag ? `<div class="ip-card-stat"><span class="ip-card-stat-label">flagged</span><span class="ip-card-stat-value" style="color:var(--orange)">⚑</span></div>` : ''}
          </div>
        </div>`;
      }

      html += `<div class="ip-section">
        <button class="btn btn-sm ip-tutor-btn" onclick="openTutorOverlay()">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 3h12v8H5l-3 3V3z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ask about this character
        </button>
      </div>`;

      html += `</div></details>`;
    }

  } else {
    // No enriched data — show AI fallback option
    html += `<div class="ip-section">
      <div class="ip-ai-notice" id="ai-fallback-notice">
        Enriched data not yet available for this ${isMultiChar ? 'word' : 'character'}.<br>
        ${getApiKey()
          ? `<button class="ip-ai-btn" onclick="aiDeepDive('${card.hanzi}')">generate with AI</button>`
          : `<span style="margin-top:4px;display:inline-block">Enter an API key in Settings for AI lookup.</span>`
        }
      </div>
    </div>`;
  }

  // User note is rendered at the top (after header) — not here.

  // ── Tutor messages area ──
  html += `<div id="tutor-messages"></div>`;

  scroll.innerHTML = html;
}

// Navigate to a character from component links / related chars
function navigateToChar(hanzi) {
  // Push current panel card onto history stack
  if (infoPanelCurrentCard) infoPanelHistory.push(infoPanelCurrentCard);

  // Find card data from any source (always stays in the info panel — never switches the deck)
  let card = null;
  for (const [, cards] of Object.entries(decks)) {
    const found = cards.find(c => c.hanzi === hanzi);
    if (found) { card = found; break; }
  }
  if (!card) {
    const dataSource = currentLang === 'ja' ? JLPT_DATA : HSK_DATA;
    for (const [, cards] of Object.entries(dataSource)) {
      if (!cards) continue;
      const found = cards.find(c => c.hanzi === hanzi);
      if (found) { card = found; break; }
    }
  }
  if (!card) {
    if (currentLang === 'ja') {
      const e = JP_DICT[hanzi] || ENRICHED_JP[hanzi];
      card = { hanzi, pinyin: e ? (e.romaji || '') : '?', english: e ? (e.defs ? e.defs.join(' / ') : (e.english || 'unknown')) : 'unknown', kana: e ? e.kana : '' };
    } else {
      const ce = CEDICT[hanzi];
      card = { hanzi, pinyin: ce ? ce.pinyin : '?', english: ce ? ce.defs.join(' / ') : 'unknown' };
    }
  }
  renderInfoPanel(card);
}

function infoPanelBack() {
  if (!infoPanelHistory.length) return;
  const prev = infoPanelHistory.pop();
  renderInfoPanel(prev);
}

// TTS
function speakHanzi(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang().ttsLang;
  utt.rate = 0.85;
  const voices = speechSynthesis.getVoices();
  const zhVoice = voices.find(v => v.lang.startsWith(lang().ttsVoicePrefix));
  if (zhVoice) utt.voice = zhVoice;
  speechSynthesis.speak(utt);
}
// Voice availability check — used to decide whether to render the audio button.
// Returns true when a voice for the current language is available, OR when voices haven't loaded yet
// (assume yes until proven otherwise; voiceschanged will re-render).
function _hasTtsVoice() {
  if (!('speechSynthesis' in window)) return false;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return true; // not loaded yet — optimistic
  return !!voices.find(v => v.lang.startsWith(lang().ttsVoicePrefix));
}
// Preload voices and re-render info panel when the list updates so the audio button
// can be shown/hidden once the browser knows what voices are available.
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
    if (typeof infoPanelOpen !== 'undefined' && infoPanelOpen && infoPanelCurrentCard) {
      renderInfoPanel(infoPanelCurrentCard);
    }
  };
}

// ── Tutor overlay ──
function openTutorOverlay() {
  const overlay = document.getElementById('tutor-overlay');
  overlay.classList.add('open');
  const target = document.getElementById('tutor-messages-overlay');
  if (!getApiKey()) {
    if (target) target.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:13px;padding:24px">Enter an API key in <b>Settings</b> to use the AI tutor.</div>';
    return;
  }
  // Move tutor messages into overlay
  const msgs = document.getElementById('tutor-messages');
  if (msgs && target) target.innerHTML = msgs.innerHTML;
  setTimeout(() => document.getElementById('tutor-input').focus(), 100);
}

function closeTutorOverlay() {
  document.getElementById('tutor-overlay').classList.remove('open');
}

// ── AI Deep Dive Fallback ──
async function aiDeepDive(hanzi) {
  const key = getApiKey();
  if (!key) return;

  const notice = document.getElementById('ai-fallback-notice');
  if (notice) notice.innerHTML = '<span class="ip-loading"></span> generating…';

  try {
    const text = await callAI({
      maxTokens: 1500,
      messages: [{
        role: 'user',
        content: `Analyze the Chinese ${hanzi.length > 1 ? 'word' : 'character'} "${hanzi}". Return ONLY valid JSON, no markdown fences, matching this schema:
${hanzi.length > 1 ? `{
  "word": "${hanzi}",
  "literal": "word-for-word translation",
  "wordNote": "brief usage/cultural note",
  "characters": ${JSON.stringify([...hanzi])},
  "examples": [{"zh": "...", "pinyin": "...", "en": "...", "level": 1}]
}` : `{
  "hanzi": "${hanzi}",
  "components": [{"char": "...", "role": "semantic|phonetic|both", "meaning": "...", "note": "..."}],
  "radical": "...",
  "strokeCount": 0,
  "etymology": "2-4 sentence factual origin.",
  "examples": [{"zh": "...", "pinyin": "...", "en": "...", "level": 1}],
  "sameRadical": ["...", "..."]
}`}`
      }]
    });

    const parsed = JSON.parse(text.replace(/```json?|```/g, '').trim());

    // Cache the result
    ENRICHED[hanzi] = parsed;

    // Re-render the panel with the new data
    const card = activeDeck[currentIndex];
    if (card && card.hanzi === hanzi) {
      renderInfoPanel(card);
    }
  } catch (e) {
    const notice = document.getElementById('ai-fallback-notice');
    if (notice) notice.innerHTML = `Failed: ${e.message}. <button class="ip-ai-btn" onclick="aiDeepDive('${hanzi}')">retry</button>`;
  }
}

function saveNote() {
  if (!activeDeck.length) return;
  const card = activeDeck[currentIndex];
  const note = document.getElementById('user-note')?.value || '';
  const cd = getCardData(card.hanzi);
  const prev = cd.note || '';
  if (note === prev) return; // unchanged — don't save, don't show "saved"
  cd.note = note;
  saveProgress();
  // Update note indicator on card without resetting infoPanelHistory
  const noteIcon = document.querySelector('.ip-note-icon');
  if (noteIcon) noteIcon.style.opacity = note.trim() ? '1' : '0.4';
  // Brief save confirmation (only when something actually changed)
  const indicator = document.getElementById('ip-note-saved');
  if (indicator) {
    indicator.classList.add('show');
    clearTimeout(indicator._t);
    indicator._t = setTimeout(() => indicator.classList.remove('show'), 1500);
  }
}

// ── AI TUTOR ──
let tutorHistory = [];

function loadTutorHistory() {
  try {
    const raw = getProfileData(lang().storagePrefix + '-tutor-history');
    if (raw) tutorHistory = JSON.parse(raw);
  } catch (e) { tutorHistory = []; }
}

function saveTutorHistory() {
  try {
    // Keep last 100 messages to avoid storage bloat
    const toSave = tutorHistory.slice(-100);
    setProfileData(lang().storagePrefix + '-tutor-history', JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save tutor history:', e);
  }
}

function renderTutorHistory() {
  // Render into both the inline area and overlay
  const containers = [document.getElementById('tutor-messages'), document.getElementById('tutor-messages-overlay')];
  if (!tutorHistory.length) return;
  const recent = tutorHistory.slice(-20);
  const html = recent.map(m =>
    `<div class="tutor-msg ${m.role === 'user' ? 'user' : 'ai'}">${escapeHtml(m.content)}</div>`
  ).join('');
  for (const c of containers) {
    if (c) { c.innerHTML = html; c.scrollTop = c.scrollHeight; }
  }
}

function sendTutorMsg() {
  const input = document.getElementById('tutor-input');
  const msg = input.value.trim();
  if (!msg) return;

  const key = getApiKey();
  if (!key) {
    alert('Please add an API key in Settings to use the AI tutor.\nSupported: Anthropic, OpenAI, or Google AI.');
    return;
  }

  input.value = '';

  // Use overlay container if open, else inline
  const container = document.getElementById('tutor-messages-overlay') || document.getElementById('tutor-messages');
  if (!container) return;

  // Add user message
  tutorHistory.push({ role: 'user', content: msg, card: activeDeck[currentIndex]?.hanzi || null, time: new Date().toISOString() });
  saveTutorHistory();

  container.innerHTML += `<div class="tutor-msg user">${escapeHtml(msg)}</div>`;
  container.innerHTML += `<div class="tutor-typing" id="tutor-typing"><span class="ip-loading"></span> thinking…</div>`;
  container.scrollTop = container.scrollHeight;

  // Build context
  const card = activeDeck[currentIndex];
  const context = card ? `The user is studying: ${card.hanzi} (${card.pinyin}) meaning "${card.english}".` : '';

  // API messages (strip metadata, keep role + content only)
  const apiMessages = tutorHistory.filter(m => m.role === 'user' || m.role === 'assistant').slice(-10).map(m => ({ role: m.role, content: m.content }));

  callAI({
    maxTokens: 800,
    system: `${lang().tutorSystemPrompt} ${context}`,
    messages: apiMessages
  }).then(reply => {
    tutorHistory.push({ role: 'assistant', content: reply, time: new Date().toISOString() });
    saveTutorHistory();

    const typing = document.getElementById('tutor-typing');
    if (typing) typing.remove();

    container.innerHTML += `<div class="tutor-msg ai">${escapeHtml(reply)}</div>`;
    container.scrollTop = container.scrollHeight;
  }).catch(e => {
    const typing = document.getElementById('tutor-typing');
    if (typing) typing.remove();
    container.innerHTML += `<div class="tutor-msg ai" style="color:var(--red)">Error: ${escapeHtml(e.message)}</div>`;
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
(function initDivider() {
  const panel = document.getElementById('info-panel');
  let startX, startW, dragging = false;
  const EDGE = 8; // px from left edge that triggers resize

  function isOnEdge(e) {
    const rect = panel.getBoundingClientRect();
    return e.clientX >= rect.left - EDGE && e.clientX <= rect.left + EDGE;
  }

  panel.addEventListener('mousedown', function(e) {
    if (!panel.classList.contains('open') || !isOnEdge(e)) return;
    e.preventDefault();
    startX = e.clientX;
    startW = panel.offsetWidth;
    dragging = true;
    panel.style.borderLeftColor = 'var(--accent)';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // Show resize cursor and border when hovering near edge
  panel.addEventListener('mousemove', function(e) {
    if (dragging) return;
    if (panel.classList.contains('open') && isOnEdge(e)) {
      panel.style.cursor = 'col-resize';
      panel.style.borderLeftColor = 'var(--accent)';
    } else {
      panel.style.cursor = '';
      if (!dragging) panel.style.borderLeftColor = '';
    }
  });
  panel.addEventListener('mouseleave', function() {
    if (!dragging) {
      panel.style.cursor = '';
      panel.style.borderLeftColor = '';
    }
  });

  function onMouseMove(e) {
    if (!dragging) return;
    const dx = startX - e.clientX;
    const newW = Math.max(240, Math.min(600, startW + dx));
    panel.style.width = newW + 'px';
  }

  function onMouseUp() {
    dragging = false;
    panel.style.borderLeftColor = '';
    // Save panel width for next open
    try { setProfileData('hanzi-info-width', panel.offsetWidth + ''); } catch(e) {}
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  // Touch support
  panel.addEventListener('touchstart', function(e) {
    const touch = e.touches[0];
    const rect = panel.getBoundingClientRect();
    if (touch.clientX > rect.left + EDGE) return;
    startX = touch.clientX;
    startW = panel.offsetWidth;
    dragging = true;
    panel.style.borderLeftColor = 'var(--accent)';
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!dragging) return;
    const dx = startX - e.touches[0].clientX;
    const newW = Math.max(240, Math.min(600, startW + dx));
    panel.style.width = newW + 'px';
  }, { passive: true });

  document.addEventListener('touchend', function() {
    if (!dragging) return;
    dragging = false;
    panel.style.borderLeftColor = '';
    try { setProfileData('hanzi-info-width', panel.offsetWidth + ''); } catch(e) {}
  });
})();

// ══════════════════════════════════════════
