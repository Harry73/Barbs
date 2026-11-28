import { SYSTEM_ID } from "../config.ts";
import { isTurnDuration, parseDuration } from "../effects/apply.ts";
import { abilityKey } from "./catalog.ts";
import type { EffectSpec } from "./types.ts";

/** What an effect needs to know about the ability that created it. Stored in chat card flags. */
export interface EffectSource {
    className: string;
    abilityName: string;
    img: string;
    /** The ability's rulebook duration, used when the spec doesn't set one. */
    duration: string;
    itemUuid?: string;
    casterUuid?: string;
    /** Buff effectiveness the effect was built with, shown in its description when it isn't 100%. */
    effectiveness?: number;
    /** The caster's concentration this cast is maintained by: its effects end when it does. */
    concentrationKey?: string;
}

/** Flags can't hold Infinity (it serializes to null), so "stacks without limit" is stored as a large number. */
const UNLIMITED_STACKS = 999;

/** A plain "add" to a Barbs stat ("system.stats.ac.bonus"), which becomes a stat bonus row. */
function isStatBonus(change: { key: string; type?: string }): boolean {
    return (change.type ?? "add") === "add" && change.key.startsWith("system.");
}

/** Turn a catalog effect spec into ActiveEffect creation data. */
export function buildEffectData(spec: EffectSpec, source: EffectSource): Record<string, unknown> {
    const durationText = spec.duration ?? source.duration;
    // Turn-relative durations are resolved when applied, against the live combat (see applyEffectToActor).
    const duration = spec.durationData ?? (isTurnDuration(durationText) ? null : parseDuration(durationText));
    const maxStacks = spec.maxStacks === Infinity ? UNLIMITED_STACKS : (spec.maxStacks ?? 1);
    const effectivenessNote =
        spec.category === "buff" && source.effectiveness && source.effectiveness !== 1
            ? `<p><em>Buff effectiveness: ${Math.round(source.effectiveness * 100)}%</em></p>`
            : "";
    return {
        name: spec.name ?? source.abilityName,
        img: spec.img ?? source.img,
        origin: source.itemUuid,
        description: (spec.description ?? "") + effectivenessNote,
        statuses: spec.statuses ?? [],
        ...(duration ? { duration } : {}),
        // Core only draws temporary effects on tokens by default. Plenty of Barbs effects have no duration but are
        // very much active (Focus lasts until your next attack, Prone until you stand), so always show them.
        showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
        system: {
            category: spec.category,
            singleUse: spec.singleUse ?? false,
            block: Math.max(0, Math.min(100, Math.round(spec.block ?? 0))),
            endsWithCombat: !!spec.endsWithCombat,
            pulse: {
                formula: spec.pulse?.formula ?? "",
                damageType: spec.pulse?.type ?? "physical",
                radius: spec.pulse?.radius ?? 0,
                affects: spec.pulse?.affects ?? "enemies",
            },
            dot: { formula: spec.dot?.formula ?? "", damageType: spec.dot?.type ?? "physical" },
            // Plain "add" changes to Barbs stats are written as Bonuses rows (stat bonuses), so they show in the same
            // list as everything else on the Barbs tab; other change types stay core changes.
            changes: (spec.changes ?? [])
                .filter((c) => !isStatBonus(c))
                .map((c) => ({ key: c.key, type: c.type ?? "add", value: String(c.value), phase: "initial" })),
            triggers: (spec.triggers ?? []).map((t) => ({
                event: t.event,
                conditions: t.conditions ?? "",
                chance: t.chance ?? 0,
                oncePer: t.oncePer ?? "",
                consume: !!t.consume,
                check: t.check ?? "",
                action: t.action,
                value: String(t.value ?? ""),
                type: t.type ?? "",
                effect: "",
                // The granted/inflicted effect, built now with the same source (caster, effectiveness).
                effectData: t.effect ? buildEffectData(t.effect, source) : null,
            })),
            modifiers: [
                ...(spec.changes ?? []).filter(isStatBonus).map((c) => ({
                    type: "stat",
                    rollType: "all",
                    damageType: "all",
                    weapon: "",
                    value: String(c.value),
                    onCrit: false,
                    conditions: "",
                    key: c.key,
                })),
                ...(spec.modifiers ?? []).map((m) => ({
                    type: m.type,
                    rollType: m.rollType ?? "all",
                    damageType: m.damageType ?? "all",
                    weapon: m.weapon ?? "",
                    value: String(m.value),
                    onCrit: !!m.onCrit,
                    conditions: m.conditions ?? "",
                    key: "",
                })),
            ],
        },
        flags: {
            [SYSTEM_ID]: {
                sourceKey: abilityKey(source.className, source.abilityName),
                maxStacks,
                ...(isTurnDuration(durationText) ? { turnDuration: durationText } : {}),
                ...(source.casterUuid ? { casterUuid: source.casterUuid } : {}),
                ...(source.concentrationKey ? { concentrationKey: source.concentrationKey } : {}),
                ...(spec.cleanse?.length ? { cleanse: spec.cleanse } : {}),
                // A spec that only cleanses creates no effect.
                ...(spec.cleanse?.length &&
                !spec.statuses?.length &&
                !spec.changes?.length &&
                !spec.modifiers?.length &&
                !spec.dot
                    ? { cleanseOnly: true }
                    : {}),
            },
        },
    };
}
