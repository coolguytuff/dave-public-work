import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./check-dave-worktree.mjs', import.meta.url));

function fixture(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'dave-worktree-check-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', '--initial-branch=fixture-branch', directory]);
  execFileSync('git', ['remote', 'add', 'origin', 'https://fixture:secret@example.invalid/example-project.git'], { cwd: directory });
  execFileSync('git', ['remote', 'add', 'backup', 'ssh://fixture:secret@example.invalid/example-backup.git'], { cwd: directory });
  mkdirSync(path.join(directory, 'nested'));
  return directory;
}

function run(cwd, ...args) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}

test('reports Git root, branch, and remote and accepts matching expectations', (t) => {
  const repository = fixture(t);
  const result = run(path.join(repository, 'nested'), '--expected-worktree', repository, '--expected-branch', 'fixture-branch');

  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`Git root: ${realpathSync(repository)}`));
  assert.match(result.stdout, /Branch: fixture-branch/);
  assert.match(result.stdout, /origin: \[URL hidden\]/);
  assert.match(result.stdout, /backup: \[URL hidden\]/);
  assert.doesNotMatch(result.stdout, /secret|example\.invalid|example-project|example-backup/);
  assert.match(result.stdout, /Worktree check: PASS/);
});

test('returns nonzero and explains mismatched worktree and branch', (t) => {
  const repository = fixture(t);
  const result = run(repository, '--expected-worktree', path.join(repository, 'wrong'), '--expected-branch', 'wrong-branch');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Expected worktree .* does not match Git root/);
  assert.match(result.stderr, /Expected branch wrong-branch does not match current branch fixture-branch/);
});


test('never exposes remote credentials, query tokens, or private URL paths', (t) => {
  const repository = fixture(t);
  execFileSync('git', ['remote', 'set-url', 'origin', 'https://private-user:CANARY-PASSWORD@example.invalid/private/repo?token=CANARY-QUERY'], { cwd: repository });
  const result = run(repository);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /origin: \[URL hidden\]/);
  assert.doesNotMatch(result.stdout, /CANARY|private-user|example\.invalid|private\/repo/);
});

test('works without any configured remote', (t) => {
  const repository = fixture(t);
  execFileSync('git', ['remote', 'remove', 'origin'], { cwd: repository });
  execFileSync('git', ['remote', 'remove', 'backup'], { cwd: repository });
  const result = run(repository);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /none configured/);
});

test('reports detached HEAD accurately', (t) => {
  const repository = fixture(t);
  execFileSync('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--allow-empty', '-m', 'fixture'], { cwd: repository });
  execFileSync('git', ['checkout', '--detach', 'HEAD'], { cwd: repository, stdio: 'ignore' });
  const result = run(repository);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Branch: \(detached HEAD\)/);
});

test('shows usage on --help and rejects bad CLI arguments', (t) => {
  const repository = fixture(t);
  const help = run(repository, '--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  const invalid = run(repository, '--unknown-option');
  assert.equal(invalid.status, 2);
  const missing = run(repository, '--expected-branch');
  assert.equal(missing.status, 2);
});

test('fails safely when run outside a Git repository', (t) => {
  const repository = fixture(t);
  const directory = path.join(repository, 'nested');
  rmSync(path.join(repository, '.git'), { recursive: true, force: true });
  const result = run(directory);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unable to inspect Git repository/);
});
