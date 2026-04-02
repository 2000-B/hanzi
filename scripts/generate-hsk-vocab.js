#!/usr/bin/env node
/**
 * generate-hsk-vocab.js
 * Generates hsk3.json through hsk6.json using the Anthropic API.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node generate-hsk-vocab.js          # generates all levels
 *   node generate-hsk-vocab.js 3        # generates only hsk3.json
 *   node generate-hsk-vocab.js 3 4      # generates hsk3.json and hsk4.json
 *
 * Re-run safe: if a file already exists and has entries, it is left untouched.
 * Output: data/hsk3.json, data/hsk4.json, data/hsk5.json, data/hsk6.json
 *
 * Each file is an array of { hanzi, pinyin, english } objects, sorted
 * alphabetically by pinyin. These are the words unique to that HSK level
 * (i.e. not repeated from lower levels).
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const MODEL     = 'claude-sonnet-4-20250514';
const DELAY_MS  = 1000;

// ── Level config ──────────────────────────────────────────────────────────────

const LEVELS = {
  3: { count: 300,  desc: 'HSK level 3 (intermediate-beginner, ~300 unique words beyond HSK 1-2)' },
  4: { count: 600,  desc: 'HSK level 4 (intermediate, ~600 unique words beyond HSK 1-3)' },
  5: { count: 1300, desc: 'HSK level 5 (upper-intermediate, ~1300 unique words beyond HSK 1-4)' },
  6: { count: 2500, desc: 'HSK level 6 (advanced, ~2500 unique words beyond HSK 1-5)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function outputPath(level) {
  return path.join(DATA_DIR, `hsk${level}.json`);
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

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(level, batchIndex, batchSize, totalBatches) {
  const { desc } = LEVELS[level];
  const offset = batchIndex * batchSize + 1;
  const end    = Math.min(offset + batchSize - 1, LEVELS[level].count);

  return `You are generating a Chinese vocabulary dataset for the standard HSK exam (old HSK, pre-2021 revision).

Generate entries ${offset} through ${end} of the ${desc}.

Rules:
- Use the official old HSK (pre-2021) word list. These are the words unique to this level — do NOT include words from lower HSK levels.
- Each entry: { "hanzi": "...", "pinyin": "...", "english": "..." }
- Pinyin must use tone marks (e.g. "nǐ hǎo", not "ni3 hao3").
- English: short, practical meaning. Use " / " to separate multiple senses (e.g. "to go / to leave").
- Multi-character words: pinyin uses spaces between syllables (e.g. "nǐ hǎo").
- Single characters: no spaces in pinyin.
- Sort entries alphabetically by pinyin within this batch.
- Return ONLY a valid JSON array. No markdown, no explanation, no preamble.

Return exactly ${end - offset + 1} entries.`;
}

// ── API call ──────────────────────────────────────────────────────────────────

async function fetchBatch(level, batchIndex, batchSize, totalBatches, apiKey) {
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
      messages: [{ role: 'user', content: buildPrompt(level, batchIndex, batchSize, totalBatches) }],
    }),
  });

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
    throw new Error(`JSON parse failed for HSK ${level} batch ${batchIndex + 1}:\n${cleaned.slice(0, 400)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array, got ${typeof parsed} for HSK ${level} batch ${batchIndex + 1}`);
  }

  // Basic validation
  const valid = parsed.filter(e => e && e.hanzi && e.pinyin && e.english);
  if (valid.length < parsed.length) {
    console.warn(`  ⚠  ${parsed.length - valid.length} malformed entries skipped`);
  }

  return valid;
}

// ── Generate one level ────────────────────────────────────────────────────────

async function generateLevel(level, apiKey) {
  const { count } = LEVELS[level];
  const existing  = loadExisting(level);

  if (existing.length >= count * 0.9) {
    console.log(`  ✓ hsk${level}.json already has ${existing.length} entries — skipping`);
    return;
  }

  console.log(`\n── HSK ${level} ──────────────────────────────`);
  console.log(`  Target: ~${count} entries`);

  // Use larger batch size for bigger levels to reduce API calls
  const batchSize    = level <= 3 ? 50 : level === 4 ? 60 : 80;
  const totalBatches = Math.ceil(count / batchSize);
  const allEntries   = [];
  let errors = 0;

  console.log(`  Batches: ${totalBatches} × ${batchSize}\n`);

  for (let i = 0; i < totalBatches; i++) {
    const offset = i * batchSize + 1;
    const end    = Math.min(offset + batchSize - 1, count);
    process.stdout.write(`  Batch ${i + 1}/${totalBatches} (entries ${offset}–${end}) ... `);

    try {
      const entries = await fetchBatch(level, i, batchSize, totalBatches, apiKey);
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

  console.log(`\n  Done. ${allEntries.length} entries written to data/hsk${level}.json`);
  if (errors > 0) {
    console.log(`  ⚠  ${errors} batch(es) failed. Re-run to retry.`);
  }
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

  // Parse which levels to generate from CLI args, default all 3-6
  const args = process.argv.slice(2).map(Number).filter(n => n >= 3 && n <= 6);
  const levels = args.length > 0 ? args : [3, 4, 5, 6];

  console.log(`\n汉字 HSK Vocabulary Generator`);
  console.log(`══════════════════════════════`);
  console.log(`Levels to generate: ${levels.join(', ')}`);
  console.log(`Model: ${MODEL}`);

  for (const level of levels) {
    await generateLevel(level, apiKey);
  }

  console.log('\n══════════════════════════════');
  console.log('All done. Upload the generated data/ files to GitHub.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
