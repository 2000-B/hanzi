// Placeholder test — verifies the test runner is wired up.
// Real tests start landing in Phase 4 (FSRS migration).
// See docs/roadmap.md for context.

const { test } = require('node:test');
const assert = require('node:assert/strict');

test('test runner is reachable', () => {
  assert.equal(1 + 1, 2);
});
