/**
 * Live tests: drive a real Foundry client in headless Chrome and test what the smoke test can't (cards, Apply,
 * sockets, the canvas). Logs into the running world as its GM, runs scripts/live/tests.js in the page, and prints
 * the results. Scenes and actors the tests make are deleted afterwards; their chat messages are kept to look at.
 *
 * Usage: node scripts/live.ts [filter]   (Foundry running with a Barbs world; FOUNDRY_URL, FOUNDRY_USER to override)
 */
import fs from "node:fs";
import path from "node:path";
import { launch } from "./live/cdp.ts";

const url = process.env.FOUNDRY_URL ?? "http://localhost:30000";
const userName = process.env.FOUNDRY_USER ?? "Gamemaster";
const filter = process.argv[2] ?? "";

const status = await fetch(`${url}/api/status`).then((r) => r.json()).catch(() => null);
if (!status?.active || status.system !== "barbs") {
    console.error(`No Barbs world running at ${url} (status: ${JSON.stringify(status)}).`);
    process.exit(2);
}

const page = await launch();
let failed = 0;
try {
    await page.navigate(`${url}/join`);
    await page.evaluate(`new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
            const select = document.querySelector("#join-username");
            if (select) return resolve(true);
            if (Date.now() - start > 15000) return reject(new Error("join form didn't appear"));
            setTimeout(tick, 100);
        };
        tick();
    })`);
    const joined = await page.evaluate<boolean>(`(() => {
        const select = document.querySelector("#join-username");
        const option = [...select.options].find((o) => o.textContent.trim() === ${JSON.stringify(userName)});
        if (!option) return false;
        select.value = option.value;
        document.querySelector("#join-password").value = ${JSON.stringify(process.env.FOUNDRY_PASSWORD ?? "")};
        document.querySelector('#join-game-form button[name="join"]').click();
        return true;
    })()`);
    if (!joined) throw new Error(`No user named ${userName}.`);

    // The join redirects to /game, which replaces the page (and any evaluation running in it), so poll from here.
    const start = Date.now();
    for (;;) {
        const state = await page.evaluate<string>(`location.pathname + "|" + !!window.game?.ready`, 5000).catch(() => "navigating|false");
        if (state === "/game|true") break;
        if (Date.now() - start > 90000) {
            console.error(`Foundry didn't become ready (${state}).\n${page.drainLogs().join("\n")}`);
            throw new Error("not ready");
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    const who = await page.evaluate<string>(`game.user.name + " (" + (game.user.isGM ? "GM" : "player") + "), world " + game.world.id + ", Barbs " + game.system.version`);
    console.log(`Logged in as ${who}.`);

    const tests = fs.readFileSync(path.join(import.meta.dirname, "live", "tests.js"), "utf8");
    const results = await page.evaluate<{ name: string; ok: boolean; error?: string; ms: number }[]>(
        `(async () => { ${tests}\n return await runTests(${JSON.stringify(filter)}); })()`,
        10 * 60000,
    );
    for (const r of results) {
        console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name} (${r.ms} ms)${r.error ? `\n     ${r.error.replace(/\n/g, "\n     ")}` : ""}`);
        if (!r.ok) failed++;
    }
    // Headless Chrome has no GPU, which Foundry warns about on every load.
    const logs = page.drainLogs().filter((l) => !/deprecat|compatibility|hardware acceleration/i.test(l));
    if (logs.length) console.log(`\nPage errors and warnings:\n${logs.map((l) => `  ${l}`).join("\n")}`);
    console.log(`\n${results.length - failed} passed, ${failed} failed.`);
} finally {
    await page.close();
}
process.exit(failed ? 1 : 0);
