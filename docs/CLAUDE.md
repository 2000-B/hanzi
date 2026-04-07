# 汉字学习 — Project Instructions

## Spec Documents

- **`docs/hanzi-app-spec-v5_3.md`** — Full project spec. The source of truth for all features, layout, persistence, edge cases, and implementation order.
- **`DESIGN.md`** — Visual design direction. Light mode is the primary design target.
- **`docs/modularization-spec.md`** — Plan to split `index.html` (~4,580 lines) into separate CSS + JS files. Pure extraction, no logic changes. **Do this before adding new features.**
- **`docs/user-profiles-spec.md`** — Multi-user profile system. localStorage partitioning via prefixed keys, auto-migration, profile picker UI. **Do this after modularization.**
- **`docs/workspace-reimplementation-plan.md`** — Workspace tiling system (shelved). Preserved for future reference. Do not implement unless explicitly requested.

## Work Tracking

- **`docs/work-ticket-log.md`** — Running log of requested changes, decisions, and status. Add a dated entry for any significant change request or implementation.

## Current Architecture

- **Single-file app:** Everything is in `index.html` (~4,580 lines of HTML + CSS + JS). This is the pre-modularization state.
- **Static PWA:** `index.html` + `sw.js` + `manifest.json`, hosted on GitHub Pages.
- **Service worker:** Cache version `hanzi-v5.14`. Network-first for navigation, cache-first for static assets.
- **Data:** HSK 1–2 loaded on init (JSON files), HSK 3–6 loaded in background. Enriched data and CEDICT as separate JSON files in `data/`.
- **Persistence:** All state in localStorage under `hanzi-*` keys. No backend.

## Implementation Sequence

1. **Modularization** — Split the monolith per `modularization-spec.md`
2. **User Profiles** — Implement per `user-profiles-spec.md` (add `js/profiles.js` to the modular structure)
3. **v5.3 features** — Background system, settings restructure, controls tray, deck panel interaction, etc. (per spec Appendix A)

## Key Constraints

- **No build step.** Plain `<script>` tags, no bundler, no ES modules (yet).
- **Offline-first.** Everything must work without internet after first load. Service worker caches all assets.
- **file:// won't work.** Browsers block `fetch()` on `file://` URLs. Always test via a local server or the deployed GitHub Pages URL.
- **Cache busting.** After any deployment, bump the cache version in `sw.js` to force existing visitors to pick up changes.
- **Single-file editing.** Until modularization is done, all changes go into `index.html`. Use `str_replace` for targeted edits. Use `sed -n '[start],[end]p'` to inspect specific line ranges when the file is too large for full-view.

## Data Pipeline

- **`build-data.js`** — Node.js enrichment pipeline using Anthropic API (`claude-sonnet-4-20250514`). Writes incrementally so reruns skip completed entries.
- **`generate-hsk-vocab.js`** — Generates HSK vocabulary JSON from raw data.
- **`review.html`** — Generated review page with filter buttons for checking enriched data quality.
- **Crash safety:** Never use shell `>` redirection on the output file — it corrupts silently. The pipeline handles file writing internally.
