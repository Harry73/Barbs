/**
 * The context an ability is used in: who's casting it, what they chose in the pre-use dialog, and how effective
 * their buffs are. Catalog entries read this to adapt; see `Dyn` in types.ts.
 *
 * Buff effectiveness is deliberately not applied generically (the Roll20 API scaled every number and dice count it
 * could find, which was wrong as often as right). Each buff decides what scales, using ctx.scale() and ctx.dice().
 */
import { isDualWieldingShields } from "../rules/hands.ts";
import type { Hand } from "../rolls/attack.ts";
import type { CreatureModel } from "../data/actor/creature.ts";
import type { AbilityModel } from "../data/item/models.ts";
import type { Dyn } from "./types.ts";

export type Choices = Record<string, string | number | boolean>;

/** The parts of a roll's result that effects can depend on (Burn equal to damage rolled, Shield Bash's 18+). */
export interface ResultSummary {
    /** Total rolled across all damage types and hits, before defenses. */
    total: number;
    /** Every damage die's face value. */
    dice: { faces: number; result: number }[];
    /** What was rolled per damage type, before multipliers and crit ("gain Ki equal to the rolled value"). */
    rolled?: Partial<Record<string, number>>;
}

export interface UseContext {
    actor: Actor.Implementation;
    item: Item.Implementation | null;
    ability: AbilityModel | null;
    choices: Choices;
    /** Multiplier for the caster's buffs: 1 normally, 1.25 with +25% buff effectiveness. */
    effectiveness: number;
    /** Scale a buff's number by effectiveness: 30 → 37.5 at 125%. Rounded to one decimal. */
    scale(value: number): number;
    /** Scale a dice formula's dice counts by effectiveness, rounding down: "2d8" stays 2d8 at 125%, "4d10" → 5d10. */
    dice(formula: string): string;
    /** The caster's derived stat value, e.g. ctx.stat("magicDamage"). */
    stat(key: keyof CreatureModel["derived"]["stats"]): number;
    /** Actors targeted when the ability was used (after any area placement). */
    targets: Actor.Implementation[];
    /** How many buffs the caster has (Arcane Archer, Warrior). */
    buffs: number;
    /** A shield in each hand (Sentinel). */
    dualShields: boolean;
    /** Which hand(s) the ability is used with: picked with the sheet's Main / Off / Dual buttons. */
    hand: Hand;
    /** Results of the ability's `rolls`, made once before anything else (random effects, variable hit counts). */
    rolls: Record<string, number>;
    /** The damage/healing roll, once it's happened. Null before the roll and for abilities without one. */
    result: ResultSummary | null;
}

/** Plain-data parts of a context, stored on chat cards so buttons can rebuild it later. */
export interface ContextData {
    actorUuid: string;
    itemUuid?: string;
    choices: Choices;
    effectiveness: number;
    targetUuids: string[];
    rolls: Record<string, number>;
    result: ResultSummary | null;
    hand?: Hand;
}

export function buffEffectiveness(actor: Actor.Implementation, item?: Item.Implementation | null): number {
    const d = (actor.system as unknown as CreatureModel).derived;
    // Enchantments (abilities tagged "enchantment") also get Enchant Effectiveness.
    const tags = ((item?.system as unknown as { tags?: string[] } | undefined)?.tags ?? []).map((t) => t.toLowerCase());
    const enchant = tags.includes("enchantment") ? (d.combat?.enchantEffectiveness ?? 0) : 0;
    return 1 + ((d.buffEffectiveness ?? 0) + enchant) / 100;
}

export function countBuffs(actor: Actor.Implementation | null): number {
    if (!actor) return 0;
    return [...actor.allApplicableEffects()].filter(
        (e) => e.active && (e.system as unknown as { category?: string }).category === "buff",
    ).length;
}

export function makeContext(
    actor: Actor.Implementation,
    item: Item.Implementation | null,
    choices: Choices,
    effectiveness = actor ? buffEffectiveness(actor, item) : 1,
    extra: Partial<Pick<UseContext, "targets" | "rolls" | "result" | "hand">> = {},
): UseContext {
    const round1 = (n: number) => Math.round(n * 10) / 10;
    return {
        actor,
        item,
        ability: (item?.system as unknown as AbilityModel | undefined) ?? null,
        choices,
        effectiveness,
        scale: (value) => round1(value * effectiveness),
        dice: (formula) =>
            formula.replace(/(\d*)d(\d+)/g, (_m, count: string, faces: string) => {
                const n = Math.max(1, Math.floor((Number(count) || 1) * effectiveness));
                return `${n}d${faces}`;
            }),
        stat: (key) => (actor?.system as unknown as CreatureModel | undefined)?.derived.stats[key].value ?? 0,
        targets: extra.targets ?? [],
        buffs: countBuffs(actor),
        dualShields: isDualWieldingShields(actor),
        hand: extra.hand ?? "main",
        rolls: extra.rolls ?? {},
        result: extra.result ?? null,
    };
}

export function contextData(ctx: UseContext): ContextData {
    return {
        actorUuid: ctx.actor.uuid ?? "",
        itemUuid: ctx.item?.uuid ?? undefined,
        choices: ctx.choices,
        effectiveness: ctx.effectiveness,
        targetUuids: ctx.targets.map((a) => a.uuid ?? "").filter(Boolean),
        rolls: ctx.rolls,
        result: ctx.result,
        hand: ctx.hand,
    };
}

/** Rebuild a context from card data, e.g. when a player clicks "Apply Weakened" an hour after the cast. */
export async function restoreContext(data: ContextData): Promise<UseContext | null> {
    const actor = (await fromUuid(data.actorUuid)) as Actor.Implementation | null;
    if (!actor) return null;
    const item = data.itemUuid ? ((await fromUuid(data.itemUuid)) as Item.Implementation | null) : null;
    const targets = (await Promise.all((data.targetUuids ?? []).map((u) => fromUuid(u)))).filter(Boolean) as Actor.Implementation[];
    return makeContext(actor, item, data.choices, data.effectiveness, {
        targets,
        rolls: data.rolls ?? {},
        result: data.result ?? null,
        hand: data.hand ?? "main",
    });
}

export function resolve<T>(value: Dyn<T> | undefined, ctx: UseContext): T | undefined {
    return typeof value === "function" ? (value as (ctx: UseContext) => T)(ctx) : value;
}
