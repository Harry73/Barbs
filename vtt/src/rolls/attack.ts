/**
 * Builds and evaluates attack, spell, and healing rolls.
 *
 * This is the client-side replacement for the Roll20 API's `Roll` object: start with an ability's or weapon's base
 * damage, fold in roll modifiers from every active effect on the actor (buffs, conditions, equipped gear), then
 * roll. The result is plain data the chat card can render and the "Apply" buttons can act on.
 */
import { bleed, burn, poison } from "../abilities/helpers.ts";
import { SYSTEM_ID } from "../config.ts";
import { ELEMENTS, RANGED_WEAPONS, STATUSES, type ModifierRollType, type RollType, type StatKey } from "../config.ts";
import { snapshotEffect, type RemovedEffect } from "../chat/undo.ts";
import { activePassives, adjustResource, baseComboChance, monkDie, setResource } from "../passives/index.ts";
import type { PassiveDelta, RollInfo } from "../passives/types.ts";
import type { BarbsEffectModel, RollModifierData } from "../data/effect.ts";
import type { CreatureModel } from "../data/actor/creature.ts";
import type { EquipmentModel } from "../data/item/models.ts";
import {
    finalDamage,
    isCritRoll,
    multiplierFor,
    type DamageKey,
    type MultiplierKey,
    type SourceMultipliers,
} from "../rules/damage-math.ts";

/** Crit modifier when no weapon sets one: crits double damage. */
const DEFAULT_CRIT_MODIFIER = 100;

export interface DamagePart {
    type: DamageKey;
    formula: string;
    roll: Roll;
    /** Rolled total before multipliers and crit. */
    base: number;
    multiplier: number;
    total: number;
}

export interface CritResult {
    roll: Roll;
    chance: number;
    threshold: number;
    isCrit: boolean;
    factor: number;
}

/**
 * Damage that depends on the distance to each target ("+2 damage per 5 ft", Distance Shooter). It isn't rolled with
 * the attack; it's worked out per target when damage is applied, scaled by the hit's multiplier and crit factor.
 */
export interface DistanceBonus {
    type: DamageKey;
    /** Formula using @distance (feet). */
    formula: string;
    factor: number;
}

/** One hit of an attack. Most attacks have one; "repeats N times" attacks have N, each reduced by AC separately. */
export interface AttackHit {
    parts: DamagePart[];
    crit: CritResult | null;
    totals: Partial<Record<DamageKey, number>>;
    distanceBonus: DistanceBonus[];
}

/** One target's distance bonus for a hit. Deterministic for the usual formulas; dice would be rolled per target. */
export function evaluateDistanceBonus(bonus: DistanceBonus, distance: number): number {
    const roll = new Roll(bonus.formula, { distance }).evaluateSync({ strict: false } as never);
    return Math.max(0, Math.round((roll.total ?? 0) * bonus.factor));
}

/** An on-hit status granted by a buff (Accursed Blade's Curse), offered as an Apply button on the card. */
export interface OnHitStatus {
    id: string;
    name: string;
    source: string;
    /**
     * A full effect instead of a plain status: Serrated Arrow's Bleed of a rolled amount, Bruiser Arrow's stacking
     * vulnerability. Same shape as an ability EffectSpec (plain data, so it survives in card flags).
     */
    effect?: object;
}

export interface ComboResult {
    roll: Roll;
    chance: number;
    threshold: number;
    success: boolean;
}

export interface AttackResult {
    rollType: RollType;
    /** Combo roll, for abilities tagged "combo". */
    combo: ComboResult | null;
    hits: AttackHit[];
    /** Every damage part across all hits, for summaries that count dice. */
    parts: DamagePart[];
    /** The first hit's crit, for single-hit attacks. */
    crit: CritResult | null;
    notes: string[];
    /** Damage summed across hits. */
    totals: Partial<Record<DamageKey, number>>;
    statuses: OnHitStatus[];
    penetration: Partial<Record<DamageKey, number>>;
    /** Names of single-use effects this roll consumed. */
    consumed: string[];
    /** Snapshots of the consumed effects, so undoing the roll can restore them. */
    consumedEffects: RemovedEffect[];
    /** Passive resources the roll spent or gained (Spotting expended on a bow shot). */
    passiveDeltas: PassiveDelta[];
    rolls: Roll[];
    /** Reduces the targets' Evasion when they dodge, percent. */
    accuracy: number;
    /** Heal the attacker for this percent of the damage dealt. */
    lifesteal: number;
    /** Chance the attack ignores blocks, percent (100 = can't be blocked). Rolled per target when damage is applied. */
    unblockableChance: number;
    /** "Can't miss": targets don't roll Evasion. */
    cannotMiss: boolean;
    /** Lethality: a hit that succeeds instantly kills the target. Null when the attack has none. */
    lethality: { chance: number; lethal: boolean[] } | null;
    /** For this attack only: the target's AC is this much lower against its damage. */
    acReduction: number;
    /** For this attack only: the target's CR is this many points lower against its conditions. */
    crReduction: number;
    /** For this attack only: the target's Evasion is this many points lower when dodging it. */
    evasionReduction: number;
}

interface AttackOptions {
    rollType: RollType;
    /** The weapon used, if any. Lets weapon-specific modifiers ("bow attacks deal +2d8 air") apply. */
    weapon?: Item.Implementation | null;
    /**
     * The offhand weapon, when an ability is used dual wielding. Both weapons' effects apply, weapon-type checks
     * pass if either matches, and scaling comes from whichever weapon's stat is higher.
     */
    offWeapon?: Item.Implementation | null;
}

export class AttackBuilder {
    readonly actor: Actor.Implementation;
    readonly rollType: RollType;
    readonly weapon: Item.Implementation | null;
    readonly offWeapon: Item.Implementation | null;

    #damage = new Map<DamageKey, string[]>();
    #multipliers = new Map<MultiplierKey, SourceMultipliers>();
    #penetration: Partial<Record<DamageKey, number>> = {};
    #critChance = 0;
    #critDamage = 0;
    #canCrit = false;
    #maximize = false;
    #combo: number | null = null;
    #comboBonus = 0;
    #convert: DamageKey | null = null;
    #upgradeDice = false;
    #resourceChanges: { key: string; delta?: number; set?: number }[] = [];
    #notes: string[] = [];
    #statuses: OnHitStatus[] = [];
    /** Percent of physical damage turned into Bleed on hit (Serrated Arrow), by source. */
    #bleedConvert: { percent: number; source: string }[] = [];
    #singleUse = new Set<ActiveEffect.Implementation>();
    /** On-hit statuses with a chance ("25% chance to Stun"), rolled when the attack is. */
    #chanceStatuses: { onHit: OnHitStatus; chance: number }[] = [];
    /** "On crit:" modifiers, applied to hits that crit. */
    #onCrit: { modifier: RollModifierData; source: string; effect: ActiveEffect.Implementation }[] = [];
    /** "This attack only" reductions to the target's defenses (equipment's reduce AC / CR / evasion). */
    #acReduction = 0;
    #crReduction = 0;
    #evasionReduction = 0;
    #cannotMiss = false;
    #accuracy = 0;
    #lethality = 0;
    #lifesteal = 0;
    #unblockable = 0;

    constructor(actor: Actor.Implementation, { rollType, weapon = null, offWeapon = null }: AttackOptions) {
        this.actor = actor;
        this.rollType = rollType;
        this.weapon = weapon;
        this.offWeapon = offWeapon && offWeapon.id !== weapon?.id ? offWeapon : null;
    }

    /** Every weapon this roll is made with: one normally, two when dual wielding. */
    get weapons(): Item.Implementation[] {
        return [this.weapon, this.offWeapon].filter((w): w is Item.Implementation => !!w);
    }

    get #creature(): CreatureModel {
        return this.actor.system as unknown as CreatureModel;
    }

    #stat(key: StatKey): number {
        return this.#creature.derived.stats[key].value;
    }

    addDamage(formula: string | number, type: DamageKey): this {
        const terms = this.#damage.get(type) ?? [];
        terms.push(String(formula));
        this.#damage.set(type, terms);
        return this;
    }

    /** Add a flat stat (e.g. Magic Damage) to a damage type, skipping zero so formulas stay readable. */
    addStat(key: StatKey, type: DamageKey): this {
        const value = this.#stat(key);
        return value ? this.addDamage(value, type) : this;
    }

    addMultiplier(key: MultiplierKey, source: string, percent: number): this {
        const bySource = this.#multipliers.get(key) ?? new Map<string, number>();
        bySource.set(source, (bySource.get(source) ?? 0) + percent);
        this.#multipliers.set(key, bySource);
        return this;
    }

    addNote(text: string): this {
        this.#notes.push(text);
        return this;
    }

    /** Let a non-physical roll crit ("affected by your critical strike chance and critical damage modifier"). */
    enableCrit(): this {
        this.#canCrit = true;
        return this;
    }

    addCritChance(percent: number): this {
        this.#critChance += percent;
        return this;
    }

    addCritDamage(percent: number): this {
        this.#critDamage += percent;
        return this;
    }

    /** Roll a combo check after the attack, with this bonus on top of monk mastery and effects. */
    enableCombo(bonus = 0): this {
        this.#combo = bonus;
        return this;
    }

    addPenetration(type: DamageKey, percent: number): this {
        this.#penetration[type] = (this.#penetration[type] ?? 0) + percent;
        return this;
    }

    /** Change a passive resource when the roll happens (hooks are synchronous; this is applied in evaluate). */
    queueResource(key: string, change: { delta?: number; set?: number }): this {
        this.#resourceChanges.push({ key, ...change });
        return this;
    }

    #skipSingleUse = false;

    /** Ignore single-use effects for this roll (aura pulses aren't "your next attack"). Call before applyEffects. */
    skipSingleUse(): this {
        this.#skipSingleUse = true;
        return this;
    }

    /** Offer an on-hit status on the card (Scars of Darkness). */
    addStatus(statusId: string, source: string): this {
        const config = STATUSES.find((s) => s.id === statusId);
        if (config) this.#statuses.push({ id: config.id, name: config.name, source });
        return this;
    }

    /** Every damage die is one size bigger, up to d20 (Vastwood Sovereignty). */
    upgradeDice(): this {
        this.#upgradeDice = true;
        return this;
    }

    /** Damage types currently in the roll. */
    get damageTypes(): DamageKey[] {
        return [...this.#damage.keys()];
    }

    /** Let every owned passive adjust this roll (Warleader, Assassinate, Spotter, ...). */
    applyPassives(info: Omit<RollInfo, "actor" | "rollType" | "weapon" | "damageTypes" | "inflictsCC"> & { inflictsCC?: boolean }): this {
        const full: RollInfo = {
            ...info,
            inflictsCC: info.inflictsCC ?? false,
            actor: this.actor,
            rollType: this.rollType,
            weapon: this.weapon,
            damageTypes: this.damageTypes,
        };
        for (const { handle, automation } of activePassives(this.actor)) automation.rollHook?.(this, full, handle);
        return this;
    }

    /** "This attack can't miss": no Evasion roll. */
    cannotMiss(): this {
        this.#cannotMiss = true;
        return this;
    }

    /** "+20% Accuracy" on one attack. */
    addAccuracy(percent: number): this {
        this.#accuracy += percent;
        return this;
    }

    /** "Your attacks cannot be blocked": 100 for certain, less for a chance. */
    addUnblockable(percent: number): this {
        this.#unblockable += percent;
        return this;
    }

    /** "30% Lethality" on one attack. */
    addLethality(percent: number): this {
        this.#lethality += percent;
        return this;
    }

    /** "Lifesteal for 30% of the damage dealt". */
    addLifesteal(percent: number): this {
        this.#lifesteal += percent;
        return this;
    }

    /** Roll maximum on every damage die. */
    maximize(): this {
        this.#maximize = true;
        return this;
    }

    /** Ignore all AC (physical) or all MR (every element). */
    ignoreDefenses({ ac = false, mr = false }: { ac?: boolean; mr?: boolean }): this {
        if (ac) this.#penetration.physical = 100;
        if (mr) for (const element of ELEMENTS) this.#penetration[element] = 100;
        return this;
    }

    /** Weapon implicit damage plus its scaling stat. Returns false if there's no usable weapon. */
    addWeapon(): boolean {
        const weapon = this.weapon;
        const system = weapon?.system as unknown as EquipmentModel | undefined;
        if (!weapon || !system?.isWeapon) return false;
        this.addDamage(system.weapon.damage, system.weapon.damageType as DamageKey);
        this.addWeaponScaling();
        return true;
    }

    /** Just the weapon's scaling stat, for abilities that deal their own dice "with" a weapon. */
    addWeaponScaling(): this {
        // Dual wielding scales off whichever weapon's stat is higher (as the Roll20 API did).
        const stats = this.weapons
            .map((w) => (w.system as unknown as EquipmentModel).weapon.scaling)
            .map((scaling) => (scaling === "melee" ? "meleeDamage" : scaling === "rangedFine" ? "rangedFineDamage" : null))
            .filter((key): key is "meleeDamage" | "rangedFineDamage" => !!key);
        if (!stats.length) return this;
        const best = stats.reduce((a, b) => (this.#stat(b) > this.#stat(a) ? b : a));
        return this.addStat(best, "physical");
    }

    #modifierApplies(modifier: RollModifierData): boolean {
        const rollType = modifier.rollType as ModifierRollType;
        if (rollType !== "all" && rollType !== this.rollType) return false;
        if (modifier.weapon) {
            // With two weapons, a weapon-type modifier applies if either one matches.
            const categories = this.weapons.map((w) => (w.system as unknown as EquipmentModel).weapon.category).filter(Boolean);
            if (!categories.length) return false;
            const matches = (category: string) =>
                modifier.weapon === "ranged"
                    ? RANGED_WEAPONS.includes(category)
                    : modifier.weapon === "melee"
                      ? !RANGED_WEAPONS.includes(category)
                      : category === modifier.weapon;
            if (!categories.some(matches)) return false;
        }
        return true;
    }

    /**
     * Whether an effect's roll modifiers apply to this roll, based on where the effect lives. Effects on a weapon
     * are that weapon's mods: they only apply to physical attacks made with it, though a held weapon's mods also
     * apply to spells and other non-physical rolls (a staff's magic damage bonus). Effects on anything else
     * (the actor, armor, rings) apply to every roll. Unequipped gear is already suppressed by the effect model.
     */
    #effectApplies(effect: ActiveEffect.Implementation): boolean {
        const item = effect.parent;
        if (!(item instanceof Item) || item.type !== "equipment") return true;
        const equipment = item.system as unknown as EquipmentModel;
        if (!equipment.isWeapon) return true;
        if (this.rollType === "physical") return this.weapons.some((w) => w.id === item.id);
        return equipment.isHeldWeapon;
    }

    /** Fold in roll modifiers from every active effect on the actor (including transferred item effects). */
    /**
     * Always-on stats from gear and buffs: the Stats tab's damage multipliers, penetration, and crit damage. They're
     * summed into one "Stats" source, the way the Roll20 API grouped every item's bonuses under the character.
     * A summon's rolls also get its summoner's Minion Damage.
     */
    #applyStatBuckets(): void {
        const creature = this.#creature.derived;
        for (const [key, percent] of Object.entries(creature.damageMultiplier ?? {})) {
            if (percent) this.addMultiplier(key as MultiplierKey, "Stats", percent);
        }
        for (const [key, percent] of Object.entries(creature.penetration ?? {})) {
            if (!percent) continue;
            const types: DamageKey[] = key === "allMagic" ? [...ELEMENTS] : [key as DamageKey];
            for (const type of types) this.#penetration[type] = (this.#penetration[type] ?? 0) + percent;
        }
        this.#critDamage += creature.combat?.critDamage ?? 0;
        this.#accuracy += creature.combat?.accuracy ?? 0;
        this.#lethality += creature.combat?.lethality ?? 0;
        this.#lifesteal += creature.combat?.lifesteal ?? 0;
        this.#unblockable += creature.combat?.unblockable ?? 0;

        const casterUuid = foundry.utils.getProperty(this.actor, `flags.${SYSTEM_ID}.summon.casterUuid`) as string | undefined;
        const caster = casterUuid ? (fromUuidSync(casterUuid) as Actor.Implementation | null) : null;
        const casterStats = (caster?.system as unknown as CreatureModel | undefined)?.derived.combat;
        if (casterStats?.minionDamage) this.addMultiplier("all", `${caster!.name}'s Minion Damage`, casterStats.minionDamage);
        this.#lethality += casterStats?.minionLethality ?? 0;
    }

    applyEffects(): this {
        this.#applyStatBuckets();
        for (const effect of this.actor.allApplicableEffects()) {
            if (!effect.active || !this.#effectApplies(effect as ActiveEffect.Implementation)) continue;
            const system = effect.system as unknown as BarbsEffectModel;
            if (system.singleUse && this.#skipSingleUse) continue;
            let used = false;
            for (const modifier of system.modifiers ?? []) {
                if (!this.#modifierApplies(modifier)) continue;
                used = true;
                // "On crit:" modifiers wait until a hit actually crits.
                if (modifier.onCrit) this.#onCrit.push({ modifier, source: effect.name, effect: effect as ActiveEffect.Implementation });
                else this.#applyModifier(modifier, effect.name, effect as ActiveEffect.Implementation);
            }
            if (used && system.singleUse) this.#singleUse.add(effect as ActiveEffect.Implementation);
        }
        return this;
    }

    /**
     * Fold one roll modifier into this roll. `source` names it in multipliers and notes; `sourceEffect` is the
     * effect it lives on, for lasting debuffs that last as long as it does.
     */
    #applyModifier(modifier: RollModifierData, source: string, sourceEffect?: ActiveEffect.Implementation): void {
        const number = Number(modifier.value) || 0;
        switch (modifier.type) {
            case "damage":
                this.addDamage(modifier.value, (modifier.damageType || "physical") as DamageKey);
                break;
            case "multiplier":
                this.addMultiplier((modifier.damageType || "all") as MultiplierKey, source, number);
                break;
            case "critChance":
                this.#critChance += number;
                break;
            case "critDamage":
                this.#critDamage += number;
                break;
            case "penetration": {
                // "Magic penetration" covers every element; "all" covers armor too.
                const key = modifier.damageType || "physical";
                const types: DamageKey[] =
                    key === "allMagic" ? [...ELEMENTS] : key === "all" ? ["physical", ...ELEMENTS] : [key as DamageKey];
                for (const type of types) this.#penetration[type] = (this.#penetration[type] ?? 0) + number;
                break;
            }
            case "note":
                this.addNote(`${source}: ${modifier.value}`);
                break;
            case "canCrit":
                this.#canCrit = true;
                break;
            case "cannotMiss":
                this.#cannotMiss = true;
                break;
            case "comboChance":
                this.#comboBonus += number;
                break;
            case "convert":
                if (modifier.damageType && modifier.damageType !== "all") this.#convert = modifier.damageType as DamageKey;
                break;
            case "status": {
                // "stunned", "stunned 25" (25% chance), or a DoT with its amount: "burned:10 30".
                const [idPart = "", chancePart] = String(modifier.value).trim().split(/\s+/);
                const [id, amount] = idPart.split(":");
                const status = STATUSES.find((s) => s.id === id);
                if (!status) break;
                const chance = chancePart === undefined ? 100 : Number.parseFloat(chancePart);
                const effect =
                    amount && id === "bleeding" ? bleed(amount) : amount && id === "burned" ? burn(amount) : amount && id === "poisoned" ? poison(amount) : undefined;
                const onHit: OnHitStatus = { id: status.id, name: effect?.name ?? status.name, source, ...(effect ? { effect } : {}) };
                if (chance >= 100) this.#statuses.push(onHit);
                else if (chance > 0) this.#chanceStatuses.push({ onHit, chance });
                break;
            }
            case "evShred":
                this.#evasionReduction += number;
                break;
            case "buffStrip":
                if (number > 0) this.addNote(`${source}: strip ${number} buff(s) from the target.`);
                break;
            case "forcedMovement":
                if (number > 0) this.addNote(`${source}: push the target ${number} ft.`);
                break;
            case "accuracy":
                this.#accuracy += number;
                break;
            case "lethality":
                this.#lethality += number;
                break;
            case "lifesteal":
                this.#lifesteal += number;
                break;
            case "unblockable":
                this.#unblockable += number;
                break;
            case "bleedConvert":
                if (number > 0) this.#bleedConvert.push({ percent: number, source: source });
                break;
            case "shred": {
                // A lasting AC shred (Serrated Arrow): the target's AC stays lower for as long as the effect granting
                // it lasts (1 minute for Serrated Arrow), counted from the hit. Each hit stacks another. It's the
                // rulebook's "Decreased Stats" condition, so the target resists it with CR.
                if (number <= 0) break;
                const duration = sourceEffect?._source.duration as { value?: number | null; units?: string; expiry?: string | null } | undefined;
                this.#statuses.push({
                    id: "",
                    name: `Shred ${number} AC`,
                    source,
                    effect: {
                        name: `Shredded (-${number} AC)`,
                        category: "condition",
                        statuses: ["decreased-stats"],
                        changes: [{ key: "system.stats.ac.bonus", value: -number }],
                        maxStacks: Infinity,
                        ...(duration?.value ? { durationData: { value: duration.value, units: duration.units, expiry: duration.expiry ?? null } } : {}),
                    },
                });
                break;
            }
            // "This attack only" reductions, the equipment affixes. Nothing is left on the target: they only
            // change how this attack's damage, conditions, and dodge rolls are resolved.
            case "acReduction":
                this.#acReduction += number;
                break;
            case "crShred":
                this.#crReduction += number;
                break;
            case "vulnerability": {
                const type = modifier.damageType || "all";
                if (number > 0) {
                    this.#statuses.push({
                        id: "",
                        name: `${number}% ${type} vulnerability`,
                        source: source,
                        effect: {
                            name: `${type.capitalize()} Vulnerability (${number}%)`,
                            category: "condition",
                            changes: [{ key: `system.vulnerability.${type === "allMagic" ? "magic" : type}`, value: number }],
                            maxStacks: Infinity,
                        },
                    });
                }
                break;
            }
        }
    }

    async #rollCrit(): Promise<CritResult | null> {
        // Only physical rolls crit, unless something enables it for this roll.
        if (this.rollType !== "physical" && !this.#canCrit) return null;
        const implicit = (this.weapon?.system as unknown as EquipmentModel | undefined)?.weapon;
        const chance = this.#stat("critChance") + this.#critChance + (implicit?.critChance ?? 0);
        const modifier = (implicit?.critModifier ?? DEFAULT_CRIT_MODIFIER) + this.#critDamage;
        const roll = (await new Roll("1d100").evaluate()) as unknown as Roll;
        const isCrit = isCritRoll(roll.total ?? 0, chance);
        return { roll, chance, threshold: Math.max(1, 101 - chance), isCrit, factor: isCrit ? 1 + modifier / 100 : 1 };
    }

    /**
     * Roll the attack. Each hit rolls its own crit and damage; modifiers from effects apply to every hit.
     * @param hits For "this attack repeats N times" abilities.
     */
    async evaluate({ hits = 1 }: { hits?: number } = {}): Promise<AttackResult> {
        const rollData = this.actor.getRollData();
        const rolls: Roll[] = [];
        const results: AttackHit[] = [];
        const totals: AttackResult["totals"] = {};

        // Monk abilities use "dU", the die size from monk mastery.
        const die = monkDie(this.actor);
        for (const [type, terms] of this.#damage) this.#damage.set(type, terms.map((t) => t.replace(/(\d*)dU\b/g, `$1d${die}`)));

        if (this.#upgradeDice) {
            const next: Record<string, string> = { 4: "6", 6: "8", 8: "10", 10: "12", 12: "20", 20: "20" };
            for (const [type, terms] of this.#damage) {
                this.#damage.set(type, terms.map((t) => t.replace(/(\d*)d(\d+)/g, (_m, n, f) => `${n}d${next[f] ?? f}`)));
            }
        }

        // Terms that use @distance are set aside and applied per target (see DistanceBonus).
        const distanceTerms = new Map<DamageKey, string[]>();
        for (const [type, terms] of this.#damage) {
            const near = terms.filter((t) => t.includes("@distance"));
            if (!near.length) continue;
            distanceTerms.set(type, near);
            const rest = terms.filter((t) => !t.includes("@distance"));
            if (rest.length) this.#damage.set(type, rest);
            else this.#damage.delete(type);
        }

        // Damage conversion (Bow of Hurricanes): everything becomes one type before rolling. Multipliers keyed to the
        // old types no longer apply; type-specific bonuses are applied to the converted type instead.
        if (this.#convert) {
            const merged = [...this.#damage.values()].flat();
            this.#damage = new Map(merged.length ? [[this.#convert, merged]] : []);
            this.addNote(`Damage converted to ${this.#convert}.`);
        }

        let critApplied = false;
        for (let i = 0; i < Math.max(1, hits); i++) {
            const crit = await this.#rollCrit();
            if (crit) rolls.push(crit.roll);
            // "On crit:" modifiers. Damage and multipliers apply to each hit that crits; everything else (statuses,
            // shreds, lethality, notes) applies once for the attack, the first time a hit crits.
            let damage = this.#damage;
            let multipliers = this.#multipliers;
            if (crit?.isCrit && this.#onCrit.length) {
                damage = new Map([...this.#damage].map(([k, v]) => [k, [...v]]));
                multipliers = new Map([...this.#multipliers].map(([k, v]) => [k, new Map(v)]));
                for (const { modifier, source, effect } of this.#onCrit) {
                    if (modifier.type === "damage") {
                        const type = (this.#convert ?? (modifier.damageType || "physical")) as DamageKey;
                        damage.set(type, [...(damage.get(type) ?? []), `(${modifier.value})`]);
                    } else if (modifier.type === "multiplier") {
                        const key = (modifier.damageType || "all") as MultiplierKey;
                        const bySource = multipliers.get(key) ?? new Map<string, number>();
                        bySource.set(source, (bySource.get(source) ?? 0) + (Number(modifier.value) || 0));
                        multipliers.set(key, bySource);
                    } else if (!critApplied) {
                        this.#applyModifier(modifier, `${source} (on crit)`, effect);
                    }
                }
                if (!critApplied) this.addNote(`On crit: ${[...new Set(this.#onCrit.map((c) => c.source))].join(", ")}.`);
                critApplied = true;
            }
            const parts: DamagePart[] = [];
            const hitTotals: AttackHit["totals"] = {};
            for (const [type, terms] of damage) {
                const formula = terms.join(" + ");
                const roll = (await new Roll(formula, rollData).evaluate({ maximize: this.#maximize })) as unknown as Roll;
                rolls.push(roll);
                const base = roll.total ?? 0;
                const multiplier = multiplierFor(type, multipliers);
                const total = finalDamage(base, multiplier, crit?.factor ?? 1);
                parts.push({ type, formula: roll.formula, roll, base, multiplier, total });
                hitTotals[type] = (hitTotals[type] ?? 0) + total;
                totals[type] = (totals[type] ?? 0) + total;
            }
            const distanceBonus = [...distanceTerms].map(([type, terms]) => ({
                type: (this.#convert ?? type) as DamageKey,
                formula: terms.join(" + "),
                factor: multiplierFor((this.#convert ?? type) as DamageKey, multipliers) * (crit?.factor ?? 1),
            }));
            results.push({ parts, crit, totals: hitTotals, distanceBonus });
        }

        // Serrated Arrow: part of the physical damage becomes a Bleed instead of landing up front.
        const bleedPercent = Math.min(100, this.#bleedConvert.reduce((sum, b) => sum + b.percent, 0));
        if (bleedPercent && totals.physical) {
            let bled = 0;
            for (const hit of results) {
                const amount = Math.round(((hit.totals.physical ?? 0) * bleedPercent) / 100);
                hit.totals.physical = (hit.totals.physical ?? 0) - amount;
                bled += amount;
            }
            totals.physical -= bled;
            const sources = this.#bleedConvert.map((b) => b.source).join(", ");
            this.addNote(`${bleedPercent}% of the physical damage (${bled}) is converted to Bleed (${sources}).`);
            this.#statuses.push({
                id: "bleeding",
                name: `Bleed ${bled}`,
                source: sources,
                effect: bleed(String(bled)),
            });
        }

        let combo: ComboResult | null = null;
        if (this.#combo !== null) {
            const chance = baseComboChance(this.actor) + this.#combo + this.#comboBonus;
            const roll = (await new Roll("1d100").evaluate()) as unknown as Roll;
            rolls.push(roll);
            const threshold = Math.max(1, 101 - chance);
            combo = { roll, chance, threshold, success: (roll.total ?? 0) >= threshold };
        }

        // Single-use buffs are spent as soon as the roll happens, hit or miss. (Tiered attacks share the same effects
        // across several builders, so skip any another tier already consumed.)
        const consumed = [...this.#singleUse].filter((e) => e.parent?.effects.has(e.id!));
        const consumedEffects = consumed.map((e) => snapshotEffect(e));
        for (const effect of consumed) await effect.delete();

        const passiveDeltas: PassiveDelta[] = [];
        for (const change of this.#resourceChanges) {
            const delta =
                change.set !== undefined ? await setResource(this.actor, change.key, change.set) : await adjustResource(this.actor, change.key, change.delta ?? 0);
            if (delta) passiveDeltas.push(delta);
        }

        // Chance-based on-hit statuses roll now; only the ones that land get an Apply button.
        for (const { onHit, chance } of this.#chanceStatuses) {
            const roll = (await new Roll("1d100").evaluate()) as unknown as Roll;
            rolls.push(roll);
            const landed = (roll.total ?? 101) <= chance;
            this.addNote(`${chance}% chance to inflict ${onHit.name} (${onHit.source}): rolled ${roll.total}, ${landed ? "inflicted" : "no"}.`);
            if (landed) this.#statuses.push(onHit);
        }

        // Accuracy, lethality, lifesteal, and unblockable only matter for attacks that deal damage.
        const damaging = this.rollType !== "healing" && Object.values(totals).some((v) => (v ?? 0) > 0);
        let lethality: AttackResult["lethality"] = null;
        if (damaging) {
            if (this.#cannotMiss) this.addNote("Can't miss: targets don't roll Evasion.");
            if (this.#accuracy) this.addNote(`Accuracy ${this.#accuracy > 0 ? "+" : ""}${this.#accuracy}%: targets dodge with that much less Evasion.`);
            if (this.#unblockable >= 100) this.addNote("Unblockable: blocks don't apply to this attack.");
            else if (this.#unblockable > 0) this.addNote(`Unblockable chance ${this.#unblockable}%: rolled against each target's block when damage is applied.`);
            if (this.#lethality > 0) {
                const lethal: boolean[] = [];
                for (let i = 0; i < results.length; i++) {
                    const roll = (await new Roll("1d100").evaluate()) as unknown as Roll;
                    rolls.push(roll);
                    lethal.push((roll.total ?? 101) <= this.#lethality);
                }
                lethality = { chance: this.#lethality, lethal };
                const hitsLethal = lethal.filter(Boolean).length;
                this.addNote(
                    hitsLethal
                        ? `Lethality ${this.#lethality}%: <strong>LETHAL</strong>${results.length > 1 ? ` (${hitsLethal} of ${results.length} hits)` : ""}. The target dies instantly unless immune (players are).`
                        : `Lethality ${this.#lethality}%: not lethal.`,
                );
            }
            if (this.#lifesteal) this.addNote(`Lifesteal ${this.#lifesteal}%: applying damage heals the attacker for that much of it.`);
            if (this.#acReduction) this.addNote(`This attack: the target has ${this.#acReduction} less AC against it.`);
            if (this.#evasionReduction) this.addNote(`This attack: the target has ${this.#evasionReduction}% less Evasion against it.`);
        }
        if (this.#crReduction) this.addNote(`This attack: the target has ${this.#crReduction}% less CR against its conditions.`);

        if (Object.keys(totals).some((t) => t === "psychic")) {
            this.addNote("Psychic damage: make a Psionics: Offensive check.");
        }

        return {
            rollType: this.rollType,
            combo,
            hits: results,
            parts: results.flatMap((h) => h.parts),
            crit: results[0]?.crit ?? null,
            notes: this.#notes,
            totals,
            statuses: this.#statuses,
            penetration: this.#penetration,
            consumed: consumed.map((e) => e.name),
            consumedEffects,
            passiveDeltas,
            rolls,
            accuracy: damaging ? this.#accuracy : 0,
            lifesteal: damaging ? this.#lifesteal : 0,
            unblockableChance: damaging ? Math.min(100, this.#unblockable) : 0,
            cannotMiss: this.#cannotMiss,
            lethality,
            acReduction: damaging ? this.#acReduction : 0,
            crReduction: this.#crReduction,
            evasionReduction: damaging ? this.#evasionReduction : 0,
        };
    }
}

/** Which hand(s) an ability is used with: the main hand (default), the offhand, or both (dual wielding). */
export type Hand = "main" | "off" | "dual";

/** The offhand weapon, if one is held there. */
export function offhandWeapon(actor: Actor.Implementation): Item.Implementation | null {
    return (
        actor.items.find((i) => {
            const e = i.type === "equipment" ? (i.system as unknown as EquipmentModel) : null;
            return !!e?.isHeldWeapon && e.slot === "offhand";
        }) ?? null
    );
}

/** A weapon in each hand, so the sheet offers Main / Off / Dual. */
export function holdsTwoWeapons(actor: Actor.Implementation): boolean {
    const main = mainWeapon(actor);
    const off = offhandWeapon(actor);
    return !!main && !!off && main.id !== off.id;
}

/** The weapon(s) an ability uses with the chosen hand. */
export function weaponsFor(actor: Actor.Implementation, hand: Hand = "main"): { weapon: Item.Implementation | null; offWeapon: Item.Implementation | null } {
    if (hand === "off") return { weapon: offhandWeapon(actor), offWeapon: null };
    if (hand === "dual") return { weapon: mainWeapon(actor), offWeapon: offhandWeapon(actor) };
    return { weapon: mainWeapon(actor), offWeapon: null };
}

/** The weapon an actor attacks with by default: an equipped main-hand or two-handed weapon. */
export function mainWeapon(actor: Actor.Implementation): Item.Implementation | null {
    const held = actor.items.filter((i) => i.type === "equipment" && (i.system as unknown as EquipmentModel).isHeldWeapon);
    return (
        held.find((i) => ["mainHand", "twoHand"].includes((i.system as unknown as EquipmentModel).slot)) ?? held[0] ?? null
    );
}
