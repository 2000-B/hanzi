# 汉字学习

**Vocabulary Mastery App — Specification Document**

*v5.3 · March 2026 | Chinese (primary) · Japanese (planned)*

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
- Each level expands on click to show an inline dropdown of chunk rows
- **Default chunk size: 20.** The app remembers the user's last selected chunk size in localStorage and uses it for all subsequent sessions. Chunk size selector available in the dropdown.

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

1. **Test-mode flags:** Cards answered incorrectly or slower than 5s during any test session (unless "timer display only" is enabled — see §6.2).
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
- **The flashcard is the brightest UI element when a deck is open.** Card face backgrounds use clean, minimal styling consistent with other panels (no heavy glassy effects). All other UI elements (sidebar, header) are subtly dimmed when a deck is active, drawing the eye to the card. The info panel is *not* dimmed. Hovering over dimmed elements restores them to full brightness. *(Desktop only for now — mobile dimming TBD.)*

**Context strip** *(polish feature)*

A sliding window of ~10–15 hanzi tiles **centered above the flashcard**, showing nearby cards for quick navigation. The active tile is scrolled to horizontal center via `requestAnimationFrame` after render. Mastered cards appear grayed out. Clicking any tile jumps to that card.

**Card list overlay** *(new in v5.3)*

Toggled from the bottom controls tray (see below). When active, the flashcard becomes a scrollable, selectable list of all cards in the current deck:

- The list fills the flashcard area. Hanzi, pinyin, and English columns are each vertically aligned with themselves (tabular layout, not ragged).
- The original card content (hanzi/pinyin/english) blurs and fades behind the list overlay.
- Selecting a card from the list navigates to that card, closes the list, and restores the normal card view.
- Closing the list (via the same toggle) also restores normal card view.
- Mastered cards in the list show a subtle indicator (checkmark or dot).

**Mastery in study mode**

- A card is mastered when the user explicitly marks it — no automatic threshold. (Cards can also be mastered through 3 consecutive correct answers in test mode — see §6.2.)
- The mastery button label is contextual: **"Hide"** when the card is currently visible, **"Show"** when the card is currently hidden/mastered. This replaces the previous "Easy" label.
- Mastered status can be undone immediately via an Undo button (covers accidental taps and post-session resets)
- No other mastery logic in study mode — SM-2 difficulty ratings are a test/review mode feature only
- If a mastered card is flagged for review (by SM-2 interval or test-mode flagging), it re-enters the deck's study rotation — it is no longer hidden even when "hide mastered" is active. It remains visible until the user either marks it mastered again, or answers it correctly 3 consecutive times in test mode.

**Bottom controls tray** *(redesigned in v5.3)*

Below the flashcard, a small collapsible panel houses secondary controls. Hidden by default; toggled open/closed by a ▲/▼ chevron arrow.

When open in study mode, the tray contains:
- **Shuffle** button (icon only) — randomises card order
- **Card list** toggle (list icon, on/off) — activates the card list overlay on the flashcard (see above)
- **Hide/Show** button — same as the contextual mastery button (shortcut access)

In test mode, the tray is not shown. A standalone **Shuffle** button appears in its place (no tray needed for a single control).

> *The previous split pill for hide/show mastered + mastered list is removed. The "Hide/Show" button replaces the old "Easy" button with clearer language. The card list overlay replaces the previous "List view" toggle concept.*

### 6.2 Test Mode

**Session start flow** *(new in v5.3)*

1. When the user toggles to test mode, the **deck panel automatically opens** so they can select a deck.
2. If no deck is loaded, a prompt appears: "Select a deck to begin testing."
3. Once a deck is loaded, a **"Start Test"** button appears in the main content area. The flashcard, timer, and answer options are hidden until this button is pressed.
4. Pressing "Start Test" begins the session. Cards auto-appear with their timers. No per-card confirmation needed — the session flows continuously once started.

**Test formats and options**

- Two formats (selectable in Preferences): Multiple Choice (default) or Typing
- Multiple choice: 3 distractors from the current deck, 1 correct answer, randomised order
- Typing: user types English meaning, fuzzy match with partial match support
- Timer: toggleable 10s countdown bar (blue → orange → red). Off by default.
- **Timer display only** *(new in v5.3):* When enabled alongside the timer, the countdown is visible but running out does NOT fail the card or flag it for review. The timer becomes purely informational — a self-awareness tool without penalty. This is a separate toggle from the timer itself (requires timer to be on).
- Difficulty ratings (SM-2): toggleable advanced option. When on, after each card the user rates Again / Hard / Good / Easy. When off, correct/incorrect is tracked only.
- Cards answered incorrectly are automatically added to the review deck (§4.5). Cards answered slower than 5s are also flagged, **unless "timer display only" is enabled** (in which case speed is shown but not penalised).
- **Test-mode mastery:** 3 consecutive correct answers on a card marks it as mastered (equivalent to the Hide button in study mode). SM-2 tracking begins immediately (see §8.1).
- Speed benchmark: native ≈ 2.5s. Responses >5s flagged for review (unless timer display only).
- Stats bar: correct, wrong, accuracy %, avg speed, streak, for review, mastered

> *Timer and difficulty ratings are both opt-in toggles — neither is on by default. Test mode out of the box is just: answer the card, move on.*

---

## 7. Info Panel

The right side of the split-pane layout. A unified reference panel combining character/word data, dictionary definitions, and the AI tutor. The panel can be toggled open/closed via the ⓘ button in the header and can be collapsed fully (hidden) when not needed. The info panel is **not dimmed** when a deck is active — it is considered part of the active study/reference workspace alongside the flashcard.

### 7.1 Panel Contents

Displayed in order, scrollable:

1. **Character/word header:** large hanzi, pinyin, HSK badge, stroke count, audio button (see §7.5)
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

### 7.5 Audio *(updated in v5.3)*

Each info panel entry shows an audio play button in the header area. Audio source priority:

1. **Pre-recorded audio files** (when available): mp3/ogg files cached by the service worker. Target: HSK 1 first (~152 words, ~1.5 MB). Source TBD — options include Forvo community recordings, CC-licensed pronunciation databases, or high-quality TTS generation.
2. **Web Speech API (TTS) fallback**: For entries without pre-recorded audio, the browser's `SpeechSynthesis` API provides pronunciation. Mandarin quality varies by OS.
3. **No audio available**: If neither pre-recorded audio nor a suitable TTS voice is available for an entry, the audio button is **hidden entirely** — no broken or placeholder icons.

> *The audio button's visibility is determined at render time. Entries with pre-recorded files always show it. Entries relying on TTS show it only if a Mandarin voice is detected. Entries with neither get no button.*

---

## 8. Spaced Repetition (SM-2)

SM-2 is the engine behind the review deck (§4.5). It does not touch study mode, which remains fully manual. SM-2 activates in two places: when a mastered card's computed interval elapses (surfacing it in the review deck), and during review deck test sessions where difficulty ratings determine the next interval.

### 8.1 Algorithm

- A card is mastered through either of two paths: the explicit Hide/Show button in study mode, or 3 consecutive correct answers in test mode. Both paths are equivalent — once mastered, SM-2 tracking begins with a default interval of 1 day and ease factor of 2.5.
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
| **Header** | 48px. Left: decks toggle + title 汉字学习 + mode pill (Study \| Test). Right: X/Y counter + search icon + progress icon + preferences gear + full settings icon. Dimmed (with hover restore) when a deck is active. |
| **Left sidebar (deck panel)** | Collapsed: 52px icon strip. Expanded: 260px. Review deck (top) + HSK accordion + custom decks. Bottom: + deck panel. Hover/click to expand; auto-collapses on mouse-leave with 300ms delay (unless user interacted with a deck). Dimmed (with hover restore) when a deck is active. |
| **Main content** | Center of layout. Study view (flashcard + context strip + bottom tray), test view, or analytics dashboard. |
| **Info panel** | Right side. Unified reference + tutor (§7). Panel collapses fully via ⓘ toggle. NOT dimmed when deck is active. |

### 9.1 Responsive Behavior

On viewports below 768px, the split-pane layout collapses to a single-column stack. The info panel opens as a slide-up sheet triggered by the ⓘ button and dismissed by swipe-down or a close button. The left sidebar becomes a slide-out drawer triggered by the decks button. Card navigation supports swipe gestures (left/right for next/previous, down to flip). Dimming behavior is desktop-only for now.

### 9.2 Dimming Behavior *(new in v5.3)*

When a deck is active (cards loaded in main content), all UI panels except the **flashcard area** and the **info panel** receive a subtle dimming treatment. This makes the flashcard the brightest, most prominent element on screen.

- **What dims:** header bar, deck panel (sidebar), bottom controls tray background
- **What does NOT dim:** flashcard, context strip, info panel, any active modal/overlay
- **Hover restore:** Mousing over a dimmed element temporarily restores it to full brightness with a smooth transition (~200ms). Mouse-leave re-dims.
- **Implementation:** CSS `opacity` reduction on container elements (suggested: `opacity: 0.6` when dimmed, `1.0` on hover). Applied via a `.deck-active` class on body when a deck is loaded.
- **Desktop only.** Mobile layout does not apply dimming (panels are off-screen by default anyway).

---

## 10. Persistence (localStorage)

| Key | Contents |
|-----|----------|
| `hanzi-progress` | `{ cardData, customDecks, sessions }`. cardData tracks per-card stats, SM-2 fields, and user notes. customDecks stores AI/CSV decks. sessions stores per-deck history. |
| `hanzi-api-key` | Anthropic API key string (`sk-ant-...`). Used only for AI fallback features. |
| `hanzi-tutor-history` | Array of tutor chat messages. Each message: `{ role, content, card, time }`. Capped at 100 messages. Included in export/import. |
| `hanzi-appearance` | `{ backgroundType, backgroundData, backgroundBlur, accentHue, accentSat, chunkSize }`. Stores custom background image (data URL), blur preference, derived accent color, and last-used chunk size. See §12.2. |

**Note:** User notes are stored in cardData keyed by hanzi — they persist across all decks and are not deck-specific.

### 10.1 Data Backup

Full Settings includes **Export Progress** and **Import Progress** buttons.

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

## 12. Settings & Preferences *(restructured in v5.3)*

Settings are split into two tiers: a **quick preferences popover** for frequently-changed options, and a **full settings modal** for everything else.

### 12.1 Preferences (Quick Settings)

A small popover opened by the **gear icon** (⚙) in the header. Context-sensitive — it shows different options depending on the current mode.

**Always visible:**
- Light / dark mode toggle

**Study mode only:**
- Show pinyin toggle

**Test mode only:**
- Test format pill (Multiple Choice / Typing)
- Show timer toggle
- Timer display only toggle *(requires timer to be on)*
- Difficulty ratings toggle

**Footer of preferences popover:**
- "All settings…" link → opens the full settings modal

### 12.2 Full Settings Modal

A centered modal overlay (larger than the preferences popover, with grouped sections and dividers). Accessible from the "All settings…" link in the preferences popover. Closes on click-outside or ✕ button.

**Sections:**

**Appearance**
- Light / dark mode toggle *(also in preferences)*
- **Background selection:**
  - Default (animated gradient blobs — see §12.3)
  - Solid color (color picker)
  - Custom image (file upload, accepts jpg/png/webp)
- **Blur toggle** *(visible only when background is set to custom image):* applies a `blur()` filter to the background image
- **Reset to default** button: removes custom background, restores gradient blobs and default blue-purple accent

**Study**
- Show pinyin toggle
- *(divider: "study mode")*

**Test**
- Test format pill (Multiple Choice / Typing)
- Show timer toggle
- Timer display only toggle
- Difficulty ratings toggle
- *(divider: "test mode")*

**API Key**
- API key input (password field, `sk-ant-…`)

**Data**
- Export progress button
- Import progress button (with file picker)

**Language**
- Chinese / Japanese pill *(Japanese shows "coming soon")*

> *Settings that appear in both the preferences popover and full modal are synced — changing in one updates the other. The preferences popover is for quick mid-session tweaks; full settings is for configuration that rarely changes.*

### 12.3 Background System *(new in v5.3)*

**Default background**

- **Dark mode:** Pure black (`#000`) base, with animated blurred gradient blobs on top. The blobs use blue-purple radial gradients (`rgba(79,80,200,0.30)`, `rgba(96,60,255,0.22)`, `rgba(60,120,255,0.12)`), heavily blurred (`blur(60px)`), and gently pulse/drift via a CSS `@keyframes bgPulse` animation (~12s cycle, subtle scale + translate + opacity shifts).
- **Light mode:** Pure white (`#fff`) base, with the same gradient blobs at reduced opacity.
- The blobs render on a `body::after` pseudo-element at `z-index: -1`. The solid base color renders on `body::before` at `z-index: -2`.
- Users can adjust the **blob colors** via the appearance settings (color picker for the gradient tint). The blob positions and animation remain fixed; only the hue shifts.

**Custom background (solid color)**

- When the user selects a solid color, the gradient blobs are removed. `body::after` is hidden. `body::before` fills with the chosen color.
- The app's accent colors adapt to the chosen color (see §12.4).

**Custom background (image)**

- When the user uploads an image, it is stored as a data URL in `hanzi-appearance` localStorage.
- The image renders on `body::before` as `background: url(...) center/cover no-repeat`.
- Gradient blobs (`body::after`) are hidden.
- **Blur toggle:** When enabled, `body::before` receives `filter: blur(12px)` and `transform: scale(1.05)` (to hide blur edge artifacts). When disabled, the image renders at full sharpness.
- The app's accent colors adapt to the image's average color (see §12.4).

**Reverting to default**

- The "Reset to default" button in full settings clears the `hanzi-appearance` localStorage key, restores gradient blobs, and resets all accent colors to the default blue-purple palette.

### 12.4 Accent Color Adaptation *(new in v5.3)*

When the user sets a custom background (image or solid color), the app derives a dominant hue and saturation from the background and remaps all accent-driven CSS custom properties accordingly.

**What adapts:**
- `--accent`, `--accent2` (primary interactive color)
- `--accent-glow`, `--accent-soft`, `--accent-softer`, `--accent-border` (all accent-derived transparencies)
- `--border`, `--border2`, `--border3` (subtle UI borders)
- Gradient used on card hanzi, deck names, app title, context strip tiles
- Card face tint / glass sheen color
- Sidebar and info panel border tint

**What does NOT adapt:**
- Functional status colors: `--red` (wrong), `--green` (correct/mastered), `--orange` (warning/timer)
- Text colors (`--text`, `--text2`, `--text3`)
- Base background colors (`--bg`, `--bg2`, etc.) — these are driven by dark/light mode, not accent

**Extraction method:**
- For images: draw the image to a small offscreen `<canvas>` (e.g. 50×50), iterate pixels to compute average RGB, convert to HSL, use hue + saturation as the accent base.
- For solid colors: use the color directly.
- The extracted HSL values are stored in `hanzi-appearance` so they persist without re-extracting on every load.
- CSS custom properties are updated at runtime via `document.documentElement.style.setProperty()`.

---

## 13. Deck Panel (Sidebar) *(updated in v5.3)*

### 13.1 Collapsed State

The deck panel collapses to a 52px-wide vertical strip showing only icons: review deck icon (⟳), HSK level labels (gradient text), and the + new deck button (circular).

### 13.2 Expand/Collapse Behavior

**Expanding:**
- **Hover** anywhere on the collapsed strip (except deck name labels) expands the panel to full 260px width with a smooth transition.
- **Single click** on the collapsed strip also expands.
- **Hovering over a deck name** in the collapsed strip **highlights** that deck button but does **not** expand the panel. This allows quick visual identification without the panel popping open.

**Collapsing:**
- If the user has **not interacted** with any deck controls while the panel is expanded: mouse-leave triggers collapse after a **300ms delay**. This prevents flickering from casual mouse movement.
- If the user **has interacted** with a deck (clicked a level, opened chunks, selected a deck, changed chunk size, etc.): the panel stays open until the user **clicks outside** the panel. This follows the principle of "equal input in, input out" — deliberate interaction requires deliberate dismissal.
- On mobile (≤768px): the panel is always a full slide-out drawer, dismissed by backdrop click.

### 13.3 Deck Name → Inline Chunk Dropdown

Clicking an HSK level name in the expanded panel opens an **inline dropdown** below that level showing the available chunk rows. This replaces the previous accordion-with-chunk-controls pattern.

- The dropdown shows chunk rows based on the current chunk size (default 20, remembered from last use — see §4.2).
- A small chunk size selector (e.g. "20 ▾") appears at the top of the dropdown, allowing the user to change the chunk size. The selection is saved to `hanzi-appearance.chunkSize` in localStorage.
- Clicking a chunk row loads that chunk and (in study mode) closes the dropdown. In test mode, loading a chunk presents the "Start Test" button.

### 13.4 Auto-Open on Test Mode

When the user toggles to test mode, the deck panel automatically expands so they can select a deck. If a deck is already loaded, the panel still opens briefly to confirm context, then follows normal collapse rules.

---

## 14. Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| HSK 1–2 flashcards | ✓ done | 152 + 148 words (separate JSON, cached by service worker) |
| Study mode (flip) | ✓ done | Front/back, pinyin toggle, keyboard nav |
| Test mode (MC + Typing) | ✓ done | Multiple choice + fuzzy typing match |
| Timer | ✓ done | Toggleable 10s countdown |
| Timer display only | ⬜ v5.3 | See timer without penalty for slow answers |
| Start test flow | ⬜ v5.3 | Deck prompt → Start button → session begins |
| Mastery tracking | ✓ done | 3 consecutive correct (feeds into SM-2 in v2, alongside manual Hide/Show button in study mode) |
| Review flagging | ✓ done | Wrong or slow (>5s, unless timer display only) flags card |
| Session report | ✓ done | Modal with per-card breakdown |
| Progress dashboard | ✓ done | Charts + session history table |
| CSV import | ✓ done | hanzi,pinyin,english format with per-row validation |
| AI deck generator | ✓ done | Topic → vocab deck via API |
| Offline dictionary | ✓ done | 424 CEDICT entries (separate JSON, cached by service worker) |
| AI deep dive (fallback) | ✓ done | Components + etymology generated on-demand via API for non-enriched chars/words |
| AI tutor | ✓ done | Context-aware chat pinned to info panel bottom. History saved to localStorage and included in export/import. |
| Light/dark mode | ✓ done | Toggle in settings |
| PWA + service worker | ✓ done | Static PWA with service worker for offline caching. Deployed to GitHub Pages. |
| Data export/import | ✓ done | JSON export/import in Full Settings. Includes progress data and tutor chat history. |
| Info panel | ✓ done | Unified reference panel with CEDICT definitions, enriched data sections (ready for pipeline output), AI fallback, user notes, TTS audio, and tutor chat. Panel collapses fully via ⓘ toggle. Updates on card navigation. |
| Info panel audio | 🟡 v5.3 | TTS via Web Speech API (default). Button hidden when no audio available. Pre-recorded audio as future upgrade. |
| User note field | ✓ done | Freeform per-card note in info panel. ✏ hover tooltip on card front. Saves on blur. |
| Mastery (Hide/Show button) | ✓ done | Contextual label: "Hide" for visible cards, "Show" for hidden/mastered cards. SM-2 tracking begins on mastery. |
| Mobile responsive layout | ✓ done | Single-column stack below 768px. Info panel as slide-up sheet. Swipe gestures for cards. |
| Language selector (stub) | ✓ done | Chinese / Japanese pill in full settings. Japanese shows 'coming soon'. |
| Animated gradient background | ⬜ v5.3 | Pulsing blue-purple blobs on black/white base. Replaces wave image. |
| Custom background (image/color) | ⬜ v5.3 | Upload image or pick solid color. Blur toggle for images. |
| Accent color adaptation | ⬜ v5.3 | Full accent remap from background's dominant hue. |
| Settings restructure | ⬜ v5.3 | Quick preferences (context-sensitive) + full settings modal. Gear icon. |
| Deck panel interaction model | ⬜ v5.3 | Hover-expand, click-deck-for-chunks, 300ms collapse delay, sticky on interaction. |
| Card list overlay | ⬜ v5.3 | Scrollable list inside flashcard with column alignment. Blurs card content. |
| Bottom controls tray | ⬜ v5.3 | Collapsible ▲/▼ panel with shuffle, card list, hide/show. Test mode: shuffle only. |
| UI dimming | ⬜ v5.3 | Sidebar + header dim when deck active. Hover restores. Desktop only. |
| Context strip centering | ⬜ v5.3 | Strip centered above flashcard, active tile scrolled to center. |
| HSK 3–6 (external) | ⬜ planned | Needs hsk3–6.json files created; service worker will cache automatically |
| Enriched offline char data | 🔴 PRIORITY 1 | Character + word-level enrichment for HSK 1–2. Run data pipeline first. Output: hsk-enriched.json. |
| HSK 1 pre-recorded audio | 🟡 v2 | ~152 audio files, ~1.5 MB total. Cached by service worker. Source TBD. |
| Spaced repetition (SM-2) | 🔴 PRIORITY 1 | Powers the review deck. Activates on mastery; runs during review sessions only. Study mode unaffected. |
| Review deck | 🔴 PRIORITY 2 | Shell built (sidebar, count badge, opens test mode). SM-2 interval calculation not yet implemented. |
| Search | 🟡 v2 | Hanzi + tone-insensitive pinyin + English. Navigates to card + opens info panel. |
| Difficulty ratings (test) | 🟡 v2 | SM-2 Again/Hard/Good/Easy in test mode. Toggleable, off by default. |
| Related characters index | 🟡 v2 | sameRadical lookup. Precomputed at data build time. |
| Context strip | 🟡 polish | ~10–15 hanzi tiles above card. Click to navigate. Mastered tiles grayed out. |
| Japanese support (JLPT N5) | ⬜ 3–6 months | Separate data pipeline; shares app architecture. After Chinese v2 is stable. |
| Pronunciation coaching | ⬜ future | Tone feedback — requires audio input |

---

## 15. Japanese Support (3–6 Months — Not v2)

Japanese is a planned extension, targeted for 3–6 months after Chinese v2 is stable. The architecture is intentionally designed so that adding a second language is a data swap, not a UI rewrite.

### 15.1 What's shared

- Character decomposition and radical system (same kangxi radicals as Chinese)
- Etymology logic for kanji (directly related to Chinese hanzi origins)
- The spaced repetition engine (language-agnostic)
- The full app architecture and all UI components

### 15.2 What's different

- Three scripts: hiragana, katakana, kanji — the app currently assumes hanzi-only input and display
- Dual readings: kanji have on'yomi (Chinese-derived) and kun'yomi (native Japanese) — cards need both
- JLPT levels replace HSK levels; data from JMdict (freely licensed)
- Vocabulary items often mix scripts: 食べる (kanji stem + kana inflection)
- Pitch accent matters for Japanese; TTS quality is less reliable

> *Stub the language selector in Settings now (Chinese | Japanese — 'coming soon'). This costs nothing and avoids a future architecture change. The key design constraint: Japanese must be addable as a data configuration, not a code rewrite.*

---

## 16. Technical Constraints

- **Static PWA:** The app is a Progressive Web App hosted on a free static host (e.g. GitHub Pages or Netlify). No backend, no server logic, no build step required for development. App code (HTML, CSS, JS) lives in index.html. All HSK data (levels 1–6) and enriched character/word data are separate static JSON files loaded via fetch() and cached by the service worker for offline use. This keeps the app shell lightweight and data independently updatable.
- **Deployment:** Static files pushed to GitHub Pages or Netlify. No CI/CD required — drag-and-drop upload or git push. The hosted URL is the app's permanent address and the origin for all stored data.
- **localStorage:** Tied to origin. With a stable hosted URL, storage is reliable across sessions. Export/import (§10.1) available as manual backup for device migration or cache clears. New `hanzi-appearance` key stores background and accent preferences.
- **No backend:** AI calls go directly to `api.anthropic.com`. Browser CORS header required.
- **Chart.js:** Loaded from cdnjs on first visit, cached by service worker for offline use thereafter.
- **TTS:** Web Speech API (SpeechSynthesis). Available in all modern browsers; Mandarin quality varies by OS. Used as audio fallback when pre-recorded files are unavailable.
- **Canvas for color extraction:** The accent adaptation system uses an offscreen `<canvas>` to sample average color from uploaded background images. No external library required.

> *With all data in separate JSON files, the app shell (index.html) stays lightweight. Total cached data for HSK 1–2 including audio is ~1.8 MB — well within service worker cache limits. Beyond HSK 4 full enrichment, the total cache grows but remains manageable for a PWA.*

---

## 17. Edge Cases & Empty States

### 17.1 No Deck Selected

On first launch or when the previously selected deck is unavailable (e.g. a deleted custom deck), the main content area shows a welcome message with a prompt to select a deck from the sidebar. Alternatively, auto-select HSK 1 as a sensible default for new users.

### 17.2 Test Mode Without Deck *(new in v5.3)*

When the user toggles to test mode without a deck loaded, the deck panel opens automatically and a message appears: "Select a deck to begin testing." No flashcard, timer, or answer options are shown until a deck is loaded and the "Start Test" button is pressed.

### 17.3 AI Call Failures

Every AI-dependent feature (deck generation, AI dictionary, AI deep dive fallback, tutor) must handle failure gracefully:

- **No API key:** Show a clear prompt to enter an API key in Full Settings, with a brief explanation of which features require it.
- **Network error / timeout:** Show an inline error message in the info panel or generation dialog. Offer a retry button. Do not fail silently.
- **Rate limit:** Inform the user and suggest waiting before retrying. Do not auto-retry in a loop.
- **Malformed API response:** Fall back to "data unavailable" with a retry option rather than rendering broken content.

### 17.4 Empty Review Deck

When no cards are due for review, the review deck shows: "You're all caught up — no cards due for review." This is the happy state and should feel like an accomplishment, not an empty error.

### 17.5 Malformed CSV Import

- Validate each row individually. Import valid rows and skip invalid ones.
- Show a summary after import: "Imported 47 of 50 cards. 3 rows skipped (missing columns)."
- Common issues to handle: missing columns, wrong encoding, extra commas in definitions, empty rows, BOM characters.

### 17.6 localStorage Full or Corrupted

- Wrap all localStorage writes in try/catch.
- If a write fails (quota exceeded), show a warning: "Storage is full. Export your progress (Settings → Export) and clear old data."
- If localStorage is corrupted or returns invalid JSON, warn the user and offer to reset to defaults or import a backup.

### 17.7 Large Decks

- Card list overlay must handle decks of 300+ cards without performance issues. Use virtual scrolling or pagination if rendering becomes slow.
- The context strip shows a fixed window of ~10–15 tiles and does not attempt to render the entire deck.
- Test mode stats bar should handle high numbers gracefully (e.g. "142/300" not overflowing its container).

### 17.8 First-Time App Open

- No decks loaded, no API key set, no progress data.
- Guide the user: show HSK 1 as a suggested starting point, note that AI features require an API key in Full Settings, keep the info panel closed until the user explicitly opens it.

### 17.9 Custom Background Edge Cases

- **Very large images:** Images uploaded as background are converted to data URLs and stored in localStorage. Warn if the image exceeds ~2 MB that it may slow storage operations. Consider resizing to a max dimension (e.g. 1920px) on upload.
- **Very dark or very light images:** The accent extraction may produce hues that clash with dark or light mode text. If the extracted color has very low saturation (grayscale image), fall back to the default blue-purple accent.
- **Transparent images:** Treat as if the transparent areas show the base black/white, which will pull the average color toward neutral. Acceptable — the user can always reset.

---

## 18. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Study: flip card. Test: advance after answer. |
| → / ← | Next / previous card (study mode) |
| Enter (typing test) | Submit typed answer |
| Enter (tutor) | Send message (Shift+Enter for newline) |
| / or Cmd+K | Toggle search bar |
| Escape | Close search bar, close settings modal, close preferences popover |

---

## 19. Open Questions

- **Audio source:** Pre-recorded HSK 1 audio is confirmed (see §3.4). Source TBD — options include extracting from existing free pronunciation databases (e.g. Forvo community recordings, Chinese-Lessons.com CC-licensed audio) or generating via a TTS service with better Mandarin quality than Web Speech API. File format: mp3 or ogg, ~10 KB per word.
- **Mobile dimming:** The UI dimming behavior (§9.2) is desktop-only for now. Mobile testing needed to determine if a similar treatment improves the experience on touch devices where panels are off-screen by default.

---

## 19.1 Resolved Decisions

| Question | Decision | Notes |
|----------|----------|-------|
| Embed audio for HSK 1? | **Yes** | ~1.5 MB for 152 words. Cached by service worker. TTS as interim fallback. |
| Japanese timeline | **3–6 months** | Stub language selector now. Data pipeline + schema extensions after Chinese v2 is stable. |
| HSK 1–2 embedded vs. separate JSON? | **Separate JSON** | Consistent loading pattern for all levels. Service worker caches on first visit. Data updatable without touching app code. |
| Single file vs. PWA? | **Static PWA** | Hosted on GitHub Pages or Netlify. Solves localStorage fragility, fetch limitations, and offline caching. |
| Dictionary + Deep Dive + Tutor tabs? | **Unified Info Panel** | Single scrollable panel. Tutor input pinned at bottom. |
| Sentence Mode? | **Removed** | Was a spec artifact from miscommunication. Example sentences live in the info panel. |
| SM-2 in study mode? | **No** | SM-2 powers the review deck only. Study mode mastery is manual (Hide/Show button). Test mode mastery via 3 consecutive correct. Both feed into SM-2. |
| Background wave image? | **Removed (v5.3)** | Replaced with animated gradient blobs (default) or user-customisable background. |
| Accent color source? | **Full adaptation (v5.3)** | Derived from background's dominant hue. All accent-driven properties remap. Functional colors (red/green/orange) stay fixed. |
| Settings structure? | **Two-tier (v5.3)** | Quick preferences popover (context-sensitive, gear icon) + full settings modal (accessed from preferences). |
| Deck panel interaction? | **Hover-expand with sticky (v5.3)** | Hover expands, 300ms delay collapse, sticky if user interacted with a deck. |
| Default chunk size? | **20 (v5.3)** | Remembered in localStorage across sessions. |
| Timer penalty toggle? | **Yes (v5.3)** | "Timer display only" — see timer without slow-answer penalty. |
| Test mode session start? | **Start button (v5.3)** | Press once to begin session. Cards auto-appear after that. |
| Card list location? | **Inside flashcard (v5.3)** | Overlay with blur behind. Scrollable, selectable, column-aligned. |
| Bottom controls? | **Collapsible tray (v5.3)** | ▲/▼ toggle. Study: shuffle + card list + hide/show. Test: shuffle only (no tray). |
| Panel dimming? | **Yes, desktop only (v5.3)** | Header + sidebar dim. Info panel exempt. Hover restores. |

---

## 20. Change Log

| Version | Date | Changes |
|---------|------|---------|
| v5.3 | Mar 2026 | **Background system:** Wave image removed. Default background is now animated blurred blue-purple gradient blobs on pure black (dark mode) or white (light mode), pulsing via CSS keyframes. Users can set a custom solid color or upload a background image (with blur toggle) via full settings. Gradient blobs are hidden when a custom background is set; restored on reset to default. **Accent color adaptation:** All accent-driven CSS properties (accent, borders, glows, gradients, card tints) dynamically remap to the dominant hue of the user's custom background. Average color extracted via offscreen canvas. Functional colors (red/green/orange) unaffected. **Settings restructure:** Settings split into quick Preferences popover (gear icon, context-sensitive to study/test mode) and full Settings modal (centered overlay, all options grouped with mode dividers). API key, background, export/import, and language moved exclusively to full settings. Settings icon changed to gear shape. **Deck panel:** Hover-to-expand with 300ms collapse delay; sticky-open when user interacts with a deck (click-outside to dismiss). Deck names open inline chunk dropdowns. Default chunk size changed to 20, persisted in localStorage. Panel auto-opens when entering test mode. **Test mode:** "Start Test" button required to begin session (cards/timer hidden until pressed). Deck selection prompted when no deck loaded. New "timer display only" toggle — see timer without penalty for slow answers. **Flashcard:** Now the brightest UI element when a deck is active — header and sidebar are subtly dimmed (hover to restore, desktop only). Info panel is NOT dimmed. Card face styling reduced to match panel consistency (less heavy glass effects). **Card list overlay:** New feature — toggleable from bottom tray, displays a scrollable column-aligned list inside the flashcard. Card content blurs behind the list. Selecting a card navigates and closes the list. **Bottom controls:** Redesigned as collapsible ▲/▼ tray below flashcard. Study mode: shuffle, card list toggle, hide/show. Test mode: shuffle button only (no tray). **Mastery button:** "Easy" renamed to contextual "Hide"/"Show" label. **Mastered list pill removed.** Cards/List pill replaced by card list overlay toggle (list icon). **Context strip:** Now explicitly centered above the flashcard with active tile scrolled to center. **Info panel audio:** TTS via Web Speech API as default. Audio button hidden when no audio source available. Pre-recorded audio files specced as future upgrade path. **Edge cases:** Added test-mode-without-deck and custom-background edge cases. |
| v5.2 | Mar 2026 | UI polish pass. Card faces use fully opaque backgrounds to prevent front-face bleed-through on flip (fixes backface-visibility across browsers). Card shadow/glow significantly reduced for cleaner flip animation. Wave background darkened in dark mode and blur reduced for better texture. Empty state Chinese character removed; text recolored for readability against wave background. Search bar moved from persistent header-center to expandable icon in header-right — opens on click/keyboard shortcut, closes on click-outside or Escape. Shuffle button text label removed (icon only). Info button removed from card controls below flashcard. New deck button swaps to a dismiss chevron when panel is open. Progress dashboard: back button replaced with icon-only circular button; recent sessions table scrolls horizontally at narrow widths with fully readable deck names; light mode text set to white for readability; stat cards reflow at narrow widths. Fixed bug where closing progress dashboard showed empty state alongside active flashcard. |
| v5.1 | Mar 2026 | Implementation progress: PWA deployed to GitHub Pages. Phases 0–4 built. HSK 1–2 data extracted to separate JSON files. Full split-pane layout with draggable divider (3px, blue on hover). Info panel built with CEDICT definitions, enriched data sections (ready for pipeline), AI deep-dive fallback (generates on-demand via API), component breakdown, etymology, examples, related characters, user notes, and TTS audio playback. AI tutor with persistent chat history (saved to localStorage, capped at 100 messages, included in export/import). Export/import now bundles both progress and tutor history. Card minimum sizing and responsive breakpoints for narrow windows. Alt+Arrow passthrough for browser navigation. Swipe gestures for mobile card navigation. |
| v5.0 | Mar 2026 | Major structural revision. Static PWA replaces single-file HTML; all HSK data (1–6) as separate cached JSON files instead of embedded. SM-2 decoupled from study mode — now powers review deck only. Mastery achievable via Easy button (study) or 3 consecutive correct (test); both feed SM-2. Review deck added as auto-populated pseudo-deck (test flags + SM-2 due dates). Dictionary + Deep Dive + Tutor tabs unified into single Info Panel with draggable split-pane divider and pinned tutor input. Word-level enrichment added alongside character-level (literal meanings, word notes). List View added to study mode (Cards \| List toggle). Sentence Mode removed (was spec artifact). Data pipeline revised: two passes (characters + words), corrected scope to ~375 chars + ~200 words. Pre-recorded audio confirmed for HSK 1 (~1.5 MB). Mobile responsive layout specced (single-column below 768px, slide-up info sheet, swipe gestures). Edge cases and empty states documented. Data export/import added. Context strip deprioritized to polish. Japanese timeline set to 3–6 months. Resolved decisions table added. |
| v4.0 | Mar 2026 | Filmstrip navigation above card (hanzi-only tiles; mastered tiles gray out). Mastery simplified to explicit Easy-tap with Undo — no automatic threshold. SM-2 difficulty ratings moved to test mode as a toggleable advanced option. Split pill control for hide/show mastered + mastered list. Timer off by default. Icon redesign noted for design phase. |
| v3.0 | Mar 2026 | Mnemonic field removed. User note field with hover tooltip. Search (hanzi + tone-insensitive pinyin + English). Deep Dive panel replaces Visualizer. Offline data pipeline formalised. Japanese stub in Settings. |
| v2.0 | Mar 2026 | Offline-first character data strategy. Enriched schema (etymology, components, examples). SM-2 prioritised. Japanese roadmap added. |
| v1.2 | Mar 2026 | Embedded HSK 1–2 and CEDICT. Deck rename. Hide card when no deck loaded. |
| v1.1 | Mar 2026 | HSK accordion, chunk size selector, timer toggle, settings redesign, right sidebar. |
| v1.0 | Mar 2026 | Initial: study/test modes, MC + typing, progress dashboard, CSV import, AI deck generator, dark/light mode. |

---

## Appendix A: v5.3 Implementation Order

Suggested sequence to minimize conflicts and maximize testability at each step:

1. **Background system (CSS only):** Replace wave image with animated gradient blobs. Verify dark/light mode. No JS needed yet.
2. **Context strip centering:** CSS fix + JS scroll-to-center. Quick win, isolated change.
3. **Settings restructure:** Build preferences popover (gear icon, context-sensitive). Build full settings modal shell. Move API key, export/import, language, and (empty) appearance section to full settings. Wire "All settings…" link.
4. **Appearance settings + accent adaptation:** Add background picker (color/image/default), blur toggle, and color extraction to full settings. Wire accent color CSS property updates.
5. **Deck panel interaction model:** Implement hover-expand, 300ms collapse delay, sticky-on-interaction, inline chunk dropdowns, default chunk size 20 + persistence.
6. **UI dimming:** Add `.deck-active` class and dimming CSS. Wire hover-restore transitions.
7. **Flashcard styling:** Reduce glassy card effects. Ensure card is visually brightest element.
8. **Bottom controls tray:** Build collapsible ▲/▼ panel. Move shuffle + add card list toggle + hide/show into it. Show shuffle-only in test mode.
9. **Mastery button rename:** "Easy" → "Hide"/"Show" contextual label. Remove mastered list pill.
10. **Card list overlay:** Build scrollable list inside flashcard with blur-behind. Column alignment. Selection navigates.
11. **Test mode flow:** "Start Test" button, deck prompt, auto-open deck panel. Timer display only toggle.
12. **Info panel audio:** Detect TTS availability per entry. Hide button when unavailable. Prep for future pre-recorded audio drop-in.
