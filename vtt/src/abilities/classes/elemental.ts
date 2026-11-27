/**
 * Elemental casters and duelists. See ../catalog.ts for conventions.
 */
import {
    around,
    burn,
    burst,
    cone,
    count,
    damageIncrease,
    line,
    note,
    onHit,
    onHitStatus,
    pick,
    spell,
    square,
    stacksOf,
    stat,
    status,
    strike,
    vulnerable,
    weaken,
    yesNo,
} from "../helpers.ts";
import type { AbilityAutomation } from "../types.ts";

export const ELEMENTAL: Record<string, AbilityAutomation> = {
    /* ---------- Aeromancer ---------- */

    "Aeromancer/Tailwind": {
        target: (ctx) => [{ category: "buff", changes: [stat("speed", ctx.scale(20))] }],
        notes: ["The target can end the buff as a reaction to dash 20 ft in any direction."],
    },
    "Aeromancer/Wind Slash": {
        attack: spell("6d8", "air", { unblockable: 100, cannotMiss: true }),
        notes: ["Also hits up to 2 enemies adjacent to the target (target them too). Bypasses barriers."],
    },
    "Aeromancer/Aeroblast": {
        choices: [{ ...yesNo("windsOfWar", "Expend 4 Winds of War stacks to knock prone"), resource: "winds", amount: 4 }],
        target: (ctx) => (ctx.choices.windsOfWar ? [status("prone")] : []),
        notes: ["Push the target 20 ft in a direction of your choice."],
    },
    "Aeromancer/Blowback": {
        target: [{ name: "Blowback", category: "condition", duration: "end of target's next turn", description: "<p>Non-melee abilities have their range halved.</p>" }],
        notes: ["Counter the triggering spell."],
    },
    "Aeromancer/Sky Uppercut": {
        attack: spell("8d8", "air"),
        target: [status("airborne", { changes: [vulnerable("air", 50)], description: "<p>Knocked Up, with 50% air vulnerability until this ends.</p>" })],
    },
    "Aeromancer/Vicious Cyclone": {
        choices: [count("extra", "Extra 20-mana steps (+5 ft each)")],
        cost: (ctx) => ({ resource: "mana", amount: 40 + 20 * Number(ctx.choices.extra) }),
        // The cyclone stays: enemies starting their turn in it take 4d8 air.
        area: (ctx) => ({ ...square(15 + 5 * Number(ctx.choices.extra)), zone: { events: ["tokenTurnStart"], damage: { formula: "4d8", type: "air" } } }),
        attack: spell("6d8", "air"),
        notes: ["Concentration. Knocked Up enemies in the cyclone stay Airborne."],
    },
    "Aeromancer/Buffeting Storm": {
        target: (ctx) => [
            { name: "Buffeting Storm (ally)", category: "buff", changes: [stat("speed", ctx.scale(20))] },
            { name: "Buffeting Storm (enemy)", category: "condition", resistible: false, changes: [stat("speed", -20)] },
        ],
        notes: ["Concentration. While concentrating, spend 5 mana as a Minor Action to push any target 10 ft."],
    },
    "Aeromancer/Vicious Hurricane": {
        self: [{ name: "Vicious Hurricane", category: "", modifiers: [{ type: "penetration", rollType: "magic", damageType: "air", value: 100 }] }],
        notes: [
            "Concentration. At the end of each of your turns, deal 10d8 air magic damage to all enemies in range and Knock them Up.",
            "While concentrating you can cast any air spell you know as a reaction.",
        ],
    },
    "Aeromancer/Take Flight": {
        target: (ctx) => [{ category: "buff", changes: [stat("evasion", ctx.scale(20))] }],
        notes: ["Concentration. All movement speed becomes flying speed, and attack range increases by 50%."],
    },

    /* ---------- Air Duelist ---------- */

    "Air Duelist/Mistral Bow": {
        self: [{ category: "buff", modifiers: [note("push the target 5 ft away", { rollType: "physical", weapon: "bow" })] }],
    },
    "Air Duelist/Wind Strike": {
        attack: spell("5d8", "air"),
        notes: ["Push the target 10 ft away from you."],
    },
    "Air Duelist/Gale Shot": {
        attack: strike("4d8"),
        notes: ["Dash 10 ft in any direction after the shot."],
    },
    "Air Duelist/Arc of Air": {
        self: (ctx) => [{ category: "buff", modifiers: [onHit(ctx.dice("2d8"), "air", { weapon: "bow" })] }],
    },
    "Air Duelist/Cutting Winds": {
        area: square(25, "all"),
        attack: spell("6d8", "air"),
        target: [status("prone", { resistible: false })],
    },
    "Air Duelist/Zephyr Shot": {
        attack: strike("1d8", { hits: 5 }),
        notes: ["You may change targets between hits. Apply damage applies all 5 hits to each target, so split hits by hand."],
    },
    "Air Duelist/Bow of Hurricanes": {
        self: [
            {
                category: "buff",
                modifiers: [
                    { type: "convert", rollType: "physical", weapon: "bow", damageType: "air", value: 1 },
                    note("special ammunition has +50% range", { rollType: "physical", weapon: "bow" }),
                ],
            },
        ],
    },
    "Air Duelist/Harassing Whirlwind": {
        attack: spell("4d8", "air"),
        target: [
            {
                category: "condition",
                dot: { formula: "4d8", type: "air" },
                description: "<p>Takes 4d8 air magic damage and is pushed 20 ft at the beginning of each turn.</p>",
            },
        ],
        notes: ["Concentration: remove the effect if concentration breaks. Push the target 20 ft each turn."],
    },
    "Air Duelist/Storm Shot": {
        area: square(25),
        attack: strike("6d8"),
        target: [status("crippled", { duration: "1 minute" })],
        notes: ["Flying enemies take 100% increased damage (apply twice), can't evade this, and are also Knocked Prone."],
    },

    /* ---------- Aquamancer ---------- */

    "Aquamancer/Baptize": {
        heal: { formula: "6d6" },
        summarize: (result) => {
            const sixes = result.parts
                .flatMap((p) => p.roll.dice.flatMap((d) => d.results))
                .filter((r) => r.active && r.result === 6).length;
            return sixes ? [`Rolled ${sixes} six${sixes > 1 ? "es" : ""}: cleanse ${sixes} random condition(s).`] : [];
        },
    },
    "Aquamancer/Hydro Pump": {
        area: line(60),
        attack: spell("6d6", "water"),
        notes: ["The last enemy in the line is pushed 10 ft away from you."],
    },
    "Aquamancer/Rain of Wellness": {
        area: square(30, "allies"),
        target: (ctx) => [
            { category: "buff", duration: "start of your next turn", changes: [stat("conditionResist", ctx.scale(20))] },
        ],
        notes: [
            "Allies in the rain cleanse a condition of their choice now, and again when it ends at the start of your next turn.",
        ],
    },
    "Aquamancer/Tidal Wave": {
        // The shallow water it leaves behind is difficult terrain for an hour.
        area: { ...square(30), zone: { events: [], difficultTerrain: true, duration: "1 hour" } },
        attack: spell("8d6", "water"),
    },
    "Aquamancer/Washout": {
        choices: [count("mana", "Mana spent on the countered spell")],
        heal: (ctx) => ({ formula: String(Number(ctx.choices.mana) || 0), self: true }),
        notes: ["Counter the triggering spell."],
    },
    "Aquamancer/Draught of Vigor": {
        choices: [
            pick("first", "First effect", DRAUGHT_OPTIONS()),
            pick("second", "Second effect", DRAUGHT_OPTIONS(), "Must differ from the first."),
            yesNo("bottle", "Bottle it into a potion (+20 mana)"),
        ],
        cost: (ctx) => ({ resource: "mana", amount: 40 + (ctx.choices.bottle ? 20 : 0) }),
        target: (ctx) => {
            const picks = [...new Set([String(ctx.choices.first), String(ctx.choices.second)])];
            return picks.map((key) => draughtEffect(key, ctx.scale, ctx.dice));
        },
        notes: (ctx) => [
            ...(ctx.choices.first === ctx.choices.second ? ["You picked the same effect twice; it only applies once."] : []),
            ...(ctx.choices.bottle ? ["Bottled: the potion expires in 1 hour."] : []),
        ],
    },
    "Aquamancer/Water Whip": {
        attack: spell("9d6", "water", { canCrit: true, unblockable: 100, cannotMiss: true }),
        notes: ["If it doesn't fail, you may pull the target 10 ft toward you."],
    },
    "Aquamancer/Bubble Barrier": {
        target: (ctx) => [
            { name: "Bubble: AC", category: "buff", changes: [stat("ac", ctx.scale(20))] },
            { name: "Bubble: MR", category: "buff", changes: [stat("magicResist", ctx.scale(30))] },
            { name: "Bubble: Evasion", category: "buff", changes: [stat("evasion", ctx.scale(25))] },
        ],
        notes: ["Divide the three orbs among targets. Each orb blocks one attack on its bearer, then dissipates (remove it)."],
    },

    /* ---------- Cryomancer ---------- */

    "Cryomancer/Ice Spear": {
        area: line(30),
        // Full damage to the aimed target, half to enemies along the path. Target the intended token before casting;
        // otherwise the farthest enemy in the line is treated as the target.
        attack: spell("6d8", "ice", {
            targetScale: (index, { count, wasTargeted, anyTargeted }) => (anyTargeted ? (wasTargeted ? 1 : 0.5) : index === count - 1 ? 1 : 0.5),
        }),
        notes: ["Full damage to the target (the one you had targeted, or the farthest in the line); half to enemies along the path."],
    },
    "Cryomancer/Glacial Crash": {
        area: around(15),
        attack: {
            rollType: "magic",
            damage: [],
            tiers: [
                { within: 5, damage: [{ formula: "8d8", type: "ice" }] },
                { within: 10, damage: [{ formula: "6d8", type: "ice" }] },
                { within: 15, damage: [{ formula: "4d8", type: "ice" }] },
            ],
        },
        target: [status("frozen", { within: 5 }), status("slowed", { beyond: 5, within: 10 })],
        notes: ["The rulebook says the 15 ft ring takes \"4d8 damage\" with no type; it's rolled as ice here."],
    },
    "Cryomancer/Flash Freeze": {
        target: [status("frozen"), status("slowed")],
        notes: ["Frozen goes on the target; Slowed goes on enemies adjacent to it. Applies a Frostbite stack even if resisted."],
    },
    "Cryomancer/Freezing Wind": {
        area: cone(60),
        target: [
            status("slowed", {
                // Already slowed (or frostbitten) enemies are Frozen instead.
                resolve: (target, spec) =>
                    target.statuses.has("slowed") || target.statuses.has("frostbite") ? status("frozen", { cleanse: ["slowed"] }) : spec,
            }),
        ],
        notes: ["Enemies already Slowed or with a Frostbite stack are Frozen instead."],
    },
    "Cryomancer/Extinguish": {
        target: [status("silenced", { duration: "end of target's next turn" })],
        notes: ["Counter the triggering spell."],
    },
    "Cryomancer/Shatter": {
        attack: spell("10d8", "ice"),
        target: [status("slowed", { cleanse: ["frozen"], resistible: false })],
        notes: ["Only targets that are Frozen. Repeats on an adjacent Frozen target; each target can only be hit once per cast."],
    },
    "Cryomancer/Hypothermia": {
        target: [
            status("slowed", {
                name: "Hypothermia",
                changes: [{ key: "system.stats.evasion.multiplier", value: -100 }],
                description: "<p>Slowed, loses its Major action, Minor action, and reaction, and loses all Evasion.</p>",
            }),
        ],
        notes: ["Concentration: remove the effect if concentration breaks."],
    },
    "Cryomancer/Ice Block": {
        self: (ctx) => [
            {
                category: "buff",
                duration: "start of your next turn",
                changes: [stat("ac", ctx.scale(20)), stat("magicResist", ctx.scale(30))],
            },
        ],
        notes: ["While this lasts, you can use your reaction to block one attack on you or an ally within 30 ft for free."],
    },
    "Cryomancer/Aurora Beam": {
        choices: [count("mana", "Mana to spend (X)", undefined, "Damage is (X / 5)d8.")],
        cost: (ctx) => ({ resource: "mana", amount: Number(ctx.choices.mana) || 0 }),
        area: line(60, "all"),
        attack: (ctx) => spell(`${Math.max(1, Math.floor((Number(ctx.choices.mana) || 0) / 5))}d8`, "ice"),
        notes: [
            "You may concentrate and repeat it as a Major Action for no mana at half its previous damage.",
            "Refund half the mana if it consumes 5+ Frostbite stacks, all of it at 10+.",
        ],
    },

    /* ---------- Dark Duelist ---------- */

    "Dark Duelist/Accursed Blade": {
        self: [{ category: "buff", modifiers: [onHitStatus("cursed", { weapon: "longblade" })] }],
    },
    "Dark Duelist/Dark Pulse": {
        area: cone(20),
        attack: spell("3d10", "dark"),
        target: [status("cursed")],
    },
    "Dark Duelist/Shadow Strike": {
        attack: (ctx) => {
            const curses = stacksOf(ctx.targets[0], "cursed");
            return strike(curses ? `3d12 + ${curses}d12` : "3d12");
        },
        notes: (ctx) => [`Counted ${stacksOf(ctx.targets[0], "cursed")} Curse(s) on ${ctx.targets[0]?.name ?? "the target (none targeted)"}.`],
    },
    "Dark Duelist/Sword of Darkness": {
        self: (ctx) => [{ category: "buff", modifiers: [onHit(ctx.dice("2d10"), "dark", { weapon: "longblade" })] }],
    },
    "Dark Duelist/Shadow Missiles": {
        attack: spell("3d10", "dark", { cannotMissAgainst: "cursed" }),
        target: [status("cursed")],
        notes: ["Up to 3 targets. Already-Cursed targets can't dodge it (handled on Apply) and it ignores their MR (not automated per target)."],
    },
    "Dark Duelist/Void Slash": {
        attack: (ctx) => strike("4d12", { ignoreAC: stacksOf(ctx.targets[0], "cursed") > 0 }),
        notes: (ctx) =>
            stacksOf(ctx.targets[0], "cursed") > 0
                ? ["Target is Cursed: hits through barriers and walls, ignores shields and blocks, and bypasses AC."]
                : [],
    },
    "Dark Duelist/Blade of Shadows": {
        self: [{ category: "buff", modifiers: [{ type: "convert", rollType: "physical", weapon: "longblade", damageType: "dark", value: 1 }] }],
        notes: ["Dark damage from melee sword attacks creates Scars; consuming Scars also refreshes your Minor Action and restores 10 stamina."],
    },
    "Dark Duelist/Shadow Grasp": {
        attack: spell("3d10", "dark"),
        target: [
            status("immobilized", {
                name: "Shadow Grasp",
                dot: { formula: "1d10", type: "dark" },
                description: "<p>Immobilized. Takes 1d10 dark magic damage and gains a Curse at the start of each turn; Curses can't be expunged.</p>",
                triggers: [{ event: "turnStart", action: "grant", effect: status("cursed", { duration: "Endless" }) }],
            }),
        ],
    },
    "Dark Duelist/Vampiric Slash": {
        attack: strike("5d12"),
        notes: (ctx) => {
            const curses = stacksOf(ctx.targets[0], "cursed");
            return [`Expunge the target's ${curses} Curse(s); for each, either heal 2d12 or empower your next greatsword attack or dark spell by +50%.`];
        },
    },
    "Dark Duelist/Lifereaper": {
        area: around(20, "all"),
        attack: strike("8d12"),
        notes: ["This turn, consumed Scars grant a bonus Major Action instead of refreshing it."],
    },

    /* ---------- Dynamancer ---------- */

    "Dynamancer/Lightning Bolt": {
        rolls: { extraDie: "1d100", ignoreMR: "1d100", noCounter: "1d100" },
        area: line(150),
        attack: (ctx) =>
            spell(ctx.rolls.extraDie <= 50 ? "4d12 + 1d12" : "4d12", "lightning", { ignoreMR: ctx.rolls.ignoreMR <= 30 }),
        target: [status("paralyzed")],
        notes: (ctx) => [
            ctx.rolls.extraDie <= 50 ? "Extra d12 lightning damage (50%)." : "No extra damage die.",
            ctx.rolls.ignoreMR <= 30 ? "Ignores MR (30%)." : "Doesn't ignore MR.",
            ctx.rolls.noCounter <= 20 ? "Can't be counterspelled (20%)." : "Can be counterspelled.",
        ],
    },
    "Dynamancer/Spark Bolt": {
        rolls: { effect: "1d100" },
        attack: (ctx) => spell(ctx.rolls.effect <= 50 ? "4d12 + 1d12" : "4d12", "lightning"),
        target: (ctx) =>
            ctx.rolls.effect <= 50
                ? []
                : ctx.rolls.effect <= 80
                  ? [status("paralyzed", { duration: "1 minute" })]
                  : [status("stunned", { duration: "start of your next turn" })],
        notes: (ctx) => [
            ctx.rolls.effect <= 50 ? "Extra d12 lightning damage." : ctx.rolls.effect <= 80 ? "Paralyzes for 1 minute." : "Stuns until the start of your next turn.",
        ],
    },
    "Dynamancer/Energize": {
        rolls: { effect: "1d100" },
        self: (ctx) => [
            {
                category: "buff",
                singleUse: true,
                modifiers: [
                    { type: "canCrit", rollType: "magic", value: 1 },
                    ...(ctx.rolls.effect <= 50 ? [{ type: "damage" as const, rollType: "magic" as const, damageType: "lightning", value: "1d12" }] : []),
                    ...(ctx.rolls.effect > 50 && ctx.rolls.effect <= 80 ? [note("range +20 ft or +20%, whichever is higher", { rollType: "magic" })] : []),
                    ...(ctx.rolls.effect > 80 ? [note("mana cost reduced by 20 or 20%, whichever is lower", { rollType: "magic" })] : []),
                ],
            },
        ],
        notes: ["Applies to your next damaging spell."],
    },
    "Dynamancer/Lightning Rod": {
        area: square(25),
        attack: spell("3d12", "lightning"),
        notes: ["Leaves a Lightning Rod totem: whenever a lightning spell is cast within 100 ft, it deals 1d12-3d12 lightning to all enemies within 25 ft."],
    },
    "Dynamancer/Live Wire": {
        attack: spell("2d12", "lightning"),
        target: [
            {
                category: "condition",
                dot: { formula: "2d12", type: "lightning" },
                description:
                    "<p>Each turn, roll: 50% the target takes 2d12 lightning; 30% it and adjacent enemies do; 20% they also gain 20% lightning vulnerability.</p>",
            },
        ],
        notes: ["The start-of-turn damage only hits the target; spread it to adjacent enemies by hand on a 51+."],
    },
    "Dynamancer/Frazzle": {
        rolls: { effect: "1d100" },
        attack: (ctx) => (ctx.rolls.effect <= 50 ? spell("2d12", "lightning", { scaling: "none" }) : null),
        target: (ctx) =>
            ctx.rolls.effect <= 50 ? [] : ctx.rolls.effect <= 80 ? [status("paralyzed")] : [status("stunned", { duration: "end of turn" })],
        notes: ["Counter the triggering spell."],
    },

    /* ---------- Lightning Duelist ---------- */

    "Lightning Duelist/Taser Blade": {
        self: [{ category: "buff", modifiers: [onHitStatus("paralyzed", { weapon: "fine" })] }],
    },
    "Lightning Duelist/Shock Tendrils": {
        area: line(20),
        attack: spell("3d12", "lightning"),
        notes: ["At the end of your turn it deals 3d12 to all targets in a 20 ft line in a random direction."],
    },
    "Lightning Duelist/Lightning Lunge": {
        attack: strike("4d8"),
        notes: ["Dash up to 10 ft first."],
    },
    "Lightning Duelist/Sword of Lightning": {
        self: (ctx) => [{ category: "buff", modifiers: [onHit(ctx.dice("2d12"), "lightning", { weapon: "fine" })] }],
    },
    "Lightning Duelist/Blade Storm": {
        rolls: { hits: "1d5 + 1" },
        attack: (ctx) => strike("1d8", { hits: ctx.rolls.hits }),
    },
    "Lightning Duelist/Plasma Saber": {
        self: [{ category: "buff", modifiers: [{ type: "convert", rollType: "physical", weapon: "fine", damageType: "lightning", value: 1 }] }],
        notes: ["Battle Current empowered attacks recover 5, 10, or 15 stamina at random."],
    },
    "Lightning Duelist/Thunder Blast": {
        area: square(20, "all"),
        attack: spell("8d12", "lightning"),
        notes: ["Until the start of your next turn, random lightning strikes in the square deal 4d12 lightning to entities struck."],
    },
    "Lightning Duelist/Shocking Parry": {
        attack: strike("5d8"),
        notes: ["Fully block the triggering attack. On a hit, 50% chance to recover half the stamina cost."],
    },
    "Lightning Duelist/Arc Lightning": {
        attack: spell("6d12", "lightning"),
        target: [{ name: "Arc Lightning mark", category: "condition", duration: "end of your next turn", resistible: false }],
        notes: [
            "Rapier damage to the mark fires 6d12 lightning at it (clearing the mark) and 6d12 at another random enemy within 40 ft, which is marked.",
        ],
    },

    /* ---------- Luxomancer ---------- */

    "Luxomancer/Lightbolt": {
        attack: spell("4d10", "light"),
        notes: ["Banks 100% of its mana cost for Guiding Light."],
    },
    "Luxomancer/Light Touch": {
        choices: [yesNo("touch", "Cast at touch range (6d10 instead of 4d10)")],
        heal: (ctx) => ({ formula: ctx.choices.touch ? "6d10" : "4d10" }),
    },
    "Luxomancer/Warrior of Light": {
        target: (ctx) => [{ category: "buff", modifiers: [onHit(ctx.dice("4d10"), "light"), { type: "accuracy", rollType: "all", value: ctx.scale(20) }] }],
        notes: ["Light healing spells on the target are also 50% more effective (not automated)."],
    },
    "Luxomancer/Beam of Light": {
        choices: [{ ...yesNo("banked", "Spend 10 banked Guiding Light mana to ignore MR"), resource: "healingMana", amount: 10 }],
        area: line(100),
        attack: (ctx) => spell("6d10", "light", { ignoreMR: !!ctx.choices.banked }),
    },

    "Luxomancer/Healing Surge": {
        choices: [{ key: "mana", label: "Banked Healing Mana to spend", type: "number", default: 0, min: 0, resource: "healingMana" }],
        heal: (ctx) => ({ formula: String(Number(ctx.choices.mana) || 0) }),
        notes: ["Distribute the healing among any number of targets in range: apply to each and undo/adjust, or apply to one."],
    },

    /* ---------- Mirror Mage ---------- */

    "Mirror Mage/Glass Shot": {
        choices: [pick("parity", "Spaces traveled", { odd: "Odd: ice, Slows", even: "Even: light, -10% EV" })],
        attack: (ctx) => spell("7d8", ctx.choices.parity === "even" ? "light" : "ice"),
        target: (ctx) =>
            ctx.choices.parity === "even"
                ? [{ name: "Glass Shot (-10% EV)", category: "condition", changes: [stat("evasion", -10)] }]
                : [status("slowed")],
    },
    "Mirror Mage/Helix Beam": {
        choices: [pick("element", "Element", { ice: "Ice (20% Frozen)", light: "Light (20% Stun)" })],
        area: line(60),
        attack: (ctx) => spell("9d8", ctx.choices.element === "light" ? "light" : "ice", { redirectSwap: ["ice", "light"] }),
        target: [
            {
                name: "Helix Beam",
                category: "condition",
                // The element flips with each redirect, and the chance grows 20% per redirect. Rolled per target.
                resolve: (target, _spec, ctx, info) => {
                    const redirects = info?.redirects ?? 0;
                    const startIce = ctx.choices.element !== "light";
                    const ice = redirects % 2 === 0 ? startIce : !startIce;
                    const chance = 20 + 20 * redirects;
                    const uniform = (globalThis as { CONFIG?: { Dice?: { randomUniform?: () => number } } }).CONFIG?.Dice?.randomUniform;
                    const roll = Math.ceil((uniform?.() ?? Math.random()) * 100);
                    if (roll > chance) {
                        globalThis.ui?.notifications?.info(`${target.name}: rolled ${roll} vs ${chance}%, no ${ice ? "Frozen" : "Stun"}.`);
                        return null;
                    }
                    return ice ? status("frozen") : status("stunned", { duration: "end of target's next turn" });
                },
            },
        ],
        notes: ["Each target rolls its condition chance (20%, +20% per redirect) when you click Apply Helix Beam."],
    },
    "Mirror Mage/Scatter Shards": {
        choices: [pick("element", "Element", { ice: "Ice", light: "Light" })],
        attack: (ctx) => spell("5d8", ctx.choices.element === "light" ? "light" : "ice"),
        notes: [
            "Three shards: use the ability three times or apply this card to each shard's target. Each shard reflects once off the enemy it hits, in a direction you choose: apply it to that second target with the ↪ (redirected) button for Alter Course's bonus.",
        ],
    },
    "Mirror Mage/Mirror's Curse": {
        target: [
            {
                name: "Mirror's Curse",
                category: "condition",
                description: "<p>When they cast spells, 50% chance the spell's target is redirected to the caster (AOEs center on them).</p>",
            },
        ],
    },
    "Mirror Mage/Glass Armor": {
        target: (ctx) => [
            {
                category: "buff",
                changes: [
                    stat("magicResist", ctx.scale(50)),
                    { key: "system.elementResist.light", value: ctx.scale(50) },
                    { key: "system.elementResist.ice", value: ctx.scale(50) },
                ],
            },
        ],
        notes: ["Projectiles and line AOEs hitting the target are redirected; melee attackers are pushed back 30 ft. 50% chance to resist being stripped."],
    },
    "Mirror Mage/Beam of Brilliance": {
        choices: [pick("element", "Center line element", { ice: "Ice center, light edges", light: "Light center, ice edges" })],
        area: { shape: "line", size: 60, width: 15, widthPerRedirect: 10 },
        attack: (ctx) => spell("15d8", ctx.choices.element === "light" ? "light" : "ice"),
        notes: [
            "Targets on the edge lines take the other element. Ice inflicts Slow and Frozen; light inflicts -20% EV and Stun until the end of their turn.",
            "Each redirect adds 10 ft of width (traced automatically off your mirrors).",
        ],
    },
    "Mirror Mage/Reflective Barrier": {
        notes: [
            "Create a 15 ft barrier in empty spaces within 30 ft until the end of the turn: it blocks line of sight and sends projectile attacks and line AOEs back at the attacker.",
            "On the attacker's damage card, use the ↩ (redirect to attacker) button instead of Apply damage.",
        ],
    },
    "Mirror Mage/Remand": {
        choices: [count("mana", "Mana spent on the countered spell")],
        notes: (ctx) => [
            `Counter the spell. Its ${Number(ctx.choices.mana) || 0} mana becomes yours: release it, or cast a Refraction spell (a mirror) as a free reaction with it.`,
        ],
    },
    "Mirror Mage/Plane Mirror": {
        summon: {
            name: "Plane Mirror",
            img: "icons/magic/light/beam-deflect-path-yellow.webp",
            stats: { health: 1 },
            mirror: "plane",
            effects: [{ name: "Mirror", category: "", changes: [vulnerable("all", -100)], description: "<p>Immune to damage and conditions; can't be moved or teleported, but can be dispelled.</p>" }],
            description:
                "Reflects your line AOEs and straight projectile spells by angle, resetting their range (+20% accuracy). Opaque from behind. Rotate the token to aim it: at rotation 0 it faces down.",
        },
    },
    "Mirror Mage/Convex Mirror": {
        summon: {
            name: "Convex Mirror",
            img: "icons/magic/light/beam-deflect-path-yellow.webp",
            stats: { health: 1 },
            mirror: "convex",
            effects: [{ name: "Mirror", category: "", changes: [vulnerable("all", -100)], description: "<p>Immune to damage and conditions; can't be moved or teleported, but can be dispelled.</p>" }],
            description:
                "Hit from behind, it splits the beam into two out the front at 45° angles, resetting range (+20% accuracy). Its front reflects like a plane mirror. Rotate the token to aim it: at rotation 0 it faces down.",
        },
    },
    "Mirror Mage/Concave Mirror": {
        summon: {
            name: "Concave Mirror",
            img: "icons/magic/light/beam-deflect-path-yellow.webp",
            stats: { health: 1 },
            mirror: "concave",
            effects: [{ name: "Mirror", category: "", changes: [vulnerable("all", -100)], description: "<p>Immune to damage and conditions; can't be moved or teleported, but can be dispelled.</p>" }],
            description:
                "Spells hitting its back are stored until the end of the turn, then fired combined out the front orthogonally: maximized dice, +50% accuracy, +50% magic penetration. Dispelled if it combines more than 2 spells in a turn. Its front reflects like a plane mirror.",
        },
        notes: ["Stored spells aren't automated: at the end of the turn, cast the combined attack by hand (max dice, +50% magic penetration)."],
    },
    "Mirror Mage/Move Mirrors": {
        notes: ["Move any of your mirror tokens up to 30 ft and re-rotate them. Their durations refresh (edit their Summoned effect, or note it)."],
    },

    /* ---------- Mistguard ---------- */

    "Mistguard/Morning Frost": {
        choices: [yesNo("initiative", "Cast when Initiative is rolled (+10 mana)")],
        cost: (ctx) => ({ resource: "mana", amount: 25 + (ctx.choices.initiative ? 10 : 0) }),
        area: around(20, "allies"),
        shielding: { amount: 30 },
    },
    "Mistguard/Annul": {
        choices: [count("mana", "Mana spent on the countered spell")],
        shielding: (ctx) => ({ amount: 2 * (Number(ctx.choices.mana) || 0), self: true }),
        notes: ["Counter the triggering spell."],
    },

    "Mistguard/Silver Armor": {
        self: (ctx) => [{ category: "buff", changes: [stat("ac", ctx.scale(40)), stat("magicResist", ctx.scale(40))] }],
        notes: ["This MR can't be penetrated, and you gain 60% crit resistance if you have none (neither is tracked yet)."],
    },
    "Mistguard/Deep Snow": {
        area: around(20),
        attack: spell("7d8", "ice"),
        notes: ["The affected spaces become deep snow: difficult terrain that can't be dashed through."],
    },
    "Mistguard/Glacial Gust": {
        area: cone(60),
        attack: spell("9d8", "ice"),
        notes: ["Push all targets back to the edge of the cone. Targets can't dash to avoid it."],
    },
    "Mistguard/Mist Screen": {
        choices: [count("conditions", "Conditions on the attacker", undefined, "-5 mana each.")],
        cost: (ctx) => ({ resource: "mana", amount: Math.max(0, 35 - 5 * Number(ctx.choices.conditions)) }),
        notes: ["Block the attack."],
    },
    "Mistguard/Cold Snap": {
        choices: [yesNo("recast", "Recast while concentrating (25 mana, free action)")],
        cost: (ctx) => ({ resource: "mana", amount: ctx.choices.recast ? 25 : 50 }),
        area: { shape: "battlefield", affects: "enemies" },
        attack: spell("13d8", "ice"),
        target: [{ name: "Cold Snap (-5 speed)", category: "condition", maxStacks: Infinity, changes: [stat("speed", -5)] }],
        notes: ["Each stack counts as a distinct condition for Eerie Mists."],
    },

    /* ---------- Noxomancer ---------- */

    "Noxomancer/Defile": {
        choices: [pick("mode", "Choose", { w30: "30% Weaken", w20: "20% Weaken + 1 curse", w10: "10% Weaken + 2 curses" })],
        target: (ctx) => {
            const weak = { w30: 30, w20: 20, w10: 10 }[String(ctx.choices.mode)] ?? 30;
            const curses = { w30: 0, w20: 1, w10: 2 }[String(ctx.choices.mode)] ?? 0;
            return [weaken(weak, { duration: "1 minute" }), ...Array.from({ length: curses }, () => status("cursed"))];
        },
    },
    "Noxomancer/Shadow Bolt": {
        attack: spell("4d10", "dark"),
        target: [status("cursed")],
        summarize: (result) => {
            const curses = Math.floor((result.totals.dark ?? 0) / 15);
            return [`${curses} curse(s): one per 15 dark damage dealt (apply Cursed that many times; use the damage after MR).`];
        },
    },
    "Noxomancer/Shriek": {
        area: around(40),
        target: [status("blind"), status("fear")],
        notes: ["Enemies within 20 ft are Feared; the rest (within 40 ft) are Blinded."],
    },
    "Noxomancer/Darkbomb": {
        choices: [pick("mode", "Detonation", { now: "Now: 4d10, 1 curse", later: "Start of your next turn: 8d10, 2 curses" })],
        area: burst(20, "all"),
        attack: (ctx) => spell(ctx.choices.mode === "later" ? "8d10" : "4d10", "dark"),
        target: (ctx) => (ctx.choices.mode === "later" ? [status("cursed"), status("cursed")] : [status("cursed")]),
        notes: (ctx) => (ctx.choices.mode === "later" ? ["Delayed: apply the damage at the start of your next turn."] : []),
    },
    "Noxomancer/Spreading Madness": {
        target: [
            {
                name: "Spreading Madness",
                category: "condition",
                description:
                    "<p>50% of their targeted attacks are redirected at one of their allies. Damaging another enemy spreads this condition.</p>",
            },
        ],
        notes: ["Concentration: all copies end when it breaks."],
    },
    "Noxomancer/Corruption": {
        attack: spell("5d10", "dark"),
        target: [
            {
                name: "Corruption",
                category: "condition",
                dot: { formula: "3d10", type: "dark" },
                description: "<p>Gains a Curse and takes 3d10 dark magic damage at the start of each turn. Curses can't expunge.</p>",
                triggers: [{ event: "turnStart", action: "grant", effect: status("cursed", { duration: "Endless" }) }],
            },
        ],
        notes: ["Concentration."],
    },

    /* ---------- Pyromancer ---------- */

    "Pyromancer/Magma Spray": {
        area: cone(30),
        attack: spell("4d12", "fire"),
        target: (ctx) => [burn(ctx.result?.total ?? 0)],
        notes: ["Only enemies within 15 ft of you get the Burn."],
    },
    "Pyromancer/Firebolt": {
        choices: [yesNo("second", "Second fire spell this turn (+2d12)")],
        attack: (ctx) => spell(ctx.choices.second ? "4d12 + 2d12" : "4d12", "fire"),
    },
    "Pyromancer/Fireball": {
        choices: [count("extra", "Extra damage dice (+5 mana each)")],
        cost: (ctx) => ({ resource: "mana", amount: 25 + 5 * Number(ctx.choices.extra) }),
        area: square(35),
        attack: (ctx) => spell(`${5 + Number(ctx.choices.extra)}d12`, "fire"),
    },
    "Pyromancer/Searing Blaze": {
        attack: spell("5d12", "fire"),
        target: (ctx) => [burn(ctx.result?.total ?? 0)],
    },
    "Pyromancer/Pyroblast": {
        choices: [count("mana", "Mana spent on the countered spell")],
        attack: (ctx) => spell(String(Number(ctx.choices.mana) || 0), "fire", { scaling: "none" }),
        notes: ["Counter the triggering spell."],
    },
    "Pyromancer/Heat Ray": {
        choices: [yesNo("second", "Second fire spell this turn (+3d12)")],
        area: line(120),
        attack: (ctx) => spell(ctx.choices.second ? "6d12 + 3d12" : "6d12", "fire"),
    },
    "Pyromancer/Banefire": {
        attack: spell("6d12", "fire"),
        notes: ["Can't be blocked or counterspelled if it's your second fire spell this turn."],
    },
    "Pyromancer/Inflame": {
        choices: [yesNo("reaction", "Cast as a reaction (+15 mana)")],
        cost: (ctx) => ({ resource: "mana", amount: 25 + (ctx.choices.reaction ? 15 : 0) }),
        target: [
            {
                name: "Inflame",
                category: "condition",
                description:
                    "<p>When this target dies or is knocked unconscious, it deals fire damage equal to half the lethal hit to all adjacent targets and marks them.</p>",
            },
        ],
    },
    "Pyromancer/Devour In Flames": {
        attack: (ctx) => {
            const max = (ctx.targets[0]?.system as { derived?: { resources: { health: { max: number } } } } | undefined)?.derived?.resources.health.max ?? 0;
            return spell(String(Math.round(max * 0.1)), "fire", { scaling: "none" });
        },
        notes: (ctx) => [
            `10% of ${ctx.targets[0]?.name ?? "the target"}'s max health.`,
            "If it's your second fire spell this turn, it has Lethality equal to the target's total Vulnerability %.",
        ],
    },
    /* ---------- Auras and lingering spells ---------- */

    "Pyromancer/Fiery Temper": {
        self: [
            {
                category: "buff",
                pulse: { formula: "4d12", type: "fire", radius: 30 },
                description: "<p>At the start of each of your turns, deal 4d12 fire magic damage to all enemies within 30 ft (posted as a card to apply). Enemies in range take twice as much damage from their Burns.</p>",
            },
        ],
        notes: ["Each of your turns starts with a Fiery Temper damage card already targeting enemies within 30 ft. Burns on enemies in range tick double (apply their Burn twice)."],
    },
    "Cryomancer/Heart of Ice": {
        self: [
            {
                category: "buff",
                modifiers: [{ type: "incomingEvasion", value: 40, conditions: "attacker:distance > 30" }],
                triggers: [{ event: "attacked", conditions: "attacker:distance <= 5", action: "inflict", effect: status("frozen") }],
                description:
                    "<p>Enemies moving within 30 ft become Slowed; adjacent enemies attacking you become Frozen; attacks from enemies more than 30 ft away grant you +40% evasion. Adjacent allies deal ice magic damage and inflict Frostbite on hit (once per turn). You may cast ice spells as a reaction.</p>",
            },
        ],
        notes: ["The +40% Evasion against distant attackers and Frozen on adjacent attackers are automatic. Slow on approach is applied by hand for now."],
    },
    "Mistguard/Cold Shoulder": {
        area: around(20, "allies"),
        target: [{ name: "Cold Shoulder", category: "buff", description: "<p>5 ft aura: enemies entering or leaving it have a 50% chance of becoming Frozen.</p>" }],
        notes: ["When an enemy enters or leaves an ally's aura, roll d100: 50 or less and they're Frozen."],
    },
    "Aquamancer/Whirlpool": {
        // Stays on the map: each enemy starting their turn in it is Immobilized and takes 10d6 water.
        area: {
            ...square(35),
            zone: {
                events: ["tokenTurnStart"],
                damage: { formula: "10d6", type: "water" },
                effect: status("immobilized", { duration: "end of target's next turn" }),
                note: "Pulled to the center. In the center 15 ft square instead: 15d6 water (add 5d6 by hand) and drowning (25% chance to die at the end of their turn).",
            },
        },
        notes: ["Move it up to 20 ft with a Major Action at no cost (drag the region)."],
    },
    "Aquamancer/Fountain of Purity": {
        choices: [count("extra", "Extra fountains (30 mana each)", 4)],
        cost: (ctx) => ({ resource: "mana", amount: 60 + 30 * (Number(ctx.choices.extra) || 0) }),
        heal: { formula: "30" },
        summon: (ctx) => ({
            name: "Fountain of Purity",
            img: "icons/environment/settlement/well.webp",
            count: 2 + (Number(ctx.choices.extra) || 0),
            size: 2,
            stats: { health: 1 },
            effects: [
                { name: "Fountain", category: "", changes: [vulnerable("all", -100)], description: "<p>Allies standing next to a fountain gain +30% CR and +30% evasion.</p>" },
            ],
            actions: [{ name: "Drink", action: "1 Minor Action", description: "An adjacent ally drinks: heal 30 health and cleanse 1 condition of their choice." }],
            description: "Allies next to it gain +30% CR and +30% evasion. Allies may drink from it as a minor action.",
        }),
        summonActions: { Drink: { heal: { formula: "30" }, notes: ["Target the ally drinking. They also cleanse 1 condition of their choice."] } },
        notes: ["Allies within 10 ft of a fountain heal 30 (apply to them) and cleanse 1 condition of their choice."],
    },
    "Dark Duelist/Accursed Armor": {
        self: [
            {
                category: "buff",
                triggers: [
                    // Spell damage, so it adds your Magic Damage like any other dark spell.
                    {
                        event: "attacked",
                        conditions: "attacker:status:cursed",
                        action: "damage",
                        type: "dark",
                        value: "2d10 * @attacker.statuses.cursed + @stats.magicDamage.value",
                    },
                    { event: "attacked", conditions: "attacker:status:cursed", action: "note", value: "25% miss chance and a 10 ft drag towards you, per curse on the attacker." },
                ],
                description:
                    "<p>Cursed enemies attacking you take 2d10 dark magic damage per curse, get a 25% miss chance per curse, and are dragged 10 ft towards you per curse. Gain a Darkness stack (+25% physical and dark damage, max 20) whenever a curse you inflicted is expunged.</p>",
            },
        ],
        notes: ["Retaliation against Cursed attackers happens automatically when their attack is applied to you. Darkness stacks are tracked by hand."],
    },
    "Lightning Duelist/Lightning Coil Cuirass": {
        self: [
            {
                category: "buff",
                triggers: [
                    {
                        event: "attacked",
                        conditions: "attacker:distance <= 5",
                        action: "damage",
                        type: "lightning",
                        value: "2d12 + @stats.magicDamage.value",
                    },
                    { event: "attacked", conditions: "attacker:distance <= 5", action: "inflict", effect: status("paralyzed") },
                    { event: "damaged", action: "note", value: "You may dash up to your speed in any direction." },
                    // A Lightning stack per physical hit, spent by your next lightning spell for +10% each.
                    {
                        event: "hit",
                        conditions: "roll:physical",
                        action: "grant",
                        effect: {
                            name: "Lightning",
                            category: "",
                            singleUse: true,
                            maxStacks: 20,
                            duration: "Endless",
                            modifiers: [{ type: "multiplier", rollType: "magic", damageType: "lightning", value: 10, conditions: "ability:tag:lightning" }],
                            description: "<p>+10% lightning damage on your next lightning spell attack, per stack. All stacks are spent together.</p>",
                        },
                    },
                ],
                description:
                    "<p>Adjacent enemies attacking you gain a stack of Paralysis and take 2d12 lightning magic damage. Whenever you take damage, you may dash up to your speed. Gain a Lightning stack per physical hit; your next lightning spell attack expends them for +10% lightning damage each (max 20).</p>",
            },
        ],
        notes: ["Retaliation against adjacent attackers, and Lightning stacks from your physical hits, happen automatically."],
    },
    "Noxomancer/Treachery": {
        attack: spell("3d10", "dark", { scaling: "none" }),
        target: [status("cursed")],
        notes: ["Counter the spell. The caster expends 20 mana; the damage and curse hit all of the caster's allies within 10 ft of them (target those)."],
    },
    "Noxomancer/Siphon Soul": {
        choices: [pick("mode", "Choose", { strip: "Strip a buff", cleanse: "Cleanse a condition", both: "Both (+10 mana)" })],
        cost: (ctx) => ({ resource: "mana", amount: ctx.choices.mode === "both" ? 25 : 15 }),
        notes: (ctx) => [
            ctx.choices.mode === "cleanse"
                ? "Remove a condition of your choice from the target (delete it in their effects panel)."
                : ctx.choices.mode === "both"
                  ? "Remove a buff of your choice from one target and a condition of your choice from a target."
                  : "Remove a buff of your choice from the target (delete it in their effects panel).",
        ],
    },
};

/* -------------------------------------------- */
/*  Draught of Vigor                            */
/* -------------------------------------------- */

function DRAUGHT_OPTIONS(): Record<string, string> {
    return {
        onHit: "Physical attacks: on hit 4d6 water",
        spell: "Spell attacks +30% magic damage",
        heal: "Heal 10 each turn",
        speed: "+20 movement speed",
        crit: "+10% crit chance",
        critDamage: "+100% crit damage modifier",
        skills: "+20 to all skill checks",
        skill: "Roll one of the caster's skills",
        language: "Speak one of the caster's languages",
    };
}

function draughtEffect(key: string, scale: (n: number) => number, dice: (f: string) => string) {
    const label = DRAUGHT_OPTIONS()[key] ?? key;
    const base = { name: `Draught of Vigor: ${label}`, category: "buff" as const };
    switch (key) {
        case "onHit":
            return { ...base, modifiers: [onHit(dice("4d6"), "water")] };
        case "spell":
            return { ...base, modifiers: [damageIncrease(scale(30), { rollType: "magic", damageType: "allMagic" })] };
        case "speed":
            return { ...base, changes: [stat("speed", scale(20))] };
        case "crit":
            return { ...base, modifiers: [{ type: "critChance" as const, rollType: "all" as const, value: scale(10) }] };
        case "critDamage":
            return { ...base, modifiers: [{ type: "critDamage" as const, rollType: "all" as const, value: scale(100) }] };
        case "heal":
            return {
                ...base,
                triggers: [{ event: "turnStart" as const, action: "restore" as const, type: "health", value: scale(10) }],
                description: "<p>Heal 10 health at the beginning of each turn.</p>",
            };
        case "skills":
            return { ...base, changes: [{ key: "system.skillBonus", value: scale(20) }] };
        default:
            return { ...base, description: `<p>${label}.</p>` };
    }
}
