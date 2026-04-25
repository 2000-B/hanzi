# Roadmap

> Status: active. Created 2026-04-24.
> Execution plan, phased. Each phase ships on its own feature branch and merges to main once done criteria are met.

## Phasing principle

Phases are ordered to minimize rework: foundation first (so we don't redesign as we go), low-risk polish next (to build momentum and clear visible bugs), then the algorithmic and UX shifts that depend on the foundation. Anything architecturally significant (Phase 8) gets its own spec-writing pass before any code lands.

Each phase has: goal, scope-in, scope-out, dependencies, done criteria, task checklist, branch name, and target cache version.

---

## Phase 0 — Foundation

**Branch:** `phase-0/foundation`
**Cache bump:** none (no shipped-asset changes)

**Goal:** Get documentation, status tracking, and test scaffolding in order before touching feature work. Triage the bad-merge regression list against current state.

**Scope (in):**
- CLAUDE.md rewritten as navigation map (done as part of this commit)
- `docs/feature-status.md` created (done as part of this commit)
- `docs/roadmap.md` created (this file)
- New specs landed: `progress-management-spec.md`, `tray-customization-spec.md`, `search-consolidation-spec.md`
- Shelved banner added to `workspace-reimplementation-plan.md`
- Bad-merge triage: walk through the 2026-04-02 PR-branch regression list in `work-ticket-log.md` with the user; mark each item kept / dropped-by-design / outstanding
- Test scaffolding: `tests/` directory, `node --test` runner, one sample test (probably a placeholder for FSRS to be filled in Phase 4)
- `package.json` minimal: name, version, `"test": "node --test tests/"` script (no dependencies)

**Scope (out):**
- Any code changes to the app itself
- Bumping cache version
- Implementing tests for existing features (only scaffold + placeholder)

**Dependencies:** none.

**Done criteria:**
- CLAUDE.md, feature-status.md, roadmap.md, three new specs all in place
- Workspace plan has shelved banner
- Bad-merge list annotated with current status per item
- `npm test` runs successfully against the placeholder test
- Phase 0 commit lands on main

**Tasks:**
- [x] Write `docs/CLAUDE.md` (this commit)
- [x] Write `docs/feature-status.md` (this commit)
- [x] Write `docs/roadmap.md` (this commit)
- [x] Write `docs/progress-management-spec.md` (this commit)
- [x] Write `docs/tray-customization-spec.md` (this commit)
- [x] Write `docs/search-consolidation-spec.md` (this commit)
- [x] Add shelved banner to `docs/workspace-reimplementation-plan.md` (this commit)
- [x] Bad-merge triage pass — see `docs/bad-merge-triage.md`
- [x] Triage dispositions resolved with user (2026-04-24)
- [x] Update feature-status.md with triage results
- [x] Create `tests/` directory and sample placeholder test
- [x] Add `package.json` with `node --test` script
- [x] Add work-ticket-log entry for Phase 0 completion

---

## Phase 1 — Quick wins

**Branch:** `phase-1/quick-wins`
**Cache bump:** required (shipped-asset changes)

**Goal:** Clear visible bugs and polish items in one batch.

**Scope (in):**
- Hide/show mastered button: relabel logic so the tooltip and aria-label correctly reflect current state (`hide mastered` ↔ `show mastered`)
- Tool tray: keep three main control buttons centered when the temporary `#btn-undo` button appears and disappears (reserved slot or animation that doesn't shift siblings)
- Backward card text orientation: test button (`#btn-test`) and card counter must remain readable when the card is flipped to the back face — switching sides is OK, mirrored text is not. Move them to a container outside the flipping `.card-face`, anchored to the card scene
- Voice availability detection: in `info-panel.js`, the audio button (`speakHanzi`) is shown unconditionally; hide it when `speechSynthesis.getVoices()` has no voice matching the current language's `ttsVoicePrefix`
- Settings section header sizing: section headers in the full settings modal currently render smaller than body text. Bump them to clearly larger than body, add vertical breathing room. Visual hierarchy fix only, not a content reorganization

**Absorbed from bad-merge triage:**
- List overlay clip-path so blur clips to card's rounded corners (1-line CSS: `clip-path: inset(0 round 16px)` on `.list-view`)
- Frosted-glass tooltip with accent tint (`backdrop-filter: blur(12px)`)
- Tooltip on header buttons positioned below, not above
- Info panel scrollbar work — investigate non-clipping, non-cluttered implementation. The current scrollbar clips past the panel's rounded corners (same reason the deck-panel scrollbar was removed entirely). If a clean implementation is found, restore the deck-panel scrollbar with the same approach. Likely solutions to evaluate: thin custom scrollbar with `scrollbar-gutter: stable` and matching `border-radius` containment, or hide-scrollbar + scroll-shadow indicators
- Info panel opacity fade transition on open/close

**Scope (out):**
- Settings content reorganization (only typography fix)
- Any tray changes other than the undo-centering polish (those land in Phase 2)
- Any audio sourcing or pronunciation feature work beyond hiding the unavailable button

**Dependencies:** Phase 0 done.

**Done criteria:**
- All five items implemented and visually verified
- Cache version bumped
- Work ticket entry added
- feature-status.md rows updated where relevant

**Tasks:**
- [x] Verify hide/show button current behavior; relabel as needed (tooltip simplified to "hide"/"show")
- [x] Tray-undo centering (undo absolutely positioned; main buttons stay centered)
- [x] Move `#btn-test` and card counter outside `.card-face` flip container
- [x] Implement voice-availability check in `info-panel.js` audio button render path
- [x] Bump settings section header font size and spacing in `styles.css`
- [x] Add `clip-path: inset(0 round 16px)` to `.list-view`
- [x] Frosted-glass tooltip styling (`backdrop-filter: blur(12px)` + accent tint)
- [x] Reposition header-button tooltips below the buttons
- [x] Investigate info panel scrollbar — `overflow: hidden` on `.info-panel` + thin custom scrollbar on `.info-panel-scroll`
- [x] Restore deck-panel scrollbar with same approach
- [x] Add opacity fade transition to info panel open/close (slideOutRight + `closing` class)
- [ ] Visual verification in dark and light modes (user-side)
- [x] Bump `CACHE_NAME` in `sw.js` (v6.52 → v6.53)
- [x] Add work ticket entry

---

## Phase 2 — Tool tray, search consolidation, welcome card

**Branch:** `phase-2/tray-search-welcome`
**Cache bump:** required

**Goal:** Restructure tool tray and search to match the "lists are searchable wherever they appear" design principle. Replace blank empty state with a basic welcome card. Specs cover the details: `tray-customization-spec.md`, `search-consolidation-spec.md`.

**Scope (in):**
- Add pencil/note button to tool tray; investigate whether the pencil-on-hover bug is a z-order issue with the test button overlay; remove or keep hover-pencil based on findings
- Add info panel button to tool tray (kept in header as well per user decision)
- Add tool tray section to full settings with per-button visibility toggles (see `tray-customization-spec.md`)
- Add search input to deck panel (top of panel, hierarchical search across decks/chunks/cards, navigate-on-tap)
- Add search input to card list overlay (bottom of card area, current-deck matches prioritized, cross-deck below, navigate-on-tap)
- Reuse existing `.search-pill` / `.search-input` styling for both new inputs (drop expand-from-icon transition since inputs are inline with lists)
- Remove header search button and pill markup
- Repoint `/` and `Cmd+K` shortcuts to open the deck panel and focus its search input
- Welcome card: empty state when no deck is selected. Renders a flashcard-shaped card with greeting in chosen language ("你好" / "こんにちは") and "Hello" underneath. Will be extended in Phase 5 to surface daily session info

**Scope (out):**
- Daily session integration with welcome card (deferred to Phase 5)
- Header redesign (deferred to Phase 5)
- Any settings reorganization beyond adding the tray section
- Removing export/import from settings (kept until Supabase phase)

**Dependencies:** Phase 0 done. Independent of Phase 1 (could parallelize on separate branch but recommend sequential).

**Done criteria:**
- Header search markup gone, both new searches functional with same styling
- Pencil and info-panel buttons in tray, controlled by settings toggles
- Settings has a working tool tray section with toggles for optional buttons
- `/` and `Cmd+K` open the deck panel with search focused
- Empty state shows the welcome card
- Cache bumped, work ticket added

**Tasks:**
- [x] Investigate pencil-on-hover bug — z-order overlap confirmed; pencil indicator moved to top-right (left of counter), z-index 2
- [x] Add pencil button to tool tray, wire to "open info panel + focus note field"
- [x] Add info panel button to tool tray
- [x] Implement tool tray settings section with per-button toggles
- [x] Build deck-panel search input + filter logic
- [x] Build card-list-overlay search input + filter logic
- [x] Remove header search markup, CSS, and `toggleSearch()` references
- [x] Repoint `/` and `Cmd+K` keyboard handlers
- [x] Implement welcome card empty state
- [x] Bump cache version
- [x] Add work ticket entry

---

## Phase 3 — Tiling cleanup

**Branch:** `phase-3/tiling-cleanup`
**Cache bump:** required

**Goal:** Lock workspace tiling to row-only layout, fix three known divider/edge bugs, verify swap-sides hygiene.

**Scope (in):**
- Reject top/bottom drop zones during long-press drag (visually suppress the drop indicators for top/bottom; only left/right are valid landing destinations)
- Lock `layoutDirection` to `row`; remove the `column` switch in the long-press drop handler at `js/workspace.js:365`
- Bug: dragging the info panel's outer (right) edge causes the panel to narrow from the opposite (left) edge. Investigate handler width-anchoring and fix
- Bug: after sliding the divider far enough left that the info panel reaches its minimum width, dragging the divider back right causes the panel's right edge to snap back without the right edge ever traversing the right side of the screen. Likely a state-tracking issue where a "panel pinned" flag isn't released
- Verify behavior when info and flashcard panels swap sides (long-press drag): edge resize handlers, divider behavior, fullscreen state — all should remain consistent
- Update `feature-status.md` to mark vertical layout as removed (drop zone removed, code path no longer reachable but kept as defensive default)

**Scope (out):**
- Re-introducing zoom (still shelved per `workspace-reimplementation-plan.md`)
- Any other workspace work; this phase is bug-fix and constraint enforcement only

**Dependencies:** Phase 0 done. Independent of Phases 1 and 2.

**Done criteria:**
- Top and bottom long-press drops are rejected (no layout change, no visible indicator)
- The three bugs above are reproducible-then-fixed: I'll write reproduction steps in the work ticket before fixing
- Swap-sides verified across resize, fullscreen, divider, and edge-drag
- Cache bumped, work ticket added

**Tasks:**
- [x] Reproduce each of the three bugs and document repro steps in work ticket
- [x] Modify drop-target detection to skip top/bottom in `js/workspace.js`
- [x] Suppress drop indicators for top/bottom hover
- [x] Fix opposite-edge narrowing — `getResizeEdge()` skips edges at workspace boundary
- [x] Fix sticky-pinned divider — clamp `delta` itself, not just the resulting widths
- [x] Verify swap-sides — code paths use `divLeftEl`/`divRightEl` references, agnostic to which panel is which
- [x] Update `feature-status.md`
- [x] Bump cache, add work ticket

---

## Phase 4 — FSRS migration

**Branch:** `phase-4/fsrs`
**Cache bump:** required

**Goal:** Replace SM-2 with FSRS. Slate-clean migration. Add a four-button rating UI. Introduce desired-retention setting with one-time onboarding.

**Scope (in):**
- Implement FSRS scheduler as a pure function in `js/fsrs.js` (separate file from `js/study.js`). Use the standard FSRS-4.5+ default weights — no personalized parameter training in this phase
- Unit tests in `tests/fsrs.test.js` exercising the algorithm against known inputs/outputs (use a published reference implementation's outputs as ground truth)
- Slate-clean migration: on first run after the upgrade, every card resets to unscheduled. Mastered flag is preserved. Existing `efactor` / `interval` / `due` / `lastRating` fields are dropped in favor of FSRS state (`difficulty`, `stability`, `lastReview`)
- Replace `applySM2()` call in `rateCard()` (`js/test.js`) with FSRS equivalent
- Four-button rating UI: Again / Hard / Good / Easy. Maps cleanly to FSRS rating scheme
- Desired retention: stored per-profile, default 90%. First-run onboarding shows it once with a brief explanation. Lives in full settings under a "review" section thereafter
- Update `getReviewCards()` (`js/study.js`) to use FSRS due dates
- Remove SM-2 code from `js/study.js` once FSRS is wired in

**Scope (out):**
- Personalized FSRS parameter training (deferred — set-and-forget for now)
- Daily new-card budget (Phase 5)
- Any UI changes to the review deck visualization beyond the new rating buttons

**Dependencies:** Phase 0 done (test scaffolding required for unit tests). Phases 1, 2, 3 can land in any order before this — none are hard blockers, but I'd recommend at least Phase 1 first to avoid mixing polish with algorithm work.

**Done criteria:**
- FSRS function passes its unit tests
- Existing user (you) can study, rate, and see review deck behavior driven by FSRS
- All SM-2 code removed
- Onboarding shows desired retention once, then it lives in settings
- Cache bumped, work ticket added, feature-status.md updated

**Tasks:**
- [ ] Implement FSRS in `js/fsrs.js`
- [ ] Write `tests/fsrs.test.js` with ground-truth cases
- [ ] Add migration logic: on init, if user has SM-2 fields, drop them and mark cards as unscheduled
- [ ] Add four-button rating UI to test mode
- [ ] Add desired-retention onboarding (first-run only)
- [ ] Add desired-retention setting to full settings modal
- [ ] Update `getReviewCards()` to use FSRS due dates
- [ ] Remove `applySM2()` and SM-2 references from `js/study.js`
- [ ] Bump cache, add work ticket, update feature-status

---

## Phase 5 — Progress management + header redesign

**Branch:** `phase-5/progress-management`
**Cache bump:** required

**Goal:** Add active focus, daily session, and mastery-gated promotion. Pair with header redesign to surface progress information. Welcome card extended to surface today's session. See `progress-management-spec.md` for the full design.

**Scope (in):** see `progress-management-spec.md`. Summary: active-focus chunk concept, daily session generation, new-cards-per-day setting, mastery threshold + promotion suggestion UI, welcome card extension, header redesign with progress indicators (today's session, due count, active focus name).

**Scope (out):**
- Cloud sync of progress data (Phase 8)
- Streak/gamification features (deferred unless explicitly added later)
- Classroom-style assignment system (deferred)

**Dependencies:** Phase 4 done. Daily session generation depends on FSRS due dates being authoritative.

**Done criteria:** see `progress-management-spec.md` acceptance criteria.

**Tasks:** see `progress-management-spec.md` checklist.

---

## Phase 6 — Tone visualization (mnemonic)

**Branch:** `phase-6/tone-viz`
**Cache bump:** required

**Goal:** Add a purely-mnemonic tone visualization for Mandarin syllables. Synthetic SVG glyphs derived from pinyin tone numbers. No audio, no pitch extraction.

**Scope (in):**
- SVG glyphs for tones 1, 2, 3, 4, and neutral. Each glyph is a small stylized contour shape (high-flat, rising, dip, sharp-fall, short-flat)
- Render glyphs in the info panel next to each pinyin syllable. Section is collapsible; collapse state persists across card navigation
- Optional card-face display: settings toggle to show glyphs alongside pinyin on the card face
- Glyphs scale with text size; readable in both dark and light modes

**Scope (out):**
- Real pitch data (deferred experiment)
- Japanese pitch accent visualization (separate design pass, deferred)
- Animated/interactive glyphs (static SVG only)

**Dependencies:** Phase 0 done. Independent of other feature phases.

**Done criteria:**
- Glyphs render correctly for all five tone categories
- Info panel section is collapsible with persistent state
- Card-face toggle works in both modes
- Cache bumped, work ticket added, feature-status updated

**Tasks:**
- [ ] Design five canonical glyph SVGs (sketches in spec, draft in code)
- [ ] Add render path in `info-panel.js` for tone glyphs
- [ ] Add card-face glyph display, gated by settings toggle
- [ ] Add tone visualization toggle to full settings
- [ ] Verify visual fidelity in light and dark modes
- [ ] Bump cache, add ticket, update status

---

## Phase 7 — Homophones / minimal pairs

**Branch:** `phase-7/homophones`
**Cache bump:** required

**Goal:** Surface minimal pairs (same syllable, different tones) in the info panel. Generated in-session from existing pinyin data — no external pipeline required.

**Scope (in):**
- Generate minimal-pair groupings as enrichment data: for each syllable in the dataset, list characters/words sharing that syllable across all four tones plus neutral. Output to `data/minimal-pairs.json` (or fold into existing enriched-data files — decide on inspection)
- Info panel section: shows the current word's tone shape as a line graph plus an expandable list of minimal pairs (one per row, with character + pinyin + tone glyph from Phase 6)
- Section is collapsible; collapse state persists across card navigation, consistent with tone visualization
- Tap a row in the expanded list to navigate to that card (consistent with search-result navigation)

**Scope (out):**
- Cross-syllable homophones (e.g. `shī` and `shí` are different syllable-tone combos but related — out of scope for this phase)
- Audio for minimal pair playback (deferred — depends on audio sourcing)
- Other word-association features beyond minimal pairs (deferred)

**Dependencies:** Phase 6 done (tone glyphs are reused in the minimal-pairs list).

**Done criteria:**
- Minimal-pair data generated and committed
- Info panel section renders correctly with current-word graph + expandable list
- Navigation from list rows works
- Cache bumped, work ticket added, feature-status updated

**Tasks:**
- [ ] Generate minimal-pair groupings from existing pinyin data (in-session)
- [ ] Write to `data/minimal-pairs.json` (or fold into enriched data — decide)
- [ ] Add render path in `info-panel.js` for minimal-pair section
- [ ] Wire up navigate-on-tap for list rows
- [ ] Verify collapse-state persistence across card nav
- [ ] Bump cache, add ticket, update status

---

## Phase 8 — Platform prep (architectural)

**Branch:** `phase-8/platform-prep` (multiple sub-branches likely)
**Cache bump:** required

**Goal:** Move from localStorage-only to a real backend. Supabase for auth + Postgres + sync. Cloudflare Pages for the static frontend. Design data model so classroom/teacher features can be layered later without migration.

**This phase requires its own spec-writing pass before any code is written.** The summary below is intent, not implementation plan.

**Intent:**
- Backend: Supabase (managed Postgres + auth + RLS). Auth supports email/password, magic link, and OAuth (Google + Apple at minimum)
- Frontend: stays static; deployed to Cloudflare Pages. Service worker behavior preserved
- Data model: every user-visible artifact (deck, card, progress entry, tutor log) has an owner field that can eventually be either a user or a class. Classroom-ready, classroom-not-yet-built
- Sync layer: thin module that syncs localStorage → Supabase tables. Local-only mode remains the default until the user signs in. Once signed in, local data migrates to their account on first sync
- Account UX: optional. Users can keep using local-only mode forever. Sign-in unlocks cross-device sync

**Scope (in):** to be defined in the platform spec.

**Scope (out):**
- Classroom features (deferred)
- Multi-tenancy / org structure (deferred)
- Anything beyond auth + per-user sync in this phase

**Dependencies:** all preceding phases done. Phase 5 (progress management) must be solid since its data structures will be the first to sync.

**Done criteria:** to be defined in the platform spec.

**Tasks:**
- [ ] Write `docs/platform-spec.md`
- [ ] Iterate with user, approve scope
- [ ] Then begin implementation in sub-branches

---

## Cross-phase notes

**Branching:** each phase is its own feature branch off main. Merge once done criteria are met. Don't accumulate multi-phase branches — they re-create the bad-merge risk.

**Cache bumping:** every phase that ships an asset bumps `CACHE_NAME` in `sw.js`. Naming convention: `hanzi-v6.YY` where YY increments per shipped change.

**Work ticket discipline:** every phase merge produces a work ticket entry. Ticket includes context, what changed, files touched, cache version. New entry at the top of `work-ticket-log.md`.

**Status updates:** every phase merge updates `feature-status.md` rows for any feature whose state changed.

**Spec updates:** if a phase implementation reveals the spec was wrong, the spec is updated as part of the phase. The roadmap is updated only if the phase scope itself changed.

**Stop conditions:** if a phase reveals work that should be its own phase, we pause, write the spec, and add it to the roadmap rather than expanding scope inside the current phase.
