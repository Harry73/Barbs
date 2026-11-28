/**
 * One-time migration: move effects' Changes into the unified Bonuses list on the Barbs tab.
 *
 * Attack-stat change keys (damage multipliers, penetration, accuracy, lethality, lifesteal, unblockable, crit damage,
 * combo chance, crit chance) no longer exist: they become the matching attack bonus. Other plain "add" changes to
 * Barbs stats become stat bonus rows. Anything else (other change types, non-system keys) stays a raw change.
 *
 * Runs once per world, on the active GM's client, and records that in a world setting.
 * TODO: delete this file (and its registration in barbs.ts) once the world has been loaded with it.
 */
import { SYSTEM_ID } from "./config.ts";

const SETTING = "migratedUnifiedBonuses";

interface Change {
    key: string;
    type: string;
    value: string;
}

interface Bonus {
    type: string;
    rollType: string;
    damageType: string;
    weapon: string;
    value: string;
    onCrit: boolean;
    conditions: string;
    key: string;
}

const bonus = (type: string, value: string, extra: Partial<Bonus> = {}): Bonus => ({
    type,
    rollType: "all",
    damageType: "all",
    weapon: "",
    value,
    onCrit: false,
    conditions: "",
    key: "",
    ...extra,
});

/** The bonus a change becomes, or null to keep it as a raw change. */
function toBonus(change: Change): Bonus | null {
    if (change.type !== "add" || !change.key.startsWith("system.")) return null;
    const value = String(change.value);
    const combat = /^system\.combat\.(accuracy|lethality|lifesteal|unblockable|critDamage|comboChance)$/.exec(change.key);
    if (combat) return bonus(combat[1], value);
    const multiplier = /^system\.damageMultiplier\.(.+)$/.exec(change.key);
    if (multiplier) return bonus("multiplier", value, { damageType: multiplier[1] });
    const penetration = /^system\.penetration\.(.+)$/.exec(change.key);
    if (penetration) return bonus("penetration", value, { damageType: penetration[1] });
    if (change.key === "system.stats.critChance.bonus") return bonus("critChance", value);
    return bonus("stat", value, { key: change.key });
}

async function migrateEffect(effect: ActiveEffect.Implementation): Promise<boolean> {
    const source = effect._source as unknown as { system?: { changes?: Change[]; modifiers?: Bonus[] } };
    const changes = source.system?.changes ?? [];
    const converted = changes.map((c) => ({ change: c, bonus: toBonus(c) }));
    if (!converted.some((c) => c.bonus)) return false;
    await effect.update({
        "system.changes": converted.filter((c) => !c.bonus).map((c) => c.change),
        "system.modifiers": [...(source.system?.modifiers ?? []), ...converted.flatMap((c) => (c.bonus ? [c.bonus] : []))],
    } as never);
    return true;
}

export function registerMigrations(): void {
    game.settings?.register(SYSTEM_ID as never, SETTING as never, { scope: "world", config: false, type: Boolean, default: false } as never);
}

export async function runMigrations(): Promise<void> {
    if (!game.users?.activeGM?.isSelf) return;
    if (game.settings?.get(SYSTEM_ID as never, SETTING as never)) return;
    const effects: ActiveEffect.Implementation[] = [];
    const collect = (doc: { effects?: Iterable<unknown>; items?: Iterable<{ effects?: Iterable<unknown> }> }) => {
        for (const e of doc.effects ?? []) effects.push(e as ActiveEffect.Implementation);
        for (const item of doc.items ?? []) for (const e of item.effects ?? []) effects.push(e as ActiveEffect.Implementation);
    };
    for (const actor of game.actors ?? []) collect(actor as never);
    for (const item of game.items ?? []) collect(item as never);
    for (const scene of game.scenes ?? []) {
        for (const token of scene.tokens) if (token.actor && !token.actorLink) collect(token.actor as never);
    }
    let count = 0;
    for (const effect of effects) {
        try {
            if (await migrateEffect(effect)) count++;
        } catch (error) {
            console.error(`Barbs | couldn't migrate ${effect.uuid}`, error);
        }
    }
    await game.settings?.set(SYSTEM_ID as never, SETTING as never, true as never);
    if (count) ui.notifications?.info(`Barbs: moved ${count} effect(s)' changes into the Bonuses list.`);
}
