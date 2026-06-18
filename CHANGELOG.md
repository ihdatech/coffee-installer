# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `coffee list` command — shows config-defined projects and collection folders with source labels and install type hints (`symlink` / `convention` / `config + convention`)
- `prepublishOnly` script — blocks `npm publish` if tests fail
- `CLAUDE.md` — development standards (tech stack, workflow, branching, commits, PR, code style, release)
- `ROADMAP.md` — feature plan with version targets and implementation status

### Changed
- Rename `utils.js` to `core.js` for clarity
- Convert codebase to ES modules (`import`/`export`, `"type": "module"`)
- Replace `createRequire` with dynamic `import()` for custom installer modules
- Add `exports` field to `package.json` for programmatic use
- Remove internal-only functions from public API (`loadCoffeeConfig`, `loadGlobalCoffeeConfig`, `showBaseSourceSetupMessage`)
- Register `coffee` as a bin alias in `package.json` — no manual alias setup required
- `installFromConfig` now reads `projects` from `~/.coffee.config.json` in addition to cwd config
- `docs/setup-guide.md` — added Step 5 (`coffee list`) before the install step

### Fixed
- `showVersion` was not exported — caused `ReferenceError` on `coffee version`
- `installFromConfig` was never called when using global config — condition only checked cwd config
- `loadCoffeeConfig` called twice at startup
- Unknown commands silently fell through to `showHelp` without an error message

## [1.0.0] - 2025-05-06

### Added
- Initial release
- `coffee install <name>` — config-based, convention, and symlink install strategies
- `coffee config` — show base source and setup instructions
- `coffee version` — show CLI version
- `coffee help` — show available commands
- Config resolution: `coffee.config.json` → `BASE_SOURCE` env → `~/.coffee.config.json` → `~/.coffee/config.json`
- Path traversal protection via `isSafeName()`
- Zero runtime dependencies
