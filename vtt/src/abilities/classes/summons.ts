/**
 * Summons, minions, constructs, organisms, golems, and totems. Each entry's `summon` is the creature's stat block;
 * `summonActions` automate what it can do (they become abilities on the summoned actor). See ../catalog.ts.
 *
 * Immunity to a damage type is modeled as -100% vulnerability to it.
 */
import { around, bleed, burst, cone, count, line, pick, poison, spell, square, stat, statPercent, status, strike, vulnerable } from "../helpers.ts";
import type { DamageType } from "../../config.ts";
import type { AbilityAutomation, EffectSpec, SummonSpec } from "../types.ts";

const immune = (types: ("all" | "magic" | DamageType)[], name = "Immunities"): EffectSpec => ({
    name,
    category: "",
    changes: types.map((t) => vulnerable(t, -100)),
});

const aura = (text: string): EffectSpec => ({ name: "Aura", category: "", description: `<p>${text}</p>` });

/** Minor-action buff/debuff pair the juvenile dragons share. */
function dragonMinor(buff: EffectSpec, debuff: EffectSpec): Record<string, AbilityAutomation> {
    return {
        "Rally allies": { area: { shape: "battlefield", affects: "allies" }, target: [{ ...buff, duration: "1 minute", maxStacks: Infinity }] },
        "Menace enemies": { area: { shape: "battlefield" }, target: [{ ...debuff, duration: "1 minute", maxStacks: Infinity }] },
    };
}

const DRAGON_MINOR_ACTIONS = [
    { name: "Rally allies", action: "Minor Action", description: "Buff all other allies for 1 minute, stacking and refreshing." },
    { name: "Menace enemies", action: "Minor Action", description: "Debuff all enemies for 1 minute, stacking and refreshing." },
];

function bronzeDragon(): SummonSpec {
    return {
        name: "Bronze Dragon",
        img: "icons/creatures/reptiles/dragon-horned-blue.webp",
        size: 2,
        stats: { health: 200, ac: 20, evasion: 80, magicResist: 20, conditionResist: 30, speed: 80 },
        description: "Juvenile bronze dragon, flying. A superior hunter: given a magical signature, it can track anyone on a plane.",
        actions: [
            { name: "Claws", action: "Major Action", description: "10d10 physical damage to a single target in melee range." },
            { name: "Breath", action: "Major Action", description: "10d12 lightning magic damage in a 200 ft line." },
            ...DRAGON_MINOR_ACTIONS,
        ],
    };
}

function silverDragon(): SummonSpec {
    return {
        name: "Silver Dragon",
        img: "icons/creatures/reptiles/dragon-horned-blue.webp",
        size: 2,
        stats: { health: 250, ac: 30, evasion: 30, magicResist: 70, conditionResist: 40, speed: 70 },
        description: "Juvenile silver dragon, flying. A master of arcane practice that can study, tamper with, or destroy magic.",
        actions: [
            { name: "Tail", action: "Major Action", description: "8d10 physical damage to all enemies in melee range." },
            { name: "Breath", action: "Major Action", description: "12d8 ice magic damage in an 80 ft cone." },
            ...DRAGON_MINOR_ACTIONS,
        ],
    };
}

function goldDragon(): SummonSpec {
    return {
        name: "Gold Dragon",
        img: "icons/creatures/reptiles/dragon-winged-blue.webp",
        size: 2,
        stats: { health: 300, ac: 80, evasion: 30, magicResist: 50, conditionResist: 50, speed: 75 },
        description:
            "Juvenile gold dragon, flying. Its fire ignores 100% MR. With it, you and your allies can't fail Beast Mastery or Interaction checks, and you get 5 Commands per Command Action.",
        actions: [
            { name: "Breath", action: "Major Action", description: "10d12 fire magic damage in a 45 ft square within 120 ft, leaving a field of fire for 1 minute." },
            ...DRAGON_MINOR_ACTIONS,
        ],
    };
}

const BRONZE_ACTIONS = {
    Claws: { attack: strike("10d10", { scaling: "none" }) },
    Breath: { area: line(200), attack: spell("10d12", "lightning", { scaling: "none" }) },
    ...dragonMinor(
        {
            name: "Bronze Dragon's rally",
            category: "buff",
            changes: [stat("speed", 10)],
            modifiers: [{ type: "penetration", rollType: "physical", damageType: "physical", value: 10 }],
        },
        { name: "Bronze Dragon's menace", category: "condition", changes: [stat("speed", -10), vulnerable("physical", 10)] },
    ),
} satisfies Record<string, AbilityAutomation>;

const SILVER_ACTIONS = {
    Tail: { area: around(5), attack: strike("8d10", { scaling: "none" }) },
    Breath: { area: cone(80), attack: spell("12d8", "ice", { scaling: "none" }) },
    ...dragonMinor(
        {
            name: "Silver Dragon's rally",
            category: "buff",
            changes: [stat("conditionResist", 10)],
            modifiers: [{ type: "penetration", rollType: "all", damageType: "allMagic", value: 10 }],
        },
        { name: "Silver Dragon's menace", category: "condition", changes: [stat("conditionResist", -10), vulnerable("magic", 10)] },
    ),
} satisfies Record<string, AbilityAutomation>;

const GOLD_ACTIONS = {
    Breath: {
        area: square(45),
        attack: spell("10d12", "fire", { scaling: "none", ignoreMR: true }),
        notes: ["Leaves a field of fire for 1 minute: 60 fire damage (ignoring MR) to entities that start/end their turn in it, or enter/leave it."],
    },
    ...dragonMinor(
        { name: "Gold Dragon's rally", category: "buff", modifiers: [{ type: "multiplier", rollType: "all", damageType: "all", value: 20 }] },
        { name: "Gold Dragon's menace", category: "condition", changes: [vulnerable("all", 20)] },
    ),
} satisfies Record<string, AbilityAutomation>;

export const SUMMONS: Record<string, AbilityAutomation> = {
    /* ---------- Elemental summons ---------- */

    "Aeromancer/Summon Wyvern": {
        summon: {
            name: "Wyvern",
            img: "icons/creatures/reptiles/dragon-winged-blue.webp",
            stats: { health: 100, ac: 20, evasion: 50, magicResist: 50, speed: 50 },
            description: "Flies. Innately 100% vulnerable to attacks from bows and crossbows. Obeys your Commands; otherwise flies at enemies.",
            actions: [
                { name: "Claw", action: "Major Action", description: "Melee claw attack for 5d10 physical damage." },
                { name: "Breath", action: "Major Action", description: "30 ft cone breath for 10d8 air magic damage (33% recharge)." },
            ],
        },
        summonActions: {
            Claw: { attack: strike("5d10", { scaling: "none" }) },
            Breath: {
                rolls: { recharge: "1d100" },
                area: cone(30),
                attack: spell("10d8", "air", { scaling: "none" }),
                notes: (ctx) => [ctx.rolls.recharge <= 33 ? "Breath recharges (33%)." : "Breath does not recharge this time."],
            },
        },
    },
    "Aquamancer/Summon Water Weird": {
        summon: {
            name: "Water Weird",
            img: "icons/creatures/slimes/slime-movement-pseudopods-green.webp",
            size: 2,
            stats: { health: 100, evasion: 50, magicResist: 50, conditionResist: 100 },
            effects: [immune(["physical"], "Immune to physical damage")],
            description: "Large, water element affinity. Obeys your Commands; otherwise approaches nearby enemies.",
            actions: [
                { name: "Swipe", action: "Major Action", description: "10d6 physical damage to all adjacent enemies, pushing them back 20 ft." },
                { name: "Water Blast", action: "Major Action", description: "12d6 water magic damage in a 15 ft square within 60 ft, inflicting stacking 20% water vulnerability." },
                { name: "Protect", action: "Reaction", description: "Block an attack targeting an adjacent ally." },
            ],
        },
        summonActions: {
            Swipe: { area: around(5), attack: strike("10d6", { scaling: "none" }), notes: ["Push targets back 20 ft."] },
            "Water Blast": {
                area: square(15),
                attack: spell("12d6", "water", { scaling: "none" }),
                target: [{ name: "Water vulnerability (20%)", category: "condition", maxStacks: Infinity, changes: [vulnerable("water", 20)] }],
            },
            Protect: { notes: ["Block an attack targeting an adjacent ally."] },
        },
    },
    "Lightning Duelist/Ball Lightning": {
        area: burst(5),
        attack: spell("4d12", "lightning"),
        summon: {
            name: "Ball Lightning",
            img: "icons/magic/lightning/orb-ball-blue.webp",
            stats: { health: 1 },
            effects: [immune(["all"], "Object")],
            description: "At the start of each of your turns it travels 20 ft in a random direction, then discharges. Concentration.",
            actions: [{ name: "Discharge", description: "2d12 lightning magic damage to all adjacent targets." }],
        },
        summonActions: { Discharge: { area: around(5, "all"), attack: spell("2d12", "lightning", { scaling: "none" }) } },
        notes: ["Place the area where the ball appears: adjacent enemies take the initial 4d12."],
    },
    "Dynamancer/Lightning Rod": {
        area: square(25),
        attack: spell("3d12", "lightning"),
        summon: {
            name: "Lightning Rod",
            img: "icons/magic/lightning/bolt-strike-blue.webp",
            stats: { health: 1 },
            description: "Totem. Whenever a lightning spell is cast within 100 ft, it discharges.",
            actions: [{ name: "Discharge", description: "d12 to 3d12 lightning magic damage to all enemies within 25 ft." }],
        },
        summonActions: { Discharge: { area: around(25), attack: spell("(1d3)d12", "lightning", { scaling: "none" }) } },
    },

    /* ---------- Dragoncaller ---------- */

    "Dragoncaller/Summon Bronze Dragon": { summon: bronzeDragon(), summonActions: BRONZE_ACTIONS },
    "Dragoncaller/Summon Silver Dragon": { summon: silverDragon(), summonActions: SILVER_ACTIONS },
    "Dragoncaller/Summon Gold Dragon": { summon: goldDragon(), summonActions: GOLD_ACTIONS },
    "Dragoncaller/Dragonstorm": {
        rolls: { dragon: "1d3" },
        summon: (ctx) => ({ ...[bronzeDragon(), silverDragon(), goldDragon()][Math.clamp(ctx.rolls.dragon, 1, 3) - 1], duration: "1 minute" }),
        summonActions: { ...BRONZE_ACTIONS, Tail: SILVER_ACTIONS.Tail },
        notes: [
            "Concentration on the portal. A random dragon emerges at the start of each of your turns; use the ability again then (no cost) for the next one.",
        ],
    },

    /* ---------- Dark summons ---------- */

    "Noxomancer/Fiendish Circle": {
        choices: [count("extra", "Extra imps (+20 mana each, up to 3, concentration)", 3)],
        cost: (ctx) => ({ resource: "mana", amount: 40 + 20 * Math.min(3, Number(ctx.choices.extra)) }),
        summon: (ctx) => ({
            name: "Imp",
            img: "icons/creatures/magical/humanoid-horned-rider.webp",
            count: 1 + Math.min(3, Number(ctx.choices.extra)),
            stats: { health: 50, speed: 40 },
            description: "Follows your Command Actions; otherwise moves toward enemies.",
            actions: [
                { name: "Claw", action: "Major Action", description: "Melee attack for 4d10 dark magic damage." },
                { name: "Drink potion", action: "Minor Action", description: "Drink any potion it's carrying." },
            ],
        }),
        summonActions: { Claw: { attack: spell("4d10", "dark", { scaling: "none" }) }, "Drink potion": { notes: ["Drinks a carried potion."] } },
    },
    "Reaper/Harvester of Life": {
        summon: {
            name: "Harvester",
            img: "icons/magic/death/undead-ghost-scream-teal.webp",
            stats: { health: 50, evasion: 100, speed: 40 },
            copyWeapon: true,
            description:
                "Flies, passes through mundane walls. Telepathically shares what it sees and hears. Its scythe kills count for Ferryman of the Dead.",
            actions: [{ name: "Terrify", action: "Minor Action", description: "Inflict Fear on a random target within 30 ft." }],
        },
        summonActions: { Terrify: { target: [status("fear")] } },
        notes: ["It attacks with a copy of your scythe (in its inventory)."],
    },
    "Dark Duelist/Shadow Puppet": {
        summon: {
            name: "Shadow",
            img: "icons/magic/unholy/silhouette-evil-horned-giant.webp",
            stats: { health: 1 },
            effects: [immune(["all"], "Immune to damage and conditions")],
            copyWeapon: true,
            description:
                "At the start of your turn it teleports to and attacks an enemy within 80 ft as if you autoattacked, inflicting on-hits and a Scar. It can use your greatsword abilities or dark spells instead (you pay their costs). Concentration.",
        },
    },

    /* ---------- Summoner ---------- */

    "Summoner/Summon Unseen Servant": {
        summon: {
            name: "Unseen Servant",
            img: "icons/magic/perception/silhouette-stealth-shadow.webp",
            stats: { health: 1, speed: 30 },
            effects: [status("invisible", { resistible: false })],
            description:
                "Naturally invisible. Uses tools and makes Athletics, Gathering, Item Use, Observation, Stealth, and Transportation checks at +25.",
        },
    },
    "Summoner/Summon Batusan Golem": {
        summon: {
            name: "Batusan Golem",
            img: "icons/creatures/magical/construct-stone-earth-gray.webp",
            stats: { health: 60, speed: 30, ac: 30, magicResist: 50, conditionResist: 40 },
            effects: [aura("20 ft aura: allies' AC increased by 30%.")],
            actions: [
                { name: "Slam", action: "Major Action", description: "Melee multi-target attack, knocking enemies back 20 ft away from you." },
                { name: "Guard", action: "Reaction", description: "Block one attack or AOE hit on you." },
            ],
        },
        summonActions: {
            Slam: { area: around(5), notes: ["The rulebook doesn't give its damage. Knock targets back 20 ft from the summoner."] },
            Guard: { notes: ["Block one attack or AOE hit on the summoner."] },
        },
    },
    "Summoner/Summon Ascarion Beast": {
        summon: {
            name: "Ascarion Beast",
            img: "icons/creatures/mammals/beast-horned-scaled-glowing-orange.webp",
            stats: { health: 30, speed: 40, ac: 10, evasion: 20, magicResist: 20, conditionResist: 20 },
            effects: [aura("20 ft aura: allies' attacks ignore 20% of their targets' CR.")],
            actions: [{ name: "Bite", action: "Major Action", description: "4d6 physical damage, On Hit: inflict 2d6 Poison." }],
        },
        summonActions: { Bite: { attack: strike("4d6", { scaling: "none" }), target: [poison("2d6")] } },
    },
    "Summoner/Summon Estian Wayfinder": {
        summon: {
            name: "Estian Wayfinder",
            img: "icons/magic/perception/eye-ringed-glow-angry-small-teal.webp",
            stats: { health: 30, speed: 150, evasion: 100, conditionResist: 50 },
            effects: [
                aura(
                    "150 ft aura: allies, mounts, and vehicles have doubled Move Speed; allies have +30 to Psionics: Defense; allies can't be charmed, Feared, Confused, or put to Sleep.",
                ),
            ],
            description: "A guide to nearly any location on a plane that isn't a well-kept secret.",
        },
    },
    "Summoner/Summon Noxian Seraph": {
        summon: {
            name: "Noxian Seraph",
            img: "icons/magic/holy/angel-winged-humanoid-blue.webp",
            stats: { health: 50, speed: 40, ac: 10, magicResist: 50, conditionResist: 70 },
            effects: [aura("20 ft aura: allies' MR increased by 30%.")],
            actions: [
                { name: "Heal", action: "Major Action", description: "Heal its summoner for 5d10." },
                { name: "Cleanse", action: "Minor Action", description: "Cleanse 1 random condition on its summoner." },
            ],
        },
        summonActions: { Heal: { heal: { formula: "5d10" } }, Cleanse: { notes: ["Cleanse 1 random condition on the summoner."] } },
    },
    "Summoner/Summon Asiok Dracolord": {
        summon: {
            name: "Asiok Dracolord",
            img: "icons/creatures/reptiles/dragon-horned-blue.webp",
            stats: { health: 50, speed: 40, ac: 40, magicResist: 30, conditionResist: 30 },
            effects: [aura("20 ft aura: allies' damage increased by 30%.")],
            actions: [{ name: "Firebreath", action: "Major Action", description: "6d10 fire magic damage in a 30 ft cone. Double damage to constructs and buildings." }],
        },
        summonActions: { Firebreath: { area: cone(30), attack: spell("6d10", "fire", { scaling: "none" }) } },
    },
    "Summoner/Summon Xat'hul Charmspirit": {
        summon: {
            name: "Xat'hul Charmspirit",
            img: "icons/magic/nature/wolf-paw-glow-large-green.webp",
            stats: { health: 10, speed: 60 },
            effects: [aura("5 ft aura: allies +25 to Artistry and Interaction checks, +10% Health Regeneration, and automatically stabilize if downed.")],
            description: "Imprints on a humanoid of your choice, granting a random benefit, and senses sources of mana within 1 mile.",
        },
    },
    "Summoner/Summon Vilyrian Spellmaster": {
        summon: {
            name: "Vilyrian Spellmaster",
            img: "icons/magic/symbols/runes-star-pentagon-blue.webp",
            stats: { health: 40, speed: 30, magicResist: 70, conditionResist: 20 },
            effects: [aura("20 ft aura: allies' CR increased by 20%.")],
            actions: [
                { name: "Dispel", action: "Major Action", description: "Dispel a non-allied magical field or effect it's adjacent to or inside of." },
                { name: "Counterspell", action: "Reaction", description: "Counter an enemy spell cast within 50 ft." },
            ],
        },
        summonActions: { Dispel: { notes: ["Dispel an adjacent non-allied field or effect."] }, Counterspell: { notes: ["Counter the triggering spell."] } },
    },
    "Summoner/Summon Throatslitter Demon": {
        summon: {
            name: "Throatslitter Demon",
            img: "icons/creatures/unholy/demon-horned-winged-laughing.webp",
            stats: { health: 50, speed: 50, evasion: 70, magicResist: 20, critChance: 50 },
            effects: [
                {
                    name: "Killer",
                    category: "",
                    modifiers: [
                        { type: "penetration", rollType: "physical", damageType: "physical", value: 100 },
                        { type: "critDamage", rollType: "physical", value: 100 },
                    ],
                },
                aura("20 ft aura: allies' crit chance +15%."),
            ],
            actions: [
                { name: "Slash", action: "Major Action", description: "Melee attack for 6d6 physical damage." },
                { name: "Sneak", action: "Minor Action", description: "Sneak check at +20." },
            ],
        },
        summonActions: { Slash: { attack: strike("6d6", { scaling: "none" }) }, Sneak: { notes: ["Sneak check with a +20 bonus."] } },
    },
    "Summoner/Summon Watcher": {
        summon: {
            name: "Watcher",
            img: "icons/magic/perception/eye-tendrils-web-purple.webp",
            stats: { health: 1 },
            effects: [immune(["all"], "Immune to all damage and conditions")],
            description:
                "Guards everything within 100 ft with true sight through walls; telepathically reports to you, blocks scrying and teleportation, and can phase the area into a pocket realm for 1 hour. Allies resting under its guard get +30% regeneration (short rest) or prophetic dreams (long rest).",
        },
    },
    "Summoner/Summon Warpwurm": {
        summon: {
            name: "Warpwurm",
            img: "icons/creatures/tentacles/tentacle-eyes-yellow-pink.webp",
            stats: { health: 50 },
            effects: [aura("20 ft aura: allies are spatially locked to this plane and can't be banished or teleported.")],
            actions: [
                { name: "Portals", action: "Major Action", description: "Create up to 2 linked portals in empty spaces within 100 ft." },
                { name: "Rescue", action: "Reaction", description: "Teleport an ally out of danger." },
            ],
        },
        summonActions: { Portals: { notes: ["Create up to 2 linked portals within 100 ft."] }, Rescue: { notes: ["Teleport an ally out of danger."] } },
    },
    "Summoner/Summon Siretsu Leviathan": {
        summon: {
            name: "Siretsu Leviathan",
            img: "icons/creatures/fish/deepsea-creature-glowing-blue.webp",
            size: 4,
            stats: { health: 200, speed: 100, ac: 50, magicResist: 50, conditionResist: 50 },
            effects: [aura("100 ft aura: drains 30 stamina and 30 mana from each enemy.")],
            actions: [
                { name: "Tidal Waves", action: "Major Action", description: "10d10 water magic damage in a 45 ft square within 100 ft." },
                { name: "Devour", action: "Minor Action", description: "Grapple up to 4 enemies, or devour grappled ones for 10d10 physical and banish them to Siretsu." },
            ],
        },
        summonActions: {
            "Tidal Waves": { area: square(45), attack: spell("10d10", "water", { scaling: "none" }) },
            Devour: { attack: strike("10d10", { scaling: "none" }), notes: ["Only against grappled enemies; they're banished to Siretsu."] },
        },
    },

    /* ---------- Bioengineer organisms ---------- */

    "Bioengineer/Amalgam Hunter": {
        summon: {
            name: "Hunter organism",
            img: "icons/creatures/mammals/beast-horned-scaled-glowing-orange.webp",
            stats: { health: 30, speed: 30 },
            description: "Acts on your turn. Obeys Commands; otherwise attacks the closest enemy.",
            actions: [
                { name: "Maul", action: "Major Action", description: "3d12 physical damage to targets in melee range." },
                { name: "Regenerate", action: "Minor Action", description: "Heal itself for 20 HP." },
            ],
        },
        summonActions: { Maul: { attack: strike("3d12", { scaling: "none" }) }, Regenerate: { heal: { formula: "20", self: true } } },
    },
    "Bioengineer/Amalgam Artillery": {
        summon: {
            name: "Artillery organism",
            img: "icons/creatures/invertebrates/spider-mandibles-brown.webp",
            stats: { health: 20, speed: 10 },
            actions: [
                { name: "Spit", action: "Major Action", description: "3d12 physical damage to a target up to 60 ft away." },
                { name: "Mark", action: "Minor Action", description: "Mark a target within 60 ft, decreasing its evasion by 20%." },
            ],
        },
        summonActions: {
            Spit: { attack: strike("3d12", { scaling: "none" }) },
            Mark: { target: [{ name: "Artillery mark (-20% EV)", category: "condition", changes: [stat("evasion", -20)] }] },
        },
    },
    "Bioengineer/Amalgam Trapper": {
        summon: {
            name: "Trapper organism",
            img: "icons/creatures/invertebrates/spider-web-black.webp",
            stats: { health: 40, speed: 70 },
            actions: [
                { name: "Grapple", action: "Major Action", description: "Grapple an adjacent target, Immobilizing it." },
                { name: "Weaken defenses", action: "Minor Action", description: "Halve a grappled target's AC or MR (random if unspecified)." },
            ],
        },
        summonActions: {
            Grapple: { target: [status("immobilized", { name: "Grappled (Trapper)" })] },
            "Weaken defenses": {
                choices: [pick("stat", "Halve", { ac: "AC", magicResist: "MR" })],
                target: (ctx) => [
                    { name: `Trapper: ${ctx.choices.stat === "ac" ? "AC" : "MR"} halved`, category: "condition", changes: [{ key: `system.stats.${String(ctx.choices.stat)}.multiplier`, value: -50 }] },
                ],
            },
        },
    },
    "Bioengineer/Amalgam Bomber": {
        summon: {
            name: "Bomber organism",
            img: "icons/creatures/slimes/slime-movement-pseudopods-green.webp",
            stats: { health: 20, speed: 15 },
            actions: [
                { name: "Self destruct", action: "Major Action", description: "8d12 magic damage of its aspected element in a 25 ft cube (physical if non-aspected)." },
                { name: "Aspect", action: "Minor Action", description: "Change its aspected element." },
            ],
        },
        summonActions: {
            "Self destruct": {
                choices: [pick("element", "Aspect", { physical: "None (physical)", fire: "Fire", water: "Water", earth: "Earth", air: "Air", ice: "Ice", lightning: "Lightning", light: "Light", dark: "Dark" })],
                area: square(25, "all"),
                attack: (ctx) =>
                    ctx.choices.element === "physical" ? strike("8d12", { scaling: "none" }) : spell("8d12", ctx.choices.element as DamageType, { scaling: "none" }),
                notes: ["The bomber dies: delete its token."],
            },
            Aspect: { notes: ["Change the aspected element (pick it when it self-destructs)."] },
        },
    },
    "Bioengineer/Crafted Cleric": {
        summon: {
            name: "Healer organism",
            img: "icons/magic/life/heart-glowing-red.webp",
            stats: { health: 30, mana: 30, speed: 20 },
            actions: [{ name: "Mend", action: "Major Action", description: "Expend 10 mana to heal an adjacent target for 3d12." }],
        },
        summonActions: { Mend: { cost: { resource: "mana", amount: 10 }, heal: { formula: "3d12" } } },
    },
    "Bioengineer/Generate Guardian": {
        summon: {
            name: "Guardian organism",
            img: "icons/creatures/magical/construct-iron-stomping-yellow.webp",
            stats: { health: 50, ac: 20, magicResist: 50, speed: 30 },
            actions: [
                { name: "Transfer", action: "Major Action", description: "Transfer its AC or MR to a target within 30 ft." },
                { name: "Recover", action: "Minor Action", description: "Heal itself for 5 HP or cleanse a condition on itself." },
                { name: "Intercept", action: "Reaction", description: "Block an attack, redirecting it to itself." },
            ],
        },
        summonActions: {
            Transfer: {
                choices: [pick("stat", "Transfer", { ac: "AC (+20)", magicResist: "MR (+50%)" })],
                target: (ctx) => [{ name: "Guardian's protection", category: "buff", changes: [stat(ctx.choices.stat === "ac" ? "ac" : "magicResist", ctx.choices.stat === "ac" ? 20 : 50)] }],
                notes: ["The guardian loses the transferred stat while the target has it."],
            },
            Recover: { heal: { formula: "5", self: true } },
            Intercept: { notes: ["Redirect the attack to the guardian."] },
        },
    },
    "Bioengineer/Absorbing Angel": {
        summon: {
            name: "Angel organism",
            img: "icons/magic/holy/angel-wings-gray.webp",
            stats: { health: 10, speed: 30 },
            actions: [{ name: "Absorb", action: "Major Action", description: "Cleanse a condition on an adjacent target, taking 2 damage." }],
        },
        summonActions: { Absorb: { notes: ["Cleanse a condition on an adjacent target; the angel takes 2 damage."] } },
    },
    "Bioengineer/Child of Life": {
        summon: {
            name: "Homunculus",
            img: "icons/creatures/magical/humanoid-silhouette-glowing-pink.webp",
            stats: { health: 1, speed: 30 },
            description: "Attached to an entity, it's immune to all damage and conditions. Can stabilize a downed entity.",
            actions: [{ name: "Sacrifice", action: "Reaction", description: "Completely absorb an attack that would down or kill its host, dying in the process." }],
        },
        summonActions: { Sacrifice: { notes: ["Absorb the attack completely; the homunculus dies."] } },
    },

    /* ---------- Golems, constructs ---------- */

    "Golem Master/Golem Mage": {
        summon: { name: "Golem Mage", img: "icons/creatures/magical/construct-stone-earth-gray.webp", stats: { health: 100, mana: 50, speed: 30 }, description: "Equips 1 armor, 1 accessory, and 1 magic focus. Learns magical abilities from others (1 minute each)." },
    },
    "Golem Master/Golem Soldier": {
        summon: { name: "Golem Soldier", img: "icons/creatures/magical/construct-iron-stomping-yellow.webp", stats: { health: 100, stamina: 50, speed: 30 }, description: "Equips 1 armor, 1 accessory, and 1 weapon. Learns physical abilities from others (1 minute each)." },
    },
    "Golem Master/Golem Scholar": {
        summon: { name: "Golem Scholar", img: "icons/creatures/magical/construct-stone-earth-gray.webp", stats: { health: 50, mana: 100, speed: 30 }, description: "Alchemy, Artistry, Elements, Knowledge, Magic, and Psionics checks at +25." },
    },
    "Golem Master/Golem Sapper": {
        summon: { name: "Golem Sapper", img: "icons/creatures/magical/construct-iron-stomping-yellow.webp", stats: { health: 50, stamina: 100, speed: 30 }, description: "Armor, Athletics, Beast Mastery, Combat, Item Use, and Weapons checks at +25." },
    },
    "Inventor/Burner Bot": {
        choices: [pick("component", "Modular Component", { oil: "Oil-augmented attacks (+2d10 fire)", explode: "Explodes on death (4d10 fire, 10 ft)" })],
        summon: (ctx) => ({
            name: "Burner Bot",
            img: "icons/creatures/magical/construct-golem-robot-blue.webp",
            stats: { health: 25, speed: 25 },
            description: ctx.choices.component === "explode" ? "Explodes on death: 4d10 fire magic damage to all enemies within 10 ft." : "Consumes half a liter of oil per attack for +2d10 fire.",
            actions: [
                { name: ctx.choices.component === "explode" ? "Attack" : "Oil Attack", action: "Major Action", description: "Melee attack for 4d6 physical damage." },
                ...(ctx.choices.component === "explode" ? [{ name: "Explode", description: "4d10 fire magic damage to all enemies within 10 ft." }] : []),
            ],
        }),
        summonActions: {
            Attack: { attack: strike("4d6", { scaling: "none" }) },
            "Oil Attack": {
                attack: { rollType: "physical", scaling: "none", damage: [{ formula: "4d6", type: "physical" }, { formula: "2d10", type: "fire" }] },
            },
            Explode: { area: around(10), attack: spell("4d10", "fire", { scaling: "none" }) },
        },
    },
    "Inventor/Potion Puppet": {
        choices: [pick("component", "Modular Component", { aura: "30 ft aura: allies +30% Item Efficiency", explode: "Explodes on death sharing its potion" })],
        summon: (ctx) => ({
            name: "Potion Puppet",
            img: "icons/consumables/potions/bottle-round-corked-red.webp",
            stats: { health: 20, speed: 25 },
            effects: ctx.choices.component === "aura" ? [aura("30 ft aura: allies have 30% Item Efficiency.")] : [],
            description: "Holds one potion from your inventory and uses it on an ally within 30 ft when ordered." + (ctx.choices.component === "explode" ? " Explodes on death, giving its potion's effect to allies within 10 ft." : ""),
        }),
    },
    "Modifier/Basic Voltron Chassis": {
        summon: {
            name: "Voltron",
            img: "icons/creatures/magical/construct-iron-stomping-yellow.webp",
            stats: { health: 30, speed: 30 },
            description: "Deployed or recalled as a free action. If it would die, it returns to your inventory instead, losing 2 augmentations.",
            actions: [{ name: "Strike", action: "Major Action", description: "Melee attack for 2d10 physical damage." }],
        },
        summonActions: { Strike: { attack: strike("2d10", { scaling: "none" }) } },
    },

    /* ---------- Totems ---------- */

    "Conjurer/Self Defense Turret": {
        summon: {
            name: "SDF Totem",
            img: "icons/magic/defensive/shield-barrier-glowing-blue.webp",
            stats: { health: 100 },
            description: "When it takes damage, it deals twice as much damage of the same type back at the attacker. While within 50 ft, you may use your reaction to redirect an attack on you or an ally to it.",
        },
    },
    "Night Lord/Decoy": {
        area: { shape: "battlefield" },
        target: [status("taunted", { duration: "1 minute" }), status("charmed", { duration: "1 minute" })],
        summon: {
            name: "Decoy",
            img: "icons/magic/control/silhouette-hold-change-blue.webp",
            stats: { health: 1 },
            description: "Charmed enemies must use their Move Action to approach it. When an enemy moves toward it, you may dash an equal distance as a free reaction.",
        },
        notes: ["Only enemies in line of sight of the Decoy. Enemies not Taunted/Charmed by it before have -30% CR."],
    },
    "Vastwood Knight/Wallflower Espionage": {
        choices: [pick("resource", "Pay with", { stamina: "Stamina", mana: "Mana" })],
        cost: (ctx) => ({ resource: ctx.choices.resource === "mana" ? "mana" : "stamina", amount: 25 }),
        summon: {
            name: "Wallflower",
            img: "icons/magic/nature/plant-sprout-hand-flower-pink.webp",
            stats: { health: 1 },
            description: "Gives you and allies line of sight; enemies it sees lose Hidden, invisibility, and obfuscating illusions. Out of combat, transmits what it sees and hears.",
        },
    },

    /* ---------- Parasites (Transfusionist) ---------- */

    "Transfusionist/Corrupting Parasite": {
        choices: [count("current", "Organism's current health"), count("max", "Organism's max health")],
        attack: (ctx) => strike(String(Math.floor(Number(ctx.choices.current) / 2)), { scaling: "none" }),
        target: (ctx) => [bleed(String(Math.floor(Number(ctx.choices.max) / 5)))],
    },
    "Transfusionist/Restoring Parasite": {
        choices: [count("max", "Organism's max health")],
        heal: (ctx) => ({ formula: String(Number(ctx.choices.max) || 0) }),
        notes: ["For the duration (concentration, held by the ally), the ally can cast the organism's abilities using their own stats, buffs, and gear."],
    },

    /* ---------- Organism commands ---------- */

    "Bioengineer/Hibernate": {
        target: [status("helpless", { name: "Hibernating (Incapacitated)", resistible: false, description: "<p>Incapacitated; its duration doesn't deplete.</p>" })],
        notes: ["Casting it on an organism already hibernating this way ends it instead."],
    },
    "Modifier/Voltron Heart": {
        target: [
            {
                name: "Voltron Heart",
                category: "buff",
                changes: [statPercent("health", 200), stat("healthRegen", 100)],
                description: "<p>+200% Health and +100% Health Regeneration; maximum Health can't be decreased.</p>",
            },
        ],
    },
};
