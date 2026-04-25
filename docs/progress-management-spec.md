# Progress Management Spec

> Status: active. Created 2026-04-24.
> Roadmap phase: 5.
> Supersedes: nothing — this is the first dedicated treatment of progress management beyond the existing chunk system.

## 1. Goal

Replace the current "here are 750 cards, study them" experience with a structure that gives the user a clear *current focus*, a clear *daily rhythm*, and *automatic suggestions* for what to study next once they've mastered their current focus.

The current model leaves the user staring at thousands of words with no pacing or direction. The chunks system is the right primitive — it carves vocabulary into manageable subsets — but it's missing the layer above: a single chunk the user is actively working on, and a daily-session abstraction that says "today, you do these N items."

## 2. Three-layer design

The feature is composed of three independently-shippable layers that compose into one experience.

### 2.1 Active focus

The user marks one chunk (or one custom deck) as their current target. This is the lightest-touch layer — purely about presentation, no scheduling logic.

**Data:** `activeFocusId` per profile. Stores the deck/chunk identifier. May be null (no focus set).

**UI:**
- Sidebar emphasizes the active focus: top placement (above other decks), full opacity, badge or marker
- Other decks remain visible but dim slightly (e.g., 0.7 opacity, smaller bold weight)
- A "set as focus" right-click action on any deck or chunk
- A "clear focus" action to return to the unfocused state

**Behavior with no focus set:** sidebar renders as it does today, no dimming.

### 2.2 Daily session

The user sets a "new cards per day" budget. When they open the app, the system generates a session containing today's new cards (drawn from the active focus chunk, capped at the daily budget) plus all cards currently due for review (from FSRS state, not scoped to the active focus — review is review, regardless of source).

**Data per profile:**
- `newCardsPerDay` — integer setting, default 10
- `todaySession` — generated on demand: `{ date: 'YYYY-MM-DD', newCardIds: [...], reviewCardIds: [...], completedIds: [...] }`. Session for a given date is cached; if the date changes (user opens app the next day), a fresh session is generated and the previous one is discarded

**Session generation algorithm:**
1. If `activeFocusId` is set, walk that chunk's cards. Otherwise, walk all unstudied cards across all decks
2. Take the first `newCardsPerDay` cards that have no FSRS scheduling state yet (genuinely new). Add to `newCardIds`
3. Take all cards in any deck whose FSRS due date is `<= today`. Add to `reviewCardIds`
4. Persist `todaySession`

**UI:**
- Welcome card (empty state) shows: "Today: N new cards from `<focus chunk name>`, M reviews due. Start"
- During study, the session deck behaves like any other deck (card-by-card navigation, rating). The system tracks completion via `completedIds`
- When all session cards are completed, the welcome card shows: "All done for today. Come back tomorrow."

**Settings access:** "new cards per day" lives in the full settings modal under a "Review" section. Same section as the FSRS desired-retention setting.

### 2.3 Mastery-gated promotion

When the active focus chunk's mastery percentage hits a configurable threshold (default 80%), the system suggests promoting the next chunk to active focus.

**Data:**
- `masteryPromotionThreshold` — float, default 0.8 (80%)
- `dismissedPromotions` — set of chunk IDs the user has dismissed promotion suggestions for, so we don't re-prompt every session

**Suggestion UI:**
- A subtle, non-blocking notification ("toast" or persistent banner above the welcome card) when the threshold is crossed and the next chunk is identifiable
- "Move to chunk X?" with Accept / Postpone / Dismiss buttons
- Accept: sets `activeFocusId` to the next chunk's ID, clears today's session so a fresh one generates against the new focus
- Postpone: hides for this session only; will re-prompt on next app open
- Dismiss: adds to `dismissedPromotions`; user can manually re-set focus from sidebar if they want

**Next-chunk identification:** for HSK and JLPT decks, "next chunk" is the chunk after the current one in the deck's standard order. For custom decks, no automatic next-chunk exists, so promotion is suppressed.

## 3. Welcome card empty state

The welcome card replaces the current blank state when no deck is selected or no session is in progress. Visually a flashcard-shaped card; semantically the home screen.

**States:**
- **No focus, no session:** "Pick a deck to begin." Greeting glyph (你好 / こんにちは based on chosen language) + "Hello" underneath
- **Focus set, session in progress:** "Today: N new, M reviews. Start studying." Tap to begin
- **Focus set, session complete:** "All done for today. Come back tomorrow." Subtle, no CTA
- **Focus set, no session yet today:** same as "session in progress" — tapping triggers session generation

## 4. Header redesign (paired)

With progress management landing, the header has something useful to carry. Replace the current near-empty header with:

- App title (left)
- Active focus chunk name (center) with a small badge showing today's progress (e.g. "3 / 10")
- Action buttons (right): deck, info, settings (search button removed in Phase 2)

The center element is the persistent ambient status — at a glance, the user sees what they're working on and how far they are.

If there's no active focus, the center is empty (no fallback content).

## 5. Data model summary

Per-profile additions:
```
activeFocusId: string | null
newCardsPerDay: number (default 10)
todaySession: { date, newCardIds, reviewCardIds, completedIds } | null
masteryPromotionThreshold: number (default 0.8)
dismissedPromotions: string[]
```

These all live under the existing `hanzi-u:<profileId>:<key>` localStorage prefix. Migrate cleanly when the Supabase backend lands in Phase 8.

## 6. Acceptance criteria

- Active focus can be set, cleared, and is reflected in sidebar emphasis
- "New cards per day" setting works; default 10; persisted per profile
- Today's session generates correctly: new cards from focus chunk only, reviews from anywhere
- Session persists across reloads on the same date; regenerates when date changes
- Welcome card shows correct state (no focus / session in progress / session done)
- Mastery threshold triggers a non-blocking promotion suggestion
- Postpone, accept, dismiss all work as specified
- Header shows active focus name and progress
- All new settings live in the "Review" section of the full settings modal

## 7. Out of scope

- Streak/gamification
- Classroom-style assignment dates or deadlines
- Multi-focus (working on multiple chunks simultaneously)
- Reordering chunks within a deck
- Cloud sync of session state (handled in Phase 8)

## 8. Open questions

1. When the user adds a new custom deck and sets it as active focus, "next chunk" is undefined. Suppress promotion entirely, or detect when the deck is fully mastered and prompt the user to pick a new focus manually? Lean: prompt to pick.
2. Should the daily session include cards the user has been studying but not mastered (i.e., already-introduced cards from the focus chunk that aren't due for review yet)? Lean: no, keep new and review separate to avoid the session creeping in size.
3. How should reviews be capped? FSRS could in principle put hundreds of cards due on the same day. Cap at some maximum to avoid overwhelming sessions? Lean: yes, cap at 50 reviews per session by default with a "show more" affordance.

## 9. Risks

- Risk: users feel constrained by the daily budget and want to power through. Mitigation: budget is a guideline, not a wall — let them keep studying past the daily allotment if they want, but mark "today's quota done" once it's hit
- Risk: sidebar emphasis on active focus makes it harder to switch decks for power users who want to range freely. Mitigation: keep the rest of the sidebar fully accessible, just visually de-emphasized
- Risk: mastery-gated promotion misfires if the user has been browsing chunks ad-hoc and accumulating mastery without intent. Mitigation: only trigger promotion when mastery threshold is crossed during an active focus session, not retroactively

## 10. Acceptance test scenarios

- Fresh profile, pick HSK 1 chunk 1 as focus → welcome card shows correct counts → study session → ratings update FSRS state → completing all session cards shows "all done" state
- Mid-study session, close app, reopen → session resumes with the correct remaining cards
- Reach 80% mastery on focus chunk → promotion suggestion appears → accept → focus shifts → today's session regenerates against new focus
- Set focus to a custom deck → reach 80% mastery → promotion is suppressed (no next chunk) → user prompted to pick new focus
- Two profiles, different focus / sessions / settings — each profile's state isolated
