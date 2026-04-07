// ANALYTICS DASHBOARD
// ══════════════════════════════════════════
let _analyticsChart = null;

function showAnalytics() {
  const view = document.getElementById('analytics-view');
  if (view.classList.contains('open')) { closeAnalytics(); return; }
  if (currentMode === 'test' && sessionLog.length > 0) saveSession();
  view.classList.add('open');
  const btn = document.getElementById('btn-analytics');
  if (btn) btn.classList.add('active');
  // Render after panel transition starts so chart gets correct dimensions
  requestAnimationFrame(() => renderAnalytics());
}

function closeAnalytics() {
  document.getElementById('analytics-view').classList.remove('open');
  const btn = document.getElementById('btn-analytics');
  if (btn) btn.classList.remove('active');
}

function renderAnalytics() {
  // ── Load session data ──
  let allSessions = [];
  try {
    const raw = getProfileData(lang().storagePrefix + '-progress');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.sessions) {
        for (const [deck, sessions] of Object.entries(data.sessions)) {
          sessions.forEach(s => allSessions.push({ ...s, deck }));
        }
      }
    }
  } catch(e) {}
  allSessions.sort((a, b) => a.date.localeCompare(b.date));

  // ── Aggregate stats from cardData ──
  let totalStudied = 0, totalMastered = 0, totalCorrect = 0, totalWrong = 0;
  for (const cd of Object.values(cardData)) {
    if ((cd.correct || 0) + (cd.wrong || 0) > 0) totalStudied++;
    if (cd.mastered) totalMastered++;
    totalCorrect += cd.correct || 0;
    totalWrong += cd.wrong || 0;
  }
  const overallAcc = (totalCorrect + totalWrong) > 0
    ? Math.round(totalCorrect / (totalCorrect + totalWrong) * 100) : 0;
  const dueCount = getReviewCards().length;

  // ── Stat cards ──
  document.getElementById('dash-stat-cards').innerHTML = [
    { value: totalMastered, label: 'mastered' },
    { value: totalStudied,  label: 'cards studied' },
    { value: dueCount,      label: 'due for review' },
    { value: overallAcc + '%', label: 'overall accuracy' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-card-value">${s.value}</div>
      <div class="stat-card-label">${s.label}</div>
    </div>
  `).join('');

  // ── Chart ──
  const isLight = document.body.classList.contains('light');
  const gridColor  = isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.06)';
  const tickColor  = isLight ? '#9ca3af'            : '#4a4a60';
  const recent = allSessions.slice(-30);

  const canvas = document.getElementById('accuracy-chart');
  if (_analyticsChart) { _analyticsChart.destroy(); _analyticsChart = null; }

  if (recent.length > 0) {
    _analyticsChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: recent.map(s => {
          const d = new Date(s.date);
          return (d.getMonth()+1) + '/' + d.getDate();
        }),
        datasets: [{
          data: recent.map(s => s.accuracy),
          borderColor: '#4f7fff',
          backgroundColor: 'rgba(79,127,255,0.08)',
          borderWidth: 2,
          pointRadius: recent.length > 15 ? 2 : 4,
          pointBackgroundColor: '#4f7fff',
          tension: 0.35,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => ctx.parsed.y + '%' }
        }},
        scales: {
          y: {
            min: 0, max: 100,
            ticks: { color: tickColor, callback: v => v + '%', stepSize: 25 },
            grid: { color: gridColor },
            border: { display: false },
          },
          x: {
            ticks: { color: tickColor, maxTicksLimit: 10, maxRotation: 0 },
            grid: { display: false },
            border: { display: false },
          }
        }
      }
    });
  } else {
    canvas.style.display = 'none';
    canvas.parentElement.innerHTML = '<div class="dash-empty">no sessions yet — complete a test to see your progress</div>';
  }

  // ── Session history table ──
  const el = document.getElementById('session-history-table');
  if (!allSessions.length) {
    el.innerHTML = '<div class="dash-empty">no sessions recorded yet</div>';
    return;
  }
  const rows = allSessions.slice(-50).reverse();
  el.innerHTML = `
    <div class="session-row sh">
      <span>date</span><span>deck</span><span>cards</span><span>accuracy</span><span class="col-speed">avg speed</span><span class="col-mastered">mastered</span>
    </div>
    ${rows.map(s => {
      const d = new Date(s.date);
      const dateStr = (d.getMonth()+1) + '/' + d.getDate() + ' ' + d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
      const accClass = s.accuracy >= 70 ? 'acc-val' : 'acc-val low';
      return `<div class="session-row">
        <span style="color:var(--text3)">${dateStr}</span>
        <span class="deck-tag">${s.deck}</span>
        <span>${s.cardsAnswered}</span>
        <span class="${accClass}">${s.accuracy}%</span>
        <span class="col-speed">${s.avgTime}s</span>
        <span class="col-mastered" style="color:var(--green)">${s.mastered > 0 ? '+' + s.mastered : '—'}</span>
      </div>`;
    }).join('')}
  `;
}

// ══════════════════════════════════════════
