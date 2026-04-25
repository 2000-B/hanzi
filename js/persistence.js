// PERSISTENCE (localStorage)
// ══════════════════════════════════════════
function saveProgress() {
  try {
    const data = JSON.parse(getProfileData(lang().storagePrefix + '-progress') || '{}');
    data.cardData = cardData;
    data.customDecks = {};
    for (const [name, cards] of Object.entries(decks)) {
      if (!name.match(/^hsk \d/)) data.customDecks[name] = cards;
    }
    setProfileData(lang().storagePrefix + '-progress', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save progress:', e);
    if (e.name === 'QuotaExceededError') {
      alert('Storage is full. Please export your progress (Settings → Export) and clear old data.');
    }
  }
}

function saveSession() {
  if (!sessionLog.length) return;
  try {
    const data = JSON.parse(getProfileData(lang().storagePrefix + '-progress') || '{}');
    if (!data.sessions) data.sessions = {};
    if (!data.sessions[activeDeckName]) data.sessions[activeDeckName] = [];
    const total = stats.correct + stats.wrong;
    data.sessions[activeDeckName].push({
      date: new Date().toISOString(),
      correct: stats.correct,
      wrong: stats.wrong,
      accuracy: total > 0 ? Math.round(stats.correct / total * 100) : 0,
      avgTime: stats.times.length > 0 ? +(stats.times.reduce((a, b) => a + b, 0) / stats.times.length / 1000).toFixed(1) : 0,
      mastered: stats.mastered.size,
      cardsAnswered: total,
      flagged: stats.reviewFlagged.size
    });
    setProfileData(lang().storagePrefix + '-progress', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

function loadProgress() {
  try {
    const raw = getProfileData(lang().storagePrefix + '-progress');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.cardData) cardData = data.cardData;
    if (data.customDecks) Object.assign(decks, data.customDecks);
    // FSRS migration — drop SM-2 fields, reset to "new" while preserving mastered.
    let migrated = 0;
    for (const k of Object.keys(cardData)) {
      const cd = cardData[k];
      if (cd && (cd.efactor !== undefined || cd.interval !== undefined)) {
        fsrsMigrateCard(cd);
        migrated++;
      }
    }
    if (migrated > 0) saveProgress();
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
}

// §10.1: Export/Import
function exportProgress() {
  try {
    const progress = getProfileData(lang().storagePrefix + '-progress') || '{}';
    const tutor = getProfileData(lang().storagePrefix + '-tutor-history') || '[]';
    const activeProfile = getActiveProfile();
    const profileName = activeProfile ? activeProfile.name : 'Default';
    const exportData = {
      profileName,
      language: currentLang,
      progress: JSON.parse(progress),
      tutorHistory: JSON.parse(tutor),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lang().storagePrefix}-backup-${profileName}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
}

function importProgress(input) {
  const file = input.files?.[0];
  if (!file) return;
  const activeProfile = getActiveProfile();
  const profileName = activeProfile ? activeProfile.name : 'Default';
  if (!confirm(`This will replace all progress for profile "${profileName}". Continue?`)) { input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      // Note if file was from a different profile
      if (data.profileName && data.profileName !== profileName) {
        console.info(`Importing backup from profile "${data.profileName}" into "${profileName}".`);
      }
      // Support new format (with progress key), old format (raw object), legacy (no wrapper)
      if (data.progress) {
        setProfileData(lang().storagePrefix + '-progress', JSON.stringify(data.progress));
        if (data.tutorHistory) {
          setProfileData(lang().storagePrefix + '-tutor-history', JSON.stringify(data.tutorHistory));
          loadTutorHistory();
        }
      } else {
        // Legacy format: the whole file is the progress object
        setProfileData(lang().storagePrefix + '-progress', reader.result);
      }
      loadProgress();
      renderSidebar();
      alert('Progress imported successfully.');
    } catch (e) {
      alert('Invalid backup file: ' + e.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function toggleSessionHistory() {
  const wrap = document.getElementById('session-history');
  const list = document.getElementById('session-history-list');
  if (!wrap || !list) return;
  const isOpen = wrap.style.display !== 'none';
  if (isOpen) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  // Gather sessions from all language prefixes
  const sessions = [];
  for (const prefix of ['hanzi', 'jp']) {
    try {
      const raw = getProfileData(prefix + '-progress');
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (!data.sessions) continue;
      for (const [deck, arr] of Object.entries(data.sessions)) {
        for (const s of arr) {
          sessions.push({ ...s, deck });
        }
      }
    } catch(e) {}
  }

  if (!sessions.length) {
    list.innerHTML = '<div class="sh-empty">no sessions yet</div>';
    return;
  }

  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sessions.slice(0, 50);
  list.innerHTML = recent.map(s => {
    const d = new Date(s.date);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `<div class="sh-row">
      <div class="sh-row-top"><span class="sh-deck">${s.deck}</span><span class="sh-date">${dateStr}</span></div>
      <div class="sh-row-stats">
        <span class="sh-stat" style="color:var(--green)">${s.correct}✓</span>
        <span class="sh-stat" style="color:var(--red)">${s.wrong}✗</span>
        <span class="sh-stat">${s.accuracy}%</span>
        <span class="sh-stat">${s.avgTime}s avg</span>
        ${s.mastered ? `<span class="sh-stat" style="color:var(--green)">+${s.mastered} mastered</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (key) setProfileData('hanzi-api-key', key);
  else removeProfileData('hanzi-api-key');
  _syncTutorBarVisibility();
}

function getApiKey() {
  return getProfileData('hanzi-api-key') || '';
}

// ── Multi-provider AI abstraction ──
const AI_PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    prefix: 'sk-ant-',
    model: 'claude-sonnet-4-20250514',
    call: async (key, model, messages, system, maxTokens) => {
      const body = { model, max_tokens: maxTokens, messages };
      if (system) body.system = system;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${r.status}`); }
      const data = await r.json();
      return data.content?.[0]?.text || '';
    }
  },
  openai: {
    name: 'OpenAI',
    prefix: 'sk-',
    model: 'gpt-4o-mini',
    call: async (key, model, messages, system, maxTokens) => {
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: msgs })
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${r.status}`); }
      const data = await r.json();
      return data.choices?.[0]?.message?.content || '';
    }
  },
  google: {
    name: 'Google',
    prefix: 'AIza',
    model: 'gemini-2.0-flash',
    call: async (key, model, messages, system, maxTokens) => {
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      const body = { contents, generationConfig: { maxOutputTokens: maxTokens } };
      if (system) body.systemInstruction = { parts: [{ text: system }] };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${r.status}`); }
      const data = await r.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  }
};

function detectProvider(key) {
  if (!key) return null;
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('AIza')) return 'google';
  if (key.startsWith('sk-')) return 'openai';
  return 'anthropic'; // default fallback
}

/**
 * Unified AI call. Auto-detects provider from API key prefix.
 * @param {Object} opts - { messages, system?, maxTokens? }
 * @returns {Promise<string>} The response text
 */
async function callAI(opts) {
  const key = getApiKey();
  if (!key) throw new Error('No API key set');
  const providerId = detectProvider(key);
  const provider = AI_PROVIDERS[providerId];
  const model = provider.model;
  return provider.call(key, model, opts.messages, opts.system || null, opts.maxTokens || 1000);
}

// ══════════════════════════════════════════
