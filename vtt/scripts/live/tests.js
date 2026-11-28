/*
 * Live tests, run inside a Foundry client by scripts/live.ts. Plain JS (it's evaluated in the page as-is). Each test
 * gets a fresh scratch scene with a caster and two enemies (no AC, Evasion, MR, or CR, so the numbers are exact),
 * casts things the way a player would, clicks the chat card's buttons, and checks what happened. Scenes and actors
 * are deleted afterwards; chat messages are kept.
 */
const TAG = "barbsLiveTest";
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check, what, ms = 15000) {
    const start = Date.now();
    for (;;) {
        const value = await check();
        if (value) return value;
        if (Date.now() - start > ms) throw new Error(`timed out waiting for ${what}`);
        await sleep(100);
    }
}
function assert(cond, message) {
    if (!cond) throw new Error(message);
}
function equal(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/* ---------- Fixture ---------- */

async function cleanup() {
    const scenes = game.scenes.filter((s) => s.getFlag("barbs", TAG));
    const actors = game.actors.filter((a) => a.getFlag("barbs", TAG));
    if (scenes.length) await Scene.deleteDocuments(scenes.map((s) => s.id));
    if (actors.length) await Actor.deleteDocuments(actors.map((a) => a.id));
}

/** No defenses, plenty of health and resources, so damage comes through exactly. */
const DEFENSELESS = { ac: 0, evasion: 0, magicResist: 0, conditionResist: 0 };

async function makeActor(name, type, extra = {}) {
    const actor = await Actor.create({
        name,
        type,
        flags: { barbs: { [TAG]: true } },
        system: { overrides: { ...DEFENSELESS, health: 1000, stamina: 1000, mana: 1000 } },
        ...extra,
    });
    // Resources start at their (new) maximum.
    await actor.update({ "system.resources.health.value": 1000, "system.resources.stamina.value": 1000, "system.resources.mana.value": 1000 });
    return actor;
}

async function fixture() {
    const scene = await Scene.create({
        name: "Barbs live test",
        width: 2000,
        height: 1400,
        padding: 0,
        grid: { size: 100, distance: 5, units: "ft" },
        flags: { barbs: { [TAG]: true } },
    });
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, "the scene to load");
    const caster = await makeActor("Caster", "character");
    const enemy1 = await makeActor("Enemy 1", "npc");
    const enemy2 = await makeActor("Enemy 2", "npc");
    const { FRIENDLY, HOSTILE } = CONST.TOKEN_DISPOSITIONS;
    // A row: caster at the left, enemies to the right, 15 ft apart.
    const place = async (actor, x, y, disposition) => {
        const data = (await actor.getTokenDocument({ x, y, disposition, actorLink: true })).toObject();
        const [doc] = await scene.createEmbeddedDocuments("Token", [data]);
        return until(() => canvas.tokens.get(doc.id), `${actor.name}'s token`);
    };
    const tokens = {
        caster: await place(caster, 200, 600, FRIENDLY),
        enemy1: await place(enemy1, 500, 600, HOSTILE),
        enemy2: await place(enemy2, 800, 600, HOSTILE),
    };
    return { scene, caster, enemy1, enemy2, tokens };
}

/** Give the actor an ability from the compendium (granting its class passive too), and return the owned item. */
async function learn(actor, className, abilityName) {
    const pack = game.packs.get("barbs.abilities");
    await pack.getIndex({ fields: ["system.className"] });
    const entry = pack.index.find((e) => e.name === abilityName && e.system?.className === className);
    assert(entry, `no ${className}/${abilityName} in the compendium`);
    const doc = await pack.getDocument(entry._id);
    const [item] = await actor.createEmbeddedDocuments("Item", [doc.toObject()]);
    return item;
}

/** Answer the ability's choices dialog with these values (merged over its defaults) instead of showing it. */
async function withChoices(values, fn) {
    const api = foundry.applications.api.DialogV2;
    const original = api.input;
    api.input = async (config) => {
        const form = document.createElement("form");
        form.innerHTML = config.content ?? "";
        const out = {};
        for (const el of form.querySelectorAll("[name]")) out[el.name] = el.type === "checkbox" ? el.checked : el.value;
        return { ...out, ...values };
    };
    try {
        return await fn();
    } finally {
        api.input = original;
    }
}

function target(...tokens) {
    canvas.tokens.setTargets(tokens.map((t) => t.id));
}

/** The newest chat message from a Barbs card for this source, once it exists. */
async function latestCard(sourcePart, after) {
    return until(
        () =>
            game.messages.contents
                .filter((m) => m.timestamp >= after && String(m.getFlag("barbs", "card")?.sourceName ?? "").includes(sourcePart))
                .sort((a, b) => a.timestamp - b.timestamp)
                .at(-1),
        `a ${sourcePart} card`,
    );
}
async function cards(sourcePart, after, count) {
    return until(() => {
        const found = game.messages.contents
            .filter((m) => m.timestamp >= after && String(m.getFlag("barbs", "card")?.sourceName ?? "").includes(sourcePart))
            .sort((a, b) => a.timestamp - b.timestamp);
        return found.length >= count ? found : null;
    }, `${count} ${sourcePart} card(s)`);
}

/** Click one of a chat card's buttons, like a user would (shift-click skips Evasion and CR rolls). */
async function click(message, action, { shift = true } = {}) {
    const button = await until(() => document.querySelector(`[data-message-id="${message.id}"] [data-card-action="${action}"]`), `the ${action} button on ${message.id}`);
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: shift }));
    // The handler marks the button busy while it runs.
    await sleep(50);
    await until(() => !button.dataset.busy, `${action} to finish`, 30000);
}

const health = (actor) => actor.system.derived?.resources?.health?.value ?? actor.system.resources.health.value;
const sum = (hit) => Object.values(hit).reduce((a, b) => a + (b ?? 0), 0);
const scaled = (hit, factor) => Object.values(hit).reduce((a, n) => a + Math.round((n ?? 0) * factor), 0);

/* ---------- Tests ---------- */

test("Apply does damage and the condition (Bola Shot)", async ({ caster, enemy1, tokens }) => {
    const item = await learn(caster, "Sniper", "Bola Shot");
    target(tokens.enemy1);
    const t0 = Date.now();
    await withChoices({ spotting: false }, () => caster.useAbility(item));
    const card = await latestCard("Bola Shot", t0);
    const hits = card.getFlag("barbs", "card").damage.hits;
    const before = health(enemy1);
    await click(card, "applyAll");
    await until(() => health(enemy1) < before, "Enemy 1 to take damage");
    equal(before - health(enemy1), hits.reduce((a, h) => a + sum(h), 0), "Enemy 1's damage");
    await until(() => enemy1.statuses.has("slowed"), "Enemy 1 to be Slowed");
});

test("The second target of Piercing Blow takes half", async ({ caster, enemy1, enemy2, tokens }) => {
    const item = await learn(caster, "Champion", "Piercing Blow");
    target(tokens.enemy1, tokens.enemy2);
    const t0 = Date.now();
    await withChoices({}, () => caster.useAbility(item));
    const card = await latestCard("Piercing Blow", t0);
    const flags = card.getFlag("barbs", "card");
    const [hit] = flags.damage.hits;
    const [b1, b2] = [health(enemy1), health(enemy2)];
    await click(card, "applyAll");
    await until(() => health(enemy2) < b2, "Enemy 2 to take damage");
    equal(b1 - health(enemy1), sum(hit), "the first target's damage");
    equal(b2 - health(enemy2), scaled(hit, 0.5), "the second target's damage");
});

test("Scatter Shards' bounce takes Alter Course's +50%", async ({ caster, enemy1, enemy2, tokens }) => {
    const item = await learn(caster, "Mirror Mage", "Scatter Shards");
    await until(() => caster.items.some((i) => i.type === "passive" && i.name === "Alter Course"), "the Alter Course passive");
    // Aim: shard 1 at Enemy 1, its bounce at Enemy 2, then skip the other two shards.
    const aims = [tokens.enemy1.center, tokens.enemy2.center, null];
    const original = canvas.regions.placeRegion;
    canvas.regions.placeRegion = async (data) => {
        const to = aims.shift();
        if (!to) return null;
        const from = data.shapes[0];
        return { shapes: [{ rotation: Math.toDegrees(Math.atan2(to.y - from.y, to.x - from.x)) }] };
    };
    const t0 = Date.now();
    try {
        await withChoices({ element: "ice" }, () => caster.useAbility(item));
    } finally {
        canvas.regions.placeRegion = original;
    }
    const card = await latestCard("Scatter Shards (shot 1)", t0);
    const flags = card.getFlag("barbs", "card");
    equal(flags.targets, [tokens.enemy1.document.uuid, tokens.enemy2.document.uuid], "shot 1's path");
    const [hit] = flags.damage.hits;
    const [b1, b2] = [health(enemy1), health(enemy2)];
    await click(card, "applyAll");
    await until(() => health(enemy2) < b2, "Enemy 2 to take damage");
    equal(b1 - health(enemy1), sum(hit), "the shard's first target");
    equal(b2 - health(enemy2), scaled(hit, 1.5), "the bounce target (+50%)");
});

test("A bonus that reads @target works on Apply", async ({ caster, enemy1, tokens }) => {
    // "+(target's level + 3) fire" is worked out per target when damage is applied.
    await caster.createEmbeddedDocuments("ActiveEffect", [
        {
            name: "Target-dependent bonus",
            system: { modifiers: [{ type: "damage", rollType: "all", damageType: "fire", weapon: "", value: "@target.level + 3", onCrit: false, conditions: "", key: "" }] },
        },
    ]);
    const item = await learn(caster, "Sniper", "Bola Shot");
    target(tokens.enemy1);
    const t0 = Date.now();
    await withChoices({ spotting: false }, () => caster.useAbility(item));
    const card = await latestCard("Bola Shot", t0);
    const before = health(enemy1);
    await click(card, "applyAll");
    await until(() => health(enemy1) < before, "Enemy 1 to take damage");
    const hits = card.getFlag("barbs", "card").damage.hits;
    equal(before - health(enemy1), hits.reduce((a, h) => a + sum(h), 0) + enemy1.system.derived.level + 3, "damage including the +(level + 3) fire");
});

/* ---------- Runner ---------- */

async function runTests(filter) {
    const results = [];
    await cleanup();
    for (const t of tests) {
        if (filter && !t.name.toLowerCase().includes(filter.toLowerCase())) continue;
        const start = Date.now();
        try {
            const fx = await fixture();
            await t.fn(fx);
            results.push({ name: t.name, ok: true, ms: Date.now() - start });
        } catch (err) {
            results.push({ name: t.name, ok: false, error: String(err?.stack ?? err).split("\n").slice(0, 4).join("\n"), ms: Date.now() - start });
        } finally {
            // Let floating damage numbers finish animating: deleting their tokens mid-animation throws in core.
            await sleep(1500);
            await cleanup().catch(() => {});
        }
    }
    return results;
}
