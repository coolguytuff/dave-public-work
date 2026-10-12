#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function canonicalPath(value) {
  const resolved = path.resolve(value);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}

function inspectRepository(cwd) {
  const root = realpathSync(git(cwd, 'rev-parse', '--show-toplevel'));
  const branch = git(root, 'branch', '--show-current') || '(detached HEAD)';
  const remotes = git(root, 'remote').split('\n').filter(Boolean);
  return { root, branch, remotes };
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg !== '--expected-worktree' && arg !== '--expected-branch') {
      throw new Error(`Unknown option: ${arg}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--expected-worktree') options.expectedWorktree = value;
    else options.expectedBranch = value;
    index += 1;
  }
  return options;
}

function usage() {
  return [
    'Usage: node scripts/check-dave-worktree.mjs [--expected-worktree PATH] [--expected-branch BRANCH]',
    'Reports the Git root, branch, and remotes for the current directory.',
  ].join('\n');
}

function main(args = process.argv.slice(2), cwd = process.cwd()) {
  let options;
  try {
    options = parseArgs(args);
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    return 2;
  }
  if (options.help) {
    console.log(usage());
    return 0;
  }

  let repository;
  try {
    repository = inspectRepository(cwd);
  } catch (error) {
    console.error(`Unable to inspect Git repository from ${cwd}: ${error.message}`);
    return 2;
  }

  console.log(`Git root: ${repository.root}`);
  console.log(`Branch: ${repository.branch}`);
  console.log('Remotes:');
  if (repository.remotes.length === 0) console.log('  (none configured)');
  // Never print configured remote URLs: they can embed credentials,
  // access tokens in query strings, or private repository paths.
  for (const remote of repository.remotes) console.log(`  ${remote}: [URL hidden]`);

  const mismatches = [];
  if (options.expectedWorktree && canonicalPath(options.expectedWorktree) !== repository.root) {
    mismatches.push(`Expected worktree ${canonicalPath(options.expectedWorktree)} does not match Git root ${repository.root}`);
  }
  if (options.expectedBranch && options.expectedBranch !== repository.branch) {
    mismatches.push(`Expected branch ${options.expectedBranch} does not match current branch ${repository.branch}`);
  }
  for (const mismatch of mismatches) console.error(`Mismatch: ${mismatch}`);
  if (mismatches.length > 0) return 1;
  console.log('Worktree check: PASS');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main();
}
