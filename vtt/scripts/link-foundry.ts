/**
 * Symlink dist/ into Foundry's systems folder as "barbs", so Foundry loads the built system straight from this repo.
 *
 * Only dist/ is linked (not the whole project) so Foundry never sees node_modules, sources, or build scratch files.
 *
 * Usage: node scripts/link-foundry.ts [path-to-Foundry-Data]
 *   Defaults to $FOUNDRY_DATA, then the platform's default location (see foundry-paths.ts).
 *
 * On Windows this makes a directory junction rather than a symlink: junctions don't need admin rights or Developer
 * Mode, and Foundry can't tell the difference.
 */
import fs from "node:fs";
import path from "node:path";
import { defaultDataDir } from "./foundry-paths.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const dataDir = process.argv[2] ?? defaultDataDir();

const systemsDir = path.join(dataDir, "systems");
if (!fs.existsSync(systemsDir)) {
    console.error(`No systems folder at ${systemsDir}. Pass the Foundry Data path as an argument.`);
    process.exit(1);
}

const target = path.join(ROOT, "dist");
const link = path.join(systemsDir, "barbs");
fs.mkdirSync(target, { recursive: true });

const existing = fs.lstatSync(link, { throwIfNoEntry: false });
if (existing?.isSymbolicLink()) {
    const current = fs.readlinkSync(link);
    if (path.resolve(systemsDir, current) === target) {
        console.log(`Already linked: ${link} -> ${target}`);
        process.exit(0);
    }
    fs.unlinkSync(link);
} else if (existing) {
    console.error(`${link} exists and is not a symlink. Move it out of the way first.`);
    process.exit(1);
}

fs.symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");
console.log(`Linked ${link} -> ${target}`);
