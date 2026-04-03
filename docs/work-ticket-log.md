# 汉字学习 — Work Ticket Log

> Running log of requested changes, decisions, and implementation status. Newest entries at top.

---

## 2026-04-03 17:45 — v5.3 Phase: UI Dimming + Context Strip Toggle — COMPLETE

**Status:** Done. Cache bumped to `hanzi-v6.12`.

### UI Dimming (§9.2)
- `styles.css`: Added `@media (min-width: 481px)` block — `header`, `.sidebar`, and `.controls-tray-wrap` dim to `opacity: 0.6` when `body.deck-active` is set. Hover restores to full opacity with 200ms transition. Flashcard, context strip, and info panel are exempt.

### Context Strip settings toggle
- `state.js`: Added `let showContextStrip = true;` (persisted as `hanzi-context-strip` per profile).
- `settings.js`: Added `toggleContextStrip()` — flips flag, writes to profile storage, calls `renderContextStrip()` + `syncSettingsUI()`. `syncSettingsUI` now syncs `#context-strip-toggle` element.
- `events.js`: `renderContextStrip()` now gates on `showContextStrip && currentMode === 'study' && activeDeck.length > 0`.
- `index.html`: Added "context strip" toggle row to `#prefs-study-group` settings popover.
- `app.js`: Reads `hanzi-context-strip` from profile data on init; defaults to `true` if not set.

### What was already done in prior sessions (v5.3 progress)
The following v5.3 items were completed before this entry — logging here for clarity:
- ✅ Modularization (2026-04-02)
- ✅ User profiles (localStorage partitioning, migration, picker UI)
- ✅ SM-2 spaced repetition + review deck
- ✅ Test mode flow (start screen, no-deck prompt, format picker, sidebar auto-open)
- ✅ Settings restructure (gear popover + full settings modal)
- ✅ Bottom controls tray (collapsible ▲/▼, shuffle + card list + hide/show)
- ✅ Search (header pill, `/` + `Cmd+K` shortcuts)
- ✅ Mode pill dimming (inactive pill at 0.55 opacity)
- ✅ Info panel hidden in test mode + tutor bar auto-hides without API key

### Still remaining from v5.3 spec (Appendix A)
- [ ] Deck panel interaction model (hover-expand, 300ms collapse delay, sticky-on-click, chunk dropdowns)
- [ ] Card list overlay (scrollable list inside flashcard, blur-behind, column-aligned)
- [ ] Animated gradient background / background system (CSS blob animation)
- [ ] Accent color adaptation (`applyAccentFromHue()`, CSS token rewrites)
- [ ] Timer display-only toggle
- [ ] Flashcard styling polish (reduce glassy effects)
- [ ] Info panel audio (TTS detect/hide)

---

## 2026-04-02 — Modularization — COMPLETE

**Status:** Done. `index.html` split into `styles.css` + 14 JS files in `js/`. Cache bumped to `hanzi-v6.0`. App verified loading correctly in preview.

---

## 2026-04-02 — PR branch regression recovery

**Status:** Identified, not yet implemented

**Context:** A previous Claude Code session implemented a large batch of features and fixes in a PR branch (`aabc678`). The PR was merged but the merge commit was bad — the merged tree kept the old main's `index.html`, dropping all new code. The subsequent Japanese toggle session was built on top of the bad merge, so all PR branch work is absent from current HEAD.

**Clarification on "text color" issue:** When the user sets a solid/custom background color in the appearance system, the UI text and gradients do not adapt to that background. The PR branch had `applyAccentFromHue()` which rewrites all CSS token variables (accent, bg, border, gradient start/mid/end) based on the background hue.

The following features and fixes need to be recovered and integrated with the current codebase (which includes the Japanese toggle):

### Bug fixes (isolated, no dependencies)
- [ ] Search pill `border-radius: 8px` → `999px` (1-line CSS fix)
- [ ] List view crash on every click (stale mousedown listener)
- [ ] List view is an overlay inside card scene, not a layout sibling (no layout shift)
- [ ] List overlay clips blur to card's rounded corners (`clip-path: inset(0 round 16px)`)
- [ ] List dismissed on next/prev/spacebar
- [ ] List has inner scroll container; active row scrolls into view
- [ ] List rows are 4-column grid; english text truncates
- [ ] Card auto-shrinks font for long hanzi (>4 chars) and long english (>40 chars)
- [ ] Nav arrow buttons white in dark mode (were `var(--text3)`)
- [ ] Card flip broken by `overflow:hidden` on `.card-inner`
- [ ] Review deck icon arrowhead shape wrong
- [ ] Search blocked in test mode (`toggleSearch`, `/` key, `Cmd+K`)
- [ ] Search closed on window blur (macOS focus artifact)
- [ ] `resetAppearance()` leaves `accent-theme` style element dangling
- [ ] Analytics open/close hijacks main content area and mode state
- [ ] Split-pane `overflow: hidden` causes scrollbar clipping (should be `auto`)

### Theme / Appearance
- [ ] CSS variables `--grad-start`, `--grad-mid`, `--grad-end` replacing hardcoded hex in all gradients
- [ ] `applyAccentFromHue()`: rewrites all CSS token vars based on background hue so entire UI palette matches background color (addresses text color adaptation issue)
- [ ] Smarter image persistence: switching background type away from image and back restores without re-picking
- [ ] Context strip hanzi plain text in dark mode, gradient only in light mode
- [ ] Collapsed deck names plain text in dark mode
- [ ] Context strip edge fades (gradient overlays left/right; `mask-image` on custom backgrounds)
- [ ] Context strip `justify-content: center` + `scrollIntoView({inline:'center'})`
- [ ] Darker blob opacities in dark mode
- [ ] Frosted-glass tooltip (`backdrop-filter: blur(12px)` + accent tint)
- [ ] Tooltip on header buttons positioned below, not above
- [ ] `backface-visibility: hidden` on sidebar, info panel, card faces, buttons
- [ ] `will-change: transform` on card inner; flip duration 0.45s

### Controls tray
- [ ] Fully transparent/floating at all times
- [ ] Chevron direction inverted (up = collapsed, down = open)
- [ ] Buttons styled as dark glass in dark mode
- [ ] Stats bar collapse toggle (chevron + `max-height` animation)
- [ ] Shuffle button moved into stats toggle row

### Info panel
- [ ] Expanded mode (`toggleInfoExpanded()`, "more info/collapse" button)
- [ ] Hidden + header button removed when in test mode
- [ ] Tutor bar auto-hides when no API key set
- [ ] Scrollbar only active when panel is open
- [ ] Opacity fade transition on open/close

### Mode toggle
- [ ] Single "test" button that toggles between study/test (study pill removed)
- [ ] Inactive mode pill dimmed by default

### Test mode
- [ ] Start screen: deck name + card count + format + "begin" button; stats reset only on begin
- [ ] "No deck" state shows prompt to select a deck
- [ ] Entering test mode auto-opens sidebar

### New features
- [ ] Favorites: star button per chunk, favorited chunks appear in custom decks section
- [ ] Context menu: right-click deck → delete; right-click chunk → add/remove from my decks
- [ ] Context strip on/off toggle in settings

### Workspace / Tiling
- [ ] Full workspace manager (multi-panel resizing, dividers, snap-to-grid)
- [ ] Long-press drag to reorder/swap panels
- [ ] Panel position memory
- [ ] Zoom control (50–200%, persisted, keyboard shortcuts)
- [ ] Flashcard panel toggle button in header
- [ ] Analytics as collapsible sidebar panel

**Implementation order suggestion:** Bug fixes first (isolated) → Theme/appearance (addresses user's text color issue) → Controls tray + Info panel polish → Mode toggle + Test mode flow → New features (favorites, context menu) → Workspace/tiling (largest, most architectural)

---

## 2026-04-02 — User profiles for multi-user support

**Status:** Spec drafted (`user-profiles-spec.md`), not yet implemented

**Request:** The app needs a way to serve multiple separate users. Otherwise people sharing the same deployed instance share metrics, review piles, tutor history, and settings.

**Decision:** Lightweight local profile system. No auth, no backend. Profiles are named localStorage partitions (prefixed keys). Auto-migration from current keyless format. Spec covers storage schema, migration, UI (header indicator + picker), export/import changes, and edge cases.

**Depends on:** Modularization (should be done first — refactoring `persistence.js` is much easier than find-and-replace across the monolith).

**Implementation order:** Storage access layer → migration logic → refactor persistence calls → profile picker UI → settings integration → export/import update.

---

## 2026-04-02 — Workspace tiling — SHELVED

**Status:** Shelved indefinitely. Reimplementation plan exists (`workspace-reimplementation-plan.md`) but deprioritized.

**Context:** Three rounds of workspace tiling feedback were implemented in a Claude Code session that expired before changes were pushed. The reimplementation plan breaks the work into 8 phases. However, after review, the workspace tiling system was deprioritized in favor of multi-user profile support, which is more foundational.

**What was planned (for future reference):**
- Phase 1: Panel toggle infrastructure (`.open` class, flex gap-filling)
- Phase 2: Per-panel fullscreen buttons
- Phase 3: Controls tray redesign (dropdown from under flashcard)
- Phase 4: Workspace settings + zoom controls
- Phase 5–8: Drag-and-drop reorder, floating panels, left-edge resize fix, workspace as its own mode

**Decision:** Can revisit later if workspace layout becomes a user need. The plan file is preserved.

---

## 2026-04-02 — Modularization — COMPLETE

**Status:** Done (see entry at top of log)

**Request:** Break `index.html` (~4,580 lines) into separate CSS and JS files for parallel development.

**Decision:** Pure extraction, no logic changes. 14 JS files + 1 CSS file. Plain `<script>` tags (no ES modules). Spec includes file structure, section mapping, service worker update, and verification checklist.

**Note:** Modularization spec needs a minor update — add `js/profiles.js` to the file structure to account for the user profiles feature. Also update the "which files each feature touches" table.

**Sequencing:** Modularization → Profiles → (then other v5.3 features)

---

## Pre-2026-04-02 — Prior work (from expired session)

The following changes were implemented but lost when a Claude Code session expired:

- Dark mode panel border visibility improvements (`--border` 0.10→0.14, `--border2` 0.17→0.25)
- Workspace tiling system v3 (CSS + JS, ~760 lines)
- Panel toggle infrastructure with `.open` class
- Per-panel fullscreen buttons
- "More info" button removed from info panel
- Deck button toggle behavior
- Floating panels mode (absolute positioning)
- Zoom controls (Ctrl+scroll, slider, reset)
- Snap-to-grid and floating panels settings toggles
- Controls tray repositioning
- Various bugfixes (min-width conflicts, opacity overrides, drag speed, overflow clipping)

**None of these changes exist in the current codebase.** The dark mode border fix is trivial and can be re-applied at any time. The workspace tiling work is captured in `workspace-reimplementation-plan.md` if ever needed.
