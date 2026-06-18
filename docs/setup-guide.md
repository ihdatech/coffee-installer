# Coffee Installer — Setup Guide

This guide walks through first-time configuration of `coffee-installer`.

The engine ships without any collection content. You provide the collection — a folder on your machine containing the files you want to install into projects.

---

## Step 1 — Verify installation

```bash
coffee-installer version
coffee-installer help
```

---

## Step 2 — Create a collection directory

A collection is a plain folder you own. No special structure is required — the engine reads from whatever you put there.

Example:

```
~/.coffee-collection/
  .agents/
  .tasks/
  .vscode/
  my-project/
    android/
      key.properties
      app/
        keystore.jks
    frontend/
      .env.development.local
```

---

## Step 3 — Configure the base source

Choose one of these approaches:

### Option A — Global user config (recommended)

Create `~/.coffee.config.json`:

```json
{
  "baseSource": "~/.coffee-collection"
}
```

This applies to all projects on your machine without any per-project setup.

You can also define `projects` here so install rules are available globally:

```json
{
  "baseSource": "~/.coffee-collection",
  "projects": {
    "my-project": {
      "source": "my-project",
      "copy": [
        { "from": "android/key.properties", "to": "android/key.properties", "copyIfMissing": true },
        { "from": "android/app/keystore.jks", "to": "android/app/keystore.jks", "copyIfMissing": true },
        { "from": "frontend/.env.development.local", "to": "frontend/.env.development.local", "copyIfMissing": true }
      ]
    }
  }
}
```

### Option B — Per-project config

Create `coffee.config.json` in the project root. Useful when a project needs its own install rules or a different base source.

```json
{
  "baseSource": "~/.coffee-collection",
  "projects": {
    "my-project": {
      "source": "my-project",
      "copy": [
        { "from": "android/key.properties", "to": "android/key.properties", "copyIfMissing": true }
      ]
    }
  }
}
```

### Option C — Environment variable

```bash
export BASE_SOURCE=~/.coffee-collection
```

Useful for CI or temporary overrides.

---

## Step 4 — Verify configuration

```bash
coffee-installer config
```

Expected output:

```
Coffee Installer — Configuration

Current base source: /home/you/.coffee-collection
...
```

---

## Step 5 — Explore your collection

Before installing, you can see what is available in your collection:

```bash
coffee list
```

Expected output:

```
Coffee Collection — ~/.coffee-collection

Config-defined projects:
  my-project   ~/.coffee.config.json

Folders in collection:
  .agents      (symlink)
  .vscode      (symlink)
  my-project   (config + convention)
```

- **Config-defined projects** — projects with explicit copy rules in a config file.
- **Folders in collection** — top-level directories found in `baseSource`:
  - `(symlink)` — hidden folders (e.g. `.agents`) that will be symlinked into the project.
  - `(convention)` — visible folders that will be merged into cwd by convention.
  - `(config + convention)` — visible folders that also have config rules defined.

---

## Step 6 — Preview before installing

Before committing to an install, you can preview exactly what would happen:

```bash
coffee diff my-project
```

Expected output:

```
Diff — my-project (config)

  + add         android/key.properties
  ~ overwrite   android/app/keystore.jks
  = skip        frontend/.env.development.local

2 to add, 1 to overwrite, 1 to skip
```

- `+ add` — file does not exist in the project; will be copied
- `~ overwrite` — file already exists; will be replaced
- `= skip` — file already exists and the rule has `copyIfMissing: true`; will not be touched

`coffee diff` never writes any files. It is safe to run at any time.

---

## Step 7 — Install a project

```bash
cd your-project
coffee install my-project
```

---

## Install behavior

When `coffee install <name>` is run, the engine tries these strategies in order:

### 1. Config-based (if `projects.<name>` is defined)
Uses the explicit copy rules. `copyIfMissing: true` skips files that already exist.

### 2. Custom installer module
If `install-<name>.js` exists in the engine directory, it is loaded and run.

### 3. Convention-based copy
If `<baseSource>/<name>/` exists, its contents are merged into cwd. Existing files are skipped.

### 4. Symlink
If `<baseSource>/.<name>/` or `<baseSource>/<name>/` exists, a symlink is created in cwd. Hidden folders (`.tasks`, `.vscode`, `.agents`) are preferred when both exist.

---

## Config resolution order

```
1. coffee.config.json in cwd
2. BASE_SOURCE environment variable
3. ~/.coffee.config.json
4. ~/.coffee/config.json
```

`projects` definitions are read from whichever config has a matching project — cwd config takes priority over global.

---

## Error: base source not configured

If the base source is missing, you will see:

```
Base source is not configured.

Run `coffee-installer config` for setup instructions.
```

Fix: create `~/.coffee.config.json` with a valid `baseSource` path.

---

## Recommended collection structure for mobile projects

```
coffee-collection/
  .agents/                     ← AI agent configs (symlinked)
  .tasks/                      ← task scripts (symlinked)
  .vscode/                     ← editor settings (symlinked)
  project-a/
    android/
      key.properties
      app/
        keystore.jks
        keystore_development.jks
        keystore_staging.jks
    ios/
      fastlane/
    frontend/
      .env.development.local
      .env.staging.local
    backend/
      .env.development.local
      .env.staging.local
      .env.production.local
```
