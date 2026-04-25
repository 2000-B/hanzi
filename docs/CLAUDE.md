# 汉字学习 — Project Instructions

## Navigation

This file is the index. For what's currently being executed, see `docs/roadmap.md`. For what features exist in what state, see `docs/feature-status.md`. For the running history of changes, see `docs/work-ticket-log.md`.

## Document index

| Document | Status | Covers |
|---|---|---|
| `docs/roadmap.md` | active | Current execution plan, phased |
| `docs/feature-status.md` | active | Feature-by-feature status table — single source of truth for what exists |
| `docs/work-ticket-log.md` | active | Append-only log of changes, decisions, version bumps |
| `docs/hanzi-app-spec-v5_3.md` | active | Full feature spec — features, layout, persistence, edge cases |
| `DESIGN.md` | active | Visual design direction (light mode primary, frosted glass) |
| `docs/progress-management-spec.md` | active | Active focus + daily session + mastery-gated promotion |
| `docs/tray-customization-spec.md` | active | Tool tray customization in settings, tray button additions |
| `docs/search-consolidation-spec.md` | active | Header search → deck-panel + card-list searches |
| `docs/bad-merge-triage.md` | resolved | Triage of the 2026-04-02 PR-branch regression list against current code (complete) |
| `docs/modularization-spec.md` | superseded (complete) | Original plan for monolith split — kept for historical reference |
| `docs/user-profiles-spec.md` | active | Multi-user localStorage partitioning |
| `docs/japanese-toggle-spec.md` | active | Japanese language support, JLPT decks, kanji readings |
| `docs/workspace-reimplementation-plan.md` | shelved | Earlier tiling system plan — see banner in file |
| `project-workflow-blueprint.md` (root) | active | Reusable doc/workflow conventions for future projects |

When a new spec lands, add a row here. When status changes, update the row.

## Workflow conventions

- **Conflict resolution:** newer doc wins unless newer doc explicitly defers to older. New specs include a `supersedes:` line listing what they replace.
- **Shelved specs** get a banner at the top of the file. Don't delete; preserve as historical record.
- **Single source of truth for feature state** is `docs/feature-status.md`. Before assuming a feature exists, check the table.
- **Pre-merge checklist:** specs updated, feature-status row updated, work-ticket-log entry added, cache bumped if shipped assets changed, this index updated if a new doc was created.
- **Dates:** every doc, ticket, and roadmap phase has an absolute date. Avoid relative dates ("last week," "soon").

## Current architecture

- **Modularized static PWA.** `index.html` (~25 KB shell) loads `styles.css` and 14 `js/*.js` files via plain `<script>` tags. No bundler, no ES modules. See `docs/modularization-spec.md` for the original split plan.
- **Service worker:** Cache version bumped per shipped change. Network-first for navigation, cache-first for assets.
- **Data:** HSK 1–6 + JLPT N5–N1 as JSON files in `/data/`. Enriched data (etymology, components, examples) as separate large JSON files. CEDICT for Chinese, custom dict for Japanese.
- **Persistence:** localStorage, partitioned per profile via `hanzi-u:<profileId>:<key>` prefix. Migrating to a real backend (Supabase) is on the roadmap.
- **AI integration:** Multi-provider (Anthropic, OpenAI, Google) via `callAI()` in `persistence.js`. User-supplied API keys.

## Key constraints

- **No build step.** Plain `<script>` tags. New code follows the same pattern.
- **Offline-first.** Anything that requires network must degrade gracefully or be explicitly online-only.
- **`file://` won't work.** Browsers block `fetch()` on `file://` URLs. Test via local server or deployed URL.
- **Cache busting.** Bump `CACHE_NAME` in `sw.js` whenever a shipped asset changes (HTML, CSS, JS, JSON in `/data/`, or `sw.js` itself).
- **Generation-time vs. runtime AI.** Pre-generated content (homophones, tone glyphs, future audio) lives in `/data/`. Runtime calls (tutor chat, deep-dive) use the user's API key. Design new features to fall cleanly into one bucket.

## Data pipeline

- `scripts/build-data.js` — Anthropic API enrichment, incremental writes, crash-safe.
- `scripts/build-data-jp.js` — Japanese equivalent.
- `scripts/generate-hsk-vocab.js`, `scripts/generate-jlpt-vocab.js` — vocabulary list generation.
- `review.html` — generated review page for QA on enriched data.
- **In-session generation alternative:** small enrichment batches (homophone groupings, tone-shape data, etc.) can be generated directly inside a Cowork/Claude session without external API calls. Output goes to `/data/`, gets committed normally.

## Testing

- Pure-function tests live in `tests/` and run via `node --test tests/`.
- DOM/integration tests are not yet set up; will be added (Playwright likely) when the test surface justifies them.
- The FSRS migration in Phase 4 is the first major target for unit tests.
