# 汉字学习

**Vocabulary Mastery App — Specification Document**

*v5.2 · March 2026 | Chinese (primary) · Japanese (planned)*

---

## 1. Vision & Scope

汉字学习 is an offline-first vocabulary mastery app for learners of Mandarin Chinese (and later Japanese). It is **not** a grammar course or conversation simulator. It is a deep-knowledge system for individual characters and words: their meaning, structure, and context — until that knowledge is permanent.

The app doubles as a study reference tool, not just a flashcard drill. A learner should be able to open it, search for a character they encountered in the wild, read the etymology and example sentences, write a personal note, and return to drilling — all without an internet connection.

---

## 2. Target Users & Scope

- English-speaking learners of Mandarin at HSK 1–4 level (primary)
- Travelers and professionals who need practical vocabulary fast, without grammar study
- Japanese learners (secondary — planned, not v2)
- Offline-first: works without internet after first load. No install, no server, no build step.
- Static PWA hosted on a free static host (e.g. GitHub Pages or Netlify)

---

## 3. Offline Character & Word Data

The central feature of v2 is that **etymology, components, and example sentences no longer require an API key.** This data ships as static JSON files alongside the app for all HSK 1–2 characters and words, cached by the service worker, and serves as the foundation for the info panel.

> *The mnemonic field has been intentionally removed from the schema. Curated mnemonics are a bridge concept — subjective, hard to curate well, and ultimately less effective than a learner's own association. The user note field (see §3.1) replaces this entirely.*

### 3.1 Character Entry Schema

Each unique character in the enriched database uses this schema:

```json
{
  "hanzi": "好",
  "pinyin": "hǎo",
  "english": "good / well",
  "hsk": 1,
  "components": [
    {
      "char": "女",
      "role": "semantic",
      "meaning": "woman",
      "note": "suggests person or relationship"
    },
    {
      "char": "子",
      "role": "semantic",
      "meaning": "child / son",
      "note": "together: mother + child = good"
    }
  ],
  "radical": "女",
  "strokeCount": 6,
  "etymology": "Pictographic compound. A woman (女) beside a child (子) — the image of a mother with her child, signifying goodness and contentment.",
  "examples": [
    { "zh": "你好！", "pinyin": "Nǐ hǎo!", "en": "Hello!", "level": 1 },
    { "zh": "这个很好。", "pinyin": "Zhège hěn hǎo.", "en": "This is very good.", "level": 1 },
    { "zh": "他好像不高兴。", "pinyin": "Tā hǎoxiàng bù gāoxìng.", "en": "He seems unhappy.", "level": 2 }
  ],
  "sameRadical": ["她", "妈", "姐", "妹"],
  "samePhonetic": []
}
```

### 3.2 Word Entry Schema

Multi-character vocabulary items get an additional word-level entry layered on top of the per-character data:

```json
{
  "word": "对不起",
  "pinyin": "duìbuqǐ",
  "english": "sorry",
  "hsk": 1,
  "literal": "cannot rise to face",
  "wordNote": "A humble expression — literally unable to face someone due to shame or fault.",
  "characters": ["对", "不", "起"],
  "examples": [
    { "zh": "对不起，我迟到了。", "pinyin": "Duìbuqǐ, wǒ chídào le.", "en": "Sorry, I'm late.", "level": 1 }
  ]
}
```

The `characters` array is a pointer list — the info panel renders each character's decomposition by looking up the existing per-character entries. Single-character vocabulary items (e.g. 好) do not need a separate word-level entry.

### 3.3 Data Pipeline

The enriched data is generated once via the Anthropic API and shipped as static JSON — never called at runtime for these characters. This makes the info panel fully offline.

- **Pass 1 (characters):** A Node.js script batches all unique characters appearing in HSK 1–2 vocabulary (~350–400 unique characters, ~10 per API request) and prompts for the full character schema above.
- **Pass 2 (words):** A second pass processes ~200 multi-character HSK 1–2 words, generating `literal`, `wordNote`, and word-level examples.
- Output: a single `hsk-enriched.json` file containing both character and word entries. Deployed alongside the app as a static file.
- Human spot-check: review ~30 characters and ~20 words, especially the most common. Pay particular attention to `literal` fields — bad etymologies are worse than none because they create false confidence. (e.g. 马上 "on horseback → immediately" requires historical context that a terse gloss might botch.)
- Estimated cost: ~$3–5 in API calls, one-time.
- Characters and words not in the enriched set fall back to live AI lookup (requires API key).

> *The enriched data is keyed by individual character or word (hanzi), not by deck. Any deck — HSK 3, custom AI-generated, CSV import — automatically gets info panel data for any character/word in the enriched set. Adding new decks never requires touching the app code. Updating data means replacing a JSON file.*

### 3.4 Data Size Estimate

| Dataset | Est. size | Notes |
|---------|-----------|-------|
| HSK 1–2 character entries | ~150 KB | ~375 chars × ~400 bytes avg |
| HSK 1–2 word entries | ~35 KB | ~200 words × ~175 bytes avg |
| CEDICT (HSK 1–3) | ~80 KB | 424 entries, current |
| Example sentences | ~70 KB | ~700 sentences across chars + words |
| HSK 1 audio (pre-recorded) | ~1.5 MB | 152 words × ~10 KB avg |
| **Total HSK 1–2 data files** | **~1.8 MB** | Cached by service worker on first visit |
| HSK 3–6 (JSON) | ~400 KB | Basic schema only; enrichment planned later |

---

## 4. Card & Deck System

### 4.1 Card Object

Every flashcard — HSK, AI-generated, or CSV import — uses the same base shape:

```json
{ "hanzi": "你好", "pinyin": "nǐ hǎo", "english": "hello / hi" }
```

The enriched character and word data (etymology, components, literal meaning, examples) is stored separately in the character/word JSON files, looked up by hanzi at display time. Cards themselves stay lightweight.

### 4.2 HSK Decks

- Six levels (HSK 1–6) in an expandable accordion in the left sidebar
- All levels loaded from separate static JSON files (`hsk1.json`–`hsk6.json`), cached by the service worker for offline use
- Each level expands to show a chunk size selector (10 / 15 / 20 / 30 / 50) and chunk rows

### 4.3 Custom Decks

- AI-generated decks: prefixed with ✦, tagged [ai]
- CSV-imported decks: prefixed with 📁, tagged [csv]
- Double-click any custom deck name to rename it inline
- Saved to localStorage — survive closing and reopening the app

### 4.4 CSV Import Format

Three columns, no required header. Extra columns ignored.

```
hanzi,pinyin,english
你好,nǐ hǎo,hello
```

### 4.5 Review Deck

A persistent pseudo-deck labeled **⟳ Review** sits at the top of the left sidebar, above all HSK and custom decks. It populates automatically from two sources:

1. **Test-mode flags:** Cards answered incorrectly or slower than 5s during any test session.
2. **SM-2 due dates:** Mastered cards whose computed review interval has elapsed.

A count badge shows the number of due cards. When the count is zero, the review deck shows a "You're all caught up" empty state.

Opening the review deck launches test mode with SM-2 difficulty ratings forced on (Again / Hard / Good / Easy). This is not a separate mode — it reuses the existing test mode UI. After rating, SM-2 computes the next interval and the card leaves the review queue until it comes due again.

The review deck is cross-deck: it aggregates cards regardless of which deck they belong to. Each card's source deck is shown as a subtle label during review. The review deck also supports chunk-based sessions — the learner can choose how many due cards to review at once.

### 4.6 Chunk Behavior

Chunks are a **session scope**, not a progression gate. They control how many cards the learner sees in one sitting. There is no requirement to complete chunk 1 before accessing chunk 2. The learner can select any chunk from any level at any time.

- Finishing a chunk does not auto-advance to the next chunk.
- Test mode operates on the currently loaded chunk, not the full level.
- The review deck ignores chunk boundaries — it aggregates all due cards across all decks and levels. However, the review deck supports its own chunk sizing for session length control.

---

## 5. Search

A search icon button in the header right section opens an expandable search bar on click. The bar grows out from the icon toward the left with a smooth animation. Clicking outside or pressing Escape dismisses it. The `/` or `Cmd+K` keyboard shortcut also toggles the search bar.

### 5.1 Search Behavior

- Matches against all three fields: hanzi, pinyin, and English definition
- Tone-insensitive pinyin matching: 'hao' matches 'hǎo', 'hao3', and 'hǎo'. Diacritics are stripped before comparison.
- Results show: character, pinyin, English gloss, and which deck it belongs to
- Clicking a result navigates to that card in its deck and opens the info panel automatically
- If the same character appears in multiple decks, each instance is listed separately with its deck name

> *Search is navigation, not a separate mode. It reuses the existing card view and info panel — no special search UI needed beyond the results list.*

---

## 6. Study & Test Modes

The app-level header has a **Study | Test** pill toggle. These are the two primary modes of interaction.

### 6.1 Study Mode

**Card layout**

- Front face: hanzi (large, gradient style) + pinyin (toggleable) + stroke count badge
- Back face: English definition only — clean, no clutter
- Note indicator: if a user note exists, a small ✏ icon appears on the card front. Hovering reveals the note as a tooltip/popover — no click required.
- No etymology, components, or examples on the card face. Info panel only.
- Click card or Space to flip; arrow keys to navigate
- Hint text ("click to flip · ← → to navigate") appears on hover only on desktop; always visible on touch devices

**List view**

A toggle in the deck header switches between **Cards | List**. List view shows a scrollable table of all cards in the current deck: hanzi, pinyin, English, and mastery status (icon or dot). Cards due for review show a small ⟳ badge. Tapping any row navigates to that card in card view and opens the info panel.

**Context strip** *(polish feature)*

A sliding window of ~10–15 hanzi tiles centered on the current card, showing nearby cards for quick navigation. Mastered cards appear grayed out. Clicking any tile jumps to that card. This is a convenience feature — List View provides the comprehensive deck overview.

**Mastery in study mode**

- A card is mastered when the user explicitly marks it Easy/Mastered — no automatic threshold. (Cards can also be mastered through 3 consecutive correct answers in test mode — see §6.2.)
- Mastered status can be undone immediately via an Undo button (covers accidental taps and post-session resets)
- No other mastery logic in study mode — SM-2 difficulty ratings are a test/review mode feature only
- If a mastered card is flagged for review (by SM-2 interval or test-mode flagging), it re-enters the deck's study rotation — it is no longer hidden even when "hide mastered" is active. It remains visible until the user either marks it mastered again via the Easy button, or answers it correctly 3 consecutive times in test mode.

**Bottom controls**

- Shuffle button (icon only, no text label) — randomises card order
- Mastered card controls: a single pill-shaped button split into two halves:
  - Left half: eye-with-card icon — toggles hide/show mastered cards. When hiding, icon gets a strikethrough line.
  - Right half: list icon — opens a panel showing all mastered cards (hanzi + pinyin) with a checkmark toggle next to each, allowing individual cards to be un-mastered

> *The pill button groups two related actions — filtering mastered cards and managing them — into a single coherent control without cluttering the toolbar.*

### 6.2 Test Mode

- Two formats (selectable in Settings): Multiple Choice (default) or Typing
- Multiple choice: 3 distractors from the current deck, 1 correct answer, randomised order
- Typing: user types English meaning, fuzzy match with partial match support
- Timer: toggleable 10s countdown bar (blue → orange → red). Off by default.
- Difficulty ratings (SM-2): toggleable advanced option. When on, after each card the user rates Again / Hard / Good / Easy. When off, correct/incorrect is tracked only.
- Cards answered incorrectly or slower than 5s are automatically added to the review deck (§4.5). No manual flagging required.
- **Test-mode mastery:** 3 consecutive correct answers on a card marks it as mastered (equivalent to the Easy button in study mode). SM-2 tracking begins immediately (see §8.1).
- Speed benchmark: native ≈ 2.5s. Responses >5s flagged for review.
- Stats bar: correct, wrong, accuracy %, avg speed, streak, for review, mastered

> *Timer and difficulty ratings are both opt-in toggles — neither is on by default. Test mode out of the box is just: answer the card, move on.*

---

## 7. Info Panel

The right side of the split-pane layout. A unified reference panel combining character/word data, dictionary definitions, and the AI tutor. A draggable vertical divider separates it from the main content area. The panel can be toggled open/closed via the ⓘ button in the header and can be collapsed fully (hidden) when not needed.

### 7.1 Panel Contents

Displayed in order, scrollable:

1. **Character/word header:** large hanzi, pinyin, HSK badge, stroke count, audio button
2. **Word-level gloss** *(multi-character words only):* literal meaning and word-level note (e.g. 对不起 → "cannot rise to face")
3. **Character decomposition** *(per-character):* each component shows its character, role (semantic/phonetic/both), and a brief note. Components that exist as their own cards are tappable links. For multi-character words, each character gets its own collapsible sub-section.
4. **Etymology:** 2–4 sentence factual origin per character. Read-only.
5. **Example sentences:** 2–3 graded sentences, each with hanzi, pinyin (toggleable), and English translation. Drawn from word-level examples where available, character-level otherwise.
6. **Related characters:** characters sharing the same radical (drawn from the precomputed `sameRadical` index)
7. **User note:** freeform textarea at the bottom. Editable inline, saved to localStorage on blur. Placeholder: "add a personal note, memory hook, or association..."

**Pinned at the bottom of the panel:** AI tutor input bar. Tutor responses stream above the input bar within the panel, pushing reference content up. The tutor carries the current card and deck as context.

### 7.2 Note Field

The note is the learner's own space — no prompting, no suggested format. It replaces the curated mnemonic entirely.

- Saved in cardData keyed by hanzi: `cardData[hanzi].note`
- Visible in the info panel at all times (empty state shows placeholder text)
- Surfaces on card front as a ✏ hover tooltip when a note exists
- Not visible by default during normal card study — intentional

### 7.3 AI Fallback (requires API key)

- For characters and words not in the enriched set: AI generates components + etymology + literal meaning + examples on demand
- AI tutor available at the bottom of the panel for open-ended questions about any character
- AI dictionary lookup for words not in CEDICT

### 7.4 Data Source Priority

When displaying info for a character or word:

1. Enriched JSON data (HSK 1–2) — always preferred, cached offline by service worker
2. CEDICT definitions — offline fallback for basic definitions
3. AI-generated data — on-demand for characters outside the embedded set, requires API key and network

---

## 8. Spaced Repetition (SM-2)

SM-2 is the engine behind the review deck (§4.5). It does not touch study mode, which remains fully manual. SM-2 activates in two places: when a mastered card's computed interval elapses (surfacing it in the review deck), and during review deck test sessions where difficulty ratings determine the next interval.

### 8.1 Algorithm

- A card is mastered through either of two paths: the explicit Easy/Mastered button in study mode, or 3 consecutive correct answers in test mode. Both paths are equivalent — once mastered, SM-2 tracking begins with a default interval of 1 day and ease factor of 2.5.
- When a mastered card comes due, it appears in the review deck.
- During review, the user rates Again / Hard / Good / Easy. The interval and ease factor update per SM-2.
- Cards answered correctly leave the review queue; cards rated Again re-enter with a short interval.
- Study mode is unaware of SM-2. Mastery (whether achieved in study or test mode) is the *entry point* into the SM-2 cycle, not a product of it.

### 8.2 Schema Changes

The cardData object gains SM-2 fields:

```json
{
  "correct": 0,
  "wrong": 0,
  "reviewFlag": false,
  "interval": 1,
  "efactor": 2.5,
  "due": "2026-03-10",
  "lastRating": null,
  "note": ""
}
```

---

## 9. Layout

| Panel | Description |
|-------|-------------|
| **Header** | 48px. Left: decks toggle + title 汉字学习 + mode pill (Study \| Test). Center: search bar. Right: X/Y counter + progress icon + settings button. |
| **Left sidebar** | 240px. Review deck (top, always visible with count badge) + HSK accordion (levels 1–6) + custom decks. Bottom: + deck panel (AI generation + CSV import). Collapses to 0. |
| **Main content** | Left side of split pane. Study view (cards or list), test view, or analytics dashboard (never simultaneously). |
| **Info panel** | Right side of split pane. Unified reference + tutor (§7). Draggable vertical divider controls the split. Panel collapses fully via ⓘ toggle. |

### 9.1 Responsive Behavior

On viewports below 768px, the split-pane layout collapses to a single-column stack. The info panel opens as a slide-up sheet triggered by the ⓘ button and dismissed by swipe-down or a close button. The left sidebar becomes a slide-out drawer triggered by the decks button. Card navigation supports swipe gestures (left/right for next/previous, down to flip). The draggable divider is hidden on mobile.

---

## 10. Persistence (localStorage)

| Key | Contents |
|-----|----------|
| `hanzi-progress` | `{ cardData, customDecks, sessions }`. cardData tracks per-card stats, SM-2 fields, and user notes. customDecks stores AI/CSV decks. sessions stores per-deck history. |
| `hanzi-api-key` | Anthropic API key string (`sk-ant-...`). Used only for AI fallback features. |
| `hanzi-tutor-history` | Array of tutor chat messages. Each message: `{ role, content, card, time }`. Capped at 100 messages. Included in export/import. |

**Note:** User notes are stored in cardData keyed by hanzi — they persist across all decks and are not deck-specific.

### 10.1 Data Backup

Settings includes **Export Progress** and **Import Progress** buttons.

- **Export** downloads the full contents of the `hanzi-progress` localStorage key as a timestamped JSON file (e.g. `hanzi-backup-2026-03-09.json`).
- **Import** reads a previously exported JSON file and overwrites the current state, with a confirmation dialog warning that this replaces all existing progress.
- This is the primary mitigation for data loss during browser cache clears, device migration, or unexpected localStorage issues.

---

## 11. AI API Integration

All AI calls go to `https://api.anthropic.com/v1/messages` directly from the browser. API key required. The `anthropic-dangerous-direct-browser-access: true` header is required and intentional.

| Feature | Status | Notes |
|---------|--------|-------|
| AI deck generator | ✓ done | Topic → 15–20 card JSON array. Model: claude-sonnet-4-20250514. |
| AI dictionary | ✓ done | Returns {definitions, examples, notes}. Shown in info panel. |
| AI deep dive fallback | ✓ done | Components + etymology + literal meaning for chars/words not in embedded set. |
| AI tutor | ✓ done | Context-aware chat pinned to bottom of info panel. Streamed reply. |

---

## 12. Settings Panel

| Setting | Status | Notes |
|---------|--------|-------|
| Light / dark mode | ✓ done | Toggles `.light` class on body; triggers chart re-render |
| Show pinyin | ✓ done | Hides/shows pinyin on card front and test mode header |
| Test format | ✓ done | Pill toggle: Multiple Choice or Typing |
| Show timer (test) | ✓ done | Toggles 10s countdown bar in test mode. Off by default. |
| Difficulty ratings (test) | ⬜ v2 | Toggleable SM-2 ratings (Again/Hard/Good/Easy) in test mode. Advanced option, off by default. |
| API key | ✓ done | Stored in localStorage as `hanzi-api-key` |
| Language | ⬜ v2 stub | Chinese / Japanese selector. Japanese shows 'coming soon.' Stub now to avoid future architecture changes. |
| Export / Import progress | 🟡 v2 | JSON export/import buttons. See §10.1. |

---

## 13. Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| HSK 1–2 flashcards | ✓ done | 152 + 148 words (separate JSON, cached by service worker) |
| Study mode (flip) | ✓ done | Front/back, pinyin toggle, keyboard nav |
| Test mode (MC + Typing) | ✓ done | Multiple choice + fuzzy typing match |
| Timer | ✓ done | Toggleable 10s countdown |
| Mastery tracking | ✓ done | 3 consecutive correct (feeds into SM-2 in v2, alongside manual Easy button in study mode) |
| Review flagging | ✓ done | Wrong or slow (>5s) flags card |
| Session report | ✓ done | Modal with per-card breakdown |
| Progress dashboard | ✓ done | Charts + session history table |
| CSV import | ✓ done | hanzi,pinyin,english format with per-row validation |
| AI deck generator | ✓ done | Topic → vocab deck via API |
| Offline dictionary | ✓ done | 424 CEDICT entries (separate JSON, cached by service worker) |
| AI deep dive (fallback) | ✓ done | Components + etymology generated on-demand via API for non-enriched chars/words |
| AI tutor | ✓ done | Context-aware chat pinned to info panel bottom. History saved to localStorage and included in export/import. |
| Light/dark mode | ✓ done | Toggle in settings |
| PWA + service worker | ✓ done | Static PWA with service worker for offline caching. Deployed to GitHub Pages. |
| Data export/import | ✓ done | JSON export/import in Settings. Includes progress data and tutor chat history. |
| Info panel | ✓ done | Unified reference panel with CEDICT definitions, enriched data sections (ready for pipeline output), AI fallback, user notes, TTS audio, and tutor chat. Draggable split-pane divider. Updates on card navigation. |
| User note field | ✓ done | Freeform per-card note in info panel. ✏ hover tooltip on card front. Saves on blur. |
| Mastery (Easy button) | ✓ done | Explicit single-tap mastery in study mode. SM-2 tracking begins on mastery. |
| Mobile responsive layout | ✓ done | Single-column stack below 768px. Info panel as slide-up sheet. Swipe gestures for cards. |
| Language selector (stub) | ✓ done | Chinese / Japanese pill in settings. Japanese shows 'coming soon'. |
| HSK 3–6 (external) | ⬜ planned | Needs hsk3–6.json files created; service worker will cache automatically |
| Enriched offline char data | 🔴 PRIORITY 1 | Character + word-level enrichment for HSK 1–2. Run data pipeline first. Output: hsk-enriched.json. |
| HSK 1 pre-recorded audio | 🟡 v2 | ~152 audio files, ~1.5 MB total. Cached by service worker. Source TBD. |
| Spaced repetition (SM-2) | 🔴 PRIORITY 1 | Powers the review deck. Activates on mastery; runs during review sessions only. Study mode unaffected. |
| Review deck | 🔴 PRIORITY 2 | Shell built (sidebar, count badge, opens test mode). SM-2 interval calculation not yet implemented. |
| List view | 🟡 v2 | Cards \| List toggle in deck header. Scrollable table with mastery status and review badges. |
| Search | 🟡 v2 | Hanzi + tone-insensitive pinyin + English. Navigates to card + opens info panel. |
| Difficulty ratings (test) | 🟡 v2 | SM-2 Again/Hard/Good/Easy in test mode. Toggleable, off by default. |
| Related characters index | 🟡 v2 | sameRadical lookup. Precomputed at data build time. |
| Context strip | 🟡 polish | ~10–15 hanzi tiles above card. Click to navigate. Mastered tiles grayed out. |
| Hide/show mastered pill | 🟡 v2 | Split pill: eye-card toggle (left) + mastered list with per-card unmaster checkboxes (right). |
| Icon redesign | 🟡 design | ⓘ info panel, shuffle icon, eye-card pill. Note for design phase. |
| Japanese support (JLPT N5) | ⬜ 3–6 months | Separate data pipeline; shares app architecture. After Chinese v2 is stable. |
| Pronunciation coaching | ⬜ future | Tone feedback — requires audio input |

---

## 14. Japanese Support (3–6 Months — Not v2)

Japanese is a planned extension, targeted for 3–6 months after Chinese v2 is stable. The architecture is intentionally designed so that adding a second language is a data swap, not a UI rewrite.

### 14.1 What's shared

- Character decomposition and radical system (same kangxi radicals as Chinese)
- Etymology logic for kanji (directly related to Chinese hanzi origins)
- The spaced repetition engine (language-agnostic)
- The full app architecture and all UI components

### 14.2 What's different

- Three scripts: hiragana, katakana, kanji — the app currently assumes hanzi-only input and display
- Dual readings: kanji have on'yomi (Chinese-derived) and kun'yomi (native Japanese) — cards need both
- JLPT levels replace HSK levels; data from JMdict (freely licensed)
- Vocabulary items often mix scripts: 食べる (kanji stem + kana inflection)
- Pitch accent matters for Japanese; TTS quality is less reliable

> *Stub the language selector in Settings now (Chinese | Japanese — 'coming soon'). This costs nothing and avoids a future architecture change. The key design constraint: Japanese must be addable as a data configuration, not a code rewrite.*

---

## 15. Technical Constraints

- **Static PWA:** The app is a Progressive Web App hosted on a free static host (e.g. GitHub Pages or Netlify). No backend, no server logic, no build step required for development. App code (HTML, CSS, JS) lives in index.html. All HSK data (levels 1–6) and enriched character/word data are separate static JSON files loaded via fetch() and cached by the service worker for offline use. This keeps the app shell lightweight and data independently updatable.
- **Deployment:** Static files pushed to GitHub Pages or Netlify. No CI/CD required — drag-and-drop upload or git push. The hosted URL is the app's permanent address and the origin for all stored data.
- **localStorage:** Tied to origin. With a stable hosted URL, storage is reliable across sessions. Export/import (§10.1) available as manual backup for device migration or cache clears.
- **No backend:** AI calls go directly to `api.anthropic.com`. Browser CORS header required.
- **Chart.js:** Loaded from cdnjs on first visit, cached by service worker for offline use thereafter.
- **TTS:** Web Speech API (SpeechSynthesis). Available in all modern browsers; Mandarin quality varies by OS.

> *With all data in separate JSON files, the app shell (index.html) stays lightweight. Total cached data for HSK 1–2 including audio is ~1.8 MB — well within service worker cache limits. Beyond HSK 4 full enrichment, the total cache grows but remains manageable for a PWA.*

---

## 16. Edge Cases & Empty States

### 16.1 No Deck Selected

On first launch or when the previously selected deck is unavailable (e.g. a deleted custom deck), the main content area shows a welcome message with a prompt to select a deck from the sidebar. Alternatively, auto-select HSK 1 as a sensible default for new users.

### 16.2 AI Call Failures

Every AI-dependent feature (deck generation, AI dictionary, AI deep dive fallback, tutor) must handle failure gracefully:

- **No API key:** Show a clear prompt to enter an API key in Settings, with a brief explanation of which features require it.
- **Network error / timeout:** Show an inline error message in the info panel or generation dialog. Offer a retry button. Do not fail silently.
- **Rate limit:** Inform the user and suggest waiting before retrying. Do not auto-retry in a loop.
- **Malformed API response:** Fall back to "data unavailable" with a retry option rather than rendering broken content.

### 16.3 Empty Review Deck

When no cards are due for review, the review deck shows: "You're all caught up — no cards due for review." This is the happy state and should feel like an accomplishment, not an empty error.

### 16.4 Malformed CSV Import

- Validate each row individually. Import valid rows and skip invalid ones.
- Show a summary after import: "Imported 47 of 50 cards. 3 rows skipped (missing columns)."
- Common issues to handle: missing columns, wrong encoding, extra commas in definitions, empty rows, BOM characters.

### 16.5 localStorage Full or Corrupted

- Wrap all localStorage writes in try/catch.
- If a write fails (quota exceeded), show a warning: "Storage is full. Export your progress (Settings → Export) and clear old data."
- If localStorage is corrupted or returns invalid JSON, warn the user and offer to reset to defaults or import a backup.

### 16.6 Large Decks

- List View must handle decks of 300+ cards without performance issues. Use virtual scrolling or pagination if rendering becomes slow.
- The context strip (polish feature) shows a fixed window of ~10–15 tiles and does not attempt to render the entire deck.
- Test mode stats bar should handle high numbers gracefully (e.g. "142/300" not overflowing its container).

### 16.7 First-Time App Open

- No decks loaded, no API key set, no progress data.
- Guide the user: show HSK 1 as a suggested starting point, note that AI features require an API key in Settings, keep the info panel closed until the user explicitly opens it.

---

## 17. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Study: flip card. Test: advance after answer. |
| → / ← | Next / previous card (study mode) |
| Enter (typing test) | Submit typed answer |
| Enter (tutor) | Send message (Shift+Enter for newline) |
| / or Cmd+K | Toggle search bar |
| Escape | Close search bar |

---

## 18. Open Questions

- **Audio source:** Pre-recorded HSK 1 audio is confirmed (see §3.4). Source TBD — options include extracting from existing free pronunciation databases (e.g. Forvo community recordings, Chinese-Lessons.com CC-licensed audio) or generating via a TTS service with better Mandarin quality than Web Speech API. File format: mp3 or ogg, ~10 KB per word.
- **Analytics polish:** The progress dashboard is functionally complete. Back button is now an icon-only circular button. Recent sessions table scrolls horizontally at narrow widths and deck names are fully readable. Light mode uses white text against the dark wave background. Stat cards reflow to 2-column and 1-column grids at narrow widths. No new metrics needed for v2.

---

## 18.1 Resolved Decisions

| Question | Decision | Notes |
|----------|----------|-------|
| Embed audio for HSK 1? | **Yes** | ~1.5 MB for 152 words. Cached by service worker. |
| Japanese timeline | **3–6 months** | Stub language selector now. Data pipeline + schema extensions after Chinese v2 is stable. |
| HSK 1–2 embedded vs. separate JSON? | **Separate JSON** | Consistent loading pattern for all levels. Service worker caches on first visit. Data updatable without touching app code. |
| Single file vs. PWA? | **Static PWA** | Hosted on GitHub Pages or Netlify. Solves localStorage fragility, fetch limitations, and offline caching. |
| Dictionary + Deep Dive + Tutor tabs? | **Unified Info Panel** | Single scrollable panel with draggable split-pane divider. Tutor input pinned at bottom. |
| Sentence Mode? | **Removed** | Was a spec artifact from miscommunication. Example sentences live in the info panel. |
| SM-2 in study mode? | **No** | SM-2 powers the review deck only. Study mode mastery is manual (Easy button). Test mode mastery via 3 consecutive correct. Both feed into SM-2. |

---

## 19. Change Log

| Version | Date | Changes |
|---------|------|---------|
| v5.2 | Mar 2026 | UI polish pass. Card faces use fully opaque backgrounds to prevent front-face bleed-through on flip (fixes backface-visibility across browsers). Card shadow/glow significantly reduced for cleaner flip animation. Wave background darkened in dark mode and blur reduced for better texture. Empty state Chinese character removed; text recolored for readability against wave background. Search bar moved from persistent header-center to expandable icon in header-right — opens on click/keyboard shortcut, closes on click-outside or Escape. Shuffle button text label removed (icon only). Info button removed from card controls below flashcard. New deck button swaps to a dismiss chevron when panel is open. Progress dashboard: back button replaced with icon-only circular button; recent sessions table scrolls horizontally at narrow widths with fully readable deck names; light mode text set to white for readability; stat cards reflow at narrow widths. Fixed bug where closing progress dashboard showed empty state alongside active flashcard. |
| v5.1 | Mar 2026 | Implementation progress: PWA deployed to GitHub Pages. Phases 0–4 built. HSK 1–2 data extracted to separate JSON files. Full split-pane layout with draggable divider (3px, blue on hover). Info panel built with CEDICT definitions, enriched data sections (ready for pipeline), AI deep-dive fallback (generates on-demand via API), component breakdown, etymology, examples, related characters, user notes, and TTS audio playback. AI tutor with persistent chat history (saved to localStorage, capped at 100 messages, included in export/import). Export/import now bundles both progress and tutor history. Card minimum sizing and responsive breakpoints for narrow windows. Alt+Arrow passthrough for browser navigation. Swipe gestures for mobile card navigation. |
| v5.0 | Mar 2026 | Major structural revision. Static PWA replaces single-file HTML; all HSK data (1–6) as separate cached JSON files instead of embedded. SM-2 decoupled from study mode — now powers review deck only. Mastery achievable via Easy button (study) or 3 consecutive correct (test); both feed SM-2. Review deck added as auto-populated pseudo-deck (test flags + SM-2 due dates). Dictionary + Deep Dive + Tutor tabs unified into single Info Panel with draggable split-pane divider and pinned tutor input. Word-level enrichment added alongside character-level (literal meanings, word notes). List View added to study mode (Cards \| List toggle). Sentence Mode removed (was spec artifact). Data pipeline revised: two passes (characters + words), corrected scope to ~375 chars + ~200 words. Pre-recorded audio confirmed for HSK 1 (~1.5 MB). Mobile responsive layout specced (single-column below 768px, slide-up info sheet, swipe gestures). Edge cases and empty states documented. Data export/import added. Context strip deprioritized to polish. Japanese timeline set to 3–6 months. Resolved decisions table added. |
| v4.0 | Mar 2026 | Filmstrip navigation above card (hanzi-only tiles; mastered tiles gray out). Mastery simplified to explicit Easy-tap with Undo — no automatic threshold. SM-2 difficulty ratings moved to test mode as a toggleable advanced option. Split pill control for hide/show mastered + mastered list. Timer off by default. Icon redesign noted for design phase. |
| v3.0 | Mar 2026 | Mnemonic field removed. User note field with hover tooltip. Search (hanzi + tone-insensitive pinyin + English). Deep Dive panel replaces Visualizer. Offline data pipeline formalised. Japanese stub in Settings. |
| v2.0 | Mar 2026 | Offline-first character data strategy. Enriched schema (etymology, components, examples). SM-2 prioritised. Japanese roadmap added. |
| v1.2 | Mar 2026 | Embedded HSK 1–2 and CEDICT. Deck rename. Hide card when no deck loaded. |
| v1.1 | Mar 2026 | HSK accordion, chunk size selector, timer toggle, settings redesign, right sidebar. |
| v1.0 | Mar 2026 | Initial: study/test modes, MC + typing, progress dashboard, CSV import, AI deck generator, dark/light mode. |
