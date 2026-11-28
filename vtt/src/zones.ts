/**
 * Zones: areas that stay on the map and act on creatures in them (Whirlpool, Burn Trail, Frozen Arena, Cold Shoulder's
 * aura fields). An ability with `area.zone` places its area as a real Region with a "Barbs zone" behavior, which
 * Foundry calls when tokens enter, leave, or start/end their turn inside it.
 *
 * A zone can deal damage (rolled with the caster's bonuses, like any of their spells), apply an effect (rolling CR for
 * conditions), and post a reminder. Effects marked "while inside" come off when the creature leaves. It can also be
 * difficult terrain, through core's movement cost behavior.
 *
 * The region lives as long as a "Zone: <ability>" effect on the caster: the ability's duration, the caster's
 * concentration if it's a concentration ability, or until that effect is deleted or the cast is undone.
 */
import { SYSTEM_ID } from "./config.ts";
import { esc } from "./chat/html.ts";
import { deleteExisting } from "./documents/delete-existing.ts";

const fields = foundry.data.fields;
// fvtt-types doesn't describe region behavior types well; this is core's RegionBehaviorType base class.
const RegionBehaviorType = (foundry.data.regionBehaviors as unknown as { RegionBehaviorType: new (...args: never[]) => object })
    .RegionBehaviorType as (new (...args: never[]) => object) & { _createEventsField(o?: object): unknown };

/** Region events a zone can react to. */
const ZONE_EVENTS = ["tokenEnter", "tokenExit", "tokenTurnStart", "tokenTurnEnd"] as const;

interface ZoneSystem {
    events: Set<string>;
    zoneKey: string;
    casterUuid: string;
    /** Who the zone affects, relative to the caster's token disposition. */
    affects: "enemies" | "allies" | "all";
    casterDisposition: number;
    damageFormula: string;
    damageType: string;
    effectData: Record<string, unknown> | null;
    /** The effect comes off when the creature leaves (an aura-like field). */
    whileInside: boolean;
    note: string;
    abilityName: string;
}

export class ZoneBehaviorType extends RegionBehaviorType {
    static defineSchema() {
        return {
            events: RegionBehaviorType._createEventsField({ events: [...ZONE_EVENTS] }),
            zoneKey: new fields.StringField({ required: true, blank: true, initial: "" }),
            casterUuid: new fields.StringField({ required: true, blank: true, initial: "" }),
            affects: new fields.StringField({ required: true, choices: ["enemies", "allies", "all"], initial: "enemies" }),
            casterDisposition: new fields.NumberField({ required: true, integer: true, initial: 0 }),
            damageFormula: new fields.StringField({ required: true, blank: true, initial: "" }),
            damageType: new fields.StringField({ required: true, blank: true, initial: "physical" }),
            effectData: new fields.ObjectField({ required: false, nullable: true, initial: null }),
            whileInside: new fields.BooleanField({ initial: false }),
            note: new fields.StringField({ required: true, blank: true, initial: "" }),
            abilityName: new fields.StringField({ required: true, blank: true, initial: "" }),
        } as never;
    }

    /** Does the zone affect this token, given who placed it? */
    #affects(token: TokenDocument.Implementation): boolean {
        const self = this as unknown as ZoneSystem;
        if (self.affects === "all") return true;
        const same = token.disposition === self.casterDisposition;
        return self.affects === "allies" ? same : !same && token.disposition !== CONST.TOKEN_DISPOSITIONS.SECRET;
    }

    async _handleRegionEvent(event: { name: string; user: User; data: { token?: TokenDocument.Implementation } }): Promise<void> {
        const self = this as unknown as ZoneSystem;
        // Each event is handled once: by whoever moved the token, or advanced the turn.
        if (!event.user.isSelf) return;
        const token = event.data.token;
        const actor = token?.actor as Actor.Implementation | null | undefined;
        if (!token || !actor || !this.#affects(token)) return;
        const { requestOnActor, requestGM } = await import("./socket.ts");
        const sourceName = self.abilityName || "Zone";

        if (event.name === "tokenExit") {
            if (!self.whileInside) return;
            for (const effect of [...actor.effects]) {
                if (foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.zoneKey`) !== self.zoneKey) continue;
                if (effect.isOwner) await deleteExisting(actor, "ActiveEffect", [effect.id!]);
                else await requestGM("deleteEffect", effect.uuid);
            }
            return;
        }

        if (self.damageFormula) {
            const caster = (await fromUuid(self.casterUuid)) as Actor.Implementation | null;
            const { rollZoneDamage } = await import("./abilities/use.ts");
            const rolled = caster ? await rollZoneDamage(caster, self.damageFormula, self.damageType as never) : null;
            if (rolled) {
                // A zone's damage isn't an attack (no Evasion or blocks), like a DoT.
                await requestOnActor(actor, "damage", {
                    hits: rolled.hits,
                    penetration: rolled.penetration,
                    sourceName: `${caster?.name}'s ${sourceName}`,
                    attack: false,
                    attackerUuid: self.casterUuid,
                });
            }
        }
        if (self.effectData && !(self.whileInside && actor.effects.some((e) => foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.zoneKey`) === self.zoneKey))) {
            const data = foundry.utils.deepClone(self.effectData);
            foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.zoneKey`, self.zoneKey);
            // "While inside" effects also come off when the zone goes, since nobody leaves a zone that's deleted.
            if (self.whileInside) foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.zoneWhileInside`, true);
            const isCondition = foundry.utils.getProperty(data, "system.category") === "condition";
            await requestOnActor(actor, "effect", { data, options: { resistible: isCondition, sourceName } });
        }
        if (self.note) {
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
                content: `<div class="barbs-chat-card"><p><strong>${esc(sourceName)}</strong>: ${esc(self.note)}</p></div>`,
            } as never);
        }
    }
}

/**
 * Delete every zone region with this key (its "Zone: <ability>" effect ended), and the "while inside" effects it put
 * on creatures still standing in it. Effects with their own duration (Whirlpool's Immobilize) run out on their own.
 * Runs on the active GM's client.
 */
export async function removeZones(key: string): Promise<void> {
    for (const scene of game.scenes ?? []) {
        const regions = scene.regions.filter((r) => foundry.utils.getProperty(r, `flags.${SYSTEM_ID}.zoneKey`) === key);
        if (regions.length) await deleteExisting(scene, "Region", regions.map((r) => r.id!));
    }
    const actors = new Set<Actor.Implementation>([...(game.actors ?? [])] as Actor.Implementation[]);
    for (const scene of game.scenes ?? []) {
        for (const token of scene.tokens) if (token.actor && !token.actorLink) actors.add(token.actor as Actor.Implementation);
    }
    for (const actor of actors) {
        const inside = actor.effects.filter(
            (e) => foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.zoneKey`) === key && !!foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.zoneWhileInside`),
        );
        if (inside.length) await deleteExisting(actor, "ActiveEffect", inside.map((e) => e.id!));
    }
}

export function registerZones(): void {
    const config = CONFIG as unknown as { RegionBehavior: { dataModels: Record<string, unknown>; typeLabels: Record<string, string>; typeIcons: Record<string, string> } };
    config.RegionBehavior.dataModels.zone = ZoneBehaviorType;
    config.RegionBehavior.typeLabels.zone = "Barbs zone";
    config.RegionBehavior.typeIcons.zone = "fa-solid fa-hurricane";
    // The caster's "Zone: <ability>" effect is the zone's lifetime: when it goes, so does the region.
    Hooks.on("deleteActiveEffect", (effect: ActiveEffect.Implementation) => {
        if (!game.users?.activeGM?.isSelf) return;
        const key = foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.zone.key`) as string | undefined;
        if (key) void removeZones(key);
    });
}
