# 汉字学习 — Work Ticket Log

> Running log of requested changes, decisions, and implementation status. Newest entries at top.

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

## 2026-04-02 — Modularization

**Status:** Spec complete (`modularization-spec.md`), not yet implemented

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
