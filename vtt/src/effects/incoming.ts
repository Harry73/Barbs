/**
 * Defender-side modifiers: "+100% AC against ranged attacks", "+40% Evasion against attackers more than 30 ft away",
 * "takes 50% more damage from your spells". They live on the defender's effects as the "incoming" modifier types, and
 * their conditions are tested against the defender's view of the attack (see defenderOptions in roll-options.ts).
 */
import { SYSTEM_ID } from "../config.ts";
import type { BarbsEffectModel } from "../data/effect.ts";
import { parsePredicate, testPredicate } from "../rules/predicate.ts";
import { defenderOptions } from "../rules/roll-options.ts";

/** What the defender knows about an incoming attack: who's making it, and the attack's roll facts. */
export interface AttackContext {
    attackerUuid: string;
    /** The attack's roll options (roll:, weapon:, ability:, ranged/melee, area). */
    options: string[];
}

export interface IncomingTotal {
    total: number;
    sources: string[];
}

/**
 * Sum of a defender's "incoming" modifiers of one type that apply to this attack. `damageType` narrows
 * incomingDamage to modifiers for that type (or "all" / "allMagic").
 */
export function incomingTotal(
    defender: Actor.Implementation,
    type: string,
    attacker: Actor.Implementation | null,
    attack: AttackContext | undefined,
    filter?: (damageType: string) => boolean,
): IncomingTotal {
    const result: IncomingTotal = { total: 0, sources: [] };
    // The attacker's own facts come in as attacker:*, so drop the roller's self:* from the attack's options.
    const attackOptions = (attack?.options ?? []).filter((o) => !o.startsWith("self:") && o !== "in-combat");
    for (const effect of defender.allApplicableEffects()) {
        if (!effect.active) continue;
        const modifiers = (effect.system as unknown as BarbsEffectModel).modifiers ?? [];
        const relevant = modifiers.filter((m) => m.type === type && (!filter || filter(m.damageType || "all")));
        if (!relevant.length) continue;
        const origin = foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.casterUuid`) as string | undefined;
        const domain = defenderOptions(defender, attacker, attackOptions, origin);
        for (const m of relevant) {
            if (!testPredicate(parsePredicate(m.conditions), domain)) continue;
            const value = Number(m.value) || 0;
            if (!value) continue;
            result.total += value;
            result.sources.push(`${effect.name} ${value > 0 ? "+" : ""}${value}`);
        }
    }
    return result;
}
