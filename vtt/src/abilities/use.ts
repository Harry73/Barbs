/**
 * Using abilities and weapons. Runs entirely on the user's client:
 *   1. ask the ability's questions (plus any its caster's passives add)
 *   2. place its area and target what's inside, if it has one
 *   3. pay the cost (creature resources or passive resources like Ki)
 *   4. apply effects to the caster
 *   5. roll damage or healing, with effects and passives folded in
 *   6. let passives react (bank Healing Mana, empower the Ritual Dagger)
 *   7. post a card whose buttons apply the results to targets
 * Cancelling the dialog or the area placement cancels the whole use, before anything is paid.
 */
import { CROWD_CONTROL } from "./helpers.ts";
import type { CreatureModel } from "../data/actor/creature.ts";
import type { AbilityModel, EquipmentModel } from "../data/item/models.ts";
import { applyEffectToActor, applyHealingToActor, applyShieldingToActor } from "../effects/apply.ts";
import { AttackBuilder, mainWeapon, type AttackResult } from "../rolls/attack.ts";
import { postCard, type CardContent } from "../chat/card.ts";
import type { UndoRecord } from "../chat/undo.ts";
import { activePassives, adjustResource } from "../passives/index.ts";
import type { PassiveDelta, RollInfo } from "../passives/types.ts";
import { affected, placeArea, type AreaResult } from "./area.ts";
import { getAutomation } from "./catalog.ts";
import { askChoices, bindChoices, defaultChoices } from "./choices.ts";
import { contextData, makeContext, resolve, type UseContext } from "./context.ts";
import { buildEffectData, type EffectSource } from "./effects.ts";
import type { AbilityAutomation, AttackSpec, Cost, CostResource, EffectSpec } from "./types.ts";

const CREATURE_RESOURCES = ["health", "stamina", "mana"];

/* -------------------------------------------- */
/*  Costs                                       */
/* -------------------------------------------- */

interface Paid {
    label: string;
    deltas: Partial<Record<CostResource, number>>;
    passiveDeltas: PassiveDelta[];
    mana: number;
}

/** Pay costs in creature resources and/or passive resources (Ki). All or nothing. */
async function payCosts(actor: Actor.Implementation, costs: Cost[], what: string): Promise<Paid | false> {
    costs = costs.filter((c) => c.amount > 0);
    const totals = new Map<string, number>();
    for (const c of costs) totals.set(c.resource, (totals.get(c.resource) ?? 0) + c.amount);

    const resources = (actor.system as unknown as CreatureModel).derived.resources;
    const { resourceValue } = await import("../passives/index.ts");
    for (const [resource, amount] of totals) {
        const have = CREATURE_RESOURCES.includes(resource) ? resources[resource as CostResource].value : resourceValue(actor, resource);
        if (have < amount) {
            ui.notifications?.warn(`${actor.name} doesn't have ${amount} ${resource} for ${what} (has ${have}).`);
            return false;
        }
    }

    const update: Record<string, { value: number }> = {};
    const paid: Paid = { label: "", deltas: {}, passiveDeltas: [], mana: totals.get("mana") ?? 0 };
    for (const [resource, amount] of totals) {
        if (CREATURE_RESOURCES.includes(resource)) {
            update[resource] = { value: resources[resource as CostResource].value - amount };
            paid.deltas[resource as CostResource] = -amount;
        } else {
            const delta = await adjustResource(actor, resource, -amount);
            if (delta) paid.passiveDeltas.push(delta);
        }
    }
    if (Object.keys(update).length) await actor.update({ system: { resources: update } } as never);
    paid.label = [...totals].map(([r, a]) => `${a} ${r}`).join(" + ");
    return paid;
}

/* -------------------------------------------- */
/*  Attacks                                     */
/* -------------------------------------------- */

/** Set up an attack's builder (base damage, scaling, ability options, effect modifiers) without rolling yet. */
function prepareAttack(
    actor: Actor.Implementation,
    spec: AttackSpec,
    ctx: UseContext,
    damage = spec.damage,
    { skipSingleUse = false }: { skipSingleUse?: boolean } = {},
): AttackBuilder {
    const { rollType, scaling = rollType === "magic" ? "magic" : "weapon" } = spec;
    const weapon = scaling === "weapon" ? mainWeapon(actor) : null;
    const builder = new AttackBuilder(actor, { rollType, weapon });
    if (spec.includeWeapon) {
        if (!builder.addWeapon()) builder.addNote("No weapon equipped, so the weapon's own damage wasn't rolled.");
    }
    for (const part of damage) builder.addDamage(part.formula, part.type);
    if (scaling === "magic" && damage.length) builder.addStat("magicDamage", damage[0].type);
    if (scaling === "weapon" && !spec.includeWeapon) {
        if (weapon) builder.addWeaponScaling();
        else builder.addNote("No weapon equipped, so no weapon scaling was added.");
    }
    if (spec.increase) builder.addMultiplier("all", ctx.item?.name ?? "Ability", spec.increase);
    if (spec.canCrit) builder.enableCrit();
    if (spec.critChance) builder.addCritChance(spec.critChance);
    if (spec.critDamage) builder.addCritDamage(spec.critDamage);
    if (spec.maximize) builder.maximize();
    builder.ignoreDefenses({ ac: spec.ignoreAC, mr: spec.ignoreMR });
    if (skipSingleUse) builder.skipSingleUse();
    return builder.applyEffects();
}

/** A tier of a distance-tiered attack, rolled separately. */
export interface TierResult {
    within: number;
    result: AttackResult;
}

type PassiveRollInfo = Omit<RollInfo, "actor" | "rollType" | "weapon" | "damageTypes">;

/**
 * Roll an attack. Tiered attacks roll each tier; every tier's builder collects effect modifiers before any of them
 * rolls, so a single-use buff applies to all tiers and is consumed once.
 */
async function rollAttack(
    actor: Actor.Implementation,
    spec: AttackSpec,
    ctx: UseContext,
    info: PassiveRollInfo,
    combo: boolean,
): Promise<{ result: AttackResult; tiers: TierResult[] }> {
    const finish = (builder: AttackBuilder) => {
        builder.applyPassives(info);
        if (combo) builder.enableCombo(spec.combo ?? 0);
        return builder;
    };
    if (!spec.tiers?.length) {
        return { result: await finish(prepareAttack(actor, spec, ctx)).evaluate({ hits: spec.hits }), tiers: [] };
    }
    const builders = spec.tiers.map((tier) => ({ within: tier.within, builder: finish(prepareAttack(actor, spec, ctx, tier.damage)) }));
    const tiers: TierResult[] = [];
    for (const { within, builder } of builders) tiers.push({ within, result: await builder.evaluate({ hits: spec.hits }) });
    // The "main" result carries everything for undo, summaries, and dice animations.
    const merged: AttackResult = {
        ...tiers[0].result,
        hits: tiers.flatMap((t) => t.result.hits),
        parts: tiers.flatMap((t) => t.result.parts),
        rolls: tiers.flatMap((t) => t.result.rolls),
        consumed: [...new Set(tiers.flatMap((t) => t.result.consumed))],
        consumedEffects: tiers.flatMap((t) => t.result.consumedEffects),
        passiveDeltas: tiers.flatMap((t) => t.result.passiveDeltas),
        notes: [...new Set(tiers.flatMap((t) => t.result.notes))],
    };
    return { result: merged, tiers };
}

/* -------------------------------------------- */
/*  Running an automation                       */
/* -------------------------------------------- */

export interface RunOptions {
    actor: Actor.Implementation;
    automation: AbilityAutomation | null;
    title: string;
    img: string;
    /** The ability item, when there is one (passive actions and summon attacks have none). */
    item?: Item.Implementation | null;
    subtitle?: string;
    meta?: CardContent["meta"];
    description?: string;
    /** Rulebook cost when the automation doesn't override it. */
    defaultCost?: Cost | null;
    /** Rulebook duration for effects that don't set one. */
    duration?: string;
    className?: string;
    tags?: string[];
    /** Catalog key, so effect buttons can find the automation again ("Class/Ability" by default). */
    automationKey?: string;
}

export async function runAutomation(opts: RunOptions): Promise<void> {
    const { actor, automation, item = null } = opts;
    const tags = (opts.tags ?? []).map((t) => t.toLowerCase());
    const className = opts.className ?? "";
    const passives = activePassives(actor);

    // 1. Choices (the ability's, then any its caster's passives add), and up-front random rolls
    const passiveChoices = passives.flatMap((p) => p.automation.abilityChoices?.({ actor, tags, abilityName: opts.title, className }, p.handle) ?? []);
    const allChoices = [...(automation?.choices ?? []), ...passiveChoices];
    const choiceSpecs = bindChoices(actor, allChoices);
    const asked = await askChoices(opts.title, choiceSpecs);
    if (asked === null) return;
    // Questions bindChoices dropped (dual-shield options when you aren't holding two) answer with their defaults.
    const choices = { ...defaultChoices(allChoices), ...asked };
    const rolls: Record<string, number> = {};
    const rollNotes: string[] = [];
    for (const [key, formula] of Object.entries(automation?.rolls ?? {})) {
        const roll = await new Roll(formula).evaluate();
        rolls[key] = roll.total ?? 0;
        rollNotes.push(`Rolled ${key}: ${formula} = ${roll.total}`);
    }
    const ctx = makeContext(actor, item, choices, undefined, { rolls });

    // 2. Area. Remember who was targeted beforehand: an aimed line (Ice Spear) treats them as the main target.
    const preTargets = new Set([...(game.user?.targets ?? [])].map((t) => t.document.uuid));
    const area = resolve(automation?.area, ctx);
    let areaResult: AreaResult | null = null;
    if (area) {
        areaResult = await placeArea(actor, area, { reflect: tags.includes("spell") });
        if (!areaResult) return;
    }
    ctx.targets = [...(game.user?.targets ?? [])].map((t) => t.actor).filter((a): a is Actor.Implementation => !!a);

    // 3. Cost
    const override = resolve(automation?.cost, ctx);
    let costs: Cost[] =
        override !== undefined ? (override === null ? [] : Array.isArray(override) ? override : [override]) : opts.defaultCost ? [opts.defaultCost] : [];
    for (const p of passives) if (p.automation.adjustCost) costs = p.automation.adjustCost(costs, choices);
    const paid = await payCosts(actor, costs, opts.title);
    if (paid === false) return;

    // Resource-bound choices ("Spotting stacks to expend") are spent now that the use is going ahead.
    for (const spec of choiceSpecs) {
        if (!spec.resource) continue;
        const amount = spec.type === "number" ? Number(choices[spec.key]) || 0 : choices[spec.key] ? (spec.amount ?? 1) : 0;
        const delta = amount ? await adjustResource(actor, spec.resource, -amount) : null;
        if (delta) paid.passiveDeltas.push(delta);
    }

    const source: EffectSource = {
        className,
        abilityName: opts.title,
        img: opts.img,
        duration: opts.duration ?? "Instant",
        itemUuid: item?.uuid ?? undefined,
        casterUuid: actor.uuid ?? undefined,
        effectiveness: ctx.effectiveness,
    };

    // Everything this use changes on the caster, so the card's undo button can put it back.
    const undo: UndoRecord = {
        actorUuid: actor.uuid ?? "",
        resourceDeltas: { ...paid.deltas },
        passiveDeltas: [...paid.passiveDeltas],
        createdEffects: [],
        removedEffects: [],
    };

    // 4. Self effects go on immediately; the caster always owns themselves.
    const selfEffects: string[] = [];
    for (const spec of resolve(automation?.self, ctx) ?? []) {
        const resolved = spec.resolve ? spec.resolve(actor, spec, ctx) : spec;
        if (!resolved) continue;
        const applied = await applyEffectToActor(actor, buildEffectData(resolved, source), { announce: false });
        if (applied) {
            undo.createdEffects!.push(applied.effect.uuid ?? "");
            undo.removedEffects!.push(...applied.replaced);
        }
        selfEffects.push(String(resolved.name ?? opts.title));
    }

    // 5. Roll
    const targetSpecs = resolve(automation?.target, ctx) ?? [];
    const rollInfo: PassiveRollInfo = {
        targets: ctx.targets,
        tags,
        abilityName: opts.title,
        className,
        choices,
        inflictsCC: targetSpecs.some((s) => s.statuses?.some((id) => CROWD_CONTROL.includes(id))),
    };
    let result: AttackResult | null = null;
    let tiers: TierResult[] = [];
    const attack = resolve(automation?.attack, ctx);
    const heal = resolve(automation?.heal, ctx);
    if (attack) {
        ({ result, tiers } = await rollAttack(actor, attack, ctx, rollInfo, tags.includes("combo")));
    } else if (heal) {
        const builder = new AttackBuilder(actor, { rollType: "healing" });
        builder.addDamage(heal.formula, "healing");
        result = await builder.applyEffects().applyPassives(rollInfo).evaluate();
    }
    if (result) {
        undo.removedEffects!.push(...result.consumedEffects);
        undo.passiveDeltas!.push(...result.passiveDeltas);
        ctx.result = {
            total: Object.values(result.totals).reduce((a, b) => a + (b ?? 0), 0),
            dice: result.parts.flatMap((p) =>
                p.roll.dice.flatMap((d) => d.results.filter((r) => r.active).map((r) => ({ faces: d.faces ?? 0, result: r.result }))),
            ),
            rolled: result.parts.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.type]: (acc[p.type] ?? 0) + p.base }), {}),
        };
    }

    // Healing the caster, lifesteal, shielding, and resource recovery happen right away (each with its own undo).
    const selfNotes: string[] = [];
    if (heal?.self && result) await applyHealingToActor(actor, result.totals.healing ?? 0, opts.title);
    if (attack?.lifesteal && ctx.result) {
        await applyHealingToActor(actor, Math.round((ctx.result.total * attack.lifesteal) / 100), `${opts.title} (lifesteal)`);
    }
    if (automation?.healFrom && result?.totals[automation.healFrom]) {
        await applyHealingToActor(actor, result.totals[automation.healFrom] ?? 0, opts.title);
    }
    for (const { resource, formula } of resolve(automation?.gain, ctx) ?? []) {
        const roll = await new Roll(formula, actor.getRollData()).evaluate();
        const delta = await adjustResource(actor, resource, roll.total ?? 0);
        if (delta) undo.passiveDeltas!.push(delta);
        selfNotes.push(`Gained ${delta?.delta ?? 0} ${resource} (${roll.formula} = ${roll.total}).`);
    }
    const shielding = resolve(automation?.shielding, ctx);
    if (shielding?.self) await applyShieldingToActor(actor, shielding.amount, opts.title);
    for (const { resource, formula } of resolve(automation?.restore, ctx) ?? []) {
        const roll = await new Roll(formula, actor.getRollData()).evaluate();
        const { value, max } = (actor.system as unknown as CreatureModel).derived.resources[resource];
        const gained = Math.min(max - value, roll.total ?? 0);
        await actor.update({ system: { resources: { [resource]: { value: value + gained } } } } as never);
        undo.resourceDeltas![resource] = (undo.resourceDeltas![resource] ?? 0) + gained;
        selfNotes.push(`Recovered ${gained} ${resource} (${roll.formula} = ${roll.total}).`);
    }
    // Summons are created by the GM; the card's undo dismisses them.
    const summon = resolve(automation?.summon, ctx);
    if (summon) {
        const summonId = foundry.utils.randomID();
        const pacts = Number(foundry.utils.getProperty(passives.find((p) => p.automation.resources?.some((r) => r.key === "pacts"))?.handle.item.system ?? {}, "resources.pacts") ?? 0);
        const { requestGM } = await import("../socket.ts");
        await requestGM("summon", {
            casterUuid: actor.uuid,
            abilityKey: opts.automationKey ?? `${className}/${opts.title}`,
            spec: summon,
            duration: opts.duration ?? "1 minute",
            summonId,
            damageBonus: pacts ? 100 * pacts : 0,
        });
        undo.summonIds = [summonId];
        selfNotes.push(`Summoned ${summon.name}${(summon.count ?? 1) > 1 ? ` ×${summon.count}` : ""}. Undo dismisses ${(summon.count ?? 1) > 1 ? "them" : "it"}.`);
    }

    const drain = resolve(automation?.drain, ctx);
    let drainAmount = 0;
    if (drain) {
        const roll = await new Roll(drain.formula, actor.getRollData()).evaluate();
        drainAmount = roll.total ?? 0;
        result?.rolls.push(roll as unknown as Roll);
    }

    // Mirrors a twice-redirected beam hit are dispelled.
    if (areaResult?.dispelled?.length) {
        const { requestGM } = await import("../socket.ts");
        for (const id of areaResult.dispelled) await requestGM("dismiss", id);
    }

    // 6. Passives react to the use.
    const afterInfo = { ...rollInfo, actor, rollType: result?.rollType ?? "magic", weapon: null, damageTypes: Object.keys(result?.totals ?? {}), result, manaPaid: paid.mana } as const;
    for (const p of passives) {
        const deltas = await p.automation.afterUse?.({ ...afterInfo, inflictsCC: rollInfo.inflictsCC ?? false }, p.handle);
        if (deltas) undo.passiveDeltas!.push(...deltas);
    }
    const extraEffects: Record<string, unknown>[] = passives.flatMap((p) =>
        (p.automation.extraTargets?.({ ...afterInfo, inflictsCC: rollInfo.inflictsCC ?? false }, p.handle) ?? []).map((spec: EffectSpec) =>
            buildEffectData(spec, { ...source, abilityName: spec.name ?? p.handle.item.name }),
        ),
    );

    // Per-target damage scaling for area attacks, e.g. half damage past the first target of a line.
    const targetScales: Record<string, number> = {};
    if (attack?.targetScale && areaResult) {
        const anyTargeted = areaResult.tokens.some((t) => preTargets.has(t.document.uuid));
        areaResult.tokens.forEach((token, index) => {
            const uuid = token.document.uuid;
            if (!uuid) return;
            targetScales[uuid] = attack.targetScale!(index, {
                count: areaResult!.tokens.length,
                wasTargeted: preTargets.has(uuid),
                anyTargeted,
                spotted: !!token.actor?.statuses.has("spotted"),
            });
        });
    }

    const notes = [
        ...rollNotes,
        ...selfNotes,
        ...(resolve(automation?.notes, ctx) ?? []),
        ...(result && automation?.summarize ? automation.summarize(result, ctx) : []),
        ...(areaResult ? [`Area: ${areaResult.tokens.map((t) => t.name).join(", ") || "no one"}.`] : []),
        ...(areaResult?.notes ?? []),
    ];
    const meta = [...(opts.meta ?? [])];
    if (paid.label) meta.push({ label: "Paid", value: paid.label });
    if (ctx.effectiveness !== 1 && (selfEffects.length || targetSpecs.some((s) => s.category === "buff"))) {
        meta.push({ label: "Buff effectiveness", value: `${Math.round(ctx.effectiveness * 100)}%` });
    }

    // 7. Card
    await postCard(
        actor,
        {
            title: opts.title,
            subtitle: opts.subtitle,
            img: opts.img,
            meta,
            description: opts.description,
            result,
            notes,
            selfEffects,
            targetEffects: targetSpecs.map((spec, index) => ({
                index,
                label:
                    (spec.name ?? opts.title) +
                    (spec.within !== undefined ? ` (within ${spec.within} ft)` : "") +
                    (spec.beyond !== undefined ? ` (beyond ${spec.beyond} ft)` : ""),
            })),
            extraEffects: extraEffects.map((data, index) => ({ index, label: String(data.name) })),
            tiers,
        },
        {
            actorUuid: actor.uuid ?? "",
            sourceName: `${actor.name}'s ${opts.title}`,
            damage:
                result && result.rollType !== "healing"
                    ? {
                          hits: tiers.length ? [] : result.hits.map((h) => h.totals),
                          bonus: tiers.length ? [] : result.hits.map((h) => h.distanceBonus),
                          penetration: result.penetration,
                          trueDamage: !!attack?.trueDamage,
                          tiers: tiers.map((t) => ({
                              within: t.within,
                              hits: t.result.hits.map((h) => h.totals),
                              bonus: t.result.hits.map((h) => h.distanceBonus),
                          })),
                      }
                    : undefined,
            casterTokenUuid: casterTokenUuid(actor),
            // Self-heals were already applied; don't offer to apply them again.
            healing: result?.rollType === "healing" && !heal?.self ? (result.totals.healing ?? 0) : undefined,
            shielding: shielding && !shielding.self ? shielding.amount : undefined,
            drain: drain ? { resource: drain.resource, amount: drainAmount } : undefined,
            effectSource: targetSpecs.length ? source : undefined,
            automationKey: opts.automationKey ?? (className ? `${className}/${opts.title}` : undefined),
            context: contextData(ctx),
            statuses: result?.statuses ?? [],
            extraEffects,
            targetScales,
            segments: areaResult?.segments,
            redirectSwap: attack?.redirectSwap,
            alterCourse: hasAlterCourse(actor),
        },
        undo,
    );
}

/**
 * An aura's start-of-turn damage (Fiery Temper): rolled with the bearer's bonuses and posted as a card that already
 * targets everyone in range, so whoever runs combat just clicks Apply.
 */
export async function postPulse(
    actor: Actor.Implementation,
    effect: ActiveEffect.Implementation,
    pulse: { formula: string; damageType: string; radius: number; affects: "enemies" | "allies" | "all" },
): Promise<void> {
    const token = (actor.getActiveTokens(true) as Token.Implementation[])[0];
    if (!token || !canvas?.tokens) return;
    const grid = canvas.grid as unknown as { measurePath(waypoints: object[]): { distance: number } };
    const targets = (canvas.tokens.placeables as Token.Implementation[]).filter(
        (t) => t !== token && !!t.actor && affected(t, token, pulse.affects) && grid.measurePath([token.center, t.center]).distance <= pulse.radius + 0.01,
    );
    const type = (pulse.damageType || "physical") as AttackSpec["damage"][number]["type"];
    const spec: AttackSpec = { rollType: type === "physical" ? "physical" : "magic", damage: [{ formula: pulse.formula, type }] };
    const ctx = makeContext(actor, null, {});
    const result = await prepareAttack(actor, spec, ctx, spec.damage, { skipSingleUse: true }).evaluate({});
    await postCard(
        actor,
        {
            title: effect.name,
            img: effect.img ?? "icons/svg/aura.svg",
            subtitle: "Start of turn",
            result,
            notes: [`Everyone ${pulse.affects === "enemies" ? "hostile " : ""}within ${pulse.radius} ft: ${targets.map((t) => t.name).join(", ") || "no one"}.`],
        },
        {
            actorUuid: actor.uuid ?? "",
            sourceName: `${actor.name}'s ${effect.name}`,
            damage: { hits: result.hits.map((h) => h.totals), bonus: result.hits.map((h) => h.distanceBonus), penetration: result.penetration },
            casterTokenUuid: token.document.uuid ?? undefined,
            statuses: result.statuses,
        },
        { actorUuid: actor.uuid ?? "", removedEffects: result.consumedEffects, passiveDeltas: result.passiveDeltas },
        { targets: targets.map((t) => t.document.uuid ?? "").filter(Boolean) },
    );
}

/** Mirror Mage's Alter Course: attacks they redirect deal +50% damage per redirect. */
export function hasAlterCourse(actor: Actor.Implementation | null): boolean {
    return !!actor?.items.some((i) => i.type === "passive" && i.name === "Alter Course");
}

/** Run an automation that isn't attached to an ability item: passive actions, summon attacks. */
export async function useAutomation(actor: Actor.Implementation, title: string, automation: AbilityAutomation, img = "icons/svg/aura.svg") {
    await runAutomation({ actor, automation, title, img });
}

export async function useAbility(actor: Actor.Implementation, item: Item.Implementation): Promise<void> {
    const ability = item.system as unknown as AbilityModel;
    const description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(ability.description, { relativeTo: item });
    await runAutomation({
        actor,
        item,
        automation: getAutomation(ability.className, item.name, ability.automationKey),
        title: item.name,
        img: item.img ?? "",
        subtitle: [ability.className, ability.branch, `Tier ${ability.tier}`].filter(Boolean).join(" · "),
        meta: [
            { label: "Action", value: ability.action },
            { label: "Cost", value: ability.cost.text },
            { label: "Range", value: ability.range },
            { label: "Duration", value: ability.duration },
        ],
        description,
        defaultCost: ability.hasAutomaticCost ? { resource: ability.cost.resource as CostResource, amount: ability.cost.value ?? 0 } : null,
        duration: ability.duration,
        className: ability.className,
        tags: ability.tags,
        automationKey: ability.automationKey || undefined,
    });
}

function casterTokenUuid(actor: Actor.Implementation): string | undefined {
    const tokens = actor.getActiveTokens(true) as Token.Implementation[];
    return (tokens.find((t) => t.controlled) ?? tokens[0])?.document.uuid ?? undefined;
}

/** A basic attack with a weapon: its implicit damage, scaling, and any on-hit effects. */
export async function weaponAttack(actor: Actor.Implementation, item: Item.Implementation): Promise<void> {
    const weapon = item.system as unknown as EquipmentModel;
    if (!weapon.isWeapon) {
        ui.notifications?.error(`${item.name} isn't a weapon (give it a category and damage).`);
        return;
    }
    // Attacking with gear that isn't in hand would skip its mods (unequipped effects are inactive), so refuse
    // rather than roll something that looks right but isn't.
    if (!weapon.isHeldWeapon) {
        ui.notifications?.error(`${item.name} isn't equipped in a hand slot. Equip it before attacking with it.`);
        return;
    }
    const targets = [...(game.user?.targets ?? [])].map((t) => t.actor).filter((a): a is Actor.Implementation => !!a);
    const builder = new AttackBuilder(actor, { rollType: "physical", weapon: item });
    builder.addWeapon();
    builder.applyEffects().applyPassives({ targets, tags: [], abilityName: null, className: null, choices: {} });
    const result = await builder.evaluate();
    await postCard(
        actor,
        { title: item.name, subtitle: "Weapon attack", img: item.img ?? "", result },
        {
            actorUuid: actor.uuid ?? "",
            sourceName: `${actor.name}'s ${item.name}`,
            damage: { hits: result.hits.map((h) => h.totals), bonus: result.hits.map((h) => h.distanceBonus), penetration: result.penetration },
            casterTokenUuid: casterTokenUuid(actor),
            statuses: result.statuses,
        },
        // A weapon attack costs nothing, but it may have consumed a single-use buff (Focus) or Spotting.
        { actorUuid: actor.uuid ?? "", removedEffects: result.consumedEffects, passiveDeltas: result.passiveDeltas },
    );
}
