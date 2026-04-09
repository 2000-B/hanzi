// REVIEW HELP TOOLTIP
// ══════════════════════════════════════════
function toggleReviewHelp(el) {
  const tooltip = document.getElementById('review-help-tooltip');
  const isOpen = tooltip.classList.toggle('open');
  if (isOpen) {
    const r = el.getBoundingClientRect();
    tooltip.style.top = r.bottom + 6 + 'px';
    tooltip.style.left = r.left + 'px';
    setTimeout(() => document.addEventListener('click', _closeReviewHelp, { once: true }), 0);
    setTimeout(() => document.addEventListener('contextmenu', _closeReviewHelp, { once: true }), 0);
  }
}
function _closeReviewHelp() {
  document.getElementById('review-help-tooltip').classList.remove('open');
}

// CSV IMPORT
// ══════════════════════════════════════════
function loadCSV(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split('\n').map(l => l.trim()).filter(l => l);
    const cards = [];
    let skipped = 0;

    lines.forEach((line, i) => {
      // Skip header if it looks like one
      if (i === 0 && line.toLowerCase().startsWith('hanzi')) return;
      const parts = line.split(',');
      if (parts.length < 3) { skipped++; return; }
      const hanzi = parts[0].trim();
      const pinyin = parts[1].trim();
      const english = parts.slice(2).join(',').trim(); // handle commas in definitions
      if (!hanzi || !pinyin || !english) { skipped++; return; }
      cards.push({ hanzi, pinyin, english });
    });

    if (cards.length === 0) {
      alert('No valid cards found in CSV. Expected format: hanzi,pinyin,english');
      input.value = '';
      return;
    }

    const name = '📁 ' + file.name.replace('.csv', '');
    decks[name] = cards;
    saveProgress();
    selectDeck(name);
    renderSidebar();

    if (skipped > 0) {
      alert(`Imported ${cards.length} cards. ${skipped} row(s) skipped (missing columns).`);
    }

    input.value = '';
  };
  reader.readAsText(file);
}

// ══════════════════════════════════════════
// AI DECK GENERATION (stub — needs API key)
// ══════════════════════════════════════════
async function generateDeck() {
  const topic = document.getElementById('gen-topic').value.trim();
  if (!topic) return;
  const key = getApiKey();
  if (!key) {
    alert('Please add an API key in Settings to use AI features.\nSupported: Anthropic, OpenAI, or Google AI.');
    return;
  }

  const btn = document.getElementById('gen-btn');
  btn.textContent = 'generating…';
  btn.disabled = true;

  try {
    const text = await callAI({
      maxTokens: 2000,
      messages: [{
        role: 'user',
        content: `Generate a Chinese vocabulary deck of 15-20 words about "${topic}". Return ONLY a JSON array, no markdown, no explanation. Each item: {"hanzi":"...","pinyin":"...","english":"..."}`
      }]
    });

    const cards = JSON.parse(text.replace(/```json?|```/g, '').trim());

    if (!Array.isArray(cards) || cards.length === 0) throw new Error('Invalid response');

    const name = '✦ ' + topic;
    decks[name] = cards;
    saveProgress();
    buildSearchIndex();
    selectDeck(name);
    renderSidebar();
    document.getElementById('gen-topic').value = '';
  } catch (e) {
    alert('Failed to generate deck: ' + e.message);
  } finally {
    btn.textContent = 'generate with ai';
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════
// DECK RENAME
// ══════════════════════════════════════════
function startRenameDeck(item, oldName, cards) {
  const nameSpan = item.querySelector('.deck-name');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = oldName;
  input.className = 'gen-input';
  input.style.cssText = 'width:100%;font-size:12px;padding:4px 8px';
  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  const finish = () => {
    const newName = input.value.trim() || oldName;
    if (newName !== oldName) {
      delete decks[oldName];
      decks[newName] = cards;
      if (activeDeckName === oldName) activeDeckName = newName;
      saveProgress();
    }
    renderSidebar();
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') finish(); });
}

// ══════════════════════════════════════════
