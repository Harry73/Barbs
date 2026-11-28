/**
 * Delete embedded documents that may already be gone, or going. Several cleanups can race to delete the same thing:
 * undoing a cast deletes its effects and dismisses its summons, while deleting its Concentrating marker ends the
 * concentration, which deletes and dismisses them too. Foundry rejects a delete with any missing ID (and logs and
 * notifies the error itself), so the second cleanup has to not ask.
 *
 * Both run on the same client (the GM's, where relayed cleanups happen), so deletions in flight are tracked here: a
 * second request for the same document waits for the first instead of sending its own, and documents that are already
 * gone are skipped.
 */
type EmbeddedType = "ActiveEffect" | "Token" | "Item" | "Region";

interface Parent {
    uuid?: string | null;
    getEmbeddedCollection(type: EmbeddedType): { has(id: string): boolean };
    deleteEmbeddedDocuments(type: EmbeddedType, ids: string[]): Promise<unknown>;
}

const inFlight = new Map<string, Promise<unknown>>();

export async function deleteExisting(parent: unknown, type: EmbeddedType, ids: string[]): Promise<void> {
    const p = parent as Parent | null;
    if (!p) return;
    const key = (id: string) => `${p.uuid ?? ""}/${type}/${id}`;
    const waiting = [...new Set(ids)].map((id) => inFlight.get(key(id))).filter((w): w is Promise<unknown> => !!w);
    const mine = [...new Set(ids)].filter((id) => !inFlight.has(key(id)) && p.getEmbeddedCollection(type).has(id));
    if (mine.length) {
        const request = p.deleteEmbeddedDocuments(type, mine);
        for (const id of mine) inFlight.set(key(id), request);
        try {
            await request;
        } finally {
            for (const id of mine) inFlight.delete(key(id));
        }
    }
    await Promise.allSettled(waiting);
}

/** The same for a top-level actor (a dismissed summon). */
const actorsInFlight = new Map<string, Promise<unknown>>();
export async function deleteActorIfPresent(actor: Actor.Implementation): Promise<void> {
    const id = actor.id ?? "";
    const pending = actorsInFlight.get(id);
    if (pending) return void (await Promise.allSettled([pending]));
    if (!game.actors?.has(id)) return;
    const request = actor.delete();
    actorsInFlight.set(id, request);
    try {
        await request;
    } finally {
        actorsInFlight.delete(id);
    }
}
