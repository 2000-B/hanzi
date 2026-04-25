# 汉字学习 — Work Ticket Log

> Running log of requested changes, decisions, and implementation status. Newest entries at top.

---

## 2026-04-25 — Phase 1: visual verification fold-ins

**Status:** Five bugs found during visual verification of `phase-1/quick-wins`. All fixed on the same branch. Cache bumped `hanzi-v6.53` → `hanzi-v6.54`.

### Findings during verification

- **Info-panel fade-out was not actually fading.** `.ws-panel:not(.open) { display: none !important }` (`styles.css:468`) was overriding `.info-panel.closing { display: flex }`. The `closing` class was being applied but the panel was instantly hidden, so `slideOutRight` never played — user saw a snap. Fixed by changing the rule to `.ws-panel:not(.open):not(.closing)`. Only `#info-panel` and `#main-content` carry `ws-panel`, and `#main-content` never gets `closing`, so the change is scoped.
- **Settings section header sizing was applied to the wrong class.** Phase 1 commit edited `.settings-section-title`, but the full-settings modal (`index.html:120+`) actually uses `.fs-section-label`, which was still 10px uppercase. Applied the same typographic update (14px / regular case / `var(--text)` color, with `margin-top: 18px` and a `:first-child { margin-top: 0 }` rule for section-leading labels) to `.fs-section-label`. Inline `style="margin-top:8px|12px"` overrides on sub-labels still take precedence as before.
- **Undo button anchored to wrong edge.** Phase 1 placed `.btn-undo` at `right: 12px`, which pinned it to the far right of the tray (well past the card). User wanted it adjacent to the rightmost centered tray button. Re-anchored to `left: calc(50% + 64px)` — three centered 32px buttons plus 8px gaps span 112px, so the rightmost button ends 56px right of center; +8px gap puts undo's left edge at center+64px. Three main buttons remain centered, undo sits 8px to the right of `#btn-mastered`.
- **Counter and test button were stationary, not flipping with the card.** Phase 1 moved them out of `.card-inner` to avoid mirroring on the back face, but the user wanted them to move with the flip. Restored as siblings of `.card-hanzi` etc. inside both `.card-front` and `.card-back`. Each face renders its own copy in normal orientation; `backface-visibility: hidden` on `.card-face` hides the away-facing copy. Switched from `id="card-counter"` / `id="card-mode-btn"` to class-based, and updated `updateProgress()` (deck.js) and `setMode()` (study.js) to write to all matching elements via `querySelectorAll`. Hover selectors moved from `.card-scene:hover` to `.card-face:hover`. The mode-btn `onclick` now stops event propagation so clicking it doesn't also flip the card.
- **Hidden (mastered) cards still appeared on the card face.** User requested that hidden cards only show as grayed in the context strip (already implemented via `ctx-mastered`) and as a hidden icon in the card list (was a green ✓). Switched `hideMastered` default from `false` to `true` in `state.js` so navigation always skips mastered cards. Replaced the card-list ✓ marker with an eye-slash SVG icon (matching the hide button's icon when active); restyled `.list-mastered` to use `var(--text3)` and `display: inline-flex` for icon alignment.

### Files touched
- `styles.css` — `.ws-panel:not(.open):not(.closing)`; `.fs-section-label` typography; `.btn-undo` re-anchor; `.list-mastered` restyle; `.card-face:hover` hover selectors
- `index.html` — counter + mode-btn moved into both `.card-front` and `.card-back`, IDs dropped, mode-btn onclick gains `event.stopPropagation()`
- `js/deck.js` — `updateProgress()` writes to all `.card-counter` via `querySelectorAll`
- `js/study.js` — `setMode()` writes to all `.card-mode-btn`
- `js/state.js` — `hideMastered` default → `true`
- `js/events.js` — card-list mastered indicator → eye-slash SVG with `title="hidden"`
- `sw.js` — cache bump

### Verified
- Info panel close: `closing` class held for 200ms with `display: flex` and `slideOutRight` animation; opacity transitions 1 → 0; panel then hides. Re-opening mid-close still works.
- Settings modal: all `.fs-section-label` items render at 14px, color `var(--text)`, no uppercase, breathing room between sections. Verified in both light and dark modes.
- Undo: three centered tray buttons at fixed positions (x=274/314/354); undo sits 8px to the right of the rightmost button at x=394.
- Card flip: counter `1 / 20` and `TEST` button visible at top-right / top-left in proper reading orientation on both front and back faces; positions match across faces.
- Hidden cards: marking a card as hidden auto-advances; nextCard / prevCard skip past hidden cards; eye-slash icon renders in the card list for each mastered card; context strip already shows them grayed via `ctx-mastered`.
- All other Phase 1 items re-verified post-reload.

---

## 2026-04-24 — Phase 1: quick wins — COMPLETE

**Status:** Done on branch `phase-1/quick-wins`. Cache bumped `hanzi-v6.52` → `hanzi-v6.53`. Awaiting user visual verification in dark/light modes before merge.

**Context:** First feature-work branch off Phase 0. Bundles bug fixes, polish items, and five fold-ins absorbed from the bad-merge triage. All small/medium scope changes; no new specs. See `docs/roadmap.md` Phase 1.

### Changes

**Original Phase 1 scope:**
- Hide/show mastered button: tooltip simplified from "hide mastered"/"show mastered" to "hide"/"show" (reflects the eye/eye-slash icon directly). `js/deck.js:62`, `index.html:304`.
- Tool tray centering: `.btn-undo` now `position: absolute` with right-aligned placement and a fade-in transform animation. The three main buttons stay centered when undo appears. `.controls-tray` gains `position: relative` as the anchor. `styles.css`.
- Backward card text orientation: `#card-counter` and `#card-mode-btn` moved out of `.card-face` (which flips with `rotateY(180deg)`) and into `.card-scene` as siblings of `.card-inner`. They retain absolute positioning at the same visual location and stay readable on the back face. Hover rules updated from `.card-face:hover` to `.card-scene:hover`. `index.html`, `styles.css`.
- Voice-availability detection: new `_hasTtsVoice()` helper in `js/info-panel.js`. Audio button is conditionally rendered based on whether `speechSynthesis.getVoices()` includes a voice matching the current language's `ttsVoicePrefix`. Voices may load asynchronously, so `_hasTtsVoice()` returns true optimistically when the list is empty; the `voiceschanged` handler now re-renders the info panel when voices update so the button can be added or removed in place.
- Settings section header sizing: `.settings-section-title` bumped from 10px uppercase to 14px regular case, with proper top margin; visual hierarchy now puts headers above body text. `styles.css:2158`.

**Bad-merge triage fold-ins:**
- `.list-view` gets `clip-path: inset(0 round 16px)` alongside existing `overflow: hidden` for reliable rounded-corner clipping of the backdrop blur.
- Tooltip frosted-glass with accent tint: `.app-tooltip` now uses `color-mix(in srgb, var(--accent) 78%, transparent)` with `backdrop-filter: blur(12px)`. Both dark and light modes share the accent-tinted frosted look. Solid-accent fallback retained for browsers without `color-mix` support.
- Tooltip positioning: header buttons (any button inside `<header>`) now always render their tooltip below the button. Other buttons keep the existing rect.top-threshold behavior. `js/app.js:147-156`.
- Info panel scrollbar (expanded scope from triage): `.info-panel` gains `overflow: hidden` so its scrollbar is clipped to the rounded corners. `.info-panel-scroll` gets a thin custom scrollbar (6px, accent-tinted thumb on a transparent track) styled for both Firefox (`scrollbar-width`/`scrollbar-color`) and WebKit (`::-webkit-scrollbar*`). Light-mode variants included.
- Deck panel scrollbar restored with the same approach: `.sidebar-scroll` previously had `scrollbar-width: none`; now gets the thin styled scrollbar. `.sidebar` already had `overflow: hidden` + `border-radius`, so the rounded clipping comes for free.
- Info panel opacity fade: new `slideOutRight` keyframe mirrors `slideInRight`. `.info-panel.closing` class plays the fade-out while keeping `display: flex` for the duration. `toggleInfoPanel()` adds `.closing` and removes `.open` on close, with a 200ms timer to remove `.closing`. Re-toggling mid-animation cancels cleanly via the timer.

### Files touched

- `index.html` — tray button tooltip relabel; counter and test button relocated out of `.card-front`
- `js/app.js` — tooltip positioning gains header-detection branch
- `js/deck.js` — mastered-button tooltip uses simplified labels
- `js/info-panel.js` — `_hasTtsVoice()` helper, conditional audio button render, voiceschanged re-render hook, `toggleInfoPanel()` rewrite for fade-out coordination
- `styles.css` — eight distinct edits: list-view clip-path, settings section title, tooltip styling, card counter/mode-btn hover selectors and comments, btn-undo absolute positioning, controls-tray relative anchor, info-panel overflow + slideOutRight + closing class, info-panel-scroll thin scrollbar, sidebar-scroll thin scrollbar
- `sw.js` — cache version bump
- `docs/roadmap.md` — Phase 1 task list marked done

### Verified
- All modified JS files pass `node --check` syntax validation
- `npm test` continues to pass (placeholder test reachable)

### Pending verification (user-side)
- Visual smoke test in dark and light modes
- Confirm card counter and test button render correctly on both card faces
- Confirm tooltip appears below header buttons and matches frosted-glass aesthetic
- Confirm info panel scrollbar is visible, thin, and clipped to rounded corners
- Confirm deck panel scrollbar restored without clipping
- Confirm info panel fades out when closed (rather than snapping)
- Confirm undo button does not shift the three main tray buttons when it appears

### Next
- User visual verification, then merge `phase-1/quick-wins` to main and start Phase 2 (`phase-2/tray-search-welcome`)

---

## 2026-04-24 — Roadmap, doc structure, Phase 0 — COMPLETE

**Status:** Done. No cache bump (no shipped-asset changes).

**Context:** Multi-session planning pass. User wanted a real roadmap, design docs in order, and a triage of the 2026-04-02 bad-merge regression list before resuming feature work. Established documentation conventions and test scaffolding so Phase 1 can begin clean.

### Documentation
- [x] `docs/CLAUDE.md` rewritten as a navigation map (doc index + workflow conventions)
- [x] `docs/feature-status.md` created — single source of truth for feature state
- [x] `docs/roadmap.md` created — eight phases with goal/scope/done-criteria/checklist
- [x] `docs/progress-management-spec.md` created — active focus + daily session + mastery-gated promotion (Phase 5)
- [x] `docs/tray-customization-spec.md` created — tool tray buttons + settings toggles (Phase 2)
- [x] `docs/search-consolidation-spec.md` created — header search → deck-panel + card-list searches (Phase 2)
- [x] `docs/bad-merge-triage.md` created — 52 items triaged, dispositions resolved
- [x] Shelved banner added to `docs/workspace-reimplementation-plan.md`
- [x] `project-workflow-blueprint.md` (workspace root) — reusable doc/workflow conventions for future projects

### Triage outcomes (2026-04-02 bad-merge list)
- 24 items DONE, 19 MISSING, 8 AMBIGUOUS, 1 mixed
- Five missing items absorbed into Phase 1: list overlay clip-path, frosted-glass tooltip, tooltip-below positioning, info-panel scrollbar (expanded scope — clipping bug, possible deck-panel scrollbar restoration), info-panel opacity fade
- Ten items dropped (analytics-related deletions, zoom shelved, stats-bar concept abandoned, font auto-shrink low-value, panel position memory beyond info width, deck name dark-mode variant, dark-mode blob opacities presumed addressed)
- Snap-to-grid intentionally removed (confirmed)

### Test scaffolding
- [x] `package.json` at workspace root (no dependencies — `node --test` is built-in)
- [x] `tests/sample.test.js` placeholder
- [x] `npm test` runs and the placeholder passes

### Files added
- `docs/CLAUDE.md` (rewritten)
- `docs/feature-status.md`
- `docs/roadmap.md`
- `docs/progress-management-spec.md`
- `docs/tray-customization-spec.md`
- `docs/search-consolidation-spec.md`
- `docs/bad-merge-triage.md`
- `project-workflow-blueprint.md`
- `package.json`
- `tests/sample.test.js`

### Files modified
- `docs/workspace-reimplementation-plan.md` — shelved banner added at top

### Next
- Phase 1 (quick wins) is unblocked; will move to its own feature branch when ready

---

## 2026-04-07 — UI/UX Redesign Phase 3: Interface Refinements — COMPLETE

**Status:** Done. Cache bumped to `hanzi-v6.52`. 12 UI refinements implemented.

**Context:** Batch of interface polish items requested after Phase 2. Focus on panel behavior, settings cleanup, visual polish, and first-time user experience.

### Panel Behavior
- [x] **Panel split ratio memory** — info panel width saved on resize (both edge-drag and workspace divider), restored when panel reopens. Persisted per-profile as `hanzi-info-width`.
- [x] **Fullscreen looks like default state** — `.ws-fullscreen` uses `inset: 6px` with same border-radius, making fullscreen feel like the natural layout.
- [x] **Fullscreen hides other panels** — entering fullscreen sets `display: none` on sibling panels and dividers; exiting restores them.
- [x] **Escape restores panels** — workspace.js Escape handler now restores hidden panels/dividers when exiting fullscreen. Uses `stopImmediatePropagation()` to prevent events.js handler from also closing the info panel.

### Settings Restructuring
- [x] **Removed RGB/custom color picker** — `color-preview-row` with hex input removed from full settings. Curated swatch palette is now the only accent selector.
- [x] **"Tint UI to accent" toggle** — new `appearance.matchBg` flag. When enabled, calls `applyAccentFromHue()` to tint all bg/border/surface colors to match the accent hue. Toggle in full settings under accent color.
- [x] **Language section moved up** — language pill now appears above API key and data sections in full settings (was at the very bottom).
- [x] **Swatch wrapping fix** — `.settings-panel .swatch-row` gets `flex-wrap: nowrap` to prevent orphan swatch wrapping in quick settings. Dot size 22→20px, gap 6→5px.

### Visual Polish
- [x] **Dark mode card gradient** — `.card-face::before` now has subtle `linear-gradient(165deg, rgba(255,255,255,0.04) … rgba(255,255,255,0.02))` sheen overlay in dark mode.
- [x] **Tool tray spacing** — `.card-column:has(.controls-tray-wrap.tray-open)` adds `margin-bottom: 56px` with smooth transition, shifting the card up via flex centering when tray opens.
- [x] **Tooltip viewport clamping** — generic tooltip system now measures tooltip width after render, then clamps `left` position to stay within `8px` of viewport edges.

### First-Time Experience
- [x] **Welcome modal** — shown on first launch (no progress data + default profile). Prompts for profile name and language selection. Animated entrance, matches app styling. Sets `hanzi-welcomed` flag. Existing users upgrading are not shown the modal (checks for existing progress data).

### Files Modified
- `index.html` — welcome modal HTML, settings restructuring (removed color picker, moved language, added tint toggle)
- `styles.css` — welcome modal styles, card gradient sheen, tray spacing with `:has()`, swatch sizing
- `js/workspace.js` — Escape handler fix (restore panels + stopImmediatePropagation), save info width on divider drag
- `js/info-panel.js` — save/restore info panel width on resize and open
- `js/settings.js` — `toggleMatchBg()`, `appearance.matchBg` property, updated `saveAppearance`/`resetAppearance`/`syncSettingsUI`/`applyBackground`/`selectSwatch`
- `js/app.js` — `completeWelcome()` function, first-launch detection in `init()`
- `sw.js` — cache version `hanzi-v6.51` → `hanzi-v6.52`

---

## 2026-04-07 — UI/UX Redesign Phase 2: Polish, Multi-provider AI, Dark/Light Mode Overhaul — COMPLETE

**Status:** Done. Cache bumped to `hanzi-v6.50`. All changes committed and pushed.

**Context:** Continuation of the comprehensive UI/UX redesign. This session addressed visual polish, interaction bugs, theming overhaul, and multi-provider AI support.

### Workspace & Panels
- [x] Restored full tiling system (`_initTiling` with dividers, drag reorder, edge resize, MutationObserver) that was accidentally over-deleted in a prior session
- [x] Fixed panels scrolling off screen — `.split-pane` overflow changed from `auto` to `hidden`
- [x] Fixed flashcard 4px internal scroll — `.study-area` overflow changed from `auto` to `hidden`
- [x] Double-click info button now toggles fullscreen (click-delay pattern, 250ms threshold)

### Card Flip Z-Order
- [x] Card now passes in front of tray buttons during flip animation
- [x] `.card-column` → `transform-style: preserve-3d` (shared 3D space)
- [x] `.controls-tray-wrap.active` → `translateZ(-1px)` pushes tray behind card in 3D depth

### Controls Tray
- [x] Chevron more visible (opacity 0.85, pill background, margin-top 6px)
- [x] Chevron returns to naked look when tray is open
- [x] Tray buttons lighter — match card face appearance instead of dark bg3

### Sidebar Fixes
- [x] Fixed sidebar closing on favorite/unfavorite toggle — context menu clicks now excluded from "click outside" handler
- [x] Chunk favorites cleared when chunk size changes (since chunk numbers no longer map to same cards) — toast notification informs user
- [x] Added `_setChunkSize()` helper used by both HSK and JLPT context menus

### Review Deck Redesign
- [x] Replaced PNG icon with inline SVG refresh icon
- [x] Three visual states: empty (subdued), has-cards (gradient CTA), active (solid accent)
- [x] Permanent sidebar fixture

### Dark Mode Overhaul
- [x] Frosted glass surfaces throughout — sidebar, info-panel, settings, search, context menu, modals all use `rgba(14,14,22,0.90)` + `backdrop-filter: blur(20px)`
- [x] Refined design tokens: text3 `#62628e`→`#6e6e8a`, text2 `#9898bc`→`#a0a0ba`, card-bg opacity 0.78→0.82, adjusted borders/elevations
- [x] Animated blob gradient now visible through all frosted panels

### Light Mode Overhaul
- [x] Warmer tones: bg `#f0f1f3`→`#f2f3f5`, text2 `#6b7280`→`#5e6672`
- [x] Subtle blob tint visible (opacity 0→0.5 on `body.light::after`)
- [x] Better border definition (`--border2` opacity 0.09→0.11)
- [x] More opaque panels (sidebar/info-panel 70%→78%)
- [x] Frosted glass modal override for light mode

### Multi-Provider AI Support
- [x] `AI_PROVIDERS` object in `persistence.js` with Anthropic, OpenAI, Google configurations
- [x] `detectProvider(key)` auto-detects from prefix: `sk-ant-`→Anthropic, `sk-`→OpenAI, `AIza`→Google
- [x] `callAI(opts)` unified async function — drop-in replacement for direct Anthropic fetch
- [x] Updated `aiDeepDive()`, `sendTutorMsg()`, and `generateDeck()` to use `callAI()`
- [x] Info tooltip on API KEY field shows supported providers and key prefixes

### API Info Tooltip Fix
- [x] Tooltip was clipping behind `.full-settings` panel (`overflow: auto`) when positioned centered
- [x] Changed from `left: 50%; transform: translateX(-50%)` to `left: 0` — extends right instead of centering

### Other
- [x] Removed Chart.js from service worker cache (analytics panel killed)
- [x] Removed `js/analytics.js` from SW asset list
- [x] Hardcoded `rgba(232,146,10,0.12)` in ip-component changed to `var(--accent-border)` for theme hue adaptation

---

## 2026-04-04 — UI/UX Redesign Phase 1 — COMPLETE

**Status:** Phase 1 implemented. See 2026-04-07 entry for Phase 2.

**Context:** Comprehensive UI/UX audit identified structural problems, visual inconsistencies, and overengineered features. The goal is an interface that would score high marks from an expert web designer — clean, consistent, purposeful.

### Phase 1: Color Fix (highest visual impact)
- [ ] Fix `applyThemeColors()` light-mode HSL values — current 40% lightness reads as muddy brown, needs ~55-60% for gold
- [ ] Remove red from gradient end — keep amber-gold monochrome family
- [ ] Solid accent colors should pull from the lighter/golden end of the spectrum

### Phase 2: Header Cleanup
- [ ] Remove profile button from header → move into settings
- [ ] Remove analytics button from header → kill analytics panel entirely
- [ ] Remove test pill from header → move into deck panel or card area
- [ ] Move card counter onto flashcard face (top-right corner)
- [ ] Final header: `汉字学习 ........... 🔍 📚 ⓘ ⚙` (4 action buttons)

### Phase 3: Kill Collapsed Sidebar
- [ ] Remove collapsed sidebar state — panel is open or closed
- [ ] Deck button in header toggles full panel open/closed
- [ ] Clean slide-in/out animation (no translucency flash, no rubber-banding)
- [ ] All chunks collapse when panel closes
- [ ] Card reclaims the ~52px that the collapsed strip was using

### Phase 4: Card & Study Area
- [ ] Remove nav arrow buttons
- [ ] Make card responsive — fill available space, not fixed 340px
- [ ] Consistent 6px gap between all panels, header, and edges
- [ ] Context strip: either part of header or part of card area, not floating between
- [ ] Controls tray: "Hide" text → eye-slash icon

### Phase 5: Info Panel Restructure
- [ ] User note moved to top of panel
- [ ] "More info" expandable section for etymology, examples, tutor button
- [ ] Tutor bar becomes a button → opens chat overlay
- [ ] Double-click header button or hover corner icon for panel fullscreen

### Phase 6: Deck Panel Improvements
- [ ] Review deck as distinct pinned card at top, badge on header button when closed
- [ ] Chunk size controls hidden → right-click context menu on decks
- [ ] Thin gradient progress bar on each deck/chunk row (mastery %)
- [ ] "+ new deck" visually quiet (small, not full-width button)
- [ ] Favoriting and pin via right-click menu

### Phase 7: Settings Redesign
- [ ] Replace color picker with curated swatch palette (8-10 presets + optional custom)
- [ ] Kill primary/secondary color split
- [ ] Kill image background option
- [ ] Profile management moved here from header
- [ ] Analytics summary (if kept) moved here
- [ ] Hierarchy: Appearance (hero) → Study+Test → API Key+Data (bottom)

### Phase 8: Kill Analytics Panel
- [ ] Remove analytics view, header button, and toggle logic
- [ ] Distribute useful stats into deck panel progress bars + badges
- [ ] Remove Chart.js from CDN dep and service worker cache list

### Phase 9: Animation Polish
- [ ] Deck panel: clean CSS slide, no translucency artifacts
- [ ] Deck names: consistent spacing between collapsed/expanded states (eliminated by killing collapsed state)
- [ ] Escape key closes any open panel/overlay

### Design Principles (from interview)
- The character is the hero — everything else recedes
- One hue family, derived consistently everywhere
- Frosted glass on panels, not on everything
- Power-user features (chunk size, context menu) hidden but accessible
- Mobile: not primary target but should not break
- Color accents constrained to 1-2 areas per view (progress bars, active states)

---

## 2026-04-03 20:30 — Colour scheme + tiling restoration + caching fix — COMPLETE

**Status:** Done. Cache bumped to `hanzi-v6.15`.

### Colour scheme overhaul
- Gradient tokens: blue-purple-cyan → warm amber-orange (`#ffb347 / #f07b25 / #e04838`)
- Accent: blue `#6070ff` → teal-green `#10b981 / #0d9488` (matches DESIGN.md)
- Dark mode borders: blue-tinted `rgba(96,112,255,…)` → neutral `rgba(255,255,255,…)`
- Dark mode bg blobs: blue-purple → warm amber-orange
- Light mode bg blobs: removed (`opacity: 0`) — solid `#f0f1f3`
- Card face (light mode): `background: #ffffff`, neutral shadow, no blue tints
- All hardcoded `rgba(96,112,255,…)` values removed from card face, `::before`, deck items, rating buttons
- App now defaults to light mode; explicit `dark` save overrides
- Review deck icon: `filter: brightness(0) invert(1)` in dark mode → white
- Collapsed HSK labels: `.hsk-label-icon` CSS class using gradient vars (was hardcoded hex)

### Accent override fix
- Root cause: `applyAccentFromHue()` was injecting `<style id="accent-theme">` on every load, overriding all CSS token vars with `blobHue: 240` (blue) from saved appearance
- Fix: in default background mode, `applyAccentFromHue()` is no longer called; CSS vars define colours directly; stale `accent-theme` element removed on switch back to default
- Default `blobHue` changed from `240` → `25` (orange/amber); default `color` `#4f7fff` → `#10b981`

### Tiling workspace restored from `claude/infallible-benz` branch
- `id="workspace"` added to `.split-pane`; `ws-panel` class added to `#info-panel`
- CSS: `.ws-panel` shared styles (border/radius/margin/transition); `.workspace-dragging` blur effect; `.ws-divider` handle with accent highlight; `.ws-drop-indicator` dashed drop zone
- `workspace.js`: full `_initTiling()` — `rebuildLayout()`, divider resize (snap-to-edge), long-press drag-to-reorder (250ms), panel edge resize (8px hotzone), MutationObserver for open/close, public API

### Caching fix
- Root cause: `?v=x.x` query params on `<script>`/`<link>` tags conflicted with SW ASSETS list (bare paths). CDN and HTTP cache treated them as different URLs; SW never served JS/CSS from cache.
- Fix: removed all `?v=` params from `index.html`. SW `CACHE_NAME` version is the sole cache-bust mechanism. Bump `CACHE_NAME` in `sw.js` → old caches deleted on activate → fresh fetch on install.
- Old `hanzi-v6.1` cache in preview cleared programmatically via preview eval tools.
- Stale saved appearance (`blobHue: 240`) cleared from localStorage to allow new defaults.

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
