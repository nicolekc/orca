#!/bin/bash
# orca-loop.sh - Run Orca in a loop until done
# Usage: ./orca-loop.sh <prd-file> [max-iterations] [prompt-file]
# Run this INSIDE the container, in /workspace
#
# Note: Output is buffered (appears after each iteration completes).
# To watch live, open another terminal and run: tail -f orca-logs/*.log

PRD_FILE="${1:-}"
MAX_ITERATIONS="${2:-20}"
PROMPT_FILE="${3:-ORCA_PROMPT.md}"

# PRD file is required
if [ -z "$PRD_FILE" ]; then
    echo "❌ Error: PRD file required"
    echo "Usage: ./orca-loop.sh <prd-file> [max-iterations] [prompt-file]"
    echo "Example: ./orca-loop.sh prds/001_test_infrastructure.json 20"
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

# Create logs directory
mkdir -p orca-logs

# Get PRD name for log prefix (e.g., "001_test_infrastructure" from path)
PRD_NAME=$(basename "$PRD_FILE" .json)
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

echo "🔄 Orca Loop Starting"
echo "📋 Prompt: $PROMPT_FILE"
echo "📝 PRD: $PRD_FILE"
echo "🔢 Max iterations: $MAX_ITERATIONS"
echo "📂 Logs: orca-logs/${PRD_NAME}_${TIMESTAMP}_*.log"
echo ""
echo "💡 To watch live output, open another terminal and run:"
echo "   tail -f orca-logs/${PRD_NAME}_${TIMESTAMP}_*.log"
echo ""
echo "⏹️  Ctrl+C to stop, or wait for COMPLETE signal"
echo ""

ITERATION=0
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    LOG_FILE="orca-logs/${PRD_NAME}_${TIMESTAMP}_$(printf '%03d' $ITERATION).log"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔁 Iteration $ITERATION of $MAX_ITERATIONS"
    echo "📄 Log: $LOG_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Log header
    {
        echo "=== Orca Iteration $ITERATION ==="
        echo "PRD: $PRD_FILE"
        echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=================================="
        echo ""
    } > "$LOG_FILE"
    
    # Run claude in print mode (buffered output)
    OUTPUT=$(claude -p "Read $PROMPT_FILE for instructions. The PRD file is: $PRD_FILE" --dangerously-skip-permissions 2>&1)
    
    # Display and log
    echo "$OUTPUT"
    echo "$OUTPUT" >> "$LOG_FILE"
    
    # Log footer
    {
        echo ""
        echo "=================================="
        echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')"
    } >> "$LOG_FILE"
    
    # Check for completion signal
    if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
        echo ""
        echo "🎉 Orca signaled COMPLETE after $ITERATION iterations"
        echo "📂 Logs saved to: orca-logs/${PRD_NAME}_${TIMESTAMP}_*.log"
        exit 0
    fi
    
    # Brief pause between iterations
    sleep 2
done

echo ""
echo "⚠️  Hit max iterations ($MAX_ITERATIONS) without COMPLETE signal"
echo "Check $PRD_FILE to see what's left"
echo "📂 Logs saved to: orca-logs/${PRD_NAME}_${TIMESTAMP}_*.log"