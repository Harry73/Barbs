/**
 * Pure damage math, kept free of Foundry APIs so it can be unit tested headlessly.
 *
 * Mirrors the Roll20 API:
 *   - Damage of each type is (dice + flat) * multiplier, rounded, then doubled (by default) on a crit.
 *   - Multipliers are grouped by the character they come from. Within one character's pool they add (+25% from a
 *     passive and +25% from their gear = +50%), across characters they multiply (+50% from you and -20% from an enemy's
 *     Weaken = 1.5 * 0.8), which rewards teamwork: two allies' buffs multiply, one ally's two buffs add.
 *   - Only physical rolls can crit.
 *   - Physical damage is reduced by a flat AC (scaled down by armor penetration), magic damage by a percentage MR
 *     (minus magic penetration), psychic damage isn't reduced. Vulnerability then increases what gets through, and
 *     general damage reduction applies to everything last. (The rulebook doesn't pin down where vulnerability goes;
 *     after AC/MR means armor can't swallow a vulnerability bonus.)
 */
import { ELEMENTS, type DamageType } from "../config.ts";

export type DamageKey = DamageType | "healing";

/** Multiplier targets: a specific damage type, every elemental (magic) type, or everything. */
export type MultiplierKey = DamageKey | "allMagic" | "all";

export function isMagic(type: DamageKey): boolean {
    return (ELEMENTS as readonly string[]).includes(type);
}

/** The pool a creature's own multipliers go in: its passives, gear, and the buffs it cast on itself. */
export const SELF_POOL = "self";

/** Percent-sums per pool (the character a multiplier comes from), e.g. { self: 25, "Actor.abc": -20 } for one key. */
export type SourceMultipliers = Map<string, number>;

/**
 * The same thing as plain data, for chat card flags: multiplier key -> [pool, percent] pairs. Pools are actor UUIDs
 * ("Actor.abc"), and Foundry expands dotted keys in flags into nested objects, so they can't be object keys.
 */
export type MultiplierPools = Record<string, [string, number][]>;

export function poolsToRecord(multipliers: Map<MultiplierKey, SourceMultipliers>): MultiplierPools {
    return Object.fromEntries([...multipliers].map(([key, pools]) => [key, [...pools]]));
}

export function poolsFromRecord(record: MultiplierPools | undefined): Map<MultiplierKey, SourceMultipliers> {
    // Cards from before the pairs stored the pools as objects, which Foundry mangled; they read as having none.
    return new Map(Object.entries(record ?? {}).map(([key, pools]) => [key as MultiplierKey, new Map(Array.isArray(pools) ? pools : [])]));
}

/** A copy of `multipliers` with `percent` more in one pool of one key. */
export function withMultiplier(
    multipliers: Map<MultiplierKey, SourceMultipliers>,
    key: MultiplierKey,
    pool: string,
    percent: number,
): Map<MultiplierKey, SourceMultipliers> {
    const copy = new Map([...multipliers].map(([k, v]) => [k, new Map(v)] as const));
    const pools = copy.get(key) ?? new Map<string, number>();
    pools.set(pool, (pools.get(pool) ?? 0) + percent);
    copy.set(key, pools);
    return copy;
}

/** Combine the multipliers that apply to a damage type into one factor. */
export function multiplierFor(type: DamageKey, multipliers: Map<MultiplierKey, SourceMultipliers>): number {
    const keys: MultiplierKey[] = [type, "all"];
    if (isMagic(type)) keys.push("allMagic");

    const perPool = new Map<string, number>();
    for (const key of keys) {
        for (const [pool, percent] of multipliers.get(key) ?? []) {
            perPool.set(pool, (perPool.get(pool) ?? 0) + percent);
        }
    }
    let factor = 1;
    for (const percent of perPool.values()) factor *= 1 + percent / 100;
    return factor;
}

/** Final amount of one damage type after multipliers and crit. Never negative. */
export function finalDamage(base: number, multiplier: number, critFactor: number): number {
    return Math.max(0, Math.round(base * multiplier * critFactor));
}

/** d100 crit check: crit on a roll of at least 101 - chance, so 10% chance crits on 91-100. */
export function isCritRoll(d100: number, chance: number): boolean {
    return d100 >= Math.max(0, 100 - chance + 1);
}

export interface Defenses {
    /** Flat physical reduction. */
    ac: number;
    /** Percent reduction for all magic damage. */
    magicResist: number;
    /** Extra percent MR per element, e.g. { fire: 20 }. */
    elementResist: Partial<Record<DamageType, number>>;
    /** General damage reduction percent, applied to every type last. */
    damageReduction: number;
    /** Percent increased damage taken, keyed by type plus "all" and "magic" (every element). */
    vulnerability?: Partial<Record<string, number>>;
}

/** Total vulnerability that applies to a damage type: its own, plus "magic" for elements, plus "all". */
export function vulnerabilityFor(type: DamageKey, vulnerability: Partial<Record<string, number>> = {}): number {
    return (vulnerability[type] ?? 0) + (isMagic(type) ? (vulnerability.magic ?? 0) : 0) + (vulnerability.all ?? 0);
}

export interface ReducedDamage {
    type: DamageKey;
    incoming: number;
    taken: number;
}

const clampPct = (v: number) => Math.clamp(v, 0, 100);

/**
 * Reduce incoming damage by the defender's stats.
 * @param penetration Percent penetration per damage type. For physical it scales AC down; for magic it subtracts from MR.
 */
export function reduceDamage(
    incoming: Partial<Record<DamageKey, number>>,
    penetration: Partial<Record<DamageKey, number>>,
    defenses: Defenses,
): { parts: ReducedDamage[]; total: number } {
    const gdrFactor = (100 - clampPct(defenses.damageReduction)) / 100;
    const parts: ReducedDamage[] = [];
    for (const [type, amount] of Object.entries(incoming) as [DamageKey, number][]) {
        if (!amount || amount <= 0 || type === "healing") continue;
        const pen = penetration[type] ?? 0;
        let reduced: number;
        if (type === "physical") {
            const ac = Math.max(0, defenses.ac) * (1 - clampPct(pen) / 100);
            reduced = Math.max(0, amount - ac);
        } else if (type === "psychic") {
            reduced = amount;
        } else {
            const mr = clampPct(defenses.magicResist + (defenses.elementResist[type] ?? 0) - pen);
            reduced = amount * (1 - mr / 100);
        }
        const vulnerable = 1 + vulnerabilityFor(type, defenses.vulnerability) / 100;
        const taken = Math.max(0, Math.round(reduced * vulnerable * gdrFactor));
        parts.push({ type, incoming: amount, taken });
    }
    return { parts, total: parts.reduce((sum, p) => sum + p.taken, 0) };
}

export interface HealthState {
    health: number;
    /** Shielding (temporary health) absorbs damage before health. Defaults to 0. */
    shielding?: number;
    maxHealth: number;
    downed: number;
    maxDowned: number;
    /** Currently Downed (unconscious). Can be true with health above 0 after being stabilized by healing. */
    isDowned: boolean;
}

export interface HealthChange {
    health: number;
    shielding: number;
    downed: number;
    /** Health dropped to 0 from above. */
    becameDowned: boolean;
    /** Downed Health dropped to 0. */
    died: boolean;
    /** Healing while Downed exceeded the missing Downed Health: wake up prone. */
    revived: boolean;
    /** Healing while Downed didn't exceed the missing Downed Health: stop death saves, wake after 1d4 turns. */
    stabilized: boolean;
}

/**
 * Apply damage (positive) or healing (negative) to health, following the Patch 1.3 death save rules (shielding
 * soaks damage first):
 *   - At 0 health you're Downed. Damage taken while Downed comes out of Downed Health; at 0 you die.
 *   - Healing while Downed raises health as normal. If the healing is greater than your missing Downed Health you
 *     wake up prone; otherwise you're stabilized and wake after missing 1d4 turns.
 */
export function applyHealthChange(state: HealthState, amount: number): HealthChange {
    let { health, downed } = state;
    let shielding = state.shielding ?? 0;
    const result = { becameDowned: false, died: false, revived: false, stabilized: false };

    if (amount > 0 && shielding > 0) {
        const absorbed = Math.min(shielding, amount);
        shielding -= absorbed;
        amount -= absorbed;
    }

    if (amount >= 0) {
        if (state.isDowned && health === 0) {
            downed = Math.max(0, downed - amount);
            result.died = downed === 0;
        } else {
            // Overflow damage past 0 doesn't carry into Downed Health; you're just downed.
            health = Math.max(0, health - amount);
            result.becameDowned = health === 0 && !state.isDowned;
        }
    } else {
        const healing = -amount;
        health = Math.min(state.maxHealth, health + healing);
        if (state.isDowned) {
            if (healing > state.maxDowned - downed) result.revived = true;
            else result.stabilized = true;
        }
    }
    return { health, shielding, downed, ...result };
}
