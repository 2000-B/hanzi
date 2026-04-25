// TONE VISUALIZATION — synthetic mnemonic glyphs for Mandarin tones
// ══════════════════════════════════════════
// Pure functions. No DOM dependency, no audio, no pitch extraction.
// Each glyph is a small contour shape that mirrors the tone's pitch trajectory:
//   1 → high-flat ‾
//   2 → rising  ⁄
//   3 → dip    ⌣ (slight fall then rise)
//   4 → fall   ⁀ (sharp downward)
//   0 → neutral · (short subdued mark)
// Glyphs are stroke-only SVG so they inherit color via `currentColor`.

const TONE_PATHS = {
  1: 'M2 4 L14 4',                                    // high flat
  2: 'M2 9 Q5 4 14 3',                                // rising curve
  3: 'M2 4 Q5 11 8 9 Q11 7 14 9',                     // dip then rise
  4: 'M2 3 Q4 4 14 11',                               // sharp downward
  0: 'M5 7.5 L11 7.5',                                // short flat (neutral)
};

const TONE_VIEWBOX = '0 0 16 14';

/** Extract a tone number (0–4) from a pinyin syllable based on its tone-marked vowel. */
function pinyinSyllableTone(syllable) {
  if (!syllable) return 0;
  // Numeric notation (e.g., "ni3"): trailing digit wins.
  const numMatch = syllable.match(/[1-5]$/);
  if (numMatch) {
    const n = parseInt(numMatch[0], 10);
    return n === 5 ? 0 : n; // 5 in numeric notation = neutral
  }
  // Diacritic notation: scan the syllable for a marked vowel.
  // ā ē ī ō ū ǖ → 1; á é í ó ú ǘ → 2; ǎ ě ǐ ǒ ǔ ǚ → 3; à è ì ò ù ǜ → 4
  const marks = {
    1: 'āēīōūǖĀĒĪŌŪǕ',
    2: 'áéíóúǘÁÉÍÓÚǗ',
    3: 'ǎěǐǒǔǚǍĚǏǑǓǙ',
    4: 'àèìòùǜÀÈÌÒÙǛ',
  };
  for (const [tone, chars] of Object.entries(marks)) {
    for (const ch of chars) {
      if (syllable.includes(ch)) return parseInt(tone, 10);
    }
  }
  return 0; // no marker → neutral
}

/** Split a multi-syllable pinyin string into syllables, preserving order. */
function splitPinyinSyllables(pinyin) {
  if (!pinyin) return [];
  // Pinyin syllables are space-separated when present; fall back to whole string otherwise.
  return pinyin.trim().split(/\s+/).filter(Boolean);
}

/** Return a complete <svg> string for the given tone (0–4). */
function toneGlyphSVG(tone, opts) {
  const cls = (opts && opts.className) || 'tone-glyph';
  const path = TONE_PATHS[tone] != null ? TONE_PATHS[tone] : TONE_PATHS[0];
  const aria = `tone ${tone || 'neutral'}`;
  return `<svg class="${cls}" viewBox="${TONE_VIEWBOX}" fill="none" aria-label="${aria}">
    <path d="${path}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/**
 * Render a pinyin string with each syllable followed by its tone glyph (legacy
 * inline format — kept for places that still want compact, per-syllable glyphs).
 */
function pinyinWithToneGlyphs(pinyin, opts) {
  if (currentLang !== 'zh') return pinyin || '';
  const syllables = splitPinyinSyllables(pinyin);
  if (!syllables.length) return pinyin || '';
  return syllables.map(s => {
    const tone = pinyinSyllableTone(s);
    return `<span class="pinyin-syllable">${s}${toneGlyphSVG(tone, opts)}</span>`;
  }).join(' ');
}

/**
 * Render the full pitch contour for a pinyin string as a single SVG, drawn
 * with one path per syllable inside one `<svg>`. The viewBox auto-sizes to
 * the syllable count so multi-character words stretch horizontally and the
 * pitch trajectory reads continuously across the word.
 *
 * Returns '' for non-Mandarin contexts or empty input.
 */
function tonePitchLineSVG(pinyin, opts) {
  if (currentLang !== 'zh') return '';
  const syllables = splitPinyinSyllables(pinyin);
  if (!syllables.length) return '';
  const SYL_W = 16; // each syllable's path uses x=0..16 in its own coordinate space
  const GAP = 6;   // small visual breath between syllables
  const HEIGHT = 14;
  const total = syllables.length * SYL_W + Math.max(0, syllables.length - 1) * GAP;
  const cls = (opts && opts.className) || 'tone-pitch-line';
  const segs = syllables.map((s, i) => {
    const tone = pinyinSyllableTone(s);
    const path = TONE_PATHS[tone] != null ? TONE_PATHS[tone] : TONE_PATHS[0];
    const tx = i * (SYL_W + GAP);
    return `<g transform="translate(${tx},0)"><path d="${path}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }).join('');
  return `<svg class="${cls}" viewBox="0 0 ${total} ${HEIGHT}" fill="none" preserveAspectRatio="xMidYMid meet" aria-label="tone contour">${segs}</svg>`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TONE_PATHS, TONE_VIEWBOX, pinyinSyllableTone, splitPinyinSyllables, toneGlyphSVG, pinyinWithToneGlyphs, tonePitchLineSVG };
}
