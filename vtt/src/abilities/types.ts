import type { DamageType, EffectCategory, ModifierRollType, ModifierType } from "../config.ts";
import type { AttackResult } from "../rolls/attack.ts";
import type { UseContext } from "./context.ts";

/**
 * A value that can depend on how the ability is being used: the caster's choices, buff effectiveness, the caster's
 * stats. Catalog entries use plain values when nothing varies and functions when something does.
 */
export type Dyn<T> = T | ((ctx: UseContext) => T);

/** A roll modifier as written in the catalog; omitted fields take the effect model's defaults. */
export interface ModifierSpec {
    type: ModifierType;
    rollType?: ModifierRollType;
    damageType?: string;
    weapon?: string;
    value: string | number;
}

/** A core ActiveEffect change, e.g. { key: "system.stats.ac.bonus", value: 40 }. */
export interface ChangeSpec {
    key: string;
    type?: "add" | "multiply" | "override" | "upgrade" | "downgrade";
    value: string | number;
}

/**
 * Durations, as rulebook text ("1 minute", "6 hours") or one of these turn-relative phrases. Turn-relative
 * durations are anchored to the right combatant's turn, so "until the end of their next turn" expires at the end of
 * the *target's* turn regardless of whose turn it was when the effect was applied.
 */
export type TurnDuration =
    | "end of your next turn"
    | "start of your next turn"
    | "end of target's next turn"
    | "start of target's next turn"
    | "end of turn";

/** An effect an ability creates on its caster or its targets. */
export interface EffectSpec {
    /** Defaults to the ability's name. */
    name?: string;
    /** Defaults to the ability's icon. */
    img?: string;
    category: EffectCategory;
    /** Defaults to the ability's duration. "Instant"/"Endless" mean no expiry. */
    duration?: string | TurnDuration;
    statuses?: string[];
    changes?: ChangeSpec[];
    modifiers?: ModifierSpec[];
    singleUse?: boolean;
    /** Blocks the next attack on the bearer by this percent (100 = fully), then is used up. */
    block?: number;
    /** Damage the bearer deals to creatures within `radius` ft at the start of each of their turns (Fiery Temper). */
    pulse?: { formula: string; type: DamageType; radius: number; affects?: "enemies" | "allies" | "all" };
    /** Damage taken at the start of each of the bearer's turns (Bleed, Burn, Poison, lingering spells). */
    dot?: { formula: string; type: DamageType };
    /**
     * How many copies can coexist on one target. Default 1: reapplying replaces the old one. Use a number for
     * "can stack up to N times", or Infinity for conditions that just pile up (Poison, Paralysis).
     */
    maxStacks?: number;
    /** Roll the target's Condition Resist before applying. Defaults to true for conditions. */
    resistible?: boolean;
    description?: string;
    /**
     * Statuses to remove from the target first ("cleanse Slow and Prone", "their Frozen ends"). A spec with only
     * `cleanse` (no statuses, changes, modifiers, or dot) cleanses without creating an effect.
     */
    cleanse?: string[];
    /**
     * Only targets within / beyond this many feet of the caster get the effect (Glacial Crash: Frozen within 5 ft;
     * Axe Kick: Stunned if adjacent). Measured when the Apply button is clicked.
     */
    within?: number;
    beyond?: number;
    /**
     * Adjust the effect for a specific target when it's applied (e.g. Weak is weaker on already-weakened targets).
     * `redirects` is how many times a reflected beam had bounced when it hit them. Return null to skip the target.
     */
    resolve?: (target: Actor.Implementation, spec: EffectSpec, ctx: UseContext, info?: { redirects: number }) => EffectSpec | null;
}

export interface DamageSpec {
    formula: string;
    type: DamageType;
}

export interface AttackSpec {
    rollType: "physical" | "magic" | "psychic";
    damage: DamageSpec[];
    /**
     * Flat damage scaling: "magic" adds Magic Damage (ATN) to the first damage type, "weapon" adds the held
     * weapon's scaling stat (STR or DEX). Defaults to "magic" for magic attacks and "weapon" for physical ones.
     */
    scaling?: "magic" | "weapon" | "none";
    /** Spells can't crit unless an ability says they're "affected by your critical strike chance". */
    canCrit?: boolean;
    /** Percent damage increase from the ability itself, e.g. "+50% increased damage if ki is spent". */
    increase?: number;
    critChance?: number;
    /** Percent added to the crit damage modifier. */
    critDamage?: number;
    /** "This attack repeats N times": each hit is rolled, crit-checked, and reduced by AC/MR separately. */
    hits?: number;
    /** Roll maximum on all damage dice (Backstab while Hidden). */
    maximize?: boolean;
    ignoreAC?: boolean;
    ignoreMR?: boolean;
    /**
     * Damage multiplier per area target, in order from the area's origin (for lines: from the caster outwards).
     * `wasTargeted` is whether the user had that token targeted before placing the area (Ice Spear's aimed target).
     */
    targetScale?: (index: number, info: { count: number; wasTargeted: boolean; anyTargeted: boolean; spotted: boolean }) => number;
    /**
     * Damage that depends on distance from the caster ("within 5 ft: 8d8 and Frozen; within 10 ft: 6d8 ..."). Each
     * tier is rolled separately and each target takes the first tier whose distance covers it. Replaces `damage`.
     */
    tiers?: { within: number; damage: DamageSpec[] }[];
    /**
     * Ignore every defense: "drain", "loses health". TODO: double-check with the rulebook author that drains and
     * health loss ignore AC/MR.
     */
    trueDamage?: boolean;
    /** Also roll the held weapon's own damage dice ("fire your equipped firearm, dealing an additional 3d12"). */
    includeWeapon?: boolean;
    /** Extra combo chance for this ability ("+20% combo chance if your dash was 20 ft"). Combo is rolled for "combo" abilities. */
    combo?: number;
    /** Damage types that swap with each redirect off a mirror (Helix Beam: ice ↔ light). */
    redirectSwap?: [DamageType, DamageType];
    /** Heal the caster for this percent of the damage rolled ("healing for the amount of damage rolled" = 100). */
    lifesteal?: number;
}

export interface AreaSpec {
    /** Squares and cubes are both "square" on the map. "battlefield" targets everyone on the scene who qualifies. */
    shape: "square" | "circle" | "cone" | "line" | "battlefield";
    /** Feet: side length for squares, radius for circles, length for cones and lines. Ignored for battlefield. */
    size?: number;
    /** Line width in feet. Default 5. */
    width?: number;
    /** Cone angle in degrees. Default 90. */
    angle?: number;
    /**
     * Where the shape starts. "caster": lines and cones extend from the caster toward the cursor, circles center on
     * the caster ("all enemies within 20 ft of you"). "point": placed at the cursor ("centered on a space in range").
     * Defaults to "caster" for lines and cones, "point" otherwise.
     */
    origin?: "caster" | "point";
    /** Who in the area gets targeted. Default "enemies". */
    affects?: "enemies" | "allies" | "all";
    /** Extra line width per redirect off a mirror, in feet (Beam of Brilliance). */
    widthPerRedirect?: number;
}

export interface ChoiceSpec {
    key: string;
    label: string;
    type: "select" | "number" | "checkbox";
    /** For selects: value → label. */
    options?: Record<string, string>;
    default?: string | number | boolean;
    min?: number;
    max?: number;
    hint?: string;
    /**
     * Spend a passive resource ("spotting", "ki", "hunter"): a number choice spends what's chosen (capped at what the
     * caster has), a checkbox spends `amount` when checked. Spent after the ability is used, with undo.
     */
    resource?: string;
    amount?: number;
    /** Default to the value of a passive state (e.g. the Thief's current stance). */
    state?: string;
}

export type CostResource = "health" | "stamina" | "mana";
export interface Cost {
    /** A creature resource, or a passive resource key like "ki". */
    resource: CostResource | string;
    amount: number;
}

export type SummonStat =
    | "health"
    | "stamina"
    | "mana"
    | "ac"
    | "evasion"
    | "magicResist"
    | "conditionResist"
    | "speed"
    | "critChance";

/** A creature an ability summons or creates. Becomes an NPC actor with its own token(s) next to the caster. */
export interface SummonSpec {
    name: string;
    img?: string;
    count?: number;
    /** Token size in grid squares: 2 for large, 4 for massive. */
    size?: number;
    stats: Partial<Record<SummonStat, number>>;
    /** Standing effects: immunities (as -100% vulnerability), penetration, auras (as notes). */
    effects?: EffectSpec[];
    /** Actions it can take, by name: each becomes an ability on the summon, automated by `summonActions`. */
    actions?: { name: string; action?: string; description: string }[];
    /** Makes the summon a Mirror Mage mirror that line spells bounce off. */
    mirror?: "plane" | "convex" | "concave";
    /** Give the summon a copy of the caster's held weapon (Harvester of Life's ephemeral scythe). */
    copyWeapon?: boolean;
    description?: string;
    /** Defaults to the ability's duration. */
    duration?: string;
}

/**
 * How the system automates one ability. Everything is optional; an ability with no automation just posts its card.
 * This is the typed successor to the Roll20 API's per-ability handler functions.
 */
export interface AbilityAutomation {
    /** Questions asked before the ability is used; answers are available as ctx.choices. */
    choices?: ChoiceSpec[];
    /**
     * Rolled once, before anything else, with results in ctx.rolls: random effects ("50% chance: ...") and variable
     * counts ("this attack repeats 2-6 times"). E.g. { effect: "1d100" }.
     */
    rolls?: Record<string, string>;
    /**
     * Overrides the rulebook cost when it varies ("+10 mana as a reaction", "X mana", "stamina or mana", or several
     * resources at once for Psion's "an additional 10 of another resource").
     */
    cost?: Dyn<Cost | Cost[] | null>;
    /** Place an area on the map and target what's inside it before rolling. */
    area?: Dyn<AreaSpec | null>;
    /** A damage roll. */
    attack?: Dyn<AttackSpec | null>;
    /** A healing roll. `self` heals the caster immediately instead of offering an Apply button. */
    heal?: Dyn<{ formula: string; self?: boolean } | null>;
    /** Shielding (temporary health): `self` grants it to the caster now, otherwise an Apply button for targets. */
    shielding?: Dyn<{ amount: number; self?: boolean } | null>;
    /**
     * Drain a target's stamina or mana: rolled now, applied by a card button, and given to the caster when applied.
     * TODO: double-check with the rulebook author that drains ignore defenses.
     */
    drain?: Dyn<{ resource: "stamina" | "mana"; formula: string } | null>;
    /** Creatures the ability summons. */
    summon?: Dyn<SummonSpec | null>;
    /** Automation for the summon's actions, by action name. */
    summonActions?: Record<string, AbilityAutomation>;
    /** Passive resources the caster gains after the roll ("gain Ki equal to the rolled value"). */
    gain?: Dyn<{ resource: string; formula: string }[]>;
    /** Heal the caster for the total rolled of one damage type (Drain Punch heals for the psychic damage). */
    healFrom?: DamageType;
    /** Resources the caster recovers immediately ("Recover 6d10 stamina"). */
    restore?: Dyn<{ resource: CostResource; formula: string }[]>;
    /** Effects applied to the caster immediately. */
    self?: Dyn<EffectSpec[]>;
    /** Effects offered as "Apply" buttons on the chat card, for the caster's targets. */
    target?: Dyn<EffectSpec[]>;
    /** Reminders for the parts the system doesn't handle (dashes, forced movement, terrain, ...). */
    notes?: Dyn<string[]>;
    /** Extra notes computed from the roll, e.g. counting sixes. */
    summarize?: (result: AttackResult, ctx: UseContext) => string[];
}
