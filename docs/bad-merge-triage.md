# Bad-Merge Triage

> Status: resolved. Created 2026-04-24. Dispositions accepted 2026-04-24.
> Resolves: roadmap Phase 0 task "Bad-merge triage session with user".
>
> Triage of the 2026-04-02 PR-branch regression list (in `work-ticket-log.md`) against current code state.

## Methodology

Each item from the original list was checked against the current codebase. Status assigned:

- **DONE** — change is present in current code with file/line evidence
- **MISSING** — change is not in code, no evidence of deliberate removal
- **AMBIGUOUS** — partially implemented, implemented differently, or unclear whether it counts
- **DROPPED** — missing AND we've decided (per scope narrowing or feature deletion) not to pursue
- **VERIFY** — needs user check; can't determine from code alone

Each item also has a *disposition* — what we decide to do about it: keep on roadmap, drop, or fold into an existing phase.

## Summary

| Status | Count | Disposition decisions needed |
|---|---|---|
| DONE | 24 | none |
| MISSING | 19 | yes |
| AMBIGUOUS | 8 | yes |
| **Total items** | **52** | |

## Bug fixes

| # | Item | Status | Evidence | Disposition |
|---|---|---|---|---|
| 1 | Search pill border-radius `8px → 999px` | DONE | styles.css:164 | — |
| 2 | List view crash on every click (stale mousedown listener) | AMBIGUOUS | List view present; no clear stale listener | **VERIFY in app** |
| 3 | List view as overlay, not layout sibling | DONE | index.html:289, styles.css:2688 | — |
| 4 | List overlay clips blur to card's rounded corners | MISSING | No `clip-path` on `.list-view` | **Proposed: fold into Phase 1 polish (1-line CSS)** |
| 5 | List dismissed on next/prev/spacebar | DONE | js/events.js:24-32, 113 | — |
| 6 | Inner scroll container; active row scrolls into view | DONE | js/events.js:84, styles.css:2690 | — |
| 7 | List rows 4-column grid; english truncates | DONE | styles.css:2691, 2695 | — |
| 8 | Card auto-shrinks font for long hanzi/english | MISSING | No font-scaling logic | **Proposed: defer — edge case, low value** |
| 9 | Nav arrow buttons white in dark mode | AMBIGUOUS | No visible arrow buttons on card UI | **VERIFY: were nav arrows removed by design?** |
| 10 | Card flip not broken by overflow | DONE | styles.css:1508-1516 | — |
| 11 | Review deck icon arrowhead shape wrong | AMBIGUOUS | Current: circular refresh; original target unknown | **VERIFY: does current icon look right?** |
| 12 | Search blocked in test mode | DONE | js/settings.js:4, js/events.js:107 | — |
| 13 | Search closed on window blur | DONE | js/settings.js:21 | — |
| 14 | resetAppearance clears accent-theme | DONE | js/settings.js:214 | — |
| 15 | Analytics open/close hijacks main content | DEPRECATED | Analytics panel killed in Phase 2 (work-ticket line 100) | **Proposed: drop — feature deleted** |
| 16 | Split-pane overflow scrollbar conflict | AMBIGUOUS | Currently `overflow:hidden`; documented conflict | **VERIFY: any actual scrollbar issue?** |

## Theme / Appearance

| # | Item | Status | Evidence | Disposition |
|---|---|---|---|---|
| 17 | CSS gradient variables `--grad-*` | DONE | styles.css:21-23 + 13 usages | — |
| 18 | applyAccentFromHue rewrites tokens | DONE | js/settings.js:221-231 | — |
| 19 | Smart image persistence | DONE | js/settings.js:175-184 | — |
| 20 | Context strip plain text in dark / gradient in light | AMBIGUOUS | Comment exists; CSS rules unclear | **VERIFY visually** |
| 21 | Collapsed deck names plain text in dark mode | MISSING | No theme-specific CSS | **Proposed: defer — minor cosmetic** |
| 22 | Context strip edge fades (mask-image) | DONE | styles.css:1661-1662 | — |
| 23 | Context strip center alignment + scrollIntoView | DONE | styles.css:1671, js/events.js:41 | — |
| 24 | Darker blob opacities in dark mode | MISSING | No dark-mode opacity adjustment | **Proposed: defer — recent UI work polished blobs already; verify visually** |
| 25 | Frosted-glass tooltip with accent tint | MISSING | Tooltips use generic styling | **Proposed: fold into Phase 1 polish** |
| 26 | Tooltip on header buttons positioned below | MISSING | No tooltip positioning logic | **Proposed: fold into Phase 1 polish** |
| 27 | backface-visibility on key elements | DONE | styles.css:84-85 | — |
| 28 | will-change + 0.45s flip duration | DONE | styles.css:1513, 1515 | — |

## Controls tray

| # | Item | Status | Evidence | Disposition |
|---|---|---|---|---|
| 29 | Tray fully transparent / floating | AMBIGUOUS | `background: transparent` set; positioning unclear | **VERIFY in app** |
| 30 | Chevron direction inverted (up=collapsed) | MISSING | Always points down | **VERIFY: do you still want this?** |
| 31 | Buttons styled as dark glass in dark mode | AMBIGUOUS | General glass styling, no dedicated variant | **VERIFY: noticeable difference desired?** |
| 32 | Stats bar collapse toggle (chevron + max-height) | DROPPED | No "stats bar" element exists | **Proposed: drop — concept abandoned** |
| 33 | Shuffle into stats toggle row | DROPPED | Same — no stats row | **Proposed: drop** |

## Info panel

| # | Item | Status | Evidence | Disposition |
|---|---|---|---|---|
| 34 | Expanded mode (more info / collapse) | DONE | js/info-panel.js:216 (details/summary) | — |
| 35 | Hidden + button removed in test mode | AMBIGUOUS | Panel hidden via js/study.js:237; button removal unclear | **VERIFY in app** |
| 36 | Tutor bar auto-hides without API key | DONE | js/info-panel.js:55 | — |
| 37 | Scrollbar only active when panel open | MISSING | No conditional scrollbar logic | **Folded into Phase 1 — bigger scope: scrollbar currently clips past rounded corners. User had deck-panel scrollbar removed entirely for the same reason. Phase 1 scope: find a non-clipping, non-cluttered implementation; if successful, restore deck-panel scrollbar with the same approach.** |
| 38 | Opacity fade on open/close | MISSING | classList toggle without transition | **Proposed: fold into Phase 1 polish** |

## Mode toggle

| # | Item | Status | Evidence | Disposition |
|---|---|---|---|---|
| 39 | Single test button (study pill removed) | DONE | index.html:280 | — |
| 40 | Inactive mode pill dimmed | AMBIGUOUS | No mode pill — single button only | **VERIFY: does the test button need dimming when inactive?** |

## Test mode

| # | Item | Status | Evidence | Disposition |
|---|---|---|---|---|
| 41 | Start screen with deck/count/format/begin | DONE | index.html:334-341, js/test.js:345 | — |
| 42 | "No deck" state | DONE | index.html:322-325 | — |
| 43 | Test mode auto-opens sidebar | DONE | js/study.js:291 | — |

## New features

| # | Item | Status | Evidence | Disposition |
|---|---|---|---|---|
| 44 | Favorites: star button per chunk | DONE | js/sidebar.js:7-37, 90-93 | — |
| 45 | Right-click context menus on decks/chunks | AMBIGUOUS | Handlers present; full menu UI unconfirmed | **VERIFY in app** |
| 46 | Context strip on/off toggle in settings | DONE | index.html:72-73 | — |

## Workspace / Tiling

| # | Item | Status | Evidence | Disposition |
|---|---|---|---|---|
| 47 | Workspace manager (resize, dividers, snap) | DROPPED | Snap-to-grid was intentionally removed; tiling + dividers remain | **Drop snap-to-grid; tiling continues in Phase 3** |
| 48 | Long-press drag to reorder | DONE | js/workspace.js:262-380 | — |
| 49 | Panel position memory | PARTIAL | Info panel width saved (Phase 3 work-ticket); other positions not | **Proposed: drop — info width is the only persistent panel position needed** |
| 50 | Zoom control 50-200% | DROPPED | Explicitly shelved | **Proposed: drop — already shelved** |
| 51 | Flashcard panel toggle in header | DROPPED | Removed from scope | **Proposed: drop** |
| 52 | Analytics as sidebar panel | DEPRECATED | Analytics killed | **Proposed: drop** |

## Items requiring user input

User indicated 2026-04-24: all items in this section either resolved by accepted defaults or require no action. Specifics:

- **#16 Split-pane overflow** — yes, scrollbar clipping is real on the info panel. Folded into Phase 1 with expanded scope (find non-clipping implementation, restore deck-panel scrollbar if successful)
- **#47 Snap-to-grid** — intentionally removed; dropped from list
- All other verification items: no action required

This section is preserved for historical reference. No outstanding decisions remain.

## Proposed roadmap deltas

If you accept the defaults above, here's what changes in the roadmap:

**Folded into Phase 1 (quick wins):**
- #4 List overlay clip-path (1-line CSS)
- #25 Frosted-glass tooltip
- #26 Tooltip positioning below header buttons
- #37 Info panel conditional scrollbar
- #38 Info panel opacity fade transition

**Dropped (no further action):**
- #8 Card font auto-shrink
- #15 Analytics hijack (analytics deleted)
- #21 Collapsed deck names theme variant
- #24 Dark mode blob opacities (presumed addressed by recent UI phases — verify visually)
- #32 Stats bar collapse (concept abandoned)
- #33 Shuffle into stats row (concept abandoned)
- #49 Panel position memory beyond info width
- #50 Zoom control (already shelved)
- #51 Flashcard panel toggle in header
- #52 Analytics as sidebar panel (analytics deleted)

## Status

Triage complete and accepted 2026-04-24. Phase 1 absorbs five fold-in items plus the expanded scrollbar work. All verification items resolved or non-actionable.
