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
