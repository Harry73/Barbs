/**
 * Undo for Barbs chat messages: ability uses, damage, healing, and applied effects.
 *
 * Each undoable message stores an UndoRecord in its flags describing what it changed on one actor. Undoing reverses
 * those changes, then strikes through the message and removes its buttons, like PF2e's revert-damage button.
 *
 * Resource changes are stored as deltas, so undoing an earlier message doesn't also wipe out changes made since.
 */
import { SYSTEM_ID } from "../config.ts";
import type { CreatureModel } from "../data/actor/creature.ts";

export interface RemovedEffect {
    /** The actor or item the effect lived on. */
    parentUuid: string;
    data: object;
}

export interface UndoRecord {
    actorUuid: string;
    /** Amount each resource changed by (negative for costs and damage). */
    resourceDeltas?: Partial<Record<"health" | "stamina" | "mana", number>>;
    downedDelta?: number;
    shieldingDelta?: number;
    /** Changes to passive resources (Spotting, Ki, ...), by passive item UUID and resource key. */
    passiveDeltas?: { itemUuid: string; key: string; delta: number }[];
    /** Statuses the change turned on (to turn off again) or off (to turn back on). */
    statusesAdded?: string[];
    statusesRemoved?: string[];
    /** Effects the change created, to delete. */
    createdEffects?: string[];
    /** Effects the change deleted (consumed, replaced, or stripped by going Downed), to recreate. */
    removedEffects?: RemovedEffect[];
    /** Summonings the change created, to dismiss. */
    summonIds?: string[];
}

export function isEmptyUndo(undo: UndoRecord): boolean {
    return (
        !Object.values(undo.resourceDeltas ?? {}).some(Boolean) &&
        !undo.downedDelta &&
        !undo.shieldingDelta &&
        !undo.passiveDeltas?.some((p) => p.delta) &&
        !undo.statusesAdded?.length &&
        !undo.statusesRemoved?.length &&
        !undo.createdEffects?.length &&
        !undo.removedEffects?.length &&
        !undo.summonIds?.length
    );
}

export function snapshotEffect(effect: ActiveEffect.Implementation): RemovedEffect {
    return { parentUuid: effect.parent?.uuid ?? "", data: effect.toObject() };
}

/** The small square undo button that sits at the right end of a card's button row. */
export const UNDO_BUTTON =
    '<button type="button" class="barbs-undo" data-card-action="undo" data-tooltip="Undo" data-tooltip-direction="UP">' +
    '<i class="fa-solid fa-rotate-left"></i></button>';

/** A button row holding only the undo button, for messages that have no other buttons. */
export const UNDO_ROW = `<div class="card-buttons"><div class="apply-buttons"></div>${UNDO_BUTTON}</div>`;

export function getUndo(message: ChatMessage.Implementation): UndoRecord | undefined {
    return message.getFlag(SYSTEM_ID as never, "undo" as never) as unknown as UndoRecord | undefined;
}

export function isUndone(message: ChatMessage.Implementation): boolean {
    return !!message.getFlag(SYSTEM_ID as never, "undone" as never);
}

/** Reverse a message's recorded changes and mark it undone. Must run on a client that can edit the actor and message. */
export async function performUndo(message: ChatMessage.Implementation): Promise<void> {
    const undo = getUndo(message);
    if (!undo || isUndone(message)) return;
    const actor = (await fromUuid(undo.actorUuid)) as Actor.Implementation | null;
    if (!actor) {
        ui.notifications?.warn("The actor this message affected no longer exists.");
        return;
    }

    // Resources and Downed Health, as deltas from the current values.
    const d = (actor.system as unknown as CreatureModel).derived;
    const update: Record<string, number> = {};
    for (const [key, delta] of Object.entries(undo.resourceDeltas ?? {}) as ["health" | "stamina" | "mana", number][]) {
        if (!delta) continue;
        const { value, max } = d.resources[key];
        update[`system.resources.${key}.value`] = Math.clamp(value - delta, 0, max);
    }
    if (undo.downedDelta) update["system.downed.value"] = Math.clamp(d.downed.value - undo.downedDelta, 0, d.downed.max);
    if (undo.shieldingDelta) {
        const current = (actor.system as unknown as CreatureModel).shielding.value;
        update["system.shielding.value"] = Math.max(0, current - undo.shieldingDelta);
    }
    if (Object.keys(update).length) await actor.update(foundry.utils.expandObject(update) as never);

    for (const { itemUuid, key, delta } of undo.passiveDeltas ?? []) {
        const item = (await fromUuid(itemUuid)) as Item.Implementation | null;
        const current = Number(foundry.utils.getProperty(item?.system ?? {}, `resources.${key}`) ?? 0);
        if (item) await item.update({ [`system.resources.${key}`]: Math.max(0, current - delta) } as never);
    }

    for (const status of undo.statusesAdded ?? []) await actor.toggleStatusEffect(status, { active: false });
    for (const status of undo.statusesRemoved ?? []) await actor.toggleStatusEffect(status, { active: true });

    for (const uuid of undo.createdEffects ?? []) {
        const effect = fromUuidSync(uuid) as ActiveEffect.Implementation | null;
        if (effect) await effect.delete();
    }
    for (const { parentUuid, data } of undo.removedEffects ?? []) {
        const parent = (await fromUuid(parentUuid)) as Actor.Implementation | Item.Implementation | null;
        const id = (data as { _id?: string })._id;
        if (!parent || (id && parent.effects.has(id))) continue;
        // Actor and Item share this method but fvtt-types can't unify the union's overloads.
        await (parent as Actor.Implementation).createEmbeddedDocuments("ActiveEffect", [data as never], { keepId: true });
    }

    if (undo.summonIds?.length) {
        const { requestGM } = await import("../socket.ts");
        for (const id of undo.summonIds) await requestGM("dismiss", id);
    }

    await markUndone(message);
    ui.notifications?.info(`Undid ${actor.name}'s change.`);
}

/** Strike through the message, drop its buttons, and note who undid it. */
async function markUndone(message: ChatMessage.Implementation): Promise<void> {
    if (!message.isOwner) return;
    const root = document.createElement("div");
    root.innerHTML = message.content;
    root.querySelectorAll(".barbs-undo, .card-buttons").forEach((el) => el.remove());
    const card = root.querySelector(".barbs-chat-card");
    card?.classList.add("reverted");
    card?.insertAdjacentHTML("beforeend", `<p class="undone-note">Undone by ${foundry.utils.escapeHTML(game.user?.name ?? "")}</p>`);
    await message.update({ content: root.innerHTML, [`flags.${SYSTEM_ID}.undone`]: true } as never);
}

/** Only the GM and owners of the affected actor see the undo icon. */
export function hideUndoIfNotAllowed(message: ChatMessage.Implementation, html: HTMLElement): void {
    const undo = getUndo(message);
    if (!undo || game.user?.isGM) return;
    const actor = fromUuidSync(undo.actorUuid) as Actor.Implementation | null;
    if (actor?.isOwner) return;
    const button = html.querySelector(".barbs-undo");
    const row = button?.closest(".card-buttons");
    button?.remove();
    // Don't leave an empty row behind on messages where undo was the only button.
    if (row && !row.querySelector("button")) row.remove();
}
