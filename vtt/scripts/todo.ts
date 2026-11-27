/**
 * Lists rulebook abilities and class passives that have no automation entry yet.
 * Usage: npm run todo
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import { defaultAppDir } from "./foundry-paths.ts";

const FOUNDRY_APP = defaultAppDir();
const foundry = await import(pathToFileURL(path.join(FOUNDRY_APP, "common", "server.mjs")).href);
Object.assign(globalThis, { foundry, CONFIG: { Actor: { dataModels: {} }, Item: { dataModels: {} }, Token: { movement: { actions: {} } } } });

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
    const { ABILITY_AUTOMATION } = await vite.ssrLoadModule("/src/abilities/catalog.ts");
    const { PASSIVE_AUTOMATION } = await vite.ssrLoadModule("/src/passives/catalog.ts");
    const rulebook = path.resolve(import.meta.dirname, "..", "..", "rulebook");
    const abilities = JSON.parse(fs.readFileSync(path.join(rulebook, "abilities.json"), "utf8")) as {
        class: string;
        name: string;
        description: string[];
    }[];
    const classes = JSON.parse(fs.readFileSync(path.join(rulebook, "classes.json"), "utf8")) as {
        name: string;
        passive?: Record<string, string>;
    }[];

    const missing = abilities.filter((a) => !ABILITY_AUTOMATION[`${a.class}/${a.name}`]);
    for (const a of missing) console.log(`${a.class}/${a.name} :: ${a.description.join(" ").slice(0, 200)}`);
    console.log("\nPASSIVES");
    let passives = 0;
    for (const cls of classes) {
        for (const [passive, text] of Object.entries(cls.passive ?? {})) {
            if (PASSIVE_AUTOMATION[`${cls.name}/${passive}`]) continue;
            passives++;
            console.log(`${cls.name}/${passive} :: ${text.slice(0, 200)}`);
        }
    }
    console.log(`\n${missing.length} of ${abilities.length} abilities and ${passives} passives not automated.`);
} finally {
    await vite.close();
}
