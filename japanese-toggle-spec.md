# Japanese Language Toggle — Implementation Spec

> **Purpose:** Add a functional language toggle (Chinese ↔ Japanese) to 汉字学习 so the same app architecture serves both HSK (Chinese) and JLPT (Japanese) learners.
>
> **Constraint:** This is a data swap, not a UI rewrite. The card engine, spaced repetition, test modes, and layout stay the same. Language-specific differences are driven by a config object.

---

## Architecture Overview

A global `LANG_CONFIG` object holds all language-specific strings, field mappings, and settings. A `currentLang` variable (`'zh'` or `'ja'`) selects the active config. Switching languages swaps the config, reloads sidebar data, and re-renders the UI. Per-language data (progress, custom decks, tutor history) is isolated via namespaced localStorage keys. Shared settings (theme, API key, test format, timer) are language-neutral.

### Card data normalization

The app's card engine reads `card.hanzi` and `card.pinyin` everywhere (~50+ references). Rather than rewriting all of these, JLPT data is normalized at load time:

- `kanji` → `hanzi`
- `romaji` → `pinyin`
- `kana` preserved as `card.kana` (bonus field for future use)

This means all existing card functions (renderCard, renderTest, cardData keying, mastery tracking, search, context strip, navigateToChar) work without modification.

### LANG_CONFIG shape

```javascript
const LANG_CONFIGS = {
  zh: {
    id: 'zh',
    headerTitle: '汉字学习',
    pageTitle: '汉字学习 — vocabulary mastery',
    readingLabel: 'pinyin',          // used in settings labels
    characterLabel: 'hanzi',         // used in search placeholder, UI text
    levelSystem: 'HSK',
    levelPrefix: 'HSK ',             // badge display: "HSK 3"
    levels: [1, 2, 3, 4, 5, 6],     // display order (ascending)
    ttsLang: 'zh-CN',
    ttsVoicePrefix: 'zh',
    storagePrefix: 'hanzi',          // localStorage key prefix
    searchPlaceholder: 'search hanzi, pinyin, english…',
    tutorSystemPrompt: 'You are a helpful Chinese language tutor. Keep answers concise and focused.',
    showReadingLabel: 'show pinyin',
    font: "'Noto Sans SC', sans-serif",
  },
  ja: {
    id: 'ja',
    headerTitle: '日本語学習',
    pageTitle: '日本語学習 — vocabulary mastery',
    readingLabel: 'romaji',
    characterLabel: 'kanji',
    levelSystem: 'JLPT',
    levelPrefix: 'JLPT N',          // badge display: "JLPT N5"
    levels: [5, 4, 3, 2, 1],        // display order (easiest first — N5 is beginner)
    ttsLang: 'ja',
    ttsVoicePrefix: 'ja',
    storagePrefix: 'jp',
    searchPlaceholder: 'search kanji, romaji, english…',
    tutorSystemPrompt: 'You are a helpful Japanese language tutor. Keep answers concise and focused.',
    showReadingLabel: 'show romaji',
    font: "'Noto Sans JP', sans-serif",  // add to font imports
  }
};
```

---

## Implementation Phases

### Phase 1: Language config object + state toggle

**What:** Create `LANG_CONFIGS` and `currentLang`. Wire the settings language pill to be functional.

**Details:**
- Add `LANG_CONFIGS` object (see shape above) near the top of the JS section
- Add `let currentLang = localStorage.getItem('app-lang') || 'zh';`
- Add helper: `function lang() { return LANG_CONFIGS[currentLang]; }`
- Remove `disabled` attribute from the Japanese pill button in settings
- Add `onclick` handlers to both language pill buttons
- `switchLanguage(langId)` function:
  1. Set `currentLang = langId`
  2. Save to `localStorage.setItem('app-lang', langId)`
  3. Update active pill button styling
  4. Reload data (sidebar, enriched, dictionary)
  5. Re-render: sidebar, current card, info panel, header title, search placeholder
  6. Clear active deck and current card (user selects a new deck after switching)

**Test:** Toggle between Chinese and Japanese in settings. Header title changes. Sidebar shows correct level system. Toggling back restores Chinese state.

---

### Phase 2: Card data normalization

**What:** Normalize JLPT vocab data at load time so `card.hanzi` and `card.pinyin` work universally.

**Details:**
- When loading JLPT data (from embedded array or fetched JSON), map each entry:
  ```javascript
  jlptCards.map(entry => ({
    hanzi: entry.kanji,
    pinyin: entry.romaji,
    english: entry.english,
    kana: entry.kana,       // preserved for info panel / future kana toggle
    jlpt: entry.jlpt        // level number
  }))
  ```
- Store in `JLPT_DATA[level]` (parallel to `HSK_DATA[level]`)
- The rest of the card engine sees `card.hanzi` and `card.pinyin` and works unchanged

**Test:** Load a JLPT N5 deck. Cards display kanji on front, romaji below. Mastery, test mode, and card navigation all work.

---

### Phase 3: Japanese dictionary pipeline (JMdict → jp-dict.json)

**What:** Build a Node.js script that produces a compact Japanese dictionary file, parallel to CEDICT for Chinese.

**Details:**
- Input: JMdict XML or a pre-processed JSON extract (freely available)
- Output: `data/jp-dict.json` — keyed by kanji string
  ```json
  {
    "医者": { "kana": "いしゃ", "defs": ["doctor", "physician"], "jlpt": 5 },
    "食べる": { "kana": "たべる", "defs": ["to eat"], "jlpt": 5 }
  }
  ```
- Script: `build-jp-dict.js` in repo root, similar pattern to existing CEDICT build
- At runtime, loaded the same way CEDICT is — fetched and cached by service worker
- In code: `JP_DICT` object, used in place of `CEDICT` when `currentLang === 'ja'`

**Test:** Info panel for a Japanese card shows definitions from `JP_DICT` where enriched data doesn't cover it. Navigating to a related character that isn't in the enriched set still shows basic definitions.

---

### Phase 4: JLPT data loading + sidebar

**What:** Load JLPT N5 vocab and render the sidebar with JLPT levels instead of HSK.

**Details:**
- Embed JLPT N5 data (from `jlpt-input.json`, 486 entries) as `JLPT5_EMBEDDED`, same pattern as `HSK1_EMBEDDED`
  - Apply normalization from Phase 2 at embed time (store as `hanzi`/`pinyin` fields)
- `JLPT_DATA = { 5: JLPT5_EMBEDDED }` — parallel to `HSK_DATA`
- `renderSidebar()` checks `currentLang`:
  - `'zh'`: renders HSK 1–6 accordion (existing behavior)
  - `'ja'`: renders JLPT accordion using `lang().levels` order (N5 first, eventually N4–N1)
- Sidebar level headers: "JLPT N5" instead of "HSK 1"
- Chunk size selector, deck loading, expand/collapse logic: unchanged (reads from whichever data source is active)
- `jlptOpen`, `jlptChunkSize` objects parallel `hskOpen`, `hskChunkSize`

**Test:** Switch to Japanese mode. Sidebar shows "JLPT N5" with chunks. Click a chunk, cards load. Switch back to Chinese, sidebar shows HSK levels again.

---

### Phase 5: localStorage isolation

**What:** Namespace progress, custom decks, and tutor history per language so Chinese and Japanese data don't mix.

**Details:**
- Current keys and their namespaced equivalents:
  | Current key | Chinese mode | Japanese mode |
  |---|---|---|
  | `hanzi-progress` | `hanzi-progress` (unchanged) | `jp-progress` |
  | `hanzi-tutor-history` | `hanzi-tutor-history` (unchanged) | `jp-tutor-history` |
  | `hanzi-diff-ratings` | shared (no change) | shared (no change) |
  | `hanzi-theme` | shared (no change) | shared (no change) |
  | `hanzi-api-key` | shared (no change) | shared (no change) |
- `saveProgress()` and `loadProgress()` read key prefix from `lang().storagePrefix`
- `exportProgress()` and `importProgress()` include a `language` field in the export JSON so imports go to the right namespace
- Custom decks (stored inside the progress object under `customDecks`) are automatically namespaced because the progress key is namespaced
- On language switch, `loadProgress()` is called with the new prefix, populating `cardData` and `decks` from the correct store

**Test:** Make progress on Chinese cards. Switch to Japanese. Progress is blank. Make progress on Japanese cards. Switch back to Chinese — original Chinese progress is intact. Export each separately.

---

### Phase 6: UI text swaps

**What:** Update all visible language-specific text based on `LANG_CONFIG`.

**Details:**
- Header title: `document.querySelector('.header-title').textContent = lang().headerTitle`
- Page title: `document.title = lang().pageTitle`
- Settings "show pinyin" label: update `textContent` to `lang().showReadingLabel`
- Search placeholder: update `placeholder` attribute to `lang().searchPlaceholder`
- Settings language pill: set `active` class on correct button
- Add Noto Sans JP to the Google Fonts import URL (alongside existing Noto Sans SC)
- Anywhere `'Noto Sans SC'` is used in CSS for character display, make it switchable or use both fonts in the stack

**Test:** Switch to Japanese. All labels read "romaji" instead of "pinyin", "kanji" instead of "hanzi". Header says 日本語学習. Search placeholder is correct.

---

### Phase 7: Info panel adaptation

**What:** Make the info panel render correctly for Japanese cards using enriched data and JP_DICT.

**Details:**
- Swap data sources based on `currentLang`:
  - Dictionary: `CEDICT` → `JP_DICT`
  - Enriched: `ENRICHED` → `ENRICHED_JP`
  - Can use a helper: `function getDict() { return currentLang === 'ja' ? JP_DICT : CEDICT; }`
  - Same for enriched: `function getEnriched() { return currentLang === 'ja' ? ENRICHED_JP : ENRICHED; }`
- Load `ENRICHED_JP` from `jlpt-enriched.json` at startup (or on first switch to Japanese), same fetch+cache pattern as Chinese enriched data
- **New section — Readings (Japanese only):**
  - Display onyomi and kunyomi between the header and definitions
  - Format: "on'yomi: イ / シャ" and "kun'yomi: い.やす / もの"
  - Only shown when `currentLang === 'ja'` and the data exists
- **Example sentences field mapping:**
  - Chinese enriched: `ex.zh`, `ex.pinyin`, `ex.en`, `ex.level`
  - Japanese enriched: `ex.ja`, `ex.romaji`, `ex.en`, `ex.level`
  - Also available: `ex.furigana` (optional display, defer for now)
  - Map at render time based on `currentLang`
- **Badges:**
  - Read level from enriched data: `enriched.hsk` (Chinese) or `enriched.jlpt` (Japanese)
  - Format: `lang().levelPrefix + level` → "HSK 3" or "JLPT N5"
- **Character breakdown** for multi-character words: same logic, reads from `getEnriched()`
- **"Generate with AI" fallback:** update the AI deep dive prompt to be language-aware

**Test:** Open info panel on a Japanese card. Shows onyomi/kunyomi readings, definitions from JP_DICT, enriched etymology/components/examples. Badges say "JLPT N5". Navigate to a related character — info panel updates correctly.

---

### Phase 8: Info panel contextual help (both languages)

**What:** Add inline "what is this?" expandable explanations next to terminology that learners might not know.

**Details:**
- Small "?" link or "what is this?" text next to section headers
- Clicking expands a short plain-English explanation, clicking again collapses
- Collapsed by default — doesn't clutter the panel for experienced users
- **Chinese help tooltips:**
  - Next to "components": explains what radicals and semantic/phonetic components are
  - Next to "etymology": what character etymology means and why it helps memorization
- **Japanese help tooltips:**
  - Next to "on'yomi / kun'yomi": explains the two reading systems — Chinese-derived vs. native Japanese pronunciations, when each is typically used
  - Next to "components": same as Chinese (shared radical system)
  - Next to "kana" (if displayed): explains hiragana/katakana and their role
- Implementation: a small `<details>` element or a toggleable div with a help icon
- Help text is static (hardcoded strings), not fetched

**Test:** Open info panel. See "?" icons next to relevant sections. Click to expand — concise explanation appears. Click again to collapse.

---

### Phase 9: TTS language switch

**What:** Make text-to-speech work for Japanese.

**Details:**
- Rename `speakHanzi(text)` → `speakCard(text)` (or keep the name, just update internals)
- Read TTS language from `lang().ttsLang` instead of hardcoded `'zh-CN'`
- Voice lookup: `voices.find(v => v.lang.startsWith(lang().ttsVoicePrefix))` instead of `startsWith('zh')`
- Update all `onclick="speakHanzi(...)"` references in info panel rendering

**Test:** Click the audio button on a Japanese card. Hear Japanese pronunciation (quality depends on device/browser TTS voices available).

---

### Phase 10: AI tutor prompt

**What:** Make the AI tutor language-aware.

**Details:**
- Replace hardcoded `"You are a helpful Chinese language tutor."` with `lang().tutorSystemPrompt`
- Tutor history is already isolated per Phase 5 (separate localStorage keys)
- The tutor context (current card info passed to the API) already uses `card.hanzi` and `card.pinyin` which are normalized, so it works automatically

**Test:** Switch to Japanese. Open tutor. Ask a question about a Japanese word. Tutor responds as a Japanese language tutor. Switch back to Chinese — tutor history is separate.

---

## Deferred (not in this implementation)

| Feature | Rationale |
|---|---|
| Kana vs. romaji toggle on cards | Nice-to-have. Romaji works for launch. Kana display can be added later as a settings toggle (parallel to "show pinyin"). |
| JLPT N4–N1 data | Only N5 for now. Sidebar structure supports additional levels — just needs data files. |
| Furigana ruby text rendering | Would show kana above kanji in example sentences. Requires `<ruby>` HTML and the enriched data already has `ex.furigana` in bracket notation. Defer to a polish pass. |
| Onboarding card on first Japanese switch | A one-time welcome explaining key differences (kana, readings, etc.). Nice but not blocking. |
| Japanese font optimization | Noto Sans JP is large. Could subset or lazy-load. Not a launch blocker. |

---

## Data files summary

| File | Language | Role | Status |
|---|---|---|---|
| `HSK1_EMBEDDED` (inline) | Chinese | HSK 1 vocab (152 entries) | ✅ exists |
| `data/hsk2.json` | Chinese | HSK 2 vocab | ✅ exists |
| `data/hsk3-6.json` | Chinese | HSK 3–6 vocab | ⬜ planned |
| `data/cedict-slim.json` | Chinese | Dictionary definitions | ✅ exists (embedded) |
| `data/hsk-enriched.json` | Chinese | Character/word enrichment | ✅ exists |
| `JLPT5_EMBEDDED` (inline) | Japanese | JLPT N5 vocab (486 entries) | 🔨 build from `jlpt-input.json` |
| `data/jp-dict.json` | Japanese | Dictionary definitions (from JMdict) | 🔨 build pipeline needed (Phase 3) |
| `data/jlpt-enriched.json` | Japanese | Character/word enrichment | 🔨 in progress (377/486 entries done) |

---

## Key risk: font loading

Adding `Noto Sans JP` to the Google Fonts import increases initial page weight significantly (CJK fonts are large). Options:
1. Load JP font only when Japanese mode is active (swap the stylesheet dynamically)
2. Include both in the import and rely on browser caching
3. Use `font-display: swap` so the app isn't blocked

Recommend option 1 — only load the JP font on first switch to Japanese mode, then it's cached by the service worker for subsequent visits.
