# coffee-installer — Development Standards

This file is the authoritative reference for contributing to `coffee-installer`.
All development, code review, and automation must follow the rules below.

---

## Tech Stack

| Concern        | Choice                                          |
|----------------|-------------------------------------------------|
| Runtime        | Node.js ≥ 18 (LTS)                             |
| Module system  | ES Modules (`"type": "module"` in package.json) |
| Dependencies   | **Zero** — Node.js stdlib only                  |
| Test runner    | `node:test` + `node:assert` (built-in)          |
| Package manager| npm ≥ 9                                         |
| Registry       | npmjs.com (public)                              |

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

Use `exports` to control what consumers can `import` when using `coffee-installer` as a library:

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

| Script           | Command                   | Purpose                                      |
|------------------|---------------------------|----------------------------------------------|
| `test`           | `node --test`             | Run test suite                               |
| `prepublishOnly` | `npm test`                | Block publish if tests fail                  |
| `version`        | `node scripts/version.js` | Auto-update CHANGELOG on `npm version` (future) |

Lifecycle order on `npm publish`: `prepublishOnly` → pack → upload.

### Verify before publish

Before every release, run `npm pack --dry-run` to confirm that only the intended files are included. Unexpected inclusions (`.env`, secrets, test fixtures) must be blocked by updating `files`.

---

## Architecture

This package follows the **dual-entry npm pattern**: a CLI entry (`bin`) and a library entry (`exports`) from the same source, with no build step.

### File layout

```
coffee-installer/
├── index.js              # CLI entry point (bin) — routes commands, calls process.exit()
├── core.js               # Library entry point (exports) — all business logic as named exports
├── test/                 # Test suites (excluded from npm publish via `files`)
│   └── core.test.js
├── docs/                 # User-facing docs — published to npm + served via GitHub Pages
│   └── setup-guide.md
├── .gitignore            # Files ignored by Git
├── CHANGELOG.md          # Keep-a-Changelog format (not published)
├── CLAUDE.md             # Dev standards — this file (not published)
├── LICENSE               # Published
├── README.md             # Package documentation — published
└── package.json          # Package metadata and entry definitions (always published)
```

### Layer rules

| Layer | File | `package.json` field | May call `process.exit`? |
|-------|------|-----------------------|--------------------------|
| CLI | `index.js` | `bin` | Yes — only place allowed |
| Library | `core.js` | `exports["."]` | Never |

### Development lifecycle

```
watch → test → pack (dry-run) → publish
```

| Stage | Command | When |
|-------|---------|------|
| Develop | `node --test --watch` | Active development — re-runs tests on save |
| Verify | `npm test` | Before every commit |
| Inspect | `npm pack --dry-run` | Before every release — confirm published file list |
| Release | `npm version` + `npm publish` | After CHANGELOG updated on `main` |

### Rules

- `index.js` only routes CLI commands and calls `process.exit()`. Zero business logic.
- `core.js` holds all logic. Every public function is a named export.
- Module-level side effects in `core.js` are limited to config loading (`loadCoffeeConfig`, `loadGlobalCoffeeConfig`) and `BASE_SOURCE` resolution.
- `docs/` contains only user-facing documentation; it is also the GitHub Pages source (served from `/docs` on `main`). No internal design docs.
- No `src/`, `lib/`, or `dist/` directories — no build step, source files live at the root.
- Test files live in `test/` and are excluded from the published package via `files`.
- Published surface must stay minimal. Run `npm pack --dry-run` and verify the file list before every release.

---

## Branching Strategy

| Branch pattern    | Purpose                                    |
|-------------------|--------------------------------------------|
| `main`            | Always releasable. Direct commits blocked. |
| `feat/<slug>`     | New user-facing feature                    |
| `fix/<slug>`      | Bug fix                                    |
| `chore/<slug>`    | Tooling, scripts, config, dep updates      |
| `docs/<slug>`     | Documentation-only change                  |
| `refactor/<slug>` | Internal rewrite, no behavior change       |

### Rules

- Always branch from `main`, always merge back to `main` via PR.
- Delete feature branches after merge.
- `<slug>` is kebab-case, max 4 words. Example: `feat/coffee-list`.
- Never commit directly to `main`.
- Release tags (`v1.2.0`) are created by `npm version`, not by hand.

---

## Commit Convention

Format: **Conventional Commits**

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]

[optional footer: BREAKING CHANGE, Closes #N]
```

### Types

| Type       | When to use                                          |
|------------|------------------------------------------------------|
| `feat`     | New command or user-visible behavior                 |
| `fix`      | Bug fix                                              |
| `docs`     | README, CHANGELOG, `docs/` — no code change          |
| `chore`    | `package.json`, `.gitignore`, tooling — no src change|
| `refactor` | Internal rewrite with identical external behavior    |
| `test`     | Adding or updating tests                             |
| `perf`     | Measurable performance improvement                   |

### Rules

- Subject line: imperative mood, lowercase, no trailing period, ≤ 72 chars.
- Body: explain motivation or constraint, not the diff. Omit when obvious.
- One logical change per commit.
- Breaking changes: `BREAKING CHANGE:` footer + `!` after type (`feat!`).

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
- [ ] `npm pack --dry-run` output looks correct
```

### Rules

- One feature or fix per PR. Do not bundle unrelated changes.
- All checklist items must be verified before requesting review.
- `CHANGELOG.md` updated under `[Unreleased]` in the same PR.
- No merge with failing tests.

---

## Code Style

### General

- **No comments** unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant).
- No multi-line JSDoc blocks. Single-line `@param`/`@returns` only when the type is not clear from context.
- Prefer early returns over nested conditions.
- No unused variables or exports.
- Max function length: ~40 lines. Split into named helpers if longer.

### Naming

| Thing       | Convention                           | Example              |
|-------------|--------------------------------------|----------------------|
| Functions   | camelCase                            | `installFromConfig`  |
| Variables   | camelCase                            | `sourceRoot`         |
| Constants   | SCREAMING_SNAKE for exported env-like constants | `BASE_SOURCE` |
| Files       | kebab-case                           | `setup-guide.md`     |
| npm scripts | kebab-case                           | `prepublishOnly`     |

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

| Situation      | Prefix | Stream         |
|----------------|--------|----------------|
| Install start  | `📦`   | `console.log`  |
| File copied    | `📄`   | `console.log`  |
| Success        | `✅`   | `console.log`  |
| Skipped        | `⏭️`  | `console.log`  |
| Error/failure  | `❌`   | `console.error`|
| Warning        | `⚠️`  | `console.error`|

No ANSI color codes. No chalk or similar packages.

---

## Claude Code Hooks

Project hooks are defined in `.claude/settings.json`. The `.claude/` directory is gitignored — each contributor sets up their own hooks locally.

Recommended hooks to configure:

| Event | Trigger | Behavior |
|-------|---------|----------|
| `PostToolUse` | Edit or Write a `.js` file | Injects a reminder into Claude's context to update `CHANGELOG.md` and `ROADMAP.md` before finishing |
| `Stop` | Claude session ends | Checks `git diff` for unstaged `.js` changes; if `CHANGELOG.md` and `ROADMAP.md` were not also updated, shows a warning message to the user |

Copy the hook config from a teammate or recreate it locally — it does not live in the repo.

---

## Testing

- Tests live in `test/` (excluded from npm publish via `files`).
- File naming: `<module>.test.js` — example: `core.test.js`.
- Use `node:test` and `node:assert` only. No test framework dependencies.
- Run: `npm test` (which runs `node --test`).
- Each public export in `core.js` must have at least one test.
- Tests must not write outside `os.tmpdir()`. Clean up temp files in `after()`.

---

## Versioning & Release

This project follows **Semantic Versioning** and **Keep a Changelog**.

### Bump rules

| Change type                        | Bump    |
|------------------------------------|---------|
| New command or user-visible feature | `minor` |
| Bug fix                            | `patch` |
| Removed command or breaking config change | `major` |

### Release steps

```bash
# 1. Ensure main is clean and tests pass
git checkout main && npm test

# 2. Update CHANGELOG.md — move [Unreleased] to [x.y.z] - YYYY-MM-DD

# 3. Bump version (also creates a git tag automatically)
npm version patch   # or minor / major

# 4. Verify the publish surface
npm pack --dry-run

# 5. Publish to npm registry
npm publish

# 6. Push commit and tag
git push && git push --tags
```

`npm version` automatically: bumps `package.json`, creates a commit, and creates a `vX.Y.Z` git tag. Never bump the version manually in `package.json`.

---

## Security

- All project and folder names pass through `isSafeName()` before any filesystem operation.
- No user input is interpolated into shell commands.
- No hardcoded absolute paths — all paths come from config resolution or argv.
- The engine only reads from `BASE_SOURCE`. It never writes back to it.
- `copyIfMissing` and `override` are explicit per-rule opt-ins — never applied globally.
- Run `npm audit` before each release. Zero high/critical vulnerabilities allowed.
