/**
 * Triggers: when something happens to (or because of) a creature, its effects can react. Each trigger on an effect is
 * "when <event>, if <conditions>, do <action>" (see TriggerData in data/effect.ts).
 *
 * Events, who "other" is, and what conditions see:
 *   hit       you hit a creature (once per landed hit)   other = the target      the attack's facts + target:*
 *   attack    you make an attack (once, when rolled)     other = none            the attack's facts + self:*
 *   attacked  an attack is applied to you               other = the attacker    defender view: attack:*, attacker:*
 *   hitBy     an attack lands on you (each landed hit)   other = the attacker    defender view
 *   damaged   you take damage (after defenses)           other = the attacker    defender view, if it was an attack
 *   kill      you down a creature                        other = the downed one  self:* + target:*
 *   turnStart/turnEnd, combatStart/combatEnd            other = none            self:*
 *
 * Where they run: hit/attack/attacked/hitBy on the client of whoever clicked Apply (or rolled), the rest where damage
 * is applied or on the GM's client for combat events, so each event fires once. Actions relay through the socket like
 * every other change, and each posts its own undoable message.
 *
 * Damage from a trigger isn't an attack (no Evasion, blocks, or on-hit triggers), and chains stop after
 * MAX_DEPTH levels, so two retaliating auras can't bounce off each other forever.
 */
import { SYSTEM_ID, type TriggerEvent } from "../config.ts";
import type { BarbsEffectModel, TriggerData } from "../data/effect.ts";
import type { AttackContext } from "../effects/incoming.ts";
import { evaluateNumber } from "../rules/formula.ts";
import { parsePredicate, testPredicate } from "../rules/predicate.ts";
import { actorData, actorOptions, defenderOptions, distanceBetween } from "../rules/roll-options.ts";
import type { DamageKey } from "../rules/damage-math.ts";

export const MAX_TRIGGER_DEPTH = 2;

export interface TriggerContext {
    /** The creature on the other side of the event (see the table above). */
    other?: Actor.Implementation | null;
    /** For attacker-side events: the facts conditions are tested against. Defaults to self:* and the other side. */
    options?: Set<string>;
    /** For defender-side events: the incoming attack, so conditions get the defender's view (attack:*, origin:attacker). */
    attack?: AttackContext;
    /** Extra formula data for values (`@hit.damage`). */
    data?: Record<string, unknown>;
    /** How many triggers deep this event already is. */
    depth?: number;
    /** What caused the event, for messages. */
    sourceName?: string;
}

/** What `other` is called in conditions and formulas for each event. */
const OTHER_ROLE: Partial<Record<TriggerEvent, "target" | "attacker">> = {
    hit: "target",
    kill: "target",
    attacked: "attacker",
    hitBy: "attacker",
    damaged: "attacker",
};

/** Once-per-turn/round bookkeeping, by effect UUID and trigger index. Kept on this client; see the note above. */
const lastFired = new Map<string, string>();

function turnKey(per: "turn" | "round"): string {
    const combat = game.combat;
    if (!combat?.started) return "no-combat";
    return per === "round" ? `${combat.id}:${combat.round}` : `${combat.id}:${combat.round}:${combat.turn}`;
}

/** Fire `event` for every active effect on `bearer` with a matching trigger. */
export async function fireTriggers(bearer: Actor.Implementation | null | undefined, event: TriggerEvent, ctx: TriggerContext = {}): Promise<void> {
    if (!bearer || (ctx.depth ?? 0) >= MAX_TRIGGER_DEPTH) return;
    const role = OTHER_ROLE[event];
    for (const effect of [...bearer.allApplicableEffects()] as ActiveEffect.Implementation[]) {
        if (!effect.active) continue;
        const triggers = (effect.system as unknown as BarbsEffectModel).triggers ?? [];
        for (const [index, trigger] of triggers.entries()) {
            if (trigger.event !== event) continue;
            if (!testPredicate(parsePredicate(trigger.conditions), domainFor(bearer, effect, role, ctx))) continue;
            if (trigger.oncePer) {
                const key = `${effect.uuid}#${index}`;
                const now = turnKey(trigger.oncePer);
                if (lastFired.get(key) === now) continue;
                lastFired.set(key, now);
            }
            if (trigger.chance > 0 && trigger.chance < 100) {
                const roll = (await new Roll("1d100").evaluate()).total ?? 101;
                if (roll > trigger.chance) continue;
            }
            await runAction(bearer, effect, trigger, role, ctx);
        }
    }
}

/** The facts a trigger's conditions are tested against, by side. */
function domainFor(bearer: Actor.Implementation, effect: ActiveEffect.Implementation, role: string | undefined, ctx: TriggerContext): Set<string> {
    if (ctx.attack && role === "attacker") {
        const origin = foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.casterUuid`) as string | undefined;
        const attackOptions = ctx.attack.options.filter((o) => !o.startsWith("self:") && o !== "in-combat");
        return defenderOptions(bearer, ctx.other ?? null, attackOptions, origin);
    }
    if (ctx.options) return ctx.options;
    const out = actorOptions(bearer, "self");
    if (ctx.other && role) {
        out.push(...actorOptions(ctx.other, role, bearer.uuid ?? undefined));
        const distance = distanceBetween(bearer, ctx.other);
        if (distance !== null) out.push(`${role}:distance:${distance}`);
    }
    return new Set(out);
}

/** Formula data for a trigger's value: the bearer's roll data, @self, and the other side as @other plus its role. */
function formulaData(bearer: Actor.Implementation, role: string | undefined, ctx: TriggerContext): Record<string, unknown> {
    const other = ctx.other ? actorData(ctx.other, bearer.uuid ?? undefined) : undefined;
    return {
        ...bearer.getRollData(),
        self: actorData(bearer),
        ...(other ? { other, ...(role ? { [role]: other } : {}) } : {}),
        ...(ctx.data ?? {}),
    };
}

/** Effect data a grant/inflict copies: inline from ability automation, or a template effect next to the trigger. */
function grantedEffectData(effect: ActiveEffect.Implementation, trigger: TriggerData, bearer: Actor.Implementation): Record<string, unknown> | null {
    if (trigger.effectData) {
        const data = foundry.utils.deepClone(trigger.effectData) as Record<string, unknown>;
        foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.casterUuid`, bearer.uuid);
        return data;
    }
    const parent = effect.parent as {
        effects?: { find(fn: (e: ActiveEffect.Implementation) => boolean): ActiveEffect.Implementation | undefined };
    } | null;
    const template = parent?.effects?.find(
        (e) => e.name === trigger.effect && !!(e.system as unknown as BarbsEffectModel).template,
    );
    if (!template) {
        ui.notifications?.warn(`${effect.name}: no template effect named "${trigger.effect}" on ${(effect.parent as { name?: string })?.name}.`);
        return null;
    }
    const data = template.toObject() as Record<string, unknown>;
    delete data._id;
    delete data.start;
    data.transfer = false;
    data.origin = template.uuid;
    foundry.utils.setProperty(data, "system.template", false);
    // Copies of the same template stack (or replace each other) as one effect.
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.sourceKey`, template.uuid);
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.casterUuid`, bearer.uuid);
    return data;
}

async function runAction(
    bearer: Actor.Implementation,
    effect: ActiveEffect.Implementation,
    trigger: TriggerData,
    role: string | undefined,
    ctx: TriggerContext,
): Promise<void> {
    const { requestOnActor } = await import("../socket.ts");
    const sourceName = `${bearer.name}'s ${effect.name}`;
    const data = () => formulaData(bearer, role, ctx);
    switch (trigger.action) {
        case "restore": {
            const amount = Math.round(evaluateNumber(trigger.value, data()));
            if (!amount) return;
            const resource = trigger.type || "health";
            if (resource === "health") await requestOnActor(bearer, "healing", { amount, sourceName });
            else await requestOnActor(bearer, "resource", { resource: resource as "stamina" | "mana", delta: amount, sourceName });
            return;
        }
        case "grant":
        case "inflict": {
            const recipient = trigger.action === "grant" ? bearer : ctx.other;
            if (!recipient) return;
            const effectData = grantedEffectData(effect, trigger, bearer);
            if (!effectData) return;
            const isCondition = foundry.utils.getProperty(effectData, "system.category") === "condition";
            await requestOnActor(recipient, "effect", {
                data: effectData,
                options: { resistible: trigger.action === "inflict" && isCondition, sourceName },
            });
            return;
        }
        case "damage": {
            if (!ctx.other) return;
            const amount = Math.round(evaluateNumber(trigger.value, data()));
            if (amount <= 0) return;
            const type = (trigger.type || "physical") as DamageKey;
            await requestOnActor(ctx.other, "damage", {
                hits: [{ [type]: amount }],
                penetration: {},
                sourceName,
                triggerDepth: (ctx.depth ?? 0) + 1,
                attackerUuid: bearer.uuid ?? undefined,
            });
            return;
        }
        case "note": {
            const text = String(trigger.value || effect.name);
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: bearer as Actor.Stored }),
                content: `<div class="barbs-chat-card"><p><strong>${effect.name}</strong>: ${text}</p></div>`,
            } as never);
            return;
        }
    }
}
