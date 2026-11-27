/**
 * Weapon users: assassins, champions, destroyers, snipers, soldiers, warriors, and the like. See ../catalog.ts.
 */
import {
    onHit,
    around,
    battlefield,
    bleed,
    CROWD_CONTROL,
    count,
    cone,
    damageIncrease,
    line,
    note,
    pick,
    square,
    stat,
    statPercent,
    status,
    strike,
    vulnerable,
    weaken,
    yesNo,
    burst,
} from "../helpers.ts";
import { weaponsFor } from "../../rolls/attack.ts";
import type { AbilityAutomation, AttackSpec, EffectSpec } from "../types.ts";

/**
 * A block: the next attack applied to the bearer is reduced by `percent` (100 = fully blocked), then the block is
 * used up. Cast blocks as a reaction before the attack's damage is applied.
 */
function blockSpec(name: string, percent: number): EffectSpec {
    return {
        name: percent >= 100 ? `${name} (block)` : `${name} (block ${percent}%)`,
        category: "",
        block: Math.min(100, percent),
        duration: "end of turn",
        description: `<p>Blocks ${percent >= 100 ? "all" : `${Math.min(100, percent)}%`} of the next attack applied to this creature. Used up when it applies; expires at the end of the turn.</p>`,
    };
}

const WHO = pick("who", "Block for", { self: "Yourself", ally: "Targeted ally" });
/** A block on yourself or on the targeted ally, by the WHO choice. */
const blockFor = (name: string, percent: (ctx: { buffs: number }) => number) => ({
    choices: [WHO],
    self: (ctx: { choices: Record<string, unknown>; buffs: number }) => (ctx.choices.who === "ally" ? [] : [blockSpec(name, percent(ctx))]),
    target: (ctx: { choices: Record<string, unknown>; buffs: number }) => (ctx.choices.who === "ally" ? [blockSpec(name, percent(ctx))] : []),
});
const BLOCK_NOTE = "Cast before the attack's damage is applied; Apply damage uses the block up.";

/** "You may reroll any damage dice, taking the higher result": each die is the best of two. */
function bestOfTwo(dice: number, faces: number): string {
    return Array.from({ length: dice }, () => `{1d${faces}, 1d${faces}}kh`).join(" + ");
}

const SPOTTING = { ...count("spotting", "Spotting stacks to expend"), resource: "spotting" };
const HUNTER = (label: string) => ({ ...yesNo("stacks", label), resource: "hunter", amount: 2 });
const STANCE = (options: Record<string, string>) => ({ ...pick("stance", "Stance", options), state: "stance" });
const SOVEREIGNTY = { ...yesNo("sovereignty", "Vastwood Sovereignty active (half cost)"), state: "active" };

export const MARTIAL: Record<string, AbilityAutomation> = {
    /* ---------- Arcane Archer ---------- */

    "Arcane Archer/Elusive Hunter": {
        self: (ctx) => [{ category: "buff", changes: [stat("speed", ctx.scale(15)), statPercent("evasion", ctx.scale(50))] }],
        notes: ["Bonus speed is +30 for a turn you start adjacent to an enemy. Sacrifice as a free reaction to dash up to your speed."],
    },
    "Arcane Archer/Surefire Shot": {
        choices: [yesNo("sacrificed", "Sacrificed a buff this turn (+50% damage, unblockable)")],
        attack: (ctx) => strike("7d8", { increase: ctx.choices.sacrificed ? 50 : 0, unblockable: ctx.choices.sacrificed ? 100 : 0, accuracy: 20 * ctx.buffs }),
        notes: (ctx) => [`+${40 * ctx.buffs} ft range from your ${ctx.buffs} buff(s).`],
    },
    "Arcane Archer/Broadhead Arrow": {
        self: (ctx) => [
            {
                category: "buff",
                modifiers: [
                    damageIncrease(ctx.scale(100), { rollType: "physical", damageType: "physical", weapon: "bow" }),
                    damageIncrease(ctx.scale(100), { rollType: "physical", damageType: "physical", weapon: "crossbow" }),
                    note("single-target attacks also hit adjacent targets", { rollType: "physical" }),
                ],
            },
        ],
        notes: ["Sacrifice as a free action: your next bow/crossbow attack has +200% physical damage and ignores all AC."],
    },
    "Arcane Archer/Persistent Hunter": {
        self: (ctx) => [{ category: "buff", changes: [stat("conditionResist", ctx.scale(30))] }],
        notes: ["Cleanse a condition of your choice first. +30% more CR against crowd control. Sacrifice as a free reaction to cleanse a condition."],
    },
    "Arcane Archer/Swelling Shot": {
        choices: [yesNo("sacrificed", "Sacrificed a buff this turn (+50% damage, Crippling)")],
        area: (ctx) => square(25 + 10 * ctx.buffs),
        attack: (ctx) => strike("9d8", { increase: ctx.choices.sacrificed ? 50 : 0 }),
        target: (ctx) => (ctx.choices.sacrificed ? [status("crippled")] : []),
    },
    "Arcane Archer/Stream Shot": {
        choices: [yesNo("sacrificed", "Sacrificed a buff this turn (+50% damage, push 20 ft)")],
        attack: (ctx) => strike("6d8", { hits: 1 + ctx.buffs, increase: ctx.choices.sacrificed ? 50 : 0 }),
        notes: (ctx) => [`${1 + ctx.buffs} hit(s): 1 plus one per buff. You may change targets between hits.`],
    },

    /* ---------- Assassin ---------- */

    "Assassin/Backstab": {
        attack: (ctx) => strike("3d4", { maximize: ctx.actor.statuses.has("hidden") }),
        notes: (ctx) => (ctx.actor.statuses.has("hidden") ? ["Hidden: max damage on all damage dice."] : []),
    },
    "Assassin/Focus": {
        // "Your next attack". Spells can't crit, so only physical attacks consume it.
        self: (ctx) => [
            { category: "buff", singleUse: true, modifiers: [{ type: "critChance", rollType: "physical", value: ctx.scale(30) }] },
        ],
    },
    "Assassin/Vanish": {
        choices: [yesNo("reaction", "Cast as a reaction (30 stamina)")],
        cost: (ctx) => ({ resource: "stamina", amount: ctx.choices.reaction ? 30 : 10 }),
        self: [status("hidden")],
        notes: ["You may dash up to 10 ft in any direction."],
    },
    "Assassin/Pounce": {
        attack: strike("4d4"),
        notes: ["Dash up to 15 ft toward the target first."],
    },
    "Assassin/Sharpen": {
        self: [{ category: "buff", modifiers: [note("d4 damage dice are d6 instead (not automated)")] }],
    },
    "Assassin/Skyfall": {
        attack: strike("8d4", { critDamage: 100 }),
        notes: ["Only while falling on the target from at least 10 ft above."],
    },
    "Assassin/Massacre": {
        attack: strike("16d4"),
        notes: [
            "Divide the dice among adjacent targets as you choose; each die on a target adds 5% Lethality. Crit is rolled once for all dice.",
        ],
    },
    "Assassin/Stalk": {
        self: [status("hidden")],
        notes: ["While hidden, dash up to 60 ft. If you then succeed on a Sneak check, repeat for free."],
    },

    /* ---------- Captain ---------- */

    "Captain/Inspirational Speech": {
        area: around(50, "allies"),
        target: (ctx) => [{ category: "buff", duration: "start of your next turn", modifiers: [damageIncrease(ctx.scale(100))] }],
        notes: ["Standing Orders (Follow The Leader): allies cast a buff ability."],
    },
    "Captain/Blitzkrieg": {
        attack: strike("5d10"),
        notes: [
            "An ally within 50 ft may dash adjacent to you as a free reaction, then use their reaction for a physical melee attack ability.",
            "Standing Orders: allies cast a physical, melee, attack ability.",
        ],
    },
    "Captain/Fire At Will": {
        attack: strike("6d10"),
        notes: [
            "You may dash up to 25 ft before or after. An ally may Weapon Swap as a free reaction, then use their reaction for a ranged attack ability.",
            "Standing Orders: allies cast a physical, ranged, attack ability.",
        ],
    },

    /* ---------- Champion ---------- */

    "Champion/Slice and Dice": {
        attack: (ctx) => {
            // The weapon(s) for the chosen hand; dual wielding counts if either is an axe or sword.
            const { weapon, offWeapon } = weaponsFor(ctx.actor, ctx.hand);
            const categories = [weapon, offWeapon].map((w) => (w?.system as unknown as { weapon?: { category?: string } } | undefined)?.weapon?.category);
            const keepHigher = categories.some((c) => ["axe", "longblade"].includes(c ?? ""));
            return strike(keepHigher ? bestOfTwo(5, 10) : "5d10");
        },
        notes: ["With an axe or sword, each die is rolled twice keeping the higher. Otherwise you may reroll dice and must take the second result."],
    },
    "Champion/Precision Strike": {
        attack: strike("5d8", { ignoreAC: true, ignoreMR: true, cannotMiss: true, unblockable: 100 }),
        notes: ["With a fine weapon or unarmed, dash up to 20 ft before or after."],
    },
    "Champion/Disarming Blow": {
        attack: strike("5d6"),
        notes: ["The target is disarmed; kick the item 30 ft. With an improvised weapon, you may pick it up and autoattack with it."],
    },
    "Champion/Skull Bash": {
        attack: strike("6d10"),
        target: [status("stunned", { duration: "end of target's next turn" })],
        notes: ["With a blunt weapon or shield, it also hits enemies adjacent to the target."],
    },
    "Champion/Fan The Hammer": {
        attack: strike("2d8", { hits: 4 }),
        notes: ["Can't be reacted to. With a crossbow or bullet weapon, each hit pushes the target 10 ft."],
    },
    "Champion/Throat Slitter": {
        choices: [
            pick("mode", "Choose", { chance: "+15% crit chance", damage: "+150% crit damage modifier", both: "Both (shortblade only)" }),
        ],
        attack: (ctx) =>
            strike("6d6", {
                critChance: ctx.choices.mode !== "damage" ? 15 : 0,
                critDamage: ctx.choices.mode !== "chance" ? 150 : 0,
            }),
    },
    "Champion/Piercing Blow": {
        attack: strike("7d10"),
        notes: [
            "Pierces to an enemy within 15 ft behind the target for half damage (½), or full damage with a polearm or heavy throwing weapon.",
        ],
    },
    "Champion/Painful Blow": {
        choices: [yesNo("bow", "Made with a bow or light throwing weapon (+50% physical vulnerability)")],
        attack: strike("6d8"),
        target: (ctx) => [
            bleed("2d8"),
            ...(ctx.choices.bow ? [{ name: "Painful Blow (vulnerable)", category: "condition" as const, changes: [vulnerable("physical", 50)] }] : []),
        ],
    },
    "Champion/Arsenal of Power": {
        choices: [
            pick("weapon", "Weapon", {
                axe: "Axe: Bleed half the damage dealt",
                blunt: "Blunt: -speed equal to half the damage",
                longblade: "Longblade: physical vulnerability = half the damage (%)",
                polearm: "Polearm: AC loss = half the damage",
                shield: "Shield: gain AC = half the damage",
                heavyThrowing: "Heavy throwing: no ammunition used",
            }),
        ],
        attack: strike("8d10"),
        notes: (ctx) => [
            `${String(ctx.choices.weapon)} effect lasts 1 minute; use the damage actually dealt (not automated).`,
            "You may concentrate to repeat it once per turn as a free action with a new selection, until you exhaust the list.",
        ],
    },
    "Champion/Arsenal of Finesse": {
        choices: [
            pick("weapon", "Weapon", {
                bow: "Bow: evasion loss = half the damage (%)",
                crossbow: "Crossbow: push = half the damage (ft)",
                bullets: "Bullets: stun chance = half the damage (%)",
                fine: "Fine: dash = half the damage (ft)",
                unarmed: "Unarmed: combo chance = 10% of the damage",
                lightThrowing: "Light throwing: no ammunition used",
            }),
        ],
        attack: strike("7d10"),
        notes: ["Use the damage actually dealt for the effect (not automated). Concentrate to repeat once per turn, as with Arsenal of Power."],
    },

    /* ---------- Daggerspell (physical) ---------- */

    "Daggerspell/Fadeaway Slice": {
        attack: strike("4d4"),
        notes: ["Dash 10 ft after (20 ft with an empowered shortblade)."],
    },
    "Daggerspell/Hidden Blade": {
        self: (ctx) => [
            {
                category: "buff",
                modifiers: [
                    { type: "critChance", rollType: "all", value: ctx.scale(15) },
                    note("attacks with empowered shortblades grant you Hidden", { rollType: "physical", weapon: "shortblade" }),
                ],
            },
        ],
    },
    "Daggerspell/Rapid Jab": {
        attack: strike("1d4", { hits: 3 }),
        notes: ["If the first hit was empowered, the other two are too."],
    },
    "Daggerspell/Shieldbreaker": {
        choices: [yesNo("empowered", "Made with an empowered shortblade (-40% MR instead of -20%)")],
        attack: strike("6d4"),
        target: (ctx) => [
            { name: "Shieldbreaker", category: "condition", changes: [stat("magicResist", ctx.choices.empowered ? -40 : -20)] },
        ],
        notes: ["Can't be blocked by spells or magical effects."],
    },
    "Daggerspell/Heartpiercer": {
        choices: [count("empowerment", "Ritual Dagger empowerment damage inflicted")],
        attack: (ctx) => {
            const e = Number(ctx.choices.empowerment) || 0;
            return strike("8d4", {
                increase: e >= 20 ? 100 : 0,
                critDamage: e >= 40 ? 100 : 0,
                critChance: e >= 50 ? 1000 : 0,
            });
        },
        notes: ["20+ empowerment: +100% physical damage. 40+: +100% crit damage. 50+: guaranteed crit."],
    },

    /* ---------- Demon Hunter ---------- */

    "Demon Hunter/Banishing Bolt": {
        choices: [yesNo("demonic", "Targets are of demonic origin (double damage, 30% Lethality)"), HUNTER("Expend 2 Hunter stacks (free action, ignores MR)")],
        cost: (ctx) => (ctx.choices.stacks ? null : { resource: "mana", amount: 40 }),
        area: square(35),
        attack: (ctx) => ({
            rollType: "magic",
            damage: [
                { formula: "6d8", type: "lightning" },
                { formula: "5d10", type: "light" },
            ],
            increase: ctx.choices.demonic ? 100 : 0,
            lethality: ctx.choices.demonic ? 30 : 0,
            ignoreMR: !!ctx.choices.stacks,
        }),
        notes: [
            "Allies caught in it gain the lightning damage rolled as on-hit damage for their next attack and heal for the light damage rolled.",
            "Leaves a banishment field for 1 minute: enemies have -20% MR and CR; expend it to cleanse 1 condition on every ally inside.",
        ],
    },
    "Demon Hunter/Demonbane Blast": {
        choices: [yesNo("demonic", "Target is of demonic origin (double damage)"), HUNTER("Expend 2 Hunter stacks (free action, ignores AC)")],
        cost: (ctx) => (ctx.choices.stacks ? null : { resource: "stamina", amount: 30 }),
        attack: (ctx) => strike("10d8", { increase: ctx.choices.demonic ? 100 : 0, ignoreAC: !!ctx.choices.stacks }),
        notes: ["The target loses 10% of its mana and stamina, then loses health equal to that (twice that if demonic)."],
    },
    "Demon Hunter/Lifesteal Elegy": {
        choices: [
            pick("mode", "Choose", { lightning: "10d8 lightning, empower next attack", light: "9d10 light, heal for half" }),
            HUNTER("Expend 2 Hunter stacks (free action, ignores MR)"),
        ],
        cost: (ctx) => (ctx.choices.stacks ? null : { resource: "mana", amount: 50 }),
        area: around(30),
        attack: (ctx) => (ctx.choices.mode === "light" ? { rollType: "magic", damage: [{ formula: "9d10", type: "light" }], ignoreMR: !!ctx.choices.stacks } : { rollType: "magic", damage: [{ formula: "10d8", type: "lightning" }], ignoreMR: !!ctx.choices.stacks }),
        notes: (ctx) => [
            ctx.choices.mode === "light"
                ? "Heal for half the damage dealt. If it hits 5+ enemies, cleanse 3 conditions on targets in range."
                : "Your next attack deals extra light damage equal to half this spell's damage. If it hits 5+ enemies, inflict 2 stacks of Paralysis.",
            "Demonic enemies take double damage and count as 3 enemies.",
        ],
    },
    "Demon Hunter/Consecrated Carnage": {
        choices: [HUNTER("Expend 2 Hunter stacks (free action, ignores AC)")],
        cost: (ctx) => (ctx.choices.stacks ? null : { resource: "stamina", amount: 40 }),
        area: around(30),
        attack: (ctx) => strike("8d8", { increase: 20 * ctx.targets.length, ignoreAC: !!ctx.choices.stacks }),
        target: [status("crippled"), weaken(30)],
        notes: [
            "Dash up to 40 ft first. +20% damage per enemy in range (+40% per demonic enemy, which get a 50% Weaken instead).",
            "Push targets until they're outside the range.",
        ],
    },
    "Demon Hunter/Soul Searing Light": {
        choices: [yesNo("demonic", "Target is of demonic origin (double damage, 40% vulnerability)"), HUNTER("Expend 2 Hunter stacks (free action)")],
        cost: (ctx) => (ctx.choices.stacks ? null : { resource: "mana", amount: 50 }),
        target: (ctx) => {
            const dice = ctx.choices.demonic ? "8d8" : "4d8";
            return [
                {
                    name: "Soul Searing Light",
                    category: "condition",
                    dot: { formula: dice, type: "light" },
                    changes: [vulnerable("physical", ctx.choices.demonic ? 40 : 20)],
                },
                { name: "Soul Searing Light (lightning)", category: "condition", dot: { formula: dice, type: "lightning" }, resistible: false },
            ];
        },
        notes: ["Apply both: the second is the lightning half of the damage over time."],
    },
    "Demon Hunter/Sanctifying Skewer": {
        choices: [count("demons", "Demonic targets (+10 ft range, +50% damage each)"), HUNTER("Expend 2 Hunter stacks (free action, ignores AC)")],
        cost: (ctx) => (ctx.choices.stacks ? null : { resource: "stamina", amount: 60 }),
        area: (ctx) => line(30 + 10 * Number(ctx.choices.demons)),
        attack: (ctx) => strike("12d8", { increase: 50 * Number(ctx.choices.demons), ignoreAC: !!ctx.choices.stacks }),
        target: [{ name: "Sanctifying Skewer", category: "condition", changes: [vulnerable("light", 20), vulnerable("lightning", 20)] }],
        notes: ["Demonic targets get 40% light and lightning vulnerability instead."],
    },

    /* ---------- Destroyer ---------- */

    "Destroyer/Cleave": {
        attack: strike("4d10"),
        notes: ["Up to 2 different targets. If either dies, deal 8d10 physical damage to the other."],
    },
    "Destroyer/Slam": {
        attack: strike("4d10"),
        target: [
            {
                name: "Physical Vulnerability",
                category: "condition",
                changes: [vulnerable("physical", 10)],
                // 10% + the target's current physical vulnerability, so it compounds with each Slam.
                resolve: (target, spec) => {
                    const current = (target.system as { derived?: { vulnerability: { physical: number } } }).derived?.vulnerability.physical ?? 0;
                    return { ...spec, name: `Physical Vulnerability (+${10 + current}%)`, changes: [vulnerable("physical", 10 + current)], maxStacks: Infinity };
                },
            },
        ],
    },
    "Destroyer/Whirlwind": {
        area: around(5, "all"),
        attack: strike("5d10"),
        notes: ["Targets at full health take double damage (apply twice)."],
    },
    "Destroyer/Mortal Strike": {
        attack: strike("5d10"),
        target: [{ name: "Mortal Strike (armor shred)", category: "condition", resistible: false, changes: [statPercent("ac", -25)] }],
        notes: ["The armor shred happens before damage: apply the effect first, then the damage."],
    },
    "Destroyer/Challenge": {
        area: around(20),
        target: [status("taunted", { duration: "1 minute" })],
        self: (ctx) => [
            {
                category: "buff",
                changes: [statPercent("ac", ctx.scale(10 * ctx.targets.length)), statPercent("magicResist", ctx.scale(10 * ctx.targets.length))],
            },
        ],
        notes: (ctx) => [`+10% AC and MR per enemy taunted (${ctx.targets.length} in range). Adjust if some resist.`],
    },
    "Destroyer/Rampage": {
        area: cone(15, "all"),
        attack: strike("6d10"),
        target: [status("prone")],
    },
    "Destroyer/Execute": {
        attack: strike("6d10"),
        notes: ["Lethality equal to the target's percentage missing health after damage."],
    },
    "Destroyer/Leaping Crush": {
        area: burst(20),
        attack: strike("8d10"),
        target: [status("airborne")],
        notes: ["Dash up to 30 ft (vertically too) to an empty space first; place the area around where you land."],
    },
    "Destroyer/Willbreaker": {
        attack: strike("8d10"),
        target: [
            { name: "Willbreaker", category: "condition", description: "<p>Can't use reactions to dash away from or block your attacks.</p>" },
        ],
    },

    /* ---------- Juggernaut ---------- */

    "Juggernaut/Hypertension": {
        self: (ctx) => [{ category: "buff", changes: [statPercent("health", ctx.scale(100))] }],
        notes: ["Concentration. Your current health should change by the same ratio (not automated)."],
    },
    "Juggernaut/Wild Swing": {
        // 30% lifesteal, or 60% below 30% health.
        attack: (ctx) => {
            const { value, max } = (ctx.actor.system as { derived: { resources: { health: { value: number; max: number } } } }).derived.resources.health;
            return strike("5d10", { lifesteal: max && value / max < 0.3 ? 60 : 30 });
        },
    },
    "Juggernaut/Hostility": {
        choices: [yesNo("concentrate", "Concentrate on it (25% lifesteal instead of 15%)")],
        self: (ctx) => [{ category: "buff", modifiers: [{ type: "lifesteal", rollType: "physical", value: ctx.scale(ctx.choices.concentrate ? 25 : 15) }] }],
    },
    "Juggernaut/Blood Boil": {
        area: around(30),
        target: [status("taunted", { duration: "1 minute" })],
        notes: (ctx) => [`Heal 10% of your max health at the start of each of your turns per enemy taunted (${ctx.targets.length} in range).`],
    },
    "Juggernaut/Violent Riot": {
        area: around(20),
        attack: strike("6d10"),
        heal: (ctx) => ({ formula: String(10 * ctx.targets.length), self: true }),
        notes: ["Heals 10 per enemy in range; undo the heal if some aren't damaged."],
    },
    "Juggernaut/Blood For Power": {
        choices: [pick("mode", "Recover", { stamina: "6d10 stamina", mana: "6d10 mana", both: "3d10 stamina and 3d10 mana" })],
        restore: (ctx) =>
            ctx.choices.mode === "both"
                ? [
                      { resource: "stamina", formula: "3d10" },
                      { resource: "mana", formula: "3d10" },
                  ]
                : [{ resource: ctx.choices.mode === "mana" ? "mana" : "stamina", formula: "6d10" }],
    },
    "Juggernaut/Purge": {
        choices: [yesNo("health", "Paid with health (cleanse 2 conditions)")],
        cost: (ctx) => ({ resource: ctx.choices.health ? "health" : "stamina", amount: 35 }),
        self: (ctx) => {
            const { value, max } = (ctx.actor.system as { derived: { resources: { health: { value: number; max: number } } } }).derived.resources.health;
            const missing = Math.round(100 * (1 - value / Math.max(1, max)));
            return [{ category: "buff", changes: [stat("conditionResist", ctx.scale(missing))] }];
        },
        notes: (ctx) => [`Cleanse ${ctx.choices.health ? 2 : 1} condition(s) of your choice first.`],
    },
    "Juggernaut/Draining Blow": {
        attack: strike("7d10", { healRolled: 100 }),
        notes: ["You may concentrate to repeat it at half cost while attacking the same target."],
    },
    "Juggernaut/Tachycardia": {
        self: (ctx) => [
            {
                category: "buff",
                changes: [stat("speed", ctx.scale(30))],
                modifiers: [
                    { type: "penetration", rollType: "physical", damageType: "physical", value: ctx.scale(50) },
                    note("+5 reach on melee weapons; +100% physical damage while under 30% health", { rollType: "physical" }),
                ],
            },
        ],
        notes: ["Concentration."],
    },
    "Juggernaut/All Out Attack": {
        attack: (ctx) => {
            const { value, max } = (ctx.actor.system as { derived: { resources: { health: { value: number; max: number } } } }).derived.resources.health;
            return strike(String(Math.max(0, max - value)), { scaling: "none" });
        },
        notes: ["Until your next long rest, your current health becomes your new maximum health (not automated)."],
    },

    /* ---------- Night Lord ---------- */

    "Night Lord/Flashbang": {
        area: around(40),
        target: [status("blind"), status("prone")],
        notes: ["Enemies not Blinded by this before have -30% CR against the Blind (shift-click to skip the CR roll if they fail anyway)."],
    },

    "Night Lord/Larceny": {
        // TODO: double-check with the rulebook author that drained health ignores AC/MR.
        attack: strike("6d6", { scaling: "none", trueDamage: true, healRolled: 100 }),
        target: [{ name: "Larceny mark", category: "condition", resistible: false, changes: [{ key: "system.skillBonus", value: -30 }], description: "<p>-30 to skill checks until their next long rest.</p>" }],
        summarize: (result) => {
            const sixes = result.parts.flatMap((p) => p.roll.dice.flatMap((d) => d.results)).filter((r) => r.active && r.result === 6).length;
            return [`Rolled ${sixes} six(es): strip ${sixes} buff(s) from the target and apply them to yourself.`];
        },
        notes: ["You heal for the health drained (the lifesteal heal assumes all of it lands)."],
    },
    "Night Lord/Robbery": {
        choices: [pick("resource", "Drain", { stamina: "Stamina", mana: "Mana" })],
        drain: (ctx) => ({ resource: ctx.choices.resource === "mana" ? "mana" : "stamina", formula: "6d6" }),
        target: [{ name: "Robbery mark", category: "condition", resistible: false, description: "<p>Forgets the last ability they cast until their next long rest. Can only be marked once.</p>" }],
    },

    /* ---------- Pinpoint Monk ---------- */

    "Pinpoint Monk/Atrophic Blow": {
        choices: [pick("mode", "Choose", { strong: "40% Weaken", combo: "20% Weaken, +10% next combo roll" })],
        target: (ctx) => [weaken(ctx.choices.mode === "combo" ? 20 : 40, { duration: "end of target's next turn" })],
    },

    /* ---------- Reaper ---------- */

    "Reaper/Soul Rend": {
        choices: [pick("mode", "Choose", { pierce: "Ignore all AC, can't be blocked", lifesteal: "20% lifesteal" })],
        attack: (ctx) =>
            strike("5d10", {
                ignoreAC: ctx.choices.mode === "pierce",
                unblockable: ctx.choices.mode === "pierce" ? 100 : 0,
                lifesteal: ctx.choices.mode === "lifesteal" ? 20 : 0,
            }),
    },
    "Reaper/The End Is Coming": {
        target: [
            { name: "The End Is Coming", category: "condition", description: "<p>Gains a Curse at the start of each turn (every 10 seconds out of combat).</p>" },
        ],
    },
    "Reaper/Call of the Void": {
        attack: { rollType: "magic", damage: [{ formula: "4d10", type: "dark" }] },
        target: [
            {
                name: "Call of the Void",
                category: "condition",
                description: "<p>Movement not toward the caster is difficult terrain; can't dash or teleport except toward them.</p>",
            },
        ],
    },
    "Reaper/Tornado of Souls": {
        area: around(5, "all"),
        attack: strike("5d10"),
        notes: ["If it kills a target, you may repeat it immediately for free."],
    },
    "Reaper/Death Throes": {
        target: [
            {
                name: "Death Throes",
                category: "condition",
                description: "<p>Rerolls all dice, taking the lower (death saves take the higher). Healing on them is half as effective.</p>",
            },
        ],
    },
    "Reaper/Deathstroke": {
        choices: [{ ...count("souls", "Souls sacrificed"), resource: "souls" }],
        attack: (ctx) => strike("6d10", { increase: 100 * Number(ctx.choices.souls), lethality: 20 * Number(ctx.choices.souls) }),
    },
    "Reaper/Frailty of Man": {
        target: [
            weaken(50, {
                name: "Frailty of Man",
                description:
                    "<p>Can't gain buffs, concentrate, benefit from potions or fields, or use reactions and minor actions. 50% Weaken.</p>",
            }),
        ],
        notes: ["Strip all the target's buffs and break their concentration first."],
    },
    "Reaper/Drag To Hell": {
        attack: { rollType: "magic", damage: [{ formula: "6d10", type: "dark" }] },
        target: [
            {
                name: "Drag To Hell",
                category: "condition",
                dot: { formula: "3d10", type: "dark" },
                description: "<p>Pulled 30 ft in a direction of the caster's choice and takes 3d10 dark at the start of each turn.</p>",
            },
        ],
        notes: ["While it lasts, you can use your reaction to pull the target 20 ft."],
    },
    "Reaper/Inevitable End": {
        area: around(30),
        attack: strike("8d10"),
        notes: [
            "Per target, by unique conditions from you this combat: 2+ can't be blocked or dodged; 4+ ignores AC; 6+ double damage and 100% Lethality.",
        ],
    },

    /* ---------- Rifleman ---------- */

    "Rifleman/Iron Sights": {
        choices: [yesNo("silver", "Silver bullet (+100% crit damage)")],
        self: (ctx) => [
            {
                category: "buff",
                singleUse: true,
                modifiers: [
                    { type: "critChance", rollType: "physical", weapon: "bullets", value: ctx.scale(10) },
                    ...(ctx.choices.silver ? [{ type: "critDamage" as const, rollType: "physical" as const, weapon: "bullets", value: ctx.scale(100) }] : []),
                ],
            },
        ],
    },
    "Rifleman/Bodyshot": {
        choices: [pick("fire", "Fire mode", { primary: "Primary: +3d12, prone or pushed", secondary: "Secondary: +2d12, 10% vulnerability" }), yesNo("silver", "Silver bullet")],
        attack: (ctx): AttackSpec => strike(ctx.choices.fire === "secondary" ? "2d12" : "3d12", { includeWeapon: true }),
        target: (ctx) =>
            ctx.choices.fire === "secondary"
                ? Array.from({ length: ctx.choices.silver ? 2 : 1 }, () => ({
                      name: "Bodyshot (10% physical vulnerability)",
                      category: "condition" as const,
                      maxStacks: 5,
                      changes: [vulnerable("physical", 10)],
                  }))
                : [status("prone")],
        notes: (ctx) =>
            ctx.choices.fire === "secondary"
                ? ["Stacks up to 5 times."]
                : [ctx.choices.silver ? "Silver bullet: the target is knocked prone AND pushed back 10 ft." : "The target chooses: fall prone or be pushed back 10 ft."],
    },
    "Rifleman/Bleeding Bullet": {
        choices: [yesNo("silver", "Silver bullet (2d12 Bleed)")],
        self: (ctx) => [
            {
                category: "buff",
                singleUse: true,
                modifiers: [note(`inflict a ${ctx.choices.silver ? "2d12" : "1d12"} Bleed`, { rollType: "physical", weapon: "bullets" })],
            },
        ],
    },
    "Rifleman/Burst Fire": {
        choices: [pick("fire", "Fire mode", { primary: "Primary: 3 shots, +d12 each", secondary: "Secondary: one shot, 3d12, triple on-hit effects" })],
        attack: (ctx) =>
            ctx.choices.fire === "secondary" ? strike("3d12", { scaling: "none" }) : strike("1d12", { includeWeapon: true, hits: 3 }),
        notes: (ctx) =>
            ctx.choices.fire === "secondary"
                ? ["On-hit effects have tripled effectiveness (not automated)."]
                : ["Up to 3 targets. If the first shot is a silver bullet, the others gain its properties."],
    },

    /* ---------- Sentinel ---------- */

    "Sentinel/Crossguard Guillotine": {
        choices: [{ ...count("stacks", "Shield stacks spent"), resource: "shield", requires: "dualShields" as const }],
        attack: (ctx) => strike(Number(ctx.choices.stacks) ? `4d10 + ${Number(ctx.choices.stacks)}d10` : "4d10"),
        notes: (ctx) => [
            "Blocks the attacks it reacts to.",
            ...(Number(ctx.choices.stacks) ? ["Shield stacks spent: also hits enemies diagonal to the target."] : []),
        ],
    },
    "Sentinel/Bladeshield Arc": {
        choices: [{ ...count("stacks", "Shield stacks spent (range becomes 10 ft)"), resource: "shield", requires: "dualShields" as const }],
        area: (ctx) => around(Number(ctx.choices.stacks) ? 10 : 5, "all"),
        attack: (ctx) => strike(Number(ctx.choices.stacks) ? `5d10 + ${Number(ctx.choices.stacks)}d10` : "5d10"),
        notes: ["As a reaction, it's an AOE block for the spaces it hits and your space."],
    },
    "Sentinel/Dual Shield Strike": {
        choices: [{ ...count("stacks", "Shield stacks spent"), resource: "shield", requires: "dualShields" as const }],
        attack: (ctx) => strike(Number(ctx.choices.stacks) ? `6d10 + ${Number(ctx.choices.stacks)}d10` : "6d10"),
        notes: ["Dash up to 20 ft first. Half damage to an enemy behind the target (½). As a reaction, it interrupts the attack or spell."],
    },
    "Sentinel/Giga Drill Break": {
        choices: [count("stacks", "Shield stacks (while concentrating)"), yesNo("free", "Recast while concentrating (no stamina)")],
        cost: (ctx) => (ctx.choices.free ? null : { resource: "stamina", amount: 65 }),
        attack: (ctx) =>
            strike(Number(ctx.choices.stacks) ? `10d10 + ${Number(ctx.choices.stacks)}d10` : "10d10", { ignoreAC: !!ctx.choices.free }),
        target: (ctx) => {
            const tens = ctx.result?.dice.filter((d) => d.faces === 10 && d.result === 10).length ?? 0;
            return [{ name: `Giga Drill Break (+${30 + 10 * tens}% vulnerable)`, category: "condition", changes: [vulnerable("physical", 30 + 10 * tens)] }];
        },
        notes: ["Dash up to 40 ft first. Enemies adjacent to the target take the same damage."],
    },

    /* ---------- Sniper ---------- */

    "Sniper/Distance Shooter": {
        // +2 damage per 5 ft between you and your target, on your next ranged attack. Target before attacking.
        self: (ctx) => [
            {
                category: "buff",
                singleUse: true,
                modifiers: [onHit(`${ctx.scale(2)} * floor(@distance / 5)`, "physical", { weapon: "ranged" })],
            },
        ],
        notes: ["Target the enemy before your next ranged attack so the distance can be measured."],
    },
    "Sniper/Swift Sprint": {
        choices: [{ ...yesNo("spotting", "Expend a Spotting stack (dash 25 ft)"), resource: "spotting", amount: 1 }],
        self: [{ name: "Swift Sprint", category: "buff", cleanse: ["slowed", "immobilized", "crippled", "prone"] }],
        notes: (ctx) => [`Dash ${ctx.choices.spotting ? 25 : 10} ft in any direction.`],
    },
    "Sniper/Piercing Shot": {
        area: line(200),
        attack: strike("5d8", { targetScale: (index, { spotted }) => (index === 0 || spotted ? 1 : 0.5) }),
        notes: ["Targets beyond the first take half damage unless they're Spotted."],
    },
    "Sniper/Precision Shooter": {
        self: [
            {
                category: "buff",
                singleUse: true,
                modifiers: [
                    { type: "penetration", rollType: "physical", damageType: "all", value: 100 },
                    { type: "cannotMiss", rollType: "physical", value: "" },
                    { type: "unblockable", rollType: "physical", value: 100 },
                    note("bypasses barriers and walls, can't be redirected or reacted to", { rollType: "physical" }),
                ],
            },
        ],
    },
    "Sniper/Swift Shot": {
        attack: strike("3d8"),
        target: [status("stunned", { duration: "end of turn" })],
    },
    "Sniper/Kill Shot": {
        choices: [SPOTTING],
        attack: (ctx) => strike("7d8", { lethality: 10 * Number(ctx.choices.spotting) }),
    },
    "Sniper/Analytical Shooter": {
        self: (ctx) => [
            {
                category: "buff",
                singleUse: true,
                modifiers: [
                    { type: "critChance", rollType: "physical", value: ctx.scale(20) },
                    { type: "critDamage", rollType: "physical", value: ctx.scale(50) },
                ],
            },
        ],
        notes: ["While concentrating, a Major Action adds +10% crit chance and +25% crit damage (max 100% / 200%). Ends when you attack."],
    },
    "Sniper/Bola Shot": {
        choices: [{ ...yesNo("spotting", "Expend a Spotting stack (Immobilize instead of Slow)"), resource: "spotting", amount: 1 }],
        attack: strike("4d8"),
        target: (ctx) => [status(ctx.choices.spotting ? "immobilized" : "slowed")],
    },
    "Sniper/Shrapnel Shot": {
        attack: strike("6d8"),
        notes: [
            "If the target is Spotted, enemies within 20 ft of it take half the damage it took. If it died, they take the full damage it took.",
        ],
    },
    "Sniper/Evasive Maneuvers": {
        choices: [SPOTTING],
        self: (ctx) => [{ category: "buff", changes: [stat("evasion", ctx.scale(10 * Number(ctx.choices.spotting)))] }],
        notes: ["Concentration. While active, you can use your Reaction to cast any Sniper ability."],
    },
    "Sniper/Rapid Shot": {
        choices: [count("stamina", "Stamina to spend (2d8 per 10)")],
        cost: (ctx) => ({ resource: "stamina", amount: Number(ctx.choices.stamina) || 0 }),
        attack: (ctx) => strike("2d8", { hits: Math.max(1, Math.floor((Number(ctx.choices.stamina) || 0) / 10)) }),
    },

    /* ---------- Soldier ---------- */

    "Soldier/Fleetfoot Blade": {
        attack: strike("4d10"),
        notes: ["If you cast a dash reaction, you may cast this as a free reaction at the start or end of the dash."],
    },
    "Soldier/Shield Bash": {
        attack: strike("4d6"),
        target: (ctx) => {
            const dice = ctx.result?.dice.filter((d) => d.faces === 6).reduce((a, d) => a + d.result, 0) ?? 0;
            return dice >= 18 ? [status("stunned", { duration: "start of target's next turn" })] : [];
        },
        summarize: (result) => {
            const dice = result.parts.flatMap((p) => p.roll.dice.filter((d) => d.faces === 6).flatMap((d) => d.results)).reduce((a, r) => a + r.result, 0);
            return [dice >= 18 ? `Dice total ${dice} (18+): the target is Stunned.` : `Dice total ${dice}: no stun (needs 18).`];
        },
    },
    "Soldier/Steadfast Strikes": {
        choices: [count("hits", "Hits since you began concentrating (0 for the first cast)")],
        cost: (ctx) => (Number(ctx.choices.hits) > 0 ? null : { resource: "stamina", amount: 20 }),
        attack: (ctx) => strike(Number(ctx.choices.hits) ? `2d10 + ${Number(ctx.choices.hits)}d10` : "2d10"),
        notes: ["Concentration ends when you take damage or gain a condition."],
    },
    "Soldier/Double Time": {
        self: (ctx) => [{ category: "buff", changes: [stat("speed", ctx.scale(20))] }],
        notes: ["Movement during Move Actions counts as dashing."],
    },
    "Soldier/Biding Blade": {
        choices: [count("blocked", "Damage blocked (if cast after a block)")],
        attack: (ctx) => {
            const bonus = Math.floor((Number(ctx.choices.blocked) || 0) / 2);
            return strike(bonus ? `5d10 + ${bonus}` : "5d10");
        },
    },
    "Soldier/Sever The Head": {
        attack: strike("6d10"),
        target: [
            {
                name: "Sever The Head",
                category: "condition",
                duration: "start of your next turn",
                resistible: false,
                description: "<p>Loses its reaction and takes 50% increased damage from the Soldier's attacks.</p>",
            },
        ],
        notes: [
            "Dash adjacent to the target first. The mark ends early if you take damage or gain a condition, or you can end it to dash 30 ft.",
            "Your attacks deal +50% damage to the marked target (not automated: it only applies to your attacks).",
        ],
    },

    /* ---------- Thief ---------- */

    "Thief/Cloak and Dagger": {
        choices: [STANCE({ none: "Neither", hit: "Hit Stance (+100% crit damage)", run: "Run Stance (+20% crit chance)" })],
        attack: (ctx) => strike("5d4", { critDamage: ctx.choices.stance === "hit" ? 100 : 0, critChance: ctx.choices.stance === "run" ? 20 : 0 }),
    },
    "Thief/Blade in the Dark": {
        choices: [pick("stance", "Entered this turn", { none: "Neither", hit: "Hit Stance", run: "Run Stance" })],
        attack: strike("5d4"),
        self: (ctx) =>
            ctx.choices.stance === "hit"
                ? [{ category: "buff", duration: "end of your next turn", modifiers: [{ type: "critDamage", rollType: "physical", value: ctx.scale(50) }] }]
                : ctx.choices.stance === "run"
                  ? [{ category: "buff", duration: "end of your next turn", modifiers: [{ type: "critChance", rollType: "physical", value: ctx.scale(10) }] }]
                  : [],
        notes: (ctx) =>
            ctx.choices.stance === "hit"
                ? ["You may dash adjacent to the target after the attack."]
                : ctx.choices.stance === "run"
                  ? ["This attack doesn't break Hidden."]
                  : [],
    },
    "Thief/Frenetic Assault": {
        choices: [STANCE({ none: "Neither", hit: "Hit Stance (on hit: -10 AC/EV/MR)", run: "Run Stance (dash 10 ft before each hit)" })],
        attack: strike("1d4", { hits: 3 }),
        notes: (ctx) =>
            ctx.choices.stance === "hit"
                ? ["Each hit: the target loses your choice of 10 AC, 10% evasion, or 10% MR."]
                : ctx.choices.stance === "run"
                  ? ["Dash up to 10 ft before each hit; you may choose new targets for each."]
                  : [],
    },
    "Thief/Phantom Thief": {
        self: (ctx) => [{ category: "buff", changes: [stat("evasion", ctx.scale(100))] }],
        notes: ["Also +100% CR against crowd control, +1 Minor Action per turn, +1 reaction per round, and a Major Action if you enter Run Stance."],
    },
    "Thief/Unavoidable Casualties": {
        choices: [STANCE({ none: "Neither", hit: "Hit Stance (5% Lethality per max die)", run: "Run Stance (5 stamina per max die)" })],
        attack: strike("20d4"),
        summarize: (result, ctx) => {
            const maxed = result.parts.flatMap((p) => p.roll.dice.filter((d) => d.faces === 4).flatMap((d) => d.results)).filter((r) => r.result === 4).length;
            if (ctx.choices.stance === "hit") return [`${maxed} dice rolled max: ${5 * maxed}% Lethality.`];
            if (ctx.choices.stance === "run") return [`${maxed} dice rolled max: gain ${5 * maxed} stamina.`];
            return [`${maxed} dice rolled max.`];
        },
    },

    /* ---------- Vastwood Knight ---------- */

    "Vastwood Knight/Natural Precognition": {
        choices: [
            pick("stat", "Defense", { ac: "AC (+30)", evasion: "Evasion (+30%)", magicResist: "MR (+30%)" }),
            pick("resource", "Pay with", { stamina: "Stamina", mana: "Mana" }),
            SOVEREIGNTY,
        ],
        cost: (ctx) => ({ resource: ctx.choices.resource === "mana" ? "mana" : "stamina", amount: ctx.choices.sovereignty ? 15 : 30 }),
        area: around(50, "allies"),
        target: (ctx) => [
            { category: "buff", changes: [stat(String(ctx.choices.stat) as "ac" | "evasion" | "magicResist", ctx.scale(30))] },
        ],
        notes: ["Out of combat it instead detects whether a statement you doubt is true."],
    },
    "Vastwood Knight/Swordpoint Diplomacy": {
        choices: [pick("resource", "Pay with", { stamina: "Stamina", mana: "Mana" }), SOVEREIGNTY],
        cost: (ctx) => ({ resource: ctx.choices.resource === "mana" ? "mana" : "stamina", amount: ctx.choices.sovereignty ? 15 : 30 }),
        attack: strike("6d10"),
        notes: ["The target is marked for the encounter and chooses: attacks against it get +20% damage, or +10% crit chance (stacks)."],
    },
    "Vastwood Knight/Ambient Amelioration": {
        choices: [pick("resource", "Pay with", { stamina: "Stamina", mana: "Mana" })],
        cost: (ctx) => ({ resource: ctx.choices.resource === "mana" ? "mana" : "stamina", amount: 50 }),
        area: around(50, "allies"),
        heal: (ctx) => ({ formula: `${Math.max(1, ctx.targets.length)}d20` }),
        notes: ["Each target is also cleansed of a condition of their choice."],
    },
    "Vastwood Knight/Keen Eyed Inquisition": {
        choices: [
            pick("resource", "Pay with", { stamina: "Stamina", mana: "Mana" }),
            SOVEREIGNTY,
            count("repeats", "Attacks so far while concentrating (free, +5% crit each)"),
        ],
        cost: (ctx) =>
            Number(ctx.choices.repeats) > 0
                ? null
                : { resource: ctx.choices.resource === "mana" ? "mana" : "stamina", amount: ctx.choices.sovereignty ? 20 : 40 },
        attack: (ctx) => strike("8d10", { critChance: 5 * Number(ctx.choices.repeats) }),
    },

    /* ---------- Warlord ---------- */

    "Warlord/Pivot and Slash": { attack: strike("4d10"), notes: ["You may dash up to 5 ft before or after."] },
    "Warlord/Advancing Fire": { attack: strike("4d10"), notes: ["You may dash up to 15 ft toward the target if the attack doesn't miss."] },
    "Warlord/Knock Aside": { attack: strike("5d10"), notes: ["Push the target 10 ft in any direction except toward you."] },
    "Warlord/Hookshot": { attack: strike("5d10"), notes: ["Pull the target 20 ft toward you."] },
    "Warlord/Crippling Blow": {
        attack: strike("5d10"),
        target: [status("crippled")],
        notes: ["Their move speed is 0 for the rest of the turn."],
    },
    "Warlord/Stopping Shot": {
        attack: strike("5d10"),
        target: [status("crippled")],
        notes: ["Their move speed is 0 for the rest of the turn."],
    },

    /* ---------- Warper ---------- */

    "Warper/Stunbolt": { target: [status("stunned", { duration: "start of target's next turn" })] },
    "Warper/Quicksilver Dagger": {
        attack: (ctx) => {
            const cc = [...(ctx.targets[0]?.statuses ?? [])].filter((s) => CROWD_CONTROL.includes(s)).length;
            return strike(cc ? `5d4 + ${cc}d4` : "5d4");
        },
        notes: (ctx) => [`${[...(ctx.targets[0]?.statuses ?? [])].filter((s) => CROWD_CONTROL.includes(s)).length} crowd control condition(s) on the target.`],
    },
    "Warper/Ensorcelled Hibernation": {
        area: square(20, "all"),
        target: [status("sleeping", { duration: "1 minute" })],
        notes: ["Anyone who resists the Sleep is Stunned instead (apply Stunned to them by hand)."],
    },
    "Warper/Sever Tendons": {
        attack: strike("6d4"),
        target: [status("crippled")],
        notes: ["You may then dash 20 ft in any direction."],
    },
    "Warper/Dazzling Spray": {
        area: cone(60, "all"),
        target: [status("confused", { duration: "1 minute" })],
        notes: ["You're Hidden from anyone Confused this way."],
    },
    "Warper/Hunter's Knife": {
        choices: [pick("mode", "Mark effect", { cr: "Target loses 20% of its CR", teleport: "Your teleports next to it cost half mana" })],
        attack: strike("6d4"),
        target: (ctx) =>
            ctx.choices.mode === "cr"
                ? [{ name: "Hunter's Knife", category: "condition", resistible: false, changes: [statPercent("conditionResist", -20)] }]
                : [{ name: "Hunter's Knife", category: "condition", resistible: false, description: "<p>Teleports next to this target cost the Warper half mana.</p>" }],
    },
    "Warper/Fulminant Prism": {
        target: [status("immobilized", { name: "Fulminant Prism", description: "<p>Can't move, dash, teleport, planeswalk, or be displaced.</p>" })],
    },

    /* ---------- Warrior ---------- */

    "Warrior/Spill Blood": {
        attack: strike("4d10"),
        target: [bleed("1d10")],
        notes: ["The Bleed is amplified by your passive (not automated)."],
    },
    "Warrior/\"Charge!\"": {
        area: battlefield("allies"),
        target: (ctx) => [{ category: "buff", duration: "end of your next turn", modifiers: [damageIncrease(ctx.scale(50))] }],
        notes: ["All other allies who can hear you may use their reaction to move up to their speed."],
    },
    "Warrior/Cut Down": {
        choices: [pick("mode", "Choose", { cone: "10 ft cone, knock prone", line: "25 ft horizontal line, knock back 10 ft", both: "Both (3+ buffs)" })],
        area: (ctx) => (ctx.choices.mode === "line" ? line(25) : cone(10)),
        attack: strike("3d10"),
        target: (ctx) => (ctx.choices.mode === "line" ? [] : [status("prone")]),
        notes: (ctx) => (ctx.choices.mode === "both" ? ["Both: use it again for the line (the area here is the cone)."] : []),
    },
    "Warrior/Reinforce Armor": {
        choices: [
            count("buffs", "Buffs sacrificed"),
            pick("stat", "Increase", { ac: "AC", evasion: "Evasion", magicResist: "MR" }),
        ],
        self: (ctx) => [
            { category: "buff", changes: [statPercent(String(ctx.choices.stat) as "ac" | "evasion" | "magicResist", ctx.scale(25 * Number(ctx.choices.buffs)))] },
        ],
        notes: ["Remove the sacrificed buffs yourself (right-click them in the effects panel). Recasting ends the previous buff."],
    },
    "Warrior/\"Fight Me!\"": {
        area: battlefield(),
        target: [status("taunted", { duration: "1 minute" })],
        notes: ["All enemies who can hear you break concentration. Enemies taunted by this before are immune."],
    },
    "Warrior/Hack and Slash": {
        attack: strike("4d10"),
        notes: ["You may sacrifice a buff to repeat it for free."],
    },
    "Warrior/\"Overcome!\"": {
        area: battlefield("allies"),
        target: [{ name: "Overcome!", category: "buff", cleanse: ["fear", "stunned", "paralyzed", "confused", "sleeping", "charmed"] }],
        notes: ["Downed allies within 1000 ft are stabilized. Allies may use their reaction to cleanse another condition."],
    },
    "Warrior/Summary Execution": {
        choices: [count("buffs", "Buffs sacrificed (+10% Lethality each)")],
        area: around(5, "all"),
        attack: strike("8d10"),
        notes: (ctx) => [`Lethality equal to each target's % missing health after damage, plus ${10 * Number(ctx.choices.buffs)}%.`],
    },
    "Warrior/Paragon of Victory": {
        choices: [pick("tier", "Buffs sacrificed", { five: "5: immune to physical damage", ten: "10: also immune to conditions", fifteen: "15: also +50 speed, +100% damage" })],
        self: (ctx) => [
            {
                category: "buff",
                changes: ctx.choices.tier === "fifteen" ? [stat("speed", ctx.scale(50))] : [],
                modifiers: ctx.choices.tier === "fifteen" ? [damageIncrease(ctx.scale(100))] : [],
                description: `<p>${{ five: "Immune to physical damage.", ten: "Immune to physical damage, conditions, and crowd control.", fifteen: "Immune to physical damage, conditions, and crowd control." }[String(ctx.choices.tier)]}</p>`,
            },
        ],
        notes: ["Concentration. Remove the sacrificed buffs yourself. Immunities aren't automated."],
    },
    "Warrior/\"Kill them all!\"": {
        area: battlefield(),
        target: [
            { name: "Kill them all!", category: "condition", changes: [vulnerable("physical", 50)], description: "<p>50% physical vulnerability; natural elemental resistances lost.</p>" },
            status("fear"),
        ],
        notes: ["Strip all buffs from enemies who can hear you and distribute them among you and your allies."],
    },

    /* ---------- Blocks ---------- */

    "Warrior/Shields Up": {
        ...blockFor("Shields Up", (ctx) => 25 + 25 * ctx.buffs),
        notes: (ctx) => [`Blocks ${Math.min(100, 25 + 25 * ctx.buffs)}% (25% + 25% per buff on you).`, BLOCK_NOTE],
    },
    "Soldier/Intercept": {
        self: [blockSpec("Intercept", 100)],
        notes: ["Single-target attacks only. If the attacker is in melee range, you may dash to another space still in melee range.", BLOCK_NOTE],
    },
    "Champion/Parry and Draw": {
        self: [blockSpec("Parry and Draw", 100)],
        notes: ["Then you may swap weapons in both hands.", BLOCK_NOTE],
    },
    "Sentinel/Parallel Shields": {
        choices: [
            {
                ...pick("mode", "Mode", { split: "One block per shield (you or adjacent allies)", layer: "Layer shields (1 Shield stack)" }),
                optionRequires: { layer: "dualShields" as const },
            },
        ],
        self: (ctx) => (ctx.choices.mode === "layer" ? [blockSpec("Parallel Shields", 100)] : []),
        target: (ctx) => (ctx.choices.mode === "layer" ? [] : [blockSpec("Parallel Shields", 100)]),
        notes: (ctx) =>
            ctx.choices.mode === "layer"
                ? ["Blocks even unblockable attacks, and the attack can't penetrate AC. Expend a Shield stack.", BLOCK_NOTE]
                : ["Target one creature per equipped shield (yourself or adjacent allies), then apply.", BLOCK_NOTE],
    },
    "Sentinel/Rapid Shields": {
        ...blockFor("Rapid Shields", () => 100),
        notes: (ctx) => [
            `Blocks every hit of a multi-hit attack. For each hit blocked, you may autoattack the attacker as a free reaction${
                ctx.dualShields ? " (with each shield per hit if you expend a Shield stack)" : ""
            }.`,
            BLOCK_NOTE,
        ],
    },
    "Sentinel/Absorption Barrier": {
        self: [blockSpec("Absorption Barrier", 100)],
        target: [blockSpec("Absorption Barrier", 100)],
        restore: (ctx) => (ctx.targets.length ? [{ resource: "stamina", formula: String(Math.min(30, 10 * ctx.targets.length)) }] : []),
        notes: (ctx) => [
            "Blocks all damage and effects of the AOE for you and the targeted adjacent allies; recover 10 stamina per ally protected (max 30).",
            ...(ctx.dualShields ? ["You may expend a Shield stack to dash to any empty space you protected."] : []),
            BLOCK_NOTE,
        ],
    },
    "Soldier/Protective Sweep": {
        area: around(5, "allies"),
        self: [blockSpec("Protective Sweep", 100)],
        target: [blockSpec("Protective Sweep", 100)],
        notes: ["Blocks all effects of the incoming AOE for everyone within 5 ft.", BLOCK_NOTE],
    },
    "Sentinel/Grand Guardian": {
        self: (ctx) => [
            {
                category: "buff",
                description: `<p>${
                    ctx.dualShields ? "Twice per round (dual shields)" : "Once per round (twice with dual shields)"
                }, freely block an attack on yourself or an adjacent ally as a free reaction. Gain a Shield stack at the end of each of your turns instead of from Perfect Shield.</p>`,
                modifiers: [note("Free block available this round (cast Rapid Shields or add a 100% block effect).")],
            },
        ],
    },
    "Soldier/Long Live The King": {
        target: [{ name: "Long Live The King", category: "", duration: "start of your next turn", description: "<p>Attacks that would hit this ally can be redirected to their protector, who blocks 50% of them.</p>" }],
        notes: [
            "Until the start of your next turn, redirect attacks on the targeted adjacent ally to yourself: apply them to yourself with the ½ button.",
            "If they're not adjacent, you may dash to them as a free reaction (5 stamina per 5 ft, max 50 ft).",
        ],
    },
    "Warrior/Take Cover": {
        choices: [pick("mode", "Choose one", { shield: "Body shield (+30 AC, attack hits both)", tackle: "Tackle (+30% evasion, both prone)", drag: "Drag to safety (dash 20 ft more)" })],
        self: (ctx) => (ctx.choices.mode === "tackle" ? [{ name: "Take Cover", category: "buff", duration: "end of turn", changes: [stat("evasion", 30)] }, status("prone")] : []),
        target: (ctx) =>
            ctx.choices.mode === "shield"
                ? [{ name: "Take Cover", category: "buff", duration: "end of turn", changes: [stat("ac", 30)] }]
                : ctx.choices.mode === "tackle"
                  ? [{ name: "Take Cover", category: "buff", duration: "end of turn", changes: [stat("evasion", 30)] }, status("prone", { resistible: false })]
                  : [],
        notes: (ctx) =>
            ctx.choices.mode === "shield"
                ? ["Dash to the targeted ally first. The attack is redirected to both of you: apply its damage to each."]
                : ctx.choices.mode === "drag"
                  ? ["Dash to the targeted ally, then dash 20 ft more dragging them; they lose their reaction if they still have one."]
                  : ["Dash to the targeted ally first; you're both knocked prone."],
    },

    /* ---------- Arcane Archer buffs ---------- */

    "Arcane Archer/Unyielding Hunter": {
        self: [
            {
                category: "buff",
                changes: [statPercent("ac", 50)],
                description: "<p>+50% AC against melee attacks, +100% against ranged ones. Buffs on you have a 40% chance to ignore buff stripping.</p>",
            },
        ],
        notes: ["Applied as +50% AC. Against ranged attacks it's +100%: apply ranged damage with the AC doubled in mind (or ask the GM to treat AC as higher)."],
    },
    "Arcane Archer/Serrated Arrow": {
        choices: [pick("mode", "Use", { buff: "Gain the buff", sacrifice: "Sacrifice it: next attack converts 50% (ignores CR)" })],
        self: (ctx) =>
            ctx.choices.mode === "sacrifice"
                ? [{ name: "Serrated Arrow (sacrificed)", category: "", singleUse: true, modifiers: [{ type: "bleedConvert", rollType: "physical", weapon: "ranged", value: 50 }, note("This Bleed ignores Condition Resist: shift-click its Apply button.", { weapon: "ranged" })] }]
                : [
                      {
                          category: "buff",
                          modifiers: [
                              { type: "bleedConvert", rollType: "physical", weapon: "bow", value: 20 },
                              { type: "bleedConvert", rollType: "physical", weapon: "crossbow", value: 20 },
                              { type: "shred", rollType: "physical", weapon: "bow", value: 20 },
                              { type: "shred", rollType: "physical", weapon: "crossbow", value: 20 },
                          ],
                      },
                  ],
        notes: (ctx) => (ctx.choices.mode === "sacrifice" ? ["Remove your Serrated Arrow buff."] : []),
    },
    "Arcane Archer/Bruiser Arrow": {
        choices: [pick("mode", "Use", { buff: "Gain the buff", sacrifice: "Sacrifice it: next attack inflicts 50% vulnerability" })],
        self: (ctx) =>
            ctx.choices.mode === "sacrifice"
                ? [
                      {
                          name: "Bruiser Arrow (sacrificed)",
                          category: "",
                          singleUse: true,
                          modifiers: [
                              { type: "vulnerability", rollType: "physical", weapon: "ranged", damageType: "physical", value: 50 },
                              note("The target loses their next Major Action.", { weapon: "ranged" }),
                          ],
                      },
                  ]
                : [
                      {
                          category: "buff",
                          modifiers: [
                              { type: "vulnerability", rollType: "physical", weapon: "bow", damageType: "physical", value: 10 },
                              { type: "vulnerability", rollType: "physical", weapon: "crossbow", damageType: "physical", value: 10 },
                              note("25% chance the target loses their next Major Action.", { weapon: "bow" }),
                              note("25% chance the target loses their next Major Action.", { weapon: "crossbow" }),
                          ],
                      },
                  ],
        notes: (ctx) => (ctx.choices.mode === "sacrifice" ? ["Remove your Bruiser Arrow buff."] : []),
    },

    /* ---------- Assorted ---------- */

    "Sniper/Professional Shooter": {
        gain: [{ resource: "spotting", formula: "8" }],
        self: [{ name: "Spotter Exhausted", category: "", duration: "Endless", description: "<p>You lose the benefits of the Spotter passive until your next long rest.</p>" }],
        notes: ["Requires a Spotted enemy. You're at max Spotting; after expending it, Spotter does nothing until a long rest."],
    },
    "Juggernaut/Critical Condition": {
        self: [
            {
                category: "buff",
                duration: "end of your next turn",
                modifiers: [
                    damageIncrease(100, { rollType: "physical", damageType: "physical" }),
                    { type: "penetration", rollType: "physical", damageType: "physical", value: 100 },
                    { type: "accuracy", rollType: "all", value: 100 },
                    { type: "unblockable", rollType: "all", value: 100 },
                ],
            },
        ],
        notes: [
            "Your health becomes 1 instead of 0: undo the damage card that dropped you and set health to 1 (or heal back to 1).",
            "At the end of your next turn your health drops to 0 and you're Downed with 70 Downed Health.",
        ],
    },
    "Assassin/Pursue": {
        target: [
            {
                name: "Pursued",
                category: "",
                duration: "Endless",
                maxStacks: Infinity,
                resistible: false,
                description: "<p>Marked by an Assassin: +50% critical damage modifier on their attacks against this target, per mark.</p>",
            },
        ],
        notes: ["Move an equal distance towards the target. Each mark gives +50% crit damage on your attacks against them (add it as a crit damage modifier when attacking)."],
    },
    "Thief/Charm and Disarm": {
        choices: [yesNo("hit", "In Hit Stance and stealing armor (Confusion lasts longer)")],
        target: (ctx) => [status("confused", { duration: ctx.choices.hit ? "end of target's next turn" : "start of target's next turn" })],
        notes: ["Steal an equipped weapon or armor piece (move it to your inventory). In Hit Stance with a weapon, you may autoattack with it first."],
    },
    "Thief/Dodge the Law": {
        choices: [yesNo("run", "In Run Stance (40 ft dash, become Hidden)")],
        self: (ctx) => [
            { name: "Dodge the Law", category: "", cleanse: ["crippled", "immobilized", "prone", "slowed"] },
            ...(ctx.choices.run ? [status("hidden")] : []),
        ],
        notes: (ctx) => [`Break grapples and bindings, then dash up to ${ctx.choices.run ? 40 : 30} ft. Ignore movement-preventing effects until the end of your next turn.`],
    },
    "Captain/Bunker Down": {
        area: around(50, "allies"),
        target: [{ name: "Bunker Down", category: "buff", duration: "end of target's next turn", changes: [vulnerable("all", -100)], description: "<p>Invulnerable to damage until the end of your turn (or until the Captain's concentration breaks). Your next Move Action becomes a Major Action.</p>" }],
        notes: ["Each cast gains +25% chance to fail. Standing Orders: allies quaff a potion or apply poison to their weapons."],
    },
    "Lightning Duelist/Flash of Swords": {
        area: around(5),
        attack: strike("8d8"),
        notes: [
            "Then dash up to 25 ft: 4d8 to enemies you pass through, and 8d8 to enemies adjacent to where you stop. Use the ability's 'Roll' again on those targets, halving dice for the pass-through.",
            "An enemy can't be hit more than once per cast.",
        ],
    },
};