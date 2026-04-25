# Search Consolidation Spec

> Status: active. Created 2026-04-24.
> Roadmap phase: 2.
> Supersedes: the search section of `hanzi-app-spec-v5_3.md` insofar as it describes the header search pill. The header search is being removed.

## 1. Goal

Replace the single header search with two list-scoped searches that follow the principle "lists are searchable wherever they appear." Each list in the app gets its own search input, styled consistently with the existing search-pill component.

## 2. Why remove the header search

The header search is a global "find any card" affordance, useful but currently the only search surface. It's also disconnected from the lists it implicitly searches over: typing in the header searches the deck panel's contents indirectly. With the deck panel and card list overlay both gaining their own searches, the header search becomes redundant and inconsistent with the new design principle.

**Friction tradeoff (acknowledged):** the header search is one click from anywhere; deck-panel search is two clicks (open panel, focus input). The keyboard shortcut (`/`, `Cmd+K`) is repointed to open the deck panel and focus its search input, restoring the one-keystroke path for power users without re-introducing a header element.

## 3. Two searches after this phase

### 3.1 Deck-panel search

**Location:** top of the deck panel, above the deck list.

**Scope:** hierarchical — searches across all decks, all chunks within decks, and all cards within chunks. Results show in a mixed list grouped by type:
- Decks matching the query
- Chunks matching the query
- Cards matching the query (hanzi, pinyin, English meaning)

**Behavior:**
- Tap a deck result: opens that deck (same as clicking it in the list)
- Tap a chunk result: opens the parent deck and selects that chunk
- Tap a card result: navigates to that card (study mode loads the deck and jumps to the card)

**Reset:** clearing the input (or pressing Escape) restores the full deck list.

### 3.2 Card list overlay search

**Location:** bottom of the card area when the card list overlay is open. Toggles in/out with the list.

**Scope:** searches the current deck first; cross-deck results appear below a divider with a header label ("From other decks").

**Behavior:**
- Tap a current-deck row: navigates to that card in the current deck
- Tap a cross-deck row: switches to that deck and navigates to the card

**Result ordering:** within each group (current vs other), order by relevance (exact match > prefix match > substring). Pinyin matching uses the existing tone-mark normalization from the current header search.

## 4. Styling

Both inputs reuse the existing `.search-pill` and `.search-input` styles. Drop the icon-collapse transition — the inputs are always visible inline with their lists, not hidden behind an icon.

The result dropdowns reuse the existing `.search-results` styling (dropdown background, hover states, result row layout). One styling unit, three placements (the original header pill is removed; the two new placements inherit it).

## 5. Keyboard shortcuts

- `/` — opens the deck panel if closed, focuses the deck-panel search input
- `Cmd+K` (and `Ctrl+K` on non-Mac) — same as `/`
- `Escape` while the deck-panel search is focused: clears the input first, then defocuses (same as today)
- `Escape` while the card list search is focused: same pattern

## 6. Header changes

Remove from the header:
- `#btn-search` (the search icon button)
- `.header-search-wrap` (the expanding pill container)
- `#search-pill` and `.search-bar` (the input wrapper)
- `#search-results` (the result dropdown)
- All associated CSS in `styles.css` (the `.header-search-wrap`, `.search-pill`, etc. — but only the rules specific to header placement; the base `.search-pill` and `.search-input` styles stay because they're reused)

The header is left with: title, deck button, info button, settings button. It will be redesigned in Phase 5 when progress management gives it new content. For Phase 2, leaving it sparser-than-current is acceptable.

## 7. Search index

The existing search index logic (in `js/search.js`) is not removed — it's reused. The two new searches both use the same `searchIndex` data structure and matching functions. What changes:

- The single header `#search-input` event handler is replaced with two handlers, one per new input
- Each handler renders its own results into its own dropdown DOM
- The matching function may need a `scope` parameter (current deck vs all decks) to support the card-list overlay's prioritization

## 8. Acceptance criteria

- Header has no search markup; deck panel and card list overlay both have working search inputs
- Both searches use the same `.search-pill` styling
- Deck-panel search returns hierarchical results (decks + chunks + cards), each navigable
- Card-list-overlay search returns current-deck results above a divider, cross-deck results below
- `/` and `Cmd+K` open the deck panel and focus its search input
- Escape clears and defocuses
- Pinyin matching with tone marks works in both searches (e.g. typing `ni` matches `nǐ`)
- Cache bumped, ticket added, feature-status.md updated

## 9. Out of scope

- Adding search to other lists (mastered cards modal, session history, etc.) — those can adopt the same pattern in future phases as the lists themselves get attention
- Search history / recent searches
- Fuzzy matching beyond what the existing search index provides
- Voice search

## 10. Risks

- Risk: removing the always-available header search frustrates power users. Mitigation: the keyboard shortcut restores the one-keystroke path; document this in the welcome modal or a tooltip on the deck panel's search input on first use
- Risk: two searches with different scopes confuses users about where to look. Mitigation: the spatial logic — search lives where the list is — is its own teaching device; pair with consistent styling so users recognize the pattern

## 11. Open questions

1. Should the card-list-overlay search show cross-deck results by default, or only after the user explicitly expands a "search other decks" affordance? Lean: show by default, but visually de-emphasized so the current-deck results are clearly the primary
2. When typing in the deck-panel search, should the existing deck list visibly filter (deck rows hide as they don't match), or should results render in a separate dropdown? Lean: separate dropdown — keeps the deck list stable and matches header search behavior pattern users already know
3. For pinyin search across decks of different languages (Chinese vs Japanese), should the search filter by current language, or always cross-language? Lean: filter by current language (matches today's behavior); add a cross-language toggle if user feedback warrants
