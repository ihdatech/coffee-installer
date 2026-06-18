# coffee-installer

`coffee-installer` is a CLI for copying files from your private **coffee collection** into any project with a single command.

A **coffee collection** is a folder you own — it holds credentials, config files, keystores, `.env` files, IDE settings, and any other files you reuse across projects. `coffee-installer` reads from that folder and copies the right files into whichever project you're working in.

```bash
cd your-project
coffee install my-app
```

---

## Installation

```bash
npm install -g coffee-installer
```

Both `coffee-installer` and `coffee` are registered as CLI commands after install.

---

## Quick Start

```bash
# 1. Create your collection folder
mkdir ~/.coffee-collection

# 2. Point coffee-installer to it
echo '{ "baseSource": "~/.coffee-collection" }' > ~/.coffee.config.json

# 3. Add your files to the collection
mkdir -p ~/.coffee-collection/my-app/android/app
cp android/app/keystore.jks ~/.coffee-collection/my-app/android/app/

# 4. Install into a project
cd your-project
coffee install my-app
```

---

## Commands

| Command | Description |
|---|---|
| `coffee help` | Show available commands |
| `coffee version` | Show installed CLI version |
| `coffee config` | Show current base source and setup instructions |
| `coffee list` | List all projects and folders in the collection |
| `coffee diff <name>` | Preview what install would do — no files written |
| `coffee install <name>` | Copy files from the collection into the current project |

---

## Configuration

`coffee-installer` needs to know where your collection lives. Configure it in one of three ways:

### 1. Global user config (recommended)

Create `~/.coffee.config.json`:

```json
{
  "baseSource": "~/.coffee-collection"
}
```

You can also define install rules here so they apply across all projects:

```json
{
  "baseSource": "~/.coffee-collection",
  "projects": {
    "my-app": {
      "source": "my-app",
      "copy": [
        { "from": "android/key.properties", "to": "android/key.properties", "copyIfMissing": true },
        { "from": "android/app/keystore.jks", "to": "android/app/keystore.jks", "copyIfMissing": true },
        { "from": "frontend/.env.development.local", "to": "frontend/.env.development.local", "copyIfMissing": true }
      ]
    }
  }
}
```

### 2. Per-project config

Create `coffee.config.json` in the project root when a project needs its own rules or a different collection path.

### 3. Environment variable

```bash
export BASE_SOURCE=~/.coffee-collection
```

**Resolution order:** `coffee.config.json` → `BASE_SOURCE` env → `~/.coffee.config.json`

---

## Copy rule options

| Field | Type | Description |
|---|---|---|
| `from` | string | Path relative to the project's folder in the collection |
| `to` | string | Path relative to cwd. Defaults to `from` |
| `copyIfMissing` | boolean | Skip if the destination already exists |
| `override` | boolean | Force-replace destination directory before copying |

---

## Install strategies

When `coffee install <name>` is run, these strategies are tried in order:

1. **Config-based** — if `projects.<name>` is defined in any config, use its copy rules
2. **Custom module** — if `install-<name>.js` exists in the CLI directory, load and run it
3. **Convention** — if `<collection>/<name>/` exists, merge its contents into cwd (skips existing files)
4. **Symlink** — if `<collection>/.<name>/` or `<collection>/<name>/` exists, create a symlink in cwd

Hidden folders (`.tasks`, `.vscode`, `.agents`) are preferred over visible ones in the symlink strategy.

---

## Collection structure example

```
~/.coffee-collection/
  .agents/                      ← symlinked into projects as .agents
  .tasks/                       ← symlinked into projects as .tasks
  .vscode/                      ← symlinked into projects as .vscode
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

## Architecture

```
coffee-installer/
  index.js      ← CLI entry point, command router
  core.js       ← all install logic and config resolution
  docs/
    setup-guide.md
```

### core.js sections

| Section | Purpose |
|---|---|
| Config loaders | Parse `coffee.config.json` (cwd) and `~/.coffee.config.json` |
| Module-level state | `config`, `globalConfig`, `BASE_SOURCE` — resolved once at startup |
| Path helpers | `resolvePath`, `isSafeName`, `pathExistsOrSymlink` |
| Output | `showHelp`, `showVersion`, `showConfigHelp` |
| Install strategies | `installFromConfig`, `installProjectByConvention`, `installFolder`, `copyMerge` |

---

## Security

- Project and folder names are validated — only alphanumeric, `.`, `_`, `-` allowed. Path traversal is rejected.
- File operations are wrapped in try/catch — errors are reported clearly.
- No local paths are hardcoded in the package.

---

## See Also

- [Setup Guide](docs/setup-guide.md) — first-time configuration walkthrough
