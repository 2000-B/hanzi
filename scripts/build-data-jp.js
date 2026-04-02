#!/usr/bin/env node
/**
 * build-data-jp.js
 * One-time pipeline: reads jlpt-input.json, calls Anthropic API in batches,
 * writes enriched entries to jlpt-enriched.json incrementally.
 *
 * Mirrors the architecture of build-data.js (Chinese) but handles:
 *   - Kanji with on'yomi + kun'yomi readings
 *   - Mixed-script vocabulary (kanji + kana)
 *   - JLPT levels instead of HSK
 *   - Furigana in examples
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node build-data-jp.js
 *
 * Options:
 *   --validate-only   Skip API calls, just validate existing output file
 *   --force <kanji>   Re-enrich a specific entry even if it already exists
 *   --level <N>       Only process JLPT level N (default: all levels in input)
 *
 * Re-run safe: already-enriched entries are skipped automatically.
 * If the script is interrupted, just re-run — it picks up where it left off.
 *
 * Input format (jlpt-input.json):
 * [
 *   { "kanji": "食べる", "kana": "たべる", "romaji": "taberu", "english": "to eat", "jlpt": 5 },
 *   { "kanji": "日", "kana": "にち/ひ", "romaji": "nichi/hi", "english": "day / sun", "jlpt": 5 },
 *   ...
 * ]
 *
 * For kana-only words (no kanji form), set kanji to the kana:
 *   { "kanji": "でも", "kana": "でも", "romaji": "demo", "english": "but / however", "jlpt": 5 }
 */

const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const INPUT_FILE  = path.join(__dirname, '..', 'data', 'jlpt-input.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'jlpt-enriched.json');
const BATCH_SIZE  = 6;    // smaller than Chinese — kanji entries are more complex (dual readings)
const DELAY_MS    = 1000; // slightly more conservative
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

// Detect if a string contains any kanji (CJK Unified Ideographs)
function containsKanji(str) {
  return /[\u4e00-\u9faf\u3400-\u4dbf]/.test(str);
}

// Detect if entry is kana-only (no kanji in the word)
function isKanaOnly(entry) {
  return !containsKanji(entry.kanji);
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(batch) {
  const items = batch.map(c =>
    `- kanji: "${c.kanji}", kana: "${c.kana}", romaji: "${c.romaji}", english: "${c.english}", jlpt: ${c.jlpt}`
  ).join('\n');

  return `You are a Japanese language data expert. For each item below, return a JSON array with one enriched entry per item.

IMPORTANT CONTEXT:
- These are Japanese vocabulary items at JLPT N5–N4 level (beginner).
- Kanji used in Japanese are based on traditional Chinese characters (繁体字), NOT simplified Chinese (简体字). For example, Japanese uses 学 (which looks like the simplified Chinese form but has its own Japanese stroke order and usage), 食, 見, etc.
- Many items are mixed-script: a kanji stem with kana okurigana (e.g. 食べる = 食 + べる). Decompose only the kanji portion.
- Some items are kana-only words (e.g. でも, それ). These get NO component decomposition — set components to an empty array.

Rules for KANJI entries (single kanji or kanji compounds):
- Components: decompose the kanji into its visible radical and structural components. Use the standard Kangxi radical.
- On'yomi: Chinese-derived reading(s) in katakana. Multiple readings separated by " / ".
- Kun'yomi: Native Japanese reading(s) in hiragana, with okurigana separated by a dot (e.g. "た.べる"). Multiple readings separated by " / ".
- Etymology: 2–4 sentences. For kanji shared with Chinese, note the connection. Describe the character's composition factually.
- Stroke count: count strokes in the standard Japanese form (jōyō kanji).
- sameRadical: up to 6 other common JLPT N5–N3 kanji sharing the same primary radical. Empty array for kana-only words.

Rules for KANA-ONLY entries (no kanji in the word):
- Components: empty array []
- On'yomi / kun'yomi: omit or set to empty string
- Radical: empty string
- Stroke count: 0
- Etymology: brief note on the word's origin or usage (1–2 sentences)
- sameRadical: empty array []

Rules for MIXED-SCRIPT words (kanji + okurigana, e.g. 食べる):
- Components: use role "word-component" and list each kanji with its meaning, plus a note for the kana portion
- On'yomi / kun'yomi: provide readings for the primary kanji
- Etymology: explain the word's meaning and kanji contribution

General rules:
- Example sentences must be natural, graded (level 1 = very simple JLPT N5, level 2 = slightly harder N5/N4), and use standard polite Japanese (です/ます form for level 1).
- Furigana: include a "furigana" field in each example with full furigana notation using brackets: 食[た]べる, 日本語[にほんご]
- Return ONLY the JSON array. No markdown, no explanation, no preamble.

Schema for each entry:
{
  "kanji": "string (the word as written, may include kana)",
  "kana": "string (full kana reading)",
  "romaji": "string",
  "english": "string",
  "jlpt": number,
  "onyomi": "string (katakana, or empty for kana-only words)",
  "kunyomi": "string (hiragana with dot-separated okurigana, or empty)",
  "components": [
    { "char": "string", "role": "semantic|phonetic|both|word-component", "meaning": "string", "note": "string" }
  ],
  "radical": "string (Kangxi radical, or empty for kana-only)",
  "strokeCount": number,
  "etymology": "string (2–4 sentences, factual)",
  "examples": [
    { "ja": "string", "furigana": "string", "romaji": "string", "en": "string", "level": 1 or 2 }
  ],
  "sameRadical": ["string", ...]
}

Items to enrich:
${items}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateEntry(entry) {
  const warnings = [];

  // Basic schema
  if (!entry.kanji) warnings.push('missing kanji');
  if (!entry.kana) warnings.push('missing kana');
  if (!entry.etymology) warnings.push('missing etymology');
  if (!entry.examples || entry.examples.length < 2) {
    warnings.push(`only ${entry.examples?.length || 0} examples (want 2+)`);
  }

  const hasKanji = containsKanji(entry.kanji);

  if (hasKanji) {
    // Kanji entries should have readings and components
    if (!entry.onyomi && !entry.kunyomi) warnings.push('kanji entry missing both onyomi and kunyomi');
    if (!entry.components || entry.components.length === 0) warnings.push('kanji entry has empty components');
    if (!entry.radical) warnings.push('kanji entry missing radical');
    if (typeof entry.strokeCount !== 'number' || entry.strokeCount < 1) {
      warnings.push(`suspicious strokeCount: ${entry.strokeCount}`);
    }

    // Check that on'yomi is in katakana (if present)
    if (entry.onyomi && !/^[\u30A0-\u30FF\s\/・.]+$/.test(entry.onyomi.replace(/ \/ /g, ''))) {
      warnings.push(`onyomi "${entry.onyomi}" may not be in katakana`);
    }

    // Check that kun'yomi is in hiragana (if present)
    if (entry.kunyomi && !/^[\u3040-\u309F\s\/・.]+$/.test(entry.kunyomi.replace(/ \/ /g, ''))) {
      warnings.push(`kunyomi "${entry.kunyomi}" may not be in hiragana`);
    }
  } else {
    // Kana-only entries should NOT have components
    if (entry.components && entry.components.length > 0) {
      warnings.push('kana-only word should have empty components');
    }
  }

  // Check examples have furigana
  if (entry.examples) {
    for (let i = 0; i < entry.examples.length; i++) {
      const ex = entry.examples[i];
      if (!ex.ja) warnings.push(`example ${i + 1}: missing ja`);
      if (!ex.furigana) warnings.push(`example ${i + 1}: missing furigana`);
      if (!ex.en) warnings.push(`example ${i + 1}: missing en`);
    }
  }

  return warnings;
}

function runValidation(output) {
  console.log('\n── Validation Report ──────────────────────');
  let totalWarnings = 0;

  for (const [key, entry] of Object.entries(output)) {
    const warnings = validateEntry(entry);
    if (warnings.length > 0) {
      console.log(`\n  ${key} (${entry.kana || '?'}):`);
      for (const w of warnings) {
        console.log(`    - ${w}`);
      }
      totalWarnings += warnings.length;
    }
  }

  if (totalWarnings === 0) {
    console.log('  ✅ No issues found.');
  } else {
    console.log(`\n  ⚠ ${totalWarnings} warning(s) across ${Object.keys(output).length} entries.`);
    console.log('  Use --force <kanji> to re-enrich specific entries.');
  }
  console.log('──────────────────────────────────────────\n');
  return totalWarnings;
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
    throw new Error(`JSON parse failed for batch starting with "${batch[0].kanji}":\n${cleaned.slice(0, 300)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array, got ${typeof parsed} for batch starting with "${batch[0].kanji}"`);
  }

  // Validate each entry immediately
  for (const entry of parsed) {
    const warnings = validateEntry(entry);
    if (warnings.length > 0) {
      console.warn(`\n    ⚠ ${entry.kanji}: ${warnings.join('; ')}`);
    }
  }

  return parsed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes('--validate-only');
  const forceIdx = args.indexOf('--force');
  const forceKanji = forceIdx !== -1 ? args[forceIdx + 1] : null;
  const levelIdx = args.indexOf('--level');
  const filterLevel = levelIdx !== -1 ? parseInt(args[levelIdx + 1]) : null;

  if (validateOnly) {
    const output = loadOutput();
    console.log(`Loaded ${Object.keys(output).length} entries from ${OUTPUT_FILE}`);
    runValidation(output);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌  ANTHROPIC_API_KEY environment variable not set.');
    console.error('    Run: export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌  Input file not found: ${INPUT_FILE}`);
    console.error('');
    console.error('You need to create jlpt-input.json first. Expected format:');
    console.error('[');
    console.error('  { "kanji": "食べる", "kana": "たべる", "romaji": "taberu", "english": "to eat", "jlpt": 5 },');
    console.error('  { "kanji": "日", "kana": "にち", "romaji": "nichi", "english": "day / sun", "jlpt": 5 },');
    console.error('  { "kanji": "でも", "kana": "でも", "romaji": "demo", "english": "but", "jlpt": 5 }');
    console.error(']');
    process.exit(1);
  }

  let input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

  // Optional level filter
  if (filterLevel) {
    input = input.filter(c => c.jlpt === filterLevel);
    console.log(`Filtering to JLPT N${filterLevel} only.`);
  }

  const output = loadOutput();

  // If --force is specified, delete that entry so it gets re-processed
  if (forceKanji) {
    if (output[forceKanji]) {
      delete output[forceKanji];
      saveOutput(output);
      console.log(`🔄  Cleared "${forceKanji}" — will re-enrich.`);
    } else {
      console.log(`ℹ  "${forceKanji}" not in output file — will be processed normally.`);
    }
  }

  const todo = input.filter(c => !output[c.kanji]);
  const done = input.length - todo.length;

  const kanaOnlyCount = todo.filter(isKanaOnly).length;
  const kanjiCount = todo.length - kanaOnlyCount;

  console.log(`\n漢字 Data Pipeline (Japanese)`);
  console.log(`──────────────────────────────`);
  console.log(`Total entries : ${input.length}`);
  console.log(`Already done  : ${done}`);
  console.log(`To process    : ${todo.length} (${kanjiCount} kanji, ${kanaOnlyCount} kana-only)`);
  console.log(`Batch size    : ${BATCH_SIZE}`);
  console.log(`Batches needed: ${Math.ceil(todo.length / BATCH_SIZE)}`);
  console.log(`──────────────────────────────\n`);

  if (todo.length === 0) {
    console.log('✅  All entries already enriched.');
    runValidation(output);
    return;
  }

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(todo.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.map(c => c.kanji).join(' ')}) ... `);

    try {
      const enriched = await enrichBatch(batch, apiKey);

      // Merge results — key by kanji field
      for (const entry of enriched) {
        if (entry && entry.kanji) {
          output[entry.kanji] = entry;
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
  }

  // Always run validation at the end
  runValidation(output);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
