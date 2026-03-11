#!/usr/bin/env node
/**
 * build-data.js
 * One-time pipeline: reads hsk-input.json, calls Anthropic API in batches,
 * writes enriched entries to hsk-enriched.json incrementally.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node build-data.js
 *
 * Re-run safe: already-enriched entries are skipped automatically.
 * If the script is interrupted, just re-run — it picks up where it left off.
 */

const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const INPUT_FILE  = path.join(__dirname, 'hsk-input.json');
const OUTPUT_FILE = path.join(__dirname, 'hsk-enriched.json');
const BATCH_SIZE  = 8;    // characters per API call — keep small for quality
const DELAY_MS    = 800;  // pause between batches to avoid rate limits
const MODEL       = 'claude-sonnet-4-20250514';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function loadOutput() {
  if (!fs.existsSync(OUTPUT_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  } catch {
    console.warn('⚠  Could not parse existing output file — starting fresh.');
    return {};
  }
}

function saveOutput(data) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(batch) {
  const items = batch.map(c =>
    `- hanzi: "${c.hanzi}", pinyin: "${c.pinyin}", english: "${c.english}", hsk: ${c.hsk}`
  ).join('\n');

  return `You are a Chinese language data expert. For each item below, return a JSON array with one enriched entry per item.

Rules:
- Multi-character words (e.g. 你好, 电话) are treated as a single unit. Do NOT decompose them into individual characters for the components field — instead describe the word-level composition and meaning as a whole.
- Single characters get full component decomposition (radical + other components).
- Etymology should be factual and concise (2–4 sentences). No invented stories.
- Example sentences must be natural, graded (level 1 = very simple, level 2 = slightly more complex), and accurate.
- sameRadical: list up to 6 other common characters sharing the same primary radical. Empty array [] for multi-char words.
- Stroke count: for multi-character words, give total stroke count across all characters combined.
- Return ONLY the JSON array. No markdown, no explanation, no preamble.

Schema for each entry:
{
  "hanzi": "string",
  "pinyin": "string",
  "english": "string",
  "hsk": number,
  "components": [
    { "char": "string", "role": "semantic|phonetic|both|word-component", "meaning": "string", "note": "string" }
  ],
  "radical": "string (primary radical, or first character's radical for multi-char words)",
  "strokeCount": number,
  "etymology": "string (2–4 sentences, factual)",
  "examples": [
    { "zh": "string", "pinyin": "string", "en": "string", "level": 1 or 2 }
  ],
  "sameRadical": ["string", ...]
}

Items to enrich:
${items}`;
}

// ── API call ──────────────────────────────────────────────────────────────────

async function enrichBatch(batch, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildPrompt(batch) }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.content.map(b => b.text || '').join('').trim();

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`JSON parse failed for batch starting with "${batch[0].hanzi}":\n${cleaned.slice(0, 300)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array, got ${typeof parsed} for batch starting with "${batch[0].hanzi}"`);
  }

  return parsed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌  ANTHROPIC_API_KEY environment variable not set.');
    console.error('    Run: export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌  Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const output = loadOutput();

  const todo = input.filter(c => !output[c.hanzi]);
  const done = input.length - todo.length;

  console.log(`\n汉字 Data Pipeline`);
  console.log(`──────────────────────────────`);
  console.log(`Total entries : ${input.length}`);
  console.log(`Already done  : ${done}`);
  console.log(`To process    : ${todo.length}`);
  console.log(`Batch size    : ${BATCH_SIZE}`);
  console.log(`Batches needed: ${Math.ceil(todo.length / BATCH_SIZE)}`);
  console.log(`──────────────────────────────\n`);

  if (todo.length === 0) {
    console.log('✅  All entries already enriched. Run review-data.js to inspect.');
    return;
  }

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(todo.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.map(c => c.hanzi).join(' ')}) ... `);

    try {
      const enriched = await enrichBatch(batch, apiKey);

      // Merge results — key by hanzi
      for (const entry of enriched) {
        if (entry && entry.hanzi) {
          output[entry.hanzi] = entry;
        }
      }

      // Save after every batch — crash-safe
      saveOutput(output);
      processed += enriched.length;
      console.log(`✓ (${enriched.length} entries)`);

    } catch (err) {
      errors++;
      console.log(`✗ ERROR`);
      console.error(`   ${err.message}`);
      console.error(`   Skipping batch and continuing...`);
      // Don't save failed batch — these chars will be retried on next run
    }

    // Pause between batches (skip after last)
    if (i + BATCH_SIZE < todo.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Done. Processed: ${processed}, Errors: ${errors}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  if (errors > 0) {
    console.log(`\n⚠  ${errors} batch(es) failed. Re-run the script to retry them.`);
  } else {
    console.log(`\n✅  All done. Next step: node build-review.js`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
