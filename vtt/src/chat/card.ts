/**
 * The chat card for abilities and weapon attacks, and the buttons on it.
 *
 * Cards carry everything the buttons need in flags, so applying damage or effects works from any client, any time
 * after the roll, without re-rolling or needing the caster's sheet open.
 */
import { ELEMENTS, SYSTEM_ID } from "../config.ts";
import { ABILITY_AUTOMATION, getAutomation } from "../abilities/catalog.ts";
import { resolve, restoreContext, type ContextData } from "../abilities/context.ts";
import { buildEffectData, type EffectSource } from "../abilities/effects.ts";
import { status as statusSpec } from "../abilities/helpers.ts";
import type { EffectSpec } from "../abilities/types.ts";
import type { UseContext } from "../abilities/context.ts";
import type { CreatureModel } from "../data/actor/creature.ts";
import {
    evaluateDistanceBonus,
    type AttackResult,
    type ConditionalDamage,
    type ConditionalModifier,
    type DistanceBonus,
    type OnHitStatus,
} from "../rolls/attack.ts";
import { isMagic } from "../rules/damage-math.ts";
import { parsePredicate, testPredicate } from "../rules/predicate.ts";
import { actorData, actorOptions } from "../rules/roll-options.ts";
import { evaluateNumber } from "../rules/formula.ts";
import { incomingTotal, type AttackContext } from "../effects/incoming.ts";
import type { DamageKey } from "../rules/damage-math.ts";
import { requestOnActor, requestUndo } from "../socket.ts";
import { hideUndoIfNotAllowed, UNDO_BUTTON, type UndoRecord } from "./undo.ts";

export interface CardFlags {
    actorUuid: string;
    sourceName: string;
    damage?: {
        hits: Partial<Record<DamageKey, number>>[];
        penetration: Partial<Record<DamageKey, number>>;
        /** Skip all defenses (drains, health loss). */
        trueDamage?: boolean;
        /** Chance blocks don't apply, percent (100 = "cannot be blocked"). Rolled per target on Apply. */
        unblockableChance?: number;
        /** A targeted attack that can miss: targets roll Evasion on Apply. False for areas, drains, "can't miss". */
        evadable?: boolean;
        /** Targets with this status can't dodge it (Shadow Missiles vs Cursed). */
        cannotMissAgainst?: string;
        /** Heal the attacker for this percent of the damage dealt to each target. */
        lifesteal?: number;
        /** Reduces targets' Evasion for the Evade button, percent. */
        accuracy?: number;
        /** For this attack only: the target's Evasion is this much lower when dodging (equipment's reduce evasion). */
        evasionReduction?: number;
        /** For this attack only: the target's AC is this much lower against its damage. */
        acReduction?: number;
        /** Per-hit damage that only applies to targets meeting a condition, parallel to `hits`. */
        conditional?: ConditionalDamage[][];
        /** Multipliers and penetration that only apply to targets meeting a condition. */
        conditionalModifiers?: ConditionalModifier[];
        /** The attack's roll facts, for checking conditions against each target. */
        rollOptions?: string[];
        /** Per-hit damage that depends on each target's distance (Distance Shooter), parallel to `hits`. */
        bonus?: DistanceBonus[][];
        /** Distance tiers: each target takes the first tier whose distance from the caster covers it. */
        tiers?: { within: number; hits: Partial<Record<DamageKey, number>>[]; bonus?: DistanceBonus[][]; conditional?: ConditionalDamage[][] }[];
    };
    /** The caster's token, for measuring distances to targets. */
    casterTokenUuid?: string;
    /** For this attack only: targets resist its conditions with this much less CR (equipment's reduce CR). */
    crReduction?: number;
    /** The ability's facts (ability:tag:spell, area) for cards without an attack roll, for defenders' conditions. */
    attackOptions?: string[];
    /** Shielding the targets gain. */
    shielding?: number;
    /** Stamina or mana drained from each target and given to the caster. */
    drain?: { resource: "stamina" | "mana"; amount: number };
    healing?: number;
    /** Ability whose catalog `target` effects the buttons apply. */
    effectSource?: EffectSource;
    /** Enough to rebuild the use context (choices, effectiveness) when an effect button is clicked. */
    context?: ContextData;
    /** On-hit statuses from the attacker's buffs, each offered as an Apply button. */
    statuses?: OnHitStatus[];
    /** Per-target damage multipliers by token UUID, e.g. half damage past the first target of a line. */
    targetScales?: Record<string, number>;
    /** Reflected beams: which segments (by redirect count) hit each token, by token UUID. */
    segments?: Record<string, number[]>;
    /** Damage types that swap with each redirect (Helix Beam). */
    redirectSwap?: [DamageKey, DamageKey];
    /** The caster has Alter Course: +50% damage per redirect. */
    alterCourse?: boolean;
    /** Catalog key of the automation, so effect buttons resolve the same entry. */
    automationKey?: string;
    /** Ready-made effects from the caster's passives (Reduce to Ashes), applied as-is. */
    extraEffects?: Record<string, unknown>[];
    /** Tokens targeted when the card was made; used if the clicking user has no targets. */
    targets: string[];
}

export interface CardContent {
    title: string;
    subtitle?: string;
    img: string;
    meta?: { label: string; value: string }[];
    description?: string;
    result?: AttackResult | null;
    notes?: string[];
    selfEffects?: string[];
    targetEffects?: { index: number; label: string }[];
    extraEffects?: { index: number; label: string }[];
    tiers?: { within: number; result: AttackResult }[];
}

const DAMAGE_LABELS: Record<string, string> = { healing: "Healing" };

async function renderHits(result: AttackResult | null) {
    if (!result) return [];
    return Promise.all(
        result.hits.map(async (hit, index) => ({
            label: result.hits.length > 1 ? `Hit ${index + 1}` : "",
            // Each damage type renders like a core roll: click to expand its dice (core's chat log handles the toggle).
            parts: await Promise.all(
                hit.parts.map(async (p) => ({
                    type: p.type,
                    label: DAMAGE_LABELS[p.type] ?? p.type.capitalize(),
                    total: p.total,
                    formula: p.formula,
                    math:
                        `${p.base}` +
                        (p.multiplier !== 1 ? ` × ${p.multiplier.toFixed(2)}` : "") +
                        (hit.crit?.isCrit ? ` × ${hit.crit.factor} (crit)` : "") +
                        (p.multiplier !== 1 || hit.crit?.isCrit ? ` = ${p.total}` : ""),
                    tooltip: await p.roll.getTooltip(),
                })),
            ),
            crit: hit.crit ? { ...hit.crit, total: hit.crit.roll.total, tooltip: await hit.crit.roll.getTooltip() } : null,
        })),
    );
}

export async function postCard(
    actor: Actor.Implementation,
    content: CardContent,
    flags: Omit<CardFlags, "targets">,
    undo?: UndoRecord,
    { targets: explicitTargets }: { targets?: string[] } = {},
) {
    const result = content.result ?? null;
    const scales = Object.values(flags.targetScales ?? {});

    // Preview distance-based bonus damage for the current targets; the real amount is measured again on Apply.
    const bonuses = result?.hits.flatMap((h) => h.distanceBonus) ?? [];
    const distancePreview = bonuses.length
        ? [...(game.user?.targets ?? [])].map((t) => {
              const d = distanceFromCaster(
                  { ...flags, targets: [] } as CardFlags,
                  { actor: t.actor as Actor.Implementation, tokenUuid: t.document.uuid ?? null },
              );
              const amount = d === null ? null : (result?.hits ?? []).reduce((sum, h) => sum + h.distanceBonus.reduce((a, b) => a + evaluateDistanceBonus(b, d), 0), 0);
              return { name: t.name, distance: d, amount };
          })
        : [];
    const tierSections = await Promise.all(
        (content.tiers ?? []).map(async (t) => ({ label: `Within ${t.within} ft`, hits: await renderHits(t.result) })),
    );
    const html = await foundry.applications.handlebars.renderTemplate(`systems/${SYSTEM_ID}/templates/chat/action-card.hbs`, {
        ...content,
        hits: tierSections.length ? [] : await renderHits(result),
        tierSections,
        distanceBonus: bonuses.length ? bonuses[0].formula.replace(/@distance/g, "distance") : null,
        distancePreview,
        total: result && result.hits.length > 1 ? Object.values(result.totals).reduce((a, b) => a + (b ?? 0), 0) : null,
        notes: [...(content.notes ?? []), ...(result?.notes ?? [])],
        consumed: result?.consumed ?? [],
        // Always undoable, even with nothing to refund: striking the card out also removes its Apply buttons.
        canUndo: !!undo,
        undoButton: UNDO_BUTTON,
        hasDamage:
            !!flags.damage &&
            (flags.damage.hits.some((h) => Object.keys(h).length > 0) ||
                (flags.damage.bonus?.some((b) => b.length) ?? false) ||
                (flags.damage.tiers?.length ?? 0) > 0),
        trueDamage: !!flags.damage?.trueDamage,
        alterCourse: !!flags.alterCourse,
        shielding: flags.shielding,
        drain: flags.drain,
        scaledTargets: scales.some((s) => s !== 1),
        hasHealing: !!flags.healing,
        statuses: (flags.statuses ?? []).map((s, index) => ({ ...s, index })),
        combo: result?.combo ? { ...result.combo, total: result.combo.roll.total, tooltip: await result.combo.roll.getTooltip() } : null,
    });

    const targets =
        explicitTargets ?? [...(game.user?.targets ?? [])].map((t) => t.document.uuid).filter((u): u is string => !!u);
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
        content: html,
        rolls: result?.rolls ?? [],
        flags: { [SYSTEM_ID]: { card: { ...flags, targets } satisfies CardFlags, ...(undo ? { undo } : {}) } },
    } as never);
}

/* -------------------------------------------- */
/*  Buttons                                     */
/* -------------------------------------------- */

interface Target {
    actor: Actor.Implementation;
    tokenUuid: string | null;
}

/** Grid distance in feet between the caster's token and a target's, or null if either isn't on the canvas. */
function distanceFromCaster(flags: CardFlags, target: Target): number | null {
    const caster = flags.casterTokenUuid ? (fromUuidSync(flags.casterTokenUuid) as TokenDocument.Implementation | null)?.object : null;
    const token = target.tokenUuid ? (fromUuidSync(target.tokenUuid) as TokenDocument.Implementation | null)?.object : null;
    if (!caster || !token || !canvas?.grid) return null;
    const grid = canvas.grid as unknown as { measurePath(waypoints: object[]): { distance: number } };
    return grid.measurePath([caster.center, token.center]).distance;
}

/** Helix Beam's element swap: on odd redirects, swap the two damage types. */
function applySwap(hits: Partial<Record<DamageKey, number>>[], flags: CardFlags, redirects: number) {
    const swap = flags.redirectSwap;
    if (!swap || redirects % 2 === 0) return hits;
    const [a, b] = swap;
    return hits.map((hit) => {
        const out: Partial<Record<DamageKey, number>> = { ...hit };
        out[a] = hit[b];
        out[b] = hit[a];
        for (const k of [a, b]) if (!out[k]) delete out[k];
        return out;
    });
}

/** Which distance tier a target falls in, or -1 if it's beyond all of them. */
function tierFor(flags: CardFlags, target: Target): number {
    const tiers = flags.damage?.tiers ?? [];
    const distance = distanceFromCaster(flags, target);
    if (distance === null) return -1;
    return tiers.findIndex((t) => distance <= t.within + 0.01);
}

/** The clicking user's targets, else the tokens targeted when the card was posted, else their selected tokens. */
function resolveTargets(flags: CardFlags): Target[] {
    let tokens: TokenDocument.Implementation[] = [...(game.user?.targets ?? [])].map((t) => t.document);
    if (!tokens.length) {
        tokens = flags.targets
            .map((uuid) => fromUuidSync(uuid) as TokenDocument.Implementation | null)
            .filter((t): t is TokenDocument.Implementation => !!t);
    }
    if (!tokens.length) tokens = (canvas?.tokens?.controlled ?? []).map((t) => t.document);
    const targets = tokens
        .filter((t) => !!t.actor)
        .map((t) => ({ actor: t.actor as Actor.Implementation, tokenUuid: t.uuid ?? null }));
    if (!targets.length) ui.notifications?.warn("Target or select the tokens to apply this to.");
    return targets;
}

/**
 * Roll a target's Evasion against the card's attack, once per hit. Only targeted attacks can be dodged (not areas,
 * drains, or "can't miss"); shift-click skips the roll for a GM ruling. A target dodging every hit gets a message
 * saying so. Rolled on the clicking user's client, so Apply can skip the conditions of an attack that missed.
 *
 * TODO: confirm the ruling that multi-hit attacks roll Evasion once per hit, not once for the whole attack.
 */
async function rollEvasion(flags: CardFlags, target: Target, hitCount: number, skip: boolean): Promise<{ dodged: boolean[]; note?: string }> {
    const damage = flags.damage;
    const none = { dodged: Array(hitCount).fill(false) as boolean[] };
    if (!damage?.evadable || skip || damage.trueDamage) return none;
    if (damage.cannotMissAgainst && target.actor.statuses.has(damage.cannotMissAgainst)) return none;
    // The defender's own conditional Evasion ("+40% against attackers more than 30 ft away") counts too.
    const attacker = (await fromUuid(flags.actorUuid)) as Actor.Implementation | null;
    const evasion =
        (target.actor.system as unknown as CreatureModel).derived.stats.evasion.value +
        incomingTotal(target.actor, "incomingEvasion", attacker, attackContext(flags)).total;
    const penalty = (damage.accuracy ?? 0) + (damage.evasionReduction ?? 0);
    const chance = Math.max(0, evasion - penalty);
    const rolls: number[] = [];
    for (let i = 0; i < hitCount; i++) rolls.push((await new Roll("1d100").evaluate()).total ?? 101);
    const dodged = rolls.map((r) => r <= chance);
    const against = `${chance}% Evasion${penalty ? ` (${evasion}% − ${penalty}% from the attack)` : ""}`;
    if (dodged.every(Boolean)) {
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: target.actor as Actor.Stored }),
            content: `<div class="barbs-chat-card"><p><strong>${target.actor.name} dodges</strong> ${flags.sourceName}: rolled ${rolls.join(", ")} against ${against}.</p></div>`,
        } as never);
        return { dodged };
    }
    const note = dodged.some(Boolean)
        ? `${against}: ${rolls.map((r, i) => `hit ${i + 1} ${dodged[i] ? "dodged" : "landed"} (${r})`).join(", ")}.`
        : `${against}: rolled ${rolls.join(", ")}, didn't dodge.`;
    return { dodged, note };
}

/** What a defender sees of this card's attack, for their "incoming" modifiers. */
function attackContext(flags: CardFlags): AttackContext {
    return { attackerUuid: flags.actorUuid, options: flags.damage?.rollOptions ?? flags.attackOptions ?? [] };
}

/** The attack's facts plus one target's, from the attacker's point of view, for conditions checked on Apply. */
function targetDomain(flags: CardFlags, target: Target): Set<string> {
    const out = [...(flags.damage?.rollOptions ?? []), ...actorOptions(target.actor, "target", flags.actorUuid)];
    const distance = distanceFromCaster(flags, target);
    if (distance !== null) out.push(`target:distance:${Math.round(distance)}`);
    return new Set(out);
}

/** Formula data for one target, from the attacker's side: their roll data, `@self`, `@target`, and `@distance`. */
function targetFormulaData(flags: CardFlags, target: Target): Record<string, unknown> {
    const attacker = fromUuidSync(flags.actorUuid) as Actor.Implementation | null;
    const distance = distanceFromCaster(flags, target);
    return {
        ...(attacker?.getRollData() ?? {}),
        self: actorData(attacker),
        target: actorData(target.actor, flags.actorUuid),
        ...(distance !== null ? { distance: Math.round(distance) } : {}),
    };
}

/** Does a "this target only" condition hold for this target? Blank conditions always do. */
function targetMeets(flags: CardFlags, target: Target, conditions: string | undefined): boolean {
    const predicate = parsePredicate(conditions);
    return !predicate.length || testPredicate(predicate, targetDomain(flags, target));
}

/** Apply the card's damage to one target. Returns false if the target dodged every hit. */
async function damageTarget(
    flags: CardFlags,
    target: Target,
    { half = false, redirected = false, skipEvasion = false }: { half?: boolean; redirected?: boolean; skipEvasion?: boolean },
): Promise<boolean> {
    const damage = flags.damage!;
    const perTarget = (target.tokenUuid && flags.targetScales?.[target.tokenUuid]) || 1;
    let hits = damage.hits;
    let bonus = damage.bonus;
    let conditional = damage.conditional;
    if (damage.tiers?.length) {
        const tier = tierFor(flags, target);
        if (tier < 0) {
            ui.notifications?.info(`${target.actor.name} is outside every distance tier; no damage.`);
            return false;
        }
        hits = damage.tiers[tier].hits;
        bonus = damage.tiers[tier].bonus;
        conditional = damage.tiers[tier].conditional;
    }
    // Bonuses that depend on the target ("+2d10 vs demons", "double damage to demons"), checked for this one.
    const domain = targetDomain(flags, target);
    const meets = (conditions: string) => testPredicate(parsePredicate(conditions), domain);
    if (conditional?.some((c) => c.length)) {
        hits = hits.map((hit, i) => {
            const out = { ...hit };
            for (const c of conditional![i] ?? []) {
                if (!meets(c.conditions)) continue;
                const amount = c.formula ? Math.max(0, Math.round(evaluateNumber(c.formula, formulaData) * (c.factor ?? 1))) : c.amount;
                out[c.type] = (out[c.type] ?? 0) + amount;
            }
            return out;
        });
    }
    const conditionalMods = (damage.conditionalModifiers ?? [])
        .filter((m) => meets(m.conditions))
        .map((m) => (m.formula ? { ...m, percent: evaluateNumber(m.formula, formulaData) } : m))
        .filter((m) => m.percent);
    const covers = (key: string, type: string) => key === "all" || key === type || (key === "allMagic" && isMagic(type as DamageKey));
    for (const m of conditionalMods.filter((x) => x.kind === "multiplier")) {
        // A separate source, so it multiplies with the attack's other multipliers (like any other effect's).
        hits = hits.map((hit) =>
            Object.fromEntries(Object.entries(hit).map(([type, amount]) => [type, covers(m.key, type) ? Math.round((amount ?? 0) * (1 + m.percent / 100)) : amount])),
        );
    }
    let penetration = damage.penetration;
    for (const m of conditionalMods.filter((x) => x.kind === "penetration")) {
        penetration = { ...penetration };
        const types: DamageKey[] = m.key === "all" ? ["physical", ...ELEMENTS] : m.key === "allMagic" ? [...ELEMENTS] : [m.key as DamageKey];
        for (const t of types) penetration[t] = (penetration[t] ?? 0) + m.percent;
    }
    // Distance-based damage is measured for this target and added to each hit before defenses.
    // Damage that reads the distance or the target (Distance Shooter, "2d10 per curse on the target"), for this one.
    const formulaData = targetFormulaData(flags, target);
    if (bonus?.some((b) => b.length)) {
        const distance = distanceFromCaster(flags, target);
        const needsDistance = bonus.some((list) => list.some((b) => b.formula.includes("@distance")));
        if (needsDistance && distance === null) ui.notifications?.warn(`Can't measure the distance to ${target.actor.name}; no distance bonus.`);
        hits = hits.map((hit, i) => {
            const out = { ...hit };
            for (const b of bonus![i] ?? []) {
                if (b.formula.includes("@distance") && distance === null) continue;
                out[b.type] = (out[b.type] ?? 0) + evaluateDistanceBonus(b, distance ?? 0, formulaData);
            }
            return out;
        });
    }
    // The defender reacts to being attacked (Lightning Coil Cuirass, Accursed Armor) whether or not it lands.
    const { fireTriggers } = await import("../triggers/index.ts");
    const attacker = (await fromUuid(flags.actorUuid)) as Actor.Implementation | null;
    await fireTriggers(target.actor, "attacked", { other: attacker, attack: attackContext(flags), sourceName: flags.sourceName });
    const evasion = await rollEvasion(flags, target, hits.length, skipEvasion);
    if (evasion.dodged.every(Boolean)) return false;
    hits = hits.map((hit, i) => (evasion.dodged[i] ? {} : hit));
    // Lethality that only applies to some targets (Banishing Bolt against demons), rolled per landed hit.
    const notes = evasion.note ? [evasion.note] : [];
    for (const m of conditionalMods.filter((x) => x.kind === "lethality")) {
        const rolls: number[] = [];
        for (let i = 0; i < hits.length; i++) if (!evasion.dodged[i]) rolls.push((await new Roll("1d100").evaluate()).total ?? 101);
        const lethal = rolls.some((r) => r <= m.percent);
        notes.push(`${m.source}: ${m.percent}% Lethality, rolled ${rolls.join(", ")}${lethal ? ": <strong>LETHAL</strong> (dies unless immune; players are)" : ""}.`);
    }
    // A reflected beam hits once per segment the target was on; "Apply as redirected" is one bounce.
    const redirectList = redirected ? [1] : (target.tokenUuid && flags.segments?.[target.tokenUuid]) || [0];
    for (const redirects of redirectList) {
        const alter = flags.alterCourse ? 1 + 0.5 * redirects : 1;
        await requestOnActor(target.actor, "damage", {
            hits: applySwap(hits, flags, redirects),
            penetration,
            sourceName: redirects ? `${flags.sourceName} (redirect ${redirects}${flags.alterCourse ? `, +${50 * redirects}%` : ""})` : flags.sourceName,
            scale: (half ? 0.5 : perTarget) * alter,
            trueDamage: damage.trueDamage,
            unblockableChance: damage.unblockableChance,
            acReduction: damage.acReduction,
            lifesteal: damage.lifesteal ? { percent: damage.lifesteal, attackerUuid: flags.actorUuid } : undefined,
            notes: notes.length ? notes : undefined,
            attackContext: attackContext(flags),
        });
    }
    // Each landed hit: the attacker's on-hit reactions (Battle Fervor), then the defender's "when hit" ones.
    const landed = hits.filter((hit, i) => !evasion.dodged[i] && Object.values(hit).some((v) => (v ?? 0) > 0));
    for (const hit of landed) {
        const damage = Object.values(hit).reduce((a, b) => a + (b ?? 0), 0);
        await fireTriggers(attacker, "hit", { other: target.actor, options: domain, data: { hit: { damage } }, sourceName: flags.sourceName });
        await fireTriggers(target.actor, "hitBy", { other: attacker, attack: attackContext(flags), data: { hit: { damage } }, sourceName: flags.sourceName });
    }
    return true;
}

/** The card's per-target effects (its "Apply <condition>" buttons), resolved against the cast's context. */
async function targetEffectSpecs(flags: CardFlags): Promise<{ specs: EffectSpec[]; ctx: UseContext } | null> {
    const source = flags.effectSource;
    const ctx = flags.context ? await restoreContext(flags.context) : null;
    const automation = flags.automationKey
        ? ABILITY_AUTOMATION[flags.automationKey]
        : source && getAutomation(source.className, source.abilityName);
    if (!source || !ctx || !automation) return null;
    return { specs: resolve(automation.target, ctx) ?? [], ctx };
}

/** Apply one of the card's effects to a target, rolling Condition Resist for conditions unless skipped. */
async function applyTargetEffect(flags: CardFlags, target: Target, spec: EffectSpec, ctx: UseContext, skipResist: boolean): Promise<void> {
    const source = flags.effectSource!;
    const { actor } = target;
    // Distance-limited effects only land on targets in range of them (Glacial Crash: Frozen within 5 ft).
    if (spec.within !== undefined || spec.beyond !== undefined) {
        const distance = distanceFromCaster(flags, target);
        if (distance === null) {
            ui.notifications?.warn(`Can't measure the distance to ${actor.name}; skipping ${spec.name ?? "the effect"}.`);
            return;
        }
        if (spec.within !== undefined && distance > spec.within + 0.01) return;
        if (spec.beyond !== undefined && distance <= spec.beyond + 0.01) return;
    }
    const redirects = Math.min(...((target.tokenUuid && flags.segments?.[target.tokenUuid]) || [0]));
    const resolved = spec.resolve ? spec.resolve(actor, spec, ctx, { redirects }) : spec;
    if (!resolved) return;
    const data = buildEffectData(resolved, source);
    // Shift-click skips the Condition Resist roll, for when the GM rules it can't be resisted.
    const resistible = !skipResist && (resolved.resistible ?? resolved.category === "condition");
    await requestOnActor(actor, "effect", {
        data,
        options: { resistible, sourceName: flags.sourceName, resistPenalty: flags.crReduction, attackContext: attackContext(flags) },
    });
}

/** Apply an on-hit status from the attacker's buffs or gear (Accursed Blade's Curse, Serrated Arrow's Bleed). */
async function applyOnHitStatus(flags: CardFlags, target: Target, onHit: OnHitStatus, skipResist: boolean): Promise<void> {
    if (!targetMeets(flags, target, onHit.conditions)) return;
    const spec = (onHit.effect as EffectSpec | undefined) ?? statusSpec(onHit.id);
    const data = buildEffectData(spec, {
        className: "",
        abilityName: onHit.source,
        img: spec.img ?? "",
        duration: "Endless",
        casterUuid: flags.actorUuid,
    });
    await requestOnActor(target.actor, "effect", {
        data,
        options: {
            resistible: !skipResist,
            sourceName: `${flags.sourceName} (${onHit.source})`,
            resistPenalty: flags.crReduction,
            attackContext: attackContext(flags),
        },
    });
}

async function onCardButton(message: ChatMessage.Implementation, button: HTMLElement, event: MouseEvent) {
    if (button.dataset.cardAction === "undo") return requestUndo(message);
    const flags = message.getFlag(SYSTEM_ID as never, "card" as never) as unknown as CardFlags | undefined;
    if (!flags) return;
    const targets = resolveTargets(flags);
    const { sourceName } = flags;

    switch (button.dataset.cardAction) {
        case "damage":
        case "halfDamage":
        case "redirected":
        case "redirectToAttacker": {
            if (!flags.damage) return;
            const half = button.dataset.cardAction === "halfDamage";
            const action = button.dataset.cardAction;
            if (action === "redirectToAttacker") {
                // Glass Armor / Reflective Barrier: the attack goes back at whoever made it.
                const attacker = (await fromUuid(flags.actorUuid)) as Actor.Implementation | null;
                if (!attacker) return;
                const redirector = (game.user?.character as Actor.Implementation | null) ?? null;
                const { hasAlterCourse } = await import("../abilities/use.ts");
                const bonus = hasAlterCourse(redirector) ? 1.5 : 1;
                await requestOnActor(attacker, "damage", {
                    hits: applySwap(flags.damage.hits, flags, 1),
                    penetration: flags.damage.penetration,
                    sourceName: `${sourceName} (redirected back${bonus > 1 ? ", Alter Course +50%" : ""})`,
                    scale: bonus,
                    trueDamage: flags.damage.trueDamage,
                });
                return;
            }
            for (const target of targets) {
                await damageTarget(flags, target, { half, redirected: action === "redirected", skipEvasion: event.shiftKey });
            }
            break;
        }
        case "applyAll": {
            // Damage first, then (only for targets the attack actually hit) its conditions and on-hit statuses.
            const effects = await targetEffectSpecs(flags);
            for (const target of targets) {
                const landed = flags.damage ? await damageTarget(flags, target, { skipEvasion: event.shiftKey }) : true;
                if (!landed) continue;
                if (effects) for (const spec of effects.specs) await applyTargetEffect(flags, target, spec, effects.ctx, event.shiftKey);
                for (const onHit of flags.statuses ?? []) await applyOnHitStatus(flags, target, onHit, event.shiftKey);
            }
            break;
        }
        case "healing":
            for (const { actor } of targets) {
                await requestOnActor(actor, "healing", { amount: flags.healing ?? 0, sourceName });
            }
            break;
        case "effect": {
            const effects = await targetEffectSpecs(flags);
            const spec = effects?.specs[Number(button.dataset.index)];
            if (!effects || !spec) return;
            for (const target of targets) await applyTargetEffect(flags, target, spec, effects.ctx, event.shiftKey);
            break;
        }
        case "extra": {
            const data = flags.extraEffects?.[Number(button.dataset.index)];
            if (!data) return;
            for (const { actor } of targets) {
                await requestOnActor(actor, "effect", { data, options: { resistible: false, sourceName } });
            }
            break;
        }
        case "shielding":
            for (const { actor } of targets) {
                await requestOnActor(actor, "shielding", { amount: flags.shielding ?? 0, sourceName });
            }
            break;
        case "drain": {
            if (!flags.drain) return;
            const caster = (await fromUuid(flags.actorUuid)) as Actor.Implementation | null;
            for (const { actor } of targets) {
                await requestOnActor(actor, "resource", { resource: flags.drain.resource, delta: -flags.drain.amount, sourceName });
                if (caster) await requestOnActor(caster, "resource", { resource: flags.drain.resource, delta: flags.drain.amount, sourceName });
            }
            break;
        }
        case "status": {
            const onHit = flags.statuses?.[Number(button.dataset.index)];
            if (!onHit) return;
            for (const target of targets) await applyOnHitStatus(flags, target, onHit, event.shiftKey);
            break;
        }
    }
}

/** Only Mirror Mages (or the GM, if one is around) need the "redirect to attacker" button. */
function canRedirect(): boolean {
    const hasAlter = (a: Actor | null | undefined) => !!a?.items.some((i) => i.type === "passive" && i.name === "Alter Course");
    if (hasAlter(game.user?.character)) return true;
    return !!game.user?.isGM && !!game.actors?.some((a) => hasAlter(a));
}

export function registerChatListeners(): void {
    Hooks.on("renderChatMessageHTML", (message: ChatMessage.Implementation, html: HTMLElement) => {
        hideUndoIfNotAllowed(message, html);
        if (!canRedirect()) html.querySelector('[data-card-action="redirectToAttacker"]')?.remove();
        for (const button of html.querySelectorAll<HTMLElement>("[data-card-action]")) {
            button.addEventListener("click", (event) => {
                event.preventDefault();
                if (button.dataset.busy) return;
                button.dataset.busy = "true";
                void onCardButton(message, button, event).finally(() => delete button.dataset.busy);
            });
        }
    });
}
