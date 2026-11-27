/**
 * Class passives: granting them, finding them, and reading/changing the resources they track.
 */
import { SYSTEM_ID } from "../config.ts";
import type { AbilityModel, PassiveModel } from "../data/item/models.ts";
import { PASSIVE_AUTOMATION } from "./catalog.ts";
import type { PassiveAutomation, PassiveDelta, PassiveHandle, PassiveResource } from "./types.ts";

/** Monk mastery tiers: dU die size and base combo chance by number of mastery-raising passives. */
const MONK_DICE = [4, 6, 8, 10, 12, 20];
const MONK_COMBO = [0, 10, 20, 30, 35, 40];

export function passiveKey(className: string, passiveName: string): string {
    return `${className}/${passiveName}`;
}

export function getPassiveAutomation(item: Item.Implementation): PassiveAutomation | null {
    const system = item.system as unknown as PassiveModel;
    return PASSIVE_AUTOMATION[passiveKey(system.className, item.name)] ?? null;
}

export function handle(item: Item.Implementation): PassiveHandle {
    const system = item.system as unknown as PassiveModel;
    const automation = getPassiveAutomation(item);
    return {
        item,
        actor: item.parent as Actor.Implementation,
        resource: (key) => Number(system.resources?.[key] ?? 0),
        state: (key) =>
            String(system.state?.[key] ?? automation?.states?.find((s) => s.key === key)?.default ?? ""),
    };
}

/** Every owned passive that has automation. */
export function activePassives(actor: Actor.Implementation | null): { handle: PassiveHandle; automation: PassiveAutomation }[] {
    if (!actor) return [];
    return actor.items
        .filter((i) => i.type === "passive")
        .map((item) => ({ handle: handle(item as Item.Implementation), automation: getPassiveAutomation(item as Item.Implementation) }))
        .filter((p): p is { handle: PassiveHandle; automation: PassiveAutomation } => !!p.automation);
}

/** Find which owned passive tracks a resource key ("spotting", "ki"), with its definition. */
export function findResource(
    actor: Actor.Implementation,
    key: string,
): { handle: PassiveHandle; definition: PassiveResource } | null {
    for (const p of activePassives(actor)) {
        const definition = p.automation.resources?.find((r) => r.key === key);
        if (definition) return { handle: p.handle, definition };
    }
    return null;
}

export function resourceValue(actor: Actor.Implementation, key: string): number {
    return findResource(actor, key)?.handle.resource(key) ?? 0;
}

/** Change a passive resource, clamped to [0, max]. Returns the applied change for undo records. */
export async function adjustResource(actor: Actor.Implementation, key: string, delta: number): Promise<PassiveDelta | null> {
    const found = findResource(actor, key);
    if (!found || !delta) return null;
    const current = found.handle.resource(key);
    const next = Math.clamp(current + delta, 0, found.definition.max ?? Infinity);
    if (next === current) return null;
    await found.handle.item.update({ [`system.resources.${key}`]: next } as never);
    return { itemUuid: found.handle.item.uuid ?? "", key, delta: next - current };
}

export async function setResource(actor: Actor.Implementation, key: string, value: number): Promise<PassiveDelta | null> {
    return adjustResource(actor, key, value - resourceValue(actor, key));
}

/** How many "your monk mastery increases" passives the actor has. */
export function monkMastery(actor: Actor.Implementation | null): number {
    return activePassives(actor).filter((p) => p.automation.monkMastery).length;
}

export function monkDie(actor: Actor.Implementation | null): number {
    return MONK_DICE[Math.min(monkMastery(actor), MONK_DICE.length - 1)];
}

export function baseComboChance(actor: Actor.Implementation | null): number {
    return MONK_COMBO[Math.min(monkMastery(actor), MONK_COMBO.length - 1)];
}

/* -------------------------------------------- */
/*  Granting                                    */
/* -------------------------------------------- */

/**
 * Give the actor their class's passive if they don't have it yet. Looked up from the Classes compendium, so the
 * passive text stays in sync with the rulebook.
 */
let warnedStaleManifest = false;

export async function ensurePassive(actor: Actor.Implementation, className: string): Promise<void> {
    if (!className) return;
    // The server only learns new document types at startup; after a system update that adds one, it rejects them
    // until Foundry is restarted.
    if (!(game.documentTypes?.Item ?? []).includes("passive")) {
        if (!warnedStaleManifest) {
            ui.notifications?.warn("Barbs was updated: restart Foundry (quit the app, not just the world) to enable class passives.", {
                permanent: true,
            });
            warnedStaleManifest = true;
        }
        return;
    }
    const has = actor.items.some((i) => i.type === "passive" && (i.system as unknown as PassiveModel).className === className);
    if (has) return;
    const pack = game.packs?.get(`${SYSTEM_ID}.classes`);
    if (!pack) return;
    const index = await pack.getIndex({ fields: ["system.passive"] as never });
    const entry = [...index].find((e) => e.name === className) as { system?: { passive?: { name: string; description: string } } } | undefined;
    const passive = entry?.system?.passive;
    if (!passive?.name) return;
    await actor.createEmbeddedDocuments("Item", [
        {
            name: passive.name,
            type: "passive",
            img: "icons/svg/aura.svg",
            system: { className, description: passive.description, resources: {}, state: {} },
        } as never,
    ]);
    ui.notifications?.info(`${actor.name} gains the ${className} passive: ${passive.name}.`);
}

/** Give existing characters the passives for classes they already have abilities in (once, on the GM's client). */
export async function backfillPassives(): Promise<void> {
    if (!game.user?.isActiveGM) return;
    for (const actor of game.actors ?? []) {
        const classes = new Set(
            actor.items.filter((i) => i.type === "ability").map((i) => (i.system as unknown as AbilityModel).className).filter(Boolean),
        );
        for (const className of classes) await ensurePassive(actor as Actor.Implementation, className);
    }
}

/** Grant passives when an ability is added to an actor, on the client that added it. */
export function registerPassiveGranting(): void {
    Hooks.on("createItem", (item: Item.Implementation, _options: unknown, userId: string) => {
        if (userId !== game.user?.id || item.type !== "ability" || !(item.parent instanceof Actor)) return;
        void ensurePassive(item.parent as Actor.Implementation, (item.system as unknown as AbilityModel).className);
    });
}

/* -------------------------------------------- */
/*  Resets                                      */
/* -------------------------------------------- */

/** Reset resources marked for a trigger ("combatEnd", "longRest") to 0. */
export async function resetResources(actor: Actor.Implementation, trigger: "combatEnd" | "longRest"): Promise<void> {
    for (const { handle: p, automation } of activePassives(actor)) {
        const updates: Record<string, number> = {};
        for (const r of automation.resources ?? []) {
            if (r.resetOn?.includes(trigger) && p.resource(r.key) !== 0) updates[`system.resources.${r.key}`] = 0;
        }
        if (Object.keys(updates).length) await p.item.update(updates as never);
    }
}

/** Per-turn gains and passive turn-start hooks, called from the Combat document on the GM's client. */
export async function passivesOnTurnStart(actor: Actor.Implementation): Promise<void> {
    for (const { handle: p, automation } of activePassives(actor)) {
        for (const r of automation.resources ?? []) {
            if (r.gainOnTurnStart) await adjustResource(actor, r.key, r.gainOnTurnStart);
        }
        await automation.onTurnStart?.(p);
    }
}

export function registerPassiveResets(): void {
    Hooks.on("deleteCombat", (combat: Combat.Implementation) => {
        if (!game.user?.isActiveGM) return;
        for (const combatant of combat.combatants) {
            const actor = combatant.actor as Actor.Implementation | null;
            if (actor) void resetResources(actor, "combatEnd");
        }
    });
}

/* -------------------------------------------- */
/*  States                                      */
/* -------------------------------------------- */

/**
 * Set a passive state (e.g. Thief stance) and rebuild the effects that depend on it, which live on the passive item
 * and transfer to the owner.
 */
export async function setState(item: Item.Implementation, key: string, value: string): Promise<void> {
    await item.update({ [`system.state.${key}`]: value } as never);
    const automation = getPassiveAutomation(item);
    if (!automation?.stateEffects) return;
    const old = item.effects.filter((e) => !!foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.stateEffect`));
    if (old.length) await item.deleteEmbeddedDocuments("ActiveEffect", old.map((e) => e.id!));
    const state = { ...((item.system as unknown as PassiveModel).state ?? {}), [key]: value };
    const { buildEffectData } = await import("../abilities/effects.ts");
    const effects = automation.stateEffects(state).map((spec) => {
        const data = buildEffectData(spec, { className: "", abilityName: item.name, img: item.img ?? "", duration: "Endless" });
        return foundry.utils.mergeObject(data, { transfer: true, flags: { [SYSTEM_ID]: { stateEffect: true } } });
    });
    if (effects.length) await item.createEmbeddedDocuments("ActiveEffect", effects as never);
}
