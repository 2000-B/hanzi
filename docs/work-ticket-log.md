# 汉字学习 — Work Ticket Log

> Running log of requested changes, decisions, and implementation status. Newest entries at top.

---

## 2026-04-25 — Phase 2: post-merge tweaks (round 6)

**Status:** Visual polish on `phase-2/tray-search-welcome`. Cache bumped `hanzi-v6.60` → `hanzi-v6.61`.

### Changes

- **Blur extended below the search pill.** New `.list-search-fade-bottom` element sits at the very bottom of the list-view, height 6px, with `backdrop-filter: blur(8px)`, filling the gap between the pill's bottom edge and the list-view's rounded bottom. The frosted effect now wraps around the pill rather than visibly stopping at its top edge.
- **Fade restored over the scrollbar.** Previous round pulled the upper fade's `right` to 6px to keep the scrollbar lane clear; user feedback was the scrollbar should blur with everything else. Restored `right: 0` so the fade extends to the right edge.
- **Dark-mode pill now darker bg + whiter outline / text.** Earlier round had lifted the bg to `rgba(28,28,42,0.82)` to make the pill visible. User wanted the pill to stay dark and gain visibility through the outline and text instead. Reverted bg to `rgba(13,13,26,0.55)`, added `border-color: rgba(255,255,255,0.32)` on the inner `.search-bar`, set input text to `#fff`, placeholder to `rgba(255,255,255,0.65)`, and search icon to `rgba(255,255,255,0.7)`.

### Files touched

- `styles.css` — `.list-search-fade { right: 6 → 0 }`; new `.list-search-fade-bottom`; dark-mode `.list-search` reverted bg + new border/text/icon colors
- `js/events.js` — `renderListView()` appends `.list-search-fade-bottom`
- `sw.js` — cache bump

### Verified

- Bottom fade element rendered with `backdrop-filter: blur(8px)` confirmed via DOM query.
- Dark-mode pill `backgroundColor` = `rgba(13,13,26,0.55)`, `.search-bar` `border-color` = `rgba(255,255,255,0.32)`.
- Pill text + placeholder visibly whiter against the darker pill in the screenshot.

---

## 2026-04-25 — Phase 2: post-merge tweaks (round 5)

**Status:** Visual polish on `phase-2/tray-search-welcome`. Cache bumped `hanzi-v6.59` → `hanzi-v6.60`.

### Changes

- **Card-list fade reproportioned to the slimmed pill.** Pill is now ~30px tall, but the fade element above it was still 48px and sat 6px above the pill — disproportionate, with a visible empty gap where the pill and fade should meet. Pulled fade `bottom: 42 → 36px` so it's flush with the pill's top edge, and `height: 48 → 36px` so the fade height roughly matches the pill height. Mask gradient eased from `40% black` to `30% black` so the upper two-thirds is the actual fade rather than a hard cap.
- **Search pill more visible in dark mode.** The pill bg was `rgba(13,13,26,0.55)` — too close to the list-view's own dark bg, so the pill was barely distinguishable. Switched to `rgba(28,28,42,0.82)` (lighter dark + higher opacity) plus a `1px solid rgba(255,255,255,0.06)` border so the pill clearly reads as a floating element. Light mode bumped from `0.55 → 0.72` opacity for matching presence on a light list-view.

### Files touched

- `styles.css` — `.list-view .list-search` bg + border (light + dark variants); `.list-view .list-search-fade` bottom + height + mask
- `sw.js` — cache bump

### Verified

- Pill height ≈ 32px, fade height = 36px — roughly matched and flush.
- Dark-mode pill bg = `rgba(28,28,42,0.82)` confirmed via computed style; visibly distinct from the list-view's own dark bg.
- Light mode: pill remains visible against the white list-view; bottom row blurs cleanly into it through the fade.

---

## 2026-04-25 — Phase 2: post-merge tweaks (round 4)

**Status:** Visual polish on `phase-2/tray-search-welcome`. Cache bumped `hanzi-v6.58` → `hanzi-v6.59`.

### Changes

- **Deck-panel search pill slimmed and tightened.** The pill was inheriting the original full-size dimensions and reading too "weighty" at the top of the panel. Reduced `.search-pill .search-bar` padding from `6px 12px` to `3px 10px`, dropped input font-size 13 → 12px, shrunk the search icon 14 → 12px and pulled it left 10 → 8px, and tightened `.sidebar > .deck-search` margin from `10px 12px 8px` to `6px 6px 4px`. The pill now sits closer to the panel's rounded corners and matches the silhouette of the (removed) header search pill. The card-list overlay search inherits the same slim look.
- **Tool tray buttons now share the flashcard's shade.** Previously the buttons used translucent white over the card, which read as a separate surface. Switched the bg to `rgba(13,13,26,0.92)` (matches `.card-face` in dark mode) and `#fefefe` (matches in light mode); border colors and hover states retuned to match the card's edge treatment. Buttons now feel like extensions of the flashcard rather than overlay chrome.

### Files touched

- `styles.css` — `.search-pill .search-bar` padding tighter; `.search-pill .search-input` size + padding; `.search-pill .search-icon` size + position; `.sidebar > .deck-search` margin; `.controls-tray .btn` and light variant + hover states match `.card-face`
- `sw.js` — cache bump

### Verified

- Deck-panel pill: padding `3px 10px`, input font-size 12px, sidebar margin `6px 6px 4px` confirmed via computed styles.
- Tray button bg in dark = `rgba(13,13,26,0.92)` = `.card-face` bg.
- Tray button bg in light = `rgb(254,254,254)` = `.card-face` bg `#fefefe`.

---

## 2026-04-25 — Phase 2: post-merge tweaks (round 3)

**Status:** Visual polish on `phase-2/tray-search-welcome`. Cache bumped `hanzi-v6.57` → `hanzi-v6.58`.

### Changes

- **List-view scrollbar excluded from the blur fade.** The fade element previously stretched to the right edge of the list-view, causing the inner scrollbar to render under the backdrop-filter and appear blurred along with the rows. Pulled the fade's `right` from 0 → 6px so the scrollbar lane sits outside the fade and renders at full sharpness while rows still blur as they approach the search bar.
- **Search-pill buffer tightened 12 → 6px.** Pill now sits 6px from the list-view edges (left/right/bottom) so the gap visually matches the pill's own internal padding instead of leaving a visible whitespace ring. Adjusted `.list-search-fade` bottom (48 → 42), `.list-search-results` bottom (60 → 48) and edges (12 → 6), and `.list-scroll` padding-bottom (64 → 56) to keep the spacing consistent with the new pill position.
- **Context strip default flipped to off.** New users now start with `showContextStrip = false`. Existing profiles' persisted setting still wins (per-profile via `hanzi-context-strip`), so this is only a fresh-install default change.

### Files touched

- `styles.css` — `.list-search` left/right/bottom 12 → 6; `.list-search-fade` right 0 → 6 and bottom 48 → 42; `.list-search-results` bottom 60 → 48 and edges 12 → 6; `.list-scroll` padding-bottom 64 → 56
- `js/state.js` — `showContextStrip` default `true` → `false`
- `sw.js` — cache bump

### Verified

- Light + dark: search pill sits closer to the list-view edges; visible buffer matches the pill's internal padding.
- Scrollbar at the right edge of the list-view renders clearly through the fade region (no blur applied to it).
- New profile with no persisted setting starts with context strip hidden.

---

## 2026-04-25 — Phase 2: post-merge tweaks (round 2)

**Status:** Visual polish on `phase-2/tray-search-welcome`. Cache bumped `hanzi-v6.56` → `hanzi-v6.57`.

### Changes

- **List-view search pill made translucent + backdrop-blurred.** The previous solid `var(--bg2)` background hid everything underneath — so blur effects elsewhere weren't doing visible work. The pill now uses `rgba(255,255,255,0.55)` (light) / `rgba(13,13,26,0.55)` (dark) plus `backdrop-filter: blur(14px)` so list rows behind it remain faintly visible (blurred) and the bar reads as a frosted floating element. The fade element above the bar was tuned (height 56→48px, mask 30→40% black) so the transition between blurred-by-fade and blurred-by-pill is smoother.
- **Card-face / list-view / welcome-card border-radius bumped 16 → 22px.** The list-view's bottom-rounded corners and the search pill's pill-shaped corners no longer compete visually; the card itself still feels coherent. `.card-inner.flipped` border-radius was left at 16 (it's not visually exposed). Updated all three places that pair (face, sheen overlay, list-view clip-path).
- **Scrollbars trimmed.** Global / sidebar / info-panel webkit scrollbars dropped from 6px width / 3px radius to 4px / 2px. They were dominating the panel edges; now they're a thin guide.
- **Tooltip hover delay added.** `data-tip` tooltips now wait 600ms before showing (matches the tool-tray slide timing). Context-strip tiles are exempt — their pinyin/english tooltip is the primary affordance for that row of dense character tiles, so instant feedback is wanted there. Implementation: `setTimeout` keyed on the element, cleared on mouseout; an `el.closest('.context-strip')` check chooses instant vs delayed.

### Files touched

- `styles.css` — `.list-view .list-search` translucent + blur (with dark-mode variant); `.list-search-fade` height/mask tuned; `.card-face`, `.card-face::before`, `.list-view`, `.welcome-card`, `.welcome-card::before` border-radius 16 → 22; sidebar / info-panel / global scrollbars 6 → 4px, radius 3 → 2
- `js/app.js` — tooltip mouseover handler split into `showTip()` helper; 600ms `setTimeout` with context-strip exception
- `sw.js` — cache bump

### Verified

- List-view in light + dark: search pill shows rows behind it through a frosted blur; fade above the bar transitions smoothly into the pill region.
- Tooltip on `#btn-info`: hidden at 50/200/500ms, visible at 700ms (matches the 600ms delay).
- Tooltip on context-strip tile: visible at 50ms (instant).
- Card / list-view / welcome card all share the new 22px radius — visually consistent across faces and overlay.
- Scrollbar visibly thinner in sidebar; less prominent against the rounded panel edge.

---

## 2026-04-25 — Phase 2: post-merge tweaks (round 1)

**Status:** Visual-verification follow-ups on `phase-2/tray-search-welcome`. Cache bumped `hanzi-v6.55` → `hanzi-v6.56`.

### Changes

- **Card-list backdrop-blur fade.** New `.list-search-fade` element above the card-list overlay's search input. 56px tall, `backdrop-filter: blur(8px)` with a top-fading mask so list rows scrolling toward the input get progressively blurred — an inline focus cue that the input is the active interaction point. Verified in dark + light modes.
- **Tool-tray centering with hidden buttons.** Two bugs surfaced when toggling tray buttons in settings: `.controls-tray .btn { width: 32px }` was overriding `.btn-undo { width: 0 }` (so undo silently held a 32px slot when hidden), and the flex `gap: 8px` added a trailing gap before the (now zero-width) undo, shifting the visible buttons 4px left of center per hidden item. Fix: tightened the undo selector to `.controls-tray .btn-undo`, and added `margin-left: -8px` while undo is hidden (animates back to 0 alongside the show animation).
- **Undo show/hide smooth animation.** Two issues: (a) the rule had a duplicate `transition:` declaration where the second overrode the first, leaving only `opacity, transform` actually transitioning; (b) `width: auto → auto` doesn't animate. Fix: removed the duplicate `transition` line, switched from `width: 0 → auto` to `max-width: 0 → 80px` (animatable), and unified durations at `.28s` for geometry + `.2s` for opacity/border to match the tool-tray slide-out timing. Width animates smoothly from 0 to natural ~50px over the .28s window.
- **Pencil tray button — focus + flash on open.** `openNoteFromTray()` reworked to share a single `focusAndFlash()` helper across all three paths (panel-closed, panel-open-and-in-view, panel-open-out-of-view). When the panel was just opened, focus is delayed 60ms so the slide-in animation starts before focus steals attention. Flash now fires in all three cases.
- **"saved" indicator gated on actual change.** Previously `saveNote()` ran on every blur and unconditionally flashed `saved ✓` — even when the user clicked into the textarea and out without typing. Added an early-return when `note === prev`; the indicator only appears when the saved value actually changed.

### Files touched

- `styles.css` — `.list-search-fade`; `.controls-tray .btn-undo` selector tightened, max-width animation, removed duplicate transition, margin-left -8px when hidden
- `js/events.js` — `renderListView()` appends `.list-search-fade`
- `js/info-panel.js` — `openNoteFromTray()` rewrite with shared `focusAndFlash`; `saveNote()` early-returns on no change
- `sw.js` — cache bump

### Verified

- Card list overlay: bottom row visibly blurred while rows higher up are clear; effect works in both dark and light modes.
- Tray with 4 visible buttons (default, infoPanel hidden): group center 330 = tray center 330, offset 0px.
- Tray with all 5 visible: undo sits 8px to the right of the rightmost button, group of 5 centered.
- Undo show animation: width grows 2→16→45→49→50px across the 280ms window with opacity easing 0.07→1.00.
- Pencil tray click on closed panel: panel opens, `#user-note` is focused (`document.activeElement === ta`), flash class applied for 600ms.
- saveNote on unchanged blur: no `.show` class added; on text change: `.show` class added; on revert to empty: `.show` added (it changed). All four states correct.

---

## 2026-04-25 — Phase 2: tray, search consolidation, welcome card — COMPLETE

**Status:** Done on branch `phase-2/tray-search-welcome` (working in `claude/strange-poincare-ca9fde`). Cache bumped `hanzi-v6.54` → `hanzi-v6.55`. Awaiting visual verification before merge.

**Context:** Restructure of the tool tray (two new buttons + per-button settings toggles), search consolidation (header search removed, deck-panel and card-list-overlay searches added), and a welcome card placeholder for the empty state. See `docs/roadmap.md` Phase 2, `docs/tray-customization-spec.md`, and `docs/search-consolidation-spec.md`.

### Changes

**Welcome card (empty state):**
- `LANG_CONFIGS` gains `welcomeGreeting` (`你好` / `こんにちは`); `applyLangUI()` writes it into `#welcome-greeting` and toggles `body.ja-mode` so the JP font is used in Japanese mode.
- `index.html` empty-state replaced with a flashcard-shaped `.welcome-card` containing the greeting + "Hello" + a hint underneath. Mirrors `.card-face` styling (rounded, subtle shadow, dark/light variants).

**Pencil-on-hover bug:**
- Confirmed: `.card-note-indicator` (top-left, z-index auto) was fully covered by `.card-mode-btn` (top-left, z-index 2) when both were rendered. Test button only visible at opacity 0.5 by default but rose to 1 on hover, fully obscuring the pencil.
- Fix: pencil moved to top-right (`right: 50px`, left of `.card-counter`), z-index 2. Hover now boosts opacity to 0.9 in addition to default 0.55.

**Tray customization:**
- Two new buttons in `.controls-tray`: `#btn-tray-note` (pencil, `data-tray-key="notePencil"`) and `#btn-tray-info` (i-in-circle, `data-tray-key="infoPanel"`). `#btn-mastered` gains `data-tray-key="hideMastered"`.
- Pencil click → new `openNoteFromTray()` in `js/info-panel.js`: opens panel if closed and focuses `#user-note`; if open and visible, flashes the textarea border with `.flash` class for 600ms.
- Info-panel tray click → `toggleInfoPanel()` (same as header). Both `#btn-info` and `#btn-tray-info` toggle `.active` together.
- New full-settings section "tool tray" with three toggles (default `hideMastered: true, notePencil: true, infoPanel: false`) plus a "reset to defaults" link. State persists per profile under `hanzi-tray-visibility`.
- New CSS: `.controls-tray .btn[data-tray-hidden="true"] { display: none }`; `.fs-reset-link` styling.
- Undo button reworked to inline-flex with `width: 0 → auto` animation so it sits adjacent to whichever button is rightmost (3, 4, or 5 visible buttons all work). Keeps the centered group's behavior but no longer hardcodes button count.

**Search consolidation:**
- Removed from header: `header-search-wrap`, `search-pill`, `search-bar`, `btn-search`, `search-results` markup; CSS for the collapse animation; `toggleSearch()` and `closeSearch()` from `js/settings.js`; the global `window blur` handler that called `closeSearch()`.
- Deck-panel: new sticky `.search-pill.deck-search` at the top of `#sidebar` with `#deck-search-input`. Hierarchical results — decks (matching name), then cards (deck index + dictionary fallback) — render into a relative-positioned `#deck-search-results` dropdown.
- Card-list overlay: `renderListView()` now appends `#card-list-search-results` and a pinned `.search-pill.list-search` at the bottom. Results split into "in this deck" and "from other decks" groups; typing hides `.list-scroll`.
- `js/search.js` rewritten: `_searchCards()` and `_searchDictionary()` are reusable matchers; `runDeckPanelSearch()` and `runCardListSearch()` drive the two placements. `navigateToSearchResult()` retained for shared navigation logic.
- Keyboard shortcuts: `/` and `Cmd+K` (`Ctrl+K` on non-Mac) now open the sidebar and focus `#deck-search-input`. Per-input `Escape` clears value first, then defocuses. Removed the legacy header-search Escape branch.
- `applyLangUI()` updates placeholders on both new inputs.

### Files touched

- `index.html` — header search removed; deck-search added to sidebar; tray buttons added; tool-tray settings section added; empty-state replaced with welcome card
- `styles.css` — search-pill rewrite (inline base instead of header-collapse); deck-search and list-search placements; tray button visibility selector; fs-reset-link; welcome-card; pencil indicator reposition; .btn-undo inline-flex with width animation
- `js/state.js` — `welcomeGreeting` per language; `trayButtonVisibility` defaults
- `js/app.js` — `loadTrayVisibility()` call in `init()`
- `js/events.js` — `applyLangUI()` writes welcome greeting + ja-mode body class + new placeholders; `renderListView()` adds search input/results; keyboard shortcut repointed; legacy header-search Escape branch removed
- `js/search.js` — full rewrite; `_searchCards`/`_searchDictionary`/`runDeckPanelSearch`/`runCardListSearch`/`navigateToSearchResult`
- `js/settings.js` — removed `toggleSearch()`/`closeSearch()`; added tray-visibility loaders + `applyTrayVisibility()`; `syncSettingsUI()` now reflects tray toggles
- `js/info-panel.js` — `openNoteFromTray()`; `toggleInfoPanel()` also toggles `.active` on the tray info button
- `sw.js` — cache bump
- `docs/roadmap.md` — Phase 2 task list marked done
- `docs/feature-status.md` — search rows, tool-tray rows, welcome-card row, header row updated

### Verified

- Welcome card: 你好 in Chinese, こんにちは in Japanese; gradient text, dark and light backgrounds.
- Pencil overlap: confirmed via DOM inspection that pencil now sits at top-right (x=428) clear of test button (x=181-226) and to the left of counter (x=449); horizontal overlap = 0.
- Tray buttons: 5 button render (`shuffle`, `card-list`, `note`, `hide`, `info`) with infoPanel hidden by default. Toggling each persists to `hanzi-tray-visibility`.
- Pencil tray click: opens info panel; `#user-note` is rendered. Header info button shows `.active` orange tint when panel open; tray info button does the same when toggled visible.
- Settings section: "tool tray" header at 14px, three labeled toggles, defaults reflected on first open, "reset to defaults" link wired.
- Deck-panel search: typing "love" returns `爱 ài / to love / love` under a "cards" group; clicking navigates to the card.
- Card-list search: typing "love" with HSK 1 chunk 1 active shows `爱` under "in this deck"; typing "school" (not in current chunk) shows `学校` under "from other decks".
- `/` keypress: opens sidebar, focuses `#deck-search-input`.

### Pending verification (user-side)

- Visual smoke test in dark and light modes
- Welcome card on full empty state (no profile data + first launch)
- Card-list search dropdown layout when many results push past 60% viewport (scroll behavior)
- Mobile narrow widths — tray button overflow with all 5 visible

### Next

- Visual verification, then merge to main and start Phase 3 (`phase-3/tiling-cleanup`).

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
