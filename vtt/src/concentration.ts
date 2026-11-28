/**
 * Concentration. Casting a concentration ability (and choosing to concentrate) puts a "Concentrating: <ability>"
 * marker on the caster, and links everything the cast creates to it: effects on the caster, effects applied from the
 * card to targets, and summons. Ending concentration (deleting the marker, failing a concentration check, being
 * Downed) ends all of them.
 *
 * Rulebook: you can concentrate on up to your Concentration Limit. When you take damage you roll to keep it (a
 * relevant skill like Pain Tolerance, otherwise d100 + Focus); on a failure all concentration breaks.
 */
import { skillKey, SYSTEM_ID } from "./config.ts";
import type { CreatureModel } from "./data/actor/creature.ts";
import { esc } from "./chat/html.ts";

export interface ConcentrationMarker {
    key: string;
    ability: string;
}

/** The rulebook's name for the skill that keeps concentration (skills are named "Group: Skill"). */
const PAIN_TOLERANCE = "Athletics: Pain Tolerance";

/** The caster's Concentrating markers. */
export function concentrationMarkers(actor: Actor.Implementation | null | undefined): ActiveEffect.Implementation[] {
    return ([...(actor?.effects ?? [])] as ActiveEffect.Implementation[]).filter(
        (e) => !!foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.concentration.key`),
    );
}

/** Marker effect data for a new concentration. The key links everything the cast creates. */
export function concentrationMarkerData(actor: Actor.Implementation, ability: string, img: string, key: string): Record<string, unknown> {
    const limit = (actor.system as unknown as CreatureModel).derived?.stats?.concentrationLimit?.value ?? 0;
    const current = concentrationMarkers(actor).length;
    if (current >= limit) {
        ui.notifications?.warn(
            `${actor.name} is already concentrating on ${current} effect(s), at or over their Concentration Limit (${limit}). Drop one (delete its Concentrating effect) or don't start this one.`,
        );
    }
    return {
        name: `Concentrating: ${ability}`,
        img,
        description: `<p>Concentrating on ${esc(ability)}. Delete this effect to end it and everything it maintains.</p>`,
        showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
        system: { category: "" },
        flags: { [SYSTEM_ID]: { concentration: { key, ability } satisfies ConcentrationMarker } },
    };
}

/** End everything linked to a concentration: effects on any creature, and summons. Runs on the active GM's client. */
export async function endConcentration(key: string): Promise<void> {
    const actors = new Set<Actor.Implementation>([...(game.actors ?? [])] as Actor.Implementation[]);
    for (const scene of game.scenes ?? []) {
        for (const token of scene.tokens) if (token.actor && !token.actorLink) actors.add(token.actor as Actor.Implementation);
    }
    for (const actor of actors) {
        const linked = [...actor.effects].filter((e) => foundry.utils.getProperty(e, `flags.${SYSTEM_ID}.concentrationKey`) === key);
        if (linked.length) await actor.deleteEmbeddedDocuments("ActiveEffect", linked.map((e) => e.id!) as never);
    }
    const { dismissSummon } = await import("./summons.ts");
    const summonIds = new Set(
        [...(game.actors ?? [])]
            .filter((a) => foundry.utils.getProperty(a, `flags.${SYSTEM_ID}.summon.concentrationKey`) === key)
            .map((a) => foundry.utils.getProperty(a, `flags.${SYSTEM_ID}.summon.summonId`) as string),
    );
    for (const id of summonIds) if (id) await dismissSummon(id);
}

/** Drop all of a creature's concentration (a failed check, being Downed). */
export async function dropConcentration(actor: Actor.Implementation): Promise<string[]> {
    const markers = concentrationMarkers(actor);
    if (markers.length) await actor.deleteEmbeddedDocuments("ActiveEffect", markers.map((e) => e.id!) as never);
    return markers.map((m) => String(foundry.utils.getProperty(m, `flags.${SYSTEM_ID}.concentration.ability`)));
}

/**
 * Roll to keep concentration after damage: Pain Tolerance if they have it, otherwise d100 + Focus, plus any
 * Concentration Bonus. A failure drops all of it.
 */
export async function concentrationCheck(actor: Actor.Implementation, dc: number): Promise<boolean> {
    const d = (actor.system as unknown as CreatureModel).derived;
    const pain = actor.items.find((i) => i.type === "skill" && i.name.toLowerCase() === PAIN_TOLERANCE.toLowerCase());
    // The skill's own modifier, plus bonuses to every skill and to Pain Tolerance specifically (gear can add either).
    const skillBonus = pain ? (pain.system as unknown as { modifier: number }).modifier + (d.skillBonus ?? 0) + (d.skillBonuses?.[skillKey(PAIN_TOLERANCE)] ?? 0) : 0;
    const formula = pain ? "1d100 + @skill[Pain Tolerance]" : "1d100 + @fcs[FCS]";
    const bonus = d.combat?.concentrationBonus ?? 0;
    const roll = await new Roll(`${formula}${bonus ? " + @bonus[concentration]" : ""}`, { ...actor.getRollData(), skill: skillBonus, bonus }).evaluate();
    const kept = (roll.total ?? 0) >= dc;
    const dropped = kept ? [] : await dropConcentration(actor);
    await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor as Actor.Stored }),
        flavor: `Concentration check vs DC ${dc}: ${kept ? "<strong>kept</strong>" : `broken${dropped.length ? ` (${dropped.map(esc).join(", ")} ended)` : ""}`}`,
    });
    return kept;
}

/** Deleting a Concentrating marker (by hand, by undo, by a failed check) ends what it maintained. */
export function registerConcentrationHooks(): void {
    Hooks.on("deleteActiveEffect", (effect: ActiveEffect.Implementation) => {
        if (!game.users?.activeGM?.isSelf) return;
        const key = foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.concentration.key`) as string | undefined;
        if (key) void endConcentration(key);
    });
}
