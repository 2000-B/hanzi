// FSRS-4.5 ALGORITHM — pure functions (no DOM, no localStorage)
// Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
// ══════════════════════════════════════════
//
// Card state (subset of cardData):
//   stability   — number, expected days for retrievability to decay to ~90%
//   difficulty  — number 1..10
//   lastReview  — YYYY-MM-DD string (or null for new cards)
//
// Ratings (4-button):
//   1 = Again, 2 = Hard, 3 = Good, 4 = Easy
//
// Derived per review:
//   due         — YYYY-MM-DD, lastReview + interval(stability, desiredRetention)
//   reviewFlag  — true when last rating was Again
//   lastRating  — 1..4

const FSRS_W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567
];
const FSRS_FACTOR = 19 / 81; // r(t,S) = (1 + FACTOR * t / S) ^ DECAY  →  90% retention at S days
const FSRS_DECAY = -0.5;
const FSRS_DEFAULT_RETENTION = 0.9;

function fsrsInitStability(rating) {
  return Math.max(FSRS_W[rating - 1], 0.1);
}

function fsrsInitDifficulty(rating) {
  return Math.min(Math.max(FSRS_W[4] - (rating - 3) * FSRS_W[5], 1), 10);
}

function fsrsNextDifficulty(d, rating) {
  const newD = d - FSRS_W[6] * (rating - 3);
  // Mean reversion toward the difficulty assumed for a "Good" first review.
  const reverted = FSRS_W[7] * fsrsInitDifficulty(4) + (1 - FSRS_W[7]) * newD;
  return Math.min(Math.max(reverted, 1), 10);
}

function fsrsRetrievability(elapsedDays, stability) {
  if (stability <= 0) return 1;
  return Math.pow(1 + FSRS_FACTOR * elapsedDays / stability, FSRS_DECAY);
}

function fsrsRecallStability(d, s, r, rating) {
  const hardPenalty = rating === 2 ? FSRS_W[15] : 1;
  const easyBonus   = rating === 4 ? FSRS_W[16] : 1;
  return s * (
    1 +
    Math.exp(FSRS_W[8]) *
    (11 - d) *
    Math.pow(s, -FSRS_W[9]) *
    (Math.exp((1 - r) * FSRS_W[10]) - 1) *
    hardPenalty *
    easyBonus
  );
}

function fsrsForgetStability(d, s, r) {
  return FSRS_W[11] *
    Math.pow(d, -FSRS_W[12]) *
    (Math.pow(s + 1, FSRS_W[13]) - 1) *
    Math.exp((1 - r) * FSRS_W[14]);
}

/** Days until the card's retrievability would decay to `desiredRetention`. */
function fsrsInterval(stability, desiredRetention) {
  const r = desiredRetention || FSRS_DEFAULT_RETENTION;
  return (stability / FSRS_FACTOR) * (Math.pow(r, 1 / FSRS_DECAY) - 1);
}

/**
 * Apply an FSRS update to `cd` based on a 4-button rating.
 * Mutates and returns `cd`.
 */
function applyFSRS(cd, rating, todayISO, desiredRetention) {
  const today = todayISO || new Date().toISOString().slice(0, 10);
  const todayMs = new Date(today + 'T00:00:00').getTime();
  const ret = desiredRetention || FSRS_DEFAULT_RETENTION;

  const isNew = !cd.lastReview || cd.stability == null || cd.difficulty == null;
  if (isNew) {
    cd.stability  = fsrsInitStability(rating);
    cd.difficulty = fsrsInitDifficulty(rating);
  } else {
    const lastMs = new Date(cd.lastReview + 'T00:00:00').getTime();
    const elapsed = Math.max(0, (todayMs - lastMs) / 86400000);
    const r = fsrsRetrievability(elapsed, cd.stability);
    const nextS = (rating === 1)
      ? fsrsForgetStability(cd.difficulty, cd.stability, r)
      : fsrsRecallStability(cd.difficulty, cd.stability, r, rating);
    cd.stability  = Math.max(nextS, 0.1);
    cd.difficulty = fsrsNextDifficulty(cd.difficulty, rating);
  }

  cd.lastReview = today;
  cd.reviewFlag = (rating === 1);
  cd.lastRating = rating;

  const intervalD = fsrsInterval(cd.stability, ret);
  const dueMs = todayMs + intervalD * 86400000;
  cd.due = new Date(dueMs).toISOString().slice(0, 10);

  return cd;
}

/**
 * Slate-clean migration from SM-2 fields. Drops `efactor`, `interval`,
 * keeps `mastered`, resets FSRS state to "new" so the next rating is treated
 * as a first review.
 */
function fsrsMigrateCard(cd) {
  if (cd.efactor !== undefined || cd.interval !== undefined) {
    delete cd.efactor;
    delete cd.interval;
    cd.stability = null;
    cd.difficulty = null;
    cd.lastReview = null;
    cd.due = null;
    cd.lastRating = null;
    cd.reviewFlag = false;
  }
  return cd;
}

// Expose for browser tests (when imported via plain script tag)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FSRS_W, FSRS_FACTOR, FSRS_DECAY, FSRS_DEFAULT_RETENTION,
    fsrsInitStability, fsrsInitDifficulty, fsrsNextDifficulty,
    fsrsRetrievability, fsrsRecallStability, fsrsForgetStability,
    fsrsInterval, applyFSRS, fsrsMigrateCard,
  };
}
