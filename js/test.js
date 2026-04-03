// TEST MODE
// ══════════════════════════════════════════
function initTestCard() {
  if (!activeDeck.length) return;
  const card = activeDeck[currentIndex];

  document.getElementById('test-hanzi').textContent = card.hanzi;
  document.getElementById('test-pinyin').textContent = showPinyin ? card.pinyin : '';
  // Show source deck label in review mode
  const testSub = document.querySelector('.test-sub');
  if (activeDeckName === '⟳ review' && card._sourceDeck) {
    testSub.textContent = 'from: ' + card._sourceDeck;
  } else {
    testSub.textContent = 'what does this mean?';
  }
  document.getElementById('result-flash').textContent = '';
  document.getElementById('next-test-btn').style.display = 'none';
  document.getElementById('rating-btns').style.display = 'none';

  // Timer
  const timerWrap = document.getElementById('timer-bar-wrap');
  timerWrap.classList.toggle('active', showTimer);
  if (showTimer) startTimer();

  if (currentFormat === 'mc') {
    document.getElementById('mc-options').style.display = '';
    document.getElementById('type-wrap').classList.remove('active');
    renderMCOptions(card);
  } else {
    document.getElementById('mc-options').style.display = 'none';
    document.getElementById('type-wrap').classList.add('active');
    document.getElementById('type-answer').value = '';
    document.getElementById('type-answer').focus();
  }

  testStartTime = Date.now();
}

function renderMCOptions(card) {
  const options = document.getElementById('mc-options');
  options.innerHTML = '';

  // Get 3 distractors from current deck
  const others = activeDeck.filter(c => c.hanzi !== card.hanzi);
  const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
  const all = [...shuffled, card].sort(() => Math.random() - 0.5);

  all.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'mc-option';
    btn.textContent = c.english;
    btn.onclick = () => handleAnswer(c.hanzi === card.hanzi, btn, card);
    options.appendChild(btn);
  });
}

function handleAnswer(correct, btn, card) {
  if (timerInterval) clearInterval(timerInterval);
  const elapsed = Date.now() - testStartTime;
  stats.times.push(elapsed);

  const cd = getCardData(card.hanzi);

  if (correct) {
    stats.correct++;
    stats.streak++;
    cd.correct = (cd.correct || 0) + 1;
    btn.classList.add('correct');

    // Test-mode mastery: 3 consecutive correct
    if (cd.correct >= 3 && !cd.mastered) {
      cd.mastered = true;
      cd.masteredDate = new Date().toISOString();
      cd.interval = 1;
      cd.efactor = 2.5;
      cd.due = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      stats.mastered.add(card.hanzi);
    }
  } else {
    stats.wrong++;
    stats.streak = 0;
    cd.wrong = (cd.wrong || 0) + 1;
    cd.correct = 0; // reset consecutive counter
    btn.classList.add('wrong');
    // Flag for review
    cd.reviewFlag = true;
    stats.reviewFlagged.add(card.hanzi);
  }

  // Flag slow responses
  if (elapsed > SLOW_THRESHOLD) {
    cd.reviewFlag = true;
    stats.reviewFlagged.add(card.hanzi);
  }

  // Show correct answer
  document.querySelectorAll('.mc-option').forEach(b => {
    b.disabled = true;
    if (b.textContent === card.english && !b.classList.contains('correct')) {
      b.classList.add('correct');
    }
  });

  const flash = document.getElementById('result-flash');
  flash.textContent = correct ? '✓ correct' : '✗ wrong — ' + card.english;
  flash.style.color = correct ? 'var(--green)' : 'var(--red)';

  sessionLog.push({ hanzi: card.hanzi, correct, time: elapsed });
  saveProgress();
  updateStats();

  if (activeDeckName === '⟳ review' || showDifficultyRatings) {
    document.getElementById('next-test-btn').style.display = 'none';
    document.getElementById('rating-btns').style.display = '';
  } else {
    document.getElementById('next-test-btn').style.display = '';
    document.getElementById('rating-btns').style.display = 'none';
  }
}

function submitTyping() {
  const input = document.getElementById('type-answer');
  const answer = input.value.trim().toLowerCase();
  if (!answer) return;

  const card = activeDeck[currentIndex];
  const correct = fuzzyMatch(answer, card.english);

  // Create a fake button element for reuse
  const flash = document.getElementById('result-flash');
  const elapsed = Date.now() - testStartTime;
  if (timerInterval) clearInterval(timerInterval);
  stats.times.push(elapsed);

  const cd = getCardData(card.hanzi);

  if (correct) {
    stats.correct++;
    stats.streak++;
    cd.correct = (cd.correct || 0) + 1;
    flash.textContent = '✓ correct';
    flash.style.color = 'var(--green)';
    if (cd.correct >= 3 && !cd.mastered) {
      cd.mastered = true;
      cd.masteredDate = new Date().toISOString();
      cd.interval = 1;
      cd.efactor = 2.5;
      cd.due = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      stats.mastered.add(card.hanzi);
    }
  } else {
    stats.wrong++;
    stats.streak = 0;
    cd.wrong = (cd.wrong || 0) + 1;
    cd.correct = 0;
    cd.reviewFlag = true;
    stats.reviewFlagged.add(card.hanzi);
    flash.textContent = '✗ wrong — ' + card.english;
    flash.style.color = 'var(--red)';
  }

  if (elapsed > SLOW_THRESHOLD) {
    cd.reviewFlag = true;
    stats.reviewFlagged.add(card.hanzi);
  }

  sessionLog.push({ hanzi: card.hanzi, correct, time: elapsed });
  saveProgress();
  updateStats();
  input.disabled = true;
  if (activeDeckName === '⟳ review' || showDifficultyRatings) {
    document.getElementById('next-test-btn').style.display = 'none';
    document.getElementById('rating-btns').style.display = '';
  } else {
    document.getElementById('next-test-btn').style.display = '';
    document.getElementById('rating-btns').style.display = 'none';
  }
}

function fuzzyMatch(answer, target) {
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const a = normalize(answer);
  const parts = target.split(/\s*\/\s*/).map(normalize);
  return parts.some(p => a === p || p.includes(a) || a.includes(p));
}

function nextTestCard() {
  currentIndex++;
  if (currentIndex >= activeDeck.length) {
    // Session complete
    saveSession();
    showSessionReport();
    return;
  }
  document.getElementById('type-answer').disabled = false;
  initTestCard();
}

function startTimer() {
  const bar = document.getElementById('timer-bar');
  bar.style.width = '100%';
  bar.style.background = 'var(--accent)';
  let remaining = 10000;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remaining -= 100;
    const pct = Math.max(0, remaining / 10000 * 100);
    bar.style.width = pct + '%';
    if (pct < 30) bar.style.background = 'var(--red)';
    else if (pct < 60) bar.style.background = 'var(--orange)';
    if (remaining <= 0) {
      clearInterval(timerInterval);
      // Auto-fail on timeout
      const card = activeDeck[currentIndex];
      if (card) handleTimeout(card);
    }
  }, 100);
}

function handleTimeout(card) {
  const cd = getCardData(card.hanzi);
  stats.wrong++;
  stats.streak = 0;
  cd.wrong = (cd.wrong || 0) + 1;
  cd.correct = 0;
  cd.reviewFlag = true;
  stats.reviewFlagged.add(card.hanzi);

  const flash = document.getElementById('result-flash');
  flash.textContent = '⏱ time\'s up — ' + card.english;
  flash.style.color = 'var(--orange)';

  sessionLog.push({ hanzi: card.hanzi, correct: false, time: 10000 });
  saveProgress();
  updateStats();
  if (activeDeckName === '⟳ review' || showDifficultyRatings) {
    document.getElementById('next-test-btn').style.display = 'none';
    document.getElementById('rating-btns').style.display = '';
  } else {
    document.getElementById('next-test-btn').style.display = '';
    document.getElementById('rating-btns').style.display = 'none';
  }
}

function updateStats() {
  document.getElementById('stat-correct').textContent = stats.correct;
  document.getElementById('stat-wrong').textContent = stats.wrong;
  const total = stats.correct + stats.wrong;
  document.getElementById('stat-accuracy').textContent = total > 0 ? Math.round(stats.correct / total * 100) + '%' : '—';
  document.getElementById('stat-speed').textContent = stats.times.length > 0 ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length / 1000).toFixed(1) + 's' : '—';
  document.getElementById('stat-streak').textContent = stats.streak;
}

function showSessionReport() {
  updateReviewBadge();
  document.getElementById('session-modal').classList.add('open');
  const content = document.getElementById('session-modal-content');
  const total = stats.correct + stats.wrong;
  const accuracy = total > 0 ? Math.round(stats.correct / total * 100) : 0;
  const avgTime = stats.times.length > 0 ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length / 1000).toFixed(1) : '—';

  const flagged = sessionLog.filter(l => !l.correct);
  content.innerHTML = `
    <div class="sr-stats">
      <div class="sr-stat"><div class="sr-stat-label">correct</div><div class="sr-stat-value" style="color:var(--green)">${stats.correct}</div></div>
      <div class="sr-stat"><div class="sr-stat-label">wrong</div><div class="sr-stat-value" style="color:var(--red)">${stats.wrong}</div></div>
      <div class="sr-stat"><div class="sr-stat-label">accuracy</div><div class="sr-stat-value" style="color:var(--accent)">${accuracy}%</div></div>
      <div class="sr-stat"><div class="sr-stat-label">avg time</div><div class="sr-stat-value" style="color:var(--text)">${avgTime}s</div></div>
    </div>
    ${flagged.length > 0 ? `
      <div class="sr-flagged-title">flagged for review</div>
      ${flagged.map(l => `
        <div class="sr-flagged-row">
          <span class="sr-flagged-hanzi">${l.hanzi}</span>
          <span style="flex:1;font-size:13px;color:var(--text2)">${cardData[l.hanzi]?.english || ''}</span>
          <span style="font-size:12px;color:var(--text3)">${(l.time / 1000).toFixed(1)}s</span>
        </div>
      `).join('')}
    ` : '<div class="sr-perfect">perfect score! 🎉</div>'}
  `;
}

function closeSessionModal() {
  document.getElementById('session-modal').classList.remove('open');
  setMode('study');
}

// ══════════════════════════════════════════
// RATE CARD (SM-2)
// ══════════════════════════════════════════
function rateCard(q) {
  const card = activeDeck[currentIndex];
  if (!card) return;
  const cd = getCardData(card.hanzi);
  applySM2(cd, q);
  saveProgress();
  updateReviewBadge();
  document.getElementById('rating-btns').style.display = 'none';
  nextTestCard();
}

function toggleDiffRatings() {
  showDifficultyRatings = !showDifficultyRatings;
  setProfileData('hanzi-diff-ratings', showDifficultyRatings ? '1' : '');
  syncSettingsUI();
}

// ══════════════════════════════════════════
