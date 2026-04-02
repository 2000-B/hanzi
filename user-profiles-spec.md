# User Profiles Spec

> **Purpose:** Allow multiple people to use the same deployed instance of 汉字学习 without sharing progress, review queues, tutor history, or settings. No backend, no auth — just local profile switching backed by prefixed localStorage keys.
>
> **Constraint:** This is a persistence-layer change. The UI additions are minimal (profile picker, profile management in settings). No changes to study logic, test logic, card rendering, or data loading.

---

## 1. Why

The app is a static PWA on GitHub Pages. Anyone with the URL shares the same origin, which means the same localStorage namespace. Right now if Ben shares the link with a friend and they both use it on the same device (or even just the same browser), they overwrite each other's cardData, sessions, tutor history, and settings. Even on separate devices this is a problem if someone clears the browser and reimports the wrong backup.

Profiles solve this by giving each user their own isolated slice of localStorage, switchable without losing anyone's data.

---

## 2. Design Principles

- **No accounts, no passwords.** Profiles are local names — "Ben", "Mika", "Guest". There's no server to authenticate against and no reason to add one.
- **Zero-friction first launch.** A brand-new visitor should not be forced through profile creation before they can use the app. The app creates a "Default" profile silently on first load and only shows the profile picker when the user wants to switch or add a profile.
- **Existing users keep their data.** The migration from keyless to prefixed storage must be automatic and invisible. The first time the app detects old-format keys, it wraps them into the Default profile.
- **Profiles are entirely local.** They don't sync across devices. Export/import remains the cross-device mechanism — but now exports include the profile name for clarity.

---

## 3. Storage Schema

### 3.1 Current keys (pre-profiles)

| Key | Contents |
|-----|----------|
| `hanzi-progress` | `{ cardData, customDecks, sessions }` |
| `hanzi-tutor-history` | `[{ role, content, card, time }, ...]` |
| `hanzi-api-key` | `sk-ant-...` |
| `hanzi-theme` | `light` or `dark` |
| `hanzi-diff-ratings` | `1` or empty |
| `hanzi-appearance` | `{ backgroundType, backgroundData, ... }` (specced, not yet implemented) |

### 3.2 New keys (with profiles)

**Global keys** (shared across all profiles):

| Key | Contents |
|-----|----------|
| `hanzi-profiles` | `{ profiles: [{ id, name, createdAt }], activeId: "..." }` |
| `hanzi-theme` | Stays global — theme is a display preference, not a study preference |

**Per-profile keys** (prefixed with `hanzi-u:{id}:`):

| Key | Contents |
|-----|----------|
| `hanzi-u:{id}:progress` | `{ cardData, customDecks, sessions }` |
| `hanzi-u:{id}:tutor-history` | `[{ role, content, card, time }, ...]` |
| `hanzi-u:{id}:api-key` | `sk-ant-...` |
| `hanzi-u:{id}:diff-ratings` | `1` or empty |
| `hanzi-u:{id}:appearance` | `{ backgroundType, backgroundData, ... }` |

### 3.3 Profile ID format

Short random string, e.g. `p_a1b2c3`. Generated via `crypto.randomUUID().slice(0,8)` or a simple `Math.random().toString(36).slice(2,10)` fallback. The ID is internal — users never see it. They see and edit the profile **name**.

### 3.4 Why theme stays global

Theme (dark/light) is a display accessibility preference, not a study preference. If two people share a device, they're likely using it in the same lighting conditions. Keeping theme global also avoids a jarring flash when switching profiles. This is a judgment call — if users request per-profile themes later, it's easy to move.

---

## 4. Migration (automatic, one-time)

On app init, before any other localStorage reads:

1. Check if `hanzi-profiles` exists.
2. If **yes** → profiles are already set up. Read `activeId`, use it as the prefix for all subsequent reads.
3. If **no** → first run with the new system. Perform migration:
   a. Create a Default profile: `{ id: "default", name: "Default", createdAt: now }`.
   b. For each old key (`hanzi-progress`, `hanzi-tutor-history`, `hanzi-api-key`, `hanzi-diff-ratings`, `hanzi-appearance`):
      - Read the value.
      - Write it to the prefixed key (`hanzi-u:default:progress`, etc.).
      - Delete the old key.
   c. Write `hanzi-profiles` with the Default profile as the only entry and `activeId: "default"`.
   d. `hanzi-theme` stays where it is (it's global).

**Edge case:** If neither `hanzi-profiles` nor `hanzi-progress` exists, the user is brand new. Create the Default profile with empty data. No migration needed.

**Rollback safety:** The migration deletes old keys only after successfully writing new ones. If migration is interrupted (browser crash mid-write), the next load will see no `hanzi-profiles` and old keys still present, and retry the migration.

---

## 5. Storage Access Layer

All localStorage reads and writes go through a thin abstraction that injects the active profile prefix. This is the core change — every function that currently calls `localStorage.getItem('hanzi-progress')` instead calls a helper.

```javascript
// In persistence.js (or state.js for the global)
function profileKey(baseKey) {
  const activeId = getActiveProfileId(); // reads from hanzi-profiles
  return `hanzi-u:${activeId}:${baseKey}`;
}

function getProfileData(baseKey) {
  return localStorage.getItem(profileKey(baseKey));
}

function setProfileData(baseKey, value) {
  localStorage.setItem(profileKey(baseKey), value);
}

function removeProfileData(baseKey) {
  localStorage.removeItem(profileKey(baseKey));
}
```

### 5.1 Keys that use the prefix

| Base key | Getter call |
|----------|-------------|
| `progress` | `getProfileData('progress')` |
| `tutor-history` | `getProfileData('tutor-history')` |
| `api-key` | `getProfileData('api-key')` |
| `diff-ratings` | `getProfileData('diff-ratings')` |
| `appearance` | `getProfileData('appearance')` |

### 5.2 Keys that stay global

| Key | Access |
|-----|--------|
| `hanzi-profiles` | `localStorage.getItem('hanzi-profiles')` directly |
| `hanzi-theme` | `localStorage.getItem('hanzi-theme')` directly |

---

## 6. Profile Management UI

### 6.1 Profile indicator (header)

A small profile badge in the header (left side, after the app title or near the settings gear). Shows the current profile name, truncated to ~10 chars. Clicking opens the profile picker.

Design: subtle, like a chip or small pill — not a prominent button. Uses `--text2` color, `--bg3` background, consistent with other header elements.

### 6.2 Profile picker (popover or modal)

Opened by clicking the profile indicator. Contains:

- **List of existing profiles.** Each shows the name, a "switch" action (or just click the name to switch), and a delete button (trash icon). The active profile is highlighted.
- **"Add profile" button.** Opens an inline name input. User types a name, presses Enter or taps "Create". The new profile starts with empty data (no cardData, no tutor history, etc.).
- **Rename.** Clicking/tapping a profile name allows inline editing (contenteditable or input swap).

### 6.3 Profile section in Full Settings

In the full settings modal, add a "Profile" group at the top:

- Current profile name (editable)
- "Switch profile" button → opens the profile picker
- "Delete this profile" button → confirmation dialog, then switches to another profile (or creates Default if it was the last one)

### 6.4 Profile switching behavior

When the user switches profiles:

1. Save any pending data for the current profile (call `saveProgress()`).
2. Update `activeId` in `hanzi-profiles`.
3. Reload all state from the new profile's keys: `loadProgress()`, `loadTutorHistory()`, settings toggles, etc.
4. Re-render: sidebar (different custom decks), flashcard (different cardData/mastered state), info panel, analytics.
5. If the new profile has no decks loaded, show the empty state.

This is effectively a soft restart of the app state without a page reload. The cleanest implementation may be to call the existing `init()` flow after swapping the active ID.

---

## 7. Export/Import Changes

### 7.1 Export

The export JSON now includes a `profileName` field for identification:

```json
{
  "profileName": "Ben",
  "exportDate": "2026-04-02T...",
  "progress": { ... },
  "tutorHistory": [ ... ]
}
```

The filename includes the profile name: `hanzi-backup-Ben-2026-04-02.json`.

### 7.2 Import

Import works the same as today — it overwrites the **active profile's** data. The confirmation dialog should say: "This will replace all progress for profile **{name}**. Continue?"

If the imported file has a `profileName` that differs from the active profile, show a note: "This backup was exported from profile '{exportedName}'. It will be imported into your current profile '{activeName}'." This is informational, not blocking.

### 7.3 Legacy import compatibility

Old export files (without `profileName`) still work. The import function checks for the presence of `profileName` and handles both formats, same as the current code handles both the old raw-progress format and the new `{ progress, tutorHistory }` format.

---

## 8. Edge Cases

### 8.1 localStorage quota

Profiles multiply storage usage. With 5 profiles, you could have 5× the cardData. This is still well within localStorage limits (~5–10 MB depending on browser) for typical usage, but:

- The existing quota-exceeded handler (§17.6) still applies.
- The profile picker could show approximate storage used per profile (calculate by summing the byte lengths of that profile's keys). This is a nice-to-have, not a launch requirement.

### 8.2 Deleting the only profile

If the user deletes their last profile, auto-create a new "Default" profile with empty data and switch to it. The app should never be in a state with zero profiles.

### 8.3 Profile name collisions

Two profiles can have the same display name (they're distinguished by ID internally). The UI should discourage this (show a note "A profile with this name already exists") but not block it.

### 8.4 Corrupt or missing hanzi-profiles key

If `hanzi-profiles` is missing but prefixed keys exist (e.g. `hanzi-u:default:progress`), attempt to reconstruct the profiles list by scanning localStorage for `hanzi-u:*` keys. If reconstruction fails, fall back to creating a fresh Default profile. This handles the case where someone manually deletes the index key.

---

## 9. Interaction with Other Planned Features

### 9.1 Modularization

This feature maps cleanly onto the modularization spec:

| File | Changes |
|------|---------|
| `js/state.js` | Add `activeProfileId` global, `profiles` array |
| `js/persistence.js` | Add `profileKey()`, `getProfileData()`, `setProfileData()`, migration logic. Refactor all existing `localStorage.getItem('hanzi-...')` calls to use the new helpers. |
| `js/settings.js` | Add profile section to full settings modal |
| `js/app.js` | Call migration check in `init()` before `loadProgress()` |
| `index.html` | Add profile indicator to header HTML, profile picker markup |
| `styles.css` | Profile indicator and picker styling |

**Recommendation:** Do modularization first, then implement profiles. It's much easier to refactor `persistence.js` (one file, ~114 lines) than to find-and-replace across a 4,580-line monolith.

### 9.2 Workspace tiling (shelved)

No interaction. Workspace layout preferences could be per-profile or global — TBD if/when workspace is revisited.

### 9.3 Japanese language support

Profiles are language-agnostic. A profile stores whatever cardData the user has studied. If/when Japanese is added, a user studying both languages would have Chinese and Japanese cardData in the same profile, keyed by character. This is fine — the characters don't collide (JLPT and HSK use different deck names).

### 9.4 Appearance settings

Per-profile. One user might prefer a custom background; another uses the default. The `hanzi-u:{id}:appearance` key handles this.

---

## 10. Implementation Order

1. **Storage access layer** — Write `profileKey()`, `getProfileData()`, `setProfileData()` helpers. Don't wire them yet.
2. **Migration logic** — Write the one-time migration function. Test it: create fake old-format keys, run migration, verify prefixed keys exist and old keys are deleted.
3. **Refactor persistence** — Replace all `localStorage.getItem('hanzi-...')` / `setItem` calls with the new helpers. Verify the app works identically (with the auto-created Default profile).
4. **Profile picker UI** — Add header indicator + picker popover. Wire "add profile" and "switch profile".
5. **Settings integration** — Add profile section to full settings. Wire rename and delete.
6. **Export/import update** — Add `profileName` to exports, update import confirmation text, maintain legacy compatibility.
7. **Test thoroughly** — Create 2–3 profiles, study in each, switch between them, export one, import into another, delete one.

---

## 11. Resolved Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Auth / passwords? | **No** | Static PWA, no backend. Profiles are trust-based — same as a shared Kindle. |
| Theme per-profile or global? | **Global** | Theme is display accessibility, not study preference. Easy to change later. |
| Force profile creation on first visit? | **No** | Auto-create "Default" silently. Profile picker appears only when user wants it. |
| Profile ID format? | **Short random string** | `p_a1b2c3`. Users never see it. Avoids issues with special chars in names. |
| Where in the header? | **Small pill near title or settings** | Unobtrusive. The app is about flashcards, not profile management. |
| Can two profiles share a name? | **Discouraged, not blocked** | IDs are unique. Names are display labels. |
| API key per-profile? | **Yes** | Different users may have different API keys, or one user might not have one at all. |
