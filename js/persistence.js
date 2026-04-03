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

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (key) setProfileData('hanzi-api-key', key);
  else removeProfileData('hanzi-api-key');
  _syncTutorBarVisibility();
}

function getApiKey() {
  return getProfileData('hanzi-api-key') || '';
}

// ══════════════════════════════════════════
