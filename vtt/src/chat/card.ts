/**
 * The chat card for abilities and weapon attacks, and the buttons on it.
 *
 * Cards carry everything the buttons need in flags, so applying damage or effects works from any client, any time
 * after the roll, without re-rolling or needing the caster's sheet open.
 */
import { SYSTEM_ID } from "../config.ts";
import { ABILITY_AUTOMATION, getAutomation } from "../abilities/catalog.ts";
import { resolve, restoreContext, type ContextData } from "../abilities/context.ts";
import { buildEffectData, type EffectSource } from "../abilities/effects.ts";
import { status as statusSpec } from "../abilities/helpers.ts";
import type { EffectSpec } from "../abilities/types.ts";
import type { CreatureModel } from "../data/actor/creature.ts";
import { evaluateDistanceBonus, type AttackResult, type DistanceBonus, type OnHitStatus } from "../rolls/attack.ts";
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
        /** Blocks don't apply (Unblockable Chance succeeded, or "cannot be blocked"). */
        unblockable?: boolean;
        /** Heal the attacker for this percent of the damage dealt to each target. */
        lifesteal?: number;
        /** Reduces targets' Evasion for the Evade button, percent. */
        accuracy?: number;
        /** Per-hit damage that depends on each target's distance (Distance Shooter), parallel to `hits`. */
        bonus?: DistanceBonus[][];
        /** Distance tiers: each target takes the first tier whose distance from the caster covers it. */
        tiers?: { within: number; hits: Partial<Record<DamageKey, number>>[]; bonus?: DistanceBonus[][] }[];
    };
    /** The caster's token, for measuring distances to targets. */
    casterTokenUuid?: string;
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
        accuracy: flags.damage?.accuracy ?? 0,
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
                const perTarget = (target.tokenUuid && flags.targetScales?.[target.tokenUuid]) || 1;
                let hits = flags.damage.hits;
                let bonus = flags.damage.bonus;
                if (flags.damage.tiers?.length) {
                    const tier = tierFor(flags, target);
                    if (tier < 0) {
                        ui.notifications?.info(`${target.actor.name} is outside every distance tier; no damage.`);
                        continue;
                    }
                    hits = flags.damage.tiers[tier].hits;
                    bonus = flags.damage.tiers[tier].bonus;
                }
                // Distance-based damage is measured for this target and added to each hit before defenses.
                if (bonus?.some((b) => b.length)) {
                    const distance = distanceFromCaster(flags, target);
                    if (distance === null) ui.notifications?.warn(`Can't measure the distance to ${target.actor.name}; no distance bonus.`);
                    hits = hits.map((hit, i) => {
                        const out = { ...hit };
                        for (const b of bonus![i] ?? []) out[b.type] = (out[b.type] ?? 0) + (distance === null ? 0 : evaluateDistanceBonus(b, distance));
                        return out;
                    });
                }
                // A reflected beam hits once per segment the target was on; "Apply as redirected" is one bounce.
                const redirectList =
                    action === "redirected" ? [1] : (target.tokenUuid && flags.segments?.[target.tokenUuid]) || [0];
                for (const redirects of redirectList) {
                    const alter = flags.alterCourse ? 1 + 0.5 * redirects : 1;
                    await requestOnActor(target.actor, "damage", {
                        hits: applySwap(hits, flags, redirects),
                        penetration: flags.damage.penetration,
                        sourceName: redirects ? `${sourceName} (redirect ${redirects}${flags.alterCourse ? `, +${50 * redirects}%` : ""})` : sourceName,
                        scale: (half ? 0.5 : perTarget) * alter,
                        trueDamage: flags.damage.trueDamage,
                        unblockable: flags.damage.unblockable,
                        lifesteal: flags.damage.lifesteal ? { percent: flags.damage.lifesteal, attackerUuid: flags.actorUuid } : undefined,
                    });
                }
            }
            break;
        }
        case "healing":
            for (const { actor } of targets) {
                await requestOnActor(actor, "healing", { amount: flags.healing ?? 0, sourceName });
            }
            break;
        case "effect": {
            const source = flags.effectSource;
            const ctx = flags.context ? await restoreContext(flags.context) : null;
            const automation = flags.automationKey
                ? ABILITY_AUTOMATION[flags.automationKey]
                : source && getAutomation(source.className, source.abilityName);
            const spec = ctx && automation ? resolve(automation.target, ctx)?.[Number(button.dataset.index)] : null;
            if (!source || !spec || !ctx) return;
            for (const target of targets) {
                const { actor } = target;
                // Distance-limited effects only land on targets in range of them (Glacial Crash: Frozen within 5 ft).
                if (spec.within !== undefined || spec.beyond !== undefined) {
                    const distance = distanceFromCaster(flags, target);
                    if (distance === null) {
                        ui.notifications?.warn(`Can't measure the distance to ${actor.name}; skipping ${spec.name ?? "the effect"}.`);
                        continue;
                    }
                    if (spec.within !== undefined && distance > spec.within + 0.01) continue;
                    if (spec.beyond !== undefined && distance <= spec.beyond + 0.01) continue;
                }
                const redirects = Math.min(...((target.tokenUuid && flags.segments?.[target.tokenUuid]) || [0]));
                const resolved = spec.resolve ? spec.resolve(actor, spec, ctx, { redirects }) : spec;
                if (!resolved) continue;
                const data = buildEffectData(resolved, source);
                // Shift-click skips the Condition Resist roll, for when the GM rules it can't be resisted.
                const resistible = !event.shiftKey && (resolved.resistible ?? resolved.category === "condition");
                await requestOnActor(actor, "effect", { data, options: { resistible, sourceName } });
            }
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
        case "evade": {
            // Each target dodges with their Evasion minus the attack's Accuracy.
            const accuracy = flags.damage?.accuracy ?? 0;
            for (const { actor } of targets) {
                const evasion = (actor.system as unknown as CreatureModel).derived.stats.evasion.value;
                const chance = Math.max(0, evasion - accuracy);
                const roll = await new Roll("1d100").evaluate();
                const dodged = (roll.total ?? 101) <= chance;
                await roll.toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
                    flavor: `Evasion vs ${sourceName}: ${chance}%${accuracy ? ` (${evasion}% − ${accuracy}% accuracy)` : ""} — ${dodged ? "<strong>dodged</strong>" : "hit"}`,
                });
            }
            break;
        }
        case "status": {
            const onHit = flags.statuses?.[Number(button.dataset.index)];
            if (!onHit) return;
            const spec = (onHit.effect as EffectSpec | undefined) ?? statusSpec(onHit.id);
            const data = buildEffectData(spec, {
                className: "",
                abilityName: onHit.source,
                img: spec.img ?? "",
                duration: "Endless",
                casterUuid: flags.actorUuid,
            });
            for (const { actor } of targets) {
                await requestOnActor(actor, "effect", {
                    data,
                    options: { resistible: !event.shiftKey, sourceName: `${sourceName} (${onHit.source})` },
                });
            }
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
