/**
 * Every ActiveEffect change key a creature understands, grouped and labeled for the effect config's key dropdown.
 * These are the zeroed buckets set up in `CreatureModel.prepareBaseData()`, which effects add into.
 */
import { ATTRIBUTES, ELEMENTS, STATS, STATUSES, type StatKey } from "../config.ts";
import { VULNERABILITY_KEYS } from "../data/actor/creature.ts";

export interface ChangeKeyGroup {
    label: string;
    keys: { key: string; label: string }[];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function changeKeyGroups(): ChangeKeyGroup[] {
    const stats = Object.entries(STATS) as [StatKey, { label: string; unit?: string }][];
    return [
        {
            label: "Attributes",
            keys: Object.values(ATTRIBUTES).map((a) => ({ key: `system.attributes.${a.key}.bonus`, label: `${a.label} (${a.abbreviation})` })),
        },
        {
            label: "Stats: flat (\"+X\", \"+X%\")",
            keys: stats.map(([key, s]) => ({ key: `system.stats.${key}.bonus`, label: `${s.label} +X${s.unit === "%" ? "%" : ""}` })),
        },
        {
            label: "Stats: multiplied (\"increased by X%\")",
            keys: stats.map(([key, s]) => ({ key: `system.stats.${key}.multiplier`, label: `${s.label} increased by X%` })),
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
            label: "Condition immunity (1 = immune)",
            keys: STATUSES.filter((s) => s.category === "condition").map((s) => ({ key: `system.conditionImmunity.${s.id}`, label: `Immune to ${s.name}` })),
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
