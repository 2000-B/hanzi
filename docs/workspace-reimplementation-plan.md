# Workspace Tiling Re-implementation Plan

> **STATUS: SHELVED as of 2026-04-02.**
> Reason: deprioritized in favor of multi-user profile support and (now) the broader roadmap. Plan preserved for future reference. Do not implement unless explicitly requested.
>
> Some of the simpler primitives from this plan (basic tiling, divider, fullscreen) were re-built independently and now live in `js/workspace.js`. The phases below — particularly the zoom controls, floating panels, and workspace-as-its-own-mode — have not been implemented and are not currently planned. See `docs/roadmap.md` Phase 3 for the current scope of tiling work (lock to row layout, fix divider/edge bugs).
>
> ---

> **Original context:** A previous Claude Code session implemented workspace tiling changes across ~760 lines of new CSS + JS, but the session expired before the changes were pushed. The current `index.html` (4,580 lines) has **none** of this work — it's the baseline with a simple flex `split-pane` layout (sidebar + main-content + info-panel). This plan breaks the lost work into sequential, testable phases that Claude Code can implement one at a time.

> **Current layout:** `.app-body` → `.sidebar` + `.split-pane` → `.main-content` + `.info-panel`. The info panel toggles via `toggleInfoPanel()`, sidebar via `toggleSidebar()`. Analytics is a view swap inside `.main-content`. No workspace manager, no panel drag/drop, no floating mode, no zoom, no fullscreen.

---

## What to implement NOW (Phases 1–4)

These are the stable, well-scoped features from the original session.

---

### Phase 1: Foundation — Panel toggle infrastructure
**Scope:** Make all panels (flashcard, info, analytics, deck) togglable via header buttons with `.open` class, and make closing a panel cause adjacent panels to expand via flex.

**Changes:**

1. **CSS:** Add `.ws-panel` class to all panels in `.split-pane`. Each `.ws-panel` gets:
   - `flex: 1; min-width: 200px; position: relative; border: 1px solid var(--border); border-radius: var(--radius-md); margin: 3px;`
   - `.ws-panel:not(.open)` collapses: `width: 0 !important; min-width: 0 !important; max-width: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; overflow: hidden; flex: none !important; pointer-events: none; opacity: 0;`

2. **HTML:** Add `ws-panel open` class and `data-panel-id` attribute to:
   - `.main-content` → `data-panel-id="flashcard"`
   - `.info-panel` → `data-panel-id="info"` (keep existing `.open` logic, just also add `ws-panel`)
   - `.analytics-view` → `data-panel-id="analytics"`

3. **JS — `toggleFlashcardPanel()`:** New function that toggles `.open` on `#main-content`. Update `btn-study` in header from `onclick="setMode('study')"` to `onclick="toggleFlashcardPanel()"`.

4. **JS — `toggleDeckPanel()`:** New function (or modify existing) that calls `toggleSidebar()` and syncs `btn-deck` active state. The deck button should toggle the **entire** deck panel (including collapsed strip), not just expand/collapse.

5. **CSS for info panel:** Reduce `min-width` from 280px to 200px. Add `flex-shrink: 1`. Same for analytics if it has a min-width.

6. **Dark mode borders:** Bump `--border` from `0.10` to `0.14` and `--border2` from `0.17` to `0.25` for visibility.

**Test:** Toggle each panel off via header. Remaining panels should expand to fill the gap. Toggle back on — panel reappears. No shifting/jumping.

---

### Phase 2: Per-panel fullscreen
**Scope:** Each panel gets a fullscreen button (bottom-right, visible on hover) that expands it to fill the workspace area.

**Changes:**

1. **CSS:**
```css
.ws-fullscreen-btn {
  position: absolute; bottom: 6px; right: 6px; z-index: 10;
  opacity: 0; transition: opacity .2s;
  /* standard icon-btn styling */
}
.ws-panel:hover .ws-fullscreen-btn { opacity: 1; }
.ws-panel.ws-fullscreen {
  position: absolute !important; top: 0 !important; left: 0 !important;
  right: 0 !important; bottom: 0 !important;
  width: auto !important; height: auto !important; max-width: none !important;
  z-index: 30; opacity: 1 !important; pointer-events: auto !important;
  overflow: auto !important;
}
```

2. **JS — `ensureFullscreenBtns()`:** Dynamically inject a fullscreen button into each `.ws-panel` if not already present. Wire to `wsToggleFullscreen(panelId)`.

3. **JS — `wsToggleFullscreen(panelId)`:** Toggle `.ws-fullscreen` class on target panel. Only one panel fullscreen at a time (remove from others). Fullscreen panel should obscure panels underneath until dismissed.

4. **Important edge case:** The info panel has `opacity: 0` in its closed state. The `.ws-fullscreen` rule needs `opacity: 1 !important` to override this.

**Test:** Hover each panel — fullscreen button appears bottom-right. Click it — panel fills workspace. Click again — returns to normal size. Other panels are hidden while one is fullscreen.

---

### Phase 3: Remove "more info" button + controls tray redesign
**Scope:** Remove the "more info" button from the info panel. Redesign the controls tray to drop down from below the flashcard.

**Changes:**

1. **Info panel:** In `renderInfoPanel()` (JS), remove the "more info" / `toggleInfoExpanded()` button HTML generation.

2. **Controls tray position:** Currently the `.card-controls` sits below the study area. Restructure so it drops down from under the flashcard rather than rising up from the bottom:
   - Move `.card-controls` HTML to immediately after the `.card-scene` div (inside study-view, right below the flashcard)
   - CSS: Make it a collapsible dropdown. Default: collapsed (height 0, overflow hidden). Toggled open by a small chevron button attached to the bottom edge of the flashcard.
   - Swap chevrons: ▼ when collapsed (meaning "tap to open downward"), ▲ when expanded (meaning "tap to close upward")

3. **Button labels:** Change "easy ✓" (`#btn-mastered`) to say "hide card" / "show card" contextually based on mastered state.

**Test:** Controls tray drops down from under the card. Chevrons reflect direction. "Hide card" / "show card" label updates correctly.

---

### Phase 4: Workspace settings + zoom controls
**Scope:** Add workspace settings (snap-to-grid toggle, floating panels toggle stub) and zoom controls.

**Changes:**

1. **Settings HTML:** Add a "workspace" group to both the quick settings popover and full settings modal:
```html
<div class="settings-group">
  <div class="settings-label">workspace</div>
  <div class="settings-toggle-row">
    <span class="settings-toggle-label">snap to grid</span>
    <button class="toggle-switch on" id="snap-grid-toggle" onclick="toggleSnapGrid()"></button>
  </div>
  <div class="settings-toggle-row">
    <span class="settings-toggle-label">floating panels</span>
    <button class="toggle-switch" id="float-toggle" onclick="toggleFloatingMode()"></button>
  </div>
</div>
```

2. **Zoom tray HTML** (fixed bottom-right):
```html
<div class="ws-zoom-tray" id="ws-zoom-tray">
  <button onclick="workspaceZoomReset()" data-tip="reset zoom">⌂</button>
  <input type="range" min="50" max="200" value="100" step="5"
         id="ws-zoom-slider" oninput="workspaceZoom(this.value)">
  <span class="ws-zoom-label" id="ws-zoom-label">100%</span>
</div>
```

3. **CSS for zoom tray:**
```css
.ws-zoom-tray {
  position: fixed; bottom: 16px; right: 16px; z-index: 40;
  display: flex; align-items: center; gap: 8px;
  background: var(--bg3); border: 1px solid var(--border2);
  border-radius: var(--radius); padding: 6px 12px;
}
```

4. **JS:**
   - `workspaceZoom(val)`: Apply `transform: scale(val/100)` + `transform-origin: top left` to `.split-pane`. Persist to `localStorage('ws-zoom')`.
   - `workspaceZoomReset()`: Call `workspaceZoom(100)`.
   - Ctrl+scroll and Ctrl+arrow keyboard bindings.
   - `toggleSnapGrid()`: Toggle `wsSnapEnabled` bool + persist + update toggle UI.
   - `toggleFloatingMode()`: **Stub only for now** — toggle `wsFloating` bool + persist + update UI. Actual floating behavior is Phase 6.

5. **split-pane overflow:** Change from `overflow: hidden` to carefully managed overflow so zoomed-out content doesn't get clipped. When zoom < 100%, the split-pane may need `overflow: visible` on its parent, but **do not** break panel scrolling.

**Test:** Zoom slider works. Ctrl+scroll works. Reset button returns to 100%. Snap toggle persists across reload. Floating toggle appears but doesn't change layout yet.

---

## What to SHELVE for later (Phases 5–8)

These are more complex features that need the foundation from Phases 1–4. Do not implement until Phases 1–4 are tested and stable.

---

### Phase 5: Panel drag-and-drop reorder (tiled mode)
- Click-drag on empty space within a panel to start dragging (NOT long-press)
- Drag feedback: other panels zoom out slightly (`scale(0.97)`) and show highlighted borders — **no blur** (blur was explicitly scrapped)
- Drag source gets elevated shadow + grabbing cursor
- Two drop modes:
  - **Insert:** Solid accent line appears between two panels when hovering the gap
  - **Swap:** Solid outline on the target panel when hovering over it
- Panel moves at 1:1 with mouse (previous implementation was 0.5x — must fix)
- Maintain `panelOrder` array and `rebuildLayout()` to reorder DOM after drop

### Phase 6: Floating panels mode
- When toggled on, panels switch to `position: absolute` — **but should not move from their current positions** (calculate current rect and apply as top/left/width/height)
- Panels overlap like desktop windows, with z-index stacking on click
- Disable snap-to-grid in floating mode EXCEPT edge-to-edge snapping (panel edge snaps to nearby panel edge)
- Panel drops exactly where user puts it unless hovering near another panel's edge
- Zoom should not scale elements inside panels when switching to floating (apply zoom to container, not individual panels)
- The invisible clipping block on the right when zoomed out must be fixed — entire workspace available at all times

### Phase 7: Left-edge resize fix + divider improvements
- Currently dragging the left edge of the flashcard moves the right edge instead — need to adjust the neighbor panel in the flex layout
- Flex dividers between panels with proper drag handling
- Snap-to-grid support for divider positions

### Phase 8: Workspace as its own mode
- Add "Workspace" alongside Study/Test in the mode pill
- Study mode = just the flashcard experience
- Workspace mode = the full tiling layout with all panels
- **Future note:** Expand test mode to cover info panel content (etymology, components, etc.) for advanced vocabulary testing

---

## Key lessons from the previous (lost) implementation

These are bugs and fixes discovered during the original session. Keep them in mind:

1. **Info panel `min-width` conflict:** With 3 panels open, if info has `min-width: 280px` and analytics `260px`, the flashcard gets crushed. Use `200px` for all and add `flex-shrink: 1`.

2. **`.ws-panel` min-width cascade:** If `.ws-panel` has `min-width: 0` and appears after `.main-content` in CSS, it overrides the intended min-width. Don't put `min-width: 0` on `.ws-panel`.

3. **Info panel fullscreen invisible:** `.info-panel` base CSS has `opacity: 0`. Fullscreen absolutely must have `opacity: 1 !important`, `pointer-events: auto !important`, `overflow: auto !important`.

4. **Panel position after toggle:** When a panel is toggled off then back on, a MutationObserver can append it at the end. Use a `savedPositions` map to track panel index before removal and restore on re-open.

5. **Overflow clipping at zoom:** `.split-pane` with `overflow: hidden` causes panels to disappear behind an invisible right edge when zoomed out or dragged right. Need `overflow: hidden` on `.split-pane` but `overflow: visible` on the zoom-transformed wrapper.

6. **Drag source getting blurred:** Need `!important` on drag source styles and `filter: none !important` to keep it sharp while other panels get the visual feedback.

7. **Panel drag speed:** The previous implementation had panels moving at ~0.5x mouse speed. The delta calculation must match 1:1 with mouse movement.

---

## Recommended approach for Claude Code

Give Claude Code **one phase at a time**. For each phase:

1. Share this plan document
2. Say: "Implement Phase N of the workspace plan. Read the plan file first."
3. After implementation, test thoroughly before moving to the next phase
4. Commit after each phase

The phases are ordered so each one is independently testable and doesn't break anything if you stop after it.
