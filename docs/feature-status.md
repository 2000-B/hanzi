# Feature Status

> Single source of truth for what features exist, in what state, and where their spec lives.
> Updated as roadmap phases complete or features change state. Last updated: 2026-04-24.

**States:** `done` · `in-progress` · `not-started` · `deferred` · `shelved`

## Core flashcard study

| Feature | State | Spec / Notes |
|---|---|---|
| Card rendering (front/back, flip) | done | `hanzi-app-spec-v5_3.md` |
| HSK 1–6 decks | done | `hanzi-app-spec-v5_3.md` |
| JLPT N5–N1 decks | done | `japanese-toggle-spec.md` |
| Custom decks (CSV import, AI generation) | done | `hanzi-app-spec-v5_3.md` |
| Chunk system (split decks into smaller groups) | done | `hanzi-app-spec-v5_3.md` |
| Search (header pill, global) | removed | replaced by deck-panel + card-list searches in Phase 2 |
| Card list overlay | done | gained inline search in Phase 2 (`search-consolidation-spec.md`) |
| Mastery toggle + undo | done | label fix in roadmap Phase 1 |
| Hide/show mastered toggle | done | relabel in roadmap Phase 1 |
| Welcome modal (first launch) | done | `hanzi-app-spec-v5_3.md` |

## Test mode

| Feature | State | Spec / Notes |
|---|---|---|
| Test mode flow (start screen, format picker, session stats) | done | `hanzi-app-spec-v5_3.md` |
| Multiple choice format | done | |
| Typing format | done | |
| Backward card text orientation | broken | fix in roadmap Phase 1 |

## Spaced repetition

| Feature | State | Spec / Notes |
|---|---|---|
| SM-2 algorithm | removed | replaced by FSRS in Phase 4 |
| FSRS-4.5 algorithm | done | `js/fsrs.js`, default weights, no parameter training (Phase 4) |
| Review deck | done | `hanzi-app-spec-v5_3.md` |
| Desired retention setting | done | per-profile, default 90%, settings slider + first-run onboarding (Phase 4) |
| Daily new-card budget | not-started | roadmap Phase 5 (`progress-management-spec.md`) |

## Progress management

| Feature | State | Spec / Notes |
|---|---|---|
| Active focus chunk | done | per-profile `activeFocusId`; sidebar emphasis + right-click set/clear; resets session on change (Phase 5) |
| Daily session abstraction | done | new + review IDs generated per-day, persists across reloads; `newCardsPerDay` setting (default 10) (Phase 5) |
| Mastery-gated promotion suggestions | done | non-blocking banner at default 80% threshold, accept/postpone/dismiss; auto-finds next HSK/JLPT chunk (Phase 5) |
| Welcome card (empty state) | done | flashcard-shaped greeting; surfaces today's session counts + start button when active focus set (Phase 5) |

## Info panel

| Feature | State | Spec / Notes |
|---|---|---|
| Etymology, components, examples display | done | `hanzi-app-spec-v5_3.md` |
| TTS audio button (Web Speech API) | done | hide-when-unavailable in Phase 1 |
| Pre-recorded HSK 1 audio | deferred | depends on audio sourcing decision |
| Tutor chat (AI-powered) | done | `hanzi-app-spec-v5_3.md` |
| User notes (per card) | done | tray pencil button shipped in Phase 2; on-card pencil indicator z-order fixed |
| Tone visualization (mnemonic) | not-started | roadmap Phase 6 |
| Homophone / minimal pair groupings | not-started | roadmap Phase 7 |
| Japanese pitch accent visualization | deferred | needs separate design pass |

## Workspace / tiling

| Feature | State | Spec / Notes |
|---|---|---|
| Two-panel workspace (flashcard + info) | done | `js/workspace.js` |
| Divider drag-to-resize | done | edge bugs in Phase 3 |
| Long-press drag-to-reorder | done | row-only in Phase 3 |
| Vertical (column) layout | removed | Phase 3 — top/bottom drop zones rejected, column switch in onDragEnd removed; layoutDirection locked to row |
| Per-panel fullscreen | done | |
| Snap-to-grid during resize | removed | intentionally removed — confirmed in 2026-04-24 triage |
| Earlier tiling system (zoom, floating panels) | shelved | `workspace-reimplementation-plan.md` |

## Tool tray

| Feature | State | Spec / Notes |
|---|---|---|
| Shuffle button | done | |
| Card list button | done | |
| Hide/show mastered button | done | relabel in Phase 1 |
| Pencil/note button | done | Phase 2 — opens info panel and focuses note field |
| Info panel button | done | Phase 2 — toggles panel; default off in tray, also lives in header |
| Per-button visibility toggles in settings | done | Phase 2 — `trayButtonVisibility` profile data, reset link |
| Centered layout when undo button appears | done | Phase 1 — undo is inline-flex with width animation, sits adjacent to rightmost button |

## Search

| Feature | State | Spec / Notes |
|---|---|---|
| Header search pill | removed | Phase 2 — replaced by per-list searches |
| Deck-panel search (hierarchical) | done | Phase 2 — decks + chunks + cards |
| Card list overlay search (deck-scoped + cross-deck) | done | Phase 2 — current-deck above divider, other decks below |
| Keyboard shortcut (`/`, `Cmd+K`) | done | Phase 2 — opens deck panel and focuses its search input |

## Settings

| Feature | State | Spec / Notes |
|---|---|---|
| Quick settings (gear popover) | done | |
| Full settings modal | done | section-header sizing fix in Phase 1 |
| Theme (dark/light) | done | |
| Curated swatch palette | done | |
| Tint UI to accent toggle | done | |
| Profile picker | done | `user-profiles-spec.md` |
| Tool tray button toggles | done | Phase 2 — section in full settings, three toggles + reset link |
| Desired retention setting | not-started | Phase 4 |
| Daily new-card budget setting | not-started | Phase 5 |
| Export / import data | done | reassess after Supabase ships |

## Header

| Feature | State | Spec / Notes |
|---|---|---|
| Title + deck/info/settings buttons | done | Phase 2 — search button removed; redesign with progress indicators in Phase 5 |
| Header redesign with progress indicators | done | active-focus chip (center) shows focus name + session progress (X/N); click to start/continue session (Phase 5) |

## Pronunciation / audio

| Feature | State | Spec / Notes |
|---|---|---|
| Web Speech API TTS | done | |
| Voice availability detection (hide button when no voice) | not-started | roadmap Phase 1 |
| Per-card pre-recorded audio | deferred | open audio-sourcing question |
| User pronunciation recording + scoring | deferred | not on near-term roadmap |
| Pitch extraction experiment (vs mnemonic visualization) | deferred | revisit if mnemonic feels insufficient |

## Multi-user / accounts / sync

| Feature | State | Spec / Notes |
|---|---|---|
| Local profiles (localStorage partitioning) | done | `user-profiles-spec.md` |
| Supabase auth (email + magic link + OAuth) | not-started | roadmap Phase 8 |
| Cloud sync of progress/decks | not-started | roadmap Phase 8 |
| Classroom/teacher features | deferred | architect data model to allow, don't build until demand |

## Data pipeline

| Feature | State | Spec / Notes |
|---|---|---|
| HSK enrichment via Anthropic API | done | `scripts/build-data.js` |
| JLPT enrichment via Anthropic API | done | `scripts/build-data-jp.js` |
| In-session enrichment (no external API) | done | new capability, used for homophones in Phase 7 |

## Known regressions / outstanding from bad merge

Triage complete (2026-04-24, see `docs/bad-merge-triage.md`). Of 52 items: 24 were already done, 19 missing, 8 ambiguous. Resolution:

- Five missing items folded into Phase 1: list overlay clip-path, frosted-glass tooltip, tooltip-below positioning, info-panel conditional scrollbar (expanded scope: clipping bug + possible deck-panel restoration), info-panel opacity fade
- Ten items dropped (analytics-related, zoom, stats-bar concept, panel position memory beyond info width, font auto-shrink, deck name dark-mode variant, dark-mode blob opacity tweak)
- Snap-to-grid intentionally removed (confirmed)
- Verification items resolved or non-actionable

No further outstanding items from the bad merge.

## Deferred (acknowledged, not on roadmap)

| Feature | Reason |
|---|---|
| User pronunciation recording + scoring | Expensive; pedagogical fit with flashcard format unclear |
| Pre-recorded native-speaker audio | Audio sourcing unresolved |
| Japanese pitch accent visualization | Needs separate design pass — different visual grammar than Mandarin tones |
| Word-association research beyond minimal pairs | Held until pedagogical evidence justifies adding more |
| Session history list redesign | Truncation flagged; deserves its own conversation/spec |
| Architecture Decision Records (ADRs) | Skipped — spec docs cover the same ground at finer granularity |
