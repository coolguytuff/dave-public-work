# Dave Public Work — Worktree Guard

A small, standalone developer utility made during development of **Dave V4**, a local-first macOS AI assistant.

**This is an independently runnable developer utility, NOT the full Dave V4 assistant.** The private assistant and its security/integration work remain in development.

## What it does

- Shows the canonical Git worktree root, current branch, and configured remote *names*. Remote URLs are intentionally hidden, even if they contain credentials or private repository paths.
- Validates an expected worktree and branch; returns a nonzero status if either doesn't match.
- Never prints remote URLs, which may contain sensitive query tokens, usernames, or private repository names.
- Runs locally with Node.js built-in modules and Git; no external services or AI providers.

## Requirements

Node.js 20+ and Git.

## Quick demo (downloadable ZIP)

Download and extract the ZIP from the [latest GitHub release](https://github.com/coolguytuff/dave-public-work/releases/tag/v0.1.0). Then open a terminal in the extracted folder and run:

    npm test
    node scripts/check-dave-worktree.mjs --help

To see actual Git checks without touching your own repositories, turn that extracted demo folder into a disposable Git repository:

    git init --quiet --initial-branch=demo
    node scripts/check-dave-worktree.mjs --expected-branch demo

This creates only a local `.git` directory inside the demo folder; nothing is pushed or downloaded. You can delete the extracted folder when done.

## Use on an existing Git repository

If you cloned this repository with Git, run this from the clone:

    node scripts/check-dave-worktree.mjs

If you downloaded the ZIP instead, run the script via its absolute path while your terminal is in the Git repository you want to inspect.

Check your active repository and branch:

    node scripts/check-dave-worktree.mjs --expected-worktree "$(git rev-parse --show-toplevel)" --expected-branch "$(git branch --show-current)"

Test a mismatch (exit code 1 expected):

    node scripts/check-dave-worktree.mjs --expected-branch intentionally-wrong

An invalid option or use outside a Git repository returns exit code 2.

## Tests

    npm test

Tests create disposable Git repositories under the system temporary directory using fake .invalid remote URLs, then clean them up. The tests also exercise privacy-safe remote output, detached HEAD, argument errors, and non-Git directories.

## Scope

This is a small, working piece of Dave V4's October 2026 development extracted for public demonstration, not a claim that the full assistant has shipped. The full private repo, review materials, credentials, and incomplete code are excluded. The tool runs on your local Git working directory and does not connect to remotes. Its output intentionally includes your local path and branch name; inspect or redact those before sharing logs or screenshots publicly.

**AI assistance disclosure:** This tool was implemented with Codex assistance during ongoing Dave development and validated using automated tests. It is not intended to represent the full scope of work completed on Dave during the week.

Source code is provided for review and testing; a permissive reuse license is not implied by publication.
