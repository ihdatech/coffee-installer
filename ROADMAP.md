# coffee-installer — Roadmap

Development plan for `coffee-installer`. Follows standards defined in [CLAUDE.md](CLAUDE.md).

Status legend: `[x]` done · `[ ]` planned · `[-]` in progress

---

## v1.0.0 — Initial release ✓

- [x] `coffee install <name>` — config-based, convention, and symlink strategies
- [x] `coffee config` — show base source and setup instructions
- [x] `coffee version` — show installed CLI version
- [x] `coffee help` — show available commands
- [x] Config resolution: `coffee.config.json` → `BASE_SOURCE` env → `~/.coffee.config.json`
- [x] Path traversal protection via `isSafeName()`
- [x] Zero runtime dependencies

---

## v1.1.0 — Discovery

- [x] `coffee list` — list config-defined projects and collection folders with type hints (`symlink` / `convention` / `config + convention`)
- [x] `prepublishOnly` script — blocks `npm publish` if tests fail
- [x] `CLAUDE.md` — development standards document (tech stack, branching, commits, PR, code style, release)
- [x] `ROADMAP.md` — this file

---

## v1.2.0 — Inspection

- [ ] `coffee diff <name>` — compare files in the current project against the collection before installing; show which would be added, skipped, or overwritten
  - Scope: read-only. No files are written.
  - Output format: one line per file — `+ add`, `~ overwrite`, `= skip`
  - Respects config copy rules if a project is defined in config; falls back to convention scan

---

## v1.3.0 — Sync back

- [ ] `coffee pull <name>` — copy files from the current project back into the collection (reverse of `install`)
  - Requires project to have copy rules defined in config (`from`/`to` pairs)
  - Prompts confirmation if a collection file would be overwritten (unless `--force` is passed)
  - Only supports config-based projects — convention folders are not pulled back (no rules to infer destination)

---

## v1.4.0 — Cleanup

- [ ] `coffee unlink [name]` — remove symlinks created by `coffee install`
  - Without `<name>`: scan cwd for symlinks pointing into `BASE_SOURCE` and list them
  - With `<name>`: remove the specific symlink for that folder name
  - Never removes regular files or non-collection symlinks

---

## v1.5.0 — Guided setup

- [ ] `coffee init` — interactive wizard to create `coffee.config.json` in the current project
  - Asks for: base source path, project name, file pairs to copy
  - Writes `coffee.config.json` in cwd; skips if one already exists (use `--force` to overwrite)
  - Validates all input through `isSafeName()` before writing

---

## v1.6.0 — Dry-run mode

- [ ] `--dry-run` flag for `coffee install <name>` — show what would happen without writing any files
  - Works across all three install strategies (config, convention, symlink)
  - Output mirrors normal install output but prefixed with `[dry-run]`
  - Exits with code `0` always (no side effects)

---

## v2.0.0 — CLI flag overrides (breaking)

- [ ] `--override` flag on `coffee install <name>` — force-replace destination dirs without needing it in config
  - Currently `override` is only settable per copy rule in config; this exposes it as a CLI flag
  - **Breaking**: changes the semantics of the convention strategy (previously always skips existing)

---

## Technical debt (no version target)

- [ ] Test suite — `test/core.test.js` using `node:test` + `node:assert`
  - Minimum coverage: one test per exported function in `core.js`
  - Tests must not write outside `os.tmpdir()`
- [ ] JSDoc completeness — `@param` and `@returns` on every exported function where type is not obvious from context
- [ ] Circular symlink guard — detect and reject circular symlinks before calling `symlinkSync`
- [ ] `npm version` hook — `scripts.version` auto-updates CHANGELOG.md `[Unreleased]` header to the new version + date on `npm version`

---

## Rejected / out of scope

| Idea | Reason |
|------|--------|
| Remote collection (Git, S3, URL) | Requires network dependency; conflicts with zero-dependency constraint. Could be a separate package. |
| TypeScript source | Adds a build step; contradicts the no-transpile constraint. JSDoc types are sufficient for this scope. |
| ANSI colors in output | External dependency (chalk) or fragile manual escape codes. Plain text output is more robust. |
| Plugin system | Premature abstraction. Custom installer modules (`install-<name>.js`) already cover this use case. |
