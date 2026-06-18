#!/usr/bin/env node

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import {
    BASE_SOURCE,
    config,
    globalConfig,
    ensureBaseSourceConfigured,
    installFolder,
    installFromConfig,
    installProjectByConvention,
    showConfigHelp,
    showHelp,
    showList,
    showVersion,
} from "./core.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

function fail(message) {
    console.error(`Error: ${message}`);
    process.exit(1);
}

if (!command || command === "help" || command === "--help" || command === "-h") {
    showHelp();
    process.exit(0);
}

if (command === "version" || command === "--version" || command === "-v") {
    showVersion();
    process.exit(0);
}

if (command === "config") {
    showConfigHelp();
    process.exit(0);
}

if (command === "list") {
    showList();
    process.exit(0);
}

if (command === "install") {
    if (!subcommand) {
        fail("Missing folder name. Usage: coffee-installer install <name>");
    }

    if (!ensureBaseSourceConfigured()) {
        process.exit(1);
    }

    const hasProjectInConfig = config?.projects?.[subcommand] || globalConfig?.projects?.[subcommand];
    if (hasProjectInConfig) {
        const ok = installFromConfig(subcommand);
        process.exit(ok ? 0 : 1);
    }

    const installerPath = join(__dirname, `install-${subcommand}.js`);
    if (existsSync(installerPath)) {
        const { default: mod } = await import(installerPath);
        mod();
        process.exit(0);
    }

    if (installProjectByConvention(subcommand)) {
        process.exit(0);
    }

    if (!installFolder(subcommand)) {
        console.error(`Checked base source: ${BASE_SOURCE}`);
        process.exit(1);
    }
    process.exit(0);
}

console.error(`Unknown command: "${command}"`);
console.error("Run `coffee-installer help` for available commands.");
process.exit(1);
