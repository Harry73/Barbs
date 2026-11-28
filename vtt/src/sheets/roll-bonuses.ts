/**
 * Summarize the roll modifiers on a creature's active effects for the Stats tab.
 *
 * Gear and buffs mostly boost attacks through roll modifiers (the effect config's Barbs tab), not stat changes, so a
 * Stats tab built only from changes would leave out most of what equipment does. Modifiers that apply to every roll
 * are folded into the matching stat row (with their sources); the rest are described as conditional bonuses.
 */
import { INCOMING_MODIFIER_TYPES, NON_ROLL_BONUS_TYPES, MODIFIER_TYPES, TRIGGER_ACTIONS, TRIGGER_EVENTS, WEAPON_CATEGORIES, WEAPON_FILTERS } from "../config.ts";
import type { BarbsEffectModel, RollModifierData } from "../data/effect.ts";
import type { EquipmentModel } from "../data/item/models.ts";
import { evaluateNumber, usesTarget } from "../rules/formula.ts";
import { actorData } from "../rules/roll-options.ts";

export interface Contribution {
    source: string;
    value: number;
}

export interface RollBonusSummary {
    /** Always-on totals by stat key ("critChance", "multiplier.fire", "penetration.physical", "combat.accuracy"). */
    always: Map<string, Contribution[]>;
    /** Plain-language lines for everything else: conditional bonuses, on-hit damage, statuses, notes. */
    other: string[];
}

/** Which Stats tab rows an always-on modifier adds to. Empty for modifiers that aren't a stat (damage, statuses). */
function statKeys(m: RollModifierData): string[] {
    const type = m.damageType || "all";
    switch (m.type) {
        case "multiplier":
            return [`multiplier.${type}`];
        case "penetration":
            // "All" penetration covers armor and every element.
            return type === "all" ? ["penetration.physical", "penetration.allMagic"] : [`penetration.${type}`];
        case "critChance":
            return ["critChance"];
        case "critDamage":
        case "accuracy":
        case "lethality":
        case "lifesteal":
        case "unblockable":
        case "comboChance":
            return [`combat.${m.type}`];
        default:
            return [];
    }
}

function describe(m: RollModifierData, conditions: string[]): string {
    const label = MODIFIER_TYPES[m.type as keyof typeof MODIFIER_TYPES] ?? m.type;
    const type = m.damageType && m.damageType !== "all" && !["note", "status", "critChance", "critDamage"].includes(m.type) ? ` ${m.damageType}` : "";
    const value = m.type === "canCrit" || m.type === "cannotMiss" ? "" : `: ${m.value}${type}`;
    return `${label}${value}${conditions.length ? ` (${conditions.join(", ")})` : ""}`;
}

export function summarizeRollBonuses(actor: Actor.Implementation): RollBonusSummary {
    const always = new Map<string, Contribution[]>();
    const other: string[] = [];
    // Formula values ("20 * @self.buffs") are shown at their current value.
    const data = { ...(actor.getRollData?.() ?? {}), self: actorData(actor) };
    for (const effect of actor.allApplicableEffects()) {
        if (!effect.active) continue;
        const system = effect.system as unknown as BarbsEffectModel;
        // Triggers are listed as what they do ("You're attacked (attacker:distance <= 5): damage the other creature 2d12").
        for (const t of (system as unknown as { triggers?: { event: string; conditions: string; action: string; value: string; type: string; effect: string; effectData: { name?: string } | null }[] }).triggers ?? []) {
            const what = t.action === "grant" || t.action === "inflict" ? (t.effectData?.name ?? t.effect) : [t.value, t.type].filter(Boolean).join(" ");
            const when = `${TRIGGER_EVENTS[t.event as keyof typeof TRIGGER_EVENTS] ?? t.event}${t.conditions ? ` (${t.conditions})` : ""}`;
            other.push(`${effect.name}: ${when}: ${(TRIGGER_ACTIONS[t.action as keyof typeof TRIGGER_ACTIONS] ?? t.action).toLowerCase()}${what ? ` ${what}` : ""}`);
        }
        if (!system.modifiers?.length) continue;
        const parent = effect.parent as Item.Implementation | null;
        const fromItem = parent?.documentName === "Item";
        // A weapon's own mods only apply to attacks made with it (and to spells while it's held).
        const weapon = fromItem && parent!.type === "equipment" && (parent!.system as unknown as EquipmentModel).isWeapon ? parent : null;
        const source = fromItem ? `${effect.name} (${parent!.name})` : effect.name;
        for (const m of system.modifiers.filter((x) => !NON_ROLL_BONUS_TYPES.has(x.type))) {
            // Incoming modifiers are about attacks on you, so the roll type and weapon filters don't apply to them.
            const incoming = INCOMING_MODIFIER_TYPES.has(m.type);
            const conditions = [
                ...(weapon && !incoming ? [`attacks with ${weapon.name}`] : []),
                ...(m.rollType !== "all" && !incoming ? [`${m.rollType} rolls`] : []),
                ...(m.weapon ? [`${(WEAPON_CATEGORIES as Record<string, string>)[m.weapon] ?? (WEAPON_FILTERS as Record<string, string>)[m.weapon] ?? m.weapon} weapons`] : []),
                ...(m.onCrit ? ["on crit"] : []),
                ...(system.singleUse ? ["next roll only"] : []),
                ...(m.conditions ? [`when ${m.conditions}`] : []),
            ];
            // Only physical rolls crit, so a physical-only crit bonus is as good as always-on.
            const critOnly = ["critChance", "critDamage"].includes(m.type) && m.rollType === "physical";
            const unconditional =
                !weapon &&
                !m.weapon &&
                !m.onCrit &&
                !m.conditions &&
                !usesTarget(m.value) &&
                !system.singleUse &&
                !INCOMING_MODIFIER_TYPES.has(m.type) &&
                (m.rollType === "all" || critOnly);
            const keys = statKeys(m);
            const value = evaluateNumber(m.value, data);
            if (unconditional && keys.length && value) {
                for (const key of keys) {
                    const list = always.get(key) ?? [];
                    list.push({ source, value });
                    always.set(key, list);
                }
            } else {
                other.push(`${source}: ${describe(m, conditions)}`);
            }
        }
    }
    return { always, other };
}

/** Sum of a stat key's always-on contributions. */
export function bonusTotal(summary: RollBonusSummary, key: string): number {
    return (summary.always.get(key) ?? []).reduce((sum, c) => sum + c.value, 0);
}

/** "Keen Edge (Dagger) +10; Stats +5" for a row's tooltip. */
export function bonusSources(summary: RollBonusSummary, key: string, base?: { label: string; value: number }): string {
    const parts = (summary.always.get(key) ?? []).map((c) => `${c.source} ${c.value > 0 ? "+" : ""}${c.value}`);
    if (base?.value) parts.unshift(`${base.label} ${base.value > 0 ? "+" : ""}${base.value}`);
    return parts.join("; ");
}
