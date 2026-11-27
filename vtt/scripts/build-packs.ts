/**
 * Build the compendium packs in dist/packs from the rulebook JSON in ../rulebook.
 *
 * The rulebook files stay the single source of truth (they also drive the rulebook website). This script converts
 * each entry into a Foundry Item document, writes them as JSON source files, and compiles those into the LevelDB
 * packs Foundry reads.
 *
 * Document ids are derived from a hash of the entry's type and name, so rebuilding is stable: links and drag-drops
 * that reference compendium entries keep working across rebuilds.
 *
 * Foundry holds a lock on pack databases while a world using them is open, so close the world before running this.
 *
 * Usage: node scripts/build-packs.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { ClassicLevel } from "classic-level";

const ROOT = path.resolve(import.meta.dirname, "..");
const RULEBOOK = path.resolve(ROOT, "..", "rulebook");
const SOURCE_DIR = path.join(ROOT, "build", "packs");
const OUT_DIR = path.join(ROOT, "dist", "packs");

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

const ID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Deterministic 16-character Foundry id from a seed string. */
function stableId(seed: string): string {
    const bytes = crypto.createHash("sha256").update(seed).digest();
    return Array.from(bytes.subarray(0, 16), (b) => ID_CHARS[b % ID_CHARS.length]).join("");
}

function readRulebook<T>(file: string): T {
    return JSON.parse(fs.readFileSync(path.join(RULEBOOK, file), "utf8")) as T;
}

/** Rulebook text is a mix of plain sentences and raw HTML fragments (lists). Wrap the plain parts in <p>. */
function toHtml(text: string | string[] | undefined): string {
    if (!text) return "";
    const parts = Array.isArray(text) ? text : [text];
    return parts.map((p) => (p.trim().startsWith("<") ? p : `<p>${p}</p>`)).join("");
}

const ATTRIBUTE_KEYS: Record<string, string> = Object.fromEntries(
    readRulebook<{ name: string; abbreviation: string }[]>("attributes.json").map((a) => [
        a.name.toLowerCase(),
        a.abbreviation.toLowerCase(),
    ]),
);

interface FoundryDoc {
    _id: string;
    _key: string;
    name: string;
    [key: string]: unknown;
}

function itemDoc(name: string, type: string, img: string, system: object, folder: string | null = null): FoundryDoc {
    const _id = stableId(`Item.${type}.${name}`);
    return { _id, _key: `!items!${_id}`, name, type, img, folder, system, effects: [], flags: {} };
}

function folderDoc(pack: string, name: string, sort: number): FoundryDoc {
    const _id = stableId(`Folder.${pack}.${name}`);
    return {
        _id,
        _key: `!folders!${_id}`,
        name,
        type: "Item",
        folder: null,
        sorting: "a",
        sort,
        color: null,
        flags: {},
    };
}

/* -------------------------------------------- */
/*  Icons                                       */
/* -------------------------------------------- */

// Core Foundry icons, picked by the first matching ability tag. Purely cosmetic.
const TAG_ICONS: [string, string][] = [
    ["fire", "icons/magic/fire/projectile-fireball-blue-purple.webp"],
    ["ice", "icons/magic/water/projectile-ice-chunk-blue.webp"],
    ["water", "icons/magic/water/projectile-arrow-cold-fire-blue.webp"],
    ["earth", "icons/magic/earth/projectile-boulder-debris.webp"],
    ["air", "icons/magic/air/air-wave-gust-blue.webp"],
    ["lightning", "icons/magic/lightning/bolt-beam-strike-blue.webp"],
    ["light", "icons/magic/light/projectile-beam-yellow.webp"],
    ["dark", "icons/magic/unholy/projectile-bolts-salvo-pink.webp"],
    ["heal", "icons/magic/life/heart-area-circle-red-green.webp"],
    ["defensive", "icons/magic/defensive/shield-barrier-blades-teal.webp"],
    ["shield", "icons/magic/defensive/shield-barrier-blades-teal.webp"],
    ["control", "icons/magic/control/hypnosis-mesmerism-eye-tan.webp"],
    ["psychic", "icons/magic/perception/eye-ringed-glow-angry-large-red.webp"],
    ["minion", "icons/creatures/abilities/paw-glowing-yellow.webp"],
    ["summoning", "icons/creatures/abilities/paw-glowing-yellow.webp"],
    ["alchemy", "icons/skills/toxins/bottle-open-vapors-pink.webp"],
    ["bow", "icons/skills/ranged/arrow-barbed-flying-gray.webp"],
    ["ranged", "icons/skills/ranged/arrow-barbed-flying-gray.webp"],
    ["dash", "icons/skills/movement/feet-bladed-boots-fire.webp"],
    ["melee", "icons/skills/melee/strike-axe-blood-red.webp"],
    ["physical", "icons/skills/melee/strike-axe-blood-red.webp"],
    ["buff", "icons/magic/symbols/runes-carved-stone-green.webp"],
    ["spell", "icons/magic/symbols/runes-carved-stone-green.webp"],
];

function abilityIcon(tags: string[]): string {
    const lower = tags.map((t) => t.toLowerCase());
    return TAG_ICONS.find(([tag]) => lower.includes(tag))?.[1] ?? "icons/svg/upgrade.svg";
}

/* -------------------------------------------- */
/*  Converters                                  */
/* -------------------------------------------- */

interface RulebookSkill {
    name: string;
    category: string;
    description: string;
    attribute: string;
    rank_notes: Record<string, string>;
}

function buildSkills(): FoundryDoc[] {
    const skills = readRulebook<RulebookSkill[]>("skills.json");
    const categories = [...new Set(skills.map((s) => s.category))].sort();
    const folders = new Map(categories.map((c, i) => [c, folderDoc("skills", c, i)]));
    const items = skills.map((s) => {
        const attribute = ATTRIBUTE_KEYS[s.attribute.toLowerCase()];
        if (!attribute) throw new Error(`Skill ${s.name} has unknown attribute ${s.attribute}`);
        return itemDoc(
            s.name,
            "skill",
            "icons/svg/book.svg",
            {
                category: s.category,
                attribute,
                points: 0,
                description: toHtml(s.description),
                rankNotes: Object.entries(s.rank_notes).map(([rank, text]) => ({ rank, text })),
            },
            folders.get(s.category)!._id,
        );
    });
    return [...folders.values(), ...items];
}

interface RulebookRace {
    name: string;
    description: string;
    traits: Record<string, string>;
}

function buildRaces(): FoundryDoc[] {
    return readRulebook<RulebookRace[]>("races.json").map((r) =>
        itemDoc(r.name, "race", "icons/svg/mystery-man.svg", {
            description: toHtml(r.description),
            traits: Object.entries(r.traits).map(([name, description]) => ({ name, description: toHtml(description) })),
        }),
    );
}

interface RulebookClass {
    name: string;
    preview: string;
    requirements: string[];
    all_reqs_known: boolean;
    description?: string;
    flavor_text?: string;
    branches?: Record<string, string>;
    passive?: Record<string, string>;
    abilities?: string[];
}

function buildClasses(): FoundryDoc[] {
    const classes = readRulebook<RulebookClass[]>("classes.json");
    // Most classes are only hints (requirements, no abilities yet). Keep them apart from the playable ones.
    const playable = folderDoc("classes", "Classes", 0);
    const hints = folderDoc("classes", "Class Hints", 1);
    const items = classes.map((c) => {
        const [passiveName, passiveText] = Object.entries(c.passive ?? {})[0] ?? ["", ""];
        return itemDoc(
            c.name,
            "class",
            "icons/svg/upgrade.svg",
            {
                abbreviation: "",
                preview: c.preview,
                description: toHtml(c.description),
                flavorText: toHtml(c.flavor_text),
                requirements: c.requirements,
                allRequirementsKnown: c.all_reqs_known,
                passive: { name: passiveName, description: toHtml(passiveText) },
                branches: Object.entries(c.branches ?? {}).map(([name, description]) => ({
                    name,
                    description: toHtml(description),
                })),
            },
            c.abilities?.length ? playable._id : hints._id,
        );
    });
    return [playable, hints, ...items];
}

interface RulebookAbility {
    name: string;
    class: string;
    branch: string;
    tier: number;
    action: string;
    cost: string;
    range: string;
    duration: string;
    description: string[];
    tags: string[];
    api?: { description: string; examples: string[] };
}

const SIMPLE_COST = /^(\d+)\s+(health|stamina|mana)$/i;

function buildAbilities(): FoundryDoc[] {
    const abilities = readRulebook<RulebookAbility[]>("abilities.json");
    const classNames = [...new Set(abilities.map((a) => a.class))].sort();
    const folders = new Map(classNames.map((c, i) => [c, folderDoc("abilities", c, i)]));
    const items = abilities.map((a) => {
        const match = SIMPLE_COST.exec(a.cost.trim());
        const api = a.api;
        let notes = "";
        if (api && api.description && api.description !== "No special notes.") {
            notes = toHtml(api.description);
            if (api.examples.length) notes += `<p>Examples: ${api.examples.map((e) => `<code>${e}</code>`).join(", ")}</p>`;
        }
        // Ability names are only unique within a class, so include the class in the id seed.
        const doc = itemDoc(
            a.name,
            "ability",
            abilityIcon(a.tags),
            {
                className: a.class,
                branch: a.branch,
                tier: a.tier,
                action: a.action,
                cost: {
                    text: a.cost,
                    value: match ? Number(match[1]) : null,
                    resource: match ? match[2].toLowerCase() : "",
                },
                range: a.range,
                duration: a.duration,
                description: toHtml(a.description),
                tags: a.tags,
                notes,
            },
            folders.get(a.class)!._id,
        );
        doc._id = stableId(`Item.ability.${a.class}.${a.name}`);
        doc._key = `!items!${doc._id}`;
        return doc;
    });
    return [...folders.values(), ...items];
}

/* -------------------------------------------- */
/*  Sample equipment                            */
/* -------------------------------------------- */

/**
 * A few basic weapons following the rulebook's crafting blueprints, so physical abilities have something to scale
 * off. These are samples, not rulebook data: real gear comes from crafting and loot.
 */
function buildEquipment(): FoundryDoc[] {
    const weapon = (
        name: string,
        img: string,
        slot: string,
        weapon: { category: string; damage: string; scaling: string; critChance?: number; critModifier?: number },
        description: string,
        effects: { name: string; modifiers: object[] }[] = [],
    ) => {
        const doc = itemDoc(name, "equipment", img, {
            slot,
            equipped: false,
            quantity: 1,
            weight: 0,
            description: toHtml(description),
            weapon: { damageType: "physical", critChance: 0, critModifier: 100, ...weapon },
        });
        doc.effects = effects.map((e) => {
            const _id = stableId(`ActiveEffect.${name}.${e.name}`);
            return {
                _id,
                _key: `!items.effects!${doc._id}.${_id}`,
                name: e.name,
                img,
                transfer: true,
                disabled: false,
                system: { changes: [], category: "", singleUse: false, modifiers: e.modifiers },
                flags: {},
            };
        });
        return doc;
    };
    return [
        weapon(
            "Longsword",
            "icons/weapons/swords/sword-guard-steel-green.webp",
            "mainHand",
            { category: "longblade", damage: "1d8", scaling: "melee" },
            "Sample weapon. A basic Longblades blueprint: d8 physical damage, Strength scaling.",
        ),
        weapon(
            "Longbow",
            "icons/weapons/bows/longbow-recurve.webp",
            "twoHand",
            { category: "bow", damage: "1d8", scaling: "rangedFine" },
            "Sample weapon. A basic bow: d8 physical damage, Dexterity scaling.",
        ),
        weapon(
            "Dagger",
            "icons/weapons/daggers/dagger-straight-blue.webp",
            "mainHand",
            { category: "shortblade", damage: "1d4", scaling: "none", critChance: 10, critModifier: 100 },
            "Sample weapon. The rulebook's dagger blueprint: d4 physical damage, 10% critical strike chance, " +
                "100% critical strike modifier, no scaling.",
        ),
    ];
}

/* -------------------------------------------- */
/*  Main                                        */
/* -------------------------------------------- */

const PACKS: Record<string, () => FoundryDoc[]> = {
    skills: buildSkills,
    races: buildRaces,
    classes: buildClasses,
    abilities: buildAbilities,
    equipment: buildEquipment,
};

/**
 * Deleting a pack directory succeeds even while Foundry has it open, which leaves a running world reading a
 * half-rebuilt database. LevelDB takes an exclusive lock, so try to open each existing pack first and bail if
 * anything already holds it.
 */
async function assertPacksUnlocked(): Promise<void> {
    for (const pack of Object.keys(PACKS)) {
        const dir = path.join(OUT_DIR, pack);
        if (!fs.existsSync(dir)) continue;
        const db = new ClassicLevel(dir);
        try {
            await db.open();
        } catch (err) {
            const code = (err as { code?: string; cause?: { code?: string } }).cause?.code ?? (err as { code?: string }).code;
            if (code === "LEVEL_LOCKED") {
                console.error(`packs/${pack} is locked, probably by a running world. Return to Foundry's setup screen and retry.`);
                process.exit(1);
            }
            throw err;
        } finally {
            await db.close();
        }
    }
}

await assertPacksUnlocked();

for (const [pack, build] of Object.entries(PACKS)) {
    const docs = build();
    const ids = new Set<string>();
    for (const doc of docs) {
        if (ids.has(doc._id)) throw new Error(`Duplicate id ${doc._id} for "${doc.name}" in ${pack}`);
        ids.add(doc._id);
    }

    const srcDir = path.join(SOURCE_DIR, pack);
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.mkdirSync(srcDir, { recursive: true });
    for (const doc of docs) {
        const fileName = `${doc.name.replace(/[^a-zA-Z0-9]+/g, "_")}_${doc._id}.json`;
        fs.writeFileSync(path.join(srcDir, fileName), JSON.stringify(doc, null, 2));
    }

    const outDir = path.join(OUT_DIR, pack);
    fs.rmSync(outDir, { recursive: true, force: true });
    await compilePack(srcDir, outDir);
    const folders = docs.filter((d) => d._key.startsWith("!folders!")).length;
    console.log(`packs/${pack}: ${docs.length - folders} items, ${folders} folders`);
}
