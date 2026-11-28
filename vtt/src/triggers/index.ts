/**
 * Triggers: when something happens to (or because of) a creature, its effects can react. Each trigger on an effect is
 * "when <event>, if <conditions>, do <action>" (see TriggerData in data/effect.ts).
 *
 * Events, who "other" is, and what conditions see:
 *   hit       you hit a creature (once per landed hit)   other = the target      the attack's facts + target:*
 *   attack    you make an attack (once, when rolled)     other = none            the attack's facts + self:*
 *   attacked  an attack is applied to you               other = the attacker    defender view: attack:*, attacker:*
 *   hitBy     an attack lands on you (each landed hit)   other = the attacker    defender view
 *   block     one of your blocks is used on an attack     other = the attacker    defender view
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
import { actorData, actorOptions, defenderOptions, distanceBetween, effectAppliesToAttack } from "../rules/roll-options.ts";
import type { DamageKey } from "../rules/damage-math.ts";
import { esc } from "../chat/html.ts";

export const MAX_TRIGGER_DEPTH = 2;

export interface TriggerContext {
    /** The creature on the other side of the event (see the table above). */
    other?: Actor.Implementation | null;
    /** For attacker-side events: the facts conditions are tested against. Defaults to self:* and the other side. */
    options?: Set<string>;
    /** For defender-side events: the incoming attack, so conditions get the defender's view (attack:*, origin:attacker). */
    attack?: AttackContext;
    /**
     * For attacker-side events, the attack's roll options for deciding which item effects count: a weapon's
     * triggers only fire for its own attacks (effectAppliesToAttack). Defaults to `options`.
     */
    scope?: Iterable<string>;
    /** Extra formula data for values (`@hit.damage`). */
    data?: Record<string, unknown>;
    /** How many triggers deep this event already is. */
    depth?: number;
    /** What caused the event, for messages. */
    sourceName?: string;
}

/** Events about an attack the bearer made, where effects on a weapon only count for that weapon's attacks. */
const ATTACKER_EVENTS = new Set<TriggerEvent>(["hit", "attack", "kill"]);

/** What `other` is called in conditions and formulas for each event. */
const OTHER_ROLE: Partial<Record<TriggerEvent, "target" | "attacker">> = {
    hit: "target",
    kill: "target",
    attacked: "attacker",
    hitBy: "attacker",
    block: "attacker",
    damaged: "attacker",
};

/** Once-per-turn/round bookkeeping, by effect UUID and trigger index. Kept on this client; see the note above. */
export const lastFired = new Map<string, string>();

export function turnKey(per: "turn" | "round" | "once"): string {
    if (per === "once") return "once";
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
        if (ATTACKER_EVENTS.has(event) && !effectAppliesToAttack(effect, ctx.scope ?? ctx.options)) continue;
        const triggers = (effect.system as unknown as BarbsEffectModel).triggers ?? [];
        for (const [index, trigger] of triggers.entries()) {
            if (trigger.event !== event) continue;
            if (!testPredicate(parsePredicate(trigger.conditions), domainFor(bearer, effect, role, ctx))) continue;
            // "Once per turn" is spent when the trigger actually fires, not when it merely comes up: a failed chance
            // roll or skill check leaves it available for the next hit.
            const spent = trigger.oncePer ? `${effect.uuid}#${index}` : null;
            if (spent && lastFired.get(spent) === turnKey(trigger.oncePer as "turn" | "round" | "once")) continue;
            if (!(await passesChance(trigger))) continue;
            if (!(await passesCheck(bearer, effect, trigger))) continue;
            if (spent) lastFired.set(spent, turnKey(trigger.oncePer as "turn" | "round" | "once"));
            await runAction(bearer, effect, trigger, role, ctx);
            if (trigger.consume) await consumeEffect(effect);
        }
    }
}

/**
 * A trigger's skill-check gate ("Armor Mastery: Shields vs @level / 2"): the bearer rolls it, against a DC formula
 * over their own roll data, and the trigger only goes on if it succeeds.
 */
export async function passesCheck(bearer: Actor.Implementation, effect: ActiveEffect.Implementation, trigger: TriggerData): Promise<boolean> {
    const text = trigger.check?.trim();
    if (!text) return true;
    const [skill, dcFormula] = text.split(/\s+vs\.?\s+/i);
    const dc = Math.round(evaluateNumber(dcFormula ?? "0", { ...bearer.getRollData(), self: actorData(bearer) }));
    const roller = bearer as unknown as { skillCheck?: (name: string, o: { dc: number; flavor: string }) => Promise<boolean> };
    return (await roller.skillCheck?.(skill.trim(), { dc, flavor: effect.name ?? "" })) ?? false;
}

export async function passesChance(trigger: TriggerData): Promise<boolean> {
    if (!(trigger.chance > 0 && trigger.chance < 100)) return true;
    const roll = (await new Roll("1d100").evaluate()).total ?? 101;
    return roll <= trigger.chance;
}

/** Remove a one-shot effect after its trigger fires (on whichever client may). */
export async function consumeEffect(effect: ActiveEffect.Implementation): Promise<void> {
    if (effect.isOwner) await effect.delete();
    else {
        const { requestGM } = await import("../socket.ts");
        await requestGM("deleteEffect", effect.uuid);
    }
}

/** Add rounds to an effect's round-based duration. False when it has none (no duration, or one in hours). */
export async function extendEffect(effect: ActiveEffect.Implementation, rounds: number): Promise<boolean> {
    const duration = effect._source.duration as { value?: number | null; units?: string } | undefined;
    if (duration?.units !== "rounds" || duration.value == null) return false;
    await effect.update({ "duration.value": duration.value + rounds } as never);
    return true;
}

/** How "would take damage" triggers changed an incoming hit. */
export interface IncomingDamageResult {
    /** The damage the bearer actually takes now. */
    total: number;
    /** Per-type damage taken after the changes (for redirects and reflections, which keep the types). */
    taken: Partial<Record<DamageKey, number>>;
    notes: string[];
    /** Damage to send elsewhere, before or after defenses. */
    redirects: { actor: Actor.Implementation; hits: Partial<Record<DamageKey, number>>; sourceName: string }[];
    reflects: { actor: Actor.Implementation; hits: Partial<Record<DamageKey, number>>; sourceName: string }[];
    /** Effects used up by firing, removed with the damage (so its undo restores them). */
    consumed: ActiveEffect.Implementation[];
}

/**
 * "You would take damage" triggers: run after defenses and before health changes, and allowed to change the damage.
 * `incoming` is the damage before defenses (for redirects: the protector gets the attack, and their own defenses
 * apply), `taken` after. Runs where the damage is applied.
 */
export async function resolveIncomingDamage(
    target: Actor.Implementation,
    incoming: Partial<Record<DamageKey, number>>,
    taken: Partial<Record<DamageKey, number>>,
    ctx: TriggerContext,
): Promise<IncomingDamageResult> {
    const sum = (r: Partial<Record<DamageKey, number>>) => Object.values(r).reduce((a, b) => a + (b ?? 0), 0);
    const scaleBy = (r: Partial<Record<DamageKey, number>>, factor: number) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round((v ?? 0) * factor)])) as Partial<Record<DamageKey, number>>;
    const result: IncomingDamageResult = { total: sum(taken), taken: { ...taken }, notes: [], redirects: [], reflects: [], consumed: [] };
    if ((ctx.depth ?? 0) >= MAX_TRIGGER_DEPTH || result.total <= 0) return result;

    const health = (target.system as unknown as { derived?: { resources?: { health?: { value: number } } } }).derived?.resources?.health?.value ?? 0;
    const shielding = (target.system as unknown as { shielding?: { value: number } }).shielding?.value ?? 0;
    const lethal = () => result.total >= health + shielding;
    const role = "attacker";
    for (const effect of [...target.allApplicableEffects()] as ActiveEffect.Implementation[]) {
        if (!effect.active) continue;
        const triggers = (effect.system as unknown as BarbsEffectModel).triggers ?? [];
        for (const [index, trigger] of triggers.entries()) {
            if (trigger.event !== "wouldTakeDamage") continue;
            const domain = domainFor(target, effect, role, ctx);
            if (lethal()) domain.add("incoming:lethal");
            if (!testPredicate(parsePredicate(trigger.conditions), domain)) continue;
            if (trigger.oncePer) {
                const key = `${effect.uuid}#${index}`;
                const now = turnKey(trigger.oncePer);
                if (lastFired.get(key) === now) continue;
                lastFired.set(key, now);
            }
            if (!(await passesChance(trigger))) continue;
            if (!(await passesCheck(target, effect, trigger))) continue;
            const data = { ...formulaData(target, role, ctx), incoming: { damage: result.total } };
            const value = evaluateNumber(trigger.value, data);
            const label = effect.name;
            switch (trigger.action) {
                case "reduceDamage": {
                    const factor = Math.max(0, 1 - value / 100);
                    result.taken = scaleBy(result.taken, factor);
                    result.total = sum(result.taken);
                    result.notes.push(`${esc(label)}: damage reduced by ${value}%.`);
                    break;
                }
                case "survive": {
                    if (!lethal()) break;
                    const keep = Math.max(1, Math.round(value) || 1);
                    const allowed = Math.max(0, health + shielding - keep);
                    result.taken = scaleBy(result.taken, result.total ? allowed / result.total : 0);
                    result.total = allowed;
                    result.notes.push(`${esc(label)}: ${esc(target.name)} survives at ${keep} health.`);
                    break;
                }
                case "redirect": {
                    const originUuid = foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.casterUuid`) as string | undefined;
                    const origin = originUuid ? ((await fromUuid(originUuid)) as Actor.Implementation | null) : null;
                    if (!origin || origin.uuid === target.uuid) break;
                    result.redirects.push({ actor: origin, hits: scaleBy(incoming, value / 100), sourceName: `${ctx.sourceName ?? "Damage"} (redirected by ${label})` });
                    result.taken = {};
                    result.total = 0;
                    result.notes.push(`${esc(label)}: redirected to ${esc(origin.name)}.`);
                    break;
                }
                case "reflect": {
                    if (!ctx.other) break;
                    result.reflects.push({ actor: ctx.other, hits: scaleBy(result.taken, value / 100), sourceName: `${target.name}'s ${label}` });
                    result.notes.push(`${esc(label)}: ${value}% reflected at ${esc(ctx.other.name)}.`);
                    break;
                }
                default:
                    await runAction(target, effect, trigger, role, ctx);
            }
            if (trigger.consume) result.consumed.push(effect);
        }
    }
    return result;
}

/** The facts a trigger's conditions are tested against, by side. */
export function domainFor(bearer: Actor.Implementation, effect: ActiveEffect.Implementation, role: string | undefined, ctx: TriggerContext): Set<string> {
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
    // The Effect column names the template; if it's blank, accept the name typed into Value.
    const name = (trigger.effect || trigger.value || "").trim();
    const template = parent?.effects?.find((e) => e.name === name && !!(e.system as unknown as BarbsEffectModel).template);
    if (!template) {
        const where = (effect.parent as { name?: string })?.name ?? "this item";
        ui.notifications?.warn(
            name
                ? `${effect.name}: there's no template effect named "${name}" on ${where}. Make one (an effect with Template ticked) next to this one.`
                : `${effect.name}: pick the template effect to grant in the trigger's Effect column.`,
        );
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

/**
 * Do what a trigger row says. Returns false when the row couldn't be done and anything after it shouldn't happen
 * either (a "spend" the bearer can't afford); action buttons stop there.
 */
export async function runAction(
    bearer: Actor.Implementation,
    effect: ActiveEffect.Implementation,
    trigger: TriggerData,
    role: string | undefined,
    ctx: TriggerContext,
): Promise<boolean> {
    const { requestOnActor } = await import("../socket.ts");
    const sourceName = `${bearer.name}'s ${effect.name}`;
    const data = () => formulaData(bearer, role, ctx);
    switch (trigger.action) {
        case "restore": {
            const amount = Math.round(evaluateNumber(trigger.value, data()));
            if (!amount) return true;
            const resource = trigger.type || "health";
            if (resource === "health") await requestOnActor(bearer, "healing", { amount, sourceName });
            else await requestOnActor(bearer, "resource", { resource: resource as "stamina" | "mana", delta: amount, sourceName });
            return true;
        }
        case "grant":
        case "grantTarget":
        case "inflict": {
            // grantTarget: a block or buff for whoever you're targeting, yourself when no one is (Ice Block, Grand
            // Guardian: "block an attack on yourself or an ally").
            const recipient = trigger.action === "grant" ? bearer : trigger.action === "grantTarget" ? (ctx.other ?? bearer) : ctx.other;
            if (!recipient) return true;
            const effectData = grantedEffectData(effect, trigger, bearer);
            if (!effectData) return true;
            const isCondition = foundry.utils.getProperty(effectData, "system.category") === "condition";
            await requestOnActor(recipient, "effect", {
                data: effectData,
                options: { resistible: trigger.action === "inflict" && isCondition, sourceName },
            });
            return true;
        }
        case "damage": {
            if (!ctx.other) return true;
            const amount = Math.round(evaluateNumber(trigger.value, data()));
            if (amount <= 0) return true;
            const type = (trigger.type || "physical") as DamageKey;
            await requestOnActor(ctx.other, "damage", {
                hits: [{ [type]: amount }],
                penetration: {},
                sourceName,
                attack: false,
                triggerDepth: (ctx.depth ?? 0) + 1,
                attackerUuid: bearer.uuid ?? undefined,
            });
            return true;
        }
        case "note": {
            const text = String(trigger.value || effect.name);
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: bearer as Actor.Stored }),
                content: `<div class="barbs-chat-card"><p><strong>${esc(effect.name)}</strong>: ${esc(text)}</p></div>`,
            } as never);
            return true;
        }
        case "spend": {
            const resource = (trigger.type || "stamina") as "stamina" | "mana" | "health";
            const amount = Math.round(evaluateNumber(trigger.value, data()));
            if (amount <= 0) return true;
            const have = (bearer.system as unknown as { derived: { resources: Record<string, { value: number }> } }).derived.resources[resource]?.value ?? 0;
            if (have < amount) {
                ui.notifications?.warn(`${bearer.name} needs ${amount} ${resource} for ${effect.name} (has ${have}).`);
                return false;
            }
            if (resource === "health") await requestOnActor(bearer, "damage", { hits: [{ physical: amount }], penetration: {}, sourceName, attack: false, trueDamage: true });
            else await requestOnActor(bearer, "resource", { resource, delta: -amount, sourceName });
            return true;
        }
        case "extend": {
            // Rounds onto round-based durations. An effect held by concentration extends everything that concentration
            // holds (Hold Person: "the duration is extended for an additional round" means the Stun on the target),
            // which can be on creatures the bearer doesn't own, so that goes through the GM.
            const rounds = Math.round(evaluateNumber(trigger.value, data()));
            if (!rounds) return true;
            const key = foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.concentrationKey`) as string | undefined;
            const { requestGM } = await import("../socket.ts");
            if (key) await requestGM("extendConcentration", { key, rounds });
            else if (!(await extendEffect(effect, rounds))) ui.notifications?.info(`${effect.name} has no round-based duration to extend.`);
            return true;
        }
        case "addStack": {
            // A counter on this effect (Analytical Shooter's "Keep aiming"), which its own bonuses read as @effect.stacks.
            const { stacksOf } = await import("../data/effect.ts");
            const current = stacksOf(effect);
            const max = trigger.type ? Math.round(evaluateNumber(trigger.type, data())) : Infinity;
            const next = Math.min(max, current + (Math.round(evaluateNumber(trigger.value || "1", data())) || 1));
            if (next === current) {
                ui.notifications?.info(`${effect.name} is already at ${current} stack(s), the most it can have.`);
                return false;
            }
            if (effect.isOwner) await effect.update({ [`flags.${SYSTEM_ID}.stacks`]: next } as never);
            else ui.notifications?.warn(`You can't change ${effect.name}.`);
            return true;
        }
        case "endConcentration": {
            // Deleting the Concentrating marker ends everything it maintained (concentration.ts), this effect included.
            const key = foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.concentrationKey`) as string | undefined;
            const { concentrationMarkers } = await import("../concentration.ts");
            const marker = key ? concentrationMarkers(bearer).find((m) => foundry.utils.getProperty(m, `flags.${SYSTEM_ID}.concentration.key`) === key) : undefined;
            if (marker) await consumeEffect(marker);
            return true;
        }
    }
    return true;
}
