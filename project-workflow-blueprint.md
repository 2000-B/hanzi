# Project Documentation & Workflow Blueprint

A reusable convention for managing specs, design docs, and feature status in long-running projects — especially solo or small-team projects with an AI agent (Claude, Cowork, Codex, etc.) in the loop.

## Why this exists

Specs grow stale. Features get implemented and quietly forgotten. New specs contradict old ones without saying so. Old specs sit around looking authoritative when they've been superseded. The defense is a small set of conventions that turn documentation into a living system instead of a graveyard.

The biggest concrete failure mode this prevents: features that were planned, partially implemented, then dropped during a refactor — and nobody notices until a user hits the regression months later. With the conventions below, every feature has a row in a status table that gets updated when its state changes, so silent drops become loud.

## Core artifacts

**`CLAUDE.md` (or `README.md`) — navigation map.** One-line entry per spec and design doc with link, status, and the feature area it covers. New docs land with their entry. Superseded docs update their entry. No orphan documents floating around.

**`docs/feature-status.md` — single source of truth for what exists.** Every user-visible feature has a row: name, current state (`not-started` / `in-progress` / `done` / `deferred` / `shelved`), pointer to the spec or doc that describes it. The roadmap updates this table as it executes. Before assuming a feature exists in the codebase, check this table.

**`docs/<feature>-spec.md` — design doc per feature.** Standard template: goal, scope, out-of-scope, data model (if applicable), UI sketch, acceptance criteria, risks, open questions. New docs include a `supersedes:` field at the top listing any older docs they replace.

**`docs/work-ticket-log.md` — append-only log of changes.** Every change that doesn't map to a dedicated spec gets a ticket entry. Changes that *do* map to a spec get a ticket *and* a spec status update. Newest at top. Ticket template: date, context, what changed, files touched, version bump.

**`docs/roadmap.md` — current execution plan.** Phases with goals, scope, done criteria, and task checklists. Updated as phases complete. The roadmap is a *plan*, not a record — once a phase ships, its details collapse into the work-ticket-log and feature-status table.

## Conventions

**Status fields on every doc.** `draft / active / superseded / shelved`. Visible at the top of the file in frontmatter or a banner.

**Supersession is explicit.** A new spec must declare what it replaces in a `supersedes:` field. Old specs get a "Superseded by [link]" banner at the top — not a deletion. Preserve old docs as historical record; don't retroactively edit them to match new decisions.

**Shelved specs get a banner.** "This work is shelved as of `<date>`. Reason: `<one-liner>`. Plan preserved for future." No ambiguity about whether it's queued or dropped.

**Conflict resolution rule.** When two docs disagree, the newer doc wins — unless the newer doc explicitly defers to the older one. This is why supersession needs to be explicit: silence is treated as "newer overrides older."

**Date everything.** Every spec, ticket, and roadmap phase has a date. Relative dates ("last week," "soon") rot fast.

## Pre-merge checklist

When merging a feature branch:

1. Specs updated to reflect new state
2. `feature-status.md` row updated
3. `work-ticket-log.md` has an entry for this change
4. Cache or version bumped if shipped assets changed
5. `CLAUDE.md` index updated if any new docs were added

Encode as a PR template once the project has more than one contributor.

## On Architecture Decision Records (ADRs)

ADRs (formal records of significant architectural decisions: context, options considered, decision, consequences) are valuable when (a) you expect many contributors, (b) the project will outlast your memory of the decisions, or (c) you want a paper trail for audits or compliance.

They're overkill for small solo projects. Spec docs already capture the same reasoning at finer granularity, and the supersession discipline handles the historical record. Skip ADRs unless one of the three conditions above is true.

If you do adopt them: put them in `docs/adr/NNN-title.md`, numbered sequentially. Never edit after acceptance — only supersede with a new ADR.

## Adapting to new projects

- Replace `CLAUDE.md` with whatever your AI agent reads — or with `README.md` if you're not using an agent.
- Replace cache-version bumping with whatever versioning your project uses (semver, build hash, etc.).
- For projects with formal release cycles, the roadmap can subsume into a release plan; for continuous-delivery projects, the roadmap stays loose.
- The rest — feature-status table, work-ticket log, supersession discipline, pre-merge checklist — is project-agnostic.

## Optional templates

A directory of templates (`docs/templates/`) keeps new docs consistent:

- `templates/spec.md` — feature spec skeleton
- `templates/ticket.md` — work ticket entry skeleton
- `templates/decision.md` — lightweight decision note (lighter than ADR, heavier than nothing)

Useful when more than one person — including AI agents — is authoring docs.
