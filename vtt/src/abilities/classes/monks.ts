/**
 * Ki Monk, Martial Artist, and Pinpoint Monk. "dU" is the monk mastery die (d4, raised by each monk passive), and
 * abilities tagged "combo" roll combo automatically. See ../catalog.ts.
 */
import { around, burst, cone, count, line, pick, psychic, square, status, strike, vulnerable, yesNo } from "../helpers.ts";
import type { AbilityAutomation, AttackSpec } from "../types.ts";
import type { AttackResult } from "../../rolls/attack.ts";

/** "15 stamina or ki": pick which to pay with. */
const PAY_WITH = pick("pay", "Pay with", { stamina: "Stamina", ki: "Ki" });
const costIn = (amount: number) => (ctx: { choices: Record<string, unknown> }) => ({
    resource: ctx.choices.pay === "ki" ? "ki" : "stamina",
    amount,
});

/** Strike plus an optional psychic follow-up paid for in ki ("you may spend 15 Ki to additionally inflict 4dU psychic"). */
function kiStrike(dice: string, extra: Partial<AttackSpec> = {}): AbilityAutomation["attack"] {
    return (ctx) => ({
        rollType: "physical",
        damage: [{ formula: dice, type: "physical" }, ...(ctx.choices.ki ? [{ formula: dice, type: "psychic" as const }] : [])],
        ...extra,
    });
}

/** Count damage dice that rolled 11 or higher (Pinpoint Monk combo bonuses). */
function highDice(result: AttackResult): number {
    return result.parts.flatMap((p) => p.roll.dice.flatMap((d) => d.results)).filter((r) => r.active && r.result >= 11).length;
}

export const MONKS: Record<string, AbilityAutomation> = {
    /* ---------- Ki Monk ---------- */

    "Ki Monk/Spirit Punch": {
        choices: [{ key: "ki", label: "Spend 15 Ki for +4dU psychic", type: "checkbox", default: false, resource: "ki", amount: 15 }],
        attack: kiStrike("4dU"),
        gain: (ctx) => [{ resource: "ki", formula: String(ctx.result?.rolled?.physical ?? 0) }],
    },
    "Ki Monk/Find Center": {
        gain: [{ resource: "ki", formula: "3dU" }],
        notes: ["Can't be reacted to by enemies."],
    },
    "Ki Monk/Spirit Gun": {
        choices: [PAY_WITH],
        cost: costIn(15),
        attack: (ctx) => psychic("4dU", { increase: ctx.choices.pay === "ki" ? 50 : 0 }),
        notes: (ctx) => (ctx.choices.pay === "ki" ? ["Paid with ki: +50% damage, and the target's Psionics: Defense roll has -20."] : []),
    },
    "Ki Monk/Drain Punch": {
        choices: [{ key: "ki", label: "Spend 25 Ki for +5dU psychic (heal for it)", type: "checkbox", default: false, resource: "ki", amount: 25 }],
        attack: kiStrike("5dU"),
        healFrom: "psychic",
        gain: (ctx) => [{ resource: "ki", formula: String(Math.floor((ctx.result?.rolled?.physical ?? 0) / 2)) }],
    },
    "Ki Monk/Find Stability": {
        choices: [count("percent", "Percent of max health lost to the hit"), yesNo("low", "Below 40% health (double ki)")],
        gain: (ctx) => [{ resource: "ki", formula: String(Math.floor(Number(ctx.choices.percent) / 2) * (ctx.choices.low ? 2 : 1)) }],
    },
    "Ki Monk/Spirit Shotgun": {
        choices: [PAY_WITH],
        cost: costIn(25),
        area: cone(60),
        attack: (ctx) => psychic("5dU", { increase: ctx.choices.pay === "ki" ? 50 : 0 }),
        notes: (ctx) => (ctx.choices.pay === "ki" ? ["Paid with ki: +50% damage, and every target hit is knocked back 20 ft."] : []),
    },
    "Ki Monk/Stunning Strike": {
        choices: [{ key: "ki", label: "Spend 40 Ki for +6dU psychic and a Stun", type: "checkbox", default: false, resource: "ki", amount: 40 }],
        attack: kiStrike("6dU"),
        target: (ctx) => (ctx.choices.ki ? [status("stunned", { duration: "end of target's next turn" })] : []),
        gain: [{ resource: "ki", formula: "1dU" }],
    },
    "Ki Monk/Find Solace": {
        self: (ctx) => {
            const { value, max } = (ctx.actor.system as unknown as { derived: { resources: { health: { value: number; max: number } } } }).derived.resources.health;
            return [{ name: "Find Solace", category: "buff", description: `<p>Cleanse up to ${value / max < 0.4 ? 4 : 2} conditions.</p>` }];
        },
        notes: ["Cleanse the conditions of your choice yourself (right-click them in the effects panel), then remove this marker."],
    },
    "Ki Monk/Spirit Wave": {
        choices: [PAY_WITH],
        cost: costIn(35),
        area: line(120),
        attack: (ctx) => psychic("6dU", { increase: ctx.choices.pay === "ki" ? 50 : 0 }),
        target: (ctx) =>
            ctx.choices.pay === "ki" ? [{ name: "Spirit Wave (30% psychic vulnerability)", category: "condition", changes: [vulnerable("psychic", 30)] }] : [],
    },
    "Ki Monk/Soul Stealing Strike": {
        choices: [{ key: "ki", label: "Spend 60 Ki for +8dU psychic (Lethality)", type: "checkbox", default: false, resource: "ki", amount: 60 }],
        attack: kiStrike("8dU"),
        notes: (ctx) => [
            ...(ctx.choices.ki ? ["Lethality equal to the target's percentage missing health."] : []),
            `If it kills, gain ${ctx.choices.ki ? 100 : 50} ki (use + on the Kijong passive).`,
        ],
    },
    "Ki Monk/Find Strength": {
        choices: [
            { key: "ki", label: "Ki to spend (X)", type: "number", default: 0, min: 0, resource: "ki" },
            pick("into", "Recover", { health: "Health", stamina: "Stamina" }),
        ],
        restore: (ctx) =>
            ctx.choices.into === "stamina" ? [{ resource: "stamina", formula: String(Number(ctx.choices.ki) || 0) }] : [],
        heal: (ctx) => (ctx.choices.into === "health" ? { formula: String(Number(ctx.choices.ki) || 0), self: true } : null),
    },
    "Ki Monk/Spirit Bomb": {
        choices: [PAY_WITH],
        cost: costIn(45),
        area: square(25),
        attack: (ctx) => psychic("8dU", { increase: ctx.choices.pay === "ki" ? 50 : 0 }),
        notes: (ctx) => (ctx.choices.pay === "ki" ? ["Paid with ki: +50% damage, and you may recast it as a free action."] : []),
    },

    /* ---------- Martial Artist ---------- */

    "Martial Artist/Focus Energy": {
        self: (ctx) => [{ category: "buff", singleUse: true, modifiers: [{ type: "comboChance", rollType: "physical", value: ctx.scale(30) }] }],
    },
    "Martial Artist/Straight Punch": {
        attack: strike("4dU"),
        notes: ["Your next combo roll has +20% if this is the first move in the combo."],
    },
    "Martial Artist/Roundhouse Kick": {
        area: around(5, "all"),
        attack: strike("4dU"),
        notes: (ctx) => [`Your next combo roll has +${5 * ctx.targets.length}% (+5% per enemy hit).`],
    },
    "Martial Artist/Backstep": {
        notes: ["Dash up to 20 ft. If it avoids damage, your next combo roll has +20%."],
    },
    "Martial Artist/Choke Hold": {
        attack: strike("5dU"),
        target: [status("immobilized", { name: "Choke Hold (grappled)", description: "<p>Grappled. Abilities targeting it have +15% combo chance.</p>" })],
        notes: ["At the end of your combo, you may throw the target 20 ft in any direction."],
    },
    "Martial Artist/Axe Kick": {
        area: cone(10, "all"),
        attack: strike("5dU"),
        target: [status("stunned", { duration: "start of target's next turn", within: 5 })],
        notes: ["Non-adjacent targets are pushed 15 ft. If you fail to damage, stun, or push anyone, your next combo roll has +20%."],
    },
    "Martial Artist/Arrow Catch": {
        notes: ["Block a ranged attack on you or an adjacent ally, then either give your next combo roll +15% or redirect the attack back."],
    },
    "Martial Artist/Flying Kick": {
        choices: [yesNo("full", "Your dash's displacement was 20 ft (+20% combo)")],
        attack: (ctx) => strike("6dU", { combo: ctx.choices.full ? 20 : 0 }),
        notes: ["Dash up to 20 ft first."],
    },
    "Martial Artist/Open Palm Strike": {
        attack: strike("6dU"),
        notes: ["Dash up to 20 ft, hitting every enemy you pass through. Through 3+ enemies or an ally: next combo roll +20%."],
    },
    "Martial Artist/Adaptive Brawling": {
        self: [{ category: "buff", description: "<p>Once per turn, reroll a failed combo roll at -10% combo chance. Resets when you kill an enemy.</p>" }],
    },
    "Martial Artist/Barrage of Blows": {
        choices: [count("combos", "Successful combo rolls this turn")],
        attack: (ctx) => strike("2dU", { hits: 1 + Number(ctx.choices.combos) }),
        notes: ["You stop rolling combo chance for the rest of the turn."],
    },
    "Martial Artist/Dragonfall Kick": {
        choices: [yesNo("noDash", "Didn't dash (+20% next combo roll)")],
        area: burst(20),
        attack: (ctx) => strike("8dU", { increase: 20 * ctx.targets.length }),
        target: [status("prone"), status("crippled")],
        notes: ["Dash to an empty space in range first and center the area on your landing. +20% damage per enemy hit."],
    },

    /* ---------- Pinpoint Monk ---------- */

    "Pinpoint Monk/Jolt Jab": {
        attack: {
            rollType: "physical",
            damage: [
                { formula: "3dU", type: "physical" },
                { formula: "2d12", type: "lightning" },
            ],
        },
        summarize: (result) => [`${highDice(result)} damage dice rolled 11+: your next combo roll has +${5 * highDice(result)}%.`],
        notes: ["Dash up to 15 ft first."],
    },
    "Pinpoint Monk/Rising Energy": {
        self: [{ category: "buff", description: "<p>Unarmed attacks have +5% crit chance per combo roll succeeded within the current action.</p>" }],
    },
    "Pinpoint Monk/Paralyzing Blow": {
        rolls: { crit1: "1d100", crit2: "1d100", crit3: "1d100" },
        target: (ctx) => {
            const chance = ctx.stat("critChance");
            const stacks = [ctx.rolls.crit1, ctx.rolls.crit2, ctx.rolls.crit3].reduce((n, r) => n + (r >= 101 - chance ? 2 : 1), 0);
            return Array.from({ length: stacks }, () => status("paralyzed"));
        },
        notes: (ctx) => {
            const chance = ctx.stat("critChance");
            const crits = [ctx.rolls.crit1, ctx.rolls.crit2, ctx.rolls.crit3].filter((r) => r >= 101 - chance).length;
            return [`Three hits, ${crits} crit(s) at ${chance}%: ${3 + crits} stacks of Paralysis.`];
        },
    },
    "Pinpoint Monk/Static Flurry": {
        area: around(5, "all"),
        attack: {
            rollType: "physical",
            damage: [
                { formula: "4dU", type: "physical" },
                { formula: "3d12", type: "lightning" },
            ],
        },
        summarize: (result) => [`${highDice(result)} damage dice rolled 11+: your next combo roll has +${5 * highDice(result)}%.`],
        notes: ["You may push all targets back 15 ft, and dash to follow one of them."],
    },
    "Pinpoint Monk/Move Like Lightning": {
        notes: ["Dash 25 ft (40 ft if you crit or completed a 3-ability combo this round, and you can cast it as a reaction until the round ends)."],
    },
};
