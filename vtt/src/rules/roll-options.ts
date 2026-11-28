/**
 * Roll options: the facts predicates are tested against (see predicate.ts). Built from live documents, so this module
 * uses Foundry APIs; the matching itself stays pure.
 *
 * Who's who depends on the side:
 *   - Attacker side (a roll modifier on your own effects): `self:` is you, `target:` the creature you're hitting.
 *   - Defender side (an "incoming" modifier on the defender's effects): `self:` is the defender, `attacker:` the one
 *     attacking, `attack:` the attack's own roll options (`attack:roll:physical`, `attack:ranged`), and
 *     `origin:attacker` when the effect carrying the modifier was put there by the attacker ("from your spells").
 */
import { RANGED_WEAPONS, SYSTEM_ID } from "../config.ts";
import type { CreatureModel } from "../data/actor/creature.ts";
import type { EquipmentModel } from "../data/item/models.ts";
import { slug } from "./predicate.ts";

/**
 * Do two actor UUIDs mean the same creature? A character with an unlinked token exists twice: the world actor
 * ("Actor.abc", whose sheet is opened from the sidebar) and the token's copy ("Scene.x.Token.y.Actor.abc"). A mark
 * applied by one should count for the other. Two different unlinked tokens of the same actor (three goblins) stay
 * distinct, since neither is the world actor.
 */
export function sameActor(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false;
    if (a === b) return true;
    const id = (uuid: string) => /(?:^|\.)Actor\.([^.]+)$/.exec(uuid)?.[1];
    const isWorld = (uuid: string) => /^Actor\.[^.]+$/.test(uuid);
    return (isWorld(a) || isWorld(b)) && !!id(a) && id(a) === id(b);
}

/** Creature types from the comma-separated details field: "Undead, construct" → ["undead", "construct"]. */
export function creatureTypes(actor: Actor.Implementation | null | undefined): string[] {
    const text = (actor?.system as unknown as CreatureModel | undefined)?.details?.creatureTypes ?? "";
    return text
        .split(",")
        .map((t) => slug(t))
        .filter(Boolean);
}

/**
 * Facts about one creature, under a prefix (`self`, `target`, `attacker`). `observerUuid` adds `<prefix>:mark:<x>`
 * for effects and statuses that observer put on this creature ("the target you marked").
 */
export function actorOptions(actor: Actor.Implementation | null | undefined, prefix: string, observerUuid?: string): string[] {
    if (!actor) return [];
    const out: string[] = [];
    for (const type of creatureTypes(actor)) out.push(`${prefix}:type:${type}`);
    for (const status of actor.statuses ?? []) out.push(`${prefix}:status:${status}`);
    let buffs = 0;
    for (const effect of actor.allApplicableEffects()) {
        if (!effect.active) continue;
        const name = slug(effect.name ?? "");
        if (name) out.push(`${prefix}:effect:${name}`);
        if ((effect.system as unknown as { category?: string }).category === "buff") buffs++;
        if (observerUuid && sameActor(foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.casterUuid`) as string, observerUuid)) {
            if (name) out.push(`${prefix}:mark:${name}`);
            for (const status of effect.statuses) out.push(`${prefix}:mark:${status}`);
        }
    }
    out.push(`${prefix}:buffs:${buffs}`);
    const health = (actor.system as unknown as CreatureModel).derived?.resources?.health;
    if (health?.max) {
        const percent = Math.round((100 * health.value) / health.max);
        out.push(`${prefix}:health:percent:${percent}`, `${prefix}:health:missing-percent:${100 - percent}`);
    }
    const level = (actor.system as unknown as CreatureModel).derived?.level;
    if (typeof level === "number") out.push(`${prefix}:level:${level}`);
    if (prefix === "self" && game.combat?.started && game.combat.combatants.some((c) => c.actor?.id === actor.id)) out.push("in-combat");
    return out;
}

export interface RollFacts {
    rollType: string;
    weapons: Item.Implementation[];
    hand?: string;
    tags?: string[];
    abilityName?: string | null;
    className?: string | null;
    /** An area attack (not aimed at one creature). */
    area?: boolean;
    /** The ammunition a ranged attack fires, if any. */
    ammo?: Item.Implementation | null;
}

/** Facts about the roll itself: what kind, with what weapon, from which ability. */
export function rollOptions(facts: RollFacts): string[] {
    const out = [`roll:${facts.rollType}`];
    const categories = facts.weapons.map((w) => (w.system as unknown as EquipmentModel).weapon.category).filter(Boolean);
    for (const c of categories) out.push(`weapon:${c}`, RANGED_WEAPONS.includes(c) ? "weapon:ranged" : "weapon:melee");
    if (!categories.length) out.push("weapon:none");
    // Melee or ranged: physical attacks go by the weapon (unarmed is melee); spells and psionics are ranged.
    const ranged = facts.rollType === "physical" ? categories.some((c) => RANGED_WEAPONS.includes(c)) : true;
    out.push(ranged ? "ranged" : "melee");
    if (facts.hand) out.push(`hand:${facts.hand}`);
    if (facts.abilityName) out.push(`ability:${slug(facts.abilityName)}`);
    if (facts.className) out.push(`ability:class:${slug(facts.className)}`);
    for (const tag of facts.tags ?? []) out.push(`ability:tag:${slug(tag)}`);
    if (facts.area) out.push("area");
    // Which items made the attack, so effects on a weapon or ammo apply only to its own attacks (effectAppliesToAttack).
    for (const w of facts.weapons) out.push(`item:${w.id}`);
    if (facts.ammo) out.push(`ammo:${facts.ammo.id}`);
    return out;
}

/**
 * Whether an effect's bonuses and attacker-side triggers apply to an attack, given the attack's roll options. It
 * depends on where the effect lives:
 *
 *   - On a weapon: physical attacks made with that weapon, plus spells and other non-physical rolls while it's held
 *     (a staff's magic damage bonus).
 *   - On ammunition: the shots it's fired with.
 *   - Anywhere else (the actor, armor, rings): every attack.
 *
 * With no attack at all (a kill by a DoT tick or by trigger damage), weapon and ammo effects don't apply.
 * Unequipped gear is already suppressed by the effect model.
 */
export function effectAppliesToAttack(effect: ActiveEffect.Implementation, options: Iterable<string> | null | undefined): boolean {
    const item = effect.parent;
    if (!(item instanceof Item) || item.type !== "equipment") return true;
    const equipment = item.system as unknown as EquipmentModel;
    if (!equipment.ammo && !equipment.isWeapon) return true;
    if (!options) return false;
    const facts = options instanceof Set ? (options as Set<string>) : new Set(options);
    if (equipment.ammo) return facts.has(`ammo:${item.id}`);
    if (facts.has("roll:physical")) return facts.has(`item:${item.id}`);
    return equipment.isHeldWeapon;
}

/** Grid distance between two actors' first tokens, in feet, or null when either isn't on the canvas. */
export function distanceBetween(a: Actor.Implementation | null | undefined, b: Actor.Implementation | null | undefined): number | null {
    const ta = (a?.getActiveTokens?.(true) as Token.Implementation[] | undefined)?.[0];
    const tb = (b?.getActiveTokens?.(true) as Token.Implementation[] | undefined)?.[0];
    if (!ta || !tb || !canvas?.grid) return null;
    const grid = canvas.grid as unknown as { measurePath(waypoints: object[]): { distance: number } };
    return Math.round(grid.measurePath([ta.center, tb.center]).distance);
}

/**
 * The defender's view of an incoming attack, for "incoming" modifiers on the defender's effects. `effectOrigin` is
 * the caster of the particular effect being tested, for `origin:attacker` ("from your spells").
 */
export function defenderOptions(
    defender: Actor.Implementation,
    attacker: Actor.Implementation | null,
    attack: string[],
    effectOrigin?: string,
): Set<string> {
    const out = [...actorOptions(defender, "self"), ...actorOptions(attacker, "attacker"), ...attack.map((o) => `attack:${o}`)];
    if (attacker) out.push("attacked");
    const distance = distanceBetween(attacker, defender);
    if (distance !== null) out.push(`attacker:distance:${distance}`);
    if (attacker && sameActor(effectOrigin, attacker.uuid)) out.push("origin:attacker");
    return new Set(out);
}

/** A creature's numbers for formulas (`@self`, `@target`, `@attacker`); see formula.ts. */
export interface ActorData {
    buffs: number;
    conditions: number;
    level: number;
    health: { value: number; max: number; percent: number; missingPercent: number };
    statuses: Record<string, number>;
    stacks: Record<string, number>;
    marks: Record<string, number>;
    types: Record<string, number>;
}

/**
 * Formula data for one creature. `observerUuid` fills `marks` with effects that observer put on it. Safe to call
 * while the actor is being prepared (it only reads effects and source data).
 */
export function actorData(actor: Actor.Implementation | null | undefined, observerUuid?: string): ActorData {
    const data: ActorData = {
        buffs: 0,
        conditions: 0,
        level: 0,
        health: { value: 0, max: 0, percent: 0, missingPercent: 0 },
        statuses: {},
        stacks: {},
        marks: {},
        types: {},
    };
    if (!actor) return data;
    const bump = (record: Record<string, number>, key: string) => (record[key] = (record[key] ?? 0) + 1);
    for (const type of creatureTypes(actor)) data.types[type] = 1;
    for (const effect of actor.allApplicableEffects()) {
        if (!effect.active) continue;
        const category = (effect.system as unknown as { category?: string }).category;
        if (category === "buff") data.buffs++;
        if (category === "condition") data.conditions++;
        const name = slug(effect.name ?? "");
        if (name) bump(data.stacks, name);
        const statuses = effect.statuses ?? [];
        for (const status of statuses) bump(data.statuses, status);
        if (observerUuid && sameActor(foundry.utils.getProperty(effect, `flags.${SYSTEM_ID}.casterUuid`) as string, observerUuid)) {
            if (name) bump(data.marks, name);
            for (const status of statuses) bump(data.marks, status);
        }
    }
    const system = actor.system as unknown as CreatureModel | undefined;
    const health = system?.derived?.resources?.health;
    if (health?.max) {
        const percent = Math.round((100 * health.value) / health.max);
        data.health = { value: health.value, max: health.max, percent, missingPercent: 100 - percent };
    }
    if (typeof system?.derived?.level === "number") data.level = system.derived.level;
    return data;
}
