// DATA LOADING
// ══════════════════════════════════════════
async function loadJSON(path) {
  try {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn('Failed to load', path, e);
    return null;
  }
}

async function loadAllData() {
  // HSK 1 is embedded above — only load HSK 2 and CEDICT from JSON
  const [hsk2, cedict] = await Promise.all([
    loadJSON('data/hsk2.json'),
    loadJSON('data/cedict.json')
  ]);

  if (hsk2) HSK_DATA[2] = hsk2;
  if (cedict) CEDICT = cedict;

  // Load HSK 3-6 in background (non-blocking)
  for (let level = 3; level <= 6; level++) {
    loadJSON(`data/hsk${level}.json`).then(data => {
      if (data) {
        HSK_DATA[level] = data;
        renderSidebar(); // re-render to show the loaded level
      }
    });
  }

  // Load enriched data if available
  loadJSON('data/hsk-enriched.json').then(data => {
    if (data) ENRICHED = data;
  });
  loadJSON('data/jlpt-enriched.json').then(data => {
    if (data) ENRICHED_JP = data;
  });
  loadJSON('data/jp-dict.json').then(data => {
    if (data) JP_DICT = data;
  });
}

// ══════════════════════════════════════════
