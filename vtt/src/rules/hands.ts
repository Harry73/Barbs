/**
 * What a creature is holding. A weapon (or shield) equipped in the main hand and another in the offhand is dual
 * wielding; a two-handed item fills both hands, so it never is.
 */
import type { EquipmentModel } from "../data/item/models.ts";

export interface Hands {
    mainHand: Item.Implementation | null;
    offhand: Item.Implementation | null;
    twoHand: Item.Implementation | null;
}

const equipment = (item: Item.Implementation) => item.system as unknown as EquipmentModel;

/** Is this a shield? Shields may have no damage (pure blockers), so they aren't necessarily weapons. */
export function isShield(item: Item.Implementation | null): boolean {
    return !!item && equipment(item).weapon.category === "shield";
}

/** What's equipped in each hand slot. Only weapons and shields count; a torch in the offhand isn't a weapon. */
export function hands(actor: Actor.Implementation | null): Hands {
    const result: Hands = { mainHand: null, offhand: null, twoHand: null };
    for (const item of actor?.items ?? []) {
        if (item.type !== "equipment") continue;
        const e = equipment(item as Item.Implementation);
        if (!e.equipped || !(e.isWeapon || e.weapon.category === "shield")) continue;
        if (e.slot === "mainHand" || e.slot === "offhand" || e.slot === "twoHand") result[e.slot] ??= item as Item.Implementation;
    }
    return result;
}

/** A weapon or shield in each hand. */
export function isDualWielding(actor: Actor.Implementation | null): boolean {
    const h = hands(actor);
    return !!h.mainHand && !!h.offhand;
}

/** A shield in each hand (the Sentinel's "if you are dual wielding shields"). */
export function isDualWieldingShields(actor: Actor.Implementation | null): boolean {
    const h = hands(actor);
    return isShield(h.mainHand) && isShield(h.offhand);
}

/** Conditions a dialog question (or one of its options) can depend on. */
export type HandRequirement = "dualWield" | "dualShields";

export function meetsRequirement(actor: Actor.Implementation | null, requirement: HandRequirement): boolean {
    return requirement === "dualShields" ? isDualWieldingShields(actor) : isDualWielding(actor);
}

/**
 * The weapon categories an ability expects, from its rulebook tags ("bow", "rapier", "unarmed"). A few tags name the
 * weapon differently from the crafting categories. Empty when the tags don't name a weapon, or name one whose category
 * isn't settled (Reaper's "scythe").
 */
const WEAPON_TAGS: Record<string, string> = {
    axe: "axe",
    blunt: "blunt",
    bow: "bow",
    crossbow: "crossbow",
    longblade: "longblade",
    greatsword: "longblade",
    polearm: "polearm",
    shield: "shield",
    shortblade: "shortblade",
    dagger: "shortblade",
    rapier: "fine",
    fine: "fine",
    firearm: "bullets",
    bullets: "bullets",
    unarmed: "unarmed",
};

export function expectedWeaponCategories(tags: string[] | undefined): Set<string> {
    return new Set((tags ?? []).map((t) => WEAPON_TAGS[t.toLowerCase()]).filter((c): c is string => !!c));
}

/**
 * Does what's in hand satisfy an ability's weapon tags? Any one matching category is enough (Champion abilities list
 * several). "Unarmed" is also satisfied by holding no weapon at all.
 */
export function holdsExpectedWeapon(expected: Set<string>, heldCategories: string[]): boolean {
    if (!expected.size) return true;
    if (expected.has("unarmed") && !heldCategories.length) return true;
    return heldCategories.some((c) => expected.has(c));
}
