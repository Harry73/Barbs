/**
 * Things that happen *to* an actor: taking damage, being healed, gaining a buff or condition.
 *
 * These modify the target, which the clicking player often doesn't own, so callers go through `socket.ts` to run
 * them on a client that can (the target's owner or the GM).
 */
import { DOWNED_HEALTH_MAX, STATUSES, SYSTEM_ID } from "../config.ts";
import type { CreatureModel } from "../data/actor/creature.ts";
import type { BarbsEffectModel } from "../data/effect.ts";
import { isEmptyUndo, snapshotEffect, UNDO_ROW, type RemovedEffect, type UndoRecord } from "../chat/undo.ts";
import { applyHealthChange, reduceDamage, type DamageKey } from "../rules/damage-math.ts";
import { incomingTotal, type AttackContext } from "./incoming.ts";

/* -------------------------------------------- */
/*  Durations                                   */
/* -------------------------------------------- */

export type EffectDuration = { value: number; units: string; expiry: string | null };

/**
 * Turn a rulebook duration ("1 minute", "20 seconds", "6 hours") into ActiveEffect duration data.
 *
 * Short durations follow the Roll20 API's convention: a 10-second round, with the effect lasting through the
 * casting turn plus N-1 more rounds and ending at the end of the caster's turn. So "1 minute" lasts until the end
 * of the caster's turn 5 rounds later. Hour-scale durations use world time instead.
 *
 * Returns null for instant or indefinite durations ("Instant", "Endless", "Until broken").
 */
export function parseDuration(text: string | undefined): EffectDuration | null {
    const match = /^(\d+)\s*(second|round|minute|hour|day)s?$/i.exec((text ?? "").trim());
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const seconds = amount * ({ second: 1, round: 10, minute: 60, hour: 3600, day: 86400 } as Record<string, number>)[unit];
    if (seconds >= 3600) return { value: seconds / 3600, units: "hours", expiry: null };
    if (seconds <= 10) return { value: 1, units: "rounds", expiry: "turnStart" };
    return { value: seconds / 10 - 1, units: "rounds", expiry: "turnEnd" };
}

const TURN_DURATIONS = {
    "end of your next turn": { anchor: "caster", expiry: "turnEnd" },
    "start of your next turn": { anchor: "caster", expiry: "turnStart" },
    "end of target's next turn": { anchor: "target", expiry: "turnEnd" },
    "start of target's next turn": { anchor: "target", expiry: "turnStart" },
    "end of turn": { anchor: "current", expiry: "turnEnd" },
} as const;

export function isTurnDuration(text: string | undefined): text is keyof typeof TURN_DURATIONS {
    return !!text && text in TURN_DURATIONS;
}

/**
 * Resolve a turn-relative duration against the current combat, anchoring the effect to the right combatant so core's
 * expiry ("turnEnd"/"turnStart" of the effect's combatant) fires on that combatant's turn.
 *
 * With value 0 the effect expires on the anchor's next matching turn event, whether that's later this round or next
 * round. The exception is when it's currently the anchor's turn: "the end of your next turn" then means the turn
 * after this one, so the value is 1.
 */
function resolveTurnDuration(
    phrase: keyof typeof TURN_DURATIONS,
    caster: Actor.Implementation | null,
    target: Actor.Implementation,
): { duration: EffectDuration; start?: Record<string, unknown> } {
    const { anchor, expiry } = TURN_DURATIONS[phrase];
    const combat = game.combat?.started ? game.combat : null;
    if (!combat) return { duration: { value: 1, units: "rounds", expiry } };
    const anchorActor = anchor === "caster" ? caster : anchor === "target" ? target : null;
    const combatant =
        anchor === "current" ? combat.combatant : anchorActor ? combat.getCombatantsByActor(anchorActor as never)[0] : null;
    if (!combatant) return { duration: { value: 1, units: "rounds", expiry } };
    const isAnchorsTurn = combat.combatant?.id === combatant.id && anchor !== "current";
    const start = { ...ActiveEffect.implementation.getEffectStart(combat as never), combatant: combatant.id };
    return { duration: { value: isAnchorsTurn ? 1 : 0, units: "rounds", expiry }, start };
}

/* -------------------------------------------- */
/*  Effects                                     */
/* -------------------------------------------- */

export interface ApplyEffectOptions {
    /** Roll the target's Condition Resist first and skip the effect if it succeeds. */
    resistible?: boolean;
    /** Name of whoever applied it, for the chat message. */
    sourceName?: string;
    /** Post a chat message about it. Off for self-buffs, which the ability card already lists. */
    announce?: boolean;
    /** Less CR for this one roll (an attack's "reduce CR" affix). */
    resistPenalty?: number;
    /** Who's inflicting it and the attack's facts, for the target's "incoming" CR modifiers. */
    attackContext?: AttackContext;
}

/**
 * Give an actor an effect.
 *
 * Effects don't stack with themselves: an effect from the same ability (flags.barbs.sourceKey) or with any of the
 * same statuses replaces the existing one. Going over Buff Limit only warns, matching how the table plays it.
 */
export interface AppliedEffect {
    effect: ActiveEffect.Implementation;
    /** Existing effects it replaced, so an undo can bring them back. */
    replaced: RemovedEffect[];
}

export async function applyEffectToActor(
    target: Actor.Implementation,
    data: Record<string, unknown>,
    { resistible = false, sourceName, announce = true, resistPenalty = 0, attackContext }: ApplyEffectOptions = {},
): Promise<AppliedEffect | null> {
    const creature = target.system as unknown as CreatureModel;
    const name = String(data.name);
    const speaker = ChatMessage.getSpeaker({ actor: target as Actor.Stored });

    // Condition immunities (Dragonblood) stop a condition outright, before any resist roll.
    const immuneTo = ((data.statuses as string[] | undefined) ?? []).filter((id) => creature.derived.conditionImmunity?.[id]);
    if (immuneTo.length && (data.system as { category?: string } | undefined)?.category === "condition") {
        if (announce) ui.notifications?.info(`${target.name} is immune to ${name}.`);
        return null;
    }

    if (resistible) {
        // Gear can add CR against specific conditions (the Roll20 sheet's per-condition resistances).
        const specific = Math.max(0, ...((data.statuses as string[] | undefined) ?? []).map((id) => creature.derived.conditionResistBonus?.[id] ?? 0));
        const attacker = attackContext ? ((await fromUuid(attackContext.attackerUuid)) as Actor.Implementation | null) : null;
        const incomingCR = attackContext ? incomingTotal(target, "incomingCR", attacker, attackContext).total : 0;
        const resist = Math.max(0, creature.derived.stats.conditionResist.value + specific + incomingCR - resistPenalty);
        const roll = await new Roll("1d100").evaluate();
        const resisted = (roll.total ?? 101) <= resist;
        await roll.toMessage({
            speaker,
            flavor: `Condition Resist vs ${name} (${resist}%${resistPenalty ? `, ${resistPenalty}% lowered by the attack` : ""}): ${resisted ? "<strong>resisted</strong>" : "failed"}`,
        });
        if (resisted) return null;
    }

    // Cleansing comes first, so "their Frozen ends and they are Slowed" works in one effect.
    const cleanse = (foundry.utils.getProperty(data, `flags.${SYSTEM_ID}.cleanse`) as string[] | undefined) ?? [];
    const cleansed = target.effects.filter((e) => [...e.statuses].some((s) => cleanse.includes(s)));
    const cleansedSnapshots = cleansed.map((e) => snapshotEffect(e as ActiveEffect.Implementation));
    if (cleansed.length) await target.deleteEmbeddedDocuments("ActiveEffect", cleansed.map((e) => e.id!));
    if (foundry.utils.getProperty(data, `flags.${SYSTEM_ID}.cleanseOnly`)) {
        if (announce && cleansed.length) {
            const undo: UndoRecord = { actorUuid: target.uuid ?? "", removedEffects: cleansedSnapshots };
            await ChatMessage.create({
                speaker,
                content: `<div class="barbs-chat-card"><p>${target.name} is cleansed of ${cleansed.map((e) => e.name).join(", ")}.</p>${UNDO_ROW}</div>`,
                flags: { [SYSTEM_ID]: { undo } },
            } as never);
        } else if (announce) {
            ui.notifications?.info(`${target.name} has nothing to cleanse.`);
        }
        return null;
    }

    // Turn-relative durations are resolved now, against the live combat.
    const turnDuration = foundry.utils.getProperty(data, `flags.${SYSTEM_ID}.turnDuration`) as string | undefined;
    if (isTurnDuration(turnDuration)) {
        const casterUuid = foundry.utils.getProperty(data, `flags.${SYSTEM_ID}.casterUuid`) as string | undefined;
        const caster = casterUuid ? ((await fromUuid(casterUuid)) as Actor.Implementation | null) : null;
        const { duration, start } = resolveTurnDuration(turnDuration, caster, target);
        data = { ...data, duration, ...(start ? { start } : {}) };
    }

    // Matching effects (same ability, or sharing a status) replace each other, unless the effect stacks; then the
    // oldest copies go once the stack limit is reached.
    const sourceKey = foundry.utils.getProperty(data, `flags.${SYSTEM_ID}.sourceKey`);
    const maxStacks = Number(foundry.utils.getProperty(data, `flags.${SYSTEM_ID}.maxStacks`) ?? 1) || 1;
    const statuses = new Set((data.statuses as string[] | undefined) ?? []);
    const matching = target.effects
        .filter((e) => {
            const key = foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.sourceKey`);
            return (!!sourceKey && key === sourceKey) || [...e.statuses].some((s) => statuses.has(s));
        })
        .sort((a, b) => ((a._stats as { createdTime?: number }).createdTime ?? 0) - ((b._stats as { createdTime?: number }).createdTime ?? 0));
    const replaced = matching.slice(0, Math.max(0, matching.length - (maxStacks - 1)));
    const replacedSnapshots = replaced.map((e) => snapshotEffect(e as ActiveEffect.Implementation));
    if (replaced.length) await target.deleteEmbeddedDocuments("ActiveEffect", replaced.map((e) => e.id!));

    const isBuff = (data.system as { category?: string } | undefined)?.category === "buff";
    if (isBuff) {
        const buffs = target.effects.filter((e) => (e.system as unknown as BarbsEffectModel).category === "buff").length;
        const limit = creature.derived.stats.buffLimit.value;
        if (buffs + 1 > limit) {
            ui.notifications?.warn(`${target.name} is over their buff limit (${buffs + 1}/${limit}).`);
        }
    }

    const [effect] = (await target.createEmbeddedDocuments("ActiveEffect", [data as never])) as ActiveEffect.Implementation[];
    await eerieMists(target, data);
    const result = { effect, replaced: [...cleansedSnapshots, ...replacedSnapshots] };
    if (!announce) return result;

    const undo: UndoRecord = { actorUuid: target.uuid ?? "", createdEffects: [effect.uuid ?? ""], removedEffects: result.replaced };
    await ChatMessage.create({
        speaker,
        content:
            `<div class="barbs-chat-card"><p>${target.name} ${isBuff ? "gains" : "is affected by"} ` +
            `<strong>${name}</strong>${sourceName ? ` from ${sourceName}` : ""}.</p>${UNDO_ROW}</div>`,
        flags: { [SYSTEM_ID]: { undo } },
    } as never);
    return result;
}

/* -------------------------------------------- */
/*  Damage and healing                          */
/* -------------------------------------------- */

const STATUS_DOWNED = "downed";
const STATUS_DEAD = "dead";

async function updateHealth(target: Actor.Implementation, amount: number): Promise<{ notes: string[]; undo: UndoRecord }> {
    const creature = target.system as unknown as CreatureModel;
    const { health } = creature.derived.resources;
    const before = { health: health.value, downed: creature.derived.downed.value, shielding: creature.shielding.value };
    const change = applyHealthChange(
        {
            health: before.health,
            shielding: before.shielding,
            maxHealth: health.max,
            downed: before.downed,
            maxDowned: creature.derived.downed.max,
            isDowned: target.statuses.has(STATUS_DOWNED),
        },
        amount,
    );
    const undo = {
        actorUuid: target.uuid ?? "",
        resourceDeltas: { health: change.health - before.health },
        downedDelta: change.downed - before.downed,
        shieldingDelta: change.shielding - before.shielding,
        statusesAdded: [] as string[],
        statusesRemoved: [] as string[],
        removedEffects: [] as RemovedEffect[],
    } satisfies UndoRecord;
    await target.update({
        system: { resources: { health: { value: change.health } }, downed: { value: change.downed }, shielding: { value: change.shielding } },
    } as never);
    const notes: string[] = [];
    if (change.shielding !== before.shielding) {
        notes.push(`Shielding absorbed ${before.shielding - change.shielding} (${change.shielding} left).`);
    }

    if (change.becameDowned) {
        if (!target.statuses.has(STATUS_DOWNED)) {
            await target.toggleStatusEffect(STATUS_DOWNED, { active: true });
            undo.statusesAdded.push(STATUS_DOWNED);
        }
        const buffs = target.effects.filter((e) => (e.system as unknown as BarbsEffectModel).category === "buff");
        if (buffs.length) {
            undo.removedEffects = buffs.map((e) => snapshotEffect(e as ActiveEffect.Implementation));
            await target.deleteEmbeddedDocuments("ActiveEffect", buffs.map((e) => e.id!));
        }
        notes.push(
            `${target.name} is <strong>Downed</strong> and loses all buffs. They drop concentration, most conditions end, and they roll death saves.`,
        );
    }
    if (change.died) {
        if (!target.statuses.has(STATUS_DEAD)) {
            await target.toggleStatusEffect(STATUS_DEAD, { active: true, overlay: true });
            undo.statusesAdded.push(STATUS_DEAD);
        }
        notes.push(`${target.name}'s Downed Health reached 0. <strong>They die.</strong>`);
    }
    if (change.revived) {
        if (target.statuses.has(STATUS_DOWNED)) {
            await target.toggleStatusEffect(STATUS_DOWNED, { active: false });
            undo.statusesRemoved.push(STATUS_DOWNED);
        }
        // The rulebook doesn't say when Downed Health refills; refilling on waking up is our reading.
        undo.downedDelta = DOWNED_HEALTH_MAX - before.downed;
        await target.update({ system: { downed: { value: DOWNED_HEALTH_MAX } } } as never);
        notes.push(`${target.name} wakes up prone.`);
    }
    if (change.stabilized) {
        const turns = (await new Roll("1d4").evaluate()).total;
        notes.push(
            `${target.name} is <strong>stabilized</strong>: no more death saves, and they wake up after missing ` +
                `${turns} turn(s). Damage to Downed Health can still kill them.`,
        );
    }
    return { notes, undo };
}

async function postHealthMessage(target: Actor.Implementation, html: string, undo: UndoRecord): Promise<void> {
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: target as Actor.Stored }),
        content: `<div class="barbs-chat-card">${html}${isEmptyUndo(undo) ? "" : UNDO_ROW}</div>`,
        flags: { [SYSTEM_ID]: { undo } },
    } as never);
}

/**
 * Damage an actor. Each hit is reduced separately (AC comes off every arrow of a volley), then the total comes off
 * health.
 * @param scale Multiplier on the incoming damage, e.g. 0.5 for "half damage to enemies behind the target".
 */
export async function applyDamageToActor(
    target: Actor.Implementation,
    hits: Partial<Record<DamageKey, number>>[],
    penetration: Partial<Record<DamageKey, number>>,
    sourceName?: string,
    scale = 1,
    {
        trueDamage = false,
        attack = false,
        unblockableChance = 0,
        acReduction = 0,
        lifesteal,
        notes: extraNotes = [],
        attackContext,
        triggerDepth = 0,
        attackerUuid,
    }: {
        trueDamage?: boolean;
        attack?: boolean;
        /** Chance the attack ignores blocks, percent (100 = can't be blocked). Rolled here, per target. */
        unblockableChance?: number;
        acReduction?: number;
        lifesteal?: { percent: number; attackerUuid: string };
        /** Lines to add to the damage message (the card's Evasion roll for a partly dodged attack). */
        notes?: string[];
        /** Who's attacking and the attack's facts, for the defender's "incoming" modifiers. */
        attackContext?: AttackContext;
        /** For damage dealt by a trigger: how deep the trigger chain is (see triggers/index.ts). */
        triggerDepth?: number;
        /** Who dealt the damage, when there's no attack context. */
        attackerUuid?: string;
    } = {},
): Promise<void> {
    const creature = target.system as unknown as CreatureModel;
    const d = creature.derived;
    const notes0: string[] = [...extraNotes];

    // An attack (not a drain or DoT) uses up the strongest block on the target, unless it turns out unblockable.
    const baseScale = scale;
    let blockNote = "";
    const blockUndo: RemovedEffect[] = [];
    let unblockable = unblockableChance >= 100;
    if (attack && !trueDamage) {
        const blocks = (target.appliedEffects as ActiveEffect.Implementation[])
            .filter((e) => ((e.system as unknown as { block?: number }).block ?? 0) > 0)
            .sort((a, b) => (b.system as unknown as { block: number }).block - (a.system as unknown as { block: number }).block);
        const block = blocks[0];
        if (block && !unblockable && unblockableChance > 0) {
            const roll = (await new Roll("1d100").evaluate()).total ?? 101;
            unblockable = roll <= unblockableChance;
            notes0.push(`Unblockable chance ${unblockableChance}%: rolled ${roll}, ${unblockable ? "the block doesn't apply" : "blocked"}.`);
        } else if (block && unblockable) {
            notes0.push(`Unblockable: ${block.name} doesn't apply.`);
        }
        if (block && !unblockable) {
            const percent = (block.system as unknown as { block: number }).block;
            scale *= 1 - percent / 100;
            blockNote = percent >= 100 ? ` (fully blocked by ${block.name})` : ` (blocked ${percent}% by ${block.name})`;
            blockUndo.push(snapshotEffect(block));
            await block.delete();
        }
    }
    // The defender's "incoming" modifiers for this attack: AC against ranged attacks, more damage from the caster who
    // marked them, and so on.
    const attacker = attackContext ? ((await fromUuid(attackContext.attackerUuid)) as Actor.Implementation | null) : null;
    const incoming = (type: string, filter?: (damageType: string) => boolean) =>
        attackContext ? incomingTotal(target, type, attacker, attackContext, filter) : { total: 0, sources: [] };
    const incomingAC = incoming("incomingAC");
    const incomingACPercent = incoming("incomingACPercent");
    const vulnerability = { ...d.vulnerability } as Record<string, number>;
    const incomingSources: string[] = [...incomingAC.sources, ...incomingACPercent.sources];
    for (const key of Object.keys(vulnerability)) {
        // Vulnerability keys are damage types plus "all" and "magic"; incoming modifiers use "allMagic" for the latter.
        const extra = incoming("incomingDamage", (t) => t === key || (key === "magic" && t === "allMagic"));
        vulnerability[key] += extra.total;
        incomingSources.push(...extra.sources);
    }
    if (incomingSources.length) notes0.push(`${target.name}'s defenses against this attack: ${incomingSources.join(", ")}.`);
    const defenses = {
        // An attack's "reduce AC" affix only lowers AC against that attack.
        ac: Math.max(0, Math.round((d.stats.ac.value - acReduction + incomingAC.total) * (1 + incomingACPercent.total / 100))),
        magicResist: d.stats.magicResist.value,
        elementResist: d.elementResist,
        damageReduction: d.damageReduction,
        vulnerability: vulnerability as typeof d.vulnerability,
    };
    let total = 0;
    const rows: string[] = [];
    // Per-type totals before and after defenses, for "would take damage" triggers that redirect or reflect it.
    const incomingByType: Partial<Record<DamageKey, number>> = {};
    const takenByType: Partial<Record<DamageKey, number>> = {};
    hits.forEach((hit, index) => {
        const scaled = Object.fromEntries(
            Object.entries(hit).map(([type, amount]) => [type, Math.round((amount ?? 0) * scale)]),
        ) as Partial<Record<DamageKey, number>>;
        // True damage ("drain", "loses health") skips every defense.
        const reduced = trueDamage
            ? {
                  parts: Object.entries(scaled).map(([type, amount]) => ({ type: type as DamageKey, incoming: amount ?? 0, taken: amount ?? 0 })),
                  total: Object.values(scaled).reduce((a, b) => a + (b ?? 0), 0),
              }
            : reduceDamage(scaled, penetration, defenses);
        total += reduced.total;
        for (const p of reduced.parts) {
            incomingByType[p.type] = (incomingByType[p.type] ?? 0) + p.incoming;
            takenByType[p.type] = (takenByType[p.type] ?? 0) + p.taken;
        }
        const parts = reduced.parts.map((p) => `${p.type} ${p.incoming} → <strong>${p.taken}</strong>`).join(", ");
        rows.push(`<li>${hits.length > 1 ? `Hit ${index + 1}: ` : ""}${parts || "no damage"}</li>`);
    });

    // "Would take damage" triggers get a say before health changes: Critical Condition survives at 1, Long Live The
    // King redirects the hit to the protector, Self Defense Turret reflects it.
    const { fireTriggers, resolveIncomingDamage } = await import("../triggers/index.ts");
    const dealerUuid = attackContext?.attackerUuid ?? attackerUuid;
    const dealer = dealerUuid ? ((await fromUuid(dealerUuid)) as Actor.Implementation | null) : null;
    const resolved =
        total > 0
            ? await resolveIncomingDamage(target, incomingByType, takenByType, { other: dealer, attack: attackContext, depth: triggerDepth, sourceName })
            : null;
    if (resolved) {
        if (resolved.total !== total) notes0.push(`Damage changed from ${total} to ${resolved.total}.`);
        notes0.push(...resolved.notes);
        total = resolved.total;
        for (const effect of resolved.consumed) {
            blockUndo.push(snapshotEffect(effect));
            await effect.delete();
        }
    }

    const wasDowned = target.statuses.has(STATUS_DOWNED);
    const { notes: healthNotes, undo } = await updateHealth(target, total);
    const notes = [...notes0, ...healthNotes];
    (undo.removedEffects ??= []).push(...blockUndo);
    if (total > 0) {
        const bonus = d.combat?.concentrationBonus ?? 0;
        notes.push(`Concentration check DC ${total * 2}, if concentrating${bonus ? ` (${target.name} has ${bonus > 0 ? "+" : ""}${bonus})` : ""}.`);
    }
    const scaleNote =
        (baseScale !== 1 ? ` (${baseScale === 0.5 ? "half" : `×${baseScale}`} damage)` : "") +
        (trueDamage ? " (ignoring defenses)" : "") +
        blockNote;
    await postHealthMessage(
        target,
        `<p>${target.name} takes <strong>${total}</strong> damage${sourceName ? ` from ${sourceName}` : ""}${scaleNote}.</p>` +
            `<ul>${rows.join("")}</ul>${notes.map((n) => `<p>${n}</p>`).join("")}`,
        undo,
    );

    // Redirected and reflected damage goes out as trigger damage (not a new attack).
    if (resolved) {
        const { requestOnActor } = await import("../socket.ts");
        for (const r of resolved.redirects) {
            await requestOnActor(r.actor, "damage", { hits: [r.hits], penetration, sourceName: r.sourceName, triggerDepth: triggerDepth + 1, attackerUuid: dealerUuid });
        }
        for (const r of resolved.reflects) {
            await requestOnActor(r.actor, "damage", { hits: [r.hits], penetration: {}, sourceName: r.sourceName, triggerDepth: triggerDepth + 1, attackerUuid: target.uuid ?? undefined });
        }
    }

    // Triggers: the target reacts to taking damage, and the attacker to downing them.
    if (total > 0) {
        await fireTriggers(target, "damaged", { other: dealer, attack: attackContext, depth: triggerDepth, sourceName });
        if (!wasDowned && target.statuses.has(STATUS_DOWNED) && dealer) {
            await fireTriggers(dealer, "kill", { other: target, depth: triggerDepth, sourceName });
        }
    }

    // Lifesteal heals the attacker for a share of what actually landed (after defenses), as its own undoable heal.
    if (lifesteal && total > 0) {
        const attacker = (await fromUuid(lifesteal.attackerUuid)) as Actor.Implementation | null;
        const amount = Math.floor((total * lifesteal.percent) / 100);
        if (attacker && amount > 0) await applyHealingToActor(attacker, amount, `Lifesteal (${lifesteal.percent}% of ${total} on ${target.name})`);
    }
}

export async function applyHealingToActor(target: Actor.Implementation, amount: number, sourceName?: string): Promise<void> {
    const before = (target.system as unknown as CreatureModel).derived.resources.health.value;
    const { notes, undo } = await updateHealth(target, -Math.max(0, amount));
    const after = (target.system as unknown as CreatureModel).derived.resources.health.value;
    await postHealthMessage(
        target,
        `<p>${target.name} is healed for <strong>${after - before}</strong>${sourceName ? ` by ${sourceName}` : ""} ` +
            `(${before} → ${after}).</p>${notes.map((n) => `<p>${n}</p>`).join("")}`,
        undo,
    );
}

/** Grant shielding. Like PF2e temporary HP it doesn't stack: the target keeps whichever is larger. */
export async function applyShieldingToActor(target: Actor.Implementation, amount: number, sourceName?: string): Promise<void> {
    const current = (target.system as unknown as CreatureModel).shielding.value;
    const next = Math.max(current, Math.round(amount));
    if (next === current) {
        ui.notifications?.info(`${target.name} already has ${current} shielding, which is at least ${amount}.`);
        return;
    }
    await target.update({ system: { shielding: { value: next } } } as never);
    const undo: UndoRecord = { actorUuid: target.uuid ?? "", shieldingDelta: next - current };
    await postHealthMessage(
        target,
        `<p>${target.name} gains <strong>${next}</strong> shielding${sourceName ? ` from ${sourceName}` : ""} (was ${current}).</p>`,
        undo,
    );
}

/**
 * Change a target's stamina or mana directly ("drain 6d6 stamina"), with no defenses involved.
 * TODO: double-check with the rulebook author that drains ignore AC/MR.
 */
export async function applyResourceChangeToActor(
    target: Actor.Implementation,
    resource: "stamina" | "mana",
    delta: number,
    sourceName?: string,
): Promise<number> {
    const { value, max } = (target.system as unknown as CreatureModel).derived.resources[resource];
    const next = Math.clamp(value + delta, 0, max);
    await target.update({ system: { resources: { [resource]: { value: next } } } } as never);
    const changed = next - value;
    const undo: UndoRecord = { actorUuid: target.uuid ?? "", resourceDeltas: { [resource]: changed } };
    await postHealthMessage(
        target,
        `<p>${target.name} ${changed < 0 ? "loses" : "gains"} <strong>${Math.abs(changed)}</strong> ${resource}${
            sourceName ? ` (${sourceName})` : ""
        } (${value} → ${next}).</p>`,
        undo,
    );
    return changed;
}

/* -------------------------------------------- */
/*  Passive reactions to conditions             */
/* -------------------------------------------- */

async function casterOf(data: object): Promise<Actor.Implementation | null> {
    const uuid = foundry.utils.getProperty(data, `flags.${SYSTEM_ID}.casterUuid`) as string | undefined;
    return uuid ? ((await fromUuid(uuid)) as Actor.Implementation | null) : null;
}

function hasPassive(actor: Actor.Implementation | null, name: string): boolean {
    return !!actor?.items.some((i) => i.type === "passive" && i.name === name);
}

/**
 * Mistguard's Eerie Mists: conditions the Mistguard applies also apply an irresistible, non-stacking Weaken of 10%
 * per condition on the target. Kept as one effect that's replaced whenever the count changes.
 */
async function eerieMists(target: Actor.Implementation, data: Record<string, unknown>): Promise<void> {
    if ((data.system as { category?: string } | undefined)?.category !== "condition") return;
    const caster = await casterOf(data);
    if (!hasPassive(caster, "Eerie Mists")) return;
    const conditions = target.effects.filter(
        (e) => (e.system as unknown as BarbsEffectModel).category === "condition" && !foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.eerieMists`),
    ).length;
    const old = target.effects.filter((e) => !!foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.eerieMists`));
    if (old.length) await target.deleteEmbeddedDocuments("ActiveEffect", old.map((e) => e.id!));
    await target.createEmbeddedDocuments("ActiveEffect", [
        {
            name: `Eerie Mists (${10 * conditions}% Weaken)`,
            img: "icons/svg/degen.svg",
            showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
            system: {
                category: "",
                modifiers: [{ type: "multiplier", rollType: "all", damageType: "all", weapon: "", value: String(-10 * conditions) }],
            },
            flags: { [SYSTEM_ID]: { eerieMists: true } },
        } as never,
    ]);
}

/** Noxomancer's Neverending Nightmare: when a non-curse condition they inflicted ends, the target gains a curse. */
export function registerConditionHooks(): void {
    Hooks.on("deleteActiveEffect", (effect: ActiveEffect.Implementation) => {
        if (!game.user?.isActiveGM) return;
        const target = effect.parent;
        if (!(target instanceof Actor)) return;
        if ((effect.system as unknown as BarbsEffectModel).category !== "condition" || effect.statuses.has("cursed")) return;
        void (async () => {
            const caster = await casterOf(effect);
            if (!hasPassive(caster, "Neverending Nightmare")) return;
            const curse = STATUSES.find((s) => s.id === "cursed")!;
            await applyEffectToActor(
                target as Actor.Implementation,
                {
                    name: curse.name,
                    img: curse.img,
                    statuses: ["cursed"],
                    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
                    system: { category: "condition" },
                    flags: { [SYSTEM_ID]: { sourceKey: "Noxomancer/Neverending Nightmare", maxStacks: 999 } },
                },
                { sourceName: `${caster!.name}'s Neverending Nightmare` },
            );
        })();
    });
}
