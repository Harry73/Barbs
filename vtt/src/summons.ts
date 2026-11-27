/**
 * Creating summoned creatures. Runs on the GM's client (players usually can't create actors), relayed by socket.ts.
 *
 * A summon is an NPC actor with a stat block, owned by the caster's owners, with one token per creature placed next
 * to the caster. It carries a duration effect; when that expires (or the summoning card is undone) its tokens and
 * actor are removed.
 */
import { buildEffectData } from "./abilities/effects.ts";
import { summonActionKey } from "./abilities/catalog.ts";
import type { SummonSpec } from "./abilities/types.ts";
import { SYSTEM_ID, STAT_KEYS } from "./config.ts";
import type { EquipmentModel } from "./data/item/models.ts";

export interface SummonRequest {
    casterUuid: string;
    /** "Class/Ability" of the summoning ability. */
    abilityKey: string;
    spec: SummonSpec;
    /** The ability's duration, used unless the spec overrides it. */
    duration: string;
    /** Links every creature from one cast, so undoing the card can remove them all. */
    summonId: string;
    /** Extra percent damage for the summon (Dragoncaller's Draconic Pacts). */
    damageBonus?: number;
    /** The caster's concentration that maintains it: dismissed when it ends. */
    concentrationKey?: string;
}

async function summonsFolder(): Promise<string | null> {
    const existing = game.folders?.find((f) => f.type === "Actor" && f.name === "Summons");
    if (existing) return existing.id;
    const folder = (await Folder.create({ name: "Summons", type: "Actor" } as never)) as unknown as { id: string } | null;
    return folder?.id ?? null;
}

/** Free grid spaces in rings around the caster's token, nearest first. */
function freeSpaces(caster: Token.Implementation, count: number, size: number): { x: number; y: number }[] {
    const grid = canvas!.grid!.size;
    const occupied = new Set((canvas!.tokens!.placeables as Token.Implementation[]).map((t) => `${t.document.x},${t.document.y}`));
    const spots: { x: number; y: number }[] = [];
    for (let ring = 1; spots.length < count && ring < 10; ring++) {
        for (let dx = -ring; dx <= ring && spots.length < count; dx++) {
            for (let dy = -ring; dy <= ring && spots.length < count; dy++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
                const x = caster.document.x + dx * grid * Math.max(1, size);
                const y = caster.document.y + dy * grid * Math.max(1, size);
                if (!occupied.has(`${x},${y}`)) {
                    occupied.add(`${x},${y}`);
                    spots.push({ x, y });
                }
            }
        }
    }
    return spots;
}

export async function createSummon(request: SummonRequest): Promise<void> {
    const caster = (await fromUuid(request.casterUuid)) as Actor.Implementation | null;
    if (!caster) return;
    const { spec } = request;
    const casterToken = (caster.getActiveTokens(true) as Token.Implementation[])[0] ?? null;

    // Owners of the caster own the summon.
    const ownership: Record<string, number> = { default: 0 };
    for (const [userId, level] of Object.entries(caster.ownership ?? {})) {
        if (userId !== "default" && level >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) ownership[userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    }

    const overrides = Object.fromEntries(STAT_KEYS.map((k) => [k, (spec.stats as Record<string, number>)[k] ?? null]));
    const size = spec.size ?? 1;
    const description = [
        spec.description ? `<p>${spec.description}</p>` : "",
        ...(spec.actions ?? []).map((a) => `<p><strong>${a.name}</strong>${a.action ? ` (${a.action})` : ""}: ${a.description}</p>`),
    ].join("");
    const actor = (await Actor.create({
        name: spec.name,
        type: "npc",
        img: spec.img ?? "icons/svg/mystery-man.svg",
        folder: await summonsFolder(),
        ownership,
        system: {
            // Summons have flat stat blocks: zeroed attributes, fixed stats.
            attributes: Object.fromEntries(
                ["vit", "end", "spt", "rcv", "per", "san", "agi", "tgh", "ref", "res", "frt", "str", "dex", "atn", "pre", "apl", "int", "wis", "com", "fcs"].map(
                    (k) => [k, { value: 0 }],
                ),
            ),
            overrides,
            resources: {
                health: { value: spec.stats.health ?? 1 },
                stamina: { value: spec.stats.stamina ?? 0 },
                mana: { value: spec.stats.mana ?? 0 },
            },
            details: { biography: description },
        },
        prototypeToken: {
            name: spec.name,
            actorLink: false,
            width: size,
            height: size,
            disposition: casterToken?.document.disposition ?? CONST.TOKEN_DISPOSITIONS.FRIENDLY,
            bar1: { attribute: "resources.health" },
            displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        },
        flags: {
            [SYSTEM_ID]: {
                summon: { summonId: request.summonId, casterUuid: request.casterUuid, concentrationKey: request.concentrationKey ?? null },
                ...(spec.mirror ? { mirror: { kind: spec.mirror, ownerUuid: request.casterUuid } } : {}),
            },
        },
    } as never)) as Actor.Implementation | null;
    if (!actor) return;

    // Actions become abilities on the summon, pointing at their catalog automation.
    const items: Record<string, unknown>[] = (spec.actions ?? []).map((a) => ({
        name: a.name,
        type: "ability",
        img: spec.img ?? "icons/svg/sword.svg",
        system: {
            className: spec.name,
            action: a.action ?? "",
            cost: { text: "—", value: null, resource: "" },
            description: `<p>${a.description}</p>`,
            automationKey: summonActionKey(request.abilityKey, a.name),
        },
    }));
    if (spec.copyWeapon) {
        const weapon = caster.items.find((i) => i.type === "equipment" && (i.system as unknown as EquipmentModel).isHeldWeapon);
        if (weapon) items.push({ ...weapon.toObject(), _id: undefined, name: `Ephemeral ${weapon.name}` });
    }
    if (items.length) await actor.createEmbeddedDocuments("Item", items as never);

    const source = { className: "", abilityName: spec.name, img: spec.img ?? "", duration: spec.duration ?? request.duration };
    const effects = (spec.effects ?? []).map((e) => buildEffectData(e, source));
    if (request.damageBonus) {
        effects.push(
            buildEffectData(
                { name: "Draconic Pact", category: "", modifiers: [{ type: "multiplier", rollType: "all", damageType: "all", value: request.damageBonus }] },
                source,
            ),
        );
    }
    // The duration timer: when it expires, the summon goes (see registerSummonCleanup).
    effects.push(
        foundry.utils.mergeObject(
            buildEffectData({ name: "Summoned", category: "", description: "<p>Disappears when this ends.</p>" }, source),
            { flags: { [SYSTEM_ID]: { summonExpiry: true } } },
        ),
    );
    await actor.createEmbeddedDocuments("ActiveEffect", effects as never);

    if (casterToken && canvas?.scene) {
        const tokens = await Promise.all(
            freeSpaces(casterToken, spec.count ?? 1, size).map((pos, i) =>
                actor.getTokenDocument({ ...pos, name: (spec.count ?? 1) > 1 ? `${spec.name} ${i + 1}` : spec.name } as never),
            ),
        );
        await canvas.scene.createEmbeddedDocuments("Token", tokens.map((t) => t.toObject()) as never);
    }
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: caster as Actor.Stored }),
        content: `<div class="barbs-chat-card"><p>${caster.name} summons <strong>${spec.name}</strong>${(spec.count ?? 1) > 1 ? ` ×${spec.count}` : ""}.</p></div>`,
    });
}

/** Remove every actor (and its tokens) created by one summoning. */
export async function dismissSummon(summonId: string): Promise<void> {
    const actors = game.actors?.filter((a) => foundry.utils.getProperty(a, `flags.${SYSTEM_ID}.summon.summonId`) === summonId) ?? [];
    for (const actor of actors) await removeSummonActor(actor as Actor.Implementation);
}

async function removeSummonActor(actor: Actor.Implementation): Promise<void> {
    for (const scene of game.scenes ?? []) {
        const ids = scene.tokens.filter((t) => t.actorId === actor.id).map((t) => t.id!);
        if (ids.length) await scene.deleteEmbeddedDocuments("Token", ids);
    }
    await actor.delete();
}

/** When a summon's duration effect expires, remove that token (or the whole summon if it's the base actor's). */
export function registerSummonCleanup(): void {
    Hooks.on("deleteActiveEffect", (effect: ActiveEffect.Implementation) => {
        if (!game.user?.isActiveGM || !foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.summonExpiry`)) return;
        const actor = effect.parent as Actor.Implementation | null;
        if (!(actor instanceof Actor)) return;
        void (async () => {
            if (actor.isToken) {
                await actor.token?.delete();
                const base = game.actors?.get(actor.id ?? "");
                if (base && !game.scenes?.some((s) => s.tokens.some((t) => t.actorId === base.id))) await base.delete();
            } else {
                await removeSummonActor(actor);
            }
        })();
    });
}
