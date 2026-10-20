#!/bin/bash
# orca-once.sh - Run a single Orca iteration (for testing)
# Usage: ./orca-once.sh <prd-file> [prompt-file]
# Run this INSIDE the container, in /workspace

PRD_FILE="${1:-}"
PROMPT_FILE="${2:-ORCA_PROMPT.md}"

# PRD file is required
if [ -z "$PRD_FILE" ]; then
    echo "❌ Error: PRD file required"
    echo "Usage: ./orca-once.sh <prd-file> [prompt-file]"
    echo "Example: ./orca-once.sh prds/001_test_infrastructure.json"
    exit 1
fi

if [ ! -f "$PRD_FILE" ]; then
    echo "❌ Error: PRD file '$PRD_FILE' not found"
    echo "Available PRDs:"
    ls -1 prds/*.json 2>/dev/null | grep -v TEMPLATE || echo "  (none)"
    exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
    echo "❌ Error: $PROMPT_FILE not found"
    exit 1
fi

echo "🔂 Running single Orca iteration"
echo "📋 Prompt: $PROMPT_FILE"
echo "📝 PRD: $PRD_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Use -p flag for non-interactive mode
claude -p "Read $PROMPT_FILE for instructions. The PRD file is: $PRD_FILE" --dangerously-skip-permissions

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Single iteration complete"
echo "Check git log and $PRD_FILE to see what happened"