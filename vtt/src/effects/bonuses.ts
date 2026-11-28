/**
 * The Bonuses list: everything a bonus row can be, and plain-English one-liners for bonuses and triggers ("AC +5",
 * "Damage multiplier 20% physical, physical rolls", "You hit: restore 5 stamina") for sheets that summarize effects.
 */
import { MODIFIER_TYPES, STATUSES, TRIGGER_EVENTS, WEAPON_CATEGORIES, WEAPON_FILTERS } from "../config.ts";
import type { RollModifierData, TriggerData } from "../data/effect.ts";
import { changeKeyGroups, damageBucketLabel } from "./change-keys.ts";

/** Attack bonuses by group, in the order the Bonuses picker lists them. */
export const ROLL_BONUS_GROUPS: [string, string[]][] = [
    [
        "Attack",
        ["damage", "multiplier", "penetration", "critChance", "critDamage", "canCrit", "cannotMiss", "comboChance", "convert", "accuracy", "lethality", "lifesteal", "unblockable"],
    ],
    ["On hit", ["status", "bleedConvert", "shred", "acReduction", "crShred", "evShred", "vulnerability", "buffStrip", "forcedMovement"]],
    ["Defense (when you're attacked)", ["incomingDamage", "incomingAC", "incomingACPercent", "incomingEvasion", "incomingCR"]],
    ["Effect", ["block", "dot"]],
    ["Other", ["note"]],
];

/**
 * Everything a bonus row can be: character stats (stored as "stat" rows, applied as changes) and attack, on-hit, and
 * defense bonuses (roll modifiers). Identifiers are "stat:<change key>" or "roll:<modifier type>".
 */
export function bonusCatalog(): { identifier: string; label: string; search: string }[] {
    const stats = changeKeyGroups().flatMap((g) =>
        g.keys.map((k) => ({ identifier: `stat:${k.key}`, label: `${k.label} (${g.label})`, search: `${k.label} ${g.label} stat ${k.key}`.toLowerCase() })),
    );
    const rolls = ROLL_BONUS_GROUPS.flatMap(([group, types]) =>
        types.map((t) => {
            const label = (MODIFIER_TYPES as Record<string, string>)[t] ?? t;
            return { identifier: `roll:${t}`, label: `${label} (${group})`, search: `${label} ${group} ${t}`.toLowerCase() };
        }),
    );
    return [...rolls, ...stats];
}

let statLabels: Map<string, string> | null = null;

/** "+5", "-5", or a formula as written; blank (a row not filled in yet) shows as 0. */
const signed = (value: string) => (!value ? "0" : /^[-+]/.test(value) ? value : `+${value}`);

/** A stat bonus as a line: "AC +5", "Evasion -5%", "AC reduced by 10%", "+30 Athletics: Pain Tolerance". */
function statLine(key: string, value: string): string {
    statLabels ??= new Map(changeKeyGroups().flatMap((g) => g.keys.map((k) => [k.key, k.label] as [string, string])));
    const label = statLabels.get(key) ?? key.replace(/^system\./, "");
    const negative = value.trim().startsWith("-");
    const magnitude = value.trim().replace(/^[-+]\s*/, "");
    if (label.includes("increased by X")) return label.replace("increased by X", negative ? `reduced by ${magnitude}` : `increased by ${magnitude}`);
    if (label.includes("+X")) return label.replace("+X", signed(value.trim()));
    if (label.startsWith("Immune to")) return label;
    if (label.startsWith("+ ")) return `${signed(value.trim())} ${label.slice(2)}`;
    // "Minion Damage %", "Reach ft", "Fire vulnerability % (-100 = immune)": the unit goes after the number.
    const match = /^(.*?)(?:\s+(%|ft))?(?:\s+\(.*\))?$/.exec(label)!;
    const unit = match[2] === "%" ? "%" : match[2] === "ft" ? " ft" : "";
    return `${match[1]} ${signed(value.trim())}${unit}`;
}

/** "burned:20 30" → "On hit: 30% chance to inflict Burned (20)". */
function statusLine(value: string, m: RollModifierData): string {
    const [spec, chance] = value.split(/\s+/);
    const [id, amount] = (spec ?? "").split(":");
    const name = STATUSES.find((s) => s.id === id)?.name ?? id;
    const what = `${name}${amount ? ` (${amount})` : ""}`;
    const limits = [m.onCrit ? "on crit" : "", m.conditions?.trim() ? `if ${m.conditions.trim()}` : ""].filter(Boolean);
    return `On hit: ${chance ? `${chance}% chance to inflict ${what}` : `inflict ${what}`}${limits.length ? `, ${limits.join(", ")}` : ""}`;
}

/** Bonus types whose damage type column means something. */
const USES_DAMAGE_TYPE = new Set(["damage", "multiplier", "penetration", "convert", "incomingDamage", "dot"]);

/** One bonus row as a line, with its limits: "Damage multiplier 20% physical, physical rolls, if target:type:demon". */
export function describeBonus(m: RollModifierData): string {
    const value = String(m.value ?? "").trim();
    if (m.type === "stat") return statLine(m.key ?? "", value);
    if (m.type === "block") return `Blocks ${value}% of the next attack`;
    if (m.type === "dot") return `Takes ${value} ${m.damageType || "physical"} damage each turn`;
    if (m.type === "note") return value;
    if (m.type === "status") return statusLine(value, m);

    const label = (MODIFIER_TYPES as Record<string, string>)[m.type] ?? m.type;
    // "Damage multiplier (%)" + 20 → "Damage multiplier 20%"; "Can crit (spells)" stays as it is.
    const percent = label.includes("(%");
    const base = label.replace(/\s*\((%|%, stacking|count|ft|flat)\)/, "").replace(/\s*\(id \[chance%\]\)/, "");
    const unit = percent ? "%" : label.includes("(ft)") ? " ft" : "";
    const flag = m.type === "canCrit" || m.type === "cannotMiss";
    const parts = [flag ? base : `${base} ${value}${value ? unit : ""}`.trim()];
    if (USES_DAMAGE_TYPE.has(m.type) && m.damageType && m.damageType !== "all") parts[0] += ` ${damageBucketLabel(m.damageType).toLowerCase()}`;
    const limits: string[] = [];
    if (m.rollType && m.rollType !== "all") limits.push(`${m.rollType} rolls`);
    if (m.weapon) {
        const weapon = (WEAPON_CATEGORIES as Record<string, string>)[m.weapon] ?? (WEAPON_FILTERS as Record<string, string>)[m.weapon] ?? m.weapon;
        limits.push(`with ${weapon.toLowerCase()}`);
    }
    if (m.onCrit) limits.push("on crit");
    if (m.conditions?.trim()) limits.push(`if ${m.conditions.trim()}`);
    return [parts[0], ...limits].join(", ");
}

/** One trigger as a line: "You hit: restore 5 stamina", "You hit: grant Fervor (25%, once per turn)". */
export function describeTrigger(t: TriggerData): string {
    const event = ((TRIGGER_EVENTS as Record<string, string>)[t.event] ?? t.event).replace(/\s*\(.*\)$/, "");
    const value = String(t.value ?? "").trim();
    const effect = t.effectData ? ((t.effectData as { name?: string }).name ?? "an effect") : t.effect || value;
    const actions: Record<string, string> = {
        restore: `restore ${value} ${t.type || "stamina"}`,
        grant: `grant ${effect}`,
        inflict: `inflict ${effect}`,
        damage: `deal ${value} ${t.type || "physical"} damage`,
        note: value ? `remind: ${value}` : "post a reminder",
        reduceDamage: `reduce it by ${value}%`,
        survive: `survive at ${value} health`,
        redirect: `redirect ${value}% to whoever applied this`,
        reflect: `reflect ${value}% at the attacker`,
    };
    const extra = [
        t.chance ? `${t.chance}%` : "",
        t.oncePer === "turn" ? "once per turn" : t.oncePer === "round" ? "once per round" : t.oncePer === "once" ? "only once" : "",
        t.check ? `needs ${t.check}` : "",
        t.conditions?.trim() ? `if ${t.conditions.trim()}` : "",
        t.consume ? "then used up" : "",
    ].filter(Boolean);
    return `${event}: ${actions[t.action] ?? t.action}${extra.length ? ` (${extra.join(", ")})` : ""}`;
}
