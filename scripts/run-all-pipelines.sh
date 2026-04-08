#!/bin/bash
# run-all-pipelines.sh
# Runs all data enrichment pipelines sequentially.
# Designed to be left running overnight via nohup.
#
# Usage:
#   export ANTHROPIC_API_KEY=sk-ant-...
#   nohup bash scripts/run-all-pipelines.sh > /tmp/pipeline-all.log 2>&1 &
#   disown
#
# Monitor: tail -f /tmp/pipeline-all.log
# Each step is crash-safe and re-runnable.

set -e

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ ANTHROPIC_API_KEY not set"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "═══════════════════════════════════════════"
echo "  汉字学习 — Full Data Pipeline"
echo "  $(date)"
echo "═══════════════════════════════════════════"

# ── Step 1: HSK Enrichment (HSK 1-6) ──
echo ""
echo "━━━ Step 1/4: HSK Enrichment ━━━"
echo "  Input: data/hsk-input.json (5286 entries)"
echo "  Output: data/hsk-enriched.json"
echo ""
node scripts/build-data.js

# ── Step 2: JLPT Base Vocab Generation (N4-N1) ──
echo ""
echo "━━━ Step 2/4: JLPT Vocab Generation (N4→N1) ━━━"
echo "  Output: data/jlptN4.json .. jlptN1.json + jlpt-input.json"
echo ""
node scripts/generate-jlpt-vocab.js 5 4 3 2 1

# ── Step 3: JLPT Enrichment ──
echo ""
echo "━━━ Step 3/4: JLPT Enrichment ━━━"
echo "  Input: data/jlpt-input.json"
echo "  Output: data/jlpt-enriched.json"
echo ""
node scripts/build-data-jp.js

# ── Step 4: Build JP Dictionary ──
echo ""
echo "━━━ Step 4/4: Build JP Dictionary ━━━"
echo "  Output: data/jp-dict.json"
echo ""
node scripts/build-jp-dict.js

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ All pipelines complete — $(date)"
echo "═══════════════════════════════════════════"

# Summary
echo ""
echo "Final counts:"
node -e "
const fs = require('fs');
const hsk = JSON.parse(fs.readFileSync('data/hsk-enriched.json'));
const jlpt = JSON.parse(fs.readFileSync('data/jlpt-enriched.json'));
const input = JSON.parse(fs.readFileSync('data/jlpt-input.json'));
console.log('  HSK enriched:  ' + Object.keys(hsk).length);
console.log('  JLPT input:    ' + input.length);
console.log('  JLPT enriched: ' + Object.keys(jlpt).length);
"
