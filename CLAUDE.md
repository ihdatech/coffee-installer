# coffee-installer — Development Standards

This file is the authoritative reference for contributing to `coffee-installer`.
All development, code review, and automation must follow the rules below.

---

## Tech Stack

| Concern         | Choice                                          |
|-----------------|-------------------------------------------------|
| Runtime         | Node.js ≥ 18 (LTS)                             |
| Module system   | ES Modules (`"type": "module"` in package.json) |
| Dependencies    | **Zero** — Node.js stdlib only                  |
| Test runner     | `node:test` + `node:assert` (built-in)          |
| Package manager | npm ≥ 9                                         |
| Registry        | npmjs.com (public)                              |

**Never add runtime dependencies.** If a feature cannot be built with Node.js stdlib, reconsider the feature scope.

---

## npm Package Conventions

This project is a published npm package. All decisions follow npm package best practices.

### Canonical `package.json` field order

```jsonc
{
  "name": "",           // kebab-case, unique on npmjs.com
  "version": "",        // semver — bumped only via `npm version`
  "description": "",    // one sentence, shown in npm search results
  "keywords": [],       // lowercase, help discoverability on npmjs.com
  "homepage": "",       // GitHub repo #readme
  "bugs": { "url": "" },
  "license": "",        // SPDX identifier
  "author": "",
  "repository": { "type": "git", "url": "" },
  "type": "module",
  "engines": { "node": ">=18" },
  "bin": {},            // CLI entry points
  "exports": {},        // programmatic API entry points
  "files": [],          // allowlist of what gets published — always set explicitly
  "scripts": {}         // lifecycle hooks and dev commands
}
```

### `files` field — published surface

Only files listed in `files` are uploaded to the npm registry. Always keep this minimal.

```json
"files": [
  "index.js",
  "core.js",
  "README.md",
  "LICENSE",
  "docs/setup-guide.md"
]
```

Never publish: `CLAUDE.md`, `CHANGELOG.md`, `test/`, `.gitignore`, `.npmrc`.

### `exports` field — programmatic API

```json
"exports": {
  ".": "./core.js"
}
```

Do not export `index.js` — it is the CLI entry point and contains `process.exit()` calls.

### `bin` field — CLI entry points

```json
"bin": {
  "coffee-installer": "index.js",
  "coffee": "index.js"
}
```

Both commands point to the same entry. `index.js` must have `#!/usr/bin/env node` as its first line and be executable (`chmod +x`).

### npm scripts

| Script           | Command                   | Purpose                                           |
|------------------|---------------------------|---------------------------------------------------|
| `test`           | `node --test`             | Run test suite                                    |
| `prepublishOnly` | `npm test`                | Block publish if tests fail                       |
| `version`        | `node scripts/version.js` | Auto-update CHANGELOG on `npm version` (future)   |

Lifecycle order on `npm publish`: `prepublishOnly` → pack → upload.

### Verify before publish

Before every release, run `npm pack --dry-run` to confirm that only the intended files are included.

---

## Architecture

This package follows the **dual-entry npm pattern**: a CLI entry (`bin`) and a library entry (`exports`) from the same source, with no build step.

### File layout

```
coffee-installer/
├── index.js              # CLI entry point (bin) — routes commands, calls process.exit()
├── core.js               # Library entry point (exports) — all business logic as named exports
├── test/                 # Test suites (excluded from npm publish via `files`)
│   └── core.test.js      # (planned — not yet created)
├── docs/                 # User-facing docs — published to npm
│   └── setup-guide.md
├── .gitignore
├── CHANGELOG.md          # Keep-a-Changelog format (not published)
├── CLAUDE.md             # Dev standards — this file (not published)
├── LICENSE               # Published
├── README.md             # Package documentation — published
└── package.json
```

### Layer rules

| Layer   | File       | `package.json` field | May call `process.exit`? |
|---------|------------|----------------------|--------------------------|
| CLI     | `index.js` | `bin`                | Yes — only place allowed |
| Library | `core.js`  | `exports["."]`       | Never                    |

### Rules

- `index.js` only routes CLI commands and calls `process.exit()`. Zero business logic.
- `core.js` holds all logic. Every public function is a named export.
- Module-level side effects in `core.js` are limited to config loading and `BASE_SOURCE` resolution.
- `docs/` contains only user-facing documentation. No internal design docs.
- No `src/`, `lib/`, or `dist/` directories — no build step, source files live at the root.
- Test files live in `test/` and are excluded from the published package via `files`.

---

## Development Workflow

Every change follows this sequence — no skipping steps:

```
Issue → Branch → Commit(s) → PR (Draft → Ready) → Review → Merge → Cleanup → (Release)
```

### 1. Create an issue first

Create a GitHub issue **before starting any work** — feature, bug, or tech debt.

| Situation                    | Create issue?                                    |
|------------------------------|--------------------------------------------------|
| New feature from ROADMAP     | Yes — before branching                           |
| Bug discovered               | Yes — immediately                                |
| Tech debt from ROADMAP       | Yes — before branching                           |
| Critical hotfix              | Optional — PR with a full description is enough  |

**Issue title:** follows Conventional Commits format — `feat: coffee diff command`

**Issue body:**
```markdown
## Problem / Goal
[What the problem is or what needs to be built]

## Proposed solution
[Approach to take]

## References
- ROADMAP.md: vX.Y.Z
```

### 2. Branch from main

After the issue is open, create a branch that references the issue number:

```bash
git checkout main && git pull
git checkout -b feat/<issue-number>-<slug>
# example: feat/3-coffee-diff
```

A `PreToolUse` hook blocks `Edit`/`Write` when on `main` to enforce this locally.

### Branch naming

| Branch pattern            | Purpose                                      |
|---------------------------|----------------------------------------------|
| `main`                    | Always releasable. Direct commits blocked.   |
| `feat/<issue>-<slug>`     | New user-facing feature                      |
| `fix/<issue>-<slug>`      | Bug fix                                      |
| `chore/<slug>`            | Tooling, config — no issue required          |
| `docs/<slug>`             | Documentation-only change                    |
| `refactor/<issue>-<slug>` | Internal rewrite, no behavior change         |

- `<slug>` is kebab-case, max 4 words.
- Delete branches after merge.
- Release tags (`v1.2.0`) are created by `npm version`, not by hand.

### Keeping a branch up-to-date

If `main` advances while you are on a feature branch, use **rebase** (not merge):

```bash
git fetch origin
git rebase origin/main
```

- Rebase keeps history linear and clean in the PR.
- Resolve conflicts per-commit, then `git rebase --continue`.
- Never use `git merge main` on a feature branch — it produces unnecessary merge commits.
- After rebase, push with force-with-lease: `git push --force-with-lease`.

---

## Commit Convention

Format: **Conventional Commits**

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]

[optional footer: BREAKING CHANGE, Closes #N]
```

### Types

| Type       | When to use                                           |
|------------|-------------------------------------------------------|
| `feat`     | New command or user-visible behavior                  |
| `fix`      | Bug fix                                               |
| `docs`     | README, CHANGELOG, `docs/` — no code change           |
| `chore`    | `package.json`, `.gitignore`, tooling — no src change |
| `refactor` | Internal rewrite with identical external behavior     |
| `test`     | Adding or updating tests                              |
| `perf`     | Measurable performance improvement                    |

### Rules

- Subject line: imperative mood, lowercase, no trailing period, ≤ 72 chars.
- Body: explain motivation or constraint, not the diff. Omit when obvious.
- One logical change per commit.
- Breaking changes: `BREAKING CHANGE:` footer + `!` after type (`feat!`).
- Footer must include `Closes #<issue-number>`.

### Examples

```
feat(core): add showList to display collection contents
fix(core): skip broken symlinks in installFolder
docs(readme): document coffee list command
chore: add prepublishOnly script to package.json
test(core): add unit tests for isSafeName
```

---

## Pull Request Convention

### Draft PR

Open a PR as **Draft** when work is in progress but you want early feedback or visibility:

```bash
gh pr create --draft --title "<type>(<scope>): <description>" --base main --body "..."
```

Convert to Ready for Review after all checklist items are met:

```bash
gh pr ready
```

### Title

Same format as a commit subject line: `<type>(<scope>): <short description>`.

### Body template

```markdown
## What
One paragraph describing the change from the user's perspective.

## Why
Why this is needed or what problem it solves.

## Test plan
- [ ] Manual: <scenario 1>
- [ ] Manual: <scenario 2>
- [ ] `npm test` passes
- [ ] `npm pack --dry-run` output is correct
- [ ] `CHANGELOG.md` updated under [Unreleased]
- [ ] `ROADMAP.md` status updated
- [ ] `docs/setup-guide.md` updated if a command or install behavior changed

Closes #<issue-number>
```

### Rules

- One feature or fix per PR. Do not bundle unrelated changes.
- Use Draft PR for WIP — never leave a Ready PR in an unfinished state.
- All checklist items must be verified before converting Draft → Ready.
- `CHANGELOG.md` updated under `[Unreleased]` in the same PR.
- `ROADMAP.md` status updated in the same PR.
- `docs/setup-guide.md` updated if a new command or install behavior changed.
- Commit footer must include `Closes #<issue-number>`.
- No merge with failing tests.

---

## Code Review

Every PR must be reviewed before merging, even on a solo project.

### Reviewer checklist

**Correctness**
- [ ] Logic matches the issue description
- [ ] Edge cases handled (missing path, empty config, invalid name)
- [ ] No `process.exit()` outside `index.js`
- [ ] No new runtime dependencies added

**Style**
- [ ] Naming follows conventions in this document
- [ ] No comments that explain WHAT (only WHY is allowed)
- [ ] New functions ≤ 40 lines; if longer, split into named helpers

**Documentation**
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] `ROADMAP.md` status updated
- [ ] `README.md` updated if a new command or behavior was added
- [ ] `docs/setup-guide.md` updated if a new command or install behavior changed

**Security**
- [ ] User input passes through `isSafeName()` before any file operation
- [ ] No hardcoded absolute paths

### Merge strategy

Use **Squash and merge** for feature branches with many small commits.
Use **Merge commit** when each commit is clean and logically self-contained.

Delete the branch after merge — GitHub provides a "Delete branch" button automatically.

---

## Post-merge Cleanup

After a PR is merged, run locally:

```bash
git checkout main
git pull
git branch -d <branch>       # delete local branch
git remote prune origin      # clean up stale remote tracking refs
```

---

## Release Flow

Not every PR triggers a release. Batch multiple PRs into one version unless a critical bug fix is needed.

### When to release

| Condition                                    | Action                          |
|----------------------------------------------|---------------------------------|
| Critical bug on `main`                       | Release `patch` immediately     |
| 1–3 small features accumulated in `[Unreleased]` | Release `minor`             |
| Breaking change                              | Release `major` — plan first    |

### Release steps

```bash
# 1. Ensure main is clean and tests pass
git checkout main && git pull && npm test

# 2. Security audit — zero high/critical vulnerabilities allowed
npm audit

# 3. Update CHANGELOG.md — move [Unreleased] to [x.y.z] - YYYY-MM-DD

# 4. Bump version (automatically creates a commit and git tag)
npm version patch   # or minor / major

# 5. Verify publish surface
npm pack --dry-run

# 6. Publish to npm registry
npm publish

# 7. Push commit and tag
git push && git push --tags

# 8. Create GitHub Release
gh release create v$(node -p "require('./package.json').version") \
  --title "v$(node -p "require('./package.json').version")" \
  --notes "$(sed -n '/^## \[/,/^## \[/p' CHANGELOG.md | head -n -1)"
```

`npm version` automatically bumps `package.json`, creates a commit, and creates a `vX.Y.Z` git tag. Never bump the version manually.

GitHub Release is the official release page on the repo — different from a git tag. Users see it on the Releases tab for downloads and release notes.

---

## Code Style

### General

- **No comments** unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant).
- No multi-line JSDoc blocks. Single-line `@param`/`@returns` only when the type is not clear from context.
- Prefer early returns over nested conditions.
- No unused variables or exports.
- Max function length: ~40 lines. Split into named helpers if longer.

### Naming

| Thing       | Convention                                              | Example              |
|-------------|---------------------------------------------------------|----------------------|
| Functions   | camelCase                                               | `installFromConfig`  |
| Variables   | camelCase                                               | `sourceRoot`         |
| Constants   | SCREAMING_SNAKE for exported env-like constants         | `BASE_SOURCE`        |
| Files       | kebab-case                                              | `setup-guide.md`     |
| npm scripts | kebab-case                                              | `prepublishOnly`     |

### Imports

- Node.js stdlib only. No npm packages.
- Named imports only — no `import * as fs`.
- Group order: `fs` → `path` → `url` → other stdlib.

### Error handling

- `try/catch` only around filesystem operations.
- Always include the failing path in `console.error` output.
- Never swallow errors silently.
- Guard functions return `false` on failure; callers check the return value.
- `process.exit(1)` only in `index.js`, never in `core.js`.

### CLI output format

| Situation     | Prefix | Stream         |
|---------------|--------|----------------|
| Install start | `📦`   | `console.log`  |
| File copied   | `📄`   | `console.log`  |
| Success       | `✅`   | `console.log`  |
| Skipped       | `⏭️`  | `console.log`  |
| Error/failure | `❌`   | `console.error`|
| Warning       | `⚠️`  | `console.error`|

No ANSI color codes. No chalk or similar packages.

---

## Claude Code Hooks

Project hooks live in `.claude/settings.json`. The `.claude/` directory is gitignored — each contributor sets up their own hooks locally.

### Recommended hooks

| Event        | Matcher        | Behavior                                                                                          |
|--------------|----------------|---------------------------------------------------------------------------------------------------|
| `PreToolUse` | `Edit\|Write`  | Blocks the edit if the current branch is `main` — enforces the branching rule                    |
| `PostToolUse`| `Edit\|Write`  | Injects a reminder to update `CHANGELOG.md` and `ROADMAP.md` when a `.js` file is edited        |
| `Stop`       | —              | Checks `git diff` for unstaged `.js` changes; warns if `CHANGELOG.md`/`ROADMAP.md` were not updated |

Copy the config from a teammate or recreate it locally — it does not live in the repo.

---

## Testing

- Tests live in `test/` (excluded from npm publish via `files`).
- File naming: `<module>.test.js` — example: `core.test.js`.
- Use `node:test` and `node:assert` only. No test framework dependencies.
- Run: `npm test` (runs `node --test`).
- Each public export in `core.js` must have at least one test.
- Tests must not write outside `os.tmpdir()`. Clean up temp files in `after()`.

---

## Security

- All project and folder names pass through `isSafeName()` before any filesystem operation.
- No user input is interpolated into shell commands.
- No hardcoded absolute paths — all paths come from config resolution or argv.
- The engine only reads from `BASE_SOURCE`. It never writes back to it.
- `copyIfMissing` and `override` are explicit per-rule opt-ins — never applied globally.
- Run `npm audit` before each release. Zero high/critical vulnerabilities allowed.
