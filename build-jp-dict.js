#!/usr/bin/env node
/**
 * build-jp-dict.js
 * Builds data/jp-dict.json — a compact Japanese dictionary keyed by kanji.
 *
 * Sources (in priority order):
 *   1. data/jlpt-enriched.json  — full enriched data (richer definitions + kana)
 *   2. data/jlpt-input.json     — base vocab list (all 486 N5 entries)
 *
 * Output format (parallel to data/cedict.json):
 *   {
 *     "医者": { "kana": "いしゃ", "defs": ["doctor", "physician"], "jlpt": 5 },
 *     "食べる": { "kana": "たべる", "defs": ["to eat"], "jlpt": 5 }
 *   }
 *
 * Usage:
 *   node build-jp-dict.js
 *
 * To extend with full JMdict coverage in the future, replace the input sources
 * with a JMdict JSON extract (e.g. from https://github.com/scriptin/jmdict-simplified).
 */

const fs   = require('fs');
const path = require('path');

const INPUT_FILE    = path.join(__dirname, 'data', 'jlpt-input.json');
const ENRICHED_FILE = path.join(__dirname, 'data', 'jlpt-enriched.json');
const OUTPUT_FILE   = path.join(__dirname, 'data', 'jp-dict.json');

// ── Load sources ──────────────────────────────────────────────────────────────

if (!fs.existsSync(INPUT_FILE)) {
  console.error('Missing data/jlpt-input.json — run generate-jlpt-vocab.js first.');
  process.exit(1);
}

const input   = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
const enriched = fs.existsSync(ENRICHED_FILE)
  ? JSON.parse(fs.readFileSync(ENRICHED_FILE, 'utf8'))
  : {};

// ── Build dictionary ──────────────────────────────────────────────────────────

const dict = {};

for (const entry of input) {
  const key  = entry.kanji;
  const rich = enriched[key];

  // Split english into individual definitions
  const defs = (entry.english || '')
    .split(/\s*\/\s*/)
    .map(s => s.trim())
    .filter(Boolean);

  dict[key] = {
    kana:  rich ? rich.kana  : (entry.kana  || ''),
    defs:  defs,
    jlpt:  entry.jlpt,
  };

  // Include romaji if different from kana
  if (entry.romaji) dict[key].romaji = entry.romaji;
}

// ── Write output ──────────────────────────────────────────────────────────────

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dict), 'utf8');

const total = Object.keys(dict).length;
const withEnriched = Object.keys(dict).filter(k => enriched[k]).length;
console.log(`Wrote ${total} entries to data/jp-dict.json`);
console.log(`  ${withEnriched} have enriched data, ${total - withEnriched} use base vocab only`);
