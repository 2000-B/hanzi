#!/usr/bin/env node
/**
 * generate-jlpt-vocab.js
 * Generates jlpt-input.json (and optionally per-level jlptN5.json etc.)
 * using the Anthropic API.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node generate-jlpt-vocab.js          # generates all levels (N5–N1)
 *   node generate-jlpt-vocab.js 5        # generates only JLPT N5
 *   node generate-jlpt-vocab.js 5 4      # generates N5 and N4
 *
 * Re-run safe: if a level file already exists with enough entries, it is skipped.
 *
 * Output:
 *   data/jlptN5.json .. data/jlptN1.json  — per-level vocab arrays
 *   jlpt-input.json                       — combined file for build-data-jp.js
 *
 * Each entry: { "kanji": "...", "kana": "...", "romaji": "...", "english": "...", "jlpt": N }
 *
 * For kana-only words (no kanji form), kanji is set to the kana string.
 * Example: { "kanji": "でも", "kana": "でも", "romaji": "demo", "english": "but / however", "jlpt": 5 }
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR    = path.join(__dirname, '..', 'data');
const COMBINED    = path.join(__dirname, '..', 'data', 'jlpt-input.json');
const MODEL       = 'claude-sonnet-4-20250514';
const DELAY_MS    = 1500;
const RATE_LIMIT_WAIT = 35000;
const MAX_RETRIES = 3;

// ── Level config ──────────────────────────────────────────────────────────────
// Word counts are approximate targets based on standard JLPT lists.
// N5 and N4 are the primary targets for the app's initial Japanese support.

const LEVELS = {
  5: { count: 800,  desc: 'JLPT N5 (beginner, ~800 words including kana-only)' },
  4: { count: 1500, desc: 'JLPT N4 (upper-beginner, ~1500 unique words beyond N5)' },
  3: { count: 3750, desc: 'JLPT N3 (intermediate, ~3750 unique words beyond N4)' },
  2: { count: 6000, desc: 'JLPT N2 (upper-intermediate, ~6000 unique words beyond N3)' },
  1: { count: 10000, desc: 'JLPT N1 (advanced, ~10000 unique words beyond N2)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function outputPath(level) {
  return path.join(DATA_DIR, `jlptN${level}.json`);
}

function loadExisting(level) {
  const p = outputPath(level);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return [];
  }
}

function saveFile(level, entries) {
  fs.writeFileSync(outputPath(level), JSON.stringify(entries, null, 2), 'utf8');
}

// Detect if a string contains any kanji
function containsKanji(str) {
  return /[\u4e00-\u9faf\u3400-\u4dbf]/.test(str);
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(level, batchIndex, batchSize) {
  const { desc } = LEVELS[level];
  const offset = batchIndex * batchSize + 1;
  const end    = Math.min(offset + batchSize - 1, LEVELS[level].count);

  return `You are generating a Japanese vocabulary dataset for the JLPT (Japanese Language Proficiency Test).

Generate entries ${offset} through ${end} of the ${desc}.

Rules:
- Use the standard JLPT word list for this level. These are words unique to this level — do NOT include words from lower levels (e.g. N5 words should not appear in N4 output).
- Each entry must have these four fields:
  { "kanji": "...", "kana": "...", "romaji": "...", "english": "..." }

Field rules:
- "kanji": the word as normally written. For kana-only words with no standard kanji form (e.g. でも, それ, もう), set this to the kana string itself.
- "kana": full hiragana/katakana reading. For words with multiple common readings, use only the most common one.
- "romaji": romanisation using modified Hepburn. Long vowels: ou/uu (not ō/ū). Particles は/へ/を as wa/e/o. Word boundaries with spaces for compound words.
- "english": short, practical meaning. Use " / " to separate multiple senses (e.g. "to eat / to have a meal"). For verbs, include "to" prefix.

Formatting:
- Verbs in dictionary form (e.g. 食べる not 食べます).
- い-adjectives in plain form (e.g. 大きい not 大きいです).
- な-adjectives without な (e.g. 静か not 静かな), but note "(na-adj)" in english if useful.
- Sort entries alphabetically by romaji within this batch.
- Return ONLY a valid JSON array. No markdown, no explanation, no preamble.

Return exactly ${end - offset + 1} entries.`;
}

// ── API call ──────────────────────────────────────────────────────────────────

async function fetchBatch(level, batchIndex, batchSize, apiKey, retryCount = 0) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: buildPrompt(level, batchIndex, batchSize) }],
    }),
  });

  if (response.status === 429 && retryCount < MAX_RETRIES) {
    const waitSec = Math.round(RATE_LIMIT_WAIT / 1000 * (retryCount + 1));
    process.stdout.write(`rate limited, waiting ${waitSec}s ... `);
    await sleep(waitSec * 1000);
    return fetchBatch(level, batchIndex, batchSize, apiKey, retryCount + 1);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw  = data.content.map(b => b.text || '').join('').trim();
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`JSON parse failed for JLPT N${level} batch ${batchIndex + 1}:\n${cleaned.slice(0, 400)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array, got ${typeof parsed} for JLPT N${level} batch ${batchIndex + 1}`);
  }

  // Basic validation
  const valid = parsed.filter(e => {
    if (!e || !e.kana || !e.english) return false;
    // Ensure kanji field exists (default to kana if missing)
    if (!e.kanji) e.kanji = e.kana;
    // Ensure romaji exists
    if (!e.romaji) return false;
    return true;
  });

  if (valid.length < parsed.length) {
    console.warn(`  ⚠  ${parsed.length - valid.length} malformed entries skipped`);
  }

  return valid;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function deduplicateEntries(entries) {
  const seen = new Map();
  const deduped = [];

  for (const entry of entries) {
    // Key on kanji+kana to handle homographs
    const key = `${entry.kanji}|${entry.kana}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      deduped.push(entry);
    }
  }

  const removed = entries.length - deduped.length;
  if (removed > 0) {
    console.log(`  ℹ  Removed ${removed} duplicate(s)`);
  }

  return deduped;
}

// ── Generate one level ────────────────────────────────────────────────────────

async function generateLevel(level, apiKey) {
  const { count } = LEVELS[level];
  const existing  = loadExisting(level);

  if (existing.length >= count * 0.9) {
    console.log(`  ✓ jlptN${level}.json already has ${existing.length} entries — skipping`);
    return;
  }

  console.log(`\n── JLPT N${level} ──────────────────────────────`);
  console.log(`  Target: ~${count} entries`);

  // Batch sizing: smaller for lower levels (quality matters more), larger for bulk
  const batchSize    = level >= 4 ? 50 : level === 3 ? 60 : 80;
  const totalBatches = Math.ceil(count / batchSize);
  const allEntries   = [];
  let errors = 0;

  console.log(`  Batches: ${totalBatches} × ${batchSize}\n`);

  for (let i = 0; i < totalBatches; i++) {
    const offset = i * batchSize + 1;
    const end    = Math.min(offset + batchSize - 1, count);
    process.stdout.write(`  Batch ${i + 1}/${totalBatches} (entries ${offset}–${end}) ... `);

    try {
      const entries = await fetchBatch(level, i, batchSize, apiKey);
      allEntries.push(...entries);
      console.log(`✓ (${entries.length} entries, total: ${allEntries.length})`);

      // Save after every batch — crash-safe
      saveFile(level, allEntries);
    } catch (err) {
      errors++;
      console.log(`✗ ERROR`);
      console.error(`     ${err.message.slice(0, 200)}`);
      console.error(`     Skipping batch and continuing...`);
    }

    if (i < totalBatches - 1) await sleep(DELAY_MS);
  }

  // Deduplicate (LLMs sometimes repeat across batches)
  const deduped = deduplicateEntries(allEntries);
  saveFile(level, deduped);

  const kanjiCount = deduped.filter(e => containsKanji(e.kanji)).length;
  const kanaCount  = deduped.length - kanjiCount;

  console.log(`\n  Done. ${deduped.length} entries (${kanjiCount} kanji, ${kanaCount} kana-only) → data/jlptN${level}.json`);
  if (errors > 0) {
    console.log(`  ⚠  ${errors} batch(es) failed. Re-run to retry.`);
  }
}

// ── Combine into jlpt-input.json ──────────────────────────────────────────────

function buildCombinedInput(levels) {
  const combined = [];

  for (const level of levels) {
    const entries = loadExisting(level);
    for (const entry of entries) {
      combined.push({
        kanji:   entry.kanji,
        kana:    entry.kana,
        romaji:  entry.romaji,
        english: entry.english,
        jlpt:    level,
      });
    }
  }

  fs.writeFileSync(COMBINED, JSON.stringify(combined, null, 2), 'utf8');
  console.log(`\n📦 Combined ${combined.length} entries → jlpt-input.json`);
  console.log(`   Ready for: node build-data-jp.js`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌  ANTHROPIC_API_KEY not set. Run: export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Parse which levels to generate from CLI args, default N5 only
  // (N5 is the initial target per the spec — add more levels as needed)
  const args = process.argv.slice(2).map(Number).filter(n => n >= 1 && n <= 5);
  const levels = args.length > 0 ? args : [5];

  console.log(`\n漢字 JLPT Vocabulary Generator`);
  console.log(`══════════════════════════════`);
  console.log(`Levels to generate: ${levels.map(l => `N${l}`).join(', ')}`);
  console.log(`Model: ${MODEL}`);

  for (const level of levels) {
    await generateLevel(level, apiKey);
  }

  // Build the combined input file for the enrichment pipeline
  buildCombinedInput(levels);

  console.log('\n══════════════════════════════');
  console.log('All done. Next step: node build-data-jp.js\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
