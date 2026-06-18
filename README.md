# coffee-installer

[![npm version](https://img.shields.io/npm/v/coffee-installer)](https://www.npmjs.com/package/coffee-installer)
[![npm downloads](https://img.shields.io/npm/dm/coffee-installer)](https://www.npmjs.com/package/coffee-installer)
[![license](https://img.shields.io/npm/l/coffee-installer)](LICENSE)
[![node](https://img.shields.io/node/v/coffee-installer)](package.json)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

**Stop copying the same config files into every new project.**

`coffee-installer` lets you keep keystores, `.env` files, IDE settings, credentials, and any files you reuse across projects in one place — your **coffee collection** — and install them into any project with a single command.

```bash
coffee install my-app
```

---

## Why

Every new project starts the same way: hunt for the `.env` file from the last project, find the Android keystore, copy the VS Code settings, remember where you put the Firebase credentials...

`coffee-installer` solves this by keeping all those files in a local collection folder and giving you a fast CLI to install, preview, and sync them.

---

## Installation

```bash
npm install -g coffee-installer
```

Both `coffee` and `coffee-installer` are registered as CLI commands.

---

## Demo

```
$ coffee list
Coffee Collection — ~/.coffee-collection

Config-defined projects:
  my-app     ~/.coffee.config.json
  backend    ~/.coffee.config.json

Folders in collection:
  .agents    (symlink)
  .vscode    (symlink)
  my-app     (config + convention)
```

```
$ coffee diff my-app
Diff — my-app (config)

  + add         android/key.properties
  + add         android/app/keystore.jks
  = skip        frontend/.env.development.local

2 to add, 0 to overwrite, 1 to skip
```

```
$ coffee install my-app
📦 Installing my-app...
  ✅ copied android/key.properties
  ✅ copied android/app/keystore.jks
  ⏭️  skip   frontend/.env.development.local (already exists)
✅ my-app installed.
```

---

## Quick Start

```bash
# 1. Create your collection folder
mkdir ~/.coffee-collection

# 2. Configure the base source
echo '{ "baseSource": "~/.coffee-collection" }' > ~/.coffee.config.json

# 3. Add your files
mkdir -p ~/.coffee-collection/my-app/android/app
cp android/app/keystore.jks ~/.coffee-collection/my-app/android/app/
cp android/key.properties   ~/.coffee-collection/my-app/android/

# 4. Preview before installing
coffee diff my-app

# 5. Install into a project
cd your-project
coffee install my-app
```

---

## Commands

| Command | Description |
|---|---|
| `coffee list` | Show all projects and folders in the collection |
| `coffee diff <name>` | Preview what install would change — no files written |
| `coffee install <name>` | Copy files from the collection into the current project |
| `coffee pull <name>` | Sync files from the project back into the collection |
| `coffee config` | Show base source path and setup instructions |
| `coffee version` | Show installed version |
| `coffee help` | Show all commands |

---

## Configuration

### Global config (recommended)

Create `~/.coffee.config.json`:

```json
{
  "baseSource": "~/.coffee-collection",
  "projects": {
    "my-app": {
      "source": "my-app",
      "copy": [
        { "from": "android/key.properties",          "copyIfMissing": true },
        { "from": "android/app/keystore.jks",        "copyIfMissing": true },
        { "from": "frontend/.env.development.local", "copyIfMissing": true }
      ]
    }
  }
}
```

### Per-project config

Create `coffee.config.json` in the project root for project-specific rules or a different collection path.

### Environment variable

```bash
export BASE_SOURCE=~/.coffee-collection
```

**Resolution order:** `coffee.config.json` → `BASE_SOURCE` env → `~/.coffee.config.json`

---

## Copy rule options

| Field | Type | Default | Description |
|---|---|---|---|
| `from` | string | — | Path relative to the project folder in the collection |
| `to` | string | same as `from` | Destination path relative to cwd |
| `copyIfMissing` | boolean | `false` | Skip if destination already exists |
| `override` | boolean | `false` | Force-replace destination directory |

---

## Install strategies

`coffee install <name>` tries these in order:

1. **Config-based** — use copy rules from config if `projects.<name>` is defined
2. **Custom module** — load `install-<name>.js` from the CLI directory if it exists
3. **Convention** — merge `<collection>/<name>/` into cwd, skipping existing files
4. **Symlink** — symlink `<collection>/.<name>/` or `<collection>/<name>/` into cwd

Hidden folders (`.agents`, `.tasks`, `.vscode`) are preferred in the symlink strategy.

---

## Collection structure

```
~/.coffee-collection/
  .agents/                      ← symlinked as .agents into every project
  .tasks/                       ← symlinked as .tasks
  .vscode/                      ← symlinked as .vscode
  my-app/
    android/
      key.properties
      app/
        keystore.jks
    frontend/
      .env.development.local
    backend/
      .env.development.local
      .env.production.local
  another-app/
    ...
```

The collection is yours — `coffee-installer` only reads from it, never modifies it.

---

## Security

- Names are validated — only alphanumeric, `.`, `_`, `-` allowed. Path traversal is rejected.
- No shell commands are constructed from user input.
- No paths are hardcoded.

---

## See Also

- [Setup Guide](docs/setup-guide.md) — first-time configuration walkthrough
- [Changelog](https://github.com/ihdatech/coffee-installer/blob/main/CHANGELOG.md)
- [Roadmap](https://github.com/ihdatech/coffee-installer/blob/main/ROADMAP.md)
