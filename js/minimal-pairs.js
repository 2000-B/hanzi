// MINIMAL PAIRS — characters/words sharing a base syllable across tones
// ══════════════════════════════════════════
// Built in-session at language switch / startup. Keyed by tone-stripped
// syllable so a lookup like `MINIMAL_PAIRS['ma']` returns every entry whose
// base syllable is "ma" regardless of tone (mā/má/mǎ/mà/ma).
//
// Scope: single-syllable cards from HSK levels only. Multi-character words
// are excluded — tone practice with minimal pairs is most useful at the
// single-syllable level. CEDICT entries are excluded to keep the index small
// and focused on study material.

let MINIMAL_PAIRS = {};

/**
 * Strip tone marks (diacritics) and trailing tone numbers from a single
 * pinyin syllable to get the base form.
 *   mā / ma1 / ma → 'ma'
 *   nǐ / ni3 → 'ni'
 *   shí → 'shi'
 */
function pinyinBaseSyllable(syllable) {
  if (!syllable) return '';
  let s = syllable.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  s = s.replace(/[1-5]$/, '');
  return s.trim();
}

function buildMinimalPairsIndex() {
  MINIMAL_PAIRS = {};
  if (typeof HSK_DATA === 'undefined' || currentLang !== 'zh') return;
  for (const [level, cards] of Object.entries(HSK_DATA)) {
    if (!cards) continue;
    for (const card of cards) {
      const syllables = splitPinyinSyllables(card.pinyin);
      if (syllables.length !== 1) continue; // single-syllable only
      const base = pinyinBaseSyllable(syllables[0]);
      if (!base) continue;
      if (!MINIMAL_PAIRS[base]) MINIMAL_PAIRS[base] = [];
      MINIMAL_PAIRS[base].push({
        hanzi: card.hanzi,
        pinyin: card.pinyin,
        english: card.english,
        tone: pinyinSyllableTone(card.pinyin),
        deck: 'HSK ' + level,
      });
    }
  }
  // Sort each group by tone (1, 2, 3, 4, neutral=0) for predictable display order.
  for (const k of Object.keys(MINIMAL_PAIRS)) {
    MINIMAL_PAIRS[k].sort((a, b) => {
      const order = (t) => (t === 0 ? 5 : t); // neutral last
      return order(a.tone) - order(b.tone);
    });
  }
}

/**
 * Return minimal-pair entries for a single-syllable Mandarin card, excluding
 * the card itself. For multi-syllable cards, returns []. For Japanese, [].
 */
function findMinimalPairs(card) {
  if (!card || currentLang !== 'zh') return [];
  const syllables = splitPinyinSyllables(card.pinyin);
  if (syllables.length !== 1) return [];
  const base = pinyinBaseSyllable(syllables[0]);
  const pool = MINIMAL_PAIRS[base] || [];
  return pool.filter(p => p.hanzi !== card.hanzi);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { pinyinBaseSyllable, buildMinimalPairsIndex, findMinimalPairs };
}
