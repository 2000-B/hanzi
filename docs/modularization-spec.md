# Modularization Spec — Splitting the Monolith

> **Purpose:** Break `index.html` (~4,580 lines) into separate CSS and JS files so that different features (Japanese toggle, Appearance settings, etc.) can be developed in parallel without merge conflicts.
>
> **Constraint:** Pure extraction — no logic changes, no new features, no refactoring of how functions work. The app must behave identically before and after the split. This is a structural change only.

---

## 1. Why

Everything currently lives in one file. That means any two workstreams (e.g. Japanese toggle + Appearance panel) edit the same file and produce conflicting outputs. Splitting into modules lets each feature touch its own file(s), making parallel work practical.

### 1.1 What this spec does NOT cover

- ES modules (`import`/`export`) — all scripts load as plain `<script>` tags sharing the global scope, same as today
- Build tools (webpack, vite, etc.) — still no build step
- Any behavioral changes to the app

---

## 2. File structure after split

```
/
├── index.html              ← HTML shell only (~300 lines)
├── styles.css              ← All CSS (~2,000 lines)
├── js/
│   ├── state.js            ← Global variables + constants
│   ├── data.js             ← Embedded HSK1, data loading, CEDICT/ENRICHED
│   ├── persistence.js      ← localStorage read/write, export/import, API key
│   ├── settings.js         ← Settings overlay, theme, pinyin, timer, format toggles
│   ├── sidebar.js          ← Sidebar toggle, render, chunk size, new deck panel
│   ├── deck.js             ← Deck selection, card rendering, card navigation
│   ├── study.js            ← SM-2 algorithm, mastery, review deck, mode switching
│   ├── test.js             ← Test mode init, answer checking, rating, session stats
│   ├── info-panel.js       ← Info panel rendering, tutor, divider drag
│   ├── search.js           ← Search index, search bar, search input handler
│   ├── extras.js           ← CSV import, AI deck generation, deck rename
│   ├── analytics.js        ← Analytics dashboard + Chart.js rendering
│   ├── events.js           ← Keyboard shortcuts, swipe gestures, context strip
│   └── app.js              ← init() — wires everything together on DOMContentLoaded
├── sw.js                   ← Service worker (updated asset list)
├── manifest.json
└── data/
    ├── hsk1.json
    ├── hsk2.json
    ├── ... (unchanged)
```

### 2.1 Why not ES modules?

ES modules (`import`/`export`) would be the "proper" modern approach, but they introduce complexity we don't need yet:

- Every cross-file reference requires explicit imports and exports
- Circular dependencies become a real headache for a single-developer project
- Debugging gets harder (source maps, module scoping)
- The current code uses global scope freely — converting to modules means rewriting every function's access pattern

Plain `<script>` tags in the right order give us the file separation benefit (parallel work on different files) with zero code changes inside the functions themselves. Every variable and function lands in the global scope exactly as it does today. We can always upgrade to ES modules later if needed.

---

## 3. What goes where

### 3.1 `index.html` (~300 lines)

**Keeps:** `<!DOCTYPE>`, `<head>` (meta, fonts, manifest, `<link rel="stylesheet">`), all HTML between `<body>` and `</body>` (header, sidebar, main content area, info panel, settings overlay, modals, loading screen), and `<script>` tags referencing each JS file.

**Loses:** The entire `<style>` block and the entire `<script>` block.

```html
<!-- in <head> -->
<link rel="stylesheet" href="styles.css">

<!-- before </body> -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="js/state.js"></script>
<script src="js/data.js"></script>
<script src="js/persistence.js"></script>
<script src="js/settings.js"></script>
<script src="js/sidebar.js"></script>
<script src="js/deck.js"></script>
<script src="js/study.js"></script>
<script src="js/test.js"></script>
<script src="js/info-panel.js"></script>
<script src="js/search.js"></script>
<script src="js/extras.js"></script>
<script src="js/analytics.js"></script>
<script src="js/events.js"></script>
<script src="js/app.js"></script>
```

**Load order matters.** `state.js` first (declares all globals), `app.js` last (calls `init()`). Everything in between can reference globals freely since they're all `<script>` (not `type="module"`).

### 3.2 `styles.css` (~2,000 lines)

The entire contents of the current `<style>...</style>` block (lines 13–2027), extracted verbatim. No changes to any selectors, properties, or media queries.

Current CSS section map (preserved as-is):

| Section | Description |
|---|---|
| Design Tokens | `:root` custom properties, light mode overrides |
| Reset & Base | Box-sizing reset, body styles, background animation |
| Header | Header bar, logo, nav buttons |
| Layout — Sidebar + Split Pane | `.app-body`, `.sidebar`, `.pane-divider`, `.info-panel` |
| Sidebar Content | Deck list items, level headers, chunk controls |
| Buttons | `.btn` variants, toggle switches, pill selectors |
| Main Content Views | Flashcard, study view, card front/back |
| Test Mode | Test view, answer buttons, stats display |
| Settings Overlay | Settings panel, sections, inputs |
| Modals | Modal overlay, modal box |
| Mobile Responsive | `@media (max-width: 768px)` overrides |
| Loading Screen | Splash/loading overlay |
| Analytics Dashboard | Chart containers, session list |

### 3.3 JS files — section mapping

Each JS file corresponds to one or more of the existing `// ══════` sections in the current `<script>` block. The table below shows exactly which current sections map to which new file.

| New file | Current sections (by header) | Line range | Approx lines |
|---|---|---|---|
| `state.js` | APP STATE | 2330–2373 | 44 |
| `data.js` | DATA LOADING | 2374–2413 | 40 |
| `persistence.js` | PERSISTENCE (localStorage) | 2414–2527 | 114 |
| `settings.js` | SETTINGS | 2528–2566 | 39 |
| `sidebar.js` | SIDEBAR | 2567–2744 | 178 |
| `deck.js` | DECK SELECTION & CARD RENDERING | 2745–2869 | 125 |
| `study.js` | SM-2 ALGORITHM + MASTERY + REVIEW DECK + MODE SWITCHING | 2870–3106 | 237 |
| `test.js` | TEST MODE + RATE CARD (SM-2) | 3107–3414 | 308 |
| `info-panel.js` | INFO PANEL + DIVIDER | 3541–4024 | 484 |
| `search.js` | SEARCH INDEX + SEARCH + SEARCH BAR TOGGLE | 3498–3540, 4155–4228, 4394–4424 | 87 |
| `extras.js` | CSV IMPORT + AI DECK GENERATION + DECK RENAME | 4025–4154 | 130 |
| `analytics.js` | ANALYTICS DASHBOARD | 4229–4393 | 165 |
| `events.js` | CONTEXT STRIP + KEYBOARD SHORTCUTS + SWIPE GESTURES | 3415–3497, 4425–4508 | 123 |
| `app.js` | INIT | 4509–4578 | 70 |

> **Note:** SEARCH INDEX (3498–3540) and CONTEXT STRIP (3415–3497) currently sit between TEST MODE and INFO PANEL in the file. They move to `search.js` and `events.js` respectively, which is a reordering of extraction but not a reordering of execution — all functions are defined before `init()` calls them.

### 3.4 Which files each planned feature touches

This is the payoff — the reason we're doing this:

| Feature | Files modified |
|---|---|
| **Japanese toggle** | `state.js` (add `LANG_CONFIGS`, `currentLang`), `data.js` (JLPT loading, normalization), `sidebar.js` (level display), `settings.js` (language pill), `info-panel.js` (label swaps), `styles.css` (font import) |
| **Appearance panel** | `styles.css` (gradient, accent vars), `settings.js` (new Appearance section), `persistence.js` (new `hanzi-appearance` key), `state.js` (appearance state vars) |
| **SM-2 / Review deck** | `study.js` only |
| **Context strip centering** | `events.js` + `styles.css` |
| **Search improvements** | `search.js` only |
| **Analytics upgrades** | `analytics.js` only |

Japanese and Appearance now share only `state.js` and `settings.js` — and even within those files, they touch different variables and different settings sections. That's a manageable overlap versus the current situation where both rewrite the same 4,580-line file.

---

## 4. Service worker update

`sw.js` needs two changes:

### 4.1 Cache version bump

```javascript
const CACHE_NAME = 'hanzi-v6.0';  // was 'hanzi-v5.14'
```

The major version bump signals "structural change" to anyone reading the code.

### 4.2 Updated asset list

```javascript
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/js/state.js',
  '/js/data.js',
  '/js/persistence.js',
  '/js/settings.js',
  '/js/sidebar.js',
  '/js/deck.js',
  '/js/study.js',
  '/js/test.js',
  '/js/info-panel.js',
  '/js/search.js',
  '/js/extras.js',
  '/js/analytics.js',
  '/js/events.js',
  '/js/app.js',
  '/manifest.json',
  '/data/hsk1.json',
  '/data/hsk2.json',
  '/data/hsk3.json',
  '/data/hsk4.json',
  '/data/hsk5.json',
  '/data/hsk6.json',
  '/data/cedict.json',
  '/data/hsk-enriched.json',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];
```

The fetch strategy (network-first for navigation, cache-first for assets) stays the same. The new `.css` and `.js` files are static assets → cache-first is correct.

---

## 5. Implementation approach

### 5.1 Order of operations

1. **Extract `styles.css`** — copy lines 13–2027 verbatim into `styles.css`
2. **Extract JS files** — copy each section's line range into the corresponding `.js` file, in the order listed in §3.3
3. **Rewrite `index.html`** — keep only `<head>` (with `<link>` replacing `<style>`), `<body>` HTML, and `<script src="...">` tags replacing the inline `<script>` block
4. **Update `sw.js`** — bump cache version, update asset list
5. **Verify** — open the app, confirm everything works identically

### 5.2 Verification checklist

After the split, every one of these should work exactly as before:

- [ ] App loads, loading screen appears, HSK data loads
- [ ] Sidebar shows HSK levels, chunks expand/collapse
- [ ] Selecting a chunk loads cards, flashcard renders
- [ ] Card flip, next/prev navigation
- [ ] Test mode starts, answers register, stats update
- [ ] Info panel opens, enriched data displays, tutor input works
- [ ] Settings toggle (theme, pinyin, timer, format)
- [ ] Export/import progress
- [ ] Search bar finds cards
- [ ] Analytics dashboard renders chart
- [ ] CSV import works
- [ ] AI deck generation works (with API key)
- [ ] Keyboard shortcuts respond
- [ ] Mobile: sidebar drawer, info panel sheet, swipe gestures
- [ ] Service worker caches new files, app works offline after first visit
- [ ] Light mode / dark mode toggle

### 5.3 Rollback

If something breaks badly: revert to the pre-split `index.html` + old `sw.js`. Since the service worker uses network-first for navigation, deploying the old `index.html` back to GitHub Pages will immediately serve the working version. Bump the cache name again to clear stale JS/CSS references.

---

## 6. What changes for the development workflow

### Before (monolith)

- Every conversation works on `index.html`
- `str_replace` targets must be unique across 4,580 lines
- Parallel work is impractical — both sessions produce conflicting versions of the same file

### After (modular)

- Each conversation works on 1–3 small files (typically 40–500 lines each)
- `str_replace` targets only need to be unique within the relevant file
- Parallel work is practical — the Japanese toggle session edits `data.js`, `state.js`, `sidebar.js`; the Appearance session edits `styles.css`, `settings.js`, `persistence.js`; overlap is minimal and manageable
- The spec and CLAUDE.md should be updated to reference the new file structure so future sessions know where to find things

---

## 7. Resolved decisions

| Question | Decision | Rationale |
|---|---|---|
| ES modules vs plain scripts? | **Plain scripts** | Zero code changes required. Global scope works as-is. Can upgrade later. |
| One CSS file or split CSS too? | **One `styles.css`** | CSS doesn't cause parallel-work conflicts the way JS does — selectors are naturally namespaced. One file keeps it simple. |
| `js/` subfolder or flat? | **`js/` subfolder** | Keeps the root clean. 14 JS files in the root alongside `index.html` would be noisy. |
| How many JS files? | **14** | One per logical domain. Could be fewer (combine `study.js` + `test.js`) but more granular = less overlap for parallel work. |
| Naming convention? | **Lowercase kebab-case** | `info-panel.js`, not `infoPanel.js`. Matches existing file naming (`sw.js`, `build-data.js`). |
