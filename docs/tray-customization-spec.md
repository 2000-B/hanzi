# Tool Tray Customization Spec

> Status: active. Created 2026-04-24.
> Roadmap phase: 2.
> Supersedes: nothing — this is the first treatment of tray customization beyond the static implementation in `js/study.js` / `js/deck.js`.

## 1. Goal

Add user-controllable visibility for individual tool tray buttons, surfaced in the full settings modal. Add two new tray buttons (pencil/note, info panel toggle) and make most of them optional.

## 2. Buttons in the tray after this phase

| Button | Default visible | Customizable | Notes |
|---|---|---|---|
| Shuffle | yes | no | Core action, always shown |
| Card list | yes | no | Core action, always shown |
| Hide/show mastered | yes | yes | Currently always-on; becomes optional |
| Pencil/note | yes | yes | New in this phase |
| Info panel | no | yes | New in this phase, also kept in header |

The two always-visible buttons (shuffle, card list) are core actions; making them hideable adds settings noise without real benefit. The other three are personal preference.

## 3. Pencil/note button

**Behavior:**
- Tap: opens the info panel and scrolls to / focuses the user note field
- If the info panel is already open and the note field is visible, briefly highlight the note field (subtle accent flash, ~600ms) instead of scrolling
- If the info panel is already open but the note field is scrolled out of view, scroll to it

**Replaces:** the current pencil-on-hover affordance, which the user reports may not be working (likely a z-order issue with `#btn-test`). Investigation is part of this phase: if the hover-pencil bug is real, fix or remove it; the tray button is the durable affordance regardless.

**Icon:** small pencil SVG, consistent with existing tray icon weights (1.3 stroke, 13–14px).

## 4. Info panel button (in tray)

**Behavior:**
- Tap: toggles the info panel open/closed (same behavior as the existing `#btn-info` in the header)
- The header button remains. Both surfaces work identically; the tray button is added for users who prefer their controls near the card

**Icon:** identical to the existing header info button (i-in-circle SVG).

**Why both:** the user explicitly wants both locations. Header provides global access; tray provides card-contextual access. We accept the small redundancy.

## 5. Settings section: "Tool Tray"

**Location:** full settings modal, after the existing study/test preferences section, before API key and data sections.

**Content:** simple toggle list:
- "Hide/show mastered button" — toggle, default ON
- "Note pencil button" — toggle, default ON
- "Info panel button (in tray)" — toggle, default OFF

Each toggle stores its state in profile data under a key like `trayButtonVisibility` (single object: `{ hideMastered: bool, notePencil: bool, infoPanel: bool }`). The render path in the tray reads this object and applies a `data-tray-hidden="true"` attribute to hidden buttons; CSS hides them via `[data-tray-hidden]`.

**Reset:** a small "reset to defaults" link at the bottom of the section.

**Header style:** consistent with the broader settings typography fix in Phase 1 (section headers clearly larger than body text).

## 6. Centered layout when undo button appears

The temporary `#btn-undo` button currently appears between the main tray buttons after the user marks a card as mastered. Today, its appearance shifts the other buttons. The fix: reserve a slot for undo or animate it in without displacing siblings.

**Approach:** `display: flex` on the tray with `justify-content: center` and `gap` between buttons. Undo lives in a slot that is `width: 0; opacity: 0; pointer-events: none` when inactive and animates to its natural width when shown. Total tray width changes, but the active buttons stay centered as a group within the tray's outer container.

This is part of Phase 1 (quick wins) but documented here because it intersects with tray composition.

## 7. Acceptance criteria

- Two new tray buttons (pencil/note, info panel) render correctly when enabled
- Settings section "Tool Tray" with three toggles works; each toggle's state persists per profile
- Default state matches the table above
- Pencil button opens info panel and focuses note field; if open and visible, highlights instead
- Info panel button toggles the panel identically to the header button
- Tray remains centered when undo appears/disappears
- Reset link returns toggles to defaults
- Cache bumped, ticket added, feature-status.md updated

## 8. Out of scope

- Custom button ordering (drag to reorder) — settings noise vs benefit doesn't justify
- Adding tray buttons for actions that don't already exist elsewhere (e.g., an audio button in the tray)
- Removing the always-visible buttons from the tray
- Settings-level reorganization beyond adding the new section

## 9. Risks

- Risk: too many toggles makes settings feel cluttered. Mitigation: only three toggles in this section, all clearly labeled; broader settings hygiene fix in Phase 1
- Risk: the pencil-on-hover bug investigation reveals something deeper than z-order. Mitigation: if so, time-box investigation and either fix root-cause or remove the hover affordance entirely (the tray button covers the use case either way)

## 10. Open questions

1. Should the pencil button's "highlight note field when info panel is open" behavior also briefly scroll the panel to put the note field in the optimal viewport position, even if it's currently visible? Lean: no, scrolling when not strictly necessary is jarring.
2. If the user has the info panel button enabled in the tray and clicks the header info button, no behavioral conflict — both open/close the same panel. But if we're doubled up, do we want both buttons to update visual state (e.g., active highlight) when the panel is open? Lean: yes, both should reflect state.
