import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, statSync, lstatSync, rmSync, symlinkSync, realpathSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { version } = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));

// ─── Config loaders ───────────────────────────────────────────────────────────

/**
 * Load coffee.config.json from the current working directory.
 * @returns {object|null}
 */
function loadCoffeeConfig() {
    const configPath = join(process.cwd(), "coffee.config.json");
    if (!existsSync(configPath)) return null;
    try {
        return JSON.parse(readFileSync(configPath, "utf8"));
    } catch (e) {
        console.error(`⚠️  Failed to parse coffee.config.json: ${e.message}`);
        return null;
    }
}

/**
 * Load global config from ~/.coffee.config.json or ~/.coffee/config.json.
 * Supports both baseSource and projects definitions.
 * @returns {object|null}
 */
function loadGlobalCoffeeConfig() {
    const candidates = [
        join(process.env.HOME, ".coffee.config.json"),
        join(process.env.HOME, ".coffee", "config.json"),
    ];
    for (const candidate of candidates) {
        if (!existsSync(candidate)) continue;
        try {
            return JSON.parse(readFileSync(candidate, "utf8"));
        } catch (e) {
            console.error(`⚠️  Failed to parse ${candidate}: ${e.message}`);
        }
    }
    return null;
}

// ─── Module-level state ───────────────────────────────────────────────────────

export const config = loadCoffeeConfig();
export const globalConfig = loadGlobalCoffeeConfig();
export const BASE_SOURCE = resolvePath(
    config?.baseSource || process.env.BASE_SOURCE || globalConfig?.baseSource
);
const TARGET = process.cwd();

// ─── Path helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve a path that may start with ~ to an absolute path.
 * @param {string|undefined} value
 * @returns {string|undefined}
 */
function resolvePath(value) {
    if (!value) return value;
    if (value === "~") return process.env.HOME;
    if (value.startsWith("~/")) return join(process.env.HOME, value.slice(2));
    return resolve(value);
}

/**
 * Validate that a project/folder name is safe and contains no path traversal.
 * @param {string} name
 * @returns {boolean}
 */
function isSafeName(name) {
    return /^[a-zA-Z0-9._-]+$/.test(name) && !name.includes("..");
}

/**
 * Check whether a path exists, including broken symlinks.
 * @param {string} targetPath
 * @returns {boolean}
 */
function pathExistsOrSymlink(targetPath) {
    try {
        lstatSync(targetPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Remove a path if it exists (file, directory, or symlink).
 * @param {string} targetPath
 */
function removeIfExists(targetPath) {
    if (pathExistsOrSymlink(targetPath)) {
        rmSync(targetPath, { recursive: true, force: true });
    }
}

// ─── Output ───────────────────────────────────────────────────────────────────

export function showVersion() {
    console.log(`coffee-installer v${version}`);
}

export function showHelp() {
    console.log("Coffee Installer");
    console.log("");
    if (BASE_SOURCE) {
        console.log(`Base source: ${BASE_SOURCE}`);
        console.log("");
    }
    console.log("Usage:");
    console.log("  coffee-installer help");
    console.log("  coffee-installer version");
    console.log("  coffee-installer config");
    console.log("  coffee-installer install <name>");
    console.log("");
    console.log("Commands:");
    console.log("  help       Show available commands");
    console.log("  version    Show installed CLI version");
    console.log("  config     Show setup and alias instructions");
    console.log("  list       List projects and folders in the collection");
    console.log("  diff       Preview what install would do — no files written");
    console.log("  install    Install a configured project or folder");
    console.log("");
    console.log("Examples:");
    console.log("  coffee-installer list");
    console.log("  coffee-installer diff my-app");
    console.log("  coffee-installer install template-app");
    console.log("  coffee install my-project");
}

export function showConfigHelp() {
    console.log("Coffee Installer — Configuration");
    console.log("");
    console.log(`Current base source: ${BASE_SOURCE || "not configured"}`);
    console.log("");
    console.log("Setup (choose one):");
    console.log("  1. Per project — create coffee.config.json in the project root");
    console.log('     { "baseSource": "/path/to/coffee-collection" }');
    console.log("");
    console.log("  2. Global user config — create ~/.coffee.config.json");
    console.log('     { "baseSource": "/path/to/coffee-collection" }');
    console.log("");
    console.log("  3. Environment variable");
    console.log("     export BASE_SOURCE=/path/to/coffee-collection");
    console.log("");
    console.log("Optional alias (already registered via package.json bin):");
    console.log("  coffee install <name>");
}

function showBaseSourceSetupMessage() {
    console.error("Base source is not configured.");
    console.error("");
    console.error("Run `coffee-installer config` for setup instructions.");
}

/**
 * Collect all project names defined across cwd config and global config,
 * returning a map of projectName → config file label.
 * @returns {Map<string, string>}
 */
function collectConfigProjects() {
    const entries = new Map();
    const label = (cfg, path) => {
        if (!cfg?.projects) return;
        for (const name of Object.keys(cfg.projects)) {
            if (!entries.has(name)) entries.set(name, path);
        }
    };
    label(config, "coffee.config.json");
    label(globalConfig, "~/.coffee.config.json");
    return entries;
}

/**
 * Read the top-level entries of BASE_SOURCE, returning visible and hidden folders
 * separately. Files at the top level are ignored.
 * @returns {{ visible: string[], hidden: string[] }}
 */
function readCollectionFolders() {
    if (!BASE_SOURCE || !existsSync(BASE_SOURCE)) return { visible: [], hidden: [] };
    const visible = [];
    const hidden = [];
    for (const item of readdirSync(BASE_SOURCE)) {
        const fullPath = join(BASE_SOURCE, item);
        try {
            if (!lstatSync(fullPath).isDirectory()) continue;
        } catch {
            continue;
        }
        if (item.startsWith(".")) {
            hidden.push(item);
        } else {
            visible.push(item);
        }
    }
    visible.sort();
    hidden.sort();
    return { visible, hidden };
}

export function showList() {
    if (!BASE_SOURCE) {
        showBaseSourceSetupMessage();
        return;
    }

    const displaySource = BASE_SOURCE.startsWith(process.env.HOME)
        ? "~" + BASE_SOURCE.slice(process.env.HOME.length)
        : BASE_SOURCE;

    console.log(`Coffee Collection — ${displaySource}`);

    const configProjects = collectConfigProjects();
    if (configProjects.size > 0) {
        console.log("");
        console.log("Config-defined projects:");
        const nameWidth = Math.max(...[...configProjects.keys()].map((k) => k.length));
        for (const [name, source] of configProjects) {
            console.log(`  ${name.padEnd(nameWidth)}  ${source}`);
        }
    }

    const { visible, hidden } = readCollectionFolders();
    if (visible.length > 0 || hidden.length > 0) {
        console.log("");
        console.log("Folders in collection:");
        for (const folder of hidden) {
            console.log(`  ${folder}  (symlink)`);
        }
        for (const folder of visible) {
            const tag = configProjects.has(folder) ? "(config + convention)" : "(convention)";
            console.log(`  ${folder}  ${tag}`);
        }
    }

    if (configProjects.size === 0 && visible.length === 0 && hidden.length === 0) {
        console.log("");
        console.log("Collection is empty.");
        console.log(`Add folders to ${displaySource} or define projects in a config file.`);
    }
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

/**
 * Recursively walk src and compare each file against dest, accumulating counts.
 * @param {string} src
 * @param {string} dest
 * @param {string} prefix
 * @param {{ adds: number, overwrites: number, skips: number }} counts
 */
function diffDir(src, dest, prefix, counts) {
    if (!existsSync(src)) return;
    for (const item of readdirSync(src)) {
        const srcPath = join(src, item);
        const destPath = join(dest, item);
        const label = prefix ? `${prefix}/${item}` : item;
        if (statSync(srcPath).isDirectory()) {
            diffDir(srcPath, destPath, label, counts);
        } else if (existsSync(destPath)) {
            console.log(`  ~ overwrite  ${label}`);
            counts.overwrites++;
        } else {
            console.log(`  + add        ${label}`);
            counts.adds++;
        }
    }
}

/**
 * @param {string} projectName
 * @param {object} activeConfig
 * @returns {boolean}
 */
function diffFromConfig(projectName, activeConfig) {
    const project = activeConfig.projects[projectName];
    const sourceRoot = join(BASE_SOURCE, project.source || projectName);
    if (!existsSync(sourceRoot)) {
        console.error(`Source not found: ${sourceRoot}`);
        return false;
    }
    const rules = project.copy || [];
    if (!rules.length) {
        console.error(`No copy rules defined for "${projectName}".`);
        return false;
    }
    console.log(`Diff — ${projectName} (config)`);
    console.log("");
    let adds = 0, overwrites = 0, skips = 0;
    for (const rule of rules) {
        const relFrom = rule.from || rule.path;
        const relTo = rule.to || relFrom;
        const src = join(sourceRoot, relFrom);
        const dest = join(TARGET, relTo);
        if (!existsSync(src)) {
            console.log(`  ? missing     ${relFrom} (not in collection)`);
            continue;
        }
        if (existsSync(dest) && rule.copyIfMissing) {
            console.log(`  = skip        ${relTo}`);
            skips++;
        } else if (existsSync(dest)) {
            console.log(`  ~ overwrite   ${relTo}`);
            overwrites++;
        } else {
            console.log(`  + add         ${relTo}`);
            adds++;
        }
    }
    console.log("");
    console.log(`${adds} to add, ${overwrites} to overwrite, ${skips} to skip`);
    return true;
}

/**
 * @param {string} projectName
 * @returns {boolean}
 */
function diffByConvention(projectName) {
    const source = join(BASE_SOURCE, projectName);
    if (!existsSync(source) || !statSync(source).isDirectory()) return false;
    console.log(`Diff — ${projectName} (convention)`);
    console.log("");
    const counts = { adds: 0, overwrites: 0, skips: 0 };
    diffDir(source, TARGET, "", counts);
    console.log("");
    console.log(`${counts.adds} to add, ${counts.overwrites} to overwrite, ${counts.skips} to skip`);
    return true;
}

/**
 * Preview what coffee install would do — no files are written.
 * @param {string} projectName
 * @returns {boolean}
 */
export function showDiff(projectName) {
    if (!isSafeName(projectName)) {
        console.error(`Invalid project name: "${projectName}"`);
        return false;
    }
    if (!ensureBaseSourceConfigured()) return false;
    const activeConfig =
        (config?.projects?.[projectName] ? config : null) ||
        (globalConfig?.projects?.[projectName] ? globalConfig : null);
    if (activeConfig) return diffFromConfig(projectName, activeConfig);
    if (diffByConvention(projectName)) return true;
    console.error(`Project "${projectName}" not found in config or collection.`);
    console.error(`Run \`coffee list\` to see available projects.`);
    return false;
}

// ─── Guards ───────────────────────────────────────────────────────────────────

/**
 * Ensure BASE_SOURCE is configured before any install command runs.
 * Prints setup instructions and returns false if not configured.
 * @returns {boolean}
 */
export function ensureBaseSourceConfigured() {
    if (BASE_SOURCE) return true;
    showBaseSourceSetupMessage();
    return false;
}

// ─── Install strategies ───────────────────────────────────────────────────────

/**
 * Recursively copy src into dest, skipping files that already exist.
 * @param {string} src
 * @param {string} dest
 */
export function copyMerge(src, dest) {
    if (!existsSync(src)) return;
    mkdirSync(dest, { recursive: true });
    for (const item of readdirSync(src)) {
        const srcPath = join(src, item);
        const destPath = join(dest, item);
        if (statSync(srcPath).isDirectory()) {
            copyMerge(srcPath, destPath);
        } else if (!existsSync(destPath)) {
            copyFileSync(srcPath, destPath);
            console.log(`  📄 copied ${item}`);
        } else {
            console.log(`  ⏭️  skip   ${item} (already exists)`);
        }
    }
}

/**
 * Strategy 1 — Config-based install.
 * Reads copy rules from coffee.config.json (cwd) or ~/.coffee.config.json.
 * Supports copyIfMissing (skip if dest exists) and override (force replace dir).
 * @param {string} projectName
 * @returns {boolean}
 */
export function installFromConfig(projectName) {
    if (!isSafeName(projectName)) {
        console.error(`Invalid project name: "${projectName}"`);
        return false;
    }

    const activeConfig =
        (config?.projects?.[projectName] ? config : null) ||
        (globalConfig?.projects?.[projectName] ? globalConfig : null);

    if (!activeConfig?.projects?.[projectName]) {
        console.error(`Project "${projectName}" not found in any config.`);
        return false;
    }

    const project = activeConfig.projects[projectName];
    const sourceRoot = join(BASE_SOURCE, project.source || projectName);

    if (!existsSync(sourceRoot)) {
        console.error(`Source not found: ${sourceRoot}`);
        return false;
    }

    const rules = project.copy || [];
    if (!rules.length) {
        console.error(`No copy rules defined for "${projectName}".`);
        return false;
    }

    console.log(`📦 Installing ${projectName}...`);

    for (const rule of rules) {
        const relFrom = rule.from || rule.path;
        const relTo = rule.to || relFrom;
        const src = join(sourceRoot, relFrom);
        const dest = join(TARGET, relTo);

        if (!existsSync(src)) {
            console.log(`  ⏭️  skip   ${relFrom} (source missing)`);
            continue;
        }

        try {
            if (statSync(src).isDirectory()) {
                if (rule.override && existsSync(dest)) {
                    rmSync(dest, { recursive: true, force: true });
                }
                mkdirSync(dest, { recursive: true });
                copyMerge(src, dest);
            } else {
                if (existsSync(dest) && rule.copyIfMissing) {
                    console.log(`  ⏭️  skip   ${relTo} (already exists)`);
                    continue;
                }
                mkdirSync(dirname(dest), { recursive: true });
                copyFileSync(src, dest);
                console.log(`  ✅ copied ${relTo}`);
            }
        } catch (e) {
            console.error(`  ❌ failed ${relTo}: ${e.message}`);
            return false;
        }
    }

    console.log(`✅ ${projectName} installed.`);
    return true;
}

/**
 * Strategy 2 — Convention-based install.
 * Copies the entire <baseSource>/<projectName>/ directory into cwd using copyMerge.
 * Used as fallback when no config rule is defined for the project.
 * @param {string} projectName
 * @returns {boolean}
 */
export function installProjectByConvention(projectName) {
    if (!isSafeName(projectName)) {
        console.error(`Invalid project name: "${projectName}"`);
        return false;
    }

    const source = join(BASE_SOURCE, projectName);
    if (!existsSync(source)) return false;

    if (!statSync(source).isDirectory()) {
        console.error(`Source is not a directory: ${source}`);
        return false;
    }

    console.log(`📦 Installing ${projectName} (convention)...`);
    try {
        copyMerge(source, TARGET);
    } catch (e) {
        console.error(`❌ Install failed: ${e.message}`);
        return false;
    }
    console.log(`✅ ${projectName} installed.`);
    return true;
}

/**
 * Resolve a folder name to its visible or hidden variant in BASE_SOURCE.
 * @param {string} folder
 * @param {boolean} preferHidden
 * @returns {{ sourceFolder: string, source: string }|null}
 */
function resolveSourceFolder(folder, preferHidden = true) {
    const hiddenFolder = "." + folder;
    const hiddenSource = join(BASE_SOURCE, hiddenFolder);
    const visibleSource = join(BASE_SOURCE, folder);

    if (preferHidden && existsSync(hiddenSource)) return { sourceFolder: hiddenFolder, source: hiddenSource };
    if (existsSync(visibleSource)) return { sourceFolder: folder, source: visibleSource };
    if (!preferHidden && existsSync(hiddenSource)) return { sourceFolder: hiddenFolder, source: hiddenSource };
    return null;
}

/**
 * Strategy 3 — Symlink install.
 * Creates a symlink in cwd pointing to <baseSource>/<folder> or <baseSource>/.<folder>.
 * Hidden folders (e.g. .tasks, .vscode) are preferred when both exist.
 * @param {string} folder
 * @returns {boolean}
 */
export function installFolder(folder) {
    if (!isSafeName(folder)) {
        console.error(`Invalid folder name: "${folder}"`);
        return false;
    }

    const resolvedSource = resolveSourceFolder(folder);
    if (!resolvedSource) {
        console.error(`Folder "${folder}" or ".${folder}" not found in base source.`);
        return false;
    }

    const { sourceFolder, source } = resolvedSource;
    const target = join(TARGET, sourceFolder);

    if (pathExistsOrSymlink(target)) {
        try {
            if (realpathSync(target) === source) {
                console.log(`${sourceFolder} already linked.`);
                return true;
            }
        } catch (e) {
            if (e.code !== "ENOENT") throw e;
        }
        if (resolve(target) === resolve(__dirname)) {
            console.error("Cannot overwrite script directory.");
            return false;
        }
        removeIfExists(target);
    }

    try {
        symlinkSync(source, target, "dir");
        console.log(`linked ${sourceFolder}`);
    } catch (e) {
        console.error(`Failed to symlink ${sourceFolder}: ${e.message}`);
        return false;
    }
    return true;
}

/**
 * Symlink multiple folders from BASE_SOURCE into cwd.
 * Intended for bulk setup of shared utility folders.
 * @param {string[]} folders
 */
export function installSymlinkFolders(folders) {
    for (const folder of folders) {
        const source = join(BASE_SOURCE, folder);
        const target = join(TARGET, folder);
        if (!existsSync(source)) {
            console.log(`skip ${folder} (not in base source)`);
            continue;
        }
        removeIfExists(target);
        try {
            symlinkSync(source, target, "dir");
            console.log(`linked ${folder}`);
        } catch (e) {
            console.error(`Failed to link ${folder}: ${e.message}`);
        }
    }
    console.log("Done.");
}
