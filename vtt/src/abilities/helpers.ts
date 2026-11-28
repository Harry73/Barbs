/**
 * Small builders so catalog entries read like the ability text instead of like effect JSON.
 */
import { ELEMENTS, STATUSES, type DamageType, type EffectActionType, type StatKey } from "../config.ts";
import type { AreaSpec, AttackSpec, ChangeSpec, ChoiceSpec, EffectSpec, ModifierSpec, TriggerSpec } from "./types.ts";

/** Flat bonus to a derived stat: `stat("ac", 40)` is "+40 AC", `stat("magicResist", 10)` is "+10% MR". */
export function stat(key: StatKey, amount: number): ChangeSpec {
    return { key: `system.stats.${key}.bonus`, value: amount };
}

/** Percent increase to a derived stat: `statPercent("ac", 30)` is "AC increased by 30%". */
export function statPercent(key: StatKey, percent: number): ChangeSpec {
    return { key: `system.stats.${key}.multiplier`, value: percent };
}

/** Percent increased damage taken: `vulnerable("physical", 50)` is "50% physical vulnerability". */
export function vulnerable(type: "all" | "magic" | DamageType, percent: number): ChangeSpec {
    return { key: `system.vulnerability.${type}`, value: percent };
}

/** On-hit damage for matching rolls: `onHit("2d8", "air", { weapon: "bow" })`. */
export function onHit(formula: string, damageType: string, options: Partial<ModifierSpec> = {}): ModifierSpec {
    return { type: "damage", rollType: "physical", damageType, value: formula, ...options };
}

/** "Your damage increases by X%": a multiplier on the bearer's rolls. */
export function damageIncrease(percent: number, options: Partial<ModifierSpec> = {}): ModifierSpec {
    return { type: "multiplier", rollType: "all", damageType: "all", value: percent, ...options };
}

/** An on-hit status the card offers to apply, e.g. Accursed Blade's Curse. */
export function onHitStatus(statusId: string, options: Partial<ModifierSpec> = {}): ModifierSpec {
    return { type: "status", rollType: "physical", value: statusId, ...options };
}

export function note(text: string, options: Partial<ModifierSpec> = {}): ModifierSpec {
    return { type: "note", value: text, ...options };
}

/**
 * Conditions the rulebook says pile up instead of replacing each other: Paralysis and Poison stack, Curses count up
 * to a burst at 3, and Bleeds from separate wounds each tick.
 */
const STACKING_STATUSES: Record<string, number> = {
    paralyzed: Infinity,
    poisoned: Infinity,
    cursed: Infinity,
    bleeding: Infinity,
    frostbite: Infinity,
    oppression: Infinity,
};

/** A rulebook condition/buff from the status list, e.g. `status("prone")`. */
export function status(id: string, extra: Partial<EffectSpec> = {}): EffectSpec {
    const config = STATUSES.find((s) => s.id === id);
    if (!config) throw new Error(`Unknown status "${id}"`);
    return {
        name: config.name,
        img: config.img,
        // Marks (Spotted, Frostbite) are neither buffs nor conditions: no buff limit, no Condition Resist roll.
        category: config.category === "buff" ? "buff" : config.category === "condition" ? "condition" : "",
        statuses: [id],
        description: config.description,
        maxStacks: STACKING_STATUSES[id] ?? 1,
        ...extra,
    };
}

/** "Inflict an X% Weaken": the Weakened status plus the outgoing damage reduction it implies. */
export function weaken(percent: number, extra: Partial<EffectSpec> = {}): EffectSpec {
    return status("weakened", {
        name: `Weakened (${percent}%)`,
        modifiers: [{ type: "multiplier", rollType: "all", damageType: "all", value: -percent }],
        ...extra,
    });
}

/** Damage-over-time conditions: Bleed (physical), Burn (fire), Poison (water). */
export function bleed(formula: string, extra: Partial<EffectSpec> = {}): EffectSpec {
    return status("bleeding", { name: `Bleeding (${formula})`, dot: { formula, type: "physical" }, ...extra });
}

export function burn(amount: number | string, extra: Partial<EffectSpec> = {}): EffectSpec {
    return status("burned", { name: `Burned (${amount})`, dot: { formula: String(amount), type: "fire" }, ...extra });
}

export function poison(formula: string, extra: Partial<EffectSpec> = {}): EffectSpec {
    return status("poisoned", { name: `Poisoned (${formula})`, dot: { formula, type: "water" }, ...extra });
}

/* -------------------------------------------- */
/*  Attacks and areas                           */
/* -------------------------------------------- */


/** A magic attack: `spell("6d8", "ice")`. Adds Magic Damage (ATN) unless `scaling: "none"`. */
export function spell(formula: string, type: DamageType, extra: Partial<AttackSpec> = {}): AttackSpec {
    return { rollType: "magic", damage: [{ formula, type }], ...extra };
}

/** A physical attack: `strike("5d10")`. Adds the held weapon's scaling stat. */
export function strike(formula: string, extra: Partial<AttackSpec> = {}): AttackSpec {
    return { rollType: "physical", damage: [{ formula, type: "physical" }], ...extra };
}

export function psychic(formula: string, extra: Partial<AttackSpec> = {}): AttackSpec {
    return { rollType: "psychic", damage: [{ formula, type: "psychic" }], scaling: "none", ...extra };
}

/** "N ft square/cube centered on a space in range". */
export const square = (size: number, affects: AreaSpec["affects"] = "enemies"): AreaSpec => ({ shape: "square", size, affects });
/** "N ft cone in front of you". */
export const cone = (size: number, affects: AreaSpec["affects"] = "enemies"): AreaSpec => ({ shape: "cone", size, affects });
/** "N ft line starting from your position". */
export const line = (size: number, affects: AreaSpec["affects"] = "enemies", width = 5): AreaSpec => ({
    shape: "line",
    size,
    width,
    affects,
});
/** "All enemies within N ft of you" / "all enemies in range". */
export const around = (size: number, affects: AreaSpec["affects"] = "enemies"): AreaSpec => ({
    shape: "circle",
    size,
    origin: "caster",
    affects,
});
/** "Everyone within N ft of a point". */
export const burst = (size: number, affects: AreaSpec["affects"] = "enemies"): AreaSpec => ({
    shape: "circle",
    size,
    origin: "point",
    affects,
});
/** "All enemies on the battlefield" / "who can hear you". */
export const battlefield = (affects: AreaSpec["affects"] = "enemies"): AreaSpec => ({ shape: "battlefield", affects });

/** "Magic damage of a chosen type". */
export const elementChoice = (key = "element", label = "Element"): ChoiceSpec => ({
    key,
    label,
    type: "select",
    options: Object.fromEntries(ELEMENTS.map((e) => [e, e.capitalize()])),
    default: "fire",
});

export const yesNo = (key: string, label: string, hint?: string): ChoiceSpec => ({ key, label, type: "checkbox", default: false, hint });

export const count = (key: string, label: string, max?: number, hint?: string): ChoiceSpec => ({
    key,
    label,
    type: "number",
    default: 0,
    min: 0,
    max,
    hint,
});

export const pick = (key: string, label: string, options: Record<string, string>, hint?: string): ChoiceSpec => ({
    key,
    label,
    type: "select",
    options,
    default: Object.keys(options)[0],
    hint,
});

/** Statuses that count as crowd control (Warper's Quicksilver Dagger counts them). */
export const CROWD_CONTROL = [
    "stunned", "frozen", "sleeping", "paralyzed", "petrified", "immobilized", "prone", "airborne",
    "confused", "fear", "charmed", "taunted", "slowed", "crippled", "silenced", "blind",
];

/** How many copies of a status an actor has (Curse stacks, Paralysis stacks). */
export function stacksOf(actor: Actor.Implementation | undefined, statusId: string): number {
    return actor ? actor.effects.filter((e) => e.active && e.statuses.has(statusId)).length : 0;
}

/**
 * A block: the next attack applied to the bearer is reduced by `percent` (100 = fully blocked), then the block is
 * used up. Cast blocks as a reaction before the attack's damage is applied.
 */
export function blockSpec(name: string, percent: number): EffectSpec {
    return {
        name: percent >= 100 ? `${name} (block)` : `${name} (block ${percent}%)`,
        category: "",
        block: Math.min(100, percent),
        duration: "end of turn",
        description: `<p>Blocks ${percent >= 100 ? "all" : `${Math.min(100, percent)}%`} of the next attack applied to this creature. Used up when it applies; expires at the end of the turn.</p>`,
    };
}


/**
 * An action button the effect gives while it lasts (see src/triggers/actions.ts): `steps` run in order when it's
 * used, and `limits` (once per turn, conditions) go on the button. `sacrifice: true` uses the effect up afterwards.
 *
 *     action("Block", "freeReaction", [spend(20, "mana"), { action: "grantTarget", effect: blockSpec("Mist", 100) }])
 */
export function action(
    label: string,
    actionType: EffectActionType,
    steps: Omit<TriggerSpec, "event" | "label" | "actionType">[],
    { sacrifice = false, ...limits }: { sacrifice?: boolean; oncePer?: TriggerSpec["oncePer"]; conditions?: string } = {},
): TriggerSpec[] {
    return steps.map((step, i) => ({
        ...step,
        event: "use",
        label,
        actionType,
        ...(i === 0 && limits.oncePer ? { oncePer: limits.oncePer } : {}),
        ...(limits.conditions ? { conditions: limits.conditions } : {}),
        ...(sacrifice && i === steps.length - 1 ? { consume: true } : {}),
    }));
}

/** A step that spends a resource, stopping the rest when you can't afford it. */
export function spend(amount: number, resource: "stamina" | "mana" | "health"): Omit<TriggerSpec, "event"> {
    return { action: "spend", value: amount, type: resource };
}

/** A step that posts a reminder (the part the table resolves by hand: a dash, a push, a cleanse of their choice). */
export function remind(text: string): Omit<TriggerSpec, "event"> {
    return { action: "note", value: text };
}
