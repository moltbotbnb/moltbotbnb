---
name: cralph
description: Run cralph (Claude in a loop) for autonomous coding tasks. Use when the user wants to run multi-step coding tasks, generate TODOs from task descriptions, or let Claude iterate until completion. Triggers on mentions of cralph, ralph loops, or "let it cook" style autonomous coding.
---

# cralph

Claude in a loop. Give it a TODO, let it cook.

## Requirements

- [Bun](https://bun.sh) - `curl -fsSL https://bun.sh/install | bash`
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) - must be authenticated
- Install: `bun add -g cralph`

## Quick Start

```bash
# First run in a directory (creates .ralph/ structure)
cralph

# Subsequent runs
cralph
```

## Directory Structure

```
.ralph/
├── refs/         # read-only reference material
├── TODO.md       # task tracking (generated or manual)
├── paths.json    # config (refs paths, output path)
└── ralph.log     # session log
```

## Main Menu Options

1. **Run** — validates config, starts the loop, Claude completes ONE task per iteration
2. **Prepare TODO** — describe tasks in natural language, Claude generates structured TODO.md
3. **Edit** — re-select refs/output paths, save config

## CLI Flags

```bash
cralph                    # auto-detects .ralph/paths.json
cralph --refs ./source    # override refs path
cralph --output .         # override output path
cralph --yes              # auto-confirm (CI/automation)
```

## How It Works

1. Checks Claude CLI auth (cached 6 hours)
2. Looks for `.ralph/` in cwd
3. Runs `claude -p --dangerously-skip-permissions` in a loop
4. Claude completes ONE task per iteration, marks it done
5. Auto-commits after each iteration (if git repo)
6. Stops when Claude outputs `COMPLETE`

## TODO Format

```markdown
# Tasks

- [ ] Pending task
- [x] Completed task

---

# Notes

## Task 1 - Done
- What was implemented
- Files changed
- Learnings
```

## Tips

- Add reference material to `.ralph/refs/` before running
- Use `Prepare TODO` to generate structured tasks from natural descriptions
- Review output regularly — runs with `--dangerously-skip-permissions`
