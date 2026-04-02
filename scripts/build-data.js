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
 * Options:
 *   --validate-only   Skip API calls, just validate existing output file
 *   --force <hanzi>   Re-enrich a specific entry even if it already exists
 *
 * Re-run safe: already-enriched entries are skipped automatically.
 * If the script is interrupted, just re-run — it picks up where it left off.
 */

const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const INPUT_FILE  = path.join(__dirname, '..', 'data', 'hsk-input.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'hsk-enriched.json');
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

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(batch) {
  const items = batch.map(c =>
    `- hanzi: "${c.hanzi}", pinyin: "${c.pinyin}", english: "${c.english}", hsk: ${c.hsk}`
  ).join('\n');

  return `You are a Chinese language data expert specialising in simplified Chinese (简体字).

CRITICAL: All characters below are SIMPLIFIED CHINESE. You must:
- Decompose only the components visible in the SIMPLIFIED form of each character.
- Do NOT describe components from the traditional (繁体字) form that were removed or replaced during simplification.
- For example: 爱 (simplified) should NOT list 心 as a component — 心 was present in the traditional 愛 but is absent from the simplified form. The bottom of simplified 爱 is 友, not 心+夊.
- Similarly: 车 is a single-component simplification (not 車's components), 学 does not contain 臼, 书 does not contain the traditional 書's inner structure, etc.
- When in doubt about a simplified character's structure, describe what is visually present in the simplified glyph as written today — not its historical or traditional composition.

Additional rules:
- Multi-character words (e.g. 你好, 电话) are treated as a single unit. Do NOT decompose them into individual characters for the components field — instead describe the word-level composition and meaning as a whole.
- Single characters get full component decomposition (radical + other components).
- Radical: use the standard radical under which the SIMPLIFIED character is indexed in modern dictionaries (e.g. 新华字典). This may differ from the traditional radical.
- Stroke count: count strokes in the SIMPLIFIED form. For multi-character words, give total stroke count across all characters combined.
- Etymology should be factual and concise (2–4 sentences). You may reference the traditional form's history, but clearly distinguish it from the simplified form. For example: "The traditional form 愛 included 心 (heart) in the middle, but the simplified 爱 replaced the lower portion with 友 (friend)."
- Example sentences must be natural, graded (level 1 = very simple, level 2 = slightly more complex), and accurate. Use simplified characters throughout.
- sameRadical: list up to 6 other common simplified characters sharing the same primary radical. Empty array [] for multi-char words.
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
  "radical": "string (primary radical in simplified form)",
  "strokeCount": number,
  "etymology": "string (2–4 sentences, factual, distinguish simplified vs traditional where relevant)",
  "examples": [
    { "zh": "string", "pinyin": "string", "en": "string", "level": 1 or 2 }
  ],
  "sameRadical": ["string", ...]
}

Items to enrich:
${items}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

// Characters whose simplified form lost components present in traditional.
// If these traditional-only components appear in the output, it's a red flag.
const TRADITIONAL_TRAPS = {
  '爱': { bad: ['心', '夊'], note: 'simplified 爱 has 友 at bottom, not 心+夊 (traditional 愛)' },
  '车': { bad: ['車'],       note: 'simplified 车 is a single unit, not decomposed like 車' },
  '学': { bad: ['臼'],       note: 'simplified 学 does not contain 臼 (traditional 學 does)' },
  '书': { bad: ['聿'],       note: 'simplified 书 is compact, not like traditional 書' },
  '东': { bad: ['束'],       note: 'simplified 东 is not 東' },
  '马': { bad: ['馬'],       note: 'simplified 马 is a single unit' },
  '鱼': { bad: ['魚'],       note: 'simplified 鱼 — do not use traditional 魚 components' },
  '鸟': { bad: ['鳥'],       note: 'simplified 鸟 — do not use traditional 鳥 components' },
  '长': { bad: ['镸'],       note: 'simplified 长 is compact' },
  '门': { bad: ['門'],       note: 'simplified 门 is a single unit' },
  '见': { bad: ['見'],       note: 'simplified 见' },
  '贝': { bad: ['貝'],       note: 'simplified 贝' },
  '开': { bad: ['開'],       note: 'simplified 开' },
  '关': { bad: ['關'],       note: 'simplified 关' },
};

function validateEntry(entry) {
  const warnings = [];

  // Basic schema checks
  if (!entry.hanzi) warnings.push('missing hanzi');
  if (!entry.pinyin) warnings.push('missing pinyin');
  if (!entry.components || !Array.isArray(entry.components)) warnings.push('missing or invalid components');
  if (typeof entry.strokeCount !== 'number' || entry.strokeCount < 1) warnings.push(`suspicious strokeCount: ${entry.strokeCount}`);
  if (!entry.etymology) warnings.push('missing etymology');
  if (!entry.examples || entry.examples.length < 2) warnings.push(`only ${entry.examples?.length || 0} examples (want 2+)`);

  // Traditional component trap detection
  const hanzi = entry.hanzi;
  if (TRADITIONAL_TRAPS[hanzi] && entry.components) {
    const trap = TRADITIONAL_TRAPS[hanzi];
    for (const comp of entry.components) {
      if (trap.bad.includes(comp.char)) {
        warnings.push(`⚠ TRADITIONAL LEAK: component "${comp.char}" — ${trap.note}`);
      }
    }
  }

  // Check etymology for traditional form descriptions applied to simplified
  if (entry.etymology && entry.hanzi.length === 1) {
    // Flag if etymology mentions components not in the components list
    // (rough heuristic — catches obvious cases)
    const compChars = (entry.components || []).map(c => c.char);
    if (TRADITIONAL_TRAPS[hanzi]) {
      for (const bad of TRADITIONAL_TRAPS[hanzi].bad) {
        if (entry.etymology.includes(bad) && !entry.etymology.includes('traditional') && !entry.etymology.includes('繁体')) {
          warnings.push(`⚠ Etymology mentions "${bad}" without noting it's from the traditional form`);
        }
      }
    }
  }

  return warnings;
}

function runValidation(output) {
  console.log('\n── Validation Report ──────────────────────');
  let totalWarnings = 0;

  for (const [hanzi, entry] of Object.entries(output)) {
    const warnings = validateEntry(entry);
    if (warnings.length > 0) {
      console.log(`\n  ${hanzi} (${entry.pinyin || '?'}):`);
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
    console.log('  Use --force <hanzi> to re-enrich specific entries.');
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
    throw new Error(`JSON parse failed for batch starting with "${batch[0].hanzi}":\n${cleaned.slice(0, 300)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array, got ${typeof parsed} for batch starting with "${batch[0].hanzi}"`);
  }

  // Validate each entry immediately
  for (const entry of parsed) {
    const warnings = validateEntry(entry);
    if (warnings.length > 0) {
      console.warn(`\n    ⚠ ${entry.hanzi}: ${warnings.join('; ')}`);
    }
  }

  return parsed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes('--validate-only');
  const forceIdx = args.indexOf('--force');
  const forceHanzi = forceIdx !== -1 ? args[forceIdx + 1] : null;

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
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const output = loadOutput();

  // If --force is specified, delete that entry so it gets re-processed
  if (forceHanzi) {
    if (output[forceHanzi]) {
      delete output[forceHanzi];
      saveOutput(output);
      console.log(`🔄  Cleared "${forceHanzi}" — will re-enrich.`);
    } else {
      console.log(`ℹ  "${forceHanzi}" not in output file — will be processed normally.`);
    }
  }

  const todo = input.filter(c => !output[c.hanzi]);
  const done = input.length - todo.length;

  console.log(`\n汉字 Data Pipeline (simplified Chinese)`);
  console.log(`──────────────────────────────`);
  console.log(`Total entries : ${input.length}`);
  console.log(`Already done  : ${done}`);
  console.log(`To process    : ${todo.length}`);
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
