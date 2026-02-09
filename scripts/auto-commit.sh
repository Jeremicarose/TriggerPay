#!/bin/bash

# Auto-commit and push script for TriggerPay
# Generates structured commit messages based on what actually changed.
#
# Message format: <type>(<scope>): <description>
#   type  = feat | fix | refactor | style | docs | chore | test
#   scope = contract | frontend | agent | api | config
#
# Examples:
#   feat(api): add mock flight status endpoint and admin override
#   fix(contract): correct typo in test helper method
#   style(frontend): update globals.css design tokens

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$REPO_ROOT/logs/auto-commit.log"
INTERVAL=60  # seconds

mkdir -p "$REPO_ROOT/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ---------------------------------------------------------------------------
# Determine the conventional-commit type (feat, fix, refactor, …)
# ---------------------------------------------------------------------------
detect_type() {
    local added="$1" modified="$2" deleted="$3"

    # If only deletions → chore
    if [[ -z "$added" && -z "$modified" && -n "$deleted" ]]; then
        echo "chore"; return
    fi

    # New files → feat
    if [[ -n "$added" ]]; then
        echo "feat"; return
    fi

    # Config / dependency changes → chore
    if echo "$modified" | grep -qE "(package\.json|Cargo\.toml|tsconfig|next\.config|\.env|\.gitignore)"; then
        echo "chore"; return
    fi

    # CSS-only → style
    if echo "$modified" | grep -qE "\.css$" && ! echo "$modified" | grep -qvE "\.css$"; then
        echo "style"; return
    fi

    # Test files → test
    if echo "$modified" | grep -qE "(test|spec)\.(ts|tsx|rs)$"; then
        echo "test"; return
    fi

    # Docs → docs
    if echo "$modified" | grep -qE "\.(md|txt)$" && ! echo "$modified" | grep -qvE "\.(md|txt)$"; then
        echo "docs"; return
    fi

    echo "feat"
}

# ---------------------------------------------------------------------------
# Determine the scope from file paths
# ---------------------------------------------------------------------------
detect_scope() {
    local all_files="$1"
    local has_contract=false has_frontend=false has_agent=false has_api=false
    local has_config=false has_scripts=false

    while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        case "$f" in
            contracts/*)               has_contract=true ;;
            frontend/src/app/api/*)    has_api=true ;;
            frontend/*)                has_frontend=true ;;
            agent/*)                   has_agent=true ;;
            scripts/*)                 has_scripts=true ;;
            *.toml|*.json|*.config.*|.env*|.gitignore)
                                       has_config=true ;;
        esac
    done <<< "$all_files"

    # Count how many scopes are touched
    local scopes=()
    $has_contract && scopes+=("contract")
    $has_api      && scopes+=("api")
    $has_frontend && scopes+=("frontend")
    $has_agent    && scopes+=("agent")
    $has_scripts  && scopes+=("scripts")
    $has_config   && scopes+=("config")

    if [[ ${#scopes[@]} -eq 0 ]]; then
        echo "project"
    elif [[ ${#scopes[@]} -eq 1 ]]; then
        echo "${scopes[0]}"
    else
        # Multiple scopes — join with comma
        local IFS=","
        echo "${scopes[*]}"
    fi
}

# ---------------------------------------------------------------------------
# Build a human-readable description of the changes
# ---------------------------------------------------------------------------
describe_changes() {
    local added="$1" modified="$2" deleted="$3"
    local all_files="$4"
    local desc=""

    # --- API routes ---
    if echo "$all_files" | grep -q "frontend/src/app/api/flight"; then
        desc="${desc:+$desc, }add mock flight status endpoint"
    fi
    if echo "$all_files" | grep -q "frontend/src/app/api/admin"; then
        desc="${desc:+$desc, }add admin status override endpoint"
    fi
    if echo "$all_files" | grep -q "frontend/src/lib/flightStore"; then
        desc="${desc:+$desc, }add in-memory flight store"
    fi

    # --- Smart contract ---
    if echo "$all_files" | grep -q "contracts/.*lib\.rs"; then
        if [[ -n "$added" ]] && echo "$added" | grep -q "lib\.rs"; then
            desc="${desc:+$desc, }add contract core"
        else
            # Try to figure out what changed from the diff
            local rs_diff=$(git diff --cached -- "contracts/" 2>/dev/null | grep "^[+-].*fn " | head -3 | sed 's/^[+-]\s*//' | tr '\n' ' ')
            if [[ -n "$rs_diff" ]]; then
                desc="${desc:+$desc, }update contract logic"
            else
                desc="${desc:+$desc, }update smart contract"
            fi
        fi
    fi
    if echo "$all_files" | grep -qE "contracts/.*(trigger|attestation|payout|views)\.rs"; then
        local modules=$(echo "$all_files" | grep -oE "(trigger|attestation|payout|views)\.rs" | sed 's/\.rs//' | sort -u | tr '\n' ',' | sed 's/,$//')
        desc="${desc:+$desc, }update $modules module(s)"
    fi

    # --- Frontend components ---
    local components=$(echo "$all_files" | grep -oE "frontend/src/components/[A-Za-z]+\.tsx" | xargs -I{} basename {} .tsx 2>/dev/null | sort -u | tr '\n' ',' | sed 's/,$//')
    if [[ -n "$components" ]]; then
        if echo "$added" | grep -q "frontend/src/components/"; then
            desc="${desc:+$desc, }add $components component(s)"
        else
            desc="${desc:+$desc, }update $components component(s)"
        fi
    fi

    # --- Frontend pages ---
    if echo "$all_files" | grep -q "frontend/src/app/page\.tsx"; then
        desc="${desc:+$desc, }update home page"
    fi
    if echo "$all_files" | grep -q "frontend/src/app/layout\.tsx"; then
        desc="${desc:+$desc, }update root layout"
    fi
    if echo "$all_files" | grep -qE "frontend/src/app/(create|dashboard)/"; then
        local pages=$(echo "$all_files" | grep -oE "(create|dashboard)" | sort -u | tr '\n' ',' | sed 's/,$//')
        desc="${desc:+$desc, }update $pages page(s)"
    fi

    # --- Lib / store / types ---
    if echo "$all_files" | grep -q "frontend/src/lib/near/contract\.ts"; then
        desc="${desc:+$desc, }update contract helpers"
    fi
    if echo "$all_files" | grep -q "frontend/src/lib/near/wallet\.ts"; then
        desc="${desc:+$desc, }update wallet integration"
    fi
    if echo "$all_files" | grep -q "frontend/src/lib/near/config\.ts"; then
        desc="${desc:+$desc, }update NEAR config"
    fi
    if echo "$all_files" | grep -q "frontend/src/store/"; then
        desc="${desc:+$desc, }update state store"
    fi
    if echo "$all_files" | grep -q "frontend/src/types/"; then
        desc="${desc:+$desc, }update type definitions"
    fi

    # --- Styling ---
    if echo "$all_files" | grep -q "globals\.css"; then
        desc="${desc:+$desc, }update global styles"
    fi

    # --- Agent ---
    if echo "$all_files" | grep -q "^agent/"; then
        if [[ -n "$added" ]] && echo "$added" | grep -q "^agent/"; then
            desc="${desc:+$desc, }add monitoring agent"
        else
            desc="${desc:+$desc, }update monitoring agent"
        fi
    fi

    # --- Dependencies ---
    if echo "$all_files" | grep -q "package\.json"; then
        desc="${desc:+$desc, }update dependencies"
    fi
    if echo "$all_files" | grep -q "Cargo\.toml"; then
        desc="${desc:+$desc, }update Rust dependencies"
    fi

    # --- Scripts ---
    if echo "$all_files" | grep -q "scripts/"; then
        desc="${desc:+$desc, }update build scripts"
    fi

    # --- Deletions ---
    if [[ -n "$deleted" ]]; then
        local del_count=$(echo "$deleted" | wc -l | xargs)
        desc="${desc:+$desc, }remove $del_count file(s)"
    fi

    # Fallback: generic description from file names
    if [[ -z "$desc" ]]; then
        local file_count=$(echo "$all_files" | wc -l | xargs)
        local first_file=$(echo "$all_files" | head -1 | xargs basename 2>/dev/null || echo "files")
        if [[ $file_count -eq 1 ]]; then
            desc="update $first_file"
        else
            desc="update $file_count files"
        fi
    fi

    echo "$desc"
}

# ---------------------------------------------------------------------------
# Main: generate full commit message
# ---------------------------------------------------------------------------
generate_commit_message() {
    local added=$(git diff --cached --name-only --diff-filter=A)
    local modified=$(git diff --cached --name-only --diff-filter=M)
    local deleted=$(git diff --cached --name-only --diff-filter=D)
    local all_files=$(git diff --cached --name-only)

    local type=$(detect_type "$added" "$modified" "$deleted")
    local scope=$(detect_scope "$all_files")
    local desc=$(describe_changes "$added" "$modified" "$deleted" "$all_files")

    echo "${type}(${scope}): ${desc}"
}

# ---------------------------------------------------------------------------
# Commit + push
# ---------------------------------------------------------------------------
do_commit() {
    cd "$REPO_ROOT" || { log "Failed to navigate to repo root"; return 1; }

    if [[ -z $(git status -s) ]]; then
        return 0
    fi

    log "Changes detected:"
    git status -s >> "$LOG_FILE"

    git add .

    local commit_msg=$(generate_commit_message)
    log "Commit: $commit_msg"

    git commit -m "$commit_msg"

    log "Pushing to origin/main..."
    if git push origin main 2>&1 | tee -a "$LOG_FILE"; then
        log "Pushed successfully."
    else
        log "Push failed."
        return 1
    fi
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
case "${1:-}" in
    --once)
        log "Running single commit check..."
        do_commit
        ;;
    --watch|"")
        log "Auto-commit started (interval: ${INTERVAL}s)"
        while true; do
            do_commit
            sleep $INTERVAL
        done
        ;;
    --help)
        echo "Usage: $0 [--once|--watch|--help]"
        echo "  --once   Run once and exit"
        echo "  --watch  Run continuously (default)"
        echo "  --help   Show this help"
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage"
        exit 1
        ;;
esac
