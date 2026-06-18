# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- Rename `utils.js` to `core.js` for clarity
- Convert codebase to ES modules (`import`/`export`)
- Replace `createRequire` with dynamic `import()` for custom installer modules
- Add `exports` field to `package.json` for programmatic use
- Remove internal-only exports from public API (`loadCoffeeConfig`, `loadGlobalCoffeeConfig`, `showBaseSourceSetupMessage`)
- Register `coffee` as a bin alias in `package.json` (no manual alias setup required)
- Fix `installFromConfig` to also read `projects` from `~/.coffee.config.json`
- Add path traversal protection via `isSafeName()` validation
- Add try/catch around all file operations with clear error messages
- Add `"use strict"` equivalent via ES module semantics
- Clean up `.gitignore` — remove project-specific folder names, fix non-standard glob patterns

### Fixed
- `showVersion` was not exported — caused `ReferenceError` on `coffee version`
- `version` was undefined in `utils.js` — was only imported in `index.js`
- `installFromConfig` was never called when using global config — condition only checked cwd config
- `loadCoffeeConfig` called twice at startup (once in `utils.js`, once in `index.js`)
- Unknown commands silently fell through to `showHelp` without an error message

## [1.0.0] - 2025-05-06

### Added
- Initial release
- `coffee-installer install <name>` — config-based, convention, and symlink install strategies
- `coffee-installer config` — show base source and setup instructions
- `coffee-installer version` — show CLI version
- Config resolution from `coffee.config.json`, `BASE_SOURCE` env, and `~/.coffee.config.json`
