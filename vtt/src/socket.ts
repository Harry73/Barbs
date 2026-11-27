/**
 * Run target-side actions on a client that's allowed to modify the target.
 *
 * Roll20 got this for free because everything ran on the server. In Foundry, a player who heals an ally or
 * damages a monster usually doesn't own that actor, so the request is relayed to the active GM's client.
 */
import { SYSTEM_ID } from "./config.ts";
import type { DamageKey } from "./rules/damage-math.ts";
import { getUndo, performUndo } from "./chat/undo.ts";
import {
    applyDamageToActor,
    applyEffectToActor,
    applyHealingToActor,
    applyResourceChangeToActor,
    applyShieldingToActor,
    type ApplyEffectOptions,
} from "./effects/apply.ts";

const CHANNEL = `system.${SYSTEM_ID}` as const;

type Requests = {
    damage: {
        hits: Partial<Record<DamageKey, number>>[];
        penetration: Partial<Record<DamageKey, number>>;
        sourceName?: string;
        scale?: number;
        trueDamage?: boolean;
        unblockable?: boolean;
        lifesteal?: { percent: number; attackerUuid: string };
    };
    shielding: { amount: number; sourceName?: string };
    cleanse: { statuses: string[] };
    resource: { resource: "stamina" | "mana"; delta: number; sourceName?: string };
    healing: { amount: number; sourceName?: string };
    effect: { data: Record<string, unknown>; options: ApplyEffectOptions };
};
type RequestType = keyof Requests;

interface SocketMessage<T extends RequestType = RequestType> {
    type: T;
    actorUuid: string;
    payload: Requests[T];
}

interface UndoSocketMessage {
    type: "undo";
    messageId: string;
}

interface GMSocketMessage {
    type: "summon" | "dismiss";
    payload: unknown;
}

/** Run something only the GM can do (creating or deleting actors), here if we're the GM, else on their client. */
export async function requestGM(type: GMSocketMessage["type"], payload: unknown): Promise<void> {
    if (game.user?.isGM) return performGM({ type, payload });
    if (!game.users?.activeGM) {
        ui.notifications?.warn("A GM must be online for that.");
        return;
    }
    game.socket?.emit(CHANNEL, { type, payload } satisfies GMSocketMessage);
}

async function performGM(message: GMSocketMessage): Promise<void> {
    const { createSummon, dismissSummon } = await import("./summons.ts");
    if (message.type === "summon") await createSummon(message.payload as never);
    if (message.type === "dismiss") await dismissSummon(message.payload as string);
}

async function perform<T extends RequestType>(actor: Actor.Implementation, type: T, payload: Requests[T]): Promise<void> {
    switch (type) {
        case "damage": {
            const p = payload as Requests["damage"];
            return applyDamageToActor(actor, p.hits, p.penetration, p.sourceName, p.scale, {
                trueDamage: p.trueDamage,
                attack: true,
                unblockable: p.unblockable,
                lifesteal: p.lifesteal,
            });
        }
        case "healing": {
            const p = payload as Requests["healing"];
            return applyHealingToActor(actor, p.amount, p.sourceName);
        }
        case "cleanse": {
            const p = payload as Requests["cleanse"];
            const ids = actor.effects.filter((e) => [...e.statuses].some((s) => p.statuses.includes(s))).map((e) => e.id!);
            if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
            return;
        }
        case "shielding": {
            const p = payload as Requests["shielding"];
            return applyShieldingToActor(actor, p.amount, p.sourceName);
        }
        case "resource": {
            const p = payload as Requests["resource"];
            await applyResourceChangeToActor(actor, p.resource, p.delta, p.sourceName);
            return;
        }
        case "effect": {
            const p = payload as Requests["effect"];
            await applyEffectToActor(actor, p.data, p.options);
            return;
        }
    }
}

/** Apply something to an actor here if we own it, otherwise ask the GM's client to. */
export async function requestOnActor<T extends RequestType>(
    actor: Actor.Implementation,
    type: T,
    payload: Requests[T],
): Promise<void> {
    if (actor.isOwner) return perform(actor, type, payload);
    if (!game.users?.activeGM) {
        ui.notifications?.warn(`A GM must be online to affect ${actor.name}.`);
        return;
    }
    const message: SocketMessage<T> = { type, actorUuid: actor.uuid ?? "", payload };
    game.socket?.emit(CHANNEL, message);
}

/**
 * Undo a message's changes. Runs locally if this client can edit both the actor and the message (e.g. a player
 * undoing their own ability use), otherwise on the GM's client: damage messages are usually authored by the GM after
 * a relayed request, so the player couldn't mark them undone.
 */
export async function requestUndo(message: ChatMessage.Implementation): Promise<void> {
    const undo = getUndo(message);
    if (!undo) return;
    const actor = fromUuidSync(undo.actorUuid) as Actor.Implementation | null;
    if (game.user?.isGM || (message.isOwner && actor?.isOwner)) return performUndo(message);
    if (!game.users?.activeGM) {
        ui.notifications?.warn("A GM must be online to undo this.");
        return;
    }
    game.socket?.emit(CHANNEL, { type: "undo", messageId: message.id ?? "" } satisfies UndoSocketMessage);
}

export function registerSocket(): void {
    game.socket?.on(CHANNEL, async (message: SocketMessage | UndoSocketMessage | GMSocketMessage) => {
        // Exactly one client (the active GM) handles each relayed request.
        if (!game.user?.isActiveGM) return;
        if (message.type === "summon" || message.type === "dismiss") return performGM(message as GMSocketMessage);
        if (message.type === "undo") {
            const chat = game.messages?.get(message.messageId) as ChatMessage.Implementation | undefined;
            if (chat) await performUndo(chat);
            return;
        }
        const m = message as SocketMessage;
        const actor = (await fromUuid(m.actorUuid)) as Actor.Implementation | null;
        if (!actor) return;
        await perform(actor, m.type, m.payload);
    });
}
