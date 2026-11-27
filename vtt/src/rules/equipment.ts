/**
 * Equip limits: one item per slot, except rings (two). A two-handed item fills both hands, so it can't share them
 * with a main-hand or offhand item. Unslotted items ("none") have no limit; being equipped there means nothing.
 *
 * Pure rules, no Foundry APIs, so the smoke test can exercise it.
 */
import { EQUIPMENT_SLOTS, type EquipmentSlot } from "../config.ts";

/** How many items a slot holds, where it isn't 1. */
export const SLOT_LIMITS: Partial<Record<EquipmentSlot, number>> = { ring: 2 };

/** Slots that can't be filled at the same time as this one. */
const BLOCKS: Partial<Record<EquipmentSlot, EquipmentSlot[]>> = {
    twoHand: ["mainHand", "offhand"],
    mainHand: ["twoHand"],
    offhand: ["twoHand"],
};

export interface EquippedItem {
    name: string;
    slot: string;
}

/**
 * Why an item can't be equipped in `slot` next to what's already equipped (not including the item itself), or null
 * if it fits.
 */
export function equipConflict(slot: string, equipped: EquippedItem[]): string | null {
    if (slot === "none" || !(slot in EQUIPMENT_SLOTS)) return null;
    const key = slot as EquipmentSlot;
    const label = EQUIPMENT_SLOTS[key];
    const names = (items: EquippedItem[]) => items.map((i) => i.name).join(" and ");

    const blocking = equipped.filter((e) => BLOCKS[key]?.includes(e.slot as EquipmentSlot));
    if (blocking.length) {
        return key === "twoHand"
            ? `A two-handed item needs both hands free: unequip ${names(blocking)} first.`
            : `${names(blocking)} is two-handed, so the ${label} slot isn't free: unequip it first.`;
    }

    const limit = SLOT_LIMITS[key] ?? 1;
    const same = equipped.filter((e) => e.slot === key);
    if (same.length >= limit) {
        return `Only ${limit} ${label.toLowerCase()} item${limit > 1 ? "s" : ""} can be equipped: unequip ${names(same)} first.`;
    }
    return null;
}
