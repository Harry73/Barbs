/**
 * Every ActiveEffect change key a creature understands, grouped and labeled for the effect config's key dropdown.
 * These are the zeroed buckets set up in `CreatureModel.prepareBaseData()`, which effects add into.
 */
import {
    ATTRIBUTES,
    COMBAT_STATS,
    ELEMENTS,
    MULTIPLIER_STAT_KEYS,
    PENETRATION_STAT_KEYS,
    SKILL_NAMES,
    skillKey,
    STATS,
    STATUSES,
    type StatKey,
} from "../config.ts";
import { VULNERABILITY_KEYS } from "../data/actor/creature.ts";

export interface ChangeKeyGroup {
    label: string;
    keys: { key: string; label: string }[];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "allMagic" → "All magic", "physical" → "Physical": labels for multiplier/penetration buckets. */
export function damageBucketLabel(key: string): string {
    return key === "all" ? "All" : key === "allMagic" ? "All magic" : capitalize(key);
}

export function changeKeyGroups(): ChangeKeyGroup[] {
    const stats = Object.entries(STATS) as [StatKey, { label: string; unit?: string }][];
    return [
        {
            label: "Attributes",
            keys: Object.values(ATTRIBUTES).map((a) => ({ key: `system.attributes.${a.key}.bonus`, label: `${a.label} (${a.abbreviation})` })),
        },
        {
            label: "Stats: flat (\"+X\", \"+X%\")",
            // Crit chance bonuses are attack bonuses (roll modifiers), so they're not offered as a stat here.
            keys: stats.filter(([key]) => key !== "critChance").map(([key, s]) => ({ key: `system.stats.${key}.bonus`, label: `${s.label} +X${s.unit === "%" ? "%" : ""}` })),
        },
        {
            label: "Stats: multiplied (\"increased by X%\")",
            keys: stats.filter(([key]) => key !== "critChance").map(([key, s]) => ({ key: `system.stats.${key}.multiplier`, label: `${s.label} increased by X%` })),
        },
        {
            label: "Combat stats",
            keys: Object.entries(COMBAT_STATS).map(([key, c]) => ({ key: `system.combat.${key}`, label: `${c.label}${c.unit === "%" ? " %" : c.unit}` })),
        },
        {
            label: "Element resist (extra MR %)",
            keys: ELEMENTS.map((e) => ({ key: `system.elementResist.${e}`, label: `${capitalize(e)} resist` })),
        },
        {
            label: "Damage taken",
            keys: [
                { key: "system.damageReduction", label: "General damage reduction %" },
                ...VULNERABILITY_KEYS.map((v) => ({
                    key: `system.vulnerability.${v}`,
                    label: `${v === "all" ? "All" : v === "magic" ? "Magic (every element)" : capitalize(v)} vulnerability % (-100 = immune)`,
                })),
            ],
        },
        {
            label: "Condition resist against one condition %",
            keys: STATUSES.filter((s) => s.category === "condition").map((s) => ({ key: `system.conditionResistBonus.${s.id}`, label: `${s.name} CR` })),
        },
        {
            label: "Condition immunity (1 = immune)",
            keys: STATUSES.filter((s) => s.category === "condition").map((s) => ({ key: `system.conditionImmunity.${s.id}`, label: `Immune to ${s.name}` })),
        },
        {
            label: "Skill bonuses",
            keys: SKILL_NAMES.map((name) => ({ key: `system.skillBonuses.${skillKey(name)}`, label: `+ ${name}` })),
        },
        {
            label: "Other",
            keys: [
                { key: "system.initiativeBonus", label: "Initiative bonus" },
                { key: "system.skillBonus", label: "Bonus to every skill check" },
                { key: "system.buffEffectiveness", label: "Effectiveness of buffs you cast %" },
                { key: "system.downedBonus", label: "Extra Downed Health" },
            ],
        },
    ];
}
